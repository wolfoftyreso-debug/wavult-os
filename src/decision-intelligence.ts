// ---------------------------------------------------------------------------
// Unified Decision Intelligence
// ISO 9.1.3, 9.3 — Analysis, evaluation, management review
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Decision Intelligence Engine (exported for use by other modules)
// ---------------------------------------------------------------------------

/**
 * Get all entities related to a given entity via entity_relations table
 */
export async function getRelatedEntities(
  entityId: string,
  maxDepth: number = 3
): Promise<any[]> {
  const visited = new Set<string>();
  const results: any[] = [];

  async function traverse(currentId: string, depth: number) {
    if (depth > maxDepth || visited.has(currentId)) return;
    visited.add(currentId);

    // Get outgoing relations
    const { data: outgoing } = await supabase
      .from("entity_relations")
      .select("to_entity_id, to_entity_type, relation_type")
      .eq("from_entity_id", currentId);

    // Get incoming relations
    const { data: incoming } = await supabase
      .from("entity_relations")
      .select("from_entity_id, from_entity_type, relation_type")
      .eq("to_entity_id", currentId);

    for (const rel of outgoing ?? []) {
      results.push({
        entity_id: rel.to_entity_id,
        entity_type: rel.to_entity_type,
        relation: rel.relation_type,
        direction: "outgoing",
        depth,
      });
      await traverse(rel.to_entity_id, depth + 1);
    }

    for (const rel of incoming ?? []) {
      results.push({
        entity_id: rel.from_entity_id,
        entity_type: rel.from_entity_type,
        relation: rel.relation_type,
        direction: "incoming",
        depth,
      });
      await traverse(rel.from_entity_id, depth + 1);
    }
  }

  await traverse(entityId, 1);
  return results;
}

/**
 * Calculate impact of an action on an entity
 */
export async function calculateImpact(
  orgId: string,
  entityType: string,
  entityId: string,
  action?: string
): Promise<any> {
  const related = await getRelatedEntities(entityId, 3);

  const impact = {
    affected_customers: 0,
    affected_processes: [] as string[],
    affected_suppliers: [] as string[],
    affected_users: [] as string[],
    financial_impact_eur: 0,
    risk_score_change: 0,
    compliance_impact: [] as string[],
    total_related: related.length,
  };

  for (const rel of related) {
    switch (rel.entity_type) {
      case "company":
      case "COMPANY":
        impact.affected_customers++;
        break;
      case "process":
      case "PROCESS":
        if (!impact.affected_processes.includes(rel.entity_id))
          impact.affected_processes.push(rel.entity_id);
        break;
      case "supplier":
      case "SUPPLIER":
        if (!impact.affected_suppliers.includes(rel.entity_id))
          impact.affected_suppliers.push(rel.entity_id);
        break;
      case "profile":
      case "USER":
        if (!impact.affected_users.includes(rel.entity_id))
          impact.affected_users.push(rel.entity_id);
        break;
    }
  }

  // Check compliance impact
  if (entityType === "supplier" && action === "suspend") {
    impact.compliance_impact.push("8.4.1 — Kontroll av externt levererade processer påverkas");
    const { data: outsourced } = await supabase.from("outsourced_processes")
      .select("id").eq("supplier_id", entityId).eq("status", "ACTIVE");
    if (outsourced && outsourced.length > 0) {
      impact.compliance_impact.push(`${outsourced.length} outsourcade processer påverkas direkt`);
    }
  }
  if (entityType === "non_conformance") {
    const { data: nc } = await supabase.from("non_conformances")
      .select("severity, process_id").eq("id", entityId).single();
    if (nc?.severity === "CRITICAL") impact.risk_score_change += 5;
    else if (nc?.severity === "MAJOR") impact.risk_score_change += 3;
  }

  return impact;
}

/**
 * Find similar previous decisions
 */
export async function findSimilarDecisions(
  orgId: string,
  entityType: string,
  contextData: Record<string, any>
): Promise<any[]> {
  // Find decisions on same entity type
  const { data: decisions } = await supabase
    .from("decisions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Simple similarity: same entity type
  const similar = (decisions ?? []).filter((d: any) => {
    const meta = d.metadata ?? {};
    return meta.entity_type === entityType;
  }).slice(0, 5);

  return similar.map((d: any) => ({
    decision_id: d.id,
    title: d.title,
    outcome: d.status,
    decided_at: d.created_at,
  }));
}

/**
 * Build complete decision context
 */
export async function buildDecisionContext(
  orgId: string,
  entityType: string,
  entityId: string,
  contextType: string
): Promise<any> {
  // 1. Get entity
  const tableMap: Record<string, string> = {
    nc: "non_conformances", non_conformance: "non_conformances",
    complaint: "complaints", deal: "deals", task: "tasks",
    supplier: "suppliers", agreement: "agreements", improvement: "improvements",
    asset: "assets", risk: "risks",
  };
  const table = tableMap[entityType] ?? entityType;
  const { data: entity } = await supabase.from(table).select("*").eq("id", entityId).single();

  // 2. Related entities
  const related = await getRelatedEntities(entityId, 3);

  // 3. Relevant metrics
  const metricMap: Record<string, string[]> = {
    nc: ["NC_OPEN_COUNT", "NC_AVG_CLOSE_DAYS", "NC_REPEAT_RATE"],
    complaint: ["COMPLAINT_COUNT", "COMPLAINT_SLA_BREACH_RATE", "NPS_SCORE"],
    deal: ["DEAL_CONVERSION_RATE", "DEAL_PIPELINE_VALUE", "MRR"],
    supplier: ["SUPPLIER_AVG_RATING", "SUPPLIER_ON_WATCH_COUNT"],
    task: ["TASK_COMPLETION_RATE", "TASK_OVERDUE_COUNT"],
    asset: ["CALIBRATION_OVERDUE_COUNT", "MAINTENANCE_OVERDUE_COUNT"],
  };
  const metricCodes = metricMap[entityType] ?? [];
  const metrics: any[] = [];
  for (const code of metricCodes) {
    const { data: val } = await supabase.from("metric_values")
      .select("value, status, trend, change_pct, metric_definitions!metric_id(code, name)")
      .eq("org_id", orgId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (val) metrics.push(val);
  }

  // 4. Impact analysis
  const impact = await calculateImpact(orgId, entityType, entityId);

  // 5. Similar decisions
  const similar = await findSimilarDecisions(orgId, entityType, { entity });

  // 6. Save context
  const contextData = {
    entity,
    related_entities: related.slice(0, 20),
    metrics,
    impact_analysis: impact,
    similar_decisions: similar,
    recommendations: [],
  };

  const { data: ctx } = await supabase.from("decision_contexts").insert({
    org_id: orgId,
    entity_type: entityType,
    entity_id: entityId,
    context_type: contextType,
    context_data: contextData,
    expires_at: new Date(Date.now() + 5 * 60000).toISOString(), // 5 min cache
  }).select().single();

  return ctx;
}

/**
 * Detect patterns in org data
 */
export async function detectPatterns(orgId: string): Promise<any[]> {
  const patterns: any[] = [];

  // Pattern 1: Repeat NCs in same process (3+ in 90 days)
  let ncByProcess: any = null;
  try {
    const res = await supabase.rpc("count_nc_by_process_90d", { p_org_id: orgId });
    ncByProcess = res.data;
  } catch { /* RPC may not exist yet */ }
  // Fallback: direct query
  if (!ncByProcess) {
    const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: ncs } = await supabase
      .from("non_conformances")
      .select("process_id")
      .eq("org_id", orgId)
      .gte("created_at", ninetyAgo);

    const processCounts: Record<string, number> = {};
    for (const nc of ncs ?? []) {
      if (nc.process_id) processCounts[nc.process_id] = (processCounts[nc.process_id] ?? 0) + 1;
    }
    for (const [pid, count] of Object.entries(processCounts)) {
      if (count >= 3) {
        patterns.push({
          pattern_type: "REPEAT_NC",
          title: `Upprepade avvikelser i process`,
          description: `${count} NC senaste 90 dagarna i samma process. Systemiskt problem.`,
          severity: count >= 5 ? "HIGH" : "MEDIUM",
          entity_ids: [pid],
          entity_types: ["process"],
          metrics: { nc_count: count },
        });
      }
    }
  }

  // Pattern 2: NPS declining 3 months
  const { data: npsValues } = await supabase
    .from("metric_values")
    .select("value, trend, period_start")
    .eq("org_id", orgId)
    .eq("period_type", "MONTHLY")
    .order("period_start", { ascending: false })
    .limit(3);

  if (npsValues && npsValues.length >= 3) {
    const allDown = npsValues.every((v: any) => v.trend === "DOWN");
    if (allDown) {
      patterns.push({
        pattern_type: "NPS_DECLINE",
        title: "NPS sjunker 3 månader i rad",
        description: `Kundnöjdheten har sjunkit konsekutivt. Aktuellt: ${npsValues[0].value}`,
        severity: "HIGH",
        metrics: { current_nps: npsValues[0].value },
      });
    }
  }

  // Pattern 3: Supplier risk accumulation
  const { data: onWatch } = await supabase
    .from("suppliers")
    .select("id, supplier_code")
    .eq("org_id", orgId)
    .eq("status", "ON_WATCH");

  if (onWatch && onWatch.length >= 3) {
    patterns.push({
      pattern_type: "SUPPLIER_RISK_ACCUMULATION",
      title: `${onWatch.length} leverantörer under observation`,
      description: "Flera leverantörer samtidigt under observation — systemisk leverantörsrisk.",
      severity: "HIGH",
      entity_ids: onWatch.map((s: any) => s.id),
      entity_types: onWatch.map(() => "supplier"),
    });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

// Graph: get entity relationship graph
router.get("/api/intelligence/graph/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { depth = "3" } = req.query;
    const related = await getRelatedEntities(entityId, Number(depth));

    // Build nodes and edges
    const nodeIds = new Set<string>([entityId]);
    const edges: any[] = [];

    for (const rel of related) {
      nodeIds.add(rel.entity_id);
      edges.push({
        from: rel.direction === "outgoing" ? entityId : rel.entity_id,
        to: rel.direction === "outgoing" ? rel.entity_id : entityId,
        type: rel.relation,
      });
    }

    // Fetch node details
    const nodes: any[] = [];
    for (const nid of nodeIds) {
      const { data: entity } = await supabase
        .from("entities")
        .select("id, type, title, status")
        .eq("id", nid)
        .maybeSingle();
      if (entity) nodes.push(entity);
      else nodes.push({ id: nid, type: "unknown", title: nid });
    }

    return res.json({ nodes, edges, total_relations: related.length });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Impact simulation
router.get("/api/intelligence/impact/:entityType/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { action, org_id } = req.query;
    const impact = await calculateImpact(org_id as string ?? "", entityType, entityId, action as string);
    return res.json({ impact });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Pattern detection
router.get("/api/intelligence/patterns", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    // Get stored patterns
    const { data: stored } = await supabase.from("pattern_detections")
      .select("*").eq("org_id", org_id as string).eq("acknowledged", false)
      .order("detected_at", { ascending: false });

    return res.json({ patterns: stored ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Acknowledge a pattern
router.post("/api/intelligence/patterns/:id/acknowledge", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { resulting_action_type, resulting_action_id } = req.body;
    const { data, error } = await supabase.from("pattern_detections").update({
      acknowledged: true, acknowledged_by: user.id, acknowledged_at: new Date().toISOString(),
      resulting_action_type, resulting_action_id,
    }).eq("id", req.params.id).select().single();
    if (error) throw error;
    return res.json({ pattern: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Role-specific recommendations
router.get("/api/intelligence/recommendations/:roleCode", async (req: Request, res: Response) => {
  try {
    const { roleCode } = req.params;
    const { org_id } = req.query;
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    // Get RED metrics for this role's dashboard
    const { data: widgets } = await supabase.from("dashboard_widgets")
      .select("metrics").eq("role_code", roleCode);

    const metricCodes = (widgets ?? []).flatMap((w: any) =>
      (w.metrics as any[] ?? []).map((m: any) => m.metric_code)
    );

    const recommendations: any[] = [];

    for (const code of [...new Set(metricCodes)]) {
      const { data: def } = await supabase.from("metric_definitions")
        .select("code, name, action_if_red, action_if_yellow, decision_context").eq("code", code).single();
      if (!def) continue;

      const { data: val } = await supabase.from("metric_values")
        .select("value, status, trend")
        .eq("org_id", org_id as string)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (val?.status === "RED") {
        recommendations.push({
          priority: "HIGH", metric: def.code, name: def.name,
          status: "RED", value: val.value, trend: val.trend,
          recommendation: def.action_if_red, context: def.decision_context,
        });
      } else if (val?.status === "YELLOW") {
        recommendations.push({
          priority: "MEDIUM", metric: def.code, name: def.name,
          status: "YELLOW", value: val.value, trend: val.trend,
          recommendation: def.action_if_yellow, context: def.decision_context,
        });
      }
    }

    recommendations.sort((a, b) => (a.priority === "HIGH" ? -1 : 1));
    return res.json({ role: roleCode, recommendations });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Decision context for an entity
router.get("/api/intelligence/context/:entityType/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { org_id } = req.query;
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    // Check cache
    const { data: cached } = await supabase.from("decision_contexts")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      // Mark as viewed
      const user = (req as any).user;
      if (user?.id) {
        const viewedBy = cached.viewed_by ?? [];
        if (!viewedBy.includes(user.id)) {
          await supabase.from("decision_contexts").update({ viewed_by: [...viewedBy, user.id] }).eq("id", cached.id);
        }
      }
      return res.json({ context: cached, cached: true });
    }

    // Build fresh
    const ctx = await buildDecisionContext(org_id as string, entityType, entityId, "REVIEW");
    return res.json({ context: ctx, cached: false });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// What-if simulation
router.post("/api/intelligence/what-if", async (req: Request, res: Response) => {
  try {
    const { org_id, entity_type, entity_id, action, params } = req.body;
    const impact = await calculateImpact(org_id, entity_type, entity_id, action);
    return res.json({ action, impact, warning: impact.compliance_impact.length > 0 ? "Compliance-påverkan detekterad" : null });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Decision history similar to entity
router.get("/api/intelligence/decisions/history", async (req: Request, res: Response) => {
  try {
    const { org_id, entity_type, limit = "10" } = req.query;
    const similar = await findSimilarDecisions(org_id as string, entity_type as string, {});
    return res.json({ decisions: similar });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
