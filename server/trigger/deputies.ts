// ---------------------------------------------------------------------------
// Deputy/Ställföreträdare Background Jobs
// ISO 5.3 — Organizational roles, responsibilities and authorities
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// Daily: Check absence records vs critical functions
// If person absent > max_absence_hours without activated deputy → ALERT
// ---------------------------------------------------------------------------
export const deputyCoverageCheck = schedules.task({
  id: "deputy-coverage-check",
  cron: "0 7 * * *",
  run: async () => {
    const now = new Date();
    const alerts: Array<{ function_name: string; owning_role: string; hours_absent: number }> = [];

    // Get absence records that are currently active
    const { data: absences } = await supabase
      .from("absence_records")
      .select("*, profiles!user_id(full_name, role)")
      .is("return_date", null)
      .lte("start_date", now.toISOString().slice(0, 10));

    for (const absence of absences ?? []) {
      const startDate = new Date(absence.start_date);
      const hoursAbsent = Math.round((now.getTime() - startDate.getTime()) / 3600000);

      // Find critical functions owned by this user
      const { data: fns } = await supabase
        .from("critical_functions")
        .select("*")
        .eq("owning_user_id", absence.user_id)
        .eq("requires_deputy", true);

      for (const fn of fns ?? []) {
        if (hoursAbsent > fn.max_absence_hours) {
          // Check if deputy is already activated
          const { count } = await supabase
            .from("deputy_activations")
            .select("id", { count: "exact", head: true })
            .eq("primary_user_id", absence.user_id)
            .is("actual_deactivated_at", null);

          if ((count ?? 0) === 0) {
            alerts.push({
              function_name: fn.function_name,
              owning_role: fn.owning_role,
              hours_absent: hoursAbsent,
            });

            // Create task for HR and ADMIN
            await supabase.from("tasks").insert({
              org_id: fn.org_id,
              title: `ALERT: Ställföreträdare saknas — ${fn.function_name}`,
              description: `${absence.profiles?.full_name ?? absence.user_id} har varit frånvarande ${hoursAbsent} timmar men ingen ställföreträdare är aktiverad för funktionen "${fn.function_name}" (${fn.owning_role}). ISO 5.3-krav.`,
              status: "TODO",
              priority: fn.criticality === "CRITICAL" ? "URGENT" : "HIGH",
              type: "COMPLIANCE",
            });
          }
        }
      }
    }

    // Log summary
    if (alerts.length > 0) {
      await supabase.from("audit_logs").insert({
        entity_type: "deputy",
        action: "coverage_alert",
        metadata: { alerts, checked_at: now.toISOString(), alert_count: alerts.length },
      });
    }

    console.log(`[deputies] Coverage check: ${absences?.length ?? 0} absences, ${alerts.length} alerts`);
    return { absences: absences?.length ?? 0, alerts: alerts.length };
  },
});

// ---------------------------------------------------------------------------
// Weekly: Deputy coverage report
// Persons/functions without backup — audit finding waiting to happen
// ---------------------------------------------------------------------------
export const deputyWeeklyReport = schedules.task({
  id: "deputy-weekly-report",
  cron: "0 8 * * 1",
  run: async () => {
    const { data: uncovered } = await supabase
      .from("v_critical_functions_coverage")
      .select("*")
      .eq("has_active_deputy", false);

    const { data: partialUsers } = await supabase
      .from("v_deputy_coverage")
      .select("*")
      .eq("coverage_status", "UNCOVERED");

    const summary = {
      uncovered_functions: uncovered?.length ?? 0,
      uncovered_users: partialUsers?.length ?? 0,
      details: {
        functions: uncovered ?? [],
        users: partialUsers ?? [],
      },
    };

    await supabase.from("audit_logs").insert({
      entity_type: "deputy",
      action: "weekly_coverage_report",
      metadata: summary,
    });

    // If there are CRITICAL uncovered functions, create task
    const criticalUncovered = (uncovered ?? []).filter((f: any) => f.criticality === "CRITICAL");
    if (criticalUncovered.length > 0) {
      for (const fn of criticalUncovered) {
        await supabase.from("tasks").insert({
          org_id: fn.org_id,
          title: `Kritisk funktion utan ställföreträdare: ${fn.function_name}`,
          description: `ISO 5.3: Funktionen "${fn.function_name}" (${fn.owning_role}) har ingen aktiv ställföreträdare. Detta är ett audit finding vid extern revision.`,
          status: "TODO",
          priority: "HIGH",
          type: "COMPLIANCE",
        });
      }
    }

    console.log(`[deputies] Weekly report: ${summary.uncovered_functions} uncovered functions, ${summary.uncovered_users} uncovered users`);
    return summary;
  },
});

// ---------------------------------------------------------------------------
// Quarterly: Remind HR to review deputy assignments (next_review_date)
// ---------------------------------------------------------------------------
export const deputyReviewReminder = schedules.task({
  id: "deputy-review-reminder",
  cron: "0 9 1 1,4,7,10 *",
  run: async () => {
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const { data: dueForReview } = await supabase
      .from("deputy_assignments")
      .select("*, profiles!primary_user_id(full_name), profiles!deputy_user_id(full_name)")
      .eq("status", "ACTIVE")
      .lte("next_review_date", in30);

    if (dueForReview && dueForReview.length > 0) {
      // Get org_id from first assignment (may differ per org)
      const orgs = [...new Set(dueForReview.map((d: any) => d.org_id).filter(Boolean))];
      for (const org_id of orgs) {
        const orgAssignments = dueForReview.filter((d: any) => d.org_id === org_id);
        await supabase.from("tasks").insert({
          org_id,
          title: `Granska ställföreträdartilldelningar — ${orgAssignments.length} tilldeln. förfaller`,
          description: `${orgAssignments.length} ställföreträdartilldelningar ska granskas inom 30 dagar (ISO 5.3). Gå till Ställföreträdare → Granskning.`,
          status: "TODO",
          priority: "MEDIUM",
          type: "COMPLIANCE",
        });
      }
    }

    console.log(`[deputies] Review reminder: ${dueForReview?.length ?? 0} assignments due for review`);
    return { assignments_due: dueForReview?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// Expire old deputy assignments where valid_until has passed
// ---------------------------------------------------------------------------
export const deputyExpiryCheck = schedules.task({
  id: "deputy-expiry-check",
  cron: "0 6 * * *",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: expired, error } = await supabase
      .from("deputy_assignments")
      .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
      .eq("status", "ACTIVE")
      .lt("valid_until", today)
      .eq("auto_renew", false)
      .select("id");

    console.log(`[deputies] Expiry check: ${expired?.length ?? 0} assignments expired`);
    return { expired: expired?.length ?? 0 };
  },
});
