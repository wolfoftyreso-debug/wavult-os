import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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
