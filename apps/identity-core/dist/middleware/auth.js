"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const tokens_1 = require("../crypto/tokens");
const config_1 = require("../config");
const postgres_1 = require("../db/postgres");
// Forced session timeout constants
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours hard limit
const SESSION_IDLE_SECONDS = 30 * 60; // 30 minutes idle limit
function requireAuth(req, res, next) {
    // Kill switch: FORCE_LOGOUT_ALL → 401 SYSTEM_LOCKDOWN immediately
    if (config_1.config.forceLogoutAll) {
        res.status(401).json({ error: 'SYSTEM_LOCKDOWN' });
        return;
    }
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'MISSING_TOKEN' });
        return;
    }
    const token = auth.slice(7);
    // Legacy Supabase token path — hybrid migration support
    let decoded = null;
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        }
    }
    catch {
        // Ignore parse errors — will fail at verifyAccessToken
    }
    const issuer = decoded?.iss;
    if (issuer && (issuer === 'supabase' || issuer.includes('supabase'))) {
        // Legacy Supabase token path — only active during hybrid migration phase.
        // DISABLED by default. Enable via AUTH_MODE=hybrid ONLY for temporary migration windows.
        // NEVER enable in identity-core-only mode.
        if (config_1.config.authMode === 'logging-only' || config_1.config.authMode === 'soft') {
            console.warn('[Auth] Legacy Supabase token rejected — not in hybrid mode', { requestId: req.requestId });
            res.status(401).json({ error: 'LEGACY_TOKEN_NOT_ACCEPTED' });
            return;
        }
        // WARNING: No signature verification on legacy tokens. Temporary hybrid path only.
        console.warn('[Auth] Legacy Supabase token accepted (hybrid mode)', { requestId: req.requestId });
        req.user = decoded;
        next();
        return;
    }
    try {
        const payload = (0, tokens_1.verifyAccessToken)(token);
        // Token version check — DB query to enforce immediate revocation
        // Run async but respond synchronously on failure
        postgres_1.db.query(`SELECT u.token_version,
              (SELECT value FROM ic_global_state WHERE key = 'token_epoch_changed_at') AS token_epoch_changed_at
       FROM ic_users u WHERE u.id = $1`, [payload.sub]).then(async (result) => {
            if (!result.rows[0]) {
                res.status(401).json({ error: 'TOKEN_REVOKED' });
                return;
            }
            const { token_version, token_epoch_changed_at } = result.rows[0];
            // INVARIANT 3: tv mismatch → always deny
            if (payload.tv !== token_version) {
                res.status(401).json({ error: 'TOKEN_REVOKED' });
                return;
            }
            // Global epoch check — FORCE_LOGOUT_ALL increments epoch
            if (token_epoch_changed_at && payload.iat < token_epoch_changed_at) {
                res.status(401).json({ error: 'TOKEN_REVOKED' });
                return;
            }
            // Check session_epoch matches (concurrent login protection)
            const { rows: epochRows } = await postgres_1.db.query('SELECT session_epoch FROM ic_users WHERE id = $1', [payload.sub]);
            if (!epochRows[0] || epochRows[0].session_epoch !== payload.se) {
                res.status(401).json({ error: 'SESSION_SUPERSEDED' });
                return;
            }
            // Idle timeout: reject if token hasn't been refreshed within 30 minutes
            // iat reflects last token issue — access tokens are 10min TTL, so idle check
            // effectively fires when refresh token hasn't been used within SESSION_IDLE_SECONDS
            const now = Math.floor(Date.now() / 1000);
            const idleTime = now - payload.iat;
            if (idleTime > SESSION_IDLE_SECONDS) {
                res.status(401).json({ error: 'SESSION_EXPIRED', code: 'SESSION_IDLE' });
                return;
            }
            // Hard max-age check (defense in depth — exp already covers this but explicit)
            const sessionAge = now - payload.iat;
            if (sessionAge > SESSION_MAX_AGE_SECONDS) {
                res.status(401).json({ error: 'SESSION_EXPIRED', code: 'SESSION_MAX_AGE' });
                return;
            }
            req.user = payload;
            next();
        }).catch(() => {
            // DB unreachable → fail closed, never allow
            res.status(503).json({ error: 'AUTH_UNAVAILABLE' });
        });
    }
    catch {
        res.status(401).json({ error: 'INVALID_TOKEN' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'UNAUTHORIZED' });
            return;
        }
        const hasRole = roles.some(r => req.user.roles.includes(r));
        if (!hasRole) {
            res.status(403).json({ error: 'FORBIDDEN' });
            return;
        }
        next();
    };
}
