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
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <div>
            <h1 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Milestones</h1>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>Wavult Group — Thailand · quiXzoom · Bolag · Roadmap</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 md:px-6 py-2 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {TABS.map(tab => {
          const badge = tab.badge?.()
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0"
              style={isActive ? {
                background: 'var(--color-accent-light)',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
              } : {
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid transparent',
              }}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              {tab.label}
              {badge && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: 'var(--color-danger)', color: '#fff' }}
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
