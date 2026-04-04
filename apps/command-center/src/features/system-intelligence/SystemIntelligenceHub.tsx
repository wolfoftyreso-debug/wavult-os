// ─── System Intelligence Hub ───────────────────────────────────────────────
// Koncernhälsa-oscilloskop · Strategisk riskmatris · Beslutslogg · Marknadssignaler
// Inspirerad av dissg/Lambda System — anpassad för Wavult Group

import { useState } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'

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
    color: '#2563EB',
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
    description: 'All produktionsdata för Wavult OS ligger i ett enda Supabase-projekt — dokumentera disaster recovery plan.',
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
      <circle cx="32" cy="32" r={r} stroke="#DDD5C5" strokeWidth="5" fill="none" />
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
        fill="#0A3D62"
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
            <span className="font-bold text-text-primary text-sm">{entity.name}</span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: statusColors[entity.status] + '22', color: statusColors[entity.status] }}
            >
              {entity.code}
            </span>
          </div>
          <div className="text-xs text-gray-9000 mt-0.5">{entity.jurisdiction}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColors[entity.status] }}
            />
            <span className="text-xs" style={{ color: statusColors[entity.status] }}>
              {entity.status === 'green' ? 'Hälsosam' : entity.status === 'yellow' ? 'Varning' : 'Kritisk'}
            </span>
            {entity.trend === 'up' && <span className="text-green-700"><TrendingUpIcon /></span>}
            {entity.trend === 'down' && <span className="text-red-700"><TrendingDownIcon /></span>}
          </div>
        </div>
      </div>

      {/* Signals */}
      <div className="mt-3 flex flex-col gap-1">
        {entity.signals.slice(0, 2).map(s => (
          <div key={s} className="flex items-start gap-1.5 text-xs text-gray-600">
            <span className="text-green-700 flex-shrink-0 mt-0.5"><CheckIcon /></span>{s}
          </div>
        ))}
        {entity.stressors.slice(0, 2).map(s => (
          <div key={s} className="flex items-start gap-1.5 text-xs text-gray-9000">
            <span className="text-red-700 flex-shrink-0 mt-0.5"><AlertIcon /></span>{s}
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
              selectedRisk === risk.id ? 'border-[#DDD5C5] bg-[#EDE8DC]' : 'border-surface-border bg-[#F0EBE1] hover:bg-[#EDE8DC]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: levelColors[risk.level] + '22', color: levelColors[risk.level] }}
              >
                {levelLabels[risk.level]}
              </div>
              <span className="text-xs text-gray-9000">{risk.category}</span>
              <span className="ml-auto text-xs font-bold text-text-primary">{risk.riskScore}</span>
            </div>
            <div className="text-sm font-medium text-text-primary">{risk.title}</div>
            <div className="text-xs text-gray-9000 mt-0.5 truncate">{risk.owner}</div>

            {/* P×I bars */}
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-9000">P</span>
                <div className="w-20 bg-[#F0EBE1] rounded-full h-1.5">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${risk.probability * 10}%` }} />
                </div>
                <span className="text-amber-700">{risk.probability}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-9000">I</span>
                <div className="w-20 bg-[#F0EBE1] rounded-full h-1.5">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${risk.impact * 10}%` }} />
                </div>
                <span className="text-red-700">{risk.impact}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Right: detail */}
      <div className="flex-1">
        {selected ? (
          <div className="rounded-xl border border-surface-border bg-[#F0EBE1] p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div
                className="text-xs font-bold px-2 py-1 rounded uppercase"
                style={{ backgroundColor: levelColors[selected.level] + '22', color: levelColors[selected.level] }}
              >
                {levelLabels[selected.level]} RISK
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{selected.title}</h3>
                <div className="text-xs text-gray-9000">{selected.category} · Owner: {selected.owner}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-700">{selected.probability}</div>
                <div className="text-xs text-gray-9000">Sannolikhet</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-700">{selected.impact}</div>
                <div className="text-xs text-gray-9000">Impact</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">{selected.riskScore}</div>
                <div className="text-xs text-gray-9000">Risk Score</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Mitigering</div>
              <p className="text-sm text-gray-600">{selected.mitigation}</p>
            </div>
            {selected.eta && (
              <div className="flex items-center gap-2 text-xs text-gray-9000">
                <ClockIcon /> Deadline: <span className="text-text-primary">{selected.eta}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-9000 gap-2">
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
    monitoring: '#2563EB',
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
        <div key={entry.id} className="rounded-xl border border-surface-border bg-[#F0EBE1] p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: statusColors[entry.status] }}
              />
              {'|'.repeat(entry.impactScore).split('').map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-[#EDE8DC]" />
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
                <span className="text-xs text-gray-9000 flex items-center gap-1">
                  <ClockIcon />{entry.date}
                </span>
                <span className="text-xs text-gray-9000">av {entry.decisionMaker}</span>
                <span className="ml-auto text-xs text-gray-9000">Impact: {'★'.repeat(entry.impactScore)}</span>
              </div>
              <h4 className="text-sm font-bold text-text-primary mb-1">{entry.decision}</h4>
              <p className="text-xs text-gray-9000 mb-2">{entry.context}</p>
              <div className="rounded bg-[#F0EBE1] border border-surface-border px-3 py-2">
                <div className="text-xs font-semibold text-gray-9000 uppercase tracking-wide mb-0.5">Konsekvens</div>
                <p className="text-xs text-gray-600">{entry.consequence}</p>
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
          className={`rounded-xl border p-4 ${signal.actionable ? 'border-[#DDD5C5] bg-[#F0EBE1]' : 'border-[#DDD5C5] bg-[#F5F0E8] opacity-70'}`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {signal.direction === 'up' && <span className="text-green-700"><TrendingUpIcon /></span>}
              {signal.direction === 'down' && <span className="text-red-700"><TrendingDownIcon /></span>}
              {signal.direction === 'stable' && <span className="text-gray-9000">→</span>}
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
                  <div className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 uppercase">
                    Actionable
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-800">{signal.signal}</p>
              <div className="text-xs text-gray-9000 mt-1">{signal.source} · {signal.date}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Strategic Overview ───────────────────────────────────────────────────────

// TODO: Connect to /v1/qms/wavult-os/dashboard or Strategic Brief API
// when endpoint is ready. Currently uses empty reactive state.
function useStrategicData() {
  const [data, _setData] = useState<null>(null)
  // Future: fetch('/v1/qms/wavult-os/dashboard').then(res => res.json()).then(setData)
  return { data, loading: false }
}

function StrategicOverview() {
  const { data: _data, loading: _loading } = useStrategicData()

  const zoomercycle = [
    { event: 'mission_created', desc: 'En ny bilduppgift läggs till på kartan — en zoomer tilldelas', color: '#2563EB' },
    { event: 'zoomer_assigned', desc: 'Zoomer accepterar uppdrag och påbörjar det', color: '#3B82F6' },
    { event: 'image_captured', desc: 'Bild tagen och uppladdad — leverans sker', color: '#E8B84B' },
    { event: 'submission_reviewed', desc: 'Kvalitetsgodkänd av systemet — zoomer valideras', color: '#10B981' },
    { event: 'payment_triggered', desc: 'Zoomer betalas — uppdragscykeln avslutas', color: '#0A3D62' },
  ]

  const products = [
    { name: 'quiXzoom', tagline: 'Last Mile Intelligence Capture', status: 'Launch Q2 2026, Sverige', color: '#E8B84B' },
    { name: 'LandveX', tagline: 'Right control. Right cost. Right interval.', status: 'Fas 3 efter quiXzoom', color: '#0A3D62' },
    { name: 'Quixom Ads', tagline: 'B2B dataplattform', status: 'Fas 2 monetisering', color: '#10B981' },
  ]

  const gtmSteps = [
    { step: '1', label: 'quiXzoom', desc: 'Crowdsourcad bildplattform — zoomers tar uppdrag och bygger databasen', color: '#E8B84B' },
    { step: '2', label: 'Quixom Ads', desc: 'B2B dataplattform monetiserar bilddata och hyperlokal intelligens', color: '#F59E0B' },
    { step: '3', label: 'LandveX', desc: 'Enterprise-försäljning av larm, händelserapporter och analysabonnemang till kommuner och Trafikverket', color: '#0A3D62' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Wavult OS — intern plattform */}
      <div className="rounded-2xl border border-[#DDD5C5] bg-[#F5F0E8] p-6">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Wavult OS</div>
        <div className="text-xl font-bold text-[#0A3D62] mb-3">Internt enterprise-operativsystem</div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Wavult OS är det interna enterprise-operativsystemet som driver alla Wavult Group-produkter.
          Det är inte en produkt som säljs — det är ryggraden som möjliggör quiXzoom, LandveX och Quixom Ads.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap">
          {['quiXzoom', 'LandveX', 'Quixom Ads'].map(p => (
            <div key={p} className="rounded-lg border border-[#DDD5C5] bg-[#F0EBE1] px-3 py-1.5 text-xs font-medium text-[#0A3D62]">
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Produktportfölj */}
      <div>
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Produktportfölj</div>
        <div className="flex flex-col gap-3">
          {products.map(p => (
            <div
              key={p.name}
              className="rounded-xl border p-4 flex items-start gap-4"
              style={{ borderColor: p.color + '33', backgroundColor: p.color + '0A' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-[#0A3D62] text-sm">{p.name}</span>
                  <span className="text-xs text-gray-600">— {p.tagline}</span>
                </div>
                <div
                  className="text-xs font-medium px-2 py-0.5 rounded inline-block"
                  style={{ backgroundColor: p.color + '22', color: p.color === '#0A3D62' ? '#0A3D62' : p.color }}
                >
                  {p.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GTM-sekvens */}
      <div>
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">GTM-sekvens</div>
        <div className="flex flex-col gap-2">
          {gtmSteps.map((step, i) => (
            <div key={step.step} className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: step.color + '22', color: step.color === '#0A3D62' ? '#0A3D62' : step.color }}
                >
                  {step.step}
                </div>
                {i < gtmSteps.length - 1 && <div className="w-px h-5 bg-[#DDD5C5]" />}
              </div>
              <div className="flex-1 rounded-xl border border-[#DDD5C5] bg-[#F0EBE1] px-4 py-3 mb-1">
                <div className="font-semibold text-[#0A3D62] text-sm mb-0.5">{step.label}</div>
                <div className="text-xs text-gray-600">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* quiXzoom Zoomer-cykel */}
      <div>
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">quiXzoom — Zoomer-cykeln</div>
        <div className="rounded-xl border border-[#E8B84B]/30 bg-[#E8B84B]/5 p-5">
          <p className="text-sm text-gray-600 mb-4">
            Varje uppdrag i quiXzoom genererar en kedja av händelser — från att uppgiften skapas till att zoomern betalas.
          </p>
          <div className="flex flex-col gap-2">
            {zoomercycle.map((step, i) => (
              <div key={step.event} className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: step.color + '22', color: step.color }}
                  >
                    {i + 1}
                  </div>
                  {i < zoomercycle.length - 1 && (
                    <div className="w-px h-4 bg-[#DDD5C5] ml-2" />
                  )}
                </div>
                <div className="flex-1 rounded-lg bg-[#F0EBE1] border border-[#DDD5C5] px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono" style={{ color: step.color }}>{step.event}</code>
                    <span className="text-xs text-gray-600">— {step.desc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = 'oscilloskop' | 'risker' | 'beslut' | 'marknad' | 'pix'

export function SystemIntelligenceHub() {
  const { t: _t } = useTranslation() // ready for i18n
  const [activeTab, setActiveTab] = useState<ActiveTab>('oscilloskop')

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'oscilloskop', label: 'Koncernhälsa', icon: '📡' },
    { id: 'risker', label: 'Riskmatris', icon: '⚠️' },
    { id: 'beslut', label: 'Beslutslogg', icon: '📋' },
    { id: 'marknad', label: 'Marknadssignaler', icon: '📈' },
    { id: 'pix', label: 'Strategi', icon: '🎯' },
  ]

  // Overall group health = average
  const avgHealth = Math.round(ENTITY_HEALTH.reduce((s, e) => s + e.healthScore, 0) / ENTITY_HEALTH.length)
  const criticalRisks = RISK_MATRIX.filter(r => r.level === 'critical').length
  const highRisks = RISK_MATRIX.filter(r => r.level === 'high').length

  return (
    <div className="h-full flex flex-col bg-[#F0EBE1] text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <ActivityIcon />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">System Intelligence</h1>
            <p className="text-xs text-gray-9000">Koncernhälsa · Risker · Beslut · Marknad</p>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${avgHealth >= 70 ? 'text-green-700' : avgHealth >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
              λ {(avgHealth / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-9000">Group Lambda</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-700">{criticalRisks}</div>
            <div className="text-xs text-gray-9000">Kritiska risker</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-700">{highRisks}</div>
            <div className="text-xs text-gray-9000">Höga risker</div>
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
                ? 'text-text-primary border-blue-500 bg-[#EDE8DC]'
                : 'text-gray-9000 border-transparent hover:text-text-primary hover:bg-[#F0EBE1]'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="h-px bg-[#EDE8DC] flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {activeTab === 'oscilloskop' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ENTITY_HEALTH.map(entity => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
            {/* Group summary card */}
            <div className="rounded-xl border border-surface-border bg-[#F0EBE1] p-4 flex flex-col gap-2">
              <div className="text-xs font-semibold text-gray-9000 uppercase tracking-wider">Koncernhälsa (λ)</div>
              <div className={`text-4xl font-mono font-bold ${avgHealth >= 70 ? 'text-green-700' : avgHealth >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
                λ {(avgHealth / 100).toFixed(2)}
              </div>
              <p className="text-xs text-gray-9000 leading-relaxed">
                Lambda &lt; 0.5 = kritisk systemstress. Wavult Group är i uppbyggnadsfas — 
                hälsopoäng reflekterar att bolagsstruktur och produkter ännu ej är live, inte operativa problem.
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {ENTITY_HEALTH.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-gray-9000">{e.code}</span>
                    <div className="flex-1 bg-[#F0EBE1] rounded-full h-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${e.healthScore}%`,
                          backgroundColor: e.healthScore >= 70 ? '#10B981' : e.healthScore >= 40 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="text-text-primary w-6 text-right">{e.healthScore}</span>
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

        {activeTab === 'pix' && <StrategicOverview />}
      </div>
    </div>
  )
}
