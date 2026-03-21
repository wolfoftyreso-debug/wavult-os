import { eventBus } from "./events";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Anti-bias notice
// ---------------------------------------------------------------------------
// NEVER consider: gender, age, ethnicity, disability, parental leave, illness.
// Signal BEHAVIOR PATTERNS, not PERSONAL CHARACTERISTICS.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper: check anti-bias guard for escalation
// ---------------------------------------------------------------------------

async function hasOnlyAbsenceSignals(userId: string): Promise<boolean> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: signals } = await supabase
    .from("personnel_signals")
    .select("signal_type")
    .eq("user_id", userId)
    .eq("active", true)
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (!signals || signals.length === 0) return false;

  const types = new Set(signals.map((s) => s.signal_type));
  return types.size === 1 && types.has("ABSENCE_PATTERN");
}

// ---------------------------------------------------------------------------
// Helper: check post-case cooldown (90 days after positive close)
// ---------------------------------------------------------------------------

async function isInPostCaseCooldown(userId: string): Promise<boolean> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data } = await supabase
    .from("personnel_cases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "CLOSED_POSITIVE")
    .gte("closed_at", ninetyDaysAgo.toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Helper: count distinct signal types
// ---------------------------------------------------------------------------

async function getDistinctSignalTypes(
  userId: string,
  windowDays: number
): Promise<{ count: number; types: string[] }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const { data } = await supabase
    .from("personnel_signals")
    .select("signal_type, severity")
    .eq("user_id", userId)
    .eq("active", true)
    .in("severity", ["NOTICE", "WARNING"])
    .gte("created_at", cutoff.toISOString());

  if (!data) return { count: 0, types: [] };

  const types = [...new Set(data.map((s) => s.signal_type))];
  return { count: data.length, types };
}

// ---------------------------------------------------------------------------
// Helper: get user's first name
// ---------------------------------------------------------------------------

async function getUserFirstName(userId: string): Promise<string> {
  const { data } = await supabase
    .from("users")
    .select("first_name")
    .eq("id", userId)
    .single();

  return data?.first_name ?? "medarbetare";
}

// ---------------------------------------------------------------------------
// Helper: get manager's direct reports
// ---------------------------------------------------------------------------

async function getManagerReportIds(managerId: string): Promise<string[]> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("manager_id", managerId);

  return data?.map((u) => u.id) ?? [];
}

// ---------------------------------------------------------------------------
// Level 1 → 2: Auto-escalation
// ---------------------------------------------------------------------------

// LEGAL_REVIEW_REQUIRED
async function handleLevel1To2(userId: string, orgId: string): Promise<void> {
  // Post-case cooldown: 90 days after positive closure
  if (await isInPostCaseCooldown(userId)) return;

  const { count, types } = await getDistinctSignalTypes(userId, 30);

  // Need 3+ signals with at least 2 different types
  if (count < 3) return;
  if (types.length < 2) return;

  // LEGAL_REVIEW_REQUIRED
  // Anti-bias: if ONLY ABSENCE_PATTERN signals → DO NOT escalate
  if (await hasOnlyAbsenceSignals(userId)) return;

  // Check if already at level 2+
  const { data: existingCase } = await supabase
    .from("personnel_cases")
    .select("id, level")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "MONITORING", "FROZEN"])
    .limit(1);

  if (existingCase && existingCase.length > 0) return;

  // Get manager
  const { data: user } = await supabase
    .from("users")
    .select("manager_id")
    .eq("id", userId)
    .single();

  if (!user?.manager_id) return;

  const firstName = await getUserFirstName(userId);

  // Create personnel case at level 2
  const { error: caseError } = await supabase
    .from("personnel_cases")
    .insert({
      org_id: orgId,
      user_id: userId,
      level: 2,
      status: "ACTIVE",
      escalated_at: new Date().toISOString(),
      manager_id: user.manager_id,
    });

  if (caseError) {
    console.error(
      "[personnel-escalation] Failed to create case:",
      caseError.message
    );
    return;
  }

  // Notify manager — message contains NO details, manager logs in to see
  await supabase.from("notifications").insert({
    org_id: orgId,
    user_id: user.manager_id,
    type: "PERSONNEL_ESCALATION",
    title: "Personalsignal kräver uppmärksamhet",
    body: "Logga in för att se detaljer.",
  });

  // Create task for manager: support conversation
  await supabase.from("tasks").insert({
    org_id: orgId,
    assigned_to: user.manager_id,
    title: `Stödsamtal med ${firstName}`,
    status: "TODO",
    source: "personnel_escalation",
    source_id: userId,
  });

  console.log(
    `[personnel-escalation] Level 1→2 escalation for user ${userId}`
  );
}

// ---------------------------------------------------------------------------
// Level 2 → 3: Manager-initiated
// ---------------------------------------------------------------------------

async function handleLevel2To3(
  caseId: string,
  outcome: string,
  orgId: string
): Promise<void> {
  if (outcome !== "NEEDS_MONITORING" && outcome !== "ESCALATE") return;

  const { data: personnelCase } = await supabase
    .from("personnel_cases")
    .select("id, user_id, level")
    .eq("id", caseId)
    .single();

  if (!personnelCase || personnelCase.level !== 2) return;

  // Escalate to level 3
  await supabase
    .from("personnel_cases")
    .update({
      level: 3,
      status: "ACTIVE",
      escalated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  // Suggest development plan based on capability gaps
  const { data: gaps } = await supabase
    .from("capability_assessments")
    .select("capability_id, level, target_level")
    .eq("user_id", personnelCase.user_id)
    .eq("org_id", orgId)
    .not("target_level", "is", null);

  const gapDetails = (gaps ?? [])
    .filter((g) => g.level < (g.target_level ?? 0))
    .map((g) => ({
      capability_id: g.capability_id,
      current: g.level,
      target: g.target_level,
    }));

  // Log case event
  await supabase.from("case_log").insert({
    case_id: caseId,
    org_id: orgId,
    event_type: "LEVEL_2_TO_3",
    details: {
      outcome,
      suggested_gaps: gapDetails,
    },
  });

  console.log(
    `[personnel-escalation] Level 2→3 escalation for case ${caseId}`
  );
}

// ---------------------------------------------------------------------------
// Level 3 → 4: Auto + Manual
// ---------------------------------------------------------------------------

// LEGAL_REVIEW_REQUIRED
async function handleLevel3To4Auto(
  caseId: string,
  orgId: string
): Promise<void> {
  const { data: personnelCase } = await supabase
    .from("personnel_cases")
    .select("id, user_id, level, support_period_end")
    .eq("id", caseId)
    .single();

  if (!personnelCase || personnelCase.level !== 3) return;
  if (!personnelCase.support_period_end) return;

  const now = new Date();
  const periodEnd = new Date(personnelCase.support_period_end);
  if (now < periodEnd) return;

  // Check milestones
  const { data: milestones } = await supabase
    .from("case_milestones")
    .select("id, achieved")
    .eq("case_id", caseId);

  const allAchieved =
    milestones && milestones.length > 0 && milestones.every((m) => m.achieved);
  if (allAchieved) return;

  // Check for positive signals
  const { data: positiveSignals } = await supabase
    .from("personnel_signals")
    .select("id")
    .eq("user_id", personnelCase.user_id)
    .eq("signal_type", "POSITIVE_TREND")
    .eq("active", true)
    .gte("created_at", personnelCase.support_period_end)
    .limit(1);

  if (positiveSignals && positiveSignals.length > 0) return;

  // LEGAL_REVIEW_REQUIRED
  // FREEZE: pause auto-signals, restrict visibility
  await supabase
    .from("personnel_cases")
    .update({
      level: 4,
      status: "FROZEN",
      frozen_at: new Date().toISOString(),
      escalated_at: new Date().toISOString(),
      visibility: ["HR", "EXECUTIVE", "MANAGER"],
      auto_signals_paused: true,
    })
    .eq("id", caseId);

  // Log FREEZE_ACTIVATED
  await supabase.from("case_log").insert({
    case_id: caseId,
    org_id: orgId,
    event_type: "FREEZE_ACTIVATED",
    details: {
      reason: "auto_escalation_level_3_to_4",
      milestones_achieved: false,
      positive_signals: false,
    },
  });

  console.log(
    `[personnel-escalation] Level 3→4 auto-escalation (FREEZE) for case ${caseId}`
  );
}

// LEGAL_REVIEW_REQUIRED
async function handleLevel3To4Manual(
  caseId: string,
  reason: string,
  actorId: string,
  orgId: string
): Promise<void> {
  const { data: personnelCase } = await supabase
    .from("personnel_cases")
    .select("id, level")
    .eq("id", caseId)
    .single();

  if (!personnelCase || personnelCase.level !== 3) return;

  // LEGAL_REVIEW_REQUIRED
  // FREEZE: pause auto-signals, restrict visibility
  await supabase
    .from("personnel_cases")
    .update({
      level: 4,
      status: "FROZEN",
      frozen_at: new Date().toISOString(),
      escalated_at: new Date().toISOString(),
      visibility: ["HR", "EXECUTIVE", "MANAGER"],
      auto_signals_paused: true,
    })
    .eq("id", caseId);

  // Log FREEZE_ACTIVATED
  await supabase.from("case_log").insert({
    case_id: caseId,
    org_id: orgId,
    event_type: "FREEZE_ACTIVATED",
    details: {
      reason,
      escalated_by: actorId,
      manual: true,
    },
  });

  console.log(
    `[personnel-escalation] Level 3→4 manual escalation (FREEZE) for case ${caseId}`
  );
}

// ---------------------------------------------------------------------------
// Level 4 → 5: Manual only
// ---------------------------------------------------------------------------

async function handleLevel4To5(
  caseId: string,
  actorId: string,
  orgId: string
): Promise<void> {
  const { data: personnelCase } = await supabase
    .from("personnel_cases")
    .select("id, user_id, level")
    .eq("id", caseId)
    .single();

  if (!personnelCase || personnelCase.level !== 4) return;

  // Generate case export data
  const { data: caseLog } = await supabase
    .from("case_log")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  const { data: signals } = await supabase
    .from("personnel_signals")
    .select("*")
    .eq("user_id", personnelCase.user_id)
    .order("created_at", { ascending: true });

  const exportData = {
    case_id: caseId,
    user_id: personnelCase.user_id,
    exported_at: new Date().toISOString(),
    exported_by: actorId,
    case_log: caseLog ?? [],
    signals: signals ?? [],
  };

  // Mark as EXTERNAL_HANDLING and readonly
  await supabase
    .from("personnel_cases")
    .update({
      level: 5,
      status: "EXTERNAL_HANDLING",
      readonly: true,
      escalated_at: new Date().toISOString(),
      export_data: exportData,
    })
    .eq("id", caseId);

  // Log the transition
  await supabase.from("case_log").insert({
    case_id: caseId,
    org_id: orgId,
    event_type: "LEVEL_4_TO_5",
    details: {
      marked_by: actorId,
      status: "EXTERNAL_HANDLING",
    },
  });

  console.log(
    `[personnel-escalation] Level 4→5 (EXTERNAL_HANDLING) for case ${caseId}`
  );
}

// ---------------------------------------------------------------------------
// Manager bias detection
// ---------------------------------------------------------------------------

// LEGAL_REVIEW_REQUIRED
async function checkManagerBias(
  managerId: string,
  orgId: string
): Promise<void> {
  const reportIds = await getManagerReportIds(managerId);
  if (reportIds.length === 0) return;

  // Count reports with active signals or cases
  let reportsWithIssues = 0;
  for (const reportId of reportIds) {
    const { data: signals } = await supabase
      .from("personnel_signals")
      .select("id")
      .eq("user_id", reportId)
      .eq("active", true)
      .limit(1);

    const { data: cases } = await supabase
      .from("personnel_cases")
      .select("id")
      .eq("user_id", reportId)
      .in("status", ["ACTIVE", "MONITORING", "FROZEN"])
      .limit(1);

    if (
      (signals && signals.length > 0) ||
      (cases && cases.length > 0)
    ) {
      reportsWithIssues++;
    }
  }

  const ratio = reportsWithIssues / reportIds.length;

  // LEGAL_REVIEW_REQUIRED
  if (ratio > 0.5) {
    // Flag to HR: pattern indicates potential leadership issue
    const { data: hrUsers } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", orgId)
      .eq("role", "HR");

    for (const hr of hrUsers ?? []) {
      await supabase.from("notifications").insert({
        org_id: orgId,
        user_id: hr.id,
        type: "MANAGER_BIAS_DETECTED",
        title: "Pattern indicates potential leadership issue",
        body: `Manager has signals/cases on >${Math.round(ratio * 100)}% of direct reports. Review recommended.`,
      });
    }

    console.log(
      `[personnel-escalation] Manager bias flagged for manager ${managerId} (${reportsWithIssues}/${reportIds.length} reports affected)`
    );
  }
}

// ---------------------------------------------------------------------------
// registerPersonnelEscalation
// ---------------------------------------------------------------------------

export function registerPersonnelEscalation(): void {
  // Level 1→2: Listen for new signals and check if auto-escalation is warranted
  // LEGAL_REVIEW_REQUIRED
  eventBus.on("personnel.signal_created", async (event) => {
    const { user_id, org_id } = event.payload as {
      user_id: string;
      org_id: string;
    };
    await handleLevel1To2(user_id, org_id); // LEGAL_REVIEW_REQUIRED
  });

  // Level 2→3: Manager logs support conversation
  eventBus.on("personnel.support_conversation_logged", async (event) => {
    const { case_id, outcome, org_id } = event.payload as {
      case_id: string;
      outcome: string;
      org_id: string;
    };
    await handleLevel2To3(case_id, outcome, org_id);
  });

  // Level 3→4 auto: Support period check
  // LEGAL_REVIEW_REQUIRED
  eventBus.on("personnel.support_period_check", async (event) => {
    const { case_id, org_id } = event.payload as {
      case_id: string;
      org_id: string;
    };
    await handleLevel3To4Auto(case_id, org_id); // LEGAL_REVIEW_REQUIRED
  });

  // Level 3→4 manual: Manager or HR escalates
  // LEGAL_REVIEW_REQUIRED
  eventBus.on("personnel.manual_escalate_to_4", async (event) => {
    const { case_id, reason, actor_id, org_id } = event.payload as {
      case_id: string;
      reason: string;
      actor_id: string;
      org_id: string;
    };
    await handleLevel3To4Manual(case_id, reason, actor_id, org_id); // LEGAL_REVIEW_REQUIRED
  });

  // Level 4→5: HR marks EXTERNAL_HANDLING
  eventBus.on("personnel.mark_external_handling", async (event) => {
    const { case_id, actor_id, org_id } = event.payload as {
      case_id: string;
      actor_id: string;
      org_id: string;
    };
    await handleLevel4To5(case_id, actor_id, org_id);
  });

  // Manager bias detection
  // LEGAL_REVIEW_REQUIRED
  eventBus.on("personnel.signal_created", async (event) => {
    const { user_id, org_id } = event.payload as {
      user_id: string;
      org_id: string;
    };

    // Look up the user's manager and check bias
    const { data: user } = await supabase
      .from("users")
      .select("manager_id")
      .eq("id", user_id)
      .single();

    if (user?.manager_id) {
      await checkManagerBias(user.manager_id, org_id); // LEGAL_REVIEW_REQUIRED
    }
  });

  console.log("[personnel-escalation] Event handlers registered");
}
