import { useState, useRef } from 'react'
import { DOCUMENTS, COMPANIES, DocumentCategory, DocumentStatus, CompanyId } from './data'

const S3_UPLOAD_BASE = 'https://wavult-documents-eu.s3.eu-north-1.amazonaws.com'
const CDN_BASE = 'https://d3iytjrde747np.cloudfront.net'

async function uploadToS3(file: File, docId: string, companyId: string): Promise<string> {
  const key = `${companyId}/${docId}/${file.name}`
  // Presigned upload måste gå via wavult-core — tills dess: visa instruktion
  throw new Error(`Ladda upp via AWS CLI:\naws s3 cp "${file.name}" s3://wavult-documents-eu/${key}`)
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  'utkast':    'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  'signerat':  'bg-green-500/15 text-green-700 border-green-500/30',
  'arkiverat': 'bg-gray-500/15 text-gray-9000 border-gray-500/30',
}

const FILE_ICONS: Record<string, string> = {
  pdf:  '📄',
  docx: '📝',
  xlsx: '📊',
}

const CATEGORIES: DocumentCategory[] = ['Bolagsordning', 'Aktiebok', 'Styrelsebeslut', 'Avtal', 'Registreringsbevis', 'Kvittens']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function DocumentVault() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyId | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | 'all'>('all')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDoc, setPendingDoc] = useState<typeof DOCUMENTS[0] | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleDownload(doc: typeof DOCUMENTS[0]) {
    if (doc.url) {
      window.open(doc.url, '_blank')
    } else {
      // Trigga file-upload flow
      setPendingDoc(doc)
      fileInputRef.current?.click()
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingDoc) return
    setUploadingId(pendingDoc.id)
    try {
      await uploadToS3(file, pendingDoc.id, pendingDoc.companyId)
      showToast(`✅ ${pendingDoc.name} uppladdad`)
    } catch (err: any) {
      showToast(err.message)
    } finally {
      setUploadingId(null)
      setPendingDoc(null)
      e.target.value = ''
    }
  }

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
          <label className="text-xs text-gray-9000 block mb-1.5 font-mono uppercase tracking-wider">Bolag</label>
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value as CompanyId | 'all')}
            className="text-xs bg-white border border-surface-border rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none"
          >
            <option value="all">Alla bolag</option>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div>
          <label className="text-xs text-gray-9000 block mb-1.5 font-mono uppercase tracking-wider">Kategori</label>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${selectedCategory === 'all' ? 'bg-[#F5F0E8] text-[#0A3D62] border-[#0A3D62]' : 'bg-[#EDE8DC] text-gray-9000 border-surface-border hover:text-gray-900'}`}
            >Alla</button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${selectedCategory === cat ? 'bg-[#F5F0E8] text-[#0A3D62] border-[#0A3D62]' : 'bg-[#EDE8DC] text-gray-9000 border-surface-border hover:text-gray-900'}`}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Upload button */}
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <label className="text-xs text-gray-9000 block font-mono uppercase tracking-wider opacity-0">·</label>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EDE8DC] border border-surface-border text-gray-600 text-xs hover:bg-[#EDE8DC] transition-colors">
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
                  : 'bg-[#EDE8DC] text-gray-9000 border-surface-border hover:text-gray-900'
              }`}
            >
              <span className="capitalize">{s}:</span>
              <span className="font-semibold">{count}</span>
            </button>
          )
        })}
        <span className="flex items-center text-gray-9000">·</span>
        <span className="flex items-center gap-1 text-gray-9000">
          <span className="font-semibold text-text-primary">{filtered.length}</span> dokument
        </span>
      </div>

      {/* Document list */}
      <div className="rounded-xl border border-surface-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-9000 text-sm">Inga dokument matchar filtret.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-[#EDE8DC]">
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Dokument</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Bolag</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Kategori</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Datum</th>
                <th className="text-left px-4 py-2.5 text-gray-9000 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => {
                const company = COMPANIES.find(c => c.id === doc.companyId)!
                return (
                  <tr key={doc.id} className={`border-b border-surface-border/50 hover:bg-[#EDE8DC] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{FILE_ICONS[doc.fileType]}</span>
                        <div>
                          <div className="text-gray-800">{doc.name}</div>
                          <div className="text-xs text-gray-9000 font-mono uppercase">{doc.fileType}{doc.size ? ` · ${doc.size}` : ''}</div>
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
                      <span className="text-xs text-gray-9000 bg-[#EDE8DC] px-2 py-0.5 rounded border border-surface-border">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 whitespace-nowrap">{formatDate(doc.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_STYLES[doc.status]}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.url ? (
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-xs text-[#0A3D62] hover:text-[#0A3D62] font-medium transition-colors flex items-center gap-1 ml-auto"
                        >⬇ Hämta</button>
                      ) : (
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={uploadingId === doc.id}
                          className="text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors flex items-center gap-1 ml-auto opacity-70 hover:opacity-100"
                          title="Filen är inte uppladdad ännu — klicka för att ladda upp"
                        >
                          {uploadingId === doc.id ? '⏳ Laddar...' : '⬆ Ladda upp'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Hidden file input för upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A2E] text-[#F5F0E8] text-xs px-5 py-3 rounded-xl shadow-floating max-w-sm text-center whitespace-pre-wrap">
          {toast}
        </div>
      )}
    </div>
  )
}
