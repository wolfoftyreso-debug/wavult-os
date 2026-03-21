import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. Signal Generation — Weekly, Sunday 23:00
// ---------------------------------------------------------------------------
export const signalGeneration = schedules.task({
  id: "personnel-signal-generation",
  cron: "0 23 * * 0",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const MAX_SIGNALS_PER_USER = 5;
    const results = {
      performanceDecline: 0,
      deadlinePattern: 0,
      capabilityDrop: 0,
      feedbackPattern: 0,
      absencePattern: 0,
      positiveTrend: 0,
      skippedCooldown: 0,
      skippedMaxSignals: 0,
    };

    // Fetch signal cooldown config (default 30 days)
    const { data: cooldownConfig } = await supabase
      .from("config")
      .select("value")
      .eq("key", "signal_cooldown_days")
      .single();

    const cooldownDays = cooldownConfig?.value ? Number(cooldownConfig.value) : 30;
    const cooldownCutoff = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all organisations
    const { data: orgs, error: orgErr } = await supabase
      .from("organisations")
      .select("id");

    if (orgErr) throw new Error(`signalGeneration (orgs): ${orgErr.message}`);

    for (const org of orgs ?? []) {
      // Fetch users for this org
      const { data: users, error: usrErr } = await supabase
        .from("users")
        .select("id")
        .eq("organisation_id", org.id);

      if (usrErr) throw new Error(`signalGeneration (users): ${usrErr.message}`);

      for (const user of users ?? []) {
        // Check existing signals count
        const { data: existingSignals } = await supabase
          .from("personnel_signals")
          .select("id, type, created_at")
          .eq("user_id", user.id);

        if ((existingSignals ?? []).length >= MAX_SIGNALS_PER_USER) {
          results.skippedMaxSignals++;
          continue;
        }

        // Check cooldown — skip if a signal was created recently
        const recentSignal = (existingSignals ?? []).find(
          (s) => new Date(s.created_at) > new Date(cooldownCutoff)
        );

        if (recentSignal) {
          results.skippedCooldown++;
          continue;
        }

        const newSignalTypes: string[] = [];

        // --- PERFORMANCE_DECLINE: check task completion rates ---
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, status")
          .eq("assigned_to", user.id)
          .gte("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());

        const totalTasks = tasks?.length ?? 0;
        const completedTasks = (tasks ?? []).filter((t) => t.status === "completed").length;
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1;

        if (totalTasks >= 5 && completionRate < 0.5) {
          await supabase.from("personnel_signals").insert({
            user_id: user.id,
            organisation_id: org.id,
            type: "PERFORMANCE_DECLINE",
            payload: { completion_rate: Math.round(completionRate * 100), total_tasks: totalTasks },
            created_at: nowISO,
          });
          newSignalTypes.push("PERFORMANCE_DECLINE");
          results.performanceDecline++;
        }

        // --- DEADLINE_PATTERN: check missed deadlines ---
        const { data: missedDeadlines } = await supabase
          .from("tasks")
          .select("id")
          .eq("assigned_to", user.id)
          .eq("deadline_missed", true)
          .gte("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if ((missedDeadlines ?? []).length >= 3) {
          await supabase.from("personnel_signals").insert({
            user_id: user.id,
            organisation_id: org.id,
            type: "DEADLINE_PATTERN",
            payload: { missed_count: (missedDeadlines ?? []).length },
            created_at: nowISO,
          });
          newSignalTypes.push("DEADLINE_PATTERN");
          results.deadlinePattern++;
        }

        // --- CAPABILITY_DROP: check capability assessments ---
        const { data: assessments } = await supabase
          .from("capability_assessments")
          .select("id, score, assessed_at")
          .eq("user_id", user.id)
          .order("assessed_at", { ascending: false })
          .limit(2);

        if (
          assessments &&
          assessments.length === 2 &&
          assessments[0].score < assessments[1].score &&
          assessments[1].score - assessments[0].score >= 2
        ) {
          await supabase.from("personnel_signals").insert({
            user_id: user.id,
            organisation_id: org.id,
            type: "CAPABILITY_DROP",
            payload: { previous_score: assessments[1].score, current_score: assessments[0].score },
            created_at: nowISO,
          });
          newSignalTypes.push("CAPABILITY_DROP");
          results.capabilityDrop++;
        }

        // --- FEEDBACK_PATTERN: check feedback patterns ---
        const { data: feedback } = await supabase
          .from("feedback")
          .select("id, sentiment")
          .eq("target_user_id", user.id)
          .gte("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());

        const negativeFeedback = (feedback ?? []).filter((f) => f.sentiment === "negative").length;
        const totalFeedback = feedback?.length ?? 0;

        if (totalFeedback >= 3 && negativeFeedback / totalFeedback > 0.6) {
          await supabase.from("personnel_signals").insert({
            user_id: user.id,
            organisation_id: org.id,
            type: "FEEDBACK_PATTERN",
            payload: { negative_count: negativeFeedback, total_count: totalFeedback },
            created_at: nowISO,
          });
          newSignalTypes.push("FEEDBACK_PATTERN");
          results.feedbackPattern++;
        }

        // --- ABSENCE_PATTERN: check absence records ---
        // LEGAL_REVIEW_REQUIRED
        // Absence signals must NEVER be the sole ground for escalation.
        const { data: absences } = await supabase
          .from("absence_records")
          .select("id, days")
          .eq("user_id", user.id)
          .gte("start_date", new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString());

        const totalAbsenceDays = (absences ?? []).reduce((sum, a) => sum + (a.days ?? 0), 0);

        if (totalAbsenceDays >= 20) {
          await supabase.from("personnel_signals").insert({
            user_id: user.id,
            organisation_id: org.id,
            type: "ABSENCE_PATTERN",
            payload: { total_days: totalAbsenceDays, note: "NEVER sole ground for escalation" },
            created_at: nowISO,
          });
          newSignalTypes.push("ABSENCE_PATTERN");
          results.absencePattern++;
        }

        // --- POSITIVE_TREND: check positive trends during active cases ---
        const { data: activeCases } = await supabase
          .from("personnel_cases")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["ACTIVE", "SUPPORT"]);

        if ((activeCases ?? []).length > 0 && completionRate > 0.8 && negativeFeedback === 0) {
          await supabase.from("personnel_signals").insert({
            user_id: user.id,
            organisation_id: org.id,
            type: "POSITIVE_TREND",
            payload: { completion_rate: Math.round(completionRate * 100), active_cases: (activeCases ?? []).length },
            created_at: nowISO,
          });
          newSignalTypes.push("POSITIVE_TREND");
          results.positiveTrend++;
        }

        // --- Anti-bias: require 2+ different signal types before auto-escalation ---
        // LEGAL_REVIEW_REQUIRED
        const uniqueNewTypes = [...new Set(newSignalTypes)];
        // Exclude ABSENCE_PATTERN as sole ground
        const nonAbsenceTypes = uniqueNewTypes.filter((t) => t !== "ABSENCE_PATTERN");

        if (nonAbsenceTypes.length >= 2) {
          // Check if user already has an active case
          const { data: existingCase } = await supabase
            .from("personnel_cases")
            .select("id")
            .eq("user_id", user.id)
            .not("status", "in", '("CLOSED","ARCHIVED")')
            .limit(1);

          if ((existingCase ?? []).length === 0) {
            await supabase.from("tasks").insert({
              type: "personnel_signal_review",
              title: `Personalärende: Flera signaltyper upptäckta (${uniqueNewTypes.join(", ")})`,
              assigned_to_role: "HR_MANAGER",
              entity_type: "user",
              entity_id: user.id,
              priority: "high",
              status: "pending",
              metadata: { signal_types: uniqueNewTypes, organisation_id: org.id },
              created_at: nowISO,
            });
          }
        }
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 2. Milestone Reminder — Daily 09:00
// ---------------------------------------------------------------------------
export const milestoneReminder = schedules.task({
  id: "personnel-milestone-reminder",
  cron: "0 9 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const results = { overdueReminders: 0, periodEndingNotifications: 0 };

    // --- Milestones past deadline ---
    const { data: overdueMilestones, error: msErr } = await supabase
      .from("personnel_milestones")
      .select("id, title, deadline, personnel_case_id, responsible_id")
      .lt("deadline", nowISO)
      .not("status", "in", '("COMPLETED","CANCELLED")');

    if (msErr) throw new Error(`milestoneReminder (overdue): ${msErr.message}`);

    // Only for active cases
    const { data: activeCases } = await supabase
      .from("personnel_cases")
      .select("id")
      .in("status", ["ACTIVE", "SUPPORT"]);

    const activeCaseIds = new Set((activeCases ?? []).map((c) => c.id));

    for (const ms of overdueMilestones ?? []) {
      if (!activeCaseIds.has(ms.personnel_case_id)) continue;

      await supabase.from("tasks").insert({
        type: "milestone_overdue",
        title: `Förfallen milstolpe: "${ms.title}"`,
        assigned_to: ms.responsible_id,
        entity_type: "personnel_milestone",
        entity_id: ms.id,
        priority: "high",
        status: "pending",
        created_at: nowISO,
      });

      results.overdueReminders++;
    }

    // --- Support period ending within 7 days ---
    const { data: endingCases, error: endErr } = await supabase
      .from("personnel_cases")
      .select("id, user_id, manager_id, support_period_end")
      .in("status", ["ACTIVE", "SUPPORT"])
      .gt("support_period_end", nowISO)
      .lte("support_period_end", sevenDaysFromNow);

    if (endErr) throw new Error(`milestoneReminder (ending): ${endErr.message}`);

    for (const c of endingCases ?? []) {
      const daysLeft = Math.ceil(
        (new Date(c.support_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Notify manager
      await supabase.from("tasks").insert({
        type: "support_period_ending",
        title: `Stödperiod slutar om ${daysLeft} dagar — ärende #${c.id}`,
        assigned_to: c.manager_id,
        entity_type: "personnel_case",
        entity_id: c.id,
        priority: "high",
        status: "pending",
        created_at: nowISO,
      });

      // Notify HR
      await supabase.from("tasks").insert({
        type: "support_period_ending",
        title: `Stödperiod slutar om ${daysLeft} dagar — ärende #${c.id}`,
        assigned_to_role: "HR_MANAGER",
        entity_type: "personnel_case",
        entity_id: c.id,
        priority: "high",
        status: "pending",
        created_at: nowISO,
      });

      results.periodEndingNotifications++;
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 3. Support Period Check — Daily 09:00
// ---------------------------------------------------------------------------
export const supportPeriodCheck = schedules.task({
  id: "personnel-support-period-check",
  cron: "0 9 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { flaggedForEscalation: 0, suggestedClosing: 0 };

    // Cases where support period has passed
    const { data: expiredCases, error: expErr } = await supabase
      .from("personnel_cases")
      .select("id, user_id, manager_id")
      .in("status", ["ACTIVE", "SUPPORT"])
      .lt("support_period_end", nowISO);

    if (expErr) throw new Error(`supportPeriodCheck: ${expErr.message}`);

    for (const c of expiredCases ?? []) {
      // Check milestones achieved
      const { data: milestones } = await supabase
        .from("personnel_milestones")
        .select("id, status")
        .eq("personnel_case_id", c.id);

      const totalMilestones = milestones?.length ?? 0;
      const completedMilestones = (milestones ?? []).filter((m) => m.status === "COMPLETED").length;
      const allMilestonesAchieved = totalMilestones > 0 && completedMilestones === totalMilestones;

      // Check positive signals
      const { data: positiveSignals } = await supabase
        .from("personnel_signals")
        .select("id")
        .eq("user_id", c.user_id)
        .eq("type", "POSITIVE_TREND");

      const hasPositiveSignals = (positiveSignals ?? []).length > 0;

      if (allMilestonesAchieved && hasPositiveSignals) {
        // Suggest closing case positively
        await supabase.from("tasks").insert({
          type: "personnel_case_close_positive",
          title: `Stödperiod avslutad positivt — ärende #${c.id}`,
          description: "Alla milstolpar uppnådda och positiva signaler finns. Föreslår att ärendet avslutas.",
          assigned_to: c.manager_id,
          entity_type: "personnel_case",
          entity_id: c.id,
          priority: "medium",
          status: "pending",
          created_at: nowISO,
        });

        results.suggestedClosing++;
      } else {
        // LEGAL_REVIEW_REQUIRED
        // DO NOT auto-escalate — create task for HR to review
        await supabase.from("tasks").insert({
          type: "personnel_case_escalation_review",
          title: `Stödperiod utgången utan förbättring — ärende #${c.id} kräver HR-granskning`,
          description: "Stödperioden har gått ut och milstolpar/positiva signaler saknas. Potentiell eskalering till nivå 4. Manuell granskning krävs.",
          assigned_to_role: "HR_MANAGER",
          entity_type: "personnel_case",
          entity_id: c.id,
          priority: "critical",
          status: "pending",
          metadata: {
            milestones_completed: completedMilestones,
            milestones_total: totalMilestones,
            has_positive_signals: hasPositiveSignals,
          },
          created_at: nowISO,
        });

        results.flaggedForEscalation++;
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 4. GDPR Cleanup — Monthly, 1st of month 02:00
// ---------------------------------------------------------------------------
export const gdprCleanup = schedules.task({
  id: "personnel-gdpr-cleanup",
  cron: "0 2 1 * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { signalsDeleted: 0, casesAnonymized: 0, exportedDeleted: 0 };

    // Fetch retention config (default 90 days for signals)
    const { data: retentionConfig } = await supabase
      .from("config")
      .select("value")
      .eq("key", "signal_retention_days")
      .single();

    const retentionDays = retentionConfig?.value ? Number(retentionConfig.value) : 90;
    const signalCutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // --- Delete signals older than retention with no linked case ---
    const { data: oldSignals, error: sigErr } = await supabase
      .from("personnel_signals")
      .select("id, user_id")
      .lt("created_at", signalCutoff);

    if (sigErr) throw new Error(`gdprCleanup (signals): ${sigErr.message}`);

    for (const signal of oldSignals ?? []) {
      // Check if signal is linked to a case
      const { data: linkedCase } = await supabase
        .from("personnel_cases")
        .select("id")
        .eq("user_id", signal.user_id)
        .not("status", "in", '("CLOSED","ARCHIVED")')
        .limit(1);

      if ((linkedCase ?? []).length === 0) {
        await supabase.from("personnel_signals").delete().eq("id", signal.id);

        await supabase.from("audit_log").insert({
          action: "gdpr_signal_deleted",
          entity_type: "personnel_signal",
          entity_id: signal.id,
          created_at: nowISO,
        });

        results.signalsDeleted++;
      }
    }

    // --- Anonymize closed cases past retention_until ---
    const { data: closedCases, error: caseErr } = await supabase
      .from("personnel_cases")
      .select("id, user_id, level")
      .in("status", ["CLOSED", "ARCHIVED"])
      .lt("retention_until", nowISO)
      .not("user_id", "is", null);

    if (caseErr) throw new Error(`gdprCleanup (cases): ${caseErr.message}`);

    for (const c of closedCases ?? []) {
      if (c.level === 5) {
        // Delete exported cases (level 5) past retention
        await supabase.from("personnel_cases").delete().eq("id", c.id);

        await supabase.from("audit_log").insert({
          action: "gdpr_case_deleted",
          entity_type: "personnel_case",
          entity_id: c.id,
          metadata: { level: 5 },
          created_at: nowISO,
        });

        results.exportedDeleted++;
      } else {
        // Anonymize: clear personal fields
        await supabase
          .from("personnel_cases")
          .update({
            user_id: null,
            description: "[ANONYMISERAT]",
            manager_id: null,
            notes: null,
            updated_at: nowISO,
          })
          .eq("id", c.id);

        await supabase.from("audit_log").insert({
          action: "gdpr_case_anonymized",
          entity_type: "personnel_case",
          entity_id: c.id,
          created_at: nowISO,
        });

        results.casesAnonymized++;
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 5. Anti-Bias Check — Monthly, 15th 09:00
// ---------------------------------------------------------------------------
export const antiBiasCheck = schedules.task({
  id: "personnel-anti-bias-check",
  cron: "0 9 15 * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const results = { managerAlerts: 0, systemicFlags: 0 };

    // --- Per-manager check ---
    const { data: managers, error: mgrErr } = await supabase
      .from("users")
      .select("id, organisation_id")
      .eq("role", "MANAGER");

    if (mgrErr) throw new Error(`antiBiasCheck (managers): ${mgrErr.message}`);

    for (const mgr of managers ?? []) {
      // Get direct reports
      const { data: reports } = await supabase
        .from("users")
        .select("id")
        .eq("manager_id", mgr.id);

      const reportIds = (reports ?? []).map((r) => r.id);
      if (reportIds.length === 0) continue;

      // Count reports with signals or cases
      let reportsWithIssues = 0;

      for (const reportId of reportIds) {
        const { data: signals } = await supabase
          .from("personnel_signals")
          .select("id")
          .eq("user_id", reportId)
          .gte("created_at", ninetyDaysAgo)
          .limit(1);

        const { data: cases } = await supabase
          .from("personnel_cases")
          .select("id")
          .eq("user_id", reportId)
          .not("status", "in", '("CLOSED","ARCHIVED")')
          .limit(1);

        if ((signals ?? []).length > 0 || (cases ?? []).length > 0) {
          reportsWithIssues++;
        }
      }

      // LEGAL_REVIEW_REQUIRED
      // If >50% of reports have signals/cases → alert HR_MANAGER
      if (reportIds.length >= 2 && reportsWithIssues / reportIds.length > 0.5) {
        await supabase.from("tasks").insert({
          type: "anti_bias_manager_alert",
          title: "Mönster indikerar potentiellt ledarskapsproblem",
          description: `Chef ${mgr.id}: ${reportsWithIssues} av ${reportIds.length} medarbetare har signaler/ärenden.`,
          assigned_to_role: "HR_MANAGER",
          entity_type: "user",
          entity_id: mgr.id,
          priority: "high",
          status: "pending",
          metadata: { manager_id: mgr.id, reports_total: reportIds.length, reports_with_issues: reportsWithIssues },
          created_at: nowISO,
        });

        results.managerAlerts++;
      }
    }

    // --- Signal type distribution per org ---
    const { data: orgs, error: orgErr } = await supabase
      .from("organisations")
      .select("id");

    if (orgErr) throw new Error(`antiBiasCheck (orgs): ${orgErr.message}`);

    for (const org of orgs ?? []) {
      const { data: orgSignals, error: sigErr } = await supabase
        .from("personnel_signals")
        .select("id, type")
        .eq("organisation_id", org.id)
        .gte("created_at", ninetyDaysAgo);

      if (sigErr) throw new Error(`antiBiasCheck (signals): ${sigErr.message}`);

      const totalSignals = orgSignals?.length ?? 0;
      if (totalSignals < 5) continue;

      // Count by type
      const typeCounts: Record<string, number> = {};
      for (const s of orgSignals ?? []) {
        typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
      }

      // Check if >80% same type
      for (const [type, count] of Object.entries(typeCounts)) {
        if (count / totalSignals > 0.8) {
          await supabase.from("tasks").insert({
            type: "anti_bias_systemic_flag",
            title: `Potentiellt systemiskt problem: ${type} utgör >${Math.round((count / totalSignals) * 100)}% av signaler`,
            description: `Organisation ${org.id}: Signaltyp "${type}" står för ${count} av ${totalSignals} signaler.`,
            assigned_to_role: "HR_MANAGER",
            entity_type: "organisation",
            entity_id: org.id,
            priority: "high",
            status: "pending",
            metadata: { organisation_id: org.id, dominant_type: type, count, total: totalSignals },
            created_at: nowISO,
          });

          results.systemicFlags++;
        }
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 6. Escalation Notifier — Every 5 minutes
// ---------------------------------------------------------------------------
export const escalationNotifier = schedules.task({
  id: "personnel-escalation-notifier",
  cron: "*/5 * * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { notified: 0 };

    // Find cases with status ESCALATED_TO_HR where HR hasn't been notified
    const { data: escalatedCases, error: escErr } = await supabase
      .from("personnel_cases")
      .select("id, user_id, manager_id, level")
      .eq("status", "ESCALATED_TO_HR")
      .eq("hr_notified", false);

    if (escErr) throw new Error(`escalationNotifier: ${escErr.message}`);

    for (const c of escalatedCases ?? []) {
      // Create urgent task for HR_MANAGER
      await supabase.from("tasks").insert({
        type: "personnel_escalation_urgent",
        title: `BRÅDSKANDE: Personalärende #${c.id} eskalerat till HR`,
        description: `Ärende har eskalerats till HR (nivå ${c.level}). Omedelbar granskning krävs.`,
        assigned_to_role: "HR_MANAGER",
        entity_type: "personnel_case",
        entity_id: c.id,
        priority: "critical",
        status: "pending",
        created_at: nowISO,
      });

      // Mark as notified
      await supabase
        .from("personnel_cases")
        .update({ hr_notified: true, hr_notified_at: nowISO, updated_at: nowISO })
        .eq("id", c.id);

      // Log notification
      await supabase.from("audit_log").insert({
        action: "hr_escalation_notified",
        entity_type: "personnel_case",
        entity_id: c.id,
        metadata: { level: c.level, manager_id: c.manager_id },
        created_at: nowISO,
      });

      results.notified++;
    }

    return results;
  },
});
