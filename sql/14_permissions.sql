-- ============================================================================
-- Hypbit OMS — Permissions Administration
-- File: 14_permissions.sql
-- Run: AFTER 11_auth_architecture.sql
--
-- Atomic permissions, role→permission mapping, per-user overrides,
-- immutable permission audit log, and access request workflow.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 permissions — Atomic permission definitions
-- Each permission is a unique module.action.resource combination.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        UNIQUE NOT NULL,
  display_name  TEXT,
  description   TEXT,
  module        TEXT        NOT NULL,
  action        TEXT        NOT NULL CHECK (action IN (
                  'READ','CREATE','UPDATE','DELETE',
                  'APPROVE','EXPORT','INVITE','CONFIGURE'
                )),
  resource      TEXT        NOT NULL,
  is_sensitive  BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 role_permissions — Maps role_definitions → permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_definition_id UUID        NOT NULL REFERENCES role_definitions(id),
  permission_id      UUID        NOT NULL REFERENCES permissions(id),
  granted            BOOLEAN     DEFAULT true,
  condition          JSONB       DEFAULT '{}',
  UNIQUE(role_definition_id, permission_id)
);

-- ----------------------------------------------------------------------------
-- 1.3 permission_overrides — Per-user exceptions (GRANT / REVOKE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permission_overrides (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,
  user_id       UUID        NOT NULL,
  permission_id UUID        NOT NULL REFERENCES permissions(id),
  override_type TEXT        NOT NULL CHECK (override_type IN ('GRANT','REVOKE')),
  reason        TEXT        NOT NULL,
  granted_by    UUID        NOT NULL,
  valid_from    TIMESTAMPTZ DEFAULT now(),
  valid_until   TIMESTAMPTZ,
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 permission_audit — Immutable audit trail for permission changes
-- Separate from regular audit_logs for compliance isolation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permission_audit (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID,
  action          TEXT        NOT NULL CHECK (action IN (
                    'ROLE_ASSIGNED','ROLE_REMOVED',
                    'PERMISSION_GRANTED','PERMISSION_REVOKED',
                    'OVERRIDE_CREATED','OVERRIDE_EXPIRED',
                    'ACCESS_DENIED','SENSITIVE_DATA_ACCESSED',
                    'BULK_EXPORT','SESSION_CREATED','SESSION_REVOKED',
                    'EXTERNAL_ACCESS_GRANTED'
                  )),
  target_user_id  UUID,
  performed_by    UUID,
  details         JSONB       DEFAULT '{}',
  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.5 access_requests — Elevated permission request workflow
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_requests (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID        NOT NULL,
  requester_id            UUID        NOT NULL,
  requested_permission_id UUID        REFERENCES permissions(id),
  requested_role          TEXT,
  reason                  TEXT        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                            'PENDING','APPROVED','DENIED','EXPIRED'
                          )),
  decided_by              UUID,
  decided_at              TIMESTAMPTZ,
  valid_until             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- permissions
CREATE INDEX IF NOT EXISTS idx_permissions_module
  ON permissions (module);
CREATE INDEX IF NOT EXISTS idx_permissions_action
  ON permissions (action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource
  ON permissions (resource);
CREATE INDEX IF NOT EXISTS idx_permissions_code
  ON permissions (code);
CREATE INDEX IF NOT EXISTS idx_permissions_is_sensitive
  ON permissions (is_sensitive) WHERE is_sensitive = true;

-- role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_definition_id
  ON role_permissions (role_definition_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions (permission_id);

-- permission_overrides
CREATE INDEX IF NOT EXISTS idx_permission_overrides_org_id
  ON permission_overrides (org_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_id
  ON permission_overrides (user_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_permission_id
  ON permission_overrides (permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_active
  ON permission_overrides (is_active) WHERE is_active = true;

-- permission_audit
CREATE INDEX IF NOT EXISTS idx_permission_audit_org_id
  ON permission_audit (org_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action
  ON permission_audit (action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_target_user_id
  ON permission_audit (target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_performed_by
  ON permission_audit (performed_by);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created_at
  ON permission_audit (created_at);

-- access_requests
CREATE INDEX IF NOT EXISTS idx_access_requests_org_id
  ON access_requests (org_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_requester_id
  ON access_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status
  ON access_requests (status);


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit     ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests      ENABLE ROW LEVEL SECURITY;

-- ---- permissions (read-all, manage by service_role) ----
DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
  FOR SELECT USING (true);

-- ---- role_permissions (read-all, manage by service_role) ----
DROP POLICY IF EXISTS role_permissions_read ON role_permissions;
CREATE POLICY role_permissions_read ON role_permissions
  FOR SELECT USING (true);

-- ---- permission_overrides (org-scoped) ----
DROP POLICY IF EXISTS permission_overrides_org_isolation ON permission_overrides;
CREATE POLICY permission_overrides_org_isolation ON permission_overrides
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS permission_overrides_org_insert ON permission_overrides;
CREATE POLICY permission_overrides_org_insert ON permission_overrides
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ---- permission_audit (org-scoped read, insert-only) ----
DROP POLICY IF EXISTS permission_audit_org_read ON permission_audit;
CREATE POLICY permission_audit_org_read ON permission_audit
  FOR SELECT
  USING (
    org_id IS NULL
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

DROP POLICY IF EXISTS permission_audit_insert ON permission_audit;
CREATE POLICY permission_audit_insert ON permission_audit
  FOR INSERT
  WITH CHECK (true);

-- ---- access_requests (org-scoped) ----
DROP POLICY IF EXISTS access_requests_org_isolation ON access_requests;
CREATE POLICY access_requests_org_isolation ON access_requests
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS access_requests_org_insert ON access_requests;
CREATE POLICY access_requests_org_insert ON access_requests
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);


-- ============================================================================
-- 4. IMMUTABLE AUDIT — Prevent UPDATE/DELETE on permission_audit
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_permission_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'permission_audit is immutable: % operations are not allowed', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_permission_audit_update ON permission_audit;
CREATE TRIGGER trg_prevent_permission_audit_update
  BEFORE UPDATE ON permission_audit
  FOR EACH ROW
  EXECUTE FUNCTION prevent_permission_audit_mutation();

DROP TRIGGER IF EXISTS trg_prevent_permission_audit_delete ON permission_audit;
CREATE TRIGGER trg_prevent_permission_audit_delete
  BEFORE DELETE ON permission_audit
  FOR EACH ROW
  EXECUTE FUNCTION prevent_permission_audit_mutation();


-- ============================================================================
-- 5. ENTITY SYNC TRIGGERS — permission_overrides and access_requests
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['permission_overrides', 'access_requests']
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
-- 6. SEED PERMISSIONS (~120 atomic permissions)
-- ============================================================================

INSERT INTO permissions (code, display_name, description, module, action, resource, is_sensitive)
VALUES
  -- =========================================================================
  -- EXECUTION module
  -- =========================================================================
  -- deals
  ('EXECUTION.READ.deals',     'View deals',           'Read access to deals',                   'EXECUTION', 'READ',   'deals',     false),
  ('EXECUTION.CREATE.deals',   'Create deals',         'Create new deals',                       'EXECUTION', 'CREATE', 'deals',     false),
  ('EXECUTION.UPDATE.deals',   'Edit deals',           'Update existing deals',                  'EXECUTION', 'UPDATE', 'deals',     false),
  ('EXECUTION.DELETE.deals',   'Delete deals',         'Remove deals',                           'EXECUTION', 'DELETE', 'deals',     false),
  -- tasks
  ('EXECUTION.READ.tasks',     'View tasks',           'Read access to tasks',                   'EXECUTION', 'READ',   'tasks',     false),
  ('EXECUTION.CREATE.tasks',   'Create tasks',         'Create new tasks',                       'EXECUTION', 'CREATE', 'tasks',     false),
  ('EXECUTION.UPDATE.tasks',   'Edit tasks',           'Update existing tasks',                  'EXECUTION', 'UPDATE', 'tasks',     false),
  ('EXECUTION.DELETE.tasks',   'Delete tasks',         'Remove tasks',                           'EXECUTION', 'DELETE', 'tasks',     false),
  -- contacts
  ('EXECUTION.READ.contacts',  'View contacts',        'Read access to contacts',                'EXECUTION', 'READ',   'contacts',  false),
  ('EXECUTION.CREATE.contacts','Create contacts',      'Create new contacts',                    'EXECUTION', 'CREATE', 'contacts',  false),
  ('EXECUTION.UPDATE.contacts','Edit contacts',        'Update existing contacts',               'EXECUTION', 'UPDATE', 'contacts',  false),
  ('EXECUTION.DELETE.contacts','Delete contacts',      'Remove contacts',                        'EXECUTION', 'DELETE', 'contacts',  false),
  -- companies
  ('EXECUTION.READ.companies',  'View companies',      'Read access to companies',               'EXECUTION', 'READ',   'companies', false),
  ('EXECUTION.CREATE.companies','Create companies',    'Create new companies',                   'EXECUTION', 'CREATE', 'companies', false),
  ('EXECUTION.UPDATE.companies','Edit companies',      'Update existing companies',              'EXECUTION', 'UPDATE', 'companies', false),
  ('EXECUTION.DELETE.companies','Delete companies',    'Remove companies',                       'EXECUTION', 'DELETE', 'companies', false),
  -- leads
  ('EXECUTION.READ.leads',     'View leads',           'Read access to leads',                   'EXECUTION', 'READ',   'leads',     false),
  ('EXECUTION.CREATE.leads',   'Create leads',         'Create new leads',                       'EXECUTION', 'CREATE', 'leads',     false),
  ('EXECUTION.UPDATE.leads',   'Edit leads',           'Update existing leads',                  'EXECUTION', 'UPDATE', 'leads',     false),
  ('EXECUTION.DELETE.leads',   'Delete leads',         'Remove leads',                           'EXECUTION', 'DELETE', 'leads',     false),
  -- meetings
  ('EXECUTION.READ.meetings',  'View meetings',        'Read access to meetings',                'EXECUTION', 'READ',   'meetings',  false),
  ('EXECUTION.CREATE.meetings','Create meetings',      'Create new meetings',                    'EXECUTION', 'CREATE', 'meetings',  false),
  ('EXECUTION.UPDATE.meetings','Edit meetings',        'Update existing meetings',               'EXECUTION', 'UPDATE', 'meetings',  false),
  ('EXECUTION.DELETE.meetings','Delete meetings',      'Remove meetings',                        'EXECUTION', 'DELETE', 'meetings',  false),
  -- decisions
  ('EXECUTION.READ.decisions',  'View decisions',      'Read access to decisions',               'EXECUTION', 'READ',   'decisions', false),
  ('EXECUTION.CREATE.decisions','Create decisions',    'Create new decisions',                   'EXECUTION', 'CREATE', 'decisions', false),
  ('EXECUTION.UPDATE.decisions','Edit decisions',      'Update existing decisions',              'EXECUTION', 'UPDATE', 'decisions', false),
  -- channels
  ('EXECUTION.READ.channels',  'View channels',        'Read access to channels',                'EXECUTION', 'READ',   'channels',  false),
  ('EXECUTION.CREATE.channels','Create channels',      'Create new channels',                    'EXECUTION', 'CREATE', 'channels',  false),
  ('EXECUTION.UPDATE.channels','Edit channels',        'Update existing channels',               'EXECUTION', 'UPDATE', 'channels',  false),
  ('EXECUTION.DELETE.channels','Delete channels',      'Remove channels',                        'EXECUTION', 'DELETE', 'channels',  false),
  -- messages
  ('EXECUTION.READ.messages',  'View messages',        'Read access to messages',                'EXECUTION', 'READ',   'messages',  false),
  ('EXECUTION.CREATE.messages','Create messages',      'Send new messages',                      'EXECUTION', 'CREATE', 'messages',  false),
  ('EXECUTION.DELETE.messages','Delete messages',      'Remove messages',                        'EXECUTION', 'DELETE', 'messages',  false),
  -- kpis
  ('EXECUTION.READ.kpis',     'View KPIs',             'Read access to KPIs',                    'EXECUTION', 'READ',   'kpis',      false),
  ('EXECUTION.CREATE.kpis',   'Create KPIs',           'Create new KPIs',                        'EXECUTION', 'CREATE', 'kpis',      false),
  ('EXECUTION.UPDATE.kpis',   'Edit KPIs',             'Update existing KPIs',                   'EXECUTION', 'UPDATE', 'kpis',      false),
  ('EXECUTION.DELETE.kpis',   'Delete KPIs',           'Remove KPIs',                            'EXECUTION', 'DELETE', 'kpis',      false),
  -- configs
  ('EXECUTION.READ.configs',     'View configs',       'Read execution configs',                 'EXECUTION', 'READ',      'configs', false),
  ('EXECUTION.CONFIGURE.configs','Configure settings', 'Modify execution configuration',         'EXECUTION', 'CONFIGURE', 'configs', false),

  -- =========================================================================
  -- CAPABILITY module
  -- =========================================================================
  ('CAPABILITY.READ.capabilities',    'View capabilities',      'Read access to capabilities (contains user data)', 'CAPABILITY', 'READ',   'capabilities',     true),
  ('CAPABILITY.CREATE.capabilities',  'Create capabilities',    'Define new capabilities',                          'CAPABILITY', 'CREATE', 'capabilities',     false),
  ('CAPABILITY.UPDATE.capabilities',  'Edit capabilities',      'Update capability definitions',                    'CAPABILITY', 'UPDATE', 'capabilities',     false),
  ('CAPABILITY.DELETE.capabilities',  'Delete capabilities',    'Remove capabilities',                              'CAPABILITY', 'DELETE', 'capabilities',     false),
  ('CAPABILITY.READ.assessments',     'View assessments',       'Read capability assessments (user-linked)',         'CAPABILITY', 'READ',   'assessments',      true),
  ('CAPABILITY.CREATE.assessments',   'Create assessments',     'Create new assessments',                           'CAPABILITY', 'CREATE', 'assessments',      false),
  ('CAPABILITY.UPDATE.assessments',   'Edit assessments',       'Update assessments',                               'CAPABILITY', 'UPDATE', 'assessments',      false),
  ('CAPABILITY.READ.development_plans','View dev plans',        'Read development plans (user-linked)',              'CAPABILITY', 'READ',   'development_plans',true),
  ('CAPABILITY.CREATE.development_plans','Create dev plans',    'Create development plans',                         'CAPABILITY', 'CREATE', 'development_plans',false),
  ('CAPABILITY.UPDATE.development_plans','Edit dev plans',      'Update development plans',                         'CAPABILITY', 'UPDATE', 'development_plans',false),
  ('CAPABILITY.READ.goals',          'View goals',              'Read goals',                                       'CAPABILITY', 'READ',   'goals',            false),
  ('CAPABILITY.CREATE.goals',        'Create goals',            'Create new goals',                                 'CAPABILITY', 'CREATE', 'goals',            false),
  ('CAPABILITY.UPDATE.goals',        'Edit goals',              'Update goals',                                     'CAPABILITY', 'UPDATE', 'goals',            false),
  ('CAPABILITY.DELETE.goals',        'Delete goals',            'Remove goals',                                     'CAPABILITY', 'DELETE', 'goals',            false),
  ('CAPABILITY.READ.feedback',       'View feedback',           'Read feedback (user-linked)',                       'CAPABILITY', 'READ',   'feedback',         true),
  ('CAPABILITY.CREATE.feedback',     'Create feedback',         'Submit feedback',                                  'CAPABILITY', 'CREATE', 'feedback',         false),

  -- =========================================================================
  -- PROCESS module
  -- =========================================================================
  ('PROCESS.READ.processes',           'View processes',           'Read access to processes',                     'PROCESS', 'READ',   'processes',           false),
  ('PROCESS.CREATE.processes',         'Create processes',         'Create new processes',                         'PROCESS', 'CREATE', 'processes',           false),
  ('PROCESS.UPDATE.processes',         'Edit processes',           'Update existing processes',                    'PROCESS', 'UPDATE', 'processes',           false),
  ('PROCESS.DELETE.processes',         'Delete processes',         'Remove processes',                             'PROCESS', 'DELETE', 'processes',           false),
  ('PROCESS.READ.process_executions',  'View process executions',  'Read process execution records',              'PROCESS', 'READ',   'process_executions',  false),
  ('PROCESS.CREATE.process_executions','Start process execution',  'Initiate process executions',                 'PROCESS', 'CREATE', 'process_executions',  false),
  ('PROCESS.UPDATE.process_executions','Edit process executions',  'Update process execution records',            'PROCESS', 'UPDATE', 'process_executions',  false),
  ('PROCESS.READ.nc',                 'View non-conformities',    'Read access to NCs',                           'PROCESS', 'READ',   'nc',                  false),
  ('PROCESS.CREATE.nc',               'Raise non-conformity',     'Create new NCs',                               'PROCESS', 'CREATE', 'nc',                  false),
  ('PROCESS.UPDATE.nc',               'Edit non-conformity',      'Update NCs',                                   'PROCESS', 'UPDATE', 'nc',                  false),
  ('PROCESS.APPROVE.nc',              'Approve NC resolution',    'Approve NC closure',                            'PROCESS', 'APPROVE','nc',                  false),
  ('PROCESS.READ.improvements',       'View improvements',        'Read access to improvements',                  'PROCESS', 'READ',   'improvements',        false),
  ('PROCESS.CREATE.improvements',     'Create improvements',      'Create new improvements',                      'PROCESS', 'CREATE', 'improvements',        false),
  ('PROCESS.UPDATE.improvements',     'Edit improvements',        'Update improvements',                          'PROCESS', 'UPDATE', 'improvements',        false),
  ('PROCESS.APPROVE.improvements',    'Approve improvements',     'Approve improvement proposals',                 'PROCESS', 'APPROVE','improvements',        false),
  ('PROCESS.READ.compliance',         'View compliance',          'Read compliance records',                       'PROCESS', 'READ',   'compliance',          false),
  ('PROCESS.CREATE.compliance',       'Create compliance items',  'Create compliance records',                    'PROCESS', 'CREATE', 'compliance',          false),
  ('PROCESS.UPDATE.compliance',       'Edit compliance',          'Update compliance records',                    'PROCESS', 'UPDATE', 'compliance',          false),
  ('PROCESS.READ.documents',          'View documents',           'Read access to documents',                     'PROCESS', 'READ',   'documents',           false),
  ('PROCESS.CREATE.documents',        'Create documents',         'Upload/create documents',                      'PROCESS', 'CREATE', 'documents',           false),
  ('PROCESS.UPDATE.documents',        'Edit documents',           'Update documents',                             'PROCESS', 'UPDATE', 'documents',           false),
  ('PROCESS.DELETE.documents',        'Delete documents',         'Remove documents',                             'PROCESS', 'DELETE', 'documents',           false),
  ('PROCESS.APPROVE.documents',       'Approve documents',        'Approve document revisions',                    'PROCESS', 'APPROVE','documents',           false),
  ('PROCESS.READ.audits',             'View audits',              'Read audit records',                           'PROCESS', 'READ',   'audits',              false),
  ('PROCESS.CREATE.audits',           'Create audits',            'Schedule new audits',                          'PROCESS', 'CREATE', 'audits',              false),
  ('PROCESS.UPDATE.audits',           'Edit audits',              'Update audit records',                         'PROCESS', 'UPDATE', 'audits',              false),
  ('PROCESS.READ.risks',              'View risks',               'Read risk register',                           'PROCESS', 'READ',   'risks',               false),
  ('PROCESS.CREATE.risks',            'Create risks',             'Register new risks',                           'PROCESS', 'CREATE', 'risks',               false),
  ('PROCESS.UPDATE.risks',            'Edit risks',               'Update risk assessments',                      'PROCESS', 'UPDATE', 'risks',               false),
  ('PROCESS.DELETE.risks',            'Delete risks',             'Remove risks',                                 'PROCESS', 'DELETE', 'risks',               false),
  ('PROCESS.READ.training',           'View training',            'Read training records',                        'PROCESS', 'READ',   'training',            false),
  ('PROCESS.CREATE.training',         'Create training',          'Create training activities',                   'PROCESS', 'CREATE', 'training',            false),
  ('PROCESS.UPDATE.training',         'Edit training',            'Update training records',                      'PROCESS', 'UPDATE', 'training',            false),

  -- =========================================================================
  -- CURRENCY module
  -- =========================================================================
  ('CURRENCY.READ.currencies',        'View currencies',         'Read currency list',                            'CURRENCY', 'READ',   'currencies',     false),
  ('CURRENCY.CREATE.currencies',      'Create currencies',       'Add new currencies',                            'CURRENCY', 'CREATE', 'currencies',     false),
  ('CURRENCY.UPDATE.currencies',      'Edit currencies',         'Update currency details',                       'CURRENCY', 'UPDATE', 'currencies',     false),
  ('CURRENCY.READ.exchange_rates',    'View exchange rates',     'Read exchange rate data',                        'CURRENCY', 'READ',   'exchange_rates', true),
  ('CURRENCY.CREATE.exchange_rates',  'Create exchange rates',   'Add exchange rate entries',                      'CURRENCY', 'CREATE', 'exchange_rates', false),
  ('CURRENCY.UPDATE.exchange_rates',  'Edit exchange rates',     'Update exchange rate entries',                   'CURRENCY', 'UPDATE', 'exchange_rates', false),
  ('CURRENCY.READ.fx_adjustments',    'View FX adjustments',     'Read FX adjustment records',                    'CURRENCY', 'READ',   'fx_adjustments', true),
  ('CURRENCY.CREATE.fx_adjustments',  'Create FX adjustments',   'Create FX adjustment entries',                  'CURRENCY', 'CREATE', 'fx_adjustments', false),
  ('CURRENCY.APPROVE.fx_adjustments', 'Approve FX adjustments',  'Approve FX adjustment entries',                 'CURRENCY', 'APPROVE','fx_adjustments', false),

  -- =========================================================================
  -- REPORTS module
  -- =========================================================================
  ('REPORTS.READ.trial_balance',      'View trial balance',       'Read trial balance report',                    'REPORTS', 'READ',   'trial_balance',      true),
  ('REPORTS.EXPORT.trial_balance',    'Export trial balance',     'Export trial balance data',                     'REPORTS', 'EXPORT', 'trial_balance',      true),
  ('REPORTS.READ.income_statement',   'View income statement',    'Read income statement report',                 'REPORTS', 'READ',   'income_statement',   true),
  ('REPORTS.EXPORT.income_statement', 'Export income statement',  'Export income statement data',                  'REPORTS', 'EXPORT', 'income_statement',   true),
  ('REPORTS.READ.balance_sheet',      'View balance sheet',       'Read balance sheet report',                    'REPORTS', 'READ',   'balance_sheet',      true),
  ('REPORTS.EXPORT.balance_sheet',    'Export balance sheet',     'Export balance sheet data',                     'REPORTS', 'EXPORT', 'balance_sheet',      true),
  ('REPORTS.READ.general_ledger',     'View general ledger',      'Read general ledger entries',                  'REPORTS', 'READ',   'general_ledger',     true),
  ('REPORTS.EXPORT.general_ledger',   'Export general ledger',    'Export general ledger data',                    'REPORTS', 'EXPORT', 'general_ledger',     true),
  ('REPORTS.READ.vat',               'View VAT report',           'Read VAT report',                             'REPORTS', 'READ',   'vat',                true),
  ('REPORTS.EXPORT.vat',             'Export VAT report',          'Export VAT report data',                      'REPORTS', 'EXPORT', 'vat',                true),
  ('REPORTS.READ.cashflow',          'View cashflow',              'Read cashflow report',                        'REPORTS', 'READ',   'cashflow',           true),
  ('REPORTS.EXPORT.cashflow',        'Export cashflow',            'Export cashflow data',                         'REPORTS', 'EXPORT', 'cashflow',           true),
  ('REPORTS.READ.sie4',             'View SIE4 export',            'Read SIE4 export data',                       'REPORTS', 'READ',   'sie4',               true),
  ('REPORTS.EXPORT.sie4',           'Export SIE4',                 'Generate SIE4 export file',                    'REPORTS', 'EXPORT', 'sie4',               true),
  ('REPORTS.READ.chart_of_accounts', 'View chart of accounts',    'Read chart of accounts',                      'REPORTS', 'READ',   'chart_of_accounts',  false),
  ('REPORTS.UPDATE.chart_of_accounts','Edit chart of accounts',   'Update chart of accounts',                    'REPORTS', 'UPDATE', 'chart_of_accounts',  false),

  -- =========================================================================
  -- SYSTEM module
  -- =========================================================================
  ('SYSTEM.READ.system_config',       'View system config',       'Read system configuration',                   'SYSTEM', 'READ',      'system_config',  false),
  ('SYSTEM.CONFIGURE.system_config',  'Configure system',         'Modify system configuration',                 'SYSTEM', 'CONFIGURE', 'system_config',  false),
  ('SYSTEM.READ.feature_flags',       'View feature flags',       'Read feature flag states',                    'SYSTEM', 'READ',      'feature_flags',  false),
  ('SYSTEM.CONFIGURE.feature_flags',  'Configure feature flags',  'Toggle feature flags',                        'SYSTEM', 'CONFIGURE', 'feature_flags',  false),
  ('SYSTEM.READ.orgs',               'View organizations',        'Read org details',                            'SYSTEM', 'READ',      'orgs',           false),
  ('SYSTEM.CREATE.orgs',             'Create organizations',      'Create new organizations',                    'SYSTEM', 'CREATE',    'orgs',           false),
  ('SYSTEM.UPDATE.orgs',             'Edit organizations',        'Update org details',                          'SYSTEM', 'UPDATE',    'orgs',           false),
  ('SYSTEM.READ.metrics',            'View system metrics',       'Read system health metrics',                  'SYSTEM', 'READ',      'metrics',        false),

  -- =========================================================================
  -- ADMIN module
  -- =========================================================================
  ('ADMIN.READ.users',                'View users',               'Read user profiles (personal data)',           'ADMIN', 'READ',      'users',            true),
  ('ADMIN.CREATE.users',              'Create users',             'Create new user accounts',                    'ADMIN', 'CREATE',    'users',            false),
  ('ADMIN.UPDATE.users',              'Edit users',               'Update user profiles',                        'ADMIN', 'UPDATE',    'users',            true),
  ('ADMIN.DELETE.users',              'Deactivate users',         'Deactivate user accounts',                    'ADMIN', 'DELETE',    'users',            false),
  ('ADMIN.INVITE.users',             'Invite users',              'Send user invitations',                       'ADMIN', 'INVITE',    'users',            false),
  ('ADMIN.READ.roles',               'View roles',               'Read role definitions',                       'ADMIN', 'READ',      'roles',            false),
  ('ADMIN.CREATE.roles',             'Create roles',             'Create new role definitions',                  'ADMIN', 'CREATE',    'roles',            false),
  ('ADMIN.UPDATE.roles',             'Edit roles',               'Update role definitions',                      'ADMIN', 'UPDATE',    'roles',            false),
  ('ADMIN.DELETE.roles',             'Delete roles',             'Remove role definitions',                      'ADMIN', 'DELETE',    'roles',            false),
  ('ADMIN.CONFIGURE.roles',         'Configure roles',          'Full role and permission management',           'ADMIN', 'CONFIGURE', 'roles',            false),
  ('ADMIN.READ.permissions',        'View permissions',          'Read permission definitions',                  'ADMIN', 'READ',      'permissions',      false),
  ('ADMIN.READ.overrides',          'View overrides',            'Read permission overrides',                    'ADMIN', 'READ',      'overrides',        false),
  ('ADMIN.CREATE.overrides',        'Create overrides',          'Create permission overrides',                  'ADMIN', 'CREATE',    'overrides',        false),
  ('ADMIN.DELETE.overrides',        'Revoke overrides',          'Revoke permission overrides',                  'ADMIN', 'DELETE',    'overrides',        false),
  ('ADMIN.READ.audit_log',          'View audit log',            'Read permission audit trail',                  'ADMIN', 'READ',      'audit_log',        false),
  ('ADMIN.READ.access_requests',    'View access requests',      'Read access requests',                        'ADMIN', 'READ',      'access_requests',  false),
  ('ADMIN.APPROVE.access_requests', 'Approve access requests',   'Approve or deny access requests',             'ADMIN', 'APPROVE',   'access_requests',  false),
  ('ADMIN.READ.sessions',           'View sessions',             'Read active sessions',                        'ADMIN', 'READ',      'sessions',         false),
  ('ADMIN.DELETE.sessions',         'Revoke sessions',           'Terminate active sessions',                   'ADMIN', 'DELETE',    'sessions',         false),
  ('ADMIN.READ.api_keys',           'View API keys',             'Read API key metadata',                       'ADMIN', 'READ',      'api_keys',         false),
  ('ADMIN.CREATE.api_keys',         'Create API keys',           'Generate new API keys',                       'ADMIN', 'CREATE',    'api_keys',         false),
  ('ADMIN.DELETE.api_keys',         'Revoke API keys',           'Revoke API keys',                             'ADMIN', 'DELETE',    'api_keys',         false)

ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- Done. Permissions administration layer is ready.
-- ============================================================================

COMMIT;
