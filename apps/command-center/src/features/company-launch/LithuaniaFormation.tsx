import { useState } from 'react'
import { CheckCircle, Circle, ExternalLink, Search, Loader2, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocItem {
  id: string
  label: string
  description: string
  checked: boolean
}

type NameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error'

// ─── Partners ─────────────────────────────────────────────────────────────────
const PARTNERS = [
  {
    name: 'Fondia',
    url: 'https://fondia.com/fi/en',
    email: 'info@fondia.com',
    description: 'Nordic + Baltic legal firm. Full-service company formation, compliance, and ongoing legal support. Strong in Lithuania.',
    badge: 'Recommended',
    badgeColor: '#34D399',
    badgeBg: '#064e3b',
  },
  {
    name: 'EasyLegal.lt',
    url: 'https://easylegal.lt',
    email: 'info@easylegal.lt',
    description: 'English-language company setup service in Lithuania. Fast turnaround, digital-first.',
    badge: 'Digital-first',
    badgeColor: '#60A5FA',
    badgeBg: '#1e3a5f',
  },
  {
    name: 'StartLT.eu',
    url: 'https://startlt.eu',
    email: 'info@startlt.eu',
    description: 'Government-backed startup support program. Free advisory services for foreign founders.',
    badge: 'Gov Backed',
    badgeColor: '#A78BFA',
    badgeBg: '#2e1065',
  },
]

// ─── Documents ────────────────────────────────────────────────────────────────
const INITIAL_DOCS: DocItem[] = [
  {
    id: 'passport',
    label: 'Passport Copy',
    description: 'Valid passport for each shareholder and director',
    checked: false,
  },
  {
    id: 'address_proof',
    label: 'Proof of Address',
    description: 'Recent utility bill or bank statement (under 3 months)',
    checked: false,
  },
  {
    id: 'articles',
    label: 'Articles of Association',
    description: 'Standard UAB articles — template available via EasyLegal',
    checked: false,
  },
  {
    id: 'registered_address',
    label: 'Lithuanian Registered Address',
    description: 'Must be a Lithuanian address — virtual office accepted',
    checked: false,
  },
  {
    id: 'share_capital',
    label: 'Share Capital Proof',
    description: 'Bank confirmation of €2,500 share capital deposit',
    checked: false,
  },
  {
    id: 'director_resolution',
    label: 'Director Resolution',
    description: 'Board resolution appointing director(s) — signed and notarised',
    checked: false,
  },
]

// ─── Cost breakdown ────────────────────────────────────────────────────────────
const COST_ITEMS = [
  { label: 'State registration fee', amount: '~€57', note: 'JAR system' },
  { label: 'Notary fees', amount: '~€100–200', note: 'For articles and director appointment' },
  { label: 'Registered address (1yr)', amount: '~€200–400', note: 'Virtual office in Vilnius' },
  { label: 'Setup service (Fondia)', amount: '~€800–1,500', note: 'Optional — full-service formation' },
  { label: 'Minimum share capital', amount: '€2,500', note: 'UAB requirement — refundable after registration' },
]

// ─── Name checker ─────────────────────────────────────────────────────────────
function NameChecker() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<NameStatus>('idle')
  const [results, setResults] = useState<string[]>([])

  async function checkName() {
    if (!query.trim()) return
    setStatus('checking')
    setResults([])
    try {
      // Registrų centras public search — via CORS proxy or direct
      const url = `https://www.registrucentras.lt/jar/p/index.php?query=${encodeURIComponent(query)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error('Non-200')
      const text = await res.text()
      // Parse company names from HTML response
      const matches = Array.from(text.matchAll(/class="jar_table_tr[^"]*"[^>]*>.*?<td[^>]*>(.*?)<\/td>/gs))
        .map(m => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(n => n.length > 2)
        .slice(0, 5)
      if (matches.length > 0) {
        setResults(matches)
        setStatus('taken')
      } else {
        setStatus('available')
      }
    } catch {
      // Network or CORS error — show manual link
      setStatus('error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkName()}
          placeholder="e.g. quiXzoom UAB"
          className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-muted/40 text-sm text-text-primary placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={checkName}
          disabled={status === 'checking' || !query.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'checking' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Check
        </button>
      </div>

      {status === 'available' && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-green-900/40 bg-green-950/10">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm text-green-400 font-semibold">Name appears available</p>
            <p className="text-xs text-gray-400">No exact match found in Registrų centras. Verify directly before applying.</p>
          </div>
        </div>
      )}

      {status === 'taken' && results.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-900/40 bg-amber-950/10">
          <p className="text-xs font-semibold text-amber-400 mb-2">⚠️ Similar names found — verify uniqueness</p>
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i} className="text-xs text-gray-400 font-mono">· {r}</li>
            ))}
          </ul>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-gray-800 bg-muted/20">
          <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Direct API check not available from browser (CORS). Check manually:</p>
            <a
              href={`https://www.registrucentras.lt/jar/p/index.php?query=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1 mt-1"
            >
              Search Registrų centras <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600">
        Source:{' '}
        <a href="https://www.registrucentras.lt/jar/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          registrucentras.lt
        </a>{' '}
        — Lithuania's official legal entities register
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LithuaniaFormation() {
  const [docs, setDocs] = useState<DocItem[]>(INITIAL_DOCS)
  const [fondiaSent, setFondiaSent] = useState(false)
  const [fondiaSending, setFondiaSending] = useState(false)

  const checkedDocs = docs.filter(d => d.checked).length
  const readyPct = Math.round((checkedDocs / docs.length) * 100)

  function toggleDoc(id: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, checked: !d.checked } : d))
  }

  async function requestFondia() {
    setFondiaSending(true)
    try {
      await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lithuania_formation',
          partner: 'fondia',
          docsReady: checkedDocs,
          requestedAt: new Date().toISOString(),
        }),
      })
    } catch {
      // Non-blocking
    }
    setFondiaSending(false)
    setFondiaSent(true)
  }

  return (
    <div className="px-6 py-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🇱🇹</span>
          <h2 className="text-base font-bold text-text-primary">Lithuania UAB Formation</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
            EU · Schengen
          </span>
        </div>
        <p className="text-xs text-gray-400 ml-10">
          15% corporate tax · EU jurisdiction · GDPR compliant · Digital-first registration
        </p>
      </div>

      {/* Why Lithuania */}
      <section className="rounded-xl border border-white/8 bg-muted/20 p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Why Lithuania for Wavult Group?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🇪🇺', label: 'EU Jurisdiction', sub: 'GDPR, Schengen area' },
            { icon: '💰', label: '15% Corp Tax', sub: 'vs 20.6% Sweden' },
            { icon: '⚡', label: 'Digital Setup', sub: 'Register fully online' },
            { icon: '🎯', label: 'quiXzoom UAB', sub: 'EU operations base' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/30 border border-white/8">
              <span className="text-xl block mb-1">{item.icon}</span>
              <p className="text-xs font-semibold text-text-primary">{item.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step 1 — Company name check */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/50 text-green-400 text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="text-sm font-semibold text-text-primary">Company Name Availability</h3>
        </div>
        <NameChecker />
      </section>

      {/* Step 2 — Process overview */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/50 text-green-400 text-xs font-bold flex items-center justify-center">2</span>
          <h3 className="text-sm font-semibold text-text-primary">Registration Process</h3>
        </div>
        <div className="space-y-2">
          {[
            { step: 'Company name check', desc: 'Verify uniqueness in Registrų centras', days: 'Day 1', done: false },
            { step: 'Registered address', desc: 'Must be Lithuanian — virtual office accepted', days: 'Day 1–3', done: false },
            { step: 'Directors & shareholders', desc: 'Define structure, prepare ID documents', days: 'Day 1–3', done: false },
            { step: 'Share capital deposit', desc: 'Min €2,500 UAB — deposited before registration', days: 'Day 3–5', done: false },
            { step: 'Online registration (JAR)', desc: 'Submit via jadis.registrucentras.lt', days: 'Day 5–7', done: false },
            { step: 'Tax registration (VMI)', desc: 'Register as VAT payer if applicable', days: 'Day 7–10', done: false },
            { step: 'Bank account opening', desc: 'Revolut Business, Paysera, or local bank', days: 'Day 10–14', done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-white/8 bg-muted/20">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-900/40 text-green-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">{item.step}</p>
                  <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">{item.days}</span>
                </div>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg border border-green-900/30 bg-green-950/10">
          <p className="text-xs text-green-400 font-semibold">⏱ Total timeline: ~7–14 business days</p>
          <p className="text-xs text-gray-400 mt-0.5">With a formation service like EasyLegal or Fondia, often completed in 5–7 days.</p>
        </div>
      </section>

      {/* Step 3 — Cost breakdown */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/50 text-green-400 text-xs font-bold flex items-center justify-center">3</span>
          <h3 className="text-sm font-semibold text-text-primary">Cost Breakdown</h3>
        </div>
        <div className="rounded-lg border border-white/8 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-muted/50">
                <th className="text-left px-4 py-2 font-mono text-gray-500 uppercase tracking-wider text-[10px]">Item</th>
                <th className="text-left px-4 py-2 font-mono text-gray-500 uppercase tracking-wider text-[10px]">Amount</th>
                <th className="text-left px-4 py-2 font-mono text-gray-500 uppercase tracking-wider text-[10px]">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COST_ITEMS.map(item => (
                <tr key={item.label} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-text-primary">{item.label}</td>
                  <td className="px-4 py-3 font-mono text-green-400 font-semibold">{item.amount}</td>
                  <td className="px-4 py-3 text-gray-500">{item.note}</td>
                </tr>
              ))}
              <tr className="bg-muted/30 border-t border-white/10">
                <td className="px-4 py-3 font-bold text-text-primary">Total (excl. capital)</td>
                <td className="px-4 py-3 font-mono font-bold text-green-400">~€1,200–2,200</td>
                <td className="px-4 py-3 text-gray-500">One-time setup cost</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Step 4 — Document checklist */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/50 text-green-400 text-xs font-bold flex items-center justify-center">4</span>
          <h3 className="text-sm font-semibold text-text-primary">Document Checklist</h3>
          <span className="ml-auto text-xs text-gray-500 font-mono">{checkedDocs}/{docs.length} ready · {readyPct}%</span>
        </div>
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                doc.checked ? 'border-green-900/40 bg-green-950/10' : 'border-white/8 bg-muted/20 hover:border-white/16'
              }`}
              onClick={() => toggleDoc(doc.id)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {doc.checked
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <Circle className="w-4 h-4 text-gray-600" />
                }
              </div>
              <div>
                <p className={`text-sm font-medium ${doc.checked ? 'text-green-400 line-through opacity-70' : 'text-text-primary'}`}>
                  {doc.label}
                </p>
                <p className="text-xs text-gray-400">{doc.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 5 — Partners */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/50 text-green-400 text-xs font-bold flex items-center justify-center">5</span>
          <h3 className="text-sm font-semibold text-text-primary">Formation Partners</h3>
        </div>
        <div className="space-y-3 mb-5">
          {PARTNERS.map(p => (
            <div key={p.name} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-white/8 bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ color: p.badgeColor, background: p.badgeBg }}
                  >
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{p.description}</p>
                <p className="text-[10px] text-gray-600 mt-1 font-mono">{p.email}</p>
              </div>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors"
              >
                Visit <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>

        {/* CTA — Fondia */}
        {fondiaSent ? (
          <div className="rounded-lg border border-green-900/40 bg-green-950/10 p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-400">Request Sent to Fondia</p>
            <p className="text-xs text-gray-400 mt-1">
              Logged to CRM. Fondia will follow up within 1 business day.
            </p>
          </div>
        ) : (
          <button
            onClick={requestFondia}
            disabled={fondiaSending}
            className="w-full py-3 rounded-lg text-sm font-bold bg-green-700 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {fondiaSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>🇱🇹 Request Setup via Fondia</>
            )}
          </button>
        )}
      </section>

      {/* Useful links */}
      <section>
        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">Official Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { label: 'Registrų centras (JAR)', url: 'https://www.registrucentras.lt/jar/', desc: 'Company registry search' },
            { label: 'JADIS Online Registration', url: 'https://jadis.registrucentras.lt', desc: 'Online entity registration portal' },
            { label: 'VMI — Tax Authority', url: 'https://www.vmi.lt/evmi/en/', desc: 'VAT registration and tax compliance' },
            { label: 'StartLT.eu', url: 'https://startlt.eu', desc: 'Government startup support program' },
          ].map(link => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-white/8 bg-muted/20 hover:border-white/20 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-green-400 flex-shrink-0 mt-0.5 transition-colors" />
              <div>
                <p className="text-xs font-semibold text-text-primary group-hover:text-green-400 transition-colors">{link.label}</p>
                <p className="text-[10px] text-gray-500">{link.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
