/**
 * Express Router — Calibration Certificate Import API endpoints.
 *
 * Handles upload, provider fetch, queue management, matching, and
 * provider connectivity for calibration certificates.
 */

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { parseDCCXml } from "./integrations/calibration/dcc";
import { BeamexConnector } from "./integrations/calibration/beamex";
import { FlukeConnector } from "./integrations/calibration/fluke";
import { KeysightConnector } from "./integrations/calibration/keysight";
import { DekraConnector } from "./integrations/calibration/dekra";
import { TrescalConnector } from "./integrations/calibration/trescal";
import { EndressHauserConnector } from "./integrations/calibration/endress";
import { CalibrationProviderConnector } from "./integrations/calibration/index";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Instantiates the appropriate connector based on provider config's
 * connector_type field.
 */
function createCalibrationConnector(config: any): CalibrationProviderConnector {
  const type: string = (config.connector_type ?? '').toUpperCase();
  switch (type) {
    case 'BEAMEX':
      return new BeamexConnector({
        baseUrl: config.base_url,
        apiKey: config.credentials?.api_key,
      });
    case 'FLUKE':
      return new FlukeConnector({
        baseUrl: config.base_url,
        apiKey: config.credentials?.api_key,
      });
    case 'KEYSIGHT':
      return new KeysightConnector({
        baseUrl: config.base_url,
        clientId: config.credentials?.client_id,
        clientSecret: config.credentials?.client_secret,
      });
    case 'DEKRA':
      return new DekraConnector({
        baseUrl: config.base_url,
        apiKey: config.credentials?.api_key,
      });
    case 'TRESCAL':
      return new TrescalConnector({
        baseUrl: config.base_url,
        apiKey: config.credentials?.api_key,
      });
    case 'ENDRESS_HAUSER':
    case 'ENDRESS':
    case 'NETILION':
      return new EndressHauserConnector({
        baseUrl: config.base_url,
        clientId: config.credentials?.client_id,
        clientSecret: config.credentials?.client_secret,
      });
    default:
      throw new Error(`Unsupported calibration connector type: ${type}`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/calibrations/import/upload
// ---------------------------------------------------------------------------

/**
 * Upload a calibration certificate for import.
 *
 * Body:
 *   format      — 'DCC_XML' | 'JSON' | 'CSV' | 'PDF'
 *   content     — base64-encoded or plain text content
 *   file_name   — original file name
 *   provider_id — optional calibration provider ID
 *   org_id      — organisation ID
 */
router.post('/api/calibrations/import/upload', async (req: Request, res: Response) => {
  const { format, content, file_name, provider_id, org_id } = req.body;

  if (!format || !content || !org_id) {
    return res.status(400).json({ error: 'format, content, and org_id are required' });
  }

  try {
    // Insert into queue with QUEUED status
    const { data: queueItem, error: insertError } = await supabase
      .from('certificate_import_queue')
      .insert({
        org_id,
        format,
        content,
        file_name: file_name ?? null,
        provider_id: provider_id ?? null,
        source: 'UPLOAD',
        status: 'QUEUED',
        retry_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    let autoMatched = false;

    // If DCC_XML: parse immediately and attempt auto-match by instrumentSerial
    if (format === 'DCC_XML') {
      try {
        const xmlContent = Buffer.isBuffer(content)
          ? content.toString('utf-8')
          : content.startsWith('data:') || /^[A-Za-z0-9+/=]{20,}$/.test(content.slice(0, 100))
          ? Buffer.from(content, 'base64').toString('utf-8')
          : content;

        const parseResult = await parseDCCXml(xmlContent);
        const cert = parseResult.certificate;

        // Update queue item with parsed certificate data
        await supabase
          .from('certificate_import_queue')
          .update({
            parsed_data: cert,
            parse_errors: parseResult.parseErrors.length > 0 ? parseResult.parseErrors : null,
            status: parseResult.schemaValid ? 'PARSED' : 'PARSE_ERROR',
            updated_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id);

        // Attempt auto-match to asset by instrumentSerial
        if (cert.instrumentSerial) {
          const { data: matchedAssets } = await supabase
            .from('assets')
            .select('id')
            .eq('org_id', org_id)
            .eq('serial_number', cert.instrumentSerial)
            .limit(1);

          if (matchedAssets && matchedAssets.length > 0) {
            const assetId = matchedAssets[0].id;

            // Insert into calibration_certificates with auto-match
            const { data: certRecord } = await supabase
              .from('calibration_certificates')
              .insert({
                org_id,
                asset_id: assetId,
                certificate_number: cert.certificateNumber,
                calibration_date: cert.calibrationDate,
                next_calibration_date: cert.nextCalibrationDate ?? null,
                instrument_serial: cert.instrumentSerial,
                instrument_description: cert.instrumentDescription,
                instrument_manufacturer: cert.instrumentManufacturer ?? null,
                instrument_model: cert.instrumentModel ?? null,
                overall_result: cert.overallResult,
                results: cert.results,
                reference_standards: cert.referenceStandards,
                environmental_conditions: cert.environmentalConditions ?? null,
                pdf_url: cert.pdfUrl ?? null,
                raw_data: cert.rawData ?? null,
                source: 'UPLOAD',
                provider_id: provider_id ?? null,
                match_method: 'AUTO_SERIAL',
                matched_at: new Date().toISOString(),
                queue_id: queueItem.id,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (certRecord) {
              autoMatched = true;
              await supabase
                .from('certificate_import_queue')
                .update({
                  status: 'MATCHED',
                  certificate_id: certRecord.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', queueItem.id);
            }
          }
        }
      } catch (parseErr: any) {
        // Non-fatal — item stays QUEUED for background processing
        await supabase
          .from('certificate_import_queue')
          .update({
            status: 'PARSE_ERROR',
            error_message: parseErr.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id);
      }
    }

    return res.status(201).json({
      queue_id: queueItem.id,
      status: autoMatched ? 'MATCHED' : 'QUEUED',
      auto_matched: autoMatched,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/calibrations/import/fetch/:connectorId
// ---------------------------------------------------------------------------

/**
 * Fetch new certificates from a provider API and queue them for import.
 *
 * Returns: { queued_count }
 */
router.post('/api/calibrations/import/fetch/:connectorId', async (req: Request, res: Response) => {
  const { connectorId } = req.params;
  const orgId = (req as any).user?.org_id ?? req.body.org_id;

  // Load provider config
  const { data: providerConfig, error: configError } = await supabase
    .from('calibration_providers')
    .select('*')
    .eq('id', connectorId)
    .single();

  if (configError || !providerConfig) {
    return res.status(404).json({ error: 'Calibration provider not found' });
  }

  try {
    const connector = createCalibrationConnector(providerConfig);
    const authed = await connector.authenticate();
    if (!authed) {
      return res.status(401).json({ error: 'Provider authentication failed' });
    }

    // Fetch since last sync
    const since = providerConfig.last_sync_at ? new Date(providerConfig.last_sync_at) : undefined;
    const certificates = await connector.fetchCertificates(since);

    if (!certificates.length) {
      return res.json({ queued_count: 0 });
    }

    // Insert each certificate into the import queue
    const queueItems = certificates.map((cert) => ({
      org_id: providerConfig.org_id ?? orgId,
      format: 'JSON',
      content: JSON.stringify(cert),
      provider_id: connectorId,
      source: 'API_FETCH',
      status: 'QUEUED',
      retry_count: 0,
      parsed_data: cert,
      created_at: new Date().toISOString(),
    }));

    const { error: bulkInsertError } = await supabase
      .from('certificate_import_queue')
      .insert(queueItems);

    if (bulkInsertError) {
      return res.status(500).json({ error: bulkInsertError.message });
    }

    // Update provider last_sync_at
    await supabase
      .from('calibration_providers')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectorId);

    return res.json({ queued_count: certificates.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/calibrations/import/queue
// ---------------------------------------------------------------------------

/**
 * List items in the certificate import queue.
 *
 * Query params: org_id, status, source, limit (default 20), offset (default 0)
 */
router.get('/api/calibrations/import/queue', async (req: Request, res: Response) => {
  const orgId = (req.query.org_id as string) ?? (req as any).user?.org_id;
  const status = req.query.status as string | undefined;
  const source = req.query.source as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  if (!orgId) {
    return res.status(400).json({ error: 'org_id is required' });
  }

  let query = supabase
    .from('certificate_import_queue')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);

  const { data, error, count } = await query;

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ items: data, total: count ?? 0 });
});

// ---------------------------------------------------------------------------
// POST /api/calibrations/import/:id/retry
// ---------------------------------------------------------------------------

/**
 * Reset a queue item back to QUEUED for re-processing.
 */
router.post('/api/calibrations/import/:id/retry', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: existing, error: fetchError } = await supabase
    .from('certificate_import_queue')
    .select('retry_count')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  const { error } = await supabase
    .from('certificate_import_queue')
    .update({
      status: 'QUEUED',
      retry_count: (existing.retry_count ?? 0) + 1,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/calibrations/import/:id/match
// ---------------------------------------------------------------------------

/**
 * Manually match a queued/unmatched certificate to an asset.
 *
 * Body: { asset_id }
 *
 * Returns: { calibration_record_id }
 */
router.post('/api/calibrations/import/:id/match', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { asset_id } = req.body;
  const userId = (req as any).user?.id;

  if (!asset_id) {
    return res.status(400).json({ error: 'asset_id is required' });
  }

  // Load the queue item
  const { data: queueItem, error: queueError } = await supabase
    .from('certificate_import_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (queueError || !queueItem) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  const cert = queueItem.parsed_data;
  if (!cert) {
    return res.status(400).json({ error: 'Queue item has no parsed certificate data' });
  }

  try {
    // Update calibration_certificates: set asset_id, match_method, matched_at, matched_by
    const { data: certRecord, error: certUpsertError } = await supabase
      .from('calibration_certificates')
      .upsert({
        org_id: queueItem.org_id,
        queue_id: id,
        asset_id,
        certificate_number: cert.certificateNumber,
        calibration_date: cert.calibrationDate,
        next_calibration_date: cert.nextCalibrationDate ?? null,
        instrument_serial: cert.instrumentSerial,
        instrument_description: cert.instrumentDescription,
        instrument_manufacturer: cert.instrumentManufacturer ?? null,
        instrument_model: cert.instrumentModel ?? null,
        overall_result: cert.overallResult,
        results: cert.results,
        reference_standards: cert.referenceStandards,
        environmental_conditions: cert.environmentalConditions ?? null,
        pdf_url: cert.pdfUrl ?? null,
        raw_data: cert.rawData ?? null,
        source: queueItem.source,
        provider_id: queueItem.provider_id ?? null,
        match_method: 'MANUAL',
        matched_at: new Date().toISOString(),
        matched_by: userId ?? null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'queue_id' })
      .select()
      .single();

    if (certUpsertError) return res.status(500).json({ error: certUpsertError.message });

    // Auto-create a calibration_record from the certificate data
    const { data: calibrationRecord, error: calRecordError } = await supabase
      .from('calibration_records')
      .insert({
        org_id: queueItem.org_id,
        asset_id,
        certificate_id: certRecord.id,
        certificate_number: cert.certificateNumber,
        calibration_date: cert.calibrationDate,
        next_due_date: cert.nextCalibrationDate ?? null,
        result: cert.overallResult,
        performed_by: cert.instrumentManufacturer ?? null,
        notes: null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (calRecordError) return res.status(500).json({ error: calRecordError.message });

    // Mark queue item as MATCHED
    await supabase
      .from('certificate_import_queue')
      .update({
        status: 'MATCHED',
        certificate_id: certRecord.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return res.json({ calibration_record_id: calibrationRecord.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/calibrations/providers
// ---------------------------------------------------------------------------

/**
 * List all active calibration providers.
 */
router.get('/api/calibrations/providers', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('calibration_providers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ providers: data });
});

// ---------------------------------------------------------------------------
// GET /api/calibrations/providers/:id/status
// ---------------------------------------------------------------------------

/**
 * Get provider details including last sync time and certificate count.
 *
 * Returns: { provider, last_sync_at, certificate_count }
 */
router.get('/api/calibrations/providers/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: provider, error: providerError } = await supabase
    .from('calibration_providers')
    .select('*')
    .eq('id', id)
    .single();

  if (providerError || !provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  const { count: certificateCount } = await supabase
    .from('calibration_certificates')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', id);

  return res.json({
    provider,
    last_sync_at: provider.last_sync_at ?? null,
    certificate_count: certificateCount ?? 0,
  });
});

// ---------------------------------------------------------------------------
// POST /api/calibrations/providers/:id/sync
// ---------------------------------------------------------------------------

/**
 * Queue a sync job for a provider by inserting an API_FETCH queue entry.
 *
 * Returns: { queued: true }
 */
router.post('/api/calibrations/providers/:id/sync', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id ?? req.body.org_id;

  const { data: provider, error: providerError } = await supabase
    .from('calibration_providers')
    .select('id, org_id, name')
    .eq('id', id)
    .single();

  if (providerError || !provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  const { error: insertError } = await supabase
    .from('certificate_import_queue')
    .insert({
      org_id: provider.org_id ?? orgId,
      format: 'JSON',
      content: null,
      provider_id: id,
      source: 'API_FETCH',
      status: 'QUEUED',
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

  if (insertError) return res.status(500).json({ error: insertError.message });
  return res.json({ queued: true });
});

// ---------------------------------------------------------------------------
// POST /api/calibrations/providers/:id/test
// ---------------------------------------------------------------------------

/**
 * Test connectivity to a calibration provider.
 *
 * Returns: { reachable: boolean, message: string }
 */
router.post('/api/calibrations/providers/:id/test', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: providerConfig, error: configError } = await supabase
    .from('calibration_providers')
    .select('*')
    .eq('id', id)
    .single();

  if (configError || !providerConfig) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  try {
    const connector = createCalibrationConnector(providerConfig);
    const reachable = await connector.authenticate();
    return res.json({
      reachable,
      message: reachable
        ? `Successfully connected to ${providerConfig.name}`
        : `Failed to authenticate with ${providerConfig.name}`,
    });
  } catch (err: any) {
    return res.json({
      reachable: false,
      message: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/calibrations/certificates/unmatched
// ---------------------------------------------------------------------------

/**
 * List calibration certificates that have not been matched to an asset.
 *
 * Query params: org_id, limit (default 20)
 *
 * Returns: { certificates }
 */
router.get('/api/calibrations/certificates/unmatched', async (req: Request, res: Response) => {
  const orgId = (req.query.org_id as string) ?? (req as any).user?.org_id;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!orgId) {
    return res.status(400).json({ error: 'org_id is required' });
  }

  const { data, error } = await supabase
    .from('calibration_certificates')
    .select('*')
    .eq('org_id', orgId)
    .is('asset_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ certificates: data });
});

// ---------------------------------------------------------------------------

export default router;
