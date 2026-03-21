/**
 * Damage Management — pixdrift Automotive
 *
 * Fullständigt flöde: Skadeanmälan → Bedömning → Cabas-kalkyl →
 * Försäkringsgodkännande → Reparation → Besiktning → Leverans → Faktura
 *
 * State machine:
 * REPORTED → ASSESSED → CABAS_SUBMITTED → APPROVED → REJECTED →
 * REPAIR_STARTED → REPAIR_DONE → INSPECTION → DELIVERED → CLOSED
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { INSURANCE_COMPANIES } from './integrations/cabas';

const router = Router();

// ─── DB ───────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Types ────────────────────────────────────────────────────────────────────

type DamageType = 'COLLISION' | 'FIRE' | 'THEFT' | 'WEATHER' | 'VANDALISM' | 'GLASS' | 'ANIMAL' | 'OTHER';

type ClaimStatus =
  | 'REPORTED' | 'ASSESSED' | 'CABAS_SUBMITTED' | 'APPROVED' | 'REJECTED'
  | 'REPAIR_STARTED' | 'REPAIR_DONE' | 'INSPECTION' | 'DELIVERED' | 'CLOSED';

type InspectionType = 'PRE_REPAIR' | 'POST_REPAIR' | 'QUALITY_CONTROL';

// Valid state transitions
const STATE_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  REPORTED:        ['ASSESSED'],
  ASSESSED:        ['CABAS_SUBMITTED'],
  CABAS_SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED:        ['REPAIR_STARTED'],
  REJECTED:        ['ASSESSED'],           // kan skickas på nytt efter supplement
  REPAIR_STARTED:  ['REPAIR_DONE'],
  REPAIR_DONE:     ['INSPECTION'],
  INSPECTION:      ['DELIVERED', 'REPAIR_STARTED'], // underkänd → tillbaka
  DELIVERED:       ['CLOSED'],
  CLOSED:          [],
};

function generateClaimNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `SKA-${year}-${rand}`;
}

// ─── DAMAGE CLAIMS ────────────────────────────────────────────────────────────

/**
 * POST /api/damage/claims
 * Skapa nytt skadeärende
 */
router.post('/claims', async (req: Request, res: Response) => {
  const {
    org_id, customer_id, vehicle_vin, vehicle_reg,
    damage_type, damage_description, damage_areas = [],
    photo_urls = [], insurance_company, insurance_company_code,
    insurance_claim_number,
  } = req.body;

  if (!org_id || !damage_type) {
    return res.status(400).json({ error: 'org_id och damage_type krävs.' });
  }

  const validTypes: DamageType[] = ['COLLISION','FIRE','THEFT','WEATHER','VANDALISM','GLASS','ANIMAL','OTHER'];
  if (!validTypes.includes(damage_type)) {
    return res.status(400).json({ error: `Ogiltig damage_type. Tillåtna: ${validTypes.join(', ')}` });
  }

  try {
    const claimNumber = generateClaimNumber();
    const result = await pool.query(
      `INSERT INTO damage_claims (
        org_id, claim_number, customer_id, vehicle_vin, vehicle_reg,
        damage_type, damage_description, damage_areas, photo_urls,
        insurance_company, insurance_company_code, insurance_claim_number,
        status, reported_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'REPORTED',NOW())
      RETURNING *`,
      [
        org_id, claimNumber, customer_id || null, vehicle_vin || null, vehicle_reg || null,
        damage_type, damage_description || null, damage_areas, photo_urls,
        insurance_company || null, insurance_company_code || null, insurance_claim_number || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    console.error('[damage/claims POST]', err);
    res.status(500).json({ error: 'Kunde inte skapa skadeärende.', detail: String(err) });
  }
});

/**
 * GET /api/damage/claims
 * Lista skadeärenden (filtreras på org_id + valfri status)
 */
router.get('/claims', async (req: Request, res: Response) => {
  const { org_id, status, insurance_company_code, limit = 100, offset = 0 } = req.query;

  if (!org_id) return res.status(400).json({ error: 'org_id krävs.' });

  const conditions: string[] = ['org_id = $1'];
  const params: unknown[] = [org_id];
  let idx = 2;

  if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
  if (insurance_company_code) { conditions.push(`insurance_company_code = $${idx++}`); params.push(insurance_company_code); }

  params.push(Number(limit), Number(offset));

  try {
    const result = await pool.query(
      `SELECT * FROM damage_claims WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ claims: result.rows, total: result.rowCount });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

/**
 * GET /api/damage/claims/:id
 * Hämta ett specifikt skadeärende med Cabas-kalkyler
 */
router.get('/claims/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [claimResult, estimatesResult] = await Promise.all([
      pool.query('SELECT * FROM damage_claims WHERE id = $1', [id]),
      pool.query('SELECT * FROM cabas_estimates WHERE damage_claim_id = $1 ORDER BY created_at DESC', [id]),
    ]);

    if (!claimResult.rows.length) return res.status(404).json({ error: 'Skadeärende hittades inte.' });

    res.json({
      ...claimResult.rows[0],
      cabas_estimates: estimatesResult.rows,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

/**
 * PATCH /api/damage/claims/:id/status
 * Uppdatera status med state machine-validering
 */
router.patch('/claims/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status: newStatus, note } = req.body;

  try {
    const current = await pool.query('SELECT status FROM damage_claims WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Skadeärende hittades inte.' });

    const currentStatus = current.rows[0].status as ClaimStatus;
    const allowed = STATE_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Ogiltig statusövergång: ${currentStatus} → ${newStatus}`,
        allowed_transitions: allowed,
      });
    }

    const extraFields: Record<string, unknown> = {};
    if (newStatus === 'APPROVED') extraFields.approved_at = new Date();
    if (newStatus === 'DELIVERED') extraFields.delivered_at = new Date();

    const result = await pool.query(
      `UPDATE damage_claims SET status = $1, ${
        Object.keys(extraFields).map((k, i) => `${k} = $${i + 3}`).join(', ')
      }${Object.keys(extraFields).length ? ', ' : ''}updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStatus, id, ...Object.values(extraFields)]
    );

    res.json({ claim: result.rows[0], note });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

// ─── INSURANCE ────────────────────────────────────────────────────────────────

/**
 * GET /api/damage/insurance-companies
 */
router.get('/insurance-companies', (_req: Request, res: Response) => {
  res.json(INSURANCE_COMPANIES);
});

/**
 * POST /api/damage/claims/:id/submit-to-insurance
 * Skicka Cabas-kalkyl till försäkringsbolag
 */
router.post('/claims/:id/submit-to-insurance', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cabas_estimate_id } = req.body;

  try {
    const claimResult = await pool.query('SELECT * FROM damage_claims WHERE id = $1', [id]);
    if (!claimResult.rows.length) return res.status(404).json({ error: 'Skadeärende hittades inte.' });

    const claim = claimResult.rows[0];

    if (!cabas_estimate_id && !claim.cabas_estimate_id) {
      return res.status(400).json({ error: 'Cabas-kalkyl saknas. Skapa en kalkyl innan du skickar till försäkring.' });
    }

    const insurer = INSURANCE_COMPANIES.find(i => i.code === claim.insurance_company_code);
    const isManual = !insurer || insurer.api_type === 'manual';

    // Uppdatera status
    await pool.query(
      `UPDATE damage_claims SET
        status = 'CABAS_SUBMITTED',
        cabas_estimate_id = COALESCE($2, cabas_estimate_id),
        updated_at = NOW()
       WHERE id = $1`,
      [id, cabas_estimate_id || null]
    );

    res.json({
      claim_id: id,
      status: 'CABAS_SUBMITTED',
      insurance_company: claim.insurance_company,
      submission_type: isManual ? 'manual' : 'cabas_direct',
      message: isManual
        ? `${claim.insurance_company} kräver manuell hantering. Exportera XML och skicka via försäkringsbolagets portal.`
        : `Kalkyl skickad direkt till ${claim.insurance_company} via Cabas.`,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

/**
 * POST /api/damage/claims/:id/insurance-approve
 * Registrera försäkringsgodkännande och starta arbetsorder
 */
router.post('/claims/:id/insurance-approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_amount, conditions, adjuster_name } = req.body;

  if (!approved_amount) return res.status(400).json({ error: 'approved_amount krävs.' });

  try {
    const result = await pool.query(
      `UPDATE damage_claims SET
        status = 'APPROVED',
        cabas_approved_amount = $2,
        adjuster_name = $3,
        approved_at = NOW(),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, approved_amount, adjuster_name || null]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Skadeärende hittades inte.' });

    // TODO: Skapa arbetsorder automatiskt (koppla till work_order_id)
    // TODO: Skicka SMS/email-notis till kund

    res.json({
      claim: result.rows[0],
      approved_amount,
      conditions,
      adjuster_name,
      auto_work_order: true, // Arbetsorder startas automatiskt
      message: 'Godkännande registrerat. Arbetsorder skapad automatiskt.',
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

/**
 * POST /api/damage/claims/:id/insurance-reject
 * Registrera avvisning
 */
router.post('/claims/:id/insurance-reject', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rejection_reason, adjuster_name } = req.body;

  if (!rejection_reason) return res.status(400).json({ error: 'rejection_reason krävs.' });

  try {
    const result = await pool.query(
      `UPDATE damage_claims SET
        status = 'REJECTED',
        rejection_reason = $2,
        adjuster_name = $3,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, rejection_reason, adjuster_name || null]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Skadeärende hittades inte.' });

    res.json({
      claim: result.rows[0],
      message: 'Avvisning registrerad. Skicka tilläggsarbete (supplement) för ny bedömning.',
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

// ─── BESIKTNING (Vehicle Inspection) ─────────────────────────────────────────

/**
 * POST /api/damage/inspection
 * Skapa besiktningsprotokoll
 */
router.post('/inspection', async (req: Request, res: Response) => {
  const {
    claim_id, inspector_id, inspection_type,
    checklist, photos = [], result: inspectionResult, notes, signature_data,
  } = req.body;

  if (!claim_id || !inspection_type || !inspectionResult) {
    return res.status(400).json({ error: 'claim_id, inspection_type och result krävs.' });
  }

  const validTypes: InspectionType[] = ['PRE_REPAIR', 'POST_REPAIR', 'QUALITY_CONTROL'];
  if (!validTypes.includes(inspection_type)) {
    return res.status(400).json({ error: `Ogiltig inspection_type. Tillåtna: ${validTypes.join(', ')}` });
  }

  const validResults = ['PASSED', 'FAILED', 'CONDITIONAL'];
  if (!validResults.includes(inspectionResult)) {
    return res.status(400).json({ error: `Ogiltigt result. Tillåtna: ${validResults.join(', ')}` });
  }

  try {
    // Uppdatera claim-status vid post-repair inspektion
    if (inspection_type === 'POST_REPAIR' || inspection_type === 'QUALITY_CONTROL') {
      if (inspectionResult === 'PASSED') {
        await pool.query(
          `UPDATE damage_claims SET status = 'INSPECTION', updated_at = NOW() WHERE id = $1 AND status = 'REPAIR_DONE'`,
          [claim_id]
        );
      }
    }

    // TODO: Spara i inspections-tabell (koppla till QC-modul)
    const inspection = {
      id: `INS-${Date.now().toString(36).toUpperCase()}`,
      claim_id,
      inspector_id,
      inspection_type,
      checklist: checklist || [],
      photos,
      result: inspectionResult,
      notes,
      has_signature: !!signature_data,
      created_at: new Date().toISOString(),
    };

    res.status(201).json({
      inspection,
      pdf_url: null, // TODO: Generera PDF-protokoll
      message: `Besiktning (${inspection_type}) registrerad: ${inspectionResult}`,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

/**
 * POST /api/damage/claims/:id/close
 * Stäng skadeärende
 * Kräver: repair complete + inspection passed + invoice created
 */
router.post('/claims/:id/close', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { invoice_id, final_notes } = req.body;

  try {
    const claimResult = await pool.query('SELECT * FROM damage_claims WHERE id = $1', [id]);
    if (!claimResult.rows.length) return res.status(404).json({ error: 'Skadeärende hittades inte.' });

    const claim = claimResult.rows[0];

    // Validera att alla steg är klara
    if (!['DELIVERED', 'INSPECTION'].includes(claim.status)) {
      return res.status(400).json({
        error: 'Kan inte stänga ärendet än.',
        current_status: claim.status,
        required: 'Status måste vara INSPECTION eller DELIVERED.',
      });
    }

    const result = await pool.query(
      `UPDATE damage_claims SET
        status = 'CLOSED',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // TODO: Generera slutdokument (PDF med hela ärendehistoriken)
    // TODO: Arkivera alla foton och dokument
    // TODO: Skicka slutnotering till kund

    res.json({
      claim: result.rows[0],
      invoice_id,
      final_notes,
      summary: {
        claim_number: claim.claim_number,
        vehicle_reg: claim.vehicle_reg,
        reported_at: claim.reported_at,
        closed_at: new Date().toISOString(),
        approved_amount: claim.cabas_approved_amount,
        insurance_company: claim.insurance_company,
      },
      message: 'Skadeärende stängt. Slutdokument genereras.',
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

// ─── CABAS ESTIMATES ─────────────────────────────────────────────────────────

/**
 * POST /api/damage/claims/:id/cabas-estimate
 * Spara Cabas-kalkyl kopplad till skadeärende
 */
router.post('/claims/:id/cabas-estimate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    org_id, cabas_external_id, workshop_code,
    vehicle_reg, vin, damage_areas,
    labor_cost = 0, parts_cost = 0, paint_cost = 0,
    insurance_company, insurance_claim_number,
    xml_payload,
  } = req.body;

  if (!org_id) return res.status(400).json({ error: 'org_id krävs.' });

  const totalExVat = labor_cost + parts_cost + paint_cost;
  const totalInVat = totalExVat * 1.25;

  try {
    const result = await pool.query(
      `INSERT INTO cabas_estimates (
        org_id, damage_claim_id, cabas_external_id, workshop_code,
        vehicle_reg, vin, damage_areas, labor_cost, parts_cost, paint_cost,
        total_excl_vat, total_incl_vat, insurance_company, insurance_claim_number,
        status, xml_payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'DRAFT',$15)
      RETURNING *`,
      [
        org_id, id, cabas_external_id || null, workshop_code || null,
        vehicle_reg || null, vin || null, JSON.stringify(damage_areas || []),
        labor_cost, parts_cost, paint_cost, totalExVat, totalInVat,
        insurance_company || null, insurance_claim_number || null,
        xml_payload || null,
      ]
    );

    // Uppdatera cabas_estimate_id på claim
    await pool.query(
      `UPDATE damage_claims SET cabas_estimate_id = $1, cabas_estimate_amount = $2 WHERE id = $3`,
      [result.rows[0].id, totalInVat, id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Databasfel.', detail: String(err) });
  }
});

export default router;
