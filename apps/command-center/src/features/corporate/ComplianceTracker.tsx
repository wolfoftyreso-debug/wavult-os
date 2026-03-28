import { useState } from 'react'
import { COMPLIANCE_ITEMS, COMPANIES, ComplianceStatus, CompanyId } from './data'

const STATUS_STYLES: Record<ComplianceStatus, { pill: string; dot: string; label: string }> = {
  'ej påbörjad': { pill: 'bg-gray-500/15 text-gray-400 border-gray-500/30', dot: 'bg-gray-500', label: 'Ej påbörjad' },
  'pågår':       { pill: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400', label: 'Pågår' },
  'klar':        { pill: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400', label: 'Klar' },
  'förfallen':   { pill: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500', label: 'Förfallen' },
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function DeadlineBadge({ date, status }: { date: string; status: ComplianceStatus }) {
  if (status === 'klar') return <span className="text-xs text-green-500 font-mono">✓ klar</span>
  const days = daysUntil(date)
  const formatted = new Date(date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
  if (days < 0)   return <span className="text-xs text-red-400 font-mono font-semibold">FÖRFALLEN</span>
  if (days <= 7)  return <span className="text-xs text-red-400 font-mono font-semibold animate-pulse">{formatted} ({days}d)</span>
  if (days <= 30) return <span className="text-xs text-yellow-400 font-mono">{formatted} ({days}d)</span>
  return <span className="text-xs text-gray-600 font-mono">{formatted}</span>
}

const ALL_STATUSES: ComplianceStatus[] = ['ej påbörjad', 'pågår', 'klar', 'förfallen']

export function ComplianceTracker() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyId | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<ComplianceStatus | 'all'>('all')

  // Upcoming: sort by deadline, exclude klar, take top 3
  const upcoming = [...COMPLIANCE_ITEMS]
    .filter(i => i.status !== 'klar' && daysUntil(i.deadline) > 0)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3)

  const filtered = COMPLIANCE_ITEMS.filter(i =>
    (selectedCompany === 'all' || i.companyId === selectedCompany) &&
    (selectedStatus === 'all' || i.status === selectedStatus)
  ).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const totals = {
    total:       COMPLIANCE_ITEMS.length,
    klarCount:   COMPLIANCE_ITEMS.filter(i => i.status === 'klar').length,
    pagarsCount: COMPLIANCE_ITEMS.filter(i => i.status === 'pågår').length,
    overdue:     COMPLIANCE_ITEMS.filter(i => i.status !== 'klar' && daysUntil(i.deadline) < 0).length,
  }
  const progress = Math.round((totals.klarCount / totals.total) * 100)

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="text-[28px] font-bold text-white">{totals.klarCount}<span className="text-[16px] text-gray-600">/{totals.total}</span></div>
          <div className="text-xs text-gray-500 mt-0.5">Krav uppfyllda</div>
          <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-gray-600 mt-1">{progress}% klart</div>
        </div>
        <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/20 p-4">
          <div className="text-[28px] font-bold text-blue-400">{totals.pagarsCount}</div>
          <div className="text-xs text-blue-400/70 mt-0.5">Pågår</div>
        </div>
        <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-4">
          <div className="text-[28px] font-bold text-red-400">{totals.overdue}</div>
          <div className="text-xs text-red-400/70 mt-0.5">Förfallna</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="text-[28px] font-bold text-white">{upcoming.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Kommande (30d)</div>
        </div>
      </div>

      {/* Upcoming deadlines highlight */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.04] p-4">
          <h3 className="text-xs font-semibold text-yellow-400/80 uppercase tracking-wider mb-3">⚠ Nästa deadlines</h3>
          <div className="space-y-2">
            {upcoming.map(item => {
              const company = COMPANIES.find(c => c.id === item.companyId)!
              return (
                <div key={item.id} className="flex items-center gap-3 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company.color }} />
                  <span className="text-gray-300 flex-1">{item.requirement}</span>
                  <span style={{ color: company.color }} className="text-xs">{company.shortName}</span>
                  <DeadlineBadge date={item.deadline} status={item.status} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={selectedCompany}
          onChange={e => setSelectedCompany(e.target.value as CompanyId | 'all')}
          className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none"
        >
          <option value="all">Alla bolag</option>
          {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${selectedStatus === 'all' ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30' : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'}`}
          >Alla</button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setSelectedStatus(selectedStatus === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors ${selectedStatus === s ? STATUS_STYLES[s].pill : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'}`}
            >
              {STATUS_STYLES[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[540px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium w-6" />
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Krav</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Bolag</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Kategori</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Ansvarig</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Deadline</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const company = COMPANIES.find(c => c.id === item.companyId)!
              const isOverdue = item.status !== 'klar' && daysUntil(item.deadline) < 0
              return (
                <tr
                  key={item.id}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'} ${isOverdue ? 'border-l-2 border-l-red-500/50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className={`h-3 w-3 rounded-sm border flex items-center justify-center ${item.status === 'klar' ? 'bg-green-500/20 border-green-500/50' : 'border-white/[0.15]'}`}>
                      {item.status === 'klar' && <span className="text-green-400 text-[9px]">✓</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200">{item.requirement}</div>
                    {item.notes && <div className="text-xs text-gray-600 mt-0.5">{item.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company.color }} />
                      <span style={{ color: company.color }}>{company.shortName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.owner || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <DeadlineBadge date={item.deadline} status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[item.status].dot}`} />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_STYLES[item.status].pill}`}>
                        {STATUS_STYLES[item.status].label}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>{/* /overflow-x-auto */}
      </div>
    </div>
  )
}
