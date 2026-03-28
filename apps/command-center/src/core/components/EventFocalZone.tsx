// ─── Wavult OS v2 — Event Content Area ─────────────────────────────────────────
// The center of the OS. ~60% of viewport. ONE primary event/task/decision at a time.
// Clear statement of what happened or what's needed. Context expandable.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../events/EventContext'
import { useOperator } from '../operator/OperatorContext'
import { COMMAND_CHAIN } from '../../features/org-graph/commandChain'
import type { OperationalEvent, GateDependency } from '../events/types'

// ─── Access Lock Display ─────────────────────────────────────────────────────

function AccessLockView({ dependencies }: { dependencies: GateDependency[] }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#5A6170" strokeWidth="1.5" fill="none" />
          <path d="M5 7V5a3 3 0 116 0v2" stroke="#5A6170" strokeWidth="1.5" fill="none" />
        </svg>
        <span className="text-xs font-mono text-text-tertiary uppercase tracking-wider">Dependency Chain</span>
      </div>
      {dependencies.map((dep, i) => {
        const role = COMMAND_CHAIN.find(r => r.id === dep.ownerRoleId)
        const statusColor = dep.status === 'complete' ? '#4A7A5B'
          : dep.status === 'blocked' ? '#D94040' : '#C4961A'

        return (
          <div
            key={i}
            className={`access-lock ${dep.status === 'blocked' ? 'access-lock--blocked' : 'access-lock--pending'}`}
          >
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
            <span className="flex-1">{dep.label}</span>
            {role && (
              <span className="text-[9px] font-mono" style={{ color: role.color }}>
                {role.initials}
              </span>
            )}
            <span className="text-[9px] uppercase" style={{ color: statusColor }}>
              {dep.status}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Single Event View ───────────────────────────────────────────────────────

function EventView({ event }: { event: OperationalEvent }) {
  const navigate = useNavigate()
  const { resolveEvent, deferEvent } = useEvents()
  const { showExpandedContext, transitionSpeed } = useOperator()
  const [expanded, setExpanded] = useState(showExpandedContext)
  const [resolving, setResolving] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const role = COMMAND_CHAIN.find(r => r.id === event.sourceRoleId)
  const isGate = event.category === 'gate'

  const handleAction = (actionId: string) => {
    const action = event.actions.find(a => a.id === actionId)
    setResolving(actionId)

    timerRef.current = setTimeout(() => {
      resolveEvent(event.id, actionId)
      if (action?.navigateTo) {
        navigate(action.navigateTo)
      }
    }, transitionSpeed)
  }

  const cardClass = event.priority === 'critical' ? 'event-card event-card--critical'
    : event.priority === 'high' ? 'event-card event-card--elevated'
    : 'event-card'

  const stripeClass = event.priority === 'critical' ? 'status-bar--action'
    : event.priority === 'high' ? 'status-bar--attention'
    : 'status-bar--neutral'

  return (
    <div className={`${cardClass} animate-slide-in relative`}>
      {/* Left-edge stripe — status indicator */}
      <div className={`status-bar ${stripeClass}`} />

      {/* Source badge */}
      {role && (
        <div className="flex items-center gap-2 mb-4">
          <div
            className="h-6 w-6 rounded flex items-center justify-center text-[9px] font-bold"
            style={{ background: role.color + '20', color: role.color }}
          >
            {role.initials}
          </div>
          <span className="text-label-xs font-mono text-text-tertiary">
            {role.person} · {role.title}
          </span>
          <span className={`text-label-xs font-mono px-1.5 py-0.5 rounded ${
            event.priority === 'critical' ? 'bg-signal-red/10 text-signal-red'
            : event.priority === 'high' ? 'bg-signal-amber/10 text-signal-amber'
            : 'bg-wavult-steel text-text-tertiary'
          }`}>
            {event.priority.toUpperCase()}
          </span>
          {event.category === 'escalation' && (
            <span className="text-label-xs font-mono px-1.5 py-0.5 rounded bg-signal-red/10 text-signal-red">
              ESCALATED
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h2 className="text-heading-lg text-text-primary text-balance leading-tight">
        {event.title}
      </h2>

      {/* Subtitle */}
      {event.subtitle && (
        <p className="text-sm text-text-secondary mt-2">
          {event.subtitle}
        </p>
      )}

      {/* Expandable body */}
      {event.body && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-label-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors flex items-center gap-1"
          >
            <span className="transform transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : '' }}>
              ▸
            </span>
            {expanded ? 'COLLAPSE CONTEXT' : 'EXPAND CONTEXT'}
          </button>
          {expanded && (
            <div className="mt-2 p-3 bg-wavult-carbon rounded border border-wavult-border animate-fade-in">
              <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                {event.body}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Access lock dependencies */}
      {event.gateDependencies && event.gateDependencies.length > 0 && (
        <AccessLockView dependencies={event.gateDependencies} />
      )}

      {/* Actions */}
      {event.actions.length > 0 && !isGate && (
        <div className="mt-6 flex gap-3">
          {event.responseType === 'binary' ? (
            event.actions.slice(0, 2).map(action => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={resolving !== null}
                className={`decision-btn ${
                  action.variant === 'primary' ? 'bg-signal-amber text-wavult-carbon hover:brightness-110'
                  : action.variant === 'danger' ? 'bg-signal-red/15 text-signal-red border border-signal-red/30 hover:bg-signal-red/25'
                  : action.variant === 'approve' ? 'bg-signal-green/15 text-signal-green border border-signal-green/30 hover:bg-signal-green/25'
                  : 'bg-wavult-steel text-text-secondary border border-wavult-border hover:text-text-primary'
                } ${resolving === action.id ? 'opacity-50 scale-95' : ''}`}
              >
                {action.label}
              </button>
            ))
          ) : (
            event.actions.map(action => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={resolving !== null}
                className={`action-btn ${
                  action.variant === 'primary' ? 'action-btn--primary'
                  : action.variant === 'danger' ? 'action-btn--danger'
                  : action.variant === 'approve' ? 'action-btn--approve'
                  : 'action-btn--ghost'
                } ${resolving === action.id ? 'opacity-50 scale-95' : ''}`}
              >
                {action.label}
              </button>
            ))
          )}
        </div>
      )}

      {/* Access lock actions (navigate only) */}
      {isGate && event.actions.length > 0 && (
        <div className="mt-6 flex gap-3">
          {event.actions.map(action => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="action-btn action-btn--ghost"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Defer option */}
      {!isGate && event.actions.length > 2 && (
        <button
          onClick={() => deferEvent(event.id)}
          className="mt-3 text-label-xs font-mono text-text-muted hover:text-text-tertiary transition-colors"
        >
          DEFER →
        </button>
      )}
    </div>
  )
}

// ─── Content Area Container ──────────────────────────────────────────────────

export function EventFocalZone() {
  const { activeEvent, atmosphere } = useEvents()

  const zoneClass = atmosphere === 'action' ? 'content-area--action'
    : atmosphere === 'attention' ? 'content-area--attention'
    : 'content-area--neutral'

  if (!activeEvent) return null

  return (
    <div className={`content-area ${zoneClass} p-8`}>
      <div className="w-full max-w-2xl mx-auto">
        <EventView event={activeEvent} />
      </div>
    </div>
  )
}
