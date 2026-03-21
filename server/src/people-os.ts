import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function isManager(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === "MANAGER" || user?.role === "ADMIN" || user?.app_metadata?.role === "MANAGER" || user?.app_metadata?.role === "ADMIN";
}

// ─── Pulse question rotation ──────────────────────────────────────────────────
const PULSE_QUESTIONS = [
  { weekMod: 1, question: "Hur mår du på jobbet just nu?",                type: "MOOD"  },
  { weekMod: 2, question: "Känner du att du har tillräckligt med stöd?",  type: "SCALE" },
  { weekMod: 3, question: "Är din arbetsbelastning rimlig?",               type: "SCALE" },
  { weekMod: 4, question: "Bidrar ditt arbete till något meningsfullt?",  type: "SCALE" },
  { weekMod: 0, question: "Är kommunikationen i teamet bra?",             type: "SCALE" },
];

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function getPulseQuestion(week: number) {
  return PULSE_QUESTIONS[(week - 1) % 5];
}

const router = Router();
router.use(requireAuth);

// ═══════════════════════════════════════════════════════════════════════════════
// PULSE SURVEYS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/people/pulse/this-week — current question + whether user has responded
router.get("/pulse/this-week", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { week, year } = getISOWeek(new Date());
    const pq = getPulseQuestion(week);

    const { data: existing } = await supabase
      .from("erm_pulse_surveys")
      .select("id, score, mood, comment, responded_at")
      .eq("user_id", user.id)
      .eq("week_number", week)
      .eq("year", year)
      .maybeSingle();

    res.json({
      week,
      year,
      question: pq.question,
      question_type: pq.type,
      already_responded: !!existing?.responded_at,
      response: existing || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/people/pulse/respond
router.post("/pulse/respond", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { score, mood, comment, is_anonymous = true } = req.body;
    const { week, year } = getISOWeek(new Date());
    const pq = getPulseQuestion(week);

    // Need org_id — look it up from profiles or memberships
    const org_id = (user as any).org_id ?? "00000000-0000-0000-0000-000000000000";

    const payload = {
      org_id,
      user_id: user.id,
      week_number: week,
      year,
      question: pq.question,
      question_type: pq.type,
      score: pq.type !== "MOOD" ? score : null,
      mood: pq.type === "MOOD" ? mood : null,
      comment: comment || null,
      is_anonymous,
      responded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("erm_pulse_surveys")
      .upsert(payload, { onConflict: "user_id,week_number,year" })
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/pulse/history — own responses
router.get("/pulse/history", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from("erm_pulse_surveys")
      .select("week_number, year, question, question_type, score, mood, responded_at")
      .eq("user_id", user.id)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/pulse/team-summary — managers only, anonymized
router.get("/pulse/team-summary", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    const { week, year } = getISOWeek(new Date());

    const org_id = (user as any).org_id;
    if (!org_id) return res.json({ total: 0, responded: 0, avg_score: null, mood_distribution: {} });

    const { data: responses } = await supabase
      .from("erm_pulse_surveys")
      .select("score, mood, question_type, responded_at")
      .eq("org_id", org_id)
      .eq("week_number", week)
      .eq("year", year);

    const { count: totalMembers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id);

    const responded = responses?.filter(r => r.responded_at) ?? [];
    const scaleResponses = responded.filter(r => r.question_type !== "MOOD" && r.score);
    const avg_score = scaleResponses.length
      ? scaleResponses.reduce((s, r) => s + (r.score ?? 0), 0) / scaleResponses.length
      : null;

    const mood_distribution: Record<string, number> = {};
    responded.filter(r => r.mood).forEach(r => {
      mood_distribution[r.mood!] = (mood_distribution[r.mood!] ?? 0) + 1;
    });

    res.json({
      week, year,
      total: totalMembers ?? 0,
      responded: responded.length,
      response_rate: totalMembers ? Math.round((responded.length / (totalMembers as number)) * 100) : 0,
      avg_score: avg_score ? Math.round(avg_score * 10) / 10 : null,
      mood_distribution,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT SCORES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/people/calculate-scores — cron endpoint
router.post("/calculate-scores", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    const { week, year } = getISOWeek(new Date());

    const org_id = (user as any).org_id;
    if (!org_id) return res.json({ calculated: 0 });

    // Get all users in org
    const { data: members } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", org_id);

    if (!members?.length) return res.json({ calculated: 0 });

    let calculated = 0;
    for (const member of members) {
      // Pulse score: avg of last 4 weeks (scale 1-5 → 0-100)
      const { data: pulses } = await supabase
        .from("erm_pulse_surveys")
        .select("score, mood, responded_at")
        .eq("user_id", member.id)
        .eq("year", year)
        .gte("week_number", week - 4)
        .lte("week_number", week);

      const responded = pulses?.filter(p => p.responded_at) ?? [];
      const moodMap: Record<string, number> = { GREAT: 5, GOOD: 4, OK: 3, BAD: 2, TERRIBLE: 1 };
      const scores = responded.map(p => p.score ?? (p.mood ? moodMap[p.mood] : null)).filter(Boolean) as number[];
      const pulse_score = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 100 : 50;

      // Activity score: simple — responded ratio
      const activity_score = responded.length > 0 ? Math.min(100, (responded.length / 4) * 100) : 30;

      // Goal progress: placeholder (would hook into capability module)
      const goal_progress_score = 60;

      const engagement_score = (pulse_score * 0.4) + (goal_progress_score * 0.3) + (activity_score * 0.3);

      // Trend: compare to 4-week avg
      const { data: prevScores } = await supabase
        .from("erm_engagement_scores")
        .select("engagement_score")
        .eq("user_id", member.id)
        .order("period_year", { ascending: false })
        .order("period_week", { ascending: false })
        .limit(4);

      let trend: string = "STABLE";
      if (prevScores?.length) {
        const prevAvg = prevScores.reduce((a, b) => a + Number(b.engagement_score ?? 50), 0) / prevScores.length;
        const diff = engagement_score - prevAvg;
        if (diff > 5) trend = "IMPROVING";
        else if (diff < -5) trend = "DECLINING";
        // Check 3 consecutive declines
        if (prevScores.length >= 3) {
          const last3 = prevScores.slice(0, 3).map(s => Number(s.engagement_score));
          if (last3[0] > last3[1] && last3[1] > last3[2] && engagement_score < last3[0]) {
            trend = "CRITICAL";
          }
        }
      }

      const burnout_risk =
        engagement_score < 35 ? "CRITICAL" :
        engagement_score < 50 ? "HIGH" :
        engagement_score < 65 ? "MEDIUM" : "LOW";

      await supabase.from("erm_engagement_scores").upsert({
        org_id,
        user_id: member.id,
        period_week: week,
        period_year: year,
        engagement_score: Math.round(engagement_score * 100) / 100,
        burnout_risk,
        trend,
        pulse_score: Math.round(pulse_score * 100) / 100,
        activity_score: Math.round(activity_score * 100) / 100,
        goal_progress_score,
        calculated_at: new Date().toISOString(),
      }, { onConflict: "user_id,period_week,period_year" });

      calculated++;
    }

    res.json({ ok: true, calculated, week, year });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/scores/team — manager view
router.get("/scores/team", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    const { week, year } = getISOWeek(new Date());

    const org_id = (user as any).org_id;

    const { data: scores } = await supabase
      .from("erm_engagement_scores")
      .select("user_id, engagement_score, burnout_risk, trend, pulse_score, activity_score, goal_progress_score, calculated_at")
      .eq("org_id", org_id)
      .eq("period_week", week)
      .eq("period_year", year);

    // Enrich with user names
    const userIds = (scores ?? []).map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach(p => { profileMap[p.id] = p; });

    const enriched = (scores ?? []).map(s => ({ ...s, user: profileMap[s.user_id] ?? {} }));

    res.json({ week, year, team: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/scores/:user_id — individual trend
router.get("/scores/:user_id", async (req: Request, res: Response) => {
  try {
    if (!isManager(req) && (req as any).user.id !== req.params.user_id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data: scores, error } = await supabase
      .from("erm_engagement_scores")
      .select("*")
      .eq("user_id", req.params.user_id)
      .order("period_year", { ascending: false })
      .order("period_week", { ascending: false })
      .limit(12);

    if (error) throw error;
    res.json(scores ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/people/feedback
router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { feedback_type, category, message, is_anonymous = true, to_user_id, severity = "LOW" } = req.body;

    const org_id = (user as any).org_id ?? "00000000-0000-0000-0000-000000000000";

    // Simple sentiment detection
    const negative = ["dålig", "sämre", "jobbig", "stress", "orättvis", "problem", "fel", "missnöjd"];
    const positive = ["bra", "superbra", "fantastisk", "nöjd", "glad", "uppskattad", "stolt"];
    const lower = message.toLowerCase();
    const sentiment = negative.some(w => lower.includes(w)) ? "NEGATIVE"
      : positive.some(w => lower.includes(w)) ? "POSITIVE" : "NEUTRAL";

    const { data, error } = await supabase.from("erm_feedback").insert({
      org_id,
      from_user_id: is_anonymous ? null : user.id,
      to_user_id: to_user_id ?? null,
      feedback_type: feedback_type ?? "ANONYMOUS_TO_ORG",
      category: category ?? "OTHER",
      message,
      sentiment,
      is_anonymous,
      severity,
    }).select().single();

    if (error) throw error;

    // If CRITICAL severity, create warning flag
    if (severity === "CRITICAL" && to_user_id) {
      await supabase.from("erm_warning_flags").insert({
        org_id,
        user_id: to_user_id,
        flag_type: "NEGATIVE_TREND",
        severity: "CRITICAL",
        description: "Critical feedback received",
        suggested_action: "Immediate 1-on-1 recommended",
        detected_data: { feedback_id: data.id },
      });
    }

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/feedback/inbox
router.get("/feedback/inbox", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    // org_id from auth middleware

    const { data, error } = await supabase
      .from("erm_feedback")
      .select("id, feedback_type, category, message, sentiment, severity, status, is_anonymous, created_at, manager_notes")
      .eq("org_id", (user as any).org_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/people/feedback/:id/acknowledge
router.patch("/feedback/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const { error } = await supabase
      .from("erm_feedback")
      .update({ status: "ACKNOWLEDGED", manager_notes: req.body.notes ?? null })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/people/feedback/:id/resolve
router.patch("/feedback/:id/resolve", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const { error } = await supabase
      .from("erm_feedback")
      .update({ status: "RESOLVED", resolved_at: new Date().toISOString(), manager_notes: req.body.notes ?? null })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EARLY WARNINGS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/people/analyze-warnings — cron
router.post("/analyze-warnings", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    const { week, year } = getISOWeek(new Date());

    const org_id = (user as any).org_id;
    if (!org_id) return res.json({ warnings_created: 0 });

    const { data: members } = await supabase.from("users").select("id").eq("org_id", org_id);
    let warnings_created = 0;

    for (const member of members ?? []) {
      // Check missed surveys (3+ consecutive weeks)
      const { data: pulses } = await supabase
        .from("erm_pulse_surveys")
        .select("week_number, responded_at")
        .eq("user_id", member.id)
        .eq("year", year)
        .gte("week_number", week - 3)
        .lte("week_number", week);

      const missedWeeks = 4 - (pulses?.filter(p => p.responded_at).length ?? 0);
      if (missedWeeks >= 3) {
        await supabase.from("erm_warning_flags").upsert({
          org_id, user_id: member.id,
          flag_type: "MISSED_SURVEYS", severity: "MEDIUM",
          description: `${missedWeeks} missed pulse surveys in a row`,
          suggested_action: "Check in with employee directly",
          detected_data: { missed_weeks: missedWeeks, week, year },
        }, { onConflict: "org_id,user_id,flag_type" });
        warnings_created++;
      }

      // Check declining engagement (>15 points over 4 weeks)
      const { data: recentScores } = await supabase
        .from("erm_engagement_scores")
        .select("engagement_score, period_week, period_year")
        .eq("user_id", member.id)
        .order("period_year", { ascending: false })
        .order("period_week", { ascending: false })
        .limit(4);

      if (recentScores && recentScores.length >= 2) {
        const latest = Number(recentScores[0].engagement_score);
        const oldest = Number(recentScores[recentScores.length - 1].engagement_score);
        const decline = oldest - latest;

        if (decline >= 15) {
          await supabase.from("erm_warning_flags").upsert({
            org_id, user_id: member.id,
            flag_type: "DECLINING_ENGAGEMENT", severity: decline >= 25 ? "HIGH" : "MEDIUM",
            description: `Engagement declined ${Math.round(decline)} points over ${recentScores.length} weeks`,
            suggested_action: "Schedule 1-on-1 and discuss workload",
            detected_data: { decline: Math.round(decline), scores: recentScores.map(s => s.engagement_score) },
          }, { onConflict: "org_id,user_id,flag_type" });
          warnings_created++;
        }

        // Burnout risk
        if (latest < 35) {
          await supabase.from("erm_warning_flags").upsert({
            org_id, user_id: member.id,
            flag_type: "BURNOUT_RISK", severity: latest < 25 ? "CRITICAL" : "HIGH",
            description: `Engagement score critically low: ${Math.round(latest)}/100`,
            suggested_action: "Immediate attention required — schedule 1-on-1 today",
            detected_data: { score: Math.round(latest) },
          }, { onConflict: "org_id,user_id,flag_type" });
          warnings_created++;
        }
      }
    }

    res.json({ ok: true, warnings_created, week, year });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/people/warnings
router.get("/warnings", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    // org_id from auth middleware

    const { data, error } = await supabase
      .from("erm_warning_flags")
      .select("*")
      .eq("org_id", (user as any).org_id)
      .eq("status", "OPEN")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enrich with user names
    const userIds = (data ?? []).map(w => w.user_id);
    const { data: profiles } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach(p => { profileMap[p.id] = p; });

    res.json((data ?? []).map(w => ({ ...w, user: profileMap[w.user_id] ?? {} })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/people/warnings/:id/acknowledge
router.patch("/warnings/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    const { error } = await supabase
      .from("erm_warning_flags")
      .update({ status: "ACKNOWLEDGED", acknowledged_by: user.id })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1-ON-1s
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/1on1s", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from("erm_one_on_ones")
      .select("*")
      .or(`manager_id.eq.${user.id},employee_id.eq.${user.id}`)
      .order("scheduled_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/1on1s", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { employee_id, scheduled_at, agenda = [] } = req.body;
    // org_id from auth middleware

    const { data, error } = await supabase.from("erm_one_on_ones").insert({
      org_id: (user as any).org_id ?? "00000000-0000-0000-0000-000000000000",
      manager_id: user.id,
      employee_id,
      scheduled_at: scheduled_at ?? null,
      agenda,
      status: "SCHEDULED",
    }).select().single();

    if (error) throw error;
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/1on1s/:id/complete", async (req: Request, res: Response) => {
  try {
    const { notes, action_items = [], employee_rating } = req.body;
    const { error } = await supabase.from("erm_one_on_ones").update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      notes: notes ?? null,
      action_items,
      employee_rating: employee_rating ?? null,
    }).eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: "Managers only" });
    const user = (req as any).user;
    const { week, year } = getISOWeek(new Date());

    const org_id = (user as any).org_id;
    if (!org_id) return res.json({ team_avg_score: 0, trend: "stable", response_rate: 0, warnings_count: 0, recent_feedback: [], score_distribution: { high: 0, medium: 0, low: 0 } });

    // Team avg score this week
    const { data: scores } = await supabase
      .from("erm_engagement_scores")
      .select("engagement_score, trend")
      .eq("org_id", org_id)
      .eq("period_week", week)
      .eq("period_year", year);

    const scoreValues = (scores ?? []).map(s => Number(s.engagement_score));
    const team_avg_score = scoreValues.length ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;

    const trends = (scores ?? []).map(s => s.trend);
    const trend = trends.filter(t => t === "IMPROVING").length > trends.filter(t => t === "DECLINING").length
      ? "improving" : trends.filter(t => t === "DECLINING").length > 0 ? "declining" : "stable";

    const score_distribution = {
      high: scoreValues.filter(s => s >= 70).length,
      medium: scoreValues.filter(s => s >= 40 && s < 70).length,
      low: scoreValues.filter(s => s < 40).length,
    };

    // Response rate this week
    const { count: totalMembers } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("org_id", org_id);
    const { count: respondedCount } = await supabase.from("erm_pulse_surveys").select("id", { count: "exact", head: true }).eq("org_id", org_id).eq("week_number", week).eq("year", year).not("responded_at", "is", null);
    const response_rate = totalMembers ? Math.round(((respondedCount ?? 0) / (totalMembers as number)) * 100) : 0;

    // Active warnings
    const { count: warnings_count } = await supabase.from("erm_warning_flags").select("id", { count: "exact", head: true }).eq("org_id", org_id).eq("status", "OPEN");

    // Recent feedback (last 5, anonymized)
    const { data: recent_feedback } = await supabase
      .from("erm_feedback")
      .select("id, feedback_type, category, message, sentiment, severity, status, created_at")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(5);

    res.json({
      team_avg_score,
      trend,
      response_rate,
      responded: respondedCount ?? 0,
      total_members: totalMembers ?? 0,
      warnings_count: warnings_count ?? 0,
      recent_feedback: recent_feedback ?? [],
      score_distribution,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION HOOKS (called by other modules)
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/people/signal — receive signals from other modules
router.post("/signal", async (req: Request, res: Response) => {
  try {
    const { user_id, signal_type, value, org_id } = req.body;
    // signal_type: 'goal_completed' | 'nc_assigned' | 'culture_event' | 'overdue_tasks'
    // For now just acknowledge — future: adjust activity_score in real-time
    console.log(`[PeopleOS] Signal received: ${signal_type} for user ${user_id}, value: ${value}`);
    res.json({ ok: true, received: signal_type });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
