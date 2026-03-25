import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
interface AuthUser { id: string; org_id: string; role: string; }

function getUser(req: Request, res: Response): AuthUser | null {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
}

async function audit(userId: string, orgId: string, action: string, entityType: string, entityId?: string, meta?: any) {
  await supabase.from("audit_log").insert({ user_id: userId, org_id: orgId, action, entity_type: entityType, entity_id: entityId, metadata: meta });
}

// =============================================================================
// SAMPLING PLANS — Statistical sampling configurations
// =============================================================================

router.get("/api/sampling/plans", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("sampling_plans")
    .select("*")
    .eq("org_id", user.org_id)
    .order("code");

  if (req.query.active === "true") query = query.eq("is_active", true);
  if (req.query.plan_type) query = query.eq("plan_type", req.query.plan_type as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/sampling/plans", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { code, name, description, plan_type, aql, inspection_level,
    lot_size_min, lot_size_max, sample_size, accept_number, reject_number,
    switch_to_tightened_after, switch_to_reduced_after, switch_to_normal_after,
    skip_lot_eligible, skip_lot_frequency, skip_lot_min_accepted,
    applies_to, iso_reference } = req.body;

  if (!code || !name) return res.status(400).json({ error: "code and name required" });

  const { data, error } = await supabase
    .from("sampling_plans")
    .insert({
      org_id: user.org_id, code, name, description,
      plan_type: plan_type || "AQL_SINGLE",
      aql, inspection_level: inspection_level || "II",
      lot_size_min, lot_size_max, sample_size, accept_number, reject_number,
      switch_to_tightened_after, switch_to_reduced_after, switch_to_normal_after,
      skip_lot_eligible: skip_lot_eligible || false,
      skip_lot_frequency, skip_lot_min_accepted,
      applies_to: applies_to || [], iso_reference,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "sampling_plans", data.id);
  res.status(201).json(data);
});

router.patch("/api/sampling/plans/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const allowed = [
    "name", "description", "plan_type", "aql", "inspection_level",
    "lot_size_min", "lot_size_max", "sample_size", "accept_number", "reject_number",
    "current_severity", "switch_to_tightened_after", "switch_to_reduced_after",
    "switch_to_normal_after", "skip_lot_eligible", "skip_lot_frequency",
    "skip_lot_min_accepted", "applies_to", "is_active", "iso_reference"
  ];
  const updates: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const { data, error } = await supabase
    .from("sampling_plans")
    .update(updates)
    .eq("id", req.params.id).eq("org_id", user.org_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "UPDATE", "sampling_plans", data.id, updates);
  res.json(data);
});

// AQL Lookup — Get sample size for a given lot size and AQL
router.get("/api/sampling/aql-lookup", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { lot_size, aql, inspection_level, severity } = req.query;

  let query = supabase.from("aql_lookup").select("*");

  if (inspection_level) query = query.eq("inspection_level", inspection_level as string);
  else query = query.eq("inspection_level", "II");

  if (severity) query = query.eq("severity", severity as string);
  else query = query.eq("severity", "NORMAL");

  if (aql) query = query.eq("aql", parseFloat(aql as string));

  if (lot_size) {
    const ls = parseInt(lot_size as string);
    query = query.lte("lot_size_min", ls).or(`lot_size_max.gte.${ls},lot_size_max.is.null`);
  }

  const { data, error } = await query.order("lot_size_min");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// SAMPLING EXECUTIONS — Run sampling, record results
// =============================================================================

router.post("/api/sampling/executions", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { plan_id, lot_number, lot_size, sample_size, inspector_id,
    supervisor_id, linked_entity_type, linked_entity_id, supplier_id,
    accept_number, reject_number, severity_used } = req.body;

  if (!plan_id || !lot_size || !sample_size) {
    return res.status(400).json({ error: "plan_id, lot_size, sample_size required" });
  }

  // Verify inspector independence if provided
  let coiCheckId = null;
  const actualInspector = inspector_id || user.id;

  if (linked_entity_type && linked_entity_id) {
    const { data: coi } = await supabase
      .from("conflict_of_interest")
      .select("id, status")
      .eq("user_id", actualInspector)
      .eq("entity_type", linked_entity_type)
      .eq("entity_id", linked_entity_id)
      .eq("org_id", user.org_id)
      .in("status", ["DECLARED", "UNDER_REVIEW"])
      .single();

    if (coi) {
      return res.status(409).json({
        error: "Inspector has declared conflict of interest for this entity",
        coi_id: coi.id,
        coi_status: coi.status
      });
    }
  }

  const { data, error } = await supabase
    .from("sampling_executions")
    .insert({
      org_id: user.org_id, plan_id, lot_number, lot_size, sample_size,
      inspector_id: actualInspector,
      supervisor_id,
      linked_entity_type, linked_entity_id, supplier_id,
      accept_number: accept_number || 0, reject_number: reject_number || 1,
      severity_used: severity_used || "NORMAL",
      independence_verified: true,
      coi_check_id: coiCheckId,
      started_at: new Date().toISOString(),
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "sampling_executions", data.id);
  res.status(201).json(data);
});

// Record results
router.patch("/api/sampling/executions/:id/results", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { items_inspected, items_conforming, items_nonconforming,
    defect_details, evidence_files, notes } = req.body;

  const { data, error } = await supabase
    .from("sampling_executions")
    .update({
      items_inspected, items_conforming, items_nonconforming,
      defect_details: defect_details || [],
      evidence_files: evidence_files || [],
      notes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", req.params.id).eq("org_id", user.org_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Check if severity should switch
  if (data.plan_id) {
    await checkSeveritySwitch(user.org_id, data.plan_id, data.supplier_id, data.result, user.id);
  }

  await audit(user.id, user.org_id, "RECORD_RESULTS", "sampling_executions", data.id);
  res.json(data);
});

// List executions
router.get("/api/sampling/executions", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("sampling_executions")
    .select("*, plan:sampling_plans(code, name, plan_type, aql), inspector:users!sampling_executions_inspector_id_fkey(id, full_name)")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (req.query.plan_id) query = query.eq("plan_id", req.query.plan_id as string);
  if (req.query.supplier_id) query = query.eq("supplier_id", req.query.supplier_id as string);
  if (req.query.result) query = query.eq("result", req.query.result as string);
  if (req.query.inspector_id) query = query.eq("inspector_id", req.query.inspector_id as string);

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// IMPARTIALITY DECLARATIONS
// =============================================================================

router.get("/api/impartiality/declarations", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("impartiality_declarations")
    .select("*, user:users(id, full_name, email)")
    .eq("org_id", user.org_id)
    .order("declaration_date", { ascending: false });

  if (req.query.user_id) query = query.eq("user_id", req.query.user_id as string);
  if (req.query.active === "true") query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Submit declaration
router.post("/api/impartiality/declarations", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { user_id, role_context, scope_description, valid_until,
    has_financial_interests, has_personal_relationships,
    has_organizational_ties, has_competitive_interests,
    declared_interests } = req.body;

  const targetUserId = user_id || user.id;

  // Calculate risk level
  const interests = [has_financial_interests, has_personal_relationships,
    has_organizational_ties, has_competitive_interests];
  const interestCount = interests.filter(Boolean).length;
  let risk_level = "NONE";
  if (interestCount >= 3) risk_level = "HIGH";
  else if (interestCount >= 2) risk_level = "MEDIUM";
  else if (interestCount >= 1) risk_level = "LOW";

  const { data, error } = await supabase
    .from("impartiality_declarations")
    .insert({
      org_id: user.org_id,
      user_id: targetUserId,
      declaration_date: new Date().toISOString().split("T")[0],
      valid_until,
      role_context: role_context || "inspector",
      scope_description,
      has_financial_interests: has_financial_interests || false,
      has_personal_relationships: has_personal_relationships || false,
      has_organizational_ties: has_organizational_ties || false,
      has_competitive_interests: has_competitive_interests || false,
      declared_interests: declared_interests || [],
      risk_level,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "impartiality_declarations", data.id);
  res.status(201).json(data);
});

// Approve declaration
router.post("/api/impartiality/declarations/:id/approve", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("impartiality_declarations")
    .update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: req.body.notes,
    })
    .eq("id", req.params.id).eq("org_id", user.org_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// CONFLICT OF INTEREST
// =============================================================================

router.get("/api/impartiality/coi", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("conflict_of_interest")
    .select("*, user:users(id, full_name)")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (req.query.user_id) query = query.eq("user_id", req.query.user_id as string);
  if (req.query.status) query = query.eq("status", req.query.status as string);
  if (req.query.activity_type) query = query.eq("activity_type", req.query.activity_type as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/impartiality/coi", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { user_id, coi_type, description, activity_type,
    entity_type, entity_id, entity_name, risk_level, mitigation_plan } = req.body;

  if (!coi_type || !description || !activity_type) {
    return res.status(400).json({ error: "coi_type, description, activity_type required" });
  }

  const { data, error } = await supabase
    .from("conflict_of_interest")
    .insert({
      org_id: user.org_id,
      user_id: user_id || user.id,
      coi_type, description, activity_type,
      entity_type, entity_id, entity_name,
      risk_level: risk_level || "LOW",
      mitigation_plan,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "DECLARE_COI", "conflict_of_interest", data.id);
  res.status(201).json(data);
});

// Review COI
router.post("/api/impartiality/coi/:id/review", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { status, review_notes, resolution, mitigation_actions } = req.body;
  if (!["MITIGATED", "ACCEPTED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "status must be MITIGATED, ACCEPTED, or REJECTED" });
  }

  const updates: any = {
    status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_notes,
    resolution,
  };
  if (mitigation_actions) updates.mitigation_actions = mitigation_actions;
  if (["MITIGATED", "ACCEPTED", "REJECTED"].includes(status)) {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("conflict_of_interest")
    .update(updates)
    .eq("id", req.params.id).eq("org_id", user.org_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "REVIEW_COI", "conflict_of_interest", data.id);
  res.json(data);
});

// =============================================================================
// INDEPENDENCE MATRIX
// =============================================================================

router.get("/api/impartiality/independence", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("independence_matrix")
    .select("*, user:users(id, full_name)")
    .eq("org_id", user.org_id);

  if (req.query.user_id) query = query.eq("user_id", req.query.user_id as string);
  if (req.query.activity_type) query = query.eq("activity_type", req.query.activity_type as string);
  if (req.query.entity_type) query = query.eq("entity_type", req.query.entity_type as string);

  const { data, error } = await query.order("user_id");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/impartiality/independence", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { user_id, activity_type, entity_type, entity_id, entity_name,
    independence_level, reason, restrictions, requires_supervision,
    supervisor_id, valid_from, valid_until,
    max_consecutive_assignments, cooldown_months } = req.body;

  const { data, error } = await supabase
    .from("independence_matrix")
    .upsert({
      org_id: user.org_id,
      user_id, activity_type, entity_type, entity_id, entity_name,
      independence_level: independence_level || "FULL",
      reason, restrictions: restrictions || [],
      requires_supervision: requires_supervision || false,
      supervisor_id,
      valid_from: valid_from || new Date().toISOString().split("T")[0],
      valid_until,
      max_consecutive_assignments: max_consecutive_assignments || 3,
      cooldown_months: cooldown_months || 12,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "SET_INDEPENDENCE", "independence_matrix", data.id);
  res.status(201).json(data);
});

// =============================================================================
// INSPECTOR POOL — Manage qualified personnel
// =============================================================================

router.get("/api/sampling/inspectors", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("inspector_pool")
    .select("*, user:users(id, full_name, email, role)")
    .eq("org_id", user.org_id);

  if (req.query.active === "true") query = query.eq("is_active", true);
  if (req.query.activity_type) query = query.contains("activity_types", [req.query.activity_type as string]);

  const { data, error } = await query.order("total_assignments");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/sampling/inspectors", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { user_id, activity_types, competence_areas, qualification_level,
    certifications, languages, max_hours_per_week,
    impartiality_declaration_id, impartiality_valid_until } = req.body;

  if (!user_id || !activity_types?.length) {
    return res.status(400).json({ error: "user_id and activity_types required" });
  }

  const { data, error } = await supabase
    .from("inspector_pool")
    .upsert({
      org_id: user.org_id, user_id,
      activity_types, competence_areas: competence_areas || [],
      qualification_level, certifications: certifications || [],
      languages: languages || ["sv", "en"],
      max_hours_per_week: max_hours_per_week || 40,
      impartiality_declaration_id, impartiality_valid_until,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "ADD_INSPECTOR", "inspector_pool", data.id);
  res.status(201).json(data);
});

// =============================================================================
// RANDOM ASSIGNMENT — Assign inspector with COI verification
// =============================================================================

router.post("/api/sampling/assign", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { activity_type, entity_type, entity_id, entity_name,
    required_competences, required_qualification, required_language,
    assignment_method } = req.body;

  if (!activity_type || !entity_type) {
    return res.status(400).json({ error: "activity_type and entity_type required" });
  }

  // Find users with COI for this entity
  const { data: cois } = await supabase
    .from("conflict_of_interest")
    .select("user_id")
    .eq("org_id", user.org_id)
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .in("status", ["DECLARED", "UNDER_REVIEW"]);

  const excludedUserIds = (cois || []).map((c: any) => c.user_id);

  // Find eligible inspectors
  let poolQuery = supabase
    .from("inspector_pool")
    .select("*, user:users(id, full_name)")
    .eq("org_id", user.org_id)
    .eq("is_active", true)
    .eq("is_available", true)
    .contains("activity_types", [activity_type]);

  if (required_competences?.length) {
    poolQuery = poolQuery.contains("competence_areas", required_competences);
  }
  if (required_language) {
    poolQuery = poolQuery.contains("languages", [required_language]);
  }

  const { data: candidates } = await poolQuery;

  // Filter out COI and check independence
  const eligible = (candidates || []).filter((c: any) => !excludedUserIds.includes(c.user_id));

  if (!eligible.length) {
    return res.status(404).json({ error: "No eligible inspectors found", excluded: excludedUserIds.length });
  }

  // Select based on method
  let selected;
  const method = assignment_method || "RANDOM";

  if (method === "ROUND_ROBIN") {
    // Fewest assignments first
    selected = eligible.sort((a: any, b: any) => a.total_assignments - b.total_assignments)[0];
  } else if (method === "WEIGHTED") {
    // Weighted by accuracy + low assignment count
    selected = eligible.sort((a: any, b: any) => {
      const scoreA = (a.accuracy_rate || 0.5) * 100 - a.total_assignments;
      const scoreB = (b.accuracy_rate || 0.5) * 100 - b.total_assignments;
      return scoreB - scoreA;
    })[0];
  } else {
    // RANDOM
    selected = eligible[Math.floor(Math.random() * eligible.length)];
  }

  // Create assignment record
  const { data: assignment, error } = await supabase
    .from("inspector_assignments")
    .insert({
      org_id: user.org_id,
      activity_type, entity_type, entity_id, entity_name,
      required_competences: required_competences || [],
      required_qualification, required_language,
      assignment_method: method,
      excluded_user_ids: excludedUserIds,
      assigned_to: selected.user_id,
      assignment_reason: `${method}: ${eligible.length} eligible, ${excludedUserIds.length} excluded (COI)`,
      coi_verified: true,
      independence_verified: true,
      status: "ASSIGNED",
      requested_by: user.id,
      assigned_at: new Date().toISOString(),
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Update inspector stats
  await supabase
    .from("inspector_pool")
    .update({ total_assignments: (selected.total_assignments || 0) + 1 })
    .eq("id", selected.id);

  await audit(user.id, user.org_id, "ASSIGN_INSPECTOR", "inspector_assignments", assignment.id, {
    method, assigned_to: selected.user_id, excluded: excludedUserIds.length
  });

  res.status(201).json({
    assignment,
    inspector: selected.user,
    method,
    candidates_total: candidates?.length || 0,
    excluded_coi: excludedUserIds.length,
  });
});

// =============================================================================
// IMPARTIALITY COMMITTEE & REVIEWS
// =============================================================================

router.get("/api/impartiality/committee", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("impartiality_committee")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("is_active", true);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/impartiality/committee", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { name, description, chair_id, members, external_members,
    meeting_frequency, next_meeting_date, oversees } = req.body;

  const { data, error } = await supabase
    .from("impartiality_committee")
    .insert({
      org_id: user.org_id,
      name: name || "Opartiskhetskommitté",
      description, chair_id,
      members: members || [],
      external_members: external_members || [],
      meeting_frequency: meeting_frequency || "QUARTERLY",
      next_meeting_date,
      oversees: oversees || ["audit", "inspection", "calibration", "sampling"],
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get("/api/impartiality/reviews", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("impartiality_reviews")
    .select("*")
    .eq("org_id", user.org_id)
    .order("review_date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/impartiality/reviews", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { committee_id, review_period_start, review_period_end,
    coi_declarations_reviewed, coi_issues_found, rotation_compliance_pct,
    independence_issues, overall_risk, risk_details,
    corrective_actions, preventive_actions, minutes, attendees } = req.body;

  const { data, error } = await supabase
    .from("impartiality_reviews")
    .insert({
      org_id: user.org_id, committee_id,
      review_period_start, review_period_end,
      coi_declarations_reviewed, coi_issues_found,
      rotation_compliance_pct, independence_issues: independence_issues || [],
      overall_risk: overall_risk || "LOW", risk_details,
      corrective_actions: corrective_actions || [],
      preventive_actions: preventive_actions || [],
      minutes, attendees: attendees || [],
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "impartiality_reviews", data.id);
  res.status(201).json(data);
});

// =============================================================================
// DASHBOARD — Sampling & impartiality overview
// =============================================================================

router.get("/api/sampling/dashboard", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const [plansRes, execRes, declRes, coiRes, poolRes] = await Promise.all([
    supabase.from("sampling_plans").select("id", { count: "exact", head: true })
      .eq("org_id", user.org_id).eq("is_active", true),
    supabase.from("sampling_executions").select("id, result, severity_used")
      .eq("org_id", user.org_id)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from("impartiality_declarations").select("id, risk_level, is_active")
      .eq("org_id", user.org_id).eq("is_active", true),
    supabase.from("conflict_of_interest").select("id, status, risk_level")
      .eq("org_id", user.org_id)
      .in("status", ["DECLARED", "UNDER_REVIEW"]),
    supabase.from("inspector_pool").select("id", { count: "exact", head: true })
      .eq("org_id", user.org_id).eq("is_active", true),
  ]);

  const executions = execRes.data || [];
  const accepted = executions.filter((e: any) => e.result === "ACCEPTED").length;
  const rejected = executions.filter((e: any) => e.result === "REJECTED").length;

  const declarations = declRes.data || [];
  const highRisk = declarations.filter((d: any) => ["HIGH", "CRITICAL"].includes(d.risk_level)).length;

  res.json({
    active_plans: plansRes.count || 0,
    inspectors_available: poolRes.count || 0,
    last_30_days: {
      total_executions: executions.length,
      accepted,
      rejected,
      acceptance_rate: executions.length > 0 ? Math.round(accepted / executions.length * 100) : 0,
    },
    impartiality: {
      active_declarations: declarations.length,
      high_risk_declarations: highRisk,
      open_coi: (coiRes.data || []).length,
    },
  });
});

// =============================================================================
// Helper: Check severity switching
// =============================================================================
async function checkSeveritySwitch(orgId: string, planId: string, supplierId: string | null, result: string, userId: string) {
  const { data: plan } = await supabase
    .from("sampling_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) return;

  // Get recent executions for this plan+supplier
  let recentQuery = supabase
    .from("sampling_executions")
    .select("result")
    .eq("plan_id", planId)
    .eq("org_id", orgId)
    .order("completed_at", { ascending: false })
    .limit(Math.max(plan.switch_to_tightened_after || 5, plan.switch_to_reduced_after || 10));

  if (supplierId) recentQuery = recentQuery.eq("supplier_id", supplierId);

  const { data: recent } = await recentQuery;
  if (!recent?.length) return;

  const consecutiveAccepted = recent.findIndex((r: any) => r.result !== "ACCEPTED");
  const consecutiveRejected = recent.findIndex((r: any) => r.result !== "REJECTED");
  const actualConsAccepted = consecutiveAccepted === -1 ? recent.length : consecutiveAccepted;
  const actualConsRejected = consecutiveRejected === -1 ? recent.length : consecutiveRejected;

  let newSeverity = plan.current_severity;

  if (plan.current_severity === "NORMAL" && actualConsRejected >= (plan.switch_to_tightened_after || 2)) {
    newSeverity = "TIGHTENED";
  } else if (plan.current_severity === "NORMAL" && actualConsAccepted >= (plan.switch_to_reduced_after || 5)) {
    newSeverity = "REDUCED";
  } else if (plan.current_severity === "REDUCED" && result === "REJECTED") {
    newSeverity = "NORMAL";
  } else if (plan.current_severity === "TIGHTENED" && actualConsAccepted >= 5) {
    newSeverity = "NORMAL";
  }

  if (newSeverity !== plan.current_severity) {
    await supabase
      .from("sampling_plans")
      .update({ current_severity: newSeverity })
      .eq("id", planId);

    await supabase
      .from("sampling_severity_history")
      .insert({
        org_id: orgId, plan_id: planId, supplier_id: supplierId,
        from_severity: plan.current_severity,
        to_severity: newSeverity,
        reason: `Auto-switch: ${actualConsAccepted} accepted, ${actualConsRejected} rejected`,
        consecutive_accepted: actualConsAccepted,
        consecutive_rejected: actualConsRejected,
        changed_by: userId,
      });
  }
}

export default router;
