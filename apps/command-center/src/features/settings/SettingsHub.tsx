import { useState } from 'react'
import { APIKeysView } from './APIKeysView'
import { RolesView } from './RolesView'
import { EntitySettingsView } from './EntitySettingsView'
import { NotificationSettings } from './NotificationSettings'
import { SystemView } from './SystemView'

type Tab = 'api-keys' | 'roles' | 'entities' | 'notifications' | 'system'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'api-keys',       label: 'API-nycklar',           icon: '🔑' },
  { id: 'roles',          label: 'Roller & Behörigheter', icon: '🛡' },
  { id: 'entities',       label: 'Entitetsinställningar', icon: '🏢' },
  { id: 'notifications',  label: 'Notiser',               icon: '🔔' },
  { id: 'system',         label: 'System',                icon: '⚙️' },
]

export function SettingsHub() {
  const [activeTab, setActiveTab] = useState<Tab>('api-keys')

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="text-[16px] font-bold text-white">Inställningar</h1>
            <p className="text-xs text-gray-600 font-mono">
              Wavult OS — systemkonfiguration &amp; behörigheter
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{
              background: '#8B5CF615',
              border: '1px solid #8B5CF630',
              color: '#8B5CF6',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            System Admin
          </div>
        </div>
      </div>

      {/* Tab navigation */}
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
        {activeTab === 'api-keys'      && <APIKeysView />}
        {activeTab === 'roles'         && <RolesView />}
        {activeTab === 'entities'      && <EntitySettingsView />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'system'        && <SystemView />}
      </div>
    </div>
  )
}
