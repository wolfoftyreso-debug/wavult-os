/**
 * Express Router — ERP Integration API endpoints.
 *
 * Admin endpoints require ORG_ADMIN role.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../supabase';
import { createConnector } from './connector';
import { GenericWebhookHandler } from './generic-webhook';

const router = Router();

// ---------------------------------------------------------------------------
// Middleware helpers (stubs — wire up your real auth middleware)
// ---------------------------------------------------------------------------

function requireRole(role: string) {
  return (req: Request, res: Response, next: Function) => {
    const userRole = (req as any).user?.role;
    if (!userRole || userRole !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

const requireAdmin = requireRole('ORG_ADMIN');

// ---------------------------------------------------------------------------
// Admin: Connectors CRUD
// ---------------------------------------------------------------------------

/** GET /api/integrations — list connectors for the org */
router.get('/api/integrations', requireAdmin, async (req: Request, res: Response) => {
  const orgId = (req as any).user?.org_id;
  const { data, error } = await supabase
    .from('integration_connectors')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ connectors: data });
});

/** POST /api/integrations — create connector */
router.post('/api/integrations', requireAdmin, async (req: Request, res: Response) => {
  const orgId = (req as any).user?.org_id;
  const { system_type, name, base_url, credentials, modules, webhook_secret } = req.body;

  const { data, error } = await supabase
    .from('integration_connectors')
    .insert({
      org_id: orgId,
      system_type,
      name,
      base_url,
      credentials,
      modules: modules ?? [],
      webhook_secret: webhook_secret ?? null,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ connector: data });
});

/** PATCH /api/integrations/:id — update connector */
router.patch('/api/integrations/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;
  const updates = req.body;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('integration_connectors')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ connector: data });
});

/** DELETE /api/integrations/:id — deactivate (soft delete) */
router.delete('/api/integrations/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;

  const { error } = await supabase
    .from('integration_connectors')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Connector deactivated' });
});

/** POST /api/integrations/:id/test — test connection */
router.post('/api/integrations/:id/test', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;

  const { data: config, error } = await supabase
    .from('integration_connectors')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !config) return res.status(404).json({ error: 'Connector not found' });

  try {
    const connector = createConnector(config);
    await connector.authenticate();
    const health = await connector.testConnection();
    res.json({ health });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/integrations/:id/status — health stats */
router.get('/api/integrations/:id/status', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;

  // Recent sync stats
  const { data: logs } = await supabase
    .from('integration_sync_log')
    .select('status, synced_at')
    .eq('connector_id', id)
    .order('synced_at', { ascending: false })
    .limit(100);

  const total = logs?.length ?? 0;
  const success = logs?.filter((l: any) => l.status === 'SUCCESS').length ?? 0;
  const failed = logs?.filter((l: any) => l.status === 'FAILED').length ?? 0;
  const lastSync = logs?.[0]?.synced_at ?? null;

  // Pending queue count
  const { count: queuePending } = await supabase
    .from('integration_outbound_queue')
    .select('id', { count: 'exact', head: true })
    .eq('connector_id', id)
    .eq('status', 'PENDING');

  res.json({
    connector_id: id,
    last_sync: lastSync,
    recent_total: total,
    recent_success: success,
    recent_failed: failed,
    queue_pending: queuePending ?? 0,
  });
});

/** POST /api/integrations/:id/sync — manual sync (FULL/INCREMENTAL) */
router.post('/api/integrations/:id/sync', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req as any).user?.org_id;
  const { mode, entity_types } = req.body; // mode: 'FULL' | 'INCREMENTAL'

  const { data: config, error } = await supabase
    .from('integration_connectors')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !config) return res.status(404).json({ error: 'Connector not found' });

  try {
    const connector = createConnector(config);
    await connector.authenticate();

    const since = mode === 'INCREMENTAL' ? new Date(config.last_sync_at ?? 0) : undefined;
    const entityTypes: string[] = entity_types ?? config.modules ?? [];
    const results: Record<string, number> = {};

    for (const entityType of entityTypes) {
      const entities = await connector.fetchEntities(entityType, since);
      results[entityType] = entities.length;

      // Store fetched entities in sync log
      for (const entity of entities) {
        await supabase.from('integration_sync_log').insert({
          connector_id: id,
          direction: 'INBOUND',
          status: 'SUCCESS',
          entity_type: entityType,
          external_id: entity.externalId,
          synced_at: new Date().toISOString(),
        });
      }
    }

    // Update last_sync_at
    await supabase
      .from('integration_connectors')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', id);

    res.json({ mode: mode ?? 'FULL', results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/integrations/:id/log — sync history */
router.get('/api/integrations/:id/log', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error, count } = await supabase
    .from('integration_sync_log')
    .select('*', { count: 'exact' })
    .eq('connector_id', id)
    .order('synced_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data, total: count });
});

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------

/** GET /api/integrations/:id/mappings — field mappings */
router.get('/api/integrations/:id/mappings', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('integration_mappings')
    .select('*')
    .eq('connector_id', id)
    .order('entity_type');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ mappings: data });
});

/** POST /api/integrations/:id/mappings — create mapping */
router.post('/api/integrations/:id/mappings', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const mapping = {
    ...req.body,
    connector_id: id,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('integration_mappings')
    .insert(mapping)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ mapping: data });
});

/** PATCH /api/integrations/:id/mappings/:mapId — update mapping */
router.patch('/api/integrations/:id/mappings/:mapId', requireAdmin, async (req: Request, res: Response) => {
  const { mapId } = req.params;

  const { data, error } = await supabase
    .from('integration_mappings')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', mapId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ mapping: data });
});

/** GET /api/integrations/:id/mappings/suggest — predefined mappings for system_type */
router.get('/api/integrations/:id/mappings/suggest', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: connector } = await supabase
    .from('integration_connectors')
    .select('system_type')
    .eq('id', id)
    .single();

  const systemType = connector?.system_type?.toUpperCase() ?? '';

  const suggestions = PREDEFINED_MAPPINGS[systemType] ?? [];
  res.json({ system_type: systemType, suggestions });
});

// Predefined mapping templates per system type
const PREDEFINED_MAPPINGS: Record<string, any[]> = {
  FORTNOX: [
    { entity_type: 'customer', external_entity_type: 'Customer', internal_field: 'name', external_field: 'Name', direction: 'BOTH' },
    { entity_type: 'customer', external_entity_type: 'Customer', internal_field: 'email', external_field: 'Email', direction: 'BOTH' },
    { entity_type: 'customer', external_entity_type: 'Customer', internal_field: 'external_ref', external_field: 'CustomerNumber', direction: 'INBOUND' },
    { entity_type: 'invoice', external_entity_type: 'Invoice', internal_field: 'amount', external_field: 'Total', direction: 'INBOUND' },
    { entity_type: 'invoice', external_entity_type: 'Invoice', internal_field: 'external_ref', external_field: 'DocumentNumber', direction: 'INBOUND' },
    { entity_type: 'supplier', external_entity_type: 'Supplier', internal_field: 'name', external_field: 'Name', direction: 'BOTH' },
    { entity_type: 'product', external_entity_type: 'Article', internal_field: 'name', external_field: 'Description', direction: 'BOTH' },
    { entity_type: 'product', external_entity_type: 'Article', internal_field: 'sku', external_field: 'ArticleNumber', direction: 'BOTH' },
  ],
  SAP: [
    { entity_type: 'customer', external_entity_type: 'BusinessPartner', internal_field: 'name', external_field: 'BusinessPartnerFullName', direction: 'BOTH' },
    { entity_type: 'customer', external_entity_type: 'BusinessPartner', internal_field: 'external_ref', external_field: 'BusinessPartner', direction: 'INBOUND' },
    { entity_type: 'order', external_entity_type: 'SalesOrder', internal_field: 'external_ref', external_field: 'SalesOrder', direction: 'INBOUND' },
    { entity_type: 'order', external_entity_type: 'SalesOrder', internal_field: 'amount', external_field: 'TotalNetAmount', direction: 'INBOUND' },
    { entity_type: 'nc', external_entity_type: 'QualityNotification', internal_field: 'title', external_field: 'QualityNotificationText', direction: 'INBOUND' },
    { entity_type: 'nc', external_entity_type: 'QualityNotification', internal_field: 'severity', external_field: 'QltyNotifctnPriority', direction: 'INBOUND' },
    { entity_type: 'product', external_entity_type: 'Item', internal_field: 'name', external_field: 'ProductDescription', direction: 'BOTH' },
    { entity_type: 'product', external_entity_type: 'Item', internal_field: 'sku', external_field: 'Product', direction: 'BOTH' },
  ],
};

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/** POST /api/webhooks/erp/:connectorId — generic inbound webhook */
router.post('/api/webhooks/erp/:connectorId', async (req: Request, res: Response) => {
  const { connectorId } = req.params;

  // Collect raw body for signature validation
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (typeof val === 'string') headers[key.toLowerCase()] = val;
  }

  const result = await GenericWebhookHandler.process(connectorId, headers, rawBody, req.body);

  if (result.accepted) {
    res.status(200).json({ accepted: true, entityType: result.entityType, entityId: result.entityId });
  } else {
    res.status(400).json({ accepted: false, error: result.error });
  }
});

// ---------------------------------------------------------------------------
// External refs
// ---------------------------------------------------------------------------

/** GET /api/external-refs/:entityType/:entityId — ERP refs for a Certified entity */
router.get('/api/external-refs/:entityType/:entityId', async (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;

  const { data, error } = await supabase
    .from('integration_external_refs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ refs: data });
});

/** GET /api/external-refs/search?externalId=X — find Certified entity from ERP ID */
router.get('/api/external-refs/search', async (req: Request, res: Response) => {
  const externalId = req.query.externalId as string;

  if (!externalId) return res.status(400).json({ error: 'externalId query parameter required' });

  const { data, error } = await supabase
    .from('integration_external_refs')
    .select('*')
    .eq('external_id', externalId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ refs: data });
});

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

/** GET /api/integrations/:id/queue — outbound queue */
router.get('/api/integrations/:id/queue', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const status = (req.query.status as string) ?? 'PENDING';

  const { data, error } = await supabase
    .from('integration_outbound_queue')
    .select('*')
    .eq('connector_id', id)
    .eq('status', status)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ queue: data });
});

/** POST /api/integrations/:id/queue/:queueId/retry — manual retry */
router.post('/api/integrations/:id/queue/:queueId/retry', requireAdmin, async (req: Request, res: Response) => {
  const { id, queueId } = req.params;

  // Load queue entry
  const { data: entry, error: entryErr } = await supabase
    .from('integration_outbound_queue')
    .select('*')
    .eq('id', queueId)
    .eq('connector_id', id)
    .single();

  if (entryErr || !entry) return res.status(404).json({ error: 'Queue entry not found' });

  // Load connector config
  const { data: config } = await supabase
    .from('integration_connectors')
    .select('*')
    .eq('id', id)
    .single();

  if (!config) return res.status(404).json({ error: 'Connector not found' });

  try {
    const connector = createConnector(config);
    await connector.authenticate();
    const result = await connector.pushEntity(entry.entity_type, entry.payload);

    const newStatus = result.success ? 'SENT' : 'FAILED';
    await supabase
      .from('integration_outbound_queue')
      .update({
        status: newStatus,
        last_attempt_at: new Date().toISOString(),
        attempts: (entry.attempts ?? 0) + 1,
        error_message: result.error ?? null,
      })
      .eq('id', queueId);

    await supabase.from('integration_sync_log').insert({
      connector_id: id,
      direction: 'OUTBOUND',
      status: result.success ? 'SUCCESS' : 'FAILED',
      entity_type: entry.entity_type,
      external_id: result.externalId || null,
      error_message: result.error ?? null,
      synced_at: new Date().toISOString(),
    });

    res.json({ result, newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/integrations/:id/queue/flush — send all PENDING */
router.post('/api/integrations/:id/queue/flush', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  // Load all pending entries
  const { data: entries, error: qErr } = await supabase
    .from('integration_outbound_queue')
    .select('*')
    .eq('connector_id', id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });

  if (qErr) return res.status(500).json({ error: qErr.message });
  if (!entries || entries.length === 0) return res.json({ flushed: 0 });

  // Load connector config
  const { data: config } = await supabase
    .from('integration_connectors')
    .select('*')
    .eq('id', id)
    .single();

  if (!config) return res.status(404).json({ error: 'Connector not found' });

  const connector = createConnector(config);
  await connector.authenticate();

  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const result = await connector.pushEntity(entry.entity_type, entry.payload);
      const newStatus = result.success ? 'SENT' : 'FAILED';

      await supabase
        .from('integration_outbound_queue')
        .update({
          status: newStatus,
          last_attempt_at: new Date().toISOString(),
          attempts: (entry.attempts ?? 0) + 1,
          error_message: result.error ?? null,
        })
        .eq('id', entry.id);

      await supabase.from('integration_sync_log').insert({
        connector_id: id,
        direction: 'OUTBOUND',
        status: result.success ? 'SUCCESS' : 'FAILED',
        entity_type: entry.entity_type,
        external_id: result.externalId || null,
        error_message: result.error ?? null,
        synced_at: new Date().toISOString(),
      });

      if (result.success) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  res.json({ flushed: sent, failed });
});

// ---------------------------------------------------------------------------

export default router;
