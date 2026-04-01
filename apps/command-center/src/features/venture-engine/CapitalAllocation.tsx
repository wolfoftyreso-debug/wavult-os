// ─── Panel C: Capital Allocation ──────────────────────────────────────────────

import { Loader2, AlertCircle, Flame, TrendingUp, CircleDollarSign, PieChart } from 'lucide-react'
import { useCapital, useVentures } from './useVentureEngine'
import type { Investment } from './types'

function statusBadge(status: Investment['status']) {
  switch (status) {
    case 'active':     return 'bg-green-50 text-green-700'
    case 'exited':     return 'bg-blue-50 text-blue-700'
    case 'written_off': return 'bg-red-50 text-red-600'
  }
}

function burnWarning(burnRate: number, amount: number): { months: number; urgent: boolean } | null {
  if (burnRate <= 0 || amount <= 0) return null
  const months = amount / burnRate
  return { months: Math.round(months), urgent: months < 6 }
}

function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

export function CapitalAllocation() {
  const { investments, loading, error } = useCapital()
  const { ventures } = useVentures()

  const ventureMap = new Map(ventures.map(v => [v.id, v]))

  const activeInvestments = investments.filter(i => i.status === 'active')
  const totalDeployed = activeInvestments.reduce((sum, i) => sum + i.amount, 0)
  const totalBurn = activeInvestments.reduce((sum, i) => sum + i.burn_rate, 0)
  const avgROI = activeInvestments.filter(i => i.roi_current > 0).length > 0
    ? activeInvestments.filter(i => i.roi_current > 0).reduce((sum, i) => sum + i.roi_current, 0) /
      activeInvestments.filter(i => i.roi_current > 0).length
    : 0
  const avgEfficiency = activeInvestments.length > 0
    ? activeInvestments.reduce((sum, i) => sum + i.efficiency_gain_pct, 0) / activeInvestments.length
    : 0

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Capital Allocation</h2>
        <p className="text-xs text-gray-500 mt-0.5">Deployed capital, ROI, burn rate, efficiency gains</p>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading capital data…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-blue-600">
                <CircleDollarSign className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Total deployed</span>
              </div>
              <p className="text-xl font-bold text-blue-700 tabular-nums">{formatUSD(totalDeployed)}</p>
              <p className="text-xs text-blue-500 mt-0.5">{activeInvestments.length} active position{activeInvestments.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-orange-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-orange-600">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Monthly burn</span>
              </div>
              <p className="text-xl font-bold text-orange-700 tabular-nums">{formatUSD(totalBurn)}</p>
              <p className="text-xs text-orange-500 mt-0.5">
                {totalBurn > 0 && totalDeployed > 0
                  ? `${Math.round(totalDeployed / totalBurn)} mo runway`
                  : 'No active burn'}
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-green-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Avg ROI</span>
              </div>
              <p className="text-xl font-bold text-green-700 tabular-nums">
                {avgROI > 0 ? `${avgROI.toFixed(1)}×` : '—'}
              </p>
              <p className="text-xs text-green-500 mt-0.5">on active positions</p>
            </div>

            <div className="bg-purple-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-purple-600">
                <PieChart className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Efficiency gain</span>
              </div>
              <p className="text-xl font-bold text-purple-700 tabular-nums">
                {avgEfficiency > 0 ? `${avgEfficiency.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-purple-500 mt-0.5">avg across portfolio</p>
            </div>
          </div>

          {/* Per-venture breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Per-Venture Breakdown</h3>
            {investments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No investments yet.</p>
            )}
            <div className="space-y-2">
              {investments.map(inv => {
                const venture = ventureMap.get(inv.venture_id)
                const warning = burnWarning(inv.burn_rate, inv.amount)
                const pct = totalDeployed > 0 ? (inv.amount / totalDeployed) * 100 : 0

                return (
                  <div key={inv.id} className="border border-gray-100 rounded-xl p-3 bg-white">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {venture?.name ?? inv.venture_id}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(inv.allocated_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </div>

                    {/* Amount bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{formatUSD(inv.amount)}</span>
                        <span>{pct.toFixed(1)}% of portfolio</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%`, background: '#3b82f6' }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-400">ROI</p>
                        <p className={`text-sm font-bold ${inv.roi_current > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {inv.roi_current > 0 ? `${inv.roi_current.toFixed(1)}×` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Burn/mo</p>
                        <p className="text-sm font-bold text-orange-500">
                          {inv.burn_rate > 0 ? formatUSD(inv.burn_rate) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Efficiency</p>
                        <p className="text-sm font-bold text-purple-600">
                          {inv.efficiency_gain_pct > 0 ? `${inv.efficiency_gain_pct.toFixed(1)}%` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Burn warning */}
                    {warning && warning.urgent && (
                      <div className="mt-2 flex items-center gap-1.5 p-2 bg-red-50 rounded-lg text-xs text-red-600 font-medium">
                        <Flame className="w-3.5 h-3.5" />
                        {warning.months} months runway remaining — refuel or exit
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
