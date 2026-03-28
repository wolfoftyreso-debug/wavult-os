import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, AccessTokenPayload } from '../crypto/tokens'
import { config } from '../config'
import { db } from '../db/postgres'

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload
      requestId?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Kill switch: FORCE_LOGOUT_ALL → 401 SYSTEM_LOCKDOWN immediately
  if (config.forceLogoutAll) {
    res.status(401).json({ error: 'SYSTEM_LOCKDOWN' })
    return
  }

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'MISSING_TOKEN' })
    return
  }

  const token = auth.slice(7)

  // Legacy Supabase token path — hybrid migration support
  let decoded: Record<string, unknown> | null = null
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Record<string, unknown>
    }
  } catch {
    // Ignore parse errors — will fail at verifyAccessToken
  }

  const issuer = decoded?.iss as string | undefined
  if (issuer && (issuer === 'supabase' || issuer.includes('supabase'))) {
    // Legacy path — log warning, pass through during hybrid phase
    // TODO: Remove when AUTH_MODE=identity-core-only
    console.warn('[Auth] Legacy Supabase token detected', { requestId: req.requestId })
    req.user = decoded as unknown as AccessTokenPayload
    next()
    return
  }

  try {
    const payload = verifyAccessToken(token)

    // Token version check — DB query to enforce immediate revocation
    // Run async but respond synchronously on failure
    db.query<{ token_version: number; token_epoch_changed_at: number }>(
      `SELECT u.token_version,
              (SELECT value FROM ic_global_state WHERE key = 'token_epoch_changed_at') AS token_epoch_changed_at
       FROM ic_users u WHERE u.id = $1`,
      [payload.sub]
    ).then(async (result) => {
      if (!result.rows[0]) {
        res.status(401).json({ error: 'TOKEN_REVOKED' })
        return
      }
      const { token_version, token_epoch_changed_at } = result.rows[0]

      // INVARIANT 3: tv mismatch → always deny
      if (payload.tv !== token_version) {
        res.status(401).json({ error: 'TOKEN_REVOKED' })
        return
      }

      // Global epoch check — FORCE_LOGOUT_ALL increments epoch
      if (token_epoch_changed_at && payload.iat < token_epoch_changed_at) {
        res.status(401).json({ error: 'TOKEN_REVOKED' })
        return
      }

      // Check session_epoch matches (concurrent login protection)
      const { rows: epochRows } = await db.query(
        'SELECT session_epoch FROM ic_users WHERE id = $1',
        [payload.sub]
      )
      if (!epochRows[0] || epochRows[0].session_epoch !== payload.se) {
        res.status(401).json({ error: 'SESSION_SUPERSEDED' }); return
      }

      req.user = payload
      next()
    }).catch(() => {
      // DB unreachable → fail closed, never allow
      res.status(503).json({ error: 'AUTH_UNAVAILABLE' })
    })
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'UNAUTHORIZED' }); return }
    const hasRole = roles.some(r => req.user!.roles.includes(r))
    if (!hasRole) { res.status(403).json({ error: 'FORBIDDEN' }); return }
    next()
  }
}
