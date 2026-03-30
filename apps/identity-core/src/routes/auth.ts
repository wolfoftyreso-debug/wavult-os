import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { login, refreshAccessToken, logout } from '../services/authService'
import { ipLoginLimiter, emailLoginLimiter } from '../middleware/rateLimit'

export const authRouter = Router()

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
  session_id: z.string().uuid(),
})

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)
}

// POST /v1/auth/login — two-layer rate limiting: per-IP + per-email
authRouter.post('/login', ipLoginLimiter, emailLoginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = LoginSchema.parse(req.body)

  try {
    const result = await login(
      email,
      password,
      req.ip || undefined,
      req.headers['user-agent'] || undefined,
      req.requestId
    )
    res.json({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg === 'INVALID_CREDENTIALS') { res.status(401).json({ error: 'INVALID_CREDENTIALS' }); return }
    if (msg === 'ACCOUNT_LOCKED') { res.status(423).json({ error: 'ACCOUNT_LOCKED' }); return }
    throw err
  }
}))

// POST /v1/auth/refresh
authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token, session_id } = RefreshSchema.parse(req.body)

  try {
    const result = await refreshAccessToken(refresh_token, session_id, req.requestId)
    res.json({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (['INVALID_SESSION', 'SESSION_EXPIRED', 'INVALID_REFRESH_TOKEN'].includes(msg)) {
      res.status(401).json({ error: msg }); return
    }
    if (msg === 'CONFLICT') {
      res.status(409).json({ error: 'SESSION_CONFLICT' }); return
    }
    if (msg === 'TOKEN_VERSION_MISMATCH') {
      res.status(401).json({ error: 'TOKEN_REVOKED' }); return
    }
    throw err
  }
}))

// POST /v1/auth/logout
authRouter.post('/logout', asyncHandler(async (req, res) => {
  const { session_id, user_id } = req.body as { session_id?: string; user_id?: string }
  if (!session_id || !user_id) { res.status(400).json({ error: 'MISSING_PARAMS' }); return }
  await logout(session_id, user_id, req.requestId)
  res.json({ data: { success: true } })
}))

// Error handler
authRouter.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.name === 'ZodError') {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: err.message })
    return
  }
  console.error('[Auth] Unhandled error', { name: err.name })
  res.status(500).json({ error: 'INTERNAL_ERROR' })
})
