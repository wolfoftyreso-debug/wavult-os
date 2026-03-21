/**
 * simulate_operations.js
 * Simulerar en hel arbetsdag för 6 testföretag i pixdrift/BusinessCore
 * 
 * Schema-anpassad version baserad på faktisk DB-struktur:
 * - transactions: debit/credit (ej amount), account_code + account_name (NOT NULL)
 * - tasks: status enum (TODO/IN_PROGRESS/REVIEW/DONE/BLOCKED), priority integer
 * - kpis: kolumn "value" (ej "val")
 * - non_conformances: code (NOT NULL)
 * - deals: status enum (NEW/QUALIFIED/DEMO/OFFER/NEGOTIATION/WON/LOST)
 * - work_orders: order_number (NOT NULL)
 * - warranty_claims: claim_number (NOT NULL)
 */

const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.znmxtnxxjpmgtycmsqjv:Certified2026abc@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
});

// Hjälpfunktion: generera unikt löpnummer
let seq = 1;
function nextCode(prefix) {
  return `${prefix}-${Date.now()}-${seq++}`;
}

// Bokför en intäkt (credit) mot konto
async function bookRevenue(orgId, accountCode, accountName, amount, description) {
  await client.query(`
    INSERT INTO transactions (org_id, account_code, account_name, credit, currency, exchange_rate, reporting_credit, description, booked_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'SEK', 1.0, $4, $5, CURRENT_DATE, NOW(), NOW())
  `, [orgId, accountCode, accountName, amount, description]);
}

// Bokför en kostnad (debit) mot konto
async function bookExpense(orgId, accountCode, accountName, amount, description) {
  await client.query(`
    INSERT INTO transactions (org_id, account_code, account_name, debit, currency, exchange_rate, reporting_debit, description, booked_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'SEK', 1.0, $4, $5, CURRENT_DATE, NOW(), NOW())
  `, [orgId, accountCode, accountName, amount, description]);
}

// Bokför FX-transaktion (USD)
async function bookFX(orgId, accountCode, accountName, amountUSD, rateSEK, description) {
  const reportingSEK = Math.round(amountUSD * rateSEK);
  await client.query(`
    INSERT INTO transactions (org_id, account_code, account_name, credit, currency, exchange_rate, reporting_credit, description, booked_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, CURRENT_DATE, NOW(), NOW())
  `, [orgId, accountCode, accountName, amountUSD, rateSEK, reportingSEK, description]);
  return reportingSEK;
}

// =============================================================================
async function simulateRestaurant(orgId, orgName) {
  console.log(`\n=== Simulerar ${orgName} ===`);
  let ok = 0, fail = 0;

  const bookings = [
    { fn: bookRevenue, args: [orgId, '3001', 'Restaurangintäkter', 3200, 'Frukostservering'] },
    { fn: bookRevenue, args: [orgId, '3001', 'Restaurangintäkter', 8400, 'Lunchservering'] },
    { fn: bookExpense, args: [orgId, '4001', 'Råvaror och livsmedel', 2100, 'Leverantörsfaktura mat'] },
  ];

  for (const b of bookings) {
    try { await b.fn(...b.args); ok++; }
    catch(e) { console.log(`  ⚠️ Transaktion: ${e.message.substring(0,80)}`); fail++; }
  }
  console.log(`  ✅ Bokföring: ${ok}/${bookings.length} poster`);

  // Task: HACCP
  try {
    const t = await client.query(`
      INSERT INTO tasks (org_id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES ($1, 'Daglig rengöring och HACCP-kontroll', 'Rutinkontroll kök och kylrum', 'DONE', 2, CURRENT_DATE, NOW(), NOW())
      RETURNING id
    `, [orgId]);
    console.log(`  ✅ Task: ${t.rows[0].id}`);
  } catch(e) { console.log(`  ⚠️ Task: ${e.message.substring(0,80)}`); }

  // KPI: daglig omsättning
  try {
    await client.query(`
      INSERT INTO kpis (org_id, name, value, target, unit, status, trend, period, measured_at, created_at, updated_at)
      VALUES ($1, 'Daglig omsättning', $2, 12000, 'SEK', 'GREEN', 'UP', 'daily', NOW(), NOW(), NOW())
    `, [orgId, Math.floor(8000 + Math.random() * 6000)]);
    console.log('  ✅ KPI: daglig omsättning');
  } catch(e) { console.log(`  ⚠️ KPI: ${e.message.substring(0,80)}`); }

  return { status: 'completed', booked: ok, failed: fail };
}

// =============================================================================
async function simulateWorkshop(orgId, orgName) {
  console.log(`\n=== Simulerar ${orgName} ===`);

  // Arbetsorder
  let workOrderId = null;
  try {
    const wo = await client.query(`
      INSERT INTO work_orders (org_id, order_number, work_type, status, description, promised_date, created_at, updated_at)
      VALUES ($1, $2, 'SERVICE', 'IN_PROGRESS', 'Periodisk service + bromskontroll', NOW() + INTERVAL '2 hours', NOW(), NOW())
      RETURNING id, order_number
    `, [orgId, nextCode('WO')]);
    workOrderId = wo.rows[0].id;
    console.log(`  ✅ Arbetsorder: ${wo.rows[0].order_number} (IN_PROGRESS)`);
  } catch(e) { console.log(`  ⚠️ Arbetsorder: ${e.message.substring(0,80)}`); }

  // Garantiärende
  try {
    const wc = await client.query(`
      INSERT INTO warranty_claims (org_id, claim_number, vehicle_vin, failure_description, status, claim_amount, submitted_at)
      VALUES ($1, $2, 'YV1RS65A952123456', 'Bromsskiva sliten i förtid', 'SUBMITTED', 2400.00, NOW())
      RETURNING id, claim_number
    `, [orgId, nextCode('WC')]);
    console.log(`  ✅ Garantiärende: ${wc.rows[0].claim_number}`);
  } catch(e) { console.log(`  ⚠️ Garantiärende: ${e.message.substring(0,80)}`); }

  // NC-avvikelse
  try {
    await client.query(`
      INSERT INTO non_conformances (org_id, code, title, severity, status, description, detected_at, created_at, updated_at)
      VALUES ($1, $2, 'Oljebyte dokumenterat felaktigt', 'MINOR', 'OPEN', 'Tekniker glömde notera olje-specifikation', CURRENT_DATE, NOW(), NOW())
    `, [orgId, nextCode('NC')]);
    console.log('  ✅ NC-avvikelse registrerad');
  } catch(e) { console.log(`  ⚠️ NC: ${e.message.substring(0,80)}`); }

  // Intäkt för service
  try {
    await bookRevenue(orgId, '3010', 'Serviceintäkter', 4200, 'Service Volvo XC60 - bromsar + olja');
    console.log('  ✅ Serviceintäkt bokad: SEK 4,200');
  } catch(e) { console.log(`  ⚠️ Bokföring: ${e.message.substring(0,80)}`); }

  return { status: 'completed' };
}

// =============================================================================
async function simulateTechCompany(orgId, orgName) {
  console.log(`\n=== Simulerar ${orgName} ===`);

  // Deal-pipeline uppdatering (enum: NEW→QUALIFIED→DEMO→OFFER→NEGOTIATION→WON/LOST)
  try {
    const dealResult = await client.query(`
      SELECT id, title, status FROM deals WHERE org_id = $1 LIMIT 3
    `, [orgId]);

    if (dealResult.rows.length === 0) {
      console.log('  ℹ️  Inga deals — skapar ny deal');
      await client.query(`
        INSERT INTO deals (org_id, title, status, amount, currency, exchange_rate, reporting_amount, probability, expected_close, created_at, updated_at)
        VALUES ($1, 'Enterprise SaaS-avtal Q2', 'QUALIFIED', 120000, 'SEK', 1.0, 120000, 65, CURRENT_DATE + 30, NOW(), NOW())
      `, [orgId]);
      console.log('  ✅ Ny deal skapad: Enterprise SaaS-avtal Q2');
    } else {
      const progressMap = { 'NEW': 'QUALIFIED', 'QUALIFIED': 'DEMO', 'DEMO': 'OFFER', 'OFFER': 'NEGOTIATION' };
      for (const deal of dealResult.rows) {
        const newStatus = progressMap[deal.status] || deal.status;
        if (newStatus !== deal.status) {
          await client.query('UPDATE deals SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, deal.id]);
          console.log(`  ✅ Deal "${deal.title}": ${deal.status} → ${newStatus}`);
        } else {
          console.log(`  ℹ️  Deal "${deal.title}": ${deal.status} (redan på topp)`);
        }
      }
    }
  } catch(e) { console.log(`  ⚠️ Deals: ${e.message.substring(0,80)}`); }

  // Multi-currency: USD-kund
  try {
    const sek = await bookFX(orgId, '3020', 'SaaS-licensintäkter', 4800, 10.42, 'SaaS-licensbetalning USD-kund');
    console.log(`  ✅ USD-transaktion: 4,800 USD = SEK ${sek.toLocaleString('sv-SE')}`);
  } catch(e) { console.log(`  ⚠️ FX-transaktion: ${e.message.substring(0,80)}`); }

  // Sprint-task
  try {
    await client.query(`
      INSERT INTO tasks (org_id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES ($1, 'Sprint review + backlog grooming', 'Sprintavslut - demo + planering nästa sprint', 'IN_PROGRESS', 1, CURRENT_DATE + 1, NOW(), NOW())
    `, [orgId]);
    console.log('  ✅ Sprint-task skapad');
  } catch(e) { console.log(`  ⚠️ Task: ${e.message.substring(0,80)}`); }

  // MRR KPI
  try {
    await client.query(`
      INSERT INTO kpis (org_id, name, value, target, unit, status, trend, period, measured_at, created_at, updated_at)
      VALUES ($1, 'MRR', $2, 500000, 'SEK', 'GREEN', 'UP', 'monthly', NOW(), NOW(), NOW())
    `, [orgId, Math.floor(420000 + Math.random() * 80000)]);
    console.log('  ✅ MRR-KPI uppdaterad');
  } catch(e) { console.log(`  ⚠️ KPI: ${e.message.substring(0,80)}`); }

  return { status: 'completed' };
}

// =============================================================================
async function simulateEcommerce(orgId, orgName) {
  console.log(`\n=== Simulerar ${orgName} ===`);

  const orders = 47;
  const avgOrderValue = 890;
  const totalRevenue = orders * avgOrderValue; // 41,830

  // Daglig order-batch SEK
  try {
    await bookRevenue(orgId, '3030', 'E-handelsförsäljning', totalRevenue, `E-handelsorder batch - ${orders} ordrar`);
    console.log(`  ✅ ${orders} ordrar → SEK ${totalRevenue.toLocaleString('sv-SE')}`);
  } catch(e) { console.log(`  ⚠️ Order-batch: ${e.message.substring(0,80)}`); }

  // EUR-batch
  try {
    const sek = await bookFX(orgId, '3031', 'E-handel EU-kunder', 8400, 11.23, 'EU-kunder EUR-betalning batch');
    console.log(`  ✅ EUR-batch: 8,400 EUR → SEK ${sek.toLocaleString('sv-SE')}`);
  } catch(e) { console.log(`  ⚠️ EUR-batch: ${e.message.substring(0,80)}`); }

  // Logistikk kostnad
  try {
    await bookExpense(orgId, '5800', 'Fraktkostnader', 8200, 'PostNord fraktfaktura - veckovis');
    console.log('  ✅ Fraktkostnad bokad: SEK 8,200');
  } catch(e) { console.log(`  ⚠️ Frakt: ${e.message.substring(0,80)}`); }

  // KPI: ordrar
  try {
    await client.query(`
      INSERT INTO kpis (org_id, name, value, target, unit, status, trend, period, measured_at, created_at, updated_at)
      VALUES ($1, 'Dagliga ordrar', $2, 60, 'st', 'YELLOW', 'STABLE', 'daily', NOW(), NOW(), NOW())
    `, [orgId, orders]);
    console.log('  ✅ KPI: dagliga ordrar');
  } catch(e) { console.log(`  ⚠️ KPI: ${e.message.substring(0,80)}`); }

  // NC: hög returgrad
  try {
    await client.query(`
      INSERT INTO non_conformances (org_id, code, title, severity, status, description, detected_at, created_at, updated_at)
      VALUES ($1, $2, 'Hög returgrad vecka 12', 'MINOR', 'OPEN', '8% returer denna vecka vs 4% mål', CURRENT_DATE, NOW(), NOW())
    `, [orgId, nextCode('NC')]);
    console.log('  ✅ NC: returavvikelse registrerad');
  } catch(e) { console.log(`  ⚠️ NC: ${e.message.substring(0,80)}`); }

  return { status: 'completed' };
}

// =============================================================================
async function simulateVVS(orgId, orgName) {
  console.log(`\n=== Simulerar ${orgName} ===`);

  // Serviceuppdrag
  try {
    await bookRevenue(orgId, '3040', 'VVS-tjänster', 18500, 'Värmepump installation - Lidingö');
    console.log('  ✅ Serviceintäkt: SEK 18,500');
  } catch(e) { console.log(`  ⚠️ Intäkt: ${e.message.substring(0,80)}`); }

  // Materialkostnad
  try {
    await bookExpense(orgId, '4100', 'Material och komponenter', 6800, 'Rörmaterial och kopplingar');
    console.log('  ✅ Materialkostnad: SEK 6,800');
  } catch(e) { console.log(`  ⚠️ Kostnad: ${e.message.substring(0,80)}`); }

  // Task: beställning
  try {
    await client.query(`
      INSERT INTO tasks (org_id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES ($1, 'Beställ rörmaterial för projekt Lidingö', 'Kupparrör 22mm x 50m, 4-vägsventiler x6', 'TODO', 1, CURRENT_DATE + 1, NOW(), NOW())
      RETURNING id
    `, [orgId]);
    console.log('  ✅ Inköpstask skapad');
  } catch(e) { console.log(`  ⚠️ Task: ${e.message.substring(0,80)}`); }

  // NC: leveransfördröjning
  try {
    await client.query(`
      INSERT INTO non_conformances (org_id, code, title, severity, status, description, detected_at, created_at, updated_at)
      VALUES ($1, $2, 'Leveransfördröjning kopparsrör', 'MINOR', 'OPEN', 'Leverantör försenad 3 veckor - påverkar projekt Lidingö', CURRENT_DATE, NOW(), NOW())
    `, [orgId, nextCode('NC')]);
    console.log('  ✅ NC: leveransavvikelse registrerad');
  } catch(e) { console.log(`  ⚠️ NC: ${e.message.substring(0,80)}`); }

  return { status: 'completed' };
}

// =============================================================================
async function simulateSnickeri(orgId, orgName) {
  console.log(`\n=== Simulerar ${orgName} ===`);

  // Projektfaktura
  try {
    await bookRevenue(orgId, '3050', 'Snickeriuppdrag', 42000, 'Köksinredning Lindström - slutbetalning');
    console.log('  ✅ Projektfaktura: SEK 42,000');
  } catch(e) { console.log(`  ⚠️ Intäkt: ${e.message.substring(0,80)}`); }

  // Materialkostnad
  try {
    await bookExpense(orgId, '4200', 'Virke och material', 9400, 'Ek-fanér och beslag för projekt');
    console.log('  ✅ Materialkostnad: SEK 9,400');
  } catch(e) { console.log(`  ⚠️ Kostnad: ${e.message.substring(0,80)}`); }

  // Task: slutmontering
  try {
    await client.query(`
      INSERT INTO tasks (org_id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES ($1, 'Slutmontering kök Lindström', 'Installera luckor, beslag och bänkskiva', 'IN_PROGRESS', 1, CURRENT_DATE + 3, NOW(), NOW())
      RETURNING id
    `, [orgId]);
    console.log('  ✅ Monteringstask skapad');
  } catch(e) { console.log(`  ⚠️ Task: ${e.message.substring(0,80)}`); }

  return { status: 'completed' };
}

// =============================================================================
async function main() {
  await client.connect();
  console.log('✅ Ansluten till Supabase\n');

  // Hämta alla testföretag
  const orgs = await client.query(`
    SELECT id, name FROM organizations 
    WHERE name IN (
      'Restaurang Björnen AB', 'Lindqvists Bilverkstad', 'Novacode AB',
      'Svensson Snickeri', 'VVS Proffsen AB', 'Nordic Shop AB'
    )
    ORDER BY name
  `);

  console.log(`Hittade ${orgs.rows.length} testföretag:`);
  orgs.rows.forEach(o => console.log(`  - ${o.name} (${o.id})`));

  const results = {};

  for (const org of orgs.rows) {
    try {
      let result;
      if (org.name.includes('Restaurang'))       result = await simulateRestaurant(org.id, org.name);
      else if (org.name.includes('Bilverkstad')) result = await simulateWorkshop(org.id, org.name);
      else if (org.name.includes('Novacode'))    result = await simulateTechCompany(org.id, org.name);
      else if (org.name.includes('Snickeri'))    result = await simulateSnickeri(org.id, org.name);
      else if (org.name.includes('VVS'))         result = await simulateVVS(org.id, org.name);
      else if (org.name.includes('Nordic'))      result = await simulateEcommerce(org.id, org.name);
      else                                        result = await simulateTechCompany(org.id, org.name);

      results[org.name] = result;
    } catch(e) {
      results[org.name] = { status: 'error', error: e.message };
      console.log(`  ❌ ${org.name}: ${e.message.substring(0, 120)}`);
    }
  }

  // Sammanfattning
  console.log('\n\n=== SIMULERINGSRESULTAT ===');
  for (const [name, result] of Object.entries(results)) {
    console.log(`${result.status === 'completed' ? '✅' : '❌'} ${name}: ${result.status}`);
  }

  // Systemhälsa
  console.log('\n=== SYSTEMHÄLSA EFTER SIMULERING ===');
  try {
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM organizations WHERE name NOT IN ('Hypbit AB')) as orgs,
        (SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '1 hour') as new_transactions,
        (SELECT COALESCE(SUM(credit), 0) FROM transactions WHERE credit > 0 AND created_at > NOW() - INTERVAL '1 hour') as simulated_revenue_sek,
        (SELECT COALESCE(SUM(reporting_credit), 0) FROM transactions WHERE currency != 'SEK' AND created_at > NOW() - INTERVAL '1 hour') as fx_reporting_sek,
        (SELECT COUNT(*) FROM tasks WHERE created_at > NOW() - INTERVAL '1 hour') as new_tasks,
        (SELECT COUNT(*) FROM non_conformances WHERE created_at > NOW() - INTERVAL '1 hour') as new_ncs,
        (SELECT COUNT(*) FROM work_orders WHERE created_at > NOW() - INTERVAL '1 hour') as new_work_orders,
        (SELECT COUNT(*) FROM warranty_claims WHERE submitted_at > NOW() - INTERVAL '1 hour') as new_warranty_claims,
        (SELECT COUNT(*) FROM kpis WHERE created_at > NOW() - INTERVAL '1 hour') as new_kpis,
        (SELECT COUNT(*) FROM deals) as total_deals
    `);

    const s = stats.rows[0];
    console.log(`  Organisationer (ex Hypbit): ${s.orgs}`);
    console.log(`  Nya transaktioner (1h):     ${s.new_transactions}`);
    console.log(`  Simulerad omsättning SEK:   ${Number(s.simulated_revenue_sek).toLocaleString('sv-SE')}`);
    console.log(`  FX-intäkter (reporting):    SEK ${Number(s.fx_reporting_sek).toLocaleString('sv-SE')}`);
    console.log(`  Nya tasks (1h):             ${s.new_tasks}`);
    console.log(`  Nya avvikelser/NC (1h):     ${s.new_ncs}`);
    console.log(`  Nya arbetsordrar (1h):      ${s.new_work_orders}`);
    console.log(`  Nya garantiärenden (1h):    ${s.new_warranty_claims}`);
    console.log(`  Nya KPI-poster (1h):        ${s.new_kpis}`);
    console.log(`  Totala deals i systemet:    ${s.total_deals}`);
  } catch(e) {
    console.log('  ⚠️ Stats-fel:', e.message.substring(0,100));
  }

  await client.end();
  console.log('\n✅ Simulering klar. DB-anslutning stängd.');
}

main().catch(console.error);
