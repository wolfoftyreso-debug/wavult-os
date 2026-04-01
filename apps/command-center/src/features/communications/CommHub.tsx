import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { InboxView } from './InboxView'
import { SMSView } from './SMSView'
import { NotificationCenter } from './NotificationCenter'
import { WebhookLog } from './WebhookLog'
import { APIStatusView } from './APIStatusView'
import { ContactsView } from './ContactsView'
import { RoutingView } from './RoutingView'

type Tab = 'contacts' | 'inbox' | 'sms' | 'routing' | 'notifications' | 'webhooks' | 'api-status'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'contacts',      label: 'Kontakter',   icon: '📋' },
  { id: 'inbox',         label: 'Inkorgen',    icon: '📬' },
  { id: 'sms',           label: 'SMS/Notiser', icon: '📱' },
  { id: 'routing',       label: 'Routing',     icon: '🔀' },
  { id: 'notifications', label: 'Systemlarm',  icon: '🔔' },
  { id: 'webhooks',      label: 'Webhooks',    icon: '🔗' },
  { id: 'api-status',    label: 'API-status',  icon: '🟢' },
]

export function CommHub() {
  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const { activeEntity } = useEntityScope()

  return (
    <div className="flex flex-col h-full bg-muted/30 text-text-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">📡</span>
          <div>
            <h1 className="text-[16px] font-bold text-text-primary">Kommunikation</h1>
            <p className="text-xs text-gray-9000 font-mono">
              {activeEntity.layer === 0 ? 'Wavult Group — alla kanaler' : activeEntity.name}
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

      {/* Tab navigation */}
      <div className="flex gap-1 px-6 py-2 border-b border-surface-border flex-shrink-0 overflow-x-auto">
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
        {activeTab === 'contacts'      && <ContactsView />}
        {activeTab === 'inbox'         && <InboxView />}
        {activeTab === 'sms'           && <SMSView />}
        {activeTab === 'routing'       && <RoutingView />}
        {activeTab === 'notifications' && <NotificationCenter />}
        {activeTab === 'webhooks'      && <WebhookLog />}
        {activeTab === 'api-status'    && <APIStatusView />}
      </div>
    </div>
  )
}
