import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { ACCOUNTS, FINANCE_ENTITIES, type Account, type EntityId } from './mockData'

const GROUPS = ['1xxx Tillgångar', '2xxx Skulder & Eget kapital', '3xxx Intäkter', '4-7xxx Kostnader']

const TYPE_COLOR: Record<Account['type'], string> = {
  asset: '#3B82F6',
  liability: '#F59E0B',
  equity: '#8B5CF6',
  revenue: '#10B981',
  expense: '#EF4444',
}

const TYPE_LABEL: Record<Account['type'], string> = {
  asset: 'Tillgång',
  liability: 'Skuld',
  equity: 'Eget kapital',
  revenue: 'Intäkt',
  expense: 'Kostnad',
}

function fmt(n: number, currency: string) {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(2)}M ${currency}`
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(1)}k ${currency}`
  return `${prefix}${abs.toFixed(0)} ${currency}`
}

export function ChartOfAccounts() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUPS))
  const [entityFilter, setEntityFilter] = useState<EntityId | 'all'>('all')

  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const filteredAccounts = ACCOUNTS.filter(a => {
    const inScope = isRoot || scopedIds.has(a.entityId)
    const inEntity = entityFilter === 'all' || a.entityId === entityFilter
    return inScope && inEntity
  })

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  const availableEntities = FINANCE_ENTITIES.filter(
    fe => isRoot || scopedIds.has(fe.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Kontoplan</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">BAS-kontoplan — Wavult Group</p>
        </div>
        {/* Entity filter */}
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value as EntityId | 'all')}
          className="text-[11px] bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
        >
          <option value="all">Alla bolag</option>
          {availableEntities.map(fe => (
            <option key={fe.id} value={fe.id}>{fe.shortName}</option>
          ))}
        </select>
      </div>

      {/* Account groups */}
      {GROUPS.map(group => {
        const groupAccounts = filteredAccounts.filter(a => a.group === group)
        if (groupAccounts.length === 0) return null
        const isExpanded = expandedGroups.has(group)
        const total = groupAccounts.reduce((s, a) => s + a.balance, 0)

        return (
          <div key={group} className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
            >
              <span className="text-base">{isExpanded ? '▾' : '▸'}</span>
              <span className="text-[13px] font-semibold text-white flex-1">{group}</span>
              <span className="text-[10px] font-mono text-gray-500">{groupAccounts.length} konton</span>
              <span className="text-[11px] font-mono ml-4"
                style={{ color: total < 0 ? '#EF4444' : '#10B981' }}>
                {fmt(total, groupAccounts[0]?.currency ?? '')}
              </span>
            </button>

            {/* Accounts */}
            {isExpanded && (
              <div className="border-t border-white/[0.06]">
                {/* Table header */}
                <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider border-b border-white/[0.04]">
                  <span className="col-span-1">Konto</span>
                  <span className="col-span-4">Benämning</span>
                  <span className="col-span-2">Typ</span>
                  <span className="col-span-2">Bolag</span>
                  <span className="col-span-2">Valuta</span>
                  <span className="col-span-1 text-right">Saldo</span>
                </div>

                {groupAccounts.map(account => {
                  const fe = FINANCE_ENTITIES.find(e => e.id === account.entityId)
                  const typeColor = TYPE_COLOR[account.type]
                  return (
                    <div
                      key={account.id}
                      className="grid grid-cols-12 px-4 py-2.5 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="col-span-1 text-[11px] font-mono text-gray-400">{account.number}</span>
                      <span className="col-span-4 text-[12px] text-white">{account.name}</span>
                      <span className="col-span-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ color: typeColor, background: typeColor + '15' }}>
                          {TYPE_LABEL[account.type]}
                        </span>
                      </span>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe?.color }} />
                        <span className="text-[10px] text-gray-500 font-mono truncate">{fe?.shortName}</span>
                      </div>
                      <span className="col-span-2 text-[10px] font-mono text-gray-500">{account.currency}</span>
                      <span className="col-span-1 text-right text-[12px] font-mono font-semibold"
                        style={{ color: account.balance < 0 ? '#EF4444' : '#10B981' }}>
                        {fmt(account.balance, account.currency)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
