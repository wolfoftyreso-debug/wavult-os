-- Mirror Mode: Import Jobs & Shadow Sync Schema
-- 2026-03-21

-- ─── Import Jobs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_jobs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL,    -- 'automaster' | 'winbas' | 'keyloop' | 'fortnox' | 'generic'
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','rolled_back')),
  total_records     INTEGER DEFAULT 0,
  imported_records  INTEGER DEFAULT 0,
  failed_records    INTEGER DEFAULT 0,
  mapping_config    JSONB DEFAULT '{}',
  error_log         JSONB DEFAULT '[]',
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  rollback_expires_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS import_jobs_org_id_idx    ON import_jobs(org_id);
CREATE INDEX IF NOT EXISTS import_jobs_status_idx    ON import_jobs(status);
CREATE INDEX IF NOT EXISTS import_jobs_created_at_idx ON import_jobs(created_at);

-- ─── Terminology Config ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_terminology (
  org_id            UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  preset            TEXT,     -- 'automaster' | 'winbas' | 'keyloop' | 'default'
  custom_mapping    JSONB DEFAULT '{}',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Shadow Sync Config ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shadow_sync_configs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL,
  sync_direction    TEXT DEFAULT 'pixdrift_to_legacy'
                    CHECK (sync_direction IN ('pixdrift_to_legacy','legacy_to_pixdrift','bidirectional')),
  triggers          TEXT[] DEFAULT '{"work_order.created","work_order.updated"}',
  field_mapping     JSONB DEFAULT '{}',
  legacy_endpoint   TEXT,
  legacy_api_key    TEXT,
  active            BOOLEAN DEFAULT TRUE,
  last_sync_at      TIMESTAMPTZ,
  sync_count        INTEGER DEFAULT 0,
  error_count       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shadow_sync_org_id_idx ON shadow_sync_configs(org_id);
CREATE INDEX IF NOT EXISTS shadow_sync_active_idx  ON shadow_sync_configs(active);

-- ─── Shadow Sync Event Log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shadow_sync_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id         UUID REFERENCES shadow_sync_configs(id) ON DELETE CASCADE,
  trigger_event     TEXT NOT NULL,
  record_id         TEXT NOT NULL,
  status            TEXT DEFAULT 'success' CHECK (status IN ('success','failed','skipped')),
  payload_size_bytes INTEGER DEFAULT 0,
  duration_ms       INTEGER DEFAULT 0,
  error             TEXT,
  timestamp         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shadow_sync_events_config_idx    ON shadow_sync_events(config_id);
CREATE INDEX IF NOT EXISTS shadow_sync_events_timestamp_idx ON shadow_sync_events(timestamp);
CREATE INDEX IF NOT EXISTS shadow_sync_events_status_idx    ON shadow_sync_events(status);

-- Keep only last 90 days of sync events (can be adjusted)
-- Run periodically: DELETE FROM shadow_sync_events WHERE timestamp < NOW() - INTERVAL '90 days';

-- ─── Warranty Audit Trail ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warranty_audit_trail (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id          UUID NOT NULL,
  org_id            UUID REFERENCES organizations(id),
  timestamp         TIMESTAMPTZ DEFAULT NOW(),
  user_id           UUID,
  user_name         TEXT,
  action            TEXT NOT NULL CHECK (action IN ('create','update','submit','export','validate')),
  field_changed     TEXT,
  old_value         TEXT,
  new_value         TEXT,
  reason            TEXT NOT NULL,
  ip_address        INET
);

-- Audit trail is append-only — no UPDATE or DELETE allowed
-- Enforce via RLS or application layer

CREATE INDEX IF NOT EXISTS warranty_audit_claim_id_idx  ON warranty_audit_trail(claim_id);
CREATE INDEX IF NOT EXISTS warranty_audit_timestamp_idx ON warranty_audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS warranty_audit_org_id_idx    ON warranty_audit_trail(org_id);
