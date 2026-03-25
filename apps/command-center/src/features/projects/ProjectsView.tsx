import { useState, useEffect } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Countdown ────────────────────────────────────────────────────────────────

const THAILAND_DATE = new Date('2026-04-11T00:00:00+07:00')

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-4xl font-bold tabular-nums text-white px-4 py-3 rounded-xl"
        style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', minWidth: 72, textAlign: 'center' }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ─── Project data ─────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    id: 'quixzoom',
    name: 'quiXzoom',
    tagline: 'Global crowdsourcad kamerainfrastruktur',
    color: '#3B82F6',
    icon: '📸',
    status: 'in-dev',
    statusLabel: 'Under Utveckling',
    entity_id: 'quixzoom-uab',
    kpis: [
      { label: 'Aktiva fotografer', value: '0', note: 'Pre-launch' },
      { label: 'Uppdrag idag', value: '0', note: 'Pre-launch' },
      { label: 'Bilder insamlade', value: '0', note: 'Pre-launch' },
      { label: 'Plattform ETA', value: 'Q3 2026', note: 'Post-Thailand' },
    ],
    links: [
      { label: 'GitHub', url: 'https://github.com/wolfoftyreso-debug/hypbit' },
      { label: 'AWS ECS', url: 'https://console.aws.amazon.com/ecs/home?region=eu-north-1' },
    ],
    milestones: [
      { done: true, text: 'Konceptdesign klar' },
      { done: true, text: 'Tech-stack vald (Node + React + Supabase)' },
      { done: false, text: 'MVP photographer-app' },
      { done: false, text: 'Kartintegration (uppdrag-pin)' },
      { done: false, text: 'Beta-lansering' },
    ],
  },
  {
    id: 'optic-insights',
    name: 'Optic Insights',
    tagline: 'AI-analyserad intelligens till infrastrukturägare',
    color: '#06B6D4',
    icon: '🔭',
    status: 'planning',
    statusLabel: 'Planering',
    entity_id: 'wavult-group',
    kpis: [
      { label: 'B2B-kunder', value: '0', note: 'Pre-launch' },
      { label: 'Aktiva alerter', value: '0', note: 'Pre-launch' },
      { label: 'MRR', value: 'SEK 0', note: 'Pre-launch' },
      { label: 'ETA', value: 'Q4 2026', note: 'Post-quiXzoom MVP' },
    ],
    links: [
      { label: 'Affärsplan', url: '#' },
    ],
    milestones: [
      { done: true, text: 'Affärsplan klar' },
      { done: false, text: 'Första pilot-kund identifierad' },
      { done: false, text: 'AI-analysmotor (PoC)' },
      { done: false, text: 'Portal MVP' },
      { done: false, text: 'Kommersiell lansering' },
    ],
  },
  {
    id: 'quixom-ads',
    name: 'Quixom Ads',
    tagline: 'Hyperlokal annonsering på karta — kommersiell dataplattform',
    color: '#F59E0B',
    icon: '📍',
    status: 'concept',
    statusLabel: 'Koncept',
    entity_id: 'quixom-ads',
    kpis: [
      { label: 'Annonsörer', value: '0', note: 'Pre-launch' },
      { label: 'Ad-impressions', value: '0', note: 'Pre-launch' },
      { label: 'CPM (est.)', value: 'TBD', note: 'Fastställs i GTM' },
      { label: 'ETA', value: '2027', note: 'Beroende av quiXzoom scale' },
    ],
    links: [],
    milestones: [
      { done: true, text: 'Konceptbeslut fattat' },
      { done: false, text: 'Ad-format definierade' },
      { done: false, text: 'Marketplace-spec klar' },
      { done: false, text: 'Pilot med annonsör' },
    ],
  },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'in-dev':  { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  planning:  { bg: 'rgba(6,182,212,0.12)',    color: '#06B6D4' },
  concept:   { bg: 'rgba(245,158,11,0.12)',   color: '#F59E0B' },
  live:      { bg: 'rgba(16,185,129,0.12)',   color: '#10B981' },
}

// ─── Components ───────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

function Milestone({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span style={{ color: done ? '#10B981' : '#4B5563', flexShrink: 0 }}>
        {done ? '✓' : '○'}
      </span>
      <span style={{ color: done ? '#9CA3AF' : '#6B7280', textDecoration: done ? 'line-through' : 'none' }}>
        {text}
      </span>
    </div>
  )
}

function ProjectCard({ project }: { project: typeof PROJECTS[0] }) {
  const style = STATUS_STYLE[project.status] || STATUS_STYLE.concept
  const done = project.milestones.filter(m => m.done).length
  const total = project.milestones.length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: project.color + '18', border: `1px solid ${project.color}30` }}
        >
          {project.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">{project.name}</h3>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: style.bg, color: style.color }}
            >
              {project.statusLabel}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{project.tagline}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {project.kpis.map(kpi => (
          <div key={kpi.label} className="bg-surface-overlay rounded-lg px-3 py-2.5">
            <div className="text-xs text-gray-500 mb-0.5">{kpi.label}</div>
            <div className="text-sm font-bold text-white tabular-nums">{kpi.value}</div>
            {kpi.note && <div className="text-xs text-gray-600 mt-0.5">{kpi.note}</div>}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Milestones ({done}/{total})</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: project.color }}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          {project.milestones.map((m, i) => (
            <Milestone key={i} done={m.done} text={m.text} />
          ))}
        </div>
      </div>

      {/* Links */}
      {project.links.length > 0 && (
        <div className="flex gap-2 pt-1">
          {project.links.map(link => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2.5 py-1 rounded-md text-gray-400 hover:text-white transition-colors"
              style={{ background: project.color + '15', border: `1px solid ${project.color}25` }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProjectsView() {
  const cd = useCountdown(THAILAND_DATE)
  const { activeEntity, isInScope } = useEntityScope()
  const isRoot = activeEntity.layer === 0

  // Filter projects by scope
  const visibleProjects = isRoot
    ? PROJECTS
    : PROJECTS.filter(p => isInScope(p.entity_id))

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Projekt & KPI:er</h1>
        <p className="text-gray-400 mt-1">
          {isRoot
            ? 'Wavult Group — alla aktiva initiativ'
            : `Showing projects in ${activeEntity.name}`}
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

      {/* Thailand Countdown */}
      <div
        className="rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.10) 100%)',
          border: '1px solid rgba(139,92,246,0.30)',
        }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🇹🇭</span>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Thailand Workcamp</span>
          </div>
          <h2 className="text-xl font-bold text-white">11 april 2026</h2>
          <p className="text-sm text-gray-400 mt-1">
            Vecka 1: teambuilding + utbildning. Sedan: alla projekt redo att rullas ut.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <CountdownBlock value={cd.days} label="dagar" />
          <span className="text-2xl text-gray-600 mb-7">:</span>
          <CountdownBlock value={cd.hours} label="timmar" />
          <span className="text-2xl text-gray-600 mb-7">:</span>
          <CountdownBlock value={cd.minutes} label="minuter" />
          <span className="text-2xl text-gray-600 mb-7">:</span>
          <CountdownBlock value={cd.seconds} label="sekunder" />
        </div>
      </div>

      {/* Project Cards */}
      <div>
        <SectionHeading>Aktiva Projekt</SectionHeading>
        {visibleProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-3xl mb-3">📂</p>
            <p className="text-sm">No projects in {activeEntity.name}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {visibleProjects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
