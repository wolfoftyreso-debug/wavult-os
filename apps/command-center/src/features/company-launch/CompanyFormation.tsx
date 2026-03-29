import { useState } from 'react'
import { Building2, CheckCircle, Loader, AlertTriangle } from 'lucide-react'

type Jurisdiction = 'delaware' | 'texas' | 'sweden' | 'lithuania' | 'dubai'
type Step = 'form' | 'confirm' | 'processing' | 'done' | 'error'

interface FormationConfig {
  name: string
  jurisdiction: Jurisdiction
  entity_type: string
  owner_name: string
  owner_email: string
}

const JURISDICTIONS: Record<Jurisdiction, { label: string; flag: string; method: string; time: string; available: boolean }> = {
  delaware: { label: 'Delaware, USA', flag: '🇺🇸', method: 'Stripe Atlas API', time: '1-3 dagar', available: true },
  texas: { label: 'Texas, USA', flag: '🇺🇸', method: 'Northwest Registered Agent', time: '3-5 dagar', available: true },
  sweden: { label: 'Sverige', flag: '🇸🇪', method: 'Bolagsverket (delvis automatiserat)', time: '1-2 veckor', available: false },
  lithuania: { label: 'Litauen', flag: '🇱🇹', method: 'JANGIS Portal', time: '3-5 dagar', available: false },
  dubai: { label: 'Dubai (FZCO)', flag: '🇦🇪', method: 'DMCC Portal', time: '5-10 dagar', available: false },
}

export function CompanyFormation() {
  const [step, setStep] = useState<Step>('form')
  const [config, setConfig] = useState<FormationConfig>({
    name: '',
    jurisdiction: 'delaware',
    entity_type: 'LLC',
    owner_name: 'Erik Svensson',
    owner_email: 'erik@wavult.com',
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function startFormation() {
    setStep('processing')
    setError(null)

    try {
      const res = await fetch('https://api.wavult.com/v1/company/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          jurisdiction: config.jurisdiction,
          entity_type: config.entity_type,
          owner: { name: config.owner_name, email: config.owner_email }
        })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json()
      setResult(data)
      setStep('done')
    } catch (err) {
      setError(String(err))
      setStep('error')
    }
  }

  const jur = JURISDICTIONS[config.jurisdiction]

  if (step === 'processing') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16 }}>
      <Loader size={32} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>Bildningsansökan skickas...</div>
      <div style={{ fontSize: 13, color: '#6B7280' }}>{jur.label} via {jur.method}</div>
    </div>
  )

  if (step === 'done') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={32} style={{ color: '#16A34A' }} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>Bildningsansökan inskickad</div>
      <div style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 400 }}>
        {config.name} ({jur.label}) — ansökan är inskickad via {jur.method}. Bekräftelse skickas till {config.owner_email}.
      </div>
      {result?.id && (
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151', background: '#F3F4F6', padding: '8px 16px', borderRadius: 8 }}>
          Referens: {result.id}
        </div>
      )}
      <button onClick={() => { setStep('form'); setResult(null); setConfig(c => ({ ...c, name: '' })) }}
        style={{ marginTop: 8, padding: '10px 24px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: 13 }}>
        Bilda ett till bolag
      </button>
    </div>
  )

  if (step === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 16 }}>
      <AlertTriangle size={32} style={{ color: '#DC2626' }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>Något gick fel</div>
      <div style={{ fontSize: 13, color: '#6B7280' }}>{error}</div>
      <button onClick={() => setStep('form')} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13 }}>Försök igen</button>
    </div>
  )

  if (step === 'confirm') return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 32, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: '0 0 20px' }}>Bekräfta bildning</h2>
      {[
        ['Bolagsnamn', config.name],
        ['Jurisdiktion', `${jur.flag} ${jur.label}`],
        ['Bolagsform', config.entity_type],
        ['Metod', jur.method],
        ['Handläggningstid', jur.time],
        ['Ägare', config.owner_name],
        ['E-post', config.owner_email],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
          <span style={{ color: '#6B7280' }}>{k}</span>
          <span style={{ color: '#1C1C1E', fontWeight: 500 }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={() => setStep('form')} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: 13 }}>
          Tillbaka
        </button>
        <button onClick={startFormation} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          Starta bildning
        </button>
      </div>
    </div>
  )

  // Form
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 32 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} style={{ color: '#7C3AED' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Bilda bolag</h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Välj jurisdiktion och fyll i namn</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Jurisdiction */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Jurisdiktion</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(JURISDICTIONS).map(([key, j]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${config.jurisdiction === key ? '#7C3AED' : '#E5E7EB'}`, borderRadius: 8, cursor: j.available ? 'pointer' : 'not-allowed', opacity: j.available ? 1 : 0.5, background: config.jurisdiction === key ? '#F5F3FF' : '#fff' }}>
                  <input type="radio" value={key} checked={config.jurisdiction === key} disabled={!j.available}
                    onChange={() => j.available && setConfig(c => ({ ...c, jurisdiction: key as Jurisdiction }))}
                    style={{ accentColor: '#7C3AED' }} />
                  <span style={{ fontSize: 16 }}>{j.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{j.label}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{j.method} · {j.time}</div>
                  </div>
                  {!j.available && <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>KOMMER SNART</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Company name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Bolagsnamn</label>
            <input value={config.name} onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
              placeholder="T.ex. Landvex Holdings LLC"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'system-ui' }} />
          </div>

          <button onClick={() => config.name && setStep('confirm')} disabled={!config.name}
            style={{ padding: '14px 0', borderRadius: 10, border: 'none', background: config.name ? '#7C3AED' : '#E5E7EB', color: '#fff', fontWeight: 700, cursor: config.name ? 'pointer' : 'not-allowed', fontSize: 15 }}>
            Nästa →
          </button>
        </div>
      </div>
    </div>
  )
}
