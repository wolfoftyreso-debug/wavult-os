import { Router, Request, Response } from 'express'
import { getRDSPool } from '../db/rds'

const router = Router()

// GET /v1/missions
router.get('/v1/missions', async (req: Request, res: Response) => {
  const { status, limit = '100', offset = '0', zoomer_id } = req.query
  const pool = getRDSPool()
  const params: unknown[] = []
  let query = `SELECT * FROM wavult.missions WHERE 1=1`
  if (status) { query += ` AND status = $${params.length + 1}`; params.push(status) }
  if (zoomer_id) { query += ` AND zoomer_id = $${params.length + 1}`; params.push(zoomer_id) }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  params.push(Number(limit), Number(offset))
  try {
    const result = await pool.query(query, params)
    return res.json(result.rows)
  } catch (err) {
    console.error('[quixzoom] GET /v1/missions error:', err)
    return res.status(500).json({ error: String(err) })
  }
})

// GET /v1/missions/:id
router.get('/v1/missions/:id', async (req: Request, res: Response) => {
  const pool = getRDSPool()
  try {
    const result = await pool.query(`SELECT * FROM wavult.missions WHERE id = $1`, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mission not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/missions
router.post('/v1/missions', async (req: Request, res: Response) => {
  const { title, description, location, lat, lng, reward, currency, category } = req.body
  if (!title || !location) return res.status(400).json({ error: 'title and location required' })
  const pool = getRDSPool()
  try {
    const result = await pool.query(
      `INSERT INTO wavult.missions (title, description, location, lat, lng, reward, currency, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open') RETURNING *`,
      [title, description || null, location, lat || null, lng || null,
       reward || 85, currency || 'SEK', category || 'inspection']
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('[quixzoom] POST /v1/missions error:', err)
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/missions/:id/approve
router.post('/v1/missions/:id/approve', async (req: Request, res: Response) => {
  const pool = getRDSPool()
  try {
    const result = await pool.query(
      `UPDATE wavult.missions SET status='approved', completed_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mission not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

// POST /v1/missions/:id/reject
router.post('/v1/missions/:id/reject', async (req: Request, res: Response) => {
  const { reason } = req.body
  const pool = getRDSPool()
  try {
    const result = await pool.query(
      `UPDATE wavult.missions SET status='rejected', notes=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [reason || null, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mission not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

// GET /v1/zoomers
router.get('/v1/zoomers', async (req: Request, res: Response) => {
  const { status, limit = '100' } = req.query
  const pool = getRDSPool()
  const params: unknown[] = []
  let query = `SELECT * FROM wavult.zoomers WHERE 1=1`
  if (status) { query += ` AND status = $${params.length + 1}`; params.push(status) }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
  params.push(Number(limit))
  try {
    const result = await pool.query(query, params)
    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/zoomers
router.post('/v1/zoomers', async (req: Request, res: Response) => {
  const { name, email, phone } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const pool = getRDSPool()
  try {
    const result = await pool.query(
      `INSERT INTO wavult.zoomers (email, name, phone, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (email) DO NOTHING RETURNING *`,
      [email, name || null, phone || null]
    )
    return res.status(201).json(result.rows[0] || { email, status: 'already_exists' })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// PATCH /v1/zoomers/:id
router.patch('/v1/zoomers/:id', async (req: Request, res: Response) => {
  const { status, name, phone } = req.body
  const pool = getRDSPool()
  const updates: string[] = []
  const params: unknown[] = []
  if (status !== undefined) { updates.push(`status=$${params.length + 1}`); params.push(status) }
  if (name !== undefined) { updates.push(`name=$${params.length + 1}`); params.push(name) }
  if (phone !== undefined) { updates.push(`phone=$${params.length + 1}`); params.push(phone) }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })
  updates.push(`updated_at=NOW()`)
  params.push(req.params.id)
  try {
    const result = await pool.query(
      `UPDATE wavult.zoomers SET ${updates.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zoomer not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

export default router
