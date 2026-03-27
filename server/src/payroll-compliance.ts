/**
 * ARBETSGIVARAVGIFTER & LÖNEHANTERING
 *
 * Lagstöd:
 *  - Socialavgiftslagen (SAL 2000:980)
 *  - Inkomstskattelagen (IL 1999:1229)
 *  - SFL 26 kap. 19-20§§ (Arbetsgivardeklaration AGI)
 *  - Plan- och bygglagen (ROT) + IL 67 kap. (ROT/RUT)
 *
 * Arbetsgivaravgifter 2026 (SAL 2:26):
 *  Under 15 år:   0%
 *  15-18 år:     10.21%
 *  19-66 år:     31.42% (full avgift)
 *  67-74 år:     16.36%
 *  Över 74 år:   10.21%
 *
 * AGI-förfallodatum: 12:e månaden efter löneutbetalningsmånad
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// ─── Arbetsgivaravgiftssatser 2026 (SAL 2:26) ───────────────────────────────
interface EmployerContributionRate {
  rate: number;
  description: string;
  ageFrom: number;
  ageTo: number;
}

const EMPLOYER_CONTRIBUTION_RATES_2026: EmployerContributionRate[] = [
  { ageFrom: 0,   ageTo: 14,  rate: 0.0000, description: 'Under 15 år — ingen avgift (SAL 2:26a)' },
  { ageFrom: 15,  ageTo: 18,  rate: 0.1021, description: '15-18 år — nedsatt avgift (SAL 2:26b)' },
  { ageFrom: 19,  ageTo: 66,  rate: 0.3142, description: '19-66 år — full avgift (SAL 2:26)' },
  { ageFrom: 67,  ageTo: 74,  rate: 0.1636, description: '67-74 år — nedsatt avgift (SAL 2:26c)' },
  { ageFrom: 75,  ageTo: 999, rate: 0.1021, description: 'Över 74 år — nedsatt avgift (SAL 2:26d)' },
];

// Komponentuppdelning av arbetsgivaravgift 19-66 år (31.42%)
const CONTRIBUTION_COMPONENTS_2026 = {
  sjukforsakringsavgift:       0.0347,  // 3.47%
  foraldraforsakringsavgift:   0.0263,  // 2.63%
  alderspensionsavgift:        0.1021,  // 10.21%
  efterlevandepensionsavgift:  0.0017,  // 0.17%
  arbetsloshetsforsavgift:     0.0214,  // 2.14%
  arbetskadeforsavgift:        0.0020,  // 0.20%
  forvaltningskostnadspaslagg: 0.0024,  // 0.24%
  allman_loneavgift:           0.1136,  // 11.36%
  // Totalt: 31.42%
};

function getEmployerRate(birthYear: number): EmployerContributionRate {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return EMPLOYER_CONTRIBUTION_RATES_2026.find(r => age >= r.ageFrom && age <= r.ageTo)!
    || EMPLOYER_CONTRIBUTION_RATES_2026[2]; // Default: full avgift
}

// ─── POST /api/payroll/calculate-employer-contributions ─────────────────────
router.post('/calculate-employer-contributions', async (req: Request, res: Response) => {
  try {
    const { gross_salary, birth_year } = req.body;

    if (!gross_salary || !birth_year) {
      return res.status(400).json({ error: 'gross_salary och birth_year krävs' });
    }

    const rateInfo = getEmployerRate(parseInt(birth_year));
    const contribution = Math.round(gross_salary * rateInfo.rate * 100) / 100;
    const totalCost    = Math.round((gross_salary + contribution) * 100) / 100;

    // Komponentuppdelning (för 19-66 år)
    let components: Record<string, number> = {};
    if (rateInfo.rate === 0.3142) {
      for (const [key, rate] of Object.entries(CONTRIBUTION_COMPONENTS_2026)) {
        components[key] = Math.round(gross_salary * rate * 100) / 100;
      }
    }

    return res.json({
      gross_salary,
      birth_year,
      age: new Date().getFullYear() - parseInt(birth_year),
      rate: rateInfo.rate,
      rate_percent: `${(rateInfo.rate * 100).toFixed(2)}%`,
      description: rateInfo.description,
      employer_contribution: contribution,
      total_employer_cost: totalCost,
      components: Object.keys(components).length > 0 ? components : null,
      law_reference: 'Socialavgiftslagen 2000:980, 2 kap. 26§',
      year: 2026,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── POST /api/payroll/calculate-tax-deduction ──────────────────────────────
/**
 * Beräkna preliminär A-skatt (IL + Skatteverkets skattetabell)
 * Approximation — exakt beräkning kräver Skatteverkets tabeller per kommun
 */
router.post('/calculate-tax-deduction', async (req: Request, res: Response) => {
  try {
    const { gross_salary, municipality, birth_year } = req.body;

    if (!gross_salary || !municipality) {
      return res.status(400).json({ error: 'gross_salary och municipality krävs' });
    }

    // Genomsnittliga kommunalskattesatser 2026 (Skatteverket)
    // Exakta satser per kommun: https://www.skatteverket.se/skattesatser
    const MUNICIPAL_RATES: Record<string, number> = {
      'stockholm':  0.2998,
      'göteborg':   0.3218,
      'malmö':      0.3328,
      'uppsala':    0.3214,
      'linköping':  0.3200,
      'västerås':   0.3101,
      'örebro':     0.3260,
      'helsingborg': 0.3090,
      'jönköping':  0.3289,
      'norrköping': 0.3286,
      'default':    0.3220, // Riksgenomsnittet ca 32.2%
    };

    const municipalityLower = municipality.toLowerCase();
    const municipalRate = MUNICIPAL_RATES[municipalityLower] || MUNICIPAL_RATES['default'];

    const age = new Date().getFullYear() - (parseInt(birth_year) || 1980);

    // Grundavdrag (IL 63 kap.)
    // Förenklad approximation — varierar med inkomst
    const annualSalary = gross_salary * 12;
    let grundavdrag: number;
    if (annualSalary <= 40000)       grundavdrag = annualSalary;
    else if (annualSalary <= 123700) grundavdrag = 13900 + 0.21 * (annualSalary - 40000);
    else if (annualSalary <= 260400) grundavdrag = 31437;
    else if (annualSalary <= 420400) grundavdrag = 31437 - 0.04 * (annualSalary - 260400);
    else                              grundavdrag = 25000; // Minimum

    const monthlyGrundavdrag = grundavdrag / 12;
    const taxableIncome = Math.max(0, gross_salary - monthlyGrundavdrag);

    // Kommunal inkomstskatt
    const kommunalskatt = taxableIncome * municipalRate;

    // Statlig inkomstskatt (20% på inkomst > 598 500 kr/år = 49 875/mån, IL 65 kap.)
    const STATLIG_SKATT_GRANSVARDE_MANAD = 49875;
    const statligSkatt = gross_salary > STATLIG_SKATT_GRANSVARDE_MANAD
      ? (gross_salary - STATLIG_SKATT_GRANSVARDE_MANAD) * 0.20
      : 0;

    const totalTax = Math.round((kommunalskatt + statligSkatt) * 100) / 100;
    const netSalary = Math.round((gross_salary - totalTax) * 100) / 100;

    return res.json({
      gross_salary,
      municipality,
      birth_year: birth_year || null,
      age,
      grundavdrag: Math.round(monthlyGrundavdrag * 100) / 100,
      taxable_income: Math.round(taxableIncome * 100) / 100,
      municipal_rate: municipalRate,
      kommunalskatt:  Math.round(kommunalskatt * 100) / 100,
      statlig_skatt:  Math.round(statligSkatt  * 100) / 100,
      total_tax:      totalTax,
      net_salary:     netSalary,
      tax_rate_effective: `${((totalTax / gross_salary) * 100).toFixed(1)}%`,
      note: 'Approximation — exakt beräkning kräver Skatteverkets skattetabeller',
      law_reference: 'IL 1999:1229, 63-65 kap.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── POST /api/payroll/rot-rut ───────────────────────────────────────────────
/**
 * ROT- och RUT-avdrag (IL 67 kap.)
 * ROT: 50% av arbetskostnad, max 50 000 kr/år per person
 * RUT: 50% av arbetskostnad, max 75 000 kr/år per person
 */
router.post('/rot-rut', async (req: Request, res: Response) => {
  try {
    const { service_type, labor_cost, property_id, customer_personal_number } = req.body;

    if (!service_type || !labor_cost || !customer_personal_number) {
      return res.status(400).json({ error: 'service_type, labor_cost och customer_personal_number krävs' });
    }

    if (!['ROT', 'RUT'].includes(service_type)) {
      return res.status(400).json({ error: 'service_type måste vara ROT eller RUT' });
    }

    if (service_type === 'ROT' && !property_id) {
      return res.status(400).json({
        error: 'ROT kräver fastighetsbeteckning (property_id)',
        law: 'IL 67 kap. 13§',
      });
    }

    // Maxavdrag (IL 67:11-12)
    const MAX_DEDUCTION = service_type === 'ROT' ? 50000 : 75000;
    const DEDUCTION_RATE = 0.50; // 50% av arbetskostnad

    const deductionAmount = Math.min(
      Math.round(labor_cost * DEDUCTION_RATE * 100) / 100,
      MAX_DEDUCTION
    );
    const customerPays    = labor_cost - deductionAmount;

    return res.json({
      service_type,
      labor_cost,
      deduction_rate: '50%',
      deduction_amount: deductionAmount,
      max_annual_deduction: MAX_DEDUCTION,
      customer_pays: Math.round(customerPays * 100) / 100,
      property_id: property_id || null,
      instructions: [
        '1. Fakturera kunden med avdrag direkt på fakturan',
        '2. Ansök om utbetalning via Skatteverkets e-tjänst (NE-blanketten)',
        '3. Skatteverket betalar ut beloppet direkt till utföraren',
        '4. Kunden måste ha tillräcklig skatt att kvitta mot (kontrollera hos Skatteverket)',
      ],
      skv_service_url: 'https://www.skatteverket.se/rotochrut',
      law_reference: `IL 1999:1229, 67 kap. ${service_type === 'ROT' ? '11-13§§' : '11-12§§'}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/payroll/ku-report ──────────────────────────────────────────────
/**
 * Kontrolluppgifter KU10 (SFL 22 kap.)
 * Lämnas till Skatteverket senast 31 januari nästa år
 * XML-format enligt Skatteverkets schema
 */
router.get('/ku-report', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year krävs' });

    // Kräver admin
    const userRole = (req as any).userRole;
    if (!['ADMIN', 'OWNER'].includes(userRole)) {
      return res.status(403).json({ error: 'KU-rapport kräver ADMIN-behörighet' });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // TODO: Hämta löneutbetalningar per anställd för året
    // Kräver integration med lönesystem
    const employees: any[] = []; // Placeholder

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Kontrolluppgift KU10 — SFL 22 kap. -->
<!-- Inlämnas senast 31 januari ${parseInt(year as string) + 1} -->
<Skatteverket xmlns="http://www.skatteverket.se/ku/4.0"
              omrade="Kontrolluppgifter"
              tekniskKontaktpersonFörnamn=""
              tekniskKontaktpersonEfternamn=""
              tekniskKontaktpersonTelefon=""
              tekniskKontaktpersonEpostadress=""
              skapad="${new Date().toISOString()}">
  <Avsandare>
    <Organisationsnummer>${(req as any).orgNumber || ''}</Organisationsnummer>
    <Programnamn>pixdrift OMS</Programnamn>
    <Programversion>1.0</Programversion>
  </Avsandare>
${employees.map(emp => `  <KU10>
    <Inkomstar>${year}</Inkomstar>
    <Borttag>false</Borttag>
    <ArbetsgivareArb>
      <Organisationsnummer>${emp.org_number}</Organisationsnummer>
    </ArbetsgivareArb>
    <Inkomsttagare>
      <Personnummer>${emp.personal_number}</Personnummer>
    </Inkomsttagare>
    <Uppgifter>
      <KontantErsattning>${emp.gross_salary_year}</KontantErsattning>
      <PreliminarSkatt>${emp.tax_withheld_year}</PreliminarSkatt>
    </Uppgifter>
  </KU10>`).join('\n')}
</Skatteverket>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="KU10_${year}.xml"`);
    return res.send(xml);
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/payroll/hours-from-ledger ─────────────────────────────────────
/**
 * Hämta arbetade timmar från personalliggaren och beräkna lön
 */
router.get('/hours-from-ledger', async (req: Request, res: Response) => {
  try {
    const { employee_id, from_date, to_date, workplace_id, hourly_rate } = req.query;

    if (!employee_id || !from_date || !to_date || !workplace_id) {
      return res.status(400).json({ error: 'employee_id, from_date, to_date och workplace_id krävs' });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: checkins } = await supabase
      .from('personnel_checkins')
      .select('checkin_time, checkout_time, role')
      .eq('workplace_id', workplace_id)
      .eq('created_by', employee_id) // TODO: Lägg till employee_id FK
      .gte('checkin_time', `${from_date}T00:00:00Z`)
      .lte('checkin_time', `${to_date}T23:59:59Z`)
      .not('checkout_time', 'is', null);

    let totalMinutes = 0;
    const sessions = (checkins || []).map(c => {
      const minutes = Math.round(
        (new Date(c.checkout_time!).getTime() - new Date(c.checkin_time).getTime()) / 60000
      );
      totalMinutes += minutes;
      return {
        date: new Date(c.checkin_time).toLocaleDateString('sv-SE'),
        checkin:  c.checkin_time,
        checkout: c.checkout_time,
        minutes,
        hours: (minutes / 60).toFixed(2),
      };
    });

    const totalHours    = totalMinutes / 60;
    const rate          = parseFloat(hourly_rate as string) || 0;
    const grossSalary   = Math.round(totalHours * rate * 100) / 100;

    return res.json({
      employee_id,
      workplace_id,
      from_date,
      to_date,
      sessions,
      total_minutes: totalMinutes,
      total_hours:   Math.round(totalHours * 100) / 100,
      hourly_rate:   rate,
      gross_salary:  grossSalary,
      note: 'Baserat på stämplingar i personalliggaren (SFL 39 kap.)',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

export default router;
