import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Inline icons (no lucide-react) ──────────────────────────────────────────
function ChevronDown({ size = 13 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}
function ChevronUp({ size = 13 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
}

// ─── People / Team Roster ─────────────────────────────────────────────────────

const TEAM: {
  name: string
  initials: string
  role: string
  title: string
  domain: string
  color: string
  location: string
  focus: string[]
  entity: string
  entity_id: string
  status: 'active' | 'idle' | 'away'
  purpose: string        // Why this role exists
  mandates: string[]     // Core mandates (4–5 bullets)
  kpis: string[]         // What success looks like
  notThisRole: string[]  // What this role does NOT do
  tuckmanPhase: TuckmanPhase
}[] = [
  {
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Chairman & Group CEO',
    title: 'Chairman of the Board & Group CEO',
    domain: 'Strategy, Capital & Governance',
    color: '#8B5CF6',
    location: '🇸🇪 Stockholm',
    focus: ['Thailand workcamp', 'Bolagsstruktur (Dubai/EU/US)', 'GTM-strategi'],
    entity: 'WGH',
    entity_id: 'wavult-group',
    status: 'active',
    purpose: 'Existerar för att definiera och upprätthålla visionen, allokera kapital och säkerställa att hela strukturen rör sig som ett sammanhängande system — inte separata bolag.',
    mandates: [
      'Sätta långsiktig vision (5–10 år) och strategisk riktning',
      'Allokera kapital, resurser och fokus till maximal hävstång',
      'Bygga bolagsstrukturen (Dubai/EU/US) och säkra investerarrelationer',
      'Äga produkt- och systemarkitekturen för hela ekosystemet',
      'Representera Wavult Ecosystem externt',
    ],
    kpis: ['Kapitalflöde optimerat', 'Alla bolag i rörelse mot plan', 'Systemet byggt som planerat'],
    notThisRole: ['Operativ daglig drift', 'Manuell uppgiftshantering', 'Teknisk debug'],
    tuckmanPhase: 'performing',
  },
  {
    name: 'Leon Maurizio Russo De Cerame',
    initials: 'LR',
    role: 'CEO – Operations',
    title: 'CEO – Wavult Operations',
    domain: 'Daglig drift, execution & koordinering',
    color: '#10B981',
    location: '🇸🇪 Sverige',
    focus: ['Drift av hela organisationen', 'Leverans & execution', 'Resursprioritering'],
    entity: 'WOP',
    entity_id: 'wavult-operations',
    status: 'active',
    purpose: 'Omvandlar strategi till faktisk leverans. Är navet mellan alla funktioner och driver ett effektivt, skalbart operativt system.',
    mandates: [
      'Leda den dagliga driften av hela organisationen',
      'Säkerställa att team, resurser och processer är rätt kalibrerade',
      'Driva sälj och kundrelationer som CEO Wavult Operations',
      'Vara länken mellan Erik (strategi) och teamet (execution)',
      'Prioritera och eskalera rätt saker i rätt tid',
    ],
    kpis: ['Leveranskapacitet i team', 'Sälj-pipeline aktiv', 'Drift utan flaskhalsar'],
    notThisRole: ['Bolagsstruktur och juridik', 'Systemarkitektur', 'Finansiell planering'],
    tuckmanPhase: 'norming',
  },
  {
    name: 'Winston Gustav Bjarnemark',
    initials: 'WB',
    role: 'CFO',
    title: 'Chief Financial Officer',
    domain: 'Global ekonomi, budget & kassaflöde',
    color: '#3B82F6',
    location: '🇸🇪 Sverige',
    focus: ['Budget & prognoser', 'Betalningar & kassaflöde', 'Finansiell struktur mellan bolag'],
    entity: 'WOP',
    entity_id: 'wavult-operations',
    status: 'active',
    purpose: 'Säkerställer full kontroll över alla finansiella flöden, optimerar kapitalanvändning och strukturerar ekonomin så att vinster rör sig rätt i systemet.',
    mandates: [
      'Sätta upp hela den ekonomiska infrastrukturen för koncernen',
      'Kontrollera kassaflöde och betalningar över alla bolag',
      'Hantera intercompany-flöden, skattstruktur och rapportering',
      'Koppla ihop ekonomisystem med Hypbit',
      'Debugga och förfina betafärdiga ekonomifunktioner',
    ],
    kpis: ['Bankkonton öppnade per bolag', 'Intercompany-avtal signerade', 'Kassaflöde positivt'],
    notThisRole: ['Operativ drift', 'Produktbeslut', 'Teknikarkitektur'],
    tuckmanPhase: 'forming',
  },
  {
    name: 'Dennis Bjarnemark',
    initials: 'DB',
    role: 'Board / Chief Legal',
    title: 'Board Member & Chief Legal & Operations (Interim)',
    domain: 'Juridik, bolagsstruktur & compliance',
    color: '#F59E0B',
    location: '🇸🇪 Sverige',
    focus: ['Bolagsstruktur (Dubai/EU/US)', 'Avtal & compliance', 'Logistik (tillfälligt)'],
    entity: 'WGH',
    entity_id: 'wavult-group',
    status: 'active',
    purpose: 'Skyddar hela ekosystemets struktur juridiskt och säkerställer att bolagsupplägg, avtal och flöden är hållbara över tid i alla jurisdiktioner.',
    mandates: [
      'Bilda och registrera bolag i Dubai, Litauen, USA och Sverige',
      'Upprätta alla intercompany-avtal (IP-licens, management, service)',
      'Säkerställa compliance per jurisdiktion (GDPR, LOU/LUF, Delaware)',
      'Hålla styrelseprotokoll, fullmakter och bolagshandlingar uppdaterade',
      'Hantera operativ logistik under uppbyggnadsfas (tillfällig)',
    ],
    kpis: ['Bolag registrerade enligt plan', 'Avtal signerade', 'Compliance-status grön'],
    notThisRole: ['Teknik', 'Sälj', 'Finansiell förvaltning'],
    tuckmanPhase: 'norming',
  },
  {
    name: 'Johan Putte Berglund',
    initials: 'JB',
    role: 'Group CTO',
    title: 'Group Chief Technology Officer',
    domain: 'Teknik, infrastruktur & systemarkitektur',
    color: '#06B6D4',
    location: '🇸🇪 Sverige',
    focus: ['Hypbit + produkter', 'Infrastruktur & säkerhet', 'Teknisk roadmap'],
    entity: 'WOP',
    entity_id: 'wavult-operations',
    status: 'active',
    purpose: 'Designar, bygger och skyddar den tekniska ryggraden i hela ekosystemet. Möjliggör snabb utveckling utan teknisk skuld.',
    mandates: [
      'Kontrollera alla konton, API:er och credentials',
      'Debugga och lösa tekniska problem i hela stacken',
      'Hålla koll på uppdateringar, rapporter, felanmälningar, supportärenden',
      'Drifta och stärka befintlig infrastruktur (AWS, Supabase, CF)',
      'Säkerställa att teknik är skalbar, säker och välintegrerad',
    ],
    kpis: ['Infrastruktur stabil', 'Inga kritiska buggar öppna', 'Deploy-pipeline grön'],
    notThisRole: ['Juridik', 'Sälj', 'Finansiell rapportering'],
    tuckmanPhase: 'storming',
  },
]

// ─── Tuckman Team Phases ──────────────────────────────────────────────────────
type TuckmanPhase = 'forming' | 'storming' | 'norming' | 'performing' | 'adjourning'

const TUCKMAN: Record<TuckmanPhase, { label: string; color: string; emoji: string; desc: string }> = {
  forming:    { label: 'Forming',    color: '#6B7280', emoji: '🌱', desc: 'Teamet hittar sin form. Roller och mål klarnar.' },
  storming:   { label: 'Storming',   color: '#F59E0B', emoji: '⚡', desc: 'Spänningar och konflikter — nödvändigt för att växa.' },
  norming:    { label: 'Norming',    color: '#3B82F6', emoji: '🔵', desc: 'Strukturer sätter sig. Samarbetet flödar.' },
  performing: { label: 'Performing', color: '#10B981', emoji: '🚀', desc: 'Fullt leveransläge. Teamet fungerar självständigt.' },
  adjourning: { label: 'Adjourning', color: '#8B5CF6', emoji: '🏁', desc: 'Projektet/fasen avslutas.' },
}

const ENTITY_LABELS: Record<string, { label: string; color: string }> = {
  WGH: { label: 'Wavult Group (Holding / Governance)', color: '#8B5CF6' },
  WOP: { label: 'Wavult Operations (Dubai)', color: '#3B82F6' },
}

const STATUS_COLOR: Record<string, string> = {
  active: '#10B981',
  idle:   '#6B7280',
  away:   '#F59E0B',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktiv',
  idle:   'Inaktiv',
  away:   'Borta',
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

function PersonCard({ person }: { person: typeof TEAM[0] }) {
  const entityInfo = ENTITY_LABELS[person.entity]
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl flex flex-col overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        {/* Top */}
        <div className="flex items-start gap-3">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: person.color + '22', border: `1px solid ${person.color}40`, color: person.color }}
          >
            {person.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{person.name}</span>
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  background: STATUS_COLOR[person.status],
                  boxShadow: person.status === 'active' ? `0 0 5px ${STATUS_COLOR[person.status]}` : 'none',
                }}
              />
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: person.color }}>{person.role}</div>
            <div className="text-xs text-gray-500">{person.domain}</div>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-gray-400">
            {person.location}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: entityInfo.color + '18', color: entityInfo.color, border: `1px solid ${entityInfo.color}30` }}
          >
            {person.entity}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: STATUS_COLOR[person.status] + '15', color: STATUS_COLOR[person.status] }}
          >
            {STATUS_LABEL[person.status]}
          </span>
          {(() => {
            const t = TUCKMAN[person.tuckmanPhase]
            return (
              <span
                title={t.desc}
                className="text-xs px-2 py-0.5 rounded-full font-medium cursor-help"
                style={{ background: t.color + '18', color: t.color, border: `1px solid ${t.color}30` }}
              >
                {t.emoji} {t.label}
              </span>
            )
          })()}
        </div>

        {/* Focus */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">Nuvarande fokus</p>
          <ul className="space-y-1">
            {person.focus.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ background: person.color }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Toggle befattningsbeskrivning */}
        <button
          onClick={() => setExpanded(s => !s)}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors mt-1"
          style={{ color: expanded ? person.color : '#6B7280' }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Dölj befattningsbeskrivning' : 'Visa befattningsbeskrivning'}
        </button>
      </div>

      {/* Expanderbar befattningsbeskrivning */}
      {expanded && (
        <div className="border-t border-surface-border bg-[#070709] p-5 flex flex-col gap-4">
          {/* Syfte */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: person.color }}>
              🔺 Syfte
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">{person.purpose}</p>
          </div>

          {/* Mandat */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: person.color }}>
              🧭 Mandat
            </p>
            <ul className="space-y-1">
              {person.mandates.map((m, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                  <span className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0" style={{ background: person.color }} />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* KPIs */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: person.color }}>
              📊 Framgångsmått
            </p>
            <div className="flex flex-wrap gap-1.5">
              {person.kpis.map((k, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: person.color + '15', color: person.color }}>
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* NOT this role */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-600">
              🚫 Ej denna rolls ansvar
            </p>
            <div className="flex flex-wrap gap-1.5">
              {person.notThisRole.map((n, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-600 line-through">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PeopleView() {
  const { activeEntity, isInScope } = useEntityScope()
  const isRoot = activeEntity.layer === 0

  // Filter team by scope (root sees all)
  const visibleTeam = isRoot
    ? TEAM
    : TEAM.filter(p => isInScope(p.entity_id))

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Teamroster</h1>
        <p className="text-gray-400 mt-1">
          {isRoot
            ? `Wavult Group — ${visibleTeam.length} core members`
            : `Showing people in ${activeEntity.name} — ${visibleTeam.length} members`}
        </p>
        {/* Scope banner */}
        {!isRoot && (
          <div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: activeEntity.color + '15',
              border: `1px solid ${activeEntity.color}30`,
              color: activeEntity.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
            Scoped to: {activeEntity.name}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Totalt team', value: String(visibleTeam.length), color: '#3B82F6' },
          { label: 'Aktiva nu', value: String(visibleTeam.filter(t => t.status === 'active').length), color: '#10B981' },
          { label: 'Enheter', value: String(new Set(visibleTeam.map(t => t.entity)).size), color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl px-5 py-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tuckman Team Phase Overview */}
      <div className="bg-surface-raised border border-surface-border rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team Development Phases (Tuckman)</p>
        <div className="flex gap-1 mb-4">
          {(['forming','storming','norming','performing','adjourning'] as TuckmanPhase[]).map((phase) => {
            const t = TUCKMAN[phase]
            const count = visibleTeam.filter(p => p.tuckmanPhase === phase).length
            const isActive = count > 0
            return (
              <div key={phase} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full h-2 rounded-full transition-all"
                  style={{ background: isActive ? t.color : t.color + '20' }}
                />
                <span className="text-[9px] font-mono" style={{ color: isActive ? t.color : '#374151' }}>
                  {t.emoji} {t.label}
                </span>
                {isActive && (
                  <span className="text-[9px] rounded-full px-1.5" style={{ background: t.color + '20', color: t.color }}>
                    {count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTeam.map(p => {
            const t = TUCKMAN[p.tuckmanPhase]
            return (
              <div key={p.name} className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1"
                style={{ background: t.color + '12', border: `1px solid ${t.color}25` }}>
                <span className="font-bold" style={{ color: p.color }}>{p.initials}</span>
                <span style={{ color: t.color }}>{t.emoji} {t.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team Grid */}
      <div>
        <SectionHeading>Core Team</SectionHeading>
        {visibleTeam.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-3xl mb-3">👤</p>
            <p className="text-sm">No team members in {activeEntity.name}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTeam.map(p => (
              <PersonCard key={p.name} person={p} />
            ))}
          </div>
        )}
      </div>

      {/* Entity legend */}
      <div>
        <SectionHeading>Enheter</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(ENTITY_LABELS).map(([code, info]) => {
            const members = visibleTeam.filter(t => t.entity === code)
            return (
              <div key={code} className="bg-surface-raised border border-surface-border rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold"
                    style={{ background: info.color + '22', color: info.color }}
                  >
                    {code[0]}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: info.color }}>{code}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{info.label}</p>
                <div className="flex -space-x-1.5">
                  {members.map(m => (
                    <div
                      key={m.name}
                      title={m.name}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white border border-surface-base"
                      style={{ background: m.color }}
                    >
                      {m.initials[0]}
                    </div>
                  ))}
                  {members.length === 0 && (
                    <span className="text-xs text-gray-600">Inga tilldelade</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
