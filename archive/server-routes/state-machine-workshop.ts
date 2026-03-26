// ---------------------------------------------------------------------------
// Workshop Hard Enforcement Engine — State Machine
// ---------------------------------------------------------------------------
// "Ingen verkstad kan göra fel — systemet tillåter det inte"
//
// States: BOOKED → PREPLANNED → CHECKED_IN → IN_PROGRESS →
//         [ADDITIONAL_WORK] → QC_PENDING → QC_APPROVED →
//         READY_FOR_DELIVERY → DELIVERED → CLOSED
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkshopState =
  | "BOOKED"
  | "PREPLANNED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "ADDITIONAL_WORK"
  | "QC_PENDING"
  | "QC_APPROVED"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CLOSED";

export type WorkshopRole =
  | "TECHNICIAN"
  | "SERVICE_ADVISOR"
  | "QC_INSPECTOR"
  | "RECEPTIONIST"
  | "WORKSHOP_MANAGER"
  | "PARTS_MANAGER"
  | "SYSTEM";

export interface Blocker {
  check: string;
  message: string;
}

export interface TransitionRule {
  from: WorkshopState;
  to: WorkshopState;
  required_role: WorkshopRole[];
  required_data: string[];
  blockers: Blocker[];
  auto_action?: string;
  auto_after_hours?: number;
}

export interface TransitionContext {
  user_id: string;
  user_role: WorkshopRole;
  org_id: string;
  data: Record<string, unknown>;
  ip_address?: string;
}

export interface BlockerResult {
  check: string;
  message: string;
}

export interface TransitionAttemptResult {
  success: boolean;
  from_state?: string;
  to_state?: string;
  blockers?: BlockerResult[];
  error?: string;
  work_order_id?: string;
  audit_id?: string;
}

export interface AvailableTransition {
  to_state: WorkshopState;
  blockers: BlockerResult[];
  can_transition: boolean;
  requires_role: WorkshopRole[];
}

// ---------------------------------------------------------------------------
// Transition Rules — The Core Enforcement Configuration
// ---------------------------------------------------------------------------

export const WORKSHOP_TRANSITIONS: Record<string, TransitionRule> = {
  BOOKED_TO_PREPLANNED: {
    from: "BOOKED",
    to: "PREPLANNED",
    required_role: ["SERVICE_ADVISOR", "WORKSHOP_MANAGER"],
    required_data: ["technician_assigned", "estimated_hours", "parts_check"],
    blockers: [
      {
        check: "technician_assigned",
        message: "Tekniker måste tilldelas innan planering",
      },
      {
        check: "estimated_hours",
        message: "Estimerad tid måste anges",
      },
    ],
  },

  PREPLANNED_TO_CHECKED_IN: {
    from: "PREPLANNED",
    to: "CHECKED_IN",
    required_role: ["SERVICE_ADVISOR", "RECEPTIONIST"],
    required_data: [
      "customer_signature",
      "vehicle_condition_photos",
      "scope_confirmed",
    ],
    blockers: [
      {
        check: "customer_signature",
        message: "Kund måste signera arbetsorder",
      },
      {
        check: "vehicle_condition_photos",
        message: "Fordonsfoton krävs vid inlämning (min 4 bilder)",
      },
      {
        check: "scope_confirmed",
        message: "Arbetsomfattning måste bekräftas",
      },
    ],
  },

  CHECKED_IN_TO_IN_PROGRESS: {
    from: "CHECKED_IN",
    to: "IN_PROGRESS",
    required_role: ["TECHNICIAN", "WORKSHOP_MANAGER"],
    required_data: ["technician_id", "start_time"],
    blockers: [
      {
        check: "technician_id",
        message: "Tekniker måste vara tilldelad",
      },
      {
        check: "bay_available",
        message: "Arbetsplats (bay) måste vara ledig",
      },
    ],
  },

  IN_PROGRESS_TO_ADDITIONAL_WORK: {
    from: "IN_PROGRESS",
    to: "ADDITIONAL_WORK",
    required_role: ["TECHNICIAN"],
    required_data: ["additional_work_description", "additional_work_cost"],
    blockers: [],
    auto_action: "notify_service_advisor",
  },

  ADDITIONAL_WORK_TO_IN_PROGRESS: {
    from: "ADDITIONAL_WORK",
    to: "IN_PROGRESS",
    required_role: ["SERVICE_ADVISOR"],
    required_data: ["customer_approval", "approval_method"],
    blockers: [
      {
        check: "customer_approval",
        message: "Kund måste godkänna tilläggsarbete",
      },
    ],
  },

  IN_PROGRESS_TO_QC_PENDING: {
    from: "IN_PROGRESS",
    to: "QC_PENDING",
    required_role: ["TECHNICIAN"],
    required_data: [
      "all_tasks_completed",
      "time_reported",
      "no_pending_additional",
    ],
    blockers: [
      {
        check: "all_tasks_completed",
        message: "Alla uppgifter måste markeras klara",
      },
      {
        check: "time_reported",
        message: "Tid måste rapporteras (minst 0.1h)",
      },
      {
        check: "no_pending_additional",
        message: "Väntande tilläggsarbete måste hanteras",
      },
    ],
  },

  QC_PENDING_TO_QC_APPROVED: {
    from: "QC_PENDING",
    to: "QC_APPROVED",
    required_role: ["QC_INSPECTOR", "WORKSHOP_MANAGER"],
    required_data: [
      "qc_checklist_complete",
      "qc_inspector_id",
      "qc_signature",
    ],
    blockers: [
      {
        check: "qc_checklist_complete",
        message: "QC-checklista måste vara 100% avklarad",
      },
      {
        check: "qc_inspector_ne_technician",
        message: "QC-ansvarig kan inte vara samma person som utförde arbetet",
      },
    ],
  },

  QC_APPROVED_TO_READY: {
    from: "QC_APPROVED",
    to: "READY_FOR_DELIVERY",
    required_role: ["SERVICE_ADVISOR"],
    required_data: ["invoice_created", "customer_notified"],
    blockers: [
      {
        check: "invoice_created",
        message: "Faktura måste skapas innan leverans",
      },
      {
        check: "customer_notified",
        message: "Kund måste notifieras att bilen är klar",
      },
    ],
  },

  READY_TO_DELIVERED: {
    from: "READY_FOR_DELIVERY",
    to: "DELIVERED",
    required_role: ["SERVICE_ADVISOR"],
    required_data: [
      "payment_confirmed",
      "delivery_checklist",
      "odometer_out",
      "customer_final_signature",
    ],
    blockers: [
      {
        check: "payment_confirmed",
        message: "Betalning måste bekräftas",
      },
      {
        check: "delivery_checklist",
        message: "Leveranschecklista måste fyllas i",
      },
      {
        check: "customer_final_signature",
        message: "Kund måste signera leveransprotokoll",
      },
    ],
  },

  DELIVERED_TO_CLOSED: {
    from: "DELIVERED",
    to: "CLOSED",
    required_role: ["WORKSHOP_MANAGER", "SYSTEM"],
    required_data: ["warranty_filed_if_applicable", "csi_survey_sent"],
    blockers: [],
    auto_after_hours: 48, // Auto-stäng 48h efter leverans
  },
};

// ---------------------------------------------------------------------------
// State ordering for progress bar
// ---------------------------------------------------------------------------

export const STATE_ORDER: WorkshopState[] = [
  "BOOKED",
  "PREPLANNED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "QC_PENDING",
  "QC_APPROVED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CLOSED",
];

// ---------------------------------------------------------------------------
// WorkshopStateMachine
// ---------------------------------------------------------------------------

export class WorkshopStateMachine {
  // -----------------------------------------------------------------------
  // findTransitionRule — find the rule for from→to
  // -----------------------------------------------------------------------
  findTransitionRule(
    fromState: WorkshopState,
    toState: WorkshopState
  ): TransitionRule | null {
    return (
      Object.values(WORKSHOP_TRANSITIONS).find(
        (t) => t.from === fromState && t.to === toState
      ) ?? null
    );
  }

  // -----------------------------------------------------------------------
  // evaluateBlockers — check which blockers are still active
  // -----------------------------------------------------------------------
  async evaluateBlockers(
    rule: TransitionRule,
    workOrderId: string,
    context: TransitionContext
  ): Promise<BlockerResult[]> {
    const activeBlockers: BlockerResult[] = [];
    const data = context.data ?? {};

    // Fetch the work order to check stored fields
    const { data: workOrder } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    const combined: Record<string, unknown> = {
      ...(workOrder ?? {}),
      ...data,
    };

    for (const blocker of rule.blockers) {
      const failed = await this.checkBlocker(blocker, combined, workOrderId, context);
      if (failed) {
        activeBlockers.push(blocker);
      }
    }

    return activeBlockers;
  }

  // -----------------------------------------------------------------------
  // checkBlocker — evaluate a single blocker condition
  // -----------------------------------------------------------------------
  private async checkBlocker(
    blocker: Blocker,
    combined: Record<string, unknown>,
    workOrderId: string,
    context: TransitionContext
  ): Promise<boolean> {
    const { check } = blocker;

    switch (check) {
      case "technician_assigned":
        return !combined.technician_id && !combined.technician_assigned;

      case "estimated_hours":
        return !combined.estimated_hours && !combined.estimatedHours;

      case "customer_signature":
        return !combined.customer_signature;

      case "vehicle_condition_photos": {
        // Check if photos exist (min 4)
        const photos = combined.vehicle_condition_photos;
        if (!photos) return true;
        if (Array.isArray(photos)) return photos.length < 4;
        if (typeof photos === "number") return photos < 4;
        return false;
      }

      case "scope_confirmed":
        return !combined.scope_confirmed;

      case "technician_id":
        return !combined.technician_id;

      case "bay_available": {
        // Check if bay is occupied by another active work order
        const bay = combined.bay_number;
        if (!bay) return true; // No bay assigned = blocker
        const { data: conflict } = await supabase
          .from("work_orders")
          .select("id")
          .eq("bay_number", bay)
          .eq("status", "IN_PROGRESS")
          .neq("id", workOrderId)
          .limit(1);
        return (conflict?.length ?? 0) > 0;
      }

      case "customer_approval":
        return !combined.customer_approval;

      case "all_tasks_completed": {
        // Check work order tasks table
        const { data: tasks } = await supabase
          .from("work_order_tasks")
          .select("id, completed")
          .eq("work_order_id", workOrderId);
        if (!tasks || tasks.length === 0) return false; // No tasks = OK
        return tasks.some((t: any) => !t.completed);
      }

      case "time_reported": {
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("hours")
          .eq("work_order_id", workOrderId);
        const totalHours = (timeEntries ?? []).reduce(
          (sum: number, e: any) => sum + (e.hours ?? 0),
          0
        );
        return totalHours < 0.1;
      }

      case "no_pending_additional": {
        const { data: wo } = await supabase
          .from("work_orders")
          .select("status")
          .eq("id", workOrderId)
          .single();
        return wo?.status === "ADDITIONAL_WORK";
      }

      case "qc_checklist_complete": {
        const { data: checklist } = await supabase
          .from("checklist_items")
          .select("id, completed, required")
          .eq("work_order_id", workOrderId)
          .eq("checklist_type", "QC");
        if (!checklist) return true;
        const required = checklist.filter(
          (i: any) => i.required === true
        );
        return required.some((i: any) => !i.completed);
      }

      case "qc_inspector_ne_technician": {
        const { data: wo } = await supabase
          .from("work_orders")
          .select("technician_id")
          .eq("id", workOrderId)
          .single();
        const inspectorId = combined.qc_inspector_id ?? context.user_id;
        return wo?.technician_id && wo.technician_id === inspectorId;
      }

      case "invoice_created": {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id")
          .eq("work_order_id", workOrderId)
          .limit(1);
        return (invoices?.length ?? 0) === 0;
      }

      case "customer_notified":
        return !combined.customer_notified;

      case "payment_confirmed":
        return !combined.payment_confirmed;

      case "delivery_checklist": {
        const { data: checklist } = await supabase
          .from("checklist_items")
          .select("id, completed, required")
          .eq("work_order_id", workOrderId)
          .eq("checklist_type", "DELIVERY");
        if (!checklist || checklist.length === 0) return true;
        const required = checklist.filter((i: any) => i.required === true);
        return required.some((i: any) => !i.completed);
      }

      case "customer_final_signature":
        return !combined.customer_final_signature;

      default:
        // Unknown check — treat as non-blocking to avoid breaking transitions
        return false;
    }
  }

  // -----------------------------------------------------------------------
  // transition — attempt a state transition with full enforcement
  // -----------------------------------------------------------------------
  async transition(
    workOrderId: string,
    toState: WorkshopState,
    context: TransitionContext
  ): Promise<TransitionAttemptResult> {
    // 1. Fetch work order
    const { data: workOrder, error: fetchErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (fetchErr || !workOrder) {
      return {
        success: false,
        error: "Arbetsorder ej hittad",
      };
    }

    const fromState = workOrder.status as WorkshopState;

    // 2. Find transition rule
    const rule = this.findTransitionRule(fromState, toState);
    if (!rule) {
      return {
        success: false,
        from_state: fromState,
        to_state: toState,
        error: `Ogiltig transition: "${fromState}" → "${toState}" är inte tillåten`,
      };
    }

    // 3. Check role authorization
    if (!rule.required_role.includes(context.user_role)) {
      // Log failed attempt to audit trail
      await this.logAudit({
        work_order_id: workOrderId,
        org_id: context.org_id,
        user_id: context.user_id,
        action: "TRANSITION_DENIED_ROLE",
        from_state: fromState,
        to_state: toState,
        data_snapshot: context.data,
        blockers_at_time: [
          {
            check: "role",
            message: `Roll "${context.user_role}" har ej behörighet. Krävs: ${rule.required_role.join(", ")}`,
          },
        ],
        ip_address: context.ip_address,
      });
      return {
        success: false,
        from_state: fromState,
        to_state: toState,
        error: `Roll "${context.user_role}" har ej behörighet för denna transition. Krävs: ${rule.required_role.join(", ")}`,
      };
    }

    // 4. Evaluate blockers
    const activeBlockers = await this.evaluateBlockers(rule, workOrderId, context);

    if (activeBlockers.length > 0) {
      // Log blocked attempt
      await this.logAudit({
        work_order_id: workOrderId,
        org_id: context.org_id,
        user_id: context.user_id,
        action: "TRANSITION_BLOCKED",
        from_state: fromState,
        to_state: toState,
        data_snapshot: context.data,
        blockers_at_time: activeBlockers,
        ip_address: context.ip_address,
      });

      return {
        success: false,
        from_state: fromState,
        to_state: toState,
        blockers: activeBlockers,
        work_order_id: workOrderId,
      };
    }

    // 5. Execute transition — update work order
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("work_orders")
      .update({
        status: toState,
        updated_at: now,
        ...(toState === "IN_PROGRESS" && !workOrder.started_at
          ? { started_at: now }
          : {}),
        ...(toState === "DELIVERED" ? { delivered_at: now } : {}),
        ...(toState === "CLOSED" ? { closed_at: now } : {}),
      })
      .eq("id", workOrderId);

    if (updateErr) {
      return {
        success: false,
        error: `Databasfel: ${updateErr.message}`,
      };
    }

    // 6. Persist any provided data to work order
    if (Object.keys(context.data).length > 0) {
      await supabase
        .from("work_orders")
        .update(context.data as any)
        .eq("id", workOrderId);
    }

    // 7. Execute auto_action if defined
    if (rule.auto_action) {
      await this.executeAutoAction(rule.auto_action, workOrderId, workOrder);
    }

    // 8. Log successful transition to audit trail
    const { data: auditEntry } = await this.logAudit({
      work_order_id: workOrderId,
      org_id: context.org_id,
      user_id: context.user_id,
      action: "TRANSITION_SUCCESS",
      from_state: fromState,
      to_state: toState,
      data_snapshot: context.data,
      blockers_at_time: [],
      ip_address: context.ip_address,
    });

    return {
      success: true,
      work_order_id: workOrderId,
      from_state: fromState,
      to_state: toState,
      audit_id: auditEntry?.id,
    };
  }

  // -----------------------------------------------------------------------
  // getAvailableTransitions — what can happen from current state
  // -----------------------------------------------------------------------
  async getAvailableTransitions(
    workOrderId: string,
    context: TransitionContext
  ): Promise<AvailableTransition[]> {
    const { data: workOrder } = await supabase
      .from("work_orders")
      .select("status")
      .eq("id", workOrderId)
      .single();

    if (!workOrder) return [];

    const currentState = workOrder.status as WorkshopState;
    const possibleRules = Object.values(WORKSHOP_TRANSITIONS).filter(
      (t) => t.from === currentState
    );

    const results: AvailableTransition[] = [];

    for (const rule of possibleRules) {
      const blockers = await this.evaluateBlockers(rule, workOrderId, context);
      results.push({
        to_state: rule.to,
        blockers,
        can_transition:
          blockers.length === 0 &&
          rule.required_role.includes(context.user_role),
        requires_role: rule.required_role,
      });
    }

    return results;
  }

  // -----------------------------------------------------------------------
  // getStateAudit — full history for a work order
  // -----------------------------------------------------------------------
  async getStateAudit(workOrderId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("workshop_audit_trail")
      .select(
        `
        id,
        action,
        from_state,
        to_state,
        user_id,
        data_snapshot,
        blockers_at_time,
        ip_address,
        created_at
      `
      )
      .eq("work_order_id", workOrderId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // -----------------------------------------------------------------------
  // getWorkshopRole — resolve user's workshop role
  // -----------------------------------------------------------------------
  async getWorkshopRole(userId: string, orgId: string): Promise<WorkshopRole | null> {
    const { data } = await supabase
      .from("workshop_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .single();

    return (data?.role as WorkshopRole) ?? null;
  }

  // -----------------------------------------------------------------------
  // logAudit — write to workshop_audit_trail
  // -----------------------------------------------------------------------
  private async logAudit(entry: {
    work_order_id: string;
    org_id: string;
    user_id: string;
    action: string;
    from_state?: string;
    to_state?: string;
    data_snapshot?: Record<string, unknown>;
    blockers_at_time?: BlockerResult[];
    ip_address?: string;
  }): Promise<{ data: any }> {
    const { data } = await supabase
      .from("workshop_audit_trail")
      .insert({
        work_order_id: entry.work_order_id,
        org_id: entry.org_id,
        user_id: entry.user_id,
        action: entry.action,
        from_state: entry.from_state ?? null,
        to_state: entry.to_state ?? null,
        data_snapshot: entry.data_snapshot ?? null,
        blockers_at_time: entry.blockers_at_time ?? null,
        ip_address: entry.ip_address ?? null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    return { data };
  }

  // -----------------------------------------------------------------------
  // executeAutoAction — side effects on transition
  // -----------------------------------------------------------------------
  private async executeAutoAction(
    action: string,
    workOrderId: string,
    workOrder: any
  ): Promise<void> {
    switch (action) {
      case "notify_service_advisor": {
        // Insert notification for service advisors in the org
        await supabase.from("notifications").insert({
          org_id: workOrder.org_id,
          type: "ADDITIONAL_WORK_REQUESTED",
          title: "Tilläggsarbete begärt",
          body: `Arbetsorder ${workOrder.order_number} kräver godkännande för tilläggsarbete.`,
          entity_type: "work_order",
          entity_id: workOrderId,
          created_at: new Date().toISOString(),
        });
        break;
      }
      default:
        console.warn(`[WorkshopSM] Unknown auto_action: ${action}`);
    }
  }

  // -----------------------------------------------------------------------
  // autoCloseDue — called by scheduler: close DELIVERED orders after 48h
  // -----------------------------------------------------------------------
  async autoCloseDue(): Promise<number> {
    const cutoff = new Date(
      Date.now() - 48 * 60 * 60 * 1000
    ).toISOString();

    const { data: due } = await supabase
      .from("work_orders")
      .select("id, org_id")
      .eq("status", "DELIVERED")
      .lt("delivered_at", cutoff);

    if (!due || due.length === 0) return 0;

    for (const wo of due) {
      await this.transition(wo.id, "CLOSED", {
        user_id: "system",
        user_role: "SYSTEM",
        org_id: wo.org_id,
        data: { csi_survey_sent: true, warranty_filed_if_applicable: true },
      });
    }

    return due.length;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const workshopStateMachine = new WorkshopStateMachine();

// ---------------------------------------------------------------------------
// Express Router
// ---------------------------------------------------------------------------

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user)
    return res.status(401).json({ error: "Ej autentiserad" });
  next();
};

// Helper to resolve workshop role from request
async function resolveRole(req: Request): Promise<WorkshopRole | null> {
  const user = (req as any).user;
  // Support role passed explicitly in body (for testing) or resolved from DB
  if (req.body?.actor_role) return req.body.actor_role as WorkshopRole;
  return workshopStateMachine.getWorkshopRole(user.id, user.org_id);
}

// ---------------------------------------------------------------------------
// POST /api/workshop/work-orders/:id/transition
// ---------------------------------------------------------------------------
router.post(
  "/api/workshop/work-orders/:id/transition",
  auth,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { to_state, data = {} } = req.body;

    if (!to_state) {
      return res.status(400).json({ error: "to_state är obligatoriskt" });
    }

    const userRole = await resolveRole(req);
    if (!userRole) {
      return res.status(403).json({
        error: "Du har ingen verkstadsroll. Kontakta Workshop Manager.",
      });
    }

    const context: TransitionContext = {
      user_id: user.id,
      user_role: userRole,
      org_id: user.org_id,
      data,
      ip_address: req.ip,
    };

    try {
      const result = await workshopStateMachine.transition(
        req.params.id,
        to_state as WorkshopState,
        context
      );

      if (!result.success) {
        return res.status(422).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[WorkshopSM] transition error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/workshop/work-orders/:id/available-transitions
// ---------------------------------------------------------------------------
router.get(
  "/api/workshop/work-orders/:id/available-transitions",
  auth,
  async (req: Request, res: Response) => {
    const user = (req as any).user;

    const userRole =
      (req.query.role as WorkshopRole) ||
      (await workshopStateMachine.getWorkshopRole(user.id, user.org_id)) ||
      ("SERVICE_ADVISOR" as WorkshopRole);

    const context: TransitionContext = {
      user_id: user.id,
      user_role: userRole,
      org_id: user.org_id,
      data: {},
    };

    try {
      const transitions = await workshopStateMachine.getAvailableTransitions(
        req.params.id,
        context
      );
      return res.json({ work_order_id: req.params.id, transitions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/workshop/work-orders/:id/state-audit
// ---------------------------------------------------------------------------
router.get(
  "/api/workshop/work-orders/:id/state-audit",
  auth,
  async (req: Request, res: Response) => {
    try {
      const audit = await workshopStateMachine.getStateAudit(req.params.id);
      return res.json({ work_order_id: req.params.id, audit });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/workshop/state-machine/config
// ---------------------------------------------------------------------------
router.get(
  "/api/workshop/state-machine/config",
  auth,
  (_req: Request, res: Response) => {
    return res.json({
      states: STATE_ORDER,
      transitions: WORKSHOP_TRANSITIONS,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/workshop/auto-close — trigger auto-close of delivered orders
// ---------------------------------------------------------------------------
router.post(
  "/api/workshop/auto-close",
  auth,
  async (_req: Request, res: Response) => {
    try {
      const closed = await workshopStateMachine.autoCloseDue();
      return res.json({ closed_count: closed });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
