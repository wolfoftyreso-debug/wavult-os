// ─── useAgentChat ────────────────────────────────────────────────────────────
// Hook för Wavult Agent Mesh — hämtar agenter & hanterar konversation

import { useState, useCallback } from 'react'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://api.wavult.com'

export interface Agent {
  id: string
  name: string
  description?: string
  owner?: string
  domain?: string
  model?: string
  tags?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentId?: string
  agentName?: string
  model?: string
  confidence?: number
  timestamp: Date
}

export interface SendMessageResult {
  reply: string
  agentId?: string
  agentName?: string
  model?: string
  confidence?: number
}

export function useAgentChat() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async (personId?: string) => {
    setAgentsLoading(true)
    setError(null)
    try {
      const url = personId
        ? `${API_BASE}/v1/agents/me/${personId}`
        : `${API_BASE}/v1/agents`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Support both { agents: [] } and plain array
      const list: Agent[] = Array.isArray(data) ? data : (data.agents ?? [])
      setAgents(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta agenter')
      setAgents([])
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (
    content: string,
    agentId?: string,
    personId?: string,
  ): Promise<SendMessageResult | null> => {
    if (!content.trim()) return null
    setLoading(true)
    setError(null)

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      let url: string
      let body: Record<string, unknown>

      if (agentId) {
        url = `${API_BASE}/v1/agents/${agentId}/chat`
        body = { message: content, personId }
      } else {
        url = `${API_BASE}/v1/agents/chat`
        body = { message: content, personId }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const reply: string = data.reply ?? data.message ?? data.response ?? JSON.stringify(data)
      const result: SendMessageResult = {
        reply,
        agentId: data.agentId ?? agentId,
        agentName: data.agentName,
        model: data.model,
        confidence: data.confidence,
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        agentId: result.agentId,
        agentName: result.agentName,
        model: result.model,
        confidence: result.confidence,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Meddelandet kunde inte skickas')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return {
    agents,
    messages,
    loading,
    agentsLoading,
    error,
    fetchAgents,
    sendMessage,
    clearMessages,
  }
}
