import { useState } from 'react'
import {
  useCorpEntities,
  useCorpBoardMeetings,
  useCorpComplianceStats,
  useCorpComplianceItems,
} from './hooks/useCorporate'
import { useFinanceKpis } from '../finance/hooks/useFinance'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type Audience = 'investor' | 'staff' | 'supplier' | 'partner' | 'customer'

// ─── Entity Products ──────────────────────────────────────────────────────────

const ENTITY_PRODUCTS: Record<string, Array<{ name: string; desc: string; badge: string }>> = {
  '1': [ // WGH Dubai — moderbolag
    { name: 'Wavult OS', desc: 'Komplett enterprise operativsystem för verksamhetsdrift — ekonomi, compliance, team, CRM.', badge: 'Enterprise' },
    { name: 'quiXzoom', desc: 'Crowdsourcad kamerainfrastruktur — zoomers samlar bilddata för infrastrukturägare.', badge: 'Beta' },
    { name: 'LandveX', desc: 'Optisk intelligens för infrastrukturägare — rätt kontroll, rätt kostnad, rätt intervall.', badge: 'Kommande' },
    { name: 'DISSG', desc: 'Distribuerat intelligensystem för samhällskritisk data.', badge: 'Planerad' },
    { name: 'Apifly', desc: 'En nyckel. Alla API:er. Byggt av Winston Bjarnemark, 17, Stockholm.', badge: 'Beta' },
  ],
  '2': [ // WOH Sverige
    { name: 'Wavult OS', desc: 'Enterprise operativsystem för Wavult-koncernens svenska verksamhet.', badge: 'Enterprise' },
    { name: 'quiXzoom Sverige', desc: 'Crowdsourcad bilddata — lansering Sverige juni 2026.', badge: 'Beta' },
  ],
  '3': [ // OZ UAB Litauen
    { name: 'quiXzoom EU', desc: 'EU-bas för quiXzoom-plattformen — zoomers och bilddata för den europeiska marknaden.', badge: 'Beta' },
  ],
  '4': [ // OZ Inc Delaware
    { name: 'quiXzoom US', desc: 'quiXzoom Inc — US-marknad. Delaware C-Corp.', badge: 'Planerad' },
  ],
  '5': [ // LVX AE
    { name: 'LandveX Enterprise', desc: 'Optisk infrastrukturintelligens — UAE och MENA-marknaden.', badge: 'Kommande' },
  ],
  '6': [ // LVX US Texas
    { name: 'LandveX US', desc: 'LandveX för den amerikanska infrastrukturmarknaden.', badge: 'Planerad' },
  ],
}

interface AudienceTab {
  id: Audience
  label: string
  icon: string
}

const AUDIENCE_TABS: AudienceTab[] = [
  { id: 'investor', label: 'Investerare', icon: '💼' },
  { id: 'staff', label: 'Personal', icon: '👤' },
  { id: 'supplier', label: 'Leverantörer', icon: '🏢' },
  { id: 'partner', label: 'Partners', icon: '🤝' },
  { id: 'customer', label: 'Kunder', icon: '📋' },
]

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-[#F5F0E8] border border-[#E8D9C0] shadow-sm p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xl">{icon}</span>
      <h2 className="text-base font-bold text-[#0A3D62] tracking-wide uppercase">{title}</h2>
    </div>
  )
}

function Badge({
  label,
  variant = 'neutral',
}: {
  label: string
  variant?: 'green' | 'gold' | 'red' | 'neutral'
}) {
  const colors = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    gold: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    neutral: 'bg-[#E8D9C0] text-[#0A3D62] border-[#C9B99A]',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[variant]}`}>
      {label}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-[#E8B84B] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#7A6A55]">
      <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ entity }: { entity: { name: string; jurisdiction: string; status: string; founded?: string | null } | undefined }) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ minHeight: '200px' }}>
      <img
        src="/images/os-command-center.jpg"
        alt="Wavult Group"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D62]/85 via-[#0A3D62]/60 to-transparent" />
      <div className="relative z-10 p-8 flex flex-col justify-end h-full" style={{ minHeight: '200px' }}>
        <p className="text-[#E8B84B] text-xs font-bold uppercase tracking-widest mb-1">Corporate Compendium</p>
        <h1 className="text-3xl font-extrabold text-white mb-1">
          {entity?.name ?? 'Wavult Group'}
        </h1>
        <p className="text-white/70 text-sm mb-3">
          Enabling trust through structure, technology, and governance
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {entity?.jurisdiction && (
            <Badge label={entity.jurisdiction} variant="neutral" />
          )}
          {entity?.status && (
            <Badge label={entity.status === 'aktiv' ? 'Aktiv' : entity.status} variant={entity.status === 'aktiv' ? 'green' : 'gold'} />
          )}
          {entity?.founded && (
            <span className="text-white/60 text-xs">Grundat {entity.founded}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── KPI Grid ─────────────────────────────────────────────────────────────────

function KpiGrid() {
  const { data: kpis, isLoading } = useFinanceKpis()
  const { data: complianceStats, isLoading: loadingCompliance } = useCorpComplianceStats()

  if (isLoading || loadingCompliance) return <Spinner />

  const latest = kpis && kpis.length > 0 ? kpis[kpis.length - 1] : null
  const compliancePct = complianceStats && complianceStats.total > 0
    ? Math.round((complianceStats.completed / complianceStats.total) * 100)
    : null

  const items = [
    {
      label: 'Revenue',
      value: latest?.revenue != null ? `${latest.currency ?? 'SEK'} ${(latest.revenue / 1000).toFixed(0)}k` : null,
      icon: '📈',
      sub: latest?.period ?? '',
    },
    {
      label: 'Resultat',
      value: latest?.result != null ? `${latest.currency ?? 'SEK'} ${(latest.result / 1000).toFixed(0)}k` : null,
      icon: '💰',
      sub: latest?.period ?? '',
    },
    {
      label: 'Compliance',
      value: compliancePct != null ? `${compliancePct}%` : null,
      icon: '✅',
      sub: `${complianceStats?.completed ?? 0} / ${complianceStats?.total ?? 0} krav uppfyllda`,
    },
    {
      label: 'Förfallna krav',
      value: complianceStats?.overdue != null ? `${complianceStats.overdue}` : null,
      icon: '⚠️',
      sub: 'kräver åtgärd',
    },
  ]

  const hasAnyData = items.some(i => i.value !== null)

  return (
    <SectionCard>
      <SectionTitle icon="📊" title="Nyckeltal" />
      {!hasAnyData ? (
        <EmptyState message="Ingen finansiell data tillgänglig ännu" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#E8D9C0] bg-white/60 p-4 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1 text-[#7A6A55] text-xs font-medium">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.value != null ? (
                <p className="text-2xl font-bold text-[#0A3D62]">{item.value}</p>
              ) : (
                <p className="text-sm text-[#B0956E] italic">Ingen data</p>
              )}
              {item.sub && <p className="text-xs text-[#9A8870]">{item.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Corporate Structure ──────────────────────────────────────────────────────

function CorporateStructure() {
  const { data: entities, isLoading } = useCorpEntities()

  return (
    <SectionCard>
      <SectionTitle icon="🏛️" title="Bolagsstruktur" />
      {isLoading ? (
        <Spinner />
      ) : !entities || entities.length === 0 ? (
        <EmptyState message="Inga bolag registrerade" />
      ) : (
        <div className="flex flex-col gap-2">
          {entities.map((entity) => (
            <div
              key={entity.id}
              className="flex items-center justify-between rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: entity.color ?? '#0A3D62' }}
                />
                <div>
                  <p className="font-semibold text-[#0A3D62] text-sm">{entity.name}</p>
                  {entity.org_nr && (
                    <p className="text-xs text-[#9A8870] font-mono">{entity.org_nr}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[#7A6A55]">{entity.jurisdiction}</span>
                <Badge
                  label={entity.status === 'aktiv' ? 'Aktiv' : 'Under bildning'}
                  variant={entity.status === 'aktiv' ? 'green' : 'gold'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Compliance Status ────────────────────────────────────────────────────────

function ComplianceStatus() {
  const { data: stats, isLoading } = useCorpComplianceStats()

  const pct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDash = ((pct / 100) * circumference).toFixed(1)

  return (
    <SectionCard>
      <SectionTitle icon="✅" title="Compliancestatus" />
      {isLoading ? (
        <Spinner />
      ) : !stats || stats.total === 0 ? (
        <EmptyState message="Ingen compliance-data tillgänglig" />
      ) : (
        <div className="flex items-center gap-8 flex-wrap">
          {/* Ring */}
          <div className="flex-shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#E8D9C0" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#E8B84B"
                strokeWidth="10"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill="#0A3D62" fontSize="16" fontWeight="bold">
                {pct}%
              </text>
            </svg>
          </div>
          {/* Stats */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              <span className="text-sm text-[#0A3D62]">{stats.completed} uppfyllda</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              <span className="text-sm text-[#0A3D62]">{stats.dueIn30} förfaller inom 30 dagar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
              <span className="text-sm text-[#0A3D62]">{stats.overdue} förfallna</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E8D9C0] inline-block" />
              <span className="text-sm text-[#0A3D62]">{stats.total} totalt</span>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Board Overview ───────────────────────────────────────────────────────────

function BoardOverview() {
  const { data: meetings, isLoading } = useCorpBoardMeetings()

  const recent = meetings ? meetings.slice(0, 5) : []

  const statusBadge = (status: string) => {
    if (status === 'protokoll klart') return <Badge label="Protokoll klart" variant="green" />
    if (status === 'genomfört') return <Badge label="Genomfört" variant="gold" />
    return <Badge label="Planerat" variant="neutral" />
  }

  return (
    <SectionCard>
      <SectionTitle icon="🗓️" title="Styrelseöversikt" />
      {isLoading ? (
        <Spinner />
      ) : recent.length === 0 ? (
        <EmptyState message="Inga styrelsemöten registrerade" />
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-[#0A3D62] text-sm capitalize">{m.type}</p>
                <p className="text-xs text-[#9A8870]">{m.date}</p>
              </div>
              {statusBadge(m.status)}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactSection({ contacts }: {
  contacts: { role: string; name: string; email: string }[]
}) {
  return (
    <SectionCard>
      <SectionTitle icon="📬" title="Kontakt" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contacts.map((c) => (
          <div key={c.email} className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
            <p className="text-xs text-[#9A8870] font-medium uppercase tracking-wider mb-0.5">{c.role}</p>
            <p className="font-semibold text-[#0A3D62] text-sm">{c.name}</p>
            <a href={`mailto:${c.email}`} className="text-xs text-[#E8B84B] hover:underline">{c.email}</a>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Static Info Cards ────────────────────────────────────────────────────────

function InfoList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3 gap-2">
          <span className="text-sm text-[#7A6A55] font-medium flex-shrink-0">{item.label}</span>
          <span className="text-sm text-[#0A3D62] font-semibold text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Audience Views ───────────────────────────────────────────────────────────

function InvestorView() {
  const { activeEntity } = useEntityScope()
  const { data: entities } = useCorpEntities()
  const rootEntity = entities?.find(e => e.id === activeEntity.id) ?? entities?.[0]

  return (
    <div className="flex flex-col gap-5">
      <HeroSection entity={rootEntity} />
      <KpiGrid />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CorporateStructure />
        <ComplianceStatus />
      </div>
      <BoardOverview />
      <ContactSection
        contacts={[
          { role: 'Group CEO', name: 'Erik Svensson', email: 'erik@wavult.com' },
          { role: 'Chief Legal & Operations', name: 'Dennis Bjarnemark', email: 'dennis@wavult.com' },
          { role: 'CFO', name: 'Winston Bjarnemark', email: 'winston@wavult.com' },
        ]}
      />
    </div>
  )
}

function StaffView() {
  const { data: complianceItems, isLoading } = useCorpComplianceItems()

  const systems = [
    { name: 'Wavult OS', desc: 'Operativsystem för verksamhetsdrift' },
    { name: 'Supabase', desc: 'Databas & autentisering' },
    { name: 'Cloudflare', desc: 'Edge-hosting & DNS' },
    { name: 'n8n', desc: 'Automationsplattform' },
    { name: 'AWS ECS', desc: 'Containerinfrastruktur' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ minHeight: '160px' }}>
        <img src="/images/os-briefing-map.jpg" alt="Team" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D62]/80 via-[#0A3D62]/50 to-transparent" />
        <div className="relative z-10 p-8" style={{ minHeight: '160px' }}>
          <p className="text-[#E8B84B] text-xs font-bold uppercase tracking-widest mb-1">Personalhandbok</p>
          <h1 className="text-2xl font-extrabold text-white">Wavult Group — Intern information</h1>
          <p className="text-white/70 text-sm mt-1">För medarbetare i Wavult-koncernen</p>
        </div>
      </div>

      <SectionCard>
        <SectionTitle icon="🌟" title="Mission & Värden" />
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
            <p className="text-xs text-[#9A8870] font-medium uppercase tracking-wider mb-1">Mission</p>
            <p className="text-sm text-[#0A3D62]">Enabling trust through structure, technology, and governance — för alla som bygger morgondagens företag.</p>
          </div>
          {[
            { title: 'Transparens', desc: 'Vi delar information öppet — internt och med partners.' },
            { title: 'Ägarskap', desc: 'Varje person äger sitt område och levererar med stolthet.' },
            { title: 'Precision', desc: 'Kvalitet före hastighet. Rätt från dag ett.' },
          ].map(v => (
            <div key={v.title} className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <p className="font-semibold text-[#0A3D62] text-sm">{v.title}</p>
              <p className="text-xs text-[#7A6A55] mt-0.5">{v.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="👥" title="Ledningsgrupp & roller" />
        <InfoList items={[
          { label: 'Group CEO', value: 'Erik Svensson' },
          { label: 'Chief Legal & Ops', value: 'Dennis Bjarnemark' },
          { label: 'CEO Operations', value: 'Leon Maurizio Russo De Cerame' },
          { label: 'CFO', value: 'Winston Bjarnemark' },
          { label: 'Group CTO', value: 'Johan Berglund' },
        ]} />
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="⚙️" title="Processer & Compliance" />
        {isLoading ? <Spinner /> : !complianceItems || complianceItems.length === 0 ? (
          <EmptyState message="Inga compliance-krav registrerade" />
        ) : (
          <div className="flex flex-col gap-2">
            {complianceItems.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-[#0A3D62]">{item.requirement}</p>
                  <p className="text-xs text-[#9A8870]">{item.category}</p>
                </div>
                <Badge
                  label={item.status}
                  variant={item.status === 'klar' ? 'green' : item.status === 'pågående' ? 'gold' : 'red'}
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="🖥️" title="Systemöversikt" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {systems.map(s => (
            <div key={s.name} className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <p className="font-semibold text-[#0A3D62] text-sm">{s.name}</p>
              <p className="text-xs text-[#7A6A55] mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <ContactSection contacts={[
        { role: 'HR & Kultur', name: 'Erik Svensson', email: 'erik@wavult.com' },
        { role: 'Legal & Ops', name: 'Dennis Bjarnemark', email: 'dennis@wavult.com' },
        { role: 'Teknik', name: 'Johan Berglund', email: 'johan@wavult.com' },
      ]} />
    </div>
  )
}

function SupplierView() {
  const { data: entities, isLoading } = useCorpEntities()
  const { data: stats, isLoading: loadingStats } = useCorpComplianceStats()

  const primaryEntity = entities?.[0]

  const compliancePct = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : null

  return (
    <div className="flex flex-col gap-5">
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ minHeight: '140px' }}>
        <img src="/images/os-command-center.jpg" alt="Supplier" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D62]/80 via-[#0A3D62]/50 to-transparent" />
        <div className="relative z-10 p-8" style={{ minHeight: '140px' }}>
          <p className="text-[#E8B84B] text-xs font-bold uppercase tracking-widest mb-1">Leverantörsinformation</p>
          <h1 className="text-2xl font-extrabold text-white">Wavult Group — Leverantörsportal</h1>
        </div>
      </div>

      <SectionCard>
        <SectionTitle icon="🏢" title="Bolagsinformation" />
        {isLoading ? <Spinner /> : !primaryEntity ? (
          <EmptyState message="Ingen bolagsinformation tillgänglig" />
        ) : (
          <InfoList items={[
            { label: 'Bolagsnamn', value: primaryEntity.name },
            { label: 'Org-nummer', value: primaryEntity.org_nr || '—' },
            { label: 'Jurisdiktion', value: primaryEntity.jurisdiction },
            { label: 'Status', value: primaryEntity.status === 'aktiv' ? 'Aktiv' : primaryEntity.status },
          ]} />
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="💳" title="Betalningsvillkor" />
        <InfoList items={[
          { label: 'Betalningsvillkor', value: '30 dagar netto' },
          { label: 'Valuta', value: 'SEK / EUR (enligt avtal)' },
          { label: 'Faktureringsformat', value: 'PDF eller e-faktura (Svefaktura)' },
          { label: 'Fakturaadress', value: 'invoice@wavult.com' },
        ]} />
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="✅" title="Compliancekrav" />
        {loadingStats ? <Spinner /> : (
          <div className="flex flex-col gap-2">
            <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <p className="font-semibold text-[#0A3D62] text-sm">GDPR</p>
              <p className="text-xs text-[#7A6A55] mt-0.5">Leverantörer som hanterar persondata måste teckna DPA (Data Processing Agreement)</p>
              {compliancePct != null && (
                <div className="mt-2">
                  <Badge label={`${compliancePct}% compliance uppfyllt`} variant={compliancePct >= 80 ? 'green' : compliancePct >= 50 ? 'gold' : 'red'} />
                </div>
              )}
            </div>
            <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <p className="font-semibold text-[#0A3D62] text-sm">Sekretess</p>
              <p className="text-xs text-[#7A6A55] mt-0.5">NDA krävs vid tillgång till konfidentiell information eller systemmiljöer</p>
            </div>
            <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <p className="font-semibold text-[#0A3D62] text-sm">Informationssäkerhet</p>
              <p className="text-xs text-[#7A6A55] mt-0.5">ISO 27001-alignment efterfrågas för leverantörer med systemtillgång</p>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="📋" title="Onboarding" />
        <div className="flex flex-col gap-2">
          {[
            { step: '1', label: 'Skicka in bolagshandlingar', desc: 'Registreringsbevis, org-nr, F-skattbevis' },
            { step: '2', label: 'Teckna NDA & DPA', desc: 'Om tillämpligt — skickas digitalt' },
            { step: '3', label: 'Godkänn leverantörsavtal', desc: 'Standard eller förhandlat ramavtal' },
            { step: '4', label: 'Registrering', desc: 'Kontakt bekräftar och aktiverar leverantörsstatus' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3 rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-[#E8B84B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</div>
              <div>
                <p className="text-sm font-semibold text-[#0A3D62]">{s.label}</p>
                <p className="text-xs text-[#7A6A55]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <ContactSection contacts={[
        { role: 'Procurement', name: 'Dennis Bjarnemark', email: 'dennis@wavult.com' },
        { role: 'Finance & Faktura', name: 'Winston Bjarnemark', email: 'winston@wavult.com' },
      ]} />
    </div>
  )
}

function PartnerView() {
  const { data: entities, isLoading } = useCorpEntities()
  const primaryEntity = entities?.[0]

  return (
    <div className="flex flex-col gap-5">
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ minHeight: '140px' }}>
        <img src="/images/os-briefing-map.jpg" alt="Partners" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D62]/80 via-[#0A3D62]/50 to-transparent" />
        <div className="relative z-10 p-8" style={{ minHeight: '140px' }}>
          <p className="text-[#E8B84B] text-xs font-bold uppercase tracking-widest mb-1">Partnerinformation</p>
          <h1 className="text-2xl font-extrabold text-white">Wavult Group — Partnerportal</h1>
        </div>
      </div>

      {isLoading ? <Spinner /> : primaryEntity && (
        <SectionCard>
          <SectionTitle icon="🏢" title="Bolagsinformation" />
          <InfoList items={[
            { label: 'Bolagsnamn', value: primaryEntity.name },
            { label: 'Jurisdiktion', value: primaryEntity.jurisdiction },
            { label: 'Status', value: primaryEntity.status === 'aktiv' ? 'Aktiv' : primaryEntity.status },
          ]} />
        </SectionCard>
      )}

      <SectionCard>
        <SectionTitle icon="🔌" title="Integrationer & API" />
        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
            <p className="font-semibold text-[#0A3D62] text-sm">Wavult Core API</p>
            <p className="text-xs text-[#7A6A55] mt-0.5">REST API för integrerande partners — autentisering via API-nyckel eller OAuth 2.0</p>
            <Badge label="På förfrågan" variant="gold" />
          </div>
          <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
            <p className="font-semibold text-[#0A3D62] text-sm">Webhook Events</p>
            <p className="text-xs text-[#7A6A55] mt-0.5">Realtidshändelser för statusuppdateringar och transaktioner</p>
            <Badge label="Beta" variant="gold" />
          </div>
          <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
            <p className="font-semibold text-[#0A3D62] text-sm">Sandbox-miljö</p>
            <p className="text-xs text-[#7A6A55] mt-0.5">Testmiljö tillgänglig för certifierade partnerintegrationer</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="📑" title="Kommersiella villkor" />
        <InfoList items={[
          { label: 'Partneravtal', value: 'Krävs innan API-access' },
          { label: 'Revenue share', value: 'Enligt avtal' },
          { label: 'Avtalsperiod', value: '12 månader (förnyas automatiskt)' },
          { label: 'NDA', value: 'Ingår i partneravtalet' },
        ]} />
      </SectionCard>

      <ContactSection contacts={[
        { role: 'Partnerships', name: 'Erik Svensson', email: 'erik@wavult.com' },
        { role: 'Teknisk integration', name: 'Johan Berglund', email: 'johan@wavult.com' },
      ]} />
    </div>
  )
}

function CustomerView() {
  const { activeEntity } = useEntityScope()
  const { data: entities, isLoading } = useCorpEntities()
  const primaryEntity = entities?.find(e => e.id === activeEntity.id) ?? entities?.[0]
  const products = ENTITY_PRODUCTS[activeEntity.id] ?? ENTITY_PRODUCTS['1']

  return (
    <div className="flex flex-col gap-5">
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ minHeight: '140px' }}>
        <img src="/images/os-command-center.jpg" alt="Kunder" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D62]/80 via-[#0A3D62]/50 to-transparent" />
        <div className="relative z-10 p-8" style={{ minHeight: '140px' }}>
          <p className="text-[#E8B84B] text-xs font-bold uppercase tracking-widest mb-1">Kundportal</p>
          <h1 className="text-2xl font-extrabold text-white">Wavult Group — Kundinformation</h1>
        </div>
      </div>

      {isLoading ? <Spinner /> : primaryEntity && (
        <SectionCard>
          <SectionTitle icon="🏢" title="Om oss" />
          <div className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
            <p className="text-sm text-[#0A3D62]">
              {primaryEntity.name} är en {primaryEntity.jurisdiction}-baserad tech-koncern som bygger
              verksamhetssystem och intelligenstjänster för moderna företag.
            </p>
          </div>
          <div className="mt-3">
            <InfoList items={[
              { label: 'Jurisdiktion', value: primaryEntity.jurisdiction },
              { label: 'Status', value: primaryEntity.status === 'aktiv' ? 'Aktiv' : primaryEntity.status },
            ]} />
          </div>
        </SectionCard>
      )}

      <SectionCard>
        <SectionTitle icon="📦" title="Produkter & Tjänster" />
        <div className="flex flex-col gap-2">
          {products.map(p => (
            <div key={p.name} className="rounded-xl border border-[#E8D9C0] bg-white/50 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-[#0A3D62] text-sm">{p.name}</p>
                <Badge label={p.badge} variant={p.badge === 'Enterprise' ? 'neutral' : p.badge === 'Beta' ? 'gold' : 'neutral'} />
              </div>
              <p className="text-xs text-[#7A6A55]">{p.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon="🛠️" title="Support" />
        <InfoList items={[
          { label: 'E-post support', value: 'support@wavult.com' },
          { label: 'Svarstid', value: 'Inom 2 arbetsdagar' },
          { label: 'Affärstider', value: 'Mån–Fre 09:00–18:00 (CET/GST)' },
          { label: 'SLA', value: 'Enligt avtal' },
        ]} />
      </SectionCard>

      <ContactSection contacts={[
        { role: 'Kundansvarig', name: 'Leon Russo De Cerame', email: 'leon@wavult.com' },
        { role: 'Teknisk support', name: 'Johan Berglund', email: 'johan@wavult.com' },
      ]} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompendiumView() {
  const [audience, setAudience] = useState<Audience>('investor')

  function handleDownloadPDF() {
    window.print()
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#F5F0E8' }}
    >
      {/* ── Top bar ────────────────────────────────────────── */}
      <div
        className="px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ background: '#F5F0E8', borderColor: '#E8D9C0' }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h1 className="text-[15px] font-bold text-[#0A3D62]">Corporate Compendium</h1>
              <p className="text-xs text-[#9A8870] font-mono">Wavult Group · Version 2.0 · {new Date().toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })} · Konfidentiellt</p>
            </div>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
            style={{ background: '#0A3D62', color: '#fff' }}
          >
            <span>⬇</span>
            Exportera PDF
          </button>
        </div>
      </div>

      {/* ── Audience switcher ───────────────────────────────── */}
      <div
        className="flex gap-1 px-4 md:px-6 py-2 border-b flex-shrink-0 overflow-x-auto"
        style={{ background: '#F5F0E8', borderColor: '#E8D9C0' }}
      >
        {AUDIENCE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setAudience(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={
              audience === tab.id
                ? { background: '#0A3D62', color: '#fff' }
                : { color: '#7A6A55', background: 'transparent' }
            }
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          {audience === 'investor' && <InvestorView />}
          {audience === 'staff' && <StaffView />}
          {audience === 'supplier' && <SupplierView />}
          {audience === 'partner' && <PartnerView />}
          {audience === 'customer' && <CustomerView />}
        </div>
      </div>
    </div>
  )
}
