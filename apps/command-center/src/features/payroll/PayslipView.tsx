import { useState } from 'react'
import { EMPLOYEES, Employee, calcSalary, fmt, fmtPeriod, EMPLOYER_TAX_RATE, TAX_TABLE } from './data'

const MONTHS = [
  '2026-03', '2026-02', '2026-01', '2025-12', '2025-11', '2025-10',
]

function PayslipDetail({ emp, period }: { emp: Employee; period: string }) {
  const calc = calcSalary(emp.grossSalary)
  const [y, m] = period.split('-')
  const payDate = `${y}-${m}-25`

  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
      {/* Print header */}
      <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lönespecifikation</div>
          <div className="text-sm font-bold text-white">{fmtPeriod(period)}</div>
        </div>
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-overlay/80 text-gray-300 border border-surface-border transition-colors"
        >
          🖨 Skriv ut
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Employee info */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-bold text-white">{emp.name}</div>
            <div className="text-xs" style={{ color: emp.color }}>{emp.role}</div>
            <div className="text-xs text-gray-500 mt-1">{emp.email}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Utbetalningsdatum</div>
            <div className="text-sm font-semibold text-white">{payDate}</div>
            <div className="text-xs text-gray-500 mt-1">Skattetabell {emp.taxTable} ({emp.location})</div>
          </div>
        </div>

        {/* Payslip rows */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ersättningar</div>
          <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
            <span className="text-xs text-gray-300">Grundlön</span>
            <span className="text-xs text-white tabular-nums font-medium">{fmt(calc.gross)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
            <span className="text-xs font-bold text-white">Summa ersättningar</span>
            <span className="text-xs font-bold text-white tabular-nums">{fmt(calc.gross)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Avdrag</div>
          <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
            <span className="text-xs text-gray-300">
              Preliminärskatt (tabell {TAX_TABLE})
            </span>
            <span className="text-xs text-red-400 tabular-nums">−{fmt(calc.taxDeduction)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
            <span className="text-xs font-bold text-white">Summa avdrag</span>
            <span className="text-xs font-bold text-red-400 tabular-nums">−{fmt(calc.taxDeduction)}</span>
          </div>
        </div>

        {/* Net */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 flex justify-between items-center">
          <span className="text-sm font-bold text-white">Att utbetala (nettolön)</span>
          <span className="text-xl font-bold text-green-400 tabular-nums">{fmt(calc.net)}</span>
        </div>

        {/* Employer cost (informational) */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Arbetsgivarkostnader (ej avdrag för dig)</div>
          <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
            <span className="text-xs text-gray-400">
              Arbetsgivaravgift ({(EMPLOYER_TAX_RATE * 100).toFixed(2)}%)
            </span>
            <span className="text-xs text-amber-400 tabular-nums">{fmt(calc.employerTax)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-gray-400">Total kostnad för arbetsgivare</span>
            <span className="text-xs text-purple-400 tabular-nums font-semibold">{fmt(calc.totalCost)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-gray-600 border-t border-surface-border pt-4">
          Wavult Group · Org.nr: 559XXX-XXXX · Utfärdad: {new Date().toLocaleDateString('sv-SE')} · Skattetabell {TAX_TABLE}, kolumn 1
        </div>
      </div>
    </div>
  )
}

export function PayslipView() {
  const [selectedEmp, setSelectedEmp] = useState<Employee>(EMPLOYEES[0])
  const [selectedPeriod, setSelectedPeriod] = useState(MONTHS[0])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Lönespecifikationer</h2>
        <p className="text-xs text-gray-500 mt-0.5">Välj anställd och period</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {EMPLOYEES.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmp(emp)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors"
              style={selectedEmp.id === emp.id
                ? { background: emp.color + '20', borderColor: emp.color + '60', color: emp.color }
                : { borderColor: 'transparent', background: 'rgb(255 255 255 / 0.04)', color: '#9CA3AF' }
              }
            >
              <div
                className="h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: emp.color + '30', color: emp.color }}
              >
                {emp.initials[0]}
              </div>
              {emp.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="text-xs bg-surface-raised border border-surface-border rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>{fmtPeriod(m)}</option>
          ))}
        </select>
      </div>

      <PayslipDetail emp={selectedEmp} period={selectedPeriod} />
    </div>
  )
}
