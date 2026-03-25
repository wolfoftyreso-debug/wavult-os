import { schedules } from "@trigger.dev/sdk/v3";

// =============================================================================
// Sampling & Impartiality — Background Jobs
//
// 1. Impartiality declaration expiry check (daily)
// 2. Inspector rotation enforcement (weekly)
// 3. COI review reminder (daily)
// 4. Sampling severity report (weekly)
// 5. Impartiality committee meeting reminder (monthly)
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Declaration Expiry Check — Flag expiring impartiality declarations
// ---------------------------------------------------------------------------
export const impartialityExpiryCheck = schedules.task({
  id: "impartiality-expiry-check",
  cron: "0 7 * * *", // Daily at 07:00
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    // Find declarations expiring within 30 days
    const { data: expiring } = await supabase
      .from("impartiality_declarations")
      .select("id, user_id, org_id, role_context, valid_until")
      .eq("is_active", true)
      .not("valid_until", "is", null)
      .lte("valid_until", thirtyDaysFromNow);

    if (!expiring?.length) return { checked: 0, expiring: 0, expired: 0 };

    let expiredCount = 0;
    for (const decl of expiring) {
      if (decl.valid_until && decl.valid_until <= today) {
        // Mark as inactive
        await supabase
          .from("impartiality_declarations")
          .update({ is_active: false })
          .eq("id", decl.id);

        // Also update inspector pool
        await supabase
          .from("inspector_pool")
          .update({ impartiality_valid_until: null })
          .eq("user_id", decl.user_id)
          .eq("org_id", decl.org_id);

        expiredCount++;
      }
      // Queue notification for upcoming expiry
      await supabase.from("notification_queue").insert({
        org_id: decl.org_id,
        user_id: decl.user_id,
        channel: "INTERNAL",
        recipient: decl.user_id,
        subject: `Opartiskhetsdeklaration löper ut ${decl.valid_until}`,
        body: `Din opartiskhetsdeklaration för ${decl.role_context} löper ut ${decl.valid_until}. Förnya den snarast.`,
        priority: decl.valid_until <= today ? "URGENT" : "HIGH",
        source_type: "impartiality_declaration",
        source_id: decl.id,
      }).catch(() => {}); // notification_queue may not exist in all deploys
    }

    return { checked: expiring.length, expiring: expiring.length - expiredCount, expired: expiredCount };
  },
});

// ---------------------------------------------------------------------------
// 2. Inspector Rotation — Flag inspectors exceeding max consecutive assignments
// ---------------------------------------------------------------------------
export const inspectorRotationCheck = schedules.task({
  id: "inspector-rotation-check",
  cron: "0 8 * * 1", // Monday at 08:00
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Find independence_matrix entries with too many consecutive assignments
    const { data: overAssigned } = await supabase
      .from("independence_matrix")
      .select("id, org_id, user_id, activity_type, entity_type, entity_name, assignment_count, max_consecutive_assignments")
      .not("max_consecutive_assignments", "is", null);

    if (!overAssigned?.length) return { flagged: 0 };

    let flagged = 0;
    for (const entry of overAssigned) {
      if (entry.assignment_count >= entry.max_consecutive_assignments) {
        // Set to RESTRICTED — needs rotation
        await supabase
          .from("independence_matrix")
          .update({
            independence_level: "RESTRICTED",
            reason: `Rotation required: ${entry.assignment_count}/${entry.max_consecutive_assignments} consecutive assignments`,
          })
          .eq("id", entry.id);

        flagged++;
      }
    }

    return { checked: overAssigned.length, flagged };
  },
});

// ---------------------------------------------------------------------------
// 3. COI Review Reminder — Remind reviewers of pending COI declarations
// ---------------------------------------------------------------------------
export const coiReviewReminder = schedules.task({
  id: "coi-review-reminder",
  cron: "0 9 * * *", // Daily at 09:00
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Find COIs pending review for more than 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    const { data: pending } = await supabase
      .from("conflict_of_interest")
      .select("id, org_id, user_id, coi_type, description, activity_type, entity_name, created_at")
      .in("status", ["DECLARED", "UNDER_REVIEW"])
      .lt("created_at", threeDaysAgo);

    return { pending_reviews: pending?.length || 0 };
  },
});

// ---------------------------------------------------------------------------
// 4. Sampling Severity Report — Weekly severity switching summary
// ---------------------------------------------------------------------------
export const samplingSeverityReport = schedules.task({
  id: "sampling-severity-report",
  cron: "0 6 * * 1", // Monday at 06:00
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Severity changes this week
    const { data: changes } = await supabase
      .from("sampling_severity_history")
      .select("*")
      .gte("created_at", weekAgo);

    // Sampling results this week
    const { data: executions } = await supabase
      .from("sampling_executions")
      .select("result, severity_used, org_id")
      .gte("completed_at", weekAgo)
      .not("result", "eq", "PENDING");

    const accepted = (executions || []).filter((e: any) => e.result === "ACCEPTED").length;
    const rejected = (executions || []).filter((e: any) => e.result === "REJECTED").length;

    return {
      severity_changes: changes?.length || 0,
      total_executions: (executions || []).length,
      accepted,
      rejected,
      acceptance_rate: (executions || []).length > 0
        ? Math.round(accepted / (executions || []).length * 100)
        : 0,
    };
  },
});

// ---------------------------------------------------------------------------
// 5. Committee Meeting Reminder — Remind about upcoming committee meetings
// ---------------------------------------------------------------------------
export const committeeMeetingReminder = schedules.task({
  id: "impartiality-committee-reminder",
  cron: "0 8 1 * *", // First day of month at 08:00
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const { data: committees } = await supabase
      .from("impartiality_committee")
      .select("*")
      .eq("is_active", true)
      .not("next_meeting_date", "is", null)
      .lte("next_meeting_date", thirtyDaysFromNow);

    return { committees_with_upcoming_meetings: committees?.length || 0 };
  },
});
