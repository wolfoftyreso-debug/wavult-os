// ─── Strategic Brief ─────────────────────────────────────────────────────────
// Kompakt "strategic context card" för Wavult Group
// Baserad på: BRAND_POSITIONING_V2, COMPETITOR_ANALYSIS, BUSINESS_MODEL_REVIEW
// Uppdaterad: 2026-03-27

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competitor {
  name: string
  category: string
  weakness: string
  ourResponse: string
  color: string
}

interface StrategicPosition {
  product: string
  tagline: string
  positioning: string
  uniqueness: string
  color: string
  emoji: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const WAVULT_MISSION = {
  line1: 'Wavult Group bygger nästa generations operativa infrastruktur — system som inte bara stödjer verksamheter utan driver dem.',
  line2: 'Vi äger IP:t. Vi styr plattformen. Vi möjliggör intelligensen.',
}

const STRATEGIC_POSITIONS: StrategicPosition[] = [
  {
    product: 'Pixdrift (Wavult OS)',
    tagline: 'Your Business, Running on pixdrift.',
    positioning: 'Business Operating System (BOS) — inte ett verktyg, inte ett CRM, utan substratet hela verksamheten körs på.',
    uniqueness: 'Team-flat pricing + SIE4 native + ISO-compliance inbyggt + OMS dag 1. Ingen konkurrent har allt i ett paket.',
    color: '#8B5CF6',
    emoji: '🧠',
  },
  {
    product: 'quiXzoom',
    tagline: 'Last Mile Intelligence Capture.',
    positioning: 'Global crowdsourcad kamerainfrastruktur. Fotografer tar uppdrag via karta, levererar bilddata, tjänar pengar. Differentiering = capture-nätverket, inte AI:n.',
    uniqueness: 'AI-bildanalys = commodity 2026. Moat = det distribuerade capture-nätverket. Ingen konkurrent kan bygga det på ett år.',
    color: '#F59E0B',
    emoji: '📸',
  },
  {
    product: 'Landvex',
    tagline: 'Infrastrukturintelligens för det fysiska Sverige.',
    positioning: 'B2G + B2B. Säljer AI-analyserad data till kommuner, fastighetsbolag och infrastrukturägare. Revenue-vehicle nu, plattform på sikt.',
    uniqueness: 'Svenska kommuner ökar budgetar för digital infrastrukturanalys +18% YoY. Lång säljcykel men hög LTV.',
    color: '#EC4899',
    emoji: '🏗',
  },
]

const COMPETITORS: Competitor[] = [
  {
    name: 'Salesforce',
    category: 'CRM',
    weakness: 'Kräver 3–6 månaders implementation och €70K+/år Salesforce-admin. Ingen ekonomimodul, inget nordisk compliance.',
    ourResponse: '"Vi gör på 1 dag vad Salesforce gör på 3 månader — till en tiondel av priset."',
    color: '#00A1E0',
  },
  {
    name: 'Monday.com',
    category: 'Work OS',
    weakness: 'Ger dig en tavla, inte ett system. Ingen ekonomi, ingen SIE4, data-silos mellan projekt och affärer.',
    ourResponse: '"monday.com ger er en tavla. pixdrift ger er ett system."',
    color: '#FF3D57',
  },
  {
    name: 'Notion',
    category: 'Workspace',
    weakness: 'Blank canvas-problem — hög kognitiv börda. Ingen CRM, ingen ekonomi, ingen compliance. Läcker vid 50+ anst.',
    ourResponse: '"Notion är din anteckningsbok. pixdrift är ditt operativsystem."',
    color: '#000000',
  },
  {
    name: 'Keyloop/CDK',
    category: 'Automotive DMS',
    weakness: 'Per-seat pricing som straffar tillväxt. €1,200-1,800/mo utan ekonomi eller compliance. Gammal UX.',
    ourResponse: '"Vi slår Keyloop på pris, funktionalitet och UX — och vi tar inga tillägg."',
    color: '#E84142',
  },
  {
    name: 'Palantir Foundry',
    category: 'Data Ontology',
    weakness: '€500K+/år. 18 månaders implementation. Kräver team av data scientists. Generic, inte pre-built.',
    ourResponse: '"PIX Ontology levereras dag 1 för €499/mo — pre-built för verkligheten."',
    color: '#101828',
  },
]

const MARKET_FACTS = [
  { stat: '4 500', label: 'oberoende bilverkstäder i Sverige (beachhead)', color: '#8B5CF6' },
  { stat: '+18%', label: 'kommunal infrastrukturbudget YoY (Landvex)', color: '#EC4899' },
  { stat: '2026', label: 'EU liberaliserar drone-regler — öppnar ny vertikal', color: '#F59E0B' },
  { stat: '€1M', label: 'ARR möjlig med 23% penetration av verkstadsmarknaden', color: '#10B981' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MissionCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent border border-purple-500/20 p-5">
      <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Wavult Group — Mission</div>
      <p className="text-sm text-white leading-relaxed font-medium">{WAVULT_MISSION.line1}</p>
      <p className="text-sm text-gray-400 leading-relaxed mt-2">{WAVULT_MISSION.line2}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {['IP-ägande', 'Plattformskontroll', 'AI-lager', 'Dubai-holding', 'Global scale'].map(tag => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-300 bg-purple-500/10"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function PositionsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {STRATEGIC_POSITIONS.map(pos => (
        <div
          key={pos.product}
          className="rounded-xl border p-4"
          style={{ borderColor: pos.color + '33', backgroundColor: pos.color + '08' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ backgroundColor: pos.color + '22' }}
            >
              {pos.emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">{pos.product}</span>
                <span className="text-xs italic text-gray-400">"{pos.tagline}"</span>
              </div>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">{pos.positioning}</p>
              <div
                className="mt-2 text-xs rounded px-2 py-1 border"
                style={{ borderColor: pos.color + '33', backgroundColor: pos.color + '11', color: pos.color }}
              >
                🔑 {pos.uniqueness}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CompetitorTable() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {COMPETITORS.map(comp => (
        <button
          key={comp.name}
          onClick={() => setSelected(selected === comp.name ? null : comp.name)}
          className={`text-left rounded-xl border p-3 transition-all ${
            selected === comp.name
              ? 'border-white/25 bg-white/8'
              : 'border-white/10 bg-white/5 hover:bg-white/8'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: comp.color === '#000000' ? '#666' : comp.color }}
            />
            <span className="font-semibold text-white text-sm">{comp.name}</span>
            <span className="text-xs text-gray-500">({comp.category})</span>
            <span className="ml-auto text-xs text-red-400">Svaghet ▼</span>
          </div>
          {selected === comp.name && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <div className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-0.5">Deras svaghet</div>
                <p className="text-xs text-gray-300">{comp.weakness}</p>
              </div>
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                <div className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-0.5">Vår respons</div>
                <p className="text-xs text-gray-200 italic">{comp.ourResponse}</p>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function MarketFacts() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MARKET_FACTS.map(fact => (
        <div
          key={fact.label}
          className="rounded-xl border p-3 text-center"
          style={{ borderColor: fact.color + '33', backgroundColor: fact.color + '08' }}
        >
          <div className="text-2xl font-bold" style={{ color: fact.color }}>{fact.stat}</div>
          <div className="text-xs text-gray-400 mt-0.5 leading-snug">{fact.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type BriefTab = 'mission' | 'produkter' | 'konkurrenter' | 'marknad'

export function StrategicBrief() {
  const [activeTab, setActiveTab] = useState<BriefTab>('mission')

  const tabs: { id: BriefTab; label: string; icon: string }[] = [
    { id: 'mission', label: 'Mission', icon: '🎯' },
    { id: 'produkter', label: 'Positioning', icon: '🚀' },
    { id: 'konkurrenter', label: 'Konkurrenter', icon: '⚔️' },
    { id: 'marknad', label: 'Marknad', icon: '📊' },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-base">🏛</div>
        <div>
          <h1 className="text-lg font-bold text-white">Strategic Brief</h1>
          <p className="text-xs text-gray-400">Mission · Positioning · Konkurrenter · Marknad</p>
        </div>
        <div className="ml-auto text-xs text-gray-500 italic hidden sm:block">
          Baserad på: BRAND_POSITIONING_V2 · COMPETITOR_ANALYSIS · BUSINESS_MODEL_REVIEW
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
                ? 'text-white border-purple-500 bg-white/8'
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
        {activeTab === 'mission' && <MissionCard />}
        {activeTab === 'produkter' && <PositionsGrid />}
        {activeTab === 'konkurrenter' && <CompetitorTable />}
        {activeTab === 'marknad' && <MarketFacts />}
      </div>
    </div>
  )
}
