import { useState } from 'react'
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

// ─── License fee data ───────────────────────────────────────────────────────
interface LicenseFee {
  from: string
  fromId: string
  amount: number
  currency: string
  euroEquiv: number // approximate EUR equivalent
  jurisdiction: string
  taxRate: number
  localTaxableProfit: number
  localTax: number
}

const LICENSE_FEES: LicenseFee[] = [
  {
    from: 'QuiXzoom Inc',
    fromId: 'quixzoom-inc',
    amount: 8500,
    currency: 'USD',
    euroEquiv: 7900,
    jurisdiction: 'Delaware, USA',
    taxRate: 0.21,
    localTaxableProfit: 2000,
    localTax: 420,
  },
  {
    from: 'QuiXzoom UAB',
    fromId: 'quixzoom-uab',
    amount: 7200,
    currency: 'EUR',
    euroEquiv: 7200,
    jurisdiction: 'Vilnius, Litauen',
    taxRate: 0.15,
    localTaxableProfit: 1500,
    localTax: 225,
  },
  {
    from: 'Landvex AB',
    fromId: 'landvex-ab',
    amount: 45000,
    currency: 'SEK',
    euroEquiv: 4100,
    jurisdiction: 'Stockholm, Sverige',
    taxRate: 0.206,
    localTaxableProfit: 8000,
    localTax: 1648,
  },
  {
    from: 'Landvex Inc',
    fromId: 'landvex-inc',
    amount: 6000,
    currency: 'USD',
    euroEquiv: 5580,
    jurisdiction: 'Houston, Texas',
    taxRate: 0.21,
    localTaxableProfit: 1000,
    localTax: 210,
  },
]

const TOTAL_DUBAI_EUR = LICENSE_FEES.reduce((sum, lf) => sum + lf.euroEquiv, 0)

const SECTION_TABS = [
  { id: 'license',   label: 'A — Licensflöden',     icon: '💡' },
  { id: 'mgmt',      label: 'B — Management Fees',  icon: '🏛️' },
  { id: 'netting',   label: 'C — Nettning',         icon: '⚖️' },
  { id: 'tax',       label: 'D — Skatteoptimering', icon: '📊' },
  { id: 'entries',   label: 'Transaktioner',        icon: '↔️' },
]

export function IntercompanyView() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const [section, setSection] = useState<string>('license')

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

  // Netting map
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Intercompany</h2>
        <p className="text-xs text-gray-500 mt-0.5">Mellanhavanden &amp; skattestruktur — Wavult Group</p>
      </div>

      {/* What is intercompany — plain language explanation */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="font-semibold text-white">Vad är intercompany?</span>{' '}
          Betalningar <em>inom</em> koncernen — t.ex. när ett dotterbolag betalar en licensavgift till holdingbolaget i Dubai.
          Det är inte försäljning till kund — det är pengar som <span className="text-emerald-400">flyttas</span> mellan egna bolag.
          Syftet kan vara skatteoptimering, koncernintern finansiering, eller fördelning av tjänster.
        </p>
      </div>

      {/* Visual flow diagram */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] p-4">
        <p className="text-xs font-semibold text-white mb-3">💸 Pengarnas väg — koncernstruktur</p>
        {/* Flow: subsidiaries → Dubai */}
        <div className="flex flex-col items-center gap-2">
          {/* Subsidiaries row */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { name: 'Landvex AB', flag: '🇸🇪', color: '#3B82F6', fee: '45k SEK/mån' },
              { name: 'Landvex Inc', flag: '🇺🇸', color: '#8B5CF6', fee: '6k USD/mån' },
              { name: 'QuiXzoom Inc', flag: '🇺🇸', color: '#F59E0B', fee: '8.5k USD/mån' },
              { name: 'QuiXzoom UAB', flag: '🇱🇹', color: '#10B981', fee: '7.2k EUR/mån' },
            ].map(sub => (
              <div key={sub.name}
                className="flex flex-col items-center px-3 py-2 rounded-lg border text-center"
                style={{ borderColor: sub.color + '40', background: sub.color + '10' }}>
                <span className="text-base">{sub.flag}</span>
                <span className="text-xs font-semibold text-white mt-0.5">{sub.name}</span>
                <span className="text-[9px] font-mono mt-0.5" style={{ color: sub.color }}>{sub.fee}</span>
              </div>
            ))}
          </div>
          {/* Arrow down */}
          <div className="flex flex-col items-center text-gray-600 text-xs gap-0.5">
            <div className="flex gap-8">
              {['↓', '↓', '↓', '↓'].map((a, i) => <span key={i} className="text-emerald-600 text-lg font-bold">{a}</span>)}
            </div>
            <span className="text-[9px] text-gray-600 font-mono">Licensavgifter + Management fees</span>
          </div>
          {/* Dubai holding */}
          <div className="flex flex-col items-center px-6 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-center">
            <span className="text-2xl">🇦🇪</span>
            <span className="text-xs font-bold text-emerald-300 mt-1">Wavult DevOps FZCO</span>
            <span className="text-xs text-emerald-600 font-mono">Dubai Freezone · 0% bolagsskatt</span>
            <span className="text-[14px] font-bold text-emerald-300 mt-1">≈ €{TOTAL_DUBAI_EUR.toLocaleString()}/mån</span>
          </div>
        </div>
      </div>

      {/* Arm's Length Warning — Sektion E */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex gap-3">
        <span className="text-yellow-400 text-lg flex-shrink-0">⚠️</span>
        <div>
          <p className="text-xs font-semibold text-yellow-300">Arm's Length-krav (OECD Transfer Pricing)</p>
          <p className="text-xs text-yellow-200/70 mt-1 leading-relaxed">
            Licensavgifterna måste vara marknadsmässiga (arm's length) enligt OECD Transfer Pricing Guidelines.
            Rekommenderat intervall: <strong className="text-yellow-300">8–15% av omsättning</strong> per dotterbolag.
            Fullständig dokumentation krävs — funktionsanalys, jämförbarhetsanalys & prissättningspolicy.
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SECTION_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              section === tab.id
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-xs">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Sektion A — License Fee Dashboard ─────────────────────────── */}
      {section === 'license' && (
        <div className="space-y-4">
          {/* Dubai total */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400 font-mono uppercase tracking-widest">Total insamlat i Dubai / mån</p>
              <p className="text-3xl font-bold text-emerald-300 mt-1">≈ €{TOTAL_DUBAI_EUR.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Wavult DevOps FZCO — 0% corporate tax</p>
            </div>
            <div className="text-5xl opacity-30">🇦🇪</div>
          </div>

          {/* Flow cards */}
          <div className="grid grid-cols-1 gap-3">
            {LICENSE_FEES.map(lf => (
              <div key={lf.fromId} className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{lf.from}</span>
                      <span className="text-[9px] text-gray-600 font-mono">{lf.jurisdiction}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400 font-mono">
                        {lf.amount.toLocaleString()} {lf.currency}/mån
                      </span>
                      <span className="text-gray-600">→</span>
                      <span className="text-xs font-semibold text-emerald-400">Wavult DevOps FZCO</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">≈ EUR-ekvivalent</p>
                    <p className="text-[16px] font-bold text-white font-mono">€{lf.euroEquiv.toLocaleString()}</p>
                  </div>
                </div>
                {/* Progress bar showing share of total */}
                <div className="mt-3">
                  <div className="flex justify-between text-[9px] text-gray-600 font-mono mb-1">
                    <span>Andel av total Dubai-inkomst</span>
                    <span>{((lf.euroEquiv / TOTAL_DUBAI_EUR) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06]">
                    <div
                      className="h-1 rounded-full bg-emerald-500"
                      style={{ width: `${(lf.euroEquiv / TOTAL_DUBAI_EUR) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sektion B — Management Fee Dashboard ──────────────────────── */}
      {section === 'mgmt' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/05 p-4">
            <p className="text-xs font-semibold text-blue-300 mb-1">🏛️ Management Services</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Wavult DevOps FZCO tillhandahåller management services till alla dotterbolag.
              Kostnaden sätts till <strong className="text-white">15% av resp. bolags omsättning</strong> och
              faktureras månadsvis. Detta är avdragsgillt i respektive land och reducerar lokal beskattningsbar vinst.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { entity: 'QuiXzoom Inc',  revenue: 40000, currency: 'USD', rate: 0.15 },
              { entity: 'QuiXzoom UAB',  revenue: 35000, currency: 'EUR', rate: 0.15 },
              { entity: 'Landvex AB',    revenue: 220000, currency: 'SEK', rate: 0.15 },
              { entity: 'Landvex Inc',   revenue: 28000, currency: 'USD', rate: 0.15 },
            ].map(row => {
              const fee = row.revenue * row.rate
              const taxSaving = fee * (row.currency === 'SEK' ? 0.206 : 0.21)
              return (
                <div key={row.entity} className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{row.entity}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Omsättning: {row.revenue.toLocaleString()} {row.currency}/mån
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Management fee</p>
                      <p className="text-[16px] font-bold text-blue-300 font-mono">
                        {fee.toLocaleString()} {row.currency}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/[0.05] flex justify-between">
                    <span className="text-xs text-gray-600">→ Wavult DevOps FZCO</span>
                    <span className="text-xs text-green-400 font-mono">
                      Skattebesparning: ~{taxSaving.toFixed(0)} {row.currency}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Sektion C — Nettningsöversikt ─────────────────────────────── */}
      {section === 'netting' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/05 p-4">
            <p className="text-xs font-semibold text-amber-300 mb-1">⚖️ Nettningsöversikt — Utestående mellanhavanden</p>
            <p className="text-xs text-gray-400">
              Netto vad varje entitet betalar/tar emot. Licensavgifter + management fees netteras per valuta.
            </p>
          </div>

          {/* Netting from live entries */}
          {nettingEntries.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="divide-y divide-white/[0.04]">
                {nettingEntries.map((pair, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: entityColor(pair.fromId) }} />
                      <span className="text-xs text-white font-semibold">{entityShortName(pair.fromId)}</span>
                    </div>
                    <span className="text-gray-500 text-sm">→</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: entityColor(pair.toId) }} />
                      <span className="text-xs text-white font-semibold">{entityShortName(pair.toId)}</span>
                    </div>
                    <span className="ml-auto text-xs font-bold text-amber-400 font-mono">{fmt(pair.netAmount, pair.currency)}</span>
                    <span className="text-[9px] text-gray-600 font-mono">{pair.count} poster</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600 px-1">Inga utestående mellanhavanden.</p>
          )}

          {/* Dubai accumulation */}
          <div className="rounded-xl border border-emerald-500/20 bg-[#0D0F1A] p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-300">🏦 Kvarvar i Dubai (Wavult DevOps FZCO)</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { label: '/mån', value: TOTAL_DUBAI_EUR, suffix: '' },
                { label: '/kvartal', value: TOTAL_DUBAI_EUR * 3, suffix: '' },
                { label: '/år', value: TOTAL_DUBAI_EUR * 12, suffix: '' },
              ].map(col => (
                <div key={col.label} className="text-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-[9px] text-emerald-600 font-mono uppercase">{col.label}</p>
                  <p className="text-[15px] font-bold text-emerald-300 font-mono mt-1">
                    €{col.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              * Exkl. management fees som betalas ut. Siffror baserade på approximerade EUR-ekvivalenter.
            </p>
          </div>
        </div>
      )}

      {/* ── Sektion D — Skatteoptimering ──────────────────────────────── */}
      {section === 'tax' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/05 p-4">
            <p className="text-xs font-semibold text-purple-300 mb-1">📊 Skatteeffekt per jurisdiktion</p>
            <p className="text-xs text-gray-400">
              Licensavgifterna minskar beskattningsbar vinst i högskatteländer och samlas i Dubai (0% skatt).
            </p>
          </div>

          {/* Tax table */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {['Entitet', 'Jurisdiktion', 'Skattesats', 'Beskattningsbar vinst', 'Skatt', 'Vinst till Dubai'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs text-gray-600 font-mono uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {LICENSE_FEES.map(lf => (
                    <tr key={lf.fromId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{lf.from}</td>
                      <td className="px-4 py-3 text-gray-400">{lf.jurisdiction}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-red-400">{(lf.taxRate * 100).toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-white">
                        {lf.localTaxableProfit.toLocaleString()} {lf.currency}
                      </td>
                      <td className="px-4 py-3 font-mono text-red-400">
                        {lf.localTax.toLocaleString()} {lf.currency}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {lf.amount.toLocaleString()} {lf.currency}
                      </td>
                    </tr>
                  ))}
                  {/* Dubai row */}
                  <tr className="bg-emerald-500/05 border-t border-emerald-500/20">
                    <td className="px-4 py-3 font-semibold text-emerald-300">Wavult DevOps FZCO</td>
                    <td className="px-4 py-3 text-gray-400">Dubai, UAE</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-emerald-400 font-bold">0%</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-300">
                      ≈ €{TOTAL_DUBAI_EUR.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">€0</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax saved summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/05 p-4 text-center">
              <p className="text-xs text-gray-500 font-mono uppercase">Total skatt i dotterbolag</p>
              <p className="text-[22px] font-bold text-red-400 font-mono mt-1">
                ~€{(LICENSE_FEES.reduce((s, lf) => s + lf.localTax * (lf.currency === 'SEK' ? 0.091 : lf.currency === 'USD' ? 0.93 : 1), 0)).toFixed(0)}
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">per månad</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/05 p-4 text-center">
              <p className="text-xs text-gray-500 font-mono uppercase">Skatt i Dubai</p>
              <p className="text-[22px] font-bold text-emerald-400 font-mono mt-1">€0</p>
              <p className="text-[9px] text-gray-600 mt-0.5">0% corporate tax</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaktioner (original entries) ──────────────────────────── */}
      {section === 'entries' && (
        <div className="space-y-3">
          {(Object.entries(byType) as [ICType, IntercompanyEntry[]][]).map(([type, entries]) => {
            if (entries.length === 0) return null
            const typeInfo = TYPE_CONFIG[type]
            return (
              <div key={type} className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                  <span>{typeInfo.icon}</span>
                  <span className="text-xs font-semibold text-white">{typeInfo.label}</span>
                  <span className="text-[9px] font-mono text-gray-600 ml-1">{entries.length} poster</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {entries.map(ic => {
                    const st = STATUS_CONFIG[ic.status]
                    return (
                      <div key={ic.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: entityColor(ic.fromEntityId) }} />
                            <span className="text-xs text-white font-semibold truncate">{entityShortName(ic.fromEntityId)}</span>
                          </div>
                          <span className="text-gray-600 text-sm flex-shrink-0">→</span>
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: entityColor(ic.toEntityId) }} />
                            <span className="text-xs text-white font-semibold truncate">{entityShortName(ic.toEntityId)}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{ic.description}</p>
                          <p className="text-[9px] text-gray-600 font-mono mt-0.5">{ic.date}</p>
                        </div>
                        <span className="text-xs font-bold font-mono text-white flex-shrink-0">{fmt(ic.amount, ic.currency)}</span>
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
      )}
    </div>
  )
}
