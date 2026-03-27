import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://znmxtnxxjpmgtycmsqjv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXh0bnh4anBtZ3R5Y21zcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODA2NjUsImV4cCI6MjA4OTQ1NjY2NX0.3LzBF2cE95X0vtW-5LwfJu8iGebnE9AUXglHchMPH60'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type LedgerEntry = {
  id: string
  date: string
  description: string | null
  amount: number
  currency: string
  type: string
  entity_id: string | null
  created_at: string
}

export type Contact = {
  id: string
  created_at: string
  updated_at: string
  name: string
  email: string | null
  phone: string | null
  company_id: string | null
  type: string | null
  status: string
  metadata: Record<string, unknown>
}

export type Company = {
  id: string
  created_at: string
  updated_at: string
  name: string
  industry: string | null
  website: string | null
  size: string | null
  status: string
  metadata: Record<string, unknown>
}

export type Deal = {
  id: string
  created_at: string
  updated_at: string
  title: string
  amount: number | null
  currency: string
  stage: string | null
  probability: number | null
  expected_close_date: string | null
  contact_id: string | null
  company_id: string | null
  status: string
  metadata: Record<string, unknown>
}
