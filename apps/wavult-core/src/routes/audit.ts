import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function ensureTable() {
  await sb().rpc('exec_sql', {
    sql: `CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      actor TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details JSONB DEFAULT '{}',
      ip_address TEXT,
      severity TEXT DEFAULT 'info'
    );
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp DESC);`
  }).catch(() => null)
}

router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureTable()
    const { limit = '50', actor, action } = req.query as any
    let q = sb()
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit))
    if (actor) q = q.eq('actor', actor)
    if (action) q = q.ilike('action', `%${action}%`)
    const { data } = await q
    res.json(data ?? [])
  } catch {
    res.json([])
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureTable()
    const { data, error } = await sb()
      .from('audit_log')
      .insert({ ...req.body, ip_address: req.ip, timestamp: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
