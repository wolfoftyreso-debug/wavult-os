// ─── Wavult App — Events Feed ───────────────────────────────────────────────────
// Telegram-style: fast, scrollable, tap-to-act. Each event is a micro-card
// with clear action. Sorted by priority, filtered by role.

import { useState, useRef } from 'react'
import { useIdentity } from '../core/identity/IdentityContext'
import type { TaskCategory } from '../core/identity/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type EventPriority = 'critical' | 'high' | 'normal' | 'low'
type EventCategory = 'approval' | 'task' | 'alert' | 'info' | 'gate'

interface AppEvent {
  id: string
  title: string
  subtitle: string
  category: EventCategory
  priority: EventPriority
  source: { initials: string; color: string }
  timeAgo: string
  actionLabel?: string
}

// ─── Mock events ─────────────────────────────────────────────────────────────

const EVENTS: AppEvent[] = [
  {
    id: '1', title: 'CFO: 2 KPIs failing', subtitle: 'Bank accounts 0/4, intercompany 0/5',
    category: 'alert', priority: 'critical',
    source: { initials: 'WB', color: '#3B82F6' }, timeAgo: '2m',
    actionLabel: 'Review',
  },
  {
    id: '2', title: 'Entity formation blocked', subtitle: '6 entities awaiting legal filing',
    category: 'gate', priority: 'high',
    source: { initials: 'DB', color: '#F59E0B' }, timeAgo: '15m',
  },
  {
    id: '3', title: 'Approve Stockholm deployment', subtitle: 'quiXzoom beta — 10 zoomer target',
    category: 'approval', priority: 'high',
    source: { initials: 'LR', color: '#10B981' }, timeAgo: '1h',
    actionLabel: 'Approve',
  },
  {
    id: '4', title: 'Tech debt review needed', subtitle: '3 open items — CTO flagged',
    category: 'task', priority: 'normal',
    source: { initials: 'JB', color: '#06B6D4' }, timeAgo: '3h',
    actionLabel: 'Open',
  },
  {
    id: '5', title: 'ECS deployment successful', subtitle: 'hypbit-api eu-north-1 — 99% uptime',
    category: 'info', priority: 'low',
    source: { initials: 'JB', color: '#06B6D4' }, timeAgo: '5h',
  },
  {
    id: '6', title: 'Cashflow projection due', subtitle: 'CFO must submit 6-month forecast',
    category: 'task', priority: 'high',
    source: { initials: 'WB', color: '#3B82F6' }, timeAgo: '6h',
    actionLabel: 'View',
  },
]

const PRIORITY_COLOR: Record<EventPriority, string> = {
  critical: '#D94040',
  high: '#C4961A',
  normal: '#4A7A9B',
  low: '#3D4452',
}

const CATEGORY_LABEL: Record<EventCategory, string> = {
  approval: 'APPROVAL',
  task: 'TASK',
  alert: 'ALERT',
  info: 'INFO',
  gate: 'BLOCKED',
}

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event, onResolve }: { event: AppEvent; onResolve: (id: string) => void }) {
  const pColor = PRIORITY_COLOR[event.priority]

  return (
    <div className="event-micro">
      {/* Priority stripe + source */}
      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-bold"
          style={{ background: event.source.color + '20', color: event.source.color }}
        >
          {event.source.initials}
        </div>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: pColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-tx-primary">{event.title}</span>
          <span
            className="text-[8px] font-mono px-1 py-0.5 rounded"
            style={{ background: pColor + '15', color: pColor }}
          >
            {CATEGORY_LABEL[event.category]}
          </span>
        </div>
        <p className="text-xs text-tx-tertiary mt-0.5">{event.subtitle}</p>

        {/* Action */}
        {event.actionLabel && (
          <button
            onClick={() => onResolve(event.id)}
            className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{
              background: pColor + '15',
              color: pColor,
              border: `1px solid ${pColor}30`,
            }}
          >
            {event.actionLabel}
          </button>
        )}
      </div>

      {/* Time */}
      <span className="text-[10px] text-tx-muted font-mono flex-shrink-0 pt-0.5">
        {event.timeAgo}
      </span>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

// Map event categories to identity task categories
const CATEGORY_TO_TASK: Record<EventCategory, TaskCategory> = {
  approval: 'decision',
  task: 'execute',
  alert: 'review',
  info: 'review',
  gate: 'analyze',
}

export function EventsView() {
  const [events, setEvents] = useState(EVENTS)
  const [filter, setFilter] = useState<'all' | 'critical' | 'tasks'>('all')
  const { recordFeedback } = useIdentity()
  const resolveTimestamps = useRef<Map<string, number>>(new Map())

  const filtered = events.filter(e => {
    if (filter === 'critical') return e.priority === 'critical' || e.priority === 'high'
    if (filter === 'tasks') return e.category === 'task' || e.category === 'approval'
    return true
  })

  const handleResolve = (id: string) => {
    const event = events.find(e => e.id === id)
    if (event) {
      const startTime = resolveTimestamps.current.get(id) || Date.now()
      const duration = Date.now() - startTime
      recordFeedback(
        id,
        CATEGORY_TO_TASK[event.category],
        duration < 5000 ? 'completed_fast' : 'completed_well',
        duration,
      )
    }
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  // Track when events first become visible (for duration calculation)
  if (resolveTimestamps.current.size === 0) {
    events.forEach(e => resolveTimestamps.current.set(e.id, Date.now()))
  }

  const filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'critical' as const, label: 'Urgent' },
    { key: 'tasks' as const, label: 'Tasks' },
  ]

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-tx-primary">Events</h1>
        <span className="text-label font-mono text-tx-tertiary">
          {events.length} pending
        </span>
      </div>

      {/* Filters */}
      <div className="px-5 pb-3 flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-pill font-medium transition-all ${
              filter === f.key
                ? 'bg-signal-amber/15 text-signal-amber border border-signal-amber/30'
                : 'text-tx-muted border border-w-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div>
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-tx-muted text-sm">All clear</p>
            <p className="text-label text-tx-muted font-mono mt-1">No events matching filter</p>
          </div>
        ) : (
          filtered.map(event => (
            <EventCard key={event.id} event={event} onResolve={handleResolve} />
          ))
        )}
      </div>
    </div>
  )
}
