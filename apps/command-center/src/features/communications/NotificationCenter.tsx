import { useState, useEffect } from 'react'

type NotifLevel = 'info' | 'warning' | 'critical'

interface SystemNotification {
  id: string
  title: string
  body: string
  level: NotifLevel
  source: string
  timestamp: string
  read: boolean
}

const BASE_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-001',
    title: 'hypbit-api v1.4.2 — deploy lyckades',
    body: 'ECS deployment klar. Alla tasks healthy. 0 failed containers.',
    level: 'info',
    source: 'AWS ECS',
    timestamp: '2026-03-26T09:00:00Z',
    read: false,
  },
  {
    id: 'notif-002',
    title: 'Stripe webhook timeout × 12',
    body: 'Stripe payment.completed webhook fick timeout 12 gånger senaste timmen. Undersök endpoint.',
    level: 'critical',
    source: 'Stripe',
    timestamp: '2026-03-26T08:44:00Z',
    read: false,
  },
  {
    id: 'notif-003',
    title: 'Supabase DB — 87% lagringsutnyttjande',
    body: 'Supabase-projektet wavult-prod använder 87% av tilldelad lagring. Överväg uppgradering.',
    level: 'warning',
    source: 'Supabase',
    timestamp: '2026-03-26T07:30:00Z',
    read: false,
  },
  {
    id: 'notif-004',
    title: 'Revolut KYC godkänt',
    body: 'Wavult Operations Ltd — KYC-process godkänd av Revolut Business. EUR-betalningar aktiverade.',
    level: 'info',
    source: 'Revolut',
    timestamp: '2026-03-25T15:00:00Z',
    read: true,
  },
  {
    id: 'notif-005',
    title: 'GitHub Actions — CI-pipeline misslyckades',
    body: 'Branch: feature/payment-webhook — test suite failade. 3 unit tests röda.',
    level: 'warning',
    source: 'GitHub Actions',
    timestamp: '2026-03-25T14:20:00Z',
    read: true,
  },
  {
    id: 'notif-006',
    title: 'Milstolpe: CRM 1000 prospekt',
    body: 'CRM-databasen passerade 1 000 prospekt! QuixZoom pipeline expanderar.',
    level: 'info',
    source: 'CRM',
    timestamp: '2026-03-25T12:00:00Z',
    read: true,
  },
  {
    id: 'notif-007',
    title: 'Cloudflare DDoS — skyddsläge aktiverat',
    body: 'Onormal trafik mot hypbit.com — Cloudflare Under Attack Mode aktiverat automatiskt.',
    level: 'critical',
    source: 'Cloudflare',
    timestamp: '2026-03-24T22:15:00Z',
    read: true,
  },
  {
    id: 'notif-008',
    title: 'Backup klar — Supabase snapshot',
    body: 'Daglig backup av wavult-prod klar. Snapshot lagrat 30 dagar framåt.',
    level: 'info',
    source: 'Supabase',
    timestamp: '2026-03-24T03:00:00Z',
    read: true,
  },
]

const LEVEL_CONFIG: Record<NotifLevel, { label: string; color: string; bg: string; dot: string }> = {
  info: { label: 'Info', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
  warning: { label: 'Varning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
  critical: { label: 'Kritisk', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<SystemNotification[]>(BASE_NOTIFICATIONS)
  const [filter, setFilter] = useState<NotifLevel | 'all'>('all')
  const [tick, setTick] = useState(0)

  // Simulate polling — occasionally add a new notification
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 15000) // every 15s

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (tick === 0) return
    // Simulate a new notification arriving
    const synthetic: SystemNotification = {
      id: `notif-live-${tick}`,
      title: tick % 3 === 0 ? 'GitHub Actions — deploy klar' : 'ECS health check ✓',
      body: tick % 3 === 0
        ? 'main branch deployas till ECS. Estimated 2 min.'
        : 'Alla ECS tasks svarar på healthchecks.',
      level: 'info',
      source: tick % 3 === 0 ? 'GitHub Actions' : 'AWS ECS',
      timestamp: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => [synthetic, ...prev])
  }, [tick])

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.level === filter)
  const unreadCount = notifications.filter(n => !n.read).length
  const criticalCount = notifications.filter(n => n.level === 'critical' && !n.read).length

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">System-notifikationer</span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
              {unreadCount}
            </span>
          )}
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
              {criticalCount} kritisk
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-[#0D0F1A] rounded-lg border border-white/[0.06]">
            {(['all', 'info', 'warning', 'critical'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === f
                    ? f === 'all' ? 'bg-brand-accent/20 text-brand-accent' :
                      f === 'critical' ? 'bg-red-500/20 text-red-400' :
                      f === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {f === 'all' ? 'Alla' : LEVEL_CONFIG[f].label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
            >
              Markera alla lästa
            </button>
          )}
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono">Realtid — polling var 15s</span>
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.map(notif => {
          const cfg = LEVEL_CONFIG[notif.level]
          return (
            <div
              key={notif.id}
              className={`rounded-xl border p-3 transition-all ${
                !notif.read ? cfg.bg : 'bg-[#0D0F1A] border-white/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot} ${!notif.read ? '' : 'opacity-30'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-medium ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                      {notif.title}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-600 font-mono">
                        {new Date(notif.timestamp).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!notif.read && (
                        <button
                          onClick={() => markRead(notif.id)}
                          className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-gray-700 font-mono">{notif.source}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-xs">
            Inga notifikationer för valt filter
          </div>
        )}
      </div>
    </div>
  )
}
