// exit-capture-api.ts — Exit Capture Engine
// "Most systems ask for feedback. Pixdrift captures reality."
// A job is not complete when the work is done.
// It is complete when the outcome is understood.

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// ─── Database pool (reuse existing env) ──────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── PIX derivation logic ─────────────────────────────────────────────────────
// Hard PIX = system facts (delay_minutes, had_additional_work, etc.) — already known from work order
// Soft PIX = customer experience answers — captured here
// Together they form the full operational truth.

interface WorkOrderContext {
  delay_minutes?: number;
  had_additional_work?: boolean;
  customer_waited?: boolean;
  had_parts_issue?: boolean;
  all_nominal?: boolean;
}

function derivePix(
  softAnswers: {
    issue_resolved: boolean;
    took_longer: boolean;
    something_unclear: boolean;
    wants_followup: boolean;
    // Context-aware soft answers from frontend
    pix_type?: string;
    deviation_severity?: string;
    requires_followup?: boolean;
    soft_answers?: Array<{ questionId: string; value: boolean }>;
  },
  ctx?: WorkOrderContext
): {
  pix_type: 'deviation_pix' | 'improvement_pix' | 'quality_signal';
  deviation_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  requires_followup: boolean;
  pix_events: object[];
} {
  const events: object[] = [];
  const ts = new Date();

  // If the frontend already derived soft PIX (context-aware mode), trust it
  // but still record hard PIX facts from context
  if (softAnswers.pix_type && softAnswers.deviation_severity !== undefined) {
    const hardFacts: Record<string, unknown> = {};
    if (ctx) {
      if ((ctx.delay_minutes ?? 0) > 0) hardFacts.delay_minutes = ctx.delay_minutes;
      if (ctx.had_additional_work)       hardFacts.had_additional_work = true;
      if (ctx.had_parts_issue)           hardFacts.had_parts_issue = true;
      if (ctx.customer_waited)           hardFacts.customer_waited = true;
    }
    events.push({ source: 'hard_pix', facts: hardFacts, ts });
    events.push({ source: 'soft_pix', type: softAnswers.pix_type, severity: softAnswers.deviation_severity, ts });

    return {
      pix_type: softAnswers.pix_type as 'deviation_pix' | 'improvement_pix' | 'quality_signal',
      deviation_severity: (softAnswers.deviation_severity || null) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null,
      requires_followup: softAnswers.requires_followup ?? softAnswers.wants_followup,
      pix_events: events,
    };
  }

  // Fallback: legacy derivation from boolean answers
  const { issue_resolved, took_longer, something_unclear, wants_followup } = softAnswers;

  // Hard PIX: record system-known facts
  if (ctx) {
    events.push({
      source: 'hard_pix',
      facts: {
        delay_minutes: ctx.delay_minutes ?? 0,
        had_additional_work: ctx.had_additional_work ?? false,
        had_parts_issue: ctx.had_parts_issue ?? false,
        customer_waited: ctx.customer_waited ?? false,
      },
      ts,
    });
  }

  // CRITICAL: issue unresolved AND took longer — double failure
  if (!issue_resolved && took_longer) {
    events.push({ source: 'soft_pix', type: 'deviation_pix', severity: 'CRITICAL', reason: 'issue_unresolved+delay', ts });
    return { pix_type: 'deviation_pix', deviation_severity: 'CRITICAL', requires_followup: true, pix_events: events };
  }

  // HIGH: issue unresolved
  if (!issue_resolved) {
    events.push({ source: 'soft_pix', type: 'deviation_pix', severity: 'HIGH', reason: 'issue_unresolved', ts });
    return { pix_type: 'deviation_pix', deviation_severity: 'HIGH', requires_followup: true, pix_events: events };
  }

  // MEDIUM: took longer or something unclear — improvement signal
  if (took_longer || something_unclear) {
    events.push({ source: 'soft_pix', type: 'improvement_pix', severity: 'MEDIUM', reason: took_longer ? 'delay' : 'unclear', ts });
    return { pix_type: 'improvement_pix', deviation_severity: 'MEDIUM', requires_followup: wants_followup, pix_events: events };
  }

  // All positive — quality signal
  events.push({ source: 'soft_pix', type: 'quality_signal', severity: null, reason: 'all_positive', ts });
  return { pix_type: 'quality_signal', deviation_severity: null, requires_followup: wants_followup, pix_events: events };
}

// ─── Check returning customer (silent signal) ─────────────────────────────────
async function checkReturningCustomer(
  orgId: string,
  phone: string | null,
  vehicleReg: string | null
): Promise<{ is_returning: boolean; days_since_last_visit: number | null }> {
  if (!phone && !vehicleReg) return { is_returning: false, days_since_last_visit: null };
  try {
    const res = await pool.query(
      `SELECT capture_started_at FROM exit_captures
       WHERE org_id = $1 AND (customer_phone = $2 OR vehicle_reg = $3)
       ORDER BY capture_started_at DESC LIMIT 1`,
      [orgId, phone, vehicleReg]
    );
    if (res.rows.length === 0) return { is_returning: false, days_since_last_visit: null };
    const days = Math.floor(
      (Date.now() - new Date(res.rows[0].capture_started_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return { is_returning: true, days_since_last_visit: days };
  } catch {
    return { is_returning: false, days_since_last_visit: null };
  }
}

// ─── POST /api/exit-capture/start ─────────────────────────────────────────────
// Creates a capture session. Returns capture_id + dynamic question set.
// Accepts WorkOrderContext fields so hard PIX is recorded immediately.
router.post('/start', async (req: Request, res: Response) => {
  const {
    work_order_id, trigger_type, customer_phone, vehicle_reg, customer_name,
    // Hard PIX context (system-known facts from the work order)
    context_delay_minutes,
    context_had_additional_work,
    context_customer_waited,
    context_had_parts_issue,
    context_all_nominal,
  } = req.body;
  const org_id = (req as any).orgId || req.body.org_id;

  if (!work_order_id || !trigger_type) {
    return res.status(400).json({ error: 'work_order_id and trigger_type are required' });
  }

  try {
    // Silent signal: check returning customer
    const { is_returning, days_since_last_visit } = await checkReturningCustomer(
      org_id,
      customer_phone || null,
      vehicle_reg || null
    );

    // Store hard PIX context in pix_events immediately (system facts — known before customer is asked)
    const hardPixEvents = context_delay_minutes != null ? [{
      source: 'hard_pix',
      facts: {
        delay_minutes: context_delay_minutes ?? 0,
        had_additional_work: context_had_additional_work ?? false,
        customer_waited: context_customer_waited ?? false,
        had_parts_issue: context_had_parts_issue ?? false,
        all_nominal: context_all_nominal ?? true,
      },
      ts: new Date(),
    }] : [];

    const result = await pool.query(
      `INSERT INTO exit_captures
        (org_id, work_order_id, trigger_type, vehicle_reg, customer_name, customer_phone,
         is_returning_customer, days_since_last_visit, capture_started_at, pix_events)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9::jsonb)
       RETURNING id`,
      [
        org_id || '00000000-0000-0000-0000-000000000000',
        work_order_id,
        trigger_type,
        vehicle_reg || null,
        customer_name || null,
        customer_phone || null,
        is_returning,
        days_since_last_visit,
        JSON.stringify(hardPixEvents),
      ]
    );

    const capture_id = result.rows[0].id;

    // Dynamic question set — same for all trigger types for now, could be branched by job type
    const questions = [
      { id: 'issue_resolved',     text: 'Var allt löst?',                  type: 'yesno' },
      { id: 'took_longer',        text: 'Tog det längre än förväntat?',     type: 'yesno' },
      { id: 'something_unclear',  text: 'Var något oklart?',                type: 'yesno' },
      { id: 'wants_followup',     text: 'Vill kunden bli kontaktad?',       type: 'yesno' },
    ];

    return res.json({ capture_id, questions, is_returning_customer: is_returning });
  } catch (err) {
    console.error('[exit-capture] start error:', err);
    return res.status(500).json({ error: 'Failed to create exit capture' });
  }
});

// ─── POST /api/exit-capture/:captureId/respond ────────────────────────────────
// Saves soft PIX responses. Merges with hard PIX already stored at /start.
// Derives final PIX type and severity. Notifies Ops Lead if required.
router.post('/:captureId/respond', async (req: Request, res: Response) => {
  const { captureId } = req.params;
  const {
    issue_resolved,
    took_longer,
    something_unclear,
    wants_followup,
    unresolved_reason,
    delay_reason,
    unclear_what,
    // Context-aware fields from frontend (pre-derived)
    pix_type: frontendPixType,
    deviation_severity: frontendSeverity,
    requires_followup: frontendRequiresFollowup,
    soft_answers,
  } = req.body;

  try {
    // Fetch existing hard PIX context from the capture record
    const existing = await pool.query(
      'SELECT pix_events FROM exit_captures WHERE id = $1',
      [captureId]
    );
    const existingEvents: object[] = existing.rows[0]?.pix_events ?? [];
    const hardFact = (existingEvents as any[]).find(e => e.source === 'hard_pix');
    const ctx: WorkOrderContext = hardFact?.facts ?? {};

    const { pix_type, deviation_severity, requires_followup, pix_events } = derivePix(
      {
        issue_resolved: issue_resolved ?? true,
        took_longer: took_longer ?? false,
        something_unclear: something_unclear ?? false,
        wants_followup: wants_followup ?? false,
        pix_type: frontendPixType,
        deviation_severity: frontendSeverity,
        requires_followup: frontendRequiresFollowup,
        soft_answers,
      },
      ctx
    );

    // Merge existing hard PIX events with new soft PIX events
    const mergedEvents = [...existingEvents.filter((e: any) => e.source === 'hard_pix'), ...pix_events];

    await pool.query(
      `UPDATE exit_captures SET
        issue_resolved = $1,
        took_longer_than_expected = $2,
        something_unclear = $3,
        wants_followup = $4,
        unresolved_reason = $5,
        delay_reason = $6,
        unclear_what = $7,
        pix_type = $8,
        deviation_severity = $9,
        requires_followup = $10,
        pix_events = $11::jsonb,
        capture_completed_at = NOW()
       WHERE id = $12`,
      [
        issue_resolved ?? true,
        took_longer ?? false,
        something_unclear ?? false,
        wants_followup ?? false,
        unresolved_reason || null,
        delay_reason || null,
        unclear_what || null,
        pix_type,
        deviation_severity,
        requires_followup,
        JSON.stringify(mergedEvents),
        captureId,
      ]
    );

    // Log to console for Ops Lead alerting (extend with push/webhook in future)
    if (pix_type === 'deviation_pix') {
      console.warn(`[exit-capture] DEVIATION ${deviation_severity} — capture ${captureId} — reason: ${unresolved_reason || 'unknown'}`);
    }

    return res.json({
      completed: true,
      pix_created: [pix_type],
      deviation_severity,
      requires_followup,
    });
  } catch (err) {
    console.error('[exit-capture] respond error:', err);
    return res.status(500).json({ error: 'Failed to save capture' });
  }
});

// ─── GET /api/exit-capture/pending-followup ───────────────────────────────────
// All captures requiring Ops Lead attention.
router.get('/pending-followup', async (req: Request, res: Response) => {
  const org_id = (req as any).orgId || req.query.org_id;
  try {
    const result = await pool.query(
      `SELECT id, work_order_id, vehicle_reg, customer_name, customer_phone,
              pix_type, deviation_severity, unresolved_reason,
              capture_completed_at, wants_followup
       FROM exit_captures
       WHERE org_id = $1 AND requires_followup = true AND followup_handled_at IS NULL
       ORDER BY
         CASE deviation_severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
         capture_completed_at DESC`,
      [org_id || '00000000-0000-0000-0000-000000000000']
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[exit-capture] pending-followup error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending followups' });
  }
});

// ─── POST /api/exit-capture/:id/handled ──────────────────────────────────────
// Mark followup as handled by Ops Lead.
router.post('/:id/handled', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId || req.body.handled_by;
  try {
    await pool.query(
      `UPDATE exit_captures SET
        followup_handled_by = $1,
        followup_handled_at = NOW()
       WHERE id = $2`,
      [userId || null, id]
    );
    return res.json({ handled: true });
  } catch (err) {
    console.error('[exit-capture] handled error:', err);
    return res.status(500).json({ error: 'Failed to mark as handled' });
  }
});

// ─── GET /api/exit-capture/stats ─────────────────────────────────────────────
// Aggregate quality signals for dashboard.
router.get('/stats', async (req: Request, res: Response) => {
  const org_id = (req as any).orgId || req.query.org_id;
  const days = parseInt(req.query.days as string) || 30;
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE pix_type = 'quality_signal') AS quality_signals,
        COUNT(*) FILTER (WHERE pix_type = 'improvement_pix') AS improvement_pix,
        COUNT(*) FILTER (WHERE pix_type = 'deviation_pix') AS deviation_pix,
        COUNT(*) FILTER (WHERE deviation_severity = 'CRITICAL') AS critical_count,
        COUNT(*) FILTER (WHERE deviation_severity = 'HIGH') AS high_count,
        COUNT(*) FILTER (WHERE issue_resolved = true) AS resolved_count,
        COUNT(*) FILTER (WHERE issue_resolved = false) AS unresolved_count,
        COUNT(*) FILTER (WHERE took_longer_than_expected = true) AS delay_count,
        COUNT(*) FILTER (WHERE wants_followup = true) AS followup_requested,
        COUNT(*) FILTER (WHERE is_returning_customer = true) AS returning_customers,
        COUNT(*) AS total,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE issue_resolved = true) / NULLIF(COUNT(*), 0), 1
        ) AS resolution_rate_pct
       FROM exit_captures
       WHERE org_id = $1
         AND capture_completed_at > NOW() - ($2::int * INTERVAL '1 day')`,
      [org_id || '00000000-0000-0000-0000-000000000000', days]
    );
    return res.json({ period_days: days, ...result.rows[0] });
  } catch (err) {
    console.error('[exit-capture] stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

// ─── Register in your main Express app ───────────────────────────────────────
// import exitCaptureRouter from './exit-capture-api';
// app.use('/api/exit-capture', authMiddleware, exitCaptureRouter);
