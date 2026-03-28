// ─── CommandHierarchyView — The authority chain, always visible ───────────────
// Route: /org/command
// Visual rule: straight vertical hierarchy, command chain dominant,
//              no ambiguity in reporting lines.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  COMMAND_CHAIN, CommandRole, CommandKPI,
  getDirectReports, getApexRole,
  STATUS_COLOR, STATUS_LABEL,
} from './commandChain'
import { ENTITIES } from './data'

// ─── Node dimensions ──────────────────────────────────────────────────────────

const NODE_W = 280
const NODE_H = 100       // apex is taller
const APEX_H = 116
const V_GAP  = 72        // vertical gap between levels
const H_GAP  = 36        // horizontal gap between siblings

// ─── Layout calculator ────────────────────────────────────────────────────────

interface LayoutNode {
  role: CommandRole
  x: number
  y: number
  w: number
  h: number
}

function buildLayout(): LayoutNode[] {
  const apex = getApexRole()
  const reports = getDirectReports(apex.id)

  // Two levels: apex centred, reports spread horizontally beneath
  const totalReportsW = reports.length * NODE_W + (reports.length - 1) * H_GAP
  const startX = (totalReportsW - NODE_W) / 2     // centre apex over reports

  const result: LayoutNode[] = []

  // Apex
  result.push({ role: apex, x: startX, y: 0, w: NODE_W, h: APEX_H })

  // Direct reports — spread left-right
  const reportY = APEX_H + V_GAP
  reports.forEach((r, i) => {
    result.push({
      role: r,
      x: i * (NODE_W + H_GAP),
      y: reportY,
      w: NODE_W,
      h: NODE_H,
    })
  })

  return result
}

// ─── SVG viewport size ────────────────────────────────────────────────────────

function getViewport(nodes: LayoutNode[]) {
  const maxX = Math.max(...nodes.map(n => n.x + n.w))
  const maxY = Math.max(...nodes.map(n => n.y + n.h))
  return { vw: maxX + 1, vh: maxY + 1 }
}

// ─── Connector lines ──────────────────────────────────────────────────────────

function Connectors({ nodes }: { nodes: LayoutNode[] }) {
  const apex = nodes.find(n => n.role.reports_to === null)!
  const reports = nodes.filter(n => n.role.reports_to === apex.role.id)

  if (!apex || !reports.length) return null

  const apexBottomX = apex.x + apex.w / 2
  const apexBottomY = apex.y + apex.h

  // Trunk drops straight down to a horizontal bus
  const busY = apexBottomY + V_GAP * 0.45

  return (
    <g>
      {/* Trunk */}
      <line
        x1={apexBottomX} y1={apexBottomY}
        x2={apexBottomX} y2={busY}
        stroke="#ffffff18"
        strokeWidth={2}
        strokeDasharray="4 4"
      />

      {/* Horizontal bus */}
      {reports.length > 1 && (
        <line
          x1={reports[0].x + reports[0].w / 2} y1={busY}
          x2={reports[reports.length - 1].x + reports[reports.length - 1].w / 2} y2={busY}
          stroke="#ffffff18"
          strokeWidth={2}
        />
      )}

      {/* Drop lines to each report */}
      {reports.map(n => {
        const nx = n.x + n.w / 2
        return (
          <g key={n.role.id}>
            <line
              x1={nx} y1={busY}
              x2={nx} y2={n.y}
              stroke="#ffffff18"
              strokeWidth={2}
            />
            {/* Arrow tip */}
            <polygon
              points={`${nx},${n.y} ${nx - 5},${n.y - 8} ${nx + 5},${n.y - 8}`}
              fill="#ffffff20"
            />
            {/* reports_to label */}
            <text
              x={nx + 6}
              y={busY + (n.y - busY) / 2}
              fontSize={9}
              fill="#ffffff25"
              fontFamily="monospace"
            >
              reports_to
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ─── KPI row inside node ──────────────────────────────────────────────────────

function KPIRow({ kpi }: { kpi: CommandKPI }) {
  const trendIcon = kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '–'
  const trendColor = kpi.good
    ? '#10B981'
    : kpi.trend === 'flat' ? '#6B7280' : '#EF4444'

  return (
    <div className="flex items-center justify-between text-[9px] font-mono leading-none">
      <span className="text-white/40 truncate max-w-[120px]">{kpi.label}</span>
      <span className="flex items-center gap-0.5 flex-shrink-0" style={{ color: trendColor }}>
        {kpi.value} {trendIcon}
      </span>
    </div>
  )
}

// ─── Single command node ──────────────────────────────────────────────────────

function CommandNode({
  node, selected, onClick,
}: {
  node: LayoutNode
  selected: boolean
  onClick: () => void
}) {
  const { role } = node
  const statusColor = STATUS_COLOR[role.status]
  const isApex = role.reports_to === null

  return (
    <foreignObject
      x={node.x}
      y={node.y}
      width={node.w}
      height={node.h + (selected ? 100 : 0)}
    >
      <div
        onClick={onClick}
        className="cursor-pointer select-none transition-all duration-200"
        style={{ width: node.w }}
      >
        <div
          className="rounded-xl border transition-all duration-200 overflow-hidden"
          style={{
            borderColor: selected ? role.color + '80' : role.color + '28',
            background: selected
              ? `linear-gradient(135deg, ${role.color}18, ${role.color}08)`
              : '#0B0D16',
            boxShadow: isApex
              ? `0 0 0 1px ${role.color}40, 0 8px 32px ${role.color}15`
              : selected
              ? `0 4px 20px ${role.color}20`
              : 'none',
          }}
        >
          {/* Status bar — top edge */}
          <div
            className="h-0.5 w-full"
            style={{ background: statusColor }}
          />

          <div className="px-3 py-2.5 space-y-2">
            {/* Header row */}
            <div className="flex items-start gap-2.5">
              {/* Avatar */}
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: role.color + '20', color: role.color }}
              >
                {role.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">
                  {role.person}
                </div>
                <div
                  className="text-xs font-semibold leading-tight truncate"
                  style={{ color: role.color }}
                >
                  {role.title}
                </div>
              </div>
              {/* Status dot + click hint */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusColor }}
                  title={STATUS_LABEL[role.status]}
                />
                {!selected && (
                  <span className="text-[8px] text-gray-600 font-mono">tap</span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full" style={{ background: '#ffffff06' }} />

            {/* KPIs */}
            <div className="space-y-1">
              {role.kpis.map(k => <KPIRow key={k.label} kpi={k} />)}
            </div>
          </div>
        </div>
      </div>
    </foreignObject>
  )
}

// ─── Detail panel (right side) ────────────────────────────────────────────────

function DetailPanel({ role, onClose, onNavigate }: {
  role: CommandRole
  onClose: () => void
  onNavigate: (entityId: string) => void
}) {
  const entities = ENTITIES.filter(e => role.entity_ids.includes(e.id))
  const statusColor = STATUS_COLOR[role.status]
  const superior = COMMAND_CHAIN.find(r => r.id === role.reports_to)

  return (
    <div className="h-full flex flex-col bg-[#0A0C14] border-l border-white/[0.07] w-80 flex-shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.06] p-5">
        <div className="flex items-start gap-3">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: role.color + '20', color: role.color }}
          >
            {role.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white">{role.person}</div>
            <div className="text-sm font-semibold" style={{ color: role.color }}>{role.title}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
              <span className="text-xs" style={{ color: statusColor }}>{STATUS_LABEL[role.status]}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors text-lg flex-shrink-0">✕</button>
        </div>

        {/* Reports to */}
        {superior && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-gray-600 font-mono">reports_to</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold" style={{ color: superior.color }}>{superior.person}</span>
            <span className="text-gray-600">({superior.title})</span>
          </div>
        )}
        {!superior && (
          <div className="mt-3 text-xs text-gray-600 font-mono">
            ◆ Apex — no superior. Authority starts here.
          </div>
        )}
      </div>

      {/* Owns */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Owns</div>
        <div className="space-y-1.5">
          {role.owns.map(o => (
            <div key={o} className="flex items-center gap-2 text-sm text-gray-300">
              <span style={{ color: role.color }}>◆</span> {o}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">KPIs</div>
        <div className="space-y-4">
          {role.kpis.map(kpi => {
            const trendColor = kpi.good ? '#10B981' : kpi.trend === 'flat' ? '#6B7280' : '#EF4444'
            const trendIcon  = kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '–'
            const isIssue = !kpi.good
            return (
              <div key={kpi.label} className={`rounded-xl p-3 border ${isIssue ? 'bg-red-500/5 border-red-500/15' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 font-medium">{kpi.label}</span>
                  <span className="text-sm font-bold font-mono" style={{ color: trendColor }}>
                    {kpi.value} {trendIcon}
                  </span>
                </div>
                {isIssue && kpi.why && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-gray-400 leading-relaxed">{kpi.why}</p>
                    {kpi.action && (
                      <div className="flex gap-1.5 mt-2">
                        <span className="text-xs text-amber-400 font-semibold flex-shrink-0">→ Åtgärd:</span>
                        <p className="text-xs text-amber-300 leading-relaxed">{kpi.action}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Entities */}
      {entities.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Active Across</div>
          <div className="space-y-2">
            {entities.map(e => (
              <button
                key={e.id}
                onClick={() => onNavigate(e.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: e.color + '25', background: e.color + '08' }}
              >
                <span>{e.flag}</span>
                <span className="text-xs font-semibold" style={{ color: e.color }}>{e.shortName}</span>
                <span className="text-xs text-gray-600 flex-1 truncate">{e.jurisdiction}</span>
                <span className="text-xs text-gray-600">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function CommandHierarchyView() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const nodes = buildLayout()
  const { vw, vh } = getViewport(nodes)

  const selectedRole = selectedId ? COMMAND_CHAIN.find(r => r.id === selectedId) : null

  const criticalCount = COMMAND_CHAIN.filter(r => r.status === 'red').length
  const watchCount    = COMMAND_CHAIN.filter(r => r.status === 'yellow').length

  return (
    <div className="flex h-full overflow-hidden bg-[#07090F]">
      {/* ── Main graph area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header bar */}
        <div className="flex-shrink-0 border-b border-white/[0.06] px-6 py-3 flex items-center justify-between bg-[#08090F]">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white">Command Hierarchy</h1>
            <span className="text-xs text-gray-600 font-mono">reports_to chain · always visible</span>
            {criticalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-red-500/15 text-red-400 border border-red-500/20">
                {criticalCount} action needed
              </span>
            )}
            {watchCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                {watchCount} watch
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/org')}
              className="text-xs text-gray-600 hover:text-gray-300 transition-colors px-2.5 py-1.5 rounded-lg border border-white/[0.06]"
            >
              Corporate Graph →
            </button>
          </div>
        </div>

        {/* SVG canvas — hidden on mobile, list shown instead */}
        <div className="hidden md:flex flex-1 overflow-auto items-start justify-center p-10">
          <svg
            width={vw}
            height={vh + 20}
            viewBox={`0 0 ${vw} ${vh + 20}`}
            className="overflow-visible"
          >
            {/* Connectors first (behind nodes) */}
            <Connectors nodes={nodes} />

            {/* Nodes */}
            {nodes.map(node => (
              <CommandNode
                key={node.role.id}
                node={node}
                selected={selectedId === node.role.id}
                onClick={() => setSelectedId(prev => prev === node.role.id ? null : node.role.id)}
              />
            ))}
          </svg>
        </div>

        {/* Mobile list view */}
        <div className="md:hidden flex-1 overflow-auto p-4 space-y-3">
          {COMMAND_CHAIN.map(role => {
            const sc = STATUS_COLOR[role.status]
            const issues = role.kpis.filter(k => !k.good)
            return (
              <button
                key={role.id}
                onClick={() => setSelectedId(prev => prev === role.id ? null : role.id)}
                className="w-full text-left rounded-xl border p-4 transition-all"
                style={{
                  borderColor: selectedId === role.id ? role.color + '60' : sc + '30',
                  background: selectedId === role.id ? role.color + '10' : '#0D1117',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ background: role.color + '20', color: role.color }}>
                    {role.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{role.person}</p>
                    <p className="text-xs font-medium truncate" style={{ color: role.color }}>{role.title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="h-2 w-2 rounded-full" style={{ background: sc }} />
                    {issues.length > 0 && (
                      <span className="text-xs text-red-400">{issues.length} issue{issues.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                {selectedId === role.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    {role.kpis.map(kpi => {
                      const tc = kpi.good ? '#10B981' : '#EF4444'
                      return (
                        <div key={kpi.label} className={`rounded-lg p-2.5 ${!kpi.good ? 'bg-red-500/5 border border-red-500/15' : 'bg-white/[0.02]'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">{kpi.label}</span>
                            <span className="text-xs font-bold font-mono" style={{ color: tc }}>{kpi.value}</span>
                          </div>
                          {!kpi.good && kpi.why && (
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{kpi.why}</p>
                          )}
                          {!kpi.good && kpi.action && (
                            <p className="text-xs text-amber-300 mt-1 leading-relaxed">→ {kpi.action}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 border-t border-white/[0.04] px-6 py-2 flex items-center gap-6">
          {(['green', 'yellow', 'red'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              <span className="text-xs text-gray-600">{STATUS_LABEL[s]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4">
            <span className="text-xs text-gray-600 font-mono">-- --</span>
            <span className="text-xs text-gray-600">reports_to</span>
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selectedRole && (
        <DetailPanel
          role={selectedRole}
          onClose={() => setSelectedId(null)}
          onNavigate={(entityId) => navigate(`/entities/${entityId}`)}
        />
      )}
    </div>
  )
}
