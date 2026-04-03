/**
 * ControlDetail — slide-over panel för en ISO-kontroll
 * Visar kravtext, implementation, system mappings, bevis, status.
 */

import React, { useState, useEffect } from 'react'
import { useQmsControlDetail } from './useQmsData'
import { SystemMappingBadge } from './SystemMappingBadge'
import type { QmsStatus, MappingType, EvidenceType } from './qmsTypes'
import { useApi } from '../../shared/auth/useApi'

const STATUS_LABELS: Record<QmsStatus, string> = {
  not_started:    'Ej påbörjad',
  in_progress:    'Pågår',
  implemented:    'Implementerad',
  verified:       'Verifierad',
  not_applicable: 'Ej tillämplig',
}

const STATUS_COLORS: Record<QmsStatus, { bg: string; fg: string; border: string }> = {
  not_started:    { bg: '#F5F0E8', fg: '#5D6D7E', border: '#D5D8DC' },
  in_progress:    { bg: '#FEF9E7', fg: '#9A7D0A', border: '#F9E79F' },
  implemented:    { bg: '#EBF5FB', fg: '#1A5276', border: '#AED6F1' },
  verified:       { bg: '#EAFAF1', fg: '#1D6A39', border: '#A9DFBF' },
  not_applicable: { bg: '#F4F6F7', fg: '#7F8C8D', border: '#CCD1D1' },
}

const MAPPING_TYPE_OPTIONS: MappingType[] = [
  'api_route', 'database_table', 'infra', 'policy_doc', 'code_file', 'external_service'
]
const EVIDENCE_TYPE_OPTIONS: EvidenceType[] = [
  'screenshot', 'log_sample', 'config', 'certificate', 'policy', 'test_result'
]

interface Props {
  entitySlug: string
  controlId: string
  onClose: () => void
}

export function ControlDetail({ entitySlug, controlId, onClose }: Props) {
  const { control, loading, error, refetch, updateImplementation } = useQmsControlDetail(entitySlug, controlId)
  const { apiFetch } = useApi()

  const [editingImpl, setEditingImpl] = useState(false)
  const [implText, setImplText] = useState('')
  const [gapText, setGapText] = useState('')
  const [saving, setSaving] = useState(false)

  // Add mapping form
  const [showAddMapping, setShowAddMapping] = useState(false)
  const [newMapping, setNewMapping] = useState({ mapping_type: 'api_route', label: '', reference: '', health_check_url: '', health_check_type: 'http_200' })

  // Add evidence form
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [newEvidence, setNewEvidence] = useState({ evidence_type: 'log_sample', title: '', content: '', collected_by: '' })

  useEffect(() => {
    if (control?.implementation) {
      setImplText(control.implementation.implementation_text ?? '')
      setGapText(control.implementation.gap_analysis ?? '')
    }
  }, [control])

  const impl = control?.implementation
  const status = (impl?.status ?? 'not_started') as QmsStatus
  const sc = STATUS_COLORS[status]

  async function saveImpl() {
    setSaving(true)
    await updateImplementation({ implementation_text: implText, gap_analysis: gapText })
    setEditingImpl(false)
    setSaving(false)
  }

  async function changeStatus(newStatus: QmsStatus) {
    await updateImplementation({ status: newStatus })
  }

  async function addMapping() {
    if (!newMapping.label || !newMapping.reference) return
    await apiFetch(`/v1/qms/${entitySlug}/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ control_id: controlId, ...newMapping, health_check_url: newMapping.health_check_url || null }),
    })
    setShowAddMapping(false)
    setNewMapping({ mapping_type: 'api_route', label: '', reference: '', health_check_url: '', health_check_type: 'http_200' })
    refetch()
  }

  async function deleteMapping(mappingId: string) {
    await apiFetch(`/v1/qms/${entitySlug}/mappings/${mappingId}`, { method: 'DELETE' })
    refetch()
  }

  async function addEvidence() {
    if (!newEvidence.title) return
    await apiFetch(`/v1/qms/${entitySlug}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ control_id: controlId, ...newEvidence }),
    })
    setShowAddEvidence(false)
    setNewEvidence({ evidence_type: 'log_sample', title: '', content: '', collected_by: '' })
    refetch()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '720px',
      background: '#F5F0E8', borderLeft: '2px solid #E8B84B',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2D9C8', background: '#FFF9EF', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {loading ? (
              <div style={{ color: '#5D6D7E' }}>Laddar...</div>
            ) : control ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'monospace', background: '#0A3D62', color: '#E8B84B', padding: '3px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 700 }}>
                    {control.clause}
                  </span>
                  <span style={{ fontSize: '11px', color: '#7D6608', background: '#FEF9E7', border: '1px solid #F9E79F', padding: '2px 8px', borderRadius: '4px' }}>
                    {control.iso_standards?.code?.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '11px', color: sc.fg, background: sc.bg, border: `1px solid ${sc.border}`, padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '17px', color: '#0A3D62', fontWeight: 700 }}>
                  {control.title}
                </h2>
              </>
            ) : null}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#5D6D7E', padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {error && <div style={{ color: '#c0392b', marginBottom: '16px' }}>Fel: {error}</div>}
        {!loading && control && (
          <>
            {/* Status selector */}
            <section style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Object.keys(STATUS_LABELS) as QmsStatus[]).map(s => {
                  const c = STATUS_COLORS[s]
                  const active = status === s
                  return (
                    <button key={s}
                      onClick={() => changeStatus(s)}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${active ? '#E8B84B' : c.border}`,
                        background: active ? c.bg : '#F5F0E8',
                        color: c.fg,
                        boxShadow: active ? '0 0 0 2px #E8B84B40' : 'none',
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Requirement */}
            <section style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Kravtext</label>
              <div style={{
                padding: '14px 16px', background: '#FFF9EF', border: '1px solid #E2D9C8',
                borderRadius: '8px', fontSize: '13px', color: '#2C3E50', lineHeight: '1.7',
              }}>
                {control.requirement}
              </div>
            </section>

            {/* Implementation text */}
            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Hur vi uppfyller kravet</label>
                {!editingImpl && (
                  <button onClick={() => setEditingImpl(true)} style={smallBtnStyle}>Redigera</button>
                )}
              </div>
              {editingImpl ? (
                <>
                  <textarea
                    value={implText}
                    onChange={e => setImplText(e.target.value)}
                    placeholder="Beskriv hur detta krav uppfylls i Wavult OS (markdown stöds)..."
                    style={{ ...textareaStyle, minHeight: '120px' }}
                  />
                  <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                    <label style={labelStyle}>Gap-analys</label>
                    <textarea
                      value={gapText}
                      onChange={e => setGapText(e.target.value)}
                      placeholder="Vad saknas eller behöver åtgärdas?"
                      style={{ ...textareaStyle, minHeight: '60px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={saveImpl} disabled={saving} style={primaryBtnStyle}>
                      {saving ? 'Sparar...' : 'Spara'}
                    </button>
                    <button onClick={() => setEditingImpl(false)} style={secondaryBtnStyle}>Avbryt</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    padding: '14px 16px', background: '#fff', border: '1px solid #E2D9C8',
                    borderRadius: '8px', fontSize: '13px', color: implText ? '#2C3E50' : '#95A5A6',
                    lineHeight: '1.7', minHeight: '60px', whiteSpace: 'pre-wrap',
                  }}>
                    {implText || 'Ingen implementation dokumenterad ännu.'}
                  </div>
                  {gapText && (
                    <div style={{ marginTop: '8px', padding: '10px 14px', background: '#FEF9E7', border: '1px solid #F9E79F', borderRadius: '6px', fontSize: '12px', color: '#7D6608' }}>
                      <strong>Gap:</strong> {gapText}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* System Mappings */}
            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>System Mappings</label>
                <button onClick={() => setShowAddMapping(v => !v)} style={smallBtnStyle}>
                  {showAddMapping ? 'Avbryt' : '+ Lägg till'}
                </button>
              </div>

              {showAddMapping && (
                <div style={{ ...formBoxStyle, marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={microLabelStyle}>Typ</label>
                      <select value={newMapping.mapping_type} onChange={e => setNewMapping(p => ({ ...p, mapping_type: e.target.value as MappingType }))} style={selectStyle}>
                        {MAPPING_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={microLabelStyle}>Label</label>
                      <input value={newMapping.label} onChange={e => setNewMapping(p => ({ ...p, label: e.target.value }))} placeholder="ex: Audit Log API" style={inputStyle} />
                    </div>
                    <div>
                      <label style={microLabelStyle}>Referens</label>
                      <input value={newMapping.reference} onChange={e => setNewMapping(p => ({ ...p, reference: e.target.value }))} placeholder="ex: /v1/audit/logs" style={inputStyle} />
                    </div>
                    <div>
                      <label style={microLabelStyle}>Health Check URL (valfri)</label>
                      <input value={newMapping.health_check_url} onChange={e => setNewMapping(p => ({ ...p, health_check_url: e.target.value }))} placeholder="https://api.wavult.com/..." style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={addMapping} style={primaryBtnStyle}>Lägg till mapping</button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(control.mappings ?? []).length === 0 ? (
                  <div style={{ color: '#95A5A6', fontSize: '12px', fontStyle: 'italic' }}>Inga system mappings kopplade ännu.</div>
                ) : (
                  (control.mappings ?? []).map(m => (
                    <SystemMappingBadge key={m.id} mapping={m} onDelete={deleteMapping} />
                  ))
                )}
              </div>
            </section>

            {/* Evidence */}
            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Bevis</label>
                <button onClick={() => setShowAddEvidence(v => !v)} style={smallBtnStyle}>
                  {showAddEvidence ? 'Avbryt' : '+ Lägg till'}
                </button>
              </div>

              {showAddEvidence && (
                <div style={{ ...formBoxStyle, marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={microLabelStyle}>Typ</label>
                      <select value={newEvidence.evidence_type} onChange={e => setNewEvidence(p => ({ ...p, evidence_type: e.target.value as EvidenceType }))} style={selectStyle}>
                        {EVIDENCE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={microLabelStyle}>Titel</label>
                      <input value={newEvidence.title} onChange={e => setNewEvidence(p => ({ ...p, title: e.target.value }))} placeholder="ex: Audit log export 2026-Q1" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={microLabelStyle}>Innehåll / URL</label>
                      <textarea value={newEvidence.content} onChange={e => setNewEvidence(p => ({ ...p, content: e.target.value }))} placeholder="Text, JSON, URL..." style={{ ...textareaStyle, minHeight: '60px' }} />
                    </div>
                    <div>
                      <label style={microLabelStyle}>Insamlat av</label>
                      <input value={newEvidence.collected_by} onChange={e => setNewEvidence(p => ({ ...p, collected_by: e.target.value }))} placeholder="person_id" style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={addEvidence} style={primaryBtnStyle}>Lägg till bevis</button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(control.evidence ?? []).length === 0 ? (
                  <div style={{ color: '#95A5A6', fontSize: '12px', fontStyle: 'italic' }}>Inga bevis insamlade ännu.</div>
                ) : (
                  (control.evidence ?? []).map(ev => (
                    <div key={ev.id} style={{ padding: '10px 14px', background: '#fff', border: '1px solid #E2D9C8', borderRadius: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ background: '#0A3D62', color: '#fff', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>{ev.evidence_type}</span>
                        <span style={{ color: '#0A3D62', fontWeight: 600 }}>{ev.title}</span>
                        {ev.collected_by && <span style={{ color: '#5D6D7E' }}>— {ev.collected_by}</span>}
                        <span style={{ color: '#95A5A6', marginLeft: 'auto' }}>{new Date(ev.collected_at).toLocaleDateString('sv-SE')}</span>
                      </div>
                      {ev.content && <div style={{ color: '#2C3E50', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' }}>{ev.content}</div>}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Metadata */}
            {impl?.responsible_person && (
              <section style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#5D6D7E' }}>
                  <strong>Ansvarig:</strong> {impl.responsible_person}
                  {impl.target_date && <> &nbsp;·&nbsp; <strong>Måldatum:</strong> {impl.target_date}</>}
                  {impl.verified_at && <> &nbsp;·&nbsp; <strong>Verifierad:</strong> {new Date(impl.verified_at).toLocaleDateString('sv-SE')}</>}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: '#0A3D62',
  marginBottom: '8px',
}

const microLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  color: '#5D6D7E',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#fff',
  border: '1px solid #BDC3C7',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: '#2C3E50',
  resize: 'vertical',
  boxSizing: 'border-box',
  outline: 'none',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: '#fff',
  border: '1px solid #BDC3C7',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#2C3E50',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  background: '#0A3D62',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#F5F0E8',
  color: '#0A3D62',
  border: '1px solid #BDC3C7',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
}

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#F5F0E8',
  color: '#0A3D62',
  border: '1px solid #E8B84B',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const formBoxStyle: React.CSSProperties = {
  padding: '14px',
  background: '#FFF9EF',
  border: '1px solid #E8B84B',
  borderRadius: '8px',
}
