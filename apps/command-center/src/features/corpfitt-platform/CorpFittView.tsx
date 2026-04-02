import { useApi } from '../../shared/auth/useApi'
import { useState, useEffect } from 'react'

export default function CorpFittView() {
  const { apiFetch } = useApi()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    apiFetch('/api/corpfitt/stats').then(r => r.ok ? r.json() : null).then(setStats).catch(() => null)
  }, [apiFetch])

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ background: 'linear-gradient(135deg,#0A1F3D,#152d52)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, color: '#F5F0E8' }}>
        <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(200,168,75,.7)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>CorpFitt Platform</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Global Fitness Access</h2>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,.55)', margin: 0 }}>$20/visit · $300 monthly cap · 9 hotel chains · 60+ locations</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total visits', value: stats?.total_visits ?? '—' },
          { label: 'Active users', value: stats?.active_users ?? '—' },
          { label: 'Partner locations', value: '60+' },
          { label: 'MRR', value: stats?.mrr ?? '$0' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #DDD5C5', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0A1F3D' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #DDD5C5', borderRadius: 10, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Quick links</h3>
        {[
          { label: 'Landing page', url: 'https://d14gf6x22fx96q.cloudfront.net/corpfitt/index.html' },
          { label: 'Partner onboarding', url: 'https://d14gf6x22fx96q.cloudfront.net/corpfitt/partners.html' },
          { label: 'Developer API docs', url: 'https://d14gf6x22fx96q.cloudfront.net/corpfitt/developers.html' },
          { label: 'Gitea repo', url: 'https://git.wavult.com/wavult/corpfitt-app' },
        ].map(({ label, url }) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid #f0ede6', fontSize: 13, color: '#0A1F3D', textDecoration: 'none', fontWeight: 500 }}>
            {label} <span style={{ color: '#C8A84B', fontSize: 11 }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  )
}
