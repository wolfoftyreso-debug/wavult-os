import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { KPI_DATA, RECENT_TRANSACTIONS, FINANCE_ENTITIES, type EntityId } from './mockData'

function fmt(n: number, currency: string) {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M ${currency}`
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(0)}k ${currency}`
  return `${prefix}${abs.toLocaleString()} ${currency}`
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
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

  const entitiesToShow = isRoot
    ? FINANCE_ENTITIES
    : FINANCE_ENTITIES.filter(fe => scopedEntities.some(se => se.id === fe.id))

  const recentTxns = isRoot
    ? RECENT_TRANSACTIONS
    : RECENT_TRANSACTIONS.filter(t => scopedEntities.some(e => e.id === t.entityId))

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
        const kpi = KPI_DATA[fe.id as EntityId]
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
                sub={`Budget: ${fmt(kpi.budgetRevenue, kpi.currency)}`} />
              <KpiCard label="Kostnader" value={kpi.expenses} currency={kpi.currency} color="#EF4444" icon="📉"
                sub={`Budget: ${fmt(kpi.budgetExpenses, kpi.currency)}`} />
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
                    {Math.round((kpi.revenue / kpi.budgetRevenue) * 100)}%
                  </span>
                </div>
                <ProgressBar value={kpi.revenue} max={kpi.budgetRevenue} color="#10B981" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono">Kostnadsbudget</span>
                  <span className="text-[9px] font-mono" style={{ color: '#F59E0B' }}>
                    {Math.round((kpi.expenses / kpi.budgetExpenses) * 100)}%
                  </span>
                </div>
                <ProgressBar value={kpi.expenses} max={kpi.budgetExpenses} color="#F59E0B" />
              </div>
            </div>
          </div>
        )
      })}

      {/* Recent transactions */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[12px] font-semibold text-white">Senaste transaktioner</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recentTxns.slice(0, 5).map(tx => {
            const fe = FINANCE_ENTITIES.find(e => e.id === tx.entityId)
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                  style={{ background: (fe?.color ?? '#6B7280') + '15', color: fe?.color ?? '#6B7280' }}
                >
                  {tx.type === 'income' ? '↑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white truncate">{tx.description}</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-0.5">{tx.date} · {fe?.shortName}</p>
                </div>
                <span
                  className="text-[12px] font-semibold font-mono flex-shrink-0"
                  style={{ color: tx.amount > 0 ? '#10B981' : '#EF4444' }}
                >
                  {tx.amount > 0 ? '+' : ''}{fmt(tx.amount, tx.currency)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
