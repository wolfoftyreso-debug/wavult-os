// ─── Semrush API Adapter ───────────────────────────────────────────────────────
// Wraps Semrush API endpoints, normalizes to unified SemrushSignal schema,
// handles rate limiting (10 req/s, 10 concurrent), caches in Supabase.
// API docs: https://developer.semrush.com/api/basics/introduction/
//
// ⚠️  Cache max 30 days per Semrush TOS.
// ⚠️  API key must be in process.env.SEMRUSH_API_KEY — never hardcoded.

import { createClient } from '@supabase/supabase-js'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SemrushSignal {
  source: 'semrush'
  entity_type: 'domain' | 'keyword' | 'backlink' | 'competitor' | 'gap'
  domain: string
  keyword?: string
  market: string
  timestamp: string
  metric_name: string
  metric_value: number | string
  confidence: number   // 0-1 based on data freshness
  priority_signal: boolean
  raw?: Record<string, unknown>
}

export interface DomainAuditResult {
  signals: SemrushSignal[]
  priority_signals: SemrushSignal[]
  summary: {
    domain: string
    organic_traffic: number
    organic_keywords: number
    authority_score: number
    backlinks: number
    referring_domains: number
    top_competitors: string[]
    traffic_delta_pct?: number
    has_alerts: boolean
  }
}

interface CacheEntry {
  domain: string
  endpoint: string
  market: string
  fetched_at: string
  expires_at: string
  data: unknown
}

// ─── Rate limiter ───────────────────────────────────────────────────────────────
// Simple token-bucket: 10 req/sec max, 10 concurrent max

class RateLimiter {
  private queue: Array<() => void> = []
  private active = 0
  private readonly maxConcurrent = 10
  private readonly minIntervalMs = 110 // ~10 req/s with buffer

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++
      return
    }
    await new Promise<void>(resolve => this.queue.push(resolve))
    this.active++
  }

  release(): void {
    this.active--
    const next = this.queue.shift()
    if (next) setTimeout(next, this.minIntervalMs)
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      const result = await fn()
      return result
    } finally {
      setTimeout(() => this.release(), this.minIntervalMs)
    }
  }
}

const limiter = new RateLimiter()

// ─── Supabase client ────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  return createClient(url, key)
}

// ─── HTTP fetch with retry ──────────────────────────────────────────────────────

async function semrushFetch(url: string, retries = 3): Promise<string> {
  return limiter.run(async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const resp = await fetch(url)

      if (resp.status === 429) {
        const retryAfter = parseInt(resp.headers.get('Retry-After') || '5', 10)
        await sleep(retryAfter * 1000 * (attempt + 1))
        continue
      }

      if (!resp.ok) {
        throw new Error(`Semrush HTTP ${resp.status}: ${await resp.text()}`)
      }

      return resp.text()
    }
    throw new Error('Semrush: max retries exceeded')
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── CSV parser (Semrush returns semicolon-separated) ──────────────────────────

function parseSemrushCSV(raw: string): Record<string, string>[] {
  const lines = raw.trim().split('\r\n').filter(Boolean)
  if (!lines.length) return []

  // Check for error response
  if (lines[0]?.startsWith('ERROR')) {
    const code = lines[0].match(/ERROR (\d+)/)?.[1]
    if (code === '50') return [] // Nothing found — not an error
    throw new Error(`Semrush API error: ${lines[0]}`)
  }

  const headers = lines[0].split(';')
  return lines.slice(1).map(line => {
    const values = line.split(';')
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim() ?? '']))
  })
}

// ─── Cache ──────────────────────────────────────────────────────────────────────

const CACHE_TTL_HOURS = 24
const CACHE_MAX_DAYS = 30

async function getCached(domain: string, endpoint: string, market: string): Promise<unknown | null> {
  try {
    const sb = getSupabase()
    const { data } = await sb
      .from('intelligence_semrush_cache')
      .select('data, expires_at')
      .eq('domain', domain)
      .eq('endpoint', endpoint)
      .eq('market', market)
      .single()

    if (!data) return null
    if (new Date(data.expires_at) < new Date()) return null
    return data.data
  } catch {
    return null
  }
}

async function setCache(domain: string, endpoint: string, market: string, data: unknown) {
  try {
    const sb = getSupabase()
    const now = new Date()
    const expires = new Date(now.getTime() + CACHE_TTL_HOURS * 3600 * 1000)
    const maxExpiry = new Date(now.getTime() + CACHE_MAX_DAYS * 86400 * 1000)

    await sb.from('intelligence_semrush_cache').upsert({
      domain,
      endpoint,
      market,
      fetched_at: now.toISOString(),
      expires_at: expires < maxExpiry ? expires.toISOString() : maxExpiry.toISOString(),
      data,
    }, { onConflict: 'domain,endpoint,market' })
  } catch (e) {
    console.error('[semrush] cache write error:', e)
  }
}

// ─── Delta detection ────────────────────────────────────────────────────────────

async function getPreviousSnapshot(domain: string, endpoint: string, market: string): Promise<unknown | null> {
  try {
    const sb = getSupabase()
    const { data } = await sb
      .from('intelligence_semrush_cache')
      .select('data')
      .eq('domain', domain)
      .eq('endpoint', endpoint)
      .eq('market', market)
      .order('fetched_at', { ascending: false })
      .limit(2)
    // Return the second-to-last entry (previous)
    return data?.[1]?.data ?? null
  } catch {
    return null
  }
}

function trafficDelta(current: number, previous: number): number {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

// ─── API key ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.SEMRUSH_API_KEY
  if (!key) throw new Error('SEMRUSH_API_KEY not set in environment')
  return key
}

const BASE = 'https://api.semrush.com'

// ─── Normalizers ────────────────────────────────────────────────────────────────

function normalizeDomainOverview(rows: Record<string, string>[], domain: string, market: string): SemrushSignal[] {
  return rows.map(row => ({
    source: 'semrush' as const,
    entity_type: 'domain' as const,
    domain,
    market,
    timestamp: new Date().toISOString(),
    metric_name: 'domain_overview',
    metric_value: parseInt(row['Or'] || row['Ot'] || '0', 10),
    confidence: 0.9,
    priority_signal: false,
    raw: row,
  }))
}

function normalizeKeyword(rows: Record<string, string>[], domain: string, market: string): SemrushSignal[] {
  return rows.map(row => ({
    source: 'semrush' as const,
    entity_type: 'keyword' as const,
    domain,
    keyword: row['Ph'],
    market,
    timestamp: new Date().toISOString(),
    metric_name: 'keyword_position',
    metric_value: parseInt(row['Po'] || '0', 10),
    confidence: 0.85,
    priority_signal: parseInt(row['Po'] || '100', 10) <= 10,
    raw: row,
  }))
}

function normalizeCompetitors(rows: Record<string, string>[], domain: string, market: string): SemrushSignal[] {
  return rows.map(row => ({
    source: 'semrush' as const,
    entity_type: 'competitor' as const,
    domain,
    keyword: row['Dn'],
    market,
    timestamp: new Date().toISOString(),
    metric_name: 'competitor_overlap',
    metric_value: parseInt(row['Np'] || '0', 10),
    confidence: 0.85,
    priority_signal: false,
    raw: row,
  }))
}

function normalizeBacklinks(rows: Record<string, string>[], domain: string): SemrushSignal[] {
  return rows.map(row => ({
    source: 'semrush' as const,
    entity_type: 'backlink' as const,
    domain,
    market: 'global',
    timestamp: new Date().toISOString(),
    metric_name: 'backlinks_total',
    metric_value: parseInt(row['total'] || '0', 10),
    confidence: 0.9,
    priority_signal: false,
    raw: row,
  }))
}

function normalizeGap(rows: Record<string, string>[], domain1: string, domain2: string, market: string): SemrushSignal[] {
  return rows.map(row => ({
    source: 'semrush' as const,
    entity_type: 'gap' as const,
    domain: domain1,
    keyword: row['Ph'],
    market,
    timestamp: new Date().toISOString(),
    metric_name: 'keyword_gap_position',
    metric_value: `${row['Po1'] || '—'} vs ${row['Po2'] || '—'}`,
    confidence: 0.8,
    priority_signal: !row['Po1'] && !!row['Po2'],  // They rank, we don't
    raw: { ...row, vs_domain: domain2 },
  }))
}

// ─── Main service ───────────────────────────────────────────────────────────────

export const semrushService = {

  async getDomainOverview(domain: string, database = 'se'): Promise<SemrushSignal[]> {
    const cached = await getCached(domain, 'domain_overview', database)
    if (cached) return cached as SemrushSignal[]

    const key = getApiKey()
    const url = `${BASE}/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${encodeURIComponent(domain)}&database=${database}`
    const raw = await semrushFetch(url)
    const rows = parseSemrushCSV(raw)

    // Delta detection
    const prev = await getPreviousSnapshot(domain, 'domain_overview', database) as Record<string, unknown>[] | null
    const signals = normalizeDomainOverview(rows, domain, database)

    if (prev?.length && rows.length) {
      const prevTraffic = parseInt((prev[0] as Record<string, string>)['Ot'] || '0', 10)
      const currTraffic = parseInt(rows[0]['Ot'] || '0', 10)
      const delta = trafficDelta(currTraffic, prevTraffic)
      if (Math.abs(delta) >= 15) {
        signals.forEach(s => { s.priority_signal = true })
      }
    }

    await setCache(domain, 'domain_overview', database, signals)
    return signals
  },

  async getOrganicKeywords(domain: string, database = 'se'): Promise<SemrushSignal[]> {
    const cached = await getCached(domain, 'organic_keywords', database)
    if (cached) return cached as SemrushSignal[]

    const key = getApiKey()
    const url = `${BASE}/?type=domain_organic&key=${key}&export_columns=Ph,Po,Nq,Cp,Ur,Tr,Kd,Co,Nr,Td&domain=${encodeURIComponent(domain)}&database=${database}&display_limit=20`
    const raw = await semrushFetch(url)
    const rows = parseSemrushCSV(raw)
    const signals = normalizeKeyword(rows, domain, database)

    await setCache(domain, 'organic_keywords', database, signals)
    return signals
  },

  async getCompetitors(domain: string, database = 'se'): Promise<SemrushSignal[]> {
    const cached = await getCached(domain, 'competitors', database)
    if (cached) return cached as SemrushSignal[]

    const key = getApiKey()
    const url = `${BASE}/?type=domain_organic_organic&key=${key}&export_columns=Dn,Np,Or,Ot,Oc,Ad,Av&domain=${encodeURIComponent(domain)}&database=${database}&display_limit=10`
    const raw = await semrushFetch(url)
    const rows = parseSemrushCSV(raw)

    // Detect new competitors
    const prev = await getPreviousSnapshot(domain, 'competitors', database) as SemrushSignal[] | null
    const prevDomains = new Set(prev?.map(s => s.keyword) ?? [])
    const signals = normalizeCompetitors(rows, domain, database)
    signals.forEach(s => {
      if (s.keyword && !prevDomains.has(s.keyword)) s.priority_signal = true
    })

    await setCache(domain, 'competitors', database, signals)
    return signals
  },

  async getKeywordOverview(keyword: string, database = 'se'): Promise<SemrushSignal[]> {
    const cacheKey = `kw:${keyword}`
    const cached = await getCached(cacheKey, 'keyword_overview', database)
    if (cached) return cached as SemrushSignal[]

    const key = getApiKey()
    const url = `${BASE}/?type=phrase_this&key=${key}&export_columns=Ph,Nq,Cp,Co,Nr,Td&phrase=${encodeURIComponent(keyword)}&database=${database}`
    const raw = await semrushFetch(url)
    const rows = parseSemrushCSV(raw)
    const signals = rows.map(row => ({
      source: 'semrush' as const,
      entity_type: 'keyword' as const,
      domain: '',
      keyword: row['Ph'] || keyword,
      market: database,
      timestamp: new Date().toISOString(),
      metric_name: 'keyword_volume',
      metric_value: parseInt(row['Nq'] || '0', 10),
      confidence: 0.85,
      priority_signal: false,
      raw: row,
    }))

    await setCache(cacheKey, 'keyword_overview', database, signals)
    return signals
  },

  async getBacklinksOverview(domain: string): Promise<SemrushSignal[]> {
    const cached = await getCached(domain, 'backlinks', 'global')
    if (cached) return cached as SemrushSignal[]

    const key = getApiKey()
    const url = `https://api.semrush.com/analytics/v1/?key=${key}&type=backlinks_overview&target=${encodeURIComponent(domain)}&target_type=root_domain&export_columns=ascore,total,domains_num,urls_num,ips_num,ipclasses_num,follows_num,nofollows_num`
    const raw = await semrushFetch(url)
    const rows = parseSemrushCSV(raw)
    const signals = normalizeBacklinks(rows, domain)

    await setCache(domain, 'backlinks', 'global', signals)
    return signals
  },

  async getKeywordGap(domain1: string, domain2: string, database = 'se'): Promise<SemrushSignal[]> {
    const cacheKey = `gap:${domain1}:${domain2}`
    const cached = await getCached(cacheKey, 'keyword_gap', database)
    if (cached) return cached as SemrushSignal[]

    const key = getApiKey()
    const url = `${BASE}/?type=domain_domains&key=${key}&export_columns=Ph,Nq,Kd,Po1,Po2&domains[0]=${encodeURIComponent(domain1)}&domains[1]=${encodeURIComponent(domain2)}&database=${database}&display_limit=20`
    const raw = await semrushFetch(url)
    const rows = parseSemrushCSV(raw)
    const signals = normalizeGap(rows, domain1, domain2, database)

    await setCache(cacheKey, 'keyword_gap', database, signals)
    return signals
  },

  async runDomainAudit(domain: string): Promise<DomainAuditResult> {
    const [overview, keywords, competitors, backlinks] = await Promise.all([
      this.getDomainOverview(domain).catch(() => [] as SemrushSignal[]),
      this.getOrganicKeywords(domain).catch(() => [] as SemrushSignal[]),
      this.getCompetitors(domain).catch(() => [] as SemrushSignal[]),
      this.getBacklinksOverview(domain).catch(() => [] as SemrushSignal[]),
    ])

    const allSignals = [...overview, ...keywords, ...competitors, ...backlinks]
    const prioritySignals = allSignals.filter(s => s.priority_signal)

    // Extract summary metrics
    const overviewRaw = (overview[0]?.raw ?? {}) as Record<string, string>
    const backlinkRaw = (backlinks[0]?.raw ?? {}) as Record<string, string>

    return {
      signals: allSignals,
      priority_signals: prioritySignals,
      summary: {
        domain,
        organic_traffic: parseInt(overviewRaw['Ot'] || '0', 10),
        organic_keywords: parseInt(overviewRaw['Or'] || '0', 10),
        authority_score: parseInt(overviewRaw['Rk'] || backlinkRaw['ascore'] || '0', 10),
        backlinks: parseInt(backlinkRaw['total'] || '0', 10),
        referring_domains: parseInt(backlinkRaw['domains_num'] || '0', 10),
        top_competitors: competitors
          .slice(0, 5)
          .map(c => c.keyword as string)
          .filter(Boolean),
        has_alerts: prioritySignals.length > 0,
      },
    }
  },
}
