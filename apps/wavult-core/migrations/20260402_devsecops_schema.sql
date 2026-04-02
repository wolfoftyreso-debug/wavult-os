-- ============================================================
-- DevSecOps Deployment Control System
-- All tables are append-only (no UPDATE/DELETE on audit_logs)
-- ============================================================

-- USERS & RBAC
CREATE TABLE IF NOT EXISTS deploy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('dev', 'reviewer', 'admin')),
  gpg_key_fingerprint TEXT,
  public_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial users
INSERT INTO deploy_users (username, full_name, email, role) VALUES
  ('erik',    'Erik Svensson',    'erik@wavult.com',    'admin'),
  ('johan',   'Johan Berglund',   'johan@wavult.com',   'admin'),
  ('dennis',  'Dennis Bjarnemark','dennis@wavult.com',  'reviewer'),
  ('winston', 'Winston Bjarnemark','winston@wavult.com','reviewer'),
  ('leon',    'Leon Russo',       'leon@wavult.com',    'dev')
ON CONFLICT (username) DO NOTHING;

-- ARTIFACTS — versioned build outputs
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  version TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  commit_author TEXT,
  commit_message TEXT,
  gpg_signature TEXT,
  gpg_verified BOOLEAN DEFAULT false,
  s3_key TEXT,
  sha256_checksum TEXT NOT NULL,
  build_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_name, version)
);

-- DEPLOYMENTS
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id),
  service_name TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('dev', 'staging', 'production')),
  commit_hash TEXT NOT NULL,
  artifact_version TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','deploying','deployed','failed','rolled_back')),
  requested_by TEXT NOT NULL REFERENCES deploy_users(username),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  deployed_by TEXT,
  rollback_target_id UUID REFERENCES deployments(id),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT production_requires_admin CHECK (
    environment != 'production' OR
    requested_by IN (SELECT username FROM deploy_users WHERE role = 'admin')
  )
);

-- APPROVALS — must collect before deploy executes
CREATE TABLE IF NOT EXISTS deployment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id),
  approved_by TEXT NOT NULL REFERENCES deploy_users(username),
  role_at_time TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deployment_id, approved_by)
);

-- AUDIT LOG — append only, NO updates/deletes ever
CREATE TABLE IF NOT EXISTS deploy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  deployment_id UUID,
  environment TEXT,
  service_name TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical'))
);

-- Prevent modifications to audit log
CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO deploy_audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO deploy_audit_log DO INSTEAD NOTHING;

-- APPROVAL REQUIREMENTS per environment
CREATE TABLE IF NOT EXISTS approval_policies (
  environment TEXT PRIMARY KEY,
  required_approvals INT NOT NULL,
  require_admin BOOLEAN DEFAULT false,
  require_different_from_requester BOOLEAN DEFAULT true
);

INSERT INTO approval_policies VALUES
  ('dev',        0, false, false),
  ('staging',    1, false, true),
  ('production', 2, true,  true)
ON CONFLICT (environment) DO NOTHING;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_dep_status   ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_dep_env      ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_dep_service  ON deployments(service_name);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON deploy_audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON deploy_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON deploy_audit_log(action);
