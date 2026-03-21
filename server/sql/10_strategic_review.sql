-- ============================================================================
-- Hypbit OMS — AI-driven Strategic Review Engine
-- File: 10_strategic_review.sql
-- Run: AFTER 00_core.sql in Supabase (PostgreSQL)
--
-- Tables for strategic reviews, data snapshots, AI recommendations,
-- goal tracking, attendees, and action items.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 strategic_reviews — Top-level review sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategic_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL,
  review_type     TEXT        NOT NULL CHECK (review_type IN (
                    'ANNUAL_STRATEGY', 'QUARTERLY_REVIEW',
                    'MONTHLY_FOLLOWUP', 'EXTRAORDINARY'
                  )),
  period_from     DATE        NOT NULL,
  period_to       DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'PREPARING' CHECK (status IN (
                    'PREPARING', 'AI_ANALYZING', 'READY_FOR_REVIEW',
                    'IN_SESSION', 'DECISIONS_PENDING', 'COMPLETED'
                  )),
  led_by          UUID,
  scheduled_date  DATE,
  completed_at    TIMESTAMPTZ,
  summary         TEXT,
  ai_analysis     JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 review_data_snapshots — Point-in-time data per domain
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_data_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID        NOT NULL REFERENCES strategic_reviews(id) ON DELETE CASCADE,
  data_domain     TEXT        NOT NULL CHECK (data_domain IN (
                    'KPI', 'PIPELINE', 'FINANCIALS', 'NC', 'IMPROVEMENTS',
                    'CAPABILITIES', 'RISKS', 'COMPLIANCE', 'GOALS',
                    'PROCESSES', 'TEAM_STATUS'
                  )),
  snapshot_data   JSONB       DEFAULT '{}',
  trend_data      JSONB       DEFAULT '{}',
  ai_insights     JSONB       DEFAULT '{}',
  collected_at    TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 review_recommendations — AI-generated & human-decided recommendations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_recommendations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id             UUID        NOT NULL REFERENCES strategic_reviews(id) ON DELETE CASCADE,
  category              TEXT        NOT NULL CHECK (category IN (
                          'GOAL_SETTING', 'GOAL_ADJUSTMENT', 'RESOURCE_ALLOCATION',
                          'RISK_MITIGATION', 'CAPABILITY_INVESTMENT',
                          'PROCESS_IMPROVEMENT', 'COMPLIANCE_ACTION',
                          'FINANCIAL_ACTION', 'ORGANIZATIONAL_CHANGE'
                        )),
  priority              INTEGER     NOT NULL CHECK (priority >= 1 AND priority <= 5),
  title                 TEXT        NOT NULL,
  analysis              TEXT,
  recommendation        TEXT,
  supporting_data       JSONB       DEFAULT '{}',
  estimated_impact      TEXT,
  estimated_effort      TEXT,
  status                TEXT        NOT NULL DEFAULT 'PROPOSED' CHECK (status IN (
                          'PROPOSED', 'ACCEPTED', 'REJECTED', 'DEFERRED'
                        )),
  decision_rationale    TEXT,
  decided_by            UUID,
  decided_at            TIMESTAMPTZ,
  resulting_entity_type TEXT,
  resulting_entity_id   UUID,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 review_goals — Goal actions decided during a review
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_goals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID        NOT NULL REFERENCES strategic_reviews(id) ON DELETE CASCADE,
  goal_id         UUID,
  action          TEXT        NOT NULL CHECK (action IN (
                    'CREATE', 'ADJUST_TARGET', 'ADJUST_TIMELINE',
                    'CLOSE_ACHIEVED', 'CLOSE_MISSED',
                    'DEPRIORITIZE', 'ESCALATE'
                  )),
  previous_value  JSONB       DEFAULT '{}',
  new_value       JSONB       DEFAULT '{}',
  rationale       TEXT,
  decided_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.5 review_attendees — Who participates in each review
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_attendees (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID        NOT NULL REFERENCES strategic_reviews(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL,
  role_in_review  TEXT        NOT NULL CHECK (role_in_review IN (
                    'CHAIR', 'PRESENTER', 'PARTICIPANT', 'OBSERVER'
                  )),
  prepared        BOOLEAN     DEFAULT false,
  notes           TEXT
);

-- ----------------------------------------------------------------------------
-- 1.6 review_action_items — Concrete follow-up actions from reviews
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_action_items (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id                 UUID        NOT NULL REFERENCES strategic_reviews(id) ON DELETE CASCADE,
  title                     TEXT        NOT NULL,
  description               TEXT,
  responsible_id            UUID,
  deadline                  DATE,
  priority                  INTEGER,
  linked_recommendation_id  UUID        REFERENCES review_recommendations(id),
  linked_task_id            UUID,
  linked_improvement_id     UUID,
  linked_goal_id            UUID,
  status                    TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                              'PENDING', 'IN_PROGRESS', 'COMPLETED',
                              'OVERDUE', 'CANCELLED'
                            )),
  completed_at              TIMESTAMPTZ,
  verification_notes        TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- strategic_reviews
CREATE INDEX IF NOT EXISTS idx_strategic_reviews_org_id
  ON strategic_reviews (org_id);
CREATE INDEX IF NOT EXISTS idx_strategic_reviews_status
  ON strategic_reviews (status);
CREATE INDEX IF NOT EXISTS idx_strategic_reviews_review_type
  ON strategic_reviews (review_type);
CREATE INDEX IF NOT EXISTS idx_strategic_reviews_scheduled_date
  ON strategic_reviews (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_strategic_reviews_period
  ON strategic_reviews (period_from, period_to);

-- review_data_snapshots
CREATE INDEX IF NOT EXISTS idx_review_data_snapshots_review_id
  ON review_data_snapshots (review_id);
CREATE INDEX IF NOT EXISTS idx_review_data_snapshots_domain
  ON review_data_snapshots (data_domain);

-- review_recommendations
CREATE INDEX IF NOT EXISTS idx_review_recommendations_review_id
  ON review_recommendations (review_id);
CREATE INDEX IF NOT EXISTS idx_review_recommendations_status
  ON review_recommendations (status);
CREATE INDEX IF NOT EXISTS idx_review_recommendations_category
  ON review_recommendations (category);

-- review_goals
CREATE INDEX IF NOT EXISTS idx_review_goals_review_id
  ON review_goals (review_id);
CREATE INDEX IF NOT EXISTS idx_review_goals_goal_id
  ON review_goals (goal_id);

-- review_attendees
CREATE INDEX IF NOT EXISTS idx_review_attendees_review_id
  ON review_attendees (review_id);
CREATE INDEX IF NOT EXISTS idx_review_attendees_user_id
  ON review_attendees (user_id);

-- review_action_items
CREATE INDEX IF NOT EXISTS idx_review_action_items_review_id
  ON review_action_items (review_id);
CREATE INDEX IF NOT EXISTS idx_review_action_items_status
  ON review_action_items (status);
CREATE INDEX IF NOT EXISTS idx_review_action_items_responsible_id
  ON review_action_items (responsible_id);
CREATE INDEX IF NOT EXISTS idx_review_action_items_deadline
  ON review_action_items (deadline);


-- ============================================================================
-- 3. ENTITY SYNC TRIGGER for strategic_reviews
-- ============================================================================

-- Extend the sync_entity function mapping to include strategic_reviews
-- The generic sync_entity() function uses ELSE replace(TG_TABLE_NAME, '_', ' ')
-- which would produce 'strategic reviews'. We add an explicit mapping.

-- First, update the sync_entity function to handle strategic_reviews
CREATE OR REPLACE FUNCTION sync_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_title       TEXT;
  v_status      TEXT;
  v_org_id      UUID;
  v_owner_id    UUID;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'tasks'              THEN 'task'
    WHEN 'deals'              THEN 'deal'
    WHEN 'leads'              THEN 'lead'
    WHEN 'contacts'           THEN 'contact'
    WHEN 'companies'          THEN 'company'
    WHEN 'non_conformances'   THEN 'nc'
    WHEN 'improvements'       THEN 'improvement'
    WHEN 'documents'          THEN 'document'
    WHEN 'risks'              THEN 'risk'
    WHEN 'payouts'            THEN 'payout'
    WHEN 'decisions'          THEN 'decision'
    WHEN 'meetings'           THEN 'meeting'
    WHEN 'processes'          THEN 'process'
    WHEN 'strategic_reviews'  THEN 'strategic_review'
    ELSE replace(TG_TABLE_NAME, '_', ' ')
  END;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM entities
    WHERE source_table = TG_TABLE_NAME
      AND source_id    = OLD.id;
    RETURN OLD;
  END IF;

  v_title := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'title' THEN (to_jsonb(NEW)->>'title')
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'name'  THEN (to_jsonb(NEW)->>'name')
    ELSE NULL
  END;

  v_status := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'status' THEN (to_jsonb(NEW)->>'status')
    ELSE NULL
  END;

  v_org_id := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'org_id' THEN (to_jsonb(NEW)->>'org_id')::UUID
    ELSE NULL
  END;

  v_owner_id := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'owner_id'    THEN (to_jsonb(NEW)->>'owner_id')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'assigned_to'  THEN (to_jsonb(NEW)->>'assigned_to')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'led_by'       THEN (to_jsonb(NEW)->>'led_by')::UUID
    ELSE NULL
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO entities (
      org_id, entity_type, source_table, source_id,
      title, status, owner_id
    ) VALUES (
      v_org_id, v_entity_type, TG_TABLE_NAME, NEW.id,
      v_title, v_status, v_owner_id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE entities SET
      title      = v_title,
      status     = v_status,
      owner_id   = v_owner_id,
      updated_at = now()
    WHERE source_table = TG_TABLE_NAME
      AND source_id    = NEW.id;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach sync_entity trigger to strategic_reviews
DROP TRIGGER IF EXISTS trg_sync_entity ON strategic_reviews;
CREATE TRIGGER trg_sync_entity
  AFTER INSERT OR UPDATE OR DELETE ON strategic_reviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_entity();


-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE strategic_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_data_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_recommendations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_attendees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_action_items     ENABLE ROW LEVEL SECURITY;

-- strategic_reviews
DROP POLICY IF EXISTS strategic_reviews_org_isolation ON strategic_reviews;
CREATE POLICY strategic_reviews_org_isolation ON strategic_reviews
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS strategic_reviews_org_insert ON strategic_reviews;
CREATE POLICY strategic_reviews_org_insert ON strategic_reviews
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- review_data_snapshots (org isolation via review_id join)
DROP POLICY IF EXISTS review_data_snapshots_org_isolation ON review_data_snapshots;
CREATE POLICY review_data_snapshots_org_isolation ON review_data_snapshots
  USING (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS review_data_snapshots_org_insert ON review_data_snapshots;
CREATE POLICY review_data_snapshots_org_insert ON review_data_snapshots
  FOR INSERT
  WITH CHECK (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- review_recommendations
DROP POLICY IF EXISTS review_recommendations_org_isolation ON review_recommendations;
CREATE POLICY review_recommendations_org_isolation ON review_recommendations
  USING (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS review_recommendations_org_insert ON review_recommendations;
CREATE POLICY review_recommendations_org_insert ON review_recommendations
  FOR INSERT
  WITH CHECK (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- review_goals
DROP POLICY IF EXISTS review_goals_org_isolation ON review_goals;
CREATE POLICY review_goals_org_isolation ON review_goals
  USING (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS review_goals_org_insert ON review_goals;
CREATE POLICY review_goals_org_insert ON review_goals
  FOR INSERT
  WITH CHECK (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- review_attendees
DROP POLICY IF EXISTS review_attendees_org_isolation ON review_attendees;
CREATE POLICY review_attendees_org_isolation ON review_attendees
  USING (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS review_attendees_org_insert ON review_attendees;
CREATE POLICY review_attendees_org_insert ON review_attendees
  FOR INSERT
  WITH CHECK (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- review_action_items
DROP POLICY IF EXISTS review_action_items_org_isolation ON review_action_items;
CREATE POLICY review_action_items_org_isolation ON review_action_items
  USING (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS review_action_items_org_insert ON review_action_items;
CREATE POLICY review_action_items_org_insert ON review_action_items
  FOR INSERT
  WITH CHECK (review_id IN (
    SELECT id FROM strategic_reviews
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));


-- ============================================================================
-- 5. STATE MACHINE CONFIG for strategic_review
-- ============================================================================

INSERT INTO state_machine_configs (entity_type, states, initial_state, transitions)
VALUES (
  'strategic_review',
  ARRAY['PREPARING', 'AI_ANALYZING', 'READY_FOR_REVIEW', 'IN_SESSION', 'DECISIONS_PENDING', 'COMPLETED'],
  'PREPARING',
  '[
    {"from": "PREPARING",         "to": "AI_ANALYZING",      "guards": []},
    {"from": "AI_ANALYZING",      "to": "READY_FOR_REVIEW",  "guards": []},
    {"from": "READY_FOR_REVIEW",  "to": "IN_SESSION",        "guards": []},
    {"from": "IN_SESSION",        "to": "DECISIONS_PENDING",  "guards": []},
    {"from": "IN_SESSION",        "to": "COMPLETED",          "guards": []},
    {"from": "DECISIONS_PENDING", "to": "COMPLETED",          "guards": []}
  ]'::JSONB
)
ON CONFLICT (entity_type) DO UPDATE SET
  states        = EXCLUDED.states,
  initial_state = EXCLUDED.initial_state,
  transitions   = EXCLUDED.transitions,
  updated_at    = now();


-- ============================================================================
-- Done. Strategic Review Engine tables are ready.
-- ============================================================================

COMMIT;
