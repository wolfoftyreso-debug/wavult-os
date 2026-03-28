/**
 * WHOOP API Router — Wavult OS
 *
 * Hanterar OAuth2-flödet, data-hämtning och team-vy.
 * Monteras på /whoop i index.ts.
 *
 * Endpoints:
 *   GET    /whoop/auth         → redirect till WHOOP OAuth (public — no session required)
 *   GET    /whoop/callback     → hantera OAuth callback, redirect till frontend med tokens
 *   GET    /whoop/status       → är WHOOP kopplat för inloggad user?
 *   GET    /whoop/me           → senaste recovery, sleep, strain (Bearer token eller session)
 *   GET    /whoop/team         → aggregerad teamdata (admin)
 *   DELETE /whoop/disconnect   → koppla bort WHOOP
 */

import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { getConfig } from '../config/env';
import {
  exchangeCodeForTokens,
  fetchRecovery,
  fetchSleep,
  fetchStrain,
  fetchWhoopUserId,
  refreshWhoopToken,
} from './whoop-client';
import {
  deleteWhoopTokens,
  getLatestSnapshot,
  getTeamSnapshots,
  getWhoopTokens,
  saveWhoopSnapshot,
  saveWhoopTokens,
} from './whoop-store';

const router = Router();

// ─── In-memory state store för OAuth (PKCE-liknande CSRF-skydd) ───────────────
// Varje state är ett random UUID som skapas i /auth och valideras i /callback.
// States rensas efter 10 minuter.

const oauthStateStore = new Map<string, { createdAt: number }>()

function cleanOldStates() {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  for (const [key, val] of oauthStateStore.entries()) {
    if (val.createdAt < tenMinutesAgo) oauthStateStore.delete(key)
  }
}

// ─── Frontend URL ─────────────────────────────────────────────────────────────

const FRONTEND_URL = 'https://wavult-os.pages.dev'

// ─── Auth guard ───────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req as any).user) {
    return res.status(401).json({ error: 'Unauthorized — logga in först' });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden — kräver admin eller manager' });
  }
  next();
}

// ─── Token helper: refresh om nödvändigt (session-baserat) ───────────────────

async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await getWhoopTokens(userId);
  if (!tokens) return null;

  // Kolla om token snart går ut (< 5 min kvar)
  if (tokens.expires_at) {
    const expiresAt = new Date(tokens.expires_at).getTime();
    const fiveMinFromNow = Date.now() + 5 * 60 * 1000;
    if (expiresAt < fiveMinFromNow && tokens.refresh_token) {
      const fresh = await refreshWhoopToken(tokens.refresh_token);
      if (fresh) {
        await saveWhoopTokens(userId, {
          access_token: fresh.access_token,
          refresh_token: fresh.refresh_token,
          expires_at: fresh.expires_at ?? null,
          whoop_user_id: tokens.whoop_user_id,
        });
        return fresh.access_token;
      }
      return null; // Refresh misslyckades
    }
  }

  return tokens.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /whoop/auth — starta OAuth-flödet (PUBLIC — ingen inloggning krävs)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth', (req: Request, res: Response) => {
  const cfg = getConfig();

  if (!cfg.WHOOP_CLIENT_ID || !cfg.WHOOP_REDIRECT_URI) {
    return res.status(503).json({
      error: 'WHOOP inte konfigurerat — saknar WHOOP_CLIENT_ID eller WHOOP_REDIRECT_URI',
    });
  }

  // Generera random state för CSRF-skydd
  const state = randomUUID()
  oauthStateStore.set(state, { createdAt: Date.now() })
  cleanOldStates()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.WHOOP_CLIENT_ID,
    redirect_uri: cfg.WHOOP_REDIRECT_URI,
    scope: 'read:recovery read:sleep read:workout read:body_measurement offline',
    state,
  });

  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
  return res.redirect(authUrl);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /whoop/callback — hantera OAuth callback
// Redirectar till frontend med tokens i URL (sparas i localStorage)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query as Record<string, string>;

  if (oauthError) {
    console.warn('[WHOOP] OAuth error:', oauthError);
    return res.redirect(`${FRONTEND_URL}/whoop?error=oauth_denied`);
  }

  // Validera state mot vår store
  if (!state || !oauthStateStore.has(state)) {
    console.warn('[WHOOP] Ogiltig eller utgången state:', state);
    return res.redirect(`${FRONTEND_URL}/whoop?error=invalid_state`);
  }

  // Ta bort state direkt (one-time use)
  oauthStateStore.delete(state)

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/whoop?error=no_code`);
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return res.redirect(`${FRONTEND_URL}/whoop?error=token_exchange_failed`);
  }

  // Om det finns en inloggad user (session), spara tokens i Supabase också
  const userId = (req as any).user?.id
  if (userId) {
    try {
      const whoopUserId = await fetchWhoopUserId(tokens.access_token);
      await saveWhoopTokens(userId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expires_at ?? null,
        whoop_user_id: whoopUserId,
      });

      // Initial snapshot
      const [recovery, sleep, strain] = await Promise.all([
        fetchRecovery(tokens.access_token),
        fetchSleep(tokens.access_token),
        fetchStrain(tokens.access_token),
      ]);

      if (recovery || sleep || strain) {
        await saveWhoopSnapshot(userId, {
          recovery_score: recovery?.score ?? null,
          hrv: recovery?.hrv ?? null,
          resting_hr: recovery?.restingHr ?? null,
          sleep_performance: sleep?.performancePercent ?? null,
          sleep_hours: sleep?.durationHours ?? null,
          strain_score: strain?.score ?? null,
        });
      }
    } catch (err) {
      console.warn('[WHOOP] Kunde inte spara tokens till Supabase (fortsätter ändå):', err)
    }
  }

  // Redirect till frontend med tokens i URL — frontend sparar i localStorage
  const params = new URLSearchParams({
    connected: 'true',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? '',
    expires_at: tokens.expires_at ?? '',
  });

  return res.redirect(`${FRONTEND_URL}/whoop?${params.toString()}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /whoop/status — är WHOOP kopplat?
// ─────────────────────────────────────────────────────────────────────────────

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tokens = await getWhoopTokens(userId);
    return res.json({
      connected: !!tokens,
      whoop_user_id: tokens?.whoop_user_id ?? null,
      connected_at: tokens?.connected_at ?? null,
    });
  } catch (err) {
    console.error('[WHOOP] /status error:', err);
    return res.status(500).json({ error: 'Internt fel' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /whoop/me — senaste data
// Accepterar: Bearer <whoop_access_token> ELLER session-cookie
// ─────────────────────────────────────────────────────────────────────────────

router.get('/me', async (req: Request, res: Response) => {
  try {
    // Försök hämta Bearer token (från localStorage via frontend)
    const authHeader = req.headers.authorization
    let accessToken: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7)
    }

    if (accessToken) {
      // Direkt Bearer-token-läge: anropa WHOOP API direkt med given token
      const [recovery, sleep, strain] = await Promise.all([
        fetchRecovery(accessToken),
        fetchSleep(accessToken),
        fetchStrain(accessToken),
      ]);

      return res.json({
        connected: true,
        recovery,
        sleep,
        strain,
        cached: false,
        last_updated: new Date().toISOString(),
      });
    }

    // Fallback: session-baserat flöde (legacy)
    const userId = (req as any).user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Saknar access token eller inloggning', connected: false });
    }

    const sessionAccessToken = await getValidAccessToken(userId);
    if (!sessionAccessToken) {
      return res.status(404).json({ error: 'WHOOP inte kopplat', connected: false });
    }

    // Försök hämta live-data
    const [recovery, sleep, strain] = await Promise.all([
      fetchRecovery(sessionAccessToken),
      fetchSleep(sessionAccessToken),
      fetchStrain(sessionAccessToken),
    ]);

    // Spara snapshot om vi fick data
    if (recovery || sleep || strain) {
      await saveWhoopSnapshot(userId, {
        recovery_score: recovery?.score ?? null,
        hrv: recovery?.hrv ?? null,
        resting_hr: recovery?.restingHr ?? null,
        sleep_performance: sleep?.performancePercent ?? null,
        sleep_hours: sleep?.durationHours ?? null,
        strain_score: strain?.score ?? null,
      });
    }

    // Fallback: senaste cachade snapshot
    const cached = await getLatestSnapshot(userId);

    return res.json({
      connected: true,
      recovery: recovery ?? { score: cached?.recovery_score, hrv: cached?.hrv, restingHr: cached?.resting_hr },
      sleep: sleep ?? { performancePercent: cached?.sleep_performance, durationHours: cached?.sleep_hours },
      strain: strain ?? { score: cached?.strain_score, kilojoules: null },
      cached: !recovery && !sleep && !strain,
      last_updated: cached?.snapshot_at ?? null,
    });
  } catch (err) {
    console.error('[WHOOP] /me error:', err);
    return res.status(500).json({ error: 'Internt fel' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /whoop/team — aggregerad teamdata (admin/manager)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/team', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const members = await getTeamSnapshots();

    // Sortera: lägst recovery score högst upp
    const sorted = [...members].sort((a, b) => {
      const aScore = a.recovery_score ?? 100;
      const bScore = b.recovery_score ?? 100;
      return aScore - bScore;
    });

    // Beräkna team-genomsnitt
    const withRecovery = members.filter(m => m.recovery_score !== null);
    const avgRecovery = withRecovery.length > 0
      ? Math.round(withRecovery.reduce((sum, m) => sum + (m.recovery_score ?? 0), 0) / withRecovery.length)
      : null;

    const withSleep = members.filter(m => m.sleep_performance !== null);
    const avgSleep = withSleep.length > 0
      ? Math.round(withSleep.reduce((sum, m) => sum + (m.sleep_performance ?? 0), 0) / withSleep.length)
      : null;

    const withStrain = members.filter(m => m.strain_score !== null);
    const avgStrain = withStrain.length > 0
      ? Math.round((withStrain.reduce((sum, m) => sum + (m.strain_score ?? 0), 0) / withStrain.length) * 10) / 10
      : null;

    return res.json({
      team: sorted,
      averages: {
        recovery: avgRecovery,
        sleep: avgSleep,
        strain: avgStrain,
      },
      total_connected: members.length,
    });
  } catch (err) {
    console.error('[WHOOP] /team error:', err);
    return res.status(500).json({ error: 'Internt fel' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /whoop/disconnect — koppla bort WHOOP
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await deleteWhoopTokens(userId);
    return res.json({ success: true, message: 'WHOOP frånkopplat' });
  } catch (err) {
    console.error('[WHOOP] /disconnect error:', err);
    return res.status(500).json({ error: 'Internt fel' });
  }
});

export default router;
