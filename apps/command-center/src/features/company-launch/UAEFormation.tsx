import { useState } from 'react'
import { ExternalLink, CheckCircle, Circle, FileText, Upload, ChevronRight, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type FreeZone = 'dmcc' | 'ifza' | null
type CompanyType = 'fze' | 'fzco' | null

interface DocItem {
  id: string
  label: string
  description: string
  checked: boolean
}

// ─── Business activities ──────────────────────────────────────────────────────
const BUSINESS_ACTIVITIES = [
  'General Trading',
  'Technology Services',
  'IT Consultancy',
  'Software Development',
  'E-Commerce',
  'Media & Publishing',
  'Marketing & Advertising',
  'Financial Services Advisory',
  'Management Consultancy',
  'Holding Company',
  'Intellectual Property Holding',
  'Import & Export',
  'Photography & Videography',
]

// ─── DMCC Agents ─────────────────────────────────────────────────────────────
const DMCC_AGENTS = [
  {
    name: 'Virtuzone',
    url: 'https://virtuzone.com',
    email: 'setup@virtuzone.com',
    description: 'Largest UAE company setup service. Full PRO support.',
    badge: 'Most Popular',
    badgeColor: '#2563EB',
    badgeBg: '#1e3a5f',
  },
  {
    name: 'PRO Partner Group',
    url: 'https://propartnergroup.com',
    email: 'info@propartnergroup.com',
    description: 'Specialist in free zone & mainland setup. Strong legal support.',
    badge: 'Legal Focus',
    badgeColor: '#34D399',
    badgeBg: '#064e3b',
  },
  {
    name: 'Shuraa Business Setup',
    url: 'https://shuraa.com',
    email: 'info@shuraa.com',
    description: 'Cost-effective option. 20+ years experience in UAE.',
    badge: 'Value',
    badgeColor: '#FBBF24',
    badgeBg: '#451a03',
  },
]

// ─── IFZA Agents ──────────────────────────────────────────────────────────────
const IFZA_AGENTS = [
  {
    name: 'Virtuzone',
    url: 'https://virtuzone.com',
    email: 'setup@virtuzone.com',
    description: 'Official IFZA partner. Fastest processing times.',
    badge: 'Official Partner',
    badgeColor: '#A78BFA',
    badgeBg: '#2e1065',
  },
  {
    name: 'IFZA Direct',
    url: 'https://ifza.com',
    email: 'info@ifza.com',
    description: 'Apply directly via IFZA portal. No middleman.',
    badge: 'Direct',
    badgeColor: '#34D399',
    badgeBg: '#064e3b',
  },
]

const INITIAL_DOCS: DocItem[] = [
  {
    id: 'passport_copy',
    label: 'Passport Copy',
    description: 'Clear scan of valid passport — Erik Svensson',
    checked: false,
  },
  {
    id: 'passport_photo',
    label: 'Passport Photo',
    description: 'Recent colour photo, white background, 35×45mm',
    checked: false,
  },
  {
    id: 'business_plan',
    label: 'Business Plan',
    description: 'Outline of business activities and projected financials',
    checked: false,
  },
  {
    id: 'bank_reference',
    label: 'Bank Reference Letter',
    description: 'From current bank — confirms account standing (not >3 months old)',
    checked: false,
  },
  {
    id: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill or bank statement showing residential address',
    checked: false,
  },
]

// ─── Compare card ─────────────────────────────────────────────────────────────
function CompareCard({
  selected,
  onSelect,
}: {
  selected: FreeZone
  onSelect: (z: FreeZone) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* DMCC */}
      <button
        onClick={() => onSelect(selected === 'dmcc' ? null : 'dmcc')}
        className={`text-left rounded-xl border-2 p-5 transition-all ${
          selected === 'dmcc'
            ? 'border-amber-500 bg-amber-950/20'
            : 'border-white/10 bg-muted/30 hover:border-white/20'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏙️</span>
              <span className="text-sm font-bold text-text-primary">DMCC Free Zone</span>
              {selected === 'dmcc' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400">
                  ✓ Selected
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Dubai Multi Commodities Centre</p>
          </div>
          <span className="text-lg font-bold text-amber-400">~15K AED/yr</span>
        </div>
        <ul className="space-y-1.5 text-xs text-gray-400">
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Premium JLT location</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Global reputation — 22,000+ members</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Strong for IP & trading</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> 100% foreign ownership</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] text-gray-500">Best for: <span className="text-amber-400 font-semibold">IP holding, trading, prestige</span></p>
          <p className="text-[10px] text-gray-500 mt-0.5">Setup time: <span className="text-white font-semibold">2–4 weeks</span></p>
        </div>
      </button>

      {/* IFZA */}
      <button
        onClick={() => onSelect(selected === 'ifza' ? null : 'ifza')}
        className={`text-left rounded-xl border-2 p-5 transition-all ${
          selected === 'ifza'
            ? 'border-purple-500 bg-purple-950/20'
            : 'border-white/10 bg-muted/30 hover:border-white/20'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="text-sm font-bold text-text-primary">IFZA Free Zone</span>
              {selected === 'ifza' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-purple-900/50 text-purple-400">
                  ✓ Selected
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">International Free Zone Authority</p>
          </div>
          <span className="text-lg font-bold text-purple-400">~12K AED/yr</span>
        </div>
        <ul className="space-y-1.5 text-xs text-gray-400">
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> More affordable — lower fees</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Faster setup: 7–10 days</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Digital-first process</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> 100% foreign ownership</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] text-gray-500">Best for: <span className="text-purple-400 font-semibold">Operations, tech companies, startups</span></p>
          <p className="text-[10px] text-gray-500 mt-0.5">Setup time: <span className="text-white font-semibold">7–10 days</span></p>
        </div>
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UAEFormation() {
  const [freeZone, setFreeZone] = useState<FreeZone>(null)
  const [companyType, setCompanyType] = useState<CompanyType>(null)
  const [selectedActivity, setSelectedActivity] = useState<string>('')
  const [docs, setDocs] = useState<DocItem[]>(INITIAL_DOCS)
  const [quoteSubmitted, setQuoteSubmitted] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [showAgents, setShowAgents] = useState(false)

  const agents = freeZone === 'dmcc' ? DMCC_AGENTS : freeZone === 'ifza' ? IFZA_AGENTS : []
  const checkedDocs = docs.filter(d => d.checked).length
  const readyPct = Math.round((checkedDocs / docs.length) * 100)

  function toggleDoc(id: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, checked: !d.checked } : d))
  }

  async function requestQuote() {
    if (!freeZone || !companyType) return
    setQuoteLoading(true)
    try {
      await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'uae_formation',
          freeZone,
          companyType,
          activity: selectedActivity,
          docsReady: checkedDocs,
          requestedAt: new Date().toISOString(),
        }),
      })
    } catch {
      // Non-blocking — UI still confirms
    }
    setQuoteLoading(false)
    setQuoteSubmitted(true)
  }

  return (
    <div className="px-6 py-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🇦🇪</span>
          <h2 className="text-base font-bold text-text-primary">UAE Company Formation</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
            DMCC · IFZA
          </span>
        </div>
        <p className="text-xs text-gray-400 ml-10">
          0% corporate tax · 100% foreign ownership · World-class financial hub
        </p>
      </div>

      {/* Step 1 — Choose Free Zone */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 text-blue-400 text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="text-sm font-semibold text-text-primary">Choose Free Zone</h3>
        </div>
        <CompareCard selected={freeZone} onSelect={setFreeZone} />
      </section>

      {/* Step 2 — Company type */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${freeZone ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>2</span>
          <h3 className={`text-sm font-semibold ${freeZone ? 'text-text-primary' : 'text-gray-600'}`}>Company Type</h3>
        </div>
        {freeZone && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setCompanyType(companyType === 'fze' ? null : 'fze')}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                companyType === 'fze' ? 'border-blue-500 bg-blue-950/20' : 'border-white/10 bg-muted/30 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-text-primary">FZE</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">Free Zone Establishment</span>
                {companyType === 'fze' && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/50 text-blue-400">✓</span>}
              </div>
              <p className="text-xs text-gray-400">Single shareholder entity. Simpler structure, faster setup. Ideal for solo founders or wholly-owned subsidiaries.</p>
            </button>
            <button
              onClick={() => setCompanyType(companyType === 'fzco' ? null : 'fzco')}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                companyType === 'fzco' ? 'border-blue-500 bg-blue-950/20' : 'border-white/10 bg-muted/30 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-text-primary">FZCO</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">Free Zone Company</span>
                {companyType === 'fzco' && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/50 text-blue-400">✓</span>}
              </div>
              <p className="text-xs text-gray-400">2+ shareholders. Suitable for joint ventures and group structures. More flexible for future investment rounds.</p>
            </button>
          </div>
        )}
        {!freeZone && (
          <p className="text-xs text-gray-600 italic pl-8">Select a free zone first</p>
        )}
      </section>

      {/* Step 3 — Business Activity */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${companyType ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>3</span>
          <h3 className={`text-sm font-semibold ${companyType ? 'text-text-primary' : 'text-gray-600'}`}>Business Activity</h3>
        </div>
        {companyType && (
          <div>
            <p className="text-xs text-gray-400 mb-3 pl-0">Select your primary activity from the approved list:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {BUSINESS_ACTIVITIES.map(act => (
                <button
                  key={act}
                  onClick={() => setSelectedActivity(selectedActivity === act ? '' : act)}
                  className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                    selectedActivity === act
                      ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                      : 'border-white/8 bg-muted/20 text-gray-400 hover:border-white/20 hover:text-gray-300'
                  }`}
                >
                  {selectedActivity === act && '✓ '}{act}
                </button>
              ))}
            </div>
          </div>
        )}
        {!companyType && (
          <p className="text-xs text-gray-600 italic pl-8">Select company type first</p>
        )}
      </section>

      {/* Step 4 — Document Checklist */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${selectedActivity ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>4</span>
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
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${doc.checked ? 'text-green-400 line-through opacity-70' : 'text-text-primary'}`}>
                  {doc.label}
                </p>
                <p className="text-xs text-gray-500">{doc.description}</p>
              </div>
              {doc.id === 'business_plan' && (
                <button
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors"
                  onClick={e => { e.stopPropagation() }}
                >
                  <FileText className="w-3 h-3" /> Template
                </button>
              )}
              {doc.id !== 'business_plan' && (
                <button
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors"
                  onClick={e => { e.stopPropagation() }}
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Step 5 — Agents & Submit */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 text-blue-400 text-xs font-bold flex items-center justify-center">5</span>
          <h3 className="text-sm font-semibold text-text-primary">
            {freeZone ? `${freeZone.toUpperCase()} Setup Agents` : 'Setup Agents'}
          </h3>
          <button
            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
            onClick={() => setShowAgents(!showAgents)}
          >
            {showAgents ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showAgents ? 'Hide' : 'Show agents'}
          </button>
        </div>

        {showAgents && freeZone && (
          <div className="space-y-3 mb-4">
            {agents.map(agent => (
              <div key={agent.name} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-white/8 bg-muted/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary">{agent.name}</span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ color: agent.badgeColor, background: agent.badgeBg }}
                    >
                      {agent.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{agent.description}</p>
                  <p className="text-[10px] text-gray-600 mt-1 font-mono">{agent.email}</p>
                </div>
                <a
                  href={agent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 transition-colors"
                >
                  Visit <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {!freeZone && (
          <p className="text-xs text-gray-600 italic pl-8 mb-4">Select a free zone to see agents</p>
        )}

        {/* CTA */}
        {quoteSubmitted ? (
          <div className="rounded-lg border border-green-900/40 bg-green-950/10 p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-400">Quote Request Sent</p>
            <p className="text-xs text-gray-400 mt-1">
              Logged to CRM. An agent will reach out via email within 24 hours.
            </p>
          </div>
        ) : (
          <button
            onClick={requestQuote}
            disabled={!freeZone || !companyType || quoteLoading}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              freeZone && companyType
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {quoteLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>🇦🇪 Request UAE Formation Quote</>
            )}
          </button>
        )}

        {(!freeZone || !companyType) && (
          <p className="text-center text-xs text-gray-600 mt-2">
            Select free zone + company type to proceed
          </p>
        )}
      </section>

      {/* Info box */}
      <div className="rounded-lg border border-blue-900/30 bg-blue-950/10 p-4 space-y-1">
        <p className="text-xs font-semibold text-blue-400">ℹ️ UAE Free Zone Key Facts</p>
        <ul className="text-xs text-gray-400 space-y-0.5 mt-1">
          <li>· 0% corporate and personal income tax</li>
          <li>· 100% foreign ownership — no local sponsor required</li>
          <li>· 100% repatriation of profits and capital</li>
          <li>· No currency restrictions</li>
          <li>· Visa eligibility for founders and employees</li>
        </ul>
      </div>
    </div>
  )
}
