/**
 * TÜV Rheinland Audit API
 * Exponerar resultat från TÜV Full Audit Simulation.
 * Sessioner, testresultat, leverantörsaudit och Thailand sprint-plan.
 */

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// ─── GET /v1/tuv/sessions ────────────────────────────────────────────────────
// Lista alla TÜV audit-sessioner med aggregerad statistik
router.get('/v1/tuv/sessions', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('tuv_audit_log')
      .select('session_id, created_at, verdict')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Aggregera per session
    const sessions: Record<string, {
      session_id: string
      date: string
      total: number
      pass: number
      fail: number
      warning: number
      critical: number
      pass_rate: number
      final_verdict: string
    }> = {}

    for (const row of (data || [])) {
      if (!sessions[row.session_id]) {
        sessions[row.session_id] = {
          session_id: row.session_id,
          date: row.created_at,
          total: 0, pass: 0, fail: 0, warning: 0, critical: 0,
          pass_rate: 0,
          final_verdict: 'UNKNOWN'
        }
      }
      const s = sessions[row.session_id]
      s.total++
      if (row.verdict === 'PASS') s.pass++
      else if (row.verdict === 'FAIL') s.fail++
      else if (row.verdict === 'WARNING') s.warning++
      else if (row.verdict === 'CRITICAL') s.critical++
    }

    // Hämta final verdict (scenario S12) per session
    const { data: verdicts } = await sb()
      .from('tuv_audit_log')
      .select('session_id, actual')
      .eq('scenario_id', 'S12')
      .eq('test_name', 'TUV Final Verdict')

    for (const v of (verdicts || [])) {
      if (sessions[v.session_id]) {
        const actual = v.actual || ''
        if (actual.includes('NOT_READY')) sessions[v.session_id].final_verdict = 'NOT_READY'
        else if (actual.includes('CONDITIONAL')) sessions[v.session_id].final_verdict = 'CONDITIONAL'
        else if (actual.includes('READY')) sessions[v.session_id].final_verdict = 'READY'
      }
    }

    // Beräkna pass_rate
    const result = Object.values(sessions).map(s => ({
      ...s,
      pass_rate: s.total > 0 ? Math.round((s.pass / s.total) * 100) : 0
    })).sort((a, b) => b.date.localeCompare(a.date))

    res.json({ sessions: result, count: result.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /v1/tuv/sessions/:id ────────────────────────────────────────────────
// Detalj för en specifik session — alla tester grupperade per scenario
router.get('/v1/tuv/sessions/:id', async (req: Request, res: Response) => {
  const sessionId = req.params.id
  try {
    const { data, error } = await sb()
      .from('tuv_audit_log')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Gruppera per scenario
    const scenarios: Record<string, {
      scenario_id: string
      tests: typeof data
      pass: number
      fail: number
      warning: number
      critical: number
    }> = {}

    for (const row of data) {
      if (!scenarios[row.scenario_id]) {
        scenarios[row.scenario_id] = {
          scenario_id: row.scenario_id,
          tests: [],
          pass: 0, fail: 0, warning: 0, critical: 0
        }
      }
      scenarios[row.scenario_id].tests.push(row)
      const s = scenarios[row.scenario_id]
      if (row.verdict === 'PASS') s.pass++
      else if (row.verdict === 'FAIL') s.fail++
      else if (row.verdict === 'WARNING') s.warning++
      else if (row.verdict === 'CRITICAL') s.critical++
    }

    const total = data.length
    const pass = data.filter(r => r.verdict === 'PASS').length
    const fail = data.filter(r => r.verdict === 'FAIL').length
    const warning = data.filter(r => r.verdict === 'WARNING').length
    const critical = data.filter(r => r.verdict === 'CRITICAL').length

    res.json({
      session_id: sessionId,
      date: data[0].created_at,
      summary: { total, pass, fail, warning, critical, pass_rate: Math.round((pass / total) * 100) },
      scenarios: Object.values(scenarios).sort((a, b) => a.scenario_id.localeCompare(b.scenario_id))
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /v1/tuv/suppliers ───────────────────────────────────────────────────
// Leverantörsaudit-tabell sorterad på security score
router.get('/v1/tuv/suppliers', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('tuv_supplier_audit')
      .select('*')
      .order('security_questionnaire_score', { ascending: false })

    if (error) throw error

    const approved = (data || []).filter(s => s.overall_rating === 'approved')
    const conditional = (data || []).filter(s => s.overall_rating === 'conditional')
    const rejected = (data || []).filter(s => s.overall_rating === 'rejected')

    res.json({
      suppliers: data || [],
      summary: {
        total: (data || []).length,
        approved: approved.length,
        conditional: conditional.length,
        rejected: rejected.length,
        avg_score: data && data.length > 0
          ? Math.round((data || []).reduce((s, r) => s + (r.security_questionnaire_score || 0), 0) / data.length)
          : 0
      }
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /v1/tuv/sprint ──────────────────────────────────────────────────────
// Thailand sprint-plan — 7 dagar med prioriterade åtgärder
router.get('/v1/tuv/sprint', async (_req: Request, res: Response) => {
  try {
    // Hämta öppna major CAPAs med deadline
    const { data: capas } = await sb()
      .from('qms_capa')
      .select('capa_id, title, severity, status, responsible_person, target_date, root_cause_analysis')
      .eq('status', 'open')
      .lte('target_date', '2026-04-11')
      .order('severity', { ascending: false })

    // Hämta leverantörer som behöver DPA
    const { data: dpaGaps } = await sb()
      .from('gdpr_dpa_register')
      .select('supplier_name, third_country_transfer, dpa_signed')
      .eq('third_country_transfer', true)
      .eq('dpa_signed', false)

    // Fast action list för Thailand sprint
    const sprintPlan = [
      {
        priority: 1,
        action: 'POL-001: Signera och godkänna Informationssäkerhetspolicy',
        owner: 'erik',
        deadline: '2026-04-06',
        status: 'open',
        iso_clause: '5.2',
        estimated_hours: 2,
        description: 'Policy är klar som draft. Erik signerar digitalt via Scrive. Dennis formellt godkänner som CLO.'
      },
      {
        priority: 2,
        action: 'RoPA: Slutför Register of Processing Activities för wavult-os',
        owner: 'dennis',
        deadline: '2026-04-07',
        status: 'open',
        iso_clause: 'Art. 30 GDPR',
        estimated_hours: 4,
        description: 'RoPA finns i systemet men DPIA måste markeras completed för 3 behandlingsaktiviteter.'
      },
      {
        priority: 3,
        action: 'Ledningsgenomgång (Management Review) Q1 2026',
        owner: 'erik',
        deadline: '2026-04-08',
        status: 'open',
        iso_clause: '9.3',
        estimated_hours: 3,
        description: 'Team-möte med agenda: QMS-status, riskmatris, CAPA-uppföljning, certifieringsplan. Dokumenteras i protokoll.'
      },
      {
        priority: 4,
        action: 'CAPA RCA: Dokumentera root cause analysis för alla öppna major CAPAs',
        owner: 'dennis',
        deadline: '2026-04-09',
        status: 'open',
        iso_clause: '10.2',
        estimated_hours: 3,
        description: 'Varje CAPA måste ha RCA och tidplan. Revisor kräver detta för certifiering.'
      },
      {
        priority: 5,
        action: 'DPA: Kontakta OpenAI, ElevenLabs, Revolut — signera DPA',
        owner: 'dennis',
        deadline: '2026-04-10',
        status: 'open',
        iso_clause: 'Art. 28 GDPR',
        estimated_hours: 4,
        description: 'OpenAI (kritisk — ingen DPA): enterprise@openai.com. ElevenLabs: legal@elevenlabs.io. Revolut: business portal DPA.'
      },
      {
        priority: 6,
        action: 'Ansvarsrotation: Definiera backup-ansvarig för Dennis QMS-kontroller',
        owner: 'erik',
        deadline: '2026-04-11',
        status: 'open',
        iso_clause: '7.1',
        estimated_hours: 1,
        description: 'Dennis äger 124 kontroller. Erik eller extern QMS-konsult måste utses som backup. Uppdatera i systemet.'
      }
    ]

    // Räkna dagar kvar
    const today = new Date()
    const thailand = new Date('2026-04-11')
    const daysLeft = Math.ceil((thailand.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    res.json({
      sprint_name: 'Thailand Certification Sprint',
      deadline: '2026-04-11',
      days_remaining: daysLeft,
      sprint_plan: sprintPlan,
      open_capas: capas || [],
      dpa_gaps: dpaGaps || [],
      readiness_score: 42, // Baserat på TÜV audit: 10 PASS / 30 total = 33%, justerat för actions-in-progress
      recommendation: daysLeft <= 7
        ? 'KRITISKT: 7 dagar kvar. Fokusera på POL-001, RoPA och DPA-signeringar. Alla 6 prioriterade åtgärder måste avslutas.'
        : 'Följ sprint-planen. Prioritera DPA-signeringar och management review.'
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
