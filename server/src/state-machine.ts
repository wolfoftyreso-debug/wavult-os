// ---------------------------------------------------------------------------
// Generalized State Machine — Hypbit OMS Certified Core
// ---------------------------------------------------------------------------
// ONE engine for ALL workflows. Config-driven — transitions defined in JSON,
// not hardcoded per table. Configs are loaded from the state_machine_configs
// table in Supabase and cached in memory.
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { eventBus, emitEntityEvent } from "./events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Guard {
  /** Field to evaluate — e.g. 'value', 'verified_by', 'role' */
  field: string;
  /** Comparison operator */
  operator: "required" | "gt" | "eq" | "in" | "not_null";
  /** Reference value for gt / eq / in */
  value?: any;
  /** Human-readable error when the guard fails */
  message: string;
  /** Where to look up the field (default: 'entity') */
  source?: "entity" | "actor";
}

export interface TransitionConfig {
  from: string;
  to: string;
  guards?: Guard[];
}

export interface StateMachineConfig {
  entity_type: string;
  states: string[];
  initial_state: string;
  transitions: TransitionConfig[];
}

export interface TransitionResult {
  success: boolean;
  entity_id: string;
  from_status: string;
  to_status: string;
  error?: string;
  event_emitted?: string;
}

// ---------------------------------------------------------------------------
// Event-emission mapping
// ---------------------------------------------------------------------------
// Maps specific (entity_type, to_status) pairs to named domain events.

const EVENT_MAP: Record<string, Record<string, string>> = {
  deal: {
    closed_won: "deal.won",
    WON: "deal.won",
    closed_lost: "deal.lost",
    LOST: "deal.lost",
  },
  task: {
    DONE: "task.completed",
  },
  nc: {
    CLOSED: "nc.closed",
  },
  payout: {
    APPROVED: "payout.approved",
  },
  improvement: {
    APPROVED: "improvement.approved",
  },
};

function resolveSpecificEvent(
  entityType: string,
  toStatus: string
): string | undefined {
  return EVENT_MAP[entityType]?.[toStatus];
}

// ---------------------------------------------------------------------------
// Guard evaluation
// ---------------------------------------------------------------------------

function evaluateGuard(
  guard: Guard,
  entityData: Record<string, unknown>,
  actorData: Record<string, unknown>
): string | null {
  const source =
    guard.source === "actor" ? actorData : entityData;
  const fieldValue = source[guard.field];

  switch (guard.operator) {
    case "required":
      if (!fieldValue) return guard.message;
      break;
    case "not_null":
      if (fieldValue == null) return guard.message;
      break;
    case "gt":
      if (!(Number(fieldValue) > guard.value)) return guard.message;
      break;
    case "eq":
      if (fieldValue !== guard.value) return guard.message;
      break;
    case "in":
      if (!Array.isArray(guard.value) || !guard.value.includes(fieldValue))
        return guard.message;
      break;
    default:
      return `Unknown guard operator: ${(guard as any).operator}`;
  }

  return null; // guard passed
}

// ---------------------------------------------------------------------------
// StateMachine class
// ---------------------------------------------------------------------------

export class StateMachine {
  private configs: Map<string, StateMachineConfig> = new Map();

  // -----------------------------------------------------------------------
  // loadConfigs — pull every row from state_machine_configs and cache
  // -----------------------------------------------------------------------
  async loadConfigs(): Promise<void> {
    const { data, error } = await supabase
      .from("state_machine_configs")
      .select("*");

    if (error) {
      throw new Error(`Failed to load state machine configs: ${error.message}`);
    }

    this.configs.clear();

    for (const row of data ?? []) {
      const config: StateMachineConfig = {
        entity_type: row.entity_type,
        states: row.states,
        initial_state: row.initial_state,
        transitions: row.transitions,
      };
      this.configs.set(config.entity_type, config);
    }

    console.log(
      `[StateMachine] Loaded ${this.configs.size} config(s): ${[...this.configs.keys()].join(", ")}`
    );
  }

  // -----------------------------------------------------------------------
  // transition — the core method
  // -----------------------------------------------------------------------
  async transition(
    entityType: string,
    sourceTable: string,
    sourceId: string,
    toStatus: string,
    actorId: string,
    context?: Record<string, unknown>
  ): Promise<TransitionResult> {
    const base: Omit<TransitionResult, "success"> = {
      entity_id: sourceId,
      from_status: "",
      to_status: toStatus,
    };

    // 1. Load config
    const config = this.configs.get(entityType);
    if (!config) {
      return {
        ...base,
        success: false,
        error: `No state machine config found for entity type "${entityType}"`,
      };
    }

    // 2. Fetch current entity to get current status
    const { data: entity, error: fetchError } = await supabase
      .from(sourceTable)
      .select("*")
      .eq("id", sourceId)
      .single();

    if (fetchError || !entity) {
      return {
        ...base,
        success: false,
        error: fetchError?.message ?? `Entity not found in ${sourceTable}`,
      };
    }

    const fromStatus: string = entity.status;
    base.from_status = fromStatus;

    // 3. Find matching transition
    const transition = config.transitions.find(
      (t) => t.from === fromStatus && t.to === toStatus
    );

    if (!transition) {
      return {
        ...base,
        success: false,
        error: `Invalid transition: "${fromStatus}" → "${toStatus}" is not allowed for ${entityType}`,
      };
    }

    // 4. Build guard data sources
    const entityData: Record<string, unknown> = {
      ...entity,
      ...(context ?? {}),
    };

    let actorData: Record<string, unknown> = {};
    if (transition.guards?.some((g) => g.source === "actor")) {
      const { data: actor } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", actorId)
        .single();
      actorData = (actor as Record<string, unknown>) ?? {};
    }

    // 5. Evaluate guards
    if (transition.guards) {
      for (const guard of transition.guards) {
        const failure = evaluateGuard(guard, entityData, actorData);
        if (failure) {
          return { ...base, success: false, error: failure };
        }
      }
    }

    // 6. Update source table
    const now = new Date().toISOString();

    const { error: updateSourceError } = await supabase
      .from(sourceTable)
      .update({ status: toStatus, updated_at: now })
      .eq("id", sourceId);

    if (updateSourceError) {
      return {
        ...base,
        success: false,
        error: `Failed to update ${sourceTable}: ${updateSourceError.message}`,
      };
    }

    // 7. Update entities table
    const { error: updateEntityError } = await supabase
      .from("entities")
      .update({ status: toStatus, updated_at: now })
      .eq("id", sourceId);

    if (updateEntityError) {
      console.warn(
        `[StateMachine] entities table update failed for ${sourceId}: ${updateEntityError.message}`
      );
    }

    // 8. Create audit log entry
    const { error: auditError } = await supabase.from("audit_logs").insert({
      entity_type: entityType,
      entity_id: sourceId,
      action: "status_changed",
      from_status: fromStatus,
      to_status: toStatus,
      actor_id: actorId,
      created_at: now,
      metadata: context ?? null,
    });

    if (auditError) {
      console.warn(
        `[StateMachine] audit_logs insert failed: ${auditError.message}`
      );
    }

    // 9. Emit domain events
    const genericEvent = `${entityType}.status_changed`;
    emitEntityEvent(
      genericEvent as any,
      entityType,
      sourceId,
      entity.org_id ?? "",
      actorId,
      { from_status: fromStatus, to_status: toStatus, timestamp: now }
    );

    const specificEvent = resolveSpecificEvent(entityType, toStatus);
    if (specificEvent) {
      emitEntityEvent(
        specificEvent as any,
        entityType,
        sourceId,
        entity.org_id ?? "",
        actorId,
        { from_status: fromStatus, to_status: toStatus, timestamp: now }
      );
    }

    // 10. Return result
    return {
      success: true,
      entity_id: sourceId,
      from_status: fromStatus,
      to_status: toStatus,
      event_emitted: specificEvent ?? genericEvent,
    };
  }

  // -----------------------------------------------------------------------
  // getConfig
  // -----------------------------------------------------------------------
  getConfig(entityType: string): StateMachineConfig | undefined {
    return this.configs.get(entityType);
  }

  // -----------------------------------------------------------------------
  // getValidTransitions — possible next statuses from current
  // -----------------------------------------------------------------------
  getValidTransitions(entityType: string, currentStatus: string): string[] {
    const config = this.configs.get(entityType);
    if (!config) return [];

    return config.transitions
      .filter((t) => t.from === currentStatus)
      .map((t) => t.to);
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const stateMachine = new StateMachine();

// ---------------------------------------------------------------------------
// Express Router
// ---------------------------------------------------------------------------

const router = Router();

// POST /api/transitions — Execute a state transition
router.post("/transitions", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { entity_type, source_table, source_id, to_status, context } =
    req.body;

  if (!entity_type || !source_table || !source_id || !to_status) {
    return res.status(400).json({
      error:
        "Missing required fields: entity_type, source_table, source_id, to_status",
    });
  }

  try {
    const result = await stateMachine.transition(
      entity_type,
      source_table,
      source_id,
      to_status,
      user.id,
      context
    );

    if (!result.success) {
      return res.status(422).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    console.error("[StateMachine] transition error:", err);
    return res
      .status(500)
      .json({ error: "Internal error during transition", message: err.message });
  }
});

// GET /api/transitions/valid — Get valid next states
router.get("/transitions/valid", (req: Request, res: Response) => {
  const { entity_type, current_status } = req.query;

  if (!entity_type || !current_status) {
    return res.status(400).json({
      error: "Missing required query params: entity_type, current_status",
    });
  }

  const validStates = stateMachine.getValidTransitions(
    entity_type as string,
    current_status as string
  );

  return res.json({
    entity_type,
    current_status,
    valid_transitions: validStates,
  });
});

// GET /api/state-configs — List all state machine configs
router.get("/state-configs", (_req: Request, res: Response) => {
  const configs: StateMachineConfig[] = [];

  for (const [, config] of (stateMachine as any).configs as Map<
    string,
    StateMachineConfig
  >) {
    configs.push(config);
  }

  return res.json({ configs });
});

export default router;
