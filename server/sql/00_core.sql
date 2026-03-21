-- ============================================================================
-- Hypbit OMS Certified Core — Entity + Relation Layer
-- File: 00_core.sql
-- Run: BEFORE deploy_all.sql (step 0) in Supabase (PostgreSQL)
--
-- This file establishes the unified entity registry, cross-entity relations,
-- domain event store, and config-driven state machine definitions.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 entities — Unified entity registry
-- Every domain object (task, deal, NC, etc.) is registered here so that
-- relations, search, and event routing work across the entire system.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,
  entity_type   TEXT        NOT NULL,
    -- Allowed types: 'task', 'deal', 'nc', 'capability', 'document',
    -- 'transaction', 'improvement', 'process', 'risk', 'lead', 'contact',
    -- 'company', 'payout', 'goal', 'decision', 'meeting'
  source_table  TEXT        NOT NULL,   -- actual table name
  source_id     UUID        NOT NULL,   -- PK in the source table
  title         TEXT,
  status        TEXT,
  owner_id      UUID,
  parent_id     UUID        REFERENCES entities(id),
  tags          TEXT[]      DEFAULT '{}',
  metadata      JSONB       DEFAULT '{}',
  search_vector TSVECTOR,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_table, source_id)
);

-- ----------------------------------------------------------------------------
-- 1.2 entity_relations — Cross-entity relationships
-- Directed edges between any two entities with a typed relation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_relations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL,
  from_entity_id  UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id    UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type   TEXT        NOT NULL CHECK (relation_type IN (
                    'CAUSED_BY', 'RESULTED_IN', 'GENERATED',
                    'REQUIRES', 'SATISFIES', 'BELONGS_TO', 'RELATED_TO'
                  )),
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_entity_id, to_entity_id, relation_type)
);

-- ----------------------------------------------------------------------------
-- 1.3 domain_events — Event store for all domain events
-- Append-only log that powers reactive workflows, audit trails, and analytics.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domain_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,
  event_type    TEXT        NOT NULL,   -- e.g. 'task.created', 'deal.won', 'nc.raised'
  entity_id     UUID        REFERENCES entities(id),
  entity_type   TEXT        NOT NULL,
  source_id     UUID,                   -- original row id
  actor_id      UUID,                   -- who triggered it
  payload       JSONB       DEFAULT '{}',
  emitted_at    TIMESTAMPTZ DEFAULT now(),
  processed     BOOLEAN     DEFAULT FALSE
);

-- ----------------------------------------------------------------------------
-- 1.4 state_machine_configs — Config-driven workflow definitions
-- Each entity type has exactly one state machine definition that governs
-- its lifecycle transitions and guard conditions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_machine_configs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT        NOT NULL UNIQUE,
  states        TEXT[]      NOT NULL,
  initial_state TEXT        NOT NULL,
  transitions   JSONB       NOT NULL,   -- [{from, to, guards: [...]}]
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- entities
CREATE INDEX IF NOT EXISTS idx_entities_org_id
  ON entities (org_id);
CREATE INDEX IF NOT EXISTS idx_entities_entity_type
  ON entities (entity_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_source
  ON entities (source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_entities_owner_id
  ON entities (owner_id);
CREATE INDEX IF NOT EXISTS idx_entities_search_vector
  ON entities USING GIN (search_vector);

-- entity_relations
CREATE INDEX IF NOT EXISTS idx_entity_relations_from
  ON entity_relations (from_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_to
  ON entity_relations (to_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_type
  ON entity_relations (relation_type);
CREATE INDEX IF NOT EXISTS idx_entity_relations_org_id
  ON entity_relations (org_id);

-- domain_events
CREATE INDEX IF NOT EXISTS idx_domain_events_org_id
  ON domain_events (org_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_event_type
  ON domain_events (event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_entity_id
  ON domain_events (entity_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_emitted_at
  ON domain_events (emitted_at);
CREATE INDEX IF NOT EXISTS idx_domain_events_processed
  ON domain_events (processed);

-- state_machine_configs
CREATE INDEX IF NOT EXISTS idx_state_machine_configs_entity_type
  ON state_machine_configs (entity_type);


-- ============================================================================
-- 3. FULLTEXT SEARCH — auto-update trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_entity_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.metadata::text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entities_search_vector ON entities;
CREATE TRIGGER trg_entities_search_vector
  BEFORE INSERT OR UPDATE OF title, metadata
  ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_search_vector();


-- ============================================================================
-- 4. AUTO-SYNC TRIGGER — generic entity registration
-- ============================================================================
-- A single trigger function handles INSERT / UPDATE / DELETE on every domain
-- table and keeps the entities registry in sync.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_title       TEXT;
  v_status      TEXT;
  v_org_id      UUID;
  v_owner_id    UUID;
BEGIN
  -- Derive entity_type from the source table name.
  -- Handles plural table names → singular entity type.
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
    ELSE replace(TG_TABLE_NAME, '_', ' ')
  END;

  -- --------------------------------------------------------
  -- DELETE — remove the entity registration
  -- --------------------------------------------------------
  IF TG_OP = 'DELETE' THEN
    DELETE FROM entities
    WHERE source_table = TG_TABLE_NAME
      AND source_id    = OLD.id;
    RETURN OLD;
  END IF;

  -- --------------------------------------------------------
  -- Extract common columns with safe fallbacks
  -- --------------------------------------------------------
  -- title: prefer .title, fall back to .name
  v_title := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'title' THEN (to_jsonb(NEW)->>'title')
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'name'  THEN (to_jsonb(NEW)->>'name')
    ELSE NULL
  END;

  -- status
  v_status := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'status' THEN (to_jsonb(NEW)->>'status')
    ELSE NULL
  END;

  -- org_id
  v_org_id := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'org_id' THEN (to_jsonb(NEW)->>'org_id')::UUID
    ELSE NULL
  END;

  -- owner_id: prefer .owner_id, fall back to .assigned_to
  v_owner_id := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'owner_id'    THEN (to_jsonb(NEW)->>'owner_id')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'assigned_to'  THEN (to_jsonb(NEW)->>'assigned_to')::UUID
    ELSE NULL
  END;

  -- --------------------------------------------------------
  -- INSERT — register a new entity
  -- --------------------------------------------------------
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

  -- --------------------------------------------------------
  -- UPDATE — keep entity row in sync
  -- --------------------------------------------------------
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

-- Attach sync_entity() to every domain table.
-- Using a DO block so the script is idempotent and does not fail if a table
-- has not yet been created (the trigger is simply skipped).

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tasks', 'deals', 'leads', 'contacts', 'companies',
    'non_conformances', 'improvements', 'documents', 'risks',
    'payouts', 'decisions', 'meetings', 'processes'
  ]
  LOOP
    -- Only attach if the table exists in the current schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_sync_entity ON %I', tbl
      );
      EXECUTE format(
        'CREATE TRIGGER trg_sync_entity
           AFTER INSERT OR UPDATE OR DELETE ON %I
           FOR EACH ROW
           EXECUTE FUNCTION sync_entity()', tbl
      );
    END IF;
  END LOOP;
END;
$$;


-- ============================================================================
-- 5. SEED STATE MACHINE CONFIGS
-- ============================================================================

INSERT INTO state_machine_configs (entity_type, states, initial_state, transitions)
VALUES

  -- Deal pipeline
  ('deal',
   ARRAY['NEW','QUALIFIED','DEMO','OFFER','NEGOTIATION','WON','LOST'],
   'NEW',
   '[
     {"from": "NEW",         "to": "QUALIFIED",    "guards": []},
     {"from": "NEW",         "to": "LOST",         "guards": []},
     {"from": "QUALIFIED",   "to": "DEMO",         "guards": []},
     {"from": "QUALIFIED",   "to": "LOST",         "guards": []},
     {"from": "DEMO",        "to": "OFFER",        "guards": []},
     {"from": "DEMO",        "to": "LOST",         "guards": []},
     {"from": "OFFER",       "to": "NEGOTIATION",  "guards": []},
     {"from": "OFFER",       "to": "LOST",         "guards": []},
     {"from": "NEGOTIATION", "to": "WON",          "guards": [{"field": "value", "op": ">", "value": 0}]},
     {"from": "NEGOTIATION", "to": "LOST",         "guards": []}
   ]'::JSONB),

  -- Task workflow
  ('task',
   ARRAY['TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED'],
   'TODO',
   '[
     {"from": "TODO",        "to": "IN_PROGRESS",  "guards": []},
     {"from": "TODO",        "to": "BLOCKED",       "guards": []},
     {"from": "IN_PROGRESS", "to": "REVIEW",        "guards": []},
     {"from": "IN_PROGRESS", "to": "BLOCKED",       "guards": []},
     {"from": "REVIEW",      "to": "DONE",          "guards": []},
     {"from": "REVIEW",      "to": "IN_PROGRESS",   "guards": []},
     {"from": "BLOCKED",     "to": "TODO",          "guards": []},
     {"from": "BLOCKED",     "to": "IN_PROGRESS",   "guards": []}
   ]'::JSONB),

  -- Non-conformance lifecycle
  ('nc',
   ARRAY['OPEN','ANALYZING','ACTION_PLANNED','IMPLEMENTING','VERIFYING','CLOSED'],
   'OPEN',
   '[
     {"from": "OPEN",            "to": "ANALYZING",      "guards": []},
     {"from": "ANALYZING",       "to": "ACTION_PLANNED",  "guards": []},
     {"from": "ACTION_PLANNED",  "to": "IMPLEMENTING",    "guards": []},
     {"from": "IMPLEMENTING",    "to": "VERIFYING",       "guards": []},
     {"from": "VERIFYING",       "to": "CLOSED",          "guards": [{"field": "verified_by", "op": "NOT_NULL"}]},
     {"from": "VERIFYING",       "to": "IMPLEMENTING",    "guards": []}
   ]'::JSONB),

  -- Payout workflow
  ('payout',
   ARRAY['PENDING','APPROVED','PAID','REJECTED'],
   'PENDING',
   '[
     {"from": "PENDING",  "to": "APPROVED", "guards": [{"field": "actor_role", "op": "IN", "value": ["FINANCE","ADMIN"]}]},
     {"from": "PENDING",  "to": "REJECTED", "guards": [{"field": "actor_role", "op": "IN", "value": ["FINANCE","ADMIN"]}]},
     {"from": "APPROVED", "to": "PAID",     "guards": []},
     {"from": "APPROVED", "to": "REJECTED", "guards": []}
   ]'::JSONB),

  -- Improvement (PDCA cycle)
  ('improvement',
   ARRAY['IDEA','APPROVED','PLAN','DO','CHECK','ACT','COMPLETED'],
   'IDEA',
   '[
     {"from": "IDEA",     "to": "APPROVED",  "guards": []},
     {"from": "APPROVED", "to": "PLAN",      "guards": []},
     {"from": "PLAN",     "to": "DO",        "guards": []},
     {"from": "DO",       "to": "CHECK",     "guards": []},
     {"from": "CHECK",    "to": "ACT",       "guards": []},
     {"from": "CHECK",    "to": "DO",        "guards": []},
     {"from": "ACT",      "to": "COMPLETED", "guards": []}
   ]'::JSONB)

ON CONFLICT (entity_type) DO UPDATE SET
  states        = EXCLUDED.states,
  initial_state = EXCLUDED.initial_state,
  transitions   = EXCLUDED.transitions,
  updated_at    = now();


-- ============================================================================
-- 6. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all four tables
ALTER TABLE entities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_machine_configs ENABLE ROW LEVEL SECURITY;

-- ---- entities ----
DROP POLICY IF EXISTS entities_org_isolation ON entities;
CREATE POLICY entities_org_isolation ON entities
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS entities_org_insert ON entities;
CREATE POLICY entities_org_insert ON entities
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ---- entity_relations ----
DROP POLICY IF EXISTS entity_relations_org_isolation ON entity_relations;
CREATE POLICY entity_relations_org_isolation ON entity_relations
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS entity_relations_org_insert ON entity_relations;
CREATE POLICY entity_relations_org_insert ON entity_relations
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ---- domain_events ----
DROP POLICY IF EXISTS domain_events_org_isolation ON domain_events;
CREATE POLICY domain_events_org_isolation ON domain_events
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS domain_events_org_insert ON domain_events;
CREATE POLICY domain_events_org_insert ON domain_events
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ---- state_machine_configs ----
-- State machine configs are system-wide (not org-scoped), so we allow
-- read access to all authenticated users and restrict writes to service role.
DROP POLICY IF EXISTS state_machine_configs_read ON state_machine_configs;
CREATE POLICY state_machine_configs_read ON state_machine_configs
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS state_machine_configs_manage ON state_machine_configs;
CREATE POLICY state_machine_configs_manage ON state_machine_configs
  FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');


-- ============================================================================
-- Done. The Entity + Relation layer is ready.
-- ============================================================================

COMMIT;
