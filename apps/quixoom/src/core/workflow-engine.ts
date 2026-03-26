import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import { log as auditLog } from './audit.js';

// ============================================================================
// Temporal Workflow Engine
//
// Generic state machine orchestrator that:
//   1. Defines workflows as state graphs (states + transitions)
//   2. Runs instances with persisted context
//   3. Records every step (immutable audit trail)
//   4. Supports timers for automatic transitions
//   5. Executes side effects (on_enter actions)
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface StateDefinition {
  transitions: Record<string, string>;  // trigger → next_state
  on_enter?: ActionDef[];               // side effects when entering state
  timeout_seconds?: number;             // auto-transition after timeout
  timeout_trigger?: string;             // which trigger to fire on timeout
}

export interface ActionDef {
  type: string;                         // action handler name
  params?: Record<string, unknown>;
}

export interface WorkflowDef {
  slug: string;
  name: string;
  description?: string;
  initial_state: string;
  terminal_states: string[];
  states: Record<string, StateDefinition>;
}

export interface WorkflowInstance {
  id: string;
  definition_slug: string;
  entity_type: string;
  entity_id: string;
  current_state: string;
  context: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
}

export interface TransitionResult {
  instance_id: string;
  from_state: string;
  to_state: string;
  trigger: string;
  actions_executed: string[];
  is_terminal: boolean;
}

// Action handler registry
type ActionHandler = (
  db: DbClient,
  instance: WorkflowInstance,
  action: ActionDef,
) => Promise<Record<string, unknown>>;

const actionHandlers = new Map<string, ActionHandler>();

export function registerAction(name: string, handler: ActionHandler): void {
  actionHandlers.set(name, handler);
}

// ============================================================================
// Workflow Definition Management
// ============================================================================

/**
 * Register a workflow definition in the database.
 */
export async function registerWorkflow(
  db: DbClient,
  def: WorkflowDef,
): Promise<void> {
  await db.query(
    `INSERT INTO qz_workflow_defs (id, slug, name, description, initial_state, terminal_states, states, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       initial_state = EXCLUDED.initial_state,
       terminal_states = EXCLUDED.terminal_states,
       states = EXCLUDED.states,
       version = qz_workflow_defs.version + 1`,
    [
      randomUUID(), def.slug, def.name, def.description ?? null,
      def.initial_state, def.terminal_states, JSON.stringify(def.states),
    ],
  );
}

// ============================================================================
// Instance Lifecycle
// ============================================================================

/**
 * Start a new workflow instance.
 */
export async function startWorkflow(
  db: DbClient,
  params: {
    definition_slug: string;
    entity_type: string;
    entity_id: string;
    context?: Record<string, unknown>;
    actor?: string;
  },
): Promise<WorkflowInstance> {
  // Load definition
  const { rows: defRows } = await db.query(
    `SELECT * FROM qz_workflow_defs WHERE slug = $1 AND active = true`,
    [params.definition_slug],
  );
  if (defRows.length === 0) throw new Error(`Workflow "${params.definition_slug}" not found`);

  const def = defRows[0];
  const states = def.states as Record<string, StateDefinition>;
  const initialState = def.initial_state;
  const instanceId = randomUUID();
  const context = params.context ?? {};

  await db.query(
    `INSERT INTO qz_workflow_instances (
       id, definition_id, definition_slug, entity_type, entity_id,
       current_state, context
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [instanceId, def.id, params.definition_slug, params.entity_type,
     params.entity_id, initialState, JSON.stringify(context)],
  );

  // Record initial step
  await recordStep(db, instanceId, '__init__', initialState, 'start', params.actor);

  // Execute on_enter actions for initial state
  const stateConfig = states[initialState];
  if (stateConfig?.on_enter) {
    const instance: WorkflowInstance = {
      id: instanceId, definition_slug: params.definition_slug,
      entity_type: params.entity_type, entity_id: params.entity_id,
      current_state: initialState, context, started_at: new Date().toISOString(),
    };
    await executeActions(db, instance, stateConfig.on_enter);
  }

  // Set up timer if state has timeout
  if (stateConfig?.timeout_seconds) {
    await createTimer(db, instanceId, stateConfig.timeout_seconds,
      stateConfig.timeout_trigger ?? 'timeout');
  }

  await auditLog(db, {
    event_type: 'workflow.started',
    actor: params.actor ?? 'system',
    resource_type: params.entity_type,
    resource_id: params.entity_id,
    payload: { workflow: params.definition_slug, instance_id: instanceId },
  });

  return {
    id: instanceId, definition_slug: params.definition_slug,
    entity_type: params.entity_type, entity_id: params.entity_id,
    current_state: initialState, context, started_at: new Date().toISOString(),
  };
}

/**
 * Transition a workflow instance to a new state.
 */
export async function transition(
  db: DbClient,
  params: {
    instance_id?: string;
    entity_type?: string;
    entity_id?: string;
    trigger: string;
    input?: Record<string, unknown>;
    actor?: string;
  },
): Promise<TransitionResult> {
  // Load instance
  let instanceQuery: string;
  let instanceParams: unknown[];

  if (params.instance_id) {
    instanceQuery = `SELECT wi.*, wd.states, wd.terminal_states
                     FROM qz_workflow_instances wi
                     JOIN qz_workflow_defs wd ON wd.id = wi.definition_id
                     WHERE wi.id = $1 AND wi.completed_at IS NULL`;
    instanceParams = [params.instance_id];
  } else {
    instanceQuery = `SELECT wi.*, wd.states, wd.terminal_states
                     FROM qz_workflow_instances wi
                     JOIN qz_workflow_defs wd ON wd.id = wi.definition_id
                     WHERE wi.entity_type = $1 AND wi.entity_id = $2 AND wi.completed_at IS NULL`;
    instanceParams = [params.entity_type!, params.entity_id!];
  }

  const { rows } = await db.query(instanceQuery, instanceParams);
  if (rows.length === 0) throw new Error('Active workflow instance not found');

  const row = rows[0];
  const states = row.states as Record<string, StateDefinition>;
  const terminalStates = row.terminal_states as string[];
  const currentState = row.current_state;
  const stateConfig = states[currentState];

  if (!stateConfig) throw new Error(`State "${currentState}" not found in workflow definition`);

  // Check if trigger is valid
  const nextState = stateConfig.transitions[params.trigger];
  if (!nextState) {
    throw new Error(
      `Invalid trigger "${params.trigger}" for state "${currentState}". Valid: ${Object.keys(stateConfig.transitions).join(', ')}`,
    );
  }

  const startTime = Date.now();

  // Merge input into context
  const context = { ...row.context, ...(params.input ?? {}) };

  // Update instance
  const isTerminal = terminalStates.includes(nextState);
  await db.query(
    `UPDATE qz_workflow_instances
     SET current_state = $1, context = $2, updated_at = now(),
         completed_at = $3
     WHERE id = $4`,
    [nextState, JSON.stringify(context), isTerminal ? new Date().toISOString() : null, row.id],
  );

  // Record step
  const durationMs = Date.now() - startTime;
  await recordStep(db, row.id, currentState, nextState, params.trigger, params.actor, params.input, durationMs);

  // Cancel any pending timers for the old state
  await db.query(
    `UPDATE qz_workflow_timers SET status = 'cancelled' WHERE instance_id = $1 AND status = 'pending'`,
    [row.id],
  );

  // Execute on_enter actions for new state
  const nextStateConfig = states[nextState];
  const actionsExecuted: string[] = [];
  if (nextStateConfig?.on_enter) {
    const instance: WorkflowInstance = {
      id: row.id, definition_slug: row.definition_slug,
      entity_type: row.entity_type, entity_id: row.entity_id,
      current_state: nextState, context, started_at: row.started_at,
    };
    for (const action of nextStateConfig.on_enter) {
      await executeActions(db, instance, [action]);
      actionsExecuted.push(action.type);
    }
  }

  // Set up timer for new state
  if (nextStateConfig?.timeout_seconds && !isTerminal) {
    await createTimer(db, row.id, nextStateConfig.timeout_seconds,
      nextStateConfig.timeout_trigger ?? 'timeout');
  }

  await auditLog(db, {
    event_type: 'workflow.transition',
    actor: params.actor ?? 'system',
    resource_type: row.entity_type,
    resource_id: row.entity_id,
    payload: {
      workflow: row.definition_slug,
      from: currentState, to: nextState,
      trigger: params.trigger, terminal: isTerminal,
    },
  });

  return {
    instance_id: row.id,
    from_state: currentState,
    to_state: nextState,
    trigger: params.trigger,
    actions_executed: actionsExecuted,
    is_terminal: isTerminal,
  };
}

/**
 * Get current state of a workflow.
 */
export async function getState(
  db: DbClient,
  entityType: string,
  entityId: string,
): Promise<WorkflowInstance | null> {
  const { rows } = await db.query(
    `SELECT * FROM qz_workflow_instances WHERE entity_type = $1 AND entity_id = $2
     ORDER BY started_at DESC LIMIT 1`,
    [entityType, entityId],
  );
  return rows[0] ?? null;
}

/**
 * Get full step history for a workflow instance.
 */
export async function getHistory(
  db: DbClient,
  instanceId: string,
): Promise<Array<{ from_state: string; to_state: string; trigger: string; actor: string; created_at: string }>> {
  const { rows } = await db.query(
    `SELECT from_state, to_state, trigger, actor, input, output, duration_ms, created_at
     FROM qz_workflow_steps WHERE instance_id = $1 ORDER BY created_at ASC`,
    [instanceId],
  );
  return rows;
}

/**
 * Process expired timers — call this from a cron job / scheduler.
 */
export async function processTimers(db: DbClient): Promise<number> {
  const { rows: timers } = await db.query(
    `SELECT t.*, wi.entity_type, wi.entity_id
     FROM qz_workflow_timers t
     JOIN qz_workflow_instances wi ON wi.id = t.instance_id
     WHERE t.status = 'pending' AND t.fires_at <= now()
     LIMIT 100`,
  );

  let processed = 0;
  for (const timer of timers) {
    try {
      await transition(db, {
        instance_id: timer.instance_id,
        trigger: timer.trigger_name,
        actor: 'system:timer',
      });
      await db.query(
        `UPDATE qz_workflow_timers SET status = 'fired' WHERE id = $1`,
        [timer.id],
      );
      processed++;
    } catch (err) {
      console.error(`[workflow] timer ${timer.id} failed:`, err);
    }
  }

  return processed;
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function recordStep(
  db: DbClient,
  instanceId: string,
  fromState: string,
  toState: string,
  trigger: string,
  actor?: string,
  input?: Record<string, unknown>,
  durationMs?: number,
): Promise<void> {
  await db.query(
    `INSERT INTO qz_workflow_steps (id, instance_id, from_state, to_state, trigger, actor, input, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [randomUUID(), instanceId, fromState, toState, trigger, actor ?? 'system',
     JSON.stringify(input ?? {}), durationMs ?? null],
  );
}

async function createTimer(
  db: DbClient,
  instanceId: string,
  timeoutSeconds: number,
  triggerName: string,
): Promise<void> {
  const firesAt = new Date(Date.now() + timeoutSeconds * 1000);
  await db.query(
    `INSERT INTO qz_workflow_timers (id, instance_id, fires_at, trigger_name)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), instanceId, firesAt.toISOString(), triggerName],
  );
}

async function executeActions(
  db: DbClient,
  instance: WorkflowInstance,
  actions: ActionDef[],
): Promise<void> {
  for (const action of actions) {
    const handler = actionHandlers.get(action.type);
    if (handler) {
      try {
        const output = await handler(db, instance, action);
        // Merge output into instance context
        if (output && Object.keys(output).length > 0) {
          await db.query(
            `UPDATE qz_workflow_instances SET context = context || $1 WHERE id = $2`,
            [JSON.stringify(output), instance.id],
          );
        }
      } catch (err) {
        console.error(`[workflow] action ${action.type} failed:`, err);
        await db.query(
          `UPDATE qz_workflow_instances SET error = $1, retry_count = retry_count + 1 WHERE id = $2`,
          [(err as Error).message, instance.id],
        );
      }
    }
  }
}
