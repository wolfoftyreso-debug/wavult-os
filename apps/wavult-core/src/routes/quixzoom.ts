import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

function getSupabase() {
  const url = process.env.QUIXZOOM_SUPABASE_URL || 'https://lpeipzdmnnlbcoxlfhoe.supabase.co'
  const key = process.env.QUIXZOOM_SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  return createClient(url, key)
}

// GET /v1/missions
router.get('/v1/missions', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { status, limit = '100', offset = '0', zoomer_id } = req.query
  let query = supabase.from('missions').select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)
  if (status) query = query.eq('status', status as string)
  if (zoomer_id) query = query.eq('zoomer_id', zoomer_id as string)
  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data || [])
})

// GET /v1/missions/:id
router.get('/v1/missions/:id', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('missions').select('*').eq('id', req.params.id).single()
  if (error) return res.status(404).json({ error: 'Mission not found' })
  return res.json(data)
})

// POST /v1/missions
router.post('/v1/missions', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { title, description, location, lat, lng, reward, currency, category } = req.body
  if (!title || !location) return res.status(400).json({ error: 'title and location required' })
  const { data, error } = await supabase.from('missions').insert({
    title, description, location, lat, lng,
    reward: reward || 85, currency: currency || 'SEK',
    category: category || 'inspection', status: 'open'
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// POST /v1/missions/:id/approve
router.post('/v1/missions/:id/approve', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('missions')
    .update({ status: 'approved', completed_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// POST /v1/missions/:id/reject
router.post('/v1/missions/:id/reject', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { reason } = req.body
  const { data, error } = await supabase.from('missions')
    .update({ status: 'rejected', notes: reason })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// GET /v1/zoomers
router.get('/v1/zoomers', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { status, limit = '100' } = req.query
  let query = supabase.from('zoomers').select('*').order('created_at', { ascending: false }).limit(Number(limit))
  if (status) query = query.eq('status', status as string)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data || [])
})

// POST /v1/zoomers
router.post('/v1/zoomers', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { name, email, phone } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const { data, error } = await supabase.from('zoomers').insert({ name, email, phone, status: 'pending' }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// PATCH /v1/zoomers/:id
router.patch('/v1/zoomers/:id', async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const { status, name, phone } = req.body
  const { data, error } = await supabase.from('zoomers')
    .update({ status, name, phone, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

export default router
