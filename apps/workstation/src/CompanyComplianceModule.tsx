/**
 * CompanyComplianceModule — Bolagsinfo & Regelefterlevnad
 *
 * EU is building digital company infrastructure from below.
 * Pixdrift is the operational layer from above.
 *
 * Views:
 *  1. Compliance Dashboard — traffic light overview, obligation cards
 *  2. Company Structure   — entity, board, ownership, F-tax/VAT status
 *  3. Documents           — versioned docs, articles, minutes, annual reports
 *  4. Compliance Calendar — monthly calendar view with color-coded obligations
 *  5. Authority Filings   — all submissions to Bolagsverket, Skatteverket, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001';

function apiGet(path: string): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}/api${path}`, { headers }).then(async r => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.statusText);
    return d;
  });
}

function apiPost(path: string, body: unknown): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}/api${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || r.statusText); return d; });
}

function apiPatch(path: string, body: unknown): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}/api${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || r.statusText); return d; });
}

// ─── Design tokens — Apple HIG precision ─────────────────────────────────────
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
  purple:    '#AF52DE',
  inset:     '#E5E5EA',
};

const shadow = '0 1px 3px rgba(0,0,0,0.06)';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CompanyEntity {
  id: string;
  legal_name: string;
  trading_name?: string;
  org_number: string;
  legal_form: string;
  country: string;
  vat_registered: boolean;
  f_tax_approved: boolean;
  fiscal_year_end: string;
  status: string;
  share_capital?: number;
  sni_code?: string;
  registered_date?: string;
}

interface CompanyRole {
  id: string;
  person_name: string;
  role: string;
  signing_rights: boolean;
  appointed_date?: string;
  is_active: boolean;
}

interface Ownership {
  id: string;
  owner_name: string;
  owner_type: string;
  share_percentage: number;
  number_of_shares?: number;
  share_class: string;
  beneficial_owner: boolean;
}

interface ComplianceObligation {
  id: string;
  obligation_type: string;
  authority: string;
  description: string;
  due_date: string;
  period_from?: string;
  period_to?: string;
  status: string;
  penalty_if_missed?: string;
  reference_number?: string;
  auto_generated: boolean;
}

interface CompanyDocument {
  id: string;
  document_type: string;
  title: string;
  version: number;
  status: string;
  document_date?: string;
  filed_with?: string;
  filing_reference?: string;
  file_url?: string;
  is_current_version: boolean;
}

interface AuthorityFiling {
  id: string;
  authority: string;
  filing_type: string;
  reference_number?: string;
  submitted_at: string;
  status: string;
  company_entities?: { legal_name: string };
}

interface Dashboard {
  entities: CompanyEntity[];
  summary: { overdue: number; due_soon: number; compliant: number };
  upcoming_obligations: ComplianceObligation[];
  recent_obligations: ComplianceObligation[];
  health_score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function obligationColor(obl: ComplianceObligation): string {
  if (['SUBMITTED', 'ACCEPTED'].includes(obl.status)) return C.green;
  const days = daysUntil(obl.due_date);
  if (days < 0) return C.red;
  if (days <= 30) return C.orange;
  return C.blue;
}

function obligationLabel(type: string): string {
  const labels: Record<string, string> = {
    ANNUAL_REPORT: 'Årsredovisning',
    VAT_QUARTERLY: 'Momsdeklaration',
    VAT_MONTHLY: 'Momsdeklaration (månadsvis)',
    AGI_MONTHLY: 'Arbetsgivardeklaration',
    CORPORATE_TAX: 'Inkomstdeklaration',
    SHAREHOLDERS_MEETING: 'Bolagsstämma',
    BOARD_MEETING: 'Styrelsemöte',
    AUDIT: 'Revision',
    OTHER: 'Övrigt',
  };
  return labels[type] || type;
}

function statusBadge(status: string, small = false): React.ReactNode {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:        { bg: '#F2F2F7', color: C.secondary,  label: 'Väntar' },
    IN_PROGRESS:    { bg: '#FFF3CD', color: '#856404',    label: 'Pågår' },
    SUBMITTED:      { bg: '#D1ECF1', color: '#0C5460',    label: 'Inlämnad' },
    ACCEPTED:       { bg: '#D4EDDA', color: '#155724',    label: 'Godkänd' },
    OVERDUE:        { bg: '#F8D7DA', color: '#721C24',    label: 'Försenad' },
    NOT_APPLICABLE: { bg: '#E2E3E5', color: '#383D41',    label: 'Ej aktuell' },
    DRAFT:          { bg: '#F2F2F7', color: C.secondary,  label: 'Utkast' },
    REVIEW:         { bg: '#FFF3CD', color: '#856404',    label: 'Granskning' },
    SIGNED:         { bg: '#D4EDDA', color: '#155724',    label: 'Signerad' },
    FILED:          { bg: '#D1ECF1', color: '#0C5460',    label: 'Inlämnad' },
    SUPERSEDED:     { bg: '#E2E3E5', color: '#383D41',    label: 'Ersatt' },
  };
  const s = cfg[status] || { bg: '#F2F2F7', color: C.secondary, label: status };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 20,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    CEO: 'VD', CFO: 'CFO', CTO: 'CTO', BOARD_CHAIR: 'Styrelseordförande',
    BOARD_MEMBER: 'Styrelseledamot', DEPUTY_BOARD_MEMBER: 'Styrelsesuppleant',
    AUDITOR: 'Revisor', AUTHORIZED_SIGNATORY: 'Firmatecknare',
    DEPUTY_CEO: 'Vice VD', MANAGING_DIRECTOR: 'VD', OTHER: 'Övrigt',
  };
  return labels[role] || role;
}

function legalFormFull(form: string): string {
  const f: Record<string, string> = {
    AB: 'Aktiebolag', HB: 'Handelsbolag', KB: 'Kommanditbolag',
    EF: 'Enskild firma', BRF: 'Bostadsrättsförening',
    IDEELL: 'Ideell förening', STIFTELSE: 'Stiftelse',
    GmbH: 'GmbH', BV: 'BV', SRL: 'SRL', SAS: 'SAS',
    LTD: 'Ltd', LLC: 'LLC', OTHER: 'Övrigt',
  };
  return f[form] || form;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: 20,
      boxShadow: shadow,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── View 1: Compliance Dashboard ────────────────────────────────────────────
function ComplianceDashboard({ entityId, orgId }: { entityId: string; orgId: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet('/company/dashboard');
      setDashboard(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generateCalendar() {
    setGenerating(true);
    try {
      const res = await apiPost(`/company/entities/${entityId}/generate-calendar`, {});
      alert(`✅ Genererade ${res.generated} regelkrav automatiskt`);
      load();
    } catch (e: any) {
      alert('Fel: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function markSubmitted(oblId: string) {
    setMarkingId(oblId);
    const ref = prompt('Referensnummer (valfritt):') || undefined;
    try {
      await apiPatch(`/company/compliance/${oblId}/status`, { status: 'SUBMITTED', reference_number: ref });
      load();
    } catch (e: any) {
      alert('Fel: ' + e.message);
    } finally {
      setMarkingId(null);
    }
  }

  if (loading) return <div style={{ padding: 40, color: C.secondary, textAlign: 'center' }}>Laddar...</div>;
  if (!dashboard) return null;

  const { summary, recent_obligations } = dashboard;
  const overdue = recent_obligations.filter(o => daysUntil(o.due_date) < 0 && !['SUBMITTED', 'ACCEPTED', 'NOT_APPLICABLE'].includes(o.status));
  const dueSoon = recent_obligations.filter(o => {
    const d = daysUntil(o.due_date);
    return d >= 0 && d <= 30 && !['SUBMITTED', 'ACCEPTED', 'NOT_APPLICABLE'].includes(o.status);
  });
  const compliant = recent_obligations.filter(o => ['SUBMITTED', 'ACCEPTED'].includes(o.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Regelefterlevnad</h2>
          <p style={{ fontSize: 13, color: C.secondary, margin: '4px 0 0' }}>
            Auto-genererat baserat på din bolagsstruktur
          </p>
        </div>
        <button
          onClick={generateCalendar}
          disabled={generating}
          style={{
            background: C.blue, color: '#FFF', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? 'Genererar...' : '⚡ Generera kalender'}
        </button>
      </div>

      {/* Traffic lights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { color: C.red,    icon: '🔴', label: 'FÖRSENADE',  count: summary.overdue,   desc: 'krav har passerat deadline' },
          { color: C.orange, icon: '🟡', label: 'SNART FÖRFALLER', count: summary.due_soon, desc: 'krav förfaller inom 30 dagar' },
          { color: C.green,  icon: '🟢', label: 'KLART',      count: summary.compliant, desc: 'krav inlämnade/godkända' },
        ].map(({ color, icon, label, count, desc }) => (
          <Card key={label} style={{ borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, letterSpacing: '0.05em', marginBottom: 8 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>{desc}</div>
          </Card>
        ))}
      </div>

      {/* Health score */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, letterSpacing: '0.05em' }}>COMPLIANCE SCORE</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: dashboard.health_score >= 70 ? C.green : dashboard.health_score >= 40 ? C.orange : C.red }}>
              {dashboard.health_score}<span style={{ fontSize: 20, color: C.secondary }}>/100</span>
            </div>
          </div>
          <div style={{ flex: 1, height: 8, background: C.inset, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${dashboard.health_score}%`, height: '100%',
              background: dashboard.health_score >= 70 ? C.green : dashboard.health_score >= 40 ? C.orange : C.red,
              borderRadius: 4, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </Card>

      {/* Overdue obligations — red */}
      {overdue.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔴 Försenade krav
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overdue.map(o => (
              <ObligationCard key={o.id} obl={o} onMarkSubmitted={markSubmitted} marking={markingId === o.id} />
            ))}
          </div>
        </div>
      )}

      {/* Due soon — orange */}
      {dueSoon.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 8 }}>
            🟡 Förfaller snart
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dueSoon.map(o => (
              <ObligationCard key={o.id} obl={o} onMarkSubmitted={markSubmitted} marking={markingId === o.id} />
            ))}
          </div>
        </div>
      )}

      {/* Compliant — green */}
      {compliant.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 8 }}>
            🟢 Klara krav
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {compliant.slice(0, 5).map(o => (
              <ObligationCard key={o.id} obl={o} onMarkSubmitted={markSubmitted} marking={markingId === o.id} />
            ))}
          </div>
        </div>
      )}

      {recent_obligations.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Inga regelkrav än</div>
          <div style={{ fontSize: 13, color: C.secondary, marginBottom: 16 }}>
            Klicka "Generera kalender" för att auto-generera krav baserat på din bolagsstruktur.
          </div>
          <button
            onClick={generateCalendar}
            disabled={generating}
            style={{
              background: C.blue, color: '#FFF', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⚡ Generera nu
          </button>
        </Card>
      )}
    </div>
  );
}

function ObligationCard({ obl, onMarkSubmitted, marking }: {
  obl: ComplianceObligation;
  onMarkSubmitted: (id: string) => void;
  marking: boolean;
}) {
  const color = obligationColor(obl);
  const days = daysUntil(obl.due_date);
  const done = ['SUBMITTED', 'ACCEPTED'].includes(obl.status);

  return (
    <Card style={{ borderLeft: `4px solid ${color}`, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{obligationLabel(obl.obligation_type)}</span>
            {statusBadge(obl.status, true)}
            {obl.auto_generated && (
              <span style={{ fontSize: 10, color: C.secondary, background: C.inset, padding: '2px 6px', borderRadius: 10 }}>Auto</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 4 }}>{obl.description}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.secondary }}>
            <span style={{ color, fontWeight: 600 }}>
              {days < 0 ? `${Math.abs(days)} dagar försenad` : days === 0 ? 'Idag!' : `${days} dagar kvar`}
            </span>
            <span>📅 {new Date(obl.due_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {obl.authority && <span>🏛 {obl.authority}</span>}
          </div>
          {obl.penalty_if_missed && !done && (
            <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>
              ⚠️ {obl.penalty_if_missed}
            </div>
          )}
          {obl.reference_number && (
            <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>Ref: {obl.reference_number}</div>
          )}
        </div>
        {!done && (
          <button
            onClick={() => onMarkSubmitted(obl.id)}
            disabled={marking}
            style={{
              background: C.green, color: '#FFF', border: 'none', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0, opacity: marking ? 0.6 : 1,
            }}
          >
            ✓ Markera inlämnad
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── View 2: Company Structure ────────────────────────────────────────────────
function CompanyStructure({ entityId }: { entityId: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet(`/company/entities/${entityId}`)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId]);

  if (loading) return <div style={{ padding: 40, color: C.secondary, textAlign: 'center' }}>Laddar bolagsinfo...</div>;
  if (!detail?.entity) return <div style={{ padding: 40, color: C.secondary, textAlign: 'center' }}>Bolag ej hittat</div>;

  const { entity, roles, ownership } = detail;
  const totalShares = ownership.reduce((s: number, o: Ownership) => s + (o.number_of_shares || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Entity card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{entity.legal_name}</h3>
            {entity.trading_name && entity.trading_name !== entity.legal_name && (
              <div style={{ fontSize: 13, color: C.secondary }}>{entity.trading_name}</div>
            )}
          </div>
          <span style={{
            background: entity.status === 'ACTIVE' ? '#D4EDDA' : '#F8D7DA',
            color: entity.status === 'ACTIVE' ? '#155724' : '#721C24',
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          }}>{entity.status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { label: 'Organisationsnummer', value: entity.org_number },
            { label: 'Bolagsform', value: `${entity.legal_form} — ${legalFormFull(entity.legal_form)}` },
            { label: 'Registreringsdatum', value: entity.registered_date ? new Date(entity.registered_date).toLocaleDateString('sv-SE') : '—' },
            { label: 'Räkenskapsår', value: `01-01 – ${entity.fiscal_year_end}` },
            { label: 'Aktiekapital', value: entity.share_capital ? `${entity.share_capital.toLocaleString('sv-SE')} SEK` : '—' },
            { label: 'SNI-kod', value: entity.sni_code || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tax status */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <span style={{
            background: entity.vat_registered ? '#D4EDDA' : C.inset,
            color: entity.vat_registered ? '#155724' : C.secondary,
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          }}>
            {entity.vat_registered ? '✓ Momsregistrerad' : '✗ Ej momsregistrerad'}
          </span>
          <span style={{
            background: entity.f_tax_approved ? '#D4EDDA' : C.inset,
            color: entity.f_tax_approved ? '#155724' : C.secondary,
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          }}>
            {entity.f_tax_approved ? '✓ F-skatt godkänd' : '✗ Ej F-skatt'}
          </span>
        </div>
      </Card>

      {/* Board & management */}
      {roles.length > 0 && (
        <Card>
          <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: C.secondary, letterSpacing: '0.05em' }}>
            STYRELSE & LEDNING
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {roles.map((r: CompanyRole) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.person_name}</div>
                  <div style={{ fontSize: 12, color: C.secondary }}>{roleLabel(r.role)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {r.signing_rights && (
                    <span style={{ fontSize: 11, background: '#D1ECF1', color: '#0C5460', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>
                      Firmatecknare
                    </span>
                  )}
                  {r.appointed_date && (
                    <span style={{ fontSize: 11, color: C.secondary }}>
                      fr.o.m. {new Date(r.appointed_date).toLocaleDateString('sv-SE')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ownership */}
      {ownership.length > 0 && (
        <Card>
          <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: C.secondary, letterSpacing: '0.05em' }}>
            ÄGARSTRUKTUR
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ownership.map((o: Ownership) => (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: `${Math.max(o.share_percentage, 2)}%`,
                  maxWidth: '40%',
                  minWidth: 20,
                  height: 6,
                  background: C.blue,
                  borderRadius: 3,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{o.owner_name}</div>
                  <div style={{ fontSize: 12, color: C.secondary }}>
                    {o.owner_type === 'COMPANY' ? '🏢' : '👤'} {o.owner_type.toLowerCase()}
                    {o.number_of_shares ? ` · ${o.number_of_shares.toLocaleString('sv-SE')} aktier klass ${o.share_class}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{o.share_percentage.toFixed(1)}%</div>
                  {o.beneficial_owner && (
                    <div style={{ fontSize: 10, color: C.orange, fontWeight: 600 }}>Verklig huvudman</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {roles.length === 0 && ownership.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ingen bolagsdata registrerad</div>
          <div style={{ fontSize: 12, color: C.secondary }}>Styrelse och ägarstruktur kan läggas till via API eller Bolagsverket-integrationen.</div>
        </Card>
      )}
    </div>
  );
}

// ─── View 3: Documents ────────────────────────────────────────────────────────
function DocumentsView({ entityId }: { entityId: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet(`/company/entities/${entityId}`)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId]);

  if (loading) return <div style={{ padding: 40, color: C.secondary, textAlign: 'center' }}>Laddar dokument...</div>;

  const documents: CompanyDocument[] = detail?.documents || [];

  const docTypeLabels: Record<string, string> = {
    ARTICLES_OF_ASSOCIATION: 'Bolagsordning',
    BOARD_MINUTES: 'Styrelseprotokoll',
    ANNUAL_REPORT: 'Årsredovisning',
    INTERIM_REPORT: 'Delårsrapport',
    SHAREHOLDERS_AGREEMENT: 'Aktieägaravtal',
    POWER_OF_ATTORNEY: 'Fullmakt',
    REGISTRATION_CERTIFICATE: 'Registreringsbevis',
    VAT_REGISTRATION: 'Momsregistrering',
    F_TAX_APPROVAL: 'F-skattebevis',
    AUDIT_REPORT: 'Revisionsberättelse',
    DIVIDEND_DECISION: 'Utdelningsbeslut',
    SHARE_TRANSFER: 'Överlåtelse av aktier',
    CAPITAL_INCREASE: 'Nyemission',
    LIQUIDATION: 'Likvidation',
    OTHER: 'Övrigt',
  };

  // Group by type
  const grouped: Record<string, CompanyDocument[]> = {};
  documents.forEach(doc => {
    const key = doc.document_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(doc);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Dokument</h2>
          <p style={{ fontSize: 13, color: C.secondary, margin: '4px 0 0' }}>
            Versionerade bolagsdokument med spårbar historik
          </p>
        </div>
        <button style={{
          background: C.blue, color: '#FFF', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          + Ladda upp dokument
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Inga dokument uppladdade</div>
          <div style={{ fontSize: 13, color: C.secondary }}>
            Bolagsordning, styrelseprotokoll, årsredovisningar och andra bolagsdokument visas här.
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, docs]) => (
          <Card key={type}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.05em', margin: '0 0 12px' }}>
              {docTypeLabels[type] || type} ({docs.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: C.inset, borderRadius: 8,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{doc.title}</span>
                      <span style={{ fontSize: 11, color: C.secondary }}>v{doc.version}</span>
                      {statusBadge(doc.status, true)}
                    </div>
                    <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                      {doc.document_date && `📅 ${new Date(doc.document_date).toLocaleDateString('sv-SE')}`}
                      {doc.filed_with && ` · Inlämnad till ${doc.filed_with}`}
                      {doc.filing_reference && ` · Ref: ${doc.filing_reference}`}
                    </div>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        background: C.blue, color: '#FFF', borderRadius: 8,
                        padding: '6px 12px', fontSize: 12, fontWeight: 600,
                        textDecoration: 'none', flexShrink: 0,
                      }}>
                      Öppna
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── View 4: Compliance Calendar ──────────────────────────────────────────────
function ComplianceCalendar({ entityId }: { entityId: string }) {
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterAuthority, setFilterAuthority] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    apiGet(`/company/entities/${entityId}/obligations`)
      .then(setObligations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId]);

  const authorities = ['ALL', ...Array.from(new Set(obligations.map(o => o.authority).filter(Boolean)))];

  const filtered = obligations.filter(o => {
    const d = new Date(o.due_date);
    const matchMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    const matchAuth = filterAuthority === 'ALL' || o.authority === filterAuthority;
    return matchMonth && matchAuth;
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

  if (loading) return <div style={{ padding: 40, color: C.secondary, textAlign: 'center' }}>Laddar kalender...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => {
            if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
            else setSelectedMonth(m => m - 1);
          }} style={{ background: C.inset, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 14 }}>‹</button>
          <div style={{ fontSize: 16, fontWeight: 700, minWidth: 130, textAlign: 'center' }}>
            {monthNames[selectedMonth]} {selectedYear}
          </div>
          <button onClick={() => {
            if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
            else setSelectedMonth(m => m + 1);
          }} style={{ background: C.inset, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 14 }}>›</button>
        </div>
        <select
          value={filterAuthority}
          onChange={e => setFilterAuthority(e.target.value)}
          style={{ background: C.inset, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
        >
          {authorities.map(a => <option key={a} value={a}>{a === 'ALL' ? 'Alla myndigheter' : a}</option>)}
        </select>
      </div>

      {/* Obligations for selected month */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Inga regelkrav detta månad</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(obl => {
            const color = obligationColor(obl);
            const days = daysUntil(obl.due_date);
            return (
              <Card key={obl.id} style={{ borderLeft: `4px solid ${color}`, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{obligationLabel(obl.obligation_type)}</span>
                      {statusBadge(obl.status, true)}
                    </div>
                    <div style={{ fontSize: 12, color: C.secondary, marginLeft: 20 }}>{obl.description}</div>
                    <div style={{ fontSize: 11, color: C.secondary, marginLeft: 20, marginTop: 2 }}>
                      🏛 {obl.authority} · 📅 {new Date(obl.due_date).toLocaleDateString('sv-SE')}
                      {days >= 0 && !['SUBMITTED', 'ACCEPTED'].includes(obl.status) && (
                        <span style={{ color, fontWeight: 600, marginLeft: 8 }}>({days}d kvar)</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.secondary }}>
        {[
          { color: C.red,    label: 'Försenad' },
          { color: C.orange, label: 'Förfaller snart (≤30d)' },
          { color: C.blue,   label: 'Kommande' },
          { color: C.green,  label: 'Klar' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── View 5: Authority Filings ────────────────────────────────────────────────
function AuthorityFilingsView({ orgId }: { orgId: string }) {
  const [filings, setFilings] = useState<AuthorityFiling[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet('/company/filings')
      .then(setFilings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  const statusColor2 = (s: string) => ({
    SUBMITTED: C.blue,
    PROCESSING: C.orange,
    ACCEPTED: C.green,
    REJECTED: C.red,
    PENDING_INFO: C.orange,
  }[s] || C.secondary);

  const statusLabel2 = (s: string) => ({
    SUBMITTED: 'Inlämnad',
    PROCESSING: 'Behandlas',
    ACCEPTED: 'Godkänd',
    REJECTED: 'Avvisad',
    PENDING_INFO: 'Inväntar info',
  }[s] || s);

  if (loading) return <div style={{ padding: 40, color: C.secondary, textAlign: 'center' }}>Laddar inlämningar...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Inlämningar till myndigheter</h2>
          <p style={{ fontSize: 13, color: C.secondary, margin: '4px 0 0' }}>
            Historik över alla inlämningar
          </p>
        </div>
        <button style={{
          background: C.inset, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          📥 Exportera till revisor
        </button>
      </div>

      {filings.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏛</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Inga inlämningar registrerade</div>
          <div style={{ fontSize: 13, color: C.secondary }}>
            Registrera inlämningar till Bolagsverket, Skatteverket m.fl. här för full spårbarhet.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {filings.map((f, i) => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 20px',
              borderBottom: i < filings.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor2(f.status), flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {f.authority} — {f.filing_type}
                </div>
                <div style={{ fontSize: 12, color: C.secondary }}>
                  {f.company_entities?.legal_name} · {new Date(f.submitted_at).toLocaleDateString('sv-SE')}
                  {f.reference_number && ` · Ref: ${f.reference_number}`}
                </div>
              </div>
              <span style={{
                background: `${statusColor2(f.status)}20`,
                color: statusColor2(f.status),
                fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 20,
              }}>
                {statusLabel2(f.status)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── Entity selector / placeholder ───────────────────────────────────────────
function EntitySelector({ entities, selectedId, onSelect }: {
  entities: CompanyEntity[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (entities.length <= 1) return null;
  return (
    <select
      value={selectedId}
      onChange={e => onSelect(e.target.value)}
      style={{
        background: '#F2F2F7', border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '6px 12px', fontSize: 13, cursor: 'pointer', maxWidth: 240,
      }}
    >
      {entities.map(e => (
        <option key={e.id} value={e.id}>{e.legal_name} ({e.org_number})</option>
      ))}
    </select>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export default function CompanyComplianceModule() {
  const [view, setView] = useState<'dashboard' | 'structure' | 'documents' | 'calendar' | 'filings'>('dashboard');
  const [entities, setEntities] = useState<CompanyEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [loadingEntities, setLoadingEntities] = useState(true);

  const orgId = localStorage.getItem('pixdrift_org_id') || '';

  useEffect(() => {
    apiGet('/company/entities')
      .then((data: CompanyEntity[]) => {
        setEntities(data || []);
        if (data?.length > 0) setSelectedEntityId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingEntities(false));
  }, []);

  const tabs: { id: typeof view; label: string; icon: string }[] = [
    { id: 'dashboard',  label: 'Översikt',       icon: '🔔' },
    { id: 'structure',  label: 'Bolagsstruktur', icon: '🏢' },
    { id: 'documents',  label: 'Dokument',       icon: '📄' },
    { id: 'calendar',   label: 'Kalender',       icon: '📅' },
    { id: 'filings',    label: 'Inlämningar',    icon: '🏛' },
  ];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Bolagsinfo</h1>
            <p style={{ fontSize: 14, color: C.secondary, margin: '4px 0 0' }}>
              Legal PIX — EU:s digitala bolagsinfrastruktur möter Pixdrift
            </p>
          </div>
          {!loadingEntities && (
            <EntitySelector entities={entities} selectedId={selectedEntityId} onSelect={setSelectedEntityId} />
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: C.inset, borderRadius: 12, padding: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                flex: 1,
                background: view === tab.id ? C.surface : 'transparent',
                border: 'none',
                borderRadius: 9,
                padding: '8px 4px',
                fontSize: 12,
                fontWeight: view === tab.id ? 700 : 500,
                color: view === tab.id ? C.text : C.secondary,
                cursor: 'pointer',
                boxShadow: view === tab.id ? shadow : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'block', fontSize: 16, marginBottom: 2 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* No entities state */}
      {!loadingEntities && entities.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏢</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Lägg till ditt bolag</h3>
          <p style={{ fontSize: 14, color: C.secondary, maxWidth: 400, margin: '0 auto 20px' }}>
            Registrera din juridiska person för att få automatisk regelkravskalender baserat på bolagsform, VAT-status och F-skatt.
          </p>
          <button style={{
            background: C.blue, color: '#FFF', border: 'none', borderRadius: 10,
            padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            + Lägg till bolag
          </button>
        </Card>
      )}

      {/* Views */}
      {!loadingEntities && entities.length > 0 && selectedEntityId && (
        <>
          {view === 'dashboard'  && <ComplianceDashboard entityId={selectedEntityId} orgId={orgId} />}
          {view === 'structure'  && <CompanyStructure entityId={selectedEntityId} />}
          {view === 'documents'  && <DocumentsView entityId={selectedEntityId} />}
          {view === 'calendar'   && <ComplianceCalendar entityId={selectedEntityId} />}
          {view === 'filings'    && <AuthorityFilingsView orgId={orgId} />}
        </>
      )}
    </div>
  );
}
