// ─── UAPIX Customer Backend ───────────────────────────────────────────────────
// Routes: register, login, dashboard, keys, usage, authenticated proxy, admin

import { Router } from 'express'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import crypto from 'crypto'

const router = Router()
const getDb = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
})

// ─── Schema ───────────────────────────────────────────────────────────────────
async function ensureUapixSchema() {
  const db = getDb()
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS uapix_customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        name text,
        plan text DEFAULT 'free',
        status text DEFAULT 'active',
        calls_this_month integer DEFAULT 0,
        calls_limit integer DEFAULT 1000,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS uapix_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid REFERENCES uapix_customers(id) ON DELETE CASCADE,
        name text NOT NULL DEFAULT 'Default',
        key_hash text NOT NULL,
        key_prefix text NOT NULL,
        is_active boolean DEFAULT true,
        last_used_at timestamptz,
        calls_total integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS uapix_call_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid REFERENCES uapix_customers(id),
        api_key_id uuid REFERENCES uapix_api_keys(id),
        api_id text NOT NULL,
        endpoint_id text NOT NULL,
        http_status integer,
        latency_ms integer,
        cost_usd numeric(10,8) DEFAULT 0,
        cached boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_uapix_keys_customer ON uapix_api_keys(customer_id);
      CREATE INDEX IF NOT EXISTS idx_uapix_log_customer ON uapix_call_log(customer_id);
      CREATE INDEX IF NOT EXISTS idx_uapix_log_created ON uapix_call_log(created_at);
    `)
    console.log('[uapix] Schema OK')
  } catch (e: any) {
    console.error('[uapix] Schema error:', e.message)
  } finally {
    await db.end()
  }
}
ensureUapixSchema()

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getCustomer(req: any): { id: string; email: string } | null {
  const token =
    req.headers['x-uapix-token'] ||
    req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  try {
    return JSON.parse(Buffer.from(token as string, 'base64').toString())
  } catch {
    return null
  }
}

// ─── POST /v1/uapix/customers/register ───────────────────────────────────────
router.post('/v1/uapix/customers/register', async (req, res) => {
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const db = getDb()
  try {
    const { rows: [cust] } = await db.query(
      `INSERT INTO uapix_customers (email, name, plan, calls_limit)
       VALUES ($1, $2, 'free', 1000)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name, plan, status, calls_this_month, calls_limit, created_at`,
      [email.toLowerCase().trim(), name || null]
    )
    const token = Buffer.from(JSON.stringify({ id: cust.id, email: cust.email })).toString('base64')
    res.json({ success: true, token, customer: cust })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── POST /v1/uapix/customers/login ──────────────────────────────────────────
router.post('/v1/uapix/customers/login', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const db = getDb()
  try {
    const { rows: [cust] } = await db.query(
      'SELECT id, email, name, plan, status FROM uapix_customers WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (!cust) return res.status(404).json({ error: 'Not found — register first' })
    const token = Buffer.from(JSON.stringify({ id: cust.id, email: cust.email })).toString('base64')
    res.json({ success: true, token, customer: cust })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── GET /v1/uapix/customers/me/dashboard ────────────────────────────────────
router.get('/v1/uapix/customers/me/dashboard', async (req, res) => {
  const cust = getCustomer(req)
  if (!cust) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    const { rows: [customer] } = await db.query(
      'SELECT * FROM uapix_customers WHERE id = $1', [cust.id]
    )
    const { rows: keys } = await db.query(
      `SELECT id, name, key_prefix, is_active, last_used_at, calls_total, created_at
       FROM uapix_api_keys WHERE customer_id = $1 ORDER BY created_at DESC`,
      [cust.id]
    )
    const { rows: topApis } = await db.query(
      `SELECT api_id,
              COUNT(*) as calls,
              AVG(latency_ms) as avg_latency,
              SUM(cost_usd) as total_cost
       FROM uapix_call_log
       WHERE customer_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY api_id ORDER BY calls DESC LIMIT 10`,
      [cust.id]
    )
    const { rows: [totals] } = await db.query(
      `SELECT COUNT(*) as total_calls,
              SUM(cost_usd) as total_cost,
              AVG(latency_ms) as avg_latency
       FROM uapix_call_log
       WHERE customer_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [cust.id]
    )
    res.json({ customer, keys, top_apis: topApis, totals })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── POST /v1/uapix/customers/me/keys ────────────────────────────────────────
router.post('/v1/uapix/customers/me/keys', async (req, res) => {
  const cust = getCustomer(req)
  if (!cust) return res.status(401).json({ error: 'Unauthorized' })
  const { name = 'Default' } = req.body
  const db = getDb()
  try {
    const raw = `uapix_${randomUUID().replace(/-/g, '')}`
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    const prefix = raw.slice(0, 13) + '****'
    const { rows: [key] } = await db.query(
      `INSERT INTO uapix_api_keys (customer_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key_prefix, is_active, created_at`,
      [cust.id, name, hash, prefix]
    )
    res.json({ ...key, key: raw, note: 'Save this key — shown only once' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── DELETE /v1/uapix/customers/me/keys/:id ──────────────────────────────────
router.delete('/v1/uapix/customers/me/keys/:id', async (req, res) => {
  const cust = getCustomer(req)
  if (!cust) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    await db.query(
      'UPDATE uapix_api_keys SET is_active = false WHERE id = $1 AND customer_id = $2',
      [req.params.id, cust.id]
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── GET /v1/uapix/customers/me/usage ────────────────────────────────────────
router.get('/v1/uapix/customers/me/usage', async (req, res) => {
  const cust = getCustomer(req)
  if (!cust) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    const { rows } = await db.query(
      `SELECT api_id, endpoint_id, http_status, latency_ms, cost_usd, cached, created_at
       FROM uapix_call_log
       WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [cust.id]
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── POST /v1/uapix/call — authenticated API proxy ───────────────────────────
router.post('/v1/uapix/call', async (req, res) => {
  const keyHeader = req.headers['x-uapix-key'] as string
  if (!keyHeader) return res.status(401).json({ error: 'X-UAPIX-Key header required' })

  const db = getDb()
  let customerId: string | null = null
  let keyId: string | null = null

  try {
    const hash = crypto.createHash('sha256').update(keyHeader).digest('hex')
    const { rows: [keyRow] } = await db.query(
      `SELECT k.id, k.customer_id, c.plan, c.calls_this_month, c.calls_limit, c.status
       FROM uapix_api_keys k
       JOIN uapix_customers c ON c.id = k.customer_id
       WHERE k.key_hash = $1 AND k.is_active = true`,
      [hash]
    )

    if (!keyRow) return res.status(401).json({ error: 'Invalid API key' })
    if (keyRow.status !== 'active') return res.status(403).json({ error: 'Account suspended' })
    if (keyRow.calls_this_month >= keyRow.calls_limit) {
      return res.status(429).json({
        error: 'Monthly limit exceeded',
        plan: keyRow.plan,
        limit: keyRow.calls_limit,
        upgrade_url: 'https://uapix.com/pricing'
      })
    }

    customerId = keyRow.customer_id
    keyId = keyRow.id

    const { api_id, endpoint_id, params, query, body, headers } = req.body
    if (!api_id || !endpoint_id) {
      return res.status(400).json({ error: 'api_id and endpoint_id required' })
    }

    const start = Date.now()
    // Route to internal UAPIX router (same process, different path)
    const internalUrl = `${process.env.API_CORE_URL || 'http://localhost:3007'}/v1/uapix/internal/call`
    const r = await fetch(internalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-UAPIX-Internal': process.env.UAPIX_INTERNAL_SECRET || 'internal',
      },
      body: JSON.stringify({ api_id, endpoint_id, params, query, body, headers }),
    })
    const data = await r.json() as any
    const latency = Date.now() - start

    // Log + counters
    await db.query(
      `INSERT INTO uapix_call_log (customer_id, api_key_id, api_id, endpoint_id, http_status, latency_ms, cost_usd, cached)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [customerId, keyId, api_id, endpoint_id, r.status, latency, data.cost_usd || 0, data.cached || false]
    )
    await db.query(
      'UPDATE uapix_customers SET calls_this_month = calls_this_month + 1 WHERE id = $1',
      [customerId]
    )
    await db.query(
      'UPDATE uapix_api_keys SET last_used_at = NOW(), calls_total = calls_total + 1 WHERE id = $1',
      [keyId]
    )

    res.status(r.status).json({ ...data, _uapix: { latency_ms: latency, api_id, endpoint_id } })
  } catch (err: any) {
    if (customerId && keyId) {
      await db.query(
        `INSERT INTO uapix_call_log (customer_id, api_key_id, api_id, endpoint_id, http_status, latency_ms)
         VALUES ($1, $2, $3, $4, 500, 0)`,
        [customerId, keyId, req.body?.api_id || '?', req.body?.endpoint_id || '?']
      ).catch(() => {})
    }
    res.status(503).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── GET /v1/uapix/apis ───────────────────────────────────────────────────────
router.get('/v1/uapix/apis', async (_req, res) => {
  // Returns all registered provider IDs/metadata
  // Reads from the existing ai-api and agents route registrations
  const apis = [
    { id: 'openai', name: 'OpenAI', category: 'AI', description: 'GPT-4o, o1, embeddings, DALL-E 3', rate_limit: '60/min', cost_per_call: 0.002 },
    { id: 'anthropic', name: 'Anthropic Claude', category: 'AI', description: 'Claude Sonnet, Haiku, Opus', rate_limit: '60/min', cost_per_call: 0.003 },
    { id: 'deepseek', name: 'DeepSeek', category: 'AI', description: 'V3 + R1 reasoning, ultra-cheap', rate_limit: '60/min', cost_per_call: 0.00027 },
    { id: 'perplexity', name: 'Perplexity', category: 'Search', description: 'AI-powered web search', rate_limit: '30/min', cost_per_call: 0.001 },
    { id: 'wavult-agents', name: 'Wavult AI Agent Mesh', category: 'Agents', description: '10 expert agents + 5 JR twins', rate_limit: '30/min', cost_per_call: 0.003 },
    { id: 'groq', name: 'Groq', category: 'AI', description: 'Ultra-fast LLM inference', rate_limit: '100/min', cost_per_call: 0.0001 },
    { id: 'mistral', name: 'Mistral AI', category: 'AI', description: 'European AI models', rate_limit: '60/min', cost_per_call: 0.0002 },
    { id: 'stability', name: 'Stability AI', category: 'Image', description: 'SDXL image generation', rate_limit: '20/min', cost_per_call: 0.004 },
    { id: 'runway', name: 'Runway Gen-3', category: 'Video', description: 'AI video generation', rate_limit: '5/min', cost_per_call: 0.05 },
    { id: 'elevenlabs', name: 'ElevenLabs', category: 'Voice', description: 'Neural TTS + voice cloning', rate_limit: '30/min', cost_per_call: 0.001 },
    { id: 'pinecone', name: 'Pinecone', category: 'Vector', description: 'Vector database', rate_limit: '60/min', cost_per_call: 0.0001 },
    { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics', description: 'Product analytics', rate_limit: '60/min', cost_per_call: 0.0002 },
    { id: 'apollo', name: 'Apollo', category: 'Data', description: 'B2B contacts & enrichment', rate_limit: '20/min', cost_per_call: 0.002 },
    { id: 'scrive', name: 'Scrive', category: 'Legal', description: 'E-signatures & contracts', rate_limit: '10/min', cost_per_call: 0.01 },
    { id: 'pexels', name: 'Pexels', category: 'Media', description: 'Stock photos and videos', rate_limit: '200/hour', cost_per_call: 0 },
  ]
  res.json(apis)
})

// ─── GET /v1/uapix/admin/stats ────────────────────────────────────────────────
router.get('/v1/uapix/admin/stats', async (_req, res) => {
  const db = getDb()
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM uapix_customers)                                          AS total_customers,
        (SELECT COUNT(*) FROM uapix_customers WHERE plan = 'pro')                       AS pro_customers,
        (SELECT COUNT(*) FROM uapix_customers WHERE plan = 'enterprise')                AS enterprise_customers,
        (SELECT COUNT(*) FROM uapix_api_keys WHERE is_active = true)                   AS active_keys,
        (SELECT COUNT(*) FROM uapix_call_log WHERE created_at > NOW()-INTERVAL '24h') AS calls_24h,
        (SELECT COUNT(*) FROM uapix_call_log WHERE created_at > NOW()-INTERVAL '30 days') AS calls_30d,
        (SELECT COALESCE(SUM(cost_usd),0) FROM uapix_call_log WHERE created_at > NOW()-INTERVAL '30 days') AS cost_30d
    `)
    res.json(stats)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── GET /v1/uapix/admin/customers ────────────────────────────────────────────
router.get('/v1/uapix/admin/customers', async (_req, res) => {
  const db = getDb()
  try {
    const { rows } = await db.query(`
      SELECT c.id, c.email, c.name, c.plan, c.status,
             c.calls_this_month, c.calls_limit, c.created_at,
             COUNT(k.id) FILTER (WHERE k.is_active) AS active_keys,
             COALESCE(SUM(l.cost_usd), 0) AS total_cost_30d
      FROM uapix_customers c
      LEFT JOIN uapix_api_keys k ON k.customer_id = c.id
      LEFT JOIN uapix_call_log l ON l.customer_id = c.id AND l.created_at > NOW()-INTERVAL '30 days'
      GROUP BY c.id ORDER BY c.created_at DESC LIMIT 200
    `)
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

export default router
