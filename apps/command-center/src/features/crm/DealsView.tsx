import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  DEALS,
  DEAL_STATUS_COLORS,
  PRODUCT_COLORS,
  TEAM_COLORS,
  formatSEK,
  type Deal,
  type DealStatus,
} from './data'

const STATUSES: Array<DealStatus | 'Alla'> = ['Alla', 'Utkast', 'Skickad', 'Under förhandling', 'Signerad', 'Avbruten']

export function DealsView() {
  const [deals, setDeals] = useState<Deal[]>(DEALS)
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'Alla'>('Alla')

  const filtered = statusFilter === 'Alla' ? deals : deals.filter(d => d.status === statusFilter)

  const totalValue = deals.filter(d => d.status === 'Signerad').reduce((s, d) => s + d.valueSEK, 0)
  const pendingValue = deals
    .filter(d => d.status === 'Under förhandling' || d.status === 'Skickad')
    .reduce((s, d) => s + d.valueSEK, 0)

  function updateStatus(id: string, status: DealStatus) {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Avtal</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Signerat: <span className="text-green-700 font-semibold">{formatSEK(totalValue)}</span>
            <span className="mx-2 text-gray-600">·</span>
            Pågående förhandling: <span className="text-yellow-700 font-semibold">{formatSEK(pendingValue)}</span>
          </p>
        </div>
        <NavLink
          to="/legal"
          className="text-xs px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 9h18M5 9l3-6 3 6M13 9l3-6 3 6M5 9c0 2.21 1.34 4 3 4s3-1.79 3-4M13 9c0 2.21 1.34 4 3 4s3-1.79 3-4M5 21h14" />
          </svg>
          Legal Hub →
        </NavLink>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as DealStatus | 'Alla')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'bg-surface-raised border border-surface-border text-gray-500 hover:text-gray-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Deals table */}
      <div className="overflow-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-raised">
              {['Företag', 'Produkt', 'Status', 'Värde/år', 'Startdatum', 'Löptid', 'Ansvarig', 'Åtgärd'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b border-surface-border/50 hover:bg-surface-overlay transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{d.company}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: PRODUCT_COLORS[d.product] + '20', color: PRODUCT_COLORS[d.product] }}
                  >
                    {d.product}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: DEAL_STATUS_COLORS[d.status] + '20', color: DEAL_STATUS_COLORS[d.status] }}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">{formatSEK(d.valueSEK)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{d.startDate}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{d.durationMonths} mån</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: TEAM_COLORS[d.assignee] + '20', color: TEAM_COLORS[d.assignee] }}
                  >
                    {d.assignee}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={d.status}
                    onChange={e => updateStatus(d.id, e.target.value as DealStatus)}
                    className="text-xs bg-surface-base border border-surface-border rounded px-2 py-1 text-gray-600 focus:outline-none appearance-none cursor-pointer"
                  >
                    {STATUSES.filter(s => s !== 'Alla').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                  Inga avtal matchar filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.filter(s => s !== 'Alla').map(s => {
          const count = deals.filter(d => d.status === s).length
          const val = deals.filter(d => d.status === s).reduce((sum, d) => sum + d.valueSEK, 0)
          return (
            <div
              key={s}
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: DEAL_STATUS_COLORS[s as DealStatus] }} />
                <span className="text-xs text-gray-500">{s}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              {val > 0 && <p className="text-xs text-gray-500 mt-0.5">{formatSEK(val)}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
