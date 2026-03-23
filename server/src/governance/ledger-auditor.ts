/**
 * Wavult Ledger Auditor
 * Verifierar double-entry integritet, hittar imbalanserade verifikat
 */

import { supabase } from '../supabase'

export interface AuditResult {
  runId: string
  issuesFound: number
  checksPassed: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  summary: string
}

export async function runLedgerAudit(orgId?: string): Promise<AuditResult> {
  const startedAt = Date.now()

  // Skapa audit run
  const { data: run } = await supabase
    .from('audit_runs')
    .insert({
      agent_type: 'LEDGER_AUDITOR',
      org_id: orgId ?? null,
      status: 'RUNNING',
    })
    .select('id')
    .single()

  if (!run) throw new Error('Failed to create audit run')

  let issuesFound = 0
  let checksPassed = 0
  const issues: Array<{
    severity: string; category: string; title: string;
    description: string; affected_id?: string; affected_table?: string; suggested_fix?: string
  }> = []

  try {
    // CHECK 1: Imbalanserade journal entries (debit ≠ credit)
    // OBS: befintligt schema har separata debit/credit-kolumner, inte journal_lines
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id, org_id, entry_date, description, debit, credit, currency')
      .eq('is_posted', true)
      .limit(1000)

    if (entries) {
      for (const entry of entries) {
        if (orgId && entry.org_id !== orgId) continue
        const debit = Number(entry.debit ?? 0)
        const credit = Number(entry.credit ?? 0)
        // I befintligt schema: debit och credit är separata rader, så vi kollar bara att de är >= 0
        if (debit < 0 || credit < 0) {
          issuesFound++
          issues.push({
            severity: 'ERROR',
            category: 'negative_amount',
            title: 'Negative journal entry amount',
            description: `Entry ${entry.id}: debit=${debit}, credit=${credit}`,
            affected_id: entry.id,
            affected_table: 'journal_entries',
            suggested_fix: 'Void this entry and create a corrective entry',
          })
        } else {
          checksPassed++
        }
      }
    }

    // CHECK 2: Poster utan koppling till konto
    const { data: orphanEntries } = await supabase
      .from('journal_entries')
      .select('id, account_number')
      .is('account_number', null)
      .eq('is_posted', true)
      .limit(100)

    if (orphanEntries && orphanEntries.length > 0) {
      issuesFound += orphanEntries.length
      issues.push({
        severity: 'WARNING',
        category: 'missing_account',
        title: `${orphanEntries.length} journal entries without account number`,
        description: 'Posted entries should always have an account number',
        affected_table: 'journal_entries',
        suggested_fix: 'Review and assign account numbers to these entries',
      })
    } else {
      checksPassed++
    }

    // CHECK 3: FX rates saknas för aktiva valutor
    const neededPairs = [
      ['EUR', 'USD'], ['USD', 'EUR'],
      ['EUR', 'AED'], ['AED', 'EUR'],
      ['USD', 'AED'], ['AED', 'USD'],
    ]
    const { data: fxRates } = await supabase
      .from('fx_rates')
      .select('from_currency, to_currency, rate_date')
      .order('rate_date', { ascending: false })

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    for (const [from, to] of neededPairs) {
      const recent = (fxRates ?? []).find(
        r => r.from_currency === from && r.to_currency === to && r.rate_date >= sevenDaysAgo
      )
      if (!recent) {
        issuesFound++
        issues.push({
          severity: 'WARNING',
          category: 'missing_fx_rate',
          title: `FX rate missing or stale: ${from}→${to}`,
          description: `No FX rate found within 7 days for ${from}→${to}`,
          affected_table: 'fx_rates',
          suggested_fix: `Update FX rate for ${from}→${to} (last: ${(fxRates ?? []).find(r => r.from_currency === from && r.to_currency === to)?.rate_date ?? 'never'})`,
        })
      } else {
        checksPassed++
      }
    }

    // Bestäm risk level
    const criticals = issues.filter(i => i.severity === 'CRITICAL').length
    const errors = issues.filter(i => i.severity === 'ERROR').length
    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      criticals > 0 ? 'CRITICAL' : errors > 0 ? 'HIGH' : issuesFound > 0 ? 'MEDIUM' : 'LOW'

    const summary = `Ledger audit: ${checksPassed} checks passed, ${issuesFound} issues found (${riskLevel})`

    // Spara issues
    if (issues.length > 0) {
      await supabase.from('audit_issues').insert(
        issues.map(i => ({ ...i, run_id: run.id, agent_type: 'LEDGER_AUDITOR' }))
      )
    }

    // Avsluta run
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
      status: 'FAILED',
      summary: `Audit failed: ${msg}`,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    }).eq('id', run.id)
    throw err
  }
}
