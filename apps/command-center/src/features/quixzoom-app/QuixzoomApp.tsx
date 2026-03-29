import { useState, useEffect, useCallback } from 'react'
import { MapPin, Camera, Users, Package, RefreshCw, CheckCircle, Clock, TrendingUp } from 'lucide-react'

// API base — quiXzoom API på ECS via ALB
const QZ_API = 'https://api.wavult.com'

interface Mission {
  id: string
  title: string
  location: string
  lat?: number
  lng?: number
  reward: number
  currency: string
  status: 'open' | 'accepted' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
  created_at: string
  zoomer_id?: string
  description?: string
  category?: string
}

interface Zoomer {
  id: string
  name?: string
  email?: string
  status: 'active' | 'inactive' | 'pending'
  missions_completed?: number
  total_earnings?: number
  created_at: string
}

interface QZStats {
  total_missions: number
  open_missions: number
  completed_missions: number
  total_zoomers: number
  active_zoomers: number
  total_payouts: number
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${QZ_API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

const STATUS_CONFIG = {
  open:        { label: 'Öppen',       bg: '#DBEAFE', color: '#1D4ED8' },
  accepted:    { label: 'Accepterad',  bg: '#FEF3C7', color: '#92400E' },
  in_progress: { label: 'Pågår',       bg: '#FEF3C7', color: '#92400E' },
  submitted:   { label: 'Inskickad',   bg: '#EDE9FE', color: '#5B21B6' },
  approved:    { label: 'Godkänd',     bg: '#DCFCE7', color: '#166534' },
  rejected:    { label: 'Avvisad',     bg: '#FEE2E2', color: '#991B1B' },
}

type Tab = 'overview' | 'missions' | 'zoomers' | 'create'

export function QuixzoomApp() {
  const [tab, setTab] = useState<Tab>('overview')
  const [missions, setMissions] = useState<Mission[]>([])
  const [zoomers, setZoomers] = useState<Zoomer[]>([])
  const [stats, setStats] = useState<QZStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // New mission form state
  const [newMission, setNewMission] = useState({
    title: '', location: '', reward: 85, currency: 'SEK', description: '', category: 'inspection'
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [missionsData, zoomersData] = await Promise.all([
        apiFetch<Mission[]>('/v1/missions?limit=100'),
        apiFetch<Zoomer[]>('/v1/zoomers?limit=100'),
      ])
      setMissions(missionsData)
      setZoomers(zoomersData)
      setStats({
        total_missions: missionsData.length,
        open_missions: missionsData.filter(m => m.status === 'open').length,
        completed_missions: missionsData.filter(m => m.status === 'approved').length,
        total_zoomers: zoomersData.length,
        active_zoomers: zoomersData.filter(z => z.status === 'active').length,
        total_payouts: zoomersData.reduce((s, z) => s + (z.total_earnings || 0), 0),
      })
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function createMission() {
    setCreating(true)
    try {
      await apiFetch('/v1/missions', {
        method: 'POST',
        body: JSON.stringify(newMission),
      })
      setNewMission({ title: '', location: '', reward: 85, currency: 'SEK', description: '', category: 'inspection' })
      setTab('missions')
      await fetchData()
    } catch (err) {
      setError(String(err))
    } finally {
      setCreating(false)
    }
  }

  async function approveSubmission(missionId: string) {
    await apiFetch(`/v1/missions/${missionId}/approve`, { method: 'POST' })
    await fetchData()
  }

  async function rejectSubmission(missionId: string) {
    await apiFetch(`/v1/missions/${missionId}/reject`, { method: 'POST' })
    await fetchData()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'system-ui',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F2F2F7', fontFamily: '-apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>quiXzoom Admin</h1>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              {loading ? 'Laddar...' : error ? '⚠️ API-fel — kör i offline-läge' : `${stats?.total_missions || 0} uppdrag · ${stats?.total_zoomers || 0} zoomers`}
            </div>
          </div>
          <button onClick={fetchData} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Uppdatera
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16, borderBottom: '1px solid #E5E7EB' }}>
          {([['overview', 'Översikt'], ['missions', 'Uppdrag'], ['zoomers', 'Zoomers'], ['create', 'Nytt uppdrag']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === id ? 600 : 400, color: tab === id ? '#7C3AED' : '#6B7280', background: 'none', border: 'none', borderBottom: tab === id ? '2px solid #7C3AED' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {error && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
            ⚠️ {error} — quiXzoom API svarar inte. Kontrollera ECS-tjänsten.
          </div>
        )}

        {/* Overview */}
        {tab === 'overview' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Totala uppdrag', value: stats.total_missions, icon: <Package size={18} />, color: '#7C3AED' },
              { label: 'Öppna uppdrag', value: stats.open_missions, icon: <Clock size={18} />, color: '#D97706' },
              { label: 'Godkända', value: stats.completed_missions, icon: <CheckCircle size={18} />, color: '#16A34A' },
              { label: 'Zoomers totalt', value: stats.total_zoomers, icon: <Users size={18} />, color: '#2563EB' },
              { label: 'Aktiva zoomers', value: stats.active_zoomers, icon: <TrendingUp size={18} />, color: '#0891B2' },
              { label: 'Totala utbetalningar', value: `${stats.total_payouts.toLocaleString('sv-SE')} kr`, icon: <Camera size={18} />, color: '#DC2626' },
            ].map(card => (
              <div key={card.label} style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
                  </div>
                  <div style={{ color: card.color }}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Missions */}
        {tab === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missions.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9CA3AF' }}>
                Inga uppdrag ännu — skapa det första under "Nytt uppdrag"
              </div>
            )}
            {missions.map(m => {
              const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.open
              return (
                <div key={m.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', marginBottom: 3 }}>{m.title}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6B7280' }}>
                        <span><MapPin size={11} style={{ marginRight: 3 }} />{m.location}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>{m.reward} {m.currency}</span>
                        <span style={{ fontFamily: 'monospace' }}>{m.id.slice(0,8)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                      {m.status === 'submitted' && (
                        <>
                          <button onClick={() => approveSubmission(m.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#DCFCE7', color: '#166534', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Godkänn</button>
                          <button onClick={() => rejectSubmission(m.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Avvisa</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Zoomers */}
        {tab === 'zoomers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zoomers.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9CA3AF' }}>
                Inga zoomers registrerade ännu
              </div>
            )}
            {zoomers.map(z => (
              <div key={z.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{z.name || z.email || z.id.slice(0,12)}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {z.missions_completed || 0} uppdrag · {(z.total_earnings || 0).toLocaleString('sv-SE')} kr totalt
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: z.status === 'active' ? '#DCFCE7' : '#F3F4F6', color: z.status === 'active' ? '#166534' : '#6B7280', fontWeight: 600 }}>
                  {z.status === 'active' ? 'Aktiv' : z.status === 'pending' ? 'Väntande' : 'Inaktiv'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Create mission */}
        {tab === 'create' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: '0 0 20px' }}>Skapa nytt uppdrag</h2>
              {[
                { label: 'Titel', key: 'title', placeholder: 'Fotografera brygga vid Värmdö hamn' },
                { label: 'Plats', key: 'location', placeholder: 'Värmdö, Stockholm' },
                { label: 'Beskrivning', key: 'description', placeholder: 'Instruktioner till zoomern...' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{field.label}</label>
                  <input value={(newMission as any)[field.key]} onChange={e => setNewMission(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder} style={inputStyle} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Belöning (SEK)</label>
                  <input type="number" value={newMission.reward} onChange={e => setNewMission(p => ({ ...p, reward: Number(e.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Kategori</label>
                  <select value={newMission.category} onChange={e => setNewMission(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                    <option value="inspection">Inspektion</option>
                    <option value="documentation">Dokumentation</option>
                    <option value="survey">Inventering</option>
                    <option value="monitoring">Övervakning</option>
                  </select>
                </div>
              </div>
              <button onClick={createMission} disabled={creating || !newMission.title || !newMission.location}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 14, fontWeight: 600, cursor: creating ? 'wait' : 'pointer', opacity: (!newMission.title || !newMission.location) ? 0.5 : 1 }}>
                {creating ? 'Skapar...' : 'Skapa uppdrag'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
