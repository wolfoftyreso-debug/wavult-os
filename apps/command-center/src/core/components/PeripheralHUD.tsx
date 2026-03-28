// ─── Wavult OS v2 — Status Bar ─────────────────────────────────────────────────
// Always-on system state. Top bar + bottom status. Color temperature shifts based on state.

import { useEvents } from '../events/EventContext'
import { useOperator } from '../operator/OperatorContext'
import { useRole, ROLES } from '../../shared/auth/RoleContext'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Top Status Bar ───────────────────────────────────────────────────────────

export function TopHUD() {
  const { systemState, momentum, atmosphere } = useEvents()
  const { setRole, isAdmin, viewAs, setViewAs, effectiveRole } = useRole()
  const { activeEntity: scopeEntity } = useEntityScope()
  const nonAdminRoles = ROLES.filter(r => r.id !== 'admin')

  const atmosphereColor = atmosphere === 'action' ? '#D94040'
    : atmosphere === 'attention' ? '#C4961A' : '#4A7A5B'

  return (
    <header className="h-10 flex-shrink-0 border-b border-wavult-border flex items-center justify-between px-5 bg-wavult-carbon">
      {/* Left — System status */}
      <div className="flex items-center gap-4">
        {/* State indicator */}
        <div className="status-indicator">
          <span className="status-dot" style={{ background: atmosphereColor }} />
          <span style={{ color: atmosphereColor }}>
            {atmosphere === 'action' ? 'ACTION REQUIRED'
              : atmosphere === 'attention' ? 'ATTENTION'
              : 'OPERATIONAL'}
          </span>
        </div>

        {/* Pending count */}
        <div className="status-indicator">
          <span className="text-text-primary font-semibold">{systemState.pendingEvents}</span>
          <span>PENDING</span>
        </div>

        {/* Scope */}
        <div className="status-indicator">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: scopeEntity.color }} />
          <span>{scopeEntity.layer === 0 ? 'GROUP' : scopeEntity.shortName}</span>
        </div>
      </div>

      {/* Right — Role context + progress + logout */}
      <div className="flex items-center gap-3">
        {/* Resolved count */}
        {momentum.resolvedToday > 0 && (
          <div className="status-indicator">
            <span className="text-signal-green">{momentum.resolvedToday}</span>
            <span>RESOLVED</span>
            {momentum.velocity === 'high' && (
              <span className="text-signal-green ml-0.5">▲</span>
            )}
          </div>
        )}

        {/* Role badge */}
        {effectiveRole && (
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <select
                value={viewAs?.id ?? ''}
                onChange={e => {
                  const found = nonAdminRoles.find(r => r.id === e.target.value) ?? null
                  setViewAs(found)
                }}
                className="text-label-xs bg-wavult-carbon border border-wavult-border rounded px-2 py-1 font-mono cursor-pointer focus:outline-none appearance-none"
                style={{ color: viewAs ? viewAs.color : '#5A6170' }}
              >
                <option value="">SYS ADMIN</option>
                {nonAdminRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.initials} {r.title}</option>
                ))}
              </select>
            ) : (
              <div className="status-indicator" style={{ color: effectiveRole.color }}>
                <span
                  className="h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{ background: effectiveRole.color + '20', color: effectiveRole.color }}
                >
                  {effectiveRole.initials}
                </span>
                <span>{effectiveRole.title}</span>
              </div>
            )}

            <button
              onClick={() => { setRole(null); setViewAs(null) }}
              className="text-label-xs text-text-muted hover:text-text-tertiary transition-colors font-mono"
            >
              EXIT
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

// ─── Bottom Status Bar ────────────────────────────────────────────────────────

export function BottomTelemetry() {
  const { systemState, momentum } = useEvents()
  const { profile } = useOperator()

  return (
    <footer className="h-7 flex-shrink-0 border-t border-wavult-border flex items-center justify-between px-5 bg-wavult-carbon">
      {/* Left — Status metrics */}
      <div className="flex items-center gap-4">
        <div className="status-indicator">
          <span className="text-text-tertiary">AVG RESPONSE</span>
          <span className="text-text-secondary">{systemState.averageResponseTime}m</span>
        </div>

        {systemState.escalatedCount > 0 && (
          <div className="status-indicator">
            <span className="text-signal-red">{systemState.escalatedCount}</span>
            <span className="text-signal-red">ESCALATED</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-label-2xs text-text-muted font-mono">PROGRESS</span>
          <div className="w-16 h-0.5 bg-wavult-border rounded-full overflow-hidden">
            <div
              className="progress-bar"
              style={{
                width: `${Math.min(100, momentum.streakLength * 20)}%`,
                background: momentum.velocity === 'high' ? '#4A7A5B'
                  : momentum.velocity === 'normal' ? '#C4961A' : '#3D4452',
              }}
            />
          </div>
        </div>
      </div>

      {/* Right — System meta */}
      <div className="flex items-center gap-3">
        <span className="text-label-2xs text-text-muted font-mono">
          {profile.density.toUpperCase()} · {profile.pacing.toUpperCase()}
        </span>
        <span className="text-label-2xs text-text-muted font-mono">
          WAVULT OS v2
        </span>
      </div>
    </footer>
  )
}
