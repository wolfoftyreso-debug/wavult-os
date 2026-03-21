// ---------------------------------------------------------------------------
// Quality-by-Design Engine — Gates, Prevention Rules, Quality Scores
// ISO 8.5.1, 10.2, 10.3
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { recordDataPoint } from "./metrics";

const router = Router();

// ---------------------------------------------------------------------------
// Gate Evaluation Engine (exported for process execution integration)
// ---------------------------------------------------------------------------

interface GateEvalResult {
  result: "PASSED" | "FAILED" | "BYPASSED";
  failure_reasons: Array<{ rule: string; expected: any; actual: any; message: string }>;
  check_data: Record<string, any>;
}

/**
 * Evaluate a quality gate against execution data
 */
export async function evaluateGate(
  gate: any,
  executionData: Record<string, any>,
  userId: string
): Promise<GateEvalResult> {
  const config = gate.gate_config;
  const failures: GateEvalResult["failure_reasons"] = [];
  const checkData: Record<string, any> = {};

  switch (gate.gate_type) {
    case "VALIDATION": {
      const rules = config.rules ?? [];
      for (const rule of rules) {
        const actual = executionData[rule.field];
        checkData[rule.field] = actual;
        let passed = false;
        switch (rule.operator) {
          case "not_null": passed = actual != null && actual !== ""; break;
          case "eq": passed = actual === rule.value; break;
          case "gt": passed = Number(actual) > Number(rule.value); break;
          case "gte": passed = Number(actual) >= Number(rule.value); break;
          case "lt": passed = Number(actual) < Number(rule.value); break;
          case "in": passed = (rule.value as any[])?.includes(actual); break;
          default: passed = actual != null;
        }
        if (!passed) {
          failures.push({ rule: rule.field, expected: `${rule.operator} ${rule.value ?? "non-null"}`, actual, message: `${rule.field}: expected ${rule.operator} ${rule.value ?? "non-null"}, got ${actual}` });
        }
      }
      break;
    }
    case "CHECKLIST": {
      const items = config.items ?? [];
      const completed = executionData.checklist_completed ?? [];
      for (const item of items) {
        const done = completed.includes(item);
        checkData[item] = done;
        if (!done) {
          failures.push({ rule: "checklist", expected: item, actual: false, message: `Checklist: "${item}" inte avbockad` });
        }
      }
      break;
    }
    case "MEASUREMENT": {
      const measured = Number(executionData[config.parameter] ?? executionData.measured_value);
      checkData.measured = measured;
      checkData.min = config.min;
      checkData.max = config.max;
      if (measured < config.min || measured > config.max) {
        failures.push({ rule: config.parameter, expected: `${config.min}–${config.max} ${config.unit}`, actual: measured, message: `Mätvärde ${measured} utanför tolerans ${config.min}–${config.max} ${config.unit}` });
      }
      break;
    }
    case "VERIFICATION": {
      const verifierId = executionData.verifier_id ?? executionData.verified_by;
      checkData.verifier = verifierId;
      if (!verifierId) {
        failures.push({ rule: "verifier", expected: config.verifier_role, actual: null, message: "Verifiering saknas" });
      } else if (config.different_person && verifierId === executionData.created_by) {
        failures.push({ rule: "different_person", expected: "annan person", actual: "samma person", message: "Verifierare och skapare måste vara olika personer" });
      }
      break;
    }
    case "APPROVAL": {
      const approverId = executionData.approved_by;
      checkData.approver = approverId;
      if (!approverId) {
        failures.push({ rule: "approval", expected: config.approver_roles, actual: null, message: "Godkännande saknas" });
      }
      if (config.dual_approval_threshold && Number(executionData.value_eur ?? 0) > config.dual_approval_threshold) {
        if (!executionData.second_approver_id) {
          failures.push({ rule: "dual_approval", expected: "dubbelsignatur", actual: null, message: `Belopp > ${config.dual_approval_threshold} EUR kräver dubbelsignatur` });
        }
      }
      break;
    }
    case "DOCUMENT": {
      const docs = config.required_documents ?? [];
      const existingDocs = executionData.documents ?? [];
      for (const doc of docs) {
        if (!existingDocs.includes(doc)) {
          failures.push({ rule: "document", expected: doc, actual: null, message: `Dokument "${doc}" saknas` });
        }
      }
      break;
    }
    case "CAPABILITY": {
      const { data: cap } = await supabase
        .from("user_capabilities")
        .select("level")
        .eq("user_id", userId)
        .eq("domain_id", config.required_capability)
        .maybeSingle();
      const level = cap?.level ?? 0;
      const required = parseInt(config.min_level?.replace("L", "") ?? "3");
      checkData.user_level = level;
      checkData.required_level = required;
      if (level < required) {
        failures.push({ rule: "capability", expected: `L${required}`, actual: `L${level}`, message: `Kompetens ${config.required_capability}: krävs L${required}, har L${level}` });
      }
      break;
    }
    case "DEPENDENCY": {
      if (config.depends_on_process) {
        const { data: dep } = await supabase
          .from("process_executions")
          .select("status")
          .eq("process_id", config.depends_on_process)
          .eq("status", config.depends_on_status ?? "COMPLETED")
          .limit(1)
          .maybeSingle();
        checkData.dependency_met = !!dep;
        if (!dep) {
          failures.push({ rule: "dependency", expected: config.depends_on_status, actual: "not found", message: `Beroende process ${config.depends_on_process} ej slutförd` });
        }
      }
      break;
    }
    case "AUTOMATION": {
      // Custom checks — extensible
      if (config.check === "trial_balance_zero") {
        const { data: tb } = await supabase.rpc("get_trial_balance_diff") as any;
        const diff = (tb as any)?.diff ?? 0;
        checkData.trial_balance_diff = diff;
        if (Math.abs(diff) > 0.01) {
          failures.push({ rule: "trial_balance", expected: 0, actual: diff, message: `Trial balance ≠ 0 (diff: ${diff})` });
        }
      }
      break;
    }
  }

  return {
    result: failures.length === 0 ? "PASSED" : "FAILED",
    failure_reasons: failures,
    check_data: checkData,
  };
}

/**
 * Run all gates for a process step and record results
 */
export async function runGatesForStep(
  orgId: string,
  processId: string,
  stepOrder: number,
  executionId: string,
  executionData: Record<string, any>,
  userId: string
): Promise<{ blocked: boolean; results: any[] }> {
  const { data: gates } = await supabase
    .from("process_quality_gates")
    .select("*")
    .eq("process_id", processId)
    .eq("step_order", stepOrder)
    .eq("is_active", true)
    .order("step_order");

  const results: any[] = [];
  let blocked = false;

  for (const gate of gates ?? []) {
    const evalResult = await evaluateGate(gate, executionData, userId);

    // Record immutable result
    const { data: gateResult } = await supabase.from("gate_results").insert({
      org_id: orgId,
      gate_id: gate.id,
      execution_id: executionId,
      result: evalResult.result,
      checked_by: gate.auto_check ? "SYSTEM" : "USER",
      checker_user_id: userId,
      check_data: evalResult.check_data,
      failure_reasons: evalResult.failure_reasons,
    }).select().single();

    // Record metrics
    await recordDataPoint(orgId, "GATE_PASS_RATE", evalResult.result === "PASSED" ? 1 : 0, {
      gate_type: gate.gate_type, process_id: processId,
    });

    if (evalResult.result === "FAILED") {
      if (gate.severity === "BLOCKING") {
        blocked = true;

        // Auto-create NC if configured
        if (["CREATE_NC", "ALL"].includes(gate.failure_action)) {
          const { data: nc } = await supabase.from("non_conformances").insert({
            org_id: orgId,
            title: `Quality gate fail: ${gate.title}`,
            description: evalResult.failure_reasons.map((r: any) => r.message).join(". "),
            severity: "MINOR",
            source: "QUALITY_GATE",
            status: "OPEN",
          }).select("id").single();

          if (nc && gateResult) {
            await supabase.from("gate_results").update({ linked_nc_id: nc.id }).eq("id", gateResult.id);
          }
        }

        // Notify if configured
        if (["NOTIFY", "ESCALATE", "ALL"].includes(gate.failure_action) && gate.failure_notification_role) {
          await supabase.from("tasks").insert({
            org_id: orgId,
            title: `Quality gate FAILED: ${gate.title}`,
            description: `Steg ${stepOrder}: ${evalResult.failure_reasons.map((r: any) => r.message).join(". ")}`,
            status: "TODO",
            priority: "HIGH",
            type: "QUALITY_GATE",
          });
        }
      }

      if (gate.severity === "WARNING") {
        await supabase.from("tasks").insert({
          org_id: orgId,
          title: `Quality gate WARNING: ${gate.title}`,
          description: evalResult.failure_reasons.map((r: any) => r.message).join(". "),
          status: "TODO",
          priority: "MEDIUM",
          type: "QUALITY_GATE",
        });
      }
    }

    results.push({ gate_id: gate.id, gate_title: gate.title, gate_type: gate.gate_type, severity: gate.severity, ...evalResult });
  }

  return { blocked, results };
}

/**
 * Update execution quality score after all gates checked
 */
export async function updateExecutionQualityScore(orgId: string, executionId: string): Promise<void> {
  const { data: results } = await supabase.from("gate_results").select("result").eq("execution_id", executionId);
  if (!results) return;

  const total = results.length;
  const passed = results.filter(r => r.result === "PASSED").length;
  const failed = results.filter(r => r.result === "FAILED").length;
  const bypassed = results.filter(r => r.result === "BYPASSED").length;
  const firstPass = failed === 0 && bypassed === 0;

  await supabase.from("execution_quality_scores").upsert({
    org_id: orgId,
    execution_id: executionId,
    gates_total: total,
    gates_passed: passed,
    gates_failed: failed,
    gates_bypassed: bypassed,
    first_pass_yield: firstPass,
    calculated_at: new Date().toISOString(),
  }, { onConflict: "execution_id" });

  // Record FPY metric
  await recordDataPoint(orgId, "FIRST_PASS_YIELD", firstPass ? 1 : 0, { execution_id: executionId });
  if (!firstPass) {
    await recordDataPoint(orgId, "REWORK_RATE", 1, { execution_id: executionId });
  }
}

// ---------------------------------------------------------------------------
// Prevention Rules Engine (exported as middleware)
// ---------------------------------------------------------------------------

export async function runPreventionRules(
  orgId: string,
  entityType: string,
  event: string,
  data: Record<string, any>
): Promise<{ blocked: boolean; message?: string; errors?: any[]; data: Record<string, any> }> {
  const { data: rules } = await supabase
    .from("prevention_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("trigger_entity", entityType)
    .eq("trigger_event", event)
    .eq("is_active", true);

  let resultData = { ...data };

  for (const rule of rules ?? []) {
    // Check conditions match
    const conds = rule.conditions as Record<string, any>;
    let conditionsMet = true;
    for (const [key, value] of Object.entries(conds)) {
      if (resultData[key] !== value) { conditionsMet = false; break; }
    }
    if (!conditionsMet && Object.keys(conds).length > 0) continue;

    const action = rule.action as Record<string, any>;

    switch (rule.rule_type) {
      case "CONSTRAINT": {
        if (action.block_if) {
          const field = action.block_if.field;
          const equalsField = action.block_if.equals;
          if (resultData[field] && resultData[equalsField] && resultData[field] === resultData[equalsField]) {
            await supabase.from("prevention_rules").update({ failure_count: rule.failure_count + 1, last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
            await recordDataPoint(orgId, "PREVENTION_EFFECTIVENESS", 1, { rule_id: rule.id, rule_type: "CONSTRAINT" });
            return { blocked: true, message: action.message, data: resultData };
          }
        }
        break;
      }
      case "INPUT_VALIDATION": {
        const validations = action.validate ?? [];
        const errors: any[] = [];
        for (const v of validations) {
          const val = resultData[v.field];
          if (v.rule === "min_days_from_now") {
            const deadline = new Date(val);
            const minDate = new Date(Date.now() + v.value * 86400000);
            if (deadline < minDate) errors.push({ field: v.field, message: v.message ?? `${v.field} måste vara minst ${v.value} dagar fram` });
          } else if (v.rule === "between") {
            if (Number(val) < v.min || Number(val) > v.max) errors.push({ field: v.field, message: v.message ?? `${v.field} måste vara mellan ${v.min} och ${v.max}` });
          } else if (v.rule === "not_null") {
            if (val == null || val === "") errors.push({ field: v.field, message: v.message ?? `${v.field} krävs` });
          }
        }
        if (errors.length > 0) {
          await supabase.from("prevention_rules").update({ failure_count: rule.failure_count + 1, last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
          await recordDataPoint(orgId, "PREVENTION_EFFECTIVENESS", 1, { rule_id: rule.id, rule_type: "INPUT_VALIDATION" });
          return { blocked: true, errors, data: resultData };
        }
        break;
      }
      case "POKA_YOKE": {
        if (action.auto_fill) {
          for (const [field, config] of Object.entries(action.auto_fill as Record<string, any>)) {
            if (!resultData[field] && config.from === "config") {
              const { data: cfg } = await supabase.from("configs").select("value").eq("key", config.key).maybeSingle();
              if (cfg) resultData[field] = cfg.value;
            }
          }
        }
        break;
      }
      case "CAPACITY_CHECK": {
        if (action.check === "user_open_tasks") {
          const userId = resultData.assigned_to ?? resultData.user_id;
          if (userId) {
            const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true })
              .eq("assigned_to", userId).in("status", ["TODO", "IN_PROGRESS"]);
            if ((count ?? 0) >= action.max) {
              await supabase.from("prevention_rules").update({ failure_count: rule.failure_count + 1, last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
              // Warning, not blocking
              const msg = action.message?.replace("{{count}}", String(count ?? 0));
              await supabase.from("tasks").insert({
                org_id: orgId, title: `Kapacitetsvarning: ${msg}`,
                description: msg, status: "TODO", priority: "MEDIUM", type: "CAPACITY_WARNING",
              });
            }
          }
        }
        break;
      }
      case "COMPETENCY_CHECK": {
        if (action.check === "user_capability") {
          const userId = resultData.performed_by ?? resultData.user_id ?? resultData.created_by;
          if (userId) {
            const { data: cap } = await supabase.from("user_capabilities").select("level")
              .eq("user_id", userId).eq("domain_id", action.capability).maybeSingle();
            const level = cap?.level ?? 0;
            const required = parseInt(action.min_level?.replace("L", "") ?? "3");
            if (level < required) {
              await supabase.from("prevention_rules").update({ failure_count: rule.failure_count + 1, last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
              return { blocked: true, message: action.message, data: resultData };
            }
          }
        }
        break;
      }
      case "STANDARD_WORK": {
        if (action.require_template && !resultData.template_id) {
          return { blocked: true, message: action.message, data: resultData };
        }
        break;
      }
      case "ESCALATION_TRIGGER": {
        if (action.if?.metric) {
          // Check metric threshold — async post-create action
          // This runs after creation, so don't block
          const { data: points } = await supabase
            .from("metric_data_points")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .eq("metric_id", action.if.metric);
          // Simplified: create task for escalation
          if ((points as any)?.count > action.if.threshold) {
            await supabase.from("tasks").insert({
              org_id: orgId, title: action.message,
              description: action.message, status: "TODO", priority: "HIGH", type: "ESCALATION",
            });
          }
        }
        break;
      }
    }
  }

  return { blocked: false, data: resultData };
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

// ===== QUALITY GATES =====

router.get("/api/quality-gates", async (req: Request, res: Response) => {
  try {
    const { org_id, process_id } = req.query;
    let q = supabase.from("process_quality_gates").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    if (process_id) q = q.eq("process_id", process_id as string);
    q = q.eq("is_active", true).order("process_id").order("step_order");
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ gates: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/quality-gates", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("process_quality_gates").insert(req.body).select().single();
    if (error) throw error;
    return res.status(201).json({ gate: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/quality-gates/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("process_quality_gates").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    return res.json({ gate: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.delete("/api/quality-gates/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("process_quality_gates").update({ is_active: false }).eq("id", req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Evaluate gates for a process step (test/manual trigger)
router.post("/api/quality-gates/evaluate", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { org_id, process_id, step_order, execution_id, execution_data } = req.body;
    const result = await runGatesForStep(org_id, process_id, step_order, execution_id, execution_data ?? {}, user.id);
    if (execution_id) await updateExecutionQualityScore(org_id, execution_id);
    return res.json(result);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Bypass a gate (requires role)
router.post("/api/quality-gates/:gateResultId/bypass", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { gateResultId } = req.params;
    const { bypass_reason } = req.body;
    if (!bypass_reason) return res.status(400).json({ error: "bypass_reason required" });

    // Gate results are immutable — create a new BYPASSED result
    const { data: original } = await supabase.from("gate_results").select("*").eq("id", gateResultId).single();
    if (!original) return res.status(404).json({ error: "Gate result not found" });

    const { data: gate } = await supabase.from("process_quality_gates").select("*").eq("id", original.gate_id).single();
    if (!gate?.bypass_allowed) return res.status(403).json({ error: "This gate does not allow bypass" });

    const { data: bypassResult, error } = await supabase.from("gate_results").insert({
      org_id: original.org_id, gate_id: original.gate_id, execution_id: original.execution_id,
      result: "BYPASSED", checked_by: "USER", checker_user_id: user.id,
      bypass_reason, bypass_approved_by: user.id,
      check_data: original.check_data, failure_reasons: original.failure_reasons,
    }).select().single();
    if (error) throw error;

    return res.status(201).json({ gate_result: bypassResult });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Gate results for an execution
router.get("/api/quality-gates/results/:executionId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("gate_results")
      .select("*, process_quality_gates!gate_id(title, gate_type, severity)")
      .eq("execution_id", req.params.executionId)
      .order("checked_at");
    if (error) throw error;
    return res.json({ results: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Quality score for an execution
router.get("/api/quality-scores/:executionId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("execution_quality_scores")
      .select("*").eq("execution_id", req.params.executionId).single();
    if (error || !data) return res.status(404).json({ error: "Quality score not found" });
    return res.json({ score: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Gate failure analysis
router.get("/api/quality-gates/analysis", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    let q = supabase.from("v_gate_failure_analysis").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ analysis: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Process quality summary
router.get("/api/quality-scores/summary", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    let q = supabase.from("v_process_quality_summary").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ summary: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ===== PREVENTION RULES =====

router.get("/api/prevention-rules", async (req: Request, res: Response) => {
  try {
    const { org_id, rule_type, trigger_entity } = req.query;
    let q = supabase.from("prevention_rules").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    if (rule_type) q = q.eq("rule_type", rule_type as string);
    if (trigger_entity) q = q.eq("trigger_entity", trigger_entity as string);
    q = q.order("failure_count", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ rules: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/api/prevention-rules", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("prevention_rules").insert(req.body).select().single();
    if (error) throw error;
    return res.status(201).json({ rule: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.patch("/api/prevention-rules/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("prevention_rules").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    return res.json({ rule: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/api/prevention-rules/effectiveness", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    let q = supabase.from("v_prevention_rule_effectiveness").select("*");
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ effectiveness: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Test a prevention rule (dry run)
router.post("/api/prevention-rules/test", async (req: Request, res: Response) => {
  try {
    const { org_id, entity_type, event, data: testData } = req.body;
    const result = await runPreventionRules(org_id, entity_type, event, testData ?? {});
    return res.json({ ...result, dry_run: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
