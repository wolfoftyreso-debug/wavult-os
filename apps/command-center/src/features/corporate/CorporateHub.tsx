import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { BoardView } from './BoardView'
import { JurisdictionView } from './JurisdictionView'
import { DocumentVault } from './DocumentVault'
import { ComplianceTracker } from './ComplianceTracker'
import { OwnershipView } from './OwnershipView'
import { BOARD_MEETINGS, COMPLIANCE_ITEMS, COMPANIES } from './data'

type Tab = 'board' | 'jurisdictions' | 'documents' | 'compliance' | 'ownership'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'board',         label: 'Styrelse & Beslut',  icon: '🏛️' },
  { id: 'jurisdictions', label: 'Jurisdiktioner',     icon: '🌍' },
  { id: 'documents',     label: 'Bolagsdokument',     icon: '📁' },
  { id: 'compliance',    label: 'Compliance',         icon: '✅' },
  { id: 'ownership',     label: 'Ägarstruktur',       icon: '🔗' },
]

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function QuickStats() {
  const activeCompanies = COMPANIES.filter(c => c.status === 'aktiv').length
  const upcomingMeetings = BOARD_MEETINGS.filter(m => m.status === 'planerat').length
  const pendingCompliance = COMPLIANCE_ITEMS.filter(i => i.status !== 'klar').length
  const overdue = COMPLIANCE_ITEMS.filter(i => i.status !== 'klar' && daysUntil(i.deadline) < 0).length
  const urgentDeadlines = COMPLIANCE_ITEMS.filter(
    i => i.status !== 'klar' && daysUntil(i.deadline) > 0 && daysUntil(i.deadline) <= 30
  ).length

  return (
    <div className="flex gap-3 flex-wrap text-xs">
      {[
        { label: 'Bolag', value: activeCompanies, color: 'bg-indigo-400' },
        { label: 'Planerade möten', value: upcomingMeetings, color: 'bg-blue-400' },
        { label: 'Compliance öppna', value: pendingCompliance, color: 'bg-yellow-400' },
        { label: 'Förfallna', value: overdue, color: 'bg-red-400' },
        { label: 'Brådskande (30d)', value: urgentDeadlines, color: 'bg-orange-400' },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-surface-border">
          <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
          <span className="text-gray-9000">{s.label}:</span>
          <span className="text-text-primary font-semibold">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

export function CorporateHub() {
  const [activeTab, setActiveTab] = useState<Tab>('board')
  const { activeEntity } = useEntityScope()

  return (
    <div className="flex flex-col h-full bg-muted/30 text-text-primary">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-start gap-3 justify-between flex-wrap gap-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            <div>
              <h1 className="text-[16px] font-bold text-text-primary">Bolagsadmin</h1>
              <p className="text-xs text-gray-9000 font-mono">
                {activeEntity.shortName} — {COMPANIES.length} entiteter · SE · US-DE · US-TX · LT · AE
              </p>
            </div>
          </div>
          <QuickStats />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 md:px-6 py-2 border-b border-surface-border flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-9000 hover:text-gray-600 hover:bg-muted/30'
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'board'         && <BoardView />}
        {activeTab === 'jurisdictions' && <JurisdictionView />}
        {activeTab === 'documents'     && <DocumentVault />}
        {activeTab === 'compliance'    && <ComplianceTracker />}
        {activeTab === 'ownership'     && <OwnershipView />}
      </div>
    </div>
  )
}
