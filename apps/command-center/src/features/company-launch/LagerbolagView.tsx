import { useState } from 'react'
import { CheckCircle, ChevronRight, ChevronLeft, AlertCircle, ExternalLink, Building2, Users, MapPin, Briefcase, Loader2 } from 'lucide-react'

// ─── Team registry (Wavult) ────────────────────────────────────────────────────
const WAVULT_TEAM = [
  { name: 'Erik Svensson', role: 'Styrelseordförande', email: 'erik@wavult.com', phone: '+46709123223' },
  { name: 'Dennis Bjarnemark', role: 'Ledamot / Legal & Operations', email: 'dennis@hypbit.com', phone: '0761474243' },
  { name: 'Winston Gustav Bjarnemark', role: 'CFO / Ledamot', email: 'winston@hypbit.com', phone: '0768123548' },
  { name: 'Leon Maurizio Russo De Cerame', role: 'VD (operativt)', email: 'leon@hypbit.com', phone: '+46738968949' },
  { name: 'Johan Putte Berglund', role: 'CTO / Ledamot', email: 'johan@hypbit.com', phone: '+46736977576' },
]

// ─── Providers ────────────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'bolagsratt',
    name: 'Bolagsrätt.se',
    price: '4 900 SEK',
    priceNum: 4900,
    delivery: '1–2 dagar',
    rating: 4.7,
    badge: 'Populärast',
    badgeColor: '#2563EB',
    description: 'Stor aktör med lång erfarenhet. Bra juridisk rådgivning inkluderad.',
    url: 'https://www.bolagsratt.se/lagerbolag',
    features: ['Juridisk granskning', 'Bolagsordning ingår', 'Stöd via telefon'],
  },
  {
    id: 'bolagsbolaget',
    name: 'Bolagsbolaget.se',
    price: '5 500 SEK',
    priceNum: 5500,
    delivery: 'Samma dag',
    rating: 4.5,
    badge: 'Snabbast',
    badgeColor: '#34C759',
    description: 'Snabbaste leveransen — perfekt om du behöver bolaget omgående.',
    url: 'https://www.bolagsbolaget.se',
    features: ['Expressleverans', 'Digital signering', 'Bankgirokonto-hjälp'],
  },
  {
    id: 'startaeget',
    name: 'StartaEget.se',
    price: '3 990 SEK',
    priceNum: 3990,
    delivery: '2–3 dagar',
    rating: 4.3,
    badge: 'Billigast',
    badgeColor: '#FF9500',
    description: 'Prisvärt alternativ med bra grundpaket för nya entreprenörer.',
    url: 'https://www.startaeget.se/lagerbolag',
    features: ['Lägst pris', 'Enkel process', 'E-post support'],
  },
]

// ─── SNI presets ──────────────────────────────────────────────────────────────
const SNI_PRESETS: Record<string, string[]> = {
  tech: ['62010 — Dataprogrammering', '62020 — IT-konsulttjänster', '62030 — Datordrifttjänster'],
  optical: ['71121 — Geotekniska undersökningar', '74901 — Övrig teknisk konsultverksamhet', '62020 — IT-konsulttjänster'],
  marketing: ['73110 — Reklambyråer', '73120 — Medierepresentation', '73200 — Marknadsundersökning'],
  fintech: ['64190 — Övrig monetär finansförmedling', '66190 — Övriga stödtjänster till finansiella tjänster'],
  holding: ['64202 — Verksamhet i holdingbolag inom finansiell sektor', '64209 — Övriga holdingbolag'],
  consulting: ['70220 — Övrig företagskonsultverksamhet', '74901 — Övrig teknisk konsultverksamhet'],
}

// ─── Name availability check ──────────────────────────────────────────────────
async function checkNameAvailability(name: string): Promise<'available' | 'taken' | 'unknown'> {
  if (name.length < 3) return 'unknown'
  const reservedWords = ['Sverige', 'Swedish', 'Kungliga', 'Royal', 'AB AB', 'Sverige AB', 'Statens']
  if (reservedWords.some(w => name.toLowerCase().includes(w.toLowerCase()))) return 'taken'
  // Optimistic — real check requires Bolagsverket name reservation API
  return 'available'
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LagerbolagConfig {
  providerId: string
  companyName: string
  shareCapital: number
  boardMembers: string[]
  address: string
  sniCodes: string[]
  customSni: string
  sniCategory: string
}

const DEFAULT_CONFIG: LagerbolagConfig = {
  providerId: '',
  companyName: '',
  shareCapital: 25000,
  boardMembers: ['Erik Svensson'],
  address: 'Åvägen 9, 135 48 Tyresö, Sverige',
  sniCodes: [],
  customSni: '',
  sniCategory: 'tech',
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ label, index, current }: { label: string; index: number; current: number }) {
  const done = index < current
  const active = index === current
  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: index < 3 ? 1 : undefined }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? '#34C759' : active ? '#2563EB' : '#E5E7EB',
          color: done || active ? '#FFF' : '#9CA3AF',
          fontSize: 12, fontWeight: 700,
        }}>
          {done ? '✓' : index + 1}
        </div>
        <span style={{ fontSize: 10, color: active ? '#2563EB' : '#6B7280', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      {index < 3 && <div style={{ flex: 1, height: 2, margin: '0 4px 12px', background: done ? '#34C759' : '#E5E7EB' }} />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LagerbolagView() {
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState<LagerbolagConfig>(DEFAULT_CONFIG)
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'unknown'>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [nameCheckTimeout, setNameCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const provider = PROVIDERS.find(p => p.id === config.providerId)
  const STEPS = ['Välj leverantör', 'Konfigurera', 'Granska', 'Slutför']

  function updateField<K extends keyof LagerbolagConfig>(key: K, value: LagerbolagConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleNameChange(name: string) {
    updateField('companyName', name)
    setNameStatus('idle')

    if (nameCheckTimeout) clearTimeout(nameCheckTimeout)

    if (name.length < 3) return

    const t = setTimeout(async () => {
      setNameStatus('checking')
      const status = await checkNameAvailability(name)
      setNameStatus(status)
    }, 600)
    setNameCheckTimeout(t)
  }

  function toggleBoardMember(name: string) {
    setConfig(prev => ({
      ...prev,
      boardMembers: prev.boardMembers.includes(name)
        ? prev.boardMembers.filter(m => m !== name)
        : [...prev.boardMembers, name],
    }))
  }

  function toggleSni(code: string) {
    setConfig(prev => ({
      ...prev,
      sniCodes: prev.sniCodes.includes(code)
        ? prev.sniCodes.filter(c => c !== code)
        : [...prev.sniCodes, code],
    }))
  }

  function buildProviderUrl(): string {
    if (!provider) return ''
    const params = new URLSearchParams({
      company_name: config.companyName,
      share_capital: String(config.shareCapital),
      address: config.address,
    })
    return `${provider.url}?${params.toString()}`
  }

  function handleSubmit() {
    setSubmitted(true)
    // In production: POST to CRM pipeline
    console.log('Lagerbolagsköp påbörjat:', config)
  }

  const canProceedStep1 = !!config.providerId
  const canProceedStep2 = config.companyName.length >= 3 && config.boardMembers.length >= 1 && config.shareCapital >= 25000
  const totalCost = provider ? provider.priceNum + 2200 : 0 // Provider fee + Bolagsverket fee

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>
          🏢 Köp lagerbolag
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280' }}>
          Köp ett färdigt aktiebolag och kom igång på 1–3 dagar
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 32 }}>
        {STEPS.map((label, i) => (
          <StepDot key={i} label={label} index={i} current={step} />
        ))}
      </div>

      {/* ── Step 0: Choose provider ── */}
      {step === 0 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Välj leverantör</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => updateField('providerId', p.id)}
                style={{
                  textAlign: 'left', padding: '16px', borderRadius: 14,
                  border: `2px solid ${config.providerId === p.id ? '#2563EB' : 'rgba(0,0,0,0.08)'}`,
                  background: config.providerId === p.id ? '#2563EB08' : '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>{p.name}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: p.badgeColor + '20', color: p.badgeColor }}>
                          {p.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{p.description}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{p.price}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>⏱ {p.delivery}</div>
                    <div style={{ fontSize: 11, color: '#F59E0B' }}>{'★'.repeat(Math.floor(p.rating))} {p.rating}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.features.map(f => (
                    <span key={f} style={{ padding: '2px 8px', background: '#F3F4F6', borderRadius: 6, fontSize: 11, color: '#374151' }}>
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!canProceedStep1}
            style={{
              marginTop: 20, width: '100%', padding: '14px', borderRadius: 12,
              background: canProceedStep1 ? '#2563EB' : '#E5E7EB',
              color: canProceedStep1 ? '#FFFFFF' : '#9CA3AF',
              border: 'none', fontSize: 15, fontWeight: 600,
              cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            Konfigurera bolaget <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {/* ── Step 1: Configure ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Company name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Önskat bolagsnamn
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={config.companyName}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Wavult Operations AB"
                style={{
                  width: '100%', padding: '11px 40px 11px 14px',
                  borderRadius: 10, border: `1px solid ${nameStatus === 'available' ? '#34C759' : nameStatus === 'taken' ? '#EF4444' : 'rgba(0,0,0,0.1)'}`,
                  fontSize: 15, boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                {nameStatus === 'checking' && <Loader2 style={{ width: 16, height: 16, color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />}
                {nameStatus === 'available' && <CheckCircle style={{ width: 16, height: 16, color: '#34C759' }} />}
                {nameStatus === 'taken' && <AlertCircle style={{ width: 16, height: 16, color: '#EF4444' }} />}
              </div>
            </div>
            {nameStatus === 'available' && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#059669' }}>✓ Ser tillgänglig ut — verifiera på Bolagsverket</div>
            )}
            {nameStatus === 'taken' && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#DC2626' }}>⚠️ Namnet kan vara reserverat eller otillåtet</div>
            )}
            {nameStatus === 'unknown' && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#6B7280' }}>Ange minst 3 tecken</div>
            )}
          </div>

          {/* Share capital */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aktiekapital (min 25 000 SEK)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[25000, 50000, 100000, 500000].map(amount => (
                <button
                  key={amount}
                  onClick={() => updateField('shareCapital', amount)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 8,
                    border: `2px solid ${config.shareCapital === amount ? '#2563EB' : 'rgba(0,0,0,0.08)'}`,
                    background: config.shareCapital === amount ? '#2563EB08' : '#FFFFFF',
                    fontSize: 12, fontWeight: 600, color: config.shareCapital === amount ? '#2563EB' : '#374151',
                    cursor: 'pointer',
                  }}
                >
                  {amount.toLocaleString('sv-SE')}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <input
                type="number"
                value={config.shareCapital}
                onChange={e => updateField('shareCapital', Math.max(25000, Number(e.target.value)))}
                min={25000}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, width: 160 }}
              />
              <span style={{ marginLeft: 8, fontSize: 13, color: '#6B7280' }}>SEK (eget belopp)</span>
            </div>
          </div>

          {/* Board members */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Users style={{ width: 14, height: 14, color: '#6B7280' }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Styrelse (Wavult team)
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {WAVULT_TEAM.map(member => (
                <button
                  key={member.name}
                  onClick={() => toggleBoardMember(member.name)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    border: `2px solid ${config.boardMembers.includes(member.name) ? '#2563EB' : 'rgba(0,0,0,0.06)'}`,
                    background: config.boardMembers.includes(member.name) ? '#2563EB08' : '#FAFAFA',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{member.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{member.role}</div>
                  </div>
                  {config.boardMembers.includes(member.name) && (
                    <CheckCircle style={{ width: 16, height: 16, color: '#2563EB', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MapPin style={{ width: 14, height: 14, color: '#6B7280' }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Registrerad adress
              </label>
            </div>
            <input
              value={config.address}
              onChange={e => updateField('address', e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* SNI codes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Briefcase style={{ width: 14, height: 14, color: '#6B7280' }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verksamhet (SNI-koder)
              </label>
            </div>

            {/* Category selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {Object.keys(SNI_PRESETS).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    updateField('sniCategory', cat)
                    updateField('sniCodes', [])
                  }}
                  style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: `1px solid ${config.sniCategory === cat ? '#2563EB' : 'rgba(0,0,0,0.08)'}`,
                    background: config.sniCategory === cat ? '#2563EB' : '#F3F4F6',
                    color: config.sniCategory === cat ? '#FFFFFF' : '#374151',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* SNI options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(SNI_PRESETS[config.sniCategory] ?? []).map(code => (
                <button
                  key={code}
                  onClick={() => toggleSni(code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${config.sniCodes.includes(code) ? '#2563EB' : 'rgba(0,0,0,0.06)'}`,
                    background: config.sniCodes.includes(code) ? '#2563EB08' : '#FAFAFA',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: '1.5px solid',
                    borderColor: config.sniCodes.includes(code) ? '#2563EB' : '#D1D5DB',
                    background: config.sniCodes.includes(code) ? '#2563EB' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {config.sniCodes.includes(code) && <span style={{ color: '#FFF', fontSize: 10 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => setStep(0)}
              style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              <ChevronLeft style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />Tillbaka
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep2}
              style={{
                flex: 2, padding: '13px', borderRadius: 12,
                background: canProceedStep2 ? '#2563EB' : '#E5E7EB',
                color: canProceedStep2 ? '#FFFFFF' : '#9CA3AF',
                border: 'none', fontSize: 14, fontWeight: 600,
                cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
              }}
            >
              Granska order <ChevronRight style={{ width: 14, height: 14, display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && provider && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Granska & Bekräfta</div>

          {/* Summary card */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {[
              ['Leverantör', provider.name],
              ['Bolagsnamn', config.companyName],
              ['Aktiekapital', `${config.shareCapital.toLocaleString('sv-SE')} SEK`],
              ['Styrelse', config.boardMembers.join(', ')],
              ['Adress', config.address],
              ['Verksamhet', config.sniCodes.length > 0 ? config.sniCodes.join('; ') : '(ej vald)'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 13, color: '#6B7280', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Cost breakdown */}
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kostnadskalkyl</div>
            {[
              [`${provider.name} — lagerbolagsavgift`, `${provider.priceNum.toLocaleString('sv-SE')} SEK`],
              ['Bolagsverket — registreringsavgift', '2 200 SEK'],
            ].map(([label, amount]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#0369A1' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0369A1' }}>{amount}</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#BAE6FD', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0C4A6E' }}>Totalt</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0C4A6E' }}>{totalCost.toLocaleString('sv-SE')} SEK</span>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>⏱ Tidsuppskattning</div>
            <div style={{ fontSize: 13, color: '#047857' }}>{provider.delivery} — {provider.name}</div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setStep(1)}
              style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              <ChevronLeft style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />Tillbaka
            </button>
            <button
              onClick={() => setStep(3)}
              style={{ flex: 2, padding: '13px', borderRadius: 12, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Slutför beställning <ChevronRight style={{ width: 14, height: 14, display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Submit ── */}
      {step === 3 && provider && (
        <div>
          {!submitted ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Slutför beställning</div>

              {/* Open provider */}
              <div style={{ background: '#2563EB08', border: '2px solid #2563EB', borderRadius: 14, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>{provider.name}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                  Öppna deras beställningsformulär med förfylld information
                </div>
                <a
                  href={buildProviderUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '12px 24px', borderRadius: 10, background: '#2563EB', color: '#FFFFFF',
                    fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  <ExternalLink style={{ width: 15, height: 15 }} />
                  Öppna {provider.name}
                </a>
              </div>

              {/* Order confirmation template */}
              <div style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📋 Beställningsmallar — spara dessa uppgifter
                </div>
                {[
                  ['Bolagsnamn', config.companyName],
                  ['Aktiekapital', `${config.shareCapital.toLocaleString('sv-SE')} SEK`],
                  ['Styrelseordförande', config.boardMembers[0] ?? '—'],
                  ['Övriga ledamöter', config.boardMembers.slice(1).join(', ') || '—'],
                  ['Adress', config.address],
                  ['Kontaktperson', 'Erik Svensson · +46709123223'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1C1C1E' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#92400E' }}>
                  💳 <strong>Betalning:</strong> Använd Revolut Business-kortet. Kostnad: {totalCost.toLocaleString('sv-SE')} SEK. Skicka kvittot till Winston (CFO).
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Tillbaka
                </button>
                <button
                  onClick={handleSubmit}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, background: '#34C759', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✓ Beställning påbörjad
                </button>
              </div>
            </>
          ) : (
            /* Confirmation */
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle style={{ width: 36, height: 36, color: '#34C759' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>Lagerbolagsköp påbörjat!</h3>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
                Du beställer via <strong>{provider.name}</strong>
              </p>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
                Förväntad leverans: {provider.delivery}
              </p>

              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', textAlign: 'left', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>Nästa steg:</div>
                {['Slutför köpet på ' + provider.name + ':s webbplats', 'Signera handlingar med BankID', 'Vänta på bekräftelse från Bolagsverket', 'Registrera F-skatt och moms', 'Öppna bankkonto för bolaget', 'Informera Winston (CFO) om förvärvet'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2563EB', color: '#FFF', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: '#374151' }}>{s}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setStep(0); setConfig(DEFAULT_CONFIG); setSubmitted(false) }}
                style={{ padding: '12px 28px', borderRadius: 12, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                <Building2 style={{ width: 14, height: 14, display: 'inline', marginRight: 6 }} />
                Köp ytterligare lagerbolag
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
