import { CONTRACTS } from './mockData'
import { Currency } from './types'

function formatAmount(amount: number, currency: Currency) {
  if (amount === 0) return 'Usage-based'
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(amount)
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date('2026-03-26')
  return Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400">
        Utgånget
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400">
        ⚠ {days}d kvar
      </span>
    )
  }
  if (days <= 90) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-400">
        ⚠ {days}d kvar
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-500">
      {days}d kvar
    </span>
  )
}

export function ProcurementContractsView() {
  const sorted = [...CONTRACTS].sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate))
  const expiringSoon = sorted.filter(c => daysUntil(c.endDate) <= 90)

  return (
    <div className="flex flex-col h-full">
      {/* Warning banner */}
      {expiringSoon.length > 0 && (
        <div className="mx-6 mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] flex items-start gap-3 flex-shrink-0">
          <span className="text-amber-400 text-lg leading-none mt-0.5">⚠</span>
          <div>
            <p className="text-xs font-semibold text-amber-300">
              {expiringSoon.length} avtal löper ut inom 90 dagar
            </p>
            <p className="text-xs text-amber-500/70 mt-0.5">
              {expiringSoon.map(c => c.supplierName).join(', ')} — kontrollera förnyelse
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              {['Leverantör', 'Beskrivning', 'Start', 'Slutar', 'Status', 'Auto-förlängning', 'Värde/år'].map(h => (
                <th key={h} className="pb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider pr-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const days = daysUntil(c.endDate)
              return (
                <tr
                  key={c.id}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                    days <= 90 ? 'bg-amber-500/[0.02]' : ''
                  }`}
                >
                  <td className="py-3 pr-5">
                    <span className="text-sm font-semibold text-white">{c.supplierName}</span>
                  </td>
                  <td className="py-3 pr-5">
                    <span className="text-xs text-gray-500">{c.description}</span>
                  </td>
                  <td className="py-3 pr-5">
                    <span className="text-xs text-gray-600 font-mono">{c.startDate}</span>
                  </td>
                  <td className="py-3 pr-5">
                    <span className={`text-xs font-mono ${days <= 90 ? 'text-amber-400' : 'text-gray-400'}`}>
                      {c.endDate}
                    </span>
                  </td>
                  <td className="py-3 pr-5">
                    <ExpiryBadge days={days} />
                  </td>
                  <td className="py-3 pr-5">
                    <span className={`text-xs font-medium ${c.autoRenewal ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {c.autoRenewal ? '✓ Ja' : '✗ Nej'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs font-mono text-white">
                      {formatAmount(c.annualValue, c.currency)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>{/* /overflow-x-auto */}

        <div className="mt-4 text-xs text-gray-700 font-mono">
          {CONTRACTS.length} aktiva avtal · Totalt{' '}
          {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(
            CONTRACTS.reduce((sum, c) => sum + c.annualValue, 0)
          )}{' '}
          /år
        </div>
      </div>
    </div>
  )
}
