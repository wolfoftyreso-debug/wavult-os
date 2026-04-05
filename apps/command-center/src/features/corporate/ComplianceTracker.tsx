import { useState } from 'react'
import { COMPLIANCE_ITEMS, COMPANIES, ComplianceStatus, CompanyId } from './data'
import { useTranslation } from '../../shared/i18n/useTranslation'

const STATUS_STYLES: Record<ComplianceStatus, { pill: string; dot: string; labelKey: string; icon: string }> = {
  'ej påbörjad': { pill: 'bg-gray-100 text-gray-600 border-gray-200',         dot: 'bg-gray-400', labelKey: 'corporate.compliance.statusNotStarted', icon: '○' },
  'pågår':       { pill: 'bg-[#F5F0E8] text-[#0A3D62] border-[#0A3D62]',          dot: 'bg-[#0A3D62]', labelKey: 'corporate.compliance.statusInProgress',  icon: '◑' },
  'klar':        { pill: 'bg-green-50 text-green-700 border-green-200',       dot: 'bg-green-400',labelKey: 'corporate.compliance.statusDone',        icon: '✓' },
  'förfallen':   { pill: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',  labelKey: 'corporate.compliance.statusOverdue',     icon: '!' },
}

const WHO_DOES_WHAT: Record<string, string> = {
  'Winston Bjarnemark': 'Ansvarar för att lämna in, betala, arkivera',
  'Dennis Bjarnemark':  'Ansvarar för juridisk granskning och inlämning',
  'Erik Svensson':      'Godkänner och signerar',
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DeadlineBadge({ date, status }: { date: string; status: ComplianceStatus }) {
  const { t } = useTranslation()
  if (status === 'klar') return <span className="text-xs text-green-600 font-semibold">{t('corporate.compliance.badgeDone')}</span>
  const days = daysUntil(date)
  const formatted = formatDate(date)
  if (days < 0)   return <span className="text-xs font-bold text-red-700">{t('corporate.compliance.overdueLabel')} {formatted}</span>
  if (days <= 7)  return <span className="text-xs font-bold text-red-600 animate-pulse">{formatted} — {days} dagar kvar</span>
  if (days <= 30) return <span className="text-xs font-semibold text-amber-700">{formatted} — {days} dagar kvar</span>
  return <span className="text-xs text-gray-500">{formatted} — {days} dagar</span>
}

const ALL_STATUSES: ComplianceStatus[] = ['ej påbörjad', 'pågår', 'klar', 'förfallen']

export function ComplianceTracker() {
  const { t } = useTranslation()
  const [selectedCompany, setSelectedCompany] = useState<CompanyId | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<ComplianceStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = COMPLIANCE_ITEMS.filter(i =>
    (selectedCompany === 'all' || i.companyId === selectedCompany) &&
    (selectedStatus === 'all' || i.status === selectedStatus)
  ).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const totals = {
    total:     COMPLIANCE_ITEMS.length,
    klar:      COMPLIANCE_ITEMS.filter(i => i.status === 'klar').length,
    pagar:     COMPLIANCE_ITEMS.filter(i => i.status === 'pågår').length,
    ejPaborjad:COMPLIANCE_ITEMS.filter(i => i.status === 'ej påbörjad').length,
    forfallen: COMPLIANCE_ITEMS.filter(i => i.status !== 'klar' && daysUntil(i.deadline) < 0).length,
  }
  const progress = Math.round((totals.klar / totals.total) * 100)

  // Urgent — ej klar och deadline inom 30 dagar
  const urgent = COMPLIANCE_ITEMS.filter(i =>
    i.status !== 'klar' && daysUntil(i.deadline) <= 30
  ).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  return (
    <div className="space-y-5">

      {/* ── FÖRKLARING — vad är detta ─────────────────── */}
      <div className="rounded-xl border border-[#0A3D62] bg-[#F5F0E8] px-4 py-3 flex gap-3 items-start">
        <span className="text-lg flex-shrink-0">ℹ️</span>
        <div>
          <p className="text-xs font-semibold text-[#0A3D62] mb-0.5">{t('corporate.compliance.infoTitle')}</p>
          <p className="text-xs text-[#0A3D62] leading-relaxed">
            {t('corporate.compliance.infoBody')}
          </p>
        </div>
      </div>

      {/* ── SUMMARY — tydliga siffror med förklaring ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
          <div className="text-3xl font-bold text-text-primary">{totals.klar}<span className="text-base font-normal text-gray-400">/{totals.total}</span></div>
          <div className="text-xs font-semibold text-gray-700 mt-1">{t('corporate.compliance.completedReqs')}</div>
          <div className="text-xs text-gray-400 mt-0.5">av totalt {totals.total} juridiska krav</div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-green-400" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{progress}% genomfört</div>
        </div>

        <div className="rounded-xl border border-[#0A3D62] bg-[#F5F0E8] p-4 shadow-card">
          <div className="text-3xl font-bold text-[#0A3D62]">{totals.pagar}</div>
          <div className="text-xs font-semibold text-[#0A3D62] mt-1">{t('corporate.compliance.summaryInProgress')}</div>
          <div className="text-xs text-[#0A3D62] mt-0.5">Ansvariga arbetar med dessa</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-card">
          <div className="text-3xl font-bold text-amber-700">{totals.ejPaborjad}</div>
          <div className="text-xs font-semibold text-amber-800 mt-1">{t('corporate.compliance.notStarted')}</div>
          <div className="text-xs text-amber-600 mt-0.5">Väntar på att tilldelas/startas</div>
        </div>

        <div className={`rounded-xl border p-4 shadow-card ${totals.forfallen > 0 ? 'border-red-300 bg-red-50' : 'border-surface-border bg-white'}`}>
          <div className={`text-3xl font-bold ${totals.forfallen > 0 ? 'text-red-700' : 'text-gray-400'}`}>{totals.forfallen}</div>
          <div className={`text-xs font-semibold mt-1 ${totals.forfallen > 0 ? 'text-red-800' : 'text-gray-500'}`}>{t('corporate.compliance.overdue')}</div>
          <div className={`text-xs mt-0.5 ${totals.forfallen > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {totals.forfallen > 0 ? '⚠️ Kräver omedelbar åtgärd' : 'Inget förfallet — bra!'}
          </div>
        </div>
      </div>

      {/* ── BRÅDSKANDE — synlig varning om det finns ── */}
      {urgent.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⚡</span>
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('corporate.compliance.urgentTitle')}</span>
          </div>
          <div className="space-y-2">
            {urgent.map(item => {
              const company = COMPANIES.find(c => c.id === item.companyId)
              const days = daysUntil(item.deadline)
              return (
                <div key={item.id} className="flex items-start justify-between gap-4 py-2 border-b border-amber-200 last:border-0">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-amber-900">{item.requirement}</div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      <span style={{ color: company?.color }} className="font-medium">{company?.shortName}</span>
                      {item.owner && <span className="ml-2">· Ansvarig: <strong>{item.owner}</strong></span>}
                    </div>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${days < 0 ? 'text-red-700' : days <= 7 ? 'text-red-600' : 'text-amber-700'}`}>
                    {days < 0 ? `FÖRFALLEN` : `${days}d`}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-amber-700 mt-3 border-t border-amber-200 pt-3">
            <strong>Vad händer om inget görs?</strong> Förseningsavgifter, böter, avregistrering eller skattetillägg beroende på land och kravtyp. Winston/Dennis hanterar — informera dem om de inte redan är på det.
          </p>
        </div>
      )}

      {/* ── FILTER ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={selectedCompany}
          onChange={e => setSelectedCompany(e.target.value as CompanyId | 'all')}
          className="text-xs bg-white border border-surface-border rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none shadow-sm"
        >
          <option value="all">Alla bolag ({COMPLIANCE_ITEMS.length} krav)</option>
          {COMPANIES.map(c => {
            const count = COMPLIANCE_ITEMS.filter(i => i.companyId === c.id).length
            return <option key={c.id} value={c.id}>{c.name} ({count} krav)</option>
          })}
        </select>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedStatus === 'all' ? 'text-white' : 'bg-white text-gray-600 border-surface-border hover:border-gray-400'}`}
                  style={selectedStatus === 'all' ? { background: 'var(--color-text, #1A1A2E)', borderColor: 'var(--color-text, #1A1A2E)' } : {}}
          >Alla</button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setSelectedStatus(selectedStatus === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedStatus === s ? STATUS_STYLES[s].pill + ' font-bold' : 'bg-white text-gray-600 border-surface-border hover:border-gray-400'}`}
            >
              {STATUS_STYLES[s].icon} {t(STATUS_STYLES[s].labelKey)}
              <span className="ml-1.5 opacity-60">
                {COMPLIANCE_ITEMS.filter(i =>
                  i.status === s &&
                  (selectedCompany === 'all' || i.companyId === selectedCompany)
                ).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TABELL ────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border overflow-hidden shadow-card">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-2xl mb-2">✓</div>
            <div className="text-sm font-semibold text-gray-700">{t('corporate.compliance.noMatch')}</div>
            <div className="text-xs text-gray-400 mt-1">{t('corporate.compliance.noMatchHint')}</div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-[#F5F0E8]">
                <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Krav</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Bolag</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Ansvarig</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Deadline</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const company = COMPANIES.find(c => c.id === item.companyId)
                const st = STATUS_STYLES[item.status]
                const isExpanded = expandedId === item.id
                const days = daysUntil(item.deadline)
                const isUrgent = item.status !== 'klar' && days <= 14 && days >= 0
                const isOverdue = item.status !== 'klar' && days < 0
                return (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className={`border-b border-surface-border/60 cursor-pointer transition-colors ${
                        isOverdue ? 'bg-red-50 hover:bg-red-100' :
                        isUrgent  ? 'bg-amber-50/50 hover:bg-amber-50' :
                        i % 2 === 0 ? 'bg-white hover:bg-[#F5F0E8]' : 'bg-[#FDFAF5] hover:bg-[#F5F0E8]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 flex-shrink-0 text-[11px] font-bold ${item.status === 'förfallen' ? 'text-red-500' : item.status === 'klar' ? 'text-green-500' : 'text-gray-400'}`}>{st.icon}</span>
                          <div>
                            <div className="text-gray-900 font-medium">{item.requirement}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{item.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company?.color }} />
                          <span style={{ color: company?.color }} className="font-medium">{company?.shortName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.owner ? (
                          <span className="text-gray-700 font-medium">{item.owner}</span>
                        ) : (
                          <span className="text-amber-600 font-medium text-[10px] uppercase">⚠ Ej tilldelad</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DeadlineBadge date={item.deadline} status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${st.pill}`}>
                          {t(st.labelKey)}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={item.id + '-exp'} className="bg-[#F5F0E8] border-b border-surface-border">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="font-semibold text-gray-700 mb-1">{t('corporate.compliance.whatToDo')}</div>
                              <div className="text-gray-600 leading-relaxed">{item.requirement} — lämnas in till relevant myndighet för {company?.jurisdiction}.</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-700 mb-1">{t('corporate.compliance.whoDoes')}</div>
                              <div className="text-gray-600">
                                {item.owner
                                  ? <><strong>{item.owner}</strong><br /><span className="text-gray-400">{WHO_DOES_WHAT[item.owner] ?? 'Ansvarar för denna uppgift'}</span></>
                                  : <span className="text-amber-600 font-semibold">Ingen tilldelad — behöver åtgärdas</span>
                                }
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-700 mb-1">{t('corporate.compliance.yourRole')}</div>
                              <div className="text-gray-500">{t('corporate.compliance.yourRoleText', { owner: item.owner ?? 'ansvarig' })}</div>
                            </div>
                            {item.notes && (
                              <div className="md:col-span-3">
                                <div className="font-semibold text-gray-700 mb-1">Anteckningar</div>
                                <div className="text-gray-600">{item.notes}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FÖRKLARING LÄNGST NER ─────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-[#F5F0E8] px-4 py-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Hur funkar det? Vem gör vad?</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
          <div><strong className="text-gray-800">Winston</strong> — hanterar all ekonomi och skatt: deklarationer, årsredovisningar, betalningar</div>
          <div><strong className="text-gray-800">Dennis</strong> — hanterar juridik och bolagsregistrering: ansökningar, inlämningar, licenser</div>
          <div><strong className="text-gray-800">Du som CEO</strong> — godkänner och signerar när de rapporterar klart. Systemet pingar dig automatiskt.</div>
        </div>
      </div>

    </div>
  )
}
