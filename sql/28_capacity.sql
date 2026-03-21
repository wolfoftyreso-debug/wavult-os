-- ============================================================================
-- Hypbit OMS — Capacity & Workforce Engine
-- File: 28_capacity.sql
-- Run: AFTER 27_agreements.sql
--
-- Capacity planning, time tracking, workforce simulations, and gap analysis.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE role_category AS ENUM (
    'PRODUCTION', 'SUPPORT', 'MANAGEMENT', 'SPECIALIST', 'ADMINISTRATIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE time_entry_category AS ENUM (
    'PRODUCTION', 'INDIRECT', 'OVERHEAD', 'ABSENCE', 'TRAINING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE snapshot_type AS ENUM (
    'DAILY_AUTO', 'WEEKLY', 'MONTHLY', 'QUARTERLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE simulation_status AS ENUM (
    'DRAFT', 'CALCULATED', 'REVIEWED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workforce_plan_status AS ENUM (
    'DRAFT', 'ACTIVE', 'APPROVED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 role_capacity_profiles — Template capacity split per role
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_capacity_profiles (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID          NOT NULL REFERENCES organizations(id),
  role_code             TEXT          NOT NULL,
  job_description_id    UUID          REFERENCES job_descriptions(id),
  production_pct        NUMERIC(5,2)  NOT NULL DEFAULT 60,
  indirect_pct          NUMERIC(5,2)  NOT NULL DEFAULT 25,
  overhead_pct          NUMERIC(5,2)  NOT NULL DEFAULT 15,
  default_hours_per_month NUMERIC(6,2) NOT NULL DEFAULT 160,
  default_cost_per_hour NUMERIC(10,2),
  cost_currency         TEXT          NOT NULL DEFAULT 'EUR',
  role_category         role_category NOT NULL DEFAULT 'PRODUCTION',
  is_billable           BOOLEAN       NOT NULL DEFAULT false,
  default_bill_rate     NUMERIC(10,2),
  revenue_generating    BOOLEAN       NOT NULL DEFAULT false,
  metadata              JSONB         DEFAULT '{}',
  created_at            TIMESTAMPTZ   DEFAULT now(),
  updated_at            TIMESTAMPTZ   DEFAULT now(),
  UNIQUE(org_id, role_code),
  CONSTRAINT chk_capacity_pct_sum CHECK (
    ABS(production_pct + indirect_pct + overhead_pct - 100) < 0.5
  )
);

-- ---------------------------------------------------------------------------
-- 2.2 user_capacity — Per-user capacity allocation and actuals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_capacity (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID          NOT NULL REFERENCES organizations(id),
  user_id                     UUID          NOT NULL REFERENCES profiles(id),
  role_capacity_profile_id    UUID          REFERENCES role_capacity_profiles(id),
  production_pct_override     NUMERIC(5,2),
  indirect_pct_override       NUMERIC(5,2),
  overhead_pct_override       NUMERIC(5,2),
  hours_per_month_override    NUMERIC(6,2),
  cost_per_hour_override      NUMERIC(10,2),
  actual_production_pct       NUMERIC(5,2),
  actual_indirect_pct         NUMERIC(5,2),
  actual_overhead_pct         NUMERIC(5,2),
  actual_hours_logged         NUMERIC(6,2),
  last_calculated_at          TIMESTAMPTZ,
  employment_percentage       NUMERIC(5,2)  NOT NULL DEFAULT 100,
  planned_absence_days_next_30 INTEGER      NOT NULL DEFAULT 0,
  effective_capacity_hours    NUMERIC(6,2),
  metadata                    JSONB         DEFAULT '{}',
  created_at                  TIMESTAMPTZ   DEFAULT now(),
  updated_at                  TIMESTAMPTZ   DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 2.3 time_entries — Individual time tracking records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entries (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID                NOT NULL REFERENCES organizations(id),
  user_id       UUID                NOT NULL REFERENCES profiles(id),
  entry_date    DATE                NOT NULL,
  hours         NUMERIC(5,2)        NOT NULL,
  category      time_entry_category NOT NULL,
  subcategory   TEXT,
  task_id       UUID,
  deal_id       UUID,
  process_id    UUID,
  description   TEXT,
  is_billable   BOOLEAN             NOT NULL DEFAULT false,
  bill_rate     NUMERIC(10,2),
  billed_amount NUMERIC(10,2),
  approved      BOOLEAN             NOT NULL DEFAULT false,
  approved_by   UUID                REFERENCES profiles(id),
  created_at    TIMESTAMPTZ         DEFAULT now(),
  updated_at    TIMESTAMPTZ         DEFAULT now(),
  CONSTRAINT chk_hours_positive CHECK (hours > 0 AND hours <= 24)
);

-- ---------------------------------------------------------------------------
-- 2.4 capacity_snapshots — Point-in-time org capacity records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capacity_snapshots (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID          NOT NULL REFERENCES organizations(id),
  snapshot_date               DATE          NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type               snapshot_type NOT NULL DEFAULT 'DAILY_AUTO',
  total_headcount             INTEGER,
  total_fte                   NUMERIC(6,2),
  total_capacity_hours        NUMERIC(8,2),
  total_production_hours      NUMERIC(8,2),
  total_indirect_hours        NUMERIC(8,2),
  total_overhead_hours        NUMERIC(8,2),
  production_pct              NUMERIC(5,2),
  indirect_pct                NUMERIC(5,2),
  overhead_pct                NUMERIC(5,2),
  total_cost                  NUMERIC(12,2),
  cost_per_productive_hour    NUMERIC(10,2),
  cost_currency               TEXT          DEFAULT 'EUR',
  total_revenue               NUMERIC(12,2),
  revenue_per_employee        NUMERIC(10,2),
  revenue_per_productive_hour NUMERIC(10,2),
  role_mix                    JSONB,
  category_mix                JSONB,
  per_user_data               JSONB,
  previous_snapshot_id        UUID          REFERENCES capacity_snapshots(id),
  delta_headcount             INTEGER,
  delta_production_pct        NUMERIC(5,2),
  delta_cost                  NUMERIC(12,2),
  metadata                    JSONB         DEFAULT '{}',
  created_at                  TIMESTAMPTZ   DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.5 capacity_simulations — What-if scenario modelling
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capacity_simulations (
  id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID              NOT NULL REFERENCES organizations(id),
  title                     TEXT              NOT NULL,
  description               TEXT,
  status                    simulation_status NOT NULL DEFAULT 'DRAFT',
  created_by                UUID              REFERENCES profiles(id),
  baseline_snapshot_id      UUID              REFERENCES capacity_snapshots(id),
  baseline_headcount        INTEGER,
  baseline_production_hours NUMERIC(8,2),
  baseline_cost             NUMERIC(12,2),
  baseline_revenue          NUMERIC(12,2),
  scenarios                 JSONB             NOT NULL DEFAULT '[]',
  ai_recommendation         JSONB,
  metadata                  JSONB             DEFAULT '{}',
  created_at                TIMESTAMPTZ       DEFAULT now(),
  updated_at                TIMESTAMPTZ       DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.6 workforce_plans — Strategic workforce planning
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workforce_plans (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID                  NOT NULL REFERENCES organizations(id),
  title             TEXT                  NOT NULL,
  period_start      DATE                  NOT NULL,
  period_end        DATE                  NOT NULL,
  status            workforce_plan_status NOT NULL DEFAULT 'DRAFT',
  required_capacity JSONB                 NOT NULL DEFAULT '[]',
  current_capacity  JSONB                 NOT NULL DEFAULT '[]',
  gap               JSONB                 NOT NULL DEFAULT '[]',
  estimated_cost    NUMERIC(12,2),
  approved_budget   NUMERIC(12,2),
  cost_currency     TEXT                  NOT NULL DEFAULT 'EUR',
  goal_ids          UUID[]                DEFAULT '{}',
  approved_by       UUID                  REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  metadata          JSONB                 DEFAULT '{}',
  created_at        TIMESTAMPTZ           DEFAULT now(),
  updated_at        TIMESTAMPTZ           DEFAULT now()
);

-- ============================================================================
-- 3. VIEWS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 v_current_capacity — Per-user current capacity with overrides resolved
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_current_capacity AS
SELECT
  uc.id,
  uc.org_id,
  uc.user_id,
  p.full_name,
  p.email,
  jd.title        AS job_title,
  jd.department,
  rcp.role_code,
  rcp.role_category,
  COALESCE(uc.production_pct_override, rcp.production_pct, 60)  AS production_pct,
  COALESCE(uc.indirect_pct_override,   rcp.indirect_pct,   25)  AS indirect_pct,
  COALESCE(uc.overhead_pct_override,   rcp.overhead_pct,   15)  AS overhead_pct,
  COALESCE(uc.hours_per_month_override, rcp.default_hours_per_month, 160)
    * (uc.employment_percentage / 100.0)                          AS effective_hours,
  COALESCE(uc.hours_per_month_override, rcp.default_hours_per_month, 160)
    * (uc.employment_percentage / 100.0)
    * COALESCE(uc.production_pct_override, rcp.production_pct, 60) / 100.0
                                                                  AS production_hours,
  COALESCE(uc.cost_per_hour_override, rcp.default_cost_per_hour, 0)
    * COALESCE(uc.hours_per_month_override, rcp.default_hours_per_month, 160)
    * (uc.employment_percentage / 100.0)                          AS monthly_cost,
  CASE
    WHEN COALESCE(uc.hours_per_month_override, rcp.default_hours_per_month, 160) > 0
         AND uc.actual_hours_logged IS NOT NULL
    THEN (uc.actual_production_pct / COALESCE(uc.production_pct_override, rcp.production_pct, 60)) * 100
    ELSE NULL
  END                                                             AS utilization,
  uc.actual_production_pct,
  uc.actual_indirect_pct,
  uc.actual_overhead_pct,
  uc.actual_hours_logged,
  uc.employment_percentage,
  uc.planned_absence_days_next_30,
  uc.effective_capacity_hours,
  uc.last_calculated_at,
  COALESCE(rcp.is_billable, false)                                AS is_billable,
  rcp.default_bill_rate,
  rcp.revenue_generating
FROM user_capacity uc
JOIN profiles p              ON p.id = uc.user_id
LEFT JOIN role_capacity_profiles rcp ON rcp.id = uc.role_capacity_profile_id
LEFT JOIN user_job_assignments uja  ON uja.user_id = uc.user_id
                                   AND uja.org_id  = uc.org_id
                                   AND uja.is_primary = true
                                   AND (uja.end_date IS NULL OR uja.end_date >= CURRENT_DATE)
LEFT JOIN job_descriptions jd       ON jd.id = uja.job_description_id;

-- ---------------------------------------------------------------------------
-- 3.2 v_org_capacity_summary — Aggregated org-level capacity metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_org_capacity_summary AS
SELECT
  org_id,
  COUNT(*)                                                AS headcount,
  SUM(employment_percentage / 100.0)                      AS fte,
  SUM(effective_hours)                                    AS total_hours,
  SUM(production_hours)                                   AS production_hours,
  CASE WHEN SUM(effective_hours) > 0
       THEN ROUND(SUM(production_hours) / SUM(effective_hours) * 100, 2)
       ELSE 0 END                                         AS production_pct,
  SUM(monthly_cost)                                       AS total_monthly_cost,
  CASE WHEN SUM(production_hours) > 0
       THEN ROUND(SUM(monthly_cost) / SUM(production_hours), 2)
       ELSE 0 END                                         AS cost_per_production_hour,
  COUNT(*) FILTER (WHERE role_category = 'PRODUCTION')    AS production_roles,
  COUNT(*) FILTER (WHERE role_category = 'SUPPORT')       AS support_roles,
  COUNT(*) FILTER (WHERE role_category = 'MANAGEMENT')    AS management_roles,
  COUNT(*) FILTER (WHERE role_category = 'SPECIALIST')    AS specialist_roles,
  COUNT(*) FILTER (WHERE role_category = 'ADMINISTRATIVE') AS administrative_roles
FROM v_current_capacity
GROUP BY org_id;

-- ---------------------------------------------------------------------------
-- 3.3 v_capacity_utilization — Actual vs target utilization per user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_capacity_utilization AS
SELECT
  id,
  org_id,
  user_id,
  full_name,
  role_code,
  production_pct                                          AS target_production_pct,
  actual_production_pct,
  CASE WHEN production_pct > 0 AND actual_production_pct IS NOT NULL
       THEN ROUND(actual_production_pct - production_pct, 2)
       ELSE NULL END                                      AS variance,
  CASE
    WHEN actual_production_pct IS NULL                    THEN 'NO_DATA'
    WHEN actual_production_pct >= production_pct - 5      THEN 'ON_TARGET'
    WHEN actual_production_pct >= production_pct - 15     THEN 'BELOW_TARGET'
    ELSE 'CRITICAL'
  END                                                     AS utilization_status
FROM v_current_capacity;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- role_capacity_profiles
CREATE INDEX IF NOT EXISTS idx_role_capacity_profiles_org
  ON role_capacity_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_role_capacity_profiles_job
  ON role_capacity_profiles(job_description_id);

-- user_capacity
CREATE INDEX IF NOT EXISTS idx_user_capacity_org
  ON user_capacity(org_id);
CREATE INDEX IF NOT EXISTS idx_user_capacity_user
  ON user_capacity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_capacity_profile
  ON user_capacity(role_capacity_profile_id);

-- time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_org
  ON time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user
  ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date
  ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_task
  ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_deal
  ON time_entries(deal_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_process
  ON time_entries(process_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by
  ON time_entries(approved_by);

-- capacity_snapshots
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_org
  ON capacity_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_date
  ON capacity_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_prev
  ON capacity_snapshots(previous_snapshot_id);

-- capacity_simulations
CREATE INDEX IF NOT EXISTS idx_capacity_simulations_org
  ON capacity_simulations(org_id);
CREATE INDEX IF NOT EXISTS idx_capacity_simulations_creator
  ON capacity_simulations(created_by);
CREATE INDEX IF NOT EXISTS idx_capacity_simulations_baseline
  ON capacity_simulations(baseline_snapshot_id);

-- workforce_plans
CREATE INDEX IF NOT EXISTS idx_workforce_plans_org
  ON workforce_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_workforce_plans_approved_by
  ON workforce_plans(approved_by);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE role_capacity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_capacity          ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_simulations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_plans        ENABLE ROW LEVEL SECURITY;

-- role_capacity_profiles
CREATE POLICY rcp_select ON role_capacity_profiles FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY rcp_insert ON role_capacity_profiles FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY rcp_update ON role_capacity_profiles FOR UPDATE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY rcp_delete ON role_capacity_profiles FOR DELETE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);

-- user_capacity
CREATE POLICY uc_select ON user_capacity FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY uc_insert ON user_capacity FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY uc_update ON user_capacity FOR UPDATE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY uc_delete ON user_capacity FOR DELETE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);

-- time_entries
CREATE POLICY te_select ON time_entries FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY te_insert ON time_entries FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY te_update ON time_entries FOR UPDATE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY te_delete ON time_entries FOR DELETE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);

-- capacity_snapshots
CREATE POLICY cs_select ON capacity_snapshots FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY cs_insert ON capacity_snapshots FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY cs_update ON capacity_snapshots FOR UPDATE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY cs_delete ON capacity_snapshots FOR DELETE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);

-- capacity_simulations
CREATE POLICY csim_select ON capacity_simulations FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY csim_insert ON capacity_simulations FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY csim_update ON capacity_simulations FOR UPDATE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY csim_delete ON capacity_simulations FOR DELETE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);

-- workforce_plans
CREATE POLICY wp_select ON workforce_plans FOR SELECT
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY wp_insert ON workforce_plans FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY wp_update ON workforce_plans FOR UPDATE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);
CREATE POLICY wp_delete ON workforce_plans FOR DELETE
  USING (org_id = (current_setting('app.current_org_id', true))::uuid);

-- ============================================================================
-- 6. SEED DATA — Wavult role capacity profiles
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name ILIKE '%wavult%' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Wavult organization not found — skipping capacity seed data';
    RETURN;
  END IF;

  -- EXECUTIVE: 30% production, 40% indirect, 30% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'EXECUTIVE', 30, 40, 30, 'MANAGEMENT', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- QUALITY_MANAGER: 50% production, 35% indirect, 15% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'QUALITY_MANAGER', 50, 35, 15, 'MANAGEMENT', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- FINANCE_CONTROLLER: 60% production, 25% indirect, 15% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'FINANCE_CONTROLLER', 60, 25, 15, 'SPECIALIST', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- IT: 70% production, 20% indirect, 10% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'IT', 70, 20, 10, 'SUPPORT', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- OPERATIONS_MANAGER: 55% production, 30% indirect, 15% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'OPERATIONS_MANAGER', 55, 30, 15, 'MANAGEMENT', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- DEV: 75% production, 15% indirect, 10% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'DEV', 75, 15, 10, 'PRODUCTION', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- INTERNAL_AUDITOR: 60% production, 30% indirect, 10% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'INTERNAL_AUDITOR', 60, 30, 10, 'SPECIALIST', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- HR_MANAGER: 40% production, 35% indirect, 25% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'HR_MANAGER', 40, 35, 25, 'ADMINISTRATIVE', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- PROCESS_OWNER: 65% production, 25% indirect, 10% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'PROCESS_OWNER', 65, 25, 10, 'PRODUCTION', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  -- EMPLOYEE: 70% production, 20% indirect, 10% overhead
  INSERT INTO role_capacity_profiles (org_id, role_code, production_pct, indirect_pct, overhead_pct, role_category, default_hours_per_month)
  VALUES (v_org_id, 'EMPLOYEE', 70, 20, 10, 'PRODUCTION', 160)
  ON CONFLICT (org_id, role_code) DO NOTHING;

  RAISE NOTICE 'Wavult capacity seed data inserted successfully';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Capacity seed data error: % — %', SQLERRM, SQLSTATE;
END $$;

COMMIT;
