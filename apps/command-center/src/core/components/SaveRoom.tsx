// ─── Wavult OS v2 — Save Room ──────────────────────────────────────────────────
// The Resident Evil paradigm: when no events are pending, the operator enters
// the save room. Calm, safe. Review inventory, check the map, plan next move.
// This is where the Command Chain, Corporate Graph, and status surfaces live.

import { useNavigate } from 'react-router-dom'
import { useEvents } from '../events/EventContext'
import { useOperator } from '../operator/OperatorContext'
import { COMMAND_CHAIN, STATUS_COLOR } from '../../features/org-graph/commandChain'
import { ENTITIES } from '../../features/org-graph/data'
import { getRoleKPIs, getKPIStatus } from '../../features/incidents/incidentEngine'

function StatusSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-telemetry font-mono text-text-tertiary uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Command Chain Summary ───────────────────────────────────────────────────

function CommandChainSummary() {
  const navigate = useNavigate()

  return (
    <StatusSection title="Command Chain">
      <div className="space-y-1.5">
        {COMMAND_CHAIN.map(role => {
          const kpis = getRoleKPIs(role.id)
          const redCount = kpis.filter(k => getKPIStatus(k) === 'red').length
          const statusColor = STATUS_COLOR[role.status]

          return (
            <button
              key={role.id}
              onClick={() => navigate('/org/command')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-wavult-slate border border-wavult-border hover:bg-wavult-steel transition-all text-left group"
            >
              {/* Avatar */}
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: role.color + '20', color: role.color }}
              >
                {role.initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{role.person}</span>
                  <span className="hud-dot" style={{ background: statusColor }} />
                </div>
                <div className="text-telemetry-sm text-text-tertiary truncate">{role.title}</div>
              </div>

              {/* KPI summary */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {redCount > 0 && (
                  <span className="text-telemetry font-mono px-1.5 py-0.5 rounded bg-signal-red/10 text-signal-red">
                    {redCount} RED
                  </span>
                )}
              </div>

              <span className="text-text-muted group-hover:text-text-tertiary transition-colors text-xs">→</span>
            </button>
          )
        })}
      </div>
    </StatusSection>
  )
}

// ─── Entity Status Grid ──────────────────────────────────────────────────────

function EntityStatusGrid() {
  const navigate = useNavigate()

  return (
    <StatusSection title="Entity Map">
      <div className="grid grid-cols-2 gap-2">
        {ENTITIES.filter(e => e.layer <= 2).map(entity => {
          const statusColor = entity.active_status === 'live' ? '#4A7A5B'
            : entity.active_status === 'forming' ? '#C4961A' : '#3D4452'

          return (
            <button
              key={entity.id}
              onClick={() => navigate(`/entities/${entity.id}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-wavult-slate border border-wavult-border hover:bg-wavult-steel transition-all text-left"
            >
              <span className="text-sm">{entity.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-text-primary truncate">{entity.shortName}</div>
                <div className="text-[8px] text-text-muted font-mono uppercase">{entity.active_status}</div>
              </div>
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
            </button>
          )
        })}
      </div>
    </StatusSection>
  )
}

// ─── Operational Metrics ─────────────────────────────────────────────────────

function OperationalMetrics() {
  const { momentum, resolvedEvents } = useEvents()

  const metrics = [
    { label: 'Resolved Today', value: String(resolvedEvents.length), color: '#4A7A5B' },
    { label: 'Avg Response', value: `${momentum.averageResponseMinutes}m`, color: '#4A7A9B' },
    { label: 'Escalated', value: String(momentum.escalatedCount), color: momentum.escalatedCount > 0 ? '#D94040' : '#3D4452' },
    { label: 'Streak', value: String(momentum.streakLength), color: momentum.velocity === 'high' ? '#4A7A5B' : '#C4961A' },
  ]

  return (
    <StatusSection title="Operator Telemetry">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="px-3 py-3 rounded-lg bg-wavult-slate border border-wavult-border">
            <div className="text-telemetry-sm text-text-muted font-mono uppercase">{m.label}</div>
            <div className="text-lg font-bold mt-1" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </StatusSection>
  )
}

// ─── Navigation Grid ─────────────────────────────────────────────────────────

function NavigationGrid() {
  const navigate = useNavigate()

  const surfaces = [
    { label: 'Command Chain', route: '/org/command', desc: 'Authority hierarchy' },
    { label: 'Corporate Graph', route: '/org', desc: 'Entity relationships' },
    { label: 'Incident Center', route: '/incidents', desc: 'KPI anomalies & actions' },
    { label: 'Market Map', route: '/markets', desc: 'Geographic deployment' },
    { label: 'Campaign OS', route: '/campaigns', desc: 'Growth operations' },
    { label: 'Legal Hub', route: '/legal', desc: 'Contracts & compliance' },
  ]

  return (
    <StatusSection title="Status Surfaces">
      <div className="grid grid-cols-2 gap-2">
        {surfaces.map(s => (
          <button
            key={s.route}
            onClick={() => navigate(s.route)}
            className="px-3 py-3 rounded-lg bg-wavult-slate border border-wavult-border hover:bg-wavult-steel hover:border-wavult-border-light transition-all text-left group"
          >
            <div className="text-xs font-semibold text-text-primary group-hover:text-signal-amber transition-colors">
              {s.label}
            </div>
            <div className="text-telemetry-sm text-text-muted mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>
    </StatusSection>
  )
}

// ─── Save Room Main ──────────────────────────────────────────────────────────

export function SaveRoom() {
  const { profile } = useOperator()

  return (
    <div className="focal-zone focal-zone--neutral p-8 overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header — calm, clear */}
        <div className="mb-8">
          <h1 className="text-action-lg text-text-primary">
            All clear, {profile.name.split(' ')[0]}.
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            No pending events. Review system state or explore status surfaces.
          </p>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <CommandChainSummary />
            <OperationalMetrics />
          </div>
          <div className="space-y-8">
            <EntityStatusGrid />
            <NavigationGrid />
          </div>
        </div>
      </div>
    </div>
  )
}
