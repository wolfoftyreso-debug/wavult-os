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

// SQL files to deploy, in order
const SQL_FILES = [
  'deploy_all.sql',           // Core schema + seed data
  '12_iso_roles.sql',         // ISO system roles
  '13_iso_compliance.sql',    // ISO 9001 + ISO 27001 compliance seed
  '31_communication_hub.sql', // Communication hub tables
  '32_sampling_impartiality.sql', // Sampling plans, impartiality, COI
  '33_telephony.sql',            // Phone numbers, calls, IVR, voicemails
  '34_voice_ai.sql',             // Voice AI agents, sessions, knowledge
];

async function main() {
  console.log('Connecting to database...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected.\n');

  let success = 0;
  let failed = 0;

  for (const file of SQL_FILES) {
    const sqlPath = path.join(__dirname, '..', 'sql', file);

    if (!fs.existsSync(sqlPath)) {
      console.warn(`  SKIP: ${file} not found`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    const lines = sql.split('\n').length;
    console.log(`Deploying ${file} (${sql.length} chars, ~${lines} lines)...`);

    try {
      await client.query(sql);
      console.log(`  ✓ ${file} deployed successfully`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${file} failed:`);
      console.error(`    ${err.message}`);
      if (err.position) {
        const prefix = sql.substring(0, parseInt(err.position));
        console.error(`    Near line ${prefix.split('\n').length} in ${file}`);
      }
      failed++;
      // Continue with next file instead of aborting
    }
  }

  await client.end();

  console.log(`\nDone. ${success} succeeded, ${failed} failed out of ${SQL_FILES.length} files.`);
  if (failed > 0) process.exit(1);
}

main();
