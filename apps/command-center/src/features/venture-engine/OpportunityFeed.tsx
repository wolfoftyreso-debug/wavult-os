// ─── Panel A: Opportunity Feed ────────────────────────────────────────────────

import { useState } from 'react'
import {
  TrendingUp, CheckCircle2, AlertCircle, Loader2,
  Building2, Truck, Heart, GraduationCap, DollarSign, Filter,
} from 'lucide-react'
import { useOpportunities, useValidateOpportunity } from './useVentureEngine'
import type { Industry, OpportunityStatus, Opportunity } from './types'

const INDUSTRIES: { value: Industry | ''; label: string }[] = [
  { value: '', label: 'All industries' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Government', label: 'Government' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Education', label: 'Education' },
]

const STATUSES: { value: OpportunityStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'detected', label: 'Detected' },
  { value: 'validated', label: 'Validated' },
  { value: 'building', label: 'Building' },
  { value: 'invested', label: 'Invested' },
  { value: 'integrated', label: 'Integrated' },
]

function industryIcon(industry: Industry) {
  const cls = 'w-3.5 h-3.5'
  switch (industry) {
    case 'Healthcare':  return <Heart className={cls} />
    case 'Government':  return <Building2 className={cls} />
    case 'Logistics':   return <Truck className={cls} />
    case 'Finance':     return <DollarSign className={cls} />
    case 'Education':   return <GraduationCap className={cls} />
  }
}

function statusColor(status: OpportunityStatus): string {
  switch (status) {
    case 'detected':   return 'bg-gray-100 text-gray-600'
    case 'validated':  return 'bg-blue-50 text-blue-700'
    case 'building':   return 'bg-amber-50 text-amber-700'
    case 'invested':   return 'bg-purple-50 text-purple-700'
    case 'integrated': return 'bg-green-50 text-green-700'
  }
}

function impactBar(score: number) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#16a34a' : score >= 6 ? '#d97706' : '#6b7280'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}/10</span>
    </div>
  )
}

interface Props {
  onCreateVenture: (opp: Opportunity) => void
}

export function OpportunityFeed({ onCreateVenture }: Props) {
  const [filterIndustry, setFilterIndustry] = useState<Industry | ''>('')
  const [filterStatus, setFilterStatus] = useState<OpportunityStatus | ''>('')

  const { opportunities, loading, error, reload } = useOpportunities(
    filterIndustry || undefined,
    filterStatus || undefined,
  )
  const { validate, loading: validating } = useValidateOpportunity()

  async function handleValidate(id: string) {
    await validate(id)
    reload()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Opportunity Feed</h2>
          <p className="text-xs text-gray-500 mt-0.5">Ranked by impact score — highest friction, highest priority</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterIndustry}
            onChange={e => setFilterIndustry(e.target.value as Industry | '')}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INDUSTRIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as OpportunityStatus | '')}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex-1 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading opportunities…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {opportunities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No opportunities match the current filters.</p>
          )}
          {opportunities.map(opp => (
            <div
              key={opp.id}
              className="border border-gray-100 rounded-xl p-3 bg-white hover:border-blue-200 hover:shadow-sm transition-all"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-gray-400">{industryIcon(opp.industry)}</span>
                  <span className="text-xs font-medium text-gray-500">{opp.industry}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(opp.status)}`}>
                    {opp.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{opp.source}</span>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-1">{opp.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">{opp.inefficiency_description}</p>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Impact</p>
                  {impactBar(opp.impact_score)}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Complexity</p>
                  {impactBar(opp.complexity_score)}
                </div>
              </div>

              {/* Savings + actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  ${(opp.cost_saving_potential / 1_000_000).toFixed(1)}M potential savings
                </div>
                <div className="flex items-center gap-1.5">
                  {opp.status === 'detected' && (
                    <button
                      onClick={() => void handleValidate(opp.id)}
                      disabled={validating}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Validate
                    </button>
                  )}
                  {(opp.status === 'validated' || opp.status === 'building') && (
                    <button
                      onClick={() => onCreateVenture(opp)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Venture
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
