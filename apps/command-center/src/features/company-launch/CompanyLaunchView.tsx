import { useState, useMemo } from 'react'
import { COMPANY_LAUNCHES, CompanyLaunch, LaunchStep } from './data'

// ─── Owner colours ────────────────────────────────────────────────────────────
const OWNER_META: Record<string, { label: string; color: string; bg: string }> = {
  erik:     { label: 'Erik',     color: '#60A5FA', bg: '#1e3a5f' },
  dennis:   { label: 'Dennis',   color: '#34D399', bg: '#064e3b' },
  winston:  { label: 'Winston',  color: '#FBBF24', bg: '#451a03' },
  leon:     { label: 'Leon',     color: '#F472B6', bg: '#500724' },
  external: { label: 'External', color: '#9CA3AF', bg: '#1f2937' },
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
    <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CompanyLaunch['status'] }) {
  const map = {
    not_started: { label: 'Not Started', color: '#6B7280', bg: '#1f2937' },
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
          : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'
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
            : 'border-white/20 hover:border-white/40 cursor-pointer'
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
          <span className={`text-sm font-medium ${done ? 'line-through text-gray-600' : 'text-white'}`}>
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
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-400 flex-shrink-0">
              ⛔ blocked
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500">{step.description}</p>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
          <span>⏱ {step.estimated_days}d</span>
          {step.cost_eur && <span>💰 {fmtCost(step.cost_eur)}</span>}
          {step.external_url && (
            <a
              href={step.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 underline"
            >
              🔗 {new URL(step.external_url).hostname.replace('www.', '')}
            </a>
          )}
        </div>

        {/* Prerequisites */}
        {step.prerequisites.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-gray-700">requires:</span>
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
        <p className="text-xs text-gray-600 italic">📎 {step.evidence_required}</p>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function CompanyLaunchView() {
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
    <div className="flex h-full overflow-hidden bg-[#07080F] text-white">
      {/* ── Left panel ── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-white/8 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-white/8">
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest">Company Launch</h2>
          <p className="text-xs text-gray-700 mt-0.5">Wavult Ecosystem · 5 bolag</p>
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
                      ? 'bg-white/[0.05] border-blue-500'
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white truncate">{c.name}</span>
                        <span className="text-[9px] font-mono text-gray-600 flex-shrink-0">{c.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-gray-600 font-mono">{done}/{total} steps</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <ProgressBar
                    value={done}
                    max={total}
                    color={c.status === 'operational' ? '#34D399' : c.status === 'in_progress' ? '#FBBF24' : '#374151'}
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
                  <h1 className="text-lg font-bold text-white">{selected.name}</h1>
                  <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                    {selected.type}
                  </span>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
                  {selected.jurisdiction} · Priority #{selected.priority}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-right flex-shrink-0">
              <div>
                <p className="text-xs text-gray-600">Progress</p>
                <p className="text-sm font-bold text-white">{selPct}%</p>
                <p className="text-[9px] text-gray-700">{selDone}/{selTotal} done</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Est. time</p>
                <p className="text-sm font-bold text-white">{selDays}d</p>
                <p className="text-[9px] text-gray-700">critical path</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total cost</p>
                <p className="text-sm font-bold text-white">{fmtCost(selCost)}</p>
                <p className="text-[9px] text-gray-700">approx EUR</p>
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
                  <h3 className="text-xs font-mono uppercase tracking-widest text-gray-500">
                    {catMeta.label}
                  </h3>
                  <span className="text-[9px] font-mono text-gray-700 ml-auto">
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
        <div className="px-6 py-3 border-t border-white/8 flex-shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-mono">TOTAL COST</span>
              <span className="text-sm font-bold text-white">{fmtCost(selCost)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-mono">CRITICAL PATH</span>
              <span className="text-sm font-bold text-white">{selDays} days</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-mono">REMAINING</span>
              <span className="text-sm font-bold text-white">{selTotal - selDone} steps</span>
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
  )
}
