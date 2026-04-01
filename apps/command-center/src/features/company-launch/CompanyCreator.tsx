import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CompanyStep {
  id: string
  label: string
  done: boolean
  date?: string
  eta?: string
  requires?: string
  url?: string
}

interface Company {
  id: string
  name: string
  jurisdiction: string
  flag: string
  createdAt: string | null
  fileNumber?: string
  steps: CompanyStep[]
}

// ─── Jurisdictions ────────────────────────────────────────────────────────────
const JURISDICTIONS = [
  { id: 'delaware', label: 'Delaware C-Corp', flag: '🇺🇸', days: 2, cost: '$500' },
  { id: 'sweden-ab', label: 'Aktiebolag (Sverige)', flag: '🇸🇪', days: 5, cost: '~2 000 SEK' },
  { id: 'lithuania-uab', label: 'UAB (Litauen)', flag: '🇱🇹', days: 7, cost: '~300 EUR' },
  { id: 'dubai-dmcc', label: 'DMCC Free Zone (Dubai)', flag: '🇦🇪', days: 14, cost: '~15 000 AED' },
  { id: 'dubai-ifza', label: 'IFZA Free Zone (Dubai)', flag: '🇦🇪', days: 10, cost: '~12 000 AED' },
  { id: 'texas-llc', label: 'Texas LLC (USA)', flag: '🇺🇸', days: 3, cost: '$300' },
]

// ─── Default steps per jurisdiction ──────────────────────────────────────────
function getDefaultSteps(jurisdiction: string): CompanyStep[] {
  switch (jurisdiction) {
    case 'delaware':
      return [
        { id: 'incorporation', label: 'Incorporated (Delaware)', done: false },
        { id: 'ss4', label: 'SS-4 (EIN application)', done: false, requires: 'incorporation' },
        { id: '83b', label: '83(b) election filed', done: false, requires: 'incorporation' },
        { id: 'ein', label: 'EIN received from IRS', done: false, requires: 'ss4', eta: '~4–6 weeks' },
        { id: 'bank', label: 'Business bank account', done: false, requires: 'EIN' },
        { id: 'stripe', label: 'Stripe live payments', done: false, requires: 'EIN + bank' },
        { id: 'good-standing', label: 'Certificate of Good Standing', done: false, requires: 'EIN' },
      ]
    case 'sweden-ab':
      return [
        { id: 'registration', label: 'Registrerat hos Bolagsverket', done: false },
        { id: 'bankgiro', label: 'Bankgiro öppnat', done: false, requires: 'registration' },
        { id: 'vat', label: 'Momsregistrering', done: false, requires: 'registration' },
        { id: 'operational', label: 'Operativt aktiv', done: false, requires: 'bankgiro + vat' },
      ]
    case 'lithuania-uab':
      return [
        { id: 'registration', label: 'Registrerat hos Registrų centras', done: false },
        { id: 'address', label: 'Registered address set', done: false, requires: 'registration' },
        { id: 'bank', label: 'Bank account (Paysera/Revolut LT)', done: false, requires: 'registration' },
        { id: 'vat', label: 'VAT registration (EU)', done: false, requires: 'bank' },
      ]
    case 'dubai-dmcc':
      return [
        { id: 'application', label: 'DMCC application submitted', done: false },
        { id: 'approval', label: 'DMCC approval', done: false, requires: 'application' },
        { id: 'license', label: 'Business license issued', done: false, requires: 'approval' },
        { id: 'bank', label: 'Emirates NBD account', done: false, requires: 'license' },
        { id: 'ip-transfer', label: 'IP ownership transfer', done: false, requires: 'license' },
      ]
    case 'dubai-ifza':
      return [
        { id: 'application', label: 'IFZA application submitted', done: false },
        { id: 'approval', label: 'IFZA approval', done: false, requires: 'application' },
        { id: 'license', label: 'Business license issued', done: false, requires: 'approval' },
        { id: 'bank', label: 'Bank account opened', done: false, requires: 'license' },
      ]
    case 'texas-llc':
      return [
        { id: 'formation', label: 'LLC formation filed (Texas SOS)', done: false },
        { id: 'ein', label: 'EIN received from IRS', done: false, requires: 'formation' },
        { id: 'bank', label: 'Business bank account', done: false, requires: 'EIN' },
        { id: 'stripe', label: 'Stripe live payments', done: false, requires: 'EIN + bank' },
      ]
    default:
      return [
        { id: 'registration', label: 'Company registered', done: false },
        { id: 'bank', label: 'Bank account opened', done: false, requires: 'registration' },
        { id: 'operational', label: 'Operationally active', done: false, requires: 'bank' },
      ]
  }
}

// ─── Pre-populated Wavult companies ──────────────────────────────────────────
const WAVULT_COMPANIES: Company[] = [
  {
    id: 'quixzoom-inc',
    name: 'quiXzoom Inc.',
    jurisdiction: 'delaware',
    flag: '🇺🇸',
    createdAt: '2026-03-25',
    fileNumber: 'SR# 20261400677',
    steps: [
      { id: 'incorporation', label: 'Incorporated (Delaware)', done: true, date: '2026-03-25' },
      { id: 'ss4', label: 'SS-4 (EIN application)', done: true, date: '2026-03-27' },
      { id: '83b', label: '83(b) election — USPS Certified Mail, levereras 4 april (spår: 9207190235890900003840620​5)', done: true, date: '2026-03-30' },
      { id: 'ein', label: 'EIN received from IRS', done: false, eta: '~April 8–15' },
      { id: 'bank', label: 'Business bank account', done: false, requires: 'EIN' },
      { id: 'stripe', label: 'Stripe live payments', done: false, requires: 'EIN + bank' },
      { id: 'good-standing', label: 'Certificate of Good Standing', done: false, requires: 'EIN' },
    ],
  },
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    jurisdiction: 'sweden-ab',
    flag: '🇸🇪',
    createdAt: '2024-01-01',
    fileNumber: '559141-7042',
    steps: [
      { id: 'registration', label: 'Registrerat hos Bolagsverket', done: true },
      { id: 'bankgiro', label: 'Bankgiro öppnat', done: false },
      { id: 'vat', label: 'Momsregistrering', done: false },
      { id: 'operational', label: 'Operativt aktiv', done: false },
    ],
  },
  {
    id: 'wavult-group-dmcc',
    name: 'Wavult Group DMCC',
    jurisdiction: 'dubai-dmcc',
    flag: '🇦🇪',
    createdAt: null,
    steps: [
      { id: 'application', label: 'DMCC application submitted', done: false },
      { id: 'approval', label: 'DMCC approval', done: false },
      { id: 'license', label: 'Business license issued', done: false },
      { id: 'bank', label: 'Emirates NBD account', done: false },
      { id: 'ip-transfer', label: 'IP ownership transfer', done: false },
    ],
  },
  {
    id: 'devops-fzco',
    name: 'DevOps FZCO',
    jurisdiction: 'dubai-dmcc',
    flag: '🇦🇪',
    createdAt: null,
    steps: [
      { id: 'application', label: 'DMCC application submitted', done: false },
      { id: 'approval', label: 'DMCC approval', done: false },
      { id: 'license', label: 'Business license issued', done: false },
      { id: 'bank', label: 'Bank account opened', done: false },
    ],
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    jurisdiction: 'lithuania-uab',
    flag: '🇱🇹',
    createdAt: null,
    steps: [
      { id: 'registration', label: 'Registrerat hos Registrų centras', done: false },
      { id: 'address', label: 'Registered address set', done: false },
      { id: 'bank', label: 'Bank account (Paysera/Revolut LT)', done: false },
      { id: 'vat', label: 'VAT registration (EU)', done: false },
    ],
  },
]

const STORAGE_KEY = 'wavult_companies'

function loadCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return WAVULT_COMPANIES
}

function saveCompanies(companies: Company[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcProgress(steps: CompanyStep[]) {
  if (!steps.length) return 0
  return Math.round((steps.filter(s => s.done).length / steps.length) * 100)
}

function getJurisdictionLabel(id: string) {
  return JURISDICTIONS.find(j => j.id === id)?.label ?? id
}

function getStatusInfo(pct: number) {
  if (pct === 0) return { emoji: '⚪', label: 'Not started', borderColor: '#374151', barColor: '#6B7280', pulse: false }
  if (pct < 50) return { emoji: '🟡', label: `In progress ${pct}%`, borderColor: '#D97706', barColor: '#F59E0B', pulse: true }
  if (pct < 100) return { emoji: '🔵', label: `In progress ${pct}%`, borderColor: '#2563EB', barColor: '#3B82F6', pulse: false }
  return { emoji: '🟢', label: 'Complete', borderColor: '#059669', barColor: '#10B981', pulse: false }
}

// ─── Step row component ───────────────────────────────────────────────────────
function StepItem({
  step,
  onToggle,
}: {
  step: CompanyStep
  onToggle: () => void
}) {
  const icon = step.done ? '✅' : step.eta ? '⏳' : '⬜'

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-2 py-1 text-left group transition-opacity hover:opacity-80"
      title={step.done ? 'Click to undo' : 'Click to mark done'}
    >
      <span className="flex-shrink-0 text-sm leading-5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs leading-5 ${
            step.done ? 'line-through text-gray-500' : 'text-gray-300'
          }`}
        >
          {step.label}
        </span>
        {!step.done && step.eta && (
          <span className="text-[10px] text-amber-400 ml-1 font-mono">{step.eta}</span>
        )}
        {!step.done && step.requires && !step.eta && (
          <span className="text-[10px] text-gray-500 ml-1">needs {step.requires}</span>
        )}
        {step.done && step.date && (
          <span className="text-[10px] text-green-600 ml-1 font-mono">{step.date}</span>
        )}
      </div>
    </button>
  )
}

// ─── Company card ─────────────────────────────────────────────────────────────
function CompanyCard({
  company,
  onToggleStep,
  onDelete,
}: {
  company: Company
  onToggleStep: (companyId: string, stepId: string) => void
  onDelete: (companyId: string) => void
}) {
  const pct = calcProgress(company.steps)
  const status = getStatusInfo(pct)
  const jurisLabel = getJurisdictionLabel(company.jurisdiction)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 relative group"
      style={{
        border: `1.5px solid ${status.borderColor}`,
        background: 'rgba(255,255,255,0.03)',
        minWidth: 240,
        maxWidth: 300,
      }}
    >
      {/* Delete button */}
      <button
        onClick={() => onDelete(company.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 text-xs px-1"
        title="Remove company"
      >
        ✕
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xl leading-none">{company.flag}</span>
          <span className="text-sm font-bold text-white leading-tight">{company.name}</span>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <span className="text-[11px] text-gray-400">{jurisLabel}</span>
          {company.fileNumber && (
            <span className="text-[10px] font-mono text-gray-500">{company.fileNumber}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono text-gray-400">{pct}%</span>
          <span className="text-xs flex items-center gap-1">
            <span>{status.emoji}</span>
            <span
              className="text-[11px]"
              style={{
                color: status.barColor,
                animation: status.pulse ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
              }}
            >
              {status.label}
            </span>
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: status.barColor,
              boxShadow: pct > 0 ? `0 0 6px ${status.barColor}66` : 'none',
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-0.5">
        {company.steps.map(step => (
          <StepItem
            key={step.id}
            step={step}
            onToggle={() => onToggleStep(company.id, step.id)}
          />
        ))}
      </div>

      {/* Created date */}
      {company.createdAt && (
        <div className="text-[10px] text-gray-600 font-mono pt-1 border-t border-white/5">
          Created {company.createdAt}
        </div>
      )}
      {!company.createdAt && (
        <div className="text-[10px] text-gray-600 font-mono pt-1 border-t border-white/5">
          Not yet started
        </div>
      )}
    </div>
  )
}

// ─── New Company Modal ────────────────────────────────────────────────────────
function NewCompanyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (company: Company) => void
}) {
  const [name, setName] = useState('')
  const [jurisdiction, setJurisdiction] = useState('delaware')

  const selected = JURISDICTIONS.find(j => j.id === jurisdiction) ?? JURISDICTIONS[0]

  function handleCreate() {
    if (!name.trim()) return
    const now = new Date().toISOString().split('T')[0]
    const newCompany: Company = {
      id: `company-${Date.now()}`,
      name: name.trim(),
      jurisdiction,
      flag: selected.flag,
      createdAt: now,
      steps: getDefaultSteps(jurisdiction),
    }
    onCreate(newCompany)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5"
        style={{
          background: '#111827',
          border: '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-white">+ Nytt bolag</h2>
          <p className="text-xs text-gray-400 mt-0.5">Namn → jurisdiktion → klar. Vi sköter resten.</p>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Bolagsnamn</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="My Startup Inc."
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          />
        </div>

        {/* Jurisdiction dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Jurisdiktion</label>
          <div className="flex gap-2 flex-wrap">
            {[{id:'delaware',label:'🇺🇸 Delaware'},{id:'sweden-ab',label:'🇸🇪 Sverige'},{id:'dubai-dmcc',label:'🇦🇪 Dubai'},{id:'lithuania-uab',label:'🇱🇹 Litauen'}].map(opt => (
              <button key={opt.id} onClick={() => setJurisdiction(opt.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                style={{background: jurisdiction===opt.id ? '#2563EB' : 'rgba(255,255,255,0.06)', color: jurisdiction===opt.id ? '#fff' : 'rgba(255,255,255,0.6)', border: `1px solid ${jurisdiction===opt.id ? '#2563EB' : 'rgba(255,255,255,0.12)'}`}}>
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={jurisdiction}
            onChange={e => setJurisdiction(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none appearance-none cursor-pointer transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {JURISDICTIONS.map(j => (
              <option key={j.id} value={j.id} style={{ background: '#1f2937' }}>
                {j.flag} {j.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timeline & cost */}
        <div
          className="flex items-center gap-4 px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Timeline</span>
            <span className="text-sm font-semibold text-white">~{selected.days} days</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Kostnad</span>
            <span className="text-sm font-semibold text-white">{selected.cost}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Steg</span>
            <span className="text-sm font-semibold text-white">{getDefaultSteps(jurisdiction).length}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-400 transition-colors hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Avbryt
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
          >
            Skapa bolag →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main CompanyCreator ──────────────────────────────────────────────────────
export function CompanyCreator() {
  const [companies, setCompanies] = useState<Company[]>(loadCompanies)
  const [showModal, setShowModal] = useState(false)

  // Persist on change
  useEffect(() => {
    saveCompanies(companies)
  }, [companies])

  function handleToggleStep(companyId: string, stepId: string) {
    setCompanies(prev =>
      prev.map(c => {
        if (c.id !== companyId) return c
        return {
          ...c,
          steps: c.steps.map(s =>
            s.id === stepId ? { ...s, done: !s.done } : s
          ),
        }
      })
    )
  }

  function handleCreate(company: Company) {
    setCompanies(prev => [...prev, company])
  }

  function handleDelete(companyId: string) {
    // Only allow deleting user-created companies (not pre-populated ones)
    const prePopulated = WAVULT_COMPANIES.map(c => c.id)
    if (prePopulated.includes(companyId)) {
      if (!confirm('Ta bort detta bolag från vyn? (Det kan inte ångras)')) return
    }
    setCompanies(prev => prev.filter(c => c.id !== companyId))
  }

  const total = companies.length
  const complete = companies.filter(c => calcProgress(c.steps) === 100).length
  const inProgress = companies.filter(c => {
    const p = calcProgress(c.steps)
    return p > 0 && p < 100
  }).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-white">🏢 Bolagsportfölj</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} bolag &middot; {complete} klara &middot; {inProgress} aktiva
          </p>
        </div>

        {/* Create button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            boxShadow: '0 4px 15px rgba(37,99,235,0.4)',
          }}
        >
          <span className="text-base leading-none">+</span>
          <span>Skapa nytt bolag</span>
        </button>
      </div>

      {/* ── Cards grid ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <span className="text-5xl">🏢</span>
            <div>
              <p className="text-sm font-semibold text-gray-300">Inga bolag ännu</p>
              <p className="text-xs text-gray-500 mt-1">Klicka på "+ Skapa nytt bolag" för att komma igång</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
            >
              + Skapa första bolaget
            </button>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              alignItems: 'start',
            }}
          >
            {companies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                onToggleStep={handleToggleStep}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer summary ── */}
      <div className="px-6 py-3 border-t border-white/8 flex-shrink-0 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">⚪ Ej startade</span>
          <span className="text-sm font-bold text-gray-300">{companies.filter(c => calcProgress(c.steps) === 0).length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">🟡 Pågående</span>
          <span className="text-sm font-bold text-amber-400">{inProgress}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">🟢 Klara</span>
          <span className="text-sm font-bold text-green-400">{complete}</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-gray-600">
          Sparas lokalt i localStorage
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <NewCompanyModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
