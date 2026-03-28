// ─── HealthOverviewWidget — all entities at a glance ─────────────────────────
// For Dashboard use. Shows all entity health scores in a compact grid.

import { useNavigate } from 'react-router-dom'
import { computeAllHealthScores } from './healthScore'
import { ScoreGauge, LEVEL_COLOR, LEVEL_LABEL } from './HealthScoreWidget'
import { ENTITIES } from '../org-graph/data'

export function HealthOverviewWidget() {
  const navigate = useNavigate()
  const scores = computeAllHealthScores()

  const critical = scores.filter(s => s.level === 'critical').length
  const watching = scores.filter(s => s.level === 'watch').length

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white/70">Entity Health</p>
          {critical > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-red-500/15 text-red-400 border border-red-500/20">
              {critical} critical
            </span>
          )}
          {watching > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
              {watching} watch
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/entities')}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Details →
        </button>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {scores.map(hs => {
          const entity = ENTITIES.find(e => e.id === hs.entity_id)
          if (!entity) return null
          const color = LEVEL_COLOR[hs.level]

          // Find worst signal
          const worstDim = [...hs.dimensions].sort((a, b) => a.score - b.score)[0]

          return (
            <button
              key={hs.entity_id}
              onClick={() => navigate(`/entities/${hs.entity_id}`)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
            >
              {/* Gauge */}
              <div className="flex-shrink-0">
                <ScoreGauge score={hs.overall} level={hs.level} size={38} strokeWidth={4} />
              </div>

              {/* Entity info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{entity.flag}</span>
                  <span className="text-xs font-semibold text-white">{entity.shortName}</span>
                  <span className="text-xs px-1 py-0.5 rounded font-mono"
                    style={{ color, background: color + '18' }}>
                    {LEVEL_LABEL[hs.level]}
                  </span>
                </div>
                <div className="text-xs text-gray-600 truncate mt-0.5">{hs.summary.slice(2, 60)}…</div>
              </div>

              {/* Dimension mini-bars */}
              <div className="flex-shrink-0 flex items-end gap-1 h-6">
                {hs.dimensions.map(d => (
                  <div key={d.key} className="flex flex-col items-center gap-0.5" title={`${d.label}: ${d.score}`}>
                    <div
                      className="w-3 rounded-sm transition-all"
                      style={{
                        height: Math.max(4, Math.round(d.score / 100 * 20)),
                        background: LEVEL_COLOR[d.level],
                        opacity: 0.8,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Worst dim alert */}
              {worstDim.level !== 'good' && (
                <div className="flex-shrink-0 text-lg" title={`${worstDim.label}: ${worstDim.score}`}>
                  {worstDim.icon}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
