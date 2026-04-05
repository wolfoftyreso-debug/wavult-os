import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { BoardView } from './BoardView'
import { JurisdictionView } from './JurisdictionView'
import { DocumentVault } from './DocumentVault'
import { ComplianceTracker } from './ComplianceTracker'
import { OwnershipView } from './OwnershipView'
import { useCorpEntities, useCorpBoardMeetings, useCorpComplianceStats } from './hooks/useCorporate'

type Tab = 'board' | 'jurisdictions' | 'documents' | 'compliance' | 'ownership'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'board',         label: 'Styrelse & Beslut',  icon: '🏛️' },
  { id: 'jurisdictions', label: 'Jurisdiktioner',     icon: '🌍' },
  { id: 'documents',     label: 'Bolagsdokument',     icon: '📁' },
  { id: 'compliance',    label: 'Compliance',         icon: '✅' },
  { id: 'ownership',     label: 'Ägarstruktur',       icon: '🔗' },
]

function QuickStats() {
  const { data: entities = [] } = useCorpEntities()
  const { data: meetings = [] } = useCorpBoardMeetings()
  const { data: stats } = useCorpComplianceStats()

  const activeCompanies = entities.filter(c => c.status === 'aktiv').length
  const upcomingMeetings = meetings.filter(m => m.status === 'planerat').length
  const pendingCompliance = stats ? stats.total - stats.completed : 0
  const overdue = stats?.overdue ?? 0
  const urgentDeadlines = stats?.dueIn30 ?? 0

  return (
    <div className="flex gap-3 flex-wrap text-xs">
      {[
        { label: 'Bolag', value: activeCompanies, color: '#0A3D62' },
        { label: 'Planerade möten', value: upcomingMeetings, color: '#E8B84B' },
        { label: 'Compliance öppna', value: pendingCompliance, color: '#B8760A' },
        { label: 'Förfallna', value: overdue, color: '#C0392B' },
        { label: 'Brådskande (30d)', value: urgentDeadlines, color: '#E67E22' },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-surface-border">
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
          <span className="text-gray-500">{s.label}:</span>
          <span className="text-text-primary font-semibold">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

export function CorporateHub() {
  const [activeTab, setActiveTab] = useState<Tab>('board')
  const { activeEntity } = useEntityScope()
  const { data: entities = [] } = useCorpEntities()

  return (
    <div className="flex flex-col h-full bg-muted/30 text-text-primary">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-start gap-3 justify-between flex-wrap gap-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            <div>
              <h1 className="text-[16px] font-bold text-text-primary">Bolagsadmin</h1>
              <p className="text-xs text-gray-500 font-mono">
                {activeEntity.shortName} — {entities.length} entiteter · {entities.map(e => e.jurisdiction?.split(',')[0]?.split(' ')[0]).filter((j,i,a) => j && a.indexOf(j)===i).join(' · ')}
              </p>
            </div>
          </div>
          <QuickStats />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0 px-4 md:px-6 border-b border-surface-border flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 border-b-2 ${
              activeTab === tab.id
                ? 'border-[#E8B84B] text-[#0A3D62]'
                : 'border-transparent text-gray-500 hover:text-[#0A3D62] hover:border-[#E8B84B]/30'
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
