// ─── Venture Engine — shared types ───────────────────────────────────────────

export type Industry = "Healthcare" | "Government" | "Logistics" | "Finance" | "Education";
export type OpportunityStatus = "detected" | "validated" | "building" | "invested" | "integrated";
export type OpportunitySource = "internal" | "research" | "market";
export type VentureStatus = "ideation" | "building" | "live" | "integrated";
export type InvestmentStatus = "active" | "exited" | "written_off";

export interface Opportunity {
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
}

export interface Venture {
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
}

export interface Investment {
  id: string;
  venture_id: string;
  amount: number;
  allocated_at: string;
  roi_current: number;
  burn_rate: number;
  efficiency_gain_pct: number;
  status: InvestmentStatus;
}

export interface SystemImpact {
  id: string;
  venture_id: string;
  metric_name: string;
  baseline_value: number;
  current_value: number;
  unit: string;
  measured_at: string;
  friction_reduction_pct: number;
}

export interface VentureEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  emitted_at: string;
}

export interface VentureStats {
  opportunities: {
    total: number;
    by_status: Record<OpportunityStatus, number>;
  };
  ventures: {
    total: number;
    by_status: Record<VentureStatus, number>;
    avg_integration_level: number;
  };
  capital: {
    total_deployed: number;
    active_investments: number;
    avg_roi: number;
    avg_efficiency_gain: number;
  };
  impact: {
    total_metrics: number;
    avg_friction_reduction: number;
    total_cost_saving_potential: number;
  };
  recent_events: VentureEvent[];
}
