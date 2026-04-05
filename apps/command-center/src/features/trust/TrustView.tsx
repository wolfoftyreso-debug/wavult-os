import { useState, useEffect } from 'react'
import { ALL_TRUST_JURISDICTIONS, WAVULT_RECOMMENDED_STRUCTURE, TrustJurisdiction, TrustSetupStep } from './trustData'

// ─── Reactive summary data ────────────────────────────────────────────────────
const totalJurisdictions = ALL_TRUST_JURISDICTIONS.length
const minSetupCost = Math.min(...ALL_TRUST_JURISDICTIONS.map(j => j.setup_cost_usd))
const zeroTaxCount = ALL_TRUST_JURISDICTIONS.filter(j => j.tax_rate.startsWith('0%')).length
const recommendedJurisdiction = ALL_TRUST_JURISDICTIONS.find(j => j.id === WAVULT_RECOMMENDED_STRUCTURE.tier1)
const recommendedName = recommendedJurisdiction
  ? `${recommendedJurisdiction.flag} ${recommendedJurisdiction.name.split('(')[0].trim()}`
  : 'DIFC'
const cheapestJurisdiction = ALL_TRUST_JURISDICTIONS.find(j => j.setup_cost_usd === minSetupCost)

const SUMMARY_CARDS = [
  {
    label: `${totalJurisdictions} jurisdiktioner`,
    sub: 'fullständigt dokumenterade',
  },
  {
    label: `${recommendedName} rekommenderad`,
    sub: 'Wavults förstahandsval',
  },
  {
    label: `Från $${(minSetupCost / 1000).toFixed(0)}k setup`,
    sub: `${cheapestJurisdiction?.name.split(' ')[0] ?? 'BVI'} lägsta kostnad`,
  },
  {
    label: `0% skatt på ${zeroTaxCount} av ${totalJurisdictions}`,
    sub: 'jurisdiktioner utan kapitalvinstskatt',
  },
]

// ─── Colours ──────────────────────────────────────────────────────────────────
const CREAM  = '#F5F0E8'
const NAVY   = '#0A3D62'
const GOLD   = '#E8B84B'
const GREEN  = '#16a34a'
const RED    = '#dc2626'

// ─── Category meta ────────────────────────────────────────────────────────────
const CAT_META: Record<string, { label: string; icon: string; color: string }> = {
  legal:         { label: 'Legal',          icon: '⚖️',  color: '#0A3D62' },
  banking:       { label: 'Banking',        icon: '🏦',  color: '#065f46' },
  registration:  { label: 'Registrering',   icon: '📝',  color: '#92400e' },
  documentation: { label: 'Dokumentation',  icon: '📄',  color: '#7c3aed' },
  tax:           { label: 'Skatt',          icon: '🧾',  color: '#be123c' },
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const JURISDICTION_TABS = [
  { id: 'compare',        label: '🌍 Jämför',        short: 'Jämför' },
  { id: 'difc',          label: '🎯 DIFC',           short: 'DIFC' },
  { id: 'jersey',        label: '🏝️ Jersey',         short: 'Jersey' },
  { id: 'bvi',           label: '🏴 BVI',            short: 'BVI' },
  { id: 'cayman',        label: '🌊 Cayman',         short: 'Cayman' },
  { id: 'liechtenstein', label: '🇱🇮 Liechtenstein', short: 'Liechtenstein' },
  { id: 'singapore',     label: '🇸🇬 Singapore',     short: 'Singapore' },
  { id: 'recommendation',label: '💡 Rekommendation', short: 'Rekommendation' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtUSD(n: number) {
  return `$${n.toLocaleString('sv-SE')}`
}

function totalSetupCost(j: TrustJurisdiction) {
  return j.setup_steps.reduce((s, st) => s + (st.cost_usd ?? 0), 0)
}

// ─── Tax color ───────────────────────────────────────────────────────────────
function taxColor(rate: string): string {
  if (rate.startsWith('0%')) return GREEN
  if (rate.includes('12') || rate.includes('17')) return RED
  return '#d97706'
}

// ─── TrustFormData ────────────────────────────────────────────────────────────
interface TrustFormData {
  jurisdiction_id: string
  trust_name: string
  trust_type: 'discretionary' | 'purpose' | 'foundation' | 'vista'
  settlor_name: string
  settlor_email: string
  beneficiaries: string
  assets: string
  estimated_value_usd: string
  notes: string
}

// ─── CreateTrustModal ─────────────────────────────────────────────────────────
function CreateTrustModal({ jurisdictionId, onClose, onCreated }: {
  jurisdictionId: string
  onClose: () => void
  onCreated: (trust: Record<string, unknown>) => void
}) {
  const jurisdiction = ALL_TRUST_JURISDICTIONS.find(j => j.id === jurisdictionId)!
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<TrustFormData>({
    jurisdiction_id: jurisdictionId,
    trust_name: '',
    trust_type: 'discretionary',
    settlor_name: 'Erik Svensson',
    settlor_email: 'erik@hypbit.com',
    beneficiaries: '',
    assets: '',
    estimated_value_usd: '',
    notes: '',
  })
  const [creating, setCreating] = useState(false)

  function update(field: keyof TrustFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    setCreating(true)
    const trust = {
      id: `trust-${Date.now()}`,
      ...form,
      jurisdiction: jurisdiction.name,
      jurisdiction_flag: jurisdiction.flag,
      status: 'establishing',
      created_at: new Date().toISOString(),
      steps: jurisdiction.setup_steps.map(s => ({ ...s, status: 'not_started' })),
      total_cost_usd: jurisdiction.setup_cost_usd,
      annual_cost_usd: jurisdiction.annual_cost_usd,
      estimated_completion: new Date(Date.now() + jurisdiction.setup_weeks * 7 * 86400000).toISOString().slice(0,10),
    }

    const existing = JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]')
    localStorage.setItem('wavult_trusts', JSON.stringify([trust, ...existing]))

    const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'
    fetch(`${API}/api/trusts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer bypass' },
      body: JSON.stringify(trust),
    }).catch(() => {})

    setCreating(false)
    onCreated(trust)
  }

  const TRUST_TYPES: { value: TrustFormData['trust_type']; label: string; desc: string }[] = [
    { value: 'discretionary', label: 'Discretionary Trust', desc: 'Trustee beslutar om utdelningar' },
    { value: 'purpose', label: 'Purpose Trust', desc: 'Specificerat syfte — t.ex. välgörenhet' },
    { value: 'foundation', label: 'Foundation', desc: 'Separat juridisk person' },
    { value: 'vista', label: 'VISTA Trust (BVI)', desc: 'Aktieägarskydd i bolag' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
    color: NAVY, background: 'white', boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#64748b',
    letterSpacing: '0.06em', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,61,98,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: CREAM, borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(10,61,98,0.25)',
      }}>
        {/* Modal header */}
        <div style={{
          background: NAVY, borderRadius: '20px 20px 0 0',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{jurisdiction.flag}</span>
            <div>
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>NY TRUST</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{jurisdiction.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{jurisdiction.governing_law}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ flex: 1 }}>
              <div style={{
                height: 3, borderRadius: 3,
                background: n <= step ? GOLD : '#e2e8f0',
                transition: 'background 0.2s',
              }} />
              <div style={{
                fontSize: 10, fontWeight: 700, marginTop: 4,
                color: n <= step ? NAVY : '#94a3b8',
              }}>
                {n === 1 ? 'Grundinfo' : n === 2 ? 'Parter' : 'Tillgångar'}
              </div>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding: '20px 24px 24px' }}>

          {/* STEG 1: Grundinfo */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: NAVY, fontSize: 15, fontWeight: 700 }}>Grundläggande information</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Namnge din trust och välj typ.</p>
              </div>

              <div>
                <label style={labelStyle}>TRUST-NAMN *</label>
                <input
                  style={inputStyle}
                  placeholder="t.ex. Wavult Family Trust 2026"
                  value={form.trust_name}
                  onChange={e => update('trust_name', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>TYP AV TRUST *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TRUST_TYPES.map(t => (
                    <div
                      key={t.value}
                      onClick={() => update('trust_type', t.value)}
                      style={{
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${form.trust_type === t.value ? GOLD : '#e2e8f0'}`,
                        background: form.trust_type === t.value ? `${GOLD}18` : 'white',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jurisdiktion (read-only) */}
              <div style={{ background: 'white', borderRadius: 10, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 6 }}>JURISDIKTION</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>{jurisdiction.flag}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: NAVY, fontSize: 13 }}>{jurisdiction.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{jurisdiction.governing_law}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEG 2: Parter */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: NAVY, fontSize: 15, fontWeight: 700 }}>Parter i trusten</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Settlor, skyddare och förmånstagare.</p>
              </div>

              <div>
                <label style={labelStyle}>SETTLOR (STIFTARE) — NAMN *</label>
                <input
                  style={inputStyle}
                  placeholder="Fullständigt namn"
                  value={form.settlor_name}
                  onChange={e => update('settlor_name', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>SETTLOR — E-POST *</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="e-postadress"
                  value={form.settlor_email}
                  onChange={e => update('settlor_email', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>FÖRMÅNSTAGARE (BENEFICIARIES)</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  placeholder="Kommaseparerade namn, t.ex. Eva Svensson, Johan Svensson"
                  value={form.beneficiaries}
                  onChange={e => update('beneficiaries', e.target.value)}
                />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Separera flera förmånstagare med komma</div>
              </div>

              <div style={{ background: `${GOLD}18`, borderRadius: 10, padding: '12px 14px', border: `1.5px solid ${GOLD}60` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>ℹ️ Protector (skyddare)</div>
                <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                  Protector utses av er juridiska rådgivare efter trust-registrering. Kontakta trustee-partner för detta steg.
                </div>
              </div>
            </div>
          )}

          {/* STEG 3: Tillgångar + bekräftelse */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: NAVY, fontSize: 15, fontWeight: 700 }}>Tillgångar & bekräftelse</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Beskriv tillgångarna och bekräfta etableringen.</p>
              </div>

              <div>
                <label style={labelStyle}>TILLGÅNGAR ATT ÖVERLÅTA TILL TRUSTEN</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  placeholder="t.ex. Aktierna i Wavult Group DMCC, IP-rättigheter, bankkonton..."
                  value={form.assets}
                  onChange={e => update('assets', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>UPPSKATTAT VÄRDE (USD)</label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="t.ex. 1000000"
                  value={form.estimated_value_usd}
                  onChange={e => update('estimated_value_usd', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>ANTECKNINGAR</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                  placeholder="Övriga kommentarer eller instruktioner..."
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                />
              </div>

              {/* Kostnadssummering */}
              <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: `1.5px solid ${GOLD}60` }}>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 13, marginBottom: 12 }}>💰 Kostnadssummering</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Setup-kostnad (engång)</span>
                  <span style={{ fontWeight: 700, color: NAVY }}>{fmtUSD(jurisdiction.setup_cost_usd)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Årsavgift (trustee + admin)</span>
                  <span style={{ fontWeight: 700, color: NAVY }}>{fmtUSD(jurisdiction.annual_cost_usd)}/år</span>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Total år 1</span>
                  <span style={{ fontWeight: 800, color: GOLD, fontSize: 15 }}>{fmtUSD(jurisdiction.setup_cost_usd + jurisdiction.annual_cost_usd)}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                  Beräknad färdigtid: ~{jurisdiction.setup_weeks} veckor
                </div>
              </div>

              {/* Trust overview */}
              <div style={{ background: CREAM, borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: 8 }}>📋 Sammanfattning</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div><span style={{ color: '#94a3b8' }}>Namn: </span><strong>{form.trust_name || '—'}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>Typ: </span><strong>{form.trust_type}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>Settlor: </span><strong>{form.settlor_name || '—'}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>Jurisdiktion: </span><strong>{jurisdiction.flag} {jurisdiction.name}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${NAVY}`,
                  background: 'transparent', color: NAVY, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                ← Tillbaka
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !form.trust_name.trim()) {
                    alert('Ange ett namn för trusten')
                    return
                  }
                  setStep(s => s + 1)
                }}
                style={{
                  flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                  background: NAVY, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Nästa steg →
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating || !form.trust_name.trim()}
                style={{
                  flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                  background: creating ? '#94a3b8' : GOLD, color: creating ? 'white' : NAVY,
                  fontWeight: 800, fontSize: 13, cursor: creating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {creating ? '⟳ Skapar...' : '🚀 Skapa Trust'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TrustProjectCard ─────────────────────────────────────────────────────────
function TrustProjectCard({ trust, onUpdate }: { trust: Record<string, unknown>; onUpdate: () => void }) {
  const steps = (trust.steps as Array<Record<string, unknown>>) ?? []
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const totalSteps = steps.length
  const nextStep = steps.find(s => s.status !== 'completed')
  const [expanded, setExpanded] = useState(false)

  function markStepComplete(stepId: string) {
    const updated = {
      ...trust,
      steps: steps.map(s => s.id === stepId ? { ...s, status: 'completed' } : s),
    }
    const all: Record<string, unknown>[] = JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]')
    localStorage.setItem('wavult_trusts', JSON.stringify(
      all.map(t => t.id === trust.id ? updated : t)
    ))
    onUpdate()
  }

  const pct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid #e2e8f0', background: 'white', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{trust.jurisdiction_flag as string}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{trust.trust_name as string}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{trust.jurisdiction as string} · {trust.trust_type as string}</div>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          background: trust.status === 'active' ? '#dcfce7' : '#fef3c7',
          color: trust.status === 'active' ? '#15803d' : '#92400e',
        }}>
          {trust.status === 'active' ? '✓ Aktiv' : '⟳ Etableras'}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{completedSteps}/{totalSteps} steg klara</span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>~{trust.estimated_completion as string}</span>
        </div>
        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 6 }}>
          <div style={{ height: '100%', background: GOLD, borderRadius: 6, width: `${pct}%`, transition: 'width 0.3s' }} />
        </div>
        {nextStep && (
          <div style={{ marginTop: 8, fontSize: 12, color: NAVY, fontWeight: 600 }}>
            Nästa: {nextStep.title as string}
          </div>
        )}
      </div>

      {/* Expanded steps */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, i) => {
            const isCompleted = step.status === 'completed'
            const isActive = !isCompleted && (i === 0 || steps[i-1]?.status === 'completed')
            return (
              <div key={step.id as string} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px',
                borderRadius: 12,
                background: isCompleted ? '#f0fdf4' : isActive ? '#fffbeb' : '#f8fafc',
                border: isActive ? '1.5px solid #fcd34d' : '1.5px solid transparent',
              }}>
                <button
                  onClick={() => !isCompleted && markStepComplete(step.id as string)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isCompleted ? GREEN : '#d1d5db'}`,
                    background: isCompleted ? GREEN : 'transparent', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isCompleted ? 'default' : 'pointer', flexShrink: 0, marginTop: 1,
                    fontSize: 10,
                  }}
                >
                  {isCompleted && '✓'}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{step.title as string}</span>
                    {step.cost_usd != null && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>${(step.cost_usd as number).toLocaleString()}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{step.description as string}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>⏱ {step.duration as string}</div>
                </div>
              </div>
            )
          })}

          {/* Cost summary */}
          <div style={{ marginTop: 6, padding: '12px 14px', background: CREAM, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Setup-kostnad</span>
              <span style={{ fontWeight: 700 }}>${(trust.total_cost_usd as number)?.toLocaleString() ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Årsavgift</span>
              <span style={{ fontWeight: 700 }}>${(trust.annual_cost_usd as number)?.toLocaleString() ?? '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MyTrustsTab ──────────────────────────────────────────────────────────────
function MyTrustsTab({ onStartTrust }: { onStartTrust: (jurisdictionId: string) => void }) {
  const [trusts, setTrusts] = useState<Record<string, unknown>[]>(() =>
    JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]')
  )

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'
    fetch(`${API}/api/trusts`, {
      headers: { Authorization: 'Bearer bypass' },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.trusts?.length) {
          const local = JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]')
          const merged = [
            ...data.trusts,
            ...local.filter((l: Record<string, unknown>) =>
              !data.trusts.find((d: Record<string, unknown>) => d.id === l.id)
            ),
          ]
          setTrusts(merged)
        }
      })
      .catch(() => {}) // fallback till localStorage
  }, [])

  function reload() {
    setTrusts(JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]'))
  }

  if (trusts.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
      <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: NAVY }}>Inga trusts ännu</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12, color: '#64748b' }}>Välj en jurisdiktion och starta din första trust</p>
      <button
        onClick={() => onStartTrust('difc')}
        style={{
          padding: '10px 20px', borderRadius: 10, border: 'none',
          background: GOLD, color: NAVY, fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}
      >
        ⚡ Starta med DIFC (rekommenderat)
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: NAVY }}>Mina Trusts</h2>
        <button
          onClick={() => onStartTrust('difc')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: GOLD, color: NAVY, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}
        >
          + Ny Trust
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {trusts.map(trust => (
          <TrustProjectCard key={trust.id as string} trust={trust} onUpdate={reload} />
        ))}
      </div>
    </div>
  )
}

// ─── Compare Table ────────────────────────────────────────────────────────────
function CompareTable({ onSelect, onStartTrust }: { onSelect: (id: string) => void; onStartTrust: (id: string) => void }) {
  return (
    <div>
      <h2 style={{ color: NAVY, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Jurisdiktionsjämförelse — Trust & Foundation
      </h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        Klicka på en rad för att se fullständig detaljvy och setup-steg — eller ⚡ Starta nu direkt.
      </p>

      {/* Mobile cards */}
      <div style={{ display: 'none' }} className="mobile-cards">
        {ALL_TRUST_JURISDICTIONS.map(j => (
          <div key={j.id}
            style={{
              background: j.id === 'difc' ? `linear-gradient(135deg, ${NAVY}08, ${GOLD}15)` : 'white',
              border: `1.5px solid ${j.id === 'difc' ? GOLD : '#e2e8f0'}`,
              borderRadius: 12, padding: 16, marginBottom: 12,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span
                onClick={() => onSelect(j.id)}
                style={{ fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
              >
                {j.flag} {j.name}
              </span>
              {j.id === 'difc' && (
                <span style={{ background: GOLD, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  WAVULT
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, marginBottom: 10 }}>
              <div><span style={{ color: '#94a3b8' }}>Skatt:</span> <strong style={{ color: taxColor(j.tax_rate) }}>{j.tax_rate}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Setup:</span> <strong>{fmtUSD(j.setup_cost_usd)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Årsavgift:</span> <strong>{fmtUSD(j.annual_cost_usd)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Tid:</span> <strong>{j.setup_weeks} veckor</strong></div>
            </div>
            <button
              onClick={() => onStartTrust(j.id)}
              style={{
                width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                background: GOLD, color: NAVY, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              ⚡ Starta nu
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Jurisdiktion</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Typ</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Skattesats</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Setup-kostnad</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Årsavgift</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Setup-tid</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Publikt reg.</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Skatteavtal</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderRadius: '0 8px 0 0' }}>Starta</th>
            </tr>
          </thead>
          <tbody>
            {ALL_TRUST_JURISDICTIONS.map((j, i) => {
              const isRec = j.id === 'difc'
              const isEven = i % 2 === 0
              return (
                <tr
                  key={j.id}
                  style={{
                    background: isRec
                      ? `linear-gradient(135deg, ${NAVY}08, ${GOLD}18)`
                      : isEven ? CREAM : 'white',
                    borderLeft: isRec ? `3px solid ${GOLD}` : '3px solid transparent',
                  }}
                >
                  <td
                    style={{ padding: '11px 14px', cursor: 'pointer' }}
                    onClick={() => onSelect(j.id)}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{j.flag}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: NAVY }}>{j.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{j.structure}</div>
                      </div>
                      {isRec && (
                        <span style={{
                          background: GOLD, color: NAVY, fontSize: 9, fontWeight: 800,
                          padding: '2px 7px', borderRadius: 20, letterSpacing: '0.05em',
                        }}>WAVULT</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      background: j.type === 'trust' ? '#E8F0E8' : j.type === 'foundation' ? '#fce7f3' : '#d1fae5',
                      color: j.type === 'trust' ? '#0A3D62' : j.type === 'foundation' ? '#9d174d' : '#065f46',
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                    }}>
                      {j.type === 'trust' ? 'Trust' : j.type === 'foundation' ? 'Foundation' : 'Trust + Foundation'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    <strong style={{ color: taxColor(j.tax_rate), fontSize: 13 }}>{j.tax_rate}</strong>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 600 }}>
                    {fmtUSD(j.setup_cost_usd)}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    {fmtUSD(j.annual_cost_usd)}/år
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    <span style={{
                      color: j.setup_weeks <= 6 ? GREEN : j.setup_weeks <= 10 ? '#d97706' : RED,
                      fontWeight: 600,
                    }}>
                      {j.setup_weeks} v
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    {j.public_register
                      ? <span style={{ color: RED, fontWeight: 600 }}>✓ Ja</span>
                      : <span style={{ color: GREEN, fontWeight: 600 }}>✗ Nej</span>
                    }
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    {j.tax_treaty
                      ? <span style={{ color: GREEN, fontWeight: 600 }}>✓</span>
                      : <span style={{ color: '#94a3b8' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => onStartTrust(j.id)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        background: GOLD, color: NAVY, fontWeight: 700, fontSize: 11,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      ⚡ Starta nu
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
        <span>🟢 Bra &nbsp; 🟡 Medel &nbsp; 🔴 Sämre</span>
        <span>Publikt reg: Nej = bättre (mer diskret)</span>
        <span>Klicka på jurisdiktion för detaljvy</span>
      </div>
    </div>
  )
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ step, index }: { step: TrustSetupStep; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cat = CAT_META[step.category]

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        border: `1.5px solid ${expanded ? NAVY : '#e2e8f0'}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        marginBottom: 8,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        background: expanded ? `${NAVY}05` : 'white',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: NAVY, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 12, flexShrink: 0,
        }}>
          {index + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: NAVY, fontSize: 13, marginBottom: 2 }}>{step.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>{cat?.icon} {cat?.label}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>⏱ {step.duration}</span>
            {step.cost_usd && (
              <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>{fmtUSD(step.cost_usd)}</span>
            )}
          </div>
        </div>

        <span style={{ color: '#94a3b8', fontSize: 12, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 10px', lineHeight: 1.6 }}>{step.description}</p>
          {step.requires.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>KRÄVER:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {step.requires.map(r => (
                  <span key={r} style={{
                    background: '#f1f5f9', color: '#475569',
                    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace',
                  }}>
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Jurisdiction Detail ──────────────────────────────────────────────────────
function JurisdictionDetail({ jurisdiction, onStartTrust }: { jurisdiction: TrustJurisdiction; onStartTrust: (id: string) => void }) {
  const isRec = jurisdiction.id === 'difc'
  const stepCostTotal = totalSetupCost(jurisdiction)

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY}, #1a5276)`,
        borderRadius: 14, padding: '24px 28px', marginBottom: 24, color: 'white',
        position: 'relative', overflow: 'hidden',
      }}>
        {isRec && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            background: GOLD, color: NAVY, fontSize: 11, fontWeight: 800,
            padding: '8px 20px', borderRadius: '0 14px 0 14px', letterSpacing: '0.05em',
          }}>
            ⭐ WAVULTS REKOMMENDATION
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <span style={{ fontSize: 48 }}>{jurisdiction.flag}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{jurisdiction.name}</h2>
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{jurisdiction.structure}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, fontFamily: 'monospace' }}>
          Tillämplig lag: {jurisdiction.governing_law}
        </div>
      </div>

      {/* Best for */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {jurisdiction.best_for.map(b => (
          <span key={b} style={{
            background: `${GOLD}25`, color: '#92400e', border: `1px solid ${GOLD}60`,
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          }}>
            {b}
          </span>
        ))}
      </div>

      {/* Two columns: Advantages + Tax */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Advantages */}
        <div style={{ background: CREAM, borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: NAVY, fontWeight: 700, fontSize: 15, margin: '0 0 14px' }}>Fördelar</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {jurisdiction.advantages.map((adv, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: GREEN, fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ color: '#374151', lineHeight: 1.5 }}>{adv}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tax + Requirements */}
        <div>
          <div style={{ background: CREAM, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ color: NAVY, fontWeight: 700, fontSize: 15, margin: '0 0 14px' }}>Skatteöversikt</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Skattesats', val: jurisdiction.tax_rate, highlight: taxColor(jurisdiction.tax_rate) },
                { label: 'Kapitalvinstskatt', val: jurisdiction.capital_gains_tax, highlight: taxColor(jurisdiction.capital_gains_tax) },
                { label: 'Arvsskatt', val: jurisdiction.estate_tax, highlight: taxColor(jurisdiction.estate_tax) },
                { label: 'Skatteavtal', val: jurisdiction.tax_treaty ? 'Ja ✓' : 'Nej', highlight: jurisdiction.tax_treaty ? GREEN : '#d97706' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'white', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>{item.label.toUpperCase()}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: item.highlight }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: CREAM, borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: NAVY, fontWeight: 700, fontSize: 15, margin: '0 0 12px' }}>Krav & Villkor</h3>
            <div style={{ fontSize: 13 }}>
              {[
                { label: 'Lokal trustee krävs', val: jurisdiction.requires_local_trustee },
                { label: 'Substance-krav', val: jurisdiction.requires_substance },
                { label: 'Publikt register', val: jurisdiction.public_register },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid #e2e8f0',
                }}>
                  <span style={{ color: '#374151' }}>{item.label}</span>
                  <span style={{
                    fontWeight: 700,
                    color: item.label === 'Publikt register'
                      ? (item.val ? RED : GREEN)
                      : (item.val ? '#d97706' : GREEN),
                  }}>
                    {item.val ? 'Ja' : 'Nej'}
                  </span>
                </div>
              ))}
              {jurisdiction.min_assets_usd && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: '#374151' }}>Min. tillgångar</span>
                  <span style={{ fontWeight: 700 }}>{fmtUSD(jurisdiction.min_assets_usd)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cost summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Uppskattad Setup-kostnad', val: fmtUSD(jurisdiction.setup_cost_usd), sub: 'engångskostnad inkl. juridik' },
          { label: 'Steg-kostnader (totalt)', val: fmtUSD(stepCostTotal), sub: 'specificerade kostnader i steg' },
          { label: 'Löpande årsavgifter', val: fmtUSD(jurisdiction.annual_cost_usd) + '/år', sub: 'trustee + administration' },
        ].map(c => (
          <div key={c.label} style={{
            background: 'white', border: `1.5px solid ${GOLD}60`,
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{c.label.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 2 }}>{c.val}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Setup steps */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: NAVY, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Setup-steg — {jurisdiction.setup_weeks} veckor totalt
        </h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>
          Klicka på ett steg för att expandera och se detaljer, krav och kostnader.
        </p>
        {jurisdiction.setup_steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* CTA — Starta etablering */}
      <button
        onClick={() => onStartTrust(jurisdiction.id)}
        style={{
          width: '100%', padding: '16px', borderRadius: 14, border: 'none',
          background: NAVY, color: 'white', fontWeight: 800, fontSize: 15,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, marginBottom: 16,
        }}
      >
        🚀 Starta etablering av {jurisdiction.name}
      </button>

      {/* Secondary CTA info */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY}08, ${GOLD}20)`,
        border: `1.5px solid ${GOLD}80`,
        borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: 13, marginBottom: 2 }}>
            Redo att etablera {jurisdiction.structure}?
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Systemet skapar trust-projektet och genererar dokumentlistan automatiskt.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Recommendation View ──────────────────────────────────────────────────────
function RecommendationView({ onSelect, onStartTrust }: { onSelect: (id: string) => void; onStartTrust: (id: string) => void }) {
  const rec = WAVULT_RECOMMENDED_STRUCTURE
  const tier1 = ALL_TRUST_JURISDICTIONS.find(j => j.id === rec.tier1)!
  const tier2 = ALL_TRUST_JURISDICTIONS.find(j => j.id === rec.tier2)!

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A3D62 0%, #0d4d78 100%)',
        borderRadius: 14, padding: '24px 28px', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>💡</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#F5F0E8' }}>Wavults Rekommenderade Struktur</h2>
            <div style={{ fontSize: 13, marginTop: 4, color: 'rgba(245,240,232,0.7)' }}>
              Anpassad för Wavult Groups befintliga Dubai-närvaro
            </div>
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div style={{
        background: `${GOLD}15`, border: `1.5px solid ${GOLD}60`,
        borderRadius: 12, padding: 20, marginBottom: 24,
      }}>
        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8, fontSize: 14 }}>
          📌 Varför DIFC?
        </div>
        <p style={{ margin: 0, color: '#374151', fontSize: 13, lineHeight: 1.7 }}>
          {rec.rationale}
        </p>
      </div>

      {/* Two-tier structure */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {tier1 && (
          <div style={{
            background: 'white', border: `2px solid ${GOLD}`,
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8B6914', letterSpacing: '0.08em', marginBottom: 10 }}>
              TIER 1 — PRIMÄR
            </div>
            <div
              onClick={() => onSelect(tier1.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 36 }}>{tier1.flag}</span>
              <div>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{tier1.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{tier1.structure}</div>
              </div>
            </div>
            <div style={{
              background: `${GOLD}20`,
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#374151', marginBottom: 12,
            }}>
              Rekommenderad primärstruktur
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Skatt</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: taxColor(tier1.tax_rate) }}>{tier1.tax_rate}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Setup</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>${tier1.setup_cost_usd.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Årsavgift</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>${tier1.annual_cost_usd.toLocaleString()}/år</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Tid</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{tier1.setup_weeks} veckor</div>
              </div>
            </div>
            <button
              onClick={() => onStartTrust(tier1.id)}
              style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: GOLD, color: NAVY,
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              ⚡ Starta {tier1.name.split('(')[0].trim()}
            </button>
          </div>
        )}
        {tier2 && (
          <div style={{
            background: 'white', border: `2px solid #e2e8f0`,
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 10 }}>
              TIER 2 — ALTERNATIV
            </div>
            <div
              onClick={() => onSelect(tier2.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 36 }}>{tier2.flag}</span>
              <div>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{tier2.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{tier2.structure}</div>
              </div>
            </div>
            <div style={{
              background: CREAM,
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#374151', marginBottom: 12,
            }}>
              För europeiska tillgångar
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Skatt</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: taxColor(tier2.tax_rate) }}>{tier2.tax_rate}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Setup</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>${tier2.setup_cost_usd.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Årsavgift</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>${tier2.annual_cost_usd.toLocaleString()}/år</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Tid</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{tier2.setup_weeks} veckor</div>
              </div>
            </div>
            <button
              onClick={() => onStartTrust(tier2.id)}
              style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: NAVY, color: 'white',
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              ⚡ Starta {tier2.name.split('(')[0].trim()}
            </button>
          </div>
        )}
      </div>

      {/* IP Structure diagram */}
      <div style={{ background: CREAM, borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h3 style={{ color: NAVY, fontWeight: 700, fontSize: 16, margin: '0 0 16px' }}>
          🏗️ Rekommenderad IP-Struktur
        </h3>
        <pre style={{
          fontFamily: 'monospace', fontSize: 13, color: '#374151',
          background: 'white', borderRadius: 10, padding: 20,
          border: `1px solid #e2e8f0`, overflowX: 'auto', lineHeight: 1.8,
          margin: 0,
        }}>
{`Wavult DIFC Foundation (Dubai)
  ↓ äger IP-rättigheter (kod, varumärken, patent)
  ↓ licensierar till →
Wavult Group DMCC (Dubai) → Wavult Operations AB (Sverige) → Dotterbolag
  ↓
Royalty-flöde tillbaka till Foundation (0% skatt)`}
        </pre>
      </div>

      {/* Benefits list */}
      <div style={{ background: CREAM, borderRadius: 14, padding: 24 }}>
        <h3 style={{ color: NAVY, fontWeight: 700, fontSize: 16, margin: '0 0 16px' }}>
          Fördelar med DIFC-strukturen för Wavult
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            'Samma jurisdiktion som Wavult Group DMCC',
            '0% kapitalvinstskatt och arvsskatt',
            'IP-licens-royalties skattefria in i Founationen',
            'Engelskspråkigt common law — globalt erkänt',
            'Ingen obligatorisk substance-krav',
            'Diskret — inget publikt register',
            'Banker tillgängliga: Emirates NBD, ADCB, Mashreq',
            'Kan hålla equity i alla globala dotterbolag',
          ].map((benefit, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
              <span style={{ color: GREEN, fontWeight: 700, marginTop: 1 }}>✓</span>
              <span style={{ color: '#374151', lineHeight: 1.5 }}>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main TrustView ───────────────────────────────────────────────────────────
export function TrustView() {
  const [mainTab, setMainTab] = useState<'myTrusts' | 'jurisdictions'>('myTrusts')
  const [activeTab, setActiveTab] = useState('compare')
  const [modalJurisdictionId, setModalJurisdictionId] = useState<string | null>(null)

  // Check if trusts exist for initial tab
  const hasTrusts = JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]').length > 0
  const [startingMainTab] = useState(() => hasTrusts ? 'myTrusts' : 'jurisdictions')
  const [currentMainTab, setCurrentMainTab] = useState<'myTrusts' | 'jurisdictions'>(startingMainTab)

  const handleSelectJurisdiction = (id: string) => {
    setActiveTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStartTrust = (jurisdictionId: string) => {
    setModalJurisdictionId(jurisdictionId)
  }

  const handleTrustCreated = (_trust: Record<string, unknown>) => {
    setModalJurisdictionId(null)
    setCurrentMainTab('myTrusts')
    // Force reload
    window.dispatchEvent(new Event('wavult_trusts_updated'))
  }

  const activeJurisdiction = ALL_TRUST_JURISDICTIONS.find(j => j.id === activeTab)

  return (
    <div style={{ background: CREAM, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* CreateTrustModal */}
      {modalJurisdictionId && (
        <CreateTrustModal
          jurisdictionId={modalJurisdictionId}
          onClose={() => setModalJurisdictionId(null)}
          onCreated={handleTrustCreated}
        />
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: NAVY,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>
              🛡️
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: NAVY }}>
                Trust & Foundation
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                Etablera och förvalta Trusts, Foundations och Holding-strukturer
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
            {SUMMARY_CARDS.map(s => (
              <div key={s.label} style={{
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '10px 16px',
              }}>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main tab bar: Mina Trusts | Jurisdiktioner */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 16,
          borderBottom: '2px solid #DDD5C5',
        }}>
          {(() => {
            const hasTrustsNow = JSON.parse(localStorage.getItem('wavult_trusts') ?? '[]').length
            return [
              { id: 'myTrusts', label: '🏛️ Mina Trusts', count: hasTrustsNow },
              { id: 'jurisdictions', label: '🌍 Jurisdiktioner', count: 0 },
            ].map(tab => {
              const isActive = currentMainTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentMainTab(tab.id as typeof currentMainTab)}
                  style={{
                    padding: '10px 16px', border: 'none', borderBottom: `2px solid ${isActive ? GOLD : 'transparent'}`,
                    marginBottom: -2, cursor: 'pointer', fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    background: 'transparent',
                    color: isActive ? NAVY : '#64748b',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      background: GOLD, color: NAVY,
                      fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20,
                    }}>{tab.count}</span>
                  )}
                </button>
              )
            })
          })()}
        </div>

        {/* MY TRUSTS VIEW */}
        {currentMainTab === 'myTrusts' && (
          <div style={{
            background: 'white', borderRadius: 14, padding: '24px 28px',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <MyTrustsTab onStartTrust={handleStartTrust} />
          </div>
        )}

        {/* JURISDICTIONS VIEW */}
        {currentMainTab === 'jurisdictions' && (
          <>
            {/* Sub-tab bar */}
            <div style={{
              display: 'flex', gap: 0, marginBottom: 24, overflowX: 'auto',
              borderBottom: '2px solid #DDD5C5',
              flexShrink: 0,
            }}>
              {JURISDICTION_TABS.map(tab => {
                const isActive = activeTab === tab.id
                const isRec = tab.id === 'recommendation'
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '8px 14px', border: 'none',
                      borderBottom: `2px solid ${isActive ? GOLD : 'transparent'}`,
                      marginBottom: -2,
                      cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500,
                      whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                      background: isRec && isActive ? GOLD : 'transparent',
                      color: isRec && isActive ? NAVY : isActive ? NAVY : '#64748b',
                      borderRadius: isRec ? '8px 8px 0 0' : 0,
                    }}
                  >
                    {tab.label}
                    {tab.id === 'difc' && (
                      <span style={{
                        marginLeft: 5, background: GOLD, color: NAVY,
                        fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 20,
                      }}>★</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div style={{
              background: 'white', borderRadius: 14, padding: '24px 28px',
              border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              {activeTab === 'compare' && (
                <CompareTable onSelect={handleSelectJurisdiction} onStartTrust={handleStartTrust} />
              )}
              {activeJurisdiction && activeTab !== 'compare' && activeTab !== 'recommendation' && (
                <JurisdictionDetail jurisdiction={activeJurisdiction} onStartTrust={handleStartTrust} />
              )}
              {activeTab === 'recommendation' && (
                <RecommendationView onSelect={handleSelectJurisdiction} onStartTrust={handleStartTrust} />
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 24 }}>
          {ALL_TRUST_JURISDICTIONS.length} jurisdiktioner dokumenterade · Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')} · Källa: Wavult Legal Research 2026
        </div>
      </div>
    </div>
  )
}
