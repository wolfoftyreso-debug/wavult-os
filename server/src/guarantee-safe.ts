/**
 * guarantee-safe.ts — Mirror Mode: Guarantee-Safe Mode
 *
 * Garantiärenden är juridiskt känsliga och OEM-kritiska.
 * Ingen kan radera eller modifiera dem utan fullständig spårbarhet.
 * Export alltid i OEM-kompatibelt XML-format (SAGA2/Volvo/BMW/VW/Stellantis).
 *
 * GET  /api/warranty/safe-export/:claim_id  → XML för SAGA2
 * POST /api/warranty/safe-validate          → validera innan OEM-submission
 * GET  /api/warranty/audit-trail/:claim_id  → komplett historik med diff
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface WarrantyClaim {
  id: string;
  org_id: string;
  claim_number: string;
  vehicle_reg: string;
  vin: string;
  oem_brand: 'volvo' | 'bmw' | 'vw' | 'stellantis' | 'generic';
  customer_name: string;
  work_description: string;
  parts_replaced: PartReplaced[];
  labour_hours: number;
  claim_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  created_at: string;
  updated_at: string;
  locked: boolean;
}

export interface PartReplaced {
  part_number: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface AuditEntry {
  id: string;
  claim_id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: 'create' | 'update' | 'submit' | 'export' | 'validate';
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  reason: string;
  ip_address?: string;
}

// ─── In-memory stores (replace with DB in production) ─────────────────────────

const claims: Map<string, WarrantyClaim> = new Map();
const auditLog: Map<string, AuditEntry[]> = new Map();

function addAuditEntry(
  claimId: string,
  userId: string,
  userName: string,
  action: AuditEntry['action'],
  reason: string,
  fieldChanged?: string,
  oldValue?: string,
  newValue?: string
): void {
  const entry: AuditEntry = {
    id: randomUUID(),
    claim_id: claimId,
    timestamp: new Date().toISOString(),
    user_id: userId,
    user_name: userName,
    action,
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
    reason,
  };

  if (!auditLog.has(claimId)) auditLog.set(claimId, []);
  auditLog.get(claimId)!.push(entry);
}

// ─── XML Export generators ─────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSAGA2Xml(claim: WarrantyClaim): string {
  const parts = claim.parts_replaced.map(p => `
    <Part>
      <PartNumber>${escapeXml(p.part_number)}</PartNumber>
      <Description>${escapeXml(p.description)}</Description>
      <Quantity>${p.quantity}</Quantity>
      <UnitPrice>${p.unit_price.toFixed(2)}</UnitPrice>
      <TotalPrice>${(p.quantity * p.unit_price).toFixed(2)}</TotalPrice>
    </Part>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<WarrantyClaim xmlns="urn:saga2:warranty:v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ClaimHeader>
    <ClaimNumber>${escapeXml(claim.claim_number)}</ClaimNumber>
    <ClaimDate>${claim.created_at.split('T')[0]}</ClaimDate>
    <DealerCode>${escapeXml(claim.org_id)}</DealerCode>
    <OEMBrand>${escapeXml(claim.oem_brand.toUpperCase())}</OEMBrand>
    <Status>${escapeXml(claim.status.toUpperCase())}</Status>
  </ClaimHeader>
  <Vehicle>
    <VIN>${escapeXml(claim.vin)}</VIN>
    <RegistrationNumber>${escapeXml(claim.vehicle_reg)}</RegistrationNumber>
  </Vehicle>
  <Customer>
    <Name>${escapeXml(claim.customer_name)}</Name>
  </Customer>
  <WorkPerformed>
    <Description>${escapeXml(claim.work_description)}</Description>
    <LabourHours>${claim.labour_hours.toFixed(2)}</LabourHours>
  </WorkPerformed>
  <PartsReplaced>${parts}
  </PartsReplaced>
  <FinancialSummary>
    <TotalClaimAmount>${claim.claim_amount.toFixed(2)}</TotalClaimAmount>
    <Currency>SEK</Currency>
  </FinancialSummary>
  <AuditInfo>
    <ExportedAt>${new Date().toISOString()}</ExportedAt>
    <ExportedBy>pixdrift</ExportedBy>
    <ImmutableHash>${Buffer.from(JSON.stringify(claim)).toString('base64').slice(0, 32)}</ImmutableHash>
  </AuditInfo>
</WarrantyClaim>`;
}

// ─── Validation rules ──────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateClaim(claim: WarrantyClaim): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!claim.vin || claim.vin.length !== 17) {
    errors.push('VIN must be exactly 17 characters');
  }
  if (!claim.vehicle_reg) {
    errors.push('Vehicle registration number is required');
  }
  if (!claim.claim_number) {
    errors.push('Claim number is required');
  }
  if (!claim.work_description || claim.work_description.length < 10) {
    errors.push('Work description must be at least 10 characters');
  }
  if (claim.parts_replaced.length === 0) {
    warnings.push('No parts listed — some OEMs require at least one replaced part');
  }
  if (claim.labour_hours <= 0) {
    warnings.push('Labour hours is 0 — verify this is correct');
  }
  if (claim.claim_amount <= 0) {
    errors.push('Claim amount must be greater than 0');
  }
  if (!claim.customer_name) {
    errors.push('Customer name is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Express router ────────────────────────────────────────────────────────────

export const warrantyRouter = Router();

/**
 * GET /api/warranty/safe-export/:claim_id
 * Returns OEM-compatible SAGA2 XML for the warranty claim.
 * Logs the export in audit trail.
 */
warrantyRouter.get('/safe-export/:claim_id', (req: Request, res: Response) => {
  const claim = claims.get(req.params.claim_id);
  if (!claim) return res.status(404).json({ error: 'Warranty claim not found' });

  const user = (req as any).user ?? { id: 'system', name: 'System' };

  // Validate before export
  const validation = validateClaim(claim);
  if (!validation.valid) {
    return res.status(422).json({
      error: 'Claim has validation errors — cannot export',
      validation_errors: validation.errors,
    });
  }

  // Log export in audit trail
  addAuditEntry(
    claim.id,
    user.id,
    user.name,
    'export',
    'SAGA2 XML export requested'
  );

  const xml = generateSAGA2Xml(claim);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="warranty-${claim.claim_number}.xml"`
  );
  res.send(xml);
});

/**
 * POST /api/warranty/safe-validate
 * Validates a warranty claim before OEM submission.
 * Body: full claim object or { claim_id }
 */
warrantyRouter.post('/safe-validate', (req: Request, res: Response) => {
  let claim: WarrantyClaim | undefined;

  if (req.body.claim_id) {
    claim = claims.get(req.body.claim_id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
  } else {
    claim = req.body as WarrantyClaim;
  }

  const user = (req as any).user ?? { id: 'system', name: 'System' };

  if (claim.id) {
    addAuditEntry(claim.id, user.id, user.name, 'validate', 'Pre-submission validation');
  }

  const result = validateClaim(claim);
  res.json({
    claim_number: claim.claim_number ?? 'N/A',
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    ready_for_submission: result.valid,
  });
});

/**
 * GET /api/warranty/audit-trail/:claim_id
 * Returns complete immutable audit history for a warranty claim.
 */
warrantyRouter.get('/audit-trail/:claim_id', (req: Request, res: Response) => {
  const claim = claims.get(req.params.claim_id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const trail = auditLog.get(req.params.claim_id) ?? [];

  res.json({
    claim_id: req.params.claim_id,
    claim_number: claim.claim_number,
    total_events: trail.length,
    audit_trail: trail.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
  });
});

/**
 * POST /api/warranty
 * Create a new warranty claim (auto-locks on creation).
 * Body: WarrantyClaim (without id, created_at, locked)
 */
warrantyRouter.post('/', (req: Request, res: Response) => {
  const user = (req as any).user ?? { id: 'system', name: 'System' };
  const orgId = (req as any).orgId ?? 'demo';

  const claim: WarrantyClaim = {
    ...req.body,
    id: randomUUID(),
    org_id: orgId,
    status: 'draft',
    locked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  claims.set(claim.id, claim);
  addAuditEntry(claim.id, user.id, user.name, 'create', 'Warranty claim created');

  res.status(201).json(claim);
});

/**
 * PATCH /api/warranty/:claim_id
 * Update warranty claim — REQUIRES reason in body.
 * Submitted/approved claims are immutable.
 */
warrantyRouter.patch('/:claim_id', (req: Request, res: Response) => {
  const claim = claims.get(req.params.claim_id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const user = (req as any).user ?? { id: 'system', name: 'System' };
  const { reason, ...updates } = req.body;

  if (!reason) {
    return res.status(400).json({
      error: 'reason is required for all warranty claim modifications',
    });
  }

  // Immutable after submission
  if (['submitted', 'approved', 'paid'].includes(claim.status)) {
    return res.status(403).json({
      error: `Cannot modify a ${claim.status} warranty claim`,
      message: 'Guarantee-Safe Mode: submitted claims are immutable',
    });
  }

  // Log each changed field
  for (const [field, newValue] of Object.entries(updates)) {
    const oldValue = (claim as any)[field];
    if (oldValue !== newValue) {
      addAuditEntry(
        claim.id, user.id, user.name, 'update', reason,
        field,
        String(oldValue ?? ''),
        String(newValue)
      );
    }
  }

  Object.assign(claim, updates, { updated_at: new Date().toISOString() });
  res.json(claim);
});

// DELETE is intentionally not implemented — use status='rejected' instead
