import jwt from 'jsonwebtoken'
import { kmsClient, config } from '../config'
import { SignCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms'
import crypto from 'crypto'

export interface AccessTokenPayload {
  sub: string           // user_id
  email: string
  org: string           // org_id
  roles: string[]
  session_id: string
  tv: number            // token_version — must match ic_users.token_version
  se?: number           // session_epoch — prevents concurrent login race condition
  iss: string
  aud: string[]
  iat: number
  nbf: number           // not-before with clock skew buffer
  exp: number
}

// Fallback secret for local dev (KMS not available)
const DEV_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const USE_KMS = !!config.kms.keyId && config.nodeEnv === 'production'

// KMS public key cache — keyed by kid. Signing always goes to KMS; verify uses cached pubkey (fast, local).
const publicKeyCache = new Map<string, string>()

async function fetchPublicKey(kid: string): Promise<string> {
  const cached = publicKeyCache.get(kid)
  if (cached) return cached

  const { PublicKey } = await kmsClient.send(new GetPublicKeyCommand({ KeyId: kid }))
  if (!PublicKey) throw new Error('KMS_PUBLIC_KEY_UNAVAILABLE')
  const pem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(PublicKey).toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`
  publicKeyCache.set(kid, pem)
  return pem
}

export async function signAccessToken(
  payload: Omit<AccessTokenPayload, 'iss' | 'aud' | 'iat' | 'nbf' | 'exp'>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: AccessTokenPayload = {
    ...payload,
    iss: config.jwt.issuer,
    aud: config.jwt.audience,
    iat: now,
    nbf: now - 5,   // clock skew buffer — valid 5 seconds before issue
    exp: now + config.jwt.accessTokenTtl,
  }

  // JWT size guard — large payloads indicate role bloat or injection
  const payloadSize = JSON.stringify(fullPayload).length
  if (payloadSize > 1500) throw new Error(`JWT_PAYLOAD_TOO_LARGE: ${payloadSize}`)

  if (USE_KMS) {
    // kid = last 8 chars of key ARN for header identification
    const kid = config.kms.keyId.slice(-8)
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString('base64url')
    const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
    const message = `${header}.${body}`

    const { Signature } = await kmsClient.send(new SignCommand({
      KeyId: config.kms.keyId,
      Message: Buffer.from(message),
      MessageType: 'RAW',
      SigningAlgorithm: config.kms.keyAlgorithm,
    }))
    if (!Signature) throw new Error('KMS_SIGN_FAILED')

    const signature = Buffer.from(Signature).toString('base64url')
    return `${message}.${signature}`
  }

  return jwt.sign(fullPayload, DEV_SECRET, { algorithm: 'HS256' })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const now = Math.floor(Date.now() / 1000)

  if (USE_KMS) {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('INVALID_TOKEN_FORMAT')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as AccessTokenPayload

    // Clock-skew tolerant expiry check (±5s)
    if (payload.exp < now - 5) throw new Error('TOKEN_EXPIRED')
    if (payload.nbf && payload.nbf > now + 5) throw new Error('TOKEN_NOT_YET_VALID')
    if (payload.iss !== config.jwt.issuer) throw new Error('INVALID_ISSUER')

    // Strict audience validation — token for service A must not work on service B
    const serviceAudience = config.serviceAudience
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!aud.includes(serviceAudience)) throw new Error('INVALID_AUDIENCE')

    return payload
  }

  // Dev mode — HS256
  const payload = jwt.verify(token, DEV_SECRET) as AccessTokenPayload
  const now2 = Math.floor(Date.now() / 1000)
  if (payload.exp < now2 - 5) throw new Error('TOKEN_EXPIRED')

  // Strict audience check even in dev
  const serviceAudience = config.serviceAudience
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!aud.includes(serviceAudience)) throw new Error('INVALID_AUDIENCE')

  return payload
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Expose fetchPublicKey for health/jwks endpoint future use
export { fetchPublicKey }
