import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { TAX_PERIODS, FINANCE_ENTITIES, type TaxPeriod } from './mockData'

type TaxStatus = TaxPeriod['status']

const STATUS_CONFIG: Record<TaxStatus, { label: string; color: string; bg: string; icon: string }> = {
  unreported: { label: 'Ej rapporterad', color: '#EF4444', bg: '#EF444415', icon: '⚠️' },
  submitted:  { label: 'Inlämnad',       color: '#F59E0B', bg: '#F59E0B15', icon: '📤' },
  paid:       { label: 'Betald',         color: '#10B981', bg: '#10B98115', icon: '✅' },
}

const VAT_INFO: Record<string, { rate: string; notes: string; flag: string }> = {
  'Sverige':       { rate: '25%', notes: 'Standardsats — momsperiod varannan månad', flag: '🇸🇪' },
  'Litauen':       { rate: '21%', notes: 'EU standard — kvartalsvis deklaration', flag: '🇱🇹' },
  'Texas, USA':    { rate: '8.25%', notes: 'Texas state sales tax — varies by county', flag: '🇺🇸' },
  'Delaware, USA': { rate: '0%', notes: 'Delaware har ingen statlig moms', flag: '🇺🇸' },
  'UAE (DIFC)':    { rate: '5%', notes: 'UAE VAT — DIFC fritt handelszon, undantag gäller', flag: '🇦🇪' },
}

function fmt(n: number, currency: string) {
  if (n === 0) return `0 ${currency}`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${currency}`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k ${currency}`
  return `${n.toLocaleString()} ${currency}`
}

export function TaxView() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const scopedIds = new Set(scopedEntities.map(e => e.id))

  const filteredPeriods = TAX_PERIODS.filter(
    tp => isRoot || scopedIds.has(tp.entityId)
  )

  const unreported = filteredPeriods.filter(t => t.status === 'unreported')
  const submitted = filteredPeriods.filter(t => t.status === 'submitted')
  const paid = filteredPeriods.filter(t => t.status === 'paid')

  const availableJurisdictions = FINANCE_ENTITIES.filter(
    fe => isRoot || scopedIds.has(fe.id)
  )

  // Next Swedish VAT deadline (approx: 26th of month after period end)
  const now = new Date()
  const nextDeadlineMonth = new Date(now.getFullYear(), now.getMonth() + 1, 26)
  const deadlineStr = nextDeadlineMonth.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">Moms &amp; Skatt</h2>
        <p className="text-xs text-gray-500 mt-0.5">Momsperioder per jurisdiktion — Wavult Group</p>
      </div>

      {/* Next VAT deadline reminder */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/08 px-4 py-3 flex items-start gap-3">
        <span className="text-blue-400 text-lg flex-shrink-0">📅</span>
        <div>
          <p className="text-xs font-semibold text-blue-300">Nästa momsdeadline (SE)</p>
          <p className="text-xs text-blue-200/70 mt-0.5">
            Nästa svenska momsdeklaration: <strong className="text-blue-300">{deadlineStr}</strong>
            {' '}— gäller tvåmånadersperioder för mindre bolag. Missa inte — förseningsavgift tillkommer.
          </p>
        </div>
      </div>

      {/* Swedish VAT rates explanation */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white">🇸🇪 Svenska momssatser</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[
            { rate: '25%', desc: 'Standardmoms', examples: 'De flesta varor och tjänster', color: '#EF4444' },
            { rate: '12%', desc: 'Reducerad sats', examples: 'Mat, restaurang, hotell, böcker', color: '#F59E0B' },
            { rate: '6%', desc: 'Lägsta sats', examples: 'Tidningar, persontransport, konst', color: '#10B981' },
            { rate: '0%', desc: 'Momsfri', examples: 'Export, finansiella tjänster, sjukvård, utbildning', color: '#6B7280' },
          ].map(row => (
            <div key={row.rate} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[15px] font-bold font-mono w-12 flex-shrink-0" style={{ color: row.color }}>{row.rate}</span>
              <div className="flex-1">
                <span className="text-xs text-white font-semibold">{row.desc}</span>
                <span className="text-xs text-gray-500 ml-2">{row.examples}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VAT MOSS / OSS */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/08 px-4 py-3">
        <p className="text-xs font-semibold text-purple-300 mb-1">🌍 VAT OSS — digitala tjänster till EU-kunder</p>
        <p className="text-xs text-purple-200/70 leading-relaxed">
          Om ni säljer digitala tjänster (appar, SaaS, streaming) till privatpersoner i EU gäller
          <strong className="text-purple-300"> OSS (One Stop Shop)</strong> — momsen betalas i köparens land.
          Gräns: <strong className="text-purple-300">10 000 EUR/år</strong> i EU-försäljning.
          Under gränsen: svensk moms. Över: registrera OSS hos Skatteverket.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ej rapporterade', value: unreported.length, color: '#EF4444', icon: '⚠️' },
          { label: 'Inlämnade', value: submitted.length, color: '#F59E0B', icon: '📤' },
          { label: 'Betalda', value: paid.length, color: '#10B981', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border text-center"
            style={{ background: s.color + '08', borderColor: s.color + '20' }}>
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Jurisdiction overview */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white">Momssatser per jurisdiktion</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {availableJurisdictions.map(fe => {
            const info = VAT_INFO[fe.jurisdiction] ?? { rate: '—', notes: 'Okänd', flag: '🌍' }
            return (
              <div key={fe.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg flex-shrink-0">{info.flag}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{fe.jurisdiction}</span>
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe.color }} />
                    <span className="text-[9px] font-mono text-gray-600">{fe.shortName}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{info.notes}</p>
                </div>
                <span className="text-[14px] font-bold font-mono" style={{ color: fe.color }}>{info.rate}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tax periods */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white">Momsperioder</span>
        </div>

        {/* Urgent unreported first */}
        {unreported.length > 0 && (
          <div className="mx-4 mt-3 mb-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-semibold text-red-300">
              ⚠️ {unreported.length} period{unreported.length > 1 ? 'er' : ''} ej rapporterade
            </p>
            <p className="text-xs text-red-600/80 mt-0.5">
              Kräver åtgärd inom angiven deadline
            </p>
          </div>
        )}

        <div className="divide-y divide-white/[0.04] pb-2">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider">
            <span className="col-span-2">Bolag</span>
            <span className="col-span-2">Jurisdiktion</span>
            <span className="col-span-2">Period</span>
            <span className="col-span-1 text-right">Sats</span>
            <span className="col-span-2 text-right">Beskattningsbar</span>
            <span className="col-span-2 text-right">Moms skuld</span>
            <span className="col-span-1">Status</span>
          </div>

          {filteredPeriods.map(tp => {
            const fe = FINANCE_ENTITIES.find(e => e.id === tp.entityId)
            const st = STATUS_CONFIG[tp.status]
            const isUrgent = tp.status === 'unreported'
            const isOverdue = tp.status === 'unreported' && tp.dueDate < new Date().toISOString().slice(0, 10)
            return (
              <div key={tp.id}
                className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors ${isUrgent ? 'border-l-2 border-red-500/50' : ''}`}
              >
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fe?.color }} />
                  <span className="text-xs text-gray-400 font-mono truncate">{fe?.shortName}</span>
                </div>
                <span className="col-span-2 text-xs text-gray-500">{tp.jurisdiction}</span>
                <span className="col-span-2 text-xs font-mono text-gray-300">{tp.period}</span>
                <span className="col-span-1 text-right text-xs font-mono font-semibold text-white">{tp.vatRate}%</span>
                <span className="col-span-2 text-right text-xs font-mono text-gray-400">
                  {fmt(tp.taxableRevenue, tp.currency)}
                </span>
                <span className="col-span-2 text-right text-xs font-mono font-bold"
                  style={{ color: tp.vatOwed === 0 ? '#6B7280' : isUrgent ? '#EF4444' : '#F59E0B' }}>
                  {fmt(tp.vatOwed, tp.currency)}
                </span>
                <div className="col-span-1">
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: st.color, background: st.bg }}>
                    {st.label}
                  </span>
                  {isOverdue && (
                    <p className="text-[8px] text-red-400 mt-0.5 font-mono">FÖRSENAD</p>
                  )}
                  {!isOverdue && (
                    <p className="text-[8px] text-gray-700 mt-0.5 font-mono">→ {tp.dueDate.slice(5)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
