#!/usr/bin/env node
/**
 * Deploy sql/deploy_all.sql to Supabase PostgreSQL via the `pg` driver.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres node scripts/deploy-schema.cjs
 *
 * Or set DATABASE_URL in .env and run:
 *   node -e "require('dotenv').config()" scripts/deploy-schema.cjs
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    'ERROR: DATABASE_URL is not set.\n\n' +
    'Set it to your Supabase direct connection string:\n' +
    '  DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres\n\n' +
    'You can find it in Supabase Dashboard → Settings → Database → Connection string (URI).'
  );
  process.exit(1);
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'deploy_all.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log(`Connecting to database...`);
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected.\n');

  console.log(`Executing deploy_all.sql (${sql.length} chars, ~${sql.split('\n').length} lines)...`);
  try {
    await client.query(sql);
    console.log('\n✓ Schema deployed successfully!');
  } catch (err) {
    console.error('\n✗ Deployment failed:');
    console.error(`  ${err.message}`);
    if (err.position) {
      const lines = sql.substring(0, parseInt(err.position)).split('\n');
      console.error(`  Near line ${lines.length} in deploy_all.sql`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
