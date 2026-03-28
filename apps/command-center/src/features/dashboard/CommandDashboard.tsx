import { useState, useEffect, useRef } from 'react'
import { ThailandCountdown } from '../thailand/ThailandCountdown'
import { TeamStatusWidget } from '../team/TeamStatusWidget'
import { ProjectProgressWidget } from '../projects/ProjectProgressWidget'
import { QuickLinksWidget } from '../quicklinks/QuickLinksWidget'
import { HealthOverviewWidget } from '../entity/HealthOverviewWidget'

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const SYSTEM_STATUS = [
  { name: 'hypbit-api', service: 'ECS', env: 'eu-north-1', status: 'healthy', uptime: 99.8, latency: 42, lastCheck: '30s ago' },
  { name: 'quixzoom-frontend', service: 'CloudFront', env: 'Global', status: 'healthy', uptime: 100, latency: 18, lastCheck: '1m ago' },
  { name: 'optical-insight-eu', service: 'CF Pages', env: 'Edge', status: 'degraded', uptime: 0, latency: 0, lastCheck: 'pending deploy' },
  { name: 'hypbit-db', service: 'Supabase', env: 'eu-north-1', status: 'healthy', uptime: 99.7, latency: 11, lastCheck: '45s ago' },
  { name: 'cf-workers', service: 'Cloudflare', env: 'Global', status: 'degraded', uptime: 97.2, latency: 89, lastCheck: '2m ago' },
]

const TEAM_ACTIVITY = [
  { name: 'Erik Svensson',             role: 'Chairman & Group CEO',      task: 'Systembygge, strategi & marknadsföring', status: 'active',  since: '11:00', color: '#8B5CF6' },
  { name: 'Leon Russo De Cerame',      role: 'CEO – Sälj & Execution',    task: 'Hela säljavdelningen · Q1 execution',                   status: 'active',  since: '09:00', color: '#10B981' },
  { name: 'Winston Bjarnemark',        role: 'CFO',                       task: 'Ekonomisk infrastruktur · betafärdiga system',        status: 'active',  since: '09:15', color: '#3B82F6' },
  { name: 'Dennis Bjarnemark',         role: 'Board / Chief Legal',       task: 'Bolagsjuridik · avtal · dokument',                status: 'idle',    since: '08:45', color: '#F59E0B' },
  { name: 'Johan Berglund',            role: 'Group CTO',                 task: 'Drift · konton/APIer · support · rapporter',         status: 'active',  since: '10:30', color: '#06B6D4' },
]

const QUICK_LINKS = [
  { name: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '☁️', color: '#FF9900', sub: 'eu-north-1 · ECS' },
  { name: 'Supabase', url: 'https://supabase.com/dashboard', icon: '🗄️', color: '#3ECF8E', sub: 'hypbit project' },
  { name: 'GitHub', url: 'https://github.com/wolfoftyreso-debug', icon: '🐙', color: '#888', sub: 'wolfoftyreso-debug' },
  { name: 'Stripe', url: 'https://dashboard.stripe.com', icon: '💳', color: '#635BFF', sub: 'Payments' },
  { name: 'Cloudflare', url: 'https://dash.cloudflare.com', icon: '🔥', color: '#F6821F', sub: '2 zones active' },
  { name: 'Loopia Mail', url: 'https://webmail.loopia.se', icon: '✉️', color: '#007AFF', sub: 'erik@hypbit.com' },
]

const GITHUB_RUNS = [
  { repo: 'hypbit', workflow: 'Deploy API to ECS', status: 'success', branch: 'main', actor: 'winston', time: '14 min ago', duration: '3m 22s' },
  { repo: 'hypbit', workflow: 'TypeScript Check', status: 'success', branch: 'feat/crm-views', actor: 'johan', time: '1h ago', duration: '1m 8s' },
  { repo: 'hypbit', workflow: 'Deploy API to ECS', status: 'failure', branch: 'main', actor: 'erik', time: '3h ago', duration: '2m 51s' },
  { repo: 'quixzoom-landing', workflow: 'CF Pages Deploy', status: 'success', branch: 'main', actor: 'johan', time: '5h ago', duration: '52s' },
  { repo: 'hypbit', workflow: 'Lint + Test', status: 'success', branch: 'feat/sales-dash', actor: 'johan', time: '6h ago', duration: '48s' },
]

// ─── Mock uptime data (24h, one point per hour) ────────────────────────────────
const UPTIME_POINTS = Array.from({ length: 24 }, (_, i) => {
  const hour = (new Date().getHours() - 23 + i + 24) % 24
  const base = 100
  const noise = i === 8 ? -8 : i === 15 ? -3 : Math.random() * 0.6 - 0.3
  return { hour, value: Math.min(100, base + noise) }
})

// ─── Colors ────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  healthy: '#34C759',
  degraded: '#FF9500',
  down: '#FF3B30',
}

const RUN_COLOR: Record<string, string> = {
  success: '#34C759',
  failure: '#FF3B30',
  running: '#007AFF',
  cancelled: '#8E8E93',
}

const TEAM_STATUS_COLOR: Record<string, string> = {
  active: '#34C759',
  meeting: '#007AFF',
  idle: '#8E8E93',
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || '#8E8E93'
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color,
      boxShadow: status === 'healthy' ? `0 0 6px ${color}60` : 'none',
      flexShrink: 0,
    }} />
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const color = RUN_COLOR[status] || '#8E8E93'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: color + '18', color, border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {status.toUpperCase()}
    </span>
  )
}

function UptimeGraph({ points }: { points: { hour: number; value: number }[] }) {
  const W = 400, H = 60, pad = 4
  const minV = 90, maxV = 100.5
  const pts = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (W - 2 * pad)
    const y = H - pad - ((p.value - minV) / (maxV - minV)) * (H - 2 * pad)
    return `${x},${y}`
  })
  const pathD = `M ${pts.join(' L ')}`
  const fillD = `${pathD} L ${W - pad},${H} L ${pad},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34C759" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#34C759" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#uptimeGrad)" />
      <path d={pathD} fill="none" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

// ─── Live Activity Feed ───────────────────────────────────────────────────────

interface LiveEvt {
  id: string
  actor: string
  initials: string
  color: string
  action: string
  target: string
  age: number
  category: 'deploy' | 'sale' | 'task' | 'system' | 'alert' | 'comms'
}

const EVT_POOL: Omit<LiveEvt, 'id' | 'age'>[] = [
  { actor: 'Leon', initials: 'LR', color: '#10B981', action: 'stängde leadsamtal med', target: 'Stockholms Hamnar AB', category: 'sale' },
  { actor: 'Johan', initials: 'JB', color: '#06B6D4', action: 'deployade quiXzoom API →', target: 'ECS eu-north-1', category: 'deploy' },
  { actor: 'Dennis', initials: 'DB', color: '#F59E0B', action: 'signerade NDA med', target: 'Trafikverket', category: 'task' },
  { actor: 'Winston', initials: 'WB', color: '#3B82F6', action: 'godkände faktura', target: 'AWS €1,240', category: 'sale' },
  { actor: 'Leon', initials: 'LR', color: '#10B981', action: 'lade till kontakt:', target: 'Malmö Stad infrastruktur', category: 'comms' },
  { actor: 'Johan', initials: 'JB', color: '#06B6D4', action: 'fixade bug i', target: 'zoomer-wallet', category: 'task' },
  { actor: 'System', initials: 'SY', color: '#EF4444', action: 'API latency spike', target: 'quiXzoom → 320ms', category: 'alert' },
  { actor: 'Dennis', initials: 'DB', color: '#F59E0B', action: 'bolagshandlingar klara för', target: 'Landvex AB', category: 'task' },
  { actor: 'Winston', initials: 'WB', color: '#3B82F6', action: 'uppdaterade cashflow Q2', target: '2026', category: 'task' },
  { actor: 'System', initials: 'SY', color: '#34C759', action: 'CF Tunnel', target: 'auto-restarted ✓', category: 'system' },
  { actor: 'Leon', initials: 'LR', color: '#10B981', action: 'skickade pitch-deck till', target: 'Göteborgs Stad (Landvex)', category: 'comms' },
  { actor: 'Johan', initials: 'JB', color: '#06B6D4', action: 'CI/CD live för', target: 'quiXzoom-landing CF Pages', category: 'deploy' },
  { actor: 'System', initials: 'SY', color: '#34C759', action: '47 nya uppdrag i', target: 'quiXzoom Stockholm', category: 'system' },
]

const CAT_ICON: Record<string, string> = { deploy: '🚀', sale: '💰', task: '✅', system: '⚙️', alert: '⚡', comms: '💬' }

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

function LiveActivityFeed() {
  const [events, setEvents] = useState<LiveEvt[]>(() =>
    [0, 1, 2, 3, 4].map((i) => ({ ...EVT_POOL[i], id: `seed-${i}`, age: (i + 1) * 40 * 1000 }))
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Age events every second
  useEffect(() => {
    const t = setInterval(() => setEvents(prev => prev.map(e => ({ ...e, age: e.age + 1000 }))), 1000)
    return () => clearInterval(t)
  }, [])

  // Inject new event every 9-16s
  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const pool = EVT_POOL[Math.floor(Math.random() * EVT_POOL.length)]
        setEvents(prev => [{ ...pool, id: `e-${Date.now()}`, age: 0 }, ...prev].slice(0, 7))
        schedule()
      }, 9000 + Math.random() * 7000)
    }
    schedule()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>Live — Teamet jobbar</SectionHeading>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#34C759' }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#34C759' }} />
          LIVE
        </span>
      </div>
      <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
        {events.map((evt, i) => (
          <div
            key={evt.id}
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              opacity: Math.max(0.35, 1 - i * 0.1),
              transition: 'opacity 0.5s ease',
            }}
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: evt.color + '25', color: evt.color, border: `1px solid ${evt.color}40` }}
            >
              {evt.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-200">
                <span className="font-semibold" style={{ color: evt.color }}>{evt.actor}</span>
                {' '}{evt.action}{' '}
                <span className="text-gray-400">{evt.target}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[9px] text-gray-600 font-mono tabular-nums">{formatMs(evt.age)}</span>
              <span className="text-xs">{CAT_ICON[evt.category]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Nörd-rekrytering ─────────────────────────────────────────────────────────

const TALENT_CHANNELS = [
  { label: 'GitHub', sub: 'openclaw/openclaw — contributors med merged PRs', status: 'Aktivt', color: '#34C759' },
  { label: 'ClawHub', sub: 'Skill-publicister som förstår systemet på djupet', status: 'Scouting', color: '#F59E0B' },
  { label: 'Discord clawd', sub: 'Hjälpsamma nördar i communityt', status: 'Läser', color: '#8B5CF6' },
  { label: 'Reddit r/openclaw', sub: 'Frustrerande engagerade = bäst att rekrytera', status: 'Bevakar', color: '#3B82F6' },
  { label: 'Twitter/X', sub: '#openclaw, @openclawai — genomtänkta trådar', status: 'Passivt', color: '#06B6D4' },
]

const TALENT_MUST: string[] = ['Aktiv GitHub (senaste 3 mån)', 'TypeScript / Node.js', 'AI-agenter & automatisering', 'Europa eller Asien']
const TALENT_BONUS: string[] = ['Vision AI / computer vision', 'React Native / Expo', 'Thailand-ready', 'Självgående — levererar utan struktur']
const TALENT_RED: string[] = ['Pratar mycket — committar lite', 'Kräver kontor / fast struktur']

function TalentRadarWidget() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <SectionHeading>🎯 Nörd-rekrytering</SectionHeading>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full mb-3"
            style={{ background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B30' }}>
            IGÅNG
          </span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
        >
          {expanded ? 'Dölj' : 'Visa detaljer'}
        </button>
      </div>

      {/* Summary always visible */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-5 mb-3">
        <p className="text-sm text-gray-300 mb-4">
          Varsam rekrytering av <span className="text-white font-semibold">OpenClaw/AI-agent-nördar</span> — folk som faktiskt bygger, inte pratar om att bygga. Skapa relation INNAN rekrytering.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-mono uppercase mb-2">Måste ha</p>
            <div className="space-y-1">
              {TALENT_MUST.map(t => (
                <div key={t} className="flex items-center gap-2 text-xs text-gray-300">
                  <span style={{ color: '#34C759' }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-mono uppercase mb-2">Röda flaggor</p>
            <div className="space-y-1">
              {TALENT_RED.map(t => (
                <div key={t} className="flex items-center gap-2 text-xs text-gray-400">
                  <span style={{ color: '#EF4444' }}>✗</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Channel breakdown (expanded) */}
      {expanded && (
        <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
          {TALENT_CHANNELS.map((ch, i) => (
            <div
              key={ch.label}
              className="flex items-center gap-4 px-5 py-3.5"
              style={{ borderBottom: i < TALENT_CHANNELS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: ch.color + '20', color: ch.color, border: `1px solid ${ch.color}30` }}
              >
                {ch.label.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{ch.label}</p>
                <p className="text-xs text-gray-500 truncate">{ch.sub}</p>
              </div>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: ch.color + '15', color: ch.color, border: `1px solid ${ch.color}30` }}
              >
                {ch.status}
              </span>
            </div>
          ))}
          <div className="px-5 py-3 border-t border-surface-border">
            <p className="text-xs text-gray-500 font-mono uppercase mb-1.5">Bonus-profil</p>
            <div className="flex flex-wrap gap-2">
              {TALENT_BONUS.map(b => (
                <span key={b} className="text-xs text-gray-400 px-2 py-0.5 rounded-full"
                  style={{ background: '#F59E0B10', border: '1px solid #F59E0B20' }}>
                  ⭐ {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function CommandDashboard() {
  const [expandedRuns, setExpandedRuns] = useState(false)
  const allHealthy = SYSTEM_STATUS.every(s => s.status === 'healthy')
  const degraded = SYSTEM_STATUS.filter(s => s.status === 'degraded').length
  const avgUptime = (SYSTEM_STATUS.reduce((s, x) => s + x.uptime, 0) / SYSTEM_STATUS.length).toFixed(1)

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-sm font-semibold text-white">Command Center</h1>
        <p className="text-sm text-gray-300 mt-1">Wavult Group — Operationellt kontrollcenter</p>
      </div>

      {/* Thailand Workcamp Countdown */}
      <div className="max-w-sm">
        <ThailandCountdown />
      </div>

      {/* Widgets — Team, Projects, Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TeamStatusWidget />
        <ProjectProgressWidget />
        <QuickLinksWidget />
      </div>

      {/* Entity Health Overview */}
      <HealthOverviewWidget />

      {/* Live Activity Feed */}
      <LiveActivityFeed />

      {/* Nörd-rekrytering */}
      <TalentRadarWidget />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'System Status',
            value: allHealthy ? 'All OK' : `${degraded} degraded`,
            delta: `${SYSTEM_STATUS.length} services`,
            color: allHealthy ? '#34C759' : '#FF9500',
            live: true,
          },
          {
            label: 'Avg Uptime',
            value: `${avgUptime}%`,
            delta: 'Senaste 24h',
            color: '#3B82F6',
          },
          {
            label: 'Active Deploys',
            value: String(GITHUB_RUNS.filter(r => r.status === 'running').length || '0'),
            delta: `${GITHUB_RUNS.filter(r => r.status === 'success').length} lyckade idag`,
            color: '#8B5CF6',
          },
          {
            label: 'Team Online',
            value: String(TEAM_ACTIVITY.filter(t => t.status !== 'idle').length),
            delta: `av ${TEAM_ACTIVITY.length} totalt`,
            color: '#FF9500',
            live: true,
          },
        ].map((s, i) => (
          <div key={i} className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</span>
              {s.live && (
                <span className="flex items-center gap-1 text-xs" style={{ color: s.color }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
                  LIVE
                </span>
              )}
            </div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
            {s.delta && <div className="mt-2 text-xs text-gray-500">{s.delta}</div>}
          </div>
        ))}
      </div>

      {/* System Status + Uptime Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div>
          <SectionHeading>System Status</SectionHeading>
          <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            {SYSTEM_STATUS.map((svc, i) => (
              <div
                key={svc.name}
                style={{ borderBottom: i < SYSTEM_STATUS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <StatusDot status={svc.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{svc.name}</span>
                    <span className="text-xs text-gray-600 bg-surface-overlay px-1.5 py-0.5 rounded">
                      {svc.service}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{svc.env}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono tabular-nums" style={{ color: STATUS_COLOR[svc.status] }}>
                    {svc.uptime}% up
                  </div>
                  <div className="text-xs text-gray-600 tabular-nums">{svc.latency}ms · {svc.lastCheck}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Uptime Graph */}
        <div>
          <SectionHeading>Uptime — Senaste 24h</SectionHeading>
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold text-white tabular-nums">{avgUptime}%</div>
                <div className="text-xs text-gray-500 mt-0.5">genomsnitt alla tjänster</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400">Uptime %</span>
              </div>
            </div>
            <UptimeGraph points={UPTIME_POINTS} />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600 tabular-nums">
                {new Date(Date.now() - 23 * 3600000).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-xs text-gray-600 tabular-nums">Nu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <SectionHeading>Snabblänkar</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface-raised border border-surface-border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:bg-surface-overlay transition-colors group"
              style={{ textDecoration: 'none' }}
            >
              <span style={{ fontSize: 24 }}>{link.icon}</span>
              <span
                className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors"
                style={{ lineHeight: 1.3 }}
              >
                {link.name}
              </span>
              <span className="text-xs text-gray-600">{link.sub}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Team Activity + Active Deploys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Activity */}
        <div>
          <SectionHeading>Team-aktivitet (mock)</SectionHeading>
          <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            {TEAM_ACTIVITY.map((member, i) => (
              <div
                key={member.name}
                style={{ borderBottom: i < TEAM_ACTIVITY.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: member.color + '22', color: member.color, border: `1px solid ${member.color}40` }}
                >
                  {member.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{member.name}</span>
                    <span className="text-xs text-gray-600">{member.role}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{member.task}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: TEAM_STATUS_COLOR[member.status],
                      boxShadow: member.status === 'active' ? `0 0 5px ${TEAM_STATUS_COLOR[member.status]}` : 'none',
                    }}
                  />
                  <span className="text-xs text-gray-500 tabular-nums">{member.since}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Deploys / GitHub Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionHeading>Aktiva Deploys</SectionHeading>
            <button
              onClick={() => setExpandedRuns(v => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {expandedRuns ? 'Visa färre' : 'Visa alla'}
            </button>
          </div>
          <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            {(expandedRuns ? GITHUB_RUNS : GITHUB_RUNS.slice(0, 4)).map((run, i) => {
              const list = expandedRuns ? GITHUB_RUNS : GITHUB_RUNS.slice(0, 4)
              return (
                <div
                  key={i}
                  style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <RunStatusBadge status={run.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{run.workflow}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {run.repo} · <span className="text-gray-600">{run.branch}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-400 tabular-nums">{run.time}</div>
                    <div className="text-xs text-gray-600 tabular-nums">{run.duration}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Entities (existing section, kept) */}
      <div>
        <SectionHeading>Entities</SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { name: 'Wavult Group Holding', code: 'WGH', jurisdiction: '🇦🇪 DIFC, Dubai', type: 'Holding', color: '#8B5CF6', products: ['Capital structure', 'IP ownership'] },
            { name: 'Wavult Technologies LLC', code: 'WTL', jurisdiction: '🇺🇸 Texas, USA', type: 'Operating', color: '#3B82F6', products: ['quiXzoom platform'] },
            { name: 'Wavult Intelligence UAB', code: 'WIU', jurisdiction: '🇱🇹 Vilnius, LT', type: 'Operating', color: '#06B6D4', products: ['Optic Insights Group'] },
          ].map((entity) => (
            <div key={entity.code} className="bg-surface-raised border border-surface-border rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: entity.color + '33', border: `1px solid ${entity.color}55` }}
                >
                  <span style={{ color: entity.color }}>{entity.code[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{entity.name}</p>
                  <p className="text-xs text-gray-500">{entity.jurisdiction}</p>
                </div>
              </div>
              <div className="space-y-1">
                {entity.products.map((p) => (
                  <div key={p} className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gray-600" />
                    {p}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-surface-border">
                <span className="text-xs text-gray-600">{entity.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
