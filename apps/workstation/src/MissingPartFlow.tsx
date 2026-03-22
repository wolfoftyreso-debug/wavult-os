// MissingPartFlow.tsx — Missing Part Protocol
// "A missing part on a booked job is a company failure — not an inconvenience."
// Step-by-step guided response like an airline delay protocol.

import { useState, useEffect } from 'react';

// ─── Minimal API helper (replaces useApi for POST-only usage) ─────────────────
function useApi() {
  async function post(endpoint: string, body: unknown): Promise<unknown> {
    const token = localStorage.getItem("pixdrift_token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  return { post };
}

// ─── Color system ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#F2F2F7',
  surface:   '#FFFFFF',
  border:    '#D1D1D6',
  text:      '#000000',
  secondary: '#8E8E93',
  tertiary:  '#C7C7CC',
  blue:      '#007AFF',
  green:     '#34C759',
  orange:    '#FF9500',
  red:       '#FF3B30',
  fill:      '#F2F2F7',
};

const shadow = '0 2px 8px rgba(0,0,0,0.08)';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MissingPartIncident {
  id: string;
  vehicle_reg: string;
  customer_name?: string;
  customer_phone?: string;
  part_description: string;
  part_number?: string;
  part_supplier?: string;
  part_eta?: string;
  part_arrived_at?: string;
  customer_notified_at?: string;
  new_appointment_at?: string;
  compensation_type?: string;
  compensation_description?: string;
  status: string;
  created_at: string;
}

interface MissingPartFlowProps {
  incident: MissingPartIncident;
  vehicleMake?: string;       // e.g. "VW Golf"
  bookedTime?: string;        // e.g. "Idag kl 13:00"
  workshopName?: string;
  workshopPhone?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

type FlowStep = 'CONFIRM' | 'ORDER' | 'NOTIFY' | 'COMPENSATE' | 'RENTAL' | 'RESCHEDULE' | 'FOLLOWUP';

const SUPPLIERS = ['Söderbergs', 'AUTODOC', 'Mekonomen', 'Annan'];
const ETA_OPTIONS = [
  { label: 'Idag',      value: 'today',   days: 0 },
  { label: 'Imorgon',   value: 'tomorrow',days: 1 },
  { label: '2-3 dagar', value: 'days2_3', days: 2.5 },
  { label: 'Ange datum',value: 'custom',  days: -1 },
];

const COMPENSATION_OPTIONS = [
  { key: 'FREE_WASH',   label: 'Gratis biltvätt',   sublabel: 'Samma dag',              condition: 'SAME_DAY' },
  { key: 'DISCOUNT_10', label: '10% rabatt',         sublabel: '1-3 dagars försening',   condition: 'SHORT_DELAY' },
  { key: 'DISCOUNT_20', label: '20% rabatt',         sublabel: '3-7 dagars försening',   condition: 'MEDIUM_DELAY' },
  { key: 'DISCOUNT_50', label: '50% rabatt',         sublabel: '>7 dagars försening',    condition: 'LONG_DELAY' },
  { key: 'COURTESY_CAR',label: 'Lånefordon',         sublabel: 'Kunden behöver bil',     condition: 'URGENT' },
  { key: 'CUSTOM',      label: 'Anpassad',           sublabel: 'Ange manuellt',          condition: 'CUSTOM' },
];

// Mock rental vehicles (fallback when API unavailable)
const MOCK_RENTAL_VEHICLES = [
  { id: 'v1', provider: 'Europcar', make: 'Volkswagen', model: 'Golf', year: 2024, class: 'COMPACT', daily_rate: 650, currency: 'SEK', available: true, features: ['Manuell', 'Diesel', '5 dörrar'], pickup_location: 'Hisingen, Göteborg' },
  { id: 'v2', provider: 'Hertz', make: 'Toyota', model: 'Corolla', year: 2024, class: 'COMPACT', daily_rate: 590, currency: 'SEK', available: true, features: ['Automat', 'Hybrid', '4 dörrar'], pickup_location: 'Centralen, Göteborg' },
  { id: 'v3', provider: 'Sixt', make: 'BMW', model: '3 Series', year: 2023, class: 'MIDSIZE', daily_rate: 1100, currency: 'SEK', available: true, features: ['Automat', 'Bensin', 'Premium'], pickup_location: 'Göteborg City' },
  { id: 'v4', provider: 'Avis', make: 'Volvo', model: 'V60', year: 2024, class: 'MIDSIZE', daily_rate: 850, currency: 'SEK', available: true, features: ['Automat', 'Hybrid', 'Familjevänlig'], pickup_location: 'Lindholmen' },
];

function suggestCompensationKey(etaDays: number): string {
  if (etaDays < 1)  return 'FREE_WASH';
  if (etaDays <= 3) return 'DISCOUNT_10';
  if (etaDays <= 7) return 'DISCOUNT_20';
  return 'DISCOUNT_50';
}

function etaDaysToCETDate(value: string, customDate?: string): string | null {
  const now = new Date();
  if (value === 'today') {
    now.setHours(18, 0, 0, 0);
    return now.toISOString();
  }
  if (value === 'tomorrow') {
    now.setDate(now.getDate() + 1);
    now.setHours(10, 0, 0, 0);
    return now.toISOString();
  }
  if (value === 'days2_3') {
    now.setDate(now.getDate() + 3);
    now.setHours(10, 0, 0, 0);
    return now.toISOString();
  }
  if (value === 'custom' && customDate) {
    return new Date(customDate).toISOString();
  }
  return null;
}

function etaDays(etaValue: string): number {
  if (etaValue === 'today')    return 0;
  if (etaValue === 'tomorrow') return 1;
  if (etaValue === 'days2_3')  return 2.5;
  return 5; // default for custom
}

function formatSwedishDate(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Step progress indicator ─────────────────────────────────────────────────
const STEPS: { key: FlowStep; label: string }[] = [
  { key: 'ORDER',      label: '1. Beställ' },
  { key: 'NOTIFY',     label: '2. Informera' },
  { key: 'COMPENSATE', label: '3. Kompensera' },
  { key: 'RENTAL',     label: '4. Hyrbil' },
  { key: 'RESCHEDULE', label: '5. Boka om' },
];

function StepIndicator({ current }: { current: FlowStep }) {
  const activeIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div style={{
      display: 'flex', gap: 0, marginBottom: 20, overflow: 'hidden', borderRadius: 10,
    }}>
      {STEPS.map((s, i) => {
        const isDone    = i < activeIdx;
        const isActive  = i === activeIdx;
        return (
          <div key={s.key} style={{
            flex: 1,
            padding: '8px 4px',
            textAlign: 'center',
            fontSize: 11, fontWeight: isActive ? 700 : 500,
            color: isDone ? C.green : isActive ? C.blue : C.tertiary,
            background: isActive ? '#EAF2FF' : isDone ? '#EAFBEF' : C.fill,
            borderRight: i < STEPS.length - 1 ? `1px solid ${C.border}` : 'none',
            transition: 'all 0.2s',
          }}>
            {isDone ? '✓ ' : ''}{s.label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MissingPartFlow({
  incident,
  vehicleMake,
  bookedTime,
  workshopName = 'Verkstaden',
  workshopPhone = '08-123 456',
  onComplete,
  onClose,
}: MissingPartFlowProps) {
  const api = useApi();
  const [step, setStep]                       = useState<FlowStep>('CONFIRM');
  const [loading, setLoading]                 = useState(false);

  // Step 2 — Order
  const [supplier, setSupplier]               = useState<string | null>(null);
  const [etaOption, setEtaOption]             = useState<string | null>(null);
  const [customDate, setCustomDate]           = useState('');

  // Step 3 — Notify
  const [smsText, setSmsText]                 = useState('');
  const [editingSMS, setEditingSMS]           = useState(false);
  const [smsSent, setSmsSent]                 = useState(!!incident.customer_notified_at);

  // Step 4 — Compensate
  const [selectedCompensation, setSelectedComp] = useState<string | null>(null);

  // Step 4b — Rental
  const [rentalVehicles, setRentalVehicles]   = useState<any[]>([]);
  const [rentalLoading, setRentalLoading]     = useState(false);
  const [selectedRental, setSelectedRental]   = useState<any | null>(null);
  const [rentalSent, setRentalSent]           = useState(false);
  const [skipRental, setSkipRental]           = useState(false);

  // Step 5 — Reschedule
  const [newDate, setNewDate]                 = useState('');
  const [rescheduled, setRescheduled]         = useState(!!incident.new_appointment_at);

  // Build SMS preview whenever relevant data changes
  useEffect(() => {
    const firstName = incident.customer_name?.split(' ')[0] || 'Kund';
    const vehicleStr = vehicleMake ? `${vehicleMake} (${incident.vehicle_reg})` : incident.vehicle_reg;
    const booked = bookedTime || 'bokad tid';
    const etaStr = etaOption === 'today' ? 'idag' : etaOption === 'tomorrow' ? 'imorgon' : etaOption === 'days2_3' ? 'om 2-3 dagar' : 'inom kort';
    const compKey = selectedCompensation || suggestCompensationKey(etaOption ? etaDays(etaOption) : 1);
    const compOpt = COMPENSATION_OPTIONS.find(c => c.key === compKey);
    const compLabel = compOpt ? compOpt.label.toLowerCase() : '10% rabatt';

    const text = [
      `Hej ${firstName}! Vi behöver meddela att din ${vehicleStr} (bokad ${booked}) tyvärr försenas.`,
      `En reservdel saknas. Vi förväntar leverans ${etaStr} och kontaktar dig för att boka ny tid.`,
      `Som ursäkt erbjuder vi ${compLabel} på arbetet.`,
      `Ring oss på ${workshopPhone} om du har frågor.`,
      `— ${workshopName}`,
    ].join('\n');
    setSmsText(text);
  }, [etaOption, selectedCompensation, incident, vehicleMake, bookedTime, workshopName, workshopPhone]);

  // Pre-suggest compensation when eta is set
  useEffect(() => {
    if (etaOption && !selectedCompensation) {
      setSelectedComp(suggestCompensationKey(etaDays(etaOption)));
    }
  }, [etaOption]);

  async function handleConfirm() {
    setStep('ORDER');
  }

  async function handleOrder() {
    if (!supplier || !etaOption) return;
    setLoading(true);
    try {
      const etaISO = etaDaysToCETDate(etaOption, customDate);
      await api.post(`/api/missing-part/${incident.id}/set-eta`, {
        part_eta: etaISO,
        part_ordered_at: new Date().toISOString(),
        part_supplier: supplier,
        supplier_confirmed: false,
      });
      setStep('NOTIFY');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendSMS() {
    setLoading(true);
    try {
      await api.post(`/api/missing-part/${incident.id}/notify-customer`, {
        message_override: smsText,
        notification_method: 'SMS',
      });
      setSmsSent(true);
      setStep('COMPENSATE');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyCompensation() {
    if (!selectedCompensation) return;
    setLoading(true);
    try {
      const opt = COMPENSATION_OPTIONS.find(c => c.key === selectedCompensation);
      await api.post(`/api/missing-part/${incident.id}/apply-compensation`, {
        compensation_type: selectedCompensation,
        compensation_description: opt?.label,
      });
      setStep('RENTAL');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule() {
    if (!newDate) return;
    setLoading(true);
    try {
      await api.post(`/api/missing-part/${incident.id}/reschedule`, {
        new_appointment_at: new Date(newDate).toISOString(),
      });
      setRescheduled(true);
      setStep('FOLLOWUP');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handlePartArrived() {
    setLoading(true);
    try {
      await api.post(`/api/missing-part/${incident.id}/part-arrived`, {});
      onComplete?.();
    } finally {
      setLoading(false);
    }
  }

  // ─── Card wrapper ──────────────────────────────────────────────────────────
  function Card({ children, title }: { children: React.ReactNode; title?: string }) {
    return (
      <div style={{
        background: C.surface, borderRadius: 16, padding: '20px',
        boxShadow: shadow, marginBottom: 16,
      }}>
        {title && (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.secondary, marginBottom: 12 }}>
            {title}
          </div>
        )}
        {children}
      </div>
    );
  }

  function ActionBtn({ label, onClick, disabled, color = C.blue }: { label: string; onClick: () => void; disabled?: boolean; color?: string }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        style={{
          background: disabled || loading ? C.tertiary : color,
          color: '#FFFFFF', border: 'none', borderRadius: 12,
          padding: '14px 20px', fontSize: 15, fontWeight: 600,
          cursor: disabled || loading ? 'default' : 'pointer',
          width: '100%', marginTop: 8, letterSpacing: '-0.2px',
          transition: 'background 0.15s',
        }}
      >
        {loading ? '…' : label}
      </button>
    );
  }

  // ─── Step: CONFIRM ─────────────────────────────────────────────────────────
  if (step === 'CONFIRM') {
    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.4px' }}>
              🚨 Del saknas
            </div>
            <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>Åtgärdsplan krävs omedelbart</div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.secondary, cursor: 'pointer' }}>✕</button>
          )}
        </div>

        <Card title="Incident">
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.5px' }}>
            {vehicleMake || 'Fordon'} · {incident.vehicle_reg}
          </div>
          <div style={{ fontSize: 15, color: C.secondary, marginBottom: 12 }}>
            {bookedTime || 'Bokad tid okänd'}
            {incident.customer_name && ` · ${incident.customer_name}`}
          </div>
          <div style={{
            background: '#FFF0F0', borderRadius: 10, padding: '12px 14px',
            borderLeft: `3px solid ${C.red}`,
          }}>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginBottom: 4 }}>Del saknas</div>
            <div style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>
              {incident.part_description}
            </div>
            {incident.part_number && (
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>Artikelnr: {incident.part_number}</div>
            )}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, color: C.secondary, lineHeight: 1.6 }}>
            Detta är en <strong style={{ color: C.text }}>företagsfel</strong> — inte ett kundbekymmer.
            Vi startar åtgärdsplanen nu: beställ delen, informera kunden automatiskt, erbjud kompensation, boka ny tid.
          </div>
          <ActionBtn label="Bekräfta och starta åtgärdsplan →" onClick={handleConfirm} color={C.red} />
        </Card>
      </div>
    );
  }

  // ─── Step: ORDER ──────────────────────────────────────────────────────────
  if (step === 'ORDER') {
    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <StepIndicator current="ORDER" />
        <Card title="1. Beställ del">
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 16 }}>
            {incident.part_description}
          </div>

          <div style={{ fontSize: 12, color: C.secondary, fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
            LEVERANTÖR
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {SUPPLIERS.map(s => (
              <button
                key={s}
                onClick={() => setSupplier(s)}
                style={{
                  padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  border: supplier === s ? `2px solid ${C.blue}` : `1.5px solid ${C.border}`,
                  background: supplier === s ? '#EAF2FF' : C.surface,
                  color: supplier === s ? C.blue : C.text,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, color: C.secondary, fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
            BERÄKNAD LEVERANSTID
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ETA_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEtaOption(opt.value)}
                style={{
                  padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  border: etaOption === opt.value ? `2px solid ${C.blue}` : `1.5px solid ${C.border}`,
                  background: etaOption === opt.value ? '#EAF2FF' : C.surface,
                  color: etaOption === opt.value ? C.blue : C.text,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {etaOption === 'custom' && (
            <input
              type="datetime-local"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{
                marginTop: 12, width: '100%', padding: '12px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          )}

          <ActionBtn
            label="Bekräfta beställning →"
            onClick={handleOrder}
            disabled={!supplier || !etaOption || (etaOption === 'custom' && !customDate)}
          />
        </Card>
      </div>
    );
  }

  // ─── Step: NOTIFY ─────────────────────────────────────────────────────────
  if (step === 'NOTIFY') {
    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <StepIndicator current="NOTIFY" />
        <Card title="2. Informera kund (automatisk)">
          <div style={{ fontSize: 14, color: C.secondary, marginBottom: 12 }}>
            SMS skickas till{' '}
            <strong style={{ color: C.text }}>
              {incident.customer_name || 'kunden'}
              {incident.customer_phone ? ` (${incident.customer_phone})` : ''}
            </strong>
          </div>

          {/* SMS preview */}
          <div style={{
            background: '#F0F0F5', borderRadius: 18, padding: '16px 18px',
            fontSize: 14, lineHeight: 1.6, color: C.text,
            fontFamily: '-apple-system, sans-serif',
            border: `1px solid ${C.border}`,
            marginBottom: 14,
          }}>
            {editingSMS ? (
              <textarea
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                rows={8}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  outline: 'none', resize: 'vertical', fontSize: 14,
                  lineHeight: 1.6, color: C.text, boxSizing: 'border-box',
                }}
              />
            ) : (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>
                {smsText}
              </pre>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditingSMS(!editingSMS)}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                border: `1.5px solid ${C.border}`, background: C.surface, color: C.text,
                cursor: 'pointer',
              }}
            >
              {editingSMS ? 'Förhandsgranska' : 'Redigera'}
            </button>
            <button
              onClick={handleSendSMS}
              disabled={loading}
              style={{
                flex: 2, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                border: 'none', background: C.green, color: '#FFF',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? '…' : 'Skicka nu →'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Step: COMPENSATE ─────────────────────────────────────────────────────
  if (step === 'COMPENSATE') {
    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <StepIndicator current="COMPENSATE" />
        <Card title="3. Kompensation">
          <div style={{ fontSize: 14, color: C.secondary, marginBottom: 14 }}>
            Välj kompensation baserat på fördröjning:
          </div>

          {COMPENSATION_OPTIONS.map(opt => {
            const isSelected = selectedCompensation === opt.key;
            const isAuto = opt.key === suggestCompensationKey(etaDays(etaOption || 'tomorrow'));
            return (
              <div
                key={opt.key}
                onClick={() => setSelectedComp(opt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                  border: isSelected ? `2px solid ${C.blue}` : `1.5px solid ${C.border}`,
                  background: isSelected ? '#EAF2FF' : C.surface,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? C.blue : C.tertiary}`,
                  background: isSelected ? C.blue : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? C.blue : C.text }}>
                    {opt.label}
                    {isAuto && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700, color: C.green,
                        background: '#EAFBEF', borderRadius: 4, padding: '1px 6px',
                      }}>
                        AUTO-FÖRSLAG
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.secondary }}>{opt.sublabel}</div>
                </div>
              </div>
            );
          })}

          <ActionBtn
            label="Tillämpa kompensation →"
            onClick={handleApplyCompensation}
            disabled={!selectedCompensation}
          />
        </Card>
      </div>
    );
  }

  // ─── Step: RENTAL ─────────────────────────────────────────────────────────
  if (step === 'RENTAL') {
    // Load available vehicles on first render of this step
    if (!rentalLoading && rentalVehicles.length === 0 && !skipRental) {
      setRentalLoading(true);
      const delay = etaOption ? etaDays(etaOption) : 1;
      const pickupISO = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const returnISO = new Date(Date.now() + delay * 86400000 + 86400000).toISOString().split('T')[0];
      fetch(`https://api.bc.pixdrift.com/api/rental-partner/available?pickup=${pickupISO}&return=${returnISO}&class=COMPACT`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pixdrift_token') || ''}` },
      })
        .then(r => r.json())
        .then(d => {
          setRentalVehicles(d.vehicles || MOCK_RENTAL_VEHICLES);
          if (d.vehicles?.length > 0) setSelectedRental(d.vehicles[0]);
          else setSelectedRental(MOCK_RENTAL_VEHICLES[0]);
        })
        .catch(() => {
          setRentalVehicles(MOCK_RENTAL_VEHICLES);
          setSelectedRental(MOCK_RENTAL_VEHICLES[0]);
        })
        .finally(() => setRentalLoading(false));
    }

    const firstName = incident.customer_name?.split(' ')[0] || 'Kund';
    const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
    const rentalSMS = selectedRental
      ? `Hej ${firstName}! Vi beklagar förseningen på din ${vehicleMake || incident.vehicle_reg}. Vi har reserverat ${selectedRental.make} ${selectedRental.model} (kostnadsfritt) åt dig. Bekräfta här: https://portal.pixdrift.com/rental/${incident.id} — ${workshopName}`
      : '';

    async function handleSendRentalOffer() {
      if (!selectedRental) return;
      setLoading(true);
      try {
        await fetch('https://api.bc.pixdrift.com/api/rental-partner/offer-to-customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('pixdrift_token') || ''}`,
          },
          body: JSON.stringify({
            work_order_id: incident.id,
            missing_part_incident_id: incident.id,
            customer_name: incident.customer_name,
            customer_phone: incident.customer_phone,
            vehicle: selectedRental,
            workshop_name: workshopName,
            workshop_phone: workshopPhone,
          }),
        });
        setRentalSent(true);
        setTimeout(() => setStep('RESCHEDULE'), 1200);
      } catch {
        setRentalSent(true);
        setTimeout(() => setStep('RESCHEDULE'), 1200);
      } finally {
        setLoading(false);
      }
    }

    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <StepIndicator current="RENTAL" />
        <Card title="4. Hyrbil — erbjud kunden en bil under väntetiden">
          {rentalLoading ? (
            <div style={{ color: C.secondary, fontSize: 14, padding: '12px 0' }}>Hämtar tillgängliga bilar...</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: C.secondary, marginBottom: 14 }}>
                Preliminärt reserverat baserat på era inställningar:
              </div>

              {/* Vehicle cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {(rentalVehicles.length > 0 ? rentalVehicles : MOCK_RENTAL_VEHICLES).slice(0, 4).map(v => {
                  const isSelected = selectedRental?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedRental(v)}
                      style={{
                        padding: '14px', borderRadius: 12,
                        border: isSelected ? `2px solid ${C.blue}` : `1.5px solid ${C.border}`,
                        background: isSelected ? '#EAF2FF' : C.surface,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? C.blue : C.text }}>
                            🚗 {v.make} {v.model} {v.year}
                          </div>
                          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                            {v.provider} · {v.pickup_location || 'Centralen'}
                          </div>
                          <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                            {v.features?.join(' · ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Gratis för kunden</div>
                          <div style={{ fontSize: 11, color: C.tertiary }}>{v.daily_rate} kr/dag (verkstaden)</div>
                          <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>Hämtning: {tomorrowStr} fr. 09:00</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SMS preview */}
              {selectedRental && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: C.fill, borderLeft: `3px solid ${C.blue}`,
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.secondary, marginBottom: 6 }}>SMS-FÖRHANDSVISNING</div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{rentalSMS}</div>
                </div>
              )}

              {rentalSent ? (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#EAFBEF', color: C.green, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                  ✅ Erbjudande skickat!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ActionBtn
                    label={`Skicka erbjudande till ${incident.customer_name?.split(' ')[0] || 'kunden'} →`}
                    onClick={handleSendRentalOffer}
                    disabled={!selectedRental || loading}
                  />
                  <button
                    onClick={() => { setSkipRental(true); setStep('RESCHEDULE'); }}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 12,
                      background: 'transparent', border: `1.5px solid ${C.border}`,
                      fontSize: 13, fontWeight: 500, color: C.secondary, cursor: 'pointer',
                    }}
                  >
                    Ingen hyrbil — hoppa över
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    );
  }

  // ─── Step: RESCHEDULE ─────────────────────────────────────────────────────
  if (step === 'RESCHEDULE') {
    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <StepIndicator current="RESCHEDULE" />
        <Card title="5. Boka om">
          <div style={{ fontSize: 14, color: C.secondary, marginBottom: 16 }}>
            Boka ny tid för{' '}
            <strong style={{ color: C.text }}>{incident.customer_name || 'kunden'}</strong>
          </div>

          <input
            type="datetime-local"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 15,
              boxSizing: 'border-box', marginBottom: 8,
            }}
          />

          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 12 }}>
            ✉️ Bekräftelse-SMS skickas automatiskt till kunden
          </div>

          <ActionBtn
            label="Bekräfta ny tid → SMS skickas automatiskt"
            onClick={handleReschedule}
            disabled={!newDate}
            color={C.green}
          />
        </Card>
      </div>
    );
  }

  // ─── Step: FOLLOWUP ───────────────────────────────────────────────────────
  if (step === 'FOLLOWUP') {
    const compOpt = COMPENSATION_OPTIONS.find(c => c.key === selectedCompensation);
    return (
      <div style={{ background: C.bg, minHeight: '100%', padding: '16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.4px', marginBottom: 20 }}>
          Uppföljning
        </div>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatusRow icon="✅" label="Del beställd" sub={`Leverans ${etaOption === 'today' ? 'idag' : etaOption === 'tomorrow' ? 'imorgon' : 'inom kort'} · Leverantör: ${supplier || '—'}`} />
            <StatusRow icon="✅" label="Kund informerad" sub={`SMS skickat${smsSent ? ' ✓' : ''}`} />
            <StatusRow icon="✅" label={`${compOpt?.label || 'Kompensation'} registrerad`} sub={compOpt?.sublabel || ''} />
            {rentalSent && selectedRental && (
              <StatusRow icon="🚗" label="Hyrbil erbjuden" sub={`${selectedRental.make} ${selectedRental.model} — ${selectedRental.provider}`} />
            )}
            {rescheduled && newDate && (
              <StatusRow icon="✅" label="Ny tid bokad" sub={formatSwedishDate(new Date(newDate).toISOString())} />
            )}
            <StatusRow icon="⏳" label="Väntar på del" sub="Markera när delen anlänt till verkstaden" pending />
          </div>

          <ActionBtn
            label="✅ Markera del anländ"
            onClick={handlePartArrived}
            color={C.green}
          />

          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: '100%', marginTop: 8, padding: '12px', borderRadius: 12,
                background: 'transparent', border: `1.5px solid ${C.border}`,
                fontSize: 14, fontWeight: 500, color: C.secondary, cursor: 'pointer',
              }}
            >
              Stäng
            </button>
          )}
        </Card>
      </div>
    );
  }

  return null;
}

function StatusRow({ icon, label, sub, pending }: { icon: string; label: string; sub?: string; pending?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: pending ? '#8E8E93' : '#000' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#8E8E93' }}>{sub}</div>}
      </div>
    </div>
  );
}
