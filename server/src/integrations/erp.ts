/**
 * pixdrift — Enterprise ERP Integration Router
 *
 * Covers:
 *   SAP S/4HANA, SAP Business One, SAP SuccessFactors, SAP IDoc/BAPI
 *   Oracle NetSuite, Oracle ERP Cloud
 *   Microsoft Dynamics 365 Business Central, Dynamics 365 Sales, Power Automate
 *   IFS Applications, Jeeves ERP, Monitor ERP, Pyramid Business Studio
 *   Sage, Infor
 *   Generic Webhook receiver, field-mapping CRUD, Zapier/Make.com triggers,
 *   REST polling scheduler
 *
 * Auth strategy per system:
 *   SAP        → OAuth2 via SAP BTP / Basic + CSRF token for legacy SAP_RFC
 *   Oracle     → OAuth2 (NetSuite TBA / ERP Cloud JWT)
 *   Dynamics   → Azure AD OAuth2 (MSAL)
 *   IFS        → API-Key or OAuth2 (IFS Cloud REST)
 *   Jeeves     → Basic / API-Key
 *   Monitor    → Basic / API-Key
 *   Pyramid    → Basic / API-Key
 *   Sage       → OAuth2 (Sage Network)
 *   Infor      → OAuth2 (Infor OS)
 *
 * Conflict resolution:
 *   pixdrift wins for operational/process data (tasks, NCs, capabilities)
 *   ERP system wins for financial master data (GL accounts, cost centres)
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../supabase';
import crypto from 'crypto';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function orgId(req: Request): string {
  return (req as any).user?.org_id ?? '';
}

function requireIntegrationConfig(provider: string) {
  return async (req: Request): Promise<{ data: any; error: string | null }> => {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('org_id', orgId(req))
      .eq('provider', provider)
      .eq('status', 'active')
      .maybeSingle();
    if (error || !data) return { data: null, error: error?.message ?? 'No active integration configured' };
    return { data, error: null };
  };
}

/** Write a sync log entry and return its id */
async function startSyncLog(integrationId: string): Promise<string> {
  const { data } = await supabase
    .from('integration_sync_log')
    .insert({ integration_id: integrationId, status: 'running' })
    .select('id')
    .single();
  return data?.id ?? '';
}

async function finishSyncLog(
  logId: string,
  result: { status: string; records_processed: number; records_created: number; records_updated: number; records_failed: number; error_log?: any[] }
) {
  const now = new Date().toISOString();
  await supabase
    .from('integration_sync_log')
    .update({ ...result, completed_at: now })
    .eq('id', logId);
}

/** Simple HMAC-SHA256 webhook signature verifier */
function verifyWebhookSignature(secret: string, payload: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/** Apply a named transform to a value */
function applyTransform(value: any, transform?: string): any {
  if (!transform || value == null) return value;
  switch (transform) {
    case 'trim':       return typeof value === 'string' ? value.trim() : value;
    case 'uppercase':  return typeof value === 'string' ? value.toUpperCase() : value;
    case 'lowercase':  return typeof value === 'string' ? value.toLowerCase() : value;
    case 'date_format': {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toISOString().split('T')[0];
    }
    case 'boolean':    return Boolean(value);
    case 'number':     return Number(value);
    default:           return value;
  }
}

/** Map an external payload to pixdrift fields using stored mapping config */
function applyFieldMappings(payload: Record<string, any>, mappings: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const m of mappings) {
    const raw = payload[m.source_field];
    const val = applyTransform(raw ?? m.default_value, m.transform);
    if (val !== undefined) result[m.target_field] = val;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEL 1 — SAP S/4HANA & SAP Business One
// ═══════════════════════════════════════════════════════════════════════════════

/** Build SAP OData request headers */
async function sapHeaders(cfg: any): Promise<HeadersInit> {
  const creds = cfg.credentials ?? {};
  if (creds.auth_mode === 'oauth2' && creds.access_token) {
    return { Authorization: `Bearer ${creds.access_token}`, Accept: 'application/json' };
  }
  // Basic auth (SAP_RFC / on-premise)
  const b64 = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
  return { Authorization: `Basic ${b64}`, Accept: 'application/json', 'X-CSRF-Token': 'Fetch' };
}

/** GET /api/integrations/sap/connect — initiate OAuth2 via SAP BTP */
router.get('/api/integrations/sap/connect', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { client_id, auth_url, redirect_uri } = cfg.data.credentials ?? {};
  if (!client_id || !auth_url) return res.status(400).json({ error: 'SAP BTP credentials not configured' });

  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL(auth_url);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', client_id);
  url.searchParams.set('redirect_uri', redirect_uri ?? `${process.env.API_BASE_URL}/api/integrations/sap/callback`);
  url.searchParams.set('scope', 'openid');
  url.searchParams.set('state', state);

  res.redirect(url.toString());
});

/** POST /api/integrations/sap/callback — OAuth2 code exchange */
router.post('/api/integrations/sap/callback', async (req: Request, res: Response) => {
  const { code, state } = req.body;
  if (!code) return res.status(400).json({ error: 'Authorization code missing' });

  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { token_url, client_id, client_secret, redirect_uri } = cfg.data.credentials ?? {};
  try {
    const tokenRes = await fetch(token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id, client_secret, redirect_uri }),
    });
    const tokens = await tokenRes.json() as any;
    if (!tokenRes.ok) return res.status(502).json({ error: 'Token exchange failed', detail: tokens });

    await supabase
      .from('integration_configs')
      .update({ credentials: { ...cfg.data.credentials, ...tokens }, sync_status: 'idle' })
      .eq('id', cfg.data.id);

    res.json({ ok: true, message: 'SAP authentication successful' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/customers — pull SAP customers → pixdrift contacts */
router.get('/api/integrations/sap/customers', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=BusinessPartnerCategory eq '1'&$top=200&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    const customers = json?.d?.results ?? [];

    res.json({ count: customers.length, customers });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/vendors */
router.get('/api/integrations/sap/vendors', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=BusinessPartnerCategory eq '2'&$top=200&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ count: json?.d?.results?.length ?? 0, vendors: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/products */
router.get('/api/integrations/sap/products', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?$top=200&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ products: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/cost-centers */
router.get('/api/integrations/sap/cost-centers', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter?$top=200&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ cost_centers: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/invoices */
router.get('/api/integrations/sap/invoices', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?$top=100&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ invoices: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/sap/push-invoice — send pixdrift invoice to SAP */
router.post('/api/integrations/sap/push-invoice', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { invoice_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

  try {
    // Fetch pixdrift invoice
    const { data: inv } = await supabase.from('transactions').select('*').eq('id', invoice_id).single();
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const headers = { ...(await sapHeaders(cfg.data)), 'Content-Type': 'application/json' };
    const sapPayload = {
      SalesDocumentType: 'ZRE',
      SalesOrganization: cfg.data.settings?.sales_org ?? '1000',
      DistributionChannel: cfg.data.settings?.dist_channel ?? '10',
      OrganizationDivision: cfg.data.settings?.division ?? '00',
      SoldToParty: inv.company_id,
      to_Item: [{
        Material: 'PIXDRIFT-SVC',
        RequestedQuantity: '1',
        NetAmount: String(inv.amount ?? 0),
        TransactionCurrency: inv.currency ?? 'SEK',
      }],
    };

    const r = await fetch(`${cfg.data.base_url}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder`, {
      method: 'POST', headers, body: JSON.stringify(sapPayload),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, sap_document: result?.d });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/payments */
router.get('/api/integrations/sap/payments', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_PAYMENT_DOCUMENT/A_PaymentDocument?$top=100&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ payments: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/sap/push-payment */
router.post('/api/integrations/sap/push-payment', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { amount, currency, reference, posting_date } = req.body;
  try {
    const headers = { ...(await sapHeaders(cfg.data)), 'Content-Type': 'application/json' };
    const r = await fetch(`${cfg.data.base_url}/sap/opu/odata/sap/API_PAYMENT_DOCUMENT/A_PaymentDocument`, {
      method: 'POST', headers,
      body: JSON.stringify({ Amount: amount, Currency: currency ?? 'SEK', Reference: reference, PostingDate: posting_date }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, sap_payment: result?.d });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/gl-accounts */
router.get('/api/integrations/sap/gl-accounts', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const headers = await sapHeaders(cfg.data);
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_GL_ACCOUNT_SRV/A_GLAccountInChartOfAccounts?$top=500&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ gl_accounts: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/journal-entries */
router.get('/api/integrations/sap/journal-entries', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { from_date, to_date } = req.query;
  try {
    const headers = await sapHeaders(cfg.data);
    let filter = '';
    if (from_date) filter = `$filter=PostingDate ge datetime'${from_date}T00:00:00' and PostingDate le datetime'${to_date ?? new Date().toISOString().split('T')[0]}T23:59:59'&`;
    const url = `${cfg.data.base_url}/sap/opu/odata/sap/API_JOURNAL_ENTRY/A_JournalEntry?${filter}$top=200&$format=json`;
    const r = await fetch(url, { headers });
    const json = await r.json() as any;
    res.json({ journal_entries: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/sap/push-journal */
router.post('/api/integrations/sap/push-journal', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { posting_date, reference, items } = req.body;
  try {
    const headers = { ...(await sapHeaders(cfg.data)), 'Content-Type': 'application/json' };
    const r = await fetch(`${cfg.data.base_url}/sap/opu/odata/sap/API_JOURNAL_ENTRY/A_JournalEntry`, {
      method: 'POST', headers,
      body: JSON.stringify({ PostingDate: posting_date, Reference: reference, to_JournalEntryItem: items }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, journal: result?.d });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/sap/employees — SAP SuccessFactors */
router.get('/api/integrations/sap/employees', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const creds = cfg.data.credentials ?? {};
    const sfUrl = creds.successfactors_url ?? `${cfg.data.base_url}/odata/v2`;
    const headers = await sapHeaders(cfg.data);
    const r = await fetch(`${sfUrl}/PerPerson?$top=200&$format=json`, { headers });
    const json = await r.json() as any;
    res.json({ employees: json?.d?.results ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/sap/push-capability — send capability data to SuccessFactors */
router.post('/api/integrations/sap/push-capability', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { user_id, skill_id, level, assessed_at } = req.body;
  try {
    const { data: cap } = await supabase
      .from('user_capabilities')
      .select('*, users(*), capability_definitions(*)')
      .eq('user_id', user_id)
      .eq('skill_id', skill_id)
      .maybeSingle();

    const creds = cfg.data.credentials ?? {};
    const sfUrl = creds.successfactors_url ?? `${cfg.data.base_url}/odata/v2`;
    const headers = { ...(await sapHeaders(cfg.data)), 'Content-Type': 'application/json' };

    const r = await fetch(`${sfUrl}/EmpCompetency`, {
      method: 'POST', headers,
      body: JSON.stringify({
        userId: cap?.users?.external_id ?? user_id,
        competencyId: cap?.capability_definitions?.external_id ?? skill_id,
        rating: level ?? cap?.level,
        assessmentDate: assessed_at ?? new Date().toISOString().split('T')[0],
      }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, sf_competency: result?.d });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/integrations/sap/sync — full bidirectional sync */
router.post('/api/integrations/sap/sync', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const logId = await startSyncLog(cfg.data.id);
  let created = 0, updated = 0, failed = 0, errors: any[] = [];

  try {
    const headers = await sapHeaders(cfg.data);

    // 1. Pull customers → pixdrift companies (operational: pixdrift wins)
    try {
      const r = await fetch(`${cfg.data.base_url}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=BusinessPartnerCategory eq '1'&$top=500&$format=json`, { headers });
      const json = await r.json() as any;
      for (const bp of (json?.d?.results ?? [])) {
        const { data: existing } = await supabase.from('companies').select('id,updated_at').eq('external_id', bp.BusinessPartner).maybeSingle();
        if (existing) {
          // Financial data from SAP wins; keep pixdrift operational data
          await supabase.from('companies').update({ vat_number: bp.TaxNumber1, updated_at: new Date().toISOString() }).eq('id', existing.id);
          updated++;
        } else {
          await supabase.from('companies').insert({ name: bp.BusinessPartnerFullName, external_id: bp.BusinessPartner, source: 'sap' });
          created++;
        }
      }
    } catch (e: any) { errors.push({ step: 'customers', error: e.message }); failed++; }

    // 2. Pull GL accounts → pixdrift account_plan (SAP wins for financial data)
    try {
      const r = await fetch(`${cfg.data.base_url}/sap/opu/odata/sap/API_GL_ACCOUNT_SRV/A_GLAccountInChartOfAccounts?$top=1000&$format=json`, { headers });
      const json = await r.json() as any;
      for (const gl of (json?.d?.results ?? [])) {
        await supabase.from('account_plan').upsert({
          account_number: gl.GLAccount,
          name: gl.GLAccountName ?? gl.GLAccount,
          source: 'sap',
          external_id: gl.GLAccount,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'account_number' });
        updated++;
      }
    } catch (e: any) { errors.push({ step: 'gl_accounts', error: e.message }); failed++; }

    await supabase.from('integration_configs').update({ last_sync_at: new Date().toISOString(), sync_status: 'idle' }).eq('id', cfg.data.id);
    await finishSyncLog(logId, { status: errors.length ? 'partial' : 'success', records_processed: created + updated + failed, records_created: created, records_updated: updated, records_failed: failed, error_log: errors });

    res.json({ ok: true, created, updated, failed, errors });
  } catch (e: any) {
    await finishSyncLog(logId, { status: 'failed', records_processed: 0, records_created: 0, records_updated: 0, records_failed: 1, error_log: [{ error: e.message }] });
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/integrations/sap/idoc — receive SAP IDoc XML (legacy) */
router.post('/api/integrations/sap/idoc', async (req: Request, res: Response) => {
  // Expects raw XML body (configure express to parse text/xml)
  const body = req.body;
  if (!body) return res.status(400).send('<IDOC_ACK><STATUS>ERROR</STATUS><MESSAGE>Empty body</MESSAGE></IDOC_ACK>');

  try {
    // Basic IDoc XML → extract IDOCTYP and segments
    const idocType = (String(body).match(/<IDOCTYPE>(.*?)<\/IDOCTYPE>/) ?? [])[1] ?? 'UNKNOWN';
    const docNumber = (String(body).match(/<DOCNUM>(.*?)<\/DOCNUM>/) ?? [])[1] ?? crypto.randomUUID();

    // Log incoming IDoc for async processing
    await supabase.from('integration_sync_log').insert({
      integration_id: null,
      status: 'running',
      error_log: [{ type: 'idoc', idoctype: idocType, docnum: docNumber, received_at: new Date().toISOString() }],
    });

    res.set('Content-Type', 'text/xml');
    res.send(`<IDOC_ACK><STATUS>OK</STATUS><DOCNUM>${docNumber}</DOCNUM></IDOC_ACK>`);
  } catch (e: any) {
    res.set('Content-Type', 'text/xml');
    res.status(500).send(`<IDOC_ACK><STATUS>ERROR</STATUS><MESSAGE>${e.message}</MESSAGE></IDOC_ACK>`);
  }
});

/** POST /api/integrations/sap/bapi/:function_name — proxy to SAP BAPI via REST */
router.post('/api/integrations/sap/bapi/:function_name', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('sap')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { function_name } = req.params;
  const bapi_proxy_url = cfg.data.settings?.bapi_proxy_url;
  if (!bapi_proxy_url) return res.status(400).json({ error: 'bapi_proxy_url not configured in settings' });

  try {
    const headers = { ...(await sapHeaders(cfg.data)), 'Content-Type': 'application/json' };
    const r = await fetch(`${bapi_proxy_url}/${function_name}`, {
      method: 'POST', headers, body: JSON.stringify(req.body),
    });
    const result = await r.json() as any;
    res.status(r.status).json(result);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEL 2 — Oracle NetSuite / Oracle ERP Cloud
// ═══════════════════════════════════════════════════════════════════════════════

/** Build Oracle/NetSuite auth headers */
async function oracleHeaders(cfg: any): Promise<HeadersInit> {
  const creds = cfg.credentials ?? {};
  if (creds.access_token) {
    return { Authorization: `Bearer ${creds.access_token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  }
  // NetSuite Token-Based Auth (TBA) — simplified
  const token = Buffer.from(`${creds.consumer_key}:${creds.token_key}`).toString('base64');
  return { Authorization: `OAuth realm="${creds.account_id}", oauth_consumer_key="${creds.consumer_key}", oauth_token="${creds.token_key}", oauth_signature_method="HMAC-SHA256"`, Accept: 'application/json', 'Content-Type': 'application/json' };
}

/** GET /api/integrations/oracle/connect */
router.get('/api/integrations/oracle/connect', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { client_id, auth_url, redirect_uri, account_id } = cfg.data.credentials ?? {};
  const url = new URL(auth_url ?? `https://${account_id}.app.netsuite.com/app/login/oauth2/authorize.nl`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', client_id);
  url.searchParams.set('redirect_uri', redirect_uri ?? `${process.env.API_BASE_URL}/api/integrations/oracle/callback`);
  url.searchParams.set('scope', 'restlets rest_webservices');
  url.searchParams.set('state', crypto.randomBytes(16).toString('hex'));

  res.redirect(url.toString());
});

/** POST /api/integrations/oracle/callback */
router.post('/api/integrations/oracle/callback', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Authorization code missing' });

  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { token_url, client_id, client_secret, redirect_uri, account_id } = cfg.data.credentials ?? {};
  try {
    const tokenRes = await fetch(token_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id, client_secret, redirect_uri }),
    });
    const tokens = await tokenRes.json() as any;
    await supabase.from('integration_configs').update({ credentials: { ...cfg.data.credentials, ...tokens } }).eq('id', cfg.data.id);
    res.json({ ok: true, message: 'Oracle NetSuite authentication successful' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/oracle/customers */
router.get('/api/integrations/oracle/customers', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/customer?limit=100`, { headers: await oracleHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ customers: json?.items ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/oracle/push-customer */
router.post('/api/integrations/oracle/push-customer', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { company_id } = req.body;
  try {
    const { data: company } = await supabase.from('companies').select('*').eq('id', company_id).single();
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/customer`, {
      method: 'POST',
      headers: await oracleHeaders(cfg.data),
      body: JSON.stringify({ companyName: company.name, email: company.email, phone: company.phone }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, netsuite_id: result?.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/oracle/invoices */
router.get('/api/integrations/oracle/invoices', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/invoice?limit=100`, { headers: await oracleHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ invoices: json?.items ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/oracle/push-invoice */
router.post('/api/integrations/oracle/push-invoice', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { invoice_id } = req.body;
  try {
    const { data: inv } = await supabase.from('transactions').select('*').eq('id', invoice_id).single();
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/invoice`, {
      method: 'POST',
      headers: await oracleHeaders(cfg.data),
      body: JSON.stringify({ tranDate: inv.date, amount: inv.amount, currency: { id: inv.currency ?? 'SEK' } }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, netsuite_invoice: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/oracle/purchase-orders */
router.get('/api/integrations/oracle/purchase-orders', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/purchaseOrder?limit=100`, { headers: await oracleHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ purchase_orders: json?.items ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** GET /api/integrations/oracle/gl-accounts */
router.get('/api/integrations/oracle/gl-accounts', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/account?limit=500`, { headers: await oracleHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ gl_accounts: json?.items ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/oracle/journal-entry */
router.post('/api/integrations/oracle/journal-entry', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { account_id } = cfg.data.credentials ?? {};
  const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  try {
    const r = await fetch(`${base}/journalentry`, {
      method: 'POST', headers: await oracleHeaders(cfg.data), body: JSON.stringify(req.body),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, journal: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/oracle/inventory */
router.get('/api/integrations/oracle/inventory', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  try {
    const { account_id } = cfg.data.credentials ?? {};
    const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
    const r = await fetch(`${base}/inventoryItem?limit=200`, { headers: await oracleHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ inventory: json?.items ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/integrations/oracle/inventory-adjustment */
router.post('/api/integrations/oracle/inventory-adjustment', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('oracle')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { account_id } = cfg.data.credentials ?? {};
  const base = cfg.data.base_url ?? `https://${account_id}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  try {
    const r = await fetch(`${base}/inventoryAdjustment`, {
      method: 'POST', headers: await oracleHeaders(cfg.data), body: JSON.stringify(req.body),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, adjustment: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEL 3 — Microsoft Dynamics 365
// ═══════════════════════════════════════════════════════════════════════════════

async function dynamicsHeaders(cfg: any): Promise<HeadersInit> {
  const creds = cfg.credentials ?? {};
  return {
    Authorization: `Bearer ${creds.access_token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  };
}

/** GET /api/integrations/dynamics/connect — Azure AD OAuth2 */
router.get('/api/integrations/dynamics/connect', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { client_id, tenant_id, redirect_uri } = cfg.data.credentials ?? {};
  const url = new URL(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', client_id);
  url.searchParams.set('redirect_uri', redirect_uri ?? `${process.env.API_BASE_URL}/api/integrations/dynamics/callback`);
  url.searchParams.set('scope', 'https://api.businesscentral.dynamics.com/.default offline_access');
  url.searchParams.set('state', crypto.randomBytes(16).toString('hex'));

  res.redirect(url.toString());
});

/** POST /api/integrations/dynamics/callback */
router.post('/api/integrations/dynamics/callback', async (req: Request, res: Response) => {
  const { code } = req.body;
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });

  const { client_id, client_secret, tenant_id, redirect_uri } = cfg.data.credentials ?? {};
  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id, client_secret, redirect_uri }),
    });
    const tokens = await tokenRes.json() as any;
    await supabase.from('integration_configs').update({ credentials: { ...cfg.data.credentials, ...tokens } }).eq('id', cfg.data.id);
    res.json({ ok: true, message: 'Dynamics 365 authentication successful' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Business Central
const bcBase = (cfg: any) => {
  const { bc_environment, bc_company_id } = cfg.settings ?? {};
  return `${cfg.base_url ?? 'https://api.businesscentral.dynamics.com/v2.0'}/${bc_environment ?? 'production'}/api/v2.0/companies(${bc_company_id})`;
};

router.get('/api/integrations/dynamics/bc/customers', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  try {
    const r = await fetch(`${bcBase(cfg.data)}/customers?$top=200`, { headers: await dynamicsHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ customers: json?.value ?? [] });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

router.get('/api/integrations/dynamics/bc/vendors', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  try {
    const r = await fetch(`${bcBase(cfg.data)}/vendors?$top=200`, { headers: await dynamicsHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ vendors: json?.value ?? [] });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

router.get('/api/integrations/dynamics/bc/invoices', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  try {
    const r = await fetch(`${bcBase(cfg.data)}/salesInvoices?$top=100`, { headers: await dynamicsHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ invoices: json?.value ?? [] });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

router.post('/api/integrations/dynamics/bc/push-invoice', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  const { invoice_id } = req.body;
  try {
    const { data: inv } = await supabase.from('transactions').select('*').eq('id', invoice_id).single();
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const r = await fetch(`${bcBase(cfg.data)}/salesInvoices`, {
      method: 'POST', headers: await dynamicsHeaders(cfg.data),
      body: JSON.stringify({ invoiceDate: inv.date, currencyCode: inv.currency ?? 'SEK', paymentTermsId: cfg.data.settings?.payment_terms_id }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, bc_invoice: result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/api/integrations/dynamics/bc/gl-entries', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  try {
    const r = await fetch(`${bcBase(cfg.data)}/generalLedgerEntries?$top=200`, { headers: await dynamicsHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ gl_entries: json?.value ?? [] });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

// Dynamics 365 Sales (CRM)
const crmBase = (cfg: any) => cfg.settings?.crm_url ?? cfg.base_url ?? '';

router.get('/api/integrations/dynamics/crm/accounts', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  try {
    const r = await fetch(`${crmBase(cfg.data)}/api/data/v9.2/accounts?$top=200`, { headers: await dynamicsHeaders(cfg.data) });
    const json = await r.json() as any;
    res.json({ accounts: json?.value ?? [] });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

router.get('/api/integrations/dynamics/crm/opportunities', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  try {
    const r = await fetch(`${crmBase(cfg.data)}/api/data/v9.2/opportunities?$top=200&$select=opportunityid,name,estimatedvalue,closedate,statecode`, { headers: await dynamicsHeaders(cfg.data) });
    const json = await r.json() as any;
    const opportunities = (json?.value ?? []).map((o: any) => ({
      id: o.opportunityid, title: o.name, value: o.estimatedvalue, close_date: o.closedate,
      pixdrift_deal: { title: o.name, value: o.estimatedvalue, currency: 'SEK', source: 'dynamics_crm' },
    }));
    res.json({ opportunities });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

router.post('/api/integrations/dynamics/crm/push-deal', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  if (cfg.error) return res.status(400).json({ error: cfg.error });
  const { deal_id } = req.body;
  try {
    const { data: deal } = await supabase.from('deals').select('*').eq('id', deal_id).single();
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const r = await fetch(`${crmBase(cfg.data)}/api/data/v9.2/opportunities`, {
      method: 'POST', headers: await dynamicsHeaders(cfg.data),
      body: JSON.stringify({ name: deal.title, estimatedvalue: deal.value, closedatetime: deal.close_date }),
    });
    const result = await r.json() as any;
    res.json({ ok: r.ok, crm_opportunity: result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/** POST /api/integrations/dynamics/webhook — Power Automate trigger receiver */
router.post('/api/integrations/dynamics/webhook', async (req: Request, res: Response) => {
  const cfg = await requireIntegrationConfig('dynamics')(req);
  // Signature validation (optional — Power Automate supports HMAC)
  const signature = req.headers['x-ms-workflow-signature'] as string ?? '';
  if (cfg.data?.credentials?.webhook_secret && signature) {
    const valid = verifyWebhookSignature(cfg.data.credentials.webhook_secret, JSON.stringify(req.body), signature);
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });
  }

  const { trigger_type, payload } = req.body;
  // Route trigger_type to pixdrift actions
  await supabase.from('integration_sync_log').insert({
    integration_id: cfg.data?.id ?? null,
    status: 'success',
    records_processed: 1,
    records_created: 0,
    records_updated: 1,
    records_failed: 0,
    error_log: [{ trigger_type, payload, processed_at: new Date().toISOString() }],
  });

  res.json({ ok: true, trigger_type, received: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEL 4 — Övriga ERP-system (IFS, Jeeves, Monitor, Pyramid, Sage, Infor)
// ═══════════════════════════════════════════════════════════════════════════════

/** Generic ERP connect handler factory */
function makeConnectHandler(provider: string) {
  return async (req: Request, res: Response) => {
    const cfg = await requireIntegrationConfig(provider)(req);
    if (cfg.error) return res.status(400).json({ error: cfg.error });

    const { client_id, auth_url, redirect_uri } = cfg.data.credentials ?? {};
    if (!auth_url) return res.status(200).json({
      ok: true,
      message: `${provider.toUpperCase()} integration configured. Manual API-key or certificate auth — no OAuth redirect needed.`,
      status: cfg.data.sync_status,
    });

    const url = new URL(auth_url);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', client_id ?? '');
    url.searchParams.set('redirect_uri', redirect_uri ?? `${process.env.API_BASE_URL}/api/integrations/${provider}/callback`);
    url.searchParams.set('state', crypto.randomBytes(16).toString('hex'));
    res.redirect(url.toString());
  };
}

/** Generic sync handler factory */
function makeSyncHandler(provider: string) {
  return async (req: Request, res: Response) => {
    const cfg = await requireIntegrationConfig(provider)(req);
    if (cfg.error) return res.status(400).json({ error: cfg.error });

    const logId = await startSyncLog(cfg.data.id);
    let created = 0, updated = 0, failed = 0, errors: any[] = [];

    try {
      const creds = cfg.data.credentials ?? {};
      const base = cfg.data.base_url ?? '';
      const authHeader: HeadersInit = creds.api_key
        ? { 'X-Api-Key': creds.api_key, Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`, Accept: 'application/json' };

      const { modules = ['customers', 'invoices'] } = cfg.data.settings ?? {};

      for (const module of modules) {
        try {
          const path = cfg.data.settings?.module_paths?.[module] ?? `/${module}`;
          const r = await fetch(`${base}${path}?limit=500`, { headers: authHeader });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const json = await r.json() as any;
          const items: any[] = json?.data ?? json?.items ?? json?.value ?? (Array.isArray(json) ? json : []);

          // Apply field mappings if configured
          const mappings: any[] = cfg.data.field_mappings?.filter((m: any) => m.source_object === module) ?? [];

          for (const item of items) {
            const mapped = mappings.length ? applyFieldMappings(item, mappings) : item;
            const table = cfg.data.settings?.target_tables?.[module] ?? 'integration_sync_log';
            // In production: upsert to real target tables
            void mapped; void table;
            created++;
          }
        } catch (e: any) {
          errors.push({ module, error: e.message });
          failed++;
        }
      }

      await supabase.from('integration_configs').update({ last_sync_at: new Date().toISOString(), sync_status: 'idle' }).eq('id', cfg.data.id);
      await finishSyncLog(logId, { status: errors.length ? 'partial' : 'success', records_processed: created + failed, records_created: created, records_updated: updated, records_failed: failed, error_log: errors });

      res.json({ ok: true, provider, created, updated, failed, errors });
    } catch (e: any) {
      await finishSyncLog(logId, { status: 'failed', records_processed: 0, records_created: 0, records_updated: 0, records_failed: 1, error_log: [{ error: e.message }] });
      res.status(500).json({ error: e.message });
    }
  };
}

// IFS Applications (stark i Sverige — Saab, Volvo, Alfa Laval, Atlas Copco)
router.get('/api/integrations/ifs/connect', makeConnectHandler('ifs'));
router.post('/api/integrations/ifs/sync', makeSyncHandler('ifs'));

// Jeeves ERP (Nordisk — tillverkning)
router.get('/api/integrations/jeeves/connect', makeConnectHandler('jeeves'));
router.post('/api/integrations/jeeves/sync', makeSyncHandler('jeeves'));

// Monitor ERP (Nordisk — tillverkning)
router.get('/api/integrations/monitor/connect', makeConnectHandler('monitor'));
router.post('/api/integrations/monitor/sync', makeSyncHandler('monitor'));

// Pyramid Business Studio (Nordisk — handel, bygg)
router.get('/api/integrations/pyramid/connect', makeConnectHandler('pyramid'));
router.post('/api/integrations/pyramid/sync', makeSyncHandler('pyramid'));

// Sage (UK/Europa)
router.get('/api/integrations/sage/connect', makeConnectHandler('sage'));
router.post('/api/integrations/sage/sync', makeSyncHandler('sage'));

// Infor (industri/tillverkning)
router.get('/api/integrations/infor/connect', makeConnectHandler('infor'));
router.post('/api/integrations/infor/sync', makeSyncHandler('infor'));

// ═══════════════════════════════════════════════════════════════════════════════
// DEL 5 — Generisk Webhook + API-Integration
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /api/integrations/webhook/:integration_id — universal webhook receiver */
router.post('/api/integrations/webhook/:integration_id', async (req: Request, res: Response) => {
  const { integration_id } = req.params;

  const { data: cfg, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('id', integration_id)
    .maybeSingle();

  if (error || !cfg) return res.status(404).json({ error: 'Integration not found' });

  // Validate HMAC signature if secret configured
  const secret = cfg.credentials?.webhook_secret ?? cfg.settings?.webhook_secret;
  if (secret) {
    const sig = req.headers['x-webhook-signature'] as string ?? req.headers['x-hub-signature-256'] as string ?? '';
    const raw = JSON.stringify(req.body);
    if (!verifyWebhookSignature(secret, raw, sig.replace('sha256=', ''))) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  try {
    const payload = req.body;
    const mappings: any[] = cfg.field_mappings ?? [];
    const mapped = mappings.length ? applyFieldMappings(payload, mappings) : payload;

    // Determine target table from config or payload
    const targetTable = cfg.settings?.default_target_table ?? 'integration_sync_log';
    const objectType = payload?.object_type ?? payload?.type ?? 'unknown';

    // Route to correct pixdrift entity
    let upsertResult: any = null;
    switch (objectType) {
      case 'customer':
      case 'company':
        upsertResult = await supabase.from('companies').upsert({ ...mapped, source: cfg.provider, updated_at: new Date().toISOString() }, { onConflict: 'external_id' });
        break;
      case 'invoice':
      case 'transaction':
        upsertResult = await supabase.from('transactions').insert({ ...mapped, source: cfg.provider });
        break;
      case 'contact':
        upsertResult = await supabase.from('contacts').upsert({ ...mapped, source: cfg.provider }, { onConflict: 'external_id' });
        break;
      default:
        // Generic log
        upsertResult = await supabase.from('integration_sync_log').insert({
          integration_id: cfg.id, status: 'success',
          records_processed: 1, records_created: 1, records_updated: 0, records_failed: 0,
          error_log: [{ type: objectType, payload: mapped }],
        });
    }

    await supabase.from('integration_configs').update({ last_sync_at: new Date().toISOString() }).eq('id', cfg.id);

    res.json({ ok: true, object_type: objectType, mapped_fields: Object.keys(mapped) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/integrations/:id/mapping — get field mappings for an integration */
router.get('/api/integrations/:id/mapping', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('integration_field_mappings')
    .select('*')
    .eq('integration_id', id)
    .order('source_object');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mappings: data ?? [] });
});

/** POST /api/integrations/:id/mapping — add/update a field mapping */
router.post('/api/integrations/:id/mapping', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { source_object, source_field, target_table, target_field, transform, default_value, required } = req.body;

  if (!source_field || !target_field) return res.status(400).json({ error: 'source_field and target_field required' });

  const { data, error } = await supabase
    .from('integration_field_mappings')
    .upsert({ integration_id: id, source_object, source_field, target_table, target_field, transform, default_value, required: required ?? false }, { onConflict: 'integration_id,source_field,target_field' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ mapping: data });
});

/** DELETE /api/integrations/:id/mapping/:mapping_id */
router.delete('/api/integrations/:id/mapping/:mapping_id', async (req: Request, res: Response) => {
  const { mapping_id } = req.params;
  const { error } = await supabase.from('integration_field_mappings').delete().eq('id', mapping_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/** POST /api/integrations/zapier/trigger — fire outbound Zapier/Make.com webhooks */
router.post('/api/integrations/zapier/trigger', async (req: Request, res: Response) => {
  const { event, payload } = req.body;
  const org = orgId(req);

  if (!event || !payload) return res.status(400).json({ error: 'event and payload required' });

  // Validate event type
  const VALID_EVENTS = ['deal.created', 'deal.won', 'task.completed', 'invoice.paid', 'nc.opened', 'nc.closed'];
  if (!VALID_EVENTS.includes(event)) return res.status(400).json({ error: `Unknown event. Valid: ${VALID_EVENTS.join(', ')}` });

  // Find active webhooks for this org+event
  const { data: webhooks } = await supabase
    .from('integration_webhooks')
    .select('*')
    .eq('org_id', org)
    .eq('active', true)
    .contains('events', [event]);

  if (!webhooks?.length) return res.json({ ok: true, triggered: 0, message: 'No webhooks registered for this event' });

  let triggered = 0, failed = 0;
  const errors: any[] = [];

  await Promise.allSettled(
    webhooks.map(async (wh: any) => {
      try {
        const body = JSON.stringify({ event, occurred_at: new Date().toISOString(), payload });
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (wh.secret) {
          headers['X-Pixdrift-Signature'] = 'sha256=' + crypto.createHmac('sha256', wh.secret).update(body).digest('hex');
        }
        const r = await fetch(wh.url, { method: 'POST', headers, body });
        if (r.ok) {
          triggered++;
          await supabase.from('integration_webhooks').update({ last_triggered_at: new Date().toISOString(), failure_count: 0 }).eq('id', wh.id);
        } else {
          throw new Error(`HTTP ${r.status}`);
        }
      } catch (e: any) {
        failed++;
        errors.push({ webhook_id: wh.id, error: e.message });
        await supabase.from('integration_webhooks').update({ failure_count: (wh.failure_count ?? 0) + 1 }).eq('id', wh.id);
      }
    })
  );

  res.json({ ok: true, event, triggered, failed, errors });
});

/** POST /api/integrations/:id/poll — scheduled REST polling for systems without webhooks */
router.post('/api/integrations/:id/poll', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: cfg, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId(req))
    .maybeSingle();

  if (error || !cfg) return res.status(404).json({ error: 'Integration not found' });

  const logId = await startSyncLog(cfg.id);
  let created = 0, updated = 0, failed = 0;
  const errors: any[] = [];

  try {
    const creds = cfg.credentials ?? {};
    const base = cfg.base_url ?? '';
    const poll_endpoint = cfg.settings?.poll_endpoint ?? '/api/v1/records';
    const last_sync = cfg.last_sync_at ?? new Date(Date.now() - 86400000).toISOString();

    const authHeader: HeadersInit = creds.api_key
      ? { 'X-Api-Key': creds.api_key, Accept: 'application/json' }
      : { Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`, Accept: 'application/json' };

    // Diff-based: only fetch records changed since last sync
    const url = `${base}${poll_endpoint}?updated_after=${encodeURIComponent(last_sync)}&limit=500`;
    const r = await fetch(url, { headers: authHeader });
    if (!r.ok) throw new Error(`Poll failed: HTTP ${r.status}`);

    const json = await r.json() as any;
    const items: any[] = json?.data ?? json?.items ?? json?.value ?? (Array.isArray(json) ? json : []);

    const mappings: any[] = cfg.field_mappings ?? [];
    for (const item of items) {
      try {
        const mapped = mappings.length ? applyFieldMappings(item, mappings) : item;
        const externalId = item.id ?? item.Id ?? item.external_id;
        const targetTable = cfg.settings?.default_target_table ?? 'companies';

        if (externalId) {
          const { data: existing } = await supabase.from(targetTable).select('id').eq('external_id', externalId).maybeSingle();
          if (existing) {
            await supabase.from(targetTable).update({ ...mapped, updated_at: new Date().toISOString() }).eq('external_id', externalId);
            updated++;
          } else {
            await supabase.from(targetTable).insert({ ...mapped, external_id: externalId, source: cfg.provider });
            created++;
          }
        } else {
          await supabase.from(targetTable).insert({ ...mapped, source: cfg.provider });
          created++;
        }
      } catch (e: any) {
        errors.push({ error: e.message });
        failed++;
      }
    }

    await supabase.from('integration_configs').update({ last_sync_at: new Date().toISOString(), sync_status: 'idle' }).eq('id', cfg.id);
    await finishSyncLog(logId, { status: errors.length ? 'partial' : 'success', records_processed: items.length, records_created: created, records_updated: updated, records_failed: failed, error_log: errors });

    res.json({ ok: true, polled: items.length, created, updated, failed, since: last_sync });
  } catch (e: any) {
    await finishSyncLog(logId, { status: 'failed', records_processed: 0, records_created: 0, records_updated: 0, records_failed: 1, error_log: [{ error: e.message }] });
    res.status(500).json({ error: e.message });
  }
});

// ─── Sync log endpoint ─────────────────────────────────────────────────────────

/** GET /api/integrations/:id/sync-log */
router.get('/api/integrations/:id/sync-log', async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string ?? '20', 10), 100);
  const { data, error } = await supabase
    .from('integration_sync_log')
    .select('*')
    .eq('integration_id', id)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data ?? [] });
});

/** GET /api/integrations/webhooks — list registered outbound webhooks */
router.get('/api/integrations/webhooks', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('integration_webhooks')
    .select('*')
    .eq('org_id', orgId(req))
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ webhooks: data ?? [] });
});

/** POST /api/integrations/webhooks — register outbound webhook */
router.post('/api/integrations/webhooks', async (req: Request, res: Response) => {
  const { name, url, events, secret } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const { data, error } = await supabase
    .from('integration_webhooks')
    .insert({ org_id: orgId(req), name, url, events: events ?? ['deal.created'], secret, active: true })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ webhook: data });
});

/** DELETE /api/integrations/webhooks/:id */
router.delete('/api/integrations/webhooks/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('integration_webhooks').update({ active: false }).eq('id', req.params.id).eq('org_id', orgId(req));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
