import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { emitEntityEvent } from "./events";
import {
  collectReviewData,
  generateAIAnalysis,
  generateGoalRecommendations,
  generateFollowupAnalysis,
} from "./strategic-review";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/reviews — Create a new strategic review
// ---------------------------------------------------------------------------
router.post("/api/reviews", async (req: Request, res: Response) => {
  try {
    const { org_id, review_type, period_from, period_to, led_by, scheduled_date } =
      req.body;

    if (!org_id || !review_type || !period_from || !period_to) {
      return res
        .status(400)
        .json({ error: "org_id, review_type, period_from, period_to required" });
    }

    const { data, error } = await supabase
      .from("strategic_reviews")
      .insert({
        org_id,
        review_type,
        period_from,
        period_to,
        led_by: led_by ?? null,
        scheduled_date: scheduled_date ?? null,
        status: "PREPARING",
      })
      .select()
      .single();

    if (error) throw error;

    const actorId = (req as any).user?.id;
    await emitEntityEvent(
      "decision.created",
      "strategic_reviews",
      data.id,
      org_id,
      actorId,
      { action: "review_created", review_type }
    );

    res.status(201).json(data);
  } catch (err: any) {
    console.error("[strategic-review-api] POST /api/reviews error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reviews — List reviews with summary
// ---------------------------------------------------------------------------
router.get("/api/reviews", async (req: Request, res: Response) => {
  try {
    const { org_id, status, review_type, limit } = req.query;

    let query = supabase
      .from("strategic_reviews")
      .select("id, org_id, review_type, period_from, period_to, status, scheduled_date, completed_at, summary, created_at")
      .order("created_at", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id as string);
    if (status) query = query.eq("status", status as string);
    if (review_type) query = query.eq("review_type", review_type as string);
    if (limit) query = query.limit(parseInt(limit as string, 10));

    const { data, error } = await query;
    if (error) throw error;

    res.json(data ?? []);
  } catch (err: any) {
    console.error("[strategic-review-api] GET /api/reviews error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reviews/history — All reviews with stats
// ---------------------------------------------------------------------------
router.get("/api/reviews/history", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;

    let query = supabase
      .from("strategic_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id as string);

    const { data: reviews, error } = await query;
    if (error) throw error;

    const reviewsWithStats = await Promise.all(
      (reviews ?? []).map(async (review: any) => {
        const { count: recCount } = await supabase
          .from("review_recommendations")
          .select("*", { count: "exact", head: true })
          .eq("review_id", review.id);

        const { count: actionCount } = await supabase
          .from("review_action_items")
          .select("*", { count: "exact", head: true })
          .eq("review_id", review.id);

        const { count: completedActions } = await supabase
          .from("review_action_items")
          .select("*", { count: "exact", head: true })
          .eq("review_id", review.id)
          .eq("status", "COMPLETED");

        return {
          ...review,
          stats: {
            recommendations: recCount ?? 0,
            action_items: actionCount ?? 0,
            completed_actions: completedActions ?? 0,
          },
        };
      })
    );

    res.json(reviewsWithStats);
  } catch (err: any) {
    console.error("[strategic-review-api] GET /api/reviews/history error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reviews/:id — Full review with snapshots + recommendations
// ---------------------------------------------------------------------------
router.get("/api/reviews/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: review, error: reviewError } = await supabase
      .from("strategic_reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (reviewError) throw reviewError;
    if (!review) return res.status(404).json({ error: "Review not found" });

    const [snapshots, recommendations, goals, attendees, actionItems] =
      await Promise.all([
        supabase
          .from("review_data_snapshots")
          .select("*")
          .eq("review_id", id)
          .order("data_domain"),
        supabase
          .from("review_recommendations")
          .select("*")
          .eq("review_id", id)
          .order("priority"),
        supabase
          .from("review_goals")
          .select("*")
          .eq("review_id", id),
        supabase
          .from("review_attendees")
          .select("*")
          .eq("review_id", id),
        supabase
          .from("review_action_items")
          .select("*")
          .eq("review_id", id)
          .order("priority"),
      ]);

    res.json({
      ...review,
      snapshots: snapshots.data ?? [],
      recommendations: recommendations.data ?? [],
      goals: goals.data ?? [],
      attendees: attendees.data ?? [],
      action_items: actionItems.data ?? [],
    });
  } catch (err: any) {
    console.error("[strategic-review-api] GET /api/reviews/:id error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/collect — Trigger data collection
// ---------------------------------------------------------------------------
router.post("/api/reviews/:id/collect", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: review, error: reviewError } = await supabase
      .from("strategic_reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Update status to AI_ANALYZING
    await supabase
      .from("strategic_reviews")
      .update({ status: "AI_ANALYZING", updated_at: new Date().toISOString() })
      .eq("id", id);

    // Collect all data
    const reviewData = await collectReviewData(
      review.org_id,
      review.period_from,
      review.period_to
    );

    // Save snapshots to database
    const snapshotRecords = reviewData.snapshots.map((s) => ({
      review_id: id,
      data_domain: s.data_domain,
      snapshot_data: s.snapshot_data,
      trend_data: s.trend_data,
      ai_insights: s.ai_insights,
      collected_at: s.collected_at,
    }));

    // Delete existing snapshots for this review (re-collect)
    await supabase
      .from("review_data_snapshots")
      .delete()
      .eq("review_id", id);

    const { error: insertError } = await supabase
      .from("review_data_snapshots")
      .insert(snapshotRecords);

    if (insertError) throw insertError;

    res.json({ status: "collected", domains: reviewData.snapshots.length });
  } catch (err: any) {
    console.error("[strategic-review-api] POST /api/reviews/:id/collect error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/analyze — Trigger AI analysis
// ---------------------------------------------------------------------------
router.post("/api/reviews/:id/analyze", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch review and snapshots
    const { data: review, error: reviewError } = await supabase
      .from("strategic_reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const { data: snapshotRows } = await supabase
      .from("review_data_snapshots")
      .select("*")
      .eq("review_id", id);

    if (!snapshotRows || snapshotRows.length === 0) {
      return res.status(400).json({ error: "No data collected yet. Run /collect first." });
    }

    const snapshots = {
      orgId: review.org_id,
      periodFrom: review.period_from,
      periodTo: review.period_to,
      snapshots: snapshotRows.map((s: any) => ({
        data_domain: s.data_domain,
        snapshot_data: s.snapshot_data,
        trend_data: s.trend_data,
        ai_insights: s.ai_insights,
        collected_at: s.collected_at,
      })),
    };

    // Run AI analysis
    const analysis = await generateAIAnalysis(snapshots, review.ai_analysis);

    // Save recommendations
    if (analysis.recommendations.length > 0) {
      // Delete existing recommendations (re-analyze)
      await supabase
        .from("review_recommendations")
        .delete()
        .eq("review_id", id);

      const recRecords = analysis.recommendations.map((r) => ({
        review_id: id,
        category: r.category,
        priority: r.priority,
        title: r.title,
        analysis: r.analysis,
        recommendation: r.recommendation,
        supporting_data: r.supporting_data,
        estimated_impact: r.estimated_impact,
        estimated_effort: r.estimated_effort,
        status: "PROPOSED",
      }));

      await supabase.from("review_recommendations").insert(recRecords);
    }

    // Generate goal recommendations
    const goalsSnapshot = snapshotRows.find((s: any) => s.data_domain === "GOALS");
    if (goalsSnapshot) {
      const goalRecs = await generateGoalRecommendations(
        snapshots,
        goalsSnapshot.snapshot_data?.goals ?? []
      );

      if (goalRecs.length > 0) {
        const goalRecords = goalRecs.map((g) => ({
          review_id: id,
          goal_id: g.goal_id ?? null,
          action: g.action,
          previous_value: g.previous_value ?? {},
          new_value: g.new_value ?? {},
          rationale: g.rationale,
        }));

        await supabase
          .from("review_goals")
          .delete()
          .eq("review_id", id);

        await supabase.from("review_goals").insert(goalRecords);
      }
    }

    // Update review with analysis and status
    await supabase
      .from("strategic_reviews")
      .update({
        ai_analysis: analysis,
        status: "READY_FOR_REVIEW",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    res.json({
      status: "analyzed",
      recommendations: analysis.recommendations.length,
      summary: analysis.executive_summary,
    });
  } catch (err: any) {
    console.error("[strategic-review-api] POST /api/reviews/:id/analyze error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reviews/:id/presentation — Structured for dashboard
// ---------------------------------------------------------------------------
router.get("/api/reviews/:id/presentation", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: review, error: reviewError } = await supabase
      .from("strategic_reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const [snapshots, recommendations, goals] = await Promise.all([
      supabase.from("review_data_snapshots").select("*").eq("review_id", id),
      supabase
        .from("review_recommendations")
        .select("*")
        .eq("review_id", id)
        .order("priority"),
      supabase.from("review_goals").select("*").eq("review_id", id),
    ]);

    const snapshotMap: Record<string, any> = {};
    for (const s of snapshots.data ?? []) {
      snapshotMap[s.data_domain] = s.snapshot_data;
    }

    const analysis = review.ai_analysis ?? {};

    res.json({
      review_id: id,
      review_type: review.review_type,
      period: { from: review.period_from, to: review.period_to },
      executive_summary: analysis.executive_summary ?? review.summary ?? "",
      key_metrics_delta: {
        kpi: snapshotMap.KPI ?? {},
        pipeline: snapshotMap.PIPELINE ?? {},
        financials: snapshotMap.FINANCIALS ?? {},
      },
      top_recommendations: (recommendations.data ?? []).slice(0, 5),
      goal_status: {
        goals: snapshotMap.GOALS ?? {},
        goal_actions: goals.data ?? [],
      },
      risk_alerts: analysis.risk_alerts ?? [],
      positive_trends: analysis.positive_trends ?? [],
      areas_of_concern: analysis.areas_of_concern ?? [],
    });
  } catch (err: any) {
    console.error("[strategic-review-api] GET /api/reviews/:id/presentation error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/reviews/:id/start-session — Transition to IN_SESSION
// ---------------------------------------------------------------------------
router.patch("/api/reviews/:id/start-session", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("strategic_reviews")
      .update({ status: "IN_SESSION", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error("[strategic-review-api] PATCH start-session error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/recommendations/:recId/decide — Accept/Reject/Defer
// ---------------------------------------------------------------------------
router.post(
  "/api/reviews/:id/recommendations/:recId/decide",
  async (req: Request, res: Response) => {
    try {
      const { id, recId } = req.params;
      const { status, decision_rationale } = req.body;
      const actorId = (req as any).user?.id;

      if (!status || !["ACCEPTED", "REJECTED", "DEFERRED"].includes(status)) {
        return res
          .status(400)
          .json({ error: "status must be ACCEPTED, REJECTED, or DEFERRED" });
      }

      const updateData: Record<string, unknown> = {
        status,
        decision_rationale: decision_rationale ?? null,
        decided_by: actorId ?? null,
        decided_at: new Date().toISOString(),
      };

      // If ACCEPTED, auto-create linked entity
      if (status === "ACCEPTED") {
        const { data: rec } = await supabase
          .from("review_recommendations")
          .select("*")
          .eq("id", recId)
          .single();

        if (rec) {
          const { data: review } = await supabase
            .from("strategic_reviews")
            .select("org_id")
            .eq("id", id)
            .single();

          const orgId = review?.org_id;

          // Auto-create based on category
          if (
            rec.category === "PROCESS_IMPROVEMENT" ||
            rec.category === "CAPABILITY_INVESTMENT" ||
            rec.category === "ORGANIZATIONAL_CHANGE"
          ) {
            // Create improvement
            const { data: improvement } = await supabase
              .from("improvements")
              .insert({
                org_id: orgId,
                title: rec.title,
                description: rec.recommendation,
                status: "IDEA",
                priority: rec.priority,
                source: "STRATEGIC_REVIEW",
              })
              .select("id")
              .single();

            if (improvement) {
              updateData.resulting_entity_type = "improvement";
              updateData.resulting_entity_id = improvement.id;
            }
          } else if (rec.category === "GOAL_SETTING") {
            // Create goal
            const { data: goal } = await supabase
              .from("goals")
              .insert({
                org_id: orgId,
                title: rec.title,
                description: rec.recommendation,
                status: "ACTIVE",
                priority: rec.priority,
              })
              .select("id")
              .single();

            if (goal) {
              updateData.resulting_entity_type = "goal";
              updateData.resulting_entity_id = goal.id;
            }
          } else {
            // Create task for all other categories
            const { data: task } = await supabase
              .from("tasks")
              .insert({
                org_id: orgId,
                title: rec.title,
                description: rec.recommendation,
                status: "TODO",
                priority: rec.priority,
                assigned_to: actorId ?? null,
              })
              .select("id")
              .single();

            if (task) {
              updateData.resulting_entity_type = "task";
              updateData.resulting_entity_id = task.id;
            }
          }

          // Create entity relation between review and resulting entity
          if (updateData.resulting_entity_id && orgId) {
            const { data: reviewEntity } = await supabase
              .from("entities")
              .select("id")
              .eq("source_table", "strategic_reviews")
              .eq("source_id", id)
              .maybeSingle();

            const { data: resultEntity } = await supabase
              .from("entities")
              .select("id")
              .eq("source_id", updateData.resulting_entity_id as string)
              .maybeSingle();

            if (reviewEntity && resultEntity) {
              await supabase.from("entity_relations").insert({
                org_id: orgId,
                from_entity_id: reviewEntity.id,
                to_entity_id: resultEntity.id,
                relation_type: "GENERATED",
              });
            }
          }
        }
      }

      const { data, error } = await supabase
        .from("review_recommendations")
        .update(updateData)
        .eq("id", recId)
        .eq("review_id", id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (err: any) {
      console.error("[strategic-review-api] POST decide error:", err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/goals — Set/adjust goals with rationale
// ---------------------------------------------------------------------------
router.post("/api/reviews/:id/goals", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { goal_id, action, previous_value, new_value, rationale } = req.body;
    const actorId = (req as any).user?.id;

    if (!action) {
      return res.status(400).json({ error: "action is required" });
    }

    const { data, error } = await supabase
      .from("review_goals")
      .insert({
        review_id: id,
        goal_id: goal_id ?? null,
        action,
        previous_value: previous_value ?? {},
        new_value: new_value ?? {},
        rationale: rationale ?? null,
        decided_by: actorId ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Apply goal changes if goal_id exists
    if (goal_id && action !== "CREATE") {
      const goalUpdate: Record<string, unknown> = {};

      if (action === "CLOSE_ACHIEVED") goalUpdate.status = "ACHIEVED";
      if (action === "CLOSE_MISSED") goalUpdate.status = "MISSED";
      if (action === "DEPRIORITIZE") goalUpdate.priority = (new_value as any)?.priority ?? 5;
      if (action === "ESCALATE") goalUpdate.priority = (new_value as any)?.priority ?? 1;
      if (action === "ADJUST_TARGET" && new_value) {
        goalUpdate.target_value = (new_value as any)?.target_value;
      }
      if (action === "ADJUST_TIMELINE" && new_value) {
        goalUpdate.deadline = (new_value as any)?.deadline;
      }

      if (Object.keys(goalUpdate).length > 0) {
        await supabase.from("goals").update(goalUpdate).eq("id", goal_id);
      }
    }

    // Create new goal if action is CREATE
    if (action === "CREATE" && new_value) {
      const { data: review } = await supabase
        .from("strategic_reviews")
        .select("org_id")
        .eq("id", id)
        .single();

      if (review) {
        const { data: newGoal } = await supabase
          .from("goals")
          .insert({
            org_id: review.org_id,
            title: (new_value as any)?.title ?? "Nytt mål",
            description: (new_value as any)?.description ?? rationale,
            target_value: (new_value as any)?.target_value,
            deadline: (new_value as any)?.deadline,
            status: "ACTIVE",
          })
          .select("id")
          .single();

        if (newGoal) {
          await supabase
            .from("review_goals")
            .update({ goal_id: newGoal.id })
            .eq("id", data.id);
        }
      }
    }

    res.status(201).json(data);
  } catch (err: any) {
    console.error("[strategic-review-api] POST goals error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reviews/:id/action-items — Create action items with auto task
// ---------------------------------------------------------------------------
router.post("/api/reviews/:id/action-items", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      responsible_id,
      deadline,
      priority,
      linked_recommendation_id,
      linked_goal_id,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    // Get review org_id
    const { data: review } = await supabase
      .from("strategic_reviews")
      .select("org_id")
      .eq("id", id)
      .single();

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Auto-create a task
    const { data: task } = await supabase
      .from("tasks")
      .insert({
        org_id: review.org_id,
        title,
        description: description ?? null,
        status: "TODO",
        assigned_to: responsible_id ?? null,
        due_date: deadline ?? null,
        priority: priority ?? 3,
      })
      .select("id")
      .single();

    const { data, error } = await supabase
      .from("review_action_items")
      .insert({
        review_id: id,
        title,
        description: description ?? null,
        responsible_id: responsible_id ?? null,
        deadline: deadline ?? null,
        priority: priority ?? 3,
        linked_recommendation_id: linked_recommendation_id ?? null,
        linked_task_id: task?.id ?? null,
        linked_improvement_id: null,
        linked_goal_id: linked_goal_id ?? null,
        status: "PENDING",
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ action_item: data, task_id: task?.id ?? null });
  } catch (err: any) {
    console.error("[strategic-review-api] POST action-items error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/reviews/:id/complete — Complete the review
// ---------------------------------------------------------------------------
router.patch("/api/reviews/:id/complete", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;
    const actorId = (req as any).user?.id;

    // Verify all recommendations have been decided
    const { data: undecided } = await supabase
      .from("review_recommendations")
      .select("id")
      .eq("review_id", id)
      .eq("status", "PROPOSED");

    if (undecided && undecided.length > 0) {
      return res.status(400).json({
        error: `${undecided.length} recommendation(s) still PROPOSED. Decide all before completing.`,
        undecided_ids: undecided.map((r: any) => r.id),
      });
    }

    const { data, error } = await supabase
      .from("strategic_reviews")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        summary: summary ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Create a Decision post in the domain events
    if (data) {
      await emitEntityEvent(
        "decision.created",
        "strategic_reviews",
        id,
        data.org_id,
        actorId,
        {
          action: "review_completed",
          review_type: data.review_type,
          summary: summary ?? data.summary,
        }
      );
    }

    res.json(data);
  } catch (err: any) {
    console.error("[strategic-review-api] PATCH complete error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reviews/:id/followup — Action items status
// ---------------------------------------------------------------------------
router.get("/api/reviews/:id/followup", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await generateFollowupAnalysis(id);
    res.json(result);
  } catch (err: any) {
    console.error("[strategic-review-api] GET followup error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
