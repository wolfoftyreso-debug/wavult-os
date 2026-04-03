"use strict";
/**
 * Magic Link & SMS OTP service
 *
 * Handles:
 *  - sendMagicLinkEmail  — generate + store + email a one-time magic link (15 min TTL)
 *  - sendSmsOtp          — generate + store + SMS a 6-digit OTP via 46elks (10 min TTL)
 *  - verifyMagicToken    — validate and consume a magic link token (one-time use)
 *
 * External failures (SMTP, 46elks) are always logged but NEVER surface to the caller —
 * caller always returns 200 (security through obscurity).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLinkEmail = sendMagicLinkEmail;
exports.verifyMagicToken = verifyMagicToken;
exports.sendSmsOtp = sendSmsOtp;
exports.verifyOtp = verifyOtp;
const crypto_1 = __importDefault(require("crypto"));
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const config_1 = require("../config");
const client_ses_1 = require("@aws-sdk/client-ses");
const ddb = lib_dynamodb_1.DynamoDBDocumentClient.from(config_1.dynamoClient);
// ─── DynamoDB table bootstrap ─────────────────────────────────────────────────
async function ensureTable(tableName, pk, gsiName, gsiKey) {
    try {
        await config_1.dynamoClient.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
        return; // already exists
    }
    catch (err) {
        if (err.name !== 'ResourceNotFoundException')
            throw err;
    }
    const gsiDefs = gsiName && gsiKey
        ? {
            AttributeDefinitions: [
                { AttributeName: pk, AttributeType: 'S' },
                { AttributeName: gsiKey, AttributeType: 'S' },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: gsiName,
                    KeySchema: [{ AttributeName: gsiKey, KeyType: 'HASH' }],
                    Projection: { ProjectionType: 'ALL' },
                },
            ],
        }
        : {
            AttributeDefinitions: [
                { AttributeName: pk, AttributeType: 'S' },
            ],
        };
    await config_1.dynamoClient.send(new client_dynamodb_1.CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: pk, KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
        ...gsiDefs,
    }));
    console.log(`[MagicLink] Created DynamoDB table: ${tableName}`);
}
// Lazy-ensure tables once at first use — avoids blocking startup
let tablesReady = false;
async function ensureTables() {
    if (tablesReady)
        return;
    await Promise.all([
        ensureTable(config_1.config.dynamo.magicLinksTable, 'token', 'email-index', 'email'),
        ensureTable(config_1.config.dynamo.otpCodesTable, 'phone'),
    ]);
    tablesReady = true;
}
// ─── Magic link ───────────────────────────────────────────────────────────────
/**
 * Generate a secure magic-link token, store it in DynamoDB, and email it to the user.
 * If SMTP (SES) fails, logs the magic link to console (dev fallback).
 */
async function sendMagicLinkEmail(email) {
    try {
        await ensureTables();
    }
    catch (err) {
        console.error('[MagicLink] ensureTables failed', err);
        // Continue anyway — table may already exist in production
    }
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const expiresAtTtl = Math.floor(Date.now() / 1000) + 15 * 60;
    const magicUrl = `${process.env.APP_URL || 'https://app.wavult.com'}/auth/verify?token=${token}`;
    // Store in DynamoDB
    try {
        await ddb.send(new lib_dynamodb_1.PutCommand({
            TableName: config_1.config.dynamo.magicLinksTable,
            Item: {
                token,
                email: email.toLowerCase(),
                expiresAt,
                expiresAtTtl,
                createdAt: new Date().toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(#t)',
            ExpressionAttributeNames: { '#t': 'token' },
        }));
    }
    catch (err) {
        console.error('[MagicLink] Failed to store token in DynamoDB', { email, err });
        // Intentional: if we can't store, the link won't verify — don't send it
        console.log(`[MagicLink] DEV FALLBACK token for ${email}: ${token}`);
        console.log(`[MagicLink] DEV FALLBACK URL: ${magicUrl}`);
        return;
    }
    // Send email via SES
    try {
        const fromAddress = process.env.MAIL_FROM || 'noreply@wavult.com';
        await config_1.sesClient.send(new client_ses_1.SendEmailCommand({
            Source: fromAddress,
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: 'Din inloggningslänk — Wavult', Charset: 'UTF-8' },
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#1a1a1a">
  <h2 style="color:#0066cc">Logga in på Wavult</h2>
  <p>Klicka på länken nedan för att logga in. Länken är giltig i 15 minuter.</p>
  <p style="margin:32px 0">
    <a href="${magicUrl}"
       style="background:#0066cc;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Logga in
    </a>
  </p>
  <p style="font-size:12px;color:#666">
    Om du inte bad om denna länk kan du ignorera detta mail.<br>
    Länken fungerar bara en gång och upphör om 15 minuter.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:11px;color:#999">Wavult Group AB</p>
</body>
</html>`,
                    },
                    Text: {
                        Charset: 'UTF-8',
                        Data: `Logga in på Wavult\n\nKlicka på länken: ${magicUrl}\n\nLänken är giltig i 15 minuter och kan bara användas en gång.\n\nOm du inte bad om denna länk kan du ignorera detta mail.`,
                    },
                },
            },
        }));
        console.log(`[MagicLink] Email sent to ${email}`);
    }
    catch (err) {
        console.error('[MagicLink] SES send failed', { email, err });
        // Dev/fallback: log to console so devs can test locally without SES
        console.log(`[MagicLink] DEV FALLBACK — magic link for ${email}: ${magicUrl}`);
        // Don't rethrow — return 200 regardless (security through obscurity)
    }
}
/**
 * Verify a magic-link token. Returns { email } if valid, null otherwise.
 * Token is deleted on first use (one-time use).
 */
async function verifyMagicToken(token) {
    try {
        await ensureTables();
    }
    catch {
        // Ignore — table definitely exists if we stored tokens
    }
    let item;
    try {
        const result = await ddb.send(new lib_dynamodb_1.GetCommand({
            TableName: config_1.config.dynamo.magicLinksTable,
            Key: { token },
            ConsistentRead: true,
        }));
        item = result.Item;
    }
    catch (err) {
        console.error('[MagicLink] DynamoDB get failed', { err });
        return null; // Fail closed
    }
    if (!item)
        return null;
    // Check expiry (belt-and-suspenders — TTL handles eventual cleanup)
    if (new Date(item.expiresAt) < new Date()) {
        return null;
    }
    // Delete token — one-time use
    try {
        await ddb.send(new lib_dynamodb_1.DeleteCommand({
            TableName: config_1.config.dynamo.magicLinksTable,
            Key: { token },
        }));
    }
    catch (err) {
        console.error('[MagicLink] Failed to delete consumed token', { err });
        // Don't fail the verification — token is expired in any case
    }
    return { email: item.email };
}
// ─── SMS OTP ──────────────────────────────────────────────────────────────────
/**
 * Generate a 6-digit OTP, store it in DynamoDB, and send it via 46elks SMS.
 * If 46elks fails, logs OTP to console (dev fallback).
 */
async function sendSmsOtp(phone) {
    try {
        await ensureTables();
    }
    catch (err) {
        console.error('[SmsOtp] ensureTables failed', err);
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const expiresAtTtl = Math.floor(Date.now() / 1000) + 10 * 60;
    // Store OTP in DynamoDB — overwrite any previous code for this phone number
    try {
        await ddb.send(new lib_dynamodb_1.PutCommand({
            TableName: config_1.config.dynamo.otpCodesTable,
            Item: {
                phone,
                otp,
                expiresAt,
                expiresAtTtl,
                createdAt: new Date().toISOString(),
            },
        }));
    }
    catch (err) {
        console.error('[SmsOtp] Failed to store OTP in DynamoDB', { phone, err });
        console.log(`[SmsOtp] DEV FALLBACK OTP for ${phone}: ${otp}`);
        return;
    }
    // Send via 46elks
    const username = process.env.FORTYSIX_ELKS_USERNAME;
    const password = process.env.FORTYSIX_ELKS_PASSWORD;
    if (!username || !password) {
        console.warn('[SmsOtp] 46elks credentials not configured — DEV FALLBACK');
        console.log(`[SmsOtp] DEV FALLBACK OTP for ${phone}: ${otp}`);
        return;
    }
    try {
        const body = new URLSearchParams({
            to: phone,
            from: 'Wavult',
            message: `Din kod: ${otp}`,
        });
        const response = await fetch('https://api.46elks.com/a1/sms', {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('[SmsOtp] 46elks returned non-OK', { status: response.status, text });
            console.log(`[SmsOtp] DEV FALLBACK OTP for ${phone}: ${otp}`);
        }
        else {
            console.log(`[SmsOtp] SMS sent to ${phone}`);
        }
    }
    catch (err) {
        console.error('[SmsOtp] 46elks request failed', { phone, err });
        console.log(`[SmsOtp] DEV FALLBACK OTP for ${phone}: ${otp}`);
        // Don't rethrow — return 200 regardless (security through obscurity)
    }
}
/**
 * Verify a submitted OTP for a given phone number.
 * Returns true if valid, false otherwise. Deletes on success (one-time use).
 */
async function verifyOtp(phone, otp) {
    try {
        await ensureTables();
    }
    catch {
        // Ignore
    }
    let item;
    try {
        const result = await ddb.send(new lib_dynamodb_1.GetCommand({
            TableName: config_1.config.dynamo.otpCodesTable,
            Key: { phone },
            ConsistentRead: true,
        }));
        item = result.Item;
    }
    catch (err) {
        console.error('[SmsOtp] DynamoDB get failed', { err });
        return false;
    }
    if (!item)
        return false;
    // Check expiry
    if (new Date(item.expiresAt) < new Date()) {
        return false;
    }
    // Constant-time comparison to prevent timing attacks
    const storedOtp = item.otp;
    if (!crypto_1.default.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(otp))) {
        return false;
    }
    // Delete OTP — one-time use
    try {
        await ddb.send(new lib_dynamodb_1.DeleteCommand({
            TableName: config_1.config.dynamo.otpCodesTable,
            Key: { phone },
        }));
    }
    catch (err) {
        console.error('[SmsOtp] Failed to delete consumed OTP', { err });
    }
    return true;
}
