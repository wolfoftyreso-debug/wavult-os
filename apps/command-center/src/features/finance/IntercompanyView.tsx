import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { INTERCOMPANY_ENTRIES, FINANCE_ENTITIES, type IntercompanyEntry } from './mockData'

type ICStatus = IntercompanyEntry['status']
type ICType = IntercompanyEntry['type']

const STATUS_CONFIG: Record<ICStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pågående',   color: '#F59E0B', bg: '#F59E0B15' },
  invoiced: { label: 'Fakturerad', color: '#3B82F6', bg: '#3B82F615' },
  settled:  { label: 'Reglerad',   color: '#10B981', bg: '#10B98115' },
}

const TYPE_CONFIG: Record<ICType, { label: string; icon: string }> = {
  management_fee: { label: 'Management Fee',   icon: '🏛️' },
  ip_license:     { label: 'IP-licensavgift',  icon: '💡' },
  loan:           { label: 'Koncernlån',       icon: '🏦' },
  service:        { label: 'Serviceavgift',    icon: '🔧' },
}

function fmt(n: number, currency: string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${currency}`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k ${currency}`
  return `${n.toLocaleString()} ${currency}`
}

function entityShortName(id: string) {
  return FINANCE_ENTITIES.find(e => e.id === id)?.shortName ?? id
}

function entityColor(id: string) {
  return FINANCE_ENTITIES.find(e => e.id === id)?.color ?? '#6B7280'
}

export function IntercompanyView() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const filtered = INTERCOMPANY_ENTRIES.filter(
    ic => isRoot || scopedIds.has(ic.fromEntityId) || scopedIds.has(ic.toEntityId)
  )

  // Group by type
  const byType: Record<ICType, IntercompanyEntry[]> = {
    management_fee: [],
    ip_license: [],
    loan: [],
    service: [],
  }
  filtered.forEach(ic => byType[ic.type].push(ic))

  // Netting view: per entity pair, net the pending/invoiced amounts
  type NetPair = {
    fromId: string
    toId: string
    netAmount: number
    currency: string
    count: number
  }
  const nettingMap = new Map<string, NetPair>()
  filtered
    .filter(ic => ic.status !== 'settled')
    .forEach(ic => {
      const key = [ic.fromEntityId, ic.toEntityId, ic.currency].sort().join('|')
      const existing = nettingMap.get(key)
      if (existing) {
        existing.netAmount += ic.amount
        existing.count += 1
      } else {
        nettingMap.set(key, {
          fromId: ic.fromEntityId,
          toId: ic.toEntityId,
          netAmount: ic.amount,
          currency: ic.currency,
          count: 1,
        })
      }
    })
  const nettingEntries = Array.from(nettingMap.values())

  const pendingCount = filtered.filter(ic => ic.status !== 'settled').length
  const totalPendingByCurrency = filtered
    .filter(ic => ic.status !== 'settled')
    .reduce<Record<string, number>>((acc, ic) => {
      acc[ic.currency] = (acc[ic.currency] ?? 0) + ic.amount
      return acc
    }, {})

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">Intercompany</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">Mellanhavanden mellan Wavult-bolagen</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Totalt', value: filtered.length, color: '#ffffff', icon: '↔️' },
          { label: 'Pågående', value: pendingCount, color: '#F59E0B', icon: '⏳' },
          { label: 'Reglerade', value: filtered.filter(ic => ic.status === 'settled').length, color: '#10B981', icon: '✅' },
          { label: 'Fakturerade', value: filtered.filter(ic => ic.status === 'invoiced').length, color: '#3B82F6', icon: '📄' },
        ] as const).map(s => (
          <div key={s.label} className="rounded-xl p-4 border text-center"
            style={{ background: (s.color === '#ffffff' ? '#ffffff' : s.color) + '08', borderColor: (s.color === '#ffffff' ? '#ffffff' : s.color) + '20' }}>
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Netting view */}
      {nettingEntries.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/05 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 flex items-center gap-2">
            <span className="text-amber-400 text-sm">⚖️</span>
            <span className="text-[12px] font-semibold text-amber-300">Nettning-vy</span>
            <span className="text-[9px] text-amber-600/70 ml-2">Utestående mellanhavanden per valuta</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-2">
              {nettingEntries.map((pair, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: entityColor(pair.fromId) }} />
                    <span className="text-[11px] text-white font-semibold">{entityShortName(pair.fromId)}</span>
                  </div>
                  <span className="text-gray-500 text-sm">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: entityColor(pair.toId) }} />
                    <span className="text-[11px] text-white font-semibold">{entityShortName(pair.toId)}</span>
                  </div>
                  <span className="ml-auto text-[12px] font-bold text-amber-400 font-mono">{fmt(pair.netAmount, pair.currency)}</span>
                  <span className="text-[9px] text-gray-600 font-mono">{pair.count} poster</span>
                </div>
              ))}
            </div>

            {/* Currency totals */}
            {Object.entries(totalPendingByCurrency).length > 0 && (
              <div className="mt-3 flex gap-3 flex-wrap">
                <span className="text-[9px] text-gray-600 font-mono uppercase self-center">Total utestående:</span>
                {Object.entries(totalPendingByCurrency).map(([cur, amount]) => (
                  <span key={cur} className="text-[11px] font-bold font-mono text-amber-300">
                    {fmt(amount, cur)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All entries by type */}
      {(Object.entries(byType) as [ICType, IntercompanyEntry[]][]).map(([type, entries]) => {
        if (entries.length === 0) return null
        const typeInfo = TYPE_CONFIG[type]
        return (
          <div key={type} className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <span>{typeInfo.icon}</span>
              <span className="text-[12px] font-semibold text-white">{typeInfo.label}</span>
              <span className="text-[9px] font-mono text-gray-600 ml-1">{entries.length} poster</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {entries.map(ic => {
                const st = STATUS_CONFIG[ic.status]
                return (
                  <div key={ic.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    {/* Flow */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: entityColor(ic.fromEntityId) }} />
                        <span className="text-[11px] text-white font-semibold truncate">{entityShortName(ic.fromEntityId)}</span>
                      </div>
                      <span className="text-gray-600 text-sm flex-shrink-0">→</span>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: entityColor(ic.toEntityId) }} />
                        <span className="text-[11px] text-white font-semibold truncate">{entityShortName(ic.toEntityId)}</span>
                      </div>
                    </div>
                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-300 truncate">{ic.description}</p>
                      <p className="text-[9px] text-gray-600 font-mono mt-0.5">{ic.date}</p>
                    </div>
                    {/* Amount */}
                    <span className="text-[12px] font-bold font-mono text-white flex-shrink-0">{fmt(ic.amount, ic.currency)}</span>
                    {/* Status */}
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
