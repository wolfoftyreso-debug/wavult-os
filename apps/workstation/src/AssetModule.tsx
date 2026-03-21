// ─────────────────────────────────────────────────────────────────────────────
// AssetModule.tsx — Asset Accountability & Traceability System
// "No asset without owner. No return without verification. Every movement is an inventory event."
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApi } from "./useApi";

// ─── Constants ───────────────────────────────────────────────────────────────
const C = {
  bg: "#F2F2F7",
  surface: "#FFFFFF",
  blue: "#007AFF",
  green: "#34C759",
  yellow: "#FF9500",
  red: "#FF3B30",
  orange: "#FF6B00",
  gray: "#8E8E93",
  border: "rgba(60,60,67,0.18)",
  text: "#1C1C1E",
  textSub: "#6C6C70",
};

const shadow = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)";
const shadowMd = "0 4px 16px rgba(0,0,0,0.12)";

const API_BASE = "/api/tool-assets";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: C.green,
  IN_USE: C.yellow,
  MAINTENANCE: C.gray,
  DAMAGED: C.red,
  MISSING: C.red,
  DECOMMISSIONED: C.gray,
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tillgänglig",
  IN_USE: "Utlånad",
  MAINTENANCE: "Underhåll",
  DAMAGED: "Skadad",
  MISSING: "Saknas",
  DECOMMISSIONED: "Avvecklad",
};

const CATEGORY_LABELS: Record<string, string> = {
  TOOL: "Verktyg",
  MACHINE: "Maskin",
  VEHICLE: "Fordon",
  EQUIPMENT: "Utrustning",
  INSTRUMENT: "Instrument",
  SAFETY: "Säkerhet",
  IT: "IT",
};

const CATEGORY_COLORS: Record<string, string> = {
  TOOL: "#007AFF",
  MACHINE: "#5856D6",
  VEHICLE: "#FF9500",
  EQUIPMENT: "#34C759",
  INSTRUMENT: "#FF2D55",
  SAFETY: "#FF6B00",
  IT: "#32ADE6",
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const Badge = ({ color, label }: { color: string; label: string }) => (
  <span style={{
    background: color + "18", color,
    fontSize: 11, fontWeight: 600, padding: "2px 8px",
    borderRadius: 6, whiteSpace: "nowrap",
  }}>
    {label}
  </span>
);

const ConditionDots = ({ score, size = 10 }: { score: number; size?: number }) => (
  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{
        width: size, height: size, borderRadius: "50%",
        background: i <= score
          ? (score >= 4 ? C.green : score >= 3 ? C.yellow : C.red)
          : C.border,
      }} />
    ))}
  </div>
);

const StarRating = ({ score, onChange }: { score: number; onChange?: (n: number) => void }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        onClick={() => onChange?.(i)}
        style={{
          fontSize: 28,
          cursor: onChange ? "pointer" : "default",
          color: i <= score ? C.yellow : C.border,
          lineHeight: 1,
          userSelect: "none",
        }}
      >★</span>
    ))}
  </div>
);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.surface, borderRadius: 12,
    boxShadow: shadow, border: `0.5px solid ${C.border}`,
    ...style,
  }}>
    {children}
  </div>
);

const Btn = ({
  label, color = C.blue, onClick, disabled, secondary, small, icon,
}: {
  label: string; color?: string; onClick?: () => void;
  disabled?: boolean; secondary?: boolean; small?: boolean; icon?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: secondary ? "transparent" : disabled ? C.border : color,
      color: secondary ? color : "#fff",
      border: secondary ? `1.5px solid ${color}` : "none",
      borderRadius: 10, fontWeight: 600,
      fontSize: small ? 13 : 15,
      padding: small ? "6px 14px" : "10px 20px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      display: "flex", alignItems: "center", gap: 6,
      whiteSpace: "nowrap",
    }}
  >
    {icon}{label}
  </button>
);

const SummaryCard = ({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) => (
  <Card style={{ padding: "16px 20px", flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 12, color: C.textSub, fontWeight: 500, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>{sub}</div>}
  </Card>
);

// ─── QR Scanner ───────────────────────────────────────────────────────────────

const QRScanner = ({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) => {
  const [manualCode, setManualCode] = useState("");
  const isMobile = /iPhone|iPad|Android/.test(navigator.userAgent);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }}>
      <Card style={{ padding: 24, width: 320, maxWidth: "90vw" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>📷 Skanna QR-kod</div>

        {isMobile && (
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "24px", border: `2px dashed ${C.border}`, borderRadius: 10,
            marginBottom: 16, cursor: "pointer",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, color: C.textSub }}>Öppna kameran</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                // In a real implementation, use html5-qrcode or ZXing to decode
                // For now, just signal the user to also try manual input
              }}
            />
          </label>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Ange QR-kod manuellt</div>
          <input
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && manualCode && onScan(manualCode)}
            placeholder="QR-xxx eller tillgångsnummer"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 15, boxSizing: "border-box",
              outline: "none",
            }}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn label="Sök" onClick={() => manualCode && onScan(manualCode)} disabled={!manualCode} />
          <Btn label="Avbryt" secondary onClick={onClose} />
        </div>
      </Card>
    </div>
  );
};

// ─── Checkin Flow ─────────────────────────────────────────────────────────────

const CheckinFlow = ({
  asset,
  onComplete,
  onClose,
  token,
}: {
  asset: any;
  onComplete: () => void;
  onClose: () => void;
  token: string;
}) => {
  const [step, setStep] = useState(1);
  const [conditionScore, setConditionScore] = useState(asset.condition_score ?? 5);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const photoRequired = asset.requires_photo_on_return;
  const canProceed = !photoRequired || photos.length > 0;

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/${asset.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ condition_score: conditionScore, condition_notes: notes, photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <Card style={{ padding: 24, width: 400, maxWidth: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Lämna tillbaka</div>
            <div style={{ fontSize: 13, color: C.textSub }}>{asset.name}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: step >= s ? C.blue : C.border,
              }} />
            ))}
          </div>
        </div>

        {/* Step 1: Condition */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              1. Vilket skick är tillgången i?
            </div>
            <div style={{ marginBottom: 8 }}>
              <StarRating score={conditionScore} onChange={setConditionScore} />
            </div>
            <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>
              {conditionScore >= 4 ? "Bra skick" : conditionScore >= 3 ? "Acceptabelt" : conditionScore >= 2 ? "Slitet" : "Dåligt — kräver åtgärd"}
            </div>
            <Btn label="Nästa →" onClick={() => setStep(2)} />
          </div>
        )}

        {/* Step 2: Photo */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              2. Foto {photoRequired && <span style={{ color: C.red }}>*</span>}
            </div>
            {photoRequired && (
              <div style={{
                background: C.red + "10", color: C.red, fontSize: 12,
                padding: "6px 10px", borderRadius: 6, marginBottom: 12,
              }}>
                ⚠️ Foto krävs för denna tillgång
              </div>
            )}
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "20px", border: `2px dashed ${photoRequired && photos.length === 0 ? C.red : C.border}`,
              borderRadius: 10, marginBottom: 16, cursor: "pointer",
            }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>
                {photos.length > 0 ? "✅" : "📷"}
              </div>
              <div style={{ fontSize: 14, color: C.textSub }}>
                {photos.length > 0 ? `${photos.length} foto tillagd` : "Ta foto eller ladda upp"}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  // In production: upload to S3 and store URL
                  // For now: create a local object URL as placeholder
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setPhotos(prev => [...prev, url]);
                  }
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="← Tillbaka" secondary onClick={() => setStep(1)} />
              <Btn
                label="Nästa →"
                onClick={() => setStep(3)}
                disabled={photoRequired && photos.length === 0}
              />
            </div>
          </div>
        )}

        {/* Step 3: Notes */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              3. Noteringar (valfritt)
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ev. kommentarer om skick, problem, etc."
              rows={4}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 14, resize: "none",
                boxSizing: "border-box", outline: "none", marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="← Tillbaka" secondary onClick={() => setStep(2)} />
              <Btn label="Nästa →" onClick={() => setStep(4)} />
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>4. Bekräfta</div>
            <div style={{
              background: C.bg, borderRadius: 10, padding: "14px 16px", marginBottom: 16,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.textSub }}>Tillgång</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{asset.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.textSub }}>Skick</span>
                <ConditionDots score={conditionScore} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.textSub }}>Foto</span>
                <span style={{ fontSize: 13, color: photos.length > 0 ? C.green : C.textSub }}>
                  {photos.length > 0 ? `${photos.length} bifogad` : "Ingen"}
                </span>
              </div>
              {notes && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.textSub }}>Notering</span>
                  <span style={{ fontSize: 13, maxWidth: 200, textAlign: "right" }}>{notes}</span>
                </div>
              )}
            </div>

            {error && (
              <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="← Tillbaka" secondary onClick={() => setStep(3)} />
              <Btn
                label={loading ? "Bekräftar..." : "✓ Bekräfta inlämning"}
                color={C.green}
                onClick={handleSubmit}
                disabled={loading || !canProceed}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Asset Row ────────────────────────────────────────────────────────────────

const AssetRow = ({
  asset,
  onClick,
  isOverdue,
}: {
  asset: any;
  onClick: () => void;
  isOverdue: boolean;
}) => {
  const statusColor = STATUS_COLORS[asset.status] ?? C.gray;
  const categoryColor = CATEGORY_COLORS[asset.category] ?? C.blue;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", cursor: "pointer",
        borderBottom: `0.5px solid ${C.border}`,
        background: isOverdue ? C.red + "04" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? C.red + "04" : "transparent")}
    >
      {/* Category icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: categoryColor + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        {asset.category === "TOOL" ? "🔧" :
         asset.category === "MACHINE" ? "⚙️" :
         asset.category === "VEHICLE" ? "🚗" :
         asset.category === "EQUIPMENT" ? "📦" :
         asset.category === "INSTRUMENT" ? "🔬" :
         asset.category === "SAFETY" ? "🦺" : "💻"}
      </div>

      {/* Name + number */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {asset.name}
          {isOverdue && <span style={{ color: C.red, marginLeft: 6 }}>⚠ Försenad</span>}
        </div>
        <div style={{ fontSize: 12, color: C.textSub }}>{asset.asset_number}</div>
      </div>

      {/* Category badge */}
      <Badge color={categoryColor} label={CATEGORY_LABELS[asset.category] ?? asset.category} />

      {/* Holder */}
      <div style={{ fontSize: 12, color: C.textSub, width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {asset.current_holder_name ?? (asset.status === "AVAILABLE" ? "—" : "Okänd")}
      </div>

      {/* Condition */}
      <ConditionDots score={asset.condition_score ?? 5} />

      {/* Status */}
      <Badge color={statusColor} label={STATUS_LABELS[asset.status] ?? asset.status} />
    </div>
  );
};

// ─── Asset Detail ─────────────────────────────────────────────────────────────

const AssetDetail = ({
  assetId,
  onBack,
  currentUserId,
  currentUserName,
  token,
  onRefresh,
}: {
  assetId: string;
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
  token: string;
  onRefresh: () => void;
}) => {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchAsset = async () => {
    const res = await fetch(`${API_BASE}/${assetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setAsset(data);
    setLoading(false);
  };

  useEffect(() => { fetchAsset(); }, [assetId]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    await fetch(`${API_BASE}/${assetId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: currentUserId, user_name: currentUserName }),
    });
    await fetchAsset();
    onRefresh();
    setCheckoutLoading(false);
  };

  const handleDamageReport = async () => {
    const desc = prompt("Beskriv skadan:");
    if (!desc) return;
    await fetch(`${API_BASE}/${assetId}/damage-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: desc, severity: "HIGH" }),
    });
    await fetchAsset();
    onRefresh();
  };

  const handleReportMissing = async () => {
    if (!confirm("Markera tillgången som saknad?")) return;
    await fetch(`${API_BASE}/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "MISSING" }),
    });
    // Create alert
    await fetch(`${API_BASE}/${assetId}/damage-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: "Tillgång rapporterad som saknad", severity: "CRITICAL" }),
    });
    await fetchAsset();
    onRefresh();
  };

  if (loading) return (
    <div style={{ padding: 24, textAlign: "center", color: C.textSub }}>Laddar...</div>
  );

  if (!asset) return (
    <div style={{ padding: 24 }}>
      <Btn label="← Tillbaka" secondary onClick={onBack} />
      <div style={{ marginTop: 24, color: C.red }}>Tillgång hittades inte</div>
    </div>
  );

  const isMyAsset = asset.current_holder_id === currentUserId;
  const isAvailable = asset.status === "AVAILABLE";
  const statusColor = STATUS_COLORS[asset.status] ?? C.gray;
  const categoryColor = CATEGORY_COLORS[asset.category] ?? C.blue;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 0" }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontSize: 15, marginBottom: 16, fontWeight: 500 }}
      >
        ← Tillbaka
      </button>

      {/* Header card */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 14,
            background: categoryColor + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, flexShrink: 0,
          }}>
            {asset.photo_url ? (
              <img src={asset.photo_url} style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover" }} alt="" />
            ) : (
              asset.category === "TOOL" ? "🔧" : asset.category === "MACHINE" ? "⚙️" :
              asset.category === "VEHICLE" ? "🚗" : asset.category === "EQUIPMENT" ? "📦" :
              asset.category === "INSTRUMENT" ? "🔬" : asset.category === "SAFETY" ? "🦺" : "💻"
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{asset.name}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <Badge color={statusColor} label={STATUS_LABELS[asset.status] ?? asset.status} />
              <Badge color={categoryColor} label={CATEGORY_LABELS[asset.category] ?? asset.category} />
              <span style={{ fontSize: 12, color: C.textSub }}>#{asset.asset_number}</span>
            </div>
            <StarRating score={asset.condition_score ?? 5} />
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginTop: 16 }}>
          {[
            ["Nuvarande innehavare", asset.current_holder_name ?? "Ingen"],
            ["Plats", asset.location ?? "—"],
            ["Serienummer", asset.serial_number ?? "—"],
            ["Tillverkare / modell", [asset.manufacturer, asset.model].filter(Boolean).join(" ") || "—"],
            ["Senaste inspektion", asset.last_inspection_at ? new Date(asset.last_inspection_at).toLocaleDateString("sv-SE") : "—"],
            ["Nästa inspektion", asset.next_inspection_at ? new Date(asset.next_inspection_at).toLocaleDateString("sv-SE") : "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: C.textSub, fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {isAvailable && (
            <Btn
              label={checkoutLoading ? "Checkar ut..." : "Hämta ut"}
              color={C.blue}
              onClick={handleCheckout}
              disabled={checkoutLoading}
              icon={<span>↗</span>}
            />
          )}
          {isMyAsset && asset.status === "IN_USE" && (
            <>
              <Btn
                label="Lämna tillbaka"
                color={C.green}
                onClick={() => setCheckinOpen(true)}
                icon={<span>↙</span>}
              />
              <Btn
                label="Rapportera skada"
                color={C.red}
                secondary
                onClick={handleDamageReport}
              />
            </>
          )}
          {asset.status === "IN_USE" && (
            <Btn
              label="Rapportera saknad"
              color={C.red}
              secondary
              onClick={handleReportMissing}
            />
          )}
        </div>
      </Card>

      {/* Movement history */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📋 Historik</div>
        {(asset.movements ?? []).length === 0 ? (
          <div style={{ color: C.textSub, fontSize: 14, textAlign: "center", padding: "20px 0" }}>
            Ingen historik än
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {(asset.movements ?? []).map((m: any, i: number) => {
              const mvColor = m.movement_type === "CHECKOUT" ? C.yellow :
                m.movement_type === "CHECKIN" ? C.green :
                m.movement_type === "DAMAGE_REPORT" ? C.red :
                m.movement_type === "INSPECTION" ? C.blue : C.gray;

              const mvLabel: Record<string, string> = {
                CHECKOUT: "Utlåning",
                CHECKIN: "Inlämning",
                TRANSFER: "Överlämning",
                INSPECTION: "Inspektion",
                DAMAGE_REPORT: "Skaderapport",
                MAINTENANCE_START: "Underhåll start",
                MAINTENANCE_END: "Underhåll klar",
                LOST_REPORT: "Rapport: Saknas",
                FOUND: "Återfunnen",
              };

              return (
                <div key={m.id} style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderBottom: i < asset.movements.length - 1 ? `0.5px solid ${C.border}` : "none",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: mvColor, flexShrink: 0, marginTop: 3,
                    }} />
                    {i < asset.movements.length - 1 && (
                      <div style={{ flex: 1, width: 1, background: C.border, marginTop: 3 }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: mvColor }}>
                        {mvLabel[m.movement_type] ?? m.movement_type}
                      </span>
                      <span style={{ fontSize: 11, color: C.textSub }}>
                        {new Date(m.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                      {m.to_holder_name && `→ ${m.to_holder_name}`}
                      {m.from_holder_name && !m.to_holder_name && `← ${m.from_holder_name}`}
                      {m.condition_score && ` · Skick: ${m.condition_score}/5`}
                      {m.condition_notes && ` · ${m.condition_notes}`}
                    </div>
                    {m.photo_urls?.length > 0 && (
                      <div style={{ fontSize: 12, color: C.blue, marginTop: 2 }}>
                        📷 {m.photo_urls.length} foto
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Active alerts */}
      {(asset.alerts ?? []).length > 0 && (
        <Card style={{ padding: 20, border: `1.5px solid ${C.red}20` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.red, marginBottom: 12 }}>⚠️ Aktiva varningar</div>
          {asset.alerts.map((a: any) => (
            <div key={a.id} style={{
              background: C.red + "08", borderRadius: 8, padding: "10px 12px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{a.description}</div>
            </div>
          ))}
        </Card>
      )}

      {checkinOpen && (
        <CheckinFlow
          asset={asset}
          token={token}
          onClose={() => setCheckinOpen(false)}
          onComplete={() => {
            setCheckinOpen(false);
            fetchAsset();
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// ─── Main Module ──────────────────────────────────────────────────────────────

const AssetModule = ({ user }: { user?: { id: string; full_name?: string; org_id?: string } }) => {
  const [view, setView] = useState<"dashboard" | "list" | "detail" | "tasks">("dashboard");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [overdueIds, setOverdueIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);

  // Try to get token from cookie/localStorage
  const token = (document.cookie.match(/pixdrift_session=([^;]+)/) ?? [])[1] ?? localStorage.getItem("sb-access-token") ?? "";
  const orgId = user?.org_id ?? "";
  const userId = user?.id ?? "";
  const userName = user?.full_name ?? "Okänd";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const qs = orgId ? `?org_id=${orgId}` : "";

      const [aRes, alertsRes, overdueRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}${qs}`, { headers }),
        fetch(`${API_BASE}/alerts${qs}`, { headers }),
        fetch(`${API_BASE}/overdue${qs}`, { headers }),
        fetch(`${API_BASE}/tasks${qs}`, { headers }),
      ]);

      const [aData, alertsData, overdueData, tasksData] = await Promise.all([
        aRes.json(), alertsRes.json(), overdueRes.json(), tasksRes.json(),
      ]);

      setAssets(aData.assets ?? []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setOverdueIds(new Set((Array.isArray(overdueData) ? overdueData : []).map((a: any) => a.id)));
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (e) {
      console.error("AssetModule fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleQrScan = async (code: string) => {
    setQrOpen(false);
    const res = await fetch(`${API_BASE}/qr/${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { asset } = await res.json();
      setSelectedAssetId(asset.id);
      setView("detail");
    } else {
      alert("Tillgång hittades inte för QR-kod: " + code);
    }
  };

  // Derived stats
  const myAssets = assets.filter(a => a.current_holder_id === userId);
  const totalAssets = assets.length;
  const inUse = assets.filter(a => a.status === "IN_USE").length;
  const overdueCount = overdueIds.size;
  const alertCount = alerts.length;

  // Filtered assets
  const filteredAssets = assets.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterCategory && a.category !== filterCategory) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.asset_number.toLowerCase().includes(q);
    }
    return true;
  });

  if (view === "detail" && selectedAssetId) {
    return (
      <div style={{ padding: "16px 24px", background: C.bg, minHeight: "100vh" }}>
        <AssetDetail
          assetId={selectedAssetId}
          onBack={() => setView("list")}
          currentUserId={userId}
          currentUserName={userName}
          token={token}
          onRefresh={fetchAll}
        />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "16px 24px" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔧 Tillgångar</h1>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
            Tillgångsansvar & spårbarhet
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            label="📷 Skanna QR"
            color={C.blue}
            onClick={() => setQrOpen(true)}
          />
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: C.surface, borderRadius: 10, padding: 4, width: "fit-content", boxShadow: shadow }}>
        {[
          { id: "dashboard", label: "Översikt" },
          { id: "list", label: "Alla tillgångar" },
          { id: "tasks", label: `Uppgifter${tasks.filter(t => t.status === "OVERDUE").length > 0 ? ` ⚠${tasks.filter(t => t.status === "OVERDUE").length}` : ""}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: view === tab.id ? C.blue : "transparent",
              color: view === tab.id ? "#fff" : C.text,
              fontWeight: view === tab.id ? 600 : 500,
              fontSize: 13, cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {view === "dashboard" && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <SummaryCard label="Totalt" value={totalAssets} color={C.blue} />
            <SummaryCard label="Utlånade" value={inUse} color={C.yellow} sub={`${totalAssets > 0 ? Math.round(inUse / totalAssets * 100) : 0}% utnyttjande`} />
            <SummaryCard label="Försenade" value={overdueCount} color={overdueCount > 0 ? C.red : C.green} />
            <SummaryCard label="Varningar" value={alertCount} color={alertCount > 0 ? C.orange : C.green} />
          </div>

          {/* My assets */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Mina tillgångar</div>
              <span style={{
                background: C.blue + "15", color: C.blue,
                fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              }}>{myAssets.length}</span>
            </div>
            {myAssets.length === 0 ? (
              <div style={{ padding: "20px 20px 20px", color: C.textSub, fontSize: 14, textAlign: "center" }}>
                Du har inga utlånade tillgångar
              </div>
            ) : (
              myAssets.map(a => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  isOverdue={overdueIds.has(a.id)}
                  onClick={() => { setSelectedAssetId(a.id); setView("detail"); }}
                />
              ))
            )}
          </Card>

          {/* Overdue */}
          {overdueCount > 0 && (
            <Card style={{ marginBottom: 20, border: `1.5px solid ${C.red}30` }}>
              <div style={{ padding: "16px 20px 0" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>⚠️ Försenade utlåningar</div>
              </div>
              {assets
                .filter(a => overdueIds.has(a.id))
                .map(a => (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    isOverdue
                    onClick={() => { setSelectedAssetId(a.id); setView("detail"); }}
                  />
                ))}
            </Card>
          )}

          {/* Active alerts */}
          {alerts.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔔 Aktiva varningar</div>
                {alerts.slice(0, 5).map((a: any) => {
                  const sevColor = a.severity === "CRITICAL" ? C.red : a.severity === "HIGH" ? C.orange : C.yellow;
                  return (
                    <div key={a.id} style={{
                      display: "flex", gap: 10, padding: "10px 0",
                      borderBottom: `0.5px solid ${C.border}`,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: sevColor, marginTop: 5, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{a.description}</div>
                      </div>
                      <Badge color={sevColor} label={a.severity} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="🔍 Sök namn, nummer..."
              style={{
                flex: 1, minWidth: 180, padding: "8px 12px",
                borderRadius: 8, border: `1px solid ${C.border}`,
                fontSize: 14, outline: "none", background: C.surface,
              }}
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13 }}
            >
              <option value="">Alla statusar</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13 }}
            >
              <option value="">Alla kategorier</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <Card>
            {/* Header */}
            <div style={{
              display: "flex", gap: 12, padding: "10px 16px",
              borderBottom: `1px solid ${C.border}`, background: C.bg,
              borderRadius: "12px 12px 0 0",
            }}>
              {[["", 48], ["Namn", "1"], ["Kategori", "auto"], ["Innehavare", 100], ["Skick", "auto"], ["Status", "auto"]].map(([label, flex]) => (
                <div key={label} style={{ fontSize: 11, fontWeight: 600, color: C.textSub, flex: flex === "1" ? 1 : undefined, width: flex !== "1" && flex !== "auto" ? flex : undefined }}>
                  {label}
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: C.textSub }}>Laddar...</div>
            ) : filteredAssets.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.textSub }}>
                Inga tillgångar hittade
              </div>
            ) : (
              filteredAssets.map(a => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  isOverdue={overdueIds.has(a.id)}
                  onClick={() => { setSelectedAssetId(a.id); setView("detail"); }}
                />
              ))
            )}
          </Card>
        </div>
      )}

      {/* ── TASKS VIEW ── */}
      {view === "tasks" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Inventeringsuppgifter</div>
          </div>

          {tasks.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Inga uppgifter</div>
              <div style={{ fontSize: 13, color: C.textSub }}>Alla uppgifter är slutförda</div>
            </Card>
          ) : (
            tasks.map((t: any) => {
              const isOverdue = t.status === "OVERDUE" || (t.next_due_at && new Date(t.next_due_at) < new Date() && t.status !== "COMPLETED");
              const taskColor = isOverdue ? C.red : t.status === "IN_PROGRESS" ? C.yellow : C.blue;

              return (
                <Card key={t.id} style={{ padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
                        {isOverdue && (
                          <span style={{
                            background: C.red + "15", color: C.red,
                            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          }}>
                            FÖRSENAD
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub }}>
                        {t.asset_category && `${CATEGORY_LABELS[t.asset_category] ?? t.asset_category} · `}
                        {t.assigned_role && `${t.assigned_role} · `}
                        Förfaller: {new Date(t.next_due_at).toLocaleDateString("sv-SE")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {t.status === "PENDING" && (
                        <Btn
                          label="Starta"
                          small
                          color={taskColor}
                          onClick={async () => {
                            await fetch(`${API_BASE}/tasks/${t.id}/start`, {
                              method: "PATCH",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            fetchAll();
                          }}
                        />
                      )}
                      {t.status === "IN_PROGRESS" && (
                        <Btn
                          label="Slutför"
                          small
                          color={C.green}
                          onClick={async () => {
                            await fetch(`${API_BASE}/tasks/${t.id}/complete`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ completion_notes: "Slutförd" }),
                            });
                            fetchAll();
                          }}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* QR Scanner modal */}
      {qrOpen && <QRScanner onScan={handleQrScan} onClose={() => setQrOpen(false)} />}
    </div>
  );
};

export default AssetModule;
