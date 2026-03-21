import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. Capability Assessment — Sunday 22:00
// ---------------------------------------------------------------------------
export const capabilityAssessment = schedules.task({
  id: "oms-capability-assessment",
  cron: "0 22 * * 0",
  run: async () => {
    const { data: capabilities, error } = await supabase
      .from("capabilities")
      .select("id, name, category, current_level, target_level, owner_id");

    if (error) throw new Error(`capabilityAssessment: ${error.message}`);

    const assessments = (capabilities ?? []).map((cap) => {
      const gap = (cap.target_level ?? 0) - (cap.current_level ?? 0);
      const score = cap.target_level
        ? Math.round(((cap.current_level ?? 0) / cap.target_level) * 100)
        : 0;

      return {
        capability_id: cap.id,
        assessed_level: cap.current_level,
        target_level: cap.target_level,
        gap,
        score,
        assessed_at: new Date().toISOString(),
        method: "auto",
      };
    });

    if (assessments.length > 0) {
      await supabase.from("capability_assessments").insert(assessments);
    }

    return { assessed: assessments.length };
  },
});

// ---------------------------------------------------------------------------
// 2. Gap Alert — Monday 08:00
// ---------------------------------------------------------------------------
export const gapAlert = schedules.task({
  id: "oms-gap-alert",
  cron: "0 8 * * 1",
  run: async () => {
    const { data: capabilities, error } = await supabase
      .from("capabilities")
      .select("id, name, category, current_level, target_level, owner_id");

    if (error) throw new Error(`gapAlert: ${error.message}`);

    const criticalGaps = (capabilities ?? []).filter((cap) => {
      const gap = (cap.target_level ?? 0) - (cap.current_level ?? 0);
      return gap >= 2;
    });

    if (criticalGaps.length > 0) {
      const alerts = criticalGaps.map((cap) => ({
        user_id: cap.owner_id,
        type: "capability_gap",
        title: `Kompetensgap: ${cap.name}`,
        body: `Nuvarande nivå ${cap.current_level} vs mål ${cap.target_level} (gap: ${(cap.target_level ?? 0) - (cap.current_level ?? 0)}).`,
        priority: "high",
        created_at: new Date().toISOString(),
      }));

      await supabase.from("notifications").insert(alerts);
    }

    return { totalCapabilities: capabilities?.length ?? 0, criticalGaps: criticalGaps.length };
  },
});

// ---------------------------------------------------------------------------
// 3. Auto Development Plans — Quarterly (1st of Jan, Apr, Jul, Oct)
// ---------------------------------------------------------------------------
export const autoDevPlans = schedules.task({
  id: "oms-auto-dev-plans",
  cron: "0 6 1 1,4,7,10 *",
  run: async () => {
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const year = new Date().getFullYear();

    const { data: members } = await supabase
      .from("team_members")
      .select("id, name, role");

    const { data: gaps } = await supabase
      .from("capabilities")
      .select("id, name, current_level, target_level, owner_id")
      .gt("target_level", 0);

    const plans: Record<string, unknown>[] = [];

    for (const member of members ?? []) {
      const memberGaps = (gaps ?? [])
        .filter((g) => g.owner_id === member.id && (g.target_level ?? 0) > (g.current_level ?? 0))
        .sort((a, b) => ((b.target_level ?? 0) - (b.current_level ?? 0)) - ((a.target_level ?? 0) - (a.current_level ?? 0)))
        .slice(0, 3);

      if (memberGaps.length > 0) {
        plans.push({
          member_id: member.id,
          quarter: `Q${quarter} ${year}`,
          focus_areas: memberGaps.map((g) => g.name),
          gap_ids: memberGaps.map((g) => g.id),
          status: "draft",
          created_at: new Date().toISOString(),
        });
      }
    }

    if (plans.length > 0) {
      await supabase.from("development_plans").insert(plans);
    }

    return { quarter: `Q${quarter} ${year}`, plansCreated: plans.length };
  },
});

// ---------------------------------------------------------------------------
// 4. Goal Readiness — Wednesday 09:00
// ---------------------------------------------------------------------------
export const goalReadiness = schedules.task({
  id: "oms-goal-readiness",
  cron: "0 9 * * 3",
  run: async () => {
    const { data: goals, error } = await supabase
      .from("goals")
      .select("id, title, owner_id, target_value, current_value, deadline")
      .eq("status", "active");

    if (error) throw new Error(`goalReadiness: ${error.message}`);

    const now = Date.now();
    const scoredGoals = (goals ?? []).map((goal) => {
      const progress = goal.target_value
        ? Math.round(((goal.current_value ?? 0) / goal.target_value) * 100)
        : 0;

      const deadlineMs = new Date(goal.deadline).getTime();
      const totalDuration = deadlineMs - now;
      const timeProgress = totalDuration > 0 ? Math.min(100, Math.round(((Date.now() - now) / totalDuration) * 100)) : 100;

      const readiness = Math.min(100, Math.round((progress / Math.max(timeProgress, 1)) * 100));

      return {
        goal_id: goal.id,
        progress,
        readiness,
        on_track: readiness >= 80,
        calculated_at: new Date().toISOString(),
      };
    });

    if (scoredGoals.length > 0) {
      await supabase.from("goal_readiness_scores").insert(scoredGoals);
    }

    return {
      total: scoredGoals.length,
      onTrack: scoredGoals.filter((g) => g.on_track).length,
      atRisk: scoredGoals.filter((g) => !g.on_track).length,
    };
  },
});

// ---------------------------------------------------------------------------
// 5. Feedback Reminder — Every other Friday (weeks 2, 4, 6, ...)
// ---------------------------------------------------------------------------
export const feedbackReminder = schedules.task({
  id: "oms-feedback-reminder",
  cron: "0 10 * * 5",
  run: async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );

    // Only run on even weeks
    if (weekNumber % 2 !== 0) {
      return { skipped: true, reason: "Odd week — no reminder" };
    }

    const { data: members } = await supabase
      .from("team_members")
      .select("id, name, email");

    const reminders = (members ?? []).map((m) => ({
      user_id: m.id,
      type: "feedback_reminder",
      title: "Dags att ge feedback",
      body: "Ge feedback till minst en kollega den här veckan.",
      created_at: new Date().toISOString(),
    }));

    if (reminders.length > 0) {
      await supabase.from("notifications").insert(reminders);
    }

    return { reminded: reminders.length, week: weekNumber };
  },
});

// ---------------------------------------------------------------------------
// 6. Development Progress — Friday 16:30
// ---------------------------------------------------------------------------
export const devProgress = schedules.task({
  id: "oms-dev-progress",
  cron: "30 16 * * 5",
  run: async () => {
    const { data: plans, error } = await supabase
      .from("development_plans")
      .select("id, member_id, focus_areas, gap_ids, status")
      .eq("status", "active");

    if (error) throw new Error(`devProgress: ${error.message}`);

    const summaries: Record<string, unknown>[] = [];

    for (const plan of plans ?? []) {
      const gapIds: string[] = plan.gap_ids ?? [];
      const { data: capabilities } = await supabase
        .from("capabilities")
        .select("id, name, current_level, target_level")
        .in("id", gapIds);

      const totalGap = (capabilities ?? []).reduce(
        (sum, c) => sum + ((c.target_level ?? 0) - (c.current_level ?? 0)),
        0
      );
      const maxGap = gapIds.length * 5; // max possible gap per capability

      summaries.push({
        plan_id: plan.id,
        member_id: plan.member_id,
        remaining_gap: totalGap,
        completion_pct: maxGap > 0 ? Math.round(((maxGap - totalGap) / maxGap) * 100) : 100,
        tracked_at: new Date().toISOString(),
      });
    }

    if (summaries.length > 0) {
      await supabase.from("dev_progress_snapshots").insert(summaries);
    }

    return { tracked: summaries.length };
  },
});
