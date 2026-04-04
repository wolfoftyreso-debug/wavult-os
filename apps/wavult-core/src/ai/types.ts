// ─── AI Orchestration Types ───────────────────────────────────────────────────

export type TaskType =
  | 'chat'           // Konversation, frågor/svar
  | 'code'           // Kodgenerering, review, debug
  | 'analysis'       // Dataanalys, summering, extraktion
  | 'embedding'      // Vektorsökning
  | 'stt'            // Speech-to-text
  | 'classification' // Klassificering, routing
  | 'document'       // Dokumentbearbetning, lång kontext
  | 'reasoning'      // Komplex problemlösning

export type ModelId =
  | 'llama4-scout'
  | 'llama4-maverick'
  | 'deepseek-v3'
  | 'deepseek-r1'
  | 'claude-haiku'
  | 'claude-sonnet'
  | 'gemini-flash'
  | 'gemini-pro'
  | 'whisper-local'
  | 'whisper-api'

export interface ModelConfig {
  id: ModelId
  name: string
  provider: 'local' | 'anthropic' | 'google' | 'openai' | 'deepseek'
  endpoint: string
  costPer1kTokens: number  // USD
  maxContextTokens: number
  strengths: TaskType[]
  available: boolean
  avgLatencyMs?: number
}

export interface AIRequest {
  task_type: TaskType
  prompt: string
  system?: string
  context?: string          // Extra kontext
  max_tokens?: number
  temperature?: number
  model_override?: ModelId  // Tvinga specifik modell
  cache?: boolean           // Tillåt cachning (default: true)
  audio_url?: string        // För STT
  metadata?: Record<string, unknown>
}

export interface AIResponse {
  content: string
  model_used: ModelId
  tokens_used?: number
  latency_ms: number
  cost_usd?: number
  cached: boolean
  request_id: string
}

export interface AILogEntry {
  request_id: string
  task_type: TaskType
  model_used: ModelId
  tokens_used: number
  latency_ms: number
  cost_usd: number
  cached: boolean
  success: boolean
  error?: string
  timestamp: string
}
