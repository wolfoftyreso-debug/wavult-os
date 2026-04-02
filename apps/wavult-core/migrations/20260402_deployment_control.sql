-- Deployment version control + approval gate
-- Two-step: request → CEO/CTO approve → GitHub Actions execute
-- Every production change is versioned and reversible

CREATE TABLE IF NOT EXISTS deployment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  version_number INT NOT NULL,
  cloudfront_distribution_id TEXT,
  s3_bucket TEXT,
  s3_key TEXT,
  origin_path TEXT,
  default_root_object TEXT,
  previous_version_id UUID,
  deployed_at TIMESTAMPTZ,
  deployed_by TEXT,
  status TEXT DEFAULT 'active',    -- active, superseded, rolled_back
  snapshot JSONB DEFAULT '{}',     -- full CF config snapshot for rollback
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, version_number)
);

CREATE TABLE IF NOT EXISTS deployment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  target_s3_bucket TEXT,
  target_s3_key TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',   -- pending, approved, rejected, deployed, rolled_back
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  deployment_version_id UUID REFERENCES deployment_versions(id),
  CONSTRAINT require_approval CHECK (
    status = 'pending' OR
    (status IN ('approved','deployed') AND approved_by IS NOT NULL) OR
    (status = 'rejected' AND rejected_reason IS NOT NULL) OR
    status = 'rolled_back'
  )
);

CREATE INDEX IF NOT EXISTS idx_dr_domain ON deployment_requests(domain);
CREATE INDEX IF NOT EXISTS idx_dr_status ON deployment_requests(status);
CREATE INDEX IF NOT EXISTS idx_dv_domain ON deployment_versions(domain);
CREATE INDEX IF NOT EXISTS idx_dv_domain_status ON deployment_versions(domain, status);
