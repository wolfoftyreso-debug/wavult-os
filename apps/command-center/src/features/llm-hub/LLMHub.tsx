// ─── LLM Hub — Wavult Group ───────────────────────────────────────────────────
// Fallback-strategi: GPT-4.6 → Claude Sonnet → Graceful Error
// "Vi gör aldrig något fel i våra system." — Erik Svensson

import { useState, useRef, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LLMResult {
  text: string
  provider: 'openai' | 'anthropic' | 'error'
  fallbackUsed: boolean
  userMessage?: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  provider?: 'openai' | 'anthropic' | 'error'
  fallbackUsed?: boolean
}

interface LLMStatus {
  ok: boolean
  providers: Array<{ name: string; available: boolean }>
  message: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

// ─── Provider Badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider, fallbackUsed }: { provider: LLMResult['provider']; fallbackUsed: boolean }) {
  if (provider === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-mono">
        ⚠️ Fel
      </span>
    )
  }

  if (fallbackUsed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 font-mono">
        ⚠️ Fallback · {provider === 'openai' ? 'OpenAI' : 'Anthropic'}
      </span>
    )
  }

  if (provider === 'openai') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 font-mono">
        ✦ OpenAI
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400 font-mono">
      ◆ Anthropic
    </span>
  )
}

// ─── Status Panel ─────────────────────────────────────────────────────────────

function StatusPanel({ status, loading }: { status: LLMStatus | null; loading: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-mono">
      <span className="text-white/40">PROVIDERS</span>
      {loading && <span className="text-white/30 animate-pulse">Laddar...</span>}
      {!loading && !status && <span className="text-red-400/70">Kunde inte hämta status</span>}
      {!loading && status && status.providers.map(p => (
        <span key={p.name} className={`flex items-center gap-1.5 ${p.available ? 'text-emerald-400' : 'text-white/30'}`}>
          {p.available ? '✅' : '❌'}
          <span className="capitalize">{p.name === 'openai' ? 'OpenAI' : 'Anthropic'}</span>
        </span>
      ))}
      {!loading && status && (
        <span className={`ml-auto ${status.ok ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
          {status.message}
        </span>
      )}
    </div>
  )
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(apiUrl('/api/llm/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const result: LLMResult = await response.json()

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.provider === 'error'
          ? (result.userMessage ?? 'Systemet är tillfälligt otillgängligt.')
          : result.text,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Systemet är tillfälligt otillgängligt. Vi arbetar på det.',
          provider: 'error',
          fallbackUsed: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-white/20 text-sm">
            <span className="text-4xl mb-3">🧠</span>
            <span>Starta konversationen...</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : msg.provider === 'error'
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm'
                    : 'bg-white/[0.07] text-white/90 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.provider && (
                <ProviderBadge provider={msg.provider} fallbackUsed={msg.fallbackUsed ?? false} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.07] px-4 py-3 rounded-2xl rounded-bl-sm">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Skriv ett meddelande... (Enter för att skicka, Shift+Enter för ny rad)"
          rows={2}
          className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] resize-none"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium text-sm flex-shrink-0"
        >
          {loading ? '...' : '↑'}
        </button>
      </div>

      {messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          className="mt-2 text-xs text-white/20 hover:text-white/40 transition-colors self-center"
        >
          Rensa konversation
        </button>
      )}
    </div>
  )
}

// ─── Playground Tab ───────────────────────────────────────────────────────────

function PlaygroundTab() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [result, setResult] = useState<LLMResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const run = async () => {
    if (!userPrompt.trim() || loading) return

    setLoading(true)
    setResult(null)
    setLatencyMs(null)
    const t0 = Date.now()

    try {
      const response = await fetch(apiUrl('/api/llm/complete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt.trim(),
          system: systemPrompt.trim() || undefined,
        }),
      })

      const data: LLMResult = await response.json()
      setResult(data)
      setLatencyMs(Date.now() - t0)
    } catch {
      setResult({
        text: '',
        provider: 'error',
        fallbackUsed: true,
        userMessage: 'Systemet är tillfälligt otillgängligt. Vi arbetar på det.',
      })
      setLatencyMs(Date.now() - t0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs text-white/40 font-mono mb-1.5">SYSTEM PROMPT (valfri)</label>
        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          placeholder="Du är en hjälpsam assistent..."
          rows={3}
          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] resize-none font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-white/40 font-mono mb-1.5">USER PROMPT *</label>
        <textarea
          value={userPrompt}
          onChange={e => setUserPrompt(e.target.value)}
          placeholder="Skriv din prompt här..."
          rows={4}
          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] resize-none"
        />
      </div>

      <button
        onClick={run}
        disabled={loading || !userPrompt.trim()}
        className="self-start px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium text-sm"
      >
        {loading ? '⏳ Kör...' : '▶ Kör'}
      </button>

      {result && (
        <div className="flex flex-col gap-3">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <ProviderBadge provider={result.provider} fallbackUsed={result.fallbackUsed} />
            {latencyMs !== null && (
              <span className="text-white/30 font-mono">{latencyMs} ms</span>
            )}
            {result.fallbackUsed && result.provider !== 'error' && (
              <span className="text-amber-400/70">Fallback användes</span>
            )}
          </div>

          {/* Svar */}
          <div className={`p-4 rounded-xl border text-sm whitespace-pre-wrap leading-relaxed ${
            result.provider === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-white/[0.04] border-white/[0.08] text-white/90'
          }`}>
            {result.provider === 'error'
              ? (result.userMessage ?? 'Systemet är tillfälligt otillgängligt.')
              : result.text}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LLMHub() {
  const [activeTab, setActiveTab] = useState<'chat' | 'playground'>('chat')
  const [status, setStatus] = useState<LLMStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(apiUrl('/api/llm/status'))
        const data: LLMStatus = await response.json()
        setStatus(data)
      } catch {
        setStatus(null)
      } finally {
        setStatusLoading(false)
      }
    }

    fetchStatus()
    // Uppdatera status var 30:e sekund
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: '💬' },
    { id: 'playground' as const, label: 'Playground', icon: '🧪' },
  ]

  return (
    <div className="min-h-screen bg-[#080C10] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0D1117]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                🧠 LLM Hub
              </h1>
              <p className="text-sm text-white/40 mt-0.5">
                GPT-4.6 → Claude Sonnet → Graceful Error
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {/* Status Panel — alltid synlig */}
        <StatusPanel status={status} loading={statusLoading} />

        {/* Tab Content */}
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'playground' && <PlaygroundTab />}
      </div>
    </div>
  )
}
