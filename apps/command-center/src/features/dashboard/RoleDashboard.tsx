import { IllustrationModule } from '../../shared/ui/IllustrationModule'
import { useState } from 'react'
import { useRole } from '../../shared/auth/RoleContext'
import { CommandDashboard } from './CommandDashboard'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useTranslation } from '../../shared/i18n/useTranslation'
import { useVisaAlerts } from '../visa/useVisaAlerts'
// Corp entities — statisk data, ingen Supabase
const STATIC_CORP_ENTITIES = [
  { id: '1', name: 'Wavult Group Holding DMCC',         short_name: 'WGH',  jurisdiction: 'UAE (DIFC)',     status: 'aktiv',    flag: '🇦🇪', color: '#E8B84B' },
  { id: '2', name: 'Wavult Operations Holding AB',      short_name: 'WOH',  jurisdiction: 'Sverige',        status: 'aktiv',    flag: '🇸🇪', color: '#0A3D62' },
  { id: '3', name: 'Optical Zoom UAB',                  short_name: 'OZ-LT', jurisdiction: 'Litauen',       status: 'aktiv',    flag: '🇱🇹', color: '#2D7A4F' },
  { id: '4', name: 'Optical Zoom Inc',                  short_name: 'OZ-US', jurisdiction: 'Delaware, USA', status: 'aktiv',    flag: '🇺🇸', color: '#2C6EA6' },
  { id: '5', name: 'LandveX AC',                        short_name: 'LVX-AE', jurisdiction: 'UAE (DIFC)',   status: 'forming',  flag: '🇦🇪', color: '#C9A84C' },
  { id: '6', name: 'LandveX Inc',                       short_name: 'LVX-US', jurisdiction: 'Texas, USA',   status: 'forming',  flag: '🇺🇸', color: '#4A7A5B' },
]

// ─── InfoDrawer ────────────────────────────────────────────────────────────────
function InfoDrawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-[var(--color-surface)] shadow-floating border-l border-[var(--color-border)] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────
function Breadcrumbs({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-4">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="opacity-40">/</span>}
          {c.href
            ? <a href={c.href} className="hover:text-[var(--color-text-primary)] transition-colors">{c.label}</a>
            : <span className={i === crumbs.length - 1 ? 'text-[var(--color-text-primary)] font-medium' : ''}>{c.label}</span>
          }
        </span>
      ))}
    </nav>
  )
}

// ─── Help banner for first-time users ────────────────────────────────────────
function WelcomeBanner() {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('wavult-banner-dismissed'))
  if (dismissed) return null
  return (
    <div className="mb-6 rounded-xl p-4 flex items-start gap-3 reveal card-interactive" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: "3px solid var(--color-accent)" }}>
      <span className="text-xl flex-shrink-0">👋</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>{t('dashboard.welcome.title')}</p>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Det här är ert operativsystem. Alla moduler i vänstermenyn har ett <strong style={{ color: "var(--color-text-primary)" }}>?</strong>-märke — klicka på det för att förstå vad en flik eller funktion gör. Byt bolag med <strong style={{ color: "var(--color-text-primary)" }}>väljaren uppe till vänster</strong>.
        </p>
      </div>
      <button
        onClick={() => { localStorage.setItem('wavult-banner-dismissed', '1'); setDismissed(true) }}
        style={{ color: "var(--color-text-tertiary)", flexShrink: 0, fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Visa Alert Banner ─────────────────────────────────────────────────────────
function VisaAlertBanner() {
  const alerts = useVisaAlerts()
  const critical = alerts.filter(a => a.severity === 'critical')
  const warning  = alerts.filter(a => a.severity === 'warning')
  if (alerts.length === 0) return null
  const top = critical[0] ?? warning[0] ?? alerts[0]
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium mb-1 reveal card-interactive"
      style={{
        background: top.severity === 'critical' ? '#7f1d1d22' : '#78350f18',
        border: `1px solid ${top.severity === 'critical' ? '#ef444430' : '#92400e40'}`,
      }}
    >
      <span style={{ fontSize: 15 }}>🛂</span>
      <span style={{ color: top.severity === 'critical' ? '#b91c1c' : '#92400e' }}>
        {top.person}: {top.message}
        {alerts.length > 1 && ` (+${alerts.length - 1} till)`}
      </span>
      <a href="/visa" className="ml-auto text-blue-400 hover:text-blue-300 transition-colors">Visa detaljer →</a>
    </div>
  )
}

// ─── Entity-specific data for CEO dashboard ────────────────────────────────────
const CEO_ENTITY_DATA: Record<string, {
  strategicPriorities: { text: string; status: string }[]
  capitalItems: { text: string; status: string }[]
  marketPhase: string
  marketNote: string
  teamSize: number
}> = {
  'all': {
    strategicPriorities: [
      { text: 'Thailand workcamp', status: 'active' },
      { text: 'Bolagsstruktur Dubai', status: 'planned' },
      { text: 'quiXzoom MVP launch', status: 'in-progress' },
      { text: 'Landvex enterprise launch - Q3 2026', status: 'planned' },
      { text: 'Texas LLC incorporation', status: 'planned' },
    ],
    capitalItems: [
      { text: 'Wavult Operations', status: 'active' },
      { text: 'quiXzoom - MVP build', status: 'active' },
      { text: 'Landvex - enterprise infrastruktur', status: 'planned' },
      { text: 'Quixom Ads - fas 2', status: 'planned' },
    ],
    marketPhase: 'Q2',
    marketNote: 'Thailand workcamp - 11 april',
    teamSize: 5,
  },
  '1': {
    strategicPriorities: [
      { text: 'DMCC License Renewal', status: 'active' },
      { text: 'UAE Corporate Tax', status: 'planned' },
      { text: 'Holdingstruktur optimering', status: 'planned' },
      { text: 'Dubai banking setup', status: 'in-progress' },
    ],
    capitalItems: [
      { text: 'Kapitalstruktur gruppen', status: 'active' },
      { text: 'Internlån till dotterbolag', status: 'active' },
    ],
    marketPhase: 'AE',
    marketNote: 'UAE DMCC fritt handelszon',
    teamSize: 2,
  },
  '2': {
    strategicPriorities: [
      { text: 'Årsredovisning 2025', status: 'planned' },
      { text: 'Momsdeklaration Q1', status: 'active' },
      { text: 'quiXzoom Sverige-lansering juni', status: 'in-progress' },
    ],
    capitalItems: [
      { text: 'quiXzoom Sverige ops', status: 'active' },
      { text: 'Marketing Sverige', status: 'planned' },
    ],
    marketPhase: 'SE',
    marketNote: 'Sverige, mitten juni 2026',
    teamSize: 5,
  },
  '3': {
    strategicPriorities: [
      { text: 'UAB registrering klar', status: 'done' },
      { text: 'Litauisk bankkonto', status: 'in-progress' },
      { text: 'EU-expansion prep', status: 'planned' },
    ],
    capitalItems: [
      { text: 'EU tech-hub', status: 'active' },
    ],
    marketPhase: 'EU',
    marketNote: 'Litauen — EU-bas',
    teamSize: 2,
  },
  '4': {
    strategicPriorities: [
      { text: 'Delaware franchise tax', status: 'planned' },
      { text: 'Federal corporate tax', status: 'planned' },
      { text: 'US market prep', status: 'planned' },
    ],
    capitalItems: [
      { text: 'US market entry', status: 'planned' },
    ],
    marketPhase: 'US',
    marketNote: 'Delaware Inc — US-bas',
    teamSize: 1,
  },
  '5': {
    strategicPriorities: [
      { text: 'LandveX DIFC setup', status: 'in-progress' },
      { text: 'Enterprise sales UAE', status: 'planned' },
      { text: 'Infrastrukturintelligens demo', status: 'planned' },
    ],
    capitalItems: [
      { text: 'LandveX UAE launch', status: 'planned' },
    ],
    marketPhase: 'AE',
    marketNote: 'UAE DIFC — LandveX',
    teamSize: 2,
  },
  '6': {
    strategicPriorities: [
      { text: 'Texas LLC formation klar', status: 'done' },
      { text: 'EIN filing', status: 'in-progress' },
      { text: 'US infrastrukturmarknad', status: 'planned' },
    ],
    capitalItems: [
      { text: 'LandveX USA launch', status: 'planned' },
    ],
    marketPhase: 'TX',
    marketNote: 'Texas LLC — LandveX US',
    teamSize: 1,
  },
}

// ─── CEO Dashboard — Earth & Stone ────────────────────────────────────────────
function CeoDashboard() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const { t } = useTranslation()
  const isRoot = activeEntity.layer === 0

  // Filtrera bolag baserat på activeEntity
  const relevantEntities = isRoot
    ? STATIC_CORP_ENTITIES
    : STATIC_CORP_ENTITIES.filter(e =>
        e.id === activeEntity.id ||
        scopedEntities.some((se: { id: string }) => se.id === e.id)
      )

  const activeCount = relevantEntities.filter(e => e.status === 'aktiv').length

  // Entity-specifik data med fallback till group
  const entityKey = isRoot ? 'all' : activeEntity.id
  const entityData = CEO_ENTITY_DATA[entityKey] ?? CEO_ENTITY_DATA['all']

  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null)

  const teamMembers = [
    { name: 'Erik Svensson', role: 'Chairman & Group CEO' },
    { name: 'Johan Berglund', role: 'Group CTO' },
    { name: 'Winston Bjarnemark', role: 'CFO' },
    { name: 'Dennis Bjarnemark', role: 'Chief Legal & Operations (Interim)' },
    { name: 'Leon Russo De Cerame', role: 'CEO Wavult Operations' },
  ]

  const openDrawer = (title: string, content: React.ReactNode) => setDrawer({ title, content })
  const closeDrawer = () => setDrawer(null)

  const tStatus = (status: string) => t(STATUS_LABEL_KEYS[status] ?? 'dashboard.status.active') || (STATUS_LABELS[status] ?? status)

  const statusBadgeStyle = (status: string) => ({
    background: (STATUS_COLORS[status] ?? '#8A8278') + '18',
    color: STATUS_COLORS[status] ?? '#8A8278',
    border: `1px solid ${(STATUS_COLORS[status] ?? '#8A8278')}30`,
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 9999,
    fontWeight: 600,
  })

  const headingLabel = isRoot
    ? t('dashboard.ceo.overview')
    : `${activeEntity.name.toUpperCase()} — OPERATIV ÖVERBLICK`

  return (
    <div className="space-y-8 max-w-6xl">
      <Breadcrumbs crumbs={[{ label: 'Wavult OS', href: '/' }, { label: 'Dashboard' }, { label: isRoot ? 'Group CEO' : activeEntity.name }]} />
      <VisaAlertBanner />
      <WelcomeBanner />

      {/* GROUP CEO / Entity Strategisk överblick (ID: G-01) */}
      <div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>G-01</span>
        </div>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{headingLabel}</h1>
      </div>

      {/* 4 overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aktiva Bolag — reactive */}
        <button
          className="card card-interactive p-5 text-left"
          onClick={() => openDrawer('Aktiva Bolag', (
            <div className="space-y-3">
              {relevantEntities.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{e.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{e.jurisdiction}</div>
                  </div>
                  <span style={statusBadgeStyle(e.status === 'aktiv' ? 'active' : 'planned')}>
                    {tStatus(e.status === 'aktiv' ? 'active' : 'planned')}
                  </span>
                </div>
              ))}
            </div>
          ))}
        >
          <div className="label-xs mb-2">C-01 · AKTIVA BOLAG</div>
          <div className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            {activeCount}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-2">
            {isRoot ? 'WGH, WOH, OZ UAB, OZ Inc, LVX AC, LVX Inc' : activeEntity.name}
          </div>
        </button>

        {/* Team Online */}
        <button
          className="card card-interactive p-5 text-left"
          onClick={() => openDrawer('Team Online', (
            <div className="space-y-3">
              {teamMembers.slice(0, entityData.teamSize).map(m => (
                <div key={m.name} className="flex items-start gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="mt-1 h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{m.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        >
          <div className="label-xs mb-2">K-02 · TEAM ONLINE</div>
          <div className="text-3xl font-bold text-[var(--color-text-primary)]">{entityData.teamSize}</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-2">
            {isRoot ? 'Alla kärnroller bemannade' : `${entityData.teamSize} person${entityData.teamSize !== 1 ? 'er' : ''} tilldelade`}
          </div>
        </button>

        {/* Kapital Allokerat */}
        <button
          className="card card-interactive p-5 text-left"
          onClick={() => openDrawer('Kapital Allokerat', (
            <div className="space-y-3">
              {entityData.capitalItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-sm text-[var(--color-text-secondary)]">{item.text}</span>
                  <span style={statusBadgeStyle(item.status)}>{tStatus(item.status)}</span>
                </div>
              ))}
            </div>
          ))}
        >
          <div className="label-xs mb-2">P-03 · KAPITAL ALLOKERAT</div>
          <div className="text-3xl font-bold text-[var(--color-text-primary)]">
            {entityData.capitalItems.filter(i => i.status === 'active').length}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-2">
            {entityData.capitalItems.filter(i => i.status === 'active').length} aktiva allokeringar
          </div>
        </button>

        {/* Marknadsfas */}
        <button
          className="card card-interactive p-5 text-left"
          onClick={() => openDrawer('Marknadsfas', (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Marknadsfas</div>
                <p className="text-sm text-[var(--color-text-secondary)]">{entityData.marketNote}</p>
              </div>
              {isRoot && (
                <>
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Thailand Workcamp</div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      <strong className="text-[var(--color-text-primary)]">11 april 2026</strong> — Vecka 1: teambuilding + utbildning. Sedan: projekten sätts upp redo att rulla ut.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Nästa marknader</div>
                    <p className="text-sm text-[var(--color-text-secondary)]">UAE (Dubai), USA (Texas), Litauen — bolagsstruktur under etablering.</p>
                  </div>
                </>
              )}
            </div>
          ))}
        >
          <div className="label-xs mb-2">M-04 · MARKNADSFAS</div>
          <div className="text-3xl font-bold text-[var(--color-text-primary)]">{entityData.marketPhase}</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-2">{entityData.marketNote}</div>
        </button>
      </div>

      {/* Strategiska prioriteringar (ID: S-01) + Kapitalallokering (ID: A-01) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableEarthSection
          id="S-01"
          title={t('dashboard.ceo.strategicPriorities')}
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ ...statusBadgeStyle(item.status) }}>{tStatus(item.status)}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {item.status === 'in-progress' ? t('dashboard.ceo.statusDesc.inProgress') : item.status === 'active' ? t('dashboard.ceo.statusDesc.active') : t('dashboard.ceo.statusDesc.other')}
              </p>
            </div>
          ))}
          items={entityData.strategicPriorities}
        />
        <ClickableEarthSection
          id="A-01"
          title={t('dashboard.ceo.capitalAllocation')}
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ ...statusBadgeStyle(item.status) }}>{tStatus(item.status)}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t('dashboard.ceo.capitalDesc', { name: item.text.toLowerCase() })}
              </p>
            </div>
          ))}
          items={entityData.capitalItems}
        />
      </div>

      {/* Beslutslogg (ID: L-01) */}
      <ClickableEarthSection
        id="L-01"
        title={t('dashboard.ceo.decisionLog')}
        onRowClick={(item) => openDrawer(item.text, (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
              <span style={{ ...statusBadgeStyle(item.status) }}>{tStatus(item.status)}</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('dashboard.ceo.decisionDesc')}
            </p>
          </div>
        ))}
        items={[
          { text: 'Hypbit-bilverkstad skrotad', status: 'done' },
          { text: 'Landvex AB (Sverige) - registrerat och aktivt', status: 'done' },
        ]}
      />

      {drawer && <InfoDrawer title={drawer.title} onClose={closeDrawer}>{drawer.content}</InfoDrawer>}
    </div>
  )
}

// ─── CEO Operations Dashboard ──────────────────────────────────────────────────
function Opsdashboard() {
  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null)
  const openDrawer = (title: string, content: React.ReactNode) => setDrawer({ title, content })
  const closeDrawer = () => setDrawer(null)

  return (
    <div className="space-y-8 max-w-6xl">
      <Breadcrumbs crumbs={[{ label: 'Wavult OS', href: '/' }, { label: 'Dashboard' }, { label: 'CEO Operations' }]} />
      <div>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CEO Operations</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Daglig drift & execution — Wavult Operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktiva initiativ', value: '8', delta: '3 blockerade', color: '#10B981',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">8 aktiva initiativ varav 3 är blockerade och väntar på extern input eller beslut.</p> },
          { label: 'Team kapacitet', value: '5/5', delta: 'Alla roller bemannade', color: '#3B82F6',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Alla 5 kärnroller är bemannade: Erik, Johan, Winston, Dennis, Leon.</p> },
          { label: 'Thailand nedräkning', value: '17d', delta: '11 april 2026', color: '#F59E0B',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Thailand Workcamp startar 11 april 2026. Vecka 1: teambuilding + utbildning. Sedan: projekten sätts upp redo att rulla ut.</p> },
          { label: 'Delivery pace', value: 'Hög', delta: 'Q1 sprint aktiv', color: '#2563EB',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Q1 sprint är aktiv med hög leveranstakt. Nästa review: Thailand workcamp.</p> },
        ].map(s => (
          <button
            key={s.label}
            className="card card-interactive p-5 text-left"
            onClick={() => openDrawer(s.label, s.drawerContent)}
          >
            <div className="label-xs mb-2">{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-2">{s.delta}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableSection
          title="Aktiva initiativ"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Initiativ inom CEO Operations-ansvaret.</p>
            </div>
          ))}
          items={[
            { text: 'Wavult OS Command Center — rollsystem live', status: 'active' },
            { text: 'quiXzoom API — ECS eu-north-1 live', status: 'active' },
            { text: 'Landvex sajt — CF Pages, senaste deploy live', status: 'active' },
            { text: 'Bolagsstruktur UAE — väntar på rättslig rådgivning', status: 'blocked' },
            { text: 'Texas LLC — Dennis driver incorporation docs', status: 'in-progress' },
          ]}
        />
        <ClickableSection
          title="Team — daglig status"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Teammedlemmens nuvarande fokus och status.</p>
            </div>
          ))}
          items={[
            { text: 'Johan: Wavult OS infrastruktur + ECS pipeline', status: 'active' },
            { text: 'Winston: Kassaflöde + budgetuppföljning', status: 'active' },
            { text: 'Dennis: Texas LLC docs + compliance', status: 'in-progress' },
            { text: 'Leon: Q1 execution koordinering', status: 'active' },
            { text: 'Erik: Thailand workcamp + bolagsstruktur', status: 'active' },
          ]}
        />
      </div>
      {drawer && <InfoDrawer title={drawer.title} onClose={closeDrawer}>{drawer.content}</InfoDrawer>}
    </div>
  )
}

// ─── Entity-specific data for CFO dashboard ────────────────────────────────────
const CFO_ENTITY_DATA: Record<string, {
  heading: string
  subtitle: string
  financialStructure: { text: string; status: string }[]
  infraCosts: { text: string; status: string }[]
}> = {
  'all': {
    heading: 'CFO',
    subtitle: 'Finansiell kontroll — Wavult Ecosystem',
    financialStructure: [
      { text: 'Intercompany service fee — WOP fakturerar dotterbolag', status: 'planned' },
      { text: 'IP-royalty — Wavult Group tar 5–15% på omsättning', status: 'planned' },
      { text: 'Transfer pricing-policy — kräver CLO + extern rådgivare', status: 'blocked' },
      { text: 'Separat bankkonto per bolag — storbank varje jurisdiktion', status: 'planned' },
      { text: 'Supabase US East — planerat (OI US expansion)', status: 'planned' },
    ],
    infraCosts: [
      { text: 'AWS ECS eu-north-1 — wavult-api + quixzoom-api', status: 'active' },
      { text: 'S3: 4 buckets (EU + US primär + backup)', status: 'active' },
      { text: 'Supabase West EU — quixzoom-v2 + wavult-os projekt', status: 'active' },
      { text: 'Cloudflare — 2 zoner, CF Pages (10/10 slots)', status: 'active' },
      { text: 'CF Pages — quiXzoom landing, Wavult, OI portals', status: 'active' },
    ],
  },
  '1': {
    heading: 'WGH — FINANSIELL KONTROLL',
    subtitle: 'Wavult Group Holding DMCC — UAE',
    financialStructure: [
      { text: 'DMCC License Renewal — årsavgift', status: 'planned' },
      { text: 'UAE Corporate Tax 9% — gäller fr.o.m. 2023', status: 'active' },
      { text: 'Internlån till dotterbolag — struktur ej satt', status: 'planned' },
      { text: 'IP-royalty ingående — 5–15% på dotterbolags omsättning', status: 'planned' },
    ],
    infraCosts: [
      { text: 'Kapitalstruktur gruppen', status: 'active' },
      { text: 'Dubai banking setup — Mashreq / ADCB', status: 'in-progress' },
    ],
  },
  '2': {
    heading: 'WOH — FINANSIELL KONTROLL',
    subtitle: 'Wavult Operations Holding AB — Sverige',
    financialStructure: [
      { text: 'Årsredovisning 2025 — Bolagsverket', status: 'planned' },
      { text: 'Momsdeklaration Q1 2026', status: 'active' },
      { text: 'F-skatt — löpande', status: 'active' },
      { text: 'quiXzoom Sverige-lansering juni — budget sätts', status: 'in-progress' },
    ],
    infraCosts: [
      { text: 'quiXzoom Sverige ops', status: 'active' },
      { text: 'Marketing Sverige — budget ej satt', status: 'planned' },
    ],
  },
  '3': {
    heading: 'OZ UAB — FINANSIELL KONTROLL',
    subtitle: 'Optical Zoom UAB — Litauen',
    financialStructure: [
      { text: 'VAT-registrering Litauen', status: 'planned' },
      { text: 'Corporate tax 15% — standard rate LT', status: 'planned' },
      { text: 'Litauisk bankkonto — Swedbank / SEB LT', status: 'in-progress' },
    ],
    infraCosts: [
      { text: 'EU tech-hub driftkostnad', status: 'active' },
    ],
  },
  '4': {
    heading: 'OZ INC — FINANSIELL KONTROLL',
    subtitle: 'Optical Zoom Inc — Delaware, USA',
    financialStructure: [
      { text: 'Delaware franchise tax — $50/år', status: 'planned' },
      { text: 'Federal corporate tax 21%', status: 'planned' },
      { text: 'EIN — Employer Identification Number', status: 'in-progress' },
    ],
    infraCosts: [
      { text: 'US market entry budget', status: 'planned' },
    ],
  },
  '5': {
    heading: 'LVX AE — FINANSIELL KONTROLL',
    subtitle: 'LandveX AC — UAE DIFC',
    financialStructure: [
      { text: 'DIFC setup fees', status: 'planned' },
      { text: 'UAE Corporate Tax 9%', status: 'planned' },
      { text: 'Enterprise sales pipeline UAE', status: 'planned' },
    ],
    infraCosts: [
      { text: 'LandveX UAE launch budget', status: 'planned' },
    ],
  },
  '6': {
    heading: 'LVX US — FINANSIELL KONTROLL',
    subtitle: 'LandveX Inc — Texas, USA',
    financialStructure: [
      { text: 'Texas state franchise tax', status: 'planned' },
      { text: 'Federal corporate tax 21%', status: 'planned' },
      { text: 'EIN filing Texas LLC', status: 'in-progress' },
    ],
    infraCosts: [
      { text: 'LandveX USA launch budget', status: 'planned' },
    ],
  },
}

// ─── CFO Dashboard ─────────────────────────────────────────────────────────────
function CfoDashboard() {
  const { activeEntity } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const entityKey = isRoot ? 'all' : activeEntity.id
  const cfoData = CFO_ENTITY_DATA[entityKey] ?? CFO_ENTITY_DATA['all']

  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null)
  const openDrawer = (title: string, content: React.ReactNode) => setDrawer({ title, content })
  const closeDrawer = () => setDrawer(null)

  return (
    <div className="space-y-8 max-w-6xl">
      <Breadcrumbs crumbs={[{ label: 'Wavult OS', href: '/' }, { label: 'Dashboard' }, { label: isRoot ? 'CFO' : activeEntity.name }]} />
      <div>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{cfoData.heading}</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>{cfoData.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          isRoot
            ? { label: 'Bolag med ekonomi', value: '6', delta: 'WGH, WOP, QZ UAB, QZ Inc, LVX AB, LVX Inc', color: '#3B82F6',
                drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">6 bolag med ekonomisk redovisning: Wavult Group Holding, Wavult Operations, QuiXzoom UAB, QuiXzoom Inc, Landvex AB, Landvex Inc.</p> }
            : { label: 'Bolag', value: activeEntity.shortName ?? activeEntity.name, delta: activeEntity.jurisdiction ?? '', color: '#3B82F6',
                drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">{activeEntity.name} — aktiv entitet i Wavult Group.</p> },
          { label: 'Struktur', value: cfoData.financialStructure.filter(i => i.status === 'active').length + '/' + cfoData.financialStructure.length, delta: `${cfoData.financialStructure.filter(i => i.status === 'planned' || i.status === 'blocked').length} återstår`, color: '#10B981',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">{cfoData.financialStructure.filter(i => i.status === 'active').length} aktiva finansstrukturer av {cfoData.financialStructure.length} totalt.</p> },
          isRoot
            ? { label: 'Transfer pricing', value: 'Ej satt', delta: 'Kräver CLO + extern rådgivare', color: '#FF9500',
                drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Transfer pricing-policy är ej fastställd. Kräver samverkan mellan CFO, CLO och extern skatterådgivare.</p> }
            : { label: 'Allokeringar', value: String(cfoData.infraCosts.length), delta: `${cfoData.infraCosts.filter(i => i.status === 'active').length} aktiva`, color: '#FF9500',
                drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">{cfoData.infraCosts.length} allokeringar för {activeEntity.name}.</p> },
          isRoot
            ? { label: 'Dubai holding', value: 'Planerat', delta: 'Väntar på bolagsbildning', color: '#2563EB',
                drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Wavult Group (Dubai Free Zone) under bildning. Ska bli holdingbolag för IP och internprissättning.</p> }
            : { label: 'Jurisdiktion', value: cfoData.heading.split('—')[0].trim(), delta: activeEntity.jurisdiction ?? '', color: '#2563EB',
                drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">{activeEntity.name} är registrerat i {activeEntity.jurisdiction ?? 'okänd jurisdiktion'}.</p> },
        ].map(s => (
          <button
            key={s.label}
            className="card card-interactive p-5 text-left"
            onClick={() => openDrawer(s.label, s.drawerContent)}
          >
            <div className="label-xs mb-2">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-2">{s.delta}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableSection
          title="Finansiell struktur"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Finansiell strukturåtgärd inom {isRoot ? 'Wavult Ecosystem' : activeEntity.name}.</p>
            </div>
          ))}
          items={cfoData.financialStructure}
        />
        <ClickableSection
          title="Kostnader & allokeringar"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Kostnad — löpande för {isRoot ? 'Wavult Group' : activeEntity.name}.</p>
            </div>
          ))}
          items={cfoData.infraCosts}
        />
      </div>
      {drawer && <InfoDrawer title={drawer.title} onClose={closeDrawer}>{drawer.content}</InfoDrawer>}
    </div>
  )
}

// ─── CTO Dashboard ─────────────────────────────────────────────────────────────
function CtoDashboard() {
  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null)
  const openDrawer = (title: string, content: React.ReactNode) => setDrawer({ title, content })
  const closeDrawer = () => setDrawer(null)

  return (
    <div className="space-y-8 max-w-6xl">
      <Breadcrumbs crumbs={[{ label: 'Wavult OS', href: '/' }, { label: 'Dashboard' }, { label: 'Group CTO' }]} />
      <div>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Group CTO</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Teknisk arkitektur & infrastruktur — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'API Services', value: '2', delta: 'wavult-api + quixzoom-api live', color: '#06B6D4',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">wavult-api på api.wavult.com och quixzoom-api — båda på ECS eu-north-1 med Docker-containers.</p> },
          { label: 'Supabase', value: '2', delta: 'quixzoom-v2 + wavult-os (EU West)', color: '#3ECF8E',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Supabase West EU: projekt lpeipzdm (quixzoom-v2) och wavult-os. 13 migrationer live.</p> },
          { label: 'S3 Buckets', value: '4', delta: 'EU + US, CRR aktiv', color: '#FF9500',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">4 S3-buckets: EU primär, EU backup, US primär, US backup. Cross-Region Replication (CRR) aktiv.</p> },
          { label: 'CF Pages', value: '10/10', delta: 'Max — behöver frigöra slots', color: '#FF3B30',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Cloudflare Pages är maxat på 10/10 slots. Åtgärd: ta bort landvex-fr/nl/de/fi/be/it (6 projekt).</p> },
        ].map(s => (
          <button
            key={s.label}
            className="card card-interactive p-5 text-left"
            onClick={() => openDrawer(s.label, s.drawerContent)}
          >
            <div className="label-xs mb-2">{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-2">{s.delta}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableSection
          title="Infrastruktur — live"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Live infrastrukturkomponent i Wavult Ecosystem.</p>
            </div>
          ))}
          items={[
            { text: 'wavult-api — ECS eu-north-1, api.wavult.com', status: 'active' },
            { text: 'quixzoom-api — ECS cluster wavult, task def :2', status: 'active' },
            { text: 'quiXzoom frontend — S3 + CloudFront (dewrtqzc20flx)', status: 'active' },
            { text: 'Supabase lpeipzdm — 13 migrationer live', status: 'active' },
            { text: 'S3 multi-region — CRR eu→eu + us→us', status: 'active' },
          ]}
        />
        <ClickableSection
          title="Öppna tekniska TODO"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Teknisk backlog-post som behöver åtgärdas.</p>
            </div>
          ))}
          items={[
            { text: 'CF Pages-slots: ta bort landvex-fr/nl/de/fi/be/it (6 projekt)', status: 'blocked' },
            { text: 'Supabase US East — planerat (OI US expansion)', status: 'planned' },
            { text: 'ECS us-east-1 — ny service för OI US API', status: 'planned' },
            { text: 'optical-insight-eu + optical-insight-us — CF Pages deploy', status: 'planned' },
            { text: 'CF Pages API-token — Erik skapar på dash.cloudflare.com', status: 'blocked' },
          ]}
        />
      </div>

      <ClickableSection
        title="Stack"
        onRowClick={(item) => openDrawer('Tech Stack', (
          <p className="text-sm text-[var(--color-text-secondary)]">{item.text}</p>
        ))}
        items={[
          { text: 'TypeScript · Node.js/Express · React/Next.js', status: 'active' },
          { text: 'Supabase (PostgreSQL) · Docker · AWS ECS', status: 'active' },
          { text: 'Cloudflare · Wavult CI (Gitea) · CF Pages · Stripe · Revolut', status: 'active' },
          { text: 'Trigger.dev · ECR: 155407238699.dkr.ecr.eu-north-1', status: 'active' },
        ]}
      />
      {drawer && <InfoDrawer title={drawer.title} onClose={closeDrawer}>{drawer.content}</InfoDrawer>}
    </div>
  )
}

// ─── CLO Dashboard ─────────────────────────────────────────────────────────────
function CloDashboard() {
  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null)
  const openDrawer = (title: string, content: React.ReactNode) => setDrawer({ title, content })
  const closeDrawer = () => setDrawer(null)

  return (
    <div className="space-y-8 max-w-6xl">
      <Breadcrumbs crumbs={[{ label: 'Wavult OS', href: '/' }, { label: 'Dashboard' }, { label: 'Chief Legal & Compliance' }]} />
      <div>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Chief Legal & Compliance</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Bolagsstruktur, avtal & risk — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bolag totalt', value: '6', delta: '2 Dubai · 2 EU · 2 US', color: '#F59E0B',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">6 bolag totalt: 2 Dubai (Free Zone A), 2 EU (Litauen + Sverige), 2 US (Delaware + Texas).</p> },
          { label: 'Aktiva bolag', value: '1', delta: 'Landvex AB (Sverige) live', color: '#10B981',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">Landvex AB är det enda fullt aktiva bolaget. Registrerat och operativt i Sverige.</p> },
          { label: 'Under bildning', value: '5', delta: 'Dubai, Delaware, Texas, Litauen', color: '#FF9500',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">5 bolag under bildning: Wavult Group Dubai, Wavult Operations Dubai, QuiXzoom UAB (LT), QuiXzoom Inc (DE), Landvex Inc (TX).</p> },
          { label: 'IP-skydd', value: 'Ej satt', delta: 'Ska ligga i Wavult Group Dubai', color: '#FF3B30',
            drawerContent: <p className="text-sm text-[var(--color-text-secondary)]">IP-skydd är ej etablerat. Plan: all IP ska överlåtas till Wavult Group (Dubai Free Zone A) för optimal skattestruktur.</p> },
        ].map(s => (
          <button
            key={s.label}
            className="card card-interactive p-5 text-left"
            onClick={() => openDrawer(s.label, s.drawerContent)}
          >
            <div className="label-xs mb-2">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-2">{s.delta}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableSection
          title="Bolagsstruktur — status"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Bolag i Wavult Groups juridiska struktur.</p>
            </div>
          ))}
          items={[
            { text: 'Wavult Group (Holding, Dubai Free Zone A) — planerat', status: 'planned' },
            { text: 'Wavult Operations (Dubai Free Zone A) — planerat', status: 'planned' },
            { text: 'QuiXzoom UAB (Litauen) — planerat', status: 'planned' },
            { text: 'QuiXzoom Inc (Delaware) — planerat', status: 'planned' },
            { text: 'Landvex Inc (Texas/Houston) — under bildning', status: 'in-progress' },
            { text: 'Landvex AB (Sverige) — live', status: 'active' },
          ]}
        />
        <ClickableSection
          title="Juridiska prioriteringar"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Juridisk prioritering som hanteras av CLO-funktionen.</p>
            </div>
          ))}
          items={[
            { text: 'IP-överlåtelse — kod, varumärke → Wavult Group Dubai', status: 'planned' },
            { text: 'Intercompany-avtal — service fee + royalty-struktur', status: 'planned' },
            { text: 'Transfer pricing-policy — samverka med CFO + extern rådgivare', status: 'planned' },
            { text: 'GDPR-compliance — EU-data aldrig till US-buckets', status: 'active' },
            { text: 'Texas LLC — incorporation docs pågår', status: 'in-progress' },
          ]}
        />
      </div>
      {drawer && <InfoDrawer title={drawer.title} onClose={closeDrawer}>{drawer.content}</InfoDrawer>}
    </div>
  )
}

// ─── CPO Dashboard (vakant) ────────────────────────────────────────────────────
function CpoDashboard() {
  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null)
  const openDrawer = (title: string, content: React.ReactNode) => setDrawer({ title, content })
  const closeDrawer = () => setDrawer(null)

  return (
    <div className="space-y-8 max-w-6xl">
      <Breadcrumbs crumbs={[{ label: 'Wavult OS', href: '/' }, { label: 'Dashboard' }, { label: 'CPO' }]} />
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>Chief Product Officer</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Produktstrategi & roadmap — Vakant (interim: Erik)</p>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: "3px solid #EC4899", borderRadius: "var(--radius-xl)", padding: 24, textAlign: "center" }}>
        <div className="text-4xl mb-3">🧩</div>
        <div style={{ color: "var(--color-text-primary)", fontWeight: 600, marginBottom: 4 }}>Rollen är vakant</div>
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Erik Svensson håller CPO-ansvar interim tills rekrytering är klar</div>
        <div className="mt-4 text-xs text-text-muted">Nästa rekrytering — CPO är prioritet 1</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableSection
          title="Produkter — aktiva"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
                <span style={{ fontSize: 11, background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18', color: STATUS_COLORS[item.status] ?? '#8A8278', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Produkt i Wavult Ecosystem — under CPO-ansvaret (interim: Erik).</p>
            </div>
          ))}
          items={[
            { text: 'quiXzoom — crowdsourcad kamerainfrastruktur (zoomer-plattform)', status: 'active' },
            { text: 'Optical Insight / Landvex — B2G kontrollsystem', status: 'active' },
            { text: 'Wavult OS — internt operativsystem för Wavult Group', status: 'active' },
            { text: 'Quixom Ads — fas 2, monetisering av quiXzoom-data', status: 'planned' },
          ]}
        />
        <ClickableSection
          title="Produktprinciper (låsta)"
          onRowClick={(item) => openDrawer(item.text, (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }} />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Låst produktprincip — gäller alla produkter och all kommunikation.</p>
            </div>
          ))}
          items={[
            { text: 'Säg aldrig "AI" — säg optisk analys, vision engine, optical layer', status: 'active' },
            { text: 'Zoomers — aldrig fotografer, operatörer, fältpersonal', status: 'active' },
            { text: 'Landvex: Right control. Right cost. Right interval.', status: 'active' },
            { text: 'OI: Works on day one. Gets smarter every day you use it.', status: 'active' },
          ]}
        />
      </div>
      {drawer && <InfoDrawer title={drawer.title} onClose={closeDrawer}>{drawer.content}</InfoDrawer>}
    </div>
  )
}

// ─── Shared status maps ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: '#2D6A4F',      /* forest green — Aktiv */
  done: '#2D6A4F',        /* forest green — Klar */
  planned: '#2B5BA8',     /* medium blue — Planerad */
  'in-progress': '#B8860B', /* warm ochre — Pågår */
  blocked: '#C0392B',     /* alert röd — Blockerad */
}

// Status label keys — resolved via t() at render time
const STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'dashboard.status.active',
  done: 'dashboard.status.done',
  planned: 'dashboard.status.planned',
  'in-progress': 'dashboard.status.inProgress',
  blocked: 'dashboard.status.blocked',
}

// Legacy static fallback (used in non-hook contexts, kept for TS compat)
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  done: 'Klar',
  planned: 'Planerad',
  'in-progress': 'Pågår',
  blocked: 'Blockerad',
}

// ─── Section component (non-clickable) ────────────────────────────────────────
function Section({ title, children }: { title: string; children: { text: string; status: string }[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</h2>
      <div style={{ background: "var(--color-surface)", border: "1px solid #DED9CC", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {children.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3.5"
            style={{ borderBottom: i < children.length - 1 ? '1px solid #DED9CC' : 'none' }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }}
            />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)", flex: 1 }}>{item.text}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18',
                color: STATUS_COLORS[item.status] ?? '#8A8278',
              }}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Clickable Section component ──────────────────────────────────────────────
function ClickableSection({ title, items, onRowClick }: {
  title: string
  items: { text: string; status: string }[]
  onRowClick: (item: { text: string; status: string }) => void
}) {
  return (
    <div>
      <h2 style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</h2>
      <div style={{ background: "var(--color-surface)", border: "1px solid #DED9CC", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onRowClick(item)}
            className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-[var(--color-surface-hover,rgba(0,0,0,0.03))] transition-colors"
            style={{ borderBottom: i < items.length - 1 ? '1px solid #DED9CC' : 'none' }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }}
            />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)", flex: 1 }}>{item.text}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18',
                color: STATUS_COLORS[item.status] ?? '#8A8278',
              }}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Earth & Stone Section (for CEO dashboard with ID tags) ───────────────────
function EarthSection({ id, title, children }: { id: string; title: string; children: { text: string; status: string }[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{id}</span>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</h2>
      </div>
      <div style={{ background: "var(--color-surface)", border: "1px solid #DED9CC", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {children.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3.5"
            style={{ borderBottom: i < children.length - 1 ? '1px solid #DED9CC' : 'none' }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }}
            />
            <span style={{ fontSize: 13, color: "#1A1A1A", flex: 1 }}>{item.text}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={{
                background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18',
                color: STATUS_COLORS[item.status] ?? '#8A8278',
                border: `1px solid ${(STATUS_COLORS[item.status] ?? '#8A8278')}30`,
              }}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Clickable EarthSection (for CEO dashboard with ID tags) ──────────────────
function ClickableEarthSection({ id, title, items, onRowClick }: {
  id: string
  title: string
  items: { text: string; status: string }[]
  onRowClick: (item: { text: string; status: string }) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{id}</span>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</h2>
      </div>
      <div style={{ background: "var(--color-surface)", border: "1px solid #DED9CC", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onRowClick(item)}
            className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-[var(--color-surface-hover,rgba(0,0,0,0.03))] transition-colors"
            style={{ borderBottom: i < items.length - 1 ? '1px solid #DED9CC' : 'none' }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[item.status] ?? '#8A8278' }}
            />
            <span style={{ fontSize: 13, color: "#1A1A1A", flex: 1 }}>{item.text}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={{
                background: (STATUS_COLORS[item.status] ?? '#8A8278') + '18',
                color: STATUS_COLORS[item.status] ?? '#8A8278',
                border: `1px solid ${(STATUS_COLORS[item.status] ?? '#8A8278')}30`,
              }}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Scope Banner ──────────────────────────────────────────────────────────────
function ScopeBanner() {
  const { activeEntity } = useEntityScope()
  const { t } = useTranslation()
  const isRoot = activeEntity.layer === 0

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium mb-1 reveal card-interactive"
      style={{
        background: '#DED9CC',
        border: '1px solid #C4BFB2',
      }}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ background: '#8B7355' }}
      />
      <span style={{ color: '#1A1A1A', fontWeight: 600 }}>
        {isRoot ? t('shell.viewing.all') : t('shell.viewing.scoped', { name: activeEntity.name })}
      </span>
      {!isRoot && (
        <span style={{ color: '#6B6560', marginLeft: 4 }}>{t('shell.viewing.scopedSuffix')}</span>
      )}
    </div>
  )
}

// ─── Router ────────────────────────────────────────────────────────────────────
export function RoleDashboard() {
  const { t: _t } = useTranslation() // ready for i18n
  const { effectiveRole, isAdmin, viewAs } = useRole()

  // Admin utan viewAs → visa full Command Center
  if (!effectiveRole || (isAdmin && !viewAs)) return (
    <>
      <ScopeBanner />
      <CommandDashboard />
    </>
  )

  const dashboardMap: Record<string, JSX.Element> = {
    'group-ceo': <CeoDashboard />,
    'ceo-ops':   <Opsdashboard />,
    'cfo':       <CfoDashboard />,
    'cto':       <CtoDashboard />,
    'clo':       <CloDashboard />,
    'cpo':       <CpoDashboard />,
  }

  const dashboard = dashboardMap[effectiveRole.id] ?? <CommandDashboard />

  return (
    <>
      {/* Semantic H1 for accessibility — visually hidden */}
      <h1
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {effectiveRole.title} — Wavult OS Dashboard
      </h1>
      <ScopeBanner />
      {dashboard}
    </>
  )
}
