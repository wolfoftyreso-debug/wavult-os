import { getToken, refreshToken } from './auth'
import { MOCK_CONTAINERS, MOCK_SEMANTIC_PROFILE } from './mockData'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

type RequestOptions = {
  retried?: boolean
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {}
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    })

    // Auto-refresh on 401
    if (res.status === 401 && !opts.retried) {
      const newToken = await refreshToken()
      if (newToken) {
        return request<T>(method, path, body, { retried: true })
      }
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `HTTP ${res.status}`)
    }

    return res.json()
  } catch (err: any) {
    // Fallback to mock data on connection errors
    if (
      err.name === 'TimeoutError' ||
      err.message?.includes('Network request failed') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('ECONNREFUSED')
    ) {
      return getMockFallback<T>(path)
    }
    throw err
  }
}

function getMockFallback<T>(path: string): T {
  if (path.startsWith('/api/containers')) return { data: MOCK_CONTAINERS, total: MOCK_CONTAINERS.length } as T
  if (path.startsWith('/api/semantic')) return MOCK_SEMANTIC_PROFILE as T
  if (path.startsWith('/api/auth/me')) return { id: 'u1', name: 'Erik Svensson', email: 'erik@hypbit.com', role: 'Chairman & Group CEO', organization: 'Wavult Group', initials: 'ES' } as T
  return {} as T
}

export function apiGet<T = unknown>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}
