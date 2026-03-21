-- ============================================================
-- 33_spaghetti_schema.sql
-- Lean Spaghetti Diagram — Activity Log
-- ============================================================

-- Aktivitetslogg för Lean-analys och spagettidiagram
CREATE TABLE IF NOT EXISTS activity_log (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID          REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID          REFERENCES users(id) ON DELETE CASCADE,
  activity_type   TEXT          NOT NULL,
    -- 'task_start', 'task_complete', 'deal_update', 'meeting',
    -- 'nc_open', 'report_view', 'process_review', 'capability_update', etc.
  module          TEXT          NOT NULL,
    -- 'execution', 'capability', 'process', 'currency', 'reports'
  entity_type     TEXT,         -- 'deal', 'task', 'nc', 'process', 'report', etc.
  entity_id       UUID,
  from_state      TEXT,         -- Föregående tillstånd / föregående modul
  to_state        TEXT,         -- Nytt tillstånd / ny modul
  duration_minutes INTEGER,     -- Tid i denna aktivitet (minuter)
  metadata        JSONB         DEFAULT '{}',
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- Index för effektiv tidsserie-hämtning per användare
CREATE INDEX IF NOT EXISTS idx_activity_log_user
  ON activity_log (user_id, created_at DESC);

-- Index för org-nivå-frågor
CREATE INDEX IF NOT EXISTS idx_activity_log_org
  ON activity_log (org_id, created_at DESC);

-- Index för modulanalys
CREATE INDEX IF NOT EXISTS idx_activity_log_module
  ON activity_log (org_id, module, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Läs: alla i samma org
CREATE POLICY "activity_log_read" ON activity_log
  FOR SELECT USING (
    org_id = (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Skriv: egna rader
CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================
-- Kommentar: Middleware-integration
-- ============================================================
-- Lägg till i befintliga routers efter varje mutation:
--
-- import { supabase } from './supabase';
--
-- async function logActivity(
--   userId: string, orgId: string,
--   activityType: string, module: string,
--   entityType?: string, entityId?: string,
--   fromState?: string, toState?: string,
--   durationMinutes?: number,
--   metadata?: Record<string, unknown>
-- ) {
--   await supabase.from('activity_log').insert({
--     user_id: userId, org_id: orgId,
--     activity_type: activityType, module,
--     entity_type: entityType, entity_id: entityId,
--     from_state: fromState, to_state: toState,
--     duration_minutes: durationMinutes,
--     metadata: metadata ?? {},
--   });
-- }
--
-- Exempel i execution.ts efter deal-update:
--   logActivity(user.id, user.org_id, 'deal_update', 'execution', 'deal', dealId);
