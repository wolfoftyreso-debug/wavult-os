import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("pixdrift_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export const apiClient = {
  async get<T = unknown>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  },
  async post<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  },
  async patch<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  },
};

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = unknown>(endpoint: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const token = localStorage.getItem("pixdrift_token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}${endpoint}`, { headers });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data: T = await res.json();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setState({ data: null, loading: false, error: message });
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return state;
}
