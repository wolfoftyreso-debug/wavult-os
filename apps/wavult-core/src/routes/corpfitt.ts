import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

router.get('/stats', async (_req, res) => {
  try {
    const [visits, wallets] = await Promise.allSettled([
      sb().from('corpfitt_visits').select('count', { count: 'exact', head: true }),
      sb().from('corpfitt_wallets').select('count', { count: 'exact', head: true }),
    ])
    res.json({
      total_visits: visits.status === 'fulfilled' ? visits.value.count : 0,
      active_users: wallets.status === 'fulfilled' ? wallets.value.count : 0,
      locations: 60,
      mrr: '$0', // pre-revenue
    })
  } catch {
    res.json({ total_visits: 0, active_users: 0, locations: 60, mrr: '$0' })
  }
})

router.post('/partner-apply', async (req, res) => {
  try {
    const { data } = await sb()
      .from('corpfitt_partner_applications')
      .insert({ ...req.body, applied_at: new Date().toISOString(), status: 'pending' })
      .select()
      .single()
    res.status(201).json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/locations', async (_req, res) => {
  // Pilot data — Thailand phase
  res.json([
    { id: 'nh_kamala', name: 'NH Collection Kamala Beach', chain: 'Minor International', lat: 7.9557, lng: 98.2985, price_usd: 20, available: true },
    { id: 'nh_patong', name: 'NH Hotel Patong', chain: 'Minor International', lat: 7.8955, lng: 98.2972, price_usd: 20, available: true },
    { id: 'anantara_phuket', name: 'Anantara Phuket Resort', chain: 'Minor International', lat: 7.9785, lng: 98.3016, price_usd: 25, available: true },
  ])
})

export default router
