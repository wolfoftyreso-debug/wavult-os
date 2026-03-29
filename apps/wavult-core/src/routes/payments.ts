import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { assertPaymentTransition, type PaymentState } from '../engines/stateEngine'
import { computeSplits, assertCurrencySupported } from '../engines/financialEngine'
import { emitEvent } from '../engines/eventEngine'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const InitiateSchema = z.object({
  reference_type: z.enum(['task', 'invoice', 'ads_purchase']),
  reference_id: z.string().uuid(),
  gross_amount: z.number().positive(),
  gross_currency: z.string(),
  from_entity: z.string(),
  to_entity: z.string(),
  split_type: z.enum(['landvex', 'quixzoom_payout', 'ads']),
  idempotency_key: z.string(),
})

// POST /v1/payment/initiate
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const data = InitiateSchema.parse(req.body)
    assertCurrencySupported(data.gross_currency)

    // Check idempotency
    const { data: existing } = await supabase.schema('wavult').from('transactions')
      .select('id, status').eq('idempotency_key', data.idempotency_key).single()
    if (existing) return res.json({ transaction_id: existing.id, status: existing.status, idempotent: true })

    const txId = uuid()
    await supabase.schema('wavult').from('transactions').insert({
      id: txId,
      idempotency_key: data.idempotency_key,
      from_entity_id: data.from_entity,
      to_entity_id: data.to_entity,
      gross_amount: data.gross_amount,
      gross_currency: data.gross_currency,
      net_amount: data.gross_amount,
      net_currency: data.gross_currency,
      type: 'payment',
      status: 'initiated',
      reference_type: data.reference_type,
      reference_id: data.reference_id,
    })

    await emitEvent('payment.initiated', 'transaction', txId, { gross: data.gross_amount, currency: data.gross_currency })
    res.json({ transaction_id: txId, status: 'initiated' })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors })
    res.status(500).json({ error: String(err) })
  }
})

// POST /v1/payment/split
router.post('/split', async (req: Request, res: Response) => {
  try {
    const { transaction_id, entity_id } = req.body
    if (!transaction_id || !entity_id) return res.status(400).json({ error: 'MISSING_PARAMS' })

    const { data: tx } = await supabase.schema('wavult').from('transactions')
      .select('*').eq('id', transaction_id).single()
    if (!tx) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' })

    assertPaymentTransition(tx.status as PaymentState, 'split_executing')

    // Determine split type from reference
    const splitType = entity_id.startsWith('landvex') ? 'landvex'
      : entity_id.startsWith('quixzoom') ? 'quixzoom_payout' : 'ads'

    const splits = computeSplits(tx.gross_amount, tx.gross_currency, splitType, entity_id)

    // Save splits
    const splitRecords = splits.map((s: { recipient: string; fee_type: string; percentage: number; amount: number; currency: string }) => ({
      id: uuid(),
      transaction_id,
      entity_id: ['zoomer', 'creator'].includes(s.recipient) ? null : s.recipient,
      external_recipient: ['zoomer', 'creator'].includes(s.recipient) ? s.recipient : null,
      fee_type: s.fee_type,
      percentage: s.percentage,
      amount: s.amount,
      currency: s.currency,
      status: 'pending',
    }))

    await supabase.schema('wavult').from('revenue_splits').insert(splitRecords)
    await supabase.schema('wavult').from('transactions').update({
      status: 'split_executing', updated_at: new Date().toISOString()
    }).eq('id', transaction_id)

    await emitEvent('payment.split_executed', 'transaction', transaction_id, { splits: splits.length, total: tx.gross_amount })
    res.json({ transaction_id, splits, status: 'split_executing' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg.startsWith('SPLIT_ERROR') || msg.startsWith('INVALID_PAYMENT')) return res.status(409).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

export { router as paymentRouter }
