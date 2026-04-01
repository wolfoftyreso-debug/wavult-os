/**
 * lib/db.ts — PostgreSQL connection pools för Wavult OS och QuiXzoom
 *
 * Migrerad från Supabase cloud → AWS RDS eu-north-1
 * Migration utförd: 2026-04-01
 *
 * Miljövariabler (hämtas från SSM /wavult/prod/ via ECS task env):
 *   WAVULT_OS_DB_URL   - postgresql://wavult_admin:...@wavult-identity-ecs...amazonaws.com:5432/wavult_os?sslmode=require
 *   QUIXZOOM_DB_URL    - postgresql://wavult_admin:...@wavult-identity-ecs...amazonaws.com:5432/quixzoom?sslmode=require
 *
 * Fallback: RDS_HOST + DB_PASSWORD om URL inte finns (bakåtkompatibilitet)
 */

import { Pool, PoolClient } from 'pg'

const RDS_HOST = 'wavult-identity-ecs.cvi0qcksmsfj.eu-north-1.rds.amazonaws.com'
const RDS_USER = 'wavult_admin'
const RDS_SSL = { rejectUnauthorized: false }

// ─── Wavult OS Pool ───────────────────────────────────────────────────────────

const wavultOsPool = process.env.WAVULT_OS_DB_URL
  ? new Pool({
      connectionString: process.env.WAVULT_OS_DB_URL,
      ssl: RDS_SSL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
    })
  : new Pool({
      host: process.env.RDS_HOST || RDS_HOST,
      port: 5432,
      database: 'wavult_os',
      user: RDS_USER,
      password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD,
      ssl: RDS_SSL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
    })

// ─── QuiXzoom Pool ────────────────────────────────────────────────────────────

const quixzoomPool = process.env.QUIXZOOM_DB_URL
  ? new Pool({
      connectionString: process.env.QUIXZOOM_DB_URL,
      ssl: RDS_SSL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
    })
  : new Pool({
      host: process.env.RDS_HOST || RDS_HOST,
      port: 5432,
      database: 'quixzoom',
      user: RDS_USER,
      password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD,
      ssl: RDS_SSL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
    })

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function queryWavultOs(text: string, params?: unknown[]) {
  const start = Date.now()
  const res = await wavultOsPool.query(text, params)
  const duration = Date.now() - start
  if (duration > 500) console.warn(`[wavult_os] Slow query (${duration}ms):`, text.substring(0, 100))
  return res
}

export async function queryQuixzoom(text: string, params?: unknown[]) {
  const start = Date.now()
  const res = await quixzoomPool.query(text, params)
  const duration = Date.now() - start
  if (duration > 500) console.warn(`[quixzoom] Slow query (${duration}ms):`, text.substring(0, 100))
  return res
}

export async function getWavultOsClient(): Promise<PoolClient> {
  return wavultOsPool.connect()
}

export async function getQuixzoomClient(): Promise<PoolClient> {
  return quixzoomPool.connect()
}

export { wavultOsPool, quixzoomPool }
export default wavultOsPool
