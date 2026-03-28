import { useState } from 'react'
import { usePayroll, type Employee } from './hooks/usePayroll'

const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']

function StatusBadge({ status }: { status: Employee['status'] }) {
  return status === 'active' ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Aktiv</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">Tjänstledig</span>
  )
}

function EmployeePanel({ emp, onClose, calcSalary, fmt }: { emp: Employee; onClose: () => void; calcSalary: (gross: number) => any; fmt: (n: number) => string }) {
  const calc = calcSalary(emp.gross_salary)
  // TODO: Add leave_records table and fetch leave data
  const leave = null as null | { daysEntitled: number; daysUsed: number; plannedLeave: { start: string; end: string; days: number; approved: boolean }[] }
  const daysRemaining = 25

  // Salary history (last 6 months)
  const today = new Date()
  const history = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
    return {
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      gross: emp.gross_salary,
      net: calc.net,
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="h-full w-full md:w-[420px] bg-[#0D0F1A] border-l border-surface-border overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0D0F1A] border-b border-surface-border px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: emp.color + '22', color: emp.color }}
            >
              {emp.initials}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{emp.name}</div>
              <div className="text-xs" style={{ color: emp.color }}>{emp.role}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">×</button>
        </div>

        <div className="px-4 md:px-6 py-5 space-y-6">
          {/* Personuppgifter */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Personuppgifter</h3>
            <div className="space-y-2">
              {[
                ['E-post', emp.email],
                ['Telefon', emp.phone],
                ['Ort', emp.location],
                ['Anställd sedan', emp.start_date],
                ['Sysselsättningsgrad', `${(emp.employment_rate * 100).toFixed(0)}%`],
                ['Skattetabell', `Tabell ${emp.tax_table} (${emp.location})`],
                ['Status', emp.status === 'active' ? 'Aktiv' : 'Tjänstledig'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-200">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Lön */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Aktuell lön</h3>
            <div className="bg-surface-raised rounded-xl p-4 space-y-2">
              {[
                ['Bruttolön', fmt(calc.gross), 'text-white'],
                ['Skatteavdrag (tabell 33)', `−${fmt(calc.taxDeduction)}`, 'text-red-400'],
                ['Nettolön', fmt(calc.net), 'text-green-400 font-semibold'],
                ['Arbetsgivaravgift (31.42%)', fmt(calc.employerTax), 'text-amber-400'],
                ['Total kostnad för arbetsgivare', fmt(calc.totalCost), 'text-purple-400 font-semibold'],
              ].map(([label, value, cls]) => (
                <div key={label} className={`flex justify-between text-xs ${label === 'Nettolön' || label === 'Total kostnad för arbetsgivare' ? 'border-t border-surface-border pt-2' : ''}`}>
                  <span className="text-gray-400">{label}</span>
                  <span className={cls}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Lönehistorik */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lönehistorik (6 mån)</h3>
            <div className="space-y-1">
              {history.map(h => (
                <div key={h.period} className="flex justify-between items-center text-xs py-1.5 border-b border-surface-border/50">
                  <span className="text-gray-400">{h.label}</span>
                  <div className="flex gap-4">
                    <span className="text-gray-500">{fmt(h.gross)} brutto</span>
                    <span className="text-green-400">{fmt(h.net)} netto</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Semester */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Semester 2026</h3>
            {leave ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Berättigad', value: leave.daysEntitled, color: '#3B82F6' },
                    { label: 'Uttaget', value: leave.daysUsed, color: '#F59E0B' },
                    { label: 'Kvar', value: daysRemaining, color: '#10B981' },
                  ].map(s => (
                    <div key={s.label} className="bg-surface-raised rounded-lg p-3 text-center">
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                {leave.plannedLeave.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Planerad ledighet:</p>
                    {leave.plannedLeave.map((pl, i) => (
                      <div key={i} className="flex justify-between items-center text-xs py-1.5">
                        <span className="text-gray-300">{pl.start} → {pl.end}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{pl.days} dagar</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${pl.approved ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {pl.approved ? 'Godkänd' : 'Inväntar'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Ingen semesterdata</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export function EmployeeList() {
  const [selected, setSelected] = useState<Employee | null>(null)
  const { employees, loading, error, calcSalary, fmt } = usePayroll()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Laddar anställda...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Fel: {error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Anställda</h2>
          <p className="text-xs text-gray-500 mt-0.5">{employees.length} personer</p>
        </div>
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Namn</th>
                <th className="text-left px-5 py-3">Roll</th>
                <th className="text-left px-5 py-3">Anst. datum</th>
                <th className="text-right px-5 py-3">Lön (SEK)</th>
                <th className="text-right px-5 py-3">Sysselsättning</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr
                  key={emp.id}
                  className="border-b border-surface-border/50 hover:bg-surface-overlay/40 transition-colors cursor-pointer"
                  onClick={() => setSelected(emp)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: emp.color + '22', color: emp.color }}
                      >
                        {emp.initials}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white">{emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{emp.role}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{emp.start_date}</td>
                  <td className="px-5 py-3 text-right text-xs text-white tabular-nums font-medium">
                    {emp.gross_salary.toLocaleString('sv-SE')}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-300">
                    {(emp.employment_rate * 100).toFixed(0)}%
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={emp.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <EmployeePanel emp={selected} onClose={() => setSelected(null)} calcSalary={calcSalary} fmt={fmt} />}
    </div>
  )
}
