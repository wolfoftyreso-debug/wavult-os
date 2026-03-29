import express from 'express'
import { Pool } from 'pg'

const app = express()
app.use(express.json())

const PORT = parseInt(process.env.PORT || '3006')

const pool = new Pool({
  host: process.env.RDS_HOST || 'wavult-identity-ecs.cvi0qcksmsfj.eu-north-1.rds.amazonaws.com',
  port: 5432,
  database: process.env.RDS_DATABASE || 'wavult_identity',
  user: process.env.RDS_USER || 'wavult_admin',
  password: process.env.RDS_PASSWORD || '',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[Landvex] DB pool error:', err)
})

// Health check
app.get('/health', async (_req, res) => {
  let dbOk = false
  try { await pool.query('SELECT 1'); dbOk = true } catch {}
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'landvex-api',
    version: '3.0.0',
    db: dbOk ? 'rds' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// ── OBJECTS ──────────────────────────────────────────────────────────────────

// GET /v1/objects — list infrastructure objects
app.get('/v1/objects', async (req, res) => {
  const { municipality, type, status, client_id, limit = '100', offset = '0' } = req.query
  const params: unknown[] = []
  let query = `
    SELECT o.*, c.name as client_name, c.type as client_type
    FROM wavult.landvex_objects o
    LEFT JOIN wavult.landvex_clients c ON c.id = o.client_id
    WHERE 1=1`
  if (municipality) { query += ` AND o.municipality = $${params.length + 1}`; params.push(municipality) }
  if (type) { query += ` AND o.type = $${params.length + 1}`; params.push(type) }
  if (status) { query += ` AND o.status = $${params.length + 1}`; params.push(status) }
  if (client_id) { query += ` AND o.client_id = $${params.length + 1}`; params.push(client_id) }
  query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  params.push(Number(limit), Number(offset))
  try {
    const result = await pool.query(query, params)
    const countResult = await pool.query(`SELECT COUNT(*) FROM wavult.landvex_objects WHERE 1=1`, [])
    return res.json({ data: result.rows, total: Number(countResult.rows[0].count), limit: Number(limit), offset: Number(offset) })
  } catch (err) {
    console.error('[landvex] GET /v1/objects error:', err)
    return res.status(500).json({ error: String(err) })
  }
})

// GET /v1/objects/:id
app.get('/v1/objects/:id', async (req, res) => {
  try {
    const [objRes, alertsRes] = await Promise.all([
      pool.query(`SELECT o.*, c.name as client_name, c.type as client_type FROM wavult.landvex_objects o LEFT JOIN wavult.landvex_clients c ON c.id = o.client_id WHERE o.id = $1`, [req.params.id]),
      pool.query(`SELECT * FROM wavult.landvex_alerts WHERE object_id = $1 ORDER BY created_at DESC LIMIT 20`, [req.params.id]),
    ])
    if (objRes.rows.length === 0) return res.status(404).json({ error: 'Object not found' })
    return res.json({ ...objRes.rows[0], alerts: alertsRes.rows })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/objects — create infrastructure object
app.post('/v1/objects', async (req, res) => {
  const { name, type, municipality, lat, lng, status, client_id, metadata } = req.body
  if (!name || !type || !municipality) {
    return res.status(400).json({ error: 'name, type, and municipality required' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO wavult.landvex_objects (name, type, municipality, lat, lng, status, client_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, type, municipality, lat || null, lng || null,
       status || 'ok', client_id || null, metadata ? JSON.stringify(metadata) : '{}']
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// PATCH /v1/objects/:id
app.patch('/v1/objects/:id', async (req, res) => {
  const { name, type, municipality, lat, lng, status, client_id, metadata, last_inspected } = req.body
  const updates: string[] = []
  const params: unknown[] = []
  if (name !== undefined) { updates.push(`name=$${params.length + 1}`); params.push(name) }
  if (type !== undefined) { updates.push(`type=$${params.length + 1}`); params.push(type) }
  if (municipality !== undefined) { updates.push(`municipality=$${params.length + 1}`); params.push(municipality) }
  if (lat !== undefined) { updates.push(`lat=$${params.length + 1}`); params.push(lat) }
  if (lng !== undefined) { updates.push(`lng=$${params.length + 1}`); params.push(lng) }
  if (status !== undefined) { updates.push(`status=$${params.length + 1}`); params.push(status) }
  if (client_id !== undefined) { updates.push(`client_id=$${params.length + 1}`); params.push(client_id) }
  if (metadata !== undefined) { updates.push(`metadata=$${params.length + 1}`); params.push(JSON.stringify(metadata)) }
  if (last_inspected !== undefined) {
    updates.push(`last_inspected=$${params.length + 1}`)
    params.push(last_inspected)
    updates.push(`inspection_count=inspection_count+1`)
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })
  params.push(req.params.id)
  try {
    const result = await pool.query(
      `UPDATE wavult.landvex_objects SET ${updates.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Object not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

// ── ALERTS ───────────────────────────────────────────────────────────────────

// GET /v1/alerts — list alerts
app.get('/v1/alerts', async (req, res) => {
  const { object_id, severity, resolved = 'false', acknowledged, limit = '100' } = req.query
  const params: unknown[] = []
  let query = `
    SELECT a.*, o.name as object_name, o.municipality, o.type as object_type
    FROM wavult.landvex_alerts a
    LEFT JOIN wavult.landvex_objects o ON o.id = a.object_id
    WHERE 1=1`
  if (resolved !== undefined) { query += ` AND a.resolved = $${params.length + 1}`; params.push(resolved === 'true') }
  if (object_id) { query += ` AND a.object_id = $${params.length + 1}`; params.push(object_id) }
  if (severity) { query += ` AND a.severity = $${params.length + 1}`; params.push(severity) }
  if (acknowledged !== undefined) { query += ` AND a.acknowledged = $${params.length + 1}`; params.push(acknowledged === 'true') }
  query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`
  params.push(Number(limit))
  try {
    const result = await pool.query(query, params)
    return res.json({ data: result.rows, total: result.rows.length })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/alerts — create alert
app.post('/v1/alerts', async (req, res) => {
  const { object_id, severity, message, source } = req.body
  if (!severity || !message) {
    return res.status(400).json({ error: 'severity and message required' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO wavult.landvex_alerts (object_id, severity, message, source, acknowledged, resolved)
       VALUES ($1, $2, $3, $4, false, false) RETURNING *`,
      [object_id || null, severity, message, source || 'system']
    )
    // Update object status if relevant
    if (object_id && severity !== 'info') {
      const newStatus = severity === 'critical' ? 'critical' : 'alert'
      await pool.query(
        `UPDATE wavult.landvex_objects SET status=$1 WHERE id=$2 AND status IN ('ok','monitoring')`,
        [newStatus, object_id]
      )
    }
    return res.status(201).json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/alerts/:id/acknowledge
app.post('/v1/alerts/:id/acknowledge', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE wavult.landvex_alerts SET acknowledged=true WHERE id=$1 RETURNING *`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

// POST /v1/alerts/:id/resolve
app.post('/v1/alerts/:id/resolve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE wavult.landvex_alerts SET resolved=true, acknowledged=true WHERE id=$1 RETURNING *`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

// ── CLIENTS ───────────────────────────────────────────────────────────────────

// GET /v1/clients — list clients
app.get('/v1/clients', async (req, res) => {
  const { type, status = 'active', limit = '100' } = req.query
  const params: unknown[] = []
  let query = `SELECT * FROM wavult.landvex_clients WHERE 1=1`
  if (type) { query += ` AND type = $${params.length + 1}`; params.push(type) }
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

// GET /v1/clients/:id
app.get('/v1/clients/:id', async (req, res) => {
  try {
    const [clientRes, objsRes] = await Promise.all([
      pool.query(`SELECT * FROM wavult.landvex_clients WHERE id=$1`, [req.params.id]),
      pool.query(`SELECT * FROM wavult.landvex_objects WHERE client_id=$1 ORDER BY created_at DESC`, [req.params.id]),
    ])
    if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Client not found' })
    return res.json({ ...clientRes.rows[0], objects: objsRes.rows })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// POST /v1/clients — create client
app.post('/v1/clients', async (req, res) => {
  const { name, org_nr, type, contact_email, contact_phone, contract_start, contract_end } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const result = await pool.query(
      `INSERT INTO wavult.landvex_clients (name, org_nr, type, contact_email, contact_phone, contract_start, contract_end, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING *`,
      [name, org_nr || null, type || 'municipality', contact_email || null,
       contact_phone || null, contract_start || null, contract_end || null]
    )
    return res.status(201).json(result.rows[0])
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// PATCH /v1/clients/:id
app.patch('/v1/clients/:id', async (req, res) => {
  const { name, org_nr, type, contact_email, contact_phone, contract_start, contract_end, status } = req.body
  const updates: string[] = []
  const params: unknown[] = []
  if (name !== undefined) { updates.push(`name=$${params.length + 1}`); params.push(name) }
  if (org_nr !== undefined) { updates.push(`org_nr=$${params.length + 1}`); params.push(org_nr) }
  if (type !== undefined) { updates.push(`type=$${params.length + 1}`); params.push(type) }
  if (contact_email !== undefined) { updates.push(`contact_email=$${params.length + 1}`); params.push(contact_email) }
  if (contact_phone !== undefined) { updates.push(`contact_phone=$${params.length + 1}`); params.push(contact_phone) }
  if (contract_start !== undefined) { updates.push(`contract_start=$${params.length + 1}`); params.push(contract_start) }
  if (contract_end !== undefined) { updates.push(`contract_end=$${params.length + 1}`); params.push(contract_end) }
  if (status !== undefined) { updates.push(`status=$${params.length + 1}`); params.push(status) }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })
  params.push(req.params.id)
  try {
    const result = await pool.query(
      `UPDATE wavult.landvex_clients SET ${updates.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' })
    return res.json(result.rows[0])
  } catch (err) {
    return res.status(400).json({ error: String(err) })
  }
})

// ── STATS ─────────────────────────────────────────────────────────────────────

// GET /v1/stats — overview stats for dashboard
app.get('/v1/stats', async (_req, res) => {
  try {
    const [objectsRes, alertsRes, clientsRes] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as cnt FROM wavult.landvex_objects GROUP BY status`),
      pool.query(`SELECT severity, COUNT(*) as cnt FROM wavult.landvex_alerts WHERE resolved=false GROUP BY severity`),
      pool.query(`SELECT COUNT(*) as cnt FROM wavult.landvex_clients`),
    ])
    const objectsByStatus: Record<string, number> = {}
    for (const row of objectsRes.rows) objectsByStatus[row.status] = Number(row.cnt)
    const alertsBySeverity: Record<string, number> = {}
    for (const row of alertsRes.rows) alertsBySeverity[row.severity] = Number(row.cnt)
    return res.json({
      objects: { total: Object.values(objectsByStatus).reduce((a, b) => a + b, 0), by_status: objectsByStatus },
      alerts: { active: Object.values(alertsBySeverity).reduce((a, b) => a + b, 0), by_severity: alertsBySeverity },
      clients: { total: Number(clientsRes.rows[0].cnt) },
    })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// Webhook contract (for BOS scheduler integration)
app.post('/v1/webhooks/bos', (req, res) => {
  const { jobId, type, payload } = req.body
  console.log(`[BOS Webhook] ${type}`, { jobId, payload })
  res.json({ jobId, status: 'SUCCESS', processedAt: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[Landvex API] Listening on port ${PORT}`)
  console.log(`[Landvex API] DB: RDS PostgreSQL (wavult schema)`)
  console.log(`[Landvex API] Environment: ${process.env.NODE_ENV || 'development'}`)
})
