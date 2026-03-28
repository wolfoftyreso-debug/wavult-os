// ─── System Intelligence Hub ───────────────────────────────────────────────
// Koncernhälsa-oscilloskop · Strategisk riskmatris · Beslutslogg · Marknadssignaler
// Inspirerad av dissg/Lambda System — anpassad för Wavult Group

import { useState } from 'react'

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function ActivityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function TrendingUpIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}
function TrendingDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
}
function ClockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function RadarIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/></svg>
}

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthStatus = 'green' | 'yellow' | 'red'
type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
type TrendDir = 'up' | 'down' | 'stable'

interface EntityHealth {
  id: string
  name: string
  code: string
  jurisdiction: string
  emoji: string
  healthScore: number   // 0-100  (Lambda-inspirerat)
  status: HealthStatus
  trend: TrendDir
  signals: string[]
  stressors: string[]
  color: string
}

interface RiskItem {
  id: string
  category: string
  title: string
  description: string
  probability: number   // 0-10
  impact: number        // 0-10
  riskScore: number     // probability * impact
  level: RiskLevel
  owner: string
  mitigation: string
  eta?: string
}

interface DecisionLogEntry {
  id: string
  date: string
  decision: string
  context: string
  decisionMaker: string
  consequence: string
  status: 'pending' | 'executed' | 'monitoring' | 'closed'
  impactScore: number   // 1-5
}

interface MarketSignal {
  id: string
  product: string
  signal: string
  direction: TrendDir
  strength: 'weak' | 'moderate' | 'strong'
  source: string
  date: string
  actionable: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ENTITY_HEALTH: EntityHealth[] = [
  {
    id: 'wgh',
    name: 'Wavult Group FZCO',
    code: 'WGH',
    jurisdiction: '🇦🇪 Dubai',
    emoji: '🏛',
    healthScore: 52,
    status: 'yellow',
    trend: 'up',
    signals: ['Holding-struktur planerad', 'IP-ägarskap definierat', 'Dubai-formation pågår'],
    stressors: ['Formation ej klar', 'Inga revenues ännu', 'Bank-konto ej öppnat'],
    color: '#8B5CF6',
  },
  {
    id: 'wdo',
    name: 'Wavult DevOps FZCO',
    code: 'WDO',
    jurisdiction: '🇦🇪 Dubai',
    emoji: '⚙️',
    healthScore: 45,
    status: 'yellow',
    trend: 'stable',
    signals: ['License-modell designad', 'Tech stack aktiv', 'Team i produktion'],
    stressors: ['Formation ej klar', 'Intercompany-avtal saknas', 'Revenue-ström ej live'],
    color: '#3B82F6',
  },
  {
    id: 'qxi-us',
    name: 'QuiXzoom Inc',
    code: 'QXI',
    jurisdiction: '🇺🇸 Delaware',
    emoji: '📸',
    healthScore: 38,
    status: 'red',
    trend: 'up',
    signals: ['Plattformskoncept klar', 'MVP under uppbyggnad', 'GTM-strategi definierad'],
    stressors: ['Ingen live-produkt', 'Inga betalande kunder', 'Inkorporation ej klar'],
    color: '#F59E0B',
  },
  {
    id: 'qxi-eu',
    name: 'QuiXzoom UAB',
    code: 'QXEU',
    jurisdiction: '🇱🇹 Vilnius',
    emoji: '🇪🇺',
    healthScore: 30,
    status: 'red',
    trend: 'stable',
    signals: ['EU-struktur planerad', 'GDPR-ramverk designat'],
    stressors: ['Ej inkorporerad', 'Inga live operations', 'EU-expansion väntar på US-launch'],
    color: '#10B981',
  },
  {
    id: 'lndvx-se',
    name: 'Landvex AB',
    code: 'LVX',
    jurisdiction: '🇸🇪 Stockholm',
    emoji: '🏗',
    healthScore: 55,
    status: 'yellow',
    trend: 'up',
    signals: ['B2G-pipeline aktiv', 'Landvex web live', 'Enterprise sales pågår'],
    stressors: ['Inga kontrakt signerade', 'Lång säljcykel', 'Resursbrist i säljteam'],
    color: '#EC4899',
  },
]

const RISK_MATRIX: RiskItem[] = [
  {
    id: 'r1',
    category: 'Finansiellt',
    title: 'Cash runway < 90 dagar',
    description: 'Om inga intäkter genereras eller kapital tas in inom 90 dagar riskerar driften att stanna.',
    probability: 6,
    impact: 9,
    riskScore: 54,
    level: 'critical',
    owner: 'Winston (CFO)',
    mitigation: 'Aktivera bridge-finansiering, påskynda första kundkontrakt, strama åt burn rate',
    eta: '2026-04-30',
  },
  {
    id: 'r2',
    category: 'Juridiskt',
    title: 'Dubai-formation försenad',
    description: 'Wavult Group FZCO och Wavult DevOps FZCO är ännu inte formerade — IP-ägarskap och skatteoptimering kan ej verkställas.',
    probability: 5,
    impact: 8,
    riskScore: 40,
    level: 'high',
    owner: 'Dennis (Legal)',
    mitigation: 'Anlita FZCO-agent i Dubai, sätt deadline före Thailand workcamp',
    eta: '2026-04-10',
  },
  {
    id: 'r3',
    category: 'Produkt',
    title: 'QuiXzoom MVP försenad',
    description: 'Om MVP:n inte är live till sommar 2026 riskerar vi att missa säsong och early-mover advantage.',
    probability: 6,
    impact: 7,
    riskScore: 42,
    level: 'high',
    owner: 'Johan (CTO)',
    mitigation: 'Avgränsa MVP hårt, prioriera core loop (uppdrag → delivery → payment), skippa nice-to-have',
    eta: '2026-06-01',
  },
  {
    id: 'r4',
    category: 'Team',
    title: 'Nyckelresurs saknas i säljteam',
    description: 'Leon är ensam på säljsidan — sjukdom eller frånvaro skapar pipeline-stopp.',
    probability: 4,
    impact: 7,
    riskScore: 28,
    level: 'medium',
    owner: 'Leon (CEO Ops)',
    mitigation: 'Rekrytera junior sälj eller aktivera frilansare, dokumentera all pipeline-data i CRM',
    eta: '2026-05-01',
  },
  {
    id: 'r5',
    category: 'Marknad',
    title: 'Landvex B2G-säljcykel > 12 månader',
    description: 'Kommunala upphandlingar tar tid — risk att Landvex bränner kapital utan intäkter.',
    probability: 7,
    impact: 6,
    riskScore: 42,
    level: 'high',
    owner: 'Erik (CEO)',
    mitigation: 'Lägg till B2B-komponent vid sidan av B2G, prospektera privata fastighetsbolag',
    eta: '2026-06-30',
  },
  {
    id: 'r6',
    category: 'Tekniskt',
    title: 'Supabase single-point-of-failure',
    description: 'All produktionsdata för Wavult OS ligger i ett enda Supabase-projekt utan backup-plan.',
    probability: 3,
    impact: 8,
    riskScore: 24,
    level: 'medium',
    owner: 'Johan (CTO)',
    mitigation: 'Aktivera Supabase automatisk backup, dokumentera disaster recovery plan',
    eta: '2026-04-15',
  },
]

const DECISION_LOG: DecisionLogEntry[] = [
  {
    id: 'd1',
    date: '2026-03-21',
    decision: 'Bolagsstruktur: Dubai holding + Wavult DevOps FZCO + subsidiaries',
    context: 'Skatteoptimering via Dubai 0% bolagsskatt, IP ägs av holding, subsidiaries betalar licensavgifter',
    decisionMaker: 'Erik Svensson',
    consequence: 'Alla IP-rättigheter och tech-plattformen hamnar i Dubai — möjliggör global expansion med minimal skattebelastning',
    status: 'executing',
    impactScore: 5,
  } as any,
  {
    id: 'd2',
    date: '2026-03-21',
    decision: 'Thailand workcamp 11 april — teamets kick-off',
    context: 'Vecka 1: teambuilding + systemutbildning. Sedan: live-driftsättning av alla projekt',
    decisionMaker: 'Erik Svensson',
    consequence: 'Team alignat, alla system redo att rulla. Ger fokus och energi inför Q2 2026',
    status: 'pending',
    impactScore: 4,
  },
  {
    id: 'd3',
    date: '2026-03-15',
    decision: 'Landvex AB aktiveras som first revenue vehicle',
    context: 'B2G-pipeline för QuiXzoom-liknande intelligens till kommuner och fastighetsbolag',
    decisionMaker: 'Erik Svensson',
    consequence: 'Landvex = snabbast till revenue pga befintliga kontakter. QuiXzoom = långsiktig plattform',
    status: 'executing',
    impactScore: 4,
  } as any,
  {
    id: 'd4',
    date: '2026-03-10',
    decision: 'Wavult OS byggs som intern plattform (inte extern produkt)',
    context: 'OS-et är Bernt + command center för Wavult Group. Säljs inte externt i Fas 1.',
    decisionMaker: 'Erik Svensson',
    consequence: 'Team arbetar med ett enda operativsystem. Minskar friktion, ökar transparens.',
    status: 'executing',
    impactScore: 3,
  } as any,
]

const MARKET_SIGNALS: MarketSignal[] = [
  {
    id: 'ms1',
    product: 'QuiXzoom',
    signal: 'Drone-regler i EU liberaliseras 2026 — öppnar ny kategori för airborne capture',
    direction: 'up',
    strength: 'strong',
    source: 'EASA regulatory update',
    date: '2026-03',
    actionable: true,
  },
  {
    id: 'ms2',
    product: 'Landvex',
    signal: 'Svenska kommuner ökar budgetar för digital infrastrukturanalys +18% YoY',
    direction: 'up',
    strength: 'strong',
    source: 'SKR (Sveriges Kommuner och Regioner)',
    date: '2026-03',
    actionable: true,
  },
  {
    id: 'ms3',
    product: 'QuiXzoom',
    signal: 'Konkurrent Patchwork Nation höjer priser 30% — öppnar prispressad marknad',
    direction: 'up',
    strength: 'moderate',
    source: 'Market tracking',
    date: '2026-02',
    actionable: true,
  },
  {
    id: 'ms4',
    product: 'Landvex',
    signal: 'US fastighetsmarknad i kylning — B2G mer resilient än B2B property',
    direction: 'stable',
    strength: 'moderate',
    source: 'Federal Reserve / Housing Index',
    date: '2026-03',
    actionable: false,
  },
  {
    id: 'ms5',
    product: 'QuiXzoom',
    signal: 'AI-baserad bildanalys = commodity 2026 — differentiering måste vara capture-nätverket, inte AI:n',
    direction: 'down',
    strength: 'strong',
    source: 'Gartner / Internal analysis',
    date: '2026-03',
    actionable: true,
  },
]

// ─── Health Score Gauge ───────────────────────────────────────────────────────

function HealthGauge({ score, color: _color }: { score: number; color: string }) {
  const r = 24
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const statusColor = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <svg width="64" height="64" className="-rotate-90">
      <circle cx="32" cy="32" r={r} stroke="#ffffff08" strokeWidth="5" fill="none" />
      <circle
        cx="32" cy="32" r={r}
        stroke={statusColor} strokeWidth="5" fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x="32" y="32"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
        transform="rotate(90 32 32)"
      >
        {score}
      </text>
    </svg>
  )
}

// ─── Entity Card ──────────────────────────────────────────────────────────────

function EntityCard({ entity }: { entity: EntityHealth }) {
  const statusColors: Record<HealthStatus, string> = {
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
  }

  return (
    <div
      className="rounded-xl p-4 border"
      style={{ borderColor: entity.color + '33', backgroundColor: entity.color + '0A' }}
    >
      <div className="flex items-start gap-3">
        <HealthGauge score={entity.healthScore} color={entity.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{entity.emoji}</span>
            <span className="font-bold text-white text-sm">{entity.name}</span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: statusColors[entity.status] + '22', color: statusColors[entity.status] }}
            >
              {entity.code}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{entity.jurisdiction}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColors[entity.status] }}
            />
            <span className="text-xs" style={{ color: statusColors[entity.status] }}>
              {entity.status === 'green' ? 'Hälsosam' : entity.status === 'yellow' ? 'Varning' : 'Kritisk'}
            </span>
            {entity.trend === 'up' && <span className="text-green-400"><TrendingUpIcon /></span>}
            {entity.trend === 'down' && <span className="text-red-400"><TrendingDownIcon /></span>}
          </div>
        </div>
      </div>

      {/* Signals */}
      <div className="mt-3 flex flex-col gap-1">
        {entity.signals.slice(0, 2).map(s => (
          <div key={s} className="flex items-start gap-1.5 text-xs text-gray-300">
            <span className="text-green-400 flex-shrink-0 mt-0.5"><CheckIcon /></span>{s}
          </div>
        ))}
        {entity.stressors.slice(0, 2).map(s => (
          <div key={s} className="flex items-start gap-1.5 text-xs text-gray-400">
            <span className="text-red-400 flex-shrink-0 mt-0.5"><AlertIcon /></span>{s}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Risk Matrix ──────────────────────────────────────────────────────────────

function RiskMatrix() {
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null)

  const levelColors: Record<RiskLevel, string> = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444',
  }
  const levelLabels: Record<RiskLevel, string> = {
    low: 'Låg',
    medium: 'Medium',
    high: 'Hög',
    critical: 'Kritisk',
  }

  const sorted = [...RISK_MATRIX].sort((a, b) => b.riskScore - a.riskScore)
  const selected = sorted.find(r => r.id === selectedRisk)

  return (
    <div className="flex gap-5 h-full">
      {/* Left: list */}
      <div className="flex flex-col gap-2 w-80 flex-shrink-0">
        {sorted.map(risk => (
          <button
            key={risk.id}
            onClick={() => setSelectedRisk(selectedRisk === risk.id ? null : risk.id)}
            className={`text-left rounded-xl p-3 border transition-all ${
              selectedRisk === risk.id ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/8'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: levelColors[risk.level] + '22', color: levelColors[risk.level] }}
              >
                {levelLabels[risk.level]}
              </div>
              <span className="text-xs text-gray-400">{risk.category}</span>
              <span className="ml-auto text-xs font-bold text-white">{risk.riskScore}</span>
            </div>
            <div className="text-sm font-medium text-white">{risk.title}</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">{risk.owner}</div>

            {/* P×I bars */}
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">P</span>
                <div className="w-20 bg-white/5 rounded-full h-1.5">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${risk.probability * 10}%` }} />
                </div>
                <span className="text-amber-400">{risk.probability}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">I</span>
                <div className="w-20 bg-white/5 rounded-full h-1.5">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${risk.impact * 10}%` }} />
                </div>
                <span className="text-red-400">{risk.impact}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Right: detail */}
      <div className="flex-1">
        {selected ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div
                className="text-xs font-bold px-2 py-1 rounded uppercase"
                style={{ backgroundColor: levelColors[selected.level] + '22', color: levelColors[selected.level] }}
              >
                {levelLabels[selected.level]} RISK
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selected.title}</h3>
                <div className="text-xs text-gray-400">{selected.category} · Owner: {selected.owner}</div>
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{selected.description}</p>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{selected.probability}</div>
                <div className="text-xs text-gray-400">Sannolikhet</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{selected.impact}</div>
                <div className="text-xs text-gray-400">Impact</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{selected.riskScore}</div>
                <div className="text-xs text-gray-400">Risk Score</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Mitigering</div>
              <p className="text-sm text-gray-300">{selected.mitigation}</p>
            </div>
            {selected.eta && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ClockIcon /> Deadline: <span className="text-white">{selected.eta}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
            <RadarIcon />
            <div className="text-sm">Välj en risk för detaljer</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Decision Log ─────────────────────────────────────────────────────────────

function DecisionLog() {
  const statusColors: Record<string, string> = {
    pending: '#F59E0B',
    executing: '#3B82F6',
    monitoring: '#8B5CF6',
    closed: '#10B981',
  }
  const statusLabels: Record<string, string> = {
    pending: 'Väntar',
    executing: 'Genomförs',
    monitoring: 'Övervakas',
    closed: 'Klar',
  }

  return (
    <div className="flex flex-col gap-3">
      {DECISION_LOG.map(entry => (
        <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: statusColors[entry.status] }}
              />
              {'|'.repeat(entry.impactScore).split('').map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-white/20" />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div
                  className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{ backgroundColor: statusColors[entry.status] + '22', color: statusColors[entry.status] }}
                >
                  {statusLabels[entry.status]}
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <ClockIcon />{entry.date}
                </span>
                <span className="text-xs text-gray-500">av {entry.decisionMaker}</span>
                <span className="ml-auto text-xs text-gray-400">Impact: {'★'.repeat(entry.impactScore)}</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{entry.decision}</h4>
              <p className="text-xs text-gray-400 mb-2">{entry.context}</p>
              <div className="rounded bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Konsekvens</div>
                <p className="text-xs text-gray-300">{entry.consequence}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Market Signals ───────────────────────────────────────────────────────────

function MarketSignals() {
  const strengthColors: Record<string, string> = {
    weak: '#6B7280',
    moderate: '#F59E0B',
    strong: '#10B981',
  }
  const productColors: Record<string, string> = {
    QuiXzoom: '#F59E0B',
    Landvex: '#EC4899',
  }

  return (
    <div className="flex flex-col gap-3">
      {MARKET_SIGNALS.map(signal => (
        <div
          key={signal.id}
          className={`rounded-xl border p-4 ${signal.actionable ? 'border-white/15 bg-white/5' : 'border-white/8 bg-white/3 opacity-70'}`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {signal.direction === 'up' && <span className="text-green-400"><TrendingUpIcon /></span>}
              {signal.direction === 'down' && <span className="text-red-400"><TrendingDownIcon /></span>}
              {signal.direction === 'stable' && <span className="text-gray-400">→</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: (productColors[signal.product] || '#6B7280') + '22', color: productColors[signal.product] || '#6B7280' }}
                >
                  {signal.product}
                </div>
                <div
                  className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{ backgroundColor: strengthColors[signal.strength] + '22', color: strengthColors[signal.strength] }}
                >
                  {signal.strength}
                </div>
                {signal.actionable && (
                  <div className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
                    Actionable
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-200">{signal.signal}</p>
              <div className="text-xs text-gray-500 mt-1">{signal.source} · {signal.date}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── PIX Philosophy ───────────────────────────────────────────────────────────

function PixPhilosophy() {
  const pixLayers = [
    { layer: 'Core Layer', description: 'PIX Event Layer + Ledger + Identity + Company Core', color: '#8B5CF6', note: 'Aldrig modulärt — grunden som aldrig byts ut' },
    { layer: 'Module Layer', description: 'Execution · Process · Finance · Workforce · Workshop · Intelligence', color: '#3B82F6', note: 'Vad kunder betalar för — bygger på Core' },
    { layer: 'Industry Packs', description: 'Automotive Pack · Construction Pack · Healthcare Pack · Restaurant Pack', color: '#10B981', note: 'Pre-konfigurerade bundles per bransch' },
    { layer: 'Intelligence Layer', description: 'Control Tower · Root Cause Engine · PIX Analytics · AI Insights', color: '#F59E0B', note: 'Premium-lager med högst marginal' },
  ]

  const quixzoomPix = [
    { event: 'mission_created', desc: 'En ny bilduppgift läggs till på kartan — en PIX föds', color: '#8B5CF6' },
    { event: 'photographer_assigned', desc: 'Fotograf accepterar uppdrag — PIX byter status', color: '#3B82F6' },
    { event: 'photo_captured', desc: 'Bild tagen och uppladdad — en operationell pixel levererad', color: '#F59E0B' },
    { event: 'submission_reviewed', desc: 'Kvalitetsgodkänd av AI/admin — PIX valideras', color: '#10B981' },
    { event: 'payment_triggered', desc: 'Fotograf betalas — PIX avslutas med ekonomisk signal', color: '#EC4899' },
  ]

  const competitors = [
    { name: 'Palantir Foundry', cost: '€500K+/år', setup: '18 månader', verdict: 'Generisk ontologi — kräver datascientists' },
    { name: 'SAP', cost: '€100K+/år', setup: '12-24 månader', verdict: 'Enterprise-only, oöverkomlig komplexitet' },
    { name: 'Pixdrift (PIX)', cost: '€499-1299/mo', setup: 'Dag 1', verdict: 'Pre-built för verkligheten — inte konsultprojekt' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6">
        <div className="text-2xl font-bold text-white mb-2">PIX — Operational Pixels</div>
        <div className="text-sm text-gray-300 leading-relaxed max-w-2xl">
          Varje operation består av tusentals små, konkreta händelser. Vi kallar dem <strong className="text-purple-300">PIX</strong> — operational pixels.
          När dessa inte är synliga blir verksamheten ogenomskinlig. När de är synliga — blir allt tydligt.
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">∞</div>
            <div className="text-xs text-gray-400">PIX per operation</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">0s</div>
            <div className="text-xs text-gray-400">Delay till synlighet</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">1</div>
            <div className="text-xs text-gray-400">Källa för sanning</div>
          </div>
        </div>
      </div>

      {/* Core Philosophy */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kärnprincip</div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-bold text-white mb-2 italic">"Systems should run the business. Not the other way around."</div>
          <p className="text-sm text-gray-300 leading-relaxed">
            Avancerade bolag som Amazon, Nvidia och Tesla uppnår inte hög output av slumpen. De opererar på system som
            <strong className="text-white"> spårar verkligheten i realtid</strong>, kontinuerligt rekalibrerar och förbättrar sig
            själva genom struktur. Pixdrift ger detta till alla bolag — inte som rapporter, utan som verklighet.
          </p>
        </div>
      </div>

      {/* Architecture Layers */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Arkitekturlager</div>
        <div className="flex flex-col gap-2">
          {pixLayers.map((layer, i) => (
            <div
              key={layer.layer}
              className="rounded-xl border p-4 flex items-start gap-4"
              style={{ borderColor: layer.color + '33', backgroundColor: layer.color + '0A' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: layer.color + '22', color: layer.color }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm">{layer.layer}</div>
                <div className="text-xs text-gray-300 mt-0.5">{layer.description}</div>
                <div className="text-xs mt-1 italic" style={{ color: layer.color }}>{layer.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* quiXzoom PIX flow */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">quiXzoom: Varje bild = en PIX</div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm text-gray-300 mb-4">
            quiXzoom är PIX-konceptet applicerat på bildinfrastruktur. Varje foto-uppdrag genererar en kedja av operationella pixels —
            från <span className="text-amber-300">uppdrag skapat</span> till <span className="text-green-300">betalning triggrad</span>.
          </p>
          <div className="flex flex-col gap-2">
            {quixzoomPix.map((pix, i) => (
              <div key={pix.event} className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: pix.color + '22', color: pix.color }}
                  >
                    {i + 1}
                  </div>
                  {i < quixzoomPix.length - 1 && (
                    <div className="w-px h-4 bg-white/10 ml-2" />
                  )}
                </div>
                <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono" style={{ color: pix.color }}>{pix.event}</code>
                    <span className="text-xs text-gray-400">— {pix.desc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor comparison */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Systemic Thinking — vs Konkurrenter</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 pb-2 pr-4">System</th>
                <th className="text-left text-gray-400 pb-2 pr-4">Kostnad</th>
                <th className="text-left text-gray-400 pb-2 pr-4">Driftsättning</th>
                <th className="text-left text-gray-400 pb-2">Verklighet</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr key={c.name} className={`border-b border-white/5 ${i === competitors.length - 1 ? 'bg-green-500/5' : ''}`}>
                  <td className={`py-2 pr-4 font-medium ${i === competitors.length - 1 ? 'text-green-400' : 'text-white'}`}>{c.name}</td>
                  <td className={`py-2 pr-4 ${i === competitors.length - 1 ? 'text-green-300' : 'text-red-400'}`}>{c.cost}</td>
                  <td className={`py-2 pr-4 ${i === competitors.length - 1 ? 'text-green-300' : 'text-amber-400'}`}>{c.setup}</td>
                  <td className="py-2 text-gray-400">{c.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modular strategy */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Modulär Strategi</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-red-400 font-semibold mb-1">❌ Säljer INTE</div>
            <div className="text-gray-400">• Licenser per användare</div>
            <div className="text-gray-400">• Per-seat pricing</div>
            <div className="text-gray-400">• Isolerade verktyg</div>
          </div>
          <div>
            <div className="text-green-400 font-semibold mb-1">✅ Säljer</div>
            <div className="text-gray-300">• Kapacitet + funktion</div>
            <div className="text-gray-300">• Team-flat pricing</div>
            <div className="text-gray-300">• Operativsystem (BOS)</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 italic border-t border-white/10 pt-3">
          Sell modularity. Build as modular monolith. Extract to microservices under scale pressure.
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = 'oscilloskop' | 'risker' | 'beslut' | 'marknad' | 'pix'

export function SystemIntelligenceHub() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('oscilloskop')

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'oscilloskop', label: 'Koncernhälsa', icon: '📡' },
    { id: 'risker', label: 'Riskmatris', icon: '⚠️' },
    { id: 'beslut', label: 'Beslutslogg', icon: '📋' },
    { id: 'marknad', label: 'Marknadssignaler', icon: '📈' },
    { id: 'pix', label: 'PIX-filosofi', icon: '⚡' },
  ]

  // Overall group health = average
  const avgHealth = Math.round(ENTITY_HEALTH.reduce((s, e) => s + e.healthScore, 0) / ENTITY_HEALTH.length)
  const criticalRisks = RISK_MATRIX.filter(r => r.level === 'critical').length
  const highRisks = RISK_MATRIX.filter(r => r.level === 'high').length

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <ActivityIcon />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">System Intelligence</h1>
            <p className="text-xs text-gray-400">Koncernhälsa · Risker · Beslut · Marknad</p>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${avgHealth >= 70 ? 'text-green-400' : avgHealth >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              λ {(avgHealth / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">Group Lambda</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-400">{criticalRisks}</div>
            <div className="text-xs text-gray-400">Kritiska risker</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">{highRisks}</div>
            <div className="text-xs text-gray-400">Höga risker</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-t-lg font-medium border-b-2 transition-all ${
              activeTab === t.id
                ? 'text-white border-blue-500 bg-white/8'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="h-px bg-white/10 flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {activeTab === 'oscilloskop' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ENTITY_HEALTH.map(entity => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
            {/* Group summary card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Koncernhälsa (λ)</div>
              <div className={`text-4xl font-mono font-bold ${avgHealth >= 70 ? 'text-green-400' : avgHealth >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                λ {(avgHealth / 100).toFixed(2)}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Lambda &lt; 0.5 = kritisk systemstress. Wavult Group är i uppbyggnadsfas — 
                hälsopoäng reflekterar att bolagsstruktur och produkter ännu ej är live, inte operativa problem.
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {ENTITY_HEALTH.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-gray-400">{e.code}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${e.healthScore}%`,
                          backgroundColor: e.healthScore >= 70 ? '#10B981' : e.healthScore >= 40 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="text-white w-6 text-right">{e.healthScore}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risker' && (
          <div className="h-full" style={{ minHeight: '500px' }}>
            <RiskMatrix />
          </div>
        )}

        {activeTab === 'beslut' && <DecisionLog />}

        {activeTab === 'marknad' && <MarketSignals />}

        {activeTab === 'pix' && <PixPhilosophy />}
      </div>
    </div>
  )
}
