import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string;
  org_id: string;
  role: string;
}

type Industry = "Healthcare" | "Government" | "Logistics" | "Finance" | "Education";
type OpportunityStatus = "detected" | "validated" | "building" | "invested" | "integrated";
type OpportunitySource = "internal" | "research" | "market";
type VentureStatus = "ideation" | "building" | "live" | "integrated";
type InvestmentStatus = "active" | "exited" | "written_off";

interface Opportunity {
  id: string;
  title: string;
  industry: Industry;
  description: string;
  inefficiency_description: string;
  impact_score: number;
  complexity_score: number;
  cost_saving_potential: number;
  status: OpportunityStatus;
  detected_at: string;
  validated_at: string | null;
  source: OpportunitySource;
  org_id: string;
}

interface Venture {
  id: string;
  opportunity_id: string;
  name: string;
  problem_definition: string;
  system_design: string;
  revenue_model: string;
  integration_plan: string;
  status: VentureStatus;
  created_at: string;
  burn_rate: number;
  roi_actual: number;
  roi_projected: number;
  integration_level: number;
  org_id: string;
}

interface Investment {
  id: string;
  venture_id: string;
  amount: number;
  allocated_at: string;
  roi_current: number;
  burn_rate: number;
  efficiency_gain_pct: number;
  status: InvestmentStatus;
  org_id: string;
}

interface SystemImpact {
  id: string;
  venture_id: string;
  metric_name: string;
  baseline_value: number;
  current_value: number;
  unit: string;
  measured_at: string;
  friction_reduction_pct: number;
  org_id: string;
}

// ---------------------------------------------------------------------------
// In-memory seed data (used when Supabase tables are not yet created)
// ---------------------------------------------------------------------------

const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-001",
    title: "Hospital Appointment Scheduling",
    industry: "Healthcare",
    description: "Patients spend an average of 47 minutes booking, rescheduling, or cancelling appointments across fragmented systems.",
    inefficiency_description: "No-show rate 23% due to manual reminder systems. Admin staff spend 6h/day on phone confirmations.",
    impact_score: 9,
    complexity_score: 6,
    cost_saving_potential: 4200000,
    status: "building",
    detected_at: "2025-10-14T08:00:00Z",
    validated_at: "2025-11-02T14:00:00Z",
    source: "research",
    org_id: "seed",
  },
  {
    id: "opp-002",
    title: "Public Permit Processing",
    industry: "Government",
    description: "Building permits take 90–180 days due to paper-based workflows between 4+ municipal departments.",
    inefficiency_description: "Documents re-entered manually at each department handoff. 34% of applications rejected for avoidable form errors.",
    impact_score: 8,
    complexity_score: 8,
    cost_saving_potential: 7800000,
    status: "validated",
    detected_at: "2025-09-01T08:00:00Z",
    validated_at: "2025-10-20T10:00:00Z",
    source: "market",
    org_id: "seed",
  },
  {
    id: "opp-003",
    title: "Last-Mile Delivery Coordination",
    industry: "Logistics",
    description: "Delivery windows communicated via phone calls. Failed delivery rate 18% costing carriers €8 per failed attempt.",
    inefficiency_description: "No real-time status sharing between carrier and recipient. Redelivery scheduling requires human agent.",
    impact_score: 7,
    complexity_score: 5,
    cost_saving_potential: 3100000,
    status: "invested",
    detected_at: "2025-08-15T08:00:00Z",
    validated_at: "2025-09-10T09:00:00Z",
    source: "internal",
    org_id: "seed",
  },
  {
    id: "opp-004",
    title: "SME Invoice Reconciliation",
    industry: "Finance",
    description: "Small businesses spend 11 hours/month manually matching bank statements to invoices across 3–5 platforms.",
    inefficiency_description: "No unified API layer. Accountants copy-paste between Fortnox, bank exports, and customer invoices.",
    impact_score: 8,
    complexity_score: 4,
    cost_saving_potential: 2600000,
    status: "integrated",
    detected_at: "2025-07-01T08:00:00Z",
    validated_at: "2025-07-28T11:00:00Z",
    source: "internal",
    org_id: "seed",
  },
  {
    id: "opp-005",
    title: "University Course Registration",
    industry: "Education",
    description: "Students spend 3+ hours during drop/add period refreshing pages waiting for course seats to open.",
    inefficiency_description: "No queue or waitlist system. Seats released randomly. Administrative staff manually process exceptions.",
    impact_score: 6,
    complexity_score: 3,
    cost_saving_potential: 950000,
    status: "detected",
    detected_at: "2025-12-01T08:00:00Z",
    validated_at: null,
    source: "research",
    org_id: "seed",
  },
];

const SEED_VENTURES: Venture[] = [
  {
    id: "ven-001",
    opportunity_id: "opp-001",
    name: "ClearSlot Health",
    problem_definition: "Healthcare appointment friction costs the Swedish health system 4.2B SEK/year in no-shows and admin overhead.",
    system_design: "AI-powered scheduling engine with EHR integration, SMS/WhatsApp reminders, and real-time slot trading between patients.",
    revenue_model: "SaaS per clinic (€890/mo) + 0.5% of recovered no-show value. Target: 400 clinics by Y3.",
    integration_plan: "Phase 1: Cambio COSMIC EHR integration. Phase 2: Region Stockholm pilot. Phase 3: National rollout via SKR framework.",
    status: "building",
    created_at: "2025-11-10T10:00:00Z",
    burn_rate: 48000,
    roi_actual: 0,
    roi_projected: 3.8,
    integration_level: 35,
    org_id: "seed",
  },
  {
    id: "ven-002",
    opportunity_id: "opp-004",
    name: "Wavult Finance Bridge",
    problem_definition: "11h/month wasted per SME on invoice reconciliation. Sweden has 1.2M SMEs — 8.7M collective wasted hours/month.",
    system_design: "Unified ledger API connecting Fortnox, Bokio, Visma, and 12 Swedish banks via Open Banking. ML matching engine with 98.4% accuracy.",
    revenue_model: "€49/mo per company + implementation fee for enterprise (€4,900). Embedded in Wavult Finance module.",
    integration_plan: "Already integrated into Wavult OS Finance Hub. Phase 2: Fortnox Marketplace listing. Phase 3: White-label for Swedbank SME customers.",
    status: "live",
    created_at: "2025-08-05T10:00:00Z",
    burn_rate: 12000,
    roi_actual: 2.1,
    roi_projected: 4.2,
    integration_level: 82,
    org_id: "seed",
  },
];

const SEED_INVESTMENTS: Investment[] = [
  {
    id: "inv-001",
    venture_id: "ven-001",
    amount: 380000,
    allocated_at: "2025-11-15T10:00:00Z",
    roi_current: 0,
    burn_rate: 48000,
    efficiency_gain_pct: 0,
    status: "active",
    org_id: "seed",
  },
  {
    id: "inv-002",
    venture_id: "ven-002",
    amount: 95000,
    allocated_at: "2025-08-10T10:00:00Z",
    roi_current: 2.1,
    burn_rate: 12000,
    efficiency_gain_pct: 78.4,
    status: "active",
    org_id: "seed",
  },
];

const SEED_IMPACT: SystemImpact[] = [
  {
    id: "imp-001",
    venture_id: "ven-002",
    metric_name: "Invoice reconciliation time",
    baseline_value: 11,
    current_value: 0.4,
    unit: "hours/month",
    measured_at: "2026-01-15T10:00:00Z",
    friction_reduction_pct: 96.4,
    org_id: "seed",
  },
  {
    id: "imp-002",
    venture_id: "ven-002",
    metric_name: "Manual data entry errors",
    baseline_value: 43,
    current_value: 1,
    unit: "errors/month",
    measured_at: "2026-01-15T10:00:00Z",
    friction_reduction_pct: 97.7,
    org_id: "seed",
  },
  {
    id: "imp-003",
    venture_id: "ven-001",
    metric_name: "Appointment no-show rate",
    baseline_value: 23,
    current_value: 14,
    unit: "percent",
    measured_at: "2026-02-01T10:00:00Z",
    friction_reduction_pct: 39.1,
    org_id: "seed",
  },
];

// ---------------------------------------------------------------------------
// Event log (in-memory ring buffer, last 50 events)
// ---------------------------------------------------------------------------

interface VentureEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  emitted_at: string;
}

const eventLog: VentureEvent[] = [
  { id: "evt-001", type: "opportunity.detected",  payload: { opportunity_id: "opp-005", title: "University Course Registration" }, emitted_at: "2025-12-01T08:10:00Z" },
  { id: "evt-002", type: "opportunity.validated",  payload: { opportunity_id: "opp-002", title: "Public Permit Processing" },     emitted_at: "2025-10-20T10:05:00Z" },
  { id: "evt-003", type: "venture.created",        payload: { venture_id: "ven-001", name: "ClearSlot Health" },                emitted_at: "2025-11-10T10:02:00Z" },
  { id: "evt-004", type: "capital.allocated",      payload: { venture_id: "ven-001", amount: 380000 },                         emitted_at: "2025-11-15T10:01:00Z" },
  { id: "evt-005", type: "capital.allocated",      payload: { venture_id: "ven-002", amount: 95000 },                          emitted_at: "2025-08-10T10:01:00Z" },
  { id: "evt-006", type: "system.integrated",      payload: { venture_id: "ven-002", integration_level: 82 },                  emitted_at: "2026-01-10T14:00:00Z" },
  { id: "evt-007", type: "efficiency.gained",      payload: { venture_id: "ven-002", metric: "reconciliation time", reduction_pct: 96.4 }, emitted_at: "2026-01-15T10:05:00Z" },
];

let eventCounter = eventLog.length;

function emitEvent(type: string, payload: Record<string, unknown>): VentureEvent {
  eventCounter += 1;
  const evt: VentureEvent = {
    id: `evt-${String(eventCounter).padStart(3, "0")}`,
    type,
    payload,
    emitted_at: new Date().toISOString(),
  };
  eventLog.unshift(evt);
  if (eventLog.length > 50) eventLog.pop();
  console.log(`[venture-engine] ${evt.type}`, evt.payload);
  return evt;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

function getUser(req: Request, res: Response): AuthUser | null {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.user;
}

async function audit(
  userId: string,
  orgId: string,
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, unknown> = {}
) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      org_id: orgId,
      action,
      entity,
      entity_id: entityId,
      meta,
      created_at: new Date().toISOString(),
    });
  } catch {
    // fire-and-forget — never break the response
  }
}

// ---------------------------------------------------------------------------
// Helper: read from Supabase or fall back to seed data
// ---------------------------------------------------------------------------

async function getOpportunities(orgId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("venture_opportunities")
    .select("*")
    .eq("org_id", orgId)
    .order("impact_score", { ascending: false });
  if (error || !data || data.length === 0) return SEED_OPPORTUNITIES;
  return data as Opportunity[];
}

async function getVentures(orgId: string): Promise<Venture[]> {
  const { data, error } = await supabase
    .from("venture_ventures")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return SEED_VENTURES;
  return data as Venture[];
}

async function getCapital(orgId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from("venture_investments")
    .select("*")
    .eq("org_id", orgId)
    .order("allocated_at", { ascending: false });
  if (error || !data || data.length === 0) return SEED_INVESTMENTS;
  return data as Investment[];
}

async function getImpact(orgId: string): Promise<SystemImpact[]> {
  const { data, error } = await supabase
    .from("venture_system_impact")
    .select("*")
    .eq("org_id", orgId)
    .order("measured_at", { ascending: false });
  if (error || !data || data.length === 0) return SEED_IMPACT;
  return data as SystemImpact[];
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

// GET /venture-engine/opportunities
router.get("/venture-engine/opportunities", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const opportunities = await getOpportunities(user.org_id);

    // Optional filters
    const { industry, status } = req.query;
    let filtered = opportunities;
    if (typeof industry === "string") filtered = filtered.filter(o => o.industry === industry);
    if (typeof status === "string") filtered = filtered.filter(o => o.status === status);

    return res.json(filtered);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// POST /venture-engine/opportunities
router.post("/venture-engine/opportunities", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const {
      title, industry, description, inefficiency_description,
      impact_score, complexity_score, cost_saving_potential, source,
    } = req.body as Partial<Opportunity>;

    const VALID_INDUSTRIES: Industry[] = ["Healthcare", "Government", "Logistics", "Finance", "Education"];
    const VALID_SOURCES: OpportunitySource[] = ["internal", "research", "market"];

    if (!title || !industry || !description || !inefficiency_description) {
      return res.status(400).json({ error: "title, industry, description, and inefficiency_description are required" });
    }
    if (!VALID_INDUSTRIES.includes(industry)) {
      return res.status(400).json({ error: `industry must be one of: ${VALID_INDUSTRIES.join(", ")}` });
    }
    if (source && !VALID_SOURCES.includes(source)) {
      return res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(", ")}` });
    }
    if (typeof impact_score === "number" && (impact_score < 1 || impact_score > 10)) {
      return res.status(400).json({ error: "impact_score must be 1–10" });
    }
    if (typeof complexity_score === "number" && (complexity_score < 1 || complexity_score > 10)) {
      return res.status(400).json({ error: "complexity_score must be 1–10" });
    }

    const payload = {
      title,
      industry,
      description,
      inefficiency_description,
      impact_score: impact_score ?? 5,
      complexity_score: complexity_score ?? 5,
      cost_saving_potential: cost_saving_potential ?? 0,
      source: source ?? "internal",
      status: "detected" as OpportunityStatus,
      detected_at: new Date().toISOString(),
      validated_at: null,
      org_id: user.org_id,
    };

    const { data, error } = await supabase
      .from("venture_opportunities")
      .insert(payload)
      .select()
      .single();

    const record = (error || !data) ? { ...payload, id: `opp-${Date.now()}` } : data as Opportunity;

    emitEvent("opportunity.detected", { opportunity_id: record.id, title: record.title, industry: record.industry });
    await audit(user.id, user.org_id, "create", "venture_opportunities", record.id, { title });

    return res.status(201).json(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// PUT /venture-engine/opportunities/:id/validate
router.put("/venture-engine/opportunities/:id/validate", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const validated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("venture_opportunities")
      .update({ status: "validated", validated_at })
      .eq("id", id)
      .eq("org_id", user.org_id)
      .select()
      .single();

    // Fallback: find in seed data
    const seedOpp = SEED_OPPORTUNITIES.find(o => o.id === id);
    if (error || !data) {
      if (!seedOpp) return res.status(404).json({ error: "Opportunity not found" });
      seedOpp.status = "validated";
      seedOpp.validated_at = validated_at;
      emitEvent("opportunity.validated", { opportunity_id: id, title: seedOpp.title });
      return res.json(seedOpp);
    }

    emitEvent("opportunity.validated", { opportunity_id: id, title: (data as Opportunity).title });
    await audit(user.id, user.org_id, "validate", "venture_opportunities", id);

    return res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// Ventures
// ---------------------------------------------------------------------------

// GET /venture-engine/ventures
router.get("/venture-engine/ventures", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const ventures = await getVentures(user.org_id);
    return res.json(ventures);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// POST /venture-engine/ventures
router.post("/venture-engine/ventures", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const {
      opportunity_id, name, problem_definition, system_design,
      revenue_model, integration_plan, burn_rate, roi_projected,
    } = req.body as Partial<Venture>;

    if (!opportunity_id || !name || !problem_definition || !system_design) {
      return res.status(400).json({
        error: "opportunity_id, name, problem_definition, and system_design are required",
      });
    }

    const payload = {
      opportunity_id,
      name,
      problem_definition,
      system_design,
      revenue_model: revenue_model ?? "",
      integration_plan: integration_plan ?? "",
      status: "ideation" as VentureStatus,
      created_at: new Date().toISOString(),
      burn_rate: burn_rate ?? 0,
      roi_actual: 0,
      roi_projected: roi_projected ?? 0,
      integration_level: 0,
      org_id: user.org_id,
    };

    const { data, error } = await supabase
      .from("venture_ventures")
      .insert(payload)
      .select()
      .single();

    const record = (error || !data) ? { ...payload, id: `ven-${Date.now()}` } : data as Venture;

    // Mark opportunity as "building"
    await supabase
      .from("venture_opportunities")
      .update({ status: "building" })
      .eq("id", opportunity_id)
      .eq("org_id", user.org_id);

    emitEvent("venture.created", { venture_id: record.id, name: record.name, opportunity_id });
    await audit(user.id, user.org_id, "create", "venture_ventures", record.id, { name });

    return res.status(201).json(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// Capital
// ---------------------------------------------------------------------------

// GET /venture-engine/capital
router.get("/venture-engine/capital", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const investments = await getCapital(user.org_id);
    return res.json(investments);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// POST /venture-engine/capital/allocate
router.post("/venture-engine/capital/allocate", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const { venture_id, amount, burn_rate, efficiency_gain_pct } = req.body as Partial<Investment>;

    if (!venture_id || !amount || amount <= 0) {
      return res.status(400).json({ error: "venture_id and positive amount are required" });
    }

    const payload = {
      venture_id,
      amount,
      allocated_at: new Date().toISOString(),
      roi_current: 0,
      burn_rate: burn_rate ?? 0,
      efficiency_gain_pct: efficiency_gain_pct ?? 0,
      status: "active" as InvestmentStatus,
      org_id: user.org_id,
    };

    const { data, error } = await supabase
      .from("venture_investments")
      .insert(payload)
      .select()
      .single();

    const record = (error || !data) ? { ...payload, id: `inv-${Date.now()}` } : data as Investment;

    emitEvent("capital.allocated", { investment_id: record.id, venture_id, amount });
    await audit(user.id, user.org_id, "allocate", "venture_investments", record.id, { venture_id, amount });

    return res.status(201).json(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// Impact
// ---------------------------------------------------------------------------

// GET /venture-engine/impact
router.get("/venture-engine/impact", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const impact = await getImpact(user.org_id);
    return res.json(impact);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

// GET /venture-engine/stats
router.get("/venture-engine/stats", async (req: Request, res: Response) => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const [opportunities, ventures, investments, impact] = await Promise.all([
      getOpportunities(user.org_id),
      getVentures(user.org_id),
      getCapital(user.org_id),
      getImpact(user.org_id),
    ]);

    const totalDeployed = investments
      .filter(i => i.status === "active")
      .reduce((sum, i) => sum + i.amount, 0);

    const avgFrictionReduction =
      impact.length > 0
        ? impact.reduce((sum, i) => sum + i.friction_reduction_pct, 0) / impact.length
        : 0;

    const totalCostSavingPotential = opportunities.reduce(
      (sum, o) => sum + o.cost_saving_potential,
      0
    );

    const avgROI =
      investments.filter(i => i.roi_current > 0).length > 0
        ? investments.filter(i => i.roi_current > 0).reduce((sum, i) => sum + i.roi_current, 0) /
          investments.filter(i => i.roi_current > 0).length
        : 0;

    const recentEvents = eventLog.slice(0, 10);

    return res.json({
      opportunities: {
        total: opportunities.length,
        by_status: {
          detected: opportunities.filter(o => o.status === "detected").length,
          validated: opportunities.filter(o => o.status === "validated").length,
          building: opportunities.filter(o => o.status === "building").length,
          invested: opportunities.filter(o => o.status === "invested").length,
          integrated: opportunities.filter(o => o.status === "integrated").length,
        },
      },
      ventures: {
        total: ventures.length,
        by_status: {
          ideation: ventures.filter(v => v.status === "ideation").length,
          building: ventures.filter(v => v.status === "building").length,
          live: ventures.filter(v => v.status === "live").length,
          integrated: ventures.filter(v => v.status === "integrated").length,
        },
        avg_integration_level:
          ventures.length > 0
            ? ventures.reduce((sum, v) => sum + v.integration_level, 0) / ventures.length
            : 0,
      },
      capital: {
        total_deployed: totalDeployed,
        active_investments: investments.filter(i => i.status === "active").length,
        avg_roi: avgROI,
        avg_efficiency_gain: investments.length > 0
          ? investments.reduce((sum, i) => sum + i.efficiency_gain_pct, 0) / investments.length
          : 0,
      },
      impact: {
        total_metrics: impact.length,
        avg_friction_reduction: avgFrictionReduction,
        total_cost_saving_potential: totalCostSavingPotential,
      },
      recent_events: recentEvents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
});

export default router;
