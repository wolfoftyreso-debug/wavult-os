-- ============================================================================
-- Hypbit OMS — Customer Quality System
-- File: 15_customer_quality.sql
-- Run: AFTER 14_permissions.sql in Supabase (PostgreSQL)
--
-- Complete customer quality lifecycle per ISO 9001:2015 clauses 8.2.1, 8.5.5,
-- 8.7, 9.1.2, 10.2.  Covers complaints, support tickets, product recalls,
-- and customer satisfaction surveys.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 complaints — Full complaint lifecycle per ISO 8.2.1, 8.7, 10.2
-- Tracks customer complaints from receipt through investigation, root-cause
-- analysis, resolution, and closure with SLA monitoring.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID          NOT NULL,
  code                    TEXT          NOT NULL,
  status                  TEXT          NOT NULL DEFAULT 'RECEIVED' CHECK (status IN (
                            'RECEIVED','ACKNOWLEDGED','INVESTIGATING',
                            'ROOT_CAUSE_IDENTIFIED','ACTION_PLANNED',
                            'IMPLEMENTING','RESOLVED','CLOSED','REOPENED'
                          )),
  priority                TEXT          NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  source                  TEXT          CHECK (source IN (
                            'CUSTOMER_FORM','EMAIL','PHONE','SOCIAL_MEDIA',
                            'FIELD_REPORT','INTERNAL_DETECTION','REGULATORY'
                          )),

  -- Customer reference
  customer_company_id     UUID,
  customer_contact_id     UUID,
  customer_reference      TEXT,

  -- Complaint details
  title                   TEXT          NOT NULL,
  description             TEXT          NOT NULL,
  product_or_service      TEXT,
  delivery_date           DATE,
  complaint_date          DATE          NOT NULL DEFAULT CURRENT_DATE,
  quantity_affected        INTEGER,
  defect_type             TEXT          CHECK (defect_type IN (
                            'FUNCTIONAL','COSMETIC','SAFETY','DELIVERY',
                            'SERVICE','DOCUMENTATION','REGULATORY','OTHER'
                          )),

  -- Financial
  claimed_amount          NUMERIC(12,2),
  claimed_currency        TEXT          DEFAULT 'EUR',
  approved_amount         NUMERIC(12,2),
  credit_note_id          UUID,
  cost_of_quality         NUMERIC(12,2),

  -- Ownership
  received_by             UUID,
  responsible_id          UUID,
  acknowledged_at         TIMESTAMPTZ,

  -- SLA tracking
  sla_response_hours      INTEGER,
  sla_resolution_days     INTEGER,
  sla_response_breached   BOOLEAN       DEFAULT false,
  sla_resolution_breached BOOLEAN       DEFAULT false,

  -- Investigation
  investigation_notes     TEXT,
  root_cause              TEXT,
  five_whys               JSONB         DEFAULT '[]',
  is_justified            BOOLEAN,
  justification_notes     TEXT,

  -- Cross-links
  linked_nc_id            UUID,
  linked_improvement_id   UUID,
  linked_process_id       UUID,

  -- Resolution
  resolution_description  TEXT,
  resolution_type         TEXT          CHECK (resolution_type IN (
                            'REPLACEMENT','REPAIR','CREDIT','REFUND',
                            'APOLOGY','PROCESS_CHANGE','NO_ACTION_JUSTIFIED'
                          )),

  -- Customer feedback
  customer_notified_at    TIMESTAMPTZ,
  customer_satisfied      BOOLEAN,
  customer_satisfaction_notes TEXT,
  nps_score               INTEGER       CHECK (nps_score >= 0 AND nps_score <= 10),

  -- Closure
  closed_at               TIMESTAMPTZ,
  closed_by               UUID,
  days_to_resolve         INTEGER,
  lessons_learned         TEXT,

  -- Meta
  metadata                JSONB         DEFAULT '{}',
  created_at              TIMESTAMPTZ   DEFAULT now(),
  updated_at              TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 support_tickets — Customer support ticket management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID          NOT NULL,
  code                        TEXT          NOT NULL,
  status                      TEXT          NOT NULL DEFAULT 'NEW' CHECK (status IN (
                                'NEW','ASSIGNED','IN_PROGRESS',
                                'WAITING_CUSTOMER','WAITING_INTERNAL',
                                'RESOLVED','CLOSED'
                              )),
  priority                    TEXT          NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  category                    TEXT          CHECK (category IN (
                                'QUESTION','HOW_TO','BUG_REPORT','FEATURE_REQUEST',
                                'COMPLAINT_ESCALATION','DOCUMENTATION','ACCESS','OTHER'
                              )),

  -- Customer reference
  customer_company_id         UUID,
  customer_contact_id         UUID,
  subject                     TEXT          NOT NULL,
  description                 TEXT          NOT NULL,
  channel                     TEXT          CHECK (channel IN ('EMAIL','PHONE','PORTAL','CHAT','INTERNAL')),

  -- Assignment
  assigned_to                 UUID,

  -- SLA
  sla_first_response_hours    INTEGER,
  sla_resolution_hours        INTEGER,
  first_responded_at          TIMESTAMPTZ,
  sla_first_response_breached BOOLEAN       DEFAULT false,

  -- Escalation
  escalation_level            INTEGER       DEFAULT 0,
  escalated_to                UUID,
  escalated_at                TIMESTAMPTZ,
  escalation_reason           TEXT,

  -- Cross-links
  linked_complaint_id         UUID          REFERENCES complaints(id),
  linked_nc_id                UUID,
  linked_task_id              UUID,

  -- Resolution
  resolved_at                 TIMESTAMPTZ,
  resolution_notes            TEXT,
  customer_rating             INTEGER       CHECK (customer_rating >= 1 AND customer_rating <= 5),

  -- Meta
  metadata                    JSONB         DEFAULT '{}',
  created_at                  TIMESTAMPTZ   DEFAULT now(),
  updated_at                  TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 ticket_messages — Conversation thread for support tickets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_messages (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID          NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type     TEXT          NOT NULL CHECK (sender_type IN ('CUSTOMER','AGENT','SYSTEM')),
  sender_id       UUID,
  content         TEXT          NOT NULL,
  attachments     JSONB         DEFAULT '[]',
  is_internal_note BOOLEAN      DEFAULT false,
  created_at      TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 recalls — Product/service recall management per ISO 8.5.5, 8.7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recalls (
  id                              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                          UUID          NOT NULL,
  code                            TEXT          NOT NULL,
  status                          TEXT          NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                                    'DRAFT','RISK_ASSESSMENT','APPROVED',
                                    'NOTIFYING','IN_PROGRESS','MONITORING','CLOSED'
                                  )),
  severity                        TEXT          NOT NULL CHECK (severity IN ('CLASS_I','CLASS_II','CLASS_III')),

  -- Details
  title                           TEXT          NOT NULL,
  description                     TEXT,
  reason                          TEXT,
  product_or_service              TEXT,

  -- Affected scope
  affected_batches                TEXT[]        DEFAULT '{}',
  affected_date_from              DATE,
  affected_date_to                DATE,
  estimated_affected_units        INTEGER,
  confirmed_affected_units        INTEGER,

  -- Risk assessment
  risk_assessment                 TEXT,
  risk_probability                INTEGER       CHECK (risk_probability >= 1 AND risk_probability <= 5),
  risk_severity                   INTEGER       CHECK (risk_severity >= 1 AND risk_severity <= 5),
  risk_score                      INTEGER       GENERATED ALWAYS AS (risk_probability * risk_severity) STORED,

  -- Approval
  decision_rationale              TEXT,
  approved_by                     UUID,
  approved_at                     TIMESTAMPTZ,

  -- Recall action
  recall_action                   TEXT          CHECK (recall_action IN (
                                    'FULL_RECALL','PARTIAL_RECALL','FIELD_CORRECTION',
                                    'CUSTOMER_NOTIFICATION','STOP_DELIVERY','REWORK'
                                  )),

  -- Notifications
  customer_notification_template  TEXT,
  regulatory_notification_required BOOLEAN      DEFAULT false,
  regulatory_body                 TEXT,
  regulatory_notified_at          TIMESTAMPTZ,

  -- Tracking
  affected_customers              JSONB         DEFAULT '[]',
  notified_customers              JSONB         DEFAULT '[]',
  returned_units                  INTEGER       DEFAULT 0,
  return_rate_pct                 NUMERIC(5,2),

  -- Cross-links
  source_nc_id                    UUID,
  source_complaint_ids            UUID[]        DEFAULT '{}',
  linked_improvement_id           UUID,

  -- Cost
  estimated_cost_eur              NUMERIC(12,2),
  actual_cost_eur                 NUMERIC(12,2),

  -- Closure
  closed_at                       TIMESTAMPTZ,
  effectiveness_review            TEXT,

  -- Meta
  metadata                        JSONB         DEFAULT '{}',
  created_at                      TIMESTAMPTZ   DEFAULT now(),
  updated_at                      TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.5 customer_satisfaction_surveys — Customer satisfaction measurement (ISO 9.1.2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_satisfaction_surveys (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID          NOT NULL,
  survey_type             TEXT          NOT NULL CHECK (survey_type IN (
                            'POST_DELIVERY','QUARTERLY','ANNUAL',
                            'POST_COMPLAINT','POST_SUPPORT'
                          )),

  -- Customer
  customer_company_id     UUID,
  customer_contact_id     UUID,
  sent_at                 TIMESTAMPTZ,
  responded_at            TIMESTAMPTZ,

  -- Scores
  nps_score               INTEGER       CHECK (nps_score >= 0 AND nps_score <= 10),
  overall_rating          INTEGER       CHECK (overall_rating >= 1 AND overall_rating <= 5),
  responses               JSONB         DEFAULT '{}',

  -- Category ratings
  quality_rating          INTEGER       CHECK (quality_rating >= 1 AND quality_rating <= 5),
  timeliness_rating       INTEGER       CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  communication_rating    INTEGER       CHECK (communication_rating >= 1 AND communication_rating <= 5),
  value_rating            INTEGER       CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Qualitative
  would_recommend         BOOLEAN,
  improvement_suggestions TEXT,

  -- Links
  linked_delivery_id      UUID,
  follow_up_required      BOOLEAN       DEFAULT false,
  follow_up_notes         TEXT,
  follow_up_by            UUID,

  -- Meta
  metadata                JSONB         DEFAULT '{}',
  created_at              TIMESTAMPTZ   DEFAULT now()
);


-- ============================================================================
-- 2. AUTO-CODE GENERATION — Sequences and triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Complaint code: REC-YYYY-NNN
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS complaint_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_complaint_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'REC-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
                lpad(nextval('complaint_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_code ON complaints;
CREATE TRIGGER trg_complaint_code
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION generate_complaint_code();

-- ----------------------------------------------------------------------------
-- 2.2 Support ticket code: SUP-YYYY-NNN
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS support_ticket_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_support_ticket_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'SUP-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
                lpad(nextval('support_ticket_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_ticket_code ON support_tickets;
CREATE TRIGGER trg_support_ticket_code
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_support_ticket_code();

-- ----------------------------------------------------------------------------
-- 2.3 Recall code: RECALL-YYYY-NNN
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS recall_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_recall_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'RECALL-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
                lpad(nextval('recall_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recall_code ON recalls;
CREATE TRIGGER trg_recall_code
  BEFORE INSERT ON recalls
  FOR EACH ROW
  EXECUTE FUNCTION generate_recall_code();


-- ============================================================================
-- 3. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaints_updated_at ON complaints;
CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_recalls_updated_at ON recalls;
CREATE TRIGGER trg_recalls_updated_at
  BEFORE UPDATE ON recalls
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- complaints
CREATE INDEX IF NOT EXISTS idx_complaints_org_id
  ON complaints (org_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status
  ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority
  ON complaints (priority);
CREATE INDEX IF NOT EXISTS idx_complaints_code
  ON complaints (code);
CREATE INDEX IF NOT EXISTS idx_complaints_source
  ON complaints (source);
CREATE INDEX IF NOT EXISTS idx_complaints_defect_type
  ON complaints (defect_type);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_company_id
  ON complaints (customer_company_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_contact_id
  ON complaints (customer_contact_id);
CREATE INDEX IF NOT EXISTS idx_complaints_responsible_id
  ON complaints (responsible_id);
CREATE INDEX IF NOT EXISTS idx_complaints_received_by
  ON complaints (received_by);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_date
  ON complaints (complaint_date);
CREATE INDEX IF NOT EXISTS idx_complaints_closed_at
  ON complaints (closed_at);
CREATE INDEX IF NOT EXISTS idx_complaints_linked_nc_id
  ON complaints (linked_nc_id);
CREATE INDEX IF NOT EXISTS idx_complaints_linked_improvement_id
  ON complaints (linked_improvement_id);
CREATE INDEX IF NOT EXISTS idx_complaints_linked_process_id
  ON complaints (linked_process_id);
CREATE INDEX IF NOT EXISTS idx_complaints_credit_note_id
  ON complaints (credit_note_id);

-- support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id
  ON support_tickets (org_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority
  ON support_tickets (priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_code
  ON support_tickets (code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category
  ON support_tickets (category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_company_id
  ON support_tickets (customer_company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_contact_id
  ON support_tickets (customer_contact_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to
  ON support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_channel
  ON support_tickets (channel);
CREATE INDEX IF NOT EXISTS idx_support_tickets_linked_complaint_id
  ON support_tickets (linked_complaint_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_linked_nc_id
  ON support_tickets (linked_nc_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_linked_task_id
  ON support_tickets (linked_task_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_escalated_to
  ON support_tickets (escalated_to);

-- ticket_messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id
  ON ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_type
  ON ticket_messages (sender_type);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id
  ON ticket_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at
  ON ticket_messages (created_at);

-- recalls
CREATE INDEX IF NOT EXISTS idx_recalls_org_id
  ON recalls (org_id);
CREATE INDEX IF NOT EXISTS idx_recalls_status
  ON recalls (status);
CREATE INDEX IF NOT EXISTS idx_recalls_severity
  ON recalls (severity);
CREATE INDEX IF NOT EXISTS idx_recalls_code
  ON recalls (code);
CREATE INDEX IF NOT EXISTS idx_recalls_approved_by
  ON recalls (approved_by);
CREATE INDEX IF NOT EXISTS idx_recalls_source_nc_id
  ON recalls (source_nc_id);
CREATE INDEX IF NOT EXISTS idx_recalls_linked_improvement_id
  ON recalls (linked_improvement_id);
CREATE INDEX IF NOT EXISTS idx_recalls_recall_action
  ON recalls (recall_action);
CREATE INDEX IF NOT EXISTS idx_recalls_risk_score
  ON recalls (risk_score);

-- customer_satisfaction_surveys
CREATE INDEX IF NOT EXISTS idx_csat_surveys_org_id
  ON customer_satisfaction_surveys (org_id);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_survey_type
  ON customer_satisfaction_surveys (survey_type);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_customer_company_id
  ON customer_satisfaction_surveys (customer_company_id);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_customer_contact_id
  ON customer_satisfaction_surveys (customer_contact_id);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_nps_score
  ON customer_satisfaction_surveys (nps_score);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_responded_at
  ON customer_satisfaction_surveys (responded_at);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_follow_up_by
  ON customer_satisfaction_surveys (follow_up_by);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_linked_delivery_id
  ON customer_satisfaction_surveys (linked_delivery_id);


-- ============================================================================
-- 5. ENTITY SYNC TRIGGERS
-- ============================================================================

-- Extend sync_entity() to handle customer quality tables
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
    WHEN 'tasks'              THEN 'task'
    WHEN 'deals'              THEN 'deal'
    WHEN 'leads'              THEN 'lead'
    WHEN 'contacts'           THEN 'contact'
    WHEN 'companies'          THEN 'company'
    WHEN 'non_conformances'   THEN 'nc'
    WHEN 'improvements'       THEN 'improvement'
    WHEN 'documents'          THEN 'document'
    WHEN 'risks'              THEN 'risk'
    WHEN 'payouts'            THEN 'payout'
    WHEN 'decisions'          THEN 'decision'
    WHEN 'meetings'           THEN 'meeting'
    WHEN 'processes'          THEN 'process'
    WHEN 'strategic_reviews'  THEN 'strategic_review'
    WHEN 'complaints'         THEN 'complaint'
    WHEN 'support_tickets'    THEN 'support_ticket'
    WHEN 'recalls'            THEN 'recall'
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

-- Attach sync_entity trigger to customer quality tables
DROP TRIGGER IF EXISTS trg_sync_entity ON complaints;
CREATE TRIGGER trg_sync_entity
  AFTER INSERT OR UPDATE OR DELETE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION sync_entity();

DROP TRIGGER IF EXISTS trg_sync_entity ON support_tickets;
CREATE TRIGGER trg_sync_entity
  AFTER INSERT OR UPDATE OR DELETE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION sync_entity();

DROP TRIGGER IF EXISTS trg_sync_entity ON recalls;
CREATE TRIGGER trg_sync_entity
  AFTER INSERT OR UPDATE OR DELETE ON recalls
  FOR EACH ROW
  EXECUTE FUNCTION sync_entity();


-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 v_complaint_summary — Complaint overview with age and SLA info
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_complaint_summary AS
SELECT
  c.id,
  c.org_id,
  c.code,
  c.title,
  c.status,
  c.priority,
  c.source,
  c.defect_type,
  c.customer_company_id,
  c.customer_contact_id,
  c.responsible_id,
  c.complaint_date,
  c.is_justified,
  c.resolution_type,
  c.customer_satisfied,
  c.nps_score,
  c.claimed_amount,
  c.claimed_currency,
  c.approved_amount,
  c.cost_of_quality,
  c.days_to_resolve,
  c.sla_response_hours,
  c.sla_resolution_days,
  c.sla_response_breached,
  c.sla_resolution_breached,
  c.created_at,
  c.acknowledged_at,
  c.closed_at,
  -- Calculated fields
  CASE
    WHEN c.status IN ('CLOSED','RESOLVED') THEN NULL
    ELSE EXTRACT(DAY FROM (now() - c.created_at))::INTEGER
  END AS age_days,
  CASE
    WHEN c.acknowledged_at IS NOT NULL AND c.sla_response_hours IS NOT NULL
    THEN EXTRACT(EPOCH FROM (c.acknowledged_at - c.created_at)) / 3600 <= c.sla_response_hours
    ELSE NULL
  END AS response_within_sla,
  CASE
    WHEN c.closed_at IS NOT NULL AND c.sla_resolution_days IS NOT NULL
    THEN EXTRACT(DAY FROM (c.closed_at - c.created_at)) <= c.sla_resolution_days
    ELSE NULL
  END AS resolution_within_sla
FROM complaints c;

-- ----------------------------------------------------------------------------
-- 6.2 v_support_metrics — Aggregated support ticket metrics per org
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_support_metrics AS
SELECT
  t.org_id,
  COUNT(*)                                                          AS total_tickets,
  COUNT(*) FILTER (WHERE t.status = 'NEW')                         AS new_tickets,
  COUNT(*) FILTER (WHERE t.status IN ('ASSIGNED','IN_PROGRESS'))   AS active_tickets,
  COUNT(*) FILTER (WHERE t.status IN ('WAITING_CUSTOMER','WAITING_INTERNAL')) AS waiting_tickets,
  COUNT(*) FILTER (WHERE t.status IN ('RESOLVED','CLOSED'))        AS resolved_tickets,
  COUNT(*) FILTER (WHERE t.sla_first_response_breached = true)     AS sla_response_breaches,
  ROUND(AVG(
    CASE WHEN t.resolved_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600
    ELSE NULL END
  )::NUMERIC, 1)                                                   AS avg_resolution_hours,
  ROUND(AVG(t.customer_rating)::NUMERIC, 2)                        AS avg_customer_rating,
  COUNT(*) FILTER (WHERE t.escalation_level > 0)                   AS escalated_tickets,
  COUNT(*) FILTER (WHERE t.category = 'COMPLAINT_ESCALATION')      AS complaint_escalations,
  -- Per-priority breakdown
  COUNT(*) FILTER (WHERE t.priority = 'URGENT')                    AS urgent_count,
  COUNT(*) FILTER (WHERE t.priority = 'HIGH')                      AS high_count,
  COUNT(*) FILTER (WHERE t.priority = 'MEDIUM')                    AS medium_count,
  COUNT(*) FILTER (WHERE t.priority = 'LOW')                       AS low_count
FROM support_tickets t
GROUP BY t.org_id;

-- ----------------------------------------------------------------------------
-- 6.3 v_nps_trend — NPS trend over time from surveys and complaints
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_nps_trend AS
WITH nps_data AS (
  -- From surveys
  SELECT
    org_id,
    date_trunc('month', COALESCE(responded_at, created_at))::DATE AS period,
    nps_score,
    survey_type AS source_type
  FROM customer_satisfaction_surveys
  WHERE nps_score IS NOT NULL

  UNION ALL

  -- From complaint resolutions
  SELECT
    org_id,
    date_trunc('month', COALESCE(closed_at, created_at))::DATE AS period,
    nps_score,
    'COMPLAINT'::TEXT AS source_type
  FROM complaints
  WHERE nps_score IS NOT NULL
)
SELECT
  org_id,
  period,
  COUNT(*)                                                    AS response_count,
  ROUND(AVG(nps_score)::NUMERIC, 1)                          AS avg_nps,
  COUNT(*) FILTER (WHERE nps_score >= 9)                      AS promoters,
  COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score <= 8)   AS passives,
  COUNT(*) FILTER (WHERE nps_score <= 6)                      AS detractors,
  ROUND(
    (COUNT(*) FILTER (WHERE nps_score >= 9)::NUMERIC -
     COUNT(*) FILTER (WHERE nps_score <= 6)::NUMERIC) /
    NULLIF(COUNT(*), 0) * 100
  , 1)                                                        AS nps_index
FROM nps_data
GROUP BY org_id, period
ORDER BY org_id, period;

-- ----------------------------------------------------------------------------
-- 6.4 v_recall_status — Recall overview with progress tracking
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_recall_status AS
SELECT
  r.id,
  r.org_id,
  r.code,
  r.title,
  r.status,
  r.severity,
  r.recall_action,
  r.product_or_service,
  r.risk_probability,
  r.risk_severity,
  r.risk_score,
  r.estimated_affected_units,
  r.confirmed_affected_units,
  r.returned_units,
  r.return_rate_pct,
  r.regulatory_notification_required,
  r.regulatory_notified_at,
  r.estimated_cost_eur,
  r.actual_cost_eur,
  r.approved_at,
  r.closed_at,
  r.created_at,
  -- Calculated fields
  CASE
    WHEN r.status = 'CLOSED' THEN NULL
    ELSE EXTRACT(DAY FROM (now() - r.created_at))::INTEGER
  END AS age_days,
  CASE
    WHEN r.estimated_affected_units > 0 AND r.confirmed_affected_units IS NOT NULL
    THEN ROUND((r.confirmed_affected_units::NUMERIC / r.estimated_affected_units) * 100, 1)
    ELSE NULL
  END AS confirmation_rate_pct,
  CASE
    WHEN r.regulatory_notification_required = true AND r.regulatory_notified_at IS NULL
    THEN true
    ELSE false
  END AS regulatory_notification_pending,
  jsonb_array_length(r.affected_customers)  AS affected_customer_count,
  jsonb_array_length(r.notified_customers)  AS notified_customer_count
FROM recalls r;


-- ============================================================================
-- 7. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE complaints                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalls                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_satisfaction_surveys  ENABLE ROW LEVEL SECURITY;

-- complaints
DROP POLICY IF EXISTS complaints_org_isolation ON complaints;
CREATE POLICY complaints_org_isolation ON complaints
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS complaints_org_insert ON complaints;
CREATE POLICY complaints_org_insert ON complaints
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- support_tickets
DROP POLICY IF EXISTS support_tickets_org_isolation ON support_tickets;
CREATE POLICY support_tickets_org_isolation ON support_tickets
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS support_tickets_org_insert ON support_tickets;
CREATE POLICY support_tickets_org_insert ON support_tickets
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- ticket_messages (org isolation via ticket_id join)
DROP POLICY IF EXISTS ticket_messages_org_isolation ON ticket_messages;
CREATE POLICY ticket_messages_org_isolation ON ticket_messages
  USING (ticket_id IN (
    SELECT id FROM support_tickets
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

DROP POLICY IF EXISTS ticket_messages_org_insert ON ticket_messages;
CREATE POLICY ticket_messages_org_insert ON ticket_messages
  FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT id FROM support_tickets
    WHERE org_id = (current_setting('app.current_org_id', TRUE))::UUID
  ));

-- recalls
DROP POLICY IF EXISTS recalls_org_isolation ON recalls;
CREATE POLICY recalls_org_isolation ON recalls
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS recalls_org_insert ON recalls;
CREATE POLICY recalls_org_insert ON recalls
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- customer_satisfaction_surveys
DROP POLICY IF EXISTS csat_surveys_org_isolation ON customer_satisfaction_surveys;
CREATE POLICY csat_surveys_org_isolation ON customer_satisfaction_surveys
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS csat_surveys_org_insert ON customer_satisfaction_surveys;
CREATE POLICY csat_surveys_org_insert ON customer_satisfaction_surveys
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);


-- ============================================================================
-- 8. STATE MACHINE CONFIGS
-- ============================================================================

-- Complaint workflow
INSERT INTO state_machine_configs (entity_type, states, initial_state, transitions)
VALUES (
  'complaint',
  ARRAY['RECEIVED','ACKNOWLEDGED','INVESTIGATING','ROOT_CAUSE_IDENTIFIED',
        'ACTION_PLANNED','IMPLEMENTING','RESOLVED','CLOSED','REOPENED'],
  'RECEIVED',
  '[
    {"from": "RECEIVED",              "to": "ACKNOWLEDGED",          "guards": [{"field": "responsible_id", "op": "NOT_NULL"}]},
    {"from": "ACKNOWLEDGED",          "to": "INVESTIGATING",         "guards": []},
    {"from": "INVESTIGATING",         "to": "ROOT_CAUSE_IDENTIFIED", "guards": [{"field": "root_cause", "op": "NOT_NULL"}, {"field": "is_justified", "op": "NOT_NULL"}]},
    {"from": "ROOT_CAUSE_IDENTIFIED", "to": "ACTION_PLANNED",        "guards": [{"field": "linked_nc_id", "op": "NOT_NULL_OR", "alt_field": "justification_notes"}]},
    {"from": "ACTION_PLANNED",        "to": "IMPLEMENTING",          "guards": []},
    {"from": "IMPLEMENTING",          "to": "RESOLVED",              "guards": [{"field": "resolution_description", "op": "NOT_NULL"}, {"field": "resolution_type", "op": "NOT_NULL"}]},
    {"from": "RESOLVED",              "to": "CLOSED",                "guards": [{"field": "customer_notified_at", "op": "NOT_NULL"}]},
    {"from": "CLOSED",                "to": "REOPENED",              "guards": []},
    {"from": "REOPENED",              "to": "INVESTIGATING",         "guards": []}
  ]'::JSONB
)
ON CONFLICT (entity_type) DO UPDATE SET
  states        = EXCLUDED.states,
  initial_state = EXCLUDED.initial_state,
  transitions   = EXCLUDED.transitions,
  updated_at    = now();

-- Support ticket workflow
INSERT INTO state_machine_configs (entity_type, states, initial_state, transitions)
VALUES (
  'support_ticket',
  ARRAY['NEW','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','WAITING_INTERNAL','RESOLVED','CLOSED'],
  'NEW',
  '[
    {"from": "NEW",               "to": "ASSIGNED",          "guards": [{"field": "assigned_to", "op": "NOT_NULL"}]},
    {"from": "ASSIGNED",          "to": "IN_PROGRESS",       "guards": []},
    {"from": "IN_PROGRESS",       "to": "WAITING_CUSTOMER",  "guards": []},
    {"from": "IN_PROGRESS",       "to": "WAITING_INTERNAL",  "guards": []},
    {"from": "IN_PROGRESS",       "to": "RESOLVED",          "guards": [{"field": "resolution_notes", "op": "NOT_NULL"}]},
    {"from": "WAITING_CUSTOMER",  "to": "IN_PROGRESS",       "guards": []},
    {"from": "WAITING_INTERNAL",  "to": "IN_PROGRESS",       "guards": []},
    {"from": "RESOLVED",          "to": "CLOSED",            "guards": []},
    {"from": "RESOLVED",          "to": "IN_PROGRESS",       "guards": []},
    {"from": "CLOSED",            "to": "NEW",               "guards": []}
  ]'::JSONB
)
ON CONFLICT (entity_type) DO UPDATE SET
  states        = EXCLUDED.states,
  initial_state = EXCLUDED.initial_state,
  transitions   = EXCLUDED.transitions,
  updated_at    = now();

-- Recall workflow
INSERT INTO state_machine_configs (entity_type, states, initial_state, transitions)
VALUES (
  'recall',
  ARRAY['DRAFT','RISK_ASSESSMENT','APPROVED','NOTIFYING','IN_PROGRESS','MONITORING','CLOSED'],
  'DRAFT',
  '[
    {"from": "DRAFT",            "to": "RISK_ASSESSMENT",  "guards": []},
    {"from": "RISK_ASSESSMENT",  "to": "APPROVED",         "guards": [{"field": "approved_by", "op": "NOT_NULL"}, {"field": "actor_role", "op": "IN", "value": ["EXECUTIVE","QUALITY_MANAGER","ADMIN"]}]},
    {"from": "APPROVED",         "to": "NOTIFYING",        "guards": [{"field": "customer_notification_template", "op": "NOT_NULL"}]},
    {"from": "NOTIFYING",        "to": "IN_PROGRESS",      "guards": []},
    {"from": "IN_PROGRESS",      "to": "MONITORING",       "guards": []},
    {"from": "MONITORING",       "to": "CLOSED",           "guards": [{"field": "effectiveness_review", "op": "NOT_NULL"}]},
    {"from": "MONITORING",       "to": "IN_PROGRESS",      "guards": []}
  ]'::JSONB
)
ON CONFLICT (entity_type) DO UPDATE SET
  states        = EXCLUDED.states,
  initial_state = EXCLUDED.initial_state,
  transitions   = EXCLUDED.transitions,
  updated_at    = now();


-- ============================================================================
-- 9. SEED — SLA Configuration
-- ============================================================================
-- Create a configs table if it does not yet exist, for system-wide key/value
-- configuration entries.

CREATE TABLE IF NOT EXISTS configs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID,
  category    TEXT          NOT NULL,
  key         TEXT          NOT NULL,
  value       JSONB         NOT NULL DEFAULT '{}',
  description TEXT,
  created_at  TIMESTAMPTZ   DEFAULT now(),
  updated_at  TIMESTAMPTZ   DEFAULT now(),
  UNIQUE(org_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_configs_org_id   ON configs (org_id);
CREATE INDEX IF NOT EXISTS idx_configs_category ON configs (category);
CREATE INDEX IF NOT EXISTS idx_configs_key      ON configs (key);

ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configs_read ON configs;
CREATE POLICY configs_read ON configs
  FOR SELECT
  USING (
    org_id IS NULL  -- system-wide configs readable by all
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

DROP POLICY IF EXISTS configs_manage ON configs;
CREATE POLICY configs_manage ON configs
  FOR ALL
  USING (
    org_id IS NULL AND current_setting('role', TRUE) = 'service_role'
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

-- SLA defaults (system-wide, org_id = NULL)
INSERT INTO configs (org_id, category, key, value, description)
VALUES
  (NULL, 'sla', 'complaint_response_hours', '{"LOW": 48, "MEDIUM": 24, "HIGH": 8, "CRITICAL": 4}'::JSONB,
   'Maximum hours to acknowledge a complaint by priority'),

  (NULL, 'sla', 'complaint_resolution_days', '{"LOW": 30, "MEDIUM": 14, "HIGH": 7, "CRITICAL": 3}'::JSONB,
   'Maximum days to resolve a complaint by priority'),

  (NULL, 'sla', 'ticket_first_response_hours', '{"LOW": 24, "MEDIUM": 8, "HIGH": 4, "URGENT": 1}'::JSONB,
   'Maximum hours for first response on support ticket by priority'),

  (NULL, 'sla', 'ticket_resolution_hours', '{"LOW": 120, "MEDIUM": 48, "HIGH": 24, "URGENT": 8}'::JSONB,
   'Maximum hours to resolve a support ticket by priority'),

  (NULL, 'sla', 'recall_regulatory_notification_hours', '{"CLASS_I": 24, "CLASS_II": 72, "CLASS_III": 168}'::JSONB,
   'Maximum hours to notify regulatory body after recall approval by severity class')

ON CONFLICT (org_id, category, key) DO NOTHING;


-- ============================================================================
-- 10. SEED — ISO 9001:2015 Compliance Requirements for Customer Quality
-- ============================================================================

-- Assumes compliance_standards row for ISO 9001:2015 exists (seeded in 09)
INSERT INTO compliance_requirements (standard_id, code, title, description, status, created_at, updated_at)
VALUES
  -- 8.2.1 Customer communication
  ('a0000000-0000-0000-0000-000000009001', '8.2.1',
   'Customer communication',
   'Communication with customers shall include providing information relating to products and services, handling enquiries contracts or orders including changes, obtaining customer feedback including customer complaints, handling or controlling customer property, and establishing specific requirements for contingency actions when relevant.',
   'PARTIAL', now(), now()),

  -- 8.5.5 Post-delivery activities
  ('a0000000-0000-0000-0000-000000009001', '8.5.5',
   'Post-delivery activities',
   'The organization shall meet requirements for post-delivery activities associated with the products and services. In determining the extent of post-delivery activities required, the organization shall consider statutory and regulatory requirements, potential undesired consequences, the nature use and intended lifetime of its products and services, customer requirements, and customer feedback.',
   'PARTIAL', now(), now()),

  -- 8.7.1 Control of nonconforming outputs
  ('a0000000-0000-0000-0000-000000009001', '8.7.1',
   'Control of nonconforming outputs — General',
   'The organization shall ensure that outputs that do not conform to their requirements are identified and controlled to prevent their unintended use or delivery. The organization shall take appropriate action based on the nature of the nonconformity and its effect on the conformity of products and services including those detected after delivery.',
   'PARTIAL', now(), now()),

  -- 8.7.2 Nonconforming outputs — documented information
  ('a0000000-0000-0000-0000-000000009001', '8.7.2',
   'Control of nonconforming outputs — Documented information',
   'The organization shall retain documented information that describes the nonconformity, describes the actions taken, describes any concessions obtained, and identifies the authority deciding the action in respect of the nonconformity.',
   'PARTIAL', now(), now()),

  -- 9.1.2 Customer satisfaction
  ('a0000000-0000-0000-0000-000000009001', '9.1.2',
   'Customer satisfaction',
   'The organization shall monitor customers perceptions of the degree to which their needs and expectations have been fulfilled. The organization shall determine the methods for obtaining monitoring and reviewing this information. Examples of monitoring customer perceptions can include customer surveys, customer feedback on delivered products and services, meetings with customers, market-share analysis, compliments, warranty claims, and dealer reports.',
   'PARTIAL', now(), now()),

  -- 10.2.1 Nonconformity and corrective action
  ('a0000000-0000-0000-0000-000000009001', '10.2.1',
   'Nonconformity and corrective action',
   'When a nonconformity occurs including any arising from complaints, the organization shall react to the nonconformity and as applicable take action to control and correct it and deal with the consequences. It shall also evaluate the need for action to eliminate the cause(s) of the nonconformity in order that it does not recur or occur elsewhere, by reviewing and analysing the nonconformity, determining the causes, and determining if similar nonconformities exist or could potentially occur.',
   'PARTIAL', now(), now())

ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done. Customer Quality System is ready.
-- ============================================================================

COMMIT;
