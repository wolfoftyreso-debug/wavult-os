// ─── Wavult OS — Intelligence Dashboard Routes ────────────────────────────────
// REST API for intelligence signals, Semrush data and market radar.
// All routes require auth. Semrush data flows through semrushService adapter.

import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { semrushService, SemrushSignal } from '../services/semrush.service'
import { createClient } from '@supabase/supabase-js'

const router = Router()
router.use(requireAuth)

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

// ─── Helper: persist signals to DB ────────────────────────────────────────────

async function persistSignals(signals: SemrushSignal[], category = 'seo') {
  if (!signals.length) return
  const sb = getSupabase()

  const rows = signals.map(s => ({
    source: s.source,
    category,
    title: `${s.entity_type}: ${s.domain}${s.keyword ? ` — ${s.keyword}` : ''} [${s.metric_name}]`,
    summary: `${s.metric_name}: ${s.metric_value} (market: ${s.market})`,
    raw_content: s.raw ?? null,
    relevance_score: s.priority_signal ? 0.75 : 0.45,
    impact_score: s.priority_signal ? 0.70 : 0.40,
    probability_score: s.confidence,
    urgency: s.priority_signal ? '30d' : '90d',
    sentiment: 'neutral',
    impact_type: s.priority_signal ? 'opportunity' : 'neutral',
    semrush_domain: s.domain,
    semrush_keyword: s.keyword ?? null,
    semrush_market: s.market,
    semrush_metric_name: s.metric_name,
    semrush_metric_value: String(s.metric_value),
    semrush_entity_type: s.entity_type,
    status: s.priority_signal ? 'new' : 'monitoring',
  }))

  await sb.from('intelligence_signals').insert(rows)
}

// ─── Semrush endpoints ─────────────────────────────────────────────────────────

// POST /v1/intelligence/semrush/domain
router.post('/v1/intelligence/semrush/domain', async (req: Request, res: Response) => {
  const { domain, database = 'se' } = req.body
  if (!domain) return res.status(400).json({ error: 'domain required' })

  try {
    const signals = await semrushService.getDomainOverview(domain, database)
    await persistSignals(signals)
    res.json({ signals, count: signals.length, priority_count: signals.filter(s => s.priority_signal).length })
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// POST /v1/intelligence/semrush/keywords
router.post('/v1/intelligence/semrush/keywords', async (req: Request, res: Response) => {
  const { domain, database = 'se' } = req.body
  if (!domain) return res.status(400).json({ error: 'domain required' })

  try {
    const signals = await semrushService.getOrganicKeywords(domain, database)
    await persistSignals(signals)
    res.json({ signals, count: signals.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// POST /v1/intelligence/semrush/competitors
router.post('/v1/intelligence/semrush/competitors', async (req: Request, res: Response) => {
  const { domain, database = 'se' } = req.body
  if (!domain) return res.status(400).json({ error: 'domain required' })

  try {
    const signals = await semrushService.getCompetitors(domain, database)
    await persistSignals(signals, 'competitor')
    res.json({
      signals,
      new_competitors: signals.filter(s => s.priority_signal).map(s => s.keyword),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// POST /v1/intelligence/semrush/keyword
router.post('/v1/intelligence/semrush/keyword', async (req: Request, res: Response) => {
  const { keyword, database = 'se' } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword required' })

  try {
    const signals = await semrushService.getKeywordOverview(keyword, database)
    res.json({ signals, count: signals.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// POST /v1/intelligence/semrush/backlinks
router.post('/v1/intelligence/semrush/backlinks', async (req: Request, res: Response) => {
  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'domain required' })

  try {
    const signals = await semrushService.getBacklinksOverview(domain)
    await persistSignals(signals)
    res.json({ signals, count: signals.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// POST /v1/intelligence/semrush/gap
router.post('/v1/intelligence/semrush/gap', async (req: Request, res: Response) => {
  const { domain1, domain2, database = 'se' } = req.body
  if (!domain1 || !domain2) return res.status(400).json({ error: 'domain1 and domain2 required' })

  try {
    const signals = await semrushService.getKeywordGap(domain1, domain2, database)
    const gaps = signals.filter(s => s.priority_signal) // They rank, we don't
    await persistSignals(gaps, 'competitor')
    res.json({ signals, gap_count: gaps.length, gaps: gaps.map(s => s.keyword) })
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// POST /v1/intelligence/semrush/audit — full domain audit
router.post('/v1/intelligence/semrush/audit', async (req: Request, res: Response) => {
  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'domain required' })

  try {
    const audit = await semrushService.runDomainAudit(domain)

    // Persist all priority signals
    await persistSignals(audit.priority_signals)

    // Auto-create Wavult OS task for P0/P1 signals
    if (audit.priority_signals.length > 0) {
      const sb = getSupabase()
      const taskTitle = `SEO Alert: ${domain} — ${audit.priority_signals.length} priority signal(s)`
      await sb.from('tasks').insert({
        title: taskTitle,
        description: `Semrush audit detected ${audit.priority_signals.length} priority signal(s) for ${domain}.\n\nSummary:\n- Organic traffic: ${audit.summary.organic_traffic.toLocaleString()}\n- Authority score: ${audit.summary.authority_score}\n- Top competitors: ${audit.summary.top_competitors.join(', ')}`,
        priority: audit.priority_signals.length >= 3 ? 'P0' : 'P1',
        tags: ['intelligence', 'semrush', 'seo', domain],
        source: 'intelligence_dashboard',
      }) // Non-fatal — task creation best-effort
    }

    res.json(audit)
  } catch (e: any) {
    res.status(500).json({ error: e.message, code: 'SEMRUSH_ERROR' })
  }
})

// ─── Intelligence Signals CRUD ─────────────────────────────────────────────────

// GET /v1/intelligence/signals
router.get('/v1/intelligence/signals', async (req: Request, res: Response) => {
  const { limit = '50', offset = '0', priority, source, status = 'new' } = req.query as Record<string, string>
  const sb = getSupabase()

  let query = sb
    .from('intelligence_signals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

  if (priority) query = query.eq('priority_tier', priority)
  if (source)   query = query.eq('source', source)
  if (status)   query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ signals: data, total: count, limit: parseInt(limit), offset: parseInt(offset) })
})

// GET /v1/intelligence/signals/:id
router.get('/v1/intelligence/signals/:id', async (req: Request, res: Response) => {
  const sb = getSupabase()
  const { data, error } = await sb.from('intelligence_signals').select('*').eq('id', req.params.id).single()
  if (error || !data) return res.status(404).json({ error: 'Signal not found' })
  res.json(data)
})

// POST /v1/intelligence/signals — manual signal input
router.post('/v1/intelligence/signals', async (req: Request, res: Response) => {
  const sb = getSupabase()
  const { data, error } = await sb.from('intelligence_signals').insert({ ...req.body, source: req.body.source || 'manual' }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /v1/intelligence/signals/:id
router.patch('/v1/intelligence/signals/:id', async (req: Request, res: Response) => {
  const sb = getSupabase()
  const allowed = ['status', 'dismissed_reason', 'outcome', 'outcome_at', 'recommendation_action', 'recommendation_owner']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await sb.from('intelligence_signals').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ─── Market Radar ───────────────────────────────────────────────────────────────

// GET /v1/intelligence/market-radar
router.get('/v1/intelligence/market-radar', async (req: Request, res: Response) => {
  const sb = getSupabase()

  // Get latest snapshot or generate one
  const { data: snapshot } = await sb
    .from('intelligence_market_radar')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (snapshot) return res.json(snapshot)

  // Generate live snapshot from recent signals
  const { data: signals } = await sb
    .from('intelligence_signals')
    .select('priority_tier, affects, sentiment, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString())

  const today = new Date().toISOString().split('T')[0]
  const p0 = signals?.filter(s => s.priority_tier === 'P0').length ?? 0
  const p1 = signals?.filter(s => s.priority_tier === 'P1').length ?? 0
  const pos = signals?.filter(s => s.sentiment === 'positive').length ?? 0
  const neg = signals?.filter(s => s.sentiment === 'negative').length ?? 0
  const sentiment = pos > neg * 1.5 ? 'positive' : neg > pos * 1.5 ? 'negative' : 'neutral'

  const radar = { date: today, p0_count: p0, p1_count: p1, market_sentiment: sentiment, active_recommendations: p0 + p1 }
  await sb.from('intelligence_market_radar').upsert(radar, { onConflict: 'date' })
  res.json(radar)
})

// ─── Competitors ────────────────────────────────────────────────────────────────

// GET /v1/intelligence/competitors
router.get('/v1/intelligence/competitors', async (req: Request, res: Response) => {
  const sb = getSupabase()
  const { data, error } = await sb.from('intelligence_competitors').select('*').order('threat_level', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ competitors: data })
})

// POST /v1/intelligence/competitors/audit — run Semrush audit on all competitors
router.post('/v1/intelligence/competitors/audit', async (req: Request, res: Response) => {
  const sb = getSupabase()
  const { data: competitors } = await sb.from('intelligence_competitors').select('domain, competes_with').limit(10)
  if (!competitors?.length) return res.json({ message: 'No competitors configured', audited: 0 })

  const results: Record<string, unknown>[] = []
  for (const comp of competitors) {
    try {
      const audit = await semrushService.runDomainAudit(comp.domain)
      results.push({ domain: comp.domain, summary: audit.summary, alerts: audit.priority_signals.length })

      // Update competitor record
      await sb.from('intelligence_competitors').update({
        semrush_last_audit: new Date().toISOString(),
        semrush_organic_traffic: audit.summary.organic_traffic,
        semrush_organic_keywords: audit.summary.organic_keywords,
        semrush_authority_score: audit.summary.authority_score,
        last_signal_at: new Date().toISOString(),
      }).eq('domain', comp.domain)
    } catch (e: any) {
      results.push({ domain: comp.domain, error: e.message })
    }
  }

  res.json({ audited: results.length, results })
})

export default router
