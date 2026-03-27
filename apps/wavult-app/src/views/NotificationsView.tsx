// ─── Wavult App — Notifications ─────────────────────────────────────────────────
// System notifications: escalations, gate unlocks, completions, mentions.
// Not chat — structured system signals.

import { useState } from 'react'

interface Notification {
  id: string
  type: 'escalation' | 'completion' | 'gate' | 'mention' | 'system'
  title: string
  body: string
  timeAgo: string
  read: boolean
  source?: { initials: string; color: string }
}

const NOTIFICATIONS: Notification[] = [
  {
    id: '1', type: 'escalation',
    title: 'CFO KPIs escalated to you',
    body: 'Winston has 2 critical KPIs failing. Leadership review required.',
    timeAgo: '5m', read: false,
    source: { initials: 'WB', color: '#3B82F6' },
  },
  {
    id: '2', type: 'gate',
    title: 'Gate unlocked: LandveX AB formation',
    body: 'Legal filing submitted. Bank account application now unblocked.',
    timeAgo: '1h', read: false,
    source: { initials: 'DB', color: '#F59E0B' },
  },
  {
    id: '3', type: 'completion',
    title: 'ECS deployment complete',
    body: 'hypbit-api deployed to eu-north-1. All health checks passing.',
    timeAgo: '3h', read: true,
    source: { initials: 'JB', color: '#06B6D4' },
  },
  {
    id: '4', type: 'system',
    title: 'Weekly momentum report',
    body: '23 events resolved. Average response: 4m. 2 escalations.',
    timeAgo: '1d', read: true,
  },
  {
    id: '5', type: 'mention',
    title: 'Leon mentioned you in task',
    body: 'Re: Thailand workcamp logistics — need your sign-off on venue.',
    timeAgo: '2d', read: true,
    source: { initials: 'LR', color: '#10B981' },
  },
]

const TYPE_ICON: Record<string, string> = {
  escalation: '⬆',
  completion: '✓',
  gate: '◉',
  mention: '@',
  system: '●',
}

const TYPE_COLOR: Record<string, string> = {
  escalation: '#D94040',
  completion: '#4A7A5B',
  gate: '#C4961A',
  mention: '#4A7A9B',
  system: '#5A6170',
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const unread = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-tx-primary">Notifications</h1>
          {unread > 0 && (
            <p className="text-label text-signal-amber font-mono mt-0.5">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-tx-tertiary hover:text-tx-secondary transition-colors font-mono"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div>
        {notifications.map(notif => {
          const color = TYPE_COLOR[notif.type]
          return (
            <div
              key={notif.id}
              className={`event-micro ${!notif.read ? 'bg-w-surface' : ''}`}
            >
              {/* Icon */}
              <div className="flex flex-col items-center gap-1 pt-0.5">
                {notif.source ? (
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-bold"
                    style={{ background: notif.source.color + '20', color: notif.source.color }}
                  >
                    {notif.source.initials}
                  </div>
                ) : (
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: color + '15', color }}
                  >
                    {TYPE_ICON[notif.type]}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${!notif.read ? 'text-tx-primary' : 'text-tx-secondary'}`}>
                    {notif.title}
                  </span>
                  {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-signal-amber flex-shrink-0" />}
                </div>
                <p className="text-xs text-tx-tertiary mt-0.5">{notif.body}</p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-tx-muted font-mono flex-shrink-0 pt-0.5">
                {notif.timeAgo}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
