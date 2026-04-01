import { useState, useEffect } from 'react'
import { Phone, Plus, RefreshCw, Copy, CheckCircle } from 'lucide-react'

const API = 'https://api.wavult.com'

interface PhoneNumber {
  sid: string
  phone_number: string
  friendly_name: string
  assigned_to?: string
}

const TEAM_MEMBERS = [
  { id: 'erik', name: 'Erik Svensson', role: 'CEO' },
  { id: 'leon', name: 'Leon Russo', role: 'COO' },
  { id: 'dennis', name: 'Dennis Bjarnemark', role: 'CLO' },
  { id: 'winston', name: 'Winston Bjarnemark', role: 'CFO' },
  { id: 'johan', name: 'Johan Berglund', role: 'CTO' },
]

export function TeamPhones() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [available, setAvailable] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [areaCode, setAreaCode] = useState('212')
  const [copied, setCopied] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string>>({
    // Load from localStorage
    ...JSON.parse(localStorage.getItem('twilio_assignments') || '{}')
  })

  useEffect(() => { fetchNumbers() }, [])

  async function fetchNumbers() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/v1/twilio/numbers`)
      if (res.ok) setNumbers(await res.json())
      else setError('Twilio ej konfigurerat — lägg till TWILIO_ACCOUNT_SID i ECS')
    } catch { setError('API ej nåbart') }
    finally { setLoading(false) }
  }

  async function searchAvailable() {
    try {
      const res = await fetch(`${API}/v1/twilio/numbers/available?area_code=${areaCode}&limit=10`)
      if (res.ok) setAvailable(await res.json())
    } catch {}
  }

  async function purchaseNumber(phoneNumber: string) {
    await fetch(`${API}/v1/twilio/numbers/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, friendly_name: `Wavult Team ${phoneNumber}` })
    })
    await fetchNumbers()
  }

  function assign(numberId: string, memberId: string) {
    const updated = { ...assignments, [numberId]: memberId }
    setAssignments(updated)
    localStorage.setItem('twilio_assignments', JSON.stringify(updated))
  }

  function copyNumber(num: string) {
    navigator.clipboard.writeText(num)
    setCopied(num)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>US-telefonnummer · Teamet</h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Twilio — virtuella amerikanska nummer</p>
          </div>
          <button onClick={fetchNumbers} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Uppdatera
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Purchased numbers */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Köpta nummer</div>
          {loading && <div style={{ color: '#9CA3AF', fontSize: 13 }}>Laddar...</div>}
          {!loading && numbers.length === 0 && <div style={{ color: '#9CA3AF', fontSize: 13 }}>Inga nummer köpta ännu — sök nedan</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {numbers.map(n => {
              const assignedTo = assignments[n.sid]
              const member = TEAM_MEMBERS.find(m => m.id === assignedTo)
              return (
                <div key={n.sid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                  <Phone size={16} style={{ color: '#6B7280' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#1C1C1E' }}>{n.phone_number}</span>
                      <button onClick={() => copyNumber(n.phone_number)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                        {copied === n.phone_number ? <CheckCircle size={14} style={{ color: '#16A34A' }} /> : <Copy size={14} />}
                      </button>
                    </div>
                    {member && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{member.name} · {member.role}</div>}
                  </div>
                  <select value={assignedTo || ''} onChange={e => assign(n.sid, e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, color: '#374151' }}>
                    <option value="">Ej tilldelad</option>
                    {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* Search new numbers */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Köp nya nummer</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <select value={areaCode} onChange={e => setAreaCode(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}>
              <option value="212">New York (212)</option>
              <option value="310">Los Angeles (310)</option>
              <option value="312">Chicago (312)</option>
              <option value="415">San Francisco (415)</option>
              <option value="713">Houston (713)</option>
              <option value="305">Miami (305)</option>
              <option value="202">Washington DC (202)</option>
            </select>
            <button onClick={searchAvailable} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1E40AF', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Sök tillgängliga
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {available.map(n => (
              <div key={n.number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{n.number}</span>
                <span style={{ color: '#6B7280' }}>{n.locality}, {n.region}</span>
                <button onClick={() => purchaseNumber(n.number)}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#DCFCE7', color: '#166534', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={12} /> Köp ~$1/mån
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
