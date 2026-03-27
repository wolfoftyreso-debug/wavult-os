import AsyncStorage from '@react-native-async-storage/async-storage'
import { MOCK_USER } from './mockData'

const TOKEN_KEY = 'wavult_auth_token'
const REFRESH_KEY = 'wavult_refresh_token'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  organization: string
  initials: string
}

export type AuthResponse = {
  user: AuthUser
  token: string
  refreshToken: string
}

export async function login(email: string, password: string): Promise<AuthUser> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Inloggning misslyckades')
    }

    const data: AuthResponse = await res.json()
    await AsyncStorage.setItem(TOKEN_KEY, data.token)
    await AsyncStorage.setItem(REFRESH_KEY, data.refreshToken)
    return data.user
  } catch (err: any) {
    // Network/timeout errors → demo mode
    if (
      err.name === 'TimeoutError' ||
      err.message?.includes('Network request failed') ||
      err.message?.includes('Failed to fetch') ||
      err.code === 'ECONNREFUSED'
    ) {
      // Demo mode — return mock user
      const demoToken = 'demo_token_' + Date.now()
      await AsyncStorage.setItem(TOKEN_KEY, demoToken)
      await AsyncStorage.setItem(REFRESH_KEY, 'demo_refresh')
      return MOCK_USER
    }
    throw err
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY)
  await AsyncStorage.removeItem(REFRESH_KEY)
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function refreshToken(): Promise<string | null> {
  try {
    const refresh = await AsyncStorage.getItem(REFRESH_KEY)
    if (!refresh) return null

    // Demo token — just return it
    if (refresh === 'demo_refresh') {
      return AsyncStorage.getItem(TOKEN_KEY)
    }

    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      await logout()
      return null
    }

    const data = await res.json()
    await AsyncStorage.setItem(TOKEN_KEY, data.token)
    return data.token
  } catch {
    return null
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const token = await getToken()
  if (!token) return null
  // Demo token
  if (token.startsWith('demo_token_')) return MOCK_USER
  // In production we'd decode the JWT or hit /api/auth/me
  return MOCK_USER
}
