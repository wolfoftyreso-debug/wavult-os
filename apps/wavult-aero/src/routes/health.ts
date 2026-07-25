/**
 * health — liveness + readiness + degraded state reporting.
 *
 * /health          — always 200 if the process is alive (liveness).
 * /health/ready    — 200 if DB is reachable and migrations are applied.
 * /health/status   — detailed state, including circuit breaker reason.
 *
 * The load balancer uses /health; the QMS continuous compliance job uses
 * /health/status to collect evidence for the nightly evidence packet.
 */

import { Router, Request, Response } from 'express'
import { getPool } from '../lib/db'
import { isTripped } from '../middleware/readOnlyGate'
import { BUILD_INFO } from '../build-info'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'wavult-aero', version: BUILD_INFO.version })
})

router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const { rows } = await getPool().query<{ applied_at: Date }>(
      `SELECT applied_at FROM aero_schema_migrations WHERE name = '001_aero_init' LIMIT 1`,
    )
    if (rows.length === 0) {
      res.status(503).json({ status: 'not_ready', reason: 'MIGRATIONS_MISSING' })
      return
    }
    res.json({ status: 'ready' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    res.status(503).json({ status: 'not_ready', reason: 'DB_UNREACHABLE', detail: msg })
  }
})

router.get('/health/status', async (_req: Request, res: Response) => {
  const breaker = await isTripped()
  res.json({
    service: 'wavult-aero',
    build: BUILD_INFO,
    breaker: {
      tripped: breaker.tripped,
      reason: breaker.reason,
    },
    classification_levels: ['public', 'internal', 'restricted', 'aviation-safety-sensitive'],
    iso_backbone: {
      event_log: 'append_only_hash_chained',
      tamper_detection: 'enabled',
      read_only_mode_on_break: true,
    },
  })
})

export default router
