// ---------------------------------------------------------------------------
// Supplier Management Background Jobs
// ISO 8.4 — Control of externally provided processes
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// Daily 08:00: Check supplier reapproval deadlines
// ---------------------------------------------------------------------------
export const supplierReapprovalCheck = schedules.task({
  id: "supplier-reapproval-check",
  cron: "0 8 * * *",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    // Suppliers due for reapproval within 30 days
    const { data: dueSoon } = await supabase
      .from("suppliers")
      .select("id, org_id, supplier_code, companies!company_id(name), criticality, next_reapproval_date")
      .in("status", ["APPROVED", "CONDITIONALLY_APPROVED"])
      .lte("next_reapproval_date", in30);

    for (const supplier of dueSoon ?? []) {
      const isOverdue = supplier.next_reapproval_date < today;
      const companyName = (supplier as any).companies?.name ?? supplier.supplier_code;
      const priority = isOverdue ? "HIGH" : supplier.criticality === "CRITICAL" ? "HIGH" : "MEDIUM";

      // Check if task already exists
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("reference_id", supplier.id)
        .eq("type", "SUPPLIER_REAPPROVAL")
        .in("status", ["TODO", "IN_PROGRESS"]);

      if ((count ?? 0) === 0) {
        await supabase.from("tasks").insert({
          org_id: supplier.org_id,
          title: isOverdue
            ? `FÖRFALLEN: Leverantörsbedömning ${companyName} (${supplier.supplier_code})`
            : `Leverantörsbedömning förfaller: ${companyName} (${supplier.supplier_code})`,
          description: `Nästa bedömningsdatum: ${supplier.next_reapproval_date}. Kritikalitet: ${supplier.criticality}. ISO 8.4.`,
          status: "TODO",
          priority,
          type: "SUPPLIER_REAPPROVAL",
          reference_id: supplier.id,
        });
      }

      // Auto-escalate: if overdue > 30 days and CRITICAL → place ON_WATCH
      if (isOverdue && supplier.criticality === "CRITICAL") {
        const overdueDays = Math.round((Date.now() - new Date(supplier.next_reapproval_date).getTime()) / 86400000);
        if (overdueDays > 30) {
          await supabase.from("suppliers")
            .update({ status: "ON_WATCH", updated_at: new Date().toISOString() })
            .eq("id", supplier.id)
            .eq("status", "APPROVED");

          await supabase.from("audit_logs").insert({
            entity_type: "supplier",
            entity_id: supplier.id,
            action: "auto_watch_overdue_reapproval",
            metadata: { overdue_days: overdueDays, criticality: supplier.criticality },
          });
        }
      }
    }

    console.log(`[suppliers] Reapproval check: ${dueSoon?.length ?? 0} due/overdue`);
    return { due_soon: dueSoon?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// Monthly 1st: Supplier performance summary
// ---------------------------------------------------------------------------
export const supplierMonthlyPerformance = schedules.task({
  id: "supplier-monthly-performance",
  cron: "0 9 1 * *",
  run: async () => {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Count NCs per supplier in last 30 days
    const { data: ncCounts } = await supabase
      .from("supplier_nc_register")
      .select("supplier_id")
      .gte("created_at", monthAgo);

    const ncPerSupplier: Record<string, number> = {};
    for (const nc of ncCounts ?? []) {
      ncPerSupplier[nc.supplier_id] = (ncPerSupplier[nc.supplier_id] ?? 0) + 1;
    }

    // Underperforming suppliers (rating < 2.5)
    const { data: underperforming } = await supabase
      .from("suppliers")
      .select("id, org_id, supplier_code, companies!company_id(name), current_rating, criticality")
      .in("status", ["APPROVED", "CONDITIONALLY_APPROVED", "ON_WATCH"])
      .lt("current_rating", 2.5)
      .gt("current_rating", 0);

    // ON_WATCH suppliers
    const { data: onWatch } = await supabase
      .from("suppliers")
      .select("id, org_id, supplier_code, companies!company_id(name)")
      .eq("status", "ON_WATCH");

    const report = {
      month: new Date().toISOString().slice(0, 7),
      nc_count_total: ncCounts?.length ?? 0,
      nc_per_supplier: ncPerSupplier,
      underperforming_count: underperforming?.length ?? 0,
      on_watch_count: onWatch?.length ?? 0,
    };

    await supabase.from("audit_logs").insert({
      entity_type: "supplier",
      action: "monthly_performance_report",
      metadata: report,
    });

    // Create task if there are underperforming suppliers
    if ((underperforming?.length ?? 0) > 0) {
      const orgs = [...new Set((underperforming ?? []).map((s: any) => s.org_id).filter(Boolean))];
      for (const org_id of orgs) {
        await supabase.from("tasks").insert({
          org_id,
          title: `Leverantörsprestation: ${(underperforming ?? []).filter((s: any) => s.org_id === org_id).length} leverantörer under gränsvärde`,
          description: `Månatlig leverantörsrapport: Se leverantörer med rating < 2.5. ISO 8.4 kräver åtgärd.`,
          status: "TODO",
          priority: "MEDIUM",
          type: "COMPLIANCE",
        });
      }
    }

    console.log(`[suppliers] Monthly report: ${ncCounts?.length ?? 0} NCs, ${underperforming?.length ?? 0} underperforming`);
    return report;
  },
});

// ---------------------------------------------------------------------------
// Weekly: Check single-source critical suppliers
// ---------------------------------------------------------------------------
export const supplierSingleSourceCheck = schedules.task({
  id: "supplier-single-source-check",
  cron: "0 10 * * 1",
  run: async () => {
    const { data: singleSource } = await supabase
      .from("suppliers")
      .select("id, org_id, supplier_code, companies!company_id(name), criticality, alternative_supplier_ids")
      .eq("single_source", true)
      .in("criticality", ["CRITICAL", "HIGH"])
      .in("status", ["APPROVED", "CONDITIONALLY_APPROVED"]);

    const atRisk = (singleSource ?? []).filter(
      (s: any) => !s.alternative_supplier_ids || s.alternative_supplier_ids.length === 0
    );

    if (atRisk.length > 0) {
      await supabase.from("audit_logs").insert({
        entity_type: "supplier",
        action: "single_source_risk_alert",
        metadata: { at_risk_count: atRisk.length, suppliers: atRisk.map((s: any) => s.supplier_code) },
      });
    }

    console.log(`[suppliers] Single-source check: ${singleSource?.length ?? 0} single-source, ${atRisk.length} at risk`);
    return { single_source: singleSource?.length ?? 0, at_risk: atRisk.length };
  },
});

// ---------------------------------------------------------------------------
// Quarterly: Generate Approved Supplier List snapshot
// ---------------------------------------------------------------------------
export const supplierApprovedListGeneration = schedules.task({
  id: "supplier-approved-list-quarterly",
  cron: "0 9 1 1,4,7,10 *",
  run: async () => {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, supplier_code, companies!company_id(name), category, criticality, current_rating, approved_at, certifications, quality_contact")
      .in("status", ["APPROVED", "CONDITIONALLY_APPROVED"]);

    if (!suppliers || suppliers.length === 0) {
      console.log("[suppliers] No approved suppliers to snapshot");
      return { generated: false };
    }

    // Get distinct orgs
    const { data: orgs } = await supabase.from("organizations").select("id");
    for (const org of orgs ?? []) {
      // Deactivate old
      await supabase.from("approved_supplier_list")
        .update({ is_current: false })
        .eq("org_id", org.id)
        .eq("is_current", true);

      // Insert new
      await supabase.from("approved_supplier_list").insert({
        org_id: org.id,
        valid_from: new Date().toISOString().slice(0, 10),
        suppliers: suppliers,
        is_current: true,
      });
    }

    console.log(`[suppliers] Approved list generated: ${suppliers.length} suppliers`);
    return { generated: true, supplier_count: suppliers.length };
  },
});
