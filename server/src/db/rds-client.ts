// Our own PostgreSQL connection — replaces Supabase client
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.RDS_HOST || process.env.RDS_HOST_IDENTITY,
  port: 5432,
  database: process.env.RDS_DATABASE || 'wavult_identity',
  user: process.env.RDS_USER || 'wavult_admin',
  password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 500) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100))
  }
  return res
}

export async function getClient() {
  return pool.connect()
}

export default pool
