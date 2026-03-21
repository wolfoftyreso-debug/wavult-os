import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";
import { NCSeverity, NCStatus } from "./types";

// ---------------------------------------------------------------------------
// Audit Workspace — Read-only workspace for external ISO auditors
// ---------------------------------------------------------------------------
// Optimised for ISO certification / surveillance audits.
// All responses strip personal names (replaced with role codes), financial
// details, and strategic decisions.  Every request is logged to audit_log.
// ---------------------------------------------------------------------------

const router = Router();

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

/** Replace owner / user fields with role codes, stripping personal names. */
function anonymize(record: any): any {
  if (!record) return record;
  const copy = { ...record };
  // Strip name-bearing fields, keep role / function identifiers
  const nameFields = [
    "owner_name",
    "employee_name",
    "trainer_name",
    "lead_auditor_name",
    "detected_by_name",
    "assigned_to_name",
    "approved_by_name",
    "led_by_name",
    "created_by_name",
    "responsible_name",
  ];
  for (const f of nameFields) {
    if (f in copy) copy[f] = "[REDACTED]";
  }
  // Strip financial & strategic fields
  const sensitiveFields = [
    "financial_details",
    "budget",
    "cost",
    "revenue",
    "strategic_decisions",
    "strategy",
  ];
  for (const f of sensitiveFields) {
    if (f in copy) delete copy[f];
  }
  return copy;
}

function anonymizeList(records: any[]): any[] {
  return records.map(anonymize);
}

/** Insert an audit-log row for the workspace access (fire-and-forget). */
async function logAccess(
  userId: string,
  endpoint: string,
  params: Record<string, unknown> = {}
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "view",
    entity: "audit_workspace",
    entity_id: null,
    meta: { endpoint, params },
    created_at: new Date().toISOString(),
  });
}

// ===========================================================================
// Access-control middleware — applied to every route on this router
// ===========================================================================

router.use(async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  // 1. Must be authenticated
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 2. Must hold the EXTERNAL_AUDITOR role
  // The role may live on user_metadata, app_metadata, or a profiles table.
  // We check multiple locations for flexibility.
  const role =
    user.role ||
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    null;

  if (role !== "EXTERNAL_AUDITOR") {
    return res.status(403).json({ error: "Forbidden — EXTERNAL_AUDITOR role required" });
  }

  // 3. Session expiry guard (Supabase tokens carry exp; double-check here)
  if (user.exp && Date.now() / 1000 > user.exp) {
    return res.status(401).json({ error: "Session expired" });
  }

  // 4. Log the access
  await logAccess(user.id, req.path, {
    ...req.params,
    ...req.query as Record<string, unknown>,
  });

  next();
});

// ===========================================================================
// 1. GET /audit-workspace/overview
// ===========================================================================

router.get("/audit-workspace/overview", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const twelveMonthsAgoISO = twelveMonthsAgo.toISOString();

    const [
      standardsRes,
      auditsRes,
      ncRes,
      processesRes,
      improvementsRes,
      documentsRes,
    ] = await Promise.all([
      supabase.from("compliance_standards").select("*"),
      supabase
        .from("audits")
        .select("id, title, status, type, scheduled_date, findings")
        .order("scheduled_date", { ascending: false })
        .limit(20),
      supabase
        .from("non_conformances")
        .select("id, status, severity, created_at, closed_at"),
      supabase.from("processes").select("id", { count: "exact", head: true }),
      supabase
        .from("improvements")
        .select("id, status")
        .eq("status", "ACTIVE"),
      supabase
        .from("documents")
        .select("id, next_review_date")
        .not("next_review_date", "is", null)
        .lte("next_review_date", now.toISOString()),
    ]);

    // Compliance matrix per standard
    const complianceMatrix = [];
    for (const std of standardsRes.data || []) {
      const { data: reqs } = await supabase
        .from("compliance_requirements")
        .select("status")
        .eq("standard_id", std.id);

      const total = (reqs || []).length;
      const byStatus = countBy(reqs || [], "status");
      const met = (byStatus["OK"] || 0) + (byStatus["NA"] || 0);

      complianceMatrix.push({
        standard_id: std.id,
        standard_name: std.name,
        total_requirements: total,
        met,
        partial: byStatus["PARTIAL"] || 0,
        fail: byStatus["FAIL"] || 0,
        na: byStatus["NA"] || 0,
        completion_pct: total > 0 ? Math.round((met / total) * 100) : 0,
      });
    }

    // Latest internal audits
    const latestAudits = (auditsRes.data || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      type: a.type,
      scheduled_date: a.scheduled_date,
      findings_count: Array.isArray(a.findings) ? a.findings.length : 0,
    }));

    // NC history
    const allNcs = ncRes.data || [];
    const ncBySeverity = countBy(allNcs, "severity");
    const ncByStatus = countBy(allNcs, "status");

    // NC trend (last 12 months)
    const ncTrend: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      ncTrend[key] = 0;
    }
    for (const nc of allNcs) {
      if (nc.created_at >= twelveMonthsAgoISO) {
        const d = new Date(nc.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in ncTrend) ncTrend[key]++;
      }
    }

    return res.json({
      compliance_matrix: complianceMatrix,
      latest_audits: latestAudits,
      nc_history: {
        total: allNcs.length,
        by_severity: ncBySeverity,
        by_status: ncByStatus,
        trend_12m: ncTrend,
      },
      key_metrics: {
        total_processes: processesRes.count || 0,
        active_improvements: (improvementsRes.data || []).length,
        documents_review_due: (documentsRes.data || []).length,
      },
      generated_at: now.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 2. GET /audit-workspace/processes
// ===========================================================================

router.get("/audit-workspace/processes", async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [processesRes, executionsRes, ncRes, documentsRes, mappingsRes] =
      await Promise.all([
        supabase
          .from("processes")
          .select("id, name, category, owner_id, version, created_at, updated_at")
          .order("name"),
        supabase
          .from("process_executions")
          .select("process_id")
          .gte("started_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("non_conformances")
          .select("process_id"),
        supabase
          .from("documents")
          .select("id, process_id"),
        supabase
          .from("compliance_requirements")
          .select("id, process_ids"),
      ]);

    // Execution counts (30d)
    const execCounts: Record<string, number> = {};
    for (const e of executionsRes.data || []) {
      execCounts[e.process_id] = (execCounts[e.process_id] || 0) + 1;
    }

    // NC counts
    const ncCounts: Record<string, number> = {};
    for (const nc of ncRes.data || []) {
      if (nc.process_id) ncCounts[nc.process_id] = (ncCounts[nc.process_id] || 0) + 1;
    }

    // Document counts
    const docCounts: Record<string, number> = {};
    for (const doc of documentsRes.data || []) {
      if (doc.process_id) docCounts[doc.process_id] = (docCounts[doc.process_id] || 0) + 1;
    }

    // Compliance mapping counts
    const complianceCounts: Record<string, number> = {};
    for (const req of mappingsRes.data || []) {
      const pids = req.process_ids || [];
      if (Array.isArray(pids)) {
        for (const pid of pids) {
          complianceCounts[pid] = (complianceCounts[pid] || 0) + 1;
        }
      }
    }

    const register = (processesRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      owner_role: p.owner_id ? `ROLE:${p.owner_id.substring(0, 8)}` : null,
      category: p.category,
      version: p.version || "1.0",
      execution_count_30d: execCounts[p.id] || 0,
      nc_count: ncCounts[p.id] || 0,
      linked_documents_count: docCounts[p.id] || 0,
      compliance_mappings_count: complianceCounts[p.id] || 0,
    }));

    return res.json(register);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 3. GET /audit-workspace/processes/:id
// ===========================================================================

router.get("/audit-workspace/processes/:id", async (req: Request, res: Response) => {
  try {
    const processId = req.params.id;

    const [processRes, executionsRes, ncRes, documentsRes, complianceRes] =
      await Promise.all([
        supabase
          .from("processes")
          .select("*")
          .eq("id", processId)
          .single(),
        supabase
          .from("process_executions")
          .select("id, started_at, completed_at, status, current_step, total_steps")
          .eq("process_id", processId)
          .order("started_at", { ascending: false })
          .limit(50),
        supabase
          .from("non_conformances")
          .select("id, title, severity, status, created_at, closed_at")
          .eq("process_id", processId)
          .order("created_at", { ascending: false }),
        supabase
          .from("documents")
          .select("id, title, type, version, status")
          .eq("process_id", processId),
        supabase
          .from("compliance_requirements")
          .select("id, code, title, status, standard_id"),
      ]);

    if (processRes.error) {
      return res.status(404).json({ error: "Process not found" });
    }

    const process = anonymize(processRes.data);
    // Replace owner_id with role code
    if (process.owner_id) {
      process.owner_role = `ROLE:${process.owner_id.substring(0, 8)}`;
      delete process.owner_id;
    }

    // Execution history — compute durations
    const executions = (executionsRes.data || []).map((e: any) => {
      const duration =
        e.started_at && e.completed_at
          ? new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()
          : null;
      return {
        id: e.id,
        started_at: e.started_at,
        completed_at: e.completed_at,
        status: e.status,
        duration_ms: duration,
        current_step: e.current_step,
        total_steps: e.total_steps,
      };
    });

    // Filter compliance requirements that reference this process
    const linkedCompliance = (complianceRes.data || []).filter((r: any) => {
      const pids = r.process_ids;
      return Array.isArray(pids) && pids.includes(processId);
    });

    return res.json({
      process,
      executions,
      non_conformances: ncRes.data || [],
      documents: documentsRes.data || [],
      compliance_requirements: linkedCompliance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 4. GET /audit-workspace/non-conformances
// ===========================================================================

router.get("/audit-workspace/non-conformances", async (req: Request, res: Response) => {
  try {
    const { status, severity, process_id, date_from, date_to } = req.query;

    let query = supabase
      .from("non_conformances")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status as string);
    if (severity) query = query.eq("severity", severity as string);
    if (process_id) query = query.eq("process_id", process_id as string);
    if (date_from) query = query.gte("created_at", date_from as string);
    if (date_to) query = query.lte("created_at", date_to as string);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    const now = Date.now();

    // Build a set of process_ids that have had NCs before (for repeat flag)
    const processNCCounts: Record<string, number> = {};
    for (const nc of data || []) {
      if (nc.process_id) {
        processNCCounts[nc.process_id] = (processNCCounts[nc.process_id] || 0) + 1;
      }
    }

    const enriched = (data || []).map((nc: any) => {
      const raisedAt = nc.detected_at || nc.created_at;
      const closedAt = nc.closed_at;
      const daysOpen = closedAt
        ? Math.round(
            (new Date(closedAt).getTime() - new Date(raisedAt).getTime()) /
              86400000
          )
        : Math.round((now - new Date(raisedAt).getTime()) / 86400000);

      return {
        ...anonymize(nc),
        raised_at: raisedAt,
        days_open: daysOpen,
        repeat: nc.process_id
          ? (processNCCounts[nc.process_id] || 0) > 1
          : false,
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 5. GET /audit-workspace/improvements
// ===========================================================================

router.get("/audit-workspace/improvements", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("improvements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    const byPhase: Record<string, any[]> = {
      PLAN: [],
      DO: [],
      CHECK: [],
      ACT: [],
    };

    for (const imp of data || []) {
      const phase = imp.pdca_phase || "PLAN";
      const entry = {
        id: imp.id,
        title: imp.title,
        phase: imp.pdca_phase,
        impact: imp.impact || null,
        effort: imp.effort || null,
        linked_nc_id: imp.nc_id || null,
        status: imp.status,
        target_date: imp.target_date || null,
        created_at: imp.created_at,
        completed_at: imp.completed_at || null,
      };
      if (byPhase[phase]) {
        byPhase[phase].push(entry);
      } else {
        byPhase[phase] = [entry];
      }
    }

    return res.json({
      total: (data || []).length,
      by_phase: byPhase,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 6. GET /audit-workspace/documents
// ===========================================================================

router.get("/audit-workspace/documents", async (req: Request, res: Response) => {
  try {
    const { type, status, review_due } = req.query;
    const now = new Date().toISOString();

    let query = supabase
      .from("documents")
      .select(
        "id, title, type, version, current_version, status, owner_id, review_interval_days, next_review_date, updated_at, created_at"
      )
      .order("title");

    if (type) query = query.eq("type", type as string);
    if (status) query = query.eq("status", status as string);
    if (review_due === "true") {
      query = query
        .not("next_review_date", "is", null)
        .lte("next_review_date", now);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    const register = (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      version: d.current_version || d.version,
      status: d.status,
      owner_role: d.owner_id ? `ROLE:${d.owner_id.substring(0, 8)}` : null,
      review_interval_days: d.review_interval_days,
      next_review_date: d.next_review_date,
      last_reviewed: d.updated_at,
    }));

    return res.json(register);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 7. GET /audit-workspace/documents/:id
// ===========================================================================

router.get("/audit-workspace/documents/:id", async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;

    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const sanitized = anonymize(doc);
    // Replace owner with role code
    if (sanitized.owner_id) {
      sanitized.owner_role = `ROLE:${sanitized.owner_id.substring(0, 8)}`;
      delete sanitized.owner_id;
    }

    // Strip document content (auditors see metadata, not full content)
    delete sanitized.content;

    // Version history — anonymize author names
    const versionHistory = (sanitized.version_history || []).map((v: any) => ({
      version: v.version,
      created_at: v.created_at,
      change_notes: v.change_notes || null,
      created_by_role: v.created_by
        ? `ROLE:${v.created_by.substring(0, 8)}`
        : null,
    }));

    // Linked compliance requirements
    const { data: compReqs } = await supabase
      .from("compliance_requirements")
      .select("id, code, title, status, standard_id");

    const linkedCompliance = (compReqs || []).filter((r: any) => {
      const docIds = r.document_ids;
      return Array.isArray(docIds) && docIds.includes(docId);
    });

    // Linked processes (via process_id on document)
    let linkedProcess = null;
    if (doc.process_id) {
      const { data: proc } = await supabase
        .from("processes")
        .select("id, name, category")
        .eq("id", doc.process_id)
        .single();
      linkedProcess = proc;
    }

    return res.json({
      document: sanitized,
      version_history: versionHistory,
      linked_process: linkedProcess,
      compliance_requirements: linkedCompliance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 8. GET /audit-workspace/compliance/:standardId
// ===========================================================================

router.get(
  "/audit-workspace/compliance/:standardId",
  async (req: Request, res: Response) => {
    try {
      const standardId = req.params.standardId;

      const [standardRes, reqsRes] = await Promise.all([
        supabase
          .from("compliance_standards")
          .select("*")
          .eq("id", standardId)
          .single(),
        supabase
          .from("compliance_requirements")
          .select("*")
          .eq("standard_id", standardId)
          .order("code"),
      ]);

      if (standardRes.error) {
        return res.status(404).json({ error: "Standard not found" });
      }

      const requirements = (reqsRes.data || []).map((r: any) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        status: r.status,
        evidence: r.evidence || null,
        notes: r.notes || null,
        linked_process_ids: r.process_ids || [],
        linked_document_ids: r.document_ids || [],
        reviewed_at: r.reviewed_at || null,
      }));

      const total = requirements.length;
      const met = requirements.filter(
        (r: any) => r.status === "OK"
      ).length;
      const partial = requirements.filter(
        (r: any) => r.status === "PARTIAL"
      ).length;
      const fail = requirements.filter(
        (r: any) => r.status === "FAIL"
      ).length;
      const na = requirements.filter(
        (r: any) => r.status === "NA"
      ).length;

      return res.json({
        standard: standardRes.data,
        requirements,
        summary: {
          total,
          met,
          partial,
          fail,
          na,
          completion_pct:
            total > 0 ? Math.round(((met + na) / total) * 100) : 0,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ===========================================================================
// 9. GET /audit-workspace/training
// ===========================================================================

router.get("/audit-workspace/training", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("training_records")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Group by capability / domain (we use `title` as the capability proxy)
    const byDomain: Record<string, any[]> = {};

    for (const tr of data || []) {
      const domain = tr.domain || tr.capability || tr.title || "General";
      if (!byDomain[domain]) byDomain[domain] = [];

      byDomain[domain].push({
        id: tr.id,
        role: tr.employee_id
          ? `ROLE:${tr.employee_id.substring(0, 8)}`
          : null,
        capability_level: tr.capability_level || null,
        training_type: tr.type,
        scheduled_date: tr.scheduled_date,
        completed_date: tr.completed_date || null,
        competency_verified: tr.status === "COMPLETED" || tr.status === "VERIFIED",
        status: tr.status,
      });
    }

    return res.json({
      total: (data || []).length,
      by_domain: byDomain,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 10. GET /audit-workspace/management-reviews
// ===========================================================================

router.get(
  "/audit-workspace/management-reviews",
  async (_req: Request, res: Response) => {
    try {
      const { data: reviews, error } = await supabase
        .from("management_reviews")
        .select("*")
        .order("review_date", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });

      const results = [];
      for (const review of reviews || []) {
        const [inputsRes, outputsRes] = await Promise.all([
          supabase
            .from("management_review_inputs")
            .select("input_type")
            .eq("review_id", review.id),
          supabase
            .from("management_review_outputs")
            .select("output_type, title, status")
            .eq("review_id", review.id),
        ]);

        // Input summary — just which types were assessed
        const inputTypes = (inputsRes.data || []).map(
          (i: any) => i.input_type
        );

        // Output summary — decisions made (no financial or strategic detail)
        const outputs = (outputsRes.data || [])
          .filter(
            (o: any) =>
              o.output_type !== "FINANCIAL" && o.output_type !== "STRATEGIC"
          )
          .map((o: any) => ({
            output_type: o.output_type,
            title: o.title,
            status: o.status,
          }));

        results.push({
          id: review.id,
          review_date: review.review_date,
          period_from: review.period_from,
          period_to: review.period_to,
          status: review.status,
          inputs_assessed: inputTypes,
          outputs_summary: outputs,
        });
      }

      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ===========================================================================
// 11. GET /audit-workspace/risks
// ===========================================================================

router.get("/audit-workspace/risks", async (_req: Request, res: Response) => {
  try {
    const { data: risks, error } = await supabase
      .from("risks")
      .select(
        "id, title, category, probability, impact, score, level, mitigation_plan, status, created_at, updated_at"
      )
      .order("score", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Build 5x5 matrix summary
    const matrix: number[][] = Array.from({ length: 5 }, () =>
      Array(5).fill(0)
    );
    for (const risk of risks || []) {
      const p = Math.min(5, Math.max(1, risk.probability)) - 1;
      const i = Math.min(5, Math.max(1, risk.impact)) - 1;
      matrix[p][i]++;
    }

    return res.json({
      risks: (risks || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        probability: r.probability,
        impact: r.impact,
        score: r.score,
        level: r.level,
        mitigation: r.mitigation_plan,
        status: r.status,
      })),
      matrix_summary: {
        matrix,
        axes: { probability: [1, 2, 3, 4, 5], impact: [1, 2, 3, 4, 5] },
      },
      total: (risks || []).length,
      by_level: countBy(risks || [], "level"),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 12. GET /audit-workspace/kpis
// ===========================================================================

router.get("/audit-workspace/kpis", async (_req: Request, res: Response) => {
  try {
    const { data: goals, error } = await supabase
      .from("goals")
      .select(
        "id, title, target_value, current_value, status, review_frequency, measurement_method, level, created_at, updated_at"
      )
      .order("title");

    if (error) return res.status(400).json({ error: error.message });

    // Fetch KPI history if a kpi_history table exists; fall back gracefully
    const { data: kpiHistory } = await supabase
      .from("kpi_history")
      .select("goal_id, value, recorded_at")
      .order("recorded_at", { ascending: true });

    const historyByGoal: Record<string, any[]> = {};
    for (const h of kpiHistory || []) {
      if (!historyByGoal[h.goal_id]) historyByGoal[h.goal_id] = [];
      historyByGoal[h.goal_id].push({
        value: h.value,
        recorded_at: h.recorded_at,
      });
    }

    const kpis = (goals || []).map((g: any) => {
      const history = historyByGoal[g.id] || [];
      let trend: string | null = null;
      if (history.length >= 2) {
        const recent = history[history.length - 1].value;
        const previous = history[history.length - 2].value;
        trend = recent > previous ? "UP" : recent < previous ? "DOWN" : "STABLE";
      }

      return {
        id: g.id,
        title: g.title,
        target_value: g.target_value,
        current_value: g.current_value,
        status: g.status,
        trend,
        history_12m: history.slice(-12),
      };
    });

    return res.json(kpis);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 13. GET /audit-workspace/findings
// ===========================================================================

router.get("/audit-workspace/findings", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { severity, clause } = req.query;

    let query = supabase
      .from("audit_findings")
      .select("*")
      .eq("auditor_id", user.id)
      .order("created_at", { ascending: false });

    if (severity) query = query.eq("severity", severity as string);
    if (clause) query = query.eq("clause", clause as string);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// 14. POST /audit-workspace/findings
// ===========================================================================

router.post("/audit-workspace/findings", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { severity, clause, title, description, process_id, evidence } =
      req.body;

    if (!severity || !clause || !title || !description) {
      return res.status(400).json({
        error: "Missing required fields: severity, clause, title, description",
      });
    }

    const validSeverities: NCSeverity[] = [
      "OBSERVATION",
      "MINOR",
      "MAJOR",
      "CRITICAL",
    ];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}`,
      });
    }

    const now = new Date().toISOString();

    // Create the finding
    const { data: finding, error: findingErr } = await supabase
      .from("audit_findings")
      .insert({
        auditor_id: user.id,
        severity,
        clause,
        title,
        description,
        process_id: process_id || null,
        evidence: evidence || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (findingErr) return res.status(400).json({ error: findingErr.message });

    // Auto-create NC for MAJOR or CRITICAL findings
    let linkedNcId: string | null = null;
    if (severity === "MAJOR" || severity === "CRITICAL") {
      const { data: nc, error: ncErr } = await supabase
        .from("non_conformances")
        .insert({
          title: `[Audit Finding] ${title}`,
          description,
          severity,
          status: "OPEN" as NCStatus,
          process_id: process_id || null,
          detected_by: user.id,
          detected_at: now,
          evidence: evidence || null,
          source: "EXTERNAL_AUDIT",
          audit_finding_id: finding.id,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (!ncErr && nc) {
        linkedNcId = nc.id;

        // Link NC back to the finding
        await supabase
          .from("audit_findings")
          .update({ linked_nc_id: linkedNcId, updated_at: now })
          .eq("id", finding.id);
      }
    }

    // Log to audit_log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create",
      entity: "audit_findings",
      entity_id: finding.id,
      meta: {
        severity,
        clause,
        title,
        linked_nc_id: linkedNcId,
        auto_nc_created: linkedNcId !== null,
      },
      created_at: now,
    });

    return res.status(201).json({
      ...finding,
      linked_nc_id: linkedNcId,
      auto_nc_created: linkedNcId !== null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
