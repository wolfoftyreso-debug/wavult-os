// ConsumablesModule.tsx — Consumables Management System
// Operational Cost Control Engine
// Apple HIG design — clean, dense, functional

import { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  bas_account?: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  days_until_empty?: number | null;
  avg_daily_consumption?: number | null;
  auto_consume_enabled?: boolean;
  location_description?: string;
  qr_code?: string;
  stock_status?: "ok" | "warning" | "critical";
}

interface UsageRecord {
  id: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  usage_type: string;
  user_id?: string;
  work_order_id?: string;
  notes?: string;
  created_at: string;
  consumable_items?: { name: string; category: string; unit: string };
}

interface ConsumableOrder {
  id: string;
  order_number: string;
  status: string;
  items: OrderLine[];
  total_amount: number;
  currency: string;
  requested_at: string;
  delivered_at?: string;
}

interface OrderLine {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

interface CostSummary {
  period: string;
  total_current: number;
  total_previous: number;
  trend_pct: number | null;
  by_category: Record<string, number>;
  top_10_items: { item_id: string; name: string; category: string; total: number }[];
}

// ---------------------------------------------------------------------------
// API base
// ---------------------------------------------------------------------------
const API = (window as any).__VITE_API_URL || import.meta.env.VITE_API_URL || "https://api.bc.pixdrift.com";

async function api(path: string, opts: RequestInit = {}) {
  const orgId = localStorage.getItem("org_id") || "00000000-0000-0000-0000-000000000000";
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-org-id": orgId,
      ...((opts.headers as any) || {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Category colors & labels
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<string, string> = {
  WORKSHOP: "#3B82F6",
  OFFICE: "#8B5CF6",
  HYGIENE: "#10B981",
  SAFETY: "#F59E0B",
  CLEANING: "#06B6D4",
  PRINTED: "#6B7280",
  PACKAGING: "#EC4899",
  OTHER: "#9CA3AF",
};

const CATEGORY_LABELS: Record<string, string> = {
  WORKSHOP: "Verkstad",
  OFFICE: "Kontor",
  HYGIENE: "Hygien",
  SAFETY: "Skydd",
  CLEANING: "Städ",
  PRINTED: "Tryckt",
  PACKAGING: "Förpackning",
  OTHER: "Övrigt",
};

// ---------------------------------------------------------------------------
// Stock status helpers
// ---------------------------------------------------------------------------
function stockColor(item: ConsumableItem): string {
  if (item.current_stock <= item.min_stock) return "#EF4444";
  if (item.days_until_empty !== null && item.days_until_empty !== undefined && item.days_until_empty <= 3) return "#EF4444";
  if (item.days_until_empty !== null && item.days_until_empty !== undefined && item.days_until_empty <= 7) return "#F59E0B";
  return "#10B981";
}

function stockLabel(item: ConsumableItem): string {
  if (item.current_stock <= item.min_stock) return "Kritiskt";
  if (item.days_until_empty !== null && item.days_until_empty !== undefined && item.days_until_empty <= 3) return `${item.days_until_empty}d`;
  if (item.days_until_empty !== null && item.days_until_empty !== undefined && item.days_until_empty <= 7) return `${item.days_until_empty}d`;
  return "OK";
}

function fmt(n: number): string {
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtCost(n: number): string {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}

// ---------------------------------------------------------------------------
// Mini status badge
// ---------------------------------------------------------------------------
function StatusBadge({ item }: { item: ConsumableItem }) {
  const color = stockColor(item);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      background: color + "22",
      color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {stockLabel(item)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// View: Dashboard
// ---------------------------------------------------------------------------
function DashboardView({ items, usage, onUse }: {
  items: ConsumableItem[];
  usage: UsageRecord[];
  onUse: (item: ConsumableItem) => void;
}) {
  const lowStock = items.filter(i => i.current_stock <= i.min_stock);
  const criticalItems = items.filter(i => stockColor(i) === "#EF4444");
  const monthCost = usage.reduce((s, u) => s + Number(u.total_cost || 0), 0);

  return (
    <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <KPICard
          label="Kostnad denna månad"
          value={fmtCost(monthCost)}
          accent="#3B82F6"
        />
        <KPICard
          label="Under miniminivå"
          value={String(lowStock.length)}
          accent={lowStock.length > 0 ? "#EF4444" : "#10B981"}
          badge={lowStock.length > 0 ? "!" : undefined}
        />
        <KPICard
          label="Totalt artiklar"
          value={String(items.length)}
          accent="#8B5CF6"
        />
      </div>

      {/* Low stock alerts */}
      {criticalItems.length > 0 && (
        <Section title={`⚠️ Beställning behövs (${criticalItems.length})`} accent="#EF4444">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {criticalItems.slice(0, 5).map(item => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "#FEF2F2", borderRadius: 10,
                border: "1px solid #FECACA",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    Kvar: {item.current_stock} {item.unit} · Min: {item.min_stock} {item.unit}
                  </div>
                </div>
                <button onClick={() => onUse(item)} style={btnStyle("#EF4444")}>Använd</button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent activity */}
      <Section title="Senaste aktivitet">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {usage.slice(0, 8).map(u => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", background: "#F9FAFB", borderRadius: 8,
            }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  {u.consumable_items?.name || u.item_id}
                </span>
                <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
                  {u.usage_type === "AUTO" ? "Auto" : u.usage_type === "QR_SCAN" ? "QR" : "Manuell"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                −{u.quantity} · {fmtCost(Number(u.total_cost || 0))}
              </div>
            </div>
          ))}
          {usage.length === 0 && (
            <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", padding: 16 }}>
              Ingen aktivitet ännu
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View: Stock List
// ---------------------------------------------------------------------------
function StockListView({ items, onUse, onRefresh }: {
  items: ConsumableItem[];
  onUse: (item: ConsumableItem) => void;
  onRefresh: () => void;
}) {
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const categories = ["ALL", ...Array.from(new Set(items.map(i => i.category)))];

  const filtered = items.filter(i => {
    if (filterCat !== "ALL" && i.category !== filterCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort: critical first
  const sorted = [...filtered].sort((a, b) => {
    const score = (i: ConsumableItem) => {
      if (i.current_stock <= i.min_stock) return 0;
      if (stockColor(i) === "#F59E0B") return 1;
      return 2;
    };
    return score(a) - score(b);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px 0" }}>
      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          placeholder="Sök artikel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: filterCat === cat ? "#1D1D1F" : "#F3F4F6",
              color: filterCat === cat ? "#fff" : "#6B7280",
            }}
          >
            {cat === "ALL" ? "Alla" : (CATEGORY_LABELS[cat] || cat)}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(item => (
          <ItemRow key={item.id} item={item} onUse={onUse} />
        ))}
        {sorted.length === 0 && (
          <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", padding: 24 }}>
            Inga artiklar hittades
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({ item, onUse }: { item: ConsumableItem; onUse: (i: ConsumableItem) => void }) {
  const color = stockColor(item);
  const pct = Math.min(100, (item.current_stock / Math.max(item.max_stock, item.min_stock * 2)) * 100);

  return (
    <div style={{
      padding: "12px 16px",
      background: "#fff",
      borderRadius: 12,
      border: `1px solid ${color === "#EF4444" ? "#FECACA" : "#E5E7EB"}`,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      {/* Category dot */}
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: CATEGORY_COLORS[item.category] || "#9CA3AF",
        flexShrink: 0,
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          {/* Stock bar */}
          <div style={{ flex: 1, height: 4, background: "#F3F4F6", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
            {item.current_stock} / {item.min_stock} {item.unit}
          </span>
        </div>
      </div>

      {/* Status + cost */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <StatusBadge item={item} />
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{fmtCost(item.unit_cost)}/{item.unit}</span>
      </div>

      {/* Use button */}
      <button onClick={() => onUse(item)} style={btnStyle("#3B82F6")}>Använd</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View: Usage Log
// ---------------------------------------------------------------------------
function UsageLogView({ orgId }: { orgId: string }) {
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/consumables/usage?limit=100")
      .then(setUsage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usage.map(u => (
          <div key={u.id} style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 12,
            alignItems: "center",
            padding: "10px 14px",
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {u.consumable_items?.name || "Okänd artikel"}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                {new Date(u.created_at).toLocaleString("sv-SE")}
                {u.work_order_id ? ` · AO: ${u.work_order_id}` : ""}
                {u.notes ? ` · ${u.notes}` : ""}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: "2px 8px", borderRadius: 999,
              background: u.usage_type === "AUTO" ? "#EDE9FE" : u.usage_type === "QR_SCAN" ? "#DCFCE7" : "#F3F4F6",
              color: u.usage_type === "AUTO" ? "#7C3AED" : u.usage_type === "QR_SCAN" ? "#16A34A" : "#6B7280",
            }}>
              {u.usage_type === "AUTO" ? "Auto" : u.usage_type === "QR_SCAN" ? "QR" : u.usage_type === "ADJUSTMENT" ? "Justering" : "Manuell"}
            </span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>−{u.quantity} {u.consumable_items?.unit || "st"}</div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>{fmtCost(Number(u.total_cost || 0))}</div>
            </div>
          </div>
        ))}
        {usage.length === 0 && (
          <div style={{ color: "#9CA3AF", textAlign: "center", padding: 32, fontSize: 14 }}>
            Ingen förbrukningshistorik ännu
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View: Orders
// ---------------------------------------------------------------------------
function OrdersView({ items }: { items: ConsumableItem[] }) {
  const [orders, setOrders] = useState<ConsumableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const lowStockItems = items.filter(i => i.current_stock <= i.min_stock);

  useEffect(() => {
    api("/api/consumables/orders")
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleOrderAllLowStock = async () => {
    if (lowStockItems.length === 0) return;
    setCreating(true);
    try {
      const order = await api("/api/consumables/orders", {
        method: "POST",
        body: JSON.stringify({ auto_from_low_stock: true }),
      });
      setOrders(prev => [order, ...prev]);
    } catch (e: any) {
      alert("Fel: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      const updated = await api(`/api/consumables/orders/${orderId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approved_by: localStorage.getItem("user_id") || "system" }),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (e: any) {
      alert("Fel: " + e.message);
    }
  };

  const handleDeliver = async (orderId: string) => {
    try {
      const updated = await api(`/api/consumables/orders/${orderId}/deliver`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (e: any) {
      alert("Fel: " + e.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: "#9CA3AF",
    PENDING_APPROVAL: "#F59E0B",
    APPROVED: "#3B82F6",
    ORDERED: "#8B5CF6",
    DELIVERED: "#10B981",
    PARTIAL: "#06B6D4",
    CANCELLED: "#EF4444",
  };

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Utkast",
    PENDING_APPROVAL: "Väntar godkännande",
    APPROVED: "Godkänd",
    ORDERED: "Beställd",
    DELIVERED: "Levererad",
    PARTIAL: "Delleverans",
    CANCELLED: "Avbruten",
  };

  return (
    <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* One-click order button */}
      {lowStockItems.length > 0 && (
        <div style={{
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {lowStockItems.length} artiklar behöver beställas
            </div>
            <div style={{ fontSize: 13, color: "#9A3412", marginTop: 2 }}>
              {lowStockItems.map(i => i.name).join(", ")}
            </div>
          </div>
          <button
            onClick={handleOrderAllLowStock}
            disabled={creating}
            style={{ ...btnStyle("#F59E0B"), padding: "10px 20px", fontSize: 14 }}
          >
            {creating ? "Skapar..." : "Beställ alla"}
          </button>
        </div>
      )}

      {/* Orders list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map(order => (
          <div key={order.id} style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #F3F4F6",
            }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{order.order_number}</span>
                <span style={{
                  marginLeft: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: (STATUS_COLORS[order.status] || "#9CA3AF") + "22",
                  color: STATUS_COLORS[order.status] || "#9CA3AF",
                }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtCost(order.total_amount)}</span>
                {order.status === "DRAFT" && (
                  <button onClick={() => handleApprove(order.id)} style={btnStyle("#3B82F6")}>
                    Godkänn
                  </button>
                )}
                {(order.status === "APPROVED" || order.status === "ORDERED") && (
                  <button onClick={() => handleDeliver(order.id)} style={btnStyle("#10B981")}>
                    Levererad
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: "10px 18px" }}>
              {(order.items || []).map((line, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                  borderBottom: i < order.items.length - 1 ? "1px solid #F9FAFB" : "none",
                }}>
                  <span>{line.item_name}</span>
                  <span style={{ color: "#6B7280" }}>
                    {line.quantity} × {fmtCost(line.unit_cost)} = {fmtCost(line.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div style={{ color: "#9CA3AF", textAlign: "center", padding: 32, fontSize: 14 }}>
            Inga beställningar ännu
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View: Cost Report
// ---------------------------------------------------------------------------
function CostReportView() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/consumables/costs/summary?period=${period}`)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <LoadingSpinner />;
  if (!summary) return <div style={{ color: "#9CA3AF", textAlign: "center", padding: 32 }}>Ingen data</div>;

  const maxTop = Math.max(...(summary.top_10_items || []).map(i => i.total), 1);

  return (
    <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["month", "quarter", "year"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: period === p ? "#1D1D1F" : "#F3F4F6",
              color: period === p ? "#fff" : "#6B7280",
            }}
          >
            {p === "month" ? "Månad" : p === "quarter" ? "Kvartal" : "År"}
          </button>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <KPICard
          label={period === "month" ? "Kostnad denna månad" : period === "quarter" ? "Kostnad detta kvartal" : "Kostnad detta år"}
          value={fmtCost(summary.total_current)}
          accent="#3B82F6"
        />
        <KPICard
          label="Föregående period"
          value={fmtCost(summary.total_previous)}
          accent={summary.trend_pct !== null && summary.trend_pct > 0 ? "#EF4444" : "#10B981"}
          badge={summary.trend_pct !== null ? `${summary.trend_pct > 0 ? "+" : ""}${summary.trend_pct}%` : undefined}
        />
      </div>

      {/* Top 10 items */}
      <Section title="Top 10 artiklar (kostnad)">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {summary.top_10_items.map((item, i) => (
            <div key={item.item_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF", width: 20, textAlign: "right" }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{item.name}</div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${(item.total / maxTop) * 100}%`,
                    height: "100%",
                    background: CATEGORY_COLORS[item.category] || "#3B82F6",
                    borderRadius: 3,
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>
                {fmtCost(item.total)}
              </span>
            </div>
          ))}
          {summary.top_10_items.length === 0 && (
            <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", padding: 16 }}>
              Ingen förbrukningsdata för perioden
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Use item modal
// ---------------------------------------------------------------------------
function UseItemModal({ item, onClose, onSuccess }: {
  item: ConsumableItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api(`/api/consumables/${item.id}/use`, {
        method: "POST",
        body: JSON.stringify({ quantity: qty, notes, user_id: localStorage.getItem("user_id") }),
      });
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (e: any) {
      alert("Fel: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          padding: "24px 24px 40px",
          width: "100%",
          maxWidth: 480,
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginTop: 12 }}>Registrerat!</div>
            <div style={{ color: "#6B7280", fontSize: 14 }}>{qty} {item.unit} avdraget</div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Registrera förbrukning
            </div>
            <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>{item.name}</div>

            {/* Quantity stepper */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <button
                onClick={() => setQty(Math.max(0.5, qty - 1))}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: "1px solid #E5E7EB", background: "#F9FAFB",
                  fontSize: 20, cursor: "pointer",
                }}
              >−</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>{qty}</span>
                <span style={{ fontSize: 16, color: "#9CA3AF", marginLeft: 4 }}>{item.unit}</span>
              </div>
              <button
                onClick={() => setQty(qty + 1)}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: "1px solid #E5E7EB", background: "#F9FAFB",
                  fontSize: 20, cursor: "pointer",
                }}
              >+</button>
            </div>

            <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 16 }}>
              Kostnad: {fmtCost(qty * item.unit_cost)}
              {item.bas_account ? ` · BAS ${item.bas_account}` : ""}
            </div>

            <input
              placeholder="Notering (valfritt)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading || qty <= 0}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: "#1D1D1F",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Sparar..." : "Bekräfta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------
function KPICard({ label, value, accent, badge }: {
  label: string;
  value: string;
  accent: string;
  badge?: string;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E5E7EB",
      borderRadius: 14,
      padding: "16px 18px",
      position: "relative",
    }}>
      <div style={{
        width: 4, height: 32,
        background: accent,
        borderRadius: 2,
        position: "absolute",
        left: 0, top: "50%",
        transform: "translateY(-50%)",
      }} />
      <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F" }}>
        {value}
        {badge && (
          <span style={{
            fontSize: 12, fontWeight: 700,
            marginLeft: 8,
            padding: "2px 8px",
            borderRadius: 999,
            background: accent + "22",
            color: accent,
          }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, accent, children }: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: accent || "#1D1D1F",
        marginBottom: 10, letterSpacing: "0.02em",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48, color: "#9CA3AF" }}>
      Laddar...
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    background: color,
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

// ---------------------------------------------------------------------------
// Main ConsumablesModule
// ---------------------------------------------------------------------------
const TABS = [
  { id: "dashboard", label: "Översikt" },
  { id: "stock", label: "Lager" },
  { id: "usage", label: "Historik" },
  { id: "orders", label: "Beställningar" },
  { id: "costs", label: "Kostnader" },
];

export default function ConsumablesModule() {
  const [tab, setTab] = useState("dashboard");
  const [items, setItems] = useState<ConsumableItem[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [useItem, setUseItem] = useState<ConsumableItem | null>(null);

  const orgId = localStorage.getItem("org_id") || "";

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, usageData] = await Promise.all([
        api("/api/consumables"),
        api("/api/consumables/usage?limit=20"),
      ]);
      setItems(itemsData || []);
      setUsage(usageData || []);
    } catch (e) {
      console.error("Failed to load consumables:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const lowStockCount = items.filter(i => i.current_stock <= i.min_stock).length;

  return (
    <div style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: "0 16px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1D1D1F" }}>
              Förbrukning
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#9CA3AF" }}>
              Kostnadskontroll · Lagerhantering · Autoavdrag
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {lowStockCount > 0 && (
              <span style={{
                background: "#EF4444",
                color: "#fff",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 10px",
              }}>
                {lowStockCount} lågt
              </span>
            )}
            <button onClick={loadData} style={{ ...btnStyle("#6B7280"), padding: "6px 12px" }}>
              ↻
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          marginTop: 20,
          borderBottom: "1px solid #E5E7EB",
          paddingBottom: 0,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? "#1D1D1F" : "#9CA3AF",
                borderBottom: tab === t.id ? "2px solid #1D1D1F" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {tab === "dashboard" && (
            <DashboardView items={items} usage={usage} onUse={setUseItem} />
          )}
          {tab === "stock" && (
            <StockListView items={items} onUse={setUseItem} onRefresh={loadData} />
          )}
          {tab === "usage" && <UsageLogView orgId={orgId} />}
          {tab === "orders" && <OrdersView items={items} />}
          {tab === "costs" && <CostReportView />}
        </>
      )}

      {/* Use item modal */}
      {useItem && (
        <UseItemModal
          item={useItem}
          onClose={() => setUseItem(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
