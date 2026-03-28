// ─── Bernt — Persistent AI Widget ────────────────────────────────────────────
// Din inbyggda AI-assistent i Wavult OS. Alltid tillgänglig, oavsett modul.
// Röstinput via Web Speech API. Ansluten till Bernt-tunnel.

import { useState, useRef, useEffect, useCallback } from 'react'

const BERNT_TUNNEL_KEY = 'bernt_tunnel_url'
const DEFAULT_TUNNEL = 'https://bernt.wavult.com'

interface Message {
  id: string
  role: 'user' | 'bernt'
  text: string
  ts: number
}

const BERNT_STARTERS = [
  'Vad är nästa prioritet?',
  'Hur ser ekonomin ut?',
  'Vad händer med quiXzoom?',
  'Visa systemstatus',
]

// ─── Speech Recognition ───────────────────────────────────────────────────────

function useSpeechRecognition(onResult: (text: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const [listening, setListening] = useState(false)

  const start = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) return

    const rec = new SpeechRec()
    rec.lang = 'sv-SE'
    rec.continuous = false
    rec.interimResults = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      onResult(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    rec.start()
    recRef.current = rec
    setListening(true)
  }, [onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop }
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function BerntWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'bernt', text: 'Hej Erik! Vad kan jag hjälpa dig med?', ts: Date.now() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tunnelUrl, setTunnelUrl] = useState(() => localStorage.getItem(BERNT_TUNNEL_KEY) || DEFAULT_TUNNEL)
  const [showSettings, setShowSettings] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim(), ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    if (!tunnelUrl) {
      setMessages(prev => [...prev, {
        id: `b-${Date.now()}`, role: 'bernt',
        text: 'Bernt-tunnel är inte konfigurerad. Tryck ⚙️ och klistra in tunnel-URL:en.',
        ts: Date.now()
      }])
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${tunnelUrl}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text.trim(), user: 'Erik Svensson', source: 'wavult-os' }),
      })
      const data = await res.json()
      const reply = data.reply || data.text || data.message || 'Inget svar.'
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bernt', text: reply, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, {
        id: `b-${Date.now()}`, role: 'bernt',
        text: 'Kunde inte nå Bernt-tunneln. Kontrollera att din dator är igång och tunneln aktiv.',
        ts: Date.now()
      }])
    } finally {
      setLoading(false)
    }
  }, [tunnelUrl])

  const { listening, start: startListen, stop: stopListen } = useSpeechRecognition(sendMessage)

  const saveTunnel = (url: string) => {
    setTunnelUrl(url)
    localStorage.setItem(BERNT_TUNNEL_KEY, url)
    setShowSettings(false)
  }

  const connected = !!tunnelUrl

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          boxShadow: '0 0 0 3px #8B5CF620, 0 8px 24px #0008',
        }}
        title="Bernt — AI-assistent"
      >
        <span className="text-xl">{open ? '✕' : '🤖'}</span>
        {connected && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-[#07080F]" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-80 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: '#0D0F1A',
            border: '1px solid rgba(139,92,246,0.3)',
            height: '420px',
            boxShadow: '0 0 40px #8B5CF620, 0 20px 60px #0009',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
              🤖
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">Bernt</p>
              <div className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <p className="text-[9px] font-mono" style={{ color: connected ? '#4ade80' : '#facc15' }}>
                  {connected ? 'ANSLUTEN' : 'EJ KONFIGURERAD'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="text-gray-600 hover:text-gray-300 transition-colors text-sm"
              title="Inställningar"
            >⚙️</button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="px-4 py-3 flex-shrink-0 border-b border-surface-border animate-fade-in">
              <p className="text-xs text-gray-500 font-mono mb-1.5">TUNNEL URL</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={tunnelUrl}
                  placeholder="https://xxx.trycloudflare.com"
                  className="flex-1 text-xs bg-surface-raised border border-surface-border rounded-lg px-2.5 py-1.5 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/50"
                  onKeyDown={e => e.key === 'Enter' && saveTunnel((e.target as HTMLInputElement).value)}
                  id="tunnel-input"
                />
                <button
                  onClick={() => saveTunnel((document.getElementById('tunnel-input') as HTMLInputElement)?.value || '')}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                  style={{ background: '#8B5CF620', color: '#A78BFA', border: '1px solid #8B5CF630' }}
                >
                  Spara
                </button>
              </div>
              <p className="text-[9px] text-gray-700 mt-1.5">Hitta URL i /tmp/bernt-tunnel.log på din dator</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                  style={msg.role === 'user'
                    ? { background: '#8B5CF625', color: '#C4B5FD', border: '1px solid #8B5CF630' }
                    : { background: '#1C2029', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#1C2029', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick starters */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {BERNT_STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-[9px] font-mono px-2 py-1 rounded-full transition-colors"
                  style={{ background: '#8B5CF610', color: '#A78BFA', border: '1px solid #8B5CF620' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
              placeholder="Skriv eller tala..."
              className="flex-1 text-xs bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/40 mt-2"
              disabled={loading}
            />
            <button
              onClick={listening ? stopListen : startListen}
              className="mt-2 h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: listening ? '#EF444420' : '#8B5CF615',
                border: `1px solid ${listening ? '#EF444430' : '#8B5CF625'}`,
                color: listening ? '#F87171' : '#A78BFA',
              }}
              title={listening ? 'Stoppa' : 'Tala'}
            >
              {listening ? '⏹' : '🎤'}
            </button>
            <button
              onClick={() => !loading && sendMessage(input)}
              disabled={!input.trim() || loading}
              className="mt-2 h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
              style={{ background: '#8B5CF620', border: '1px solid #8B5CF630', color: '#A78BFA' }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
