#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.znmxtnxxjpmgtycmsqjv:Certified2026abc@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Mockdata from data.ts
const EMPLOYEES = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Chairman & Group CEO',
    email: 'erik@hypbit.com',
    phone: '+46709123223',
    start_date: '2024-01-01',
    gross_salary: 85000,
    employment_rate: 1.0,
    status: 'active',
    tax_table: 33,
    color: '#8B5CF6',
    location: 'Stockholm',
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cerame',
    initials: 'LR',
    role: 'CEO Wavult Operations',
    email: 'leon@hypbit.com',
    phone: '+46738968949',
    start_date: '2024-03-01',
    gross_salary: 65000,
    employment_rate: 1.0,
    status: 'active',
    tax_table: 33,
    color: '#10B981',
    location: 'Stockholm',
  },
  {
    id: 'winston',
    name: 'Winston Bjarnemark',
    initials: 'WB',
    role: 'CFO',
    email: 'winston@hypbit.com',
    phone: '0768123548',
    start_date: '2024-03-01',
    gross_salary: 60000,
    employment_rate: 1.0,
    status: 'active',
    tax_table: 33,
    color: '#3B82F6',
    location: 'Stockholm',
  },
  {
    id: 'dennis',
    name: 'Dennis Bjarnemark',
    initials: 'DB',
    role: 'Board / Chief Legal & Operations',
    email: 'dennis@hypbit.com',
    phone: '0761474243',
    start_date: '2024-03-01',
    gross_salary: 60000,
    employment_rate: 1.0,
    status: 'active',
    tax_table: 33,
    color: '#F59E0B',
    location: 'Stockholm',
  },
  {
    id: 'johan',
    name: 'Johan Berglund',
    initials: 'JB',
    role: 'Group CTO',
    email: 'johan@hypbit.com',
    phone: '+46736977576',
    start_date: '2024-02-01',
    gross_salary: 72000,
    employment_rate: 1.0,
    status: 'active',
    tax_table: 33,
    color: '#06B6D4',
    location: 'Stockholm',
  },
];

const PAYROLL_HISTORY = [
  {
    id: 'pr-2026-02',
    period: '2026-02',
    run_date: '2026-02-25',
    total_gross: 342000,
    total_employer_tax: 107459,
    total_net: 231240,
    total_cost: 449459,
    status: 'completed',
    approved_by: 'Winston Bjarnemark',
  },
  {
    id: 'pr-2026-01',
    period: '2026-01',
    run_date: '2026-01-25',
    total_gross: 342000,
    total_employer_tax: 107459,
    total_net: 231240,
    total_cost: 449459,
    status: 'completed',
    approved_by: 'Winston Bjarnemark',
  },
  {
    id: 'pr-2025-12',
    period: '2025-12',
    run_date: '2025-12-23',
    total_gross: 342000,
    total_employer_tax: 107459,
    total_net: 231240,
    total_cost: 449459,
    status: 'completed',
    approved_by: 'Winston Bjarnemark',
  },
];

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✓ Connected to Supabase database\n');

    // Insert employees
    console.log('Seeding employees...');
    for (const emp of EMPLOYEES) {
      await client.query(
        `INSERT INTO employees (id, name, initials, role, email, phone, start_date, gross_salary, employment_rate, status, tax_table, color, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           initials = EXCLUDED.initials,
           role = EXCLUDED.role,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           start_date = EXCLUDED.start_date,
           gross_salary = EXCLUDED.gross_salary,
           employment_rate = EXCLUDED.employment_rate,
           status = EXCLUDED.status,
           tax_table = EXCLUDED.tax_table,
           color = EXCLUDED.color,
           location = EXCLUDED.location,
           updated_at = NOW()`,
        [emp.id, emp.name, emp.initials, emp.role, emp.email, emp.phone, emp.start_date, emp.gross_salary, emp.employment_rate, emp.status, emp.tax_table, emp.color, emp.location]
      );
      console.log(`  ✓ ${emp.name}`);
    }

    // Insert payroll runs
    console.log('\nSeeding payroll runs...');
    for (const run of PAYROLL_HISTORY) {
      await client.query(
        `INSERT INTO payroll_runs (id, period, run_date, total_gross, total_employer_tax, total_net, total_cost, status, approved_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           period = EXCLUDED.period,
           run_date = EXCLUDED.run_date,
           total_gross = EXCLUDED.total_gross,
           total_employer_tax = EXCLUDED.total_employer_tax,
           total_net = EXCLUDED.total_net,
           total_cost = EXCLUDED.total_cost,
           status = EXCLUDED.status,
           approved_by = EXCLUDED.approved_by,
           updated_at = NOW()`,
        [run.id, run.period, run.run_date, run.total_gross, run.total_employer_tax, run.total_net, run.total_cost, run.status, run.approved_by]
      );
      console.log(`  ✓ ${run.period} (${run.status})`);
    }

    console.log('\n✅ Seeding completed successfully!\n');

    // Verify counts
    const empCount = await client.query('SELECT COUNT(*) FROM employees');
    const runCount = await client.query('SELECT COUNT(*) FROM payroll_runs');

    console.log('Database summary:');
    console.log(`  - Employees: ${empCount.rows[0].count}`);
    console.log(`  - Payroll runs: ${runCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
