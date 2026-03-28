// ─── Wavult OS v2 — Event Queue ────────────────────────────────────────────────
// The left rail. A living timeline of operational events.
// Items enter from top, resolve downward. Shows pending, active, and resolved.

import { useEvents } from '../events/EventContext'
import { useOperator } from '../operator/OperatorContext'
import { COMMAND_CHAIN } from '../../features/org-graph/commandChain'
import type { OperationalEvent, EventPriority } from '../events/types'

const PRIORITY_COLOR: Record<EventPriority, string> = {
  critical: '#D94040',
  high: '#C4961A',
  normal: '#4A7A9B',
  low: '#3D4452',
}

const CATEGORY_ICON: Record<string, string> = {
  decision: '◈',
  approval: '◆',
  acknowledgment: '◇',
  input: '▣',
  delegation: '▲',
  escalation: '⬆',
  alert: '●',
  gate: '◉',
}

function EventListItem({
  event,
  isActive,
  isResolved,
  onClick,
}: {
  event: OperationalEvent
  isActive: boolean
  isResolved: boolean
  onClick: () => void
}) {
  const role = COMMAND_CHAIN.find(r => r.id === event.sourceRoleId)
  const priorityColor = PRIORITY_COLOR[event.priority]

  return (
    <button
      onClick={onClick}
      className={`
        list-item w-full text-left
        ${isActive ? 'list-item--active' : ''}
        ${isResolved ? 'list-item--resolved' : ''}
        ${event.priority === 'critical' ? 'list-item--urgent' : ''}
      `}
      style={{
        borderLeftColor: isActive ? priorityColor : undefined,
      }}
    >
      {/* Priority indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span
          className="text-xs leading-none"
          style={{ color: priorityColor }}
        >
          {CATEGORY_ICON[event.category] || '●'}
        </span>
        {event.priority === 'critical' && !isResolved && (
          <span className="status-dot status-dot--critical" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {role && (
            <span
              className="h-4 w-4 rounded text-[8px] font-bold flex items-center justify-center flex-shrink-0"
              style={{ background: role.color + '20', color: role.color }}
            >
              {role.initials}
            </span>
          )}
          <span className={`text-xs font-medium truncate ${isResolved ? 'line-through' : 'text-text-primary'}`}>
            {event.title.length > 40 ? event.title.slice(0, 40) + '…' : event.title}
          </span>
        </div>

        {event.subtitle && (
          <div className="text-label-2xs text-text-tertiary mt-0.5 truncate">
            {event.subtitle}
          </div>
        )}

        {/* Access lock indicator */}
        {event.category === 'gate' && (
          <div className="flex items-center gap-1 mt-1">
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
              <rect x="2" y="5" width="8" height="6" rx="1" stroke="#5A6170" strokeWidth="1.5" fill="none" />
              <path d="M4 5V3.5a2 2 0 114 0V5" stroke="#5A6170" strokeWidth="1.5" fill="none" />
            </svg>
            <span className="text-[8px] text-text-muted font-mono">LOCKED</span>
          </div>
        )}
      </div>

      {/* Resolved checkmark */}
      {isResolved && (
        <svg width="14" height="14" viewBox="0 0 16 16" className="flex-shrink-0 mt-0.5">
          <circle cx="8" cy="8" r="7" fill="#4A7A5B" fillOpacity="0.2" />
          <path d="M5 8l2 2 4-4" stroke="#4A7A5B" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export function MissionStack() {
  const { pendingEvents, resolvedEvents, activeEvent, setActiveEvent } = useEvents()
  const { maxItemsPerView } = useOperator()

  const visiblePending = pendingEvents.slice(0, maxItemsPerView)
  const visibleResolved = resolvedEvents.slice(0, 3)

  return (
    <aside className="w-56 flex-shrink-0 bg-wavult-charcoal border-r border-wavult-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-wavult-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary tracking-wider">WAVULT</span>
          <span className="text-label-xs text-signal-amber font-mono">OS</span>
        </div>
      </div>

      {/* Queue count */}
      <div className="px-4 py-2 border-b border-wavult-border flex items-center justify-between flex-shrink-0">
        <span className="text-label-xs text-text-tertiary font-mono uppercase">Event Queue</span>
        <span className="text-label-xs font-mono" style={{
          color: pendingEvents.length > 5 ? '#D94040' : pendingEvents.length > 2 ? '#C4961A' : '#4A7A5B',
        }}>
          {pendingEvents.length}
        </span>
      </div>

      {/* Pending events */}
      <div className="flex-1 overflow-y-auto item-list">
        {visiblePending.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-text-muted text-xs font-mono">ALL CLEAR</div>
            <div className="text-text-tertiary text-xs mt-1">No pending events</div>
          </div>
        ) : (
          visiblePending.map(event => (
            <EventListItem
              key={event.id}
              event={event}
              isActive={activeEvent?.id === event.id}
              isResolved={false}
              onClick={() => setActiveEvent(event)}
            />
          ))
        )}

        {pendingEvents.length > maxItemsPerView && (
          <div className="px-4 py-2 text-center">
            <span className="text-label-2xs text-text-muted font-mono">
              +{pendingEvents.length - maxItemsPerView} more
            </span>
          </div>
        )}

        {/* Resolved separator */}
        {visibleResolved.length > 0 && (
          <>
            <div className="px-4 py-2 border-t border-wavult-border flex-shrink-0">
              <span className="text-label-2xs text-text-muted font-mono uppercase">Resolved</span>
            </div>
            {visibleResolved.map(event => (
              <EventListItem
                key={event.id}
                event={event}
                isActive={false}
                isResolved={true}
                onClick={() => {}}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer — Progress */}
      <div className="px-4 py-3 border-t border-wavult-border flex-shrink-0 bg-wavult-carbon">
        <div className="text-label-2xs text-text-muted font-mono uppercase mb-1">Progress</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-text-primary">{resolvedEvents.length}</span>
            <span className="text-label-2xs text-text-tertiary">resolved</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-signal-amber">{pendingEvents.filter(e => e.priority === 'critical').length}</span>
            <span className="text-label-2xs text-text-tertiary">critical</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
