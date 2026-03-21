/**
 * Cabas Integration — pixdrift
 *
 * Cabas är det dominerande nordiska systemet för skadeberäkning (karosseri/lack).
 * API: XML/SOAP (äldre) + REST-endpoint (nyare)
 * Auth: Basic auth (verkstadskod + lösenord)
 *
 * Shadow-mode: Om CABAS_API_URL inte är satt körs systemet i shadow-mode —
 * XML-export genereras men inget riktigt API-anrop görs.
 * Perfekt för MVP och demo utan Cabas-licensnyckel.
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const router = Router();

const CABAS_BASE_URL = process.env.CABAS_API_URL || '';
const CABAS_WORKSHOP_CODE = process.env.CABAS_WORKSHOP_CODE || '';
const CABAS_PASSWORD = process.env.CABAS_PASSWORD || '';
const SHADOW_MODE = !CABAS_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DamageAreaCode =
  | 'FRONT_BUMPER' | 'REAR_BUMPER' | 'HOOD' | 'TRUNK'
  | 'ROOF' | 'LEFT_DOOR_FRONT' | 'LEFT_DOOR_REAR'
  | 'RIGHT_DOOR_FRONT' | 'RIGHT_DOOR_REAR'
  | 'LEFT_FENDER' | 'RIGHT_FENDER'
  | 'LEFT_QUARTER' | 'RIGHT_QUARTER'
  | 'WINDSHIELD' | 'REAR_GLASS' | 'LEFT_GLASS' | 'RIGHT_GLASS'
  | 'FRAME' | 'UNDERBODY' | 'INTERIOR' | 'MECHANICAL' | 'OTHER';

export interface DamageArea {
  code: DamageAreaCode;
  description?: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
}

export type CabasEstimateStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SUPPLEMENTED';

export interface CabasEstimate {
  cabas_estimate_id: string;
  workshop_code: string;
  vehicle_reg: string;
  vin: string;
  damage_areas: DamageArea[];
  labor_cost: number;
  parts_cost: number;
  paint_cost: number;
  total_excl_vat: number;
  total_incl_vat: number;
  insurance_company: string;
  insurance_claim_number: string;
  status: CabasEstimateStatus;
  approved_at?: Date;
  rejection_reason?: string;
  xml_payload?: string;
  created_at: Date;
}

export interface CreateEstimateInput {
  work_order_id?: string;
  vin: string;
  reg_number: string;
  damage_description: string;
  damage_areas: DamageAreaCode[];
  images?: string[];             // S3 URLs
  insurance_company: string;
  claim_number?: string;
  labor_cost?: number;
  parts_cost?: number;
  paint_cost?: number;
}

// ─── Supported insurance companies ───────────────────────────────────────────

export const INSURANCE_COMPANIES = [
  { name: 'If Skadeförsäkring',   code: 'IF', api_type: 'cabas_direct', status: 'supported'      },
  { name: 'Trygg-Hansa',          code: 'TH', api_type: 'cabas_direct', status: 'supported'      },
  { name: 'Folksam',              code: 'FS', api_type: 'manual',        status: 'manual_process' },
  { name: 'Länsförsäkringar',     code: 'LF', api_type: 'cabas_direct', status: 'supported'      },
  { name: 'Gjensidige',           code: 'GJ', api_type: 'cabas_direct', status: 'supported'      },
  { name: 'Moderna Försäkringar', code: 'MF', api_type: 'manual',        status: 'manual_process' },
] as const;

// ─── XML helpers ─────────────────────────────────────────────────────────────

function buildCabasXml(input: CreateEstimateInput, estimateId: string): string {
  const now = new Date().toISOString();
  const areas = input.damage_areas
    .map(a => `      <DamageArea code="${a}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<CabasEstimateRequest xmlns="http://www.cabas.se/schema/v2">
  <Header>
    <WorkshopCode>${CABAS_WORKSHOP_CODE || 'DEMO'}</WorkshopCode>
    <EstimateId>${estimateId}</EstimateId>
    <CreatedAt>${now}</CreatedAt>
  </Header>
  <Vehicle>
    <RegistrationNumber>${input.reg_number}</RegistrationNumber>
    <VIN>${input.vin}</VIN>
  </Vehicle>
  <Damage>
    <Description>${escapeXml(input.damage_description)}</Description>
    <Areas>
${areas}
    </Areas>
  </Damage>
  <Insurance>
    <Company>${input.insurance_company}</Company>
    <ClaimNumber>${input.claim_number || ''}</ClaimNumber>
  </Insurance>
  <Costs>
    <Labor>${input.labor_cost ?? 0}</Labor>
    <Parts>${input.parts_cost ?? 0}</Parts>
    <Paint>${input.paint_cost ?? 0}</Paint>
  </Costs>
</CabasEstimateRequest>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateEstimateId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CAB-${ts}-${rand}`;
}

// ─── Cabas API client ─────────────────────────────────────────────────────────

const cabasAuth = () =>
  Buffer.from(`${CABAS_WORKSHOP_CODE}:${CABAS_PASSWORD}`).toString('base64');

async function cabasPost(path: string, data: unknown) {
  return axios.post(`${CABAS_BASE_URL}${path}`, data, {
    headers: {
      Authorization: `Basic ${cabasAuth()}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

async function cabasGet(path: string) {
  return axios.get(`${CABAS_BASE_URL}${path}`, {
    headers: { Authorization: `Basic ${cabasAuth()}` },
    timeout: 15000,
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/integrations/cabas/status
 * Testa Cabas-anslutning
 */
router.get('/status', async (_req: Request, res: Response) => {
  if (SHADOW_MODE) {
    return res.json({
      connected: false,
      shadow_mode: true,
      message: 'Cabas körs i shadow-mode. Sätt CABAS_API_URL, CABAS_WORKSHOP_CODE och CABAS_PASSWORD för live-anslutning.',
      supported_insurers: INSURANCE_COMPANIES,
    });
  }

  try {
    await cabasGet('/ping');
    res.json({ connected: true, shadow_mode: false, workshop_code: CABAS_WORKSHOP_CODE });
  } catch (err) {
    const e = err as AxiosError;
    res.status(503).json({
      connected: false,
      error: e.message,
      status: e.response?.status,
    });
  }
});

/**
 * GET /api/integrations/cabas/insurance-companies
 * Lista stödda försäkringsbolag
 */
router.get('/insurance-companies', (_req: Request, res: Response) => {
  res.json(INSURANCE_COMPANIES);
});

/**
 * POST /api/integrations/cabas/create-estimate
 * Skapa ny Cabas-kalkyl
 */
router.post('/create-estimate', async (req: Request, res: Response) => {
  const input: CreateEstimateInput = req.body;

  if (!input.vin || !input.reg_number || !input.damage_description) {
    return res.status(400).json({ error: 'vin, reg_number och damage_description krävs.' });
  }

  const estimateId = generateEstimateId();
  const xml = buildCabasXml(input, estimateId);
  const laborCost  = input.labor_cost  ?? 0;
  const partsCost  = input.parts_cost  ?? 0;
  const paintCost  = input.paint_cost  ?? 0;
  const totalExVat = laborCost + partsCost + paintCost;
  const totalInVat = totalExVat * 1.25; // 25% moms

  if (SHADOW_MODE) {
    // Shadow-mode: returnera simulerat svar
    return res.status(201).json({
      cabas_id: estimateId,
      estimate_amount: totalInVat,
      total_excl_vat: totalExVat,
      total_incl_vat: totalInVat,
      labor_cost: laborCost,
      parts_cost: partsCost,
      paint_cost: paintCost,
      status: 'DRAFT',
      xml_payload: xml,
      shadow_mode: true,
      message: 'Kalkyl skapad i shadow-mode (ingen Cabas-anslutning).',
    });
  }

  try {
    const response = await cabasPost('/estimates', {
      workshop_code: CABAS_WORKSHOP_CODE,
      external_id: estimateId,
      vehicle: { reg: input.reg_number, vin: input.vin },
      damage: {
        description: input.damage_description,
        areas: input.damage_areas,
        images: input.images ?? [],
      },
      insurance: {
        company: input.insurance_company,
        claim_number: input.claim_number,
      },
      costs: { labor: laborCost, parts: partsCost, paint: paintCost },
      xml_payload: xml,
    });

    res.status(201).json({
      cabas_id: response.data.id ?? estimateId,
      estimate_amount: response.data.total_incl_vat ?? totalInVat,
      total_excl_vat: response.data.total_excl_vat ?? totalExVat,
      total_incl_vat: response.data.total_incl_vat ?? totalInVat,
      status: 'SUBMITTED',
    });
  } catch (err) {
    const e = err as AxiosError;
    res.status(502).json({ error: 'Cabas-kalkyl misslyckades.', detail: e.message });
  }
});

/**
 * GET /api/integrations/cabas/estimate/:id
 * Hämta kalkyl-status
 */
router.get('/estimate/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (SHADOW_MODE) {
    return res.json({
      cabas_id: id,
      status: 'SUBMITTED',
      shadow_mode: true,
      message: 'Shadow-mode: simulerad status.',
    });
  }

  try {
    const response = await cabasGet(`/estimates/${id}`);
    res.json(response.data);
  } catch (err) {
    const e = err as AxiosError;
    if (e.response?.status === 404) return res.status(404).json({ error: 'Kalkyl hittades inte.' });
    res.status(502).json({ error: 'Kunde inte hämta kalkyl.', detail: e.message });
  }
});

/**
 * POST /api/integrations/cabas/approve/:id
 * Godkänn kalkyl (kallas av försäkringsbolag via webhook eller manuellt)
 */
router.post('/approve/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_amount, adjuster_name, conditions } = req.body;

  if (!approved_amount) {
    return res.status(400).json({ error: 'approved_amount krävs.' });
  }

  if (SHADOW_MODE) {
    return res.json({
      cabas_id: id,
      status: 'APPROVED',
      approved_amount,
      approved_at: new Date().toISOString(),
      adjuster_name,
      conditions,
      shadow_mode: true,
    });
  }

  try {
    const response = await cabasPost(`/estimates/${id}/approve`, {
      approved_amount,
      adjuster_name,
      conditions,
    });
    res.json(response.data);
  } catch (err) {
    const e = err as AxiosError;
    res.status(502).json({ error: 'Godkännande misslyckades.', detail: e.message });
  }
});

/**
 * POST /api/integrations/cabas/supplement/:id
 * Tilläggsarbete till befintlig kalkyl
 */
router.post('/supplement/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { description, additional_labor, additional_parts, additional_paint } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'description krävs för tilläggsarbete.' });
  }

  const addLabor = additional_labor ?? 0;
  const addParts = additional_parts ?? 0;
  const addPaint = additional_paint ?? 0;
  const addTotal = (addLabor + addParts + addPaint) * 1.25;

  if (SHADOW_MODE) {
    return res.json({
      cabas_id: id,
      supplement_id: generateEstimateId(),
      status: 'SUPPLEMENTED',
      additional_amount_incl_vat: addTotal,
      shadow_mode: true,
    });
  }

  try {
    const response = await cabasPost(`/estimates/${id}/supplement`, {
      description,
      additional_labor: addLabor,
      additional_parts: addParts,
      additional_paint: addPaint,
    });
    res.json(response.data);
  } catch (err) {
    const e = err as AxiosError;
    res.status(502).json({ error: 'Tilläggsarbete misslyckades.', detail: e.message });
  }
});

/**
 * GET /api/integrations/cabas/invoice/:id
 * Hämta faktura från godkänd kalkyl
 */
router.get('/invoice/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (SHADOW_MODE) {
    return res.json({
      cabas_id: id,
      invoice_number: `INV-${id}`,
      status: 'APPROVED',
      pdf_url: null,
      shadow_mode: true,
      message: 'Shadow-mode: faktura simulerad.',
    });
  }

  try {
    const response = await cabasGet(`/estimates/${id}/invoice`);
    res.json(response.data);
  } catch (err) {
    const e = err as AxiosError;
    if (e.response?.status === 404) return res.status(404).json({ error: 'Faktura hittades inte — är kalkylen godkänd?' });
    res.status(502).json({ error: 'Kunde inte hämta faktura.', detail: e.message });
  }
});

/**
 * POST /api/integrations/cabas/webhook
 * Tar emot godkännanden/avvisningar från försäkringsbolag
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const { event, estimate_id, status, approved_amount, rejection_reason, adjuster_name } = req.body;

  console.log('[Cabas Webhook]', { event, estimate_id, status });

  // TODO: Verifiera webhook-signatur från Cabas
  // TODO: Uppdatera damage_claims och cabas_estimates i DB
  // TODO: Skicka notis till kund och verkstad

  res.json({ received: true, estimate_id, status });
});

export default router;
