import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useFinanceAccounts, useFinanceEntities } from './hooks/useFinance'
import type { FinanceAccount } from '../../lib/supabase'

const GROUPS = ['1xxx Tillgångar', '2xxx Skulder & Eget kapital', '3xxx Intäkter', '4-7xxx Kostnader']

const TYPE_COLOR: Record<FinanceAccount['type'], string> = {
  asset: '#3B82F6',
  liability: '#F59E0B',
  equity: '#8B5CF6',
  revenue: '#10B981',
  expense: '#EF4444',
}

const TYPE_LABEL: Record<FinanceAccount['type'], string> = {
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
  const [entityFilter, setEntityFilter] = useState<string>('all')

  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const { data: entities = [], isLoading: entitiesLoading } = useFinanceEntities()
  const { data: accounts = [], isLoading: accountsLoading } = useFinanceAccounts(
    entityFilter !== 'all' ? entityFilter : undefined
  )

  const filteredAccounts = accounts.filter(a => {
    const inScope = isRoot || scopedIds.has(a.entity_id)
    return inScope
  })

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  const availableEntities = entities.filter(
    fe => isRoot || scopedIds.has(fe.id)
  )

  const isLoading = entitiesLoading || accountsLoading

  return (
    <div className="space-y-4">
      {/* Explanatory ingress */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="font-semibold text-white">Vad är en kontoplan?</span>{' '}
          En kontoplan är bokföringens "adressbok" — varje konto har ett nummer och ett syfte.
          Sverige använder <span className="text-blue-400 font-mono">BAS-kontoplanen</span>:{' '}
          <span className="text-blue-400">1xxx</span> = tillgångar (vad bolaget äger),{' '}
          <span className="text-amber-400">2xxx</span> = skulder &amp; eget kapital (vad bolaget är skyldigt),{' '}
          <span className="text-emerald-400">3xxx</span> = intäkter (försäljning),{' '}
          <span className="text-red-400">4–7xxx</span> = kostnader (löner, hyra, material m.m.).
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Kontoplan</h2>
          <p className="text-xs text-gray-500 mt-0.5">BAS-kontoplan — Wavult Group</p>
        </div>
        {/* Entity filter */}
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
        >
          <option value="all">Alla bolag</option>
          {availableEntities.map(fe => (
            <option key={fe.id} value={fe.id}>{fe.short_name}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-600 text-xs">
          Laddar kontoplan...
        </div>
      )}

      {/* Account groups */}
      {!isLoading && GROUPS.map(group => {
        const groupAccounts = filteredAccounts.filter(a => a.group_name === group)
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
              <span className="text-sm font-semibold text-white flex-1">{group}</span>
              <span className="text-xs font-mono text-gray-500">{groupAccounts.length} konton</span>
              <span className="text-xs font-mono ml-4"
                style={{ color: total < 0 ? '#EF4444' : '#10B981' }}>
                {fmt(total, groupAccounts[0]?.currency ?? '')}
              </span>
            </button>

            {/* Accounts */}
            {isExpanded && (
              <div className="border-t border-white/[0.06] overflow-x-auto">
                {/* Table header */}
                <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider border-b border-white/[0.04] min-w-[500px]">
                  <span className="col-span-1">Konto</span>
                  <span className="col-span-4">Benämning</span>
                  <span className="col-span-2">Typ</span>
                  <span className="col-span-2">Bolag</span>
                  <span className="col-span-2">Valuta</span>
                  <span className="col-span-1 text-right">Saldo</span>
                </div>

                {groupAccounts.map(account => {
                  const fe = entities.find(e => e.id === account.entity_id)
                  const typeColor = TYPE_COLOR[account.type]
                  return (
                    <div
                      key={account.id}
                      className="grid grid-cols-12 px-4 py-2.5 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors min-w-[500px]"
                    >
                      <span className="col-span-1 text-xs font-mono text-gray-400">{account.account_nr}</span>
                      <span className="col-span-4 text-xs text-white">{account.name}</span>
                      <span className="col-span-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ color: typeColor, background: typeColor + '15' }}>
                          {TYPE_LABEL[account.type]}
                        </span>
                      </span>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe?.color }} />
                        <span className="text-xs text-gray-500 font-mono truncate">{fe?.short_name}</span>
                      </div>
                      <span className="col-span-2 text-xs font-mono text-gray-500">{account.currency}</span>
                      <span className="col-span-1 text-right text-xs font-mono font-semibold"
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
