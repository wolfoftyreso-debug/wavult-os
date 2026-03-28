/**
 * LoginPage — Wavult OS inloggning
 *
 * Supabase email/lösenord-auth. Efter lyckad inloggning
 * fortsätter flödet till rollvalet (RoleLogin).
 */

import { useState, FormEvent } from 'react'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email.trim(), password)
    if (error) {
      setError(translateError(error))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#07080F] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="text-xs font-mono text-gray-600 mb-3 tracking-widest uppercase">
          Wavult Group
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Wavult OS</h1>
        <p className="text-sm text-gray-500">Logga in för att fortsätta</p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
            E-post
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="namn@hypbit.com"
            required
            autoComplete="email"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
            Lösenord
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading ? '#4B5563' : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            color: 'white',
          }}
        >
          {loading ? 'Loggar in…' : 'Logga in'}
        </button>
      </form>

      <p className="mt-10 text-xs text-gray-700">
        Wavult OS · Intern access · Kontakta admin vid problem
      </p>
    </div>
  )
}

// ─── Error translation ────────────────────────────────────────────────────────

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Fel e-post eller lösenord'
  if (msg.includes('Email not confirmed')) return 'E-postadressen är inte bekräftad — kolla din inbox'
  if (msg.includes('Too many requests')) return 'För många försök — vänta en stund och försök igen'
  if (msg.includes('User not found')) return 'Ingen användare med den e-postadressen hittades'
  if (msg.includes('network')) return 'Nätverksfel — kontrollera din internetanslutning'
  return msg
}
