// ─── Wavult OS — System Status View ──────────────────────────────────────────
// Enterprise module registry — reaktivt med designsystemets tema

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
  enterprise: { color: '#10B981', bg: 'rgba(16,185,129,.08)', label: 'ENTERPRISE' },
  production: { color: '#2563EB', bg: 'rgba(37,99,235,.08)',  label: 'PRODUCTION' },
  beta:       { color: '#0891B2', bg: 'rgba(8,145,178,.08)',  label: 'BETA' },
  alpha:      { color: '#D97706', bg: 'rgba(217,119,6,.08)',  label: 'ALPHA' },
  skeleton:   { color: '#6B7280', bg: 'rgba(107,114,128,.08)', label: 'SKELETON' },
}

const DATA_CONFIG: Record<string, { color: string; label: string }> = {
  live:    { color: '#10B981', label: '● LIVE' },
  partial: { color: '#2563EB', label: '◐ PARTIAL' },
  mock:    { color: '#D97706', label: '○ MOCK' },
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
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: 'var(--color-bg, #F5F0E8)',
      color: 'var(--color-text-primary, #0A3D62)',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0,
        padding: '14px 24px',
        borderBottom: '1px solid var(--color-border, rgba(10,61,98,.1))',
        background: 'var(--color-surface, #FDFAF5)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        flexWrap: 'wrap',
        rowGap: 8,
      }}>
        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24, borderRight: '1px solid var(--color-border, rgba(10,61,98,.1))' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#10B981',
            boxShadow: '0 0 8px rgba(16,185,129,.5)',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary, #0A3D62)', letterSpacing: '0.06em' }}>
            SYSTEM STABLE
          </span>
        </div>

        {/* Stats */}
        {[
          { label: 'MODULER', value: String(total) },
          { label: 'LIVE DATA', value: String(liveModules), color: '#10B981' },
          ...LEVEL_ORDER.map(level => ({
            label: MATURITY_LABELS[level].toUpperCase(),
            value: String(countByLevel(level)),
            color: countByLevel(level) > 0 ? LEVEL_CONFIG[level].color : 'var(--color-text-muted, rgba(10,61,98,.3))',
          })).filter(s => parseInt(s.value) > 0),
        ].map(s => (
          <div key={s.label} style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid var(--color-border, rgba(10,61,98,.1))' }}>
            <div style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.4))', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color ?? 'var(--color-text-primary, #0A3D62)', fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </div>
          </div>
        ))}

        {/* Health bar */}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.4))', letterSpacing: '0.1em' }}>MODULE HEALTH</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {sortedModules.map(m => (
              <div key={m.id} style={{
                width: 6, height: 18, borderRadius: 2,
                background: LEVEL_CONFIG[m.level].color,
                opacity: 0.65,
              }} title={`${m.name} — ${MATURITY_LABELS[m.level]}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <div style={{
        flexShrink: 0,
        padding: '16px 24px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted, rgba(10,61,98,.4))', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Module Registry
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border, rgba(10,61,98,.1))' }} />
        <span style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.3))' }}>{total} moduler</span>
      </div>

      {/* ── Module grid ── */}
      <div style={{
        flex: 1,
        padding: '0 24px 24px',
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
                background: 'var(--color-surface, #FDFAF5)',
                border: '1px solid var(--color-border, rgba(10,61,98,.1))',
                borderLeft: `3px solid ${level.color}`,
                borderRadius: 8,
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                fontFamily: 'system-ui, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.boxShadow = `0 4px 16px ${level.color}20`
                el.style.transform = 'translateY(-1px)'
                el.style.borderColor = `${level.color}40`
                el.style.borderLeftColor = level.color
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.boxShadow = 'none'
                el.style.transform = ''
                el.style.borderColor = 'var(--color-border, rgba(10,61,98,.1))'
                el.style.borderLeftColor = level.color
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{mod.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary, #0A3D62)', letterSpacing: '0.01em', lineHeight: 1.3 }}>
                    {mod.name}
                  </span>
                </div>
                <div style={{
                  flexShrink: 0,
                  padding: '2px 7px',
                  borderRadius: 4,
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
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.5))' }}>{mod.liveFeatures.length} live</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.5))' }}>{mod.mockFeatures.length} mock</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ArrowUpRight size={9} color="rgba(10,61,98,.3)" />
                  <span style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.3))' }}>Fas {mod.phase}</span>
                </div>
              </div>

              {/* Progress bar */}
              {(() => {
                const tot = mod.liveFeatures.length + mod.mockFeatures.length
                const pct = tot > 0 ? (mod.liveFeatures.length / tot) * 100 : 0
                return (
                  <div style={{ height: 3, background: 'var(--color-border, rgba(10,61,98,.1))', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: level.color,
                      borderRadius: 2,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                )
              })()}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: `${data.color}10`,
                  border: `1px solid ${data.color}25`,
                  fontSize: 8, fontWeight: 700, color: data.color, letterSpacing: '0.06em',
                }}>
                  {data.label}
                </div>
                <span style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.3))', fontVariantNumeric: 'tabular-nums' }}>
                  {mod.lastUpdated}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 24px',
        borderTop: '1px solid var(--color-border, rgba(10,61,98,.1))',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: 'var(--color-surface, #FDFAF5)',
        flexWrap: 'wrap',
        rowGap: 6,
      }}>
        <span style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.3))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mognadsnivå</span>
        {LEVEL_ORDER.filter(l => countByLevel(l) > 0).map(level => {
          const cfg = LEVEL_CONFIG[level]
          return (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: 9, color: 'var(--color-text-secondary, rgba(10,61,98,.6))' }}>{cfg.label}</span>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.3))' }}>×{countByLevel(level)}</span>
            </div>
          )
        })}
        <div style={{ width: 1, height: 12, background: 'var(--color-border, rgba(10,61,98,.15))' }} />
        {Object.entries(DATA_CONFIG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: v.color, fontWeight: 600 }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
