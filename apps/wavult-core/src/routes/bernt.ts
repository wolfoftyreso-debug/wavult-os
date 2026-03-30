/**
 * Bernt / OpenClaw Integration Route
 *
 * wavult-core är backend-hem för alla Bernt-funktioner.
 * OpenClaw anropar dessa endpoints — ALDRIG externa AI-API:er direkt.
 *
 * Endpoints:
 *   POST /v1/bernt/event       — inkommande händelse från OpenClaw (webhook)
 *   POST /v1/bernt/message     — skicka meddelande till Bernt (intern trigger)
 *   GET  /v1/bernt/status      — systemstatus som Bernt kan hämta
 *   POST /v1/bernt/memory      — spara minne/kontext från Bernt
 *   GET  /v1/bernt/memory      — hämta minnen för given kategori
 *   POST /v1/bernt/alert       — Bernt triggar alert i systemet
 */

import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { v4 as uuid } from 'uuid'

const router = Router()

// Internal service auth — Bernt använder INTERNAL_SERVICE_SECRET, inte user JWT
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || ''
const OPENCLAW_WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || ''

function requireInternalAuth(req: Request, res: Response, next: () => void): void {
  const secret = req.headers['x-internal-secret'] || req.headers['x-openclaw-secret']
  if (!secret) { res.status(401).json({ error: 'MISSING_INTERNAL_SECRET' }); return }
  // Accept either internal service secret or dedicated OpenClaw webhook secret
  const valid = [INTERNAL_SECRET, OPENCLAW_WEBHOOK_SECRET].filter(Boolean).includes(secret as string)
  if (!valid) { res.status(401).json({ error: 'INVALID_SECRET' }); return }
  next()
}

const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE || 'wavult_identity',
  user: process.env.RDS_USER || 'wavult_admin',
  password: process.env.RDS_PASSWORD || '',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
})

// Auto-create tables if needed
async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wavult.bernt_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      source TEXT DEFAULT 'bernt',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bernt_memory_category ON wavult.bernt_memory(category);

    CREATE TABLE IF NOT EXISTS wavult.bernt_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      source TEXT DEFAULT 'openclaw',
      processed BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bernt_events_type ON wavult.bernt_events(event_type, processed);
  `)
}

// Init schema on first request
let schemaReady = false
async function withSchema(fn: () => Promise<void>): Promise<void> {
  if (!schemaReady) { await ensureSchema(); schemaReady = true }
  await fn()
}

// ── POST /v1/bernt/event — inkommande event från OpenClaw ─────────────────────
router.post('/event', requireInternalAuth, async (req: Request, res: Response) => {
  const { event_type, payload, source = 'openclaw' } = req.body
  if (!event_type) return res.status(400).json({ error: 'event_type required' })

  try {
    await withSchema(async () => {
      await pool.query(
        `INSERT INTO wavult.bernt_events (event_type, payload, source) VALUES ($1, $2, $3)`,
        [event_type, JSON.stringify(payload || {}), source]
      )
    })

    // Route event to appropriate handler
    let handled = false
    if (event_type === 'system.alert') {
      // Forward to alert system
      console.log('[Bernt] System alert received:', payload)
      handled = true
    } else if (event_type === 'task.completed') {
      console.log('[Bernt] Task completed:', payload)
      handled = true
    } else if (event_type === 'payment.failed') {
      console.error('[Bernt] Payment failure alert:', payload)
      handled = true
    }

    return res.json({ received: true, event_type, handled, timestamp: new Date().toISOString() })
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── GET /v1/bernt/status — systemstatus för Bernt ────────────────────────────
router.get('/status', requireInternalAuth, async (_req: Request, res: Response) => {
  try {
    let dbOk = false
    let pendingEvents = 0
    let memoryCount = 0

    try {
      await pool.query('SELECT 1')
      dbOk = true
      const [eventsRes, memRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM wavult.bernt_events WHERE processed=false`).catch(() => ({ rows: [{ count: 0 }] })),
        pool.query(`SELECT COUNT(*) FROM wavult.bernt_memory`).catch(() => ({ rows: [{ count: 0 }] })),
      ])
      pendingEvents = Number(eventsRes.rows[0].count)
      memoryCount = Number(memRes.rows[0].count)
    } catch { /* db not ready */ }

    return res.json({
      service: 'wavult-core',
      version: '2.0.0',
      db: dbOk ? 'connected' : 'disconnected',
      bernt: {
        pending_events: pendingEvents,
        memory_entries: memoryCount,
        last_check: new Date().toISOString(),
      },
      services: {
        identity_core: process.env.IDENTITY_CORE_URL ? 'configured' : 'not_configured',
        revolut: process.env.REVOLUT_REFRESH_TOKEN ? 'connected' : 'not_connected',
        s3: process.env.S3_BUCKET ? 'configured' : 'not_configured',
      },
      env: process.env.NODE_ENV || 'development',
      uptime_seconds: Math.floor(process.uptime()),
    })
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── POST /v1/bernt/memory — spara minne ──────────────────────────────────────
router.post('/memory', requireInternalAuth, async (req: Request, res: Response) => {
  const { category, content, metadata } = req.body
  if (!category || !content) return res.status(400).json({ error: 'category and content required' })

  try {
    await withSchema(async () => {
      await pool.query(
        `INSERT INTO wavult.bernt_memory (category, content, metadata)
         VALUES ($1, $2, $3)`,
        [category, content, JSON.stringify(metadata || {})]
      )
    })
    return res.status(201).json({ saved: true, category, timestamp: new Date().toISOString() })
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── GET /v1/bernt/memory — hämta minnen ──────────────────────────────────────
router.get('/memory', requireInternalAuth, async (req: Request, res: Response) => {
  const { category, limit = '50' } = req.query
  try {
    await withSchema(async () => {})
    const params: unknown[] = []
    let query = `SELECT * FROM wavult.bernt_memory WHERE 1=1`
    if (category) { query += ` AND category = $${params.length + 1}`; params.push(category) }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(Number(limit))
    const result = await pool.query(query, params)
    return res.json({ data: result.rows, total: result.rows.length })
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// ── POST /v1/bernt/alert — Bernt skapar en systemalert ───────────────────────
router.post('/alert', requireInternalAuth, async (req: Request, res: Response) => {
  const { severity, message, service, metadata } = req.body
  if (!severity || !message) return res.status(400).json({ error: 'severity and message required' })

  const validSeverity = ['info', 'warning', 'critical']
  if (!validSeverity.includes(severity)) return res.status(400).json({ error: 'Invalid severity. Use: info, warning, critical' })

  try {
    await withSchema(async () => {
      await pool.query(
        `INSERT INTO wavult.bernt_events (event_type, payload, source) VALUES ($1, $2, 'bernt')`,
        ['bernt.alert', JSON.stringify({ severity, message, service: service || 'unknown', metadata: metadata || {} })]
      )
    })

    console.log(`[Bernt Alert] [${severity.toUpperCase()}] ${service || 'system'}: ${message}`)
    return res.status(201).json({ alert_id: uuid(), severity, message, created_at: new Date().toISOString() })
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
