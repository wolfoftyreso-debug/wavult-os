// ─── Wavult OS — Insurance Hub ────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import {
  POLICIES,
  INSURANCE_ENTITIES,
  MOCK_AUDIT_HISTORY,
  CATEGORY_LABELS,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  runWeeklyAudit,
  type InsurancePolicy,
  type InsurancePriority,
} from './insuranceData'

// ─── Score Circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score < 50 ? '#EF4444' : score < 75 ? '#F59E0B' : '#10B981'
  const label = score < 50 ? 'Kritisk' : score < 75 ? 'Begränsad' : 'God'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="108" height="108" viewBox="0 0 108 108">
        <circle cx="54" cy="54" r={r} fill="none" stroke="#1F2937" strokeWidth="10" />
        <circle
          cx="54" cy="54" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 54 54)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="54" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="monospace">
          {score}
        </text>
        <text x="54" y="66" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="9" fontFamily="sans-serif">
          {label}
        </text>
      </svg>
      <span className="text-xs text-gray-500">Täckningspoäng</span>
    </div>
  )
}

// ─── Policy Row ───────────────────────────────────────────────────────────────

function PolicyRow({ policy }: { policy: InsurancePolicy }) {
  const [expanded, setExpanded] = useState(false)
  const sc = STATUS_CONFIG[policy.status]
  const pc = PRIORITY_CONFIG[policy.priority]

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer transition-colors hover:bg-white/[0.04]"
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Priority dot */}
        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: pc.color }} />

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{policy.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {CATEGORY_LABELS[policy.category]} · {policy.entities.length} {policy.entities.length === 1 ? 'bolag' : 'bolag'}
            {policy.coverage ? ` · ${policy.coverage}` : ''}
          </div>
        </div>

        {/* Status badge */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color: sc.color, background: sc.bg }}
        >
          {sc.label.toUpperCase()}
        </span>

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`flex-shrink-0 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04] space-y-3 mt-1 pt-3">
          <p className="text-sm text-gray-300">{policy.description}</p>

          <div className="rounded-lg px-3 py-2.5" style={{ background: '#1C1107' }}>
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1">Varför viktigt</div>
            <p className="text-xs text-amber-200">{policy.why}</p>
          </div>

          {policy.recommendation && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: '#0D1B3E' }}>
              <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1">Rekommendation</div>
              <p className="text-xs text-blue-200">{policy.recommendation}</p>
            </div>
          )}

          {/* Entities covered */}
          <div className="flex flex-wrap gap-1.5">
            {policy.entities.map(e => {
              const ent = INSURANCE_ENTITIES.find(x => x.id === e)
              return (
                <span key={e} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400">
                  {ent?.shortName ?? e}
                </span>
              )
            })}
          </div>

          {policy.provider && (
            <p className="text-xs text-gray-500">Leverantör: {policy.provider}</p>
          )}
          {policy.premium && (
            <p className="text-xs text-gray-500">Premie: {policy.premium}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ score }: { score: number }) {
  const criticalCount = useMemo(
    () => POLICIES.filter(p => p.priority === 'critical' && (p.status === 'missing' || p.status === 'expired')).length,
    []
  )
  const importantCount = useMemo(
    () => POLICIES.filter(p => p.priority === 'important' && (p.status === 'missing' || p.status === 'expired')).length,
    []
  )
  const activeCount = useMemo(
    () => POLICIES.filter(p => p.status === 'active').length,
    []
  )

  const sorted = useMemo(() => {
    const order: Record<InsurancePriority, number> = { critical: 0, important: 1, optional: 2 }
    return [...POLICIES].sort((a, b) => order[a.priority] - order[b.priority])
  }, [])

  return (
    <div className="space-y-6">
      {/* Score + Summary */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01]">
        <ScoreCircle score={score} />
        <div className="flex-1 grid grid-cols-3 gap-4 w-full">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
            <div className="text-xs text-gray-500 mt-1">Kritiska gap</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{importantCount}</div>
            <div className="text-xs text-gray-500 mt-1">Viktiga saknas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
            <div className="text-xs text-gray-500 mt-1">Aktiva</div>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {criticalCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10">
          <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0 animate-pulse" />
          <div>
            <div className="text-sm font-semibold text-red-300">
              {criticalCount} kritisk{criticalCount !== 1 ? 'a' : ''} täckning{criticalCount !== 1 ? 'ar' : ''} saknas
            </div>
            <div className="text-xs text-red-400 mt-0.5">
              Organisationen är exponerad mot skadeståndskrav, dataintrång och arbetsgivaransvar utan adekvat skydd.
            </div>
          </div>
        </div>
      )}

      {/* Policies list */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">
          Alla försäkringar ({POLICIES.length})
        </div>
        {sorted.map(p => <PolicyRow key={p.id} policy={p} />)}
      </div>
    </div>
  )
}

// ─── Tab 2: Weekly Audit ──────────────────────────────────────────────────────

function AuditTab() {
  const audit = useMemo(() => runWeeklyAudit(), [])

  return (
    <div className="space-y-6">
      {/* Audit header */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.01]">
        <div>
          <div className="text-sm font-semibold text-white">Veckorevision — vecka {audit.weekNumber}</div>
          <div className="text-xs text-gray-500 mt-0.5">Utförd: {audit.auditDate}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Nästa revision</div>
          <div className="text-sm font-mono text-brand-accent">{audit.nextReviewDate}</div>
        </div>
      </div>

      {/* Score */}
      <div className="flex justify-center">
        <ScoreCircle score={audit.overallScore} />
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">
          Rekommendationer ({audit.recommendations.length})
        </div>
        {audit.recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">Inga aktiva rekommendationer</div>
        ) : (
          audit.recommendations.map((rec) => {
            const pc = PRIORITY_CONFIG[rec.priority]
            const actionLabels = {
              obtain:           'Teckna',
              renew:            'Förnya',
              review:           'Granska',
              increase_coverage: 'Utöka täckning',
            }
            return (
              <div
                key={rec.policyId}
                className="px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.01] space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: pc.color, background: pc.color + '20' }}
                  >
                    {pc.label.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">{actionLabels[rec.action]}</span>
                  {rec.deadline && (
                    <span className="text-[10px] text-red-400 font-mono ml-auto">
                      Deadline: {rec.deadline}
                    </span>
                  )}
                </div>
                <div className="text-sm text-white font-medium">{rec.title}</div>
                <div className="text-xs text-gray-400">{rec.detail}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Historical audit log */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">
          Revisionshistorik
        </div>
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-500">
                <th className="text-left px-4 py-2 font-medium">Datum</th>
                <th className="text-left px-4 py-2 font-medium">Vecka</th>
                <th className="text-left px-4 py-2 font-medium">Poäng</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT_HISTORY.map((h, i) => (
                <tr key={i} className="border-b border-white/[0.03] text-gray-400">
                  <td className="px-4 py-2 font-mono">{h.date}</td>
                  <td className="px-4 py-2">V{h.week}</td>
                  <td className="px-4 py-2 font-mono">
                    <span style={{ color: h.score < 50 ? '#EF4444' : h.score < 75 ? '#F59E0B' : '#10B981' }}>
                      {h.score}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-red-400 text-[10px] font-mono">KRITISK</td>
                </tr>
              ))}
              <tr className="text-gray-300 bg-white/[0.02]">
                <td className="px-4 py-2 font-mono">{audit.auditDate}</td>
                <td className="px-4 py-2">V{audit.weekNumber}</td>
                <td className="px-4 py-2 font-mono">
                  <span style={{ color: audit.overallScore < 50 ? '#EF4444' : audit.overallScore < 75 ? '#F59E0B' : '#10B981' }}>
                    {audit.overallScore}
                  </span>
                </td>
                <td className="px-4 py-2 text-[10px] font-mono text-blue-400">SENASTE</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-600 px-1">Revisioner sker automatiskt varje måndag. Score baseras på kritiska och viktiga täckningsgap.</p>
      </div>
    </div>
  )
}

// ─── Tab 3: Entities ──────────────────────────────────────────────────────────

function EntityCoverage({ entityId, name }: { entityId: string; name: string }) {
  const covered = POLICIES.filter(p => p.entities.includes(entityId))
  const missing = covered.filter(p => p.status === 'missing' || p.status === 'expired')
  const active  = covered.filter(p => p.status === 'active')
  const criticalGaps = missing.filter(p => p.priority === 'critical')

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {active.length} aktiva · {missing.length} saknas
          </div>
        </div>
        {criticalGaps.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
            {criticalGaps.length} kritisk{criticalGaps.length !== 1 ? 'a' : ''} gap
          </span>
        )}
      </div>

      {/* Policies */}
      <div className="divide-y divide-white/[0.03]">
        {covered.length === 0 ? (
          <div className="px-4 py-3 text-xs text-gray-600">Inga försäkringar registrerade för denna enhet.</div>
        ) : (
          covered.map(p => {
            const sc = STATUS_CONFIG[p.status]
            const pc = PRIORITY_CONFIG[p.priority]
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: pc.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 truncate">{p.name}</div>
                  <div className="text-[10px] text-gray-600">{CATEGORY_LABELS[p.category]}</div>
                </div>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: sc.color, background: sc.bg }}
                >
                  {sc.label.toUpperCase()}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function EntitiesTab() {
  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500 px-1">
        Visar försäkringsskydd per juridisk enhet inom Wavult Group.
      </div>
      {INSURANCE_ENTITIES.map(e => (
        <EntityCoverage key={e.id} entityId={e.id} name={e.name} />
      ))}

      {/* Note on missing entities */}
      <div className="px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
        <div className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1">Notering</div>
        <p className="text-xs text-gray-500">
          Texas LLC, Litauisk UAB och Dubai Holding saknas ännu i registret. Lägg till försäkringsuppgifter när dessa enheter är etablerade.
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'overview' | 'audit' | 'entities'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Översikt' },
  { id: 'audit',    label: 'Veckorevision' },
  { id: 'entities', label: 'Entiteter' },
]

export function InsuranceHub() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const audit = useMemo(() => runWeeklyAudit(), [])

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Insurance Hub</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organisationens försäkringsskydd — revideras automatiskt varje vecka
        </p>
      </div>

      {/* Critical alert strip */}
      {audit.criticalGaps.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-500/40 bg-red-500/8">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-xs text-red-300 flex-1">
            <strong>{audit.criticalGaps.length} kritiska</strong> försäkringsgap kräver omedelbar åtgärd
          </span>
          <span className="text-[10px] text-gray-600 font-mono">V{audit.weekNumber}</span>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex border-b border-white/[0.06]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-brand-accent text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'  && <OverviewTab score={audit.overallScore} />}
        {activeTab === 'audit'     && <AuditTab />}
        {activeTab === 'entities'  && <EntitiesTab />}
      </div>
    </div>
  )
}
