// ─── Talent Radar — OpenClaw Elite Recruitment ───────────────────────────────

import { useState } from 'react'
import {
  TALENT_TARGETS, STATUS_LABELS, STATUS_COLORS, SOURCE_ICONS,
  type TalentTarget, type TalentStatus
} from './data'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TalentStatus }) {
  const color = STATUS_COLORS[status]
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold flex-shrink-0"
      style={{ background: color + '20', color, border: `1px solid ${color}40` }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── Stars display ────────────────────────────────────────────────────────────

function Stars({ n }: { n: number }) {
  const fmt = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
  return (
    <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
      ⭐ {fmt}
    </span>
  )
}

// ─── Target card ─────────────────────────────────────────────────────────────

function TargetCard({ target, onClick, selected }: {
  target: TalentTarget
  onClick: () => void
  selected: boolean
}) {
  const statusColor = STATUS_COLORS[target.status]

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
      style={{ background: selected ? '#1a1d2e' : undefined }}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0 mt-0.5">
          {SOURCE_ICONS[target.source]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{target.handle}</span>
            {target.repoStars && <Stars n={target.repoStars} />}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            {target.specialty.slice(0, 3).join(' · ')}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={target.status} />
            {target.lastActivity && (
              <span className="text-[9px] text-gray-700 font-mono">
                active {target.lastActivity}
              </span>
            )}
          </div>
        </div>
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
          style={{ background: statusColor }}
        />
      </div>
    </button>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function TargetDetail({ target }: { target: TalentTarget }) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="text-4xl">{SOURCE_ICONS[target.source]}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white">{target.handle}</h2>
          {target.name && <p className="text-sm text-gray-400">{target.name}</p>}
          {target.location && (
            <p className="text-xs text-gray-600 mt-0.5">📍 {target.location}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={target.status} />
            {target.repoStars && <Stars n={target.repoStars} />}
          </div>
        </div>
      </div>

      {/* Repo */}
      {target.repoUrl && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-xs text-gray-600 font-mono mb-1">REPO</div>
          <p className="text-sm text-gray-300 mb-2">{target.repoDescription}</p>
          <a
            href={target.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
          >
            {target.repoUrl}
          </a>
        </div>
      )}

      {/* Specialty */}
      <div>
        <div className="text-xs text-gray-600 font-mono mb-2">SPECIALTIES</div>
        <div className="flex flex-wrap gap-1.5">
          {target.specialty.map(s => (
            <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.05] text-gray-300 border border-white/[0.06]">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Notes */}
      {target.notes && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-xs text-amber-600 font-mono mb-1">SCOUT NOTES</div>
          <p className="text-sm text-gray-300 leading-relaxed">{target.notes}</p>
        </div>
      )}

      {/* Signals */}
      {target.signals.length > 0 && (
        <div>
          <div className="text-xs text-gray-600 font-mono mb-2">SIGNALS</div>
          <div className="space-y-2">
            {target.signals.map((sig, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <span className="text-gray-700 font-mono flex-shrink-0">{sig.date}</span>
                <span className="text-gray-400">{sig.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 flex-wrap">
        <a
          href={target.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-2 rounded-lg bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
        >
          View Profile →
        </a>
        {target.repoUrl && (
          <a
            href={target.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-2 rounded-lg bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
          >
            View Repo →
          </a>
        )}
        <button className="text-xs px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors border border-blue-500/20">
          Draft Outreach
        </button>
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ targets }: { targets: TalentTarget[] }) {
  const totalStars = targets.reduce((s, t) => s + (t.repoStars ?? 0), 0)
  const byStatus = targets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] bg-[#07090F] flex-wrap">
      <div className="text-xs text-gray-600 font-mono">
        <span className="text-white font-semibold">{targets.length}</span> targets
      </div>
      <div className="text-xs text-gray-600 font-mono">
        <span className="text-amber-400 font-semibold">⭐ {(totalStars / 1000).toFixed(0)}k</span> combined stars
      </div>
      {Object.entries(byStatus).map(([status, count]) => (
        <div key={status} className="text-xs font-mono" style={{ color: STATUS_COLORS[status as TalentStatus] }}>
          {count} {STATUS_LABELS[status as TalentStatus]}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TalentRadar() {
  const [selectedId, setSelectedId] = useState<string | null>(TALENT_TARGETS[0]?.id ?? null)
  const [filterStatus, setFilterStatus] = useState<TalentStatus | 'all'>('all')
  const [mobileShowDetail, setMobileShowDetail] = useState(false)

  const filtered = filterStatus === 'all'
    ? TALENT_TARGETS
    : TALENT_TARGETS.filter(t => t.status === filterStatus)

  const selected = TALENT_TARGETS.find(t => t.id === selectedId) ?? null

  const statuses: (TalentStatus | 'all')[] = ['all', 'spotted', 'watching', 'contacted', 'responded', 'interested', 'in-talks', 'onboarded']

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.06] bg-[#08090F]">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">🎯</span>
          <div>
            <h1 className="text-base font-bold text-white">Talent Radar</h1>
            <p className="text-xs text-gray-600">OpenClaw Elite — Global Recruitment Pipeline</p>
          </div>
        </div>
        {/* Status filter */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {statuses.map(s => {
            const count = s === 'all' ? TALENT_TARGETS.length : TALENT_TARGETS.filter(t => t.status === s).length
            if (count === 0 && s !== 'all') return null
            const active = filterStatus === s
            const color = s === 'all' ? '#9CA3AF' : STATUS_COLORS[s]
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-xs px-2.5 py-1 rounded-lg font-mono flex-shrink-0 transition-colors"
                style={{
                  background: active ? color + '20' : 'transparent',
                  color: active ? color : '#6B7280',
                  border: `1px solid ${active ? color + '50' : 'transparent'}`,
                }}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <StatsBar targets={filtered} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* List */}
        <div className={`
          ${mobileShowDetail ? 'hidden md:flex' : 'flex'}
          w-full md:w-72 flex-shrink-0 flex-col
          border-r border-white/[0.06] overflow-y-auto
        `}>
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 text-center">No targets in this stage.</div>
          ) : (
            filtered
              .sort((a, b) => (b.repoStars ?? 0) - (a.repoStars ?? 0))
              .map(t => (
                <TargetCard
                  key={t.id}
                  target={t}
                  selected={t.id === selectedId}
                  onClick={() => { setSelectedId(t.id); setMobileShowDetail(true) }}
                />
              ))
          )}
        </div>

        {/* Detail */}
        <div className={`
          ${mobileShowDetail ? 'flex' : 'hidden md:flex'}
          flex-1 flex-col overflow-y-auto min-w-0
        `}>
          {/* Mobile back */}
          {mobileShowDetail && (
            <button
              className="md:hidden flex items-center gap-2 px-4 py-3 text-xs text-gray-500 border-b border-white/[0.06]"
              onClick={() => setMobileShowDetail(false)}
            >
              ← Back to list
            </button>
          )}
          {selected
            ? <TargetDetail target={selected} />
            : (
              <div className="flex items-center justify-center h-full text-gray-700 text-sm">
                Select a target to view details
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
