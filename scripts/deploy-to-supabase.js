#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    'ERROR: DATABASE_URL is not set.\n\n' +
    'Add it to your .env file:\n' +
    '  DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres\n\n' +
    'Find it in Supabase Dashboard → Settings → Database → Connection string (URI).'
  );
  process.exit(1);
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'deploy_all.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Connecting to database...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected.\n');

  const lines = sql.split('\n').length;
  console.log(`Executing deploy_all.sql (${sql.length} chars, ~${lines} lines)...`);

  try {
    await client.query(sql);
    console.log('\nSchema deployed successfully!');
  } catch (err) {
    console.error('\nDeployment failed:');
    console.error(`  ${err.message}`);
    if (err.position) {
      const prefix = sql.substring(0, parseInt(err.position));
      console.error(`  Near line ${prefix.split('\n').length} in deploy_all.sql`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
