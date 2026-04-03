/**
 * QmsDashboard — ISO Compliance Management
 * ISO 9001:2015 / ISO 27001:2022 / GDPR / NIS2
 *
 * Designstandard: #F5F0E8 cream · Navy #0A3D62 · Gold #E8B84B
 */

import React, { useState, useMemo } from 'react'
import { useQmsEntities, useQmsDashboard, useQmsControls } from './useQmsData'
import { ControlDetail } from './ControlDetail'
import { ComplianceTimeline } from './ComplianceTimeline'
import type { QmsStatus, IsoControl } from './qmsTypes'

const STATUS_LABELS: Record<QmsStatus, string> = {
  not_started:    'Ej påbörjad',
  in_progress:    'Pågår',
  implemented:    'Implementerad',
  verified:       'Verifierad',
  not_applicable: 'Ej tillämplig',
}

const STATUS_COLORS: Record<QmsStatus, { bg: string; fg: string; dot: string }> = {
  not_started:    { bg: '#F4F6F7', fg: '#5D6D7E', dot: '#CCD1D1' },
  in_progress:    { bg: '#FEF9E7', fg: '#9A7D0A', dot: '#F9E79F' },
  implemented:    { bg: '#EBF5FB', fg: '#1A5276', dot: '#AED6F1' },
  verified:       { bg: '#EAFAF1', fg: '#1D6A39', dot: '#A9DFBF' },
  not_applicable: { bg: '#F4F6F7', fg: '#7F8C8D', dot: '#BFC9CA' },
}

const STANDARD_OPTIONS = [
  { code: '', label: 'Alla standarder' },
  { code: 'ISO_9001_2015', label: 'ISO 9001:2015' },
  { code: 'ISO_27001_2022', label: 'ISO 27001:2022' },
  { code: 'GDPR_2018', label: 'GDPR' },
  { code: 'NIS2_2022', label: 'NIS2' },
]

const CATEGORY_OPTIONS = [
  { code: '', label: 'Alla kategorier' },
  { code: 'context', label: 'Sammanhang' },
  { code: 'leadership', label: 'Ledarskap' },
  { code: 'planning', label: 'Planering' },
  { code: 'support', label: 'Stöd' },
  { code: 'operation', label: 'Drift' },
  { code: 'evaluation', label: 'Utvärdering' },
  { code: 'improvement', label: 'Förbättring' },
  { code: 'organizational', label: 'Organisatorisk' },
  { code: 'people', label: 'Personal' },
  { code: 'physical', label: 'Fysisk' },
  { code: 'technological', label: 'Teknologisk' },
]

export function QmsDashboard() {
  const { entities, loading: entLoading } = useQmsEntities()

  const [selectedSlug, setSelectedSlug] = useState<string>('wavult-os')
  const [selectedStandard, setSelectedStandard] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'controls' | 'timeline'>('controls')

  const { dashboard } = useQmsDashboard(selectedSlug)
  const { controls, standards, loading: ctrlLoading } = useQmsControls(
    selectedSlug,
    selectedStandard || undefined,
    selectedCategory || undefined
  )

  const filteredControls = useMemo(() => {
    if (!search) return controls
    const q = search.toLowerCase()
    return controls.filter(c =>
      c.clause.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.requirement.toLowerCase().includes(q)
    )
  }, [controls, search])

  const stats = dashboard?.stats

  return (
    <div style={{ background: '#F5F0E8', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#0A3D62', padding: '20px 32px', borderBottom: '3px solid #E8B84B' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 800, letterSpacing: '-0.3px' }}>
              QMS — Quality Management System
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#AED6F1' }}>
              ISO 9001:2015 · ISO 27001:2022 · GDPR · NIS2 · Compliance by System
            </p>
          </div>

          {/* Entity selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ color: '#AED6F1', fontSize: '12px', fontWeight: 600 }}>Entitet:</label>
            <select
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #E8B84B', background: '#fff', color: '#0A3D62', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              {entLoading ? (
                <option>Laddar...</option>
              ) : (
                entities.map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)
              )}
            </select>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: '1400px' }}>

        {/* Stats row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <StatCard label="Totalt" value={stats.total_controls} color="#0A3D62" />
            <StatCard label="Ej påbörjad" value={stats.not_started} color="#7F8C8D" />
            <StatCard label="Pågår" value={stats.in_progress} color="#9A7D0A" />
            <StatCard label="Implementerad" value={stats.implemented} color="#1A5276" />
            <StatCard label="Verifierad" value={stats.verified} color="#1D6A39" />
            <StatCard label="Spårade" value={`${stats.tracked}/${stats.total_controls}`} color="#7D6608" />
          </div>
        )}

        {/* Standards breakdown */}
        {dashboard?.standards && dashboard.standards.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {dashboard.standards.map(std => (
                <div key={std.code} style={{
                  background: '#fff', border: '1px solid #E2D9C8', borderRadius: '10px',
                  padding: '16px', cursor: 'pointer',
                  outline: selectedStandard === std.code ? '2px solid #E8B84B' : 'none',
                }}
                  onClick={() => setSelectedStandard(selectedStandard === std.code ? '' : std.code)}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0A3D62', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {std.code.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5D6D7E', marginBottom: '10px', lineHeight: 1.3 }}>{std.name.split(' ').slice(0, 4).join(' ')}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#5D6D7E' }}>{std.implemented}/{std.total} krav</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: std.completion_pct >= 80 ? '#1D6A39' : std.completion_pct >= 40 ? '#9A7D0A' : '#5D6D7E' }}>
                      {std.completion_pct}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: '#E2D9C8', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${std.completion_pct}%`, background: std.completion_pct >= 80 ? '#27AE60' : std.completion_pct >= 40 ? '#E8B84B' : '#CCD1D1', borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #E2D9C8' }}>
          {([['controls', '🗂️ Kontroller'], ['timeline', '📋 Revisionsspår']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 24px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', border: 'none', background: 'transparent',
                color: activeTab === tab ? '#0A3D62' : '#7F8C8D',
                borderBottom: activeTab === tab ? '3px solid #E8B84B' : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Revisionsspår */}
        {activeTab === 'timeline' && (
          <ComplianceTimeline entitySlug={selectedSlug} />
        )}

        {/* Kontroller tab */}
        {activeTab === 'controls' && <>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök klausul, titel, kravtext..."
            style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #BDC3C7', background: '#fff', fontSize: '13px', color: '#2C3E50', width: '260px' }}
          />

          {/* Standard filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STANDARD_OPTIONS.map(opt => (
              <button key={opt.code}
                onClick={() => setSelectedStandard(opt.code)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${selectedStandard === opt.code ? '#0A3D62' : '#BDC3C7'}`,
                  background: selectedStandard === opt.code ? '#0A3D62' : '#fff',
                  color: selectedStandard === opt.code ? '#fff' : '#5D6D7E',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {CATEGORY_OPTIONS.map(opt => (
            <button key={opt.code}
              onClick={() => setSelectedCategory(opt.code)}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${selectedCategory === opt.code ? '#E8B84B' : '#E2D9C8'}`,
                background: selectedCategory === opt.code ? '#FEF9E7' : '#F5F0E8',
                color: selectedCategory === opt.code ? '#7D6608' : '#7F8C8D',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Controls list */}
        {ctrlLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5D6D7E' }}>Laddar kontroller...</div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E2D9C8', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', background: '#FFF9EF', borderBottom: '1px solid #E2D9C8', fontSize: '12px', color: '#5D6D7E', fontWeight: 600 }}>
              {filteredControls.length} kontroller visas
            </div>

            <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 520px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2D9C8', background: '#FDFAF4' }}>
                    <th style={thStyle}>Klausul</th>
                    <th style={thStyle}>Titel</th>
                    <th style={thStyle}>Standard</th>
                    <th style={thStyle}>Kategori</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredControls.map((ctrl, idx) => {
                    const implStatus = (ctrl.implementation?.status ?? 'not_started') as QmsStatus
                    const sc = STATUS_COLORS[implStatus]
                    return (
                      <tr key={ctrl.id}
                        onClick={() => setSelectedControlId(ctrl.id)}
                        style={{
                          borderBottom: '1px solid #F0EBE0',
                          cursor: 'pointer',
                          background: selectedControlId === ctrl.id ? '#FEF9E7' : idx % 2 === 0 ? '#fff' : '#FDFAF4',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEF9E7')}
                        onMouseLeave={e => (e.currentTarget.style.background = selectedControlId === ctrl.id ? '#FEF9E7' : idx % 2 === 0 ? '#fff' : '#FDFAF4')}
                      >
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: '#0A3D62', whiteSpace: 'nowrap' }}>
                          {ctrl.clause}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '320px' }}>
                          <span style={{ fontWeight: 500, color: '#2C3E50' }}>{ctrl.title}</span>
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '11px', background: '#EBF5FB', color: '#1A5276', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {ctrl.iso_standards?.code?.replace(/_/g, ' ') ?? ''}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '11px', color: '#5D6D7E' }}>{ctrl.category ?? '—'}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                            background: sc.bg, color: sc.fg,
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                            {STATUS_LABELS[implStatus]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </> /* end controls tab */}
      </div>

      {/* Control Detail slide-over */}
      {selectedControlId && (
        <>
          <div
            onClick={() => setSelectedControlId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }}
          />
          <ControlDetail
            entitySlug={selectedSlug}
            controlId={selectedControlId}
            onClose={() => setSelectedControlId(null)}
          />
        </>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2D9C8', borderRadius: '10px',
      padding: '16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#7F8C8D', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: '#5D6D7E',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  color: '#2C3E50',
  verticalAlign: 'middle',
}
