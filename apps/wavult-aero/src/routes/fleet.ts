/**
 * fleet — aircraft registry.
 *
 * An "aircraft" in AEAN is the tail number and its airworthiness metadata.
 * We deliberately do not store full CAMO data here; this service is the
 * edge-internet control plane, and all it needs is enough to route policy
 * at tail level and to correlate telemetry.
 *
 * Requirements traceability (see rtm/requirements.ts):
 *   @req AEAN-REQ-FLT-001  Unique, verifiable aircraft identity
 *   @req AEAN-REQ-FLT-002  Change history preserved (append-only)
 *   @req AEAN-REQ-SEC-004  All mutations authenticated and authorised
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { appendEvent, readStream } from '../lib/event-store'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import { getPool } from '../lib/db'

const router = Router()

const TAIL_NUMBER_RE = /^[A-Z]{1,2}-?[A-Z0-9]{1,5}$/
const ICAO24_RE = /^[0-9A-F]{6}$/

const registerSchema = z.object({
  tail_number: z.string().regex(TAIL_NUMBER_RE, 'tail_number must match ICAO format'),
  icao24: z.string().regex(ICAO24_RE, 'icao24 must be 6 hex chars'),
  aircraft_type: z.string().min(2).max(20), // ICAO type designator, e.g. A320, B738
  operator_icao: z.string().length(3),      // operator ICAO code, e.g. SAS
  certifying_authority: z.enum(['EASA', 'FAA', 'CAA-UK', 'CASA', 'TCCA']),
  registration_country: z.string().length(2), // ISO 3166-1 alpha-2
})

router.post('/aircraft', requireAuth, requireRole('aero_admin', 'aero_operator'), async (req: Request, res: Response) => {
  const parse = registerSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: 'VALIDATION', details: parse.error.flatten() })
    return
  }
  const input = parse.data

  const { rows: existing } = await getPool().query(
    `SELECT tail_number FROM aero_aircraft WHERE tail_number = $1 OR icao24 = $2`,
    [input.tail_number, input.icao24],
  )
  if (existing.length > 0) {
    res.status(409).json({ error: 'AIRCRAFT_ALREADY_REGISTERED' })
    return
  }

  const event = await appendEvent({
    streamId: input.tail_number,
    streamType: 'aircraft',
    eventType: 'aero.aircraft.registered.v1',
    payload: { ...input },
    classification: 'restricted',
    actorSub: req.user!.sub,
    orgId: req.user!.org,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
  })

  // Projection — the materialised current-state row. Rebuildable from the log.
  await getPool().query(
    `INSERT INTO aero_aircraft (
        tail_number, icao24, aircraft_type, operator_icao,
        certifying_authority, registration_country, org_id, registered_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [
      input.tail_number, input.icao24, input.aircraft_type, input.operator_icao,
      input.certifying_authority, input.registration_country, req.user!.org,
    ],
  )

  res.status(201).json({
    tail_number: input.tail_number,
    event_id: event.id,
    event_hash: event.this_hash,
    stream_seq: event.stream_seq,
  })
})

router.get('/aircraft', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await getPool().query(
    `SELECT tail_number, icao24, aircraft_type, operator_icao, certifying_authority,
            registration_country, registered_at
       FROM aero_aircraft
      WHERE org_id = $1
      ORDER BY tail_number ASC`,
    [req.user!.org],
  )
  res.json({ aircraft: rows })
})

router.get('/aircraft/:tail/history', requireAuth, requireRole('aero_admin', 'aero_auditor'), async (req: Request, res: Response) => {
  const events = await readStream('aircraft', req.params.tail)
  res.json({
    tail_number: req.params.tail,
    length: events.length,
    events: events.map((e) => ({
      seq: e.stream_seq,
      type: e.event_type,
      at: e.recorded_at,
      actor: e.actor_sub,
      hash: e.this_hash,
      prev: e.prev_hash,
    })),
  })
})

export default router
