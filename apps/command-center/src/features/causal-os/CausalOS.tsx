// ─── Causal OS — Financial & Operational Simulation Layer ─────────────────────

import React, { useState, useMemo, useCallback } from 'react'
import {
  GitBranch,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Sliders,
  Network,
  ChevronDown,
  ChevronUp,
  Info,
  XCircle,
  ArrowRight,
} from 'lucide-react'

import type {
  CausalVariable,
  ScenarioAdjustment,
  Confidence,
  RiskLevel,
  WarningSeverity,
  DecisionOption,
} from './causalTypes'
import { CAUSAL_VARIABLES, BASE_CASH_FLOW_ENTRIES, PRESET_SCENARIOS, DECISION_OPTIONS } from './causalModel'
import {
  buildCashFlowProjection,
  findCriticalDay,
  summarizeProjection,
} from './cashFlowEngine'
import { applyScenario, generateWarnings, calculateRisk } from './scenarioEngine'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEK = (n: number): string =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n)

const pct = (n: number): string => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

function riskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'critical': return 'text-red-700'
    case 'high': return 'text-orange-700'
    case 'medium': return 'text-yellow-700'
    case 'low': return 'text-emerald-700'
  }
}

function riskBg(risk: RiskLevel): string {
  switch (risk) {
    case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-700'
    case 'high': return 'bg-orange-500/10 border-orange-500/30 text-orange-700'
    case 'medium': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700'
    case 'low': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
  }
}

function severityIcon(severity: WarningSeverity) {
  switch (severity) {
    case 'critical': return <XCircle size={16} className="text-red-700 flex-shrink-0" />
    case 'warning': return <AlertTriangle size={16} className="text-yellow-700 flex-shrink-0" />
    case 'info': return <Info size={16} className="text-blue-700 flex-shrink-0" />
  }
}

function balanceColor(balance: number): string {
  if (balance < 0) return 'text-red-700'
  if (balance < 10000) return 'text-red-300'
  if (balance < 50000) return 'text-yellow-700'
  return 'text-emerald-700'
}

function confidenceBadge(c: Confidence): string {
  switch (c) {
    case 'certain': return 'bg-emerald-500/15 text-emerald-700'
    case 'probable': return 'bg-yellow-500/15 text-yellow-700'
    case 'speculative': return 'bg-blue-600/15 text-blue-700'
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'liquidity' | 'scenario' | 'decision' | 'status' | 'graph'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'liquidity', label: 'Likviditet', icon: <DollarSign size={14} /> },
  { id: 'scenario', label: 'Scenario', icon: <Sliders size={14} /> },
  { id: 'decision', label: 'Beslut', icon: <TrendingUp size={14} /> },
  { id: 'status', label: 'Systemstatus', icon: <AlertTriangle size={14} /> },
  { id: 'graph', label: 'Kausalgraf', icon: <Network size={14} /> },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function CausalOS() {
  const [activeTab, setActiveTab] = useState<Tab>('liquidity')
  const [scenarioAdjustments, setScenarioAdjustments] = useState<ScenarioAdjustment[]>([])
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence | 'all'>('all')
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null)
  const [compareDecisions, setCompareDecisions] = useState<[string | null, string | null]>([null, null])
  const [highlightedVar, setHighlightedVar] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // ── Computed state ──────────────────────────────────────────────────────────

  const { updatedVariables, propagatedEffects } = useMemo(
    () => applyScenario(CAUSAL_VARIABLES, scenarioAdjustments),
    [scenarioAdjustments]
  )

  const projection = useMemo(
    () => buildCashFlowProjection(500000, BASE_CASH_FLOW_ENTRIES, scenarioAdjustments),
    [scenarioAdjustments]
  )

  const baseProjection = useMemo(
    () => buildCashFlowProjection(500000, BASE_CASH_FLOW_ENTRIES, []),
    []
  )

  const summary = useMemo(() => summarizeProjection(projection), [projection])
  const baseSummary = useMemo(() => summarizeProjection(baseProjection), [baseProjection])
  const criticalDay = useMemo(() => findCriticalDay(projection), [projection])
  const warnings = useMemo(() => generateWarnings(updatedVariables, projection), [updatedVariables, projection])
  const risk = useMemo(() => calculateRisk(updatedVariables, projection), [updatedVariables, projection])

  const varMap = useMemo(
    () => new Map<string, CausalVariable>(updatedVariables.map(v => [v.id, v])),
    [updatedVariables]
  )

  // ── Scenario helpers ────────────────────────────────────────────────────────

  const getAdjustment = useCallback(
    (variableId: string): number => {
      return scenarioAdjustments.find(a => a.variableId === variableId)?.deltaPercent ?? 0
    },
    [scenarioAdjustments]
  )

  const setAdjustment = useCallback((variableId: string, deltaPercent: number) => {
    setScenarioAdjustments(prev => {
      const filtered = prev.filter(a => a.variableId !== variableId)
      if (deltaPercent === 0) return filtered
      return [...filtered, { variableId, deltaPercent }]
    })
  }, [])

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESET_SCENARIOS.find(s => s.id === presetId)
    if (preset) setScenarioAdjustments(preset.adjustments)
  }, [])

  // ── Filtered days ───────────────────────────────────────────────────────────

  const filteredProjection = useMemo(() => {
    if (confidenceFilter === 'all') return projection
    return projection.map(day => ({
      ...day,
      entries: day.entries.filter(e => e.confidence === confidenceFilter),
    }))
  }, [projection, confidenceFilter])

  // ── Decision computed ───────────────────────────────────────────────────────

  function computeDecision(option: DecisionOption) {
    const { updatedVariables: dVars } = applyScenario(CAUSAL_VARIABLES, option.impacts.map(i => ({
      variableId: i.variableId,
      deltaPercent: i.deltaPercent,
    })))
    const dProj = buildCashFlowProjection(500000, BASE_CASH_FLOW_ENTRIES, option.impacts.map(i => ({
      variableId: i.variableId,
      deltaPercent: i.deltaPercent,
    })))
    const dSummary = summarizeProjection(dProj)
    const runway = dVars.find(v => v.id === 'runway_days')?.currentValue ?? 333
    const baseRunway = CAUSAL_VARIABLES.find(v => v.id === 'runway_days')?.currentValue ?? 333
    const dRisk = calculateRisk(dVars, dProj)

    return {
      runway,
      cashIn90d: dSummary.balanceIn90d,
      cashIn365d: dSummary.balanceIn365d,
      risk: dRisk,
      feasible: runway > 180,
      runwayDelta: runway - baseRunway,
      cash90Delta: dSummary.balanceIn90d - baseSummary.balanceIn90d,
    }
  }

  // ─── TAB: Likviditet ───────────────────────────────────────────────────────

  function renderLiquidity() {
    const runway = varMap.get('runway_days')?.currentValue ?? 333

    return (
      <div className="space-y-4">
        {/* Header cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Saldo idag', value: SEK(500000), sub: 'Startkapital' },
            { label: 'Saldo 90d', value: SEK(summary.balanceIn90d), sub: '90 dagar', colored: true, n: summary.balanceIn90d },
            { label: 'Saldo 365d', value: SEK(summary.balanceIn365d), sub: '365 dagar', colored: true, n: summary.balanceIn365d },
            { label: 'Runway', value: `${Math.round(runway)} dagar`, sub: `≈ ${(runway / 30).toFixed(1)} mån` },
          ].map(card => (
            <div key={card.label} className="rounded-lg border border-surface-border bg-muted/30 p-4">
              <div className="text-xs text-gray-9000 mb-1">{card.label}</div>
              <div className={`font-mono text-lg font-semibold ${card.colored ? balanceColor(card.n ?? 0) : 'text-gray-800'}`}>
                {card.value}
              </div>
              <div className="text-xs text-gray-9000 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Critical warning banner */}
        {criticalDay && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <XCircle size={18} className="text-red-700 flex-shrink-0" />
            <span className="text-sm text-red-300">
              Kassan går negativ om <span className="font-mono font-semibold">{criticalDay.daysFromNow}</span> dagar
              ({criticalDay.day.date})
            </span>
          </div>
        )}

        {/* Confidence filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'certain', 'probable', 'speculative'] as const).map(f => (
            <button
              key={f}
              onClick={() => setConfidenceFilter(f)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                confidenceFilter === f
                  ? 'bg-[#2563EB] text-gray-900'
                  : 'border border-surface-border text-gray-9000 hover:text-gray-800'
              }`}
            >
              {f === 'all' ? 'Alla' : f === 'certain' ? 'Säkra' : f === 'probable' ? 'Sannolika' : 'Spekulativa'}
            </button>
          ))}
        </div>

        {/* Day list */}
        <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
          {filteredProjection.map((day) => {
            const isExpanded = expandedDay === day.date
            const maxBalance = 500000
            const barPct = Math.min(100, Math.max(0, (day.balance / maxBalance) * 100))

            return (
              <div key={day.date} className="rounded-lg border border-surface-border bg-muted/30 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                >
                  <span className="font-mono text-xs text-gray-9000 w-24 flex-shrink-0">{day.date}</span>
                  <span className={`font-mono text-sm font-semibold w-28 flex-shrink-0 ${balanceColor(day.balance)}`}>
                    {SEK(day.balance)}
                  </span>
                  {/* Bar */}
                  <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        day.balance < 0 ? 'bg-red-500' :
                        day.balance < 10000 ? 'bg-red-400' :
                        day.balance < 50000 ? 'bg-yellow-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  {day.warning && (
                    <AlertTriangle size={14} className={
                      day.warning === 'negative' || day.warning === 'critical' ? 'text-red-700' : 'text-yellow-700'
                    } />
                  )}
                  {(day.inflows > 0 || day.outflows > 0) && (
                    <span className="text-xs text-gray-9000">
                      {day.entries.length} post{day.entries.length !== 1 ? 'er' : ''}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={14} className="text-gray-9000" /> : <ChevronDown size={14} className="text-gray-9000" />}
                </button>

                {isExpanded && day.entries.length > 0 && (
                  <div className="px-4 pb-3 border-t border-surface-border/50 space-y-1.5 pt-2.5">
                    {day.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${confidenceBadge(entry.confidence)}`}>
                            {entry.confidence === 'certain' ? 'SÄKER' : entry.confidence === 'probable' ? 'SANNOLIK' : 'SPEKULATIV'}
                          </span>
                          <span className="text-xs text-gray-9000 truncate">{entry.label}</span>
                        </div>
                        <span className={`font-mono text-sm font-semibold flex-shrink-0 ${entry.amount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {entry.amount >= 0 ? '+' : ''}{SEK(entry.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-surface-border/50 flex justify-between text-xs">
                      <span className="text-emerald-700 font-mono">+{SEK(day.inflows)}</span>
                      <span className="text-red-700 font-mono">-{SEK(day.outflows)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── TAB: Scenario ─────────────────────────────────────────────────────────

  function renderScenario() {
    const baseRunway = CAUSAL_VARIABLES.find(v => v.id === 'runway_days')?.baseValue ?? 333
    const scenarioRunway = varMap.get('runway_days')?.currentValue ?? 333
    const baseRevenue = CAUSAL_VARIABLES.find(v => v.id === 'monthly_revenue')?.baseValue ?? 0
    const scenarioRevenue = varMap.get('monthly_revenue')?.currentValue ?? 0

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <div className="text-xs text-gray-9000 mb-2 uppercase tracking-wider">Preset-scenarion</div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_SCENARIOS.map(ps => (
                <button
                  key={ps.id}
                  onClick={() => applyPreset(ps.id)}
                  className="rounded px-3 py-1.5 text-xs border border-surface-border text-gray-600 hover:bg-muted/30 hover:border-[#2563EB]/50 transition-colors"
                >
                  {ps.name}
                </button>
              ))}
              <button
                onClick={() => setScenarioAdjustments([])}
                className="rounded px-3 py-1.5 text-xs border border-surface-border text-gray-9000 hover:text-gray-600 transition-colors"
              >
                Återställ
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <div className="text-xs text-gray-9000 uppercase tracking-wider">Justera variabler</div>
            {CAUSAL_VARIABLES.filter(v => !['monthly_burn', 'missions_per_month', 'runway_days'].includes(v.id)).map(variable => {
              const delta = getAdjustment(variable.id)
              const adjusted = variable.baseValue * (1 + delta / 100)
              return (
                <div key={variable.id} className="rounded-lg border border-surface-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">{variable.label}</span>
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-gray-9000">{variable.baseValue.toLocaleString('sv-SE')} {variable.unit}</span>
                      <ArrowRight size={12} className="text-gray-9000 my-auto" />
                      <span className={delta !== 0 ? 'text-[#2563EB]' : 'text-gray-9000'}>
                        {adjusted.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} {variable.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={-50}
                      max={100}
                      step={5}
                      value={delta}
                      onChange={e => setAdjustment(variable.id, Number(e.target.value))}
                      className="flex-1 accent-[#2563EB] h-1"
                    />
                    <span className="font-mono text-xs w-12 text-right text-gray-9000">{pct(delta)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4">
          <div className="text-xs text-gray-9000 uppercase tracking-wider">Live preview</div>

          <div className="rounded-lg border border-surface-border bg-muted/30 p-4 space-y-3">
            {[
              {
                label: 'Revenue/mån',
                base: SEK(baseRevenue),
                scenario: SEK(scenarioRevenue),
                delta: scenarioRevenue - baseRevenue !== 0
                  ? pct(((scenarioRevenue - baseRevenue) / Math.max(1, Math.abs(baseRevenue))) * 100)
                  : null,
              },
              {
                label: 'Kassa 90d',
                base: SEK(baseSummary.balanceIn90d),
                scenario: SEK(summary.balanceIn90d),
                delta: pct(((summary.balanceIn90d - baseSummary.balanceIn90d) / Math.max(1, Math.abs(baseSummary.balanceIn90d))) * 100),
              },
              {
                label: 'Kassa 365d',
                base: SEK(baseSummary.balanceIn365d),
                scenario: SEK(summary.balanceIn365d),
                delta: pct(((summary.balanceIn365d - baseSummary.balanceIn365d) / Math.max(1, Math.abs(baseSummary.balanceIn365d))) * 100),
              },
              {
                label: 'Runway',
                base: `${Math.round(baseRunway)} dagar`,
                scenario: `${Math.round(scenarioRunway)} dagar`,
                delta: `${scenarioRunway - baseRunway > 0 ? '+' : ''}${Math.round(scenarioRunway - baseRunway)} d`,
              },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-9000 w-24">{row.label}</span>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-gray-9000">{row.base}</span>
                  <ArrowRight size={12} className="text-gray-9000" />
                  <span className="text-gray-800">{row.scenario}</span>
                  {row.delta && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                      row.delta.startsWith('+') ? 'text-emerald-700 bg-emerald-500/10' : 'text-red-700 bg-red-500/10'
                    }`}>
                      {row.delta}
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between">
              <span className="text-xs text-gray-9000">Risk</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskBg(risk)}`}>
                {risk.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Propagation effects */}
          {propagatedEffects.length > 0 && (
            <div>
              <div className="text-xs text-gray-9000 uppercase tracking-wider mb-2">Kausala effekter</div>
              <div className="space-y-1.5">
                {propagatedEffects.map((effect, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded border border-surface-border/50 bg-white/[0.01] px-3 py-2">
                    <GitBranch size={12} className="text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-9000">
                      <span className="text-gray-600">{effect.from}</span>
                      <ArrowRight size={10} className="inline mx-1 text-gray-9000" />
                      <span className="text-gray-600">{effect.to}</span>
                      <span className={`ml-1 font-mono ${effect.impact > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        ({effect.impact > 0 ? '+' : ''}{effect.impact.toFixed(0)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── TAB: Beslut ───────────────────────────────────────────────────────────

  function renderDecision() {
    const decisionsComputed = DECISION_OPTIONS.map(d => ({ option: d, computed: computeDecision(d) }))

    const compareA = compareDecisions[0] ? decisionsComputed.find(d => d.option.id === compareDecisions[0]) : null
    const compareB = compareDecisions[1] ? decisionsComputed.find(d => d.option.id === compareDecisions[1]) : null

    return (
      <div className="space-y-4">
        {/* Decision cards */}
        <div className="space-y-3">
          {decisionsComputed.map(({ option, computed }) => {
            const isExpanded = expandedDecision === option.id
            const isInCompare = compareDecisions.includes(option.id)

            return (
              <div
                key={option.id}
                className={`rounded-lg border transition-colors ${
                  isExpanded ? 'border-[#2563EB]/40 bg-[#2563EB]/[0.04]' : 'border-surface-border bg-muted/30'
                }`}
              >
                <button
                  className="w-full flex items-start justify-between gap-3 p-4 text-left"
                  onClick={() => setExpandedDecision(isExpanded ? null : option.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                      {computed.feasible ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700">Genomförbart</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-700">Ej genomförbart</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${riskBg(computed.risk)}`}>
                        {computed.risk.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-9000">{option.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setCompareDecisions(prev => {
                          if (prev.includes(option.id)) return prev.map(p => p === option.id ? null : p) as [string | null, string | null]
                          if (!prev[0]) return [option.id, prev[1]]
                          if (!prev[1]) return [prev[0], option.id]
                          return [option.id, prev[1]]
                        })
                      }}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        isInCompare
                          ? 'border-[#2563EB]/50 text-[#2563EB] bg-[#2563EB]/10'
                          : 'border-surface-border text-gray-9000 hover:text-gray-600'
                      }`}
                    >
                      Jämför
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-9000" /> : <ChevronDown size={16} className="text-gray-9000" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-surface-border/50 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Runway', value: `${Math.round(computed.runway)} d`, delta: computed.runwayDelta },
                        { label: 'Kassa 90d', value: SEK(computed.cashIn90d), delta: computed.cash90Delta },
                        { label: 'Risk', value: computed.risk.toUpperCase(), colored: computed.risk },
                        { label: 'Genomförbart', value: computed.feasible ? 'Ja' : 'Nej', bool: computed.feasible },
                      ].map(card => (
                        <div key={card.label} className="rounded border border-surface-border/50 bg-muted/30 p-3">
                          <div className="text-xs text-gray-9000 mb-1">{card.label}</div>
                          <div className={`font-mono text-sm font-semibold ${
                            card.colored ? riskColor(card.colored as RiskLevel) :
                            card.bool !== undefined ? (card.bool ? 'text-emerald-700' : 'text-red-700') :
                            'text-gray-800'
                          }`}>
                            {card.value}
                          </div>
                          {card.delta !== undefined && (
                            <div className={`font-mono text-xs mt-0.5 ${card.delta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {card.delta > 0 ? '+' : ''}{typeof card.delta === 'number' && card.label === 'Kassa 90d' ? SEK(card.delta) : Math.round(card.delta) + ' d'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-xs text-gray-9000 mb-1.5">Direkta påverkningar</div>
                      <div className="space-y-1">
                        {option.impacts.map((impact, idx) => {
                          const vari = CAUSAL_VARIABLES.find(v => v.id === impact.variableId)
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-9000">{vari?.label ?? impact.variableId}</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-gray-9000">{impact.timeframe}</span>
                                <span className={impact.deltaPercent > 0 ? 'text-emerald-700' : 'text-red-700'}>
                                  {pct(impact.deltaPercent)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Side-by-side comparison */}
        {compareA && compareB && (
          <div>
            <div className="text-xs text-gray-9000 uppercase tracking-wider mb-3">Jämförelse</div>
            <div className="grid grid-cols-2 gap-3">
              {[compareA, compareB].map(({ option, computed }) => (
                <div key={option.id} className="rounded-lg border border-surface-border bg-muted/30 p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-800">{option.label}</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-9000">Runway</span>
                      <span className="font-mono text-gray-800">{Math.round(computed.runway)} d</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-9000">Kassa 90d</span>
                      <span className={`font-mono ${balanceColor(computed.cashIn90d)}`}>{SEK(computed.cashIn90d)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-9000">Risk</span>
                      <span className={`font-semibold ${riskColor(computed.risk)}`}>{computed.risk.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-9000">Genomförbart</span>
                      <span className={computed.feasible ? 'text-emerald-700' : 'text-red-700'}>
                        {computed.feasible ? 'Ja' : 'Nej'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── TAB: Systemstatus ─────────────────────────────────────────────────────

  function renderStatus() {
    const sorted = [...warnings].sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    })

    const counts = {
      critical: warnings.filter(w => w.severity === 'critical').length,
      warning: warnings.filter(w => w.severity === 'warning').length,
      info: warnings.filter(w => w.severity === 'info').length,
    }

    return (
      <div className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center gap-4 rounded-lg border border-surface-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-semibold text-red-700">{counts.critical}</span>
            <span className="text-xs text-gray-9000">kritiska</span>
          </div>
          <div className="w-px h-4 bg-muted/30" />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-semibold text-yellow-700">{counts.warning}</span>
            <span className="text-xs text-gray-9000">varningar</span>
          </div>
          <div className="w-px h-4 bg-muted/30" />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-semibold text-blue-700">{counts.info}</span>
            <span className="text-xs text-gray-9000">info</span>
          </div>
        </div>

        {sorted.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
            <CheckCircle size={18} className="text-emerald-700" />
            <span className="text-sm text-emerald-300">Inga aktiva varningar — systemet är stabilt.</span>
          </div>
        )}

        <div className="space-y-2">
          {sorted.map(warning => (
            <div
              key={warning.id}
              className={`rounded-lg border p-4 ${
                warning.severity === 'critical'
                  ? 'border-red-500/30 bg-red-500/[0.06]'
                  : warning.severity === 'warning'
                  ? 'border-yellow-500/30 bg-yellow-500/[0.06]'
                  : 'border-blue-500/30 bg-blue-500/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                {severityIcon(warning.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 mb-1">{warning.message}</div>
                  <div className="text-xs text-gray-9000 font-mono">{warning.trigger}</div>
                  {warning.daysUntil !== undefined && (
                    <div className="text-xs text-gray-9000 mt-0.5">
                      Om <span className="font-mono text-gray-600">{warning.daysUntil}</span> dagar
                    </div>
                  )}
                  {warning.suggestedAction && (
                    <div className="mt-2 text-xs text-gray-9000 border-t border-surface-border/50 pt-2">
                      <span className="text-gray-9000">Åtgärd: </span>{warning.suggestedAction}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── TAB: Kausalgraf ───────────────────────────────────────────────────────

  function renderGraph() {
    const categoryLabels: Record<string, string> = {
      all: 'Alla',
      revenue: 'Intäkter',
      cost: 'Kostnader',
      liquidity: 'Likviditet',
      capacity: 'Kapacitet',
    }

    const filtered = updatedVariables.filter(v =>
      categoryFilter === 'all' || v.category === categoryFilter
    )

    return (
      <div className="space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'revenue', 'cost', 'liquidity', 'capacity'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#2563EB] text-gray-900'
                  : 'border border-surface-border text-gray-9000 hover:text-gray-800'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Graph nodes */}
        <div className="space-y-2">
          {filtered.map(variable => {
            const isHighlighted = highlightedVar === variable.id
            const isAffectedByHighlighted = highlightedVar
              ? updatedVariables.find(v => v.id === highlightedVar)?.affects.some(a => a.targetId === variable.id)
              : false

            return (
              <div
                key={variable.id}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  isHighlighted
                    ? 'border-[#2563EB]/50 bg-[#2563EB]/[0.06]'
                    : isAffectedByHighlighted
                    ? 'border-[#2563EB]/20 bg-[#2563EB]/[0.02]'
                    : 'border-surface-border bg-muted/30 hover:border-gray-200'
                }`}
                onClick={() => setHighlightedVar(isHighlighted ? null : variable.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-800">{variable.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        variable.category === 'revenue' ? 'bg-emerald-500/15 text-emerald-700' :
                        variable.category === 'cost' ? 'bg-red-500/15 text-red-700' :
                        variable.category === 'liquidity' ? 'bg-blue-500/15 text-blue-700' :
                        variable.category === 'capacity' ? 'bg-blue-600/15 text-blue-700' :
                        'bg-gray-500/15 text-gray-9000'
                      }`}>
                        {variable.category}
                      </span>
                    </div>
                    <span className="font-mono text-lg font-semibold text-gray-800">
                      {variable.currentValue.toLocaleString('sv-SE', { maximumFractionDigits: 0 })}{' '}
                      <span className="text-xs text-gray-9000">{variable.unit}</span>
                    </span>
                  </div>

                  {variable.affects.length > 0 && (
                    <div className="text-right space-y-1">
                      <div className="text-xs text-gray-9000 mb-1">Påverkar</div>
                      {variable.affects.map((link, idx) => {
                        const target = varMap.get(link.targetId)
                        return (
                          <div key={idx} className="flex items-center gap-1.5 text-xs justify-end">
                            <ArrowRight size={10} className="text-gray-9000" />
                            <span className="text-gray-9000">{target?.label ?? link.targetId}</span>
                            <span className={`font-mono ${link.direction === 1 ? 'text-emerald-700' : 'text-red-700'}`}>
                              ×{link.multiplier}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {isHighlighted && variable.affects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-surface-border space-y-1">
                    {variable.affects.map((link, idx) => (
                      <div key={idx} className="text-xs text-gray-9000 flex items-center gap-1.5">
                        <GitBranch size={10} className="text-[#2563EB]" />
                        {link.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full" style={{ background: 'var(--color-bg-secondary)' }}>
      {/* Header */}
      <div className="border-b border-surface-border px-4 py-4 md:px-6" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB]/15">
              <GitBranch size={18} className="text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-800">Causal OS</h1>
              <p className="text-xs text-gray-9000">Financial & Operational Simulation Layer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded border font-semibold ${riskBg(risk)}`}>
              {risk.toUpperCase()}
            </span>
            {warnings.filter(w => w.severity === 'critical').length > 0 && (
              <div className="flex items-center gap-1 rounded bg-red-500/15 border border-red-500/30 px-2 py-1">
                <XCircle size={12} className="text-red-700" />
                <span className="text-xs font-mono text-red-700">
                  {warnings.filter(w => w.severity === 'critical').length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#2563EB]/15 text-[#2563EB]'
                  : 'text-gray-9000 hover:text-gray-600 hover:bg-muted/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {activeTab === 'liquidity' && renderLiquidity()}
        {activeTab === 'scenario' && renderScenario()}
        {activeTab === 'decision' && renderDecision()}
        {activeTab === 'status' && renderStatus()}
        {activeTab === 'graph' && renderGraph()}
      </div>
    </div>
  )
}

export default CausalOS
