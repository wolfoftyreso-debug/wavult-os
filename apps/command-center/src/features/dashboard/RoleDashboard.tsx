import { useState } from 'react'
import { useRole } from '../../shared/auth/RoleContext'
import { CommandDashboard } from './CommandDashboard'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Help banner for first-time users ────────────────────────────────────────
function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('wavult-banner-dismissed'))
  if (dismissed) return null
  return (
    <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/8 p-4 flex items-start gap-3">
      <span className="text-xl flex-shrink-0">👋</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-1">Välkommen till Wavult OS</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Det här är ert operativsystem. Alla moduler i vänstermenyn har ett <strong className="text-gray-300">?</strong>-märke — klicka på det för att förstå vad en flik eller funktion gör. Byt bolag med <strong className="text-gray-300">väljaren uppe till vänster</strong>.
        </p>
      </div>
      <button
        onClick={() => { localStorage.setItem('wavult-banner-dismissed', '1'); setDismissed(true) }}
        className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}

// ─── CEO Dashboard ─────────────────────────────────────────────────────────────
function CeoDashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <WelcomeBanner />
      <div>
        <h1 className="text-sm font-semibold text-white">Group CEO</h1>
        <p className="text-gray-400 mt-1">Strategisk överblick — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktiva bolag', value: '6', delta: 'WGH, WOP, QZ UAB, QZ Inc, LVX AB, LVX Inc', color: '#8B5CF6' },
          { label: 'Team online', value: '5', delta: 'Alla kärnroller bemannade', color: '#10B981' },
          { label: 'Kapital allokerat', value: 'Q2', delta: 'Thailand workcamp — 11 april', color: '#F59E0B' },
          { label: 'Marknadsfas', value: 'SE', delta: 'Sverige, mitten juni 2026', color: '#3B82F6' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-2">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Strategiska prioriteringar">
          {[
            { text: 'Thailand workcamp — projektstart 11 april', status: 'active' },
            { text: 'Bolagsstruktur Dubai — Wavult Group + Operations', status: 'active' },
            { text: 'quiXzoom MVP — Sverige juni 2026', status: 'active' },
            { text: 'Landvex enterprise launch — Q3 2026', status: 'planned' },
            { text: 'Texas LLC incorporation (Landvex Inc)', status: 'in-progress' },
          ]}
        </Section>
        <Section title="Kapitalallokering">
          {[
            { text: 'Wavult Operations — core team, system, drift', status: 'active' },
            { text: 'quiXzoom — MVP build + launch Sverige', status: 'active' },
            { text: 'Landvex — enterprise infrastruktur', status: 'planned' },
            { text: 'Quixom Ads — fas 2 (efter quiXzoom)', status: 'planned' },
          ]}
        </Section>
      </div>

      <Section title="Beslutslogg (senaste)">
        {[
          { text: 'Hypbit-bilverkstad skrotad — fokus internt system', status: 'done' },
          { text: 'Landvex AB (Sverige) — registrerat och aktivt', status: 'done' },
          { text: 'S3 multi-region bildlagring — EU + US live', status: 'done' },
          { text: 'OI Regional Architecture — EU/US separata instanser', status: 'done' },
          { text: 'Rollstruktur fastställd — 6 C-suite roller definierade', status: 'done' },
        ]}
      </Section>
    </div>
  )
}

// ─── CEO Operations Dashboard ──────────────────────────────────────────────────
function Opsdashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-sm font-semibold text-white">CEO Operations</h1>
        <p className="text-gray-400 mt-1">Daglig drift & execution — Wavult Operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktiva initiativ', value: '8', delta: '3 blockerade', color: '#10B981' },
          { label: 'Team kapacitet', value: '5/5', delta: 'Alla roller bemannade', color: '#3B82F6' },
          { label: 'Thailand nedräkning', value: '17d', delta: '11 april 2026', color: '#F59E0B' },
          { label: 'Delivery pace', value: 'Hög', delta: 'Q1 sprint aktiv', color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-2">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Aktiva initiativ">
          {[
            { text: 'Hypbit Command Center — rollsystem live', status: 'active' },
            { text: 'quiXzoom API — ECS eu-north-1 live', status: 'active' },
            { text: 'Landvex sajt — CF Pages, senaste deploy live', status: 'active' },
            { text: 'Bolagsstruktur UAE — väntar på rättslig rådgivning', status: 'blocked' },
            { text: 'Texas LLC — Dennis driver incorporation docs', status: 'in-progress' },
          ]}
        </Section>
        <Section title="Team — daglig status">
          {[
            { text: 'Johan: Hypbit infrastruktur + ECS pipeline', status: 'active' },
            { text: 'Winston: Kassaflöde + budgetuppföljning', status: 'active' },
            { text: 'Dennis: Texas LLC docs + compliance', status: 'in-progress' },
            { text: 'Leon: Q1 execution koordinering', status: 'active' },
            { text: 'Erik: Thailand workcamp + bolagsstruktur', status: 'active' },
          ]}
        </Section>
      </div>
    </div>
  )
}

// ─── CFO Dashboard ─────────────────────────────────────────────────────────────
function CfoDashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-sm font-semibold text-white">CFO</h1>
        <p className="text-gray-400 mt-1">Finansiell kontroll — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bolag med ekonomi', value: '6', delta: 'WGH, WOP, QZ UAB, QZ Inc, LVX AB, LVX Inc', color: '#3B82F6' },
          { label: 'Infrastruktur (AWS)', value: 'Live', delta: 'eu-north-1 · ECS · S3 multi-region', color: '#10B981' },
          { label: 'Transfer pricing', value: 'Ej satt', delta: 'Kräver CLO + extern rådgivare', color: '#FF9500' },
          { label: 'Dubai holding', value: 'Planerat', delta: 'Väntar på bolagsbildning', color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-2">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Finansiell struktur (att implementera)">
          {[
            { text: 'Intercompany service fee — WOP fakturerar dotterbolag', status: 'planned' },
            { text: 'IP-royalty — Wavult Group tar 5–15% på omsättning', status: 'planned' },
            { text: 'Transfer pricing-policy — kräver CLO + extern rådgivare', status: 'blocked' },
            { text: 'Separat bankkonto per bolag — storbank varje jurisdiktion', status: 'planned' },
            { text: 'Supabase US East — kräver Pro-uppgradering', status: 'planned' },
          ]}
        </Section>
        <Section title="Infrastrukturkostnader (aktiva)">
          {[
            { text: 'AWS ECS eu-north-1 — hypbit-api + quixzoom-api', status: 'active' },
            { text: 'S3: 4 buckets (EU + US primär + backup)', status: 'active' },
            { text: 'Supabase West EU — quixzoom-v2 + hypbit projekt', status: 'active' },
            { text: 'Cloudflare — 2 zoner, CF Pages (10/10 slots)', status: 'active' },
            { text: 'CF Pages — quiXzoom landing, Wavult, OI portals', status: 'active' },
          ]}
        </Section>
      </div>
    </div>
  )
}

// ─── CTO Dashboard ─────────────────────────────────────────────────────────────
function CtoDashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-sm font-semibold text-white">Group CTO</h1>
        <p className="text-gray-400 mt-1">Teknisk arkitektur & infrastruktur — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'API Services', value: '2', delta: 'hypbit-api + quixzoom-api live', color: '#06B6D4' },
          { label: 'Supabase', value: '2', delta: 'quixzoom-v2 + hypbit (EU West)', color: '#3ECF8E' },
          { label: 'S3 Buckets', value: '4', delta: 'EU + US, CRR aktiv', color: '#FF9500' },
          { label: 'CF Pages', value: '10/10', delta: 'Max — behöver frigöra slots', color: '#FF3B30' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-2">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Infrastruktur — live">
          {[
            { text: 'hypbit-api — ECS eu-north-1, api.bc.pixdrift.com', status: 'active' },
            { text: 'quixzoom-api — ECS cluster hypbit, task def :2', status: 'active' },
            { text: 'quiXzoom frontend — S3 + CloudFront (dewrtqzc20flx)', status: 'active' },
            { text: 'Supabase lpeipzdm — 13 migrationer live', status: 'active' },
            { text: 'S3 multi-region — CRR eu→eu + us→us', status: 'active' },
          ]}
        </Section>
        <Section title="Öppna tekniska TODO">
          {[
            { text: 'CF Pages-slots: ta bort landvex-fr/nl/de/fi/be/it (6 projekt)', status: 'blocked' },
            { text: 'Supabase US East — nytt projekt, kräver Pro-plan', status: 'planned' },
            { text: 'ECS us-east-1 — ny service för OI US API', status: 'planned' },
            { text: 'optical-insight-eu + optical-insight-us — CF Pages deploy', status: 'planned' },
            { text: 'CF Pages API-token — Erik skapar på dash.cloudflare.com', status: 'blocked' },
          ]}
        </Section>
      </div>

      <Section title="Stack">
        {[
          { text: 'TypeScript · Node.js/Express · React/Next.js', status: 'active' },
          { text: 'Supabase (PostgreSQL) · Docker · AWS ECS', status: 'active' },
          { text: 'Cloudflare · GitHub Actions · CF Pages · Stripe · Revolut', status: 'active' },
          { text: 'Trigger.dev · ECR: 155407238699.dkr.ecr.eu-north-1', status: 'active' },
        ]}
      </Section>
    </div>
  )
}

// ─── CLO Dashboard ─────────────────────────────────────────────────────────────
function CloDashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-sm font-semibold text-white">Chief Legal & Compliance</h1>
        <p className="text-gray-400 mt-1">Bolagsstruktur, avtal & risk — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bolag totalt', value: '6', delta: '2 Dubai · 2 EU · 2 US', color: '#F59E0B' },
          { label: 'Aktiva bolag', value: '1', delta: 'Landvex AB (Sverige) live', color: '#10B981' },
          { label: 'Under bildning', value: '5', delta: 'Dubai, Delaware, Texas, Litauen', color: '#FF9500' },
          { label: 'IP-skydd', value: 'Ej satt', delta: 'Ska ligga i Wavult Group Dubai', color: '#FF3B30' },
        ].map(s => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-2">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Bolagsstruktur — status">
          {[
            { text: 'Wavult Group (Holding, Dubai Free Zone A) — planerat', status: 'planned' },
            { text: 'Wavult Operations (Dubai Free Zone A) — planerat', status: 'planned' },
            { text: 'QuiXzoom UAB (Litauen) — planerat', status: 'planned' },
            { text: 'QuiXzoom Inc (Delaware) — planerat', status: 'planned' },
            { text: 'Landvex Inc (Texas/Houston) — under bildning', status: 'in-progress' },
            { text: 'Landvex AB (Sverige) — live', status: 'active' },
          ]}
        </Section>
        <Section title="Juridiska prioriteringar">
          {[
            { text: 'IP-överlåtelse — kod, varumärke → Wavult Group Dubai', status: 'planned' },
            { text: 'Intercompany-avtal — service fee + royalty-struktur', status: 'planned' },
            { text: 'Transfer pricing-policy — samverka med CFO + extern rådgivare', status: 'planned' },
            { text: 'GDPR-compliance — EU-data aldrig till US-buckets', status: 'active' },
            { text: 'Texas LLC — incorporation docs pågår', status: 'in-progress' },
          ]}
        </Section>
      </div>
    </div>
  )
}

// ─── CPO Dashboard (vakant) ────────────────────────────────────────────────────
function CpoDashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Chief Product Officer</h1>
        <p className="text-gray-400 mt-1">Produktstrategi & roadmap — Vakant (interim: Erik)</p>
      </div>

      <div className="bg-surface-raised border border-pink-500/20 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🧩</div>
        <div className="text-white font-semibold mb-1">Rollen är vakant</div>
        <div className="text-gray-400 text-sm">Erik Svensson håller CPO-ansvar interim tills rekrytering är klar</div>
        <div className="mt-4 text-xs text-gray-600">Nästa rekrytering — CPO är prioritet 1</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Produkter — aktiva">
          {[
            { text: 'quiXzoom — crowdsourcad kamerainfrastruktur (zoomer-plattform)', status: 'active' },
            { text: 'Optical Insight / Landvex — B2G kontrollsystem', status: 'active' },
            { text: 'Hypbit — internt operativsystem för Wavult Group', status: 'active' },
            { text: 'Quixom Ads — fas 2, monetisering av quiXzoom-data', status: 'planned' },
          ]}
        </Section>
        <Section title="Produktprinciper (låsta)">
          {[
            { text: 'Säg aldrig "AI" — säg optisk analys, vision engine, optical layer', status: 'active' },
            { text: 'Zoomers — aldrig fotografer, operatörer, fältpersonal', status: 'active' },
            { text: 'Landvex: Right control. Right cost. Right interval.', status: 'active' },
            { text: 'OI: Works on day one. Gets smarter every day you use it.', status: 'active' },
          ]}
        </Section>
      </div>
    </div>
  )
}

// ─── Shared Section component ──────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  done: '#6B7280',
  planned: '#3B82F6',
  'in-progress': '#F59E0B',
  blocked: '#EF4444',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  done: 'Klar',
  planned: 'Planerad',
  'in-progress': 'Pågår',
  blocked: 'Blockerad',
}

function Section({ title, children }: { title: string; children: { text: string; status: string }[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
        {children.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3.5"
            style={{ borderBottom: i < children.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[item.status] ?? '#6B7280' }}
            />
            <span className="text-sm text-gray-300 flex-1">{item.text}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                background: (STATUS_COLORS[item.status] ?? '#6B7280') + '18',
                color: STATUS_COLORS[item.status] ?? '#6B7280',
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

// ─── Scope Banner ──────────────────────────────────────────────────────────────
function ScopeBanner() {
  const { activeEntity } = useEntityScope()
  const isRoot = activeEntity.layer === 0

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium mb-1"
      style={{
        background: activeEntity.color + '12',
        border: `1px solid ${activeEntity.color}25`,
      }}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ background: activeEntity.color, boxShadow: `0 0 6px ${activeEntity.color}60` }}
      />
      <span style={{ color: activeEntity.color }}>
        {isRoot ? 'Viewing: Wavult Group (All entities)' : `Viewing: ${activeEntity.name}`}
      </span>
      {!isRoot && (
        <span className="text-gray-600 ml-1">— scoped view</span>
      )}
    </div>
  )
}

// ─── Router ────────────────────────────────────────────────────────────────────
export function RoleDashboard() {
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
      <ScopeBanner />
      {dashboard}
    </>
  )
}
