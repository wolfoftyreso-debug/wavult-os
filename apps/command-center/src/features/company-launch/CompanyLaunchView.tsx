import { useState, useMemo } from 'react'
import { COMPANY_LAUNCHES, CompanyLaunch, LaunchStep } from './data'
import { CompanyLaunchWizard } from './CompanyLaunchWizard'
import { CompanyFormation } from './CompanyFormation'
import { BolagsverketSearch } from './BolagsverketSearch'
import { LagerbolagView } from './LagerbolagView'
import { CompanyCreator } from './CompanyCreator'
import { DelawareFormation } from './DelawareFormation'
import { UAEFormation } from './UAEFormation'
import { LithuaniaFormation } from './LithuaniaFormation'

// ─── Owner colours ────────────────────────────────────────────────────────────
const OWNER_META: Record<string, { label: string; color: string; bg: string }> = {
  erik:     { label: 'Erik',     color: '#60A5FA', bg: '#1e3a5f' },
  dennis:   { label: 'Dennis',   color: '#34D399', bg: '#064e3b' },
  winston:  { label: 'Winston',  color: '#FBBF24', bg: '#451a03' },
  leon:     { label: 'Leon',     color: '#F472B6', bg: '#500724' },
  external: { label: 'External', color: '#9CA3AF', bg: '#F9FAFB' },
}

// ─── Category meta ────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  registration: { label: 'Registration',  icon: '📝' },
  banking:      { label: 'Banking',        icon: '🏦' },
  legal:        { label: 'Legal',          icon: '⚖️' },
  tax:          { label: 'Tax',            icon: '🧾' },
  ip:           { label: 'IP & Trademarks', icon: '🔒' },
  compliance:   { label: 'Compliance',     icon: '✅' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCost(eur: number | undefined) {
  if (!eur) return null
  return `€${eur.toLocaleString()}`
}

function totalCost(steps: LaunchStep[]) {
  return steps.reduce((s, st) => s + (st.cost_eur ?? 0), 0)
}

function criticalPath(steps: LaunchStep[]) {
  // Simple estimate: sum max chain from deps
  const memo: Record<string, number> = {}
  function calc(id: string): number {
    if (memo[id] !== undefined) return memo[id]
    const step = steps.find(s => s.id === id)
    if (!step) return 0
    const base = step.prerequisites.length
      ? Math.max(...step.prerequisites.map(calc)) + step.estimated_days
      : step.estimated_days
    memo[id] = base
    return base
  }
  return Math.max(...steps.map(s => calc(s.id)))
}

function doneSteps(steps: LaunchStep[]) {
  return steps.filter(s => s.status === 'done').length
}

// ─── Mini progress bar ────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#60A5FA' }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CompanyLaunch['status'] }) {
  const map = {
    not_started: { label: 'Not Started', color: '#6B7280', bg: '#F9FAFB' },
    in_progress:  { label: 'In Progress', color: '#FBBF24', bg: '#451a03' },
    operational:  { label: 'Operational', color: '#34D399', bg: '#064e3b' },
  }
  const m = map[status]
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  )
}

// ─── Single step row ──────────────────────────────────────────────────────────
function StepRow({
  step,
  allSteps,
  onToggle,
}: {
  step: LaunchStep
  allSteps: LaunchStep[]
  onToggle: (id: string) => void
}) {
  const owner = OWNER_META[step.owner] ?? OWNER_META.external
  const isBlocked = step.prerequisites.some(pid => {
    const dep = allSteps.find(s => s.id === pid)
    return dep && dep.status !== 'done'
  })
  const done = step.status === 'done'

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border transition-all ${
        done
          ? 'border-white/5 opacity-50'
          : isBlocked
          ? 'border-red-900/30 bg-red-950/10'
          : 'border-white/8 bg-muted/30 hover:bg-muted/30'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(step.id)}
        disabled={isBlocked && !done}
        className={`flex-shrink-0 mt-0.5 h-4 w-4 rounded border transition-colors ${
          done
            ? 'bg-green-500 border-green-500'
            : isBlocked
            ? 'border-red-700 cursor-not-allowed'
            : 'border-gray-300 hover:border-white/40 cursor-pointer'
        }`}
        title={isBlocked && !done ? 'Blocked by prerequisite' : done ? 'Mark as pending' : 'Mark as done'}
      >
        {done && (
          <svg viewBox="0 0 12 12" fill="none" className="w-full h-full p-0.5">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={`text-sm font-medium ${done ? 'line-through text-gray-9000' : 'text-gray-900'}`}>
            {step.title}
          </span>

          {/* Owner badge */}
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ color: owner.color, background: owner.bg }}
          >
            {owner.label}
          </span>

          {/* Blocked tag */}
          {isBlocked && !done && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-700 flex-shrink-0">
              ⛔ blocked
            </span>
          )}
        </div>

        <p className="text-xs text-gray-9000">{step.description}</p>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-9000">
          <span>⏱ {step.estimated_days}d</span>
          {step.cost_eur && <span>💰 {fmtCost(step.cost_eur)}</span>}
          {step.external_url && (
            <a
              href={step.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              🔗 {new URL(step.external_url).hostname.replace('www.', '')}
            </a>
          )}
        </div>

        {/* Prerequisites */}
        {step.prerequisites.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-gray-600">requires:</span>
            {step.prerequisites.map(pid => {
              const dep = allSteps.find(s => s.id === pid)
              const depDone = dep?.status === 'done'
              return (
                <span
                  key={pid}
                  className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                    depDone ? 'text-green-600 bg-green-950/30' : 'text-red-500 bg-red-950/30'
                  }`}
                >
                  {pid}
                </span>
              )
            })}
          </div>
        )}

        {/* Evidence required */}
        <p className="text-xs text-gray-9000 italic">📎 {step.evidence_required}</p>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function CompanyLaunchView() {
  const [activeTab, setActiveTab] = useState<'bolag' | 'tracker' | 'wizard' | 'formation' | 'sok-bolag' | 'lagerbolag' | 'certificates' | 'uae' | 'lithuania' | 'delaware'>('bolag')
  const [companies, setCompanies] = useState<CompanyLaunch[]>(COMPANY_LAUNCHES)
  const [selectedId, setSelectedId] = useState<string>(COMPANY_LAUNCHES[0].id)

  const selected = companies.find(c => c.id === selectedId) ?? companies[0]

  // Group steps by category
  const byCategory = useMemo(() => {
    const groups: Record<string, LaunchStep[]> = {}
    for (const step of selected.steps) {
      if (!groups[step.category]) groups[step.category] = []
      groups[step.category].push(step)
    }
    return groups
  }, [selected])

  function toggleStep(companyId: string, stepId: string) {
    setCompanies(prev =>
      prev.map(c => {
        if (c.id !== companyId) return c
        const updatedSteps = c.steps.map(s => {
          if (s.id !== stepId) return s
          const newStatus = s.status === 'done' ? 'pending' : 'done'
          return { ...s, status: newStatus } as LaunchStep
        })
        const done = updatedSteps.filter(s => s.status === 'done').length
        const total = updatedSteps.length
        const newStatus: CompanyLaunch['status'] =
          done === total ? 'operational' : done > 0 ? 'in_progress' : 'not_started'
        return { ...c, steps: updatedSteps, status: newStatus }
      })
    )
  }

  const selDone = doneSteps(selected.steps)
  const selTotal = selected.steps.length
  const selCost = totalCost(selected.steps)
  const selDays = criticalPath(selected.steps)
  const selPct = selTotal === 0 ? 0 : Math.round((selDone / selTotal) * 100)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-muted/30 text-text-primary">
      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-white/8 flex-shrink-0">
        <button
          onClick={() => setActiveTab('bolag')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'bolag'
              ? 'border-blue-500 text-blue-400 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🏢 Bolag
        </button>
        <button
          onClick={() => setActiveTab('formation')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'formation'
              ? 'border-blue-600 text-blue-700 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🌍 Bilda bolag
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'tracker'
              ? 'border-blue-500 text-blue-500 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          📋 Launch Tracker
        </button>
        <button
          onClick={() => setActiveTab('wizard')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'wizard'
              ? 'border-indigo-500 text-indigo-500 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🚀 Starta ny registrering
        </button>
        <button
          onClick={() => setActiveTab('sok-bolag')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'sok-bolag'
              ? 'border-blue-500 text-blue-600 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🇸🇪 Sök bolag
        </button>
        <button
          onClick={() => setActiveTab('lagerbolag')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'lagerbolag'
              ? 'border-green-500 text-green-600 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🏢 Köp lagerbolag
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'certificates'
              ? 'border-amber-500 text-amber-500 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          📜 Certifikat
        </button>
        <button
          onClick={() => setActiveTab('uae')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'uae'
              ? 'border-amber-500 text-amber-400 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🇦🇪 UAE
        </button>
        <button
          onClick={() => setActiveTab('lithuania')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'lithuania'
              ? 'border-green-500 text-green-400 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🇱🇹 Litauen
        </button>
        <button
          onClick={() => setActiveTab('delaware')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'delaware'
              ? 'border-blue-400 text-blue-400 bg-muted/30'
              : 'border-transparent text-gray-9000 hover:text-gray-700'
          }`}
        >
          🇺🇸 Delaware
        </button>
      </div>

      {/* ── Bolag tab ── */}
      {activeTab === 'bolag' && (
        <div className="flex-1 overflow-hidden">
          <CompanyCreator />
        </div>
      )}

      {/* ── Formation tab ── */}
      {activeTab === 'formation' && (
        <div className="flex-1 overflow-y-auto">
          <CompanyFormation />
        </div>
      )}

      {/* ── Wizard tab ── */}
      {activeTab === 'wizard' && (
        <div className="flex-1 overflow-y-auto">
          <CompanyLaunchWizard />
        </div>
      )}

      {/* ── Sök bolag tab ── */}
      {activeTab === 'sok-bolag' && (
        <div className="flex-1 overflow-y-auto">
          <BolagsverketSearch />
        </div>
      )}

      {/* ── Lagerbolag tab ── */}
      {activeTab === 'lagerbolag' && (
        <div className="flex-1 overflow-y-auto">
          <LagerbolagView />
        </div>
      )}

      {/* ── UAE tab ── */}
      {activeTab === 'uae' && (
        <div className="flex-1 overflow-y-auto">
          <UAEFormation />
        </div>
      )}

      {/* ── Litauen tab ── */}
      {activeTab === 'lithuania' && (
        <div className="flex-1 overflow-y-auto">
          <LithuaniaFormation />
        </div>
      )}

      {/* ── Delaware tab ── */}
      {activeTab === 'delaware' && (
        <div className="flex-1 overflow-hidden">
          <DelawareFormation />
        </div>
      )}

      {/* ── Certifikat tab ── */}
      {activeTab === 'certificates' && (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* ── Header ── */}
          <div>
            <h2 className="text-base font-bold text-text-primary">📜 Certificate of Good Standing</h2>
            <p className="text-xs text-gray-9000 mt-1">
              Officiell bekräftelse att ett bolag är aktivt och i god ställning hos sin jurisdiktion.
              Krävs för bankkontoöppning, enterpriseavtal, investerarrelationer och visumansökningar.
            </p>
          </div>

          {/* ── US Entities ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🇺🇸</span>
              <h3 className="text-xs font-mono uppercase tracking-widest text-gray-9000">US Entities — via Legalinc / Stripe Atlas</h3>
            </div>
            <div className="space-y-3">

              {/* quiXzoom Inc. */}
              <div className="rounded-lg border border-white/8 bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary">quiXzoom Inc.</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#FBBF24', background: '#451a03' }}>Delaware C-Corp</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#F59E0B', background: '#78350f33' }}>⏳ EIN Pending</span>
                    </div>
                    <p className="text-xs text-gray-9000 mt-1">
                      Certificate of Good Standing krävs för: bankkontoöppning, enterpriseavtal, visumansökning, investerar-KYC
                    </p>
                  </div>
                  <button
                    disabled
                    className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-semibold opacity-40 cursor-not-allowed"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                    title="Beställ när EIN är klar"
                  >
                    Beställ när EIN klar
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-9000 flex-wrap">
                  <span>💰 ~$75–150</span>
                  <span>⏱ 2–5 arbetsdagar</span>
                  <span>🔗 Legalinc via Stripe Atlas</span>
                </div>
              </div>

              {/* Landvex Inc. */}
              <div className="rounded-lg border border-white/8 bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary">Landvex Inc.</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#60A5FA', background: '#1e3a5f' }}>Texas LLC</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#F87171', background: '#450a0a33' }}>❌ Ej beställd</span>
                    </div>
                    <p className="text-xs text-gray-9000 mt-1">
                      Certificate of Good Standing krävs för: bankkontoöppning, enterpriseavtal, visumansökning, investerar-KYC
                    </p>
                  </div>
                  <a
                    href="https://stripe.legalinc.com/certificate-of-good-standing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: '#1d4ed8', color: '#fff' }}
                  >
                    Beställ nu →
                  </a>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-9000 flex-wrap">
                  <span>💰 ~$75–150</span>
                  <span>⏱ 2–5 arbetsdagar</span>
                  <a href="https://stripe.legalinc.com/certificate-of-good-standing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline">stripe.legalinc.com</a>
                </div>
              </div>

            </div>
          </section>

          {/* ── Swedish Entities ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🇸🇪</span>
              <h3 className="text-xs font-mono uppercase tracking-widest text-gray-9000">Svenska Bolag — via Bolagsverket</h3>
            </div>
            <div className="rounded-lg border border-white/8 bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary">Landvex AB</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#34D399', background: '#064e3b' }}>559141-7042</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#F87171', background: '#450a0a33' }}>❌ Ej beställd</span>
                  </div>
                  <p className="text-xs text-gray-9000 mt-1">
                    Registreringsbevis från Bolagsverket — officiellt utdrag ur aktiebolagsregistret. Krävs vid bankrelationer och avtalsförhandlingar.
                  </p>
                </div>
                <a
                  href="https://www.verksamt.se/registreringsbevis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: '#065f46', color: '#6ee7b7' }}
                >
                  Bolagsverket →
                </a>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-9000 flex-wrap">
                <span>💰 ~200–500 kr</span>
                <span>⏱ 1–3 arbetsdagar</span>
                <a href="https://www.verksamt.se/registreringsbevis" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline">verksamt.se/registreringsbevis</a>
              </div>
            </div>
          </section>

          {/* ── Status Table ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-gray-9000">📊 Certifikatstatus — alla bolag</h3>
            </div>
            <div className="rounded-lg border border-white/8 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 bg-muted/50">
                    <th className="text-left px-4 py-2 font-mono text-gray-9000 uppercase tracking-wider text-[10px]">Entitet</th>
                    <th className="text-left px-4 py-2 font-mono text-gray-9000 uppercase tracking-wider text-[10px]">Jurisdiktion</th>
                    <th className="text-left px-4 py-2 font-mono text-gray-9000 uppercase tracking-wider text-[10px]">Status</th>
                    <th className="text-left px-4 py-2 font-mono text-gray-9000 uppercase tracking-wider text-[10px]">Senast förnyad</th>
                    <th className="text-left px-4 py-2 font-mono text-gray-9000 uppercase tracking-wider text-[10px]">Åtgärd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">quiXzoom Inc.</td>
                    <td className="px-4 py-3 text-gray-9000">Delaware</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#F59E0B', background: '#78350f33' }}>⏳ EIN pending</span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 font-mono">—</td>
                    <td className="px-4 py-3 text-gray-9000 italic text-[11px]">Beställ när EIN klar</td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">Landvex Inc.</td>
                    <td className="px-4 py-3 text-gray-9000">Texas</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#F87171', background: '#450a0a33' }}>❌ Ej beställd</span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 font-mono">—</td>
                    <td className="px-4 py-3">
                      <a href="https://stripe.legalinc.com/certificate-of-good-standing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline text-[11px]">Beställ nu</a>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">Landvex AB</td>
                    <td className="px-4 py-3 text-gray-9000">Sverige</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#F87171', background: '#450a0a33' }}>❌ Ej beställd</span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 font-mono">—</td>
                    <td className="px-4 py-3">
                      <a href="https://www.verksamt.se/registreringsbevis" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400 underline text-[11px]">Bolagsverket</a>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">Wavult Group DMCC</td>
                    <td className="px-4 py-3 text-gray-9000">Dubai</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: '#A78BFA', background: '#2e1065' }}>⏳ Forming</span>
                    </td>
                    <td className="px-4 py-3 text-gray-9000 font-mono">—</td>
                    <td className="px-4 py-3">
                      <a href="https://www.dmcc.ae/business-services/good-standing-certificate" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline text-[11px]">DMCC certificate</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Info box ── */}
          <section>
            <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-4 space-y-1">
              <p className="text-xs font-semibold text-amber-400">ℹ️ Om Certificate of Good Standing</p>
              <p className="text-xs text-gray-9000">
                Intygar att bolaget är registrerat, har betalat avgifter och lever upp till statliga krav.
                Utfärdas av delstatens secretary of state (USA) eller motsvarande myndighet.
                Giltighet: normalt 30–90 dagar — beställ nära det tillfälle du behöver det.
              </p>
              <p className="text-xs text-gray-9000">
                <strong className="text-text-primary">Leverantör (USA):</strong> Legalinc via Stripe Atlas ·{' '}
                <a href="https://stripe.legalinc.com/certificate-of-good-standing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline">stripe.legalinc.com/certificate-of-good-standing</a>
              </p>
            </div>
          </section>

        </div>
      )}

      {/* ── Tracker tab ── */}
      {activeTab === 'tracker' && (
      <div className="flex flex-1 overflow-hidden">
      {/* ── Left panel ── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-white/8 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-white/8">
          <h2 className="text-xs font-mono text-gray-9000 uppercase tracking-widest">Company Launch</h2>
          <p className="text-xs text-gray-600 mt-0.5">Wavult Ecosystem · 5 bolag</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {companies
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map(c => {
              const done = doneSteps(c.steps)
              const total = c.steps.length
              const active = c.id === selectedId
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                    active
                      ? 'bg-muted/30 border-blue-500'
                      : 'border-transparent hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-text-primary truncate">{c.name}</span>
                        <span className="text-[9px] font-mono text-gray-9000 flex-shrink-0">{c.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-gray-9000 font-mono">{done}/{total} steps</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <ProgressBar
                    value={done}
                    max={total}
                    color={c.status === 'operational' ? '#34D399' : c.status === 'in_progress' ? '#FBBF24' : '#F3F4F6'}
                  />
                </button>
              )
            })}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none">{selected.flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-text-primary">{selected.name}</h1>
                  <span className="text-xs font-mono text-gray-9000 bg-muted/30 px-2 py-0.5 rounded">
                    {selected.type}
                  </span>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-xs text-gray-9000 font-mono mt-0.5">
                  {selected.jurisdiction} · Priority #{selected.priority}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-right flex-shrink-0">
              <div>
                <p className="text-xs text-gray-9000">Progress</p>
                <p className="text-sm font-bold text-text-primary">{selPct}%</p>
                <p className="text-[9px] text-gray-600">{selDone}/{selTotal} done</p>
              </div>
              <div>
                <p className="text-xs text-gray-9000">Est. time</p>
                <p className="text-sm font-bold text-text-primary">{selDays}d</p>
                <p className="text-[9px] text-gray-600">critical path</p>
              </div>
              <div>
                <p className="text-xs text-gray-9000">Total cost</p>
                <p className="text-sm font-bold text-text-primary">{fmtCost(selCost)}</p>
                <p className="text-[9px] text-gray-600">approx EUR</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <ProgressBar
              value={selDone}
              max={selTotal}
              color={selected.status === 'operational' ? '#34D399' : '#60A5FA'}
            />
          </div>
        </div>

        {/* Steps scroll area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {Object.entries(byCategory).map(([category, steps]) => {
            const catMeta = CATEGORY_META[category] ?? { label: category, icon: '•' }
            const catDone = steps.filter(s => s.status === 'done').length
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{catMeta.icon}</span>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-gray-9000">
                    {catMeta.label}
                  </h3>
                  <span className="text-[9px] font-mono text-gray-600 ml-auto">
                    {catDone}/{steps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {steps.map(step => (
                    <StepRow
                      key={step.id}
                      step={step}
                      allSteps={selected.steps}
                      onToggle={id => toggleStep(selected.id, id)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* Summary footer */}
        <div className="px-6 py-3 border-t border-white/8 flex-shrink-0 bg-muted/30">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-9000 font-mono">TOTAL COST</span>
              <span className="text-sm font-bold text-text-primary">{fmtCost(selCost)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-9000 font-mono">CRITICAL PATH</span>
              <span className="text-sm font-bold text-text-primary">{selDays} days</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-9000 font-mono">REMAINING</span>
              <span className="text-sm font-bold text-text-primary">{selTotal - selDone} steps</span>
            </div>

            {/* Owner legend */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {Object.entries(OWNER_META).map(([key, m]) => (
                <span
                  key={key}
                  className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                  style={{ color: m.color, background: m.bg }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}

// NOTE: Certificate of Good Standing integration added 2026-03-31
// Legalinc API (via Stripe Atlas): stripe.legalinc.com/certificate-of-good-standing
// Relevant for: quiXzoom Inc. (Delaware C-Corp), Landvex Inc. (Texas LLC)
// Required for: bank account opening, enterprise contracts, visa applications, investor relations
// TODO: Integrate Legalinc API when credentials available
// atlas-support@legalinc.com | 833-456-4948
