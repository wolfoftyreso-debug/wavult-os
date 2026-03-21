-- ---------------------------------------------------------------------------
-- Module 21: Deputy Assignments (ISO 5.3 — Roles, responsibilities, authorities)
-- File: 21_deputies.sql
-- Run: AFTER 16_personnel_cases.sql in Supabase (PostgreSQL)
--
-- Implements ställföreträdare (deputy/substitute) management so that every
-- critical organisational function always has a documented, qualified backup
-- person per ISO 9001:2015 §5.3.
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- 1. ENUM TYPES
-- ===========================================================================

-- Scope of the deputy relationship: what exactly is being covered
DO $$ BEGIN
  CREATE TYPE deputy_scope AS ENUM (
    'FULL_ROLE',           -- Deputy covers the entire role
    'SPECIFIC_PROCESS',    -- Deputy covers a named process only
    'SPECIFIC_FUNCTION',   -- Deputy covers a specific function only
    'APPROVAL_AUTHORITY'   -- Deputy covers approval/signing authority only
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Lifecycle state of a deputy assignment record
DO $$ BEGIN
  CREATE TYPE deputy_status AS ENUM (
    'ACTIVE',            -- Assignment is in force
    'INACTIVE',          -- Assignment is suspended or lapsed
    'PENDING_TRAINING'   -- Deputy exists but lacks required capability
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reason why a deputy activation was triggered
DO $$ BEGIN
  CREATE TYPE activation_reason AS ENUM (
    'VACATION',
    'SICK_LEAVE',
    'PARENTAL_LEAVE',
    'TRAVEL',
    'TRAINING',
    'RESIGNATION',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Who/what initiated the activation
DO $$ BEGIN
  CREATE TYPE activated_by_type AS ENUM (
    'SYSTEM_AUTO',  -- Rule-based automatic activation
    'MANAGER',      -- Manager triggered activation
    'SELF',         -- Primary user triggered their own activation
    'HR'            -- HR department triggered activation
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Criticality classification of a business function
DO $$ BEGIN
  CREATE TYPE function_criticality AS ENUM (
    'CRITICAL',  -- Must have cover within hours; failure is a QMS breach
    'HIGH',      -- Cover required within 1–2 days
    'MEDIUM'     -- Cover required within days/weeks
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ===========================================================================
-- 2. TABLES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 2.1 deputy_assignments — Standing deputy relationships
--
-- Each row says: "person B is the designated deputy for person A
-- in the given scope."  Multiple deputies can exist per person (priority
-- column determines order of preference).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deputy_assignments (
  id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        UUID          REFERENCES organizations(id),

  -- The person who owns the role / function
  primary_user_id               UUID          NOT NULL REFERENCES profiles(id),
  -- The person who will act when the primary is absent
  deputy_user_id                UUID          NOT NULL REFERENCES profiles(id),

  -- What part of the primary's responsibilities is covered
  scope                         deputy_scope  NOT NULL,
  -- Optional pointer to the specific thing being covered
  scope_reference_type          TEXT,         -- 'PROCESS' | 'PERMISSION' | 'ASSET' | NULL
  scope_reference_id            UUID,

  -- When multiple deputies exist, lower number = higher priority
  priority                      INTEGER       DEFAULT 1,

  status                        deputy_status DEFAULT 'ACTIVE',

  -- Capability tracking
  deputy_has_required_capability BOOLEAN      DEFAULT false,
  capability_gap_notes          TEXT,
  training_plan_id              UUID          REFERENCES development_plans(id),

  -- Validity window
  valid_from                    DATE          DEFAULT CURRENT_DATE,
  valid_until                   DATE,
  auto_renew                    BOOLEAN       DEFAULT true,

  -- Periodic review cadence
  last_reviewed_at              DATE,
  review_interval_months        INTEGER       DEFAULT 6,
  next_review_date              DATE,

  assigned_by                   UUID          REFERENCES profiles(id),
  created_at                    TIMESTAMPTZ   DEFAULT now(),
  updated_at                    TIMESTAMPTZ   DEFAULT now(),

  -- A person cannot be their own deputy
  CONSTRAINT no_self_deputy CHECK (deputy_user_id != primary_user_id),

  -- One assignment record per (org, primary, deputy, scope, scoped-object) tuple
  UNIQUE (org_id, primary_user_id, deputy_user_id, scope, scope_reference_id)
);

COMMENT ON TABLE deputy_assignments IS
  'ISO 9001:2015 §5.3 — Standing deputy/ställföreträdare relationships. '
  'Defines who covers whom for which scope; activated separately via deputy_activations.';

COMMENT ON COLUMN deputy_assignments.scope_reference_type IS
  'Discriminator for scope_reference_id. Allowed: ''PROCESS'', ''PERMISSION'', ''ASSET'', or NULL for role-level scope.';
COMMENT ON COLUMN deputy_assignments.priority IS
  'When a primary user has multiple deputies for the same scope, the one with the lowest priority number is preferred.';
COMMENT ON COLUMN deputy_assignments.auto_renew IS
  'If true, the assignment is automatically extended when valid_until is reached, pending review.';


-- ---------------------------------------------------------------------------
-- 2.2 deputy_activations — Episodes when a deputy is actively standing in
--
-- An activation is created when a primary user becomes unavailable and
-- records the full lifecycle of that cover period.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deputy_activations (
  id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID                REFERENCES organizations(id),

  deputy_assignment_id      UUID                NOT NULL REFERENCES deputy_assignments(id),
  primary_user_id           UUID                NOT NULL REFERENCES profiles(id),
  deputy_user_id            UUID                NOT NULL REFERENCES profiles(id),

  reason                    activation_reason   NOT NULL,
  reason_detail             TEXT,

  -- Activation lifecycle
  activated_at              TIMESTAMPTZ         DEFAULT now(),
  activated_by              activated_by_type   NOT NULL,
  expected_return_date      DATE,
  actual_deactivated_at     TIMESTAMPTZ,
  deactivated_by            UUID                REFERENCES profiles(id),

  -- What was handed over
  permissions_granted       JSONB               DEFAULT '[]',
  notifications_redirected  BOOLEAN             DEFAULT true,
  tasks_reassigned          BOOLEAN             DEFAULT false,
  tasks_reassigned_count    INTEGER             DEFAULT 0,

  created_at                TIMESTAMPTZ         DEFAULT now()
);

COMMENT ON TABLE deputy_activations IS
  'Each row is a concrete cover episode: when, why, and what was handed to the deputy.';

COMMENT ON COLUMN deputy_activations.permissions_granted IS
  'JSONB array of permission identifiers temporarily granted to the deputy during this activation.';
COMMENT ON COLUMN deputy_activations.actual_deactivated_at IS
  'NULL means the activation is currently open / the primary is still absent.';


-- ---------------------------------------------------------------------------
-- 2.3 critical_functions — Catalogue of functions that must have deputy cover
--
-- The has_deputy and deputy_coverage_pct columns are auto-maintained by the
-- trigger defined in section 4 below.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS critical_functions (
  id                    UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID                  REFERENCES organizations(id),

  function_name         TEXT                  NOT NULL,
  description           TEXT,
  owning_role           TEXT                  NOT NULL,
  owning_user_id        UUID                  REFERENCES profiles(id),

  -- ISO clause that mandates this function
  iso_reference         TEXT,
  criticality           function_criticality  NOT NULL DEFAULT 'MEDIUM',

  -- How long this function can go unperformed before it becomes a QMS risk
  max_absence_hours     INTEGER               DEFAULT 8,

  requires_deputy       BOOLEAN               DEFAULT true,
  -- Auto-maintained by trigger
  has_deputy            BOOLEAN               DEFAULT false,
  deputy_coverage_pct   NUMERIC(5,2)          DEFAULT 0,

  process_id            UUID                  REFERENCES processes(id),
  metadata              JSONB                 DEFAULT '{}',

  created_at            TIMESTAMPTZ           DEFAULT now(),
  updated_at            TIMESTAMPTZ           DEFAULT now()
);

COMMENT ON TABLE critical_functions IS
  'ISO 9001:2015 §5.3 catalogue of critical organisational functions that must maintain deputy coverage.';

COMMENT ON COLUMN critical_functions.has_deputy IS
  'Auto-computed: true when at least one ACTIVE deputy_assignment exists for owning_user_id.';
COMMENT ON COLUMN critical_functions.deputy_coverage_pct IS
  'Auto-computed: percentage of active deputies who have deputy_has_required_capability = true.';
COMMENT ON COLUMN critical_functions.max_absence_hours IS
  'Maximum hours the function can go unperformed before the absence constitutes a QMS risk.';


-- ===========================================================================
-- 3. VIEWS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 3.1 v_deputy_coverage — Per-user deputy coverage summary
--
-- For every user who owns at least one deputy assignment (as primary or
-- deputy), show how many assignments they have and whether they are
-- currently covered (COVERED / PARTIAL / UNCOVERED).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_deputy_coverage AS
SELECT
  p.id                                        AS user_id,
  p.full_name,
  p.email,
  da.org_id,

  COUNT(da.id)                                AS total_assignments,
  COUNT(da.id) FILTER (
    WHERE da.status = 'ACTIVE'
  )                                           AS active_assignments,
  COUNT(da.id) FILTER (
    WHERE da.status = 'ACTIVE'
      AND da.deputy_has_required_capability = true
  )                                           AS qualified_assignments,

  -- Is there an open (not yet deactivated) activation right now?
  COUNT(act.id) FILTER (
    WHERE act.actual_deactivated_at IS NULL
  )                                           AS open_activations,

  CASE
    WHEN COUNT(da.id) FILTER (WHERE da.status = 'ACTIVE') = 0
      THEN 'UNCOVERED'
    WHEN COUNT(da.id) FILTER (
           WHERE da.status = 'ACTIVE'
             AND da.deputy_has_required_capability = true
         ) > 0
      THEN 'COVERED'
    ELSE 'PARTIAL'
  END                                         AS coverage_status

FROM profiles p
LEFT JOIN deputy_assignments da
       ON da.primary_user_id = p.id
LEFT JOIN deputy_activations  act
       ON act.deputy_assignment_id = da.id
      AND act.actual_deactivated_at IS NULL
GROUP BY p.id, p.full_name, p.email, da.org_id;

COMMENT ON VIEW v_deputy_coverage IS
  'Per-user deputy coverage summary. coverage_status: COVERED = at least one qualified active deputy; '
  'PARTIAL = active deputies exist but none qualified; UNCOVERED = no active deputies.';


-- ---------------------------------------------------------------------------
-- 3.2 v_critical_functions_coverage — Critical function deputy coverage
--
-- Joins the critical_functions catalogue with current deputy assignment data
-- to show whether each function has adequate cover.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_critical_functions_coverage AS
SELECT
  cf.id                                       AS function_id,
  cf.org_id,
  cf.function_name,
  cf.owning_role,
  cf.iso_reference,
  cf.criticality,
  cf.max_absence_hours,
  cf.requires_deputy,

  p.id                                        AS owning_user_id,
  p.full_name                                 AS owning_user_name,

  COUNT(da.id) FILTER (
    WHERE da.status = 'ACTIVE'
  )                                           AS deputies_assigned,

  BOOL_OR(
    da.status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM deputy_activations act2
      WHERE act2.deputy_assignment_id = da.id
        AND act2.actual_deactivated_at IS NULL
    )
  )                                           AS has_active_deputy,

  BOOL_OR(
    da.status = 'ACTIVE'
    AND da.deputy_has_required_capability = true
  )                                           AS deputy_is_qualified

FROM critical_functions cf
LEFT JOIN profiles            p  ON p.id  = cf.owning_user_id
LEFT JOIN deputy_assignments  da ON da.primary_user_id = cf.owning_user_id
                                 AND (da.org_id = cf.org_id OR da.org_id IS NULL)
GROUP BY cf.id, cf.org_id, cf.function_name, cf.owning_role, cf.iso_reference,
         cf.criticality, cf.max_absence_hours, cf.requires_deputy,
         p.id, p.full_name;

COMMENT ON VIEW v_critical_functions_coverage IS
  'Critical-function deputy coverage status. '
  'has_active_deputy = a deputy is currently standing in; '
  'deputy_is_qualified = at least one active deputy has the required capability.';


-- ---------------------------------------------------------------------------
-- 3.3 v_active_deputizations — Currently open activation episodes
--
-- Shows all in-progress cover episodes (where the primary user has not yet
-- returned), with full context from both profiles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_deputizations AS
SELECT
  act.id                                      AS activation_id,
  act.org_id,
  act.reason,
  act.reason_detail,
  act.activated_at,
  act.activated_by,
  act.expected_return_date,
  act.permissions_granted,
  act.notifications_redirected,
  act.tasks_reassigned,
  act.tasks_reassigned_count,

  -- Primary user details
  pp.id                                       AS primary_user_id,
  pp.full_name                                AS primary_user_name,
  pp.email                                    AS primary_user_email,

  -- Deputy user details
  dp.id                                       AS deputy_user_id,
  dp.full_name                                AS deputy_user_name,
  dp.email                                    AS deputy_user_email,

  -- Assignment metadata
  da.scope,
  da.scope_reference_type,
  da.scope_reference_id,
  da.priority,
  da.deputy_has_required_capability,
  da.capability_gap_notes

FROM deputy_activations  act
JOIN deputy_assignments  da  ON da.id  = act.deputy_assignment_id
JOIN profiles            pp  ON pp.id  = act.primary_user_id
JOIN profiles            dp  ON dp.id  = act.deputy_user_id
WHERE act.actual_deactivated_at IS NULL;

COMMENT ON VIEW v_active_deputizations IS
  'All open (not yet deactivated) deputy cover episodes with full user and assignment context.';


-- ===========================================================================
-- 4. AUTO-UPDATE TRIGGER
--    When deputy_assignments change for a user, recompute has_deputy and
--    deputy_coverage_pct on every critical_functions row owned by that user.
-- ===========================================================================

CREATE OR REPLACE FUNCTION fn_refresh_critical_function_coverage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determine which primary_user_id was affected
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.primary_user_id;
  ELSE
    v_user_id := NEW.primary_user_id;
  END IF;

  -- Recompute and update all critical_functions rows for that owner
  UPDATE critical_functions cf
  SET
    has_deputy = (
      SELECT COUNT(*) > 0
      FROM deputy_assignments da
      WHERE da.primary_user_id = v_user_id
        AND da.status = 'ACTIVE'
        AND (da.org_id = cf.org_id OR da.org_id IS NULL)
    ),
    deputy_coverage_pct = (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            100.0 * COUNT(*) FILTER (WHERE da.deputy_has_required_capability = true)
            / COUNT(*),
            2
          )
        END
      FROM deputy_assignments da
      WHERE da.primary_user_id = v_user_id
        AND da.status = 'ACTIVE'
        AND (da.org_id = cf.org_id OR da.org_id IS NULL)
    ),
    updated_at = now()
  WHERE cf.owning_user_id = v_user_id;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION fn_refresh_critical_function_coverage() IS
  'Trigger function: recomputes has_deputy and deputy_coverage_pct on critical_functions '
  'whenever a deputy_assignments row is inserted, updated, or deleted.';

-- Attach the trigger to deputy_assignments
DROP TRIGGER IF EXISTS trg_deputy_assignments_coverage ON deputy_assignments;
CREATE TRIGGER trg_deputy_assignments_coverage
  AFTER INSERT OR UPDATE OR DELETE ON deputy_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_refresh_critical_function_coverage();


-- ===========================================================================
-- 5. INDEXES
-- ===========================================================================

-- deputy_assignments
CREATE INDEX IF NOT EXISTS idx_deputy_assignments_org_id
  ON deputy_assignments (org_id);

CREATE INDEX IF NOT EXISTS idx_deputy_assignments_primary_user_id
  ON deputy_assignments (primary_user_id);

CREATE INDEX IF NOT EXISTS idx_deputy_assignments_deputy_user_id
  ON deputy_assignments (deputy_user_id);

CREATE INDEX IF NOT EXISTS idx_deputy_assignments_status
  ON deputy_assignments (status);

CREATE INDEX IF NOT EXISTS idx_deputy_assignments_next_review_date
  ON deputy_assignments (next_review_date);

-- deputy_activations
CREATE INDEX IF NOT EXISTS idx_deputy_activations_org_id
  ON deputy_activations (org_id);

CREATE INDEX IF NOT EXISTS idx_deputy_activations_primary_user_id
  ON deputy_activations (primary_user_id);

CREATE INDEX IF NOT EXISTS idx_deputy_activations_deputy_user_id
  ON deputy_activations (deputy_user_id);

CREATE INDEX IF NOT EXISTS idx_deputy_activations_assignment_id
  ON deputy_activations (deputy_assignment_id);

CREATE INDEX IF NOT EXISTS idx_deputy_activations_open
  ON deputy_activations (actual_deactivated_at)
  WHERE actual_deactivated_at IS NULL;

-- critical_functions
CREATE INDEX IF NOT EXISTS idx_critical_functions_org_id
  ON critical_functions (org_id);

CREATE INDEX IF NOT EXISTS idx_critical_functions_owning_user_id
  ON critical_functions (owning_user_id);

CREATE INDEX IF NOT EXISTS idx_critical_functions_criticality
  ON critical_functions (criticality);

CREATE INDEX IF NOT EXISTS idx_critical_functions_has_deputy
  ON critical_functions (has_deputy);


-- ===========================================================================
-- 6. ROW-LEVEL SECURITY
-- ===========================================================================

-- deputy_assignments
ALTER TABLE deputy_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_deputy_assignments_org ON deputy_assignments;
CREATE POLICY rls_deputy_assignments_org
  ON deputy_assignments
  USING (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- deputy_activations
ALTER TABLE deputy_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_deputy_activations_org ON deputy_activations;
CREATE POLICY rls_deputy_activations_org
  ON deputy_activations
  USING (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- critical_functions
ALTER TABLE critical_functions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_critical_functions_org ON critical_functions;
CREATE POLICY rls_critical_functions_org
  ON critical_functions
  USING (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );


-- ===========================================================================
-- 7. SEED — critical_functions
--    13 standard critical functions per ISO 9001:2015.
--    Wrapped in a DO block so the script remains idempotent and survives
--    environments where the table does not yet exist.
-- ===========================================================================

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  INSERT INTO critical_functions (
    org_id,
    function_name,
    description,
    owning_role,
    iso_reference,
    criticality,
    max_absence_hours,
    requires_deputy
  )
  SELECT
    v_org_id,
    fn.function_name,
    fn.description,
    fn.owning_role,
    fn.iso_reference,
    fn.criticality::function_criticality,
    fn.max_absence_hours,
    true
  FROM (VALUES
    -- function_name, description, owning_role, iso_reference, criticality, max_absence_hours
    ('Kvalitetsledning',
     'Övergripande ansvar för kvalitetsledningssystemet och dess efterlevnad.',
     'QUALITY_MANAGER',       'ISO 5.3',   'CRITICAL', 4),

    ('Godkänna utbetalningar',
     'Behörighet att godkänna och signera ekonomiska utbetalningar.',
     'FINANCE_CONTROLLER',    'ISO 7.1.1', 'HIGH',     24),

    ('Kalibreringsbeslut',
     'Beslut om kalibrering och godkännande av mät- och kontrollutrustning.',
     'QUALITY_MANAGER',       'ISO 7.1.5', 'CRITICAL', 4),

    ('Intern revision',
     'Planering och genomförande av interna revisioner enligt ISO 9.2.',
     'INTERNAL_AUDITOR',      'ISO 9.2',   'HIGH',     168),

    ('Avvikelsehantering',
     'Mottagning, bedömning och dispositionsbeslut för avvikelser.',
     'QUALITY_MANAGER',       'ISO 10.2',  'CRITICAL', 8),

    ('Reklamationshantering',
     'Hantering av kundreklamationer och garantiärenden.',
     'OPERATIONS_MANAGER',    'ISO 8.2.1', 'HIGH',     4),

    ('Ledningens genomgång',
     'Sammankalla och leda den periodiska ledningens genomgång.',
     'EXECUTIVE',             'ISO 9.3',   'MEDIUM',   720),

    ('Leverantörsbedömning',
     'Bedömning och kvalificering av leverantörer och externa leverantörer.',
     'QUALITY_MANAGER',       'ISO 8.4',   'HIGH',     168),

    ('Personalärenden nivå 4+',
     'Handläggning av personalärenden på nivå 4 och högre (disciplinärenden, uppsägning m.m.).',
     'HR_MANAGER',            'ISO 7.1.2', 'CRITICAL', 24),

    ('Återkallningsbeslut',
     'Beslut om produktåterkallning vid konstaterat säkerhets- eller kvalitetsproblem.',
     'EXECUTIVE',             'ISO 8.7',   'CRITICAL', 2),

    ('Systemadministration',
     'Administration och säkerhetskonfiguration av QMS-systemet och dess dokumentation.',
     'ADMIN',                 'ISO 7.5',   'HIGH',     8),

    ('Bokföringsavstämning',
     'Periodisk avstämning och godkännande av bokföring.',
     'FINANCE_CONTROLLER',    'ISO 7.1.1', 'MEDIUM',   720),

    ('Dokumentstyrning',
     'Kontroll, godkännande och distribution av styrda dokument.',
     'DOCUMENT_CONTROLLER',   'ISO 7.5',   'MEDIUM',   168)

  ) AS fn (function_name, description, owning_role, iso_reference, criticality, max_absence_hours)
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $$;


-- ===========================================================================
-- 8. SEED — ISO 9001:2015 §5.3 compliance requirement
-- ===========================================================================

DO $$
BEGIN
  INSERT INTO compliance_requirements (
    standard_id,
    code,
    title,
    description,
    status,
    created_at,
    updated_at
  )
  VALUES (
    'a0000000-0000-0000-0000-000000009001',
    '5.3',
    'Organizational roles, responsibilities and authorities',
    'Top management shall ensure that the responsibilities and authorities for relevant roles are assigned, communicated and understood within the organization. '
    'Top management shall assign responsibility and authority for: (a) ensuring that the quality management system conforms to the requirements of this International Standard; '
    '(b) ensuring that the processes are delivering their intended outputs; '
    '(c) reporting on the performance of the quality management system and on opportunities for improvement, in particular to top management; '
    '(d) ensuring the promotion of customer focus throughout the organization; '
    '(e) ensuring that the integrity of the quality management system is maintained when changes to the quality management system are planned and implemented. '
    'Implemented via: deputy_assignments (standing deputy relationships), deputy_activations (active cover episodes), '
    'and critical_functions (catalogue of functions requiring mandatory deputy coverage).',
    'PARTIAL',
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $$;


COMMIT;
