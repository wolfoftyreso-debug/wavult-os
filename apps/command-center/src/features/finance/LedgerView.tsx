import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useFinanceLedger, useFinanceEntities } from './hooks/useFinance'
import type { FinanceLedgerEntry } from '../../lib/supabase'

type Currency = 'SEK' | 'EUR' | 'USD' | 'AED'

function fmt(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function exportCSV(rows: FinanceLedgerEntry[]) {
  const header = 'Datum,Ref,Beskrivning,Konto,Kontonamn,Debet,Kredit,Saldo,Bolag,Valuta'
  const lines = rows.map(r =>
    [r.date, r.ref_nr, `"${r.description}"`, r.account_nr, `"${r.account_name}"`,
      r.debit || '', r.credit || '', r.balance, r.entity_id, r.currency].join(',')
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ledger-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function LedgerView() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [accountFilter, setAccountFilter] = useState('')

  const { data: entities = [], isLoading: entitiesLoading } = useFinanceEntities()
  const { data: allEntries = [], isLoading: ledgerLoading, isError } = useFinanceLedger()

  const availableEntities = isRoot
    ? entities
    : entities.filter(e => scopedIds.has(e.id))

  const baseEntries = isRoot
    ? allEntries
    : allEntries.filter(e => scopedIds.has(e.entity_id))

  const filtered = baseEntries.filter(e => {
    if (entityFilter !== 'all' && e.entity_id !== entityFilter) return false
    if (currencyFilter !== 'all' && e.currency !== currencyFilter) return false
    if (dateFrom && e.date < dateFrom) return false
    if (dateTo && e.date > dateTo) return false
    if (accountFilter && !e.account_nr?.includes(accountFilter) && !e.account_name?.toLowerCase().includes(accountFilter.toLowerCase())) return false
    return true
  })

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0)
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0)

  const isLoading = entitiesLoading || ledgerLoading

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">Huvudbok</h2>
          <p className="text-xs text-gray-500 mt-0.5">Dubbel bokföring — debet/kredit per transaktion</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white text-xs transition-colors"
        >
          <span>↓</span> Exportera CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap flex-shrink-0 overflow-x-auto pb-1">
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
        <select
          value={currencyFilter}
          onChange={e => setCurrencyFilter(e.target.value as Currency | 'all')}
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
        >
          <option value="all">Alla valutor</option>
          {(['SEK', 'EUR', 'USD', 'AED'] as Currency[]).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          placeholder="Från datum"
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none w-36"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          placeholder="Till datum"
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none w-36"
        />
        <input
          type="text"
          value={accountFilter}
          onChange={e => setAccountFilter(e.target.value)}
          placeholder="Sök konto..."
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white placeholder-gray-700 font-mono focus:outline-none w-36"
        />
      </div>

      {/* Summary */}
      <div className="flex gap-4 flex-shrink-0">
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[9px] text-gray-600 font-mono uppercase">Poster</span>
          <span className="ml-2 text-xs font-bold text-white">{filtered.length}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[9px] text-gray-600 font-mono uppercase">Total Debet</span>
          <span className="ml-2 text-xs font-bold text-blue-400">{fmt(totalDebit)}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[9px] text-gray-600 font-mono uppercase">Total Kredit</span>
          <span className="ml-2 text-xs font-bold text-green-400">{fmt(totalCredit)}</span>
        </div>
      </div>

      {/* Ledger table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden flex-1">
        <div className="overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider border-b border-white/[0.06] sticky top-0 bg-[#0D0F1A] min-w-[600px]">
          <span className="col-span-1">Datum</span>
          <span className="col-span-1">Ref</span>
          <span className="col-span-3">Beskrivning</span>
          <span className="col-span-2">Konto</span>
          <span className="col-span-1">Bolag</span>
          <span className="col-span-1 text-right">Debet</span>
          <span className="col-span-1 text-right">Kredit</span>
          <span className="col-span-2 text-right">Saldo</span>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto max-h-[500px] min-w-[600px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-600 text-xs">
              Laddar...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12 text-red-500 text-xs">
              Fel vid hämtning av data
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-700 text-xs">
              Inga poster matchar filtret
            </div>
          ) : (
            filtered.map(entry => {
              const fe = entities.find(e => e.id === entry.entity_id)
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 px-4 py-2.5 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="col-span-1 text-xs font-mono text-gray-500">{entry.date.slice(5)}</span>
                  <span className="col-span-1 text-[9px] font-mono text-gray-600 truncate">{entry.ref_nr}</span>
                  <span className="col-span-3 text-xs text-white truncate">{entry.description}</span>
                  <div className="col-span-2">
                    <span className="text-xs font-mono text-gray-400">{entry.account_nr}</span>
                    <span className="text-[9px] text-gray-600 ml-1 truncate">{entry.account_name}</span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe?.color }} />
                    <span className="text-[9px] font-mono text-gray-600 truncate">{fe?.short_name?.split(' ')[0]}</span>
                  </div>
                  <span className="col-span-1 text-right text-xs font-mono text-blue-400">
                    {entry.debit > 0 ? fmt(entry.debit) : ''}
                  </span>
                  <span className="col-span-1 text-right text-xs font-mono text-green-400">
                    {entry.credit > 0 ? fmt(entry.credit) : ''}
                  </span>
                  <span className="col-span-2 text-right text-xs font-mono font-semibold"
                    style={{ color: entry.balance < 0 ? '#EF4444' : '#10B981' }}>
                    {fmt(entry.balance)} <span className="text-[9px] text-gray-600">{entry.currency}</span>
                  </span>
                </div>
              )
            })
          )}
        </div>
        </div>{/* /overflow-x-auto */}
      </div>
    </div>
  )
}
