/**
 * Payout Execution — Revolut Business API
 *
 * Flöde:
 * 1. Hämta payout från DB
 * 2. Guards: task_approved + fraud_checked
 * 3. State machine: pending → executing
 * 4. POST till Revolut Business Payments API
 * 5. Spara processor_ref + status
 * 6. Emit event
 */

import { Router, Request, Response } from 'express'
import { assertPayoutTransition, type PayoutState } from '../engines/stateEngine'
import { emitEvent } from '../engines/eventEngine'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Payout execution requires auth + finance|admin role
router.use(requireAuth, requireRole('finance', 'admin'))

// ── Revolut Business Payments API ────────────────────────────────────────────

interface RevolutPaymentRequest {
  request_id: string
  account_id: string
  receiver: {
    counterparty_id?: string
    account_id?: string
  }
  amount: number
  currency: string
  reference: string
}

interface RevolutPaymentResponse {
  id: string
  state: string
  request_id: string
  created_at: string
}

async function executeRevolutPayout(
  payoutId: string,
  amount: number,
  currency: string,
  counterpartyId: string,
  reference: string
): Promise<RevolutPaymentResponse> {
  const accessToken = process.env.REVOLUT_ACCESS_TOKEN
  const accountId = process.env.REVOLUT_BUSINESS_ACCOUNT_ID

  if (!accessToken) throw new Error('REVOLUT_ACCESS_TOKEN not configured')
  if (!accountId) throw new Error('REVOLUT_BUSINESS_ACCOUNT_ID not configured')

  const body: RevolutPaymentRequest = {
    request_id: payoutId,  // idempotency key
    account_id: accountId,
    receiver: { counterparty_id: counterpartyId },
    amount,
    currency,
    reference,
  }

  const isProd = process.env.NODE_ENV === 'production'
  const baseUrl = isProd
    ? 'https://b2b.revolut.com/api/1.0'
    : 'https://sandbox-b2b.revolut.com/api/1.0'

  const response = await fetch(`${baseUrl}/pay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as Record<string, unknown>
    const code = (err.code as string) || response.status.toString()
    const msg = (err.message as string) || 'Revolut payment failed'
    throw new Error(`REVOLUT_ERROR:${code}:${msg}`)
  }

  return response.json() as Promise<RevolutPaymentResponse>
}

// ── POST /v1/payout/execute ───────────────────────────────────────────────────
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { payout_id } = req.body
    if (!payout_id) return res.status(400).json({ error: 'MISSING_PAYOUT_ID' })

    const { data: payout } = await supabase.schema('wavult').from('payouts')
      .select('*').eq('id', payout_id).single()
    if (!payout) return res.status(404).json({ error: 'PAYOUT_NOT_FOUND' })

    // Guards
    if (!payout.task_approved) return res.status(409).json({ error: 'PAYOUT_BLOCKED_TASK_NOT_APPROVED' })
    if (!payout.fraud_checked) return res.status(409).json({ error: 'PAYOUT_BLOCKED_FRAUD_INCOMPLETE' })

    // State machine
    assertPayoutTransition(payout.status as PayoutState, 'executing')

    // Mark as executing (optimistic — before Revolut call)
    await supabase.schema('wavult').from('payouts').update({
      status: 'executing',
      updated_at: new Date().toISOString(),
    }).eq('id', payout_id)

    // Execute via Revolut Business API
    let processorRef: string
    let processorStatus: string

    try {
      const revolut = await executeRevolutPayout(
        payout_id,
        payout.amount,
        payout.currency,
        payout.counterparty_id || payout.zoomer_id,
        `Wavult payout ${payout_id.slice(0, 8)}`
      )
      processorRef = revolut.id
      processorStatus = revolut.state  // pending|completed|failed
    } catch (revolut_err) {
      // Revolut call failed — mark as failed, allow retry
      const errMsg = revolut_err instanceof Error ? revolut_err.message : 'UNKNOWN'
      console.error(`[Payout] Revolut error for ${payout_id}:`, errMsg)

      await supabase.schema('wavult').from('payouts').update({
        status: 'failed',
        notes: errMsg,
        updated_at: new Date().toISOString(),
      }).eq('id', payout_id)

      await emitEvent('payout.failed', 'payout', payout_id, {
        zoomer_id: payout.zoomer_id,
        amount: payout.amount,
        currency: payout.currency,
        error: errMsg,
      })

      return res.status(502).json({ error: 'PROCESSOR_ERROR', detail: errMsg })
    }

    // Update with processor result
    const finalStatus = processorStatus === 'failed' ? 'failed' : 'executed'
    await supabase.schema('wavult').from('payouts').update({
      status: finalStatus,
      processor_ref: processorRef,
      executed_at: finalStatus === 'executed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', payout_id)

    await emitEvent('payout.executed', 'payout', payout_id, {
      zoomer_id: payout.zoomer_id,
      amount: payout.amount,
      currency: payout.currency,
      processor_ref: processorRef,
      processor_status: processorStatus,
    })

    return res.json({
      payout_id,
      status: finalStatus,
      processor_ref: processorRef,
      processor_status: processorStatus,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg.startsWith('INVALID_PAYOUT_TRANSITION')) return res.status(409).json({ error: msg })
    console.error('[Payout] Unexpected error:', msg)
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── POST /v1/payout/status/:revolut_id — poll Revolut payment status ─────────
router.get('/status/:revolut_id', async (req: Request, res: Response) => {
  const accessToken = process.env.REVOLUT_ACCESS_TOKEN
  if (!accessToken) return res.status(503).json({ error: 'REVOLUT_NOT_CONFIGURED' })

  const isProd = process.env.NODE_ENV === 'production'
  const baseUrl = isProd ? 'https://b2b.revolut.com/api/1.0' : 'https://sandbox-b2b.revolut.com/api/1.0'

  try {
    const response = await fetch(`${baseUrl}/transaction/${req.params.revolut_id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    if (!response.ok) return res.status(response.status).json({ error: 'REVOLUT_LOOKUP_FAILED' })
    const data = await response.json()
    return res.json(data)
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export { router as payoutRouter }
