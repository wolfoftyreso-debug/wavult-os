import { TAX_DECLARATIONS, TaxDeclaration } from './data'
import { usePayroll } from './hooks/usePayroll'

type TaxStatus = TaxDeclaration['status']

const STATUS_CONFIG: Record<TaxStatus, { label: string; color: string; bg: string }> = {
  not_filed: { label: 'Ej inlämnad', color: '#F87171', bg: '#F8717120' },
  filed:     { label: 'Inlämnad',   color: '#FBBF24', bg: '#FBBF2420' },
  paid:      { label: 'Betald',     color: '#34D399', bg: '#34D39920' },
}

function StatusPill({ status }: { status: TaxStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {status === 'not_filed' ? '⚠ ' : status === 'filed' ? '📋 ' : '✓ '}
      {cfg.label}
    </span>
  )
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
}

export function TaxComplianceView() {
  const { totalGrossPerMonth, EMPLOYER_TAX_RATE, fmt, fmtPeriod, loading } = usePayroll()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Laddar skattedata...</div>
  }

  const totalGross = totalGrossPerMonth
  const monthlyEmployerTax = Math.round(totalGross * EMPLOYER_TAX_RATE)

  const upcoming = TAX_DECLARATIONS.find(d => d.status === 'not_filed')
  const days = upcoming ? daysUntil(upcoming.deadline) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Skatt & Arbetsgivaravgift</h2>
        <p className="text-xs text-text-muted mt-0.5">Arbetsgivardeklaration (AGI) — Skatteverket</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Månatlig arb.avg.', value: fmt(monthlyEmployerTax), color: '#FBBF24', sub: '31.42% av bruttolöner' },
          { label: 'F-skatt (bolaget)', value: 'Beräknas', color: '#60A5FA', sub: 'Kontakta revisor' },
          { label: 'Nästa deklaration', value: upcoming?.deadline ?? '—', color: days !== null && days <= 7 ? '#F87171' : '#60A5FA', sub: days !== null ? `Om ${days} dagar` : '' },
          { label: 'Årsavgifter (est.)', value: fmt(monthlyEmployerTax * 12), color: '#C084FC', sub: '12 månader' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-surface-border rounded-xl px-5 py-4">
            <div className="text-xs text-text-muted mb-1">{k.label}</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</div>
            {k.sub && <div className="text-xs text-text-muted mt-1">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Upcoming warning */}
      {upcoming && days !== null && days <= 14 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10">
          <span className="text-lg">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Arbetsgivardeklaration förfaller om {days} dagar</p>
            <p className="text-xs text-red-700/70">Period {fmtPeriod(upcoming.period)} — Deadline: {upcoming.deadline} — Belopp: {fmt(upcoming.amount)}</p>
          </div>
        </div>
      )}

      {/* Declaration table */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary">Arbetsgivardeklarationer (AGI)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-text-muted uppercase tracking-wider">
                <th className="text-left px-5 py-3">Period</th>
                <th className="text-left px-5 py-3">Deadline</th>
                <th className="text-right px-5 py-3">Arbetsgivaravgift</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Dagar kvar</th>
              </tr>
            </thead>
            <tbody>
              {TAX_DECLARATIONS.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-muted text-xs italic">
                    Inga skattedeklarationer registrerade — konfigureras via lönesystemet
                  </td>
                </tr>
              )}
              {TAX_DECLARATIONS.map(dec => {
                const d = daysUntil(dec.deadline)
                return (
                  <tr key={dec.period} className="border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-text-primary">{fmtPeriod(dec.period)}</td>
                    <td className="px-5 py-3 text-xs text-text-muted">{dec.deadline}</td>
                    <td className="px-5 py-3 text-right text-xs text-amber-700 tabular-nums font-medium">{fmt(dec.amount)}</td>
                    <td className="px-5 py-3"><StatusPill status={dec.status} /></td>
                    <td className="px-5 py-3 text-xs">
                      {dec.status === 'paid' ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <span className={d <= 7 ? 'text-red-700 font-semibold' : d <= 14 ? 'text-amber-700' : 'text-gray-500'}>
                          {d > 0 ? `${d} dagar` : `${Math.abs(d)} dagar sedan`}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skattekonton section */}
      <div className="bg-white border border-surface-border rounded-xl px-5 py-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Skattekonton</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Arbetsgivaravgiftskonto',
              desc: 'Månadsvis inbetalning av arbetsgivaravgifter. Deklareras via AGI senast den 12:e månaden efter löneutbetalning.',
              amount: fmt(monthlyEmployerTax),
              color: '#FBBF24',
              icon: '🏛',
            },
            {
              title: 'F-skattekonto',
              desc: 'Bolagets preliminärskatt på vinst. Betalas månadsvis baserat på debiterad preliminärskatt. Kontakta revisor för exakt belopp.',
              amount: 'Se revisor',
              color: '#60A5FA',
              icon: '📊',
            },
          ].map(acc => (
            <div key={acc.title} className="border border-surface-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{acc.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-text-primary mb-1">{acc.title}</div>
                  <div className="text-xs text-text-muted mb-2">{acc.desc}</div>
                  <div className="text-base font-bold tabular-nums" style={{ color: acc.color }}>{acc.amount}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skatteverket deadline calendar */}
      <div className="bg-white border border-surface-border rounded-xl px-5 py-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Skatteverket — deadlines 2026</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { month: 'Jan', deadline: '12 feb', paid: true },
            { month: 'Feb', deadline: '12 mar', paid: true },
            { month: 'Mar', deadline: '12 apr', paid: false },
            { month: 'Apr', deadline: '12 maj', paid: false },
            { month: 'Maj', deadline: '12 jun', paid: false },
            { month: 'Jun', deadline: '12 jul', paid: false },
            { month: 'Jul', deadline: '12 aug', paid: false },
            { month: 'Aug', deadline: '12 sep', paid: false },
          ].map(d => (
            <div
              key={d.month}
              className="rounded-lg p-3 border"
              style={d.paid
                ? { borderColor: '#34D39930', background: '#34D39910' }
                : { borderColor: 'rgb(255 255 255 / 0.06)', background: 'rgb(255 255 255 / 0.02)' }
              }
            >
              <div className="text-xs text-text-muted">{d.month} 2026</div>
              <div className={`text-xs font-semibold mt-1 ${d.paid ? 'text-green-700' : 'text-gray-600'}`}>
                {d.paid ? '✓ ' : ''}{d.deadline}
              </div>
              <div className="text-xs mt-1" style={{ color: d.paid ? '#34D399' : '#6B7280' }}>
                {d.paid ? 'Betald' : 'Förfaller'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
