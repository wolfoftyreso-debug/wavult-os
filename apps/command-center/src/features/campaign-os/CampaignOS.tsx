// ─── Campaign Operating System ────────────────────────────────────────────────
// Global execution engine: Plan → Budget → Asset → Deploy → Measure → Adjust

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAMPAIGN_ACTIVITIES,
  CHANNEL_LABEL,
  CHANNEL_COLOR,
  STATUS_COLOR,
  KPI_COLOR,
  CampaignActivity,
  CampaignChannel,
  ActivityStatus,
  isActivityValid,
  getActivityAlerts,
} from './data'
import { ENTITIES } from '../org-graph/data'
import { COMMAND_CHAIN } from '../org-graph/commandChain'
import { MARKET_SITES } from '../market-sites/data'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND_COLOR: Record<CampaignActivity['brand'], string> = {
  quixzoom: '#10B981',
  'quixom-ads': '#0EA5E9',
  landvex: '#F59E0B',
  hypbit: '#A78BFA',
  wavult: '#8B5CF6',
}

const BRAND_ABBR: Record<CampaignActivity['brand'], string> = {
  quixzoom: 'QZ',
  'quixom-ads': 'QA',
  landvex: 'LV',
  hypbit: 'HB',
  wavult: 'WG',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function weekLabel(iso: string): string {
  const d = new Date(iso)
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `W${week}`
}

function monthKey(iso: string): string {
  return iso.substring(0, 7) // YYYY-MM
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()
}

function dayKey(iso: string): string {
  return iso // YYYY-MM-DD
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.05] pt-3 pb-3 px-4 space-y-2">
      <p className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.15em]">{label}</p>
      {children}
    </div>
  )
}

function ChannelBadge({ channel }: { channel: CampaignChannel }) {
  const c = CHANNEL_COLOR[channel]
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: c + '20', color: c }}>
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  const c = STATUS_COLOR[status]
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: c + '20', color: c }}>
      {status}
    </span>
  )
}

function KpiBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((current / target) * 100))
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-mono" style={{ color }}>
          {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Activity Card (inline in timeline) ──────────────────────────────────────

function ActivityCard({ activity, selected, onClick }: {
  activity: CampaignActivity
  selected: boolean
  onClick: () => void
}) {
  const alerts = getActivityAlerts(activity)
  const hasAlerts = alerts.length > 0
  const brandColor = BRAND_COLOR[activity.brand]
  const statusColor = STATUS_COLOR[activity.status]
  const kpiColor = KPI_COLOR[activity.kpi.result]

  return (
    <div
      onClick={onClick}
      className="relative flex-shrink-0 cursor-pointer rounded-lg border px-3 py-2 transition-all"
      style={{
        width: '180px',
        background: selected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        borderColor: selected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Left status stripe */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ background: statusColor }}
      />

      <div className="pl-1.5 space-y-1">
        {/* Brand abbrev + name row */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold font-mono"
            style={{ color: brandColor }}>
            {BRAND_ABBR[activity.brand]}
          </span>
          <span className="text-xs text-white font-semibold truncate flex-1">
            {activity.name}
          </span>
        </div>

        {/* Channel + time row */}
        <div className="flex items-center justify-between gap-1">
          <ChannelBadge channel={activity.channel} />
          <span className="text-[9px] font-mono text-gray-600">{activity.time}</span>
        </div>

        {/* KPI dot + alert dot */}
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: kpiColor }} />
          {hasAlerts && (
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          )}
          <span className="text-[8px] font-mono text-gray-700 capitalize">{activity.kpi.result}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Activity Panel (detail, 340px right pane) ────────────────────────────────

function ActivityPanel({ activity, onClose }: { activity: CampaignActivity; onClose: () => void }) {
  const navigate = useNavigate()
  const alerts = getActivityAlerts(activity)
  const valid = isActivityValid(activity)

  const entity = ENTITIES.find(e => e.id === activity.entity_id)
  const site = MARKET_SITES.find(s => s.id === activity.site_id)
  const role = COMMAND_CHAIN.find(r => r.id === activity.responsible_role_id)

  const spendPct = activity.budget.cost_monthly === 0
    ? 0
    : Math.min(100, Math.round((activity.budget.spend_to_date / activity.budget.cost_monthly) * 100))

  const kpiPct = activity.kpi.target === 0
    ? 0
    : Math.min(100, Math.round((activity.kpi.current / activity.kpi.target) * 100))

  const kpiColor = KPI_COLOR[activity.kpi.result]
  const brandColor = BRAND_COLOR[activity.brand]

  return (
    <div
      className="w-full md:w-[340px] flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: '#09090F', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[9px] font-bold font-mono"
            style={{ color: brandColor }}>
            {BRAND_ABBR[activity.brand]}
          </span>
          <span className="text-sm font-semibold text-white truncate">{activity.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 transition-colors text-sm leading-none ml-2 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* 1. SNAPSHOT */}
        <PanelSection label="Snapshot">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={activity.status} />
            <ChannelBadge channel={activity.channel} />
            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: brandColor + '20', color: brandColor }}>
              {activity.brand}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-500">{activity.country}</span>
            <span className="font-mono text-gray-600">{formatDate(activity.date)} · {activity.time}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {valid ? (
              <>
                <span className="text-[9px]" style={{ color: '#10B981' }}>✓</span>
                <span className="text-[9px]" style={{ color: '#10B981' }}>Valid — ready to deploy</span>
              </>
            ) : (
              <>
                <span className="text-[9px]" style={{ color: '#EF4444' }}>⚠</span>
                <span className="text-[9px]" style={{ color: '#EF4444' }}>Not valid — missing requirements</span>
              </>
            )}
          </div>
        </PanelSection>

        {/* 2. NEXT ACTION */}
        <PanelSection label="Next Action">
          {alerts.length > 0 ? (
            <div className="space-y-1.5">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="rounded-lg px-3 py-2 space-y-1"
                  style={{
                    background: (alert.severity === 'critical' ? '#EF4444' : '#F59E0B') + '12',
                    border: `1px solid ${alert.severity === 'critical' ? '#EF4444' : '#F59E0B'}30`,
                  }}
                >
                  <p className="text-xs font-semibold"
                    style={{ color: alert.severity === 'critical' ? '#EF4444' : '#F59E0B' }}>
                    ⚠ {alert.message}
                  </p>
                  <p className="text-[9px] text-gray-500">{alert.action}</p>
                  {alert.escalated && (
                    <p className="text-[8px] font-bold text-red-400 uppercase tracking-wider">Escalated</p>
                  )}
                </div>
              ))}
            </div>
          ) : valid && activity.status === 'ready' ? (
            <div className="rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.05]">
              <p className="text-xs" style={{ color: '#10B981' }}>✓ Ready to deploy</p>
              <p className="text-[9px] text-gray-600 mt-0.5">All requirements met</p>
            </div>
          ) : (
            <p className="text-xs text-gray-600">No actions required</p>
          )}
        </PanelSection>

        {/* 3. KPI TARGET */}
        <PanelSection label="KPI Target">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white font-semibold capitalize">{activity.kpi.metric}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: kpiColor + '20', color: kpiColor }}>
              {activity.kpi.result}
            </span>
          </div>
          <KpiBar
            label={`${activity.kpi.metric} progress`}
            current={activity.kpi.current}
            target={activity.kpi.target}
          />
          <p className="text-[9px] font-mono text-gray-700 mt-1">{kpiPct}% of target achieved</p>
        </PanelSection>

        {/* 4. ASSET */}
        <PanelSection label="Asset">
          <div className="rounded-lg px-3 py-2 bg-white/[0.02] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase">{activity.asset.type.replace('-', ' ')}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest px-1 rounded"
                style={{
                  background: activity.asset.ready ? '#10B98120' : '#EF444420',
                  color: activity.asset.ready ? '#10B981' : '#EF4444',
                }}>
                {activity.asset.ready ? 'Ready' : 'Not ready'}
              </span>
            </div>
            <p className="text-xs text-white">{activity.asset.name}</p>
            {activity.asset.url && (
              <a
                href={activity.asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-gray-600 hover:text-gray-300 transition-colors truncate block"
              >
                {activity.asset.url}
              </a>
            )}
          </div>
        </PanelSection>

        {/* 5. BUDGET */}
        <PanelSection label="Budget">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Monthly cost</span>
              <span className="text-white font-mono">${activity.budget.cost_monthly.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Spend to date</span>
              <span className="font-mono"
                style={{ color: spendPct > 90 ? '#EF4444' : '#10B981' }}>
                ${activity.budget.spend_to_date.toLocaleString()}
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full"
                  style={{
                    width: `${spendPct}%`,
                    background: spendPct > 90 ? '#EF4444' : '#3B82F6',
                  }} />
              </div>
              <p className="text-[8px] font-mono text-gray-700">{spendPct}% utilized</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-bold uppercase tracking-widest px-1 rounded"
                style={{
                  background: activity.budget.approved ? '#10B98120' : '#6B728020',
                  color: activity.budget.approved ? '#10B981' : '#6B7280',
                }}>
                {activity.budget.approved ? 'Approved' : 'Pending approval'}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-widest px-1 rounded"
                style={{ background: '#ffffff08', color: '#6B7280' }}>
                {activity.budget.status}
              </span>
            </div>
          </div>
        </PanelSection>

        {/* 6. AUTOMATION */}
        <PanelSection label="Automation">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Trigger</span>
              <span className="font-mono text-white uppercase">{activity.automation.trigger}</span>
            </div>
            {activity.automation.schedule && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Schedule</span>
                <span className="font-mono text-gray-400 text-[9px]">{activity.automation.schedule}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Channel API</span>
              <ChannelBadge channel={activity.automation.channel_api} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Retry count</span>
              <span className="font-mono text-gray-400">{activity.automation.retry_count}</span>
            </div>
            {activity.automation.fallback_channel && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Fallback</span>
                <ChannelBadge channel={activity.automation.fallback_channel} />
              </div>
            )}
            {activity.automation.last_run && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Last run</span>
                <span className="font-mono text-gray-600 text-[9px]">
                  {activity.automation.last_run.substring(0, 10)}
                </span>
              </div>
            )}
            {activity.automation.next_run && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Next run</span>
                <span className="font-mono text-gray-400 text-[9px]">
                  {activity.automation.next_run.substring(0, 10)}
                </span>
              </div>
            )}
          </div>
        </PanelSection>

        {/* 7. CONNECTIONS */}
        <PanelSection label="Connections">
          <div className="space-y-2">
            {entity && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Entity</span>
                <button
                  onClick={() => navigate('/entities/' + entity.id)}
                  className="font-mono text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  {entity.shortName} →
                </button>
              </div>
            )}
            {site && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Market site</span>
                <button
                  onClick={() => navigate('/markets')}
                  className="font-mono text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  {site.name} →
                </button>
              </div>
            )}
            {role && (
              <div className="flex items-center gap-2 mt-1">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: role.color + '20', color: role.color }}>
                  {role.initials}
                </div>
                <div>
                  <p className="text-xs text-white">{role.person}</p>
                  <p className="text-[9px] text-gray-600">{role.title}</p>
                </div>
              </div>
            )}
          </div>
        </PanelSection>

        {/* 8. DESCRIPTION */}
        <PanelSection label="Description">
          <p className="text-xs text-gray-400 leading-relaxed">{activity.description}</p>
        </PanelSection>

      </div>
    </div>
  )
}

// ─── Main CampaignOS component ────────────────────────────────────────────────

export function CampaignOS() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterChannel, setFilterChannel] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCountry, setFilterCountry] = useState<string>('all')
  const { isInScope, activeEntity: scopeEntity } = useEntityScope()

  const brands = useMemo(() =>
    Array.from(new Set(CAMPAIGN_ACTIVITIES.map(a => a.brand))).sort(),
    []
  )
  const channels = useMemo(() =>
    Array.from(new Set(CAMPAIGN_ACTIVITIES.map(a => a.channel))).sort(),
    []
  )
  const statuses = useMemo(() =>
    Array.from(new Set(CAMPAIGN_ACTIVITIES.map(a => a.status))).sort(),
    []
  )
  const countries = useMemo(() =>
    Array.from(new Set(CAMPAIGN_ACTIVITIES.map(a => a.country))).sort(),
    []
  )

  const filtered = useMemo(() => {
    return CAMPAIGN_ACTIVITIES.filter(a => {
      if (!isInScope(a.entity_id)) return false
      if (filterBrand !== 'all' && a.brand !== filterBrand) return false
      if (filterChannel !== 'all' && a.channel !== filterChannel) return false
      if (filterStatus !== 'all' && a.status !== filterStatus) return false
      if (filterCountry !== 'all' && a.country !== filterCountry) return false
      return true
    })
  }, [isInScope, filterBrand, filterChannel, filterStatus, filterCountry])

  // Summary counts
  const deployedCount = filtered.filter(a => a.status === 'deployed').length
  const failedCount = filtered.filter(a => a.status === 'failed').length

  // Group by month → day
  const grouped = useMemo(() => {
    const byMonth = new Map<string, Map<string, CampaignActivity[]>>()
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date))

    for (const activity of sorted) {
      const mk = monthKey(activity.date)
      const dk = dayKey(activity.date)
      if (!byMonth.has(mk)) byMonth.set(mk, new Map())
      const byDay = byMonth.get(mk)!
      if (!byDay.has(dk)) byDay.set(dk, [])
      byDay.get(dk)!.push(activity)
    }

    return byMonth
  }, [filtered])

  // All calendar days in Q2 2026 (Apr 1 – Jun 30), only those with activities
  // We show months as headers with days that have activities
  const selectedActivity = selectedId
    ? CAMPAIGN_ACTIVITIES.find(a => a.id === selectedId) ?? null
    : null

  const TODAY = '2026-03-25'

  const selectDropdownClass =
    'text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1 font-mono cursor-pointer focus:outline-none appearance-none text-gray-400'

  return (
    <div className="flex flex-col h-full" style={{ background: '#07080F' }}>
      {/* ── TOOLBAR ─────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 border-b"
        style={{ height: '44px', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Left: title + period */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white tracking-wide">Campaign OS</span>
          <span className="text-[9px] font-mono text-gray-700 px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02]">
            Q2 2026
          </span>
        </div>

        {/* Right: filters + summary */}
        <div className="flex items-center gap-2">
          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className={selectDropdownClass}>
            <option value="all">All brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className={selectDropdownClass}>
            <option value="all">All channels</option>
            {channels.map(c => <option key={c} value={c}>{CHANNEL_LABEL[c as CampaignChannel]}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectDropdownClass}>
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className={selectDropdownClass}>
            <option value="all">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/[0.06]">
            <span className="text-[9px] font-mono text-gray-600">{filtered.length} activities</span>
            {deployedCount > 0 && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#10B98120', color: '#10B981' }}>
                {deployedCount} deployed
              </span>
            )}
            {failedCount > 0 && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#EF444420', color: '#EF4444' }}>
                {failedCount} failed
              </span>
            )}
            {scopeEntity.id !== 'wavult-group' && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: scopeEntity.color + '15', color: scopeEntity.color }}
              >
                scope: {scopeEntity.shortName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── TIMELINE (left) ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {grouped.size === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs text-gray-700">No activities match current filters</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([mk, byDay]) => {
              const monthActivities = Array.from(byDay.values()).flat()
              const monthColor = mk === '2026-04' ? '#8B5CF6' : mk === '2026-05' ? '#0EA5E9' : '#10B981'

              return (
                <div key={mk}>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-xs font-bold uppercase tracking-[0.15em]"
                      style={{ color: monthColor }}
                    >
                      {monthLabel(mk)}
                    </span>
                    <span className="text-[9px] font-mono text-gray-700">
                      {monthActivities.length} activit{monthActivities.length === 1 ? 'y' : 'ies'}
                    </span>
                    <div className="flex-1 h-px" style={{ background: monthColor + '20' }} />
                  </div>

                  {/* Days */}
                  <div className="space-y-1">
                    {Array.from(byDay.entries()).map(([dk, activities]) => {
                      const isToday = dk === TODAY
                      const weekLabel_ = weekLabel(dk)

                      return (
                        <div key={dk} className="flex items-start gap-3">
                          {/* Date label */}
                          <div
                            className="flex-shrink-0 pt-1"
                            style={{ width: '96px' }}
                          >
                            <div className="flex flex-col">
                              <span
                                className="text-[9px] font-mono"
                                style={{ color: isToday ? '#F59E0B' : '#374151' }}
                              >
                                {weekLabel_}
                              </span>
                              <span
                                className="text-[9px] font-mono leading-tight"
                                style={{ color: isToday ? '#F59E0B' : '#4B5563' }}
                              >
                                {dayLabel(dk)}
                                {isToday && <span className="ml-1 text-[8px]">← today</span>}
                              </span>
                            </div>
                          </div>

                          {/* Activity cards */}
                          <div className="flex flex-wrap gap-2 flex-1">
                            {activities.length === 0 ? (
                              <span className="text-[9px] text-gray-800 pt-1">–</span>
                            ) : (
                              activities.map(activity => (
                                <ActivityCard
                                  key={activity.id}
                                  activity={activity}
                                  selected={selectedId === activity.id}
                                  onClick={() => setSelectedId(
                                    selectedId === activity.id ? null : activity.id
                                  )}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── ACTIVITY PANEL (right, 340px) — full screen on mobile ──────── */}
        {selectedActivity && (
          <div className="fixed md:static inset-0 md:inset-auto z-50 md:z-auto">
            <ActivityPanel
              activity={selectedActivity}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
