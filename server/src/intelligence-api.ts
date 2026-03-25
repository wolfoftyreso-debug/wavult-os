// ---------------------------------------------------------------------------
// PIX Intelligence API — Pixdrift's answer to Palantir AIP
// ---------------------------------------------------------------------------
// Semantic query engine over the PIX Ontology.
// Maps natural language questions → ontology operations → structured answers.
//
// Endpoints:
//   POST /api/intelligence/query              — natural language query (Gemini)
//   GET  /api/intelligence/overloaded-technicians
//   GET  /api/intelligence/at-risk-parts
//   GET  /api/intelligence/delay-patterns
//   GET  /api/intelligence/customer-churn-risk
//   GET  /api/intelligence/revenue-forecast
//   GET  /api/intelligence/capacity-tomorrow
//   GET  /api/intelligence/sla-at-risk
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// Gemini API configuration
const GEMINI_KEY = process.env.GEMINI_API_KEY || "AIzaSyANqIFz2EaIBlAzHa1j8rvhP62aLnrvR8M";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ---------------------------------------------------------------------------
// Helper: call Gemini
// ---------------------------------------------------------------------------
async function callGemini(prompt: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = (await res.json()) as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// 1. OVERLOADED TECHNICIANS
//    "Which technicians are overloaded today?"
// ---------------------------------------------------------------------------
async function getOverloadedTechnicians(orgId: string) {
  const today = new Date().toISOString().split("T")[0];

  // Get all technicians with their today's work orders
  const { data: technicians, error: techErr } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("org_id", orgId)
    .eq("role", "TECHNICIAN");

  if (techErr || !technicians) return [];

  const results = [];

  for (const tech of technicians) {
    const { data: workOrders } = await supabase
      .from("work_orders")
      .select("id, order_number, status, estimated_hours, actual_hours, work_type, vehicle_reg, promised_date")
      .eq("org_id", orgId)
      .eq("technician_id", tech.id)
      .in("status", ["OPEN", "IN_PROGRESS", "AWAITING_PARTS", "AWAITING_APPROVAL"])
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    const jobs = workOrders ?? [];
    const assignedHours = jobs.reduce((sum, wo) => sum + (wo.estimated_hours ?? 0), 0);
    const availableHours = 8; // Standard working day — could be pulled from shifts
    const loadPct = Math.round((assignedHours / availableHours) * 100);

    let recommendation = "";
    if (loadPct > 100) {
      recommendation = `CRITICAL: ${tech.full_name} is overbooked by ${loadPct - 100}%. Redistribute immediately.`;
    } else if (loadPct > 85) {
      recommendation = `WARNING: ${tech.full_name} at ${loadPct}% capacity. Consider reassigning lower-priority jobs.`;
    } else if (loadPct < 40 && loadPct >= 0) {
      recommendation = `OPPORTUNITY: ${tech.full_name} at ${loadPct}% — has bandwidth for ${Math.round((availableHours - assignedHours))}h more work.`;
    } else {
      recommendation = `OK: ${tech.full_name} at ${loadPct}% — balanced workload.`;
    }

    results.push({
      technician_id: tech.id,
      name: tech.full_name,
      load_pct: loadPct,
      assigned_hours: assignedHours,
      available_hours: availableHours,
      job_count: jobs.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        order_number: j.order_number,
        type: j.work_type,
        vehicle: j.vehicle_reg,
        estimated_hours: j.estimated_hours,
        status: j.status,
        promised: j.promised_date,
      })),
      recommendation,
      alert_level: loadPct > 100 ? "critical" : loadPct > 85 ? "warning" : loadPct < 40 ? "opportunity" : "ok",
    });
  }

  return results.sort((a, b) => b.load_pct - a.load_pct);
}

// ---------------------------------------------------------------------------
// 2. AT-RISK PARTS
//    "What parts are at risk of running out this week?"
// ---------------------------------------------------------------------------
async function getAtRiskParts(orgId: string) {
  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Parts at or below reorder point
  const { data: lowParts } = await supabase
    .from("parts_inventory")
    .select("id, part_number, description, stock_qty, reorder_point, lead_time_days, unit_cost, make")
    .eq("org_id", orgId)
    .lte("stock_qty", supabase.rpc as any); // fallback below

  // Direct query since RPC may not exist
  const { data: parts } = await supabase
    .from("parts_inventory")
    .select("id, part_number, description, stock_qty, reorder_point, lead_time_days, unit_cost, make")
    .eq("org_id", orgId);

  if (!parts) return [];

  const atRisk = parts.filter((p) => p.stock_qty <= (p.reorder_point ?? 2));

  const results = [];

  for (const part of atRisk) {
    // Find open work orders needing this part
    const { data: reservations } = await supabase
      .from("work_order_parts")
      .select("work_order_id, quantity_needed, work_orders(order_number, vehicle_reg, promised_date, status)")
      .eq("part_id", part.id)
      .eq("org_id", orgId)
      .in("status", ["reserved", "pending"]);

    const neededByOrders = reservations ?? [];
    const totalNeeded = neededByOrders.reduce((sum: number, r: any) => sum + (r.quantity_needed ?? 1), 0);
    const daysUntilStockout = part.stock_qty > 0
      ? Math.floor(part.stock_qty / Math.max(totalNeeded / 7, 0.1))
      : 0;

    results.push({
      part_id: part.id,
      part_number: part.part_number,
      description: part.description,
      make: part.make,
      stock_left: part.stock_qty,
      reorder_point: part.reorder_point,
      lead_time_days: part.lead_time_days ?? 3,
      unit_cost: part.unit_cost,
      needed_by_orders: neededByOrders.map((r: any) => ({
        work_order_id: r.work_order_id,
        order_number: r.work_orders?.order_number,
        vehicle: r.work_orders?.vehicle_reg,
        promised: r.work_orders?.promised_date,
        qty_needed: r.quantity_needed,
      })),
      days_until_stockout: daysUntilStockout,
      urgency: daysUntilStockout <= 1 ? "critical" : daysUntilStockout <= 3 ? "high" : "medium",
      action: `Order ${part.reorder_point ?? 5} units of ${part.part_number} — ${part.lead_time_days ?? 3}d delivery`,
    });
  }

  return results.sort((a, b) => a.days_until_stockout - b.days_until_stockout);
}

// ---------------------------------------------------------------------------
// 3. DELAY PATTERNS
//    "What's causing most delays across our workshop?"
// ---------------------------------------------------------------------------
async function getDelayPatterns(orgId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, work_type, status, delay_reason, estimated_hours, actual_hours, created_at, promised_date, completed_at")
    .eq("org_id", orgId)
    .gte("created_at", thirtyDaysAgo);

  if (!workOrders) return {};

  const delayed = workOrders.filter(
    (wo) =>
      wo.actual_hours > wo.estimated_hours * 1.2 ||
      wo.delay_reason != null ||
      (wo.promised_date && wo.completed_at && new Date(wo.completed_at) > new Date(wo.promised_date))
  );

  // Aggregate delay reasons
  const byReason: Record<string, number> = {};
  const byType: Record<string, { total: number; delayed: number }> = {};

  for (const wo of workOrders) {
    if (!byType[wo.work_type]) byType[wo.work_type] = { total: 0, delayed: 0 };
    byType[wo.work_type].total++;
  }

  for (const wo of delayed) {
    const reason = wo.delay_reason ?? "unknown";
    byReason[reason] = (byReason[reason] ?? 0) + 1;
    if (byType[wo.work_type]) byType[wo.work_type].delayed++;
  }

  const topReasons = Object.entries(byReason)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([reason, count]) => ({
      reason,
      count,
      pct_of_delays: Math.round((count / Math.max(delayed.length, 1)) * 100),
    }));

  const worstJobTypes = Object.entries(byType)
    .map(([type, stats]) => ({
      type,
      delay_rate: Math.round((stats.delayed / Math.max(stats.total, 1)) * 100),
      delayed: stats.delayed,
      total: stats.total,
    }))
    .filter((t) => t.total >= 2)
    .sort((a, b) => b.delay_rate - a.delay_rate)
    .slice(0, 5);

  const avgOverrun =
    delayed.reduce((sum, wo) => sum + Math.max(0, (wo.actual_hours ?? 0) - (wo.estimated_hours ?? 0)), 0) /
    Math.max(delayed.length, 1);

  return {
    period: "last_30_days",
    total_jobs: workOrders.length,
    delayed_jobs: delayed.length,
    delay_rate_pct: Math.round((delayed.length / Math.max(workOrders.length, 1)) * 100),
    avg_overrun_hours: Math.round(avgOverrun * 10) / 10,
    top_delay_reasons: topReasons,
    worst_job_types: worstJobTypes,
    insight:
      topReasons[0]
        ? `Primary delay driver: "${topReasons[0].reason}" — affects ${topReasons[0].pct_of_delays}% of delays. Fix this first.`
        : "No significant delay patterns detected.",
  };
}

// ---------------------------------------------------------------------------
// 4. CUSTOMER CHURN RISK
//    "Which customers haven't returned in 12 months?"
// ---------------------------------------------------------------------------
async function getCustomerChurnRisk(orgId: string) {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const nineMonthsAgo = new Date(Date.now() - 270 * 24 * 60 * 60 * 1000).toISOString();

  // Get customers with their last work order date
  const { data: customers } = await supabase
    .from("automotive_crm_contacts")
    .select("id, name, email, phone, total_value")
    .eq("org_id", orgId);

  if (!customers) return [];

  const results = [];

  for (const customer of customers) {
    const { data: lastOrder } = await supabase
      .from("work_orders")
      .select("id, created_at, status, work_type")
      .eq("org_id", orgId)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastOrder) continue;

    const lastVisit = new Date(lastOrder.created_at);
    const daysSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

    let churnRisk: "low" | "medium" | "high" | "lost";
    let action = "";

    if (daysSince > 365) {
      churnRisk = "lost";
      action = `Send win-back offer. Last visit: ${daysSince}d ago. Lifetime value: €${customer.total_value ?? "?"}`;
    } else if (daysSince > 270) {
      churnRisk = "high";
      action = `Send re-engagement SMS/email immediately. Likely switching to competitor.`;
    } else if (daysSince > 180) {
      churnRisk = "medium";
      action = `Schedule proactive service reminder. Annual service may be due.`;
    } else {
      churnRisk = "low";
      action = "No action needed.";
    }

    if (churnRisk === "low") continue; // Only return at-risk customers

    results.push({
      customer_id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      lifetime_value: customer.total_value ?? 0,
      last_visit: lastOrder.created_at,
      days_since_visit: daysSince,
      churn_risk: churnRisk,
      action,
    });
  }

  return results.sort((a, b) => b.days_since_visit - a.days_since_visit);
}

// ---------------------------------------------------------------------------
// 5. REVENUE FORECAST
//    "What's our projected revenue this week?"
// ---------------------------------------------------------------------------
async function getRevenueForecast(orgId: string) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Open + in-progress work orders this week
  const { data: openOrders } = await supabase
    .from("work_orders")
    .select("id, work_type, status, estimated_hours, created_at, promised_date")
    .eq("org_id", orgId)
    .in("status", ["OPEN", "IN_PROGRESS", "AWAITING_PARTS", "AWAITING_APPROVAL"])
    .lte("created_at", weekEnd.toISOString());

  // Completed this week (actual revenue)
  const { data: completedOrders } = await supabase
    .from("work_orders")
    .select("id, work_type, total_amount, completed_at")
    .eq("org_id", orgId)
    .eq("status", "INVOICED")
    .gte("completed_at", weekStart.toISOString())
    .lt("completed_at", weekEnd.toISOString());

  // Historical avg revenue per work_type
  const { data: historicalOrders } = await supabase
    .from("work_orders")
    .select("work_type, total_amount")
    .eq("org_id", orgId)
    .eq("status", "INVOICED")
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  const avgByType: Record<string, number> = {};
  const countByType: Record<string, number> = {};

  for (const order of historicalOrders ?? []) {
    if (!order.total_amount) continue;
    avgByType[order.work_type] = (avgByType[order.work_type] ?? 0) + order.total_amount;
    countByType[order.work_type] = (countByType[order.work_type] ?? 0) + 1;
  }
  for (const type in avgByType) {
    avgByType[type] = avgByType[type] / countByType[type];
  }

  const confirmedRevenue = (completedOrders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const projectedRevenue = (openOrders ?? []).reduce((sum, o) => {
    const avg = avgByType[o.work_type] ?? o.estimated_hours * 850; // €850/h fallback
    return sum + avg;
  }, 0);

  const byType = Object.entries(avgByType)
    .map(([type, avg]) => ({
      type,
      avg_revenue: Math.round(avg),
      margin_estimate: Math.round(avg * 0.65), // 65% gross margin assumption
    }))
    .sort((a, b) => b.avg_revenue - a.avg_revenue);

  return {
    period: "this_week",
    week_start: weekStart.toISOString().split("T")[0],
    week_end: weekEnd.toISOString().split("T")[0],
    confirmed_revenue: Math.round(confirmedRevenue),
    projected_revenue: Math.round(projectedRevenue),
    total_forecast: Math.round(confirmedRevenue + projectedRevenue),
    open_orders: (openOrders ?? []).length,
    completed_orders: (completedOrders ?? []).length,
    revenue_by_job_type: byType.slice(0, 8),
    insight:
      projectedRevenue > confirmedRevenue
        ? `${(openOrders ?? []).length} open jobs project €${Math.round(projectedRevenue).toLocaleString()} additional revenue. Track SLA to protect it.`
        : `On track. €${Math.round(confirmedRevenue).toLocaleString()} confirmed so far this week.`,
  };
}

// ---------------------------------------------------------------------------
// 6. SLA AT RISK
//    "Which jobs will miss their promised time?"
// ---------------------------------------------------------------------------
async function getSlaAtRisk(orgId: string) {
  const now = new Date().toISOString();

  const { data: atRisk } = await supabase
    .from("work_orders")
    .select(
      "id, order_number, status, work_type, vehicle_reg, promised_date, estimated_hours, actual_hours, technician_id, delay_reason"
    )
    .eq("org_id", orgId)
    .in("status", ["OPEN", "IN_PROGRESS", "AWAITING_PARTS", "AWAITING_APPROVAL"])
    .lte("promised_date", new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()); // next 4 hours

  if (!atRisk) return [];

  // Get technician names
  const techIds = [...new Set(atRisk.map((wo) => wo.technician_id).filter(Boolean))];
  const { data: techs } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", techIds);
  const techMap = Object.fromEntries((techs ?? []).map((t) => [t.id, t.full_name]));

  return atRisk.map((wo) => {
    const promisedMs = new Date(wo.promised_date).getTime();
    const minutesRemaining = Math.round((promisedMs - Date.now()) / 60000);
    const isOverdue = minutesRemaining < 0;

    return {
      work_order_id: wo.id,
      order_number: wo.order_number,
      vehicle: wo.vehicle_reg,
      type: wo.work_type,
      status: wo.status,
      technician: techMap[wo.technician_id] ?? "Unassigned",
      promised_at: wo.promised_date,
      minutes_remaining: minutesRemaining,
      is_overdue: isOverdue,
      delay_reason: wo.delay_reason,
      action: isOverdue
        ? `OVERDUE — contact customer immediately. Consider discount/apology voucher.`
        : `Due in ${minutesRemaining}min — check status with ${techMap[wo.technician_id] ?? "technician"}.`,
    };
  });
}

// ---------------------------------------------------------------------------
// 7. CAPACITY TOMORROW
// ---------------------------------------------------------------------------
async function getCapacityTomorrow(orgId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: technicians } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("org_id", orgId)
    .eq("role", "TECHNICIAN");

  if (!technicians) return {};

  const { data: bookings } = await supabase
    .from("work_orders")
    .select("technician_id, estimated_hours")
    .eq("org_id", orgId)
    .in("status", ["OPEN", "IN_PROGRESS"])
    .gte("promised_date", `${tomorrowStr}T00:00:00`)
    .lt("promised_date", `${tomorrowStr}T23:59:59`);

  const loadByTech: Record<string, number> = {};
  for (const booking of bookings ?? []) {
    if (!booking.technician_id) continue;
    loadByTech[booking.technician_id] = (loadByTech[booking.technician_id] ?? 0) + (booking.estimated_hours ?? 0);
  }

  const techCapacity = technicians.map((t) => {
    const assigned = loadByTech[t.id] ?? 0;
    const available = 8;
    const free = Math.max(0, available - assigned);
    return {
      technician_id: t.id,
      name: t.full_name,
      assigned_hours: assigned,
      free_hours: free,
      load_pct: Math.round((assigned / available) * 100),
    };
  });

  const totalFreeHours = techCapacity.reduce((sum, t) => sum + t.free_hours, 0);
  const totalCapacity = technicians.length * 8;

  return {
    date: tomorrowStr,
    technician_count: technicians.length,
    total_available_hours: totalCapacity,
    total_free_hours: totalFreeHours,
    utilisation_pct: Math.round(((totalCapacity - totalFreeHours) / totalCapacity) * 100),
    by_technician: techCapacity,
    recommendation:
      totalFreeHours > technicians.length * 2
        ? `${Math.round(totalFreeHours)}h of free capacity tomorrow. Consider proactive customer outreach for service bookings.`
        : totalFreeHours < technicians.length
        ? `Tomorrow nearly fully booked. Only ${Math.round(totalFreeHours)}h free. Avoid over-promising.`
        : `Good balance. ${Math.round(totalFreeHours)}h free for urgent/walk-in jobs.`,
  };
}

// ---------------------------------------------------------------------------
// 8. NATURAL LANGUAGE QUERY (Gemini-powered)
//    POST /api/intelligence/query
// ---------------------------------------------------------------------------
async function handleNaturalLanguageQuery(orgId: string, question: string): Promise<any> {
  // Gather context data for Gemini
  const [overloaded, atRisk, delays, churn, forecast, sla] = await Promise.allSettled([
    getOverloadedTechnicians(orgId),
    getAtRiskParts(orgId),
    getDelayPatterns(orgId),
    getCustomerChurnRisk(orgId),
    getRevenueForecast(orgId),
    getSlaAtRisk(orgId),
  ]);

  const context = {
    overloaded_technicians: overloaded.status === "fulfilled" ? overloaded.value : [],
    at_risk_parts: atRisk.status === "fulfilled" ? atRisk.value : [],
    delay_patterns: delays.status === "fulfilled" ? delays.value : {},
    churn_risk: churn.status === "fulfilled" ? churn.value.slice(0, 10) : [],
    revenue_forecast: forecast.status === "fulfilled" ? forecast.value : {},
    sla_at_risk: sla.status === "fulfilled" ? sla.value : [],
  };

  const prompt = `You are PIX Intelligence — an operational AI assistant for an automotive workshop.
Your role is to answer operational questions in plain, direct language. Be concise and actionable.
Always provide a specific recommendation, not just facts.

Current operational data:
${JSON.stringify(context, null, 2)}

Question: "${question}"

Answer in 2-4 sentences. Be specific. Lead with the most important finding.
If the question is not answerable from the data, say so and suggest what data would help.`;

  try {
    const answer = await callGemini(prompt);
    return {
      question,
      answer,
      data_used: Object.keys(context),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback: try to answer from pre-built queries without Gemini
    return {
      question,
      answer: `I couldn't process that with AI, but here's the raw operational data to help you find the answer.`,
      fallback_data: context,
      error: String(err),
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get("/api/intelligence/overloaded-technicians", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getOverloadedTechnicians(org_id);
    res.json({
      query: "Which technicians are overloaded today?",
      result: data,
      count: data.length,
      critical: data.filter((t) => t.alert_level === "critical").length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/intelligence/at-risk-parts", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getAtRiskParts(org_id);
    res.json({
      query: "What parts are at risk of running out?",
      result: data,
      count: data.length,
      critical: data.filter((p) => p.urgency === "critical").length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/intelligence/delay-patterns", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getDelayPatterns(org_id);
    res.json({ query: "What's causing delays?", result: data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/intelligence/customer-churn-risk", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getCustomerChurnRisk(org_id);
    res.json({
      query: "Which customers are at risk of churning?",
      result: data,
      count: data.length,
      lost: data.filter((c) => c.churn_risk === "lost").length,
      high_risk: data.filter((c) => c.churn_risk === "high").length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/intelligence/revenue-forecast", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getRevenueForecast(org_id);
    res.json({ query: "What's our revenue forecast?", result: data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/intelligence/sla-at-risk", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getSlaAtRisk(org_id);
    res.json({
      query: "Which jobs will miss their promised delivery time?",
      result: data,
      overdue: data.filter((j) => j.is_overdue).length,
      at_risk: data.filter((j) => !j.is_overdue).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/intelligence/capacity-tomorrow", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const data = await getCapacityTomorrow(org_id);
    res.json({ query: "What's our capacity tomorrow?", result: data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Natural language query — powered by Gemini + PIX Ontology
router.post("/api/intelligence/query", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question is required" });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: "question too long (max 500 chars)" });
    }

    const data = await handleNaturalLanguageQuery(org_id, question);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard summary — all 7 signals in one call
router.get("/api/intelligence/dashboard", auth, async (req: Request, res: Response) => {
  try {
    const org_id: string = (req as any).user.org_id;

    const [overloaded, atRisk, delays, forecast, sla] = await Promise.allSettled([
      getOverloadedTechnicians(org_id),
      getAtRiskParts(org_id),
      getDelayPatterns(org_id),
      getRevenueForecast(org_id),
      getSlaAtRisk(org_id),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      signals: {
        overloaded_technicians: {
          data: overloaded.status === "fulfilled" ? overloaded.value : [],
          alert_count: overloaded.status === "fulfilled"
            ? overloaded.value.filter((t) => t.alert_level !== "ok").length
            : 0,
        },
        at_risk_parts: {
          data: atRisk.status === "fulfilled" ? atRisk.value : [],
          critical_count: atRisk.status === "fulfilled"
            ? atRisk.value.filter((p) => p.urgency === "critical").length
            : 0,
        },
        delay_patterns: delays.status === "fulfilled" ? delays.value : {},
        revenue_forecast: forecast.status === "fulfilled" ? forecast.value : {},
        sla_at_risk: {
          data: sla.status === "fulfilled" ? sla.value : [],
          overdue_count: sla.status === "fulfilled"
            ? sla.value.filter((j) => j.is_overdue).length
            : 0,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
