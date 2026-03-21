import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { eventBus, emitEntityEvent } from "./events";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// Access Control Middleware
// ---------------------------------------------------------------------------

async function personnelAuth(req: Request, res: Response, next: Function) {
  // LEGAL_REVIEW_REQUIRED
  try {
    const actor = (req as any).user;
    if (!actor) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const role = actor.role as string | undefined;
    const actorId = actor.id as string;

    // EXTERNAL_AUDITOR gets only anonymized statistics
    if (role === "EXTERNAL_AUDITOR") {
      // Allow only the statistics endpoint
      if (req.path === "/statistics" && req.method === "GET") {
        return next();
      }
      return res
        .status(403)
        .json({ error: "EXTERNAL_AUDITOR may only access anonymized statistics" });
    }

    // EMPLOYEE sees NOTHING about signals or cases
    if (role === "EMPLOYEE") {
      return res
        .status(403)
        .json({ error: "Insufficient permissions for personnel data" });
    }

    // HR_MANAGER and EXECUTIVE have full access
    if (role === "HR_MANAGER" || role === "EXECUTIVE") {
      // Log access
      await supabase.from("permission_audit").insert({
        user_id: actorId,
        action: "SENSITIVE_DATA_ACCESSED",
        resource: req.originalUrl,
        method: req.method,
        role,
        accessed_at: new Date().toISOString(),
      });
      return next();
    }

    // Manager: check if they manage the target user
    const targetUserId =
      req.params.userId ?? req.body?.user_id ?? null;

    if (targetUserId) {
      const { data: subordinate } = await supabase
        .from("users")
        .select("manager_id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!subordinate || subordinate.manager_id !== actorId) {
        return res
          .status(403)
          .json({ error: "You are not the manager of this user" });
      }
    }

    // For case-based routes, check if actor is manager of the case subject
    if (req.params.id && !targetUserId) {
      const { data: personnelCase } = await supabase
        .from("personnel_cases")
        .select("user_id")
        .eq("id", req.params.id)
        .maybeSingle();

      if (personnelCase) {
        const { data: subordinate } = await supabase
          .from("users")
          .select("manager_id")
          .eq("id", personnelCase.user_id)
          .maybeSingle();

        if (!subordinate || subordinate.manager_id !== actorId) {
          return res
            .status(403)
            .json({ error: "You are not the manager of the case subject" });
        }
      }
    }

    // Log EVERY access
    await supabase.from("permission_audit").insert({
      user_id: actorId,
      action: "SENSITIVE_DATA_ACCESSED",
      resource: req.originalUrl,
      method: req.method,
      role: role ?? "MANAGER",
      accessed_at: new Date().toISOString(),
    });

    next();
  } catch (err: any) {
    console.error("[personnel-api] Auth middleware error:", err);
    res.status(500).json({ error: "Authorization check failed" });
  }
}

// Apply middleware to all routes
router.use(personnelAuth);

// ---------------------------------------------------------------------------
// Helper: check HR or EXECUTIVE role
// ---------------------------------------------------------------------------

function isHrOrExecutive(req: Request): boolean {
  const role = (req as any).user?.role;
  return role === "HR_MANAGER" || role === "EXECUTIVE";
}

function getActorId(req: Request): string | undefined {
  return (req as any).user?.id;
}

function getActorRole(req: Request): string | undefined {
  return (req as any).user?.role;
}

// ---------------------------------------------------------------------------
// Helper: check if actor is manager of userId
// ---------------------------------------------------------------------------

async function isManagerOf(actorId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("manager_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.manager_id === actorId;
}

// ---------------------------------------------------------------------------
// Helper: log to personnel_case_log
// ---------------------------------------------------------------------------

async function logCaseEvent(
  caseId: string,
  eventType: string,
  actorId: string | undefined,
  details: Record<string, unknown> = {}
) {
  await supabase.from("personnel_case_log").insert({
    case_id: caseId,
    event_type: eventType,
    actor_id: actorId ?? null,
    details,
    created_at: new Date().toISOString(),
  });
}

// ===========================================================================
// SIGNAL ENDPOINTS (readonly)
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/personnel/signals — All active signals
// ---------------------------------------------------------------------------
router.get("/api/personnel/signals", async (req: Request, res: Response) => {
  try {
    const actorId = getActorId(req);
    let query = supabase
      .from("personnel_signals")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    // HR sees all, manager sees only their reports
    if (!isHrOrExecutive(req) && actorId) {
      const { data: reports } = await supabase
        .from("users")
        .select("id")
        .eq("manager_id", actorId);

      const reportIds = (reports ?? []).map((r: any) => r.id);
      if (reportIds.length === 0) {
        return res.json([]);
      }
      query = query.in("user_id", reportIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data ?? []);
  } catch (err: any) {
    console.error("[personnel-api] GET /api/personnel/signals error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/personnel/signals/user/:userId — Signals for specific person
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/signals/user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const actorId = getActorId(req);

      // Auth: must be HR or their manager
      if (!isHrOrExecutive(req) && actorId) {
        const managerCheck = await isManagerOf(actorId, userId);
        if (!managerCheck) {
          return res
            .status(403)
            .json({ error: "Must be HR or the user's manager" });
        }
      }

      const { data, error } = await supabase
        .from("personnel_signals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json(data ?? []);
    } catch (err: any) {
      console.error(
        "[personnel-api] GET /api/personnel/signals/user/:userId error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/signals/:id/acknowledge — Manager confirms signal seen
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/signals/:id/acknowledge",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actorId = getActorId(req);

      const { data, error } = await supabase
        .from("personnel_signals")
        .update({
          acknowledged_by: actorId ?? null,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/signals/:id/acknowledge error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ===========================================================================
// CONVERSATION ENDPOINTS
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /api/personnel/conversations — Log support conversation
// ---------------------------------------------------------------------------
router.post(
  "/api/personnel/conversations",
  async (req: Request, res: Response) => {
    try {
      const {
        user_id,
        conversation_date,
        summary,
        outcome,
        trigger_signal_ids,
        employee_perspective,
        agreed_actions,
        next_followup_date,
      } = req.body;
      const actorId = getActorId(req);

      if (!user_id || !conversation_date || !summary || !outcome) {
        return res.status(400).json({
          error:
            "user_id, conversation_date, summary, and outcome are required",
        });
      }

      const { data, error } = await supabase
        .from("personnel_conversations")
        .insert({
          user_id,
          conversation_date,
          summary,
          outcome,
          trigger_signal_ids: trigger_signal_ids ?? null,
          employee_perspective: employee_perspective ?? null,
          agreed_actions: agreed_actions ?? null,
          next_followup_date: next_followup_date ?? null,
          logged_by: actorId ?? null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] POST /api/personnel/conversations error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/personnel/conversations/user/:userId — History for a person
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/conversations/user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const actorId = getActorId(req);

      // Auth check: must be HR or manager
      if (!isHrOrExecutive(req) && actorId) {
        const managerCheck = await isManagerOf(actorId, userId);
        if (!managerCheck) {
          return res
            .status(403)
            .json({ error: "Must be HR or the user's manager" });
        }
      }

      const { data, error } = await supabase
        .from("personnel_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("conversation_date", { ascending: false });

      if (error) throw error;

      res.json(data ?? []);
    } catch (err: any) {
      console.error(
        "[personnel-api] GET /api/personnel/conversations/user/:userId error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ===========================================================================
// CASE ENDPOINTS
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /api/personnel/cases — Create formal support case (level 3)
// ---------------------------------------------------------------------------
router.post(
  "/api/personnel/cases",
  async (req: Request, res: Response) => {
    try {
      const { user_id, title, description, org_id, support_period_days } =
        req.body;
      const actorId = getActorId(req);

      if (!user_id || !org_id) {
        return res
          .status(400)
          .json({ error: "user_id and org_id are required" });
      }

      // REQUIRES: at least 1 logged conversation
      const { count: convCount, error: convError } = await supabase
        .from("personnel_conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      if (convError) throw convError;

      if (!convCount || convCount < 1) {
        return res.status(400).json({
          error:
            "At least 1 logged conversation is required before creating a formal case",
        });
      }

      const now = new Date();
      const periodDays = support_period_days ?? 90;
      const supportEnd = new Date(now);
      supportEnd.setDate(supportEnd.getDate() + periodDays);

      const { data, error } = await supabase
        .from("personnel_cases")
        .insert({
          user_id,
          org_id,
          title: title ?? null,
          description: description ?? null,
          level: 3,
          status: "ACTIVE",
          support_period_start: now.toISOString(),
          support_period_end: supportEnd.toISOString(),
          created_by: actorId ?? null,
          created_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create Entity
      await supabase.from("entities").insert({
        org_id,
        source_table: "personnel_cases",
        source_id: data.id,
        label: title ?? `Personnel case for ${user_id}`,
        created_at: now.toISOString(),
      });

      // Emit personnel_case.created
      await emitEntityEvent(
        "decision.created" as any,
        "personnel_cases",
        data.id,
        org_id,
        actorId,
        { action: "personnel_case.created", level: 3, user_id }
      );

      await logCaseEvent(data.id, "CASE_CREATED", actorId, {
        level: 3,
        user_id,
      });

      res.status(201).json(data);
    } catch (err: any) {
      console.error("[personnel-api] POST /api/personnel/cases error:", err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/personnel/cases — List cases
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/cases",
  async (req: Request, res: Response) => {
    try {
      const actorId = getActorId(req);
      let query = supabase
        .from("personnel_cases")
        .select("*")
        .order("created_at", { ascending: false });

      // HR sees all, manager sees only their reports
      if (!isHrOrExecutive(req) && actorId) {
        const { data: reports } = await supabase
          .from("users")
          .select("id")
          .eq("manager_id", actorId);

        const reportIds = (reports ?? []).map((r: any) => r.id);
        if (reportIds.length === 0) {
          return res.json([]);
        }
        query = query.in("user_id", reportIds);
        // Never show level 4+ details to managers (only HR+EXECUTIVE)
        query = query.lt("level", 4);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json(data ?? []);
    } catch (err: any) {
      console.error("[personnel-api] GET /api/personnel/cases error:", err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/personnel/cases/:id — Full detail with timeline
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/cases/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actorId = getActorId(req);

      const { data: personnelCase, error: caseError } = await supabase
        .from("personnel_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (caseError) throw caseError;
      if (!personnelCase)
        return res.status(404).json({ error: "Case not found" });

      // Auth check for managers: can only see level < 4
      if (!isHrOrExecutive(req) && personnelCase.level >= 4) {
        return res
          .status(403)
          .json({ error: "Level 4+ cases require HR_MANAGER or EXECUTIVE access" });
      }

      // Fetch timeline
      const { data: timeline, error: timelineError } = await supabase
        .from("personnel_case_log")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: true });

      if (timelineError) throw timelineError;

      res.json({
        ...personnelCase,
        timeline: timeline ?? [],
      });
    } catch (err: any) {
      console.error(
        "[personnel-api] GET /api/personnel/cases/:id error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/plan — Set/update support plan + milestones
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/cases/:id/plan",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { support_plan, milestones } = req.body;
      const actorId = getActorId(req);

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          support_plan: support_plan ?? null,
          milestones: milestones ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logCaseEvent(id, "MILESTONE_UPDATED", actorId, {
        support_plan,
        milestones,
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/plan error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/milestone — Update individual milestone
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/cases/:id/milestone",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { milestone_id, status, notes } = req.body;
      const actorId = getActorId(req);

      // Fetch current milestones
      const { data: personnelCase, error: fetchError } = await supabase
        .from("personnel_cases")
        .select("milestones")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const milestones = (personnelCase?.milestones as any[]) ?? [];
      const updated = milestones.map((m: any) =>
        m.id === milestone_id ? { ...m, status, notes } : m
      );

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          milestones: updated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logCaseEvent(id, "MILESTONE_UPDATED", actorId, {
        milestone_id,
        status,
        notes,
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/milestone error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/extend — Extend support period (max 1 time)
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/cases/:id/extend",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { extension_reason, extension_days } = req.body;
      const actorId = getActorId(req);

      if (!extension_reason) {
        return res
          .status(400)
          .json({ error: "extension_reason is required" });
      }

      const { data: personnelCase, error: fetchError } = await supabase
        .from("personnel_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!personnelCase)
        return res.status(404).json({ error: "Case not found" });

      if (personnelCase.extended) {
        return res
          .status(400)
          .json({ error: "Support period can only be extended once" });
      }

      const currentEnd = new Date(personnelCase.support_period_end);
      const days = extension_days ?? 30;
      currentEnd.setDate(currentEnd.getDate() + days);

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          support_period_end: currentEnd.toISOString(),
          extended: true,
          extension_reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logCaseEvent(id, "SUPPORT_PERIOD_EXTENDED", actorId, {
        extension_reason,
        extension_days: days,
        new_end_date: currentEnd.toISOString(),
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/extend error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/escalate — Escalate to level 4 (FREEZE)
// ---------------------------------------------------------------------------
// LEGAL_REVIEW_REQUIRED
router.patch(
  "/api/personnel/cases/:id/escalate",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, hr_responsible_id } = req.body;
      const actorId = getActorId(req);

      if (!reason) {
        return res.status(400).json({ error: "reason is required" });
      }

      if (!isHrOrExecutive(req)) {
        return res
          .status(403)
          .json({ error: "Only HR_MANAGER or EXECUTIVE can escalate to level 4" });
      }

      const now = new Date().toISOString();

      const { data: personnelCase, error: fetchError } = await supabase
        .from("personnel_cases")
        .select("org_id, user_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!personnelCase)
        return res.status(404).json({ error: "Case not found" });

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          level: 4,
          status: "FROZEN",
          frozen_at: now,
          frozen_by: actorId ?? null,
          freeze_reason: reason,
          hr_responsible_id: hr_responsible_id ?? null,
          auto_signals_stopped: true,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Emit personnel_case.escalated
      await emitEntityEvent(
        "decision.created" as any,
        "personnel_cases",
        id,
        personnelCase.org_id,
        actorId,
        {
          action: "personnel_case.escalated",
          level: 4,
          reason,
          user_id: personnelCase.user_id,
        }
      );

      await logCaseEvent(id, "FREEZE_ACTIVATED", actorId, {
        reason,
        hr_responsible_id,
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/escalate error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/resolve — Close positively
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/cases/:id/resolve",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { positive_signals, manager_assessment, reintegration_plan } =
        req.body;
      const actorId = getActorId(req);

      if (!positive_signals && !manager_assessment) {
        return res.status(400).json({
          error:
            "positive_signals or manager_assessment required for resolution",
        });
      }

      const { data: personnelCase, error: fetchError } = await supabase
        .from("personnel_cases")
        .select("org_id, user_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!personnelCase)
        return res.status(404).json({ error: "Case not found" });

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          status: "RESOLVED",
          resolved_at: now,
          resolved_by: actorId ?? null,
          positive_signals: positive_signals ?? null,
          manager_assessment: manager_assessment ?? null,
          reintegration_plan: reintegration_plan ?? null,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Emit personnel_case.resolved
      await emitEntityEvent(
        "decision.created" as any,
        "personnel_cases",
        id,
        personnelCase.org_id,
        actorId,
        {
          action: "personnel_case.resolved",
          user_id: personnelCase.user_id,
        }
      );

      await logCaseEvent(id, "CASE_RESOLVED", actorId, {
        positive_signals,
        manager_assessment,
        reintegration_plan,
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/resolve error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ===========================================================================
// LEVEL 4+ ENDPOINTS (HR_MANAGER + EXECUTIVE only)
// ===========================================================================

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/hr-decision — Register formal decision
// ---------------------------------------------------------------------------
// LEGAL_REVIEW_REQUIRED
router.patch(
  "/api/personnel/cases/:id/hr-decision",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        decision_type,
        decision_by,
        decision_rationale,
        legal_basis,
        data_subject_informed,
        union_consulted,
        union_not_consulted_reason,
      } = req.body;
      const actorId = getActorId(req);
      const role = getActorRole(req);

      // HR_MANAGER + EXECUTIVE only
      if (!isHrOrExecutive(req)) {
        return res
          .status(403)
          .json({ error: "Only HR_MANAGER or EXECUTIVE can register formal decisions" });
      }

      // LEGAL_REVIEW_REQUIRED — Enforced gates
      if (!decision_by) {
        return res.status(400).json({ error: "decision_by is required" });
      }
      if (!decision_rationale) {
        return res
          .status(400)
          .json({ error: "decision_rationale is required" });
      }
      if (!legal_basis) {
        return res.status(400).json({ error: "legal_basis is required" });
      }
      if (data_subject_informed !== true) {
        return res
          .status(400)
          .json({ error: "data_subject_informed must be true" });
      }

      // For FORMAL_PROCESS: union_consulted must be true OR explicit explanation
      if (decision_type === "FORMAL_PROCESS") {
        if (union_consulted !== true && !union_not_consulted_reason) {
          return res.status(400).json({
            error:
              "For FORMAL_PROCESS: union_consulted must be true OR union_not_consulted_reason is required",
          });
        }
      }

      // For TERMINATION: must be EXECUTIVE or HR_MANAGER, immutable after 24h
      if (decision_type === "TERMINATION") {
        if (role !== "EXECUTIVE" && role !== "HR_MANAGER") {
          return res.status(403).json({
            error: "TERMINATION requires EXECUTIVE or HR_MANAGER role",
          });
        }

        // Check if a TERMINATION decision already exists and is older than 24h
        const { data: existingDecision } = await supabase
          .from("personnel_cases")
          .select("decision_made_at")
          .eq("id", id)
          .single();

        if (
          existingDecision?.decision_made_at &&
          existingDecision.decision_made_at !== null
        ) {
          const decisionTime = new Date(existingDecision.decision_made_at);
          const hoursElapsed =
            (Date.now() - decisionTime.getTime()) / (1000 * 60 * 60);
          if (hoursElapsed > 24) {
            return res.status(400).json({
              error:
                "TERMINATION decision is immutable after 24 hours",
            });
          }
        }
      }

      const { data: personnelCase, error: fetchError } = await supabase
        .from("personnel_cases")
        .select("org_id, user_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!personnelCase)
        return res.status(404).json({ error: "Case not found" });

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          decision_type: decision_type ?? null,
          decision_by,
          decision_rationale,
          legal_basis,
          data_subject_informed,
          union_consulted: union_consulted ?? false,
          union_not_consulted_reason: union_not_consulted_reason ?? null,
          decision_made_at: now,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Emit personnel_case.decision_made
      await emitEntityEvent(
        "decision.created" as any,
        "personnel_cases",
        id,
        personnelCase.org_id,
        actorId,
        {
          action: "personnel_case.decision_made",
          decision_type,
          user_id: personnelCase.user_id,
        }
      );

      await logCaseEvent(id, "DECISION_MADE", actorId, {
        decision_type,
        decision_by,
        legal_basis,
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/hr-decision error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/union — Register union consultation
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/cases/:id/union",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { union_representative, consultation_date, consultation_notes } =
        req.body;
      const actorId = getActorId(req);

      if (!isHrOrExecutive(req)) {
        return res
          .status(403)
          .json({ error: "Only HR_MANAGER or EXECUTIVE can register union consultation" });
      }

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          union_consulted: true,
          union_representative: union_representative ?? null,
          union_consultation_date: consultation_date ?? new Date().toISOString(),
          union_consultation_notes: consultation_notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logCaseEvent(id, "UNION_CONTACTED", actorId, {
        union_representative,
        consultation_date,
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/union error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/personnel/cases/:id/log — Manual log entry (immutable once created)
// ---------------------------------------------------------------------------
router.post(
  "/api/personnel/cases/:id/log",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { event_type, details } = req.body;
      const actorId = getActorId(req);

      if (!isHrOrExecutive(req)) {
        return res
          .status(403)
          .json({ error: "Only HR_MANAGER or EXECUTIVE can add manual log entries" });
      }

      const { data, error } = await supabase
        .from("personnel_case_log")
        .insert({
          case_id: id,
          event_type: event_type ?? "MANUAL_NOTE",
          actor_id: actorId ?? null,
          details: details ?? {},
          created_at: new Date().toISOString(),
          immutable: true,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] POST /api/personnel/cases/:id/log error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/personnel/cases/:id/export — Export entire case as structured JSON
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/cases/:id/export",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actorId = getActorId(req);

      if (!isHrOrExecutive(req)) {
        return res
          .status(403)
          .json({ error: "Only HR_MANAGER or EXECUTIVE can export cases" });
      }

      const [caseResult, logResult, conversationsResult] = await Promise.all([
        supabase
          .from("personnel_cases")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("personnel_case_log")
          .select("*")
          .eq("case_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("personnel_conversations")
          .select("*")
          .eq(
            "user_id",
            // We need to sub-query the user_id from the case
            (
              await supabase
                .from("personnel_cases")
                .select("user_id")
                .eq("id", id)
                .single()
            ).data?.user_id ?? ""
          )
          .order("conversation_date", { ascending: true }),
      ]);

      if (caseResult.error) throw caseResult.error;
      if (!caseResult.data)
        return res.status(404).json({ error: "Case not found" });

      // Fetch signals for the case user
      const { data: signals } = await supabase
        .from("personnel_signals")
        .select("*")
        .eq("user_id", caseResult.data.user_id)
        .order("created_at", { ascending: true });

      // Fetch absences for the case user
      const { data: absences } = await supabase
        .from("personnel_absences")
        .select("*")
        .eq("user_id", caseResult.data.user_id)
        .order("start_date", { ascending: true });

      await logCaseEvent(id, "CASE_EXPORTED", actorId, {
        exported_at: new Date().toISOString(),
      });

      res.json({
        case: caseResult.data,
        timeline: logResult.data ?? [],
        conversations: conversationsResult.data ?? [],
        signals: signals ?? [],
        absences: absences ?? [],
        exported_at: new Date().toISOString(),
        exported_by: actorId,
      });
    } catch (err: any) {
      console.error(
        "[personnel-api] GET /api/personnel/cases/:id/export error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/personnel/cases/:id/close — Close case
// ---------------------------------------------------------------------------
router.patch(
  "/api/personnel/cases/:id/close",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { retention_days, anonymize_days } = req.body;
      const actorId = getActorId(req);

      if (!isHrOrExecutive(req)) {
        return res
          .status(403)
          .json({ error: "Only HR_MANAGER or EXECUTIVE can close cases" });
      }

      // Fetch case to enforce all gates
      const { data: personnelCase, error: fetchError } = await supabase
        .from("personnel_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!personnelCase)
        return res.status(404).json({ error: "Case not found" });

      // Enforce gates: must be resolved or have a formal decision
      if (
        personnelCase.status !== "RESOLVED" &&
        !personnelCase.decision_made_at
      ) {
        return res.status(400).json({
          error:
            "Case must be resolved or have a formal decision before closing",
        });
      }

      const now = new Date();
      const retentionDaysVal = retention_days ?? 365;
      const anonymizeDaysVal = anonymize_days ?? 730;

      const retentionUntil = new Date(now);
      retentionUntil.setDate(retentionUntil.getDate() + retentionDaysVal);

      const anonymizeAt = new Date(now);
      anonymizeAt.setDate(anonymizeAt.getDate() + anonymizeDaysVal);

      const { data, error } = await supabase
        .from("personnel_cases")
        .update({
          status: "CLOSED",
          closed_at: now.toISOString(),
          closed_by: actorId ?? null,
          retention_until: retentionUntil.toISOString(),
          anonymize_at: anonymizeAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Emit personnel_case.closed
      await emitEntityEvent(
        "decision.created" as any,
        "personnel_cases",
        id,
        personnelCase.org_id,
        actorId,
        {
          action: "personnel_case.closed",
          user_id: personnelCase.user_id,
        }
      );

      await logCaseEvent(id, "CASE_CLOSED", actorId, {
        retention_until: retentionUntil.toISOString(),
        anonymize_at: anonymizeAt.toISOString(),
      });

      res.json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] PATCH /api/personnel/cases/:id/close error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ===========================================================================
// ABSENCE ENDPOINTS
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /api/personnel/absence — Register absence
// ---------------------------------------------------------------------------
router.post(
  "/api/personnel/absence",
  async (req: Request, res: Response) => {
    try {
      const { user_id, absence_type, start_date, end_date, notes } = req.body;
      const actorId = getActorId(req);

      if (!user_id || !start_date) {
        return res
          .status(400)
          .json({ error: "user_id and start_date are required" });
      }

      // Validate dates
      const start = new Date(start_date);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid start_date" });
      }

      if (end_date) {
        const end = new Date(end_date);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: "Invalid end_date" });
        }
        if (end < start) {
          return res
            .status(400)
            .json({ error: "end_date must be after start_date" });
        }
      }

      const { data, error } = await supabase
        .from("personnel_absences")
        .insert({
          user_id,
          absence_type: absence_type ?? null,
          start_date,
          end_date: end_date ?? null,
          notes: notes ?? null,
          registered_by: actorId ?? null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (err: any) {
      console.error(
        "[personnel-api] POST /api/personnel/absence error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/personnel/absence/user/:userId — Absence history
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/absence/user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const actorId = getActorId(req);

      // Auth check
      if (!isHrOrExecutive(req) && actorId) {
        const managerCheck = await isManagerOf(actorId, userId);
        if (!managerCheck) {
          return res
            .status(403)
            .json({ error: "Must be HR or the user's manager" });
        }
      }

      const { data, error } = await supabase
        .from("personnel_absences")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });

      if (error) throw error;

      res.json(data ?? []);
    } catch (err: any) {
      console.error(
        "[personnel-api] GET /api/personnel/absence/user/:userId error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ===========================================================================
// STATISTICS (anonymized — for EXTERNAL_AUDITOR + management review)
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/personnel/statistics — Anonymized statistics only
// ---------------------------------------------------------------------------
router.get(
  "/api/personnel/statistics",
  async (req: Request, res: Response) => {
    try {
      // NO names. NO user_ids. NO case details.

      // Count by status
      const { data: cases, error: casesError } = await supabase
        .from("personnel_cases")
        .select("status, level, decision_type, created_at, resolved_at, closed_at");

      if (casesError) throw casesError;

      const allCases = cases ?? [];

      // Counts by status
      const statusCounts: Record<string, number> = {};
      for (const c of allCases) {
        statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
      }

      // Counts by level
      const levelCounts: Record<number, number> = {};
      for (const c of allCases) {
        levelCounts[c.level] = (levelCounts[c.level] ?? 0) + 1;
      }

      // Counts by decision type
      const decisionTypeCounts: Record<string, number> = {};
      for (const c of allCases) {
        if (c.decision_type) {
          decisionTypeCounts[c.decision_type] =
            (decisionTypeCounts[c.decision_type] ?? 0) + 1;
        }
      }

      // Average duration (created_at to resolved_at or closed_at)
      const durations: number[] = [];
      for (const c of allCases) {
        const endDate = c.resolved_at ?? c.closed_at;
        if (endDate) {
          const start = new Date(c.created_at).getTime();
          const end = new Date(endDate).getTime();
          durations.push((end - start) / (1000 * 60 * 60 * 24)); // days
        }
      }
      const avgDuration =
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : null;

      // Outcome distribution
      const outcomeCounts: Record<string, number> = {};
      for (const c of allCases) {
        if (c.status === "RESOLVED") {
          outcomeCounts["RESOLVED"] = (outcomeCounts["RESOLVED"] ?? 0) + 1;
        } else if (c.status === "CLOSED") {
          outcomeCounts["CLOSED"] = (outcomeCounts["CLOSED"] ?? 0) + 1;
        }
      }

      // Signal type counts
      const { data: signals, error: signalsError } = await supabase
        .from("personnel_signals")
        .select("signal_type");

      if (signalsError) throw signalsError;

      const signalTypeCounts: Record<string, number> = {};
      for (const s of signals ?? []) {
        signalTypeCounts[s.signal_type] =
          (signalTypeCounts[s.signal_type] ?? 0) + 1;
      }

      res.json({
        total_cases: allCases.length,
        by_status: statusCounts,
        by_level: levelCounts,
        by_decision_type: decisionTypeCounts,
        by_signal_type: signalTypeCounts,
        average_duration_days: avgDuration
          ? Math.round(avgDuration * 10) / 10
          : null,
        outcome_distribution: outcomeCounts,
      });
    } catch (err: any) {
      console.error(
        "[personnel-api] GET /api/personnel/statistics error:",
        err
      );
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
