import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { assertPayoutTransition, type PayoutState } from '../engines/stateEngine'
import { emitEvent } from '../engines/eventEngine'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// POST /v1/payout/execute
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { payout_id } = req.body
    if (!payout_id) return res.status(400).json({ error: 'MISSING_PAYOUT_ID' })

    const { data: payout } = await supabase.schema('wavult').from('payouts')
      .select('*').eq('id', payout_id).single()
    if (!payout) return res.status(404).json({ error: 'PAYOUT_NOT_FOUND' })

    // Guards
    if (!payout.task_approved) return res.status(409).json({ error: 'PAYOUT_BLOCKED: task not approved' })
    if (!payout.fraud_checked) return res.status(409).json({ error: 'PAYOUT_BLOCKED: fraud check incomplete' })

    assertPayoutTransition(payout.status as PayoutState, 'executing')

    await supabase.schema('wavult').from('payouts').update({
      status: 'executing',
      updated_at: new Date().toISOString(),
    }).eq('id', payout_id)

    // TODO: Route to actual payment processor (Swish/SEPA/Wise)
    // Simulated execution:
    const processorRef = `proc_${uuid().slice(0, 8)}`

    await supabase.schema('wavult').from('payouts').update({
      status: 'executed',
      processor_ref: processorRef,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', payout_id)

    await emitEvent('payout.executed', 'payout', payout_id, {
      zoomer_id: payout.zoomer_id,
      amount: payout.amount,
      currency: payout.currency,
    })

    res.json({ payout_id, status: 'executed', processor_ref: processorRef })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg.startsWith('INVALID_PAYOUT_TRANSITION')) return res.status(409).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

export { router as payoutRouter }
