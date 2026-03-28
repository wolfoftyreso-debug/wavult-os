import { useState, useEffect, useRef } from 'react'
import { Activity, Server, Database, Globe, Zap, ChevronRight, X } from 'lucide-react'

// ─── DATA MODEL ──────────────────────────────────────────────────────────────

type NodeType = 'service' | 'database' | 'storage' | 'cdn' | 'external' | 'scheduler'
type NodeStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

interface SystemNode {
  id: string
  label: string
  type: NodeType
  status: NodeStatus
  region?: string
  latencyMs?: number
  uptimePct?: number
  connects: string[]  // node ids this connects to
  details?: Record<string, string | number>
}

interface Connection {
  from: string
  to: string
  active: boolean
  throughput?: 'high' | 'medium' | 'low'
}

// ─── SYSTEM MAP (canonical model) ────────────────────────────────────────────

const NODES: SystemNode[] = [
  // Edge
  { id: 'cloudflare', label: 'Cloudflare', type: 'cdn', status: 'healthy', connects: ['alb', 'cf-pages'], details: { 'Zones': 4, 'DNS': 'active' } },
  { id: 'cf-pages', label: 'Cloudflare Pages', type: 'cdn', status: 'healthy', connects: [], details: { 'wavult-os': 'live', 'landvex-eu': 'live', 'optical-insight-eu': 'live' } },

  // Compute
  { id: 'alb', label: 'ALB (hypbit-api-alb)', type: 'service', status: 'healthy', region: 'eu-north-1', connects: ['hypbit-api', 'quixzoom-api', 'n8n', 'bos-scheduler'] },
  { id: 'hypbit-api', label: 'hypbit-api (Wavult OS)', type: 'service', status: 'healthy', region: 'eu-north-1', latencyMs: 42, uptimePct: 99.2, connects: ['supabase-wavult', 'dynamo'], details: { 'Task': 'hypbit-api:34', 'Port': 3001 } },
  { id: 'quixzoom-api', label: 'quixzoom-api', type: 'service', status: 'healthy', region: 'eu-north-1', latencyMs: 38, uptimePct: 99.1, connects: ['supabase-quixzoom', 's3-eu'], details: { 'Task': 'quixzoom-api:6', 'Port': 3001 } },
  { id: 'n8n', label: 'n8n (Automation)', type: 'service', status: 'healthy', region: 'eu-north-1', connects: ['ses'], details: { 'Task': 'n8n-task:5', 'Port': 5678, 'EFS': 'mounted' } },
  { id: 'bos-scheduler', label: 'BOS Scheduler', type: 'scheduler', status: 'healthy', region: 'eu-north-1', connects: ['supabase-wavult'], details: { 'Task': 'bos-scheduler:2', 'Loop': '500ms', 'Watchdog': 'active' } },
  { id: 'identity-core', label: 'Identity Core', type: 'service', status: 'unknown', region: 'eu-north-1', connects: ['rds', 'dynamo', 'kms'], details: { 'Status': 'Parallel build', 'Migration': 'Pending order' } },

  // Databases
  { id: 'supabase-wavult', label: 'Supabase (wavult-os)', type: 'database', status: 'degraded', region: 'eu-west-1', connects: [], details: { 'Plan': 'Free ⚠️', 'ID': 'znmxtnxx...', 'Tables': 'bos_tasks, bos_jobs, bos_events' } },
  { id: 'supabase-quixzoom', label: 'Supabase (quixzoom-v2)', type: 'database', status: 'degraded', region: 'eu-west-1', connects: [], details: { 'Plan': 'Free ⚠️', 'ID': 'lpeipzdm...' } },
  { id: 'rds', label: 'RDS PostgreSQL', type: 'database', status: 'unknown', region: 'eu-north-1', connects: [], details: { 'Status': 'Not provisioned', 'For': 'Identity Core' } },
  { id: 'dynamo', label: 'DynamoDB (sessions)', type: 'database', status: 'unknown', region: 'eu-north-1', connects: [], details: { 'Tables': 'ic-sessions, ic-tokens', 'Status': 'Not provisioned' } },

  // Storage
  { id: 's3-eu', label: 'S3 EU Primary', type: 'storage', status: 'healthy', region: 'eu-north-1', connects: ['s3-eu-backup'], details: { 'Bucket': 'wavult-images-eu-primary', 'CRR': 'active' } },
  { id: 's3-eu-backup', label: 'S3 EU Backup', type: 'storage', status: 'healthy', region: 'eu-west-1', connects: [], details: { 'Bucket': 'wavult-images-eu-backup', 'Class': 'STANDARD_IA' } },

  // External
  { id: 'ses', label: 'AWS SES (e-post)', type: 'external', status: 'healthy', connects: [], details: { 'Region': 'eu-north-1', 'Usage': 'Morning Brief' } },
  { id: 'kms', label: 'AWS KMS', type: 'external', status: 'unknown', region: 'eu-north-1', connects: [], details: { 'Usage': 'Identity Core JWT signing', 'Status': 'Not configured' } },
  { id: 'github-actions', label: 'GitHub Actions', type: 'external', status: 'healthy', connects: ['alb'], details: { 'Repo': 'wolfoftyreso-debug/hypbit', 'Branch': 'main' } },
]

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

const POSITIONS: Record<string, { x: number; y: number }> = {
  'github-actions':     { x: 60, y: 20 },
  'cloudflare':         { x: 300, y: 20 },
  'cf-pages':           { x: 120, y: 120 },
  'alb':                { x: 480, y: 120 },
  'hypbit-api':         { x: 280, y: 240 },
  'quixzoom-api':       { x: 480, y: 240 },
  'n8n':                { x: 680, y: 240 },
  'bos-scheduler':      { x: 680, y: 360 },
  'identity-core':      { x: 80, y: 360 },
  'supabase-wavult':    { x: 200, y: 460 },
  'supabase-quixzoom':  { x: 440, y: 460 },
  'rds':                { x: 60, y: 540 },
  'dynamo':             { x: 200, y: 560 },
  's3-eu':              { x: 560, y: 460 },
  's3-eu-backup':       { x: 720, y: 540 },
  'ses':                { x: 820, y: 240 },
  'kms':                { x: 60, y: 460 },
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<NodeStatus, { bg: string; border: string; text: string; dot: string }> = {
  healthy:  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', dot: '#10B981' },
  degraded: { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800',   dot: '#F59E0B' },
  down:     { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     dot: '#EF4444' },
  unknown:  { bg: 'bg-gray-50',    border: 'border-gray-300',    text: 'text-gray-600',    dot: '#9CA3AF' },
}

const TYPE_ICONS: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  service:   Server,
  database:  Database,
  storage:   Database,
  cdn:       Globe,
  external:  Zap,
  scheduler: Activity,
}

function StatusDot({ status, pulse = false }: { status: NodeStatus; pulse?: boolean }) {
  const color = STATUS_COLORS[status].dot
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && status === 'healthy' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }} />
    </span>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function SystemGraph() {
  const [nodes, setNodes] = useState<SystemNode[]>(NODES)
  const [selected, setSelected] = useState<SystemNode | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [animTick, setAnimTick] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  // Pulse animation tick
  useEffect(() => {
    const t = setInterval(() => setAnimTick(n => n + 1), 1500)
    return () => clearInterval(t)
  }, [])

  // Simulate live health check (replace with real fetch in prod)
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('https://api.hypbit.com/health', { signal: AbortSignal.timeout(5000) })
        setNodes(prev => prev.map(n =>
          n.id === 'hypbit-api' ? { ...n, status: res.ok ? 'healthy' : 'degraded' } : n
        ))
      } catch {
        setNodes(prev => prev.map(n =>
          n.id === 'hypbit-api' ? { ...n, status: 'degraded' } : n
        ))
      }
      setLastUpdated(new Date())
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // Build connections
  const connections: Connection[] = []
  nodes.forEach(node => {
    node.connects.forEach(targetId => {
      if (nodeMap.has(targetId) && POSITIONS[node.id] && POSITIONS[targetId]) {
        connections.push({
          from: node.id,
          to: targetId,
          active: node.status === 'healthy' && (nodeMap.get(targetId)?.status !== 'down'),
          throughput: node.id === 'cloudflare' || node.id === 'alb' ? 'high' : 'medium'
        })
      }
    })
  })

  const statusCounts = {
    healthy:  nodes.filter(n => n.status === 'healthy').length,
    degraded: nodes.filter(n => n.status === 'degraded').length,
    down:     nodes.filter(n => n.status === 'down').length,
    unknown:  nodes.filter(n => n.status === 'unknown').length,
  }

  const viewW = 900
  const viewH = 620

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-6 text-sm">
          <span className="font-semibold text-gray-900">System Graph</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />{statusCounts.healthy} live
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-400" />{statusCounts.degraded} degraded
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-400" />{statusCounts.unknown} not provisioned
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          Updated {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Graph area */}
      <div className="flex-1 overflow-hidden relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full"
          style={{ background: '#F8FAFC' }}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
            </pattern>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#94A3B8" />
            </marker>
            <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#10B981" />
            </marker>
          </defs>
          <rect width={viewW} height={viewH} fill="url(#grid)" />

          {/* Connections */}
          {connections.map(conn => {
            const from = POSITIONS[conn.from]
            const to = POSITIONS[conn.to]
            if (!from || !to) return null
            const dx = (to.x + 60) - (from.x + 60)
            const dy = (to.y + 20) - (from.y + 20)
            void dy
            const d = `M ${from.x + 60} ${from.y + 20} C ${from.x + 60 + dx/2} ${from.y + 20} ${to.x + 60 - dx/2} ${to.y + 20} ${to.x + 60} ${to.y + 20}`
            return (
              <g key={`${conn.from}-${conn.to}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={conn.active ? '#10B981' : '#CBD5E1'}
                  strokeWidth={conn.active ? 1.5 : 1}
                  strokeDasharray={conn.active ? '6 3' : '4 4'}
                  strokeDashoffset={conn.active ? -(animTick * 3) : 0}
                  opacity={conn.active ? 0.7 : 0.3}
                  markerEnd={conn.active ? 'url(#arrow-active)' : 'url(#arrow)'}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = POSITIONS[node.id]
            if (!pos) return null
            const c = STATUS_COLORS[node.status]
            const Icon = TYPE_ICONS[node.type]
            const isSelected = selected?.id === node.id

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelected(isSelected ? null : node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node box */}
                <rect
                  x={0} y={0} width={120} height={44}
                  rx={8}
                  fill="white"
                  stroke={isSelected ? '#7C3AED' : c.dot}
                  strokeWidth={isSelected ? 2 : 1}
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.08))"
                />
                {/* Status bar */}
                <rect x={0} y={0} width={4} height={44} rx={8} fill={c.dot} />
                <rect x={0} y={4} width={4} height={36} fill={c.dot} />

                {/* Icon */}
                <foreignObject x={8} y={10} width={20} height={20}>
                  <Icon className="w-4 h-4 text-gray-500" />
                </foreignObject>

                {/* Label */}
                <text x={34} y={18} fontSize={9} fill="#374151" fontWeight="600" fontFamily="system-ui">
                  {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                </text>
                <text x={34} y={30} fontSize={8} fill="#9CA3AF" fontFamily="monospace">
                  {node.region || node.type}
                </text>

                {/* Status dot */}
                <circle cx={108} cy={10} r={4} fill={c.dot}>
                  {node.status === 'healthy' && (
                    <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>

                {/* Latency badge */}
                {node.latencyMs !== undefined && (
                  <text x={34} y={40} fontSize={7} fill="#6B7280" fontFamily="monospace">
                    {node.latencyMs}ms
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Detail panel */}
        {selected && (
          <div className="absolute top-4 right-4 w-72 bg-white border border-gray-200 rounded-xl shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <StatusDot status={selected.status} pulse />
                <span className="font-semibold text-gray-900 text-sm">{selected.label}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status].bg} ${STATUS_COLORS[selected.status].text}`}>
                  {selected.status.toUpperCase()}
                </span>
              </div>

              {selected.region && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Region</span>
                  <span className="text-xs font-mono text-gray-700">{selected.region}</span>
                </div>
              )}

              {selected.latencyMs !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Latency</span>
                  <span className="text-xs font-mono text-gray-700">{selected.latencyMs}ms</span>
                </div>
              )}

              {selected.uptimePct !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Uptime 30d</span>
                  <span className="text-xs font-mono text-emerald-700">{selected.uptimePct}%</span>
                </div>
              )}

              {/* Connections */}
              {selected.connects.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Connects to</span>
                  <div className="flex flex-wrap gap-1">
                    {selected.connects.map(id => {
                      const target = nodeMap.get(id)
                      return target ? (
                        <button
                          key={id}
                          onClick={() => setSelected(target)}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-full hover:border-purple-400 transition-colors"
                        >
                          <StatusDot status={target.status} />
                          {target.label}
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </button>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* Details */}
              {selected.details && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500 block mb-2">Details</span>
                  <div className="space-y-1">
                    {Object.entries(selected.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-xs text-gray-500">{k}</span>
                        <span className="text-xs font-mono text-gray-700">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
