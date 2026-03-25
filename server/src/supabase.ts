import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

const realClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * The public anon key, used when creating per-request clients
 * scoped to a specific user's JWT.
 */
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

// ---------------------------------------------------------------------------
// Fallback: when Supabase is unreachable, return empty results instead of
// hanging for 10+ seconds per request.
// ---------------------------------------------------------------------------

const EMPTY_RESULT = { data: [], error: null, count: null, status: 200, statusText: "OK (fallback)" };
const EMPTY_SINGLE = { data: null, error: null, count: null, status: 200, statusText: "OK (fallback)" };

function chainable(terminal: () => Promise<any>): any {
  const proxy: any = new Proxy(() => {}, {
    get(_target, prop) {
      if (prop === "then") return (...args: any[]) => terminal().then(...args);
      if (prop === "single" || prop === "maybeSingle") {
        return () => chainable(() => Promise.resolve(EMPTY_SINGLE));
      }
      // All other chained methods (.eq, .in, .order, .limit, .select, etc.)
      return (..._args: any[]) => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy;
}

function createFallbackClient(): SupabaseClient {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      // Pass through auth so JWT verification still works (returns null user)
      if (prop === "auth") {
        return {
          getUser: async () => ({ data: { user: null }, error: { message: "Supabase offline (fallback)" } }),
          signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase offline" } }),
        };
      }
      if (prop === "from" || prop === "rpc") {
        return (..._args: any[]) => chainable(() => Promise.resolve(EMPTY_RESULT));
      }
      if (prop === "storage") {
        return new Proxy({}, { get: () => () => chainable(() => Promise.resolve(EMPTY_RESULT)) });
      }
      // Allow anything else to pass through silently
      return (..._args: any[]) => chainable(() => Promise.resolve(EMPTY_RESULT));
    },
  };
  return new Proxy({} as SupabaseClient, handler);
}

let _supabase: SupabaseClient = realClient;
let _fallbackMode = false;

export async function checkSupabaseConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: supabaseServiceKey! },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      console.log("✓ Supabase connected");
      _supabase = realClient;
      _fallbackMode = false;
      return true;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err: any) {
    console.warn(`⚠ Supabase unreachable (${err.message || err}) — using fallback (empty results)`);
    _supabase = createFallbackClient();
    _fallbackMode = true;
    return false;
  }
}

/**
 * Supabase admin client using the service role key.
 * Falls back to a mock client returning empty data when Supabase is unreachable.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(_supabase, prop, receiver);
  },
});

export function isSupabaseFallback(): boolean {
  return _fallbackMode;
}


// Legacy pool shim for mobility-incident-api
export const pool = {
  query: async (sql: string, _params?: unknown[]) => {
    return { rows: [] as unknown[], rowCount: 0 };
  }
};
