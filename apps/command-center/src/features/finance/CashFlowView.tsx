import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useFinanceCashFlow, useFinanceEntities } from './hooks/useFinance'
import type { FinanceCashFlow, FinanceEntity } from '../../lib/supabase'

function fmt(n: number) {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(0)}k`
  return `${prefix}${abs.toFixed(0)}`
}

/** Beräknar hur länge kassan räcker baserat på genomsnittlig månadsutgift */
function calcRunway(cashBalance: number, avgMonthlyOutflow: number): string {
  if (avgMonthlyOutflow <= 0) return '∞'
  const months = cashBalance / avgMonthlyOutflow
  if (months >= 24) return `${Math.floor(months / 12)} år`
  if (months >= 1) return `${Math.round(months)} mån`
  return `${Math.round(months * 30)} dagar`
}

function EntityCashFlow({ entity, allCashFlow }: { entity: FinanceEntity; allCashFlow: FinanceCashFlow[] }) {
  const data = allCashFlow.filter(cf => cf.entity_id === entity.id)
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)))
  const totalInflow = data.reduce((s, d) => s + d.inflow, 0)
  const totalOutflow = data.reduce((s, d) => s + d.outflow, 0)
  const netTotal = totalInflow - totalOutflow

  const avgMonthlyOutflow = totalOutflow / data.length
  const estimatedCash = Math.max(netTotal, 0)
  const runwayText = calcRunway(estimatedCash, avgMonthlyOutflow)
  const burnRate = avgMonthlyOutflow

  // 30-day forecast: simple extrapolation from last month
  const lastMonth = data[data.length - 1]
  const forecastInflow = Math.round(lastMonth.inflow * 1.08)
  const forecastOutflow = Math.round(lastMonth.outflow * 1.05)
  const forecastNet = forecastInflow - forecastOutflow

  return (
    <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entity.color }} />
        <span className="text-xs font-semibold text-text-primary">{entity.name}</span>
        <span className="text-[9px] font-mono text-gray-9000 ml-1">{entity.jurisdiction}</span>
        <span className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: entity.color + '15', color: entity.color }}>
          {entity.currency}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary row + Runway + Burn Rate */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="px-3 py-2 rounded-lg bg-muted/30 text-center">
            <p className="text-[9px] text-gray-9000 font-mono uppercase">Inbetalningar 6m</p>
            <p className="text-[14px] font-bold text-green-700 mt-1">{fmt(totalInflow)} {entity.currency}</p>
            <p className="text-[8px] text-gray-600 mt-0.5">pengar som kommit in</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-muted/30 text-center">
            <p className="text-[9px] text-gray-9000 font-mono uppercase">Utbetalningar 6m</p>
            <p className="text-[14px] font-bold text-red-700 mt-1">{fmt(totalOutflow)} {entity.currency}</p>
            <p className="text-[8px] text-gray-600 mt-0.5">pengar som gått ut</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-muted/30 text-center">
            <p className="text-[9px] text-gray-9000 font-mono uppercase">Netto 6m</p>
            <p className="text-[14px] font-bold mt-1" style={{ color: netTotal >= 0 ? '#10B981' : '#EF4444' }}>
              {netTotal >= 0 ? '+' : ''}{fmt(netTotal)} {entity.currency}
            </p>
            <p className="text-[8px] text-gray-600 mt-0.5">in minus ut</p>
          </div>
          <div className="px-3 py-2 rounded-lg border text-center"
            style={{ background: '#3B82F608', borderColor: '#3B82F620' }}>
            <p className="text-[9px] text-gray-600 font-mono uppercase">🛸 Runway</p>
            <p className="text-[14px] font-bold text-gray-600 mt-1">{runwayText}</p>
            <p className="text-[8px] text-gray-600 mt-0.5">burn: {fmt(burnRate)}/mån</p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <p className="text-xs text-gray-9000 font-mono mb-1">Inbetalningar (grön) vs Utbetalningar (röd) per månad</p>
          <p className="text-[9px] text-gray-600 mb-3">Y-axeln visar belopp i {entity.currency} — högre stapel = mer pengar</p>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-right pr-2 py-1 flex-shrink-0">
              <span className="text-[8px] font-mono text-gray-600">{fmt(maxVal)}</span>
              <span className="text-[8px] font-mono text-gray-600">{fmt(maxVal / 2)}</span>
              <span className="text-[8px] font-mono text-gray-600">0</span>
            </div>
            <div className="flex-1">
              <div className="flex items-end gap-2" style={{ height: 100 }}>
                {data.map((d, i) => {
                  const inflowPct = maxVal > 0 ? (d.inflow / maxVal) * 100 : 0
                  const outflowPct = maxVal > 0 ? (d.outflow / maxVal) * 100 : 0
                  return (
                    <div key={i} className="flex-1 flex items-end gap-0.5">
                      <div className="flex-1 rounded-t-sm bg-green-500/70 transition-all"
                        style={{ height: `${inflowPct}%`, minHeight: 2 }}
                        title={`${d.month}: ${fmt(d.inflow)} in`} />
                      <div className="flex-1 rounded-t-sm bg-red-500/70 transition-all"
                        style={{ height: `${outflowPct}%`, minHeight: 2 }}
                        title={`${d.month}: ${fmt(d.outflow)} ut`} />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-1">
                {data.map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] font-mono text-gray-9000">{d.month}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-green-500/70" />
              <span className="text-[9px] text-gray-9000">Inbetalningar (pengar in)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-red-500/70" />
              <span className="text-[9px] text-gray-9000">Utbetalningar (pengar ut)</span>
            </div>
          </div>
        </div>

        {/* 30-day forecast */}
        <div className="rounded-lg border border-surface-border p-3">
          <p className="text-xs text-gray-9000 font-semibold mb-2">📈 Prognos nästa 30 dagar</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-gray-9000 font-mono">Inbetalningar</p>
              <p className="text-sm font-bold text-green-700">{fmt(forecastInflow)} {entity.currency}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-9000 font-mono">Utbetalningar</p>
              <p className="text-sm font-bold text-red-700">{fmt(forecastOutflow)} {entity.currency}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-9000 font-mono">Prognos netto</p>
              <p className="text-sm font-bold" style={{ color: forecastNet >= 0 ? '#10B981' : '#EF4444' }}>
                {forecastNet >= 0 ? '+' : ''}{fmt(forecastNet)} {entity.currency}
              </p>
            </div>
          </div>
          <p className="text-[8px] text-gray-600 mt-2">Baserat på trend senaste månaden (+8% inbetalningar, +5% utbetalningar)</p>
        </div>
      </div>
    </div>
  )
}

export function CashFlowView() {
  const { activeEntity, viewScope } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const isGroupView = isRoot || viewScope === 'group'

  const { data: entities = [], isLoading: entitiesLoading } = useFinanceEntities()
  const { data: cashFlow = [], isLoading: cashFlowLoading } = useFinanceCashFlow()

  const isLoading = entitiesLoading || cashFlowLoading

  const entitiesToShow = isGroupView
    ? entities
    : entities.filter(e => e.id === activeEntity.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-9000 text-xs">
        Laddar kassaflödesdata...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Kassaflöde</h2>
        <p className="text-xs text-gray-9000 mt-0.5">
          {isGroupView
            ? 'Inbetalningar vs utbetalningar — alla bolag i koncernen — 6 månader + prognos'
            : `${activeEntity.name} · ${activeEntity.jurisdiction}`}
        </p>
      </div>

      {entitiesToShow.map(fe => (
        <EntityCashFlow key={fe.id} entity={fe} allCashFlow={cashFlow} />
      ))}

      {(entitiesToShow.length === 0 || entitiesToShow.every(fe => cashFlow.filter(cf => cf.entity_id === fe.id).length === 0)) && (
        <div className="text-center py-12 text-gray-9000 text-xs">
          Ingen kassaflödesdata registrerad ännu
        </div>
      )}
    </div>
  )
}
