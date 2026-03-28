import { useState } from 'react'
import { KnowledgeBase } from './KnowledgeBase'
import { KnowledgeGraph } from './KnowledgeGraph'
import { AcademyView } from './AcademyView'
import { ZoomerCert } from './ZoomerCert'
import { PortfolioView } from './PortfolioView'

type Tab = 'kunskapsbas' | 'kunskapsgraf' | 'utbildning' | 'zoomer-cert' | 'portfolio'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'kunskapsbas', label: 'Kunskapsbas', icon: '📄' },
  { id: 'kunskapsgraf', label: 'Kunskapsgraf', icon: '🕸️' },
  { id: 'utbildning', label: 'Utbildning', icon: '🎓' },
  { id: 'zoomer-cert', label: 'Zoomer-cert', icon: '📸' },
  { id: 'portfolio', label: 'Idéportfolio', icon: '💡' },
]

export function KnowledgeHub() {
  const [activeTab, setActiveTab] = useState<Tab>('kunskapsbas')

  return (
    <div className="flex flex-col h-full bg-[#07080F] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-surface-border px-4 md:px-6 pt-4 md:pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">📚 Knowledge Hub</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Wavult Groups samlade kunskap, strukturer och utbildningsmaterial —{' '}
              <button
                onClick={() => setActiveTab('utbildning')}
                className="text-brand-accent hover:underline"
              >
                Ny i teamet? Börja med Utbildning →
              </button>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-brand-accent bg-brand-accent/5'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {activeTab === 'kunskapsbas' && <KnowledgeBase />}
        {activeTab === 'kunskapsgraf' && <KnowledgeGraph />}
        {activeTab === 'utbildning' && <AcademyView />}
        {activeTab === 'zoomer-cert' && <ZoomerCert />}
        {activeTab === 'portfolio' && <PortfolioView />}
      </div>
    </div>
  )
}
