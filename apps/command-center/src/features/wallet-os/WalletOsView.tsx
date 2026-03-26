// ─── Wallet OS — Main View ──────────────────────────────────────────────────
// Real-time payout + IR marketplace + gamification.
// Tabs: Wallet | Tasks | Intelligence Repos | Levels | Demand

import { useState } from 'react'
import { WalletDashboard } from './WalletDashboard'
import { TaskEngineView } from './TaskEngineView'
import { IRMarketplace } from './IRMarketplace'
import { LevelSystemView } from './LevelSystemView'
import { DemandEngineView } from './DemandEngineView'
import { MOCK_USER, getLevelDef } from './walletOsData'

type TabId = 'wallet' | 'tasks' | 'ir' | 'levels' | 'demand'

export function WalletOsView() {
  const [activeTab, setActiveTab] = useState<TabId>('wallet')
  const levelDef = getLevelDef(MOCK_USER.level)

  const tabs: { id: TabId; label: string; icon: string; badge?: string }[] = [
    { id: 'wallet', label: 'Wallet', icon: '◈', badge: `${MOCK_USER.wallet.available} ${MOCK_USER.wallet.currency}` },
    { id: 'tasks', label: 'Task Engine', icon: '◆' },
    { id: 'ir', label: 'Intelligence Repos', icon: '◉' },
    { id: 'levels', label: 'Levels & Streaks', icon: '★' },
    { id: 'demand', label: 'Demand Engine', icon: '▣' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#08090F]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-white">Wallet OS</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-lg border font-mono"
                  style={{ borderColor: levelDef.color + '40', background: levelDef.color + '10', color: levelDef.color }}>
                  {levelDef.icon} {levelDef.name} (L{MOCK_USER.level})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-lg border border-[#F59E0B25] bg-[#F59E0B08] text-[#F59E0B] font-mono">
                  {MOCK_USER.currentStreak} streak
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Zero-latency payouts + Intelligence Repos marketplace + gamified earning
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                <div className="text-[10px] text-gray-600">Available</div>
                <div className="text-sm font-bold text-[#10B981] font-mono">
                  {MOCK_USER.wallet.available} {MOCK_USER.wallet.currency}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                <div className="text-[10px] text-gray-600">Pending</div>
                <div className="text-sm font-bold text-[#F59E0B] font-mono">
                  {MOCK_USER.wallet.pending} {MOCK_USER.wallet.currency}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-0 mt-4 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="text-xs pb-2 mr-5 transition-colors border-b-2 flex items-center gap-1.5"
                style={{
                  color: activeTab === tab.id ? '#10B981' : '#6B7280',
                  borderColor: activeTab === tab.id ? '#10B981' : 'transparent',
                }}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'wallet' && <WalletDashboard />}
        {activeTab === 'tasks' && <TaskEngineView />}
        {activeTab === 'ir' && <IRMarketplace />}
        {activeTab === 'levels' && <LevelSystemView />}
        {activeTab === 'demand' && <DemandEngineView />}
      </div>
    </div>
  )
}
