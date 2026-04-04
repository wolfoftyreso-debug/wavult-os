// ─── Apifly Backend — Kundbackend + Universal API Proxy ──────────────────────
// Endpoints: auth/register, auth/login, portal/*, proxy, admin/*

import { Router } from 'express'
import { Pool } from 'pg'
import { randomUUID, createHash } from 'crypto'

const router = Router()

const getDb = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 5,
})

// ─── Databas-tabeller ─────────────────────────────────────────────────────────
async function ensureApiflySchema() {
  const db = getDb()
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS apifly_customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        name text,
        plan text DEFAULT 'starter',
        status text DEFAULT 'active',
        stripe_customer_id text,
        api_calls_this_month integer DEFAULT 0,
        api_calls_limit integer DEFAULT 10000,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS apifly_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid REFERENCES apifly_customers(id) ON DELETE CASCADE,
        name text NOT NULL,
        key_hash text NOT NULL,
        key_prefix text NOT NULL,
        is_active boolean DEFAULT true,
        last_used_at timestamptz,
        calls_total integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS apifly_usage_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid REFERENCES apifly_customers(id),
        api_key_id uuid REFERENCES apifly_api_keys(id),
        api_provider text NOT NULL,
        endpoint text NOT NULL,
        status_code integer,
        latency_ms integer,
        cost_usd numeric(10,6),
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_apifly_keys_customer ON apifly_api_keys(customer_id);
      CREATE INDEX IF NOT EXISTS idx_apifly_usage_customer ON apifly_usage_log(customer_id);
      CREATE INDEX IF NOT EXISTS idx_apifly_usage_created ON apifly_usage_log(created_at);
    `)
    console.log('[apifly] Schema ensured')
  } catch (e: any) {
    console.error('[apifly] Schema migration failed:', e.message)
  } finally {
    await db.end()
  }
}
ensureApiflySchema()

// ─── Auth middleware ───────────────────────────────────────────────────────────
function hashKey(keyValue: string): string {
  return createHash('sha256').update(keyValue).digest('hex')
}

async function verifyApiKey(keyValue: string, db: Pool): Promise<{ customer_id: string; key_id: string } | null> {
  const hash = hashKey(keyValue)
  const { rows } = await db.query(
    `SELECT k.id as key_id, k.customer_id FROM apifly_api_keys k
     JOIN apifly_customers c ON c.id = k.customer_id
     WHERE k.key_hash = $1 AND k.is_active = true AND c.status = 'active'`,
    [hash]
  )
  if (rows[0]) {
    await db.query(
      'UPDATE apifly_api_keys SET last_used_at=NOW(), calls_total=calls_total+1 WHERE id=$1',
      [rows[0].key_id]
    )
    return rows[0]
  }
  return null
}

function getCustomerFromToken(req: any): { id: string; email: string } | null {
  const auth = req.headers['x-customer-token'] || (req.headers.authorization || '').replace('Bearer ', '')
  if (!auth) return null
  try {
    const parsed = JSON.parse(Buffer.from(auth as string, 'base64').toString())
    if (parsed.id && parsed.email) return parsed
    return null
  } catch {
    return null
  }
}

// ─── Public: Register ─────────────────────────────────────────────────────────
router.post('/v1/apifly/auth/register', async (req, res) => {
  const { email, name, plan = 'starter' } = req.body
  if (!email) return res.status(400).json({ error: 'email krävs' })
  const db = getDb()
  try {
    const limits: Record<string, number> = { starter: 10000, pro: 100000, enterprise: 1000000 }
    const { rows: [customer] } = await db.query(
      `INSERT INTO apifly_customers (email, name, plan, api_calls_limit)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET updated_at=NOW()
       RETURNING id, email, name, plan, status, api_calls_limit, created_at`,
      [email, name || null, plan, limits[plan] || 10000]
    )
    res.json({ success: true, customer })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Public: Login ────────────────────────────────────────────────────────────
router.post('/v1/apifly/auth/login', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email krävs' })
  const db = getDb()
  try {
    const { rows: [customer] } = await db.query(
      'SELECT id, email, name, plan, status FROM apifly_customers WHERE email=$1',
      [email]
    )
    if (!customer) return res.status(404).json({ error: 'Kund ej hittad — registrera dig först' })
    const token = Buffer.from(JSON.stringify({ id: customer.id, email: customer.email, ts: Date.now() })).toString('base64')
    res.json({ success: true, token, customer })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Portal: Dashboard ────────────────────────────────────────────────────────
router.get('/v1/apifly/portal/dashboard', async (req, res) => {
  const customer = getCustomerFromToken(req)
  if (!customer) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    const { rows: [cust] } = await db.query(
      'SELECT * FROM apifly_customers WHERE id=$1',
      [customer.id]
    )
    if (!cust) return res.status(404).json({ error: 'Kund ej hittad' })

    const { rows: keys } = await db.query(
      `SELECT id, name, key_prefix, is_active, last_used_at, calls_total, created_at
       FROM apifly_api_keys WHERE customer_id=$1 ORDER BY created_at DESC`,
      [customer.id]
    )
    const { rows: usage } = await db.query(
      `SELECT api_provider, COUNT(*) as calls, SUM(cost_usd) as cost, AVG(latency_ms) as avg_latency
       FROM apifly_usage_log WHERE customer_id=$1 AND created_at > NOW()-INTERVAL '30 days'
       GROUP BY api_provider ORDER BY calls DESC LIMIT 10`,
      [customer.id]
    )
    const { rows: [totalUsage] } = await db.query(
      `SELECT COUNT(*) as total_calls, COALESCE(SUM(cost_usd),0) as total_cost
       FROM apifly_usage_log WHERE customer_id=$1 AND created_at > NOW()-INTERVAL '30 days'`,
      [customer.id]
    )
    res.json({ customer: cust, keys, usage_by_provider: usage, total_this_month: totalUsage })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Portal: List/Create Keys ─────────────────────────────────────────────────
router.get('/v1/apifly/portal/keys', async (req, res) => {
  const customer = getCustomerFromToken(req)
  if (!customer) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    const { rows } = await db.query(
      `SELECT id, name, key_prefix, is_active, last_used_at, calls_total, created_at
       FROM apifly_api_keys WHERE customer_id=$1 ORDER BY created_at DESC`,
      [customer.id]
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

router.post('/v1/apifly/portal/keys', async (req, res) => {
  const customer = getCustomerFromToken(req)
  if (!customer) return res.status(401).json({ error: 'Unauthorized' })
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name krävs' })
  const db = getDb()
  try {
    const keyValue = `afly_${randomUUID().replace(/-/g, '')}`
    const keyHash = hashKey(keyValue)
    const keyPrefix = keyValue.slice(0, 12)
    const { rows: [key] } = await db.query(
      `INSERT INTO apifly_api_keys (customer_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4) RETURNING id, name, key_prefix, is_active, created_at`,
      [customer.id, name, keyHash, keyPrefix]
    )
    res.json({ ...key, key: keyValue, warning: 'Spara nyckeln nu — den visas aldrig igen' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Portal: Revoke Key ───────────────────────────────────────────────────────
router.delete('/v1/apifly/portal/keys/:keyId', async (req, res) => {
  const customer = getCustomerFromToken(req)
  if (!customer) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    await db.query(
      'UPDATE apifly_api_keys SET is_active=false WHERE id=$1 AND customer_id=$2',
      [req.params.keyId, customer.id]
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Portal: Usage ────────────────────────────────────────────────────────────
router.get('/v1/apifly/portal/usage', async (req, res) => {
  const customer = getCustomerFromToken(req)
  if (!customer) return res.status(401).json({ error: 'Unauthorized' })
  const db = getDb()
  try {
    const { rows } = await db.query(
      `SELECT api_provider, endpoint, status_code, latency_ms, cost_usd, created_at
       FROM apifly_usage_log WHERE customer_id=$1
       ORDER BY created_at DESC LIMIT 100`,
      [customer.id]
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Proxy ────────────────────────────────────────────────────────────────────
router.post('/v1/apifly/proxy', async (req, res) => {
  const apiKey = req.headers['x-apifly-key'] as string
  if (!apiKey) return res.status(401).json({ error: 'X-Apifly-Key header krävs' })

  const db = getDb()
  let auth: { customer_id: string; key_id: string } | null = null
  try {
    auth = await verifyApiKey(apiKey, db)
    if (!auth) return res.status(401).json({ error: 'Ogiltig API-nyckel' })

    const { api_id, endpoint_id, params, query, body } = req.body
    if (!api_id || !endpoint_id) return res.status(400).json({ error: 'api_id och endpoint_id krävs' })

    const start = Date.now()
    const r = await fetch('https://api.wavult.com/v1/uapix/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WAVULT_API_KEY || ''}`,
      },
      body: JSON.stringify({ api_id, endpoint_id, params, query, body }),
    })
    const data = await r.json() as any
    const latency = Date.now() - start

    await db.query(
      `INSERT INTO apifly_usage_log (customer_id, api_key_id, api_provider, endpoint, status_code, latency_ms, cost_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [auth.customer_id, auth.key_id, api_id, endpoint_id, r.status, latency, data.cost_usd || 0]
    )
    await db.query(
      'UPDATE apifly_customers SET api_calls_this_month=api_calls_this_month+1 WHERE id=$1',
      [auth.customer_id]
    )
    res.status(r.status).json(data)
  } catch (err: any) {
    if (auth) {
      await db.query(
        `INSERT INTO apifly_usage_log (customer_id, api_key_id, api_provider, endpoint, status_code, latency_ms)
         VALUES ($1,$2,$3,$4,500,0)`,
        [auth.customer_id, auth.key_id, req.body?.api_id || 'unknown', req.body?.endpoint_id || 'unknown']
      ).catch(() => {})
    }
    res.status(503).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Admin: Customers ─────────────────────────────────────────────────────────
router.get('/v1/apifly/admin/customers', async (_req, res) => {
  const db = getDb()
  try {
    const { rows } = await db.query(
      `SELECT c.*,
              COUNT(DISTINCT k.id) as key_count,
              (SELECT COUNT(*) FROM apifly_usage_log u WHERE u.customer_id=c.id AND u.created_at > NOW()-INTERVAL '30 days') as calls_30d
       FROM apifly_customers c
       LEFT JOIN apifly_api_keys k ON k.customer_id=c.id
       GROUP BY c.id ORDER BY c.created_at DESC`
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

// ─── Admin: Stats ─────────────────────────────────────────────────────────────
router.get('/v1/apifly/admin/stats', async (_req, res) => {
  const db = getDb()
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM apifly_customers) as total_customers,
        (SELECT COUNT(*) FROM apifly_customers WHERE plan='pro') as pro_customers,
        (SELECT COUNT(*) FROM apifly_customers WHERE plan='enterprise') as enterprise_customers,
        (SELECT COUNT(*) FROM apifly_api_keys WHERE is_active=true) as active_keys,
        (SELECT COUNT(*) FROM apifly_usage_log WHERE created_at > NOW()-INTERVAL '24 hours') as calls_24h,
        (SELECT COUNT(*) FROM apifly_usage_log WHERE created_at > NOW()-INTERVAL '30 days') as calls_30d,
        (SELECT COALESCE(SUM(cost_usd),0) FROM apifly_usage_log WHERE created_at > NOW()-INTERVAL '30 days') as revenue_30d
    `)
    res.json(stats)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  } finally {
    await db.end()
  }
})

export default router
