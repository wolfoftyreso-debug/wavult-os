-- =============================================================================
-- Module 32: Sampling & Impartiality Engine
-- Hypbit OMS Certified
--
-- Covers:
--   1. Statistical Sampling Plans (AQL, LTPD, skip-lot, tightened/reduced)
--   2. Impartiality Management (ISO 17020/17025 compliance)
--   3. Conflict of Interest declarations
--   4. Auditor/Inspector independence verification
--   5. Random assignment of inspectors/auditors
--   6. Sampling execution & results tracking
--   7. Witness/supervision sampling
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE sampling_plan_type AS ENUM (
    'AQL_SINGLE',           -- ISO 2859-1 single sampling
    'AQL_DOUBLE',           -- ISO 2859-1 double sampling
    'AQL_MULTIPLE',         -- ISO 2859-1 multiple sampling
    'LTPD',                 -- Lot Tolerance Percent Defective
    'SKIP_LOT',             -- Skip-lot sampling (ISO 2859-3)
    'CONTINUOUS',           -- Continuous sampling (CSP)
    'VARIABLES',            -- Variables sampling (ISO 3951)
    'CUSTOM'                -- Organization-defined
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sampling_severity AS ENUM (
    'REDUCED',              -- After proven quality history
    'NORMAL',               -- Standard inspection level
    'TIGHTENED',            -- After quality deterioration
    'MANDATORY_100'         -- 100% inspection required
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE impartiality_risk_level AS ENUM (
    'NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE coi_status AS ENUM (
    'DECLARED', 'UNDER_REVIEW', 'MITIGATED', 'ACCEPTED', 'REJECTED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE coi_type AS ENUM (
    'FINANCIAL',            -- Financial interest in outcome
    'PERSONAL',             -- Personal relationship
    'ORGANIZATIONAL',       -- Former/current employer
    'COMPETITIVE',          -- Competitor involvement
    'FAMILIARITY',          -- Long-term repeated engagement
    'INTIMIDATION',         -- Pressure from auditee
    'SELF_REVIEW',          -- Reviewing own work
    'ADVOCACY'              -- Promoting a position
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE independence_level AS ENUM (
    'FULL',                 -- Completely independent
    'SUPERVISED',           -- Independent but supervised
    'WITNESSED',            -- Witnessed by independent party
    'RESTRICTED',           -- Some restrictions apply
    'NOT_INDEPENDENT'       -- Cannot perform this activity
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Sampling Plans — Reusable statistical sampling configurations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sampling_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Plan identity
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  plan_type       sampling_plan_type NOT NULL DEFAULT 'AQL_SINGLE',
  -- ISO 2859-1 parameters
  aql             NUMERIC(5,2),                -- Acceptable Quality Level (e.g. 1.0, 2.5, 4.0)
  inspection_level TEXT DEFAULT 'II',           -- I, II, III, S-1, S-2, S-3, S-4
  lot_size_min    INT,
  lot_size_max    INT,
  sample_size     INT,                         -- Calculated or manual
  accept_number   INT,                         -- Ac (accept if defects <= this)
  reject_number   INT,                         -- Re (reject if defects >= this)
  -- Severity switching rules
  current_severity sampling_severity NOT NULL DEFAULT 'NORMAL',
  switch_to_tightened_after INT DEFAULT 2,     -- consecutive rejected lots
  switch_to_reduced_after   INT DEFAULT 5,     -- consecutive accepted lots
  switch_to_normal_after    INT DEFAULT 1,     -- rejected lot in reduced
  -- Skip-lot parameters (ISO 2859-3)
  skip_lot_eligible  BOOLEAN NOT NULL DEFAULT false,
  skip_lot_frequency INT DEFAULT 5,            -- inspect 1 in N lots
  skip_lot_min_accepted INT DEFAULT 10,        -- lots accepted before skip-lot
  -- Scope
  applies_to      TEXT[],                      -- product types, categories, suppliers
  -- Active
  is_active       BOOLEAN NOT NULL DEFAULT true,
  iso_reference   TEXT,                        -- 'ISO 2859-1', 'ISO 3951', etc.
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sampling_plans_org ON sampling_plans(org_id);

-- ---------------------------------------------------------------------------
-- 2. Sampling Executions — Actual sampling events with results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sampling_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES sampling_plans(id) ON DELETE RESTRICT,
  -- Context
  lot_number      TEXT,
  lot_size        INT NOT NULL,
  sample_size     INT NOT NULL,
  -- Inspector
  inspector_id    UUID NOT NULL REFERENCES users(id),
  supervisor_id   UUID REFERENCES users(id),   -- For supervised/witnessed sampling
  -- Linked entity
  linked_entity_type TEXT,                     -- 'receiving_inspection', 'production_lot', etc.
  linked_entity_id   UUID,
  supplier_id     UUID,                        -- If incoming inspection
  -- Results
  items_inspected INT NOT NULL DEFAULT 0,
  items_conforming INT NOT NULL DEFAULT 0,
  items_nonconforming INT NOT NULL DEFAULT 0,
  defect_details  JSONB NOT NULL DEFAULT '[]', -- [{type, count, severity, description}]
  -- Decision
  accept_number   INT NOT NULL,
  reject_number   INT NOT NULL,
  result          TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
  severity_used   sampling_severity NOT NULL,
  severity_after  sampling_severity,            -- New severity after this lot
  -- Impartiality
  independence_verified BOOLEAN NOT NULL DEFAULT false,
  coi_check_id    UUID,                        -- Reference to COI check
  -- Evidence
  evidence_files  JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  -- Timing
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sampling_exec_org ON sampling_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_sampling_exec_plan ON sampling_executions(plan_id);
CREATE INDEX IF NOT EXISTS idx_sampling_exec_inspector ON sampling_executions(inspector_id);
CREATE INDEX IF NOT EXISTS idx_sampling_exec_supplier ON sampling_executions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sampling_exec_result ON sampling_executions(org_id, result);

-- Auto-determine result
CREATE OR REPLACE FUNCTION calc_sampling_result()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.items_nonconforming <= NEW.accept_number THEN
    NEW.result := 'ACCEPTED';
  ELSIF NEW.items_nonconforming >= NEW.reject_number THEN
    NEW.result := 'REJECTED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sampling_result ON sampling_executions;
CREATE TRIGGER trg_sampling_result
  BEFORE INSERT OR UPDATE OF items_nonconforming ON sampling_executions
  FOR EACH ROW EXECUTE FUNCTION calc_sampling_result();

-- ---------------------------------------------------------------------------
-- 3. Severity History — Track switching between normal/tightened/reduced
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sampling_severity_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES sampling_plans(id) ON DELETE CASCADE,
  supplier_id     UUID,
  product_category TEXT,
  -- Transition
  from_severity   sampling_severity NOT NULL,
  to_severity     sampling_severity NOT NULL,
  reason          TEXT NOT NULL,
  -- Trigger data
  consecutive_accepted INT DEFAULT 0,
  consecutive_rejected INT DEFAULT 0,
  execution_id    UUID REFERENCES sampling_executions(id),
  changed_by      UUID REFERENCES users(id),
  --
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_severity_hist_plan ON sampling_severity_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_severity_hist_supplier ON sampling_severity_history(supplier_id);

-- ---------------------------------------------------------------------------
-- 4. Impartiality Declarations — Personnel impartiality status
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impartiality_declarations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Declaration
  declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until      DATE,                       -- Annual renewal typically
  -- Scope
  role_context    TEXT NOT NULL,               -- 'internal_auditor', 'inspector', 'calibrator', etc.
  scope_description TEXT,                      -- What they're declared impartial for
  -- Self-assessment
  has_financial_interests   BOOLEAN NOT NULL DEFAULT false,
  has_personal_relationships BOOLEAN NOT NULL DEFAULT false,
  has_organizational_ties   BOOLEAN NOT NULL DEFAULT false,
  has_competitive_interests BOOLEAN NOT NULL DEFAULT false,
  -- Details if any declared
  declared_interests JSONB NOT NULL DEFAULT '[]', -- [{type, description, entity, mitigation}]
  -- Risk assessment
  risk_level      impartiality_risk_level NOT NULL DEFAULT 'NONE',
  risk_assessment TEXT,
  -- Approval
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  approval_notes  TEXT,
  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,
  --
  iso_reference   TEXT DEFAULT 'ISO 17020:2012 §4.1, ISO 17025:2017 §4.1',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impartiality_org ON impartiality_declarations(org_id);
CREATE INDEX IF NOT EXISTS idx_impartiality_user ON impartiality_declarations(user_id);
CREATE INDEX IF NOT EXISTS idx_impartiality_active ON impartiality_declarations(org_id, is_active);

-- ---------------------------------------------------------------------------
-- 5. Conflict of Interest (COI) — Per-assignment COI checks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conflict_of_interest (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Who
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- What
  coi_type        coi_type NOT NULL,
  description     TEXT NOT NULL,
  -- Context
  activity_type   TEXT NOT NULL,               -- 'audit', 'inspection', 'calibration', 'sampling'
  entity_type     TEXT,                        -- 'supplier', 'process', 'department', 'product'
  entity_id       UUID,
  entity_name     TEXT,
  -- Risk
  risk_level      impartiality_risk_level NOT NULL DEFAULT 'LOW',
  -- Mitigation
  mitigation_plan TEXT,
  mitigation_actions JSONB NOT NULL DEFAULT '[]', -- [{action, responsible, deadline, status}]
  -- Status
  status          coi_status NOT NULL DEFAULT 'DECLARED',
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  -- Resolution
  resolution      TEXT,                        -- 'reassign', 'supervise', 'accept_risk', 'block'
  resolved_at     TIMESTAMPTZ,
  --
  iso_reference   TEXT DEFAULT 'ISO 17020:2012 §4.1.3',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coi_org ON conflict_of_interest(org_id);
CREATE INDEX IF NOT EXISTS idx_coi_user ON conflict_of_interest(user_id);
CREATE INDEX IF NOT EXISTS idx_coi_status ON conflict_of_interest(status);
CREATE INDEX IF NOT EXISTS idx_coi_entity ON conflict_of_interest(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 6. Independence Matrix — Who can inspect/audit what
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS independence_matrix (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Person
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Scope
  activity_type   TEXT NOT NULL,               -- 'audit', 'inspection', 'calibration', 'sampling'
  entity_type     TEXT NOT NULL,               -- 'department', 'process', 'supplier', 'product'
  entity_id       UUID,
  entity_name     TEXT,
  -- Independence
  independence_level independence_level NOT NULL DEFAULT 'FULL',
  reason          TEXT,                        -- Why this level
  -- Restrictions
  restrictions    JSONB NOT NULL DEFAULT '[]', -- [{restriction, reason, valid_until}]
  requires_supervision BOOLEAN NOT NULL DEFAULT false,
  supervisor_id   UUID REFERENCES users(id),
  -- Validity
  valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  -- Rotation
  last_assigned_at TIMESTAMPTZ,
  assignment_count INT NOT NULL DEFAULT 0,
  max_consecutive_assignments INT DEFAULT 3,   -- Rotation after N assignments
  cooldown_months INT DEFAULT 12,              -- Cooldown before re-assignment
  --
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id, activity_type, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_indep_matrix_org ON independence_matrix(org_id);
CREATE INDEX IF NOT EXISTS idx_indep_matrix_user ON independence_matrix(user_id);
CREATE INDEX IF NOT EXISTS idx_indep_matrix_entity ON independence_matrix(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 7. Inspector/Auditor Pool — Qualified personnel for random assignment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspector_pool (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Qualifications
  activity_types  TEXT[] NOT NULL DEFAULT '{}', -- ['inspection', 'audit', 'calibration']
  competence_areas TEXT[] NOT NULL DEFAULT '{}', -- product/process types qualified for
  qualification_level TEXT,                     -- 'trainee', 'qualified', 'senior', 'lead'
  -- Certifications
  certifications  JSONB NOT NULL DEFAULT '[]',  -- [{cert, number, issuer, valid_until}]
  -- Availability
  is_available    BOOLEAN NOT NULL DEFAULT true,
  availability_schedule JSONB,                  -- Weekly availability
  max_hours_per_week NUMERIC(4,1) DEFAULT 40,
  current_hours_this_week NUMERIC(4,1) DEFAULT 0,
  -- Impartiality
  impartiality_declaration_id UUID REFERENCES impartiality_declarations(id),
  impartiality_valid_until DATE,
  -- Performance
  total_assignments INT NOT NULL DEFAULT 0,
  accuracy_rate   NUMERIC(5,2),                 -- Based on reviewed results
  avg_completion_hours NUMERIC(5,1),
  -- Language
  languages       TEXT[] DEFAULT '{sv,en}',
  --
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_inspector_pool_org ON inspector_pool(org_id);
CREATE INDEX IF NOT EXISTS idx_inspector_pool_active ON inspector_pool(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inspector_pool_types ON inspector_pool USING gin(activity_types);

-- ---------------------------------------------------------------------------
-- 8. Assignment Requests — Random/weighted assignment of inspectors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspector_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- What needs inspection
  activity_type   TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  entity_name     TEXT,
  -- Requirements
  required_competences TEXT[] DEFAULT '{}',
  required_qualification TEXT,
  required_language TEXT,
  -- Assignment
  assignment_method TEXT NOT NULL DEFAULT 'RANDOM', -- 'RANDOM', 'WEIGHTED', 'ROUND_ROBIN', 'MANUAL'
  -- Excluded (COI)
  excluded_user_ids UUID[] DEFAULT '{}',        -- Users with COI
  -- Result
  assigned_to     UUID REFERENCES users(id),
  assignment_reason TEXT,                       -- Why this person was chosen
  -- COI verification
  coi_verified    BOOLEAN NOT NULL DEFAULT false,
  coi_check_id    UUID REFERENCES conflict_of_interest(id),
  independence_verified BOOLEAN NOT NULL DEFAULT false,
  -- Status
  status          TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ASSIGNED, ACCEPTED, DECLINED, COMPLETED
  declined_reason TEXT,
  --
  requested_by    UUID REFERENCES users(id),
  requested_at    TIMESTAMPTZ DEFAULT now(),
  assigned_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_org ON inspector_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned ON inspector_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON inspector_assignments(status);

-- ---------------------------------------------------------------------------
-- 9. Random Assignment Function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_random_inspector(
  p_org_id UUID,
  p_activity_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_required_competences TEXT[] DEFAULT '{}',
  p_excluded_user_ids UUID[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_inspector_id UUID;
BEGIN
  -- Find eligible inspector:
  -- 1. Active in pool
  -- 2. Has required activity type
  -- 3. Not excluded (COI)
  -- 4. Has required competences
  -- 5. Independent for this entity
  -- 6. Not exceeded max consecutive assignments
  -- 7. Available
  -- Weighted by: fewer recent assignments = higher chance
  SELECT ip.user_id INTO v_inspector_id
  FROM inspector_pool ip
  LEFT JOIN independence_matrix im
    ON im.user_id = ip.user_id
    AND im.org_id = ip.org_id
    AND im.activity_type = p_activity_type
    AND im.entity_type = p_entity_type
    AND (im.entity_id = p_entity_id OR im.entity_id IS NULL)
  WHERE ip.org_id = p_org_id
    AND ip.is_active = true
    AND ip.is_available = true
    AND p_activity_type = ANY(ip.activity_types)
    AND NOT (ip.user_id = ANY(p_excluded_user_ids))
    AND (im.id IS NULL OR im.independence_level IN ('FULL', 'SUPERVISED'))
    AND (im.assignment_count < im.max_consecutive_assignments OR im.max_consecutive_assignments IS NULL)
    AND (ip.impartiality_valid_until IS NULL OR ip.impartiality_valid_until >= CURRENT_DATE)
    AND (array_length(p_required_competences, 1) IS NULL
         OR ip.competence_areas @> p_required_competences)
  ORDER BY
    ip.total_assignments ASC,      -- Fewer assignments first (round-robin effect)
    random()                       -- Random tiebreaker
  LIMIT 1;

  RETURN v_inspector_id;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 10. AQL Lookup Table — ISO 2859-1 sample size reference
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aql_lookup (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_level TEXT NOT NULL,               -- 'I', 'II', 'III', 'S-1', etc.
  lot_size_min    INT NOT NULL,
  lot_size_max    INT,                          -- NULL = no upper limit
  sample_size_code TEXT NOT NULL,               -- 'A' through 'R'
  sample_size     INT NOT NULL,
  -- AQL values and accept/reject numbers
  aql             NUMERIC(5,2) NOT NULL,
  accept_number   INT NOT NULL,
  reject_number   INT NOT NULL,
  severity        sampling_severity NOT NULL DEFAULT 'NORMAL'
);

CREATE INDEX IF NOT EXISTS idx_aql_lookup ON aql_lookup(inspection_level, lot_size_min, aql, severity);

-- Seed common AQL values (ISO 2859-1, General Inspection Level II, Normal)
INSERT INTO aql_lookup (inspection_level, lot_size_min, lot_size_max, sample_size_code, sample_size, aql, accept_number, reject_number) VALUES
  ('II', 2, 8, 'A', 2, 1.0, 0, 1),
  ('II', 9, 15, 'B', 3, 1.0, 0, 1),
  ('II', 16, 25, 'C', 5, 1.0, 0, 1),
  ('II', 26, 50, 'D', 8, 1.0, 0, 1),
  ('II', 51, 90, 'E', 13, 1.0, 0, 1),
  ('II', 91, 150, 'F', 20, 1.0, 0, 1),
  ('II', 151, 280, 'G', 32, 1.0, 1, 2),
  ('II', 281, 500, 'H', 50, 1.0, 1, 2),
  ('II', 501, 1200, 'J', 80, 1.0, 2, 3),
  ('II', 1201, 3200, 'K', 125, 1.0, 3, 4),
  ('II', 3201, 10000, 'L', 200, 1.0, 5, 6),
  ('II', 10001, 35000, 'M', 315, 1.0, 7, 8),
  ('II', 35001, 150000, 'N', 500, 1.0, 10, 11),
  ('II', 150001, 500000, 'P', 800, 1.0, 14, 15),
  ('II', 500001, NULL, 'Q', 1250, 1.0, 21, 22),
  -- AQL 2.5
  ('II', 2, 8, 'A', 2, 2.5, 0, 1),
  ('II', 9, 15, 'B', 3, 2.5, 0, 1),
  ('II', 16, 25, 'C', 5, 2.5, 0, 1),
  ('II', 26, 50, 'D', 8, 2.5, 0, 1),
  ('II', 51, 90, 'E', 13, 2.5, 1, 2),
  ('II', 91, 150, 'F', 20, 2.5, 1, 2),
  ('II', 151, 280, 'G', 32, 2.5, 2, 3),
  ('II', 281, 500, 'H', 50, 2.5, 3, 4),
  ('II', 501, 1200, 'J', 80, 2.5, 5, 6),
  ('II', 1201, 3200, 'K', 125, 2.5, 7, 8),
  ('II', 3201, 10000, 'L', 200, 2.5, 10, 11),
  ('II', 10001, 35000, 'M', 315, 2.5, 14, 15),
  ('II', 35001, 150000, 'N', 500, 2.5, 21, 22),
  -- AQL 4.0
  ('II', 2, 8, 'A', 2, 4.0, 0, 1),
  ('II', 9, 15, 'B', 3, 4.0, 0, 1),
  ('II', 16, 25, 'C', 5, 4.0, 0, 1),
  ('II', 26, 50, 'D', 8, 4.0, 1, 2),
  ('II', 51, 90, 'E', 13, 4.0, 1, 2),
  ('II', 91, 150, 'F', 20, 4.0, 2, 3),
  ('II', 151, 280, 'G', 32, 4.0, 3, 4),
  ('II', 281, 500, 'H', 50, 4.0, 5, 6),
  ('II', 501, 1200, 'J', 80, 4.0, 7, 8),
  ('II', 1201, 3200, 'K', 125, 4.0, 10, 11),
  ('II', 3201, 10000, 'L', 200, 4.0, 14, 15),
  ('II', 10001, 35000, 'M', 315, 4.0, 21, 22)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. Impartiality Committee — Oversight body
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impartiality_committee (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Opartiskhetskommitté',
  description     TEXT,
  -- Members
  chair_id        UUID REFERENCES users(id),
  members         UUID[] DEFAULT '{}',
  external_members JSONB NOT NULL DEFAULT '[]', -- [{name, organization, role, email}]
  -- Schedule
  meeting_frequency TEXT DEFAULT 'QUARTERLY',   -- MONTHLY, QUARTERLY, BIANNUAL, ANNUAL
  next_meeting_date DATE,
  -- Scope
  oversees        TEXT[] DEFAULT '{audit,inspection,calibration,sampling,certification}',
  --
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 12. Impartiality Reviews — Committee review records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impartiality_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  committee_id    UUID REFERENCES impartiality_committee(id) ON DELETE SET NULL,
  -- Review
  review_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  review_period_start DATE NOT NULL,
  review_period_end   DATE NOT NULL,
  -- Findings
  coi_declarations_reviewed INT DEFAULT 0,
  coi_issues_found INT DEFAULT 0,
  rotation_compliance_pct NUMERIC(5,2),
  independence_issues JSONB NOT NULL DEFAULT '[]',
  -- Risk assessment
  overall_risk    impartiality_risk_level NOT NULL DEFAULT 'LOW',
  risk_details    TEXT,
  -- Actions
  corrective_actions JSONB NOT NULL DEFAULT '[]', -- [{action, responsible, deadline, status}]
  preventive_actions JSONB NOT NULL DEFAULT '[]',
  -- Approval
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  -- Minutes
  minutes         TEXT,
  attendees       JSONB NOT NULL DEFAULT '[]',
  --
  iso_reference   TEXT DEFAULT 'ISO 17020:2012 §4.1.5, ISO 17025:2017 §4.1.5',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imp_reviews_org ON impartiality_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_imp_reviews_date ON impartiality_reviews(review_date DESC);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE sampling_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sampling_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sampling_severity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE impartiality_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_of_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE independence_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE aql_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE impartiality_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE impartiality_reviews ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'sampling_plans', 'sampling_executions', 'sampling_severity_history',
    'impartiality_declarations', 'conflict_of_interest', 'independence_matrix',
    'inspector_pool', 'inspector_assignments',
    'impartiality_committee', 'impartiality_reviews'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_org_isolation ON %I; '
      || 'CREATE POLICY %I_org_isolation ON %I FOR ALL USING '
      || '(org_id = (current_setting(''app.current_org_id'', TRUE))::UUID)',
      t, t, t, t
    );
  END LOOP;
END $$;

-- AQL lookup is global (no org_id)
DROP POLICY IF EXISTS aql_lookup_read ON aql_lookup;
CREATE POLICY aql_lookup_read ON aql_lookup FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Triggers — updated_at
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'sampling_plans', 'sampling_executions', 'impartiality_declarations',
    'conflict_of_interest', 'independence_matrix', 'inspector_pool',
    'inspector_assignments', 'impartiality_committee'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON %I; '
      || 'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I '
      || 'FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;

-- =============================================================================
-- DONE. Sampling & Impartiality: 12 tables, RLS, triggers, AQL seed data.
-- ISO 2859-1, ISO 17020:2012, ISO 17025:2017 compliance.
-- =============================================================================
