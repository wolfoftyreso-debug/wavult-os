/**
 * shadow-sync.ts — Mirror Mode: Shadow Sync
 *
 * Kör pixdrift och legacy-systemet parallellt under övergångsperioden.
 * Varje ny arbetsorder i pixdrift speglas automatiskt in i legacy-systemet.
 * Personal märker ingenting — de jobbar i pixdrift, legacy uppdateras i bakgrunden.
 *
 * POST /api/shadow-sync/configure → konfigurera sync för en org
 * GET  /api/shadow-sync/status    → visa synk-status och senaste events
 * POST /api/shadow-sync/test      → testa synken med ett exempelrecord
 * DELETE /api/shadow-sync         → stäng av synken (Fas 4: legacy avvecklat)
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SyncDirection = 'pixdrift_to_legacy' | 'legacy_to_pixdrift' | 'bidirectional';
export type SyncTrigger =
  | 'work_order.created'
  | 'work_order.updated'
  | 'work_order.completed'
  | 'invoice.created'
  | 'customer.created'
  | 'vehicle.created';

export interface ShadowSyncConfig {
  id: string;
  org_id: string;
  source_system: string;
  sync_direction: SyncDirection;
  triggers: SyncTrigger[];
  field_mapping: Record<string, string>; // pixdrift_field → legacy_field
  legacy_endpoint?: string;              // HTTP endpoint to POST to
  legacy_api_key?: string;               // Auth for legacy system API
  active: boolean;
  created_at: string;
  last_sync_at: string | null;
  sync_count: number;
  error_count: number;
}

export interface SyncEvent {
  id: string;
  config_id: string;
  trigger: SyncTrigger;
  record_id: string;
  status: 'success' | 'failed' | 'skipped';
  payload_size_bytes: number;
  duration_ms: number;
  error?: string;
  timestamp: string;
}

// ─── In-memory store ───────────────────────────────────────────────────────────

const syncConfigs: Map<string, ShadowSyncConfig> = new Map();
const syncEvents: Map<string, SyncEvent[]> = new Map(); // config_id → events

// ─── Default field mappings per source system ──────────────────────────────────

const DEFAULT_FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  keyloop: {
    work_order_number: 'RO_NUMBER',
    customer_name:     'CUSTOMER_NAME',
    vehicle_reg:       'VRN',
    technician_name:   'TECHNICIAN',
    work_description:  'LABOR_DESCRIPTION',
    status:            'RO_STATUS',
    total_amount:      'TOTAL',
  },
  automaster: {
    work_order_number: 'OrderNr',
    customer_name:     'AgarNamn',
    vehicle_reg:       'RegNr',
    technician_name:   'Tekniker',
    work_description:  'Beskrivning',
    status:            'Status',
    total_amount:      'TotalBelopp',
  },
  winbas: {
    work_order_number: 'Arbetsordernr',
    customer_name:     'Kundnamn',
    vehicle_reg:       'Regnummer',
    technician_name:   'Mekaniker',
    work_description:  'Arbetsbeskrivning',
    status:            'Status',
    total_amount:      'Summa',
  },
};

// ─── Sync engine ───────────────────────────────────────────────────────────────

/**
 * Transform a pixdrift record into legacy system format using field mapping.
 */
function transformRecord(
  record: Record<string, any>,
  fieldMapping: Record<string, string>
): Record<string, any> {
  const transformed: Record<string, any> = {};
  for (const [pixdriftField, legacyField] of Object.entries(fieldMapping)) {
    if (record[pixdriftField] !== undefined) {
      transformed[legacyField] = record[pixdriftField];
    }
  }
  return transformed;
}

/**
 * Push a record to the legacy system.
 * In production: real HTTP call to legacy system API or file drop.
 */
async function pushToLegacy(
  config: ShadowSyncConfig,
  record: Record<string, any>
): Promise<{ success: boolean; duration_ms: number; error?: string }> {
  const start = Date.now();

  try {
    if (!config.legacy_endpoint) {
      // Simulate success when no endpoint configured (dev mode)
      await new Promise(r => setTimeout(r, 50));
      return { success: true, duration_ms: Date.now() - start };
    }

    const response = await fetch(config.legacy_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.legacy_api_key ? { Authorization: `Bearer ${config.legacy_api_key}` } : {}),
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      return {
        success: false,
        duration_ms: Date.now() - start,
        error: `Legacy API returned ${response.status}: ${await response.text()}`,
      };
    }

    return { success: true, duration_ms: Date.now() - start };
  } catch (err: any) {
    return { success: false, duration_ms: Date.now() - start, error: err.message };
  }
}

/**
 * Handle a sync trigger event. Call this from work order / invoice creation handlers.
 */
export async function handleSyncTrigger(
  orgId: string,
  trigger: SyncTrigger,
  recordId: string,
  record: Record<string, any>
): Promise<void> {
  // Find active config for this org
  const config = Array.from(syncConfigs.values()).find(
    c => c.org_id === orgId && c.active && c.triggers.includes(trigger)
  );

  if (!config) return; // No sync configured for this org/trigger

  const transformed = transformRecord(record, config.field_mapping);
  const result = await pushToLegacy(config, transformed);

  // Log event
  const event: SyncEvent = {
    id: randomUUID(),
    config_id: config.id,
    trigger,
    record_id: recordId,
    status: result.success ? 'success' : 'failed',
    payload_size_bytes: JSON.stringify(transformed).length,
    duration_ms: result.duration_ms,
    error: result.error,
    timestamp: new Date().toISOString(),
  };

  if (!syncEvents.has(config.id)) syncEvents.set(config.id, []);
  const events = syncEvents.get(config.id)!;
  events.push(event);
  if (events.length > 1000) events.shift(); // Rolling window

  config.last_sync_at = event.timestamp;
  config.sync_count++;
  if (!result.success) config.error_count++;

  // Retry on failure (3 attempts, 1s backoff)
  if (!result.success) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      const retry = await pushToLegacy(config, transformed);
      if (retry.success) {
        event.status = 'success';
        event.error = undefined;
        config.error_count--;
        break;
      }
    }
  }
}

// ─── Express router ────────────────────────────────────────────────────────────

export const shadowSyncRouter = Router();

/**
 * POST /api/shadow-sync/configure
 * Set up or update shadow sync for an org.
 */
shadowSyncRouter.post('/configure', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const {
    source_system,
    sync_direction = 'pixdrift_to_legacy',
    triggers = ['work_order.created', 'work_order.updated'],
    fields,
    legacy_endpoint,
    legacy_api_key,
  } = req.body as {
    source_system: string;
    sync_direction?: SyncDirection;
    triggers?: SyncTrigger[];
    fields?: string[];
    legacy_endpoint?: string;
    legacy_api_key?: string;
  };

  if (!source_system) {
    return res.status(400).json({ error: 'source_system required' });
  }

  // Build field mapping: use preset or filter preset by requested fields
  let fieldMapping = DEFAULT_FIELD_MAPPINGS[source_system] ?? {};
  if (fields?.length) {
    fieldMapping = Object.fromEntries(
      Object.entries(fieldMapping).filter(([k]) => fields.includes(k))
    );
  }

  // Upsert config for this org
  const existing = Array.from(syncConfigs.values()).find(c => c.org_id === orgId);

  const config: ShadowSyncConfig = {
    id: existing?.id ?? randomUUID(),
    org_id: orgId,
    source_system,
    sync_direction,
    triggers,
    field_mapping: fieldMapping,
    legacy_endpoint,
    legacy_api_key,
    active: true,
    created_at: existing?.created_at ?? new Date().toISOString(),
    last_sync_at: existing?.last_sync_at ?? null,
    sync_count: existing?.sync_count ?? 0,
    error_count: existing?.error_count ?? 0,
  };

  syncConfigs.set(config.id, config);

  res.json({
    config_id: config.id,
    source_system,
    sync_direction,
    triggers,
    field_mapping: fieldMapping,
    active: true,
    message: `Shadow sync configured: pixdrift → ${source_system}. Workers are standing by.`,
  });
});

/**
 * GET /api/shadow-sync/status
 * Returns sync configuration and recent event log.
 */
shadowSyncRouter.get('/status', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const config = Array.from(syncConfigs.values()).find(c => c.org_id === orgId);

  if (!config) {
    return res.json({
      configured: false,
      message: 'Shadow sync not configured. POST /api/shadow-sync/configure to set up.',
    });
  }

  const recentEvents = (syncEvents.get(config.id) ?? []).slice(-20);

  res.json({
    configured: true,
    active: config.active,
    source_system: config.source_system,
    sync_direction: config.sync_direction,
    triggers: config.triggers,
    stats: {
      total_syncs: config.sync_count,
      errors: config.error_count,
      success_rate: config.sync_count > 0
        ? Math.round(((config.sync_count - config.error_count) / config.sync_count) * 100) + '%'
        : 'N/A',
      last_sync_at: config.last_sync_at,
    },
    recent_events: recentEvents,
  });
});

/**
 * POST /api/shadow-sync/test
 * Test sync with a sample record.
 */
shadowSyncRouter.post('/test', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const config = Array.from(syncConfigs.values()).find(c => c.org_id === orgId);

  if (!config) {
    return res.status(400).json({ error: 'Shadow sync not configured' });
  }

  const testRecord = req.body.record ?? {
    work_order_number: 'TEST-001',
    customer_name: 'Test Kund AB',
    vehicle_reg: 'ABC123',
    technician_name: 'Erik T',
    work_description: 'Test sync',
    status: 'open',
    total_amount: 0,
  };

  const transformed = transformRecord(testRecord, config.field_mapping);

  res.json({
    test_mode: true,
    source_record: testRecord,
    transformed_for_legacy: transformed,
    target_system: config.source_system,
    legacy_endpoint: config.legacy_endpoint ?? '(not configured — would log to console)',
    message: 'Transform successful. Configure legacy_endpoint to enable live push.',
  });
});

/**
 * DELETE /api/shadow-sync
 * Deactivate shadow sync (Fas 4: legacy system decommissioned).
 */
shadowSyncRouter.delete('/', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const config = Array.from(syncConfigs.values()).find(c => c.org_id === orgId);

  if (!config) {
    return res.status(404).json({ error: 'No shadow sync configured' });
  }

  config.active = false;

  res.json({
    message: 'Shadow sync deactivated. Legacy system is no longer receiving updates.',
    final_stats: {
      total_syncs: config.sync_count,
      errors: config.error_count,
      active_since: config.created_at,
    },
  });
});
