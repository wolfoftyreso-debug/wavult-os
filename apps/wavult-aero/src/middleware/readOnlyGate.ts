/**
 * readOnlyGate — circuit breaker that trips the service into read-only
 * mode when the tamper detector finds a broken hash chain, when a
 * continuous-compliance control fails, or when an operator manually
 * trips the breaker from the QMS console.
 *
 * When the breaker is tripped:
 *   - All HTTP methods except GET, HEAD, OPTIONS are rejected with 503.
 *   - The /health endpoint returns degraded so the load balancer can
 *     choose to keep serving reads from this instance.
 *   - A WARN-level log line is emitted on every blocked request.
 *
 * The breaker state is shared across instances via Postgres (see
 * aero_circuit_breaker table). It is cached in-process for 5 seconds to
 * keep the hot path cheap.
 *
 * Requirements traceability:
 *   @req AEAN-REQ-AUD-002  A broken hash chain trips the service into read-only mode
 *   @req AEAN-REQ-SMS-001  Critical tamper or integrity alarms trip the breaker automatically
 */

import { Request, Response, NextFunction } from 'express'
import { getPool } from '../lib/db'

let cached: { trippedAt: Date | null; reason: string | null; expires: number } = {
  trippedAt: null,
  reason: null,
  expires: 0,
}

const CACHE_TTL_MS = 5_000

export async function isTripped(): Promise<{ tripped: boolean; reason: string | null }> {
  const now = Date.now()
  if (cached.expires > now) {
    return { tripped: cached.trippedAt !== null, reason: cached.reason }
  }
  try {
    const { rows } = await getPool().query<{ tripped_at: Date | null; reason: string | null }>(
      `SELECT tripped_at, reason FROM aero_circuit_breaker WHERE id = 'global' LIMIT 1`,
    )
    if (rows.length === 0) {
      cached = { trippedAt: null, reason: null, expires: now + CACHE_TTL_MS }
      return { tripped: false, reason: null }
    }
    cached = {
      trippedAt: rows[0].tripped_at,
      reason: rows[0].reason,
      expires: now + CACHE_TTL_MS,
    }
    return { tripped: rows[0].tripped_at !== null, reason: rows[0].reason }
  } catch {
    // Fail SAFE: if we cannot read the breaker, assume it is tripped.
    // Aviation bias is "preserve the record over accepting new writes".
    return { tripped: true, reason: 'BREAKER_STATE_UNREADABLE' }
  }
}

export async function trip(reason: string, actorSub: string): Promise<void> {
  await getPool().query(
    `INSERT INTO aero_circuit_breaker (id, tripped_at, reason, tripped_by)
        VALUES ('global', NOW(), $1, $2)
     ON CONFLICT (id) DO UPDATE SET tripped_at = NOW(), reason = $1, tripped_by = $2`,
    [reason, actorSub],
  )
  cached.expires = 0
}

export async function reset(actorSub: string): Promise<void> {
  await getPool().query(
    `UPDATE aero_circuit_breaker
        SET tripped_at = NULL, reason = NULL, reset_at = NOW(), reset_by = $1
      WHERE id = 'global'`,
    [actorSub],
  )
  cached.expires = 0
}

export function readOnlyGate(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next()
    return
  }
  isTripped()
    .then(({ tripped, reason }) => {
      if (tripped) {
        console.warn('[aero][breaker] blocked %s %s reason=%s', req.method, req.path, reason)
        res.status(503).json({ error: 'SERVICE_READ_ONLY', reason })
        return
      }
      next()
    })
    .catch(() => res.status(503).json({ error: 'BREAKER_CHECK_FAILED' }))
}
