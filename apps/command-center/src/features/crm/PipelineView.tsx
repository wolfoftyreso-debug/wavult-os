import { useState } from 'react'
import {
  PROSPECTS,
  STAGE_ORDER,
  STAGE_COLORS,
  PRODUCT_COLORS,
  TEAM_COLORS,
  formatSEK,
  type CRMStage,
  type CRMProduct,
  type Prospect,
  type TeamMember,
} from './data'

const STAGE_ACTIVE: CRMStage[] = ['Lead', 'Kvalificerad', 'Demo/Möte', 'Offert', 'Förhandling']
const STAGE_CLOSED: CRMStage[] = ['Vunnen', 'Förlorad']

const PRODUCTS: Array<CRMProduct | 'Alla'> = ['Alla', 'quiXzoom', 'Landvex', 'Hypbit']
const ASSIGNEES: Array<TeamMember | 'Alla'> = ['Alla', 'Leon', 'Dennis', 'Erik']

function DealCard({
  prospect,
  onMove,
}: {
  prospect: Prospect
  onMove: (id: string, stage: CRMStage) => void
}) {
  const stageIdx = STAGE_ORDER.indexOf(prospect.stage)
  const prevStage = stageIdx > 0 ? STAGE_ORDER[stageIdx - 1] : null
  const nextStage = stageIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[stageIdx + 1] : null

  return (
    <div className="bg-surface-overlay border border-surface-border rounded-xl p-3.5 flex flex-col gap-2.5 group hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{prospect.company}</p>
          <p className="text-xs text-gray-500 mt-0.5">{prospect.contactName}</p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          style={{ background: PRODUCT_COLORS[prospect.product] + '20', color: PRODUCT_COLORS[prospect.product] }}
        >
          {prospect.product}
        </span>
      </div>

      {/* Value */}
      <div className="text-base font-bold text-white tabular-nums">
        {formatSEK(prospect.valueSEK)}
        <span className="text-xs text-gray-500 font-normal ml-1">/år</span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>⏱ {prospect.daysInStage}d i stage</span>
        <span
          className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ml-auto"
          style={{
            background: TEAM_COLORS[prospect.assignee] + '22',
            color: TEAM_COLORS[prospect.assignee],
            border: `1px solid ${TEAM_COLORS[prospect.assignee]}40`,
          }}
          title={prospect.assignee}
        >
          {prospect.assignee[0]}
        </span>
      </div>

      {/* Next step */}
      <p className="text-xs text-gray-500 italic truncate" title={prospect.nextStep}>
        → {prospect.nextStep}
      </p>

      {/* Move buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
        {prevStage && (
          <button
            onClick={() => onMove(prospect.id, prevStage)}
            className="text-xs px-2 py-0.5 rounded bg-surface-base text-gray-400 hover:text-white transition-colors flex-1 truncate"
            title={`Flytta till ${prevStage}`}
          >
            ← {prevStage}
          </button>
        )}
        {nextStage && (
          <button
            onClick={() => onMove(prospect.id, nextStage)}
            className="text-xs px-2 py-0.5 rounded bg-surface-base text-gray-400 hover:text-white transition-colors flex-1 truncate"
            title={`Flytta till ${nextStage}`}
          >
            {nextStage} →
          </button>
        )}
      </div>
    </div>
  )
}

export function PipelineView() {
  const [prospects, setProspects] = useState<Prospect[]>(PROSPECTS)
  const [productFilter, setProductFilter] = useState<CRMProduct | 'Alla'>('Alla')
  const [assigneeFilter, setAssigneeFilter] = useState<TeamMember | 'Alla'>('Alla')

  const filtered = prospects.filter(p => {
    if (productFilter !== 'Alla' && p.product !== productFilter) return false
    if (assigneeFilter !== 'Alla' && p.assignee !== assigneeFilter) return false
    return true
  })

  const totalPipelineValue = filtered
    .filter(p => !['Vunnen', 'Förlorad'].includes(p.stage))
    .reduce((sum, p) => sum + p.valueSEK, 0)

  const wonValue = filtered
    .filter(p => p.stage === 'Vunnen')
    .reduce((sum, p) => sum + p.valueSEK, 0)

  function move(id: string, stage: CRMStage) {
    setProspects(prev =>
      prev.map(p => p.id === id ? { ...p, stage, daysInStage: 0 } : p)
    )
  }

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Pipeline</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Pipeline-värde: <span className="text-white font-semibold">{formatSEK(totalPipelineValue)}</span>
            <span className="ml-3">Vunnet: <span className="text-green-400 font-semibold">{formatSEK(wonValue)}</span></span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Product filter */}
          {PRODUCTS.map(p => (
            <button
              key={p}
              onClick={() => setProductFilter(p as CRMProduct | 'Alla')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                productFilter === p
                  ? 'text-white'
                  : 'bg-surface-raised border border-surface-border text-gray-400 hover:text-white'
              }`}
              style={productFilter === p && p !== 'Alla'
                ? { background: PRODUCT_COLORS[p as CRMProduct] + '22', border: `1px solid ${PRODUCT_COLORS[p as CRMProduct]}40`, color: PRODUCT_COLORS[p as CRMProduct] }
                : productFilter === p ? { background: '#374151', border: '1px solid #4B5563' }
                : {}}
            >
              {p}
            </button>
          ))}
          <div className="w-px bg-surface-border mx-1" />
          {/* Assignee filter */}
          {ASSIGNEES.map(a => (
            <button
              key={a}
              onClick={() => setAssigneeFilter(a as TeamMember | 'Alla')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                assigneeFilter === a
                  ? 'text-white'
                  : 'bg-surface-raised border border-surface-border text-gray-400 hover:text-white'
              }`}
              style={assigneeFilter === a && a !== 'Alla'
                ? { background: TEAM_COLORS[a as TeamMember] + '22', border: `1px solid ${TEAM_COLORS[a as TeamMember]}40`, color: TEAM_COLORS[a as TeamMember] }
                : assigneeFilter === a ? { background: '#374151', border: '1px solid #4B5563' }
                : {}}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Active stages kanban — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-2">
      <div className="grid grid-cols-5 gap-3 min-w-[700px] md:min-w-0 md:grid-cols-3 xl:grid-cols-5">
        {STAGE_ACTIVE.map(stage => {
          const cards = filtered.filter(p => p.stage === stage)
          const stageValue = cards.reduce((s, p) => s + p.valueSEK, 0)
          return (
            <div key={stage} className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[stage] }} />
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider truncate">{stage}</span>
                </div>
                <span
                  className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: STAGE_COLORS[stage] + '20', color: STAGE_COLORS[stage] }}
                >
                  {cards.length}
                </span>
              </div>
              {cards.length > 0 && (
                <p className="text-xs text-gray-600 px-1 tabular-nums">{formatSEK(stageValue)}</p>
              )}
              <div
                className="flex flex-col gap-2 min-h-24 p-2 rounded-xl"
                style={{ background: 'rgba(17,24,39,0.5)', border: '1px dashed rgba(55,65,81,0.6)' }}
              >
                {cards.map(p => (
                  <DealCard key={p.id} prospect={p} onMove={move} />
                ))}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-gray-700">Tom</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>{/* /overflow-x-auto */}

      {/* Closed stages */}
      <div className="grid grid-cols-2 gap-3">
        {STAGE_CLOSED.map(stage => {
          const cards = filtered.filter(p => p.stage === stage)
          const stageValue = cards.reduce((s, p) => s + p.valueSEK, 0)
          return (
            <div key={stage} className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[stage] }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: STAGE_COLORS[stage] }}>
                    {stage}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {cards.length > 0 && (
                    <span className="text-xs text-gray-600 tabular-nums">{formatSEK(stageValue)}</span>
                  )}
                  <span
                    className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full"
                    style={{ background: STAGE_COLORS[stage] + '20', color: STAGE_COLORS[stage] }}
                  >
                    {cards.length}
                  </span>
                </div>
              </div>
              <div
                className="flex flex-col gap-2 p-2 rounded-xl"
                style={{
                  background: 'rgba(17,24,39,0.3)',
                  border: '1px dashed rgba(55,65,81,0.4)',
                  opacity: stage === 'Förlorad' ? 0.6 : 1,
                }}
              >
                {cards.map(p => (
                  <DealCard key={p.id} prospect={p} onMove={move} />
                ))}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-12 text-xs text-gray-700">Tom</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-600 pt-1 border-t border-surface-border">
        Hover på ett kort för att flytta det mellan stages →
      </p>
    </div>
  )
}
