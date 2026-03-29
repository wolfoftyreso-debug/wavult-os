import { useState } from 'react'
import { AlertTriangle, Map, ChevronRight, CheckCircle, Download } from 'lucide-react'

interface InfraObject {
  id: string
  name: string
  type: string
  status: 'ok' | 'warning' | 'critical'
  lastInspected: string | null
  alertCount: number
  location: { lat: number; lng: number }
}

const DEMO_OBJECTS: InfraObject[] = [
  { id: 'obj1', name: 'Brygga Värmdö Hamn', type: 'Brygga', status: 'warning', lastInspected: '2026-03-28', alertCount: 1, location: { lat: 59.28, lng: 18.52 } },
  { id: 'obj2', name: 'Kajanläggning Nacka', type: 'Kaj', status: 'ok', lastInspected: '2026-03-27', alertCount: 0, location: { lat: 59.31, lng: 18.18 } },
  { id: 'obj3', name: 'Parkbrygga Vaxholm', type: 'Brygga', status: 'critical', lastInspected: null, alertCount: 3, location: { lat: 59.4, lng: 18.37 } },
]

const STATUS_STYLES = {
  ok:       { color: '#34C759', bg: '#34C75910', label: 'OK' },
  warning:  { color: '#FF9500', bg: '#FF950010', label: 'Varning' },
  critical: { color: '#FF3B30', bg: '#FF3B3010', label: 'Kritisk' },
}

export function LandvexPortal() {
  const [selected, setSelected] = useState<InfraObject | null>(null)

  return (
    <div className="flex flex-col h-full" style={{ background: '#F2F2F7' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>Landvex</div>
          <div style={{ fontSize: 13, color: '#8E8E93' }}>Infrastrukturövervakning · Värmdö Kommun</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 14px', background: '#FF3B3010', color: '#FF3B30', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            3 aktiva larm
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, flex: 1, overflow: 'hidden' }}>
        {/* Left: Object list */}
        <div style={{ background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.08)', overflow: 'auto' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
              Dina objekt
            </div>
            <div style={{ fontSize: 13, color: '#3C3C43CC' }}>{DEMO_OBJECTS.length} objekt övervakade</div>
          </div>

          {DEMO_OBJECTS.map(obj => {
            const s = STATUS_STYLES[obj.status]
            const isSelected = selected?.id === obj.id
            return (
              <button key={obj.id} onClick={() => setSelected(obj)} style={{
                width: '100%', textAlign: 'left', padding: '16px 20px',
                background: isSelected ? '#5856D610' : 'transparent',
                border: 'none', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer',
                borderLeft: isSelected ? '3px solid #5856D6' : '3px solid transparent',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E', marginBottom: 2 }}>{obj.name}</div>
                  <div style={{ fontSize: 12, color: '#8E8E93' }}>{obj.type} · {obj.lastInspected ? `Inspekterad ${obj.lastInspected}` : 'Aldrig inspekterad'}</div>
                </div>
                {obj.alertCount > 0 && (
                  <div style={{ padding: '2px 8px', background: s.bg, color: s.color, borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {obj.alertCount}
                  </div>
                )}
                <ChevronRight style={{ width: 14, height: 14, color: '#C7C7CC' }} />
              </button>
            )
          })}
        </div>

        {/* Right: Detail */}
        <div style={{ overflow: 'auto', padding: 24 }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8E8E93' }}>
              <Map style={{ width: 48, height: 48, marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>Välj ett objekt</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Klicka på ett objekt i listan för att se detaljer</div>
            </div>
          ) : (
            <div style={{ maxWidth: 720 }}>
              {/* Object header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>{selected.name}</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ padding: '3px 10px', background: STATUS_STYLES[selected.status].bg, color: STATUS_STYLES[selected.status].color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {STATUS_STYLES[selected.status].label}
                    </span>
                    <span style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.05)', color: '#3C3C43CC', borderRadius: 20, fontSize: 12 }}>
                      {selected.type}
                    </span>
                  </div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#5856D6', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  <Download style={{ width: 14, height: 14 }} />
                  Generera rapport
                </button>
              </div>

              {/* Alerts */}
              {selected.alertCount > 0 && (
                <div style={{ background: '#FF3B3008', border: '1px solid #FF3B3020', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <AlertTriangle style={{ width: 16, height: 16, color: '#FF3B30' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FF3B30' }}>Aktiva larm ({selected.alertCount})</span>
                  </div>
                  {selected.id === 'obj3' && (
                    <>
                      {['Räcke lossat — sydöstra ände', 'Plankor spruckna — mittsektion', 'Aldrig inspekterad av Landvex'].map(alert => (
                        <div key={alert} style={{ display: 'flex', gap: 8, padding: '8px 0', borderTop: '1px solid rgba(255,59,48,0.1)' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B30', marginTop: 4, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#1C1C1E' }}>{alert}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {selected.id === 'obj1' && (
                    <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF9500', marginTop: 4, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#1C1C1E' }}>Tecken på rost vid förtöjningsbalk</span>
                    </div>
                  )}
                </div>
              )}

              {/* Map placeholder */}
              <div style={{ height: 200, background: 'linear-gradient(135deg, #E8F0FE 0%, #D2E3FC 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, position: 'relative' }}>
                <Map style={{ width: 32, height: 32, color: '#5856D6', opacity: 0.5 }} />
                <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                  {selected.location.lat.toFixed(2)}, {selected.location.lng.toFixed(2)}
                </div>
              </div>

              {/* AI Insight */}
              <div style={{ background: '#5856D610', border: '1px solid #5856D620', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5856D6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Optical Insight — Analys
                </div>
                <div style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.6 }}>
                  {selected.status === 'critical'
                    ? 'Omedelbar inspektion rekommenderas. Tre avvikelser detekterade sedan senaste kända tillstånd. Kostnad att vänta: estimerat 45–120 KSEK.'
                    : selected.status === 'warning'
                    ? 'Monitorera noggrant. En avvikelse detekterad. Schemalägg inspektion inom 30 dagar.'
                    : 'Ingen åtgärd krävs. Strukturen ser ut att vara i gott skick.'}
                </div>
              </div>

              {/* OK confirmation icon for ok status */}
              {selected.status === 'ok' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  <CheckCircle style={{ width: 16, height: 16, color: '#34C759' }} />
                  <span style={{ fontSize: 13, color: '#34C759', fontWeight: 500 }}>Senaste inspektion godkänd</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
