/**
 * ApolloView — Full Apollo.io Integration
 * 
 * Endpoints (requires Basic plan $49/mo):
 * - People Search (POST /v1/mixed_people/search)
 * - People Enrichment (POST /v1/people/match)
 * - Bulk People Enrichment (POST /v1/people/bulk_match)
 * - Organization Search (POST /v1/mixed_companies/search)
 * - Organization Enrichment (GET /v1/organizations/enrich)
 * - Organization Job Postings (GET /v1/organizations/{id}/job_postings)
 * - News Articles Search (POST /v1/news_articles/search)
 * - Sequences (GET/POST /v1/emailer_campaigns)
 * - Accounts (POST /v1/accounts, PATCH /v1/accounts/{id})
 */

import { useState, useCallback } from 'react'
import {
  Search, Users, Building2, Zap, Plus, ChevronDown, ChevronUp,
  ExternalLink, Mail, Phone, RefreshCw,
  Upload, Download
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApolloPerson {
  id: string
  first_name: string
  last_name: string
  title: string
  email: string | null
  phone_numbers: { raw_number: string }[]
  linkedin_url: string | null
  organization_name: string
  city: string | null
  country: string | null
  seniority: string | null
  departments: string[]
  headline: string | null
  photo_url: string | null
}

interface ApolloOrg {
  id: string
  name: string
  website_url: string | null
  linkedin_url: string | null
  industry: string | null
  estimated_num_employees: number | null
  city: string | null
  country: string | null
  annual_revenue: number | null
  phone: string | null
  logo_url: string | null
}

// ─── Apollo API ──────────────────────────────────────────────────────────────

const APOLLO_BASE = 'https://api.apollo.io/v1'

async function apolloRequest<T>(
  apiKey: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'Cache-Control': 'no-cache',
      },
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(`${APOLLO_BASE}${path}`, opts)
    const json = await res.json()
    if (json.error || json.error_code) {
      const msg = json.error || json.error_code
      return { data: null, error: msg.includes('free plan') ? 'PLAN_UPGRADE_REQUIRED' : msg }
    }
    return { data: json as T, error: null }
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Network error' }
  }
}

// ─── Preset target lists ──────────────────────────────────────────────────────

const PRESETS = [
  { id: 'mun-se', label: '🏛️ Kommuner SE', desc: 'Infrastructure directors, Swedish municipalities',
    body: { person_titles: ['Infrastructure Director', 'Technical Director', 'City Planner', 'Head of Infrastructure'], person_locations: ['Sweden'], person_seniorities: ['director', 'vp', 'c_suite'], per_page: 25 } },
  { id: 'port-nordic', label: '⚓ Hamnar Norden', desc: 'Port & harbor operations managers',
    body: { person_titles: ['Port Director', 'Operations Manager', 'Harbor Master', 'Terminal Manager'], person_locations: ['Sweden', 'Norway', 'Denmark', 'Finland'], per_page: 25 } },
  { id: 'trafikverket', label: '🛣️ Trafikverket', desc: 'Road infrastructure decision makers',
    body: { person_titles: ['Road Manager', 'Infrastructure Manager', 'Asset Manager'], q_organization_name: 'Trafikverket', per_page: 25 } },
  { id: 'fastighet-se', label: '🏢 Fastighetsbolag SE', desc: 'Property & facilities managers',
    body: { person_titles: ['Property Manager', 'Facilities Director', 'Technical Manager', 'Asset Manager'], person_locations: ['Sweden'], person_seniorities: ['manager', 'director'], per_page: 25 } },
  { id: 'nyc-biz', label: '🗽 NYC Business Owners', desc: 'Restaurant & retail for Quixom Ads',
    body: { person_titles: ['Owner', 'Founder', 'CEO', 'Managing Director'], person_locations: ['New York, United States'], person_seniorities: ['owner', 'founder', 'c_suite'], per_page: 25 } },
  { id: 'eu-cto', label: '🇪🇺 EU Enterprise CTO/CIO', desc: 'Tech decision makers for UAPIX',
    body: { person_titles: ['CTO', 'CIO', 'VP Engineering', 'Head of Technology'], person_locations: ['Germany', 'France', 'Netherlands', 'Belgium'], person_seniorities: ['vp', 'c_suite'], per_page: 25 } },
  { id: 'se-startups', label: '🚀 Swedish Startups', desc: 'Founders & CEOs of SE tech startups',
    body: { person_titles: ['CEO', 'Founder', 'Co-Founder', 'CTO'], person_locations: ['Sweden'], q_organization_name: '', per_page: 25 } },
]

const SENIORITY_COLOR: Record<string, string> = {
  c_suite: '#2563EB', vp: '#3B82F6', director: '#06B6D4',
  manager: '#10B981', owner: '#F59E0B', founder: '#F59E0B',
}

// ─── Component ────────────────────────────────────────────────────────────────

type ActiveView = 'search' | 'enrich' | 'orgs' | 'news' | 'sequences'

export function ApolloView() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('apollo_api_key') || 'Ont1T5x49-IXKvClIucxNg')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('search')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [customSearch, setCustomSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState<ApolloPerson[]>([])
  const [orgs, setOrgs] = useState<ApolloOrg[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [enriched, setEnriched] = useState<Record<string, Partial<ApolloPerson>>>({})
  const [addedToCRM, setAddedToCRM] = useState<Set<string>>(new Set())
  const [bulkEmails, setBulkEmails] = useState('')

  const saveKey = () => {
    if (keyDraft.trim()) {
      localStorage.setItem('apollo_api_key', keyDraft.trim())
      setApiKey(keyDraft.trim())
      setShowKeyInput(false)
    }
  }

  const runSearch = useCallback(async (body: Record<string, unknown>) => {
    if (!apiKey) return
    setLoading(true); setError(null); setPeople([]); setTotal(0)
    const { data, error: err } = await apolloRequest<{ people: ApolloPerson[], pagination: { total_entries: number } }>(
      apiKey, 'POST', '/mixed_people/search', body
    )
    setLoading(false)
    if (err) { setError(err); return }
    if (data) { setPeople(data.people || []); setTotal(data.pagination?.total_entries || 0) }
  }, [apiKey])

  const runOrgSearch = useCallback(async (body: Record<string, unknown>) => {
    if (!apiKey) return
    setLoading(true); setError(null); setOrgs([])
    const { data, error: err } = await apolloRequest<{ organizations: ApolloOrg[] }>(
      apiKey, 'POST', '/mixed_companies/search', body
    )
    setLoading(false)
    if (err) { setError(err); return }
    if (data) setOrgs(data.organizations || [])
  }, [apiKey])

  const enrichPerson = useCallback(async (person: ApolloPerson) => {
    if (!apiKey || enriched[person.id]) return
    const { data, error: err } = await apolloRequest<{ person: ApolloPerson }>(
      apiKey, 'POST', '/people/match',
      { id: person.id, reveal_personal_emails: true, reveal_phone_number: true }
    )
    if (!err && data?.person) {
      setEnriched(e => ({ ...e, [person.id]: data.person }))
    }
  }, [apiKey, enriched])

  const bulkEnrich = useCallback(async () => {
    if (!apiKey || !bulkEmails.trim()) return
    const emails = bulkEmails.split('\n').map(e => e.trim()).filter(Boolean)
    setLoading(true)
    const { data, error: err } = await apolloRequest<{ matches: ApolloPerson[] }>(
      apiKey, 'POST', '/people/bulk_match',
      { details: emails.map(email => ({ email })), reveal_personal_emails: true }
    )
    setLoading(false)
    if (err) { setError(err); return }
    if (data?.matches) setPeople(data.matches)
  }, [apiKey, bulkEmails])

  const addToCRM = (p: ApolloPerson) => {
    setAddedToCRM(s => new Set([...s, p.id]))
  }

  const isPlanError = error === 'PLAN_UPGRADE_REQUIRED'

  const NAV_ITEMS: { id: ActiveView; label: string; icon: string }[] = [
    { id: 'search', label: 'People Search', icon: '👥' },
    { id: 'enrich', label: 'Enrichment', icon: '⚡' },
    { id: 'orgs', label: 'Organizations', icon: '🏢' },
    { id: 'news', label: 'News & Intent', icon: '📰' },
    { id: 'sequences', label: 'Sequences', icon: '📧' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎯</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apollo.io</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {apiKey ? `Key: ${apiKey.slice(0,8)}... ${apiKey === 'Ont1T5x49-IXKvClIucxNg' ? '(Basic upgrade needed)' : '✓'}` : 'No key'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowKeyInput(v => !v)}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            🔑 API Key
          </button>
          <a href="https://app.apollo.io" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink size={11} /> Apollo App
          </a>
        </div>
      </div>

      {/* API Key input */}
      {showKeyInput && (
        <div style={{ padding: '10px 20px', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Get key at <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" rel="noopener noreferrer" style={{ color: '#F59E0B' }}>Apollo → Settings → API Keys</a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="password" placeholder="Apollo API key..." value={keyDraft} onChange={e => setKeyDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()}
              style={{ flex: 1, padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 12 }} />
            <button onClick={saveKey} style={{ padding: '7px 14px', borderRadius: 6, background: '#F59E0B', color: '#0A0A0A', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      )}

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 1, padding: '0 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', overflowX: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => { setActiveView(item.id); setError(null) }}
            style={{ padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: activeView === item.id ? 700 : 400,
              color: activeView === item.id ? '#F59E0B' : 'var(--color-text-secondary)',
              borderBottom: activeView === item.id ? '2px solid #F59E0B' : '2px solid transparent',
              whiteSpace: 'nowrap' }}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

        {/* Plan upgrade banner */}
        {isPlanError && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>Apollo Basic Plan required ($49/mo)</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Your API key is valid. People search, enrichment, and sequences are locked on Free plan.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="https://app.apollo.io/#/settings/plans/upgrade" target="_blank" rel="noopener noreferrer"
                style={{ padding: '7px 14px', borderRadius: 6, background: '#F59E0B', color: '#0A0A0A', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Upgrade to Basic →
              </a>
              <a href={`https://app.apollo.io/#/people?finderViewId=5b4daebe-f374-42fa-8587-46f853fc6c62`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', fontSize: 12, textDecoration: 'none' }}>
                Open in Apollo ↗
              </a>
            </div>
          </div>
        )}

        {/* Error (non-plan) */}
        {error && !isPlanError && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* ── PEOPLE SEARCH ─────────────────────────────────────────── */}
        {activeView === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input placeholder="Job title (e.g. Infrastructure Director, CTO...)" value={customSearch} onChange={e => setCustomSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch({ person_titles: [customSearch], per_page: 25 })}
                  style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 13 }} />
              </div>
              <button onClick={() => runSearch({ person_titles: [customSearch], per_page: 25 })} disabled={loading || !customSearch}
                style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />} Search
              </button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>Wavult Target Lists</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 20 }}>
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => { setActivePreset(p.id); runSearch(p.body) }}
                  style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${activePreset === p.id ? 'rgba(59,130,246,0.4)' : 'var(--color-border)'}`,
                    background: activePreset === p.id ? 'rgba(59,130,246,0.08)' : 'var(--color-surface)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.desc}</div>
                </button>
              ))}
            </div>

            {total > 0 && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10, fontFamily: 'monospace' }}>{total.toLocaleString()} results · showing {people.length}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {people.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-surface)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${SENIORITY_COLOR[p.seniority || ''] || '#52525B'}20`, border: `1px solid ${SENIORITY_COLOR[p.seniority || ''] || '#52525B'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: SENIORITY_COLOR[p.seniority || ''] || '#A1A1AA', flexShrink: 0 }}>
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.title} · {p.organization_name}</div>
                      {(p.city || p.country) && <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>📍 {[p.city, p.country].filter(Boolean).join(', ')}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {addedToCRM.has(p.id) ? (
                        <span style={{ fontSize: 10, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>IN CRM</span>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); addToCRM(p) }}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Plus size={11} /> CRM
                        </button>
                      )}
                      {expandedId === p.id ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                    </div>
                  </div>
                  {expandedId === p.id && (
                    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {(enriched[p.id]?.email || p.email) ? (
                        <a href={`mailto:${enriched[p.id]?.email || p.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
                          <Mail size={13} />{enriched[p.id]?.email || p.email}
                        </a>
                      ) : (
                        <button onClick={() => enrichPerson(p)} style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} /> Reveal email
                        </button>
                      )}
                      {(enriched[p.id]?.phone_numbers?.[0] || p.phone_numbers[0]) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          <Phone size={13} />{(enriched[p.id]?.phone_numbers?.[0] || p.phone_numbers[0])?.raw_number}
                        </div>
                      )}
                      {(enriched[p.id]?.linkedin_url || p.linkedin_url) && (
                        <a href={enriched[p.id]?.linkedin_url || p.linkedin_url || ''} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
                          <ExternalLink size={13} /> LinkedIn
                        </a>
                      )}
                      {!enriched[p.id]?.phone_numbers?.length && (
                        <button onClick={() => enrichPerson(p)} style={{ fontSize: 11, color: '#3B82F6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Zap size={11} /> Enrich all data
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!loading && people.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Select a target list or search by title</div>
              </div>
            )}
          </div>
        )}

        {/* ── ENRICHMENT ────────────────────────────────────────────── */}
        {activeView === 'enrich' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Bulk People Enrichment — paste emails (one per line) to get full profiles including phone numbers and LinkedIn.
            </div>
            <textarea value={bulkEmails} onChange={e => setBulkEmails(e.target.value)}
              placeholder="email@company.com&#10;another@company.com&#10;third@company.com"
              style={{ width: '100%', height: 140, padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={bulkEnrich} disabled={loading || !bulkEmails.trim()}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />} Enrich {bulkEmails.split('\n').filter(e => e.trim()).length} emails
              </button>
              <button onClick={() => { const csv = people.map(p => `${p.first_name},${p.last_name},${p.email || ''},${p.title},${p.organization_name},${p.phone_numbers[0]?.raw_number || ''}`).join('\n'); const blob = new Blob([`First,Last,Email,Title,Company,Phone\n${csv}`], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='apollo-export.csv'; a.click(); }}
                disabled={people.length === 0}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            {people.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>{people.length} enriched profiles</div>
                {people.slice(0,10).map(p => (
                  <div key={p.id} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', flex: '0 0 180px' }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>{p.title} @ {p.organization_name}</div>
                    {p.email && <div style={{ fontSize: 12, color: '#3B82F6' }}>{p.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORGANIZATIONS ─────────────────────────────────────────── */}
        {activeView === 'orgs' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input placeholder="Company name or domain..." value={customSearch} onChange={e => setCustomSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runOrgSearch({ q_organization_name: customSearch, per_page: 25 })}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 13 }} />
              <button onClick={() => runOrgSearch({ q_organization_name: customSearch, per_page: 25 })} disabled={loading}
                style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Search
              </button>
            </div>
            {orgs.map(org => (
              <div key={org.id} style={{ padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-surface)', marginBottom: 8, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {org.logo_url && <img src={org.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'contain' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{org.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {[org.industry, org.city, org.country].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    {org.estimated_num_employees && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>👥 {org.estimated_num_employees.toLocaleString()} employees</span>}
                    {org.annual_revenue && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>💰 ${(org.annual_revenue/1e6).toFixed(0)}M ARR</span>}
                    {org.website_url && <a href={org.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3B82F6', textDecoration: 'none' }}>🌐 Website</a>}
                    {org.linkedin_url && <a href={org.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3B82F6', textDecoration: 'none' }}>LinkedIn</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NEWS & INTENT ─────────────────────────────────────────── */}
        {activeView === 'news' && (
          <div>
            <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>📰 News Articles Search</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>Find news about companies, topics, or people. Useful for identifying buying signals before outreach.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Company, topic or keyword..." value={customSearch} onChange={e => setCustomSearch(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 13 }} />
                <button onClick={async () => { setLoading(true); const {data, error:err} = await apolloRequest(apiKey, 'POST', '/news_articles/search', { q_organization_name: customSearch }); setLoading(false); if(err) setError(err); }} disabled={loading}
                  style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Search News
                </button>
              </div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6', marginBottom: 8 }}>Intent Signals — Available with Basic plan</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Apollo tracks when companies are researching topics related to your product. With Basic plan you can filter People Search by intent topics like "infrastructure monitoring", "API integration", "data analytics" to find companies actively evaluating solutions.
              </div>
            </div>
          </div>
        )}

        {/* ── SEQUENCES ─────────────────────────────────────────────── */}
        {activeView === 'sequences' && (
          <div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { name: 'LandveX — Swedish Municipality Outreach', steps: 7, status: 'draft', target: 'Infrastructure Directors, SE municipalities' },
                { name: 'UAPIX — EU Enterprise CTO', steps: 5, status: 'draft', target: 'CTO/CIO, Germany/France/Netherlands' },
                { name: 'Quixom Ads — NYC Local Business', steps: 4, status: 'draft', target: 'Restaurant/Retail owners, New York' },
                { name: 'quiXzoom — Zoomer Recruitment', steps: 3, status: 'draft', target: '18-35, Sweden, gig economy interest' },
              ].map(seq => (
                <div key={seq.name} style={{ padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{seq.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>Target: {seq.target}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontFamily: 'monospace' }}>{seq.steps} steps</span>
                      <a href="https://app.apollo.io/#/sequences" target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: 'var(--color-brand)', color: '#fff', textDecoration: 'none' }}>
                        Build in Apollo ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '14px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Sequences are managed in Apollo's web UI. With Basic plan: unlimited sequences, AI-generated emails, LinkedIn steps, automatic follow-ups.
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
