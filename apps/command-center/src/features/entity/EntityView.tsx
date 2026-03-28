// ─── EntityView — Entity-Centric Control Layer ────────────────────────────────
// Single control center per entity. Tabs lazy-render their content.
// Data is NEVER duplicated — all reads go through entityData.ts helpers.

import { useState, useMemo, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ENTITIES } from '../org-graph/data'
import {
  getEntityFinance, getEntityLegal, getEntitySystems,
  getEntityOps, getEntityPeople, getEntityRelationships,
} from './entityData'
import { useRole } from '../../shared/auth/RoleContext'
import { ROLE_PERMISSIONS } from '../org-graph/permissions'
import { computeHealthScore } from './healthScore'
import { HealthScorePanel, HealthBadge, HealthBar, LEVEL_COLOR } from './HealthScoreWidget'

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = 'overview' | 'health' | 'finance' | 'legal' | 'people' | 'ops' | 'systems' | 'relations'

interface Tab { id: TabId; label: string; icon: string; requiresScope?: string }

const ALL_TABS: Tab[] = [
  { id: 'overview',   label: 'Overview',       icon: '⬛' },
  { id: 'health',     label: 'Health',          icon: '❤️' },
  { id: 'finance',    label: 'Finance',         icon: '💰', requiresScope: 'finance' },
  { id: 'legal',      label: 'Legal',           icon: '⚖️', requiresScope: 'legal' },
  { id: 'people',     label: 'People',          icon: '👥' },
  { id: 'ops',        label: 'Operations',      icon: '⚙️' },
  { id: 'systems',    label: 'Systems',         icon: '🖥', requiresScope: 'tech' },
  { id: 'relations',  label: 'Relationships',   icon: '🔗' },
]

// ─── Risk helpers ─────────────────────────────────────────────────────────────

const RISK_COLOR = { ok: '#10B981', watch: '#F59E0B', risk: '#EF4444' }
const RISK_ICON  = { ok: '✓', watch: '⚠', risk: '✕' }

function RiskDot({ level }: { level: 'ok' | 'watch' | 'risk' }) {
  return <span className="text-xs" style={{ color: RISK_COLOR[level] }}>{RISK_ICON[level]}</span>
}

function StatusBadge({ v }: { v: string }) {
  const color = v === 'live' || v === 'passing' || v === 'complete' ? '#10B981'
    : v === 'building' || v === 'in-progress' || v === 'pending' ? '#F59E0B'
    : '#6B7280'
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-mono"
      style={{ background: color + '18', color, border: `1px solid ${color}25` }}>
      {v}
    </span>
  )
}

// ─── Mini entity graph ─────────────────────────────────────────────────────────

function MiniRelGraph({ entityId }: { entityId: string }) {
  const entity = ENTITIES.find(e => e.id === entityId)
  const parent = entity?.parent_entity_id ? ENTITIES.find(e => e.id === entity.parent_entity_id) : null
  const children = ENTITIES.filter(e => e.parent_entity_id === entityId)
  const rels = getEntityRelationships(entityId)

  return (
    <div className="space-y-3">
      {/* Parent chain */}
      {parent && (
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-600">Parent</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
            style={{ background: parent.color + '10', borderColor: parent.color + '30', color: parent.color }}>
            {parent.flag} {parent.shortName}
          </div>
          <div className="text-gray-600 text-xs">→ {entity?.shortName}</div>
        </div>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div className="flex items-start gap-2">
          <div className="text-xs text-gray-600 pt-1.5">Owns</div>
          <div className="flex flex-wrap gap-2">
            {children.map(c => (
              <div key={c.id} className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
                style={{ background: c.color + '10', borderColor: c.color + '30', color: c.color }}>
                {c.flag} {c.shortName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationships */}
      {rels.length > 0 && (
        <div>
          <div className="text-xs text-gray-600 mb-2">Relationships ({rels.length})</div>
          <div className="space-y-1.5">
            {rels.map(r => {
              const other = ENTITIES.find(e => e.id === (r.from_entity_id === entityId ? r.to_entity_id : r.from_entity_id))
              const dir = r.from_entity_id === entityId ? '→' : '←'
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 w-20 flex-shrink-0 font-mono">{r.type}</span>
                  <span className="text-gray-500">{dir}</span>
                  <span style={{ color: other?.color }}>{other?.flag} {other?.shortName}</span>
                  <span className="text-gray-700">· {r.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab panels (lazy) ────────────────────────────────────────────────────────

function OverviewTab({ entityId }: { entityId: string }) {
  const entity = ENTITIES.find(e => e.id === entityId)
  const finance = getEntityFinance(entityId)
  const legal = getEntityLegal(entityId)
  const ops = getEntityOps(entityId)
  if (!entity) return null

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-gray-300 leading-relaxed">{entity.description}</p>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(entity.metadata).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 font-mono mb-1">{k}</div>
            <div className="text-sm text-gray-200">{v}</div>
          </div>
        ))}
      </div>

      {/* Quick KPIs */}
      {ops && ops.kpis.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Key Metrics</h3>
          <div className="flex flex-wrap gap-3">
            {ops.kpis.map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 min-w-[120px]">
                <div className="text-xs text-gray-600 mb-1">{kpi.label}</div>
                <div className="text-lg font-bold" style={{ color: kpi.good ? '#10B981' : '#F59E0B' }}>{kpi.value}</div>
                {kpi.delta && <div className="text-xs text-gray-600 mt-0.5">{kpi.delta}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open risks */}
      {finance && finance.open_items.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Open Items</h3>
          <div className="space-y-1.5">
            {[...finance.open_items, ...(legal?.open_items ?? [])].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <RiskDot level={item.status} />
                <span className="text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini rel graph */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Structure</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <MiniRelGraph entityId={entityId} />
        </div>
      </div>
    </div>
  )
}

function FinanceTab({ entityId }: { entityId: string }) {
  const finance = getEntityFinance(entityId)
  if (!finance) return <p className="text-sm text-gray-600">No finance data.</p>

  const incomeEntities = finance.intercompany_in.map(id => ENTITIES.find(e => e.id === id)).filter(Boolean)
  const outEntities = finance.intercompany_out.map(id => ENTITIES.find(e => e.id === id)).filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="text-xs text-gray-600 mb-1">Currency</div>
          <div className="text-lg font-bold text-white font-mono">{finance.currency}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="text-xs text-gray-600 mb-1">Est. MRR</div>
          <div className="text-sm font-semibold text-gray-300">{finance.estimated_mrr}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="text-xs text-gray-600 mb-1">Cashflow</div>
          <div className="text-sm font-semibold" style={{ color: RISK_COLOR[finance.cashflow_status] }}>
            {finance.cashflow_status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Revenue model */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-xs text-gray-600 font-mono mb-1">Revenue model</div>
        <div className="text-sm text-gray-200">{finance.revenue_model}</div>
        {finance.billing_notes && (
          <div className="text-xs text-gray-600 mt-2">{finance.billing_notes}</div>
        )}
      </div>

      {/* Intercompany */}
      {(incomeEntities.length > 0 || outEntities.length > 0) && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Intercompany Flows</h3>
          <div className="space-y-2">
            {incomeEntities.map(e => e && (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm"
                style={{ borderColor: '#10B98125', background: '#10B98108' }}>
                <span className="text-[#10B981]">↓ IN</span>
                <span style={{ color: e.color }}>{e.flag} {e.shortName}</span>
                <span className="text-gray-600 text-xs">pays this entity</span>
              </div>
            ))}
            {outEntities.map(e => e && (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm"
                style={{ borderColor: '#EF444425', background: '#EF444408' }}>
                <span className="text-[#EF4444]">↑ OUT</span>
                <span style={{ color: e.color }}>{e.flag} {e.shortName}</span>
                <span className="text-gray-600 text-xs">receives from this entity</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open items */}
      {finance.open_items.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Open Items</h3>
          <div className="space-y-1.5">
            {finance.open_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <RiskDot level={item.status} /><span className="text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LegalTab({ entityId }: { entityId: string }) {
  const legal = getEntityLegal(entityId)
  if (!legal) return <p className="text-sm text-gray-600">No legal data.</p>

  const incColor = { complete: '#10B981', 'in-progress': '#F59E0B', 'not-started': '#6B7280' }[legal.incorporation_status]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="text-xs text-gray-600 mb-1">Legal form</div>
          <div className="text-sm font-semibold text-white">{legal.legal_form}</div>
          <div className="text-xs text-gray-600 mt-1">{legal.jurisdiction_detail}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="text-xs text-gray-600 mb-1">Incorporation</div>
          <div className="text-sm font-semibold" style={{ color: incColor }}>{legal.incorporation_status}</div>
          <div className="text-xs mt-1" style={{ color: RISK_COLOR[legal.compliance_status] }}>
            Compliance: {legal.compliance_status}
          </div>
        </div>
      </div>

      {legal.contracts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Contracts ({legal.contracts.length})
          </h3>
          <div className="space-y-2">
            {legal.contracts.map((c, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <RiskDot level={c.status} />
                  <span className="text-sm font-semibold text-white">{c.name}</span>
                </div>
                <p className="text-xs text-gray-500">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {legal.open_items.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Open Items</h3>
          <div className="space-y-1.5">
            {legal.open_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <RiskDot level={item.status} /><span className="text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PeopleTab({ entityId }: { entityId: string }) {
  const people = getEntityPeople(entityId)
  const entity = ENTITIES.find(e => e.id === entityId)

  if (!people.length) {
    return (
      <div className="text-sm text-gray-600 p-4">
        No roles directly mapped to this entity. Check Wavult Operations for core team.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {people.map(p => (
        <div key={p.person}
          className="rounded-xl border px-4 py-4"
          style={{ borderColor: p.color + '25', background: p.color + '06' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: p.color + '22', color: p.color }}>
              {p.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">{p.person}</div>
              <div className="text-xs text-gray-500">{p.role_type} · {p.scope}</div>
            </div>
            <div className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: (entity?.color ?? p.color) + '15', color: entity?.color ?? p.color }}>
              {entityId}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3 pl-13">
            {p.permissions.map(perm => (
              <span key={perm} className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-gray-500 font-mono">{perm}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function OpsTab({ entityId }: { entityId: string }) {
  const ops = getEntityOps(entityId)
  if (!ops) return <p className="text-sm text-gray-600">No ops data.</p>

  const workColor = { active: '#10B981', blocked: '#EF4444', done: '#6B7280', planned: '#F59E0B' }
  const delivColor = { 'on-track': '#10B981', 'at-risk': '#EF4444', done: '#6B7280' }

  return (
    <div className="space-y-6">
      {ops.kpis.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {ops.kpis.map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 min-w-[140px]">
              <div className="text-xs text-gray-600 mb-1">{kpi.label}</div>
              <div className="text-xl font-bold" style={{ color: kpi.good ? '#10B981' : '#F59E0B' }}>{kpi.value}</div>
              {kpi.delta && <div className="text-xs text-gray-600 mt-0.5">{kpi.delta}</div>}
            </div>
          ))}
        </div>
      )}

      {ops.active_work.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Active Work</h3>
          <div className="space-y-2">
            {ops.active_work.map((w, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: workColor[w.status] }} />
                <span className="flex-1 text-sm text-gray-200">{w.label}</span>
                <span className="text-xs text-gray-600 flex-shrink-0">{w.owner}</span>
                <StatusBadge v={w.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {ops.deliverables.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Deliverables</h3>
          <div className="space-y-2">
            {ops.deliverables.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-2.5">
                <span className="flex-1 text-sm text-gray-200">{d.label}</span>
                <span className="text-xs text-gray-600">{d.due}</span>
                <span className="text-xs font-mono" style={{ color: delivColor[d.status] }}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SystemsTab({ entityId }: { entityId: string }) {
  const sys = getEntitySystems(entityId)
  if (!sys || (!sys.systems.length && !sys.pipelines.length)) {
    return <p className="text-sm text-gray-600">No systems data.</p>
  }

  return (
    <div className="space-y-6">
      {sys.systems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Connected Systems</h3>
          <div className="space-y-2">
            {sys.systems.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.06] px-4 py-3">
                <span className="text-xs text-gray-600 font-mono w-16 flex-shrink-0 pt-0.5">{s.type}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{s.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.note}</div>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-0.5 block truncate">
                      {s.url}
                    </a>
                  )}
                </div>
                <StatusBadge v={s.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sys.pipelines.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">CI/CD</h3>
          <div className="space-y-2">
            {sys.pipelines.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: p.status === 'passing' ? '#10B981' : p.status === 'failing' ? '#EF4444' : '#F59E0B' }} />
                <span className="flex-1 text-sm text-gray-200">{p.name}</span>
                <span className="text-xs text-gray-600">{p.last_run}</span>
                <StatusBadge v={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sys.open_items.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Open Items</h3>
          <div className="space-y-1.5">
            {sys.open_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <RiskDot level={item.status} /><span className="text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RelationsTab({ entityId }: { entityId: string }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <MiniRelGraph entityId={entityId} />
      <p className="text-xs text-gray-700 mt-4">
        Click any entity badge in the Corporate Graph to navigate to their control center.
        <button onClick={() => navigate('/org')} className="text-blue-400 hover:text-blue-300 ml-1 transition-colors">
          Open Corporate Graph →
        </button>
      </p>
    </div>
  )
}

// ─── Health score tab ─────────────────────────────────────────────────────────

function HealthTab({ entityId }: { entityId: string }) {
  const hs = computeHealthScore(entityId)
  return <HealthScorePanel hs={hs} />
}

// ─── Main component ────────────────────────────────────────────────────────────

export function EntityView() {
  const { entityId } = useParams<{ entityId: string }>()
  const navigate = useNavigate()
  const { effectiveRole } = useRole()

  const roleId = effectiveRole?.id ?? 'group-ceo'
  const perms = ROLE_PERMISSIONS[roleId] ?? ROLE_PERMISSIONS['group-ceo']

  const resolvedId = entityId ?? ENTITIES[0].id
  const entity = ENTITIES.find(e => e.id === resolvedId)
  const hs = useMemo(() => computeHealthScore(resolvedId), [resolvedId])

  // On mobile: if no entityId in URL, show list; if entityId, show detail
  const [mobileShowDetail, setMobileShowDetail] = useState(!!entityId)

  // Keep in sync when URL changes
  useMemo(() => {
    setMobileShowDetail(!!entityId)
  }, [entityId])

  const defaultTab: TabId =
    perms.overlayMode === 'financial' ? 'finance' :
    perms.overlayMode === 'technical' ? 'systems' :
    perms.overlayMode === 'legal' ? 'legal' : 'overview'

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  const visibleTabs = useMemo(() => ALL_TABS.filter(tab => {
    if (!tab.requiresScope) return true
    if (perms.overlayMode === 'full') return true
    const scopeMap: Record<string, string> = { finance: 'financial', legal: 'legal', tech: 'technical' }
    return perms.overlayMode === scopeMap[tab.requiresScope]
  }), [perms])

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        Entity not found. <button onClick={() => navigate('/entities')} className="ml-2 text-blue-400">Browse entities →</button>
      </div>
    )
  }

  const statusColor = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[entity.active_status]

  const handleSelectEntity = (id: string) => {
    navigate(`/entities/${id}`)
    setActiveTab(defaultTab)
    setMobileShowDetail(true)
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Entity selector — hidden on mobile when detail shown ── */}
      <div className={`
        ${mobileShowDetail ? 'hidden md:flex' : 'flex'}
        w-full md:w-56 flex-shrink-0
        flex-col
        border-r border-white/[0.06] bg-[#07090F] overflow-y-auto
      `}>
        <div className="px-3 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Entities</p>
        </div>
        <div className="py-2">
          {ENTITIES.map(ent => {
            const active = ent.id === resolvedId
            const sc = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }[ent.active_status]
            const ehs = computeHealthScore(ent.id)
            return (
              <button
                key={ent.id}
                onClick={() => handleSelectEntity(ent.id)}
                className="w-full flex items-center gap-2.5 px-3 py-3 md:py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                style={{ background: active ? ent.color + '12' : undefined }}
              >
                <span className="text-base flex-shrink-0">{ent.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm md:text-xs font-semibold truncate" style={{ color: active ? ent.color : '#9CA3AF' }}>
                    {ent.shortName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <HealthBar score={ehs.overall} level={ehs.level} />
                    <span className="text-[9px] font-mono" style={{ color: LEVEL_COLOR[ehs.level] }}>{ehs.overall}</span>
                  </div>
                </div>
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: sc }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail panel — full width on mobile ── */}
      <div className={`
        ${mobileShowDetail ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col min-w-0 overflow-hidden
      `}>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#08090F]">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button — mobile only */}
                <button
                  className="md:hidden flex-shrink-0 p-1 -ml-1 text-gray-500 hover:text-gray-300"
                  onClick={() => setMobileShowDetail(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="text-2xl flex-shrink-0">{entity.flag}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base md:text-lg font-bold text-white truncate">{entity.name}</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0"
                      style={{ background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30` }}>
                      {entity.active_status}
                    </span>
                    <HealthBadge score={hs.overall} level={hs.level} />
                  </div>
                  <div className="text-xs text-gray-600 font-mono mt-0.5">
                    {entity.jurisdiction} · Layer {entity.layer} · {entity.shortName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/org')}
                className="hidden md:block text-xs text-gray-600 hover:text-gray-300 px-2.5 py-1.5 rounded-lg border border-white/[0.06] transition-colors flex-shrink-0 ml-4"
              >
                Graph →
              </button>
            </div>

            {/* Tab bar — scrollable on mobile */}
            <div className="flex gap-0 mt-4 -mb-px overflow-x-auto no-scrollbar">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="text-xs pb-2 mr-4 md:mr-5 transition-colors border-b-2 flex items-center gap-1 flex-shrink-0"
                  style={{
                    color: activeTab === tab.id ? entity.color : '#6B7280',
                    borderColor: activeTab === tab.id ? entity.color : 'transparent',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <Suspense fallback={<div className="text-xs text-gray-600 animate-pulse">Loading…</div>}>
            {activeTab === 'overview'  && <OverviewTab  entityId={resolvedId} />}
            {activeTab === 'health'    && <HealthTab    entityId={resolvedId} />}
            {activeTab === 'finance'   && <FinanceTab   entityId={resolvedId} />}
            {activeTab === 'legal'     && <LegalTab     entityId={resolvedId} />}
            {activeTab === 'people'    && <PeopleTab    entityId={resolvedId} />}
            {activeTab === 'ops'       && <OpsTab       entityId={resolvedId} />}
            {activeTab === 'systems'   && <SystemsTab   entityId={resolvedId} />}
            {activeTab === 'relations' && <RelationsTab entityId={resolvedId} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
