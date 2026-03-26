import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { LEDGER_ENTRIES, FINANCE_ENTITIES, type EntityId, type Currency } from './mockData'

function fmt(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function exportCSV(rows: typeof LEDGER_ENTRIES) {
  const header = 'Datum,Ref,Beskrivning,Konto,Kontonamn,Debet,Kredit,Saldo,Bolag,Valuta'
  const lines = rows.map(r =>
    [r.date, r.refNr, `"${r.description}"`, r.accountNumber, `"${r.accountName}"`,
      r.debit || '', r.credit || '', r.balance, r.entityId, r.currency].join(',')
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

  const [entityFilter, setEntityFilter] = useState<EntityId | 'all'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [accountFilter, setAccountFilter] = useState('')

  const baseEntries = LEDGER_ENTRIES.filter(e => isRoot || scopedIds.has(e.entityId))

  const filtered = baseEntries.filter(e => {
    if (entityFilter !== 'all' && e.entityId !== entityFilter) return false
    if (currencyFilter !== 'all' && e.currency !== currencyFilter) return false
    if (dateFrom && e.date < dateFrom) return false
    if (dateTo && e.date > dateTo) return false
    if (accountFilter && !e.accountNumber.includes(accountFilter) && !e.accountName.toLowerCase().includes(accountFilter.toLowerCase())) return false
    return true
  })

  const availableEntities = FINANCE_ENTITIES.filter(fe => isRoot || scopedIds.has(fe.id))

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0)
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0)

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">Huvudbok</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Dubbel bokföring — debet/kredit per transaktion</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white text-[11px] transition-colors"
        >
          <span>↓</span> Exportera CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap flex-shrink-0">
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
        <select
          value={currencyFilter}
          onChange={e => setCurrencyFilter(e.target.value as Currency | 'all')}
          className="text-[11px] bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
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
          className="text-[11px] bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none w-36"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          placeholder="Till datum"
          className="text-[11px] bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none w-36"
        />
        <input
          type="text"
          value={accountFilter}
          onChange={e => setAccountFilter(e.target.value)}
          placeholder="Sök konto..."
          className="text-[11px] bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white placeholder-gray-700 font-mono focus:outline-none w-36"
        />
      </div>

      {/* Summary */}
      <div className="flex gap-4 flex-shrink-0">
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[9px] text-gray-600 font-mono uppercase">Poster</span>
          <span className="ml-2 text-[12px] font-bold text-white">{filtered.length}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[9px] text-gray-600 font-mono uppercase">Total Debet</span>
          <span className="ml-2 text-[12px] font-bold text-blue-400">{fmt(totalDebit)}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[9px] text-gray-600 font-mono uppercase">Total Kredit</span>
          <span className="ml-2 text-[12px] font-bold text-green-400">{fmt(totalCredit)}</span>
        </div>
      </div>

      {/* Ledger table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden flex-1">
        {/* Header */}
        <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider border-b border-white/[0.06] sticky top-0 bg-[#0D0F1A]">
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
        <div className="overflow-y-auto max-h-[500px]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-700 text-[12px]">
              Inga poster matchar filtret
            </div>
          ) : (
            filtered.map(entry => {
              const fe = FINANCE_ENTITIES.find(e => e.id === entry.entityId)
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 px-4 py-2.5 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="col-span-1 text-[10px] font-mono text-gray-500">{entry.date.slice(5)}</span>
                  <span className="col-span-1 text-[9px] font-mono text-gray-600 truncate">{entry.refNr}</span>
                  <span className="col-span-3 text-[11px] text-white truncate">{entry.description}</span>
                  <div className="col-span-2">
                    <span className="text-[10px] font-mono text-gray-400">{entry.accountNumber}</span>
                    <span className="text-[9px] text-gray-600 ml-1 truncate">{entry.accountName}</span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe?.color }} />
                    <span className="text-[9px] font-mono text-gray-600 truncate">{fe?.shortName?.split(' ')[0]}</span>
                  </div>
                  <span className="col-span-1 text-right text-[11px] font-mono text-blue-400">
                    {entry.debit > 0 ? fmt(entry.debit) : ''}
                  </span>
                  <span className="col-span-1 text-right text-[11px] font-mono text-green-400">
                    {entry.credit > 0 ? fmt(entry.credit) : ''}
                  </span>
                  <span className="col-span-2 text-right text-[11px] font-mono font-semibold"
                    style={{ color: entry.balance < 0 ? '#EF4444' : '#10B981' }}>
                    {fmt(entry.balance)} <span className="text-[9px] text-gray-600">{entry.currency}</span>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
