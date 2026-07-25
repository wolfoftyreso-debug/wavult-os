/**
 * prefetch-policies — rules that drive the predictive prefetch engine.
 *
 * A prefetch policy is a declarative rule set that tells the onboard
 * prefetch engine what to anticipate. Policies live in the control plane
 * so that they can be versioned, reviewed, and approved through the
 * existing Wavult RTM flow before they change what happens at 35 000 ft.
 *
 * Every policy change is a four-eyes operation:
 *   1. submitter creates draft
 *   2. reviewer approves
 *   3. QA releases to staging
 *   4. operator promotes to production
 *
 * The state machine is enforced here; the existing approvals service is
 * the UI for step 2 and 3.
 *
 * Requirements traceability:
 *   @req AEAN-REQ-PFT-001  Prefetch policies are declarative and auditable
 *   @req AEAN-REQ-PFT-002  Production promotion requires four-eyes
 *   @req AEAN-REQ-PFT-003  Policy changes are hash-chained
 *   @req AEAN-REQ-SEC-004  Every mutation authenticated and authorised
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { appendEvent } from '../lib/event-store'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import { getPool } from '../lib/db'

const router = Router()

const policySchema = z.object({
  policy_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).max(64),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  target_tails: z.array(z.string()).min(1),
  rules: z.array(z.object({
    name: z.string().min(1).max(64),
    trigger: z.object({
      flight_phase: z.enum(['ground', 'taxi', 'takeoff', 'climb', 'cruise', 'descent', 'approach', 'landing']).optional(),
      pax_count_gte: z.number().int().nonnegative().optional(),
      route_icao_origin: z.string().length(4).optional(),
      route_icao_destination: z.string().length(4).optional(),
    }),
    action: z.object({
      prefetch_pack_ids: z.array(z.string()).min(1),
      max_bandwidth_kbps: z.number().int().positive(),
      priority: z.number().int().min(0).max(9),
    }),
    confidence_threshold: z.number().min(0).max(1),
  })).min(1).max(200),
})

type PolicyState = 'draft' | 'pending_review' | 'approved' | 'released' | 'promoted' | 'retired'

router.post('/prefetch-policies', requireAuth, requireRole('aero_operator', 'aero_admin'), async (req: Request, res: Response) => {
  const parse = policySchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: 'VALIDATION', details: parse.error.flatten() })
    return
  }
  const p = parse.data

  const event = await appendEvent({
    streamId: `${p.policy_id}@${p.version}`,
    streamType: 'prefetch_policy',
    eventType: 'aero.prefetch_policy.drafted.v1',
    payload: { ...p },
    classification: 'internal',
    actorSub: req.user!.sub,
    orgId: req.user!.org,
  })

  await getPool().query(
    `INSERT INTO aero_prefetch_policy (
        policy_id, version, org_id, state, body_json, created_by, created_at
      ) VALUES ($1,$2,$3,'draft',$4,$5,NOW())
      ON CONFLICT (policy_id, version, org_id) DO NOTHING`,
    [p.policy_id, p.version, req.user!.org, JSON.stringify(p), req.user!.sub],
  )

  res.status(201).json({
    policy_id: p.policy_id,
    version: p.version,
    state: 'draft' as PolicyState,
    event_id: event.id,
  })
})

async function transition(
  policyId: string,
  version: string,
  orgId: string,
  from: PolicyState[],
  to: PolicyState,
  actorSub: string,
  eventType: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { rows } = await getPool().query(
    `SELECT state FROM aero_prefetch_policy WHERE policy_id = $1 AND version = $2 AND org_id = $3`,
    [policyId, version, orgId],
  )
  if (rows.length === 0) return { ok: false, reason: 'NOT_FOUND' }
  if (!from.includes(rows[0].state)) return { ok: false, reason: `INVALID_STATE:${rows[0].state}` }

  // Four-eyes: the actor performing this transition must be different
  // from the one who performed the previous transition.
  const { rows: last } = await getPool().query(
    `SELECT actor_sub FROM aero_event_log
      WHERE stream_type = 'prefetch_policy' AND stream_id = $1
      ORDER BY stream_seq DESC LIMIT 1`,
    [`${policyId}@${version}`],
  )
  if (last.length > 0 && last[0].actor_sub === actorSub) {
    return { ok: false, reason: 'FOUR_EYES_VIOLATION' }
  }

  await appendEvent({
    streamId: `${policyId}@${version}`,
    streamType: 'prefetch_policy',
    eventType,
    payload: { from: rows[0].state, to },
    classification: 'internal',
    actorSub,
    orgId,
  })
  await getPool().query(
    `UPDATE aero_prefetch_policy SET state = $1, last_transition_at = NOW(), last_transition_by = $2
      WHERE policy_id = $3 AND version = $4 AND org_id = $5`,
    [to, actorSub, policyId, version, orgId],
  )
  return { ok: true }
}

router.post('/prefetch-policies/:id/:version/submit', requireAuth, requireRole('aero_operator'), async (req, res) => {
  const r = await transition(req.params.id, req.params.version, req.user!.org, ['draft'], 'pending_review', req.user!.sub, 'aero.prefetch_policy.submitted.v1')
  if (!r.ok) { res.status(409).json({ error: r.reason }); return }
  res.json({ ok: true, state: 'pending_review' })
})

router.post('/prefetch-policies/:id/:version/approve', requireAuth, requireRole('aero_reviewer', 'aero_admin'), async (req, res) => {
  const r = await transition(req.params.id, req.params.version, req.user!.org, ['pending_review'], 'approved', req.user!.sub, 'aero.prefetch_policy.approved.v1')
  if (!r.ok) { res.status(409).json({ error: r.reason }); return }
  res.json({ ok: true, state: 'approved' })
})

router.post('/prefetch-policies/:id/:version/release', requireAuth, requireRole('aero_qa'), async (req, res) => {
  const r = await transition(req.params.id, req.params.version, req.user!.org, ['approved'], 'released', req.user!.sub, 'aero.prefetch_policy.released.v1')
  if (!r.ok) { res.status(409).json({ error: r.reason }); return }
  res.json({ ok: true, state: 'released' })
})

router.post('/prefetch-policies/:id/:version/promote', requireAuth, requireRole('aero_admin'), async (req, res) => {
  const r = await transition(req.params.id, req.params.version, req.user!.org, ['released'], 'promoted', req.user!.sub, 'aero.prefetch_policy.promoted.v1')
  if (!r.ok) { res.status(409).json({ error: r.reason }); return }
  res.json({ ok: true, state: 'promoted' })
})

router.get('/prefetch-policies', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await getPool().query(
    `SELECT policy_id, version, state, created_by, created_at, last_transition_by, last_transition_at
       FROM aero_prefetch_policy WHERE org_id = $1 ORDER BY created_at DESC`,
    [req.user!.org],
  )
  res.json({ policies: rows })
})

export default router
