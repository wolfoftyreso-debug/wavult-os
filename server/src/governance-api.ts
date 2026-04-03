import { Router } from 'express'
import { runFullGovernanceSweep, runLedgerAudit, runPaymentAudit, runSystemHealth } from './governance'
import { supabase, isSupabaseFallback } from './supabase'

const DB_UNAVAILABLE_WARNING = 'Database unavailable — results are incomplete. Do not use for compliance decisions.'

export const governanceRouter = Router()

// POST /api/governance/sweep — Kör full sweep
governanceRouter.post('/sweep', async (req, res) => {
  if (isSupabaseFallback()) {
    return res.status(503).json({ ok: false, error: DB_UNAVAILABLE_WARNING })
  }
  try {
    const { orgId } = req.body as { orgId?: string }
    const result = await runFullGovernanceSweep(orgId)
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// POST /api/governance/audit/ledger
governanceRouter.post('/audit/ledger', async (req, res) => {
  if (isSupabaseFallback()) {
    return res.status(503).json({ ok: false, error: DB_UNAVAILABLE_WARNING })
  }
  try {
    const { orgId } = req.body as { orgId?: string }
    const result = await runLedgerAudit(orgId)
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// POST /api/governance/audit/payments
governanceRouter.post('/audit/payments', async (req, res) => {
  if (isSupabaseFallback()) {
    return res.status(503).json({ ok: false, error: DB_UNAVAILABLE_WARNING })
  }
  try {
    const { orgId } = req.body as { orgId?: string }
    const result = await runPaymentAudit(orgId)
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// POST /api/governance/health — Kör system health check
governanceRouter.post('/health', async (_req, res) => {
  if (isSupabaseFallback()) {
    return res.status(503).json({ ok: false, error: DB_UNAVAILABLE_WARNING })
  }
  try {
    const result = await runSystemHealth()
    res.json({ ok: true, data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/governance/issues — Öppna issues
governanceRouter.get('/issues', async (req, res) => {
  try {
    const severity = req.query.severity as string | undefined
    let query = supabase
      .from('audit_issues')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(100)

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data } = await query
    res.json({ ok: true, data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/governance/runs — Senaste audit runs
governanceRouter.get('/runs', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 20)
    const { data } = await supabase
      .from('audit_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)
    res.json({ ok: true, data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/governance/metrics — Senaste system metrics
governanceRouter.get('/metrics', async (_req, res) => {
  try {
    const { data } = await supabase
      .from('system_metrics')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()
    res.json({ ok: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/governance/plan — Aktiv improvement plan
governanceRouter.get('/plan', async (_req, res) => {
  try {
    const { data } = await supabase
      .from('improvement_plans')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    res.json({ ok: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// GET /api/governance/health-score — Beräkna numerisk health score 0–100
governanceRouter.get('/health-score', async (req, res) => {
  try {
    // Hämta senaste metrics
    const { data: metrics } = await supabase
      .from('system_metrics')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    // Hämta öppna issues
    const { count: criticals } = await supabase
      .from('audit_issues')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'CRITICAL')
      .eq('is_resolved', false)

    const { count: errors } = await supabase
      .from('audit_issues')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'ERROR')
      .eq('is_resolved', false)

    const { count: warnings } = await supabase
      .from('audit_issues')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'WARNING')
      .eq('is_resolved', false)

    const score = Math.max(0, Math.min(100,
      100
      - (criticals ?? 0) * 20
      - (errors ?? 0) * 5
      - (warnings ?? 0) * 1
      - (metrics?.usage_events_unsynced ?? 0 > 50 ? 10 : 0)
    ))

    const trend = score >= 90 ? '↑ Excellent'
      : score >= 70 ? '→ Good'
      : score >= 50 ? '↓ Needs attention'
      : '⚠️ Critical'

    res.json({
      ok: true,
      data: {
        score,
        trend,
        breakdown: {
          critical_issues: criticals ?? 0,
          error_issues: errors ?? 0,
          warning_issues: warnings ?? 0,
          payment_success_rate: metrics?.payment_success_rate ?? null,
          unsynced_billing_events: metrics?.usage_events_unsynced ?? null,
        },
        captured_at: new Date().toISOString(),
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

// PATCH /api/governance/issues/:id/resolve — Markera issue som löst
governanceRouter.patch('/issues/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params
    const { data } = await supabase
      .from('audit_issues')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    res.json({ ok: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})
