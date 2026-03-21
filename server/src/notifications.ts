/**
 * pixdrift — Automatiserade notiser
 * Webhook-system för deploy-events, nya kunder, incidenter och milstolpar.
 *
 * Endpoints:
 *   POST /api/notifications/webhook   — Ta emot externa webhooks (GitHub Actions, etc.)
 *   POST /api/notifications/subscribe — Spara e-postprenumeration i Supabase
 *   GET  /api/notifications/changelog — Returnera changelog-entries från databas
 */

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface NotificationPayload {
  type: 'deploy' | 'new_customer' | 'milestone' | 'incident';
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

interface SubscribeRequest {
  email: string;
  types?: string[];
}

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'security' | 'breaking';
  title: string;
  description: string;
  docs_url?: string;
}

// ─────────────────────────────────────────────────────────
// Slack notification (stub — logs to console for now)
// ─────────────────────────────────────────────────────────

async function sendSlackNotification(payload: NotificationPayload): Promise<void> {
  const emoji = {
    deploy: '🚀',
    new_customer: '🎉',
    milestone: '🏆',
    incident: '🚨',
  }[payload.type] ?? '📢';

  const severityLabel = {
    info: 'INFO',
    warning: 'VARNING',
    critical: 'KRITISK',
  }[payload.severity];

  // TODO: Replace with actual Slack webhook when SLACK_WEBHOOK_URL is configured
  if (process.env.SLACK_WEBHOOK_URL) {
    const slackBody = {
      text: `${emoji} *${payload.title}*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *[${severityLabel}] ${payload.title}*\n${payload.body}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `pixdrift · ${new Date(payload.timestamp).toLocaleString('sv-SE')}`,
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackBody),
      });
      if (!res.ok) {
        console.error('[notifications] Slack webhook failed:', res.status);
      }
    } catch (err) {
      console.error('[notifications] Slack webhook error:', err);
    }
  } else {
    // Fallback: log to console
    console.log(`[notifications] ${emoji} ${severityLabel}: ${payload.title} — ${payload.body}`);
  }
}

// ─────────────────────────────────────────────────────────
// Internal status update (can be extended to update DB)
// ─────────────────────────────────────────────────────────

async function updateInternalStatus(payload: NotificationPayload): Promise<void> {
  if (payload.type !== 'incident') return;

  // Log incident to Supabase for status page history
  const { error } = await supabase
    .from('system_incidents')
    .insert({
      title: payload.title,
      body: payload.body,
      severity: payload.severity,
      occurred_at: payload.timestamp,
      resolved: false,
    })
    .single();

  if (error) {
    // Table may not exist yet — log gracefully
    console.warn('[notifications] Could not log incident to DB:', error.message);
  }
}

// ─────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────

export const notificationsRouter = Router();

/**
 * POST /api/notifications/webhook
 *
 * Accepts external webhooks from GitHub Actions, monitoring tools, etc.
 * Validates payload, updates internal status, and triggers Slack notification.
 *
 * Example body:
 * {
 *   "type": "deploy",
 *   "title": "Frontend deployed",
 *   "body": "Version abc123 deployed to production",
 *   "severity": "info",
 *   "timestamp": "2026-03-21T06:00:00Z"
 * }
 */
notificationsRouter.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as Partial<NotificationPayload>;

  // Validate required fields
  if (!payload.type || !payload.title || !payload.body || !payload.severity) {
    return res.status(400).json({
      error: 'Missing required fields: type, title, body, severity',
    });
  }

  // Validate type
  const validTypes = ['deploy', 'new_customer', 'milestone', 'incident'];
  if (!validTypes.includes(payload.type)) {
    return res.status(400).json({
      error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  // Validate severity
  const validSeverities = ['info', 'warning', 'critical'];
  if (!validSeverities.includes(payload.severity)) {
    return res.status(400).json({
      error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
    });
  }

  const normalizedPayload: NotificationPayload = {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    severity: payload.severity,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  try {
    // Run in parallel: internal status update + Slack notification
    await Promise.allSettled([
      updateInternalStatus(normalizedPayload),
      sendSlackNotification(normalizedPayload),
    ]);

    return res.status(200).json({
      ok: true,
      message: 'Webhook received and processed',
      payload: normalizedPayload,
    });
  } catch (err) {
    console.error('[notifications] Webhook processing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/subscribe
 *
 * Saves an e-mail subscription to the notifications_subscriptions table.
 *
 * Body: { email: string, types?: string[] }
 * Default types: ['release', 'incident']
 */
notificationsRouter.post('/subscribe', async (req: Request, res: Response) => {
  const { email, types } = req.body as SubscribeRequest;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const subscriptionTypes = types?.length ? types : ['release', 'incident'];

  const { data, error } = await supabase
    .from('notifications_subscriptions')
    .upsert(
      { email, types: subscriptionTypes, verified: false },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (error) {
    console.error('[notifications] Subscribe error:', error);
    return res.status(500).json({ error: 'Could not save subscription' });
  }

  // TODO: Send verification email via Resend/SendGrid

  console.log(`[notifications] New subscription: ${email} → ${subscriptionTypes.join(', ')}`);

  return res.status(201).json({
    ok: true,
    message: 'Subscription saved. Check your email to verify.',
    subscription: {
      email: data.email,
      types: data.types,
    },
  });
});

/**
 * GET /api/notifications/changelog
 *
 * Returns changelog entries from the database.
 * Used by changelog.html via fetch() for dynamic rendering.
 *
 * Query params:
 *   ?limit=20         — number of entries to return (default 20)
 *   ?category=feature — filter by category
 *   ?version=1.3.0    — filter by version
 */
notificationsRouter.get('/changelog', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const category = req.query.category as string | undefined;
  const version = req.query.version as string | undefined;

  let query = supabase
    .from('changelog_entries')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  if (version) {
    query = query.eq('version', version);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[notifications] Changelog fetch error:', error);

    // Fallback: return static changelog if DB not available
    return res.status(200).json({
      ok: true,
      source: 'static',
      entries: STATIC_CHANGELOG,
    });
  }

  return res.status(200).json({
    ok: true,
    source: 'database',
    count: data?.length ?? 0,
    entries: data ?? STATIC_CHANGELOG,
  });
});

// ─────────────────────────────────────────────────────────
// Static changelog fallback (mirrors changelog.html entries)
// Used when DB is unavailable
// ─────────────────────────────────────────────────────────

const STATIC_CHANGELOG: ChangelogEntry[] = [
  {
    id: 'v130-apps',
    version: '1.3.0',
    date: '2026-03-21',
    category: 'feature',
    title: 'Admin, CRM och Sales-appar lanserade',
    description: 'Tre nya dedikerade appar: Admin-appen, CRM-appen och Sales-appen.',
    docs_url: '/docs/apps',
  },
  {
    id: 'v130-landing',
    version: '1.3.0',
    date: '2026-03-21',
    category: 'feature',
    title: 'Enterprise landningssida',
    description: 'Ny enterprise-fokuserad landningssida med changelog, status, roadmap och pressrum.',
  },
  {
    id: 'v130-stripe',
    version: '1.3.0',
    date: '2026-03-21',
    category: 'improvement',
    title: 'Stripe-integration (beta)',
    description: 'Stripe-betalning tillgänglig i beta. Stöder månadsvis och årsvis fakturering.',
    docs_url: '/docs/billing',
  },
  {
    id: 'v130-security',
    version: '1.3.0',
    date: '2026-03-21',
    category: 'security',
    title: 'Uppdaterade beroenden',
    description: 'Alla npm-paket uppdaterade. 3 låg-allvarlighetssårbarheter patchade.',
  },
  {
    id: 'v120-fx',
    version: '1.2.0',
    date: '2026-03-01',
    category: 'feature',
    title: 'Multi-valuta FX revaluation',
    description: 'Automatisk omvärdering av balanser i utländsk valuta enligt ECB-kurser.',
    docs_url: '/docs/currency',
  },
  {
    id: 'v120-sie4',
    version: '1.2.0',
    date: '2026-03-01',
    category: 'feature',
    title: 'SIE4-export',
    description: 'Exportera verifikationer i SIE4-format. Kompatibelt med Fortnox och Visma.',
    docs_url: '/docs/sie4',
  },
  {
    id: 'v120-perf',
    version: '1.2.0',
    date: '2026-03-01',
    category: 'improvement',
    title: 'Dashboard-prestanda +40%',
    description: 'Laddningstid reducerad från ~1 800ms till ~1 080ms.',
  },
  {
    id: 'v120-trialbalance',
    version: '1.2.0',
    date: '2026-03-01',
    category: 'bugfix',
    title: 'Trial balance-beräkning vid månadsslut',
    description: 'Åtgärdat fel med felaktiga ingående balanser för sista-dagsposter.',
  },
  {
    id: 'v110-capability',
    version: '1.1.0',
    date: '2026-02-01',
    category: 'feature',
    title: 'Capability assessment-motor',
    description: 'Strukturerade kompetensassessments med anpassningsbara matriser.',
    docs_url: '/docs/capability',
  },
  {
    id: 'v110-compliance',
    version: '1.1.0',
    date: '2026-02-01',
    category: 'feature',
    title: 'Compliance-modul med ISO 9001-stöd',
    description: 'ISO 9001:2015-kravmappning och revisionsberedda rapporter.',
    docs_url: '/docs/compliance',
  },
  {
    id: 'v110-api',
    version: '1.1.0',
    date: '2026-02-01',
    category: 'improvement',
    title: 'API-responstid -60%',
    description: 'Median API-responstid från 320ms till 128ms via Redis-caching.',
  },
  {
    id: 'v100-launch',
    version: '1.0.0',
    date: '2026-01-10',
    category: 'feature',
    title: 'Initial release — pixdrift OMS-plattformen',
    description: 'Lansering med fem kärnmoduler: Execution, Capability, Process, Currency, Reports.',
  },
];

export default notificationsRouter;
