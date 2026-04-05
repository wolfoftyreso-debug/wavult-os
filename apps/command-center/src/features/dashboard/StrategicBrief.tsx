// ─── Strategic Brief ─────────────────────────────────────────────────────────
// Kompakt "strategic context card" för Wavult Group
// Uppdaterad: 2026-04-04
//
// DATA-POLICY:
//   - Produktöversikt: statisk (det är den faktiska produktstrategin)
//   - Konkurrenter: statisk (korrekt analys per produkt — aldrig Salesforce/Notion/Monday)
//   - Compliance-status: reaktiv via /v1/qms/entities + /v1/qms/:entitySlug/implementations
//   - Pitch-dokument: tom plats tills qms_documents eller dedikerad endpoint finns
//   - Marknadsstatistik: endast verifierbara fakta (datum, fas, riktning)
//
// TODO: Koppla pitch-dokument mot /v1/qms/:slug/documents när endpoint finns
// TODO: Koppla marknadsdata mot extern datakälla när den sätts upp

import { useState, useEffect } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competitor {
  name: string
  category: string
  product: 'quiXzoom' | 'LandveX'
  weakness: string
  ourResponse: string
  color: string
}

interface WavultProduct {
  name: string
  tagline: string
  phase: string
  launch: string
  model: string
  status: 'active' | 'planned'
  color: string
  emoji: string
}

interface QmsEntity {
  id: string
  name: string
  slug: string
  stats?: {
    not_started: number
    in_progress: number
    implemented: number
    verified: number
    not_applicable: number
  }
}

// ─── Static product data — factual product strategy ──────────────────────────

const WAVULT_PRODUCTS: WavultProduct[] = [
  {
    name: 'quiXzoom',
    tagline: 'Last Mile Intelligence Capture',
    phase: 'Fas 1 — aktiv',
    launch: 'Sverige Q2 2026',
    model: 'Zoomers tar bilduppdrag → Quixom Ads monetiserar datan',
    status: 'active',
    color: '#F59E0B',
    emoji: '📸',
  },
  {
    name: 'Quixom Ads',
    tagline: 'B2B dataplattform',
    phase: 'Fas 2',
    launch: 'Efter quiXzoom-databasen är etablerad',
    model: 'Leads och hyperlokal annonsering baserat på bilddata',
    status: 'planned',
    color: '#10B981',
    emoji: '📡',
  },
  {
    name: 'LandveX / Optical Insight',
    tagline: 'Right control. Right cost. Right interval.',
    phase: 'Fas 3 — enterprise',
    launch: 'Sverige → Nederländerna Q1 2027',
    model: 'Larm, händelserapporter och analysabonnemang till kommuner/Trafikverket',
    status: 'planned',
    color: '#EC4899',
    emoji: '🏗️',
  },
]

// ─── Static competitor data — correct per product ────────────────────────────
// quiXzoom: bilddata / crowdsourced capture
// LandveX: kommunal infrastrukturövervakning
// Wavult OS säljs EJ externt — inga konkurrenter att lista

const COMPETITORS: Competitor[] = [
  // ── quiXzoom
  {
    name: 'Getty Images / Shutterstock',
    category: 'Bildbank',
    product: 'quiXzoom',
    weakness:
      'Statisk bildbank — ingen crowdsourced capture, inget realtidsnätverk. ' +
      'Bilderna är gamla, generiska och säljs per licens, inte som dataintelligens.',
    ourResponse:
      '"De säljer bilder. Vi bygger ett levande capture-nätverk. Det är skillnaden mellan ett foto och ett sensorsystem."',
    color: '#CC0000',
  },
  {
    name: 'Mapillary',
    category: 'Geospatial Capture',
    product: 'quiXzoom',
    weakness:
      'B2B-only, ingen supply-side inkomst för individen. Primärt ett kartverktyg — ' +
      'inget Quixom Ads-lager, ingen lead/annonsmonetisering. Drivs av Meta.',
    ourResponse:
      '"Mapillary betalar dig inte. quiXzoom gör det — och bygger en dataplattform ovanpå."',
    color: '#1877F2',
  },
  {
    name: 'Google Street View',
    category: 'Geospatial Mapping',
    product: 'quiXzoom',
    weakness:
      'Statisk, ej realtid, ej crowdsourcad mot betalning. Kan inte täcka skärgård, ' +
      'privat mark eller event på beställning. Uppdateras månader till år efter verkligheten.',
    ourResponse:
      '"Street View är en ögonblicksbild. quiXzoom är on-demand capture."',
    color: '#4285F4',
  },
  // ── LandveX
  {
    name: 'Manuell inspektion (kommuner)',
    category: 'Traditionell tillsyn',
    product: 'LandveX',
    weakness:
      'Hög kostnad, låg frekvens, subjektivitet och mänskliga fel. Ingen realtidslarm, ' +
      'ingen automatiserad rapportering. Kommuner betalar för inspektion oavsett om något händer.',
    ourResponse:
      '"LandveX kontrollerar bara när det är värt det — right control, right cost, right interval."',
    color: '#6B7280',
  },
  {
    name: 'Traditionella CCTV-system',
    category: 'Kamerainfrastruktur',
    product: 'LandveX',
    weakness:
      'Passiv inspelning utan analys. Kräver personal att övervaka. Ingen automatiserad ' +
      'händelsedetektering, ingen kommunal rapportmodell. Kunden måste tolka råvideo själv.',
    ourResponse:
      '"CCTV spelar in. LandveX rapporterar — proaktivt, automatiserat, direkt till beställaren."',
    color: '#374151',
  },
  {
    name: 'Excel-baserade tillsynsrapporter',
    category: 'Manuell rapportering',
    product: 'LandveX',
    weakness:
      'Ingen realtidsdata, ingen historik-analys, inget larm. Fullt manuell process — ' +
      'en tjänsteperson skriver in observationer i ett kalkylblad. Skalbarhet noll.',
    ourResponse:
      '"Excel är ett verktyg, inte ett system. LandveX är infrastruktur."',
    color: '#059669',
  },
]

// ─── Mission text (static — detta är Wavults faktiska mission) ───────────────

const WAVULT_MISSION = {
  line1:
    'Wavult Group bygger nästa generations operativa infrastruktur — system som inte bara stödjer verksamheter utan driver dem.',
  line2: 'Vi äger IP:t. Vi styr plattformen. Vi möjliggör intelligensen.',
}

// ─── Hook: QMS compliance data från backend ───────────────────────────────────
// Hämtar från /v1/qms/entities — varje entity är ett ISO/compliance-ramverk
// TODO: Filtrera på entity-typ när det finns fler entiteter (wavult-os specifik)

function useQmsEntities() {
  const [entities, setEntities] = useState<QmsEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    fetch(`${API_BASE}/v1/qms/entities`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: QmsEntity[]) => {
        setEntities(data ?? [])
        setError(null)
      })
      .catch(err => {
        console.error('[StrategicBrief] QMS entities fetch failed:', err)
        setError('Kunde inte hämta compliance-data')
        setEntities([])
      })
      .finally(() => { clearTimeout(t); setLoading(false) })
    return () => { controller.abort(); clearTimeout(t) }
  }, [])

  return { entities, loading, error }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MissionCard() {
  return (
    <div>
      <div
        className="rounded-xl mb-4 flex items-center gap-3 px-4"
        style={{
          height: 56,
          background: 'linear-gradient(90deg, #F5F0E8 0%, #EDE8DC 100%)',
          border: '1px solid #DDD5C5',
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: 18 }}>🗺️</span>
        <span style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: '#6B5B45',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Primary market: Stockholm Archipelago · Launch Q2 2026
        </span>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #EEF3FA 0%, #F5F0E8 100%)',
          border: '1px solid #C5D3E8',
        }}
      >
        <div
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: '#0A3D62' }}
        >
          Wavult Group — Mission
        </div>
        <p style={{ fontSize: 14, color: '#1A2B3C', lineHeight: 1.65, fontWeight: 500 }}>
          {WAVULT_MISSION.line1}
        </p>
        <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.65, marginTop: 8 }}>
          {WAVULT_MISSION.line2}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['IP-ägande', 'Plattformskontroll', 'Optiskt lager', 'Supply-first', 'Global scale'].map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full border font-medium"
              style={{ borderColor: '#0A3D6240', color: '#0A3D62', background: '#0A3D6210' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {WAVULT_PRODUCTS.map(product => (
        <div
          key={product.name}
          className="rounded-xl border p-4"
          style={{
            borderColor: product.color + '33',
            backgroundColor: product.status === 'active' ? product.color + '0C' : '#F5F0E8',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: product.color + '22' }}
            >
              {product.emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 700, color: '#1A2B3C', fontSize: 15 }}>{product.name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full border font-semibold"
                  style={
                    product.status === 'active'
                      ? { borderColor: '#059669', background: '#D1FAE5', color: '#065F46' }
                      : { borderColor: '#E8B84B55', background: '#FEF9EC', color: '#92400E' }
                  }
                >
                  {product.phase}
                </span>
              </div>
              <p style={{ fontSize: 12, fontStyle: 'italic', color: '#4A5568', marginTop: 2 }}>
                "{product.tagline}"
              </p>
              <p style={{ fontSize: 12, color: '#4A5568', marginTop: 6, lineHeight: 1.6 }}>
                {product.model}
              </p>
              <div
                className="mt-2 text-xs rounded px-2 py-1 border"
                style={{ borderColor: product.color + '33', background: product.color + '0C', color: product.color }}
              >
                🚀 Launch: {product.launch}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Wavult OS note */}
      <div
        className="rounded-xl border p-4 mt-1"
        style={{ borderColor: '#0A3D6222', background: '#EEF3FA' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: 18 }}>🧠</span>
          <span style={{ fontWeight: 700, color: '#0A3D62', fontSize: 14 }}>Wavult OS</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full border font-semibold"
            style={{ borderColor: '#0A3D6244', background: '#0A3D6215', color: '#0A3D62' }}
          >
            Internt operativsystem
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#4A5568', lineHeight: 1.6 }}>
          Wavult OS är substrat — det system som driver quiXzoom, LandveX och Quixom Ads internt. Det säljs inte externt. Det är vår operativa fördel, inte en produkt.
        </p>
      </div>
    </div>
  )
}

type CompFilter = 'Alla' | 'quiXzoom' | 'LandveX'

function CompetitorTable() {
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<CompFilter>('Alla')

  const filters: CompFilter[] = ['Alla', 'quiXzoom', 'LandveX']
  const productColor: Record<string, string> = {
    quiXzoom: '#F59E0B',
    LandveX: '#EC4899',
  }

  const visible = filter === 'Alla' ? COMPETITORS : COMPETITORS.filter(c => c.product === filter)

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-lg p-3 text-xs"
        style={{ background: '#FEF9EC', border: '1px solid #E8B84B55', color: '#92400E' }}
      >
        ⚠️ Konkurrentanalys är segmenterad per produkt. Wavult OS har inga externa konkurrenter — det säljs inte.
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
            style={
              filter === f
                ? { borderColor: '#0A3D62', background: '#0A3D6218', color: '#0A3D62' }
                : { borderColor: '#DDD5C5', color: '#6B5B45' }
            }
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
            className="text-left rounded-xl border p-3 transition-all"
            style={{
              borderColor: selected === comp.name ? '#DDD5C5' : '#EDE8DC',
              background: selected === comp.name ? '#F0EBE1' : '#FDFAF6',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: comp.color }}
              />
              <span style={{ fontWeight: 600, color: '#1A2B3C', fontSize: 14 }}>{comp.name}</span>
              <span style={{ fontSize: 12, color: '#6B5B45' }}>({comp.category})</span>
              <span
                className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium"
                style={{
                  color: productColor[comp.product] ?? '#888',
                  background: (productColor[comp.product] ?? '#888') + '18',
                }}
              >
                {comp.product}
              </span>
            </div>
            {selected === comp.name && (
              <div className="mt-3 flex flex-col gap-2">
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: '#FEE2E2', border: '1px solid #FCA5A533' }}
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                    style={{ color: '#991B1B' }}
                  >
                    Deras svaghet
                  </div>
                  <p style={{ fontSize: 12, color: '#374151' }}>{comp.weakness}</p>
                </div>
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: '#D1FAE5', border: '1px solid #6EE7B733' }}
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                    style={{ color: '#065F46' }}
                  >
                    Vår respons
                  </div>
                  <p className="text-xs italic" style={{ color: '#1A2B3C' }}>{comp.ourResponse}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function MarketOverview() {
  // Verifierbara fakta om marknad och timing — inga spekulativa $ TAM-siffror
  const facts = [
    {
      stat: 'Q2 2026',
      label: 'quiXzoom-lansering Sverige — Stockholm Archipelago som startmarknad',
      color: '#F59E0B',
    },
    {
      stat: 'Q1 2027',
      label: 'quiXzoom expansion — Nederländerna (marknad 2)',
      color: '#F59E0B',
    },
    {
      stat: 'Fas 2',
      label: 'Quixom Ads aktiveras när quiXzoom-databasen är etablerad',
      color: '#10B981',
    },
    {
      stat: 'Fas 3',
      label: 'LandveX / Optical Insight — enterprise B2G/B2B, kommuner & Trafikverket',
      color: '#EC4899',
    },
    {
      stat: 'NIS2',
      label: 'EU-direktiv driver kommuner & hamnar till obligatorisk infrastrukturövervakning',
      color: '#EC4899',
    },
    {
      stat: 'Supply-first',
      label: 'Moat = det distribuerade capture-nätverket. Zoomers samlar data → Quixom Ads monetiserar → LandveX konsumerar.',
      color: '#0A3D62',
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-lg p-3 text-xs"
        style={{ background: '#EEF3FA', border: '1px solid #C5D3E8', color: '#0A3D62' }}
      >
        ℹ️ Marknadsdata visar verifierade strategiska fakta. TAM-siffror och marknadsanalys kopplas mot datakälla när den är konfigurerad.
      </div>
      <div className="grid grid-cols-2 gap-3">
        {facts.map(fact => (
          <div
            key={fact.label}
            className="rounded-xl border p-3 text-center"
            style={{ borderColor: fact.color + '33', backgroundColor: fact.color + '08' }}
          >
            <div className="text-xl font-bold" style={{ color: fact.color }}>{fact.stat}</div>
            <div style={{ fontSize: 12, color: '#4A5568', marginTop: 2, lineHeight: 1.4 }}>
              {fact.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PitchMaterials() {
  // TODO: Koppla mot /v1/qms/:slug/documents eller dedikerad pitch-endpoint
  // Tabellen qms_documents finns inte ännu i databasen

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl p-5 text-center flex flex-col items-center gap-3"
        style={{ background: '#F5F0E8', border: '1px solid #DDD5C5' }}
      >
        <div style={{ fontSize: 32 }}>📁</div>
        <div style={{ fontWeight: 600, color: '#1A2B3C', fontSize: 15 }}>
          Pitch-material
        </div>
        <p style={{ fontSize: 13, color: '#6B5B45', lineHeight: 1.6, maxWidth: 360 }}>
          Pitch-dokument och ledningsmanual hanteras inte här ännu. Lägg till dem via admin när <code style={{ fontSize: 11, background: '#EDE8DC', padding: '1px 4px', borderRadius: 3 }}>qms_documents</code>-tabellen är konfigurerad.
        </p>
        <div
          className="text-xs rounded-lg px-4 py-2 border"
          style={{ borderColor: '#E8B84B55', background: '#FEF9EC', color: '#92400E' }}
        >
          Planerade kategorier: Investor · Sales · Legal · Ledningsmanual
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
        TODO: Koppla mot <code>/v1/qms/:slug/documents</code> när endpoint finns
      </div>
    </div>
  )
}

function ComplianceFramework() {
  const { entities, loading, error } = useQmsEntities()
  const [selected, setSelected] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div style={{ fontSize: 13, color: '#6B5B45' }}>Hämtar compliance-data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: '#FEE2E2', border: '1px solid #FCA5A533' }}
      >
        <div style={{ fontWeight: 600, color: '#991B1B', fontSize: 13, marginBottom: 4 }}>
          Kunde inte hämta compliance-data
        </div>
        <p style={{ fontSize: 12, color: '#374151' }}>{error}</p>
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div
        className="rounded-xl p-5 text-center flex flex-col items-center gap-3"
        style={{ background: '#F5F0E8', border: '1px solid #DDD5C5' }}
      >
        <div style={{ fontSize: 32 }}>🔐</div>
        <div style={{ fontWeight: 600, color: '#1A2B3C', fontSize: 15 }}>
          Inga compliance-entiteter registrerade
        </div>
        <p style={{ fontSize: 13, color: '#6B5B45', lineHeight: 1.6, maxWidth: 360 }}>
          Skapa QMS-entiteter (ISO 27001, ISO 9001, GDPR, NIS2) via admin för att spåra compliance-status här.
        </p>
        <a
          href="/qms"
          className="text-xs font-medium rounded-lg px-4 py-2 border transition-all"
          style={{ borderColor: '#0A3D6244', background: '#0A3D6212', color: '#0A3D62' }}
        >
          Öppna QMS →
        </a>
      </div>
    )
  }

  const statusColor = {
    not_started: '#EF4444',
    in_progress: '#F59E0B',
    implemented: '#10B981',
    verified: '#059669',
    not_applicable: '#9CA3AF',
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {entities.map(entity => {
          const stats = entity.stats
          const total = stats
            ? stats.not_started + stats.in_progress + stats.implemented + stats.verified + stats.not_applicable
            : 0
          const done = stats ? stats.implemented + stats.verified : 0
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <button
              key={entity.id}
              onClick={() => setSelected(selected === entity.id ? null : entity.id)}
              className="text-left rounded-xl border p-3 transition-all"
              style={{
                borderColor: selected === entity.id ? '#DDD5C5' : '#EDE8DC',
                background: selected === entity.id ? '#F0EBE1' : '#FDFAF6',
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 700, color: '#1A2B3C', fontSize: 14 }}>{entity.name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full border font-semibold ml-auto"
                  style={
                    pct >= 80
                      ? { borderColor: '#059669', background: '#D1FAE5', color: '#065F46' }
                      : pct >= 40
                      ? { borderColor: '#E8B84B55', background: '#FEF9EC', color: '#92400E' }
                      : { borderColor: '#FCA5A533', background: '#FEE2E2', color: '#991B1B' }
                  }
                >
                  {pct}% klar
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="mt-2 rounded-full overflow-hidden"
                style={{ height: 4, background: '#EDE8DC' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 80 ? '#059669' : pct >= 40 ? '#E8B84B' : '#EF4444',
                  }}
                />
              </div>

              {selected === entity.id && stats && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { key: 'not_started', label: 'Ej påbörjat', count: stats.not_started },
                    { key: 'in_progress', label: 'Pågår', count: stats.in_progress },
                    { key: 'implemented', label: 'Implementerat', count: stats.implemented },
                    { key: 'verified', label: 'Verifierat', count: stats.verified },
                    { key: 'not_applicable', label: 'Ej tillämpligt', count: stats.not_applicable },
                  ].map(s => (
                    <div
                      key={s.key}
                      className="rounded-lg px-2 py-1.5 text-center"
                      style={{ background: statusColor[s.key as keyof typeof statusColor] + '15', border: `1px solid ${statusColor[s.key as keyof typeof statusColor]}33` }}
                    >
                      <div
                        className="text-base font-bold"
                        style={{ color: statusColor[s.key as keyof typeof statusColor] }}
                      >
                        {s.count}
                      </div>
                      <div style={{ fontSize: 10, color: '#4A5568' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <a
        href="/qms"
        className="text-xs font-medium rounded-lg px-4 py-2 border text-center transition-all"
        style={{ borderColor: '#0A3D6244', background: '#0A3D6212', color: '#0A3D62' }}
      >
        Hantera compliance i QMS →
      </a>
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
    { id: 'produkter', label: 'Produkter', icon: '🚀' },
    { id: 'konkurrenter', label: 'Konkurrenter', icon: '⚔️' },
    { id: 'marknad', label: 'Marknad', icon: '📊' },
    { id: 'material', label: 'Material', icon: '📁' },
    { id: 'compliance', label: 'Compliance', icon: '🔐' },
  ]

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: '#F5F0E8', color: '#1A2B3C' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 md:px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: '#DDD5C5', background: '#F5F0E8' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
          style={{ background: '#0A3D6218' }}
        >
          🏛️
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0A3D62' }}>Strategic Brief</h1>
          <p style={{ fontSize: 12, color: '#6B5B45' }}>Mission · Produkter · Konkurrenter · Marknad · Material · Compliance</p>
        </div>
        <div
          className="hidden sm:block ml-auto"
          style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}
        >
          Wavult Group — internt dokument
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0 overflow-x-auto"
        style={{ background: '#F5F0E8' }}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-t-lg font-medium border-b-2 transition-all whitespace-nowrap"
            style={
              activeTab === t.id
                ? { color: '#0A3D62', borderColor: '#0A3D62' }
                : { color: '#6B5B45', borderColor: 'transparent' }
            }
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="h-px flex-shrink-0" style={{ background: '#DDD5C5' }} />

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {activeTab === 'mission' && <MissionCard />}
        {activeTab === 'produkter' && <ProductsGrid />}
        {activeTab === 'konkurrenter' && <CompetitorTable />}
        {activeTab === 'marknad' && <MarketOverview />}
        {activeTab === 'material' && <PitchMaterials />}
        {activeTab === 'compliance' && <ComplianceFramework />}
      </div>
    </div>
  )
}
