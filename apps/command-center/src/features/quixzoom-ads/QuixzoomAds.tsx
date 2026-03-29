import { useState } from 'react'
import { ShoppingCart, Star, MapPin, Database, Check } from 'lucide-react'

interface AdsPackage {
  id: string
  title: string
  description: string
  geography: string
  recordCount: number
  price: number
  currency: string
  dataType: 'leads' | 'market_data' | 'analytics'
  qualityScore: number
  creator: string
  verified: boolean
}

const DEMO_PACKAGES: AdsPackage[] = [
  { id: 'p1', title: 'Bryggägare Stockholms Skärgård', description: 'Komplett lista med bryggägare i Stockholms skärgård med GPS-koordinater och kontaktuppgifter', geography: 'Stockholms skärgård', recordCount: 2840, price: 8900, currency: 'SEK', dataType: 'leads', qualityScore: 92, creator: 'Wavult Data', verified: true },
  { id: 'p2', title: 'Kommunala Kajanläggningar Sverige', description: 'Alla kommunala kajanläggningar med inspektionsstatus och ansvarig teknisk chef', geography: 'Sverige', recordCount: 1240, price: 14500, currency: 'SEK', dataType: 'leads', qualityScore: 88, creator: 'Wavult Data', verified: true },
  { id: 'p3', title: 'Fritidshus Värmdö — Marknadsdata', description: 'Marknadsdata för fritidshus med geo-taggade bilder och infrastrukturdata', geography: 'Värmdö', recordCount: 5600, price: 6200, currency: 'SEK', dataType: 'market_data', qualityScore: 85, creator: 'Creator AB', verified: false },
]

const TYPE_LABELS: Record<string, string> = { leads: 'Leads', market_data: 'Marknadsdata', analytics: 'Analytics' }

export function QuixzoomAds() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'builder'>('marketplace')
  const [cart, setCart] = useState<string[]>([])

  return (
    <div className="flex flex-col h-full" style={{ background: '#F2F2F7' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>Quixzoom Ads</div>
          <div style={{ fontSize: 13, color: '#8E8E93' }}>Geodata marketplace</div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 3 }}>
          {(['marketplace', 'builder'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab ? '#FFFFFF' : 'transparent',
              color: activeTab === tab ? '#1C1C1E' : '#8E8E93',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
              {tab === 'marketplace' ? 'Marketplace' : 'Bygg paket'}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {cart.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#5856D6', color: '#FFFFFF', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
              <ShoppingCart style={{ width: 14, height: 14 }} />
              {cart.length} i varukorg
            </div>
          )}
        </div>
      </div>

      {/* Marketplace */}
      {activeTab === 'marketplace' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {DEMO_PACKAGES.map(pkg => (
              <div key={pkg.id} style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ padding: '3px 10px', background: '#5856D610', color: '#5856D6', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {TYPE_LABELS[pkg.dataType]}
                  </div>
                  {pkg.verified && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#34C759', fontSize: 11, fontWeight: 600 }}>
                      <Check style={{ width: 12, height: 12 }} /> Verifierat
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>{pkg.title}</div>
                <div style={{ fontSize: 13, color: '#3C3C43CC', lineHeight: 1.5, flex: 1, marginBottom: 12 }}>{pkg.description}</div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: '#8E8E93', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin style={{ width: 11, height: 11 }} />{pkg.geography}
                  </span>
                  <span style={{ fontSize: 12, color: '#8E8E93', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Database style={{ width: 11, height: 11 }} />{pkg.recordCount.toLocaleString()} poster
                  </span>
                  <span style={{ fontSize: 12, color: '#FF9500', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Star style={{ width: 11, height: 11, fill: '#FF9500' }} />{pkg.qualityScore}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>{pkg.price.toLocaleString()} {pkg.currency}</div>
                    <div style={{ fontSize: 11, color: '#8E8E93' }}>av {pkg.creator}</div>
                  </div>
                  <button
                    onClick={() => setCart(c => c.includes(pkg.id) ? c.filter(id => id !== pkg.id) : [...c, pkg.id])}
                    style={{
                      padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                      background: cart.includes(pkg.id) ? '#34C759' : '#5856D6',
                      color: '#FFFFFF',
                    }}
                  >
                    {cart.includes(pkg.id) ? 'Tillagd ✓' : 'Köp'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Builder */}
      {activeTab === 'builder' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 600 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 20 }}>Skapa datapaket</div>

            {[
              { label: 'Pakettitel', placeholder: 'Ex: Bryggägare Nacka 2026' },
              { label: 'Beskrivning', placeholder: 'Beskriv datasetet och vad det innehåller' },
              { label: 'Geografiskt område', placeholder: 'Ex: Nacka, Stockholm, Sverige' },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#3C3C43CC', marginBottom: 6 }}>{field.label}</label>
                <input placeholder={field.placeholder} style={{
                  width: '100%', padding: '11px 14px', border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 10, fontSize: 14, fontFamily: 'system-ui', color: '#1C1C1E',
                  background: '#F9F9F9', outline: 'none',
                }} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#3C3C43CC', marginBottom: 6 }}>Datatyp</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <button key={key} style={{
                    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
                    background: '#F9F9F9', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#3C3C43CC', marginBottom: 6 }}>Pris (SEK)</label>
              <input type="number" placeholder="8900" style={{
                width: '100%', padding: '11px 14px', border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 10, fontSize: 14, fontFamily: 'system-ui', color: '#1C1C1E',
                background: '#F9F9F9', outline: 'none',
              }} />
            </div>

            <button style={{ width: '100%', padding: '14px', background: '#5856D6', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Skicka för granskning
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
