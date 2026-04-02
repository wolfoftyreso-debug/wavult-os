import { IllustrationModule } from '../../shared/ui/IllustrationModule'
import { useState } from 'react'
import { useRole } from '../../shared/auth/RoleContext'
import { CommandDashboard } from './CommandDashboard'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useTranslation } from '../../shared/i18n/useTranslation'
import { useVisaAlerts } from '../visa/useVisaAlerts'

// ─── Help banner for first-time users ────────────────────────────────────────
function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('wavult-banner-dismissed'))
  if (dismissed) return null
  return (
    <div className="mb-6 rounded-xl p-4 flex items-start gap-3 reveal card-interactive" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: "3px solid var(--color-accent)" }}>
      <span className="text-xl flex-shrink-0">👋</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>Välkommen till Wavult OS</p>
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
        background: top.severity === 'critical' ? '#7f1d1d22' : '#78350f22',
        border: `1px solid ${top.severity === 'critical' ? '#ef444430' : '#f59e0b30'}`,
      }}
    >
      <span style={{ fontSize: 15 }}>🛂</span>
      <span style={{ color: top.severity === 'critical' ? '#fca5a5' : '#fcd34d' }}>
        {top.person}: {top.message}
        {alerts.length > 1 && ` (+${alerts.length - 1} till)`}
      </span>
      <a href="/visa" className="ml-auto text-blue-400 hover:text-blue-300 transition-colors">Visa detaljer →</a>
    </div>
  )
}

// ─── CEO Dashboard ─────────────────────────────────────────────────────────────
function CeoDashboard() {
  return (
    <div className="space-y-8 max-w-6xl">
      <VisaAlertBanner />
      <WelcomeBanner />
      <div>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Group CEO</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Strategisk överblick — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktiva bolag', value: '6', delta: 'WGH, WOP, QZ UAB, QZ Inc, LVX AB, LVX Inc', color: '#2563EB' },
          { label: 'Team online', value: '5', delta: 'Alla kärnroller bemannade', color: '#10B981' },
          { label: 'Kapital allokerat', value: 'Q2', delta: 'Thailand workcamp — 11 april', color: '#F59E0B' },
          { label: 'Marknadsfas', value: 'SE', delta: 'Sverige, mitten juni 2026', color: '#3B82F6' },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>{s.delta}</div>
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
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CEO Operations</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Daglig drift & execution — Wavult Operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktiva initiativ', value: '8', delta: '3 blockerade', color: '#10B981' },
          { label: 'Team kapacitet', value: '5/5', delta: 'Alla roller bemannade', color: '#3B82F6' },
          { label: 'Thailand nedräkning', value: '17d', delta: '11 april 2026', color: '#F59E0B' },
          { label: 'Delivery pace', value: 'Hög', delta: 'Q1 sprint aktiv', color: '#2563EB' },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>{s.delta}</div>
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
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CFO</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Finansiell kontroll — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bolag med ekonomi', value: '6', delta: 'WGH, WOP, QZ UAB, QZ Inc, LVX AB, LVX Inc', color: '#3B82F6' },
          { label: 'Infrastruktur (AWS)', value: 'Live', delta: 'eu-north-1 · ECS · S3 multi-region', color: '#10B981' },
          { label: 'Transfer pricing', value: 'Ej satt', delta: 'Kräver CLO + extern rådgivare', color: '#FF9500' },
          { label: 'Dubai holding', value: 'Planerat', delta: 'Väntar på bolagsbildning', color: '#2563EB' },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>{s.delta}</div>
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
            { text: 'Supabase US East — planerat (OI US expansion)', status: 'planned' },
          ]}
        </Section>
        <Section title="Infrastrukturkostnader (aktiva)">
          {[
            { text: 'AWS ECS eu-north-1 — wavult-api + quixzoom-api', status: 'active' },
            { text: 'S3: 4 buckets (EU + US primär + backup)', status: 'active' },
            { text: 'Supabase West EU — quixzoom-v2 + wavult-os projekt', status: 'active' },
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
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Group CTO</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Teknisk arkitektur & infrastruktur — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'API Services', value: '2', delta: 'wavult-api + quixzoom-api live', color: '#06B6D4' },
          { label: 'Supabase', value: '2', delta: 'quixzoom-v2 + wavult-os (EU West)', color: '#3ECF8E' },
          { label: 'S3 Buckets', value: '4', delta: 'EU + US, CRR aktiv', color: '#FF9500' },
          { label: 'CF Pages', value: '10/10', delta: 'Max — behöver frigöra slots', color: '#FF3B30' },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Infrastruktur — live">
          {[
            { text: 'wavult-api — ECS eu-north-1, api.wavult.com', status: 'active' },
            { text: 'quixzoom-api — ECS cluster wavult, task def :2', status: 'active' },
            { text: 'quiXzoom frontend — S3 + CloudFront (dewrtqzc20flx)', status: 'active' },
            { text: 'Supabase lpeipzdm — 13 migrationer live', status: 'active' },
            { text: 'S3 multi-region — CRR eu→eu + us→us', status: 'active' },
          ]}
        </Section>
        <Section title="Öppna tekniska TODO">
          {[
            { text: 'CF Pages-slots: ta bort landvex-fr/nl/de/fi/be/it (6 projekt)', status: 'blocked' },
            { text: 'Supabase US East — planerat (OI US expansion)', status: 'planned' },
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
        <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Chief Legal & Compliance</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4, fontSize: 14 }}>Bolagsstruktur, avtal & risk — Wavult Ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bolag totalt', value: '6', delta: '2 Dubai · 2 EU · 2 US', color: '#F59E0B' },
          { label: 'Aktiva bolag', value: '1', delta: 'Landvex AB (Sverige) live', color: '#10B981' },
          { label: 'Under bildning', value: '5', delta: 'Dubai, Delaware, Texas, Litauen', color: '#FF9500' },
          { label: 'IP-skydd', value: 'Ej satt', delta: 'Ska ligga i Wavult Group Dubai', color: '#FF3B30' },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>{s.delta}</div>
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
      <h2 style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</h2>
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {children.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3.5"
            style={{ borderBottom: i < children.length - 1 ? '1px solid var(--color-border)' : 'none' }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[item.status] ?? '#6B7280' }}
            />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)", flex: 1 }}>{item.text}</span>
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
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium mb-1 reveal card-interactive"
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
        <span className="text-text-muted ml-1">— scoped view</span>
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
