import { useState } from 'react'
import { ENTITIES } from '../org-graph/data'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useTranslation } from '../../shared/i18n/useTranslation'

const FLAG_MAP: Record<string, string> = {
  Dubai: '🇦🇪', 'EU-LT': '🇱🇹', 'US-DE': '🇺🇸', 'US-TX': '🇺🇸', SE: '🇸🇪', Global: '🌐',
}

export function EntitySwitcher() {
  const { t: _t } = useTranslation() // ready for i18n
  const { activeEntity, setActiveEntity } = useEntityScope()
  const [open, setOpen] = useState(false)

  // Sort entities by layer then name for hierarchy display
  const sorted = [...ENTITIES].sort((a, b) => a.layer - b.layer || a.name.localeCompare(b.name))

  const statusDot: Record<string, string> = { live: '#10B981', forming: '#F59E0B', planned: '#6B7280' }

  return (
    <div className="relative" data-tour="entity-switcher">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 transition-colors text-left"
      >
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0"
          style={{ backgroundColor: activeEntity.color }}
        >
          {activeEntity.flag}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{activeEntity.shortName}</p>
          <p className="text-[9px] text-gray-500 font-mono">{activeEntity.jurisdiction} · L{activeEntity.layer}</p>
        </div>
        <span className="text-gray-500 text-[9px]">{open ? '▲' : '▼'}</span>
        <Tooltip
          content="Välj vilket bolag du vill titta på. 'Group' visar hela koncernen samlat. Alla moduler — Finance, Legal, People — filtreras automatiskt per valt bolag."
          title="Bolagsväxlaren"
          asIcon
          position="right"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.15em]">Wavult Group Entities</p>
          </div>
          {sorted.map((entity) => {
            const isActive = entity.id === activeEntity.id
            const dot = statusDot[entity.active_status]
            return (
              <button
                key={entity.id}
                onClick={() => { setActiveEntity(entity); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${
                  isActive ? 'bg-gray-50' : ''
                }`}
              >
                {/* Layer indent as left padding */}
                {entity.layer > 0 && (
                  <span
                    className="text-gray-800 text-[9px] font-mono flex-shrink-0"
                    style={{ width: entity.layer * 12 }}
                  >
                    {'└─'}
                  </span>
                )}
                <span className="text-sm flex-shrink-0">{entity.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-gray-900 truncate">{entity.shortName}</p>
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
                  </div>
                  <p className="text-[9px] text-gray-500 font-mono truncate">
                    {FLAG_MAP[entity.jurisdiction] ?? ''} {entity.jurisdiction}
                  </p>
                </div>
                {isActive && (
                  <span className="text-[9px] font-mono flex-shrink-0" style={{ color: entity.color }}>●</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
