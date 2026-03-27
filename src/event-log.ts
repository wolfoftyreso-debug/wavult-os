/**
 * event-log.ts — Wavult OS System Event Logger
 *
 * Använd denna modul överallt i systemet för att logga händelser.
 * Allt sparas i system_events-tabellen i Supabase och bevaras i 10 år.
 *
 * Enkel användning:
 *   import { logEvent } from './event-log'
 *   await logEvent.berntCommand('Skicka mail till Dennis', 'Erik Svensson', sessionId)
 *   await logEvent.mailSent('dennis@hypbit.com', 'Thailand info', { bcc: 'erik@hypbit.com' })
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.HYPBIT_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.HYPBIT_SUPABASE_SERVICE_KEY || ''
)

// ─── Typer ───────────────────────────────────────────────────────────────────

export type EventSource =
  | 'bernt' | 'mobile' | 'web' | 'siri'
  | 'api' | 'cron' | 'webhook' | 'email' | 'system'

export type EventCategory =
  | 'command' | 'communication' | 'decision' | 'transaction'
  | 'document' | 'auth' | 'deploy' | 'data_change'
  | 'error' | 'ai_inference' | 'voice' | 'integration'

export interface EventInput {
  source: EventSource
  category: EventCategory
  event_type: string        // ex: 'bernt.voice.received', 'mail.outbound.sent'
  verb: string              // ex: 'received voice command', 'sent email'
  actor_name?: string
  actor_id?: string
  actor_type?: string       // 'user' | 'bernt' | 'system' | 'external'
  session_id?: string
  entity_type?: string
  entity_id?: string
  entity_title?: string
  payload?: Record<string, unknown>
  metadata?: Record<string, unknown>
  status?: 'success' | 'error' | 'pending' | 'cancelled'
  error_message?: string
  duration_ms?: number
  parent_event_id?: string
  correlation_id?: string
}

// ─── Kärn-logger ─────────────────────────────────────────────────────────────

async function log(event: EventInput): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('system_events')
      .insert({
        source: event.source,
        category: event.category,
        event_type: event.event_type,
        verb: event.verb,
        actor_name: event.actor_name ?? null,
        actor_id: event.actor_id ?? null,
        actor_type: event.actor_type ?? 'system',
        session_id: event.session_id ?? null,
        entity_type: event.entity_type ?? null,
        entity_id: event.entity_id ?? null,
        entity_title: event.entity_title ?? null,
        payload: event.payload ?? {},
        metadata: event.metadata ?? {},
        status: event.status ?? 'success',
        error_message: event.error_message ?? null,
        duration_ms: event.duration_ms ?? null,
        parent_event_id: event.parent_event_id ?? null,
        correlation_id: event.correlation_id ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[EventLog] Supabase insert error:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    // Logga aldrig krascha systemet — tyst fail
    console.error('[EventLog] Unexpected error:', err)
    return null
  }
}

// ─── Convenience-metoder (används i hela systemet) ────────────────────────────

export const logEvent = {

  /** Bernt tog emot ett röstkommando */
  voiceReceived: (transcript: string, actorName: string, sessionId: string, durationSeconds?: number) =>
    log({
      source: 'bernt', category: 'voice',
      event_type: 'bernt.voice.received', verb: 'received voice command',
      actor_name: actorName, actor_type: 'user', session_id: sessionId,
      payload: { transcript, duration_s: durationSeconds },
    }),

  /** Bernt skickade ett svar */
  berntReplied: (response: string, sessionId: string, durationMs?: number) =>
    log({
      source: 'bernt', category: 'ai_inference',
      event_type: 'bernt.response.sent', verb: 'Bernt replied',
      actor_name: 'Bernt', actor_type: 'bernt', session_id: sessionId,
      payload: { response_preview: response.slice(0, 200) },
      duration_ms: durationMs,
    }),

  /** Bernt tog ett autonomt beslut (L0/L1/L2) */
  berntDecision: (decision: string, level: 'L0' | 'L1' | 'L2', payload: Record<string, unknown>, sessionId?: string) =>
    log({
      source: 'bernt', category: 'decision',
      event_type: `bernt.decision.${level.toLowerCase()}`, verb: `made ${level} decision`,
      actor_name: 'Bernt', actor_type: 'bernt', session_id: sessionId,
      payload: { decision, level, ...payload },
    }),

  /** Mail skickat */
  mailSent: (to: string, subject: string, extra?: Record<string, unknown>, sessionId?: string) =>
    log({
      source: 'bernt', category: 'communication',
      event_type: 'mail.outbound.sent', verb: 'sent email',
      actor_name: 'Bernt', actor_type: 'bernt', session_id: sessionId,
      entity_type: 'mail', entity_title: subject,
      payload: { to, subject, ...extra },
    }),

  /** Mail mottaget */
  mailReceived: (from: string, subject: string, preview?: string) =>
    log({
      source: 'email', category: 'communication',
      event_type: 'mail.inbound.received', verb: 'received email',
      actor_name: from, actor_type: 'external',
      entity_type: 'mail', entity_title: subject,
      payload: { from, subject, preview: preview?.slice(0, 500) },
    }),

  /** Deploy skedde */
  deployed: (service: string, version: string, environment: string) =>
    log({
      source: 'system', category: 'deploy',
      event_type: 'deploy.completed', verb: `deployed ${service}`,
      actor_name: 'GitHub Actions', actor_type: 'system',
      entity_type: 'service', entity_id: service, entity_title: `${service} ${version}`,
      payload: { service, version, environment },
    }),

  /** Finansiell transaktion */
  transaction: (type: string, amount: number, currency: string, description: string, actorName?: string) =>
    log({
      source: 'api', category: 'transaction',
      event_type: `finance.${type}`, verb: description,
      actor_name: actorName ?? 'system', actor_type: actorName ? 'user' : 'system',
      entity_type: 'transaction',
      payload: { type, amount, currency, description },
    }),

  /** Dokument/avtal skapat */
  documentCreated: (title: string, type: string, parties: string[], actorName?: string, sessionId?: string) =>
    log({
      source: 'bernt', category: 'document',
      event_type: `document.${type}.created`, verb: `created ${type}`,
      actor_name: actorName ?? 'Bernt', actor_type: actorName ? 'user' : 'bernt',
      entity_type: 'document', entity_title: title, session_id: sessionId,
      payload: { title, type, parties },
    }),

  /** Inloggning */
  login: (userId: string, userName: string, method: string, metadata?: Record<string, unknown>) =>
    log({
      source: 'mobile', category: 'auth',
      event_type: 'auth.login', verb: 'logged in',
      actor_id: userId, actor_name: userName, actor_type: 'user',
      payload: { method },
      metadata: metadata ?? {},
    }),

  /** Systemfel */
  error: (errorType: string, message: string, context?: Record<string, unknown>, sessionId?: string) =>
    log({
      source: 'system', category: 'error',
      event_type: `error.${errorType}`, verb: 'system error occurred',
      status: 'error', error_message: message, session_id: sessionId,
      payload: { error_type: errorType, message, ...context },
    }),

  /** Extern integration (Stripe, AWS, etc.) */
  integration: (service: string, action: string, payload?: Record<string, unknown>) =>
    log({
      source: 'webhook', category: 'integration',
      event_type: `integration.${service}.${action}`, verb: `${service}: ${action}`,
      actor_name: service, actor_type: 'external',
      payload: payload ?? {},
    }),

  /** Generisk — för allt annat */
  custom: (event: EventInput) => log(event),
}

// ─── Middleware-helper för Express-routes ─────────────────────────────────────

/** Wrapper som automatiskt mäter tid och loggar varje API-request */
export function withEventLog(
  source: EventSource,
  eventType: string,
  verb: string,
  getPayload: (req: any, res: any) => Record<string, unknown>
) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now()
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID()
    req.correlationId = correlationId

    res.on('finish', () => {
      const duration = Date.now() - start
      log({
        source,
        category: 'command',
        event_type: eventType,
        verb,
        actor_name: req.user?.name ?? 'anonymous',
        actor_id: req.user?.id,
        actor_type: req.user ? 'user' : 'system',
        session_id: req.headers['x-session-id'],
        payload: getPayload(req, res),
        status: res.statusCode < 400 ? 'success' : 'error',
        duration_ms: duration,
        correlation_id: correlationId,
        metadata: {
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          user_agent: req.headers['user-agent'],
          ip: req.ip,
        },
      })
    })

    next()
  }
}
