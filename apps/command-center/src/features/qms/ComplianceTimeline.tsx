/**
 * ComplianceTimeline — Revisionsspår för ISO-efterlevnad
 * Kronologisk vy av möten, beslut och evidens för revisorer
 *
 * Designstandard: cream #F5F0E8 · Navy #0A3D62 · Gold #E8B84B
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineItem {
  type: 'meeting' | 'management_review' | 'decision'
  date: string | null
  title: string
  meeting_type: string
  status: string
  summary?: string
  chosen_option?: string
  ref_id: string
  meeting_id?: string
  iso_clauses: string[]
}

interface MeetingLink {
  iso_clause: string
  meeting_type: string
  link_description: string
  is_primary_evidence: boolean
}

interface TimelineResponse {
  entity_slug: string
  clause_filter: string | null
  total: number
  items: TimelineItem[]
  meeting_links: MeetingLink[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLAUSE_OPTIONS = [
  { value: '', label: 'Alla klausuler' },
  { value: '6.2', label: '6.2 — Kvalitetsmål' },
  { value: '9.1', label: '9.1 — Övervakning & mätning' },
  { value: '9.2', label: '9.2 — Intern revision' },
  { value: '9.3', label: '9.3 — Ledningsgenomgång' },
  { value: '10.2', label: '10.2 — Avvikelser & CAPA' },
  { value: '10.3', label: '10.3 — Ständig förbättring' },
]

const MEETING_TYPE_OPTIONS = [
  { value: '', label: 'Alla typer' },
  { value: 'annual', label: 'Annual Planning' },
  { value: 'qbr', label: 'QBR (Kvartal)' },
  { value: 'management-review', label: 'Ledningsgenomgång' },
  { value: 'monthly', label: 'Månadsvis' },
  { value: 'kpi-review', label: 'KPI-uppföljning' },
]

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  meeting: { bg: '#EBF5FB', border: '#AED6F1', icon: '📅', label: 'Möte' },
  management_review: { bg: '#EAFAF1', border: '#A9DFBF', icon: '🏛️', label: 'Ledningsgenomgång' },
  decision: { bg: '#FEF9E7', border: '#F9E79F', icon: '⚖️', label: 'Beslut' },
}

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  scheduled: { bg: '#EBF5FB', fg: '#1A5276' },
  completed: { bg: '#EAFAF1', fg: '#1D6A39' },
  cancelled: { bg: '#FDEDEC', fg: '#922B21' },
  open: { bg: '#FEF9E7', fg: '#7D6608' },
  resolved: { bg: '#EAFAF1', fg: '#1D6A39' },
  pending: { bg: '#F4F6F7', fg: '#5D6D7E' },
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ComplianceTimelineProps {
  entitySlug: string
}

export function ComplianceTimeline({ entitySlug }: ComplianceTimelineProps) {
  const { apiFetch } = useApi()
  const [data, setData] = useState<TimelineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [clauseFilter, setClauseFilter] = useState('')
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (clauseFilter) params.set('clause', clauseFilter)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      params.set('limit', '100')

      const res = await apiFetch(`/api/qms/${entitySlug}/compliance-timeline?${params.toString()}`)
      if (res.ok) {
        const json = await res.json() as TimelineResponse
        setData(json)
      } else {
        setError('Kunde inte hämta revisionsspår')
      }
    } catch (e: any) {
      setError(e?.message ?? 'Nätverksfel')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, entitySlug, clauseFilter, fromDate, toDate])

  useEffect(() => { void load() }, [load])

  // Client-side meeting type filter
  const filteredItems = meetingTypeFilter
    ? (data?.items ?? []).filter(item =>
        item.meeting_type === meetingTypeFilter ||
        (meetingTypeFilter === 'management-review' && item.type === 'management_review')
      )
    : (data?.items ?? [])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Filter bar */}
      <div style={{
        background: '#fff', border: '1px solid #E2D9C8', borderRadius: '10px',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <div style={labelStyle}>ISO-klausul</div>
          <select
            value={clauseFilter}
            onChange={e => setClauseFilter(e.target.value)}
            style={selectStyle}
          >
            {CLAUSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <div style={labelStyle}>Mötestyp</div>
          <select
            value={meetingTypeFilter}
            onChange={e => setMeetingTypeFilter(e.target.value)}
            style={selectStyle}
          >
            {MEETING_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <div style={labelStyle}>Från datum</div>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={selectStyle}
          />
        </div>

        <div>
          <div style={labelStyle}>Till datum</div>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={selectStyle}
          />
        </div>

        <button
          onClick={() => { setClauseFilter(''); setMeetingTypeFilter(''); setFromDate(''); setToDate('') }}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: '1px solid #BDC3C7',
            background: '#fff', color: '#5D6D7E', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Rensa filter
        </button>
      </div>

      {/* Meeting links summary */}
      {data && data.meeting_links.length > 0 && (
        <div style={{
          background: '#FFF9EF', border: '1px solid #E8B84B', borderRadius: '10px',
          padding: '16px 20px', marginBottom: '20px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0A3D62', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Systemkopplingar — Bevisstruktur
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.meeting_links.map((link, i) => (
              <div key={i} style={{
                background: link.is_primary_evidence ? '#EAFAF1' : '#F4F6F7',
                border: `1px solid ${link.is_primary_evidence ? '#A9DFBF' : '#E2D9C8'}`,
                borderRadius: '6px', padding: '6px 12px', fontSize: '11px',
              }}>
                <span style={{ fontWeight: 700, color: '#0A3D62' }}>{link.iso_clause}</span>
                {' · '}
                <span style={{ color: '#5D6D7E' }}>{link.meeting_type}</span>
                {link.is_primary_evidence && (
                  <span style={{ marginLeft: '6px', background: '#E8B84B', color: '#0A3D62', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontWeight: 700 }}>
                    Primär evidens
                  </span>
                )}
                {link.link_description && (
                  <div style={{ color: '#7F8C8D', marginTop: '2px', fontSize: '10px', maxWidth: '280px' }}>
                    {link.link_description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#5D6D7E' }}>
          Laddar revisionsspår...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#922B21' }}>
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px', color: '#5D6D7E',
          background: '#fff', border: '1px solid #E2D9C8', borderRadius: '10px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontWeight: 600, color: '#0A3D62', marginBottom: '6px' }}>Inga poster i revisionsspåret</div>
          <div style={{ fontSize: '12px' }}>Möten och beslut registrerade i systemet visas här</div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: '20px', top: '20px', bottom: '20px',
            width: '2px', background: '#E2D9C8',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredItems.map((item, idx) => {
              const tc = TYPE_COLORS[item.type] ?? TYPE_COLORS.meeting
              const ss = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending

              return (
                <div key={`${item.type}-${item.ref_id}-${idx}`} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Timeline dot */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: tc.bg, border: `2px solid ${tc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0, zIndex: 1,
                    position: 'relative',
                  }}>
                    {tc.icon}
                  </div>

                  {/* Content card */}
                  <div style={{
                    flex: 1, background: '#fff', border: '1px solid #E2D9C8',
                    borderRadius: '10px', padding: '14px 16px',
                    borderLeft: `3px solid ${tc.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.5px', color: '#5D6D7E',
                            background: tc.bg, padding: '2px 8px', borderRadius: '4px',
                          }}>
                            {tc.label}
                          </span>
                          {item.meeting_type && item.meeting_type !== 'general' && (
                            <span style={{
                              fontSize: '10px', fontWeight: 600, color: '#0A3D62',
                              background: '#EBF5FB', padding: '2px 8px', borderRadius: '4px',
                            }}>
                              {item.meeting_type}
                            </span>
                          )}
                          {item.iso_clauses.map(c => (
                            <span key={c} style={{
                              fontSize: '10px', fontWeight: 700, color: '#7D6608',
                              background: '#FEF9E7', border: '1px solid #F9E79F',
                              padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace',
                            }}>
                              ISO {c}
                            </span>
                          ))}
                        </div>

                        <div style={{ fontWeight: 600, color: '#0A3D62', fontSize: '14px', marginBottom: '4px' }}>
                          {item.title}
                        </div>

                        {item.summary && (
                          <div style={{ fontSize: '12px', color: '#5D6D7E', lineHeight: 1.5 }}>
                            {item.summary.length > 200 ? `${item.summary.slice(0, 200)}...` : item.summary}
                          </div>
                        )}

                        {item.chosen_option && (
                          <div style={{
                            marginTop: '6px', fontSize: '12px', color: '#1D6A39',
                            background: '#EAFAF1', border: '1px solid #A9DFBF',
                            borderRadius: '4px', padding: '4px 10px',
                          }}>
                            ✅ Beslut: {item.chosen_option}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {item.date && (
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0A3D62', marginBottom: '4px' }}>
                            {new Date(item.date).toLocaleDateString('sv-SE', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>
                        )}
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 8px',
                          borderRadius: '4px', ...ss,
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data && (
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#7F8C8D' }}>
          Visar {filteredItems.length} av {data.total} poster
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#5D6D7E',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
}

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: '6px', border: '1px solid #BDC3C7',
  background: '#fff', color: '#2C3E50', fontSize: '13px',
  cursor: 'pointer', minWidth: '180px',
}
