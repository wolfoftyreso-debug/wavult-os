// ─── Wavult App — Login ─────────────────────────────────────────────────────────
// Clean, atmospheric. One purpose: get in fast.

import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export function LoginView() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, fullName)

    if (result.error) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-w-bg flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-tx-primary tracking-wider">WAVULT</h1>
        <p className="text-label text-tx-tertiary font-mono mt-1 uppercase">Personal Mission Control</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-w-surface border border-w-border text-sm text-tx-primary placeholder-tx-muted focus:outline-none focus:border-signal-amber/50 transition-colors"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl bg-w-surface border border-w-border text-sm text-tx-primary placeholder-tx-muted focus:outline-none focus:border-signal-amber/50 transition-colors"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="w-full px-4 py-3 rounded-xl bg-w-surface border border-w-border text-sm text-tx-primary placeholder-tx-muted focus:outline-none focus:border-signal-amber/50 transition-colors"
        />

        {error && (
          <div className="px-3 py-2 rounded-lg bg-signal-red/10 border border-signal-red/20 text-xs text-signal-red">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="app-btn app-btn--primary disabled:opacity-50"
        >
          {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
          className="w-full text-center text-xs text-tx-tertiary hover:text-tx-secondary transition-colors py-2"
        >
          {mode === 'login' ? 'No account? Register' : 'Already have an account? Sign in'}
        </button>
      </form>

      <p className="text-[10px] text-tx-muted font-mono mt-12">WAVULT OS v2</p>
    </div>
  )
}
