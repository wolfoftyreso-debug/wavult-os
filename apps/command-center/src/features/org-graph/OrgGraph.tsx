import { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ViewLevel = 'dynasty' | 'entity' | 'individual'
type SelectedNode = { type: 'entity'; id: string } | { type: 'person'; id: string } | null
type KPIStatus = 'warning' | 'on_track' | 'active' | 'pending' | 'critical' | 'good'
type EntityStatus = 'live' | 'forming' | 'planned'

// ─── Corporate Hierarchy ───────────────────────────────────────────────────────

interface CorpEntity {
  id: string
  shortName: string
  name: string
  jurisdiction: string
  flag: string
  layer: number
  color: string
  type: string
  children: string[]
  parent: string | null
  status: EntityStatus
  description: string
}

const CORP_HIERARCHY: CorpEntity[] = [
  {
    id: '1', shortName: 'WGH', name: 'Wavult Group Holding DMCC',
    jurisdiction: 'UAE (DIFC)', flag: '🇦🇪', layer: 0,
    color: '#E8B84B', type: 'HOLDING',
    children: ['2', '5', '6'], parent: null, status: 'forming',
    description: 'Dubai Free Zone IP Holding. Äger ALL grupp-IP, varumärken och patent. Licensierar till dotterbolag via royalty 5–15%.',
  },
  {
    id: '2', shortName: 'WOH', name: 'Wavult Operations Holding AB',
    jurisdiction: 'Sverige', flag: '🇸🇪', layer: 1,
    color: '#0A3D62', type: 'OPERATIONS',
    children: ['3', '4'], parent: '1', status: 'planned',
    description: 'Operativt holdingbolag i Sverige. Koordinerar EU-verksamhet och teamet.',
  },
  {
    id: '3', shortName: 'OZ-LT', name: 'Optical Zoom UAB',
    jurisdiction: 'Litauen', flag: '🇱🇹', layer: 2,
    color: '#2D7A4F', type: 'PRODUCT',
    children: [], parent: '2', status: 'planned',
    description: 'EU-entitet för Optical Zoom. GDPR-kompatibel, täcker alla EU-marknader från Sverige.',
  },
  {
    id: '4', shortName: 'OZ-US', name: 'Optical Zoom Inc',
    jurisdiction: 'Delaware, USA', flag: '🇺🇸', layer: 2,
    color: '#2C6EA6', type: 'PRODUCT',
    children: [], parent: '2', status: 'planned',
    description: 'US-entitet för Optical Zoom. Delaware C-Corp optimerad för US-investeringar och kapitalresning.',
  },
  {
    id: '5', shortName: 'LVX-AE', name: 'LandveX AC',
    jurisdiction: 'UAE (DIFC)', flag: '🇦🇪', layer: 1,
    color: '#C9A84C', type: 'PRODUCT',
    children: [], parent: '1', status: 'forming',
    description: 'LandveX UAE-entitet. DIFC Free Zone för MENA-marknad. AI-analys av infrastrukturdata.',
  },
  {
    id: '6', shortName: 'LVX-US', name: 'LandveX Inc',
    jurisdiction: 'Texas, USA', flag: '🇺🇸', layer: 1,
    color: '#4A7A5B', type: 'PRODUCT',
    children: [], parent: '1', status: 'forming',
    description: 'LandveX US-entitet. Texas LLC för US municipal och federal infrastruktur. Hamnar, flygplatser, kommuner.',
  },
]

// ─── Team Command Chain ────────────────────────────────────────────────────────

interface TeamKPI {
  label: string
  value: string
  status: KPIStatus
}

interface TeamMember {
  id: string
  name: string
  role: string
  reportsTo: string | null
  entity: string
  avatar: string
  kpis: TeamKPI[]
  owns: string[]
}

const TEAM_COMMAND_CHAIN: TeamMember[] = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    role: 'Chairman & Group CEO',
    reportsTo: null,
    entity: 'WGH',
    avatar: '/avatars/erik.png',
    owns: ['Group strategy', 'Capital allocation', 'IP & brand', 'System architecture', 'Vision'],
    kpis: [
      { label: 'Entiteter etablerade', value: '4/6', status: 'warning' },
      { label: 'Sverige go-live', value: 'Juni 2026', status: 'on_track' },
    ]
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cerame',
    role: 'CEO — Operations',
    reportsTo: 'erik',
    entity: 'WOH',
    avatar: '/avatars/leon.png',
    owns: ['Daglig exekvering', 'Resurshantering', 'Sales & revenue', 'Team-koordinering'],
    kpis: [
      { label: 'Aktiva projekt', value: '4', status: 'active' },
      { label: 'First MRR', value: 'Pre-revenue', status: 'pending' },
    ]
  },
  {
    id: 'winston',
    name: 'Winston Bjarnemark',
    role: 'CFO',
    reportsTo: 'erik',
    entity: 'WOH',
    avatar: '/avatars/winston.png',
    owns: ['Finansiella flöden', 'Intercompany billing', 'Budget & forecast', 'Banking'],
    kpis: [
      { label: 'Bankkonton öppnade', value: '0', status: 'critical' },
      { label: 'Intercompany avtal', value: '0 signerade', status: 'critical' },
    ]
  },
  {
    id: 'johan',
    name: 'Johan Berglund',
    role: 'Group CTO',
    reportsTo: 'erik',
    entity: 'WOH',
    avatar: '/avatars/johan.png',
    owns: ['Systemarkitektur', 'Infrastruktur', 'CI/CD & DevOps', 'Säkerhet'],
    kpis: [
      { label: 'ECS-tjänster live', value: '11/13', status: 'on_track' },
      { label: 'System uptime', value: '99%', status: 'good' },
    ]
  },
  {
    id: 'dennis',
    name: 'Dennis Bjarnemark',
    role: 'Board / Chief Legal',
    reportsTo: 'erik',
    entity: 'WGH',
    avatar: '/avatars/dennis.png',
    owns: ['Bolagsstruktur', 'Avtal & juridik', 'IP-skydd', 'Compliance'],
    kpis: [
      { label: 'Entiteter inkorporerade', value: '4/6', status: 'warning' },
      { label: 'Nyckelavtal signerade', value: '0', status: 'critical' },
    ]
  },
]

// ─── Entity detail data ────────────────────────────────────────────────────────

interface EntityKPI {
  label: string
  value: string
  status: KPIStatus
}

interface TimelineItem {
  date: string
  event: string
  done: boolean
}

interface EntityDetail {
  incorporation: string
  bankStatus: string
  complianceStatus: string
  kpis: EntityKPI[]
  timeline: TimelineItem[]
  teamIds: string[]
}

const ENTITY_DETAILS: Record<string, EntityDetail> = {
  '1': {
    incorporation: 'DMCC Free Zone LLC',
    bankStatus: 'Emirates NBD — pending',
    complianceStatus: 'Forming',
    teamIds: ['erik', 'dennis'],
    kpis: [
      { label: 'Entiteter etablerade', value: '4/6', status: 'warning' },
      { label: 'IP-avtal signerade', value: '0', status: 'critical' },
      { label: 'Bankkonto öppnat', value: 'Nej', status: 'critical' },
      { label: 'Royalty-avtal', value: '0 aktiva', status: 'pending' },
    ],
    timeline: [
      { date: '2025 Q4', event: 'Bolagsstruktur beslutad', done: true },
      { date: 'Q1 2026', event: 'DMCC-ansökan inlämnad', done: false },
      { date: 'Q2 2026', event: 'Bankkonto öppnat (ENBD)', done: false },
      { date: 'Q3 2026', event: 'IP-avtal med dotterbolag signerade', done: false },
    ],
  },
  '2': {
    incorporation: 'AB (Aktiebolag)',
    bankStatus: 'Inte öppnat',
    complianceStatus: 'Planerat',
    teamIds: ['leon', 'winston', 'johan'],
    kpis: [
      { label: 'Inkorporering', value: 'Ej påbörjad', status: 'critical' },
      { label: 'Aktiva projekt', value: '4', status: 'active' },
      { label: 'Bankkonto', value: 'Saknas', status: 'critical' },
      { label: 'Intercompany-avtal', value: '0', status: 'critical' },
    ],
    timeline: [
      { date: 'Q2 2026', event: 'AB registreras hos Bolagsverket', done: false },
      { date: 'Q2 2026', event: 'Bankkonto öppnat (Revolut/Handelsbanken)', done: false },
      { date: 'Q3 2026', event: 'Intercompany-avtal med WGH signerade', done: false },
      { date: 'Q4 2026', event: 'Dotterbolag aktivt i prodution', done: false },
    ],
  },
  '3': {
    incorporation: 'UAB (Litauisk LLC)',
    bankStatus: 'Inte öppnat',
    complianceStatus: 'Planerat',
    teamIds: ['leon', 'johan'],
    kpis: [
      { label: 'Formation', value: 'Ej startad', status: 'pending' },
      { label: 'MRR', value: 'Pre-revenue', status: 'pending' },
      { label: 'Lanseringsmarknad', value: 'Sverige jun 2026', status: 'on_track' },
      { label: 'EU-compliance', value: 'GDPR redo', status: 'on_track' },
    ],
    timeline: [
      { date: 'Q2 2026', event: 'UAB registrering i Vilnius', done: false },
      { date: 'Q3 2026', event: 'Bankkonto öppnat', done: false },
      { date: 'Q4 2026', event: 'Första kundfaktura (EU)', done: false },
    ],
  },
  '4': {
    incorporation: 'Delaware C-Corp',
    bankStatus: 'Inte öppnat',
    complianceStatus: 'Planerat',
    teamIds: ['leon', 'johan'],
    kpis: [
      { label: 'Formation', value: 'Ej startad', status: 'pending' },
      { label: 'US expansion', value: 'Fas 2', status: 'pending' },
      { label: 'Investeringsförberedelse', value: 'Ej startad', status: 'pending' },
      { label: 'US marknadsintro', value: 'H2 2026', status: 'on_track' },
    ],
    timeline: [
      { date: 'Q3 2026', event: 'Delaware C-Corp formation', done: false },
      { date: 'Q3 2026', event: 'US bankkonto (Silicon Valley Bank/Chase)', done: false },
      { date: 'Q4 2026', event: 'US marknadsintroduktion', done: false },
    ],
  },
  '5': {
    incorporation: 'DIFC FZCO',
    bankStatus: 'Emirates NBD — pågår',
    complianceStatus: 'Forming',
    teamIds: ['erik', 'dennis'],
    kpis: [
      { label: 'Formation', value: 'Pågår', status: 'warning' },
      { label: 'MENA Pipeline', value: '2 leads', status: 'on_track' },
      { label: 'Bankkonto', value: 'Ej öppnat', status: 'critical' },
      { label: 'Produktlansering', value: 'Q3 2026', status: 'on_track' },
    ],
    timeline: [
      { date: 'Q1 2026', event: 'DIFC-ansökan inlämnad', done: false },
      { date: 'Q2 2026', event: 'Bankkonto (Emirates NBD)', done: false },
      { date: 'Q3 2026', event: 'Första MENA-kund', done: false },
    ],
  },
  '6': {
    incorporation: 'Texas LLC',
    bankStatus: 'JPMorgan Chase — pending',
    complianceStatus: 'Forming',
    teamIds: ['erik', 'dennis'],
    kpis: [
      { label: 'Formation', value: 'Pågår', status: 'warning' },
      { label: 'US Pipeline', value: '3 leads', status: 'on_track' },
      { label: 'Bankkonto', value: 'JPMorgan — pågår', status: 'warning' },
      { label: 'Kommunal-pipeline', value: 'Q3 2026', status: 'on_track' },
    ],
    timeline: [
      { date: 'Q1 2026', event: 'Texas LLC formation (Houston)', done: true },
      { date: 'Q2 2026', event: 'Bankkonto öppnat', done: false },
      { date: 'Q3 2026', event: 'Första municipal-kontrakt', done: false },
    ],
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getKPIColor(status: KPIStatus): string {
  const map: Record<KPIStatus, string> = {
    critical: '#EF4444',
    warning: '#F59E0B',
    pending: '#9CA3AF',
    on_track: '#10B981',
    active: '#10B981',
    good: '#10B981',
  }
  return map[status] ?? '#9CA3AF'
}

function getKPILabel(status: KPIStatus): string {
  const map: Record<KPIStatus, string> = {
    critical: 'KRITISKT',
    warning: 'VARNING',
    pending: 'VÄNTAR',
    on_track: 'OK',
    active: 'AKTIVT',
    good: 'BRA',
  }
  return map[status] ?? status.toUpperCase()
}

function getStatusColor(status: EntityStatus): string {
  return { live: '#10B981', forming: '#F59E0B', planned: '#9CA3AF' }[status] ?? '#9CA3AF'
}

function getStatusLabel(status: EntityStatus): string {
  return { live: 'LIVE', forming: 'FORMING', planned: 'PLANERAT' }[status] ?? status.toUpperCase()
}

function getEntity(id: string): CorpEntity | undefined {
  return CORP_HIERARCHY.find(e => e.id === id)
}

function getPerson(id: string): TeamMember | undefined {
  return TEAM_COMMAND_CHAIN.find(p => p.id === id)
}

function getInitial(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Dynasty SVG Layout ────────────────────────────────────────────────────────

const CARD_W = 200
const CARD_H = 110
const SVG_MAIN_W = 880

// Hardcoded positions for clarity
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  '1': { x: 340, y: 70 },   // WGH — centered
  '2': { x: 60,  y: 260 },  // WOH
  '5': { x: 330, y: 260 },  // LVX-AE
  '6': { x: 620, y: 260 },  // LVX-US
  '3': { x: 20,  y: 450 },  // OZ-LT (under WOH)
  '4': { x: 240, y: 450 },  // OZ-US (under WOH)
}

// Derived ownership edges from CORP_HIERARCHY
const OWNERSHIP_EDGES = CORP_HIERARCHY.flatMap(e =>
  e.children.map(childId => ({ from: e.id, to: childId }))
)

// ─── SVG Components ────────────────────────────────────────────────────────────

function OwnershipEdge({ from, to, dimmed }: { from: string; to: string; dimmed: boolean }) {
  const fp = NODE_POSITIONS[from]
  const tp = NODE_POSITIONS[to]
  if (!fp || !tp) return null

  const fx = fp.x + CARD_W / 2
  const fy = fp.y + CARD_H
  const tx = tp.x + CARD_W / 2
  const ty = tp.y
  const midY = (fy + ty) / 2
  const d = `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`

  return (
    <g style={{ opacity: dimmed ? 0.2 : 0.9, transition: 'opacity 0.3s' }}>
      <defs>
        <marker id={`arr-${from}-${to}`} markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L8,3.5 z" fill="#C4B9A4" opacity={0.8} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="#C4B9A4"
        strokeWidth={1.8}
        markerEnd={`url(#arr-${from}-${to})`}
      />
      {/* Flowing particle */}
      <circle r={3} fill="#DDD5C5" opacity={0.8}>
        <animateMotion dur="2.5s" repeatCount="indefinite" path={d} />
      </circle>
    </g>
  )
}

function EntityNodeSVG({
  entity,
  isSelected,
  isDimmed,
  onClick,
}: {
  entity: CorpEntity
  isSelected: boolean
  isDimmed: boolean
  onClick: () => void
}) {
  const pos = NODE_POSITIONS[entity.id]
  if (!pos) return null
  const statusColor = getStatusColor(entity.status)

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={onClick}
      className="cursor-pointer"
      style={{
        opacity: isDimmed ? 0.25 : 1,
        filter: isSelected ? `drop-shadow(0 0 12px ${entity.color}88)` : 'none',
        transition: 'all 0.25s',
      }}
    >
      {/* Selected glow ring */}
      {isSelected && (
        <rect
          x={-3} y={-3}
          width={CARD_W + 6} height={CARD_H + 6}
          rx={13}
          fill="none"
          stroke="#E8B84B"
          strokeWidth={2}
          opacity={0.9}
        />
      )}

      {/* Card shadow */}
      <rect width={CARD_W} height={CARD_H} rx={10} fill="#0A3D62" opacity={0.05} y={2} x={1} />

      {/* Card body */}
      <rect
        width={CARD_W}
        height={CARD_H}
        rx={10}
        fill="#FFFFFF"
        stroke={isSelected ? '#E8B84B' : '#DDD5C5'}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Top accent bar */}
      <rect width={CARD_W} height={4} rx={2} fill={entity.color} />

      {/* Flag + shortName */}
      <text x={14} y={30} fontSize={13} fill={entity.color} fontWeight="700" fontFamily="monospace">
        {entity.flag} {entity.shortName}
      </text>

      {/* Full name */}
      <text x={14} y={48} fontSize={11} fill="#1C1C1E" fontFamily="sans-serif" fontWeight="500">
        {entity.name.length > 25 ? entity.name.slice(0, 24) + '…' : entity.name}
      </text>

      {/* Jurisdiction */}
      <text x={14} y={64} fontSize={10} fill="#9CA3AF">
        {entity.jurisdiction} · {entity.type}
      </text>

      {/* Status dot */}
      <circle cx={CARD_W - 14} cy={16} r={4} fill={statusColor} />
      {entity.status === 'live' && (
        <circle cx={CARD_W - 14} cy={16} r={4} fill="none" stroke={statusColor} strokeWidth={1.5}>
          <animate attributeName="r" values="4;8;4" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Status label */}
      <text x={CARD_W - 14} y={30} textAnchor="end" fontSize={8} fill={statusColor} fontWeight="600" fontFamily="monospace">
        {getStatusLabel(entity.status)}
      </text>

      {/* Click hint */}
      <text x={CARD_W / 2} y={CARD_H - 10} textAnchor="middle" fontSize={8} fill="#C4B9A4">
        Klicka för detaljer →
      </text>
    </g>
  )
}

// ─── Command Chain SVG column ──────────────────────────────────────────────────

const CMD_X_START = SVG_MAIN_W + 32
const CMD_NODE_W = 230
const CMD_NODE_H = 115
const CMD_GAP = 22
const CMD_APEX_Y = 70
const TOTAL_SVG_W = CMD_X_START + CMD_NODE_W + 28

function CommandChainNodeSVG({
  person,
  x,
  y,
  isSelected,
  onClick,
}: {
  person: TeamMember
  x: number
  y: number
  isSelected: boolean
  onClick: () => void
}) {
  const superior = person.reportsTo ? getPerson(person.reportsTo) : null

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer"
      style={{
        filter: isSelected ? 'drop-shadow(0 0 10px #E8B84B88)' : 'none',
        transition: 'all 0.25s',
      }}>
      {/* Selected glow */}
      {isSelected && (
        <rect x={-2} y={-2} width={CMD_NODE_W + 4} height={CMD_NODE_H + 4} rx={11}
          fill="none" stroke="#E8B84B" strokeWidth={2} opacity={0.9} />
      )}

      {/* Card */}
      <rect width={CMD_NODE_W} height={CMD_NODE_H} rx={9}
        fill="#FFFFFF"
        stroke={isSelected ? '#E8B84B' : '#DDD5C5'}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Left color bar */}
      <rect x={0} y={0} width={4} height={CMD_NODE_H} rx={2} fill="#DDD5C5" />

      {/* Avatar circle */}
      <circle cx={26} cy={38} r={20} fill="#F5F0E8" stroke="#DDD5C5" strokeWidth={1} />
      <text x={26} y={43} textAnchor="middle" fontSize={12} fontWeight="700" fill="#0A3D62" fontFamily="sans-serif">
        {getInitial(person.name)}
      </text>

      {/* Name */}
      <text x={54} y={28} fontSize={12} fontWeight="700" fill="#1C1C1E" fontFamily="sans-serif">
        {person.name.split(' ')[0]} {person.name.split(' ').slice(1).join(' ').slice(0, 12)}
      </text>

      {/* Role */}
      <text x={54} y={42} fontSize={10} fill="#E8B84B" fontWeight="600">
        {person.role.length > 22 ? person.role.slice(0, 21) + '…' : person.role}
      </text>

      {/* Reports to */}
      <text x={54} y={56} fontSize={9} fill="#9CA3AF">
        {superior ? `↑ ${superior.name.split(' ')[0]}` : '◆ Apex'}
      </text>

      {/* KPIs — two mini bars */}
      {person.kpis.slice(0, 2).map((kpi, i) => {
        const kColor = getKPIColor(kpi.status)
        const y0 = 68 + i * 20
        return (
          <g key={kpi.label}>
            <text x={10} y={y0 + 8} fontSize={8} fill="#9CA3AF">{kpi.label}</text>
            <text x={CMD_NODE_W - 8} y={y0 + 8} textAnchor="end" fontSize={8} fontWeight="700" fill={kColor}>
              {kpi.value}
            </text>
            <rect x={10} y={y0 + 11} width={CMD_NODE_W - 20} height={3} rx={1.5} fill="#EDE8DC" />
          </g>
        )
      })}

      {/* Click hint */}
      <text x={CMD_NODE_W - 8} y={CMD_NODE_H - 5} textAnchor="end" fontSize={7} fill="#C4B9A4">
        →
      </text>
    </g>
  )
}

function CommandChainSVG({
  selectedPersonId,
  onSelectPerson,
}: {
  selectedPersonId: string | null
  onSelectPerson: (id: string) => void
}) {
  const apex = TEAM_COMMAND_CHAIN.find(p => p.reportsTo === null)!
  const reports = TEAM_COMMAND_CHAIN.filter(p => p.reportsTo === apex.id)
  const totalHeight = CMD_APEX_Y + CMD_NODE_H + CMD_GAP + reports.length * (CMD_NODE_H + 14) + 40

  return (
    <g>
      {/* Column background */}
      <rect
        x={CMD_X_START - 16}
        y={CMD_APEX_Y - 22}
        width={CMD_NODE_W + 32}
        height={totalHeight}
        rx={14}
        fill="#F5F0E8"
        stroke="#DDD5C5"
        strokeWidth={1}
      />
      <text x={CMD_X_START + CMD_NODE_W / 2} y={CMD_APEX_Y - 8}
        textAnchor="middle" fontSize={8} fill="#0A3D62" fontWeight="700" letterSpacing="2">
        COMMAND CHAIN
      </text>

      {/* Apex node */}
      <CommandChainNodeSVG
        person={apex}
        x={CMD_X_START}
        y={CMD_APEX_Y}
        isSelected={selectedPersonId === apex.id}
        onClick={() => onSelectPerson(apex.id)}
      />

      {/* Trunk line */}
      {(() => {
        const apexCx = CMD_X_START + CMD_NODE_W / 2
        const apexBot = CMD_APEX_Y + CMD_NODE_H
        const busY = apexBot + CMD_GAP / 2
        const firstRepY = CMD_APEX_Y + CMD_NODE_H + CMD_GAP
        const lastRepMid = firstRepY + (reports.length - 1) * (CMD_NODE_H + 14) + CMD_NODE_H / 2
        return (
          <g>
            <line x1={apexCx} y1={apexBot} x2={apexCx} y2={busY} stroke="#DDD5C5" strokeWidth={2} />
            <line x1={apexCx} y1={busY} x2={apexCx} y2={lastRepMid} stroke="#DDD5C5" strokeWidth={1.5} />
          </g>
        )
      })()}

      {/* Direct reports */}
      {reports.map((person, i) => {
        const ry = CMD_APEX_Y + CMD_NODE_H + CMD_GAP + i * (CMD_NODE_H + 14)
        const cx = CMD_X_START + CMD_NODE_W / 2
        return (
          <g key={person.id}>
            <line
              x1={cx} y1={ry + CMD_NODE_H / 2}
              x2={CMD_X_START} y2={ry + CMD_NODE_H / 2}
              stroke="#DDD5C5" strokeWidth={1} strokeDasharray="4 3"
            />
            <CommandChainNodeSVG
              person={person}
              x={CMD_X_START}
              y={ry}
              isSelected={selectedPersonId === person.id}
              onClick={() => onSelectPerson(person.id)}
            />
          </g>
        )
      })}
    </g>
  )
}

// ─── Dynasty View ──────────────────────────────────────────────────────────────

function DynastyView({
  selectedEntityId,
  selectedPersonId,
  onSelectEntity,
  onSelectPerson,
}: {
  selectedEntityId: string | null
  selectedPersonId: string | null
  onSelectEntity: (id: string) => void
  onSelectPerson: (id: string) => void
}) {
  const apex = TEAM_COMMAND_CHAIN.find(p => p.reportsTo === null)!
  const reports = TEAM_COMMAND_CHAIN.filter(p => p.reportsTo === apex.id)
  const svgHeight = Math.max(
    450 + CARD_H + 60,
    CMD_APEX_Y + CMD_NODE_H + CMD_GAP + reports.length * (CMD_NODE_H + 14) + 80
  )

  const layerLabels: Record<number, string> = {
    0: 'LAYER 0 — HOLDING / IP',
    1: 'LAYER 1 — OPERATIONS',
    2: 'LAYER 2 — PRODUCT ENTITIES',
  }
  const layerY: Record<number, number> = { 0: 70, 1: 260, 2: 450 }
  const layerH = CARD_H + 40

  return (
    <div className="flex-1 overflow-auto bg-[#F5F0E8]">
      <svg
        viewBox={`0 0 ${TOTAL_SVG_W} ${svgHeight}`}
        style={{ minWidth: TOTAL_SVG_W, width: '100%', minHeight: svgHeight }}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid-og" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="18" cy="18" r="1" fill="#DDD5C5" opacity={0.6} />
          </pattern>
        </defs>
        <rect width={TOTAL_SVG_W} height={svgHeight} fill="url(#grid-og)" />

        {/* Layer bands */}
        {[0, 1, 2].map(ly => (
          <g key={ly}>
            <rect
              x={0} y={layerY[ly] - 20}
              width={SVG_MAIN_W} height={layerH}
              fill={ly % 2 === 0 ? '#F5F0E8' : '#EDE8DC'}
            />
            <text x={14} y={layerY[ly] - 5} fontSize={9} fill="#C4B9A4" fontWeight="700" letterSpacing="1.5">
              {layerLabels[ly]}
            </text>
          </g>
        ))}

        {/* Ownership edges */}
        {OWNERSHIP_EDGES.map(({ from, to }) => (
          <OwnershipEdge
            key={`${from}-${to}`}
            from={from}
            to={to}
            dimmed={selectedEntityId !== null && selectedEntityId !== from && selectedEntityId !== to}
          />
        ))}

        {/* Entity nodes */}
        {CORP_HIERARCHY.map(entity => (
          <EntityNodeSVG
            key={entity.id}
            entity={entity}
            isSelected={selectedEntityId === entity.id}
            isDimmed={selectedEntityId !== null && selectedEntityId !== entity.id
              && entity.parent !== selectedEntityId
              && !entity.children.includes(selectedEntityId)}
            onClick={() => onSelectEntity(entity.id)}
          />
        ))}

        {/* Separator */}
        <line
          x1={SVG_MAIN_W + 8} y1={20}
          x2={SVG_MAIN_W + 8} y2={svgHeight - 20}
          stroke="#DDD5C5" strokeWidth={1}
        />

        {/* Command Chain */}
        <CommandChainSVG
          selectedPersonId={selectedPersonId}
          onSelectPerson={onSelectPerson}
        />
      </svg>
    </div>
  )
}

// ─── KPI Card component ────────────────────────────────────────────────────────

function KPICard({ kpi }: { kpi: EntityKPI | TeamKPI }) {
  const color = getKPIColor(kpi.status)
  return (
    <div className="rounded-xl border border-[#DDD5C5] bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="text-xs text-gray-500">{kpi.label}</div>
      <div className="flex items-center justify-between">
        <span className="text-base font-bold" style={{ color }}>{kpi.value}</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: color + '18', color }}>
          {getKPILabel(kpi.status)}
        </span>
      </div>
    </div>
  )
}

// ─── Entity Detail View ────────────────────────────────────────────────────────

function EntityDetailView({
  entityId,
  onSelectPerson,
}: {
  entityId: string
  onSelectPerson: (id: string) => void
}) {
  const entity = getEntity(entityId)
  const details = ENTITY_DETAILS[entityId]
  if (!entity || !details) return null

  const teamMembers = details.teamIds.map(id => getPerson(id)).filter(Boolean) as TeamMember[]
  const statusColor = getStatusColor(entity.status)

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Entity header */}
        <div className="rounded-2xl border border-[#DDD5C5] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{entity.flag}</span>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#0A3D62]">{entity.name}</h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded font-semibold"
                    style={{ background: statusColor + '18', color: statusColor }}>
                    {getStatusLabel(entity.status)}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>{entity.jurisdiction}</span>
                  <span>·</span>
                  <span>{entity.type}</span>
                  <span>·</span>
                  <span className="font-mono">{entity.shortName}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-xl">{entity.description}</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div className="font-mono mb-1">{details.incorporation}</div>
              <div>Bank: {details.bankStatus}</div>
              <div>Compliance: <span style={{ color: statusColor }}>{details.complianceStatus}</span></div>
            </div>
          </div>
        </div>

        {/* 3 columns: Team / KPIs / Compliance */}
        <div className="grid grid-cols-3 gap-4">
          {/* Team */}
          <div className="rounded-2xl border border-[#DDD5C5] bg-white p-4 shadow-sm">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">Team</div>
            <div className="flex flex-col gap-2">
              {teamMembers.length === 0 && (
                <p className="text-xs text-gray-400 italic">Ingen team tilldelad ännu</p>
              )}
              {teamMembers.map(person => (
                <button
                  key={person.id}
                  onClick={() => onSelectPerson(person.id)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5F0E8] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F5F0E8] border border-[#DDD5C5] flex items-center justify-center text-sm font-bold text-[#0A3D62] flex-shrink-0">
                    {getInitial(person.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#0A3D62] truncate">{person.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{person.role}</div>
                  </div>
                  <span className="text-xs text-gray-300 ml-auto">›</span>
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="rounded-2xl border border-[#DDD5C5] bg-white p-4 shadow-sm">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">KPIs</div>
            <div className="flex flex-col gap-2">
              {details.kpis.map(kpi => {
                const color = getKPIColor(kpi.status)
                return (
                  <div key={kpi.label} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0">
                    <span className="text-xs text-gray-600">{kpi.label}</span>
                    <span className="text-xs font-bold font-mono" style={{ color }}>{kpi.value}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Compliance */}
          <div className="rounded-2xl border border-[#DDD5C5] bg-white p-4 shadow-sm">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">Compliance</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8]">
                <span className="text-xs text-gray-600">Legal form</span>
                <span className="text-xs font-mono text-[#0A3D62]">{details.incorporation}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8]">
                <span className="text-xs text-gray-600">Jurisdiktion</span>
                <span className="text-xs font-mono text-[#0A3D62]">{entity.jurisdiction}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8]">
                <span className="text-xs text-gray-600">Status</span>
                <span className="text-xs font-bold" style={{ color: getStatusColor(entity.status) }}>
                  {details.complianceStatus}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-600">Bank</span>
                <span className="text-xs text-gray-500">{details.bankStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-[#DDD5C5] bg-white p-5 shadow-sm">
          <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">Juridisk tidslinje</div>
          <div className="flex gap-0">
            {details.timeline.map((item, i) => (
              <div key={i} className="flex-1 relative">
                {/* Connector line */}
                {i < details.timeline.length - 1 && (
                  <div className="absolute top-[7px] left-1/2 w-full h-px"
                    style={{ background: item.done ? '#10B981' : '#DDD5C5' }} />
                )}
                <div className="flex flex-col items-center gap-2 text-center px-2">
                  <div className="relative z-10 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                    style={{
                      background: item.done ? '#10B981' : '#FFFFFF',
                      borderColor: item.done ? '#10B981' : '#DDD5C5',
                    }} />
                  <div className="text-[9px] font-mono text-gray-400">{item.date}</div>
                  <div className="text-[10px] text-gray-600 leading-snug">{item.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parent / children */}
        {(entity.parent || entity.children.length > 0) && (
          <div className="rounded-2xl border border-[#DDD5C5] bg-white p-5 shadow-sm">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">Struktur</div>
            <div className="flex flex-wrap gap-3">
              {entity.parent && (() => {
                const parent = getEntity(entity.parent)
                return parent ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Ägs av:</span>
                    <span className="font-bold" style={{ color: parent.color }}>{parent.flag} {parent.shortName}</span>
                  </div>
                ) : null
              })()}
              {entity.children.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span>Dotterbolag:</span>
                  {entity.children.map(cid => {
                    const child = getEntity(cid)
                    return child ? (
                      <span key={cid} className="font-bold" style={{ color: child.color }}>
                        {child.flag} {child.shortName}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Individual View ───────────────────────────────────────────────────────────

function ResponsibilitySection({ person }: { person: TeamMember }) {
  const entityIds = CORP_HIERARCHY
    .filter(e => e.shortName === person.entity || ENTITY_DETAILS[e.id]?.teamIds.includes(person.id))
    .map(e => e)

  return (
    <div className="rounded-2xl border border-[#DDD5C5] bg-white p-5 shadow-sm">
      <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">Ansvar & bolagskoppling</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0A3D62] mb-2">Ansvarsdomäner</div>
          <ul className="space-y-1">
            {person.owns.map(domain => (
              <li key={domain} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8B84B] flex-shrink-0" />
                {domain}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-[#0A3D62] mb-2">Bolagskopplingar</div>
          <div className="space-y-1.5">
            {entityIds.map(entity => (
              <div key={entity.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F0E8]">
                <span className="text-sm">{entity.flag}</span>
                <span className="text-xs font-semibold" style={{ color: entity.color }}>{entity.shortName}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{entity.type}</span>
              </div>
            ))}
            {entityIds.length === 0 && (
              <p className="text-xs text-gray-400 italic">Primärt: {person.entity}</p>
            )}
          </div>
        </div>
      </div>
      {person.reportsTo && (() => {
        const superior = getPerson(person.reportsTo)
        return superior ? (
          <div className="mt-4 pt-4 border-t border-[#F5F0E8] flex items-center gap-2 text-xs text-gray-500">
            <span>Rapporterar till:</span>
            <span className="font-bold text-[#0A3D62]">{superior.name}</span>
            <span className="text-gray-400">({superior.role})</span>
          </div>
        ) : null
      })()}
    </div>
  )
}

function IndividualView({ personId }: { personId: string }) {
  const person = getPerson(personId)
  if (!person) return null
  const subordinates = TEAM_COMMAND_CHAIN.filter(p => p.reportsTo === personId)

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Person header — gold border */}
        <div className="rounded-2xl border-2 border-[#E8B84B] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E8] border border-[#DDD5C5] flex items-center justify-center text-2xl font-bold text-[#0A3D62] flex-shrink-0">
              {getInitial(person.name)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#0A3D62]">{person.name}</h2>
              <p className="text-sm text-[#E8B84B] font-semibold mt-0.5">{person.role}</p>
              <p className="text-xs text-gray-500">{person.entity}</p>
            </div>
            {!person.reportsTo && (
              <div className="text-xs font-mono px-2 py-1 rounded-lg bg-[#E8B84B1A] text-[#E8B84B] font-semibold">
                ◆ APEX
              </div>
            )}
          </div>
        </div>

        {/* KPIs grid */}
        <div>
          <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">KPIs</div>
          <div className="grid grid-cols-2 gap-3">
            {person.kpis.map(kpi => (
              <KPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </div>

        {/* Responsibility section */}
        <ResponsibilitySection person={person} />

        {/* Subordinates if any */}
        {subordinates.length > 0 && (
          <div className="rounded-2xl border border-[#DDD5C5] bg-white p-5 shadow-sm">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">
              Direktrapporterar ({subordinates.length})
            </div>
            <div className="grid grid-cols-2 gap-3">
              {subordinates.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F0E8]">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#DDD5C5] flex items-center justify-center text-sm font-bold text-[#0A3D62]">
                    {getInitial(sub.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#0A3D62] truncate">{sub.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{sub.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({
  viewLevel,
  selected,
  onDynasty,
}: {
  viewLevel: ViewLevel
  selected: SelectedNode
  onDynasty: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <button
        onClick={onDynasty}
        className={`hover:text-[#0A3D62] transition-colors ${viewLevel === 'dynasty' ? 'text-[#0A3D62] font-bold' : ''}`}
      >
        Dynasty
      </button>
      {selected?.type === 'entity' && (() => {
        const entity = getEntity(selected.id)
        return entity ? (
          <>
            <span className="text-gray-300">›</span>
            <span className="text-[#0A3D62] font-bold">{entity.flag} {entity.shortName}</span>
          </>
        ) : null
      })()}
      {selected?.type === 'person' && (() => {
        const person = getPerson(selected.id)
        return person ? (
          <>
            <span className="text-gray-300">›</span>
            <span className="text-[#0A3D62] font-bold">{person.name}</span>
          </>
        ) : null
      })()}
    </div>
  )
}

// ─── Main OrgGraph component ───────────────────────────────────────────────────

export function OrgGraph() {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('dynasty')
  const [selected, setSelected] = useState<SelectedNode>(null)

  const handleEntityClick = (id: string) => {
    setSelected({ type: 'entity', id })
    setViewLevel('entity')
  }

  const handlePersonClick = (id: string) => {
    setSelected({ type: 'person', id })
    setViewLevel('individual')
  }

  const handleDynasty = () => {
    setViewLevel('dynasty')
    setSelected(null)
  }

  const viewButtons = [
    { id: 'dynasty' as ViewLevel, label: '🏛 Dynasty', desc: 'Hela koncernen' },
    { id: 'entity' as ViewLevel, label: '🏢 Bolag', desc: 'Valt bolag' },
    { id: 'individual' as ViewLevel, label: '👤 Person', desc: 'Vald person' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F5F0E8]">

      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 py-2.5 border-b border-[#DDD5C5] bg-[#F0EBE1]">
        {/* Left: breadcrumb */}
        <Breadcrumb viewLevel={viewLevel} selected={selected} onDynasty={handleDynasty} />

        {/* Right: view level buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mr-1">VY</span>
          {viewButtons.map(v => {
            const isDisabled = (v.id === 'entity' && selected?.type !== 'entity') ||
              (v.id === 'individual' && selected?.type !== 'person')
            return (
              <button
                key={v.id}
                disabled={isDisabled}
                onClick={() => !isDisabled && setViewLevel(v.id)}
                title={v.desc}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewLevel === v.id
                    ? 'bg-[#0A3D62] text-white'
                    : isDisabled
                      ? 'bg-white border border-[#DDD5C5] text-gray-300 cursor-not-allowed'
                      : 'bg-white border border-[#DDD5C5] text-gray-600 hover:border-[#0A3D62] cursor-pointer'
                }`}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content area */}
      {viewLevel === 'dynasty' && (
        <DynastyView
          selectedEntityId={selected?.type === 'entity' ? selected.id : null}
          selectedPersonId={selected?.type === 'person' ? selected.id : null}
          onSelectEntity={handleEntityClick}
          onSelectPerson={handlePersonClick}
        />
      )}

      {viewLevel === 'entity' && selected?.type === 'entity' && (
        <EntityDetailView
          entityId={selected.id}
          onSelectPerson={handlePersonClick}
        />
      )}

      {viewLevel === 'individual' && selected?.type === 'person' && (
        <IndividualView personId={selected.id} />
      )}

      {/* Empty state fallback */}
      {viewLevel === 'entity' && selected?.type !== 'entity' && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Välj ett bolag i Dynasty-vyn
        </div>
      )}
      {viewLevel === 'individual' && selected?.type !== 'person' && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Välj en person i Dynasty-vyn
        </div>
      )}

      {/* Legend bar */}
      <div className="flex-shrink-0 px-5 py-2 border-t border-[#DDD5C5] bg-white flex items-center gap-6 flex-wrap text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Live</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span>Forming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
          <span>Planerat</span>
        </div>
        <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-[#DDD5C5]">
          <svg width="20" height="8">
            <line x1="0" y1="4" x2="14" y2="4" stroke="#C4B9A4" strokeWidth="1.5" />
            <polygon points="12,1 16,4 12,7" fill="#C4B9A4" />
          </svg>
          <span>Ägarskap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-px" style={{ background: '#E8B84B', display: 'inline-block' }} />
          <span>Markerat element</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-gray-400">
          {CORP_HIERARCHY.length} entiteter · {TEAM_COMMAND_CHAIN.length} i command chain
        </div>
      </div>
    </div>
  )
}
