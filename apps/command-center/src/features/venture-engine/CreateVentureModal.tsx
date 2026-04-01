// ─── Create Venture Modal ─────────────────────────────────────────────────────

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useCreateVenture } from './useVentureEngine'
import type { Opportunity } from './types'

interface Props {
  opportunity: Opportunity
  onClose: () => void
}

export function CreateVentureModal({ opportunity, onClose }: Props) {
  const { create, loading, error } = useCreateVenture()
  const [form, setForm] = useState({
    name: '',
    problem_definition: '',
    system_design: '',
    revenue_model: '',
    integration_plan: '',
    burn_rate: '',
    roi_projected: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await create({
      opportunity_id: opportunity.id,
      name: form.name,
      problem_definition: form.problem_definition,
      system_design: form.system_design,
      revenue_model: form.revenue_model,
      integration_plan: form.integration_plan,
      burn_rate: form.burn_rate ? Number(form.burn_rate) : 0,
      roi_projected: form.roi_projected ? Number(form.roi_projected) : 0,
    })
    if (result) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Create Venture</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              From: <span className="font-medium text-gray-700">{opportunity.title}</span>
              {' · '}{opportunity.industry}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={e => void handleSubmit(e)} className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Venture name *</label>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. ClearSlot Health"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Problem definition *</label>
            <textarea
              required
              value={form.problem_definition}
              onChange={e => set('problem_definition', e.target.value)}
              placeholder="What exact friction are we eliminating? Quantify the cost."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">System design *</label>
            <textarea
              required
              value={form.system_design}
              onChange={e => set('system_design', e.target.value)}
              placeholder="How will the system work? What integrations, automations, or platforms?"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Revenue model</label>
            <textarea
              value={form.revenue_model}
              onChange={e => set('revenue_model', e.target.value)}
              placeholder="SaaS, marketplace fee, white-label, embedded…"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Integration plan</label>
            <textarea
              value={form.integration_plan}
              onChange={e => set('integration_plan', e.target.value)}
              placeholder="Phase 1: … Phase 2: … Phase 3: …"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Monthly burn (USD)</label>
              <input
                type="number"
                min="0"
                value={form.burn_rate}
                onChange={e => set('burn_rate', e.target.value)}
                placeholder="e.g. 25000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Target ROI (×)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.roi_projected}
                onChange={e => set('roi_projected', e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={e => void handleSubmit(e as unknown as React.FormEvent)}
            disabled={loading || !form.name || !form.problem_definition || !form.system_design}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Creating…' : 'Create Venture'}
          </button>
        </div>
      </div>
    </div>
  )
}
