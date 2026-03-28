import { LEAVE_RECORDS, SWEDISH_HOLIDAYS_2026 } from './data'
import { usePayroll, type Employee } from './hooks/usePayroll'

const MONTH_NAMES_LONG = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']

function LeaveBar({ used, planned, entitled }: { used: number; planned: number; entitled: number }) {
  const usedPct = (used / entitled) * 100
  const plannedPct = (planned / entitled) * 100
  const remaining = Math.max(0, 100 - usedPct - plannedPct)
  return (
    <div className="h-2 rounded-full bg-surface-overlay overflow-hidden flex">
      <div className="h-full bg-amber-400 transition-all" style={{ width: `${usedPct}%` }} />
      <div className="h-full bg-blue-400/60 transition-all" style={{ width: `${plannedPct}%` }} />
      <div className="h-full bg-surface-border transition-all" style={{ width: `${remaining}%` }} />
    </div>
  )
}

function SimpleCalendar({ month, year, employees }: { month: number; year: number; employees: Employee[] }) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Mon-first

  const holidays = SWEDISH_HOLIDAYS_2026
    .filter(h => {
      const d = new Date(h.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .map(h => new Date(h.date).getDate())

  const allLeave: { day: number; emp: Employee }[] = []
  LEAVE_RECORDS.forEach(record => {
    const emp = employees.find(e => e.id === record.employeeId)
    if (!emp) return
    record.plannedLeave.forEach(pl => {
      const start = new Date(pl.start)
      const end = new Date(pl.end)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          allLeave.push({ day: d.getDate(), emp })
        }
      }
    })
  })

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
      <div className="text-xs font-semibold text-white mb-3">{MONTH_NAMES_LONG[month]} {year}</div>
      <div className="grid grid-cols-7 gap-px text-center text-xs text-gray-600 mb-1">
        {['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isHoliday = holidays.includes(day)
          const isToday = isCurrentMonth && today.getDate() === day
          const leaveEmps = allLeave.filter(l => l.day === day)
          return (
            <div
              key={i}
              title={isHoliday ? SWEDISH_HOLIDAYS_2026.find(h => new Date(h.date).getDate() === day && new Date(h.date).getMonth() === month)?.name : undefined}
              className={`relative flex flex-col items-center justify-start py-1 rounded text-xs min-h-[28px] ${
                isHoliday ? 'text-red-400' : isToday ? 'font-bold text-purple-300' : 'text-gray-400'
              } ${isToday ? 'ring-1 ring-purple-500/60 bg-purple-500/10' : ''}`}
            >
              <span>{day}</span>
              {leaveEmps.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {leaveEmps.slice(0, 3).map((le, j) => (
                    <div
                      key={j}
                      title={le.emp.name}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: le.emp.color }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LeaveView() {
  const today = new Date()
  const { employees, loading, error } = usePayroll()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Laddar semesterdata...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Fel: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Semester & Ledighet</h2>
        <p className="text-xs text-gray-500 mt-0.5">25 semesterdagar/år (semesterlagen) · Röda dagar markerade i rött</p>
      </div>

      {/* Per-person leave overview */}
      <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-white">Semesteröversikt 2026</h3>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="h-2 w-4 rounded-full bg-amber-400" />
              Uttaget
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="h-2 w-4 rounded-full bg-blue-400/60" />
              Planerat
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="h-2 w-4 rounded-full bg-surface-border" />
              Kvar
            </div>
          </div>
        </div>

        <div className="divide-y divide-surface-border/50">
          {employees.map(emp => {
            const record = LEAVE_RECORDS.find(l => l.employeeId === emp.id)
            const used = record?.daysUsed ?? 0
            const planned = record?.plannedLeave.reduce((s, pl) => s + pl.days, 0) ?? 0
            const entitled = record?.daysEntitled ?? 25
            const remaining = entitled - used - planned

            return (
              <div key={emp.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: emp.color + '22', color: emp.color }}
                    >
                      {emp.initials}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.role}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="text-xs font-semibold text-amber-400">{used}</div>
                      <div className="text-xs text-gray-600">uttaget</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-blue-400">{planned}</div>
                      <div className="text-xs text-gray-600">planerat</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-green-400">{remaining}</div>
                      <div className="text-xs text-gray-600">kvar</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-300">{entitled}</div>
                      <div className="text-xs text-gray-600">totalt</div>
                    </div>
                  </div>
                </div>
                <LeaveBar used={used} planned={planned} entitled={entitled} />

                {/* Planned leave details */}
                {record && record.plannedLeave.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {record.plannedLeave.map((pl, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{pl.start} → {pl.end} ({pl.days} dagar)</span>
                        <span className={pl.approved ? 'text-green-400' : 'text-amber-400'}>
                          {pl.approved ? '✓ Godkänd' : '⏳ Inväntar'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar grid — Q3 2026 (summer = most leave) */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kalendervy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[3, 4, 5, 6, 7, 8].map(m => (
            <SimpleCalendar key={m} month={m} year={2026} employees={employees} />
          ))}
        </div>
      </div>

      {/* Swedish holidays */}
      <div className="bg-surface-raised border border-surface-border rounded-xl px-5 py-5">
        <h3 className="text-sm font-semibold text-white mb-4">Röda dagar 2026</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SWEDISH_HOLIDAYS_2026.map(h => {
            const d = new Date(h.date)
            const isPast = d < today
            return (
              <div key={h.date} className={`flex items-center gap-2 text-xs ${isPast ? 'opacity-40' : ''}`}>
                <span className="text-red-400 font-mono text-xs w-20 flex-shrink-0">
                  {h.date.slice(5)}
                </span>
                <span className="text-gray-300">{h.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
