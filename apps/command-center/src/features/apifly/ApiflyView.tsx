export default function ApiflyView() {
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#1A7A4A,#0f5c35)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, color: '#F5F0E8' }}>
        <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(232,184,75,.7)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Apifly Platform</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>API Distribution Network</h2>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,.55)', margin: 0 }}>Startup-friendly API gateway and distribution</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid #DDD5C5', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Apifly Backend</div>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>Platform in development.</div>
      </div>
    </div>
  )
}
