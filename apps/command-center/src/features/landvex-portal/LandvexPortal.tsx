import { useState, useEffect, useCallback } from 'react'
import { Building2, AlertTriangle, Users, MapPin, RefreshCw, CheckCircle, XCircle, Eye, Plus, Shield } from 'lucide-react'

const LANDVEX_API = 'https://api.wavult.com'

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

const OBJECT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  ok:         { label: 'OK',          bg: '#DCFCE7', color: '#166534' },
  monitoring: { label: 'Bevakning',   bg: '#FEF3C7', color: '#92400E' },
  alert:      { label: 'Larm',        bg: '#FEE2E2', color: '#991B1B' },
  critical:   { label: 'Kritisk',     bg: '#7F1D1D', color: '#FCA5A5' },
}

const SEVERITY: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  info:     { label: 'Info',    bg: '#DBEAFE', color: '#1D4ED8', icon: '💬' },
  warning:  { label: 'Varning', bg: '#FEF3C7', color: '#92400E', icon: '⚠️' },
  critical: { label: 'Kritisk', bg: '#FEE2E2', color: '#991B1B', icon: '🚨' },
}

const OBJECT_TYPES = ['pier', 'quay', 'bridge', 'road', 'building', 'tunnel', 'port', 'other']

type Tab = 'overview' | 'objects' | 'alerts' | 'clients' | 'new-client'

export function LandvexPortal() {
  const [tab, setTab] = useState<Tab>('overview')
  const [objects, setObjects] = useState<LandvexObject[]>([])
  const [alerts, setAlerts] = useState<LandvexAlert[]>([])
  const [clients, setClients] = useState<LandvexClient[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Översikt', icon: <Shield size={16} /> },
    { id: 'objects', label: `Objekt (${objects.length})`, icon: <Building2 size={16} /> },
    { id: 'alerts', label: `Larm (${alerts.length})`, icon: <AlertTriangle size={16} /> },
    { id: 'clients', label: `Kunder (${clients.length})`, icon: <Users size={16} /> },
    { id: 'new-client', label: 'Ny kund', icon: <Plus size={16} /> },
  ]

  return (
    <div style={{ background: '#0F172A', minHeight: '100vh', color: '#F1F5F9', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #1E3A5F, #2563EB)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🏗️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#F1F5F9' }}>Landvex Admin</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>B2G Infrastrukturövervakning</p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Laddar…' : 'Uppdatera'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#7F1D1D', border: '1px solid #991B1B', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#FCA5A5' }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#14532D', border: '1px solid #166534', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#86EFAC' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#1E293B', padding: '4px', borderRadius: '10px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s', background: tab === t.id ? '#2563EB' : 'transparent', color: tab === t.id ? '#fff' : '#64748B' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Totalt objekt', value: stats?.objects.total ?? objects.length, icon: '🏗️', color: '#2563EB' },
              { label: 'Aktiva larm', value: stats?.alerts.active ?? alerts.length, icon: '🚨', color: '#DC2626' },
              { label: 'Kunder', value: stats?.clients.total ?? clients.length, icon: '🏛️', color: '#7C3AED' },
              { label: 'Kritiska', value: stats?.objects.by_status?.critical ?? objects.filter(o => o.status === 'critical').length, icon: '⛔', color: '#DC2626' },
              { label: 'Bevakning', value: stats?.objects.by_status?.monitoring ?? objects.filter(o => o.status === 'monitoring').length, icon: '👁️', color: '#D97706' },
              { label: 'Okej', value: stats?.objects.by_status?.ok ?? objects.filter(o => o.status === 'ok').length, icon: '✅', color: '#16A34A' },
            ].map(s => (
              <div key={s.label} style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent alerts */}
          {alerts.length > 0 && (
            <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#94A3B8' }}>Senaste larm</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.slice(0, 5).map(alert => {
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
          {/* Add object form */}
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

          {/* Object list */}
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
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '12px', marginTop: '2px' }}>
                      <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {obj.municipality}</span>
                      <span>Typ: {obj.type}</span>
                      {obj.landvex_clients && <span>🏛️ {obj.landvex_clients.name}</span>}
                      <span>Inspektioner: {obj.inspection_count}</span>
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
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
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Namn *</label>
                <input value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} required placeholder="Nacka Kommun"
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Org.nr</label>
                <input value={newClient.org_nr} onChange={e => setNewClient(p => ({ ...p, org_nr: e.target.value }))} placeholder="556123-4567"
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
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
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>E-post</label>
                <input type="email" value={newClient.contact_email} onChange={e => setNewClient(p => ({ ...p, contact_email: e.target.value }))} placeholder="info@nacka.se"
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Telefon</label>
                <input value={newClient.contact_phone} onChange={e => setNewClient(p => ({ ...p, contact_phone: e.target.value }))} placeholder="08-123 456"
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Avtalsstart</label>
                <input type="date" value={newClient.contract_start} onChange={e => setNewClient(p => ({ ...p, contract_start: e.target.value }))}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Avtalsslut</label>
                <input type="date" value={newClient.contract_end} onChange={e => setNewClient(p => ({ ...p, contract_end: e.target.value }))}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', boxSizing: 'border-box' }} />
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

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default LandvexPortal
