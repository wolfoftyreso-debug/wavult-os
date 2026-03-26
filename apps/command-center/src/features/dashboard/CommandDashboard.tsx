import { useState } from 'react'
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
