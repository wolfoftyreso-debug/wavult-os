/**
 * Venture Engine API — /api/venture-engine/*
 * Wavult Group capital allocation and venture tracking
 */
import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

// GET /api/venture-engine/opportunities
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    let query = sb.from('venture_opportunities').select('*').order('created_at', { ascending: false })
    if (req.query.industry) query = query.eq('industry', req.query.industry as string)
    if (req.query.status) query = query.eq('status', req.query.status as string)
    const { data, error } = await query
    if (error) throw error
    res.json(data ?? [])
  } catch (e: any) {
    console.error('venture-engine opportunities:', e.message)
    res.json([])
  }
})

// POST /api/venture-engine/opportunities
router.post('/opportunities', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('venture_opportunities').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/venture-engine/opportunities/:id/validate
router.put('/opportunities/:id/validate', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('venture_opportunities')
      .update({ status: 'validated', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/venture-engine/ventures
router.get('/ventures', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('ventures').select('*').order('created_at', { ascending: false })
    if (error) throw error
    res.json(data ?? [])
  } catch (e: any) {
    console.error('venture-engine ventures:', e.message)
    res.json([])
  }
})

// POST /api/venture-engine/ventures
router.post('/ventures', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('ventures').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/venture-engine/capital
router.get('/capital', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('venture_investments')
      .select('*, ventures(name)')
      .order('allocated_at', { ascending: false })
    if (error) throw error
    res.json(data ?? [])
  } catch (e: any) {
    console.error('venture-engine capital:', e.message)
    res.json([])
  }
})

// POST /api/venture-engine/capital/allocate
router.post('/capital/allocate', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('venture_investments').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/venture-engine/impact
router.get('/impact', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('venture_impact')
      .select('*, ventures(name)')
      .order('recorded_at', { ascending: false })
    if (error) throw error
    res.json(data ?? [])
  } catch (e: any) {
    console.error('venture-engine impact:', e.message)
    res.json([])
  }
})

// GET /api/venture-engine/stats — aggregated summary
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase()
    const [{ count: opp }, { count: vent }, { data: cap }] = await Promise.all([
      sb.from('venture_opportunities').select('*', { count: 'exact', head: true }),
      sb.from('ventures').select('*', { count: 'exact', head: true }),
      sb.from('venture_investments').select('amount, currency'),
    ])
    const totalCapital = (cap ?? []).reduce((s: number, i: any) => s + (i.amount ?? 0), 0)
    res.json({
      total_opportunities: opp ?? 0,
      active_ventures: vent ?? 0,
      total_capital_deployed: totalCapital,
      currency: 'SEK',
    })
  } catch (e: any) {
    console.error('venture-engine stats:', e.message)
    res.json({ total_opportunities: 0, active_ventures: 0, total_capital_deployed: 0, currency: 'SEK' })
  }
})

export default router
