/**
 * TaxComplianceModule — Skatteefterlevnad för pixdrift OMS
 *
 * Vyer:
 *  1. Personalliggare (SFL 39 kap.)
 *  2. Kassajournal (SKVFS 2014:9)
 *  3. Momsöversikt (ML 2023:200)
 *  4. Löneunderlag (SAL + IL)
 *  5. Compliance-check (automatisk kontroll)
 */

import React, { useState, useEffect, useCallback } from 'react';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001';

function apiGet(path: string): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}/api${path}`, { headers }).then(r => r.json());
}

function apiPost(path: string, body: unknown): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}/api${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || r.statusText); return d; });
}

// ─── Typer ──────────────────────────────────────────────────────────────────
interface Workplace {
  id: string;
  name: string;
  address: string;
  requires_personnel_ledger: boolean;
  requires_cash_register: boolean;
  industry_code?: string;
}

interface PresentPerson {
  checkin_id: string;
  name: string;
  personal_number_masked: string;
  role: string;
  checkin_time: string;
  minutes_present: number;
}

interface CashTransaction {
  id: string;
  receipt_number: number;
  transaction_time: string;
  gross_amount: string;
  vat_25: string;
  vat_12: string;
  vat_6: string;
  payment_method: string;
  voided: boolean;
}

interface ComplianceCheck {
  requirement: string;
  law: string;
  required: boolean;
  compliant: boolean | null;
  issues: string[];
  warnings: string[];
  next_due_date?: string;
  fine_amount?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatSEK(amount: string | number): string {
  return Number(amount).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#7c3aed'
  };
  return (
    <span style={{
      background: colors[risk] || '#6b7280',
      color: '#fff', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 13
    }}>
      {risk}
    </span>
  );
}

function ComplianceIcon({ compliant }: { compliant: boolean | null }) {
  if (compliant === null) return <span title="Ej kontrollerbar">⚪</span>;
  return compliant ? <span title="OK">✅</span> : <span title="Problem">🔴</span>;
}

// ─── Personalliggare ─────────────────────────────────────────────────────────
function PersonnelLedgerView({ workplaces }: { workplaces: Workplace[] }) {
  
  const [selectedWp, setSelectedWp] = useState<string>(workplaces[0]?.id || '');
  const [pnr, setPnr] = useState('');
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [employerOrg, setEmployerOrg] = useState('');
  const [pnrValidation, setPnrValidation] = useState<any>(null);
  const [present, setPresent] = useState<PresentPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const ledgerWorkplaces = workplaces.filter(w => w.requires_personnel_ledger);

  const loadPresent = useCallback(async () => {
    if (!selectedWp) return;
    const data = await apiGet(`/personnel-ledger/present?workplace_id=${selectedWp}`);
    setPresent(data?.present || []);
  }, [selectedWp]);

  useEffect(() => { loadPresent(); }, [loadPresent]);

  const validatePnr = async (value: string) => {
    if (value.length >= 10) {
      const result = await apiPost('/personnel-ledger/validate-personal-number', { number: value });
      setPnrValidation(result);
    } else {
      setPnrValidation(null);
    }
  };

  const handleCheckin = async () => {
    if (!pnr || !role || !selectedWp || !employerOrg) {
      setMessage('Fyll i alla obligatoriska fält');
      return;
    }
    if (!pnrValidation?.valid) {
      setMessage('Ogiltigt personnummer — kontrollera och försök igen');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/personnel-ledger/checkin', {
        personal_number: pnr,
        workplace_id: selectedWp,
        role,
        full_name: name,
        employer_org_number: employerOrg,
      });
      setMessage('✅ Incheckad!');
      setPnr(''); setRole(''); setName(''); setPnrValidation(null);
      await loadPresent();
    } catch (e: any) {
      setMessage(`Fel: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (checkinId: string) => {
    await apiPost('/personnel-ledger/checkout', {
      checkin_id: checkinId, workplace_id: selectedWp
    });
    await loadPresent();
  };

  const exportXml = () => {
    const now = new Date();
    window.open(
      `/api/personnel-ledger/export/skatteverket?workplace_id=${selectedWp}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      '_blank'
    );
  };

  if (ledgerWorkplaces.length === 0) {
    return (
      <div style={styles.card}>
        <h3>⚠️ Ingen arbetsplats kräver personalliggare</h3>
        <p>Om din bransch kräver personalliggare (SFL 39:10), konfigurera arbetsplatsen i Inställningar.</p>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          Branscher: Byggverksamhet (SNI 41-43), Restaurang (56), Tvätteri (9601),
          Frisör/skönhet (9602), Kroppsvård (9604), Biltvätt (4520)
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>📋 Personalliggare</h3>
          <span style={styles.lawTag}>SFL 39 kap. 9-12§§</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Arbetsplats *</label>
          <select
            style={styles.select}
            value={selectedWp}
            onChange={e => setSelectedWp(e.target.value)}
          >
            {ledgerWorkplaces.map(wp => (
              <option key={wp.id} value={wp.id}>{wp.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Personnummer / Samordningsnummer *</label>
            <input
              style={{
                ...styles.input,
                borderColor: pnrValidation ? (pnrValidation.valid ? '#22c55e' : '#ef4444') : undefined
              }}
              value={pnr}
              onChange={e => { setPnr(e.target.value); validatePnr(e.target.value); }}
              placeholder="YYYYMMDD-XXXX"
              maxLength={13}
            />
            {pnrValidation && (
              <div style={{ fontSize: 12, color: pnrValidation.valid ? '#22c55e' : '#ef4444', marginTop: 2 }}>
                {pnrValidation.message}
                {pnrValidation.valid && ` • ${pnrValidation.type === 'coordination' ? 'Samordningsnummer' : 'Personnummer'}`}
              </div>
            )}
          </div>

          <div>
            <label style={styles.label}>Fullständigt namn</label>
            <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="För- och efternamn" />
          </div>

          <div>
            <label style={styles.label}>Roll / Befattning *</label>
            <input style={styles.input} value={role} onChange={e => setRole(e.target.value)} placeholder="T.ex. Kock, Snickare, Kassör" />
          </div>

          <div>
            <label style={styles.label}>Arbetsgivare org.nr *</label>
            <input style={styles.input} value={employerOrg} onChange={e => setEmployerOrg(e.target.value)} placeholder="XXXXXXXXXX" />
          </div>
        </div>

        <button style={styles.btnPrimary} onClick={handleCheckin} disabled={loading}>
          {loading ? 'Registrerar...' : '🟢 STÄMPLA IN'}
        </button>

        {message && <div style={{ marginTop: 8, padding: 8, background: '#f0fdf4', borderRadius: 6, fontSize: 13 }}>{message}</div>}
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>👥 På arbetsplatsen just nu ({present.length} st)</h4>
          <button style={styles.btnSecondary} onClick={exportXml}>📥 Exportera XML (Skatteverket)</button>
        </div>

        {present.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Ingen incheckad just nu</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Namn</th>
                <th style={styles.th}>Personnummer</th>
                <th style={styles.th}>Roll</th>
                <th style={styles.th}>Incheckad</th>
                <th style={styles.th}>Tid</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {present.map(p => (
                <tr key={p.checkin_id}>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}><code>{p.personal_number_masked}</code></td>
                  <td style={styles.td}>{p.role}</td>
                  <td style={styles.td}>{formatTime(p.checkin_time)}</td>
                  <td style={styles.td}>{Math.floor(p.minutes_present / 60)}h {p.minutes_present % 60}m</td>
                  <td style={styles.td}>
                    <button style={styles.btnDanger} onClick={() => handleCheckout(p.checkin_id)}>
                      🔴 Stämpla ut
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Kassajournal ─────────────────────────────────────────────────────────────
function CashRegisterView({ workplaces }: { workplaces: Workplace[] }) {
  
  const [selectedWp, setSelectedWp] = useState<string>(workplaces[0]?.id || '');
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [zLoading, setZLoading] = useState(false);

  const cashWorkplaces = workplaces.filter(w => w.requires_cash_register);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!selectedWp) return;
    apiGet(`/cash-register/journal?workplace_id=${selectedWp}&from_date=${today}&to_date=${today}`)
      .then(d => setTransactions(d?.transactions || []));
    apiGet(`/cash-register/status?workplace_id=${selectedWp}`)
      .then(setStatus);
  }, [selectedWp]);

  const createZReport = async () => {
    setZLoading(true);
    try {
      await apiPost(`/cash-register/z-report?workplace_id=${selectedWp}&date=${today}`, {});
      alert('✅ Z-rapport skapad och sparad!');
    } catch (e: any) {
      alert(`Fel: ${e.message}`);
    } finally {
      setZLoading(false);
    }
  };

  const reprintReceipt = (receiptNumber: number) => {
    window.open(`/api/cash-register/receipt/${receiptNumber}?print=1`, '_blank');
  };

  return (
    <div>
      {status && (
        <div style={{ ...styles.card, background: status.z_report_done_today ? '#f0fdf4' : '#fef2f2' }}>
          <div style={styles.header}>
            <h3 style={styles.title}>🏪 Kassastatus — {today}</h3>
            {status.warning && <span style={{ color: '#ef4444', fontSize: 13 }}>⚠️ {status.warning}</span>}
          </div>
          <div style={styles.statsGrid}>
            <div style={styles.stat}><div style={styles.statValue}>{formatSEK(status.today_total_sales)}</div><div style={styles.statLabel}>Dagens försäljning</div></div>
            <div style={styles.stat}><div style={styles.statValue}>{status.today_transaction_count}</div><div style={styles.statLabel}>Transaktioner idag</div></div>
            <div style={styles.stat}>
              <div style={styles.statValue}>{status.z_report_done_today ? '✅' : '❌'}</div>
              <div style={styles.statLabel}>Z-rapport idag</div>
            </div>
          </div>
          {!status.z_report_done_today && status.today_transaction_count > 0 && (
            <button style={styles.btnPrimary} onClick={createZReport} disabled={zLoading}>
              {zLoading ? 'Skapar...' : '📊 Skapa Z-rapport (stäng dagen)'}
            </button>
          )}
        </div>
      )}

      <div style={styles.card}>
        <div style={{ ...styles.infoBox, background: '#fef9c3', borderColor: '#fde047' }}>
          <strong>⚠️ VIKTIGT — Kontrollenhet (CE)</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>
            pixdrift är kassasystem (mjukvara) men ersätter <strong>INTE</strong> en certifierad kontrollenhet.
            Godkänd CE krävs enligt SKVFS 2014:9. Se <code>TAX_COMPLIANCE.md</code> för leverantörer.
          </p>
        </div>

        <h4 style={{ marginTop: 16 }}>📋 Dagens transaktioner</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Kvitto nr</th>
              <th style={styles.th}>Tid</th>
              <th style={styles.th}>Belopp</th>
              <th style={styles.th}>Moms 25%</th>
              <th style={styles.th}>Moms 12%</th>
              <th style={styles.th}>Moms 6%</th>
              <th style={styles.th}>Betalsätt</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} style={tx.voided ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                <td style={styles.td}><strong>#{tx.receipt_number}</strong></td>
                <td style={styles.td}>{formatTime(tx.transaction_time)}</td>
                <td style={styles.td}>{formatSEK(tx.gross_amount)}</td>
                <td style={styles.td}>{Number(tx.vat_25) > 0 ? formatSEK(tx.vat_25) : '-'}</td>
                <td style={styles.td}>{Number(tx.vat_12) > 0 ? formatSEK(tx.vat_12) : '-'}</td>
                <td style={styles.td}>{Number(tx.vat_6)  > 0 ? formatSEK(tx.vat_6)  : '-'}</td>
                <td style={styles.td}>{tx.payment_method}</td>
                <td style={styles.td}>
                  <button style={styles.btnSmall} onClick={() => reprintReceipt(tx.receipt_number)}>🖨️ Kopia</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>Inga transaktioner idag</p>
        )}
      </div>
    </div>
  );
}

// ─── Momsöversikt ─────────────────────────────────────────────────────────────
function VatOverviewView() {
  
  const now  = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [period, setPeriod] = useState(String(now.getMonth() + 1));
  const [declaration, setDeclaration] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadDeclaration = async () => {
    setLoading(true);
    const data = await apiGet(`/vat/declaration?year=${year}&period=${period}`);
    setDeclaration(data);
    setLoading(false);
  };

  useEffect(() => { loadDeclaration(); }, [year, period]);

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>💰 Momsöversikt</h3>
          <span style={styles.lawTag}>ML 2023:200</span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={styles.label}>År</label>
            <select style={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label}>Period</label>
            <select style={styles.select} value={period} onChange={e => setPeriod(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i, 1).toLocaleString('sv-SE', { month: 'long' })}
                </option>
              ))}
              <option value="Q1">Kvartal 1</option>
              <option value="Q2">Kvartal 2</option>
              <option value="Q3">Kvartal 3</option>
              <option value="Q4">Kvartal 4</option>
            </select>
          </div>
        </div>

        {loading && <p>Laddar...</p>}

        {declaration && (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.stat}>
                <div style={{ ...styles.statValue, color: '#ef4444' }}>
                  {formatSEK(declaration.outgoing_vat?.total || 0)}
                </div>
                <div style={styles.statLabel}>Utgående moms (att betala)</div>
              </div>
              <div style={styles.stat}>
                <div style={{ ...styles.statValue, color: '#22c55e' }}>
                  {formatSEK(declaration.incoming_vat?.total || 0)}
                </div>
                <div style={styles.statLabel}>Ingående moms (att återfå)</div>
              </div>
              <div style={styles.stat}>
                <div style={{ ...styles.statValue, color: declaration.net_vat > 0 ? '#ef4444' : '#22c55e' }}>
                  {formatSEK(Math.abs(declaration.net_vat || 0))}
                </div>
                <div style={styles.statLabel}>
                  {declaration.action === 'BETALA_TILL_SKATTEVERKET' ? '⬆️ Att betala' : '⬇️ Att återfå'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: '#6b7280' }}>
              <div>
                Moms 25%: <strong>{formatSEK(declaration.outgoing_vat?.vat_25 || 0)}</strong>
              </div>
              <div>
                Moms 12%: <strong>{formatSEK(declaration.outgoing_vat?.vat_12 || 0)}</strong>
              </div>
              <div>
                Moms 6%: <strong>{formatSEK(declaration.outgoing_vat?.vat_6 || 0)}</strong>
              </div>
            </div>

            {declaration.due_date && (
              <div style={{ marginTop: 12, padding: 8, background: '#f0f9ff', borderRadius: 6, fontSize: 13 }}>
                📅 Förfallodatum: <strong>{declaration.due_date}</strong>
                {' '}(SFL 26:33 — 26:e månaden efter perioden)
              </div>
            )}

            <button style={{ ...styles.btnPrimary, marginTop: 12 }}>
              📄 Generera deklarationsunderlag
            </button>
          </>
        )}
      </div>

      <div style={styles.card}>
        <h4>Momssatser (ML 2023:200)</h4>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Sats</th>
              <th style={styles.th}>Tillämpning</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={styles.td}><strong>25%</strong></td><td style={styles.td}>Standardsats — de flesta varor och tjänster (ML 7:1)</td></tr>
            <tr><td style={styles.td}><strong>12%</strong></td><td style={styles.td}>Livsmedel, hotell, restaurang (mat ej alkohol), transport (ML 7:1 2st.)</td></tr>
            <tr><td style={styles.td}><strong>6%</strong></td><td style={styles.td}>Böcker, tidningar, kulturella tjänster, persontransport (ML 7:1 3st.)</td></tr>
            <tr><td style={styles.td}><strong>0%</strong></td><td style={styles.td}>Export, inomeuropeisk B2B-handel, undantag (ML 3 kap.)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Löneunderlag ─────────────────────────────────────────────────────────────
function PayrollView() {
  
  const [grossSalary, setGrossSalary] = useState('');
  const [birthYear, setBirthYear]     = useState('');
  const [municipality, setMunicipality] = useState('Stockholm');
  const [result, setResult] = useState<any>(null);
  const [contribs, setContribs] = useState<any>(null);

  const calculate = async () => {
    const [taxRes, contribRes] = await Promise.all([
      apiPost('/payroll/calculate-tax-deduction', {
        gross_salary: Number(grossSalary), municipality, birth_year: Number(birthYear)
      }),
      apiPost('/payroll/calculate-employer-contributions', {
        gross_salary: Number(grossSalary), birth_year: Number(birthYear)
      }),
    ]);
    setResult(taxRes);
    setContribs(contribRes);
  };

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>💼 Löneberäkning</h3>
          <span style={styles.lawTag}>SAL 2000:980 + IL 1999:1229</span>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Bruttolön (kr/mån)</label>
            <input style={styles.input} type="number" value={grossSalary} onChange={e => setGrossSalary(e.target.value)} placeholder="35000" />
          </div>
          <div>
            <label style={styles.label}>Födelseår</label>
            <input style={styles.input} type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1985" />
          </div>
          <div>
            <label style={styles.label}>Kommun</label>
            <input style={styles.input} value={municipality} onChange={e => setMunicipality(e.target.value)} placeholder="Stockholm" />
          </div>
        </div>

        <button style={styles.btnPrimary} onClick={calculate}>Beräkna</button>

        {result && contribs && (
          <div style={{ marginTop: 16 }}>
            <table style={styles.table}>
              <tbody>
                <tr><td style={styles.td}>Bruttolön</td><td style={{ ...styles.td, textAlign: 'right' }}><strong>{formatSEK(result.gross_salary)}</strong></td></tr>
                <tr><td style={styles.td}>Grundavdrag (IL 63 kap.)</td><td style={{ ...styles.td, textAlign: 'right' }}>{formatSEK(result.grundavdrag)}</td></tr>
                <tr><td style={styles.td}>Kommunalskatt ({(result.municipal_rate * 100).toFixed(1)}%)</td><td style={{ ...styles.td, textAlign: 'right', color: '#ef4444' }}>-{formatSEK(result.kommunalskatt)}</td></tr>
                <tr><td style={styles.td}>Statlig skatt</td><td style={{ ...styles.td, textAlign: 'right', color: result.statlig_skatt > 0 ? '#ef4444' : '#6b7280' }}>{result.statlig_skatt > 0 ? `-${formatSEK(result.statlig_skatt)}` : '-'}</td></tr>
                <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>Nettolön</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{formatSEK(result.net_salary)}</td>
                </tr>
                <tr style={{ background: '#f9fafb' }}>
                  <td style={styles.td}>Arbetsgivaravgift ({contribs.rate_percent})</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#f59e0b' }}>{formatSEK(contribs.employer_contribution)}</td>
                </tr>
                <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                  <td style={styles.td}>Total kostnad för arbetsgivaren</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{formatSEK(contribs.total_employer_cost)}</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
              * Approximation. Exakt beräkning via Skatteverkets skattetabeller (SKV 425).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compliance-check ─────────────────────────────────────────────────────────
function ComplianceCheckView({ orgId, industryCode }: { orgId: string; industryCode?: string }) {
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    const data = await apiPost('/compliance/check', { org_id: orgId, industry_code: industryCode });
    setResult(data);
    setLoading(false);
  };

  useEffect(() => { runCheck(); }, []);

  return (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={styles.header}>
            <h3 style={styles.title}>🔍 Compliance-kontroll</h3>
            {result && <RiskBadge risk={result.overall_risk} />}
          </div>
          <button style={styles.btnSecondary} onClick={runCheck} disabled={loading}>
            {loading ? 'Kontrollerar...' : '🔄 Uppdatera'}
          </button>
        </div>

        {result?.next_action && (
          <div style={{ padding: 10, background: '#fef9c3', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            <strong>Nästa åtgärd:</strong> {result.next_action}
          </div>
        )}

        {result?.checks?.map((check: ComplianceCheck, i: number) => (
          <div key={i} style={{
            ...styles.checkItem,
            borderLeftColor: check.compliant === false ? '#ef4444'
              : check.compliant === true ? '#22c55e'
              : '#6b7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ComplianceIcon compliant={check.compliant} />
              <strong>{check.requirement}</strong>
              {!check.required && <span style={{ fontSize: 11, color: '#6b7280' }}>(ej obligatoriskt för denna bransch)</span>}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📜 {check.law}</div>

            {check.issues.map((issue, j) => (
              <div key={j} style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>❌ {issue}</div>
            ))}
            {check.warnings.map((warn, j) => (
              <div key={j} style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>⚠️ {warn}</div>
            ))}
            {check.next_due_date && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>📅 Nästa förfallodatum: <strong>{check.next_due_date}</strong></div>
            )}
            {check.fine_amount && check.compliant === false && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>💸 Möjlig bot: {check.fine_amount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Huvudkomponent ────────────────────────────────────────────────────────────
type Tab = 'personalliggare' | 'kassa' | 'moms' | 'lon' | 'compliance';

interface TaxComplianceModuleProps {
  orgId: string;
  industryCode?: string;
}

export default function TaxComplianceModule({ orgId, industryCode }: TaxComplianceModuleProps) {
  
  const [activeTab, setActiveTab] = useState<Tab>('compliance');
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);

  useEffect(() => {
    apiGet('/personnel-ledger/workplaces').then(setWorkplaces).catch(() => {});
  }, []);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'compliance',      label: 'Compliance',      icon: '🔍' },
    { key: 'personalliggare', label: 'Personalliggare', icon: '📋' },
    { key: 'kassa',           label: 'Kassajournal',    icon: '🏪' },
    { key: 'moms',            label: 'Moms',            icon: '💰' },
    { key: 'lon',             label: 'Löneunderlag',    icon: '💼' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h2 style={{ margin: 0 }}>🇸🇪 Skatteefterlevnad</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
          pixdrift — Compliance med SFL, ML, BFL och SKVFS
        </p>
      </div>

      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.key ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'compliance'      && <ComplianceCheckView orgId={orgId} industryCode={industryCode} />}
        {activeTab === 'personalliggare' && <PersonnelLedgerView workplaces={workplaces} />}
        {activeTab === 'kassa'           && <CashRegisterView workplaces={workplaces} />}
        {activeTab === 'moms'            && <VatOverviewView />}
        {activeTab === 'lon'             && <PayrollView />}
      </div>
    </div>
  );
}

// ─── Stilar ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container:    { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111827', maxWidth: 1100, margin: '0 auto', padding: 16 },
  pageHeader:   { marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 12 },
  tabBar:       { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 4 },
  tabBtn:       { padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0', fontSize: 14, color: '#6b7280', fontWeight: 500 },
  tabBtnActive: { background: '#eff6ff', color: '#2563eb', fontWeight: 700 },
  tabContent:   { minHeight: 400 },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  header:       { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  title:        { margin: 0, fontSize: 18 },
  lawTag:       { fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontFamily: 'monospace' },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' },
  input:        { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const },
  select:       { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 },
  formGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  btnPrimary:   { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  btnDanger:    { background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnSmall:     { background: '#f3f4f6', border: '1px solid #d1d5db', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  table:        { width: '100%', borderCollapse: 'collapse' as const },
  th:           { textAlign: 'left' as const, padding: '8px 10px', background: '#f9fafb', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' },
  td:           { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' as const },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 },
  stat:         { textAlign: 'center' as const, padding: 12, background: '#f9fafb', borderRadius: 8 },
  statValue:    { fontSize: 22, fontWeight: 700 },
  statLabel:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  infoBox:      { padding: 12, border: '1px solid', borderRadius: 6, marginBottom: 12 },
  checkItem:    { padding: 12, borderLeft: '4px solid', borderRadius: '0 6px 6px 0', marginBottom: 10, background: '#fafafa' },
};
