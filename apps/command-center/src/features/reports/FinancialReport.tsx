import { useState } from 'react'
import { ENTITY_FINANCIALS, EntityFinancials } from './data'

type Period = 'month' | 'quarter' | 'year'
type Month = 'jan'|'feb'|'mar'|'apr'|'may'|'jun'|'jul'|'aug'|'sep'|'oct'|'nov'|'dec'
const MONTHS: Month[] = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
const MONTH_LABELS: Record<Month, string> = {
  jan:'Jan', feb:'Feb', mar:'Mar', apr:'Apr', may:'Maj', jun:'Jun',
  jul:'Jul', aug:'Aug', sep:'Sep', oct:'Okt', nov:'Nov', dec:'Dec',
}
const QUARTERS: Array<{ label: string; months: Month[] }> = [
  { label: 'Q1', months: ['jan','feb','mar'] },
  { label: 'Q2', months: ['apr','may','jun'] },
  { label: 'Q3', months: ['jul','aug','sep'] },
  { label: 'Q4', months: ['oct','nov','dec'] },
]

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} MSEK`
  if (n >= 1_000)     return `${Math.round(n / 1_000)} kSEK`
  return `${n} SEK`
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${Math.round(n / 1_000)}k`
  return `${n}`
}

function sumRevenue(e: EntityFinancials, months: Month[]): number {
  return months.reduce((s, m) => s + e.revenue[m], 0)
}
function sumExpenses(e: EntityFinancials, months: Month[]): number {
  return months.reduce((s, m) => s + e.expenses[m], 0)
}

function PLTable({ entity, months }: { entity: EntityFinancials; months: Month[] }) {
  const revenue  = sumRevenue(entity, months)
  const expenses = sumExpenses(entity, months)
  const result   = revenue - expenses
  const margin   = revenue > 0 ? ((result / revenue) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: entity.color }} />
        <span className="text-xs font-bold text-white">{entity.shortName}</span>
        <span className="text-[9px] text-gray-600 font-mono ml-1">{entity.country}</span>
      </div>
      <div className="p-4 space-y-2">
        {/* P&L */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Intäkter</span>
            <span className="text-green-400 font-mono">{fmt(revenue)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Kostnader</span>
            <span className="text-red-400 font-mono">-{fmt(expenses)}</span>
          </div>
          <div className="h-px bg-white/[0.08] my-2" />
          <div className="flex justify-between text-xs font-bold">
            <span className="text-white">Resultat</span>
            <span className={result >= 0 ? 'text-green-400' : 'text-red-400'} style={{ fontFamily: 'monospace' }}>
              {result >= 0 ? '+' : ''}{fmt(result)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Marginal</span>
            <span className={`font-mono ${parseFloat(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}%</span>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
          <p className="text-[9px] text-gray-600 uppercase font-mono tracking-wider mb-1.5">Balansräkning</p>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Tillgångar</span>
            <span className="text-gray-300 font-mono">{fmt(entity.assets)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Skulder</span>
            <span className="text-gray-300 font-mono">{fmt(entity.liabilities)}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-gray-400">Eget kapital</span>
            <span className="font-mono" style={{ color: entity.color }}>{fmt(entity.equity)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniBarChart({ entity, months }: { entity: EntityFinancials; months: Month[] }) {
  const maxVal = Math.max(
    ...months.map(m => Math.max(entity.revenue[m], entity.expenses[m]))
  )
  return (
    <div className="flex items-end gap-1 h-16 mt-2">
      {months.map(m => {
        const rev = entity.revenue[m]
        const exp = entity.expenses[m]
        const rh = maxVal > 0 ? (rev / maxVal) * 100 : 0
        const eh = maxVal > 0 ? (exp / maxVal) * 100 : 0
        return (
          <div key={m} className="flex items-end gap-0.5 flex-1" title={`${MONTH_LABELS[m]}: Intäkt ${fmtCompact(rev)}, Kostnad ${fmtCompact(exp)}`}>
            <div className="flex-1 bg-green-500/50 rounded-t-sm" style={{ height: `${rh}%`, minHeight: '2px' }} />
            <div className="flex-1 bg-red-500/40 rounded-t-sm" style={{ height: `${eh}%`, minHeight: '2px' }} />
          </div>
        )
      })}
    </div>
  )
}

export function FinancialReport() {
  const [period, setPeriod]   = useState<Period>('month')
  const [monthIdx, setMonthIdx] = useState<number>(2)   // March (0-indexed)
  const [quarterIdx, setQuarterIdx] = useState<number>(0) // Q1
  const [entityId, setEntityId] = useState<string>('wavult-group')

  const activeMonths: Month[] = period === 'month'
    ? [MONTHS[monthIdx]]
    : period === 'quarter'
    ? QUARTERS[quarterIdx].months
    : MONTHS

  const selectedEntities = entityId === 'all'
    ? ENTITY_FINANCIALS
    : ENTITY_FINANCIALS.filter(e => e.id === entityId)

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period toggle */}
        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-xs">
          {(['month','quarter','year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 transition-colors ${period === p ? 'bg-brand-accent/20 text-brand-accent' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {p === 'month' ? 'Månad' : p === 'quarter' ? 'Kvartal' : 'År'}
            </button>
          ))}
        </div>

        {/* Month picker */}
        {period === 'month' && (
          <select
            value={monthIdx}
            onChange={e => setMonthIdx(Number(e.target.value))}
            className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{MONTH_LABELS[m]} 2026</option>)}
          </select>
        )}

        {/* Quarter picker */}
        {period === 'quarter' && (
          <select
            value={quarterIdx}
            onChange={e => setQuarterIdx(Number(e.target.value))}
            className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none"
          >
            {QUARTERS.map((q, i) => <option key={q.label} value={i}>{q.label} 2026</option>)}
          </select>
        )}

        {/* Entity picker */}
        <select
          value={entityId}
          onChange={e => setEntityId(e.target.value)}
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none ml-auto"
        >
          <option value="wavult-group">Wavult Group (konsoliderat)</option>
          <option value="all">Alla entiteter</option>
          {ENTITY_FINANCIALS.slice(1).map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Summary bar */}
      {entityId === 'wavult-group' && (() => {
        const g = ENTITY_FINANCIALS[0]
        const rev = sumRevenue(g, activeMonths)
        const exp = sumExpenses(g, activeMonths)
        const res = rev - exp
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 font-mono uppercase mb-1">Intäkter</p>
              <p className="text-2xl font-black text-green-400">{fmt(rev)}</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 font-mono uppercase mb-1">Kostnader</p>
              <p className="text-2xl font-black text-red-400">{fmt(exp)}</p>
            </div>
            <div className={`${res >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'} border rounded-xl p-4 text-center`}>
              <p className="text-xs text-gray-500 font-mono uppercase mb-1">Resultat</p>
              <p className={`text-2xl font-black ${res >= 0 ? 'text-green-400' : 'text-red-400'}`}>{res >= 0 ? '+' : ''}{fmt(res)}</p>
            </div>
          </div>
        )
      })()}

      {/* Monthly sparklines (full year) */}
      {period === 'year' && entityId !== 'all' && (() => {
        const entity = ENTITY_FINANCIALS.find(e => e.id === entityId) ?? ENTITY_FINANCIALS[0]
        return (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Intäkt (grön) vs Kostnad (röd) per månad</p>
            <MiniBarChart entity={entity} months={MONTHS} />
            <div className="flex mt-1">
              {MONTHS.map(m => (
                <div key={m} className="flex-1 text-center text-[8px] text-gray-700 font-mono">{MONTH_LABELS[m]}</div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* P&L cards */}
      <div className={`grid gap-4 ${selectedEntities.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {selectedEntities.map(e => (
          <PLTable key={e.id} entity={e} months={activeMonths} />
        ))}
      </div>
    </div>
  )
}
