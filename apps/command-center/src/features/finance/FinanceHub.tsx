import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { ModuleHeader } from '../../shared/maturity/ModuleHeader'
import { FinanceOverview } from './FinanceOverview'
import { ChartOfAccounts } from './ChartOfAccounts'
import { LedgerView } from './LedgerView'
import { InvoiceHub } from './InvoiceHub'
import { CashFlowView } from './CashFlowView'
import { TaxView } from './TaxView'
import { IntercompanyView } from './IntercompanyView'
import { PaymentProcessor } from './PaymentProcessor'
import { CashFlowOptimizer } from './CashFlowOptimizer'

type Tab = 'overview' | 'accounts' | 'ledger' | 'invoices' | 'cashflow' | 'tax' | 'intercompany' | 'payments' | 'optimization'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'overview',      label: 'Översikt',      icon: '📊' },
  { id: 'accounts',      label: 'Kontoplan',     icon: '📋' },
  { id: 'ledger',        label: 'Transaktioner', icon: '↕' },
  { id: 'invoices',      label: 'Fakturor',      icon: '🧾' },
  { id: 'cashflow',      label: 'Kassaflöde',    icon: '💧' },
  { id: 'tax',           label: 'Moms/Skatt',    icon: '🏛️' },
  { id: 'intercompany',  label: 'Intercompany',  icon: '↔️' },
  { id: 'payments',      label: 'Betalningar',   icon: '💳' },
  { id: 'optimization',  label: 'Optimering',    icon: '⚡' },
]

export function FinanceHub() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { activeEntity } = useEntityScope()

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white">
      <ModuleHeader moduleId="finance" />
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div>
            <h1 className="text-[16px] font-bold text-white">Finance Hub</h1>
            <p className="text-[10px] text-gray-600 font-mono">
              {activeEntity.layer === 0 ? 'Wavult Group — konsoliderad' : activeEntity.name}
            </p>
          </div>
          <div
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium"
            style={{
              background: activeEntity.color + '15',
              border: `1px solid ${activeEntity.color}30`,
              color: activeEntity.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
            {activeEntity.name}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-6 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview'     && <FinanceOverview />}
        {activeTab === 'accounts'     && <ChartOfAccounts />}
        {activeTab === 'ledger'       && <LedgerView />}
        {activeTab === 'invoices'     && <InvoiceHub />}
        {activeTab === 'cashflow'     && <CashFlowView />}
        {activeTab === 'tax'          && <TaxView />}
        {activeTab === 'intercompany' && <IntercompanyView />}
        {activeTab === 'payments'     && <PaymentProcessor />}
        {activeTab === 'optimization' && <CashFlowOptimizer />}
      </div>
    </div>
  )
}
