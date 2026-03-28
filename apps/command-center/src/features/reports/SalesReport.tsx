import { useState } from 'react'
import { PIPELINE_DEALS, SALES_ACTIVITIES, PipelineDeal } from './data'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MSEK`
  if (n >= 1_000)     return `${Math.round(n / 1_000)} kSEK`
  return `${n}`
}

const STAGE_ORDER: PipelineDeal['stage'][] = [
  'Prospekt', 'Kvalificerad', 'Demo', 'Förhandling', 'Stängd-Vann', 'Stängd-Förlorad'
]
const STAGE_COLOR: Record<string, string> = {
  'Prospekt':          '#6B7280',
  'Kvalificerad':      '#3B82F6',
  'Demo':              '#F59E0B',
  'Förhandling':       '#8B5CF6',
  'Stängd-Vann':       '#10B981',
  'Stängd-Förlorad':   '#EF4444',
}
const PRODUCT_COLOR: Record<string, string> = {
  'Optical Insight':  '#FF6B35',
  'QuixZoom':         '#00C2FF',
  'Hypbit OS':        '#4CAF50',
  'Quixom Ads':       '#FF4081',
}

function PipelineBar() {
  const stages = STAGE_ORDER.filter(s => s !== 'Stängd-Förlorad')
  const counts: Record<string, number> = {}
  const values: Record<string, number> = {}
  stages.forEach(s => { counts[s] = 0; values[s] = 0 })
  PIPELINE_DEALS.forEach(d => {
    if (d.stage in counts) {
      counts[d.stage]++
      values[d.stage] += d.value
    }
  })
  const total = stages.reduce((s, st) => s + values[st], 0)

  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
        {stages.map(s => {
          const pct = total > 0 ? (values[s] / total) * 100 : 0
          return (
            <div
              key={s}
              style={{ width: `${pct}%`, background: STAGE_COLOR[s] }}
              className="transition-all duration-300"
              title={`${s}: ${fmt(values[s])}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {stages.map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLOR[s] }} />
            <span className="text-xs text-gray-400">{s}</span>
            <span className="text-xs text-gray-600 font-mono">({counts[s]})</span>
            <span className="text-xs font-mono" style={{ color: STAGE_COLOR[s] }}>{fmt(values[s])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WinRateCard() {
  const won  = PIPELINE_DEALS.filter(d => d.stage === 'Stängd-Vann').length
  const lost = PIPELINE_DEALS.filter(d => d.stage === 'Stängd-Förlorad').length
  const total = won + lost
  const rate  = total > 0 ? Math.round((won / total) * 100) : 0

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 text-center">
      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Win Rate</p>
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1d2e" strokeWidth="3.5" />
          <circle
            cx="18" cy="18" r="15.9"
            fill="none"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeDasharray={`${rate} ${100 - rate}`}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-white">{rate}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500">{won} vann / {lost} förlorade</p>
    </div>
  )
}

function ARRByProduct() {
  const products: Record<string, number> = {}
  PIPELINE_DEALS
    .filter(d => d.stage === 'Stängd-Vann')
    .forEach(d => { products[d.product] = (products[d.product] ?? 0) + d.value })

  const max = Math.max(...Object.values(products), 1)

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <p className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-widest">ARR per produkt (stängda)</p>
      <div className="space-y-2.5">
        {Object.entries(products).map(([prod, val]) => (
          <div key={prod}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">{prod}</span>
              <span className="font-mono" style={{ color: PRODUCT_COLOR[prod] ?? '#6B7280' }}>{fmt(val)}</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(val / max) * 100}%`, background: PRODUCT_COLOR[prod] ?? '#6B7280' }}
              />
            </div>
          </div>
        ))}
        {Object.keys(products).length === 0 && (
          <p className="text-xs text-gray-600">Inga stängda affärer ännu</p>
        )}
      </div>
    </div>
  )
}

function ActivityTable() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Aktiviteter per säljare</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {['Säljare','Samtal','Mail','Möten','Demos','Vann','Förlorade','Pipeline'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs text-gray-600 font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SALES_ACTIVITIES.map((a, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 text-white font-medium">{a.owner}</td>
                <td className="px-3 py-2.5 text-gray-400 font-mono">{a.calls}</td>
                <td className="px-3 py-2.5 text-gray-400 font-mono">{a.emails}</td>
                <td className="px-3 py-2.5 text-gray-400 font-mono">{a.meetings}</td>
                <td className="px-3 py-2.5 text-gray-400 font-mono">{a.demos}</td>
                <td className="px-3 py-2.5 text-green-400 font-mono font-bold">{a.closedWon}</td>
                <td className="px-3 py-2.5 text-red-400 font-mono">{a.closedLost}</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: a.revenue > 0 ? '#10B981' : '#6B7280' }}>
                  {a.revenue > 0 ? fmt(a.revenue) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DealsTable({ filter }: { filter: string }) {
  const deals = filter === 'all'
    ? PIPELINE_DEALS
    : PIPELINE_DEALS.filter(d => d.stage === filter)

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Deal','Produkt','Värde','Sannolikhet','Ansvarig','Stängs'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs text-gray-600 font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: STAGE_COLOR[d.stage] }} />
                    <div>
                      <p className="text-white font-medium leading-tight">{d.name}</p>
                      <p className="text-[9px] text-gray-600">{d.stage}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: (PRODUCT_COLOR[d.product] ?? '#6B7280') + '20', color: PRODUCT_COLOR[d.product] ?? '#6B7280' }}>
                    {d.product}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-white font-mono font-bold">{fmt(d.value)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-16 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${d.probability}%`, background: d.probability >= 70 ? '#10B981' : d.probability >= 40 ? '#F59E0B' : '#6B7280' }}
                      />
                    </div>
                    <span className="text-gray-400 font-mono">{d.probability}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-gray-400">{d.owner}</td>
                <td className="px-3 py-2.5 text-gray-500 font-mono">{d.expectedClose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SalesReport() {
  const [stageFilter, setStageFilter] = useState<string>('all')

  const totalPipeline = PIPELINE_DEALS
    .filter(d => d.stage !== 'Stängd-Förlorad')
    .reduce((s, d) => s + d.value, 0)

  const weightedPipeline = PIPELINE_DEALS
    .filter(d => d.stage !== 'Stängd-Förlorad' && d.stage !== 'Stängd-Vann')
    .reduce((s, d) => s + d.value * (d.probability / 100), 0)

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Total pipeline</p>
          <p className="text-xl font-black text-white">{fmt(totalPipeline)}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Viktat värde</p>
          <p className="text-xl font-black text-[#6C63FF]">{fmt(weightedPipeline)}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Aktiva deals</p>
          <p className="text-xl font-black text-white">{PIPELINE_DEALS.filter(d => d.stage !== 'Stängd-Vann' && d.stage !== 'Stängd-Förlorad').length}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Stängda (vann)</p>
          <p className="text-xl font-black text-green-400">{PIPELINE_DEALS.filter(d => d.stage === 'Stängd-Vann').length}</p>
        </div>
      </div>

      {/* Pipeline bar */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Pipeline-konvertering</p>
        <PipelineBar />
      </div>

      {/* Win rate + ARR by product */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WinRateCard />
        <div className="md:col-span-2">
          <ARRByProduct />
        </div>
      </div>

      {/* Activity table */}
      <ActivityTable />

      {/* Deals table */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest flex-1">Alla deals</p>
          <div className="flex gap-1">
            {['all', ...STAGE_ORDER].map(s => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  stageFilter === s
                    ? 'bg-white/10 text-white'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
                style={stageFilter === s && s !== 'all' ? { background: STAGE_COLOR[s] + '25', color: STAGE_COLOR[s] } : {}}
              >
                {s === 'all' ? 'Alla' : s}
              </button>
            ))}
          </div>
        </div>
        <DealsTable filter={stageFilter} />
      </div>
    </div>
  )
}
