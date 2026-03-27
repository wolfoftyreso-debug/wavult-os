-- ============================================================================
-- Wavult OS — System Event Log (10-year immutable audit store)
-- File: 20_system_event_log.sql
-- Purpose: Every action, command, decision and message that flows through
--          Wavult OS is recorded here. Immutable. Queryable. Forever.
--
-- Retention: 10 years (3650 days). Rows are NEVER deleted — only archived
--            to cold storage (S3 Glacier) after 2 years.
--
-- Key design decisions:
--   - append-only (no UPDATE/DELETE via RLS)
--   - partitioned by month for query performance
--   - full JSONB payload for flexibility
--   - indexed for actor, session, event_type, entity, and time range
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE event_source AS ENUM (
    'bernt',          -- AI agent (Bernt) initiated
    'mobile',         -- Wavult Mobile app
    'web',            -- Wavult OS web dashboard
    'siri',           -- Siri shortcut → Bernt
    'api',            -- Direct API call
    'cron',           -- Scheduled job
    'webhook',        -- External webhook (Stripe, GitHub, etc.)
    'email',          -- Inbound email trigger
    'system'          -- Internal system event
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_category AS ENUM (
    'command',        -- User/AI issued a command ("skicka mail till Dennis")
    'communication',  -- Mail, SMS, Telegram, Siri message sent/received
    'decision',       -- A decision was made (L0/L1/L2 authority)
    'transaction',    -- Financial: invoice, payment, transfer
    'document',       -- Contract, agreement created/signed/updated
    'auth',           -- Login, logout, token refresh
    'deploy',         -- Code deployed, server restarted
    'data_change',    -- Record created/updated in any module
    'error',          -- System error, fallback triggered
    'ai_inference',   -- Bernt made an autonomous decision
    'voice',          -- Voice message recorded/transcribed
    'integration'     -- External system sync (AWS, Supabase, Stripe, etc.)
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 2. MAIN EVENT LOG TABLE (partitioned by month)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_events (
  -- Identity
  id              UUID          DEFAULT gen_random_uuid(),
  org_id          UUID          NOT NULL DEFAULT 'a0000000-0000-0000-0000-000000000001', -- Wavult Group

  -- When
  occurred_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  partition_key   TEXT          GENERATED ALWAYS AS (
                    to_char(occurred_at, 'YYYY-MM')
                  ) STORED,     -- ex: '2026-03', used for partitioning

  -- Who
  actor_id        UUID,         -- user_id or NULL for system
  actor_type      TEXT          NOT NULL DEFAULT 'system',
                                -- 'user', 'bernt', 'system', 'external'
  actor_name      TEXT,         -- "Erik Svensson", "Bernt", "Stripe"
  session_id      TEXT,         -- conversation/request session

  -- What
  source          event_source  NOT NULL DEFAULT 'system',
  category        event_category NOT NULL,
  event_type      TEXT          NOT NULL,
                                -- Namespaced: "bernt.command.sent",
                                -- "mail.outbound.sent", "finance.invoice.created"
  verb            TEXT          NOT NULL,
                                -- Human readable: "sent email", "created invoice"

  -- Context
  entity_type     TEXT,         -- 'mail', 'invoice', 'task', 'booking', etc.
  entity_id       TEXT,         -- ID of affected entity
  entity_title    TEXT,         -- Human readable reference

  -- Payload
  payload         JSONB         NOT NULL DEFAULT '{}',
                                -- Full structured data of what happened
  metadata        JSONB         NOT NULL DEFAULT '{}',
                                -- Device, IP, app version, model used, etc.

  -- Result
  status          TEXT          NOT NULL DEFAULT 'success',
                                -- 'success', 'error', 'pending', 'cancelled'
  error_message   TEXT,
  duration_ms     INTEGER,      -- How long the action took

  -- Traceability
  parent_event_id UUID,         -- If this event was triggered by another
  correlation_id  TEXT,         -- Group related events (one user request → N events)
  idempotency_key TEXT,         -- Prevent duplicate logging

  PRIMARY KEY (id, occurred_at)

) PARTITION BY RANGE (occurred_at);

-- ============================================================================
-- 3. MONTHLY PARTITIONS (pre-create 2026–2028, auto-extend via cron)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_events_2026_01 PARTITION OF system_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS system_events_2026_02 PARTITION OF system_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS system_events_2026_03 PARTITION OF system_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS system_events_2026_04 PARTITION OF system_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS system_events_2026_05 PARTITION OF system_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS system_events_2026_06 PARTITION OF system_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS system_events_2026_07 PARTITION OF system_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS system_events_2026_08 PARTITION OF system_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS system_events_2026_09 PARTITION OF system_events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS system_events_2026_10 PARTITION OF system_events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS system_events_2026_11 PARTITION OF system_events
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS system_events_2026_12 PARTITION OF system_events
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS system_events_2027 PARTITION OF system_events
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE IF NOT EXISTS system_events_2028 PARTITION OF system_events
  FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE IF NOT EXISTS system_events_2029_2036 PARTITION OF system_events
  FOR VALUES FROM ('2029-01-01') TO ('2037-01-01');

-- ============================================================================
-- 4. INDEXES (per partition — inherited automatically)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sysevt_actor
  ON system_events (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sysevt_session
  ON system_events (session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sysevt_type
  ON system_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sysevt_category
  ON system_events (category, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sysevt_entity
  ON system_events (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sysevt_correlation
  ON system_events (correlation_id) WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sysevt_payload
  ON system_events USING gin (payload);

CREATE INDEX IF NOT EXISTS idx_sysevt_partition
  ON system_events (partition_key, occurred_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY — append-only, no updates/deletes
-- ============================================================================

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Service role kan lägga till och läsa
CREATE POLICY system_events_insert ON system_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY system_events_select ON system_events
  FOR SELECT TO service_role USING (true);

-- Authenticated users kan bara läsa sin egen org
CREATE POLICY system_events_select_auth ON system_events
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- INGEN kan uppdatera eller ta bort — immutable log
-- (DELETE/UPDATE policies are absent = denied)

-- ============================================================================
-- 6. HELPER FUNCTION — log_event() för enkel användning
-- ============================================================================

CREATE OR REPLACE FUNCTION log_event(
  p_source        event_source,
  p_category      event_category,
  p_event_type    TEXT,
  p_verb          TEXT,
  p_actor_name    TEXT        DEFAULT NULL,
  p_actor_id      UUID        DEFAULT NULL,
  p_actor_type    TEXT        DEFAULT 'system',
  p_session_id    TEXT        DEFAULT NULL,
  p_entity_type   TEXT        DEFAULT NULL,
  p_entity_id     TEXT        DEFAULT NULL,
  p_entity_title  TEXT        DEFAULT NULL,
  p_payload       JSONB       DEFAULT '{}',
  p_metadata      JSONB       DEFAULT '{}',
  p_status        TEXT        DEFAULT 'success',
  p_error         TEXT        DEFAULT NULL,
  p_duration_ms   INTEGER     DEFAULT NULL,
  p_parent_id     UUID        DEFAULT NULL,
  p_correlation   TEXT        DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO system_events (
    source, category, event_type, verb,
    actor_name, actor_id, actor_type, session_id,
    entity_type, entity_id, entity_title,
    payload, metadata, status, error_message, duration_ms,
    parent_event_id, correlation_id
  ) VALUES (
    p_source, p_category, p_event_type, p_verb,
    p_actor_name, p_actor_id, p_actor_type, p_session_id,
    p_entity_type, p_entity_id, p_entity_title,
    p_payload, p_metadata, p_status, p_error, p_duration_ms,
    p_parent_id, p_correlation
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. VIEW — Senaste 1000 händelser (för dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW recent_events AS
SELECT
  id,
  occurred_at,
  actor_name,
  actor_type,
  source,
  category,
  event_type,
  verb,
  entity_type,
  entity_title,
  status,
  duration_ms,
  correlation_id,
  payload->>'summary' AS summary
FROM system_events
ORDER BY occurred_at DESC
LIMIT 1000;

-- ============================================================================
-- 8. MATERIALIZED VIEW — Daglig aktivitetssammanfattning
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_activity_summary AS
SELECT
  date_trunc('day', occurred_at)  AS day,
  actor_name,
  source,
  category,
  count(*)                        AS event_count,
  count(*) FILTER (WHERE status = 'error') AS error_count,
  avg(duration_ms)                AS avg_duration_ms
FROM system_events
WHERE occurred_at > now() - interval '90 days'
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_summary
  ON daily_activity_summary (day, actor_name, source, category);

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
/*

-- Logga ett röstkommando från Bernt:
SELECT log_event(
  'bernt', 'voice', 'bernt.voice.received', 'received voice command',
  p_actor_name := 'Erik Svensson',
  p_session_id := 'sess_abc123',
  p_payload := '{"transcript": "Skicka mail till Dennis om Thailand", "duration_s": 4}'
);

-- Logga ett utgående mail:
SELECT log_event(
  'bernt', 'communication', 'mail.outbound.sent', 'sent email',
  p_actor_name := 'Bernt',
  p_actor_type := 'bernt',
  p_entity_type := 'mail',
  p_entity_title := 'Thailand workcamp — boende',
  p_payload := '{"to": "dennis@hypbit.com", "subject": "Thailand workcamp", "bcc": "erik@hypbit.com"}'
);

-- Hämta allt Erik gjort idag:
SELECT occurred_at, verb, entity_title, source
FROM system_events
WHERE actor_name = 'Erik Svensson'
  AND occurred_at > current_date
ORDER BY occurred_at DESC;

-- Hämta allt Bernt gjort den senaste veckan:
SELECT occurred_at, event_type, verb, payload->>'summary'
FROM system_events
WHERE source = 'bernt'
  AND occurred_at > now() - interval '7 days'
ORDER BY occurred_at DESC;

*/
