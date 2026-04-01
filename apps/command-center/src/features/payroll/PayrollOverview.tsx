import { usePayroll } from './hooks/usePayroll'
import { useTranslation } from '../../shared/i18n/useTranslation'

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl px-5 py-4">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  )
}

export function PayrollOverview() {
  const { t: _t } = useTranslation() // ready for i18n
  const { activeEmployees: active, totalGrossPerMonth, loading, error, calcSalary, fmt, EMPLOYER_TAX_RATE } = usePayroll()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Laddar lönedata...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Fel: {error}</div>
  }

  const totalGross = totalGrossPerMonth
  const totalEmployerTax = Math.round(totalGross * EMPLOYER_TAX_RATE)
  const totalNet = active.reduce((sum, e) => {
    const c = calcSalary(e.gross_salary)
    return sum + c.net
  }, 0)
  const totalCost = totalGross + totalEmployerTax

  // Days until next payroll (25th of current month or next)
  const today = new Date()
  let nextPayroll = new Date(today.getFullYear(), today.getMonth(), 25)
  if (today.getDate() >= 25) {
    nextPayroll = new Date(today.getFullYear(), today.getMonth() + 1, 25)
  }
  const daysUntil = Math.ceil((nextPayroll.getTime() - today.getTime()) / 86_400_000)
  const warning = daysUntil <= 5

  const payrollDateStr = nextPayroll.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      {warning && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-700">Lönekörning om {daysUntil} dag{daysUntil !== 1 ? 'ar' : ''}</p>
            <p className="text-xs text-amber-500/80">Nästa utbetalning: {payrollDateStr}. Kontrollera och kör löner i tid.</p>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total lönekostnad/mån" value={fmt(totalCost)} sub={`ink. arb.avg. ${fmt(totalEmployerTax)}`} color="#2563EB" />
        <KpiCard label="Arbetsgivaravgifter" value={fmt(totalEmployerTax)} sub="31.42% av bruttolöner" color="#F59E0B" />
        <KpiCard label="Nettolöner totalt" value={fmt(totalNet)} sub="Utbetalt till anställda" color="#10B981" />
        <KpiCard label="Nästa utbetalning" value={payrollDateStr} sub={`Om ${daysUntil} dagar`} color={warning ? '#F59E0B' : '#3B82F6'} />
      </div>

      {/* Employee salary table */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-text-primary">Anställda — löneöversikt</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-text-muted uppercase tracking-wider">
                <th className="text-left px-5 py-3">Namn</th>
                <th className="text-left px-5 py-3">Roll</th>
                <th className="text-right px-5 py-3">Bruttolön</th>
                <th className="text-right px-5 py-3">Skatteavdrag</th>
                <th className="text-right px-5 py-3">Nettolön</th>
                <th className="text-right px-5 py-3">Arb.avg.</th>
                <th className="text-right px-5 py-3">Total kostnad</th>
                <th className="text-right px-5 py-3">Nästa utbet.</th>
              </tr>
            </thead>
            <tbody>
              {active.map(emp => {
                const c = calcSalary(emp.gross_salary)
                return (
                  <tr key={emp.id} className="border-b border-gray-200/50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: emp.color + '22', color: emp.color }}
                        >
                          {emp.initials}
                        </div>
                        <span className="text-text-primary font-medium text-xs">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-text-muted">{emp.role}</td>
                    <td className="px-5 py-3 text-right text-xs text-text-primary tabular-nums">{fmt(c.gross)}</td>
                    <td className="px-5 py-3 text-right text-xs text-red-700 tabular-nums">−{fmt(c.taxDeduction)}</td>
                    <td className="px-5 py-3 text-right text-xs text-green-700 tabular-nums font-semibold">{fmt(c.net)}</td>
                    <td className="px-5 py-3 text-right text-xs text-amber-700 tabular-nums">{fmt(c.employerTax)}</td>
                    <td className="px-5 py-3 text-right text-xs text-blue-700 tabular-nums font-semibold">{fmt(c.totalCost)}</td>
                    <td className="px-5 py-3 text-right text-xs text-text-muted">{payrollDateStr}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-surface-border bg-gray-50/20">
                <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-text-muted">TOTALT</td>
                <td className="px-5 py-3 text-right text-xs font-bold text-text-primary tabular-nums">{fmt(totalGross)}</td>
                <td className="px-5 py-3 text-right text-xs font-bold text-red-700 tabular-nums">
                  −{fmt(active.reduce((s, e) => s + calcSalary(e.gross_salary).taxDeduction, 0))}
                </td>
                <td className="px-5 py-3 text-right text-xs font-bold text-green-700 tabular-nums">{fmt(totalNet)}</td>
                <td className="px-5 py-3 text-right text-xs font-bold text-amber-700 tabular-nums">{fmt(totalEmployerTax)}</td>
                <td className="px-5 py-3 text-right text-xs font-bold text-blue-700 tabular-nums">{fmt(totalCost)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
