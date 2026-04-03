"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const authService_1 = require("../services/authService");
const rateLimit_1 = require("../middleware/rateLimit");
const magicLinkService_1 = require("../services/magicLinkService");
const dynamo_1 = require("../db/dynamo");
const tokens_1 = require("../crypto/tokens");
const userService_1 = require("../services/userService");
const postgres_1 = require("../db/postgres");
exports.authRouter = (0, express_1.Router)();
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const RefreshSchema = zod_1.z.object({
    refresh_token: zod_1.z.string().min(1),
    session_id: zod_1.z.string().uuid(),
});
function asyncHandler(fn) {
    return (req, res, next) => fn(req, res, next).catch(next);
}
// POST /v1/auth/login — two-layer rate limiting: per-IP + per-email
exports.authRouter.post('/login', rateLimit_1.ipLoginLimiter, rateLimit_1.emailLoginLimiter, asyncHandler(async (req, res) => {
    const { email, password } = LoginSchema.parse(req.body);
    try {
        const result = await (0, authService_1.login)(email, password, req.ip || undefined, req.headers['user-agent'] || undefined, req.requestId);
        res.json({ data: result });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'UNKNOWN';
        if (msg === 'INVALID_CREDENTIALS') {
            res.status(401).json({ error: 'INVALID_CREDENTIALS' });
            return;
        }
        if (msg === 'ACCOUNT_LOCKED') {
            res.status(423).json({ error: 'ACCOUNT_LOCKED' });
            return;
        }
        throw err;
    }
}));
// POST /v1/auth/refresh
exports.authRouter.post('/refresh', asyncHandler(async (req, res) => {
    const { refresh_token, session_id } = RefreshSchema.parse(req.body);
    try {
        const result = await (0, authService_1.refreshAccessToken)(refresh_token, session_id, req.requestId);
        res.json({ data: result });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'UNKNOWN';
        if (['INVALID_SESSION', 'SESSION_EXPIRED', 'INVALID_REFRESH_TOKEN'].includes(msg)) {
            res.status(401).json({ error: msg });
            return;
        }
        if (msg === 'CONFLICT') {
            res.status(409).json({ error: 'SESSION_CONFLICT' });
            return;
        }
        if (msg === 'TOKEN_VERSION_MISMATCH') {
            res.status(401).json({ error: 'TOKEN_REVOKED' });
            return;
        }
        throw err;
    }
}));
// POST /v1/auth/logout
exports.authRouter.post('/logout', asyncHandler(async (req, res) => {
    const { session_id, user_id } = req.body;
    if (!session_id || !user_id) {
        res.status(400).json({ error: 'MISSING_PARAMS' });
        return;
    }
    await (0, authService_1.logout)(session_id, user_id, req.requestId);
    res.json({ data: { success: true } });
}));
// ─── Magic link / OTP schemas ─────────────────────────────────────────────────
const ForgotPasswordSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1),
});
const MagicLinkSchema = zod_1.z.object({
    method: zod_1.z.enum(['email', 'sms']).optional(),
    identifier: zod_1.z.string().min(1).optional(),
});
const VerifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(1),
    otp: zod_1.z.string().length(6),
});
// POST /v1/auth/forgot-password
exports.authRouter.post('/forgot-password', asyncHandler(async (req, res) => {
    try {
        const { identifier } = ForgotPasswordSchema.parse(req.body);
        if (identifier.includes('@')) {
            await (0, magicLinkService_1.sendMagicLinkEmail)(identifier.toLowerCase().trim());
        }
        else {
            await (0, magicLinkService_1.sendSmsOtp)(identifier.trim());
        }
    }
    catch (err) {
        if (err instanceof Error && err.name === 'ZodError')
            throw err;
        // Log external service failures but don't expose them
        console.error('[Auth] forgot-password external service error', err);
    }
    // Always 200 — never reveal if account exists
    res.json({ data: { message: 'Om kontot finns skickas en länk/kod.' } });
}));
// POST /v1/auth/magic-link — explicit channel selection
exports.authRouter.post('/magic-link', asyncHandler(async (req, res) => {
    try {
        const body = MagicLinkSchema.parse(req.body);
        // Resolve identifier: use body value or fall back to JWT claim if caller is authenticated
        let identifier = body.identifier?.trim();
        if (!identifier) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                // Extract email from JWT without full verification (best-effort for magic-link trigger)
                try {
                    const token = authHeader.slice(7);
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                        identifier = payload.email;
                    }
                }
                catch {
                    // Ignore — identifier stays undefined
                }
            }
        }
        if (identifier) {
            const method = body.method;
            if (method === 'sms' || (!method && !identifier.includes('@'))) {
                await (0, magicLinkService_1.sendSmsOtp)(identifier);
            }
            else {
                await (0, magicLinkService_1.sendMagicLinkEmail)(identifier);
            }
        }
    }
    catch (err) {
        if (err instanceof Error && err.name === 'ZodError')
            throw err;
        console.error('[Auth] magic-link external service error', err);
    }
    res.json({ data: { message: 'Om kontot finns skickas en länk/kod.' } });
}));
// GET /v1/auth/verify?token=xxx
exports.authRouter.get('/verify', asyncHandler(async (req, res) => {
    const token = req.query.token;
    if (!token || typeof token !== 'string' || token.length === 0) {
        res.status(401).json({ error: 'Länken är ogiltig eller har gått ut.' });
        return;
    }
    let verifyResult = null;
    try {
        verifyResult = await (0, magicLinkService_1.verifyMagicToken)(token);
    }
    catch (err) {
        console.error('[Auth] verifyMagicToken error', err);
        res.status(401).json({ error: 'Länken är ogiltig eller har gått ut.' });
        return;
    }
    if (!verifyResult) {
        res.status(401).json({ error: 'Länken är ogiltig eller har gått ut.' });
        return;
    }
    // Find or create user from email
    let user = await (0, userService_1.getUserByEmail)(verifyResult.email);
    if (!user) {
        // Auto-provision user — magic link is an implicit registration pathway
        const { rows } = await postgres_1.db.query(`INSERT INTO ic_users (email, email_verified, roles)
       VALUES ($1, true, '{}')
       ON CONFLICT (email) DO UPDATE SET email_verified = true
       RETURNING *`, [verifyResult.email.toLowerCase()]);
        user = rows[0];
    }
    if (!user || !user.is_active) {
        res.status(401).json({ error: 'Länken är ogiltig eller har gått ut.' });
        return;
    }
    // Increment session_epoch atomically
    const epochResult = await postgres_1.db.query(`UPDATE ic_users SET session_epoch = session_epoch + 1, email_verified = true, updated_at = NOW()
     WHERE id = $1 RETURNING session_epoch, token_version`, [user.id]);
    const currentEpoch = epochResult.rows[0].session_epoch;
    const currentTv = epochResult.rows[0].token_version;
    const { generateRefreshToken, hashToken } = await Promise.resolve().then(() => __importStar(require('../crypto/tokens')));
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const { config } = await Promise.resolve().then(() => __importStar(require('../config')));
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenTtl * 1000);
    const session = await (0, dynamo_1.createSession)({
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        ip_address: req.ip || undefined,
        user_agent: req.headers['user-agent'] || undefined,
        expires_at: expiresAt.toISOString(),
    });
    const accessToken = await (0, tokens_1.signAccessToken)({
        sub: user.id,
        email: user.email,
        org: user.org_id || 'wavult',
        roles: user.roles || [],
        session_id: session.session_id,
        tv: currentTv,
        se: currentEpoch,
    });
    res.json({
        data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            session_id: session.session_id,
            expires_in: config.jwt.accessTokenTtl,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name ?? null,
                org_id: user.org_id ?? null,
                roles: user.roles || [],
            },
        },
    });
}));
// POST /v1/auth/verify-otp
exports.authRouter.post('/verify-otp', asyncHandler(async (req, res) => {
    let phone;
    let otp;
    try {
        const parsed = VerifyOtpSchema.parse(req.body);
        phone = parsed.phone;
        otp = parsed.otp;
    }
    catch (err) {
        res.status(400).json({ error: 'VALIDATION_ERROR', details: err instanceof Error ? err.message : '' });
        return;
    }
    let valid = false;
    try {
        valid = await (0, magicLinkService_1.verifyOtp)(phone, otp);
    }
    catch (err) {
        console.error('[Auth] verifyOtp error', err);
        res.status(401).json({ error: 'Ogiltig kod.' });
        return;
    }
    if (!valid) {
        res.status(401).json({ error: 'Ogiltig kod.' });
        return;
    }
    // Find or create user from phone — phone-auth pathway
    let user;
    {
        const { rows } = await postgres_1.db.query(`SELECT * FROM ic_users WHERE phone = $1 AND is_active = true LIMIT 1`, [phone]);
        user = rows[0] || null;
    }
    if (!user) {
        // Attempt by email lookup (if phone not a separate column, skip auto-provision)
        // Create a minimal placeholder user for the phone number
        const { rows } = await postgres_1.db.query(`INSERT INTO ic_users (email, email_verified, roles)
       VALUES ($1, false, '{}')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING *`, [`phone:${phone.replace(/[^0-9+]/g, '')}@wavult.internal`]);
        user = rows[0];
    }
    if (!user || !user.is_active) {
        res.status(401).json({ error: 'Ogiltig kod.' });
        return;
    }
    const epochResult = await postgres_1.db.query(`UPDATE ic_users SET session_epoch = session_epoch + 1, updated_at = NOW()
     WHERE id = $1 RETURNING session_epoch, token_version`, [user.id]);
    const currentEpoch = epochResult.rows[0].session_epoch;
    const currentTv = epochResult.rows[0].token_version;
    const { generateRefreshToken, hashToken } = await Promise.resolve().then(() => __importStar(require('../crypto/tokens')));
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const { config } = await Promise.resolve().then(() => __importStar(require('../config')));
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenTtl * 1000);
    const session = await (0, dynamo_1.createSession)({
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        ip_address: req.ip || undefined,
        user_agent: req.headers['user-agent'] || undefined,
        expires_at: expiresAt.toISOString(),
    });
    const accessToken = await (0, tokens_1.signAccessToken)({
        sub: user.id,
        email: user.email,
        org: user.org_id || 'wavult',
        roles: user.roles || [],
        session_id: session.session_id,
        tv: currentTv,
        se: currentEpoch,
    });
    res.json({
        data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            session_id: session.session_id,
            expires_in: config.jwt.accessTokenTtl,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name ?? null,
                org_id: user.org_id ?? null,
                roles: user.roles || [],
            },
        },
    });
}));
// Error handler
exports.authRouter.use((err, _req, res, _next) => {
    if (err.name === 'ZodError') {
        res.status(400).json({ error: 'VALIDATION_ERROR', details: err.message });
        return;
    }
    console.error('[Auth] Unhandled error', { name: err.name });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
});
