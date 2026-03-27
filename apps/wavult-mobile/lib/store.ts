import { create } from 'zustand'
import type { AuthUser } from './auth'
import type { Container } from './mockData'

export type MessageRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  containers?: Container[]
  isStreaming?: boolean
  isConfirmation?: boolean
  confirmationAction?: string
}

export type SemanticProfile = {
  decisionStyle: string
  focusHours: string
  delegationLevel: string
  riskAppetite: string
  decisionHistory: { date: string; action: string }[]
}

type AppState = {
  // Auth
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void

  // Chat
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void

  // Feed
  containers: Container[]
  setContainers: (containers: Container[]) => void
  updateContainer: (id: string, updates: Partial<Container>) => void

  // Semantic profile
  semanticProfile: SemanticProfile | null
  updateSemanticProfile: (profile: SemanticProfile) => void

  // UI state
  isStreaming: boolean
  setIsStreaming: (v: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  clearMessages: () => set({ messages: [] }),

  containers: [],
  setContainers: (containers) => set({ containers }),
  updateContainer: (id, updates) =>
    set((s) => ({
      containers: s.containers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  semanticProfile: null,
  updateSemanticProfile: (profile) => set({ semanticProfile: profile }),

  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),
}))
