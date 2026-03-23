/**
 * Wavult Billing — Lago Integration Service
 *
 * Hanterar:
 * - Usage events → Lago
 * - Kund-sync → Lago
 * - Webhook från Lago → vår Supabase + Ledger
 *
 * Lago API: http://localhost:3000/api/v1
 * Docs: https://doc.getlago.com/api-reference
 */

import { supabase } from './supabase'

const LAGO_BASE_URL = process.env.LAGO_API_URL ?? 'http://localhost:3000/api/v1'
const LAGO_API_KEY = process.env.LAGO_API_KEY ?? 'lago-wavult-dev-key'

// ── Types ──────────────────────────────────────────────────────────────────

export interface TrackUsageInput {
  orgId: string
  customerId: string        // external_id
  metricCode: string        // 'images_delivered', etc.
  quantity?: number
  properties?: Record<string, unknown>
  idempotencyKey?: string
  eventTimestamp?: Date
}

export interface CreateCustomerInput {
  orgId: string
  externalId: string
  name: string
  email?: string
  currency?: string
  billingEntity: 'OPTIC_INSIGHTS' | 'QUIXZOOM_ENTERPRISE' | 'DIRECT'
  planCode?: string
}

// ── Lago API client ────────────────────────────────────────────────────────

async function lagoRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${LAGO_BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${LAGO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Lago API ${method} ${path} → ${response.status}: ${err}`)
  }

  if (response.status === 204) return {} as T
  return response.json() as Promise<T>
}

// ── Billing Service ────────────────────────────────────────────────────────

export const BillingService = {

  /**
   * Spåra ett usage event
   * Buffras i Supabase, synkas till Lago i batch
   */
  async trackUsage(input: TrackUsageInput): Promise<{ eventId: string }> {
    const idempKey = input.idempotencyKey ?? `${input.customerId}-${input.metricCode}-${Date.now()}`

    // Spara lokalt
    const { data, error } = await supabase
      .from('usage_events')
      .insert({
        org_id: input.orgId,
        customer_id: input.customerId,
        metric_code: input.metricCode,
        quantity: input.quantity ?? 1,
        properties: input.properties ?? {},
        idempotency_key: idempKey,
        event_timestamp: (input.eventTimestamp ?? new Date()).toISOString(),
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(`Failed to buffer usage event: ${error?.message}`)

    // Försök synka till Lago direkt (fire & forget — batch-sync sker också)
    BillingService.syncEventToLago(
      data.id,
      input.customerId,
      input.metricCode,
      input.quantity ?? 1,
      idempKey,
      input.properties,
      input.eventTimestamp
    ).catch(() => {
      // Tyst fail — batch-sync hanterar det
    })

    return { eventId: data.id }
  },

  /**
   * Synka ett buffrat event till Lago
   */
  async syncEventToLago(
    eventId: string,
    customerId: string,
    metricCode: string,
    quantity: number,
    transactionId: string,
    properties?: Record<string, unknown>,
    timestamp?: Date
  ): Promise<void> {
    try {
      await lagoRequest('POST', '/events', {
        event: {
          transaction_id: transactionId,
          external_customer_id: customerId,
          code: metricCode,
          timestamp: Math.floor((timestamp ?? new Date()).getTime() / 1000),
          properties: {
            ...(properties ?? {}),
            quantity: String(quantity),
          },
        },
      })

      await supabase
        .from('usage_events')
        .update({
          lago_event_id: transactionId,
          lago_synced_at: new Date().toISOString(),
          lago_error: null,
        })
        .eq('id', eventId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase
        .from('usage_events')
        .update({ lago_error: msg })
        .eq('id', eventId)
      throw err
    }
  },

  /**
   * Synka alla osynkade events till Lago (batch-job)
   */
  async syncPendingEvents(): Promise<{ synced: number; failed: number }> {
    const { data: pending } = await supabase
      .from('usage_events')
      .select('*')
      .is('lago_synced_at', null)
      .is('lago_event_id', null)
      .limit(100)

    let synced = 0
    let failed = 0

    for (const event of pending ?? []) {
      try {
        await BillingService.syncEventToLago(
          event.id,
          event.customer_id,
          event.metric_code,
          event.quantity,
          event.idempotency_key ?? event.id,
          event.properties,
          new Date(event.event_timestamp)
        )
        synced++
      } catch {
        failed++
      }
    }

    return { synced, failed }
  },

  /**
   * Skapa/synka en kund till Lago
   */
  async createOrSyncCustomer(input: CreateCustomerInput): Promise<{ customerId: string }> {
    // Upsert i vår databas
    const { data: customer, error } = await supabase
      .from('billing_customers')
      .upsert({
        org_id: input.orgId,
        external_id: input.externalId,
        name: input.name,
        email: input.email,
        currency: input.currency ?? 'EUR',
        billing_entity: input.billingEntity,
        plan_code: input.planCode,
      }, { onConflict: 'org_id,external_id' })
      .select('id')
      .single()

    if (error || !customer) throw new Error(`Failed to upsert customer: ${error?.message}`)

    // Synka till Lago
    try {
      const lagoPayload: Record<string, unknown> = {
        customer: {
          external_id: input.externalId,
          name: input.name,
          email: input.email,
          currency: (input.currency ?? 'EUR').toUpperCase(),
        },
      }

      if (input.planCode) {
        Object.assign(lagoPayload.customer as Record<string, unknown>, {
          subscription: { plan_code: input.planCode },
        })
      }

      const lagoRes = await lagoRequest<{ customer: { lago_id: string } }>(
        'POST', '/customers', lagoPayload
      )

      await supabase
        .from('billing_customers')
        .update({
          lago_customer_id: lagoRes.customer?.lago_id,
          lago_synced_at: new Date().toISOString(),
        })
        .eq('id', customer.id)
    } catch {
      // Lago ej tillgänglig ännu (dev-setup) — fortsätt ändå
    }

    return { customerId: customer.id }
  },

  /**
   * Hämta current usage för en kund
   */
  async getCurrentUsage(externalCustomerId: string): Promise<unknown> {
    try {
      return await lagoRequest(
        'GET',
        `/customers/${externalCustomerId}/current_usage?external_subscription_id=current`
      )
    } catch {
      return { error: 'Lago not available' }
    }
  },

  /**
   * Webhook-handler: Lago → Supabase + Ledger
   */
  async handleLagoWebhook(webhookType: string, payload: Record<string, unknown>): Promise<void> {
    if (webhookType === 'invoice.created' || webhookType === 'invoice.finalized') {
      const invoice = payload.invoice as Record<string, unknown>
      if (!invoice) return

      const customerExtId = (invoice.customer as Record<string, unknown>)?.external_id as string
      const { data: customer } = await supabase
        .from('billing_customers')
        .select('id, org_id, currency')
        .eq('external_id', customerExtId)
        .single()

      if (!customer) return

      const amountMinor = Math.round(Number(invoice.amount_cents ?? 0))
      const taxMinor = Math.round(Number(invoice.taxes_amount_cents ?? 0))
      const totalMinor = Math.round(Number(invoice.total_amount_cents ?? 0))

      await supabase
        .from('invoices')
        .upsert({
          org_id: customer.org_id,
          customer_id: customer.id,
          lago_invoice_id: invoice.lago_id as string,
          invoice_number: invoice.number as string,
          status: webhookType === 'invoice.finalized' ? 'FINALIZED' : 'DRAFT',
          amount_minor: amountMinor,
          tax_minor: taxMinor,
          total_minor: totalMinor,
          currency: (invoice.currency as string) ?? customer.currency,
          issuing_date: invoice.issuing_date as string,
          payment_due_date: invoice.payment_due_date as string,
          lago_payload: payload,
        }, { onConflict: 'lago_invoice_id' })

      // Om finalized — skapa ledger-post
      if (webhookType === 'invoice.finalized' && totalMinor > 0) {
        await supabase.from('journal_entries').insert({
          org_id: customer.org_id,
          entry_date: invoice.issuing_date ?? new Date().toISOString().split('T')[0],
          description: `Invoice ${invoice.number as string}: ${customerExtId}`,
          reference: invoice.lago_id,
          currency: (invoice.currency as string) ?? customer.currency,
          account_number: '1100',
          account_name: 'Accounts Receivable',
          debit: totalMinor,
          credit: 0,
          is_posted: true,
        })
      }
    }
  },
}

export default BillingService
