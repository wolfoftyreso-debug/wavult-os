// ---------------------------------------------------------------------------
// Quality-by-Design + Decision Intelligence Background Jobs
// ISO 8.5.1, 9.1.3, 10.3
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";
import { detectPatterns } from "../src/decision-intelligence";

// ---------------------------------------------------------------------------
// Daily 04:00: Compute entity_impact_paths (graph traversal cache)
// ---------------------------------------------------------------------------
export const impactPathCalculation = schedules.task({
  id: "impact-path-calculation",
  cron: "0 4 * * *",
  run: async () => {
    // Clear stale paths (>24h)
    await supabase.from("entity_impact_paths")
      .delete()
      .lt("calculated_at", new Date(Date.now() - 24 * 3600000).toISOString());

    // Get all NCs, complaints, and suppliers (high-value entities for impact)
    const { data: entities } = await supabase
      .from("entities")
      .select("id, type")
      .in("type", ["non_conformance", "complaint", "supplier", "deal"])
      .order("created_at", { ascending: false })
      .limit(100);

    let pathsCreated = 0;
    for (const entity of entities ?? []) {
      // Get direct relations
      const { data: outgoing } = await supabase
        .from("entity_relations")
        .select("to_entity_id, to_entity_type, relation_type")
        .eq("from_entity_id", entity.id);

      for (const rel of outgoing ?? []) {
        // Get secondary relations
        const { data: secondary } = await supabase
          .from("entity_relations")
          .select("to_entity_id, to_entity_type, relation_type")
          .eq("from_entity_id", rel.to_entity_id)
          .limit(5);

        for (const sec of secondary ?? []) {
          const { data: existing } = await supabase
            .from("entity_impact_paths")
            .select("id")
            .eq("source_entity_id", entity.id)
            .eq("target_entity_id", sec.to_entity_id)
            .maybeSingle();

          if (!existing) {
            await supabase.from("entity_impact_paths").insert({
              org_id: null, // determined from entity
              source_entity_id: entity.id,
              source_entity_type: entity.type,
              target_entity_id: sec.to_entity_id,
              target_entity_type: sec.to_entity_type,
              path: [entity.id, rel.to_entity_id, sec.to_entity_id],
              path_length: 2,
              relationship_chain: [rel.relation_type, sec.relation_type],
              impact_type: entity.type === "non_conformance" ? "QUALITY" : "CAUSAL",
              impact_strength: 0.5,
            });
            pathsCreated++;
          }
        }
      }
    }

    console.log(`[quality] Impact paths: ${pathsCreated} paths computed`);
    return { paths_created: pathsCreated };
  },
});

// ---------------------------------------------------------------------------
// Daily 05:00: Pattern detection
// ---------------------------------------------------------------------------
export const patternDetection = schedules.task({
  id: "pattern-detection",
  cron: "0 5 * * *",
  run: async () => {
    const { data: orgs } = await supabase.from("organizations").select("id");
    let totalPatterns = 0;

    for (const org of orgs ?? []) {
      const patterns = await detectPatterns(org.id);

      for (const pattern of patterns) {
        // Check if same pattern already exists unacknowledged
        const { count } = await supabase
          .from("pattern_detections")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("pattern_type", pattern.pattern_type)
          .eq("acknowledged", false);

        if ((count ?? 0) === 0) {
          await supabase.from("pattern_detections").insert({
            org_id: org.id,
            ...pattern,
          });
          totalPatterns++;

          // Create task for HIGH severity patterns
          if (pattern.severity === "HIGH") {
            await supabase.from("tasks").insert({
              org_id: org.id,
              title: `Mönster: ${pattern.title}`,
              description: pattern.description,
              status: "TODO",
              priority: "HIGH",
              type: "PATTERN_ALERT",
            });
          }
        }
      }
    }

    console.log(`[quality] Pattern detection: ${totalPatterns} new patterns`);
    return { patterns_detected: totalPatterns };
  },
});

// ---------------------------------------------------------------------------
// Weekly: First Pass Yield + Rework Rate report
// ---------------------------------------------------------------------------
export const qualityWeeklyReport = schedules.task({
  id: "quality-weekly-report",
  cron: "0 8 * * 1",
  run: async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: scores } = await supabase
      .from("execution_quality_scores")
      .select("*")
      .gte("calculated_at", weekAgo);

    if (!scores || scores.length === 0) {
      console.log("[quality] Weekly report: no executions this week");
      return { executions: 0 };
    }

    const total = scores.length;
    const fpyCount = scores.filter(s => s.first_pass_yield).length;
    const reworkCount = scores.filter(s => s.rework_count > 0).length;
    const avgScore = scores.reduce((s, sc) => s + Number(sc.quality_score ?? 0), 0) / total;
    const totalBypasses = scores.reduce((s, sc) => s + (sc.gates_bypassed ?? 0), 0);

    const report = {
      executions: total,
      first_pass_yield_pct: Math.round((fpyCount / total) * 100),
      rework_rate_pct: Math.round((reworkCount / total) * 100),
      avg_quality_score: Math.round(avgScore * 10) / 10,
      total_gate_bypasses: totalBypasses,
    };

    await supabase.from("audit_logs").insert({
      entity_type: "quality",
      action: "weekly_report",
      metadata: report,
    });

    // Alert if FPY < 80%
    if (report.first_pass_yield_pct < 80) {
      const { data: orgs } = await supabase.from("organizations").select("id");
      for (const org of orgs ?? []) {
        await supabase.from("tasks").insert({
          org_id: org.id,
          title: `First Pass Yield: ${report.first_pass_yield_pct}% (mål: 95%)`,
          description: `Veckorapport: ${report.rework_rate_pct}% omarbetningsgrad. ${report.total_gate_bypasses} gate-bypass. Granska processer med flest failures.`,
          status: "TODO",
          priority: "HIGH",
          type: "QUALITY_REPORT",
        });
      }
    }

    console.log(`[quality] Weekly report: FPY ${report.first_pass_yield_pct}%, rework ${report.rework_rate_pct}%`);
    return report;
  },
});

// ---------------------------------------------------------------------------
// Monthly: Cost of Quality calculation
// ---------------------------------------------------------------------------
export const costOfQualityCalc = schedules.task({
  id: "cost-of-quality-monthly",
  cron: "0 9 1 * *",
  run: async () => {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // NC costs (estimate: each NC = ~500 EUR average — configurable)
    const { count: ncCount } = await supabase
      .from("non_conformances")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo);

    // Complaint costs
    const { count: complaintCount } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo);

    // Rework hours (waste_duration_min)
    const { data: reworkData } = await supabase
      .from("execution_quality_scores")
      .select("waste_duration_min")
      .gte("calculated_at", monthAgo);

    const wasteMinutes = (reworkData ?? []).reduce((s, r) => s + (r.waste_duration_min ?? 0), 0);
    const wasteHours = wasteMinutes / 60;

    // Estimate: 60 EUR/hour average cost
    const costPerHour = 60;
    const ncCost = (ncCount ?? 0) * 500;
    const complaintCost = (complaintCount ?? 0) * 300;
    const reworkCost = Math.round(wasteHours * costPerHour);
    const totalCost = ncCost + complaintCost + reworkCost;

    const report = {
      period: new Date().toISOString().slice(0, 7),
      nc_count: ncCount ?? 0,
      nc_cost_eur: ncCost,
      complaint_count: complaintCount ?? 0,
      complaint_cost_eur: complaintCost,
      rework_hours: Math.round(wasteHours),
      rework_cost_eur: reworkCost,
      total_cost_of_quality_eur: totalCost,
    };

    await supabase.from("audit_logs").insert({
      entity_type: "quality",
      action: "cost_of_quality_monthly",
      metadata: report,
    });

    console.log(`[quality] Cost of Quality: €${totalCost} (NC: €${ncCost}, complaints: €${complaintCost}, rework: €${reworkCost})`);
    return report;
  },
});
