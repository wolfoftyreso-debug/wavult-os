/**
 * Wavult Payment Orchestrator v1
 *
 * Hanterar PaymentIntents från CREATED → SETTLED
 * State machine enforcement via PostgreSQL-funktion
 *
 * REGLER:
 * - Aldrig float för pengar (alltid minor units / integer)
 * - Alltid idempotency_key
 * - Alla transitions via transition_payment_intent() RPC
 * - Ledger-post skapas vid CAPTURED
 */

import { supabase } from './supabase'
import { toMinor, type Currency } from './ledger'
import PSPRouter, { recordPSPResult } from './psp-router'

// ── Types ──────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'CREATED' | 'PROCESSING' | 'AUTHORIZED'
  | 'CAPTURED' | 'SETTLED' | 'FAILED' | 'CANCELLED' | 'REFUNDED'

export type PSP = 'revolut' | 'stripe' | 'adyen' | 'manual' | 'internal'

export interface CreatePaymentIntentInput {
  orgId: string
  amountMinor: number          // integer! toMinor(100, 'USD') = 10000
  currency: Currency
  description: string
  reference?: string
  customerId?: string
  fromAccountCode?: string     // debet-konto i kontoplan (default '5000')
  toAccountCode?: string       // kredit-konto (default '2000')
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export interface PaymentIntent {
  id: string
  orgId: string
  amountMinor: number
  currency: Currency
  status: PaymentStatus
  psp?: PSP
  pspPaymentId?: string
  description: string
  reference?: string
  idempotencyKey?: string
  createdAt: string
  updatedAt: string
}

// ── Revolut Integration ────────────────────────────────────────────────────

interface RevolutOrderResponse {
  id: string
  state: string
  checkout_url?: string
}

async function createRevolutOrder(
  amountMinor: number,
  currency: Currency,
  description: string,
  idempotencyKey: string
): Promise<RevolutOrderResponse> {
  const apiKey = process.env.REVOLUT_API_KEY ?? process.env.REVOLUT_API_KEY_TECH ?? ''
  const baseUrl = process.env.REVOLUT_SANDBOX === 'true'
    ? 'https://sandbox-merchant.revolut.com'
    : 'https://merchant.revolut.com'

  const response = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Revolut-Request-Id': idempotencyKey,
    },
    body: JSON.stringify({
      amount: amountMinor,
      currency,
      description,
      capture_mode: 'AUTOMATIC',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Revolut API error ${response.status}: ${err}`)
  }

  return response.json() as Promise<RevolutOrderResponse>
}

// ── Orchestrator Service ───────────────────────────────────────────────────

export const PaymentOrchestrator = {

  /**
   * Skapa ett nytt PaymentIntent
   */
  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const { data, error } = await supabase
      .from('payment_intents')
      .insert({
        org_id: input.orgId,
        amount_minor: input.amountMinor,
        currency: input.currency,
        description: input.description,
        reference: input.reference,
        customer_id: input.customerId,
        from_account_code: input.fromAccountCode ?? '5000',
        to_account_code: input.toAccountCode ?? '2000',
        idempotency_key: input.idempotencyKey,
        metadata: input.metadata ?? {},
        status: 'CREATED',
      })
      .select()
      .single()

    if (error || !data) throw new Error(`Failed to create PaymentIntent: ${error?.message}`)
    return mapIntent(data as Record<string, unknown>)
  },

  /**
   * Processera ett PaymentIntent — hämtar PSP och skickar betalningen
   */
  async processIntent(intentId: string): Promise<PaymentIntent> {
    // Hämta intent
    const { data: intent, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single()

    if (error || !intent) throw new Error(`PaymentIntent ${intentId} not found`)
    if (intent.status !== 'CREATED') throw new Error(`PaymentIntent ${intentId} is ${intent.status as string}, expected CREATED`)

    // Välj PSP via intelligent router
    const routingDecision = await PSPRouter.route({
      orgId: intent.org_id as string,
      amountMinor: intent.amount_minor as number,
      currency: intent.currency as Currency,
      paymentId: intentId,
    })
    const psp = routingDecision.psp
    await PSPRouter.logDecision({
      orgId: intent.org_id as string,
      amountMinor: intent.amount_minor as number,
      currency: intent.currency as Currency,
      paymentId: intentId,
    }, routingDecision)

    if (routingDecision.requiresReview) {
      await supabase.rpc('transition_payment_intent', {
        p_id: intentId,
        p_to_status: 'FAILED',
        p_payload: { failure_reason: 'flagged_for_review' },
      })
      throw new Error('Payment flagged for manual review')
    }

    // → PROCESSING
    await supabase.rpc('transition_payment_intent', {
      p_id: intentId,
      p_to_status: 'PROCESSING',
      p_payload: { psp },
    })

    // Uppdatera PSP-fält
    await supabase.from('payment_intents').update({ psp }).eq('id', intentId)

    try {
      const idempKey = (intent.idempotency_key as string | null) ?? intentId

      if (psp === 'revolut') {
        const order = await createRevolutOrder(
          intent.amount_minor as number,
          intent.currency as Currency,
          intent.description as string,
          idempKey
        )

        // → AUTHORIZED
        const { data: updated } = await supabase.rpc('transition_payment_intent', {
          p_id: intentId,
          p_to_status: 'AUTHORIZED',
          p_payload: {
            psp_payment_id: order.id,
            psp_response: order,
          },
        })

        return mapIntent(updated as Record<string, unknown>)
      }

      if (psp === 'manual' || psp === 'internal') {
        // Manuell betalning — authorize direkt
        const { data: updated } = await supabase.rpc('transition_payment_intent', {
          p_id: intentId,
          p_to_status: 'AUTHORIZED',
          p_payload: { psp_payment_id: `manual-${intentId}` },
        })
        return mapIntent(updated as Record<string, unknown>)
      }

      throw new Error(`PSP ${psp} not implemented yet`)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase.rpc('transition_payment_intent', {
        p_id: intentId,
        p_to_status: 'FAILED',
        p_payload: { failure_reason: msg },
      })
      throw err
    }
  },

  /**
   * Capture en auktoriserad betalning + skapa ledger-post
   */
  async captureIntent(intentId: string): Promise<PaymentIntent> {
    const { data: intent } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single()

    if (!intent) throw new Error(`PaymentIntent ${intentId} not found`)

    // → CAPTURED
    const { data: captured } = await supabase.rpc('transition_payment_intent', {
      p_id: intentId,
      p_to_status: 'CAPTURED',
      p_payload: {},
    })

    // Skapa ledger-post (double-entry)
    try {
      const entryDate = new Date().toISOString().split('T')[0]
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          org_id: intent.org_id,
          entry_date: entryDate,
          description: `Payment: ${intent.description as string}`,
          reference: (intent.reference as string | null) ?? intentId,
          currency: intent.currency,
          account_number: (intent.from_account_code as string | null) ?? '5000',
          account_name: 'Payment',
          debit: intent.amount_minor,
          credit: 0,
          is_posted: true,
        })
        .select('id')
        .single()

      if (!journalError && journalData) {
        await supabase
          .from('payment_intents')
          .update({ ledger_journal_id: (journalData as { id: string }).id })
          .eq('id', intentId)
      }
    } catch (_ledgerErr) {
      // Ledger-fel blockerar inte capture — loggas separat
      console.error('Ledger post failed for intent', intentId)
    }

    return mapIntent(captured as Record<string, unknown>)
  },

  /**
   * Settle (slutför) en captured betalning
   */
  async settleIntent(intentId: string): Promise<PaymentIntent> {
    const { data } = await supabase.rpc('transition_payment_intent', {
      p_id: intentId,
      p_to_status: 'SETTLED',
      p_payload: {},
    })

    // Kö webhook
    const { data: intent } = await supabase
      .from('payment_intents')
      .select('org_id, amount_minor, currency, description')
      .eq('id', intentId)
      .single()

    if (intent) {
      await PaymentOrchestrator.queueWebhook(
        intent.org_id as string,
        intentId,
        'payment_succeeded',
        {
          payment_id: intentId,
          amount_minor: intent.amount_minor,
          currency: intent.currency,
        }
      )
    }

    return mapIntent(data as Record<string, unknown>)
  },

  /**
   * Kö en webhook för leverans
   */
  async queueWebhook(
    orgId: string,
    paymentId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    // Hämta webhook-endpoints för org (config-driven)
    const webhookUrl = process.env[`WEBHOOK_URL_${orgId.replace(/-/g, '_').toUpperCase()}`]
    if (!webhookUrl) return

    await supabase.from('webhook_deliveries').insert({
      org_id: orgId,
      payment_id: paymentId,
      event_type: eventType,
      endpoint_url: webhookUrl,
      payload: { event: eventType, data: payload, created_at: new Date().toISOString() },
      status: 'PENDING',
      next_attempt_at: new Date().toISOString(),
    })
  },

  /**
   * Hämta alla payment intents för en org
   */
  async listIntents(orgId: string, limit = 50): Promise<PaymentIntent[]> {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to list intents: ${error.message}`)
    return (data ?? []).map((row) => mapIntent(row as Record<string, unknown>))
  },

  /**
   * Hämta payment events (audit log) för ett intent
   */
  async getEvents(intentId: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('payment_events')
      .select('*')
      .eq('payment_id', intentId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Failed to get events: ${error.message}`)
    return data ?? []
  },

  /**
   * Hämta sammanfattning per org
   */
  async getSummary(orgId: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('v_payment_summary')
      .select('*')
      .eq('org_id', orgId)

    if (error) throw new Error(`Failed to get summary: ${error.message}`)
    return data ?? []
  },
}

// ── Mapper ─────────────────────────────────────────────────────────────────

function mapIntent(row: Record<string, unknown>): PaymentIntent {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    amountMinor: row.amount_minor as number,
    currency: row.currency as Currency,
    status: row.status as PaymentStatus,
    psp: row.psp as PSP | undefined,
    pspPaymentId: row.psp_payment_id as string | undefined,
    description: row.description as string,
    reference: row.reference as string | undefined,
    idempotencyKey: row.idempotency_key as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export default PaymentOrchestrator
