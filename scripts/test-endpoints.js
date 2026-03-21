// test-endpoints.js — Creates test user + tests all endpoints
// Run: node scripts/test-endpoints.js

const http = require('http');
require('dotenv').config();

const BASE = 'http://localhost:3001';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

const green = t => `\x1b[32m${t}\x1b[0m`;
const red = t => `\x1b[31m${t}\x1b[0m`;
const yellow = t => `\x1b[33m${t}\x1b[0m`;
const cyan = t => `\x1b[36m${t}\x1b[0m`;
const dim = t => `\x1b[2m${t}\x1b[0m`;

// ─── HTTP helper ─────────────────────────────────────────────────
function request(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    
    const mod = u.protocol === 'https:' ? require('https') : http;
    const req = mod.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Create test user via Supabase Admin API ─────────────────────
async function createTestUser() {
  console.log(cyan('\n═══ Steg 1: Skapa testanvändare ═══\n'));
  
  const email = 'admin@certified.test';
  const password = 'TestAdmin2026!';
  
  // Create user via Supabase Admin API
  const res = await request('POST', `${SUPABASE_URL}/auth/v1/admin/users`, {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY
  }, {
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Test Admin', role: 'ADMIN' }
  });

  if (res.status === 200 || res.status === 201) {
    console.log(green(`  ✓ Användare skapad: ${email}`));
    return res.data;
  } else if (res.data?.msg?.includes('already') || res.data?.message?.includes('already') || res.status === 422) {
    console.log(yellow(`  ○ Användare finns redan: ${email}`));
  } else {
    console.log(yellow(`  ⚠ Svar: ${res.status} ${JSON.stringify(res.data).substring(0, 200)}`));
  }
  return null;
}

// ─── Sign in and get JWT ─────────────────────────────────────────
async function signIn() {
  const res = await request('POST', `${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    'apikey': SERVICE_KEY
  }, {
    email: 'admin@certified.test',
    password: 'TestAdmin2026!'
  });
  
  if (res.status === 200 && res.data?.access_token) {
    console.log(green(`  ✓ Inloggad — JWT token mottagen`));
    return res.data.access_token;
  } else {
    console.log(yellow(`  ⚠ Inloggning: ${res.status} — ${JSON.stringify(res.data).substring(0, 200)}`));
    return null;
  }
}

// ─── Seed test user into users table ─────────────────────────────
async function seedUserRecord(token, supabaseUserId) {
  // Insert into the app's users table so endpoints have org context
  const res = await request('POST', `${SUPABASE_URL}/rest/v1/users`, {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Prefer': 'return=representation'
  }, {
    id: supabaseUserId,
    email: 'admin@certified.test',
    name: 'Test Admin',
    role: 'ADMIN',
    org_id: null // Will use first org
  });
  
  if (res.status === 201 || res.status === 200) {
    console.log(green(`  ✓ User record synkad till users-tabellen`));
  } else if (res.status === 409 || (res.data?.message || '').includes('duplicate')) {
    console.log(yellow(`  ○ User record finns redan`));
  } else {
    console.log(dim(`  ℹ Users table insert: ${res.status}`));
  }
}

// ─── Test endpoints ──────────────────────────────────────────────
async function testEndpoints(token) {
  console.log(cyan('\n═══ Steg 2: Testa endpoints ═══\n'));
  
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  // Also try with service key directly
  const serviceHeaders = { 'Authorization': `Bearer ${SERVICE_KEY}` };
  
  const endpoints = [
    // No auth required
    ['GET', '/health', null, 'Health'],
    
    // Auth required — try with JWT first, fallback to service key
    ['GET', '/api/contacts', 'auth', 'Contacts'],
    ['GET', '/api/companies', 'auth', 'Companies'],
    ['GET', '/api/leads', 'auth', 'Leads'],
    ['GET', '/api/deals', 'auth', 'Deals'],
    ['GET', '/api/tasks', 'auth', 'Tasks'],
    ['GET', '/api/tasks/my', 'auth', 'My Tasks'],
    ['GET', '/api/currencies', 'auth', 'Currencies'],
    ['GET', '/api/channels', 'auth', 'Channels'],
    ['GET', '/api/audit', 'auth', 'Audit Log'],
    ['GET', '/api/dashboards/admin', 'auth', 'Dashboard Admin'],
    ['GET', '/api/dashboards/sales', 'auth', 'Dashboard Sales'],
    ['GET', '/api/dashboards/finance', 'auth', 'Dashboard Finance'],
    ['GET', '/api/processes', 'auth', 'Processes'],
    ['GET', '/api/nc', 'auth', 'Non-conformances'],
    ['GET', '/api/improvements', 'auth', 'Improvements'],
    ['GET', '/api/compliance', 'auth', 'Compliance'],
    ['GET', '/api/documents', 'auth', 'Documents'],
    ['GET', '/api/documents/review-due', 'auth', 'Docs Review Due'],
    ['GET', '/api/audits', 'auth', 'Audits'],
    ['GET', '/api/risks', 'auth', 'Risks'],
    ['GET', '/api/risks/matrix', 'auth', 'Risk Matrix'],
    ['GET', '/api/training', 'auth', 'Training'],
    ['GET', '/api/capabilities/team', 'auth', 'Team Capabilities'],
    ['GET', '/api/goals', 'auth', 'Goals'],
    ['GET', '/api/exchange-rates', 'auth', 'Exchange Rates'],
    ['GET', '/api/dashboards/management', 'auth', 'Mgmt Dashboard'],
    ['GET', '/api/dashboards/capabilities', 'auth', 'Cap Dashboard'],
    ['GET', '/api/reports/chart-of-accounts', 'auth', 'Chart of Accounts'],
    ['GET', '/api/reports/income-statement', 'auth', 'Income Statement'],
    ['GET', '/api/reports/balance-sheet', 'auth', 'Balance Sheet'],
    ['GET', '/api/reports/cashflow', 'auth', 'Cashflow'],
    ['GET', '/api/reports/vat', 'auth', 'VAT Report'],
    ['GET', '/api/config', 'auth', 'Config'],
    ['GET', '/api/decisions', 'auth', 'Decisions'],
  ];

  let ok = 0, auth_fail = 0, error = 0;
  const results = [];

  for (const [method, path, authReq, label] of endpoints) {
    try {
      // Try with JWT token first
      let h = authReq ? headers : {};
      let res = await request(method, `${BASE}${path}`, h);
      
      // If unauthorized with JWT, try service key
      if (res.status === 401 && token) {
        res = await request(method, `${BASE}${path}`, serviceHeaders);
      }
      
      const status = res.status;
      const dataPreview = typeof res.data === 'object' 
        ? JSON.stringify(res.data).substring(0, 80) 
        : String(res.data).substring(0, 80);
      
      if (status >= 200 && status < 300) {
        ok++;
        console.log(`  ${green('✓')} ${dim(`${status}`)} ${label.padEnd(22)} ${dim(dataPreview)}`);
      } else if (status === 401) {
        auth_fail++;
        console.log(`  ${yellow('○')} ${dim(`${status}`)} ${label.padEnd(22)} ${yellow('Auth required')}`);
      } else {
        error++;
        console.log(`  ${red('✗')} ${dim(`${status}`)} ${label.padEnd(22)} ${dim(dataPreview)}`);
      }
      results.push({ label, status, path });
    } catch (e) {
      error++;
      console.log(`  ${red('✗')} ${'ERR'} ${label.padEnd(22)} ${red(e.message)}`);
    }
  }

  console.log(cyan('\n═══ Resultat ═══\n'));
  console.log(`  ${green('200 OK:')}     ${ok}`);
  console.log(`  ${yellow('401 Auth:')}   ${auth_fail}`);
  console.log(`  ${red('Errors:')}     ${error}`);
  console.log(`  ${dim('Totalt:')}     ${endpoints.length}\n`);
  
  return { ok, auth_fail, error };
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log(cyan('\n╔══════════════════════════════════════════════════════╗'));
  console.log(cyan('║   Certified Systems BC — Auth + Endpoint Test        ║'));
  console.log(cyan('╚══════════════════════════════════════════════════════╝'));
  
  if (!SERVICE_KEY || SERVICE_KEY === 'MISSING') {
    console.error(red('\n  ✗ SUPABASE_SERVICE_ROLE_KEY saknas i .env'));
    process.exit(1);
  }
  
  // Step 1: Create test user
  const user = await createTestUser();
  const userId = user?.id;
  
  // Step 2: Sign in
  const token = await signIn();
  
  // Step 3: Seed user record (if we got a user ID)
  if (userId) {
    await seedUserRecord(token, userId);
  }
  
  // Step 4: Test all endpoints
  const results = await testEndpoints(token);
  
  // Summary
  if (results.ok > 20) {
    console.log(green('  ✓ Systemet fungerar! Majoriteten av endpoints svarar.\n'));
  } else if (results.ok > 0) {
    console.log(yellow('  ⚠ Delvis fungerande — auth behöver konfigureras.\n'));
  } else {
    console.log(red('  ✗ Endpoints svarar inte — kontrollera att servern kör.\n'));
  }
}

main().catch(e => {
  console.error(red(`\nFel: ${e.message}`));
  process.exit(1);
});