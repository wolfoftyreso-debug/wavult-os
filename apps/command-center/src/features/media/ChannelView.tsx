import { useState } from 'react'
import type { MediaChannel } from './types'
import { MOCK_CHANNELS } from './mockData'

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

const TYPE_LABELS: Record<MediaChannel['type'], string> = {
  audio: 'Audio',
  video: 'Video',
  display: 'Display',
  social: 'Social',
  programmatic: 'Programmatic',
}

const STATUS_STYLES: Record<MediaChannel['status'], string> = {
  connected: 'bg-green-900/50 text-green-300 border border-green-700/50',
  pending: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  disconnected: 'bg-red-900/30 text-red-400 border border-red-700/30',
}

const API_DOCS: Partial<Record<MediaChannel['provider'], string>> = {
  spotify: 'https://developer.spotify.com/documentation/web-api/',
  youtube: 'https://developers.google.com/youtube/v3',
  meta: 'https://developers.facebook.com/docs/marketing-apis/',
  trade_desk: 'https://api.thetradedesk.com/v3/portal/',
}

function ConnectModal({ channel, onClose }: { channel: MediaChannel; onClose: () => void }) {
  const apiDocUrl = API_DOCS[channel.provider]
  const providerName = PROVIDER_LABELS[channel.provider]

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0F1A] border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">{PROVIDER_ICONS[channel.provider]}</span>
            <h2 className="text-white font-semibold">Koppla {providerName}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-yellow-950/40 border border-yellow-500/20 px-4 py-3">
            <p className="text-sm text-yellow-300 font-medium mb-1">Integration planerad för Fas 2</p>
            <p className="text-xs text-yellow-400/70">
              Kopplingen till {providerName} aktiveras i Q2 2026 när integrationsskiktet är klart.
              Du kan redan nu förbereda API-nycklar under Inställningar.
            </p>
          </div>

          {apiDocUrl && (
            <div className="rounded-lg bg-blue-950/30 border border-blue-500/20 px-4 py-3">
              <p className="text-xs text-blue-300 font-medium mb-1">API-dokumentation tillgänglig</p>
              <a
                href={apiDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-accent hover:underline break-all"
              >
                {apiDocUrl}
              </a>
            </div>
          )}

          <div className="text-xs text-gray-600">
            Adapter: <code className="font-mono text-gray-500">{channel.api_adapter}</code>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Stäng</button>
        </div>
      </div>
    </div>
  )
}

export function ChannelView() {
  const [connectingChannel, setConnectingChannel] = useState<MediaChannel | null>(null)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-semibold">Kanaler</h2>
        <p className="text-xs text-gray-500 mt-0.5">7 kanaler konfigurerade · Inga aktiva ännu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOCK_CHANNELS.map(channel => (
          <div
            key={channel.id}
            className="bg-[#0D0F1A] border border-white/10 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center text-xl">
                  {PROVIDER_ICONS[channel.provider]}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{PROVIDER_LABELS[channel.provider]}</div>
                  <div className="text-xs text-gray-500">{TYPE_LABELS[channel.type]}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${STATUS_STYLES[channel.status]}`}>
                {channel.status}
              </span>
            </div>

            <div className="text-xs text-gray-600 font-mono">
              {channel.api_adapter}
            </div>

            <button
              onClick={() => setConnectingChannel(channel)}
              className="w-full py-1.5 text-xs text-gray-400 border border-white/10 rounded-lg hover:border-white/20 hover:text-white transition-colors"
            >
              Koppla
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-blue-950/40 border border-blue-500/20 px-4 py-3 text-xs text-blue-300">
        ℹ️ Fas 1 — Inga kanaler är live. Integrationer aktiveras i Fas 2 (Q2 2026).
      </div>

      {connectingChannel && (
        <ConnectModal channel={connectingChannel} onClose={() => setConnectingChannel(null)} />
      )}
    </div>
  )
}
