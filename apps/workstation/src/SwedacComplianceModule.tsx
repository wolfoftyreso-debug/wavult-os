/**
 * SwedacComplianceModule.tsx
 * Ackrediteringsberedskap — ISO/IEC 17020, ISO/IEC 17025, ISO 9001
 *
 * 5 tabs:
 *  1. Översikt        — readiness dashboard, critical gaps, clause summary
 *  2. Kalibrering     — equipment calibration records + expiry tracking
 *  3. Kompetens       — technician certificates + expiry
 *  4. Opartiskhet     — impartiality declarations
 *  5. ISO 17020 Checklista — clause-by-clause compliance checklist
 */

import { useState, useEffect } from "react";
import { useApi } from "./useApi";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#F2F2F7",
  surface:   "#FFFFFF",
  border:    "#D1D1D6",
  text:      "#000000",
  secondary: "#8E8E93",
  blue:      "#007AFF",
  green:     "#34C759",
  orange:    "#FF9500",
  red:       "#FF3B30",
  yellow:    "#FFCC00",
};
const shadow = "0 1px 3px rgba(0,0,0,0.06)";
const radius = 12;

// ─── Exported Award icon (used in Dashboard nav) ────────────────────────────
export function AwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sv-SE");
}

function statusColor(status: string): string {
  switch (status) {
    case "VALID":
    case "COMPLIANT":
    case "ACTIVE":   return C.green;
    case "DUE_SOON":
    case "PARTIAL":
    case "PENDING":  return C.orange;
    case "EXPIRED":
    case "NON_COMPLIANT":
    case "SUSPENDED": return C.red;
    default:          return C.secondary;
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    VALID: "Giltig", EXPIRED: "Utgången", DUE_SOON: "Utgår snart",
    OUT_OF_SERVICE: "Ur drift", COMPLIANT: "Uppfyllt", PARTIAL: "Delvis",
    NON_COMPLIANT: "Ej uppfyllt", NOT_APPLICABLE: "Ej tillämplig",
    NOT_ASSESSED: "Ej bedömd", ACTIVE: "Aktiv", SUSPENDED: "Suspenderad",
    PENDING: "Avvaktar",
  };
  return map[status] ?? status;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, color: statusColor(status),
      background: statusColor(status) + "18",
      padding: "2px 8px", borderRadius: 20,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(status) }} />
      {statusLabel(status)}
    </span>
  );
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={{ color: C.secondary, fontSize: 12 }}>—</span>;
  const color = days < 0 ? C.red : days < 30 ? C.red : days < 90 ? C.orange : C.green;
  const label = days < 0 ? `Utgången ${-days}d sedan` : `${days} dagar kvar`;
  return <span style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</span>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface, borderRadius: radius,
      boxShadow: shadow, padding: 16,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red;
  return (
    <div style={{ width: "100%", height: 10, background: C.border, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.6s ease", borderRadius: 8 }} />
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",      label: "Översikt" },
  { id: "calibration",   label: "Kalibrering" },
  { id: "competence",    label: "Kompetens" },
  { id: "impartiality",  label: "Opartiskhet" },
  { id: "checklist",     label: "ISO 17020" },
];

// ─── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK_STATUS = {
  compliant_pct: 78, total_items: 15, compliant_count: 11,
  partial_count: 3, non_compliant_count: 1,
  critical_gaps: ["Avgasmätare kalibrering utgår om 21 dagar", "Impartialitetdeklaration saknas för Jonas Lindström"],
  calibration_summary: { total: 5, valid: 4, due_soon: 1, expired: 0 },
};

const FALLBACK_CALS = [
  { id: "1", equipment_name: "Momentnyckel 40-200 Nm", equipment_type: "TORQUE_WRENCH", equipment_id: "TW-001", manufacturer: "Snap-on", model: "QJDTEC3EB1OO", calibrated_by: "RISE Research Institutes of Sweden", calibration_lab_accreditation: "RISE-17025-0042", calibration_date: "2025-09-01", valid_until: "2026-09-01", traceable_to: "RISE (SP Technical Research Institute)", measurement_uncertainty: "±1% vid 95% konfidens", status: "VALID", days_remaining: 163 },
  { id: "2", equipment_name: "Momentnyckel 10-50 Nm", equipment_type: "TORQUE_WRENCH", equipment_id: "TW-002", manufacturer: "Stanley", model: "FMHT80187", calibrated_by: "RISE Research Institutes of Sweden", calibration_lab_accreditation: "RISE-17025-0042", calibration_date: "2025-09-01", valid_until: "2026-09-01", traceable_to: "RISE", measurement_uncertainty: "±1% vid 95% konfidens", status: "VALID", days_remaining: 163 },
  { id: "3", equipment_name: "Bromsmätare", equipment_type: "BRAKE_TESTER", equipment_id: "BT-001", manufacturer: "Hunter", model: "DSP9600", calibrated_by: "Intertek Sweden", calibration_lab_accreditation: "INT-17025-SE-089", calibration_date: "2025-06-15", valid_until: "2026-06-15", traceable_to: "RISE", measurement_uncertainty: "±2% vid 95% konfidens", status: "VALID", days_remaining: 85 },
  { id: "4", equipment_name: "Avgasmätare", equipment_type: "EMISSIONS_ANALYZER", equipment_id: "EA-001", manufacturer: "Bosch", model: "BEA 550", calibrated_by: "Intertek Sweden", calibration_lab_accreditation: "INT-17025-SE-089", calibration_date: "2025-11-01", valid_until: "2026-04-01", traceable_to: "RISE", measurement_uncertainty: "±0.5% vol vid 95% konfidens", status: "DUE_SOON", days_remaining: 10 },
  { id: "5", equipment_name: "Lyftdon 3.5t", equipment_type: "LIFT", equipment_id: "LF-001", manufacturer: "Ravaglioli", model: "KP3.5", calibrated_by: "Besikta AB", calibration_lab_accreditation: "BESI-17020-12", calibration_date: "2025-10-01", valid_until: "2026-10-01", traceable_to: "Swedac nationella mått", measurement_uncertainty: "Visuell + belastningstest", status: "VALID", days_remaining: 193 },
];

const FALLBACK_COMPS = [
  { id: "1", technician_name: "Robin Björk", competence_type: "BRAKE_TESTING", certificate_name: "Bromsbehörighet", issuing_body: "Bilprovningen AB", issue_date: "2022-06-01", valid_until: "2027-06-01", status: "ACTIVE", is_swedac_requirement: true, days_remaining: 800 },
  { id: "2", technician_name: "Robin Björk", competence_type: "EMISSIONS_TESTING", certificate_name: "Avgasmätning — Transportstyrelsen", issuing_body: "Transportstyrelsen", issue_date: "2023-08-01", valid_until: "2026-08-01", status: "ACTIVE", is_swedac_requirement: true, days_remaining: 132 },
  { id: "3", technician_name: "Robin Björk", competence_type: "SAFETY_INSPECTION", certificate_name: "Lyftdonsbehörighet", issuing_body: "Svensk Maskinprovning", issue_date: "2022-03-15", valid_until: "2026-04-15", status: "ACTIVE", is_swedac_requirement: true, days_remaining: 24 },
  { id: "4", technician_name: "Eric Karlsson", competence_type: "HIGH_VOLTAGE_EV", certificate_name: "El-bils-behörighet (HV)", issuing_body: "Volvo Cars AB", issue_date: "2023-01-01", valid_until: "2028-01-01", status: "ACTIVE", is_swedac_requirement: true, days_remaining: 650 },
  { id: "5", technician_name: "Eric Karlsson", competence_type: "VEHICLE_INSPECTION", certificate_name: "Diagnosbehörighet", issuing_body: "Bosch Service", issue_date: "2021-05-20", valid_until: "2026-05-20", status: "ACTIVE", is_swedac_requirement: false, days_remaining: 59 },
];

const FALLBACK_IMPART = [
  { id: "1", declarer_name: "Maria Lindqvist", declarer_role: "Ops Lead", declaration_type: "ANNUAL", conflicts_identified: false, signed_at: "2026-01-15T08:00:00Z", valid_until: "2027-01-15", days_until_expiry: 299 },
  { id: "2", declarer_name: "Robin Björk", declarer_role: "Inspektör", declaration_type: "ANNUAL", conflicts_identified: false, signed_at: "2026-01-20T08:00:00Z", valid_until: "2027-01-20", days_until_expiry: 304 },
  { id: "3", declarer_name: "Eric Karlsson", declarer_role: "Inspektör", declaration_type: "ANNUAL", conflicts_identified: false, signed_at: "2026-01-22T08:00:00Z", valid_until: "2027-01-22", days_until_expiry: 306 },
  { id: "4", declarer_name: "Jonas Lindström", declarer_role: "Inspektör", declaration_type: "ANNUAL", conflicts_identified: false, signed_at: null, valid_until: null, days_until_expiry: null, _unsigned: true },
];

const FALLBACK_CHECKLIST = [
  { id: "1", standard: "ISO_17020", clause: "4.1", requirement_text: "Opartiskhet — Inspektionsorganet ska identifiera risker för opartiskhet", requirement_category: "IMPARTIALITY", status: "COMPLIANT", evidence_description: "Impartialitetspolicy v2.1 (2026-01-01)" },
  { id: "2", standard: "ISO_17020", clause: "4.2", requirement_text: "Konfidentialitet — Rutiner för hantering av kunddata", requirement_category: "CONFIDENTIALITY", status: "COMPLIANT", evidence_description: "GDPR-policy + NDA-avtal" },
  { id: "3", standard: "ISO_17020", clause: "6.1.1", requirement_text: "Kompetens — Dokumenterade krav för inspektörer", requirement_category: "RESOURCES", status: "COMPLIANT", evidence_description: "Kompetensmatris 2026" },
  { id: "4", standard: "ISO_17020", clause: "6.1.2", requirement_text: "Utbildning — Kontinuerlig kompetensutveckling dokumenterad", requirement_category: "RESOURCES", status: "PARTIAL", gap_description: "Ingen formell utbildningsplan för 2026", action_required: "Skapa utbildningsplan 2026" },
  { id: "5", standard: "ISO_17020", clause: "6.2", requirement_text: "Utrustning — Kalibrerade och spårbara mätinstrument", requirement_category: "RESOURCES", status: "PARTIAL", gap_description: "Avgasmätare kalibrering utgår om 21 dagar", action_required: "Boka kalibrering hos Intertek" },
  { id: "6", standard: "ISO_17020", clause: "7.1", requirement_text: "Inspektionsmetoder — Dokumenterade och validerade metoder", requirement_category: "PROCESS", status: "COMPLIANT", evidence_description: "Metodhandbok v3.0" },
  { id: "7", standard: "ISO_17020", clause: "7.4", requirement_text: "Inspektionsrapporter — Fullständiga och spårbara", requirement_category: "RECORDS", status: "COMPLIANT", evidence_description: "Digital rapportmall i Pixdrift" },
  { id: "8", standard: "ISO_17020", clause: "7.5", requirement_text: "Klagomål och överklaganden — Dokumenterad process", requirement_category: "COMPLAINTS", status: "COMPLIANT", evidence_description: "Klagomålsprocedur v1.2" },
  { id: "9", standard: "ISO_17020", clause: "8.1", requirement_text: "Ledningssystemalternativ — Nivå A, B eller C", requirement_category: "MANAGEMENT_SYSTEM", status: "PARTIAL", gap_description: "Nivå B implementerad, Nivå A under utredning" },
  { id: "10", standard: "ISO_17020", clause: "8.6", requirement_text: "Intern revision — Minst en gång per år", requirement_category: "INTERNAL_AUDIT", status: "COMPLIANT", evidence_description: "Intern revision utförd 2025-10-15" },
  { id: "11", standard: "ISO_17020", clause: "8.7", requirement_text: "Ledningens genomgång — Dokumenterad och regelbunden", requirement_category: "REVIEW", status: "COMPLIANT", evidence_description: "Ledningsgenomgång 2026-01-10" },
  { id: "12", standard: "ISO_17025", clause: "6.4", requirement_text: "Utrustning — Spårbar kalibrering mot nationella mått", requirement_category: "RESOURCES", status: "PARTIAL", gap_description: "Avgasmätare ej förnyad" },
  { id: "13", standard: "ISO_17025", clause: "6.6", requirement_text: "Mätosäkerhet — Dokumenterad för alla mätningar", requirement_category: "RESOURCES", status: "COMPLIANT", evidence_description: "Mätosäkerhetsbudget dokumenterad" },
  { id: "14", standard: "ISO_9001", clause: "9.2", requirement_text: "Intern revision — Planerad och genomförd", requirement_category: "INTERNAL_AUDIT", status: "COMPLIANT", evidence_description: "Revisionsplan 2026 fastställd" },
  { id: "15", standard: "ISO_9001", clause: "10.2", requirement_text: "Avvikelser — Dokumenterade och korrigerade", requirement_category: "PROCESS", status: "COMPLIANT", evidence_description: "Avvikelsesystem i Pixdrift" },
];

// ─── Equipment type labels ────────────────────────────────────────────────────
const EQ_LABELS: Record<string, string> = {
  TORQUE_WRENCH: "Momentnyckel", PRESSURE_GAUGE: "Tryckmätare", BRAKE_TESTER: "Bromsmätare",
  EMISSIONS_ANALYZER: "Avgasmätare", MULTIMETER: "Multimeter", OSCILLOSCOPE: "Oscilloskop",
  DIAGNOSTIC_TOOL: "Diagnostikverktyg", LIFT: "Lyftdon", HEADLIGHT_TESTER: "Ljusmätare",
  WHEEL_ALIGNER: "Hjulinriktare", TYRE_GAUGE: "Däcktrycksmätare", OTHER: "Övrigt",
};

const CAT_LABELS: Record<string, string> = {
  IMPARTIALITY: "Opartiskhet", CONFIDENTIALITY: "Konfidentialitet", ORGANIZATION: "Organisation",
  MANAGEMENT_SYSTEM: "Ledningssystem", RESOURCES: "Resurser", PROCESS: "Process",
  RECORDS: "Register & Dokumentation", COMPLAINTS: "Klagomål", INTERNAL_AUDIT: "Intern revision",
  REVIEW: "Ledningens genomgång",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — ÖVERSIKT
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ status, checklist }: { status: any; checklist: any[] }) {
  const s = status ?? FALLBACK_STATUS;
  const items = checklist.length > 0 ? checklist : FALLBACK_CHECKLIST;

  const pct = s.compliant_pct ?? 0;
  const pctColor = pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red;

  const compliant = items.filter((i) => i.status === "COMPLIANT");
  const partial = items.filter((i) => i.status === "PARTIAL");
  const failing = items.filter((i) => i.status === "NON_COMPLIANT");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Main readiness card */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Ackrediteringsberedskap</div>
            <div style={{ fontSize: 13, color: C.secondary }}>Baserat på ISO/IEC 17020 (Kontrollorgan)</div>
          </div>
          <div style={{
            fontSize: 32, fontWeight: 800, color: pctColor,
            lineHeight: 1, textAlign: "right",
          }}>
            {pct}%
          </div>
        </div>
        <ProgressBar pct={pct} />
        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{s.compliant_count}</div>
            <div style={{ fontSize: 11, color: C.secondary }}>Uppfyllt</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.orange }}>{s.partial_count}</div>
            <div style={{ fontSize: 11, color: C.secondary }}>Delvis</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.red }}>{s.non_compliant_count}</div>
            <div style={{ fontSize: 11, color: C.secondary }}>Ej uppfyllt</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.secondary }}>{s.total_items}</div>
            <div style={{ fontSize: 11, color: C.secondary }}>Totalt</div>
          </div>
        </div>
      </Card>

      {/* Critical gaps */}
      {s.critical_gaps?.length > 0 && (
        <Card style={{ borderLeft: `4px solid ${C.red}` }}>
          <SectionTitle>🔴 Kritiska brister ({s.critical_gaps.length})</SectionTitle>
          {s.critical_gaps.map((gap: string, i: number) => (
            <div key={i} style={{ fontSize: 13, color: C.red, padding: "4px 0", borderBottom: i < s.critical_gaps.length - 1 ? `1px solid ${C.border}` : "none" }}>
              🔴 {gap}
            </div>
          ))}
        </Card>
      )}

      {/* Calibration summary */}
      <Card>
        <SectionTitle>Kalibreringsstatus</SectionTitle>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Giltiga", val: s.calibration_summary?.valid, color: C.green },
            { label: "Utgår snart", val: s.calibration_summary?.due_soon, color: C.orange },
            { label: "Utgångna", val: s.calibration_summary?.expired, color: C.red },
            { label: "Totalt", val: s.calibration_summary?.total, color: C.secondary },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1, textAlign: "center", padding: "12px 8px",
              background: stat.color + "12", borderRadius: 8,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.val ?? 0}</div>
              <div style={{ fontSize: 11, color: C.secondary }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Clause groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "✅ Uppfyllt", items: compliant, color: C.green },
          { label: "🟡 Delvis uppfyllt", items: partial, color: C.orange },
          { label: "🔴 Ej uppfyllt", items: failing, color: C.red },
        ].map((group) => group.items.length > 0 && (
          <Card key={group.label}>
            <SectionTitle>{group.label} ({group.items.length})</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {group.items.map((item: any) => (
                <span key={item.id} style={{
                  fontSize: 12, color: group.color, fontWeight: 600,
                  background: group.color + "18", padding: "3px 10px", borderRadius: 20,
                }}>
                  {item.clause}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
          background: C.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          📋 Generera revisionsrapport
        </button>
        <button style={{
          flex: 1, padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
          background: C.surface, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          📅 Boka Swedac-revision
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — KALIBRERING
// ═══════════════════════════════════════════════════════════════════════════════

function CalibrationTab({ cals }: { cals: any[] }) {
  const records = cals.length > 0 ? cals : FALLBACK_CALS;
  const alerts = records.filter((r) => r.status === "DUE_SOON" || r.status === "EXPIRED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {alerts.length > 0 && (
        <Card style={{ background: C.orange + "18", border: `1px solid ${C.orange}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.orange }}>
            ⚠️ {alerts.length} instrument {alerts.length === 1 ? "kalibrering utgår snart" : "kalibreringar utgår snart eller är utgångna"}
          </div>
          {alerts.map((a) => (
            <div key={a.id} style={{ fontSize: 12, color: C.orange, marginTop: 4 }}>
              • {a.equipment_name} — {fmtDate(a.valid_until)}
            </div>
          ))}
        </Card>
      )}

      {records.map((rec) => (
        <Card key={rec.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{rec.equipment_name}</div>
              <div style={{ fontSize: 12, color: C.secondary }}>
                {EQ_LABELS[rec.equipment_type] ?? rec.equipment_type} · {rec.equipment_id}
                {rec.manufacturer && ` · ${rec.manufacturer} ${rec.model ?? ""}`}
              </div>
            </div>
            <StatusBadge status={rec.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Kalibrerat av</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{rec.calibrated_by}</div>
              {rec.calibration_lab_accreditation && (
                <div style={{ fontSize: 11, color: C.blue, marginTop: 2 }}>🏅 {rec.calibration_lab_accreditation}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Giltig t.o.m.</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(rec.valid_until)}</div>
              <DaysBadge days={rec.days_remaining} />
            </div>
          </div>

          {rec.traceable_to && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, color: C.blue, background: C.blue + "12",
              padding: "3px 10px", borderRadius: 20, marginBottom: 8,
            }}>
              🔗 Spårbar till: {rec.traceable_to}
            </div>
          )}

          {rec.measurement_uncertainty && (
            <div style={{ fontSize: 12, color: C.secondary }}>
              Mätosäkerhet: {rec.measurement_uncertainty}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{
              fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.surface, color: C.text, cursor: "pointer",
            }}>
              📄 Ladda ner certifikat
            </button>
            <button style={{
              fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none",
              background: C.blue, color: "#fff", cursor: "pointer",
            }}>
              🔄 Förnya
            </button>
          </div>
        </Card>
      ))}

      <button style={{
        padding: "12px 16px", borderRadius: 10, border: `1px dashed ${C.border}`,
        background: C.surface, color: C.blue, fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        + Lägg till instrument
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — KOMPETENS
// ═══════════════════════════════════════════════════════════════════════════════

function CompetenceTab({ records }: { records: any[] }) {
  const data = records.length > 0 ? records : FALLBACK_COMPS;

  // Group by technician
  const byTech: Record<string, any[]> = {};
  for (const r of data) {
    if (!byTech[r.technician_name]) byTech[r.technician_name] = [];
    byTech[r.technician_name]!.push(r);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(byTech).map(([name, certs]) => (
        <Card key={name}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>👤 {name}</div>
          {certs.map((cert) => {
            const days = cert.days_remaining ?? (cert.valid_until ? daysUntil(cert.valid_until) : null);
            const isExpiringSoon = days !== null && days < 60;
            return (
              <div key={cert.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span>{cert.status === "ACTIVE" && !isExpiringSoon ? "✅" : isExpiringSoon ? "⚠️" : "❌"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cert.certificate_name}</span>
                    {cert.is_swedac_requirement && (
                      <span style={{ fontSize: 10, color: C.blue, background: C.blue + "15", padding: "1px 6px", borderRadius: 10 }}>
                        Swedac-krav
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.secondary }}>
                    {cert.issuing_body}
                    {cert.valid_until && ` · Giltig till ${fmtDate(cert.valid_until)}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <StatusBadge status={cert.status} />
                  {days !== null && <div style={{ marginTop: 4 }}><DaysBadge days={days} /></div>}
                </div>
              </div>
            );
          })}
        </Card>
      ))}

      <button style={{
        padding: "12px 16px", borderRadius: 10, border: `1px dashed ${C.border}`,
        background: C.surface, color: C.blue, fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        + Lägg till behörighet
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — OPARTISKHET
// ═══════════════════════════════════════════════════════════════════════════════

function ImpartialityTab({ declarations }: { declarations: any[] }) {
  const data = declarations.length > 0 ? declarations : FALLBACK_IMPART;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.blue + "0a", border: `1px solid ${C.blue}30` }}>
        <div style={{ fontSize: 13, color: C.blue, fontWeight: 600, marginBottom: 4 }}>
          📋 ISO/IEC 17020 §4.1 — Opartiskhet
        </div>
        <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>
          Alla inspektörer och ledningspersonal måste årligen deklarera opartiskhet och avsaknad av intressekonflikter.
          Dokumenteras och sparas i enlighet med Swedacs krav.
        </div>
      </Card>

      {data.map((decl: any) => {
        const unsigned = decl._unsigned || (!decl.signed_at && !decl.valid_until);
        return (
          <Card key={decl.id} style={unsigned ? { borderLeft: `4px solid ${C.orange}` } : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{unsigned ? "⚠️" : decl.conflicts_identified ? "🔴" : "✅"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{decl.declarer_name}</span>
                  <span style={{ fontSize: 12, color: C.secondary }}>({decl.declarer_role})</span>
                </div>
                <div style={{ fontSize: 12, color: C.secondary }}>
                  {decl.declaration_type === "ANNUAL" ? "Årsdeklaration" : decl.declaration_type}
                  {decl.signed_at && ` · Signerad ${fmtDate(decl.signed_at)}`}
                  {decl.valid_until && ` · Giltig till ${fmtDate(decl.valid_until)}`}
                </div>
                {decl.conflicts_identified && (
                  <div style={{ fontSize: 12, color: C.orange, marginTop: 4 }}>
                    ⚠️ Konflikt identifierad: {decl.conflict_description}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {unsigned ? (
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: C.orange,
                      background: C.orange + "18", padding: "3px 10px", borderRadius: 20,
                    }}>
                      EJ SIGNERAD
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <button style={{
                        fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none",
                        background: C.orange, color: "#fff", cursor: "pointer",
                      }}>
                        📨 Skicka påminnelse
                      </button>
                    </div>
                  </div>
                ) : (
                  <DaysBadge days={decl.days_until_expiry} />
                )}
              </div>
            </div>
          </Card>
        );
      })}

      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          flex: 1, padding: "12px 16px", borderRadius: 10, border: `1px dashed ${C.border}`,
          background: C.surface, color: C.blue, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + Ny deklaration
        </button>
        <button style={{
          flex: 1, padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
          background: C.surface, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          📬 Massutskick — alla inspektörer
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — ISO 17020 CHECKLISTA
// ═══════════════════════════════════════════════════════════════════════════════

function ChecklistTab({ items }: { items: any[] }) {
  const data = items.length > 0 ? items : FALLBACK_CHECKLIST;
  const [editing, setEditing] = useState<string | null>(null);

  // Group by category
  const byCat: Record<string, any[]> = {};
  for (const item of data) {
    const cat = item.requirement_category ?? "OTHER";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat]!.push(item);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(byCat).map(([cat, catItems]) => (
        <Card key={cat}>
          <SectionTitle>{CAT_LABELS[cat] ?? cat}</SectionTitle>
          {catItems.map((item: any, idx: number) => (
            <div key={item.id} style={{
              padding: "10px 0",
              borderBottom: idx < catItems.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.blue, minWidth: 36 }}>
                      {item.clause}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.requirement_text}</span>
                  </div>
                  {item.evidence_description && (
                    <div style={{ fontSize: 12, color: C.secondary, marginBottom: 4 }}>
                      📎 Bevis: {item.evidence_description}
                    </div>
                  )}
                  {item.gap_description && (
                    <div style={{ fontSize: 12, color: C.orange, marginBottom: 4 }}>
                      ⚠️ Gap: {item.gap_description}
                    </div>
                  )}
                  {item.action_required && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "none",
                        background: C.blue, color: "#fff", cursor: "pointer",
                      }}>
                        ▶ {item.action_required}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ marginLeft: 12, flexShrink: 0 }}>
                  <StatusBadge status={item.status} />
                  {item.status !== "COMPLIANT" && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        onClick={() => setEditing(editing === item.id ? null : item.id)}
                        style={{
                          fontSize: 11, padding: "4px 10px", borderRadius: 8,
                          border: `1px solid ${C.border}`, background: C.surface,
                          color: C.text, cursor: "pointer",
                        }}
                      >
                        ✏️ Uppdatera
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editing === item.id && (
                <div style={{
                  marginTop: 10, padding: 12, background: C.bg, borderRadius: 8,
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <select style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
                    {["COMPLIANT", "PARTIAL", "NON_COMPLIANT", "NOT_APPLICABLE"].map((s) => (
                      <option key={s} value={s} selected={item.status === s}>{statusLabel(s)}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Bevisunderlag..."
                    style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, resize: "vertical" }}
                    defaultValue={item.evidence_description ?? ""}
                  />
                  <textarea
                    placeholder="Gapbeskrivning..."
                    style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, resize: "vertical" }}
                    defaultValue={item.gap_description ?? ""}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{
                      padding: "6px 14px", borderRadius: 8, border: "none",
                      background: C.blue, color: "#fff", fontSize: 12, cursor: "pointer",
                    }}>
                      💾 Spara
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      style={{
                        padding: "6px 14px", borderRadius: 8,
                        border: `1px solid ${C.border}`, background: C.surface,
                        fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SwedacComplianceModule() {
  const [tab, setTab] = useState("overview");

  const { data: status }   = useApi<any>("/api/swedac/status");
  const { data: calData }  = useApi<any[]>("/api/swedac/calibration");
  const { data: compData } = useApi<{ records: any[]; by_technician: Record<string, any[]> }>("/api/swedac/competence");
  const { data: impartData } = useApi<any[]>("/api/swedac/impartiality");
  const { data: checkData }  = useApi<{ items: any[]; grouped: Record<string, any[]> }>("/api/swedac/checklist");

  const cals = calData ?? [];
  const comps = compData?.records ?? [];
  const imparts = impartData ?? [];
  const checklist = checkData?.items ?? [];

  // Notification counts for tab badges
  const calAlerts = cals.filter((c: any) => c.status === "DUE_SOON" || c.status === "EXPIRED").length;
  const compAlerts = comps.filter((c: any) => c.valid_until && daysUntil(c.valid_until) < 60).length;
  const impartAlerts = imparts.filter((d: any) => !d.signed_at || (d.days_until_expiry !== null && d.days_until_expiry < 30)).length;

  const badgeCounts: Record<string, number> = {
    calibration: calAlerts,
    competence: compAlerts,
    impartiality: impartAlerts,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "16px 20px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AwardIcon />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Swedac & Ackreditering</div>
            <div style={{ fontSize: 12, color: C.secondary }}>ISO/IEC 17020 · ISO/IEC 17025 · ISO 9001</div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
          {TABS.map((t) => {
            const badge = badgeCounts[t.id] ?? 0;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 14px", borderRadius: "8px 8px 0 0", border: "none",
                  background: active ? C.bg : "transparent",
                  color: active ? C.blue : C.secondary,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                  borderBottom: active ? `2px solid ${C.blue}` : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 4, position: "relative",
                }}
              >
                {t.label}
                {badge > 0 && (
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", background: C.red,
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "overview"     && <OverviewTab status={status} checklist={checklist} />}
        {tab === "calibration"  && <CalibrationTab cals={cals} />}
        {tab === "competence"   && <CompetenceTab records={comps} />}
        {tab === "impartiality" && <ImpartialityTab declarations={imparts} />}
        {tab === "checklist"    && <ChecklistTab items={checklist} />}
      </div>
    </div>
  );
}
