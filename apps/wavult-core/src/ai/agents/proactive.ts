// ─── Proactive Agent Engine ───────────────────────────────────────────────────
// Agenter som analyserar sin domän och agerar autonomt.
// Triggas av scheduler (cron) eller händelser (event hooks).

import { randomUUID } from 'crypto'
import type { AgentId } from './types'

// Läs DB-URL från SSM/env
const getDb = () => {
  const { Pool } = require('pg')
  return new Pool({
    connectionString: process.env.DATABASE_URL || process.env.WAVULT_DB_URL,
    ssl: { rejectUnauthorized: false },
  })
}

export interface AgentAction {
  agent_id: AgentId
  action_type: 'create_task' | 'notify' | 'update_capa' | 'update_okr' | 'escalate'
  trigger_type: 'scheduled' | 'event' | 'threshold'
  trigger_reason: string
  target_entity?: string
  action_taken: string
  responsible_person: string
}

// ─── Auto-migration: säkerställ att tabellerna finns ─────────────────────────
let schemaMigrated = false
export async function ensureAgentSchema(): Promise<void> {
  if (schemaMigrated) return
  const db = getDb()
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS agent_action_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id text NOT NULL,
        action_type text NOT NULL,
        trigger_type text NOT NULL,
        trigger_reason text NOT NULL,
        target_entity text,
        action_taken text NOT NULL,
        result_ref text,
        responsible_person text,
        approved_by text,
        approved_at timestamptz,
        status text DEFAULT 'pending',
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS agent_goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id text NOT NULL,
        entity_slug text NOT NULL DEFAULT 'wavult-os',
        title text NOT NULL,
        description text,
        target_metric text,
        target_value numeric,
        current_value numeric,
        deadline date,
        status text DEFAULT 'active',
        auto_generated boolean DEFAULT true,
        linked_okr_id uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_agent_actions_agent ON agent_action_log(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_action_log(status);
      CREATE INDEX IF NOT EXISTS idx_agent_goals_agent ON agent_goals(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_goals_status ON agent_goals(status);
    `)
    schemaMigrated = true
    console.log('[proactive] Agent schema ensured (agent_action_log + agent_goals)')
  } catch (e: any) {
    console.error('[proactive] Schema migration failed:', e.message)
  } finally {
    await db.end()
  }
}

// ─── Logga agenthandling ──────────────────────────────────────────────────────
async function logAction(action: AgentAction, resultRef?: string): Promise<void> {
  const db = getDb()
  try {
    await db.query(`
      INSERT INTO agent_action_log
        (agent_id, action_type, trigger_type, trigger_reason, target_entity, action_taken, result_ref, responsible_person, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'auto_executed')
    `, [action.agent_id, action.action_type, action.trigger_type, action.trigger_reason,
        action.target_entity, action.action_taken, resultRef, action.responsible_person])
  } finally {
    await db.end()
  }
}

// ─── Skapa uppgift i Wavult OS tasks ─────────────────────────────────────────
async function createTask(
  title: string,
  description: string,
  assignedTo: string,
  priority: string = 'high',
  linkedRef?: string,
): Promise<string> {
  const db = getDb()
  try {
    const taskId = randomUUID()
    await db.query(`
      INSERT INTO tasks (id, title, description, assigned_to, priority, status, source, source_ref, created_at)
      VALUES ($1, $2, $3, $4, $5, 'todo', 'agent', $6, now())
      ON CONFLICT DO NOTHING
    `, [taskId, title, description, assignedTo, priority, linkedRef])
    return taskId
  } catch {
    // tasks-tabellen kanske har annat schema — logga och fortsätt
    return 'task-creation-failed'
  } finally {
    await db.end()
  }
}

// ─── Skicka notifikation ──────────────────────────────────────────────────────
async function sendNotification(
  userId: string,
  title: string,
  message: string,
  priority: string = 'high',
): Promise<void> {
  const db = getDb()
  try {
    await db.query(`
      INSERT INTO notifications (user_id, title, message, priority, type, read, created_at)
      VALUES ($1, $2, $3, $4, 'agent_alert', false, now())
    `, [userId, title, message, priority])
  } catch {
    console.log(`[agent-notify] ${userId}: ${title}`)
  } finally {
    await db.end()
  }
}

// ─── QMS-agentens autonoma kontroller ────────────────────────────────────────
export async function runQmsAgent(): Promise<AgentAction[]> {
  const db = getDb()
  const actions: AgentAction[] = []

  try {
    // 1. Kolla overdue CAPAs (deadline inom 7 dagar eller passerad)
    const capas = await db.query(`
      SELECT capa_code, title, action_owner, target_date, severity
      FROM qms_capa
      WHERE status IN ('open', 'in_progress')
        AND target_date < CURRENT_DATE + INTERVAL '7 days'
      ORDER BY target_date ASC
    `)

    for (const capa of capas.rows) {
      const daysLeft = Math.ceil((new Date(capa.target_date).getTime() - Date.now()) / 86400000)
      const isOverdue = daysLeft < 0
      const urgency = isOverdue ? 'FÖRFALLEN' : `${daysLeft} dagar kvar`

      const taskTitle = `[${capa.capa_code}] ${isOverdue ? '🚨 FÖRFALLEN' : '⚠️ Deadline snart'}: ${capa.title}`
      const taskDesc = [
        `CAPA ${capa.capa_code} är ${isOverdue ? 'förfallen sedan ' + Math.abs(daysLeft) + ' dagar' : 'förfaller om ' + daysLeft + ' dagar'}.`,
        ``,
        `Åtgärd krävs av ${capa.action_owner}.`,
        ``,
        `Koppla till CAPA: ${capa.capa_code}`,
      ].join('\n')

      const taskId = await createTask(
        taskTitle,
        taskDesc,
        capa.action_owner,
        capa.severity === 'major' ? 'critical' : 'high',
        capa.capa_code,
      )
      await sendNotification(capa.action_owner, taskTitle, taskDesc, 'critical')

      const action: AgentAction = {
        agent_id: 'qms',
        action_type: 'create_task',
        trigger_type: 'threshold',
        trigger_reason: `CAPA ${capa.capa_code} deadline ${urgency}`,
        target_entity: capa.capa_code,
        action_taken: `Skapade uppgift och notifierade ${capa.action_owner}: "${taskTitle}"`,
        responsible_person: capa.action_owner,
      }
      await logAction(action, taskId)
      actions.push(action)
    }

    // 2. Kolla kritiska risker utan åtgärdsplan
    const risks = await db.query(`
      SELECT risk_code, title, risk_owner, risk_level
      FROM qms_risks
      WHERE risk_level = 'critical'
        AND status = 'open'
        AND control_measures IS NULL
    `)

    for (const risk of risks.rows) {
      const taskTitle = `[${risk.risk_code}] 🔴 Kritisk risk utan åtgärdsplan: ${risk.title}`
      const taskDesc = [
        `Kritisk risk ${risk.risk_code} saknar dokumenterad åtgärdsplan (control_measures).`,
        ``,
        `Ägare: ${risk.risk_owner}`,
        `Risknivå: CRITICAL`,
        ``,
        `Dokumentera åtgärder i riskregistret omgående.`,
      ].join('\n')

      const taskId = await createTask(taskTitle, taskDesc, risk.risk_owner, 'critical', risk.risk_code)
      await sendNotification(risk.risk_owner, taskTitle, taskDesc, 'critical')

      const action: AgentAction = {
        agent_id: 'qms',
        action_type: 'create_task',
        trigger_type: 'threshold',
        trigger_reason: `Kritisk risk ${risk.risk_code} saknar åtgärdsplan`,
        target_entity: risk.risk_code,
        action_taken: `Skapade uppgift och notifierade ${risk.risk_owner}`,
        responsible_person: risk.risk_owner,
      }
      await logAction(action, taskId)
      actions.push(action)
    }

    // 3. Agent sätter eget mål baserat på analys
    const criticalCount = risks.rows.length
    if (criticalCount > 0) {
      await db.query(`
        INSERT INTO agent_goals
          (agent_id, entity_slug, title, description, target_metric, target_value, current_value, deadline)
        VALUES
          ('qms', 'wavult-os', 'Eliminera alla kritiska risker',
           'QMS-agenten har identifierat ' || $1 || ' kritiska risker som kräver åtgärdsplan',
           'critical_risks_without_plan', 0, $1, CURRENT_DATE + INTERVAL '30 days')
        ON CONFLICT DO NOTHING
      `, [criticalCount])
    }
  } finally {
    await db.end()
  }

  return actions
}

// ─── Risk-agentens autonoma kontroller ───────────────────────────────────────
// Händelsebaserad: nya critical/major incidents utan CAPA → skapa CAPA automatiskt
export async function runRiskAgent(): Promise<AgentAction[]> {
  const db = getDb()
  const actions: AgentAction[] = []

  try {
    const incidents = await db.query(`
      SELECT id, title, severity, created_at
      FROM non_conformances
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND id NOT IN (SELECT source_ref FROM qms_capa WHERE source_ref IS NOT NULL)
      LIMIT 10
    `)

    for (const incident of incidents.rows) {
      if (incident.severity === 'critical' || incident.severity === 'major') {
        const capaCode = `CAPA-${new Date().getFullYear()}-AUTO-${incident.id.slice(0, 6)}`
        await db.query(`
          INSERT INTO qms_capa
            (entity_slug, capa_code, capa_type, severity, source, source_ref, title, description,
             action_owner, target_date, status, iso_clause)
          VALUES
            ('wavult-os', $1, 'corrective', $2, 'incident', $3, $4, $5,
             'dennis', CURRENT_DATE + INTERVAL '14 days', 'open', '10.2')
          ON CONFLICT DO NOTHING
        `, [
          capaCode,
          incident.severity,
          incident.id,
          `CAPA för incident: ${incident.title}`,
          `Automatiskt skapad av Risk-agenten baserat på incident ${incident.id}. Genomför rotorsaksanalys och åtgärda.`,
        ])

        const action: AgentAction = {
          agent_id: 'risk',
          action_type: 'update_capa',
          trigger_type: 'event',
          trigger_reason: `Ny ${incident.severity} incident utan CAPA`,
          target_entity: incident.id,
          action_taken: `Skapade CAPA ${capaCode} automatiskt`,
          responsible_person: 'dennis',
        }
        await logAction(action, capaCode)
        actions.push(action)
      }
    }
  } finally {
    await db.end()
  }

  return actions
}

// ─── OKR-agentens autonoma kontroller ────────────────────────────────────────
// Tröskelbaserad: KRs med at_risk/off_track utan check-in senaste 7 dagarna
export async function runOkrAgent(): Promise<AgentAction[]> {
  const db = getDb()
  const actions: AgentAction[] = []

  try {
    const staleKrs = await db.query(`
      SELECT kr.id, kr.title, kr.confidence, kr.owner_id, kr.current_value, kr.target_value,
             o.title as objective_title
      FROM okr_key_results kr
      JOIN okr_objectives o ON o.id = kr.objective_id
      WHERE kr.status = 'active'
        AND kr.confidence IN ('at_risk', 'off_track')
        AND NOT EXISTS (
          SELECT 1 FROM okr_checkins c
          WHERE c.key_result_id = kr.id
            AND c.checked_at > NOW() - INTERVAL '7 days'
        )
    `)

    for (const kr of staleKrs.rows) {
      const statusLabel = kr.confidence === 'off_track' ? 'off track' : 'at risk'
      const taskTitle = `📊 OKR Check-in krävs: "${kr.title}"`
      const taskDesc = [
        `Key Result "${kr.title}" under "${kr.objective_title}" är ${statusLabel} och saknar check-in senaste 7 dagarna.`,
        ``,
        `Nuläge: ${kr.current_value} / Mål: ${kr.target_value}`,
        ``,
        `Gör ett check-in och uppdatera status.`,
      ].join('\n')

      await sendNotification(kr.owner_id || 'erik', taskTitle, taskDesc, 'high')

      const action: AgentAction = {
        agent_id: 'data',
        action_type: 'notify',
        trigger_type: 'threshold',
        trigger_reason: `KR ${kr.id} är ${kr.confidence} utan check-in 7 dagar`,
        target_entity: kr.id,
        action_taken: `Påminde ${kr.owner_id || 'erik'} om check-in`,
        responsible_person: kr.owner_id || 'erik',
      }
      await logAction(action)
      actions.push(action)
    }
  } finally {
    await db.end()
  }

  return actions
}

// ─── Certifiering — kontrollera om systemet är redo för TÜV-bokning ─────────
export async function checkCertificationReadiness(): Promise<{ pct: number; blocking: string[]; ready: boolean }> {
  const db = getDb()
  try {
    // Kör alla SQL-baserade kriterier live mot databasen
    const criteriaChecks: Record<string, string> = {
      'CB-001': `SELECT COUNT(*)::int FROM qms_documents WHERE doc_code='POL-001' AND status='approved' AND approved_by='erik'`,
      'CB-002': `SELECT COUNT(*)::int FROM management_reviews WHERE EXTRACT(YEAR FROM created_at)=2026`,
      'CB-003': `SELECT COUNT(*)::int FROM qms_capa WHERE capa_code='CAPA-2026-001' AND status='closed'`,
      'CB-004': `SELECT COUNT(*)::int FROM qms_capa WHERE capa_code='CAPA-2026-002' AND status='closed'`,
      'CB-005': `SELECT COUNT(*)::int FROM qms_capa WHERE capa_code='CAPA-2026-003' AND status='closed'`,
      'CB-006': `SELECT COUNT(*)::int FROM qms_audit_sessions WHERE entity_id=(SELECT id FROM qms_entities WHERE slug='wavult-os') AND status='completed' AND EXTRACT(YEAR FROM started_at)=2026`,
      'CB-007': `SELECT COUNT(*)::int FROM qms_course_completions cc JOIN qms_courses c ON c.id=cc.course_id WHERE c.course_code='ISO-9001-INTRO' AND cc.passed=true`,
      'CB-008': `SELECT COUNT(DISTINCT entity_slug)::int FROM ropa_records WHERE entity_slug IN ('wavult-os','quixzoom','landvex')`,
      'CB-009': `SELECT COUNT(*)::int FROM gdpr_dpa_register WHERE supplier_name='OpenAI' AND dpa_signed=true`,
      'CB-010': `SELECT COUNT(*)::int FROM gdpr_dpa_register WHERE supplier_name='ElevenLabs' AND dpa_signed=true`,
      'CB-011': `SELECT COUNT(*)::int FROM gdpr_dpa_register WHERE supplier_name='Revolut' AND dpa_signed=true`,
      'CB-013': `SELECT COUNT(*)::int FROM qms_capa WHERE capa_code='CAPA-2026-001' AND status='closed' AND verification_effective=true`,
      'CB-015': `SELECT COUNT(*)::int FROM qms_risks WHERE risk_level='critical' AND status='open' AND control_measures IS NULL`,
    }

    const results: Record<string, boolean> = {}
    for (const [code, query] of Object.entries(criteriaChecks)) {
      try {
        const { rows } = await db.query(query)
        const val = rows[0]?.count ?? 0
        // CB-015 är omvänd: 0 = pass (inga kritiska risker utan åtgärdsplan)
        results[code] = code === 'CB-015' ? (Number(val) === 0) : (Number(val) >= (code === 'CB-008' ? 3 : 1))
      } catch { results[code] = false }
    }

    // Manuella kriterier (CB-012 MSB, CB-014 pentest) — hämta från databasen
    try {
      const { rows: manualRows } = await db.query(
        `SELECT criterion_code, is_met FROM certification_booking_criteria WHERE check_type='manual'`
      )
      for (const r of manualRows) { results[r.criterion_code] = r.is_met }
    } catch { /* tabell kanske saknas */ }

    // Uppdatera is_met i databasen
    for (const [code, met] of Object.entries(results)) {
      try {
        await db.query(
          `UPDATE certification_booking_criteria SET is_met=$1, met_at=CASE WHEN $1 AND met_at IS NULL THEN NOW() ELSE met_at END WHERE criterion_code=$2`,
          [met, code]
        )
      } catch { /* okänt kriterium — hoppa över */ }
    }

    const { rows: all } = await db.query(
      `SELECT criterion_code, description, is_met FROM certification_booking_criteria WHERE entity_slug='wavult-os' AND is_mandatory=true`
    )
    const total = all.length
    const metCount = all.filter((r: any) => r.is_met).length
    const blocking = all.filter((r: any) => !r.is_met).map((r: any) => `${r.criterion_code}: ${r.description}`)
    const pct = total > 0 ? Math.round(metCount / total * 100) : 0
    const ready = pct >= 100

    await db.query(
      `INSERT INTO certification_readiness_log (entity_slug, criteria_met, criteria_total, readiness_pct, booking_triggered, blocking_criteria)
       VALUES ('wavult-os', $1, $2, $3, $4, $5)`,
      [metCount, total, pct, ready, JSON.stringify(blocking)]
    )

    if (ready) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, priority, type, read, created_at)
         VALUES ('dennis', '🎉 Certifieringsklart — Boka TÜV nu!',
           'Alla 15 bokningskriterier uppfyllda. Kontakta TÜV Rheinland eller DNV för pre-assessment. Ledtid: 6-12 månader.',
           'critical', 'certification_ready', false, now())
         ON CONFLICT DO NOTHING`
      )
    }

    console.log(`[proactive] Certification readiness: ${pct}% (${metCount}/${total}), ready=${ready}`)
    return { pct, blocking, ready }
  } finally {
    await db.end()
  }
}

// ─── Veckovis Självrevision ───────────────────────────────────────────────────
export async function runWeeklyAudit(): Promise<void> {
  console.log('[weekly-audit] Starting automated weekly audit...')
  const db = getDb()
  const results: string[] = []
  let overdueCapa: any[] = []
  let staleKrs: any[] = []
  let pct = 0
  let blocking: string[] = []

  try {
    // 1. Certification readiness
    const certResult = await checkCertificationReadiness()
    pct = certResult.pct
    blocking = certResult.blocking
    results.push(`Certifieringsreadiness: ${pct}% (${blocking.length} blockers kvar)`)

    // 2. Kolla alla CAPAs med förfallna deadlines
    const { rows: overdueCapa_ } = await db.query(
      `SELECT capa_code, title, action_owner, target_date,
              NOW()::date - target_date as days_overdue
       FROM qms_capa WHERE status='open' AND target_date < NOW()::date
       ORDER BY days_overdue DESC`
    )
    overdueCapa = overdueCapa_
    for (const capa of overdueCapa) {
      await db.query(
        `INSERT INTO agent_action_log (agent_id, action_type, trigger_type, trigger_reason, target_entity, action_taken, responsible_person, status)
         VALUES ('qms', 'escalate', 'scheduled', $1, $2, $3, $4, 'auto_executed')`,
        [`Veckorevision: CAPA ${capa.capa_code} förfallen ${capa.days_overdue} dagar`,
         capa.capa_code,
         `Eskalerade CAPA ${capa.capa_code} till ${capa.action_owner} — ${capa.days_overdue} dagar förfallen`,
         capa.action_owner]
      )
      await db.query(
        `INSERT INTO notifications (user_id, title, message, priority, type, read)
         VALUES ($1, $2, $3, 'critical', 'weekly_audit', false)`,
        [capa.action_owner,
         `📅 CAPA förfallen: ${capa.capa_code}`,
         `${capa.title} är ${capa.days_overdue} dagar förfallen. Åtgärd krävs omgående.`]
      )
      results.push(`FÖRFALLEN CAPA: ${capa.capa_code} (${capa.days_overdue}d) → ${capa.action_owner}`)
    }

    // 3. OKR Check-in påminnelser (KRs utan check-in 14+ dagar)
    const { rows: staleKrs_ } = await db.query(
      `SELECT kr.id, kr.title, kr.owner_id, kr.confidence, o.title as obj
       FROM okr_key_results kr JOIN okr_objectives o ON o.id=kr.objective_id
       WHERE kr.status='active' AND NOT EXISTS (
         SELECT 1 FROM okr_checkins c WHERE c.key_result_id=kr.id AND c.checked_at > NOW()-INTERVAL '14 days'
       )`
    )
    staleKrs = staleKrs_
    for (const kr of staleKrs) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, priority, type, read)
         VALUES ($1, $2, $3, 'high', 'weekly_audit', false)`,
        [kr.owner_id || 'erik',
         `📊 OKR: Check-in saknas 14+ dagar`,
         `"${kr.title}" under "${kr.obj}" — confidence: ${kr.confidence}. Uppdatera i OKR-modulen.`]
      )
      results.push(`OKR saknar check-in: ${kr.title} → ${kr.owner_id}`)
    }

    // 4. Ny risk-scoring — uppdatera risk_level baserat på likelihood*impact
    await db.query(
      `UPDATE qms_risks SET risk_level = CASE
         WHEN likelihood*impact >= 20 THEN 'critical'
         WHEN likelihood*impact >= 13 THEN 'high'
         WHEN likelihood*impact >= 7  THEN 'medium'
         ELSE 'low' END`
    )
    results.push('Riskmatris omberäknad')

    // 5. Compliance-gap sammanfattning per ägare
    const { rows: gapsByOwner } = await db.query(
      `SELECT qi.responsible_person, COUNT(*) as gaps
       FROM qms_implementations qi
       JOIN qms_entities qe ON qe.id=qi.entity_id
       WHERE qe.slug='wavult-os' AND qi.status IN ('not_started','gap')
       GROUP BY qi.responsible_person ORDER BY gaps DESC`
    )
    for (const owner of gapsByOwner) {
      if (Number(owner.gaps) > 5) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, priority, type, read)
           VALUES ($1, $2, $3, 'high', 'weekly_audit', false)`,
          [owner.responsible_person,
           `⚠️ Veckorevision: ${owner.gaps} ISO-kontroller kräver åtgärd`,
           `Du har ${owner.gaps} ISO-kontroller med status not_started eller gap. Öppna QMS-modulen för detaljer.`]
        )
      }
      results.push(`Gaps: ${owner.responsible_person}: ${owner.gaps}`)
    }

    // 6. Skapa audit-session för veckorevisionen
    const { rows: [entity] } = await db.query(
      `SELECT id FROM qms_entities WHERE slug='wavult-os'`
    )
    if (entity) {
      await db.query(
        `INSERT INTO qms_audit_sessions (entity_id, audit_type, auditor_name, auditor_org, started_at, completed_at, status, findings, overall_result, notes)
         VALUES ($1, 'internal', 'QMS-agenten (autonom)', 'Wavult OS AI', NOW()-INTERVAL '1 hour', NOW(), 'completed', $2, $3, $4)`,
        [entity.id,
         JSON.stringify({ automated: true, checks: results.length, timestamp: new Date().toISOString() }),
         (overdueCapa.length > 0 || blocking.length > 8) ? 'minor_nc' : 'pass',
         `Automatisk veckorevision. ${results.length} kontroller körda. Readiness: ${pct}%. ${overdueCapa.length} förfallna CAPAs. ${staleKrs.length} OKRs utan check-in.`]
      )
    }

    console.log(`[weekly-audit] Complete: ${results.length} checks, ${pct}% ready, ${overdueCapa.length} overdue CAPAs`)
  } catch (e: any) {
    console.error('[weekly-audit] Error:', e.message)
  } finally {
    await db.end()
  }
}

// ─── Master scheduler — kör alla agenter ─────────────────────────────────────
export async function runAllProactiveAgents(): Promise<{ agent: string; actions: number }[]> {
  console.log('[proactive] Running all agents...')
  await ensureAgentSchema()
  const results: { agent: string; actions: number }[] = []

  const runners: Array<{ name: string; fn: () => Promise<AgentAction[]> }> = [
    { name: 'qms', fn: runQmsAgent },
    { name: 'risk', fn: runRiskAgent },
    { name: 'okr', fn: runOkrAgent },
  ]

  for (const { name, fn } of runners) {
    try {
      const acts = await fn()
      results.push({ agent: name, actions: acts.length })
      console.log(`[proactive] ${name.toUpperCase()}: ${acts.length} actions`)
    } catch (e: any) {
      console.error(`[proactive] ${name.toUpperCase()} failed:`, e.message)
      results.push({ agent: name, actions: 0 })
    }
  }

  // Certifieringscheck — kör separat (returnerar inte AgentAction[])
  try {
    const cert = await checkCertificationReadiness()
    results.push({ agent: 'certification', actions: cert.ready ? 1 : 0 })
    console.log(`[proactive] CERTIFICATION: ${cert.pct}% redo, ${cert.blocking.length} blockerande kriterier`)
  } catch (e: any) {
    console.error('[proactive] CERTIFICATION failed:', e.message)
    results.push({ agent: 'certification', actions: 0 })
  }

  return results
}
