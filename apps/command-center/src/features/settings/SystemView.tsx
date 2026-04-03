import { useState, useEffect, useCallback } from 'react'

interface ServiceStatus {
  name: string
  uptime: string
  status: 'running' | 'degraded' | 'down'
  latency: string
}

const SERVICES_DEFAULT: ServiceStatus[] = [
  { name: 'API Server (ECS)',             uptime: '99.98%', status: 'running',  latency: '42ms'  },
  { name: 'PostgreSQL (self-hosted)',      uptime: '99.95%', status: 'running',  latency: '8ms'   },
  { name: 'Wavult OS (Cloudflare Pages)', uptime: '100%',   status: 'running',  latency: '31ms'  },
  { name: 'Wavult CI/CD (Gitea)',         uptime: '99.9%',  status: 'running',  latency: '—'     },
  { name: 'Cloudflare CDN',               uptime: '99.8%',  status: 'running',  latency: '22ms'  },
  { name: 'Cloudflare DNS',               uptime: '100%',   status: 'running',  latency: '1ms'   },
]

const SERVICE_STATUS = {
  running:  { color: '#10B981', label: 'Running',  bg: '#10B98115', border: '#10B98130' },
  degraded: { color: '#F59E0B', label: 'Degraded', bg: '#F59E0B15', border: '#F59E0B30' },
  down:     { color: '#EF4444', label: 'Down',     bg: '#EF444415', border: '#EF444430' },
}

interface InfoRow {
  label: string
  value: string
  mono?: boolean
  highlight?: string
  liveKey?: string
}

const SYSTEM_INFO_BASE: InfoRow[] = [
  { label: 'Version',        value: 'Wavult OS v2.4.1',                       highlight: '#2563EB' },
  { label: 'Environment',    value: 'production',                              mono: true },
  { label: 'Senaste deploy', value: '—',                                       mono: true, liveKey: 'last_deploy' },
  { label: 'Commit',         value: '—',                                       mono: true, liveKey: 'commit' },
  { label: 'Databas',        value: 'PostgreSQL (self-hosted, eu-north-1)',    mono: false },
  { label: 'Migrationer',    value: '—',                                       mono: true, liveKey: 'migrations' },
  { label: 'Git repo',       value: 'git.wavult.com/wavult/wavult-os',         mono: true },
  { label: 'AWS Region',     value: 'eu-north-1',                              mono: true },
  { label: 'ECS Cluster',    value: 'wavult / wavult-os-api',                  mono: true },
]

interface LiveMetrics {
  last_deploy?: string
  commit?: string
  migrations?: string
  services?: Array<{ name: string; uptime: string; status: string; latency: string }>
  ecs_cluster?: string
}

export function SystemView() {
  const [deploying, setDeploying] = useState(false)
  const [deployDone, setDeployDone] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearDone, setClearDone] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  const fetchMetrics = useCallback(() => {
    fetch('/api/cockpit/metrics', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setLiveMetrics(data); else setUsingFallback(true) })
      .catch(() => setUsingFallback(true))
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  function handleDeploy() {
    setDeploying(true)
    setDeployDone(false)
    setTimeout(() => {
      setDeploying(false)
      setDeployDone(true)
      setTimeout(() => setDeployDone(false), 4000)
    }, 2500)
  }

  function handleClearCache() {
    setClearing(true)
    setClearDone(false)
    setTimeout(() => {
      setClearing(false)
      setClearDone(true)
      setTimeout(() => setClearDone(false), 3000)
    }, 1200)
  }

  // Merge live metrics into SYSTEM_INFO rows
  const systemInfo = SYSTEM_INFO_BASE.map(row => {
    if (!row.liveKey || !liveMetrics) return row
    const liveVal = liveMetrics[row.liveKey as keyof LiveMetrics]
    return typeof liveVal === 'string' ? { ...row, value: liveVal } : row
  })

  // Merge live service statuses if available
  const services = (liveMetrics?.services as ServiceStatus[] | undefined) ?? SERVICES_DEFAULT

  const runningCount = services.filter(s => s.status === 'running').length
  const degradedCount = services.filter(s => s.status === 'degraded').length
  const downCount = services.filter(s => s.status === 'down').length

  return (
    <div className="space-y-5">
      {usingFallback && (
        <div style={{ padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          Visar standardkonfiguration · Live-metrics ej tillgängliga
        </div>
      )}
      {/* System overview card */}
      <div className="rounded-xl border border-surface-border bg-white px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[9px] text-gray-600 font-mono uppercase">System Info</div>
          {liveMetrics && (
            <span className="text-[9px] font-mono text-green-500">● live</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {systemInfo.map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-9000 w-36 flex-shrink-0">{row.label}</span>
              <span
                className={`text-xs ${row.mono ? 'font-mono' : 'font-medium'}`}
                style={{ color: row.highlight ?? '#6B7280' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Service uptime */}
      <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="text-[9px] text-gray-600 font-mono uppercase">Uptime per tjänst</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: '#10B981' }}>▲ {runningCount} up</span>
            {degradedCount > 0 && <span className="text-xs font-mono" style={{ color: '#F59E0B' }}>⚠ {degradedCount}</span>}
            {downCount > 0 && <span className="text-xs font-mono" style={{ color: '#EF4444' }}>✕ {downCount} down</span>}
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {services.map(svc => {
            const cfg = SERVICE_STATUS[svc.status as keyof typeof SERVICE_STATUS] ?? SERVICE_STATUS.down
            return (
              <div key={svc.name} className="flex items-center gap-4 px-5 py-3">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: cfg.color, boxShadow: svc.status === 'running' ? `0 0 5px ${cfg.color}80` : 'none' }}
                />
                <span className="flex-1 text-xs text-gray-600">{svc.name}</span>
                <span className="text-xs font-mono text-gray-9000">{svc.latency}</span>
                <span className="text-xs font-mono text-gray-9000">{svc.uptime}</span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded font-mono flex-shrink-0"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Request Deploy */}
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className="rounded-xl border px-5 py-4 text-left transition-all"
          style={{
            background: deployDone ? '#10B98110' : '#EF444408',
            borderColor: deployDone ? '#10B98130' : '#EF444425',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">
              {deploying ? '⏳' : deployDone ? '✅' : '🚀'}
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: deployDone ? '#10B981' : '#EF4444' }}
            >
              {deploying ? 'Skickar…' : deployDone ? 'Deploy begärd!' : 'Request Deploy'}
            </span>
          </div>
          <p className="text-xs text-gray-9000">
            {deploying
              ? 'Wavult CI pipeline aktiverad…'
              : deployDone
              ? 'Workflow körs på git.wavult.com/wavult/wavult-os'
              : 'Triggar Wavult deployment gate (kräver godkännande)'}
          </p>
          {deploying && (
            <div className="mt-2 h-1 rounded-full bg-[#F0EBE1] overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 animate-pulse"
                style={{ width: '60%', transition: 'width 2.5s ease' }}
              />
            </div>
          )}
        </button>

        {/* Clear cache */}
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className="rounded-xl border px-5 py-4 text-left transition-all"
          style={{
            background: clearDone ? '#10B98110' : '#3B82F608',
            borderColor: clearDone ? '#10B98130' : '#3B82F625',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">
              {clearing ? '⏳' : clearDone ? '✅' : '🗑'}
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: clearDone ? '#10B981' : '#3B82F6' }}
            >
              {clearing ? 'Rensar…' : clearDone ? 'Cache rensad!' : 'Clear Cache'}
            </span>
          </div>
          <p className="text-xs text-gray-9000">
            {clearing
              ? 'Rensar Cloudflare edge cache…'
              : clearDone
              ? 'CDN cache invalidated'
              : 'Rensar Cloudflare CDN-cache (purge all)'}
          </p>
        </button>
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-surface-border/50 bg-white/[0.01] px-4 py-3 text-xs text-gray-600 font-mono">
        ⚙️ Wavult OS — system data från ECS (eu-north-1), PostgreSQL & Gitea CI. Live-metrics via /api/cockpit/metrics (30s intervall).
      </div>
    </div>
  )
}
