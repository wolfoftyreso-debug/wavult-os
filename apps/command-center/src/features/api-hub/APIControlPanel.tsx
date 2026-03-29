// ─── API Control Panel ─────────────────────────────────────────────────────────
// Central admin view for all Wavult Group API integrations — General + Financial cores

import { useState } from 'react'
import { Activity, DollarSign, AlertTriangle } from 'lucide-react'

const API_CATALOG = [
  // General Core
  { id: 'openai',           name: 'OpenAI',             category: 'AI',              tier: 'general',   status: 'active',  cost_estimate: '~$50/mån' },
  { id: 'anthropic',        name: 'Anthropic',           category: 'AI',              tier: 'general',   status: 'active',  cost_estimate: '~$140/mån' },
  { id: 'elevenlabs',       name: 'ElevenLabs',          category: 'AI Voice',        tier: 'general',   status: 'active',  cost_estimate: '~$100/mån' },
  { id: 'mapbox',           name: 'Mapbox',              category: 'Maps',            tier: 'general',   status: 'active',  cost_estimate: '~$0/mån (free tier)' },
  { id: 'duffel',           name: 'Duffel',              category: 'Travel',          tier: 'general',   status: 'pending', cost_estimate: 'Per booking' },
  { id: 'twilio',           name: 'Twilio',              category: 'Communications',  tier: 'general',   status: 'pending', cost_estimate: '~$5/mån' },
  { id: 'resend',           name: 'Resend',              category: 'Email',           tier: 'general',   status: 'active',  cost_estimate: '~$20/mån' },
  { id: 'pexels',           name: 'Pexels',              category: 'Media',           tier: 'general',   status: 'active',  cost_estimate: 'Free' },
  // Financial Core (isolated VPC)
  { id: 'financial-core',   name: 'Financial Core VPC',  category: 'Infrastructure',  tier: 'financial', status: 'active',  cost_estimate: 'AWS VPC cost' },
  { id: 'revolut-biz',      name: 'Revolut Business',    category: 'Banking',         tier: 'financial', status: 'active',  cost_estimate: 'Per txn' },
  { id: 'revolut-merchant', name: 'Revolut Merchant',    category: 'Payments',        tier: 'financial', status: 'pending', cost_estimate: 'Per txn' },
  { id: 'stripe',           name: 'Stripe',              category: 'Payments',        tier: 'financial', status: 'active',  cost_estimate: '2.9% + 30¢' },
  { id: 'nordea',           name: 'Nordea Open Banking', category: 'Banking',         tier: 'financial', status: 'pending', cost_estimate: 'TBD' },
  { id: 'namecheap', name: 'Namecheap', category: 'Domains', tier: 'general', status: 'active', cost_estimate: 'Per domain' },
  { id: '46elks', name: '46elks', category: 'SMS/Voice SE', tier: 'general', status: 'active', cost_estimate: '~0.05 kr/SMS' },
  { id: 'shotstack', name: 'Shotstack', category: 'Video Render', tier: 'general', status: 'active', cost_estimate: 'Per render' },
  { id: 'gandi', name: 'Gandi', category: 'Domains', tier: 'general', status: 'active', cost_estimate: 'Per domain' },
  { id: 'mapbox', name: 'Mapbox', category: 'Maps', tier: 'general', status: 'active', cost_estimate: 'Free tier' },
  { id: 'supabase', name: 'Supabase', category: 'Database', tier: 'general', status: 'active', cost_estimate: 'Free tier' },
  { id: 'cloudflare', name: 'Cloudflare', category: 'CDN/DNS/Edge', tier: 'general', status: 'active', cost_estimate: 'Free + Pro' },
  { id: 'aws', name: 'AWS', category: 'Infrastructure', tier: 'general', status: 'active', cost_estimate: '~$150/mån' },
  { id: 'github', name: 'GitHub', category: 'DevOps', tier: 'general', status: 'active', cost_estimate: 'Free/Pro' },
  { id: 'resend', name: 'Resend', category: 'Email', tier: 'general', status: 'active', cost_estimate: '~$20/mån' },
  { id: 'stripe-atlas', name: 'Stripe Atlas', category: 'Company Formation', tier: 'financial', status: 'active', cost_estimate: '$500/formation' },
  { id: 'duffel', name: 'Duffel', category: 'Travel/Flights', tier: 'general', status: 'pending', cost_estimate: 'Per booking' },
  { id: 'twilio', name: 'Twilio', category: 'SMS/Voice US', tier: 'general', status: 'pending', cost_estimate: '~$1/nr/mån' },
  { id: 'openclaw', name: 'OpenClaw', category: 'AI Infrastructure', tier: 'general', status: 'active', cost_estimate: 'Subscription' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#DCFCE7', color: '#166534', label: 'Aktiv' },
  pending: { bg: '#FEF3C7', color: '#92400E', label: 'Väntar' },
  disabled:{ bg: '#F3F4F6', color: '#6B7280', label: 'Inaktiv' },
}

export function APIControlPanel() {
  const [filter, setFilter] = useState<'all' | 'general' | 'financial'>('all')

  const filtered = filter === 'all' ? API_CATALOG : API_CATALOG.filter(a => a.tier === filter)
  const active  = API_CATALOG.filter(a => a.status === 'active').length
  const pending = API_CATALOG.filter(a => a.status === 'pending').length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, fontFamily: '-apple-system, sans-serif' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Aktiva API:er', value: String(active),           icon: <Activity size={18} />,      color: '#16A34A' },
          { label: 'Väntar',        value: String(pending),           icon: <AlertTriangle size={18} />, color: '#D97706' },
          { label: 'Totalt',        value: String(API_CATALOG.length),icon: <DollarSign size={18} />,    color: '#7C3AED' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['all', 'Alla'], ['general', 'General Core'], ['financial', 'Financial Core']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{
              padding: '6px 16px', borderRadius: 20,
              border: `1px solid ${filter === id ? '#7C3AED' : '#E5E7EB'}`,
              background: filter === id ? '#7C3AED' : '#fff',
              color: filter === id ? '#fff' : '#374151',
              fontSize: 13, fontWeight: filter === id ? 600 : 400, cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Financial security warning */}
      {filter === 'financial' && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E', display: 'flex', gap: 8 }}>
          🔒 Financial Core — Isolerad VPC, signerade requests, full audit log. Hantera med försiktighet.
        </div>
      )}

      {/* API table */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['API', 'Kategori', 'Core', 'Status', 'Kostnad', 'Endpoint'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((api, i) => {
              const s = STATUS_STYLE[api.status] || STATUS_STYLE.disabled
              return (
                <tr key={api.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1C1C1E' }}>{api.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{api.category}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: api.tier === 'financial' ? '#FEE2E2' : '#EDE9FE',
                      color: api.tier === 'financial' ? '#991B1B' : '#5B21B6',
                    }}>
                      {api.tier === 'financial' ? '🔒 Financial' : 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color, fontWeight: 600 }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace', fontSize: 11 }}>{api.cost_estimate}</td>
                  <td style={{ padding: '12px 16px', color: '#9CA3AF', fontFamily: 'monospace', fontSize: 10 }}>
                    /v1/{api.id}/*
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
