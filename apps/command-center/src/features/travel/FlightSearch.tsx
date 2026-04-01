import { useState } from 'react'
import { Search } from 'lucide-react'

const QZ_API = 'https://api.wavult.com'

interface Flight {
  id: string
  price: string
  currency: string
  airline: string
  airline_iata: string
  duration: string
  departure: string
  arrival: string
  stops: number
  segments: Array<{ flight: string; from: string; to: string; dep: string; arr: string }>
}

// Quick links for common team routes
const QUICK_ROUTES = [
  { label: 'BKK → Surat Thani', from: 'BKK', to: 'URT' },
  { label: 'HKT → Shenzhen',    from: 'HKT', to: 'SZX' },
  { label: 'HKT → Arlanda',     from: 'HKT', to: 'ARN' },
  { label: 'ARN → Bangkok',     from: 'ARN', to: 'BKK' },
]

export function FlightSearch() {
  const [origin, setOrigin]           = useState('BKK')
  const [destination, setDestination] = useState('URT')
  const [date, setDate]               = useState('2026-04-18')
  const [passengers, setPassengers]   = useState(5)
  const [flights, setFlights]         = useState<Flight[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function search() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${QZ_API}/v1/flights/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, date, passengers }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFlights(data.flights || [])
      if ((data.flights || []).length === 0) {
        setError('Inga flyg hittades för den här sträckan och datumet.')
      }
    } catch (err) {
      setError(`API-fel: ${err}. Kontrollera att DUFFEL_ACCESS_TOKEN är satt i ECS miljövariabler.`)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }

  function formatPrice(amount: string, currency: string) {
    const n = parseFloat(amount)
    if (isNaN(n)) return `${amount} ${currency}`
    return `${n.toLocaleString('sv-SE')} ${currency}`
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)',
    fontSize: 13,
    fontFamily: 'system-ui',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Search panel */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: '0 0 16px' }}>
          ✈️ Flygbiljetter
        </h2>

        {/* Quick routes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {QUICK_ROUTES.map(r => (
            <button
              key={r.label}
              onClick={() => { setOrigin(r.from); setDestination(r.to) }}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                background: origin === r.from && destination === r.to ? '#1E40AF' : '#F9FAFB',
                color:      origin === r.from && destination === r.to ? '#fff'    : '#374151',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Från (IATA)
            </label>
            <input
              value={origin}
              onChange={e => setOrigin(e.target.value.toUpperCase())}
              placeholder="BKK"
              maxLength={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Till (IATA)
            </label>
            <input
              value={destination}
              onChange={e => setDestination(e.target.value.toUpperCase())}
              placeholder="URT"
              maxLength={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Pax
            </label>
            <input
              type="number"
              value={passengers}
              min={1}
              max={9}
              onChange={e => setPassengers(Number(e.target.value))}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#60A5FA' : '#1E40AF',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <Search size={14} />
            {loading ? 'Söker…' : 'Sök flyg'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: '#92400E',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {flights.length === 0 && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF', fontSize: 14 }}>
          Välj rutt och datum, tryck <strong>Sök flyg</strong> för att visa tillgängliga alternativ
        </div>
      )}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {flights.map(f => (
          <div
            key={f.id}
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>
                  {f.airline || f.airline_iata || 'Okänt flygbolag'}
                </span>
                <span style={{
                  fontSize: 11,
                  color: f.stops === 0 ? '#059669' : '#9CA3AF',
                  fontWeight: f.stops === 0 ? 600 : 400,
                }}>
                  {f.stops === 0 ? 'Direktflyg' : `${f.stops} stopp`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#374151' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 15 }}>
                  {formatTime(f.departure)}
                </span>
                <span style={{ color: '#93C5FD' }}>──✈──</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 15 }}>
                  {formatTime(f.arrival)}
                </span>
                {f.duration && (
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>({f.duration})</span>
                )}
              </div>
              {/* Segment detail */}
              {f.segments && f.segments.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {f.segments.map((seg, i) => (
                    <span key={i} style={{
                      fontSize: 11,
                      color: '#6B7280',
                      background: '#F3F4F6',
                      borderRadius: 4,
                      padding: '2px 7px',
                    }}>
                      {seg.flight} · {seg.from}→{seg.to}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', marginLeft: 24 }}>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#1C1C1E',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatPrice(f.price, f.currency)}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>per person</div>
              <button
                style={{
                  padding: '7px 16px',
                  borderRadius: 7,
                  border: 'none',
                  background: '#1E40AF',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  // Booking flow: passes offer_id to /v1/flights/book
                  alert(`Boka offer: ${f.id}\nImplementera bokningsformulär med passagerarupplysningar.`)
                }}
              >
                Boka
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
