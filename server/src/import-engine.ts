/**
 * import-engine.ts — Mirror Mode: Data Import från konkurrerande system
 *
 * Importerar data från Automaster, Winbas, Keyloop, Fortnox och generisk CSV.
 * Preview-first design: alltid förhandsgranska innan commit.
 * Rollback inom 24 timmar.
 *
 * POST /api/import/preview          → dry run, visa mappning och fel
 * POST /api/import/execute          → kör import (async job)
 * GET  /api/import/status/:job_id   → poll progress
 * POST /api/import/rollback/:job_id → ångra import
 * POST /api/import/automaster       → automaster preset
 * POST /api/import/winbas           → winbas preset
 * POST /api/import/keyloop          → keyloop preset
 * POST /api/import/fortnox          → fortnox/SIE4
 * POST /api/import/generic-csv      → generisk CSV med custom mapping
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ImportStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export type SourceSystem =
  | 'automaster'
  | 'winbas'
  | 'keyloop'
  | 'fortnox'
  | 'generic';

export interface FieldMapping {
  source_field: string;
  target_field: string;
  transform?: 'date_sv' | 'currency_sek' | 'uppercase' | 'trim' | null;
}

export interface ImportJob {
  id: string;
  org_id: string;
  source_system: SourceSystem;
  status: ImportStatus;
  total_records: number;
  imported_records: number;
  failed_records: number;
  mapping_config: FieldMapping[];
  error_log: Array<{ row: number; field: string; message: string }>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  rollback_expires_at: string | null;
}

// ─── Field mapping presets per source system ───────────────────────────────────

export const IMPORT_PRESETS: Record<SourceSystem, FieldMapping[]> = {
  automaster: [
    { source_field: 'OrderNr',       target_field: 'work_order_number' },
    { source_field: 'AgarNamn',      target_field: 'customer_name',   transform: 'trim' },
    { source_field: 'RegNr',         target_field: 'vehicle_reg',     transform: 'uppercase' },
    { source_field: 'Tekniker',      target_field: 'technician_name' },
    { source_field: 'Artiklar',      target_field: 'parts_json' },
    { source_field: 'Garanti',       target_field: 'warranty_claim' },
    { source_field: 'Datum',         target_field: 'created_at',      transform: 'date_sv' },
    { source_field: 'TotalBelopp',   target_field: 'total_amount',    transform: 'currency_sek' },
  ],
  winbas: [
    { source_field: 'Arbetsordernr', target_field: 'work_order_number' },
    { source_field: 'Kundnamn',      target_field: 'customer_name',   transform: 'trim' },
    { source_field: 'Regnummer',     target_field: 'vehicle_reg',     transform: 'uppercase' },
    { source_field: 'Mekaniker',     target_field: 'technician_name' },
    { source_field: 'Reservdelar',   target_field: 'parts_json' },
    { source_field: 'Garantiarende', target_field: 'warranty_claim' },
    { source_field: 'Skapad',        target_field: 'created_at',      transform: 'date_sv' },
    { source_field: 'Summa',         target_field: 'total_amount',    transform: 'currency_sek' },
  ],
  keyloop: [
    { source_field: 'RO_NUMBER',     target_field: 'work_order_number' },
    { source_field: 'CUSTOMER_NAME', target_field: 'customer_name',   transform: 'trim' },
    { source_field: 'VRN',           target_field: 'vehicle_reg',     transform: 'uppercase' },
    { source_field: 'TECHNICIAN',    target_field: 'technician_name' },
    { source_field: 'PARTS',         target_field: 'parts_json' },
    { source_field: 'WARRANTY_CLAIM',target_field: 'warranty_claim' },
    { source_field: 'OPEN_DATE',     target_field: 'created_at',      transform: 'date_sv' },
    { source_field: 'TOTAL',         target_field: 'total_amount',    transform: 'currency_sek' },
  ],
  fortnox: [
    { source_field: 'CustomerNumber',target_field: 'customer_number' },
    { source_field: 'CustomerName',  target_field: 'customer_name',   transform: 'trim' },
    { source_field: 'InvoiceNumber', target_field: 'invoice_number' },
    { source_field: 'InvoiceDate',   target_field: 'created_at',      transform: 'date_sv' },
    { source_field: 'Total',         target_field: 'total_amount',    transform: 'currency_sek' },
  ],
  generic: [],
};

// ─── In-memory job store (replace with DB in production) ──────────────────────

const jobStore: Map<string, ImportJob> = new Map();

function createJob(orgId: string, system: SourceSystem, mapping: FieldMapping[]): ImportJob {
  const now = new Date().toISOString();
  const job: ImportJob = {
    id: randomUUID(),
    org_id: orgId,
    source_system: system,
    status: 'pending',
    total_records: 0,
    imported_records: 0,
    failed_records: 0,
    mapping_config: mapping,
    error_log: [],
    started_at: null,
    completed_at: null,
    created_at: now,
    rollback_expires_at: null,
  };
  jobStore.set(job.id, job);
  return job;
}

/**
 * Simulate import preview — in production: parse file, run validation, return sample.
 */
function previewImport(
  records: any[],
  mapping: FieldMapping[]
): { sample: any[]; errors: any[]; total: number } {
  const sample = records.slice(0, 5).map(row => {
    const mapped: Record<string, any> = {};
    for (const m of mapping) {
      if (row[m.source_field] !== undefined) {
        mapped[m.target_field] = row[m.source_field];
      }
    }
    return mapped;
  });

  const errors: any[] = [];
  records.forEach((row, idx) => {
    // Check required fields
    if (!row['RegNr'] && !row['VRN'] && !row['Regnummer']) {
      // Only warn — not a hard error
    }
    if (!row['OrderNr'] && !row['Arbetsordernr'] && !row['RO_NUMBER']) {
      errors.push({ row: idx + 1, field: 'work_order_number', message: 'Missing order number' });
    }
  });

  return { sample, errors, total: records.length };
}

/**
 * Execute import async. In production: queue to worker.
 */
async function executeImport(job: ImportJob, records: any[]): Promise<void> {
  job.status = 'running';
  job.started_at = new Date().toISOString();
  job.total_records = records.length;

  // Simulate processing
  for (let i = 0; i < records.length; i++) {
    try {
      // In production: upsert into DB with org_id isolation
      job.imported_records++;
    } catch (err: any) {
      job.failed_records++;
      job.error_log.push({ row: i + 1, field: 'unknown', message: err.message });
    }
  }

  job.status = job.failed_records === 0 ? 'completed' : 'failed';
  job.completed_at = new Date().toISOString();

  // Set rollback window: 24 hours
  const rollbackExpiry = new Date();
  rollbackExpiry.setHours(rollbackExpiry.getHours() + 24);
  job.rollback_expires_at = rollbackExpiry.toISOString();
}

// ─── Express router ────────────────────────────────────────────────────────────

export const importRouter = Router();

/**
 * POST /api/import/preview
 * Dry run — returns mapping preview and validation errors without writing anything.
 */
importRouter.post('/preview', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const { source_system, records, mapping } = req.body as {
    source_system: SourceSystem;
    records: any[];
    mapping?: FieldMapping[];
  };

  if (!source_system || !records?.length) {
    return res.status(400).json({ error: 'source_system and records required' });
  }

  const effectiveMapping = mapping ?? IMPORT_PRESETS[source_system] ?? [];
  const preview = previewImport(records, effectiveMapping);

  res.json({
    source_system,
    total_records: preview.total,
    mapping_used: effectiveMapping,
    sample_output: preview.sample,
    validation_errors: preview.errors,
    can_proceed: preview.errors.length === 0,
  });
});

/**
 * POST /api/import/execute
 * Kicks off async import job. Poll /status/:job_id for progress.
 */
importRouter.post('/execute', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const { source_system, records, mapping } = req.body as {
    source_system: SourceSystem;
    records: any[];
    mapping?: FieldMapping[];
  };

  if (!source_system || !records?.length) {
    return res.status(400).json({ error: 'source_system and records required' });
  }

  const effectiveMapping = mapping ?? IMPORT_PRESETS[source_system] ?? [];
  const job = createJob(orgId, source_system, effectiveMapping);

  // Run async (don't await — return job_id immediately)
  executeImport(job, records).catch(err => {
    job.status = 'failed';
    job.error_log.push({ row: 0, field: 'system', message: err.message });
  });

  res.status(202).json({
    job_id: job.id,
    status: job.status,
    message: 'Import started. Poll /api/import/status/' + job.id,
  });
});

/**
 * GET /api/import/status/:job_id
 */
importRouter.get('/status/:job_id', (req: Request, res: Response) => {
  const job = jobStore.get(req.params.job_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    job_id: job.id,
    source_system: job.source_system,
    status: job.status,
    progress: job.total_records > 0
      ? Math.round((job.imported_records / job.total_records) * 100)
      : 0,
    total_records: job.total_records,
    imported_records: job.imported_records,
    failed_records: job.failed_records,
    error_log: job.error_log,
    started_at: job.started_at,
    completed_at: job.completed_at,
    rollback_expires_at: job.rollback_expires_at,
    can_rollback: job.status === 'completed' && !!job.rollback_expires_at
      && new Date(job.rollback_expires_at) > new Date(),
  });
});

/**
 * POST /api/import/rollback/:job_id
 * Soft deletes all records imported in this job. Available within 24h.
 */
importRouter.post('/rollback/:job_id', (req: Request, res: Response) => {
  const job = jobStore.get(req.params.job_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Can only rollback completed jobs' });
  }

  if (!job.rollback_expires_at || new Date(job.rollback_expires_at) <= new Date()) {
    return res.status(400).json({ error: 'Rollback window expired (24h)' });
  }

  // In production: soft delete all records with import_job_id = job.id
  job.status = 'rolled_back';
  job.completed_at = new Date().toISOString();

  res.json({
    job_id: job.id,
    status: job.status,
    message: `Rolled back ${job.imported_records} records from ${job.source_system} import`,
  });
});

// ─── Shortcut routes with preset mappings ─────────────────────────────────────

(['automaster', 'winbas', 'keyloop', 'fortnox'] as SourceSystem[]).forEach(system => {
  importRouter.post(`/${system}`, (req: Request, res: Response) => {
    req.body.source_system = system;
    req.body.mapping = IMPORT_PRESETS[system];
    // Forward to execute
    const orgId = (req as any).orgId ?? 'demo';
    const { records } = req.body;
    if (!records?.length) {
      return res.status(400).json({ error: 'records array required' });
    }
    const job = createJob(orgId, system, IMPORT_PRESETS[system]);
    executeImport(job, records).catch(err => {
      job.status = 'failed';
      job.error_log.push({ row: 0, field: 'system', message: err.message });
    });
    res.status(202).json({ job_id: job.id, status: 'pending', source_system: system });
  });
});

importRouter.post('/generic-csv', (req: Request, res: Response) => {
  const orgId = (req as any).orgId ?? 'demo';
  const { records, mapping } = req.body;
  if (!records?.length || !mapping?.length) {
    return res.status(400).json({ error: 'records and mapping required for generic import' });
  }
  const job = createJob(orgId, 'generic', mapping);
  executeImport(job, records).catch(err => {
    job.status = 'failed';
    job.error_log.push({ row: 0, field: 'system', message: err.message });
  });
  res.status(202).json({ job_id: job.id, status: 'pending', source_system: 'generic' });
});
