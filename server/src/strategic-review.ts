import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataDomain =
  | "KPI"
  | "PIPELINE"
  | "FINANCIALS"
  | "NC"
  | "IMPROVEMENTS"
  | "CAPABILITIES"
  | "RISKS"
  | "COMPLIANCE"
  | "GOALS"
  | "PROCESSES"
  | "TEAM_STATUS";

export interface DomainSnapshot {
  data_domain: DataDomain;
  snapshot_data: Record<string, unknown>;
  trend_data: Record<string, unknown>;
  ai_insights: Record<string, unknown>;
  collected_at: string;
}

export interface ReviewDataSnapshots {
  orgId: string;
  periodFrom: string;
  periodTo: string;
  snapshots: DomainSnapshot[];
}

export interface AIRecommendation {
  category: string;
  priority: number;
  title: string;
  analysis: string;
  recommendation: string;
  supporting_data: Record<string, unknown>;
  estimated_impact: string;
  estimated_effort: string;
}

export interface AIAnalysisResult {
  executive_summary: string;
  key_findings: string[];
  recommendations: AIRecommendation[];
  risk_alerts: string[];
  positive_trends: string[];
  areas_of_concern: string[];
}

export interface GoalRecommendation {
  goal_id?: string;
  action: string;
  rationale: string;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface FollowupResult {
  review_id: string;
  previous_review_id: string;
  action_items_total: number;
  action_items_completed: number;
  action_items_overdue: number;
  action_items_in_progress: number;
  completion_rate: number;
  overdue_items: Array<Record<string, unknown>>;
  progress_summary: string;
}

// ---------------------------------------------------------------------------
// Anthropic client (lazy, only created if API key is available)
// ---------------------------------------------------------------------------

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[strategic-review] ANTHROPIC_API_KEY not set — AI analysis will be skipped"
    );
    return null;
  }
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// 1. collectReviewData
// ---------------------------------------------------------------------------

/**
 * Fetches ALL organisational data for the given period from Supabase,
 * organised by domain. Returns structured snapshots ready for AI analysis.
 */
export async function collectReviewData(
  orgId: string,
  periodFrom: string,
  periodTo: string
): Promise<ReviewDataSnapshots> {
  const now = new Date().toISOString();
  const snapshots: DomainSnapshot[] = [];

  // --- KPI ---
  const { data: kpis } = await supabase
    .from("kpis")
    .select("*")
    .eq("org_id", orgId);

  const kpiList = kpis ?? [];
  const improved = kpiList.filter(
    (k: any) => k.current_value != null && k.target_value != null && k.current_value >= k.target_value
  );
  const worsened = kpiList.filter(
    (k: any) => k.previous_value != null && k.current_value != null && k.current_value < k.previous_value
  );
  const stagnated = kpiList.filter(
    (k: any) => k.previous_value != null && k.current_value === k.previous_value
  );

  snapshots.push({
    data_domain: "KPI",
    snapshot_data: {
      total: kpiList.length,
      kpis: kpiList,
      improved: improved.length,
      worsened: worsened.length,
      stagnated: stagnated.length,
    },
    trend_data: {
      improved_ids: improved.map((k: any) => k.id),
      worsened_ids: worsened.map((k: any) => k.id),
    },
    ai_insights: {},
    collected_at: now,
  });

  // --- PIPELINE ---
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("org_id", orgId);

  const dealList = deals ?? [];
  const dealsByStatus: Record<string, number> = {};
  let totalValue = 0;
  let wonCount = 0;
  let lostCount = 0;

  for (const deal of dealList) {
    dealsByStatus[deal.status] = (dealsByStatus[deal.status] || 0) + 1;
    totalValue += deal.value ?? 0;
    if (deal.status === "WON") wonCount++;
    if (deal.status === "LOST") lostCount++;
  }

  const closedDeals = wonCount + lostCount;
  const winRate = closedDeals > 0 ? Math.round((wonCount / closedDeals) * 100) : 0;

  snapshots.push({
    data_domain: "PIPELINE",
    snapshot_data: {
      total_deals: dealList.length,
      deals_by_status: dealsByStatus,
      total_pipeline_value: totalValue,
      win_rate: winRate,
      won_count: wonCount,
      lost_count: lostCount,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- FINANCIALS ---
  const { data: transactions } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("org_id", orgId)
    .gte("posted_at", periodFrom)
    .lte("posted_at", periodTo);

  const txList = transactions ?? [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const tx of txList) {
    const amount = tx.amount ?? 0;
    if (tx.type === "REVENUE" || tx.type === "INCOME") totalRevenue += amount;
    if (tx.type === "EXPENSE" || tx.type === "COST") totalExpenses += amount;
  }

  snapshots.push({
    data_domain: "FINANCIALS",
    snapshot_data: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: totalRevenue - totalExpenses,
      transaction_count: txList.length,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- NC (Non-Conformances) ---
  const { data: ncs } = await supabase
    .from("non_conformances")
    .select("*")
    .eq("org_id", orgId);

  const ncList = ncs ?? [];
  const openNCs = ncList.filter((nc: any) => nc.status !== "CLOSED");
  const closedNCs = ncList.filter((nc: any) => nc.status === "CLOSED");
  const ncBySeverity: Record<string, number> = {};

  for (const nc of ncList) {
    const sev = nc.severity ?? "UNKNOWN";
    ncBySeverity[sev] = (ncBySeverity[sev] || 0) + 1;
  }

  snapshots.push({
    data_domain: "NC",
    snapshot_data: {
      total: ncList.length,
      open: openNCs.length,
      closed: closedNCs.length,
      by_severity: ncBySeverity,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- IMPROVEMENTS ---
  const { data: improvements } = await supabase
    .from("improvements")
    .select("*")
    .eq("org_id", orgId);

  const impList = improvements ?? [];
  const impByPhase: Record<string, number> = {};
  const completedImps = impList.filter((i: any) => i.status === "COMPLETED");
  const waitingLong = impList.filter((i: any) => {
    if (!i.created_at || i.status === "COMPLETED") return false;
    const daysSince = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30 && i.status !== "COMPLETED";
  });

  for (const imp of impList) {
    const phase = imp.status ?? "UNKNOWN";
    impByPhase[phase] = (impByPhase[phase] || 0) + 1;
  }

  snapshots.push({
    data_domain: "IMPROVEMENTS",
    snapshot_data: {
      total: impList.length,
      by_phase: impByPhase,
      completed: completedImps.length,
      waiting_over_30d: waitingLong.length,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- CAPABILITIES ---
  const { data: capabilities } = await supabase
    .from("capabilities")
    .select("*")
    .eq("org_id", orgId);

  const capList = capabilities ?? [];
  const gaps = capList.filter(
    (c: any) => c.target_level != null && c.current_level != null && c.target_level - c.current_level >= 2
  );

  snapshots.push({
    data_domain: "CAPABILITIES",
    snapshot_data: {
      total: capList.length,
      capabilities: capList.map((c: any) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        current_level: c.current_level,
        target_level: c.target_level,
        gap: (c.target_level ?? 0) - (c.current_level ?? 0),
      })),
      critical_gaps: gaps.length,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- RISKS ---
  const { data: risks } = await supabase
    .from("risks")
    .select("*")
    .eq("org_id", orgId)
    .order("score", { ascending: false })
    .limit(20);

  const riskList = risks ?? [];
  const unmitigated = riskList.filter((r: any) => !r.mitigation || r.mitigation_status === "NONE");
  const topRisks = riskList.slice(0, 5);

  snapshots.push({
    data_domain: "RISKS",
    snapshot_data: {
      total: riskList.length,
      top_5: topRisks,
      unmitigated: unmitigated.length,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- COMPLIANCE ---
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId);

  const docList = documents ?? [];
  const complianceByStandard: Record<string, { total: number; compliant: number }> = {};

  for (const doc of docList) {
    const std = doc.standard ?? "GENERAL";
    if (!complianceByStandard[std]) {
      complianceByStandard[std] = { total: 0, compliant: 0 };
    }
    complianceByStandard[std].total++;
    if (doc.status === "APPROVED" || doc.status === "CURRENT") {
      complianceByStandard[std].compliant++;
    }
  }

  const compliancePercent: Record<string, number> = {};
  for (const [std, counts] of Object.entries(complianceByStandard)) {
    compliancePercent[std] = counts.total > 0
      ? Math.round((counts.compliant / counts.total) * 100)
      : 0;
  }

  snapshots.push({
    data_domain: "COMPLIANCE",
    snapshot_data: {
      compliance_by_standard: compliancePercent,
      total_documents: docList.length,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- GOALS ---
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("org_id", orgId);

  const goalList = goals ?? [];
  const onTrack = goalList.filter((g: any) => g.readiness === "ON_TRACK" || g.status === "ON_TRACK");
  const atRisk = goalList.filter((g: any) => g.readiness === "AT_RISK" || g.status === "AT_RISK");

  snapshots.push({
    data_domain: "GOALS",
    snapshot_data: {
      total: goalList.length,
      goals: goalList,
      on_track: onTrack.length,
      at_risk: atRisk.length,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- PROCESSES ---
  const { data: processRuns } = await supabase
    .from("process_runs")
    .select("*")
    .eq("org_id", orgId)
    .gte("started_at", periodFrom)
    .lte("started_at", periodTo);

  const runList = processRuns ?? [];
  const runsByProcess: Record<string, number> = {};

  for (const run of runList) {
    const pid = run.process_id ?? "unknown";
    runsByProcess[pid] = (runsByProcess[pid] || 0) + 1;
  }

  snapshots.push({
    data_domain: "PROCESSES",
    snapshot_data: {
      total_runs: runList.length,
      runs_by_process: runsByProcess,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  // --- TEAM_STATUS ---
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("org_id", orgId);

  const taskList = tasks ?? [];
  const tasksByPerson: Record<string, { total: number; overdue: number }> = {};
  const today = new Date().toISOString().slice(0, 10);

  for (const task of taskList) {
    const owner = task.assigned_to ?? task.owner_id ?? "unassigned";
    if (!tasksByPerson[owner]) {
      tasksByPerson[owner] = { total: 0, overdue: 0 };
    }
    tasksByPerson[owner].total++;
    if (task.due_date && task.due_date < today && task.status !== "DONE") {
      tasksByPerson[owner].overdue++;
    }
  }

  const totalOverdue = Object.values(tasksByPerson).reduce((sum, p) => sum + p.overdue, 0);

  snapshots.push({
    data_domain: "TEAM_STATUS",
    snapshot_data: {
      tasks_per_person: tasksByPerson,
      total_tasks: taskList.length,
      total_overdue: totalOverdue,
    },
    trend_data: {},
    ai_insights: {},
    collected_at: now,
  });

  return { orgId, periodFrom, periodTo, snapshots };
}

// ---------------------------------------------------------------------------
// 2. generateAIAnalysis
// ---------------------------------------------------------------------------

/**
 * Calls Claude Sonnet API with all snapshot data to produce strategic
 * analysis and recommendations.
 */
export async function generateAIAnalysis(
  snapshots: ReviewDataSnapshots,
  previousAnalysis?: any
): Promise<AIAnalysisResult> {
  const client = getAnthropicClient();

  if (!client) {
    return {
      executive_summary: "AI-analys ej tillgänglig — ANTHROPIC_API_KEY saknas.",
      key_findings: [],
      recommendations: [],
      risk_alerts: [],
      positive_trends: [],
      areas_of_concern: [],
    };
  }

  const systemPrompt = `Du är Certified:s strategiska rådgivare. Analysera organisationsdata och ge rekommendationer. Var konkret. Varje rekommendation: varför (vilken data), vad (konkret åtgärd), förväntad effekt. Max 10 rekommendationer. JSON-format.

Svara ENBART med giltig JSON i detta format:
{
  "executive_summary": "string — sammanfattning av organisationens tillstånd",
  "key_findings": ["string — viktigaste insikter"],
  "recommendations": [
    {
      "category": "GOAL_SETTING|GOAL_ADJUSTMENT|RESOURCE_ALLOCATION|RISK_MITIGATION|CAPABILITY_INVESTMENT|PROCESS_IMPROVEMENT|COMPLIANCE_ACTION|FINANCIAL_ACTION|ORGANIZATIONAL_CHANGE",
      "priority": 1-5,
      "title": "string",
      "analysis": "string — varför, vilken data visar detta",
      "recommendation": "string — konkret åtgärd",
      "supporting_data": {},
      "estimated_impact": "string",
      "estimated_effort": "string"
    }
  ],
  "risk_alerts": ["string — akuta risker"],
  "positive_trends": ["string — positiva trender"],
  "areas_of_concern": ["string — oroande områden"]
}`;

  const userMessage = JSON.stringify({
    period: { from: snapshots.periodFrom, to: snapshots.periodTo },
    data: snapshots.snapshots.map((s) => ({
      domain: s.data_domain,
      data: s.snapshot_data,
      trends: s.trend_data,
    })),
    previous_analysis: previousAnalysis ?? null,
  });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    const parsed = JSON.parse(textBlock.text) as AIAnalysisResult;
    return parsed;
  } catch (err: any) {
    console.error("[strategic-review] AI analysis failed:", err.message);
    return {
      executive_summary: `AI-analys misslyckades: ${err.message}`,
      key_findings: [],
      recommendations: [],
      risk_alerts: [],
      positive_trends: [],
      areas_of_concern: [],
    };
  }
}

// ---------------------------------------------------------------------------
// 3. generateGoalRecommendations
// ---------------------------------------------------------------------------

/**
 * Separate AI call focused on goal-setting analysis.
 * Evaluates current goals against performance data and recommends
 * adjustments, new goals, or closures.
 */
export async function generateGoalRecommendations(
  snapshots: ReviewDataSnapshots,
  currentGoals: any[]
): Promise<GoalRecommendation[]> {
  const client = getAnthropicClient();

  if (!client) {
    console.warn("[strategic-review] Skipping goal recommendations — no API key");
    return [];
  }

  const systemPrompt = `Du är Certified:s målsättningsrådgivare. Analysera organisationens mål mot prestandadata.
För varje mål, rekommendera en åtgärd. Svara ENBART med giltig JSON som en array:
[
  {
    "goal_id": "string|null — befintligt mål-ID eller null för nya mål",
    "action": "CREATE|ADJUST_TARGET|ADJUST_TIMELINE|CLOSE_ACHIEVED|CLOSE_MISSED|DEPRIORITIZE|ESCALATE",
    "rationale": "string — motivering baserad på data",
    "previous_value": {},
    "new_value": {}
  }
]`;

  const userMessage = JSON.stringify({
    current_goals: currentGoals,
    performance_data: snapshots.snapshots.map((s) => ({
      domain: s.data_domain,
      data: s.snapshot_data,
    })),
  });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    return JSON.parse(textBlock.text) as GoalRecommendation[];
  } catch (err: any) {
    console.error("[strategic-review] Goal recommendations failed:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 4. generateFollowupAnalysis
// ---------------------------------------------------------------------------

/**
 * For MONTHLY_FOLLOWUP reviews: fetches the previous review's action items
 * and analyses progress.
 */
export async function generateFollowupAnalysis(
  reviewId: string
): Promise<FollowupResult> {
  // Get the current review to find the org
  const { data: review, error: reviewError } = await supabase
    .from("strategic_reviews")
    .select("*")
    .eq("id", reviewId)
    .single();

  if (reviewError || !review) {
    throw new Error(`Review not found: ${reviewId}`);
  }

  // Find the most recent previous review (not this one)
  const { data: previousReviews } = await supabase
    .from("strategic_reviews")
    .select("id")
    .eq("org_id", review.org_id)
    .neq("id", reviewId)
    .order("completed_at", { ascending: false })
    .limit(1);

  const previousReviewId = previousReviews?.[0]?.id;

  if (!previousReviewId) {
    return {
      review_id: reviewId,
      previous_review_id: "",
      action_items_total: 0,
      action_items_completed: 0,
      action_items_overdue: 0,
      action_items_in_progress: 0,
      completion_rate: 0,
      overdue_items: [],
      progress_summary: "Ingen tidigare review hittades att följa upp.",
    };
  }

  // Fetch action items from previous review
  const { data: actionItems } = await supabase
    .from("review_action_items")
    .select("*")
    .eq("review_id", previousReviewId);

  const items = actionItems ?? [];
  const completed = items.filter((i: any) => i.status === "COMPLETED");
  const overdue = items.filter((i: any) => i.status === "OVERDUE");
  const inProgress = items.filter((i: any) => i.status === "IN_PROGRESS");
  const pending = items.filter((i: any) => i.status === "PENDING");

  // Check for newly overdue items
  const today = new Date().toISOString().slice(0, 10);
  for (const item of pending.concat(inProgress)) {
    if (item.deadline && item.deadline < today && item.status !== "OVERDUE") {
      await supabase
        .from("review_action_items")
        .update({ status: "OVERDUE", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      overdue.push(item);
    }
  }

  const total = items.length;
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  return {
    review_id: reviewId,
    previous_review_id: previousReviewId,
    action_items_total: total,
    action_items_completed: completed.length,
    action_items_overdue: overdue.length,
    action_items_in_progress: inProgress.length,
    completion_rate: completionRate,
    overdue_items: overdue,
    progress_summary:
      `Uppföljning: ${completed.length}/${total} åtgärder genomförda (${completionRate}%). ` +
      `${overdue.length} försenade. ${inProgress.length} pågående.`,
  };
}
