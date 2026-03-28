// ─── HealthScoreWidget — visual health display ────────────────────────────────
// Used in: entity selector sidebar, entity header, dashboard overview

import { useState } from 'react'
import { EntityHealthScore, DimensionScore, ScoreLevel } from './healthScore'

// ─── Colors & visual config ───────────────────────────────────────────────────

export const LEVEL_COLOR: Record<ScoreLevel, string> = {
  good:     '#10B981',
  watch:    '#F59E0B',
  critical: '#EF4444',
}

export const LEVEL_BG: Record<ScoreLevel, string> = {
  good:     '#10B98115',
  watch:    '#F59E0B15',
  critical: '#EF444415',
}

export const LEVEL_LABEL: Record<ScoreLevel, string> = {
  good:     'Healthy',
  watch:    'Watch',
  critical: 'Critical',
}

// ─── Circular score gauge ─────────────────────────────────────────────────────

export function ScoreGauge({
  score, level, size = 52, strokeWidth = 5,
}: {
  score: number
  level: ScoreLevel
  size?: number
  strokeWidth?: number
}) {
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const progress = circumference - (score / 100) * circumference
  const color = LEVEL_COLOR[level]

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#ffffff08" strokeWidth={strokeWidth} />
      {/* Progress */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={progress}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
      />
      {/* Score text */}
      <text
        x={cx} y={cx + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size < 48 ? 10 : 13}
        fontWeight="700"
        fill={color}
        style={{ transform: `rotate(90deg) translateX(${cx}px) translateY(-${cx}px)` }}
      >
        {score}
      </text>
    </svg>
  )
}

// ─── Mini health bar (for entity selector) ───────────────────────────────────

export function HealthBar({ score, level }: { score: number; level: ScoreLevel }) {
  const color = LEVEL_COLOR[level]
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#ffffff08', width: 36 }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

// ─── Single dimension pill ────────────────────────────────────────────────────

export function DimensionPill({
  dim, expanded, onClick,
}: {
  dim: DimensionScore
  expanded: boolean
  onClick: () => void
}) {
  const color = LEVEL_COLOR[dim.level]
  const negSignals = dim.signals.filter(s => s.weight === 'negative' || s.weight === 'critical')

  return (
    <div
      className="rounded-xl border transition-all cursor-pointer"
      style={{
        borderColor: expanded ? color + '40' : color + '20',
        background: expanded ? color + '10' : color + '06',
      }}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="text-lg flex-shrink-0">{dim.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">{dim.label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: color + '20', color }}>
              {LEVEL_LABEL[dim.level]}
            </span>
          </div>
          {/* Score bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background: '#ffffff08' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${dim.score}%`, background: color }} />
            </div>
            <span className="text-xs font-mono flex-shrink-0" style={{ color }}>{dim.score}</span>
          </div>
        </div>
        <span className="text-gray-600 text-xs">{expanded ? '▲' : '▾'}</span>
      </div>

      {/* Expanded signals */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.04] pt-2.5">
          {dim.signals.slice(0, 8).map((s, i) => {
            const sigColor = s.weight === 'positive' ? '#10B981' : s.weight === 'critical' ? '#EF4444' : s.weight === 'negative' ? '#F59E0B' : '#6B7280'
            const sigIcon  = s.weight === 'positive' ? '✓' : s.weight === 'critical' ? '✕' : s.weight === 'negative' ? '⚠' : '·'
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: sigColor, fontSize: 10 }}>{sigIcon}</span>
                <span className="text-gray-400 leading-relaxed">{s.text}</span>
              </div>
            )
          })}
          {negSignals.length === 0 && (
            <div className="text-xs text-gray-600">All signals clear in this dimension.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Full health score panel ──────────────────────────────────────────────────

export function HealthScorePanel({ hs }: { hs: EntityHealthScore }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key)

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div className="flex items-center gap-4 rounded-2xl border p-4"
        style={{ borderColor: LEVEL_COLOR[hs.level] + '30', background: LEVEL_BG[hs.level] }}>
        <ScoreGauge score={hs.overall} level={hs.level} size={64} strokeWidth={6} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">Health Score</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: LEVEL_COLOR[hs.level] + '20', color: LEVEL_COLOR[hs.level] }}>
              {LEVEL_LABEL[hs.level]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{hs.summary}</p>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-2">
        {hs.dimensions.map(dim => (
          <DimensionPill
            key={dim.key}
            dim={dim}
            expanded={expanded === dim.key}
            onClick={() => toggle(dim.key)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Compact score badge (for graph nodes, selectors) ─────────────────────────

export function HealthBadge({ score, level }: { score: number; level: ScoreLevel }) {
  const color = LEVEL_COLOR[level]
  const icon  = level === 'good' ? '✓' : level === 'watch' ? '⚠' : '✕'
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded"
      style={{ background: color + '18', color, border: `1px solid ${color}25` }}
    >
      {icon} {score}
    </span>
  )
}
