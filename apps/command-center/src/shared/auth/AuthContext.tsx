/**
 * AuthContext — Supabase-baserad autentisering för Wavult OS
 *
 * Hanterar:
 * - Supabase-session (JWT, refresh, persistens)
 * - Exponerar getToken() för API-anrop
 * - Lyssnar på auth state changes (login/logout/refresh)
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  getToken: () => Promise<string | null>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hämta initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Lyssna på auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const normalizedEmail = email.trim().toLowerCase()

    // Try Identity Core (hybrid mode)
    try {
      const icRes = await fetch('https://api.hypbit.com/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
        signal: AbortSignal.timeout(5000),
      })
      if (icRes.ok) {
        const data = await icRes.json()
        if (data?.data?.access_token) {
          localStorage.setItem('ic_token', data.data.access_token)
          localStorage.setItem('ic_refresh', data.data.refresh_token || '')
          localStorage.setItem('ic_session', data.data.session_id || '')
        }
      }
    } catch {
      // IC unavailable — continue with Supabase
    }

    // Primary: Supabase (until cutover)
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, getToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth måste användas inom AuthProvider')
  return ctx
}
