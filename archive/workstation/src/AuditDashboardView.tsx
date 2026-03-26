import { useState, useCallback } from "react";
import { useApi } from "./useApi";

// ─────────────────────────────────────────────────────────────
// Colour palette  (mirrors rest of app)
// ─────────────────────────────────────────────────────────────
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
  purple: "#AF52DE",
  indigo: "#5856D6",
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface DimensionFactor {
  name: string;
  weight: number; // percent
  score: number;  // 0-100
}
interface Dimension {
  id: string;
  icon: string;
  name: string;
  score: number;
  trend: number;
  factors: DimensionFactor[];
  recommendation?: string;
}
interface PerformanceScore {
  overall: number;
  updatedAt: string;
  shopName: string;
  industryAvg: number;
  bestInClass: number;
  dimensions: Dimension[];
}
interface Certification {
  id: string;
  name: string;
  issuer: string;
  certNumber?: string;
  issuedDate?: string;
  validUntil: string;
  nextReview?: string;
  status: "active" | "upcoming" | "gap";
  readinessPct: number;
  estimatedMonths?: string;
  regulationRef?: string;
}
interface AuditLogEntry {
  id: string;
  date: string;
  type: "internal" | "external" | "spot-check" | "self-check" | "regulatory";
  title: string;
  inspector?: string;
  company?: string;
  result: "GODKÄND" | "UNDERKÄND" | "GODKÄND MED ANMÄRKNINGAR";
  scorePct?: number;
  deviations?: number;
  notes?: string;
  certValid?: string;
}

// ─────────────────────────────────────────────────────────────
// FALLBACK demo data  (used when API returns nothing)
// ─────────────────────────────────────────────────────────────
const DEMO_SCORE: PerformanceScore = {
  overall: 87,
  updatedAt: "Idag 09:47",
  shopName: "Lindqvists Bilverkstad",
  industryAvg: 71,
  bestInClass: 94,
  dimensions: [
    {
      id: "docs",
      icon: "🔒",
      name: "Dokumentation & Spårbarhet",
      score: 92,
      trend: 4,
      factors: [
        { name: "Serviceprotokoll kompletta", weight: 35, score: 95 },
        { name: "Fotodokumentation", weight: 30, score: 91 },
        { name: "Historikspårbarhet", weight: 20, score: 89 },
        { name: "Digital signering", weight: 15, score: 92 },
      ],
      recommendation: "Fortsätt den starka trenden. Fokus på Historikspårbarhet kan ta er till 95+.",
    },
    {
      id: "tech",
      icon: "🔧",
      name: "Teknisk kvalitet",
      score: 84,
      trend: 0,
      factors: [
        { name: "Stickprov godkänt", weight: 40, score: 76 },
        { name: "Återarbete < 2%", weight: 30, score: 91 },
        { name: "Verktygsunderhåll", weight: 20, score: 88 },
        { name: "Certifierade mekaniker", weight: 10, score: 90 },
      ],
      recommendation: "2 kritiska avvikelser i senaste stickprov kräver åtgärdsplan inom 7 dagar.",
    },
    {
      id: "hr",
      icon: "👥",
      name: "Personalhantering",
      score: 88,
      trend: 2,
      factors: [
        { name: "Personalliggare compliant", weight: 40, score: 100 },
        { name: "Utbildningar klara", weight: 30, score: 82 },
        { name: "Intro genomförd", weight: 20, score: 80 },
        { name: "Frånvarohantering", weight: 10, score: 88 },
      ],
      recommendation: "3 medarbetare har ej slutfört obligatorisk brandskyddsutbildning.",
    },
    {
      id: "legal",
      icon: "⚖️",
      name: "Regelefterlevnad (SFL, ML, ABL)",
      score: 94,
      trend: 1,
      factors: [
        { name: "Skattedeklarationer i tid", weight: 35, score: 100 },
        { name: "Kassaregister godkänt", weight: 30, score: 100 },
        { name: "ROT/RUT-rapportering", weight: 20, score: 88 },
        { name: "GDPR-efterlevnad", weight: 15, score: 84 },
      ],
    },
    {
      id: "vehicle",
      icon: "🚗",
      name: "Fordonshantering",
      score: 79,
      trend: -3,
      factors: [
        { name: "Exit capture compliance", weight: 30, score: 67 },
        { name: "Intagsprotokoll komplett", weight: 25, score: 91 },
        { name: "Dokumentation av skada", weight: 20, score: 88 },
        { name: "Kundkommunikation vid försening", weight: 15, score: 73 },
        { name: "Återkallelse-hantering", weight: 10, score: 100 },
      ],
      recommendation: "Aktivera påminnelse till mekaniker om Exit Capture. Mål: 95% inom 30 dagar.",
    },
    {
      id: "finance",
      icon: "💰",
      name: "Ekonomisk kontroll",
      score: 91,
      trend: 2,
      factors: [
        { name: "Fakturor i tid", weight: 40, score: 94 },
        { name: "Reklamationshantering", weight: 30, score: 88 },
        { name: "Lagervärdering aktuell", weight: 20, score: 92 },
        { name: "Budgetavvikelse < 5%", weight: 10, score: 90 },
      ],
    },
    {
      id: "cx",
      icon: "🌟",
      name: "Kundupplevelse",
      score: 82,
      trend: 0,
      factors: [
        { name: "NPS ≥ 60", weight: 40, score: 83 },
        { name: "Svarstid klagomål < 24h", weight: 30, score: 73 },
        { name: "Öppna klagomål = 0", weight: 20, score: 60 },
        { name: "Återkomstgrad", weight: 10, score: 95 },
      ],
      recommendation: "2 öppna klagomål ej hanterade sedan > 48h. Hanteras omedelbart.",
    },
  ],
};

const DEMO_CERTS: Certification[] = [
  {
    id: "iso9001",
    name: "ISO 9001:2015 — Kvalitetsledning",
    issuer: "DEKRA Certification AB",
    certNumber: "ISO-2024-00312",
    issuedDate: "2024-03-15",
    validUntil: "2027-03-14",
    nextReview: "2026-09-15",
    status: "active",
    readinessPct: 94,
  },
  {
    id: "personalliggare",
    name: "Personalliggare (SFL 39 kap)",
    issuer: "Skatteverket",
    issuedDate: "2026-03-01",
    validUntil: "2026-09-01",
    status: "active",
    readinessPct: 100,
    regulationRef: "SFL 39 kap",
  },
  {
    id: "kassaregister",
    name: "Kassaregister (SKVFS 2014:9)",
    issuer: "Skatteverket",
    certNumber: "KR-2024-00847",
    issuedDate: "2024-01-10",
    validUntil: "2027-01-09",
    status: "active",
    readinessPct: 100,
    regulationRef: "SKVFS 2014:9",
  },
  {
    id: "rotrut",
    name: "ROT/RUT-avdrag",
    issuer: "Skatteverket",
    validUntil: "2099-01-01",
    status: "active",
    readinessPct: 100,
  },
  {
    id: "iso9001-surv",
    name: "ISO 9001 — Övervakningsrevision",
    issuer: "DEKRA",
    validUntil: "2026-09-15",
    nextReview: "2026-09-15",
    status: "upcoming",
    readinessPct: 94,
  },
  {
    id: "miljobas",
    name: "Fordonsbesiktning (miljöbas)",
    issuer: "Transportstyrelsen",
    validUntil: "2026-06-01",
    nextReview: "2026-06-01",
    status: "upcoming",
    readinessPct: 61,
  },
  {
    id: "iso14001",
    name: "ISO 14001 — Miljöledning",
    issuer: "",
    validUntil: "",
    status: "gap",
    readinessPct: 45,
    estimatedMonths: "6-9 månader",
  },
  {
    id: "iso45001",
    name: "ISO 45001 — Arbetsmiljö",
    issuer: "",
    validUntil: "",
    status: "gap",
    readinessPct: 62,
    estimatedMonths: "4-6 månader",
  },
];

const DEMO_LOG: AuditLogEntry[] = [
  {
    id: "al1",
    date: "2026-03-22",
    type: "spot-check",
    title: "Internt stickprov — Bromsar",
    inspector: "Eric Karlsson → Robin Björks arbete",
    result: "UNDERKÄND",
    scorePct: 60,
    deviations: 2,
    notes: "2 kritiska avvikelser. Handlingsplan skapad.",
  },
  {
    id: "al2",
    date: "2026-03-20",
    type: "internal",
    title: "Månadsaudit — Serviceprotokoll",
    inspector: "Maria Lindqvist",
    result: "GODKÄND",
    scorePct: 92,
    deviations: 1,
  },
  {
    id: "al3",
    date: "2026-03-15",
    type: "external",
    title: "Extern revision — DEKRA (ISO 9001)",
    inspector: "Lars Persson",
    company: "DEKRA Certification AB",
    result: "GODKÄND MED ANMÄRKNINGAR",
    deviations: 2,
    certValid: "2027-03-14",
    notes: "2 minor findings. Certifikat giltigt till 2027-03-14.",
  },
  {
    id: "al4",
    date: "2026-03-01",
    type: "regulatory",
    title: "Skatteverket — Personalliggarkontroll",
    inspector: "Skatteverket Region Stockholm",
    result: "GODKÄND",
    deviations: 0,
  },
  {
    id: "al5",
    date: "2026-02-14",
    type: "spot-check",
    title: "Internt stickprov — Dokumentation",
    inspector: "Maria Lindqvist",
    result: "GODKÄND",
    scorePct: 88,
  },
  {
    id: "al6",
    date: "2026-02-01",
    type: "self-check",
    title: "Egenkontroll — Kundärenden & NPS",
    inspector: "Eric Karlsson",
    result: "GODKÄND",
    scorePct: 81,
    deviations: 1,
  },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 90) return C.green;
  if (s >= 80) return C.blue;
  if (s >= 70) return C.orange;
  return C.red;
}
function trendLabel(t: number) {
  if (t > 0) return { icon: "↑", color: C.green, label: `+${t}` };
  if (t < 0) return { icon: "↓", color: C.red, label: `${t}` };
  return { icon: "→", color: C.sub, label: "0" };
}
function stars(score: number) {
  const s = Math.round(score / 20); // 0-5
  return "★".repeat(s) + "☆".repeat(5 - s);
}
function levelLabel(score: number) {
  if (score >= 95) return "Branschledande";
  if (score >= 90) return "Utmärkt standard";
  if (score >= 80) return "Hög standard med förbättringspotential";
  if (score >= 70) return "Godkänd nivå, åtgärder rekommenderas";
  return "Under branschsnitt — åtgärder krävs";
}
function ProgressBar({
  pct,
  color = C.blue,
  height = 8,
  bg = C.inset,
}: {
  pct: number;
  color?: string;
  height?: number;
  bg?: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: height,
        height,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, pct)}%`,
          height: "100%",
          background: color,
          borderRadius: height,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function typeEmoji(type: AuditLogEntry["type"]) {
  switch (type) {
    case "external": return "🏢";
    case "internal": return "📋";
    case "spot-check": return "🔍";
    case "self-check": return "📝";
    case "regulatory": return "⚖️";
  }
}
function typeLabel(type: AuditLogEntry["type"]) {
  switch (type) {
    case "external": return "Extern";
    case "internal": return "Intern";
    case "spot-check": return "Stickprov";
    case "self-check": return "Egenkontroll";
    case "regulatory": return "Myndighet";
  }
}

// ─────────────────────────────────────────────────────────────
// TAB 1 — PRESTANDAÖVERSIKT
// ─────────────────────────────────────────────────────────────
function PerformanceTab({ data }: { data: PerformanceScore }) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const gaps = data.dimensions
    .filter((d) => d.score < 90)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header card */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{ fontSize: 13, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}
            >
              Verksamhetsprestanda
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginTop: 2 }}>
              {data.shopName}
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              Uppdaterad: {data.updatedAt}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: scoreColor(data.overall), lineHeight: 1 }}>
              {data.overall}
              <span style={{ fontSize: 20, fontWeight: 500, color: C.sub }}>/100</span>
            </div>
            <div style={{ fontSize: 18, color: C.orange, letterSpacing: 2, marginTop: 4 }}>
              {stars(data.overall)}
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              {levelLabel(data.overall)}
            </div>
          </div>
        </div>
        <ProgressBar pct={data.overall} color={scoreColor(data.overall)} height={10} />
      </div>

      {/* Dimensions table */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "grid",
            gridTemplateColumns: "1fr 120px 90px",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
            Dimension
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
            Score
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
            Trend
          </div>
        </div>

        {data.dimensions.map((dim) => {
          const trend = trendLabel(dim.trend);
          const isExpanded = expandedDim === dim.id;
          return (
            <div key={dim.id}>
              <div
                onClick={() => setExpandedDim(isExpanded ? null : dim.id)}
                style={{
                  padding: "14px 20px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 90px",
                  gap: 8,
                  cursor: "pointer",
                  background: isExpanded ? C.inset : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{dim.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{dim.name}</span>
                  {dim.score < 80 && (
                    <span style={{ fontSize: 13 }}>⚠️</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: scoreColor(dim.score),
                      minWidth: 40,
                    }}
                  >
                    {dim.score}/100
                  </span>
                  <ProgressBar pct={dim.score} color={scoreColor(dim.score)} height={6} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: trend.color, fontWeight: 700, fontSize: 14 }}>
                    {trend.icon} {trend.label}
                  </span>
                </div>
              </div>

              {/* Drill-down */}
              {isExpanded && (
                <div
                  style={{
                    background: "rgba(0,122,255,0.03)",
                    borderBottom: `1px solid ${C.border}`,
                    padding: "16px 20px 20px",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                    {dim.icon} {dim.name} — Drill Down
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dim.factors.map((f) => (
                      <div
                        key={f.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 50px 80px 24px",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 13, color: C.text }}>• {f.name}</div>
                        <div style={{ fontSize: 12, color: C.sub, textAlign: "right" }}>{f.weight}%</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ProgressBar pct={f.score} color={scoreColor(f.score)} height={5} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(f.score), minWidth: 28 }}>
                            {f.score}%
                          </span>
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {f.score >= 85 ? "✅" : "⚠️"}
                        </div>
                      </div>
                    ))}
                  </div>
                  {dim.recommendation && (
                    <div
                      style={{
                        marginTop: 16,
                        background: "rgba(255,149,0,0.08)",
                        border: `1px solid rgba(255,149,0,0.25)`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: C.text,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: C.orange }}>💡 Rekommendation: </span>
                      {dim.recommendation}
                    </div>
                  )}
                  <button
                    style={{
                      marginTop: 12,
                      background: C.blue,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Åtgärda →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Benchmark comparison */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Jämförelse
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Ert resultat", pct: data.overall, color: C.blue },
            { label: "Branschsnitt", pct: data.industryAvg, color: C.sub },
            { label: "Bäst i klass", pct: data.bestInClass, color: C.green },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr 50px", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: row.label === "Ert resultat" ? 600 : 400 }}>
                {row.label}
              </div>
              <ProgressBar pct={row.pct} color={row.color} height={10} />
              <div style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvement areas */}
      {gaps.length > 0 && (
        <div
          style={{
            background: C.card,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
              Förbättringsområden ({gaps.length})
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {gaps.map((dim, i) => {
              const primaryFactor = dim.factors.sort((a, b) => a.score - b.score)[0];
              return (
                <div
                  key={dim.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < gaps.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                        {i + 1}. {dim.icon} {dim.name} —{" "}
                        <span style={{ color: scoreColor(dim.score) }}>{dim.score}/100</span>
                        {dim.trend < 0 && (
                          <span style={{ color: C.red, fontSize: 12, marginLeft: 6 }}>(minskar)</span>
                        )}
                      </div>
                      {primaryFactor && (
                        <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>
                          Brist: {primaryFactor.name} — {primaryFactor.score}% (mål: 95%)
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedDim(dim.id)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${C.blue}`,
                        borderRadius: 7,
                        padding: "5px 12px",
                        fontSize: 12,
                        color: C.blue,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                    >
                      Åtgärda →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 2 — CERTIFIERINGAR
// ─────────────────────────────────────────────────────────────
function CertCard({ cert }: { cert: Certification }) {
  const isActive = cert.status === "active";
  const isUpcoming = cert.status === "upcoming";
  const isGap = cert.status === "gap";

  const accentColor = isActive ? C.green : isUpcoming ? C.orange : C.sub;
  const statusIcon = isActive ? "✅" : isUpcoming ? "⏰" : "○";

  return (
    <div
      style={{
        padding: 18,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{statusIcon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cert.name}</span>
          </div>

          {cert.issuer && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 2 }}>Utfärdare: {cert.issuer}</div>
          )}
          {cert.certNumber && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 2 }}>Certifikatnr: {cert.certNumber}</div>
          )}
          {cert.issuedDate && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 2 }}>
              Utfärdat: {cert.issuedDate}
              {cert.validUntil && cert.validUntil !== "2099-01-01" && ` · Giltig: ${cert.validUntil}`}
            </div>
          )}
          {cert.nextReview && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 2 }}>Nästa revision: {cert.nextReview}</div>
          )}
          {cert.estimatedMonths && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 2 }}>
              Estimerad tid till certifiering: {cert.estimatedMonths}
            </div>
          )}
          {cert.regulationRef && (
            <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>Ref: {cert.regulationRef}</div>
          )}

          {/* Readiness bar */}
          {isGap || isUpcoming ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: C.sub, minWidth: 120 }}>
                Systemberedskap: {cert.readinessPct}%
              </span>
              <ProgressBar pct={cert.readinessPct} color={scoreColor(cert.readinessPct)} height={6} />
            </div>
          ) : (
            cert.readinessPct < 100 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: C.sub, minWidth: 120 }}>
                  Systemberedskap: {cert.readinessPct}%{" "}
                  {cert.readinessPct >= 90 ? "✅" : "⚠️"}
                </span>
                <ProgressBar pct={cert.readinessPct} color={scoreColor(cert.readinessPct)} height={6} />
              </div>
            )
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {isActive && (
          <>
            <button
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                padding: "5px 12px",
                fontSize: 12,
                color: C.text,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Visa certifikat
            </button>
            {cert.nextReview && (
              <button
                style={{
                  background: "transparent",
                  border: `1px solid ${C.blue}`,
                  borderRadius: 7,
                  padding: "5px 12px",
                  fontSize: 12,
                  color: C.blue,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Förbered revision
              </button>
            )}
          </>
        )}
        {isUpcoming && (
          <button
            style={{
              background: C.blue,
              border: "none",
              borderRadius: 7,
              padding: "6px 16px",
              fontSize: 12,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Förbered →
          </button>
        )}
        {isGap && (
          <button
            style={{
              background: C.blue,
              border: "none",
              borderRadius: 7,
              padding: "6px 16px",
              fontSize: 12,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Starta förberedelse →
          </button>
        )}
      </div>
    </div>
  );
}

function CertificationsTab({ certs }: { certs: Certification[] }) {
  const active = certs.filter((c) => c.status === "active");
  const upcoming = certs.filter((c) => c.status === "upcoming");
  const gaps = certs.filter((c) => c.status === "gap");

  const Section = ({
    title,
    items,
    color,
  }: {
    title: string;
    items: Certification[];
    color: string;
  }) => (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
          {title} ({items.length})
        </span>
      </div>
      {items.map((c) => (
        <CertCard key={c.id} cert={c} />
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {active.length > 0 && <Section title="Aktiva" items={active} color={C.green} />}
      {upcoming.length > 0 && <Section title="Kommande revisioner" items={upcoming} color={C.orange} />}
      {gaps.length > 0 && <Section title="Ej certifierade — Möjligheter" items={gaps} color={C.sub} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 3 — REVISIONSLOG
// ─────────────────────────────────────────────────────────────
type LogFilter = "all" | "external" | "internal" | "spot-check" | "self-check" | "regulatory";

function AuditLogTab({ entries }: { entries: AuditLogEntry[] }) {
  const [filter, setFilter] = useState<LogFilter>("all");

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  const resultColor = (r: AuditLogEntry["result"]) => {
    switch (r) {
      case "GODKÄND": return C.green;
      case "UNDERKÄND": return C.red;
      case "GODKÄND MED ANMÄRKNINGAR": return C.orange;
    }
  };

  const FILTERS: { id: LogFilter; label: string }[] = [
    { id: "all", label: "Alla" },
    { id: "external", label: "Externa" },
    { id: "internal", label: "Interna" },
    { id: "spot-check", label: "Stickprov" },
    { id: "self-check", label: "Egenkontroller" },
    { id: "regulatory", label: "Myndighet" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? C.blue : "transparent",
                border: `1px solid ${filter === f.id ? C.blue : C.border}`,
                borderRadius: 7,
                padding: "5px 12px",
                fontSize: 12,
                color: filter === f.id ? "#fff" : C.text,
                cursor: "pointer",
                fontWeight: filter === f.id ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            padding: "5px 14px",
            fontSize: 12,
            color: C.sub,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          📥 Exportera PDF
        </button>
      </div>

      {/* Log entries */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: C.sub, fontSize: 14 }}>
            Inga poster matchar filtret.
          </div>
        )}
        {filtered.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              padding: "18px 20px",
              borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            {/* Date + type emoji */}
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 22 }}>{typeEmoji(entry.type)}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{entry.date}</div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.sub,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginTop: 2,
                }}
              >
                {typeLabel(entry.type)}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {entry.title}
              </div>
              {entry.inspector && (
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 2 }}>
                  Inspektör: {entry.inspector}
                  {entry.company && ` · ${entry.company}`}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: resultColor(entry.result),
                    background: `${resultColor(entry.result)}15`,
                    borderRadius: 5,
                    padding: "2px 8px",
                  }}
                >
                  {entry.result}
                  {entry.scorePct !== undefined && ` (${entry.scorePct}%)`}
                </span>
                {entry.deviations !== undefined && entry.deviations > 0 && (
                  <span style={{ fontSize: 12, color: C.orange }}>
                    · {entry.deviations} avvikelse{entry.deviations !== 1 ? "r" : ""}
                  </span>
                )}
                {entry.deviations === 0 && (
                  <span style={{ fontSize: 12, color: C.green }}>· Inga avvikelser</span>
                )}
              </div>
              {entry.notes && (
                <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{entry.notes}</div>
              )}
              {entry.certValid && (
                <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>
                  ✅ Certifikat giltigt till {entry.certValid}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 100 }}>
              <button
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: "5px 12px",
                  fontSize: 12,
                  color: C.text,
                  cursor: "pointer",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                Detaljer
              </button>
              {entry.certValid && (
                <button
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.blue}`,
                    borderRadius: 7,
                    padding: "5px 12px",
                    fontSize: 12,
                    color: C.blue,
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Ladda ner
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 4 — API
// ─────────────────────────────────────────────────────────────
const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/audit/performance-score",
    desc: "Returnerar: overall_score, dimensions[], trends[]",
  },
  {
    method: "GET",
    path: "/api/audit/certifications",
    desc: "Returnerar: active[], upcoming[], gaps[]",
  },
  {
    method: "GET",
    path: "/api/audit/log?from=&to=&type=",
    desc: "Returnerar: revisionslogg med filtrering",
  },
  {
    method: "GET",
    path: "/api/audit/readiness/:standard",
    desc: "Returnerar: beredskapsanalys för specifik standard\nEx: /api/audit/readiness/iso-9001",
  },
];

const CONNECTED_SYSTEMS = [
  { name: "DEKRA Certification Portal", connected: true, since: "2026-01-15" },
  { name: "TÜV SÜD", connected: false },
  { name: "SGS", connected: false },
  { name: "Power BI / Tableau", connected: false, docLink: true },
];

function ApiTab() {
  const [copied, setCopied] = useState(false);
  const apiKey = "pk_live_••••••••••••••••";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(apiKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          🔌 Revisionsdata API
        </div>
        <div style={{ fontSize: 13, color: C.sub }}>
          Exponera ert prestandadata via API för externa system. Anslut BI-verktyg, revisionsbolag och tillsynsmyndigheter.
        </div>
      </div>

      {/* Endpoints */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
            Live Endpoints
          </div>
        </div>
        {ENDPOINTS.map((ep, i) => (
          <div
            key={ep.path}
            style={{
              padding: "16px 20px",
              borderBottom: i < ENDPOINTS.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  background: C.green,
                  borderRadius: 5,
                  padding: "2px 7px",
                  minWidth: 36,
                  textAlign: "center",
                  marginTop: 1,
                }}
              >
                {ep.method}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    color: C.blue,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {ep.path}
                </div>
                <div style={{ fontSize: 12, color: C.sub, whiteSpace: "pre-line" }}>
                  → {ep.desc}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Webhooks
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>
          POST till er URL när:
        </div>
        {["Stickprov genomfört", "Certifikat uppdaterat", "Kritisk avvikelse funnen"].map((w) => (
          <div key={w} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>•</span>
            <span style={{ fontSize: 13, color: C.text }}>{w}</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <input
            placeholder="https://din-server.se/webhooks/audit"
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 13,
              color: C.text,
              background: C.bg,
              outline: "none",
            }}
          />
          <button
            style={{
              marginTop: 8,
              background: C.blue,
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontSize: 13,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Aktivera webhook
          </button>
        </div>
      </div>

      {/* API Key */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
          API-nyckel
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: C.inset,
            borderRadius: 10,
            padding: "10px 14px",
            fontFamily: "monospace",
            fontSize: 13,
            color: C.text,
          }}
        >
          <span style={{ flex: 1 }}>{apiKey}</span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? C.green : C.blue,
              border: "none",
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 12,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              transition: "background 0.2s",
            }}
          >
            {copied ? "Kopierat!" : "Kopiera"}
          </button>
          <button
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              color: C.sub,
              cursor: "pointer",
            }}
          >
            Regenerera
          </button>
        </div>
      </div>

      {/* Connected systems */}
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
            Anslutna system
          </div>
        </div>
        {CONNECTED_SYSTEMS.map((sys, i) => (
          <div
            key={sys.name}
            style={{
              padding: "14px 20px",
              borderBottom: i < CONNECTED_SYSTEMS.length - 1 ? `1px solid ${C.border}` : "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 18 }}>{sys.connected ? "✅" : "⚫"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{sys.name}</div>
              {sys.connected && sys.since && (
                <div style={{ fontSize: 12, color: C.sub }}>Ansluten sedan {sys.since}</div>
              )}
            </div>
            {!sys.connected && (
              <button
                style={{
                  background: "transparent",
                  border: `1px solid ${C.blue}`,
                  borderRadius: 7,
                  padding: "5px 14px",
                  fontSize: 12,
                  color: C.blue,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {sys.docLink ? "Se dokumentation" : "Anslut"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────
type Tab = "performance" | "certifications" | "log" | "api";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "performance", label: "Prestandaöversikt", icon: "📊" },
  { id: "certifications", label: "Certifieringar", icon: "🏆" },
  { id: "log", label: "Revisionslog", icon: "📋" },
  { id: "api", label: "API", icon: "🔌" },
];

export default function AuditDashboardView() {
  const [activeTab, setActiveTab] = useState<Tab>("performance");

  // Try to load real data from API (falls back to demo data if unavailable)
  const { data: apiScore } = useApi<PerformanceScore>("/api/audit/performance-score");
  const { data: apiCerts } = useApi<Certification[]>("/api/audit/certifications");
  const { data: apiLog } = useApi<AuditLogEntry[]>("/api/audit/log");

  const score: PerformanceScore = apiScore ?? DEMO_SCORE;
  const certs: Certification[] = apiCerts ?? DEMO_CERTS;
  const logEntries: AuditLogEntry[] = apiLog ?? DEMO_LOG;

  return (
    <div
      style={{
        padding: "24px 28px",
        background: C.bg,
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        color: C.text,
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                color: C.text,
                letterSpacing: -0.5,
              }}
            >
              Revision & Compliance
            </h1>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              Fullständig transparens om verksamhetens prestandanivå
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: C.card,
          borderRadius: 12,
          padding: 4,
          border: `1px solid ${C.border}`,
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: "1 1 auto",
              background: activeTab === tab.id ? C.blue : "transparent",
              border: "none",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "#fff" : C.sub,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "performance" && <PerformanceTab data={score} />}
      {activeTab === "certifications" && <CertificationsTab certs={certs} />}
      {activeTab === "log" && <AuditLogTab entries={logEntries} />}
      {activeTab === "api" && <ApiTab />}
    </div>
  );
}
