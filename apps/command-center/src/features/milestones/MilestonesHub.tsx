import { useState } from 'react'
import { MilestonesOverview } from './MilestonesOverview'
import { ThailandPrepView } from './ThailandPrepView'
import { ThailandCalendarView } from './ThailandCalendarView'
import { QuixzoomLaunchView } from './QuixzoomLaunchView'
import { BolagsstrukturView } from './BolagsstrukturView'
import { RoadmapView } from './RoadmapView'
import { getDaysUntil, THAILAND_DATE } from './data'

type Tab = 'overview' | 'thailand' | 'thailand-calendar' | 'quixzoom' | 'bolag' | 'roadmap'

const TABS: Array<{ id: Tab; label: string; icon: string; badge?: () => string | null }> = [
  { id: 'overview', label: 'Översikt', icon: '📊' },
  {
    id: 'thailand',
    label: 'Thailand Prep',
    icon: '🇹🇭',
    badge: () => {
      const d = getDaysUntil(THAILAND_DATE)
      return d >= 0 && d <= 30 ? `${d}d` : null
    },
  },
  { id: 'thailand-calendar', label: 'Program & Kalender', icon: '📅' },
  { id: 'quixzoom', label: 'quiXzoom Launch', icon: '📷' },
  { id: 'bolag', label: 'Bolagsstruktur', icon: '🏛️' },
  { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
]

export function MilestonesHub() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <div>
            <h1 className="text-[16px] font-bold text-white">Milestones</h1>
            <p className="text-xs text-gray-600 font-mono">Wavult Group — Thailand · quiXzoom · Bolag · Roadmap</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 md:px-6 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => {
          const badge = tab.badge?.()
          return (
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
              {badge && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none"
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview'  && <MilestonesOverview />}
        {activeTab === 'thailand'          && <ThailandPrepView />}
        {activeTab === 'thailand-calendar' && <ThailandCalendarView />}
        {activeTab === 'quixzoom'  && <QuixzoomLaunchView />}
        {activeTab === 'bolag'     && <BolagsstrukturView />}
        {activeTab === 'roadmap'   && <RoadmapView />}
      </div>
    </div>
  )
}
