import { useState, useMemo } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { JURISDICTIONS, type JurisdictionRule } from './jurisdictionData'

// Entity-to-jurisdiction mapping
// entity_ids in jurisdictionData use short numeric ids — map to actual entity ids
const ENTITY_JURISDICTION_MAP: Record<string, string[]> = {
  'wavult-group':   ['se', 'ae_difc', 'lt', 'us_de', 'us_tx'], // root sees all
  'finance-co':     ['ae_difc'],
  'devops-co':      ['se'],
  'quixzoom-uab':   ['lt'],
  'quixzoom-inc':   ['us_de'],
  'landvex-ab':     ['se', 'ae_difc'],
  'landvex-inc':    ['us_tx'],
}

const CATEGORY_LABELS: Record<string, string> = {
  skatt: 'Skatt',
  bolagsrätt: 'Bolagsrätt',
  arbetsrätt: 'Arbetsrätt',
  dataskydd: 'Dataskydd',
  rapportering: 'Rapportering',
  licens: 'Licens',
}

const STATUS_CONFIG = {
  uppfyllt:      { label: '✓ Uppfyllt',      color: '#2D7A4F', bg: '#E8F5ED' },
  pågår:         { label: '⟳ Pågår',         color: '#B8760A', bg: '#FDF3E0' },
  gap:           { label: '⚠ Gap',           color: '#C0392B', bg: '#FDECEA' },
  ej_tillämplig: { label: '— Ej tillämplig', color: '#8A8278', bg: '#F5F0E8' },
}

const PRIORITY_CONFIG = {
  hög:   { color: '#C0392B' },
  medel: { color: '#B8760A' },
  låg:   { color: '#8A8278' },
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function formatDate(s?: string): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RuleCard({ rule }: { rule: JurisdictionRule }) {
  const st = STATUS_CONFIG[rule.status]
  const pr = PRIORITY_CONFIG[rule.priority]
  const daysLeft = rule.deadline ? daysUntil(rule.deadline) : null
  const isUrgent = daysLeft !== null && daysLeft <= 30 && rule.status === 'gap'

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isUrgent ? 'border-[#C0392B]/40 bg-[#FDECEA]' : 'border-[#DDD5C5] bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F5F0E8] text-[#5A5245] uppercase tracking-wider">
              {CATEGORY_LABELS[rule.category]}
            </span>
            <span className="text-[10px] font-bold" style={{ color: pr.color }}>● {rule.priority}</span>
          </div>
          <h3 className="text-sm font-bold text-[#0A3D62]">{rule.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-gray-400">📋 {rule.authority}</span>
            {rule.frequency && <span className="text-[10px] text-gray-400">🔄 {rule.frequency}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: st.bg, color: st.color }}
          >
            {st.label}
          </span>
          {rule.deadline && (
            <div className="text-right">
              <div className={`text-[10px] font-mono ${daysLeft !== null && daysLeft <= 30 ? 'text-[#C0392B] font-bold' : 'text-gray-400'}`}>
                {formatDate(rule.deadline)}
              </div>
              {daysLeft !== null && daysLeft <= 60 && (
                <div className={`text-[10px] font-bold ${daysLeft <= 14 ? 'text-[#C0392B]' : 'text-[#B8760A]'}`}>
                  {daysLeft > 0 ? `${daysLeft}d kvar` : 'FÖRFALLEN'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function JurisdictionView() {
  const { activeEntity } = useEntityScope()
  const isRoot = !activeEntity.ownedBy

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('alla')
  const [filterStatus, setFilterStatus] = useState<string>('alla')

  const visibleJurisdictions = useMemo(() => {
    if (isRoot) return JURISDICTIONS
    const allowed = ENTITY_JURISDICTION_MAP[activeEntity.id] ?? []
    return JURISDICTIONS.filter(j => allowed.includes(j.id))
  }, [isRoot, activeEntity.id])

  // Auto-select first jurisdiction
  const effectiveSelectedId = selectedId && visibleJurisdictions.find(j => j.id === selectedId)
    ? selectedId
    : visibleJurisdictions[0]?.id ?? null

  const selected = visibleJurisdictions.find(j => j.id === effectiveSelectedId) ?? null

  const filteredRules = useMemo(() => {
    if (!selected) return []
    return selected.rules.filter(r => {
      if (filterCategory !== 'alla' && r.category !== filterCategory) return false
      if (filterStatus !== 'alla' && r.status !== filterStatus) return false
      return true
    })
  }, [selected, filterCategory, filterStatus])

  const totalGaps = visibleJurisdictions.reduce((s, j) => s + j.gaps.length, 0)
  const totalRules = visibleJurisdictions.reduce((s, j) => s + j.rules.length, 0)
  const urgentItems = visibleJurisdictions
    .flatMap(j => j.rules)
    .filter(r => r.deadline && daysUntil(r.deadline) <= 30 && r.status !== 'uppfyllt')

  return (
    <div className="flex flex-col h-full bg-[#F5F0E8]">

      {/* Header — CREAM, inte navy */}
      <div className="px-6 py-5 border-b border-[#DDD5C5] bg-[#FDFAF5] flex-shrink-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#0A3D62]">🌍 Legal Boundary Intelligence</h1>
            <p className="text-xs text-gray-500 mt-1">
              Regulatorisk kartläggning — {visibleJurisdictions.length} jurisdiktioner, {totalRules} regler
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#DDD5C5] shadow-sm">
              <span className="text-[#0A3D62] font-bold text-sm">{visibleJurisdictions.length}</span>
              <span className="text-gray-500">marknader</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#DDD5C5] shadow-sm">
              <span className="text-[#2D7A4F] font-bold text-sm">{totalRules}</span>
              <span className="text-gray-500">regler totalt</span>
            </div>
            {totalGaps > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDECEA] border border-[#C0392B]/30 shadow-sm">
                <span className="text-[#C0392B] font-bold text-sm">{totalGaps}</span>
                <span className="text-[#C0392B]">gaps</span>
              </div>
            )}
            {urgentItems.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDF3E0] border border-[#B8760A]/30 shadow-sm">
                <span className="text-[#B8760A] font-bold text-sm">{urgentItems.length}</span>
                <span className="text-[#B8760A]">brådskande (30d)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — jurisdiktion-lista */}
        <div className="w-56 flex-shrink-0 border-r border-[#DDD5C5] bg-[#FDFAF5] overflow-y-auto">
          {visibleJurisdictions.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              Inga jurisdiktioner för detta bolag
            </div>
          ) : (
            visibleJurisdictions.map(j => {
              const isSelected = effectiveSelectedId === j.id
              const gapCount = j.gaps.length
              return (
                <button
                  key={j.id}
                  onClick={() => setSelectedId(j.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#EDE8DC] text-left transition-colors ${
                    isSelected
                      ? 'bg-[#F5F0E8] border-l-2 border-l-[#E8B84B]'
                      : 'hover:bg-[#F5F0E8]'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{j.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-[#0A3D62]' : 'text-[#3A3530]'}`}>
                      {j.country}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{j.rules.length} regler</div>
                  </div>
                  {gapCount > 0 && (
                    <span className="text-[9px] font-bold bg-[#FDECEA] text-[#C0392B] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {gapCount}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-4xl mb-3">🌍</span>
              <h3 className="text-sm font-bold text-[#0A3D62]">Välj en jurisdiktion</h3>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Jurisdiktion-header */}
              <div className="rounded-2xl border border-[#DDD5C5] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{selected.flag}</span>
                      <h2 className="text-xl font-bold text-[#0A3D62]">{selected.country}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selected.key_authorities.map(a => (
                        <span key={a} className="px-2.5 py-1 bg-[#F5F0E8] text-[#5A5245] rounded-lg">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center p-3 bg-[#F5F0E8] rounded-xl">
                      <div className="text-sm font-bold text-[#0A3D62]">{selected.tax_rate_corporate}</div>
                      <div className="text-gray-500 mt-0.5">Bolagsskatt</div>
                    </div>
                    <div className="text-center p-3 bg-[#F5F0E8] rounded-xl">
                      <div className="text-sm font-bold text-[#0A3D62]">{selected.tax_rate_vat}</div>
                      <div className="text-gray-500 mt-0.5">Moms/VAT</div>
                    </div>
                  </div>
                </div>

                {/* Produkter */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {selected.products.map(p => (
                    <span
                      key={p}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0A3D62]/10 text-[#0A3D62]"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* Valuta */}
                <div className="mt-3 text-[10px] text-gray-400">
                  Valuta: <span className="font-mono font-bold text-[#0A3D62]">{selected.currency}</span>
                </div>
              </div>

              {/* Filter */}
              <div className="flex gap-3 flex-wrap items-center">
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs focus:outline-none focus:border-[#0A3D62]"
                >
                  <option value="alla">Alla kategorier</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs focus:outline-none focus:border-[#0A3D62]"
                >
                  <option value="alla">Alla status</option>
                  <option value="gap">⚠ Gaps</option>
                  <option value="pågår">⟳ Pågår</option>
                  <option value="uppfyllt">✓ Uppfyllt</option>
                  <option value="ej_tillämplig">— Ej tillämplig</option>
                </select>
                <div className="ml-auto text-xs text-gray-400 flex items-center">
                  {filteredRules.length} av {selected.rules.length} regler
                </div>
              </div>

              {/* Regler */}
              <div className="space-y-3">
                {filteredRules.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    Inga regler matchar filtret
                  </div>
                ) : (
                  filteredRules.map(rule => <RuleCard key={rule.id} rule={rule} />)
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
