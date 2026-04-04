// ─── Model Providers ──────────────────────────────────────────────────────────
// Adapter-funktioner per AI-leverantör.
// Varje adapter normaliserar provider-specifikt API till en enkel string-retur.

import type { ModelConfig, AIRequest } from './types'

/**
 * Anropar lokal Ollama-instans (Llama 4 Scout/Maverick).
 * Timeout: 120s — lokala modeller kan vara långsamma vid cold start.
 */
export async function callLocal(model: ModelConfig, req: AIRequest): Promise<string> {
  const modelName = model.id === 'llama4-scout'
    ? 'llama4:scout'
    : model.id === 'llama4-maverick'
      ? 'llama4:maverick'
      : 'llama3.2:latest'

  const payload = {
    model: modelName,
    prompt: req.system
      ? `System: ${req.system}\n\nUser: ${req.prompt}`
      : req.prompt,
    stream: false,
    options: {
      temperature: req.temperature ?? 0.7,
      num_predict: req.max_tokens ?? 2048,
    },
  }

  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ollama error ${res.status}: ${errText}`)
  }

  const data = await res.json() as { response?: string }
  if (!data.response) throw new Error('Ollama returned empty response')
  return data.response
}

/**
 * Anropar Anthropic Claude API.
 * Stöder claude-haiku-4-5 och claude-sonnet-4-6.
 */
export async function callAnthropic(model: ModelConfig, req: AIRequest): Promise<string> {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const modelName = model.id === 'claude-haiku'
    ? 'claude-haiku-4-5'
    : 'claude-sonnet-4-6'

  const payload: Record<string, unknown> = {
    model: modelName,
    max_tokens: req.max_tokens ?? 4096,
    messages: [{ role: 'user', content: req.prompt }],
  }
  if (req.system) payload.system = req.system

  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Anthropic error ${res.status}: ${err}`)
  }

  const data = await res.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Anthropic returned empty content')
  return text
}

/**
 * Anropar Google Gemini API.
 * Stöder gemini-flash och gemini-pro med systeminstruction.
 */
export async function callGoogle(model: ModelConfig, req: AIRequest): Promise<string> {
  const payload: Record<string, unknown> = {
    contents: [{ parts: [{ text: req.prompt }] }],
    generationConfig: {
      maxOutputTokens: req.max_tokens ?? 4096,
      temperature: req.temperature ?? 0.7,
    },
  }
  if (req.system) {
    payload.systemInstruction = { parts: [{ text: req.system }] }
  }

  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Google error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Google returned empty candidates')
  return text
}

/**
 * Delegerar till rätt provider-adapter baserat på model.provider.
 * Kastar Error med tydligt meddelande om provider är okänd.
 */
export async function callDeepSeek(model: ModelConfig, req: AIRequest): Promise<string> {
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY
  if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY not set')

  const modelName = model.id === 'deepseek-r1' ? 'deepseek-reasoner' : 'deepseek-chat'
  const messages: Array<{role: string; content: string}> = []
  if (req.system) messages.push({ role: 'system', content: req.system })
  messages.push({ role: 'user', content: req.prompt })

  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      max_tokens: req.max_tokens ?? 4096,
      temperature: req.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`DeepSeek error ${res.status}: ${err}`)
  }

  const data = await res.json() as any
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('DeepSeek returned empty response')
  return content
}

export async function callProvider(model: ModelConfig, req: AIRequest): Promise<string> {
  switch (model.provider) {
    case 'local':     return callLocal(model, req)
    case 'anthropic': return callAnthropic(model, req)
    case 'google':    return callGoogle(model, req)
    case 'deepseek':  return callDeepSeek(model, req)
    case 'openai':
      throw new Error(`OpenAI text completion not implemented via orchestrator; use whisper-api for STT`)
    default:
      throw new Error(`Unknown provider: ${(model as ModelConfig).provider}`)
  }
}
