import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function ensureTables() {
  await sb().rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT,
      country TEXT, contact TEXT, email TEXT, status TEXT DEFAULT 'aktiv',
      avg_monthly_sek NUMERIC DEFAULT 0, note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY, supplier_id TEXT, supplier_name TEXT,
      description TEXT, amount NUMERIC, currency TEXT DEFAULT 'SEK',
      status TEXT DEFAULT 'utkast', date TEXT, created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY, supplier_id TEXT, supplier_name TEXT,
      start_date TEXT, end_date TEXT, auto_renewal BOOLEAN DEFAULT false,
      annual_value NUMERIC, currency TEXT DEFAULT 'SEK', description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY, purchase_order_id TEXT, supplier_name TEXT,
      description TEXT, amount NUMERIC, currency TEXT DEFAULT 'SEK',
      requested_by TEXT, requested_at TEXT, status TEXT DEFAULT 'väntande',
      approver TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ` }).catch(() => null)
}

router.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    await ensureTables()
    const { data } = await sb().from('suppliers').select('*').order('name')
    res.json(data ?? [])
  } catch { res.json([]) }
})

router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb().from('suppliers').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.put('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('suppliers')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.get('/purchase-orders', async (_req: Request, res: Response) => {
  try {
    const { data } = await sb().from('purchase_orders').select('*').order('created_at', { ascending: false })
    res.json(data ?? [])
  } catch { res.json([]) }
})

router.post('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb().from('purchase_orders').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.get('/contracts', async (_req: Request, res: Response) => {
  try {
    const { data } = await sb().from('contracts').select('*').order('end_date')
    res.json(data ?? [])
  } catch { res.json([]) }
})

router.post('/contracts', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb().from('contracts').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.get('/approvals', async (_req: Request, res: Response) => {
  try {
    const { data } = await sb().from('approval_requests').select('*').order('requested_at', { ascending: false })
    res.json(data ?? [])
  } catch { res.json([]) }
})

router.put('/approvals/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('approval_requests')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

export default router
