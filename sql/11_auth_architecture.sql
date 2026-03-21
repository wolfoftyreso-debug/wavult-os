-- ============================================================================
-- Hypbit OMS — Multi-Tenant Auth Architecture
-- File: 11_auth_architecture.sql
-- Run: AFTER 10_strategic_review.sql in Supabase (PostgreSQL)
--
-- Establishes the auth layer: system config, API keys, org membership with
-- multi-role support, customizable role definitions, and session management.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 system_config — Certified-global configuration (NOT per org)
-- Stores feature flags, system defaults, and operational parameters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        UNIQUE NOT NULL,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 api_keys — System and org-level API keys
-- Keys are stored as bcrypt hashes; plaintext is NEVER persisted.
-- NULL org_id = system-level key.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID,                      -- NULL = system-level key
  name                TEXT        NOT NULL,
  key_hash            TEXT        NOT NULL,       -- bcrypt hash, never plaintext
  scope               TEXT        NOT NULL CHECK (scope IN (
                        'SYSTEM_ADMIN', 'ORG_ADMIN', 'INTEGRATION', 'READONLY'
                      )),
  permissions         JSONB       DEFAULT '[]',
  rate_limit_per_hour INTEGER     DEFAULT 1000,
  is_active           BOOLEAN     DEFAULT true,
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 org_members — Multi-role org membership (replaces simple users.role)
-- A user can hold MULTIPLE roles within an organization.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_members (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID        NOT NULL,
  user_id              UUID        NOT NULL,
  roles                TEXT[]      NOT NULL,
  primary_role         TEXT        NOT NULL,
  permissions_override JSONB       DEFAULT '{}',
  is_org_admin         BOOLEAN     DEFAULT false,
  invited_by           UUID,
  joined_at            TIMESTAMPTZ DEFAULT now(),
  last_active_at       TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 1.4 role_definitions — Per-org customizable role catalogue
-- System roles (is_system_role = true) are shared across all orgs.
-- Org-specific roles have a non-null org_id.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_definitions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID,
  role_code        TEXT        NOT NULL,
  display_name     TEXT,
  description      TEXT,
  iso_reference    TEXT,
  base_permissions JSONB,
  dashboard_config JSONB,
  is_system_role   BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, role_code)
);

-- ----------------------------------------------------------------------------
-- 1.5 sessions — User session tracking
-- Tracks active sessions with role context and expiration.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  org_id      UUID        NOT NULL,
  active_role TEXT,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- system_config
CREATE INDEX IF NOT EXISTS idx_system_config_key
  ON system_config (key);

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id
  ON api_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_scope
  ON api_keys (scope);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active
  ON api_keys (is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys (key_hash);

-- org_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON org_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON org_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_primary_role
  ON org_members (primary_role);
CREATE INDEX IF NOT EXISTS idx_org_members_is_org_admin
  ON org_members (is_org_admin);

-- role_definitions
CREATE INDEX IF NOT EXISTS idx_role_definitions_org_id
  ON role_definitions (org_id);
CREATE INDEX IF NOT EXISTS idx_role_definitions_role_code
  ON role_definitions (role_code);
CREATE INDEX IF NOT EXISTS idx_role_definitions_is_system_role
  ON role_definitions (is_system_role);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org_id
  ON sessions (org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at
  ON sessions (revoked_at);


-- ============================================================================
-- 3. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE system_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;

-- ---- system_config ----
-- Global config: read access for all authenticated, writes restricted to service role
DROP POLICY IF EXISTS system_config_read ON system_config;
CREATE POLICY system_config_read ON system_config
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS system_config_manage ON system_config;
CREATE POLICY system_config_manage ON system_config
  FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

-- ---- api_keys ----
-- Org-scoped keys visible only within org; system-level keys visible to service role
DROP POLICY IF EXISTS api_keys_org_isolation ON api_keys;
CREATE POLICY api_keys_org_isolation ON api_keys
  FOR SELECT
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    OR (org_id IS NULL AND current_setting('role', TRUE) = 'service_role')
  );

DROP POLICY IF EXISTS api_keys_manage ON api_keys;
CREATE POLICY api_keys_manage ON api_keys
  FOR ALL
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    OR current_setting('role', TRUE) = 'service_role'
  );

-- ---- org_members ----
DROP POLICY IF EXISTS org_members_org_isolation ON org_members;
CREATE POLICY org_members_org_isolation ON org_members
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS org_members_org_insert ON org_members;
CREATE POLICY org_members_org_insert ON org_members
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ---- role_definitions ----
-- System roles are visible to all; org-specific roles scoped to org
DROP POLICY IF EXISTS role_definitions_read ON role_definitions;
CREATE POLICY role_definitions_read ON role_definitions
  FOR SELECT
  USING (
    is_system_role = true
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

DROP POLICY IF EXISTS role_definitions_manage ON role_definitions;
CREATE POLICY role_definitions_manage ON role_definitions
  FOR ALL
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    OR current_setting('role', TRUE) = 'service_role'
  );

-- ---- sessions ----
DROP POLICY IF EXISTS sessions_org_isolation ON sessions;
CREATE POLICY sessions_org_isolation ON sessions
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS sessions_org_insert ON sessions;
CREATE POLICY sessions_org_insert ON sessions
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);


-- ============================================================================
-- 4. ENTITY SYNC TRIGGERS — api_keys and org_members
-- ============================================================================

-- Extend the sync_entity CASE to recognise auth tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['api_keys', 'org_members']
  LOOP
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
-- 5. SEED SYSTEM ROLE DEFINITIONS
-- ============================================================================

INSERT INTO role_definitions (org_id, role_code, display_name, description, iso_reference, base_permissions, is_system_role)
VALUES
  (NULL, 'EXECUTIVE',              'Executive / Top Management',   'Strategic oversight and approval authority',          'ISO 9001:2015 §5.1', '{"modules":["goals","kpis","financials_overview","compliance_status","strategic_reviews","decisions"],"actions":["read","approve"]}', true),
  (NULL, 'QUALITY_MANAGER',        'Quality Manager',              'Full system access, quality management lead',         'ISO 9001:2015 §5.3', '{"modules":["*"],"actions":["*"]}', true),
  (NULL, 'PROCESS_OWNER',          'Process Owner',                'Manages owned processes and related items',           'ISO 9001:2015 §4.4', '{"modules":["processes","nc","improvements","tasks","documents"],"actions":["read","write"]}', true),
  (NULL, 'INTERNAL_AUDITOR',       'Internal Auditor',             'Audit access with findings write capability',         'ISO 9001:2015 §9.2', '{"modules":["processes","nc","compliance","documents","audits","training"],"actions":["read"]}', true),
  (NULL, 'HR_MANAGER',             'HR Manager',                   'People, capabilities, and development management',    'ISO 9001:2015 §7.2', '{"modules":["capabilities","training","development_plans","goals"],"actions":["read","write","approve"]}', true),
  (NULL, 'DOCUMENT_CONTROLLER',    'Document Controller',          'Document lifecycle and compliance management',        'ISO 9001:2015 §7.5', '{"modules":["documents","compliance"],"actions":["read","write","approve"]}', true),
  (NULL, 'FINANCE_CONTROLLER',     'Finance Controller',           'Financial operations and reporting',                  NULL,                  '{"modules":["transactions","invoices","payouts","reports","fx"],"actions":["read","write","approve"]}', true),
  (NULL, 'OPERATIONS_MANAGER',     'Operations Manager',           'Day-to-day operational management',                  'ISO 9001:2015 §8.1', '{"modules":["tasks","meetings","processes","team_status"],"actions":["read","write"]}', true),
  (NULL, 'MANAGEMENT_REPRESENTATIVE', 'Management Representative', 'Quality management plus strategic reviews',          'ISO 9001:2015 §5.3', '{"modules":["*","strategic_reviews"],"actions":["*"]}', true),
  (NULL, 'EXTERNAL_AUDITOR',       'External Auditor',             'Read-only access for external audit activities',      'ISO 19011:2018',     '{"modules":["processes","nc","improvements","documents","compliance","audits","training","risks","kpis","management_reviews"],"actions":["read"]}', true),
  (NULL, 'EMPLOYEE',               'Employee',                     'Personal tasks and self-service access',              NULL,                  '{"modules":["my_tasks","my_capabilities","my_development","nc_report"],"actions":["read","write_own"]}', true),
  (NULL, 'SUPPLIER',               'Supplier',                     'Supplier portal access',                             NULL,                  '{"modules":["supplier_portal"],"actions":["read","write_own"]}', true)
ON CONFLICT (org_id, role_code) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  description      = EXCLUDED.description,
  iso_reference    = EXCLUDED.iso_reference,
  base_permissions = EXCLUDED.base_permissions,
  is_system_role   = EXCLUDED.is_system_role;


-- ============================================================================
-- Done. Multi-tenant auth architecture is ready.
-- ============================================================================

COMMIT;
