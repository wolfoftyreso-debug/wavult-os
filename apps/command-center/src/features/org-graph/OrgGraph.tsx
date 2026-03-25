import { useState, useCallback, useMemo } from 'react'
import {
  ENTITIES, RELATIONSHIPS,
  getChildren, getRelationships, getRoleMappings,
  Entity, EntityRelationship, RelationshipType,
} from './data'
import { useRole } from '../../shared/auth/RoleContext'
import { ROLE_PERMISSIONS, OVERLAY_LABELS, GraphPermissions, OverlayMode } from './permissions'

// ─── Layout constants ──────────────────────────────────────────────────────────

const LAYER_Y: Record<number, number> = { 0: 70, 1: 240, 2: 430, 3: 630 }
const LAYER_LABEL: Record<number, string> = {
  0: 'HOLDING / IP',
  1: 'OPERATIONS',
  2: 'PRODUCT ENTITIES',
  3: 'SYSTEMS',
}
const CARD_W = 176
const CARD_H = 96
const SVG_W = 1120

// ─── Layout engine ─────────────────────────────────────────────────────────────

function layoutNodes(visibleLayers: number[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const byLayer: Record<number, Entity[]> = {}
  ENTITIES.filter(e => visibleLayers.includes(e.layer)).forEach(e => {
    if (!byLayer[e.layer]) byLayer[e.layer] = []
    byLayer[e.layer].push(e)
  })
  Object.entries(byLayer).forEach(([layer, nodes]) => {
    const ly = parseInt(layer)
    const count = nodes.length
    const gap = SVG_W / (count + 1)
    nodes.forEach((node, i) => {
      positions.set(node.id, { x: gap * (i + 1) - CARD_W / 2, y: LAYER_Y[ly] })
    })
  })
  return positions
}

// ─── Relationship styles ───────────────────────────────────────────────────────

const REL_STYLE: Record<RelationshipType, { stroke: string; dash: string; label: string }> = {
  ownership:      { stroke: '#8B5CF6', dash: 'none', label: 'Ownership' },
  financial_flow: { stroke: '#10B981', dash: 'none', label: 'Financial flow' },
  licensing:      { stroke: '#F59E0B', dash: '6 4',  label: 'IP License' },
  service:        { stroke: '#0EA5E9', dash: '4 3',  label: 'Service' },
  control:        { stroke: '#EF4444', dash: 'none', label: 'Control' },
}

// ─── Edge component ───────────────────────────────────────────────────────────

function Edge({
  rel, positions, opacity, highlighted,
}: {
  rel: EntityRelationship
  positions: Map<string, { x: number; y: number }>
  opacity: number
  highlighted: boolean
}) {
  const from = positions.get(rel.from_entity_id)
  const to = positions.get(rel.to_entity_id)
  if (!from || !to) return null

  const style = REL_STYLE[rel.type]
  const fx = from.x + CARD_W / 2
  const fy = from.y + CARD_H
  const tx = to.x + CARD_W / 2
  const ty = to.y
  const midY = (fy + ty) / 2

  // Skip self-layer edges (same Y) with horizontal curves instead
  const isSameLayer = Math.abs(fy - ty) < 10
  const d = isSameLayer
    ? `M ${fx} ${fy} Q ${(fx + tx) / 2} ${fy - 40} ${tx} ${ty}`
    : `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`

  const markerId = `arr-${rel.id}`

  return (
    <g style={{ opacity, transition: 'opacity 0.2s' }}>
      <defs>
        <marker id={markerId} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill={style.stroke} opacity={opacity} />
        </marker>
      </defs>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path
        d={d}
        fill="none"
        stroke={style.stroke}
        strokeWidth={highlighted ? 2.5 : 1.2}
        strokeDasharray={style.dash === 'none' ? undefined : style.dash}
        markerEnd={`url(#${markerId})`}
        style={{ filter: highlighted ? `drop-shadow(0 0 5px ${style.stroke})` : 'none', transition: 'all 0.2s' }}
      />
    </g>
  )
}

// ─── Node card ────────────────────────────────────────────────────────────────

function NodeCard({
  entity, position, selected, dimmed, expanded, onClick,
}: {
  entity: Entity
  position: { x: number; y: number }
  selected: boolean
  dimmed: boolean
  expanded: boolean
  onClick: () => void
}) {
  const statusColor = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[entity.active_status]
  const roles = getRoleMappings(entity.id)
  const childCount = getChildren(entity.id).length

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={onClick}
      className="cursor-pointer"
      style={{
        opacity: dimmed ? 0.25 : 1,
        filter: selected ? `drop-shadow(0 0 12px ${entity.color})` : 'none',
        transition: 'all 0.2s',
      }}
    >
      {/* Shadow */}
      <rect width={CARD_W} height={CARD_H} rx={10} fill={entity.color} opacity={selected ? 0.12 : 0.04} />

      {/* Card */}
      <rect
        width={CARD_W}
        height={CARD_H}
        rx={10}
        fill="#0C0E16"
        stroke={selected ? entity.color : entity.color + '45'}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Top accent bar */}
      <rect width={CARD_W} height={3} rx={1.5} fill={entity.color} opacity={0.9} />

      {/* Flag + shortname */}
      <text x={13} y={26} fontSize={12.5} fill={entity.color} fontWeight="700" fontFamily="monospace">
        {typeof entity.flag === 'string' && entity.flag.length <= 2 ? entity.flag : ''} {entity.shortName}
      </text>

      {/* Full name — truncate if long */}
      <text x={13} y={42} fontSize={9} fill="#9CA3AF" fontFamily="sans-serif">
        {entity.name.length > 22 ? entity.name.slice(0, 21) + '…' : entity.name}
      </text>

      {/* Jurisdiction + type */}
      <text x={13} y={57} fontSize={8.5} fill="#4B5563">
        {entity.jurisdiction} · {entity.type.toUpperCase()}
      </text>

      {/* Status indicator */}
      <circle cx={CARD_W - 14} cy={16} r={4.5} fill={statusColor} />

      {/* Role avatars */}
      {roles.slice(0, 5).map((rm, i) => (
        <g key={rm.person} transform={`translate(${13 + i * 19}, 68)`}>
          <circle r={8} fill={rm.color + '28'} stroke={rm.color + '80'} strokeWidth={1} />
          <text x={0} y={3.5} textAnchor="middle" fontSize={7} fill={rm.color} fontWeight="700">
            {rm.initials[0]}
          </text>
        </g>
      ))}

      {/* Children / expand indicator */}
      {childCount > 0 && (
        <g transform={`translate(${CARD_W - 24}, ${CARD_H - 18})`}>
          <rect width={18} height={12} rx={3} fill={expanded ? entity.color + '30' : '#1F2937'} />
          <text x={9} y={9} textAnchor="middle" fontSize={8} fill={expanded ? entity.color : '#6B7280'} fontWeight="700">
            {expanded ? '▲' : `+${childCount}`}
          </text>
        </g>
      )}
    </g>
  )
}

// ─── Drill-down panel (right side) ────────────────────────────────────────────

function DrillPanel({
  entity, perms, onClose,
}: {
  entity: Entity
  perms: GraphPermissions
  onClose: () => void
}) {
  const [tab, setTab] = useState<'overview' | 'relations' | 'roles' | 'children'>('overview')

  const rels = getRelationships(entity.id)
  const roles = getRoleMappings(entity.id)
  const children = getChildren(entity.id)
  const outgoing = rels.filter(r => r.from_entity_id === entity.id && perms.visibleRelTypes.includes(r.type))
  const incoming = rels.filter(r => r.to_entity_id === entity.id && perms.visibleRelTypes.includes(r.type))

  const statusColor = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[entity.active_status]

  // Filter metadata by permissions
  const metaEntries = Object.entries(entity.metadata).filter(([k]) => {
    if (!perms.canSeeFinancialMeta && /revenue|fee|royalty|tax|bank|billing/i.test(k)) return false
    if (!perms.canSeeLegalMeta && /legal|jurisdic|form|compliance/i.test(k)) return false
    if (!perms.canSeeTechMeta && /system|deploy|module|auth/i.test(k)) return false
    return true
  })

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'relations' as const, label: `Relations (${outgoing.length + incoming.length})` },
    { id: 'roles' as const, label: `Roles (${roles.length})` },
    ...(children.length > 0 ? [{ id: 'children' as const, label: `Children (${children.length})` }] : []),
  ]

  return (
    <div className="h-full flex flex-col bg-[#0A0C14] border-l border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{entity.flag}</span>
              <span className="font-bold text-white text-base">{entity.shortName}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{ background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30` }}
              >
                {entity.active_status}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: entity.color + '15', color: entity.color, border: `1px solid ${entity.color}25` }}
              >
                {entity.type}
              </span>
            </div>
            <div className="text-sm text-gray-200 font-medium mt-1 truncate">{entity.name}</div>
            <div className="text-xs text-gray-500 mt-0.5 font-mono">{entity.jurisdiction}</div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors ml-3 flex-shrink-0 text-lg leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 border-b border-white/[0.06] -mx-5 px-5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="text-xs pb-2 mr-4 transition-colors border-b-2 -mb-px"
              style={{
                color: tab === t.id ? entity.color : '#6B7280',
                borderColor: tab === t.id ? entity.color : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <>
            <p className="text-sm text-gray-400 leading-relaxed">{entity.description}</p>

            {metaEntries.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Key Facts</h3>
                <div className="space-y-2.5">
                  {metaEntries.map(([k, v]) => (
                    <div key={k} className="flex gap-3 items-start">
                      <span className="text-xs text-gray-600 w-28 flex-shrink-0 pt-0.5 font-mono">{k}</span>
                      <span className="text-xs text-gray-300 leading-relaxed flex-1">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Permission watermark for restricted fields */}
            {(!perms.canSeeFinancialMeta || !perms.canSeeLegalMeta || !perms.canSeeTechMeta) && (
              <div className="text-xs text-gray-700 border border-white/[0.04] rounded-lg p-3 bg-white/[0.01]">
                ⚠ Some metadata hidden based on your role permissions.
              </div>
            )}
          </>
        )}

        {/* ── Relations ── */}
        {tab === 'relations' && (
          <>
            {outgoing.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Outgoing</h3>
                <div className="space-y-2">
                  {outgoing.map(r => {
                    const s = REL_STYLE[r.type]
                    const target = ENTITIES.find(e => e.id === r.to_entity_id)
                    return (
                      <div key={r.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 border"
                        style={{ background: s.stroke + '08', borderColor: s.stroke + '20' }}>
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-300">
                            <span style={{ color: s.stroke }}>{s.label}</span>
                            <span className="text-gray-600 mx-1.5">→</span>
                            <span className="font-semibold" style={{ color: target?.color }}>{target?.shortName}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">{r.label}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {incoming.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Incoming</h3>
                <div className="space-y-2">
                  {incoming.map(r => {
                    const s = REL_STYLE[r.type]
                    const source = ENTITIES.find(e => e.id === r.from_entity_id)
                    return (
                      <div key={r.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 border"
                        style={{ background: s.stroke + '08', borderColor: s.stroke + '20' }}>
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-300">
                            <span className="font-semibold" style={{ color: source?.color }}>{source?.shortName}</span>
                            <span className="text-gray-600 mx-1.5">→</span>
                            <span style={{ color: s.stroke }}>{s.label}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">{r.label}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Roles ── */}
        {tab === 'roles' && (
          <div className="space-y-2">
            {roles.length === 0 && <p className="text-xs text-gray-600">No roles mapped to this entity.</p>}
            {roles.map(r => (
              <div key={r.person}
                className="rounded-xl border px-4 py-3"
                style={{ background: r.color + '08', borderColor: r.color + '25' }}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: r.color + '22', color: r.color }}>
                    {r.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{r.person}</div>
                    <div className="text-xs text-gray-500">{r.role_type}</div>
                  </div>
                  <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: r.color + '18', color: r.color }}>
                    {r.scope}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 pl-12">
                  {r.permissions.map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 font-mono">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Children ── */}
        {tab === 'children' && (
          <div className="space-y-2">
            {children.map(c => (
              <div key={c.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ background: c.color + '08', borderColor: c.color + '25' }}>
                <span className="text-lg">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: c.color }}>{c.shortName}</div>
                  <div className="text-xs text-gray-400 truncate">{c.name}</div>
                  <div className="text-xs text-gray-600 font-mono mt-0.5">{c.jurisdiction} · {c.type}</div>
                </div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[c.active_status] + '20',
                    color: { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[c.active_status],
                  }}
                >
                  {c.active_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ visibleTypes }: { visibleTypes: RelationshipType[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
      {(Object.entries(REL_STYLE) as [RelationshipType, typeof REL_STYLE[RelationshipType]][])
        .filter(([t]) => visibleTypes.includes(t))
        .map(([type, s]) => (
          <div key={type} className="flex items-center gap-1.5">
            <svg width={24} height={10}>
              <line x1={0} y1={5} x2={24} y2={5}
                stroke={s.stroke} strokeWidth={1.5}
                strokeDasharray={s.dash === 'none' ? undefined : s.dash}
              />
              <polygon points="20,2 24,5 20,8" fill={s.stroke} />
            </svg>
            <span style={{ color: s.stroke }}>{s.label}</span>
          </div>
        ))}
      <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-white/[0.06]">
        <span className="h-2 w-2 rounded-full bg-[#10B981]" />
        <span>Live</span>
        <span className="h-2 w-2 rounded-full bg-[#F59E0B] ml-2" />
        <span>Forming</span>
        <span className="h-2 w-2 rounded-full bg-[#6B7280] ml-2" />
        <span>Planned</span>
      </div>
    </div>
  )
}

// ─── Overlay badge ─────────────────────────────────────────────────────────────

function OverlayBadge({ mode }: { mode: OverlayMode }) {
  const info = OVERLAY_LABELS[mode]
  if (mode === 'full') return null
  return (
    <div
      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
      style={{ background: info.color + '12', color: info.color, borderColor: info.color + '30' }}
    >
      <span>{info.icon}</span>
      <span className="font-medium">{info.label} active</span>
    </div>
  )
}

// ─── Main OrgGraph component ───────────────────────────────────────────────────

export function OrgGraph() {
  const { effectiveRole } = useRole()

  // Resolve permissions from current role
  const perms: GraphPermissions = useMemo(() => {
    const roleId = effectiveRole?.id ?? 'group-ceo'
    return ROLE_PERMISSIONS[roleId] ?? ROLE_PERMISSIONS['group-ceo']
  }, [effectiveRole])

  const positions = useMemo(() => layoutNodes(perms.visibleLayers), [perms.visibleLayers])
  const visibleEntities = useMemo(() =>
    ENTITIES.filter(e => perms.visibleLayers.includes(e.layer)),
    [perms.visibleLayers]
  )
  const visibleRels = useMemo(() =>
    RELATIONSHIPS.filter(r =>
      perms.visibleRelTypes.includes(r.type) &&
      positions.has(r.from_entity_id) &&
      positions.has(r.to_entity_id)
    ),
    [perms, positions]
  )

  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleNodeClick = useCallback((entity: Entity) => {
    setSelectedEntity(prev => prev?.id === entity.id ? null : entity)
    setExpandedIds(prev => {
      const next = new Set(prev)
      const children = getChildren(entity.id)
      if (children.length > 0) {
        if (next.has(entity.id)) next.delete(entity.id)
        else next.add(entity.id)
      }
      return next
    })
  }, [])

  // Compute which entities should be dimmed
  const dimmedIds = useMemo(() => {
    if (!perms.dimmedByDefault && !selectedEntity) return new Set<string>()
    if (selectedEntity) {
      const connectedRels = getRelationships(selectedEntity.id).filter(r => perms.visibleRelTypes.includes(r.type))
      const connectedIds = new Set<string>([selectedEntity.id])
      connectedRels.forEach(r => { connectedIds.add(r.from_entity_id); connectedIds.add(r.to_entity_id) })
      return new Set(visibleEntities.filter(e => !connectedIds.has(e.id)).map(e => e.id))
    }
    // dimmedByDefault with no selection: dim non-highlighted rel entities
    if (perms.dimmedByDefault && perms.highlightRelTypes.length > 0) {
      const highlightedEntityIds = new Set<string>()
      visibleRels.filter(r => perms.highlightRelTypes.includes(r.type)).forEach(r => {
        highlightedEntityIds.add(r.from_entity_id)
        highlightedEntityIds.add(r.to_entity_id)
      })
      return new Set(visibleEntities.filter(e => !highlightedEntityIds.has(e.id)).map(e => e.id))
    }
    return new Set<string>()
  }, [selectedEntity, perms, visibleEntities, visibleRels])

  // Compute edge opacity
  const edgeOpacity = useCallback((rel: EntityRelationship) => {
    const isHighlightType = perms.highlightRelTypes.includes(rel.type)
    if (selectedEntity) {
      const rels = getRelationships(selectedEntity.id)
      const isConnected = rels.some(r => r.id === rel.id)
      return isConnected ? 1 : 0.12
    }
    if (perms.dimmedByDefault) return isHighlightType ? 1 : 0.18
    return 1
  }, [selectedEntity, perms])

  const edgeHighlighted = useCallback((rel: EntityRelationship) => {
    if (selectedEntity) {
      return getRelationships(selectedEntity.id).some(r => r.id === rel.id)
    }
    return perms.highlightRelTypes.includes(rel.type)
  }, [selectedEntity, perms])

  // SVG height based on visible layers
  const maxLayer = Math.max(...perms.visibleLayers)
  const svgHeight = LAYER_Y[maxLayer] + CARD_H + 60

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Graph area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 py-3 border-b border-white/[0.06] bg-[#080A12]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white">Corporate Graph</h1>
              <span className="text-xs text-gray-600 font-mono">
                {visibleEntities.length} entities · {visibleRels.length} relations
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">Wavult Ecosystem — navigational structure map</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <OverlayBadge mode={perms.overlayMode} />
            {selectedEntity && (
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-xs text-gray-600 hover:text-gray-300 px-2 py-1 rounded border border-white/[0.06] transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* SVG canvas */}
        <div className="flex-1 overflow-auto bg-[#060810]">
          <svg
            viewBox={`0 0 ${SVG_W} ${svgHeight}`}
            style={{ minWidth: 700, width: '100%', minHeight: svgHeight }}
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff05" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={svgHeight} fill="url(#grid)" />

            {/* Layer bands */}
            {perms.visibleLayers.map(ly => (
              <g key={ly}>
                <rect
                  x={0} y={LAYER_Y[ly] - 20}
                  width={SVG_W} height={CARD_H + 40}
                  fill={ly % 2 === 0 ? '#ffffff02' : '#ffffff01'}
                />
                <text x={14} y={LAYER_Y[ly] - 5} fontSize={8} fill="#283040" fontWeight="700" letterSpacing="2.5">
                  {LAYER_LABEL[ly]}
                </text>
              </g>
            ))}

            {/* Edges */}
            {visibleRels.map(rel => (
              <Edge
                key={rel.id}
                rel={rel}
                positions={positions}
                opacity={edgeOpacity(rel)}
                highlighted={edgeHighlighted(rel)}
              />
            ))}

            {/* Nodes */}
            {visibleEntities.map(entity => {
              const pos = positions.get(entity.id)
              if (!pos) return null
              return (
                <NodeCard
                  key={entity.id}
                  entity={entity}
                  position={pos}
                  selected={selectedEntity?.id === entity.id}
                  dimmed={dimmedIds.has(entity.id)}
                  expanded={expandedIds.has(entity.id)}
                  onClick={() => handleNodeClick(entity)}
                />
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-white/[0.06] bg-[#080A12]">
          <Legend visibleTypes={perms.visibleRelTypes} />
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selectedEntity && (
        <div className="w-[320px] flex-shrink-0">
          <DrillPanel
            entity={selectedEntity}
            perms={perms}
            onClose={() => setSelectedEntity(null)}
          />
        </div>
      )}
    </div>
  )
}
