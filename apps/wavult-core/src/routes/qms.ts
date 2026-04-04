/**
 * QMS — Quality Management System API
 * ISO 9001:2015 / ISO 27001:2022 / GDPR / NIS2 compliance tracking.
 *
 * Koncept: ISO-krav = frågebank. Svaret på varje fråga är en direkt länkning
 * till en systemfunktion i Wavult OS. En revisor öppnar systemet, ställer en
 * fråga — systemet visar exakt hur kravet uppfylls, vilken kod/databas/infra
 * som bevisar det, och realtidsstatus.
 */

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// ─── Health check helper ──────────────────────────────────────────────────────
async function checkUrl(url: string, type: string): Promise<'healthy' | 'degraded' | 'failing'> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve('failing'), 5000)
    try {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, (res) => {
        clearTimeout(timeout)
        if (res.statusCode && res.statusCode < 400) resolve('healthy')
        else if (res.statusCode && res.statusCode < 500) resolve('degraded')
        else resolve('failing')
        res.resume()
      })
      req.on('error', () => { clearTimeout(timeout); resolve('failing') })
    } catch {
      clearTimeout(timeout)
      resolve('failing')
    }
  })
}

// ─── GET /v1/qms/entities ─────────────────────────────────────────────────────
router.get('/v1/qms/entities', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('qms_entities')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    res.json(data ?? [])
  } catch (err: any) {
    console.error('[qms] GET /entities error:', err)
    res.status(500).json({ error: 'Failed to fetch QMS entities', detail: err?.message })
  }
})

// ─── GET /v1/qms/entities/:slug ───────────────────────────────────────────────
router.get('/v1/qms/entities/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { data: entity, error } = await sb()
      .from('qms_entities')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) throw error
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    // Get implementation stats
    const { data: stats } = await sb()
      .from('qms_implementations')
      .select('status')
      .eq('entity_id', entity.id)

    const counts = { not_started: 0, in_progress: 0, implemented: 0, verified: 0, not_applicable: 0 }
    for (const row of stats ?? []) {
      if (row.status in counts) counts[row.status as keyof typeof counts]++
    }

    res.json({ ...entity, stats: counts })
  } catch (err: any) {
    console.error('[qms] GET /entities/:slug error:', err)
    res.status(500).json({ error: 'Failed to fetch entity', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/standards ───────────────────────────────────────
router.get('/v1/qms/:entitySlug/standards', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params
    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id, standard_versions')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: standards, error } = await sb()
      .from('iso_standards')
      .select('*')
      .order('code', { ascending: true })
    if (error) throw error
    res.json(standards ?? [])
  } catch (err: any) {
    console.error('[qms] GET /standards error:', err)
    res.status(500).json({ error: 'Failed to fetch standards', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/controls ────────────────────────────────────────
router.get('/v1/qms/:entitySlug/controls', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params
    const { standard, category, lang } = req.query
    // i18n: return English fields when lang=en, Swedish (default) otherwise
    const useLang = (lang as string) || 'sv'
    const textField = useLang === 'en' ? 'implementation_text_en' : 'implementation_text'
    const gapField = useLang === 'en' ? 'gap_analysis_en' : 'gap_analysis'

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    // Fetch controls (optionally filtered by standard)
    let controlsQuery = sb()
      .from('iso_controls')
      .select('*, iso_standards(code, name)')
      .order('sort_order', { ascending: true })

    if (standard) {
      const { data: std } = await sb()
        .from('iso_standards')
        .select('id')
        .eq('code', standard as string)
        .single()
      if (std) controlsQuery = controlsQuery.eq('standard_id', std.id)
    }
    if (category) {
      controlsQuery = controlsQuery.eq('category', category as string)
    }

    const { data: controls, error: ctrlErr } = await controlsQuery
    if (ctrlErr) throw ctrlErr

    // Fetch implementations for this entity (with i18n text fields)
    const { data: impls } = await sb()
      .from('qms_implementations')
      .select(`control_id, status, responsible_person, target_date, implementation_text, implementation_text_en, gap_analysis, gap_analysis_en`)
      .eq('entity_id', entity.id)

    const implMap = new Map<string, any>()
    for (const impl of impls ?? []) {
      // Return the appropriate language text
      const implWithLang = {
        ...impl,
        implementation_text: useLang === 'en' ? (impl.implementation_text_en ?? impl.implementation_text) : impl.implementation_text,
        gap_analysis: useLang === 'en' ? (impl.gap_analysis_en ?? impl.gap_analysis) : impl.gap_analysis,
      }
      implMap.set(impl.control_id, implWithLang)
    }

    const result = (controls ?? []).map(ctrl => ({
      ...ctrl,
      implementation: implMap.get(ctrl.id) ?? { status: 'not_started' },
      _lang: useLang
    }))

    res.json(result)
  } catch (err: any) {
    console.error('[qms] GET /controls error:', err)
    res.status(500).json({ error: 'Failed to fetch controls', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/controls/:controlId ─────────────────────────────
router.get('/v1/qms/:entitySlug/controls/:controlId', async (req: Request, res: Response) => {
  try {
    const { entitySlug, controlId } = req.params
    const useLang = ((req.query.lang as string) || 'sv')

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: control } = await sb()
      .from('iso_controls')
      .select('*, iso_standards(code, name)')
      .eq('id', controlId)
      .single()
    if (!control) return res.status(404).json({ error: 'Control not found' })

    const { data: impl } = await sb()
      .from('qms_implementations')
      .select('*')
      .eq('entity_id', entity.id)
      .eq('control_id', controlId)
      .single()

    let mappings: any[] = []
    let evidence: any[] = []

    if (impl) {
      const [{ data: m }, { data: e }] = await Promise.all([
        sb().from('qms_system_mappings').select('*').eq('implementation_id', impl.id).order('created_at'),
        sb().from('qms_evidence').select('*').eq('implementation_id', impl.id).order('collected_at', { ascending: false })
      ])
      mappings = m ?? []
      evidence = e ?? []
    }

    // Apply i18n to implementation text
    const implWithLang = impl ? {
      ...impl,
      implementation_text: useLang === 'en' ? (impl.implementation_text_en ?? impl.implementation_text) : impl.implementation_text,
      gap_analysis: useLang === 'en' ? (impl.gap_analysis_en ?? impl.gap_analysis) : impl.gap_analysis,
    } : null

    res.json({
      ...control,
      implementation: implWithLang ?? { status: 'not_started' },
      mappings,
      evidence,
      _lang: useLang
    })
  } catch (err: any) {
    console.error('[qms] GET /controls/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch control detail', detail: err?.message })
  }
})

// ─── PUT /v1/qms/:entitySlug/controls/:controlId ─────────────────────────────
router.put('/v1/qms/:entitySlug/controls/:controlId', async (req: Request, res: Response) => {
  try {
    const { entitySlug, controlId } = req.params
    const { status, implementation_text, gap_analysis, responsible_person, target_date, notes } = req.body

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const updates: any = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      updates.status = status
      if (status === 'verified') updates.verified_at = new Date().toISOString()
    }
    if (implementation_text !== undefined) updates.implementation_text = implementation_text
    if (gap_analysis !== undefined) updates.gap_analysis = gap_analysis
    if (responsible_person !== undefined) updates.responsible_person = responsible_person
    if (target_date !== undefined) updates.target_date = target_date
    if (notes !== undefined) updates.notes = notes

    const { data, error } = await sb()
      .from('qms_implementations')
      .upsert({
        entity_id: entity.id,
        control_id: controlId,
        ...updates
      }, { onConflict: 'entity_id,control_id' })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err: any) {
    console.error('[qms] PUT /controls/:id error:', err)
    res.status(500).json({ error: 'Failed to update implementation', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/mappings ────────────────────────────────────────
router.get('/v1/qms/:entitySlug/mappings', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: impls } = await sb()
      .from('qms_implementations')
      .select('id')
      .eq('entity_id', entity.id)

    const implIds = (impls ?? []).map(i => i.id)
    if (implIds.length === 0) return res.json([])

    const { data, error } = await sb()
      .from('qms_system_mappings')
      .select('*, qms_implementations(control_id, qms_controls:iso_controls(clause, title))')
      .in('implementation_id', implIds)
      .order('created_at')

    if (error) throw error
    res.json(data ?? [])
  } catch (err: any) {
    console.error('[qms] GET /mappings error:', err)
    res.status(500).json({ error: 'Failed to fetch mappings', detail: err?.message })
  }
})

// ─── POST /v1/qms/:entitySlug/mappings ───────────────────────────────────────
router.post('/v1/qms/:entitySlug/mappings', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params
    const { control_id, mapping_type, label, reference, health_check_url, health_check_type } = req.body

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    // Ensure implementation record exists
    const { data: impl } = await sb()
      .from('qms_implementations')
      .upsert({ entity_id: entity.id, control_id, updated_at: new Date().toISOString() }, { onConflict: 'entity_id,control_id' })
      .select('id')
      .single()

    const { data, error } = await sb()
      .from('qms_system_mappings')
      .insert({
        implementation_id: impl!.id,
        mapping_type, label, reference,
        health_check_url: health_check_url ?? null,
        health_check_type: health_check_type ?? 'manual',
        last_health_status: 'unknown'
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err: any) {
    console.error('[qms] POST /mappings error:', err)
    res.status(500).json({ error: 'Failed to create mapping', detail: err?.message })
  }
})

// ─── DELETE /v1/qms/:entitySlug/mappings/:mappingId ──────────────────────────
router.delete('/v1/qms/:entitySlug/mappings/:mappingId', async (req: Request, res: Response) => {
  try {
    const { mappingId } = req.params
    const { error } = await sb()
      .from('qms_system_mappings')
      .delete()
      .eq('id', mappingId)
    if (error) throw error
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[qms] DELETE /mappings/:id error:', err)
    res.status(500).json({ error: 'Failed to delete mapping', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/evidence/:controlId ─────────────────────────────
router.get('/v1/qms/:entitySlug/evidence/:controlId', async (req: Request, res: Response) => {
  try {
    const { entitySlug, controlId } = req.params

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: impl } = await sb()
      .from('qms_implementations')
      .select('id')
      .eq('entity_id', entity.id)
      .eq('control_id', controlId)
      .single()

    if (!impl) return res.json([])

    const { data, error } = await sb()
      .from('qms_evidence')
      .select('*')
      .eq('implementation_id', impl.id)
      .order('collected_at', { ascending: false })

    if (error) throw error
    res.json(data ?? [])
  } catch (err: any) {
    console.error('[qms] GET /evidence/:controlId error:', err)
    res.status(500).json({ error: 'Failed to fetch evidence', detail: err?.message })
  }
})

// ─── POST /v1/qms/:entitySlug/evidence ───────────────────────────────────────
router.post('/v1/qms/:entitySlug/evidence', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params
    const { control_id, evidence_type, title, content, file_url, collected_by, valid_until } = req.body

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: impl } = await sb()
      .from('qms_implementations')
      .upsert({ entity_id: entity.id, control_id, updated_at: new Date().toISOString() }, { onConflict: 'entity_id,control_id' })
      .select('id')
      .single()

    const { data, error } = await sb()
      .from('qms_evidence')
      .insert({
        implementation_id: impl!.id,
        evidence_type, title,
        content: content ?? null,
        file_url: file_url ?? null,
        collected_by: collected_by ?? null,
        valid_until: valid_until ?? null,
        collected_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err: any) {
    console.error('[qms] POST /evidence error:', err)
    res.status(500).json({ error: 'Failed to add evidence', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/health ──────────────────────────────────────────
router.get('/v1/qms/:entitySlug/health', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: impls } = await sb()
      .from('qms_implementations')
      .select('id')
      .eq('entity_id', entity.id)

    const implIds = (impls ?? []).map(i => i.id)
    if (implIds.length === 0) return res.json({ checks: [], summary: { healthy: 0, degraded: 0, failing: 0, unknown: 0 } })

    const { data: mappings } = await sb()
      .from('qms_system_mappings')
      .select('*')
      .in('implementation_id', implIds)
      .not('health_check_url', 'is', null)

    const checks = await Promise.all((mappings ?? []).map(async (m) => {
      const status = await checkUrl(m.health_check_url!, m.health_check_type)
      // Update DB
      await sb()
        .from('qms_system_mappings')
        .update({ last_health_status: status, last_health_check: new Date().toISOString() })
        .eq('id', m.id)
      return { id: m.id, label: m.label, reference: m.reference, mapping_type: m.mapping_type, status }
    }))

    const summary = { healthy: 0, degraded: 0, failing: 0, unknown: 0 }
    for (const c of checks) summary[c.status as keyof typeof summary]++

    res.json({ checks, summary, checked_at: new Date().toISOString() })
  } catch (err: any) {
    console.error('[qms] GET /health error:', err)
    res.status(500).json({ error: 'Failed to run health checks', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/dashboard ───────────────────────────────────────
router.get('/v1/qms/:entitySlug/dashboard', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('*')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    // Total controls in DB
    const { count: totalControls } = await sb()
      .from('iso_controls')
      .select('*', { count: 'exact', head: true })

    // Implementation stats
    const { data: implStats } = await sb()
      .from('qms_implementations')
      .select('status, control_id')
      .eq('entity_id', entity.id)

    const statusCounts: Record<string, number> = {
      not_started: 0, in_progress: 0, implemented: 0, verified: 0, not_applicable: 0
    }
    for (const row of implStats ?? []) {
      if (row.status in statusCounts) statusCounts[row.status]++
    }
    const tracked = (implStats ?? []).length
    const notTracked = (totalControls ?? 0) - tracked

    // Per-standard breakdown
    const { data: standards } = await sb()
      .from('iso_standards')
      .select('id, code, name, total_controls')

    const stdBreakdown = await Promise.all((standards ?? []).map(async (std) => {
      const { count: ctrlCount } = await sb()
        .from('iso_controls')
        .select('*', { count: 'exact', head: true })
        .eq('standard_id', std.id)

      const { data: stdImpls } = await sb()
        .from('qms_implementations')
        .select('status, iso_controls!inner(standard_id)')
        .eq('entity_id', entity.id)
        .eq('iso_controls.standard_id', std.id)

      const implCount = (stdImpls ?? []).filter(i =>
        i.status === 'implemented' || i.status === 'verified'
      ).length

      return {
        code: std.code,
        name: std.name,
        total: ctrlCount ?? 0,
        implemented: implCount,
        completion_pct: ctrlCount ? Math.round(implCount / ctrlCount * 100) : 0
      }
    }))

    // Recent activity
    const { data: recentActivity } = await sb()
      .from('qms_implementations')
      .select('status, updated_at, iso_controls(clause, title)')
      .eq('entity_id', entity.id)
      .order('updated_at', { ascending: false })
      .limit(10)

    // Health summary (last known)
    const { data: implsForHealth } = await sb()
      .from('qms_implementations')
      .select('id')
      .eq('entity_id', entity.id)

    const implIdsForHealth = (implsForHealth ?? []).map(i => i.id)
    const healthSummary = { healthy: 0, degraded: 0, failing: 0, unknown: 0 }
    if (implIdsForHealth.length > 0) {
      const { data: healthMappings } = await sb()
        .from('qms_system_mappings')
        .select('last_health_status')
        .in('implementation_id', implIdsForHealth)
      for (const m of healthMappings ?? []) {
        const s = (m.last_health_status ?? 'unknown') as keyof typeof healthSummary
        if (s in healthSummary) healthSummary[s]++
      }
    }

    res.json({
      entity,
      stats: {
        total_controls: totalControls ?? 0,
        tracked,
        not_tracked: notTracked,
        ...statusCounts
      },
      standards: stdBreakdown,
      health: healthSummary,
      recent_activity: recentActivity ?? []
    })
  } catch (err: any) {
    console.error('[qms] GET /dashboard error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/audit ───────────────────────────────────────────
router.get('/v1/qms/:entitySlug/audit', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data, error } = await sb()
      .from('qms_audit_sessions')
      .select('*')
      .eq('entity_id', entity.id)
      .order('started_at', { ascending: false })

    if (error) throw error
    res.json(data ?? [])
  } catch (err: any) {
    console.error('[qms] GET /audit error:', err)
    res.status(500).json({ error: 'Failed to fetch audit sessions', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/controls/:controlId/meetings ────────────────────
router.get('/v1/qms/:entitySlug/controls/:controlId/meetings', async (req: Request, res: Response) => {
  try {
    const { entitySlug, controlId } = req.params

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: control } = await sb()
      .from('iso_controls')
      .select('clause')
      .eq('id', controlId)
      .single()
    if (!control) return res.status(404).json({ error: 'Control not found' })

    const { data: impl } = await sb()
      .from('qms_implementations')
      .select('id')
      .eq('entity_id', entity.id)
      .eq('control_id', controlId)
      .single()

    // Hämta qms_meeting_links för denna implementation
    const meetingLinks = impl
      ? (await sb()
          .from('qms_meeting_links')
          .select('*')
          .eq('implementation_id', impl.id)
          .order('created_at', { ascending: false })).data ?? []
      : []

    // Klausulbaserad filtrering av faktiska möten
    const clause = control.clause
    let meetingTypeFilter: string[] = []
    if (clause.startsWith('9.3')) meetingTypeFilter = ['management-review', 'annual', 'qbr']
    else if (clause.startsWith('9.1')) meetingTypeFilter = ['qbr', 'kpi-review', 'monthly']
    else if (clause.startsWith('6.2')) meetingTypeFilter = ['annual', 'qbr']
    else if (clause.startsWith('10.2')) meetingTypeFilter = ['qbr', 'annual', 'monthly']
    else meetingTypeFilter = ['annual', 'qbr', 'monthly', 'management-review']

    // Hämta faktiska möten från meetings-tabellen
    const { data: actualMeetings } = await sb()
      .from('meetings')
      .select('id, title, date, status, summary, decisions')
      .order('date', { ascending: false })
      .limit(10)

    // Hämta management_reviews om klausul 9.3
    let managementReviews: any[] = []
    if (clause.startsWith('9.3')) {
      const { data: mr } = await sb()
        .from('management_reviews')
        .select('*')
        .order('review_date', { ascending: false })
        .limit(5)
      managementReviews = mr ?? []
    }

    res.json({
      control_clause: clause,
      meeting_links: meetingLinks,
      recent_meetings: actualMeetings ?? [],
      management_reviews: managementReviews,
      applicable_meeting_types: meetingTypeFilter,
    })
  } catch (err: any) {
    console.error('[qms] GET /controls/:id/meetings error:', err)
    res.status(500).json({ error: 'Failed to fetch meeting data', detail: err?.message })
  }
})

// ─── POST /v1/qms/:entitySlug/controls/:controlId/meetings ───────────────────
router.post('/v1/qms/:entitySlug/controls/:controlId/meetings', async (req: Request, res: Response) => {
  try {
    const { entitySlug, controlId } = req.params
    const { meeting_type, meeting_id, iso_clause, link_description, is_primary_evidence } = req.body

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data: control } = await sb()
      .from('iso_controls')
      .select('clause')
      .eq('id', controlId)
      .single()
    if (!control) return res.status(404).json({ error: 'Control not found' })

    // Säkerställ implementation-post
    const { data: impl } = await sb()
      .from('qms_implementations')
      .upsert(
        { entity_id: entity.id, control_id: controlId, updated_at: new Date().toISOString() },
        { onConflict: 'entity_id,control_id' }
      )
      .select('id')
      .single()

    const { data, error } = await sb()
      .from('qms_meeting_links')
      .insert({
        implementation_id: impl!.id,
        meeting_type: meeting_type ?? 'unknown',
        meeting_id: meeting_id ?? null,
        iso_clause: iso_clause ?? control.clause,
        link_description: link_description ?? null,
        is_primary_evidence: is_primary_evidence ?? false,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err: any) {
    console.error('[qms] POST /controls/:id/meetings error:', err)
    res.status(500).json({ error: 'Failed to create meeting link', detail: err?.message })
  }
})

// ─── GET /v1/qms/:entitySlug/compliance-timeline ─────────────────────────────
// Revisorsvyn: kronologisk vy av alla möten, beslut och ISO-krav
router.get('/v1/qms/:entitySlug/compliance-timeline', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params
    const { clause, from, to, limit: limitParam } = req.query

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const pageLimit = Math.min(parseInt(limitParam as string || '50'), 200)

    // Hämta alla qms_meeting_links för denna entitet
    let linksQuery = sb()
      .from('qms_meeting_links')
      .select(`
        id, meeting_type, meeting_id, iso_clause, link_description, is_primary_evidence, created_at,
        qms_implementations!inner(
          entity_id,
          iso_controls(clause, title)
        )
      `)
      .eq('qms_implementations.entity_id', entity.id)
      .order('created_at', { ascending: false })
      .limit(pageLimit)

    if (clause) linksQuery = linksQuery.ilike('iso_clause', `${clause}%`)

    const { data: links } = await linksQuery

    // Hämta faktiska möten
    let meetingsQuery = sb()
      .from('meetings')
      .select('id, title, date, status, summary')
      .order('date', { ascending: false })
      .limit(pageLimit)

    if (from) meetingsQuery = meetingsQuery.gte('date', from as string)
    if (to) meetingsQuery = meetingsQuery.lte('date', to as string)

    const { data: meetings } = await meetingsQuery

    // Hämta management reviews
    let mrQuery = sb()
      .from('management_reviews')
      .select('*')
      .order('review_date', { ascending: false })
      .limit(20)

    if (from) mrQuery = mrQuery.gte('review_date', from as string)
    if (to) mrQuery = mrQuery.lte('review_date', to as string)
    const { data: managementReviews } = await mrQuery

    // Hämta decision blocks med beslutsdatum
    const { data: decisionBlocks } = await sb()
      .from('decision_blocks')
      .select('id, title, meeting_id, type, status, deadline, chosen_option, created_at')
      .order('created_at', { ascending: false })
      .limit(pageLimit)

    // Bygg unified timeline
    const timelineItems: any[] = []

    for (const m of meetings ?? []) {
      timelineItems.push({
        type: 'meeting',
        date: m.date,
        title: m.title,
        meeting_type: 'general',
        status: m.status,
        summary: m.summary,
        ref_id: m.id,
        iso_clauses: [],
      })
    }

    for (const mr of managementReviews ?? []) {
      timelineItems.push({
        type: 'management_review',
        date: mr.review_date,
        title: mr.title ?? 'Ledningsgenomgång',
        meeting_type: 'management-review',
        status: mr.status,
        ref_id: mr.id,
        iso_clauses: ['9.3', '9.3.1', '9.3.2', '9.3.3'],
      })
    }

    for (const db of decisionBlocks ?? []) {
      timelineItems.push({
        type: 'decision',
        date: db.deadline ?? db.created_at,
        title: db.title,
        meeting_type: db.type,
        status: db.status,
        chosen_option: db.chosen_option,
        ref_id: db.id,
        meeting_id: db.meeting_id,
        iso_clauses: [],
      })
    }

    // Sortera kronologiskt (nyast först)
    timelineItems.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      return db - da
    })

    // Filtrera på klausul om specifikt
    const filteredItems = clause
      ? timelineItems.filter(item =>
          item.iso_clauses?.some((c: string) => c.startsWith(clause as string)) ||
          item.type === 'meeting' // inkludera alla möten i klausulvy
        )
      : timelineItems

    res.json({
      entity_slug: entitySlug,
      clause_filter: clause ?? null,
      from_filter: from ?? null,
      to_filter: to ?? null,
      total: filteredItems.length,
      items: filteredItems.slice(0, pageLimit),
      meeting_links: (links ?? []).map(l => ({
        iso_clause: l.iso_clause,
        meeting_type: l.meeting_type,
        link_description: l.link_description,
        is_primary_evidence: l.is_primary_evidence,
      })),
    })
  } catch (err: any) {
    console.error('[qms] GET /compliance-timeline error:', err)
    res.status(500).json({ error: 'Failed to fetch compliance timeline', detail: err?.message })
  }
})

// ─── POST /v1/qms/:entitySlug/audit ──────────────────────────────────────────
router.post('/v1/qms/:entitySlug/audit', async (req: Request, res: Response) => {
  try {
    const { entitySlug } = req.params
    const { audit_type, auditor_name, auditor_org, notes } = req.body

    const { data: entity } = await sb()
      .from('qms_entities')
      .select('id')
      .eq('slug', entitySlug)
      .single()
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const { data, error } = await sb()
      .from('qms_audit_sessions')
      .insert({
        entity_id: entity.id,
        audit_type: audit_type ?? 'internal',
        auditor_name: auditor_name ?? null,
        auditor_org: auditor_org ?? null,
        notes: notes ?? null,
        status: 'open',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err: any) {
    console.error('[qms] POST /audit error:', err)
    res.status(500).json({ error: 'Failed to start audit session', detail: err?.message })
  }
})

// ─── GET /v1/qms/readiness — certification readiness dashboard ────────────────
router.get('/v1/qms/readiness', async (_req: Request, res: Response) => {
  const db = (() => {
    const { Pool } = require('pg')
    return new Pool({
      connectionString: process.env.DATABASE_URL || process.env.WAVULT_DB_URL,
      ssl: { rejectUnauthorized: false },
    })
  })()
  try {
    const { rows: criteria } = await db.query(
      `SELECT criterion_code, category, description, is_met, met_at, check_type
       FROM certification_booking_criteria WHERE entity_slug='wavult-os' ORDER BY category, criterion_code`
    )
    const { rows: latestRows } = await db.query(
      `SELECT * FROM certification_readiness_log ORDER BY checked_at DESC LIMIT 1`
    )
    const latest = latestRows[0]
    const { rows: history } = await db.query(
      `SELECT checked_at, readiness_pct FROM certification_readiness_log
       WHERE entity_slug='wavult-os' ORDER BY checked_at DESC LIMIT 10`
    )
    res.json({
      readiness_pct: latest?.readiness_pct ?? 0,
      criteria_met: latest?.criteria_met ?? 0,
      criteria_total: latest?.criteria_total ?? 15,
      booking_triggered: latest?.booking_triggered ?? false,
      last_checked: latest?.checked_at,
      criteria,
      history,
      target_dates: {
        thailand: '2026-04-11',
        pre_assessment: '2026-Q3',
        full_certification: '2026-Q4'
      }
    })
  } catch (err: any) {
    console.error('[qms] GET /readiness error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

export default router
