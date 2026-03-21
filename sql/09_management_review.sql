-- ============================================================================
-- Hypbit OMS — Management Review + Goal Cascade
-- File: 09_management_review.sql
-- ISO 9001:2015 §9.3 (Management Review), §5.2 (Policy), §6.2 (Objectives)
--
-- Tables:
--   management_reviews          — §9.3 review sessions
--   management_review_inputs    — §9.3.2 input items
--   management_review_outputs   — §9.3.3 output decisions
--   quality_policies            — §5.2 quality policy statements
--   goals (ALTER)               — §6.2 objective cascade columns
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 management_reviews — ISO 9001:2015 §9.3 review sessions
-- Each row represents one management review meeting covering a defined period.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management_reviews (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID        NOT NULL,
  review_date           DATE        NOT NULL,
  period_from           DATE        NOT NULL,
  period_to             DATE        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'PLANNED'
                                    CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
  led_by                UUID,
  minutes_document_id   UUID        REFERENCES documents(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 management_review_inputs — §9.3.2 required input categories
-- Each input captures a snapshot of data fed into the review.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management_review_inputs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID        NOT NULL REFERENCES management_reviews(id) ON DELETE CASCADE,
  input_type      TEXT        NOT NULL CHECK (input_type IN (
                    'AUDIT_RESULTS',
                    'CUSTOMER_FEEDBACK',
                    'PROCESS_PERFORMANCE',
                    'NC_STATUS',
                    'IMPROVEMENT_STATUS',
                    'KPI_RESULTS',
                    'RESOURCE_CHANGES',
                    'RISK_CHANGES',
                    'PREVIOUS_ACTIONS',
                    'EXTERNAL_CHANGES',
                    'SUPPLIER_PERFORMANCE'
                  )),
  data_snapshot   JSONB       DEFAULT '{}',
  manual_notes    TEXT,
  assessed_by     UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 management_review_outputs — §9.3.3 decisions and actions
-- Each output is a decision / action arising from the review.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management_review_outputs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id             UUID        NOT NULL REFERENCES management_reviews(id) ON DELETE CASCADE,
  output_type           TEXT        NOT NULL CHECK (output_type IN (
                          'IMPROVEMENT_DECISION',
                          'RESOURCE_ALLOCATION',
                          'QMS_CHANGE',
                          'POLICY_UPDATE',
                          'OBJECTIVE_CHANGE',
                          'RISK_MITIGATION'
                        )),
  title                 TEXT        NOT NULL,
  description           TEXT,
  responsible_id        UUID,
  deadline              DATE,
  linked_task_id        UUID,
  linked_improvement_id UUID,
  status                TEXT        NOT NULL DEFAULT 'DECIDED'
                                    CHECK (status IN ('DECIDED', 'IMPLEMENTING', 'COMPLETED', 'CANCELLED')),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 quality_policies — §5.2 quality policy management
-- Versioned policy statements approved by top management.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quality_policies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL,
  title           TEXT        NOT NULL,
  statement       TEXT        NOT NULL,
  version         TEXT        NOT NULL DEFAULT '1.0',
  status          TEXT        NOT NULL DEFAULT 'DRAFT'
                              CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.5 ALTER goals — §6.2 quality objectives cascade
-- Add columns for goal hierarchy, policy linkage, and measurement planning.
-- ----------------------------------------------------------------------------
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS level               TEXT CHECK (level IN ('STRATEGIC', 'TACTICAL', 'OPERATIONAL', 'INDIVIDUAL')),
  ADD COLUMN IF NOT EXISTS policy_id           UUID REFERENCES quality_policies(id),
  ADD COLUMN IF NOT EXISTS parent_goal_id      UUID REFERENCES goals(id),
  ADD COLUMN IF NOT EXISTS review_frequency    TEXT CHECK (review_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
  ADD COLUMN IF NOT EXISTS measurement_method  TEXT,
  ADD COLUMN IF NOT EXISTS responsible_function TEXT;


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- management_reviews
CREATE INDEX IF NOT EXISTS idx_management_reviews_org_id
  ON management_reviews (org_id);
CREATE INDEX IF NOT EXISTS idx_management_reviews_status
  ON management_reviews (status);
CREATE INDEX IF NOT EXISTS idx_management_reviews_review_date
  ON management_reviews (review_date);

-- management_review_inputs
CREATE INDEX IF NOT EXISTS idx_mr_inputs_review_id
  ON management_review_inputs (review_id);
CREATE INDEX IF NOT EXISTS idx_mr_inputs_input_type
  ON management_review_inputs (input_type);

-- management_review_outputs
CREATE INDEX IF NOT EXISTS idx_mr_outputs_review_id
  ON management_review_outputs (review_id);
CREATE INDEX IF NOT EXISTS idx_mr_outputs_status
  ON management_review_outputs (status);
CREATE INDEX IF NOT EXISTS idx_mr_outputs_responsible_id
  ON management_review_outputs (responsible_id);

-- quality_policies
CREATE INDEX IF NOT EXISTS idx_quality_policies_org_id
  ON quality_policies (org_id);
CREATE INDEX IF NOT EXISTS idx_quality_policies_status
  ON quality_policies (status);

-- goals cascade columns
CREATE INDEX IF NOT EXISTS idx_goals_level
  ON goals (level);
CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id
  ON goals (parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_policy_id
  ON goals (policy_id);


-- ============================================================================
-- 3. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE management_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_review_inputs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_review_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_policies          ENABLE ROW LEVEL SECURITY;

-- ---- management_reviews ----
DROP POLICY IF EXISTS management_reviews_org_isolation ON management_reviews;
CREATE POLICY management_reviews_org_isolation ON management_reviews
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS management_reviews_org_insert ON management_reviews;
CREATE POLICY management_reviews_org_insert ON management_reviews
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ---- management_review_inputs ----
-- Inputs inherit org isolation through their parent review (JOIN-based).
DROP POLICY IF EXISTS mr_inputs_via_review ON management_review_inputs;
CREATE POLICY mr_inputs_via_review ON management_review_inputs
  USING (
    EXISTS (
      SELECT 1 FROM management_reviews mr
      WHERE mr.id = review_id
        AND mr.org_id = (current_setting('app.current_org_id', TRUE))::UUID
    )
  );

DROP POLICY IF EXISTS mr_inputs_insert ON management_review_inputs;
CREATE POLICY mr_inputs_insert ON management_review_inputs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_reviews mr
      WHERE mr.id = review_id
        AND mr.org_id = (current_setting('app.current_org_id', TRUE))::UUID
    )
  );

-- ---- management_review_outputs ----
DROP POLICY IF EXISTS mr_outputs_via_review ON management_review_outputs;
CREATE POLICY mr_outputs_via_review ON management_review_outputs
  USING (
    EXISTS (
      SELECT 1 FROM management_reviews mr
      WHERE mr.id = review_id
        AND mr.org_id = (current_setting('app.current_org_id', TRUE))::UUID
    )
  );

DROP POLICY IF EXISTS mr_outputs_insert ON management_review_outputs;
CREATE POLICY mr_outputs_insert ON management_review_outputs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_reviews mr
      WHERE mr.id = review_id
        AND mr.org_id = (current_setting('app.current_org_id', TRUE))::UUID
    )
  );

-- ---- quality_policies ----
DROP POLICY IF EXISTS quality_policies_org_isolation ON quality_policies;
CREATE POLICY quality_policies_org_isolation ON quality_policies
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS quality_policies_org_insert ON quality_policies;
CREATE POLICY quality_policies_org_insert ON quality_policies
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);


-- ============================================================================
-- 4. SYNC TRIGGERS — register in unified entity registry
-- ============================================================================

-- Extend the sync_entity() CASE for new tables
-- (The function already has an ELSE fallback, but we add explicit mappings
--  by re-attaching triggers via the same pattern used in 00_core.sql.)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'management_reviews',
    'management_review_outputs',
    'quality_policies'
  ]
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
-- 5. SEED — ISO 9001:2015 compliance requirements for §5.2, §6.2, §9.3
-- ============================================================================
-- These are inserted into the existing compliance_requirements table.
-- We assume a compliance_standards row for ISO 9001:2015 already exists;
-- if not, we create one first.

INSERT INTO compliance_standards (id, name, version, description, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000009001',
  'ISO 9001',
  '2015',
  'Quality management systems — Requirements',
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO compliance_requirements (standard_id, code, title, description, status, created_at, updated_at)
VALUES
  -- §5.2 Quality Policy
  ('a0000000-0000-0000-0000-000000009001', '5.2.1',
   'Establishing the quality policy',
   'Top management shall establish, implement and maintain a quality policy that is appropriate to the purpose and context of the organization, provides a framework for setting quality objectives, and includes a commitment to satisfy applicable requirements and to continual improvement.',
   'PARTIAL', now(), now()),

  ('a0000000-0000-0000-0000-000000009001', '5.2.2',
   'Communicating the quality policy',
   'The quality policy shall be available and maintained as documented information, communicated, understood and applied within the organization, and available to relevant interested parties as appropriate.',
   'PARTIAL', now(), now()),

  -- §6.2 Quality Objectives
  ('a0000000-0000-0000-0000-000000009001', '6.2.1',
   'Quality objectives — establishment',
   'The organization shall establish quality objectives at relevant functions, levels and processes. Objectives shall be consistent with the quality policy, measurable, take into account applicable requirements, relevant to conformity and enhancement of customer satisfaction, monitored, communicated, and updated as appropriate.',
   'PARTIAL', now(), now()),

  ('a0000000-0000-0000-0000-000000009001', '6.2.2',
   'Planning to achieve quality objectives',
   'When planning how to achieve its quality objectives, the organization shall determine what will be done, what resources will be required, who will be responsible, when it will be completed, and how results will be evaluated.',
   'PARTIAL', now(), now()),

  -- §9.3.1 Management Review — General
  ('a0000000-0000-0000-0000-000000009001', '9.3.1',
   'Management review — General',
   'Top management shall review the organization''s quality management system at planned intervals to ensure its continuing suitability, adequacy, effectiveness and alignment with the strategic direction of the organization.',
   'PARTIAL', now(), now()),

  -- §9.3.2 Management Review — Inputs
  ('a0000000-0000-0000-0000-000000009001', '9.3.2',
   'Management review inputs',
   'The management review shall be planned and carried out taking into consideration: a) the status of actions from previous management reviews; b) changes in external and internal issues; c) information on the performance and effectiveness of the QMS including trends in customer satisfaction, extent to which quality objectives have been met, process performance, nonconformities and corrective actions, monitoring and measurement results, audit results, and performance of external providers; d) adequacy of resources; e) effectiveness of actions taken to address risks and opportunities; f) opportunities for improvement.',
   'PARTIAL', now(), now()),

  -- §9.3.3 Management Review — Outputs
  ('a0000000-0000-0000-0000-000000009001', '9.3.3',
   'Management review outputs',
   'The outputs of the management review shall include decisions and actions related to: a) opportunities for improvement; b) any need for changes to the quality management system; c) resource needs. The organization shall retain documented information as evidence of the results of management reviews.',
   'PARTIAL', now(), now())

ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done. Management Review + Goal Cascade layer is ready.
-- ============================================================================

COMMIT;
