import { ShieldCheck, Activity } from 'lucide-react'

export function ProfileSettings() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Profilinställningar</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Hantera din identitet, hälsodata och integrationer</p>
      </div>

      {/* Identity & KYC */}
      <section style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Identitet & KYC</div>
        </div>
        {[
          { icon: <ShieldCheck size={16} />, title: 'Passverifiering', desc: 'Ladda upp passportets bildsida + selfie för KYC-verifiering', action: 'Ladda upp', status: 'Saknas' },
        ].map(item => (
          <div key={item.title} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: '#6B7280' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: 4, fontWeight: 600 }}>{item.status}</span>
              <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#F9FAFB', fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>{item.action}</button>
            </div>
          </div>
        ))}
      </section>

      {/* Health */}
      <section style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hälsa & Välmående</div>
        </div>
        {[
          { icon: <Activity size={16} />, title: 'WHOOP-integration', desc: 'Koppla din WHOOP för sömndata, återhämtning och belastning', action: 'Koppla', status: 'Ej kopplad' },
        ].map(item => (
          <div key={item.title} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: '#6B7280' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', background: '#F3F4F6', color: '#6B7280', borderRadius: 4, fontWeight: 600 }}>{item.status}</span>
              <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#F9FAFB', fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>{item.action}</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
