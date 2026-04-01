// ─── ContextView — TOP → ROLE → DOWN ──────────────────────────────────────────
// Non-destructive extension of OrgGraph. New route: /org/context
// Reads from existing data.ts + contextTree.ts. Respects permissions.ts.

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRole } from '../../shared/auth/RoleContext'
import { ROLE_PERMISSIONS, OVERLAY_LABELS } from './permissions'
import { buildContextualTree, TreeNode } from './contextTree'
import { useNavigate } from 'react-router-dom'

// ─── Layout constants ──────────────────────────────────────────────────────────

const NODE_W = 200
const NODE_H = 80
const H_GAP = 24
const V_GAP = 60
const CANVAS_W = 1200

// ─── Status palette ───────────────────────────────────────────────────────────

const STATUS: Record<string, string> = {
  live: '#10B981', forming: '#F59E0B', planned: '#6B7280',
  active: '#10B981', blocked: '#EF4444', 'in-progress': '#F59E0B',
}

// ─── Layout engine ─────────────────────────────────────────────────────────────
// Groups nodes by level, distributes horizontally, centers self-node

function layoutTree(nodes: TreeNode[]): Map<string, { x: number; y: number; level: number }> {
  const positions = new Map<string, { x: number; y: number; level: number }>()
  const byLevel: Record<number, TreeNode[]> = {}

  nodes.forEach(n => {
    if (!byLevel[n.level]) byLevel[n.level] = []
    byLevel[n.level].push(n)
  })

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  levels.forEach((lvl, li) => {
    const group = byLevel[lvl]
    const count = group.length
    const totalW = count * NODE_W + (count - 1) * H_GAP
    const startX = (CANVAS_W - totalW) / 2

    group.forEach((node, i) => {
      positions.set(node.id, {
        x: startX + i * (NODE_W + H_GAP),
        y: li * (NODE_H + V_GAP) + 40,
        level: lvl,
      })
    })
  })

  return positions
}

// ─── SVG connector between levels ─────────────────────────────────────────────

function Connector({
  from, to, color, style,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: string
  style: 'solid' | 'dashed' | 'dotted'
}) {
  const fx = from.x + NODE_W / 2
  const fy = from.y + NODE_H
  const tx = to.x + NODE_W / 2
  const ty = to.y

  const midY = (fy + ty) / 2
  const d = `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`
  const dash = style === 'dashed' ? '6 4' : style === 'dotted' ? '2 3' : undefined

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={dash}
      opacity={0.5}
    />
  )
}

// ─── Tree node card ────────────────────────────────────────────────────────────

function TreeCard({
  node, position: pos, selected, onClick,
}: {
  node: TreeNode
  position: { x: number; y: number }
  selected: boolean
  onClick: () => void
}) {
  const isSelf = node.isCurrentUser || node.position === 'self'
  const isAbove = node.position === 'above'
  const statusColor = node.status ? (STATUS[node.status] ?? '#6B7280') : '#6B7280'

  // Visual treatment by position
  const opacity = isAbove ? 0.65 : 1
  const borderColor = selected
    ? node.color
    : isSelf
    ? node.color + 'CC'
    : node.color + '40'
  const borderWidth = isSelf ? 2.5 : selected ? 2 : 1
  const glowFilter = isSelf || selected ? `drop-shadow(0 0 10px ${node.color}60)` : 'none'

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={onClick}
      className="cursor-pointer"
      style={{ opacity, filter: glowFilter, transition: 'all 0.15s' }}
    >
      {/* Card BG */}
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={10}
        fill="#0A0C14"
        stroke={borderColor}
        strokeWidth={borderWidth}
      />

      {/* Top bar */}
      <rect width={NODE_W} height={isSelf ? 4 : 2.5} rx={2} fill={node.color} opacity={isSelf ? 1 : 0.7} />

      {/* Self ring indicator */}
      {isSelf && (
        <rect
          x={-3} y={-3}
          width={NODE_W + 6}
          height={NODE_H + 6}
          rx={12}
          fill="none"
          stroke={node.color}
          strokeWidth={0.8}
          strokeDasharray="4 3"
          opacity={0.4}
        />
      )}

      {/* Flag + label */}
      <text x={13} y={27} fontSize={13} fill={node.color} fontWeight="700">
        {node.flag} {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
      </text>

      {/* Sublabel */}
      <text x={13} y={43} fontSize={8.5} fill="#9CA3AF">
        {node.sublabel.length > 30 ? node.sublabel.slice(0, 29) + '…' : node.sublabel}
      </text>

      {/* Type badge */}
      <text x={13} y={58} fontSize={7.5} fill="#374151" fontWeight="600" letterSpacing="1">
        {node.type.toUpperCase()}
      </text>

      {/* Status dot */}
      {node.status && (
        <circle cx={NODE_W - 14} cy={16} r={4} fill={statusColor} />
      )}

      {/* Self label */}
      {isSelf && (
        <>
          <rect x={NODE_W - 46} y={NODE_H - 18} width={38} height={12} rx={3} fill={node.color + '22'} />
          <text x={NODE_W - 27} y={NODE_H - 8} textAnchor="middle" fontSize={7.5} fill={node.color} fontWeight="700">YOU</text>
        </>
      )}

      {/* Expand indicator */}
      {node.expandable && !isSelf && (
        <g transform={`translate(${NODE_W - 22}, ${NODE_H - 18})`}>
          <rect width={16} height={12} rx={3} fill="#1F2937" />
          <text x={8} y={9} textAnchor="middle" fontSize={9} fill="#6B7280">▾</text>
        </g>
      )}
    </g>
  )
}

// ─── Detail sidebar ────────────────────────────────────────────────────────────

function NodeDetail({ node, onClose, onDashboard }: {
  node: TreeNode
  onClose: () => void
  onDashboard?: () => void
}) {
  const isSelf = node.isCurrentUser
  const statusColor = node.status ? (STATUS[node.status] ?? '#6B7280') : '#6B7280'

  return (
    <div className="h-full flex flex-col bg-white border-l border-surface-border overflow-hidden">
      <div className="flex-shrink-0 p-5 border-b border-surface-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{node.flag}</span>
              <span className="font-bold text-text-primary text-base">{node.label}</span>
              {node.status && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: statusColor + '18', color: statusColor }}>
                  {node.status}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted/30 text-gray-9000 font-mono">
                {node.type}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">{node.sublabel}</div>
          </div>
          <button onClick={onClose} className="text-gray-9000 hover:text-text-primary transition-colors text-lg ml-3">✕</button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {isSelf && onDashboard && (
            <button
              onClick={onDashboard}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
              style={{ background: node.color + '20', color: node.color, border: `1px solid ${node.color}35` }}
            >
              Open Dashboard →
            </button>
          )}
          <span className="text-xs px-2 py-1.5 rounded-lg bg-muted/30 text-gray-9000 border border-surface-border">
            {node.position === 'above' ? '▲ Above you' : node.position === 'self' ? '🎯 Your role' : '▼ Below you'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-3">Details</h3>
            <div className="space-y-2.5">
              {Object.entries(node.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-xs text-gray-9000 w-28 flex-shrink-0 font-mono">{k}</span>
                  <span className="text-xs text-gray-600">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role info */}
        {node.roleMapping && (
          <div>
            <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-3">Role</h3>
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: node.color + '25', background: node.color + '08' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold"
                  style={{ background: node.color + '22', color: node.color }}>
                  {node.roleMapping.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{node.roleMapping.person}</div>
                  <div className="text-xs text-gray-9000">{node.roleMapping.role_type} · {node.roleMapping.scope}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 pl-12">
                {node.roleMapping.permissions.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded bg-muted/30 text-gray-9000 font-mono">{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Children preview */}
        {node.children && node.children.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-9000 uppercase tracking-wider mb-3">
              Subordinates ({node.children.length})
            </h3>
            <div className="space-y-2">
              {node.children.map(c => (
                <div key={c.id}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 border"
                  style={{ borderColor: c.color + '20', background: c.color + '06' }}>
                  <span className="text-base">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</div>
                    <div className="text-xs text-gray-9000 truncate">{c.sublabel}</div>
                  </div>
                  {c.status && (
                    <span className="text-xs w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: STATUS[c.status] ?? '#6B7280' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Position explanation */}
        <div className="text-xs text-gray-600 border border-surface-border/50 rounded-lg p-3 bg-white/[0.01]">
          {node.position === 'above' && '▲ This node is above you in the hierarchy. You have visibility but not control.'}
          {node.position === 'self' && '🎯 This is your role or entity. You have full control over this domain.'}
          {node.position === 'below' && '▼ This is under your authority. You have full visibility and control.'}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ContextView() {
  const { effectiveRole } = useRole()
  const navigate = useNavigate()

  const roleId = effectiveRole?.id ?? 'group-ceo'
  const perms = ROLE_PERMISSIONS[roleId] ?? ROLE_PERMISSIONS['group-ceo']
  const overlayInfo = OVERLAY_LABELS[perms.overlayMode]

  const nodes = useMemo(() => buildContextualTree(roleId), [roleId])
  const positions = useMemo(() => layoutTree(nodes), [nodes])

  const [selected, setSelected] = useState<TreeNode | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Calculate canvas height from deepest level
  const maxY = useMemo(() => {
    let max = 0
    positions.forEach(p => { if (p.y > max) max = p.y })
    return max + NODE_H + 60
  }, [positions])

  // Auto-scroll to self node on load
  useEffect(() => {
    const selfNode = nodes.find(n => n.isCurrentUser)
    if (selfNode && svgRef.current) {
      const pos = positions.get(selfNode.id)
      if (pos) {
        const container = svgRef.current.parentElement
        if (container) {
          const scale = container.clientWidth / CANVAS_W
          container.scrollTo({
            top: (pos.y - 80) * scale,
            behavior: 'smooth',
          })
        }
      }
    }
  }, [nodes, positions])

  const handleNodeClick = (node: TreeNode) => {
    if (selected?.id === node.id) { setSelected(null); return }
    setSelected(node)

  }

  // Build connectors: each node connects to its parent level
  const connectors: { from: string; to: string; position: string }[] = []
  const byLevel: Record<number, TreeNode[]> = {}
  nodes.forEach(n => {
    if (!byLevel[n.level]) byLevel[n.level] = []
    byLevel[n.level].push(n)
  })
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)
  levels.forEach((lvl, li) => {
    if (li === 0) return
    const prevLevel = levels[li - 1]
    const prevNodes = byLevel[prevLevel]
    const currNodes = byLevel[lvl]
    // Connect first previous to each current (chain)
    const anchor = prevNodes.find(n => n.isOnPath) ?? prevNodes[0]
    if (!anchor) return
    currNodes.forEach(curr => {
      connectors.push({ from: anchor.id, to: curr.id, position: curr.position })
    })
  })

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 py-3 border-b border-surface-border bg-muted/30">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-text-primary">My Position</h1>
              <div
                className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5"
                style={{ background: overlayInfo.color + '12', color: overlayInfo.color, borderColor: overlayInfo.color + '30' }}
              >
                <span>{overlayInfo.icon}</span>
                <span>{overlayInfo.label}</span>
              </div>
            </div>
            <p className="text-xs text-gray-9000 mt-0.5">
              Wavult Group → {effectiveRole?.title ?? 'Group CEO'} — {nodes.length} nodes in view
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/org')}
              className="text-xs text-gray-9000 hover:text-gray-600 px-2.5 py-1.5 rounded-lg border border-surface-border transition-colors"
            >
              ← Corporate Graph
            </button>
          </div>
        </div>

        {/* Path breadcrumb */}
        <div className="flex-shrink-0 flex items-center gap-1 px-5 py-2 border-b border-surface-border/50 bg-muted/30 overflow-x-auto">
          {nodes.filter(n => n.isOnPath).map((n, i, arr) => (
            <span key={n.id} className="flex items-center gap-1 text-xs flex-shrink-0">
              <span
                className="font-mono font-semibold cursor-pointer hover:opacity-100 transition-opacity"
                style={{ color: n.color, opacity: n.isCurrentUser ? 1 : 0.55 }}
                onClick={() => handleNodeClick(n)}
              >
                {n.flag} {n.label}
              </span>
              {i < arr.length - 1 && <span className="text-gray-600 mx-0.5">›</span>}
            </span>
          ))}
          <span className="text-gray-600 mx-0.5">›</span>
          {nodes.filter(n => n.position === 'below').slice(0, 2).map((n, i) => (
            <span key={n.id} className="flex items-center gap-1 text-xs flex-shrink-0">
              <span className="font-mono opacity-40" style={{ color: n.color }}>
                {n.flag} {n.label.slice(0, 16)}
              </span>
              {i < 1 && nodes.filter(n => n.position === 'below').length > 2 && (
                <span className="text-gray-600 mx-0.5">›</span>
              )}
            </span>
          ))}
          {nodes.filter(n => n.position === 'below').length > 2 && (
            <span className="text-xs text-gray-600">+{nodes.filter(n => n.position === 'below').length - 2} more</span>
          )}
        </div>

        {/* SVG */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_W} ${maxY}`}
            style={{ width: '100%', minWidth: 700, minHeight: maxY }}
          >
            {/* Grid */}
            <defs>
              <pattern id="ctx-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff04" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={maxY} fill="url(#ctx-grid)" />

            {/* Horizontal level bands */}
            {levels.map((lvl, li) => {
              const y = li * (NODE_H + V_GAP) + 40
              const isAboveZone = byLevel[lvl]?.[0]?.position === 'above'
              const isBelowZone = byLevel[lvl]?.[0]?.position === 'below'
              return (
                <rect
                  key={lvl}
                  x={0} y={y - 16}
                  width={CANVAS_W} height={NODE_H + 32}
                  fill={isAboveZone ? '#ffffff01' : isBelowZone ? '#ffffff02' : '#2563EB08'}
                  rx={0}
                />
              )
            })}

            {/* Zone labels */}
            <text x={18} y={50} fontSize={8} fill="#1F2937" fontWeight="700" letterSpacing="2.5">ENTERPRISE ROOT</text>
            {(() => {
              const selfLvl = nodes.find(n => n.isCurrentUser)?.level
              if (selfLvl == null) return null
              const selfLi = levels.indexOf(selfLvl)
              const selfY = selfLi * (NODE_H + V_GAP) + 40
              return <>
                <text x={18} y={selfY - 4} fontSize={8} fill="#2563EB40" fontWeight="700" letterSpacing="2.5">YOUR ROLE</text>
                <line x1={0} y1={selfY - 12} x2={CANVAS_W} y2={selfY - 12} stroke="#2563EB20" strokeWidth={1} strokeDasharray="4 4" />
              </>
            })()}

            {/* Connectors */}
            {connectors.map(({ from, to, position }) => {
              const fpos = positions.get(from)
              const tpos = positions.get(to)
              if (!fpos || !tpos) return null
              const fromNode = nodes.find(n => n.id === from)
              return (
                <Connector
                  key={`${from}-${to}`}
                  from={fpos}
                  to={tpos}
                  color={fromNode?.color ?? '#4B5563'}
                  style={position === 'above' ? 'dotted' : position === 'below' ? 'solid' : 'dashed'}
                />
              )
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pos = positions.get(node.id)
              if (!pos) return null
              return (
                <TreeCard
                  key={node.id}
                  node={node}
                  position={pos}
                  selected={selected?.id === node.id}
                  onClick={() => handleNodeClick(node)}
                />
              )
            })}
          </svg>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-surface-border bg-muted/30">
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/20" />Above: governance chain</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: effectiveRole?.color ?? '#2563EB' }} />Self: your role</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10B981]" />Below: your authority</span>
            <span className="ml-auto">Click any node to inspect · Click self node to open dashboard</span>
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="w-[300px] flex-shrink-0">
          <NodeDetail
            node={selected}
            onClose={() => setSelected(null)}
            onDashboard={selected.isCurrentUser ? () => navigate('/dashboard') : undefined}
          />
        </div>
      )}
    </div>
  )
}
