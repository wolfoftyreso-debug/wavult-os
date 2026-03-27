/**
 * Environment configuration — pixdrift enterprise standard
 *
 * Validates ALL environment variables at startup using Zod.
 * Application will refuse to start if required variables are missing.
 * Optional variables emit warnings but do not block startup.
 *
 * Usage:
 *   import { config } from './config/env';
 *   const url = config.SUPABASE_URL;  // typed, validated
 */

import { z } from 'zod';

const envSchema = z.object({
  // ── Runtime ─────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // ── Supabase (required) ──────────────────────────────────────────────────
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(10, 'SUPABASE_SERVICE_ROLE_KEY appears too short'),
  SUPABASE_ANON_KEY: z
    .string()
    .min(10, 'SUPABASE_ANON_KEY appears too short')
    .optional(),

  // ── Security ─────────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().optional(),

  // ── AWS ──────────────────────────────────────────────────────────────────
  AWS_REGION: z.string().default('eu-north-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // ── Payments (optional — disabled if missing) ────────────────────────────
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // ── AI / Integrations (optional) ────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  ELKS_API_USERNAME: z.string().optional(),
  ELKS_API_PASSWORD: z.string().optional(),
  TRIGGER_API_KEY: z.string().optional(),

  // ── Telegram bots (optional) ─────────────────────────────────────────────
  EVA_BOT_TOKEN: z.string().optional(),

  // ── Duix Digital Human (optional) ──────────────────────────────────────
  DUIX_APP_ID: z.string().optional(),
  DUIX_APP_SECRET: z.string().optional(),
  DUIX_CONVERSATION_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _config: Env | null = null;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('');
    console.error('══════════════════════════════════════════════════════════');
    console.error('❌  INVALID ENVIRONMENT CONFIGURATION — refusing to start');
    console.error('══════════════════════════════════════════════════════════');
    const flat = result.error.flatten();
    Object.entries(flat.fieldErrors).forEach(([key, msgs]) => {
      console.error(`  ${key}: ${(msgs ?? []).join(', ')}`);
    });
    console.error('══════════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }

  const env = result.data;

  // Warnings for optional-but-important variables
  if (!env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set — payment features disabled');
  }
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — AI features disabled');
  }
  if (!env.EVA_BOT_TOKEN) {
    console.warn('⚠️  EVA_BOT_TOKEN not set — Eva bot disabled');
  }

  _config = env;
  return env;
}

/**
 * Validated config singleton.
 * Safe to import anywhere after validateEnv() has been called in index.ts.
 *
 * NOTE: validateEnv() must be called before this is accessed.
 * It is called automatically via `import { validateEnv } from './config/env'`
 * at the top of index.ts.
 */
export function getConfig(): Env {
  if (!_config) {
    throw new Error(
      'getConfig() called before validateEnv(). Ensure index.ts calls validateEnv() first.'
    );
  }
  return _config;
}

// Convenience re-export for modules that just need the config object
// (safe after bootstrap completes)
export { _config as config };
