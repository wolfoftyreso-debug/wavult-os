// ─── Wavult OS v2 — Duix SDK Type Declarations ─────────────────────────────────
// duix-guiji-light ships no TypeScript types. These are hand-written from the
// official React sample and SDK documentation.

export interface DuixInitOptions {
  containerLable: string     // CSS selector (intentional misspelling in SDK)
  conversationId: string
  appId?: string
  appKey?: string
  sign?: string
  platform?: string          // 'duix.com' for overseas
  userId?: string
  useOversea?: boolean
}

export interface DuixStartOptions {
  openAsr?: boolean
  muted?: boolean
  wipeGreen?: boolean
  useActSection?: boolean
  userId?: number | string
  vadSilenceTime?: number
  enableLLM?: 0 | 1
  useVideoAgent?: boolean
  videoAgentContainer?: string
  useAudioAgent?: boolean
  appName?: string
  promptVariables?: string
}

export interface DuixSpeakOptions {
  content: string
  audio?: string
  interrupt?: boolean
}

export interface DuixAnswerOptions {
  question: string
  interrupt?: boolean
  userId?: number | string
  isHistory?: boolean
  isVector?: boolean
}

export interface DuixSpeakEvent {
  audio?: string
  content?: string
  text?: string
  ext?: string
}

export interface DuixAsrEvent {
  content?: string
}

export interface DuixErrorEvent {
  code: number
  message: string
  data?: unknown
}

export interface DuixInstance {
  init(options: DuixInitOptions): Promise<{ err?: unknown; data?: unknown }>
  start(options?: DuixStartOptions): Promise<{ err?: unknown; data?: unknown }>
  stop(): void
  destroy(): void
  speak(options: DuixSpeakOptions): Promise<void>
  answer(options: DuixAnswerOptions): Promise<void>
  getAnswer(options: { question: string }): Promise<{ err?: unknown; data?: { answer: string; audio: string } }>
  break(): void
  openAsr(): Promise<void>
  closeAsr(): Promise<void>
  setVideoMuted(flag: boolean): void
  resume(): void
  on(event: string, callback: (...args: unknown[]) => void): void
  off?(event: string, callback?: (...args: unknown[]) => void): void
}

// ─── Duix State for UI ───────────────────────────────────────────────────────

export type DuixStatus = 'idle' | 'loading' | 'connected' | 'speaking' | 'listening' | 'error'

export interface DuixState {
  status: DuixStatus
  isSpeaking: boolean
  isListening: boolean
  lastSpokenText: string | null
  lastUserText: string | null
  error: string | null
}
