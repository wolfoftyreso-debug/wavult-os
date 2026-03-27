/**
 * /api/voice — Enterprise-grade Siri→Bernt→Wavult OS voice endpoint
 *
 * Accepts POST { transcript, user } from Siri Shortcut (or any client),
 * forwards to the local OpenClaw gateway (Bernt AI), logs the event,
 * and returns { reply, action?, event_id }.
 *
 * File: src/voice-api.ts
 * Created: 2026-03-27
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const VOICE_TIMEOUT_MS = 30_000;

// In-memory downtime tracker per service (for health-check endpoint)
const serviceDownSince: Record<string, number | null> = {
  gateway: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(level: 'INFO' | 'WARN' | 'ERROR', event_id: string, msg: string, data?: unknown) {
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, level, event_id, msg, ...(data ? { data } : {}) });
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
}

async function forwardToGateway(
  transcript: string,
  user: string,
  event_id: string,
  signal: AbortSignal
): Promise<{ reply: string; action?: string }> {
  const body = JSON.stringify({
    message: transcript,
    user,
    source: 'siri',
    event_id,
    channel: 'voice',
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Event-Id': event_id,
    'X-Source': 'siri',
  };

  if (GATEWAY_TOKEN) {
    headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
  }

  const res = await fetch(`${GATEWAY_URL}/chat`, {
    method: 'POST',
    headers,
    body,
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`Gateway responded ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as { reply?: string; message?: string; text?: string; action?: string };

  const reply =
    json.reply ??
    json.message ??
    json.text ??
    'Bernt svarade utan text.';

  return { reply, action: json.action };
}

// ---------------------------------------------------------------------------
// POST /api/voice
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response) => {
  const event_id = randomUUID();
  const started_at = Date.now();

  const { transcript, user } = req.body as { transcript?: string; user?: string };

  // Validate
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    log('WARN', event_id, 'Missing or empty transcript', { body: req.body });
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'transcript is required and must be a non-empty string',
      event_id,
    });
  }

  const actor = (user && typeof user === 'string' ? user.trim() : null) || 'unknown';

  log('INFO', event_id, 'Voice request received', {
    actor,
    transcript: transcript.substring(0, 200),
    ip: req.ip,
  });

  // Forward to gateway with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VOICE_TIMEOUT_MS);

  try {
    const { reply, action } = await forwardToGateway(
      transcript.trim(),
      actor,
      event_id,
      controller.signal
    );

    const duration_ms = Date.now() - started_at;
    serviceDownSince.gateway = null; // gateway is alive

    log('INFO', event_id, 'Voice request completed', {
      actor,
      duration_ms,
      action: action ?? null,
      reply_preview: reply.substring(0, 100),
    });

    const responseBody: { reply: string; event_id: string; action?: string } = {
      reply,
      event_id,
    };
    if (action) responseBody.action = action;

    return res.json(responseBody);

  } catch (err: unknown) {
    const duration_ms = Date.now() - started_at;
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const isNetworkError = err instanceof Error && (
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('fetch failed')
    );

    if (serviceDownSince.gateway === null) {
      serviceDownSince.gateway = Date.now();
    }

    log('ERROR', event_id, 'Voice request failed', {
      actor,
      duration_ms,
      error: err instanceof Error ? err.message : String(err),
      isTimeout,
      isNetworkError,
    });

    if (isTimeout) {
      return res.status(504).json({
        error: 'GATEWAY_TIMEOUT',
        message: 'Bernt svarade inte i tid. Försök igen.',
        event_id,
      });
    }

    if (isNetworkError) {
      return res.status(503).json({
        error: 'GATEWAY_UNAVAILABLE',
        message: 'Bernt är tillfälligt otillgänglig. Försök igen om en stund.',
        event_id,
      });
    }

    return res.status(502).json({
      error: 'GATEWAY_ERROR',
      message: 'Något gick fel. Bernt log det.',
      event_id,
    });
  } finally {
    clearTimeout(timeout);
  }
});

// ---------------------------------------------------------------------------
// GET /api/voice/health — internal health check endpoint
// ---------------------------------------------------------------------------
router.get('/health', async (_req: Request, res: Response) => {
  const event_id = randomUUID();
  let gatewayOk = false;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${GATEWAY_URL}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    gatewayOk = r.ok;
  } catch {
    gatewayOk = false;
  }

  const downSinceMs = serviceDownSince.gateway;
  const downDurationS = downSinceMs ? Math.floor((Date.now() - downSinceMs) / 1000) : 0;

  res.json({
    event_id,
    gateway: {
      ok: gatewayOk,
      url: GATEWAY_URL,
      down_since: downSinceMs ? new Date(downSinceMs).toISOString() : null,
      down_duration_s: downDurationS,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
