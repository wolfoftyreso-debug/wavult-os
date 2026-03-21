import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. Asset Calibration Status Check — Daily at 06:00 UTC
// ---------------------------------------------------------------------------
export const assetCalibrationStatusCheck = schedules.task({
  id: "asset-calibration-status-check",
  cron: "0 6 * * *",
  run: async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const results = { checked: 0, overdue: 0, due_soon: 0, updated: 0 };

    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, status, next_calibration_due")
      .eq("requires_calibration", true)
      .not("status", "in", '("DECOMMISSIONED","DISPOSED")');

    if (error) throw new Error(`assetCalibrationStatusCheck (fetch): ${error.message}`);

    for (const asset of assets ?? []) {
      results.checked++;

      if (!asset.next_calibration_due) continue;

      const calibrationDue = new Date(asset.next_calibration_due);

      if (calibrationDue < today) {
        // Overdue
        if (asset.status !== "CALIBRATION_OVERDUE") {
          const { error: updateErr } = await supabase
            .from("assets")
            .update({ status: "CALIBRATION_OVERDUE", updated_at: now.toISOString() })
            .eq("id", asset.id);

          if (updateErr) throw new Error(`assetCalibrationStatusCheck (update overdue): ${updateErr.message}`);

          results.updated++;
        }
        results.overdue++;
      } else if (calibrationDue <= sevenDaysFromNow) {
        // Due soon (within 7 days, not yet overdue)
        if (asset.status !== "CALIBRATION_DUE") {
          const { error: updateErr } = await supabase
            .from("assets")
            .update({ status: "CALIBRATION_DUE", updated_at: now.toISOString() })
            .eq("id", asset.id);

          if (updateErr) throw new Error(`assetCalibrationStatusCheck (update due): ${updateErr.message}`);

          results.updated++;
        }
        results.due_soon++;
      } else {
        // Within schedule — reset if previously OVERDUE or CALIBRATION_DUE
        if (asset.status === "CALIBRATION_OVERDUE" || asset.status === "CALIBRATION_DUE") {
          const { error: updateErr } = await supabase
            .from("assets")
            .update({ status: "ACTIVE", updated_at: now.toISOString() })
            .eq("id", asset.id);

          if (updateErr) throw new Error(`assetCalibrationStatusCheck (reset to active): ${updateErr.message}`);

          results.updated++;
        }
      }
    }

    console.log("asset-calibration-status-check summary:", results);
    return results;
  },
});

// ---------------------------------------------------------------------------
// 2. Asset Maintenance Due Check — Daily at 06:30 UTC
// ---------------------------------------------------------------------------
export const assetMaintenanceDueCheck = schedules.task({
  id: "asset-maintenance-due-check",
  cron: "30 6 * * *",
  run: async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowISO = now.toISOString();

    const results = { checked: 0, overdue_count: 0, auto_scheduled: 0 };

    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, next_maintenance_due")
      .eq("requires_maintenance", true)
      .not("next_maintenance_due", "is", null)
      .not("status", "in", '("DECOMMISSIONED","DISPOSED","UNDER_MAINTENANCE")');

    if (error) throw new Error(`assetMaintenanceDueCheck (fetch): ${error.message}`);

    for (const asset of assets ?? []) {
      results.checked++;

      const maintenanceDue = new Date(asset.next_maintenance_due);

      if (maintenanceDue < today) {
        results.overdue_count++;

        // Check if there's already a SCHEDULED maintenance record for this asset in the future
        const { data: existingMaintenance, error: checkErr } = await supabase
          .from("maintenance_records")
          .select("id")
          .eq("asset_id", asset.id)
          .eq("status", "SCHEDULED")
          .gt("scheduled_date", today.toISOString())
          .limit(1);

        if (checkErr) throw new Error(`assetMaintenanceDueCheck (check existing): ${checkErr.message}`);

        if ((existingMaintenance ?? []).length > 0) {
          // Already has scheduled future maintenance — skip
          continue;
        }

        // Auto-schedule preventive maintenance
        const { error: insertErr } = await supabase
          .from("maintenance_records")
          .insert({
            asset_id: asset.id,
            type: "PREVENTIVE",
            status: "SCHEDULED",
            scheduled_date: asset.next_maintenance_due,
            description: "Auto-scheduled: overdue preventive maintenance",
            created_at: nowISO,
          });

        if (insertErr) throw new Error(`assetMaintenanceDueCheck (insert): ${insertErr.message}`);

        results.auto_scheduled++;
      }
    }

    console.log("asset-maintenance-due-check summary:", results);
    return results;
  },
});

// ---------------------------------------------------------------------------
// 3. Asset License Expiry Check — Daily at 07:00 UTC
// ---------------------------------------------------------------------------
export const assetLicenseExpiryCheck = schedules.task({
  id: "asset-license-expiry-check",
  cron: "0 7 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const results = { checked: 0, expiring_soon: 0, alerts_created: 0 };

    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, name, status, warranty_expiry, manufacturer, asset_type")
      .in("asset_type", ["SOFTWARE_LICENSE", "IT_SYSTEM"])
      .not("warranty_expiry", "is", null);

    if (error) throw new Error(`assetLicenseExpiryCheck (fetch): ${error.message}`);

    for (const asset of assets ?? []) {
      results.checked++;

      const warrantyExpiry = new Date(asset.warranty_expiry);

      if (warrantyExpiry < thirtyDaysFromNow && asset.status === "ACTIVE") {
        results.expiring_soon++;

        // Check if there's already a pending critical/major system_update for this asset about license
        const { data: existingUpdate, error: checkErr } = await supabase
          .from("system_updates")
          .select("id")
          .eq("asset_id", asset.id)
          .eq("status", "AVAILABLE")
          .ilike("title", "%license%")
          .in("severity", ["CRITICAL", "MAJOR"])
          .limit(1);

        if (checkErr) throw new Error(`assetLicenseExpiryCheck (check existing): ${checkErr.message}`);

        if ((existingUpdate ?? []).length > 0) {
          // Alert already exists — skip
          continue;
        }

        const { error: insertErr } = await supabase
          .from("system_updates")
          .insert({
            asset_id: asset.id,
            title: `Licens förnyelse krävs: ${asset.name}`,
            severity: "MAJOR",
            status: "AVAILABLE",
            description: `Licens/garanti löper ut ${asset.warranty_expiry}`,
            vendor: asset.manufacturer,
            created_at: nowISO,
          });

        if (insertErr) throw new Error(`assetLicenseExpiryCheck (insert): ${insertErr.message}`);

        results.alerts_created++;
      }
    }

    console.log("asset-license-expiry-check summary:", results);
    return results;
  },
});

// ---------------------------------------------------------------------------
// 4. Asset Weekly Summary — Every Monday at 08:00 UTC
// ---------------------------------------------------------------------------
export const assetWeeklySummary = schedules.task({
  id: "asset-weekly-summary",
  cron: "0 8 * * 1",
  run: async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowISO = now.toISOString();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: orgs, error: orgErr } = await supabase
      .from("organisations")
      .select("id");

    if (orgErr) throw new Error(`assetWeeklySummary (orgs): ${orgErr.message}`);

    for (const org of orgs ?? []) {
      // Count assets by status
      const { data: allAssets, error: assetsErr } = await supabase
        .from("assets")
        .select("id, status, criticality_level, next_maintenance_due")
        .eq("organisation_id", org.id);

      if (assetsErr) throw new Error(`assetWeeklySummary (assets): ${assetsErr.message}`);

      const statusCounts: Record<string, number> = {};
      let calibrations_due = 0;
      let maintenance_due = 0;
      let critical_assets = 0;

      for (const asset of allAssets ?? []) {
        statusCounts[asset.status] = (statusCounts[asset.status] ?? 0) + 1;

        if (asset.status === "CALIBRATION_DUE" || asset.status === "CALIBRATION_OVERDUE") {
          calibrations_due++;
        }

        if (
          asset.next_maintenance_due &&
          new Date(asset.next_maintenance_due) <= sevenDaysFromNow
        ) {
          maintenance_due++;
        }

        if (asset.criticality_level === 5) {
          critical_assets++;
        }
      }

      // Count pending system_updates for IT assets in this org
      const { data: itAssets, error: itErr } = await supabase
        .from("assets")
        .select("id")
        .eq("organisation_id", org.id)
        .in("asset_type", ["IT_SYSTEM", "SOFTWARE_LICENSE"]);

      if (itErr) throw new Error(`assetWeeklySummary (it assets): ${itErr.message}`);

      const itAssetIds = (itAssets ?? []).map((a) => a.id);

      let pending_updates = 0;

      if (itAssetIds.length > 0) {
        const { data: updates, error: updatesErr } = await supabase
          .from("system_updates")
          .select("id")
          .in("asset_id", itAssetIds)
          .eq("status", "AVAILABLE");

        if (updatesErr) throw new Error(`assetWeeklySummary (updates): ${updatesErr.message}`);

        pending_updates = (updates ?? []).length;
      }

      const summary = {
        organisation_id: org.id,
        status_counts: statusCounts,
        total_assets: (allAssets ?? []).length,
        calibrations_due,
        maintenance_due,
        pending_updates,
        critical_assets,
        generated_at: nowISO,
      };

      const { error: auditErr } = await supabase
        .from("audit_logs")
        .insert({
          entity_type: "asset_summary",
          action: "weekly_summary",
          organisation_id: org.id,
          metadata: summary,
          created_at: nowISO,
        });

      if (auditErr) throw new Error(`assetWeeklySummary (audit_log): ${auditErr.message}`);

      console.log(`asset-weekly-summary org ${org.id}:`, summary);
    }

    return { organisations_processed: (orgs ?? []).length };
  },
});

// ---------------------------------------------------------------------------
// 5. Asset Authorization Expiry Check — Daily at 07:30 UTC
// ---------------------------------------------------------------------------
export const assetAuthorizationExpiryCheck = schedules.task({
  id: "asset-authorization-expiry-check",
  cron: "30 7 * * *",
  run: async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowISO = now.toISOString();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const results = { checked: 0, expired: 0, expiring_soon: 0 };

    // Query authorizations that are active, have valid_until set, and expire within 7 days
    const { data: authorizations, error } = await supabase
      .from("asset_user_authorizations")
      .select("id, asset_id, user_id, valid_until")
      .eq("is_active", true)
      .not("valid_until", "is", null)
      .lt("valid_until", sevenDaysFromNow.toISOString());

    if (error) throw new Error(`assetAuthorizationExpiryCheck (fetch): ${error.message}`);

    for (const auth of authorizations ?? []) {
      results.checked++;

      const validUntil = new Date(auth.valid_until);

      if (validUntil < today) {
        // Already expired — deactivate
        const { error: updateErr } = await supabase
          .from("asset_user_authorizations")
          .update({ is_active: false, updated_at: nowISO })
          .eq("id", auth.id);

        if (updateErr) throw new Error(`assetAuthorizationExpiryCheck (deactivate): ${updateErr.message}`);

        results.expired++;
      } else {
        // Expiring within the next 7 days — log warning
        const daysUntilExpiry = Math.ceil(
          (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.warn(
          `asset-authorization-expiry-check: Authorization ${auth.id} for asset ${auth.asset_id} / user ${auth.user_id} expires in ${daysUntilExpiry} day(s) (${auth.valid_until})`
        );
        results.expiring_soon++;
      }
    }

    console.log("asset-authorization-expiry-check summary:", results);
    return results;
  },
});

// ---------------------------------------------------------------------------
// 6. Asset Quarterly Cost Analysis — First day of each quarter at 09:00 UTC
// ---------------------------------------------------------------------------
export const assetQuarterlyCostAnalysis = schedules.task({
  id: "asset-quarterly-cost-analysis",
  cron: "0 9 1 1,4,7,10 *",
  run: async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowISO = now.toISOString();

    // Start of this quarter (first day of current quarter month, 00:00)
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    // Start of previous quarter
    const prevQuarterStart = new Date(quarterStart.getTime() - 91 * 24 * 60 * 60 * 1000);
    // Use 3 months back as the "last quarter" window
    const threeMonthsAgo = new Date(today.getTime() - 91 * 24 * 60 * 60 * 1000);

    const results = {
      assets_updated: 0,
      total_current_value: 0,
      quarterly_maintenance_cost: 0,
    };

    // Fetch assets with purchase_cost and depreciation_rate set
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, purchase_cost, depreciation_rate, purchase_date, current_value")
      .not("purchase_cost", "is", null)
      .not("depreciation_rate", "is", null);

    if (error) throw new Error(`assetQuarterlyCostAnalysis (fetch assets): ${error.message}`);

    for (const asset of assets ?? []) {
      if (asset.purchase_date == null) continue;

      const purchaseDate = new Date(asset.purchase_date);
      const yearsElapsed =
        (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

      let currentValue =
        asset.purchase_cost * (1 - (asset.depreciation_rate / 100) * yearsElapsed);

      if (currentValue < 0) currentValue = 0;

      const { error: updateErr } = await supabase
        .from("assets")
        .update({ current_value: currentValue, updated_at: nowISO })
        .eq("id", asset.id);

      if (updateErr) throw new Error(`assetQuarterlyCostAnalysis (update asset): ${updateErr.message}`);

      results.assets_updated++;
      results.total_current_value += currentValue;
    }

    // Sum total maintenance costs from maintenance_records in the last quarter
    const { data: maintenanceRecords, error: maintErr } = await supabase
      .from("maintenance_records")
      .select("cost")
      .not("cost", "is", null)
      .gte("completed_date", threeMonthsAgo.toISOString())
      .lte("completed_date", nowISO);

    if (maintErr) throw new Error(`assetQuarterlyCostAnalysis (fetch maintenance): ${maintErr.message}`);

    for (const record of maintenanceRecords ?? []) {
      results.quarterly_maintenance_cost += record.cost ?? 0;
    }

    // Round values for readability
    results.total_current_value = Math.round(results.total_current_value * 100) / 100;
    results.quarterly_maintenance_cost = Math.round(results.quarterly_maintenance_cost * 100) / 100;

    // Insert audit_log entry with summary
    const { error: auditErr } = await supabase
      .from("audit_logs")
      .insert({
        entity_type: "asset_cost_analysis",
        action: "quarterly_cost_analysis",
        metadata: {
          total_assets_valued: results.assets_updated,
          total_current_value: results.total_current_value,
          total_quarterly_maintenance_cost: results.quarterly_maintenance_cost,
          quarter_start: quarterStart.toISOString(),
          generated_at: nowISO,
        },
        created_at: nowISO,
      });

    if (auditErr) throw new Error(`assetQuarterlyCostAnalysis (audit_log): ${auditErr.message}`);

    console.log("asset-quarterly-cost-analysis summary:", results);
    return results;
  },
});
