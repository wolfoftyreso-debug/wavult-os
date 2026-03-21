/**
 * terminology.ts — Mirror Mode: Konfigurerbar terminologi per källsystem
 *
 * Verkstäder som byter från Automaster, Winbas eller Keyloop ser EXAKT
 * samma ord som de är vana vid. pixdrift anpassar sig — inte tvärtom.
 *
 * GET  /api/config/terminology  → returnerar aktuell terminologi för org
 * POST /api/config/terminology  → sätt preset eller custom mapping
 */

import { Router, Request, Response } from 'express';

export type TerminologyKey =
  | 'work_order'
  | 'customer'
  | 'vehicle'
  | 'technician'
  | 'parts'
  | 'warranty'
  | 'invoice'
  | 'estimate'
  | 'appointment';

export type TerminologyPreset = Record<TerminologyKey, string>;

export const TERMINOLOGY_PRESETS: Record<string, TerminologyPreset> = {
  automaster: {
    work_order:  'Serviceorder',
    customer:    'Ägare',
    vehicle:     'Fordon',
    technician:  'Tekniker',
    parts:       'Artiklar',
    warranty:    'Garanti',
    invoice:     'Faktura',
    estimate:    'Kalkyl',
    appointment: 'Bokning',
  },
  winbas: {
    work_order:  'Arbetsorder',
    customer:    'Kund',
    vehicle:     'Bil',
    technician:  'Mekaniker',
    parts:       'Reservdelar',
    warranty:    'Garantiärende',
    invoice:     'Faktura',
    estimate:    'Offert',
    appointment: 'Tid',
  },
  keyloop: {
    work_order:  'RO (Repair Order)',
    customer:    'Customer',
    vehicle:     'Vehicle',
    technician:  'Technician',
    parts:       'Parts',
    warranty:    'Warranty Claim',
    invoice:     'Invoice',
    estimate:    'Estimate',
    appointment: 'Appointment',
  },
  default: {
    work_order:  'Arbetsorder',
    customer:    'Kund',
    vehicle:     'Fordon',
    technician:  'Tekniker',
    parts:       'Reservdelar',
    warranty:    'Garantiärende',
    invoice:     'Faktura',
    estimate:    'Offert',
    appointment: 'Bokning',
  },
};

// In-memory store (replace with DB lookup in production)
const orgTerminology: Map<string, TerminologyPreset> = new Map();

export function getTerminology(orgId: string): TerminologyPreset {
  return orgTerminology.get(orgId) ?? TERMINOLOGY_PRESETS.default;
}

export function setTerminology(
  orgId: string,
  preset: string | null,
  custom?: Partial<TerminologyPreset>
): TerminologyPreset {
  let base: TerminologyPreset;

  if (preset && TERMINOLOGY_PRESETS[preset]) {
    base = { ...TERMINOLOGY_PRESETS[preset] };
  } else {
    base = { ...TERMINOLOGY_PRESETS.default };
  }

  if (custom) {
    base = { ...base, ...custom };
  }

  orgTerminology.set(orgId, base);
  return base;
}

// ─── Express router ────────────────────────────────────────────────────────────

export const terminologyRouter = Router();

/**
 * GET /api/config/terminology
 * Returns current terminology for the authenticated org.
 */
terminologyRouter.get('/', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'default';
  const terminology = getTerminology(orgId);
  res.json({
    org_id: orgId,
    terminology,
    available_presets: Object.keys(TERMINOLOGY_PRESETS),
  });
});

/**
 * POST /api/config/terminology
 * Body: { preset: 'automaster' } or { custom: { work_order: 'Serviceuppdrag' } }
 * or both: { preset: 'winbas', custom: { vehicle: 'Maskin' } }
 */
terminologyRouter.post('/', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'default';
  const { preset, custom } = req.body as {
    preset?: string;
    custom?: Partial<TerminologyPreset>;
  };

  if (!preset && !custom) {
    return res.status(400).json({ error: 'Provide preset or custom mapping' });
  }

  if (preset && !TERMINOLOGY_PRESETS[preset]) {
    return res.status(400).json({
      error: `Unknown preset '${preset}'`,
      available: Object.keys(TERMINOLOGY_PRESETS),
    });
  }

  const result = setTerminology(orgId, preset ?? null, custom);
  res.json({
    org_id: orgId,
    terminology: result,
    source: preset ? `preset:${preset}` : 'custom',
  });
});
