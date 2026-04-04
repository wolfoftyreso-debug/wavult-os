// ─── Bernt — Persistent AI Widget ────────────────────────────────────────────
// Din inbyggda AI-assistent i Wavult OS. Alltid tillgänglig, oavsett modul.
// Röstinput via Web Speech API. Kontext-medveten, 5-sekunders polling.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'
import { useAuth } from '../../shared/auth/AuthContext'
import { useBerntChat, type SystemAction } from '../agent/useBerntChat'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── SystemAction Badges ──────────────────────────────────────────────────────

function ActionBadge({ action }: { action: SystemAction }) {
  const color =
    action.status === 'done'
      ? { bg: '#16a34a15', border: '#16a34a30', text: '#4ade80' }
      : action.status === 'failed'
        ? { bg: '#ef444415', border: '#ef444430', text: '#f87171' }
        : { bg: '#2563eb15', border: '#2563eb30', text: '#60a5fa' }

  const icon = action.status === 'done' ? '✓' : action.status === 'failed' ? '✗' : '⟳'

  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded"
      style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}
    >
      {icon} {action.description}
    </span>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function BerntWidget() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Konversations-ID baserat på user + date → synkroniserar webb ↔ app
  const userId = user?.email ?? 'anonymous'
  const conversationId = `${userId}-${new Date().toISOString().slice(0, 10)}`

  const { messages, sendMessage, isLoading, isConnected } = useBerntChat(conversationId)

  // Welcome message (visas lokalt tills polling hämtar historik)
  const displayMessages =
    messages.length === 0
      ? [
          {
            id: 'welcome',
            role: 'assistant' as const,
            content: 'Hej! Vad kan jag hjälpa dig med?',
            timestamp: new Date().toISOString(),
          },
        ]
      : messages

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, open])

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return
      sendMessage(text.trim())
      setInput('')
    },
    [sendMessage]
  )

  const { listening, start: startListen, stop: stopListen } = useSpeechRecognition(handleSend)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          boxShadow: '0 0 0 3px #2563EB20, 0 8px 24px #0008',
        }}
        title="Bernt — AI-assistent"
      >
        <span className="text-xl">{open ? '✕' : '🤖'}</span>
        {isConnected && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-80 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid #DDD5C5',
            height: '420px',
            boxShadow: '0 0 40px #2563EB20, 0 20px 60px #0009',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F0E8 100%)',
              borderBottom: '1px solid #DDD5C5',
            }}
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
            >
              🤖
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-text-primary">Bernt</p>
              <div className="flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}
                />
                <p
                  className="text-[9px] font-mono"
                  style={{ color: isConnected ? '#4ade80' : '#facc15' }}
                >
                  {isConnected ? 'CONNECTED' : 'OFFLINE'}
                </p>
              </div>
            </div>
          </div>

          {/* Offline banner */}
          {!isConnected && (
            <div
              className="px-4 py-2 flex-shrink-0 text-[10px]"
              style={{
                background: 'rgba(234,179,8,0.08)',
                borderBottom: '1px solid rgba(234,179,8,0.2)',
                color: '#92400e',
              }}
            >
              Bernt är offline just nu. Meddelanden sparas och skickas när anslutningen återupprättas.
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {displayMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { background: '#2563EB25', color: '#93C5FD', border: '1px solid #2563EB30' }
                      : { background: '#F5F0E8', color: '#0A3D62', border: '1px solid #DDD5C5' }
                  }
                >
                  {msg.content}
                </div>
                {/* System actions badges */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 max-w-[85%]">
                    {msg.actions.map((action, i) => (
                      <ActionBadge key={i} action={action} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-xl text-xs"
                  style={{ background: '#F5F0E8', border: '1px solid #DDD5C5' }}
                >
                  <span className="flex gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick starters */}
          {displayMessages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {BERNT_STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-[9px] font-mono px-2 py-1 rounded-full transition-colors"
                  style={{
                    background: '#2563EB10',
                    color: '#60A5FA',
                    border: '1px solid #2563EB20',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="px-3 pb-3 flex-shrink-0 flex gap-2"
            style={{ borderTop: '1px solid #DDD5C5' }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend(input)}
              placeholder="Skriv till Bernt..."
              className="flex-1 text-xs bg-white border border-surface-border rounded-xl px-3 py-2 text-text-primary placeholder-gray-700 focus:outline-none focus:border-blue-600/40 mt-2"
              disabled={isLoading}
            />
            <button
              onClick={listening ? stopListen : startListen}
              className="mt-2 h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: listening ? '#EF444420' : '#2563EB15',
                border: `1px solid ${listening ? '#EF444430' : '#2563EB25'}`,
                color: listening ? '#F87171' : '#60A5FA',
              }}
              title={listening ? t('action.stop') : t('action.speak')}
            >
              {listening ? '⏹' : '🎤'}
            </button>
            <button
              onClick={() => !isLoading && handleSend(input)}
              disabled={!input.trim() || isLoading}
              className="mt-2 h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
              style={{ background: '#2563EB20', border: '1px solid #2563EB30', color: '#60A5FA' }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
