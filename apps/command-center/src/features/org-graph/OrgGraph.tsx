import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ENTITIES, RELATIONSHIPS,
  getChildren, getRelationships, getRoleMappings,
  Entity, EntityRelationship, RelationshipType,
} from './data'
import { useRole } from '../../shared/auth/RoleContext'
import { ROLE_PERMISSIONS, OVERLAY_LABELS, GraphPermissions, OverlayMode } from './permissions'
import { COMMAND_CHAIN, STATUS_COLOR, getDirectReports, getApexRole } from './commandChain'
import { generateIncidents, computePropagation, getRoleKPIs, getKPIStatus, KPI_STATUS_COLOR } from '../incidents/incidentEngine'

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

// ─── Command chain layout (right-side column) ─────────────────────────────────
// Apex sits at layer 0 y-level, direct reports at layer 1 y-level.
// Always rendered in a fixed right column — never overlaps entities.
const CMD_X_START = SVG_W + 40       // starts just past the main graph
const CMD_NODE_W  = 200
const CMD_NODE_H  = 90
const CMD_GAP     = 28               // vertical gap between apex and reports
const CMD_APEX_Y  = LAYER_Y[0]       // same y as holding layer
const TOTAL_W     = CMD_X_START + CMD_NODE_W + 32  // full svg width with command column

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

// ─── Animated Flow Edge ───────────────────────────────────────────────────────
// Each relationship type has a particle flowing along it.
// KPI stress = faster particles + thicker stroke + vibration on line.
// Flow direction is always from → to (ownership down, financial_flow down, etc.)

// Stress level per entity (from incident propagation)
const FLOW_CONFIG: Record<RelationshipType, {
  stroke: string; dash: string; label: string;
  particleColor: string; particleSize: number; speed: number;
  baseWidth: number;       // normal line thickness
  highlightWidth: number;  // when highlighted
  glowColor: string;       // SVG drop-shadow color
  symbol?: string;         // optional text symbol on particle (€/$)
}> = {
  ownership:      { stroke: '#8B5CF6', dash: 'none', label: 'Ownership',     particleColor: '#A78BFA', particleSize: 4,   speed: 3.5, baseWidth: 1.8, highlightWidth: 3,   glowColor: '#8B5CF688' },
  financial_flow: { stroke: '#10B981', dash: 'none', label: 'Financial Flow', particleColor: '#34D399', particleSize: 5.5, speed: 2.2, baseWidth: 2.2, highlightWidth: 3.5, glowColor: '#10B98188', symbol: '€' },
  licensing:      { stroke: '#F59E0B', dash: '6 4',  label: 'IP License',    particleColor: '#FCD34D', particleSize: 3,   speed: 4.5, baseWidth: 1.5, highlightWidth: 2.5, glowColor: '#F59E0B66' },
  service:        { stroke: '#0EA5E9', dash: '4 3',  label: 'Service',        particleColor: '#38BDF8', particleSize: 3,   speed: 3.2, baseWidth: 1.5, highlightWidth: 2.5, glowColor: '#0EA5E966' },
  control:        { stroke: '#EF4444', dash: 'none', label: 'Control',        particleColor: '#F87171', particleSize: 4.5, speed: 1.8, baseWidth: 2.5, highlightWidth: 4,   glowColor: '#EF444488' },
}
// Keep REL_STYLE alias for Legend compatibility
const REL_STYLE = Object.fromEntries(
  Object.entries(FLOW_CONFIG).map(([k, v]) => [k, { stroke: v.stroke, dash: v.dash, label: v.label }])
) as Record<RelationshipType, { stroke: string; dash: string; label: string }>

function buildEdgePath(
  fx: number, fy: number, tx: number, ty: number
): string {
  const midY = (fy + ty) / 2
  const isSameLayer = Math.abs(fy - ty) < 10
  return isSameLayer
    ? `M ${fx} ${fy} Q ${(fx + tx) / 2} ${fy - 40} ${tx} ${ty}`
    : `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`
}

function Edge({
  rel, positions, opacity, highlighted, stressed,
}: {
  rel: EntityRelationship
  positions: Map<string, { x: number; y: number }>
  opacity: number
  highlighted: boolean
  stressed: boolean   // KPI failure on from-entity — triggers stress animation
}) {
  const from = positions.get(rel.from_entity_id)
  const to   = positions.get(rel.to_entity_id)
  if (!from || !to) return null

  const cfg = FLOW_CONFIG[rel.type]
  const fx  = from.x + CARD_W / 2
  const fy  = from.y + CARD_H
  const tx  = to.x + CARD_W / 2
  const ty  = to.y
  const d   = buildEdgePath(fx, fy, tx, ty)

  const pathId     = `path-${rel.id}`
  const markerId   = `arr-${rel.id}`
  const animId     = `anim-${rel.id}`

  // Stress: thicker + red tint + faster particles
  const strokeColor  = stressed ? '#EF4444' : cfg.stroke
  const strokeW      = stressed ? cfg.highlightWidth + 1 : highlighted ? cfg.highlightWidth : cfg.baseWidth
  const particleSpd  = stressed ? cfg.speed * 0.35 : cfg.speed
  const glowFilter   = stressed
    ? `drop-shadow(0 0 8px #EF444499)`
    : highlighted ? `drop-shadow(0 0 5px ${cfg.glowColor})` : `drop-shadow(0 0 2px ${cfg.glowColor}44)`

  return (
    <g style={{ opacity, transition: 'opacity 0.3s' }}>
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L8,3.5 z" fill={strokeColor} opacity={0.9} />
        </marker>
      </defs>

      {/* Invisible wide hit area */}
      <path id={pathId} d={d} fill="none" stroke="transparent" strokeWidth={16} />

      {/* Ownership: soft pulse on the line itself */}
      {rel.type === 'ownership' && !stressed && (
        <path d={d} fill="none" stroke={cfg.stroke} strokeWidth={cfg.baseWidth + 2} opacity={0}>
          <animate attributeName="opacity" values="0;0.2;0" dur="3s" repeatCount="indefinite" />
        </path>
      )}

      {/* Main line */}
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeDasharray={cfg.dash === 'none' ? undefined : cfg.dash}
        markerEnd={`url(#${markerId})`}
        style={{ filter: glowFilter, transition: 'all 0.3s' }}
      />

      {/* ── Primary particle ── */}
      {opacity > 0.3 && !cfg.symbol && (
        <circle r={cfg.particleSize * (stressed ? 1.5 : 1)} fill={stressed ? '#EF4444' : cfg.particleColor} opacity={0.92}>
          <animateMotion id={animId} dur={`${particleSpd}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}

      {/* Financial flow: € symbol particle instead of plain circle */}
      {opacity > 0.3 && cfg.symbol && !stressed && (
        <>
          <text fontSize={9} fontWeight="700" fill={cfg.particleColor} opacity={0.95} textAnchor="middle">
            {cfg.symbol}
            <animateMotion dur={`${particleSpd}s`} repeatCount="indefinite" path={d} />
          </text>
          {/* Trailing dot */}
          <circle r={3.5} fill={cfg.particleColor} opacity={0.4}>
            <animateMotion dur={`${particleSpd}s`} begin={`${particleSpd * 0.45}s`} repeatCount="indefinite" path={d} />
          </circle>
          {/* Third faint dot */}
          <circle r={2.5} fill={cfg.particleColor} opacity={0.25}>
            <animateMotion dur={`${particleSpd}s`} begin={`${particleSpd * 0.78}s`} repeatCount="indefinite" path={d} />
          </circle>
        </>
      )}

      {/* Financial stressed — dollar sign flickering + rapid dots */}
      {opacity > 0.3 && cfg.symbol && stressed && (
        <>
          <text fontSize={9} fontWeight="700" fill="#EF4444" opacity={0.95} textAnchor="middle">
            ⚠
            <animateMotion dur={`${particleSpd}s`} repeatCount="indefinite" path={d} />
          </text>
          <circle r={4} fill="#EF4444" opacity={0.7}>
            <animateMotion dur={`${particleSpd * 0.6}s`} begin={`${particleSpd * 0.3}s`} repeatCount="indefinite" path={d} />
          </circle>
        </>
      )}

      {/* Stress: second rapid particle (non-financial) */}
      {stressed && !cfg.symbol && (
        <circle r={3} fill="#FF4444" opacity={0.6}>
          <animateMotion dur={`${particleSpd * 0.65}s`} begin={`${particleSpd * 0.3}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}

      {/* Control: second always-on particle for dominance */}
      {rel.type === 'control' && !stressed && opacity > 0.3 && (
        <circle r={2.5} fill={cfg.particleColor} opacity={0.5}>
          <animateMotion dur={`${particleSpd}s`} begin={`${particleSpd * 0.6}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  )
}

// ─── Node card ────────────────────────────────────────────────────────────────

function NodeCard({
  entity, position, selected, dimmed, expanded, stressed, cascadeStressed, onClick,
}: {
  entity: Entity
  position: { x: number; y: number }
  selected: boolean
  dimmed: boolean
  expanded: boolean
  stressed: boolean
  cascadeStressed: boolean
  onClick: () => void
}) {
  const statusColor = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[entity.active_status]
  const roles = getRoleMappings(entity.id)
  const childCount = getChildren(entity.id).length

  const nodeFilter = stressed
    ? `drop-shadow(0 0 16px #EF444488)`
    : cascadeStressed
      ? `drop-shadow(0 0 10px #F59E0B55)`
      : selected ? `drop-shadow(0 0 12px ${entity.color})` : 'none'

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={onClick}
      className="cursor-pointer"
      style={{
        opacity: dimmed ? 0.25 : 1,
        filter: nodeFilter,
        transition: 'all 0.3s',
      }}
    >
      {/* Stress pulse ring — animated outer glow */}
      {stressed && (
        <rect
          x={-3} y={-3}
          width={CARD_W + 6} height={CARD_H + 6}
          rx={13}
          fill="none"
          stroke="#EF4444"
          strokeWidth={1.5}
        >
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="1.5;3;1.5" dur="1.4s" repeatCount="indefinite" />
        </rect>
      )}
      {cascadeStressed && !stressed && (
        <rect
          x={-2} y={-2}
          width={CARD_W + 4} height={CARD_H + 4}
          rx={12}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={1}
        >
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Shadow */}
      <rect width={CARD_W} height={CARD_H} rx={10} fill={stressed ? '#EF4444' : entity.color} opacity={selected ? 0.12 : stressed ? 0.08 : 0.04} />

      {/* Card */}
      <rect
        width={CARD_W}
        height={CARD_H}
        rx={10}
        fill={stressed ? '#110808' : cascadeStressed ? '#0F0D06' : '#0C0E16'}
        stroke={stressed ? '#EF4444' : cascadeStressed ? '#F59E0B55' : selected ? entity.color : entity.color + '45'}
        strokeWidth={stressed ? 2 : selected ? 2 : 1}
      />

      {/* Top accent bar — red when stressed */}
      <rect width={CARD_W} height={3} rx={1.5} fill={stressed ? '#EF4444' : cascadeStressed ? '#F59E0B' : entity.color} opacity={0.9} />

      {/* ── MICRO-ANIMATION: breathing glow behind card (live entities only) ── */}
      {entity.active_status === 'live' && !stressed && (
        <rect
          x={-1} y={-1}
          width={CARD_W + 2} height={CARD_H + 2}
          rx={11}
          fill="none"
          stroke={entity.color}
          strokeWidth={1}
          opacity={0}
        >
          <animate attributeName="opacity" values="0;0.35;0" dur="3s" repeatCount="indefinite" />
        </rect>
      )}

      {/* ── MICRO-ANIMATION: financial flicker — small $ pulse on left edge ── */}
      {entity.active_status === 'live' && (
        <text
          x={CARD_W - 8} y={CARD_H - 8}
          fontSize={7}
          fill="#10B981"
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="700"
        >
          €
          <animate attributeName="opacity" values="0;0.7;0;0.5;0" dur="4.5s" repeatCount="indefinite" begin="1s" />
        </text>
      )}

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

      {/* Status indicator — pulses when live */}
      <circle cx={CARD_W - 14} cy={16} r={4.5} fill={statusColor} />
      {entity.active_status === 'live' && (
        <circle cx={CARD_W - 14} cy={16} r={4.5} fill="none" stroke={statusColor} strokeWidth={1.5}>
          <animate attributeName="r" values="4.5;8;4.5" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* ── MICRO-ANIMATION: rotating gear ⚙ for active/live entities ── */}
      {entity.active_status === 'live' && (
        <g transform={`translate(${CARD_W - 30}, ${CARD_H - 22})`} opacity={0.4}>
          <text fontSize={11} fill={entity.color} textAnchor="middle" x={0} y={9}>
            ⚙
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 4.5"
              to="360 0 4.5"
              dur="8s"
              repeatCount="indefinite"
            />
          </text>
        </g>
      )}

      {/* Forming indicator — slow pulse */}
      {entity.active_status === 'forming' && (
        <g transform={`translate(${CARD_W - 30}, ${CARD_H - 22})`} opacity={0}>
          <text fontSize={9} fill="#F59E0B" textAnchor="middle" x={0} y={9}>◐</text>
          <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite" />
        </g>
      )}

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
  const navigate = useNavigate()
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
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={() => navigate(`/entities/${entity.id}`)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: entity.color + '20', color: entity.color, border: `1px solid ${entity.color}35` }}
                title="Open Entity Control Center"
              >
                Enter →
              </button>
              <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none">✕</button>
          </div>
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
            {roles.map(r => {
              const cmdRole = COMMAND_CHAIN.find(c => c.person === r.person)
              const superior = cmdRole?.reports_to ? COMMAND_CHAIN.find(c => c.id === cmdRole.reports_to) : null
              return (
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
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {cmdRole && (
                      <span className="h-2 w-2 rounded-full"
                        style={{ background: STATUS_COLOR[cmdRole.status], boxShadow: `0 0 4px ${STATUS_COLOR[cmdRole.status]}` }}
                        title={`Status: ${cmdRole.status}`}
                      />
                    )}
                    <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: r.color + '18', color: r.color }}>
                      {r.scope}
                    </div>
                  </div>
                </div>
                {/* reports_to chain */}
                {superior && (
                  <div className="flex items-center gap-1.5 mt-2 pl-12 text-[10px]">
                    <span className="text-gray-700 font-mono">reports_to</span>
                    <span className="text-gray-600">→</span>
                    <span style={{ color: superior.color }}>{superior.person}</span>
                  </div>
                )}
                {!superior && cmdRole && (
                  <div className="mt-2 pl-12 text-[10px] text-gray-700 font-mono">◆ Apex — no superior</div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2 pl-12">
                  {r.permissions.map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 font-mono">{p}</span>
                  ))}
                </div>
              </div>
              )
            })}
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
      <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-white/[0.06]">
        <svg width={20} height={10}>
          <line x1={0} y1={5} x2={14} y2={5} stroke="#8B5CF6" strokeWidth={2.5} />
          <polygon points="12,2 17,5 12,8" fill="#8B5CF6" />
        </svg>
        <span style={{ color: '#8B5CF6' }}>reports_to</span>
        <span className="h-2 w-2 rounded-full bg-[#10B981] ml-2" />
        <span>On track</span>
        <span className="h-2 w-2 rounded-full bg-[#F59E0B] ml-1" />
        <span>Watch</span>
        <span className="h-2 w-2 rounded-full bg-[#EF4444] ml-1" />
        <span>Action needed</span>
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

// ─── Command Chain SVG overlay ────────────────────────────────────────────────
// Rendered as a permanent column to the right of entity nodes.
// Straight vertical lines — no curves. Always on.

function CommandChainNode({
  role, x, y, selected, isPrimary, isCascade, onClick,
}: {
  role: typeof COMMAND_CHAIN[0]
  x: number
  y: number
  selected: boolean
  isPrimary: boolean    // has red KPIs — node pulses
  isCascade: boolean    // affected by upstream failure
  onClick: () => void
}) {
  const kpis      = getRoleKPIs(role.id)
  const reports   = COMMAND_CHAIN.find(r => r.id === role.reports_to)

  // Incident status drives node appearance
  const incidentColor = isPrimary ? '#EF4444' : isCascade ? '#F59E0B' : role.color
  const glowFilter    = isPrimary
    ? `drop-shadow(0 0 12px #EF444480)`
    : selected ? `drop-shadow(0 0 10px ${role.color}80)` : 'none'

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer"
      style={{ filter: glowFilter, transition: 'all 0.3s' }}>

      {/* Card bg */}
      <rect width={CMD_NODE_W} height={CMD_NODE_H} rx={9}
        fill={isPrimary ? '#1A0808' : isCascade ? '#130F05' : selected ? role.color : '#0C0E1A'}
        fillOpacity={selected && !isPrimary ? 0.14 : 1}
        stroke={incidentColor}
        strokeOpacity={isPrimary ? 0.8 : selected ? 0.7 : 0.28}
        strokeWidth={isPrimary ? 2 : selected ? 1.5 : 1}
      />

      {/* Status bar top — incident color overrides role color */}
      <rect x={0} y={0} width={CMD_NODE_W} height={3} rx={9} fill={incidentColor} />

      {/* Incident indicator */}
      {isPrimary && (
        <text x={CMD_NODE_W - 8} y={14} textAnchor="end" fontSize={10}>🔴</text>
      )}
      {!isPrimary && isCascade && (
        <text x={CMD_NODE_W - 8} y={14} textAnchor="end" fontSize={10}>⚠️</text>
      )}

      {/* Avatar */}
      <rect x={10} y={14} width={32} height={32} rx={8} fill={role.color} fillOpacity={0.18} />
      <text x={26} y={35} textAnchor="middle" fontSize={11} fontWeight="700" fill={role.color}>{role.initials}</text>

      {/* Name + title */}
      <text x={50} y={26} fontSize={10} fontWeight="700" fill="#FFFFFF">{role.person}</text>
      <text x={50} y={38} fontSize={8.5} fill={isPrimary ? '#EF9494' : role.color}>{role.title}</text>

      {/* reports_to */}
      {reports && (
        <text x={50} y={52} fontSize={7.5} fill="#4B5563">
          <tspan fill="#374151" fontFamily="monospace">reports_to</tspan>
          {` → ${reports.person}`}
        </text>
      )}
      {!reports && (
        <text x={50} y={52} fontSize={7.5} fill="#4B5563" fontFamily="monospace">◆ Apex</text>
      )}

      {/* KPI status bar — live from incidentEngine */}
      {kpis.slice(0, 2).map((kpi, i) => {
        const kStatus = getKPIStatus(kpi)
        const kColor  = KPI_STATUS_COLOR[kStatus]
        const barW    = (kpi.current_value / kpi.target_value) * (CMD_NODE_W - 22)
        const y_pos   = 68 + i * 14
        return (
          <g key={kpi.id}>
            <text x={10} y={y_pos} fontSize={7} fill="#374151">{kpi.name}</text>
            <rect x={10} y={y_pos + 2} width={CMD_NODE_W - 22} height={3} rx={2} fill="#ffffff08" />
            <rect x={10} y={y_pos + 2} width={Math.min(barW, CMD_NODE_W - 22)} height={3} rx={2} fill={kColor} />
            <text x={CMD_NODE_W - 10} y={y_pos} textAnchor="end" fontSize={7} fontWeight="700" fill={kColor}>
              {kpi.current}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function CommandChainLayer({
  visible, selectedCmdId, onSelectCmd, primaryFailures, cascadeFailures,
}: {
  visible: boolean
  selectedCmdId: string | null
  onSelectCmd: (id: string | null) => void
  primaryFailures: string[]
  cascadeFailures: string[]
}) {
  if (!visible) return null

  const apex    = getApexRole()
  const reports = getDirectReports(apex.id)

  // Apex: top position (layer 0 y)
  // Reports: stacked vertically below apex, single column
  const reportTotalH = reports.length * (CMD_NODE_H + 16)

  return (
    <g>
      {/* Column background */}
      <rect
        x={CMD_X_START - 16}
        y={CMD_APEX_Y - 24}
        width={CMD_NODE_W + 32}
        height={CMD_APEX_Y + CMD_NODE_H + CMD_GAP + reportTotalH + 48}
        rx={14}
        fill="#0A0C18"
        stroke="#ffffff06"
        strokeWidth={1}
      />
      {/* Column label */}
      <text x={CMD_X_START} y={CMD_APEX_Y - 10} fontSize={8} fill="#283040" fontWeight="700" letterSpacing="2">
        COMMAND CHAIN
      </text>

      {/* Apex */}
      <CommandChainNode
        role={apex}
        x={CMD_X_START}
        y={CMD_APEX_Y}
        selected={selectedCmdId === apex.id}
        isPrimary={primaryFailures.includes(apex.id)}
        isCascade={cascadeFailures.includes(apex.id)}
        onClick={() => onSelectCmd(selectedCmdId === apex.id ? null : apex.id)}
      />

      {/* Trunk + connectors */}
      {(() => {
        const apexCx  = CMD_X_START + CMD_NODE_W / 2
        const apexBot = CMD_APEX_Y + CMD_NODE_H
        const busY    = apexBot + CMD_GAP / 2
        const firstRepY = CMD_APEX_Y + CMD_NODE_H + CMD_GAP

        return (
          <g>
            <line x1={apexCx} y1={apexBot} x2={apexCx} y2={busY} stroke="#8B5CF680" strokeWidth={3} />
            <text x={apexCx + 6} y={busY - 3} fontSize={7} fill="#374151" fontFamily="monospace">reports_to</text>
            {/* Vertical line down the whole stack */}
            <line
              x1={apexCx} y1={busY}
              x2={apexCx} y2={firstRepY + reportTotalH - 16}
              stroke="#ffffff10" strokeWidth={1.5}
            />
          </g>
        )
      })()}

      {/* Direct reports — stacked vertically */}
      {reports.map((r, i) => {
        const ry = CMD_APEX_Y + CMD_NODE_H + CMD_GAP + i * (CMD_NODE_H + 16)
        const cx = CMD_X_START + CMD_NODE_W / 2
        return (
          <g key={r.id}>
            {/* Tick from spine */}
            <line x1={cx} y1={ry + CMD_NODE_H / 2} x2={CMD_X_START} y2={ry + CMD_NODE_H / 2}
              stroke="#ffffff10" strokeWidth={1} strokeDasharray="3 3" />
            <CommandChainNode
              role={r}
              x={CMD_X_START}
              y={ry}
              selected={selectedCmdId === r.id}
              isPrimary={primaryFailures.includes(r.id)}
              isCascade={cascadeFailures.includes(r.id)}
              onClick={() => onSelectCmd(selectedCmdId === r.id ? null : r.id)}
            />
          </g>
        )
      })}
    </g>
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
  const [showCommandChain, setShowCommandChain] = useState(true)
  const [selectedCmdId, setSelectedCmdId] = useState<string | null>(null)

  // Live incident propagation — drives visual "bleeding" in the graph
  const incidents = useMemo(() => generateIncidents(), [])
  const propagation = useMemo(() => computePropagation(incidents), [incidents])

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

  // SVG height — must accommodate command chain column when shown
  const maxLayer = Math.max(...perms.visibleLayers)
  const reports = getDirectReports(getApexRole().id)
  const cmdColHeight = CMD_APEX_Y + CMD_NODE_H + CMD_GAP + reports.length * (CMD_NODE_H + 16) + 60
  const svgHeight = Math.max(LAYER_Y[maxLayer] + CARD_H + 60, showCommandChain ? cmdColHeight : 0)
  const svgW = showCommandChain ? TOTAL_W : SVG_W

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
            {/* Command chain toggle */}
            <button
              onClick={() => setShowCommandChain(p => !p)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={showCommandChain
                ? { background: '#8B5CF618', color: '#8B5CF6', borderColor: '#8B5CF640' }
                : { background: 'transparent', color: '#6B7280', borderColor: '#ffffff12' }
              }
            >
              <span>⬆</span>
              <span className="font-medium">Command Chain</span>
            </button>
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
            viewBox={`0 0 ${svgW} ${svgHeight}`}
            style={{ minWidth: showCommandChain ? TOTAL_W : 700, width: '100%', minHeight: svgHeight }}
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff05" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={svgW} height={svgHeight} fill="url(#grid)" />

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
                stressed={propagation.primary_failures.includes(rel.from_entity_id) || propagation.cascade_failures.includes(rel.from_entity_id)}
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
                  stressed={propagation.primary_failures.includes(entity.id)}
                  cascadeStressed={propagation.cascade_failures.includes(entity.id)}
                  onClick={() => handleNodeClick(entity)}
                />
              )
            })}

            {/* ── Command Chain Layer (always right, togglable) ── */}
            <CommandChainLayer
              visible={showCommandChain}
              selectedCmdId={selectedCmdId}
              onSelectCmd={setSelectedCmdId}
              primaryFailures={propagation.primary_failures}
              cascadeFailures={propagation.cascade_failures}
            />

            {/* Separator line between entity graph and command column */}
            {showCommandChain && (
              <line
                x1={CMD_X_START - 20} y1={20}
                x2={CMD_X_START - 20} y2={svgHeight - 20}
                stroke="#ffffff06" strokeWidth={1}
              />
            )}
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
