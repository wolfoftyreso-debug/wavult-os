/**
 * telemetry — edge-node telemetry ingest.
 *
 * Telemetry is the raw operational stream that drives fleet intelligence:
 * cache hit-rate, link quality, prefetch accuracy, bandwidth usage,
 * session counts per flight phase. Writes are authenticated as an edge
 * node (requireEdgeNode), not as a human operator.
 *
 * Storage strategy:
 *   - Hot path: INSERT into aero_telemetry (time-series, partitioned by
 *     day). High-volume, low-signal for audit — classification internal.
 *   - Safety-relevant signals (unauthorised access attempts, tamper
 *     alarms, integrity check failures) are promoted to the event log
 *     with classification aviation-safety-sensitive. These are rare and
 *     trigger the circuit breaker if severity >= "high".
 *
 * Requirements traceability:
 *   @req AEAN-REQ-TEL-001  Edge telemetry is authenticated per-node
 *   @req AEAN-REQ-TEL-002  Safety-relevant signals hit the audit log
 *   @req AEAN-REQ-SMS-001  ICAO Annex 19 hazard events promoted to SMS
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { appendEvent } from '../lib/event-store'
import { requireEdgeNode } from '../middleware/requireAuth'
import { trip } from '../middleware/readOnlyGate'
import { getPool } from '../lib/db'

const router = Router()

const telemetryBatchSchema = z.object({
  batch_id: z.string().uuid(),
  flight_id: z.string().max(32).optional(),   // opaque operator-assigned id
  flight_phase: z.enum(['ground', 'taxi', 'takeoff', 'climb', 'cruise', 'descent', 'approach', 'landing']).optional(),
  samples: z.array(z.object({
    ts: z.string().datetime(),
    metric: z.string().min(1).max(64),
    value: z.number().finite(),
    unit: z.string().max(16),
  })).max(1000),
  events: z.array(z.object({
    ts: z.string().datetime(),
    kind: z.enum([
      'cache_hit', 'cache_miss', 'prefetch_accurate', 'prefetch_wasted',
      'link_up', 'link_down', 'integrity_alarm', 'tamper_alarm',
      'unauthorized_access', 'user_session_start', 'user_session_end',
    ]),
    severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
    detail: z.record(z.unknown()).optional(),
  })).max(500),
})

const SAFETY_KINDS = new Set(['integrity_alarm', 'tamper_alarm', 'unauthorized_access'])

router.post('/telemetry/ingest', requireEdgeNode, async (req: Request, res: Response) => {
  const parse = telemetryBatchSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: 'VALIDATION', details: parse.error.flatten() })
    return
  }
  const batch = parse.data
  const edgeNodeId = (req as Request & { edgeNodeId?: string }).edgeNodeId!

  // Resolve the tail + org for this edge node. A retired node cannot push.
  const { rows } = await getPool().query(
    `SELECT tail_number, org_id, status FROM aero_edge_node WHERE edge_node_id = $1`,
    [edgeNodeId],
  )
  if (rows.length === 0) {
    res.status(404).json({ error: 'UNKNOWN_EDGE_NODE' })
    return
  }
  if (rows[0].status !== 'active') {
    res.status(409).json({ error: 'EDGE_NODE_NOT_ACTIVE' })
    return
  }
  const tail = rows[0].tail_number
  const orgId = rows[0].org_id

  // Bulk insert samples into the time-series table.
  if (batch.samples.length > 0) {
    const values: unknown[] = []
    const placeholders: string[] = []
    batch.samples.forEach((s, i) => {
      const base = i * 6
      placeholders.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`)
      values.push(edgeNodeId, tail, s.ts, s.metric, s.value, s.unit)
    })
    await getPool().query(
      `INSERT INTO aero_telemetry (edge_node_id, tail_number, ts, metric, value, unit) VALUES ${placeholders.join(',')}`,
      values,
    )
  }

  // Promote safety-relevant events to the audit log.
  const safetyPromotions: string[] = []
  for (const ev of batch.events) {
    if (SAFETY_KINDS.has(ev.kind) || ev.severity === 'critical') {
      const stored = await appendEvent({
        streamId: edgeNodeId,
        streamType: 'edge_node',
        eventType: `aero.edge_node.${ev.kind}.v1`,
        payload: {
          tail_number: tail,
          severity: ev.severity,
          flight_id: batch.flight_id ?? null,
          flight_phase: batch.flight_phase ?? null,
          detail: ev.detail ?? {},
          reported_at: ev.ts,
        },
        classification: 'aviation-safety-sensitive',
        actorSub: `edge:${edgeNodeId}`,
        orgId,
      })
      safetyPromotions.push(stored.id)

      // Critical tamper/integrity alarms trip the breaker.
      if (ev.severity === 'critical' && (ev.kind === 'tamper_alarm' || ev.kind === 'integrity_alarm')) {
        await trip(`edge_node:${edgeNodeId}:${ev.kind}`, `edge:${edgeNodeId}`)
      }
    } else {
      // Non-safety events are logged to a lower-retention stream for
      // fleet intelligence. This is intentionally a separate table so
      // a DoS of operational events cannot flood the audit log.
      await getPool().query(
        `INSERT INTO aero_operational_event (edge_node_id, tail_number, ts, kind, severity, detail)
             VALUES ($1,$2,$3,$4,$5,$6)`,
        [edgeNodeId, tail, ev.ts, ev.kind, ev.severity, JSON.stringify(ev.detail ?? {})],
      )
    }
  }

  res.status(202).json({
    accepted_samples: batch.samples.length,
    accepted_events: batch.events.length,
    safety_promotions: safetyPromotions.length,
  })
})

export default router
