import { useState, useEffect, useCallback } from "react";
import { apiClient } from "./useApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Audit {
  id: string;
  org_id: string;
  audit_type: string;
  certification_body: string | null;
  certification_standard: string | null;
  auditor_name: string | null;
  auditor_company: string | null;
  scheduled_date: string | null;
  actual_date: string | null;
  scope: string | null;
  location: string | null;
  status: string;
  result: string | null;
  certificate_number: string | null;
  certificate_valid_until: string | null;
  findings: any[];
  corrective_actions: any[];
  report_url: string | null;
  next_audit_date: string | null;
  is_spot_check: boolean;
  spot_check_trigger: string | null;
  created_at: string;
}

interface Certification {
  id: string;
  org_id: string;
  standard: string;
  certification_body: string | null;
  certificate_number: string | null;
  scope: string | null;
  issued_date: string | null;
  valid_until: string;
  status: string;
  certificate_document_url: string | null;
  surveillance_interval_months: number;
  next_surveillance_date: string | null;
  days_until_expiry: number;
  expiry_urgency: "OK" | "WARNING" | "CRITICAL" | "EXPIRED";
}

interface CertificationBody {
  id: string;
  name: string;
  logo: string;
  specialty: string[];
}

// ---------------------------------------------------------------------------
// Colour palette (consistent with rest of app)
// ---------------------------------------------------------------------------
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  border: "#E5E5EA",
  text: "#1C1C1E",
  sub: "#8E8E93",
  blue: "#007AFF",
  green: "#34C759",
  orange: "#FF9500",
  red: "#FF3B30",
  inset: "rgba(60,60,67,0.06)",
  // Aliases for extended components
  surface: "#FFFFFF",
  yellow: "#FF9500",
  secondary: "#8E8E93",
  tertiary: "#AEAEB2",
  fill: "rgba(60,60,67,0.06)",
};

// ============================================================
// FUTURE: Certification Body API Integrations
// ============================================================
// Planned integrations for automatic certificate verification:
//
// Swedac (Swedish accreditation body):
//   API: https://www.swedac.se/api/v1/certificates
//   Method: GET /certificates?number={cert_number}
//   Returns: validity, scope, suspension status
//
// TÜV SÜD:
//   Portal: https://www.tuvsud.com/en/services/testing/certification-verification
//   API: Contact TÜV SÜD for B2B API access
//
// DEKRA:
//   API: https://api.dekra.com/certificates (requires partnership agreement)
//
// DNV:
//   API: https://api.veracity.com/dnv/certificates
//   Auth: OAuth2 via Veracity platform
//
// Implementation plan:
// 1. User enters certificate number
// 2. System calls body's API to verify
// 3. Auto-fills: scope, issue date, expiry, suspension status
// 4. Creates webhook for status changes
// 5. Automatic alerts if certificate suspended
// ============================================================

// ---------------------------------------------------------------------------
// Extended Standards & Certification Bodies
// ---------------------------------------------------------------------------
const STANDARDS = [
  // Kvalitet
  { value: 'ISO_9001_2015', label: 'ISO 9001:2015 — Kvalitetsledning' },
  { value: 'ISO_9001_2008', label: 'ISO 9001:2008 — Kvalitetsledning (äldre)' },
  // Miljö
  { value: 'ISO_14001_2015', label: 'ISO 14001:2015 — Miljöledning' },
  // Arbetsmiljö
  { value: 'ISO_45001_2018', label: 'ISO 45001:2018 — Arbetsmiljöledning' },
  { value: 'OHSAS_18001', label: 'OHSAS 18001 — Arbetsmiljö (äldre)' },
  // Informationssäkerhet
  { value: 'ISO_27001_2022', label: 'ISO 27001:2022 — Informationssäkerhet' },
  { value: 'ISO_27001_2013', label: 'ISO 27001:2013 — Informationssäkerhet (äldre)' },
  // Energi
  { value: 'ISO_50001_2018', label: 'ISO 50001:2018 — Energiledning' },
  // Fordon
  { value: 'IATF_16949', label: 'IATF 16949 — Fordonssektor kvalitet' },
  { value: 'ISO_13485', label: 'ISO 13485 — Medicintekniska produkter' },
  // Livsmedel
  { value: 'ISO_22000_2018', label: 'ISO 22000:2018 — Livsmedelssäkerhet' },
  { value: 'HACCP', label: 'HACCP — Livsmedelshygien' },
  // Finansiell
  { value: 'SOC2_TYPE1', label: 'SOC 2 Type 1 — Servicekontroller' },
  { value: 'SOC2_TYPE2', label: 'SOC 2 Type 2 — Servicekontroller (löpande)' },
  // Svensk/nordisk
  { value: 'SWEDAC', label: 'Swedac-ackreditering' },
  { value: 'TUV_CERT', label: 'TÜV-certifikat' },
  { value: 'DEKRA_CERT', label: 'DEKRA-certifikat' },
  { value: 'OTHER', label: 'Annan standard' },
];

const CERT_BODIES_EXTENDED = [
  { value: 'DEKRA', label: 'DEKRA', numberFormat: /^DEKRA-\d{4,8}$/, example: 'DEKRA-12345678' },
  { value: 'TUV_SUD', label: 'TÜV SÜD', numberFormat: /^[A-Z]{2}\d{8,12}$/, example: 'DE12345678' },
  { value: 'TUV_NORD', label: 'TÜV NORD', numberFormat: /^TN-\d{6,10}$/, example: 'TN-123456' },
  { value: 'TUV_RHEINLAND', label: 'TÜV Rheinland', numberFormat: /^\d{4,6}[A-Z]{2}\d{4,8}$/, example: '01234AB5678' },
  { value: 'SGS', label: 'SGS', numberFormat: /^SGS\d{6,10}$/, example: 'SGS12345678' },
  { value: 'DNV', label: 'DNV', numberFormat: /^[A-Z]{3}-\d{6,8}$/, example: 'DNV-123456' },
  { value: 'BUREAU_VERITAS', label: 'Bureau Veritas', numberFormat: /^BV\d{6,10}$/, example: 'BV12345678' },
  { value: 'INTERTEK', label: 'Intertek', numberFormat: /^ITS\d{6,10}$/, example: 'ITS12345678' },
  { value: 'LRQA', label: 'LRQA', numberFormat: /^LRQ\d{7,10}$/, example: 'LRQ1234567' },
  { value: 'RISE', label: 'RISE', numberFormat: /^RISE-\d{4,8}$/, example: 'RISE-12345' },
  { value: 'SWEDAC', label: 'Swedac', numberFormat: /^\d{4,6}$/, example: '1234' },
  { value: 'INTERNAL', label: 'Intern revision', numberFormat: null, example: 'Valfritt format' },
];

function validateCertNumber(number: string, bodyValue: string): { valid: boolean; message: string } {
  const body = CERT_BODIES_EXTENDED.find(b => b.value === bodyValue);
  if (!body || !body.numberFormat) return { valid: true, message: '' };
  if (!number) return { valid: false, message: 'Certifikatnummer krävs' };
  if (!body.numberFormat.test(number)) {
    return { valid: false, message: `Ogiltigt format. Förväntat: ${body.example}` };
  }
  return { valid: true, message: '✓ Korrekt format' };
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function addYears(dateStr: string, years: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

const AUDIT_TYPE_LABELS: Record<string, string> = {
  ISO_CERTIFICATION: "ISO Certifiering",
  ISO_SURVEILLANCE: "ISO Övervakningsrevision",
  ISO_RECERTIFICATION: "ISO Omcertifiering",
  TUV_INSPECTION: "TÜV Inspektion",
  DEKRA_INSPECTION: "DEKRA Besiktning",
  SGS_AUDIT: "SGS Revision",
  DNV_AUDIT: "DNV Revision",
  SWEDAC_ACCREDITATION: "Swedac Ackreditering",
  INTERNAL_SPOT_CHECK: "Internt Stickprov",
  CUSTOMER_AUDIT: "Kundrevision",
  OEM_AUDIT: "OEM Revision",
  OTHER: "Övrigt",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: C.blue,
  IN_PROGRESS: C.orange,
  COMPLETED: C.green,
  CANCELLED: C.sub,
  PENDING_REPORT: C.orange,
};

const RESULT_COLORS: Record<string, string> = {
  PASSED: C.green,
  PASSED_WITH_OBSERVATIONS: C.orange,
  FAILED: C.red,
  CONDITIONAL: C.orange,
};

const RESULT_LABELS: Record<string, string> = {
  PASSED: "Godkänd",
  PASSED_WITH_OBSERVATIONS: "Godkänd med anmärkningar",
  FAILED: "Underkänd",
  CONDITIONAL: "Villkorad",
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE");
}

function urgencyColor(u: string): string {
  if (u === "EXPIRED") return C.red;
  if (u === "CRITICAL") return C.red;
  if (u === "WARNING") return C.orange;
  return C.green;
}

function urgencyLabel(days: number): string {
  if (days < 0) return `Utgått för ${Math.abs(days)} dagar sedan`;
  if (days === 0) return "Utgår idag!";
  return `${days} dagar kvar`;
}

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 28, maxWidth: 640, width: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>{title}</h2>
          <button onClick={onClose} style={{
            background: C.inset, border: "none", borderRadius: 8, padding: "6px 12px",
            cursor: "pointer", fontSize: 13, color: C.sub,
          }}>Stäng</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule Audit Modal
// ---------------------------------------------------------------------------
function ScheduleAuditModal({
  orgId, bodies, standards, onClose, onSaved,
}: {
  orgId: string;
  bodies: CertificationBody[];
  standards: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    audit_type: "ISO_CERTIFICATION",
    certification_body: "",
    certification_standard: "",
    auditor_name: "",
    auditor_company: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    scope: "",
    location: "",
    next_audit_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/api/external-audits?org_id=${orgId}`, form);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = (label: string, field: keyof typeof form, type = "text") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
          fontSize: 14, color: C.text, background: C.bg, boxSizing: "border-box",
        }}
      />
    </div>
  );

  return (
    <Modal title="Schemalägg ny revision" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Revisionstyp</label>
        <select value={form.audit_type} onChange={e => setForm(f => ({ ...f, audit_type: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg }}>
          {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Certifieringsorgan</label>
        <select value={form.certification_body} onChange={e => setForm(f => ({ ...f, certification_body: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg }}>
          <option value="">— välj —</option>
          {bodies.map(b => <option key={b.id} value={b.name}>{b.logo} {b.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Standard</label>
        <select value={form.certification_standard} onChange={e => setForm(f => ({ ...f, certification_standard: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg }}>
          <option value="">— välj —</option>
          {standards.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {inp("Revisors namn", "auditor_name")}
      {inp("Revisionsbolag", "auditor_company")}
      {inp("Datum", "scheduled_date", "date")}
      {inp("Plats", "location")}
      {inp("Scope / vad granskas", "scope")}
      {inp("Nästa revisionsdatum", "next_audit_date", "date")}
      {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
      <button onClick={save} disabled={saving} style={{
        background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px",
        fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
      }}>
        {saving ? "Sparar…" : "Schemalägg revision"}
      </button>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Complete Audit Modal
// ---------------------------------------------------------------------------
function CompleteAuditModal({
  audit, onClose, onSaved,
}: {
  audit: Audit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    result: "PASSED",
    actual_date: new Date().toISOString().split("T")[0],
    certificate_number: audit.certificate_number ?? "",
    certificate_valid_until: audit.certificate_valid_until ?? "",
    next_audit_date: audit.next_audit_date ?? "",
    report_url: audit.report_url ?? "",
    findings_text: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const findings = form.findings_text
        ? form.findings_text.split("\n").filter(Boolean).map(line => ({
            type: "OBSERVATION",
            description: line,
            reference: "",
          }))
        : [];
      await apiClient.patch(`/api/external-audits/${audit.id}/complete`, {
        result: form.result,
        actual_date: form.actual_date,
        certificate_number: form.certificate_number || null,
        certificate_valid_until: form.certificate_valid_until || null,
        next_audit_date: form.next_audit_date || null,
        report_url: form.report_url || null,
        findings,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Slutför revision" onClose={onClose}>
      <p style={{ color: C.sub, fontSize: 13, marginTop: 0 }}>
        {AUDIT_TYPE_LABELS[audit.audit_type] ?? audit.audit_type} · {audit.certification_body ?? ""}
      </p>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Resultat</label>
        <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg }}>
          <option value="PASSED">✅ Godkänd</option>
          <option value="PASSED_WITH_OBSERVATIONS">⚠️ Godkänd med anmärkningar</option>
          <option value="CONDITIONAL">🔶 Villkorad</option>
          <option value="FAILED">❌ Underkänd</option>
        </select>
      </div>
      {[
        ["Faktiskt datum", "actual_date", "date"],
        ["Certifikatnummer", "certificate_number", "text"],
        ["Certifikat giltigt t.o.m.", "certificate_valid_until", "date"],
        ["Nästa revisionsdatum", "next_audit_date", "date"],
        ["Rapport-URL", "report_url", "url"],
      ].map(([label, field, type]) => (
        <div key={field} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>{label}</label>
          <input type={type} value={(form as any)[field]}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg, boxSizing: "border-box" }}
          />
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Findings / anmärkningar (en per rad)</label>
        <textarea value={form.findings_text}
          onChange={e => setForm(f => ({ ...f, findings_text: e.target.value }))}
          rows={4}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg, boxSizing: "border-box", resize: "vertical" }}
          placeholder="T.ex. Dokumentation saknas för process X..."
        />
      </div>
      {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
      <button onClick={save} disabled={saving} style={{
        background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px",
        fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
      }}>
        {saving ? "Sparar…" : "Slutför revision"}
      </button>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Register Certificate Modal — expanded enterprise form
// ---------------------------------------------------------------------------
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase',
      letterSpacing: '0.08em', marginBottom: 10, marginTop: 20, paddingBottom: 6,
      borderBottom: `1px solid ${C.border}`,
    }}>{title}</div>
  );
}

function FieldHelp({ text }: { text: string }) {
  return <div style={{ fontSize: 11, color: C.tertiary, fontStyle: 'italic', marginTop: 3 }}>{text}</div>;
}

function RegisterCertModal({
  orgId, bodies, onClose, onSaved,
}: {
  orgId: string;
  bodies: CertificationBody[];
  standards: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    // Sektion 1 — Certifikat
    standard: '',
    certification_body: '',        // värde från CERT_BODIES_EXTENDED
    certification_body_label: '',  // visningsnamn
    certificate_number: '',
    scope: '',
    certified_activity: '',
    // Sektion 2 — Giltighetstider
    issued_date: '',
    valid_until: '',
    surveillance_interval_months: '12',
    next_surveillance_date: '',
    next_recertification_date: '',
    notification_days: '90,60,30',
    // Sektion 3 — Ansvarig & Dokument
    responsible_person: '',
    backup_responsible: '',
    certificate_document_url: '',
    linked_audit_id: '',
    // Sektion 4 — Anteckningar
    internal_notes: '',
    public_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [certValidation, setCertValidation] = useState<{ valid: boolean; message: string }>({ valid: true, message: '' });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // Auto-beräkna nästa övervakningsrevision när utfärdandedatum eller intervall ändras
  const handleIssuedDateChange = (val: string) => {
    set('issued_date', val);
    if (val && form.surveillance_interval_months) {
      set('next_surveillance_date', addMonths(val, parseInt(form.surveillance_interval_months)));
      set('next_recertification_date', addYears(val, 3));
    }
  };

  const handleIntervalChange = (val: string) => {
    set('surveillance_interval_months', val);
    if (form.issued_date && val) {
      set('next_surveillance_date', addMonths(form.issued_date, parseInt(val)));
    }
  };

  const handleBodyChange = (val: string) => {
    const body = CERT_BODIES_EXTENDED.find(b => b.value === val);
    set('certification_body', val);
    set('certification_body_label', body?.label ?? val);
    if (form.certificate_number) {
      setCertValidation(validateCertNumber(form.certificate_number, val));
    }
  };

  const handleCertNumberChange = (val: string) => {
    set('certificate_number', val);
    setCertValidation(validateCertNumber(val, form.certification_body));
  };

  const selectedBody = CERT_BODIES_EXTENDED.find(b => b.value === form.certification_body);

  const save = async () => {
    if (!form.standard) { setError('Standard krävs'); return; }
    if (!form.valid_until) { setError('Giltigt t.o.m. krävs'); return; }
    if (!certValidation.valid) { setError('Certifikatnumret har fel format'); return; }
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/api/certifications?org_id=${orgId}`, {
        standard: form.standard,
        certification_body: form.certification_body_label || form.certification_body,
        certificate_number: form.certificate_number || null,
        scope: form.scope || null,
        certified_activity: form.certified_activity || null,
        issued_date: form.issued_date || null,
        valid_until: form.valid_until,
        surveillance_interval_months: parseInt(form.surveillance_interval_months) || 12,
        next_surveillance_date: form.next_surveillance_date || null,
        next_recertification_date: form.next_recertification_date || null,
        notification_days: form.notification_days,
        responsible_person: form.responsible_person || null,
        backup_responsible: form.backup_responsible || null,
        certificate_document_url: form.certificate_document_url || null,
        linked_audit_id: form.linked_audit_id || null,
        internal_notes: form.internal_notes || null,
        public_notes: form.public_notes || null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
    fontSize: 14, color: C.text, background: C.bg, boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4,
  } as React.CSSProperties;

  return (
    <Modal title="Registrera certifikat" onClose={onClose}>

      {/* ── SEKTION 1: CERTIFIKAT ── */}
      <SectionHeader title="1. Certifikat" />

      {/* Standard */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Standard *</label>
        <select value={form.standard} onChange={e => set('standard', e.target.value)}
          style={{ ...inputStyle }}>
          <option value="">— välj standard —</option>
          {STANDARDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <FieldHelp text="Välj den ISO- eller branschstandard som certifikatet avser" />
      </div>

      {/* Certifieringsorgan */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Certifieringsorgan</label>
        <select value={form.certification_body} onChange={e => handleBodyChange(e.target.value)}
          style={{ ...inputStyle }}>
          <option value="">— välj certifieringsorgan —</option>
          {CERT_BODIES_EXTENDED.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        {selectedBody && (
          <FieldHelp text={`Förväntat certifikatnummer-format: ${selectedBody.example}`} />
        )}
      </div>

      {/* Certifikatnummer med validering */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Certifikatnummer</label>
        <input
          type="text"
          value={form.certificate_number}
          onChange={e => handleCertNumberChange(e.target.value)}
          placeholder={selectedBody?.example ?? 'T.ex. DEKRA-12345678'}
          style={{
            ...inputStyle,
            border: `1px solid ${
              form.certificate_number && !certValidation.valid ? C.red :
              form.certificate_number && certValidation.valid ? C.green :
              C.border
            }`,
          }}
        />
        {form.certificate_number && (
          <div style={{
            fontSize: 12, marginTop: 3,
            color: certValidation.valid ? C.green : C.red,
            fontWeight: certValidation.valid ? 600 : 400,
          }}>
            {certValidation.message}
          </div>
        )}
        {!form.certificate_number && selectedBody && (
          <FieldHelp text={`Format: ${selectedBody.example}`} />
        )}
      </div>

      {/* Scope */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Scope / Verksamhetsområde</label>
        <textarea
          value={form.scope}
          onChange={e => set('scope', e.target.value.slice(0, 200))}
          rows={3}
          maxLength={200}
          placeholder="T.ex. Design, tillverkning och service av hydrauliksystem"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <FieldHelp text={`${form.scope.length}/200 tecken — Beskriver vilket verksamhetsområde som täcks av certifikatet`} />
      </div>

      {/* Certifierad verksamhet */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Certifierad verksamhet</label>
        <input
          type="text"
          value={form.certified_activity}
          onChange={e => set('certified_activity', e.target.value)}
          placeholder="T.ex. Produktion av elektriska komponenter vid anläggning i Göteborg"
          style={inputStyle}
        />
        <FieldHelp text="Precisera exakt vad (process, produkt, anläggning) som är certifierat" />
      </div>

      {/* ── SEKTION 2: GILTIGHETSTIDER ── */}
      <SectionHeader title="2. Giltighetstider" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Utfärdandedatum */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Utfärdandedatum</label>
          <input
            type="date"
            value={form.issued_date}
            onChange={e => handleIssuedDateChange(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Giltigt t.o.m. */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Giltigt t.o.m. *</label>
          <input
            type="date"
            value={form.valid_until}
            onChange={e => set('valid_until', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Övervakningsintervall */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Övervakningsintervall (månader)</label>
        <select value={form.surveillance_interval_months} onChange={e => handleIntervalChange(e.target.value)}
          style={{ ...inputStyle }}>
          <option value="6">6 månader</option>
          <option value="12">12 månader (standard)</option>
          <option value="18">18 månader</option>
          <option value="24">24 månader</option>
        </select>
        <FieldHelp text="Hur ofta övervakningsrevisor besöker — vanligtvis 12 månader för ISO" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Nästa övervakningsrevision (auto) */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nästa övervakningsrevision</label>
          <input
            type="date"
            value={form.next_surveillance_date}
            onChange={e => set('next_surveillance_date', e.target.value)}
            style={{ ...inputStyle, background: form.next_surveillance_date ? `${C.blue}08` : C.bg }}
          />
          <FieldHelp text="Auto-beräknas från utfärdandedatum + intervall" />
        </div>

        {/* Nästa omcertifiering */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nästa omcertifiering</label>
          <input
            type="date"
            value={form.next_recertification_date}
            onChange={e => set('next_recertification_date', e.target.value)}
            style={{ ...inputStyle, background: form.next_recertification_date ? `${C.blue}08` : C.bg }}
          />
          <FieldHelp text="Auto-satt till 3 år från utfärdandedatum (justerbar)" />
        </div>
      </div>

      {/* Autonotifiering */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Autonotifiering — påminnelse (dagar innan)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['30', '60', '90'].map(d => {
            const active = form.notification_days.split(',').includes(d);
            return (
              <button key={d} type="button" onClick={() => {
                const days = form.notification_days.split(',').filter(Boolean);
                const next = active ? days.filter(x => x !== d) : [...days, d];
                set('notification_days', next.sort((a, b) => parseInt(b) - parseInt(a)).join(','));
              }} style={{
                padding: '6px 14px', borderRadius: 8, border: `1px solid ${active ? C.blue : C.border}`,
                background: active ? `${C.blue}15` : C.bg, color: active ? C.blue : C.sub,
                fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer',
              }}>
                {d} dagar
              </button>
            );
          })}
        </div>
        <FieldHelp text="Välj när systemet ska skicka påminnelse om kommande förfallodatum" />
      </div>

      {/* ── SEKTION 3: ANSVARIG & DOKUMENT ── */}
      <SectionHeader title="3. Ansvarig & Dokument" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Ansvarig person</label>
          <input type="text" value={form.responsible_person}
            onChange={e => set('responsible_person', e.target.value)}
            placeholder="Namn eller e-post"
            style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Backup-ansvarig</label>
          <input type="text" value={form.backup_responsible}
            onChange={e => set('backup_responsible', e.target.value)}
            placeholder="Namn eller e-post"
            style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Certifikatdokument (URL)</label>
        <input type="url" value={form.certificate_document_url}
          onChange={e => set('certificate_document_url', e.target.value)}
          placeholder="https://… eller intern sökväg"
          style={inputStyle} />
        <FieldHelp text="Länk till det officiella certifikatdokumentet (PDF, portal, etc.)" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Tillhörande revision (ID)</label>
        <input type="text" value={form.linked_audit_id}
          onChange={e => set('linked_audit_id', e.target.value)}
          placeholder="Revision-ID att koppla till detta certifikat"
          style={inputStyle} />
      </div>

      {/* ── SEKTION 4: ANTECKNINGAR ── */}
      <SectionHeader title="4. Anteckningar" />

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Interna anteckningar</label>
        <textarea value={form.internal_notes}
          onChange={e => set('internal_notes', e.target.value)}
          rows={3}
          placeholder="Synliga enbart internt — uppföljningspunkter, kontakter, beslut…"
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Externt synlig information</label>
        <textarea value={form.public_notes}
          onChange={e => set('public_notes', e.target.value)}
          rows={2}
          placeholder="Synlig i customer portal och externa rapporter"
          style={{ ...inputStyle, resize: 'vertical' }} />
        <FieldHelp text="Visas för kunder i portalen — skriv inget känsligt här" />
      </div>

      {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button onClick={save} disabled={saving} style={{
        background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px',
        fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
      }}>
        {saving ? 'Sparar…' : '🏅 Registrera certifikat'}
      </button>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Certificate Card — rich card view for registry
// ---------------------------------------------------------------------------
function CertificateCard({ cert, bodies }: { cert: Certification; bodies: CertificationBody[] }) {
  const daysLeft = cert.days_until_expiry;
  const urgency = daysLeft < 30 ? 'critical' : daysLeft < 90 ? 'warning' : 'ok';

  const borderColor = urgency === 'critical' ? C.red : urgency === 'warning' ? C.yellow : C.green;
  const badgeBg = urgency === 'critical' ? '#FF3B3010' : urgency === 'warning' ? '#FF950010' : '#34C75910';
  const badgeColor = urgency === 'critical' ? C.red : urgency === 'warning' ? C.yellow : C.green;

  const standardLabel = STANDARDS.find(s => s.value === cert.standard)?.label ?? cert.standard;
  const bodyLogo = bodies.find(b => b.name === cert.certification_body)?.logo ?? '🏅';

  return (
    <div style={{
      background: C.surface,
      border: `0.5px solid ${borderColor}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: '0 10px 10px 0',
      padding: '16px 20px',
      marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {bodyLogo} {standardLabel}
          </div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
            {cert.certification_body ?? '—'}
            {cert.certificate_number ? ` · #${cert.certificate_number}` : ''}
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: badgeBg, color: badgeColor, alignSelf: 'flex-start', whiteSpace: 'nowrap',
        }}>
          {urgency === 'critical'
            ? `${daysLeft}d — KRITISK`
            : urgency === 'warning'
            ? `${daysLeft}d — Löper snart`
            : `Giltig t.o.m. ${new Date(cert.valid_until).toLocaleDateString('sv-SE')}`}
        </div>
      </div>

      {/* Scope */}
      {cert.scope && (
        <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>{cert.scope}</div>
      )}

      {/* Progress bar */}
      <div style={{ height: 3, background: C.fill, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, (daysLeft / 365) * 100))}%`,
          background: borderColor,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: C.tertiary }}>
        <span>
          Nästa revision:{' '}
          {cert.next_surveillance_date
            ? new Date(cert.next_surveillance_date).toLocaleDateString('sv-SE')
            : '—'}
        </span>
        {cert.certificate_document_url && (
          <a
            href={cert.certificate_document_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.blue, textDecoration: 'none' }}
          >
            📄 Certifikatdokument
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Detail Panel
// ---------------------------------------------------------------------------
function AuditDetailPanel({ audit, onClose, onComplete, orgId }: {
  audit: Audit;
  orgId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [showComplete, setShowComplete] = useState(false);

  return (
    <>
      <Modal title={AUDIT_TYPE_LABELS[audit.audit_type] ?? audit.audit_type} onClose={onClose}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            ["Certifieringsorgan", audit.certification_body ?? "—"],
            ["Standard", audit.certification_standard ?? "—"],
            ["Revisor", audit.auditor_name ?? "—"],
            ["Revisionsbolag", audit.auditor_company ?? "—"],
            ["Planerat datum", formatDate(audit.scheduled_date)],
            ["Faktiskt datum", formatDate(audit.actual_date)],
            ["Plats", audit.location ?? "—"],
            ["Status", audit.status],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: 14, color: C.text, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
        {audit.scope && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scope</div>
            <div style={{ fontSize: 14, color: C.text, marginTop: 4 }}>{audit.scope}</div>
          </div>
        )}
        {audit.result && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Resultat</div>
            <span style={{
              background: `${RESULT_COLORS[audit.result]}20`,
              color: RESULT_COLORS[audit.result],
              borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 600,
            }}>{RESULT_LABELS[audit.result] ?? audit.result}</span>
          </div>
        )}
        {audit.findings && audit.findings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Findings ({audit.findings.length})
            </div>
            {audit.findings.map((f: any, i: number) => (
              <div key={i} style={{
                background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 8,
                borderLeft: `3px solid ${f.type === "NC" ? C.red : f.type === "OBSERVATION" ? C.orange : C.blue}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>{f.type ?? "OBSERVATION"}</div>
                <div style={{ fontSize: 13, color: C.text }}>{f.description}</div>
              </div>
            ))}
          </div>
        )}
        {audit.certificate_number && (
          <div style={{ background: `${C.green}15`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>🏅 CERTIFIKAT</div>
            <div style={{ fontSize: 14, color: C.text, marginTop: 4 }}>Nr: {audit.certificate_number}</div>
            <div style={{ fontSize: 13, color: C.sub }}>Giltigt t.o.m. {formatDate(audit.certificate_valid_until)}</div>
          </div>
        )}
        {audit.status !== "COMPLETED" && audit.status !== "CANCELLED" && (
          <button onClick={() => setShowComplete(true)} style={{
            background: C.green, color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
          }}>
            Slutför revision
          </button>
        )}
      </Modal>
      {showComplete && (
        <CompleteAuditModal
          audit={audit}
          onClose={() => setShowComplete(false)}
          onSaved={onComplete}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ExternalAuditModule({ orgId }: { orgId?: string }) {
  const [view, setView] = useState<"dashboard" | "calendar" | "registry">("dashboard");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [expiring, setExpiring] = useState<Certification[]>([]);
  const [bodies, setBodies] = useState<CertificationBody[]>([]);
  const [standards, setStandards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRegisterCert, setShowRegisterCert] = useState(false);
  const [spotChecking, setSpotChecking] = useState(false);
  const [filterStandard, setFilterStandard] = useState("");
  const [filterBody, setFilterBody] = useState("");

  const oid = orgId ?? "00000000-0000-0000-0000-000000000000";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c, e, b] = await Promise.all([
        apiClient.get<{ audits: Audit[] }>(`/api/external-audits?org_id=${oid}`),
        apiClient.get<{ certifications: Certification[] }>(`/api/certifications?org_id=${oid}`),
        apiClient.get<{ expiring: Certification[] }>(`/api/external-audits/expiring-certs?org_id=${oid}`),
        apiClient.get<{ bodies: CertificationBody[]; standards: string[] }>("/api/external-audits/certification-bodies"),
      ]);
      setAudits(a.audits ?? []);
      setCerts(c.certifications ?? []);
      setExpiring(e.expiring ?? []);
      setBodies(b.bodies ?? []);
      setStandards(b.standards ?? []);
    } catch { /* silently fail — API may not be up in preview */ }
    setLoading(false);
  }, [oid]);

  useEffect(() => { load(); }, [load]);

  const createSpotCheck = async () => {
    setSpotChecking(true);
    try {
      await apiClient.post(`/api/external-audits/spot-check?org_id=${oid}`, { trigger: "random" });
      await load();
    } catch { /* ignore */ }
    setSpotChecking(false);
  };

  const filteredCerts = certs.filter(c =>
    (!filterStandard || c.standard === filterStandard) &&
    (!filterBody || c.certification_body === filterBody)
  );

  const upcoming = audits
    .filter(a => a.status === "SCHEDULED" || a.status === "IN_PROGRESS")
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text }}>Revisioner & Certifikat</h1>
          <p style={{ margin: "4px 0 0", color: C.sub, fontSize: 14 }}>
            DEKRA · TÜV · SGS · DNV · ISO-certifikat · Interna stickprov
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={createSpotCheck} disabled={spotChecking} style={{
            background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.text,
          }}>
            {spotChecking ? "Slumpar…" : "🎲 Stickprov"}
          </button>
          <button onClick={() => setShowRegisterCert(true)} style={{
            background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.text,
          }}>
            + Certifikat
          </button>
          <button onClick={() => setShowSchedule(true)} style={{
            background: C.blue, color: "#fff", border: "none", borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            + Schemalägg revision
          </button>
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiring.length > 0 && (
        <div style={{
          background: `${C.red}12`, border: `1px solid ${C.red}30`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 20,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: C.red, fontSize: 14 }}>
              {expiring.length} certifikat förfaller inom 90 dagar
            </div>
            <div style={{ color: C.text, fontSize: 13, marginTop: 4 }}>
              {expiring.slice(0, 3).map(e => `${e.standard} (${formatDate(e.valid_until)})`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: C.inset, borderRadius: 12, padding: 4 }}>
        {[
          { key: "dashboard", label: "📊 Certifikat-dashboard" },
          { key: "calendar", label: "📅 Revisionskalender" },
          { key: "registry", label: "🏅 Certifikatsregister" },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key as any)} style={{
            flex: 1, padding: "8px 16px", borderRadius: 10, border: "none",
            background: view === t.key ? C.card : "transparent",
            fontWeight: view === t.key ? 700 : 400,
            color: view === t.key ? C.text : C.sub,
            cursor: "pointer", fontSize: 13,
            boxShadow: view === t.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.sub }}>Laddar…</div>
      ) : (
        <>
          {/* ─── VY 1: Dashboard ─── */}
          {view === "dashboard" && (
            <div>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Aktiva certifikat", value: certs.filter(c => c.status === "ACTIVE").length, color: C.green },
                  { label: "Kommande revisioner", value: upcoming.length, color: C.blue },
                  { label: "Förfaller inom 90 dagar", value: expiring.length, color: expiring.length > 0 ? C.red : C.sub },
                  { label: "Avslutade revisioner", value: audits.filter(a => a.status === "COMPLETED").length, color: C.sub },
                ].map(s => (
                  <div key={s.label} style={{
                    background: C.card, borderRadius: 14, padding: "18px 20px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Active Certs */}
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>Aktiva certifikat</h2>
              {certs.filter(c => c.status === "ACTIVE").length === 0 ? (
                <div style={{ background: C.card, borderRadius: 14, padding: 40, textAlign: "center", color: C.sub }}>
                  Inga aktiva certifikat — registrera ditt första certifikat →
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 28 }}>
                  {certs.filter(c => c.status === "ACTIVE").map(cert => (
                    <div key={cert.id} style={{
                      background: C.card, borderRadius: 14, padding: "18px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      borderLeft: `4px solid ${urgencyColor(cert.expiry_urgency)}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{cert.standard}</div>
                        <span style={{
                          background: `${urgencyColor(cert.expiry_urgency)}20`,
                          color: urgencyColor(cert.expiry_urgency),
                          borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        }}>
                          {urgencyLabel(cert.days_until_expiry)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>{cert.certification_body ?? "—"}</div>
                      {cert.certificate_number && (
                        <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Nr: {cert.certificate_number}</div>
                      )}
                      <div style={{ fontSize: 13, color: C.text, marginTop: 10, fontWeight: 600 }}>
                        Giltigt t.o.m. {formatDate(cert.valid_until)}
                      </div>
                      {cert.scope && (
                        <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{cert.scope}</div>
                      )}
                      {cert.next_surveillance_date && (
                        <div style={{ fontSize: 12, color: C.blue, marginTop: 8 }}>
                          📅 Nästa övervakningsrevision: {formatDate(cert.next_surveillance_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming timeline */}
              {upcoming.length > 0 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>Kommande revisioner</h2>
                  <div style={{ background: C.card, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    {upcoming.slice(0, 5).map((audit, i) => (
                      <div key={audit.id} onClick={() => setSelectedAudit(audit)} style={{
                        display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                        borderBottom: i < upcoming.length - 1 ? `1px solid ${C.border}` : "none",
                        cursor: "pointer",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ fontSize: 24 }}>{
                          bodies.find(b => b.name === audit.certification_body)?.logo ?? "📋"
                        }</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                            {AUDIT_TYPE_LABELS[audit.audit_type] ?? audit.audit_type}
                          </div>
                          <div style={{ fontSize: 13, color: C.sub }}>
                            {audit.certification_body ?? "Intern"} · {audit.certification_standard ?? ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{formatDate(audit.scheduled_date)}</div>
                          <span style={{
                            background: `${STATUS_COLORS[audit.status]}20`,
                            color: STATUS_COLORS[audit.status],
                            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                          }}>{audit.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── VY 2: Revisionskalender ─── */}
          {view === "calendar" && (
            <div>
              <div style={{ background: C.card, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                {audits.length === 0 ? (
                  <div style={{ padding: 60, textAlign: "center", color: C.sub }}>
                    Inga revisioner schemalagda — klicka "Schemalägg revision" ovan
                  </div>
                ) : (
                  audits.map((audit, i) => (
                    <div key={audit.id} onClick={() => setSelectedAudit(audit)} style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                      borderBottom: i < audits.length - 1 ? `1px solid ${C.border}` : "none",
                      cursor: "pointer",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ fontSize: 28 }}>{
                        audit.is_spot_check ? "🎲" :
                        bodies.find(b => b.name === audit.certification_body)?.logo ?? "📋"
                      }</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                          {AUDIT_TYPE_LABELS[audit.audit_type] ?? audit.audit_type}
                          {audit.is_spot_check && <span style={{ color: C.orange, marginLeft: 8, fontSize: 12 }}>STICKPROV</span>}
                        </div>
                        <div style={{ fontSize: 13, color: C.sub }}>
                          {audit.certification_body ?? "Intern"}
                          {audit.certification_standard ? ` · ${audit.certification_standard}` : ""}
                          {audit.scope ? ` · ${audit.scope.slice(0, 60)}` : ""}
                        </div>
                        {audit.findings && audit.findings.length > 0 && (
                          <div style={{ fontSize: 12, color: C.orange, marginTop: 4 }}>
                            {audit.findings.length} finding(s)
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", minWidth: 100 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                          {formatDate(audit.scheduled_date)}
                        </div>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                          {audit.result && (
                            <span style={{
                              background: `${RESULT_COLORS[audit.result]}20`,
                              color: RESULT_COLORS[audit.result],
                              borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                            }}>{RESULT_LABELS[audit.result]}</span>
                          )}
                          <span style={{
                            background: `${STATUS_COLORS[audit.status]}20`,
                            color: STATUS_COLORS[audit.status],
                            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                          }}>{audit.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── VY 3: Certifikatsregister ─── */}
          {view === "registry" && (
            <div>
              {/* Filters + Export */}
              <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                <select value={filterStandard} onChange={e => setFilterStandard(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: C.card }}>
                  <option value="">Alla standarder</option>
                  {STANDARDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={filterBody} onChange={e => setFilterBody(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: C.card }}>
                  <option value="">Alla certifieringsorgan</option>
                  {CERT_BODIES_EXTENDED.map(b => <option key={b.value} value={b.label}>{b.label}</option>)}
                </select>
                <div style={{ flex: 1 }} />
                <button onClick={() => {
                  const rows = filteredCerts.map(c =>
                    [
                      STANDARDS.find(s => s.value === c.standard)?.label ?? c.standard,
                      c.certification_body, c.certificate_number,
                      formatDate(c.valid_until), c.status,
                      c.days_until_expiry + ' dagar kvar',
                    ].join("\t")
                  );
                  const text = ["Standard\tOrgan\tCertifikatnummer\tGiltigt t.o.m.\tStatus\tDagar kvar", ...rows].join("\n");
                  navigator.clipboard.writeText(text);
                }} style={{
                  background: C.inset, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "8px 14px", fontSize: 13, cursor: "pointer", color: C.sub,
                }}>
                  📋 Exportera
                </button>
              </div>

              {/* Summary row */}
              {filteredCerts.length > 0 && (
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Totalt", value: filteredCerts.length, color: C.sub },
                    { label: "Aktiva", value: filteredCerts.filter(c => c.status === "ACTIVE").length, color: C.green },
                    { label: "Kritiska (< 30 dagar)", value: filteredCerts.filter(c => c.days_until_expiry < 30).length, color: C.red },
                    { label: "Varning (< 90 dagar)", value: filteredCerts.filter(c => c.days_until_expiry >= 30 && c.days_until_expiry < 90).length, color: C.orange },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: C.card, borderRadius: 10, padding: "8px 14px",
                      fontSize: 13, color: C.sub,
                    }}>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span> {s.label}
                    </div>
                  ))}
                </div>
              )}

              {filteredCerts.length === 0 ? (
                <div style={{ background: C.card, borderRadius: 14, padding: 60, textAlign: "center", color: C.sub }}>
                  Inga certifikat registrerade — klicka "+ Certifikat" för att lägga till
                </div>
              ) : (
                <div>
                  {/* Critical first, then warning, then ok */}
                  {(['critical', 'warning', 'ok'] as const).map(level => {
                    const levelCerts = filteredCerts.filter(c => {
                      const d = c.days_until_expiry;
                      if (level === 'critical') return d < 30;
                      if (level === 'warning') return d >= 30 && d < 90;
                      return d >= 90;
                    });
                    if (levelCerts.length === 0) return null;
                    return (
                      <div key={level}>
                        {level !== 'ok' && (
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: level === 'critical' ? C.red : C.orange,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            marginBottom: 8, marginTop: level === 'warning' ? 16 : 0,
                          }}>
                            {level === 'critical' ? '🔴 Kritiska certifikat' : '🟡 Löper ut snart'}
                          </div>
                        )}
                        {level === 'ok' && levelCerts.length > 0 && (
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: C.green,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            marginBottom: 8, marginTop: 16,
                          }}>
                            🟢 Giltiga certifikat
                          </div>
                        )}
                        {levelCerts.map(cert => (
                          <CertificateCard key={cert.id} cert={cert} bodies={bodies} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showSchedule && (
        <ScheduleAuditModal
          orgId={oid}
          bodies={bodies}
          standards={standards}
          onClose={() => setShowSchedule(false)}
          onSaved={load}
        />
      )}
      {showRegisterCert && (
        <RegisterCertModal
          orgId={oid}
          bodies={bodies}
          standards={[]}
          onClose={() => setShowRegisterCert(false)}
          onSaved={load}
        />
      )}
      {selectedAudit && (
        <AuditDetailPanel
          audit={selectedAudit}
          orgId={oid}
          onClose={() => setSelectedAudit(null)}
          onComplete={() => { load(); setSelectedAudit(null); }}
        />
      )}
    </div>
  );
}
