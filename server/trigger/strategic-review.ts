import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. Quarterly Review — 1st of Jan, Apr, Jul, Oct at 08:00
// ---------------------------------------------------------------------------
export const quarterlyReview = schedules.task({
  id: "strategic-quarterly-review",
  cron: "0 8 1 1,4,7,10 *",
  run: async () => {
    // Determine the quarter period
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const year = now.getFullYear();

    // The quarter we're reviewing is the PREVIOUS quarter
    let periodFrom: string;
    let periodTo: string;

    if (currentMonth === 0) {
      // January → review Q4 of previous year
      periodFrom = `${year - 1}-10-01`;
      periodTo = `${year - 1}-12-31`;
    } else if (currentMonth === 3) {
      // April → review Q1
      periodFrom = `${year}-01-01`;
      periodTo = `${year}-03-31`;
    } else if (currentMonth === 6) {
      // July → review Q2
      periodFrom = `${year}-04-01`;
      periodTo = `${year}-06-30`;
    } else {
      // October → review Q3
      periodFrom = `${year}-07-01`;
      periodTo = `${year}-09-30`;
    }

    // Get all orgs
    const { data: orgs } = await supabase
      .from("strategic_reviews")
      .select("org_id")
      .limit(0);

    // Fetch distinct org_ids from entities as a proxy for active orgs
    const { data: orgRows } = await supabase
      .from("entities")
      .select("org_id")
      .limit(1000);

    const uniqueOrgs = [...new Set((orgRows ?? []).map((r: any) => r.org_id))];

    const results = [];

    for (const orgId of uniqueOrgs) {
      // Create the quarterly review
      const { data: review, error } = await supabase
        .from("strategic_reviews")
        .insert({
          org_id: orgId,
          review_type: "QUARTERLY_REVIEW",
          period_from: periodFrom,
          period_to: periodTo,
          status: "PREPARING",
          scheduled_date: now.toISOString().slice(0, 10),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[quarterly-review] Failed for org ${orgId}:`, error.message);
        continue;
      }

      // Create a task for ADMIN to review
      await supabase.from("tasks").insert({
        org_id: orgId,
        title: `Kvartalsgenomgång ${periodFrom} – ${periodTo}`,
        description: `Strategisk kvartalsgenomgång har skapats automatiskt. Kör datainsamling och AI-analys, sedan boka genomgångsmöte.`,
        status: "TODO",
        priority: 1,
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      });

      results.push({ orgId, reviewId: review?.id });
    }

    return { created: results.length, reviews: results };
  },
});

// ---------------------------------------------------------------------------
// 2. Annual Strategy — January 1st at 08:00
// ---------------------------------------------------------------------------
export const annualStrategy = schedules.task({
  id: "strategic-annual-strategy",
  cron: "0 8 1 1 *",
  run: async () => {
    const now = new Date();
    const year = now.getFullYear();

    // 12-month lookback: previous full year
    const periodFrom = `${year - 1}-01-01`;
    const periodTo = `${year - 1}-12-31`;

    const { data: orgRows } = await supabase
      .from("entities")
      .select("org_id")
      .limit(1000);

    const uniqueOrgs = [...new Set((orgRows ?? []).map((r: any) => r.org_id))];

    const results = [];

    for (const orgId of uniqueOrgs) {
      const { data: review, error } = await supabase
        .from("strategic_reviews")
        .insert({
          org_id: orgId,
          review_type: "ANNUAL_STRATEGY",
          period_from: periodFrom,
          period_to: periodTo,
          status: "PREPARING",
          scheduled_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[annual-strategy] Failed for org ${orgId}:`, error.message);
        continue;
      }

      // Create task for admin
      await supabase.from("tasks").insert({
        org_id: orgId,
        title: `Årlig strategigenomgång ${year - 1}`,
        description: `Årlig strategisk genomgång har skapats. Perioden täcker hela ${year - 1}. Planera genomgångsmöte inom 2 veckor.`,
        status: "TODO",
        priority: 1,
        due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      });

      results.push({ orgId, reviewId: review?.id });
    }

    return { created: results.length, reviews: results };
  },
});

// ---------------------------------------------------------------------------
// 3. Weekly Action Check — Monday 08:00
// ---------------------------------------------------------------------------
export const weeklyActionCheck = schedules.task({
  id: "strategic-weekly-action-check",
  cron: "0 8 * * 1",
  run: async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Find all action items that are overdue
    const { data: overdueItems, error } = await supabase
      .from("review_action_items")
      .select("id, title, deadline, responsible_id, review_id, status")
      .in("status", ["PENDING", "IN_PROGRESS"])
      .lt("deadline", today);

    if (error) {
      throw new Error(`weeklyActionCheck: ${error.message}`);
    }

    const items = overdueItems ?? [];
    let flagged = 0;

    for (const item of items) {
      await supabase
        .from("review_action_items")
        .update({
          status: "OVERDUE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      flagged++;
    }

    return { checked: items.length, flagged_overdue: flagged };
  },
});

// ---------------------------------------------------------------------------
// 4. Monthly Followup — 15th of every month at 08:00
// ---------------------------------------------------------------------------
export const monthlyFollowup = schedules.task({
  id: "strategic-monthly-followup",
  cron: "0 8 15 * *",
  run: async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Period: previous month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const periodFrom = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    const periodTo = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${daysInPrevMonth}`;

    const { data: orgRows } = await supabase
      .from("entities")
      .select("org_id")
      .limit(1000);

    const uniqueOrgs = [...new Set((orgRows ?? []).map((r: any) => r.org_id))];

    const results = [];

    for (const orgId of uniqueOrgs) {
      const { data: review, error } = await supabase
        .from("strategic_reviews")
        .insert({
          org_id: orgId,
          review_type: "MONTHLY_FOLLOWUP",
          period_from: periodFrom,
          period_to: periodTo,
          status: "PREPARING",
          scheduled_date: now.toISOString().slice(0, 10),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[monthly-followup] Failed for org ${orgId}:`, error.message);
        continue;
      }

      results.push({ orgId, reviewId: review?.id });
    }

    return { created: results.length, reviews: results };
  },
});
