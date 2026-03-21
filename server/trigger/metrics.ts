// ---------------------------------------------------------------------------
// Universal Metrics Layer Background Jobs
// ISO 9.1 — Monitoring, measurement, analysis and evaluation
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// Daily 05:00: Calculate ALL metrics for ALL orgs
// ---------------------------------------------------------------------------
export const metricsCalculateAll = schedules.task({
  id: "metrics-calculate-all",
  cron: "0 5 * * *",
  run: async () => {
    const { data: orgs } = await supabase.from("organizations").select("id");
    const { data: defs } = await supabase.from("metric_definitions").select("*").eq("is_active", true);

    if (!orgs || !defs) return { error: "No orgs or definitions found" };

    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    let calculated = 0;

    for (const org of orgs) {
      for (const def of defs) {
        try {
          // Count data points in period
          const { count } = await supabase
            .from("metric_data_points")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org.id)
            .eq("metric_id", def.id)
            .gte("recorded_at", periodStart.toISOString());

          // Simple aggregation from data points
          let value = 0;
          if (def.aggregation_type === "COUNT") {
            value = count ?? 0;
          } else if (["SUM", "AVG"].includes(def.aggregation_type)) {
            const { data: points } = await supabase
              .from("metric_data_points")
              .select("value")
              .eq("org_id", org.id)
              .eq("metric_id", def.id)
              .gte("recorded_at", periodStart.toISOString());

            if (points && points.length > 0) {
              const sum = points.reduce((s, p) => s + Number(p.value), 0);
              value = def.aggregation_type === "AVG" ? sum / points.length : sum;
            }
          } else if (def.aggregation_type === "LATEST") {
            const { data: latest } = await supabase
              .from("metric_data_points")
              .select("value")
              .eq("org_id", org.id)
              .eq("metric_id", def.id)
              .order("recorded_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            value = latest ? Number(latest.value) : 0;
          } else if (def.aggregation_type === "PERCENTAGE") {
            // For PERCENTAGE: count matching / total * 100
            // Use source_entity_type and source_filter
            if (def.source_entity_type) {
              const { count: total } = await supabase
                .from(def.source_entity_type)
                .select("id", { count: "exact", head: true })
                .eq("org_id", org.id);

              const dataPointCount = count ?? 0;
              value = (total && total > 0) ? (dataPointCount / total) * 100 : 0;
            }
          }

          // Get previous period value
          const prevStart = new Date(periodStart.getTime() - 30 * 86400000);
          const { data: prevMetric } = await supabase
            .from("metric_values")
            .select("value")
            .eq("org_id", org.id)
            .eq("metric_id", def.id)
            .eq("period_type", "MONTHLY")
            .lt("period_start", periodStart.toISOString().slice(0, 10))
            .order("period_start", { ascending: false })
            .limit(1)
            .maybeSingle();

          const previousValue = prevMetric ? Number(prevMetric.value) : null;
          const changePct = previousValue && previousValue !== 0
            ? ((value - previousValue) / Math.abs(previousValue)) * 100
            : null;

          const trend = changePct === null ? "NEW"
            : changePct > 5 ? "UP"
            : changePct < -5 ? "DOWN"
            : "STABLE";

          // Calculate status (GREEN/YELLOW/RED)
          let status = "GRAY";
          if (def.default_target !== null) {
            if (def.threshold_direction === "HIGHER_IS_BETTER") {
              if (def.default_threshold_green && value >= Number(def.default_threshold_green)) status = "GREEN";
              else if (def.default_threshold_yellow && value >= Number(def.default_threshold_yellow)) status = "YELLOW";
              else if (def.default_threshold_red !== null) status = value >= Number(def.default_threshold_red) ? "YELLOW" : "RED";
              else if (value >= Number(def.default_target) * 0.9) status = "GREEN";
              else if (value >= Number(def.default_target) * 0.7) status = "YELLOW";
              else status = "RED";
            } else {
              if (def.default_threshold_green && value <= Number(def.default_threshold_green)) status = "GREEN";
              else if (def.default_threshold_yellow && value <= Number(def.default_threshold_yellow)) status = "YELLOW";
              else if (value <= Number(def.default_target) * 1.1) status = "GREEN";
              else if (value <= Number(def.default_target) * 1.5) status = "YELLOW";
              else status = "RED";
            }
          }

          // Upsert metric_value
          await supabase.from("metric_values").upsert({
            org_id: org.id,
            metric_id: def.id,
            period_type: "MONTHLY",
            period_start: periodStart.toISOString().slice(0, 10),
            period_end: today.toISOString().slice(0, 10),
            value,
            previous_value: previousValue,
            change_pct: changePct ? Math.round(changePct * 100) / 100 : null,
            trend,
            status,
            data_points: count ?? 0,
            calculated_at: new Date().toISOString(),
          }, { onConflict: "org_id,metric_id,period_type,period_start" });

          calculated++;
        } catch (err: any) {
          // Skip individual metric errors
          console.warn(`[metrics] Failed to calculate ${def.code} for ${org.id}: ${err.message}`);
        }
      }

      // Update last_calculated_at on all defs
      await supabase.from("metric_definitions")
        .update({ last_calculated_at: new Date().toISOString() })
        .eq("is_active", true);
    }

    console.log(`[metrics] Calculated ${calculated} metrics for ${orgs.length} orgs`);
    return { calculated, orgs: orgs.length };
  },
});

// ---------------------------------------------------------------------------
// Daily 05:30: RED metric alerts
// ---------------------------------------------------------------------------
export const metricsRedAlerts = schedules.task({
  id: "metrics-red-alerts",
  cron: "30 5 * * *",
  run: async () => {
    const yesterday = new Date(Date.now() - 24 * 3600000).toISOString();

    // Find all RED metrics calculated today
    const { data: redMetrics } = await supabase
      .from("metric_values")
      .select("*, metric_definitions!metric_id(code, name, action_if_red, module)")
      .eq("status", "RED")
      .gte("calculated_at", yesterday);

    let alerts = 0;
    for (const m of redMetrics ?? []) {
      const def = (m as any).metric_definitions;
      if (!def) continue;

      // Check if this was already RED in previous period
      const { data: prevValue } = await supabase
        .from("metric_values")
        .select("status")
        .eq("org_id", m.org_id)
        .eq("metric_id", m.metric_id)
        .neq("id", m.id)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isNewRed = !prevValue || prevValue.status !== "RED";

      if (isNewRed) {
        await supabase.from("tasks").insert({
          org_id: m.org_id,
          title: `METRIC ALERT: ${def.name} = RÖD`,
          description: `${def.name} (${def.code}) har nått RÖD nivå (${m.value}). ${def.action_if_red ?? "Åtgärd krävs."}`,
          status: "TODO",
          priority: "HIGH",
          type: "METRIC_ALERT",
        });
        alerts++;
      }
    }

    console.log(`[metrics] RED alerts: ${alerts} new RED metrics`);
    return { red_metrics: redMetrics?.length ?? 0, new_alerts: alerts };
  },
});

// ---------------------------------------------------------------------------
// Weekly Monday 06:00: Executive metrics summary
// ---------------------------------------------------------------------------
export const metricsWeeklySummary = schedules.task({
  id: "metrics-weekly-summary",
  cron: "0 6 * * 1",
  run: async () => {
    const { data: latestMetrics } = await supabase
      .from("metric_values")
      .select("*, metric_definitions!metric_id(code, name, module)")
      .order("calculated_at", { ascending: false });

    // Deduplicate: latest per metric per org
    const latest: Record<string, any> = {};
    for (const m of latestMetrics ?? []) {
      const key = `${m.org_id}-${m.metric_id}`;
      if (!latest[key]) latest[key] = m;
    }

    const values = Object.values(latest);

    // Top 5 improvements (UP trend, GREEN)
    const improvements = values
      .filter((m: any) => m.trend === "UP" && m.status === "GREEN")
      .sort((a: any, b: any) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
      .slice(0, 5);

    // Top 5 deteriorations (DOWN trend, RED/YELLOW)
    const deteriorations = values
      .filter((m: any) => m.trend === "DOWN" && ["RED", "YELLOW"].includes(m.status))
      .sort((a: any, b: any) => (a.change_pct ?? 0) - (b.change_pct ?? 0))
      .slice(0, 5);

    // All RED
    const allRed = values.filter((m: any) => m.status === "RED");

    const summary = {
      total_metrics: values.length,
      green: values.filter((m: any) => m.status === "GREEN").length,
      yellow: values.filter((m: any) => m.status === "YELLOW").length,
      red: allRed.length,
      gray: values.filter((m: any) => m.status === "GRAY").length,
      top_improvements: improvements.map((m: any) => ({
        metric: (m as any).metric_definitions?.name,
        change: m.change_pct,
      })),
      top_deteriorations: deteriorations.map((m: any) => ({
        metric: (m as any).metric_definitions?.name,
        change: m.change_pct,
      })),
      red_metrics: allRed.map((m: any) => ({
        metric: (m as any).metric_definitions?.name,
        value: m.value,
      })),
    };

    await supabase.from("audit_logs").insert({
      entity_type: "metrics",
      action: "weekly_summary",
      metadata: summary,
    });

    console.log(`[metrics] Weekly summary: ${summary.green}G / ${summary.yellow}Y / ${summary.red}R`);
    return summary;
  },
});

// ---------------------------------------------------------------------------
// Smart Alerts: Pattern detection (trend + anomaly + correlation)
// ---------------------------------------------------------------------------
export const metricsSmartAlerts = schedules.task({
  id: "metrics-smart-alerts",
  cron: "0 6 * * *",
  run: async () => {
    const { data: orgs } = await supabase.from("organizations").select("id");
    let alertCount = 0;

    for (const org of orgs ?? []) {
      // Get last 3 periods for each metric
      const { data: values } = await supabase
        .from("metric_values")
        .select("*, metric_definitions!metric_id(code, name)")
        .eq("org_id", org.id)
        .eq("period_type", "MONTHLY")
        .order("period_start", { ascending: false });

      // Group by metric
      const byMetric: Record<string, any[]> = {};
      for (const v of values ?? []) {
        const code = (v as any).metric_definitions?.code;
        if (!code) continue;
        if (!byMetric[code]) byMetric[code] = [];
        byMetric[code].push(v);
      }

      // Trend alert: 3 periods declining
      for (const [code, periods] of Object.entries(byMetric)) {
        if (periods.length >= 3) {
          const [p1, p2, p3] = periods;
          if (p1.trend === "DOWN" && p2.trend === "DOWN" && p3.trend === "DOWN") {
            await supabase.from("tasks").insert({
              org_id: org.id,
              title: `Fallande trend: ${(p1 as any).metric_definitions?.name} — 3 perioder i rad`,
              description: `${code} har sjunkit 3 perioder i rad. Undersök orsaken.`,
              status: "TODO",
              priority: "MEDIUM",
              type: "METRIC_TREND_ALERT",
            });
            alertCount++;
          }
        }
      }

      // Correlation: NC increasing AND supplier rating decreasing
      const ncTrend = byMetric["NC_OPEN_COUNT"]?.[0]?.trend;
      const supplierTrend = byMetric["SUPPLIER_AVG_RATING"]?.[0]?.trend;
      if (ncTrend === "UP" && supplierTrend === "DOWN") {
        await supabase.from("tasks").insert({
          org_id: org.id,
          title: "Korrelation: NC ökar + leverantörsbetyg sjunker",
          description: "Avvikelser ökar samtidigt som leverantörers snittbetyg sjunker. Undersök leverantörskoppling.",
          status: "TODO",
          priority: "HIGH",
          type: "METRIC_CORRELATION_ALERT",
        });
        alertCount++;
      }
    }

    console.log(`[metrics] Smart alerts: ${alertCount} alerts generated`);
    return { alerts: alertCount };
  },
});
