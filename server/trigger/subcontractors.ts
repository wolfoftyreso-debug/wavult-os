// ---------------------------------------------------------------------------
// Subcontractors & Supply Chain Background Jobs
// ISO 8.4 — Complete supply chain quality control
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// Daily 08:00: Flowdown declaration expiry check
// ---------------------------------------------------------------------------
export const flowdownDeclarationExpiry = schedules.task({
  id: "flowdown-declaration-expiry",
  cron: "0 8 * * *",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    // Expire declarations
    const { data: expired } = await supabase
      .from("supplier_declarations")
      .update({ declaration_status: "EXPIRED", updated_at: new Date().toISOString() })
      .eq("declaration_status", "ACCEPTED")
      .lt("valid_until", today)
      .select("id, org_id, supplier_id, requirement_id");

    for (const d of expired ?? []) {
      const { data: req } = await supabase.from("flowdown_requirements").select("title").eq("id", d.requirement_id).single();
      const { data: sup } = await supabase.from("suppliers").select("supplier_code, companies!company_id(name)").eq("id", d.supplier_id).single();

      await supabase.from("tasks").insert({
        org_id: d.org_id,
        title: `Förnya deklaration: ${(sup as any)?.companies?.name ?? sup?.supplier_code} — ${req?.title ?? ""}`,
        description: `Leverantörsdeklarationen har löpt ut. Begär förnyelse. ISO 8.4.3.`,
        status: "TODO",
        priority: "HIGH",
        type: "SUPPLIER_FLOWDOWN",
        reference_id: d.id,
      });
    }

    // Expiring within 30 days — reminder
    const { data: expiring } = await supabase
      .from("supplier_declarations")
      .select("id, org_id, supplier_id, requirement_id, valid_until")
      .eq("declaration_status", "ACCEPTED")
      .lte("valid_until", in30)
      .gt("valid_until", today);

    console.log(`[subcontractors] Declaration check: ${expired?.length ?? 0} expired, ${expiring?.length ?? 0} expiring soon`);
    return { expired: expired?.length ?? 0, expiring: expiring?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// Daily 09:00: Outsourced process monitoring check
// ---------------------------------------------------------------------------
export const outsourcedProcessMonitoring = schedules.task({
  id: "outsourced-process-monitoring",
  cron: "0 9 * * *",
  run: async () => {
    const { data: overdue } = await supabase
      .from("v_outsourced_process_status")
      .select("*")
      .in("monitoring_status", ["OVERDUE", "NEVER_MONITORED"]);

    for (const op of overdue ?? []) {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("reference_id", op.outsourced_process_id)
        .eq("type", "OUTSOURCED_MONITORING")
        .in("status", ["TODO", "IN_PROGRESS"]);

      if ((count ?? 0) === 0) {
        await supabase.from("tasks").insert({
          org_id: op.org_id,
          title: `Monitorering försenad: ${op.process_name} (${op.supplier_name})`,
          description: `Outsourcad process "${op.process_name}" har ${op.monitoring_status === "NEVER_MONITORED" ? "aldrig" : "försenad"} monitorering. ISO 8.4.2.`,
          status: "TODO",
          priority: op.monitoring_status === "NEVER_MONITORED" ? "HIGH" : "MEDIUM",
          type: "OUTSOURCED_MONITORING",
          reference_id: op.outsourced_process_id,
        });
      }
    }

    console.log(`[subcontractors] Monitoring check: ${overdue?.length ?? 0} overdue/never monitored`);
    return { overdue: overdue?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// Weekly: Supply chain risk scan
// ---------------------------------------------------------------------------
export const supplyChainRiskScan = schedules.task({
  id: "supply-chain-risk-scan",
  cron: "0 10 * * 1",
  run: async () => {
    const { data: risks } = await supabase
      .from("v_supply_chain_depth")
      .select("*")
      .neq("risk_flag", "OK");

    const riskSummary: Record<string, number> = {};
    for (const r of risks ?? []) {
      riskSummary[r.risk_flag] = (riskSummary[r.risk_flag] ?? 0) + 1;
    }

    if ((risks?.length ?? 0) > 0) {
      const orgs = [...new Set((risks ?? []).map((r: any) => r.org_id).filter(Boolean))];
      for (const org_id of orgs) {
        await supabase.from("tasks").insert({
          org_id,
          title: `Supply chain risker: ${risks?.length ?? 0} flaggade leverantörskedjor`,
          description: `Veckovis riskskanning: ${JSON.stringify(riskSummary)}. ISO 8.4.3f.`,
          status: "TODO",
          priority: riskSummary["UNDISCLOSED"] ? "HIGH" : "MEDIUM",
          type: "SUPPLY_CHAIN_RISK",
        });
      }
    }

    await supabase.from("audit_logs").insert({
      entity_type: "supply_chain",
      action: "weekly_risk_scan",
      metadata: { risk_count: risks?.length ?? 0, summary: riskSummary },
    });

    console.log(`[subcontractors] Risk scan: ${risks?.length ?? 0} risks found`);
    return { risks: risks?.length ?? 0, summary: riskSummary };
  },
});

// ---------------------------------------------------------------------------
// Weekly: Receiving inspection reject trend
// ---------------------------------------------------------------------------
export const receivingInspectionTrend = schedules.task({
  id: "receiving-inspection-trend",
  cron: "0 11 * * 1",
  run: async () => {
    // Check if reject rate increasing 3 months in a row for any supplier
    const { data: trend } = await supabase
      .from("v_receiving_inspection_trend")
      .select("*")
      .order("month", { ascending: false });

    // Group by supplier
    const bySupplier: Record<string, any[]> = {};
    for (const t of trend ?? []) {
      const key = t.supplier_code;
      if (!bySupplier[key]) bySupplier[key] = [];
      bySupplier[key].push(t);
    }

    let alertCount = 0;
    for (const [code, months] of Object.entries(bySupplier)) {
      if (months.length >= 3) {
        const [m1, m2, m3] = months; // most recent first
        if (m1.reject_rate_pct > m2.reject_rate_pct && m2.reject_rate_pct > m3.reject_rate_pct && m1.reject_rate_pct > 0) {
          alertCount++;
          await supabase.from("tasks").insert({
            org_id: m1.org_id,
            title: `Ökande rejekt: ${m1.supplier_name} (${code})`,
            description: `Rejektgraden har ökat 3 månader i rad: ${m3.reject_rate_pct}% → ${m2.reject_rate_pct}% → ${m1.reject_rate_pct}%. Åtgärd krävs. ISO 8.4.`,
            status: "TODO",
            priority: "HIGH",
            type: "SUPPLIER_QUALITY",
          });
        }
      }
    }

    console.log(`[subcontractors] Inspection trend: ${alertCount} suppliers with increasing reject rate`);
    return { suppliers_checked: Object.keys(bySupplier).length, alerts: alertCount };
  },
});

// ---------------------------------------------------------------------------
// Monthly: Flowdown compliance report
// ---------------------------------------------------------------------------
export const flowdownComplianceReport = schedules.task({
  id: "flowdown-compliance-report",
  cron: "0 9 1 * *",
  run: async () => {
    const { data: compliance } = await supabase
      .from("v_flowdown_compliance")
      .select("*");

    const statusCounts: Record<string, number> = {};
    for (const c of compliance ?? []) {
      statusCounts[c.compliance_status] = (statusCounts[c.compliance_status] ?? 0) + 1;
    }

    const report = {
      total_combinations: compliance?.length ?? 0,
      compliant: statusCounts["COMPLIANT"] ?? 0,
      missing: statusCounts["MISSING"] ?? 0,
      expired: statusCounts["EXPIRED"] ?? 0,
      rejected: statusCounts["REJECTED"] ?? 0,
      pending: statusCounts["PENDING"] ?? 0,
    };

    await supabase.from("audit_logs").insert({
      entity_type: "flowdown",
      action: "monthly_compliance_report",
      metadata: report,
    });

    if (report.missing > 0 || report.expired > 0) {
      const orgs = [...new Set((compliance ?? []).map((c: any) => c.org_id).filter(Boolean))];
      for (const org_id of orgs) {
        await supabase.from("tasks").insert({
          org_id,
          title: `Flowdown gaps: ${report.missing} saknade, ${report.expired} utgångna deklarationer`,
          description: `Månatlig flowdown-rapport. ${report.compliant} av ${report.total_combinations} krav×leverantör-kombinationer är compliant. ISO 8.4.3.`,
          status: "TODO",
          priority: report.missing > 5 ? "HIGH" : "MEDIUM",
          type: "COMPLIANCE",
        });
      }
    }

    console.log(`[subcontractors] Flowdown report: ${JSON.stringify(report)}`);
    return report;
  },
});
