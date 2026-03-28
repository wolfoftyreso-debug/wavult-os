import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Auth] Supabase env vars saknas — VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY krävs')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'wavult-os-session',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
