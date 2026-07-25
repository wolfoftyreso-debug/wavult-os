/**
 * wavult-aero — AMOS Edge Aviation Network (AEAN) control plane.
 *
 * See docs/aero/SYSTEM_ARCHITECTURE.md for the full design.
 *
 * This service is the cloud-side counterpart to the onboard edge
 * appliances. It handles fleet registration, edge-node enrolment,
 * telemetry ingest, signed content-pack distribution, and versioned
 * prefetch policy management. Every state change is written to an
 * append-only hash-chained event log — see lib/event-store.ts.
 *
 * Regulatory posture:
 *   - AS9100D (Quality Management — aviation, space, defense)
 *   - DO-326A / ED-202A (Airworthiness Security)
 *   - EASA Part-145.A.55 (records retention)
 *   - ICAO Annex 19 (Safety Management Systems)
 *   - ISO 27001 (Information Security)
 *   - NIS2 (Network and Information Security Directive, EU)
 *   - GDPR (onboard PII)
 *
 * Mapping of each regulatory clause to the code and the test that
 * covers it is maintained in src/rtm/requirements.ts and enforced by
 * `npm run rtm:verify` as part of the Docker build.
 *
 * Requirements traceability:
 *   @req AEAN-REQ-AUD-002  Broken hash chain trips the service into read-only mode on boot
 */

import express, { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'

import healthRouter from './routes/health'
import fleetRouter from './routes/fleet'
import edgeNodesRouter from './routes/edge-nodes'
import telemetryRouter from './routes/telemetry'
import contentPacksRouter from './routes/content-packs'
import prefetchPoliciesRouter from './routes/prefetch-policies'
import { readOnlyGate, isTripped, trip } from './middleware/readOnlyGate'
import { verifyAllStreams } from './lib/event-store'
import { BUILD_INFO } from './build-info'

const PORT = Number(process.env.PORT ?? 3017)
const app = express()

// Never trust X-Forwarded-* blindly; ALB in front sets them and nothing else
// should reach us. This is important for rate limiting and audit logs.
app.set('trust proxy', 1)

// Correlation id — stamped on every request, echoed in the response
// header, and propagated into the event store.
app.use((req: Request, res: Response, next: NextFunction) => {
  const existing = req.headers['x-correlation-id']
  const corr = typeof existing === 'string' && existing.length > 0 && existing.length <= 128
    ? existing
    : randomUUID()
  req.headers['x-correlation-id'] = corr
  res.setHeader('x-correlation-id', corr)
  next()
})

// Hard security headers — a minimal set, tightened at the ALB + Cloudflare layer.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  next()
})

app.use(express.json({ limit: '10mb' }))

// Rate limit: public control-plane routes get a strict limit. Edge-node
// telemetry has its own per-node quota enforced downstream of requireEdgeNode.
const controlPlaneLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_EXCEEDED' },
})
app.use('/v1/fleet', controlPlaneLimiter)
app.use('/v1/prefetch-policies', controlPlaneLimiter)
app.use('/v1/content-packs', controlPlaneLimiter)

// Read-only gate — the circuit breaker. Applies to everything below,
// but GET/HEAD/OPTIONS always pass through.
app.use(readOnlyGate)

app.use('/', healthRouter)
app.use('/v1/fleet', fleetRouter)
app.use('/v1/fleet', edgeNodesRouter)
app.use('/v1/telemetry', telemetryRouter)
app.use('/v1/content-packs', contentPacksRouter)
app.use('/v1/prefetch-policies', prefetchPoliciesRouter)

// Error handler — never leak internals. Real errors go to the logs only.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('[aero][err]', {
    corr: req.headers['x-correlation-id'],
    path: req.path,
    method: req.method,
    msg: err.message,
  })
  if (res.headersSent) return
  res.status(500).json({ error: 'INTERNAL' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'NOT_FOUND' })
})

async function bootIntegrityCheck(): Promise<void> {
  // Run the tamper detector for the most safety-critical streams on boot.
  // If any stream has a broken chain, trip the breaker IMMEDIATELY and
  // keep serving GETs so auditors can investigate.
  try {
    const criticalTypes = ['aircraft', 'edge_node', 'content_pack']
    for (const t of criticalTypes) {
      const breaks = await verifyAllStreams(t)
      if (breaks.length > 0) {
        console.error('[aero][boot] HASH CHAIN BREAK DETECTED', { streamType: t, breaks })
        await trip(`boot_integrity_check:${t}`, 'system:boot')
        return
      }
    }
    console.log('[aero][boot] integrity check passed')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.warn('[aero][boot] integrity check failed to run:', msg)
    // If we cannot even READ the log, we must not accept writes.
    await trip('boot_integrity_check:unreadable', 'system:boot')
  }
}

async function main(): Promise<void> {
  await bootIntegrityCheck()

  const { tripped, reason } = await isTripped()
  if (tripped) {
    console.warn('[aero][boot] starting in READ-ONLY mode, reason=%s', reason)
  }

  app.listen(PORT, () => {
    console.log(
      '[aero] listening on %d build=%s sha=%s',
      PORT, BUILD_INFO.version, BUILD_INFO.git_sha,
    )
  })
}

main().catch((err) => {
  console.error('[aero][fatal]', err)
  process.exit(1)
})
