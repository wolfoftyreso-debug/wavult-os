import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChangeType = "ADD_ROLE" | "REMOVE_ROLE" | "CHANGE_MIX" | "CHANGE_HOURS";

interface SimulationChange {
  type: ChangeType;
  role?: string;
  count?: number;
  cost_per_hour?: number;
  production_pct?: number;
}

interface SimulationBody {
  title: string;
  description?: string;
  org_id: string;
  changes: SimulationChange[];
}

interface WorkforcePlanBody {
  org_id: string;
  title?: string;
  goal_ids: string[];
  period_start: string;
  period_end: string;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/capacity/current — Org-level capacity summary
// ---------------------------------------------------------------------------
router.get("/api/capacity/current", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_org_capacity_summary").select("*");
    if (org_id) query = query.eq("org_id", org_id);

    const { data: capacity, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ capacity: capacity ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/capacity/by-role — Capacity grouped by role
// ---------------------------------------------------------------------------
router.get("/api/capacity/by-role", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_current_capacity").select("*");
    if (org_id) query = query.eq("org_id", org_id);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const rows = data ?? [];
    const roleMap: Record<string, any> = {};

    for (const row of rows) {
      const key = row.role_code ?? "UNASSIGNED";
      if (!roleMap[key]) {
        roleMap[key] = {
          role_code: key,
          role_category: row.role_category,
          headcount: 0,
          total_effective_hours: 0,
          total_production_hours: 0,
          total_monthly_cost: 0,
          users: [],
        };
      }
      roleMap[key].headcount += 1;
      roleMap[key].total_effective_hours += Number(row.effective_hours ?? 0);
      roleMap[key].total_production_hours += Number(row.production_hours ?? 0);
      roleMap[key].total_monthly_cost += Number(row.monthly_cost ?? 0);
      roleMap[key].users.push(row);
    }

    const roles = Object.values(roleMap);
    return res.json({ roles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/capacity/by-user — Per-user capacity details
// ---------------------------------------------------------------------------
router.get("/api/capacity/by-user", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_current_capacity").select("*");
    if (org_id) query = query.eq("org_id", org_id);

    const { data: users, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ users: users ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/capacity/utilization — Actual vs target utilization
// ---------------------------------------------------------------------------
router.get("/api/capacity/utilization", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query as Record<string, string | undefined>;

    let query = supabase.from("v_capacity_utilization").select("*");
    if (org_id) query = query.eq("org_id", org_id);

    const { data: utilization, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ utilization: utilization ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/capacity/trends — Historical capacity snapshots
// ---------------------------------------------------------------------------
router.get("/api/capacity/trends", async (req: Request, res: Response) => {
  try {
    const { org_id, period, snapshot_type: sType } = req.query as Record<
      string,
      string | undefined
    >;

    let query = supabase
      .from("capacity_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id);
    if (sType) query = query.eq("snapshot_type", sType);

    // Apply period filter
    if (period) {
      const now = new Date();
      let from: Date;
      if (period === "30d") {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (period === "90d") {
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (period === "12m") {
        from = new Date(now);
        from.setFullYear(from.getFullYear() - 1);
      } else {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      query = query.gte("snapshot_date", from.toISOString().split("T")[0]);
    }

    const { data: snapshots, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ snapshots: snapshots ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/time-entries — Log a time entry
// ---------------------------------------------------------------------------
router.post("/api/time-entries", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      org_id,
      entry_date,
      hours,
      category,
      subcategory,
      task_id,
      deal_id,
      process_id,
      description,
      is_billable,
      bill_rate,
    } = req.body;

    if (!org_id || !entry_date || !hours || !category) {
      return res
        .status(400)
        .json({ error: "org_id, entry_date, hours, and category are required" });
    }

    const billedAmount =
      is_billable && bill_rate ? Number(hours) * Number(bill_rate) : null;

    const { data: entry, error } = await supabase
      .from("time_entries")
      .insert({
        org_id,
        user_id: user.id,
        entry_date,
        hours,
        category,
        subcategory: subcategory ?? null,
        task_id: task_id ?? null,
        deal_id: deal_id ?? null,
        process_id: process_id ?? null,
        description: description ?? null,
        is_billable: is_billable ?? false,
        bill_rate: bill_rate ?? null,
        billed_amount: billedAmount,
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ time_entry: entry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/time-entries/my — My time entries for a period
// ---------------------------------------------------------------------------
router.get("/api/time-entries/my", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { org_id, date_from, date_to } = req.query as Record<
      string,
      string | undefined
    >;

    let query = supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id);
    if (date_from) query = query.gte("entry_date", date_from);
    if (date_to) query = query.lte("entry_date", date_to);

    const { data: entries, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ entries: entries ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/time-entries/team — Team time entries (manager view)
// ---------------------------------------------------------------------------
router.get("/api/time-entries/team", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { org_id, date_from, date_to, user_id } = req.query as Record<
      string,
      string | undefined
    >;

    let query = supabase
      .from("time_entries")
      .select("*, profiles!time_entries_user_id_fkey(full_name, email)")
      .order("entry_date", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id);
    if (date_from) query = query.gte("entry_date", date_from);
    if (date_to) query = query.lte("entry_date", date_to);
    if (user_id) query = query.eq("user_id", user_id);

    const { data: entries, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ entries: entries ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/time-entries/:id/approve — Approve a time entry
// ---------------------------------------------------------------------------
router.patch(
  "/api/time-entries/:id/approve",
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;

      const { data: entry, error } = await supabase
        .from("time_entries")
        .update({
          approved: true,
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      return res.json({ time_entry: entry });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/capacity/simulate — Run a what-if simulation
// ---------------------------------------------------------------------------
router.post("/api/capacity/simulate", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { title, description, org_id, changes } = req.body as SimulationBody;

    if (!title || !org_id || !changes || changes.length === 0) {
      return res
        .status(400)
        .json({ error: "title, org_id, and changes are required" });
    }

    // Fetch current capacity summary
    const { data: summaryRows, error: summaryErr } = await supabase
      .from("v_org_capacity_summary")
      .select("*")
      .eq("org_id", org_id)
      .single();

    if (summaryErr) {
      return res.status(500).json({ error: summaryErr.message });
    }

    const baseline = summaryRows ?? {
      headcount: 0,
      production_hours: 0,
      total_monthly_cost: 0,
      cost_per_production_hour: 0,
    };

    let simHeadcount = Number(baseline.headcount ?? 0);
    let simProductionHours = Number(baseline.production_hours ?? 0);
    let simCost = Number(baseline.total_monthly_cost ?? 0);
    const revenuePerProdHour = Number(baseline.cost_per_production_hour ?? 0);

    // Fetch role profiles for costing
    const { data: roleProfiles } = await supabase
      .from("role_capacity_profiles")
      .select("*")
      .eq("org_id", org_id);

    const roleMap: Record<string, any> = {};
    for (const rp of roleProfiles ?? []) {
      roleMap[rp.role_code] = rp;
    }

    // Apply each change
    for (const change of changes) {
      const count = change.count ?? 1;
      const role = change.role ? roleMap[change.role] : null;

      switch (change.type) {
        case "ADD_ROLE": {
          const costPerHour =
            change.cost_per_hour ?? role?.default_cost_per_hour ?? 50;
          const prodPct =
            change.production_pct ?? role?.production_pct ?? 60;
          const hoursPerMonth = role?.default_hours_per_month ?? 160;

          simHeadcount += count;
          simProductionHours += count * hoursPerMonth * (prodPct / 100);
          simCost += count * hoursPerMonth * costPerHour;
          break;
        }
        case "REMOVE_ROLE": {
          const costPerHour =
            change.cost_per_hour ?? role?.default_cost_per_hour ?? 50;
          const prodPct =
            change.production_pct ?? role?.production_pct ?? 60;
          const hoursPerMonth = role?.default_hours_per_month ?? 160;

          simHeadcount -= count;
          simProductionHours -= count * hoursPerMonth * (prodPct / 100);
          simCost -= count * hoursPerMonth * costPerHour;
          break;
        }
        case "CHANGE_MIX": {
          if (change.production_pct != null && role) {
            const hoursPerMonth = role.default_hours_per_month ?? 160;
            const oldProdHours =
              count * hoursPerMonth * (Number(role.production_pct) / 100);
            const newProdHours =
              count * hoursPerMonth * (change.production_pct / 100);
            simProductionHours += newProdHours - oldProdHours;
          }
          break;
        }
        case "CHANGE_HOURS": {
          if (change.production_pct != null) {
            // Recalculate with new hours mix for all matching headcount
            const oldProd = Number(baseline.production_hours ?? 0);
            const newProd = oldProd * (change.production_pct / 100) * count;
            simProductionHours += newProd - oldProd * count;
          }
          break;
        }
      }
    }

    // Ensure non-negative
    simHeadcount = Math.max(simHeadcount, 0);
    simProductionHours = Math.max(simProductionHours, 0);
    simCost = Math.max(simCost, 0);

    const costPerProductiveHour =
      simProductionHours > 0
        ? Math.round((simCost / simProductionHours) * 100) / 100
        : 0;

    const revenueImpact =
      revenuePerProdHour > 0
        ? (simProductionHours - Number(baseline.production_hours ?? 0)) *
          revenuePerProdHour
        : null;

    const costDelta = simCost - Number(baseline.total_monthly_cost ?? 0);
    const marginImpact =
      revenueImpact != null ? revenueImpact - costDelta : null;

    const paybackMonths =
      costDelta > 0 && revenueImpact != null && revenueImpact > 0
        ? Math.ceil(costDelta / revenueImpact)
        : null;

    const scenarios = changes.map((c) => ({
      ...c,
      result: {
        headcount: simHeadcount,
        production_hours: Math.round(simProductionHours * 100) / 100,
        total_cost: Math.round(simCost * 100) / 100,
        cost_per_productive_hour: costPerProductiveHour,
        revenue_impact: revenueImpact
          ? Math.round(revenueImpact * 100) / 100
          : null,
        margin_impact: marginImpact
          ? Math.round(marginImpact * 100) / 100
          : null,
        payback_months: paybackMonths,
      },
    }));

    // Save simulation
    const { data: simulation, error: simErr } = await supabase
      .from("capacity_simulations")
      .insert({
        org_id,
        title,
        description: description ?? null,
        status: "CALCULATED",
        created_by: user.id,
        baseline_headcount: Number(baseline.headcount ?? 0),
        baseline_production_hours: Number(baseline.production_hours ?? 0),
        baseline_cost: Number(baseline.total_monthly_cost ?? 0),
        baseline_revenue: null,
        scenarios,
      })
      .select("*")
      .single();

    if (simErr) {
      return res.status(500).json({ error: simErr.message });
    }

    return res.status(201).json({ simulation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/capacity/simulate/attrition/:userId — What if someone leaves?
// ---------------------------------------------------------------------------
router.post(
  "/api/capacity/simulate/attrition/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { org_id } = req.body as { org_id: string };

      if (!org_id) {
        return res.status(400).json({ error: "org_id is required" });
      }

      // Fetch user capacity
      const { data: uc, error: ucErr } = await supabase
        .from("v_current_capacity")
        .select("*")
        .eq("user_id", userId)
        .eq("org_id", org_id)
        .single();

      if (ucErr || !uc) {
        return res
          .status(404)
          .json({ error: "User capacity record not found" });
      }

      // Fetch capabilities where user has L4+
      const { data: capabilities } = await supabase
        .from("capability_assessments")
        .select("*, capabilities(name)")
        .eq("user_id", userId)
        .in("level", ["L4", "L5"]);

      // Check for all assessments at L4+ to find unique capabilities
      const capIds = (capabilities ?? []).map((c: any) => c.capability_id);
      let lostCapabilities: any[] = [];

      if (capIds.length > 0) {
        // Find capabilities where this user is the only one at L4+
        const { data: otherExperts } = await supabase
          .from("capability_assessments")
          .select("capability_id, user_id")
          .in("capability_id", capIds)
          .in("level", ["L4", "L5"])
          .neq("user_id", userId);

        const coveredCaps = new Set(
          (otherExperts ?? []).map((e: any) => e.capability_id)
        );
        lostCapabilities = (capabilities ?? []).filter(
          (c: any) => !coveredCaps.has(c.capability_id)
        );
      }

      // Check deputy assignments
      const { data: deputies } = await supabase
        .from("deputy_assignments")
        .select("*")
        .eq("primary_user_id", userId)
        .eq("status", "ACTIVE");

      const hasDeputy = (deputies ?? []).length > 0;

      // Calculate impact
      const lostProductionHours = Number(uc.production_hours ?? 0);
      const estimatedReplacementMonths =
        lostCapabilities.length > 2 ? 6 : lostCapabilities.length > 0 ? 4 : 3;

      const impact = {
        user: {
          id: uc.user_id,
          name: uc.full_name,
          role_code: uc.role_code,
          job_title: uc.job_title,
        },
        lost_production_hours: lostProductionHours,
        lost_monthly_cost: Number(uc.monthly_cost ?? 0),
        lost_capabilities: lostCapabilities.map((c: any) => ({
          capability_id: c.capability_id,
          capability_name: c.capabilities?.name ?? c.capability_id,
          level: c.level,
          is_sole_expert: true,
        })),
        has_deputy: hasDeputy,
        deputy_count: (deputies ?? []).length,
        estimated_replacement_months: estimatedReplacementMonths,
        risk_level:
          lostCapabilities.length > 2 || !hasDeputy ? "HIGH" : "MEDIUM",
      };

      return res.json({ impact });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/capacity/simulate/ai-analyze — AI analysis placeholder
// ---------------------------------------------------------------------------
router.post(
  "/api/capacity/simulate/ai-analyze",
  async (req: Request, res: Response) => {
    try {
      const { org_id } = req.body as { org_id: string };

      if (!org_id) {
        return res.status(400).json({ error: "org_id is required" });
      }

      // Fetch current capacity data
      const { data: summary, error: sumErr } = await supabase
        .from("v_org_capacity_summary")
        .select("*")
        .eq("org_id", org_id)
        .single();

      if (sumErr) {
        return res.status(500).json({ error: sumErr.message });
      }

      const { data: utilization } = await supabase
        .from("v_capacity_utilization")
        .select("*")
        .eq("org_id", org_id);

      const { data: roles } = await supabase
        .from("role_capacity_profiles")
        .select("*")
        .eq("org_id", org_id);

      // Build structured analysis (Claude API integration prepared)
      const criticalUsers = (utilization ?? []).filter(
        (u: any) => u.utilization_status === "CRITICAL"
      );
      const belowTarget = (utilization ?? []).filter(
        (u: any) => u.utilization_status === "BELOW_TARGET"
      );

      const analysis = {
        generated_at: new Date().toISOString(),
        ai_model: "pending_integration",
        org_summary: summary,
        utilization_overview: {
          total_tracked: (utilization ?? []).length,
          on_target: (utilization ?? []).filter(
            (u: any) => u.utilization_status === "ON_TARGET"
          ).length,
          below_target: belowTarget.length,
          critical: criticalUsers.length,
          no_data: (utilization ?? []).filter(
            (u: any) => u.utilization_status === "NO_DATA"
          ).length,
        },
        role_distribution: (roles ?? []).map((r: any) => ({
          role_code: r.role_code,
          category: r.role_category,
          production_pct: r.production_pct,
          is_billable: r.is_billable,
        })),
        flags: [
          ...(criticalUsers.length > 0
            ? [
                {
                  severity: "HIGH",
                  message: `${criticalUsers.length} user(s) at CRITICAL utilization`,
                  users: criticalUsers.map((u: any) => u.full_name),
                },
              ]
            : []),
          ...(belowTarget.length > 0
            ? [
                {
                  severity: "MEDIUM",
                  message: `${belowTarget.length} user(s) BELOW_TARGET utilization`,
                  users: belowTarget.map((u: any) => u.full_name),
                },
              ]
            : []),
          ...(Number(summary?.production_pct ?? 0) < 50
            ? [
                {
                  severity: "HIGH",
                  message: `Org production percentage (${summary?.production_pct}%) is below 50% threshold`,
                },
              ]
            : []),
        ],
        recommendations: [
          "Review users with CRITICAL utilization status for workload rebalancing",
          "Consider capacity simulation for planned hiring/attrition scenarios",
          "Set up weekly automated snapshots to track capacity trends",
        ],
        _note:
          "This is a structured summary. Claude API integration will provide deeper analysis when enabled.",
      };

      return res.json({ analysis });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/capacity/simulations — List saved simulations
// ---------------------------------------------------------------------------
router.get("/api/capacity/simulations", async (req: Request, res: Response) => {
  try {
    const { org_id, status } = req.query as Record<string, string | undefined>;

    let query = supabase
      .from("capacity_simulations")
      .select("*")
      .order("created_at", { ascending: false });

    if (org_id) query = query.eq("org_id", org_id);
    if (status) query = query.eq("status", status);

    const { data: simulations, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ simulations: simulations ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/capacity/simulations/:id — Simulation detail
// ---------------------------------------------------------------------------
router.get(
  "/api/capacity/simulations/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data: simulation, error } = await supabase
        .from("capacity_simulations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!simulation) {
        return res.status(404).json({ error: "Simulation not found" });
      }

      return res.json({ simulation });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/capacity/workforce-plan — Generate a workforce plan
// ---------------------------------------------------------------------------
router.post(
  "/api/capacity/workforce-plan",
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { org_id, title, goal_ids, period_start, period_end } =
        req.body as WorkforcePlanBody;

      if (!org_id || !period_start || !period_end) {
        return res
          .status(400)
          .json({ error: "org_id, period_start, and period_end are required" });
      }

      // Fetch goals if provided
      let goals: any[] = [];
      if (goal_ids && goal_ids.length > 0) {
        const { data: goalData } = await supabase
          .from("organizational_goals")
          .select("*")
          .in("id", goal_ids);
        goals = goalData ?? [];
      }

      // Fetch current capacity
      const { data: currentCap } = await supabase
        .from("v_org_capacity_summary")
        .select("*")
        .eq("org_id", org_id)
        .single();

      // Fetch role profiles
      const { data: roleProfiles } = await supabase
        .from("role_capacity_profiles")
        .select("*")
        .eq("org_id", org_id);

      // Build current capacity breakdown
      const currentCapacity = (roleProfiles ?? []).map((rp: any) => ({
        role_code: rp.role_code,
        role_category: rp.role_category,
        production_pct: rp.production_pct,
        default_hours_per_month: rp.default_hours_per_month,
        default_cost_per_hour: rp.default_cost_per_hour,
      }));

      // Build required capacity from goals
      const requiredCapacity = goals.map((g: any) => ({
        goal_id: g.id,
        goal_title: g.title,
        required_capabilities: g.required_capabilities ?? [],
      }));

      // Calculate gap (simplified)
      const gap = goals.map((g: any) => ({
        goal_id: g.id,
        goal_title: g.title,
        status: "NEEDS_ASSESSMENT",
        notes:
          "Detailed gap analysis requires capability assessment data cross-reference",
      }));

      // Estimate cost
      const avgCostPerHour =
        Number(currentCap?.cost_per_production_hour ?? 50);
      const monthsDiff =
        (new Date(period_end).getTime() - new Date(period_start).getTime()) /
        (30 * 24 * 60 * 60 * 1000);
      const estimatedCost =
        goals.length * avgCostPerHour * 160 * Math.max(monthsDiff, 1);

      const { data: plan, error: planErr } = await supabase
        .from("workforce_plans")
        .insert({
          org_id,
          title: title ?? `Workforce Plan ${period_start} to ${period_end}`,
          period_start,
          period_end,
          status: "DRAFT",
          required_capacity: requiredCapacity,
          current_capacity: currentCapacity,
          gap,
          estimated_cost: Math.round(estimatedCost * 100) / 100,
          cost_currency: "EUR",
          goal_ids: goal_ids ?? [],
        })
        .select("*")
        .single();

      if (planErr) {
        return res.status(500).json({ error: planErr.message });
      }

      return res.status(201).json({ plan });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/capacity/workforce-plan/current — Active workforce plan
// ---------------------------------------------------------------------------
router.get(
  "/api/capacity/workforce-plan/current",
  async (req: Request, res: Response) => {
    try {
      const { org_id } = req.query as Record<string, string | undefined>;

      let query = supabase
        .from("workforce_plans")
        .select("*")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1);

      if (org_id) query = query.eq("org_id", org_id);

      const { data: plans, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const plan = plans && plans.length > 0 ? plans[0] : null;
      return res.json({ plan });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/capacity/workforce-plan/:id — Update or approve a plan
// ---------------------------------------------------------------------------
router.patch(
  "/api/capacity/workforce-plan/:id",
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const updates: Record<string, any> = {};

      const allowedFields = [
        "title",
        "status",
        "required_capacity",
        "current_capacity",
        "gap",
        "estimated_cost",
        "approved_budget",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // If approving, set approved_by and approved_at
      if (updates.status === "APPROVED") {
        updates.approved_by = user.id;
        updates.approved_at = new Date().toISOString();
      }

      updates.updated_at = new Date().toISOString();

      const { data: plan, error } = await supabase
        .from("workforce_plans")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!plan) {
        return res.status(404).json({ error: "Workforce plan not found" });
      }

      return res.json({ plan });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/capacity/workforce-plan/:id/gap — Gap analysis for a plan
// ---------------------------------------------------------------------------
router.get(
  "/api/capacity/workforce-plan/:id/gap",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data: plan, error } = await supabase
        .from("workforce_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!plan) {
        return res.status(404).json({ error: "Workforce plan not found" });
      }

      // Fetch current live capacity for comparison
      const { data: currentSummary } = await supabase
        .from("v_org_capacity_summary")
        .select("*")
        .eq("org_id", plan.org_id)
        .single();

      const { data: currentUsers } = await supabase
        .from("v_current_capacity")
        .select("*")
        .eq("org_id", plan.org_id);

      // Build gap analysis
      const gapAnalysis = {
        plan_id: plan.id,
        plan_title: plan.title,
        period: { start: plan.period_start, end: plan.period_end },
        stored_gap: plan.gap,
        current_vs_plan: {
          current_headcount: Number(currentSummary?.headcount ?? 0),
          current_fte: Number(currentSummary?.fte ?? 0),
          current_production_hours: Number(
            currentSummary?.production_hours ?? 0
          ),
          current_monthly_cost: Number(
            currentSummary?.total_monthly_cost ?? 0
          ),
          estimated_cost: Number(plan.estimated_cost ?? 0),
          approved_budget: Number(plan.approved_budget ?? 0),
          budget_variance:
            plan.approved_budget != null
              ? Number(plan.approved_budget) - Number(plan.estimated_cost ?? 0)
              : null,
        },
        role_coverage: (plan.current_capacity ?? []).map((rc: any) => ({
          role_code: rc.role_code,
          current_count: (currentUsers ?? []).filter(
            (u: any) => u.role_code === rc.role_code
          ).length,
        })),
        goal_alignment: (plan.required_capacity ?? []).map((rc: any) => ({
          goal_id: rc.goal_id,
          goal_title: rc.goal_title,
          required_capabilities: rc.required_capabilities ?? [],
          status: "REQUIRES_DETAILED_ASSESSMENT",
        })),
      };

      return res.json({ gap: gapAnalysis });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
