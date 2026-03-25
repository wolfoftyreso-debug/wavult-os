/**
 * OnboardingWizard.tsx — Pixdrift: 6-stegs onboarding
 *
 * Visas för nya användare (localStorage: 'pixdrift_onboarding_complete').
 * Guider genom Välkommen → Verksamhet → Team → Integrationer → Importera → Klar!
 *
 * Design: mörkt enterprise (matchar LoginScreen.tsx)
 * API: POST /api/org/setup, POST /api/auth/invite
 */

import { useState, useEffect, useRef, CSSProperties } from "react";

const API = "https://api.bc.pixdrift.com";

// ─── Design tokens — dark enterprise (matchar LoginScreen) ────────────────────
const T = {
  bg:        "#0A0A0F",
  surface:   "#111118",
  surfaceAlt:"#1A1A24",
  border:    "rgba(255,255,255,0.08)",
  borderFocus:"rgba(99,102,241,0.6)",
  accent:    "#6366F1",
  accentHover:"#5254CC",
  text:      "#FFFFFF",
  secondary: "rgba(255,255,255,0.55)",
  tertiary:  "rgba(255,255,255,0.25)",
  success:   "#22C55E",
  warning:   "#F59E0B",
  font:      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
};

const TOTAL_STEPS = 6;

// ─── State ─────────────────────────────────────────────────────────────────────

interface OnboardingState {
  step: number;
  business_name: string;
  industry: string;
  team_size: string;
  current_systems: string[];
  invite_name: string;
  invite_email: string;
  invite_role: string;
}

interface Props {
  onComplete: () => void;
  onSkip?: () => void;
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 36 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 99,
            background: i < step ? T.accent : T.border,
            transition: "background 0.4s ease",
            boxShadow: i < step ? `0 0 6px ${T.accent}66` : "none",
          }}
        />
      ))}
    </div>
  );
}

function StepLabel({ current, total }: { current: number; total: number }) {
  const labels = ["Välkommen", "Verksamhet", "Team", "Integrationer", "Importera", "Klar!"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: T.accent, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>
        Steg {current} / {total}
      </span>
      <span style={{ fontSize: 12, color: T.tertiary }}>·</span>
      <span style={{ fontSize: 12, color: T.secondary }}>{labels[current - 1]}</span>
    </div>
  );
}

const inputBase: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 15,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  background: T.surfaceAlt,
  color: T.text,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: T.font,
  transition: "border-color 0.15s ease",
};

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  autoFocus = false,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        borderColor: focused ? T.borderFocus : T.border,
        boxShadow: focused ? `0 0 0 3px ${T.accent}20` : "none",
      }}
    />
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled || loading ? "rgba(99,102,241,0.35)" : hover ? T.accentHover : T.accent,
        color: T.text,
        border: "none",
        borderRadius: 10,
        padding: "13px 28px",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        fontFamily: T.font,
        width: fullWidth ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        boxShadow: disabled || loading ? "none" : hover ? `0 0 16px ${T.accent}50` : `0 0 8px ${T.accent}30`,
      }}
    >
      {loading && (
        <span style={{
          width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
          borderTopColor: "#fff", borderRadius: "50%", display: "inline-block",
          animation: "spin 0.6s linear infinite",
        }} />
      )}
      {label}
    </button>
  );
}

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "none",
        border: "none",
        color: hover ? T.secondary : T.tertiary,
        fontSize: 14,
        cursor: "pointer",
        fontFamily: T.font,
        padding: "4px 0",
        transition: "color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function RadioOption({
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
        padding: "11px 16px",
        borderRadius: 10,
        border: `1px solid ${selected ? T.accent : hover ? "rgba(255,255,255,0.16)" : T.border}`,
        background: selected ? `${T.accent}18` : hover ? "rgba(255,255,255,0.04)" : T.surfaceAlt,
        color: selected ? T.text : T.secondary,
        fontSize: 14,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        textAlign: "left",
        transition: "all 0.15s ease",
        fontFamily: T.font,
        boxShadow: selected ? `0 0 8px ${T.accent}30` : "none",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${selected ? T.accent : T.tertiary}`,
          background: selected ? T.accent : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {selected && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />}
      </span>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function CheckOption({
  label,
  checked,
  onToggle,
  description,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  description?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        border: `1px solid ${checked ? T.accent : hover ? "rgba(255,255,255,0.16)" : T.border}`,
        background: checked ? `${T.accent}15` : hover ? "rgba(255,255,255,0.03)" : T.surfaceAlt,
        color: T.text,
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        transition: "all 0.15s ease",
        fontFamily: T.font,
        width: "100%",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${checked ? T.accent : T.tertiary}`,
          background: checked ? T.accent : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {checked && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontWeight: checked ? 600 : 400, color: checked ? T.text : T.secondary }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: T.tertiary, marginTop: 2 }}>{description}</div>}
      </div>
    </button>
  );
}

// ─── Steps ─────────────────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);
  return (
    <div style={{
      textAlign: "center",
      padding: "24px 0 8px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ fontSize: 64, marginBottom: 28, filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.4))" }}>
        🔧
      </div>
      <h1 style={{
        fontSize: 30,
        fontWeight: 700,
        color: T.text,
        marginBottom: 16,
        letterSpacing: -0.5,
        lineHeight: 1.2,
      }}>
        Välkommen till pixdrift.
      </h1>
      <p style={{
        fontSize: 17,
        color: T.secondary,
        lineHeight: 1.7,
        marginBottom: 40,
        maxWidth: 340,
        margin: "0 auto 40px",
      }}>
        Du är 5 minuter från att ha koll på&nbsp;hela din verksamhet.
      </p>
      <PrimaryButton label="Kom igång →" onClick={onNext} />
    </div>
  );
}

const INDUSTRIES = [
  { id: "bilverkstad",  label: "Bilverkstad",  icon: "🔧" },
  { id: "restaurang",   label: "Restaurang",   icon: "🍽️" },
  { id: "bygg",         label: "Bygg",         icon: "🏗️" },
  { id: "konsult",      label: "Konsult",      icon: "💼" },
  { id: "e-handel",     label: "E-handel",     icon: "🛒" },
  { id: "annat",        label: "Annat",        icon: "✨" },
] as const;

const TEAM_SIZES = ["1–5", "6–15", "16–50", "50+"] as const;

function Step2({
  state,
  setState,
  onNext,
}: {
  state: OnboardingState;
  setState: (p: Partial<OnboardingState>) => void;
  onNext: () => void;
}) {
  const canProceed = state.business_name.trim() && state.industry && state.team_size;
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: T.text }}>Din verksamhet</h2>
      <p style={{ fontSize: 14, color: T.secondary, marginBottom: 28 }}>
        Berätta lite om er — vi anpassar pixdrift efter era behov.
      </p>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>VERKSAMHETENS NAMN</label>
        <Input
          placeholder="T.ex. Lindqvists Bilverkstad"
          value={state.business_name}
          onChange={v => setState({ business_name: v })}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>BRANSCH</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {INDUSTRIES.map(ind => (
            <RadioOption
              key={ind.id}
              label={ind.label}
              icon={ind.icon}
              selected={state.industry === ind.id}
              onClick={() => setState({ industry: ind.id })}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>TEAMSTORLEK</label>
        <div style={{ display: "flex", gap: 8 }}>
          {TEAM_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setState({ team_size: size })}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 10,
                border: `1px solid ${state.team_size === size ? T.accent : T.border}`,
                background: state.team_size === size ? `${T.accent}18` : T.surfaceAlt,
                color: state.team_size === size ? T.text : T.secondary,
                fontWeight: state.team_size === size ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: T.font,
                transition: "all 0.15s",
                boxShadow: state.team_size === size ? `0 0 8px ${T.accent}30` : "none",
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <PrimaryButton label="Nästa →" onClick={onNext} disabled={!canProceed} />
      </div>
    </div>
  );
}

const ROLES = ["Mekaniker", "Verkstadschef", "Receptionist", "Säljare", "Admin", "Ekonom"];

function Step3({
  state,
  setState,
  onNext,
  onBack,
}: {
  state: OnboardingState;
  setState: (p: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const hasInvite = state.invite_name.trim() || state.invite_email.trim();
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: T.text }}>Teamet</h2>
      <p style={{ fontSize: 14, color: T.secondary, marginBottom: 28 }}>
        Bjud in din första kollega <span style={{ color: T.tertiary }}>(valfritt — kan göras senare)</span>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>NAMN</label>
          <Input
            placeholder="T.ex. Anna Lindgren"
            value={state.invite_name}
            onChange={v => setState({ invite_name: v })}
          />
        </div>
        <div>
          <label style={labelStyle}>E-POST</label>
          <Input
            type="email"
            placeholder="anna@foretaget.se"
            value={state.invite_email}
            onChange={v => setState({ invite_email: v })}
          />
        </div>
        <div>
          <label style={labelStyle}>ROLL</label>
          <select
            value={state.invite_role}
            onChange={e => setState({ invite_role: e.target.value })}
            style={{
              ...inputBase,
              cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
              paddingRight: 36,
            }}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
        <GhostButton label="← Tillbaka" onClick={onBack} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <GhostButton label="Hoppa över →" onClick={onNext} />
          {hasInvite && <PrimaryButton label="Bjud in →" onClick={onNext} />}
          {!hasInvite && <PrimaryButton label="Hoppa över →" onClick={onNext} />}
        </div>
      </div>
    </div>
  );
}

const SYSTEMS = [
  { id: "winassist",      label: "Winassist / Automaster",   icon: "🔧" },
  { id: "fortnox",        label: "Fortnox",                  icon: "📊" },
  { id: "visma",          label: "Visma",                    icon: "📊" },
  { id: "lime",           label: "Lime CRM",                 icon: "🤝" },
  { id: "bokningssystem", label: "Bokningssystem",           icon: "📅" },
  { id: "ingenting",      label: "Ingenting",                icon: "✨" },
] as const;

function Step4({
  state,
  setState,
  onNext,
  onBack,
}: {
  state: OnboardingState;
  setState: (p: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function toggle(id: string) {
    if (id === "ingenting") {
      setState({ current_systems: state.current_systems.includes("ingenting") ? [] : ["ingenting"] });
      return;
    }
    const systems = state.current_systems.includes(id)
      ? state.current_systems.filter(s => s !== id)
      : [...state.current_systems.filter(s => s !== "ingenting"), id];
    setState({ current_systems: systems });
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: T.text }}>Integrationer</h2>
      <p style={{ fontSize: 14, color: T.secondary, marginBottom: 28 }}>
        Vad använder ni idag? <span style={{ color: T.tertiary }}>(välj alla som stämmer)</span>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {SYSTEMS.map(sys => (
          <CheckOption
            key={sys.id}
            label={`${sys.icon}  ${sys.label}`}
            checked={state.current_systems.includes(sys.id)}
            onToggle={() => toggle(sys.id)}
          />
        ))}
      </div>

      {state.current_systems.length > 0 && !state.current_systems.includes("ingenting") && (
        <div style={{
          background: `${T.accent}12`,
          border: `1px solid ${T.accent}30`,
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          color: T.secondary,
          marginBottom: 16,
        }}>
          ✓ Vi importerar automatiskt vid nästa steg.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <GhostButton label="← Tillbaka" onClick={onBack} />
        <PrimaryButton label="Nästa →" onClick={onNext} />
      </div>
    </div>
  );
}

const AUTOMOTIVE_STEPS = [
  { label: "Skapar er arbetsordermall", delay: 0 },
  { label: "Konfigurerar mekanikerroller", delay: 700 },
  { label: "Aktiverar ISO 9001-spårning", delay: 1400 },
  { label: "Förbereder bokningssystem", delay: 2100 },
] as const;

const GENERIC_STEPS = [
  { label: "Skapar er verksamhetsprofil", delay: 0 },
  { label: "Konfigurerar teamroller", delay: 700 },
  { label: "Aktiverar standardprocesser", delay: 1400 },
  { label: "Förbereder arbetsflöden", delay: 2100 },
] as const;

function Step5({
  state,
  onNext,
  onBack,
}: {
  state: OnboardingState;
  onNext: () => void;
  onBack: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const started = useRef(false);

  const isAutomotive = state.industry === "bilverkstad" ||
    state.current_systems.includes("winassist");

  const steps = isAutomotive ? AUTOMOTIVE_STEPS : GENERIC_STEPS;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Tick check items
    steps.forEach((s, i) => {
      setTimeout(() => {
        setCheckedItems(prev => [...prev, i]);
      }, s.delay + 200);
    });

    // Progress bar
    const duration = 3200;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) {
        clearInterval(timer);
        setDone(true);
        // Auto-advance after 600ms
        setTimeout(onNext, 600);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: T.text }}>
        {isAutomotive ? "Vi förbereder er verkstad." : "Vi konfigurerar er miljö."}
      </h2>
      <p style={{ fontSize: 14, color: T.secondary, marginBottom: 32 }}>
        Tar bara ett ögonblick...
      </p>

      <div style={{
        background: T.surfaceAlt,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "24px 28px",
        marginBottom: 28,
        textAlign: "left",
      }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: i < steps.length - 1 ? 16 : 0,
              opacity: checkedItems.includes(i) ? 1 : 0.3,
              transform: checkedItems.includes(i) ? "translateX(0)" : "translateX(-8px)",
              transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <span style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: checkedItems.includes(i) ? T.success : T.border,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
              transition: "background 0.3s ease",
            }}>
              {checkedItems.includes(i) ? "✓" : ""}
            </span>
            <span style={{
              fontSize: 14,
              color: checkedItems.includes(i) ? T.text : T.tertiary,
              fontWeight: checkedItems.includes(i) ? 500 : 400,
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        background: T.border,
        borderRadius: 99,
        height: 5,
        marginBottom: 12,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${T.accent}, #818CF8)`,
          borderRadius: 99,
          transition: "width 0.05s linear",
          boxShadow: `0 0 10px ${T.accent}80`,
        }} />
      </div>
      <div style={{ fontSize: 12, color: T.tertiary }}>
        {done ? "Klart!" : `${Math.round(progress)}%`}
      </div>
    </div>
  );
}

function Step6({ state, onComplete }: { state: OnboardingState; onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  async function handleComplete() {
    setLoading(true);
    try {
      const token = localStorage.getItem("pixdrift_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Setup org
      await fetch(`${API}/api/org/setup`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          business_name: state.business_name,
          industry: state.industry,
          team_size: state.team_size,
          current_systems: state.current_systems,
        }),
      }).catch(() => {}); // non-blocking — proceed even if fails

      // 2. Send invite if filled
      if (state.invite_name.trim() && state.invite_email.trim()) {
        await fetch(`${API}/api/auth/invite`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: state.invite_name,
            email: state.invite_email,
            role: state.invite_role,
          }),
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
      localStorage.setItem("pixdrift_onboarding_complete", "true");
      onComplete();
    }
  }

  return (
    <div style={{
      textAlign: "center",
      padding: "16px 0",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ fontSize: 64, marginBottom: 24, filter: "drop-shadow(0 4px 20px rgba(99,102,241,0.5))" }}>
        🎉
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 12, letterSpacing: -0.5 }}>
        Välkommen till pixdrift!
      </h1>
      {state.business_name && (
        <p style={{ fontSize: 16, color: T.secondary, marginBottom: 8 }}>
          <span style={{ color: T.text, fontWeight: 600 }}>{state.business_name}</span> är konfigurerat.
        </p>
      )}
      <p style={{ fontSize: 15, color: T.secondary, marginBottom: 36 }}>
        Ni är redo att starta.
      </p>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
        {state.industry && (
          <SummaryChip icon="🏢" label={INDUSTRIES.find(i => i.id === state.industry)?.label || state.industry} />
        )}
        {state.team_size && <SummaryChip icon="👥" label={`${state.team_size} pers`} />}
        {state.invite_email.trim() && <SummaryChip icon="✉️" label="Inbjudan skickas" />}
        {state.current_systems.length > 0 && !state.current_systems.includes("ingenting") && (
          <SummaryChip icon="🔗" label={`${state.current_systems.length} integration${state.current_systems.length > 1 ? "er" : ""}`} />
        )}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <PrimaryButton
          label="Öppna din verkstad →"
          onClick={handleComplete}
          loading={loading}
        />
        <button
          onClick={handleComplete}
          style={{
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "13px 22px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            color: T.secondary,
            fontFamily: T.font,
            transition: "all 0.15s",
          }}
        >
          Gör en rundtur
        </button>
      </div>
    </div>
  );
}

function SummaryChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      background: T.surfaceAlt,
      border: `1px solid ${T.border}`,
      borderRadius: 99,
      padding: "5px 12px",
      fontSize: 13,
      color: T.secondary,
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: T.tertiary,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: "uppercase",
  display: "block",
  marginBottom: 8,
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete, onSkip }: Props) {
  const [state, setStateRaw] = useState<OnboardingState>({
    step: 1,
    business_name: "",
    industry: "",
    team_size: "",
    current_systems: [],
    invite_name: "",
    invite_email: "",
    invite_role: "Mekaniker",
  });

  // Slide direction
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  const [transitioning, setTransitioning] = useState(false);

  function setState(partial: Partial<OnboardingState>) {
    setStateRaw(prev => ({ ...prev, ...partial }));
  }

  function goTo(n: number, dir: "right" | "left" = "right") {
    if (transitioning) return;
    setSlideDir(dir);
    setTransitioning(true);
    setTimeout(() => {
      setState({ step: n });
      setTransitioning(false);
    }, 150);
  }

  function next() { goTo(state.step + 1, "right"); }
  function back() { goTo(state.step - 1, "left"); }

  // Inject keyframes once
  useEffect(() => {
    const id = "pixdrift-onboarding-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const contentStyle: CSSProperties = {
    opacity: transitioning ? 0 : 1,
    transform: transitioning
      ? `translateX(${slideDir === "right" ? 20 : -20}px)`
      : "translateX(0)",
    transition: "opacity 0.15s ease, transform 0.15s ease",
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 20,
      fontFamily: T.font,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.accent}12 0%, transparent 70%)`,
        pointerEvents: "none",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }} />

      <div style={{
        background: T.surface,
        borderRadius: 20,
        padding: "36px 44px",
        width: "100%",
        maxWidth: 520,
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${T.border}`,
        position: "relative",
        zIndex: 1,
      }}>
        {/* Skip button — available on steps 3+ */}
        {state.step >= 3 && state.step < 6 && (
          <button
            onClick={onSkip ?? onComplete}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "none",
              border: "none",
              color: T.tertiary,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.font,
              padding: "4px 8px",
              borderRadius: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = T.secondary)}
            onMouseLeave={e => (e.currentTarget.style.color = T.tertiary)}
          >
            Hoppa över allt
          </button>
        )}

        <StepLabel current={state.step} total={TOTAL_STEPS} />
        <ProgressBar step={state.step} />

        <div style={contentStyle}>
          {state.step === 1 && <Step1 onNext={next} />}
          {state.step === 2 && <Step2 state={state} setState={setState} onNext={next} />}
          {state.step === 3 && <Step3 state={state} setState={setState} onNext={next} onBack={back} />}
          {state.step === 4 && <Step4 state={state} setState={setState} onNext={next} onBack={back} />}
          {state.step === 5 && <Step5 state={state} onNext={next} onBack={back} />}
          {state.step === 6 && <Step6 state={state} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}
