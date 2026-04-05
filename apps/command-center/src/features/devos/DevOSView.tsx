import React, { useState, useEffect } from 'react'
import { useRole } from '../../shared/auth/RoleContext'

const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

// ── Types ────────────────────────────────────────────────────────────────

type TaskStatus = 'pending' | 'ready' | 'running' | 'done' | 'failed' | 'pending_approval'
type TaskType = string
type AgentRole = 'planner' | 'architect' | 'coder' | 'reviewer' | 'security' | 'devops' | 'debugger'

interface Task {
  id: string
  type: TaskType
  status: TaskStatus
  assigned_agent: AgentRole
  inputs: Record<string, unknown>
  outputs?: Record<string, unknown>
  dependencies: string[]
  requires_approval: boolean
  approved_by?: string
  error_message?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

interface TaskGraph {
  id: string
  intent: string
  project_id: string
  status: string
  created_by: string
  created_at: string
}

interface GraphWithTasks {
  graph: TaskGraph
  tasks: Task[]
  violations: Array<{ policy_id: string; severity: string; message: string }>
}

// ── Constants ────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<AgentRole, string> = {
  planner:   '#8B5CF6',
  architect: '#3B82F6',
  coder:     '#10B981',
  reviewer:  '#F59E0B',
  security:  '#EF4444',
  devops:    '#0A3D62',
  debugger:  '#6B7280',
}

const AGENT_ICONS: Record<AgentRole, string> = {
  planner:   '🧠',
  architect: '📐',
  coder:     '⌨️',
  reviewer:  '👁',
  security:  '🔒',
  devops:    '🚀',
  debugger:  '🔍',
}

const STATUS_CONFIG: Record<TaskStatus, { color: string; bg: string; label: string; icon: string }> = {
  pending:          { color: '#6B7280', bg: '#F3F4F6', label: 'Väntar',           icon: '○' },
  ready:            { color: '#3B82F6', bg: '#EFF6FF', label: 'Redo',             icon: '◎' },
  running:          { color: '#F59E0B', bg: '#FFFBEB', label: 'Kör...',           icon: '⟳' },
  done:             { color: '#10B981', bg: '#ECFDF5', label: 'Klar',             icon: '✓' },
  failed:           { color: '#EF4444', bg: '#FEF2F2', label: 'Fel',              icon: '✗' },
  pending_approval: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Väntar godkänn.', icon: '⏳' },
}

// ── Create Graph Form ────────────────────────────────────────────────────

function CreateGraphPanel({ onCreated }: { onCreated: (graphId: string) => void }) {
  const [intent, setIntent] = useState('')
  const [projectId, setProjectId] = useState('wavult/wavult-os')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!intent.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/devos/graphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass' },
        body: JSON.stringify({ intent: intent.trim(), project_id: projectId })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setIntent('')
      onCreated(data.graph_id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Projekt</label>
        <input
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="w-full text-xs border border-surface-border rounded-lg px-3 py-2 font-mono bg-white"
          placeholder="wavult/wavult-os"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Intent</label>
        <textarea
          value={intent}
          onChange={e => setIntent(e.target.value)}
          rows={3}
          className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white resize-none"
          placeholder="Beskriv vad du vill bygga..."
        />
      </div>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      <button
        type="submit"
        disabled={loading || !intent.trim()}
        className="w-full py-2.5 bg-[#0A3D62] text-[#F5F0E8] text-sm font-bold rounded-lg hover:bg-[#072E4A] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <span className="animate-spin">⟳</span> : '🧠'}
        {loading ? 'Planner Agent tänker...' : 'Skapa Task Graph'}
      </button>
    </form>
  )
}

// ── Task Card ────────────────────────────────────────────────────────────

function TaskCard({ task, onApprove, onReject }: {
  task: Task
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}) {
  const st = STATUS_CONFIG[task.status]
  const agentColor = AGENT_COLORS[task.assigned_agent as AgentRole] ?? '#6B7280'
  const agentIcon = AGENT_ICONS[task.assigned_agent as AgentRole] ?? '🤖'

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${task.status === 'running' ? 'ring-2 ring-amber-300' : ''}`}
      style={{ borderColor: st.color + '40', background: st.bg }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${task.status === 'running' ? 'animate-spin inline-block' : ''}`}
            style={{ color: st.color }}
          >
            {st.icon}
          </span>
          <span className="text-xs font-mono font-bold text-gray-800">{task.type}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: agentColor + '20', color: agentColor }}
          >
            {agentIcon} {task.assigned_agent}
          </span>
          {task.requires_approval && task.status !== 'done' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
              APPROVAL
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="text-[10px] font-semibold mb-2" style={{ color: st.color }}>{st.label}</div>

      {/* Error */}
      {task.error_message && (
        <div className="text-[10px] text-red-600 bg-red-50 rounded p-1.5 mb-2 font-mono">
          {task.error_message.slice(0, 100)}
        </div>
      )}

      {/* Inputs preview */}
      {task.inputs && Object.keys(task.inputs).length > 0 && (
        <div className="text-[9px] font-mono text-gray-500 bg-white/60 rounded p-1.5 mb-2 truncate">
          {JSON.stringify(task.inputs).slice(0, 80)}...
        </div>
      )}

      {/* Approval buttons */}
      {task.status === 'pending_approval' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onApprove(task.id)}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-[#0A3D62] text-white hover:bg-[#072E4A]"
          >
            ✓ Godkänn
          </button>
          <button
            onClick={() => onReject(task.id, 'Rejected by reviewer')}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
          >
            ✗ Avvisa
          </button>
        </div>
      )}

      {/* Done by */}
      {task.approved_by && (
        <div className="text-[9px] text-gray-400 mt-1">Godkänt av: {task.approved_by}</div>
      )}
    </div>
  )
}

// ── Graph Detail ─────────────────────────────────────────────────────────

function GraphDetail({ graphId, onBack }: { graphId: string; onBack: () => void }) {
  const [data, setData] = useState<GraphWithTasks | null>(null)
  const [loading, setLoading] = useState(true)
  const { role } = useRole()
  const canApprove = role?.id === 'group-ceo' || role?.id === 'cto' || role?.id === 'admin'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/devos/graphs/${graphId}`, {
          headers: { Authorization: 'Bearer bypass' }
        })
        if (res.ok && !cancelled) setData(await res.json())
      } catch { /* offline */ }
      if (!cancelled) setLoading(false)
    }
    load()
    const interval = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [graphId])

  const approve = async (taskId: string) => {
    await fetch(`${API}/api/devos/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass' },
      body: JSON.stringify({ approver: role?.label })
    })
  }

  const reject = async (taskId: string, reason: string) => {
    await fetch(`${API}/api/devos/tasks/${taskId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass' },
      body: JSON.stringify({ reason })
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-xs text-gray-400">Laddar...</div>
  )
  if (!data) return (
    <div className="text-center py-12">
      <div className="text-sm text-gray-500">Graph ej tillgänglig (API offline)</div>
      <button onClick={onBack} className="mt-4 text-xs text-[#0A3D62] underline">← Tillbaka</button>
    </div>
  )

  const { graph, tasks, violations } = data
  const done = tasks.filter(t => t.status === 'done').length
  const failed = tasks.filter(t => t.status === 'failed').length
  const pendingApproval = tasks.filter(t => t.status === 'pending_approval')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mt-0.5">←</button>
        <div className="flex-1">
          <div className="text-sm font-bold text-[#0A3D62]">{graph.intent}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{graph.project_id} · {graph.id.slice(0, 8)}</div>
        </div>
        <div
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: graph.status === 'done' ? '#ECFDF5' : graph.status === 'running' ? '#FFFBEB' : '#F3F4F6',
            color: graph.status === 'done' ? '#10B981' : graph.status === 'running' ? '#F59E0B' : '#6B7280',
          }}
        >
          {graph.status}
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-surface-border bg-white p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-gray-700">{done}/{tasks.length} tasks klara</span>
          {failed > 0 && <span className="text-red-600 font-bold">{failed} misslyckade</span>}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0A3D62] rounded-full transition-all"
            style={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Pending approvals — viktigt att synas */}
      {pendingApproval.length > 0 && canApprove && (
        <div className="rounded-xl border-2 border-purple-300 bg-purple-50 p-3">
          <div className="text-xs font-bold text-purple-800 mb-2">
            ⏳ {pendingApproval.length} tasks väntar på ditt godkännande
          </div>
          {pendingApproval.map(task => (
            <TaskCard key={task.id} task={task} onApprove={approve} onReject={reject} />
          ))}
        </div>
      )}

      {/* Policy violations */}
      {violations.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="text-xs font-bold text-red-800 mb-2">⚠️ {violations.length} policy violations</div>
          {violations.map((v, i) => (
            <div key={i} className="text-[11px] text-red-700 flex gap-2">
              <span className="font-bold">[{v.severity}]</span>
              <span>{v.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* All tasks */}
      <div className="grid gap-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onApprove={approve} onReject={reject} />
        ))}
      </div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────

export function DevOSView() {
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null)
  const [recentGraphs, setRecentGraphs] = useState<TaskGraph[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('devos_recent_graphs')
    if (stored) {
      try { setRecentGraphs(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  function handleCreated(graphId: string) {
    setActiveGraphId(graphId)
    const newGraph: TaskGraph = {
      id: graphId,
      intent: '...',
      project_id: '...',
      status: 'running',
      created_by: 'user',
      created_at: new Date().toISOString()
    }
    const updated = [newGraph, ...recentGraphs].slice(0, 10)
    setRecentGraphs(updated)
    localStorage.setItem('devos_recent_graphs', JSON.stringify(updated))
  }

  return (
    <div className="flex h-full bg-[#F5F0E8]">
      {/* Left: Create + History */}
      <div className="w-80 flex-shrink-0 border-r border-surface-border bg-[#FDFAF5] flex flex-col">
        <div className="px-4 py-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <div>
              <h2 className="text-sm font-bold text-[#0A3D62]">DevOS Orchestrator</h2>
              <p className="text-[10px] text-gray-400">AI genererar task graphs</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <CreateGraphPanel onCreated={handleCreated} />

          {recentGraphs.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Senaste</div>
              <div className="space-y-1.5">
                {recentGraphs.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGraphId(g.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      activeGraphId === g.id
                        ? 'bg-[#0A3D62] text-white'
                        : 'bg-white border border-surface-border hover:border-[#0A3D62]/30 text-gray-700'
                    }`}
                  >
                    <div className="font-mono text-[9px] opacity-60">{g.id.slice(0, 8)}</div>
                    <div className="truncate mt-0.5">{g.intent || g.project_id}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Graph Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeGraphId ? (
          <GraphDetail graphId={activeGraphId} onBack={() => setActiveGraphId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🧠</div>
            <h3 className="text-lg font-bold text-[#0A3D62] mb-2">Wavult DevOS</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Beskriv vad du vill bygga — Planner Agent skapar en task graph.
              Varje task utförs av rätt agent, granskas av policy engine, och loggas i replay log.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-500">
              {[
                { icon: '🧠', label: 'Planner',  desc: 'Tolkar intent' },
                { icon: '⌨️', label: 'Coder',    desc: 'Genererar kod' },
                { icon: '🔒', label: 'Security', desc: 'Policy scan' },
                { icon: '👁', label: 'Reviewer', desc: 'Kvalitetsgranskning' },
                { icon: '🚀', label: 'DevOps',   desc: 'Build & deploy' },
                { icon: '📋', label: 'Replay',   desc: 'Full audit trail' },
              ].map(a => (
                <div key={a.label} className="rounded-lg border border-surface-border bg-white p-3 text-center">
                  <div className="text-lg mb-1">{a.icon}</div>
                  <div className="font-semibold text-gray-700">{a.label}</div>
                  <div className="text-gray-400">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
