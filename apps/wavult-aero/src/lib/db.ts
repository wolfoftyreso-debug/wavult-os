/**
 * db — Postgres connection pool for wavult-aero.
 *
 * Uses the shared wavult_os database on the Wavult AWS RDS instance
 * (wavult-identity-ecs). Cloud Supabase is BLOCKED — Wavult OS runs on
 * self-hosted Postgres per AGENTS.md.
 *
 * SSL is required by the RDS endpoint; rejectUnauthorized=false is the
 * documented pattern in apps/wavult-core/src/db/rds.ts.
 */

import { Pool, PoolClient } from 'pg'

let pool: Pool | null = null

function assertNotCloudSupabase(host: string): void {
  if (host.includes('supabase.co') || host.includes('supabase.com')) {
    throw new Error('[aero] FATAL: cloud Supabase is blocked. Use wavult-identity-ecs RDS.')
  }
}

export function getPool(): Pool {
  if (pool) return pool

  const connectionString = process.env.AERO_DATABASE_URL || process.env.EOS_DATABASE_URL || process.env.DATABASE_URL

  if (connectionString) {
    const host = new URL(connectionString).hostname
    assertNotCloudSupabase(host)
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: 'wavult-aero',
    })
  } else {
    const host = process.env.RDS_HOST_ECS
    if (!host) {
      console.error('[aero] FATAL: RDS_HOST_ECS or AERO_DATABASE_URL must be set')
      process.exit(1)
    }
    assertNotCloudSupabase(host)
    pool = new Pool({
      host,
      port: 5432,
      database: process.env.RDS_DATABASE || 'wavult_os',
      user: process.env.RDS_USER || 'wavult_admin',
      password: process.env.RDS_PASSWORD || '',
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: 'wavult-aero',
    })
  }

  pool.on('error', (err) => {
    // Log and continue — individual queries will fail and surface their own errors.
    console.error('[aero][pg] unexpected pool error:', err.message)
  })

  return pool
}

/**
 * Run a callback inside a transaction. Rolls back on any thrown error.
 * Used by the event store to guarantee atomic append + hash-chain extension.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* swallow rollback errors */ }
    throw err
  } finally {
    client.release()
  }
}
