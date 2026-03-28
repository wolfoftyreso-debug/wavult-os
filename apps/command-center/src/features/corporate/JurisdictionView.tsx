import { useState } from 'react'
import { JURISDICTION_REQUIREMENTS, COMPANIES, FilingStatus, CompanyId } from './data'

const STATUS_STYLES: Record<FilingStatus, string> = {
  'ej inlämnad': 'bg-red-500/15 text-red-400 border-red-500/30',
  'inlämnad':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'betald':      'bg-green-500/15 text-green-400 border-green-500/30',
}

const FLAG: Record<string, string> = {
  SE: '🇸🇪',
  'US-DE': '🇺🇸',
  'US-TX': '🇺🇸',
  LT: '🇱🇹',
  AE: '🇦🇪',
}

function daysUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DeadlineBadge({ date }: { date: string }) {
  const days = daysUntil(date)
  if (days < 0)  return <span className="text-xs text-red-400 font-mono">FÖRFALLEN ({Math.abs(days)}d)</span>
  if (days <= 14) return <span className="text-xs text-red-400 font-semibold font-mono animate-pulse">{days}d</span>
  if (days <= 30) return <span className="text-xs text-yellow-400 font-mono">{days}d</span>
  return <span className="text-xs text-gray-600 font-mono">{new Date(date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
}

export function JurisdictionView() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyId | 'all'>('all')

  const companies = selectedCompany === 'all'
    ? COMPANIES
    : COMPANIES.filter(c => c.id === selectedCompany)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedCompany('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedCompany === 'all'
                ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30'
                : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'
            }`}
          >
            Alla bolag
          </button>
          {COMPANIES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompany(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedCompany === c.id
                  ? 'border opacity-100'
                  : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'
              }`}
              style={selectedCompany === c.id ? { background: c.color + '20', color: c.color, borderColor: c.color + '50' } : {}}
            >
              {FLAG[c.jurisdictionCode]} {c.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Per company */}
      <div className="space-y-4">
        {companies.map(company => {
          const reqs = JURISDICTION_REQUIREMENTS.filter(r => r.companyId === company.id)
          const urgentCount = reqs.filter(r => r.status !== 'betald' && daysUntil(r.deadline) <= 30).length
          return (
            <div key={company.id} className="rounded-xl border overflow-hidden" style={{ borderColor: company.color + '30' }}>
              {/* Company header */}
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: company.color + '0D' }}>
                <span className="text-xl">{FLAG[company.jurisdictionCode]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-white">{company.name}</span>
                    {urgentCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{urgentCount} brådskande</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{company.jurisdiction} · {company.orgNr}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  {(['ej inlämnad', 'inlämnad', 'betald'] as FilingStatus[]).map(s => {
                    const count = reqs.filter(r => r.status === s).length
                    if (!count) return null
                    return (
                      <span key={s} className={`px-2 py-0.5 rounded border ${STATUS_STYLES[s]}`}>
                        {count} {s}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Requirements table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Myndighet</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Krav</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Deadline</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Belopp</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqs.map(req => (
                      <tr key={req.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{req.authority}</td>
                        <td className="px-4 py-2.5">
                          <div className="text-gray-200">{req.requirement}</div>
                          {req.notes && <div className="text-xs text-gray-600 mt-0.5">{req.notes}</div>}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <DeadlineBadge date={req.deadline} />
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{req.amount || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_STYLES[req.status]}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
