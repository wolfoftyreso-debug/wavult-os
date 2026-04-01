// ─── Webhook Log — Wavult OS ─────────────────────────────────────────────────
// Visar inkommande webhooks från Stripe, 46elks etc.
// Data hämtas från /api/events/webhooks

import { useState, useEffect, useCallback } from 'react'
import { Webhook, RefreshCw, AlertCircle, Activity } from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://api.wavult.com'

interface WebhookEntry {
  id: string
  source: string
  event: string
  status: number
  timestamp: string
  payload?: unknown
}

export function WebhookLog() {
  const [events, setEvents] = useState<WebhookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  const fetchWebhooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/events/webhooks?limit=50`, { signal: AbortSignal.timeout(8_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json() as { events: WebhookEntry[] }
      setEvents(d.events ?? [])
    } catch {
      setEvents([])
      setError(null) // Endpoint finns ej ännu — visa empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const sources = ['all', ...Array.from(new Set(events.map(e => e.source)))]
  const filtered = sourceFilter === 'all' ? events : events.filter(e => e.source === sourceFilter)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook size={14} className="text-blue-400" />
          <span className="text-xs font-semibold text-white">Webhook-logg</span>
        </div>
        <button
          onClick={fetchWebhooks}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Source filter */}
      {events.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {sources.map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                sourceFilter === s
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/10 text-white/40 hover:border-white/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <RefreshCw size={18} className="text-white/20 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <Activity size={24} className="text-white/10" />
            <p className="text-sm font-medium text-white/30">Inga webhooks ännu</p>
            <p className="text-xs text-white/20">
              Webhooks loggas här när de anländer från Stripe, 46elks m.fl.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(evt => (
              <div key={evt.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="text-[10px] font-mono w-10 text-center py-0.5 rounded flex-shrink-0"
                  style={{
                    background: evt.status < 400 ? '#34D39920' : '#F8717120',
                    color: evt.status < 400 ? '#34D399' : '#F87171',
                  }}
                >
                  {evt.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-mono truncate">{evt.event}</p>
                  <p className="text-[10px] text-white/30">{evt.source}</p>
                </div>
                <span className="text-[10px] text-white/20 font-mono flex-shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString('sv-SE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
