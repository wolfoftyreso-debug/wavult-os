const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'deploy_all.sql'), 'utf-8');
  console.log('SQL: ' + (sql.length/1024).toFixed(1) + ' KB');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected');
  try {
    await client.query(sql);
    console.log('SUCCESS');
  } catch(e) {
    console.error('FAILED:', e.message);
    if (e.position) { const p = parseInt(e.position); console.error('Near:', sql.substring(Math.max(0,p-200), p+200)); }
  }
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
  console.log('Tables: ' + res.rows.length);
  res.rows.forEach(r => console.log('  ' + r.table_name));
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });