/**
 * DamageModule.tsx — pixdrift Automotive
 * Skadehantering: 5 vyer för det kompletta bilskadeflödet
 *
 * Vy 1: Pipeline (Kanban)
 * Vy 2: Nytt skadeärende
 * Vy 3: Cabas-kalkyl
 * Vy 4: Försäkringskommunikation
 * Vy 5: Besiktningsprotokoll
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from './useApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type DamageType = 'COLLISION' | 'FIRE' | 'THEFT' | 'WEATHER' | 'VANDALISM' | 'GLASS' | 'ANIMAL' | 'OTHER';
type ClaimStatus = 'REPORTED' | 'ASSESSED' | 'CABAS_SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REPAIR_STARTED' | 'REPAIR_DONE' | 'INSPECTION' | 'DELIVERED' | 'CLOSED';
type InspectionType = 'PRE_REPAIR' | 'POST_REPAIR' | 'QUALITY_CONTROL';

interface DamageClaim {
  id: string;
  claim_number: string;
  customer_id?: string;
  vehicle_vin?: string;
  vehicle_reg?: string;
  damage_type: DamageType;
  damage_description?: string;
  damage_areas: string[];
  photo_urls: string[];
  insurance_company?: string;
  insurance_company_code?: string;
  insurance_claim_number?: string;
  status: ClaimStatus;
  cabas_estimate_id?: string;
  cabas_estimate_amount?: number;
  cabas_approved_amount?: number;
  adjuster_name?: string;
  rejection_reason?: string;
  reported_at: string;
  approved_at?: string;
  delivered_at?: string;
}

interface InsuranceCompany {
  name: string;
  code: string;
  api_type: string;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_COLUMNS: { status: ClaimStatus; label: string; color: string }[] = [
  { status: 'REPORTED',        label: 'Anmäld',         color: '#636366' },
  { status: 'ASSESSED',        label: 'Bedömd',          color: '#0a84ff' },
  { status: 'CABAS_SUBMITTED', label: 'Hos försäkring',  color: '#ff9500' },
  { status: 'APPROVED',        label: 'Godkänd',         color: '#34c759' },
  { status: 'REPAIR_STARTED',  label: 'Reparation',      color: '#5ac8fa' },
  { status: 'INSPECTION',      label: 'Besiktning',      color: '#bf5af2' },
  { status: 'DELIVERED',       label: 'Levererad',       color: '#32d74b' },
];

const DAMAGE_TYPES: { type: DamageType; icon: string; label: string }[] = [
  { type: 'COLLISION',  icon: '💥', label: 'Kollision'  },
  { type: 'GLASS',      icon: '🪟', label: 'Glasskada'  },
  { type: 'WEATHER',    icon: '🌨️', label: 'Väder'      },
  { type: 'FIRE',       icon: '🔥', label: 'Brand'      },
  { type: 'THEFT',      icon: '🔓', label: 'Stöld'      },
  { type: 'VANDALISM',  icon: '🎭', label: 'Vandalism'  },
  { type: 'ANIMAL',     icon: '🦌', label: 'Viltolycka' },
  { type: 'OTHER',      icon: '❓', label: 'Övrigt'     },
];

const STATUS_LABELS: Record<ClaimStatus, string> = {
  REPORTED:        'Anmäld',
  ASSESSED:        'Bedömd',
  CABAS_SUBMITTED: 'Hos försäkring',
  APPROVED:        'Godkänd',
  REJECTED:        'Avvisad',
  REPAIR_STARTED:  'Reparation pågår',
  REPAIR_DONE:     'Reparation klar',
  INSPECTION:      'Besiktning',
  DELIVERED:       'Levererad',
  CLOSED:          'Stängt',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSEK(amount: number | undefined): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Badge: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  const colors: Partial<Record<ClaimStatus, string>> = {
    REPORTED:        '#636366',
    ASSESSED:        '#0a84ff',
    CABAS_SUBMITTED: '#ff9500',
    APPROVED:        '#34c759',
    REJECTED:        '#ff3b30',
    REPAIR_STARTED:  '#5ac8fa',
    REPAIR_DONE:     '#5ac8fa',
    INSPECTION:      '#bf5af2',
    DELIVERED:       '#32d74b',
    CLOSED:          '#3a3a3c',
  };
  const color = colors[status] ?? '#636366';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      background: `${color}22`,
      color,
      border: `0.5px solid ${color}44`,
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
};

// ─── View 1: Pipeline (Kanban) ────────────────────────────────────────────────

const PipelineView: React.FC<{
  claims: DamageClaim[];
  onSelect: (claim: DamageClaim) => void;
  onNew: () => void;
}> = ({ claims, onSelect, onNew }) => {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', padding: '4px 2px' }}>
        {PIPELINE_COLUMNS.map(col => {
          const colClaims = claims.filter(c => c.status === col.status);
          return (
            <div key={col.status} style={{ width: 240, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,245,247,0.7)' }}>{col.label}</span>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', background: 'rgba(255,255,255,0.06)', padding: '1px 8px', borderRadius: 10 }}>
                  {colClaims.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colClaims.map(claim => (
                  <div
                    key={claim.id}
                    onClick={() => onSelect(claim)}
                    style={{
                      background: '#111118',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'border-color .15s',
                      borderLeft: `3px solid ${col.color}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  >
                    <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', marginBottom: 4 }}>{claim.claim_number}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: 'rgba(245,245,247,0.9)' }}>
                      {claim.vehicle_reg || claim.vehicle_vin || 'Okänt fordon'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.5)', marginBottom: 6 }}>
                      {DAMAGE_TYPES.find(d => d.type === claim.damage_type)?.icon} {' '}
                      {DAMAGE_TYPES.find(d => d.type === claim.damage_type)?.label}
                    </div>
                    {claim.insurance_company && (
                      <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)' }}>🛡️ {claim.insurance_company}</div>
                    )}
                    {claim.cabas_approved_amount && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#34c759', marginTop: 6 }}>
                        {formatSEK(claim.cabas_approved_amount)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', marginTop: 6 }}>
                      {formatDate(claim.reported_at)}
                    </div>
                  </div>
                ))}
                {col.status === 'REPORTED' && (
                  <div
                    onClick={onNew}
                    style={{
                      border: '1px dashed rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'rgba(245,245,247,0.3)',
                      textAlign: 'center',
                      transition: 'color .15s, border-color .15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'rgba(245,245,247,0.6)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'rgba(245,245,247,0.3)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                    }}
                  >
                    + Nytt ärende
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── View 2: New Claim Form ───────────────────────────────────────────────────

const NewClaimForm: React.FC<{
  insurers: InsuranceCompany[];
  onSubmit: (data: Partial<DamageClaim>) => Promise<void>;
  onCancel: () => void;
}> = ({ insurers, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    vehicle_reg: '',
    vehicle_vin: '',
    damage_type: '' as DamageType | '',
    damage_description: '',
    insurance_company_code: '',
    insurance_claim_number: '',
    photo_urls: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.damage_type) return alert('Välj skadetyp');
    setLoading(true);
    const insurer = insurers.find(i => i.code === form.insurance_company_code);
    await onSubmit({
      ...form,
      damage_type: form.damage_type as DamageType,
      insurance_company: insurer?.name,
    });
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28 }}>Nytt skadeärende</h2>
      <form onSubmit={handleSubmit}>
        {/* Vehicle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <label style={labelStyle}>
            <span>Reg.nr</span>
            <input style={inputStyle} placeholder="ABC123" value={form.vehicle_reg} onChange={e => set('vehicle_reg', e.target.value.toUpperCase())} />
          </label>
          <label style={labelStyle}>
            <span>VIN</span>
            <input style={inputStyle} placeholder="YV1RS61T..." value={form.vehicle_vin} onChange={e => set('vehicle_vin', e.target.value.toUpperCase())} />
          </label>
        </div>

        {/* Damage type grid */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'rgba(245,245,247,0.6)', marginBottom: 10, fontWeight: 500 }}>Skadetyp *</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {DAMAGE_TYPES.map(dt => (
              <div
                key={dt.type}
                onClick={() => set('damage_type', dt.type)}
                style={{
                  background: form.damage_type === dt.type ? 'rgba(10,132,255,0.15)' : '#111118',
                  border: `0.5px solid ${form.damage_type === dt.type ? '#0a84ff' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10,
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{dt.icon}</div>
                <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.7)' }}>{dt.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <label style={{ ...labelStyle, marginBottom: 20 }}>
          <span>Skadebeskrivning</span>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            placeholder="Beskriv skadan..."
            value={form.damage_description}
            onChange={e => set('damage_description', e.target.value)}
          />
        </label>

        {/* Insurance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          <label style={labelStyle}>
            <span>Försäkringsbolag</span>
            <select style={inputStyle} value={form.insurance_company_code} onChange={e => set('insurance_company_code', e.target.value)}>
              <option value="">Välj försäkringsbolag</option>
              {insurers.map(i => (
                <option key={i.code} value={i.code}>
                  {i.name} {i.status === 'supported' ? '✓' : '(manuell)'}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span>Ärendenummer (försäkring)</span>
            <input style={inputStyle} placeholder="Lämna tomt om okänt" value={form.insurance_claim_number} onChange={e => set('insurance_claim_number', e.target.value)} />
          </label>
        </div>

        {/* Photos placeholder */}
        <div style={{ border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
          <div style={{ fontSize: 14, color: 'rgba(245,245,247,0.5)' }}>Dra och släpp foton, eller klicka för att ladda upp</div>
          <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', marginTop: 4 }}>JPG, PNG, HEIC — max 20 MB per fil</div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Sparar...' : 'Skapa ärende'}</button>
          <button type="button" onClick={onCancel} style={btnSecondary}>Avbryt</button>
        </div>
      </form>
    </div>
  );
};

// ─── View 3: Cabas Estimate ──────────────────────────────────────────────────

const CabasView: React.FC<{
  claim: DamageClaim;
  onSend: () => void;
}> = ({ claim, onSend }) => {
  const [labor, setLabor] = useState(0);
  const [parts, setParts] = useState(0);
  const [paint, setPaint] = useState(0);
  const [sending, setSending] = useState(false);

  const totalExVat = labor + parts + paint;
  const totalInVat = totalExVat * 1.25;

  const statusColor = {
    DRAFT:        '#636366',
    SUBMITTED:    '#ff9500',
    APPROVED:     '#34c759',
    REJECTED:     '#ff3b30',
    SUPPLEMENTED: '#bf5af2',
  };

  const cabasStatus = claim.cabas_estimate_id
    ? (claim.status === 'APPROVED' ? 'APPROVED' : claim.status === 'CABAS_SUBMITTED' ? 'SUBMITTED' : 'DRAFT')
    : 'DRAFT';

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Cabas-kalkyl</h2>
        <div style={{
          padding: '4px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: `${(statusColor as Record<string, string>)[cabasStatus] ?? '#636366'}22`,
          color: (statusColor as Record<string, string>)[cabasStatus] ?? '#636366',
        }}>
          {cabasStatus === 'DRAFT' ? 'Ej skickad' : cabasStatus === 'SUBMITTED' ? '⏳ Väntar godkännande' : cabasStatus === 'APPROVED' ? '✓ Godkänd' : '✗ Avvisad'}
        </div>
      </div>

      <div style={{ background: '#111118', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,245,247,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Fordon</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: 'Reg.nr', value: claim.vehicle_reg || '—' },
            { label: 'VIN', value: claim.vehicle_vin || '—' },
            { label: 'Ärendenr', value: claim.claim_number },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost inputs */}
      <div style={{ background: '#111118', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,245,247,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Kalkyl (SEK exkl. moms)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Arbete', value: labor, setter: setLabor, icon: '🔧' },
            { label: 'Reservdelar', value: parts, setter: setParts, icon: '⚙️' },
            { label: 'Lack', value: paint, setter: setPaint, icon: '🎨' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 16, width: 24 }}>{row.icon}</span>
              <span style={{ width: 100, fontSize: 14, color: 'rgba(245,245,247,0.7)' }}>{row.label}</span>
              <input
                type="number"
                min={0}
                step={100}
                value={row.value}
                onChange={e => row.setter(Number(e.target.value))}
                style={{ ...inputStyle, width: 140, textAlign: 'right' }}
              />
              <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)' }}>SEK</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, color: 'rgba(245,245,247,0.6)' }}>Totalt exkl. moms</span>
            <span style={{ fontSize: 14 }}>{formatSEK(totalExVat)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Totalt inkl. 25% moms</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#34c759' }}>{formatSEK(totalInVat)}</span>
          </div>
        </div>
      </div>

      {claim.insurance_company && (
        <div style={{ background: 'rgba(10,132,255,0.08)', border: '0.5px solid rgba(10,132,255,0.25)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14 }}>🛡️ <strong>{claim.insurance_company}</strong> — kalkyl skickas direkt via Cabas-integration</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => { setSending(true); onSend(); setSending(false); }}
          disabled={sending || cabasStatus === 'SUBMITTED' || cabasStatus === 'APPROVED'}
          style={btnPrimary}
        >
          {sending ? 'Skickar...' : '📤 Skicka till försäkring'}
        </button>
        <button style={btnSecondary}>💾 Spara kalkyl</button>
        <button style={btnSecondary}>📄 Exportera XML</button>
      </div>
    </div>
  );
};

// ─── View 4: Insurance Communication ─────────────────────────────────────────

const InsuranceView: React.FC<{ claim: DamageClaim }> = ({ claim }) => {
  const timeline = [
    { time: claim.reported_at,   icon: '📋', label: 'Skadeärende skapat',    color: '#636366', detail: claim.claim_number },
    claim.status !== 'REPORTED' ? { time: claim.reported_at, icon: '🔍', label: 'Skadebedömning genomförd', color: '#0a84ff', detail: '' } : null,
    claim.cabas_estimate_id ? { time: claim.reported_at, icon: '📊', label: 'Cabas-kalkyl skapad och skickad', color: '#ff9500', detail: `Kalkyl: ${formatSEK(claim.cabas_estimate_amount)}` } : null,
    claim.approved_at ? { time: claim.approved_at, icon: '✅', label: 'Försäkringsgodkännande mottaget', color: '#34c759', detail: `Godkänt: ${formatSEK(claim.cabas_approved_amount)} · ${claim.adjuster_name || ''}` } : null,
    claim.rejection_reason ? { time: '', icon: '❌', label: 'Avvisat av försäkringsbolag', color: '#ff3b30', detail: claim.rejection_reason } : null,
    claim.delivered_at ? { time: claim.delivered_at, icon: '🚗', label: 'Fordon levererat', color: '#32d74b', detail: '' } : null,
  ].filter(Boolean) as { time: string; icon: string; label: string; color: string; detail: string }[];

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Försäkringskommunikation</h2>

      <div style={{ background: '#111118', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Försäkringsbolag', value: claim.insurance_company || '—' },
            { label: 'Ärendenummer', value: claim.claim_number },
            { label: 'Försäkringsärende', value: claim.insurance_claim_number || '—' },
            { label: 'Handläggare', value: claim.adjuster_name || '—' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{ position: 'absolute', left: 10, top: 12, bottom: 12, width: 1, background: 'rgba(255,255,255,0.06)' }} />
        {timeline.map((item, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 20, paddingLeft: 28 }}>
            <div style={{
              position: 'absolute', left: -10, top: 2,
              width: 20, height: 20, borderRadius: '50%',
              background: `${item.color}22`, border: `2px solid ${item.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10,
            }}>
              {item.icon}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(245,245,247,0.9)' }}>{item.label}</div>
            {item.detail && <div style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', marginTop: 2 }}>{item.detail}</div>}
            {item.time && <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', marginTop: 2 }}>{formatDate(item.time)}</div>}
          </div>
        ))}
      </div>

      {claim.rejection_reason && (
        <div style={{ background: 'rgba(255,59,48,0.08)', border: '0.5px solid rgba(255,59,48,0.25)', borderRadius: 12, padding: 16, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ff3b30', marginBottom: 6 }}>Avvisningsorsak</div>
          <div style={{ fontSize: 14, color: 'rgba(245,245,247,0.7)' }}>{claim.rejection_reason}</div>
          <button style={{ ...btnPrimary, marginTop: 12, fontSize: 13 }}>Skicka tilläggsarbete</button>
        </div>
      )}
    </div>
  );
};

// ─── View 5: Inspection Protocol ─────────────────────────────────────────────

const InspectionView: React.FC<{
  claim: DamageClaim;
  onSubmit: (data: { inspection_type: InspectionType; result: string; notes: string }) => Promise<void>;
}> = ({ claim, onSubmit }) => {
  const [inspType, setInspType] = useState<InspectionType>('POST_REPAIR');
  const [result, setResult] = useState<'PASSED' | 'FAILED' | 'CONDITIONAL'>('PASSED');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const checklist = [
    { id: 'paint_match',   label: 'Lackfärg matchar original' },
    { id: 'panel_align',   label: 'Panelpassning korrekt' },
    { id: 'gaps',          label: 'Glapp och avstånd OK' },
    { id: 'no_scratches',  label: 'Inga repor eller märken' },
    { id: 'glass_clean',   label: 'Glas utan skador/sprickor' },
    { id: 'lights',        label: 'Belysning fungerar' },
    { id: 'no_leaks',      label: 'Inga läckage' },
    { id: 'interior',      label: 'Interiör utan skador' },
  ];

  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(checklist.map(c => [c.id, false]))
  );

  const allPassed = Object.values(checked).every(Boolean);

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Besiktningsprotokoll</h2>

      {/* Inspection type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([
          ['PRE_REPAIR',      '📸 Pre-repair'],
          ['POST_REPAIR',     '✅ Post-repair'],
          ['QUALITY_CONTROL', '🔍 Kvalitetskontroll'],
        ] as [InspectionType, string][]).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setInspType(type)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: `0.5px solid ${inspType === type ? '#0a84ff' : 'rgba(255,255,255,0.08)'}`,
              background: inspType === type ? 'rgba(10,132,255,0.15)' : '#111118',
              color: inspType === type ? '#0a84ff' : 'rgba(245,245,247,0.6)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Checklist */}
      <div style={{ background: '#111118', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,245,247,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Kontrollpunkter</div>
        {checklist.map(item => (
          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
            <input
              type="checkbox"
              checked={checked[item.id]}
              onChange={e => setChecked(c => ({ ...c, [item.id]: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: '#34c759', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, color: checked[item.id] ? 'rgba(245,245,247,0.8)' : 'rgba(245,245,247,0.5)' }}>
              {item.label}
            </span>
            {checked[item.id] && <span style={{ marginLeft: 'auto', color: '#34c759', fontSize: 12 }}>✓</span>}
          </label>
        ))}
      </div>

      {/* Result */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['PASSED', 'CONDITIONAL', 'FAILED'] as const).map(r => (
          <button
            key={r}
            onClick={() => setResult(r)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: `0.5px solid ${result === r
                ? r === 'PASSED' ? '#34c759' : r === 'FAILED' ? '#ff3b30' : '#ff9500'
                : 'rgba(255,255,255,0.08)'}`,
              background: result === r
                ? r === 'PASSED' ? 'rgba(52,199,89,0.15)' : r === 'FAILED' ? 'rgba(255,59,48,0.15)' : 'rgba(255,149,0,0.15)'
                : '#111118',
              color: result === r
                ? r === 'PASSED' ? '#34c759' : r === 'FAILED' ? '#ff3b30' : '#ff9500'
                : 'rgba(245,245,247,0.5)',
              cursor: 'pointer',
            }}
          >
            {r === 'PASSED' ? '✓ Godkänd' : r === 'FAILED' ? '✗ Underkänd' : '⚠ Villkorlig'}
          </button>
        ))}
      </div>

      <label style={{ ...labelStyle, marginBottom: 20 }}>
        <span>Anteckningar</span>
        <textarea
          style={{ ...inputStyle, minHeight: 80 }}
          placeholder="Eventuella anmärkningar..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </label>

      {/* Photo upload placeholder */}
      <div style={{ border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)' }}>📸 Ladda upp besiktningsfoton</span>
      </div>

      {/* Signature placeholder */}
      <div style={{ background: '#111118', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)', marginBottom: 8 }}>✍️ Digital signatur</div>
        <div style={{ height: 60, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8 }} />
      </div>

      <button
        onClick={async () => {
          setLoading(true);
          await onSubmit({ inspection_type: inspType, result, notes });
          setLoading(false);
        }}
        disabled={loading}
        style={btnPrimary}
      >
        {loading ? 'Sparar...' : '📋 Signera & spara protokoll'}
      </button>
    </div>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: 'rgba(245,245,247,0.6)',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  background: '#1a1a24',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '10px 14px',
  color: 'rgba(245,245,247,0.9)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
};

const btnPrimary: React.CSSProperties = {
  background: '#0a84ff',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '12px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: '#1a1a24',
  color: 'rgba(245,245,247,0.8)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '12px 24px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

// ─── Main DamageModule ────────────────────────────────────────────────────────

type View = 'pipeline' | 'new' | 'cabas' | 'insurance' | 'inspection';

const DamageModule: React.FC = () => {
  const [view, setView] = useState<View>('pipeline');
  const [claims, setClaims] = useState<DamageClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<DamageClaim | null>(null);
  const [insurers, setInsurers] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = 'demo-org'; // TODO: hämta från auth-kontext

  const loadClaims = useCallback(async () => {
    try {
      const data = await apiClient.get<{ claims: DamageClaim[] }>(`/api/damage/claims?org_id=${orgId}`);
      setClaims(data.claims ?? []);
    } catch {
      // Demo data när API inte svarar
      setClaims([
        {
          id: '1', claim_number: 'SKA-2026-847251', vehicle_reg: 'ABC 123',
          damage_type: 'COLLISION', status: 'CABAS_SUBMITTED',
          insurance_company: 'If Skadeförsäkring', insurance_company_code: 'IF',
          cabas_estimate_amount: 42500, reported_at: '2026-03-18T10:00:00Z',
          damage_areas: [], photo_urls: [],
        },
        {
          id: '2', claim_number: 'SKA-2026-391847', vehicle_reg: 'DEF 456',
          damage_type: 'GLASS', status: 'APPROVED',
          insurance_company: 'Trygg-Hansa', insurance_company_code: 'TH',
          cabas_estimate_amount: 8900, cabas_approved_amount: 8900,
          adjuster_name: 'Maria Lindqvist',
          reported_at: '2026-03-15T14:30:00Z', approved_at: '2026-03-17T09:00:00Z',
          damage_areas: [], photo_urls: [],
        },
        {
          id: '3', claim_number: 'SKA-2026-174920', vehicle_reg: 'GHI 789',
          damage_type: 'WEATHER', status: 'REPAIR_STARTED',
          insurance_company: 'Länsförsäkringar', insurance_company_code: 'LF',
          cabas_estimate_amount: 31200, cabas_approved_amount: 31200,
          reported_at: '2026-03-10T08:00:00Z', approved_at: '2026-03-12T11:00:00Z',
          damage_areas: [], photo_urls: [],
        },
        {
          id: '4', claim_number: 'SKA-2026-029384', vehicle_reg: 'JKL 012',
          damage_type: 'VANDALISM', status: 'REPORTED',
          reported_at: '2026-03-21T16:00:00Z',
          damage_areas: [], photo_urls: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadInsurers = useCallback(async () => {
    try {
      const data = await apiClient.get<InsuranceCompany[]>('/api/damage/insurance-companies');
      setInsurers(data);
    } catch {
      setInsurers([
        { name: 'If Skadeförsäkring',   code: 'IF', api_type: 'cabas_direct', status: 'supported' },
        { name: 'Trygg-Hansa',          code: 'TH', api_type: 'cabas_direct', status: 'supported' },
        { name: 'Länsförsäkringar',     code: 'LF', api_type: 'cabas_direct', status: 'supported' },
        { name: 'Gjensidige',           code: 'GJ', api_type: 'cabas_direct', status: 'supported' },
        { name: 'Folksam',              code: 'FS', api_type: 'manual',        status: 'manual_process' },
        { name: 'Moderna Försäkringar', code: 'MF', api_type: 'manual',        status: 'manual_process' },
      ]);
    }
  }, []);

  useEffect(() => {
    loadClaims();
    loadInsurers();
  }, [loadClaims, loadInsurers]);

  const handleNewClaim = async (data: Partial<DamageClaim>) => {
    try {
      await apiClient.post('/api/damage/claims', { ...data, org_id: orgId });
      await loadClaims();
      setView('pipeline');
    } catch (err) {
      alert('Kunde inte skapa ärende: ' + String(err));
    }
  };

  const handleSendToInsurance = async () => {
    if (!selectedClaim) return;
    try {
      await apiClient.post(`/api/damage/claims/${selectedClaim.id}/submit-to-insurance`, {
        cabas_estimate_id: selectedClaim.cabas_estimate_id,
      });
      await loadClaims();
    } catch (err) {
      alert('Kunde inte skicka: ' + String(err));
    }
  };

  const handleInspectionSubmit = async (data: { inspection_type: InspectionType; result: string; notes: string }) => {
    if (!selectedClaim) return;
    try {
      await apiClient.post('/api/damage/inspection', {
        claim_id: selectedClaim.id,
        ...data,
        checklist: [],
      });
      await loadClaims();
    } catch (err) {
      alert('Kunde inte spara besiktning: ' + String(err));
    }
  };

  const navItems: { view: View; label: string; icon: string }[] = [
    { view: 'pipeline',   label: 'Pipeline',     icon: '🗂' },
    { view: 'new',        label: 'Nytt ärende',  icon: '➕' },
    { view: 'cabas',      label: 'Cabas-kalkyl', icon: '📊' },
    { view: 'insurance',  label: 'Försäkring',   icon: '🛡️' },
    { view: 'inspection', label: 'Besiktning',   icon: '✅' },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>🚗 Skadehantering</h1>
          <div style={{ fontSize: 14, color: 'rgba(245,245,247,0.5)' }}>
            {claims.length} aktiva ärenden
          </div>
        </div>
        <button onClick={() => setView('new')} style={btnPrimary}>+ Nytt skadeärende</button>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              background: view === item.view ? '#1a1a24' : 'transparent',
              color: view === item.view ? 'rgba(245,245,247,0.9)' : 'rgba(245,245,247,0.45)',
              cursor: 'pointer',
              transition: 'all .15s',
              boxShadow: view === item.view ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'rgba(245,245,247,0.4)', padding: 40, textAlign: 'center' }}>Laddar ärenden...</div>
      ) : (
        <>
          {view === 'pipeline' && (
            <PipelineView
              claims={claims}
              onSelect={claim => { setSelectedClaim(claim); setView('insurance'); }}
              onNew={() => setView('new')}
            />
          )}
          {view === 'new' && (
            <NewClaimForm
              insurers={insurers}
              onSubmit={handleNewClaim}
              onCancel={() => setView('pipeline')}
            />
          )}
          {view === 'cabas' && selectedClaim && (
            <CabasView claim={selectedClaim} onSend={handleSendToInsurance} />
          )}
          {view === 'cabas' && !selectedClaim && (
            <div style={{ color: 'rgba(245,245,247,0.4)', padding: 40, textAlign: 'center' }}>
              Välj ett skadeärende i pipeline-vyn för att se Cabas-kalkyl.
            </div>
          )}
          {view === 'insurance' && selectedClaim && (
            <InsuranceView claim={selectedClaim} />
          )}
          {view === 'insurance' && !selectedClaim && (
            <div style={{ color: 'rgba(245,245,247,0.4)', padding: 40, textAlign: 'center' }}>
              Välj ett skadeärende i pipeline-vyn för att se försäkringskommunikation.
            </div>
          )}
          {view === 'inspection' && selectedClaim && (
            <InspectionView claim={selectedClaim} onSubmit={handleInspectionSubmit} />
          )}
          {view === 'inspection' && !selectedClaim && (
            <div style={{ color: 'rgba(245,245,247,0.4)', padding: 40, textAlign: 'center' }}>
              Välj ett skadeärende i pipeline-vyn för besiktning.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DamageModule;
