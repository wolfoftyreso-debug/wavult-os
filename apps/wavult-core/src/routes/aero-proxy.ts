/**
 * aero-proxy — gateway route that exposes wavult-aero (AMOS Edge
 * Aviation Network) under /v1/aero/* from the wavult-core API.
 *
 * Rationale: everything external to Wavult OS goes through wavult-core
 * per AGENTS.md ("Klient → API Core (wavult-core) → externa tjänster").
 * wavult-aero is an internal service but we treat it consistently with
 * the same principle so that clients never have to know which process
 * owns which path.
 *
 * Authentication passes through unchanged. The downstream wavult-aero
 * service independently validates the JWT, checks audience, and
 * enforces its own role guards. This service only scopes which routes
 * are exposed to the outside — read vs. mutate — and applies a
 * conservative timeout and a distinct rate limit.
 */

import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

const router = Router()

const AERO_BASE = process.env.AERO_SERVICE_URL || 'http://wavult-aero:3017'
const DEFAULT_TIMEOUT_MS = 10_000
const MUTATING_TIMEOUT_MS = 20_000

const limiter = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_EXCEEDED' },
})

/**
 * Safe headers to forward. We explicitly do NOT forward cookies,
 * host, or any Cloudflare/ALB signalling headers.
 */
function buildForwardHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = {}
  const auth = req.headers.authorization
  if (typeof auth === 'string') out['authorization'] = auth
  const ctype = req.headers['content-type']
  if (typeof ctype === 'string') out['content-type'] = ctype
  const corr = req.headers['x-correlation-id']
  if (typeof corr === 'string') out['x-correlation-id'] = corr
  out['x-wavult-forwarded-by'] = 'wavult-core'
  return out
}

async function forward(req: Request, res: Response, method: string): Promise<void> {
  const upstreamPath = req.originalUrl.replace(/^\/v1\/aero/, '') || '/'
  const upstreamUrl = `${AERO_BASE}${upstreamPath}`

  const timeoutMs = method === 'GET' || method === 'HEAD' ? DEFAULT_TIMEOUT_MS : MUTATING_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const init: RequestInit = {
      method,
      headers: buildForwardHeaders(req),
      signal: controller.signal,
    }
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(req.body ?? {})
    }
    const upstream = await fetch(upstreamUrl, init)
    const bodyText = await upstream.text()
    res.status(upstream.status)
    const upstreamCorr = upstream.headers.get('x-correlation-id')
    if (upstreamCorr) res.setHeader('x-correlation-id', upstreamCorr)
    const upstreamType = upstream.headers.get('content-type')
    if (upstreamType) res.setHeader('content-type', upstreamType)
    res.send(bodyText)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'This operation was aborted' || msg.toLowerCase().includes('abort')) {
      res.status(504).json({ error: 'AERO_UPSTREAM_TIMEOUT' })
      return
    }
    console.error('[aero-proxy] upstream error:', msg)
    res.status(502).json({ error: 'AERO_UPSTREAM_UNREACHABLE' })
  } finally {
    clearTimeout(timer)
  }
}

router.use(limiter)

router.get(/^\/v1\/aero\/.*/, (req, res) => { void forward(req, res, 'GET') })
router.post(/^\/v1\/aero\/.*/, (req, res) => { void forward(req, res, 'POST') })

export default router
