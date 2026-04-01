// ─── Panel B: Active Ventures ─────────────────────────────────────────────────

import { useState } from 'react'
import {
  Loader2, AlertCircle, TrendingUp, TrendingDown,
  Flame, Layers, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useVentures, useCapital, useAllocateCapital } from './useVentureEngine'
import type { Venture } from './types'

function statusColor(status: Venture['status']): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'ideation':   return { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }
    case 'building':   return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' }
    case 'live':       return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' }
    case 'integrated': return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' }
  }
}

function IntegrationBar({ level }: { level: number }) {
  const color = level >= 80 ? '#16a34a' : level >= 40 ? '#d97706' : '#6b7280'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Integration</span>
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>{level}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          style={{ width: `${level}%`, background: color }}
          className="h-full rounded-full transition-all duration-500"
        />
      </div>
    </div>
  )
}

interface AllocateModalProps {
  venture: Venture
  onClose: () => void
  onAllocated: () => void
}

function AllocateModal({ venture, onClose, onAllocated }: AllocateModalProps) {
  const { allocate, loading, error } = useAllocateCapital()
  const [amount, setAmount] = useState('')
  const [burnRate, setBurnRate] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await allocate({
      venture_id: venture.id,
      amount: Number(amount),
      burn_rate: burnRate ? Number(burnRate) : undefined,
    })
    if (result) {
      onAllocated()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Allocate Capital</h3>
        <p className="text-xs text-gray-500 mb-4">To: <span className="font-medium text-gray-700">{venture.name}</span></p>

        <form onSubmit={e => void handleSubmit(e)} className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Amount (USD)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              placeholder="e.g. 250000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Monthly burn rate (USD, optional)</label>
            <input
              type="number"
              min="0"
              value={burnRate}
              onChange={e => setBurnRate(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Allocating…' : 'Allocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ActiveVentures() {
  const { ventures, loading, error, reload: reloadVentures } = useVentures()
  const { reload: reloadCapital } = useCapital()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [allocateFor, setAllocateFor] = useState<Venture | null>(null)

  function toggle(id: string) {
    setExpanded(prev => (prev === id ? null : id))
  }

  function handleAllocated() {
    reloadVentures()
    reloadCapital()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Active Ventures</h2>
        <p className="text-xs text-gray-500 mt-0.5">Integration progress, ROI tracking, burn rate</p>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading ventures…</span>
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
          {ventures.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No ventures yet. Validate an opportunity and create one.</p>
          )}
          {ventures.map(venture => {
            const s = statusColor(venture.status)
            const isExpanded = expanded === venture.id
            const roiDiff = venture.roi_actual - venture.roi_projected

            return (
              <div key={venture.id} className="border border-gray-100 rounded-xl bg-white overflow-hidden hover:border-gray-200 transition-all">
                {/* Card header */}
                <button
                  className="w-full p-3 text-left"
                  onClick={() => toggle(venture.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {venture.status}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    }
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900 mt-1.5 mb-2">{venture.name}</h3>

                  <IntegrationBar level={venture.integration_level} />

                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">ROI actual</p>
                      <p className={`text-sm font-bold ${venture.roi_actual > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {venture.roi_actual > 0 ? `${venture.roi_actual.toFixed(1)}×` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">ROI target</p>
                      <p className="text-sm font-bold text-gray-700">{venture.roi_projected.toFixed(1)}×</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-400" /> Burn
                      </p>
                      <p className="text-sm font-bold text-orange-500">
                        ${(venture.burn_rate / 1000).toFixed(0)}k/mo
                      </p>
                    </div>
                  </div>

                  {venture.roi_actual > 0 && (
                    <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${roiDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {roiDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {roiDiff >= 0 ? '+' : ''}{roiDiff.toFixed(1)}× vs target
                    </div>
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-50 px-3 pb-3 pt-2 space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Problem</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{venture.problem_definition}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">System design</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{venture.system_design}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Revenue model</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{venture.revenue_model}</p>
                    </div>
                    <button
                      onClick={() => setAllocateFor(venture)}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Allocate Capital
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {allocateFor && (
        <AllocateModal
          venture={allocateFor}
          onClose={() => setAllocateFor(null)}
          onAllocated={handleAllocated}
        />
      )}
    </div>
  )
}
