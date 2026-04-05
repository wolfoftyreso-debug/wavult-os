import { useState, useMemo } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { LEGAL_DOCUMENTS, LEGAL_TEMPLATES, IP_ASSETS } from './legalData'

type Tab = 'documents' | 'contracts' | 'templates' | 'ip' | 'reminders'

const TABS = [
  { id: 'documents' as Tab,  label: 'Dokument',      icon: '📄' },
  { id: 'contracts' as Tab,  label: 'Avtal',         icon: '⚖️' },
  { id: 'templates' as Tab,  label: 'Mallar',        icon: '📋' },
  { id: 'ip' as Tab,         label: 'IP & Licenser', icon: '🔐' },
  { id: 'reminders' as Tab,  label: 'Påminnelser',   icon: '📬' },
]

const STATUS_CONFIG = {
  aktiv:             { label: 'Aktiv',             color: '#2D7A4F', bg: '#E8F5ED' },
  utgången:          { label: 'Utgången',          color: '#C0392B', bg: '#FDECEA' },
  utkast:            { label: 'Utkast',            color: '#8B6914', bg: '#FDF3E0' },
  under_förhandling: { label: 'Under förhandling', color: '#2C6EA6', bg: '#E3EFF8' },
} as const

const TYPE_ICONS: Record<string, string> = {
  avtal: '⚖️', bolagsordning: '🏢', protokoll: '📝',
  licens: '🔑', nda: '🔒', ip: '💡', övrigt: '📄',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function formatDate(s?: string): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function LegalHub() {
  const { activeEntity, scopedEntities } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const [activeTab, setActiveTab] = useState<Tab>('documents')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('alla')

  // Filtrera per aktivt bolag
  const entityIds = isRoot
    ? new Set(LEGAL_DOCUMENTS.map(d => d.entity_id))
    : new Set([activeEntity.id, ...scopedEntities.map(e => e.id)])

  const filteredDocs = useMemo(() =>
    LEGAL_DOCUMENTS.filter(d => {
      if (!entityIds.has(d.entity_id)) return false
      if (filterType !== 'alla' && d.type !== filterType) return false
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) &&
          !d.counterpart?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [activeEntity.id, isRoot, filterType, search])

  const contracts = filteredDocs.filter(d => ['avtal', 'nda'].includes(d.type))
  const reminders = LEGAL_DOCUMENTS.filter(d =>
    d.expiry_date && daysUntil(d.expiry_date) <= 90 && daysUntil(d.expiry_date) > 0
  )

  // Stats
  const totalDocs = filteredDocs.length
  const activeContracts = filteredDocs.filter(d => d.status === 'aktiv' && ['avtal', 'nda'].includes(d.type)).length
  const expiringDocs = reminders.length
  const pendingDocs = filteredDocs.filter(d => ['utkast', 'under_förhandling'].includes(d.status)).length

  return (
    <div className="flex flex-col h-full bg-[#F5F0E8] text-text-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#DDD5C5] bg-[#FDFAF5] flex-shrink-0">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-bold text-[#0A3D62]">⚖️ Legal Hub</h1>
            <p className="text-xs text-gray-500 mt-0.5">{activeEntity.shortName} — juridik, avtal och IP</p>
          </div>
          {/* Stats */}
          <div className="flex gap-3 flex-wrap text-xs">
            {[
              { label: 'Dokument',       value: totalDocs,        color: '#0A3D62' },
              { label: 'Aktiva avtal',   value: activeContracts,  color: '#2D7A4F' },
              { label: 'Löper ut (90d)', value: expiringDocs,     color: expiringDocs > 0 ? '#C0392B' : '#8A8278' },
              { label: 'Väntande',       value: pendingDocs,      color: '#B8760A' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DDD5C5] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                <span className="text-gray-500">{s.label}:</span>
                <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#E8B84B] text-[#0A3D62] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-[#0A3D62]'
              }`}
            >
              <span>{tab.icon}</span>{tab.label}
              {tab.id === 'reminders' && expiringDocs > 0 && (
                <span className="ml-1 bg-[#C0392B] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{expiringDocs}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* DOKUMENT TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Search + filter */}
            <div className="flex gap-3 flex-wrap">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Sök dokument, motpart..."
                className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-[#DDD5C5] bg-white text-sm focus:outline-none focus:border-[#0A3D62] focus:ring-1 focus:ring-[#0A3D62]/20"
              />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#DDD5C5] bg-white text-sm focus:outline-none"
              >
                <option value="alla">Alla typer</option>
                <option value="avtal">Avtal</option>
                <option value="bolagsordning">Bolagsordning</option>
                <option value="protokoll">Protokoll</option>
                <option value="nda">NDA</option>
                <option value="ip">IP</option>
                <option value="övrigt">Övrigt</option>
              </select>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDD5C5] flex items-center justify-center mb-4 shadow-sm">
                  <span className="text-2xl">📂</span>
                </div>
                <h3 className="text-sm font-bold text-[#0A3D62] mb-2">Inga dokument</h3>
                <p className="text-xs text-gray-500">Ladda upp bolagsdokument för att se dem här</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#DDD5C5] bg-white overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#EDE8DC] bg-[#F5F0E8]">
                      <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider">Dokument</th>
                      <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider hidden md:table-cell">Typ</th>
                      <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider hidden md:table-cell">Motpart</th>
                      <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider hidden lg:table-cell">Utgår</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc, i) => {
                      const st = STATUS_CONFIG[doc.status]
                      const expiring = doc.expiry_date && daysUntil(doc.expiry_date) <= 30
                      return (
                        <tr
                          key={doc.id}
                          className={`border-b border-[#EDE8DC] last:border-0 hover:bg-[#F5F0E8] transition-colors ${i % 2 === 0 ? '' : 'bg-[#FDFAF5]'}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{TYPE_ICONS[doc.type] ?? '📄'}</span>
                              <div>
                                <div className="font-semibold text-[#0A3D62]">{doc.title}</div>
                                <div className="text-[#8A8278] mt-0.5 hidden md:block">{formatDate(doc.signed_date)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="px-2 py-1 rounded-lg bg-[#EDE8DC] text-[#5A5245] capitalize">{doc.type}</span>
                          </td>
                          <td className="px-4 py-3 text-[#5A5245] hidden md:table-cell">{doc.counterpart ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {doc.expiry_date ? (
                              <span className={expiring ? 'text-[#C0392B] font-bold' : 'text-[#5A5245]'}>
                                {formatDate(doc.expiry_date)}{expiring ? ` (${daysUntil(doc.expiry_date)}d)` : ''}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AVTAL TAB */}
        {activeTab === 'contracts' && (
          <div className="space-y-3">
            {contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-3">⚖️</span>
                <h3 className="text-sm font-bold text-[#0A3D62] mb-2">Inga avtal registrerade</h3>
                <p className="text-xs text-gray-500">Aktivera avtal från Dokumentfliken</p>
              </div>
            ) : contracts.map(doc => {
              const st = STATUS_CONFIG[doc.status]
              const daysLeft = doc.expiry_date ? daysUntil(doc.expiry_date) : null
              return (
                <div key={doc.id} className="rounded-2xl border border-[#DDD5C5] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{TYPE_ICONS[doc.type]}</span>
                      <div>
                        <div className="font-bold text-sm text-[#0A3D62]">{doc.title}</div>
                        {doc.counterpart && <div className="text-xs text-gray-500 mt-0.5">Motpart: {doc.counterpart}</div>}
                        {doc.value_sek && <div className="text-xs text-[#2D7A4F] font-semibold mt-1">{doc.value_sek.toLocaleString('sv-SE')} SEK</div>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      {daysLeft !== null && (
                        <span className={`text-[10px] font-mono ${daysLeft <= 30 ? 'text-[#C0392B] font-bold' : 'text-gray-400'}`}>
                          {daysLeft > 0 ? `Utgår om ${daysLeft}d` : 'UTGÅNGEN'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MALLAR TAB */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEGAL_TEMPLATES.map(t => (
              <div key={t.id} className="rounded-2xl border border-[#DDD5C5] bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F0E8] text-[#5A5245] text-[10px] font-semibold uppercase tracking-wider">{t.category}</span>
                  <span className="text-[10px] text-gray-400 font-mono uppercase">{t.language}</span>
                </div>
                <h3 className="font-bold text-sm text-[#0A3D62] mb-1 group-hover:text-[#072E4A]">{t.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{t.description}</p>
                <button className="w-full py-2 border border-[#0A3D62] text-[#0A3D62] text-xs font-bold rounded-lg hover:bg-[#0A3D62] hover:text-white transition-colors">
                  ⬇ Ladda ned mall
                </button>
              </div>
            ))}
          </div>
        )}

        {/* IP & LICENSER TAB */}
        {activeTab === 'ip' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#DDD5C5] bg-white overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#EDE8DC] bg-[#F5F0E8]">
                    <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider">Tillgång</th>
                    <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider">Typ</th>
                    <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider">Jurisdiktion</th>
                    <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[#8A8278] font-semibold uppercase tracking-wider hidden lg:table-cell">Utgår</th>
                  </tr>
                </thead>
                <tbody>
                  {IP_ASSETS.map((ip, i) => {
                    const st = STATUS_CONFIG[ip.status] ?? STATUS_CONFIG.aktiv
                    return (
                      <tr
                        key={ip.id}
                        className={`border-b border-[#EDE8DC] last:border-0 hover:bg-[#F5F0E8] transition-colors ${i % 2 === 0 ? '' : 'bg-[#FDFAF5]'}`}
                      >
                        <td className="px-4 py-3 font-semibold text-[#0A3D62]">{ip.name}</td>
                        <td className="px-4 py-3 text-[#5A5245] capitalize">{ip.type}</td>
                        <td className="px-4 py-3 text-[#5A5245]">{ip.jurisdiction}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-[#5A5245]">{ip.expiry_date ? formatDate(ip.expiry_date) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PÅMINNELSER TAB */}
        {activeTab === 'reminders' && (
          <div className="space-y-3">
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-3">✅</span>
                <h3 className="text-sm font-bold text-[#2D7A4F] mb-2">Inga utgående avtal</h3>
                <p className="text-xs text-gray-500">Inga avtal löper ut inom 90 dagar</p>
              </div>
            ) : reminders.map(doc => {
              const days = daysUntil(doc.expiry_date!)
              return (
                <div
                  key={doc.id}
                  className={`rounded-2xl p-4 border ${days <= 14 ? 'border-[#C0392B]/30 bg-[#FDECEA]' : 'border-[#E8B84B]/30 bg-[#FDF3E0]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TYPE_ICONS[doc.type]}</span>
                      <div>
                        <div className="font-bold text-sm text-[#0A3D62]">{doc.title}</div>
                        {doc.counterpart && <div className="text-xs text-gray-500">{doc.counterpart}</div>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-black ${days <= 14 ? 'text-[#C0392B]' : 'text-[#B8760A]'}`}>{days}d</div>
                      <div className="text-[10px] text-gray-500">{formatDate(doc.expiry_date)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
