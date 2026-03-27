#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://znmxtnxxjpmgtycmsqjv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXh0bnh4anBtZ3R5Y21zcWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4MDY2NSwiZXhwIjoyMDg5NDU2NjY1fQ.4R1tNeukZRBbAhxvo0rHPf9KZKEOjiILTeDIN9hYBjc';

// Read the SQL file
const sql = fs.readFileSync(path.join(__dirname, 'payroll-schema.sql'), 'utf8');

// Split by statements and execute each
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function executeSQL(statement) {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);

    const postData = JSON.stringify({ query: statement + ';' });

    const options = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

console.log('Running Payroll migration...');
console.log(`Found ${statements.length} SQL statements\n`);

// Use psql instead if available
const { execSync } = require('child_process');

try {
  // Try to execute via psql using the pooler connection string
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.znmxtnxxjpmgtycmsqjv:Umauma99!!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

  console.log('Executing SQL directly via psql...');
  const result = execSync(`psql "${connectionString}" -f ${path.join(__dirname, 'payroll-schema.sql')}`, {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log(result);
  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('psql not available or failed, trying direct execution...');

  // Fallback: execute SQL as a single batch
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('Note: Supabase JS client cannot execute DDL. Please run this SQL manually in Supabase SQL Editor:');
  console.log('\n' + sql);
  console.log('\nOr install psql and run: psql CONNECTION_STRING -f migrations/payroll-schema.sql');
  process.exit(1);
}
