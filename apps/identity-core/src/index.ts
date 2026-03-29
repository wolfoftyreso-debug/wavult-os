import express from 'express'
import crypto from 'crypto'
import { config } from './config'
import { authRouter } from './routes/auth'
import { sessionsRouter } from './routes/sessions'
import { testConnection } from './db/postgres'
import { metrics } from './metrics'

// DEPLOY LADDER (never big-bang):
// Step 1: AUTH_MODE=logging-only (observe, never block)
// Step 2: AUTH_MODE=soft (log failures, don't block)
// Step 3: AUTH_MODE=hard (full enforcement)
// Step 4: AUTH_MODE=identity-core-only (Supabase disabled)
const AUTH_MODE = config.authMode

const app = express()

app.use(express.json({ limit: '1mb' }))

// Request tracing — requestId injected before any route/middleware sees request
app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID()
  next()
})

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})

// Routes
app.use('/v1/auth', authRouter)
app.use('/v1/sessions', sessionsRouter)

// Health
app.get('/health', async (_req, res) => {
  const dbOk = await testConnection()
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'disconnected',
    authMode: AUTH_MODE,
    authSource: config.authSource,
    forceLogoutAll: config.forceLogoutAll,
    version: '1.0.0',
    service: 'identity-core',
    metrics,
  })
})

app.listen(config.port, () => {
  console.log('[Identity Core] Listening', { port: config.port, authMode: AUTH_MODE, authSource: config.authSource })
})

export default app
// rds-ready Sun Mar 29 00:27:24 UTC 2026
