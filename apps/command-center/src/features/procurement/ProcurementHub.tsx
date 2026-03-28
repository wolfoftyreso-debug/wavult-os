import { useState } from 'react'
import { SuppliersView } from './SuppliersView'
import { PurchaseOrdersView } from './PurchaseOrdersView'
import { ProcurementContractsView } from './ProcurementContractsView'
import { ApprovalView } from './ApprovalView'
import { APPROVAL_REQUESTS, CONTRACTS } from './mockData'

type Tab = 'suppliers' | 'orders' | 'contracts' | 'approvals'

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date('2026-03-26')
  return Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const pendingApprovals = APPROVAL_REQUESTS.filter(r => r.status === 'väntande').length
const expiringContracts = CONTRACTS.filter(c => daysUntil(c.endDate) <= 90).length

const TABS: Array<{ id: Tab; label: string; icon: string; badge?: number }> = [
  { id: 'suppliers', label: 'Leverantörer',  icon: '🏢' },
  { id: 'orders',    label: 'Inköpsordrar',  icon: '📋' },
  { id: 'contracts', label: 'Kontrakt',      icon: '📄', badge: expiringContracts },
  { id: 'approvals', label: 'Godkännanden',  icon: '✅', badge: pendingApprovals },
]

export function ProcurementHub() {
  const [activeTab, setActiveTab] = useState<Tab>('suppliers')

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛒</span>
          <div>
            <h1 className="text-[16px] font-bold text-white">Inköp & Leverantörer</h1>
            <p className="text-xs text-gray-600 font-mono">Procurement — Wavult Group</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-6 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 relative ${
              activeTab === tab.id
                ? 'bg-white/[0.08] text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'suppliers'  && <SuppliersView />}
        {activeTab === 'orders'     && <PurchaseOrdersView />}
        {activeTab === 'contracts'  && <ProcurementContractsView />}
        {activeTab === 'approvals'  && <ApprovalView />}
      </div>
    </div>
  )
}
