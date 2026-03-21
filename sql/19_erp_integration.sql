-- ============================================================================
-- Hypbit OMS — ERP Integration Layer
-- File: 19_erp_integration.sql
-- Run: AFTER 18_localization.sql in Supabase (PostgreSQL)
--
-- Complete integration schema for connecting to external ERP systems
-- (SAP, Oracle, Dynamics 365, IFS, Visma, Fortnox, Sage, NetSuite, Odoo, etc.)
-- Provides connectors, field mappings, sync logging, webhook handling,
-- async queue processing, and external reference tracking.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 integration_connectors — External ERP/API connection configurations
-- Each connector represents a single integration endpoint with auth, sync
-- direction, and module configuration.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_connectors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL,
  name             TEXT        NOT NULL,
  system_type      TEXT        NOT NULL CHECK (system_type IN (
                     'SAP', 'ORACLE', 'DYNAMICS_365', 'IFS', 'VISMA',
                     'FORTNOX', 'SAGE', 'NETSUITE', 'ODOO',
                     'CUSTOM_ERP', 'CUSTOM_API'
                   )),
  status           TEXT        NOT NULL DEFAULT 'CONFIGURED' CHECK (status IN (
                     'CONFIGURED', 'TESTING', 'ACTIVE', 'PAUSED', 'ERROR'
                   )),
  base_url         TEXT,
  auth_type        TEXT        CHECK (auth_type IN (
                     'API_KEY', 'OAUTH2', 'BASIC', 'CERTIFICATE', 'SAP_RFC'
                   )),
  auth_config      JSONB       DEFAULT '{}',
  sync_direction   TEXT        CHECK (sync_direction IN (
                     'INBOUND', 'OUTBOUND', 'BIDIRECTIONAL'
                   )),
  modules_enabled  TEXT[]      DEFAULT '{}',
  last_sync_at     TIMESTAMPTZ,
  last_error       TEXT,
  error_count      INTEGER     DEFAULT 0,
  retry_after      TIMESTAMPTZ,
  webhook_secret   TEXT,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 integration_mappings — Per-connector field mapping rules
-- Maps certified entity fields to external system fields with optional
-- transform logic and directionality.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_mappings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id      UUID        NOT NULL REFERENCES integration_connectors(id),
  certified_entity  TEXT        NOT NULL,
  certified_field   TEXT        NOT NULL,
  external_entity   TEXT        NOT NULL,
  external_field    TEXT        NOT NULL,
  transform         JSONB       DEFAULT '{}',
  direction         TEXT        CHECK (direction IN (
                      'INBOUND', 'OUTBOUND', 'BIDIRECTIONAL'
                    )),
  is_required       BOOLEAN     DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 integration_sync_log — Immutable sync event log
-- Append-only audit trail of every sync operation. Updates and deletes
-- are blocked by trigger.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_sync_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id      UUID,
  sync_type         TEXT        CHECK (sync_type IN (
                      'FULL', 'INCREMENTAL', 'WEBHOOK', 'MANUAL'
                    )),
  direction         TEXT        CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  entity_type       TEXT,
  entity_id         UUID,
  external_id       TEXT,
  status            TEXT        CHECK (status IN (
                      'SUCCESS', 'FAILED', 'SKIPPED', 'CONFLICT'
                    )),
  request_payload   JSONB,
  response_payload  JSONB,
  error_message     TEXT,
  duration_ms       INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 external_references — Linking certified entities to external records
-- Tracks the foreign key relationship between internal and external systems
-- with sync status and metadata.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS external_references (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID        NOT NULL,
  connector_id            UUID        NOT NULL REFERENCES integration_connectors(id),
  certified_entity_type   TEXT        NOT NULL,
  certified_entity_id     UUID        NOT NULL,
  external_system         TEXT        NOT NULL,
  external_entity_type    TEXT        NOT NULL,
  external_id             TEXT        NOT NULL,
  external_url            TEXT,
  last_synced_at          TIMESTAMPTZ,
  sync_status             TEXT        DEFAULT 'SYNCED' CHECK (sync_status IN (
                            'SYNCED', 'PENDING', 'CONFLICT', 'ERROR'
                          )),
  metadata                JSONB       DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, connector_id, certified_entity_type, certified_entity_id)
);

-- ----------------------------------------------------------------------------
-- 1.5 integration_webhooks — Inbound webhook endpoint registry
-- Defines which events a connector listens for and tracks receive stats.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id      UUID        NOT NULL REFERENCES integration_connectors(id),
  event_type        TEXT        NOT NULL,
  endpoint_path     TEXT        NOT NULL,
  is_active         BOOLEAN     DEFAULT true,
  secret_hash       TEXT,
  last_received_at  TIMESTAMPTZ,
  receive_count     INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.6 integration_queue — Async outbound/inbound event queue
-- Reliable message queue with retry logic, dead-lettering, and status
-- tracking for integration events.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_queue (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id   UUID        NOT NULL REFERENCES integration_connectors(id),
  direction      TEXT        DEFAULT 'OUTBOUND',
  event_type     TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  status         TEXT        DEFAULT 'PENDING' CHECK (status IN (
                   'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER'
                 )),
  attempts       INTEGER     DEFAULT 0,
  max_attempts   INTEGER     DEFAULT 5,
  next_retry_at  TIMESTAMPTZ,
  last_error     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  processed_at   TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 1.7 integration_mapping_templates — Predefined mapping templates per ERP
-- Reference table of standard field mappings for each supported ERP system.
-- Used to bootstrap new connector configurations.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_mapping_templates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type       TEXT        NOT NULL,
  certified_entity  TEXT        NOT NULL,
  certified_field   TEXT        NOT NULL,
  external_entity   TEXT        NOT NULL,
  external_field    TEXT        NOT NULL,
  transform         JSONB       DEFAULT '{}',
  direction         TEXT        DEFAULT 'BIDIRECTIONAL'
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- integration_connectors
CREATE INDEX IF NOT EXISTS idx_integration_connectors_org
  ON integration_connectors(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_system_type
  ON integration_connectors(system_type);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_status
  ON integration_connectors(status);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_created_by
  ON integration_connectors(created_by);

-- integration_mappings
CREATE INDEX IF NOT EXISTS idx_integration_mappings_connector
  ON integration_mappings(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_entity
  ON integration_mappings(certified_entity);

-- integration_sync_log
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_connector
  ON integration_sync_log(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_entity
  ON integration_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_status
  ON integration_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_created
  ON integration_sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_external
  ON integration_sync_log(external_id);

-- external_references
CREATE INDEX IF NOT EXISTS idx_external_references_org
  ON external_references(org_id);
CREATE INDEX IF NOT EXISTS idx_external_references_connector
  ON external_references(connector_id);
CREATE INDEX IF NOT EXISTS idx_external_references_entity
  ON external_references(certified_entity_type, certified_entity_id);
CREATE INDEX IF NOT EXISTS idx_external_references_external
  ON external_references(external_system, external_id);
CREATE INDEX IF NOT EXISTS idx_external_references_sync_status
  ON external_references(sync_status);

-- integration_webhooks
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_connector
  ON integration_webhooks(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_event_type
  ON integration_webhooks(event_type);

-- integration_queue
CREATE INDEX IF NOT EXISTS idx_integration_queue_connector
  ON integration_queue(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_queue_status
  ON integration_queue(status);
CREATE INDEX IF NOT EXISTS idx_integration_queue_next_retry
  ON integration_queue(next_retry_at)
  WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX IF NOT EXISTS idx_integration_queue_direction
  ON integration_queue(direction);

-- integration_mapping_templates
CREATE INDEX IF NOT EXISTS idx_integration_mapping_templates_system
  ON integration_mapping_templates(system_type);
CREATE INDEX IF NOT EXISTS idx_integration_mapping_templates_entity
  ON integration_mapping_templates(certified_entity);


-- ============================================================================
-- 3. IMMUTABILITY TRIGGER — integration_sync_log
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_sync_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'integration_sync_log is immutable: % operations are not permitted', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_sync_log_update ON integration_sync_log;
CREATE TRIGGER trg_prevent_sync_log_update
  BEFORE UPDATE ON integration_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sync_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_sync_log_delete ON integration_sync_log;
CREATE TRIGGER trg_prevent_sync_log_delete
  BEFORE DELETE ON integration_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sync_log_mutation();


-- ============================================================================
-- 4. ENTITY SYNC TRIGGER — integration_connectors
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sync_entity ON integration_connectors;
CREATE TRIGGER trg_sync_entity
  AFTER INSERT OR UPDATE OR DELETE ON integration_connectors
  FOR EACH ROW
  EXECUTE FUNCTION sync_entity();


-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE integration_connectors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_mappings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_references          ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_queue            ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_mapping_templates ENABLE ROW LEVEL SECURITY;

-- integration_connectors (org isolation)
DROP POLICY IF EXISTS connectors_org_isolation ON integration_connectors;
CREATE POLICY connectors_org_isolation ON integration_connectors
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS connectors_org_insert ON integration_connectors;
CREATE POLICY connectors_org_insert ON integration_connectors
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- integration_mappings (org isolation via connector_id join)
DROP POLICY IF EXISTS mappings_org_isolation ON integration_mappings;
CREATE POLICY mappings_org_isolation ON integration_mappings
  USING (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS mappings_org_insert ON integration_mappings;
CREATE POLICY mappings_org_insert ON integration_mappings
  FOR INSERT
  WITH CHECK (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- integration_sync_log (org isolation via connector_id join)
DROP POLICY IF EXISTS sync_log_org_isolation ON integration_sync_log;
CREATE POLICY sync_log_org_isolation ON integration_sync_log
  USING (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS sync_log_org_insert ON integration_sync_log;
CREATE POLICY sync_log_org_insert ON integration_sync_log
  FOR INSERT
  WITH CHECK (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- external_references (org isolation)
DROP POLICY IF EXISTS ext_refs_org_isolation ON external_references;
CREATE POLICY ext_refs_org_isolation ON external_references
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS ext_refs_org_insert ON external_references;
CREATE POLICY ext_refs_org_insert ON external_references
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- integration_webhooks (org isolation via connector_id join)
DROP POLICY IF EXISTS webhooks_org_isolation ON integration_webhooks;
CREATE POLICY webhooks_org_isolation ON integration_webhooks
  USING (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS webhooks_org_insert ON integration_webhooks;
CREATE POLICY webhooks_org_insert ON integration_webhooks
  FOR INSERT
  WITH CHECK (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- integration_queue (org isolation via connector_id join)
DROP POLICY IF EXISTS queue_org_isolation ON integration_queue;
CREATE POLICY queue_org_isolation ON integration_queue
  USING (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS queue_org_insert ON integration_queue;
CREATE POLICY queue_org_insert ON integration_queue
  FOR INSERT
  WITH CHECK (connector_id IN (
    SELECT id FROM integration_connectors
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- integration_mapping_templates (read-only for all authenticated users)
DROP POLICY IF EXISTS templates_read_all ON integration_mapping_templates;
CREATE POLICY templates_read_all ON integration_mapping_templates
  FOR SELECT
  USING (true);


-- ============================================================================
-- 6. SEED DATA — Predefined Mapping Templates
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 SAP mappings
-- ----------------------------------------------------------------------------
INSERT INTO integration_mapping_templates (system_type, certified_entity, certified_field, external_entity, external_field, transform, direction)
VALUES
  -- companies <-> BusinessPartner
  ('SAP', 'companies', 'name',    'BusinessPartner', 'CardName', '{}', 'BIDIRECTIONAL'),
  ('SAP', 'companies', 'website', 'BusinessPartner', 'Website',  '{}', 'BIDIRECTIONAL'),
  ('SAP', 'companies', 'country', 'BusinessPartner', 'Country',  '{}', 'BIDIRECTIONAL'),
  -- non_conformances <-> QualityNotification
  ('SAP', 'non_conformances', 'description', 'QualityNotification', 'Description', '{}', 'BIDIRECTIONAL'),
  ('SAP', 'non_conformances', 'priority',    'QualityNotification', 'Priority',    '{}', 'BIDIRECTIONAL'),
  ('SAP', 'non_conformances', 'status',      'QualityNotification', 'Status',      '{}', 'BIDIRECTIONAL'),
  -- transactions <-> JournalEntry
  ('SAP', 'transactions', 'account', 'JournalEntry', 'Account', '{}', 'BIDIRECTIONAL'),
  ('SAP', 'transactions', 'debit',   'JournalEntry', 'Debit',   '{}', 'BIDIRECTIONAL'),
  ('SAP', 'transactions', 'credit',  'JournalEntry', 'Credit',  '{}', 'BIDIRECTIONAL');

-- ----------------------------------------------------------------------------
-- 6.2 Fortnox mappings
-- ----------------------------------------------------------------------------
INSERT INTO integration_mapping_templates (system_type, certified_entity, certified_field, external_entity, external_field, transform, direction)
VALUES
  -- companies <-> Customers
  ('FORTNOX', 'companies', 'name',         'Customers', 'Name',        '{}', 'BIDIRECTIONAL'),
  ('FORTNOX', 'companies', 'website',      'Customers', 'WWW',         '{}', 'BIDIRECTIONAL'),
  ('FORTNOX', 'companies', 'country_code', 'Customers', 'CountryCode', '{}', 'BIDIRECTIONAL'),
  -- transactions <-> Vouchers
  ('FORTNOX', 'transactions', 'account', 'Vouchers', 'Account', '{}', 'BIDIRECTIONAL'),
  ('FORTNOX', 'transactions', 'debit',   'Vouchers', 'Debit',   '{}', 'BIDIRECTIONAL'),
  ('FORTNOX', 'transactions', 'credit',  'Vouchers', 'Credit',  '{}', 'BIDIRECTIONAL'),
  -- contacts <-> Customers
  ('FORTNOX', 'contacts', 'name',  'Customers', 'Name',  '{}', 'BIDIRECTIONAL'),
  ('FORTNOX', 'contacts', 'email', 'Customers', 'Email', '{}', 'BIDIRECTIONAL'),
  ('FORTNOX', 'contacts', 'phone', 'Customers', 'Phone', '{}', 'BIDIRECTIONAL');

-- ----------------------------------------------------------------------------
-- 6.3 Visma mappings
-- ----------------------------------------------------------------------------
INSERT INTO integration_mapping_templates (system_type, certified_entity, certified_field, external_entity, external_field, transform, direction)
VALUES
  -- companies <-> Customers
  ('VISMA', 'companies', 'name',  'Customers', 'name',  '{}', 'BIDIRECTIONAL'),
  ('VISMA', 'companies', 'email', 'Customers', 'email', '{}', 'BIDIRECTIONAL'),
  -- transactions <-> CustomerInvoices
  ('VISMA', 'transactions', 'id', 'CustomerInvoices', 'id', '{}', 'BIDIRECTIONAL');

-- ----------------------------------------------------------------------------
-- 6.4 Dynamics 365 mappings
-- ----------------------------------------------------------------------------
INSERT INTO integration_mapping_templates (system_type, certified_entity, certified_field, external_entity, external_field, transform, direction)
VALUES
  -- companies <-> Accounts
  ('DYNAMICS_365', 'companies', 'name',    'Accounts', 'name',             '{}', 'BIDIRECTIONAL'),
  ('DYNAMICS_365', 'companies', 'website', 'Accounts', 'websiteurl',       '{}', 'BIDIRECTIONAL'),
  ('DYNAMICS_365', 'companies', 'country', 'Accounts', 'address1_country', '{}', 'BIDIRECTIONAL'),
  -- contacts <-> Contacts
  ('DYNAMICS_365', 'contacts', 'first_name', 'Contacts', 'firstname',     '{}', 'BIDIRECTIONAL'),
  ('DYNAMICS_365', 'contacts', 'last_name',  'Contacts', 'lastname',      '{}', 'BIDIRECTIONAL'),
  ('DYNAMICS_365', 'contacts', 'email',      'Contacts', 'emailaddress1', '{}', 'BIDIRECTIONAL'),
  -- support_tickets <-> Cases
  ('DYNAMICS_365', 'support_tickets', 'title',       'Cases', 'title',        '{}', 'BIDIRECTIONAL'),
  ('DYNAMICS_365', 'support_tickets', 'description', 'Cases', 'description',  '{}', 'BIDIRECTIONAL'),
  ('DYNAMICS_365', 'support_tickets', 'priority',    'Cases', 'prioritycode', '{}', 'BIDIRECTIONAL');


COMMIT;
