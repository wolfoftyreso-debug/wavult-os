"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.getDb = getDb;
exports.testConnection = testConnection;
exports.initSchema = initSchema;
const pg_1 = require("pg");
const config_1 = require("../config");
exports.db = new pg_1.Pool(config_1.config.db);
/** Alias for route-level access — returns the shared pool */
function getDb() { return exports.db; }
exports.db.on('error', (err) => {
    console.error('[DB] Unexpected error:', err);
});
async function testConnection() {
    try {
        await exports.db.query('SELECT 1');
        return true;
    }
    catch {
        return false;
    }
}
async function initSchema() {
    const schemaSQL = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS ic_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      email_verified BOOLEAN DEFAULT false,
      password_hash TEXT,
      full_name TEXT,
      org_id TEXT,
      roles TEXT[] DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      token_version INT DEFAULT 1 NOT NULL,
      session_epoch INT DEFAULT 1 NOT NULL,
      state_version INT DEFAULT 1 NOT NULL,
      failed_login_count INT DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_login_at TIMESTAMPTZ,
      migrated_from TEXT
    );

    CREATE TABLE IF NOT EXISTS ic_auth_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      request_id TEXT,
      metadata JSONB DEFAULT '{}',
      row_checksum TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ic_magic_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES ic_users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
      used_at TIMESTAMPTZ,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ic_global_state (
      key TEXT PRIMARY KEY,
      value INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO ic_global_state (key, value) VALUES ('token_epoch', 0), ('token_epoch_changed_at', 0) ON CONFLICT DO NOTHING;

    -- MFA columns (idempotent ALTER TABLE)
    ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
    ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
    ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_secret_pending TEXT;
    ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT;
    ALTER TABLE ic_users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

    -- Extended audit log for compliance (NIS2 / Landvex)
    -- ic_auth_events already exists; ic_auth_audit adds richer fields
    CREATE TABLE IF NOT EXISTS ic_auth_audit (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID,
      event_type TEXT NOT NULL,
      -- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, MFA_SETUP, MFA_ENABLED,
      -- MFA_VERIFIED, MFA_FAILED, PASSWORD_CHANGE, ACCOUNT_LOCKED,
      -- TOKEN_REFRESH, SESSION_REVOKED, SUSPICIOUS_LOGIN
      ip_address TEXT,
      user_agent TEXT,
      country_code TEXT,
      success BOOLEAN NOT NULL DEFAULT true,
      error_code TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ic_users_email ON ic_users(email);
    CREATE INDEX IF NOT EXISTS idx_ic_auth_events_user ON ic_auth_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_ic_auth_audit_user ON ic_auth_audit(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ic_auth_audit_event ON ic_auth_audit(event_type, created_at DESC);

    -- ── wavult operational schema ─────────────────────────────────────────────
    CREATE SCHEMA IF NOT EXISTS wavult;

    -- quiXzoom tables
    CREATE TABLE IF NOT EXISTS wavult.missions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      location TEXT NOT NULL,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      reward INTEGER NOT NULL DEFAULT 85,
      currency TEXT NOT NULL DEFAULT 'SEK',
      category TEXT DEFAULT 'inspection',
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','accepted','in_progress','submitted','approved','rejected','cancelled')),
      zoomer_id UUID,
      client_id UUID,
      entity TEXT DEFAULT 'QuiXzoom UAB',
      images TEXT[],
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS wavult.zoomers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active','inactive','pending','suspended')),
      missions_completed INTEGER DEFAULT 0,
      total_earnings INTEGER DEFAULT 0,
      rating DOUBLE PRECISION,
      bio TEXT,
      profile_image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wavult.mission_submissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mission_id UUID REFERENCES wavult.missions(id),
      zoomer_id UUID REFERENCES wavult.zoomers(id),
      images TEXT[] NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Landvex tables
    CREATE TABLE IF NOT EXISTS wavult.landvex_clients (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      org_nr TEXT,
      type TEXT DEFAULT 'municipality',
      contact_email TEXT,
      contact_phone TEXT,
      contract_start DATE,
      contract_end DATE,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wavult.landvex_objects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      municipality TEXT NOT NULL,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      status TEXT DEFAULT 'ok' CHECK (status IN ('ok','monitoring','alert','critical')),
      client_id UUID REFERENCES wavult.landvex_clients(id),
      last_inspected TIMESTAMPTZ,
      inspection_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wavult.landvex_alerts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      object_id UUID REFERENCES wavult.landvex_objects(id),
      severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
      message TEXT NOT NULL,
      source TEXT DEFAULT 'system',
      acknowledged BOOLEAN DEFAULT false,
      resolved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- BOS tables
    CREATE TABLE IF NOT EXISTS wavult.bos_tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      state TEXT DEFAULT 'PENDING',
      priority TEXT DEFAULT 'medium',
      owner TEXT,
      deadline DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wavult.bos_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_type TEXT NOT NULL,
      job_id UUID,
      payload JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wavult.bos_jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      payload JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for wavult schema
    CREATE INDEX IF NOT EXISTS idx_wavult_missions_status ON wavult.missions(status);
    CREATE INDEX IF NOT EXISTS idx_wavult_missions_created ON wavult.missions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wavult_zoomers_email ON wavult.zoomers(email);
    CREATE INDEX IF NOT EXISTS idx_wavult_landvex_objects_municipality ON wavult.landvex_objects(municipality);
    CREATE INDEX IF NOT EXISTS idx_wavult_landvex_alerts_object ON wavult.landvex_alerts(object_id, created_at DESC);
  `;
    try {
        await exports.db.query(schemaSQL);
        console.log('[DB] Schema initialized successfully');
    }
    catch (err) {
        console.error('[DB] Schema initialization failed:', err);
        throw err;
    }
}
