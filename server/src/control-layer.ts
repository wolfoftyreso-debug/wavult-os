// ---------------------------------------------------------------------------
// Control Layer — The Live Operational Map
// "If you can see the flow, you can control the outcome."
// ---------------------------------------------------------------------------
// GET  /api/control/live-map        — current state of ALL resources
// GET  /api/control/flow-analysis   — flow efficiency metrics
// GET  /api/control/bottlenecks     — active bottlenecks + historical patterns
// POST /api/control/investigate/:id — trigger automated RCA
// POST /api/control/feedback/:id    — submit feedback on an investigation
// GET  /api/control/improvements    — improvement actions from RCAs
// POST /api/control/detect          — manually trigger bottleneck detection
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const orgId = (req: Request): string => (req as any).user?.org_id;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minutesSince(ts: string | null | undefined): number {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

// Expected minutes per workshop step (baseline — will be replaced by operational_patterns over time)
const STEP_BASELINES: Record<string, number> = {
  INTAKE:     15,
  ASSESSMENT: 30,
  PARTS:      45,
  REPAIR:    120,
  QC:         20,
  DELIVERY:   10,
};

// ---------------------------------------------------------------------------
// GET /api/control/live-map
// Returns: all work orders, vehicles, technicians and their current state
// ---------------------------------------------------------------------------
router.get("/api/control/live-map", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);

    // Fetch active work orders with current step info
    const { data: workOrders, error: woErr } = await supabase
      .from("work_orders")
      .select(`
        id, order_number, status, current_step, step_started_at,
        priority, work_type, technician_id, technician_name,
        vehicle_id, vehicle_reg, vehicle_make, vehicle_model,
        estimated_completion_at, created_at, org_id
      `)
      .eq("org_id", oid)
      .in("status", ["IN_PROGRESS", "WAITING_PARTS", "QC", "CHECKED_IN", "BOOKED", "PREPLANNED"])
      .order("priority", { ascending: false });

    if (woErr) throw woErr;

    // Fetch technicians
    const { data: technicians } = await supabase
      .from("technicians")
      .select("id, name, role, status, current_work_order_id, utilization_pct, org_id")
      .eq("org_id", oid)
      .eq("is_active", true);

    // Fetch vehicles currently on premises
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, reg_number, make, model, location, arrived_at, org_id")
      .eq("org_id", oid)
      .not("location", "is", null);

    // Get operational patterns for this org (learned baselines)
    const { data: patterns } = await supabase
      .from("operational_patterns")
      .select("pattern_type, entity_type, baseline_minutes, observed_avg_minutes, deviation_pct")
      .eq("org_id", oid);

    // Build step baselines from learned patterns (fallback to defaults)
    const learnedBaselines: Record<string, number> = { ...STEP_BASELINES };
    if (patterns) {
      for (const p of patterns) {
        if (p.pattern_type === "STEP_DURATION" && p.entity_type && p.baseline_minutes) {
          learnedBaselines[p.entity_type] = p.baseline_minutes;
        }
      }
    }

    // Enrich work orders with delay info
    const enrichedOrders = (workOrders ?? []).map((wo: any) => {
      const step = wo.current_step ?? "REPAIR";
      const expected = learnedBaselines[step] ?? 60;
      const timeInStep = minutesSince(wo.step_started_at);
      const isDelayed = timeInStep > expected * 1.2;
      const overPct = isDelayed ? Math.round((timeInStep / expected - 1) * 100) : 0;
      return { ...wo, timeInStep, expected, isDelayed, overPct };
    });

    // Group by step for flow map
    const flowColumns: Record<string, { items: any[]; avgTime: number; expectedTime: number; isSlower: boolean; overPct: number }> = {};
    const STEPS = ["BOOKED", "CHECKED_IN", "ASSESSMENT", "PARTS", "REPAIR", "QC", "DELIVERY"];

    for (const step of STEPS) {
      const items = enrichedOrders.filter((wo: any) => wo.current_step === step || wo.status === step);
      const avgTime = items.length > 0
        ? Math.round(items.reduce((s: number, i: any) => s + i.timeInStep, 0) / items.length)
        : 0;
      const expected = learnedBaselines[step] ?? 60;
      const isSlower = avgTime > expected * 1.15;
      const overPct = isSlower ? Math.round((avgTime / expected - 1) * 100) : 0;
      flowColumns[step] = { items, avgTime, expectedTime: expected, isSlower, overPct };
    }

    // Active bottlenecks
    const { data: bottlenecks } = await supabase
      .from("flow_bottlenecks")
      .select("*")
      .eq("org_id", oid)
      .eq("status", "ACTIVE")
      .order("detected_at", { ascending: false })
      .limit(10);

    res.json({
      flowColumns,
      allWorkOrders: enrichedOrders,
      technicians: technicians ?? [],
      vehicles: vehicles ?? [],
      activeBottlenecks: bottlenecks ?? [],
      baselines: learnedBaselines,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[control/live-map]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/control/flow-analysis
// Returns: efficiency metrics, queue depths, throughput
// ---------------------------------------------------------------------------
router.get("/api/control/flow-analysis", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 86400000).toISOString();

    // Completed work orders in period
    const { data: completed } = await supabase
      .from("work_orders")
      .select("id, created_at, completed_at, work_type, technician_id, step_durations")
      .eq("org_id", oid)
      .eq("status", "COMPLETED")
      .gte("completed_at", since);

    // Active orders for current queue state
    const { data: active } = await supabase
      .from("work_orders")
      .select("id, current_step, step_started_at, technician_id")
      .eq("org_id", oid)
      .in("status", ["IN_PROGRESS", "WAITING_PARTS", "QC", "CHECKED_IN"]);

    // Technician utilization
    const { data: techs } = await supabase
      .from("technicians")
      .select("id, name, utilization_pct, active_orders_count")
      .eq("org_id", oid)
      .eq("is_active", true);

    // Step time analysis from completed orders
    const stepTimes: Record<string, number[]> = {};
    for (const wo of (completed ?? [])) {
      if (wo.step_durations && typeof wo.step_durations === "object") {
        for (const [step, mins] of Object.entries(wo.step_durations)) {
          if (!stepTimes[step]) stepTimes[step] = [];
          stepTimes[step].push(Number(mins));
        }
      }
    }
    const stepAnalysis = Object.entries(stepTimes).map(([step, times]) => {
      const avg = times.reduce((s, t) => s + t, 0) / times.length;
      const baseline = STEP_BASELINES[step] ?? 60;
      return { step, avgMinutes: Math.round(avg), baseline, deviationPct: Math.round((avg / baseline - 1) * 100) };
    });

    // Queue depth by step
    const queueDepth: Record<string, number> = {};
    for (const wo of (active ?? [])) {
      const step = wo.current_step ?? "UNKNOWN";
      queueDepth[step] = (queueDepth[step] ?? 0) + 1;
    }

    // Throughput: jobs completed per day
    const throughputPerDay = completed && Number(days) > 0
      ? Math.round((completed.length / Number(days)) * 10) / 10
      : 0;

    // Avg lead time
    const leadTimes = (completed ?? [])
      .filter((wo: any) => wo.created_at && wo.completed_at)
      .map((wo: any) => (new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime()) / 60000);
    const avgLeadTime = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((s, t) => s + t, 0) / leadTimes.length)
      : null;

    // Bottleneck frequency by step (last 30 days)
    const { data: botFreq } = await supabase
      .from("flow_bottlenecks")
      .select("location, bottleneck_type, severity")
      .eq("org_id", oid)
      .gte("detected_at", since);

    const bottleneckFrequency: Record<string, number> = {};
    for (const b of (botFreq ?? [])) {
      const key = b.location ?? "UNKNOWN";
      bottleneckFrequency[key] = (bottleneckFrequency[key] ?? 0) + 1;
    }

    res.json({
      period: { days: Number(days), since },
      throughputPerDay,
      avgLeadTimeMinutes: avgLeadTime,
      stepAnalysis,
      queueDepth,
      bottleneckFrequency,
      technicianUtilization: (techs ?? []).map((t: any) => ({
        id: t.id, name: t.name,
        utilizationPct: t.utilization_pct ?? 0,
        activeOrders: t.active_orders_count ?? 0,
      })),
      completedCount: completed?.length ?? 0,
    });
  } catch (err: any) {
    console.error("[control/flow-analysis]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/control/bottlenecks
// Returns: active bottlenecks + recent resolved + historical patterns
// ---------------------------------------------------------------------------
router.get("/api/control/bottlenecks", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);

    const { data: active } = await supabase
      .from("flow_bottlenecks")
      .select("*, rca_investigations(id, status, likely_root_cause, confidence_score)")
      .eq("org_id", oid)
      .in("status", ["ACTIVE", "INVESTIGATING"])
      .order("severity", { ascending: false })
      .order("detected_at", { ascending: false });

    const { data: recentResolved } = await supabase
      .from("flow_bottlenecks")
      .select("id, bottleneck_type, location, severity, description, detected_at, resolved_at, root_cause")
      .eq("org_id", oid)
      .eq("status", "RESOLVED")
      .order("resolved_at", { ascending: false })
      .limit(20);

    const { data: patterns } = await supabase
      .from("operational_patterns")
      .select("*")
      .eq("org_id", oid)
      .eq("is_anomaly", true)
      .order("occurrence_count", { ascending: false })
      .limit(20);

    res.json({
      active: active ?? [],
      recentResolved: recentResolved ?? [],
      patterns: patterns ?? [],
    });
  } catch (err: any) {
    console.error("[control/bottlenecks]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/control/investigate/:bottleneck_id
// Triggers automated RCA: analyze PIX events, identify factors, create investigation
// ---------------------------------------------------------------------------
router.post("/api/control/investigate/:bottleneck_id", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const { bottleneck_id } = req.params;

    // Fetch bottleneck
    const { data: bottleneck, error: bErr } = await supabase
      .from("flow_bottlenecks")
      .select("*")
      .eq("id", bottleneck_id)
      .eq("org_id", oid)
      .single();

    if (bErr || !bottleneck) return res.status(404).json({ error: "Bottleneck not found" });

    // Analyze PIX events for patterns around this bottleneck
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: pixEvents } = await supabase
      .from("pix_events")
      .select("id, event_type, entity_type, entity_id, severity, created_at, meta")
      .eq("org_id", oid)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    // Auto-analysis: cluster events by type to identify patterns
    const eventTypeCounts: Record<string, number> = {};
    const recentDelays: any[] = [];

    for (const evt of (pixEvents ?? [])) {
      eventTypeCounts[evt.event_type] = (eventTypeCounts[evt.event_type] ?? 0) + 1;
      if (evt.event_type?.includes("DELAY") || evt.event_type?.includes("WAIT") || evt.event_type?.includes("STUCK")) {
        recentDelays.push(evt);
      }
    }

    // Build contributing factors based on event patterns
    const factors: string[] = [];
    const analysis: Record<string, any> = { eventTypeCounts, similarEventsLast30Days: recentDelays.length };

    if (bottleneck.bottleneck_type === "LONG_WAIT" || bottleneck.bottleneck_type === "DELAY") {
      if (eventTypeCounts["PARTS_DELAYED"] || eventTypeCounts["PARTS_MISSING"]) {
        factors.push("Parts ordering or availability delay");
        analysis.partsDelay = true;
      }
      if (eventTypeCounts["TECHNICIAN_UNAVAILABLE"] || eventTypeCounts["OVERLOAD"]) {
        factors.push("Technician unavailability or overload");
        analysis.techOverload = true;
      }
      if (recentDelays.length > 5) {
        factors.push("Recurring delay pattern in this step");
        analysis.recurringPattern = true;
      }
    }

    if (bottleneck.bottleneck_type === "OVERLOAD") {
      factors.push("Resource capacity insufficient for current demand");
      if (eventTypeCounts["BOOKING_EXCESS"]) factors.push("Over-booking relative to available capacity");
    }

    if (bottleneck.bottleneck_type === "QUEUE_BUILDUP") {
      factors.push("Input rate exceeds processing rate");
      factors.push("Potential upstream velocity mismatch");
    }

    // Confidence scores per factor (simplified heuristic)
    const likelyCause = factors[0] ?? "Cause under investigation";
    const confidence = Math.min(0.95, 0.4 + (recentDelays.length * 0.02) + (factors.length * 0.1));

    // Questions to send to responsible roles
    const questions = [
      {
        role: "workshop_manager",
        question: `What caused the ${bottleneck.bottleneck_type?.replace("_", " ").toLowerCase()} at ${bottleneck.location ?? "this location"}?`,
        context: bottleneck.description,
      },
      {
        role: "technician",
        question: "Were there specific resource or information gaps that contributed to the delay?",
        context: `Affected: ${bottleneck.affected_count ?? 1} work order(s)`,
      },
    ];

    if (analysis.partsDelay) {
      questions.push({
        role: "parts",
        question: "What caused the delay in parts availability? Was this a supplier issue or internal ordering delay?",
        context: "Parts delay detected in PIX event patterns",
      });
    }

    // Create investigation record
    const { data: investigation, error: invErr } = await supabase
      .from("rca_investigations")
      .insert({
        org_id: oid,
        bottleneck_id,
        title: `RCA: ${bottleneck.bottleneck_type} at ${bottleneck.location ?? "Operation"}`,
        status: "ANALYZING",
        auto_analysis: analysis,
        contributing_factors: factors,
        likely_root_cause: likelyCause,
        confidence_score: Math.round(confidence * 100) / 100,
        questions_sent: questions,
        responses_received: [],
        improvement_actions: [],
      })
      .select()
      .single();

    if (invErr) throw invErr;

    // Update bottleneck status to INVESTIGATING
    await supabase
      .from("flow_bottlenecks")
      .update({ status: "INVESTIGATING" })
      .eq("id", bottleneck_id);

    // Update pattern counts
    await updatePatterns(oid, bottleneck);

    res.json({
      investigation,
      summary: {
        eventsAnalyzed: (pixEvents ?? []).length,
        similarDelays: recentDelays.length,
        contributingFactors: factors,
        likelyCause,
        confidence: Math.round(confidence * 100),
        questionsSentTo: questions.map(q => q.role),
      },
    });
  } catch (err: any) {
    console.error("[control/investigate]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/control/feedback/:investigation_id
// Receive structured feedback, update RCA
// ---------------------------------------------------------------------------
router.post("/api/control/feedback/:investigation_id", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const { investigation_id } = req.params;
    const { role, response_text, confirmed_cause, improvement_suggestion } = req.body;

    const { data: inv, error: invErr } = await supabase
      .from("rca_investigations")
      .select("*")
      .eq("id", investigation_id)
      .eq("org_id", oid)
      .single();

    if (invErr || !inv) return res.status(404).json({ error: "Investigation not found" });

    const responses = Array.isArray(inv.responses_received) ? inv.responses_received : [];
    responses.push({
      role,
      response_text,
      confirmed_cause,
      improvement_suggestion,
      received_at: new Date().toISOString(),
    });

    // Build improvement actions from response
    const actions = Array.isArray(inv.improvement_actions) ? inv.improvement_actions : [];
    if (improvement_suggestion) {
      actions.push({
        id: crypto.randomUUID(),
        action: improvement_suggestion,
        source: "feedback",
        role,
        impact: "MEDIUM",
        confidence: 0.75,
        urgency_days: 7,
        status: "PENDING",
        created_at: new Date().toISOString(),
      });
    }

    // If cause confirmed, conclude investigation
    const isComplete = confirmed_cause || responses.length >= 2;
    const updateData: any = {
      responses_received: responses,
      improvement_actions: actions,
    };
    if (confirmed_cause) {
      updateData.likely_root_cause = confirmed_cause;
      updateData.confidence_score = 0.95;
    }
    if (isComplete) {
      updateData.status = "CONCLUDED";
      updateData.concluded_at = new Date().toISOString();
    }

    const { data: updated } = await supabase
      .from("rca_investigations")
      .update(updateData)
      .eq("id", investigation_id)
      .select()
      .single();

    // If concluded, resolve the bottleneck
    if (isComplete && inv.bottleneck_id) {
      await supabase
        .from("flow_bottlenecks")
        .update({
          status: "RESOLVED",
          root_cause: confirmed_cause ?? inv.likely_root_cause,
          resolution: improvement_suggestion,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", inv.bottleneck_id);
    }

    res.json({ investigation: updated, concluded: isComplete });
  } catch (err: any) {
    console.error("[control/feedback]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/control/improvements
// Returns: improvement actions derived from RCAs, sorted by impact × confidence × urgency
// ---------------------------------------------------------------------------
router.get("/api/control/improvements", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);

    const { data: investigations } = await supabase
      .from("rca_investigations")
      .select("id, title, likely_root_cause, confidence_score, improvement_actions, concluded_at, bottleneck_id")
      .eq("org_id", oid)
      .neq("improvement_actions", "[]")
      .order("concluded_at", { ascending: false })
      .limit(50);

    // Flatten and score all actions
    const IMPACT_SCORE: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const allActions: any[] = [];

    for (const inv of (investigations ?? [])) {
      const actions = Array.isArray(inv.improvement_actions) ? inv.improvement_actions : [];
      for (const action of actions) {
        const impactScore = IMPACT_SCORE[action.impact ?? "MEDIUM"] ?? 2;
        const confidence = action.confidence ?? inv.confidence_score ?? 0.5;
        const urgencyDays = action.urgency_days ?? 30;
        const urgencyScore = urgencyDays <= 3 ? 3 : urgencyDays <= 7 ? 2 : 1;
        const totalScore = impactScore * confidence * urgencyScore;

        allActions.push({
          ...action,
          investigation_id: inv.id,
          investigation_title: inv.title,
          totalScore: Math.round(totalScore * 100) / 100,
        });
      }
    }

    // Sort by composite score descending
    allActions.sort((a, b) => b.totalScore - a.totalScore);

    res.json({ improvements: allActions, total: allActions.length });
  } catch (err: any) {
    console.error("[control/improvements]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/control/detect
// Manually trigger bottleneck detection for an org (also called by cron)
// ---------------------------------------------------------------------------
router.post("/api/control/detect", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const detected = await detectBottlenecks(oid);
    res.json({ detected: detected.length, bottlenecks: detected });
  } catch (err: any) {
    console.error("[control/detect]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/control/bottlenecks/:id
// Update status of a bottleneck (dismiss, resolve, etc.)
// ---------------------------------------------------------------------------
router.patch("/api/control/bottlenecks/:id", auth, async (req: Request, res: Response) => {
  try {
    const oid = orgId(req);
    const { id } = req.params;
    const { status, resolution, root_cause } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (root_cause) updateData.root_cause = root_cause;
    if (status === "RESOLVED" || status === "DISMISSED") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("flow_bottlenecks")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", oid)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error("[control/bottlenecks PATCH]", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Internal: detectBottlenecks — called by cron every 15 min
// ---------------------------------------------------------------------------
export async function detectBottlenecks(oid: string): Promise<any[]> {
  const detected: any[] = [];

  try {
    // 1. Find work orders stuck in a step for too long
    const { data: activeOrders } = await supabase
      .from("work_orders")
      .select("id, current_step, step_started_at, technician_id, technician_name, vehicle_reg, priority, org_id")
      .eq("org_id", oid)
      .in("status", ["IN_PROGRESS", "WAITING_PARTS", "CHECKED_IN"])
      .not("step_started_at", "is", null);

    // Get existing active bottlenecks to avoid duplicates
    const { data: existingActive } = await supabase
      .from("flow_bottlenecks")
      .select("resource_id, bottleneck_type")
      .eq("org_id", oid)
      .eq("status", "ACTIVE");

    const existingKeys = new Set((existingActive ?? []).map((b: any) => `${b.resource_id}_${b.bottleneck_type}`));

    for (const wo of (activeOrders ?? [])) {
      const step = wo.current_step ?? "REPAIR";
      const expected = STEP_BASELINES[step] ?? 60;
      const timeInStep = minutesSince(wo.step_started_at);

      if (timeInStep > expected * 1.5) {
        const key = `${wo.id}_LONG_WAIT`;
        if (!existingKeys.has(key)) {
          const severity = timeInStep > expected * 3 ? "CRITICAL" : timeInStep > expected * 2 ? "HIGH" : "MEDIUM";
          const overPct = Math.round((timeInStep / expected - 1) * 100);

          const { data: newBot } = await supabase
            .from("flow_bottlenecks")
            .insert({
              org_id: oid,
              bottleneck_type: "LONG_WAIT",
              location: step,
              resource_id: wo.id,
              resource_type: "work_order",
              affected_count: 1,
              avg_delay_minutes: timeInStep - expected,
              severity,
              description: `Work order ${wo.vehicle_reg ?? wo.id} stuck in ${step} for ${timeInStep}min (expected ${expected}min, ${overPct}% over)`,
              status: "ACTIVE",
            })
            .select()
            .single();

          if (newBot) detected.push(newBot);
        }
      }
    }

    // 2. Find technicians overloaded (more than 2 concurrent active orders)
    const techOrderCounts: Record<string, { count: number; name: string }> = {};
    for (const wo of (activeOrders ?? [])) {
      if (wo.technician_id) {
        if (!techOrderCounts[wo.technician_id]) {
          techOrderCounts[wo.technician_id] = { count: 0, name: wo.technician_name ?? "Unknown" };
        }
        techOrderCounts[wo.technician_id].count++;
      }
    }

    for (const [techId, info] of Object.entries(techOrderCounts)) {
      if (info.count >= 3) {
        const key = `${techId}_OVERLOAD`;
        if (!existingKeys.has(key)) {
          const { data: newBot } = await supabase
            .from("flow_bottlenecks")
            .insert({
              org_id: oid,
              bottleneck_type: "OVERLOAD",
              location: "TECHNICIAN",
              resource_id: techId,
              resource_type: "technician",
              affected_count: info.count,
              severity: info.count >= 4 ? "HIGH" : "MEDIUM",
              description: `Technician ${info.name} has ${info.count} concurrent active work orders`,
              status: "ACTIVE",
            })
            .select()
            .single();

          if (newBot) detected.push(newBot);
        }
      }
    }

    // 3. Queue build-up: many items waiting for same step
    const stepCounts: Record<string, number> = {};
    for (const wo of (activeOrders ?? [])) {
      const step = wo.current_step ?? "UNKNOWN";
      stepCounts[step] = (stepCounts[step] ?? 0) + 1;
    }

    for (const [step, count] of Object.entries(stepCounts)) {
      if (count >= 4) {
        const key = `queue_${step}_QUEUE_BUILDUP`;
        if (!existingKeys.has(key)) {
          const { data: newBot } = await supabase
            .from("flow_bottlenecks")
            .insert({
              org_id: oid,
              bottleneck_type: "QUEUE_BUILDUP",
              location: step,
              resource_type: "step",
              affected_count: count,
              severity: count >= 6 ? "HIGH" : "MEDIUM",
              description: `Queue buildup in ${step}: ${count} work orders waiting`,
              status: "ACTIVE",
            })
            .select()
            .single();

          if (newBot) detected.push(newBot);
        }
      }
    }

    // 4. Update operational patterns with current observations
    for (const [step, count] of Object.entries(stepCounts)) {
      if (count > 0) {
        const relevantOrders = (activeOrders ?? []).filter((wo: any) => wo.current_step === step);
        const avgTime = relevantOrders.length > 0
          ? relevantOrders.reduce((s: number, wo: any) => s + minutesSince(wo.step_started_at), 0) / relevantOrders.length
          : 0;
        const baseline = STEP_BASELINES[step] ?? 60;
        const deviationPct = ((avgTime - baseline) / baseline) * 100;

        // Upsert pattern
        const { data: existing } = await supabase
          .from("operational_patterns")
          .select("id, occurrence_count")
          .eq("org_id", oid)
          .eq("pattern_type", "STEP_DURATION")
          .eq("entity_type", step)
          .single();

        if (existing) {
          await supabase
            .from("operational_patterns")
            .update({
              observed_avg_minutes: avgTime,
              deviation_pct: deviationPct,
              occurrence_count: (existing.occurrence_count ?? 0) + 1,
              last_seen: new Date().toISOString(),
              is_anomaly: Math.abs(deviationPct) > 30,
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("operational_patterns")
            .insert({
              org_id: oid,
              pattern_type: "STEP_DURATION",
              entity_type: step,
              observed_avg_minutes: avgTime,
              baseline_minutes: baseline,
              deviation_pct: deviationPct,
              is_anomaly: Math.abs(deviationPct) > 30,
            });
        }
      }
    }
  } catch (err) {
    console.error("[detectBottlenecks]", err);
  }

  return detected;
}

// ---------------------------------------------------------------------------
// Helper: update operational patterns when a bottleneck is investigated
// ---------------------------------------------------------------------------
async function updatePatterns(oid: string, bottleneck: any) {
  try {
    if (!bottleneck.location) return;
    const { data: existing } = await supabase
      .from("operational_patterns")
      .select("id, occurrence_count")
      .eq("org_id", oid)
      .eq("pattern_type", bottleneck.bottleneck_type)
      .eq("entity_type", bottleneck.location)
      .single();

    if (existing) {
      await supabase.from("operational_patterns").update({
        occurrence_count: (existing.occurrence_count ?? 0) + 1,
        last_seen: new Date().toISOString(),
        is_anomaly: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("operational_patterns").insert({
        org_id: oid,
        pattern_type: bottleneck.bottleneck_type,
        entity_type: bottleneck.location,
        occurrence_count: 1,
        is_anomaly: true,
        pattern_data: { bottleneck_type: bottleneck.bottleneck_type, severity: bottleneck.severity },
      });
    }
  } catch (_) { /* non-fatal */ }
}

export default router;
