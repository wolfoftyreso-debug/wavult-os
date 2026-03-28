import {
  THAILAND_CHECKLIST,
  QUIXZOOM_MILESTONES,
  BOLAG_LIST,
  ROADMAP_ITEMS,
  THAILAND_DATE,
  SWEDEN_LAUNCH_DATE,
  getDaysUntil,
  getStatusColor,
  getStatusLabel,
  PROJECT_META,
  type MilestoneStatus,
  type ProjectKey,
} from './data'

interface AggregatedMilestone {
  id: string
  project: ProjectKey
  title: string
  status: MilestoneStatus
  deadline: string
  owner: string
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({
  progress,
  size = 56,
  stroke = 4,
  color,
  label,
}: {
  progress: number
  size?: number
  stroke?: number
  color: string
  label?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (progress / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff10" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
          fill={color}
          fontSize={10}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {progress}%
        </text>
      </svg>
      {label && <span className="text-[9px] text-gray-500 font-mono text-center leading-tight max-w-[60px]">{label}</span>}
    </div>
  )
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function CountdownCard({ title, date, color, icon, urgent }: {
  title: string
  date: string
  color: string
  icon: string
  urgent?: boolean
}) {
  const days = getDaysUntil(date)
  const d = new Date(date)
  const dateLabel = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      className="rounded-xl p-4 border flex items-center gap-4"
      style={{
        background: color + (urgent ? '12' : '08'),
        borderColor: color + (urgent ? '40' : '20'),
      }}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
      </div>
      <div className="text-right">
        <p
          className="text-3xl font-bold leading-none"
          style={{ color: days <= 7 ? '#EF4444' : days <= 30 ? '#F59E0B' : color }}
        >
          {days}
        </p>
        <p className="text-[9px] text-gray-500 font-mono mt-0.5">dagar kvar</p>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: string
}) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: color + '08', borderColor: color + '20' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MilestonesOverview() {
  // Aggregate all milestones into a unified shape
  const allMilestones: AggregatedMilestone[] = [
    ...THAILAND_CHECKLIST.map(m => ({
      id: m.id,
      project: 'thailand' as const,
      title: m.title,
      status: m.status,
      deadline: m.deadline,
      owner: m.owner,
    })),
    ...QUIXZOOM_MILESTONES.map(m => ({
      id: m.id,
      project: 'quixzoom' as const,
      title: m.title,
      status: m.status,
      deadline: m.endDate,
      owner: m.owner,
    })),
    ...BOLAG_LIST.map(b => ({
      id: b.id,
      project: 'bolagsstruktur' as const,
      title: b.name,
      status: (b.progress >= 100 ? 'done' : b.blockers.length > 0 ? 'delayed' : 'in-progress') as MilestoneStatus,
      deadline: b.estimatedDate,
      owner: b.owner,
    })),
    ...ROADMAP_ITEMS.filter(r => r.deadline).map(r => ({
      id: r.id,
      project: r.project,
      title: r.title,
      status: r.status,
      deadline: r.deadline as string,
      owner: r.owner ?? '',
    })),
  ]

  const total = allMilestones.length
  const done = allMilestones.filter(m => m.status === 'done').length
  const inProgress = allMilestones.filter(m => m.status === 'in-progress').length
  const delayed = allMilestones.filter(m => m.status === 'delayed').length

  // Top 5 critical — pending/in-progress sorted by deadline
  const critical = [...allMilestones]
    .filter(m => m.status !== 'done' && m.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)

  // Project progress
  const projectKeys = ['quixzoom', 'landvex', 'hypbit', 'bolagsstruktur', 'thailand'] as const
  const projectProgress = projectKeys.map(key => {
    const items = allMilestones.filter(m => m.project === key)
    if (items.length === 0) return null
    const doneCount = items.filter(m => m.status === 'done').length
    const pct = Math.round((doneCount / items.length) * 100)
    return { key, pct, meta: PROJECT_META[key], count: items.length, done: doneCount }
  }).filter(Boolean) as { key: string; pct: number; meta: typeof PROJECT_META[keyof typeof PROJECT_META]; count: number; done: number }[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Milestones Översikt</h2>
        <p className="text-xs text-gray-500 mt-0.5">Wavult Group — alla projekt</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Totalt" value={total} color="#6B7280" icon="🗂️" />
        <KpiCard label="Klara" value={done} color="#10B981" icon="✅" />
        <KpiCard label="Pågående" value={inProgress} color="#3B82F6" icon="⚡" />
        <KpiCard label="Försenade" value={delayed} color="#EF4444" icon="⚠️" />
      </div>

      {/* Countdowns */}
      <div className="space-y-3">
        <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider">Nedräkningar</h3>
        <CountdownCard
          title="Thailand Workcamp"
          date={THAILAND_DATE}
          color="#EF4444"
          icon="🇹🇭"
          urgent
        />
        <CountdownCard
          title="Sverige-launch quiXzoom"
          date={SWEDEN_LAUNCH_DATE}
          color="#3B82F6"
          icon="🚀"
        />
      </div>

      {/* Critical milestones */}
      <div>
        <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">
          Kritiska milstolpar — närmast i tid
        </h3>
        <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden divide-y divide-white/[0.04]">
          {critical.map(m => {
            const days = getDaysUntil(m.deadline)
            const color = getStatusColor(m.status)
            const proj = PROJECT_META[m.project as keyof typeof PROJECT_META]
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">{proj?.icon ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono text-gray-600">{proj?.label}</span>
                    {m.owner && <span className="text-[9px] text-gray-600">· {m.owner}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className="text-xs font-mono font-bold"
                    style={{ color: days <= 7 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#6B7280' }}
                  >
                    {days <= 0 ? 'IDAG' : `${days}d`}
                  </p>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ background: color + '15', color }}
                  >
                    {getStatusLabel(m.status)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per project progress rings */}
      <div>
        <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">
          Progress per projekt
        </h3>
        <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] p-5">
          <div className="flex flex-wrap gap-6 justify-around">
            {projectProgress.map(pp => (
              <div key={pp.key} className="flex flex-col items-center gap-2">
                <ProgressRing progress={pp.pct} color={pp.meta.color} size={64} stroke={5} />
                <div className="text-center">
                  <p className="text-xs text-white font-medium">{pp.meta.icon} {pp.meta.label}</p>
                  <p className="text-[9px] text-gray-600 font-mono">{pp.done}/{pp.count} klara</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
