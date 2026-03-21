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
  @keyframes fillBar { from { width: 0%; } to { width: var(--pct); } }
  .card-animate { animation: slideUp 0.2s ease forwards; }
  .row-hover:hover { background: ${C.fill}; border-radius: 6px; transition: background 0.1s ease; }
  .nav-btn:hover:not(.active-nav) { background: rgba(60,60,67,0.08) !important; }
  .card-hover:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; transform: translateY(-1px); transition: all 0.2s ease; }
  .btn-primary:hover { background: #0066D6 !important; }
  .btn-primary:active { transform: scale(0.98); }
  input:focus { outline: 2px solid ${C.blue} !important; outline-offset: 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatEur = (n: number) => `€${(n || 0).toLocaleString("sv-SE")}`;
const initials = (name: string) =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const avatarColor = (name: string) => {
  const colors = [C.blue, C.green, C.purple, C.orange, C.red];
  return colors[(name.charCodeAt(0) + name.charCodeAt(1 % name.length)) % colors.length];
};
const stageColor = (s: string) =>
  s === "WON" ? C.green : s === "LOST" ? C.red
  : s === "PROPOSAL" ? C.purple : s === "QUALIFIED" ? C.blue : C.tertiary;

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
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 6px",
    borderBottom: border ? `0.5px solid ${C.separator}` : "none",
    cursor: "pointer",
  }}>
    {children}
  </div>
);

const Bar = ({ pct, color = C.blue, height = 4 }: { pct: number; color?: string; height?: number }) => (
  <div style={{ flex: 1, height, background: C.fill, borderRadius: height / 2, overflow: "hidden", minWidth: 40 }}>
    <div style={{
      height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`,
      background: color, borderRadius: height / 2, transition: "width 0.6s ease",
    }} />
  </div>
);

const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => {
  const color = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "18", color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
};

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

const EmptyState = ({ icon, title, subtitle, cta }: {
  icon?: string; title: string; subtitle?: string; cta?: string;
}) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px 24px", gap: 10,
  }}>
    {icon && <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>}
    <div style={{ fontSize: 15, fontWeight: 600, color: C.secondary }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: C.tertiary, textAlign: "center", maxWidth: 280 }}>{subtitle}</div>}
    {cta && <Btn size="sm">{cta}</Btn>}
  </div>
);

// ─── Nav ─────────────────────────────────────────────────────────────────────
type NavItem = { id: string; label: string; icon: React.ReactNode };

const NAV_ICONS: { id: string; i18nKey: string; icon: React.ReactNode }[] = [
  { id: "overview", i18nKey: "nav.overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: "contacts", i18nKey: "nav.contacts", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: "companies", i18nKey: "nav.companies", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: "leads", i18nKey: "nav.leads", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg> },
  { id: "deals", i18nKey: "nav.deals", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { id: "activities", i18nKey: "nav.activities", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
];

function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  return NAV_ICONS.map(n => ({ ...n, label: t(n.i18nKey) }));
}

// ─── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK_CONTACTS = [
  { id: "1", name: "Maria Svensson", email: "maria@fastighetsbolaget.se", phone: "+46701234567", company: "Fastighetsbolaget AB", role: "VD", status: "ACTIVE" },
  { id: "2", name: "Johan Karlsson", email: "jk@kommunx.se", phone: "+46702345678", company: "Kommun X", role: "Upphandlingschef", status: "ACTIVE" },
  { id: "3", name: "Anna Lindqvist", email: "anna@logistik.se", phone: "+46703456789", company: "Logistik AB", role: "IT-chef", status: "LEAD" },
  { id: "4", name: "Erik Persson", email: "ep@realestate.se", phone: "+46704567890", company: "RealEstate Group", role: "COO", status: "ACTIVE" },
  { id: "5", name: "Petra Nilsson", email: "petra@tech.se", phone: "+46705678901", company: "TechStart AB", role: "CTO", status: "PROSPECT" },
  { id: "6", name: "Marcus Holm", email: "marcus@bygg.se", phone: "+46706789012", company: "Bygg & Co", role: "Inköpschef", status: "LEAD" },
];

const FALLBACK_COMPANIES = [
  { id: "1", name: "Fastighetsbolaget AB", industry: "Fastigheter", contacts: 3, dealValue: 18500, status: "CUSTOMER" },
  { id: "2", name: "Kommun X", industry: "Offentlig sektor", contacts: 2, dealValue: 35000, status: "PROSPECT" },
  { id: "3", name: "Logistik AB", industry: "Transport", contacts: 1, dealValue: 8200, status: "LEAD" },
  { id: "4", name: "RealEstate Group", industry: "Fastigheter", contacts: 2, dealValue: 22000, status: "CUSTOMER" },
  { id: "5", name: "TechStart AB", industry: "Tech", contacts: 1, dealValue: 5500, status: "PROSPECT" },
];

const FALLBACK_LEADS = [
  { id: "1", name: "Systemlösning Kommun Y", company: "Kommun Y", value: 28000, stage: "NEW", assignee: "Leon Ritzén", created: "2026-03-18" },
  { id: "2", name: "Inspektionstjänst Malmö", company: "Fastighets AB", value: 15000, stage: "QUALIFIED", assignee: "Erik Svensson", created: "2026-03-15" },
  { id: "3", name: "OMS-licens Göteborg", company: "Bygg & Co", value: 42000, stage: "PROPOSAL", assignee: "Leon Ritzén", created: "2026-03-10" },
  { id: "4", name: "Drone-inspektion", company: "RealEstate Group", value: 12000, stage: "WON", assignee: "Dennis Lindqvist", created: "2026-03-05" },
  { id: "5", name: "Pilotprojekt Västerås", company: "Industri AB", value: 9500, stage: "LOST", assignee: "Leon Ritzén", created: "2026-02-28" },
  { id: "6", name: "Enterprise OMS", company: "Logistics Corp", value: 65000, stage: "NEW", assignee: "Erik Svensson", created: "2026-03-21" },
  { id: "7", name: "SaaS-avtal Q2", company: "TechStart AB", value: 18000, stage: "QUALIFIED", assignee: "Leon Ritzén", created: "2026-03-20" },
  { id: "8", name: "Stadsomfattande inspektion", company: "Stockholms Stad", value: 95000, stage: "PROPOSAL", assignee: "Erik Svensson", created: "2026-03-17" },
];

const FALLBACK_DEALS = [
  { id: "1", name: "Fastighetsbolaget – OMS", value: 18500, stage: "WON", probability: 100, company: "Fastighetsbolaget AB", owner: "Erik Svensson", close: "2026-03-15" },
  { id: "2", name: "Kommun X – Systemavtal", value: 35000, stage: "PROPOSAL", probability: 65, company: "Kommun X", owner: "Leon Ritzén", close: "2026-04-30" },
  { id: "3", name: "Bygg & Co – OMS-licens", value: 42000, stage: "QUALIFIED", probability: 40, company: "Bygg & Co", owner: "Leon Ritzén", close: "2026-05-15" },
  { id: "4", name: "RealEstate – Inspektionstjänst", value: 22000, stage: "WON", probability: 100, company: "RealEstate Group", owner: "Erik Svensson", close: "2026-03-01" },
  { id: "5", name: "TechStart – Pilot", value: 5500, stage: "NEW", probability: 20, company: "TechStart AB", owner: "Dennis Lindqvist", close: "2026-06-01" },
  { id: "6", name: "Enterprise – Sthlm Stad", value: 95000, stage: "PROPOSAL", probability: 55, company: "Stockholms Stad", owner: "Erik Svensson", close: "2026-06-30" },
];

const FALLBACK_ACTIVITIES = [
  { id: "1", type: "MEETING", title: "Demo för Kommun X", contact: "Johan Karlsson", date: "2026-03-22", time: "10:00", done: false },
  { id: "2", type: "TASK", title: "Skicka offert till Bygg & Co", contact: "Marcus Holm", date: "2026-03-21", time: "17:00", done: false },
  { id: "3", type: "CALL", title: "Uppföljning Fastighetsbolaget", contact: "Maria Svensson", date: "2026-03-21", time: "14:00", done: true },
  { id: "4", type: "EMAIL", title: "Välkomstmail TechStart", contact: "Petra Nilsson", date: "2026-03-20", time: "09:00", done: true },
  { id: "5", type: "MEETING", title: "Kickoff Enterprise OMS", contact: "Erik Persson", date: "2026-03-24", time: "13:00", done: false },
  { id: "6", type: "TASK", title: "Uppdatera CRM-data Logistik AB", contact: "Anna Lindqvist", date: "2026-03-23", time: "12:00", done: false },
];

const actColor = (t: string) =>
  t === "MEETING" ? C.blue : t === "TASK" ? C.purple : t === "CALL" ? C.green : C.orange;

// ─── Views ─────────────────────────────────────────────────────────────────────
function OverviewView() {
  const { t } = useTranslation();
  const { data: leadsData } = useApi<typeof FALLBACK_LEADS>(`${API}/api/leads`);
  const { data: dealsData } = useApi<typeof FALLBACK_DEALS>(`${API}/api/deals`);
  const leads = (leadsData && leadsData.length > 0) ? leadsData : FALLBACK_LEADS;
  const deals = (dealsData && dealsData.length > 0) ? dealsData : FALLBACK_DEALS;

  const pipeline = deals.filter(d => d.stage !== "WON" && d.stage !== "LOST");
  const pipelineVal = pipeline.reduce((s, d) => s + (d.value ?? 0), 0);
  const wonVal = deals.filter(d => d.stage === "WON").reduce((s, d) => s + (d.value ?? 0), 0);
  const todayActivities = FALLBACK_ACTIVITIES.filter(a => a.date === "2026-03-21" && !a.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: t('deals.pipeline'), value: formatEur(pipelineVal), sub: `${pipeline.length} ${t('common.active').toLowerCase()}`, color: C.blue },
          { label: t('nav.leads'), value: leads.length, sub: `${leads.filter(l => l.stage === "NEW").length} ${t('deals.stage.new').toLowerCase()}`, color: C.purple },
          { label: t('deals.stage.won'), value: formatEur(wonVal), sub: `${deals.filter(d => d.stage === "WON").length} ${t('common.closed').toLowerCase()}`, color: C.green },
          { label: t('nav.activities'), value: todayActivities, sub: t('common.pending'), color: C.orange },
        ].map((kpi, i) => (
          <div key={i} className="card-animate card-hover" style={{
            background: C.surface, borderRadius: 10, padding: "18px 20px", boxShadow: shadow.sm,
            animation: `slideUp 0.2s ease ${i * 0.05}s backwards`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{kpi.label}</div>
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

      {/* Pipeline by stage */}
      <Card title={t('deals.pipeline')}>
        <div style={{ display: "flex", gap: 10 }}>
          {["NEW", "QUALIFIED", "PROPOSAL", "WON", "LOST"].map(stage => {
            const stDeals = leads.filter(l => l.stage === stage);
            const stVal = stDeals.reduce((s, d) => s + (d.value ?? 0), 0);
            const col = stageColor(stage);
            return (
              <div key={stage} style={{
                flex: 1,
                background: stage === "WON" ? C.green + "15" : stage === "LOST" ? C.red + "15" : C.fill,
                borderRadius: 10, padding: "14px 14px",
                border: `1px solid ${col}20`,
                cursor: "pointer",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: col,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {stage}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: stage === "WON" ? C.green : stage === "LOST" ? C.red : C.text,
                  marginTop: 6, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
                }}>
                  {formatEur(stVal)}
                </div>
                <div style={{ fontSize: 12, color: C.tertiary, marginTop: 2 }}>
                  {stDeals.length} leads
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent contacts + activities */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title={t('contacts.title')}>
          {FALLBACK_CONTACTS.slice(0, 4).map((c, i) => (
            <Row key={i} border={i < 3}>
              <Avatar name={c.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{c.role} · {c.company}</div>
              </div>
              <Badge color={c.status === "ACTIVE" ? C.green : c.status === "LEAD" ? C.blue : C.tertiary}>
                {c.status}
              </Badge>
            </Row>
          ))}
        </Card>
        <Card title={t('nav.activities')}>
          {FALLBACK_ACTIVITIES.filter(a => !a.done).slice(0, 4).map((a, i) => (
            <Row key={i} border={i < 3}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: actColor(a.type) + "15",
                color: actColor(a.type),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {a.type[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{a.title}</div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{a.contact}</div>
              </div>
              <div style={{ fontSize: 11, color: C.tertiary, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                <div style={{ fontWeight: 500 }}>{a.date}</div>
                <div>{a.time}</div>
              </div>
            </Row>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ContactsView() {
  const { t } = useTranslation();
  const { data, loading } = useApi<typeof FALLBACK_CONTACTS>(`${API}/api/contacts`);
  const allContacts = (data && data.length > 0) ? data : FALLBACK_CONTACTS;
  const [search, setSearch] = useState("");
  const contacts = allContacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search') + ' ' + t('nav.contacts').toLowerCase() + '…'}
          style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "9px 14px", fontSize: 13, color: C.text,
            outline: "none", boxShadow: shadow.sm, fontFamily: "inherit",
          }}
        />
        <Btn>+ {t('common.add')}</Btn>
      </div>

      {loading ? (
        <Card>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `0.5px solid ${C.separator}` }}>
              <Skeleton width="36px" height="36px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                <Skeleton height="14px" width="30%" />
                <Skeleton height="11px" width="50%" />
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card title={`${contacts.length} kontakter`}>
          {contacts.length === 0 ? (
            <EmptyState icon="👤" title={t('common.noData')} subtitle={t('common.search')} />
          ) : (
            contacts.map((c, i) => (
              <Row key={i} border={i < contacts.length - 1}>
                <Avatar name={c.name ?? "?"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{c.role} · {c.company}</div>
                </div>
                <div style={{ fontSize: 12, color: C.secondary }}>{c.email}</div>
                <div style={{ fontSize: 12, color: C.tertiary, fontVariantNumeric: "tabular-nums" }}>{c.phone}</div>
                <Badge color={c.status === "ACTIVE" ? C.green : c.status === "LEAD" ? C.blue : C.tertiary}>
                  {c.status}
                </Badge>
              </Row>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

function CompaniesView() {
  const { t } = useTranslation();
  const { data, loading } = useApi<typeof FALLBACK_COMPANIES>(`${API}/api/companies`);
  const companies = (data && data.length > 0) ? data : FALLBACK_COMPANIES;
  const totalVal = companies.reduce((s, c) => s + (c.dealValue ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: t('companies.title'), value: companies.length, color: C.blue },
          { label: t('deals.totalPipeline'), value: formatEur(totalVal), color: C.green },
          { label: t('common.active'), value: companies.filter(c => c.status === "CUSTOMER").length, color: C.purple },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10, padding: "18px 20px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.label}</div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <Card><Skeleton height="200px" /></Card>
      ) : (
        <Card title={t('companies.title')}>
          {companies.map((c, i) => {
            const pct = (c.dealValue ?? 0) / (totalVal || 1) * 100;
            const statusCol = c.status === "CUSTOMER" ? C.green : c.status === "PROSPECT" ? C.blue : C.tertiary;
            return (
              <div key={i} className="row-hover" style={{
                padding: "14px 6px",
                borderBottom: i < companies.length - 1 ? `0.5px solid ${C.separator}` : "none",
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: C.fill,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: C.secondary,
                  }}>
                    {c.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                      {c.industry} · {c.contacts} kontakter
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: 16, fontWeight: 700, color: C.text,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {formatEur(c.dealValue)}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Badge color={statusCol}>{c.status}</Badge>
                    </div>
                  </div>
                </div>
                <Bar pct={pct} color={statusCol} height={3} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

function LeadsView() {
  const { data, loading } = useApi<typeof FALLBACK_LEADS>(`${API}/api/leads`);
  const leads = (data && data.length > 0) ? data : FALLBACK_LEADS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn>+ Nytt lead</Btn>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 10, padding: 14, boxShadow: shadow.sm }}>
              <Skeleton height="100px" />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, overflowX: "auto" }}>
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage);
            const stageVal = stageLeads.reduce((s, l) => s + (l.value ?? 0), 0);
            const color = stageColor(stage);
            return (
              <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Column header */}
                <div style={{
                  background: color + "10", borderRadius: 10, padding: "10px 12px",
                  borderTop: `3px solid ${color}`,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {stage}
                  </div>
                  <div style={{
                    fontSize: 13, color: C.secondary, marginTop: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {formatEur(stageVal)} · {stageLeads.length}
                  </div>
                </div>

                {stageLeads.length === 0 ? (
                  <div style={{
                    background: C.fill, borderRadius: 10, padding: "20px 12px",
                    textAlign: "center", fontSize: 12, color: C.tertiary,
                  }}>
                    Inga leads
                  </div>
                ) : (
                  stageLeads.map((lead, i) => (
                    <div
                      key={i}
                      className="card-hover"
                      style={{
                        background: C.surface, borderRadius: 10, padding: "12px 14px",
                        boxShadow: shadow.sm, cursor: "pointer",
                        animation: `slideUp 0.15s ease ${i * 0.04}s backwards`,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>
                        {lead.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.secondary }}>{lead.company}</div>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginTop: 10,
                      }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700, color,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {formatEur(lead.value)}
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: avatarColor(lead.assignee ?? "") + "18",
                          color: avatarColor(lead.assignee ?? ""),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700,
                        }}>
                          {(lead.assignee ?? "?")[0]}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10, color: C.tertiary, marginTop: 4,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {lead.created}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DealsView() {
  const { t } = useTranslation();
  const { data, loading } = useApi<typeof FALLBACK_DEALS>(`${API}/api/deals`);
  const deals = (data && data.length > 0) ? data : FALLBACK_DEALS;
  const [sortBy, setSortBy] = useState<"value" | "probability">("value");
  const sorted = [...deals].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2, background: C.fill, borderRadius: 10, padding: 3 }}>
          {(["value", "probability"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                background: sortBy === s ? C.surface : "transparent",
                color: sortBy === s ? C.text : C.secondary,
                border: "none", borderRadius: 8, padding: "6px 14px",
                fontSize: 12, fontWeight: sortBy === s ? 600 : 400,
                cursor: "pointer", boxShadow: sortBy === s ? shadow.sm : "none",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              {s === "value" ? t('deals.value') : t('deals.probability')}
            </button>
          ))}
        </div>
        <Btn>+ {t('deals.new')}</Btn>
      </div>

      {loading ? (
        <Card><Skeleton height="200px" /></Card>
      ) : (
        <Card title={t('deals.title')}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr" }}>
            {[t('deals.title'), t('deals.value'), t('common.status'), t('deals.probability'), t('common.date')].map(h => (
              <div key={h} style={{
                padding: "8px 0",
                fontSize: 11, fontWeight: 600, color: C.tertiary,
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: `0.5px solid ${C.border}`,
              }}>
                {h}
              </div>
            ))}
            {sorted.map((d, i) => {
              const color = stageColor(d.stage);
              const prob = d.probability ?? 0;
              const overdue = d.stage !== "WON" && new Date(d.close) < new Date();
              return [
                <div key={`n${i}`} style={{
                  padding: "12px 0", borderBottom: `0.5px solid ${C.separator}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{d.company} · {d.owner}</div>
                </div>,
                <div key={`v${i}`} style={{
                  padding: "12px 0", borderBottom: `0.5px solid ${C.separator}`,
                  display: "flex", alignItems: "center",
                  fontSize: 15, fontWeight: 700, color: C.text,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {formatEur(d.value)}
                </div>,
                <div key={`s${i}`} style={{
                  padding: "12px 0", borderBottom: `0.5px solid ${C.separator}`,
                  display: "flex", alignItems: "center",
                }}>
                  <Badge color={color}>{d.stage}</Badge>
                </div>,
                <div key={`p${i}`} style={{
                  padding: "12px 0", borderBottom: `0.5px solid ${C.separator}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <div style={{ flex: 1, height: 4, background: C.fill, borderRadius: 2 }}>
                    <div style={{
                      height: "100%", width: `${prob}%`, background: color, borderRadius: 2,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12, color: C.secondary, minWidth: 30,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {prob}%
                  </span>
                </div>,
                <div key={`c${i}`} style={{
                  padding: "12px 0", borderBottom: `0.5px solid ${C.separator}`,
                  display: "flex", alignItems: "center",
                  fontSize: 12, color: overdue ? C.red : C.tertiary,
                  fontFamily: "monospace", fontVariantNumeric: "tabular-nums",
                  fontWeight: overdue ? 600 : 400,
                }}>
                  {overdue ? "⚠ " : ""}{d.close}
                </div>,
              ];
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActivitiesView() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"ALL" | "TASK" | "MEETING" | "CALL" | "EMAIL">("ALL");
  const activities = FALLBACK_ACTIVITIES.filter(a => filter === "ALL" || a.type === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2, background: C.fill, borderRadius: 10, padding: 3 }}>
          {(["ALL", "TASK", "MEETING", "CALL", "EMAIL"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? C.surface : "transparent",
                color: filter === f ? C.text : C.secondary,
                border: "none", borderRadius: 8, padding: "6px 12px",
                fontSize: 12, fontWeight: filter === f ? 600 : 400,
                cursor: "pointer", boxShadow: filter === f ? shadow.sm : "none",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              {f === "ALL" ? t('common.all') : f}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Btn size="sm">+ {t('nav.activities')}</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: t('tasks.dueToday'), value: FALLBACK_ACTIVITIES.filter(a => a.date === "2026-03-21" && !a.done).length, color: C.blue },
          { label: t('common.completed'), value: FALLBACK_ACTIVITIES.filter(a => a.date === "2026-03-21" && a.done).length, color: C.green },
          { label: t('common.type'), value: FALLBACK_ACTIVITIES.filter(a => a.type === "MEETING").length, color: C.purple },
          { label: t('tasks.title'), value: FALLBACK_ACTIVITIES.filter(a => a.type === "TASK").length, color: C.orange },
        ].map((s, i) => (
          <div key={i} className="card-animate" style={{
            background: C.surface, borderRadius: 10, padding: "16px 18px", boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.secondary }}>{s.label}</div>
            <div style={{
              fontSize: 26, fontWeight: 700, color: s.color, marginTop: 6,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <Card title={`${t('nav.activities')} (${activities.length})`}>
        {activities.length === 0 ? (
          <EmptyState icon="📅" title={t('common.noData')} subtitle={t('nav.activities')} cta={`+ ${t('common.add')}`} />
        ) : (
          activities.map((a, i) => (
            <Row key={i} border={i < activities.length - 1}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: actColor(a.type) + "15", color: actColor(a.type),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {a.type[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  color: a.done ? C.tertiary : C.text,
                  textDecoration: a.done ? "line-through" : "none",
                }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{a.contact}</div>
              </div>
              <Badge color={actColor(a.type)}>{a.type}</Badge>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.secondary, fontVariantNumeric: "tabular-nums" }}>
                  {a.date}
                </div>
                <div style={{ fontSize: 11, color: C.tertiary }}>{a.time}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: a.done ? C.green + "18" : C.fill,
                border: `1.5px solid ${a.done ? C.green : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {a.done && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </Row>
          ))
        )}
      </Card>
    </div>
  );
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState("overview");
  const navItems = useNavItems();

  const viewComponents: Record<string, React.ReactNode> = {
    overview: <OverviewView />,
    contacts: <ContactsView />,
    companies: <CompaniesView />,
    leads: <LeadsView />,
    deals: <DealsView />,
    activities: <ActivitiesView />,
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
          {/* Logo */}
          <div style={{
            height: 52,
            padding: "0 16px",
            borderBottom: `0.5px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #AF52DE, #5856D6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>CRM</div>
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
              background: C.purple + "18", color: C.purple,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>
              E
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Erik Svensson</div>
              <div style={{ fontSize: 11, color: C.tertiary }}>Säljchef</div>
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
              <div style={{ fontSize: 12, color: C.tertiary, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                {new Date().toLocaleDateString("sv-SE")}
              </div>
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
