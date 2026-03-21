-- ============================================================================
-- pixdrift — Enterprise Integration Hub Schema
-- File: 31_integrations_schema.sql
-- Run: AFTER 30_decision_intelligence.sql
--
-- Tables:
--   integration_configs          — per-org integration configurations
--   integration_sync_log         — sync run history
--   integration_field_mappings   — source → target field mappings
--   integration_webhooks         — outbound webhook registrations
--
-- Auth types:  oauth2 | api_key | basic | certificate | sap_rfc
-- Providers:   sap | oracle | dynamics | ifs | jeeves | monitor |
--              pyramid | sage | infor | fortnox | visma | pe_accounting |
--              bjorn_lunden | xero | quickbooks | slack | teams |
--              google_workspace | salesforce | hubspot | pipedrive |
--              zapier | make | power_automate | custom
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. integration_configs
--    One row per provider+org combination.
--    credentials JSONB is stored encrypted at rest (Vault / pgcrypto recommended).
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  provider         TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  base_url         TEXT,
  auth_type        TEXT        NOT NULL DEFAULT 'oauth2'
                               CHECK (auth_type IN ('oauth2','api_key','basic','certificate','sap_rfc')),
  credentials      JSONB,      -- store encrypted; contains tokens, keys, secrets
  settings         JSONB       NOT NULL DEFAULT '{}',
  field_mappings   JSONB       NOT NULL DEFAULT '[]',   -- inline quick-mappings
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','paused','error','pending')),
  last_sync_at     TIMESTAMPTZ,
  sync_status      TEXT        NOT NULL DEFAULT 'idle'
                               CHECK (sync_status IN ('idle','running','success','partial','failed')),
  sync_frequency   TEXT        NOT NULL DEFAULT 'hourly'
                               CHECK (sync_frequency IN ('realtime','hourly','daily','manual')),
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_configs_org_provider_name_idx
  ON integration_configs(org_id, provider, name);

CREATE INDEX IF NOT EXISTS integration_configs_org_idx ON integration_configs(org_id);
CREATE INDEX IF NOT EXISTS integration_configs_provider_idx ON integration_configs(provider);

-- ============================================================================
-- 2. integration_sync_log
--    Immutable log of every sync attempt.
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_sync_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID        REFERENCES integration_configs(id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  status            TEXT        NOT NULL DEFAULT 'running'
                                CHECK (status IN ('running','success','partial','failed')),
  records_processed INTEGER     NOT NULL DEFAULT 0,
  records_created   INTEGER     NOT NULL DEFAULT 0,
  records_updated   INTEGER     NOT NULL DEFAULT 0,
  records_failed    INTEGER     NOT NULL DEFAULT 0,
  error_log         JSONB       NOT NULL DEFAULT '[]',
  duration_ms       INTEGER     GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER * 1000
    ELSE NULL END
  ) STORED
);

CREATE INDEX IF NOT EXISTS sync_log_integration_idx ON integration_sync_log(integration_id);
CREATE INDEX IF NOT EXISTS sync_log_started_idx ON integration_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS sync_log_status_idx ON integration_sync_log(status);

-- ============================================================================
-- 3. integration_field_mappings
--    Granular field-level mapping between external system and pixdrift schema.
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_field_mappings (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id   UUID    NOT NULL REFERENCES integration_configs(id) ON DELETE CASCADE,
  source_object    TEXT,                   -- 'Customer', 'Invoice', 'PerPerson', etc.
  source_field     TEXT    NOT NULL,       -- external field name
  target_table     TEXT    NOT NULL,       -- 'companies', 'transactions', 'contacts', etc.
  target_field     TEXT    NOT NULL,       -- pixdrift column name
  transform        TEXT                   -- 'trim','uppercase','lowercase','date_format','boolean','number'
                           CHECK (transform IS NULL OR transform IN ('trim','uppercase','lowercase','date_format','boolean','number')),
  default_value    TEXT,
  required         BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS field_mappings_unique_idx
  ON integration_field_mappings(integration_id, source_field, target_field);
CREATE INDEX IF NOT EXISTS field_mappings_integration_idx ON integration_field_mappings(integration_id);

-- ============================================================================
-- 4. integration_webhooks
--    Outbound webhook registrations — fired by pixdrift on internal events.
--    Events: deal.created | deal.won | task.completed | invoice.paid |
--            nc.opened | nc.closed
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  name               TEXT,
  url                TEXT        NOT NULL,
  events             TEXT[]      NOT NULL DEFAULT ARRAY['deal.created'],
  secret             TEXT,                     -- HMAC-SHA256 signing secret
  active             BOOLEAN     NOT NULL DEFAULT true,
  last_triggered_at  TIMESTAMPTZ,
  failure_count      INTEGER     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhooks_org_idx   ON integration_webhooks(org_id);
CREATE INDEX IF NOT EXISTS webhooks_active_idx ON integration_webhooks(active);

-- ============================================================================
-- 5. Seed — provider catalogue (read-only reference; not per-org)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_provider_catalogue (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     TEXT  NOT NULL UNIQUE,
  display_name TEXT  NOT NULL,
  category     TEXT  NOT NULL CHECK (category IN ('erp','accounting','communication','crm','automation')),
  description  TEXT,
  auth_types   TEXT[] NOT NULL DEFAULT ARRAY['oauth2'],
  logo_hint    TEXT,   -- short brand colour or SVG key for frontend
  docs_url     TEXT,
  active       BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO integration_provider_catalogue (provider, display_name, category, description, auth_types, docs_url) VALUES
  -- ERP
  ('sap',       'SAP S/4HANA & Business One',  'erp', 'Världens ledande ERP via SAP BTP och OData APIs.',           ARRAY['oauth2','sap_rfc'],   'https://api.sap.com'),
  ('oracle',    'Oracle NetSuite / ERP Cloud',  'erp', 'NetSuite för SMB och Oracle ERP Cloud för enterprise.',      ARRAY['oauth2','api_key'],   'https://docs.oracle.com/en/cloud/saas/netsuite'),
  ('dynamics',  'Microsoft Dynamics 365',       'erp', 'Business Central + Dynamics 365 Sales via Azure AD.',        ARRAY['oauth2'],             'https://learn.microsoft.com/en-us/dynamics365'),
  ('ifs',       'IFS Applications',             'erp', 'Starkt i Sverige — Saab, Volvo, Alfa Laval, Atlas Copco.',  ARRAY['oauth2','api_key'],   'https://docs.ifs.com'),
  ('jeeves',    'Jeeves ERP',                   'erp', 'Nordiskt ERP för tillverkning och handel.',                  ARRAY['api_key','basic'],    'https://jeevesinfo.com'),
  ('monitor',   'Monitor ERP',                  'erp', 'Nordiskt ERP för tillverkande industri.',                    ARRAY['api_key','basic'],    'https://www.monitor.se'),
  ('pyramid',   'Pyramid Business Studio',      'erp', 'Nordiskt ERP för handel, bygg och projekt.',                ARRAY['api_key','basic'],    'https://www.pyramid.se'),
  ('sage',      'Sage',                         'erp', 'Populärt i UK och Europa — Sage 200, Sage X3.',             ARRAY['oauth2'],             'https://developer.sage.com'),
  ('infor',     'Infor',                        'erp', 'Branschspecifikt ERP för industri och tillverkning.',        ARRAY['oauth2'],             'https://www.infor.com/developers'),
  -- Bokföring
  ('fortnox',   'Fortnox',                      'accounting', 'Sveriges mest använda bokföringsprogram.',           ARRAY['oauth2'],             'https://developer.fortnox.se'),
  ('visma',     'Visma',                        'accounting', 'Visma eEkonomi och Visma Net.',                       ARRAY['oauth2'],             'https://developer.visma.com'),
  ('pe_accounting', 'PE Accounting',            'accounting', 'Molnbaserat ekonomisystem för SMB.',                  ARRAY['api_key'],            'https://www.pe.com'),
  ('bjorn_lunden', 'Björn Lundén',              'accounting', 'Redovisning och bokföring för svenska SMB.',          ARRAY['api_key'],            'https://www.bjornlunden.se'),
  ('xero',      'Xero',                         'accounting', 'Globalt molnbaserat bokföringssystem.',               ARRAY['oauth2'],             'https://developer.xero.com'),
  ('quickbooks','QuickBooks',                   'accounting', 'Intuits bokföringsprogram — populärt globalt.',       ARRAY['oauth2'],             'https://developer.intuit.com'),
  -- Kommunikation
  ('slack',     'Slack',                        'communication', 'Meddelandeplattform med botintegration.',          ARRAY['oauth2'],             'https://api.slack.com'),
  ('teams',     'Microsoft Teams',              'communication', 'Microsoft Teams via Graph API.',                   ARRAY['oauth2'],             'https://learn.microsoft.com/en-us/graph'),
  ('google_workspace', 'Google Workspace',      'communication', 'Gmail, Calendar, Drive, Meet via Google APIs.',    ARRAY['oauth2'],             'https://developers.google.com/workspace'),
  -- CRM
  ('salesforce','Salesforce',                   'crm', 'Världens ledande CRM-plattform.',                           ARRAY['oauth2'],             'https://developer.salesforce.com'),
  ('hubspot',   'HubSpot',                      'crm', 'Inbound marketing, CRM och sales hub.',                     ARRAY['oauth2','api_key'],   'https://developers.hubspot.com'),
  ('pipedrive', 'Pipedrive',                    'crm', 'Säljfokuserat CRM för B2B-team.',                           ARRAY['oauth2','api_key'],   'https://developers.pipedrive.com'),
  -- Automatisering
  ('zapier',    'Zapier',                       'automation', '5000+ app-kopplingar via trigger/action.',            ARRAY['api_key'],            'https://zapier.com/developer'),
  ('make',      'Make.com',                     'automation', 'Visuell automation (f.d. Integromat).',               ARRAY['api_key'],            'https://www.make.com/en/developers'),
  ('power_automate', 'Power Automate',          'automation', 'Microsofts automationsplattform med 1000+ kopplingar.',ARRAY['oauth2'],            'https://learn.microsoft.com/en-us/power-automate')
ON CONFLICT (provider) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  docs_url     = EXCLUDED.docs_url;

-- ============================================================================
-- 6. Row-Level Security
-- ============================================================================
ALTER TABLE integration_configs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_field_mappings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks         ENABLE ROW LEVEL SECURITY;

-- integration_configs: org members can read; org admins can write
CREATE POLICY "org_member_read_configs"
  ON integration_configs FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "org_admin_write_configs"
  ON integration_configs FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'));

-- integration_sync_log: org members can read
CREATE POLICY "org_member_read_sync_log"
  ON integration_sync_log FOR SELECT
  USING (integration_id IN (
    SELECT id FROM integration_configs
    WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));

-- integration_field_mappings: org admin write, members read
CREATE POLICY "org_member_read_mappings"
  ON integration_field_mappings FOR SELECT
  USING (integration_id IN (
    SELECT id FROM integration_configs
    WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "org_admin_write_mappings"
  ON integration_field_mappings FOR ALL
  USING (integration_id IN (
    SELECT id FROM integration_configs
    WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ORG_ADMIN')
  ))
  WITH CHECK (integration_id IN (
    SELECT id FROM integration_configs
    WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ORG_ADMIN')
  ));

-- integration_webhooks: org members read, admins write
CREATE POLICY "org_member_read_webhooks"
  ON integration_webhooks FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "org_admin_write_webhooks"
  ON integration_webhooks FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'ORG_ADMIN'));

COMMIT;
