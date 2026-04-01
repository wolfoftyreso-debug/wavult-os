// ─── Wavult OS — Infrastructure Monitor ──────────────────────────────────────
// ECS services, domain DNS status, CloudWatch log viewer
// Live polling — no mocks — real data from backend

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Server, Globe, RefreshCw, Terminal, RotateCcw,
  AlertTriangle, CheckCircle, XCircle,
  Activity, Layers,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ECSService {
  name: string
  running: number
  desired: number
  status: 'running' | 'degraded' | 'stopped'
  taskArn?: string
}

interface DomainEntry {
  name: string
  status: 'active' | 'pending' | 'inactive'
  subdomain?: string
  ns?: string
}

interface LogLine {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string
  message: string
}

interface InfraStatus {
  cluster: string
  services: ECSService[]
  domains: DomainEntry[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ServiceStatus({ svc }: { svc: ECSService }) {
  const ok = svc.running >= svc.desired && svc.desired > 0
  const partial = svc.running > 0 && svc.running < svc.desired

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
      color: ok ? '#22c55e' : partial ? '#eab308' : '#ef4444',
    }}>
      {ok ? <CheckCircle className="w-3.5 h-3.5" />
          : partial ? <AlertTriangle className="w-3.5 h-3.5" />
          : <XCircle className="w-3.5 h-3.5" />}
      {svc.running}/{svc.desired}
    </div>
  )
}

function logColor(level: string): string {
  const l = level.toUpperCase()
  if (l === 'ERROR') return '#f87171'
  if (l === 'WARN') return '#fbbf24'
  if (l === 'DEBUG') return '#6b7280'
  return '#94a3b8' // INFO
}

function logBg(level: string): string {
  const l = level.toUpperCase()
  if (l === 'ERROR') return 'rgba(239,68,68,0.06)'
  if (l === 'WARN') return 'rgba(234,179,8,0.04)'
  return 'transparent'
}

// ─── InfraMonitor ─────────────────────────────────────────────────────────────

export function InfraMonitor() {
  const [infra, setInfra] = useState<InfraStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string>('')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [restarting, setRestarting] = useState<Set<string>>(new Set())
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [logLastRefresh, setLogLastRefresh] = useState(Date.now())
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Fetch infra status
  const fetchInfra = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/infra/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setInfra(data)
      if (!selectedService && data.services?.length > 0) {
        setSelectedService(data.services[0].name)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch logs
  const fetchLogs = useCallback(async (serviceName: string) => {
    if (!serviceName) return
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/infra/logs/${encodeURIComponent(serviceName)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      // Auto-scroll to bottom
      setTimeout(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
      }, 50)
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { fetchInfra() }, [fetchInfra, lastRefresh])
  useEffect(() => { if (selectedService) fetchLogs(selectedService) }, [selectedService, fetchLogs, logLastRefresh])

  // Poll infra 30s, logs 10s
  useEffect(() => {
    const t1 = setInterval(() => setLastRefresh(Date.now()), 30_000)
    const t2 = setInterval(() => setLogLastRefresh(Date.now()), 10_000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  const handleRestart = async (serviceName: string) => {
    setRestarting(prev => new Set(prev).add(serviceName))
    try {
      await fetch(`/api/infra/restart/${encodeURIComponent(serviceName)}`, { method: 'POST' })
      setTimeout(() => fetchInfra(), 3000)
    } catch {
      // ignore
    } finally {
      setRestarting(prev => { const s = new Set(prev); s.delete(serviceName); return s })
    }
  }

  const runningServices = infra?.services.filter(s => s.running >= s.desired && s.desired > 0).length ?? 0
  const totalServices = infra?.services.length ?? 0
  const activeDomains = infra?.domains.filter(d => d.status === 'active').length ?? 0
  const totalDomains = infra?.domains.length ?? 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', gap: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-base">Infrastructure</span>
        </div>
        <button
          onClick={() => setLastRefresh(Date.now())}
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.08)' }}>{error}</div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ECS Services */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>ECS Services — {infra?.cluster ?? 'wavult'}</span>
            </div>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
              background: runningServices === totalServices ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
              color: runningServices === totalServices ? '#22c55e' : '#eab308',
            }}>
              {runningServices}/{totalServices}
            </span>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            {!infra?.services?.length ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {loading ? 'Hämtar...' : 'Inga tjänster'}
              </div>
            ) : infra.services.map((svc, i) => {
              const isRestarting = restarting.has(svc.name)
              return (
                <div
                  key={svc.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: 'rgba(0,0,0,0.15)',
                  }}
                >
                  <ServiceStatus svc={svc} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {svc.name}
                  </span>
                  <button
                    onClick={() => handleRestart(svc.name)}
                    disabled={isRestarting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 5, fontSize: 11, color: 'var(--color-text-secondary)', cursor: isRestarting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <RotateCcw className={`w-3 h-3 ${isRestarting ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                  <button
                    onClick={() => setSelectedService(svc.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      background: selectedService === svc.name ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${selectedService === svc.name ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 5, fontSize: 11, color: selectedService === svc.name ? '#22d3ee' : 'var(--color-text-secondary)', cursor: 'pointer',
                    }}
                  >
                    <Terminal className="w-3 h-3" />
                    Logs
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Domains */}
        {infra?.domains && infra.domains.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Domains & DNS</span>
              </div>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                background: activeDomains === totalDomains ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                color: activeDomains === totalDomains ? '#22c55e' : '#eab308',
              }}>
                {activeDomains}/{totalDomains}
              </span>
            </div>

            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
              {infra.domains.map((d, i) => (
                <div
                  key={d.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: 'rgba(0,0,0,0.15)',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: d.status === 'active' ? '#22c55e' : d.status === 'pending' ? '#eab308' : '#ef4444',
                  }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                    background: d.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                    color: d.status === 'active' ? '#22c55e' : '#eab308',
                    letterSpacing: '0.04em',
                  }}>
                    {d.status.toUpperCase()}
                  </span>
                  {d.subdomain && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{d.subdomain}</span>
                  )}
                  {d.ns && (
                    <span style={{ fontSize: 11, color: d.ns.includes('cloudflare') ? '#22c55e' : '#eab308' }}>
                      {d.ns.includes('cloudflare') ? 'CF ✅' : '⚠️ NS'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Log Viewer */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet-400" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Log Viewer</span>
            </div>
            <div className="flex items-center gap-2">
              {infra?.services && infra.services.length > 0 && (
                <select
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }}
                >
                  {infra.services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              )}
              <button
                onClick={() => setLogLastRefresh(Date.now())}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div
            ref={logContainerRef}
            style={{
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'auto',
              height: 280, background: 'rgba(0,0,0,0.4)',
              fontFamily: 'ui-monospace, monospace', fontSize: 11,
            }}
          >
            {logsLoading && logs.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--color-text-tertiary)' }}>Hämtar logs...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--color-text-tertiary)' }}>Inga loggar tillgängliga</div>
            ) : logs.map((line, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 10, padding: '3px 10px',
                  background: logBg(line.level),
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                }}
              >
                <span style={{ color: '#475569', flexShrink: 0 }}>
                  {new Date(line.timestamp).toLocaleTimeString('sv-SE')}
                </span>
                <span style={{ color: logColor(line.level), fontWeight: 700, flexShrink: 0, width: 40 }}>
                  {line.level.slice(0, 4)}
                </span>
                <span style={{ color: logColor(line.level), flex: 1, wordBreak: 'break-all' }}>
                  {line.message}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity className="w-3 h-3" />
            Auto-refresh var 10s · <span style={{ color: '#f87171' }}>ERROR</span> · <span style={{ color: '#fbbf24' }}>WARN</span> · <span style={{ color: '#94a3b8' }}>INFO</span>
          </div>
        </section>
      </div>
    </div>
  )
}
