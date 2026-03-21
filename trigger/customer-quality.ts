import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. SLA Check — Every 30 minutes
// ---------------------------------------------------------------------------
export const slaCheck = schedules.task({
  id: "customer-quality-sla-check",
  cron: "*/30 * * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { responseBreached: 0, resolutionBreached: 0, ticketBreached: 0, escalated: 0 };

    // --- Complaint response SLA ---
    const { data: openComplaints, error: compErr } = await supabase
      .from("complaints")
      .select("id, created_at, sla_response_hours, acknowledged_at, complaint_date, sla_resolution_days, status, sla_response_breached, sla_resolution_breached")
      .not("status", "in", '("RESOLVED","CLOSED")');

    if (compErr) throw new Error(`slaCheck (complaints): ${compErr.message}`);

    for (const c of openComplaints ?? []) {
      const ageMs = now.getTime() - new Date(c.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      // Response SLA
      if (c.sla_response_hours && ageHours > c.sla_response_hours && !c.acknowledged_at && !c.sla_response_breached) {
        await supabase
          .from("complaints")
          .update({ sla_response_breached: true, updated_at: nowISO })
          .eq("id", c.id);

        await supabase.from("events").insert({
          type: "complaint.sla_breached",
          entity_type: "complaint",
          entity_id: c.id,
          payload: { breach_type: "response", sla_hours: c.sla_response_hours, actual_hours: Math.round(ageHours) },
          created_at: nowISO,
        });

        results.responseBreached++;
      }

      // Resolution SLA
      if (c.sla_resolution_days && c.complaint_date) {
        const complaintAgeMs = now.getTime() - new Date(c.complaint_date).getTime();
        const complaintAgeDays = complaintAgeMs / (1000 * 60 * 60 * 24);

        if (complaintAgeDays > c.sla_resolution_days && !c.sla_resolution_breached) {
          await supabase
            .from("complaints")
            .update({ sla_resolution_breached: true, updated_at: nowISO })
            .eq("id", c.id);

          await supabase.from("events").insert({
            type: "complaint.sla_breached",
            entity_type: "complaint",
            entity_id: c.id,
            payload: { breach_type: "resolution", sla_days: c.sla_resolution_days, actual_days: Math.round(complaintAgeDays) },
            created_at: nowISO,
          });

          results.resolutionBreached++;
        }
      }
    }

    // --- Support ticket first-response SLA ---
    const { data: openTickets, error: tickErr } = await supabase
      .from("support_tickets")
      .select("id, created_at, sla_first_response_hours, first_responded_at, sla_first_response_breached, escalation_level")
      .eq("status", "open");

    if (tickErr) throw new Error(`slaCheck (tickets): ${tickErr.message}`);

    // Fetch escalation config
    const { data: escalationConfig } = await supabase
      .from("config")
      .select("value")
      .eq("key", "escalation_after_hours")
      .single();

    const escalationAfterHours = escalationConfig?.value ? Number(escalationConfig.value) : 24;

    for (const t of openTickets ?? []) {
      const ageMs = now.getTime() - new Date(t.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      // First-response SLA
      if (t.sla_first_response_hours && ageHours > t.sla_first_response_hours && !t.first_responded_at && !t.sla_first_response_breached) {
        await supabase
          .from("support_tickets")
          .update({ sla_first_response_breached: true, updated_at: nowISO })
          .eq("id", t.id);

        await supabase.from("events").insert({
          type: "support.sla_breached",
          entity_type: "support_ticket",
          entity_id: t.id,
          payload: { breach_type: "first_response", sla_hours: t.sla_first_response_hours, actual_hours: Math.round(ageHours) },
          created_at: nowISO,
        });

        results.ticketBreached++;
      }

      // Auto-escalate
      if (ageHours > escalationAfterHours && (t.escalation_level ?? 0) === 0) {
        await supabase
          .from("support_tickets")
          .update({ escalation_level: 1, last_escalated_at: nowISO, updated_at: nowISO })
          .eq("id", t.id);

        results.escalated++;
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 2. Complaint Reminder — Daily 09:00
// ---------------------------------------------------------------------------
export const complaintReminder = schedules.task({
  id: "customer-quality-complaint-reminder",
  cron: "0 9 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const results = { reminders: 0, escalated: 0 };

    // Complaints open > 7 days → reminder
    const { data: staleComplaints, error: staleErr } = await supabase
      .from("complaints")
      .select("id, title, responsible_id")
      .not("status", "in", '("RESOLVED","CLOSED")')
      .lt("created_at", sevenDaysAgo);

    if (staleErr) throw new Error(`complaintReminder (stale): ${staleErr.message}`);

    for (const c of staleComplaints ?? []) {
      await supabase.from("tasks").insert({
        type: "complaint_reminder",
        title: `Påminnelse: Klagomål "${c.title}" öppet > 7 dagar`,
        assigned_to: c.responsible_id,
        entity_type: "complaint",
        entity_id: c.id,
        priority: "high",
        status: "pending",
        created_at: nowISO,
      });

      results.reminders++;
    }

    // Complaints INVESTIGATING > 14 days → escalate to QUALITY_MANAGER
    const { data: longInvestigations, error: invErr } = await supabase
      .from("complaints")
      .select("id, title")
      .eq("status", "INVESTIGATING")
      .lt("created_at", fourteenDaysAgo);

    if (invErr) throw new Error(`complaintReminder (investigating): ${invErr.message}`);

    for (const c of longInvestigations ?? []) {
      await supabase.from("tasks").insert({
        type: "complaint_escalation",
        title: `Eskalering: Klagomål "${c.title}" under utredning > 14 dagar`,
        assigned_to_role: "QUALITY_MANAGER",
        entity_type: "complaint",
        entity_id: c.id,
        priority: "critical",
        status: "pending",
        created_at: nowISO,
      });

      results.escalated++;
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 3. Satisfaction Sender — Daily 10:00
// ---------------------------------------------------------------------------
export const satisfactionSender = schedules.task({
  id: "customer-quality-satisfaction-sender",
  cron: "0 10 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { complaintSurveys: 0, supportSurveys: 0 };

    // Fetch survey delay config (default 48h)
    const { data: delayConfig } = await supabase
      .from("config")
      .select("value")
      .eq("key", "survey_delay_hours")
      .single();

    const surveyDelayHours = delayConfig?.value ? Number(delayConfig.value) : 48;
    const cutoff = new Date(now.getTime() - surveyDelayHours * 60 * 60 * 1000).toISOString();

    // Resolved complaints with no survey sent
    const { data: resolvedComplaints, error: compErr } = await supabase
      .from("complaints")
      .select("id, customer_id, resolved_at")
      .eq("status", "RESOLVED")
      .lte("resolved_at", cutoff)
      .eq("survey_sent", false);

    if (compErr) throw new Error(`satisfactionSender (complaints): ${compErr.message}`);

    for (const c of resolvedComplaints ?? []) {
      await supabase.from("surveys").insert({
        type: "POST_COMPLAINT",
        entity_type: "complaint",
        entity_id: c.id,
        customer_id: c.customer_id,
        status: "queued",
        created_at: nowISO,
      });

      await supabase
        .from("complaints")
        .update({ survey_sent: true, updated_at: nowISO })
        .eq("id", c.id);

      results.complaintSurveys++;
    }

    // Resolved support tickets with no survey sent
    const { data: resolvedTickets, error: tickErr } = await supabase
      .from("support_tickets")
      .select("id, customer_id, resolved_at")
      .eq("status", "resolved")
      .lte("resolved_at", cutoff)
      .eq("survey_sent", false);

    if (tickErr) throw new Error(`satisfactionSender (tickets): ${tickErr.message}`);

    for (const t of resolvedTickets ?? []) {
      await supabase.from("surveys").insert({
        type: "POST_SUPPORT",
        entity_type: "support_ticket",
        entity_id: t.id,
        customer_id: t.customer_id,
        status: "queued",
        created_at: nowISO,
      });

      await supabase
        .from("support_tickets")
        .update({ survey_sent: true, updated_at: nowISO })
        .eq("id", t.id);

      results.supportSurveys++;
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 4. Customer Quality Report — Friday 14:00
// ---------------------------------------------------------------------------
export const customerQualityReport = schedules.task({
  id: "customer-quality-weekly-report",
  cron: "0 14 * * 5",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // New complaints this week
    const { data: newComplaints } = await supabase
      .from("complaints")
      .select("id")
      .gte("created_at", weekAgo);

    // Resolved complaints this week
    const { data: resolvedComplaints } = await supabase
      .from("complaints")
      .select("id")
      .gte("resolved_at", weekAgo)
      .in("status", ["RESOLVED", "CLOSED"]);

    // SLA compliance
    const { data: allWeekComplaints } = await supabase
      .from("complaints")
      .select("id, sla_response_breached, sla_resolution_breached")
      .gte("created_at", weekAgo);

    const totalWeek = allWeekComplaints?.length ?? 0;
    const breachedCount = (allWeekComplaints ?? []).filter(
      (c) => c.sla_response_breached || c.sla_resolution_breached
    ).length;
    const slaCompliancePct = totalWeek > 0 ? Math.round(((totalWeek - breachedCount) / totalWeek) * 100) : 100;

    // NPS this week
    const { data: weekSurveys } = await supabase
      .from("surveys")
      .select("id, nps_score")
      .gte("completed_at", weekAgo)
      .not("nps_score", "is", null);

    const scores = (weekSurveys ?? []).map((s) => s.nps_score as number);
    const promoters = scores.filter((s) => s >= 9).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const nps = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : null;

    const report = {
      period_start: weekAgo,
      period_end: nowISO,
      new_complaints: newComplaints?.length ?? 0,
      resolved_complaints: resolvedComplaints?.length ?? 0,
      sla_compliance_pct: slaCompliancePct,
      nps_score: nps,
      survey_responses: scores.length,
      generated_at: nowISO,
    };

    await supabase.from("tasks").insert({
      type: "weekly_report",
      title: "Veckorapport kundkvalitet",
      assigned_to_role: "QUALITY_MANAGER",
      entity_type: "report",
      priority: "medium",
      status: "pending",
      metadata: report,
      created_at: nowISO,
    });

    return report;
  },
});

// ---------------------------------------------------------------------------
// 5. NPS Trend Check — 1st of every month
// ---------------------------------------------------------------------------
export const npsTrendCheck = schedules.task({
  id: "customer-quality-nps-trend",
  cron: "0 8 1 * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();

    const monthlyNps: { month: string; nps: number }[] = [];

    for (let i = 1; i <= 3; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).toISOString();

      const { data: surveys } = await supabase
        .from("surveys")
        .select("nps_score")
        .gte("completed_at", monthStart)
        .lte("completed_at", monthEnd)
        .not("nps_score", "is", null);

      const scores = (surveys ?? []).map((s) => s.nps_score as number);
      const promoters = scores.filter((s) => s >= 9).length;
      const detractors = scores.filter((s) => s <= 6).length;
      const nps = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : 0;

      monthlyNps.push({ month: monthStart.slice(0, 7), nps });
    }

    // monthlyNps[0] = most recent, monthlyNps[2] = oldest
    const declining =
      monthlyNps.length === 3 &&
      monthlyNps[0].nps < monthlyNps[1].nps &&
      monthlyNps[1].nps < monthlyNps[2].nps;

    if (declining) {
      await supabase.from("management_review_inputs").insert({
        domain: "CUSTOMER_FEEDBACK",
        title: "NPS nedåtgående trend — 3 månader i rad",
        description: `NPS har sjunkit tre månader i rad: ${monthlyNps[2].month} (${monthlyNps[2].nps}), ${monthlyNps[1].month} (${monthlyNps[1].nps}), ${monthlyNps[0].month} (${monthlyNps[0].nps}).`,
        data: monthlyNps,
        flagged_for_role: "EXECUTIVE",
        created_at: nowISO,
      });
    }

    return { monthlyNps, declining };
  },
});

// ---------------------------------------------------------------------------
// 6. Recall Notifier — Every 5 minutes
// ---------------------------------------------------------------------------
export const recallNotifier = schedules.task({
  id: "customer-quality-recall-notifier",
  cron: "*/5 * * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { tasksCreated: 0, urgentEscalations: 0 };

    // Approved recalls without tasks created
    const { data: pendingRecalls, error: recallErr } = await supabase
      .from("recalls")
      .select("id, title, description, assigned_to, severity")
      .eq("status", "APPROVED")
      .eq("tasks_created", false);

    if (recallErr) throw new Error(`recallNotifier (tasks): ${recallErr.message}`);

    for (const r of pendingRecalls ?? []) {
      await supabase.from("tasks").insert({
        type: "recall_action",
        title: `Återkallelse: ${r.title}`,
        description: r.description,
        assigned_to: r.assigned_to,
        entity_type: "recall",
        entity_id: r.id,
        priority: r.severity === "critical" ? "critical" : "high",
        status: "pending",
        created_at: nowISO,
      });

      await supabase
        .from("recalls")
        .update({ tasks_created: true, updated_at: nowISO })
        .eq("id", r.id);

      results.tasksCreated++;
    }

    // Regulatory notification overdue (approved > 24h ago, not notified)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: overdueRegulatory, error: regErr } = await supabase
      .from("recalls")
      .select("id, title")
      .eq("regulatory_notification_required", true)
      .is("regulatory_notified_at", null)
      .lt("approved_at", twentyFourHoursAgo);

    if (regErr) throw new Error(`recallNotifier (regulatory): ${regErr.message}`);

    for (const r of overdueRegulatory ?? []) {
      await supabase.from("tasks").insert({
        type: "recall_regulatory_urgent",
        title: `BRÅDSKANDE: Myndighetsanmälan saknas för återkallelse "${r.title}"`,
        assigned_to_role: "QUALITY_MANAGER",
        entity_type: "recall",
        entity_id: r.id,
        priority: "critical",
        status: "pending",
        created_at: nowISO,
      });

      await supabase.from("notifications").insert({
        type: "recall_regulatory_overdue",
        title: `Myndighetsanmälan försenad: ${r.title}`,
        body: `Återkallelse "${r.title}" godkändes för mer än 24h sedan men myndighetsanmälan har inte registrerats.`,
        priority: "critical",
        created_at: nowISO,
      });

      results.urgentEscalations++;
    }

    return results;
  },
});
