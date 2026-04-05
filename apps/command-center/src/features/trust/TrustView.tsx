import { useState } from 'react'
import { TRUST_JURISDICTIONS, WAVULT_RECOMMENDED_STRUCTURE, TrustJurisdiction, TrustSetupStep } from './trustData'

// ─── Colours ──────────────────────────────────────────────────────────────────
const CREAM  = '#F5F0E8'
const NAVY   = '#0A3D62'
const GOLD   = '#E8B84B'
const GREEN  = '#16a34a'
const RED    = '#dc2626'

// ─── Category meta ────────────────────────────────────────────────────────────
const CAT_META: Record<string, { label: string; icon: string; color: string }> = {
  legal:         { label: 'Legal',          icon: '⚖️',  color: '#1e40af' },
  banking:       { label: 'Banking',        icon: '🏦',  color: '#065f46' },
  registration:  { label: 'Registrering',   icon: '📝',  color: '#92400e' },
  documentation: { label: 'Dokumentation',  icon: '📄',  color: '#7c3aed' },
  tax:           { label: 'Skatt',          icon: '🧾',  color: '#be123c' },
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
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

// ─── Compare Table ────────────────────────────────────────────────────────────
function CompareTable({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div>
      <h2 style={{ color: NAVY, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Jurisdiktionsjämförelse — Trust & Foundation
      </h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        Klicka på en rad för att se fullständig detaljvy och setup-steg.
      </p>

      {/* Mobile cards */}
      <div style={{ display: 'none' }} className="mobile-cards">
        {TRUST_JURISDICTIONS.map(j => (
          <div key={j.id} onClick={() => onSelect(j.id)}
            style={{
              background: j.id === 'difc' ? `linear-gradient(135deg, ${NAVY}08, ${GOLD}15)` : 'white',
              border: `1.5px solid ${j.id === 'difc' ? GOLD : '#e2e8f0'}`,
              borderRadius: 12, padding: 16, marginBottom: 12, cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{j.flag} {j.name}</span>
              {j.id === 'difc' && (
                <span style={{ background: GOLD, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  WAVULT
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
              <div><span style={{ color: '#94a3b8' }}>Skatt:</span> <strong style={{ color: taxColor(j.tax_rate) }}>{j.tax_rate}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Setup:</span> <strong>{fmtUSD(j.setup_cost_usd)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Årsavgift:</span> <strong>{fmtUSD(j.annual_cost_usd)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Tid:</span> <strong>{j.setup_weeks} veckor</strong></div>
            </div>
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
              <th style={{ padding: '12px 14px', textAlign: 'center', borderRadius: '0 8px 0 0' }}>Skatteavtal</th>
            </tr>
          </thead>
          <tbody>
            {TRUST_JURISDICTIONS.map((j, i) => {
              const isRec = j.id === 'difc'
              const isEven = i % 2 === 0
              return (
                <tr
                  key={j.id}
                  onClick={() => onSelect(j.id)}
                  style={{
                    background: isRec
                      ? `linear-gradient(135deg, ${NAVY}08, ${GOLD}18)`
                      : isEven ? CREAM : 'white',
                    cursor: 'pointer',
                    borderLeft: isRec ? `3px solid ${GOLD}` : '3px solid transparent',
                    transition: 'filter 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.96)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  <td style={{ padding: '11px 14px' }}>
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
                      background: j.type === 'trust' ? '#dbeafe' : j.type === 'foundation' ? '#fce7f3' : '#d1fae5',
                      color: j.type === 'trust' ? '#1e40af' : j.type === 'foundation' ? '#9d174d' : '#065f46',
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
        <span>Klicka på en rad för detaljvy</span>
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
        {/* Number */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: NAVY, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 12, flexShrink: 0,
        }}>
          {index + 1}
        </div>

        {/* Title */}
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

        {/* Chevron */}
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
function JurisdictionDetail({ jurisdiction }: { jurisdiction: TrustJurisdiction }) {
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

      {/* CTA */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY}08, ${GOLD}20)`,
        border: `1.5px solid ${GOLD}80`,
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 4 }}>
            Redo att etablera {jurisdiction.structure}?
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Kontakta era juridiska rådgivare och påbörja KYC-processen med passunderlaget.
          </div>
        </div>
        <button
          onClick={() => alert(`Etableringsprocess för ${jurisdiction.name} startas.\nKontakta er trustee-partner och följ stegen ovan.`)}
          style={{
            background: NAVY, color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Starta etablering →
        </button>
      </div>
    </div>
  )
}

// ─── Recommendation View ──────────────────────────────────────────────────────
function RecommendationView({ onSelect }: { onSelect: (id: string) => void }) {
  const rec = WAVULT_RECOMMENDED_STRUCTURE
  const tier1 = TRUST_JURISDICTIONS.find(j => j.id === rec.tier1)!
  const tier2 = TRUST_JURISDICTIONS.find(j => j.id === rec.tier2)!

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY}, #1a5276)`,
        borderRadius: 14, padding: '24px 28px', marginBottom: 28, color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>💡</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Wavults Rekommenderade Struktur</h2>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
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
        {[
          { tier: 'Tier 1 — Primär', j: tier1, tag: 'Rekommenderad primärstruktur' },
          { tier: 'Tier 2 — Alternativ', j: tier2, tag: 'För europeiska tillgångar' },
        ].map(({ tier, j, tag }) => (
          <div
            key={j.id}
            onClick={() => onSelect(j.id)}
            style={{
              background: 'white', border: `2px solid ${j.id === 'difc' ? GOLD : '#e2e8f0'}`,
              borderRadius: 14, padding: 20, cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 10 }}>
              {tier.toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 36 }}>{j.flag}</span>
              <div>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{j.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{j.structure}</div>
              </div>
            </div>
            <div style={{
              background: j.id === 'difc' ? `${GOLD}20` : CREAM,
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#374151', marginBottom: 12,
            }}>
              {tag}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { k: 'Skatt', v: j.tax_rate, color: taxColor(j.tax_rate) },
                { k: 'Setup', v: fmtUSD(j.setup_cost_usd), color: NAVY },
                { k: 'Årsavgift', v: fmtUSD(j.annual_cost_usd) + '/år', color: NAVY },
                { k: 'Tid', v: j.setup_weeks + ' veckor', color: '#d97706' },
              ].map(item => (
                <div key={item.k}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{item.k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
  const [activeTab, setActiveTab] = useState('compare')

  const handleSelectJurisdiction = (id: string) => {
    setActiveTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeJurisdiction = TRUST_JURISDICTIONS.find(j => j.id === activeTab)

  return (
    <div style={{ background: CREAM, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
            {[
              { label: '6 jurisdiktioner', sub: 'fullt dokumenterade' },
              { label: 'DIFC rekommenderad', sub: 'Wavults Dubai-närvaro' },
              { label: 'Från $12k setup', sub: 'BVI lägsta kostnad' },
              { label: '0% skatt', sub: 'på 5 av 6 jurisdiktioner' },
            ].map(s => (
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

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto',
          background: 'white', borderRadius: 12, padding: 6,
          border: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                  background: isActive ? NAVY : 'transparent',
                  color: isActive ? 'white' : '#64748b',
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
            <CompareTable onSelect={handleSelectJurisdiction} />
          )}
          {activeJurisdiction && activeTab !== 'compare' && activeTab !== 'recommendation' && (
            <JurisdictionDetail jurisdiction={activeJurisdiction} />
          )}
          {activeTab === 'recommendation' && (
            <RecommendationView onSelect={handleSelectJurisdiction} />
          )}
        </div>
      </div>
    </div>
  )
}
