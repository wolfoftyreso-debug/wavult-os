import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// Helper: add N months to a date
// ---------------------------------------------------------------------------

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ---------------------------------------------------------------------------
// GET /api/deputies
// ---------------------------------------------------------------------------

router.get("/api/deputies", async (req: Request, res: Response) => {
  try {
    const { org_id, primary_user_id, deputy_user_id, scope, status } = req.query as Record<string, string | undefined>;

    let query = supabase.from("deputy_assignments").select("*", { count: "exact" });

    if (org_id) query = query.eq("org_id", org_id);
    if (primary_user_id) query = query.eq("primary_user_id", primary_user_id);
    if (deputy_user_id) query = query.eq("deputy_user_id", deputy_user_id);
    if (scope) query = query.eq("scope", scope);
    if (status) query = query.eq("status", status);

    const { data: deputies, error, count } = await query.order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ deputies: deputies ?? [], total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/deputies
// ---------------------------------------------------------------------------

router.post("/api/deputies", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      org_id,
      primary_user_id,
      deputy_user_id,
      scope,
      scope_reference_type,
      scope_reference_id,
      priority,
      valid_from,
      valid_until,
      review_interval_months,
      auto_renew,
    } = req.body;

    if (!primary_user_id || !deputy_user_id || !scope) {
      return res.status(400).json({ error: "primary_user_id, deputy_user_id, and scope are required" });
    }

    if (primary_user_id === deputy_user_id) {
      return res.status(400).json({ error: "primary_user_id and deputy_user_id must be different" });
    }

    // Check deputy's capability for this scope
    const { data: capabilities, error: capError } = await supabase
      .from("user_capabilities")
      .select("*")
      .eq("user_id", deputy_user_id)
      .eq("scope", scope);

    if (capError) {
      return res.status(500).json({ error: capError.message });
    }

    const hasCapability = capabilities && capabilities.length > 0;
    const assignmentStatus = hasCapability ? "ACTIVE" : "PENDING_TRAINING";

    // Auto-compute next_review_date
    const intervalMonths = review_interval_months ?? 12;
    const nextReviewDate = addMonths(new Date(), intervalMonths).toISOString().split("T")[0];

    // Insert deputy_assignment
    const { data: deputy, error: insertError } = await supabase
      .from("deputy_assignments")
      .insert({
        org_id: org_id ?? null,
        primary_user_id,
        deputy_user_id,
        scope,
        scope_reference_type: scope_reference_type ?? null,
        scope_reference_id: scope_reference_id ?? null,
        priority: priority ?? 1,
        valid_from: valid_from ?? null,
        valid_until: valid_until ?? null,
        review_interval_months: intervalMonths,
        auto_renew: auto_renew ?? false,
        next_review_date: nextReviewDate,
        status: assignmentStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // Auto-create development_plan if insufficient capability
    let trainingPlanCreated = false;
    if (!hasCapability) {
      const { error: planError } = await supabase
        .from("development_plans")
        .insert({
          user_id: deputy_user_id,
          title: `Ställföreträdarkompetens: ${scope}`,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (!planError) {
        trainingPlanCreated = true;
      }
    }

    return res.status(201).json({ deputy, training_plan_created: trainingPlanCreated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/deputies/:id
// ---------------------------------------------------------------------------

router.patch("/api/deputies/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, valid_until, review_interval_months, auto_renew, capability_gap_notes } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status !== undefined) updates.status = status;
    if (valid_until !== undefined) updates.valid_until = valid_until;
    if (review_interval_months !== undefined) updates.review_interval_months = review_interval_months;
    if (auto_renew !== undefined) updates.auto_renew = auto_renew;
    if (capability_gap_notes !== undefined) updates.capability_gap_notes = capability_gap_notes;

    const { data, error } = await supabase
      .from("deputy_assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Deputy assignment not found" });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/deputies/:id  (soft delete)
// ---------------------------------------------------------------------------

router.delete("/api/deputies/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("deputy_assignments")
      .update({ status: "INACTIVE", updated_at: now })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Insert audit log
    await supabase.from("audit_logs").insert({
      entity_type: "deputy_assignment",
      entity_id: id,
      action: "deactivated",
      actor_id: user.id,
      created_at: now,
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/deputies/activate
// ---------------------------------------------------------------------------

router.post("/api/deputies/activate", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      primary_user_id,
      deputy_assignment_id,
      reason,
      reason_detail,
      expected_return_date,
      tasks_reassigned,
    } = req.body;

    if (!primary_user_id) {
      return res.status(400).json({ error: "primary_user_id is required" });
    }

    // Find the deputy assignment
    let assignment: any = null;

    if (deputy_assignment_id) {
      const { data, error } = await supabase
        .from("deputy_assignments")
        .select("*")
        .eq("id", deputy_assignment_id)
        .eq("status", "ACTIVE")
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Active deputy assignment not found for given id" });
      }
      assignment = data;
    } else {
      // Find best active deputy (lowest priority number = highest priority)
      const { data, error } = await supabase
        .from("deputy_assignments")
        .select("*")
        .eq("primary_user_id", primary_user_id)
        .eq("status", "ACTIVE")
        .order("priority", { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "No active deputy assignment found for primary_user_id" });
      }
      assignment = data;
    }

    const deputyUserId: string = assignment.deputy_user_id;
    const activatedBy = user.id === primary_user_id ? "SELF" : "MANAGER";
    const now = new Date().toISOString();

    // Reassign tasks if requested
    let tasksReassignedCount = 0;
    if (tasks_reassigned === true) {
      const { data: updatedTasks, error: taskError } = await supabase
        .from("tasks")
        .update({ assigned_to: deputyUserId })
        .eq("assigned_to", primary_user_id)
        .not("status", "in", '("DONE","CANCELLED")')
        .select("id");

      if (!taskError && updatedTasks) {
        tasksReassignedCount = updatedTasks.length;
      }
    }

    // Insert deputy_activation
    const { data: activation, error: activationError } = await supabase
      .from("deputy_activations")
      .insert({
        deputy_assignment_id: assignment.id,
        primary_user_id,
        deputy_user_id: deputyUserId,
        activated_by_user_id: user.id,
        activated_by: activatedBy,
        reason: reason ?? null,
        reason_detail: reason_detail ?? null,
        expected_return_date: expected_return_date ?? null,
        tasks_reassigned: tasks_reassigned ?? false,
        tasks_reassigned_count: tasksReassignedCount,
        activated_at: now,
      })
      .select()
      .single();

    if (activationError) {
      return res.status(500).json({ error: activationError.message });
    }

    return res.status(201).json({ activation, tasks_reassigned_count: tasksReassignedCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/deputies/deactivate
// ---------------------------------------------------------------------------

router.post("/api/deputies/deactivate", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { activation_id, primary_user_id } = req.body;

    if (!activation_id && !primary_user_id) {
      return res.status(400).json({ error: "activation_id or primary_user_id is required" });
    }

    // Find active activation
    let activationQuery = supabase
      .from("deputy_activations")
      .select("*")
      .is("actual_deactivated_at", null);

    if (activation_id) {
      activationQuery = activationQuery.eq("id", activation_id);
    } else {
      activationQuery = activationQuery.eq("primary_user_id", primary_user_id);
    }

    const { data: activation, error: findError } = await activationQuery.single();

    if (findError || !activation) {
      return res.status(404).json({ error: "Active deputy activation not found" });
    }

    const now = new Date().toISOString();

    // Deactivate
    const { error: deactivateError } = await supabase
      .from("deputy_activations")
      .update({
        actual_deactivated_at: now,
        deactivated_by: user.id,
      })
      .eq("id", activation.id);

    if (deactivateError) {
      return res.status(500).json({ error: deactivateError.message });
    }

    // Restore tasks if they were reassigned
    let tasksRestoredCount = 0;
    if (activation.tasks_reassigned === true) {
      const { data: restoredTasks, error: taskError } = await supabase
        .from("tasks")
        .update({ assigned_to: activation.primary_user_id })
        .eq("assigned_to", activation.deputy_user_id)
        .gte("created_at", activation.activated_at)
        .select("id");

      if (!taskError && restoredTasks) {
        tasksRestoredCount = restoredTasks.length;
      }
    }

    return res.json({ success: true, tasks_restored_count: tasksRestoredCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/deputies/active
// ---------------------------------------------------------------------------

router.get("/api/deputies/active", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase
      .from("deputy_activations")
      .select(`
        *,
        primary_profile:profiles!primary_user_id(id, full_name, email),
        deputy_profile:profiles!deputy_user_id(id, full_name, email)
      `)
      .is("actual_deactivated_at", null);

    if (org_id) {
      query = query.eq("org_id", org_id);
    }

    const { data, error } = await query.order("activated_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ active_deputizations: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/deputies/coverage
// ---------------------------------------------------------------------------

router.get("/api/deputies/coverage", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_deputy_coverage").select("*");

    if (org_id) {
      query = query.eq("org_id", org_id);
    }

    const { data: coverage, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const rows = coverage ?? [];
    const summary = {
      covered: rows.filter((r: any) => r.coverage_status === "COVERED").length,
      partial: rows.filter((r: any) => r.coverage_status === "PARTIAL").length,
      uncovered: rows.filter((r: any) => r.coverage_status === "UNCOVERED").length,
      total: rows.length,
    };

    return res.json({ coverage: rows, summary });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/deputies/critical-functions
// ---------------------------------------------------------------------------

router.get("/api/deputies/critical-functions", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_critical_functions_coverage").select("*");

    if (org_id) {
      query = query.eq("org_id", org_id);
    }

    const { data: functions, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ functions: functions ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/deputies/gaps
// ---------------------------------------------------------------------------

router.get("/api/deputies/gaps", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    // Uncovered critical functions: requires_deputy = true and has_deputy = false
    let funcQuery = supabase
      .from("critical_functions")
      .select("*")
      .eq("requires_deputy", true)
      .eq("has_deputy", false);

    if (org_id) {
      funcQuery = funcQuery.eq("org_id", org_id);
    }

    const { data: uncoveredFunctions, error: funcError } = await funcQuery;

    if (funcError) {
      return res.status(500).json({ error: funcError.message });
    }

    // Users with no active deputy assignments as primary
    const { data: coveredUsers, error: coveredError } = await supabase
      .from("deputy_assignments")
      .select("primary_user_id")
      .eq("status", "ACTIVE");

    if (coveredError) {
      return res.status(500).json({ error: coveredError.message });
    }

    const coveredUserIds = new Set((coveredUsers ?? []).map((r: any) => r.primary_user_id));

    // Fetch all users in org
    let usersQuery = supabase.from("profiles").select("id, full_name, email, role");
    if (org_id) {
      usersQuery = usersQuery.eq("org_id", org_id);
    }

    const { data: allUsers, error: usersError } = await usersQuery;

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    const uncoveredUsers = (allUsers ?? []).filter((u: any) => !coveredUserIds.has(u.id));

    return res.json({
      uncovered_functions: uncoveredFunctions ?? [],
      uncovered_users: uncoveredUsers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
