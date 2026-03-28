import { useState } from 'react'
import { ModuleHeader } from '../../shared/maturity/ModuleHeader'
import { PipelineView } from './PipelineView'
import { ProspectList } from './ProspectList'
import { ContactsView } from './ContactsView'
import { DealsView } from './DealsView'
import { ActivityLog } from './ActivityLog'
import { TargetsView } from './TargetsView'
import { PROSPECTS, DEALS, ACTIVITIES } from './data'

type Tab = 'pipeline' | 'prospects' | 'contacts' | 'deals' | 'activities' | 'targets'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: '🔀' },
  { id: 'prospects', label: 'Prospects', icon: '📊' },
  { id: 'contacts', label: 'Kontakter', icon: '👤' },
  { id: 'deals', label: 'Avtal', icon: '📝' },
  { id: 'activities', label: 'Aktiviteter', icon: '📋' },
  { id: 'targets', label: 'Targets', icon: '🎯' },
]

function QuickStats() {
  const activeProspects = PROSPECTS.filter(p => !['Vunnen', 'Förlorad'].includes(p.stage)).length
  const pipelineValue = PROSPECTS
    .filter(p => !['Vunnen', 'Förlorad'].includes(p.stage))
    .reduce((s, p) => s + p.valueSEK, 0)
  const wonValue = PROSPECTS.filter(p => p.stage === 'Vunnen').reduce((s, p) => s + p.valueSEK, 0)
  const pendingActivities = ACTIVITIES.filter(a => {
    const d = new Date(a.date)
    return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }).length

  return (
    <div className="flex gap-4 flex-wrap text-xs">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay border border-surface-border">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        <span className="text-gray-400">Aktiva:</span>
        <span className="text-white font-semibold">{activeProspects}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay border border-surface-border">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
        <span className="text-gray-400">Pipeline:</span>
        <span className="text-white font-semibold">
          {new Intl.NumberFormat('sv-SE', { notation: 'compact', maximumFractionDigits: 0 }).format(pipelineValue)} kr
        </span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay border border-surface-border">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        <span className="text-gray-400">Vunnet:</span>
        <span className="text-white font-semibold">
          {new Intl.NumberFormat('sv-SE', { notation: 'compact', maximumFractionDigits: 0 }).format(wonValue)} kr
        </span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay border border-surface-border">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
        <span className="text-gray-400">Aktiviteter (7d):</span>
        <span className="text-white font-semibold">{pendingActivities}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-overlay border border-surface-border">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-gray-400">Signerade avtal:</span>
        <span className="text-white font-semibold">{DEALS.filter(d => d.status === 'Signerad').length}</span>
      </div>
    </div>
  )
}

export function CRMHub() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline')

  return (
    <div className="flex flex-col h-full">
      <ModuleHeader moduleId="crm" />
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 flex flex-col gap-4 flex-shrink-0">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-semibold text-white">CRM</h1>
            <p className="text-sm text-gray-300 mt-0.5">
              Wavult Sales — quiXzoom · Landvex · Hypbit
            </p>
          </div>
          <QuickStats />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-surface-border -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4 md:py-5">
        {activeTab === 'pipeline' && <PipelineView />}
        {activeTab === 'prospects' && <ProspectList />}
        {activeTab === 'contacts' && <ContactsView />}
        {activeTab === 'deals' && <DealsView />}
        {activeTab === 'activities' && <ActivityLog />}
        {activeTab === 'targets' && <TargetsView />}
      </div>
    </div>
  )
}
