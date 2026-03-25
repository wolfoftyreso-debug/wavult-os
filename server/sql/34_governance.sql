-- ============================================================================
-- Wavult Governance Foundation v1
-- Audit agents, health checks, system reports
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AUDIT_RUNS — Logg över alla governance-körningar
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_runs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type      TEXT    NOT NULL CHECK (agent_type IN (
                    'LEDGER_AUDITOR','PAYMENT_AUDITOR','SYSTEM_HEALTH',
                    'SECURITY_SCAN','COMPLIANCE_CHECK','COST_OPTIMIZER'
                  )),
  org_id          UUID,   -- NULL = kör för hela systemet
  status          TEXT    NOT NULL DEFAULT 'RUNNING' CHECK (status IN (
                    'RUNNING','COMPLETED','FAILED','PARTIAL'
                  )),
  -- Resultat
  issues_found    INT     DEFAULT 0,
  warnings        INT     DEFAULT 0,
  checks_passed   INT     DEFAULT 0,
  -- Rapport
  report          JSONB   DEFAULT '{}',
  summary         TEXT,
  risk_level      TEXT    CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  -- Timing
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INT
);

-- ============================================================================
-- 2. AUDIT_ISSUES — Specifika problem hittade av agents
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_issues (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID    NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  agent_type      TEXT    NOT NULL,
  severity        TEXT    NOT NULL CHECK (severity IN ('INFO','WARNING','ERROR','CRITICAL')),
  category        TEXT    NOT NULL,   -- 'double_entry','stuck_payment','missing_fx_rate' etc
  title           TEXT    NOT NULL,
  description     TEXT,
  affected_id     UUID,               -- ID på den påverkade resursen
  affected_table  TEXT,               -- vilken tabell
  suggested_fix   TEXT,
  is_resolved     BOOLEAN DEFAULT false,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID,
  metadata        JSONB   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. SYSTEM_METRICS — Snapshots av systemhälsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_metrics (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at     TIMESTAMPTZ DEFAULT now(),
  -- Payment metrics
  payments_created_24h    INT DEFAULT 0,
  payments_settled_24h    INT DEFAULT 0,
  payments_failed_24h     INT DEFAULT 0,
  payment_success_rate    NUMERIC(5,2) DEFAULT 0,
  -- Ledger metrics
  journal_entries_posted_24h INT DEFAULT 0,
  -- Billing metrics
  usage_events_24h        INT DEFAULT 0,
  usage_events_unsynced   INT DEFAULT 0,
  invoices_finalized_24h  INT DEFAULT 0,
  -- PSP metrics
  psp_revolut_success_rate  NUMERIC(5,2),
  psp_stripe_success_rate   NUMERIC(5,2),
  -- System
  open_issues             INT DEFAULT 0,
  critical_issues         INT DEFAULT 0
);

-- ============================================================================
-- 4. IMPROVEMENT_PLANS — 10-punkts förbättringsplaner
-- ============================================================================
CREATE TABLE IF NOT EXISTS improvement_plans (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at    TIMESTAMPTZ DEFAULT now(),
  based_on_runs   UUID[]  DEFAULT '{}',   -- audit_run IDs denna plan baseras på
  status          TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
                    'ACTIVE','IN_PROGRESS','COMPLETED','SUPERSEDED'
                  )),
  items           JSONB   NOT NULL DEFAULT '[]',
  -- Varje item i items[] har:
  -- { rank, root_cause, fix, expected_impact, kpi, deadline, status }
  summary         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_runs_agent_type  ON audit_runs(agent_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_runs_status      ON audit_runs(status);
CREATE INDEX IF NOT EXISTS idx_audit_issues_run_id    ON audit_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_issues_severity  ON audit_issues(severity) WHERE NOT is_resolved;
CREATE INDEX IF NOT EXISTS idx_system_metrics_time    ON system_metrics(captured_at DESC);

-- ============================================================================
-- 6. RLS
-- ============================================================================
ALTER TABLE audit_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_issues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_plans  ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_runs_svc    ON audit_runs         FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY audit_issues_svc  ON audit_issues        FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY metrics_svc       ON system_metrics      FOR ALL USING (current_setting('role', TRUE) = 'service_role');
CREATE POLICY plans_svc         ON improvement_plans   FOR ALL USING (current_setting('role', TRUE) = 'service_role');
-- Read-access för alla (dashboard)
CREATE POLICY audit_runs_read   ON audit_runs    FOR SELECT USING (true);
CREATE POLICY audit_issues_read ON audit_issues  FOR SELECT USING (true);
CREATE POLICY metrics_read      ON system_metrics FOR SELECT USING (true);
CREATE POLICY plans_read        ON improvement_plans FOR SELECT USING (true);

COMMIT;
