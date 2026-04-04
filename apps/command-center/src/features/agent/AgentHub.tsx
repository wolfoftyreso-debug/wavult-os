// ─── AgentHub ─────────────────────────────────────────────────────────────────
// Wavult Agent Mesh — chatta med dina tilldelade expert-agenter

import React, { useState, useEffect, useRef } from 'react'
import { useAgentChat, type Agent, type ChatMessage } from './useAgentChat'
import { Bot, Send, ChevronDown, Loader2, Zap, User, AlertCircle } from 'lucide-react'

// ─── Konstanter ───────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { id: 'erik',    name: 'Erik Svensson',        role: 'CEO' },
  { id: 'dennis',  name: 'Dennis Bjarnemark',     role: 'Legal & Ops' },
  { id: 'johan',   name: 'Johan Berglund',         role: 'CTO' },
  { id: 'leon',    name: 'Leon Russo De Cerame',   role: 'CEO Operations' },
  { id: 'winston', name: 'Winston Bjarnemark',     role: 'CFO' },
]

const DOMAIN_FILTERS = [
  { id: 'auto',    label: 'Auto-routing' },
  { id: 'qms',     label: 'QMS' },
  { id: 'legal',   label: 'Legal' },
  { id: 'finance', label: 'Finance' },
  { id: 'code',    label: 'Code' },
  { id: 'infra',   label: 'Infra' },
  { id: 'hr',      label: 'HR' },
  { id: 'sales',   label: 'Sales' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentInfoCard({ agent }: { agent: Agent }) {
  return (
    <div
      style={{ background: '#F5F0E8', border: '1px solid #E8B84B', borderRadius: 12, padding: '14px 18px' }}
      className="mb-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <Bot size={18} style={{ color: '#0A3D62' }} />
        <span style={{ fontWeight: 700, color: '#0A3D62', fontSize: 15 }}>{agent.name}</span>
        {agent.domain && (
          <span
            style={{
              background: '#E8B84B',
              color: '#0A3D62',
              borderRadius: 20,
              padding: '1px 10px',
              fontSize: 11,
              fontWeight: 700,
              marginLeft: 4,
            }}
          >
            {agent.domain.toUpperCase()}
          </span>
        )}
      </div>
      {agent.description && (
        <p style={{ color: '#5a6474', fontSize: 13, margin: '4px 0 0' }}>{agent.description}</p>
      )}
      {agent.owner && (
        <p style={{ color: '#0A3D62', fontSize: 12, marginTop: 4, opacity: 0.7 }}>
          Ägare: {agent.owner}
        </p>
      )}
    </div>
  )
}

function ModelBadge({ model }: { model: string }) {
  const short = model.includes('claude')
    ? model.replace('anthropic/', '').replace('claude-', 'Claude ')
    : model.includes('gemini')
    ? model.replace('google/', '').replace('gemini-', 'Gemini ')
    : model.replace(/.*\//, '')
  return (
    <span
      style={{
        background: '#0A3D62',
        color: '#F5F0E8',
        borderRadius: 10,
        padding: '1px 8px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {short}
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#E8B84B' : '#ef4444'
  return (
    <div className="flex items-center gap-1" title={`Routersäkerhet: ${pct}%`}>
      <Zap size={10} style={{ color }} />
      <div style={{ width: 44, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color: '#6b7280' }}>{pct}%</span>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#0A3D62',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginRight: 8,
            marginTop: 2,
          }}
        >
          <Bot size={14} color="#F5F0E8" />
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        {!isUser && (msg.agentName || msg.model || msg.confidence != null) && (
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {msg.agentName && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0A3D62' }}>
                {msg.agentName}
              </span>
            )}
            {msg.model && <ModelBadge model={msg.model} />}
            {msg.confidence != null && <ConfidenceBar value={msg.confidence} />}
          </div>
        )}
        <div
          style={{
            background: isUser ? '#0A3D62' : '#fff',
            color: isUser ? '#F5F0E8' : '#1a2233',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            border: isUser ? 'none' : '1px solid #e9e4d8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, textAlign: isUser ? 'right' : 'left' }}>
          {msg.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#E8B84B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: 8,
            marginTop: 2,
          }}
        >
          <User size={14} color="#0A3D62" />
        </div>
      )}
    </div>
  )
}

// ─── AgentHub ─────────────────────────────────────────────────────────────────

export function AgentHub() {
  const [selectedPersonId, setSelectedPersonId] = useState(TEAM_MEMBERS[0].id)
  const [selectedDomain, setSelectedDomain] = useState('auto')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { agents, messages, loading, agentsLoading, error, fetchAgents, sendMessage } = useAgentChat()

  // Hämta agenter när person ändras
  useEffect(() => {
    fetchAgents(selectedPersonId)
    setSelectedAgentId(null)
  }, [selectedPersonId, fetchAgents])

  // Scroll till botten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filtrera agenter på vald domän
  const filteredAgents = selectedDomain === 'auto'
    ? agents
    : agents.filter(a => (a.domain ?? '').toLowerCase() === selectedDomain.toLowerCase() ||
        (a.tags ?? []).some(t => t.toLowerCase() === selectedDomain.toLowerCase()))

  const selectedAgent = selectedAgentId
    ? agents.find(a => a.id === selectedAgentId)
    : null

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    await sendMessage(msg, selectedDomain === 'auto' ? undefined : (selectedAgentId ?? undefined), selectedPersonId)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedPerson = TEAM_MEMBERS.find(p => p.id === selectedPersonId)!

  return (
    <div
      style={{
        background: '#F5F0E8',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#0A3D62',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#E8B84B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bot size={24} color="#0A3D62" />
        </div>
        <div>
          <h1 style={{ color: '#F5F0E8', fontSize: 20, fontWeight: 800, margin: 0 }}>
            Wavult Agent Mesh
          </h1>
          <p style={{ color: '#E8B84B', fontSize: 13, margin: 0, opacity: 0.9 }}>
            Välj din roll → chatta med din expert
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', maxHeight: 'calc(100vh - 88px)' }}>

        {/* ── Sidebar ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: '#fff',
            borderRight: '1px solid #e9e4d8',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Person-väljare */}
          <div style={{ padding: '16px 14px 8px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>
              PERSON
            </p>
            {TEAM_MEMBERS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPersonId(p.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: selectedPersonId === p.id ? '#E8B84B22' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: selectedPersonId === p.id ? '#E8B84B' : '#d1d5db',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: selectedPersonId === p.id ? 700 : 400, color: '#0A3D62' }}>
                    {p.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.role}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e9e4d8', margin: '8px 0' }} />

          {/* Agent-filter */}
          <div style={{ padding: '8px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>
              AGENT-FILTER
            </p>
            {DOMAIN_FILTERS.map(d => (
              <button
                key={d.id}
                onClick={() => { setSelectedDomain(d.id); setSelectedAgentId(null) }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: selectedDomain === d.id ? '#0A3D6215' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: selectedDomain === d.id ? '#0A3D62' : '#d1d5db',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: '#0A3D62', fontWeight: selectedDomain === d.id ? 700 : 400 }}>
                  {d.label}
                </span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e9e4d8', margin: '8px 0' }} />

          {/* Agent-lista */}
          <div style={{ padding: '8px 14px', flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>
              AGENTER {agentsLoading ? '...' : `(${filteredAgents.length})`}
            </p>
            {agentsLoading ? (
              <div className="flex items-center gap-2" style={{ padding: '8px 0' }}>
                <Loader2 size={14} style={{ color: '#E8B84B', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Hämtar...</span>
              </div>
            ) : filteredAgents.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Inga agenter</p>
            ) : (
              filteredAgents.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentId(selectedAgentId === a.id ? null : a.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: selectedAgentId === a.id ? '1.5px solid #E8B84B' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: 3,
                    background: selectedAgentId === a.id ? '#FFF8E7' : '#f9f7f4',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0A3D62', lineHeight: 1.3 }}>{a.name}</div>
                  {a.domain && (
                    <span style={{ fontSize: 10, color: '#E8B84B', fontWeight: 700 }}>
                      {a.domain.toUpperCase()}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat-panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Agent-info card */}
          <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
            {selectedAgent ? (
              <AgentInfoCard agent={selectedAgent} />
            ) : (
              <div
                style={{
                  background: '#fff',
                  border: '1px dashed #d1c9b8',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Bot size={18} style={{ color: '#9ca3af' }} />
                <div>
                  <span style={{ color: '#0A3D62', fontWeight: 600, fontSize: 14 }}>
                    Auto-routing aktiv
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>
                    Rätt agent väljs baserat på ditt meddelande
                  </span>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#E8B84B',
                    color: '#0A3D62',
                    borderRadius: 20,
                    padding: '2px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {selectedPerson.name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                margin: '0 20px 12px',
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <AlertCircle size={14} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
            </div>
          )}

          {/* Meddelandelista */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 20px',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 12,
                  opacity: 0.5,
                }}
              >
                <Bot size={40} style={{ color: '#0A3D62' }} />
                <p style={{ color: '#0A3D62', fontSize: 14, textAlign: 'center' }}>
                  Skriv ett meddelande för att starta konversationen
                </p>
              </div>
            ) : (
              messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
            )}
            {loading && (
              <div className="flex items-center gap-2" style={{ padding: '8px 0 4px 36px' }}>
                <Loader2 size={16} style={{ color: '#0A3D62', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>Agenten tänker...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 20px 16px',
              borderTop: '1px solid #e9e4d8',
              background: '#fff',
              flexShrink: 0,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv meddelande… (Enter skickar, Shift+Enter ny rad)"
              rows={2}
              style={{
                flex: 1,
                border: '1.5px solid #d1c9b8',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                background: '#F5F0E8',
                color: '#1a2233',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#E8B84B')}
              onBlur={e => (e.target.style.borderColor = '#d1c9b8')}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#d1d5db' : '#0A3D62',
                color: '#F5F0E8',
                border: 'none',
                borderRadius: 10,
                padding: '11px 18px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >
              {loading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={16} />
              }
              Skicka
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default AgentHub
