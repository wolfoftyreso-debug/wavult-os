import { QUIXZOOM_MILESTONES, SWEDEN_LAUNCH_DATE, getDaysUntil, getStatusColor, getStatusLabel } from './data'

// Simple CSS-based Gantt timeline
// Timeline spans April 2026 → June 2026 (3 months)
const TIMELINE_START = new Date('2026-04-01')
const TIMELINE_END = new Date('2026-06-30')
const TOTAL_DAYS = Math.ceil(
  (TIMELINE_END.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24)
)

const MONTHS = ['Apr', 'Maj', 'Jun']

function dateToPct(dateStr: string): number {
  const d = new Date(dateStr)
  const diff = (d.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.min(100, (diff / TOTAL_DAYS) * 100))
}

function GanttBar({ startDate, endDate, color, status }: {
  startDate: string
  endDate: string
  color: string
  status: string
}) {
  const left = dateToPct(startDate)
  const right = dateToPct(endDate)
  const width = Math.max(2, right - left)
  const isDone = status === 'done'
  const isInProgress = status === 'in-progress'

  return (
    <div className="relative h-6 w-full">
      {/* Track */}
      <div className="absolute inset-y-2 inset-x-0 bg-white/[0.04] rounded-full" />
      {/* Bar */}
      <div
        className="absolute inset-y-1 rounded-full transition-all"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          background: isDone ? color : isInProgress ? color + 'CC' : color + '40',
          border: `1px solid ${color}${isDone ? '' : '60'}`,
        }}
      >
        {isInProgress && (
          <div className="absolute right-0 top-0 bottom-0 w-2 rounded-r-full animate-pulse" style={{ background: color }} />
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status as any)
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: color + '15', color }}
    >
      {getStatusLabel(status as any)}
    </span>
  )
}

export function QuixzoomLaunchView() {
  const daysLeft = getDaysUntil(SWEDEN_LAUNCH_DATE)
  const done = QUIXZOOM_MILESTONES.filter(m => m.status === 'done').length
  const pct = Math.round((done / QUIXZOOM_MILESTONES.length) * 100)

  // Today's position on timeline
  const todayPct = dateToPct(new Date().toISOString().split('T')[0])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl p-5 border border-blue-500/20 bg-blue-500/08">
        <div className="flex items-center gap-4">
          <span className="text-4xl">📷</span>
          <div className="flex-1">
            <h2 className="text-[18px] font-bold text-white">quiXzoom — Sverige-launch</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mitten juni 2026 · Crowdsourcad kamerainfrastruktur</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 bg-white/[0.08] rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-white">{pct}%</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-4xl font-bold leading-none text-blue-400">{daysLeft}</p>
            <p className="text-xs text-gray-400 font-mono mt-1">dagar kvar</p>
          </div>
        </div>
      </div>

      {/* Milestone list */}
      <div>
        <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">Milstolpar</h3>
        <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden divide-y divide-white/[0.04]">
          {QUIXZOOM_MILESTONES.map(m => {
            const daysToEnd = getDaysUntil(m.endDate)
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">
                  {m.status === 'done' ? '✅' : m.status === 'in-progress' ? '🔄' : '⏳'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${m.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
                    {m.title}
                  </p>
                  <p className="text-[9px] text-gray-600 font-mono mt-0.5">👤 {m.owner}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <StatusBadge status={m.status} />
                  <p
                    className="text-[9px] font-mono"
                    style={{ color: daysToEnd <= 0 ? '#EF4444' : daysToEnd <= 14 ? '#F59E0B' : '#6B7280' }}
                  >
                    {new Date(m.endDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gantt timeline */}
      <div>
        <h3 className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">
          Tidslinje — Apr → Jun 2026
        </h3>
        <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] p-4">
          {/* Month headers */}
          <div className="flex mb-3">
            {MONTHS.map((month, i) => (
              <div key={month} className="flex-1 text-center">
                <span className="text-[9px] font-mono text-gray-500">{month}</span>
                {i < MONTHS.length - 1 && (
                  <div className="absolute h-full border-l border-white/[0.06]" />
                )}
              </div>
            ))}
          </div>

          {/* Today line */}
          <div className="relative">
            {todayPct >= 0 && todayPct <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-yellow-400/50 z-10"
                style={{ left: `${todayPct}%` }}
              >
                <div className="absolute -top-4 left-1 text-[8px] font-mono text-yellow-400 whitespace-nowrap">IDAG</div>
              </div>
            )}

            {/* Bars */}
            <div className="space-y-2 pt-4">
              {QUIXZOOM_MILESTONES.map(m => {
                const color = getStatusColor(m.status)
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-40 flex-shrink-0 truncate">{m.title}</span>
                    <div className="flex-1">
                      <GanttBar
                        startDate={m.startDate}
                        endDate={m.endDate}
                        color={color}
                        status={m.status}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
            {[
              { color: '#10B981', label: 'Klar' },
              { color: '#3B82F6', label: 'Pågår' },
              { color: '#6B7280', label: 'Planerad' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-2 w-6 rounded-full" style={{ background: color }} />
                <span className="text-[9px] text-gray-500 font-mono">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
