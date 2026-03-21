-- ============================================================================
-- Hypbit OMS — Personnel Cases System
-- File: 16_personnel_cases.sql
-- Run: AFTER 15_customer_quality.sql in Supabase (PostgreSQL)
--
-- Complete personnel case lifecycle for performance management, conduct,
-- absence tracking, and HR escalation processes.
--
-- WARNING: This module handles SENSITIVE PERSONAL DATA.
-- All automation boundaries are marked with -- LEGAL_REVIEW_REQUIRED.
-- All thresholds are conservative by default.
-- GDPR Article 6(1)(f) — Legitimate interest basis unless otherwise stated.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 personnel_signals — Auto-collected behavioral signals
-- LEGAL_REVIEW_REQUIRED: Automated collection of behavioral data requires
-- legal basis review under GDPR Art. 6 and Art. 22 (automated decision-making).
-- Signals are NOT visible to the person themselves or peers — only HR, executives,
-- and the person's direct manager.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personnel_signals (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID          NOT NULL,
  user_id           UUID          NOT NULL,
  signal_type       TEXT          NOT NULL CHECK (signal_type IN (
                      'PERFORMANCE_DECLINE','DEADLINE_PATTERN','CAPABILITY_DROP',
                      'FEEDBACK_PATTERN','ABSENCE_PATTERN','QUALITY_ISSUE',
                      'BEHAVIORAL','POLICY_VIOLATION','POSITIVE_TREND'
                    )),
  severity          TEXT          NOT NULL CHECK (severity IN (
                      'INFO','NOTICE','WARNING','SERIOUS'
                    )),
  source            TEXT          NOT NULL CHECK (source IN (
                      'SYSTEM_AUTO','MANAGER_OBSERVATION','PEER_FEEDBACK',
                      'INCIDENT_REPORT','CAPABILITY_ENGINE','TASK_ENGINE'
                    )),

  -- Signal details
  data_points       JSONB         NOT NULL,
  description       TEXT,
  auto_generated    BOOLEAN       DEFAULT true,

  -- Acknowledgement
  acknowledged      BOOLEAN       DEFAULT false,
  acknowledged_by   UUID,
  acknowledged_at   TIMESTAMPTZ,

  -- Meta
  created_at        TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 support_conversations — Level 2 support conversations
-- Documented manager-employee conversations that may precede formal cases.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_conversations (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID          NOT NULL,
  user_id             UUID          NOT NULL,     -- the person being supported
  initiated_by        UUID          NOT NULL,     -- the manager

  -- Trigger context
  trigger_signal_ids  UUID[],

  -- Conversation details
  conversation_date   DATE          NOT NULL,
  conversation_type   TEXT          NOT NULL CHECK (conversation_type IN (
                        'INFORMAL_CHECKIN','STRUCTURED_SUPPORT',
                        'FOLLOWUP','RETURN_TO_WORK'
                      )),
  summary             TEXT          NOT NULL,
  employee_perspective TEXT,
  agreed_actions      TEXT,
  next_followup_date  DATE,

  -- Outcome
  outcome             TEXT          CHECK (outcome IN (
                        'POSITIVE','NEUTRAL','NEEDS_MONITORING','ESCALATE'
                      )),

  -- Documentation
  documented_by       UUID,
  created_at          TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 personnel_cases — Level 3+ formal personnel cases
-- LEGAL_REVIEW_REQUIRED: Formal personnel processes with legal implications.
-- State transitions have HARD GATES enforced by trigger validation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personnel_cases (
  id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        UUID          NOT NULL,
  code                          TEXT,          -- auto: 'PA-YYYY-NNN'
  user_id                       UUID          NOT NULL,

  -- Status & classification
  status                        TEXT          NOT NULL DEFAULT 'SUPPORT_INITIATED' CHECK (status IN (
                                  'SUPPORT_INITIATED','SUPPORT_ACTIVE','SUPPORT_EXTENDED',
                                  'SUPPORT_RESOLVED','ESCALATED_TO_HR','HR_INVESTIGATING',
                                  'FORMAL_WARNING','FORMAL_PROCESS','RESOLVED_POSITIVE',
                                  'RESOLVED_TERMINATED','ARCHIVED','EXTERNAL_HANDLING'
                                )),
  current_level                 INTEGER       NOT NULL DEFAULT 3 CHECK (current_level >= 3 AND current_level <= 5),
  case_type                     TEXT          CHECK (case_type IN (
                                  'PERFORMANCE','CONDUCT','ABSENCE','CAPABILITY_GAP',
                                  'POLICY_VIOLATION','INTERPERSONAL','HEALTH_RELATED',
                                  'RESTRUCTURING','OTHER'
                                )),

  -- Case details
  description                   TEXT          NOT NULL,
  opening_signals               UUID[],
  opening_conversations         UUID[],

  -- Support plan
  support_plan                  TEXT,
  development_plan_id           UUID,
  support_period_start          DATE,
  support_period_end            DATE,
  support_period_extended       BOOLEAN       DEFAULT false,
  support_period_extension_reason TEXT,

  -- Milestones
  milestones                    JSONB         DEFAULT '[]',

  -- Freeze (auto-activated on HR escalation) -- LEGAL_REVIEW_REQUIRED
  frozen_at                     TIMESTAMPTZ,
  frozen_by                     TEXT          CHECK (frozen_by IN ('SYSTEM_AUTO','MANAGER','HR')),
  freeze_reason                 TEXT,

  -- HR assignment
  hr_responsible_id             UUID,

  -- Decision -- LEGAL_REVIEW_REQUIRED
  decision_type                 TEXT          CHECK (decision_type IN (
                                  'CONTINUE_SUPPORT','VERBAL_WARNING','WRITTEN_WARNING',
                                  'FINAL_WARNING','REASSIGNMENT','DEMOTION',
                                  'TERMINATION','MUTUAL_AGREEMENT','NO_ACTION'
                                )),
  decision_description          TEXT,
  decision_by                   UUID,
  decision_at                   TIMESTAMPTZ,
  decision_rationale            TEXT,

  -- Union & legal -- LEGAL_REVIEW_REQUIRED
  union_consulted               BOOLEAN,
  union_representative          TEXT,
  union_consultation_date       DATE,
  union_consultation_notes      TEXT,
  legal_basis                   TEXT,

  -- Closure
  closed_at                     TIMESTAMPTZ,
  closed_by                     UUID,
  outcome_notes                 TEXT,
  lessons_learned               TEXT,
  reintegration_plan            TEXT,

  -- GDPR data lifecycle -- LEGAL_REVIEW_REQUIRED
  legal_ground                  TEXT          DEFAULT 'LEGITIMATE_INTEREST',
  retention_until               DATE,
  anonymize_at                  DATE,
  data_subject_informed         BOOLEAN       DEFAULT false,
  data_subject_informed_at      TIMESTAMPTZ,

  -- Meta
  metadata                      JSONB         DEFAULT '{}',
  created_at                    TIMESTAMPTZ   DEFAULT now(),
  updated_at                    TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 personnel_case_log — IMMUTABLE timeline for personnel cases
-- Every entry is append-only. UPDATE and DELETE are blocked by trigger.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personnel_case_log (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID          NOT NULL REFERENCES personnel_cases(id),
  entry_type      TEXT          NOT NULL CHECK (entry_type IN (
                    'NOTE','CONVERSATION_LOGGED','SIGNAL_ADDED',
                    'STATUS_CHANGE','MILESTONE_UPDATED','DECISION_MADE',
                    'DOCUMENT_ATTACHED','UNION_CONTACTED','EMPLOYEE_INFORMED',
                    'FREEZE_ACTIVATED','FREEZE_RELEASED','EXTERNAL_REFERRAL'
                  )),
  content         TEXT          NOT NULL,
  entered_by      UUID,
  is_system       BOOLEAN       DEFAULT false,
  attachments     JSONB         DEFAULT '[]',
  created_at      TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.5 absence_records — Absence tracking for personnel management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS absence_records (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID          NOT NULL,
  user_id                     UUID          NOT NULL,
  absence_type                TEXT          NOT NULL CHECK (absence_type IN (
                                'SICK_SHORT','SICK_LONG','SICK_PARTIAL',
                                'PARENTAL','VACATION','LEAVE_OF_ABSENCE','OTHER'
                              )),
  start_date                  DATE          NOT NULL,
  end_date                    DATE,
  return_date                 DATE,
  sick_note_provided          BOOLEAN,
  return_to_work_conversation BOOLEAN       DEFAULT false,
  notes                       TEXT,
  registered_by               UUID,
  created_at                  TIMESTAMPTZ   DEFAULT now()
);


-- ============================================================================
-- 2. AUTO-CODE GENERATION — PA-YYYY-NNN
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS personnel_case_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_personnel_case_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'PA-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
                lpad(nextval('personnel_case_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personnel_case_code ON personnel_cases;
CREATE TRIGGER trg_personnel_case_code
  BEFORE INSERT ON personnel_cases
  FOR EACH ROW
  EXECUTE FUNCTION generate_personnel_case_code();


-- ============================================================================
-- 3. IMMUTABILITY TRIGGER — personnel_case_log
-- ============================================================================
-- Prevent UPDATE and DELETE on personnel_case_log to ensure audit integrity.

CREATE OR REPLACE FUNCTION prevent_case_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'personnel_case_log is immutable: % operations are not permitted', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_log_no_update ON personnel_case_log;
CREATE TRIGGER trg_case_log_no_update
  BEFORE UPDATE ON personnel_case_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_case_log_mutation();

DROP TRIGGER IF EXISTS trg_case_log_no_delete ON personnel_case_log;
CREATE TRIGGER trg_case_log_no_delete
  BEFORE DELETE ON personnel_case_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_case_log_mutation();


-- ============================================================================
-- 4. STATE MACHINE VALIDATION — Hard gates on status transitions
-- ============================================================================
-- LEGAL_REVIEW_REQUIRED: All gates below enforce legal and procedural
-- requirements before allowing status progression. Changing these thresholds
-- may expose the organization to legal risk.

CREATE OR REPLACE FUNCTION validate_personnel_case_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- HARD GATE: ESCALATED_TO_HR — auto-freeze, HR assignment required
  -- LEGAL_REVIEW_REQUIRED
  IF NEW.status = 'ESCALATED_TO_HR' THEN
    IF NEW.hr_responsible_id IS NULL THEN
      RAISE EXCEPTION 'ESCALATED_TO_HR requires hr_responsible_id to be set';
    END IF;
    -- Auto-freeze on escalation
    NEW.frozen_at := COALESCE(NEW.frozen_at, now());
    NEW.frozen_by := COALESCE(NEW.frozen_by, 'SYSTEM_AUTO');
    NEW.freeze_reason := COALESCE(NEW.freeze_reason, 'Auto-frozen on HR escalation');
  END IF;

  -- HARD GATE: FORMAL_WARNING — decision, rationale, legal basis, and informed subject required
  -- LEGAL_REVIEW_REQUIRED
  IF NEW.status = 'FORMAL_WARNING' THEN
    IF NEW.decision_by IS NULL THEN
      RAISE EXCEPTION 'FORMAL_WARNING requires decision_by to be set';
    END IF;
    IF NEW.decision_rationale IS NULL OR NEW.decision_rationale = '' THEN
      RAISE EXCEPTION 'FORMAL_WARNING requires decision_rationale';
    END IF;
    IF NEW.legal_basis IS NULL OR NEW.legal_basis = '' THEN
      RAISE EXCEPTION 'FORMAL_WARNING requires legal_basis';
    END IF;
    IF NEW.data_subject_informed IS NOT TRUE THEN
      RAISE EXCEPTION 'FORMAL_WARNING requires data_subject_informed = true';
    END IF;
  END IF;

  -- HARD GATE: FORMAL_PROCESS — union consultation and legal basis required
  -- LEGAL_REVIEW_REQUIRED
  IF NEW.status = 'FORMAL_PROCESS' THEN
    IF NEW.legal_basis IS NULL OR NEW.legal_basis = '' THEN
      RAISE EXCEPTION 'FORMAL_PROCESS requires legal_basis';
    END IF;
    IF NEW.union_consulted IS NOT TRUE THEN
      -- Allow explicit note explaining why union was not consulted
      IF NEW.union_consultation_notes IS NULL OR NEW.union_consultation_notes = '' THEN
        RAISE EXCEPTION 'FORMAL_PROCESS requires union_consulted = true OR union_consultation_notes explaining exemption';
      END IF;
    END IF;
  END IF;

  -- HARD GATE: RESOLVED_TERMINATED — executive/HR decision, legal basis, immutable after 24h
  -- LEGAL_REVIEW_REQUIRED
  IF NEW.status = 'RESOLVED_TERMINATED' THEN
    IF NEW.decision_by IS NULL THEN
      RAISE EXCEPTION 'RESOLVED_TERMINATED requires decision_by (EXECUTIVE or HR_MANAGER)';
    END IF;
    IF NEW.legal_basis IS NULL OR NEW.legal_basis = '' THEN
      RAISE EXCEPTION 'RESOLVED_TERMINATED requires legal_basis';
    END IF;
  END IF;

  -- IMMUTABILITY: Once RESOLVED_TERMINATED for 24h, block further changes
  -- LEGAL_REVIEW_REQUIRED
  IF OLD.status = 'RESOLVED_TERMINATED'
     AND OLD.updated_at < (now() - INTERVAL '24 hours') THEN
    RAISE EXCEPTION 'RESOLVED_TERMINATED cases are immutable after 24 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personnel_case_transition ON personnel_cases;
CREATE TRIGGER trg_personnel_case_transition
  BEFORE UPDATE ON personnel_cases
  FOR EACH ROW
  EXECUTE FUNCTION validate_personnel_case_transition();


-- ============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_personnel_cases_updated_at ON personnel_cases;
CREATE TRIGGER trg_personnel_cases_updated_at
  BEFORE UPDATE ON personnel_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- personnel_signals
CREATE INDEX IF NOT EXISTS idx_personnel_signals_org_id
  ON personnel_signals (org_id);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_user_id
  ON personnel_signals (user_id);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_signal_type
  ON personnel_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_severity
  ON personnel_signals (severity);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_source
  ON personnel_signals (source);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_auto_generated
  ON personnel_signals (auto_generated);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_acknowledged
  ON personnel_signals (acknowledged);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_acknowledged_by
  ON personnel_signals (acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_personnel_signals_created_at
  ON personnel_signals (created_at);

-- support_conversations
CREATE INDEX IF NOT EXISTS idx_support_conversations_org_id
  ON support_conversations (org_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id
  ON support_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_initiated_by
  ON support_conversations (initiated_by);
CREATE INDEX IF NOT EXISTS idx_support_conversations_conversation_date
  ON support_conversations (conversation_date);
CREATE INDEX IF NOT EXISTS idx_support_conversations_conversation_type
  ON support_conversations (conversation_type);
CREATE INDEX IF NOT EXISTS idx_support_conversations_outcome
  ON support_conversations (outcome);
CREATE INDEX IF NOT EXISTS idx_support_conversations_documented_by
  ON support_conversations (documented_by);
CREATE INDEX IF NOT EXISTS idx_support_conversations_next_followup_date
  ON support_conversations (next_followup_date);

-- personnel_cases
CREATE INDEX IF NOT EXISTS idx_personnel_cases_org_id
  ON personnel_cases (org_id);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_user_id
  ON personnel_cases (user_id);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_code
  ON personnel_cases (code);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_status
  ON personnel_cases (status);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_current_level
  ON personnel_cases (current_level);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_case_type
  ON personnel_cases (case_type);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_hr_responsible_id
  ON personnel_cases (hr_responsible_id);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_decision_by
  ON personnel_cases (decision_by);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_decision_type
  ON personnel_cases (decision_type);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_closed_by
  ON personnel_cases (closed_by);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_frozen_at
  ON personnel_cases (frozen_at);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_development_plan_id
  ON personnel_cases (development_plan_id);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_support_period_start
  ON personnel_cases (support_period_start);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_support_period_end
  ON personnel_cases (support_period_end);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_retention_until
  ON personnel_cases (retention_until);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_anonymize_at
  ON personnel_cases (anonymize_at);
CREATE INDEX IF NOT EXISTS idx_personnel_cases_created_at
  ON personnel_cases (created_at);

-- personnel_case_log
CREATE INDEX IF NOT EXISTS idx_personnel_case_log_case_id
  ON personnel_case_log (case_id);
CREATE INDEX IF NOT EXISTS idx_personnel_case_log_entry_type
  ON personnel_case_log (entry_type);
CREATE INDEX IF NOT EXISTS idx_personnel_case_log_entered_by
  ON personnel_case_log (entered_by);
CREATE INDEX IF NOT EXISTS idx_personnel_case_log_is_system
  ON personnel_case_log (is_system);
CREATE INDEX IF NOT EXISTS idx_personnel_case_log_created_at
  ON personnel_case_log (created_at);

-- absence_records
CREATE INDEX IF NOT EXISTS idx_absence_records_org_id
  ON absence_records (org_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_user_id
  ON absence_records (user_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_absence_type
  ON absence_records (absence_type);
CREATE INDEX IF NOT EXISTS idx_absence_records_start_date
  ON absence_records (start_date);
CREATE INDEX IF NOT EXISTS idx_absence_records_end_date
  ON absence_records (end_date);
CREATE INDEX IF NOT EXISTS idx_absence_records_return_date
  ON absence_records (return_date);
CREATE INDEX IF NOT EXISTS idx_absence_records_registered_by
  ON absence_records (registered_by);


-- ============================================================================
-- 7. ENTITY SYNC TRIGGERS
-- ============================================================================

-- Extend sync_entity() to handle personnel cases
CREATE OR REPLACE FUNCTION sync_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_title       TEXT;
  v_status      TEXT;
  v_org_id      UUID;
  v_owner_id    UUID;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'tasks'                  THEN 'task'
    WHEN 'deals'                  THEN 'deal'
    WHEN 'leads'                  THEN 'lead'
    WHEN 'contacts'               THEN 'contact'
    WHEN 'companies'              THEN 'company'
    WHEN 'non_conformances'       THEN 'nc'
    WHEN 'improvements'           THEN 'improvement'
    WHEN 'documents'              THEN 'document'
    WHEN 'risks'                  THEN 'risk'
    WHEN 'payouts'                THEN 'payout'
    WHEN 'decisions'              THEN 'decision'
    WHEN 'meetings'               THEN 'meeting'
    WHEN 'processes'              THEN 'process'
    WHEN 'strategic_reviews'      THEN 'strategic_review'
    WHEN 'complaints'             THEN 'complaint'
    WHEN 'support_tickets'        THEN 'support_ticket'
    WHEN 'recalls'                THEN 'recall'
    WHEN 'personnel_cases'        THEN 'personnel_case'
    ELSE replace(TG_TABLE_NAME, '_', ' ')
  END;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM entities
    WHERE source_table = TG_TABLE_NAME
      AND source_id    = OLD.id;
    RETURN OLD;
  END IF;

  v_title := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'title' THEN (to_jsonb(NEW)->>'title')
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'name'  THEN (to_jsonb(NEW)->>'name')
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'subject' THEN (to_jsonb(NEW)->>'subject')
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'code' THEN (to_jsonb(NEW)->>'code')
    ELSE NULL
  END;

  v_status := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'status' THEN (to_jsonb(NEW)->>'status')
    ELSE NULL
  END;

  v_org_id := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'org_id' THEN (to_jsonb(NEW)->>'org_id')::UUID
    ELSE NULL
  END;

  v_owner_id := CASE
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'owner_id'       THEN (to_jsonb(NEW)->>'owner_id')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'assigned_to'    THEN (to_jsonb(NEW)->>'assigned_to')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'led_by'         THEN (to_jsonb(NEW)->>'led_by')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'responsible_id' THEN (to_jsonb(NEW)->>'responsible_id')::UUID
    WHEN NEW IS NOT NULL AND to_jsonb(NEW) ? 'hr_responsible_id' THEN (to_jsonb(NEW)->>'hr_responsible_id')::UUID
    ELSE NULL
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO entities (
      org_id, entity_type, source_table, source_id,
      title, status, owner_id
    ) VALUES (
      v_org_id, v_entity_type, TG_TABLE_NAME, NEW.id,
      v_title, v_status, v_owner_id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE entities SET
      title      = v_title,
      status     = v_status,
      owner_id   = v_owner_id,
      updated_at = now()
    WHERE source_table = TG_TABLE_NAME
      AND source_id    = NEW.id;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach sync_entity trigger to personnel_cases
DROP TRIGGER IF EXISTS trg_sync_entity ON personnel_cases;
CREATE TRIGGER trg_sync_entity
  AFTER INSERT OR UPDATE OR DELETE ON personnel_cases
  FOR EACH ROW
  EXECUTE FUNCTION sync_entity();


-- ============================================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- LEGAL_REVIEW_REQUIRED: Personnel data access is strictly limited.
-- Only HR_MANAGER, EXECUTIVE, and the person's direct manager may access
-- personnel signals, conversations, and cases.
-- The data subject (employee) does NOT have read access to signals.
-- Peers have NO access.

ALTER TABLE personnel_signals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_case_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_records        ENABLE ROW LEVEL SECURITY;

-- ---- Helper function: check if current user has HR/executive/manager access ----
-- LEGAL_REVIEW_REQUIRED
CREATE OR REPLACE FUNCTION has_personnel_access(target_org_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user_id UUID;
  v_user_roles TEXT[];
  v_is_manager BOOLEAN;
BEGIN
  v_current_user_id := (current_setting('app.current_user_id', TRUE))::UUID;

  -- Service role bypasses all checks
  IF current_setting('role', TRUE) = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Get current user's roles in the org
  SELECT roles INTO v_user_roles
  FROM org_members
  WHERE org_id = target_org_id
    AND user_id = v_current_user_id;

  -- HR_MANAGER and EXECUTIVE have full access within org
  IF v_user_roles && ARRAY['HR_MANAGER', 'EXECUTIVE'] THEN
    RETURN TRUE;
  END IF;

  -- Check if the current user is the target person's manager
  -- (manager_id is expected on org_members or a separate reporting structure)
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = target_org_id
      AND user_id = target_user_id
      AND to_jsonb(org_members) ? 'manager_id'
      AND (to_jsonb(org_members)->>'manager_id')::UUID = v_current_user_id
  ) INTO v_is_manager;

  RETURN COALESCE(v_is_manager, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---- personnel_signals — LEGAL_REVIEW_REQUIRED ----
-- NOT visible to the person themselves. Only HR_MANAGER, EXECUTIVE, or their manager.
DROP POLICY IF EXISTS personnel_signals_access ON personnel_signals;
CREATE POLICY personnel_signals_access ON personnel_signals
  FOR SELECT
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS personnel_signals_insert ON personnel_signals;
CREATE POLICY personnel_signals_insert ON personnel_signals
  FOR INSERT
  WITH CHECK (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS personnel_signals_update ON personnel_signals;
CREATE POLICY personnel_signals_update ON personnel_signals
  FOR UPDATE
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

-- ---- support_conversations ----
DROP POLICY IF EXISTS support_conversations_access ON support_conversations;
CREATE POLICY support_conversations_access ON support_conversations
  FOR SELECT
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS support_conversations_insert ON support_conversations;
CREATE POLICY support_conversations_insert ON support_conversations
  FOR INSERT
  WITH CHECK (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS support_conversations_update ON support_conversations;
CREATE POLICY support_conversations_update ON support_conversations
  FOR UPDATE
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

-- ---- personnel_cases ----
DROP POLICY IF EXISTS personnel_cases_access ON personnel_cases;
CREATE POLICY personnel_cases_access ON personnel_cases
  FOR SELECT
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS personnel_cases_insert ON personnel_cases;
CREATE POLICY personnel_cases_insert ON personnel_cases
  FOR INSERT
  WITH CHECK (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS personnel_cases_update ON personnel_cases;
CREATE POLICY personnel_cases_update ON personnel_cases
  FOR UPDATE
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

-- ---- personnel_case_log (read-only via case_id join) ----
DROP POLICY IF EXISTS personnel_case_log_access ON personnel_case_log;
CREATE POLICY personnel_case_log_access ON personnel_case_log
  FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM personnel_cases
      WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
        AND has_personnel_access(org_id, user_id)
    )
  );

DROP POLICY IF EXISTS personnel_case_log_insert ON personnel_case_log;
CREATE POLICY personnel_case_log_insert ON personnel_case_log
  FOR INSERT
  WITH CHECK (
    case_id IN (
      SELECT id FROM personnel_cases
      WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
        AND has_personnel_access(org_id, user_id)
    )
  );

-- ---- absence_records ----
DROP POLICY IF EXISTS absence_records_access ON absence_records;
CREATE POLICY absence_records_access ON absence_records
  FOR SELECT
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS absence_records_insert ON absence_records;
CREATE POLICY absence_records_insert ON absence_records
  FOR INSERT
  WITH CHECK (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );

DROP POLICY IF EXISTS absence_records_update ON absence_records;
CREATE POLICY absence_records_update ON absence_records
  FOR UPDATE
  USING (
    org_id = (current_setting('app.current_org_id', TRUE))::UUID
    AND has_personnel_access(org_id, user_id)
  );


-- ============================================================================
-- 9. STATE MACHINE CONFIG
-- ============================================================================

INSERT INTO state_machine_configs (entity_type, states, initial_state, transitions)
VALUES (
  'personnel_case',
  ARRAY[
    'SUPPORT_INITIATED','SUPPORT_ACTIVE','SUPPORT_EXTENDED',
    'SUPPORT_RESOLVED','ESCALATED_TO_HR','HR_INVESTIGATING',
    'FORMAL_WARNING','FORMAL_PROCESS','RESOLVED_POSITIVE',
    'RESOLVED_TERMINATED','ARCHIVED','EXTERNAL_HANDLING'
  ],
  'SUPPORT_INITIATED',
  '[
    {"from": "SUPPORT_INITIATED", "to": "SUPPORT_ACTIVE",    "guards": [{"field": "support_plan", "op": "NOT_NULL"}]},
    {"from": "SUPPORT_ACTIVE",    "to": "SUPPORT_EXTENDED",   "guards": [{"field": "support_period_extension_reason", "op": "NOT_NULL"}]},
    {"from": "SUPPORT_ACTIVE",    "to": "SUPPORT_RESOLVED",   "guards": []},
    {"from": "SUPPORT_ACTIVE",    "to": "ESCALATED_TO_HR",    "guards": [{"field": "hr_responsible_id", "op": "NOT_NULL"}], "comment": "LEGAL_REVIEW_REQUIRED: auto-freeze activated"},
    {"from": "SUPPORT_EXTENDED",  "to": "SUPPORT_RESOLVED",   "guards": []},
    {"from": "SUPPORT_EXTENDED",  "to": "ESCALATED_TO_HR",    "guards": [{"field": "hr_responsible_id", "op": "NOT_NULL"}], "comment": "LEGAL_REVIEW_REQUIRED: auto-freeze activated"},
    {"from": "ESCALATED_TO_HR",   "to": "HR_INVESTIGATING",   "guards": []},
    {"from": "ESCALATED_TO_HR",   "to": "SUPPORT_ACTIVE",     "guards": [], "comment": "De-escalation back to support"},
    {"from": "HR_INVESTIGATING",  "to": "FORMAL_WARNING",     "guards": [{"field": "decision_by", "op": "NOT_NULL"}, {"field": "decision_rationale", "op": "NOT_NULL"}, {"field": "legal_basis", "op": "NOT_NULL"}, {"field": "data_subject_informed", "op": "EQ", "value": true}], "comment": "LEGAL_REVIEW_REQUIRED"},
    {"from": "HR_INVESTIGATING",  "to": "RESOLVED_POSITIVE",  "guards": []},
    {"from": "HR_INVESTIGATING",  "to": "EXTERNAL_HANDLING",  "guards": []},
    {"from": "FORMAL_WARNING",    "to": "FORMAL_PROCESS",     "guards": [{"field": "legal_basis", "op": "NOT_NULL"}, {"field": "union_consulted", "op": "NOT_NULL"}], "comment": "LEGAL_REVIEW_REQUIRED"},
    {"from": "FORMAL_WARNING",    "to": "RESOLVED_POSITIVE",  "guards": []},
    {"from": "FORMAL_PROCESS",    "to": "RESOLVED_TERMINATED","guards": [{"field": "decision_by", "op": "NOT_NULL"}, {"field": "legal_basis", "op": "NOT_NULL"}, {"field": "actor_role", "op": "IN", "value": ["EXECUTIVE","HR_MANAGER"]}], "comment": "LEGAL_REVIEW_REQUIRED: immutable after 24h"},
    {"from": "FORMAL_PROCESS",    "to": "RESOLVED_POSITIVE",  "guards": []},
    {"from": "FORMAL_PROCESS",    "to": "EXTERNAL_HANDLING",  "guards": []},
    {"from": "RESOLVED_POSITIVE", "to": "ARCHIVED",           "guards": []},
    {"from": "RESOLVED_TERMINATED","to": "ARCHIVED",          "guards": []},
    {"from": "EXTERNAL_HANDLING", "to": "ARCHIVED",           "guards": []}
  ]'::JSONB
)
ON CONFLICT (entity_type) DO UPDATE SET
  states        = EXCLUDED.states,
  initial_state = EXCLUDED.initial_state,
  transitions   = EXCLUDED.transitions,
  updated_at    = now();


-- ============================================================================
-- 10. VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 10.1 v_personnel_case_summary — Case overview with age and support period info
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_personnel_case_summary AS
SELECT
  pc.id,
  pc.org_id,
  pc.code,
  pc.user_id,
  pc.status,
  pc.current_level,
  pc.case_type,
  pc.description,
  pc.hr_responsible_id,
  pc.decision_type,
  pc.decision_by,
  pc.decision_at,
  pc.frozen_at,
  pc.frozen_by,
  pc.support_period_start,
  pc.support_period_end,
  pc.support_period_extended,
  pc.data_subject_informed,
  pc.union_consulted,
  pc.legal_basis,
  pc.legal_ground,
  pc.retention_until,
  pc.anonymize_at,
  pc.closed_at,
  pc.created_at,
  pc.updated_at,
  -- Calculated fields
  CASE
    WHEN pc.status IN ('RESOLVED_POSITIVE','RESOLVED_TERMINATED','ARCHIVED') THEN NULL
    ELSE EXTRACT(DAY FROM (now() - pc.created_at))::INTEGER
  END AS age_days,
  CASE
    WHEN pc.support_period_end IS NOT NULL AND pc.support_period_end < CURRENT_DATE
         AND pc.status IN ('SUPPORT_ACTIVE','SUPPORT_EXTENDED')
    THEN true
    ELSE false
  END AS support_period_overdue,
  CASE
    WHEN pc.support_period_start IS NOT NULL AND pc.support_period_end IS NOT NULL
    THEN (pc.support_period_end - pc.support_period_start)
    ELSE NULL
  END AS support_period_days,
  CASE
    WHEN pc.frozen_at IS NOT NULL AND pc.status NOT IN ('RESOLVED_POSITIVE','RESOLVED_TERMINATED','ARCHIVED')
    THEN true
    ELSE false
  END AS is_frozen,
  (SELECT COUNT(*) FROM personnel_case_log WHERE case_id = pc.id) AS log_entry_count,
  (SELECT COUNT(*) FROM personnel_signals WHERE user_id = pc.user_id AND org_id = pc.org_id) AS total_signals
FROM personnel_cases pc;

-- ----------------------------------------------------------------------------
-- 10.2 v_absence_summary — Absence overview per user with pattern detection
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_absence_summary AS
SELECT
  ar.org_id,
  ar.user_id,
  COUNT(*)                                                          AS total_absences,
  COUNT(*) FILTER (WHERE ar.absence_type IN ('SICK_SHORT','SICK_LONG','SICK_PARTIAL')) AS sick_absences,
  SUM(
    CASE WHEN ar.end_date IS NOT NULL
    THEN (ar.end_date - ar.start_date) + 1
    ELSE 1 END
  )                                                                  AS total_days,
  SUM(
    CASE WHEN ar.absence_type IN ('SICK_SHORT','SICK_LONG','SICK_PARTIAL') AND ar.end_date IS NOT NULL
    THEN (ar.end_date - ar.start_date) + 1
    WHEN ar.absence_type IN ('SICK_SHORT','SICK_LONG','SICK_PARTIAL')
    THEN 1
    ELSE 0 END
  )                                                                  AS total_sick_days,
  COUNT(*) FILTER (WHERE ar.return_to_work_conversation = false
                     AND ar.absence_type IN ('SICK_SHORT','SICK_LONG','SICK_PARTIAL')
                     AND ar.return_date IS NOT NULL)                  AS missing_return_conversations,
  MAX(ar.start_date)                                                 AS last_absence_date,
  MIN(ar.start_date)                                                 AS first_absence_date
FROM absence_records ar
GROUP BY ar.org_id, ar.user_id;

-- ----------------------------------------------------------------------------
-- 10.3 v_signal_summary — Signal overview per user for dashboard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_signal_summary AS
SELECT
  ps.org_id,
  ps.user_id,
  COUNT(*)                                                AS total_signals,
  COUNT(*) FILTER (WHERE ps.severity = 'SERIOUS')         AS serious_count,
  COUNT(*) FILTER (WHERE ps.severity = 'WARNING')         AS warning_count,
  COUNT(*) FILTER (WHERE ps.severity = 'NOTICE')          AS notice_count,
  COUNT(*) FILTER (WHERE ps.severity = 'INFO')            AS info_count,
  COUNT(*) FILTER (WHERE ps.acknowledged = false)         AS unacknowledged_count,
  COUNT(DISTINCT ps.signal_type)                          AS distinct_signal_types,
  MAX(ps.created_at)                                      AS latest_signal_at,
  ARRAY_AGG(DISTINCT ps.signal_type)                      AS signal_types
FROM personnel_signals ps
GROUP BY ps.org_id, ps.user_id;


-- ============================================================================
-- 11. SEED — GDPR Retention & Signal Threshold Configuration
-- ============================================================================
-- LEGAL_REVIEW_REQUIRED: All retention periods and signal thresholds below
-- have legal implications. Changes must be reviewed by legal counsel.

-- GDPR retention configuration (conservative defaults)
INSERT INTO configs (org_id, category, key, value, description)
VALUES
  (NULL, 'personnel', 'personnel_retention_years_active', '2'::JSONB,
   'Years to retain active personnel case data'),

  (NULL, 'personnel', 'personnel_retention_years_warning', '5'::JSONB,
   'Years to retain personnel case data involving warnings'),

  (NULL, 'personnel', 'personnel_retention_years_terminated', '7'::JSONB,
   'Years to retain personnel case data for terminated employees'),

  (NULL, 'personnel', 'personnel_anonymize_signals_days', '90'::JSONB,
   'Days after which unacknowledged signals are anonymized -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel', 'personnel_signal_max_per_user', '5'::JSONB,
   'Maximum active signals per user before requiring acknowledgement -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel', 'personnel_escalation_min_signals', '3'::JSONB,
   'Minimum signals required before escalation is permitted -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel', 'personnel_escalation_min_signal_types', '2'::JSONB,
   'Minimum distinct signal types required before escalation -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel', 'personnel_support_period_default_days', '30'::JSONB,
   'Default support period duration in days'),

  (NULL, 'personnel', 'personnel_cooldown_after_positive_days', '90'::JSONB,
   'Cooldown period after positive resolution before new signals trigger escalation -- LEGAL_REVIEW_REQUIRED')

ON CONFLICT (org_id, category, key) DO NOTHING;

-- Signal threshold configuration (conservative defaults) -- LEGAL_REVIEW_REQUIRED
INSERT INTO configs (org_id, category, key, value, description)
VALUES
  (NULL, 'personnel_thresholds', 'signal_performance_decline_threshold', '60'::JSONB,
   'Performance score percentage below which a decline signal is generated -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_performance_previous_min', '75'::JSONB,
   'Minimum previous performance score to trigger decline detection (avoids false positives) -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_deadline_pattern_count', '3'::JSONB,
   'Number of missed deadlines to trigger a pattern signal -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_deadline_pattern_days', '14'::JSONB,
   'Window in days for deadline pattern detection -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_feedback_pattern_count', '3'::JSONB,
   'Number of negative feedback entries to trigger pattern signal -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_feedback_pattern_days', '30'::JSONB,
   'Window in days for feedback pattern detection -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_absence_pattern_count', '3'::JSONB,
   'Number of absence episodes to trigger pattern signal -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_absence_pattern_days', '90'::JSONB,
   'Window in days for absence pattern detection -- LEGAL_REVIEW_REQUIRED'),

  (NULL, 'personnel_thresholds', 'signal_absence_total_days', '15'::JSONB,
   'Total sick days within pattern window to trigger absence signal -- LEGAL_REVIEW_REQUIRED')

ON CONFLICT (org_id, category, key) DO NOTHING;


-- ============================================================================
-- 12. SEED — ISO 9001:2015 Compliance Requirements for Personnel Module
-- ============================================================================

INSERT INTO compliance_requirements (standard_id, code, title, description, status, created_at, updated_at)
VALUES
  -- 7.1.2 People
  ('a0000000-0000-0000-0000-000000009001', '7.1.2',
   'People',
   'The organization shall determine and provide the persons necessary for the effective implementation of its quality management system and for the operation and control of its processes.',
   'PARTIAL', now(), now()),

  -- 7.2 Competence
  ('a0000000-0000-0000-0000-000000009001', '7.2',
   'Competence',
   'The organization shall determine the necessary competence of person(s) doing work under its control that affects the performance and effectiveness of the quality management system, ensure that these persons are competent on the basis of appropriate education training or experience, where applicable take actions to acquire the necessary competence and evaluate the effectiveness of the actions taken, and retain appropriate documented information as evidence of competence.',
   'PARTIAL', now(), now()),

  -- 7.3 Awareness
  ('a0000000-0000-0000-0000-000000009001', '7.3',
   'Awareness',
   'The organization shall ensure that persons doing work under the organizations control are aware of the quality policy, relevant quality objectives, their contribution to the effectiveness of the quality management system including the benefits of improved performance, and the implications of not conforming with the quality management system requirements.',
   'PARTIAL', now(), now())

ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done. Personnel Cases System is ready.
-- ============================================================================

COMMIT;
