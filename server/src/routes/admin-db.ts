// ─── Admin DB Routes ───────────────────────────────────────────────────────────
// GET  /api/admin/databases  — list all databases + tables with row counts
// POST /api/admin/query      — run SELECT-only query against specified database
// Database connections: wavult_os, quixzoom, wavult_ident via env vars

import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

const router = Router()

// ─── DB connection pools ──────────────────────────────────────────────────────

interface DBConfig {
  name: string
  pool: Pool
}

function buildPool(connStr: string | undefined, fallback: string): Pool {
  return new Pool({
    connectionString: connStr ?? fallback,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}

const DB_CONFIGS: DBConfig[] = [
  {
    name: 'wavult_os',
    pool: buildPool(process.env.DATABASE_URL_WAVULT_OS ?? process.env.DATABASE_URL, ''),
  },
  {
    name: 'quixzoom',
    pool: buildPool(process.env.DATABASE_URL_QUIXZOOM, ''),
  },
  {
    name: 'wavult_ident',
    pool: buildPool(process.env.DATABASE_URL_IDENTITY ?? process.env.DATABASE_URL_WAVULT_IDENT, ''),
  },
]

// ─── Blocked SQL patterns (destructive ops) ──────────────────────────────────

const BLOCKED_PATTERNS = [
  /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|REPLACE|MERGE|GRANT|REVOKE|EXEC|EXECUTE)\b/i,
  /;\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|REPLACE|MERGE)\b/i,
]

function isQuerySafe(query: string): boolean {
  const stripped = query.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(stripped)) return false
  }
  return true
}

// ─── GET /api/admin/databases ─────────────────────────────────────────────────

router.get('/api/admin/databases', async (_req: Request, res: Response) => {
  const results = await Promise.all(
    DB_CONFIGS.map(async ({ name, pool }) => {
      try {
        const client = await pool.connect()
        try {
          const tablesQuery = `
            SELECT 
              t.tablename AS name,
              COALESCE(c.reltuples::bigint, 0) AS row_count
            FROM pg_tables t
            LEFT JOIN pg_class c ON c.relname = t.tablename
            WHERE t.schemaname = 'public'
            ORDER BY t.tablename
            LIMIT 100
          `
          const { rows } = await client.query(tablesQuery)
          return {
            name,
            status: 'online',
            tables: rows.map((r: { name: string; row_count: string }) => ({
              name: r.name,
              rowCount: parseInt(r.row_count, 10) || null,
            })),
          }
        } finally {
          client.release()
        }
      } catch {
        return { name, status: 'offline', tables: [] }
      }
    })
  )

  res.json({ databases: results })
})

// ─── POST /api/admin/query ────────────────────────────────────────────────────

router.post('/api/admin/query', async (req: Request, res: Response) => {
  const { db, query } = req.body ?? {}

  if (!db || typeof db !== 'string') {
    return res.status(400).json({ error: 'db är obligatoriskt' })
  }
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query är obligatoriskt' })
  }
  if (!isQuerySafe(query)) {
    return res.status(403).json({ error: 'Endast SELECT-queries är tillåtna. DROP/DELETE/UPDATE/INSERT är blockerade.' })
  }

  const config = DB_CONFIGS.find(c => c.name === db)
  if (!config) {
    return res.status(404).json({ error: `Databas '${db}' hittades inte` })
  }

  const start = Date.now()
  try {
    const client = await config.pool.connect()
    try {
      // Set statement timeout to 10s to prevent long-running queries
      await client.query('SET statement_timeout = 10000')
      const result = await client.query(query.trim())
      const duration_ms = Date.now() - start

      const fields = result.fields?.map((f: { name: string }) => f.name) ?? Object.keys(result.rows[0] ?? {})
      return res.json({
        rows: result.rows ?? [],
        fields,
        duration_ms,
        rowCount: result.rowCount,
      })
    } finally {
      client.release()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return res.status(400).json({
      error: msg,
      duration_ms: Date.now() - start,
      rows: [],
      fields: [],
    })
  }
})

export default router
