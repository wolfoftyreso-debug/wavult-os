export default function MLCSView() {
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#2C5F7A,#1a3d52)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, color: '#F5F0E8' }}>
        <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(200,168,75,.7)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>MLCS Protocol</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Clinical Knowledge Platform</h2>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,.55)', margin: 0 }}>Medical learning and clinical system — in development</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid #DDD5C5', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏥</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>MLCS Backend — Enterprise Rebuild</div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Supabase removed. Wavult API Core integrated. Pre-launch.</div>
        <a href="https://git.wavult.com/wavult/mlcs.com" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '10px 24px', background: '#2C5F7A', color: '#F5F0E8', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          View in Gitea →
        </a>
      </div>
    </div>
  )
}
