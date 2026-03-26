/**
 * PIX Intelligence View
 * Pixdrift's answer to Microsoft Power BI + Palantir AIP
 *
 * 6 pre-built operational intelligence panels — zero configuration required.
 * Works on Day 1. No data scientists. No setup.
 */

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "./useApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TechnicianLoad {
  technician_id: string;
  name: string;
  load_pct: number;
  assigned_hours: number;
  available_hours: number;
  job_count: number;
  jobs: Array<{ order_number: string; type: string; vehicle: string; estimated_hours: number; status: string }>;
  recommendation: string;
  alert_level: "critical" | "warning" | "opportunity" | "ok";
}

interface AtRiskPart {
  part_number: string;
  description: string;
  make: string;
  stock_left: number;
  reorder_point: number;
  days_until_stockout: number;
  urgency: "critical" | "high" | "medium";
  action: string;
  needed_by_orders: Array<{ order_number: string; vehicle: string }>;
}

interface DelayPattern {
  delay_rate_pct: number;
  total_jobs: number;
  delayed_jobs: number;
  avg_overrun_hours: number;
  insight: string;
  top_delay_reasons: Array<{ reason: string; count: number; pct_of_delays: number }>;
  worst_job_types: Array<{ type: string; delay_rate: number; total: number }>;
}

interface ChurnCustomer {
  name: string;
  lifetime_value: number;
  days_since_visit: number;
  churn_risk: "lost" | "high" | "medium";
  action: string;
}

interface RevenueForecast {
  confirmed_revenue: number;
  projected_revenue: number;
  total_forecast: number;
  open_orders: number;
  week_start: string;
  insight: string;
  revenue_by_job_type: Array<{ type: string; avg_revenue: number; margin_estimate: number }>;
}

interface SlaAtRisk {
  order_number: string;
  vehicle: string;
  type: string;
  technician: string;
  minutes_remaining: number;
  is_overdue: boolean;
  action: string;
}

// ─── Helper Components ────────────────────────────────────────────────────────

const AlertBadge: React.FC<{ level: string; text?: string }> = ({ level, text }) => {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border border-red-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    opportunity: "bg-green-100 text-green-800 border border-green-200",
    high: "bg-red-100 text-red-800 border border-red-200",
    medium: "bg-amber-100 text-amber-800 border border-amber-200",
    ok: "bg-gray-100 text-gray-600 border border-gray-200",
    lost: "bg-red-100 text-red-800 border border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[level] ?? colors.ok}`}>
      {text ?? level.toUpperCase()}
    </span>
  );
};

const LoadBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct > 100 ? "bg-red-500" : pct > 85 ? "bg-amber-500" : pct < 40 ? "bg-green-400" : "bg-blue-500";
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({
  label, value, sub, color = "text-gray-900",
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
    <div className="text-xs text-gray-500 font-medium">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {sub && <div className="text-xs text-gray-400">{sub}</div>}
  </div>
);

const PanelHeader: React.FC<{ icon: string; title: string; subtitle: string; badge?: React.ReactNode }> = ({
  icon, title, subtitle, badge,
}) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
    {badge}
  </div>
);

// ─── Panel 1: Technician Performance Matrix ────────────────────────────────────

const TechnicianPanel: React.FC<{ data: TechnicianLoad[]; loading: boolean }> = ({ data, loading }) => {
  const critical = data.filter((t) => t.alert_level === "critical").length;
  const warning = data.filter((t) => t.alert_level === "warning").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <PanelHeader
        icon="👷"
        title="Technician Load — Today"
        subtitle="Capacity vs assigned hours"
        badge={
          critical + warning > 0 ? (
            <AlertBadge level="warning" text={`${critical + warning} alerts`} />
          ) : (
            <AlertBadge level="ok" text="All OK" />
          )
        }
      />

      {loading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center">No technicians found</div>
      ) : (
        <div className="space-y-3">
          {data.map((tech) => (
            <div key={tech.technician_id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm text-gray-900">{tech.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{tech.load_pct}%</span>
                  <AlertBadge level={tech.alert_level} />
                </div>
              </div>
              <LoadBar pct={tech.load_pct} />
              <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                <span>{tech.assigned_hours}h assigned / {tech.available_hours}h available</span>
                <span>{tech.job_count} jobs</span>
              </div>
              {tech.alert_level !== "ok" && (
                <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                  {tech.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Panel 2: Parts Intelligence ──────────────────────────────────────────────

const PartsPanel: React.FC<{ data: AtRiskPart[]; loading: boolean }> = ({ data, loading }) => {
  const critical = data.filter((p) => p.urgency === "critical").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <PanelHeader
        icon="🔩"
        title="Parts Intelligence"
        subtitle="Stock risk + reorder triggers"
        badge={
          critical > 0 ? (
            <AlertBadge level="critical" text={`${critical} critical`} />
          ) : data.length > 0 ? (
            <AlertBadge level="warning" text={`${data.length} at risk`} />
          ) : (
            <AlertBadge level="ok" text="Stock OK" />
          )
        }
      />

      {loading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center">✅ All parts above reorder points</div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 8).map((part) => (
            <div key={part.part_number} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-900">{part.description}</div>
                  <div className="text-xs text-gray-400">{part.part_number} · {part.make}</div>
                </div>
                <AlertBadge level={part.urgency} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>In stock: <strong className={part.stock_left === 0 ? "text-red-600" : "text-gray-900"}>{part.stock_left}</strong></span>
                <span>Reorder at: {part.reorder_point}</span>
                {part.days_until_stockout !== undefined && (
                  <span>Stockout in: <strong>{part.days_until_stockout}d</strong></span>
                )}
              </div>
              <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded p-1.5">{part.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Panel 3: Delay Pattern Analysis ──────────────────────────────────────────

const DelayPanel: React.FC<{ data: DelayPattern | null; loading: boolean }> = ({ data, loading }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <PanelHeader
      icon="⏱️"
      title="Delay Pattern Analysis"
      subtitle="Last 30 days — what's causing delays?"
      badge={
        data && data.delay_rate_pct > 20 ? (
          <AlertBadge level="warning" text={`${data.delay_rate_pct}% delay rate`} />
        ) : data ? (
          <AlertBadge level="ok" text={`${data.delay_rate_pct}% delay rate`} />
        ) : undefined
      }
    />

    {loading ? (
      <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
    ) : !data ? (
      <div className="text-sm text-gray-400 py-4 text-center">No data available</div>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="Total Jobs" value={data.total_jobs} />
          <StatCard label="Delayed" value={data.delayed_jobs} color={data.delay_rate_pct > 20 ? "text-amber-600" : "text-gray-900"} />
          <StatCard label="Avg Overrun" value={`${data.avg_overrun_hours}h`} sub="per delayed job" />
        </div>

        {data.insight && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3 text-xs text-amber-800">
            💡 {data.insight}
          </div>
        )}

        {data.top_delay_reasons && data.top_delay_reasons.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">TOP DELAY CAUSES</div>
            <div className="space-y-1.5">
              {data.top_delay_reasons.map((reason) => (
                <div key={reason.reason} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">{reason.reason.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: `${reason.pct_of_delays}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{reason.pct_of_delays}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

// ─── Panel 4: Customer Churn Signals ──────────────────────────────────────────

const ChurnPanel: React.FC<{ data: ChurnCustomer[]; loading: boolean }> = ({ data, loading }) => {
  const lost = data.filter((c) => c.churn_risk === "lost").length;
  const high = data.filter((c) => c.churn_risk === "high").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <PanelHeader
        icon="📉"
        title="Customer Churn Signals"
        subtitle="Who hasn't returned + at-risk customers"
        badge={
          lost + high > 0 ? (
            <AlertBadge level="critical" text={`${lost + high} at risk`} />
          ) : (
            <AlertBadge level="ok" text="Retention OK" />
          )
        }
      />

      {loading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center">✅ No churn risk detected</div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 8).map((customer, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                  <div className="text-xs text-gray-400">
                    Last visit: {customer.days_since_visit}d ago ·
                    LTV: €{customer.lifetime_value?.toLocaleString() ?? "?"}
                  </div>
                </div>
                <AlertBadge level={customer.churn_risk} />
              </div>
              <div className="mt-2 text-xs text-gray-600">{customer.action}</div>
            </div>
          ))}
          {data.length > 8 && (
            <div className="text-xs text-center text-gray-400 py-1">
              + {data.length - 8} more customers at risk
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Panel 5: Revenue Intelligence ────────────────────────────────────────────

const RevenuePanel: React.FC<{ data: RevenueForecast | null; loading: boolean }> = ({ data, loading }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <PanelHeader
      icon="💰"
      title="Revenue Intelligence"
      subtitle="This week — confirmed + projected"
    />

    {loading ? (
      <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
    ) : !data ? (
      <div className="text-sm text-gray-400 py-4 text-center">No revenue data</div>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard
            label="Confirmed"
            value={`€${data.confirmed_revenue?.toLocaleString() ?? 0}`}
            sub="invoiced this week"
            color="text-green-700"
          />
          <StatCard
            label="Projected"
            value={`€${data.projected_revenue?.toLocaleString() ?? 0}`}
            sub="open orders"
            color="text-blue-700"
          />
          <StatCard
            label="Total Forecast"
            value={`€${data.total_forecast?.toLocaleString() ?? 0}`}
            sub="week total"
            color="text-gray-900"
          />
        </div>

        {data.insight && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-3 text-xs text-green-800">
            💡 {data.insight}
          </div>
        )}

        {data.revenue_by_job_type && data.revenue_by_job_type.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">REVENUE BY JOB TYPE (90d avg)</div>
            <div className="space-y-1.5">
              {data.revenue_by_job_type.slice(0, 6).map((jt) => (
                <div key={jt.type} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 capitalize">{jt.type.replace(/_/g, " ")}</span>
                  <div className="flex gap-3">
                    <span className="text-gray-900 font-medium">€{jt.avg_revenue.toLocaleString()}</span>
                    <span className="text-green-600">€{jt.margin_estimate.toLocaleString()} margin</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

// ─── Panel 6: SLA + Capacity ──────────────────────────────────────────────────

const SlaCapacityPanel: React.FC<{ slaData: SlaAtRisk[]; loading: boolean }> = ({ slaData, loading }) => {
  const overdue = slaData.filter((j) => j.is_overdue).length;
  const atRisk = slaData.filter((j) => !j.is_overdue).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <PanelHeader
        icon="🎯"
        title="SLA & Promises"
        subtitle="Jobs at risk of missing committed times"
        badge={
          overdue > 0 ? (
            <AlertBadge level="critical" text={`${overdue} overdue`} />
          ) : atRisk > 0 ? (
            <AlertBadge level="warning" text={`${atRisk} at risk`} />
          ) : (
            <AlertBadge level="ok" text="On time" />
          )
        }
      />

      {loading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      ) : slaData.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center">✅ No SLA issues in next 4 hours</div>
      ) : (
        <div className="space-y-2">
          {slaData.map((job, i) => (
            <div
              key={i}
              className={`border rounded-xl p-3 ${job.is_overdue ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-900">{job.order_number} — {job.vehicle}</div>
                  <div className="text-xs text-gray-500">{job.type} · {job.technician}</div>
                </div>
                <div className={`text-xs font-bold ${job.is_overdue ? "text-red-700" : "text-amber-700"}`}>
                  {job.is_overdue ? `${Math.abs(job.minutes_remaining)}min OVER` : `${job.minutes_remaining}min left`}
                </div>
              </div>
              <div className="mt-1.5 text-xs text-gray-600">{job.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Natural Language Query Box ────────────────────────────────────────────────

const QueryBox: React.FC<{ onQuery: (q: string) => void; loading: boolean; result: any }> = ({
  onQuery, loading, result,
}) => {
  const [question, setQuestion] = useState("");

  const EXAMPLE_QUERIES = [
    "Which technicians are overloaded today?",
    "What parts should we reorder today?",
    "Which customers are at risk of leaving?",
    "What's causing our delays this month?",
    "What's our revenue forecast this week?",
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xl">🤖</div>
        <div>
          <div className="font-bold text-sm">PIX Intelligence</div>
          <div className="text-xs text-gray-400">Ask anything about your workshop operations</div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && question.trim() && onQuery(question)}
          placeholder="Which technicians are overloaded today?"
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
        />
        <button
          onClick={() => question.trim() && onQuery(question)}
          disabled={loading || !question.trim()}
          className="bg-white text-gray-900 font-semibold rounded-xl px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-100 transition"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); onQuery(q); }}
            className="text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1 text-gray-300 hover:bg-white/20 transition"
          >
            {q}
          </button>
        ))}
      </div>

      {result && (
        <div className="bg-white/10 rounded-xl p-3 border border-white/20">
          <div className="text-xs text-gray-400 mb-1">Answer</div>
          <div className="text-sm text-white leading-relaxed">
            {typeof result === "string" ? result : result.answer ?? JSON.stringify(result, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

const IntelligenceView: React.FC = () => {
  const [technicians, setTechnicians] = useState<TechnicianLoad[]>([]);
  const [parts, setParts] = useState<AtRiskPart[]>([]);
  const [delays, setDelays] = useState<DelayPattern | null>(null);
  const [churn, setChurn] = useState<ChurnCustomer[]>([]);
  const [revenue, setRevenue] = useState<RevenueForecast | null>(null);
  const [sla, setSla] = useState<SlaAtRisk[]>([]);
  const [queryResult, setQueryResult] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [queryLoading, setQueryLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [techRes, partsRes, delayRes, churnRes, revenueRes, slaRes] = await Promise.allSettled([
        apiClient.get("/api/intelligence/overloaded-technicians"),
        apiClient.get("/api/intelligence/at-risk-parts"),
        apiClient.get("/api/intelligence/delay-patterns"),
        apiClient.get("/api/intelligence/customer-churn-risk"),
        apiClient.get("/api/intelligence/revenue-forecast"),
        apiClient.get("/api/intelligence/sla-at-risk"),
      ]);

      if (techRes.status === "fulfilled") setTechnicians((techRes.value as any)?.result ?? []);
      if (partsRes.status === "fulfilled") setParts((partsRes.value as any)?.result ?? []);
      if (delayRes.status === "fulfilled") setDelays((delayRes.value as any)?.result ?? null);
      if (churnRes.status === "fulfilled") setChurn((churnRes.value as any)?.result ?? []);
      if (revenueRes.status === "fulfilled") setRevenue((revenueRes.value as any)?.result ?? null);
      if (slaRes.status === "fulfilled") setSla((slaRes.value as any)?.result ?? []);

      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message ?? "Failed to load intelligence data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 3 minutes
    const interval = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const handleQuery = async (question: string) => {
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const result = await apiClient.post("/api/intelligence/query", { question });
      setQueryResult(result);
    } catch (err: any) {
      setQueryResult({ answer: `Error: ${err.message}` });
    } finally {
      setQueryLoading(false);
    }
  };

  // Alert summary for header
  const totalAlerts =
    technicians.filter((t) => t.alert_level === "critical" || t.alert_level === "warning").length +
    parts.filter((p) => p.urgency === "critical").length +
    sla.filter((j) => j.is_overdue).length +
    churn.filter((c) => c.churn_risk === "high" || c.churn_risk === "lost").length;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🧠 PIX Intelligence
            {totalAlerts > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                {totalAlerts}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            Operational intelligence · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Intelligence Query Box */}
      <div className="mb-6">
        <QueryBox onQuery={handleQuery} loading={queryLoading} result={queryResult} />
      </div>

      {/* 6 Intelligence Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <TechnicianPanel data={technicians} loading={loading} />
        <PartsPanel data={parts} loading={loading} />
        <DelayPanel data={delays} loading={loading} />
        <ChurnPanel data={churn} loading={loading} />
        <RevenuePanel data={revenue} loading={loading} />
        <SlaCapacityPanel slaData={sla} loading={loading} />
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-400">
        PIX Intelligence · Palantir-depth analytics · €499/month
        <span className="mx-2">·</span>
        <a href="/api/intelligence/dashboard" target="_blank" className="text-blue-500 hover:underline">
          Raw API
        </a>
      </div>
    </div>
  );
};

export default IntelligenceView;
