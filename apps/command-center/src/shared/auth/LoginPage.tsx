/**
 * LoginPage — Wavult OS inloggning (Apple-native design system)
 */

import { useState, FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import { Input } from '../design-system/DesignSystem'

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
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm"
        style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: 32,
        }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center mb-4"
            style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-accent)' }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>W</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Wavult OS
          </h1>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
            Wavult Group
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            {t('auth.login')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              type="email"
              label={t('auth.email')}
              placeholder="namn@wavult.com"
              value={email}
              onChange={setEmail}
            />

            <Input
              type="password"
              label={t('auth.password')}
              placeholder="••••••••"
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
                {loading ? t('auth.logging_in') : t('auth.login')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <p
        className="absolute bottom-6"
        style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}
      >
        Wavult OS · Intern access · Kontakta admin vid problem
      </p>
    </div>
  )
}

function translateError(msg: string, t: (key: string) => string): string {
  if (msg.includes('Invalid login credentials')) return t('auth.error.invalid')
  if (msg.includes('Email not confirmed')) return 'E-postadressen är inte bekräftad — kolla din inbox'
  if (msg.includes('Too many requests')) return 'För många försök — vänta en stund och försök igen'
  if (msg.includes('User not found')) return 'Ingen användare med den e-postadressen hittades'
  if (msg.includes('network')) return t('agent.error.network')
  return msg
}
