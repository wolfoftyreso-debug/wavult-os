/**
 * useApi — autentiserad fetch-wrapper
 *
 * Lägger automatiskt till:
 * - Authorization: Bearer <jwt> (Supabase access token)
 * - credentials: 'include' (cookies)
 * - Content-Type: application/json
 *
 * Användning:
 *   const { apiFetch } = useApi()
 *   const data = await apiFetch('/whoop/status')
 */

import { useAuth } from './AuthContext'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.hypbit.com'

export function useApi() {
  const { getToken } = useAuth()

  async function apiFetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })
  }

  return { apiFetch, apiBase: API_BASE }
}
