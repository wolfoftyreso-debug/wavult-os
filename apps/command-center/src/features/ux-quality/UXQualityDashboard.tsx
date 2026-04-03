// ─── UX Quality Score Tracker ────────────────────────────────────────────────
// Läser audit-report.json genererad av ux-audit/run-audit.mjs
// Design: #F5F0E8 cream · navy #0A3D62 · gold #E8B84B

import React, { useState, useEffect, useMemo, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type UXLevel = 'LOCKED' | 'BRA' | 'ACCEPTABEL' | 'SVAG' | 'KRITISK'
type DataSource = 'mock' | 'partial' | 'live'
type MaturityGrade = 'skeleton' | 'alpha' | 'beta' | 'production' | 'enterprise'

interface UXIndicators {
  emptyState: boolean
  loading: boolean
  error: boolean
}

interface UXModule {
  id: string
  name: string
  icon: string
  score: number
  indicators: UXIndicators
  dataSource: DataSource
  topIssue: string | null
  maturity: MaturityGrade
}

interface ScoreDistribution {
  LOCKED: number
  BRA: number
  ACCEPTABEL: number
  SVAG: number
  KRITISK: number
}

interface AuditReport {
  generatedAt: string
  averageScore: number
  totalModules: number
  distribution: ScoreDistribution
  modules: UXModule[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<UXLevel, {
  color: string
  bg: string
  border: string
  emoji: string
  label: string
  range: string
}> = {
  LOCKED:     { color: '#1565C0', bg: '#E3F2FD', border: '#1565C020', emoji: '🔵', label: 'LOCKED',     range: '95–100' },
  BRA:        { color: '#2E7D32', bg: '#E8F5E9', border: '#2E7D3220', emoji: '🟢', label: 'BRA',        range: '80–94'  },
  ACCEPTABEL: { color: '#E65100', bg: '#FFF3E0', border: '#E6510020', emoji: '🟡', label: 'ACCEPTABEL', range: '60–79'  },
  SVAG:       { color: '#BF360C', bg: '#FBE9E7', border: '#BF360C20', emoji: '🟠', label: 'SVAG',       range: '40–59'  },
  KRITISK:    { color: '#B71C1C', bg: '#FFEBEE', border: '#B71C1C20', emoji: '🔴', label: 'KRITISK',    range: '0–39'   },
}

const DATA_SOURCE_CONFIG: Record<DataSource, { label: string; color: string; bg: string }> = {
  mock:    { label: 'MOCK',    color: '#78350F', bg: '#FEF3C7' },
  partial: { label: 'PARTIAL', color: '#1E40AF', bg: '#DBEAFE' },
  live:    { label: 'LIVE',    color: '#065F46', bg: '#D1FAE5' },
}

const MATURITY_CONFIG: Record<MaturityGrade, { label: string; color: string; bg: string }> = {
  skeleton:   { label: 'SKELETON',   color: '#374151', bg: '#F3F4F6' },
  alpha:      { label: 'ALPHA',      color: '#92400E', bg: '#FEF3C7' },
  beta:       { label: 'BETA',       color: '#1E40AF', bg: '#DBEAFE' },
  production: { label: 'PRODUCTION', color: '#065F46', bg: '#D1FAE5' },
  enterprise: { label: 'ENTERPRISE', color: '#4C1D95', bg: '#EDE9FE' },
}

function getLevel(score: number): UXLevel {
  if (score >= 95) return 'LOCKED'
  if (score >= 80) return 'BRA'
  if (score >= 60) return 'ACCEPTABEL'
  if (score >= 40) return 'SVAG'
  return 'KRITISK'
}

function getScoreColor(score: number): string {
  const lvl = getLevel(score)
  return LEVEL_CONFIG[lvl].color
}

// ─── Score Number ─────────────────────────────────────────────────────────────

function ScoreNumber({ score }: { score: number }) {
  return (
    <span
      style={{
        fontSize: 42,
        fontWeight: 800,
        color: getScoreColor(score),
        fontFamily: 'var(--font-mono, monospace)',
        lineHeight: 1,
      }}
    >
      {Math.round(score)}
    </span>
  )
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: UXLevel }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        flexShrink: 0,
      }}
    >
      {cfg.emoji} {cfg.label}
    </span>
  )
}

// ─── Indicator Dot ────────────────────────────────────────────────────────────

function IndicatorDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: ok ? '#2E7D32' : '#B71C1C',
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: 12 }}>{ok ? '✅' : '❌'}</span>
      {label}
    </span>
  )
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ module }: { module: UXModule }) {
  const level = getLevel(module.score)
  const levelCfg = LEVEL_CONFIG[level]
  const dsCfg = DATA_SOURCE_CONFIG[module.dataSource]
  const matCfg = MATURITY_CONFIG[module.maturity]

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${levelCfg.color}20`,
        borderTop: `3px solid ${levelCfg.color}`,
        borderRadius: '0 0 12px 12px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'box-shadow 0.15s',
        boxShadow: '0 1px 4px rgba(10,61,98,0.06)',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(10,61,98,0.12)')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(10,61,98,0.06)')}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{module.icon}</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#0A3D62',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {module.name}
          </span>
        </div>
        <ScoreNumber score={module.score} />
      </div>

      {/* Level badge + maturity */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
        <LevelBadge level={level} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 20,
            background: matCfg.bg,
            color: matCfg.color,
            border: `1px solid ${matCfg.color}25`,
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
          }}
        >
          {matCfg.label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 20,
            background: dsCfg.bg,
            color: dsCfg.color,
            border: `1px solid ${dsCfg.color}25`,
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
          }}
        >
          {dsCfg.label}
        </span>
      </div>

      {/* Indicators */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const }}>
        <IndicatorDot ok={module.indicators.emptyState} label="Empty State" />
        <IndicatorDot ok={module.indicators.loading} label="Loading" />
        <IndicatorDot ok={module.indicators.error} label="Error" />
      </div>

      {/* Top issue */}
      {module.topIssue && (
        <div
          style={{
            padding: '8px 12px',
            background: '#FFF8F0',
            borderRadius: 8,
            border: '1px solid #E8B84B40',
            fontSize: 12,
            color: '#7A5C1E',
            lineHeight: 1.4,
          }}
        >
          ⚠ {module.topIssue}
        </div>
      )}
    </div>
  )
}

// ─── Distribution Bar ─────────────────────────────────────────────────────────

function DistributionBar({ distribution, total }: { distribution: ScoreDistribution; total: number }) {
  const levels: UXLevel[] = ['LOCKED', 'BRA', 'ACCEPTABEL', 'SVAG', 'KRITISK']

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '22px 24px',
        border: '1px solid rgba(10,61,98,0.08)',
        boxShadow: '0 1px 4px rgba(10,61,98,0.06)',
      }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0A3D62', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Score Distribution
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {levels.map(level => {
          const cfg = LEVEL_CONFIG[level]
          const count = distribution[level]
          const pct = total > 0 ? (count / total) * 100 : 0

          return (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 110, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                <span style={{ fontSize: 10, color: '#999', marginLeft: 2 }}>{cfg.range}</span>
              </div>
              <div
                style={{
                  flex: 1,
                  height: 16,
                  background: '#F0E8DC',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {pct > 0 && (
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: cfg.color,
                      borderRadius: 8,
                      transition: 'width 0.5s ease',
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  width: 24,
                  textAlign: 'right' as const,
                  fontSize: 13,
                  fontWeight: 700,
                  color: count > 0 ? cfg.color : '#CCC',
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        gap: 20,
        padding: '60px 24px',
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px dashed rgba(10,61,98,0.20)',
      }}
    >
      <span style={{ fontSize: 48 }}>🎯</span>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A3D62', margin: '0 0 10px' }}>
          Ingen audit-data hittades
        </h2>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
          Kör audit-pipelinen för att generera en rapport. Rapporten placeras automatiskt i rätt mapp och laddas hit.
        </p>
        <div
          style={{
            padding: '14px 20px',
            background: '#F5F0E8',
            borderRadius: 10,
            border: '1px solid #E8B84B40',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 13,
            color: '#0A3D62',
            textAlign: 'left' as const,
            display: 'inline-block',
          }}
        >
          <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Terminal
          </div>
          node ux-audit/run-audit.mjs
        </div>
        <p style={{ fontSize: 12, color: '#AAA', margin: '16px 0 0' }}>
          Kopiera sedan rapporten: <code style={{ background: '#F0E8DC', padding: '2px 6px', borderRadius: 4 }}>public/ux-audit-report.json</code>
        </p>
      </div>
    </div>
  )
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface Filters {
  search: string
  levels: Set<UXLevel>
  dataSources: Set<DataSource>
  maturities: Set<MaturityGrade>
}

function FilterPanel({
  filters,
  onChange,
  totalShown,
  totalAll,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  totalShown: number
  totalAll: number
}) {
  const allLevels: UXLevel[] = ['KRITISK', 'SVAG', 'ACCEPTABEL', 'BRA', 'LOCKED']
  const allSources: DataSource[] = ['mock', 'partial', 'live']
  const allMaturities: MaturityGrade[] = ['skeleton', 'alpha', 'beta', 'production', 'enterprise']

  function toggleLevel(l: UXLevel) {
    const next = new Set(filters.levels)
    next.has(l) ? next.delete(l) : next.add(l)
    onChange({ ...filters, levels: next })
  }
  function toggleSource(s: DataSource) {
    const next = new Set(filters.dataSources)
    next.has(s) ? next.delete(s) : next.add(s)
    onChange({ ...filters, dataSources: next })
  }
  function toggleMaturity(m: MaturityGrade) {
    const next = new Set(filters.maturities)
    next.has(m) ? next.delete(m) : next.add(m)
    onChange({ ...filters, maturities: next })
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#0A3D62',
    marginBottom: 8,
    display: 'block',
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '20px',
        border: '1px solid rgba(10,61,98,0.08)',
        boxShadow: '0 1px 4px rgba(10,61,98,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <span style={labelStyle}>Sök modul</span>
        <input
          type="text"
          placeholder="Namn…"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(10,61,98,0.15)',
            background: '#F5F0E8',
            color: '#0A3D62',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Count */}
      <div
        style={{
          padding: '8px 12px',
          background: '#F5F0E8',
          borderRadius: 8,
          fontSize: 12,
          color: '#7A5C1E',
          textAlign: 'center',
          fontWeight: 600,
        }}
      >
        {totalShown} / {totalAll} moduler
      </div>

      {/* Level filter */}
      <div>
        <span style={labelStyle}>Nivå</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {allLevels.map(level => {
            const cfg = LEVEL_CONFIG[level]
            const active = filters.levels.has(level)
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px solid ${active ? cfg.color + '60' : 'transparent'}`,
                  background: active ? cfg.bg : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  color: active ? cfg.color : '#666',
                  textAlign: 'left',
                  transition: 'all 0.1s',
                }}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Data source filter */}
      <div>
        <span style={labelStyle}>Datakälla</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {allSources.map(src => {
            const cfg = DATA_SOURCE_CONFIG[src]
            const active = filters.dataSources.has(src)
            return (
              <button
                key={src}
                onClick={() => toggleSource(src)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px solid ${active ? cfg.color + '60' : 'transparent'}`,
                  background: active ? cfg.bg : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  color: active ? cfg.color : '#666',
                  textAlign: 'left',
                  transition: 'all 0.1s',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Maturity filter */}
      <div>
        <span style={labelStyle}>Mognadsgrad</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {allMaturities.map(mat => {
            const cfg = MATURITY_CONFIG[mat]
            const active = filters.maturities.has(mat)
            return (
              <button
                key={mat}
                onClick={() => toggleMaturity(mat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px solid ${active ? cfg.color + '60' : 'transparent'}`,
                  background: active ? cfg.bg : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  color: active ? cfg.color : '#666',
                  textAlign: 'left',
                  transition: 'all 0.1s',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reset */}
      {(filters.search || filters.levels.size > 0 || filters.dataSources.size > 0 || filters.maturities.size > 0) && (
        <button
          onClick={() => onChange({ search: '', levels: new Set(), dataSources: new Set(), maturities: new Set() })}
          style={{
            padding: '8px 0',
            background: 'transparent',
            border: '1px solid rgba(10,61,98,0.20)',
            borderRadius: 8,
            color: '#0A3D62',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Rensa filter
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UXQualityDashboard() {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    levels: new Set<UXLevel>(),
    dataSources: new Set<DataSource>(),
    maturities: new Set<MaturityGrade>(),
  })

  const loadReport = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const res = await fetch('/ux-audit-report.json', { cache: 'no-store' })
      if (res.status === 404 || !res.ok) {
        setNotFound(true)
        return
      }
      const data = await res.json() as AuditReport
      setReport(data)
    } catch {
      setNotFound(true)
      setUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadReport() }, [loadReport])

  const filteredModules = useMemo(() => {
    if (!report) return []
    return report.modules.filter(m => {
      if (filters.search && !m.name.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.levels.size > 0 && !filters.levels.has(getLevel(m.score))) return false
      if (filters.dataSources.size > 0 && !filters.dataSources.has(m.dataSource)) return false
      if (filters.maturities.size > 0 && !filters.maturities.has(m.maturity)) return false
      return true
    })
  }, [report, filters])

  const auditDate = report
    ? new Date(report.generatedAt).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div style={{ background: '#F5F0E8', minHeight: '100%' }}>

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A3D62', margin: 0 }}>
              UX Quality Audit
            </h1>
          </div>
          {auditDate && (
            <p style={{ fontSize: 12, color: '#888', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>
              Senaste audit: {auditDate}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {report && (
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: getScoreColor(report.averageScore),
                  fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: 1,
                }}
              >
                {Math.round(report.averageScore)}
              </div>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Genomsnitt
              </div>
            </div>
          )}

          <button
            disabled
            title="Kör audit-pipelinen manuellt för att trigga en ny rapport"
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: '#0A3D62',
              color: '#F5F0E8',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0.45,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Kör ny audit →
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80, gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '4px solid #E8B84B',
              borderTopColor: 'transparent',
              animation: 'ux-spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes ux-spin { to { transform: rotate(360deg) } }`}</style>
          <span style={{ fontSize: 14, color: '#888' }}>Laddar rapport…</span>
        </div>
      )}

      {usingFallback && !loading && (
        <div style={{ marginBottom: 16, padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          Audit-rapport ej tillgänglig · Kör: node ux-audit/run-audit.mjs
        </div>
      )}
      {/* ── Not Found ── */}
      {!loading && notFound && <EmptyState />}

      {/* ── Report ── */}
      {!loading && report && (
        <>
          {/* Distribution */}
          <div style={{ marginBottom: 28 }}>
            <DistributionBar distribution={report.distribution} total={report.totalModules} />
          </div>

          {/* Layout: filter panel + grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* Filter Panel */}
            <div style={{ position: 'sticky', top: 16 }}>
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                totalShown={filteredModules.length}
                totalAll={report.totalModules}
              />
            </div>

            {/* Module Grid */}
            <div>
              {filteredModules.length === 0 ? (
                <div
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#FFFFFF',
                    borderRadius: 12,
                    color: '#999',
                    fontSize: 14,
                    border: '1px dashed rgba(10,61,98,0.15)',
                  }}
                >
                  Inga moduler matchar filtret.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {filteredModules.map(m => (
                    <ModuleCard key={m.id} module={m} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
