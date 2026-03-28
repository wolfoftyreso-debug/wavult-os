/**
 * LoginPage — Wavult OS inloggning (ljust enterprise-tema)
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
    if (error) setError(translateError(error))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-700 mb-4">
            <span className="text-xl font-bold text-white">W</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Wavult OS</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mt-1">Wavult Group</p>
          <p className="text-sm text-gray-500 mt-2">Logga in för att fortsätta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              E-post
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="namn@hypbit.com"
              required
              autoComplete="email"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Lösenord
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
              }`}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>
      </div>

      <p className="absolute bottom-6 text-xs text-gray-400 font-mono">
        Wavult OS · Intern access · Kontakta admin vid problem
      </p>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Fel e-post eller lösenord'
  if (msg.includes('Email not confirmed')) return 'E-postadressen är inte bekräftad — kolla din inbox'
  if (msg.includes('Too many requests')) return 'För många försök — vänta en stund och försök igen'
  if (msg.includes('User not found')) return 'Ingen användare med den e-postadressen hittades'
  if (msg.includes('network')) return 'Nätverksfel — kontrollera din internetanslutning'
  return msg
}
