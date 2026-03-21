import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. Morning Check — Mån-Fre 07:00 CET
// ---------------------------------------------------------------------------
export const morningCheck = schedules.task({
  id: "execution-morning-check",
  cron: "0 7 * * 1-5",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: members, error } = await supabase
      .from("team_members")
      .select("id, name, email, role");

    if (error) throw new Error(`morningCheck: ${error.message}`);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, assignee_id, title, due_date, status")
      .eq("status", "active")
      .lte("due_date", today);

    await supabase.from("notifications").insert(
      (members ?? []).map((m) => ({
        user_id: m.id,
        type: "morning_check",
        title: "Morgonöversikt",
        body: `Du har ${(tasks ?? []).filter((t) => t.assignee_id === m.id).length} uppgifter att hantera idag.`,
        created_at: new Date().toISOString(),
      }))
    );

    return { checked: members?.length ?? 0, dueTasks: tasks?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// 2. Deal Idle Check — Every 6 hours
// ---------------------------------------------------------------------------
export const dealIdleCheck = schedules.task({
  id: "execution-deal-idle-check",
  cron: "0 */6 * * *",
  run: async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: idleDeals, error } = await supabase
      .from("deals")
      .select("id, title, owner_id, last_activity_at")
      .lt("last_activity_at", sevenDaysAgo)
      .neq("status", "closed");

    if (error) throw new Error(`dealIdleCheck: ${error.message}`);

    if (idleDeals && idleDeals.length > 0) {
      await supabase.from("deal_flags").insert(
        idleDeals.map((d) => ({
          deal_id: d.id,
          flag: "idle",
          reason: `Ingen aktivitet sedan ${d.last_activity_at}`,
          created_at: new Date().toISOString(),
        }))
      );
    }

    return { flagged: idleDeals?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// 3. Task Overdue Escalation — Every 3 hours
// ---------------------------------------------------------------------------
export const taskOverdueEscalation = schedules.task({
  id: "execution-task-overdue-escalation",
  cron: "0 */3 * * *",
  run: async () => {
    const now = new Date().toISOString();

    const { data: overdue, error } = await supabase
      .from("tasks")
      .select("id, title, assignee_id, due_date, priority")
      .eq("status", "active")
      .lt("due_date", now);

    if (error) throw new Error(`taskOverdueEscalation: ${error.message}`);

    const escalations = (overdue ?? []).map((t) => ({
      task_id: t.id,
      type: "overdue_escalation",
      priority: t.priority,
      escalated_at: now,
    }));

    if (escalations.length > 0) {
      await supabase.from("escalations").insert(escalations);
    }

    return { escalated: escalations.length };
  },
});

// ---------------------------------------------------------------------------
// 4. KPI Calculation — Daily 06:00
// ---------------------------------------------------------------------------
export const kpiCalculation = schedules.task({
  id: "execution-kpi-calculation",
  cron: "0 6 * * *",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: deals } = await supabase
      .from("deals")
      .select("id, value, status, closed_at")
      .gte("closed_at", `${today}T00:00:00`)
      .lte("closed_at", `${today}T23:59:59`);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, status, completed_at")
      .gte("completed_at", `${today}T00:00:00`)
      .lte("completed_at", `${today}T23:59:59`);

    const kpis = {
      date: today,
      deals_closed: deals?.length ?? 0,
      deal_value: (deals ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0),
      tasks_completed: tasks?.length ?? 0,
      calculated_at: new Date().toISOString(),
    };

    await supabase.from("kpi_snapshots").upsert(kpis, { onConflict: "date" });

    return kpis;
  },
});

// ---------------------------------------------------------------------------
// 5. Trial Balance Check — Daily 23:00
// ---------------------------------------------------------------------------
export const trialBalanceCheck = schedules.task({
  id: "execution-trial-balance-check",
  cron: "0 23 * * *",
  run: async () => {
    const { data: accounts, error } = await supabase
      .from("journal_entries")
      .select("debit, credit");

    if (error) throw new Error(`trialBalanceCheck: ${error.message}`);

    const totals = (accounts ?? []).reduce(
      (acc, entry) => ({
        debit: acc.debit + (entry.debit ?? 0),
        credit: acc.credit + (entry.credit ?? 0),
      }),
      { debit: 0, credit: 0 }
    );

    const difference = Math.round((totals.debit - totals.credit) * 100) / 100;
    const balanced = difference === 0;

    await supabase.from("audit_logs").insert({
      type: "trial_balance_check",
      result: balanced ? "pass" : "fail",
      details: { ...totals, difference },
      checked_at: new Date().toISOString(),
    });

    if (!balanced) {
      await supabase.from("notifications").insert({
        type: "trial_balance_alert",
        title: "Huvudbok obalanserad",
        body: `Differens: ${difference} SEK. Kontrollera bokföringen.`,
        priority: "critical",
        created_at: new Date().toISOString(),
      });
    }

    return { balanced, ...totals, difference };
  },
});

// ---------------------------------------------------------------------------
// 6. Weekly Streaks — Friday 16:00
// ---------------------------------------------------------------------------
export const weeklyStreaks = schedules.task({
  id: "execution-weekly-streaks",
  cron: "0 16 * * 5",
  run: async () => {
    const { data: members } = await supabase
      .from("team_members")
      .select("id, name, current_streak");

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 5);
    const weekStartISO = weekStart.toISOString();

    const updates: { id: string; new_streak: number }[] = [];

    for (const member of members ?? []) {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assignee_id", member.id)
        .eq("status", "completed")
        .gte("completed_at", weekStartISO);

      const hitGoal = (count ?? 0) >= 5;
      const newStreak = hitGoal ? (member.current_streak ?? 0) + 1 : 0;

      updates.push({ id: member.id, new_streak: newStreak });

      await supabase
        .from("team_members")
        .update({ current_streak: newStreak })
        .eq("id", member.id);
    }

    return { processed: updates.length, updates };
  },
});

// ---------------------------------------------------------------------------
// 7. Payout Batch — Friday 14:00
// ---------------------------------------------------------------------------
export const payoutBatch = schedules.task({
  id: "execution-payout-batch",
  cron: "0 14 * * 5",
  run: async () => {
    const { data: pending, error } = await supabase
      .from("payouts")
      .select("id, recipient_id, amount, currency")
      .eq("status", "pending");

    if (error) throw new Error(`payoutBatch: ${error.message}`);

    if (!pending || pending.length === 0) {
      return { processed: 0, totalAmount: 0 };
    }

    const totalAmount = pending.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const batch = await supabase.from("payout_batches").insert({
      count: pending.length,
      total_amount: totalAmount,
      status: "processing",
      created_at: new Date().toISOString(),
    }).select("id").single();

    await supabase
      .from("payouts")
      .update({ status: "processing", batch_id: batch.data?.id })
      .in("id", pending.map((p) => p.id));

    return { processed: pending.length, totalAmount, batchId: batch.data?.id };
  },
});

// ---------------------------------------------------------------------------
// 8. Config Watchdog — Every 12 hours
// ---------------------------------------------------------------------------
export const configWatchdog = schedules.task({
  id: "execution-config-watchdog",
  cron: "0 */12 * * *",
  run: async () => {
    const requiredKeys = [
      "company_name",
      "default_currency",
      "fiscal_year_start",
      "vat_rate",
      "base_country",
    ];

    const { data: configs, error } = await supabase
      .from("system_config")
      .select("key, value, updated_at");

    if (error) throw new Error(`configWatchdog: ${error.message}`);

    const existingKeys = (configs ?? []).map((c) => c.key);
    const missing = requiredKeys.filter((k) => !existingKeys.includes(k));
    const empty = (configs ?? []).filter(
      (c) => requiredKeys.includes(c.key) && (!c.value || c.value === "")
    );

    if (missing.length > 0 || empty.length > 0) {
      await supabase.from("notifications").insert({
        type: "config_integrity_alert",
        title: "Konfigurationsvarning",
        body: `Saknade nycklar: ${missing.join(", ") || "inga"}. Tomma nycklar: ${empty.map((e) => e.key).join(", ") || "inga"}.`,
        priority: "high",
        created_at: new Date().toISOString(),
      });
    }

    return { missing, empty: empty.map((e) => e.key), healthy: missing.length === 0 && empty.length === 0 };
  },
});
