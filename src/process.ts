import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import {
  NCSeverity,
  NCStatus,
  PDCAPhase,
  RiskLevel,
  RequirementStatus,
} from "./types";

const router = Router();

// ---------------------------------------------------------------------------
// Helper: determine risk level from probability × impact score
// ---------------------------------------------------------------------------
function getRiskLevel(score: number): RiskLevel {
  if (score >= 15) return "CRITICAL";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
}

// ===========================================================================
// PROCESS DEFINITIONS
// ===========================================================================

// POST /api/processes – Create a process definition
router.post("/api/processes", async (req: Request, res: Response) => {
  try {
    const { name, description, steps, owner_id, category } = req.body;

    const { data, error } = await supabase
      .from("processes")
      .insert({
        name,
        description,
        steps, // JSONB column
        owner_id,
        category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/processes – List all process definitions
router.get("/api/processes", async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    let query = supabase.from("processes").select("*").order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// PROCESS EXECUTION
// ===========================================================================

// POST /api/processes/:id/execute – Start a process execution
router.post("/api/processes/:id/execute", async (req: Request, res: Response) => {
  try {
    const processId = req.params.id;
    const { initiated_by, context } = req.body;

    // Fetch the process definition to get its steps
    const { data: processDef, error: fetchErr } = await supabase
      .from("processes")
      .select("*")
      .eq("id", processId)
      .single();

    if (fetchErr || !processDef) {
      return res.status(404).json({ error: "Process not found" });
    }

    const steps = processDef.steps || [];
    const { data, error } = await supabase
      .from("process_executions")
      .insert({
        process_id: processId,
        initiated_by,
        context,
        status: "IN_PROGRESS",
        current_step: 0,
        total_steps: steps.length,
        started_at: new Date().toISOString(),
        step_history: [],
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/process-executions/:id/step – Advance to next step
router.patch("/api/process-executions/:id/step", async (req: Request, res: Response) => {
  try {
    const executionId = req.params.id;
    const { completed_by, notes, nc_id } = req.body;

    const { data: execution, error: fetchErr } = await supabase
      .from("process_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (fetchErr || !execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    const nextStep = (execution.current_step ?? 0) + 1;
    const isComplete = nextStep >= execution.total_steps;

    const stepEntry = {
      step: execution.current_step,
      completed_by,
      completed_at: new Date().toISOString(),
      notes: notes || null,
      nc_id: nc_id || null,
    };

    const updatedHistory = [...(execution.step_history || []), stepEntry];

    const updatePayload: Record<string, any> = {
      current_step: nextStep,
      step_history: updatedHistory,
      updated_at: new Date().toISOString(),
    };

    if (isComplete) {
      updatePayload.status = "COMPLETED";
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("process_executions")
      .update(updatePayload)
      .eq("id", executionId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/processes/performance – Process performance metrics
router.get("/api/processes/performance", async (req: Request, res: Response) => {
  try {
    // Fetch all completed executions with their process info
    const { data: executions, error } = await supabase
      .from("process_executions")
      .select("process_id, started_at, completed_at, step_history")
      .eq("status", "COMPLETED");

    if (error) return res.status(400).json({ error: error.message });

    // Fetch NC counts per process
    const { data: ncs, error: ncErr } = await supabase
      .from("non_conformances")
      .select("process_id");

    if (ncErr) return res.status(400).json({ error: ncErr.message });

    // Fetch process names
    const { data: processes, error: procErr } = await supabase
      .from("processes")
      .select("id, name");

    if (procErr) return res.status(400).json({ error: procErr.message });

    const processMap = new Map(processes?.map((p: any) => [p.id, p.name]) || []);

    // Group executions by process_id
    const grouped: Record<string, number[]> = {};
    for (const exec of executions || []) {
      if (!exec.started_at || !exec.completed_at) continue;
      const duration =
        new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
      if (!grouped[exec.process_id]) grouped[exec.process_id] = [];
      grouped[exec.process_id].push(duration);
    }

    // Count NCs per process
    const ncCounts: Record<string, number> = {};
    for (const nc of ncs || []) {
      if (!nc.process_id) continue;
      ncCounts[nc.process_id] = (ncCounts[nc.process_id] || 0) + 1;
    }

    const metrics = Object.entries(grouped).map(([processId, durations]) => {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      return {
        process_id: processId,
        process_name: processMap.get(processId) || "Unknown",
        execution_count: durations.length,
        avg_duration_ms: Math.round(avgDuration),
        nc_count: ncCounts[processId] || 0,
      };
    });

    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// NON-CONFORMANCES
// ===========================================================================

// POST /api/nc – Create a non-conformance
router.post("/api/nc", async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      severity,
      process_id,
      detected_by,
      detected_at,
      evidence,
    } = req.body;

    const validSeverities: NCSeverity[] = ["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("non_conformances")
      .insert({
        title,
        description,
        severity: severity || "MINOR",
        status: "OPEN" as NCStatus,
        process_id,
        detected_by,
        detected_at: detected_at || new Date().toISOString(),
        evidence,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/nc – List non-conformances
router.get("/api/nc", async (req: Request, res: Response) => {
  try {
    const { status, severity, process_id } = req.query;

    let query = supabase
      .from("non_conformances")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (severity) query = query.eq("severity", severity);
    if (process_id) query = query.eq("process_id", process_id);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/nc/:id/status – Update NC status
router.patch("/api/nc/:id/status", async (req: Request, res: Response) => {
  try {
    const ncId = req.params.id;
    const { status, updated_by, notes } = req.body;

    const validStatuses: NCStatus[] = [
      "OPEN",
      "ANALYZING",
      "ACTION_PLANNED",
      "IMPLEMENTING",
      "VERIFYING",
      "CLOSED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(" → ")}`,
      });
    }

    // Fetch current NC to validate transition
    const { data: current, error: fetchErr } = await supabase
      .from("non_conformances")
      .select("status")
      .eq("id", ncId)
      .single();

    if (fetchErr || !current) {
      return res.status(404).json({ error: "Non-conformance not found" });
    }

    const currentIdx = validStatuses.indexOf(current.status as NCStatus);
    const targetIdx = validStatuses.indexOf(status);

    if (targetIdx < currentIdx) {
      return res.status(400).json({
        error: "Cannot move to a previous status",
      });
    }

    const updatePayload: Record<string, any> = {
      status,
      updated_by,
      notes,
      updated_at: new Date().toISOString(),
    };

    if (status === "CLOSED") {
      updatePayload.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("non_conformances")
      .update(updatePayload)
      .eq("id", ncId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/nc/summary – NC summary statistics
router.get("/api/nc/summary", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("non_conformances").select("status, severity");

    if (error) return res.status(400).json({ error: error.message });

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let openCount = 0;

    for (const nc of data || []) {
      byStatus[nc.status] = (byStatus[nc.status] || 0) + 1;
      bySeverity[nc.severity] = (bySeverity[nc.severity] || 0) + 1;
      if (nc.status !== "CLOSED") openCount++;
    }

    return res.json({
      total: (data || []).length,
      open: openCount,
      closed: byStatus["CLOSED"] || 0,
      by_status: byStatus,
      by_severity: bySeverity,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// IMPROVEMENTS (PDCA)
// ===========================================================================

// POST /api/improvements – Create an improvement
router.post("/api/improvements", async (req: Request, res: Response) => {
  try {
    const { title, description, nc_id, owner_id, target_date, category } = req.body;

    const { data, error } = await supabase
      .from("improvements")
      .insert({
        title,
        description,
        nc_id,
        owner_id,
        category,
        pdca_phase: "PLAN" as PDCAPhase,
        target_date,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/improvements – List improvements
router.get("/api/improvements", async (req: Request, res: Response) => {
  try {
    const { status, pdca_phase, owner_id } = req.query;

    let query = supabase
      .from("improvements")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (pdca_phase) query = query.eq("pdca_phase", pdca_phase);
    if (owner_id) query = query.eq("owner_id", owner_id);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/improvements/:id – Update improvement / advance PDCA phase
router.patch("/api/improvements/:id", async (req: Request, res: Response) => {
  try {
    const improvementId = req.params.id;
    const { pdca_phase, title, description, results, status } = req.body;

    const validPhases: PDCAPhase[] = ["PLAN", "DO", "CHECK", "ACT"];

    if (pdca_phase && !validPhases.includes(pdca_phase)) {
      return res.status(400).json({
        error: `Invalid PDCA phase. Must be one of: ${validPhases.join(", ")}`,
      });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (pdca_phase) updatePayload.pdca_phase = pdca_phase;
    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (results) updatePayload.results = results;
    if (status) updatePayload.status = status;

    if (pdca_phase === "ACT" && status !== "ACTIVE") {
      updatePayload.status = "COMPLETED";
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("improvements")
      .update(updatePayload)
      .eq("id", improvementId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// COMPLIANCE
// ===========================================================================

// GET /api/compliance – List compliance standards with completion %
router.get("/api/compliance", async (req: Request, res: Response) => {
  try {
    const { data: standards, error } = await supabase
      .from("compliance_standards")
      .select("*")
      .order("name");

    if (error) return res.status(400).json({ error: error.message });

    // For each standard, compute completion percentage
    const results = [];
    for (const std of standards || []) {
      const { data: reqs, error: reqErr } = await supabase
        .from("compliance_requirements")
        .select("status")
        .eq("standard_id", std.id);

      if (reqErr) continue;

      const total = (reqs || []).length;
      const met = (reqs || []).filter(
        (r: any) => r.status === "OK" || r.status === "NA"
      ).length;

      results.push({
        ...std,
        total_requirements: total,
        met_requirements: met,
        completion_pct: total > 0 ? Math.round((met / total) * 100) : 0,
      });
    }

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/:id/requirements – Get requirements for a standard
router.get("/api/compliance/:id/requirements", async (req: Request, res: Response) => {
  try {
    const standardId = req.params.id;

    const { data, error } = await supabase
      .from("compliance_requirements")
      .select("*")
      .eq("standard_id", standardId)
      .order("code");

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/compliance/requirements/:id – Update requirement status
router.patch("/api/compliance/requirements/:id", async (req: Request, res: Response) => {
  try {
    const reqId = req.params.id;
    const { status, evidence, notes, reviewed_by } = req.body;

    const validStatuses: RequirementStatus[] = ["OK", "PARTIAL", "FAIL", "NA"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("compliance_requirements")
      .update({
        status,
        evidence,
        notes,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reqId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// DOCUMENTS
// ===========================================================================

// POST /api/documents – Create a document
router.post("/api/documents", async (req: Request, res: Response) => {
  try {
    const {
      title,
      type,
      content,
      version,
      owner_id,
      process_id,
      review_interval_days,
    } = req.body;

    const now = new Date().toISOString();
    const reviewDate = review_interval_days
      ? new Date(Date.now() + review_interval_days * 86400000).toISOString()
      : null;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        title,
        type,
        content,
        version: version || "1.0",
        current_version: version || "1.0",
        owner_id,
        process_id,
        review_interval_days,
        next_review_date: reviewDate,
        status: "DRAFT",
        created_at: now,
        updated_at: now,
        version_history: [
          {
            version: version || "1.0",
            created_at: now,
            created_by: owner_id,
            change_notes: "Initial version",
          },
        ],
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/documents – List documents
router.get("/api/documents", async (req: Request, res: Response) => {
  try {
    const { type, status, process_id, search } = req.query;

    let query = supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false });

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);
    if (process_id) query = query.eq("process_id", process_id);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/review-due – Documents needing review
router.get("/api/documents/review-due", async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .lte("next_review_date", now)
      .not("next_review_date", "is", null)
      .order("next_review_date", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// AUDITS
// ===========================================================================

// POST /api/audits – Create an audit
router.post("/api/audits", async (req: Request, res: Response) => {
  try {
    const {
      title,
      type,
      scope,
      lead_auditor_id,
      scheduled_date,
      standard_ids,
      process_ids,
    } = req.body;

    const { data, error } = await supabase
      .from("audits")
      .insert({
        title,
        type,
        scope,
        lead_auditor_id,
        scheduled_date,
        standard_ids,
        process_ids,
        status: "PLANNED",
        findings: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/audits – List audits
router.get("/api/audits", async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;

    let query = supabase
      .from("audits")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// RISKS
// ===========================================================================

// POST /api/risks – Create a risk
router.post("/api/risks", async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      process_id,
      probability,
      impact,
      owner_id,
      mitigation_plan,
    } = req.body;

    const prob = Math.min(5, Math.max(1, Number(probability) || 1));
    const imp = Math.min(5, Math.max(1, Number(impact) || 1));
    const score = prob * imp;
    const level = getRiskLevel(score);

    const { data, error } = await supabase
      .from("risks")
      .insert({
        title,
        description,
        category,
        process_id,
        probability: prob,
        impact: imp,
        score,
        level,
        owner_id,
        mitigation_plan,
        status: "IDENTIFIED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/risks – List risks
router.get("/api/risks", async (req: Request, res: Response) => {
  try {
    const { level, status, process_id } = req.query;

    let query = supabase.from("risks").select("*").order("score", { ascending: false });

    if (level) query = query.eq("level", level);
    if (status) query = query.eq("status", status);
    if (process_id) query = query.eq("process_id", process_id);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/risks/matrix – Risk matrix visualization data
router.get("/api/risks/matrix", async (req: Request, res: Response) => {
  try {
    const { data: risks, error } = await supabase
      .from("risks")
      .select("id, title, probability, impact, score, level, status");

    if (error) return res.status(400).json({ error: error.message });

    // Build a 5×5 matrix (probability × impact)
    const matrix: any[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => [] as any[])
    );

    for (const risk of risks || []) {
      const p = Math.min(5, Math.max(1, risk.probability)) - 1;
      const i = Math.min(5, Math.max(1, risk.impact)) - 1;
      matrix[p][i].push({
        id: risk.id,
        title: risk.title,
        score: risk.score,
        level: risk.level,
        status: risk.status,
      });
    }

    // Level labels for each cell
    const cellLevels = Array.from({ length: 5 }, (_, p) =>
      Array.from({ length: 5 }, (_, i) => getRiskLevel((p + 1) * (i + 1)))
    );

    return res.json({
      matrix,
      cell_levels: cellLevels,
      axes: {
        probability: [1, 2, 3, 4, 5],
        impact: [1, 2, 3, 4, 5],
      },
      level_thresholds: {
        LOW: "1-4",
        MEDIUM: "5-9",
        HIGH: "10-14",
        CRITICAL: "15-25",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// TRAINING
// ===========================================================================

// POST /api/training – Create a training record
router.post("/api/training", async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      employee_id,
      trainer_id,
      process_id,
      scheduled_date,
      type,
      duration_hours,
    } = req.body;

    const { data, error } = await supabase
      .from("training_records")
      .insert({
        title,
        description,
        employee_id,
        trainer_id,
        process_id,
        scheduled_date,
        type,
        duration_hours,
        status: "SCHEDULED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/training – List training records
router.get("/api/training", async (req: Request, res: Response) => {
  try {
    const { employee_id, status, process_id } = req.query;

    let query = supabase
      .from("training_records")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (employee_id) query = query.eq("employee_id", employee_id);
    if (status) query = query.eq("status", status);
    if (process_id) query = query.eq("process_id", process_id);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// MANAGEMENT DASHBOARD
// ===========================================================================

// GET /api/dashboards/management – Management dashboard aggregation
router.get("/api/dashboards/management", async (req: Request, res: Response) => {
  try {
    // Parallel fetch of all dashboard data
    const [
      processesRes,
      executionsRes,
      ncRes,
      improvementsRes,
      risksRes,
      auditsRes,
      documentsRes,
      trainingRes,
    ] = await Promise.all([
      supabase.from("processes").select("id", { count: "exact", head: true }),
      supabase.from("process_executions").select("status"),
      supabase.from("non_conformances").select("status, severity"),
      supabase.from("improvements").select("status, pdca_phase"),
      supabase.from("risks").select("level, status"),
      supabase.from("audits").select("status"),
      supabase.from("documents").select("status, next_review_date"),
      supabase.from("training_records").select("status"),
    ]);

    // Process execution stats
    const executions = executionsRes.data || [];
    const execByStatus: Record<string, number> = {};
    for (const e of executions) {
      execByStatus[e.status] = (execByStatus[e.status] || 0) + 1;
    }

    // NC stats
    const ncs = ncRes.data || [];
    const ncByStatus: Record<string, number> = {};
    const ncBySeverity: Record<string, number> = {};
    for (const nc of ncs) {
      ncByStatus[nc.status] = (ncByStatus[nc.status] || 0) + 1;
      ncBySeverity[nc.severity] = (ncBySeverity[nc.severity] || 0) + 1;
    }

    // Improvement stats
    const improvements = improvementsRes.data || [];
    const impByPhase: Record<string, number> = {};
    let activeImprovements = 0;
    for (const imp of improvements) {
      impByPhase[imp.pdca_phase] = (impByPhase[imp.pdca_phase] || 0) + 1;
      if (imp.status === "ACTIVE") activeImprovements++;
    }

    // Risk stats
    const risks = risksRes.data || [];
    const riskByLevel: Record<string, number> = {};
    for (const r of risks) {
      riskByLevel[r.level] = (riskByLevel[r.level] || 0) + 1;
    }

    // Audit stats
    const audits = auditsRes.data || [];
    const auditByStatus: Record<string, number> = {};
    for (const a of audits) {
      auditByStatus[a.status] = (auditByStatus[a.status] || 0) + 1;
    }

    // Document stats
    const documents = documentsRes.data || [];
    const now = new Date().toISOString();
    const docsReviewDue = documents.filter(
      (d: any) => d.next_review_date && d.next_review_date <= now
    ).length;

    // Training stats
    const training = trainingRes.data || [];
    const trainingByStatus: Record<string, number> = {};
    for (const t of training) {
      trainingByStatus[t.status] = (trainingByStatus[t.status] || 0) + 1;
    }

    return res.json({
      processes: {
        total: processesRes.count || 0,
      },
      executions: {
        total: executions.length,
        by_status: execByStatus,
      },
      non_conformances: {
        total: ncs.length,
        open: ncs.length - (ncByStatus["CLOSED"] || 0),
        by_status: ncByStatus,
        by_severity: ncBySeverity,
      },
      improvements: {
        total: improvements.length,
        active: activeImprovements,
        by_pdca_phase: impByPhase,
      },
      risks: {
        total: risks.length,
        by_level: riskByLevel,
        critical_count: riskByLevel["CRITICAL"] || 0,
        high_count: riskByLevel["HIGH"] || 0,
      },
      audits: {
        total: audits.length,
        by_status: auditByStatus,
      },
      documents: {
        total: documents.length,
        review_due: docsReviewDue,
      },
      training: {
        total: training.length,
        by_status: trainingByStatus,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
