// ─── Wavult OS — System Status View ──────────────────────────────────────────
// Enterprise module registry. Dark, dense, operational.

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import {
  MODULE_REGISTRY,
  MATURITY_COLORS,
  MATURITY_LABELS,
  MaturityLevel,
} from '../../shared/maturity/maturityModel'

const LEVEL_ORDER: MaturityLevel[] = ['enterprise', 'production', 'beta', 'alpha', 'skeleton']

const LEVEL_CONFIG: Record<MaturityLevel, { color: string; bg: string; label: string }> = {
  enterprise: { color: '#10B981', bg: '#10B98112', label: 'ENTERPRISE' },
  production: { color: '#3B82F6', bg: '#3B82F612', label: 'PRODUCTION' },
  beta:       { color: '#06B6D4', bg: '#06B6D412', label: 'BETA' },
  alpha:      { color: '#F59E0B', bg: '#F59E0B12', label: 'ALPHA' },
  skeleton:   { color: '#52525B', bg: '#52525B12', label: 'SKELETON' },
}

const DATA_CONFIG: Record<string, { color: string; label: string }> = {
  live:    { color: '#10B981', label: '● LIVE' },
  partial: { color: '#3B82F6', label: '◐ PARTIAL' },
  mock:    { color: '#F59E0B', label: '○ MOCK' },
}

function countByLevel(level: MaturityLevel) {
  return MODULE_REGISTRY.filter(m => m.level === level).length
}

export function SystemStatusView() {
  const navigate = useNavigate()
  const total = MODULE_REGISTRY.length
  const liveModules = MODULE_REGISTRY.filter(m => m.dataSource === 'live').length
  const sortedModules = [...MODULE_REGISTRY].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#050505', color: '#A1A1AA', overflow: 'auto',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, padding: '12px 24px',
        borderBottom: '1px solid #141414',
        background: '#0A0A0A',
        display: 'flex', alignItems: 'center', gap: 0,
      }}>
        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24, borderRight: '1px solid #1A1A1A' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#10B981',
            boxShadow: '0 0 8px #10B981',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E4E4E7', letterSpacing: '0.06em' }}>
            SYSTEM STABLE
          </span>
        </div>

        {/* Stats */}
        {[
          { label: 'MODULES', value: String(total) },
          { label: 'LIVE DATA', value: String(liveModules), color: '#10B981' },
          ...LEVEL_ORDER.map(level => ({
            label: MATURITY_LABELS[level].toUpperCase(),
            value: String(countByLevel(level)),
            color: countByLevel(level) > 0 ? MATURITY_COLORS[level] : '#27272A',
          })).filter(s => parseInt(s.value) > 0),
        ].map(s => (
          <div key={s.label} style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid #1A1A1A' }}>
            <div style={{ fontSize: 7, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color ?? '#A1A1AA', fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </div>
          </div>
        ))}

        {/* Health bar */}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 7, color: '#3F3F46', letterSpacing: '0.1em' }}>MODULE HEALTH</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {sortedModules.map(m => (
              <div key={m.id} style={{
                width: 6, height: 18, borderRadius: 2,
                background: MATURITY_COLORS[m.level],
                opacity: 0.7,
              }} title={`${m.name} — ${MATURITY_LABELS[m.level]}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <div style={{
        flexShrink: 0, padding: '16px 24px 8px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#3F3F46', letterSpacing: '0.14em' }}>
          MODULE REGISTRY
        </span>
        <div style={{ flex: 1, height: 1, background: '#141414' }} />
        <span style={{ fontSize: 9, color: '#27272A' }}>{total} entries</span>
      </div>

      {/* ── Module grid ── */}
      <div style={{
        flex: 1, padding: '0 24px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 8,
        alignContent: 'start',
      }}>
        {sortedModules.map(mod => {
          const level = LEVEL_CONFIG[mod.level]
          const data = DATA_CONFIG[mod.dataSource] ?? DATA_CONFIG['mock']

          return (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              style={{
                background: '#080808',
                border: '1px solid #141414',
                borderLeft: `3px solid ${level.color}`,
                borderRadius: 4,
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = level.color
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${level.color}18`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#141414'
                ;(e.currentTarget as HTMLButtonElement).style.borderLeftColor = level.color
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{mod.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#E4E4E7', letterSpacing: '0.01em', lineHeight: 1.3 }}>
                    {mod.name}
                  </span>
                </div>
                <div style={{
                  flexShrink: 0,
                  padding: '2px 6px', borderRadius: 3,
                  background: level.bg,
                  border: `1px solid ${level.color}30`,
                  fontSize: 8, fontWeight: 700, color: level.color, letterSpacing: '0.08em',
                }}>
                  {level.label}
                </div>
              </div>

              {/* Live/Mock counts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#52525B' }}>{mod.liveFeatures.length} live</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#52525B' }}>{mod.mockFeatures.length} mock</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ArrowUpRight size={9} color="#27272A" />
                  <span style={{ fontSize: 8, color: '#27272A' }}>Fas {mod.phase}</span>
                </div>
              </div>

              {/* Progress bar — live vs total */}
              {(() => {
                const total = mod.liveFeatures.length + mod.mockFeatures.length
                const pct = total > 0 ? (mod.liveFeatures.length / total) * 100 : 0
                return (
                  <div style={{ height: 2, background: '#141414', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: level.color,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                )
              })()}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '2px 6px', borderRadius: 3,
                  background: `${data.color}12`,
                  border: `1px solid ${data.color}25`,
                  fontSize: 8, fontWeight: 700, color: data.color, letterSpacing: '0.06em',
                }}>
                  {data.label}
                </div>
                <span style={{ fontSize: 8, color: '#27272A', fontVariantNumeric: 'tabular-nums' }}>
                  {mod.lastUpdated}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div style={{
        flexShrink: 0, padding: '10px 24px',
        borderTop: '1px solid #0F0F0F',
        display: 'flex', alignItems: 'center', gap: 20,
        background: '#0A0A0A',
      }}>
        <span style={{ fontSize: 7, color: '#27272A', letterSpacing: '0.1em' }}>MATURITY</span>
        {LEVEL_ORDER.filter(l => countByLevel(l) > 0).map(level => {
          const cfg = LEVEL_CONFIG[level]
          return (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: 8, color: '#3F3F46' }}>{cfg.label}</span>
              <span style={{ fontSize: 8, color: '#27272A' }}>×{countByLevel(level)}</span>
            </div>
          )
        })}
        <div style={{ width: 1, height: 10, background: '#1A1A1A' }} />
        {Object.entries(DATA_CONFIG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: v.color }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
