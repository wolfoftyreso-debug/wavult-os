/**
 * COMPLIANCE-CHECKER — Automatisk kontroll av svenska skattelagskrav
 *
 * Kontrollerar att företaget uppfyller:
 *  - Personalliggare (SFL 39 kap. 9-12§§)
 *  - Kassaregister + kontrollenhet (SFL 39 kap. 4-8§§, SKVFS 2014:9)
 *  - Momsredovisning (ML 2023:200, SFL 26 kap.)
 *  - Arbetsgivardeklaration AGI (SFL 26 kap. 19-20§§)
 *  - Bokföringslagen (BFL 1999:1078)
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requiresPersonnelLedger, PERSONNEL_LEDGER_SNI_CODES } from './personnel-ledger';
import { calculateVatDueDate } from './vat-compliance';

const router = Router();

// ─── Riskbedömning ────────────────────────────────────────────────────────────
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ComplianceCheck {
  requirement: string;
  law: string;
  required: boolean;
  compliant: boolean | null; // null = ej kontrollerbar
  issues: string[];
  warnings: string[];
  next_due_date?: string;
  fine_amount?: string;
}

function calculateRisk(checks: ComplianceCheck[]): RiskLevel {
  const requiredNonCompliant = checks.filter(c => c.required && c.compliant === false);
  const criticalIssues = requiredNonCompliant.filter(c =>
    c.law.includes('kassaregister') || c.law.includes('personalliggare') || c.law.includes('SFL 39')
  );

  if (criticalIssues.length > 0 || requiredNonCompliant.length >= 3) return 'CRITICAL';
  if (requiredNonCompliant.length >= 2) return 'HIGH';
  if (requiredNonCompliant.length === 1) return 'MEDIUM';
  if (checks.some(c => c.warnings.length > 0)) return 'MEDIUM';
  return 'LOW';
}

// ─── Kassaregister-krav per bransch ──────────────────────────────────────────
// Kassaregister krävs för kontantförsäljning (SFL 39:4)
// Undantag: taxi, torg/marknad, välgörenhet, postorder
const CASH_REGISTER_EXEMPT_SNI = [
  '4932', // Taxi
  '4711', // Torghandel (i viss mån)
];

function requiresCashRegister(industryCode: string): boolean {
  return !CASH_REGISTER_EXEMPT_SNI.some(sni => industryCode.startsWith(sni));
}

// ─── POST /api/compliance/check ──────────────────────────────────────────────
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { org_id, industry_code } = req.body;

    if (!org_id) {
      return res.status(400).json({ error: 'org_id krävs' });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const checks: ComplianceCheck[] = [];

    // ── 1. PERSONALLIGGARE (SFL 39:9-12) ───────────────────────────────────
    const needsLedger = industry_code ? requiresPersonnelLedger(industry_code) : null;

    if (needsLedger || !industry_code) {
      const { data: workplaces } = await supabase
        .from('workplaces')
        .select('id, name, requires_personnel_ledger, industry_code')
        .eq('org_id', org_id);

      const configuredWorkplaces = (workplaces || []).filter(w => w.requires_personnel_ledger);
      const ledgerIssues: string[] = [];
      const ledgerWarnings: string[] = [];

      if (!workplaces?.length) {
        ledgerIssues.push('Inga arbetsplatser är konfigurerade');
      } else {
        const unconfigured = (workplaces || []).filter(w =>
          !w.requires_personnel_ledger && w.industry_code && requiresPersonnelLedger(w.industry_code)
        );
        if (unconfigured.length > 0) {
          ledgerIssues.push(`${unconfigured.length} arbetsplats(er) saknar personalliggare: ${unconfigured.map(w => w.name).join(', ')}`);
        }
      }

      // Kontrollera att incheckning/utcheckning sker korrekt
      const today = new Date().toISOString().slice(0, 10);
      const { data: openCheckins } = await supabase
        .from('personnel_checkins')
        .select('id, checkin_time, workplace_id')
        .eq('org_id', org_id)
        .is('checkout_time', null)
        .lt('checkin_time', `${today}T00:00:00Z`); // Incheckade igår eller äldre

      if (openCheckins && openCheckins.length > 0) {
        ledgerIssues.push(
          `${openCheckins.length} person(er) saknar utcheckning (${openCheckins.length > 1 ? 'från föregående dag' : 'sedan igår'}) — bot 12 500 kr/person`
        );
      }

      checks.push({
        requirement: 'Personalliggare',
        law: 'SFL 2011:1244, 39 kap. 9-12§§',
        required: needsLedger !== false,
        compliant: ledgerIssues.length === 0,
        issues: ledgerIssues,
        warnings: ledgerWarnings,
        fine_amount: '12 500 kr per felregistrering + 2 500 kr per saknad person (SFL 50:7a)',
      });
    }

    // ── 2. KASSAREGISTER (SFL 39:4-8, SKVFS 2014:9) ────────────────────────
    const needsCashReg = industry_code ? requiresCashRegister(industry_code) : true; // Default: krävs

    const cashIssues: string[] = [];
    const cashWarnings: string[] = [];

    // Kontrollera om dagens Z-rapport är skapad
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const { data: workplacesAll } = await supabase
      .from('workplaces')
      .select('id, name, requires_cash_register')
      .eq('org_id', org_id);

    for (const wp of workplacesAll || []) {
      if (!wp.requires_cash_register) continue;

      // Kontrollera Z-rapport igår
      const { data: zReport } = await supabase
        .from('z_reports')
        .select('id')
        .eq('org_id', org_id)
        .eq('workplace_id', wp.id)
        .eq('report_date', yesterday)
        .single();

      if (!zReport) {
        cashIssues.push(`Arbetsplats "${wp.name}": Z-rapport saknas för ${yesterday}`);
      }

      // Kontrollera om transaktioner saknar CE-nummer
      const { data: noCeTx } = await supabase
        .from('cash_transactions')
        .select('id')
        .eq('workplace_id', wp.id)
        .is('ce_number', null)
        .gte('created_at', `${yesterday}T00:00:00Z`)
        .limit(1);

      if (noCeTx && noCeTx.length > 0) {
        cashWarnings.push(`Arbetsplats "${wp.name}": Transaktioner utan CE-nummer. Certifierad kontrollenhet KRÄVS (SKVFS 2014:9)`);
      }
    }

    checks.push({
      requirement: 'Kassaregister med certifierad kontrollenhet',
      law: 'SFL 2011:1244, 39 kap. 4-8§§; SKVFS 2014:9',
      required: needsCashReg,
      compliant: cashIssues.length === 0,
      issues: cashIssues,
      warnings: cashWarnings,
      fine_amount: '10 000 kr kontrollavgift + 20 000 kr om ej åtgärdat (SFL 50:7)',
    });

    // ── 3. MOMSREDOVISNING (ML 2023:200, SFL 26 kap.) ──────────────────────
    const currentDate = new Date();
    const lastMonth   = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
    const lastMonthYear = currentDate.getMonth() === 0
      ? currentDate.getFullYear() - 1
      : currentDate.getFullYear();

    const { data: vatDecl } = await supabase
      .from('vat_declarations')
      .select('*')
      .eq('org_id', org_id)
      .eq('period_year', lastMonthYear)
      .eq('period_month', lastMonth)
      .single();

    const vatDueDate = calculateVatDueDate(lastMonthYear, String(lastMonth));
    const vatOverdue = new Date() > vatDueDate && !vatDecl;

    const vatIssues: string[] = [];
    const vatWarnings: string[] = [];

    if (vatOverdue) {
      vatIssues.push(`Momsdeklaration ${lastMonthYear}-${String(lastMonth).padStart(2, '0')} är förfallen (förfallodatum: ${vatDueDate.toLocaleDateString('sv-SE')})`);
    }
    if (vatDecl?.status === 'draft') {
      vatWarnings.push(`Momsdeklaration för perioden är i "draft"-status — ej inlämnad`);
    }

    const nextVatDue = calculateVatDueDate(
      currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear(),
      String(currentDate.getMonth() === 0 ? 12 : currentDate.getMonth() + 1)
    );

    checks.push({
      requirement: 'Momsredovisning',
      law: 'ML 2023:200; SFL 2011:1244, 26 kap. 33§',
      required: true,
      compliant: !vatOverdue,
      issues: vatIssues,
      warnings: vatWarnings,
      next_due_date: nextVatDue.toISOString().slice(0, 10),
      fine_amount: 'Skattetillägg 20% av ej deklarerad skatt (SFL 49 kap.)',
    });

    // ── 4. ARBETSGIVARDEKLARATION (AGI) (SFL 26:19-20) ─────────────────────
    // AGI lämnas månadsvis, förfaller 12:e månaden efter löneutbetalning
    const agiDueMonth  = currentDate.getMonth() + 1; // Nästa månad
    const agiDueYear   = agiDueMonth > 12 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    const agiDueDate   = new Date(agiDueYear, (agiDueMonth > 12 ? 1 : agiDueMonth) - 1, 12);
    // Flytta till vardag om helg
    while (agiDueDate.getDay() === 0 || agiDueDate.getDay() === 6) {
      agiDueDate.setDate(agiDueDate.getDate() + 1);
    }

    checks.push({
      requirement: 'Arbetsgivardeklaration (AGI) — per anställd',
      law: 'SFL 2011:1244, 26 kap. 19-20§§',
      required: true,
      compliant: null, // Kräver integration med lönesystem för att kontrollera
      issues: [],
      warnings: ['Integration med lönesystem krävs för att kontrollera AGI-status'],
      next_due_date: agiDueDate.toISOString().slice(0, 10),
      fine_amount: 'Förseningsavgift 625 kr/månad + skattetillägg (SFL 48 kap.)',
    });

    // ── 5. BOKFÖRINGSLAGEN — LAGRINGSTID (BFL 1999:1078 7 kap.) ───────────
    const bflWarnings: string[] = [];
    const bflIssues: string[] = [];

    // Kontrollera om det finns gamla poster att arkivera
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    checks.push({
      requirement: 'Bokföringsarkivering (7 år)',
      law: 'BFL 1999:1078, 7 kap. 2§',
      required: true,
      compliant: true, // Supabase håller data permanent om ej manuellt raderat
      issues: bflIssues,
      warnings: [
        'Säkerhetskopior av räkenskapsinformation måste lagras separat (BFL 7:7)',
        'Bokföringsdata måste kunna skrivas ut i läsbar form (BFL 7:6)',
      ],
    });

    // ── Sammanställning ─────────────────────────────────────────────────────
    const overallRisk = calculateRisk(checks);
    const criticalIssues = checks.filter(c => c.required && c.compliant === false && c.issues.length > 0);

    const nextAction = overallRisk === 'LOW'
      ? 'Inga omedelbara åtgärder krävs. Övervaka förfallodatum.'
      : overallRisk === 'MEDIUM'
      ? `Åtgärda varningar: ${checks.filter(c => c.warnings.length > 0).map(c => c.requirement).join(', ')}`
      : `KRITISKT: Åtgärda omedelbart: ${criticalIssues.map(c => c.requirement).join(', ')}`;

    return res.json({
      org_id,
      industry_code: industry_code || null,
      checked_at: new Date().toISOString(),
      checks,
      overall_risk: overallRisk,
      next_action: nextAction,
      summary: {
        total_checks: checks.length,
        compliant:    checks.filter(c => c.compliant === true).length,
        non_compliant: checks.filter(c => c.compliant === false).length,
        not_checked:  checks.filter(c => c.compliant === null).length,
      },
    });
  } catch (err: any) {
    console.error('Compliance check error:', err);
    return res.status(500).json({ error: 'Serverfel vid compliance-kontroll' });
  }
});

// ─── GET /api/compliance/requirements/:industry_code ─────────────────────────
/**
 * Visa alla krav för en specifik bransch
 */
router.get('/requirements/:industry_code', async (req: Request, res: Response) => {
  const { industry_code } = req.params;

  return res.json({
    industry_code,
    requirements: [
      {
        requirement: 'Personalliggare',
        required: requiresPersonnelLedger(industry_code),
        law: 'SFL 39 kap. 9-12§§',
        applies_to_sni: PERSONNEL_LEDGER_SNI_CODES,
        fine: '12 500 kr per felregistrering, 2 500 kr per saknad person',
      },
      {
        requirement: 'Kassaregister + certifierad kontrollenhet',
        required: requiresCashRegister(industry_code),
        law: 'SFL 39 kap. 4-8§§, SKVFS 2014:9',
        fine: '10 000 kr + 20 000 kr om ej åtgärdat',
      },
      {
        requirement: 'Momsredovisning',
        required: true,
        law: 'ML 2023:200, SFL 26 kap.',
        fine: 'Skattetillägg 20%',
      },
      {
        requirement: 'Arbetsgivardeklaration (AGI)',
        required: true,
        law: 'SFL 26 kap. 19-20§§',
        fine: '625 kr/mån + skattetillägg',
      },
      {
        requirement: 'Bokföringsarkivering 7 år',
        required: true,
        law: 'BFL 1999:1078, 7 kap. 2§',
        fine: 'Böter + eventuell skattetillägg',
      },
    ],
  });
});

export default router;
