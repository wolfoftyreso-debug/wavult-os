#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = 'postgresql://postgres.znmxtnxxjpmgtycmsqjv:Certified2026abc@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✓ Connected to Supabase database');

    const sql = fs.readFileSync('/tmp/create-payroll-tables.sql', 'utf8');

    console.log('\nExecuting payroll schema migration...\n');

    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables exist
    const result = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('employees', 'payroll_runs', 'payroll_entries')
      ORDER BY tablename
    `);

    console.log('Created tables:');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
