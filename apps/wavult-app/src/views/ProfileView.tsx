// ─── Wavult App — Profile & Wallet ────────────────────────────────────────────
// Complete executive profile with travel documents, contact sharing, live location

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useAvatar } from '../lib/AvatarContext'
import { OperatorAvatar } from '../components/OperatorAvatar'
import QRCode from 'qrcode'

const OPERATOR = {
  role: 'Chairman & Group CEO',
  entities: ['WGH', 'WOP', 'QZ-EU', 'QZ-US', 'LVX-US'],
  accentColor: '#1E40AF',
  phone_se: '+46 709 123 223',
  phone_us: '+1 (placeholder)',
  linkedin: 'linkedin.com/in/eriksvensson',
  email: 'erik@wavult.com',
  departure: new Date('2026-04-11'),
  stats: { totalResolved: 142, avgResponseMin: 3.2, longestStreak: 12, activeSince: 'Mar 2026' },
}

// Documents stored in profile
const DOCUMENTS = [
  { id: 'flight', icon: '✈️', label: 'Boarding Pass', detail: 'Norse NO 191 · ARN→BKK · 11 apr 23:05', status: 'confirmed', color: '#16A34A' },
  { id: 'visa', icon: '🛂', label: 'Visum', detail: '30 dagar visumfritt · Svenska pass', status: 'ok', color: '#16A34A' },
  { id: 'passport', icon: '📘', label: 'Pass', detail: 'Sverige · Giltigt t.o.m. ???', status: 'active', color: '#2563EB' },
  { id: 'card', icon: '💳', label: 'Betalkort', detail: 'Revolut Business · Saldo: kontrollera ⚠️', status: 'warn', color: '#D97706' },
  { id: 'hotel', icon: '🏨', label: 'Hotell', detail: 'Nysa Hotel Bangkok · 12 apr → 11 maj', status: 'confirmed', color: '#16A34A' },
]

function useCurrentLocation() {
  const [info, setInfo] = useState({ city: '', country: '', time: '', flag: '' })
  
  useEffect(() => {
    const update = () => {
      const departure = new Date('2026-04-11')
      const now = new Date()
      
      let tz: string, city: string, country: string, flag: string
      if (now < departure) {
        tz = 'Europe/Stockholm'; city = 'Tyresö'; country = 'Sverige'; flag = '🇸🇪'
      } else {
        tz = 'Asia/Bangkok'; city = 'Bangkok'; country = 'Thailand'; flag = '🇹🇭'
      }
      
      const time = new Intl.DateTimeFormat('sv-SE', { 
        hour: '2-digit', minute: '2-digit', timeZone: tz, timeZoneName: 'short'
      }).format(new Date())
      
      setInfo({ city, country, time, flag })
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])
  
  return info
}

export function ProfileView() {
  const { user, signOut } = useAuth()
  const { avatarUrl, openUploader, saving } = useAvatar()
  const location = useCurrentLocation()
  const [showQR, setShowQR] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [activeDoc, setActiveDoc] = useState<string | null>(null)
  
  const name = user?.user_metadata?.full_name || 'Erik Svensson'
  const initials = 'ES'

  // Contact card URL
  const contactUrl = `https://wavult.com/contact/erik`
  const vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:Erik Svensson\nORG:Wavult Group\nTITLE:Chairman & Group CEO\nTEL;TYPE=CELL,VOICE:+46709123223\nEMAIL:erik@wavult.com\nURL:https://wavult.com\nEND:VCARD`

  const generateQR = async () => {
    const url = await QRCode.toDataURL(contactUrl, { 
      width: 280, margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    })
    setQrUrl(url)
    setShowQR(true)
  }

  const shareContact = async (method: 'sms' | 'email') => {
    if (method === 'sms') {
      window.open(`sms:?body=Hej! Här är mina kontaktuppgifter: ${contactUrl}`)
    } else {
      window.open(`mailto:?subject=Kontakt: Erik Svensson, Wavult Group&body=Hej!%0A%0AHär är mina kontaktuppgifter:%0A${contactUrl}%0A%0AErik Svensson%0AChairman %26 Group CEO%0AWavult Group`)
    }
  }

  return (
    <div style={{ paddingBottom: 100, background: 'var(--color-bg)', minHeight: '100vh' }}>
      
      {/* ── Avatar + Name ─────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 20px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <OperatorAvatar initials={initials} color={OPERATOR.accentColor} size="xl" ring onClick={openUploader} />
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-surface)', border: '2px solid var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={openUploader}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#C4961A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 1.5a2.121 2.121 0 013 3L5 14l-4 1 1-4z" />
            </svg>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 2 }}>{name}</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{OPERATOR.role}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>erik@wavult.com</p>

        {/* Live location */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '5px 12px', borderRadius: 20, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <span style={{ fontSize: 14 }}>{location.flag}</span>
          <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>{location.city}, {location.country}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{location.time}</span>
        </div>
      </div>

      {/* ── Contact Share ──────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>Dela kontakt</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => shareContact('sms')}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            SMS
          </button>
          <button onClick={() => shareContact('email')}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 20 }}>📧</span>
            Mail
          </button>
          <button onClick={generateQR}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            QR-kod
          </button>
        </div>
      </div>

      {/* ── QR Modal ──────────────────────────────────────────────── */}
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowQR(false)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, textAlign: 'center', maxWidth: 320 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Erik Svensson</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Skanna för att spara kontakt</div>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, borderRadius: 8, margin: '0 auto' }} />}
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12 }}>{contactUrl}</div>
            <button onClick={() => setShowQR(false)}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: 'var(--color-brand)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              Stäng
            </button>
          </div>
        </div>
      )}

      {/* ── Contact Links ─────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>Kontakt</div>
        {[
          { icon: '📞', label: 'Sverige', value: '+46 709 123 223', href: 'tel:+46709123223' },
          { icon: '📧', label: 'Mail', value: 'erik@wavult.com', href: 'mailto:erik@wavult.com' },
          { icon: '💼', label: 'LinkedIn', value: 'linkedin.com/in/eriksvensson', href: 'https://linkedin.com/in/eriksvensson' },
          { icon: '🌐', label: 'Wavult Group', value: 'wavult.com', href: 'https://wavult.com' },
        ].map(item => (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)', textDecoration: 'none' }}>
            <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{item.value}</div>
            </div>
          </a>
        ))}
      </div>

      {/* ── Travel Documents / Wallet ─────────────────────────────── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>Resor & Dokument</div>
        {DOCUMENTS.map(doc => (
          <div key={doc.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${doc.color}30`, background: `${doc.color}08`, marginBottom: 8, cursor: 'pointer' }}
            onClick={() => setActiveDoc(activeDoc === doc.id ? null : doc.id)}>
            <span style={{ fontSize: 22 }}>{doc.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{doc.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{doc.detail}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: doc.color }} />
          </div>
        ))}
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { n: OPERATOR.stats.totalResolved, l: 'Lösta ärenden' },
            { n: `${OPERATOR.stats.avgResponseMin}m`, l: 'Snitt svarstid' },
            { n: OPERATOR.stats.longestStreak, l: 'Bäst streak' },
            { n: OPERATOR.stats.activeSince, l: 'Aktiv sedan' },
          ].map(s => (
            <div key={s.l} style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6', letterSpacing: '-0.03em' }}>{s.n}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Entities ─────────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Aktiva entiteter</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {OPERATOR.entities.map(e => (
            <span key={e} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>{e}</span>
          ))}
        </div>
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────── */}
      <div style={{ padding: '20px' }}>
        <button onClick={signOut}
          style={{ width: '100%', padding: '14px', borderRadius: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#EF4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Logga ut
        </button>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 12, fontFamily: 'monospace', letterSpacing: '0.1em' }}>WAVULT OS v2 · {name}</p>
      </div>
    </div>
  )
}
