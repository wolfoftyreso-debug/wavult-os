/**
 * UsersView — Admin: Användarhantering
 * Listar alla användare, låter admin ändra lösenord, skicka reset-link,
 * aktivera/inaktivera konton och skapa nya användare.
 */

import { useState, useEffect } from 'react'
import { useApi } from '../../shared/auth/useApi'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  active: boolean
  createdAt: string
}

const MOCK_USERS: User[] = [
  { id: 'mock-1', name: 'Erik Svensson',   email: 'erik@hypbit.com',   role: 'admin',  active: true,  createdAt: '2025-01-01T00:00:00Z' },
  { id: 'mock-2', name: 'Dennis Bjarnemark', email: 'dennis@hypbit.com', role: 'admin', active: true,  createdAt: '2025-01-01T00:00:00Z' },
  { id: 'mock-3', name: 'Leon Russo',       email: 'leon@hypbit.com',   role: 'user',  active: true,  createdAt: '2025-01-01T00:00:00Z' },
]

// ─── Sub-modals ────────────────────────────────────────────────────────────────

function ChangePasswordModal({ user, onClose, apiFetch }: {
  user: User
  onClose: () => void
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>
}) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setMsg({ type: 'error', text: 'Lösenordet måste vara minst 8 tecken.' }); return }
    setLoading(true); setMsg(null)
    try {
      const res = await apiFetch(`/identity/admin/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Lösenordet har uppdaterats.' })
        setPassword('')
      } else {
        const err = await res.json().catch(() => ({}))
        setMsg({ type: 'error', text: err.message ?? `Fel: HTTP ${res.status}` })
      }
    } catch {
      setMsg({ type: 'error', text: 'Nätverksfel — kunde inte nå API.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={modalTitle}>Ändra lösenord</h3>
        <p style={modalSub}>Användare: <strong>{user.name}</strong> ({user.email})</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Nytt lösenord (minst 8 tecken)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          {msg && <p style={{ fontSize: 12, color: msg.type === 'success' ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>{msg.text}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Avbryt</button>
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Sparar…' : 'Spara'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateUserModal({ onClose, onCreated, apiFetch }: {
  onClose: () => void
  onCreated: (user: User) => void
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>
}) {
  const [form, setForm] = useState({ email: '', name: '', role: 'user', password: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.name || !form.password) { setErr('Alla fält är obligatoriska.'); return }
    if (form.password.length < 8) { setErr('Lösenordet måste vara minst 8 tecken.'); return }
    setLoading(true); setErr(null)
    try {
      const res = await apiFetch('/identity/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data)
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setErr(data.message ?? `Fel: HTTP ${res.status}`)
      }
    } catch {
      setErr('Nätverksfel — kunde inte nå API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={modalTitle}>Skapa ny användare</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Namn" value={form.name} onChange={e => setField('name', e.target.value)} style={inputStyle} />
          <input type="email" placeholder="E-post" value={form.email} onChange={e => setField('email', e.target.value)} style={inputStyle} />
          <select value={form.role} onChange={e => setField('role', e.target.value)} style={inputStyle}>
            <option value="user">Användare</option>
            <option value="admin">Admin</option>
            <option value="viewer">Läsare</option>
          </select>
          <input type="password" placeholder="Lösenord (minst 8 tecken)" value={form.password} onChange={e => setField('password', e.target.value)} style={inputStyle} />
          {err && <p style={{ fontSize: 12, color: 'var(--color-danger, #dc2626)' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Avbryt</button>
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Skapar…' : 'Skapa'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function UsersView() {
  const { apiFetch } = useApi()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [changePwUser, setChangePwUser] = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await apiFetch('/identity/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : data.users ?? [])
        setApiError(null)
      } else {
        setApiError(`API svarade med HTTP ${res.status}. Visar exempeldata.`)
        setUsers(MOCK_USERS)
      }
    } catch {
      setApiError('Kunde inte nå API. Visar exempeldata.')
      setUsers(MOCK_USERS)
    } finally {
      setLoading(false)
    }
  }

  async function sendResetLink(user: User, method: 'email' | 'sms') {
    try {
      const res = await apiFetch(`/identity/admin/users/${user.id}/reset-link`, {
        method: 'POST',
        body: JSON.stringify({ method }),
      })
      if (res.ok) {
        showToast('success', `Återställningslänk skickad via ${method === 'email' ? 'e-post' : 'SMS'} till ${user.name}.`)
      } else {
        showToast('error', `Misslyckades att skicka länk. HTTP ${res.status}`)
      }
    } catch {
      showToast('error', 'Nätverksfel — kunde inte skicka länk.')
    }
  }

  async function toggleStatus(user: User) {
    const newActive = !user.active
    try {
      const res = await apiFetch(`/identity/admin/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ active: newActive }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newActive } : u))
        showToast('success', `${user.name} är nu ${newActive ? 'aktiverad' : 'inaktiverad'}.`)
      } else {
        showToast('error', `Kunde inte uppdatera status. HTTP ${res.status}`)
      }
    } catch {
      showToast('error', 'Nätverksfel — kunde inte uppdatera status.')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Användarhantering</h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Hantera systemanvändare och behörigheter</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          + Ny användare
        </button>
      </div>

      {/* API error banner */}
      {apiError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-warning-bg, #FEF3C7)', border: '1px solid var(--color-warning-border, #FDE68A)', color: 'var(--color-warning-text, #92400E)', fontSize: 12 }}>
          ⚠️ {apiError}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: toast.type === 'success' ? 'var(--color-success-bg, #DCFCE7)' : 'var(--color-danger-bg, #FEE2E2)',
          border: `1px solid ${toast.type === 'success' ? 'var(--color-success-border, #86EFAC)' : 'var(--color-danger-border, #FCA5A5)'}`,
          color: toast.type === 'success' ? 'var(--color-success-text, #166534)' : 'var(--color-danger-text, #991B1B)',
          boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))',
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.text}
        </div>
      )}

      {/* Users table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Laddar användare…
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Namn', 'E-post', 'Roll', 'Status', 'Skapad', 'Åtgärder'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{user.name}</div>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{user.email}</span>
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: user.role === 'admin' ? 'var(--color-accent-subtle, #EFF6FF)' : 'var(--color-surface-raised, #F3F4F6)',
                      color: user.role === 'admin' ? 'var(--color-accent, #2563EB)' : 'var(--color-text-secondary)',
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: user.active ? 'var(--color-success-bg, #DCFCE7)' : 'var(--color-danger-bg, #FEE2E2)',
                      color: user.active ? 'var(--color-success-text, #166534)' : 'var(--color-danger-text, #991B1B)',
                    }}>
                      {user.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {new Date(user.createdAt).toLocaleDateString('sv-SE')}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => setChangePwUser(user)} style={btnXs}>🔑 Lösenord</button>
                      <button onClick={() => sendResetLink(user, 'email')} style={btnXs}>📧 Mail</button>
                      <button onClick={() => sendResetLink(user, 'sms')} style={btnXs}>📱 SMS</button>
                      <button
                        onClick={() => toggleStatus(user)}
                        style={{ ...btnXs, color: user.active ? 'var(--color-danger-text, #991B1B)' : 'var(--color-success-text, #166534)' }}
                      >
                        {user.active ? '⏸ Inaktivera' : '▶ Aktivera'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {changePwUser && (
        <ChangePasswordModal
          user={changePwUser}
          onClose={() => setChangePwUser(null)}
          apiFetch={apiFetch}
        />
      )}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(u) => setUsers(prev => [...prev, u])}
          apiFetch={apiFetch}
        />
      )}
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modal: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 24,
  minWidth: 360,
  maxWidth: 480,
  width: '90%',
  boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.2))',
}

const modalTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px',
}

const modalSub: React.CSSProperties = {
  fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'var(--color-accent, #2563EB)', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
}

const btnXs: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-secondary)',
  fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '12px 16px', verticalAlign: 'middle',
}
