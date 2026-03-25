// ============================================================
// BookingWidget.tsx — Customer intent → system allocates reality
// "Vi bokar inte tid. Vi allokerar verklighet."
// NOT a calendar picker.
// ============================================================

import { useState } from 'react';

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
  fill:      "#F2F2F7",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type ServiceType = 'SERVICE' | 'BRAKES' | 'DIAGNOSTICS' | 'TYRES' | 'INSPECTION' | 'REPAIR' | 'OTHER';
type Preference  = 'ASAP' | 'THIS_WEEK' | 'SPECIFIC_DATE' | 'NO_PREFERENCE';
type Screen      = 'service' | 'preference' | 'suggestions' | 'confirm' | 'done';

interface Suggestion {
  rank: number;
  date: string;
  date_raw: string;
  time: string;
  time_end: string;
  technician: string;
  technician_full: string;
  technician_id: string;
  estimated_minutes: number;
  delay_risk_pct: number;
  reason: string;
  estimate_basis: string;
}

interface SuggestResponse {
  suggestions: Suggestion[];
  warning?: string;
}

interface BookingResult {
  booking_id: string;
  confirmation_number: string;
  allocated_slot: {
    date: string;
    date_label: string;
    start: string;
    end: string;
    technician: string;
    drop_off_at: string;
    estimated_minutes: number;
    delay_risk_pct: number;
  };
  sms_sent: boolean;
}

// ─── Service definitions ───────────────────────────────────────────────────────
const SERVICES: { type: ServiceType; icon: string; label: string }[] = [
  { type: 'SERVICE',     icon: '🔧', label: 'Service'    },
  { type: 'BRAKES',      icon: '🛞', label: 'Bromsar'    },
  { type: 'DIAGNOSTICS', icon: '🔍', label: 'Felsökning' },
  { type: 'TYRES',       icon: '🏎', label: 'Däck'       },
  { type: 'INSPECTION',  icon: '📋', label: 'Besiktning' },
  { type: 'REPAIR',      icon: '🔨', label: 'Reparation' },
  { type: 'OTHER',       icon: '❓', label: 'Annat...'   },
];

const PREFERENCES: { pref: Preference; icon: string; label: string }[] = [
  { pref: 'ASAP',          icon: '⚡',  label: 'Snarast möjligt' },
  { pref: 'THIS_WEEK',     icon: '📅',  label: 'Denna vecka'     },
  { pref: 'SPECIFIC_DATE', icon: '🗓',  label: 'Välj dag'        },
  { pref: 'NO_PREFERENCE', icon: '🕐',  label: 'Spelar ingen roll' },
];

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Risk color ─────────────────────────────────────────────────────────────────
function riskColor(pct: number): string {
  if (pct <= 10) return C.green;
  if (pct <= 20) return C.orange;
  return C.red;
}

// ─── Main component ─────────────────────────────────────────────────────────────
interface BookingWidgetProps {
  orgId?: string;
  vehicleReg?: string;
  vehicleMake?: string;
  onDone?: (bookingId: string) => void;
}

export default function BookingWidget({ orgId, vehicleReg, vehicleMake, onDone }: BookingWidgetProps) {
  const [screen, setScreen]           = useState<Screen>('service');
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [preference, setPreference]   = useState<Preference | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [warning, setWarning]         = useState<string | undefined>();
  const [chosen, setChosen]           = useState<Suggestion | null>(null);
  const [phone, setPhone]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [result, setResult]           = useState<BookingResult | null>(null);

  // ── Screen 1 → 2: service selected ─────────────────────────────────────────
  function handleServiceSelect(type: ServiceType) {
    setServiceType(type);
    setScreen('preference');
  }

  // ── Screen 2 → 3: preference selected, fetch suggestions ───────────────────
  async function handlePreferenceSelect(pref: Preference) {
    setPreference(pref);
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/booking/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          vehicle_reg: vehicleReg,
          vehicle_make: vehicleMake,
          preference: pref,
          org_id: orgId,
        }),
      });
      const data: SuggestResponse = await resp.json();
      setSuggestions(data.suggestions || []);
      setWarning(data.warning);
      setScreen('suggestions');
    } catch (e: any) {
      setError('Kunde inte hämta tider. Kontrollera nätverket.');
    } finally {
      setLoading(false);
    }
  }

  // ── Screen 3 → 4: slot chosen ───────────────────────────────────────────────
  function handleSlotChosen(s: Suggestion) {
    setChosen(s);
    setScreen('confirm');
  }

  // ── Screen 4 → 5: confirm booking ──────────────────────────────────────────
  async function handleConfirm() {
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setError('Ange ett giltigt telefonnummer');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/booking/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          vehicle_reg: vehicleReg,
          vehicle_make: vehicleMake,
          customer_phone: phone,
          preference: preference,
          org_id: orgId,
          selected_slot: chosen
            ? { date: chosen.date_raw, technician_id: chosen.technician_id }
            : undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        setError(err.error || 'Något gick fel');
        return;
      }
      const data: BookingResult = await resp.json();
      setResult(data);
      setScreen('done');
      if (onDone) onDone(data.booking_id);
    } catch (e: any) {
      setError('Kunde inte bekräfta bokning. Försök igen.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: 420,
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: C.bg,
      minHeight: '100%',
      paddingBottom: 32,
    }}>

      {/* ── Screen 1: What do you need? ─────────────────────────────── */}
      {screen === 'service' && (
        <div style={{ padding: '32px 20px 20px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
            Vad behöver din bil?
          </h2>
          <p style={{ fontSize: 14, color: C.secondary, margin: '0 0 24px' }}>
            Vi hittar bästa tid åt dig automatiskt
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {SERVICES.map(s => (
              <button
                key={s.type}
                onClick={() => handleServiceSelect(s.type)}
                style={{
                  padding: '20px 12px',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Screen 2: When do you prefer? ───────────────────────────── */}
      {screen === 'preference' && (
        <div style={{ padding: '32px 20px 20px' }}>
          <button
            onClick={() => setScreen('service')}
            style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 16 }}
          >
            ← Tillbaka
          </button>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
            När passar det dig?
          </h2>
          <p style={{ fontSize: 14, color: C.secondary, margin: '0 0 24px' }}>
            {SERVICES.find(s => s.type === serviceType)?.icon}{' '}
            {SERVICES.find(s => s.type === serviceType)?.label} vald
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.secondary }}>
              ⏳ Beräknar bästa tid...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PREFERENCES.map(p => (
                <button
                  key={p.pref}
                  onClick={() => handlePreferenceSelect(p.pref)}
                  style={{
                    padding: '18px 20px',
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 16,
                    fontWeight: 500,
                    color: C.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: '#FFF3F3', borderRadius: 10, color: C.red, fontSize: 14 }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Screen 3: Suggestions ────────────────────────────────────── */}
      {screen === 'suggestions' && (
        <div style={{ padding: '32px 20px 20px' }}>
          <button
            onClick={() => setScreen('preference')}
            style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 16 }}
          >
            ← Tillbaka
          </button>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
            Vi har hittat tider åt dig
          </h2>
          <p style={{ fontSize: 14, color: C.secondary, margin: '0 0 20px' }}>
            Välj den tid som passar bäst
          </p>

          {warning && (
            <div style={{
              padding: '10px 14px',
              background: '#FFF8E6',
              border: `1px solid ${C.orange}`,
              borderRadius: 10,
              fontSize: 13,
              color: '#8A5E00',
              marginBottom: 16,
            }}>
              ⚠️ {warning}
            </div>
          )}

          {suggestions.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: C.secondary, background: C.surface, borderRadius: 14 }}>
              Inga lediga tider hittades just nu. Kontakta oss direkt.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map((s, i) => (
              <div
                key={s.rank}
                style={{
                  background: C.surface,
                  border: i === 0 ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                {i === 0 && (
                  <div style={{ background: C.blue, padding: '4px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                    ⭐ Rekommenderas
                  </div>
                )}
                <div style={{ padding: '16px 16px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{s.date}</div>
                      <div style={{ fontSize: 14, color: C.secondary, marginTop: 2 }}>
                        kl {s.time} · {s.technician} · ~{s.estimated_minutes} min
                      </div>
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: riskColor(s.delay_risk_pct),
                      background: riskColor(s.delay_risk_pct) + '22',
                      padding: '3px 8px',
                      borderRadius: 8,
                      whiteSpace: 'nowrap',
                    }}>
                      {s.delay_risk_pct}% risk
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: C.secondary, marginBottom: 12 }}>
                    {s.reason}
                  </div>
                  <button
                    onClick={() => handleSlotChosen(s)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: i === 0 ? C.blue : C.fill,
                      color: i === 0 ? '#fff' : C.text,
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Välj denna
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Screen 4: Confirm ─────────────────────────────────────────── */}
      {screen === 'confirm' && chosen && (
        <div style={{ padding: '32px 20px 20px' }}>
          <button
            onClick={() => setScreen('suggestions')}
            style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 16 }}
          >
            ← Tillbaka
          </button>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 20px' }}>
            Bekräfta din bokning
          </h2>

          {/* Booking summary */}
          <div style={{ background: C.surface, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, color: C.secondary, marginBottom: 4 }}>Tjänst</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {SERVICES.find(s => s.type === serviceType)?.icon}{' '}
              {SERVICES.find(s => s.type === serviceType)?.label}
              {vehicleMake && ` · ${vehicleMake}`}
              {vehicleReg && ` · ${vehicleReg}`}
            </div>

            <div style={{ fontSize: 13, color: C.secondary, marginBottom: 4 }}>Tid</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {chosen.date} kl {chosen.time}
            </div>

            <div style={{ fontSize: 13, color: C.secondary, marginBottom: 4 }}>Tekniker</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {chosen.technician_full} · ~{chosen.estimated_minutes} min
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              background: C.fill,
              borderRadius: 10,
              fontSize: 13,
              color: C.secondary,
            }}>
              <span style={{ color: riskColor(chosen.delay_risk_pct), fontWeight: 600 }}>
                {chosen.delay_risk_pct}% förseningsrisk
              </span>
              <span>·</span>
              <span>{chosen.reason}</span>
            </div>
          </div>

          {/* Phone number input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Ditt telefonnummer
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="070-123 45 67"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                background: C.surface,
                color: C.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 12, color: C.secondary, marginTop: 6 }}>
              📱 SMS-bekräftelse skickas till detta nummer
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: 12, background: '#FFF3F3', borderRadius: 10, color: C.red, fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? C.secondary : C.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? '⏳ Bokar...' : 'Bekräfta →'}
          </button>
        </div>
      )}

      {/* ── Screen 5: Confirmed ───────────────────────────────────────── */}
      {screen === 'done' && result && (
        <div style={{ padding: '48px 20px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.green, margin: '0 0 8px' }}>
            Bokning bekräftad!
          </h2>
          <p style={{ fontSize: 16, color: C.secondary, margin: '0 0 32px' }}>
            {result.allocated_slot.date_label} kl {result.allocated_slot.start}
          </p>

          <div style={{
            background: C.surface,
            borderRadius: 14,
            padding: 20,
            textAlign: 'left',
            border: `1px solid ${C.border}`,
            marginBottom: 20,
          }}>
            <Row label="Tekniker" value={result.allocated_slot.technician} />
            <Row label="Beräknad tid" value={`~${result.allocated_slot.estimated_minutes} min`} />
            <Row label="Lämna bilen" value={`Från kl ${result.allocated_slot.drop_off_at} (10 min tidigt)`} />
            <Row
              label="SMS"
              value={result.sms_sent ? `Skickat till ${phone}` : 'Sparad (SMS ej konfigurerat)'}
            />
          </div>

          <div style={{
            padding: '14px 20px',
            background: C.fill,
            borderRadius: 12,
            fontSize: 14,
            color: C.secondary,
            fontWeight: 500,
            letterSpacing: 1,
          }}>
            Bokningsnummer: <strong style={{ color: C.text }}>{result.confirmation_number}</strong>
          </div>

          {result.allocated_slot.delay_risk_pct <= 10 && (
            <div style={{ marginTop: 16, fontSize: 13, color: C.green }}>
              🟢 Låg förseningsrisk ({result.allocated_slot.delay_risk_pct}%) — vi ses i tid!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Small helper row for the confirmation summary
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F2F2F7' }}>
      <span style={{ fontSize: 13, color: '#8E8E93' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#000', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
