import {
  MODULE_REGISTRY,
  MATURITY_COLORS,
  MATURITY_DESCRIPTION,
  MATURITY_BG,
} from './maturityModel'
import { MaturityBadge } from './MaturityBadge'

interface ModuleHeaderProps {
  moduleId: string
}

export function ModuleHeader({ moduleId }: ModuleHeaderProps) {
  const mod = MODULE_REGISTRY.find(m => m.id === moduleId)
  if (!mod) return null

  const color = MATURITY_COLORS[mod.level]
  const bg = MATURITY_BG[mod.level]
  const description = MATURITY_DESCRIPTION[mod.level]

  const livePreview = mod.liveFeatures.slice(0, 3).join(', ')
  const hasMore = mod.liveFeatures.length > 3

  return (
    <div
      className="flex items-start gap-4 px-5 py-3 border-b"
      style={{
        background: `${bg}CC`,
        borderColor: `${color}22`,
      }}
    >
      {/* Icon + name */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xl leading-none flex-shrink-0">{mod.icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{mod.name}</span>
            <MaturityBadge level={mod.level} size="md" />
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#FFFFFF0A', color: '#6B7280' }}
            >
              Fas {mod.phase}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-500 font-mono">{description}</span>
            {mod.dataSource === 'mock' && (
              <span className="text-[9px] font-mono text-amber-600/70">· mockdata</span>
            )}
            {mod.dataSource === 'partial' && (
              <span className="text-[9px] font-mono text-blue-500/60">· delvis live</span>
            )}
            {mod.dataSource === 'live' && (
              <span className="text-[9px] font-mono text-green-500/60">· live data</span>
            )}
          </div>
        </div>
      </div>

      {/* Live features preview */}
      {mod.liveFeatures.length > 0 && (
        <div className="ml-auto flex-shrink-0 text-right hidden md:block">
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mb-0.5">
            Live-features
          </div>
          <div className="text-xs text-gray-400">
            {livePreview}{hasMore ? `… +${mod.liveFeatures.length - 3}` : ''}
          </div>
        </div>
      )}

      {mod.liveFeatures.length === 0 && (
        <div className="ml-auto flex-shrink-0 text-right hidden md:block">
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mb-0.5">
            Live-features
          </div>
          <div className="text-xs text-gray-600 italic">Inga aktiva ännu</div>
        </div>
      )}

      {/* Notes */}
      {mod.notes && (
        <div
          className="text-[9px] font-mono px-2 py-1 rounded flex-shrink-0 hidden lg:block"
          style={{ background: `${color}11`, color: `${color}BB` }}
        >
          {mod.notes}
        </div>
      )}
    </div>
  )
}
