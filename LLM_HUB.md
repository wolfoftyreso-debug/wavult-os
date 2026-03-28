# LLM Hub — Wavult Group

## Fallback-strategi
GPT-4.6 → Claude Sonnet → Graceful Error

## Principen
"Vi gör aldrig något fel i våra system. Det är alltid något annat som strular då."
— Erik Svensson

## Providers
| Provider | Modell | Roll |
|---|---|---|
| OpenAI | gpt-4o (gpt-4.6 när tillgänglig) | Primär |
| Anthropic | claude-sonnet-4-5 | Fallback |

## Endpoints
- `POST /api/llm/complete` — Enkel prompt → svar
- `POST /api/llm/chat` — Konversation → svar
- `GET /api/llm/status` — Provider-status

### POST /api/llm/complete
```json
// Request
{ "prompt": "string", "system": "string (valfri)" }

// Response (alltid 200)
{
  "text": "string",
  "provider": "openai" | "anthropic" | "error",
  "fallbackUsed": false,
  "userMessage": "string (vid error)"
}
```

### POST /api/llm/chat
```json
// Request
{ "messages": [{ "role": "user" | "assistant" | "system", "content": "string" }] }

// Response (alltid 200)
{
  "text": "string",
  "provider": "openai" | "anthropic" | "error",
  "fallbackUsed": false,
  "userMessage": "string (vid error)"
}
```

### GET /api/llm/status
```json
{
  "ok": true,
  "providers": [
    { "name": "openai", "available": true },
    { "name": "anthropic", "available": true }
  ],
  "message": "2 av 2 providers aktiva"
}
```

## Env vars
- `OPENAI_API_KEY` — OpenAI API-nyckel (optional, disablar OpenAI om saknas)
- `ANTHROPIC_API_KEY` — Anthropic API-nyckel (optional, disablar Anthropic om saknas)

Om **båda** saknas returneras alltid graceful error:
```json
{ "text": "", "provider": "error", "fallbackUsed": true, "userMessage": "Systemet är tillfälligt otillgängligt. Vi arbetar på det." }
```

## Integrationsguide
Importera LLMHub i valfri server-modul:

```typescript
import { llmHub } from '../llm/llm-hub';

// Enkel prompt
const result = await llmHub.complete('Din prompt här');
if (result.provider !== 'error') {
  // Använd result.text
  console.log(result.text);
}

// Med system-prompt
const result2 = await llmHub.complete('Analysera detta', { system: 'Du är en finansanalytiker.' });

// Konversation
const result3 = await llmHub.chat([
  { role: 'system', content: 'Du är Eriks personliga assistent.' },
  { role: 'user', content: 'Sammanfatta veckans händelser.' },
]);
```

## Arkitektur

```
/server/src/llm/
├── llm-hub.ts        — Kärnlogiken + fallback-loop (LLMHub-klass + llmHub singleton)
├── llm-providers.ts  — Provider-abstraktioner (OpenAIProvider, AnthropicProvider)
└── llm-api.ts        — Express Router (POST /llm/complete, /llm/chat, GET /llm/status)

/apps/command-center/src/features/llm-hub/
└── LLMHub.tsx        — React-komponent (Chat + Playground + Status Panel)
```

## Säkerhet & robusthet
- `llmHub.complete()` och `llmHub.chat()` **kastar aldrig** — returnerar alltid ett LLMResult
- API-endpoints returnerar alltid HTTP 200 — aldrig 500 till frontend
- Tekniska felmeddelanden loggas server-side (`console.warn`) men visas aldrig till användaren
- `available()` per provider — hoppar automatiskt över okonfigurerade providers

## Frontend-integration
LLM Hub är monterat på `/llm-hub` i Wavult OS Command Center:
- **Chat-tab**: Konversationsgränssnitt med provider-badges och fallback-indikering
- **Playground-tab**: Test-vy med system prompt, latens-mätning och provider-info
- **Status Panel**: Alltid synlig, visar vilka providers som är aktiva

## Roadmap
- [ ] Streaming-svar (SSE)
- [ ] Konversationshistorik i Supabase
- [ ] gpt-4.6 när modellen är tillgänglig via OpenAI API
- [ ] Custom system-promptar per modul (t.ex. "Du är Wavult CRM-assistent")
- [ ] Rate limiting per org_id
- [ ] Token-räkning och kostnadsestimering
