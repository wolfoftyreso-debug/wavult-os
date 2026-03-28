-- Identity Core — PostgreSQL Schema
-- NEVER hard delete users. Set is_active = false.
-- NEVER grant DELETE on ic_users to application role.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
-- NEVER hard delete. Soft-delete only: is_active = false.
CREATE TABLE IF NOT EXISTS ic_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  password_hash TEXT,           -- Argon2id hash, NULL for magic-link-only users
  full_name TEXT,
  org_id TEXT,                  -- Wavult entity: 'wavult-group' | 'quixzoom' etc
  roles TEXT[] DEFAULT '{}',    -- ['admin', 'cto', 'cfo', 'clo', 'ops']
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  failed_login_count INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  token_version INT DEFAULT 1,  -- Increment to invalidate all tokens immediately
  session_epoch INT DEFAULT 1 NOT NULL,
  state_version INT DEFAULT 1,  -- Optimistic lock: always check before mutating
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  migrated_from TEXT            -- 'supabase' when migrated
);

-- Global state for emergency revocation (token epoch)
-- If ic_global_state.value for 'token_epoch_changed_at' > jwt.iat → reject all tokens
CREATE TABLE IF NOT EXISTS ic_global_state (
  key TEXT PRIMARY KEY,
  value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO ic_global_state (key, value) VALUES ('token_epoch', 0) ON CONFLICT DO NOTHING;
INSERT INTO ic_global_state (key, value) VALUES ('token_epoch_changed_at', 0) ON CONFLICT DO NOTHING;

-- Magic link tokens (short-lived, one-use, 10 minute TTL)
CREATE TABLE IF NOT EXISTS ic_magic_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES ic_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,  -- SHA256 of actual token
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,                  -- IP-bound: only issuing IP may redeem
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT magic_token_expires_after_created CHECK (expires_at > created_at)
  -- TTL: expires_at = created_at + 10 minutes, enforced at application layer
);

-- Audit log (immutable — NEVER UPDATE or DELETE rows)
-- row_checksum = SHA256(event_type || user_id || created_at) for tamper detection
CREATE TABLE IF NOT EXISTS ic_auth_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  event_type TEXT NOT NULL,    -- 'login.success' | 'login.failed' | 'logout' | 'token.refresh' | 'session.revoked'
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,             -- Distributed trace ID, injected per-request
  metadata JSONB DEFAULT '{}',
  row_checksum TEXT,           -- SHA256(event_type || user_id || created_at) — tamper evidence
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ic_users_email ON ic_users(email);
CREATE INDEX IF NOT EXISTS idx_ic_users_org ON ic_users(org_id);
CREATE INDEX IF NOT EXISTS idx_ic_auth_events_user ON ic_auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ic_auth_events_type ON ic_auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ic_auth_events_request ON ic_auth_events(request_id);
CREATE INDEX IF NOT EXISTS idx_ic_magic_tokens_hash ON ic_magic_tokens(token_hash);

-- RLS equivalent — application-level enforcement via middleware
-- Application role MUST NOT have DELETE on ic_users or ic_auth_events
