/**
 * OnboardingWizard.tsx — Mirror Mode: Onboarding
 *
 * 6-stegs wizard, Windows OOBE-inspirerad men verkstadsfokuserad.
 * Apple HIG design, inline styles, smooth transitions.
 *
 * Visas för nya användare (localStorage: 'pixdrift_onboarding_complete').
 * Kan hoppas över — påminns nästa inloggning.
 */

import { useState, useEffect, CSSProperties } from "react";

// ─── Design tokens (matchar Dashboard.tsx) ────────────────────────────────────
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
  inset:     "#E5E5EA",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OnboardingData {
  // Steg 2
  sourceSystem: "automaster" | "winbas" | "keyloop" | "scratch" | null;
  // Steg 3
  shopName: string;
  technicianCount: "1-5" | "6-20" | "20+" | null;
  certifications: string[];
  // Steg 4
  modules: string[];
  // Steg 5
  teamMembers: Array<{ name: string; email: string; role: string }>;
}

interface Props {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

const TOTAL_STEPS = 6;

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i < step ? C.blue : C.inset,
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function StepLabel({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8, letterSpacing: 0.3 }}>
      {current} / {total}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 15,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  background: C.surface,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
};

function PrimaryButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled ? C.inset : hover ? "#0066DD" : C.blue,
        color: disabled ? C.secondary : C.surface,
        border: "none",
        borderRadius: 12,
        padding: "13px 28px",
        fontSize: 16,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      {label}
    </button>
  );
}

function OptionCard({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 12,
        border: `1.5px solid ${selected ? C.blue : hover ? C.border : C.border}`,
        background: selected ? "#EAF3FF" : hover ? C.bg : C.surface,
        color: C.text,
        fontSize: 15,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        transition: "all 0.15s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <span>{label}</span>
      {selected && <span style={{ marginLeft: "auto", color: C.blue }}>✓</span>}
    </button>
  );
}

function CheckCard({
  label,
  checked,
  onToggle,
  description,
  requiresCertification,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  description?: string;
  requiresCertification?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 12,
        border: `1.5px solid ${checked ? C.blue : C.border}`,
        background: checked ? "#EAF3FF" : C.surface,
        color: C.text,
        fontSize: 15,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `2px solid ${checked ? C.blue : C.border}`,
          background: checked ? C.blue : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontWeight: checked ? 600 : 400 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{description}</div>
        )}
      </div>
      {requiresCertification && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: C.orange,
            background: "#FFF3E0",
            padding: "2px 8px",
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          kräver certifiering
        </span>
      )}
    </button>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>🔧</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: C.text,
          marginBottom: 16,
          lineHeight: 1.2,
        }}
      >
        Välkommen till pixdrift
      </h1>
      <p
        style={{
          fontSize: 17,
          color: C.secondary,
          lineHeight: 1.6,
          marginBottom: 40,
          maxWidth: 360,
          margin: "0 auto 40px",
        }}
      >
        Du håller på att sätta upp operativsystemet för din verkstad. Det tar 3 minuter.
      </p>
      <PrimaryButton label="Kom igång →" onClick={onNext} />
    </div>
  );
}

function Step2({
  data,
  setData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options = [
    // DMS-system
    { id: "automaster",  label: "Importera från Automaster",   icon: "🔧" },
    { id: "winbas",      label: "Importera från Winbas",       icon: "🔧" },
    { id: "winassist",   label: "Importera från Winassist",    icon: "🔧" },
    { id: "cobra",       label: "Importera från Cobra",        icon: "🔧" },
    { id: "keyloop",     label: "Importera från Keyloop/CDK",  icon: "🔧" },
    { id: "kerridge",    label: "Importera från Kerridge",     icon: "🔧" },
    // Bokföring
    { id: "fortnox",     label: "Importera från Fortnox",      icon: "📊" },
    { id: "visma",       label: "Importera från Visma",        icon: "📊" },
    // CRM/Skadehantering
    { id: "autofutura",  label: "Importera från AutoFutura",   icon: "🤝" },
    { id: "cabas",       label: "Importera från Cabas",        icon: "🚗" },
    { id: "scratch",    label: "Starta från scratch",       icon: "✨" },
  ] as const;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Kom du från ett annat system?
      </h2>
      <p style={{ fontSize: 15, color: C.secondary, marginBottom: 24 }}>
        Vi kan importera all din befintliga data — kunder, fordon, historik.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {options.map(opt => (
          <OptionCard
            key={opt.id}
            label={opt.label}
            icon={opt.icon}
            selected={data.sourceSystem === opt.id}
            onClick={() => setData({ sourceSystem: opt.id })}
          />
        ))}
      </div>
      {data.sourceSystem && data.sourceSystem !== "scratch" && (
        <div
          style={{
            background: "#EAF3FF",
            border: `1px solid #BDD9FF`,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#0055CC",
            marginBottom: 24,
          }}
        >
          ✓ Vi importerar all data från {{ automaster:"Automaster", winbas:"Winbas", winassist:"Winassist", cobra:"Cobra", keyloop:"Keyloop/CDK", kerridge:"Kerridge", fortnox:"Fortnox", visma:"Visma", autofutura:"AutoFutura", cabas:"Cabas" }[data.sourceSystem] || data.sourceSystem}. Tar ca 5 minuter. Kan ångras.
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: C.secondary,
            fontSize: 15,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Tillbaka
        </button>
        <PrimaryButton
          label="Nästa →"
          onClick={onNext}
          disabled={!data.sourceSystem}
        />
      </div>
    </div>
  );
}

function Step3({
  data,
  setData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const certOptions = ["Volvo", "BMW", "VW", "Stellantis", "Oberoende"];
  const sizeOptions = ["1-5", "6-20", "20+"] as const;

  function toggleCert(cert: string) {
    const certs = data.certifications.includes(cert)
      ? data.certifications.filter(c => c !== cert)
      : [...data.certifications, cert];
    setData({ certifications: certs });
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Din verkstad</h2>
      <p style={{ fontSize: 15, color: C.secondary, marginBottom: 24 }}>
        Vi anpassar pixdrift efter er verkstads storlek och certifieringar.
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: C.secondary, fontWeight: 600, display: "block", marginBottom: 8 }}>
          VERKSTADENS NAMN
        </label>
        <input
          style={inputStyle}
          placeholder="T.ex. Lindqvists Bil & Service AB"
          value={data.shopName}
          onChange={e => setData({ shopName: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: C.secondary, fontWeight: 600, display: "block", marginBottom: 8 }}>
          ANTAL MEKANIKER
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {sizeOptions.map(size => (
            <button
              key={size}
              onClick={() => setData({ technicianCount: size })}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: `1.5px solid ${data.technicianCount === size ? C.blue : C.border}`,
                background: data.technicianCount === size ? "#EAF3FF" : C.surface,
                color: data.technicianCount === size ? C.blue : C.text,
                fontWeight: data.technicianCount === size ? 600 : 400,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 13, color: C.secondary, fontWeight: 600, display: "block", marginBottom: 8 }}>
          CERTIFIERINGAR
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {certOptions.map(cert => (
            <button
              key={cert}
              onClick={() => toggleCert(cert)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: `1.5px solid ${data.certifications.includes(cert) ? C.blue : C.border}`,
                background: data.certifications.includes(cert) ? "#EAF3FF" : C.surface,
                color: data.certifications.includes(cert) ? C.blue : C.text,
                fontWeight: data.certifications.includes(cert) ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
              }}
            >
              {data.certifications.includes(cert) ? "✓ " : ""}{cert}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.secondary, fontSize: 15, cursor: "pointer", padding: 0 }}
        >
          ← Tillbaka
        </button>
        <PrimaryButton
          label="Nästa →"
          onClick={onNext}
          disabled={!data.shopName.trim() || !data.technicianCount}
        />
      </div>
    </div>
  );
}

const MODULE_OPTIONS = [
  {
    id: "workshop",
    label: "Verkstad & Arbetsorder",
    description: "Arbetsordrar, tidsregistrering, mekaniker",
    icon: "🔧",
    default: true,
    requiresCertification: false,
  },
  {
    id: "parts",
    label: "Reservdelar",
    description: "Lagerhantering, beställningar, leverantörer",
    icon: "📦",
    default: true,
    requiresCertification: false,
  },
  {
    id: "crm",
    label: "Kunder & CRM",
    description: "Kundregister, servicehistorik, kommunikation",
    icon: "👥",
    default: true,
    requiresCertification: false,
  },
  {
    id: "warranty",
    label: "Garanti & OEM",
    description: "Garantiärenden, SAGA2-export, OEM-rapportering",
    icon: "🛡️",
    default: false,
    requiresCertification: true,
  },
  {
    id: "accounting",
    label: "Ekonomi & Bokföring",
    description: "Fakturering, SIE4-export, Fortnox-integration",
    icon: "💰",
    default: false,
    requiresCertification: false,
  },
  {
    id: "iso",
    label: "ISO-processer",
    description: "ISO 9001-efterlevnad, avvikelser, revisioner",
    icon: "📋",
    default: false,
    requiresCertification: false,
  },
];

function Step4({
  data,
  setData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function toggleModule(id: string) {
    const modules = data.modules.includes(id)
      ? data.modules.filter(m => m !== id)
      : [...data.modules, id];
    setData({ modules });
  }

  const hasWarranty = data.modules.includes("warranty");
  const hasCertification = data.certifications.length > 0;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Aktivera moduler</h2>
      <p style={{ fontSize: 15, color: C.secondary, marginBottom: 24 }}>
        Välj vad ni behöver. Kan alltid ändras senare.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {MODULE_OPTIONS.map(mod => (
          <CheckCard
            key={mod.id}
            label={`${mod.icon} ${mod.label}`}
            description={mod.description}
            checked={data.modules.includes(mod.id)}
            onToggle={() => toggleModule(mod.id)}
            requiresCertification={mod.requiresCertification}
          />
        ))}
      </div>
      {hasWarranty && !hasCertification && (
        <div
          style={{
            background: "#FFF3E0",
            border: "1px solid #FFD180",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#E65100",
            marginBottom: 16,
          }}
        >
          ⚠️ Garanti & OEM kräver certifiering. Ange minst en certifiering i föregående steg.
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.secondary, fontSize: 15, cursor: "pointer", padding: 0 }}
        >
          ← Tillbaka
        </button>
        <PrimaryButton
          label="Nästa →"
          onClick={onNext}
          disabled={data.modules.length === 0}
        />
      </div>
    </div>
  );
}

const ROLES = ["Mekaniker", "Verkstadschef", "Receptionist", "Säljare", "Admin"];

function Step5({
  data,
  setData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function updateMember(idx: number, field: string, value: string) {
    const members = [...data.teamMembers];
    members[idx] = { ...members[idx], [field]: value };
    setData({ teamMembers: members });
  }

  function addMember() {
    setData({ teamMembers: [...data.teamMembers, { name: "", email: "", role: "Mekaniker" }] });
  }

  function removeMember(idx: number) {
    setData({ teamMembers: data.teamMembers.filter((_, i) => i !== idx) });
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Bjud in teamet</h2>
      <p style={{ fontSize: 15, color: C.secondary, marginBottom: 24 }}>
        Dina mekaniker och kollegor får ett inloggningmail. Kan göras senare.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {data.teamMembers.map((member, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              style={{ ...inputStyle, fontSize: 14 }}
              placeholder="Namn"
              value={member.name}
              onChange={e => updateMember(idx, "name", e.target.value)}
            />
            <input
              style={{ ...inputStyle, fontSize: 14 }}
              placeholder="e-post"
              type="email"
              value={member.email}
              onChange={e => updateMember(idx, "email", e.target.value)}
            />
            <select
              value={member.role}
              onChange={e => updateMember(idx, "role", e.target.value)}
              style={{
                ...inputStyle,
                width: "auto",
                padding: "10px 10px",
                fontSize: 14,
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={() => removeMember(idx)}
              style={{
                background: "none",
                border: "none",
                color: C.secondary,
                fontSize: 18,
                cursor: "pointer",
                padding: "0 4px",
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addMember}
        style={{
          background: "none",
          border: `1.5px dashed ${C.border}`,
          borderRadius: 10,
          color: C.blue,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          padding: "10px 18px",
          width: "100%",
          marginBottom: 32,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        }}
      >
        + Lägg till fler
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.secondary, fontSize: 15, cursor: "pointer", padding: 0 }}
        >
          ← Tillbaka
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onNext}
            style={{
              background: "none",
              border: "none",
              color: C.secondary,
              fontSize: 15,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Hoppa över
          </button>
          <PrimaryButton label="Nästa →" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

function Step6({
  data,
  onComplete,
}: {
  data: OnboardingData;
  onComplete: (d: OnboardingData) => void;
}) {
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPulsing(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px 0",
        opacity: pulsing ? 1 : 0,
        transform: pulsing ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.4s ease",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 24 }}>🚀</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        pixdrift är redo.
      </h1>
      <p style={{ fontSize: 18, color: C.secondary, marginBottom: 8 }}>
        Välkommen till kontrollen.
      </p>
      {data.shopName && (
        <p style={{ fontSize: 15, color: C.secondary, marginBottom: 32 }}>
          <strong style={{ color: C.text }}>{data.shopName}</strong> är nu konfigurerat.
        </p>
      )}

      <div
        style={{
          background: C.bg,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 32,
          textAlign: "left",
          display: "inline-block",
          minWidth: 260,
        }}
      >
        {data.sourceSystem && data.sourceSystem !== "scratch" && (
          <SummaryRow
            icon="📂"
            label={`Import från ${data.sourceSystem} — startar nu`}
          />
        )}
        <SummaryRow icon="🔧" label={`${data.modules.length} moduler aktiverade`} />
        {data.teamMembers.filter(m => m.email).length > 0 && (
          <SummaryRow
            icon="✉️"
            label={`${data.teamMembers.filter(m => m.email).length} inbjudningar skickas`}
          />
        )}
      </div>

      <div>
        <PrimaryButton
          label="Öppna din verkstad →"
          onClick={() => onComplete(data)}
        />
      </div>
    </div>
  );
}

function SummaryRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 14 }}>
      <span>{icon}</span>
      <span style={{ color: C.text }}>{label}</span>
    </div>
  );
}

// ─── Main OnboardingWizard ─────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [data, setDataRaw] = useState<OnboardingData>({
    sourceSystem: null,
    shopName: "",
    technicianCount: null,
    certifications: [],
    modules: ["workshop", "parts", "crm"],
    teamMembers: [{ name: "", email: "", role: "Mekaniker" }],
  });

  function setData(partial: Partial<OnboardingData>) {
    setDataRaw(prev => ({ ...prev, ...partial }));
  }

  function goToStep(n: number) {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setStep(n);
      setAnimating(false);
    }, 120);
  }

  function next() { goToStep(step + 1); }
  function back() { goToStep(step - 1); }

  const contentStyle: CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating ? "translateY(6px)" : "translateY(0)",
    transition: "opacity 0.12s ease, transform 0.12s ease",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 20,
          padding: "40px 44px",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          position: "relative",
        }}
      >
        {/* Skip button */}
        {step < 6 && (
          <button
            onClick={onSkip ?? (() => onComplete(data))}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "none",
              border: "none",
              color: C.tertiary,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            }}
          >
            Hoppa över
          </button>
        )}

        <StepLabel current={step} total={TOTAL_STEPS} />
        <ProgressBar step={step} />

        <div style={contentStyle}>
          {step === 1 && <Step1 onNext={next} />}
          {step === 2 && <Step2 data={data} setData={setData} onNext={next} onBack={back} />}
          {step === 3 && <Step3 data={data} setData={setData} onNext={next} onBack={back} />}
          {step === 4 && <Step4 data={data} setData={setData} onNext={next} onBack={back} />}
          {step === 5 && <Step5 data={data} setData={setData} onNext={next} onBack={back} />}
          {step === 6 && <Step6 data={data} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}
