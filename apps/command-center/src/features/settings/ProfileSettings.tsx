import { useState } from 'react'
import { ShieldCheck, Activity } from 'lucide-react'
import { useApi } from '../../shared/auth/useApi'
import { useAuth } from '../../shared/auth/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

// ─── Password change section ──────────────────────────────────────────────────

function ChangePasswordSection() {
  const { apiFetch } = useApi()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (form.next.length < 8) {
      setMsg({ type: 'error', text: 'Nytt lösenord måste vara minst 8 tecken.' })
      return
    }
    if (form.next !== form.confirm) {
      setMsg({ type: 'error', text: 'De nya lösenorden matchar inte.' })
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/identity/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Lösenordet har uppdaterats.' })
        setForm({ current: '', next: '', confirm: '' })
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ type: 'error', text: data.message ?? `Fel: HTTP ${res.status}` })
      }
    } catch {
      setMsg({ type: 'error', text: 'Nätverksfel — kunde inte nå API.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={sectionHeader}>
        <div style={sectionLabel}>Byt lösenord</div>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={fieldGroup}>
          <label style={labelStyle}>Nuvarande lösenord</label>
          <input
            type="password"
            value={form.current}
            onChange={e => setField('current', e.target.value)}
            placeholder="Nuvarande lösenord"
            style={inputStyle}
          />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Nytt lösenord</label>
          <input
            type="password"
            value={form.next}
            onChange={e => setField('next', e.target.value)}
            placeholder="Minst 8 tecken"
            style={inputStyle}
          />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Bekräfta nytt lösenord</label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setField('confirm', e.target.value)}
            placeholder="Upprepa nytt lösenord"
            style={inputStyle}
          />
        </div>
        {msg && (
          <p style={{ fontSize: 12, color: msg.type === 'success' ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)', margin: 0 }}>
            {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          </p>
        )}
        <div>
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Sparar…' : 'Uppdatera lösenord'}
          </button>
        </div>
      </form>
    </section>
  )
}

// ─── Magic link / forgot password section ─────────────────────────────────────

function MagicLinkSection() {
  const { session } = useAuth() as any
  const [loading, setLoading] = useState<'email' | 'sms' | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const email = session?.user?.email ?? ''
  const phone = session?.user?.phone ?? session?.user?.user_metadata?.phone ?? ''

  async function sendMagicLink(method: 'email' | 'sms') {
    const identifier = method === 'email' ? email : phone
    if (!identifier) {
      setMsg({ type: 'error', text: method === 'email' ? 'Ingen e-postadress hittad på ditt konto.' : 'Inget telefonnummer hittad på ditt konto.' })
      return
    }
    setLoading(method)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/identity/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, identifier }),
      })
      if (res.ok) {
        setMsg({
          type: 'success',
          text: method === 'email'
            ? `En inloggningslänk har skickats till ${identifier}.`
            : `En inloggningskod har skickats till ${identifier}.`,
        })
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ type: 'error', text: data.message ?? `Fel: HTTP ${res.status}` })
      }
    } catch {
      setMsg({ type: 'error', text: 'Nätverksfel — kunde inte skicka länk.' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={sectionHeader}>
        <div style={sectionLabel}>Inloggningslänk / Magic Link</div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Skicka en engångslänk eller engångskod för lösenordsfri inloggning.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => sendMagicLink('email')}
            disabled={loading !== null}
            style={btnSecondary}
          >
            {loading === 'email' ? 'Skickar…' : '📧 Skicka inloggningslänk via e-post'}
          </button>
          <button
            onClick={() => sendMagicLink('sms')}
            disabled={loading !== null}
            style={btnSecondary}
          >
            {loading === 'sms' ? 'Skickar…' : '📱 Skicka inloggningskod via SMS'}
          </button>
        </div>
        {msg && (
          <p style={{ fontSize: 12, color: msg.type === 'success' ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)', margin: 0 }}>
            {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          </p>
        )}
      </div>
    </section>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ProfileSettings() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Profilinställningar</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Hantera din identitet, hälsodata och integrationer</p>
      </div>

      {/* Identity & KYC */}
      <section style={sectionStyle}>
        <div style={sectionHeader}>
          <div style={sectionLabel}>Identitet & KYC</div>
        </div>
        {[
          { icon: <ShieldCheck size={16} />, title: 'Passverifiering', desc: 'Ladda upp passportets bildsida + selfie för KYC-verifiering', action: 'Ladda upp', status: 'Saknas' },
        ].map(item => (
          <div key={item.title} style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'var(--color-text-tertiary)' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-warning-bg, #FEF3C7)', color: 'var(--color-warning-text, #92400E)', borderRadius: 4, fontWeight: 600 }}>{item.status}</span>
              <button style={btnAction}>{item.action}</button>
            </div>
          </div>
        ))}
      </section>

      {/* Health */}
      <section style={sectionStyle}>
        <div style={sectionHeader}>
          <div style={sectionLabel}>Hälsa & Välmående</div>
        </div>
        {[
          { icon: <Activity size={16} />, title: 'WHOOP-integration', desc: 'Koppla din WHOOP för sömndata, återhämtning och belastning', action: 'Koppla', status: 'Ej kopplad' },
        ].map(item => (
          <div key={item.title} style={{ ...rowStyle, borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'var(--color-text-tertiary)' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-surface-raised, #F3F4F6)', color: 'var(--color-text-secondary)', borderRadius: 4, fontWeight: 600 }}>{item.status}</span>
              <button style={btnAction}>{item.action}</button>
            </div>
          </div>
        ))}
      </section>

      {/* Change password */}
      <ChangePasswordSection />

      {/* Magic link */}
      <MagicLinkSection />
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  overflow: 'hidden',
}

const sectionHeader: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
}

const rowStyle: React.CSSProperties = {
  padding: '14px 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid var(--color-border)',
}

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  width: '100%',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-accent, #2563EB)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const btnAction: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  fontSize: 13,
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
  fontWeight: 500,
}
