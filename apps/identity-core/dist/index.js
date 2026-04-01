"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config");
const auth_1 = require("./routes/auth");
const sessions_1 = require("./routes/sessions");
const mfa_1 = require("./routes/mfa");
const postgres_1 = require("./db/postgres");
const metrics_1 = require("./metrics");
// DEPLOY LADDER (never big-bang):
// Step 1: AUTH_MODE=logging-only (observe, never block)
// Step 2: AUTH_MODE=soft (log failures, don't block)
// Step 3: AUTH_MODE=hard (full enforcement)
// Step 4: AUTH_MODE=identity-core-only (Supabase disabled)
const AUTH_MODE = config_1.config.authMode;
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '1mb' }));
// Request tracing — requestId injected before any route/middleware sees request
app.use((req, _res, next) => {
    req.requestId = crypto_1.default.randomUUID();
    next();
});
// Security headers — ALL responses
app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.removeHeader('X-Powered-By');
    next();
});
// Health endpoint rate limiter — prevents uptime detection / DDoS amplification
const healthLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many health check requests' },
});
// Routes
app.use('/v1/auth', auth_1.authRouter);
app.use('/v1/sessions', sessions_1.sessionsRouter);
app.use('/v1/mfa', mfa_1.mfaRouter);
// Health — rate limited
app.get('/health', healthLimiter, async (_req, res) => {
    const dbOk = await (0, postgres_1.testConnection)();
    res.status(dbOk ? 200 : 503).json({
        status: dbOk ? 'ok' : 'degraded',
        db: dbOk ? 'connected' : 'disconnected',
        authMode: AUTH_MODE,
        authSource: config_1.config.authSource,
        forceLogoutAll: config_1.config.forceLogoutAll,
        version: '1.0.0',
        service: 'identity-core',
        metrics: metrics_1.metrics,
    });
});
async function main() {
    await (0, postgres_1.initSchema)();
    app.listen(config_1.config.port, () => {
        console.log('[Identity Core] Listening', { port: config_1.config.port, authMode: AUTH_MODE, authSource: config_1.config.authSource });
    });
}
main().catch((err) => {
    console.error('[Identity Core] Startup failed:', err);
    process.exit(1);
});
// rds-ready Sun Mar 29 00:27:24 UTC 2026
// ─── MIGRATION ENDPOINT (one-time use) ───────────────────────────────────────
app.post('/v1/migrate/from-supabase', async (_req, res) => {
    const authHeader = _req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET || 'wavult-migrate-2026'}`) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    try {
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');
        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
        if (error)
            throw error;
        let migrated = 0;
        let skipped = 0;
        for (const user of data.users) {
            if (!user.email) {
                skipped++;
                continue;
            }
            await postgres_1.db.query(`INSERT INTO ic_users (id, email, email_verified, full_name, org_id, roles, migrated_from, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'supabase', $7)
         ON CONFLICT (email) DO NOTHING`, [user.id, user.email.toLowerCase(), !!user.email_confirmed_at,
                user.user_metadata?.name || null, 'wavult', [], user.created_at]);
            migrated++;
        }
        res.json({ migrated, skipped, total: data.users.length });
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
// Schema migration endpoint — runs pending ALTER TABLE / CREATE TABLE migrations
// Protected by migration secret, safe to call repeatedly (all DDL is idempotent)
app.post('/v1/auth/schema-migrate', async (req, res) => {
    const secret = req.headers['x-migration-secret'];
    if (secret !== 'wavult-migrate-2026')
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
        await postgres_1.db.query(`
      -- MFA columns
      ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
      ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
      ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_secret_pending TEXT;
      ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT;
      ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

      -- ic_auth_audit for compliance
      CREATE TABLE IF NOT EXISTS ic_auth_audit (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        event_type TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        country_code TEXT,
        success BOOLEAN NOT NULL DEFAULT true,
        error_code TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ic_auth_audit_user ON ic_auth_audit(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ic_auth_audit_event ON ic_auth_audit(event_type, created_at DESC);
    `);
        return res.json({ ok: true, run: 'mfa_and_audit', message: 'Schema migration completed' });
    }
    catch (err) {
        console.error('[Migration] Schema migrate failed:', err);
        return res.status(500).json({ error: 'MIGRATION_FAILED', detail: String(err) });
    }
});
// Catch-all: return 404 for unknown paths — do NOT leak endpoint existence
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
exports.default = app;
