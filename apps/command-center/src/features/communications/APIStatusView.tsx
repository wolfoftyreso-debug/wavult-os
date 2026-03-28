import { useState, useEffect } from 'react'

interface APIService {
  id: string
  name: string
  icon: string
  status: 'ok' | 'error' | 'degraded' | 'unknown'
  lastPing: string
  latency_ms: number | null
  configured: boolean
  endpoint: string
  description: string
}

const INITIAL_SERVICES: APIService[] = [
  {
    id: 'revolut',
    name: 'Revolut Business API',
    icon: '💳',
    status: 'ok',
    lastPing: '2026-03-26T09:10:00Z',
    latency_ms: 142,
    configured: true,
    endpoint: 'api.revolut.com',
    description: 'Intercompany transfers + EUR/AED payments',
  },
  {
    id: 'stripe',
    name: 'Stripe API',
    icon: '⚡',
    status: 'degraded',
    lastPing: '2026-03-26T09:08:00Z',
    latency_ms: 890,
    configured: true,
    endpoint: 'api.stripe.com',
    description: 'Kundbetalningar + fakturering',
  },
  {
    id: '46elks',
    name: '46elks SMS',
    icon: '📱',
    status: 'ok',
    lastPing: '2026-03-27T19:00:00Z',
    latency_ms: 98,
    configured: true,
    endpoint: 'api.46elks.com',
    description: 'Primär SMS-leverantör (Sverige) — 14 200 SEK kredit · Avsändare: Wavult · Inget dedikerat +46-nummer ännu',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: '🗄️',
    status: 'ok',
    lastPing: '2026-03-26T09:11:00Z',
    latency_ms: 38,
    configured: true,
    endpoint: 'supabase.io/rest/v1',
    description: 'Databas, auth & realtime',
  },
  {
    id: 'aws-ecs',
    name: 'AWS ECS',
    icon: '☁️',
    status: 'ok',
    lastPing: '2026-03-26T09:09:00Z',
    latency_ms: 67,
    configured: true,
    endpoint: 'ecs.eu-north-1.amazonaws.com',
    description: 'Container orchestration — hypbit cluster',
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    icon: '🔧',
    status: 'ok',
    lastPing: '2026-03-26T09:05:00Z',
    latency_ms: 201,
    configured: true,
    endpoint: 'api.github.com',
    description: 'CI/CD pipelines — wolfoftyreso-debug/hypbit',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    icon: '🌐',
    status: 'ok',
    lastPing: '2026-03-26T09:10:00Z',
    latency_ms: 22,
    configured: true,
    endpoint: 'api.cloudflare.com',
    description: 'CDN, DNS & DDoS-skydd',
  },
]

const STATUS_CONFIG = {
  ok: { label: '✅ OK', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', dot: 'bg-green-400' },
  degraded: { label: '⚠️ Degraderad', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
  error: { label: '❌ Fel', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  unknown: { label: '? Okänd', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', dot: 'bg-gray-400' },
}

function LatencyBar({ ms }: { ms: number }) {
  const max = 1000
  const pct = Math.min((ms / max) * 100, 100)
  const color = ms < 100 ? 'bg-green-400' : ms < 400 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400 w-12 text-right">{ms} ms</span>
    </div>
  )
}

export function APIStatusView() {
  const [services, setServices] = useState<APIService[]>(INITIAL_SERVICES)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  function simulateRefresh() {
    setRefreshing(true)
    setTimeout(() => {
      setServices(prev => prev.map(s => ({
        ...s,
        lastPing: new Date().toISOString(),
        // Slightly jitter latency
        latency_ms: s.latency_ms !== null
          ? Math.max(10, s.latency_ms + Math.floor((Math.random() - 0.5) * 40))
          : null,
      })))
      setLastRefresh(new Date())
      setRefreshing(false)
    }, 1200)
  }

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(simulateRefresh, 60000)
    return () => clearInterval(interval)
  }, [])

  const okCount = services.filter(s => s.status === 'ok').length
  const errorCount = services.filter(s => s.status === 'error' || s.status === 'degraded').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${errorCount === 0 ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
          <span className="text-sm font-semibold text-white">
            API-status {errorCount === 0 ? '— Allt operativt' : `— ${errorCount} problem`}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-600 font-mono">
            Uppdaterad {lastRefresh.toLocaleTimeString('sv-SE')}
          </span>
          <button
            onClick={simulateRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0D0F1A] border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.16] transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? 'animate-spin' : ''}>↻</span>
            {refreshing ? 'Checkar…' : 'Refresha'}
          </button>
        </div>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0D0F1A] rounded-xl border border-green-500/20 p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{okCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Operativa</div>
        </div>
        <div className={`bg-[#0D0F1A] rounded-xl border p-3 text-center ${errorCount > 0 ? 'border-yellow-500/20' : 'border-white/[0.06]'}`}>
          <div className={`text-2xl font-bold ${errorCount > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>{errorCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Problem</div>
        </div>
        <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] p-3 text-center">
          <div className="text-2xl font-bold text-gray-300">{services.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Totalt</div>
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {services.map(svc => {
          const sc = STATUS_CONFIG[svc.status]
          return (
            <div
              key={svc.id}
              className={`bg-[#0D0F1A] rounded-xl border p-4 ${
                svc.status !== 'ok' ? sc.bg : 'border-white/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{svc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{svc.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      svc.configured
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                    }`}>
                      {svc.configured ? '✓ Konfigurerad' : '✗ Ej konfigurerad'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{svc.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-700 font-mono">{svc.endpoint}</span>
                    <span className="text-xs text-gray-600">
                      Senaste anrop: {new Date(svc.lastPing).toLocaleTimeString('sv-SE')}
                    </span>
                  </div>
                  {svc.latency_ms !== null && (
                    <div className="mt-2">
                      <LatencyBar ms={svc.latency_ms} />
                    </div>
                  )}
                  {svc.latency_ms === null && (
                    <div className="mt-2 text-xs text-red-400">Ingen respons — timeout</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
