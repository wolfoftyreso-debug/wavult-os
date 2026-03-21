import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. NC Escalation — Mån-Fre 09:00
// ---------------------------------------------------------------------------
export const ncEscalation = schedules.task({
  id: "process-nc-escalation",
  cron: "0 9 * * 1-5",
  run: async () => {
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: openNCs, error } = await supabase
      .from("non_conformances")
      .select("id, title, severity, owner_id, created_at, due_date, escalation_level")
      .eq("status", "open")
      .lt("due_date", now.toISOString());

    if (error) throw new Error(`ncEscalation: ${error.message}`);

    const escalated: string[] = [];

    for (const nc of openNCs ?? []) {
      const newLevel = (nc.escalation_level ?? 0) + 1;

      await supabase
        .from("non_conformances")
        .update({ escalation_level: newLevel, last_escalated_at: now.toISOString() })
        .eq("id", nc.id);

      await supabase.from("notifications").insert({
        user_id: nc.owner_id,
        type: "nc_escalation",
        title: `Avvikelse eskalerad (nivå ${newLevel})`,
        body: `"${nc.title}" har passerat sin deadline och eskaleras.`,
        priority: newLevel >= 3 ? "critical" : "high",
        created_at: now.toISOString(),
      });

      escalated.push(nc.id);
    }

    return { escalated: escalated.length, ids: escalated };
  },
});

// ---------------------------------------------------------------------------
// 2. Document Review — Monday 08:00
// ---------------------------------------------------------------------------
export const documentReview = schedules.task({
  id: "process-document-review",
  cron: "0 8 * * 1",
  run: async () => {
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, title, owner_id, review_due_date, version")
      .lte("review_due_date", thirtyDaysAhead)
      .eq("status", "active");

    if (error) throw new Error(`documentReview: ${error.message}`);

    const flagged = (docs ?? []).map((doc) => ({
      document_id: doc.id,
      user_id: doc.owner_id,
      type: "document_review_due",
      title: `Dokumentgranskning: ${doc.title}`,
      body: `Version ${doc.version} behöver granskas senast ${doc.review_due_date}.`,
      created_at: new Date().toISOString(),
    }));

    if (flagged.length > 0) {
      await supabase.from("notifications").insert(flagged);
    }

    return { flagged: flagged.length };
  },
});

// ---------------------------------------------------------------------------
// 3. Compliance Report — 1st of every month
// ---------------------------------------------------------------------------
export const complianceReport = schedules.task({
  id: "process-compliance-report",
  cron: "0 7 1 * *",
  run: async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const { data: ncs } = await supabase
      .from("non_conformances")
      .select("id, status, severity, created_at, closed_at")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);

    const { data: audits } = await supabase
      .from("audits")
      .select("id, result, audit_date")
      .gte("audit_date", monthStart)
      .lte("audit_date", monthEnd);

    const { data: docs } = await supabase
      .from("documents")
      .select("id, status, review_due_date")
      .lte("review_due_date", monthEnd)
      .eq("status", "active");

    const report = {
      period: `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`,
      nc_total: ncs?.length ?? 0,
      nc_closed: (ncs ?? []).filter((n) => n.status === "closed").length,
      nc_open: (ncs ?? []).filter((n) => n.status === "open").length,
      audits_performed: audits?.length ?? 0,
      audits_passed: (audits ?? []).filter((a) => a.result === "pass").length,
      docs_pending_review: docs?.length ?? 0,
      generated_at: now.toISOString(),
    };

    await supabase.from("compliance_reports").insert(report);

    return report;
  },
});

// ---------------------------------------------------------------------------
// 4. Risk Review — Quarterly (1st of Jan, Apr, Jul, Oct)
// ---------------------------------------------------------------------------
export const riskReview = schedules.task({
  id: "process-risk-review",
  cron: "0 8 1 1,4,7,10 *",
  run: async () => {
    const { data: risks, error } = await supabase
      .from("risks")
      .select("id, title, probability, impact, owner_id, mitigation_status, last_reviewed_at")
      .eq("status", "active");

    if (error) throw new Error(`riskReview: ${error.message}`);

    const reviewed = (risks ?? []).map((risk) => {
      const riskScore = (risk.probability ?? 1) * (risk.impact ?? 1);
      return {
        risk_id: risk.id,
        score: riskScore,
        level: riskScore >= 15 ? "critical" : riskScore >= 8 ? "high" : riskScore >= 4 ? "medium" : "low",
        mitigation_status: risk.mitigation_status,
        reviewed_at: new Date().toISOString(),
      };
    });

    if (reviewed.length > 0) {
      await supabase.from("risk_assessments").insert(reviewed);

      await supabase
        .from("risks")
        .update({ last_reviewed_at: new Date().toISOString() })
        .in("id", reviewed.map((r) => r.risk_id));
    }

    const critical = reviewed.filter((r) => r.level === "critical");
    if (critical.length > 0) {
      await supabase.from("notifications").insert({
        type: "risk_alert",
        title: "Kritiska risker identifierade",
        body: `${critical.length} risker har kritisk nivå och kräver omedelbar åtgärd.`,
        priority: "critical",
        created_at: new Date().toISOString(),
      });
    }

    return { total: reviewed.length, critical: critical.length };
  },
});

// ---------------------------------------------------------------------------
// 5. Improvement Pipeline — Bi-weekly (every other Monday)
// ---------------------------------------------------------------------------
export const improvementPipeline = schedules.task({
  id: "process-improvement-pipeline",
  cron: "0 9 * * 1",
  run: async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );

    // Only run on even weeks
    if (weekNumber % 2 !== 0) {
      return { skipped: true, reason: "Odd week — no review" };
    }

    const { data: improvements, error } = await supabase
      .from("improvements")
      .select("id, title, status, priority, owner_id, created_at, target_date");

    if (error) throw new Error(`improvementPipeline: ${error.message}`);

    const pipeline = {
      week: weekNumber,
      total: improvements?.length ?? 0,
      by_status: {
        backlog: (improvements ?? []).filter((i) => i.status === "backlog").length,
        in_progress: (improvements ?? []).filter((i) => i.status === "in_progress").length,
        completed: (improvements ?? []).filter((i) => i.status === "completed").length,
        blocked: (improvements ?? []).filter((i) => i.status === "blocked").length,
      },
      overdue: (improvements ?? []).filter(
        (i) => i.target_date && new Date(i.target_date) < now && i.status !== "completed"
      ).length,
      reviewed_at: now.toISOString(),
    };

    await supabase.from("improvement_snapshots").insert(pipeline);

    return pipeline;
  },
});

// ---------------------------------------------------------------------------
// 6. Process Health — Friday 15:00
// ---------------------------------------------------------------------------
export const processHealth = schedules.task({
  id: "process-health-summary",
  cron: "0 15 * * 5",
  run: async () => {
    const { data: ncs } = await supabase
      .from("non_conformances")
      .select("id, status, severity")
      .eq("status", "open");

    const { data: overdueActions } = await supabase
      .from("corrective_actions")
      .select("id")
      .eq("status", "open")
      .lt("due_date", new Date().toISOString());

    const { data: docsOverdue } = await supabase
      .from("documents")
      .select("id")
      .lt("review_due_date", new Date().toISOString())
      .eq("status", "active");

    const { data: risks } = await supabase
      .from("risks")
      .select("id, probability, impact")
      .eq("status", "active");

    const highRisks = (risks ?? []).filter(
      (r) => (r.probability ?? 1) * (r.impact ?? 1) >= 15
    );

    const healthScore = Math.max(
      0,
      100 -
        (ncs?.length ?? 0) * 5 -
        (overdueActions?.length ?? 0) * 10 -
        (docsOverdue?.length ?? 0) * 3 -
        highRisks.length * 15
    );

    const summary = {
      open_ncs: ncs?.length ?? 0,
      overdue_actions: overdueActions?.length ?? 0,
      docs_overdue: docsOverdue?.length ?? 0,
      high_risks: highRisks.length,
      health_score: healthScore,
      status: healthScore >= 80 ? "healthy" : healthScore >= 50 ? "attention" : "critical",
      generated_at: new Date().toISOString(),
    };

    await supabase.from("process_health_snapshots").insert(summary);

    return summary;
  },
});
