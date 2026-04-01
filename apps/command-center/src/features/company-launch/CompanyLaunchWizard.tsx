import { useState } from 'react'
import { Building2, Globe, FileText, CreditCard, CheckCircle, ChevronRight, ChevronLeft, AlertTriangle, Copy } from 'lucide-react'

type JurisdictionId = 'texas-llc' | 'delaware-c-corp' | 'sweden-ab' | 'lithuania-uab' | 'uae-fzco'

interface Jurisdiction {
  id: JurisdictionId
  name: string
  country: string
  flag: string
  type: string
  cost: string
  timeframe: string
  currency: string
  provider: string
  providerUrl: string
  requirements: string[]
  nextSteps: string[]
  taxAdvantage: string
}

const JURISDICTIONS: Jurisdiction[] = [
  {
    id: 'texas-llc',
    name: 'Texas LLC',
    country: 'USA',
    flag: '🇺🇸',
    type: 'Limited Liability Company',
    cost: '$325',
    timeframe: '1-2 dagar (expedited)',
    currency: 'USD',
    provider: 'Northwest Registered Agent',
    providerUrl: 'https://www.northwestregisteredagent.com',
    requirements: ['Organizer name + address', 'Company purpose', 'Registered agent (Northwest)'],
    nextSteps: ['EIN via IRS', 'Mercury Bank-konto', '83(b) election om equity (30 dagar)'],
    taxAdvantage: 'Ingen statlig inkomstskatt i Texas. Pass-through taxation för LLC.',
  },
  {
    id: 'delaware-c-corp',
    name: 'Delaware C Corp',
    country: 'USA',
    flag: '🇺🇸',
    type: 'C Corporation',
    cost: '$400-500',
    timeframe: '1-3 dagar',
    currency: 'USD',
    provider: 'Stripe Atlas / Clerky',
    providerUrl: 'https://atlas.stripe.com',
    requirements: ['Founder name + address', 'Company purpose', 'Share structure'],
    nextSteps: ['EIN via IRS', 'Mercury Bank-konto', '83(b) election (30 dagar KRITISK)'],
    taxAdvantage: 'VC-standard. Möjliggör QSBS-undantag (0% kapitalvinstskatt upp till $10M).',
  },
  {
    id: 'sweden-ab',
    name: 'Aktiebolag (AB)',
    country: 'Sverige',
    flag: '🇸🇪',
    type: 'Aktiebolag',
    cost: '2 200 SEK',
    timeframe: '1-2 veckor',
    currency: 'SEK',
    provider: 'Bolagsverket',
    providerUrl: 'https://bolagsverket.se',
    requirements: ['Styrelse (minst 1 person)', 'Aktiekapital (25 000 SEK)', 'Bolagsordning', 'Revisor'],
    nextSteps: ['F-skattsedel', 'Momsregistrering', 'Bankgirokonto', 'Bokföring'],
    taxAdvantage: '20,6% bolagsskatt. QESA-regler för personaloptioner (startup).',
  },
  {
    id: 'lithuania-uab',
    name: 'UAB (Litauen)',
    country: 'Litauen',
    flag: '🇱🇹',
    type: 'Uždaroji akcinė bendrovė',
    cost: '€150-300 (via agent)',
    timeframe: '2-5 dagar',
    currency: 'EUR',
    provider: 'Lokal litauisk agent',
    providerUrl: 'https://rekvizitai.vz.lt',
    requirements: ['Direktör (kan vara utländsk)', 'Aktiekapital (€1 000)', 'Registrerad adress Litauen'],
    nextSteps: ['VAT-registrering', 'SEPA-bankkonto', 'Litauisk revisor', 'Bokföring'],
    taxAdvantage: '15% bolagsskatt (lägst i EU). 0% för små bolag under tröskelvärde. EU-passering.',
  },
  {
    id: 'uae-fzco',
    name: 'FZCO (Dubai)',
    country: 'UAE',
    flag: '🇦🇪',
    type: 'Free Zone Company',
    cost: '15 000-40 000 AED',
    timeframe: '3-7 dagar',
    currency: 'AED',
    provider: 'DMCC / IFZA',
    providerUrl: 'https://www.dmcc.ae',
    requirements: ['Pass (alla aktieägare)', 'Affärsplan', 'Startkapital', 'UAE-adress (via DMCC)'],
    nextSteps: ['UAE-bankkonto', 'Visa (om nödvändigt)', 'IP-licensavtal', 'Transfer pricing-dokumentation'],
    taxAdvantage: '0% bolagsskatt på kvalificerade IP-inkomster. 9% CIT annars. Ingen källskatt.',
  },
]

// Pre-filled data for Wavult entities
const WAVULT_PREFILL: Record<string, Record<string, string>> = {
  organizer_name: { default: 'Erik Svensson' },
  organizer_phone: { default: '+46709123223' },
  organizer_email: { default: 'erik@wavult.com' },
  registered_agent: { 'texas-llc': 'Northwest Registered Agent, 5900 Balcones Drive STE 100, Austin TX 78731' },
  company_purpose_landvex: { default: 'To provide B2G infrastructure monitoring and optical insight services to municipalities, government agencies, and infrastructure owners' },
  company_purpose_quixzoom: { default: 'To operate a crowdsourced visual data platform connecting field operators with data buyers' },
  company_purpose_devops: { default: 'To provide technology development, infrastructure management, and AI services to group entities' },
  fiscal_year_end: { default: 'December 31' },
  address: { default: 'Åvägen 9, 135 48 Tyresö, Sweden' },
}

interface CompanyFormData {
  jurisdiction: JurisdictionId | null
  companyName: string
  companyPurpose: string
  useRegisteredAgent: boolean
  personalAddress: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  paymentMethod: string
  entityRelationship: string
}

export function CompanyLaunchWizard() {
  const [step, setStep] = useState(0)
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<{ jobId: string; status: string } | null>(null)
  const [form, setForm] = useState<CompanyFormData>({
    jurisdiction: null,
    companyName: '',
    companyPurpose: '',
    useRegisteredAgent: true,
    personalAddress: 'Åvägen 9, 135 48 Tyresö, Sweden',
    ownerName: 'Erik Svensson',
    ownerEmail: 'erik@wavult.com',
    ownerPhone: '+46709123223',
    paymentMethod: 'revolut-business',
    entityRelationship: '',
  })
  const [copied, setCopied] = useState<string | null>(null)

  const selectedJurisdiction = JURISDICTIONS.find(j => j.id === form.jurisdiction)

  const STEPS = [
    { title: 'Välj jurisdiktion', icon: Globe },
    { title: 'Bolagsinfo', icon: Building2 },
    { title: 'Granska', icon: FileText },
    { title: 'Betala & Signera', icon: CreditCard },
    { title: 'Klart', icon: CheckCircle },
  ]

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function launchAutomation() {
    setLaunching(true)
    try {
      const res = await fetch('https://api.wavult.com/v1/company/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdiction: form.jurisdiction,
          companyName: form.companyName,
          companyPurpose: form.companyPurpose || WAVULT_PREFILL.company_purpose_landvex.default,
          organizer: {
            name: form.ownerName,
            email: form.ownerEmail,
            phone: form.ownerPhone,
          },
          useRegisteredAgent: form.useRegisteredAgent,
        })
      })
      const data = await res.json()
      setLaunchResult(data)
      if (data.jobId) setTimeout(() => setStep(4), 1500)
    } catch (err) {
      console.error('Launch failed:', err)
    } finally {
      setLaunching(false)
    }
  }

  function CopyButton({ text, label }: { text: string; label: string }) {
    return (
      <button
        onClick={() => copyToClipboard(text, label)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
          background: copied === label ? '#34C75915' : '#F9FAFB',
          color: copied === label ? '#059669' : '#6B7280',
          fontSize: 11, fontWeight: 500, cursor: 'pointer',
        }}
      >
        <Copy style={{ width: 10, height: 10 }} />
        {copied === label ? 'Kopierad!' : 'Kopiera'}
      </button>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: isDone ? '#34C759' : isActive ? '#2563EB' : '#F3F4F6',
                color: isDone || isActive ? '#FFFFFF' : '#9CA3AF',
              }}>
                {isDone ? <CheckCircle style={{ width: 16, height: 16 }} /> : <Icon style={{ width: 16, height: 16 }} />}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 4px', background: isDone ? '#34C759' : '#F3F4F6' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 0: Jurisdiction */}
      {step === 0 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Välj jurisdiktion</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Vilket land och bolagsform passar bäst?</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {JURISDICTIONS.map(j => (
              <button key={j.id} onClick={() => setForm(f => ({ ...f, jurisdiction: j.id }))} style={{
                textAlign: 'left', padding: '16px', borderRadius: 14,
                border: `2px solid ${form.jurisdiction === j.id ? '#2563EB' : 'rgba(0,0,0,0.08)'}`,
                background: form.jurisdiction === j.id ? '#2563EB08' : '#FFFFFF',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 24 }}>{j.flag}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{j.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{j.type} · {j.country}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{j.cost}</div>
                    <div style={{ fontSize: 11, color: '#8E8E93' }}>{j.timeframe}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontStyle: 'italic' }}>
                  {j.taxAdvantage}
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => selectedJurisdiction && setStep(1)} disabled={!form.jurisdiction} style={{
            marginTop: 24, width: '100%', padding: '14px', borderRadius: 12,
            background: form.jurisdiction ? '#2563EB' : '#F3F4F6',
            color: form.jurisdiction ? '#FFFFFF' : '#9CA3AF',
            border: 'none', fontSize: 15, fontWeight: 600, cursor: form.jurisdiction ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            Fortsätt <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {/* Step 1: Company Info */}
      {step === 1 && selectedJurisdiction && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Bolagsinfo</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Alla fält är förfyllda med Wavult-data. Justera vid behov.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Company name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Bolagsnamn</label>
              <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="Landvex Inc" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 15, fontFamily: 'system-ui' }} />
            </div>

            {/* Purpose */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Company Purpose</label>
                <CopyButton text={WAVULT_PREFILL.company_purpose_landvex.default} label="purpose" />
              </div>
              <textarea value={form.companyPurpose || WAVULT_PREFILL.company_purpose_landvex.default}
                onChange={e => setForm(f => ({ ...f, companyPurpose: e.target.value }))}
                rows={3} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'system-ui', resize: 'vertical' }} />
            </div>

            {/* Registered agent */}
            <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>Använd Registered Agent-adress</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Din personliga adress visas INTE i offentliga register</div>
                </div>
                <input type="checkbox" checked={form.useRegisteredAgent} onChange={e => setForm(f => ({ ...f, useRegisteredAgent: e.target.checked }))} style={{ width: 20, height: 20 }} />
              </div>
              {form.useRegisteredAgent && (
                <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'monospace', color: '#047857', background: '#ECFDF5', padding: '8px 10px', borderRadius: 6 }}>
                  {selectedJurisdiction.id === 'texas-llc' && WAVULT_PREFILL.registered_agent['texas-llc']}
                  {selectedJurisdiction.id !== 'texas-llc' && `${selectedJurisdiction.provider} — kontakta leverantör för adress`}
                </div>
              )}
            </div>

            {/* Owner */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Namn</label>
                <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 15 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Telefon</label>
                <input value={form.ownerPhone} onChange={e => setForm(f => ({ ...f, ownerPhone: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 15 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(0)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft style={{ width: 16, height: 16, display: 'inline', marginRight: 4 }} />Tillbaka
            </button>
            <button onClick={() => setStep(2)} style={{ flex: 2, padding: '14px', borderRadius: 12, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Granska <ChevronRight style={{ width: 16, height: 16, display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && selectedJurisdiction && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Granska & Bekräfta</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Kontrollera att allt stämmer innan du betalar.</p>

          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {[
              ['Jurisdiktion', `${selectedJurisdiction.flag} ${selectedJurisdiction.name} (${selectedJurisdiction.country})`],
              ['Bolagsnamn', form.companyName || '(ej angivet)'],
              ['Bolagstyp', selectedJurisdiction.type],
              ['Leverantör', selectedJurisdiction.provider],
              ['Registered Agent', form.useRegisteredAgent ? 'Ja — adress privat' : 'Nej — din adress används'],
              ['Organizer', form.ownerName],
              ['Kostnad', selectedJurisdiction.cost],
              ['Beräknad tid', selectedJurisdiction.timeframe],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9A3412' }}>Nästa steg efter registrering</div>
                <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px' }}>
                  {selectedJurisdiction.nextSteps.map(s => (
                    <li key={s} style={{ fontSize: 12, color: '#9A3412', marginBottom: 2 }}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft style={{ width: 16, height: 16, display: 'inline', marginRight: 4 }} />Tillbaka
            </button>
            <button onClick={() => setStep(3)} style={{ flex: 2, padding: '14px', borderRadius: 12, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Gå vidare till betalning <ChevronRight style={{ width: 16, height: 16, display: 'inline' }} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pay & Sign */}
      {step === 3 && selectedJurisdiction && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Betala & Signera</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Öppna leverantörens webbplats och slutför registreringen.</p>

          <div style={{ background: '#2563EB08', border: '2px solid #2563EB', borderRadius: 14, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{selectedJurisdiction.flag}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>{selectedJurisdiction.provider}</div>
            <button
              onClick={launchAutomation}
              disabled={launching}
              style={{
                display: 'inline-block', marginTop: 12, padding: '12px 28px',
                background: launching ? '#9CA3AF' : '#2563EB',
                color: '#FFFFFF', borderRadius: 10, fontSize: 15, fontWeight: 600,
                border: 'none', cursor: launching ? 'not-allowed' : 'pointer',
              }}
            >
              {launching ? 'Startar automation...' : '🚀 Starta automatisk registrering'}
            </button>
            {launchResult && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#059669', fontWeight: 500 }}>
                Job ID: {launchResult.jobId} — Monitorera i BOS Events
              </div>
            )}
          </div>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Fyll i på deras sajt:</div>
            {[
              ['Company Name', form.companyName || '—'],
              ['Purpose', form.companyPurpose || WAVULT_PREFILL.company_purpose_landvex.default],
              ['Organizer', form.ownerName],
              ['Phone', form.ownerPhone],
              ['Address', form.useRegisteredAgent ? 'Use our address (registered agent)' : form.personalAddress],
              ['Fiscal Year End', 'December 31'],
              ['Employees', 'No (lämna omarkerat)'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#047857', minWidth: 120 }}>{label}:</span>
                <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, color: '#1C1C1E', fontFamily: value.length > 40 ? 'monospace' : 'inherit', textAlign: 'right' }}>{value.slice(0, 80)}{value.length > 80 ? '...' : ''}</span>
                  <CopyButton text={value} label={label} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 2 }}>Betalning</div>
            <div style={{ fontSize: 12, color: '#7F1D1D' }}>Använd Revolut Business-kortet. Kostnad: {selectedJurisdiction.cost}. Spara kvittot — skicka till Winston (CFO).</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Tillbaka
            </button>
            <button onClick={() => setStep(4)} style={{ flex: 2, padding: '14px', borderRadius: 12, background: '#34C759', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              ✓ Bolag registrerat!
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && selectedJurisdiction && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#34C75915', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle style={{ width: 40, height: 40, color: '#34C759' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>{form.companyName || 'Bolaget'} registrerat!</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>Registreringen är påbörjad. Bekräftelse kommer via email från {selectedJurisdiction.provider}.</p>

          <div style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '20px', textAlign: 'left', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Nästa steg — logga in BOS:</div>
            {selectedJurisdiction.nextSteps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', color: '#FFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: '#374151' }}>{s}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setStep(0); setForm(f => ({ ...f, jurisdiction: null, companyName: '' })) }}
            style={{ padding: '14px 32px', borderRadius: 12, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Registrera nytt bolag
          </button>
        </div>
      )}
    </div>
  )
}
