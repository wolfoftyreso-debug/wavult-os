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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mfaRouter = void 0;
const express_1 = require("express");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const postgres_1 = require("../db/postgres");
const auth_1 = require("../middleware/auth");
const authService_1 = require("../services/authService");
exports.mfaRouter = (0, express_1.Router)();
const ISSUER = 'Wavult OS';
function asyncHandler(fn) {
    return (req, res, next) => fn(req, res, next).catch(next);
}
async function checkTotp(code, secret) {
    try {
        const result = await (0, otplib_1.verify)({ secret, token: code });
        return typeof result === 'object' ? result.valid : false;
    }
    catch {
        return false;
    }
}
// POST /v1/mfa/setup — generate TOTP secret, store as pending until verified
exports.mfaRouter.post('/setup', auth_1.requireAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const email = req.user?.email || userId;
    if (!userId) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }
    const secret = (0, otplib_1.generateSecret)();
    const otpauth = (0, otplib_1.generateURI)({ label: email, issuer: ISSUER, secret });
    await postgres_1.db.query('UPDATE ic_users SET mfa_secret_pending = $1, updated_at = NOW() WHERE id = $2', [secret, userId]);
    const qrDataUrl = await qrcode_1.default.toDataURL(otpauth);
    await (0, authService_1.logAuthEvent)(userId, 'mfa.setup_initiated', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, { issuer: ISSUER }, req.requestId);
    res.json({ secret, qr: qrDataUrl, otpauth });
}));
// POST /v1/mfa/verify — verify code and activate MFA
exports.mfaRouter.post('/verify', auth_1.requireAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const { code } = req.body;
    if (!userId) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }
    if (!code) {
        res.status(400).json({ error: 'MISSING_CODE' });
        return;
    }
    const result = await postgres_1.db.query('SELECT mfa_secret_pending FROM ic_users WHERE id = $1', [userId]);
    const secret = result.rows[0]?.mfa_secret_pending;
    if (!secret) {
        res.status(400).json({ error: 'NO_PENDING_MFA_SETUP' });
        return;
    }
    const valid = await checkTotp(code, secret);
    if (!valid) {
        await (0, authService_1.logAuthEvent)(userId, 'mfa.verify_failed', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, {}, req.requestId);
        res.status(400).json({ error: 'INVALID_CODE' });
        return;
    }
    // Generate 8 cryptographic backup codes
    const { randomBytes } = await Promise.resolve().then(() => __importStar(require('crypto')));
    const backupCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex').toUpperCase());
    await postgres_1.db.query(`UPDATE ic_users
     SET mfa_enabled = true,
         mfa_secret = mfa_secret_pending,
         mfa_secret_pending = NULL,
         mfa_backup_codes = $1,
         updated_at = NOW()
     WHERE id = $2`, [JSON.stringify(backupCodes), userId]);
    await (0, authService_1.logAuthEvent)(userId, 'mfa.enabled', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, {}, req.requestId);
    res.json({ activated: true, backup_codes: backupCodes });
}));
// POST /v1/mfa/challenge — validate TOTP during login (no auth token required)
exports.mfaRouter.post('/challenge', asyncHandler(async (req, res) => {
    const { user_id, code } = req.body;
    if (!user_id || !code) {
        res.status(400).json({ error: 'MISSING_PARAMS' });
        return;
    }
    const result = await postgres_1.db.query(`SELECT mfa_secret, mfa_backup_codes
     FROM ic_users WHERE id = $1 AND mfa_enabled = true AND is_active = true`, [user_id]);
    if (!result.rows[0]) {
        res.status(400).json({ error: 'MFA_NOT_ENABLED' });
        return;
    }
    const { mfa_secret, mfa_backup_codes } = result.rows[0];
    const totpValid = await checkTotp(code, mfa_secret);
    const backupCodes = JSON.parse(mfa_backup_codes || '[]');
    const backupIndex = backupCodes.indexOf(code.toUpperCase());
    const backupValid = backupIndex >= 0;
    if (!totpValid && !backupValid) {
        await (0, authService_1.logAuthEvent)(user_id, 'mfa.challenge_failed', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, {}, req.requestId);
        res.status(401).json({ error: 'INVALID_MFA_CODE' });
        return;
    }
    // Consume backup code if used (one-time use)
    if (backupValid) {
        backupCodes.splice(backupIndex, 1);
        await postgres_1.db.query('UPDATE ic_users SET mfa_backup_codes = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(backupCodes), user_id]);
    }
    await (0, authService_1.logAuthEvent)(user_id, 'mfa.verified', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, { method: totpValid ? 'totp' : 'backup' }, req.requestId);
    res.json({ verified: true, method: totpValid ? 'totp' : 'backup' });
}));
// POST /v1/mfa/disable — disable MFA, requires valid TOTP code
exports.mfaRouter.post('/disable', auth_1.requireAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const { code } = req.body;
    if (!userId) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }
    const result = await postgres_1.db.query('SELECT mfa_secret, mfa_enabled FROM ic_users WHERE id = $1', [userId]);
    const row = result.rows[0];
    if (!row) {
        res.status(404).json({ error: 'USER_NOT_FOUND' });
        return;
    }
    if (row.mfa_enabled) {
        if (!code) {
            res.status(400).json({ error: 'MISSING_CODE' });
            return;
        }
        const codeValid = row.mfa_secret ? await checkTotp(code, row.mfa_secret) : false;
        if (!codeValid) {
            await (0, authService_1.logAuthEvent)(userId, 'mfa.disable_failed', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, {}, req.requestId);
            res.status(401).json({ error: 'INVALID_CODE' });
            return;
        }
    }
    await postgres_1.db.query(`UPDATE ic_users
     SET mfa_enabled = false,
         mfa_secret = NULL,
         mfa_secret_pending = NULL,
         mfa_backup_codes = NULL,
         updated_at = NOW()
     WHERE id = $1`, [userId]);
    await (0, authService_1.logAuthEvent)(userId, 'mfa.disabled', req.ip || undefined, req.headers['user-agent'] || undefined, undefined, {}, req.requestId);
    res.json({ disabled: true });
}));
// GET /v1/mfa/status — check if MFA is enabled for current user
exports.mfaRouter.get('/status', auth_1.requireAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }
    const result = await postgres_1.db.query(`SELECT mfa_enabled,
            CASE WHEN mfa_backup_codes IS NOT NULL
                 THEN json_array_length(mfa_backup_codes::json)
                 ELSE 0 END AS backup_codes_remaining
     FROM ic_users WHERE id = $1`, [userId]);
    const row = result.rows[0];
    if (!row) {
        res.status(404).json({ error: 'USER_NOT_FOUND' });
        return;
    }
    res.json({ mfa_enabled: row.mfa_enabled, backup_codes_remaining: row.backup_codes_remaining });
}));
// Error handler for MFA router
exports.mfaRouter.use((err, _req, res, _next) => {
    console.error('[MFA] Unhandled error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
});
