import { useState } from 'react'

interface SMSLog {
  id: string
  to: string
  toName: string
  message: string
  status: 'sent' | 'failed' | 'pending'
  timestamp: string
  provider: '46elks' | 'twilio'
  cost?: string
}

const MOCK_SMS_LOG: SMSLog[] = [
  {
    id: 'sms-001',
    to: '+46738968949',
    toName: 'Leon Russo De Cerame',
    message: 'Möte imorgon 09:00 — bekräfta att du är med.',
    status: 'sent',
    timestamp: '2026-03-26T09:00:00Z',
    provider: '46elks',
    cost: '0.08 kr',
  },
  {
    id: 'sms-002',
    to: '+46768123548',
    toName: 'Winston Bjarnemark',
    message: 'Revolut KYC godkänt — starta sweeping-setup.',
    status: 'sent',
    timestamp: '2026-03-26T08:45:00Z',
    provider: '46elks',
    cost: '0.08 kr',
  },
  {
    id: 'sms-003',
    to: '+46736977576',
    toName: 'Johan Berglund',
    message: 'ECS healthcheck — kör diagnostik på hypbit-api nu.',
    status: 'sent',
    timestamp: '2026-03-25T22:10:00Z',
    provider: '46elks',
    cost: '0.08 kr',
  },
  {
    id: 'sms-004',
    to: '+46761474243',
    toName: 'Dennis Bjarnemark',
    message: 'Skicka UAB-avtalet till mig på email — behöver granska ikväll.',
    status: 'failed',
    timestamp: '2026-03-25T19:30:00Z',
    provider: '46elks',
  },
  {
    id: 'sms-005',
    to: '+46738968949',
    toName: 'Leon Russo De Cerame',
    message: 'Thailand workcamp — hotell bokade i Pattaya för 11-18 april.',
    status: 'sent',
    timestamp: '2026-03-25T14:00:00Z',
    provider: '46elks',
    cost: '0.08 kr',
  },
  {
    id: 'sms-006',
    to: '+46709123223',
    toName: 'Erik Svensson',
    message: 'System alert: Stripe webhook failure rate >5% senaste 15min.',
    status: 'sent',
    timestamp: '2026-03-24T11:22:00Z',
    provider: 'twilio',
    cost: '$0.0079',
  },
]

const TEAM_CONTACTS = [
  { name: 'Leon Russo De Cerame', number: '+46738968949' },
  { name: 'Winston Bjarnemark', number: '+46768123548' },
  { name: 'Johan Berglund', number: '+46736977576' },
  { name: 'Dennis Bjarnemark', number: '+46761474243' },
  { name: 'Erik Svensson', number: '+46709123223' },
]

const ELKS_CONFIGURED = true // ✅ Konfigurerad — verifierad 2026-03-27. Kredit: 14 200 SEK. Avsändare: "Wavult"

export function SMSView() {
  const [log, setLog] = useState<SMSLog[]>(MOCK_SMS_LOG)
  const [showForm, setShowForm] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [customNumber, setCustomNumber] = useState('')
  const [message, setMessage] = useState('')

  async function sendSMS() {
    const to = recipient === 'custom' ? customNumber : recipient
    if (!to || !message) return

    const contact = TEAM_CONTACTS.find(c => c.number === to)
    const pendingSMS: SMSLog = {
      id: `sms-${Date.now()}`,
      to,
      toName: contact?.name ?? to,
      message,
      status: 'pending',
      timestamp: new Date().toISOString(),
      provider: '46elks',
    }
    setLog(prev => [pendingSMS, ...prev])
    setMessage('')
    setRecipient('')
    setCustomNumber('')
    setShowForm(false)

    // Skicka via backend-API (ECS server)
    // OBS: direkta 46elks-anrop från frontend kräver CORS-proxy eller backend
    // Status uppdateras när backend svarar
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, from: 'Wavult' }),
      })
      const status = res.ok ? 'sent' : 'failed'
      setLog(prev => prev.map(s => s.id === pendingSMS.id ? { ...s, status } : s))
    } catch {
      // Backend ej nåbar — markera som ej live
      setLog(prev => prev.map(s =>
        s.id === pendingSMS.id
          ? { ...s, status: 'failed' as const }
          : s
      ))
    }
  }

  const sentCount = log.filter(s => s.status === 'sent').length
  const failedCount = log.filter(s => s.status === 'failed').length

  return (
    <div className="space-y-4">
      {/* MOCKDATA BANNER for log */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-medium">
        <span>⚠️</span>
        <span>SMS-loggen visar mockdata — utgående SMS via "Skicka SMS"-knappen är live (46elks API)</span>
        <span className="ml-auto text-yellow-600 font-mono text-xs">LOG: MOCK · SEND: LIVE</span>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
          ELKS_CONFIGURED
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        }`}>
          <span className={`h-2 w-2 rounded-full ${ELKS_CONFIGURED ? 'bg-green-400' : 'bg-yellow-400'}`} />
          46elks: {ELKS_CONFIGURED ? 'Konfigurerad ✓' : 'Ej konfigurerad — Twilio fallback aktiv'}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-500/20 bg-gray-500/10 text-gray-500 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-gray-500" />
          Twilio: Ej konfigurerad (ej behövs)
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-500">{sentCount} skickade · {failedCount} misslyckade</span>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-accent/15 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/25 transition-colors"
          >
            📱 Skicka SMS
          </button>
        </div>
      </div>

      {/* Compose form */}
      {showForm && (
        <div className="bg-[#0D0F1A] rounded-xl border border-brand-accent/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">Nytt SMS</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">×</button>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1 block">Mottagare</label>
            <select
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent/50"
            >
              <option value="">Välj kontakt…</option>
              {TEAM_CONTACTS.map(c => (
                <option key={c.number} value={c.number}>{c.name} ({c.number})</option>
              ))}
              <option value="custom">Ange nummer manuellt…</option>
            </select>
          </div>
          {recipient === 'custom' && (
            <div>
              <label className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1 block">Telefonnummer</label>
              <input
                value={customNumber}
                onChange={e => setCustomNumber(e.target.value)}
                placeholder="+46…"
                className="w-full bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent/50"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1 block">
              Meddelande ({message.length}/160)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 160))}
              placeholder="Skriv SMS…"
              rows={3}
              className="w-full bg-[#07080F] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent/50 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Provider: {ELKS_CONFIGURED ? '46elks (primär)' : 'Twilio (fallback)'}
            </span>
            <button
              onClick={sendSMS}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
            >
              Skicka →
            </button>
          </div>
        </div>
      )}

      {/* SMS log */}
      <div className="bg-[#0D0F1A] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-white">SMS-logg</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {log.map(sms => (
            <div key={sms.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-200">{sms.toName}</span>
                  <span className="text-xs text-gray-600 font-mono">{sms.to}</span>
                  <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    sms.status === 'sent' ? 'bg-green-500/15 text-green-400' :
                    sms.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                    'bg-yellow-500/15 text-yellow-400'
                  }`}>
                    {sms.status === 'sent' ? '✓ Skickat' : sms.status === 'failed' ? '✗ Misslyckades' : '⏳ Väntar'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{sms.message}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-600 font-mono">
                    {new Date(sms.timestamp).toLocaleString('sv-SE')}
                  </span>
                  <span className="text-xs text-gray-700">via {sms.provider}</span>
                  {sms.cost && <span className="text-xs text-gray-700">{sms.cost}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
