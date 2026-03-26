import type { DbClient } from './db.js';
import * as engine from './workflow-engine.js';
import * as wallet from './wallet.js';
import * as levels from './levels.js';
import { randomUUID } from 'crypto';

// ============================================================================
// Concrete Workflow Definitions + Action Handlers
//
// Three core workflows:
//   1. Package Completion (capture → analyze → approve → payout)
//   2. Payment-Invoice-Payout (create → compliance → invoice → execute → settle)
//   3. IR Lifecycle (create → populate → review → publish → sell)
// ============================================================================

// ============================================================================
// 1. PACKAGE COMPLETION WORKFLOW
//
// States: created → claimed → capturing → submitted → analyzing
//         → approved → paying_out → completed
//                   → rejected → (terminal)
//         → expired → (terminal)
// ============================================================================

export const PACKAGE_WORKFLOW: engine.WorkflowDef = {
  slug: 'package-completion',
  name: 'Photo Package Completion',
  description: 'Guides a creator from claiming a package through payout',
  initial_state: 'created',
  terminal_states: ['completed', 'rejected', 'expired', 'cancelled'],
  states: {
    created: {
      transitions: { claim: 'claimed', expire: 'expired', cancel: 'cancelled' },
      timeout_seconds: 86400, // 24h to claim
      timeout_trigger: 'expire',
    },
    claimed: {
      transitions: { start_capture: 'capturing', release: 'created', expire: 'expired' },
      on_enter: [{ type: 'notify_creator', params: { template: 'package_claimed' } }],
      timeout_seconds: 14400, // 4h to start
      timeout_trigger: 'expire',
    },
    capturing: {
      transitions: { submit: 'submitted', abandon: 'created' },
      timeout_seconds: 7200, // 2h to complete
      timeout_trigger: 'abandon',
    },
    submitted: {
      transitions: { analyze: 'analyzing' },
      on_enter: [{ type: 'trigger_ai_analysis' }],
    },
    analyzing: {
      transitions: { analysis_complete: 'review', analysis_failed: 'submitted' },
      timeout_seconds: 300, // 5min timeout on AI
      timeout_trigger: 'analysis_failed',
    },
    review: {
      transitions: { approve: 'approved', reject: 'rejected', request_reshoot: 'capturing' },
      on_enter: [{ type: 'auto_approve_check' }],
    },
    approved: {
      transitions: { initiate_payout: 'paying_out' },
      on_enter: [{ type: 'calculate_payout' }, { type: 'initiate_payout' }],
    },
    paying_out: {
      transitions: { payout_success: 'completed', payout_failed: 'approved' },
      on_enter: [{ type: 'execute_payout' }],
      timeout_seconds: 30,
      timeout_trigger: 'payout_failed',
    },
    completed: {
      transitions: {},
      on_enter: [
        { type: 'update_streak' },
        { type: 'check_level_upgrade' },
        { type: 'notify_creator', params: { template: 'payout_complete' } },
        { type: 'generate_invoice' },
      ],
    },
    rejected: {
      transitions: {},
      on_enter: [{ type: 'notify_creator', params: { template: 'package_rejected' } }],
    },
    expired: { transitions: {} },
    cancelled: { transitions: {} },
  },
};

// ============================================================================
// 2. PAYMENT-INVOICE-PAYOUT WORKFLOW
//
// For marketplace purchases and creator payouts:
// States: initiated → compliance_check → invoicing → executing → settled
//         → held → (needs manual review)
//         → failed → (terminal)
// ============================================================================

export const PAYMENT_WORKFLOW: engine.WorkflowDef = {
  slug: 'payment-invoice-payout',
  name: 'Payment → Invoice → Payout',
  description: 'Full financial flow for marketplace transactions',
  initial_state: 'initiated',
  terminal_states: ['settled', 'failed', 'refunded'],
  states: {
    initiated: {
      transitions: { check_compliance: 'compliance_check' },
      on_enter: [{ type: 'validate_payment' }],
    },
    compliance_check: {
      transitions: { cleared: 'invoicing', flagged: 'held', failed: 'failed' },
      on_enter: [{ type: 'run_compliance' }],
    },
    held: {
      transitions: { approve: 'invoicing', reject: 'failed' },
      on_enter: [{ type: 'notify_compliance_team' }],
      timeout_seconds: 86400, // 24h review window
      timeout_trigger: 'reject',
    },
    invoicing: {
      transitions: { invoice_created: 'executing' },
      on_enter: [{ type: 'create_invoice' }, { type: 'commit_ledger_entries' }],
    },
    executing: {
      transitions: { executed: 'settling', failed: 'failed' },
      on_enter: [{ type: 'execute_psp_transfer' }],
      timeout_seconds: 60,
      timeout_trigger: 'failed',
    },
    settling: {
      transitions: { settled: 'settled', failed: 'failed' },
      on_enter: [{ type: 'reconcile_payment' }, { type: 'credit_creator_wallet' }],
    },
    settled: {
      transitions: { refund: 'refunding' },
      on_enter: [{ type: 'generate_receipt' }, { type: 'notify_parties' }],
    },
    refunding: {
      transitions: { refunded: 'refunded', refund_failed: 'settled' },
      on_enter: [{ type: 'process_refund' }],
    },
    failed: {
      transitions: { retry: 'initiated' },
      on_enter: [{ type: 'notify_failure' }],
    },
    refunded: { transitions: {} },
  },
};

// ============================================================================
// 3. IR LIFECYCLE WORKFLOW
//
// States: draft → populating → analyzing → review → published → selling
//         → archived
// ============================================================================

export const IR_LIFECYCLE_WORKFLOW: engine.WorkflowDef = {
  slug: 'ir-lifecycle',
  name: 'Intelligence Repo Lifecycle',
  description: 'Guides an IR from creation through marketplace listing',
  initial_state: 'draft',
  terminal_states: ['archived'],
  states: {
    draft: {
      transitions: { start_populating: 'populating', archive: 'archived' },
    },
    populating: {
      transitions: { request_analysis: 'analyzing', archive: 'archived' },
      on_enter: [{ type: 'suggest_data_structure' }],
    },
    analyzing: {
      transitions: { analysis_done: 'review', analysis_failed: 'populating' },
      on_enter: [{ type: 'run_ir_analysis' }],
      timeout_seconds: 600,
      timeout_trigger: 'analysis_failed',
    },
    review: {
      transitions: { publish: 'published', needs_more_data: 'populating', reject: 'draft' },
      on_enter: [{ type: 'calculate_ir_quality' }, { type: 'suggest_price' }],
    },
    published: {
      transitions: { create_listing: 'selling', unpublish: 'draft', archive: 'archived' },
      on_enter: [{ type: 'notify_creator', params: { template: 'ir_published' } }],
    },
    selling: {
      transitions: { pause: 'published', archive: 'archived' },
      on_enter: [{ type: 'create_marketplace_listing' }, { type: 'extract_leads' }],
    },
    archived: { transitions: {} },
  },
};

// ============================================================================
// ACTION HANDLERS
// ============================================================================

export function registerAllActions(): void {
  // ---- Package Workflow Actions ----

  engine.registerAction('notify_creator', async (_db, instance, action) => {
    const template = (action.params?.template as string) ?? 'generic';
    console.log(`[workflow:notify] ${template} → user for ${instance.entity_type}:${instance.entity_id}`);
    // In production: push notification, email, in-app message
    return { notified: true, template };
  });

  engine.registerAction('trigger_ai_analysis', async (db, instance) => {
    // Mark all images in the package for AI analysis
    await db.query(
      `UPDATE qz_images SET ai_status = 'pending'
       WHERE task_id IN (
         SELECT id FROM qz_tasks WHERE id = (
           SELECT task_id FROM qz_task_assignments WHERE id = $1
         )
       ) AND ai_status = 'pending'`,
      [instance.entity_id],
    );
    return { ai_triggered: true };
  });

  engine.registerAction('auto_approve_check', async (db, instance) => {
    // Auto-approve if all images score > 80
    const { rows } = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE ai_score >= 80) AS high_quality
       FROM qz_package_captures pc
       JOIN qz_images i ON i.id = pc.image_id
       WHERE pc.package_id = $1`,
      [instance.entity_id],
    );

    const total = parseInt(rows[0]?.total ?? '0');
    const highQuality = parseInt(rows[0]?.high_quality ?? '0');

    if (total > 0 && highQuality === total) {
      // Auto-transition to approved
      return { auto_approved: true, quality_ratio: 1.0 };
    }
    return { auto_approved: false, quality_ratio: total > 0 ? highQuality / total : 0 };
  });

  engine.registerAction('calculate_payout', async (db, instance) => {
    const { rows } = await db.query(
      `SELECT pp.total_payout, pp.payout_per_image, pp.assigned_to
       FROM qz_photo_packages pp WHERE pp.id = $1`,
      [instance.entity_id],
    );
    if (rows.length === 0) return {};

    return {
      payout_amount: parseFloat(rows[0].total_payout),
      payout_per_image: parseFloat(rows[0].payout_per_image),
      user_id: rows[0].assigned_to,
    };
  });

  engine.registerAction('initiate_payout', async (_db, _instance) => {
    // Trigger payout — the execute_payout action does the real work
    return { payout_initiated: true };
  });

  engine.registerAction('execute_payout', async (db, instance) => {
    const userId = instance.context.user_id as string;
    const amount = instance.context.payout_amount as number;
    if (!userId || !amount) return { payout_error: 'missing user_id or amount' };

    await wallet.creditAvailable(db, {
      user_id: userId,
      amount,
      type: 'task_payout',
      reference_type: 'photo_package',
      reference_id: instance.entity_id,
      description: 'Photo package payout',
      actor: 'system:workflow',
    });

    return { payout_executed: true, amount };
  });

  engine.registerAction('update_streak', async (db, instance) => {
    const userId = instance.context.user_id as string;
    if (!userId) return {};

    const streak = await levels.recordTaskCompletion(db, userId);
    return { streak_count: streak.streak_count, streak_multiplier: streak.multiplier };
  });

  engine.registerAction('check_level_upgrade', async (db, instance) => {
    const userId = instance.context.user_id as string;
    if (!userId) return {};

    const result = await levels.checkAndUpgrade(db, userId);
    return { upgraded: result.upgraded, new_level: result.new_level?.name };
  });

  engine.registerAction('generate_invoice', async (db, instance) => {
    const userId = instance.context.user_id as string;
    const amount = instance.context.payout_amount as number;
    if (!userId || !amount) return {};

    const invoiceId = randomUUID();
    await db.query(
      `INSERT INTO qz_invoices (id, user_id, type, amount, currency, reference_type, reference_id, status, issued_at)
       VALUES ($1, $2, 'creator_payout', $3, 'SEK', 'photo_package', $4, 'issued', now())`,
      [invoiceId, userId, amount, instance.entity_id],
    );

    return { invoice_id: invoiceId };
  });

  // ---- Payment Workflow Actions ----

  engine.registerAction('validate_payment', async (_db, instance) => {
    const amount = instance.context.amount as number;
    if (!amount || amount <= 0) throw new Error('Invalid payment amount');
    return { validated: true };
  });

  engine.registerAction('run_compliance', async (_db, instance) => {
    // Simplified — in production hooks into compliance engine
    const amount = instance.context.amount as number;
    if (amount > 100000) return { compliance_hold: true };
    return { compliance_hold: false };
  });

  engine.registerAction('create_invoice', async (db, instance) => {
    const invoiceId = randomUUID();
    const buyerId = instance.context.buyer_id as string;
    const amount = instance.context.amount as number;

    await db.query(
      `INSERT INTO qz_invoices (id, buyer_id, type, amount, currency, reference_type, reference_id, status, issued_at, due_at)
       VALUES ($1, $2, 'buyer_charge', $3, 'SEK', $4, $5, 'issued', now(), now() + interval '30 days')`,
      [invoiceId, buyerId, amount, instance.entity_type, instance.entity_id],
    );

    return { invoice_id: invoiceId };
  });

  engine.registerAction('commit_ledger_entries', async (_db, instance) => {
    // In production: create double-entry ledger entries
    return { ledger_committed: true, reference: instance.entity_id };
  });

  engine.registerAction('execute_psp_transfer', async (_db, instance) => {
    // In production: call PSP adapter
    return { psp_reference: `psp_${Date.now()}`, transfer_initiated: true };
  });

  engine.registerAction('reconcile_payment', async (_db, _instance) => {
    return { reconciled: true };
  });

  engine.registerAction('credit_creator_wallet', async (db, instance) => {
    const creatorId = instance.context.creator_id as string;
    const creatorPayout = instance.context.creator_payout as number;
    if (!creatorId || !creatorPayout) return {};

    await wallet.creditAvailable(db, {
      user_id: creatorId,
      amount: creatorPayout,
      type: 'ir_sale',
      reference_type: instance.entity_type,
      reference_id: instance.entity_id,
      description: 'Marketplace sale payout',
      actor: 'system:workflow',
    });

    return { creator_credited: true };
  });

  engine.registerAction('generate_receipt', async (_db, _instance) => {
    return { receipt_generated: true };
  });

  engine.registerAction('notify_parties', async (_db, instance) => {
    console.log(`[workflow:notify] payment settled for ${instance.entity_id}`);
    return { parties_notified: true };
  });

  engine.registerAction('notify_compliance_team', async (_db, instance) => {
    console.log(`[workflow:compliance] hold on ${instance.entity_id} — requires review`);
    return { compliance_team_notified: true };
  });

  engine.registerAction('notify_failure', async (_db, instance) => {
    console.log(`[workflow:failure] ${instance.entity_type}:${instance.entity_id}`);
    return { failure_notified: true };
  });

  engine.registerAction('process_refund', async (_db, _instance) => {
    return { refund_processed: true };
  });

  // ---- IR Lifecycle Actions ----

  engine.registerAction('suggest_data_structure', async (_db, instance) => {
    // In production: AI suggests fields, categories, capture requirements
    return { suggested_fields: ['address', 'condition', 'category', 'photo'], suggestion_generated: true };
  });

  engine.registerAction('run_ir_analysis', async (_db, instance) => {
    // Trigger batch AI analysis on all IR items
    return { analysis_started: true, items_queued: 0 };
  });

  engine.registerAction('calculate_ir_quality', async (db, instance) => {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS items, AVG(ai_score) AS avg_score, AVG(lead_score) AS avg_lead
       FROM qz_ir_items WHERE repo_id = $1`,
      [instance.entity_id],
    );
    return {
      item_count: parseInt(rows[0]?.items ?? '0'),
      avg_quality: parseFloat(rows[0]?.avg_score ?? '0'),
      avg_lead_score: parseFloat(rows[0]?.avg_lead ?? '0'),
    };
  });

  engine.registerAction('suggest_price', async (_db, instance) => {
    // In production: call pricing engine
    return { price_suggested: true };
  });

  engine.registerAction('create_marketplace_listing', async (_db, instance) => {
    // In production: auto-create listing
    return { listing_creation_triggered: true };
  });

  engine.registerAction('extract_leads', async (_db, instance) => {
    // In production: call marketplace.extractLeads
    return { lead_extraction_triggered: true };
  });
}
