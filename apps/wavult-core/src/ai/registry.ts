// ─── Model Registry ───────────────────────────────────────────────────────────
// Konfigurerar alla tillgängliga modeller och deras egenskaper

import type { ModelConfig, ModelId, TaskType } from './types'

const LLAMA_HOST = process.env.LLAMA_HOST || 'http://localhost:11434'
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

export const MODEL_REGISTRY: Record<ModelId, ModelConfig> = {
  'llama4-scout': {
    id: 'llama4-scout',
    name: 'Llama 4 Scout (Local)',
    provider: 'local',
    endpoint: `${LLAMA_HOST}/api/generate`,
    costPer1kTokens: 0,
    maxContextTokens: 128_000,
    strengths: ['chat', 'analysis', 'classification', 'document'],
    available: !!LLAMA_HOST,
  },
  'llama4-maverick': {
    id: 'llama4-maverick',
    name: 'Llama 4 Maverick (Local)',
    provider: 'local',
    endpoint: `${LLAMA_HOST}/api/generate`,
    costPer1kTokens: 0,
    maxContextTokens: 1_000_000,
    strengths: ['document', 'reasoning', 'analysis'],
    available: false, // Aktiveras när Maverick-modellen är pullad
  },
  'claude-haiku': {
    id: 'claude-haiku',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    costPer1kTokens: 0.001,
    maxContextTokens: 200_000,
    strengths: ['chat', 'classification', 'code'],
    available: !!ANTHROPIC_KEY,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    costPer1kTokens: 0.003,
    maxContextTokens: 200_000,
    strengths: ['code', 'reasoning', 'analysis', 'document'],
    available: !!ANTHROPIC_KEY,
  },
  'gemini-flash': {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    costPer1kTokens: 0.00015,
    maxContextTokens: 1_000_000,
    strengths: ['chat', 'classification', 'stt'],
    available: !!GEMINI_KEY,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`,
    costPer1kTokens: 0.00125,
    maxContextTokens: 1_000_000,
    strengths: ['document', 'reasoning', 'analysis', 'code'],
    available: !!GEMINI_KEY,
  },
  'whisper-local': {
    id: 'whisper-local',
    name: 'Whisper (Local Ollama)',
    provider: 'local',
    endpoint: `${LLAMA_HOST}/api/generate`,
    costPer1kTokens: 0,
    maxContextTokens: 0,
    strengths: ['stt'],
    available: false, // Aktiveras när whisper är pullad
  },
  'whisper-api': {
    id: 'whisper-api',
    name: 'Whisper API (OpenAI)',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    costPer1kTokens: 0.006,
    maxContextTokens: 0,
    strengths: ['stt'],
    available: !!OPENAI_KEY,
  },
  'deepseek-v3': {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    costPer1kTokens: 0.00027,
    maxContextTokens: 64_000,
    strengths: ['chat', 'code', 'analysis', 'reasoning'],
    available: !!DEEPSEEK_KEY,
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 (Reasoner)',
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    costPer1kTokens: 0.00055,
    maxContextTokens: 64_000,
    strengths: ['reasoning', 'analysis', 'code'],
    available: !!DEEPSEEK_KEY,
  },
}

// Routing-matris — DeepSeek V3 som billig/snabb fallback, R1 för reasoning
export const ROUTING_MATRIX: Record<TaskType, ModelId[]> = {
  chat:           ['llama4-scout', 'deepseek-v3', 'gemini-flash', 'claude-haiku', 'claude-sonnet'],
  code:           ['claude-sonnet', 'deepseek-v3', 'claude-haiku', 'llama4-scout', 'gemini-pro'],
  analysis:       ['llama4-scout', 'deepseek-v3', 'gemini-pro', 'claude-sonnet', 'gemini-flash'],
  embedding:      ['llama4-scout', 'gemini-flash'],
  stt:            ['whisper-local', 'whisper-api'],
  classification: ['llama4-scout', 'deepseek-v3', 'gemini-flash', 'claude-haiku'],
  document:       ['gemini-pro', 'llama4-maverick', 'claude-sonnet', 'deepseek-v3', 'llama4-scout'],
  reasoning:      ['deepseek-r1', 'claude-sonnet', 'gemini-pro', 'deepseek-v3', 'llama4-scout'],
}

export function selectModel(taskType: TaskType, override?: ModelId): ModelConfig {
  if (override) {
    const m = MODEL_REGISTRY[override]
    if (m?.available) return m
  }

  const candidates = ROUTING_MATRIX[taskType] || ['llama4-scout', 'claude-haiku']
  for (const modelId of candidates) {
    const m = MODEL_REGISTRY[modelId]
    if (m?.available) return m
  }

  // Fallback: första tillgängliga
  const fallback = Object.values(MODEL_REGISTRY).find(m => m.available)
  if (!fallback) throw new Error('No AI models available')
  return fallback
}
