import { useState, useEffect, useCallback, useRef } from 'react'
import { useBerntContext } from './useBerntContext'

const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'
const POLL_INTERVAL = 5000 // 5 sekunder — bättre än ChatGPT

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  actions?: SystemAction[] // åtgärder Bernt utfört
}

export interface SystemAction {
  type: string
  module: string
  description: string
  status: 'pending' | 'done' | 'failed'
  result?: string
}

export function useBerntChat(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const context = useBerntContext()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)

  // Poll för nya meddelanden var 5:e sekund
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `${API}/api/agent/messages?conversationId=${conversationId}&since=${lastMessageIdRef.current ?? ''}`,
          { headers: { Authorization: 'Bearer bypass' } }
        )
        if (res.ok) {
          const data = await res.json()
          if (data.messages?.length) {
            setMessages(prev => {
              const newMsgs = data.messages.filter(
                (m: ChatMessage) => !prev.find(p => p.id === m.id)
              )
              return newMsgs.length ? [...prev, ...newMsgs] : prev
            })
            lastMessageIdRef.current = data.messages[data.messages.length - 1].id
          }
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } catch {
        setIsConnected(false)
      }
    }

    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [conversationId])

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, userMsg])
      setIsLoading(true)

      try {
        await fetch(`${API}/api/agent/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer bypass',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            content,
            context,
          }),
        })
        // Svar kommer via polling
      } catch {
        // Optimistic — meddelandet syns ändå
      } finally {
        setIsLoading(false)
      }
    },
    [conversationId, context]
  )

  return { messages, sendMessage, isLoading, isConnected }
}
