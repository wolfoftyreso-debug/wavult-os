import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Auth guard — rejects unauthenticated requests with 401
// ---------------------------------------------------------------------------
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CapabilityLevel = "L1" | "L2" | "L3" | "L4" | "L5";

const LEVEL_VALUE: Record<CapabilityLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

const LEVEL_LABEL: Record<CapabilityLevel, string> = {
  L1: "Novice",
  L2: "Advanced Beginner",
  L3: "Competent",
  L4: "Proficient",
  L5: "Expert",
};

type ActionType = "TRAINING" | "COACHING" | "PRACTICE" | "MENTORING" | "PROJECT";
type ActionStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

interface CapabilityAssessment {
  id?: string;
  user_id: string;
  capability_id: string;
  level: CapabilityLevel;
  target_level?: CapabilityLevel;
  assessed_by: string;
  assessed_at?: string;
  notes?: string;
}

interface Feedback {
  id?: string;
  from_user_id: string;
  to_user_id: string;
  capability_id?: string;
  content: string;
  created_at?: string;
}

interface DevelopmentAction {
  id?: string;
  plan_id: string;
  capability_id: string;
  type: ActionType;
  title: string;
  description?: string;
  status: ActionStatus;
  due_date?: string;
}

interface DevelopmentPlan {
  id?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  actions?: DevelopmentAction[];
}

interface OrganizationalGoal {
  id?: string;
  title: string;
  description?: string;
  required_capabilities: { capability_id: string; target_level: CapabilityLevel }[];
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelNumeric(level: CapabilityLevel): number {
  return LEVEL_VALUE[level] ?? 0;
}

function computeGap(current: CapabilityLevel, target: CapabilityLevel): number {
  return levelNumeric(target) - levelNumeric(current);
}

function pickActionType(gap: number): ActionType {
  if (gap >= 4) return "TRAINING";
  if (gap === 3) return "COACHING";
  if (gap === 2) return "MENTORING";
  if (gap === 1) return "PRACTICE";
  return "PROJECT";
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---- 1. GET /api/capabilities/profile/:userId ----
// Get user's capability profile with all assessments — requires auth
router.get("/api/capabilities/profile/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: assessments, error } = await supabase
      .from("capability_assessments")
      .select("*, capabilities(*)")
      .eq("user_id", userId)
      .order("assessed_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const profile = {
      user_id: userId,
      assessments: (assessments ?? []).map((a: any) => ({
        ...a,
        level_label: LEVEL_LABEL[a.level as CapabilityLevel] ?? a.level,
        gap:
          a.target_level
            ? computeGap(a.level as CapabilityLevel, a.target_level as CapabilityLevel)
            : null,
      })),
      summary: {
        total_capabilities: (assessments ?? []).length,
        average_level:
          (assessments ?? []).length > 0
            ? (
                (assessments ?? []).reduce(
                  (sum: number, a: any) => sum + levelNumeric(a.level as CapabilityLevel),
                  0
                ) / (assessments ?? []).length
              ).toFixed(2)
            : null,
        gaps: (assessments ?? [])
          .filter((a: any) => a.target_level && computeGap(a.level, a.target_level) > 0)
          .map((a: any) => ({
            capability_id: a.capability_id,
            current: a.level,
            target: a.target_level,
            gap: computeGap(a.level, a.target_level),
          })),
      },
    };

    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 2. GET /api/capabilities/team ----
// Get team capability overview (heatmap data) — requires auth + org isolation
// Fix 2026-03-21: Added requireAuth + org_id filtering to prevent cross-tenant data leakage
router.get("/api/capabilities/team", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data: assessments, error } = await supabase
      .from("capability_assessments")
      .select("user_id, capability_id, level, target_level, org_id")
      .eq("org_id", user.org_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Build heatmap: capability_id -> { user_id -> level }
    const heatmap: Record<string, Record<string, { level: CapabilityLevel; gap: number | null }>> = {};

    for (const a of assessments ?? []) {
      if (!heatmap[a.capability_id]) {
        heatmap[a.capability_id] = {};
      }
      heatmap[a.capability_id][a.user_id] = {
        level: a.level as CapabilityLevel,
        gap: a.target_level
          ? computeGap(a.level as CapabilityLevel, a.target_level as CapabilityLevel)
          : null,
      };
    }

    // Aggregate per capability
    const capabilities = Object.entries(heatmap).map(([capId, users]) => {
      const levels = Object.values(users).map((u) => levelNumeric(u.level));
      const avgLevel = levels.reduce((s, v) => s + v, 0) / levels.length;
      const gaps = Object.values(users)
        .filter((u) => u.gap !== null && u.gap > 0)
        .map((u) => u.gap as number);
      return {
        capability_id: capId,
        user_count: levels.length,
        average_level: +avgLevel.toFixed(2),
        max_level: Math.max(...levels),
        min_level: Math.min(...levels),
        users,
        gap_count: gaps.length,
        average_gap: gaps.length > 0 ? +(gaps.reduce((s, v) => s + v, 0) / gaps.length).toFixed(2) : 0,
      };
    });

    return res.json({ heatmap: capabilities });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 3. POST /api/capabilities/assess/:userId ----
// Create capability assessment (level L1-L5)
router.post("/api/capabilities/assess/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { capability_id, level, target_level, assessed_by, notes } = req.body;

    if (!capability_id || !level || !assessed_by) {
      return res
        .status(400)
        .json({ error: "capability_id, level, and assessed_by are required" });
    }

    const validLevels: CapabilityLevel[] = ["L1", "L2", "L3", "L4", "L5"];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: `level must be one of ${validLevels.join(", ")}` });
    }
    if (target_level && !validLevels.includes(target_level)) {
      return res.status(400).json({ error: `target_level must be one of ${validLevels.join(", ")}` });
    }

    const assessment: CapabilityAssessment = {
      user_id: userId,
      capability_id,
      level,
      target_level: target_level ?? null,
      assessed_by,
      assessed_at: new Date().toISOString(),
      notes: notes ?? null,
    };

    const { data, error } = await supabase
      .from("capability_assessments")
      .insert(assessment)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      ...data,
      level_label: LEVEL_LABEL[level as CapabilityLevel],
      gap: target_level ? computeGap(level, target_level) : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 4. POST /api/feedback ----
// Give feedback to a user
router.post("/api/feedback", async (req: Request, res: Response) => {
  try {
    const { from_user_id, to_user_id, capability_id, content } = req.body;

    if (!from_user_id || !to_user_id || !content) {
      return res
        .status(400)
        .json({ error: "from_user_id, to_user_id, and content are required" });
    }

    const feedback: Feedback = {
      from_user_id,
      to_user_id,
      capability_id: capability_id ?? null,
      content,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("feedback")
      .insert(feedback)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 5. GET /api/development/plan/:userId ----
// Get user's development plan with actions
router.get("/api/development/plan/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: plans, error: planError } = await supabase
      .from("development_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (planError) {
      return res.status(500).json({ error: planError.message });
    }

    if (!plans || plans.length === 0) {
      return res.status(404).json({ error: "No development plan found for this user" });
    }

    const plan = plans[0];

    const { data: actions, error: actionsError } = await supabase
      .from("development_actions")
      .select("*")
      .eq("plan_id", plan.id)
      .order("due_date", { ascending: true });

    if (actionsError) {
      return res.status(500).json({ error: actionsError.message });
    }

    const completedCount = (actions ?? []).filter((a: any) => a.status === "COMPLETED").length;
    const totalCount = (actions ?? []).filter((a: any) => a.status !== "CANCELLED").length;

    return res.json({
      ...plan,
      actions: actions ?? [],
      progress: {
        completed: completedCount,
        total: totalCount,
        percentage: totalCount > 0 ? +((completedCount / totalCount) * 100).toFixed(1) : 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 6. POST /api/development/generate/:userId ----
// Auto-generate development plan based on gaps
router.post("/api/development/generate/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Fetch current assessments with gaps
    const { data: assessments, error: assessError } = await supabase
      .from("capability_assessments")
      .select("*")
      .eq("user_id", userId)
      .not("target_level", "is", null);

    if (assessError) {
      return res.status(500).json({ error: assessError.message });
    }

    const gaps = (assessments ?? [])
      .map((a: any) => ({
        capability_id: a.capability_id,
        current: a.level as CapabilityLevel,
        target: a.target_level as CapabilityLevel,
        gap: computeGap(a.level as CapabilityLevel, a.target_level as CapabilityLevel),
      }))
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    if (gaps.length === 0) {
      return res.status(200).json({ message: "No capability gaps found. No plan generated." });
    }

    // Create plan
    const { data: plan, error: planError } = await supabase
      .from("development_plans")
      .insert({
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (planError) {
      return res.status(500).json({ error: planError.message });
    }

    // Generate actions for each gap
    const actions: Omit<DevelopmentAction, "id">[] = gaps.map((g) => ({
      plan_id: plan.id,
      capability_id: g.capability_id,
      type: pickActionType(g.gap),
      title: `Close ${g.current}->${g.target} gap for capability ${g.capability_id}`,
      description: `Current level: ${g.current} (${LEVEL_LABEL[g.current]}). Target: ${g.target} (${LEVEL_LABEL[g.target]}). Gap: ${g.gap} level(s).`,
      status: "PENDING" as ActionStatus,
      due_date: new Date(Date.now() + g.gap * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { data: insertedActions, error: actionsError } = await supabase
      .from("development_actions")
      .insert(actions)
      .select();

    if (actionsError) {
      return res.status(500).json({ error: actionsError.message });
    }

    return res.status(201).json({
      plan,
      actions: insertedActions,
      gaps_addressed: gaps.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 7. POST /api/goals ----
// Create organizational goal
router.post("/api/goals", async (req: Request, res: Response) => {
  try {
    const { title, description, required_capabilities } = req.body;

    if (!title || !required_capabilities || !Array.isArray(required_capabilities)) {
      return res
        .status(400)
        .json({ error: "title and required_capabilities (array) are required" });
    }

    const { data, error } = await supabase
      .from("organizational_goals")
      .insert({
        title,
        description: description ?? null,
        required_capabilities,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 8. GET /api/goals ----
// List organizational goals
router.get("/api/goals", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("organizational_goals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ goals: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 9. GET /api/goals/:id/readiness ----
// Calculate goal readiness percentage
router.get("/api/goals/:id/readiness", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: goal, error: goalError } = await supabase
      .from("organizational_goals")
      .select("*")
      .eq("id", id)
      .single();

    if (goalError || !goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const requiredCaps: { capability_id: string; target_level: CapabilityLevel }[] =
      goal.required_capabilities ?? [];

    if (requiredCaps.length === 0) {
      return res.json({ goal_id: id, readiness_percentage: 100, details: [] });
    }

    // For each required capability, find the best current level across all users
    const details = await Promise.all(
      requiredCaps.map(async (rc) => {
        const { data: assessments } = await supabase
          .from("capability_assessments")
          .select("user_id, level")
          .eq("capability_id", rc.capability_id)
          .order("level", { ascending: false });

        const best = assessments && assessments.length > 0 ? assessments[0] : null;
        const bestLevel = best ? (best.level as CapabilityLevel) : "L1";
        const targetNumeric = levelNumeric(rc.target_level);
        const currentNumeric = levelNumeric(bestLevel);
        const readiness = Math.min((currentNumeric / targetNumeric) * 100, 100);

        return {
          capability_id: rc.capability_id,
          target_level: rc.target_level,
          best_current_level: bestLevel,
          best_user_id: best?.user_id ?? null,
          readiness: +readiness.toFixed(1),
          met: currentNumeric >= targetNumeric,
        };
      })
    );

    const overallReadiness =
      details.reduce((sum, d) => sum + d.readiness, 0) / details.length;

    return res.json({
      goal_id: id,
      title: goal.title,
      readiness_percentage: +overallReadiness.toFixed(1),
      capabilities_met: details.filter((d) => d.met).length,
      capabilities_total: details.length,
      details,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- 10. GET /api/dashboards/capabilities ----
// Capability dashboard with gaps, trends
router.get("/api/dashboards/capabilities", async (_req: Request, res: Response) => {
  try {
    const { data: assessments, error } = await supabase
      .from("capability_assessments")
      .select("*")
      .order("assessed_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const records = assessments ?? [];

    // Unique users & capabilities
    const userIds = [...new Set(records.map((a: any) => a.user_id))];
    const capabilityIds = [...new Set(records.map((a: any) => a.capability_id))];

    // Gaps: assessments where current < target
    const gapRecords = records.filter(
      (a: any) =>
        a.target_level &&
        computeGap(a.level as CapabilityLevel, a.target_level as CapabilityLevel) > 0
    );

    const gaps = gapRecords.map((a: any) => ({
      user_id: a.user_id,
      capability_id: a.capability_id,
      current: a.level,
      target: a.target_level,
      gap: computeGap(a.level as CapabilityLevel, a.target_level as CapabilityLevel),
    }));

    // Trends: group by month
    const trendMap: Record<string, { total: number; count: number }> = {};
    for (const a of records) {
      if (!a.assessed_at) continue;
      const month = (a.assessed_at as string).substring(0, 7); // YYYY-MM
      if (!trendMap[month]) {
        trendMap[month] = { total: 0, count: 0 };
      }
      trendMap[month].total += levelNumeric(a.level as CapabilityLevel);
      trendMap[month].count += 1;
    }

    const trends = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        average_level: +(v.total / v.count).toFixed(2),
        assessment_count: v.count,
      }));

    // Level distribution
    const distribution: Record<string, number> = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };
    for (const a of records) {
      const lvl = a.level as CapabilityLevel;
      if (distribution[lvl] !== undefined) {
        distribution[lvl]++;
      }
    }

    // Top gaps (sorted by gap size descending)
    const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap);

    return res.json({
      summary: {
        total_users: userIds.length,
        total_capabilities: capabilityIds.length,
        total_assessments: records.length,
        total_gaps: gaps.length,
        average_gap:
          gaps.length > 0
            ? +(gaps.reduce((s, g) => s + g.gap, 0) / gaps.length).toFixed(2)
            : 0,
      },
      level_distribution: distribution,
      top_gaps: sortedGaps.slice(0, 10),
      trends,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
