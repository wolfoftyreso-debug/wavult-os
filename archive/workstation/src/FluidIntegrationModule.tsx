/**
 * FluidIntegrationModule.tsx
 * Vätskeautomatik — Alantec & Orion fluid management integration
 *
 * Tab 1: Live dispense feed (today's events)
 * Tab 2: Tank inventory / levels
 * Tab 3: System configuration
 * Tab 4: Consumption report
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "./useApi";

// ─── Design tokens (matches Dashboard) ───────────────────────────────────────
const C = {
  bg:        "#F2F2F7",
  surface:   "#FFFFFF",
  border:    "#D1D1D6",
  text:      "#000000",
  secondary: "#8E8E93",
  tertiary:  "#C7C7CC",
  blue:      "#007AFF",
  green:     "#34C759",
  orange:    "#FF9500",
  red:       "#FF3B30",
  purple:    "#AF52DE",
  fill:      "#F2F2F7",
  inset:     "#E5E5EA",
};
const shadow = "0 1px 3px rgba(0,0,0,0.06)";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FluidEvent {
  id: string;
  fluid_type: string;
  fluid_name: string;
  fluid_grade?: string;
  quantity_liters: number;
  unit_price_per_liter?: number;
  total_cost?: number;
  dispenser_id: string;
  dispenser_location?: string;
  technician_id?: string;
  vehicle_reg?: string;
  work_order_id?: string;
  booked_to_work_order: boolean;
  bas_account?: string;
  dispensed_at: string;
}

interface TankLevel {
  id: string;
  fluid_type: string;
  fluid_name: string;
  fluid_grade?: string;
  current_level_liters: number;
  tank_capacity_liters: number;
  level_pct: number;
  reorder_point_liters: number;
  last_updated: string;
}

interface FluidIntegration {
  id: string;
  provider: "ALANTEC" | "ORION" | "SWINGO" | "MECLUBE" | "SAMOA" | "CUSTOM";
  display_name: string;
  device_serial?: string;
  location?: string;
  sync_mode: "WEBHOOK" | "POLLING" | "MANUAL";
  last_sync_at?: string;
  is_active: boolean;
}

// ─── MOCK DATA — replace with real API calls ──────────────────────────────────

const MOCK_EVENTS: FluidEvent[] = [
  {
    id: "1",
    fluid_type: "ENGINE_OIL",
    fluid_name: "Castrol Edge 5W-30",
    fluid_grade: "5W-30",
    quantity_liters: 4.5,
    unit_price_per_liter: 10.0,
    total_cost: 45.0,
    dispenser_id: "DISP-01",
    dispenser_location: "Lift 2",
    technician_id: "Robin Björk",
    vehicle_reg: "ABC 123",
    work_order_id: "WO-2026-042",
    booked_to_work_order: true,
    bas_account: "4010",
    dispensed_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "2",
    fluid_type: "BRAKE_FLUID",
    fluid_name: "Bromsvätska DOT4",
    fluid_grade: "DOT4",
    quantity_liters: 0.5,
    unit_price_per_liter: 17.0,
    total_cost: 8.5,
    dispenser_id: "DISP-02",
    technician_id: "Eric Karlsson",
    vehicle_reg: "DEF 456",
    work_order_id: "WO-2026-041",
    booked_to_work_order: true,
    bas_account: "4010",
    dispensed_at: new Date(Date.now() - 66 * 60000).toISOString(),
  },
  {
    id: "3",
    fluid_type: "COOLANT",
    fluid_name: "Kylarvätska G12+",
    quantity_liters: 2.0,
    unit_price_per_liter: 9.0,
    total_cost: 18.0,
    dispenser_id: "DISP-01",
    technician_id: "Jonas Lindström",
    booked_to_work_order: false,
    dispensed_at: new Date(Date.now() - 98 * 60000).toISOString(),
  },
];

const MOCK_TANKS: TankLevel[] = [
  { id: "t1", fluid_type: "ENGINE_OIL",    fluid_name: "Motorolja 5W-30",   fluid_grade: "5W-30", current_level_liters: 39,  tank_capacity_liters: 50, level_pct: 78, reorder_point_liters: 10, last_updated: new Date().toISOString() },
  { id: "t2", fluid_type: "ENGINE_OIL",    fluid_name: "Motorolja 0W-20",   fluid_grade: "0W-20", current_level_liters: 31,  tank_capacity_liters: 50, level_pct: 62, reorder_point_liters: 10, last_updated: new Date().toISOString() },
  { id: "t3", fluid_type: "BRAKE_FLUID",   fluid_name: "Bromsvätska DOT4",  fluid_grade: "DOT4",  current_level_liters: 13,  tank_capacity_liters: 25, level_pct: 52, reorder_point_liters: 5,  last_updated: new Date().toISOString() },
  { id: "t4", fluid_type: "COOLANT",       fluid_name: "Kylarvätska G12+",                        current_level_liters: 20,  tank_capacity_liters: 50, level_pct: 40, reorder_point_liters: 12, last_updated: new Date().toISOString() },
  { id: "t5", fluid_type: "ADBLUE",        fluid_name: "AdBlue",                                  current_level_liters: 188, tank_capacity_liters: 200, level_pct: 94, reorder_point_liters: 40, last_updated: new Date().toISOString() },
];

const MOCK_INTEGRATIONS: FluidIntegration[] = [
  {
    id: "int-1",
    provider: "ALANTEC",
    display_name: "Alantec FDS-3000",
    device_serial: "FDS3000-SE-2024-007",
    location: "Lift 1-4",
    sync_mode: "WEBHOOK",
    last_sync_at: new Date(Date.now() - 2 * 60000).toISOString(),
    is_active: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLUID_LABELS: Record<string, string> = {
  ENGINE_OIL:            "Motorolja",
  TRANSMISSION_OIL:      "Växellådsolja",
  BRAKE_FLUID:           "Bromsvätska",
  COOLANT:               "Kylarvätska",
  ADBLUE:                "AdBlue",
  WINDSHIELD_WASHER:     "Spolarvätska",
  POWER_STEERING_FLUID:  "Servoolja",
  DIFFERENTIAL_OIL:      "Differentialolja",
  HYDRAULIC_OIL:         "Hydraulolja",
  GEAR_OIL:              "Växelolja",
  OTHER:                 "Övrigt",
};

const PROVIDER_LABELS: Record<string, string> = {
  ALANTEC: "Alantec",
  ORION:   "Orion / Tecalemit",
  SWINGO:  "Swingo",
  MECLUBE: "Meclube",
  SAMOA:   "Samoa",
  CUSTOM:  "Anpassat system",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function fmtEur(n: number) {
  return `€${n.toFixed(2).replace(".", ",")}`;
}

function relativeSync(iso?: string) {
  if (!iso) return "Aldrig";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just nu";
  if (mins < 60) return `${mins} min sedan`;
  return `${Math.floor(mins / 60)} tim sedan`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 16px",
      background: active ? C.blue : "transparent",
      color: active ? "#FFF" : C.secondary,
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 100,
    background: color + "18", color, fontSize: 11, fontWeight: 600,
  }}>
    {children}
  </span>
);

const ProgressBar = ({ pct, reorderPct }: { pct: number; reorderPct: number }) => {
  const color = pct <= reorderPct ? C.red : pct <= reorderPct * 1.5 ? C.orange : C.green;
  return (
    <div style={{ position: "relative", height: 6, background: C.inset, borderRadius: 3, flex: 1 }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: color,
        borderRadius: 3, transition: "width 0.4s ease",
      }} />
      {/* Reorder marker */}
      <div style={{
        position: "absolute", top: -2, left: `${reorderPct}%`,
        width: 2, height: 10, background: C.orange, borderRadius: 1,
      }} />
    </div>
  );
};

// ─── Tab 1: Live Feed ─────────────────────────────────────────────────────────

const LiveFeedTab = ({ events, onLink }: { events: FluidEvent[]; onLink: (id: string) => void }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {events.length === 0 && (
      <div style={{ color: C.secondary, fontSize: 14, textAlign: "center", padding: 40 }}>
        Inga dispenseringar idag
      </div>
    )}
    {events.map(ev => (
      <div key={ev.id} style={{
        background: C.surface, borderRadius: 10, padding: "14px 16px",
        border: `0.5px solid ${ev.booked_to_work_order ? C.border : C.orange}`,
        boxShadow: shadow,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, color: C.secondary, fontVariantNumeric: "tabular-nums" }}>
              {fmtTime(ev.dispensed_at)}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                {ev.technician_id ?? "Okänd tekniker"}
              </span>
              {ev.vehicle_reg && (
                <span style={{ fontSize: 12, color: C.secondary }}>· {ev.vehicle_reg}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {ev.booked_to_work_order ? (
              <Badge color={C.green}>Bokfört ✓</Badge>
            ) : (
              <Badge color={C.orange}>⚠ Ej kopplat</Badge>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: C.text }}>
              {ev.fluid_name}
              {ev.fluid_grade && <span style={{ color: C.secondary }}> {ev.fluid_grade}</span>}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                {ev.quantity_liters.toFixed(1)} L
              </span>
              {ev.total_cost != null && (
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                  {fmtEur(ev.total_cost)}
                </span>
              )}
              {ev.bas_account && (
                <span style={{ fontSize: 12, color: C.secondary }}>BAS: {ev.bas_account}</span>
              )}
              {ev.dispenser_location && (
                <span style={{ fontSize: 12, color: C.secondary }}>{ev.dispenser_location}</span>
              )}
            </div>
          </div>

          {!ev.booked_to_work_order && (
            <button
              onClick={() => onLink(ev.id)}
              style={{
                padding: "6px 12px", background: C.blue, color: "#FFF",
                border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Koppla till arbetsorder →
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
);

// ─── Tab 2: Tank Inventory ────────────────────────────────────────────────────

const InventoryTab = ({ tanks, onSync }: { tanks: TankLevel[]; onSync: () => void }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <button
        onClick={onSync}
        style={{
          padding: "7px 14px", background: C.fill, border: `0.5px solid ${C.border}`,
          borderRadius: 8, fontSize: 13, cursor: "pointer", color: C.text,
        }}
      >
        ↻ Synka nivåer
      </button>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tanks.map(tank => {
        const reorderPct = Math.round((tank.reorder_point_liters / tank.tank_capacity_liters) * 100);
        const isLow = tank.level_pct <= reorderPct;
        return (
          <div key={tank.id} style={{
            background: C.surface, borderRadius: 10, padding: "14px 16px",
            border: `0.5px solid ${isLow ? C.orange : C.border}`, boxShadow: shadow,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{tank.fluid_name}</span>
                {tank.fluid_grade && (
                  <span style={{ fontSize: 12, color: C.secondary, marginLeft: 6 }}>{tank.fluid_grade}</span>
                )}
                {isLow && <span style={{ marginLeft: 8, fontSize: 13 }}>⚠️</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: isLow ? C.orange : C.text }}>
                  {tank.level_pct}%
                </span>
                <span style={{ fontSize: 12, color: C.secondary, textAlign: "right" }}>
                  {tank.current_level_liters.toFixed(0)} L<br />av {tank.tank_capacity_liters.toFixed(0)} L
                </span>
              </div>
            </div>
            <ProgressBar pct={tank.level_pct} reorderPct={reorderPct} />
            {isLow && (
              <div style={{ marginTop: 6, fontSize: 12, color: C.orange }}>
                Under beställningsnivå ({tank.reorder_point_liters} L). Beställ ny leverans.
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: 11, color: C.tertiary }}>
              Uppdaterad {relativeSync(tank.last_updated)}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Tab 3: Configuration ─────────────────────────────────────────────────────

type ProviderID = FluidIntegration["provider"];

const ALL_PROVIDERS: Array<{ id: ProviderID; label: string; desc: string }> = [
  { id: "ALANTEC", label: "Alantec",         desc: "FDS-2000 / 3000 / 4000 · REST API + Webhook" },
  { id: "ORION",   label: "Orion Tecalemit", desc: "Orion Pro · REST JSON / XML-RPC" },
  { id: "SAMOA",   label: "Samoa",           desc: "Samoa legacy systems · XML-RPC" },
  { id: "SWINGO",  label: "Swingo",          desc: "Swingo fluid dispensers" },
  { id: "MECLUBE", label: "Meclube",         desc: "Meclube oil dispensers" },
  { id: "CUSTOM",  label: "Anpassat",        desc: "Generic webhook-kompatibelt system" },
];

const ConfigTab = ({
  integrations,
  onAdd,
  onTest,
  onRemove,
}: {
  integrations: FluidIntegration[];
  onAdd: (provider: string, name: string) => void;
  onTest: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const connectedIds = integrations.map(i => i.provider);
  const [adding, setAdding] = useState(false);
  const [newProvider, setNewProvider] = useState<FluidIntegration["provider"]>("ALANTEC");
  const [newName, setNewName] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Connected systems */}
      {integrations.map(int => (
        <div key={int.id} style={{
          background: C.surface, borderRadius: 10, padding: "14px 16px",
          border: `0.5px solid ${C.green}`, boxShadow: shadow,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: C.green, fontSize: 16 }}>✅</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{int.display_name}</span>
                {int.location && <span style={{ fontSize: 12, color: C.secondary }}>· {int.location}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.secondary }}>
                {int.device_serial && <span>S/N: {int.device_serial} · </span>}
                Sync: {int.sync_mode} · Senaste: {relativeSync(int.last_sync_at)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onTest(int.id)}
                style={{
                  padding: "5px 10px", background: C.fill, border: `0.5px solid ${C.border}`,
                  borderRadius: 7, fontSize: 12, cursor: "pointer", color: C.text,
                }}
              >
                Testa anslutning
              </button>
              <button
                onClick={() => onRemove(int.id)}
                style={{
                  padding: "5px 10px", background: "transparent", border: `0.5px solid ${C.border}`,
                  borderRadius: 7, fontSize: 12, cursor: "pointer", color: C.red,
                }}
              >
                Ta bort
              </button>
            </div>
          </div>
          {int.sync_mode === "WEBHOOK" && (
            <div style={{
              marginTop: 10, padding: "8px 10px", background: C.fill, borderRadius: 7,
              fontFamily: "monospace", fontSize: 11, color: C.secondary,
              wordBreak: "break-all",
            }}>
              Webhook URL: <strong style={{ color: C.text }}>https://api.pixdrift.com/api/fluid/webhook/{int.provider.toLowerCase()}?org_id=YOUR_ORG_ID</strong>
            </div>
          )}
        </div>
      ))}

      {/* Not-yet-connected */}
      {ALL_PROVIDERS.filter(p => !connectedIds.includes(p.id)).map(prov => (
        <div key={prov.id} style={{
          background: C.surface, borderRadius: 10, padding: "14px 16px",
          border: `0.5px solid ${C.border}`, boxShadow: shadow, opacity: 0.75,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ color: C.tertiary, fontSize: 16 }}>⚫</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.secondary }}>{prov.label}</span>
              </div>
              <div style={{ fontSize: 12, color: C.tertiary }}>{prov.desc}</div>
            </div>
            <button
              onClick={() => { setNewProvider(prov.id); setAdding(true); }}
              style={{
                padding: "5px 12px", background: C.blue, color: "#FFF",
                border: "none", borderRadius: 7, fontSize: 12, cursor: "pointer",
              }}
            >
              Anslut →
            </button>
          </div>
        </div>
      ))}

      {/* Manual entry always available */}
      <div style={{
        background: C.surface, borderRadius: 10, padding: "14px 16px",
        border: `0.5px solid ${C.border}`, boxShadow: shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚫</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.secondary }}>Manuell inmatning</div>
            <div style={{ fontSize: 12, color: C.tertiary }}>Alltid tillgänglig — används när automatiska system är offline</div>
          </div>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{
          background: C.surface, borderRadius: 10, padding: 16,
          border: `0.5px solid ${C.blue}`, boxShadow: shadow,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Anslut {PROVIDER_LABELS[newProvider]}</div>
          <input
            placeholder="Visningsnamn (ex. Alantec FDS-3000 Hall A)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", border: `0.5px solid ${C.border}`,
              borderRadius: 7, fontSize: 14, marginBottom: 8,
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { onAdd(newProvider, newName); setAdding(false); setNewName(""); }}
              disabled={!newName.trim()}
              style={{
                padding: "7px 16px", background: newName.trim() ? C.blue : C.inset,
                color: newName.trim() ? "#FFF" : C.secondary, border: "none",
                borderRadius: 7, fontSize: 13, cursor: newName.trim() ? "pointer" : "default",
              }}
            >
              Spara
            </button>
            <button
              onClick={() => setAdding(false)}
              style={{
                padding: "7px 16px", background: "transparent", border: `0.5px solid ${C.border}`,
                borderRadius: 7, fontSize: 13, cursor: "pointer", color: C.text,
              }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab 4: Report ────────────────────────────────────────────────────────────

interface ReportData {
  total_liters: number;
  total_cost: number;
  events_count: number;
  by_fluid_type: Record<string, { liters: number; cost: number; count: number }>;
  by_technician: Record<string, { liters: number; cost: number; count: number }>;
}

const ReportTab = ({ events }: { events: FluidEvent[] }) => {
  // Compute from events (works even without report API)
  const byFluid: Record<string, { liters: number; cost: number; count: number }> = {};
  let totalL = 0, totalC = 0;

  for (const ev of events) {
    byFluid[ev.fluid_type] ??= { liters: 0, cost: 0, count: 0 };
    byFluid[ev.fluid_type].liters += ev.quantity_liters;
    byFluid[ev.fluid_type].cost   += ev.total_cost ?? 0;
    byFluid[ev.fluid_type].count  += 1;
    totalL += ev.quantity_liters;
    totalC += ev.total_cost ?? 0;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Totalt idag", value: `${totalL.toFixed(1)} L` },
          { label: "Total kostnad", value: fmtEur(totalC) },
          { label: "Dispenseringar", value: String(events.length) },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: C.surface, borderRadius: 10, padding: "14px 16px",
            border: `0.5px solid ${C.border}`, boxShadow: shadow, textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* By fluid type */}
      <div style={{
        background: C.surface, borderRadius: 10, padding: "16px",
        border: `0.5px solid ${C.border}`, boxShadow: shadow,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Per vätska
        </div>
        {Object.entries(byFluid).length === 0 && (
          <div style={{ color: C.tertiary, fontSize: 14 }}>Inga händelser</div>
        )}
        {Object.entries(byFluid).map(([type, data]) => (
          <div key={type} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 0", borderBottom: `0.5px solid ${C.inset}`,
          }}>
            <span style={{ fontSize: 14 }}>{FLUID_LABELS[type] ?? type}</span>
            <div style={{ display: "flex", gap: 24, textAlign: "right" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{data.liters.toFixed(1)} L</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{fmtEur(data.cost)}</span>
              <span style={{ fontSize: 12, color: C.secondary }}>{data.count} st</span>
            </div>
          </div>
        ))}
        {totalC > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontWeight: 700 }}>
            <span>Totalt</span>
            <div style={{ display: "flex", gap: 24 }}>
              <span>{totalL.toFixed(1)} L</span>
              <span>{fmtEur(totalC)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Work Order Fluid Summary (exportable) ────────────────────────────────────

export const WorkOrderFluidSummary = ({ workOrderId }: { workOrderId: string }) => {
  const [events, setEvents] = useState<FluidEvent[]>([]);

  useEffect(() => {
    apiClient.get(`/api/fluid/events?work_order_id=${workOrderId}`)
      .then((data: any) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [workOrderId]);

  if (events.length === 0) return null;

  const total = events.reduce((sum, e) => sum + (e.total_cost ?? 0), 0);

  return (
    <div style={{
      background: C.fill, borderRadius: 8, padding: "12px 14px",
      border: `0.5px solid ${C.border}`, marginTop: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Vätskeförbrukning
      </div>
      {events.map(ev => (
        <div key={ev.id} style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 13, padding: "3px 0",
        }}>
          <span style={{ color: C.text }}>{ev.fluid_name}</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ color: C.secondary }}>{ev.quantity_liters.toFixed(1)} L</span>
            {ev.total_cost != null && <span style={{ fontWeight: 500 }}>{fmtEur(ev.total_cost)}</span>}
          </div>
        </div>
      ))}
      <div style={{
        display: "flex", justifyContent: "space-between",
        borderTop: `0.5px solid ${C.border}`, marginTop: 6, paddingTop: 6,
        fontWeight: 600, fontSize: 13,
      }}>
        <span>Totalt</span>
        <div style={{ display: "flex", gap: 16 }}>
          <span>{fmtEur(total)}</span>
          <span style={{ fontSize: 11, color: C.secondary }}>
            (automatiskt inmatat från{" "}
            {events[0]?.dispenser_id?.includes("MANUAL") ? "manuell inmatning" : "dispensersystem"})
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Module ──────────────────────────────────────────────────────────────

export default function FluidIntegrationModule() {
  const [tab, setTab] = useState<"feed" | "tanks" | "config" | "report">("feed");
  const [events, setEvents] = useState<FluidEvent[]>(MOCK_EVENTS);
  const [tanks, setTanks] = useState<TankLevel[]>(MOCK_TANKS);
  const [integrations, setIntegrations] = useState<FluidIntegration[]>(MOCK_INTEGRATIONS);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load live data
  useEffect(() => {
    apiClient.get("/api/fluid/events?date=today")
      .then((data: any) => { if (Array.isArray(data) && data.length) setEvents(data); })
      .catch(() => {});
    apiClient.get("/api/fluid/inventory")
      .then((data: any) => { if (Array.isArray(data) && data.length) setTanks(data); })
      .catch(() => {});
    apiClient.get("/api/fluid/integrations")
      .then((data: any) => { if (Array.isArray(data)) setIntegrations(data); })
      .catch(() => {});
  }, []);

  const handleLink = useCallback(async (eventId: string) => {
    // In production: open a work order picker modal
    // For now, just mark as linked to demonstrate the flow
    showToast("Välj arbetsorder att koppla till…");
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, booked_to_work_order: true } : e
    ));
  }, []);

  const handleSync = useCallback(async () => {
    showToast("Synkar tanksnivåer…");
    try {
      await apiClient.post("/api/fluid/inventory/sync", {});
      const data = await apiClient.get("/api/fluid/inventory");
      if (Array.isArray(data) && data.length) setTanks(data as TankLevel[]);
      showToast("✅ Tanksnivåer uppdaterade");
    } catch {
      showToast("Kunde inte synka — kontrollera anslutning");
    }
  }, []);

  const handleAddIntegration = useCallback(async (provider: string, name: string) => {
    try {
      const data = await apiClient.post("/api/fluid/integrations", {
        provider, display_name: name, sync_mode: "WEBHOOK",
      });
      setIntegrations(prev => [...prev, data as FluidIntegration]);
      showToast(`✅ ${name} ansluten`);
    } catch {
      showToast("Misslyckades att ansluta system");
    }
  }, []);

  const handleTestIntegration = useCallback(async (id: string) => {
    showToast("Testar anslutning…");
    try {
      const result: any = await apiClient.post(`/api/fluid/integrations/${id}/test`, {});
      showToast(result.ok ? "✅ Anslutning OK" : `❌ Fel: ${result.error}`);
    } catch {
      showToast("Anslutningstest misslyckades");
    }
  }, []);

  const handleRemoveIntegration = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/api/fluid/integrations/${id}`, { is_active: false });
      setIntegrations(prev => prev.filter(i => i.id !== id));
      showToast("Integration borttagen");
    } catch {
      showToast("Kunde inte ta bort integration");
    }
  }, []);

  const unlinkedCount = events.filter(e => !e.booked_to_work_order).length;

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <DropIcon size={22} color={C.blue} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
            Vätskeautomatik
          </h2>
          {unlinkedCount > 0 && (
            <span style={{
              background: C.orange + "22", color: C.orange,
              fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
            }}>
              {unlinkedCount} okopplade
            </span>
          )}
        </div>
        <p style={{ color: C.secondary, fontSize: 13, margin: 0 }}>
          Alantec · Orion · Automatisk kostnadsbokning mot arbetsorder
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        background: C.fill, borderRadius: 10, padding: 4,
        border: `0.5px solid ${C.border}`,
        width: "fit-content",
      }}>
        <Tab label="Live-flöde" active={tab === "feed"} onClick={() => setTab("feed")} />
        <Tab label="Tankstatus" active={tab === "tanks"} onClick={() => setTab("tanks")} />
        <Tab label="Konfiguration" active={tab === "config"} onClick={() => setTab("config")} />
        <Tab label="Rapport" active={tab === "report"} onClick={() => setTab("report")} />
      </div>

      {/* Content */}
      {tab === "feed"   && <LiveFeedTab events={events} onLink={handleLink} />}
      {tab === "tanks"  && <InventoryTab tanks={tanks} onSync={handleSync} />}
      {tab === "config" && (
        <ConfigTab
          integrations={integrations}
          onAdd={handleAddIntegration}
          onTest={handleTestIntegration}
          onRemove={handleRemoveIntegration}
        />
      )}
      {tab === "report" && <ReportTab events={events} />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1C1C1E", color: "#FFF", padding: "10px 20px",
          borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: "slideUp 0.15s ease forwards",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Drop Icon ────────────────────────────────────────────────────────────────

export const DropIcon = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);
