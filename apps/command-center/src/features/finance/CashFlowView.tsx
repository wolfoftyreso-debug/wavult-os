import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { CASHFLOW_DATA, FINANCE_ENTITIES, type EntityId } from './mockData'

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

function EntityCashFlow({ entityId, entityColor }: { entityId: EntityId; entityColor: string }) {
  const data = CASHFLOW_DATA[entityId] ?? []
  const fe = FINANCE_ENTITIES.find(e => e.id === entityId)!
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)))
  const totalInflow = data.reduce((s, d) => s + d.inflow, 0)
  const totalOutflow = data.reduce((s, d) => s + d.outflow, 0)
  const netTotal = totalInflow - totalOutflow

  // Runway: antag kassan = totalInflow - totalOutflow senaste 6 mån, avg outflow
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
    <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entityColor }} />
        <span className="text-xs font-semibold text-white">{fe.name}</span>
        <span className="text-[9px] font-mono text-gray-600 ml-1">{fe.jurisdiction}</span>
        <span className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: entityColor + '15', color: entityColor }}>
          {fe.currency}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary row + Runway + Burn Rate */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
            <p className="text-[9px] text-gray-500 font-mono uppercase">Inbetalningar 6m</p>
            <p className="text-[14px] font-bold text-green-400 mt-1">{fmt(totalInflow)} {fe.currency}</p>
            <p className="text-[8px] text-gray-700 mt-0.5">pengar som kommit in</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
            <p className="text-[9px] text-gray-500 font-mono uppercase">Utbetalningar 6m</p>
            <p className="text-[14px] font-bold text-red-400 mt-1">{fmt(totalOutflow)} {fe.currency}</p>
            <p className="text-[8px] text-gray-700 mt-0.5">pengar som gått ut</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
            <p className="text-[9px] text-gray-500 font-mono uppercase">Netto 6m</p>
            <p className="text-[14px] font-bold mt-1" style={{ color: netTotal >= 0 ? '#10B981' : '#EF4444' }}>
              {netTotal >= 0 ? '+' : ''}{fmt(netTotal)} {fe.currency}
            </p>
            <p className="text-[8px] text-gray-700 mt-0.5">in minus ut</p>
          </div>
          <div className="px-3 py-2 rounded-lg border text-center"
            style={{ background: '#3B82F608', borderColor: '#3B82F620' }}>
            <p className="text-[9px] text-blue-400 font-mono uppercase">🛸 Runway</p>
            <p className="text-[14px] font-bold text-blue-300 mt-1">{runwayText}</p>
            <p className="text-[8px] text-gray-700 mt-0.5">burn: {fmt(burnRate)}/mån</p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <p className="text-xs text-gray-500 font-mono mb-1">Inbetalningar (grön) vs Utbetalningar (röd) per månad</p>
          <p className="text-[9px] text-gray-700 mb-3">Y-axeln visar belopp i {fe.currency} — högre stapel = mer pengar</p>
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
                        style={{ height: `${inflowPct}%`, minHeight: 2 }}
                        title={`${d.month}: ${fmt(d.inflow)} in`} />
                      <div className="flex-1 rounded-t-sm bg-red-500/70 transition-all"
                        style={{ height: `${outflowPct}%`, minHeight: 2 }}
                        title={`${d.month}: ${fmt(d.outflow)} ut`} />
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
              <span className="text-[9px] text-gray-500">Inbetalningar (pengar in)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-red-500/70" />
              <span className="text-[9px] text-gray-500">Utbetalningar (pengar ut)</span>
            </div>
          </div>
        </div>

        {/* 30-day forecast */}
        <div className="rounded-lg border border-white/[0.06] p-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">📈 Prognos nästa 30 dagar</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-gray-600 font-mono">Inbetalningar</p>
              <p className="text-sm font-bold text-green-400">{fmt(forecastInflow)} {fe.currency}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 font-mono">Utbetalningar</p>
              <p className="text-sm font-bold text-red-400">{fmt(forecastOutflow)} {fe.currency}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 font-mono">Prognos netto</p>
              <p className="text-sm font-bold" style={{ color: forecastNet >= 0 ? '#10B981' : '#EF4444' }}>
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
      {/* MOCKDATA banner */}
      <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
        <span className="text-yellow-400 text-lg flex-shrink-0">🧪</span>
        <div>
          <p className="text-xs font-semibold text-yellow-300">DEMO-DATA — inte live</p>
          <p className="text-xs text-yellow-200/60 mt-0.5 leading-relaxed">
            Alla siffror är illustrativa och kopplade till mockdata. För att visa verklig data måste du integrera ett bokföringssystem (t.ex. Fortnox, Xero) eller koppla Supabase-schemat.
            <span className="ml-1 text-yellow-500">Kontakta tech-teamet för live-integration.</span>
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">Kassaflöde</h2>
        <p className="text-xs text-gray-500 mt-0.5">Inbetalningar vs utbetalningar per bolag — senaste 6 månader + 30-dagarsprognos + runway</p>
      </div>

      {entitiesToShow.map(fe => (
        <EntityCashFlow key={fe.id} entityId={fe.id} entityColor={fe.color} />
      ))}
    </div>
  )
}
