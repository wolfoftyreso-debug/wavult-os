import { useState, useEffect } from 'react'
import { ModuleHeader, SectionIllustration } from '../../shared/illustrations/ModuleIllustration'

interface UAPIXRecord {
  id: string
  designation: string
  date: string
  location: string
  classification: string
  confidence: number
  altitude?: string
  duration?: string
}

const FALLBACK_RECORDS: UAPIXRecord[] = [
  { id: 'uap-001', designation: 'UAP-SE-2026-001', date: '2026-03-14', location: 'Stockholms skärgård, Sverige', classification: 'UAP-Alpha', confidence: 87, altitude: '3 200m', duration: '14 min' },
  { id: 'uap-002', designation: 'UAP-SE-2026-002', date: '2026-02-28', location: 'Gotland, Sverige', classification: 'Atmosfärisk Anomali', confidence: 62, altitude: '800m', duration: '3 min' },
  { id: 'uap-003', designation: 'UAP-SE-2025-089', date: '2025-11-03', location: 'Kiruna, Lappland', classification: 'UAP-Beta', confidence: 74, altitude: '12 000m', duration: '22 min' },
  { id: 'uap-004', designation: 'UAP-FI-2025-041', date: '2025-09-17', location: 'Finska viken, Helsingfors', classification: 'Okänd', confidence: 51, altitude: 'N/A', duration: '8 min' },
  { id: 'uap-005', designation: 'UAP-NO-2025-012', date: '2025-07-22', location: 'Nordsjön, Norge', classification: 'UAP-Alpha', confidence: 91, altitude: '6 500m', duration: '37 min' },
  { id: 'uap-006', designation: 'UAP-SE-2025-057', date: '2025-06-01', location: 'Malmö, Sverige', classification: 'Atmosfärisk Anomali', confidence: 44, altitude: '200m', duration: '1 min' },
  { id: 'uap-007', designation: 'UAP-DK-2026-003', date: '2026-01-19', location: 'Bornholm, Danmark', classification: 'UAP-Gamma', confidence: 78, altitude: '9 100m', duration: '51 min' },
]

const CLASS_ICONS: Record<string, string> = {
  'UAP-Alpha': '🔴',
  'UAP-Beta': '🟠',
  'UAP-Gamma': '🟣',
  'Atmosfärisk Anomali': '🔵',
  'Okänd': '⚪',
}

const CLASS_COLORS: Record<string, string> = {
  'UAP-Alpha': '#C0392B',
  'UAP-Beta': '#E67E22',
  'UAP-Gamma': '#8E44AD',
  'Atmosfärisk Anomali': '#2980B9',
  'Okänd': '#7F8C8D',
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? '#2D7A4F' : value >= 60 ? '#E8B84B' : '#B8760A'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(10,61,98,.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .6s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: 'monospace', color, fontWeight: 700, minWidth: 32 }}>{value}%</span>
    </div>
  )
}

function PulsingDot({ classification }: { classification: string }) {
  const color = CLASS_COLORS[classification] || '#7F8C8D'
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.3,
        animation: 'uapix-pulse 2s ease-in-out infinite',
      }} />
      <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: color }} />
    </div>
  )
}

function useUAPIXData() {
  const [records, setRecords] = useState<UAPIXRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRecords(FALLBACK_RECORDS)
      setUsingFallback(true)
      setLoading(false)
    }, 4000)

    fetch('/api/uapix/records')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => {
        clearTimeout(timeout)
        const r = d.records ?? []
        if (r.length > 0) {
          setRecords(r)
          setUsingFallback(false)
        } else {
          setRecords(FALLBACK_RECORDS)
          setUsingFallback(true)
        }
        setLoading(false)
      })
      .catch(() => {
        clearTimeout(timeout)
        setRecords(FALLBACK_RECORDS)
        setUsingFallback(true)
        setLoading(false)
      })

    return () => clearTimeout(timeout)
  }, [])

  return { records, loading, usingFallback }
}

export default function UAPIXView() {
  const { records, loading, usingFallback } = useUAPIXData()

  return (
    <div>
      <style>{`
        @keyframes uapix-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      <ModuleHeader
        route="/uapix"
        label="UAPIX"
        title="Unidentified Aerial Phenomena"
        description="Klassificerade observationer och rapporter"
        illustrationSize="md"
      />

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 14px', background: 'rgba(10,61,98,.04)', borderRadius: 8, border: '1px solid rgba(10,61,98,.08)' }}>
        <PulsingDot classification="UAP-Alpha" />
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#0A3D62', fontWeight: 600 }}>
          {loading ? 'Ansluter till klassificeringssystem...' : `${records.length} observationer registrerade`}
        </span>
        {usingFallback && !loading && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(10,61,98,.35)', fontFamily: 'monospace' }}>
            Arkivdata · Live-system offline
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(10,61,98,.3)', fontSize: 13 }}>
          Hämtar klassificerade data...
        </div>
      )}

      {!loading && records.length === 0 && (
        <SectionIllustration route="/uapix" title="Inga observationer registrerade" description="Systemet övervakar och registrerar automatiskt" />
      )}

      {!loading && records.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {records.map(r => (
            <div key={r.id} style={{
              background: 'var(--color-surface, #FDFAF5)',
              border: '1px solid rgba(10,61,98,.1)',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              alignItems: 'start',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <PulsingDot classification={r.classification} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0A3D62', fontFamily: 'monospace' }}>
                    {r.designation}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(10,61,98,.5)', marginBottom: 6 }}>
                  📍 {r.location} &nbsp;·&nbsp; 📅 {r.date}
                  {r.altitude && <>&nbsp;·&nbsp; ↑ {r.altitude}</>}
                  {r.duration && <>&nbsp;·&nbsp; ⏱ {r.duration}</>}
                </div>
                <ConfidenceBar value={r.confidence} />
              </div>
              <div style={{ textAlign: 'right', paddingTop: 2 }}>
                <div style={{ fontSize: 18 }}>{CLASS_ICONS[r.classification] ?? '❓'}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: CLASS_COLORS[r.classification] ?? '#7F8C8D', marginTop: 2 }}>
                  {r.classification}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
