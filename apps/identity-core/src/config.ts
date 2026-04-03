import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { KMSClient } from '@aws-sdk/client-kms'
import { SESClient } from '@aws-sdk/client-ses'

const REGION = process.env.AWS_REGION || 'eu-north-1'

export type AuthSource = 'supabase' | 'hybrid' | 'identity-core'
export type AuthMode = 'logging-only' | 'soft' | 'hard' | 'identity-core-only'

export const config = {
  port: parseInt(process.env.PORT || '3005'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // DEPLOY LADDER — never big-bang:
  // Step 1: AUTH_MODE=logging-only (observe, never block)
  // Step 2: AUTH_MODE=soft (log failures, don't block)
  // Step 3: AUTH_MODE=hard (full enforcement)
  // Step 4: AUTH_MODE=identity-core-only (Supabase disabled)
  authMode: (process.env.AUTH_MODE || 'logging-only') as AuthMode,

  // AUTH_SOURCE: read from env, future: AWS Parameter Store
  authSource: (process.env.AUTH_SOURCE || 'supabase') as AuthSource,

  // Kill switch: FORCE_LOGOUT_ALL=true → 401 SYSTEM_LOCKDOWN for all auth requests
  forceLogoutAll: process.env.FORCE_LOGOUT_ALL === 'true',

  // Audience for this specific service — service isolation
  // e.g. 'wavult-os' | 'quixzoom' | 'landvex'
  serviceAudience: process.env.SERVICE_AUDIENCE || 'wavult-os',

  // PostgreSQL (RDS-ready)
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wavult_identity',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
  },

  // DynamoDB tables
  dynamo: {
    sessionsTable: process.env.DYNAMO_SESSIONS_TABLE || 'ic-sessions',
    tokensTable: process.env.DYNAMO_TOKENS_TABLE || 'ic-refresh-tokens',
    eventsTable: process.env.DYNAMO_EVENTS_TABLE || 'ic-auth-events',
    magicLinksTable: process.env.DYNAMO_MAGIC_LINKS_TABLE || 'wavult-magic-links',
    otpCodesTable: process.env.DYNAMO_OTP_CODES_TABLE || 'wavult-otp-codes',
    // TTL: expires_at must be enabled as DynamoDB TTL field via AWS CLI:
    // aws dynamodb update-time-to-live --table-name ic-sessions \
    //   --time-to-live-specification "Enabled=true,AttributeName=expires_at_ttl"
    // NOTE: expires_at is ISO string for app logic; store expires_at_ttl as Unix epoch for DynamoDB TTL
  },

  // KMS
  kms: {
    keyId: process.env.KMS_KEY_ID || '',
    keyAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256' as const,
  },

  // JWT
  jwt: {
    accessTokenTtl: 10 * 60,            // 10 minutes
    refreshTokenTtl: 30 * 24 * 60 * 60, // 30 days
    issuer: 'identity.wavult.com',
    audience: ['wavult-os', 'quixzoom', 'landvex'],
  },

  // Rate limiting
  rateLimit: {
    loginMaxAttempts: 5,
    loginWindowMs: 15 * 60 * 1000,
    ipMaxAttempts: 20,
    ipWindowMs: 60 * 1000,
    apiMaxRequests: 100,
    apiWindowMs: 60 * 1000,
  },

  // Service-to-service auth
  // NOTE: Internal service tokens use issuer 'identity-core-internal'.
  // NEVER reuse user JWTs for service-to-service calls.
  serviceAuth: {
    internalSecret: process.env.INTERNAL_SERVICE_SECRET || '',
    issuer: 'identity-core-internal',
  },
}

// AWS Clients
export const dynamoClient = new DynamoDBClient({ region: REGION })
export const kmsClient = new KMSClient({ region: REGION })
export const sesClient = new SESClient({ region: REGION })
