import { useState, useEffect, useCallback } from 'react'
import {
  Server, Globe, GitBranch, Activity, RefreshCw, CheckCircle,
  AlertTriangle, XCircle, Clock, TrendingUp, Zap, Database,
} from 'lucide-react'
import { ThailandCountdown } from '../thailand/ThailandCountdown'
import { TeamStatusWidget } from '../team/TeamStatusWidget'
import { ProjectProgressWidget } from '../projects/ProjectProgressWidget'
import { QuickLinksWidget } from '../quicklinks/QuickLinksWidget'
import { HealthOverviewWidget } from '../entity/HealthOverviewWidget'
import { RevenueDashboard } from './RevenueDashboard'

const API_BASE = (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.VITE_API_URL ?? 'https://api.wavult.com'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ECSService { name: string; running: number; desired: number; status: 'running' | 'degraded' | 'stopped' }
interface DomainStatus { name: string; status: string; ns?: string }
interface Repo { id: string; name: string; fullName: string; pushedAt: string | null; source: string; private: boolean }
interface VentureStats { total?: number; active?: number; entities?: number }

interface InfraData {
  cluster: string
  services: ECSService[]
  domains: DomainStatus[]
  timestamp: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (d < 60) return `${Math.round(d)}s sedan`
  if (d < 3600) return `${Math.round(d / 60)}m sedan`
  if (d < 86400) return `${Math.round(d / 3600)}h sedan`
  return `${Math.round(d / 86400)}d sedan`
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'running' || status === 'active' ? '#34C759'
    : status === 'degraded' ? '#FF9500'
    : '#FF3B30'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}60` }} />
}

function Skeleton({ w = '100%', h = 16 }: { w?: string | number; h?: number }) {
  return <div className="animate-pulse rounded" style={{ width: w, height: h, background: 'rgba(255,255,255,0.06)' }} />
}

// ─── ECS Status Card ─────────────────────────────────────────────────────────

function ECSStatusCard() {
  const [data, setData] = useState<InfraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/infra/status`, { signal: AbortSignal.timeout(10_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta infra-status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_(); const t = setInterval(fetch_, 60_000); return () => clearInterval(t) }, [fetch_])

  const services = data?.services ?? []
  const running = services.filter(s => s.status === 'running').length
  const degraded = services.filter(s => s.status === 'degraded').length
  const stopped = services.filter(s => s.status === 'stopped').length

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-blue-400" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-widest">ECS Services</span>
        </div>
        <button onClick={fetch_} className="text-white/30 hover:text-white/60 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-2"><Skeleton /><Skeleton w="80%" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-red-400"><XCircle size={12} />{error}</div>
      ) : services.length === 0 ? (
        <p className="text-xs text-white/30">Inga ECS-tjänster hittades</p>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-xs text-white/60">{running} running</span></div>
            {degraded > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-xs text-orange-400">{degraded} degraded</span></div>}
            {stopped > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-red-400">{stopped} stopped</span></div>}
          </div>
          <div className="space-y-2">
            {services.slice(0, 6).map(svc => (
              <div key={svc.name} className="flex items-center gap-2">
                <StatusDot status={svc.status} />
                <span className="text-xs text-white/70 flex-1 truncate">{svc.name}</span>
                <span className="text-xs font-mono text-white/30">{svc.running}/{svc.desired}</span>
              </div>
            ))}
            {services.length > 6 && <p className="text-xs text-white/30">+{services.length - 6} fler</p>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Domains Card ─────────────────────────────────────────────────────────────

function DomainsCard() {
  const [domains, setDomains] = useState<DomainStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/domains/status`, { signal: AbortSignal.timeout(10_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json() as { domains: DomainStatus[] }
      setDomains(d.domains ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cloudflare ej nåbar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-orange-400" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Domäner</span>
        </div>
        <button onClick={fetch_} className="text-white/30 hover:text-white/60 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !domains.length ? (
        <div className="space-y-2"><Skeleton /><Skeleton w="70%" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-red-400"><XCircle size={12} />{error}</div>
      ) : domains.length === 0 ? (
        <p className="text-xs text-white/30">Inga domäner hittades</p>
      ) : (
        <div className="space-y-2">
          {domains.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <StatusDot status={d.status === 'active' ? 'running' : 'degraded'} />
              <span className="text-xs text-white/70 flex-1">{d.name}</span>
              <span className={`text-xs font-mono ${d.status === 'active' ? 'text-green-400' : 'text-orange-400'}`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Repos Card ───────────────────────────────────────────────────────────────

function ReposCard() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/git/repos?source=github`, { signal: AbortSignal.timeout(10_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json() as { repos: Repo[] }
      setRepos((d.repos ?? []).slice(0, 8))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GitHub ej nåbar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-purple-400" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Senaste repos</span>
        </div>
        <button onClick={fetch_} className="text-white/30 hover:text-white/60 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !repos.length ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} w={`${70 + i * 5}%`} />)}</div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-red-400"><XCircle size={12} />{error}</div>
      ) : repos.length === 0 ? (
        <p className="text-xs text-white/30">Inga repos hittades</p>
      ) : (
        <div className="space-y-2">
          {repos.map(r => (
            <div key={r.id} className="flex items-center gap-2">
              <span className="text-xs text-white/70 flex-1 truncate">{r.name}</span>
              <span className="text-xs text-white/30 font-mono">{relTime(r.pushedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── API Health Card ──────────────────────────────────────────────────────────

interface HealthCheck { url: string; label: string; status: 'ok' | 'error' | 'loading' }

function APIHealthCard() {
  const ENDPOINTS: Array<{ url: string; label: string }> = [
    { url: `${API_BASE}/api/health`, label: 'Wavult OS API' },
    { url: 'https://api.quixzoom.com/health', label: 'quiXzoom API' },
  ]

  const [checks, setChecks] = useState<HealthCheck[]>(ENDPOINTS.map(e => ({ ...e, status: 'loading' })))

  const runChecks = useCallback(async () => {
    setChecks(ENDPOINTS.map(e => ({ ...e, status: 'loading' })))
    const results = await Promise.all(
      ENDPOINTS.map(async (e) => {
        try {
          const r = await fetch(e.url, { signal: AbortSignal.timeout(5_000) })
          return { ...e, status: r.ok ? 'ok' as const : 'error' as const }
        } catch {
          return { ...e, status: 'error' as const }
        }
      })
    )
    setChecks(results)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { runChecks(); const t = setInterval(runChecks, 30_000); return () => clearInterval(t) }, [runChecks])

  const allOk = checks.every(c => c.status === 'ok')

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-green-400" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-widest">API Health</span>
        </div>
        {allOk && <CheckCircle size={12} className="text-green-400" />}
        {!allOk && checks.some(c => c.status === 'error') && <AlertTriangle size={12} className="text-orange-400" />}
      </div>
      <div className="space-y-3">
        {checks.map(c => (
          <div key={c.url} className="flex items-center gap-2">
            {c.status === 'loading' ? <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
              : c.status === 'ok' ? <span className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 5px #34C75960' }} />
              : <span className="w-2 h-2 rounded-full bg-red-500" />}
            <span className="text-xs text-white/70 flex-1">{c.label}</span>
            <span className={`text-xs font-mono ${c.status === 'ok' ? 'text-green-400' : c.status === 'error' ? 'text-red-400' : 'text-white/30'}`}>
              {c.status === 'loading' ? '…' : c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Ventures Card ────────────────────────────────────────────────────────────

function VenturesCard() {
  const [stats, setStats] = useState<VentureStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/venture-engine/stats`, { signal: AbortSignal.timeout(8_000) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: VentureStats) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'Aktiva ventures', value: stats?.active ?? '—', icon: <TrendingUp size={12} className="text-blue-400" /> },
    { label: 'Entiteter', value: stats?.entities ?? '—', icon: <Database size={12} className="text-purple-400" /> },
    { label: 'Totalt', value: stats?.total ?? '—', icon: <Zap size={12} className="text-yellow-400" /> },
  ]

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} className="text-yellow-400" />
        <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Venture Engine</span>
      </div>
      {loading ? (
        <div className="space-y-2"><Skeleton /><Skeleton w="60%" /></div>
      ) : !stats ? (
        <p className="text-xs text-white/30">Data saknas — venture-engine ej konfigurerad</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="text-center">
              <div className="flex justify-center mb-1">{k.icon}</div>
              <div className="text-lg font-bold font-mono text-white">{String(k.value)}</div>
              <div className="text-[10px] text-white/30">{k.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Quick Links ─────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { name: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '☁️', sub: 'eu-north-1 · ECS' },
  { name: 'Supabase', url: 'https://supabase.com/dashboard', icon: '🗄️', sub: 'hypbit project' },
  { name: 'GitHub', url: 'https://github.com/wolfoftyreso-debug', icon: '🐙', sub: 'wolfoftyreso-debug' },
  { name: 'Cloudflare', url: 'https://dash.cloudflare.com', icon: '🔥', sub: '6 zoner' },
  { name: 'Loopia Mail', url: 'https://webmail.loopia.se', icon: '✉️', sub: 'erik@hypbit.com' },
  { name: 'n8n', url: 'https://n8n.wavult.com', icon: '⚡', sub: 'Workflows' },
]

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function CommandDashboard() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-white">Command Center</h1>
          <p className="text-xs text-white/40 mt-0.5">Wavult Group — Operationellt kontrollcenter</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {now.toLocaleTimeString('sv-SE')}
        </div>
      </div>

      {/* Revenue */}
      <RevenueDashboard />

      {/* Thailand Countdown */}
      <div className="max-w-sm">
        <ThailandCountdown />
      </div>

      {/* Live System Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ECSStatusCard />
        <DomainsCard />
        <APIHealthCard />
        <VenturesCard />
      </div>

      {/* Team + Projects + Quicklinks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TeamStatusWidget />
        <ProjectProgressWidget />
        <QuickLinksWidget />
      </div>

      {/* Entity Health */}
      <HealthOverviewWidget />

      {/* Latest Repos */}
      <ReposCard />

      {/* Quick Links */}
      <div>
        <h2 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Snabblänkar</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-neutral-900 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:bg-neutral-800 transition-colors"
              style={{ textDecoration: 'none' }}
            >
              <span style={{ fontSize: 24 }}>{link.icon}</span>
              <span className="text-xs font-medium text-white/70">{link.name}</span>
              <span className="text-[10px] text-white/30">{link.sub}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Entities */}
      <div>
        <h2 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Entities</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { name: 'Wavult Group Holding', code: 'WGH', jurisdiction: '🇦🇪 DIFC, Dubai', type: 'Holding', color: '#2563EB', products: ['Capital structure', 'IP ownership'] },
            { name: 'Wavult Technologies LLC', code: 'WTL', jurisdiction: '🇺🇸 Texas, USA', type: 'Operating', color: '#3B82F6', products: ['quiXzoom platform'] },
            { name: 'Wavult Intelligence UAB', code: 'WIU', jurisdiction: '🇱🇹 Vilnius, LT', type: 'Operating', color: '#06B6D4', products: ['Optic Insights Group'] },
          ].map((entity) => (
            <div key={entity.code} className="bg-neutral-900 border border-white/10 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: entity.color + '33', border: `1px solid ${entity.color}55` }}
                >
                  <span style={{ color: entity.color }}>{entity.code[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{entity.name}</p>
                  <p className="text-xs text-white/40">{entity.jurisdiction}</p>
                </div>
              </div>
              <div className="space-y-1">
                {entity.products.map((p) => (
                  <div key={p} className="text-xs text-white/40 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    {p}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <span className="text-xs text-white/30">{entity.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
