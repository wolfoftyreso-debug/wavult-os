// ─── Incident Center — Self-correcting operational system ─────────────────────
// Route: /incidents
// This is not a report. This is a control system.
// Every KPI failure triggers: RCA → Action proposal → Accept/Reject → Escalation

import { useState, useMemo } from 'react'
import {
  generateIncidents, getRoleKPIs, getKPIStatus, computePropagation,
  PerformanceIncident, ProposedAction, KPIDefinition,
  KPI_STATUS_COLOR, SEVERITY_COLOR,
} from './incidentEngine'
import { COMMAND_CHAIN } from '../org-graph/commandChain'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Role → Entity mapping ────────────────────────────────────────────────────
const ROLE_ENTITY_MAP: Record<string, string> = {
  'group-ceo': 'wavult-group',
  'ceo-ops':   'wavult-operations',
  'cfo':       'wavult-group',
  'cto':       'wavult-operations',
  'clo':       'wavult-group',
  'cpo':       'wavult-group',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleName(id: string) {
  return COMMAND_CHAIN.find(r => r.id === id)?.person ?? id
}

function roleColor(id: string) {
  return COMMAND_CHAIN.find(r => r.id === id)?.color ?? '#6B7280'
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: PerformanceIncident['severity'] }) {
  const c = SEVERITY_COLOR[severity]
  const labels = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: '🔴 CRITICAL' }
  return (
    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
      style={{ background: c + '20', color: c, border: `1px solid ${c}35` }}>
      {labels[severity]}
    </span>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({
  action, isActive, onAccept, onReject,
}: {
  action: ProposedAction
  isActive: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const ownerColor    = roleColor(action.owner_role_id)
  const approverColor = roleColor(action.approver_role_id)

  const stateStyle = {
    proposed: { color: '#F59E0B', bg: '#F59E0B15', label: 'AWAITING DECISION' },
    accepted: { color: '#10B981', bg: '#10B98115', label: 'ACCEPTED' },
    rejected: { color: '#EF4444', bg: '#EF444415', label: 'REJECTED — LOCKED' },
    requires_dual_approval: { color: '#2563EB', bg: '#2563EB15', label: 'DUAL APPROVAL REQUIRED' },
  }[action.state]

  return (
    <div className={`rounded-xl border transition-all ${isActive ? 'ring-1' : ''}`}
      style={{
        borderColor: isActive ? '#FF950040' : 'rgba(0,0,0,0.10)',
        background: isActive ? 'rgba(255,149,0,0.06)' : '#FFFFFF'
      }}>
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: stateStyle.bg, color: stateStyle.color }}>
                {stateStyle.label}
              </span>
              {action.state === 'requires_dual_approval' && (
                <span className="text-xs" style={{ color: 'rgba(60,60,67,0.8)' }}>
                  Requires {roleName(action.owner_role_id)} + {roleName(action.approver_role_id)}
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#1C1C1E' }}>{action.text}</p>
          </div>
          <button onClick={() => setExpanded(p => !p)}
            className="text-xs flex-shrink-0 mt-1" style={{ color: 'rgba(60,60,67,0.8)' }}>
            {expanded ? '▲ less' : '▾ SMART'}
          </button>
        </div>

        {/* Roles */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'rgba(60,60,67,0.8)' }}>Owner:</span>
            <span style={{ color: ownerColor }} className="font-semibold">{roleName(action.owner_role_id)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'rgba(60,60,67,0.8)' }}>Approver:</span>
            <span style={{ color: approverColor }} className="font-semibold">{roleName(action.approver_role_id)}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span style={{ color: 'rgba(60,60,67,0.8)' }}>Deadline:</span>
            <span className="font-mono" style={{ color: '#FF9500' }}>{action.deadline_days}d</span>
          </div>
        </div>

        {/* SMART criteria */}
        {expanded && (
          <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            {Object.entries(action.smart_criteria).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-xs">
                <span className="font-mono w-20 flex-shrink-0 uppercase text-[9px] pt-0.5" style={{ color: 'rgba(60,60,67,0.8)' }}>{k}</span>
                <span className="leading-relaxed" style={{ color: '#1C1C1E' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons — only if proposed and this is active */}
        {action.state === 'proposed' && isActive && (
          <div className="flex gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <button
              onClick={onAccept}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{ background: '#10B98120', color: '#10B981', border: '1px solid #10B98140' }}
            >
              ✅ Accept — I will execute this
            </button>
            <button
              onClick={onReject}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}
            >
              ❌ Reject
            </button>
          </div>
        )}

        {action.state === 'rejected' && (
          <div className="mt-3 p-3 rounded-lg text-xs"
            style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.20)' }}>
            <p className="font-semibold" style={{ color: '#FF3B30' }}>🔒 System locked — KPI remains red</p>
            <p className="mt-1" style={{ color: 'rgba(60,60,67,0.8)' }}>New corrective action requires dual approval from owner and superior.</p>
          </div>
        )}

        {action.state === 'accepted' && (
          <div className="mt-3 p-3 rounded-lg text-xs"
            style={{ background: '#10B98110', border: '1px solid #10B98125' }}>
            <p className="text-green-600 font-semibold">✅ Action in progress</p>
            <p className="mt-1" style={{ color: 'rgba(60,60,67,0.8)' }}>KPI will be re-evaluated at deadline. Failure to deliver triggers escalation.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Incident card ────────────────────────────────────────────────────────────

function IncidentCard({
  incident, onActionAccept, onActionReject,
}: {
  incident: PerformanceIncident
  onActionAccept: (incId: string, actId: string) => void
  onActionReject: (incId: string, actId: string) => void
}) {
  const [open, setOpen] = useState(incident.severity === 'critical')
  const role = COMMAND_CHAIN.find(r => r.id === incident.role_id)

  const borderColor = incident.severity === 'critical' ? '#EF4444' : incident.severity === 'high' ? '#EF4444' : '#F59E0B'

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${incident.severity === 'critical' ? 'animate-pulse-border' : ''}`}
      style={{ borderColor: open ? borderColor + '50' : 'rgba(0,0,0,0.10)', background: 'var(--color-surface)' }}>

      {/* Incident header — always visible */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-white/[0.01] transition-colors"
      >
        {/* Status bar left edge */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: SEVERITY_COLOR[incident.severity] }} />

        {/* Role badge */}
        <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: role?.color + '20', color: role?.color }}>
          {role?.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color: '#1C1C1E' }}>{role?.person}</span>
            <span className="text-xs" style={{ color: 'rgba(60,60,67,0.8)' }}>·</span>
            <span className="text-xs" style={{ color: 'rgba(60,60,67,0.8)' }}>{role?.title}</span>
            <SeverityBadge severity={incident.severity} />
            {incident.escalated && (
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.20)' }}>
                🚨 ESCALATED
              </span>
            )}
            {incident.locked && (
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(60,60,67,0.8)', border: '1px solid var(--color-border)' }}>
                🔒 LOCKED
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(60,60,67,0.8)' }}>{incident.rca.problem}</p>
        </div>

        <span className="flex-shrink-0 mt-1" style={{ color: 'rgba(60,60,67,0.8)' }}>{open ? '▲' : '▾'}</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 space-y-5 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>

          {/* RCA */}
          <div className="space-y-3 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1C1C1E' }}>Root Cause Analysis</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'Problem',         value: incident.rca.problem },
                { label: 'Root Cause',      value: incident.rca.root_cause },
                { label: 'Impact',          value: incident.rca.impact },
              ] as const).map(({ label, value }) => (
                <div key={label} className={`rounded-xl px-4 py-3 ${label === 'Root Cause' ? 'col-span-2' : ''}`}
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-muted)' }}>
                  <div className="text-xs font-mono uppercase mb-1" style={{ color: 'rgba(60,60,67,0.8)' }}>{label}</div>
                  <p className="text-xs leading-relaxed" style={{ color: '#1C1C1E' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Dependency chain */}
            <div className="rounded-xl px-4 py-3" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-muted)' }}>
              <div className="text-xs font-mono uppercase mb-2" style={{ color: 'rgba(60,60,67,0.8)' }}>Dependency Chain</div>
              <div className="flex items-center gap-0 flex-wrap">
                {incident.rca.dependency_chain.map((dep, i) => (
                  <div key={i} className="flex items-center gap-0">
                    <span className="text-xs px-2 py-1 rounded" style={{ color: '#1C1C1E', background: 'rgba(0,0,0,0.04)' }}>{dep}</span>
                    {i < incident.rca.dependency_chain.length - 1 && (
                      <span className="text-red-500 text-sm mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Affected roles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase" style={{ color: 'rgba(60,60,67,0.8)' }}>Affected:</span>
              {incident.rca.affected_roles.map(rid => {
                const r = COMMAND_CHAIN.find(x => x.id === rid)
                if (!r) return null
                return (
                  <span key={rid} className="text-xs px-2 py-0.5 rounded font-semibold"
                    style={{ background: r.color + '18', color: r.color }}>
                    {r.initials} {r.person}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Escalation alert */}
          {incident.escalated && (
            <div className="rounded-xl border px-4 py-3"
              style={{ borderColor: 'rgba(255,59,48,0.25)', background: 'rgba(255,59,48,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🚨</span>
                <span className="text-xs font-bold" style={{ color: '#FF3B30' }}>Leadership Incident — Meeting Required</span>
              </div>
              <p className="text-xs" style={{ color: 'rgba(60,60,67,0.8)' }}>{incident.escalation_trigger}</p>
              <div className="mt-2 text-xs" style={{ color: 'rgba(60,60,67,0.8)' }}>
                Required attendees: {incident.rca.affected_roles.map(roleName).join(', ')}
              </div>
              <div className="mt-2 text-xs" style={{ color: '#1C1C1E' }}>
                Meeting must produce: Decision · Action plan · Timeline · Owner
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1C1C1E' }}>
              Proposed Actions ({incident.proposed_actions.length})
            </h3>
            {incident.proposed_actions.map((action, idx) => (
              <ActionCard
                key={action.id}
                action={action}
                isActive={idx === incident.active_action_index && action.state === 'proposed'}
                onAccept={() => onActionAccept(incident.id, action.id)}
                onReject={() => onActionReject(incident.id, action.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KPI detail row ───────────────────────────────────────────────────────────

function KPIRow({ kpi }: { kpi: KPIDefinition }) {
  const status = getKPIStatus(kpi)
  const color  = KPI_STATUS_COLOR[status]
  const trendIcon = kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '–'
  const trendColor = kpi.trend === 'up' && status !== 'red' ? '#10B981' : kpi.trend === 'down' ? '#EF4444' : '#6B7280'

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
      <span className="h-2 w-2 rounded-full flex-shrink-0 transition-all"
        style={{ background: color, boxShadow: status === 'red' ? `0 0 8px ${color}` : 'none' }} />
      <span className="flex-1 text-xs truncate" style={{ color: '#1C1C1E' }}>{kpi.name}</span>
      <span className="text-xs flex-shrink-0" style={{ color: 'rgba(60,60,67,0.8)' }}>{kpi.target}</span>
      <span className="text-xs font-mono font-bold flex-shrink-0 w-20 text-right" style={{ color }}>
        {kpi.current} <span style={{ color: trendColor }}>{trendIcon}</span>
      </span>
      <span className="text-[9px] flex-shrink-0 font-mono" style={{ color: 'rgba(60,60,67,0.8)' }}>{kpi.deadline}</span>
      <span className="text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0"
        style={{ background: color + '18', color }}>
        {status.toUpperCase()}
      </span>
    </div>
  )
}

// ─── Role KPI block ───────────────────────────────────────────────────────────

function RoleKPIBlock({ roleId }: { roleId: string }) {
  const role = COMMAND_CHAIN.find(r => r.id === roleId)!
  const kpis = getRoleKPIs(roleId)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: role.color + '08', borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs"
          style={{ background: role.color + '20', color: role.color }}>
          {role.initials}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>{role.person}</div>
          <div className="text-xs" style={{ color: role.color }}>{role.title}</div>
        </div>
      </div>
      <div className="px-1 py-2 space-y-0.5">
        {kpis.map(k => <KPIRow key={k.id} kpi={k} />)}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function IncidentCenter() {
  const [tab, setTab] = useState<'incidents' | 'kpis'>('incidents')
  const { activeEntity, isInScope } = useEntityScope()
  const isRoot = activeEntity.layer === 0

  // Mutable incident state (simulate accept/reject)
  const [incidents, setIncidents] = useState(() => generateIncidents())
  const propagation = useMemo(() => computePropagation(incidents), [incidents])

  // Filter incidents by entity scope
  const scopedIncidents = isRoot
    ? incidents
    : incidents.filter(inc => {
        const entityId = ROLE_ENTITY_MAP[inc.role_id] ?? 'wavult-group'
        return isInScope(entityId)
      })

  // Filter COMMAND_CHAIN roles for KPI view
  const scopedRoles = isRoot
    ? COMMAND_CHAIN
    : COMMAND_CHAIN.filter(r => {
        const entityId = ROLE_ENTITY_MAP[r.id] ?? 'wavult-group'
        return isInScope(entityId)
      })

  const criticalCount = scopedIncidents.filter(i => i.severity === 'critical').length
  const escalatedCount = scopedIncidents.filter(i => i.escalated).length
  const lockedCount = scopedIncidents.filter(i => i.locked).length
  const openCount = scopedIncidents.filter(i => i.state !== 'resolved').length

  function handleAccept(incId: string, actId: string) {
    setIncidents(prev => prev.map(inc => {
      if (inc.id !== incId) return inc
      return {
        ...inc,
        state: 'action_accepted',
        proposed_actions: inc.proposed_actions.map(a =>
          a.id === actId ? { ...a, state: 'accepted', accepted_at: new Date().toISOString() } : a
        ),
      }
    }))
  }

  function handleReject(incId: string, actId: string) {
    setIncidents(prev => prev.map(inc => {
      if (inc.id !== incId) return inc
      const nextIdx = inc.active_action_index + 1
      const hasNext = nextIdx < inc.proposed_actions.length
      const role = COMMAND_CHAIN.find(r => r.id === inc.role_id)
      const superior = COMMAND_CHAIN.find(r => r.id === role?.reports_to)

      return {
        ...inc,
        state: hasNext ? 'action_pending' : 'locked',
        locked: !hasNext,
        active_action_index: hasNext ? nextIdx : inc.active_action_index,
        proposed_actions: inc.proposed_actions.map((a, i) => {
          if (a.id === actId) return { ...a, state: 'rejected' as const, rejected_at: new Date().toISOString() }
          if (i === nextIdx && hasNext) return { ...a, state: 'requires_dual_approval' as const }
          return a
        }),
        escalated: true,
        escalation_trigger: `Action rejected by ${role?.person}. Dual approval required: ${role?.person} + ${superior?.person ?? 'Group CEO'}`,
      }
    }))
  }

  // Sort scoped incidents: critical first, then by severity
  const sorted = [...scopedIncidents].sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2, low: 3 }
    return sev[a.severity] - sev[b.severity]
  })

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#1C1C1E' }}>Alerts</h1>
                <span className="text-xs font-mono" style={{ color: 'rgba(60,60,67,0.8)' }}>closed-loop control system</span>
                {!isRoot && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-lg font-medium"
                    style={{
                      background: activeEntity.color + '15',
                      border: `1px solid ${activeEntity.color}30`,
                      color: activeEntity.color,
                    }}
                  >
                    {activeEntity.name}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(60,60,67,0.8)' }}>
                Every KPI deviation triggers: RCA → Action → Accept/Reject → Escalation
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {criticalCount > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.20)' }}>
                  🔴 {criticalCount} critical
                </span>
              )}
              {escalatedCount > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,59,48,0.06)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.15)' }}>
                  🚨 {escalatedCount} escalated
                </span>
              )}
              {lockedCount > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(60,60,67,0.8)', border: '1px solid var(--color-border)' }}>
                  🔒 {lockedCount} locked
                </span>
              )}
              <span className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,149,0,0.10)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.20)' }}>
                {openCount} open
              </span>
            </div>
          </div>

          {/* Propagation map */}
          {propagation.primary_failures.length > 0 && (
            <div className="mt-3 p-3 rounded-xl"
              style={{ border: '1px solid rgba(255,149,0,0.25)', background: 'rgba(255,149,0,0.08)' }}>
              <div className="text-xs font-mono uppercase font-bold mb-1.5" style={{ color: '#FF9500' }}>
                🔥 Cascade impact — failures propagating through org
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span style={{ color: 'rgba(60,60,67,0.8)' }}>Failing:</span>
                {propagation.primary_failures.map(rid => {
                  const r = COMMAND_CHAIN.find(x => x.id === rid)
                  return r ? <span key={rid} className="font-semibold" style={{ color: '#FF3B30' }}>{r.initials}</span> : null
                })}
                {propagation.cascade_failures.length > 0 && (
                  <>
                    <span className="mx-1" style={{ color: '#FF3B30' }}>→ cascades to →</span>
                    {propagation.cascade_failures.map(rid => {
                      const r = COMMAND_CHAIN.find(x => x.id === rid)
                      return r ? <span key={rid} className="font-semibold" style={{ color: '#FF9500' }}>{r.initials}</span> : null
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-5 mt-4 -mb-px">
            {([
              { id: 'incidents', label: `Incidents (${openCount})` },
              { id: 'kpis',      label: 'KPI Overview' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="text-xs pb-2 border-b-2 transition-colors font-medium"
                style={{
                  color: tab === t.id ? '#2563EB' : 'rgba(60,60,67,0.8)',
                  borderColor: tab === t.id ? '#2563EB' : 'transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {tab === 'incidents' && sorted.map(inc => (
          <IncidentCard
            key={inc.id}
            incident={inc}
            onActionAccept={handleAccept}
            onActionReject={handleReject}
          />
        ))}

        {tab === 'kpis' && (
          <div className="space-y-4">
            {scopedRoles.map(role => (
              <RoleKPIBlock key={role.id} roleId={role.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
