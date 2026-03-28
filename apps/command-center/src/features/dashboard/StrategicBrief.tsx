// ─── Strategic Brief ─────────────────────────────────────────────────────────
// Kompakt "strategic context card" för Wavult Group
// Baserad på: BRAND_POSITIONING_V2, COMPETITOR_ANALYSIS, BUSINESS_MODEL_REVIEW
// Uppdaterad: 2026-03-28

import { useState } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competitor {
  name: string
  category: string
  product: 'quiXzoom' | 'Landvex' | 'Wavult OS' | 'Alla'
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

interface MarketFact {
  stat: string
  label: string
  color: string
}

interface PitchDocument {
  title: string
  category: 'Investor' | 'Sales' | 'Legal' | 'Management'
  status: 'Klar' | 'Draft' | 'Saknas'
  description: string
}

type ComplianceStatus = 'Ej påbörjat' | 'I process' | 'Certifierat'

interface ComplianceItem {
  standard: string
  description: string
  requiredFor: string
  status: ComplianceStatus
  responsible: string
  targetDate: string
  color: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const WAVULT_MISSION = {
  line1: 'Wavult Group bygger nästa generations operativa infrastruktur — system som inte bara stödjer verksamheter utan driver dem.',
  line2: 'Vi äger IP:t. Vi styr plattformen. Vi möjliggör intelligensen.',
}

const STRATEGIC_POSITIONS: StrategicPosition[] = [
  {
    product: 'quiXzoom',
    tagline: 'Last Mile Intelligence Capture.',
    positioning:
      'Global crowdsourcad kamerainfrastruktur. Zoomers tar bilduppdrag via karta, levererar bilddata, tjänar pengar. ' +
      'Plattformen bygger ett levande capture-nätverk som ingen konkurrent kan replikera på kort tid. ' +
      'Monetiseras via Quixom Ads — datan paketeras som leadpaket och hyperlokal annonsering till B2B-kunder.',
    uniqueness:
      'Moat = det distribuerade capture-nätverket, inte vision-lagret. Supply-first-strategi: zoomers samlar data → ' +
      'Quixom Ads monetiserar → Landvex enterprise consumes. Ingen konkurrent kan bygga det nätverket på ett år.',
    color: '#F59E0B',
    emoji: '📸',
  },
  {
    product: 'Landvex / Optical Insight',
    tagline: 'Right control. Right cost. Right interval.',
    positioning:
      'B2G + B2B enterprise. LandveX är försäljningsplattformen — säljer larm, händelserapporter och analysabonnemang ' +
      'till kommuner, Trafikverket, fastighetsbolag och hamnoperatörer. Optical Insight är den tekniska motorn bakom. ' +
      'Systemet optimerar kontrollekonomi: när är det värt att kontrollera, hur ofta, till vilken kostnad?',
    uniqueness:
      'Tre deployments: OI Cloud EU, OI Cloud US, OI Enterprise (air-gapped, on-premise). Hög LTV, lång säljcykel — ' +
      'men väl inne är byteskostnaden enorm. Kommunal infrastrukturbudget växer +18% YoY. NIS2 driver efterfrågan.',
    color: '#EC4899',
    emoji: '🏗️',
  },
  {
    product: 'Wavult OS',
    tagline: 'Your Business, Running on Wavult OS.',
    positioning:
      'Business Operating System (BOS) — inte ett verktyg, inte ett CRM, utan substratet hela verksamheten körs på. ' +
      'Används internt av Wavult Group och kan på sikt säljas externt som SaaS till medelstora europeiska bolag.',
    uniqueness:
      'Team-flat pricing + SIE4 native + ISO-compliance inbyggt + OMS dag 1. ' +
      'Ingen konkurrent har allt i ett paket till den prispunkten.',
    color: '#8B5CF6',
    emoji: '🧠',
  },
]

const COMPETITORS: Competitor[] = [
  // ── quiXzoom
  {
    name: 'Getty Images / Shutterstock',
    category: 'Bildbank',
    product: 'quiXzoom',
    weakness:
      'Statisk bildbank — ingen crowdsourced capture, inget realtidsnätverk, inga uppdragsbaserade zoomers. ' +
      'Bilderna är gamla, generiska och säljs per licens, inte som dataintelligens.',
    ourResponse:
      '"De säljer bilder. Vi bygger ett levande capture-nätverk. Det är skillnaden mellan ett foto och ett sensorsystem."',
    color: '#CC0000',
  },
  {
    name: 'Mapillary / Kaarta',
    category: 'Geospatial Capture',
    product: 'quiXzoom',
    weakness:
      'B2B-only, ingen supply-side inkomst för individen. Mapillary drivs av Meta och är primärt ett kartverktyg — ' +
      'inget Quixom Ads-lager, ingen lead/annonsmonetisering.',
    ourResponse:
      '"Mapillary betalar dig inte. quiXzoom gör det — och bygger en dataplattform ovanpå."',
    color: '#1877F2',
  },
  {
    name: 'Google Street View',
    category: 'Geospatial Mapping',
    product: 'quiXzoom',
    weakness:
      'Statisk, ej realtid, ej crowdsourcad mot betalning. Kan inte täcka skärgård, privat mark eller event på beställning. ' +
      'Uppdateras månader till år efter verkligheten.',
    ourResponse:
      '"Street View är en ögonblicksbild. quiXzoom är on-demand capture."',
    color: '#4285F4',
  },
  // ── Landvex / Optical Insight
  {
    name: 'Axis Communications',
    category: 'Kamerainfrastruktur',
    product: 'Landvex',
    weakness:
      'Säljer hårdvara och VMS, inte analytics eller larm. Ingen händelsebaserad rapportering, ingen kontrollekonomi-modul. ' +
      'Kunden måste köpa analys-lager separat — från någon annan.',
    ourResponse:
      '"Axis säljer kameran. Optical Insight gör den intelligent."',
    color: '#E31E25',
  },
  {
    name: 'Milestone Systems',
    category: 'VMS / Videoplattform',
    product: 'Landvex',
    weakness:
      'Video Management System utan inbyggd optisk analys. Integration med tredjepartslösningar är komplex och dyr. ' +
      'Ingen automatiserad larmhantering, ingen kommunal rapportmodell.',
    ourResponse:
      '"Milestone spelar in. LandveX rapporterar — proaktivt, automatiserat, direkt till beställaren."',
    color: '#005BAC',
  },
  {
    name: 'Palantir Foundry',
    category: 'Data Ontology / Enterprise',
    product: 'Landvex',
    weakness:
      '€500K+/år. 18 månaders implementation. Kräver team av data scientists. Generisk plattform — ' +
      'inte pre-built för kommunal infrastruktur eller nordisk compliance.',
    ourResponse:
      '"Palantir kräver en armé. LandveX är i drift dag 30."',
    color: '#101828',
  },
  // ── Wavult OS
  {
    name: 'Salesforce',
    category: 'CRM',
    product: 'Wavult OS',
    weakness:
      'Kräver 3–6 månaders implementation och €70K+/år Salesforce-admin. ' +
      'Ingen ekonomimodul, inget nordisk compliance.',
    ourResponse:
      '"Vi gör på 1 dag vad Salesforce gör på 3 månader — till en tiondel av priset."',
    color: '#00A1E0',
  },
  {
    name: 'Monday.com',
    category: 'Work OS',
    product: 'Wavult OS',
    weakness:
      'Ger dig en tavla, inte ett system. Ingen ekonomi, ingen SIE4, data-silos mellan projekt och affärer.',
    ourResponse:
      '"monday.com ger er en tavla. Wavult OS ger er ett system."',
    color: '#FF3D57',
  },
  {
    name: 'Notion',
    category: 'Workspace',
    product: 'Wavult OS',
    weakness:
      'Blank canvas-problem — hög kognitiv börda. Ingen CRM, ingen ekonomi, ingen compliance. Läcker vid 50+ anst.',
    ourResponse:
      '"Notion är din anteckningsbok. Wavult OS är ditt operativsystem."',
    color: '#000000',
  },
]

const MARKET_FACTS: MarketFact[] = [
  {
    stat: 'Juni 2026',
    label: 'quiXzoom-lansering Sverige — startskottet är skärgården',
    color: '#F59E0B',
  },
  {
    stat: 'Q1 2027',
    label: 'quiXzoom expansion — Nederländerna (marknad 2)',
    color: '#F59E0B',
  },
  {
    stat: '$4.5B',
    label: 'Global TAM crowdsourcad bilddata & geospatial intelligence (2026)',
    color: '#F59E0B',
  },
  {
    stat: '+18%',
    label: 'Kommunal infrastrukturbudget YoY — Landvex-marknad växer',
    color: '#EC4899',
  },
  {
    stat: 'NIS2 2025',
    label: 'EU-direktivet driver kommuner & hamnar till obligatorisk infrastrukturövervakning',
    color: '#EC4899',
  },
  {
    stat: '€2.1B',
    label: 'GDPR-driven datalokaliseringsmarknad EU — OI Cloud EU positionerat',
    color: '#EC4899',
  },
  {
    stat: 'Pipeline',
    label: 'Landvex: 3 kommuner + Trafikverket i tidig dialog',
    color: '#EC4899',
  },
  {
    stat: '€0→∞',
    label: 'Supply-first: zoomers samlar data → Quixom Ads monetiserar → Landvex enterprise consumes',
    color: '#10B981',
  },
]

const PITCH_MATERIALS: PitchDocument[] = [
  // ── Investor
  {
    title: 'Investor Deck — quiXzoom',
    category: 'Investor',
    status: 'Draft',
    description: 'Fullständig pitch för quiXzoom-bolaget. TAM, supply-modell, Quixom Ads, roadmap, team.',
  },
  {
    title: 'Investor Deck — Landvex / Optical Insight',
    category: 'Investor',
    status: 'Saknas',
    description: 'B2G/B2B-pitch. Kontrollekonomi, NIS2-vinkel, deployment-modeller, kommunpipeline.',
  },
  {
    title: 'Bank- och kreditpresentation',
    category: 'Investor',
    status: 'Saknas',
    description: 'Finansieringsdokument för bankrelation. Kassaflöde, säkerheter, bolagsstruktur.',
  },
  // ── Sales
  {
    title: 'One-pager — quiXzoom (för zoomers)',
    category: 'Sales',
    status: 'Saknas',
    description: 'Supply-side rekrytering. Hur funkar det att vara zoomer? Vad tjänar man? Hur startar man?',
  },
  {
    title: 'One-pager — LandveX (för kommuner)',
    category: 'Sales',
    status: 'Saknas',
    description: 'Kommunal upphandling. "Right control. Right cost. Right interval." NIS2-compliance-vinkel.',
  },
  // ── Legal
  {
    title: 'Legal Overview — Bolagsstruktur',
    category: 'Legal',
    status: 'Draft',
    description: 'Karta över Texas LLC, litauisk UAB, Dubai holding, intercompany-flöden och IP-ägarskap.',
  },
  {
    title: 'NDA-mall',
    category: 'Legal',
    status: 'Draft',
    description: 'Standard NDA för partners, kunder och leverantörer. Svensk + engelsk version.',
  },
  // ── Management / Ledningsmanual
  {
    title: 'Informationssäkerhetspolicy (ISO 27001 grund)',
    category: 'Management',
    status: 'Saknas',
    description: 'Grunddokument för ISMS. Krav för Landvex Enterprise-tier och kommunala upphandlingar.',
  },
  {
    title: 'Riskanalys och riskregister',
    category: 'Management',
    status: 'Saknas',
    description: 'Löpande riskregister: operationell, legal, finansiell och teknisk riskexponering.',
  },
  {
    title: 'Incidenthanteringsplan',
    category: 'Management',
    status: 'Saknas',
    description: 'Procedurer vid säkerhetsincident, dataintrång eller driftstörning. Krav: ISO 27001, NIS2.',
  },
  {
    title: 'Dataskyddspolicy (GDPR / DPO)',
    category: 'Management',
    status: 'Saknas',
    description: 'Behandling av personuppgifter inkl. biometrisk data (WHOOP), Art. 9-kategorier.',
  },
  {
    title: 'Kvalitetsmanual (ISO 9001)',
    category: 'Management',
    status: 'Saknas',
    description: 'Kvalitetsledningssystem. Krävs för kommunala upphandlingar och LOU-ramavtal.',
  },
  {
    title: 'Business Continuity Plan (BCP)',
    category: 'Management',
    status: 'Saknas',
    description: 'Plan för verksamhetskontinuitet vid kris, system-downtime eller nyckelpersonsbortfall.',
  },
]

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    standard: 'ISO 27001',
    description: 'Informationssäkerhetshantering (ISMS). Kräver dokumenterade policyer, riskanalys, incidenthantering och löpande revision.',
    requiredFor: 'Landvex Enterprise-tier — Trafikverket, Försvarsmakten, kommunala upphandlingar',
    status: 'Ej påbörjat',
    responsible: 'Dennis Bjarnemark',
    targetDate: 'Q4 2026',
    color: '#3B82F6',
  },
  {
    standard: 'ISO 9001',
    description: 'Kvalitetsledningssystem. Processdokumentation, kundnöjdhet och löpande förbättring.',
    requiredFor: 'Kommunala upphandlingar (LOU), offentliga ramavtal',
    status: 'Ej påbörjat',
    responsible: 'Dennis Bjarnemark',
    targetDate: 'Q1 2027',
    color: '#10B981',
  },
  {
    standard: 'GDPR Art. 9',
    description: 'Känsliga personuppgifter: biometrisk data (WHOOP-integration), hälsodata, eventuell ansiktsigenkänning i optisk analys.',
    requiredFor: 'Wavult OS (WHOOP), Optical Insight (ansiktsdetektering i Enterprise)',
    status: 'I process',
    responsible: 'Dennis Bjarnemark',
    targetDate: 'Q3 2026',
    color: '#F59E0B',
  },
  {
    standard: 'EU AI Act',
    description: 'Klassificering av Optical Insight-motorn (vision engine / optisk analys). Sannolikt High-Risk (offentlig plats, infrastruktur). Kräver conformity assessment.',
    requiredFor: 'Optical Insight — alla deployments i EU',
    status: 'Ej påbörjat',
    responsible: 'Johan Putte Berglund',
    targetDate: 'Q2 2027',
    color: '#EC4899',
  },
  {
    standard: 'SOC 2 Type II',
    description: 'Trust Services Criteria: Security, Availability, Confidentiality. Krav från US-marknaden för SaaS- och enterprise-kunder.',
    requiredFor: 'Landvex Inc (US) — OI Cloud US, Wavult OS SaaS export',
    status: 'Ej påbörjat',
    responsible: 'Johan Putte Berglund',
    targetDate: 'Q3 2027',
    color: '#8B5CF6',
  },
  {
    standard: 'NIS2-direktivet',
    description: 'EU-direktiv för kritisk infrastruktur. Gäller kunder (hamnar, kommuner, vägar) — och kräver att leverantörer (Wavult) möter deras krav på säkerhet och rapportering.',
    requiredFor: 'Landvex-kunder: hamnoperatörer, kommuner, Trafikverket',
    status: 'I process',
    responsible: 'Dennis Bjarnemark',
    targetDate: 'Q2 2026',
    color: '#EF4444',
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function statusBadge(status: 'Klar' | 'Draft' | 'Saknas') {
  const map: Record<typeof status, { bg: string; text: string; label: string }> = {
    Klar: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', label: '✓ Klar' },
    Draft: { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', label: '~ Draft' },
    Saknas: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: '✗ Saknas' },
  }
  const s = map[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function complianceStatusBadge(status: ComplianceStatus) {
  const map: Record<ComplianceStatus, { bg: string; text: string }> = {
    Certifierat: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400' },
    'I process': { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400' },
    'Ej påbörjat': { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400' },
  }
  const s = map[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${s.bg} ${s.text}`}>
      {status}
    </span>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MissionCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent border border-purple-500/20 p-5">
      <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Wavult Group — Mission</div>
      <p className="text-sm text-gray-900 leading-relaxed font-medium">{WAVULT_MISSION.line1}</p>
      <p className="text-sm text-gray-500 leading-relaxed mt-2">{WAVULT_MISSION.line2}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {['IP-ägande', 'Plattformskontroll', 'Optiskt lager', 'Dubai-holding', 'Global scale'].map(tag => (
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
                <span className="font-bold text-gray-900 text-sm">{pos.product}</span>
                <span className="text-xs italic text-gray-500">"{pos.tagline}"</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{pos.positioning}</p>
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

type CompFilter = 'Alla' | 'quiXzoom' | 'Landvex' | 'Wavult OS'

function CompetitorTable() {
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<CompFilter>('Alla')

  const filters: CompFilter[] = ['Alla', 'quiXzoom', 'Landvex', 'Wavult OS']
  const productColor: Record<string, string> = {
    quiXzoom: '#F59E0B',
    Landvex: '#EC4899',
    'Wavult OS': '#8B5CF6',
  }

  const visible = filter === 'Alla' ? COMPETITORS : COMPETITORS.filter(c => c.product === filter)

  return (
    <div className="flex flex-col gap-3">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
              filter === f
                ? 'border-purple-500/60 bg-purple-500/20 text-purple-300'
                : 'border-white/15 bg-white/5 text-gray-500 hover:text-gray-900 hover:bg-white/8'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {visible.map(comp => (
          <button
            key={comp.name}
            onClick={() => setSelected(selected === comp.name ? null : comp.name)}
            className={`text-left rounded-xl border p-3 transition-all ${
              selected === comp.name
                ? 'border-white/25 bg-white/8'
                : 'border-gray-200 bg-white/5 hover:bg-white/8'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: comp.color === '#000000' ? '#666' : comp.color }}
              />
              <span className="font-semibold text-gray-900 text-sm">{comp.name}</span>
              <span className="text-xs text-gray-500">({comp.category})</span>
              <span
                className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ color: productColor[comp.product] ?? '#aaa', backgroundColor: (productColor[comp.product] ?? '#aaa') + '18' }}
              >
                {comp.product}
              </span>
            </div>
            {selected === comp.name && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <div className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-0.5">Deras svaghet</div>
                  <p className="text-xs text-gray-600">{comp.weakness}</p>
                </div>
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <div className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-0.5">Vår respons</div>
                  <p className="text-xs text-gray-800 italic">{comp.ourResponse}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
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
          <div className="text-xl font-bold" style={{ color: fact.color }}>{fact.stat}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{fact.label}</div>
        </div>
      ))}
    </div>
  )
}

type DocCategory = 'Alla' | 'Investor' | 'Sales' | 'Legal' | 'Management'

function PitchMaterials() {
  const [filter, setFilter] = useState<DocCategory>('Alla')
  const categories: DocCategory[] = ['Alla', 'Investor', 'Sales', 'Legal', 'Management']
  const categoryLabel: Record<string, string> = {
    Investor: '💰 Investor',
    Sales: '🤝 Sales',
    Legal: '⚖️ Legal',
    Management: '📋 Ledningsmanual',
  }

  const visible = filter === 'Alla' ? PITCH_MATERIALS : PITCH_MATERIALS.filter(d => d.category === filter)

  const counts = {
    Klar: PITCH_MATERIALS.filter(d => d.status === 'Klar').length,
    Draft: PITCH_MATERIALS.filter(d => d.status === 'Draft').length,
    Saknas: PITCH_MATERIALS.filter(d => d.status === 'Saknas').length,
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-green-500/25 bg-green-500/8 px-3 py-2 text-center">
          <div className="text-lg font-bold text-green-400">{counts.Klar}</div>
          <div className="text-xs text-gray-500">Klara</div>
        </div>
        <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/8 px-3 py-2 text-center">
          <div className="text-lg font-bold text-yellow-400">{counts.Draft}</div>
          <div className="text-xs text-gray-500">Drafts</div>
        </div>
        <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-center">
          <div className="text-lg font-bold text-red-400">{counts.Saknas}</div>
          <div className="text-xs text-gray-500">Saknas</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
              filter === cat
                ? 'border-purple-500/60 bg-purple-500/20 text-purple-300'
                : 'border-white/15 bg-white/5 text-gray-500 hover:text-gray-900 hover:bg-white/8'
            }`}
          >
            {cat === 'Alla' ? 'Alla' : (categoryLabel[cat] ?? cat)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {visible.map(doc => (
          <div key={doc.title} className="rounded-xl border border-gray-200 bg-white/5 px-4 py-3">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 flex-1">{doc.title}</span>
              {statusBadge(doc.status)}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{doc.description}</p>
            <div className="mt-1.5 text-xs text-gray-500">{categoryLabel[doc.category] ?? doc.category}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComplianceFramework() {
  const [selected, setSelected] = useState<string | null>(null)

  const counts: Record<ComplianceStatus, number> = {
    Certifierat: COMPLIANCE_ITEMS.filter(c => c.status === 'Certifierat').length,
    'I process': COMPLIANCE_ITEMS.filter(c => c.status === 'I process').length,
    'Ej påbörjat': COMPLIANCE_ITEMS.filter(c => c.status === 'Ej påbörjat').length,
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-green-500/25 bg-green-500/8 px-3 py-2 text-center">
          <div className="text-lg font-bold text-green-400">{counts.Certifierat}</div>
          <div className="text-xs text-gray-500">Certifierat</div>
        </div>
        <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/8 px-3 py-2 text-center">
          <div className="text-lg font-bold text-yellow-400">{counts['I process']}</div>
          <div className="text-xs text-gray-500">I process</div>
        </div>
        <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-center">
          <div className="text-lg font-bold text-red-400">{counts['Ej påbörjat']}</div>
          <div className="text-xs text-gray-500">Ej påbörjat</div>
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {COMPLIANCE_ITEMS.map(item => (
          <button
            key={item.standard}
            onClick={() => setSelected(selected === item.standard ? null : item.standard)}
            className={`text-left rounded-xl border p-3 transition-all ${
              selected === item.standard
                ? 'border-white/25 bg-white/8'
                : 'border-gray-200 bg-white/5 hover:bg-white/8'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-bold text-gray-900 text-sm">{item.standard}</span>
              {complianceStatusBadge(item.status)}
              <span className="ml-auto text-xs text-gray-500">{item.targetDate}</span>
            </div>

            {selected === item.standard && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="rounded-lg bg-white/5 border border-gray-200 px-3 py-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Beskrivning</div>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                </div>
                <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 px-3 py-2">
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-0.5">Krävs för</div>
                  <p className="text-xs text-gray-600">{item.requiredFor}</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-purple-500/8 border border-purple-500/20 px-3 py-2">
                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-0.5">Ansvarig</div>
                    <p className="text-xs text-gray-600">{item.responsible}</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-gray-500/8 border border-gray-500/20 px-3 py-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Target</div>
                    <p className="text-xs text-gray-600">{item.targetDate}</p>
                  </div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type BriefTab = 'mission' | 'produkter' | 'konkurrenter' | 'marknad' | 'material' | 'compliance'

export function StrategicBrief() {
  const { t: _t } = useTranslation() // ready for i18n
  const [activeTab, setActiveTab] = useState<BriefTab>('mission')

  const tabs: { id: BriefTab; label: string; icon: string }[] = [
    { id: 'mission', label: 'Mission', icon: '🎯' },
    { id: 'produkter', label: 'Positioning', icon: '🚀' },
    { id: 'konkurrenter', label: 'Konkurrenter', icon: '⚔️' },
    { id: 'marknad', label: 'Marknad', icon: '📊' },
    { id: 'material', label: 'Material', icon: '📁' },
    { id: 'compliance', label: 'Compliance', icon: '🔐' },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-base">🏛️</div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Strategic Brief</h1>
          <p className="text-xs text-gray-500">Mission · Positioning · Konkurrenter · Marknad · Material · Compliance</p>
        </div>
        <div className="ml-auto text-xs text-gray-500 italic hidden sm:block">
          Uppdaterad 2026-03-28
        </div>
      </div>

      {/* Tabs — scrollable on small screens */}
      <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-t-lg font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'text-gray-900 border-purple-500 bg-white/8'
                : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-white/5'
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
        {activeTab === 'material' && <PitchMaterials />}
        {activeTab === 'compliance' && <ComplianceFramework />}
      </div>
    </div>
  )
}
