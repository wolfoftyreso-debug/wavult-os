import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ENTITIES, RELATIONSHIPS,
  getChildren, getRelationships, getRoleMappings,
  Entity, EntityRelationship, RelationshipType,
} from './data'
import { useRole } from '../../shared/auth/RoleContext'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { ROLE_PERMISSIONS, GraphPermissions } from './permissions'
import { COMMAND_CHAIN, getDirectReports, getApexRole } from './commandChain'
import { generateIncidents, computePropagation, getRoleKPIs, getKPIStatus, KPI_STATUS_COLOR } from '../incidents/incidentEngine'
import { MARKET_SITES, SITE_STATUS_COLOR } from '../market-sites/data'

// ─── Layout constants ──────────────────────────────────────────────────────────

const LAYER_Y: Record<number, number> = { 0: 70, 1: 240, 2: 430, 3: 630 }
const LAYER_LABEL: Record<number, string> = {
  0: 'HOLDING / IP',
  1: 'OPERATIONS',
  2: 'PRODUCT ENTITIES',
  3: 'SYSTEMS',
}
const CARD_W = 220
const CARD_H = 120
const SVG_W = 1120

// ─── Command chain layout (right-side column) ─────────────────────────────────
// Apex sits at layer 0 y-level, direct reports at layer 1 y-level.
// Always rendered in a fixed right column — never overlaps entities.
const CMD_X_START = SVG_W + 40       // starts just past the main graph
const CMD_NODE_W  = 210
const CMD_NODE_H  = 105
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
  // Default: only ownership is visible. Others shown on hover/filter only.
  // VISUAL HIERARCHY: ownership=thick white, everything else=very faint
  ownership:      { stroke: '#FFFFFF', dash: 'none', label: 'Ägarskap',     particleColor: '#FFFFFF', particleSize: 3,   speed: 2,   baseWidth: 2.5, highlightWidth: 4,   glowColor: '#ffffff33' },
  financial_flow: { stroke: '#10B981', dash: 'none', label: 'Kapitalflöde', particleColor: '#34D399', particleSize: 2,   speed: 2,   baseWidth: 1.2, highlightWidth: 2,   glowColor: '#10B98133', symbol: '€' },
  licensing:      { stroke: '#F59E0B', dash: '6 4',  label: 'IP-licens',    particleColor: '#FCD34D', particleSize: 2,   speed: 3,   baseWidth: 1,   highlightWidth: 2,   glowColor: '#F59E0B33' },
  service:        { stroke: '#0EA5E9', dash: '4 3',  label: 'Tjänst',       particleColor: '#38BDF8', particleSize: 2,   speed: 3,   baseWidth: 1,   highlightWidth: 2,   glowColor: '#0EA5E933' },
  control:        { stroke: '#EF4444', dash: 'none', label: 'Kontroll',      particleColor: '#F87171', particleSize: 3,   speed: 2,   baseWidth: 1.5, highlightWidth: 3,   glowColor: '#EF444433' },
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
  rel, positions, opacity, highlighted, stressed, muted, showAllEdges,
}: {
  rel: EntityRelationship
  positions: Map<string, { x: number; y: number }>
  opacity: number
  highlighted: boolean
  stressed: boolean      // KPI failure on from-entity — triggers stress animation
  muted: boolean         // Flow overlay off — show lines only, no particles
  showAllEdges: boolean  // Show all relationship types with particles
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

      {/* ── Primary particle — only show non-ownership particles when showAllEdges === true ── */}
      {opacity > 0.3 && !muted && !cfg.symbol && (rel.type === 'ownership' || showAllEdges) && (
        <circle r={cfg.particleSize * (stressed ? 1.5 : 1)} fill={stressed ? '#EF4444' : cfg.particleColor} opacity={0.92}>
          <animateMotion id={animId} dur={`${particleSpd}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}

      {/* Financial flow: € symbol particle instead of plain circle */}
      {opacity > 0.3 && !muted && cfg.symbol && !stressed && showAllEdges && (
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
      {opacity > 0.3 && !muted && cfg.symbol && stressed && showAllEdges && (
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
      {rel.type === 'control' && !stressed && opacity > 0.3 && !muted && showAllEdges && (
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
      <text x={14} y={30} fontSize={14} fill={entity.color} fontWeight="700" fontFamily="monospace">
        {typeof entity.flag === 'string' && entity.flag.length <= 2 ? entity.flag : ''} {entity.shortName}
      </text>

      {/* Full name — truncate if long */}
      <text x={14} y={48} fontSize={11} fill="#D1D5DB" fontFamily="sans-serif" fontWeight="500">
        {entity.name.length > 24 ? entity.name.slice(0, 23) + '…' : entity.name}
      </text>

      {/* Jurisdiction + type */}
      <text x={14} y={64} fontSize={10} fill="#9CA3AF">
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

      {/* Role avatars — square photos, professional grid */}
      {roles.slice(0, 5).map((rm, i) => {
        const cmdRole = COMMAND_CHAIN.find(c => c.person === rm.person)
        const photoUrl = cmdRole?.avatar
          ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rm.person)}&backgroundColor=transparent`
        const clipId = `clip-sq-${rm.person.replace(/[\s.]/g, '-')}-${i}`
        const SIZE = 22
        const GAP = 26
        const x0 = 14
        return (
          <g key={rm.person} transform={`translate(${x0 + i * GAP}, 76)`}>
            {/* Square background with entity color tint */}
            <rect width={SIZE} height={SIZE} rx={3} fill={rm.color + '22'} stroke={rm.color + '60'} strokeWidth={1} />
            <clipPath id={clipId}>
              <rect width={SIZE} height={SIZE} rx={3} />
            </clipPath>
            <image
              href={photoUrl}
              x={0} y={0} width={SIZE} height={SIZE}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        )
      })}

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

// ─── Entity Panel — Precision Control Interface ───────────────────────────────
// Answers: What is this? Why does it exist? Who owns it? Is it healthy? What next?

// Reusable section block
function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.15em] mb-2 px-1">{label}</div>
      {children}
    </div>
  )
}

// "Next action" logic — computed from health + incidents
function computeNextAction(entity: Entity, incidents: ReturnType<typeof generateIncidents>): { text: string; urgency: 'critical' | 'warn' | 'ok' } {
  const entityIncidents = incidents.filter(i =>
    i.rca.affected_entities.includes(entity.id) || i.role_id === entity.id
  )
  const critical = entityIncidents.find(i => i.severity === 'critical')
  if (critical) return { text: critical.rca.dependency_chain[0] ?? 'Resolve critical KPI failure', urgency: 'critical' }

  const statusMap: Record<string, string> = {
    forming: `Complete incorporation — ${entity.jurisdiction} legal filing required`,
    planned: 'Initiate formation process',
    live: 'Operational — monitor KPIs',
  }
  return { text: statusMap[entity.active_status] ?? 'No action required', urgency: entity.active_status === 'live' ? 'ok' : 'warn' }
}

function DrillPanel({
  entity, perms, onClose,
}: {
  entity: Entity
  perms: GraphPermissions
  onClose: () => void
}) {
  const navigate  = useNavigate()
  const incidents = useMemo(() => generateIncidents(), [])

  const rels     = getRelationships(entity.id)
  const roles    = getRoleMappings(entity.id)
  const children = getChildren(entity.id)
  const outgoing = rels.filter(r => r.from_entity_id === entity.id && perms.visibleRelTypes.includes(r.type))
  const incoming = rels.filter(r => r.to_entity_id === entity.id && perms.visibleRelTypes.includes(r.type))
  const nextAction = computeNextAction(entity, incidents)

  const statusColor = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[entity.active_status]

  // Metadata filtered by permissions — only surface visible fields
  const metaEntries = Object.entries(entity.metadata).filter(([k]) => {
    if (!perms.canSeeFinancialMeta && /revenue|fee|royalty|tax|bank|billing/i.test(k)) return false
    if (!perms.canSeeLegalMeta && /legal|jurisdic|form|compliance/i.test(k)) return false
    if (!perms.canSeeTechMeta && /system|deploy|module|auth/i.test(k)) return false
    return true
  })

  const urgencyStyle = {
    critical: { bg: '#EF444412', border: '#EF444430', text: '#F87171', dot: '#EF4444' },
    warn:     { bg: '#F59E0B10', border: '#F59E0B28', text: '#FCD34D', dot: '#F59E0B' },
    ok:       { bg: '#10B98110', border: '#10B98128', text: '#6EE7B7', dot: '#10B981' },
  }[nextAction.urgency]

  return (
    <div className="h-full flex flex-col bg-[#09090F] border-l border-white/[0.06] overflow-hidden" style={{ width: 340 }}>

      {/* ── SNAPSHOT ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.05]">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{entity.flag}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-[15px] leading-tight">{entity.shortName}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: statusColor + '18', color: statusColor }}>
                  {entity.active_status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{entity.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate(`/entities/${entity.id}`)}
              className="text-[10px] px-2.5 py-1.5 rounded-lg font-bold tracking-wide transition-all hover:opacity-80"
              style={{ background: entity.color + '22', color: entity.color, border: `1px solid ${entity.color}38` }}
            >
              OPEN
            </button>
            <button onClick={onClose}
              className="text-gray-600 hover:text-gray-300 transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.05]">
              ✕
            </button>
          </div>
        </div>

        {/* Impact strip: type · jurisdiction · layer */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[10px] text-gray-600 font-mono uppercase">{entity.type}</span>
          <span className="text-gray-800">·</span>
          <span className="text-[10px] text-gray-600">{entity.jurisdiction}</span>
          <span className="text-gray-800">·</span>
          <span className="text-[10px] font-mono" style={{ color: entity.color }}>Layer {entity.layer}</span>
          {children.length > 0 && (
            <>
              <span className="text-gray-800">·</span>
              <span className="text-[10px] text-gray-600">{children.length} subsidiaries</span>
            </>
          )}
        </div>

        {/* Next action — always visible */}
        <div className="mt-3 px-3 py-2 rounded-xl flex items-start gap-2.5"
          style={{ background: urgencyStyle.bg, border: `1px solid ${urgencyStyle.border}` }}>
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5"
            style={{ background: urgencyStyle.dot }} />
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5"
              style={{ color: urgencyStyle.text }}>
              {nextAction.urgency === 'critical' ? 'CRITICAL — ACTION REQUIRED' : nextAction.urgency === 'warn' ? 'NEXT STEP' : 'STATUS'}
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">{nextAction.text}</p>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE SECTIONS ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* 2. PURPOSE */}
        <PanelSection label="Purpose — why it exists">
          <p className="text-[12px] text-gray-400 leading-relaxed px-1">{entity.description}</p>
        </PanelSection>

        {/* 3. HOW IT WORKS — key facts */}
        {metaEntries.length > 0 && (
          <PanelSection label="How it works">
            <div className="rounded-xl border border-white/[0.05] overflow-hidden">
              {metaEntries.map(([k, v], i) => (
                <div key={k}
                  className={`flex gap-3 px-3 py-2 ${i < metaEntries.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <span className="text-[10px] text-gray-600 font-mono w-24 flex-shrink-0 pt-0.5 leading-relaxed">{k}</span>
                  <span className="text-[11px] text-gray-300 leading-relaxed flex-1">{v}</span>
                </div>
              ))}
            </div>
          </PanelSection>
        )}

        {/* 4. PERFORMANCE — live KPIs from incidentEngine */}
        {(() => {
          const entityRoles = roles.map(r => COMMAND_CHAIN.find(c => c.person === r.person)).filter(Boolean)
          const allKPIs = entityRoles.flatMap(c => getRoleKPIs(c!.id))
          if (allKPIs.length === 0) return null
          return (
            <PanelSection label="Performance">
              <div className="space-y-1.5">
                {allKPIs.map(kpi => {
                  const st = getKPIStatus(kpi)
                  const c  = KPI_STATUS_COLOR[st]
                  const pct = Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100))
                  return (
                    <div key={kpi.id} className="rounded-lg px-3 py-2 border border-white/[0.04] bg-white/[0.01]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-gray-300">{kpi.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold font-mono" style={{ color: c }}>{kpi.current}</span>
                          <span className="text-[9px] px-1 py-px rounded font-mono"
                            style={{ background: c + '18', color: c }}>{st.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                          <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
                        </div>
                        <span className="text-[9px] text-gray-700 font-mono w-12 text-right">→ {kpi.target}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </PanelSection>
          )
        })()}

        {/* 5. RESPONSIBILITY TREE */}
        {roles.length > 0 && (
          <PanelSection label="Responsibility">
            <div className="space-y-1.5">
              {roles.map(r => {
                const cmdRole  = COMMAND_CHAIN.find(c => c.person === r.person)
                const superior = cmdRole?.reports_to ? COMMAND_CHAIN.find(c => c.id === cmdRole.reports_to) : null
                const kpiStatus = cmdRole ? getRoleKPIs(cmdRole.id).some(k => getKPIStatus(k) === 'red')
                  ? 'red' : getRoleKPIs(cmdRole.id).some(k => getKPIStatus(k) === 'yellow') ? 'yellow' : 'green'
                  : null
                return (
                  <div key={r.person} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/[0.04]"
                    style={{ background: r.color + '06' }}>
                    {(() => {
                      const cmdR = COMMAND_CHAIN.find(c => c.person === r.person)
                      const photoUrl = cmdR?.avatar
                        ?? `/avatars/${r.person.split(' ')[0].toLowerCase()}.png`
                      return (
                        <div className="h-7 w-7 rounded-lg overflow-hidden flex-shrink-0 border"
                          style={{ borderColor: r.color + '40' }}>
                          <img src={photoUrl} alt={r.person} className="w-full h-full object-cover" />
                        </div>
                      )
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white">{r.person}</div>
                      <div className="text-[10px] text-gray-600">{r.role_type}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {kpiStatus && (
                        <span className="h-1.5 w-1.5 rounded-full"
                          style={{ background: KPI_STATUS_COLOR[kpiStatus as 'red' | 'yellow' | 'green'] }} />
                      )}
                      {superior && (
                        <span className="text-[9px] text-gray-700 font-mono">↑ {superior.person}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </PanelSection>
        )}

        {/* 6. DEPENDENCIES */}
        {(outgoing.length > 0 || incoming.length > 0) && (
          <PanelSection label="Dependencies">
            <div className="space-y-1">
              {outgoing.map(r => {
                const s = REL_STYLE[r.type]
                const target = ENTITIES.find(e => e.id === r.to_entity_id)
                return (
                  <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.04]">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
                    <span className="text-[10px] text-gray-600 w-20 flex-shrink-0">{s.label}</span>
                    <span className="text-[10px] text-gray-600">→</span>
                    <span className="text-[11px] font-semibold flex-1" style={{ color: target?.color ?? '#fff' }}>
                      {target?.shortName}
                    </span>
                    <span className="text-[9px] text-gray-700 truncate max-w-[80px]">{r.label}</span>
                  </div>
                )
              })}
              {incoming.map(r => {
                const s = REL_STYLE[r.type]
                const source = ENTITIES.find(e => e.id === r.from_entity_id)
                return (
                  <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.005]">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
                    <span className="text-[11px] font-semibold" style={{ color: source?.color ?? '#fff' }}>
                      {source?.shortName}
                    </span>
                    <span className="text-[10px] text-gray-600">→</span>
                    <span className="text-[10px] text-gray-600 flex-1">{s.label}</span>
                  </div>
                )
              })}
            </div>
          </PanelSection>
        )}

        {/* 7. HISTORY — formation timeline */}
        <PanelSection label="History">
          <div className="space-y-1">
            {[
              { date: entity.metadata['incorporated'] ?? '—', label: 'Incorporated', done: entity.active_status !== 'planned' },
              { date: entity.metadata['first_revenue'] ?? '—', label: 'First revenue', done: false },
              { date: entity.metadata['operational_since'] ?? '—', label: 'Operational', done: entity.active_status === 'live' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: item.done ? '#10B981' : '#374151' }} />
                <span className="text-[10px] text-gray-600 w-28 flex-shrink-0">{item.label}</span>
                <span className="text-[10px] font-mono text-gray-500">{item.date}</span>
              </div>
            ))}
          </div>
        </PanelSection>

        {/* 8. TARGET STATE */}
        <PanelSection label="Target state">
          <div className="rounded-xl border border-white/[0.06] px-3 py-3">
            <div className="space-y-2">
              {[
                entity.active_status === 'planned'  && { label: 'Incorporated', status: 'pending' },
                entity.active_status !== 'live'     && { label: 'Operational', status: 'pending' },
                                                       { label: 'Revenue generating', status: 'target' },
                                                       { label: 'Intercompany agreements signed', status: 'target' },
              ].filter(Boolean).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: item.status === 'pending' ? '#F59E0B15' : '#8B5CF615',
                      color: item.status === 'pending' ? '#F59E0B' : '#8B5CF6',
                    }}>
                    {item.status === 'pending' ? 'PENDING' : 'TARGET'}
                  </span>
                  <span className="text-[11px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </PanelSection>

        {/* Subsidiary list if any */}
        {children.length > 0 && (
          <PanelSection label={`Subsidiaries (${children.length})`}>
            <div className="space-y-1">
              {children.map(c => {
                const cs = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[c.active_status]
                return (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.04]">
                    <span className="text-sm">{c.flag}</span>
                    <span className="text-[11px] font-semibold flex-1" style={{ color: c.color }}>{c.shortName}</span>
                    <span className="text-[9px] font-mono text-gray-600">{c.jurisdiction}</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs }} />
                  </div>
                )
              })}
            </div>
          </PanelSection>
        )}

        {/* Markets linked to this entity */}
        {(() => {
          const linkedSites = MARKET_SITES.filter(s => s.entity_id === entity.id)
          if (linkedSites.length === 0) return null
          return (
            <PanelSection label={`Markets (${linkedSites.length})`}>
              <div className="space-y-1">
                {linkedSites.map(site => {
                  const sc = SITE_STATUS_COLOR[site.status]
                  return (
                    <div key={site.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.04] cursor-pointer hover:border-white/[0.1] transition-colors"
                      onClick={() => navigate('/markets')}
                    >
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: sc }} />
                      <span className="text-[11px] font-semibold text-white flex-1">{site.name}</span>
                      <span className="text-[9px] font-mono" style={{ color: sc }}>{site.status}</span>
                    </div>
                  )
                })}
              </div>
            </PanelSection>
          )
        })()}
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

      {/* Card bg — clean dark background, neutral border */}
      <rect width={CMD_NODE_W} height={CMD_NODE_H} rx={9}
        fill="#0D0F1A"
        stroke="#ffffff0f"
        strokeWidth={1}
      />

      {/* Left status border — 3px colored bar on the left edge */}
      <rect x={0} y={0} width={3} height={CMD_NODE_H} rx={1.5} fill={incidentColor} opacity={0.9} />

      {/* Incident indicator */}
      {isPrimary && (
        <text x={CMD_NODE_W - 8} y={14} textAnchor="end" fontSize={10}>🔴</text>
      )}
      {!isPrimary && isCascade && (
        <text x={CMD_NODE_W - 8} y={14} textAnchor="end" fontSize={10}>⚠️</text>
      )}

      {/* Avatar — square photo */}
      <rect x={10} y={12} width={38} height={38} rx={5} fill={role.color} fillOpacity={0.15} stroke={role.color} strokeOpacity={0.3} strokeWidth={1} />
      <clipPath id={`clip-cmd-${role.id}`}>
        <rect x={10} y={12} width={38} height={38} rx={5} />
      </clipPath>
      <image
        href={role.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(role.person)}&backgroundColor=transparent`}
        x={10} y={12} width={38} height={38}
        clipPath={`url(#clip-cmd-${role.id})`}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* Name + title */}
      <text x={56} y={28} fontSize={13} fontWeight="700" fill="#FFFFFF">{role.person}</text>
      <text x={56} y={42} fontSize={11} fill={isPrimary ? '#FCA5A5' : '#D1D5DB'} fontWeight="500">{role.title}</text>

      {/* reports_to */}
      {reports && (
        <text x={56} y={55} fontSize={10} fill="#6B7280">
          {'↑ '}{reports.person}
        </text>
      )}
      {!reports && (
        <text x={56} y={55} fontSize={10} fill="#6B7280">◆ Apex</text>
      )}

      {/* KPI status bar — live from incidentEngine */}
      {kpis.slice(0, 2).map((kpi, i) => {
        const kStatus = getKPIStatus(kpi)
        const kColor  = KPI_STATUS_COLOR[kStatus]
        const barW    = (kpi.current_value / kpi.target_value) * (CMD_NODE_W - 22)
        const y_pos   = 70 + i * 16
        return (
          <g key={kpi.id}>
            <text x={10} y={y_pos} fontSize={9} fill="#9CA3AF">{kpi.name}</text>
            <rect x={10} y={y_pos + 3} width={CMD_NODE_W - 22} height={4} rx={2} fill="#ffffff08" />
            <rect x={10} y={y_pos + 3} width={Math.min(barW, CMD_NODE_W - 22)} height={4} rx={2} fill={kColor} />
            <text x={CMD_NODE_W - 10} y={y_pos} textAnchor="end" fontSize={9} fontWeight="700" fill={kColor}>
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
  const { scopedEntities, activeEntity: scopeEntity } = useEntityScope()

  // Resolve permissions from current role
  const perms: GraphPermissions = useMemo(() => {
    const roleId = effectiveRole?.id ?? 'group-ceo'
    return ROLE_PERMISSIONS[roleId] ?? ROLE_PERMISSIONS['group-ceo']
  }, [effectiveRole])

  const positions = useMemo(() => layoutNodes(perms.visibleLayers), [perms.visibleLayers])
  const visibleEntities = useMemo(() => {
    // Always show ALL entities in visible layers — scope dims rather than hides
    return ENTITIES.filter(e => perms.visibleLayers.includes(e.layer))
  }, [perms.visibleLayers])

  // Entities outside current scope get dimmed (not hidden)
  const scopedIds = useMemo(() => new Set(scopedEntities.map(e => e.id)), [scopedEntities])
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
  const showFlow = true // always on
  const showStress = true // always on — stress propagation visible via incident data
  const [selectedCmdId, setSelectedCmdId]     = useState<string | null>(null)
  const [showAllEdges, setShowAllEdges]       = useState(false)

  // Live incident propagation — drives visual "bleeding" in the graph
  const incidents = useMemo(() => generateIncidents(), [])
  const propagation = useMemo(() => computePropagation(incidents), [incidents])

  // Sync entity-switcher (sidebar) → graph selection
  useEffect(() => {
    if (scopeEntity && scopeEntity.id !== 'wavult-group') {
      setSelectedEntity(scopeEntity)
    } else {
      setSelectedEntity(null)
    }
  }, [scopeEntity])

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
    const outOfScope = new Set(visibleEntities.filter(e => !scopedIds.has(e.id)).map(e => e.id))

    if (!perms.dimmedByDefault && !selectedEntity) return outOfScope

    if (selectedEntity) {
      const connectedRels = getRelationships(selectedEntity.id).filter(r => perms.visibleRelTypes.includes(r.type))
      const connectedIds = new Set<string>([selectedEntity.id])
      connectedRels.forEach(r => { connectedIds.add(r.from_entity_id); connectedIds.add(r.to_entity_id) })
      const selectionDimmed = new Set(visibleEntities.filter(e => !connectedIds.has(e.id)).map(e => e.id))
      // Merge: dim if out-of-scope OR not connected to selection
      outOfScope.forEach(id => selectionDimmed.add(id))
      return selectionDimmed
    }
    // dimmedByDefault with no selection: dim non-highlighted rel entities
    if (perms.dimmedByDefault && perms.highlightRelTypes.length > 0) {
      const highlightedEntityIds = new Set<string>()
      visibleRels.filter(r => perms.highlightRelTypes.includes(r.type)).forEach(r => {
        highlightedEntityIds.add(r.from_entity_id)
        highlightedEntityIds.add(r.to_entity_id)
      })
      const roleDimmed = new Set(visibleEntities.filter(e => !highlightedEntityIds.has(e.id)).map(e => e.id))
      outOfScope.forEach(id => roleDimmed.add(id))
      return roleDimmed
    }
    return outOfScope
  }, [selectedEntity, perms, visibleEntities, visibleRels, scopedIds])

  // Compute edge opacity
  // Non-ownership edges get very low opacity unless highlighted or showAllEdges mode
  const edgeOpacity = useCallback((rel: EntityRelationship) => {
    const isOwnership = rel.type === 'ownership'
    const isHighlightType = perms.highlightRelTypes.includes(rel.type)
    if (selectedEntity) {
      const rels = getRelationships(selectedEntity.id)
      const isConnected = rels.some(r => r.id === rel.id)
      if (!isConnected) return 0.08
      return isOwnership ? 0.9 : showAllEdges ? 0.6 : 0.5
    }
    if (perms.dimmedByDefault) return isHighlightType ? (isOwnership ? 0.9 : showAllEdges ? 0.6 : 0.08) : 0.08
    return isOwnership ? 0.9 : (showAllEdges ? 0.6 : 0.08)
  }, [selectedEntity, perms, showAllEdges])

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
        {/* ── Toolbar — precision control bar ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 py-2.5 border-b border-white/[0.06] bg-[#07080F]">
          {/* Left: title + count */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight">Corporate Graph</h1>
            <span className="text-[10px] text-gray-700 font-mono">
              {visibleEntities.length}e · {visibleRels.length}r
            </span>
            {scopeEntity.id !== 'wavult-group' && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: scopeEntity.color + '15', color: scopeEntity.color }}
              >
                scope: {scopeEntity.shortName}
              </span>
            )}
          </div>

          {/* Right: Viewing Context + 3 overlays */}
          <div className="flex items-center gap-2">
            {/* 1. Viewing Context — single dropdown */}
            <select
              value={perms.overlayMode}
              disabled
              className="text-[10px] bg-[#0D0F1A] border border-white/[0.08] text-gray-400 rounded-lg px-2.5 py-1.5 font-mono cursor-default focus:outline-none appearance-none"
              title="Viewing context — determined by your role"
            >
              <option>👁 {perms.overlayMode === 'full' ? 'Full view' : perms.overlayMode === 'financial' ? 'Financial view' : perms.overlayMode === 'legal' ? 'Legal view' : 'Technical view'}</option>
            </select>

            {/* Divider */}
            <div className="w-px h-5 bg-white/[0.06]" />

            {/* 2. Overlay toggle: Command Chain */}
            <button
              onClick={() => setShowCommandChain(p => !p)}
              className="text-[10px] px-3 py-1.5 rounded-lg border font-medium transition-all"
              style={showCommandChain
                ? { background: '#8B5CF618', color: '#A78BFA', borderColor: '#8B5CF635' }
                : { background: 'transparent', color: '#4B5563', borderColor: '#ffffff0a' }
              }
            >
              Chain
            </button>

            {/* 5. Show all relationships toggle */}
            <button
              onClick={() => setShowAllEdges(s => !s)}
              className={`px-2 py-1 text-[10px] rounded font-mono border transition-colors ${showAllEdges ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-600 hover:text-gray-400'}`}
            >
              {showAllEdges ? '← Enkel vy' : '+ Visa alla relationer'}
            </button>

            {/* Clear — only when entity selected */}
            {selectedEntity && (
              <>
                <div className="w-px h-5 bg-white/[0.06]" />
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-[10px] text-gray-600 hover:text-gray-400 px-2 py-1.5 transition-colors font-mono"
                >
                  ✕ clear
                </button>
              </>
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
                <text x={14} y={LAYER_Y[ly] - 5} fontSize={11} fill="#9CA3AF" fontWeight="600" letterSpacing="1.9">
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
                stressed={showStress && (propagation.primary_failures.includes(rel.from_entity_id) || propagation.cascade_failures.includes(rel.from_entity_id))}
                muted={!showFlow}
                showAllEdges={showAllEdges}
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
                  stressed={showStress && propagation.primary_failures.includes(entity.id)}
                  cascadeStressed={showStress && propagation.cascade_failures.includes(entity.id)}
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
