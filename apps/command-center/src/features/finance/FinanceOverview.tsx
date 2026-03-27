import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useFinanceKpis, useFinanceEntities, useFinanceLedger } from './hooks/useFinance'
import type { FinanceKpi } from '../../lib/supabase'

function fmt(n: number, currency: string) {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M ${currency}`
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(0)}k ${currency}`
  return `${prefix}${abs.toLocaleString()} ${currency}`
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-1.5">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function KpiCard({ label, value, currency, sub, color, icon }: {
  label: string; value: number; currency: string; sub?: string; color: string; icon: string
}) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: color + '08', borderColor: color + '20' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{fmt(value, currency)}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

export function FinanceOverview() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const { data: entities = [], isLoading: entitiesLoading } = useFinanceEntities()
  const { data: kpis = [], isLoading: kpisLoading } = useFinanceKpis('2026-Q1')
  const { data: recentEntries = [], isLoading: ledgerLoading } = useFinanceLedger()

  const entitiesToShow = isRoot
    ? entities
    : entities.filter(e => scopedIds.has(e.id))

  const kpiMap = kpis.reduce<Record<string, FinanceKpi>>((acc, k) => {
    acc[k.entity_id] = k
    return acc
  }, {})

  // Recent transactions from ledger (last 5 entries)
  const recentTxns = (isRoot
    ? recentEntries
    : recentEntries.filter(e => scopedIds.has(e.entity_id))
  ).slice(0, 5)

  const isLoading = entitiesLoading || kpisLoading || ledgerLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-[12px]">
        Laddar finansiell data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Finansiell Översikt</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {isRoot ? 'Wavult Group — konsoliderad vy' : `${activeEntity.name}`}
        </p>
      </div>

      {/* Per-entity KPI cards */}
      {entitiesToShow.map(fe => {
        const kpi = kpiMap[fe.id]
        if (!kpi) return null
        return (
          <div key={fe.id} className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
            {/* Entity header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: fe.color }} />
              <span className="text-[12px] font-semibold text-white">{fe.name}</span>
              <span className="text-[9px] font-mono text-gray-600 ml-1">{fe.jurisdiction}</span>
              <span className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: fe.color + '15', color: fe.color }}>
                {kpi.currency}
              </span>
            </div>

            {/* KPI grid */}
            <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Intäkter" value={kpi.revenue} currency={kpi.currency} color="#10B981" icon="📈"
                sub={`Budget: ${fmt(kpi.budget_revenue, kpi.currency)}`} />
              <KpiCard label="Kostnader" value={kpi.expenses} currency={kpi.currency} color="#EF4444" icon="📉"
                sub={`Budget: ${fmt(kpi.budget_expenses, kpi.currency)}`} />
              <KpiCard label="Resultat" value={kpi.result} currency={kpi.currency}
                color={kpi.result >= 0 ? '#10B981' : '#EF4444'} icon="💹" />
              <KpiCard label="Kassa" value={kpi.cash} currency={kpi.currency} color="#3B82F6" icon="🏦" />
            </div>

            {/* Budget progress */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono">Intäktsmål</span>
                  <span className="text-[9px] font-mono" style={{ color: '#10B981' }}>
                    {kpi.budget_revenue > 0 ? Math.round((kpi.revenue / kpi.budget_revenue) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar value={kpi.revenue} max={kpi.budget_revenue} color="#10B981" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono">Kostnadsbudget</span>
                  <span className="text-[9px] font-mono" style={{ color: '#F59E0B' }}>
                    {kpi.budget_expenses > 0 ? Math.round((kpi.expenses / kpi.budget_expenses) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar value={kpi.expenses} max={kpi.budget_expenses} color="#F59E0B" />
              </div>
            </div>
          </div>
        )
      })}

      {/* Recent ledger entries */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[12px] font-semibold text-white">Senaste transaktioner</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recentTxns.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-700 text-[12px]">Inga transaktioner</div>
          ) : (
            recentTxns.map(tx => {
              const fe = entities.find(e => e.id === tx.entity_id)
              const isCredit = tx.credit > 0
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                    style={{ background: (fe?.color ?? '#6B7280') + '15', color: fe?.color ?? '#6B7280' }}
                  >
                    {isCredit ? '↑' : '↓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white truncate">{tx.description}</p>
                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">{tx.date} · {fe?.short_name}</p>
                  </div>
                  <span
                    className="text-[12px] font-semibold font-mono flex-shrink-0"
                    style={{ color: isCredit ? '#10B981' : '#EF4444' }}
                  >
                    {isCredit ? '+' : '-'}{fmt(Math.max(tx.credit, tx.debit), tx.currency)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
