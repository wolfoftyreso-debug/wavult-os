"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementTokenVersion = incrementTokenVersion;
exports.forceNewSession = forceNewSession;
exports.incrementGlobalTokenEpoch = incrementGlobalTokenEpoch;
exports.login = login;
exports.refreshAccessToken = refreshAccessToken;
exports.logout = logout;
exports.logAuthEvent = logAuthEvent;
const normalizeEmail_1 = require("../utils/normalizeEmail");
const postgres_1 = require("../db/postgres");
const dynamo_1 = require("../db/dynamo");
const password_1 = require("../crypto/password");
const tokens_1 = require("../crypto/tokens");
const config_1 = require("../config");
const metrics_1 = require("../metrics");
const crypto_1 = __importDefault(require("crypto"));
/** Increment token_version with optimistic lock. All existing JWTs immediately invalid. */
async function incrementTokenVersion(userId, currentStateVersion) {
    const result = await postgres_1.db.query(`UPDATE ic_users
     SET token_version = token_version + 1,
         state_version = state_version + 1,
         updated_at = NOW()
     WHERE id = $1 AND state_version = $2`, [userId, currentStateVersion]);
    if (result.rowCount === 0)
        throw new Error('CONCURRENT_MODIFICATION');
}
/** Revoke all sessions for a user before creating a new one (session fixation prevention). */
async function forceNewSession(userId) {
    await (0, dynamo_1.revokeAllUserSessions)(userId);
}
/** Increment global token epoch — triggers rejection of ALL tokens issued before this moment. */
async function incrementGlobalTokenEpoch() {
    const now = Math.floor(Date.now() / 1000);
    await postgres_1.db.query(`UPDATE ic_global_state SET value = value + 1, updated_at = NOW() WHERE key = 'token_epoch'`);
    await postgres_1.db.query(`UPDATE ic_global_state SET value = $1, updated_at = NOW() WHERE key = 'token_epoch_changed_at'`, [now]);
}
async function login(email, password, ipAddress, userAgent, requestId) {
    // 1. Find user — USER ENUMERATION PROTECTION:
    // Always run argon2 equivalent work whether or not user exists to normalize timing.
    const { rows } = await postgres_1.db.query('SELECT * FROM ic_users WHERE email = $1 AND is_active = true', [(0, normalizeEmail_1.normalizeEmail)(email)]);
    const user = rows[0];
    if (!user) {
        // Timing normalization: dummy hash prevents user enumeration via response time
        await (0, password_1.hashPassword)('dummy-timing-normalization-password-wavult');
        metrics_1.metrics.authFailure++;
        throw new Error('INVALID_CREDENTIALS');
    }
    // 2. Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        metrics_1.metrics.authFailure++;
        throw new Error('ACCOUNT_LOCKED');
    }
    // 3. Verify password — INVALID_CREDENTIALS regardless of which check fails (no enumeration)
    if (!user.password_hash) {
        await (0, password_1.hashPassword)('dummy-timing-normalization-password-wavult');
        metrics_1.metrics.authFailure++;
        throw new Error('INVALID_CREDENTIALS');
    }
    const valid = await (0, password_1.verifyPassword)(user.password_hash, password);
    if (!valid) {
        const newCount = user.failed_login_count + 1;
        const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await postgres_1.db.query('UPDATE ic_users SET failed_login_count = $1, locked_until = $2, updated_at = NOW() WHERE id = $3', [newCount, lockUntil, user.id]);
        await logAuthEvent(user.id, 'login.failed', ipAddress, userAgent, undefined, undefined, requestId);
        metrics_1.metrics.authFailure++;
        throw new Error('INVALID_CREDENTIALS');
    }
    // 4. Reset failed count
    await postgres_1.db.query('UPDATE ic_users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
    // 5. Session fixation prevention — revoke all existing sessions before creating new one
    await forceNewSession(user.id);
    // Increment session_epoch atomically — prevents concurrent login race
    const epochResult = await postgres_1.db.query(`UPDATE ic_users SET session_epoch = session_epoch + 1, updated_at = NOW()
     WHERE id = $1 RETURNING session_epoch, token_version`, [user.id]);
    const currentEpoch = epochResult.rows[0].session_epoch;
    const currentTv = epochResult.rows[0].token_version;
    // 6. Create session
    const refreshToken = (0, tokens_1.generateRefreshToken)();
    const refreshTokenHash = (0, tokens_1.hashToken)(refreshToken);
    const expiresAt = new Date(Date.now() + config_1.config.jwt.refreshTokenTtl * 1000);
    // Anomaly detection: log new IP logins
    const anomalyFlags = [];
    if (ipAddress) {
        const { rows: recentLogins } = await postgres_1.db.query(`SELECT DISTINCT ip_address FROM ic_auth_events
       WHERE user_id = $1 AND event_type = 'login.success' AND ip_address = $2
       LIMIT 1`, [user.id, ipAddress]);
        if (recentLogins.length === 0) {
            anomalyFlags.push('new_ip_login');
            metrics_1.metrics.anomalyCount++;
            await logAuthEvent(user.id, 'anomaly.new_ip', ipAddress, userAgent, undefined, undefined, requestId);
        }
    }
    const session = await (0, dynamo_1.createSession)({
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        revoked: false,
    });
    // 7. Sign access token with current token_version and session_epoch
    const accessToken = await (0, tokens_1.signAccessToken)({
        sub: user.id,
        email: user.email,
        org: user.org_id || 'wavult',
        roles: user.roles || [],
        session_id: session.session_id,
        tv: currentTv,
        se: currentEpoch, // session_epoch
    });
    await logAuthEvent(user.id, 'login.success', ipAddress, userAgent, session.session_id, undefined, requestId);
    metrics_1.metrics.authSuccess++;
    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        session_id: session.session_id,
        expires_in: config_1.config.jwt.accessTokenTtl,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name ?? null,
            org_id: user.org_id ?? null,
            roles: user.roles || [],
        },
    };
}
async function refreshAccessToken(refreshToken, sessionId, requestId) {
    // INVARIANT 5: null session → SESSION_EXPIRED, never create new
    const session = await (0, dynamo_1.getSession)(sessionId);
    if (!session)
        throw new Error('SESSION_EXPIRED');
    // INVARIANTS 1 & 6: only 'active' sessions may be refreshed
    switch (session.state) {
        case 'active':
            break;
        case 'rotated':
        case 'revoked':
            // Replay of old token — entire chain is already dead
            throw new Error('INVALID_SESSION');
        case 'expired':
            throw new Error('SESSION_EXPIRED');
        default:
            // INVARIANT 6: unknown state → always throw
            throw new Error('UNKNOWN_SESSION_STATE: ' + session.state);
    }
    if (new Date(session.expires_at) < new Date())
        throw new Error('SESSION_EXPIRED');
    // INVARIANT 2: token hash must match
    if ((0, tokens_1.hashToken)(refreshToken) !== session.refresh_token_hash)
        throw new Error('INVALID_REFRESH_TOKEN');
    const { rows } = await postgres_1.db.query('SELECT * FROM ic_users WHERE id = $1 AND is_active = true', [session.user_id]);
    if (!rows[0])
        throw new Error('USER_NOT_FOUND');
    const user = rows[0];
    // INVARIANT 3: token_version must match (logout/password reset invalidates all tokens).
    // refresh_count carries the token_version at session creation time.
    // If token_version has been incremented (logout/password reset), deny immediately.
    if (user.token_version !== session.refresh_count) {
        await logAuthEvent(session.user_id, 'token.version_mismatch', undefined, undefined, sessionId, undefined, requestId);
        throw new Error('TOKEN_VERSION_MISMATCH');
    }
    // Rotate session atomically — DOUBLE SPEND protection
    const newRefreshToken = (0, tokens_1.generateRefreshToken)();
    const newRefreshTokenHash = (0, tokens_1.hashToken)(newRefreshToken);
    const expiresAt = new Date(Date.now() + config_1.config.jwt.refreshTokenTtl * 1000);
    let newSession;
    try {
        newSession = await (0, dynamo_1.rotateSession)(sessionId, {
            user_id: user.id,
            refresh_token_hash: newRefreshTokenHash,
            parent_token_hash: session.refresh_token_hash,
            ip_address: session.ip_address,
            user_agent: session.user_agent,
            expires_at: expiresAt.toISOString(),
            revoked: false,
        }, (session.refresh_count || 0) + 1);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'SESSION_RACE_LOST') {
            // Double-spend detected — NEVER retry
            throw new Error('CONFLICT');
        }
        throw err;
    }
    const accessToken = await (0, tokens_1.signAccessToken)({
        sub: user.id,
        email: user.email,
        org: user.org_id || 'wavult',
        roles: user.roles || [],
        session_id: newSession.session_id,
        tv: user.token_version,
    });
    await logAuthEvent(user.id, 'token.refresh', undefined, undefined, newSession.session_id, undefined, requestId);
    metrics_1.metrics.refreshSuccess++;
    return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        session_id: newSession.session_id,
        expires_in: config_1.config.jwt.accessTokenTtl,
    };
}
async function logout(sessionId, userId, requestId) {
    // Get current state_version for optimistic lock on token_version increment
    const { rows } = await postgres_1.db.query('SELECT token_version, state_version FROM ic_users WHERE id = $1', [userId]);
    if (rows[0]) {
        await incrementTokenVersion(userId, rows[0].state_version);
    }
    await (0, dynamo_1.revokeSession)(sessionId); // Idempotent
    await logAuthEvent(userId, 'logout', undefined, undefined, sessionId, undefined, requestId);
    metrics_1.metrics.sessionRevocations++;
}
async function logAuthEvent(userId, eventType, ipAddress, userAgent, sessionId, metadata, requestId) {
    // Compute tamper-evident checksum
    const checksum = crypto_1.default
        .createHash('sha256')
        .update(`${eventType}${userId}${new Date().toISOString()}`)
        .digest('hex');
    await postgres_1.db.query(`INSERT INTO ic_auth_events
     (user_id, event_type, ip_address, user_agent, session_id, request_id, metadata, row_checksum)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        userId,
        eventType,
        ipAddress ?? null,
        userAgent ?? null,
        sessionId ?? null,
        requestId ?? null,
        JSON.stringify(metadata || {}),
        checksum,
    ]);
}
