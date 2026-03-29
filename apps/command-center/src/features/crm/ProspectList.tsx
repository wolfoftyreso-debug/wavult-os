import { useState } from 'react'
import {
  PROSPECTS,
  ACTIVITIES,
  STAGE_COLORS,
  PRODUCT_COLORS,
  TEAM_COLORS,
  ACTIVITY_ICONS,
  formatSEK,
  daysSince,
  type CRMStage,
  type CRMProduct,
  type Prospect,
  type TeamMember,
} from './data'
import { useTranslation } from '../../shared/i18n/useTranslation'

const STAGES: Array<CRMStage | 'Alla'> = ['Alla', 'Lead', 'Kvalificerad', 'Demo/Möte', 'Offert', 'Förhandling', 'Vunnen', 'Förlorad']
const PRODUCTS: Array<CRMProduct | 'Alla'> = ['Alla', 'quiXzoom', 'Landvex', 'Hypbit']
const ASSIGNEES: Array<TeamMember | 'Alla'> = ['Alla', 'Leon', 'Dennis', 'Erik']

export function ProspectList() {
  const { t: _t } = useTranslation() // ready for i18n
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<CRMStage | 'Alla'>('Alla')
  const [productFilter, setProductFilter] = useState<CRMProduct | 'Alla'>('Alla')
  const [assigneeFilter, setAssigneeFilter] = useState<TeamMember | 'Alla'>('Alla')
  const [selected, setSelected] = useState<Prospect | null>(null)

  const filtered = PROSPECTS.filter(p => {
    const matchSearch =
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.contactName.toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'Alla' || p.stage === stageFilter
    const matchProduct = productFilter === 'Alla' || p.product === productFilter
    const matchAssignee = assigneeFilter === 'Alla' || p.assignee === assigneeFilter
    return matchSearch && matchStage && matchProduct && matchAssignee
  })

  const prospectActivities = selected
    ? ACTIVITIES.filter(a => a.prospectId === selected.id).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    : []

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 0 }}>
      {/* Main table */}
      <div className={`flex flex-col gap-4 ${selected ? 'flex-1 min-w-0' : 'w-full'}`}>
        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök företag eller kontakt..."
              className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:border-gray-300 w-60"
            />
            <span className="text-xs text-gray-500 ml-auto">
              {filtered.length} prospects · {formatSEK(filtered.reduce((s, p) => s + p.valueSEK, 0))} total
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => setStageFilter(s as CRMStage | 'Alla')}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  stageFilter === s
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'bg-surface-raised border border-surface-border text-gray-500 hover:text-gray-900'
                }`}
              >
                {s}
              </button>
            ))}
            <div className="w-px bg-surface-border mx-1" />
            {PRODUCTS.filter(p => p !== 'Alla').map(p => (
              <button
                key={p}
                onClick={() => setProductFilter(prev => prev === p ? 'Alla' : p as CRMProduct)}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={
                  productFilter === p
                    ? { background: PRODUCT_COLORS[p as CRMProduct] + '20', color: PRODUCT_COLORS[p as CRMProduct], border: `1px solid ${PRODUCT_COLORS[p as CRMProduct]}40` }
                    : { background: 'transparent', border: '1px solid rgba(55,65,81,0.6)', color: '#6B7280' }
                }
              >
                {p}
              </button>
            ))}
            <div className="w-px bg-surface-border mx-1" />
            {ASSIGNEES.filter(a => a !== 'Alla').map(a => (
              <button
                key={a}
                onClick={() => setAssigneeFilter(prev => prev === a ? 'Alla' : a as TeamMember)}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={
                  assigneeFilter === a
                    ? { background: TEAM_COLORS[a as TeamMember] + '20', color: TEAM_COLORS[a as TeamMember], border: `1px solid ${TEAM_COLORS[a as TeamMember]}40` }
                    : { background: 'transparent', border: '1px solid rgba(55,65,81,0.6)', color: '#6B7280' }
                }
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-xl border border-surface-border">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-raised">
                {['Företag', 'Kontakt', 'Produkt', 'Stage', 'Värde/år', 'Senaste aktivitet', 'Ansvarig'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(prev => prev?.id === p.id ? null : p)}
                  className={`border-b border-surface-border/50 cursor-pointer transition-colors hover:bg-surface-overlay ${
                    selected?.id === p.id ? 'bg-purple-50 border-l-2 border-l-brand-accent' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{p.company}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.contactName}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: PRODUCT_COLORS[p.product] + '20', color: PRODUCT_COLORS[p.product] }}
                    >
                      {p.product}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: STAGE_COLORS[p.stage] + '20', color: STAGE_COLORS[p.stage] }}
                    >
                      {p.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-semibold tabular-nums">{formatSEK(p.valueSEK)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {daysSince(p.lastActivity) === 0 ? 'Idag' : `${daysSince(p.lastActivity)}d sedan`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: TEAM_COLORS[p.assignee] + '20', color: TEAM_COLORS[p.assignee] }}
                    >
                      {p.assignee}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Inga prospects matchar filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-surface-raised border border-surface-border rounded-xl flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-4 border-b border-surface-border">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900">{selected.company}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selected.contactName}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-gray-900 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: STAGE_COLORS[selected.stage] + '20', color: STAGE_COLORS[selected.stage] }}
              >
                {selected.stage}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: PRODUCT_COLORS[selected.product] + '20', color: PRODUCT_COLORS[selected.product] }}
              >
                {selected.product}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: TEAM_COLORS[selected.assignee] + '20', color: TEAM_COLORS[selected.assignee] }}
              >
                {selected.assignee}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 py-3 border-b border-surface-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Värde</span>
              <span className="text-gray-900 font-bold">{formatSEK(selected.valueSEK)}/år</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Dagar i stage</span>
              <span className="text-gray-900">{selected.daysInStage}d</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Senaste aktivitet</span>
              <span className="text-gray-900">{daysSince(selected.lastActivity)}d sedan</span>
            </div>
            {selected.notes && (
              <p className="text-xs text-gray-500 italic pt-1">{selected.notes}</p>
            )}
            <div className="pt-1">
              <p className="text-xs text-gray-500">Nästa steg</p>
              <p className="text-xs text-gray-900 mt-0.5">{selected.nextStep}</p>
            </div>
          </div>

          {/* Activity log */}
          <div className="flex-1 overflow-auto px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Aktivitetslogg ({prospectActivities.length})
            </p>
            {prospectActivities.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Inga aktiviteter loggade</p>
            ) : (
              <div className="space-y-3">
                {prospectActivities.map(a => (
                  <div key={a.id} className="flex gap-2.5">
                    <span className="text-base leading-none mt-0.5 flex-shrink-0">{ACTIVITY_ICONS[a.type]}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-900">{a.type}</span>
                        <span className="text-xs text-gray-500">·</span>
                        <span className="text-xs text-gray-500">{a.by}</span>
                        <span className="text-xs text-gray-600 ml-auto">{new Date(a.date).toLocaleDateString('sv-SE')}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{a.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
