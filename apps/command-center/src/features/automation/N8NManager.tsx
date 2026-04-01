// ─── Wavult OS — N8N Workflow Manager ────────────────────────────────────────
// Manage n8n automations — view, activate/deactivate workflows, last execution

import { useState, useEffect, useCallback } from 'react'
import { Zap, RefreshCw, Play, Pause, ExternalLink, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Workflow {
  id: string
  name: string
  active: boolean
  lastExecution: string | null
  lastExecutionStatus: 'success' | 'error' | 'running' | null
  nextExecution: string | null
  nodeCount: number
  tags: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (diff < 60_000) return 'just nu'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min sedan`
  if (h < 24) return `${h}h sedan`
  if (d < 7) return `${d}d sedan`
  const dt = new Date(dateStr)
  return dt.toLocaleDateString('sv-SE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

function ExecutionIcon({ status }: { status: Workflow['lastExecutionStatus'] }) {
  if (!status) return <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
  if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />
  if (status === 'error') return <XCircle className="w-3.5 h-3.5 text-red-400" />
  if (status === 'running') return <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
  return null
}

// ─── N8NManager ───────────────────────────────────────────────────────────────

const N8N_URL = 'https://n8n.wavult.com'

export function N8NManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/automation/workflows')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWorkflows(data.workflows ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows, lastRefresh])

  // Poll 30s
  useEffect(() => {
    const t = setInterval(() => setLastRefresh(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const toggleWorkflow = async (id: string, currentlyActive: boolean) => {
    setToggling(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/automation/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentlyActive }),
      })
      if (res.ok) {
        setWorkflows(wfs => wfs.map(w => w.id === id ? { ...w, active: !currentlyActive } : w))
      }
    } catch {
      // ignore
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const activeCount = workflows.filter(w => w.active).length

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-base">Automation — n8n</span>
          {!loading && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 600 }}>
              {activeCount}/{workflows.length} aktiva
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
          <a
            href={`${N8N_URL}/workflow/new`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none',
            }}
          >
            <Plus className="w-3 h-3" /> Nytt workflow
          </a>
        </div>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div style={{ padding: '12px 16px', color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        {!error && !loading && workflows.length === 0 && (
          <div style={{ padding: '24px 16px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Inga workflows hittades
          </div>
        )}

        {workflows.map((wf, i) => {
          const isToggling = toggling.has(wf.id)
          return (
            <div
              key={wf.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}
            >
              {/* Status indicator */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: wf.active ? '#22c55e' : '#6b7280',
                boxShadow: wf.active ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
              }} />

              {/* Name + tags */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wf.name}
                </div>
                {wf.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {wf.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-tertiary)' }}>
                        {tag}
                      </span>
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{wf.nodeCount} nodes</span>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: wf.active ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                color: wf.active ? '#22c55e' : '#9ca3af',
                letterSpacing: '0.04em', flexShrink: 0,
              }}>
                {wf.active ? 'ACTIVE' : 'INACTIVE'}
              </span>

              {/* Last execution */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <ExecutionIcon status={wf.lastExecutionStatus} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Senaste</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{relativeTime(wf.lastExecution)}</div>
                </div>
              </div>

              {/* Toggle button */}
              <button
                onClick={() => toggleWorkflow(wf.id, wf.active)}
                disabled={isToggling}
                title={wf.active ? 'Deactivate' : 'Activate'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  background: wf.active ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                  border: `1px solid ${wf.active ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  borderRadius: 5, fontSize: 11, fontWeight: 600,
                  color: wf.active ? '#f87171' : '#22c55e',
                  cursor: isToggling ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {isToggling ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : wf.active ? (
                  <><Pause className="w-3 h-3" /> Pausa</>
                ) : (
                  <><Play className="w-3 h-3" /> Aktivera</>
                )}
              </button>

              {/* Open in n8n */}
              <a
                href={`${N8N_URL}/workflow/${wf.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
                title="Öppna i n8n"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Uppdateras var 30s</span>
        </div>
        <a
          href={N8N_URL}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}
        >
          Öppna n8n <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
