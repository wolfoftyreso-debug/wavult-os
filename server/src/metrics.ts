// ---------------------------------------------------------------------------
// Universal Metrics Layer — Engine + API
// ISO 9.1 — Monitoring, measurement, analysis and evaluation
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Metric Engine — Core Functions (exported for use by event subscribers)
// ---------------------------------------------------------------------------

// Cache metric definition lookups
const metricDefCache: Record<string, any> = {};

async function getMetricDef(code: string): Promise<any> {
  if (metricDefCache[code]) return metricDefCache[code];
  const { data } = await supabase.from("metric_definitions").select("*").eq("code", code).eq("is_active", true).single();
  if (data) metricDefCache[code] = data;
  return data;
}

/**
 * Record a data point — called by event subscribers on every action
 */
export async function recordDataPoint(
  orgId: string,
  metricCode: string,
  value: number,
  dimensions?: Record<string, any>,
  eventType?: string
): Promise<void> {
  const def = await getMetricDef(metricCode);
  if (!def) return;

  await supabase.from("metric_data_points").insert({
    org_id: orgId,
    metric_id: def.id,
    value,
    dimensions: dimensions ?? {},
    event_type: eventType,
    entity_type: dimensions?.entity_type,
    entity_id: dimensions?.entity_id,
    user_id: dimensions?.user_id,
  });
}

/**
 * Calculate status (GREEN/YELLOW/RED) based on thresholds
 */
export function calculateStatus(value: number, def: any): string {
  if (def.default_target === null && def.default_target === undefined) return "GRAY";

  const target = Number(def.default_target);
  if (def.threshold_direction === "HIGHER_IS_BETTER") {
    if (value >= target * 0.9) return "GREEN";
    if (value >= target * 0.7) return "YELLOW";
    return "RED";
  } else if (def.threshold_direction === "LOWER_IS_BETTER") {
    if (target === 0) {
      if (value === 0) return "GREEN";
      if (value <= 2) return "YELLOW";
      return "RED";
    }
    if (value <= target * 1.1) return "GREEN";
    if (value <= target * 1.5) return "YELLOW";
    return "RED";
  }
  // TARGET_IS_BEST
  const diff = Math.abs(value - target);
  const pct = target !== 0 ? diff / Math.abs(target) : diff;
  if (pct <= 0.1) return "GREEN";
  if (pct <= 0.3) return "YELLOW";
  return "RED";
}

/**
 * Calculate a single metric for an org and period
 */
export async function calculateMetric(
  orgId: string,
  metricCode: string,
  periodType: string = "MONTHLY",
  periodStart?: Date
): Promise<any> {
  const def = await getMetricDef(metricCode);
  if (!def) return null;

  const now = new Date();
  const start = periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;

  // Get data points in period
  const { data: points } = await supabase
    .from("metric_data_points")
    .select("value, dimensions, recorded_at")
    .eq("org_id", orgId)
    .eq("metric_id", def.id)
    .gte("recorded_at", start.toISOString())
    .lte("recorded_at", end.toISOString());

  const pts = points ?? [];
  let value = 0;

  switch (def.aggregation_type) {
    case "COUNT":
      value = pts.length;
      break;
    case "SUM":
      value = pts.reduce((s, p) => s + Number(p.value), 0);
      break;
    case "AVG":
      value = pts.length > 0 ? pts.reduce((s, p) => s + Number(p.value), 0) / pts.length : 0;
      break;
    case "MIN":
      value = pts.length > 0 ? Math.min(...pts.map(p => Number(p.value))) : 0;
      break;
    case "MAX":
      value = pts.length > 0 ? Math.max(...pts.map(p => Number(p.value))) : 0;
      break;
    case "LATEST":
      value = pts.length > 0 ? Number(pts[pts.length - 1].value) : 0;
      break;
    case "PERCENTAGE": {
      // Numerator = data points count, denominator from source query
      if (def.source_entity_type) {
        const { count: total } = await supabase
          .from(def.source_entity_type)
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId);
        value = (total && total > 0) ? (pts.length / total) * 100 : 0;
      }
      break;
    }
    case "RATE":
    case "RATIO":
    case "TREND":
      value = pts.length > 0 ? pts.reduce((s, p) => s + Number(p.value), 0) / pts.length : 0;
      break;
  }

  // Previous value
  const prevStart = new Date(start.getTime() - 30 * 86400000);
  const { data: prev } = await supabase
    .from("metric_values")
    .select("value")
    .eq("org_id", orgId)
    .eq("metric_id", def.id)
    .lt("period_start", start.toISOString().slice(0, 10))
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousValue = prev ? Number(prev.value) : null;
  const changePct = previousValue && previousValue !== 0
    ? Math.round(((value - previousValue) / Math.abs(previousValue)) * 10000) / 100
    : null;
  const trend = changePct === null ? "NEW" : changePct > 5 ? "UP" : changePct < -5 ? "DOWN" : "STABLE";
  const status = calculateStatus(value, def);

  // Breakdown by dimensions
  const breakdown: Record<string, number> = {};
  for (const p of pts) {
    const dims = p.dimensions as Record<string, any> ?? {};
    for (const [k, v] of Object.entries(dims)) {
      if (v && typeof v === "string") {
        const bk = `${k}:${v}`;
        breakdown[bk] = (breakdown[bk] ?? 0) + Number(p.value);
      }
    }
  }

  // Upsert
  const { data: upserted } = await supabase.from("metric_values").upsert({
    org_id: orgId,
    metric_id: def.id,
    period_type: periodType,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    value: Math.round(value * 10000) / 10000,
    previous_value: previousValue,
    change_pct: changePct,
    trend,
    status,
    data_points: pts.length,
    breakdown,
    calculated_at: new Date().toISOString(),
  }, { onConflict: "org_id,metric_id,period_type,period_start" }).select().single();

  return upserted;
}

/**
 * Calculate all active metrics for an org
 */
export async function calculateAllMetrics(orgId: string): Promise<any[]> {
  const { data: defs } = await supabase.from("metric_definitions").select("code").eq("is_active", true);
  const results: any[] = [];
  for (const def of defs ?? []) {
    try {
      const r = await calculateMetric(orgId, def.code);
      if (r) results.push(r);
    } catch (err: any) {
      console.warn(`[metrics] Failed ${def.code}: ${err.message}`);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

// GET /api/metrics — all metric definitions
router.get("/api/metrics", async (req: Request, res: Response) => {
  try {
    const { module, category, is_active } = req.query;
    let q = supabase.from("metric_definitions").select("*");
    if (module) q = q.eq("module", module as string);
    if (category) q = q.eq("category", category as string);
    if (is_active !== undefined) q = q.eq("is_active", is_active === "true");
    const { data, error } = await q.order("module").order("code");
    if (error) throw error;
    return res.json({ metrics: data ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/summary — all metrics latest value + status
router.get("/api/metrics/summary", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    const { data: values } = await supabase
      .from("metric_values")
      .select("*, metric_definitions!metric_id(code, name, unit, module, category, display_as)")
      .eq("org_id", org_id as string)
      .order("calculated_at", { ascending: false });

    // Deduplicate: latest per metric
    const latest: Record<string, any> = {};
    for (const v of values ?? []) {
      const code = (v as any).metric_definitions?.code;
      if (code && !latest[code]) latest[code] = v;
    }

    const metrics = Object.values(latest).map((v: any) => ({
      code: v.metric_definitions?.code,
      name: v.metric_definitions?.name,
      value: v.value,
      status: v.status,
      trend: v.trend,
      change_pct: v.change_pct,
      unit: v.metric_definitions?.unit,
      module: v.metric_definitions?.module,
    }));

    return res.json({ metrics });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/alerts — all RED metrics
router.get("/api/metrics/alerts", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.query;
    let q = supabase.from("metric_values")
      .select("*, metric_definitions!metric_id(code, name, action_if_red, module)")
      .eq("status", "RED")
      .order("calculated_at", { ascending: false });
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data, error } = await q;
    if (error) throw error;

    // Deduplicate
    const seen = new Set<string>();
    const alerts = (data ?? []).filter((v: any) => {
      const key = `${v.org_id}-${v.metric_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json({ alerts });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/:code — specific metric with latest values
router.get("/api/metrics/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { org_id } = req.query;
    const { data: def, error: defErr } = await supabase.from("metric_definitions").select("*").eq("code", code).single();
    if (defErr || !def) return res.status(404).json({ error: "Metric not found" });

    let valQ = supabase.from("metric_values").select("*").eq("metric_id", def.id).order("period_start", { ascending: false }).limit(12);
    if (org_id) valQ = valQ.eq("org_id", org_id as string);
    const { data: values } = await valQ;

    return res.json({ definition: def, values: values ?? [] });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/:code/history
router.get("/api/metrics/:code/history", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { org_id, periods = "12", period_type = "MONTHLY" } = req.query;
    const def = await getMetricDef(code);
    if (!def) return res.status(404).json({ error: "Metric not found" });

    let q = supabase.from("metric_values").select("*")
      .eq("metric_id", def.id)
      .eq("period_type", period_type as string)
      .order("period_start", { ascending: false })
      .limit(Number(periods));
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ metric: code, history: (data ?? []).reverse() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/:code/breakdown
router.get("/api/metrics/:code/breakdown", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { org_id, dimension = "user_id" } = req.query;
    const def = await getMetricDef(code);
    if (!def) return res.status(404).json({ error: "Metric not found" });

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    let q = supabase.from("metric_data_points").select("value, dimensions, user_id")
      .eq("metric_id", def.id)
      .gte("recorded_at", since);
    if (org_id) q = q.eq("org_id", org_id as string);
    const { data: points } = await q;

    // Group by dimension
    const groups: Record<string, { sum: number; count: number }> = {};
    for (const p of points ?? []) {
      const dimVal = dimension === "user_id"
        ? p.user_id
        : (p.dimensions as Record<string, any>)?.[dimension as string];
      const key = String(dimVal ?? "unknown");
      if (!groups[key]) groups[key] = { sum: 0, count: 0 };
      groups[key].sum += Number(p.value);
      groups[key].count++;
    }

    const breakdown = Object.entries(groups).map(([key, val]) => ({
      dimension: dimension, key, sum: val.sum, count: val.count, avg: val.sum / val.count,
    }));

    return res.json({ metric: code, dimension, breakdown });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/dashboard/:roleCode — widgets for role
router.get("/api/metrics/dashboard/:roleCode", async (req: Request, res: Response) => {
  try {
    const { roleCode } = req.params;
    const { org_id } = req.query;

    const { data: widgets } = await supabase.from("dashboard_widgets")
      .select("*")
      .eq("role_code", roleCode)
      .eq("is_visible", true)
      .order("layout_row").order("layout_position");

    if (!widgets || !org_id) return res.json({ widgets: widgets ?? [] });

    // Enrich with latest metric values
    const enriched = [];
    for (const w of widgets) {
      const metricConfigs = w.metrics as any[] ?? [];
      const metricValues: any[] = [];

      for (const mc of metricConfigs) {
        const def = await getMetricDef(mc.metric_code);
        if (!def) continue;

        const { data: val } = await supabase.from("metric_values")
          .select("value, status, trend, change_pct")
          .eq("org_id", org_id as string)
          .eq("metric_id", def.id)
          .order("calculated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        metricValues.push({
          code: mc.metric_code,
          label: mc.label ?? def.name,
          display_as: mc.display_as ?? def.display_as,
          value: val?.value ?? null,
          status: val?.status ?? "GRAY",
          trend: val?.trend ?? null,
          change_pct: val?.change_pct ?? null,
          unit: def.unit,
        });
      }

      enriched.push({ ...w, metric_values: metricValues });
    }

    return res.json({ widgets: enriched });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// POST /api/metrics/:code/target — set org-specific target
router.post("/api/metrics/:code/target", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { org_id, target, threshold_green, threshold_yellow, threshold_red } = req.body;
    if (!org_id) return res.status(400).json({ error: "org_id required" });

    const def = await getMetricDef(code);
    if (!def) return res.status(404).json({ error: "Metric not found" });

    // Update the metric definition (org-scoped overrides could be separate table, but we'll update directly for simplicity)
    const updates: Record<string, any> = {};
    if (target !== undefined) updates.default_target = target;
    if (threshold_green !== undefined) updates.default_threshold_green = threshold_green;
    if (threshold_yellow !== undefined) updates.default_threshold_yellow = threshold_yellow;
    if (threshold_red !== undefined) updates.default_threshold_red = threshold_red;

    const { data, error } = await supabase.from("metric_definitions").update(updates).eq("id", def.id).select().single();
    if (error) throw error;
    // Clear cache
    delete metricDefCache[code];
    return res.json({ metric: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// POST /api/metrics/:code/decision — log decision
router.post("/api/metrics/:code/decision", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const { code } = req.params;
    const { org_id, decision_type, title, rationale, resulting_entity_type, resulting_entity_id } = req.body;

    const def = await getMetricDef(code);
    if (!def) return res.status(404).json({ error: "Metric not found" });

    // Get latest value
    const { data: latestVal } = await supabase.from("metric_values")
      .select("id")
      .eq("metric_id", def.id)
      .eq("org_id", org_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase.from("metric_decisions").insert({
      org_id, metric_id: def.id, metric_value_id: latestVal?.id,
      decision_type, title, rationale,
      decided_by: user.id,
      resulting_entity_type, resulting_entity_id,
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ decision: data });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
