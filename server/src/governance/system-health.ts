/**
 * Wavult System Health Monitor
 * Samlar metrics, genererar rapport, skapar improvement plan var 4:e körning
 */

import { supabase } from '../supabase'

export async function runSystemHealth(): Promise<{
  metrics: Record<string, number>
  riskLevel: string
  summary: string
  improvementPlanGenerated: boolean
}> {
  const since24h = new Date(Date.now() - 86400000).toISOString()

  // Samla metrics parallellt
  const [
    paymentsCreated,
    paymentsSettled,
    paymentsFailed,
    journalEntries,
    usageEvents,
    usageUnsynced,
    openIssues,
    criticalIssues,
  ] = await Promise.all([
    supabase.from('payment_intents').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase.from('payment_intents').select('*', { count: 'exact', head: true }).eq('status', 'SETTLED').gte('created_at', since24h),
    supabase.from('payment_intents').select('*', { count: 'exact', head: true }).eq('status', 'FAILED').gte('created_at', since24h),
    supabase.from('journal_entries').select('*', { count: 'exact', head: true }).eq('is_posted', true).gte('created_at', since24h),
    supabase.from('usage_events').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase.from('usage_events').select('*', { count: 'exact', head: true }).is('lago_synced_at', null),
    supabase.from('audit_issues').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
    supabase.from('audit_issues').select('*', { count: 'exact', head: true }).eq('severity', 'CRITICAL').eq('is_resolved', false),
  ])

  const created = paymentsCreated.count ?? 0
  const settled = paymentsSettled.count ?? 0
  const failed = paymentsFailed.count ?? 0
  const successRate = created > 0 ? Math.round((settled / created) * 100 * 100) / 100 : 100

  const metrics = {
    payments_created_24h: created,
    payments_settled_24h: settled,
    payments_failed_24h: failed,
    payment_success_rate: successRate,
    journal_entries_posted_24h: journalEntries.count ?? 0,
    usage_events_24h: usageEvents.count ?? 0,
    usage_events_unsynced: usageUnsynced.count ?? 0,
    open_issues: openIssues.count ?? 0,
    critical_issues: criticalIssues.count ?? 0,
  }

  // Spara metrics snapshot
  await supabase.from('system_metrics').insert(metrics)

  const riskLevel = (criticalIssues.count ?? 0) > 0 ? 'CRITICAL'
    : (openIssues.count ?? 0) > 10 ? 'HIGH'
    : failed > created * 0.1 ? 'HIGH'
    : 'LOW'

  const summary = `System health: ${successRate}% payment success rate, ${openIssues.count ?? 0} open issues`

  // Kolla om det är dags för improvement plan (var 4:e health-run)
  const { count: healthRuns } = await supabase
    .from('audit_runs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_type', 'SYSTEM_HEALTH')

  const shouldGeneratePlan = ((healthRuns ?? 0) % 4) === 0 && (healthRuns ?? 0) > 0

  let improvementPlanGenerated = false
  if (shouldGeneratePlan) {
    await generateImprovementPlan(metrics)
    improvementPlanGenerated = true
  }

  return { metrics, riskLevel, summary, improvementPlanGenerated }
}

async function generateImprovementPlan(metrics: Record<string, number>): Promise<void> {
  const items: Array<{
    rank: number
    root_cause: string
    fix: string
    expected_impact: string
    kpi: string
    deadline: string
    status: string
  }> = []
  let rank = 1

  // Prioritera baserat på metrics
  if ((metrics.critical_issues ?? 0) > 0) {
    items.push({
      rank: rank++,
      root_cause: 'Critical audit issues unresolved',
      fix: 'Review and resolve all CRITICAL audit_issues immediately',
      expected_impact: 'Eliminate highest-risk vulnerabilities',
      kpi: 'critical_issues = 0',
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'PENDING',
    })
  }

  if ((metrics.usage_events_unsynced ?? 0) > 50) {
    items.push({
      rank: rank++,
      root_cause: 'Large backlog of unsynced usage events',
      fix: 'Run BillingService.syncPendingEvents() and check Lago connectivity',
      expected_impact: 'Accurate billing, no revenue leakage',
      kpi: 'usage_events_unsynced < 10',
      deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      status: 'PENDING',
    })
  }

  if ((metrics.payment_success_rate ?? 100) < 95) {
    items.push({
      rank: rank++,
      root_cause: `Payment success rate below 95% (currently ${metrics.payment_success_rate}%)`,
      fix: 'Analyze failed payment_events, check PSP circuit breaker states, review routing rules',
      expected_impact: 'Increased revenue capture, better customer experience',
      kpi: 'payment_success_rate >= 98%',
      deadline: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      status: 'PENDING',
    })
  }

  // Standard förbättringar alltid med
  items.push(
    {
      rank: rank++,
      root_cause: 'FX rates may be stale',
      fix: 'Set up automated daily FX rate fetch from ECB/OpenExchangeRates',
      expected_impact: 'Accurate multi-currency reporting',
      kpi: 'All FX rates updated within 24h',
      deadline: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      status: 'PENDING',
    },
    {
      rank: rank++,
      root_cause: 'Lago may not be running in production',
      fix: 'Deploy Lago to production environment, configure webhooks',
      expected_impact: 'Automated usage-based billing for quiXzoom customers',
      kpi: 'Lago webhook delivery rate >= 99%',
      deadline: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      status: 'PENDING',
    }
  )

  const { data: recentRuns } = await supabase
    .from('audit_runs')
    .select('id')
    .order('started_at', { ascending: false })
    .limit(4)

  // Hämta nuvarande aktiv plan för att kunna superseda den
  const { data: activePlans } = await supabase
    .from('improvement_plans')
    .select('id')
    .eq('status', 'ACTIVE')

  // Skapa ny plan
  await supabase.from('improvement_plans').insert({
    based_on_runs: (recentRuns ?? []).map(r => r.id),
    items,
    summary: `Auto-generated improvement plan based on ${metrics.critical_issues ?? 0} critical issues and ${metrics.open_issues ?? 0} total open issues`,
    status: 'ACTIVE',
  })

  // Markera gamla planer som superseded
  if (activePlans && activePlans.length > 0) {
    const oldIds = activePlans.map(p => p.id)
    await supabase
      .from('improvement_plans')
      .update({ status: 'SUPERSEDED' })
      .in('id', oldIds)
  }
}
