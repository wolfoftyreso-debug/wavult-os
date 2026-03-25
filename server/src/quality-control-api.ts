// ---------------------------------------------------------------------------
// Quality Control API — Continuous Quality Intelligence
// Q-Check: rotating peer inspections, trend detection, RCA-driven action plans
// External body integration: DEKRA, TÜV, SGS, Swedac, Bureau Veritas, DNV
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const orgId = (req: Request): string => (req as any).user?.org_id;

// ---------------------------------------------------------------------------
// PROGRAMS
// ---------------------------------------------------------------------------

// GET /api/quality/programs
router.get("/api/quality/programs", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_programs")
      .select("*")
      .eq("org_id", orgId(req))
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/programs
router.post("/api/quality/programs", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_programs")
      .insert({ ...req.body, org_id: orgId(req) })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality/programs/:id
router.get("/api/quality/programs/:id", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_programs")
      .select("*")
      .eq("id", req.params.id)
      .eq("org_id", orgId(req))
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/quality/programs/:id
router.put("/api/quality/programs/:id", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_programs")
      .update(req.body)
      .eq("id", req.params.id)
      .eq("org_id", orgId(req))
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// CHECKS
// ---------------------------------------------------------------------------

// GET /api/quality/checks
router.get("/api/quality/checks", auth, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from("quality_checks")
      .select(`*, quality_programs(name, external_body, auto_submit_to_external)`)
      .eq("org_id", orgId(req))
      .order("assigned_at", { ascending: false });

    if (req.query.status) {
      const statuses = (req.query.status as string).split(",");
      query = query.in("status", statuses);
    }
    if (req.query.inspector_id) {
      query = query.eq("inspector_id", req.query.inspector_id as string);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with submission info
    const checkIds = (data || []).map((c: any) => c.id);
    let submissions: any[] = [];
    if (checkIds.length > 0) {
      const { data: subs } = await supabase
        .from("external_audit_submissions")
        .select("*")
        .in("quality_check_id", checkIds);
      submissions = subs || [];
    }

    const enriched = (data || []).map((c: any) => ({
      ...c,
      external_submissions: submissions.filter((s: any) => s.quality_check_id === c.id),
    }));

    res.json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/checks/assign — rotation engine
router.post("/api/quality/checks/assign", auth, async (req: Request, res: Response) => {
  try {
    const { program_id } = req.body;
    const oid = orgId(req);

    const { data: program } = await supabase
      .from("quality_programs")
      .select("*")
      .eq("id", program_id)
      .eq("org_id", oid)
      .single();

    if (!program) return res.status(404).json({ error: "Program not found" });

    // Get mechanics
    const { data: mechanics } = await supabase
      .from("technicians")
      .select("id, name")
      .eq("org_id", oid)
      .eq("is_active", true);

    if (!mechanics || mechanics.length < 2) {
      return res.status(400).json({ error: "Need at least 2 mechanics for peer review" });
    }

    // Find who hasn't inspected recently (simple round-robin awareness)
    const { data: recentChecks } = await supabase
      .from("quality_checks")
      .select("inspector_id")
      .eq("program_id", program_id)
      .eq("org_id", oid)
      .gte("assigned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("assigned_at", { ascending: false });

    const recentInspectors = new Set((recentChecks || []).map((c: any) => c.inspector_id));
    const candidates = mechanics.filter((m: any) => !recentInspectors.has(m.id));
    const inspectorPool = candidates.length > 0 ? candidates : mechanics;

    let inspector: any;
    let subject: any;

    if (program.rotation_mode === "RANDOM" || program.rotation_mode === "ROUND_ROBIN") {
      inspector = inspectorPool[Math.floor(Math.random() * inspectorPool.length)];
      const subjectPool = mechanics.filter((m: any) => m.id !== inspector.id);
      subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];
    } else {
      // FIXED_INSPECTOR: use requester as inspector, random subject
      inspector = mechanics[0];
      const subjectPool = mechanics.filter((m: any) => m.id !== inspector.id);
      subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);

    const { data: check, error } = await supabase
      .from("quality_checks")
      .insert({
        org_id: oid,
        program_id,
        inspector_id: inspector.id,
        inspector_name: inspector.name,
        subject_id: subject?.id,
        subject_name: subject?.name,
        due_date: dueDate.toISOString().split("T")[0],
        status: "ASSIGNED",
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      check_id: check.id,
      inspector: { id: inspector.id, name: inspector.name },
      subject: subject ? { id: subject.id, name: subject.name } : null,
      due_date: check.due_date,
      checklist: program.checklist,
      program: { name: program.name, external_body: program.external_body },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality/checks/:id
router.get("/api/quality/checks/:id", auth, async (req: Request, res: Response) => {
  try {
    const { data: check, error } = await supabase
      .from("quality_checks")
      .select(`*, quality_programs(*)`)
      .eq("id", req.params.id)
      .eq("org_id", orgId(req))
      .single();

    if (error) throw error;

    const { data: submissions } = await supabase
      .from("external_audit_submissions")
      .select("*")
      .eq("quality_check_id", req.params.id);

    res.json({ ...check, external_submissions: submissions || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/checks/:id/start
router.post("/api/quality/checks/:id/start", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_checks")
      .update({ status: "IN_PROGRESS", started_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("org_id", orgId(req))
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/checks/:id/submit
router.post("/api/quality/checks/:id/submit", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const { responses, findings, corrective_actions } = req.body;

    // Calculate score
    const applicable = responses.filter((r: any) => r.answer !== "NA");
    const passed = applicable.filter((r: any) => r.answer === "PASS");
    const failed = applicable.filter((r: any) => r.answer === "FAIL");
    const criticalFails = failed.filter((r: any) => r.critical_fail);
    const scorePct = applicable.length > 0
      ? Math.round((passed.length / applicable.length) * 100)
      : 100;

    // Determine PIX type
    let pixType = "quality_pass_pix";
    if (criticalFails.length > 0) pixType = "critical_fail_pix";
    else if (failed.length > 0) pixType = "quality_fail_pix";

    const { data: check, error } = await supabase
      .from("quality_checks")
      .update({
        status: "COMPLETED",
        responses,
        findings,
        corrective_actions,
        total_items: responses.length,
        passed_items: passed.length,
        failed_items: failed.length,
        critical_fails: criticalFails.length,
        score_pct: scorePct,
        pix_type: pixType,
        completed_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .eq("org_id", oid)
      .select(`*, quality_programs(*)`)
      .single();

    if (error) throw error;

    // Auto-create action plan on critical fail
    if (criticalFails.length > 0) {
      await supabase.from("quality_action_plans").insert({
        org_id: oid,
        trigger_type: "CRITICAL_FAIL",
        source_check_id: check.id,
        title: `Kritisk avvikelse — ${check.subject_name || "Process"}`,
        description: `${criticalFails.length} kritiska avvikelser i kontroll ${check.id.substring(0, 8)}`,
        actions: [],
        owner_id: check.inspector_id,
        owner_name: check.inspector_name,
        affected_mechanic_id: check.subject_id,
        affected_mechanic_name: check.subject_name,
      });
    }

    // Auto-submit to external body if configured
    const program = (check as any).quality_programs;
    if (program?.auto_submit_to_external && program?.external_body && program.external_body !== "INTERNAL") {
      await supabase.from("external_audit_submissions").insert({
        org_id: oid,
        quality_check_id: check.id,
        external_body: program.external_body,
        submission_method: "EMAIL",
        status: "SENT",
        external_ref: `AUTO-${Date.now()}`,
      });
    }

    res.json({
      check,
      score_pct: scorePct,
      pix_type: pixType,
      critical_fails: criticalFails.length,
      auto_submitted: program?.auto_submit_to_external && program?.external_body !== "INTERNAL",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// EXTERNAL AUDIT SUBMISSIONS
// ---------------------------------------------------------------------------

// POST /api/quality/checks/:id/submit-external
router.post("/api/quality/checks/:id/submit-external", auth, async (req: Request, res: Response) => {
  try {
    const { external_body, submission_method = "EMAIL" } = req.body;
    const oid = orgId(req);

    const { data, error } = await supabase
      .from("external_audit_submissions")
      .insert({
        org_id: oid,
        quality_check_id: req.params.id,
        external_body,
        submission_method,
        status: "SENT",
        external_ref: `${external_body}-${Date.now()}`,
      })
      .select()
      .single();

    if (error) throw error;

    // In production: trigger email/API call here
    // await sendExternalSubmissionEmail(data, program);

    res.json({ success: true, submission: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality/submissions
router.get("/api/quality/submissions", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("external_audit_submissions")
      .select("*")
      .eq("org_id", orgId(req))
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// TRENDS
// ---------------------------------------------------------------------------

// GET /api/quality/trends
router.get("/api/quality/trends", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_trends")
      .select("*")
      .eq("org_id", orgId(req))
      .is("acknowledged_at", null)
      .order("detected_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/trends/analyze — run trend detection
router.post("/api/quality/trends/analyze", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const newTrends = await detectQualityTrends(oid);
    res.json({ analyzed: true, new_trends: newTrends });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function detectQualityTrends(oid: string): Promise<any[]> {
  const windowDays = 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: checks } = await supabase
    .from("quality_checks")
    .select("*")
    .eq("org_id", oid)
    .eq("status", "COMPLETED")
    .gte("completed_at", since);

  if (!checks || checks.length === 0) return [];

  const newTrends: any[] = [];
  const FAIL_THRESHOLD = 40; // 40% fail rate triggers trend

  // 1. Mechanic performance decline
  const bySubject: Record<string, any[]> = {};
  for (const c of checks) {
    if (!c.subject_id) continue;
    if (!bySubject[c.subject_id]) bySubject[c.subject_id] = [];
    bySubject[c.subject_id].push(c);
  }

  for (const [subjectId, subChecks] of Object.entries(bySubject)) {
    if (subChecks.length < 3) continue;
    const failRate = Math.round(
      (subChecks.filter((c: any) => c.score_pct !== null && c.score_pct < 70).length / subChecks.length) * 100
    );
    if (failRate >= FAIL_THRESHOLD) {
      const direction = failRate >= 60 ? "CRITICAL" : "DECLINING";
      const { data: existing } = await supabase
        .from("quality_trends")
        .select("id")
        .eq("org_id", oid)
        .eq("trend_type", "MECHANIC_DECLINE")
        .eq("affected_entity_id", subjectId)
        .is("acknowledged_at", null)
        .single();

      if (!existing) {
        const { data: trend } = await supabase
          .from("quality_trends")
          .insert({
            org_id: oid,
            trend_type: "MECHANIC_DECLINE",
            affected_entity: subChecks[0].subject_name,
            affected_entity_id: subjectId,
            window_days: windowDays,
            sample_count: subChecks.length,
            fail_rate_pct: failRate,
            trend_direction: direction,
          })
          .select()
          .single();
        if (trend) newTrends.push(trend);
      }
    }
  }

  // 2. Process weakness (checklist category)
  const categoryFails: Record<string, { total: number; fails: number }> = {};
  for (const c of checks) {
    for (const r of (c.responses || [])) {
      const cat = r.category || "Unknown";
      if (!categoryFails[cat]) categoryFails[cat] = { total: 0, fails: 0 };
      categoryFails[cat].total++;
      if (r.answer === "FAIL") categoryFails[cat].fails++;
    }
  }
  for (const [cat, stats] of Object.entries(categoryFails)) {
    if (stats.total < 5) continue;
    const failRate = Math.round((stats.fails / stats.total) * 100);
    if (failRate >= FAIL_THRESHOLD) {
      const { data: existing } = await supabase
        .from("quality_trends")
        .select("id")
        .eq("org_id", oid)
        .eq("trend_type", "PROCESS_WEAKNESS")
        .eq("affected_entity", cat)
        .is("acknowledged_at", null)
        .single();

      if (!existing) {
        const { data: trend } = await supabase
          .from("quality_trends")
          .insert({
            org_id: oid,
            trend_type: "PROCESS_WEAKNESS",
            affected_entity: cat,
            window_days: windowDays,
            sample_count: stats.total,
            fail_rate_pct: failRate,
            trend_direction: failRate >= 60 ? "CRITICAL" : "DECLINING",
          })
          .select()
          .single();
        if (trend) newTrends.push(trend);
      }
    }
  }

  return newTrends;
}

// ---------------------------------------------------------------------------
// ACTION PLANS
// ---------------------------------------------------------------------------

// GET /api/quality/action-plans
router.get("/api/quality/action-plans", auth, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from("quality_action_plans")
      .select("*")
      .eq("org_id", orgId(req))
      .order("created_at", { ascending: false });

    if (req.query.status) {
      const statuses = (req.query.status as string).split(",");
      query = query.in("status", statuses);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/action-plans
router.post("/api/quality/action-plans", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_action_plans")
      .insert({ ...req.body, org_id: orgId(req) })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/quality/action-plans/:id
router.put("/api/quality/action-plans/:id", auth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("quality_action_plans")
      .update(req.body)
      .eq("id", req.params.id)
      .eq("org_id", orgId(req))
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/action-plans/:id/complete-action
router.post("/api/quality/action-plans/:id/complete-action", auth, async (req: Request, res: Response) => {
  try {
    const { action_id } = req.body;
    const oid = orgId(req);

    const { data: plan } = await supabase
      .from("quality_action_plans")
      .select("actions")
      .eq("id", req.params.id)
      .eq("org_id", oid)
      .single();

    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const actions = (plan.actions || []).map((a: any) =>
      a.id === action_id
        ? { ...a, status: "COMPLETED", completed_at: new Date().toISOString() }
        : a
    );

    const allDone = actions.every((a: any) => a.status === "COMPLETED");

    const { data, error } = await supabase
      .from("quality_action_plans")
      .update({
        actions,
        status: allDone ? "COMPLETED" : "IN_PROGRESS",
        completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq("id", req.params.id)
      .eq("org_id", oid)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality/action-plans/:id/verify
router.post("/api/quality/action-plans/:id/verify", auth, async (req: Request, res: Response) => {
  try {
    const { effectiveness_rating, verified_by } = req.body;

    const { data, error } = await supabase
      .from("quality_action_plans")
      .update({
        status: "VERIFIED",
        effectiveness_rating,
        verified_by,
        verification_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", req.params.id)
      .eq("org_id", orgId(req))
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------

// GET /api/quality/stats
router.get("/api/quality/stats", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const since = new Date();
    since.setDate(1);

    const { data: checks } = await supabase
      .from("quality_checks")
      .select("*")
      .eq("org_id", oid)
      .eq("status", "COMPLETED")
      .gte("completed_at", since.toISOString());

    const { data: openPlans } = await supabase
      .from("quality_action_plans")
      .select("id")
      .eq("org_id", oid)
      .in("status", ["OPEN", "IN_PROGRESS"]);

    const { data: trends } = await supabase
      .from("quality_trends")
      .select("*")
      .eq("org_id", oid)
      .is("acknowledged_at", null);

    const allChecks = checks || [];
    const avgScore = allChecks.length > 0
      ? Math.round(allChecks.reduce((s: number, c: any) => s + (c.score_pct || 0), 0) / allChecks.length)
      : 0;
    const failCount = allChecks.filter((c: any) => c.score_pct !== null && c.score_pct < 70).length;
    const failRate = allChecks.length > 0 ? Math.round((failCount / allChecks.length) * 100) : 0;

    // Mechanic scores
    const byMechanic: Record<string, { name: string; scores: number[]; id: string }> = {};
    for (const c of allChecks) {
      if (!c.subject_id) continue;
      if (!byMechanic[c.subject_id]) byMechanic[c.subject_id] = { name: c.subject_name, scores: [], id: c.subject_id };
      if (c.score_pct !== null) byMechanic[c.subject_id].scores.push(c.score_pct);
    }
    const mechanicScores = Object.values(byMechanic).map((m) => ({
      id: m.id,
      name: m.name,
      avg_score: m.scores.length > 0 ? Math.round(m.scores.reduce((a, b) => a + b, 0) / m.scores.length) : 0,
      check_count: m.scores.length,
      trend: m.scores.length >= 2
        ? m.scores[m.scores.length - 1] > m.scores[0] ? "IMPROVING" : m.scores[m.scores.length - 1] < m.scores[0] ? "DECLINING" : "STABLE"
        : "STABLE",
    })).sort((a, b) => b.avg_score - a.avg_score);

    // Top failing categories
    const catFails: Record<string, number> = {};
    for (const c of allChecks) {
      for (const r of (c.responses || [])) {
        if (r.answer === "FAIL") catFails[r.category || "Unknown"] = (catFails[r.category || "Unknown"] || 0) + 1;
      }
    }
    const topIssues = Object.entries(catFails)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => ({ category: cat, count }));

    res.json({
      overall_score_pct: avgScore,
      checks_this_month: allChecks.length,
      fail_rate: failRate,
      fail_count: failCount,
      open_action_plans: (openPlans || []).length,
      active_trends: (trends || []).length,
      mechanic_scores: mechanicScores,
      top_issues: topIssues,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
