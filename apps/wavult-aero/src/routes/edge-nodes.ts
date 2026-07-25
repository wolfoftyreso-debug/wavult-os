/**
 * edge-nodes — onboard appliance registry and enrolment.
 *
 * An "edge node" is a physical appliance bolted into the aircraft. At
 * enrolment, it presents:
 *   - a TPM/SE attestation blob (EK cert + AK cert + quote)
 *   - its hardware id (serial + CPU id)
 *   - the tail number it is being installed on
 *
 * We accept an attestation, bind the node to the tail, and mint a
 * long-lived enrolment cert (via ACM Private CA in the real deployment
 * — here we stub the issuance so the scaffold compiles independently).
 *
 * Requirements traceability:
 *   @req AEAN-REQ-SEC-001  Edge nodes authenticated by hardware root of trust
 *   @req AEAN-REQ-SEC-002  Enrolment produces a revocable credential
 *   @req AEAN-REQ-SEC-004  Every mutation authenticated and authorised
 *   @req AEAN-REQ-EDG-001  Nodes bound to exactly one tail at a time
 *   @req AEAN-REQ-EDG-002  Re-enrolment on swap emits a retirement event
 */

import { Router, Request, Response } from 'express'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { _appendEventWithClient, appendEvent } from '../lib/event-store'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import { getPool, withTransaction } from '../lib/db'

const router = Router()

const enrolSchema = z.object({
  hardware_id: z.string().min(8).max(128),
  tail_number: z.string().min(3).max(10),
  tpm_ek_cert_pem: z.string().startsWith('-----BEGIN CERTIFICATE-----'),
  tpm_quote: z.string().min(16),
  firmware_version: z.string().min(1),
  model: z.enum(['AEAN-EDGE-1U', 'AEAN-EDGE-2U', 'AEAN-EDGE-RACK']),
})

// In production this function calls an HSM-backed attestation verifier.
// The signature here is stable so the call site does not change when the
// real implementation lands.
async function verifyTpmQuote(
  ekCertPem: string,
  quote: string,
  _nonce: string,
): Promise<{ ok: boolean; reason?: string; ak_pub_sha256?: string }> {
  if (!ekCertPem.includes('BEGIN CERTIFICATE') || quote.length < 16) {
    return { ok: false, reason: 'QUOTE_FORMAT' }
  }
  const akPubSha = createHash('sha256').update(ekCertPem + quote).digest('hex')
  return { ok: true, ak_pub_sha256: akPubSha }
}

router.post('/edge-nodes/enrol', requireAuth, requireRole('aero_admin'), async (req: Request, res: Response) => {
  const parse = enrolSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: 'VALIDATION', details: parse.error.flatten() })
    return
  }
  const input = parse.data

  const { rows: aircraft } = await getPool().query(
    `SELECT tail_number FROM aero_aircraft WHERE tail_number = $1 AND org_id = $2`,
    [input.tail_number, req.user!.org],
  )
  if (aircraft.length === 0) {
    res.status(404).json({ error: 'AIRCRAFT_NOT_REGISTERED' })
    return
  }

  // The nonce MUST be supplied out-of-band in production. For the scaffold
  // we derive a deterministic value from the hardware id so tests are
  // reproducible — NOT safe for production use.
  const nonce = createHash('sha256').update('enrol:' + input.hardware_id).digest('hex')
  const attest = await verifyTpmQuote(input.tpm_ek_cert_pem, input.tpm_quote, nonce)
  if (!attest.ok) {
    res.status(400).json({ error: 'TPM_ATTESTATION_FAILED', reason: attest.reason })
    return
  }

  const newEdgeNodeId = 'aean-' + randomUUID()

  try {
    const result = await withTransaction(async (client) => {
      // Look up any ACTIVE prior binding for this hardware_id. Partial
      // unique index (migration 002) guarantees at most one row here.
      const prior = await client.query<{
        edge_node_id: string
        tail_number: string
        org_id: string
      }>(
        `SELECT edge_node_id, tail_number, org_id
           FROM aero_edge_node
          WHERE hardware_id = $1 AND status = 'active'
          FOR UPDATE`,
        [input.hardware_id],
      )

      let reenrolledFrom: {
        edge_node_id: string
        tail_number: string
        retirement_event_id: string
      } | null = null

      if (prior.rowCount && prior.rowCount > 0) {
        const previous = prior.rows[0]

        // Cross-org re-enrolment is refused. A physical box cannot
        // jump operators without an explicit out-of-band handover.
        if (previous.org_id !== req.user!.org) {
          throw new Error('CROSS_ORG_REENROL_DENIED')
        }

        // Same tail + same hardware_id + active = duplicate enrol, not
        // re-enrolment. Reject. This prevents accidental double-enrol.
        if (previous.tail_number === input.tail_number) {
          throw new Error('ALREADY_ENROLLED_ON_TAIL')
        }

        // Genuine re-enrolment: the box is moving to a new tail.
        // Step 1: retirement event for the previous binding.
        const retirementEvent = await _appendEventWithClient(client, {
          streamId: previous.edge_node_id,
          streamType: 'edge_node',
          eventType: 'aero.edge_node.retired.v1',
          payload: {
            reason: 'reenrolled',
            reenrolled_to_tail: input.tail_number,
            reenrolled_as: newEdgeNodeId,
          },
          classification: 'aviation-safety-sensitive',
          actorSub: req.user!.sub,
          orgId: req.user!.org,
        })

        // Step 2: mark the previous projection row as retired.
        await client.query(
          `UPDATE aero_edge_node
              SET status = 'retired',
                  retired_at = NOW(),
                  retirement_reason = 'reenrolled'
            WHERE edge_node_id = $1`,
          [previous.edge_node_id],
        )

        reenrolledFrom = {
          edge_node_id: previous.edge_node_id,
          tail_number: previous.tail_number,
          retirement_event_id: retirementEvent.id,
        }
      }

      // Step 3: enrolment event for the new binding, causation-linked
      // to the retirement event if this is a re-enrolment.
      const enrolmentEvent = await _appendEventWithClient(client, {
        streamId: newEdgeNodeId,
        streamType: 'edge_node',
        eventType: 'aero.edge_node.enrolled.v1',
        payload: {
          edge_node_id: newEdgeNodeId,
          hardware_id: input.hardware_id,
          tail_number: input.tail_number,
          model: input.model,
          firmware_version: input.firmware_version,
          ak_pub_sha256: attest.ak_pub_sha256,
          reenrolled_from: reenrolledFrom
            ? {
                previous_edge_node_id: reenrolledFrom.edge_node_id,
                previous_tail_number: reenrolledFrom.tail_number,
              }
            : null,
        },
        classification: 'aviation-safety-sensitive',
        actorSub: req.user!.sub,
        orgId: req.user!.org,
        causationId: reenrolledFrom?.retirement_event_id,
      })

      // Step 4: insert the new projection row.
      await client.query(
        `INSERT INTO aero_edge_node (
            edge_node_id, hardware_id, tail_number, model, firmware_version,
            ak_pub_sha256, org_id, enrolled_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),'active')`,
        [
          newEdgeNodeId, input.hardware_id, input.tail_number, input.model,
          input.firmware_version, attest.ak_pub_sha256, req.user!.org,
        ],
      )

      return { enrolmentEvent, reenrolledFrom }
    })

    res.status(201).json({
      edge_node_id: newEdgeNodeId,
      event_id: result.enrolmentEvent.id,
      event_hash: result.enrolmentEvent.this_hash,
      reenrolled_from: result.reenrolledFrom,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'ALREADY_ENROLLED_ON_TAIL') {
      res.status(409).json({ error: 'ALREADY_ENROLLED_ON_TAIL' })
      return
    }
    if (msg === 'CROSS_ORG_REENROL_DENIED') {
      res.status(403).json({ error: 'CROSS_ORG_REENROL_DENIED' })
      return
    }
    console.error('[aero][edge-nodes][enrol] txn failed:', msg)
    res.status(500).json({ error: 'ENROLMENT_FAILED' })
  }
})

router.post('/edge-nodes/:id/retire', requireAuth, requireRole('aero_admin'), async (req: Request, res: Response) => {
  const reason = (req.body?.reason as string | undefined) ?? 'unspecified'

  const { rows } = await getPool().query(
    `SELECT edge_node_id FROM aero_edge_node WHERE edge_node_id = $1 AND org_id = $2 AND status = 'active'`,
    [req.params.id, req.user!.org],
  )
  if (rows.length === 0) {
    res.status(404).json({ error: 'EDGE_NODE_NOT_FOUND' })
    return
  }

  const event = await appendEvent({
    streamId: req.params.id,
    streamType: 'edge_node',
    eventType: 'aero.edge_node.retired.v1',
    payload: { reason },
    classification: 'aviation-safety-sensitive',
    actorSub: req.user!.sub,
    orgId: req.user!.org,
  })

  await getPool().query(
    `UPDATE aero_edge_node SET status = 'retired', retired_at = NOW(), retirement_reason = $1 WHERE edge_node_id = $2`,
    [reason, req.params.id],
  )

  res.json({ edge_node_id: req.params.id, event_id: event.id })
})

router.get('/edge-nodes', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await getPool().query(
    `SELECT edge_node_id, hardware_id, tail_number, model, firmware_version,
            ak_pub_sha256, status, enrolled_at, retired_at
       FROM aero_edge_node
      WHERE org_id = $1
      ORDER BY enrolled_at DESC`,
    [req.user!.org],
  )
  res.json({ edge_nodes: rows })
})

export default router
