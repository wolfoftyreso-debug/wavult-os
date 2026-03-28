import { useState } from 'react'
import { DOCUMENTS, COMPANIES, DocumentCategory, DocumentStatus, CompanyId } from './data'

const STATUS_STYLES: Record<DocumentStatus, string> = {
  'utkast':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'signerat':  'bg-green-500/15 text-green-400 border-green-500/30',
  'arkiverat': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

const FILE_ICONS: Record<string, string> = {
  pdf:  '📄',
  docx: '📝',
  xlsx: '📊',
}

const CATEGORIES: DocumentCategory[] = ['Bolagsordning', 'Aktiebok', 'Styrelsebeslut', 'Avtal', 'Registreringsbevis']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function DocumentVault() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyId | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | 'all'>('all')

  const filtered = DOCUMENTS.filter(d =>
    (selectedCompany === 'all' || d.companyId === selectedCompany) &&
    (selectedCategory === 'all' || d.category === selectedCategory) &&
    (selectedStatus === 'all' || d.status === selectedStatus)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-start">
        {/* Company */}
        <div>
          <label className="text-xs text-gray-600 block mb-1.5 font-mono uppercase tracking-wider">Bolag</label>
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value as CompanyId | 'all')}
            className="text-xs bg-[#0D0F1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none"
          >
            <option value="all">Alla bolag</option>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div>
          <label className="text-xs text-gray-600 block mb-1.5 font-mono uppercase tracking-wider">Kategori</label>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${selectedCategory === 'all' ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30' : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'}`}
            >Alla</button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${selectedCategory === cat ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30' : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'}`}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Upload button */}
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <label className="text-xs text-gray-600 block font-mono uppercase tracking-wider opacity-0">·</label>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-gray-300 text-xs hover:bg-white/[0.07] transition-colors">
            <span>⬆</span> Ladda upp dokument
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap text-xs">
        {(['utkast', 'signerat', 'arkiverat'] as DocumentStatus[]).map(s => {
          const count = DOCUMENTS.filter(d =>
            (selectedCompany === 'all' || d.companyId === selectedCompany) && d.status === s
          ).length
          return (
            <button
              key={s}
              onClick={() => setSelectedStatus(selectedStatus === s ? 'all' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                selectedStatus === s
                  ? STATUS_STYLES[s]
                  : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-white'
              }`}
            >
              <span className="capitalize">{s}:</span>
              <span className="font-semibold">{count}</span>
            </button>
          )
        })}
        <span className="flex items-center text-gray-600">·</span>
        <span className="flex items-center gap-1 text-gray-500">
          <span className="font-semibold text-white">{filtered.length}</span> dokument
        </span>
      </div>

      {/* Document list */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-600 text-sm">Inga dokument matchar filtret.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Dokument</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Bolag</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Kategori</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Datum</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => {
                const company = COMPANIES.find(c => c.id === doc.companyId)!
                return (
                  <tr key={doc.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{FILE_ICONS[doc.fileType]}</span>
                        <div>
                          <div className="text-gray-200">{doc.name}</div>
                          <div className="text-xs text-gray-600 font-mono uppercase">{doc.fileType}{doc.size ? ` · ${doc.size}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: company.color }} />
                        <span style={{ color: company.color }}>{company.shortName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(doc.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_STYLES[doc.status]}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-gray-600 hover:text-brand-accent transition-colors">⬇ Hämta</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
