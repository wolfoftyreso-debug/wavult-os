// ─── Panel D: System Impact ───────────────────────────────────────────────────

import { Loader2, AlertCircle, Zap, Activity, Clock } from 'lucide-react'
import { useSystemImpact, useVentureStats, useVentures } from './useVentureEngine'
import type { VentureEvent } from './types'

function eventIcon(type: string) {
  const cls = 'w-3 h-3 flex-shrink-0'
  switch (type) {
    case 'opportunity.detected':  return <span className="text-gray-400">🔍</span>
    case 'opportunity.validated': return <span className="text-blue-500">✓</span>
    case 'venture.created':       return <span className="text-purple-500">🚀</span>
    case 'capital.allocated':     return <span className="text-green-500">💰</span>
    case 'system.integrated':     return <span className="text-indigo-500">🔗</span>
    case 'efficiency.gained':     return <span className="text-emerald-500">⚡</span>
    default:                      return <Activity className={`${cls} text-gray-400`} />
  }
}

function eventLabel(evt: VentureEvent): string {
  switch (evt.type) {
    case 'opportunity.detected':  return `Opportunity detected: ${String(evt.payload.title ?? '')}`
    case 'opportunity.validated': return `Validated: ${String(evt.payload.title ?? '')}`
    case 'venture.created':       return `Venture created: ${String(evt.payload.name ?? '')}`
    case 'capital.allocated': {
      const amt = typeof evt.payload.amount === 'number'
        ? `$${(evt.payload.amount / 1000).toFixed(0)}k`
        : ''
      return `Capital allocated${amt ? ': ' + amt : ''}`
    }
    case 'system.integrated': {
      const lvl = typeof evt.payload.integration_level === 'number'
        ? ` (${evt.payload.integration_level}%)`
        : ''
      return `System integrated${lvl}`
    }
    case 'efficiency.gained': {
      const pct = typeof evt.payload.reduction_pct === 'number'
        ? ` — ${evt.payload.reduction_pct}% friction removed`
        : ''
      return `Efficiency gained${pct}`
    }
    default: return evt.type
  }
}

function FrictionBar({ baseline, current, unit }: { baseline: number; current: number; unit: string }) {
  const reduction = baseline > 0 ? ((baseline - current) / baseline) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Before: {baseline} {unit}</span>
        <span>Now: {current} {unit}</span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {/* Baseline (full) */}
        <div className="absolute inset-0 bg-red-100 rounded-full" />
        {/* Current (reduced) */}
        <div
          style={{ width: `${(current / baseline) * 100}%`, background: '#16a34a' }}
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        />
      </div>
      <p className="text-xs font-semibold text-green-600 text-right">{reduction.toFixed(1)}% friction removed</p>
    </div>
  )
}

export function SystemImpactPanel() {
  const { impact, loading: impactLoading, error: impactError } = useSystemImpact()
  const { stats, loading: statsLoading } = useVentureStats()
  const { ventures } = useVentures()

  const ventureMap = new Map(ventures.map(v => [v.id, v]))
  const events: VentureEvent[] = stats?.recent_events ?? []

  const totalFrictionReduction = impact.length > 0
    ? impact.reduce((sum, i) => sum + i.friction_reduction_pct, 0) / impact.length
    : 0
  const totalCostSaving = stats?.impact.total_cost_saving_potential ?? 0

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">System Impact</h2>
        <p className="text-xs text-gray-500 mt-0.5">Friction eliminated, cost savings unlocked, event feed</p>
      </div>

      {impactLoading && (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading impact data…</span>
        </div>
      )}

      {impactError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {impactError}
        </div>
      )}

      {!impactLoading && !impactError && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-emerald-600">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Avg friction reduction</span>
              </div>
              <p className="text-xl font-bold text-emerald-700 tabular-nums">
                {totalFrictionReduction.toFixed(1)}%
              </p>
              <p className="text-xs text-emerald-500 mt-0.5">across {impact.length} measured metric{impact.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-teal-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-teal-600">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Cost saving potential</span>
              </div>
              <p className="text-xl font-bold text-teal-700 tabular-nums">
                ${(totalCostSaving / 1_000_000).toFixed(1)}M
              </p>
              <p className="text-xs text-teal-500 mt-0.5">across all opportunities</p>
            </div>
          </div>

          {/* Friction metrics */}
          {impact.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Friction Metrics</h3>
              <div className="space-y-3">
                {impact.map(metric => {
                  const venture = ventureMap.get(metric.venture_id)
                  return (
                    <div key={metric.id} className="border border-gray-100 rounded-xl p-3 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{metric.metric_name}</p>
                          {venture && (
                            <p className="text-xs text-gray-400">{venture.name}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(metric.measured_at).toLocaleDateString()}
                        </span>
                      </div>
                      <FrictionBar
                        baseline={metric.baseline_value}
                        current={metric.current_value}
                        unit={metric.unit}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Event feed */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Event Feed
              {!statsLoading && <span className="ml-1 text-gray-400 font-normal">(last {events.length})</span>}
            </h3>
            {events.length === 0 && (
              <p className="text-xs text-gray-400 py-2">No events yet.</p>
            )}
            <div className="space-y-1.5">
              {events.map(evt => (
                <div key={evt.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-base leading-none mt-0.5">{eventIcon(evt.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 leading-tight">{eventLabel(evt)}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(evt.emitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
