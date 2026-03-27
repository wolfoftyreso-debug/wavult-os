import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MODULE_REGISTRY,
  MATURITY_COLORS,
  MATURITY_LABELS,
  MATURITY_DESCRIPTION,
  MATURITY_BG,
  MaturityLevel,
} from '../../shared/maturity/maturityModel'
import { MaturityBadge } from '../../shared/maturity/MaturityBadge'

const LEVEL_ORDER: MaturityLevel[] = ['enterprise', 'production', 'beta', 'alpha', 'skeleton']

function countByLevel(level: MaturityLevel) {
  return MODULE_REGISTRY.filter(m => m.level === level).length
}

function ModuleCard({ mod }: { mod: (typeof MODULE_REGISTRY)[0] }) {
  const navigate = useNavigate()
  const color = MATURITY_COLORS[mod.level]
  const bg = MATURITY_BG[mod.level]

  return (
    <button
      onClick={() => navigate(mod.path)}
      className="flex flex-col gap-2 p-4 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
      style={{
        background: `${bg}BB`,
        borderColor: `${color}33`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{mod.icon}</span>
          <span className="text-sm font-semibold text-white">{mod.name}</span>
        </div>
        <MaturityBadge level={mod.level} size="sm" />
      </div>

      {/* Live / mock counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 5, height: 5, background: '#22C55E', flexShrink: 0 }}
          />
          <span className="text-[10px] text-gray-400 font-mono">
            {mod.liveFeatures.length} live
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 5, height: 5, background: '#F59E0B', flexShrink: 0 }}
          />
          <span className="text-[10px] text-gray-500 font-mono">
            {mod.mockFeatures.length} mock
          </span>
        </div>
        <span className="text-[9px] font-mono text-gray-700 ml-auto">Fas {mod.phase}</span>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
        {MATURITY_DESCRIPTION[mod.level]}
      </p>

      {/* Data source indicator */}
      <div className="flex items-center gap-1 mt-auto">
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background:
              mod.dataSource === 'live' ? '#052e1666' :
              mod.dataSource === 'partial' ? '#0D1B3E66' :
              '#1C110766',
            color:
              mod.dataSource === 'live' ? '#34D399' :
              mod.dataSource === 'partial' ? '#60A5FA' :
              '#F59E0B',
          }}
        >
          {mod.dataSource === 'live' ? '● LIVE DATA' :
           mod.dataSource === 'partial' ? '◐ PARTIAL' :
           '○ MOCK DATA'}
        </span>
        <span className="text-[8px] text-gray-700 font-mono ml-auto">
          {mod.lastUpdated}
        </span>
      </div>
    </button>
  )
}

function LegendDot({ level }: { level: MaturityLevel }) {
  const color = MATURITY_COLORS[level]
  const label = MATURITY_LABELS[level]
  const count = countByLevel(level)
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded-full" style={{ width: 7, height: 7, background: color, flexShrink: 0 }} />
      <span className="text-[10px] font-mono" style={{ color }}>
        {label}
      </span>
      <span className="text-[9px] font-mono text-gray-700">×{count}</span>
    </div>
  )
}

export function SystemStatusView() {
  const total = MODULE_REGISTRY.length
  const betaCount = countByLevel('beta')
  const alphaCount = countByLevel('alpha')
  const skeletonCount = countByLevel('skeleton')
  const productionCount = countByLevel('production')
  const enterpriseCount = countByLevel('enterprise')

  // Sort modules by maturity level (best first)
  const sortedModules = [...MODULE_REGISTRY].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
  )

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white overflow-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">WAVULT OS — SYSTEMSTATUS</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {total} moduler
              {enterpriseCount > 0 && <> · <span style={{ color: MATURITY_COLORS.enterprise }}>{enterpriseCount} ENTERPRISE</span></>}
              {productionCount > 0 && <> · <span style={{ color: MATURITY_COLORS.production }}>{productionCount} PRODUCTION</span></>}
              {betaCount > 0 && <> · <span style={{ color: MATURITY_COLORS.beta }}>{betaCount} BETA</span></>}
              {alphaCount > 0 && <> · <span style={{ color: MATURITY_COLORS.alpha }}>{alphaCount} ALPHA</span></>}
              {skeletonCount > 0 && <> · <span style={{ color: MATURITY_COLORS.skeleton }}>{skeletonCount} SKELETON</span></>}
            </p>
          </div>

          {/* Overall health bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">Systemhälsa</span>
            <div className="flex gap-0.5 items-center">
              {sortedModules.map(m => (
                <div
                  key={m.id}
                  className="rounded-sm"
                  style={{
                    width: 8,
                    height: 20,
                    background: MATURITY_COLORS[m.level],
                    opacity: 0.8,
                  }}
                  title={`${m.name}: ${MATURITY_LABELS[m.level]}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {sortedModules.map(mod => (
            <ModuleCard key={mod.id} mod={mod} />
          ))}
        </div>
      </div>

      {/* Legend footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">LEGEND</span>
          <div className="flex-1 border-t border-white/[0.04]" />
        </div>
        <div className="flex flex-wrap gap-4">
          {LEVEL_ORDER.map(level => (
            <LegendDot key={level} level={level} />
          ))}
        </div>
      </div>
    </div>
  )
}
