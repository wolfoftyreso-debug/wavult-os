import { ENTITY_FINANCIALS, CRITICAL_ITEMS, NEXT_MILESTONES, PIPELINE_DEALS } from './data'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'SEK'): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MSEK`
  if (n >= 1_000)     return `${Math.round(n / 1_000)} kSEK`
  return `${n} ${currency}`
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  const now    = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

const THAILAND_DATE = '2026-04-11'

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#FF4444',
  high:     '#FF8C00',
  medium:   '#F5A623',
}
const TYPE_ICON: Record<string, string> = {
  legal:       '⚖️',
  compliance:  '🛡️',
  financial:   '💰',
  operational: '⚙️',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: color ?? '#fff' }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{title}</h2>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function ExecutiveSummary() {
  const group    = ENTITY_FINANCIALS[0]
  const entities = ENTITY_FINANCIALS.slice(1)
  const pipelineTotal = PIPELINE_DEALS
    .filter(d => d.stage !== 'Stängd-Förlorad')
    .reduce((s, d) => s + d.value * (d.probability / 100), 0)
  const weightedPipeline = PIPELINE_DEALS
    .filter(d => d.stage !== 'Stängd-Förlorad' && d.stage !== 'Stängd-Vann')
    .reduce((s, d) => s + d.value, 0)
  const thailandDays = daysUntil(THAILAND_DATE)
  const today = new Date()
  const nextMilestone = NEXT_MILESTONES.find(m => new Date(m.date) >= today)

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Grupp-ARR" value={fmt(group.arr)} sub="Annual Recurring Revenue" color="#6C63FF" />
        <KPICard label="Cash Position (Group)" value={fmt(group.cashPosition)} sub="Konsoliderat" color="#4CAF50" />
        <KPICard label="Pipeline (viktat)" value={fmt(pipelineTotal)} sub={`${fmt(weightedPipeline)} brutto`} color="#00C2FF" />
        <KPICard label="Headcount" value={`${group.headcount} pers`} sub={`${fmt(group.monthlySalaryCost)}/mån`} color="#FF6B35" />
      </div>

      {/* ── ARR per bolag ── */}
      <div>
        <SectionHeader title="ARR per bolag" icon="📈" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {entities.map(e => (
            <div key={e.id} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                <span className="text-xs font-semibold text-gray-300">{e.shortName}</span>
                <span className="text-[9px] text-gray-600 font-mono ml-auto">{e.country}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: e.color }}>{fmt(e.arr)}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Cash</span>
                  <span>{fmt(e.cashPosition)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Headcount</span>
                  <span>{e.headcount} pers</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Lön/mån</span>
                  <span>{fmt(e.monthlySalaryCost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Critical Items + Thailand + Milestone ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Critical Items */}
        <div className="md:col-span-2">
          <SectionHeader title="Kritiska items" icon="🚨" />
          <div className="space-y-2">
            {CRITICAL_ITEMS.sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2 }
              return order[a.severity] - order[b.severity]
            }).map(item => {
              const days = item.deadline ? daysUntil(item.deadline) : null
              return (
                <div key={item.id} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 flex gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{TYPE_ICON[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-white">{item.title}</p>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: SEVERITY_COLOR[item.severity] + '25', color: SEVERITY_COLOR[item.severity] }}
                      >
                        {item.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-gray-600 font-mono">→ {item.owner}</span>
                      {item.deadline && (
                        <span
                          className="text-[9px] font-mono"
                          style={{ color: days !== null && days <= 14 ? '#FF4444' : days !== null && days <= 30 ? '#FF8C00' : '#6B7280' }}
                        >
                          {item.deadline} {days !== null && `(${days}d)`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Thailand + Milestone */}
        <div className="space-y-4">
          {/* Thailand Countdown */}
          <div>
            <SectionHeader title="Thailand Workcamp" icon="🇹🇭" />
            <div className="bg-gradient-to-br from-[#6C63FF]/10 to-[#00C2FF]/10 border border-[#6C63FF]/20 rounded-xl p-5 text-center">
              <div className="text-5xl font-black text-white mb-1">{thailandDays}</div>
              <div className="text-xs text-gray-400">dagar kvar</div>
              <div className="text-xs text-gray-600 font-mono mt-2">{THAILAND_DATE}</div>
              <div className="mt-3 space-y-1 text-left">
                <div className="text-xs text-gray-500">Vecka 1: Teambuilding + utbildning</div>
                <div className="text-xs text-gray-500">Vecka 2+: Projektuppsättning</div>
              </div>
            </div>
          </div>

          {/* Next Milestones */}
          <div>
            <SectionHeader title="Nästa milstolpar" icon="🚀" />
            <div className="space-y-1.5">
              {NEXT_MILESTONES.slice(0, 5).map((m, i) => {
                const days = daysUntil(m.date)
                const isPast = days < 0
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      i === 0 && !isPast ? 'bg-[#6C63FF]/10 border border-[#6C63FF]/20' : 'bg-white/[0.02]'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: i === 0 ? '#6C63FF' : '#374151' }} />
                    <span className="flex-1 text-gray-300">{m.label}</span>
                    <span className="font-mono text-[9px] text-gray-600">{isPast ? '✓' : `${days}d`}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Next Milestone highlight */}
      {nextMilestone && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Nästa milestone</p>
            <p className="text-sm font-semibold text-white">{nextMilestone.label}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500 font-mono">{nextMilestone.date}</p>
            <p className="text-lg font-bold text-[#6C63FF]">{daysUntil(nextMilestone.date)}d</p>
          </div>
        </div>
      )}
    </div>
  )
}
