/**
 * migrate — idempotently apply the SQL files in apps/wavult-aero/migrations
 * in sorted order. Each file is wrapped in a transaction and recorded in
 * aero_schema_migrations.
 *
 * Usage:
 *   AERO_DATABASE_URL=postgres://... npm run migrate
 */

import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { getPool, withTransaction } from './db'

async function main(): Promise<void> {
  const dir = resolve(__dirname, '..', '..', 'migrations')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    console.log('[migrate] no migrations found in %s', dir)
    return
  }

  // Ensure the bookkeeping table exists before we query it. The first
  // migration also creates it (idempotent), but we need to be able to
  // SELECT from it before we decide whether to apply anything.
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS aero_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum TEXT NOT NULL
    )`)

  const { rows: applied } = await getPool().query<{ name: string; checksum: string }>(
    `SELECT name, checksum FROM aero_schema_migrations`,
  )
  const appliedMap = new Map(applied.map((r) => [r.name, r.checksum]))

  for (const file of files) {
    const name = file.replace(/\.sql$/, '')
    const sql = readFileSync(join(dir, file), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const prev = appliedMap.get(name)
    if (prev) {
      if (prev !== checksum && prev !== 'v1') {
        // Migrations are immutable once applied. A checksum drift is a
        // developer error and should block the deploy.
        console.error('[migrate] CHECKSUM DRIFT for %s (db=%s file=%s)', name, prev, checksum)
        process.exit(2)
      }
      console.log('[migrate] skip %s (already applied)', name)
      continue
    }
    console.log('[migrate] apply %s', name)
    await withTransaction(async (client) => {
      await client.query(sql)
      await client.query(
        `INSERT INTO aero_schema_migrations (name, checksum) VALUES ($1,$2)
           ON CONFLICT (name) DO UPDATE SET checksum = EXCLUDED.checksum`,
        [name, checksum],
      )
    })
    console.log('[migrate] done %s', name)
  }
  await getPool().end()
}

main().catch((err) => {
  console.error('[migrate][fatal]', err)
  process.exit(1)
})
