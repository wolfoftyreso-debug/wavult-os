/**
 * Wavult PSP Router v1
 * Intelligent payment routing inspirerad av Hyperswitch
 *
 * Routing-prioritet:
 * 1. Blocking rules (BLOCK, FLAG_FOR_REVIEW)
 * 2. Explicit routing rules (ROUTE_TO_PSP)
 * 3. Cost optimization (billigaste PSP)
 * 4. Availability check (circuit breaker)
 * 5. Default (Revolut)
 */

import { supabase } from './supabase'
import type { Currency } from './ledger'

// ── Types ──────────────────────────────────────────────────────────────────

export type PSP = 'revolut' | 'stripe' | 'adyen' | 'manual' | 'internal'
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface RoutingContext {
  orgId: string
  amountMinor: number
  currency: Currency
  paymentId?: string
  country?: string
  riskScore?: number
  metadata?: Record<string, unknown>
}

export interface RoutingDecision {
  psp: PSP
  fallbacks: PSP[]
  reason: string
  estimatedCostMinor: number
  requiresReview: boolean
  ruleId?: string
}

// ── Circuit Breaker ────────────────────────────────────────────────────────

const CIRCUIT_OPEN_THRESHOLD = 5      // öppna efter 5 failures i rad
const CIRCUIT_RESET_MS = 60_000       // försök half-open efter 60s

async function isCircuitOpen(psp: PSP, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('psp_availability')
    .select('circuit_state, circuit_opened_at, consecutive_failures')
    .eq('psp', psp)
    .eq('org_id', orgId)
    .single()

  if (!data) return false
  if (data.circuit_state === 'CLOSED') return false
  if (data.circuit_state === 'OPEN') {
    // Kolla om vi ska försöka HALF_OPEN
    const openedAt = new Date(data.circuit_opened_at as string).getTime()
    if (Date.now() - openedAt > CIRCUIT_RESET_MS) {
      await supabase.from('psp_availability').update({ circuit_state: 'HALF_OPEN' })
        .eq('psp', psp).eq('org_id', orgId)
      return false  // låt en request igenom
    }
    return true
  }
  return false  // HALF_OPEN = låt igenom
}

export async function recordPSPResult(
  psp: PSP,
  orgId: string,
  success: boolean,
  latencyMs: number,
  errorMessage?: string
): Promise<void> {
  const { data: current } = await supabase
    .from('psp_availability')
    .select('consecutive_failures, circuit_state')
    .eq('psp', psp)
    .eq('org_id', orgId)
    .single()

  const failures = success ? 0 : ((current?.consecutive_failures as number) ?? 0) + 1
  const newCircuit: CircuitState = failures >= CIRCUIT_OPEN_THRESHOLD ? 'OPEN'
    : (current?.circuit_state as string) === 'HALF_OPEN' && success ? 'CLOSED'
    : (current?.circuit_state as CircuitState) ?? 'CLOSED'

  await supabase.from('psp_availability').upsert({
    psp,
    org_id: orgId,
    is_healthy: success,
    consecutive_failures: failures,
    circuit_state: newCircuit,
    ...(newCircuit === 'OPEN' && (current?.circuit_state as string) !== 'OPEN'
      ? { circuit_opened_at: new Date().toISOString() }
      : {}),
    ...(success ? {} : { last_failure_at: new Date().toISOString(), failure_reason: errorMessage }),
    last_check_at: new Date().toISOString(),
    avg_latency_ms: latencyMs,
  }, { onConflict: 'psp,org_id' })
}

// ── Cost Calculator ────────────────────────────────────────────────────────

async function estimateCost(psp: PSP, currency: Currency, amountMinor: number): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_psp_cost', {
    p_psp: psp,
    p_currency: currency,
    p_amount_minor: amountMinor,
  })
  if (error || data == null) return 999999  // högt tal = undvik denna PSP
  return Number(data)
}

// ── Available PSPs ─────────────────────────────────────────────────────────

const ALL_PSPS: PSP[] = ['revolut', 'stripe']

async function getAvailablePSPs(orgId: string): Promise<PSP[]> {
  const available: PSP[] = []
  for (const psp of ALL_PSPS) {
    const open = await isCircuitOpen(psp, orgId)
    if (!open) available.push(psp)
  }
  return available.length > 0 ? available : ['manual']  // sista utväg
}

// ── PSP Router ─────────────────────────────────────────────────────────────

export const PSPRouter = {

  /**
   * Välj bästa PSP för en betalning
   */
  async route(ctx: RoutingContext): Promise<RoutingDecision> {

    // 1. Hämta aktiva regler för org (sorterade efter prioritet)
    const { data: rules } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('org_id', ctx.orgId)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    // 2. Kör regelmatchning
    for (const rule of rules ?? []) {
      const conditions = rule.conditions as Record<string, unknown>
      if (!matchesConditions(conditions, ctx)) continue

      if (rule.action === 'BLOCK') {
        throw new Error(`Payment blocked by rule: ${rule.name as string}`)
      }

      if (rule.action === 'FLAG_FOR_REVIEW') {
        return {
          psp: 'manual',
          fallbacks: [],
          reason: `flagged_for_review:${rule.name as string}`,
          estimatedCostMinor: 0,
          requiresReview: true,
          ruleId: rule.id as string,
        }
      }

      if (rule.action === 'ROUTE_TO_PSP' && rule.target_psp) {
        const psp = rule.target_psp as PSP
        const open = await isCircuitOpen(psp, ctx.orgId)
        if (!open) {
          const cost = await estimateCost(psp, ctx.currency, ctx.amountMinor)
          return {
            psp,
            fallbacks: [],
            reason: `rule_match:${rule.name as string}`,
            estimatedCostMinor: cost,
            requiresReview: false,
            ruleId: rule.id as string,
          }
        }
        // PSP är nere — fall through till nästa regel/cost-optimering
      }
    }

    // 3. Cost-optimerad routing
    const available = await getAvailablePSPs(ctx.orgId)
    if (available.length === 0) {
      throw new Error('No PSPs available — all circuits open')
    }

    // Beräkna kostnad för varje tillgänglig PSP
    const costs = await Promise.all(
      available.map(async (psp) => ({
        psp,
        cost: await estimateCost(psp, ctx.currency, ctx.amountMinor),
      }))
    )
    costs.sort((a, b) => a.cost - b.cost)

    const winner = costs[0]
    const fallbacks = costs.slice(1).map(c => c.psp)

    return {
      psp: winner.psp,
      fallbacks,
      reason: 'cost_optimized',
      estimatedCostMinor: winner.cost,
      requiresReview: false,
    }
  },

  /**
   * Logga ett routing-beslut
   */
  async logDecision(ctx: RoutingContext, decision: RoutingDecision): Promise<void> {
    await supabase.from('routing_decisions').insert({
      payment_id: ctx.paymentId,
      org_id: ctx.orgId,
      selected_psp: decision.psp,
      fallback_psps: decision.fallbacks,
      decision_reason: decision.reason,
      rule_id: decision.ruleId,
      estimated_cost_minor: decision.estimatedCostMinor,
    })
  },

  /**
   * Logga ett retry-försök
   */
  async logRetry(
    paymentId: string,
    attempt: number,
    psp: PSP,
    success: boolean,
    latencyMs: number,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    await supabase.from('psp_retry_log').insert({
      payment_id: paymentId,
      attempt_number: attempt,
      psp,
      success,
      error_code: errorCode,
      error_message: errorMessage,
      latency_ms: latencyMs,
    })
  },

  /**
   * Hämta PSP-kostnadsöversikt
   */
  async getCostComparison(currency: Currency, amountMinor: number): Promise<Array<{
    psp: PSP
    estimatedCostMinor: number
    percentageBp: number
    fixedMinor: number
  }>> {
    const { data } = await supabase
      .from('psp_costs')
      .select('psp, percentage_bp, fixed_minor')
      .eq('currency', currency)
      .order('percentage_bp', { ascending: true })

    return (data ?? []).map(row => ({
      psp: row.psp as PSP,
      estimatedCostMinor: Math.round(amountMinor * ((row.percentage_bp as number) / 10000) + (row.fixed_minor as number)),
      percentageBp: row.percentage_bp as number,
      fixedMinor: row.fixed_minor as number,
    }))
  },
}

// ── Condition matcher ──────────────────────────────────────────────────────

function matchesConditions(conditions: Record<string, unknown>, ctx: RoutingContext): boolean {
  if (conditions.currency && conditions.currency !== ctx.currency) return false
  if (conditions.amount_min_minor && ctx.amountMinor < Number(conditions.amount_min_minor)) return false
  if (conditions.amount_max_minor && ctx.amountMinor > Number(conditions.amount_max_minor)) return false
  if (conditions.country && conditions.country !== ctx.country) return false
  if (conditions.risk_score_min && (ctx.riskScore ?? 0) < Number(conditions.risk_score_min)) return false
  return true
}

export default PSPRouter
