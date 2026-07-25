/**
 * requireAuth — JWT verification for wavult-aero.
 *
 * Same contract as apps/wavult-core/src/middleware/requireAuth.ts:
 *   - RS256 via AWS KMS public key in production.
 *   - HS256 with JWT_SECRET in development.
 *   - Audience is scoped to this service ("wavult-aero") so tokens issued
 *     for wavult-core cannot be replayed against aero routes.
 *   - Fails closed if KMS is unreachable (503 AUTH_UNAVAILABLE).
 *
 * Requirements traceability:
 *   @req AEAN-REQ-SEC-003  Operator tokens (audience wavult-aero) rejected on edge-node ingest
 *   @req AEAN-REQ-SEC-004  Every mutation is authenticated and authorised against a role
 *   @req AEAN-REQ-TEL-001  Telemetry ingest authenticated per edge node
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { KMSClient, GetPublicKeyCommand } from '@aws-sdk/client-kms'

const REGION = process.env.AWS_REGION || 'eu-north-1'
const KMS_KEY_ID = process.env.KMS_KEY_ID || ''
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_ISSUER = process.env.JWT_ISSUER || 'identity.wavult.com'
const SERVICE_AUDIENCE = process.env.SERVICE_AUDIENCE || 'wavult-aero'
const USE_KMS = !!KMS_KEY_ID && process.env.NODE_ENV === 'production'

const kmsClient = new KMSClient({ region: REGION })

let cachedPublicKey: string | null = null

async function getPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey
  const { PublicKey } = await kmsClient.send(new GetPublicKeyCommand({ KeyId: KMS_KEY_ID }))
  if (!PublicKey) throw new Error('KMS_PUBLIC_KEY_UNAVAILABLE')
  cachedPublicKey =
    '-----BEGIN PUBLIC KEY-----\n' +
    Buffer.from(PublicKey).toString('base64').match(/.{1,64}/g)!.join('\n') +
    '\n-----END PUBLIC KEY-----'
  return cachedPublicKey
}

export interface AuthUser {
  sub: string
  email: string
  org: string
  roles: string[]
  session_id: string
  tv: number
  iat: number
  exp: number
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

function rejectToken(res: Response, code: string, status = 401): void {
  res.status(status).json({ error: code })
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    rejectToken(res, 'MISSING_TOKEN')
    return
  }
  const token = auth.slice(7)

  if (USE_KMS) {
    getPublicKey()
      .then((pubKey) => {
        try {
          const payload = jwt.verify(token, pubKey, {
            algorithms: ['RS256'],
            issuer: JWT_ISSUER,
            audience: SERVICE_AUDIENCE,
          }) as AuthUser
          req.user = payload
          next()
        } catch (err) {
          const name = err instanceof Error ? err.name : ''
          if (name === 'TokenExpiredError') { rejectToken(res, 'TOKEN_EXPIRED'); return }
          rejectToken(res, 'INVALID_TOKEN')
        }
      })
      .catch(() => res.status(503).json({ error: 'AUTH_UNAVAILABLE' }))
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: SERVICE_AUDIENCE,
    }) as AuthUser
    req.user = payload
    next()
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'TokenExpiredError') { rejectToken(res, 'TOKEN_EXPIRED'); return }
    rejectToken(res, 'INVALID_TOKEN')
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'UNAUTHORIZED' }); return }
    if (!roles.some((r) => req.user!.roles.includes(r))) {
      res.status(403).json({ error: 'FORBIDDEN' }); return
    }
    next()
  }
}

/**
 * Edge-node attestation middleware.
 *
 * Edge nodes (aircraft-side appliances) authenticate with a long-lived
 * TPM-backed certificate, exchanged at registration time for a mutual-TLS
 * client cert + a short-lived JWT. The short-lived JWT has audience
 * "wavult-aero-edge" and carries the edge_node_id in the subject claim.
 *
 * This middleware only accepts that audience. Human operator tokens
 * (audience "wavult-aero") are rejected — an operator cannot impersonate
 * an aircraft appliance.
 */
export function requireEdgeNode(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'MISSING_EDGE_TOKEN' })
    return
  }
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: USE_KMS ? ['RS256'] : ['HS256'],
      issuer: JWT_ISSUER,
      audience: 'wavult-aero-edge',
    }) as AuthUser & { edge_node_id: string }
    if (!payload.edge_node_id) {
      res.status(401).json({ error: 'EDGE_NODE_ID_MISSING' })
      return
    }
    req.user = payload
    ;(req as Request & { edgeNodeId?: string }).edgeNodeId = payload.edge_node_id
    next()
  } catch {
    res.status(401).json({ error: 'INVALID_EDGE_TOKEN' })
  }
}
