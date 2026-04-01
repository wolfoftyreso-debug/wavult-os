import { useState } from 'react'
import { Search, ExternalLink, Download, ChevronRight, AlertCircle, CheckCircle, Loader2, Building2, MapPin, Users, Briefcase } from 'lucide-react'

interface CompanyData {
  orgNr: string
  name: string
  status: string
  address: string
  city: string
  postalCode: string
  companyType: string
  registrationDate: string
  shareCapital?: string
  boardMembers?: string[]
  sniCode?: string
  sniDesc?: string
}

const BLANKETT_GUIDE = [
  { nr: '810', title: 'Registrering av nytt AB', desc: 'Anmälan om registrering av aktiebolag', icon: '🏢' },
  { nr: '901', title: 'Ändring av styrelse', desc: 'Anmälan om ändring av styrelseledamöter', icon: '👥' },
  { nr: '902', title: 'Ändring av firmatecknare', desc: 'Anmälan om ändring av firmateckningsrätt', icon: '✍️' },
  { nr: '903', title: 'Adressändring', desc: 'Anmälan om ny registrerad adress', icon: '📍' },
  { nr: '831', title: 'Anmälan om likvidation', desc: 'Anmälan om frivillig likvidation', icon: '🔒' },
]

function formatOrgNr(value: string): string {
  // Strip all non-digits
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 6) return digits
  return `${digits.slice(0, 6)}-${digits.slice(6, 10)}`
}

async function fetchCompanyData(orgNr: string): Promise<CompanyData> {
  const clean = orgNr.replace(/\D/g, '')

  // Try Allabolag API first
  try {
    const res = await fetch(`https://www.allabolag.se/api/what/${clean}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (res.ok) {
      const data = await res.json()
      if (data && (data.company || data.name)) {
        const c = data.company ?? data
        return {
          orgNr: formatOrgNr(clean),
          name: c.name ?? c.company_name ?? 'Okänt',
          status: c.status ?? c.company_status ?? 'Aktiv',
          address: c.address ?? c.visiting_address ?? '',
          city: c.city ?? c.town ?? '',
          postalCode: c.postal_code ?? c.zip ?? '',
          companyType: c.company_type ?? c.legal_form ?? 'AB',
          registrationDate: c.registration_date ?? c.registered ?? '',
          shareCapital: c.share_capital,
          boardMembers: c.board_members ?? c.board,
          sniCode: c.sni_code ?? c.industry_code,
          sniDesc: c.sni_description ?? c.industry,
        }
      }
    }
  } catch (_) {
    // Fall through to next attempt
  }

  // Try Bolagsverket open data
  try {
    const res = await fetch(`https://data.bolagsverket.se/search?q=${clean}&format=json`)
    if (res.ok) {
      const data = await res.json()
      const hit = data?.results?.[0] ?? data?.[0]
      if (hit) {
        return {
          orgNr: formatOrgNr(clean),
          name: hit.name ?? hit.company_name ?? 'Okänt',
          status: hit.status ?? 'Aktiv',
          address: hit.address ?? '',
          city: hit.city ?? '',
          postalCode: hit.postal_code ?? '',
          companyType: hit.legal_form ?? 'AB',
          registrationDate: hit.registration_date ?? '',
          shareCapital: hit.share_capital,
          boardMembers: hit.board_members,
          sniCode: hit.sni_code,
          sniDesc: hit.sni_description,
        }
      }
    }
  } catch (_) {
    // Fall through
  }

  throw new Error('API_UNAVAILABLE')
}

interface Props {
  onPrefill?: (data: CompanyData) => void
}

export function BolagsverketSearch({ onPrefill }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompanyData | null>(null)
  const [error, setError] = useState<'not_found' | 'api_error' | null>(null)
  const [selectedBlankett, setSelectedBlankett] = useState<string | null>(null)
  const [prefilled, setPrefilled] = useState(false)

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setPrefilled(false)

    try {
      const data = await fetchCompanyData(query.trim())
      setResult(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg === 'API_UNAVAILABLE' ? 'api_error' : 'not_found')
    } finally {
      setLoading(false)
    }
  }

  function handlePrefill() {
    if (result && onPrefill) {
      onPrefill(result)
      setPrefilled(true)
    }
  }

  function openBolagsverket() {
    if (!result) return
    const orgNrClean = result.orgNr.replace('-', '')
    window.open(`https://www.bolagsverket.se/foretag/aktiebolag/starta/startaaktiebolag.1401.html`, '_blank')
  }

  function downloadBlankett(nr: string) {
    window.open(`https://www.bolagsverket.se/download/18.${nr}/blankett_${nr}.pdf`, '_blank')
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>
          🇸🇪 Sök bolag hos Bolagsverket
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280' }}>
          Sök på organisationsnummer (XXXXXX-XXXX) eller bolagsnamn
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, color: '#9CA3AF', pointerEvents: 'none',
            }} />
            <input
              value={query}
              onChange={e => {
                const formatted = /^\d/.test(e.target.value) ? formatOrgNr(e.target.value) : e.target.value
                setQuery(formatted)
              }}
              placeholder="556XXX-XXXX eller bolagsnamn"
              style={{
                width: '100%', padding: '12px 14px 12px 38px',
                borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)',
                fontSize: 15, fontFamily: 'system-ui', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              padding: '12px 20px', borderRadius: 10,
              background: loading || !query.trim() ? '#E5E7EB' : '#2563EB',
              color: loading || !query.trim() ? '#9CA3AF' : '#FFFFFF',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Search style={{ width: 16, height: 16 }} />}
            Sök
          </button>
        </div>
      </form>

      {/* Error states */}
      {error === 'not_found' && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>Bolaget hittades inte</div>
              <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2 }}>
                Kontrollera organisationsnumret och försök igen. Du kan också söka direkt på{' '}
                <a href="https://www.bolagsverket.se" target="_blank" rel="noopener noreferrer" style={{ color: '#DC2626' }}>bolagsverket.se</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {error === 'api_error' && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#9A3412' }}>API ej tillgänglig</div>
              <div style={{ fontSize: 12, color: '#7C2D12', marginTop: 2 }}>
                Kunde inte nå Bolagsverket-data just nu. Sök manuellt på{' '}
                <a href={`https://www.bolagsverket.se`} target="_blank" rel="noopener noreferrer" style={{ color: '#EA580C' }}>bolagsverket.se</a>
                {' '}eller fyll i uppgifterna manuellt nedan.
              </div>
              {onPrefill && (
                <button
                  onClick={() => onPrefill({ orgNr: query, name: '', status: '', address: '', city: '', postalCode: '', companyType: 'AB', registrationDate: '' })}
                  style={{ marginTop: 8, padding: '6px 12px', borderRadius: 6, background: '#FED7AA', border: 'none', fontSize: 12, fontWeight: 600, color: '#9A3412', cursor: 'pointer' }}
                >
                  Fyll i manuellt →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          {/* Header */}
          <div style={{ background: '#2563EB08', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Building2 style={{ width: 18, height: 18, color: '#2563EB' }} />
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>{result.name}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{result.orgNr} · {result.companyType}</div>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: result.status?.toLowerCase().includes('aktiv') ? '#D1FAE5' : '#FEF3C7',
                color: result.status?.toLowerCase().includes('aktiv') ? '#065F46' : '#92400E',
              }}>
                {result.status || 'Aktiv'}
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MapPin style={{ width: 13, height: 13, color: '#9CA3AF' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adress</span>
              </div>
              <div style={{ fontSize: 13, color: '#1C1C1E' }}>{result.address || '—'}</div>
              {result.postalCode && <div style={{ fontSize: 12, color: '#6B7280' }}>{result.postalCode} {result.city}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Briefcase style={{ width: 13, height: 13, color: '#9CA3AF' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registrerat</span>
              </div>
              <div style={{ fontSize: 13, color: '#1C1C1E' }}>{result.registrationDate || '—'}</div>
              {result.shareCapital && <div style={{ fontSize: 12, color: '#6B7280' }}>Aktiekapital: {result.shareCapital}</div>}
            </div>

            {result.boardMembers && result.boardMembers.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Users style={{ width: 13, height: 13, color: '#9CA3AF' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Styrelse</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {result.boardMembers.map((m, i) => (
                    <span key={i} style={{ padding: '3px 8px', background: '#F3F4F6', borderRadius: 6, fontSize: 12, color: '#374151' }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.sniCode && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>SNI-kod</div>
                <div style={{ fontSize: 13, color: '#1C1C1E' }}>{result.sniCode} — {result.sniDesc}</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={openBolagsverket}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <ExternalLink style={{ width: 13, height: 13 }} />
              Visa på Bolagsverket
            </button>

            {onPrefill && (
              <button
                onClick={handlePrefill}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: prefilled ? '#D1FAE5' : '#2563EB', color: prefilled ? '#065F46' : '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {prefilled ? <CheckCircle style={{ width: 13, height: 13 }} /> : <ChevronRight style={{ width: 13, height: 13 }} />}
                {prefilled ? 'Förfyllt!' : 'Prefyll Wavult OS'}
              </button>
            )}

            <button
              onClick={() => setSelectedBlankett(prev => prev ? null : 'guide')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <Download style={{ width: 13, height: 13 }} />
              Ladda ned blankett
            </button>
          </div>
        </div>
      )}

      {/* Blankett guide — always visible, or shown after button click */}
      {(selectedBlankett === 'guide' || !result) && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
            📄 Blankettguide — Bolagsverket
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BLANKETT_GUIDE.map(b => (
              <div key={b.nr} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{b.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#2563EB', background: '#2563EB10', padding: '1px 6px', borderRadius: 4 }}>
                        {b.nr}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{b.title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{b.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => downloadBlankett(b.nr)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#F3F4F6', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <Download style={{ width: 12, height: 12 }} />
                  Ladda ned
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#0369A1' }}>
              💡 <strong>Tips:</strong> Alla blanketter skickas digitalt via{' '}
              <a href="https://minasidor.bolagsverket.se" target="_blank" rel="noopener noreferrer" style={{ color: '#0369A1' }}>
                Mina sidor på Bolagsverket
              </a>
              {' '}med BankID-signering.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Certificate of Good Standing (US entities) ───────────────────────────────
// For: quiXzoom Inc. (Delaware), Landvex Inc. (Texas)
// Provider: Legalinc via Stripe Atlas
// URL: stripe.legalinc.com/certificate-of-good-standing
// Cost: ~$75-150 depending on state
// Timeline: 2-5 business days
// Required for: bank accounts, enterprise contracts, visas, investor KYC

export const CERTIFICATE_PROVIDERS = [
  {
    name: 'Legalinc (via Stripe Atlas)',
    url: 'https://stripe.legalinc.com/certificate-of-good-standing',
    states: ['Delaware', 'Texas', 'All US states'],
    cost: '$75–150',
    timeline: '2–5 business days',
    description: 'Certificate of Good Standing / Existence. Proves company retains corporate standing, has paid state taxes and fees, and filed all compliance filings.',
    useCases: ['Bank account opening', 'Enterprise vendor onboarding', 'Investor KYC', 'Visa applications', 'Government contracts'],
    contact: 'atlas-support@legalinc.com | 833-456-4948',
  },
  {
    name: 'Harvard Business Services (Delaware)',
    url: 'https://www.delawareinc.com/certificates',
    states: ['Delaware'],
    cost: '$50–100',
    timeline: '1–3 business days',
    description: 'Direct Delaware Secretary of State certificates.',
    useCases: ['Bank account opening', 'Legal documentation'],
    contact: 'info@delawareinc.com',
  },
]
