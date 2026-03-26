import { Router, type Request, type Response } from 'express';
import { getPool, withTransaction } from '../core/db.js';
import * as workflowEngine from '../core/workflow-engine.js';
import * as workflows from '../core/workflows.js';

export const workflowRouter = Router();

// Register all workflow definitions and action handlers on startup
let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  workflows.registerAllActions();

  const pool = getPool();
  await workflowEngine.registerWorkflow(pool, workflows.PACKAGE_WORKFLOW);
  await workflowEngine.registerWorkflow(pool, workflows.PAYMENT_WORKFLOW);
  await workflowEngine.registerWorkflow(pool, workflows.IR_LIFECYCLE_WORKFLOW);
  initialized = true;
}

// ============================================================================
// Start a workflow
// ============================================================================
workflowRouter.post('/start', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    const actor = req.headers['x-actor'] as string || 'system';
    const { definition_slug, entity_type, entity_id, context } = req.body;

    const instance = await withTransaction(async (client) =>
      workflowEngine.startWorkflow(client, {
        definition_slug, entity_type, entity_id, context, actor,
      }),
    );

    res.status(201).json(instance);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// Trigger a transition
// ============================================================================
workflowRouter.post('/transition', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    const actor = req.headers['x-actor'] as string || 'system';
    const { instance_id, entity_type, entity_id, trigger, input } = req.body;

    const result = await withTransaction(async (client) =>
      workflowEngine.transition(client, {
        instance_id, entity_type, entity_id, trigger, input, actor,
      }),
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// Get workflow state
// ============================================================================
workflowRouter.get('/state/:entityType/:entityId', async (req: Request, res: Response) => {
  const state = await workflowEngine.getState(
    getPool(), req.params.entityType, req.params.entityId,
  );
  if (!state) { res.status(404).json({ error: 'No workflow found' }); return; }
  res.json(state);
});

// ============================================================================
// Get workflow history
// ============================================================================
workflowRouter.get('/history/:instanceId', async (req: Request, res: Response) => {
  const history = await workflowEngine.getHistory(getPool(), req.params.instanceId);
  res.json(history);
});

// ============================================================================
// Process timers (called by cron / scheduler)
// ============================================================================
workflowRouter.post('/timers/process', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    const processed = await withTransaction(async (client) =>
      workflowEngine.processTimers(client),
    );
    res.json({ processed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// List active workflows
// ============================================================================
workflowRouter.get('/active', async (req: Request, res: Response) => {
  const entityType = req.query.entity_type as string;
  const limit = parseInt(req.query.limit as string) || 50;

  let sql = `SELECT * FROM qz_workflow_instances WHERE completed_at IS NULL`;
  const params: unknown[] = [];

  if (entityType) {
    params.push(entityType);
    sql += ` AND entity_type = $${params.length}`;
  }

  params.push(limit);
  sql += ` ORDER BY updated_at DESC LIMIT $${params.length}`;

  const { rows } = await getPool().query(sql, params);
  res.json(rows);
});

// ============================================================================
// List workflow definitions
// ============================================================================
workflowRouter.get('/definitions', async (_req: Request, res: Response) => {
  const { rows } = await getPool().query(
    `SELECT slug, name, description, initial_state, terminal_states, version
     FROM qz_workflow_defs WHERE active = true ORDER BY name`,
  );
  res.json(rows);
});
