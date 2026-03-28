import { useState } from 'react'
import { ModuleHeader } from '../../shared/maturity/ModuleHeader'
import { CampaignView } from './CampaignView'
import { ChannelView } from './ChannelView'

type Tab = 'campaigns' | 'channels'

const TABS: { id: Tab; label: string }[] = [
  { id: 'campaigns', label: 'Kampanjer' },
  { id: 'channels', label: 'Kanaler' },
]

export function MediaHub() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns')

  return (
    <div className="flex flex-col h-full bg-[#0D1117] text-white">
      <ModuleHeader moduleId="media" />

      {/* Tabs */}
      <div className="flex gap-0 px-6 pt-4 pb-0 border-b border-white/[0.08] flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-white border-white/60'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'campaigns' && <CampaignView />}
        {activeTab === 'channels' && <ChannelView />}
      </div>
    </div>
  )
}
