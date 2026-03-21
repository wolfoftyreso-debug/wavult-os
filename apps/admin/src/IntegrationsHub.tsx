/**
 * pixdrift Admin — IntegrationsHub.tsx
 *
 * Full Integration Hub UI: browse providers by category, connect,
 * configure field mappings, set sync frequency, view sync logs.
 */

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  provider: string;
  name: string;
  status: 'active' | 'paused' | 'error' | 'pending';
  sync_status: 'idle' | 'running' | 'success' | 'partial' | 'failed';
  last_sync_at: string | null;
  sync_frequency: string;
  base_url?: string;
}

interface ProviderDef {
  provider: string;
  display_name: string;
  category: 'erp' | 'accounting' | 'communication' | 'crm' | 'automation';
  description: string;
  auth_types: string[];
  docs_url?: string;
  logo_color?: string;
}

interface FieldMapping {
  id?: string;
  source_object: string;
  source_field: string;
  target_table: string;
  target_field: string;
  transform?: string;
  default_value?: string;
  required: boolean;
}

interface SyncLog {
  id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F5F5F7', surface: '#FFFFFF', elevated: '#FAFAFA',
  border: '#E5E5EA', separator: '#F2F2F7',
  text: '#1D1D1F', secondary: '#86868B', tertiary: '#AEAEB2',
  blue: '#007AFF', blueLight: '#E8F3FF',
  green: '#34C759', greenLight: '#E8F8ED',
  yellow: '#FF9500', yellowLight: '#FFF3E0',
  red: '#FF3B30', redLight: '#FFF0EF',
  purple: '#AF52DE', fill: '#F2F2F7',
};

const API = 'https://api.bc.pixdrift.com';

// ─── Provider catalogue ───────────────────────────────────────────────────────

const PROVIDERS: ProviderDef[] = [
  // ERP
  { provider: 'sap', display_name: 'SAP S/4HANA', category: 'erp', description: 'Världens ledande ERP via SAP BTP och OData APIs.', auth_types: ['oauth2', 'sap_rfc'], logo_color: '#0070F2' },
  { provider: 'oracle', display_name: 'Oracle NetSuite', category: 'erp', description: 'NetSuite för SMB och Oracle ERP Cloud för enterprise.', auth_types: ['oauth2', 'api_key'], logo_color: '#F80000' },
  { provider: 'dynamics', display_name: 'Microsoft Dynamics', category: 'erp', description: 'Business Central + Dynamics 365 Sales via Azure AD.', auth_types: ['oauth2'], logo_color: '#0078D4' },
  { provider: 'ifs', display_name: 'IFS Applications', category: 'erp', description: 'Starkt i Sverige — Saab, Volvo, Alfa Laval, Atlas Copco.', auth_types: ['oauth2', 'api_key'], logo_color: '#E63946' },
  { provider: 'jeeves', display_name: 'Jeeves ERP', category: 'erp', description: 'Nordiskt ERP för tillverkning och handel.', auth_types: ['api_key', 'basic'], logo_color: '#2B2D42' },
  { provider: 'monitor', display_name: 'Monitor ERP', category: 'erp', description: 'Nordiskt ERP för tillverkande industri.', auth_types: ['api_key', 'basic'], logo_color: '#1B4F72' },
  { provider: 'pyramid', display_name: 'Pyramid Business Studio', category: 'erp', description: 'Nordiskt ERP för handel, bygg och projekt.', auth_types: ['api_key', 'basic'], logo_color: '#6A0572' },
  { provider: 'sage', display_name: 'Sage', category: 'erp', description: 'Sage 200 och Sage X3 — populärt i UK och Europa.', auth_types: ['oauth2'], logo_color: '#00DC82' },
  { provider: 'infor', display_name: 'Infor', category: 'erp', description: 'Branschspecifikt ERP för industri och tillverkning.', auth_types: ['oauth2'], logo_color: '#E96D28' },
  // Accounting
  { provider: 'fortnox', display_name: 'Fortnox', category: 'accounting', description: 'Sveriges mest använda bokföringsprogram.', auth_types: ['oauth2'], logo_color: '#00B04F' },
  { provider: 'visma', display_name: 'Visma', category: 'accounting', description: 'Visma eEkonomi och Visma Net.', auth_types: ['oauth2'], logo_color: '#005AA7' },
  { provider: 'pe_accounting', display_name: 'PE Accounting', category: 'accounting', description: 'Molnbaserat ekonomisystem för SMB.', auth_types: ['api_key'], logo_color: '#FF6B00' },
  { provider: 'bjorn_lunden', display_name: 'Björn Lundén', category: 'accounting', description: 'Redovisning och bokföring för svenska SMB.', auth_types: ['api_key'], logo_color: '#0070C0' },
  { provider: 'xero', display_name: 'Xero', category: 'accounting', description: 'Globalt molnbaserat bokföringssystem.', auth_types: ['oauth2'], logo_color: '#13B5EA' },
  { provider: 'quickbooks', display_name: 'QuickBooks', category: 'accounting', description: 'Intuits bokföringsprogram — populärt globalt.', auth_types: ['oauth2'], logo_color: '#2CA01C' },
  // Communication
  { provider: 'slack', display_name: 'Slack', category: 'communication', description: 'Meddelandeplattform med botintegration och notifieringar.', auth_types: ['oauth2'], logo_color: '#4A154B' },
  { provider: 'teams', display_name: 'Microsoft Teams', category: 'communication', description: 'Microsoft Teams via Graph API och webhooks.', auth_types: ['oauth2'], logo_color: '#6264A7' },
  { provider: 'google_workspace', display_name: 'Google Workspace', category: 'communication', description: 'Gmail, Calendar, Drive och Meet.', auth_types: ['oauth2'], logo_color: '#4285F4' },
  // CRM
  { provider: 'salesforce', display_name: 'Salesforce', category: 'crm', description: 'Världens ledande CRM-plattform.', auth_types: ['oauth2'], logo_color: '#00A1E0' },
  { provider: 'hubspot', display_name: 'HubSpot', category: 'crm', description: 'Inbound marketing, CRM och sales hub.', auth_types: ['oauth2', 'api_key'], logo_color: '#FF7A59' },
  { provider: 'pipedrive', display_name: 'Pipedrive', category: 'crm', description: 'Säljfokuserat CRM för B2B-team.', auth_types: ['oauth2', 'api_key'], logo_color: '#1B3B5C' },
  // Automation
  { provider: 'zapier', display_name: 'Zapier', category: 'automation', description: '5000+ app-kopplingar via trigger/action.', auth_types: ['api_key'], logo_color: '#FF4A00' },
  { provider: 'make', display_name: 'Make.com', category: 'automation', description: 'Visuell automation — 1500+ kopplingar.', auth_types: ['api_key'], logo_color: '#6D00CC' },
  { provider: 'power_automate', display_name: 'Power Automate', category: 'automation', description: 'Microsofts automationsplattform med 1000+ kopplingar.', auth_types: ['oauth2'], logo_color: '#0066FF' },
];

const CATEGORIES: { id: ProviderDef['category']; label: string }[] = [
  { id: 'erp', label: 'ERP' },
  { id: 'accounting', label: 'Bokföring' },
  { id: 'communication', label: 'Kommunikation' },
  { id: 'crm', label: 'CRM' },
  { id: 'automation', label: 'Automatisering' },
];

const SYNC_FREQUENCIES = [
  { value: 'realtime', label: 'Realtid (webhooks)' },
  { value: 'hourly', label: 'Varje timme' },
  { value: 'daily', label: 'En gång per dag' },
  { value: 'manual', label: 'Manuell synk' },
];

const TRANSFORMS = ['', 'trim', 'uppercase', 'lowercase', 'date_format', 'boolean', 'number'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  new Date(d).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });

const syncStatusBadge = (s: string) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    idle:    { color: C.secondary, bg: C.fill,        label: 'Vilar' },
    running: { color: C.yellow,   bg: C.yellowLight,  label: 'Synkar...' },
    success: { color: C.green,    bg: C.greenLight,   label: 'OK' },
    partial: { color: C.yellow,   bg: C.yellowLight,  label: 'Delvis' },
    failed:  { color: C.red,      bg: C.redLight,     label: 'Fel' },
  };
  const m = map[s] ?? map.idle;
  return (
    <span style={{ background: m.bg, color: m.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      {m.label}
    </span>
  );
};

const statusDot = (connected: boolean) => (
  <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? C.green : C.tertiary, display: 'inline-block', marginRight: 5 }} />
);

// ─── Provider logo ────────────────────────────────────────────────────────────

function ProviderLogo({ provider, color, size = 36 }: { provider: string; color?: string; size?: number }) {
  const initials = provider === 'bjorn_lunden' ? 'BL'
    : provider === 'pe_accounting' ? 'PE'
    : provider === 'google_workspace' ? 'GW'
    : provider === 'power_automate' ? 'PA'
    : provider.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: color ?? C.blue,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0, letterSpacing: '-0.03em',
    }}>
      {initials}
    </div>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  def, connected, integration,
  onConnect, onManage,
}: {
  def: ProviderDef;
  connected: boolean;
  integration?: Integration;
  onConnect: () => void;
  onManage: () => void;
}) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'box-shadow 0.15s',
      boxShadow: connected ? `0 0 0 2px ${C.green}22` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <ProviderLogo provider={def.provider} color={def.logo_color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {statusDot(connected)}
            <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{def.display_name}</span>
          </div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2, lineHeight: 1.4 }}>{def.description}</div>
        </div>
      </div>

      {connected && integration && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {syncStatusBadge(integration.sync_status)}
          <span style={{ fontSize: 11, color: C.tertiary }}>
            {integration.last_sync_at ? fmt(integration.last_sync_at) : 'Aldrig synkad'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {connected ? (
          <button onClick={onManage} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.surface, color: C.text, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            Hantera
          </button>
        ) : (
          <button onClick={onConnect} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
            background: C.blue, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Koppla
          </button>
        )}
        {def.docs_url && (
          <a href={def.docs_url} target="_blank" rel="noopener noreferrer" style={{
            padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.surface, color: C.secondary, fontSize: 12, textDecoration: 'none',
          }}>
            Docs ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Config Modal ──────────────────────────────────────────────────────────────

function ConfigModal({
  def, integration, onClose, onSave,
}: {
  def: ProviderDef;
  integration?: Integration;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [tab, setTab] = useState<'connection' | 'mappings' | 'log'>('connection');
  const [form, setForm] = useState({
    name: integration?.name ?? def.display_name,
    base_url: integration?.base_url ?? '',
    auth_type: def.auth_types[0],
    sync_frequency: integration?.sync_frequency ?? 'hourly',
    client_id: '', client_secret: '', api_key: '', username: '', password: '',
  });
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (integration) {
      fetch(`${API}/api/integrations/${integration.id}/mapping`, { credentials: 'include' })
        .then(r => r.json()).then(d => setMappings(d.mappings ?? [])).catch(() => {});
      fetch(`${API}/api/integrations/${integration.id}/sync-log?limit=10`, { credentials: 'include' })
        .then(r => r.json()).then(d => setLogs(d.logs ?? [])).catch(() => {});
    }
  }, [integration]);

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`${API}/api/integrations/${integration?.id ?? 'test'}/health`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: def.provider, base_url: form.base_url }),
      });
      setTestResult(r.ok ? '✓ Anslutning OK' : '✗ Anslutning misslyckades');
    } catch {
      setTestResult('✗ Kunde inte nå servern');
    }
    setTesting(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const body = {
        provider: def.provider,
        name: form.name,
        base_url: form.base_url,
        auth_type: form.auth_type,
        sync_frequency: form.sync_frequency,
        credentials: {
          ...(form.auth_type === 'oauth2' ? { client_id: form.client_id, client_secret: form.client_secret } : {}),
          ...(form.auth_type === 'api_key' ? { api_key: form.api_key } : {}),
          ...(form.auth_type === 'basic'   ? { username: form.username, password: form.password } : {}),
        },
      };
      const url = integration ? `${API}/api/integrations/${integration.id}` : `${API}/api/integrations`;
      const r = await fetch(url, {
        method: integration ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      onSave(data.connector ?? data);
    } catch (e: any) {
      alert('Fel vid sparning: ' + e.message);
    }
    setSaving(false);
  };

  const runSync = async () => {
    if (!integration) return;
    setSyncing(true);
    try {
      await fetch(`${API}/api/integrations/${def.provider}/sync`, { method: 'POST', credentials: 'include' });
      const r = await fetch(`${API}/api/integrations/${integration.id}/sync-log?limit=10`, { credentials: 'include' });
      const d = await r.json();
      setLogs(d.logs ?? []);
    } catch {}
    setSyncing(false);
  };

  const addMapping = () => {
    setMappings(prev => [...prev, { source_object: '', source_field: '', target_table: '', target_field: '', transform: '', required: false }]);
  };

  const updateMapping = (idx: number, key: keyof FieldMapping, value: any) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [key]: value } : m));
  };

  const removeMapping = (idx: number) => {
    setMappings(prev => prev.filter((_, i) => i !== idx));
  };

  const saveMappings = async () => {
    if (!integration) return;
    for (const m of mappings) {
      if (!m.source_field || !m.target_field) continue;
      await fetch(`${API}/api/integrations/${integration.id}/mapping`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      }).catch(() => {});
    }
    alert('Kartläggningar sparade');
  };

  const TABS = [
    { id: 'connection', label: 'Anslutning' },
    { id: 'mappings',   label: 'Fältkartläggning' },
    { id: 'log',        label: 'Synklogg' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 16, width: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <ProviderLogo provider={def.provider} color={def.logo_color} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{def.display_name}</div>
            <div style={{ fontSize: 13, color: C.secondary }}>{def.description}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.secondary, fontSize: 20 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '16px 24px 0', borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? C.blue : C.secondary,
              borderBottom: tab === t.id ? `2px solid ${C.blue}` : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {tab === 'connection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                Namn
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
              </label>

              {/* Base URL */}
              <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                API URL / Base URL
                <input value={form.base_url} onChange={e => setForm(p => ({ ...p, base_url: e.target.value }))}
                  placeholder="https://your-instance.example.com"
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
              </label>

              {/* Auth type selector */}
              <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                Autentiseringsmetod
                <select value={form.auth_type} onChange={e => setForm(p => ({ ...p, auth_type: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.surface }}>
                  {def.auth_types.map(a => <option key={a} value={a}>{a === 'oauth2' ? 'OAuth 2.0' : a === 'api_key' ? 'API-nyckel' : a === 'basic' ? 'Användarnamn/Lösenord' : a === 'sap_rfc' ? 'SAP RFC/Basic' : a}</option>)}
                </select>
              </label>

              {/* Dynamic auth fields */}
              {(form.auth_type === 'oauth2' || form.auth_type === 'sap_rfc') && (
                <>
                  <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                    Client ID
                    <input value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
                  </label>
                  <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                    Client Secret
                    <input type="password" value={form.client_secret} onChange={e => setForm(p => ({ ...p, client_secret: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
                  </label>
                </>
              )}
              {form.auth_type === 'api_key' && (
                <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                  API-nyckel
                  <input type="password" value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
                </label>
              )}
              {form.auth_type === 'basic' && (
                <>
                  <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                    Användarnamn
                    <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
                  </label>
                  <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                    Lösenord
                    <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
                  </label>
                </>
              )}

              {/* Sync frequency */}
              <label style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>
                Synkfrekvens
                <select value={form.sync_frequency} onChange={e => setForm(p => ({ ...p, sync_frequency: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.surface }}>
                  {SYNC_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>

              {/* Test connection */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={testConnection} disabled={testing} style={{
                  padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.surface, color: C.text, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>
                  {testing ? 'Testar...' : '⚡ Testa anslutning'}
                </button>
                {testResult && <span style={{ fontSize: 13, color: testResult.startsWith('✓') ? C.green : C.red }}>{testResult}</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {integration && (
                  <button onClick={runSync} disabled={syncing} style={{
                    padding: '10px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
                    background: C.surface, color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {syncing ? 'Synkar...' : '↻ Synka nu'}
                  </button>
                )}
                <button onClick={saveConfig} disabled={saving} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: C.blue, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  {saving ? 'Sparar...' : integration ? 'Spara ändringar' : 'Koppla integration'}
                </button>
              </div>
            </div>
          )}

          {tab === 'mappings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 13, color: C.secondary }}>Mappa externa fält mot pixdrift-kolumner.</p>
                <button onClick={addMapping} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: C.blue, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  + Lägg till
                </button>
              </div>

              {/* Header row */}
              {mappings.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 28px', gap: 6, fontSize: 11, color: C.tertiary, fontWeight: 600, padding: '0 4px' }}>
                  <span>Källfält</span><span>Tabell</span><span>Målfält</span><span>Transform</span><span>Krävs</span><span></span>
                </div>
              )}

              {mappings.map((m, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 28px', gap: 6, alignItems: 'center' }}>
                  <input value={m.source_field} onChange={e => updateMapping(idx, 'source_field', e.target.value)}
                    placeholder="Källfält" style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }} />
                  <input value={m.target_table} onChange={e => updateMapping(idx, 'target_table', e.target.value)}
                    placeholder="Tabell" style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }} />
                  <input value={m.target_field} onChange={e => updateMapping(idx, 'target_field', e.target.value)}
                    placeholder="Målfält" style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }} />
                  <select value={m.transform ?? ''} onChange={e => updateMapping(idx, 'transform', e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, background: C.surface }}>
                    {TRANSFORMS.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.secondary }}>
                    <input type="checkbox" checked={m.required} onChange={e => updateMapping(idx, 'required', e.target.checked)} />
                    Krav
                  </label>
                  <button onClick={() => removeMapping(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.red, fontSize: 16 }}>×</button>
                </div>
              ))}

              {mappings.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: C.tertiary, fontSize: 13 }}>
                  Inga kartläggningar ännu. Klicka "+ Lägg till" för att börja.
                </div>
              )}

              {mappings.length > 0 && (
                <button onClick={saveMappings} style={{
                  alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: C.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Spara kartläggningar
                </button>
              )}
            </div>
          )}

          {tab === 'log' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: C.tertiary, fontSize: 13 }}>Ingen synkhistorik ännu.</div>
              ) : logs.map(l => (
                <div key={l.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {syncStatusBadge(l.status)}
                    <span style={{ fontSize: 11, color: C.tertiary }}>{fmt(l.started_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                    <span>📦 {l.records_processed} totalt</span>
                    <span style={{ color: C.green }}>+{l.records_created} nya</span>
                    <span style={{ color: C.blue }}>↺ {l.records_updated} uppdaterade</span>
                    {l.records_failed > 0 && <span style={{ color: C.red }}>✗ {l.records_failed} fel</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function IntegrationsHub() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalDef, setModalDef] = useState<ProviderDef | null>(null);
  const [modalIntegration, setModalIntegration] = useState<Integration | undefined>();

  useEffect(() => {
    fetch(`${API}/api/integrations`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setIntegrations(d.connectors ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activeIntegrations = integrations.filter(i => i.status === 'active');

  const filteredProviders = PROVIDERS.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const getIntegration = (provider: string) =>
    integrations.find(i => i.provider === provider);

  const openConnect = (def: ProviderDef) => {
    setModalDef(def);
    setModalIntegration(getIntegration(def.provider));
  };

  const handleSave = (saved: any) => {
    setIntegrations(prev => {
      const exists = prev.find(i => i.id === saved.id);
      if (exists) return prev.map(i => i.id === saved.id ? { ...i, ...saved } : i);
      return [...prev, saved];
    });
    setModalDef(null);
  };

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>Integrationer</h1>
        <p style={{ fontSize: 14, color: C.secondary }}>Koppla pixdrift till era befintliga ERP-, bokförings- och kommunikationssystem.</p>
      </div>

      {/* Search + action bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.tertiary, fontSize: 14 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Sök system..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: C.surface }}
          />
        </div>
        <button
          onClick={() => { setModalDef({ provider: 'custom', display_name: 'Anpassad integration', category: 'erp', description: 'Konfigurera en anpassad webhook eller REST-integration.', auth_types: ['api_key', 'basic', 'oauth2'] }); setModalIntegration(undefined); }}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: C.blue, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          + Ny integration
        </button>
      </div>

      {/* Active integrations */}
      {activeIntegrations.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Aktiva integrationer ({activeIntegrations.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {activeIntegrations.map(i => {
              const def = PROVIDERS.find(p => p.provider === i.provider) ?? { provider: i.provider, display_name: i.name, category: 'erp' as const, description: '', auth_types: ['api_key'] };
              return (
                <IntegrationCard key={i.id} def={def} connected={true} integration={i}
                  onConnect={() => openConnect(def)} onManage={() => openConnect(def)} />
              );
            })}
          </div>
        </section>
      )}

      {/* Category sections */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.tertiary }}>Laddar...</div>
      ) : (
        CATEGORIES.map(cat => {
          const providers = filteredProviders.filter(p => p.category === cat.id);
          if (!providers.length) return null;
          return (
            <section key={cat.id} style={{ marginBottom: 32 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat.label}</h2>
                <span style={{ fontSize: 11, color: C.tertiary, background: C.fill, borderRadius: 10, padding: '2px 8px' }}>{providers.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {providers.map(def => (
                  <IntegrationCard
                    key={def.provider}
                    def={def}
                    connected={!!getIntegration(def.provider)}
                    integration={getIntegration(def.provider)}
                    onConnect={() => openConnect(def)}
                    onManage={() => openConnect(def)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Custom webhook info */}
      <section style={{ background: C.blueLight, borderRadius: 14, padding: 20, marginTop: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.blue, marginBottom: 6 }}>🔗 Generisk Webhook & REST-polling</div>
        <p style={{ fontSize: 13, color: C.secondary, lineHeight: 1.5 }}>
          Saknas ditt system? Använd vår generiska webhook-mottagare (<code style={{ fontSize: 11, background: '#fff', padding: '1px 5px', borderRadius: 4 }}>POST /api/integrations/webhook/:id</code>) 
          eller konfigurera REST-polling för system utan webhooks. Stöd för fritt konfigurerbara fältkartläggningar.
        </p>
        <button
          onClick={() => openConnect({ provider: 'custom', display_name: 'Generisk Webhook', category: 'automation', description: 'Webhook eller REST-polling mot valfritt system.', auth_types: ['api_key', 'basic', 'oauth2'] })}
          style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.blue}`, background: '#fff', color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Konfigurera →
        </button>
      </section>

      {/* Config modal */}
      {modalDef && (
        <ConfigModal
          def={modalDef}
          integration={modalIntegration}
          onClose={() => setModalDef(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default IntegrationsHub;
