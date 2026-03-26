// mobility-incident-api.ts — Pixdrift Mobility Incident Flow Engine
// Core principle: "Breakdowns are not events. They are financial flows."
//
// State machine: 12 states
// INCIDENT_CREATED → TOW_ORDERED → TOW_EN_ROUTE → VEHICLE_COLLECTED
// → VEHICLE_IN_TRANSIT → VEHICLE_DELIVERED → RESPONSIBILITY_DETERMINED
// → CLAIM_SUBMITTED → CLAIM_APPROVED / CLAIM_REJECTED → SETTLED → CLOSED

import { Router, Request, Response } from 'express';
import { pool } from './supabase';

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleContext {
  oem_mobility_active?: boolean;
  warranty_active?: boolean;
  warranty_months_remaining?: number;
  months_since_last_service_here?: number;
  has_roadside_insurance?: boolean;
  last_service_date?: string;
  oem_program?: string;
}

interface ResponsibilityResult {
  rule_id: string;
  party: string;
  reason: string;
  action: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ─── Responsibility Engine ─────────────────────────────────────────────────────
// Determines WHO pays based on vehicle history, OEM programs, warranties, insurance.
// Rules run in priority order — first match wins.
const RESPONSIBILITY_RULES: {
  id: string;
  check: (v: VehicleContext) => boolean;
  party: string;
  reason: string;
  action: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}[] = [
  {
    id: 'OEM_MOBILITY',
    check: (v) => v.oem_mobility_active === true,
    party: 'OEM_MOBILITY',
    reason: 'Fordonet omfattas av OEM-mobilitetsprogram. Bärgning täcks av fabrikanten.',
    action: 'Fakturera via OEM-garantiportal',
    confidence: 'HIGH',
  },
  {
    id: 'WARRANTY_ACTIVE',
    check: (v) => !!(v.warranty_active && (v.warranty_months_remaining ?? 0) > 0),
    party: 'OEM_MOBILITY',
    reason: 'Fordonet är under fabriksgaranti. OEM ansvarar för bärgning.',
    action: 'Skicka garantianmälan till OEM',
    confidence: 'HIGH',
  },
  {
    id: 'RECENT_SERVICE',
    check: (v) => (v.months_since_last_service_here ?? 999) <= 3,
    party: 'PENDING_DETERMINATION',
    reason: 'Fordonet servades här för < 3 månader sedan. Möjlig servicekoppling.',
    action: 'Granska senaste serviceprotokoll innan ansvar fastställs',
    confidence: 'MEDIUM',
  },
  {
    id: 'INSURANCE',
    check: (v) => v.has_roadside_insurance === true,
    party: 'INSURANCE',
    reason: 'Kunden har vägassistansförsäkring.',
    action: 'Vidarebefordra till försäkringsbolag',
    confidence: 'HIGH',
  },
  {
    id: 'DEFAULT',
    check: () => true,
    party: 'CUSTOMER',
    reason: 'Ingen täckning identifierad. Kunden ansvarar för bärgningskostnaden.',
    action: 'Informera kund om kostnad innan bärgning bekräftas',
    confidence: 'HIGH',
  },
];

function runResponsibilityEngine(vehicle: VehicleContext): ResponsibilityResult {
  for (const rule of RESPONSIBILITY_RULES) {
    if (rule.check(vehicle)) {
      return {
        rule_id: rule.id,
        party: rule.party,
        reason: rule.reason,
        action: rule.action,
        confidence: rule.confidence,
      };
    }
  }
  // Fallback (should never reach here)
  return {
    rule_id: 'FALLBACK',
    party: 'CUSTOMER',
    reason: 'Standardregel: kunden ansvarar.',
    action: 'Informera kunden',
    confidence: 'LOW',
  };
}

// ─── Cost split calculator ────────────────────────────────────────────────────
function calculateCostSplit(
  party: string,
  towing_cost: number,
  labor_estimate: number,
  parts_estimate: number,
) {
  const total = towing_cost + labor_estimate + parts_estimate;

  if (party === 'OEM_MOBILITY') {
    return {
      towing:   { party: 'OEM_MOBILITY',  amount: towing_cost,      label: 'Täcks av OEM/garanti' },
      labor:    { party: 'CUSTOMER',       amount: labor_estimate,   label: 'Kundens ansvar' },
      parts:    { party: 'CUSTOMER',       amount: parts_estimate,   label: 'Kundens ansvar' },
      total,
      claim_recipient: 'OEM',
      suggested_claim_amount: towing_cost,
    };
  }

  if (party === 'INSURANCE') {
    return {
      towing:   { party: 'INSURANCE',    amount: towing_cost,       label: 'Täcks av försäkring' },
      labor:    { party: 'CUSTOMER',     amount: labor_estimate,    label: 'Kundens ansvar' },
      parts:    { party: 'CUSTOMER',     amount: parts_estimate,    label: 'Kundens ansvar' },
      total,
      claim_recipient: 'INSURANCE',
      suggested_claim_amount: towing_cost,
    };
  }

  if (party === 'SERVING_WORKSHOP') {
    return {
      towing:   { party: 'SERVING_WORKSHOP', amount: towing_cost,   label: 'Verkstadens ansvar' },
      labor:    { party: 'SERVING_WORKSHOP', amount: labor_estimate, label: 'Verkstadens ansvar' },
      parts:    { party: 'CUSTOMER',         amount: parts_estimate, label: 'Kundens ansvar' },
      total,
      claim_recipient: 'INTERNAL',
      suggested_claim_amount: towing_cost + labor_estimate,
    };
  }

  if (party === 'PENDING_DETERMINATION') {
    return {
      towing:   { party: 'PENDING', amount: towing_cost,   label: 'Avgörs efter granskning' },
      labor:    { party: 'PENDING', amount: labor_estimate, label: 'Avgörs efter granskning' },
      parts:    { party: 'PENDING', amount: parts_estimate, label: 'Avgörs efter granskning' },
      total,
      claim_recipient: 'PENDING',
      suggested_claim_amount: null,
    };
  }

  // CUSTOMER (default)
  return {
    towing:   { party: 'CUSTOMER', amount: towing_cost,   label: 'Kundens ansvar' },
    labor:    { party: 'CUSTOMER', amount: labor_estimate, label: 'Kundens ansvar' },
    parts:    { party: 'CUSTOMER', amount: parts_estimate, label: 'Kundens ansvar' },
    total,
    claim_recipient: 'CUSTOMER',
    suggested_claim_amount: null,
  };
}

// ─── PIX event emitter ────────────────────────────────────────────────────────
async function emitPixEvent(
  incidentId: string,
  type: string,
  payload: object,
) {
  try {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      incident_id: incidentId,
      ...payload,
    };
    // Append to pix_events array
    await pool.query(
      `UPDATE mobility_incidents
       SET pix_events = pix_events || $1::jsonb
       WHERE id = $2`,
      [JSON.stringify([event]), incidentId],
    );
  } catch (err) {
    console.error('[PIX] Failed to emit event:', type, err);
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getOrgId(req: Request): string {
  return (req as any).orgId || req.headers['x-org-id'] as string || '00000000-0000-0000-0000-000000000000';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/mobility/incident
// Creates a new mobility incident and runs quick responsibility pre-check
router.post('/incident', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const {
      vehicle_reg, vehicle_vin, vehicle_make, vehicle_model, vehicle_year,
      customer_name, customer_phone,
      issue_type, urgency = 'NORMAL',
      incident_location, incident_lat, incident_lng,
      customer_description,
      vehicle_context = {},
    } = req.body;

    if (!vehicle_reg || !issue_type) {
      return res.status(400).json({ error: 'vehicle_reg and issue_type are required' });
    }

    // Quick responsibility pre-check
    const quickResponsibility = runResponsibilityEngine(vehicle_context as VehicleContext);

    // Fetch suggested tow providers for org
    const towResult = await pool.query(
      `SELECT * FROM tow_providers
       WHERE org_id = $1 AND is_active = true
       ORDER BY is_preferred DESC, average_eta_minutes ASC
       LIMIT 5`,
      [orgId],
    );

    const result = await pool.query(
      `INSERT INTO mobility_incidents (
        org_id, vehicle_reg, vehicle_vin, vehicle_make, vehicle_model, vehicle_year,
        customer_name, customer_phone,
        issue_type, urgency, incident_location, incident_lat, incident_lng,
        customer_description,
        responsibility_party, responsibility_reason, responsibility_evidence,
        status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'INCIDENT_CREATED')
      RETURNING *`,
      [
        orgId, vehicle_reg, vehicle_vin, vehicle_make, vehicle_model, vehicle_year,
        customer_name, customer_phone,
        issue_type, urgency, incident_location, incident_lat, incident_lng,
        customer_description,
        quickResponsibility.party, quickResponsibility.reason,
        JSON.stringify(vehicle_context),
      ],
    );

    const incident = result.rows[0] as any;

    await emitPixEvent((incident as any).id, 'incident_pix', {
      vehicle_reg,
      issue_type,
      urgency,
      location: incident_location,
      responsibility_preview: quickResponsibility.party,
    });

    res.status(201).json({
      incident,
      responsibility_preview: quickResponsibility,
      suggested_tow_providers: towResult.rows,
    });
  } catch (err: any) {
    console.error('[mobility] POST /incident error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/order-tow
router.post('/:id/order-tow', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { provider_id, provider_name, provider_phone, eta_minutes, cost_estimate, notes } = req.body;

    const etaTime = new Date(Date.now() + (eta_minutes || 35) * 60 * 1000);

    let providerName = provider_name;
    let providerPhone = provider_phone;

    if (provider_id) {
      const prov = await pool.query('SELECT * FROM tow_providers WHERE id = $1', [provider_id]);
      if ((prov.rows as any[])[0]) {
        providerName = (prov.rows as any[])[0].name;
        providerPhone = (prov.rows as any[])[0].phone;
      }
    }

    const result = await pool.query(
      `UPDATE mobility_incidents SET
        tow_provider = $1,
        tow_provider_phone = $2,
        tow_ordered_at = NOW(),
        tow_eta = $3,
        tow_cost_estimate = $4,
        status = 'TOW_ORDERED'
       WHERE id = $5 AND status = 'INCIDENT_CREATED'
       RETURNING *`,
      [providerName, providerPhone, etaTime.toISOString(), cost_estimate, id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Incident not found or already in progress' });
    }

    await emitPixEvent(id, 'tow_pix', {
      action: 'ordered',
      provider: providerName,
      eta_minutes,
      eta_time: etaTime.toISOString(),
      cost_estimate,
      notes,
    });

    res.json({
      incident: result.rows[0],
      sms_sent: `SMS skickat: "Bärgning är beställd. ETA: ${eta_minutes || 35} min. Bärgare: ${providerName}"`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/tow-en-route
router.post('/:id/tow-en-route', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE mobility_incidents SET status = 'TOW_EN_ROUTE'
       WHERE id = $1 AND status = 'TOW_ORDERED' RETURNING *`,
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found or wrong state' });
    await emitPixEvent(id, 'tow_pix', { action: 'en_route' });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/vehicle-collected
router.post('/:id/vehicle-collected', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE mobility_incidents SET
        vehicle_collected_at = NOW(),
        status = 'VEHICLE_COLLECTED'
       WHERE id = $1 AND status IN ('TOW_ORDERED','TOW_EN_ROUTE')
       RETURNING *`,
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found or wrong state' });
    await emitPixEvent(id, 'tow_pix', { action: 'collected' });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/vehicle-in-transit
router.post('/:id/vehicle-in-transit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE mobility_incidents SET status = 'VEHICLE_IN_TRANSIT'
       WHERE id = $1 AND status = 'VEHICLE_COLLECTED' RETURNING *`,
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found or wrong state' });
    await emitPixEvent(id, 'tow_pix', { action: 'in_transit' });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/vehicle-delivered
router.post('/:id/vehicle-delivered', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actual_cost, workshop_id, workshop_name } = req.body;
    const result = await pool.query(
      `UPDATE mobility_incidents SET
        vehicle_delivered_at = NOW(),
        tow_actual_cost = COALESCE($1, tow_cost_estimate),
        receiving_workshop_id = $2,
        receiving_workshop_name = $3,
        status = 'VEHICLE_DELIVERED'
       WHERE id = $4 AND status IN ('VEHICLE_COLLECTED','VEHICLE_IN_TRANSIT')
       RETURNING *`,
      [actual_cost, workshop_id, workshop_name, id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found or wrong state' });
    await emitPixEvent(id, 'tow_pix', {
      action: 'delivered',
      actual_cost,
      workshop: workshop_name,
    });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/determine-responsibility
// Full responsibility engine run — stores result and suggests cost split
router.post('/:id/determine-responsibility', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { manual_override, evidence = {} } = req.body;

    let result: ResponsibilityResult;

    if (manual_override) {
      result = {
        rule_id: 'MANUAL_OVERRIDE',
        party: manual_override,
        reason: `Manuellt fastställt av handläggare.`,
        action: 'Kontrollera dokumentation',
        confidence: 'HIGH',
      };
    } else {
      result = runResponsibilityEngine(evidence as VehicleContext);
    }

    const dbResult = await pool.query(
      `UPDATE mobility_incidents SET
        responsibility_party = $1,
        responsibility_reason = $2,
        responsibility_determined_at = NOW(),
        responsibility_evidence = $3,
        status = 'RESPONSIBILITY_DETERMINED'
       WHERE id = $4
       RETURNING *`,
      [result.party, result.reason, JSON.stringify(evidence), id],
    );

    if (!dbResult.rows[0]) return res.status(404).json({ error: 'Incident not found' });

    await emitPixEvent(id, 'responsibility_pix', {
      party: result.party,
      rule_id: result.rule_id,
      confidence: result.confidence,
      manual: !!manual_override,
    });

    res.json({
      incident: dbResult.rows[0],
      responsibility: result,
      next_action: result.action,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/allocate-costs
router.post('/:id/allocate-costs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { towing_cost = 0, labor_estimate = 0, parts_estimate = 0 } = req.body;

    const incidentResult = await pool.query(
      'SELECT * FROM mobility_incidents WHERE id = $1',
      [id],
    );
    if (!incidentResult.rows[0]) return res.status(404).json({ error: 'Incident not found' });

    const incident = incidentResult.rows[0] as any;
    const party = (incident as any).responsibility_party || 'CUSTOMER';

    const split = calculateCostSplit(party, towing_cost, labor_estimate, parts_estimate);

    await pool.query(
      `UPDATE mobility_incidents SET
        cost_split = $1,
        total_cost = $2,
        claim_amount = $3
       WHERE id = $4`,
      [JSON.stringify(split), split.total, split.suggested_claim_amount, id],
    );

    await emitPixEvent(id, 'cost_pix', {
      party,
      total: split.total,
      claim_recipient: split.claim_recipient,
      suggested_claim: split.suggested_claim_amount,
    });

    res.json({
      cost_split: split,
      suggested_claim_amount: split.suggested_claim_amount,
      claim_recipient: split.claim_recipient,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/submit-claim
router.post('/:id/submit-claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { claim_recipient, amount, supporting_docs, external_claim_id } = req.body;

    const claimId = external_claim_id || `PIX-CLM-${Date.now()}`;

    const result = await pool.query(
      `UPDATE mobility_incidents SET
        claim_id = $1,
        claim_amount = $2,
        claim_submitted_at = NOW(),
        status = 'CLAIM_SUBMITTED'
       WHERE id = $3
       RETURNING *`,
      [claimId, amount, id],
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Incident not found' });

    await emitPixEvent(id, 'claim_pix', {
      action: 'submitted',
      claim_id: claimId,
      recipient: claim_recipient,
      amount,
    });

    res.json({
      incident: result.rows[0],
      claim_id: claimId,
      claim_recipient,
      amount,
      message: `Skadeanmälan ${claimId} skickad till ${claim_recipient}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/approve-claim
router.post('/:id/approve-claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paid_amount } = req.body;
    const result = await pool.query(
      `UPDATE mobility_incidents SET
        claim_approved_at = NOW(),
        claim_amount = COALESCE($1, claim_amount),
        status = 'CLAIM_APPROVED'
       WHERE id = $2 AND status = 'CLAIM_SUBMITTED'
       RETURNING *`,
      [paid_amount, id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found or wrong state' });
    await emitPixEvent(id, 'claim_pix', { action: 'approved', paid_amount });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/reject-claim
router.post('/:id/reject-claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE mobility_incidents SET
        claim_rejected_at = NOW(),
        status = 'CLAIM_REJECTED'
       WHERE id = $2 AND status = 'CLAIM_SUBMITTED'
       RETURNING *`,
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found or wrong state' });
    await emitPixEvent(id, 'claim_pix', { action: 'rejected', reason });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/settle
router.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paid_at } = req.body;
    const result = await pool.query(
      `UPDATE mobility_incidents SET
        claim_paid_at = COALESCE($1, NOW()),
        status = 'SETTLED',
        resolved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [paid_at, id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Incident not found' });
    await emitPixEvent(id, 'claim_pix', { action: 'settled' });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobility/:id/close
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE mobility_incidents SET status = 'CLOSED', resolved_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET endpoints ─────────────────────────────────────────────────────────────

// GET /api/mobility/active — all active incidents for org
router.get('/active', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const result = await pool.query(
      `SELECT * FROM mobility_incidents
       WHERE org_id = $1
         AND status NOT IN ('SETTLED','CLOSED')
       ORDER BY
         CASE urgency WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
         created_at DESC`,
      [orgId],
    );
    res.json({ incidents: result.rows, count: result.rowCount ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mobility/vehicle/:reg — incident history for a vehicle
router.get('/vehicle/:reg', async (req: Request, res: Response) => {
  try {
    const { reg } = req.params;
    const result = await pool.query(
      `SELECT * FROM mobility_incidents
       WHERE vehicle_reg = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [reg],
    );
    res.json({ incidents: result.rows, count: result.rowCount ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mobility/:id — full incident with complete timeline
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM mobility_incidents WHERE id = $1',
      [id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tow provider management ──────────────────────────────────────────────────

router.get('/providers/list', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const result = await pool.query(
      `SELECT * FROM tow_providers WHERE org_id = $1 AND is_active = true
       ORDER BY is_preferred DESC, average_eta_minutes ASC`,
      [orgId],
    );
    res.json({ providers: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/providers', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const {
      name, phone, coverage_areas = [], average_eta_minutes, hourly_rate,
      base_fee, per_km_rate, is_preferred = false,
    } = req.body;
    const result = await pool.query(
      `INSERT INTO tow_providers
        (org_id, name, phone, coverage_areas, average_eta_minutes, hourly_rate, base_fee, per_km_rate, is_preferred)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [orgId, name, phone, coverage_areas, average_eta_minutes, hourly_rate, base_fee, per_km_rate, is_preferred],
    );
    res.status(201).json({ provider: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
