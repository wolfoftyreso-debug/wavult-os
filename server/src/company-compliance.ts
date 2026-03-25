/**
 * COMPANY CORE & COMPLIANCE ENGINE
 *
 * EU is building digital company infrastructure from below.
 * Pixdrift is the operational layer from above.
 * Combined: operational OS for EU companies.
 *
 * Covers Swedish law:
 *  - ABL (Aktiebolagslag 2005:551) — annual reports, board meetings
 *  - SFL (Skatteförfarandelagen 2011:1244) — VAT, AGI declarations
 *  - ÅRL (Årsredovisningslagen 1995:1554) — financial reporting
 */

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyEntity {
  id: string;
  org_id: string;
  legal_name: string;
  legal_form: string;
  org_number: string;
  vat_registered: boolean;
  f_tax_approved: boolean;
  fiscal_year_end: string; // "12-31"
  status: string;
}

// ─── Compliance Calendar Engine ───────────────────────────────────────────────

/**
 * Auto-generate compliance obligations based on company type.
 * Pixdrift knows what every Swedish company needs to do and when.
 *
 * Rules:
 *  - Annual report: 7 months after fiscal year end (ABL 8:3)
 *  - VAT quarterly: Q1 due 12 May, Q2 12 Aug, Q3 12 Nov, Q4 12 Feb (SFL 26:35)
 *  - AGI monthly: 12th of month after (SFL 26:3)
 *  - Board meeting: within 6 months of fiscal year end (ABL 7:10)
 *  - Shareholders meeting (AGM): within 6 months of fiscal year end (ABL 7:1)
 */
async function generateComplianceCalendar(entityId: string, orgId: string): Promise<number> {
  const { data: entity } = await supabase
    .from('company_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (!entity) return 0;

  const obligations: any[] = [];
  const now = new Date();
  const year = now.getFullYear();

  // ── Annual report (Årsredovisning) — ABL 8:3 ────────────────────────────────
  // Must be filed with Bolagsverket within 7 months of fiscal year end
  if (['AB', 'HB', 'KB', 'EF', 'BRF'].includes(entity.legal_form)) {
    const [endMonth, endDay] = (entity.fiscal_year_end || '12-31').split('-').map(Number);
    // Calculate this year's and last year's annual report deadline
    const reportDue = new Date(year, endMonth - 1 + 7, endDay);
    const reportDuePrev = new Date(year - 1, endMonth - 1 + 7, endDay);

    // Only add last year's if it might still be pending (within last 6 months)
    if (reportDuePrev >= new Date(year - 1, now.getMonth() - 6, now.getDate())) {
      obligations.push({
        entity_id: entityId, org_id: orgId,
        obligation_type: 'ANNUAL_REPORT',
        authority: 'Bolagsverket',
        description: `Årsredovisning ${year - 1} — ska lämnas till Bolagsverket (ABL 8:3)`,
        due_date: reportDuePrev.toISOString().split('T')[0],
        period_from: `${year - 1}-01-01`,
        period_to: `${year - 1}-12-31`,
        penalty_if_missed: 'Sanktionsavgift 5 000 – 75 000 kr per år (ABL 8:3)',
      });
    }

    obligations.push({
      entity_id: entityId, org_id: orgId,
      obligation_type: 'ANNUAL_REPORT',
      authority: 'Bolagsverket',
      description: `Årsredovisning ${year} — ska lämnas till Bolagsverket (ABL 8:3)`,
      due_date: reportDue.toISOString().split('T')[0],
      period_from: `${year}-01-01`,
      period_to: `${year}-12-31`,
      penalty_if_missed: 'Sanktionsavgift 5 000 – 75 000 kr per år (ABL 8:3)',
    });

    // ── Annual general meeting (Bolagsstämma) — ABL 7:1 ─────────────────────
    // Must be held within 6 months of fiscal year end
    const agmDue = new Date(year, endMonth - 1 + 6, endDay);
    obligations.push({
      entity_id: entityId, org_id: orgId,
      obligation_type: 'SHAREHOLDERS_MEETING',
      authority: 'Intern',
      description: `Ordinarie bolagsstämma ${year} — ska hållas inom 6 månader (ABL 7:1)`,
      due_date: agmDue.toISOString().split('T')[0],
      period_from: `${year}-01-01`,
      period_to: `${year}-12-31`,
      penalty_if_missed: 'Kan leda till likvidation om ej genomförd (ABL 25:1)',
    });
  }

  // ── VAT declarations (Momsdeklaration) — SFL 26:35 ───────────────────────
  // Quarterly for most companies (omsättning 1-40 MSEK)
  if (entity.vat_registered) {
    const quarters = [
      { period: 'Q1', due: `${year}-05-12`, from: `${year}-01-01`, to: `${year}-03-31` },
      { period: 'Q2', due: `${year}-08-12`, from: `${year}-04-01`, to: `${year}-06-30` },
      { period: 'Q3', due: `${year}-11-12`, from: `${year}-07-01`, to: `${year}-09-30` },
      { period: 'Q4', due: `${year + 1}-02-12`, from: `${year}-10-01`, to: `${year}-12-31` },
    ];
    quarters.forEach(q => {
      obligations.push({
        entity_id: entityId, org_id: orgId,
        obligation_type: 'VAT_QUARTERLY',
        authority: 'Skatteverket',
        description: `Momsdeklaration ${q.period} ${year} (SFL 26:35)`,
        due_date: q.due,
        period_from: q.from,
        period_to: q.to,
        penalty_if_missed: 'Skattetillägg 20% av utgående moms + dröjsmålsavgift (SFL 49:4)',
      });
    });
  }

  // ── AGI — Arbetsgivardeklaration (employer declaration) — SFL 26:3 ────────
  // Monthly by the 12th of the following month
  if (entity.f_tax_approved) {
    for (let month = 1; month <= 12; month++) {
      const dueDate = new Date(year, month, 12); // 12th of next month
      obligations.push({
        entity_id: entityId, org_id: orgId,
        obligation_type: 'AGI_MONTHLY',
        authority: 'Skatteverket',
        description: `Arbetsgivardeklaration ${year}-${String(month).padStart(2, '0')} (SFL 26:3)`,
        due_date: dueDate.toISOString().split('T')[0],
        period_from: `${year}-${String(month).padStart(2, '0')}-01`,
        period_to: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
        penalty_if_missed: '625 kr/månad förseningsavgift (SFL 48:1)',
      });
    }

    // ── Corporate tax declaration (Inkomstdeklaration) — SFL 32:1 ───────────
    // Due 1 July for most companies (fiscal year ending 31 Dec)
    obligations.push({
      entity_id: entityId, org_id: orgId,
      obligation_type: 'CORPORATE_TAX',
      authority: 'Skatteverket',
      description: `Inkomstdeklaration ${year} för inkomstår ${year - 1} (SFL 32:1)`,
      due_date: `${year}-07-01`,
      period_from: `${year - 1}-01-01`,
      period_to: `${year - 1}-12-31`,
      penalty_if_missed: 'Skattetillägg 40% + förseningsavgift 6 250 kr (SFL 48:2)',
    });
  }

  // ── Upsert all obligations ────────────────────────────────────────────────
  let count = 0;
  for (const obl of obligations) {
    const { error } = await supabase
      .from('compliance_obligations')
      .upsert(obl, { onConflict: 'entity_id,obligation_type,due_date' });
    if (!error) count++;
  }

  return count;
}

// ─── Helper: get org_id from request ─────────────────────────────────────────
function getOrgId(req: Request): string | null {
  return (req as any).orgId || req.headers['x-org-id'] as string || null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/company/entities — list all entities for org
router.get('/entities', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const { data, error } = await supabase
    .from('company_entities')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/company/entities — create entity
router.post('/entities', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const { data, error } = await supabase
    .from('company_entities')
    .insert({ ...req.body, org_id: orgId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// GET /api/company/entities/:id — entity with full detail
router.get('/entities/:id', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;

  const [entityRes, rolesRes, ownershipRes, docsRes] = await Promise.all([
    supabase.from('company_entities').select('*').eq('id', id).eq('org_id', orgId!).single(),
    supabase.from('company_roles').select('*').eq('entity_id', id).eq('is_active', true).order('role'),
    supabase.from('company_ownership').select('*').eq('entity_id', id).eq('is_active', true).order('share_percentage', { ascending: false }),
    supabase.from('company_documents').select('*').eq('entity_id', id).eq('is_current_version', true).order('document_type'),
  ]);

  if (entityRes.error) return res.status(404).json({ error: 'Entity not found' });

  return res.json({
    entity: entityRes.data,
    roles: rolesRes.data || [],
    ownership: ownershipRes.data || [],
    documents: docsRes.data || [],
  });
});

// GET /api/company/entities/:id/obligations — compliance calendar
router.get('/entities/:id/obligations', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;

  const { data, error } = await supabase
    .from('compliance_obligations')
    .select('*')
    .eq('entity_id', id)
    .eq('org_id', orgId!)
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/company/entities/:id/generate-calendar — auto-generate compliance
router.post('/entities/:id/generate-calendar', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  try {
    const count = await generateComplianceCalendar(id, orgId);
    return res.json({ generated: count, message: `Generated ${count} compliance obligations` });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/company/compliance/overdue — all overdue obligations
router.get('/compliance/overdue', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('compliance_obligations')
    .select('*, company_entities(legal_name, org_number)')
    .eq('org_id', orgId)
    .lt('due_date', today)
    .not('status', 'in', '("SUBMITTED","ACCEPTED","NOT_APPLICABLE")')
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/company/compliance/upcoming — next 30 days
router.get('/compliance/upcoming', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const today = new Date();
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const { data, error } = await supabase
    .from('compliance_obligations')
    .select('*, company_entities(legal_name, org_number)')
    .eq('org_id', orgId)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', in30.toISOString().split('T')[0])
    .not('status', 'in', '("SUBMITTED","ACCEPTED","NOT_APPLICABLE")')
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/company/documents — create/upload document
router.post('/documents', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  // Supersede old version if this is a new version
  if (req.body.supersedes_id) {
    await supabase
      .from('company_documents')
      .update({ is_current_version: false, status: 'SUPERSEDED' })
      .eq('id', req.body.supersedes_id);
  }

  const { data, error } = await supabase
    .from('company_documents')
    .insert({ ...req.body, org_id: orgId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// POST /api/company/filings — record authority filing
router.post('/filings', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const { data, error } = await supabase
    .from('authority_filings')
    .insert({ ...req.body, org_id: orgId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // If linked to an obligation, mark it as submitted
  if (req.body.obligation_id) {
    await supabase
      .from('compliance_obligations')
      .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
      .eq('id', req.body.obligation_id);
  }

  return res.status(201).json(data);
});

// GET /api/company/dashboard — compliance health overview
router.get('/dashboard', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().split('T')[0];

  const [entitiesRes, overdueRes, upcomingRes, compliantRes, allObligationsRes] = await Promise.all([
    supabase.from('company_entities').select('id, legal_name, org_number, legal_form, status').eq('org_id', orgId),
    supabase.from('compliance_obligations').select('id').eq('org_id', orgId).lt('due_date', todayStr).not('status', 'in', '("SUBMITTED","ACCEPTED","NOT_APPLICABLE")'),
    supabase.from('compliance_obligations').select('*').eq('org_id', orgId).gte('due_date', todayStr).lte('due_date', in30Str).not('status', 'in', '("SUBMITTED","ACCEPTED","NOT_APPLICABLE")'),
    supabase.from('compliance_obligations').select('id').eq('org_id', orgId).in('status', ['SUBMITTED', 'ACCEPTED']),
    supabase.from('compliance_obligations').select('*').eq('org_id', orgId).order('due_date', { ascending: true }).limit(20),
  ]);

  return res.json({
    entities: entitiesRes.data || [],
    summary: {
      overdue: overdueRes.data?.length || 0,
      due_soon: upcomingRes.data?.length || 0,
      compliant: compliantRes.data?.length || 0,
    },
    upcoming_obligations: upcomingRes.data || [],
    recent_obligations: allObligationsRes.data || [],
    health_score: calculateHealthScore(
      overdueRes.data?.length || 0,
      upcomingRes.data?.length || 0,
      compliantRes.data?.length || 0,
    ),
  });
});

// PATCH /api/company/compliance/:id/status — update obligation status
router.patch('/compliance/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reference_number, notes } = req.body;

  const updates: any = { status };
  if (reference_number) updates.reference_number = reference_number;
  if (notes) updates.notes = notes;
  if (status === 'SUBMITTED') updates.submitted_at = new Date().toISOString();
  if (status === 'ACCEPTED') updates.accepted_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('compliance_obligations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/company/filings — list authority filings
router.get('/filings', async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'Missing org_id' });

  const { data, error } = await supabase
    .from('authority_filings')
    .select('*, company_entities(legal_name), company_documents(title)')
    .eq('org_id', orgId)
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// ─── Health score calculator ──────────────────────────────────────────────────
function calculateHealthScore(overdue: number, dueSoon: number, compliant: number): number {
  const total = overdue + dueSoon + compliant;
  if (total === 0) return 100;
  const penalty = (overdue * 30) + (dueSoon * 5);
  return Math.max(0, Math.min(100, Math.round(((compliant / total) * 100) - penalty)));
}

export { generateComplianceCalendar };
export default router;
