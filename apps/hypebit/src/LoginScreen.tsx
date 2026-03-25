import { useState } from 'react';
import { login, HypebitUser } from './auth';

const C = {
  bg: '#0B0F1A', surface: '#111827', surface2: '#1F2937',
  border: 'rgba(255,255,255,0.06)', text: '#F9FAFB', text2: '#9CA3AF',
  text3: '#4B5563', blue: '#3B82F6', purple: '#8B5CF6', green: '#10B981',
};

const DEMO_ACCOUNTS = [
  { email: 'ceo@demo.hypebit.com',     label: 'CEO',     desc: 'Full overview' },
  { email: 'growth@demo.hypebit.com',  label: 'Growth',  desc: 'Funnels & campaigns' },
  { email: 'analyst@demo.hypebit.com', label: 'Analyst', desc: 'Product & cohorts' },
  { email: 'admin@demo.hypebit.com',   label: 'Admin',   desc: 'Full access' },
];

export default function LoginScreen({ onLogin }: { onLogin: (user: HypebitUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', height: 44, padding: '0 14px',
    background: C.surface2,
    border: `1px solid ${focused === field ? C.blue : C.border}`,
    borderRadius: 8, color: C.text, fontSize: 14, outline: 'none',
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = login(email, password);
      if (user) { onLogin(user); }
      else {
        setError('Invalid credentials. Use demo123 as password.');
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif',
      backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#111827"/>
              <rect x="4" y="16" width="6" height="12" rx="1" fill="#3B82F6"/>
              <rect x="13" y="10" width="6" height="18" rx="1" fill="#8B5CF6"/>
              <rect x="22" y="4" width="6" height="24" rx="1" fill="#10B981"/>
            </svg>
            <span style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>hypebit</span>
          </div>
          <div style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>Growth OS for SaaS & e-commerce</div>
        </div>

        {/* Form card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '28px 24px', marginBottom: 14,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 20 }}>Sign in to your workspace</h2>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#FCA5A5',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.text2, display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoComplete="email"
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                style={inputStyle('email')}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.text2, display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                style={inputStyle('password')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44, marginTop: 4,
                background: loading ? '#1D4ED8' : C.blue,
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '16px 20px',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: C.text3,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Demo accounts · password: demo123
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {DEMO_ACCOUNTS.map(d => (
              <button
                key={d.email}
                onClick={() => { setEmail(d.email); setPassword('demo123'); setError(''); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', borderRadius: 6,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: C.blue,
                    background: 'rgba(59,130,246,0.1)', padding: '2px 7px',
                    borderRadius: 4, letterSpacing: '0.05em',
                  }}>{d.label.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: C.text2 }}>{d.desc}</span>
                </div>
                <span style={{ fontSize: 11, color: C.text3, fontFamily: 'JetBrains Mono, monospace' }}>
                  {d.email.split('@')[0]}@…
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: C.text3 }}>
          <a href="https://hypbit.com" style={{ color: C.text3, textDecoration: 'none' }}>← Back to hypbit.com</a>
        </div>
      </div>
    </div>
  );
}
