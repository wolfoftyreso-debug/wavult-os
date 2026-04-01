import { useState } from 'react'
import { MOCK_CHANNELS } from './mockData'
import type { MediaChannel } from './types'

const PROVIDER_LABELS: Record<MediaChannel['provider'], string> = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  meta: 'Meta (Facebook/Instagram)',
  trade_desk: 'The Trade Desk',
  google_dv360: 'Google DV360',
  acast: 'Acast',
  manual: 'Manual',
}

const PROVIDER_ICONS: Record<MediaChannel['provider'], string> = {
  spotify: '🎵',
  youtube: '▶️',
  meta: '📘',
  trade_desk: '📊',
  google_dv360: '🎯',
  acast: '🎙️',
  manual: '✍️',
}

const STATUS_DOT: Record<MediaChannel['status'], string> = {
  connected: 'bg-green-400',
  pending: 'bg-yellow-400',
  disconnected: 'bg-red-500',
}

export function MediaSettingsView() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_CHANNELS.map(ch => [ch.id, '']))
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-text-primary font-semibold">Media Inställningar</h2>
        <p className="text-xs text-gray-9000 mt-0.5">Integrationsstatus och API-konfiguration</p>
      </div>

      {/* Integration status */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary">Integrationsstatus</h3>
        </div>
        <div className="divide-y divide-white/5">
          {MOCK_CHANNELS.map(ch => (
            <div key={ch.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-base">{PROVIDER_ICONS[ch.provider]}</span>
                  <span className="text-sm text-text-primary">{PROVIDER_LABELS[ch.provider]}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ch.status]}`} />
                    <span className="text-xs text-gray-9000 font-mono">{ch.status}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-9000 font-mono">{ch.api_adapter}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiKeys[ch.id]}
                  onChange={e => setApiKeys({ ...apiKeys, [ch.id]: e.target.value })}
                  placeholder={ch.provider === 'manual' ? 'Ingen API-nyckel krävs' : 'API-nyckel (tom tills vidare)'}
                  disabled={ch.provider === 'manual'}
                  className="flex-1 bg-white border border-surface-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-gray-700 focus:outline-none font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  disabled
                  className="px-3 py-1.5 text-xs text-gray-9000 border border-white/5 rounded-lg cursor-not-allowed"
                >
                  Spara
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event log */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Event Log</h3>
          <span className="text-xs text-gray-9000 font-mono">0 events</span>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="text-gray-9000 text-sm">Inga events ännu</div>
          <div className="text-gray-600 text-xs mt-1">
            MediaEvents loggas här när integrationer är aktiva (Fas 2+)
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-950/40 border border-blue-500/20 px-4 py-3 text-xs text-blue-300">
        ℹ️ API-nycklar sparas lokalt och aktiveras i Fas 2. Inga kopplingar är live ännu.
      </div>
    </div>
  )
}
