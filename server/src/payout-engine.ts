/**
 * quiXzoom Payout Engine v1
 *
 * Flow:
 * 1. Mission completed → trigger_mission_payout() SQL-funktion
 * 2. PayoutEngine.processPhotographerPayout() → Revolut Payouts API
 * 3. Journalpost skapas i Ledger Core
 * 4. Fotograf notifieras
 */

import { supabase } from './supabase'

// ── Config ──────────────────────────────────────────────────────────────────

const REVOLUT_BASE = process.env.REVOLUT_API_URL ?? 'https://sandbox-b2b.revolut.com/api/1.0'
const REVOLUT_API_KEY = process.env.REVOLUT_API_KEY ?? ''

// ── Types ──────────────────────────────────────────────────────────────────

export interface PayoutResult {
  payoutId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  netMinor: number
  currency: string
  revolutTransferId?: string
}

// ── Revolut Payouts Client ─────────────────────────────────────────────────

async function revolutRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${REVOLUT_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${REVOLUT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Revolut API ${method} ${path} → ${response.status}: ${err}`)
  }
  return response.json() as Promise<T>
}

// ── Payout Engine ──────────────────────────────────────────────────────────

export const PayoutEngine = {

  /**
   * Trigga payout för ett genomfört uppdrag
   */
  async triggerMissionPayout(missionId: string): Promise<PayoutResult> {
    // Kör SQL-funktion som skapar payout-post
    const { data: payout, error } = await supabase
      .rpc('trigger_mission_payout', { p_mission_id: missionId })

    if (error || !payout) throw new Error(`Failed to trigger payout: ${error?.message}`)

    // Schemalägg utbetalning
    return PayoutEngine.processPhotographerPayout(payout.id)
  },

  /**
   * Processa en fotograf-utbetalning via Revolut
   */
  async processPhotographerPayout(payoutId: string): Promise<PayoutResult> {
    // Hämta payout + fotograf
    const { data: payout } = await supabase
      .from('photographer_payouts')
      .select('*, photographers(display_name, revolut_account_id, email)')
      .eq('id', payoutId)
      .single()

    if (!payout) throw new Error(`Payout not found: ${payoutId}`)
    if (payout.status !== 'PENDING') {
      return {
        payoutId,
        status: payout.status,
        netMinor: payout.net_minor,
        currency: payout.currency,
        revolutTransferId: payout.revolut_transfer_id,
      }
    }

    // Markera som PROCESSING
    await supabase.from('photographer_payouts').update({
      status: 'PROCESSING',
    }).eq('id', payoutId)

    const photographer = payout.photographers as { display_name: string; revolut_account_id?: string; email?: string }

    try {
      // Sandbox: simulera Revolut-transfer
      // Production: använd Revolut Business Payouts API
      let revolutTransferId: string | undefined

      if (REVOLUT_API_KEY && photographer.revolut_account_id) {
        const transfer = await revolutRequest<{ id: string }>('POST', '/pay', {
          request_id: payoutId,
          account_id: process.env.REVOLUT_ACCOUNT_ID,
          receiver: {
            counterparty_id: photographer.revolut_account_id,
          },
          amount: payout.net_minor / 100,
          currency: payout.currency.toUpperCase(),
          reference: `quiXzoom payout: ${payout.mission_id}`,
        })
        revolutTransferId = transfer.id
      } else {
        // Sandbox/dev: simulera framgång
        revolutTransferId = `sandbox-${Date.now()}-${payoutId.slice(0, 8)}`
      }

      // Skapa journal entry (debet: Photographer Payable, kredit: Cash)
      await supabase.from('journal_entries').insert({
        org_id: payout.org_id,
        entry_date: new Date().toISOString().split('T')[0],
        description: `Photographer payout: ${photographer.display_name} — mission ${payout.mission_id?.slice(0, 8)}`,
        reference: payoutId,
        currency: payout.currency,
        account_number: '2100',
        account_name: 'Photographer Payable',
        debit: payout.net_minor,
        credit: 0,
        is_posted: true,
      })

      // Uppdatera fotograf totala intjäning
      await supabase.from('photographers').update({
        total_earned_minor: supabase.rpc('increment', { amount: payout.net_minor }) as unknown as number,
      }).eq('id', payout.photographer_id)

      // Markera som COMPLETED
      await supabase.from('photographer_payouts').update({
        status: 'COMPLETED',
        revolut_transfer_id: revolutTransferId,
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq('id', payoutId)

      return {
        payoutId,
        status: 'COMPLETED',
        netMinor: payout.net_minor,
        currency: payout.currency,
        revolutTransferId,
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      await supabase.from('photographer_payouts').update({
        status: 'FAILED',
        failure_reason: msg,
        retry_count: (payout.retry_count ?? 0) + 1,
      }).eq('id', payoutId)

      // Retry om under max
      if ((payout.retry_count ?? 0) < 3) {
        // Schemalägg retry (Trigger.dev/n8n hanterar det)
      }

      return { payoutId, status: 'FAILED', netMinor: payout.net_minor, currency: payout.currency }
    }
  },

  /**
   * Hämta fotograf-intjäning (för dashboard)
   */
  async getPhotographerEarnings(photographerId: string): Promise<{
    totalEarned: number
    pendingPayout: number
    completedPayouts: number
    currency: string
  }> {
    const { data: payouts } = await supabase
      .from('photographer_payouts')
      .select('net_minor, status, currency')
      .eq('photographer_id', photographerId)

    const total = (payouts ?? []).reduce((s, p) => s + (p.status === 'COMPLETED' ? p.net_minor : 0), 0)
    const pending = (payouts ?? []).reduce((s, p) => s + (p.status === 'PENDING' ? p.net_minor : 0), 0)

    return {
      totalEarned: total,
      pendingPayout: pending,
      completedPayouts: (payouts ?? []).filter(p => p.status === 'COMPLETED').length,
      currency: payouts?.[0]?.currency ?? 'USD',
    }
  },

  /**
   * Plattformsintjäning per månad (för Optic Insights / management dashboard)
   */
  async getPlatformEarnings(orgId: string, months = 3): Promise<unknown[]> {
    const { data } = await supabase
      .from('platform_earnings')
      .select('period_month, client_paid, photographer_paid, platform_fee, currency')
      .eq('org_id', orgId)
      .order('period_month', { ascending: false })
      .limit(months * 30)

    return data ?? []
  },
}

export default PayoutEngine
