import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SignalType =
  | "PERFORMANCE_DECLINE"
  | "DEADLINE_PATTERN"
  | "CAPABILITY_DROP"
  | "FEEDBACK_PATTERN"
  | "ABSENCE_PATTERN"
  | "POSITIVE_TREND";

type SignalSeverity = "INFO" | "NOTICE" | "WARNING";

interface SignalThresholds {
  performance_decline_pct: number;
  performance_previous_min_pct: number;
  deadline_count: number;
  deadline_window_days: number;
  feedback_count: number;
  feedback_window_days: number;
  absence_count: number;
  absence_total_days: number;
  absence_window_days: number;
  positive_completion_pct: number;
}

const DEFAULT_THRESHOLDS: SignalThresholds = {
  performance_decline_pct: 60,
  performance_previous_min_pct: 75,
  deadline_count: 3,
  deadline_window_days: 14,
  feedback_count: 3,
  feedback_window_days: 30,
  absence_count: 3,
  absence_total_days: 15,
  absence_window_days: 90,
  positive_completion_pct: 90,
};

// ---------------------------------------------------------------------------
// Anti-bias notice
// ---------------------------------------------------------------------------
// NEVER consider: gender, age, ethnicity, disability, parental leave, illness.
// Signal BEHAVIOR PATTERNS, not PERSONAL CHARACTERISTICS.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper: loadThresholds
// ---------------------------------------------------------------------------

export async function loadThresholds(orgId: string): Promise<SignalThresholds> {
  const { data, error } = await supabase
    .from("configs")
    .select("key, value")
    .eq("org_id", orgId)
    .like("key", "signal_threshold_%");

  if (error) {
    console.error("[personnel-signals] Failed to load thresholds:", error.message);
    return { ...DEFAULT_THRESHOLDS };
  }

  const thresholds = { ...DEFAULT_THRESHOLDS };

  if (data) {
    for (const row of data) {
      const shortKey = row.key.replace("signal_threshold_", "");
      if (shortKey in thresholds) {
        (thresholds as any)[shortKey] = Number(row.value);
      }
    }
  }

  return thresholds;
}

// ---------------------------------------------------------------------------
// Helper: checkCooldown
// ---------------------------------------------------------------------------

export async function checkCooldown(
  userId: string,
  signalType: string,
  cooldownDays: number
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cooldownDays);

  const { data, error } = await supabase
    .from("personnel_signals")
    .select("id")
    .eq("user_id", userId)
    .eq("signal_type", signalType)
    .gte("created_at", cutoff.toISOString())
    .limit(1);

  if (error) {
    console.error("[personnel-signals] Cooldown check failed:", error.message);
    return true; // Fail safe: treat as in cooldown
  }

  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Helper: getActiveSignalCount
// ---------------------------------------------------------------------------

export async function getActiveSignalCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("personnel_signals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("active", true);

  if (error) {
    console.error("[personnel-signals] Active signal count failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Internal: create signal (respects max 5 active per person)
// ---------------------------------------------------------------------------

async function createSignal(
  orgId: string,
  userId: string,
  signalType: SignalType,
  severity: SignalSeverity,
  details: Record<string, unknown>
): Promise<void> {
  const activeCount = await getActiveSignalCount(userId);

  // Max 5 active signals per person — replace oldest if at limit
  if (activeCount >= 5) {
    const { data: oldest } = await supabase
      .from("personnel_signals")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1);

    if (oldest && oldest.length > 0) {
      await supabase
        .from("personnel_signals")
        .update({ active: false })
        .eq("id", oldest[0].id);
    }
  }

  const { error } = await supabase.from("personnel_signals").insert({
    org_id: orgId,
    user_id: userId,
    signal_type: signalType,
    severity,
    details,
    active: true,
  });

  if (error) {
    console.error(
      `[personnel-signals] Failed to create ${signalType} signal for ${userId}:`,
      error.message
    );
  }
}

// ---------------------------------------------------------------------------
// Signal checks
// ---------------------------------------------------------------------------

async function checkPerformanceDecline(
  orgId: string,
  userId: string,
  thresholds: SignalThresholds
): Promise<void> {
  if (await checkCooldown(userId, "PERFORMANCE_DECLINE", 14)) return;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Current 30-day window
  const { data: currentTasks } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .lte("created_at", now.toISOString());

  // Previous 30-day window
  const { data: previousTasks } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .gte("created_at", sixtyDaysAgo.toISOString())
    .lt("created_at", thirtyDaysAgo.toISOString());

  if (!currentTasks || currentTasks.length === 0) return;
  if (!previousTasks || previousTasks.length === 0) return;

  const currentCompleted = currentTasks.filter((t) => t.status === "DONE").length;
  const currentRate = (currentCompleted / currentTasks.length) * 100;

  const previousCompleted = previousTasks.filter((t) => t.status === "DONE").length;
  const previousRate = (previousCompleted / previousTasks.length) * 100;

  if (
    currentRate < thresholds.performance_decline_pct &&
    previousRate > thresholds.performance_previous_min_pct
  ) {
    await createSignal(orgId, userId, "PERFORMANCE_DECLINE", "NOTICE", {
      current_rate: Math.round(currentRate),
      previous_rate: Math.round(previousRate),
      threshold: thresholds.performance_decline_pct,
    });
  }
}

async function checkDeadlinePattern(
  orgId: string,
  userId: string,
  thresholds: SignalThresholds
): Promise<void> {
  if (await checkCooldown(userId, "DEADLINE_PATTERN", 14)) return;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - thresholds.deadline_window_days);

  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .lt("due_date", new Date().toISOString())
    .neq("status", "DONE")
    .gte("due_date", windowStart.toISOString());

  if (error || !data) return;

  if (data.length >= thresholds.deadline_count) {
    await createSignal(orgId, userId, "DEADLINE_PATTERN", "WARNING", {
      missed_count: data.length,
      window_days: thresholds.deadline_window_days,
    });
  }
}

async function checkCapabilityDrop(
  orgId: string,
  userId: string
): Promise<void> {
  if (await checkCooldown(userId, "CAPABILITY_DROP", 30)) return;

  const { data: assessments } = await supabase
    .from("capability_assessments")
    .select("id, level, assessed_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("assessed_at", { ascending: false })
    .limit(2);

  if (!assessments || assessments.length < 2) return;

  const [latest, previous] = assessments;

  if (latest.level < previous.level) {
    await createSignal(orgId, userId, "CAPABILITY_DROP", "NOTICE", {
      current_level: latest.level,
      previous_level: previous.level,
      drop: previous.level - latest.level,
    });
  }
}

async function checkFeedbackPattern(
  orgId: string,
  userId: string,
  thresholds: SignalThresholds
): Promise<void> {
  if (await checkCooldown(userId, "FEEDBACK_PATTERN", 30)) return;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - thresholds.feedback_window_days);

  const { data, error } = await supabase
    .from("feedback")
    .select("id")
    .eq("org_id", orgId)
    .eq("target_user_id", userId)
    .in("sentiment", ["constructive", "negative"])
    .gte("created_at", windowStart.toISOString());

  if (error || !data) return;

  if (data.length >= thresholds.feedback_count) {
    await createSignal(orgId, userId, "FEEDBACK_PATTERN", "NOTICE", {
      negative_feedback_count: data.length,
      window_days: thresholds.feedback_window_days,
    });
  }
}

// LEGAL_REVIEW_REQUIRED
async function checkAbsencePattern(
  orgId: string,
  userId: string,
  thresholds: SignalThresholds
): Promise<void> {
  if (await checkCooldown(userId, "ABSENCE_PATTERN", 30)) return;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - thresholds.absence_window_days);

  const { data: absences, error } = await supabase
    .from("absence_records")
    .select("id, absence_type, days")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .gte("start_date", windowStart.toISOString());

  if (error || !absences) return;

  // LEGAL_REVIEW_REQUIRED
  // IMPORTANT: Legally protected absence (PARENTAL, SICK_LONG) must NEVER be
  // the sole ground for generating this signal.
  const nonProtected = absences.filter(
    (a) => a.absence_type !== "PARENTAL" && a.absence_type !== "SICK_LONG"
  );

  if (nonProtected.length === 0) return; // Only protected absences — skip entirely

  const totalDays = absences.reduce((sum, a) => sum + (a.days ?? 0), 0);
  const shortTermCount = nonProtected.length;

  if (
    shortTermCount >= thresholds.absence_count ||
    totalDays > thresholds.absence_total_days
  ) {
    await createSignal(orgId, userId, "ABSENCE_PATTERN", "NOTICE", {
      short_term_count: shortTermCount,
      total_days: totalDays,
      window_days: thresholds.absence_window_days,
      protected_excluded: true,
    });
  }
}

async function checkPositiveTrend(
  orgId: string,
  userId: string,
  thresholds: SignalThresholds
): Promise<void> {
  if (await checkCooldown(userId, "POSITIVE_TREND", 7)) return;

  // Only relevant during an active support case
  const { data: activeCase } = await supabase
    .from("personnel_cases")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "MONITORING"])
    .limit(1);

  if (!activeCase || activeCase.length === 0) return;

  // Check capability increase
  const { data: assessments } = await supabase
    .from("capability_assessments")
    .select("id, level, assessed_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("assessed_at", { ascending: false })
    .limit(2);

  let capabilityIncreased = false;
  if (assessments && assessments.length >= 2) {
    capabilityIncreased = assessments[0].level > assessments[1].level;
  }

  // Check high task completion rate over 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentTasks } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  let highCompletion = false;
  if (recentTasks && recentTasks.length > 0) {
    const completed = recentTasks.filter((t) => t.status === "DONE").length;
    const rate = (completed / recentTasks.length) * 100;
    highCompletion = rate >= thresholds.positive_completion_pct;
  }

  if (capabilityIncreased || highCompletion) {
    await createSignal(orgId, userId, "POSITIVE_TREND", "INFO", {
      capability_increased: capabilityIncreased,
      high_completion: highCompletion,
    });
  }
}

// ---------------------------------------------------------------------------
// Main: generateSignals
// ---------------------------------------------------------------------------

/**
 * Signal generation engine — runs as a background job, NOT realtime.
 * Checks all users in the given org against signal rules.
 * All thresholds are loaded from the configs table.
 */
export async function generateSignals(orgId: string): Promise<void> {
  const thresholds = await loadThresholds(orgId);

  // Get all users in the org
  const { data: users, error } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", orgId);

  if (error || !users) {
    console.error("[personnel-signals] Failed to load users:", error?.message);
    return;
  }

  for (const user of users) {
    try {
      await checkPerformanceDecline(orgId, user.id, thresholds);
      await checkDeadlinePattern(orgId, user.id, thresholds);
      await checkCapabilityDrop(orgId, user.id);
      await checkFeedbackPattern(orgId, user.id, thresholds);
      await checkAbsencePattern(orgId, user.id, thresholds); // LEGAL_REVIEW_REQUIRED
      await checkPositiveTrend(orgId, user.id, thresholds);
    } catch (err) {
      console.error(
        `[personnel-signals] Error processing signals for user ${user.id}:`,
        err
      );
    }
  }

  console.log(
    `[personnel-signals] Signal generation complete for org ${orgId}, ${users.length} users processed`
  );
}
