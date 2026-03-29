import express from 'express'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(express.json())

const PORT = parseInt(process.env.PORT || '3006')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://lpeipzdmnnlbcoxlfhoe.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.LANDVEX_SUPABASE_SERVICE_KEY || ''
)

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'landvex-api',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// ── OBJECTS ──────────────────────────────────────────────────────────────────

// GET /v1/objects — list infrastructure objects
app.get('/v1/objects', async (req, res) => {
  const { municipality, type, status, client_id, limit = '100', offset = '0' } = req.query
  let query = supabase
    .from('landvex_objects')
    .select('*, landvex_clients(name, type)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)
  if (municipality) query = query.eq('municipality', municipality as string)
  if (type) query = query.eq('type', type as string)
  if (status) query = query.eq('status', status as string)
  if (client_id) query = query.eq('client_id', client_id as string)
  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ data, total: count, limit: Number(limit), offset: Number(offset) })
})

// GET /v1/objects/:id
app.get('/v1/objects/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('landvex_objects')
    .select('*, landvex_clients(name, type), landvex_alerts(*)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'Object not found' })
  return res.json(data)
})

// POST /v1/objects — create infrastructure object
app.post('/v1/objects', async (req, res) => {
  const { name, type, municipality, lat, lng, status, client_id, metadata } = req.body
  if (!name || !type || !municipality) {
    return res.status(400).json({ error: 'name, type, and municipality required' })
  }
  const { data, error } = await supabase
    .from('landvex_objects')
    .insert({
      name,
      type,
      municipality,
      lat,
      lng,
      status: status || 'ok',
      client_id,
      metadata: metadata || {},
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// PATCH /v1/objects/:id
app.patch('/v1/objects/:id', async (req, res) => {
  const { name, type, municipality, lat, lng, status, client_id, metadata, last_inspected } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (type !== undefined) updates.type = type
  if (municipality !== undefined) updates.municipality = municipality
  if (lat !== undefined) updates.lat = lat
  if (lng !== undefined) updates.lng = lng
  if (status !== undefined) updates.status = status
  if (client_id !== undefined) updates.client_id = client_id
  if (metadata !== undefined) updates.metadata = metadata
  if (last_inspected !== undefined) {
    updates.last_inspected = last_inspected
    updates.inspection_count = supabase.rpc as unknown // handled below
  }
  // Increment inspection_count if marking as inspected
  if (last_inspected !== undefined) {
    await supabase.rpc('increment_inspection_count', { object_id: req.params.id })
    delete updates.inspection_count
    updates.last_inspected = last_inspected
  }
  const { data, error } = await supabase
    .from('landvex_objects')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// ── ALERTS ───────────────────────────────────────────────────────────────────

// GET /v1/alerts — list alerts (active by default)
app.get('/v1/alerts', async (req, res) => {
  const { object_id, severity, resolved = 'false', acknowledged, limit = '100' } = req.query
  let query = supabase
    .from('landvex_alerts')
    .select('*, landvex_objects(name, municipality, type)')
    .order('created_at', { ascending: false })
    .limit(Number(limit))
  if (resolved !== undefined) query = query.eq('resolved', resolved === 'true')
  if (object_id) query = query.eq('object_id', object_id as string)
  if (severity) query = query.eq('severity', severity as string)
  if (acknowledged !== undefined) query = query.eq('acknowledged', acknowledged === 'true')
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ data, total: data?.length || 0 })
})

// POST /v1/alerts — create alert
app.post('/v1/alerts', async (req, res) => {
  const { object_id, severity, message, source } = req.body
  if (!severity || !message) {
    return res.status(400).json({ error: 'severity and message required' })
  }
  const { data, error } = await supabase
    .from('landvex_alerts')
    .insert({
      object_id,
      severity,
      message,
      source: source || 'system',
      acknowledged: false,
      resolved: false,
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  // If alert for an object, update object status
  if (object_id && severity !== 'info') {
    const newStatus = severity === 'critical' ? 'critical' : 'alert'
    await supabase
      .from('landvex_objects')
      .update({ status: newStatus })
      .eq('id', object_id)
      .in('status', ['ok', 'monitoring'])
  }

  return res.status(201).json(data)
})

// POST /v1/alerts/:id/acknowledge
app.post('/v1/alerts/:id/acknowledge', async (req, res) => {
  const { data, error } = await supabase
    .from('landvex_alerts')
    .update({ acknowledged: true })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// POST /v1/alerts/:id/resolve
app.post('/v1/alerts/:id/resolve', async (req, res) => {
  const { data, error } = await supabase
    .from('landvex_alerts')
    .update({ resolved: true, acknowledged: true })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// ── CLIENTS ───────────────────────────────────────────────────────────────────

// GET /v1/clients — list clients
app.get('/v1/clients', async (req, res) => {
  const { type, status = 'active', limit = '100' } = req.query
  let query = supabase
    .from('landvex_clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Number(limit))
  if (type) query = query.eq('type', type as string)
  if (status) query = query.eq('status', status as string)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /v1/clients/:id
app.get('/v1/clients/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('landvex_clients')
    .select('*, landvex_objects(*)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'Client not found' })
  return res.json(data)
})

// POST /v1/clients — create client
app.post('/v1/clients', async (req, res) => {
  const { name, org_nr, type, contact_email, contact_phone, contract_start, contract_end } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const { data, error } = await supabase
    .from('landvex_clients')
    .insert({
      name,
      org_nr,
      type: type || 'municipality',
      contact_email,
      contact_phone,
      contract_start,
      contract_end,
      status: 'active',
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// PATCH /v1/clients/:id
app.patch('/v1/clients/:id', async (req, res) => {
  const { name, org_nr, type, contact_email, contact_phone, contract_start, contract_end, status } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (org_nr !== undefined) updates.org_nr = org_nr
  if (type !== undefined) updates.type = type
  if (contact_email !== undefined) updates.contact_email = contact_email
  if (contact_phone !== undefined) updates.contact_phone = contact_phone
  if (contract_start !== undefined) updates.contract_start = contract_start
  if (contract_end !== undefined) updates.contract_end = contract_end
  if (status !== undefined) updates.status = status
  const { data, error } = await supabase
    .from('landvex_clients')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// ── STATS ─────────────────────────────────────────────────────────────────────

// GET /v1/stats — overview stats for dashboard
app.get('/v1/stats', async (_req, res) => {
  const [objectsRes, alertsRes, clientsRes] = await Promise.all([
    supabase.from('landvex_objects').select('status', { count: 'exact', head: false }),
    supabase.from('landvex_alerts').select('severity', { count: 'exact', head: false }).eq('resolved', false),
    supabase.from('landvex_clients').select('id', { count: 'exact', head: true }),
  ])

  const objectsByStatus: Record<string, number> = {}
  for (const obj of objectsRes.data || []) {
    objectsByStatus[obj.status] = (objectsByStatus[obj.status] || 0) + 1
  }

  const alertsBySeverity: Record<string, number> = {}
  for (const alert of alertsRes.data || []) {
    alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1
  }

  return res.json({
    objects: {
      total: objectsRes.count || 0,
      by_status: objectsByStatus,
    },
    alerts: {
      active: alertsRes.count || 0,
      by_severity: alertsBySeverity,
    },
    clients: {
      total: clientsRes.count || 0,
    },
  })
})

// Webhook contract (for BOS scheduler integration)
app.post('/v1/webhooks/bos', (req, res) => {
  const { jobId, type, payload } = req.body
  console.log(`[BOS Webhook] ${type}`, { jobId, payload })
  res.json({ jobId, status: 'SUCCESS', processedAt: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[Landvex API] Listening on port ${PORT}`)
  console.log(`[Landvex API] Supabase: ${process.env.SUPABASE_URL || 'https://lpeipzdmnnlbcoxlfhoe.supabase.co'}`)
  console.log(`[Landvex API] Environment: ${process.env.NODE_ENV || 'development'}`)
})
