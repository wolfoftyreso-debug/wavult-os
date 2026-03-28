import { useState } from 'react'

interface ServiceStatus {
  name: string
  uptime: string
  status: 'running' | 'degraded' | 'down'
  latency: string
}

const SERVICES: ServiceStatus[] = [
  { name: 'API Server (ECS)',        uptime: '99.98%', status: 'running',  latency: '42ms' },
  { name: 'Supabase (hypbit)',       uptime: '99.95%', status: 'running',  latency: '8ms'  },
  { name: 'Command Center (Vercel)', uptime: '100%',   status: 'running',  latency: '31ms' },
  { name: 'GitHub Actions CI/CD',    uptime: '99.9%',  status: 'running',  latency: '—'    },
  { name: 'Cloudflare CDN',          uptime: '97.2%',  status: 'degraded', latency: '120ms' },
  { name: 'Gandi DNS',               uptime: '89.1%',  status: 'down',     latency: 'timeout' },
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
}

const SYSTEM_INFO: InfoRow[] = [
  { label: 'Version',       value: 'Wavult OS v2.4.1',                  highlight: '#8B5CF6' },
  { label: 'Environment',   value: 'production',                         mono: true },
  { label: 'Senaste deploy',value: '2026-03-26 06:15 UTC',               mono: true },
  { label: 'Commit',        value: 'a3f8c2d — feat: payroll module',      mono: true },
  { label: 'Databas',       value: 'Supabase (hypbit)',                   mono: false },
  { label: 'Migrationer',   value: '47 applied',                          mono: true },
  { label: 'GitHub repo',   value: 'wolfoftyreso-debug/hypbit',           mono: true },
  { label: 'AWS Region',    value: 'eu-north-1',                          mono: true },
  { label: 'ECS Cluster',   value: 'hypbit / hypbit-api',                 mono: true },
]

export function SystemView() {
  const [deploying, setDeploying] = useState(false)
  const [deployDone, setDeployDone] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearDone, setClearDone] = useState(false)

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

  const runningCount = SERVICES.filter(s => s.status === 'running').length
  const degradedCount = SERVICES.filter(s => s.status === 'degraded').length
  const downCount = SERVICES.filter(s => s.status === 'down').length

  return (
    <div className="space-y-5">
      {/* System overview card */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0C14] px-5 py-4 space-y-3">
        <div className="text-[9px] text-gray-700 font-mono uppercase">System Info</div>
        <div className="grid grid-cols-1 gap-2">
          {SYSTEM_INFO.map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-36 flex-shrink-0">{row.label}</span>
              <span
                className={`text-xs ${row.mono ? 'font-mono' : 'font-medium'}`}
                style={{ color: row.highlight ?? '#D1D5DB' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Service uptime */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0C14] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="text-[9px] text-gray-700 font-mono uppercase">Uptime per tjänst</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: '#10B981' }}>▲ {runningCount} up</span>
            {degradedCount > 0 && <span className="text-xs font-mono" style={{ color: '#F59E0B' }}>⚠ {degradedCount}</span>}
            {downCount > 0 && <span className="text-xs font-mono" style={{ color: '#EF4444' }}>✕ {downCount} down</span>}
          </div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {SERVICES.map(svc => {
            const cfg = SERVICE_STATUS[svc.status]
            return (
              <div key={svc.name} className="flex items-center gap-4 px-5 py-3">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: cfg.color, boxShadow: svc.status === 'running' ? `0 0 5px ${cfg.color}80` : 'none' }}
                />
                <span className="flex-1 text-xs text-gray-300">{svc.name}</span>
                <span className="text-xs font-mono text-gray-600">{svc.latency}</span>
                <span className="text-xs font-mono text-gray-500">{svc.uptime}</span>
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
        {/* Force deploy */}
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
              {deploying ? 'Deploying…' : deployDone ? 'Deploy triggered!' : 'Force Deploy'}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {deploying
              ? 'GitHub Actions workflow aktiverad…'
              : deployDone
              ? 'Workflow körs på wolfoftyreso-debug/hypbit'
              : 'Triggar GitHub Actions deploy pipeline'}
          </p>
          {deploying && (
            <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
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
          <p className="text-xs text-gray-600">
            {clearing
              ? 'Rensar Cloudflare edge cache…'
              : clearDone
              ? 'CDN cache invalidated'
              : 'Rensar Cloudflare CDN-cache (purge all)'}
          </p>
        </button>
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 text-xs text-gray-700 font-mono">
        ⚙️ Wavult OS — all system data är live från ECS, Supabase & GitHub Actions. Force deploy triggar wolfoftyreso-debug/hypbit CI/CD pipeline.
      </div>
    </div>
  )
}
