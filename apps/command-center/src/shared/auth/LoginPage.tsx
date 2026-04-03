/**
 * LoginPage — Wavult OS enterprise sign-in
 */

import { useState, FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import { Input } from '../design-system/DesignSystem'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

// ─── Forgot password form ─────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) { setError('Ange din e-postadress eller telefonnummer.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/identity/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.message ?? `Fel: HTTP ${res.status}`)
      }
    } catch {
      setError('Nätverksfel — försök igen.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>Länk skickad!</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            En återställningslänk har skickats till <strong>{identifier}</strong>. Kolla din e-post eller SMS.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{ width: '100%', padding: '12px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Tillbaka till inloggning
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          Ange din e-postadress eller telefonnummer så skickar vi en återställningslänk.
        </p>
        <Input
          type="text"
          label="E-post eller telefonnummer"
          placeholder="email@example.com eller +46…"
          value={identifier}
          onChange={setIdentifier}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: -4 }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px 24px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Skickar…' : 'Skicka återställningslänk'}
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{ width: '100%', padding: '10px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          ← Tillbaka
        </button>
      </div>
    </form>
  )
}

// ─── Wavult hexagon logo mark ─────────────────────────────────────────────────
function WavultMark({ size = 52 }: { size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.44
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <polygon points={pts} fill="var(--color-accent)" />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFFFFF"
        fontSize={size * 0.38}
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        W
      </text>
    </svg>
  )
}

export function LoginPage() {
  const { signIn } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email.trim().toLowerCase(), password)
    if (error) setError(translateError(error, t))
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'var(--color-bg)',
      }}
    >
      {/* Subtle cream texture — no dark background images */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 60% 40%, #EDE7DD 0%, var(--color-bg) 70%)',
          zIndex: 0,
        }}
      />

      {/* Login card */}
      <div
        className="w-full max-w-sm relative"
        style={{
          zIndex: 2,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          padding: 32,
        }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <WavultMark size={52} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Wavult OS
          </h1>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
            Operational Intelligence Platform
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Sign in to continue
          </p>
        </div>

        {/* Form or forgot password */}
        {showForgot ? (
          <ForgotPasswordForm onBack={() => setShowForgot(false)} />
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  type="email"
                  label={t('auth.email')}
                  placeholder="Email address"
                  value={email}
                  onChange={setEmail}
                />

                <Input
                  type="password"
                  label={t('auth.password')}
                  placeholder="Password"
                  value={password}
                  onChange={setPassword}
                />

                {error && (
                  <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: -4 }}>{error}</p>
                )}

                <div style={{ marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-accent)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 15,
                      fontWeight: 600,
                      fontFamily: 'var(--font-sans)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {loading ? 'Signing in…' : 'Sign in to Wavult OS'}
                  </button>
                </div>
              </div>
            </form>

            {/* Forgot password link */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 13,
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Glömt lösenord?
              </button>
            </div>

            {/* Footer note */}
            <p
              className="text-center mt-4"
              style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}
            >
              Need access?{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Contact your administrator.
              </span>
            </p>
          </>
        )}
      </div>

      {/* Bottom build tag */}
      <p
        className="absolute bottom-6"
        style={{
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
          zIndex: 2,
          opacity: 0.5,
        }}
      >
        Wavult OS · Internal access only · Unauthorized access is prohibited
      </p>
    </div>
  )
}

function translateError(msg: string, t: (key: string) => string): string {
  if (msg.includes('Invalid login credentials')) return t('auth.error.invalid')
  if (msg.includes('Email not confirmed')) return 'Email address is not confirmed — check your inbox'
  if (msg.includes('Too many requests')) return 'Too many attempts — please wait and try again'
  if (msg.includes('User not found')) return 'No account found with that email address'
  if (msg.includes('network')) return t('agent.error.network')
  return msg
}
