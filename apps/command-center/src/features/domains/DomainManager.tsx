// ─── Wavult OS — Domain Manager ───────────────────────────────────────────────
// Cloudflare zone status with NS check, expiry, and filter

import { useState, useEffect, useCallback } from 'react'
import { Globe, RefreshCw, AlertTriangle, CheckCircle, Clock, ExternalLink, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DomainStatus = 'active' | 'pending' | 'inactive' | 'unknown'

interface Domain {
  name: string
  status: DomainStatus
  nsConfigured: boolean
  nsRequired: string[]
  currentNS: string[]
  expires: string | null
  zoneId: string
  registrar?: string
}

type FilterState = 'all' | 'active' | 'pending' | 'expiring'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CF_NS_AMY = 'amy.ns.cloudflare.com'
const CF_NS_DYLAN = 'dylan.ns.cloudflare.com'
// Additional known Cloudflare NS pairs
const CF_NS_PAIRS: string[][] = [
  [CF_NS_AMY, CF_NS_DYLAN],
  ['arch.ns.cloudflare.com', 'gina.ns.cloudflare.com'],
  ['adam.ns.cloudflare.com', 'olga.ns.cloudflare.com'],
]

function daysUntilExpiry(expires: string | null): number | null {
  if (!expires) return null
  return Math.floor((new Date(expires).getTime() - Date.now()) / 86_400_000)
}

function StatusBadge({ status }: { status: DomainStatus }) {
  const map: Record<DomainStatus, { bg: string; color: string; label: string }> = {
    active:   { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', label: 'ACTIVE' },
    pending:  { bg: 'rgba(234,179,8,0.15)',    color: '#eab308', label: 'PENDING' },
    inactive: { bg: 'rgba(239,68,68,0.15)',    color: '#ef4444', label: 'INACTIVE' },
    unknown:  { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'UNKNOWN' },
  }
  const s = map[status]
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  )
}

function NSStatus({ domain }: { domain: Domain }) {
  if (domain.nsConfigured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span style={{ fontSize: 12 }}>CF ✅</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#eab308' }}>
      <AlertTriangle className="w-3.5 h-3.5" />
      <span style={{ fontSize: 12 }}>Sätt NS</span>
    </div>
  )
}

// ─── DomainManager ────────────────────────────────────────────────────────────

export function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>('all')
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchDomains = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/domains/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDomains(data.domains ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDomains() }, [fetchDomains, lastRefresh])

  // Poll 30s
  useEffect(() => {
    const t = setInterval(() => setLastRefresh(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const filtered = domains.filter(d => {
    if (filter === 'all') return true
    if (filter === 'active') return d.status === 'active'
    if (filter === 'pending') return d.status === 'pending'
    if (filter === 'expiring') {
      const days = daysUntilExpiry(d.expires)
      return days !== null && days < 90
    }
    return true
  })

  const active = domains.filter(d => d.status === 'active').length
  const pending = domains.filter(d => d.status !== 'active').length

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-base">Domains</span>
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 600 }}>
            {active}/{domains.length}
          </span>
          {pending > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(234,179,8,0.12)', color: '#eab308', fontWeight: 600 }}>
              {pending} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLastRefresh(Date.now())}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterState)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            <option value="all">Alla</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expiring">Förfaller snart</option>
          </select>
        </div>
      </div>

      {/* NS hint banner */}
      {domains.some(d => !d.nsConfigured) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(234,179,8,0.08)', borderBottom: '1px solid rgba(234,179,8,0.15)', fontSize: 12, color: '#fbbf24' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          NS att sätta: <strong>{CF_NS_AMY}</strong> + <strong>{CF_NS_DYLAN}</strong>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div style={{ padding: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}
        {!error && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Domän', 'Status', 'NS', 'Förfaller', ''].map((h, i) => (
                  <th key={i} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', background: 'rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const days = daysUntilExpiry(d.expires)
                const expiring = days !== null && days < 90
                return (
                  <tr
                    key={d.name}
                    onClick={() => setSelectedDomain(selectedDomain?.name === d.name ? null : d)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: selectedDomain?.name === d.name ? 'rgba(16,185,129,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '9px 14px', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: d.status === 'active' ? '#22c55e' : d.status === 'pending' ? '#eab308' : '#ef4444',
                          }}
                        />
                        {d.name}
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <NSStatus domain={d} />
                    </td>
                    <td style={{ padding: '9px 14px', color: expiring ? '#eab308' : 'var(--color-text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {expiring && <Clock className="w-3.5 h-3.5" />}
                        {d.expires ?? '—'}
                        {days !== null && days < 90 && (
                          <span style={{ fontSize: 11, color: days < 30 ? '#ef4444' : '#eab308' }}>({days}d)</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <a
                        href={`https://dash.cloudflare.com/?to=/:account/${d.zoneId}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selectedDomain && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 14, background: 'rgba(0,0,0,0.25)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{selectedDomain.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>
              <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Zone ID</div>
              <div style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{selectedDomain.zoneId}</div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Aktuella NS</div>
              <div style={{ color: selectedDomain.nsConfigured ? '#22c55e' : '#eab308' }}>
                {selectedDomain.currentNS.length > 0 ? selectedDomain.currentNS.join(', ') : 'Ej konfigurerade'}
              </div>
            </div>
            {!selectedDomain.nsConfigured && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 4 }}>NS att sätta hos registrar</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CF_NS_PAIRS[0].map(ns => (
                    <code key={ns} style={{ padding: '2px 8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 4, color: '#fbbf24', fontSize: 11 }}>
                      {ns}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
