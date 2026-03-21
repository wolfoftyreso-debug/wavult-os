import { useState } from "react";
import { useApi } from "./useApi";
import { LanguageSwitcher, useTranslation } from "@pixdrift/i18n";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#F2F2F7",   // iOS systemGray6
  surface:   "#FFFFFF",
  border:    "#D1D1D6",   // iOS systemGray4
  text:      "#000000",   // pure black
  secondary: "#8E8E93",   // iOS systemGray
  tertiary:  "#C7C7CC",   // iOS systemGray3
  blue:      "#007AFF",
  green:     "#34C759",
  orange:    "#FF9500",
  red:       "#FF3B30",
  purple:    "#AF52DE",
  fill:      "#F2F2F7",
  inset:     "#E5E5EA",
  // compat aliases
  separator: "#F2F2F7",
  elevated:  "#FAFAFA",
};
const shadow = {
  sm: "0 1px 3px rgba(0,0,0,0.06)",
  md: "0 1px 3px rgba(0,0,0,0.06)",
};
const API = "https://api.bc.pixdrift.com";

// ─── Global styles ─────────────────────────────────────────────────────────────
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .card-animate { animation: slideUp 0.2s ease forwards; }
  .row-hover:hover { background: ${C.fill}; border-radius: 6px; transition: background 0.1s ease; }
  .nav-btn:hover:not(.active-nav) { background: rgba(60,60,67,0.08) !important; }
  .card-hover:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.09) !important; transform: translateY(-1px); transition: all 0.2s ease; }
  .btn-primary:hover { background: #0066D6 !important; }
  .btn-primary:active { transform: scale(0.98); }
  input:focus { outline: 2px solid ${C.blue} !important; outline-offset: 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatEur = (n: number) => `€${(n || 0).toLocaleString("sv-SE")}`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ width = "100%", height = "14px" }: { width?: string; height?: string }) => (
  <div style={{
    width, height,
    background: "linear-gradient(90deg, #E5E5EA 0%, #F5F5F7 50%, #E5E5EA 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite", borderRadius: 6,
  }} />
);

// ─── UI Primitives ─────────────────────────────────────────────────────────────
const Card = ({ title, children, style: st }: {
  title?: string; children: React.ReactNode; style?: React.CSSProperties;
}) => (
  <div className="card-animate" style={{
    background: C.surface, borderRadius: 10, padding: "20px 24px", boxShadow: shadow.sm, ...st,
  }}>
    {title && (
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.tertiary,
        marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {title}
      </div>
    )}
    {children}
  </div>
);

const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    background: color + "18", color, fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
  }}>
    {children}
  </span>
);

const Row = ({ children, border = true }: { children: React.ReactNode; border?: boolean }) => (
  <div className="row-hover" style={{
    display: "flex", alignItems: "center", gap: 12, padding: "11px 6px",
    borderBottom: border ? `0.5px solid ${C.separator}` : "none",
    cursor: "pointer",
  }}>
    {children}
  </div>
);

const Bar = ({ pct, color = C.blue, height = 6 }: { pct: number; color?: string; height?: number }) => (
  <div style={{ flex: 1, height, background: C.fill, borderRadius: height / 2, overflow: "hidden", minWidth: 40 }}>
    <div style={{
      height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`,
      background: color, borderRadius: height / 2, transition: "width 0.6s ease",
    }} />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary"; size?: "sm" | "md";
}) => (
  <button
    className={`btn-${variant}`}
    onClick={onClick}
    style={{
      height: size === "sm" ? 30 : 36, padding: size === "sm" ? "0 12px" : "0 16px",
      borderRadius: 8, fontSize: size === "sm" ? 12 : 13, fontWeight: 500,
      cursor: "pointer", border: "none", fontFamily: "inherit",
      background: variant === "primary" ? C.blue : C.fill,
      color: variant === "primary" ? "#fff" : C.text,
      transition: "all 0.15s ease",
    }}
  >
    {children}
  </button>
);

const EmptyState = ({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 10 }}>
    {icon && <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>}
    <div style={{ fontSize: 15, fontWeight: 600, color: C.secondary }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: C.tertiary, textAlign: "center" }}>{subtitle}</div>}
  </div>
);

// ─── Nav ─────────────────────────────────────────────────────────────────────
type NavItem = { id: string; label: string; icon: React.ReactNode };

const SALES_NAV_ICONS: { id: string; i18nKey: string; icon: React.ReactNode }[] = [
  { id: "overview", i18nKey: "nav.overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: "pipeline", i18nKey: "deals.pipeline", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id: "reports", i18nKey: "nav.reports", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: "payouts", i18nKey: "banking.payments", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { id: "currencies", i18nKey: "nav.currencies", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { id: "forecast", i18nKey: "reports.title", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
];

function useSalesNavItems(): NavItem[] {
  const { t } = useTranslation();
  return SALES_NAV_ICONS.map(n => ({ ...n, label: t(n.i18nKey) }));
}

// ─── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK_DEALS = [
  { id: "1", name: "Fastighetsbolaget – OMS", value: 18500, stage: "WON", probability: 100, company: "Fastighetsbolaget AB", owner: "Erik Svensson", close: "2026-03-15" },
  { id: "2", name: "Kommun X – Systemavtal", value: 35000, stage: "PROPOSAL", probability: 65, company: "Kommun X", owner: "Leon Ritzén", close: "2026-04-30" },
  { id: "3", name: "Bygg & Co – OMS-licens", value: 42000, stage: "QUALIFIED", probability: 40, company: "Bygg & Co", owner: "Leon Ritzén", close: "2026-05-15" },
  { id: "4", name: "RealEstate – Inspektionstjänst", value: 22000, stage: "WON", probability: 100, company: "RealEstate Group", owner: "Erik Svensson", close: "2026-03-01" },
  { id: "5", name: "TechStart – Pilot", value: 5500, stage: "NEW", probability: 20, company: "TechStart AB", owner: "Dennis Lindqvist", close: "2026-06-01" },
  { id: "6", name: "Enterprise – Sthlm Stad", value: 95000, stage: "PROPOSAL", probability: 55, company: "Stockholms Stad", owner: "Erik Svensson", close: "2026-06-30" },
  { id: "7", name: "Logistik AB – SaaS", value: 28000, stage: "QUALIFIED", probability: 45, company: "Logistik AB", owner: "Leon Ritzén", close: "2026-05-30" },
];

const FALLBACK_PAYOUTS = [
  { id: "1", recipient: "Leon Ritzén", amount: 4500, currency: "EUR", status: "PENDING", type: "COMMISSION", date: "2026-03-25", deal: "Fastighetsbolaget – OMS" },
  { id: "2", recipient: "Erik Svensson", amount: 7200, currency: "EUR", status: "APPROVED", type: "BONUS", date: "2026-03-20", deal: "RealEstate – Inspektionstjänst" },
  { id: "3", recipient: "Dennis Lindqvist", amount: 2800, currency: "EUR", status: "PAID", type: "COMMISSION", date: "2026-03-15", deal: "Pilot Q1" },
  { id: "4", recipient: "Winston Adeyemi", amount: 1500, currency: "EUR", status: "PENDING", type: "BONUS", date: "2026-03-28", deal: "Q1 Performance" },
  { id: "5", recipient: "Leon Ritzén", amount: 9500, currency: "EUR", status: "REJECTED", type: "COMMISSION", date: "2026-03-10", deal: "Avbrutet deal" },
];

const FALLBACK_CURRENCIES = [
  { code: "EUR", name: "Euro", rate_to_sek: 11.42, rate_to_usd: 1.085, exposure: 125000, change_24h: 0.12 },
  { code: "SEK", name: "Svensk Krona", rate_to_sek: 1.0, rate_to_usd: 0.0955, exposure: 48000, change_24h: -0.05 },
  { code: "USD", name: "US Dollar", rate_to_sek: 10.48, rate_to_usd: 1.0, exposure: 32000, change_24h: -0.22 },
  { code: "GBP", name: "Brittiskt Pund", rate_to_sek: 13.21, rate_to_usd: 1.261, exposure: 18000, change_24h: 0.08 },
  { code: "NOK", name: "Norsk Krone", rate_to_sek: 0.962, rate_to_usd: 0.0918, exposure: 9500, change_24h: -0.15 },
];

const FALLBACK_INCOME_STATEMENT = {
  revenue: 145200, cost_of_revenue: 58400, gross_profit: 86800,
  operating_expenses: 45600, ebitda: 41200, depreciation: 3200,
  ebit: 38000, interest: 1200, ebt: 36800, tax: 8832, net_income: 27968,
  period: "Q1 2026",
};

const FALLBACK_BALANCE_SHEET = {
  assets: { cash: 68400, accounts_receivable: 42100, inventory: 8200, fixed_assets: 34500, total: 153200 },
  liabilities: { accounts_payable: 18900, short_term_debt: 12000, long_term_debt: 35000, total: 65900 },
  equity: { share_capital: 50000, retained_earnings: 27968, other: 9332, total: 87300 },
  period: "2026-03-21",
};

const FALLBACK_CASHFLOW = {
  operating: 38200, investing: -12400, financing: -8000, net: 17800,
  opening_balance: 50600, closing_balance: 68400,
  period: "Q1 2026",
};

const FALLBACK_EXCHANGE_RATES = [
  { from: "EUR", to: "SEK", rate: 11.42, change: 0.12 },
  { from: "EUR", to: "USD", rate: 1.085, change: -0.03 },
  { from: "EUR", to: "GBP", rate: 0.857, change: 0.05 },
  { from: "EUR", to: "NOK", rate: 11.87, change: -0.18 },
  { from: "USD", to: "SEK", rate: 10.48, change: -0.22 },
];

const stageColor = (s: string) =>
  s === "WON" ? C.green : s === "LOST" ? C.red
  : s === "PROPOSAL" ? C.purple : s === "QUALIFIED" ? C.blue : C.tertiary;

const payoutColor = (s: string) =>
  s === "PAID" ? C.green : s === "APPROVED" ? C.blue
  : s === "PENDING" ? C.orange : C.red;

// ─── Views ─────────────────────────────────────────────────────────────────────
function OverviewView() {
  const { t } = useTranslation();
  const { data: salesDash, loading } = useApi<{ revenue_mtd: number; pipeline_value: number; win_rate: number; avg_deal_size: number }>(`${API}/api/dashboards/sales`);
  const deals = FALLBACK_DEALS;
  const wonDeals = deals.filter(d => d.stage === "WON");
  const wonVal = wonDeals.reduce((s, d) => s + d.value, 0);
  const pipelineVal = deals.filter(d => !["WON", "LOST"].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const winRate = deals.length > 0 ? Math.round(wonDeals.length / deals.length * 100) : 0;
  const avgDeal = wonDeals.length > 0 ? Math.round(wonVal / wonDeals.length) : 0;

  const kpis = [
    { label: t('reports.revenue'), value: formatEur(salesDash?.revenue_mtd ?? wonVal), sub: t('common.completed'), color: C.green, trend: "↑" as const },
    { label: t('deals.pipeline'), value: formatEur(salesDash?.pipeline_value ?? pipelineVal), sub: `${deals.filter(d => !["WON", "LOST"].includes(d.stage)).length} ${t('common.active').toLowerCase()}`, color: C.blue, trend: "↑" as const },
    { label: t('deals.winRate'), value: `${salesDash?.win_rate ?? winRate}%`, sub: t('common.completed'), color: C.purple, trend: winRate >= 50 ? "↑" as const : "↓" as const },
    { label: t('deals.value'), value: formatEur(salesDash?.avg_deal_size ?? avgDeal), sub: t('deals.stage.won'), color: C.orange, trend: "↑" as const },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "18px 20px", boxShadow: shadow.sm }}>
              <Skeleton height="11px" width="60%" />
              <div style={{ marginTop: 12 }}><Skeleton height="28px" width="70%" /></div>
              <div style={{ marginTop: 8 }}><Skeleton height="11px" width="40%" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {kpis.map((kpi, i) => (
            <div key={i} className="card-animate card-hover" style={{
              background: C.surface, borderRadius: 10, padding: "18px 20px",
              boxShadow: shadow.sm, borderTop: `3px solid ${kpi.color}`,
              animation: `slideUp 0.2s ease ${i * 0.05}s backwards`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{kpi.label}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: kpi.trend === "↑" ? C.green : C.red,
                  background: (kpi.trend === "↑" ? C.green : C.red) + "12",
                  padding: "2px 6px", borderRadius: 4,
                }}>
                  {kpi.trend}
                </span>
              </div>
              <div style={{
                fontSize: 26, fontWeight: 700, color: kpi.color, marginTop: 8,
                letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 12, color: C.tertiary, marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline forecast + Win/Loss */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card title={t('deals.totalPipeline')}>
          {["NEW", "QUALIFIED", "PROPOSAL"].map(stage => {
            const stDeals = deals.filter(d => d.stage === stage);
            const stVal = stDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
            const rawVal = stDeals.reduce((s, d) => s + d.value, 0);
            const pct = rawVal / (pipelineVal || 1) * 100;
            const color = stageColor(stage);
            return (
              <div key={stage} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{stage}</span>
                    <Badge color={color}>{stDeals.length}</Badge>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {formatEur(rawVal)}
                    </div>
                    <div style={{ fontSize: 11, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>
                      Vägt: {formatEur(Math.round(stVal))}
                    </div>
                  </div>
                </div>
                <Bar pct={pct} color={color} height={5} />
              </div>
            );
          })}
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 8, paddingTop: 14,
            borderTop: `0.5px solid ${C.separator}`,
          }}>
            <span style={{ fontSize: 13, color: C.secondary }}>Total pipeline</span>
            <span style={{
              fontSize: 16, fontWeight: 700, color: C.blue,
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatEur(pipelineVal)}
            </span>
          </div>
        </Card>

        <Card title={`${t('deals.stage.won')} / ${t('deals.stage.lost')}`}>
          {[
            { label: t('deals.wonDeals'), val: wonVal, count: wonDeals.length, color: C.green },
            { label: t('deals.lostDeals'), val: deals.filter(d => d.stage === "LOST").reduce((s, d) => s + d.value, 0), count: deals.filter(d => d.stage === "LOST").length, color: C.red },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "14px 0",
              borderBottom: i === 0 ? `0.5px solid ${C.separator}` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Badge color={item.color}>{item.label}</Badge>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {formatEur(item.val)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.secondary }}>{item.count} deals</div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "14px", background: C.fill, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.tertiary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Win Rate
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Bar pct={winRate} color={winRate >= 50 ? C.green : C.orange} height={8} />
              <span style={{
                fontSize: 18, fontWeight: 700,
                color: winRate >= 50 ? C.green : C.orange,
                minWidth: 45, fontVariantNumeric: "tabular-nums",
              }}>
                {winRate}%
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PipelineView() {
  const { t } = useTranslation();
  const deals = FALLBACK_DEALS;
  const stages = ["NEW", "QUALIFIED", "PROPOSAL", "WON"];
  const maxVal = Math.max(...stages.map(s => deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title={t('deals.pipeline')}>
        {stages.map(stage => {
          const stDeals = deals.filter(d => d.stage === stage);
          const stVal = stDeals.reduce((s, d) => s + d.value, 0);
          const color = stageColor(stage);
          const pct = maxVal > 0 ? stVal / maxVal * 100 : 0;
          return (
            <div key={stage} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{stage}</span>
                  <span style={{ fontSize: 12, color: C.secondary }}>{stDeals.length} deals</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatEur(stVal)}
                </span>
              </div>
              <Bar pct={pct} color={color} height={10} />
            </div>
          );
        })}
      </Card>

      {stages.map(stage => {
        const stDeals = deals.filter(d => d.stage === stage);
        if (stDeals.length === 0) return null;
        return (
          <Card key={stage} title={`${stage} (${stDeals.length})`}>
            {stDeals.map((d, i) => {
              const overdue = d.stage !== "WON" && new Date(d.close) < new Date();
              return (
                <Row key={i} border={i < stDeals.length - 1}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                      {d.company} · {d.owner}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {formatEur(d.value)}
                    </div>
                    <div style={{ fontSize: 11, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>
                      {d.probability}% sannolikhet
                    </div>
                  </div>
                  <div style={{ width: 60 }}>
                    <div style={{ height: 4, background: C.fill, borderRadius: 2 }}>
                      <div style={{
                        height: "100%", width: `${d.probability}%`,
                        background: stageColor(d.stage), borderRadius: 2,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, color: overdue ? C.red : C.tertiary,
                    fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
                    fontWeight: overdue ? 600 : 400,
                  }}>
                    {overdue ? "⚠ " : ""}{d.close}
                  </span>
                </Row>
              );
            })}
          </Card>
        );
      })}
    </div>
  );
}

function ReportsView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"income" | "balance" | "cashflow">("income");
  const { data: incomeData, loading: incLoading } = useApi<typeof FALLBACK_INCOME_STATEMENT>(`${API}/api/reports/income-statement`);
  const { data: balanceData, loading: balLoading } = useApi<typeof FALLBACK_BALANCE_SHEET>(`${API}/api/reports/balance-sheet`);
  const { data: cashData, loading: cashLoading } = useApi<typeof FALLBACK_CASHFLOW>(`${API}/api/reports/cashflow`);

  const income = incomeData ?? FALLBACK_INCOME_STATEMENT;
  const balance = balanceData ?? FALLBACK_BALANCE_SHEET;
  const cash = cashData ?? FALLBACK_CASHFLOW;

  const tabs = [
    { id: "income" as const, label: t('reports.incomeStatement') },
    { id: "balance" as const, label: t('reports.balanceSheet') },
    { id: "cashflow" as const, label: t('reports.cashflow') },
  ];

  const incomeRows = [
    { label: t('reports.revenue'), value: income.revenue, bold: false, indent: false, color: C.green },
    { label: t('reports.expenses'), value: -income.cost_of_revenue, bold: false, indent: true, color: C.red },
    { label: t('reports.profit'), value: income.gross_profit, bold: true, indent: false, color: income.gross_profit >= 0 ? C.green : C.red },
    { label: t('reports.expenses'), value: -income.operating_expenses, bold: false, indent: true, color: C.red },
    { label: "EBITDA", value: income.ebitda, bold: true, indent: false, color: income.ebitda >= 0 ? C.blue : C.red },
    { label: t('common.total'), value: -income.depreciation, bold: false, indent: true, color: C.secondary },
    { label: "EBIT", value: income.ebit, bold: false, indent: false, color: C.text },
    { label: t('reports.expenses'), value: -income.interest, bold: false, indent: true, color: C.red },
    { label: t('reports.profit'), value: income.ebt, bold: false, indent: false, color: C.text },
    { label: t('common.total'), value: -income.tax, bold: false, indent: true, color: C.red },
    { label: t('reports.profit'), value: income.net_income, bold: true, indent: false, color: income.net_income >= 0 ? C.green : C.red },
  ];

  const FinRow = ({ label, value, bold, indent, color }: { label: string; value: number; bold: boolean; indent: boolean; color: string }) => (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: `${bold ? 13 : 9}px 0`,
      borderBottom: bold ? `0.5px solid ${C.border}` : `0.5px solid ${C.separator}`,
      paddingLeft: indent ? 20 : 0,
    }}>
      <span style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color: C.secondary }}>{label}</span>
      <span style={{
        fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 500,
        color, fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
      }}>
        {value >= 0 ? formatEur(value) : `−${formatEur(Math.abs(value))}`}
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, background: C.fill, borderRadius: 10, padding: 3, width: "fit-content" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? C.surface : "transparent",
              color: tab === t.id ? C.text : C.secondary,
              border: "none", borderRadius: 8, padding: "7px 16px",
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer", boxShadow: tab === t.id ? shadow.sm : "none",
              transition: "all 0.15s", fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Income Statement */}
      {tab === "income" && (
        incLoading ? <Card><Skeleton height="300px" /></Card> : (
          <Card title={`Resultaträkning — ${income.period}`}>
            {incomeRows.map((row, i) => (
              <FinRow key={i} {...row} />
            ))}
          </Card>
        )
      )}

      {/* Balance Sheet */}
      {tab === "balance" && (
        balLoading ? <Card><Skeleton height="300px" /></Card> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title={`Tillgångar — ${balance.period}`}>
              {Object.entries(balance.assets).filter(([k]) => k !== "total").map(([key, val], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `0.5px solid ${C.separator}` }}>
                  <span style={{ fontSize: 13, color: C.secondary, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{formatEur(val)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderTop: `0.5px solid ${C.border}`, fontWeight: 700 }}>
                <span>{t('common.total')}</span>
                <span style={{ color: C.blue, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{formatEur(balance.assets.total)}</span>
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card title={t('reports.liabilities')}>
                {Object.entries(balance.liabilities).filter(([k]) => k !== "total").map(([key, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `0.5px solid ${C.separator}` }}>
                    <span style={{ fontSize: 13, color: C.secondary, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", color: C.red }}>{formatEur(val)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderTop: `0.5px solid ${C.border}`, fontWeight: 700, fontSize: 14 }}>
                  <span>{t('common.total')}</span>
                  <span style={{ color: C.red, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{formatEur(balance.liabilities.total)}</span>
                </div>
              </Card>
              <Card title={t('reports.equity')}>
                {Object.entries(balance.equity).filter(([k]) => k !== "total").map(([key, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `0.5px solid ${C.separator}` }}>
                    <span style={{ fontSize: 13, color: C.secondary, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", color: C.green }}>{formatEur(val)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderTop: `0.5px solid ${C.border}`, fontWeight: 700, fontSize: 14 }}>
                  <span>{t('common.total')}</span>
                  <span style={{ color: C.green, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{formatEur(balance.equity.total)}</span>
                </div>
              </Card>
            </div>
          </div>
        )
      )}

      {/* Cashflow */}
      {tab === "cashflow" && (
        cashLoading ? <Card><Skeleton height="200px" /></Card> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: t('reports.cashflow'), value: cash.operating, color: C.green },
                { label: t('reports.assets'), value: cash.investing, color: cash.investing >= 0 ? C.green : C.red },
                { label: t('reports.revenue'), value: cash.financing, color: cash.financing >= 0 ? C.green : C.red },
              ].map((c, i) => (
                <div key={i} className="card-animate" style={{
                  background: C.surface, borderRadius: 10, padding: "16px 20px", boxShadow: shadow.sm,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{c.label}</div>
                  <div style={{
                    fontSize: 22, fontWeight: 700, color: c.color, marginTop: 6,
                    fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
                  }}>
                    {c.value >= 0 ? "+" : "−"}{formatEur(Math.abs(c.value))}
                  </div>
                </div>
              ))}
            </div>
            <Card title={`${t('reports.cashflow')} — ${cash.period}`}>
              {[
                { label: t('banking.balance'), value: cash.opening_balance, color: C.text, bold: false },
                { label: t('reports.cashflow'), value: cash.operating, color: cash.operating >= 0 ? C.green : C.red, bold: false },
                { label: t('reports.assets'), value: cash.investing, color: cash.investing >= 0 ? C.green : C.red, bold: false },
                { label: t('reports.revenue'), value: cash.financing, color: cash.financing >= 0 ? C.green : C.red, bold: false },
                { label: `${t('reports.cashflow')} ${t('common.total')}`, value: cash.net, color: cash.net >= 0 ? C.green : C.red, bold: true },
                { label: t('banking.balance'), value: cash.closing_balance, color: C.blue, bold: true },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: `${row.bold ? 13 : 9}px 0`,
                  borderBottom: row.bold ? `0.5px solid ${C.border}` : `0.5px solid ${C.separator}`,
                }}>
                  <span style={{ fontSize: row.bold ? 14 : 13, fontWeight: row.bold ? 700 : 400, color: C.secondary }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: row.bold ? 15 : 13, fontWeight: row.bold ? 700 : 500,
                    color: row.color, fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
                  }}>
                    {row.value >= 0 ? "+" : "−"}{formatEur(Math.abs(row.value))}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        )
      )}
    </div>
  );
}

function PayoutsView() {
  const { t } = useTranslation();
  const { data, loading } = useApi<typeof FALLBACK_PAYOUTS>(`${API}/api/payouts`);
  const payouts = (data && data.length > 0) ? data : FALLBACK_PAYOUTS;
  const [filter, setFilter] = useState("ALL");
  const statuses = ["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"];
  const filtered = filter === "ALL" ? payouts : payouts.filter(p => p.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: t('common.pending'), value: formatEur(payouts.filter(p => p.status === "PENDING").reduce((s, p) => s + p.amount, 0)), color: C.orange, count: payouts.filter(p => p.status === "PENDING").length },
          { label: t('common.approve'), value: formatEur(payouts.filter(p => p.status === "APPROVED").reduce((s, p) => s + p.amount, 0)), color: C.blue, count: payouts.filter(p => p.status === "APPROVED").length },
          { label: t('common.completed'), value: formatEur(payouts.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0)), color: C.green, count: payouts.filter(p => p.status === "PAID").length },
          { label: t('common.reject'), value: formatEur(payouts.filter(p => p.status === "REJECTED").reduce((s, p) => s + p.amount, 0)), color: C.red, count: payouts.filter(p => p.status === "REJECTED").length },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10, padding: "16px 18px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>
              {s.label} ({s.count})
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 2, background: C.fill, borderRadius: 10, padding: 3, width: "fit-content" }}>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              background: filter === s ? C.surface : "transparent",
              color: filter === s ? C.text : C.secondary,
              border: "none", borderRadius: 8, padding: "6px 14px",
              fontSize: 12, fontWeight: filter === s ? 600 : 400,
              cursor: "pointer", boxShadow: filter === s ? shadow.sm : "none",
              transition: "all 0.15s", fontFamily: "inherit",
            }}
          >
            {s === "ALL" ? t('common.all') : s}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><Skeleton height="200px" /></Card>
      ) : (
        <Card title={`${t('banking.payments')} (${filtered.length})`}>
          {filtered.length === 0 ? (
            <EmptyState icon="💰" title={t('common.noData')} />
          ) : (
            filtered.map((p, i) => {
              const col = payoutColor(p.status);
              return (
                <Row key={i} border={i < filtered.length - 1}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: col + "15", color: col,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(p.recipient ?? "?")[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{p.recipient}</div>
                    <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{p.type} · {p.deal}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {formatEur(p.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>
                      {p.date}
                    </div>
                  </div>
                  <Badge color={col}>{p.status}</Badge>
                  {p.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{
                        background: C.green + "15", color: C.green,
                        border: `1px solid ${C.green}30`,
                        borderRadius: 6, padding: "4px 10px",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        ✓
                      </button>
                      <button style={{
                        background: C.red + "15", color: C.red,
                        border: `1px solid ${C.red}30`,
                        borderRadius: 6, padding: "4px 10px",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        ✕
                      </button>
                    </div>
                  )}
                </Row>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
}

function CurrenciesView() {
  const { t } = useTranslation();
  const { data: ratesData, loading: ratesLoading } = useApi<typeof FALLBACK_EXCHANGE_RATES>(`${API}/api/exchange-rates`);
  const { data: curData } = useApi<typeof FALLBACK_CURRENCIES>(`${API}/api/currencies`);
  const rates = (ratesData && ratesData.length > 0) ? ratesData : FALLBACK_EXCHANGE_RATES;
  const currencies = (curData && curData.length > 0) ? curData : FALLBACK_CURRENCIES;
  const totalExposure = currencies.reduce((s, c) => s + (c.exposure ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: t('nav.currencies'), value: formatEur(totalExposure), color: C.blue },
          { label: "EUR/SEK", value: `${FALLBACK_CURRENCIES[0].rate_to_sek}`, color: C.text },
          { label: "EUR/USD", value: `${FALLBACK_CURRENCIES[0].rate_to_usd}`, color: C.text },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10, padding: "16px 20px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.label}</div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <Card title={t('nav.currencies')}>
        {currencies.map((c, i) => {
          const pct = (c.exposure ?? 0) / (totalExposure || 1) * 100;
          const changePos = (c.change_24h ?? 0) >= 0;
          return (
            <div key={i} style={{
              padding: "12px 0",
              borderBottom: i < currencies.length - 1 ? `0.5px solid ${C.separator}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: C.fill,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: C.secondary,
                }}>
                  {c.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{c.code} — {c.name}</div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                    1 {c.code} = {c.rate_to_sek} SEK · {c.rate_to_usd} USD
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {formatEur(c.exposure)}
                  </div>
                  <div style={{
                    fontSize: 11, fontVariantNumeric: "tabular-nums",
                    color: changePos ? C.green : C.red, fontWeight: 500,
                  }}>
                    {changePos ? "+" : ""}{c.change_24h}%
                  </div>
                </div>
              </div>
              <Bar pct={pct} color={C.blue} height={3} />
            </div>
          );
        })}
      </Card>

      <Card title={t('nav.exchangeRates')}>
        {ratesLoading ? (
          <Skeleton height="150px" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 80px" }}>
            {[t('nav.currencies'), t('nav.currencies'), t('nav.exchangeRates'), "24h"].map((h, i) => (
              <div key={h} style={{
                padding: "8px 0",
                fontSize: 11, fontWeight: 600, color: C.tertiary,
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: `0.5px solid ${C.border}`,
                textAlign: i >= 2 ? "right" : "left",
              }}>
                {h}
              </div>
            ))}
            {rates.map((r, i) => [
              <div key={`f${i}`} style={{ padding: "10px 0", borderBottom: `0.5px solid ${C.separator}`, fontWeight: 500, fontSize: 13 }}>{r.from}</div>,
              <div key={`t${i}`} style={{ padding: "10px 0", borderBottom: `0.5px solid ${C.separator}`, color: C.secondary, fontSize: 13 }}>{r.to}</div>,
              <div key={`r${i}`} style={{ padding: "10px 0", borderBottom: `0.5px solid ${C.separator}`, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontSize: 13, textAlign: "right" }}>{r.rate}</div>,
              <div key={`c${i}`} style={{
                padding: "10px 0", borderBottom: `0.5px solid ${C.separator}`,
                color: (r.change ?? 0) >= 0 ? C.green : C.red,
                fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
                fontSize: 13, textAlign: "right", fontWeight: 500,
              }}>
                {(r.change ?? 0) >= 0 ? "+" : ""}{r.change}%
              </div>,
            ])}
          </div>
        )}
      </Card>
    </div>
  );
}

function ForecastView() {
  const { t } = useTranslation();
  const deals = FALLBACK_DEALS.filter(d => !["WON", "LOST"].includes(d.stage));
  const months = ["Apr 2026", "Maj 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"];
  const closeMonths: Record<string, number> = {
    "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0, "2026-08": 0, "2026-09": 0,
  };
  deals.forEach(d => {
    const key = d.close?.slice(0, 7);
    if (key && closeMonths[key] !== undefined) {
      closeMonths[key] += d.value * (d.probability / 100);
    }
  });
  const forecastData = months.map((m, i) => {
    const key = Object.keys(closeMonths)[i];
    return {
      month: m,
      weighted: Math.round(closeMonths[key] || 0),
      raw: deals.filter(d => d.close?.startsWith(key)).reduce((s, d) => s + d.value, 0),
    };
  });
  const maxForecast = Math.max(...forecastData.map(f => Math.max(f.raw, 1)));
  const totalWeighted = forecastData.reduce((s, f) => s + f.weighted, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: t('deals.totalPipeline'), value: formatEur(totalWeighted), color: C.blue },
          { label: t('deals.pipeline'), value: formatEur(deals.reduce((s, d) => s + d.value, 0)), color: C.text },
          { label: t('common.active'), value: deals.length, color: C.purple },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10, padding: "16px 20px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.label}</div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <Card title={t('reports.title')}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 160, marginBottom: 8 }}>
          {forecastData.map((f, i) => {
            const barH = (f.raw / maxForecast) * 120;
            const weightedH = (f.weighted / maxForecast) * 120;
            return (
              <div key={i} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4,
              }}>
                <div style={{ fontSize: 11, color: C.secondary, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                  {f.weighted > 0 ? formatEur(f.weighted) : "—"}
                </div>
                <div style={{
                  width: "100%", display: "flex", gap: 2,
                  alignItems: "flex-end", height: 120,
                }}>
                  <div style={{
                    flex: 1, height: Math.max(barH, 2),
                    background: C.blue + "25", borderRadius: "4px 4px 0 0",
                  }} />
                  <div style={{
                    flex: 1, height: Math.max(weightedH, 2),
                    background: C.blue, borderRadius: "4px 4px 0 0",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: C.tertiary }}>{f.month}</div>
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex", gap: 16, justifyContent: "center",
          paddingTop: 12, borderTop: `0.5px solid ${C.separator}`,
        }}>
          {[
            { color: C.blue + "25", label: t('deals.pipeline') },
            { color: C.blue, label: t('deals.totalPipeline') },
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: C.secondary }}>{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('deals.title')}>
        {deals.length === 0 ? (
          <EmptyState icon="📈" title={t('common.noData')} />
        ) : (
          deals.map((d, i) => {
            const overdue = new Date(d.close) < new Date();
            return (
              <Row key={i} border={i < deals.length - 1}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                    {d.company} · Stänger: <span style={{ color: overdue ? C.red : C.secondary, fontWeight: overdue ? 600 : 400 }}>{d.close}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {formatEur(d.value)}
                  </div>
                  <div style={{ fontSize: 11, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>
                    {d.probability}%
                  </div>
                </div>
                <div style={{ minWidth: 90, textAlign: "right" }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: C.blue,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {formatEur(Math.round(d.value * d.probability / 100))}
                  </div>
                  <div style={{ fontSize: 11, color: C.tertiary }}>vägt</div>
                </div>
                <Badge color={stageColor(d.stage)}>{d.stage}</Badge>
              </Row>
            );
          })
        )}
      </Card>
    </div>
  );
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState("overview");
  const navItems = useSalesNavItems();

  const viewComponents: Record<string, React.ReactNode> = {
    overview: <OverviewView />,
    pipeline: <PipelineView />,
    reports: <ReportsView />,
    payouts: <PayoutsView />,
    currencies: <CurrenciesView />,
    forecast: <ForecastView />,
  };

  const current = navItems.find(n => n.id === view)!;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{
        display: "flex", minHeight: "100vh", background: C.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
        color: C.text, WebkitFontSmoothing: "antialiased",
      }}>
        {/* Sidebar */}
        <div style={{
          width: 260, background: "#FFFFFF",
          borderRight: `0.5px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
        }}>
          <div style={{
            height: 52,
            padding: "0 16px",
            borderBottom: `0.5px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #34C759, #30B955)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>Sales</div>
              <div style={{ fontSize: 11, color: C.tertiary }}>Pixdrift OMS</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  className="nav-btn"
                  onClick={() => setView(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "0 12px", height: 44, borderRadius: 10, border: "none",
                    background: active ? "#007AFF" : "transparent",
                    color: active ? "#FFFFFF" : "#000000",
                    fontSize: 17, fontWeight: active ? 600 : 400, letterSpacing: "-0.41px",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ color: "inherit" }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div style={{
            padding: "12px 14px",
            borderTop: `1px solid ${C.separator}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: C.green + "18", color: C.green,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>
              E
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Erik Svensson</div>
              <div style={{ fontSize: 11, color: C.tertiary }}>Sales Director</div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderBottom: `0.5px solid ${C.border}`,
            padding: "0 24px", height: 52,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "sticky", top: 0, zIndex: 50,
          }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#000000", letterSpacing: "-0.41px" }}>
              {current?.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LanguageSwitcher />
              <div style={{
                fontSize: 12, color: C.tertiary,
                fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
              }}>
                {new Date().toLocaleDateString("sv-SE")}
              </div>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
              <div style={{ fontSize: 12, color: C.secondary }}>Live data</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: "32px 32px 64px" }}>
            {viewComponents[view] ?? <EmptyState icon="🔍" title={t('common.noData')} />}
          </div>
        </div>
      </div>
    </>
  );
}
