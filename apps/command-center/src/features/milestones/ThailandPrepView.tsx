import { THAILAND_CHECKLIST, THAILAND_DATE, getDaysUntil, getStatusColor, getStatusLabel, type MilestoneStatus } from './data'

const STATUS_ICON: Record<MilestoneStatus, string> = {
  done: '✅',
  'in-progress': '🔄',
  pending: '⏳',
  delayed: '🚨',
}

function CategoryProgress({ items }: { items: typeof THAILAND_CHECKLIST }) {
  const done = items.filter(i => i.status === 'done').length
  const pct = Math.round((done / items.length) * 100)
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 bg-white/[0.06] rounded-full h-1">
        <div
          className="h-1 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? '#10B981' : pct > 50 ? '#3B82F6' : '#F59E0B',
          }}
        />
      </div>
      <span className="text-[9px] font-mono text-gray-500 flex-shrink-0">{done}/{items.length}</span>
    </div>
  )
}

function CheckItem({ item }: { item: typeof THAILAND_CHECKLIST[0] }) {
  const color = getStatusColor(item.status)
  const days = getDaysUntil(item.deadline)

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0"
    >
      <span className="text-base mt-0.5 flex-shrink-0">{STATUS_ICON[item.status]}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
          {item.title}
        </p>
        {item.notes && (
          <p className="text-xs text-gray-600 mt-0.5 italic">{item.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-gray-500 font-mono">👤 {item.owner}</span>
          <span className="text-[9px] text-gray-600 font-mono">·</span>
          <span
            className="text-[9px] font-mono"
            style={{ color: days <= 0 ? '#EF4444' : days <= 3 ? '#F59E0B' : '#6B7280' }}
          >
            {days <= 0 ? '⚡ IDAG' : `${days}d kvar`} ({new Date(item.deadline).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })})
          </span>
        </div>
      </div>
      <span
        className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
        style={{ background: color + '15', color }}
      >
        {getStatusLabel(item.status)}
      </span>
    </div>
  )
}

export function ThailandPrepView() {
  const daysLeft = getDaysUntil(THAILAND_DATE)
  const categories = [...new Set(THAILAND_CHECKLIST.map(i => i.category))]
  const done = THAILAND_CHECKLIST.filter(i => i.status === 'done').length
  const totalPct = Math.round((done / THAILAND_CHECKLIST.length) * 100)

  const urgencyColor = daysLeft <= 7 ? '#EF4444' : daysLeft <= 14 ? '#F59E0B' : '#3B82F6'

  return (
    <div className="space-y-6">
      {/* Hero — kritisk status */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: urgencyColor + '10', borderColor: urgencyColor + '30' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">🇹🇭</span>
          <div className="flex-1">
            <h2 className="text-[18px] font-bold text-white">Thailand Workcamp</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              11 april 2026 — Vecka 1: Teambuilding & Utbildning
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 bg-white/[0.08] rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${totalPct}%`, background: urgencyColor }}
                />
              </div>
              <span className="text-xs font-mono text-white">{totalPct}%</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-5xl font-bold leading-none" style={{ color: urgencyColor }}>
              {daysLeft}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1">dagar kvar</p>
          </div>
        </div>

        {daysLeft <= 16 && (
          <div
            className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: urgencyColor + '15', color: urgencyColor }}
          >
            <span>⚡</span>
            <span>KRITISK: {daysLeft} dagar tills avresa — säkerställ alla checklistepunkter!</span>
          </div>
        )}
      </div>

      {/* Per category */}
      {categories.map(cat => {
        const items = THAILAND_CHECKLIST.filter(i => i.category === cat)
        const catDone = items.filter(i => i.status === 'done').length
        const catPct = Math.round((catDone / items.length) * 100)
        const catColor = catPct === 100 ? '#10B981' : items.some(i => i.status === 'delayed') ? '#EF4444' : '#3B82F6'

        return (
          <div key={cat} className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
            {/* Category header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: catColor }}
              />
              <span className="text-sm font-semibold text-white">{cat}</span>
              <span
                className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: catColor + '15', color: catColor }}
              >
                {catDone}/{items.length}
              </span>
            </div>
            <CategoryProgress items={items} />

            {/* Items */}
            <div>
              {items.map(item => (
                <CheckItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
