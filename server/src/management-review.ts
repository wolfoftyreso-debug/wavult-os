import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { eventBus, emitEntityEvent } from "./events";

const router = Router();

// ===========================================================================
// MANAGEMENT REVIEWS — ISO 9001:2015 §9.3
// ===========================================================================

// POST /api/management-reviews — Create a new management review
router.post("/api/management-reviews", async (req: Request, res: Response) => {
  try {
    const { org_id, review_date, period_from, period_to, led_by, minutes_document_id } = req.body;

    const { data, error } = await supabase
      .from("management_reviews")
      .insert({
        org_id,
        review_date,
        period_from,
        period_to,
        status: "PLANNED",
        led_by: led_by || null,
        minutes_document_id: minutes_document_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await emitEntityEvent(
      "decision.created" as any,
      "management_reviews",
      data.id,
      org_id,
      (req as any).user?.id,
      { action: "management_review.created", review_date, period_from, period_to }
    );

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/management-reviews — List management reviews
router.get("/api/management-reviews", async (req: Request, res: Response) => {
  try {
    const { org_id, status } = req.query;

    let query = supabase
      .from("management_reviews")
      .select("*")
      .order("review_date", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/management-reviews/:id — Get review with inputs + outputs
router.get("/api/management-reviews/:id", async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;

    const [reviewRes, inputsRes, outputsRes] = await Promise.all([
      supabase.from("management_reviews").select("*").eq("id", reviewId).single(),
      supabase
        .from("management_review_inputs")
        .select("*")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true }),
      supabase
        .from("management_review_outputs")
        .select("*")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true }),
    ]);

    if (reviewRes.error) return res.status(404).json({ error: "Review not found" });

    return res.json({
      ...reviewRes.data,
      inputs: inputsRes.data || [],
      outputs: outputsRes.data || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/management-reviews/:id/populate — Auto-populate all inputs (§9.3.2)
// ---------------------------------------------------------------------------
router.post("/api/management-reviews/:id/populate", async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;

    // Fetch the review to get period bounds
    const { data: review, error: reviewErr } = await supabase
      .from("management_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (reviewErr || !review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const { period_from, period_to, org_id } = review;
    const assessedBy = (req as any).user?.id || null;
    const inputs: Array<{
      review_id: string;
      input_type: string;
      data_snapshot: any;
      assessed_by: string | null;
      created_at: string;
    }> = [];

    // -----------------------------------------------------------------------
    // AUDIT_RESULTS — audits conducted during the period
    // -----------------------------------------------------------------------
    const { data: audits } = await supabase
      .from("audits")
      .select("id, title, status, type, scheduled_date, findings")
      .gte("scheduled_date", period_from)
      .lte("scheduled_date", period_to);

    inputs.push({
      review_id: reviewId,
      input_type: "AUDIT_RESULTS",
      data_snapshot: {
        total: (audits || []).length,
        audits: audits || [],
        by_status: countBy(audits || [], "status"),
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // NC_STATUS — open/closed counts and breakdown by severity
    // -----------------------------------------------------------------------
    const { data: ncs } = await supabase
      .from("non_conformances")
      .select("id, title, status, severity, created_at, closed_at");

    const openNcs = (ncs || []).filter((nc: any) => nc.status !== "CLOSED");
    const closedNcs = (ncs || []).filter((nc: any) => nc.status === "CLOSED");

    inputs.push({
      review_id: reviewId,
      input_type: "NC_STATUS",
      data_snapshot: {
        total: (ncs || []).length,
        open: openNcs.length,
        closed: closedNcs.length,
        by_severity: countBy(ncs || [], "severity"),
        by_status: countBy(ncs || [], "status"),
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // IMPROVEMENT_STATUS — count by PDCA phase
    // -----------------------------------------------------------------------
    const { data: improvements } = await supabase
      .from("improvements")
      .select("id, title, status, pdca_phase, created_at, completed_at");

    inputs.push({
      review_id: reviewId,
      input_type: "IMPROVEMENT_STATUS",
      data_snapshot: {
        total: (improvements || []).length,
        by_pdca_phase: countBy(improvements || [], "pdca_phase"),
        by_status: countBy(improvements || [], "status"),
        active: (improvements || []).filter((i: any) => i.status === "ACTIVE").length,
        completed: (improvements || []).filter((i: any) => i.status === "COMPLETED").length,
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // KPI_RESULTS — current KPIs / goals
    // -----------------------------------------------------------------------
    const { data: goals } = await supabase
      .from("goals")
      .select("id, title, status, target_value, current_value, level, review_frequency");

    inputs.push({
      review_id: reviewId,
      input_type: "KPI_RESULTS",
      data_snapshot: {
        total: (goals || []).length,
        goals: goals || [],
        by_status: countBy(goals || [], "status"),
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // PROCESS_PERFORMANCE — aggregate from process_executions
    // -----------------------------------------------------------------------
    const { data: executions } = await supabase
      .from("process_executions")
      .select("id, process_id, status, started_at, completed_at")
      .gte("started_at", period_from)
      .lte("started_at", period_to);

    const completedExecs = (executions || []).filter((e: any) => e.status === "COMPLETED" && e.completed_at);
    const avgDuration =
      completedExecs.length > 0
        ? completedExecs.reduce((sum: number, e: any) => {
            return sum + (new Date(e.completed_at).getTime() - new Date(e.started_at).getTime());
          }, 0) / completedExecs.length
        : 0;

    inputs.push({
      review_id: reviewId,
      input_type: "PROCESS_PERFORMANCE",
      data_snapshot: {
        total_executions: (executions || []).length,
        completed: completedExecs.length,
        by_status: countBy(executions || [], "status"),
        avg_duration_ms: Math.round(avgDuration),
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // RISK_CHANGES — new or changed risks in the period
    // -----------------------------------------------------------------------
    const { data: risks } = await supabase
      .from("risks")
      .select("id, title, level, status, score, created_at, updated_at")
      .or(`created_at.gte.${period_from},updated_at.gte.${period_from}`)
      .lte("created_at", period_to);

    inputs.push({
      review_id: reviewId,
      input_type: "RISK_CHANGES",
      data_snapshot: {
        total: (risks || []).length,
        risks: risks || [],
        by_level: countBy(risks || [], "level"),
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // PREVIOUS_ACTIONS — outputs from previous review not yet COMPLETED
    // -----------------------------------------------------------------------
    const { data: previousReviews } = await supabase
      .from("management_reviews")
      .select("id")
      .eq("org_id", org_id)
      .eq("status", "COMPLETED")
      .lt("review_date", review.review_date)
      .order("review_date", { ascending: false })
      .limit(1);

    let pendingActions: any[] = [];
    if (previousReviews && previousReviews.length > 0) {
      const prevId = previousReviews[0].id;
      const { data: prevOutputs } = await supabase
        .from("management_review_outputs")
        .select("*")
        .eq("review_id", prevId)
        .neq("status", "COMPLETED");

      pendingActions = prevOutputs || [];
    }

    inputs.push({
      review_id: reviewId,
      input_type: "PREVIOUS_ACTIONS",
      data_snapshot: {
        pending_count: pendingActions.length,
        actions: pendingActions,
      },
      assessed_by: assessedBy,
      created_at: new Date().toISOString(),
    });

    // -----------------------------------------------------------------------
    // Bulk insert all inputs
    // -----------------------------------------------------------------------
    const { data: insertedInputs, error: insertErr } = await supabase
      .from("management_review_inputs")
      .insert(inputs)
      .select();

    if (insertErr) return res.status(400).json({ error: insertErr.message });

    // Move review to IN_PROGRESS
    await supabase
      .from("management_reviews")
      .update({ status: "IN_PROGRESS", updated_at: new Date().toISOString() })
      .eq("id", reviewId);

    return res.status(201).json({
      message: "Inputs populated successfully",
      inputs_created: (insertedInputs || []).length,
      inputs: insertedInputs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/management-reviews/:id/status — Update review status
router.patch("/api/management-reviews/:id/status", async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;
    const { status } = req.body;

    const validStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("management_reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// MANAGEMENT REVIEW OUTPUTS — §9.3.3
// ---------------------------------------------------------------------------

// POST /api/management-reviews/:id/outputs — Create output with auto-task creation
router.post("/api/management-reviews/:id/outputs", async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;
    const { output_type, title, description, responsible_id, deadline, linked_improvement_id } = req.body;

    // Validate the review exists
    const { data: review, error: reviewErr } = await supabase
      .from("management_reviews")
      .select("id, org_id")
      .eq("id", reviewId)
      .single();

    if (reviewErr || !review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Auto-create a task for actionable outputs
    let linkedTaskId: string | null = null;
    if (responsible_id && deadline) {
      const { data: task, error: taskErr } = await supabase
        .from("tasks")
        .insert({
          title: `[MR Output] ${title}`,
          description: description || `Management review output: ${output_type}`,
          assigned_to: responsible_id,
          due_date: deadline,
          status: "TODO",
          org_id: review.org_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!taskErr && task) {
        linkedTaskId = task.id;
      }
    }

    const { data, error } = await supabase
      .from("management_review_outputs")
      .insert({
        review_id: reviewId,
        output_type,
        title,
        description,
        responsible_id: responsible_id || null,
        deadline: deadline || null,
        linked_task_id: linkedTaskId,
        linked_improvement_id: linked_improvement_id || null,
        status: "DECIDED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await emitEntityEvent(
      "decision.created" as any,
      "management_review_outputs",
      data.id,
      review.org_id,
      (req as any).user?.id,
      { action: "mr_output.created", output_type, title, linked_task_id: linkedTaskId }
    );

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/management-reviews/:id/outputs/:outputId — Update output status
router.patch("/api/management-reviews/:id/outputs/:outputId", async (req: Request, res: Response) => {
  try {
    const { outputId } = req.params;
    const { status, title, description, responsible_id, deadline } = req.body;

    const validStatuses = ["DECIDED", "IMPLEMENTING", "COMPLETED", "CANCELLED"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (responsible_id) updatePayload.responsible_id = responsible_id;
    if (deadline) updatePayload.deadline = deadline;

    const { data, error } = await supabase
      .from("management_review_outputs")
      .update(updatePayload)
      .eq("id", outputId)
      .eq("review_id", req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/management-reviews/:id/outputs — List outputs for a review
router.get("/api/management-reviews/:id/outputs", async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;
    const { status } = req.query;

    let query = supabase
      .from("management_review_outputs")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ===========================================================================
// QUALITY POLICIES — ISO 9001:2015 §5.2
// ===========================================================================

// POST /api/quality-policies — Create a quality policy
router.post("/api/quality-policies", async (req: Request, res: Response) => {
  try {
    const { org_id, title, statement, version, approved_by } = req.body;

    const { data, error } = await supabase
      .from("quality_policies")
      .insert({
        org_id,
        title,
        statement,
        version: version || "1.0",
        status: "DRAFT",
        approved_by: approved_by || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await emitEntityEvent(
      "decision.created" as any,
      "quality_policies",
      data.id,
      org_id,
      (req as any).user?.id,
      { action: "quality_policy.created", title }
    );

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/quality-policies — List quality policies
router.get("/api/quality-policies", async (req: Request, res: Response) => {
  try {
    const { org_id, status } = req.query;

    let query = supabase
      .from("quality_policies")
      .select("*")
      .order("updated_at", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/quality-policies/:id — Update / activate a policy
router.patch("/api/quality-policies/:id", async (req: Request, res: Response) => {
  try {
    const policyId = req.params.id;
    const { title, statement, version, status, approved_by } = req.body;

    const validStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title) updatePayload.title = title;
    if (statement) updatePayload.statement = statement;
    if (version) updatePayload.version = version;
    if (status) updatePayload.status = status;
    if (approved_by) updatePayload.approved_by = approved_by;

    // When activating, set approved_at and archive any other active policy
    if (status === "ACTIVE") {
      updatePayload.approved_at = new Date().toISOString();

      // Fetch the policy org_id to scope the archival
      const { data: current } = await supabase
        .from("quality_policies")
        .select("org_id")
        .eq("id", policyId)
        .single();

      if (current) {
        await supabase
          .from("quality_policies")
          .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
          .eq("org_id", current.org_id)
          .eq("status", "ACTIVE")
          .neq("id", policyId);
      }
    }

    const { data, error } = await supabase
      .from("quality_policies")
      .update(updatePayload)
      .eq("id", policyId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ===========================================================================
// GOAL CASCADE — ISO 9001:2015 §6.2
// ===========================================================================

// GET /api/goals/cascade — Full goal cascade (strategic → tactical → operational → individual)
router.get("/api/goals/cascade", async (req: Request, res: Response) => {
  try {
    const { org_id, policy_id } = req.query;

    let query = supabase
      .from("goals")
      .select("*")
      .order("level", { ascending: true })
      .order("created_at", { ascending: true });

    if (org_id) query = query.eq("org_id", org_id);
    if (policy_id) query = query.eq("policy_id", policy_id);

    const { data: goals, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    // Build cascade tree
    const goalMap = new Map<string, any>();
    const roots: any[] = [];

    for (const goal of goals || []) {
      goalMap.set(goal.id, { ...goal, children: [] });
    }

    for (const goal of goals || []) {
      const node = goalMap.get(goal.id);
      if (goal.parent_goal_id && goalMap.has(goal.parent_goal_id)) {
        goalMap.get(goal.parent_goal_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Summary by level
    const byLevel: Record<string, number> = {};
    for (const goal of goals || []) {
      const lvl = goal.level || "UNCLASSIFIED";
      byLevel[lvl] = (byLevel[lvl] || 0) + 1;
    }

    return res.json({
      cascade: roots,
      summary: {
        total: (goals || []).length,
        by_level: byLevel,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/cascade — Create a goal with level + parent linkage
router.post("/api/goals/cascade", async (req: Request, res: Response) => {
  try {
    const {
      org_id,
      title,
      description,
      level,
      parent_goal_id,
      policy_id,
      target_value,
      current_value,
      review_frequency,
      measurement_method,
      responsible_function,
      owner_id,
      due_date,
    } = req.body;

    const validLevels = ["STRATEGIC", "TACTICAL", "OPERATIONAL", "INDIVIDUAL"];
    if (level && !validLevels.includes(level)) {
      return res.status(400).json({
        error: `Invalid level. Must be one of: ${validLevels.join(", ")}`,
      });
    }

    // Validate parent goal exists if provided
    if (parent_goal_id) {
      const { data: parent, error: parentErr } = await supabase
        .from("goals")
        .select("id, level")
        .eq("id", parent_goal_id)
        .single();

      if (parentErr || !parent) {
        return res.status(400).json({ error: "Parent goal not found" });
      }
    }

    const { data, error } = await supabase
      .from("goals")
      .insert({
        org_id,
        title,
        description,
        level: level || null,
        parent_goal_id: parent_goal_id || null,
        policy_id: policy_id || null,
        target_value: target_value || null,
        current_value: current_value || 0,
        review_frequency: review_frequency || null,
        measurement_method: measurement_method || null,
        responsible_function: responsible_function || null,
        owner_id: owner_id || null,
        due_date: due_date || null,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await emitEntityEvent(
      "goal.created",
      "goals",
      data.id,
      org_id,
      (req as any).user?.id,
      { action: "goal.cascade_created", level, parent_goal_id, policy_id }
    );

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ===========================================================================
// Helpers
// ===========================================================================

function countBy(items: any[], field: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item[field] || "UNKNOWN";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export default router;
