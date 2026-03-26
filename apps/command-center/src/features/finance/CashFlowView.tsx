import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { CASHFLOW_DATA, FINANCE_ENTITIES, type EntityId } from './mockData'

function fmt(n: number) {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(0)}k`
  return `${prefix}${abs.toFixed(0)}`
}

function EntityCashFlow({ entityId, entityColor }: { entityId: EntityId; entityColor: string }) {
  const data = CASHFLOW_DATA[entityId] ?? []
  const fe = FINANCE_ENTITIES.find(e => e.id === entityId)!
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)))
  const totalInflow = data.reduce((s, d) => s + d.inflow, 0)
  const totalOutflow = data.reduce((s, d) => s + d.outflow, 0)
  const netTotal = totalInflow - totalOutflow

  // 30-day forecast: simple extrapolation from last month
  const lastMonth = data[data.length - 1]
  const forecastInflow = Math.round(lastMonth.inflow * 1.08)
  const forecastOutflow = Math.round(lastMonth.outflow * 1.05)
  const forecastNet = forecastInflow - forecastOutflow

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entityColor }} />
        <span className="text-[12px] font-semibold text-white">{fe.name}</span>
        <span className="text-[9px] font-mono text-gray-600 ml-1">{fe.jurisdiction}</span>
        <span className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: entityColor + '15', color: entityColor }}>
          {fe.currency}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
            <p className="text-[9px] text-gray-500 font-mono uppercase">Inbetalningar 6m</p>
            <p className="text-[14px] font-bold text-green-400 mt-1">{fmt(totalInflow)} {fe.currency}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
            <p className="text-[9px] text-gray-500 font-mono uppercase">Utbetalningar 6m</p>
            <p className="text-[14px] font-bold text-red-400 mt-1">{fmt(totalOutflow)} {fe.currency}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
            <p className="text-[9px] text-gray-500 font-mono uppercase">Netto 6m</p>
            <p className="text-[14px] font-bold mt-1" style={{ color: netTotal >= 0 ? '#10B981' : '#EF4444' }}>
              {netTotal >= 0 ? '+' : ''}{fmt(netTotal)} {fe.currency}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <p className="text-[10px] text-gray-500 font-mono mb-3">Inbetalningar vs Utbetalningar — senaste 6 månader</p>
          <div className="flex gap-2">
            {/* Y-axis label */}
            <div className="flex flex-col justify-between text-right pr-2 py-1 flex-shrink-0">
              <span className="text-[8px] font-mono text-gray-700">{fmt(maxVal)}</span>
              <span className="text-[8px] font-mono text-gray-700">{fmt(maxVal / 2)}</span>
              <span className="text-[8px] font-mono text-gray-700">0</span>
            </div>
            <div className="flex-1">
              {/* Bars — stacked per month */}
              <div className="flex items-end gap-2" style={{ height: 100 }}>
                {data.map((d, i) => {
                  const inflowPct = maxVal > 0 ? (d.inflow / maxVal) * 100 : 0
                  const outflowPct = maxVal > 0 ? (d.outflow / maxVal) * 100 : 0
                  return (
                    <div key={i} className="flex-1 flex items-end gap-0.5">
                      <div className="flex-1 rounded-t-sm bg-green-500/70 transition-all"
                        style={{ height: `${inflowPct}%`, minHeight: 2 }} title={`${fmt(d.inflow)} in`} />
                      <div className="flex-1 rounded-t-sm bg-red-500/70 transition-all"
                        style={{ height: `${outflowPct}%`, minHeight: 2 }} title={`${fmt(d.outflow)} ut`} />
                    </div>
                  )
                })}
              </div>
              {/* Month labels */}
              <div className="flex gap-2 mt-1">
                {data.map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] font-mono text-gray-600">{d.month}</div>
                ))}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-green-500/70" />
              <span className="text-[9px] text-gray-500">Inbetalningar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-red-500/70" />
              <span className="text-[9px] text-gray-500">Utbetalningar</span>
            </div>
          </div>
        </div>

        {/* 30-day forecast */}
        <div className="rounded-lg border border-white/[0.06] p-3">
          <p className="text-[10px] text-gray-400 font-semibold mb-2">📈 Prognos nästa 30 dagar</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-gray-600 font-mono">Inbetalningar</p>
              <p className="text-[13px] font-bold text-green-400">{fmt(forecastInflow)} {fe.currency}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 font-mono">Utbetalningar</p>
              <p className="text-[13px] font-bold text-red-400">{fmt(forecastOutflow)} {fe.currency}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 font-mono">Prognos netto</p>
              <p className="text-[13px] font-bold" style={{ color: forecastNet >= 0 ? '#10B981' : '#EF4444' }}>
                {forecastNet >= 0 ? '+' : ''}{fmt(forecastNet)} {fe.currency}
              </p>
            </div>
          </div>
          <p className="text-[8px] text-gray-700 mt-2">Baserat på trend senaste månaden (+8% inbetalningar, +5% utbetalningar)</p>
        </div>
      </div>
    </div>
  )
}

export function CashFlowView() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const entitiesToShow = FINANCE_ENTITIES.filter(
    fe => isRoot || scopedIds.has(fe.id)
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">Kassaflöde</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">Inbetalningar vs utbetalningar per bolag — senaste 6 månader + 30-dagarsprognos</p>
      </div>

      {entitiesToShow.map(fe => (
        <EntityCashFlow key={fe.id} entityId={fe.id} entityColor={fe.color} />
      ))}
    </div>
  )
}
