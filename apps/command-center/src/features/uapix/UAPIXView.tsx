export default function UAPIXView() {
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#1A2B4A,#0d1e35)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, color: '#F5F0E8' }}>
        <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(192,160,32,.7)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>UAPIX Platform</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>UAV Intelligence Exchange</h2>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,.55)', margin: 0 }}>Drone data marketplace and intelligence platform</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid #DDD5C5', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚁</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A2B4A', marginBottom: 8 }}>UAPIX Backend</div>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>Platform in development. Backend routes ready when launched.</div>
        <a href="https://git.wavult.com/wavult" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', background: '#1A2B4A', color: '#F5F0E8', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          View in Gitea →
        </a>
      </div>
    </div>
  )
}
