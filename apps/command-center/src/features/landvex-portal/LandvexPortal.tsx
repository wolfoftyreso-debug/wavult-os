import { useState, useEffect, useCallback } from 'react'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import { Building2, AlertTriangle, Users, MapPin, RefreshCw, CheckCircle, Eye, Plus, Shield, Map as MapIcon } from 'lucide-react'

const LANDVEX_API = 'https://api.wavult.com'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

interface LandvexObject {
  id: string
  name: string
  type: string
  municipality: string
  lat?: number
  lng?: number
  status: 'ok' | 'monitoring' | 'alert' | 'critical'
  client_id?: string
  last_inspected?: string
  inspection_count: number
  metadata?: Record<string, unknown>
  created_at: string
  landvex_clients?: { name: string; type: string }
}

interface LandvexAlert {
  id: string
  object_id?: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  source: string
  acknowledged: boolean
  resolved: boolean
  created_at: string
  landvex_objects?: { name: string; municipality: string; type: string }
}

interface LandvexClient {
  id: string
  name: string
  org_nr?: string
  type: string
  contact_email?: string
  contact_phone?: string
  contract_start?: string
  contract_end?: string
  status: string
  created_at: string
}

interface Stats {
  objects: { total: number; by_status: Record<string, number> }
  alerts: { active: number; by_severity: Record<string, number> }
  clients: { total: number }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${LANDVEX_API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

const FALLBACK_OBJECTS: LandvexObject[] = [
  { id: 'fb-1', name: 'Strandvägsbryggan', type: 'pier', municipality: 'Stockholm', lat: 59.3293, lng: 18.0686, status: 'ok', inspection_count: 3, created_at: new Date().toISOString() },
  { id: 'fb-2', name: 'Nacka Hamnbrygga', type: 'quay', municipality: 'Nacka', lat: 59.3150, lng: 18.1600, status: 'monitoring', inspection_count: 1, created_at: new Date().toISOString() },
  { id: 'fb-3', name: 'Värmdöbron', type: 'bridge', municipality: 'Värmdö', lat: 59.3000, lng: 18.3500, status: 'alert', inspection_count: 2, created_at: new Date().toISOString() },
]
const FALLBACK_ALERTS: LandvexAlert[] = [
  { id: 'fa-1', object_id: 'fb-3', severity: 'warning', message: 'Reparation krävs — sprickor i bärande konstruktion', source: 'inspektion', acknowledged: false, resolved: false, created_at: new Date().toISOString() },
]
const FALLBACK_CLIENTS: LandvexClient[] = [
  { id: 'fc-1', name: 'Stockholms Stad', type: 'municipality', status: 'active', created_at: new Date().toISOString() },
  { id: 'fc-2', name: 'Nacka Kommun', type: 'municipality', status: 'active', created_at: new Date().toISOString() },
]
const FALLBACK_STATS: Stats = {
  objects: { total: 3, by_status: { ok: 1, monitoring: 1, alert: 1, critical: 0 } },
  alerts: { active: 1, by_severity: { warning: 1 } },
  clients: { total: 2 },
}

const OBJECT_STATUS: Record<string, { label: string; bg: string; color: string; mapColor: string }> = {
  ok:         { label: 'OK',          bg: '#DCFCE7', color: '#166534', mapColor: '#16A34A' },
  monitoring: { label: 'Bevakning',   bg: '#FEF3C7', color: '#92400E', mapColor: '#D97706' },
  alert:      { label: 'Larm',        bg: '#FEE2E2', color: '#991B1B', mapColor: '#DC2626' },
  critical:   { label: 'Kritisk',     bg: '#7F1D1D', color: '#FCA5A5', mapColor: '#1E40AF' },
}

const SEVERITY: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  info:     { label: 'Info',    bg: '#DBEAFE', color: '#1D4ED8', icon: '💬' },
  warning:  { label: 'Varning', bg: '#FEF3C7', color: '#92400E', icon: '⚠️' },
  critical: { label: 'Kritisk', bg: '#FEE2E2', color: '#991B1B', icon: '🚨' },
}

const OBJECT_TYPES = ['pier', 'quay', 'bridge', 'road', 'building', 'tunnel', 'port', 'other']

type Tab = 'map' | 'overview' | 'objects' | 'alerts' | 'clients' | 'new-client'

export function LandvexPortal() {
  const [tab, setTab] = useState<Tab>('map')
  const [objects, setObjects] = useState<LandvexObject[]>([])
  const [alerts, setAlerts] = useState<LandvexAlert[]>([])
  const [clients, setClients] = useState<LandvexClient[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedObj, setSelectedObj] = useState<LandvexObject | null>(null)

  // New object form
  const [newObject, setNewObject] = useState({
    name: '', type: 'pier', municipality: '', lat: '', lng: '', client_id: '',
  })

  // New client form
  const [newClient, setNewClient] = useState({
    name: '', org_nr: '', type: 'municipality', contact_email: '', contact_phone: '',
    contract_start: '', contract_end: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [objs, alts, cls, st] = await Promise.all([
        apiFetch<{ data: LandvexObject[] }>('/v1/objects?limit=100'),
        apiFetch<{ data: LandvexAlert[] }>('/v1/alerts?resolved=false&limit=100'),
        apiFetch<LandvexClient[]>('/v1/clients?limit=100'),
        apiFetch<Stats>('/v1/stats').catch(() => null),
      ])
      setObjects(objs.data || [])
      setAlerts(alts.data || [])
      setClients(cls)
      if (st) setStats(st)
    } catch (err) {
      setError(String(err))
      setObjects(FALLBACK_OBJECTS)
      setAlerts(FALLBACK_ALERTS)
      setClients(FALLBACK_CLIENTS)
      setStats(FALLBACK_STATS)
      setUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      await apiFetch(`/v1/alerts/${alertId}/acknowledge`, { method: 'POST' })
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
    } catch (e) { console.error(e) }
  }

  const handleResolve = async (alertId: string) => {
    try {
      await apiFetch(`/v1/alerts/${alertId}/resolve`, { method: 'POST' })
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      showSuccess('Larm löst')
    } catch (e) { console.error(e) }
  }

  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: newObject.name, type: newObject.type, municipality: newObject.municipality,
      }
      if (newObject.lat) payload.lat = Number(newObject.lat)
      if (newObject.lng) payload.lng = Number(newObject.lng)
      if (newObject.client_id) payload.client_id = newObject.client_id
      await apiFetch('/v1/objects', { method: 'POST', body: JSON.stringify(payload) })
      setNewObject({ name: '', type: 'pier', municipality: '', lat: '', lng: '', client_id: '' })
      showSuccess('Objekt skapat')
      fetchData()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/v1/clients', { method: 'POST', body: JSON.stringify(newClient) })
      setNewClient({ name: '', org_nr: '', type: 'municipality', contact_email: '', contact_phone: '', contract_start: '', contract_end: '' })
      showSuccess('Kund skapad')
      setTab('clients')
      fetchData()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const objectsWithCoords = objects.filter(o => o.lat && o.lng)
  const activeAlerts = alerts.filter(a => !a.acknowledged)

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'map',       label: 'Karta',                           icon: <MapIcon size={16} /> },
    { id: 'overview',  label: 'Översikt',                        icon: <Shield size={16} /> },
    { id: 'objects',   label: `Objekt (${objects.length})`,      icon: <Building2 size={16} /> },
    { id: 'alerts',    label: `Larm (${activeAlerts.length})`,   icon: <AlertTriangle size={16} /> },
    { id: 'clients',   label: `Kunder (${clients.length})`,      icon: <Users size={16} /> },
    { id: 'new-client',label: 'Ny kund',                         icon: <Plus size={16} /> },
  ]

  return (
    <div style={{ background: '#0F172A', minHeight: '100vh', color: '#F1F5F9', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#2563EB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>LX</span>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#F1F5F9' }}>Landvex Admin</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                {loading ? 'Laddar...' : `${objects.length} objekt · ${activeAlerts.length} aktiva larm`}
              </p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Laddar…' : 'Uppdatera'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#1E293B', padding: '4px', borderRadius: '10px', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.15s', background: tab === t.id ? '#2563EB' : 'transparent', color: tab === t.id ? '#fff' : '#64748B' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fallback/Error banners */}
      {usingFallback && (
        <div style={{ margin: '8px 24px 0', padding: '8px 14px', background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 8, fontSize: 12, color: '#FCD34D' }}>
          Visar exempeldata · Live-API ej ansluten
        </div>
      )}
      {/* Alerts */}
      {successMsg && (
        <div style={{ padding: '8px 24px', flexShrink: 0 }}>
          <div style={{ background: '#14532D', border: '1px solid #166534', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#86EFAC' }}>
            ✅ {successMsg}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: tab === 'map' ? 'hidden' : 'auto', padding: tab === 'map' ? 0 : '16px 24px 24px', position: 'relative' }}>

        {/* MAP TAB */}
        {tab === 'map' && (
          <div style={{ height: 'calc(100vh - 200px)', width: '100%', position: 'relative' }}>
            {MAPBOX_TOKEN ? (
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: 18.0686, latitude: 59.3293, zoom: 8 }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
              >
                {objectsWithCoords.map(obj => {
                  const st = OBJECT_STATUS[obj.status] || OBJECT_STATUS.ok
                  return (
                    <Marker
                      key={obj.id}
                      longitude={obj.lng!}
                      latitude={obj.lat!}
                      anchor="bottom"
                      onClick={e => { e.originalEvent.stopPropagation(); setSelectedObj(obj) }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: st.mapColor,
                        border: '3px solid rgba(255,255,255,0.9)',
                        boxShadow: `0 2px 12px ${st.mapColor}80`,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.15s',
                      }}>
                        <MapPin size={13} color="white" />
                      </div>
                    </Marker>
                  )
                })}
                {selectedObj && (
                  <Popup
                    longitude={selectedObj.lng!}
                    latitude={selectedObj.lat!}
                    anchor="top"
                    onClose={() => setSelectedObj(null)}
                    closeButton={true}
                    style={{ maxWidth: 260 }}
                  >
                    <div style={{ padding: '4px 2px', fontFamily: 'system-ui, sans-serif' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>{selectedObj.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                        {selectedObj.municipality} · {selectedObj.type}
                        {selectedObj.landvex_clients && ` · ${selectedObj.landvex_clients.name}`}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 10px', borderRadius: 20,
                          background: OBJECT_STATUS[selectedObj.status]?.bg,
                          color: OBJECT_STATUS[selectedObj.status]?.color,
                          fontWeight: 600,
                        }}>
                          {OBJECT_STATUS[selectedObj.status]?.label || selectedObj.status}
                        </span>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {selectedObj.inspection_count} inspektioner
                        </span>
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', gap: 12 }}>
                <MapIcon size={48} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>Mapbox token saknas</div>
                <div style={{ fontSize: 13, color: '#334155' }}>Konfigurera VITE_MAPBOX_TOKEN i Cloudflare Pages</div>
              </div>
            )}

            {/* Legend overlay */}
            <div style={{ position: 'absolute', bottom: 24, left: 16, background: 'rgba(15,23,42,0.92)', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
              {Object.entries(OBJECT_STATUS).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: val.mapColor, flexShrink: 0 }} />
                  <span style={{ color: '#94A3B8' }}>{val.label}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 8, fontSize: 11, color: '#475569' }}>
                {objectsWithCoords.length} / {objects.length} objekt har koordinater
              </div>
            </div>

            {/* Stat chips overlay */}
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeAlerts.length > 0 && (
                <div style={{ background: 'rgba(220,38,38,0.9)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#fff', backdropFilter: 'blur(8px)', cursor: 'pointer' }}
                  onClick={() => setTab('alerts')}>
                  🚨 {activeAlerts.length} aktiva larm
                </div>
              )}
              <div style={{ background: 'rgba(15,23,42,0.85)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#94A3B8', backdropFilter: 'blur(8px)', border: '1px solid #334155' }}>
                {objects.length} objekt totalt
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Totalt objekt',  value: stats?.objects.total ?? objects.length, icon: '🏗️', color: '#2563EB' },
                { label: 'Aktiva larm',    value: stats?.alerts.active ?? activeAlerts.length, icon: '🚨', color: '#DC2626' },
                { label: 'Kunder',         value: stats?.clients.total ?? clients.length, icon: '🏛️', color: '#1E40AF' },
                { label: 'Kritiska',       value: stats?.objects.by_status?.critical ?? objects.filter(o => o.status === 'critical').length, icon: '⛔', color: '#DC2626' },
                { label: 'Bevakning',      value: stats?.objects.by_status?.monitoring ?? objects.filter(o => o.status === 'monitoring').length, icon: '👁️', color: '#D97706' },
                { label: 'Okej',           value: stats?.objects.by_status?.ok ?? objects.filter(o => o.status === 'ok').length, icon: '✅', color: '#16A34A' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {activeAlerts.length > 0 && (
              <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#94A3B8' }}>Senaste larm</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeAlerts.slice(0, 5).map(alert => {
                    const sev = SEVERITY[alert.severity] || SEVERITY.info
                    return (
                      <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0F172A', borderRadius: '8px', border: `1px solid ${sev.color}30` }}>
                        <span style={{ fontSize: '16px' }}>{sev.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.message}</div>
                          {alert.landvex_objects && <div style={{ fontSize: '11px', color: '#64748B' }}>{alert.landvex_objects.name} · {alert.landvex_objects.municipality}</div>}
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: sev.bg, color: sev.color, whiteSpace: 'nowrap' }}>{sev.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* OBJECTS TAB */}
        {tab === 'objects' && (
          <div>
            <form onSubmit={handleCreateObject} style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#94A3B8' }}>Lägg till objekt</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <input placeholder="Namn *" value={newObject.name} onChange={e => setNewObject(p => ({ ...p, name: e.target.value }))} required
                  style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }} />
                <select value={newObject.type} onChange={e => setNewObject(p => ({ ...p, type: e.target.value }))}
                  style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }}>
                  {OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input placeholder="Kommun *" value={newObject.municipality} onChange={e => setNewObject(p => ({ ...p, municipality: e.target.value }))} required
                  style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }} />
                <input placeholder="Lat" type="number" step="any" value={newObject.lat} onChange={e => setNewObject(p => ({ ...p, lat: e.target.value }))}
                  style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }} />
                <input placeholder="Lng" type="number" step="any" value={newObject.lng} onChange={e => setNewObject(p => ({ ...p, lng: e.target.value }))}
                  style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }} />
                <select value={newObject.client_id} onChange={e => setNewObject(p => ({ ...p, client_id: e.target.value }))}
                  style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }}>
                  <option value="">Ingen kund</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving}
                style={{ background: '#1D4ED8', border: 'none', borderRadius: '8px', padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {saving ? 'Skapar…' : '+ Lägg till'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {objects.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#475569', background: '#1E293B', borderRadius: '12px' }}>
                  Inga objekt registrerade ännu
                </div>
              )}
              {objects.map(obj => {
                const st = OBJECT_STATUS[obj.status] || OBJECT_STATUS.ok
                return (
                  <div key={obj.id} style={{ background: '#1E293B', borderRadius: '10px', padding: '14px 16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>
                      {obj.type === 'pier' ? '⚓' : obj.type === 'bridge' ? '🌉' : obj.type === 'road' ? '🛣️' : obj.type === 'building' ? '🏢' : '🏗️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>{obj.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {obj.municipality}</span>
                        <span>Typ: {obj.type}</span>
                        {obj.landvex_clients && <span>🏛️ {obj.landvex_clients.name}</span>}
                        <span>Inspektioner: {obj.inspection_count}</span>
                        {obj.lat && obj.lng && <span style={{ color: '#2563EB' }}>📍 {obj.lat.toFixed(4)}, {obj.lng.toFixed(4)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {obj.lat && obj.lng && (
                        <button onClick={() => { setSelectedObj(obj); setTab('map') }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1E3A5F', border: '1px solid #2563EB', borderRadius: 6, padding: '4px 8px', color: '#93C5FD', cursor: 'pointer', fontSize: 11 }}>
                          <MapIcon size={11} /> Visa
                        </button>
                      )}
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {tab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569', background: '#1E293B', borderRadius: '12px' }}>
                ✅ Inga aktiva larm
              </div>
            )}
            {alerts.map(alert => {
              const sev = SEVERITY[alert.severity] || SEVERITY.info
              return (
                <div key={alert.id} style={{ background: '#1E293B', borderRadius: '10px', padding: '14px 16px', border: `1px solid ${sev.color}40`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{sev.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: '#F1F5F9', fontWeight: 500 }}>{alert.message}</div>
                    {alert.landvex_objects && (
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {alert.landvex_objects.name} · {alert.landvex_objects.municipality} · {alert.source}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {new Date(alert.created_at).toLocaleString('sv-SE')}
                      {alert.acknowledged && ' · Bekräftad'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!alert.acknowledged && (
                      <button onClick={() => handleAcknowledge(alert.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1E3A5F', border: '1px solid #1D4ED8', borderRadius: '6px', padding: '5px 10px', color: '#93C5FD', cursor: 'pointer', fontSize: '12px' }}>
                        <Eye size={12} /> Bekräfta
                      </button>
                    )}
                    <button onClick={() => handleResolve(alert.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#14532D', border: '1px solid #166534', borderRadius: '6px', padding: '5px 10px', color: '#86EFAC', cursor: 'pointer', fontSize: '12px' }}>
                      <CheckCircle size={12} /> Lös
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CLIENTS TAB */}
        {tab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {clients.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569', background: '#1E293B', borderRadius: '12px' }}>
                Inga kunder registrerade ännu
              </div>
            )}
            {clients.map(client => (
              <div key={client.id} style={{ background: '#1E293B', borderRadius: '10px', padding: '16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9' }}>{client.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>Typ: {client.type}</span>
                      {client.org_nr && <span>Org: {client.org_nr}</span>}
                      {client.contact_email && <span>✉️ {client.contact_email}</span>}
                      {client.contact_phone && <span>📞 {client.contact_phone}</span>}
                    </div>
                    {(client.contract_start || client.contract_end) && (
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                        Avtal: {client.contract_start || '?'} → {client.contract_end || '?'}
                      </div>
                    )}
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: client.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: client.status === 'active' ? '#166534' : '#991B1B' }}>
                    {client.status === 'active' ? 'Aktiv' : client.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NEW CLIENT TAB */}
        {tab === 'new-client' && (
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '24px', border: '1px solid #334155', maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#F1F5F9' }}>Registrera ny kund</h3>
            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Namn *', key: 'name', placeholder: 'Nacka Kommun', required: true, type: 'text' },
                  { label: 'Org.nr', key: 'org_nr', placeholder: '556123-4567', required: false, type: 'text' },
                  { label: 'E-post', key: 'contact_email', placeholder: 'info@nacka.se', required: false, type: 'email' },
                  { label: 'Telefon', key: 'contact_phone', placeholder: '08-123 456', required: false, type: 'text' },
                  { label: 'Avtalsstart', key: 'contract_start', placeholder: '', required: false, type: 'date' },
                  { label: 'Avtalsslut', key: 'contract_end', placeholder: '', required: false, type: 'date' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>{field.label}</label>
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={(newClient as any)[field.key]}
                      onChange={e => setNewClient(p => ({ ...p, [field.key]: e.target.value }))}
                      style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Typ</label>
                  <select value={newClient.type} onChange={e => setNewClient(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px' }}>
                    <option value="municipality">Kommun</option>
                    <option value="property">Fastighetsägare</option>
                    <option value="port">Hamn</option>
                    <option value="other">Annat</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" disabled={saving}
                  style={{ background: '#1D4ED8', border: 'none', borderRadius: '8px', padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  {saving ? 'Sparar…' : 'Spara kund'}
                </button>
                <button type="button" onClick={() => setTab('clients')}
                  style={{ background: '#334155', border: 'none', borderRadius: '8px', padding: '10px 24px', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}>
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default LandvexPortal
