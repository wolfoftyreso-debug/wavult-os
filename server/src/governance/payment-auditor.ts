/**
 * Wavult Payment Auditor
 * Hittar stuck payments, validerar state machine integritet
 */

import { supabase } from '../supabase'
import type { AuditResult } from './ledger-auditor'

const STUCK_THRESHOLD_MINUTES = 30  // betalning stuck om den legat i PROCESSING > 30 min

export async function runPaymentAudit(orgId?: string): Promise<AuditResult> {
  const startedAt = Date.now()

  const { data: run } = await supabase
    .from('audit_runs')
    .insert({ agent_type: 'PAYMENT_AUDITOR', org_id: orgId ?? null, status: 'RUNNING' })
    .select('id').single()

  if (!run) throw new Error('Failed to create audit run')

  let issuesFound = 0
  let checksPassed = 0
  const issues: Array<{
    severity: string; category: string; title: string;
    description: string; affected_id?: string; affected_table?: string; suggested_fix?: string
  }> = []

  try {
    // CHECK 1: Stuck payments (PROCESSING > 30 min)
    const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60000).toISOString()
    const { data: stuckPayments } = await supabase
      .from('payment_intents')
      .select('id, org_id, amount_minor, currency, status, created_at, updated_at')
      .in('status', ['PROCESSING', 'CREATED'])
      .lt('updated_at', stuckThreshold)

    if (stuckPayments && stuckPayments.length > 0) {
      for (const payment of stuckPayments) {
        if (orgId && payment.org_id !== orgId) continue
        issuesFound++
        issues.push({
          severity: 'ERROR',
          category: 'stuck_payment',
          title: `Payment stuck in ${payment.status}`,
          description: `PaymentIntent ${payment.id}: ${payment.amount_minor} ${payment.currency}, stuck since ${payment.updated_at}`,
          affected_id: payment.id,
          affected_table: 'payment_intents',
          suggested_fix: 'Check PSP status and either retry or mark as FAILED',
        })
      }
    } else {
      checksPassed++
    }

    // CHECK 2: Payments utan PSP-koppling (AUTHORIZED men inget psp_payment_id)
    const { data: noPspId } = await supabase
      .from('payment_intents')
      .select('id, status')
      .in('status', ['AUTHORIZED', 'CAPTURED', 'SETTLED'])
      .is('psp_payment_id', null)
      .limit(50)

    if (noPspId && noPspId.length > 0) {
      issuesFound += noPspId.length
      issues.push({
        severity: 'WARNING',
        category: 'missing_psp_id',
        title: `${noPspId.length} authorized payments without PSP ID`,
        description: 'Payments authorized/captured without a PSP reference cannot be reconciled',
        affected_table: 'payment_intents',
        suggested_fix: 'Manually reconcile these payments against PSP dashboard',
      })
    } else {
      checksPassed++
    }

    // CHECK 3: CAPTURED payments utan ledger entry
    const { data: noLedger } = await supabase
      .from('payment_intents')
      .select('id, amount_minor, currency')
      .in('status', ['CAPTURED', 'SETTLED'])
      .is('ledger_journal_id', null)
      .limit(50)

    if (noLedger && noLedger.length > 0) {
      issuesFound += noLedger.length
      issues.push({
        severity: 'WARNING',
        category: 'missing_ledger_entry',
        title: `${noLedger.length} captured payments without ledger entry`,
        description: 'Captured payments should always generate a journal entry',
        affected_table: 'payment_intents',
        suggested_fix: 'Run ledger reconciliation to create missing journal entries',
      })
    } else {
      checksPassed++
    }

    const criticals = issues.filter(i => i.severity === 'CRITICAL').length
    const errors = issues.filter(i => i.severity === 'ERROR').length
    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      criticals > 0 ? 'CRITICAL' : errors > 0 ? 'HIGH' : issuesFound > 0 ? 'MEDIUM' : 'LOW'

    const summary = `Payment audit: ${checksPassed} checks passed, ${issuesFound} issues (${riskLevel})`

    if (issues.length > 0) {
      await supabase.from('audit_issues').insert(
        issues.map(i => ({ ...i, run_id: run.id, agent_type: 'PAYMENT_AUDITOR' }))
      )
    }

    await supabase.from('audit_runs').update({
      status: 'COMPLETED',
      issues_found: issuesFound,
      checks_passed: checksPassed,
      risk_level: riskLevel,
      summary,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      report: { issues, checks_passed: checksPassed },
    }).eq('id', run.id)

    return { runId: run.id, issuesFound, checksPassed, riskLevel, summary }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('audit_runs').update({
      status: 'FAILED', summary: `Audit failed: ${msg}`,
      completed_at: new Date().toISOString(), duration_ms: Date.now() - startedAt,
    }).eq('id', run.id)
    throw err
  }
}
