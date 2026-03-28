import { useState } from 'react'

// ─── Types & constants ──────────────────────────────────────────────────────

interface Entity {
  id: string
  name: string
  jurisdiction: string
  currency: 'USD' | 'EUR' | 'SEK'
  taxRate: number
  eurRate: number   // 1 unit of currency = X EUR
  defaultRevenue: number
  color: string
}

const ENTITIES: Entity[] = [
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    jurisdiction: 'Delaware, USA',
    currency: 'USD',
    taxRate: 0.21,
    eurRate: 0.93,
    defaultRevenue: 40000,
    color: '#3B82F6',
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    jurisdiction: 'Vilnius, LT',
    currency: 'EUR',
    taxRate: 0.15,
    eurRate: 1.0,
    defaultRevenue: 35000,
    color: '#8B5CF6',
  },
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    jurisdiction: 'Stockholm, SE',
    currency: 'SEK',
    taxRate: 0.206,
    eurRate: 0.091,
    defaultRevenue: 220000,
    color: '#F59E0B',
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc',
    jurisdiction: 'Houston, TX',
    currency: 'USD',
    taxRate: 0.21,
    eurRate: 0.93,
    defaultRevenue: 28000,
    color: '#10B981',
  },
]

const OPTIMAL_RATE = { min: 0.08, max: 0.15, recommended: 0.12 }
const MGMT_FEE_RATE = 0.15

function fmtEur(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`
  return `€${n.toFixed(0)}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CashFlowOptimizer() {
  const [revenues, setRevenues] = useState<Record<string, number>>(
    Object.fromEntries(ENTITIES.map(e => [e.id, e.defaultRevenue]))
  )
  const [licenseRate, setLicenseRate] = useState(OPTIMAL_RATE.recommended)
  const [showDetails, setShowDetails] = useState<string | null>(null)

  // Calculations per entity
  const entityCalcs = ENTITIES.map(e => {
    const rev = revenues[e.id] ?? e.defaultRevenue
    const revEur = rev * e.eurRate
    const licenseFee = rev * licenseRate
    const licenseFeeEur = licenseFee * e.eurRate
    const mgmtFee = rev * MGMT_FEE_RATE
    const mgmtFeeEur = mgmtFee * e.eurRate
    const totalOutEur = licenseFeeEur + mgmtFeeEur
    const taxableProfit = Math.max(0, rev - licenseFee - mgmtFee) * 0.2 // assume 80% cost ratio
    const taxPaid = taxableProfit * e.taxRate
    const taxPaidEur = taxPaid * e.eurRate

    // If kept locally (no Dubai structure)
    const taxWithoutDubaiEur = revEur * 0.2 * e.taxRate

    const taxSavedEur = taxWithoutDubaiEur - taxPaidEur

    return { entity: e, rev, revEur, licenseFee, licenseFeeEur, mgmtFee, mgmtFeeEur, totalOutEur, taxableProfit, taxPaid, taxPaidEur, taxWithoutDubaiEur, taxSavedEur }
  })

  const totalDubaiMonthly = entityCalcs.reduce((s, c) => s + c.licenseFeeEur + c.mgmtFeeEur, 0)
  const totalTaxSavedMonthly = entityCalcs.reduce((s, c) => s + c.taxSavedEur, 0)
  const totalTaxPaidMonthly = entityCalcs.reduce((s, c) => s + c.taxPaidEur, 0)
  const runwayExtra = totalDubaiMonthly * 12 // annual Dubai accumulation = extra runway

  const rateColor = licenseRate < OPTIMAL_RATE.min
    ? '#EF4444'
    : licenseRate > OPTIMAL_RATE.max
    ? '#F59E0B'
    : '#10B981'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">⚡ Cashflow-optimering</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Simulera licensstruktur och se skatteeffekt per entitet och Dubai-ackumulering
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Dubai/mån',
            value: fmtEur(totalDubaiMonthly),
            sub: 'License + mgmt fees',
            color: '#10B981',
            icon: '🇦🇪',
          },
          {
            label: 'Dubai/år',
            value: fmtEur(totalDubaiMonthly * 12),
            sub: 'Ackumulerat i Dubai',
            color: '#10B981',
            icon: '📈',
          },
          {
            label: 'Skatt sparad/mån',
            value: fmtEur(totalTaxSavedMonthly),
            sub: 'vs. ingen Dubai-struktur',
            color: '#3B82F6',
            icon: '💰',
          },
          {
            label: 'Runway-boost',
            value: fmtEur(runwayExtra),
            sub: 'Extra kapital/år i Dubai',
            color: '#8B5CF6',
            icon: '🚀',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="rounded-xl border p-4 text-center"
            style={{ background: kpi.color + '10', borderColor: kpi.color + '25' }}
          >
            <span className="text-xl">{kpi.icon}</span>
            <p className="text-[20px] font-bold mt-1 font-mono" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">{kpi.label}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* License rate slider */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">License Rate Simulator</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Justera licensavgiftsprocenten och se effekten i realtid
            </p>
          </div>
          <div className="text-right">
            <span
              className="text-[22px] font-bold font-mono"
              style={{ color: rateColor }}
            >
              {(licenseRate * 100).toFixed(1)}%
            </span>
            <p className="text-[9px] font-mono mt-0.5" style={{ color: rateColor }}>
              {licenseRate < OPTIMAL_RATE.min
                ? '⚠️ Under arm\'s length-minimum'
                : licenseRate > OPTIMAL_RATE.max
                ? '⚠️ Över arm\'s length-maximum'
                : '✅ Inom arm\'s length-intervall'}
            </p>
          </div>
        </div>
        <input
          type="range"
          min={0.01}
          max={0.30}
          step={0.005}
          value={licenseRate}
          onChange={e => setLicenseRate(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1">
          <span>1%</span>
          <span className="text-emerald-600">← Arm's length: 8–15% →</span>
          <span>30%</span>
        </div>
        {/* OECD markers */}
        <div className="relative h-2 mt-1">
          <div
            className="absolute h-full rounded bg-emerald-500/20 border-x border-emerald-500/40"
            style={{ left: `${(0.08 / 0.30) * 100}%`, width: `${((0.15 - 0.08) / 0.30) * 100}%` }}
          />
        </div>
      </div>

      {/* Entity revenue sliders */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Omsättning per bolag</p>
        {ENTITIES.map(e => {
          const rev = revenues[e.id] ?? e.defaultRevenue
          const calc = entityCalcs.find(c => c.entity.id === e.id)!
          return (
            <div key={e.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                  <span className="text-xs font-semibold text-white">{e.name}</span>
                  <span className="text-[9px] text-gray-600 font-mono">{e.jurisdiction}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs font-mono text-white">
                    {rev.toLocaleString()} {e.currency}
                  </span>
                  <button
                    className="text-[9px] text-gray-600 hover:text-gray-400 font-mono"
                    onClick={() => setShowDetails(showDetails === e.id ? null : e.id)}
                  >
                    {showDetails === e.id ? '▲ dölj' : '▼ detaljer'}
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={1000}
                max={e.currency === 'SEK' ? 2000000 : 200000}
                step={e.currency === 'SEK' ? 5000 : 1000}
                value={rev}
                onChange={ev => setRevenues(prev => ({ ...prev, [e.id]: Number(ev.target.value) }))}
                className="w-full"
                style={{ accentColor: e.color }}
              />
              <div className="flex justify-between text-[9px] text-gray-700 font-mono mt-0.5">
                <span>License fee: <span className="text-white">{calc.licenseFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} {e.currency}</span></span>
                <span>Mgmt fee: <span className="text-white">{calc.mgmtFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} {e.currency}</span></span>
                <span>Skatt: <span className="text-red-400">{calc.taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} {e.currency}</span></span>
              </div>
              {showDetails === e.id && (
                <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Omsättning', value: `${rev.toLocaleString()} ${e.currency}` },
                    { label: '≈ EUR', value: fmtEur(calc.revEur) },
                    { label: `License fee (${(licenseRate * 100).toFixed(1)}%)`, value: `${calc.licenseFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${e.currency}` },
                    { label: 'Mgmt fee (15%)', value: `${calc.mgmtFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${e.currency}` },
                    { label: 'Lokal beskattningsbar vinst', value: `${calc.taxableProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${e.currency}` },
                    { label: `Lokal skatt (${(e.taxRate * 100).toFixed(1)}%)`, value: `${calc.taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${e.currency}` },
                    { label: 'Skatt utan Dubai-struktur', value: fmtEur(calc.taxWithoutDubaiEur) },
                    { label: 'Skattebesparning', value: fmtEur(calc.taxSavedEur), highlight: true },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between gap-2">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-mono font-semibold ${row.highlight ? 'text-emerald-400' : 'text-white'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dubai accumulation timeline */}
      <div className="rounded-xl border border-emerald-500/20 bg-[#0D0F1A] p-5">
        <p className="text-sm font-semibold text-white mb-3">
          🏦 Dubai-ackumulering — Wavult DevOps FZCO
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 3, 6, 12].map(months => (
            <div
              key={months}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/05 p-3 text-center"
            >
              <p className="text-[9px] text-gray-500 font-mono uppercase">
                {months === 1 ? '1 mån' : months === 12 ? '1 år' : `${months} mån`}
              </p>
              <p className="text-[15px] font-bold text-emerald-300 font-mono mt-1">
                {fmtEur(totalDubaiMonthly * months)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-white/[0.05]">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total skatt i dotterbolag/mån</span>
            <span className="text-red-400 font-mono font-semibold">{fmtEur(totalTaxPaidMonthly)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">Skattebesparning vs. ingen struktur/mån</span>
            <span className="text-emerald-400 font-mono font-semibold">{fmtEur(totalTaxSavedMonthly)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">Effektiv total skattebörda (grupp)</span>
            <span className="text-blue-300 font-mono font-semibold">
              {(() => { const tot = entityCalcs.reduce((s, c) => s + c.revEur, 0); return tot > 0 ? ((totalTaxPaidMonthly / tot) * 100).toFixed(1) : '0.0' })()}%
            </span>
          </div>
        </div>
      </div>

      {/* Optimal rate recommendation */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/05 p-4">
        <p className="text-xs font-semibold text-blue-300 mb-2">🎯 Optimal licensstruktur — rekommendation</p>
        <div className="space-y-2">
          {ENTITIES.map(e => {
            const calc = entityCalcs.find(c => c.entity.id === e.id)!
            const optimal = calc.revEur * OPTIMAL_RATE.recommended
            return (
              <div key={e.id} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                <span className="text-xs text-white flex-1">{e.name}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {(calc.rev * OPTIMAL_RATE.recommended).toLocaleString(undefined, { maximumFractionDigits: 0 })} {e.currency}/mån
                </span>
                <span className="text-xs text-blue-300 font-mono">≈ {fmtEur(optimal)}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-blue-500/15">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total optimal license income till Dubai</span>
            <span className="text-blue-300 font-mono font-bold">
              {fmtEur(entityCalcs.reduce((s, c) => s + c.revEur * OPTIMAL_RATE.recommended, 0))}/mån
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/05 px-4 py-3 flex gap-3">
        <span className="text-yellow-400 flex-shrink-0">⚠️</span>
        <p className="text-xs text-yellow-200/60 leading-relaxed">
          Denna simulering är för strategisk planering och illustrativa syften. Alla licensavgifter och
          management fees måste dokumenteras i enlighet med OECD Transfer Pricing Guidelines och lokala
          skattelagar. Konsultera en skatterådgivare innan implementation.
        </p>
      </div>
    </div>
  )
}
