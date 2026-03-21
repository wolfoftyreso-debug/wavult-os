// ---------------------------------------------------------------------------
// Agreements & Job Descriptions Background Jobs
// ISO 5.3, 7.2, 8.4.3, GDPR Art 28
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// Daily 08:00: Check agreement expiration dates
// <90d → reminder, <30d → urgent, expired → status change
// ---------------------------------------------------------------------------
export const agreementExpiryCheck = schedules.task({
  id: "agreement-expiry-check",
  cron: "0 8 * * *",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    // Expire agreements past expiration_date
    const { data: expired } = await supabase
      .from("agreements")
      .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
      .in("status", ["ACTIVE", "EXPIRING"])
      .lt("expiration_date", today)
      .select("id, org_id, code, title, agreement_type, linked_user_id, linked_supplier_id");

    for (const a of expired ?? []) {
      await supabase.from("tasks").insert({
        org_id: a.org_id,
        title: `Avtal utgånget: ${a.code} — ${a.title}`,
        description: `Avtalet har löpt ut. Typ: ${a.agreement_type}. Förnya eller arkivera.`,
        status: "TODO",
        priority: "HIGH",
        type: "AGREEMENT",
      });

      // If EMPLOYMENT type: alert HR
      if (a.agreement_type === "EMPLOYMENT" && a.linked_user_id) {
        await supabase.from("tasks").insert({
          org_id: a.org_id,
          title: `Anställningsavtal utgånget: ${a.code}`,
          description: `Anställningsavtalet har löpt ut. Förnya omedelbart eller avsluta anställningen.`,
          status: "TODO",
          priority: "URGENT",
          type: "HR",
        });
      }
    }

    // Mark EXPIRING (within 30 days)
    await supabase
      .from("agreements")
      .update({ status: "EXPIRING", updated_at: new Date().toISOString() })
      .eq("status", "ACTIVE")
      .lte("expiration_date", in30)
      .gt("expiration_date", today);

    // Reminders for 30-90 day window
    const { data: soonExpiring } = await supabase
      .from("agreements")
      .select("id, org_id, code, title, expiration_date, agreement_type")
      .in("status", ["ACTIVE", "EXPIRING"])
      .lte("expiration_date", in90)
      .gt("expiration_date", in30);

    for (const a of soonExpiring ?? []) {
      // Check if task already exists
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("reference_id", a.id)
        .eq("type", "AGREEMENT_RENEWAL")
        .in("status", ["TODO", "IN_PROGRESS"]);

      if ((count ?? 0) === 0) {
        const daysLeft = Math.round((new Date(a.expiration_date).getTime() - Date.now()) / 86400000);
        await supabase.from("tasks").insert({
          org_id: a.org_id,
          title: `Avtal löper ut om ${daysLeft} dagar: ${a.code}`,
          description: `${a.title} (${a.agreement_type}) löper ut ${a.expiration_date}. Förnya eller avsluta.`,
          status: "TODO",
          priority: daysLeft < 30 ? "HIGH" : "MEDIUM",
          type: "AGREEMENT_RENEWAL",
          reference_id: a.id,
        });
      }
    }

    // Auto-renew agreements where auto_renew=true and expiration within 30 days
    const { data: autoRenew } = await supabase
      .from("agreements")
      .select("*")
      .eq("auto_renew", true)
      .in("status", ["ACTIVE", "EXPIRING"])
      .lte("expiration_date", in30)
      .gt("expiration_date", today);

    for (const a of autoRenew ?? []) {
      if (a.auto_renew_period_months) {
        const newExpiry = new Date(a.expiration_date);
        newExpiry.setMonth(newExpiry.getMonth() + a.auto_renew_period_months);

        // Create renewal
        const { data: renewed } = await supabase.from("agreements").insert({
          org_id: a.org_id,
          agreement_type: a.agreement_type,
          title: a.title,
          status: "ACTIVE",
          party_internal: a.party_internal,
          party_external_company_id: a.party_external_company_id,
          party_external_name: a.party_external_name,
          effective_date: a.expiration_date,
          expiration_date: newExpiry.toISOString().slice(0, 10),
          auto_renew: a.auto_renew,
          auto_renew_period_months: a.auto_renew_period_months,
          parent_agreement_id: a.id,
          contract_value: a.contract_value,
          contract_currency: a.contract_currency,
          linked_user_id: a.linked_user_id,
          linked_supplier_id: a.linked_supplier_id,
        }).select("id").single();

        if (renewed) {
          await supabase.from("agreements")
            .update({ status: "RENEWED", updated_at: new Date().toISOString() })
            .eq("id", a.id);
        }
      }
    }

    console.log(`[agreements] Expiry check: ${expired?.length ?? 0} expired, ${soonExpiring?.length ?? 0} soon, ${autoRenew?.length ?? 0} auto-renewed`);
    return { expired: expired?.length ?? 0, soon_expiring: soonExpiring?.length ?? 0, auto_renewed: autoRenew?.length ?? 0 };
  },
});

// ---------------------------------------------------------------------------
// Weekly: HR compliance report
// Users without employment agreement, without job description, unsigned agreements
// ---------------------------------------------------------------------------
export const agreementHrComplianceReport = schedules.task({
  id: "agreement-hr-compliance",
  cron: "0 9 * * 1",
  run: async () => {
    // Users without employment agreement
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id, full_name, org_id")
      .eq("is_active", true);

    const { data: employmentAgreements } = await supabase
      .from("agreements")
      .select("linked_user_id")
      .eq("agreement_type", "EMPLOYMENT")
      .in("status", ["ACTIVE", "EXPIRING"]);

    const usersWithAgreement = new Set((employmentAgreements ?? []).map(a => a.linked_user_id));
    const usersWithout = (allUsers ?? []).filter(u => !usersWithAgreement.has(u.id));

    // Users without job description assignment
    const { data: jobAssignments } = await supabase
      .from("user_job_assignments")
      .select("user_id")
      .is("end_date", null);

    const usersWithJob = new Set((jobAssignments ?? []).map(a => a.user_id));
    const usersWithoutJob = (allUsers ?? []).filter(u => !usersWithJob.has(u.id));

    // Unsigned agreements
    const { data: unsigned } = await supabase
      .from("agreements")
      .select("id, code, title, agreement_type")
      .eq("status", "PENDING_SIGNATURE");

    const report = {
      users_without_agreement: usersWithout.length,
      users_without_job_description: usersWithoutJob.length,
      unsigned_agreements: unsigned?.length ?? 0,
    };

    // Create task if issues found
    if (usersWithout.length > 0 || usersWithoutJob.length > 0 || (unsigned?.length ?? 0) > 0) {
      const orgs = [...new Set((allUsers ?? []).map(u => u.org_id).filter(Boolean))];
      for (const org_id of orgs) {
        await supabase.from("tasks").insert({
          org_id,
          title: `Avtalskomplettering: ${usersWithout.length} utan avtal, ${usersWithoutJob.length} utan befattning, ${unsigned?.length ?? 0} osignerade`,
          description: `Veckorapport ISO 5.3/7.2: Åtgärda för att säkerställa compliance.`,
          status: "TODO",
          priority: usersWithout.length > 0 ? "HIGH" : "MEDIUM",
          type: "COMPLIANCE",
        });
      }
    }

    await supabase.from("audit_logs").insert({
      entity_type: "agreement",
      action: "hr_compliance_report",
      metadata: report,
    });

    console.log(`[agreements] HR compliance: ${JSON.stringify(report)}`);
    return report;
  },
});

// ---------------------------------------------------------------------------
// Quarterly: Job description review reminder
// ---------------------------------------------------------------------------
export const jobDescriptionReview = schedules.task({
  id: "job-description-review",
  cron: "0 9 1 1,4,7,10 *",
  run: async () => {
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const { data: dueForReview } = await supabase
      .from("job_descriptions")
      .select("id, org_id, code, title, next_review_date")
      .eq("status", "ACTIVE")
      .lte("next_review_date", in30);

    for (const jd of dueForReview ?? []) {
      await supabase.from("tasks").insert({
        org_id: jd.org_id,
        title: `Granska befattningsbeskrivning: ${jd.code} — ${jd.title}`,
        description: `Befattningsbeskrivningen ska granskas senast ${jd.next_review_date}. ISO 5.3.`,
        status: "TODO",
        priority: "MEDIUM",
        type: "COMPLIANCE",
        reference_id: jd.id,
      });
    }

    console.log(`[agreements] Job description review: ${dueForReview?.length ?? 0} due`);
    return { due_for_review: dueForReview?.length ?? 0 };
  },
});
