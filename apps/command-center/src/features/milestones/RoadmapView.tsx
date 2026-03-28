import { ROADMAP_ITEMS, PROJECT_META, getStatusColor, getStatusLabel, type ProjectKey } from './data'

type Quarter = 'Q2-2026' | 'Q3-2026' | 'Q4-2026'

const QUARTERS: { id: Quarter; label: string; months: string; color: string }[] = [
  { id: 'Q2-2026', label: 'Q2 2026', months: 'Apr – Jun', color: '#3B82F6' },
  { id: 'Q3-2026', label: 'Q3 2026', months: 'Jul – Sep', color: '#A78BFA' },
  { id: 'Q4-2026', label: 'Q4 2026', months: 'Okt – Dec', color: '#F59E0B' },
]

const PROJECTS: ProjectKey[] = ['quixzoom', 'landvex', 'hypbit']

function MilestoneChip({ item }: { item: typeof ROADMAP_ITEMS[0] }) {
  const color = getStatusColor(item.status)
  const meta = PROJECT_META[item.project]

  return (
    <div
      className="rounded-lg px-3 py-2 border flex items-start gap-2"
      style={{ background: color + '08', borderColor: color + '20' }}
    >
      <span className="text-base leading-none mt-0.5 flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-snug ${item.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
          {item.title}
        </p>
        {item.month && (
          <p className="text-[9px] text-gray-600 font-mono mt-0.5">{item.month} 2026</p>
        )}
      </div>
      <div
        className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
        style={{ background: color }}
        title={getStatusLabel(item.status)}
      />
    </div>
  )
}

export function RoadmapView() {
  const done = ROADMAP_ITEMS.filter(i => i.status === 'done').length
  const total = ROADMAP_ITEMS.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Roadmap 2026</h2>
          <p className="text-xs text-gray-500 mt-0.5">Q2–Q4 · quiXzoom · Landvex · Hypbit OS</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{done}/{total} klara</p>
          <div className="w-24 bg-white/[0.06] rounded-full h-1.5 mt-1">
            <div
              className="h-1.5 rounded-full bg-brand-accent transition-all"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Project legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {PROJECTS.map(key => {
          const meta = PROJECT_META[key]
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-base">{meta.icon}</span>
              <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          )
        })}
        <div className="ml-auto flex items-center gap-3">
          {[
            { color: '#10B981', label: 'Klar' },
            { color: '#3B82F6', label: 'Pågår' },
            { color: '#6B7280', label: 'Planerad' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-[9px] text-gray-500 font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline — column per quarter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {QUARTERS.map(q => {
          const quarterItems = ROADMAP_ITEMS.filter(i => i.quarter === q.id)
          const qDone = quarterItems.filter(i => i.status === 'done').length

          return (
            <div key={q.id} className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
              {/* Quarter header */}
              <div
                className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: q.color + '20', background: q.color + '08' }}
              >
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: q.color }}
                />
                <div>
                  <p className="text-sm font-bold text-white">{q.label}</p>
                  <p className="text-[9px] text-gray-500 font-mono">{q.months}</p>
                </div>
                <span
                  className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: q.color + '15', color: q.color }}
                >
                  {qDone}/{quarterItems.length}
                </span>
              </div>

              {/* Per project */}
              <div className="p-3 space-y-4">
                {PROJECTS.map(key => {
                  const meta = PROJECT_META[key]
                  const items = quarterItems.filter(i => i.project === key)
                  if (items.length === 0) return null

                  return (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm">{meta.icon}</span>
                        <span
                          className="text-xs font-semibold font-mono uppercase tracking-wide"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map(item => (
                          <MilestoneChip key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bolagsstruktur separate row */}
      <div>
        <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">
          🏛️ Bolagsstruktur
        </h3>
        <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {QUARTERS.map(q => {
              const items = ROADMAP_ITEMS.filter(i => i.quarter === q.id && i.project === 'bolagsstruktur')
              if (items.length === 0) return (
                <div key={q.id} className="text-center py-4">
                  <p className="text-xs text-gray-700 font-mono">—</p>
                </div>
              )
              return (
                <div key={q.id}>
                  <p className="text-[9px] font-mono text-gray-600 mb-2">{q.label}</p>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <MilestoneChip key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
