"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const authService_1 = require("../services/authService");
const rateLimit_1 = require("../middleware/rateLimit");
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
// Error handler
exports.authRouter.use((err, _req, res, _next) => {
    if (err.name === 'ZodError') {
        res.status(400).json({ error: 'VALIDATION_ERROR', details: err.message });
        return;
    }
    console.error('[Auth] Unhandled error', { name: err.name });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
});
