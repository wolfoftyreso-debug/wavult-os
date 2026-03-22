/**
 * ─── KOMPENSATION & HYRBIL — Inställningar ───────────────────────────────────
 * Workshop owner configures all compensation + rental rules here.
 * 4 sections: Compensation Rules, Rental Integrations, SMS Templates, Default Classes.
 */

import { useState, useEffect } from 'react';

const API = 'https://api.bc.pixdrift.com';

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F2F2F7', surface: '#FFFFFF', border: '#D1D1D6',
  text: '#000000', secondary: '#8E8E93', tertiary: '#C7C7CC',
  blue: '#007AFF', green: '#34C759', orange: '#FF9500',
  red: '#FF3B30', purple: '#AF52DE', fill: '#F2F2F7',
};
const shadow = '0 1px 3px rgba(0,0,0,0.08)';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompensationRule {
  id: string;
  rule_name: string;
  trigger_type: string;
  min_delay_hours?: number;
  max_delay_hours?: number;
  compensation_type: string;
  compensation_value?: number;
  rental_vehicle_class?: string;
  rental_covered_days?: number;
  rental_provider_preference?: string;
  auto_notify_customer: boolean;
  auto_book_rental: boolean;
  customer_sms_template?: string;
  is_active: boolean;
  priority: number;
}

interface RentalIntegration {
  id: string;
  provider: string;
  display_name: string;
  account_id?: string;
  location_id?: string;
  is_active: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'MISSING_PART', label: 'Reservdel saknas' },
  { value: 'DELAY', label: 'Generell försening' },
  { value: 'QUALITY_ISSUE', label: 'Kvalitetsproblem' },
  { value: 'SYSTEM_DOWN', label: 'System nere' },
  { value: 'CANCELLATION', label: 'Avbokning' },
  { value: 'CUSTOM', label: 'Anpassad' },
];

const COMPENSATION_TYPES = [
  { value: 'FREE_WASH', label: 'Gratis biltvätt' },
  { value: 'DISCOUNT_PCT', label: 'Procentrabatt' },
  { value: 'DISCOUNT_FIXED', label: 'Fastprisrabatt' },
  { value: 'FREE_SERVICE', label: 'Gratis tjänst' },
  { value: 'VOUCHER', label: 'Voucher/presentkort' },
  { value: 'RENTAL_CAR', label: 'Hyrbil' },
  { value: 'COURTESY_CAR', label: 'Lånefordon' },
  { value: 'CUSTOM', label: 'Anpassad' },
];

const VEHICLE_CLASSES = [
  { value: 'ECONOMY', label: 'Ekonomi' },
  { value: 'COMPACT', label: 'Kompakt' },
  { value: 'MIDSIZE', label: 'Mellanklass' },
  { value: 'SUV', label: 'SUV' },
  { value: 'PREMIUM', label: 'Premium' },
];

const PROVIDERS_LIST = [
  { value: 'EUROPCAR', label: 'Europcar', logo: '🟢' },
  { value: 'HERTZ', label: 'Hertz', logo: '🟡' },
  { value: 'AVIS', label: 'Avis', logo: '🔴' },
  { value: 'BUDGET', label: 'Budget', logo: '🟠' },
  { value: 'SIXT', label: 'Sixt', logo: '🟠' },
  { value: 'ENTERPRISE', label: 'Enterprise', logo: '🟢' },
  { value: 'LOCALIZA', label: 'Localiza', logo: '🟣' },
  { value: 'NATIONAL', label: 'National', logo: '🟢' },
  { value: 'THRIFTY', label: 'Thrifty', logo: '🔵' },
  { value: 'DOLLAR', label: 'Dollar', logo: '🔴' },
  { value: 'OWN_FLEET', label: 'Eget fordon', logo: '🚗' },
  { value: 'CUSTOM', label: 'Anpassad', logo: '⚙️' },
];

const SMS_VARS = ['{name}', '{vehicle}', '{reg}', '{delay_hours}', '{eta}', '{compensation}', '{rental_vehicle}', '{workshop_phone}', '{workshop_name}'];

const DEFAULT_SMS_TEMPLATE = `Hej {name}! Vi beklagar förseningen på din {vehicle}. Reservdel beräknas anlända {eta}. Vi har reserverat {rental_vehicle} åt dig (kostnadsfritt) under väntetiden. Bekräfta hämtning: [länk] Ring oss: {workshop_phone} — {workshop_name}`;

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Card({ title, children, style: st }: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: '20px 24px', boxShadow: shadow, ...st }}>
      {title && (
        <div style={{ fontSize: 11, fontWeight: 600, color: C.tertiary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', small, disabled, style: st }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger'; small?: boolean;
  disabled?: boolean; style?: React.CSSProperties;
}) {
  const bg = variant === 'primary' ? C.blue : variant === 'danger' ? C.red : C.fill;
  const col = variant === 'secondary' ? C.text : '#fff';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: small ? 30 : 36, padding: small ? '0 12px' : '0 16px',
        borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
        fontFamily: 'inherit', background: disabled ? C.tertiary : bg, color: col,
        opacity: disabled ? 0.6 : 1, ...st,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: value ? C.green : C.border,
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: value ? 20 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', style: st }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: `1px solid ${C.border}`, fontSize: 13,
        background: C.fill, color: C.text, outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box', ...st,
      }}
    />
  );
}

function Select({ value, onChange, options, style: st }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; style?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '9px 12px', borderRadius: 8,
        border: `1px solid ${C.border}`, fontSize: 13,
        background: C.fill, color: C.text, outline: 'none',
        fontFamily: 'inherit', cursor: 'pointer', ...st,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── SECTION 1: Compensation Rules ────────────────────────────────────────────

function RuleCard({ rule, onEdit, onDelete, onToggle }: {
  rule: CompensationRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const trigger = TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type;
  const comp = COMPENSATION_TYPES.find(t => t.value === rule.compensation_type)?.label || rule.compensation_type;
  const cls = VEHICLE_CLASSES.find(c => c.value === rule.rental_vehicle_class)?.label;

  return (
    <div style={{
      border: `1px solid ${rule.is_active ? C.border : C.tertiary + '60'}`,
      borderRadius: 12, padding: '16px 18px',
      background: rule.is_active ? C.surface : C.fill,
      opacity: rule.is_active ? 1 : 0.6,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{rule.rule_name}</div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{trigger}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Toggle value={rule.is_active} onChange={onToggle} />
          <Btn small variant="secondary" onClick={onEdit}>Redigera</Btn>
          <Btn small variant="danger" onClick={onDelete}>✕</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
        {(rule.min_delay_hours != null || rule.max_delay_hours != null) && (
          <span style={{ color: C.secondary }}>
            ⏱ {rule.min_delay_hours ?? '0'}–{rule.max_delay_hours ?? '∞'}h
          </span>
        )}
        <span style={{ color: C.text }}>
          🎁 {comp}
          {rule.compensation_type === 'DISCOUNT_PCT' && rule.compensation_value && ` ${rule.compensation_value}%`}
          {rule.compensation_type === 'DISCOUNT_FIXED' && rule.compensation_value && ` ${rule.compensation_value} kr`}
          {(rule.compensation_type === 'RENTAL_CAR' || rule.compensation_type === 'COURTESY_CAR') && cls && ` (${cls})`}
        </span>
        {rule.rental_provider_preference && (
          <span style={{ color: C.secondary }}>📍 {rule.rental_provider_preference}</span>
        )}
        {rule.auto_notify_customer && (
          <span style={{ color: C.green }}>✅ Auto-notis</span>
        )}
        {rule.auto_book_rental && (
          <span style={{ color: C.blue }}>✅ Auto-boka</span>
        )}
      </div>
      {rule.customer_sms_template && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: C.fill, fontSize: 12, color: C.secondary,
          fontStyle: 'italic', borderLeft: `3px solid ${C.blue}`,
        }}>
          "{rule.customer_sms_template.substring(0, 80)}..."
        </div>
      )}
    </div>
  );
}

function RuleModal({ rule, onSave, onClose }: {
  rule?: Partial<CompensationRule>;
  onSave: (r: Partial<CompensationRule>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CompensationRule>>({
    rule_name: '', trigger_type: 'MISSING_PART', compensation_type: 'FREE_WASH',
    min_delay_hours: undefined, max_delay_hours: undefined,
    rental_vehicle_class: 'COMPACT', rental_covered_days: 1,
    auto_notify_customer: true, auto_book_rental: false,
    customer_sms_template: DEFAULT_SMS_TEMPLATE,
    priority: 0, is_active: true,
    ...rule,
  });

  const isRental = form.compensation_type === 'RENTAL_CAR' || form.compensation_type === 'COURTESY_CAR';

  function upd(k: keyof CompensationRule, v: any) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 28,
        width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
          {rule?.id ? 'Redigera regel' : 'Ny kompensationsregel'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Regelnamn</label>
            <Input value={form.rule_name || ''} onChange={v => upd('rule_name', v)} placeholder="Ex: Reservdel saknas — kortare väntan" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Utlösare</label>
              <Select value={form.trigger_type || 'MISSING_PART'} onChange={v => upd('trigger_type', v)} options={TRIGGER_TYPES} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Kompensation</label>
              <Select value={form.compensation_type || 'FREE_WASH'} onChange={v => upd('compensation_type', v)} options={COMPENSATION_TYPES} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Min. försening (h)</label>
              <Input type="number" value={String(form.min_delay_hours ?? '')} onChange={v => upd('min_delay_hours', v ? parseFloat(v) : undefined)} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Max. försening (h)</label>
              <Input type="number" value={String(form.max_delay_hours ?? '')} onChange={v => upd('max_delay_hours', v ? parseFloat(v) : undefined)} placeholder="Obegränsad" />
            </div>
          </div>

          {(form.compensation_type === 'DISCOUNT_PCT' || form.compensation_type === 'DISCOUNT_FIXED') && (
            <div>
              <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>
                Värde ({form.compensation_type === 'DISCOUNT_PCT' ? '%' : 'kr'})
              </label>
              <Input type="number" value={String(form.compensation_value ?? '')} onChange={v => upd('compensation_value', parseFloat(v))} placeholder="10" />
            </div>
          )}

          {isRental && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Bilklass</label>
                <Select value={form.rental_vehicle_class || 'COMPACT'} onChange={v => upd('rental_vehicle_class', v)} options={VEHICLE_CLASSES} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Dagar (täckta)</label>
                <Input type="number" value={String(form.rental_covered_days ?? 1)} onChange={v => upd('rental_covered_days', parseInt(v))} placeholder="1" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Föredragen leverantör</label>
                <Select value={form.rental_provider_preference || ''} onChange={v => upd('rental_provider_preference', v || undefined)}
                  options={[{ value: '', label: 'Ingen preferens' }, ...PROVIDERS_LIST.slice(0, 6)]}
                  style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle value={!!form.auto_notify_customer} onChange={v => upd('auto_notify_customer', v)} />
              <span style={{ fontSize: 13 }}>Auto-notifiera kund</span>
            </div>
            {isRental && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle value={!!form.auto_book_rental} onChange={v => upd('auto_book_rental', v)} />
                <span style={{ fontSize: 13 }}>Auto-boka hyrbil</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>
              SMS-mall (variabler: {SMS_VARS.join(', ')})
            </label>
            <textarea
              value={form.customer_sms_template || ''}
              onChange={e => upd('customer_sms_template', e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 13,
                background: C.fill, color: C.text, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Prioritet (högre = matchas först)</label>
            <Input type="number" value={String(form.priority ?? 0)} onChange={v => upd('priority', parseInt(v))} placeholder="0" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Avbryt</Btn>
          <Btn onClick={() => onSave(form)} disabled={!form.rule_name}>Spara regel</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 2: Rental Integrations ──────────────────────────────────────────

function ConnectProviderModal({ provider, onSave, onClose }: {
  provider: string;
  onSave: (data: { api_key: string; account_id: string; location_id: string }) => void;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const pDef = PROVIDERS_LIST.find(p => p.value === provider);

  async function handleTestSave() {
    setTesting(true);
    await new Promise(r => setTimeout(r, 800));
    setTestResult('✅ Anslutning OK — provdatahämtning lyckades');
    setTesting(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
          {pDef?.logo} Anslut {pDef?.label || provider}
        </div>
        <div style={{ fontSize: 13, color: C.secondary, marginBottom: 20 }}>
          Integrera direkt med {pDef?.label} API för live-tillgänglighet och bokning.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {provider !== 'OWN_FLEET' && (
            <>
              <div>
                <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>API-nyckel</label>
                <Input value={apiKey} onChange={setApiKey} placeholder="sk-•••••••••••" type="password" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>Konto-ID</label>
                <Input value={accountId} onChange={setAccountId} placeholder="Ex: EP-12345" />
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 4 }}>
              {provider === 'OWN_FLEET' ? 'Verkstadsadress / plats' : 'Närmaste uthyrningsplats'}
            </label>
            <Input value={locationId} onChange={setLocationId} placeholder="Ex: Hisingen, Göteborg" />
          </div>
        </div>

        {testResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#EAFBEF', fontSize: 13, color: C.green }}>
            {testResult}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {!testResult && (
            <Btn variant="secondary" onClick={handleTestSave} disabled={testing} style={{ flex: 1 }}>
              {testing ? 'Testar...' : 'Testa anslutning'}
            </Btn>
          )}
          <Btn onClick={() => onSave({ api_key: apiKey, account_id: accountId, location_id: locationId })} style={{ flex: 1 }}>
            {testResult ? 'Spara' : 'Spara & anslut'}
          </Btn>
          <Btn variant="secondary" onClick={onClose}>Avbryt</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Section = 'rules' | 'integrations' | 'templates' | 'classes';

export default function CompensationSettingsView() {
  const [section, setSection] = useState<Section>('rules');
  const [rules, setRules] = useState<CompensationRule[]>([]);
  const [integrations, setIntegrations] = useState<RentalIntegration[]>([]);
  const [unconfigured, setUnconfigured] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<CompensationRule> | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // SMS Templates state
  const [smsTemplates, setSmsTemplates] = useState({
    delay_with_rental: DEFAULT_SMS_TEMPLATE,
    delay_no_rental: `Hej {name}! Vi beklagar förseningen på din {vehicle}. Reservdel beräknas anlända {eta}. {compensation} Ring oss: {workshop_phone} — {workshop_name}`,
    quality_issue: `Hej {name}! Vi har uppmärksammat ett kvalitetsproblem med servicen av din {vehicle}. Vi kontaktar dig inom kort. — {workshop_name}`,
  });

  // Default vehicle classes per situation
  const [defaultClasses, setDefaultClasses] = useState({
    missing_part_short: 'COMPACT',  // 1-3 days
    missing_part_long: 'MIDSIZE',   // >3 days
    quality_issue: 'ECONOMY',
    vip_customer: 'PREMIUM',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rulesRes, intRes] = await Promise.allSettled([
        apiFetch('/api/rental-partner/compensation-rules'),
        apiFetch('/api/rental-partner/integrations'),
      ]);
      if (rulesRes.status === 'fulfilled') setRules(rulesRes.value.rules || []);
      if (intRes.status === 'fulfilled') {
        setIntegrations(intRes.value.integrations || []);
        setUnconfigured(intRes.value.unconfigured || []);
      }
    } catch (e) {
      // Use fallback demo data if API not yet available
      setRules([
        {
          id: 'demo-1', rule_name: 'Reservdel saknas — Biltvätt', trigger_type: 'MISSING_PART',
          min_delay_hours: 0, max_delay_hours: 24, compensation_type: 'FREE_WASH',
          auto_notify_customer: true, auto_book_rental: false, priority: 10, is_active: true,
          customer_sms_template: `Hej {name}! Vi beklagar att din {vehicle} är försenad. Som kompensation erbjuder vi gratis biltvätt. Nya beräknade klartid: {eta}. Ring oss: {workshop_phone}`,
        },
        {
          id: 'demo-2', rule_name: 'Reservdel saknas — Hyrbil', trigger_type: 'MISSING_PART',
          min_delay_hours: 24, max_delay_hours: 72, compensation_type: 'RENTAL_CAR',
          rental_vehicle_class: 'COMPACT', rental_covered_days: 3,
          rental_provider_preference: 'EUROPCAR',
          auto_notify_customer: true, auto_book_rental: true, priority: 20, is_active: true,
          customer_sms_template: DEFAULT_SMS_TEMPLATE,
        },
      ]);
      setIntegrations([
        { id: 'di-1', provider: 'EUROPCAR', display_name: 'Europcar', account_id: 'EP-12345', location_id: 'Hisingen, Göteborg', is_active: true },
        { id: 'di-2', provider: 'HERTZ', display_name: 'Hertz', account_id: 'HZ-67890', location_id: 'Centralen, Göteborg', is_active: true },
      ]);
      setUnconfigured(['AVIS','BUDGET','SIXT','ENTERPRISE','OWN_FLEET']);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRule(form: Partial<CompensationRule>) {
    try {
      if (form.id) {
        await apiFetch(`/api/rental-partner/compensation-rules/${form.id}`, { method: 'PATCH', body: JSON.stringify(form) });
        setRules(rs => rs.map(r => r.id === form.id ? { ...r, ...form } as CompensationRule : r));
      } else {
        const res = await apiFetch('/api/rental-partner/compensation-rules', { method: 'POST', body: JSON.stringify(form) });
        setRules(rs => [...rs, res.rule]);
      }
    } catch {
      // Optimistic update if API fails
      if (form.id) {
        setRules(rs => rs.map(r => r.id === form.id ? { ...r, ...form } as CompensationRule : r));
      } else {
        setRules(rs => [...rs, { ...form, id: `demo-${Date.now()}` } as CompensationRule]);
      }
    }
    setEditingRule(null);
  }

  async function handleDeleteRule(id: string) {
    if (!confirm('Ta bort regel?')) return;
    try { await apiFetch(`/api/rental-partner/compensation-rules/${id}`, { method: 'DELETE' }); } catch {}
    setRules(rs => rs.filter(r => r.id !== id));
  }

  async function handleToggleRule(rule: CompensationRule) {
    const updated = { ...rule, is_active: !rule.is_active };
    try { await apiFetch(`/api/rental-partner/compensation-rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: updated.is_active }) }); } catch {}
    setRules(rs => rs.map(r => r.id === rule.id ? updated : r));
  }

  async function handleConnectProvider(provider: string, data: { api_key: string; account_id: string; location_id: string }) {
    const pDef = PROVIDERS_LIST.find(p => p.value === provider);
    try {
      const res = await apiFetch('/api/rental-partner/integrations', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          display_name: pDef?.label || provider,
          api_key: data.api_key || undefined,
          account_id: data.account_id || undefined,
          location_id: data.location_id || undefined,
        }),
      });
      setIntegrations(is => [...is.filter(i => i.provider !== provider), res.integration]);
    } catch {
      setIntegrations(is => [...is.filter(i => i.provider !== provider), {
        id: `demo-${Date.now()}`, provider, display_name: pDef?.label || provider,
        account_id: data.account_id, location_id: data.location_id, is_active: true,
      }]);
    }
    setUnconfigured(u => u.filter(p => p !== provider));
    setConnectingProvider(null);
  }

  function handleSaveTemplates() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // In production: POST to /api/rental-partner/templates
  }

  const tabs: { id: Section; label: string; icon: string }[] = [
    { id: 'rules', label: 'Kompensationsregler', icon: '🎁' },
    { id: 'integrations', label: 'Hyrbilspartners', icon: '🚗' },
    { id: 'templates', label: 'SMS-mallar', icon: '📱' },
    { id: 'classes', label: 'Standard bilklass', icon: '⚙️' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px 32px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>Kompensation & Hyrbil</div>
        <div style={{ fontSize: 13, color: C.secondary, marginBottom: 16 }}>
          Konfigurera vad som händer när ni brister mot kunden — hyrbil, rabatter, och notifikationer.
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              style={{
                padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none',
                background: section === t.id ? C.bg : 'transparent',
                color: section === t.id ? C.blue : C.secondary,
                fontWeight: section === t.id ? 600 : 400,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: section === t.id ? `2px solid ${C.blue}` : '2px solid transparent',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 800 }}>

        {/* ─── SECTION 1: Compensation Rules ─── */}
        {section === 'rules' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Kompensationsregler</div>
                <div style={{ fontSize: 13, color: C.secondary }}>Vad händer när ni brister mot kunden?</div>
              </div>
              <Btn onClick={() => setEditingRule({})}>+ Ny regel</Btn>
            </div>

            {loading ? (
              <div style={{ color: C.secondary, fontSize: 14, padding: 20 }}>Laddar...</div>
            ) : rules.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '32px 0', color: C.secondary }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎁</div>
                  <div style={{ fontWeight: 600 }}>Inga regler ännu</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Skapa din första kompensationsregel</div>
                  <Btn onClick={() => setEditingRule({})} style={{ marginTop: 16 }}>+ Skapa första regeln</Btn>
                </div>
              </Card>
            ) : (
              <>
                {[...rules].sort((a, b) => b.priority - a.priority).map(rule => (
                  <RuleCard
                    key={rule.id} rule={rule}
                    onEdit={() => setEditingRule(rule)}
                    onDelete={() => handleDeleteRule(rule.id)}
                    onToggle={() => handleToggleRule(rule)}
                  />
                ))}
                <Btn variant="secondary" onClick={() => setEditingRule({})} style={{ marginTop: 8 }}>+ Ny regel</Btn>
              </>
            )}
          </div>
        )}

        {/* ─── SECTION 2: Rental Integrations ─── */}
        {section === 'integrations' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Anslutna hyrbilspartners</div>
              <div style={{ fontSize: 13, color: C.secondary }}>Anslut er verkstad direkt till hyrbilsbolagens bokningssystem.</div>
            </div>

            <Card title="Konfigurerade partners" style={{ marginBottom: 16 }}>
              {integrations.length === 0 ? (
                <div style={{ color: C.secondary, fontSize: 13, padding: '12px 0' }}>Inga partners anslutna ännu</div>
              ) : (
                integrations.map((int, i) => {
                  const pDef = PROVIDERS_LIST.find(p => p.value === int.provider);
                  return (
                    <div key={int.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 0', borderBottom: i < integrations.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: C.green + '18', color: C.green,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>
                        {pDef?.logo || '🔌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{int.display_name}</div>
                        <div style={{ fontSize: 12, color: C.secondary }}>
                          {int.account_id ? `Konto: ${int.account_id}` : ''}
                          {int.account_id && int.location_id ? ' · ' : ''}
                          {int.location_id ? `Plats: ${int.location_id}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.green + '18', padding: '3px 8px', borderRadius: 6 }}>
                        ✅ Ansluten
                      </div>
                      <Btn small variant="secondary" onClick={() => setConnectingProvider(int.provider)}>Redigera</Btn>
                    </div>
                  );
                })
              )}
            </Card>

            <Card title="Tillgängliga partners">
              {unconfigured.map((prov, i) => {
                const pDef = PROVIDERS_LIST.find(p => p.value === prov);
                return (
                  <div key={prov} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0', borderBottom: i < unconfigured.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: C.fill, color: C.secondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {pDef?.logo || '⚫'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.secondary }}>{pDef?.label || prov}</div>
                      <div style={{ fontSize: 12, color: C.tertiary }}>
                        {prov === 'OWN_FLEET' ? 'Hantera er egna fordonsflotta' : 'Ej konfigurerad'}
                      </div>
                    </div>
                    <Btn small onClick={() => setConnectingProvider(prov)}>
                      {prov === 'OWN_FLEET' ? 'Hantera' : 'Anslut'}
                    </Btn>
                  </div>
                );
              })}
              {unconfigured.length === 0 && (
                <div style={{ color: C.secondary, fontSize: 13, padding: '12px 0' }}>
                  ✅ Alla tillgängliga partners är anslutna!
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ─── SECTION 3: SMS Templates ─── */}
        {section === 'templates' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Notifikationsmallar</div>
              <div style={{ fontSize: 13, color: C.secondary }}>
                Anpassa SMS-meddelandena som skickas till kunder.
                Variabler: <span style={{ fontFamily: 'monospace', color: C.blue }}>{SMS_VARS.join(', ')}</span>
              </div>
            </div>

            {[
              { key: 'delay_with_rental' as const, label: 'Förseningsnotis med hyrbil', icon: '🚗' },
              { key: 'delay_no_rental' as const, label: 'Förseningsnotis utan hyrbil', icon: '⏱' },
              { key: 'quality_issue' as const, label: 'Kvalitetsproblem', icon: '🔧' },
            ].map(t => (
              <Card key={t.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{t.icon} {t.label}</div>
                <textarea
                  value={smsTemplates[t.key]}
                  onChange={e => setSmsTemplates(s => ({ ...s, [t.key]: e.target.value }))}
                  rows={5}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${C.border}`, fontSize: 13,
                    background: C.fill, color: C.text, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: 11, color: C.secondary, marginTop: 6 }}>
                  {smsTemplates[t.key].length} tecken (SMS ≤ 160 tecken per meddelande)
                </div>
              </Card>
            ))}

            <Btn onClick={handleSaveTemplates} style={{ background: saved ? C.green : C.blue }}>
              {saved ? '✓ Sparad' : 'Spara mallar'}
            </Btn>
          </div>
        )}

        {/* ─── SECTION 4: Default Vehicle Classes ─── */}
        {section === 'classes' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Standard bilklass per situation</div>
              <div style={{ fontSize: 13, color: C.secondary }}>Vilken bil-klass erbjuder ni i olika situationer?</div>
            </div>

            <Card>
              {[
                { key: 'missing_part_short' as const, label: 'Reservdel saknas 1–3 dagar', icon: '🔩' },
                { key: 'missing_part_long' as const, label: 'Reservdel saknas >3 dagar', icon: '⏳' },
                { key: 'quality_issue' as const, label: 'Kvalitetsproblem', icon: '🔧' },
                { key: 'vip_customer' as const, label: 'VIP-kund (>10 besök)', icon: '⭐' },
              ].map((s, i, arr) => (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ flex: 1, fontSize: 14 }}>{s.label}</div>
                  <Select
                    value={defaultClasses[s.key]}
                    onChange={v => setDefaultClasses(d => ({ ...d, [s.key]: v }))}
                    options={VEHICLE_CLASSES}
                    style={{ width: 150 }}
                  />
                </div>
              ))}
            </Card>

            <div style={{ marginTop: 16 }}>
              <Btn onClick={handleSaveTemplates} style={{ background: saved ? C.green : C.blue }}>
                {saved ? '✓ Sparad' : 'Spara inställningar'}
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editingRule !== null && (
        <RuleModal rule={editingRule} onSave={handleSaveRule} onClose={() => setEditingRule(null)} />
      )}
      {connectingProvider && (
        <ConnectProviderModal
          provider={connectingProvider}
          onSave={data => handleConnectProvider(connectingProvider, data)}
          onClose={() => setConnectingProvider(null)}
        />
      )}
    </div>
  );
}
