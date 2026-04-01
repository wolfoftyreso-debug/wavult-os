/**
 * LoginPage — Wavult OS enterprise sign-in
 */

import { useState, FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import { Input } from '../design-system/DesignSystem'

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
      {/* Full-screen background image */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/images/os-login-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
          zIndex: 0,
        }}
      />
      {/* Overlay gradient for depth */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, var(--color-bg) 0%, transparent 60%, var(--color-bg) 100%)',
          zIndex: 1,
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

        {/* Form */}
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

        {/* Footer note */}
        <p
          className="text-center mt-6"
          style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}
        >
          Need access?{' '}
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Contact your administrator.
          </span>
        </p>
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
