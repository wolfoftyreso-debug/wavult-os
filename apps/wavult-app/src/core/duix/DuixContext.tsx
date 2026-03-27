// ─── Wavult OS v2 — Duix Digital Human Context ─────────────────────────────────
// Manages the Duix SDK lifecycle. Provides a clean interface for the UI
// to start/stop the digital human, send speech, and receive responses.
//
// Integration pattern:
//   1. Orchestration engine produces recommendations
//   2. Duix speaks them to the operator with a digital human face
//   3. Operator responds via voice (ASR) or taps
//   4. Response feeds back into the identity graph
//
// The digital human IS the system talking to you. Not a chatbot — a presence.

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import type { DuixInstance, DuixState, DuixStatus, DuixSpeakEvent } from './types'

// ─── Configuration ───────────────────────────────────────────────────────────
// Client never holds Duix secrets. Token fetched from server proxy.

const API_URL = import.meta.env.VITE_API_URL || ''
const DUIX_CONVERSATION_ID = import.meta.env.VITE_DUIX_CONVERSATION_ID || ''

async function fetchDuixToken(): Promise<{ token: string; appId: string } | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}/api/duix/token`)
    if (!res.ok) return null
    const data = await res.json()
    return data.token ? { token: data.token, appId: '' } : null
  } catch {
    return null
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface DuixContextValue {
  state: DuixState
  /** Initialize and connect the digital human */
  connect: (containerId: string) => Promise<void>
  /** Disconnect and cleanup */
  disconnect: () => void
  /** Make the digital human speak text */
  speak: (text: string) => Promise<void>
  /** Send a question and let the avatar respond via LLM */
  ask: (question: string) => Promise<void>
  /** Interrupt current speech */
  interrupt: () => void
  /** Toggle microphone (ASR) */
  toggleMic: () => Promise<void>
  /** Whether Duix is configured (env vars present) */
  isConfigured: boolean
}

const DuixContext = createContext<DuixContextValue | null>(null)

export function DuixProvider({ children }: { children: React.ReactNode }) {
  const duixRef = useRef<DuixInstance | null>(null)
  const [state, setState] = useState<DuixState>({
    status: 'idle',
    isSpeaking: false,
    isListening: false,
    lastSpokenText: null,
    lastUserText: null,
    error: null,
  })

  const isConfigured = Boolean(API_URL && DUIX_CONVERSATION_ID)

  const setStatus = (status: DuixStatus) => {
    setState(prev => ({ ...prev, status, error: status === 'error' ? prev.error : null }))
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (duixRef.current) {
        try { duixRef.current.stop() } catch {}
        try { duixRef.current.destroy() } catch {}
      }
    }
  }, [])

  const connect = useCallback(async (containerId: string) => {
    if (!isConfigured) {
      setState(prev => ({ ...prev, status: 'error', error: 'Duix not configured. Set VITE_DUIX_APP_ID, VITE_DUIX_APP_KEY, VITE_DUIX_CONVERSATION_ID.' }))
      return
    }

    setStatus('loading')

    try {
      // Dynamic import to avoid breaking builds when not configured
      // @ts-ignore — duix-guiji-light has no type declarations
      const DUIX = (await import('duix-guiji-light')).default
      const duix: DuixInstance = new DUIX()
      duixRef.current = duix

      // Wire up events
      duix.on('initialSucccess', () => {
        // Start the session after init
        duix.start({
          openAsr: false,
          muted: true,      // Start muted for autoplay policy
          enableLLM: 0,     // We control the LLM ourselves
          useActSection: true,
        }).then(({ err }) => {
          if (err) {
            setState(prev => ({ ...prev, status: 'error', error: String(err) }))
          }
        })
      })

      duix.on('show', () => {
        setStatus('connected')
        // Unmute after user-initiated connection
        duix.setVideoMuted(false)
      })

      duix.on('speakStart', (...args: unknown[]) => {
        const data = args[0] as DuixSpeakEvent | undefined
        setState(prev => ({
          ...prev,
          isSpeaking: true,
          lastSpokenText: data?.content || prev.lastSpokenText,
        }))
      })

      duix.on('speakEnd', () => {
        setState(prev => ({ ...prev, isSpeaking: false }))
      })

      duix.on('asrData', (...args: unknown[]) => {
        const data = args[0] as { content?: string } | undefined
        if (data?.content) {
          setState(prev => ({ ...prev, lastUserText: data.content! }))
        }
      })

      duix.on('asrStop', () => {
        setState(prev => ({ ...prev, isListening: false }))
      })

      duix.on('error', (...args: unknown[]) => {
        const err = args[0] as { message?: string; code?: number } | undefined
        const msg = err?.message || `Error code: ${err?.code || 'unknown'}`
        setState(prev => ({ ...prev, status: 'error', error: msg }))
      })

      duix.on('bye', () => {
        setStatus('idle')
      })

      // Fetch token from server proxy
      const tokenData = await fetchDuixToken()
      if (!tokenData) {
        setState(prev => ({ ...prev, status: 'error', error: 'Failed to fetch Duix token from server' }))
        return
      }

      // Initialize with server-provided token
      await duix.init({
        containerLable: containerId,
        sign: tokenData.token,
        conversationId: DUIX_CONVERSATION_ID,
        platform: 'duix.com',
        useOversea: true,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [isConfigured])

  const disconnect = useCallback(() => {
    if (duixRef.current) {
      try { duixRef.current.stop() } catch {}
      try { duixRef.current.destroy() } catch {}
      duixRef.current = null
    }
    setState({
      status: 'idle',
      isSpeaking: false,
      isListening: false,
      lastSpokenText: null,
      lastUserText: null,
      error: null,
    })
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!duixRef.current || state.status !== 'connected') return
    setState(prev => ({ ...prev, isSpeaking: true, lastSpokenText: text }))
    await duixRef.current.speak({ content: text, interrupt: true })
  }, [state.status])

  const ask = useCallback(async (question: string) => {
    if (!duixRef.current || state.status !== 'connected') return
    await duixRef.current.answer({ question, interrupt: true })
  }, [state.status])

  const interrupt = useCallback(() => {
    if (!duixRef.current) return
    duixRef.current.break()
    setState(prev => ({ ...prev, isSpeaking: false }))
  }, [])

  const toggleMic = useCallback(async () => {
    if (!duixRef.current || state.status !== 'connected') return
    if (state.isListening) {
      await duixRef.current.closeAsr()
      setState(prev => ({ ...prev, isListening: false }))
    } else {
      await duixRef.current.openAsr()
      setState(prev => ({ ...prev, isListening: true }))
    }
  }, [state.status, state.isListening])

  return (
    <DuixContext.Provider value={{
      state, connect, disconnect, speak, ask, interrupt, toggleMic, isConfigured,
    }}>
      {children}
    </DuixContext.Provider>
  )
}

export function useDuix() {
  const ctx = useContext(DuixContext)
  if (!ctx) throw new Error('useDuix must be used inside DuixProvider')
  return ctx
}
