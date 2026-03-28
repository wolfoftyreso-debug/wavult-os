import { useState } from 'react'
import { ExecutiveSummary } from './ExecutiveSummary'
import { FinancialReport } from './FinancialReport'
import { SalesReport } from './SalesReport'
import { OperationalReport } from './OperationalReport'
import { ExportView } from './ExportView'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

type Tab = 'executive' | 'financial' | 'sales' | 'operational' | 'export'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'executive',   label: 'Executive Summary', icon: '📊' },
  { id: 'financial',   label: 'Finansrapport',      icon: '💰' },
  { id: 'sales',       label: 'Säljrapport',         icon: '🎯' },
  { id: 'operational', label: 'Operativ rapport',    icon: '⚙️' },
  { id: 'export',      label: 'Exportera',           icon: '📥' },
]

export function ReportsHub() {
  const [activeTab, setActiveTab] = useState<Tab>('executive')
  const { activeEntity } = useEntityScope()

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">📊</span>
          <div>
            <h1 className="text-[16px] font-bold text-white">Rapporter & Analytics</h1>
            <p className="text-xs text-gray-600 font-mono">
              {activeEntity.layer === 0 ? 'Wavult Group — konsoliderat' : activeEntity.name}
            </p>
          </div>
          <div
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
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

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
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
        {activeTab === 'executive'   && <ExecutiveSummary />}
        {activeTab === 'financial'   && <FinancialReport />}
        {activeTab === 'sales'       && <SalesReport />}
        {activeTab === 'operational' && <OperationalReport />}
        {activeTab === 'export'      && <ExportView />}
      </div>
    </div>
  )
}
