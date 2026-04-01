// ─── Venture Engine — FinanceCO module ───────────────────────────────────────
// "Remove friction so effectively that systems become invisible."

import { useState, Component } from 'react'
import type { ReactNode } from 'react'
import { Rocket, AlertCircle } from 'lucide-react'
import { OpportunityFeed } from './OpportunityFeed'
import { ActiveVentures } from './ActiveVentures'
import { CapitalAllocation } from './CapitalAllocation'
import { SystemImpactPanel } from './SystemImpactPanel'
import { CreateVentureModal } from './CreateVentureModal'
import type { Opportunity } from './types'

// ---------------------------------------------------------------------------
// Error boundary per panel
// ---------------------------------------------------------------------------

class PanelErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; label: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm font-medium">{this.props.label} — failed to render</p>
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VentureEngine() {
  const [createVentureFor, setCreateVentureFor] = useState<Opportunity | null>(null)

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Venture Engine</h1>
          <p className="text-xs text-gray-500">
            FinanceCO · Identify inefficiency → build or invest → integrate → eliminate friction
          </p>
        </div>
      </div>

      {/* 4-panel grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 grid-rows-2 gap-3 p-4">
        {/* Panel A — Opportunity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-0">
          <PanelErrorBoundary label="Opportunity Feed">
            <OpportunityFeed onCreateVenture={setCreateVentureFor} />
          </PanelErrorBoundary>
        </div>

        {/* Panel B — Active Ventures */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-0">
          <PanelErrorBoundary label="Active Ventures">
            <ActiveVentures />
          </PanelErrorBoundary>
        </div>

        {/* Panel C — Capital Allocation */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-0">
          <PanelErrorBoundary label="Capital Allocation">
            <CapitalAllocation />
          </PanelErrorBoundary>
        </div>

        {/* Panel D — System Impact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-0">
          <PanelErrorBoundary label="System Impact">
            <SystemImpactPanel />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* Create Venture modal */}
      {createVentureFor && (
        <CreateVentureModal
          opportunity={createVentureFor}
          onClose={() => setCreateVentureFor(null)}
        />
      )}
    </div>
  )
}
