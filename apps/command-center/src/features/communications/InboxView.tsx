import { useState } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'

interface Message {
  id: string
  from: string
  fromInitials: string
  fromColor: string
  to: string
  subject: string
  body: string
  timestamp: string
  read: boolean
}

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-001',
    from: 'Erik Svensson',
    fromInitials: 'ES',
    fromColor: '#2563EB',
    to: 'Leon Russo De Cerame',
    subject: 'QuixZoom launch timeline — vecka 15',
    body: 'Hej Leon,\n\nVi behöver låsa in lanseringsdatumet för QuixZoom Thailand. Jag föreslår att vi kör soft launch 14 april, dag 3 av workcampen. Kan du säkerställa att säljmaterialet är klart?\n\nErik',
    timestamp: '2026-03-26T09:14:00Z',
    read: false,
  },
  {
    id: 'msg-002',
    from: 'Winston Bjarnemark',
    fromInitials: 'WB',
    fromColor: '#3B82F6',
    to: 'Erik Svensson',
    subject: 'Revolut Business — KYC godkänt',
    body: 'Erik,\n\nRevolut har godkänt KYC för Wavult Operations Ltd. Vi kan nu ta emot EUR-betalningar. Ska jag sätta upp automatisk sweeping till holding?\n\nWinston',
    timestamp: '2026-03-26T08:30:00Z',
    read: false,
  },
  {
    id: 'msg-003',
    from: 'Johan Berglund',
    fromInitials: 'JB',
    fromColor: '#06B6D4',
    to: 'Erik Svensson',
    subject: 'AWS ECS deployment — wavult-api v1.4.2',
    body: 'Hej,\n\nDeployade wavult-api v1.4.2 till ECS igår kväll. Allt ser stabilt ut, latens nere på 89ms p99. En liten timeout-bugg fixad i payment webhook handler.\n\nJohan',
    timestamp: '2026-03-25T22:05:00Z',
    read: true,
  },
  {
    id: 'msg-004',
    from: 'Dennis Bjarnemark',
    fromInitials: 'DB',
    fromColor: '#F59E0B',
    to: 'Erik Svensson',
    subject: 'Avtal Litauen UAB — revidering klart',
    body: 'Erik,\n\nJag har reviderat bolagsavtalet för UAB:n. Tre punkter behöver din signatur innan vi skickar till notarien. Kan vi ta ett 30min-möte imorgon?\n\nDennis',
    timestamp: '2026-03-25T16:45:00Z',
    read: true,
  },
  {
    id: 'msg-005',
    from: 'Leon Russo De Cerame',
    fromInitials: 'LR',
    fromColor: '#10B981',
    to: 'Erik Svensson',
    subject: 'Re: QuixZoom launch timeline — vecka 15',
    body: 'Erik,\n\nKlart! Säljmaterialet är 90% klart. Pitchdeck, prislista och onboarding-guide är klara. Jobbar på case studies nu. Soft launch 14 april funkar.\n\nLeon',
    timestamp: '2026-03-25T14:20:00Z',
    read: true,
  },
  {
    id: 'msg-006',
    from: 'Erik Svensson',
    fromInitials: 'ES',
    fromColor: '#2563EB',
    to: 'Winston Bjarnemark',
    subject: 'Stripe — payment volume Q1',
    body: 'Winston,\n\nKan du ta fram Stripe-rapport för Q1? Jag behöver: total volym, failed payments, chargeback-rate. Ska in i Q1-board report.\n\nErik',
    timestamp: '2026-03-25T11:00:00Z',
    read: true,
  },
  {
    id: 'msg-007',
    from: 'Johan Berglund',
    fromInitials: 'JB',
    fromColor: '#06B6D4',
    to: 'Leon Russo De Cerame',
    subject: 'Zoomer API-dokumentation — utkast',
    body: 'Leon,\n\nBifogat är utkast på Zoomer API-dokumentation. Den täcker autentisering, uppdragsskapande och bildleverans. Feedback välkommen innan vi publicerar externt.\n\nJohan',
    timestamp: '2026-03-24T13:30:00Z',
    read: true,
  },
  {
    id: 'msg-008',
    from: 'Winston Bjarnemark',
    fromInitials: 'WB',
    fromColor: '#3B82F6',
    to: 'Dennis Bjarnemark',
    subject: 'Moms-registrering Sverige — status',
    body: 'Dennis,\n\nF-skattsedel inlämnad till Skatteverket 20 mars. Väntar på bekräftelse. Momsreg bör vara klar inom 2 veckor. Ingenting att agera på just nu.\n\nWinston',
    timestamp: '2026-03-24T09:15:00Z',
    read: true,
  },
]

interface NewMessageForm {
  to: string
  subject: string
  body: string
}

const TEAM_MEMBERS = [
  'Erik Svensson',
  'Leon Russo De Cerame',
  'Winston Bjarnemark',
  'Johan Berglund',
  'Dennis Bjarnemark',
]

export function InboxView() {
  const { t: _t } = useTranslation() // ready for i18n
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES)
  const [selected, setSelected] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [form, setForm] = useState<NewMessageForm>({ to: '', subject: '', body: '' })

  function openMessage(msg: Message) {
    setSelected(msg)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
  }

  function sendMessage() {
    if (!form.to || !form.subject || !form.body) return
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      from: 'Erik Svensson',
      fromInitials: 'ES',
      fromColor: '#2563EB',
      to: form.to,
      subject: form.subject,
      body: form.body,
      timestamp: new Date().toISOString(),
      read: true,
    }
    setMessages(prev => [newMsg, ...prev])
    setForm({ to: '', subject: '', body: '' })
    setShowCompose(false)
  }

  const unreadCount = messages.filter(m => !m.read).length

  return (
    <div className="flex flex-col h-full gap-4">

      <div className="flex h-full gap-4">
      {/* Message list */}
      <div className="flex flex-col flex-shrink-0 w-[400px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Inkorg</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-brand-accent/25 transition-colors"
          >
            ✏️ Nytt meddelande
          </button>
        </div>

        <div className="space-y-1.5 overflow-auto flex-1">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => openMessage(msg)}
              className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                selected?.id === msg.id
                  ? 'bg-blue-50 border-blue-200'
                  : msg.read
                  ? 'bg-white border-surface-border hover:border-gray-200'
                  : 'bg-white border-blue-500/20 hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: msg.fromColor + '25', color: msg.fromColor }}
                >
                  {msg.fromInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium truncate ${!msg.read ? 'text-gray-900' : 'text-gray-600'}`}>
                      {msg.from}
                    </span>
                    <span className="text-xs text-gray-9000 flex-shrink-0 font-mono">
                      {new Date(msg.timestamp).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`text-xs truncate ${!msg.read ? 'text-gray-800 font-medium' : 'text-gray-9000'}`}>
                    {msg.subject}
                  </div>
                  <div className="text-xs text-gray-9000 truncate mt-0.5">
                    Till: {msg.to}
                  </div>
                </div>
                {!msg.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-2" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message detail / Compose */}
      <div className="flex-1 bg-white rounded-xl border border-surface-border overflow-hidden">
        {showCompose ? (
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Nytt meddelande</h3>
              <button onClick={() => setShowCompose(false)} className="text-gray-9000 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <div className="space-y-3 flex-1 flex flex-col">
              <div>
                <label className="text-xs text-gray-9000 font-mono uppercase tracking-wider mb-1 block">Till</label>
                <select
                  value={form.to}
                  onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                  className="w-full bg-muted/30 border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-accent/50"
                >
                  <option value="">Välj mottagare…</option>
                  {TEAM_MEMBERS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-9000 font-mono uppercase tracking-wider mb-1 block">Ämne</label>
                <input
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Ämnesrad…"
                  className="w-full bg-muted/30 border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder-gray-600 focus:outline-none focus:border-brand-accent/50"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-xs text-gray-9000 font-mono uppercase tracking-wider mb-1 block">Meddelande</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Skriv ditt meddelande…"
                  className="flex-1 w-full bg-muted/30 border border-surface-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder-gray-600 focus:outline-none focus:border-brand-accent/50 resize-none"
                />
              </div>
              <button
                onClick={sendMessage}
                className="self-end px-5 py-2 rounded-lg text-xs font-medium bg-brand-accent text-text-primary hover:bg-brand-accent/90 transition-colors"
              >
                Skicka →
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="p-5 h-full overflow-auto">
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: selected.fromColor + '25', color: selected.fromColor }}
              >
                {selected.fromInitials}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-text-primary">{selected.from}</span>
                  <span className="text-xs text-gray-9000 font-mono">
                    {new Date(selected.timestamp).toLocaleString('sv-SE')}
                  </span>
                </div>
                <div className="text-xs text-gray-9000">Till: {selected.to}</div>
              </div>
            </div>
            <h2 className="text-[15px] font-bold text-text-primary mb-4">{selected.subject}</h2>
            <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
              {selected.body}
            </div>
            <div className="mt-5 pt-4 border-t border-surface-border">
              <button
                onClick={() => {
                  setForm({ to: selected.from, subject: `Re: ${selected.subject}`, body: '' })
                  setShowCompose(true)
                }}
                className="text-xs text-blue-700 hover:text-blue-700/80 font-medium transition-colors"
              >
                ↩ Svara
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-gray-9000 text-xs">Välj ett meddelande för att läsa det</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
