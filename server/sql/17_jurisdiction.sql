-- ============================================================================
-- Hypbit OMS — Multi-Jurisdiction Compliance Framework
-- File: 17_jurisdiction.sql
-- Run: AFTER 15_customer_quality.sql in Supabase (PostgreSQL)
--
-- Complete multi-jurisdiction compliance framework supporting per-country
-- regulatory rules, feature gating, legal review tracking, and org-level
-- jurisdiction bindings.  Covers GDPR, employment law, financial reporting,
-- consumer protection, and data residency across EU/EEA, Americas, MENA,
-- and APAC regions.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 jurisdictions — Master registry of supported jurisdictions
-- Each row represents a country, sub-national region, or supranational body
-- with its own regulatory requirements.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jurisdictions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT          UNIQUE NOT NULL,
  name          TEXT          NOT NULL,
  region        TEXT          NOT NULL CHECK (region IN (
                  'EU','EEA','AMERICAS','MENA','APAC','GLOBAL'
                )),
  gdpr_applies  BOOLEAN       NOT NULL,
  description   TEXT,
  is_active     BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.2 jurisdiction_rules — Country-specific rules stored as config
-- All regulatory parameters (termination notice, VAT rates, retention periods,
-- etc.) are captured as key-value pairs per jurisdiction and module, enabling
-- rule-driven behaviour without code changes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jurisdiction_rules (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id     UUID          NOT NULL REFERENCES jurisdictions(id),
  module              TEXT          NOT NULL,
  rule_key            TEXT          NOT NULL,
  rule_value          JSONB         NOT NULL,
  legal_reference     TEXT,
  description         TEXT,
  requires_legal_review BOOLEAN     DEFAULT true,
  legal_reviewed_by   TEXT,
  legal_reviewed_at   DATE,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  UNIQUE(jurisdiction_id, module, rule_key)
);

-- ----------------------------------------------------------------------------
-- 1.3 org_jurisdictions — Which jurisdictions an organisation operates in
-- Links an org to one or more jurisdictions.  Exactly one should be marked
-- is_primary = true per org.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_jurisdictions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID          NOT NULL,
  jurisdiction_id     UUID          NOT NULL REFERENCES jurisdictions(id),
  is_primary          BOOLEAN       DEFAULT false,
  activated_at        TIMESTAMPTZ   DEFAULT now(),
  legal_entity_name   TEXT,
  legal_entity_number TEXT,
  activated_by        UUID,
  UNIQUE(org_id, jurisdiction_id)
);

-- ----------------------------------------------------------------------------
-- 1.4 legal_reviews — Tracks legal sign-off for features per jurisdiction
-- Before a regulated feature can be enabled for an org in a specific
-- jurisdiction, a legal review must be completed and approved.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_reviews (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID,
  jurisdiction_id   UUID          REFERENCES jurisdictions(id),
  module            TEXT,
  feature           TEXT,
  status            TEXT          NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                      'PENDING','IN_REVIEW','APPROVED','CONDITIONAL','REJECTED'
                    )),
  reviewer_name     TEXT,
  reviewer_firm     TEXT,
  reviewed_at       DATE,
  conditions        TEXT,
  valid_until       DATE,
  document_url      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.5 feature_gates — Registry of features that can be gated per jurisdiction
-- Each feature that requires legal clearance or jurisdiction-specific rules
-- is registered here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_gates (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_code          TEXT          UNIQUE NOT NULL,
  module                TEXT          NOT NULL,
  description           TEXT,
  default_enabled       BOOLEAN       DEFAULT false,
  requires_legal_review BOOLEAN       DEFAULT true,
  created_at            TIMESTAMPTZ   DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.6 feature_gate_status — Per-org, per-jurisdiction feature enablement
-- Tracks whether a specific feature is enabled for an org in a jurisdiction,
-- optionally linked to an approved legal review.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_gate_status (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID          NOT NULL,
  feature_gate_id   UUID          NOT NULL REFERENCES feature_gates(id),
  jurisdiction_id   UUID          REFERENCES jurisdictions(id),
  enabled           BOOLEAN       DEFAULT false,
  legal_review_id   UUID          REFERENCES legal_reviews(id),
  enabled_by        UUID,
  enabled_at        TIMESTAMPTZ,
  UNIQUE(org_id, feature_gate_id, jurisdiction_id)
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- jurisdictions
CREATE INDEX IF NOT EXISTS idx_jurisdictions_code
  ON jurisdictions (code);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_region
  ON jurisdictions (region);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_gdpr_applies
  ON jurisdictions (gdpr_applies);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_is_active
  ON jurisdictions (is_active);

-- jurisdiction_rules
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rules_jurisdiction_id
  ON jurisdiction_rules (jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rules_module
  ON jurisdiction_rules (module);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rules_rule_key
  ON jurisdiction_rules (rule_key);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rules_module_key
  ON jurisdiction_rules (module, rule_key);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rules_requires_review
  ON jurisdiction_rules (requires_legal_review) WHERE requires_legal_review = true;

-- org_jurisdictions
CREATE INDEX IF NOT EXISTS idx_org_jurisdictions_org_id
  ON org_jurisdictions (org_id);
CREATE INDEX IF NOT EXISTS idx_org_jurisdictions_jurisdiction_id
  ON org_jurisdictions (jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_org_jurisdictions_is_primary
  ON org_jurisdictions (is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_org_jurisdictions_activated_by
  ON org_jurisdictions (activated_by);

-- legal_reviews
CREATE INDEX IF NOT EXISTS idx_legal_reviews_org_id
  ON legal_reviews (org_id);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_jurisdiction_id
  ON legal_reviews (jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_module
  ON legal_reviews (module);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_feature
  ON legal_reviews (feature);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_status
  ON legal_reviews (status);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_valid_until
  ON legal_reviews (valid_until);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_org_jurisdiction
  ON legal_reviews (org_id, jurisdiction_id);

-- feature_gates
CREATE INDEX IF NOT EXISTS idx_feature_gates_feature_code
  ON feature_gates (feature_code);
CREATE INDEX IF NOT EXISTS idx_feature_gates_module
  ON feature_gates (module);
CREATE INDEX IF NOT EXISTS idx_feature_gates_requires_review
  ON feature_gates (requires_legal_review) WHERE requires_legal_review = true;

-- feature_gate_status
CREATE INDEX IF NOT EXISTS idx_feature_gate_status_org_id
  ON feature_gate_status (org_id);
CREATE INDEX IF NOT EXISTS idx_feature_gate_status_feature_gate_id
  ON feature_gate_status (feature_gate_id);
CREATE INDEX IF NOT EXISTS idx_feature_gate_status_jurisdiction_id
  ON feature_gate_status (jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_feature_gate_status_enabled
  ON feature_gate_status (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_feature_gate_status_legal_review_id
  ON feature_gate_status (legal_review_id);
CREATE INDEX IF NOT EXISTS idx_feature_gate_status_org_jurisdiction
  ON feature_gate_status (org_id, jurisdiction_id);


-- ============================================================================
-- 3. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE jurisdictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_jurisdictions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_gates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_gate_status  ENABLE ROW LEVEL SECURITY;

-- jurisdictions — readable by all authenticated users (reference data)
DROP POLICY IF EXISTS jurisdictions_read ON jurisdictions;
CREATE POLICY jurisdictions_read ON jurisdictions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS jurisdictions_manage ON jurisdictions;
CREATE POLICY jurisdictions_manage ON jurisdictions
  FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

-- jurisdiction_rules — readable by all, managed by service role
DROP POLICY IF EXISTS jurisdiction_rules_read ON jurisdiction_rules;
CREATE POLICY jurisdiction_rules_read ON jurisdiction_rules
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS jurisdiction_rules_manage ON jurisdiction_rules;
CREATE POLICY jurisdiction_rules_manage ON jurisdiction_rules
  FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

-- org_jurisdictions — org-isolated
DROP POLICY IF EXISTS org_jurisdictions_org_isolation ON org_jurisdictions;
CREATE POLICY org_jurisdictions_org_isolation ON org_jurisdictions
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS org_jurisdictions_org_insert ON org_jurisdictions;
CREATE POLICY org_jurisdictions_org_insert ON org_jurisdictions
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

-- legal_reviews — org-isolated (NULL org_id = system-wide, readable by service role)
DROP POLICY IF EXISTS legal_reviews_org_isolation ON legal_reviews;
CREATE POLICY legal_reviews_org_isolation ON legal_reviews
  USING (
    org_id IS NULL AND current_setting('role', TRUE) = 'service_role'
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

DROP POLICY IF EXISTS legal_reviews_org_insert ON legal_reviews;
CREATE POLICY legal_reviews_org_insert ON legal_reviews
  FOR INSERT
  WITH CHECK (
    org_id IS NULL AND current_setting('role', TRUE) = 'service_role'
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

-- feature_gates — readable by all (reference data)
DROP POLICY IF EXISTS feature_gates_read ON feature_gates;
CREATE POLICY feature_gates_read ON feature_gates
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS feature_gates_manage ON feature_gates;
CREATE POLICY feature_gates_manage ON feature_gates
  FOR ALL
  USING (current_setting('role', TRUE) = 'service_role');

-- feature_gate_status — org-isolated
DROP POLICY IF EXISTS feature_gate_status_org_isolation ON feature_gate_status;
CREATE POLICY feature_gate_status_org_isolation ON feature_gate_status
  USING (org_id = (current_setting('app.current_org_id', TRUE))::UUID);

DROP POLICY IF EXISTS feature_gate_status_org_insert ON feature_gate_status;
CREATE POLICY feature_gate_status_org_insert ON feature_gate_status
  FOR INSERT
  WITH CHECK (org_id = (current_setting('app.current_org_id', TRUE))::UUID);


-- ============================================================================
-- 4. VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 v_org_jurisdiction_rules — Flattened view of rules applicable to an org
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_org_jurisdiction_rules AS
SELECT
  oj.org_id,
  j.code   AS jurisdiction_code,
  j.name   AS jurisdiction_name,
  j.region,
  j.gdpr_applies,
  oj.is_primary,
  jr.module,
  jr.rule_key,
  jr.rule_value,
  jr.legal_reference,
  jr.requires_legal_review,
  jr.legal_reviewed_by,
  jr.legal_reviewed_at
FROM org_jurisdictions oj
  JOIN jurisdictions j       ON j.id = oj.jurisdiction_id
  JOIN jurisdiction_rules jr ON jr.jurisdiction_id = j.id
WHERE j.is_active = true;

-- ----------------------------------------------------------------------------
-- 4.2 v_org_feature_gates — Current feature gate status per org/jurisdiction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_org_feature_gates AS
SELECT
  fgs.org_id,
  fg.feature_code,
  fg.module,
  fg.description         AS feature_description,
  j.code                 AS jurisdiction_code,
  j.name                 AS jurisdiction_name,
  fgs.enabled,
  fgs.enabled_at,
  fgs.enabled_by,
  lr.status              AS legal_review_status,
  lr.reviewed_at         AS legal_reviewed_at,
  lr.valid_until         AS legal_valid_until,
  lr.conditions          AS legal_conditions,
  fg.requires_legal_review,
  CASE
    WHEN fg.requires_legal_review = true AND lr.id IS NULL THEN 'REVIEW_REQUIRED'
    WHEN fg.requires_legal_review = true AND lr.status = 'PENDING' THEN 'REVIEW_PENDING'
    WHEN fg.requires_legal_review = true AND lr.status = 'IN_REVIEW' THEN 'REVIEW_IN_PROGRESS'
    WHEN fg.requires_legal_review = true AND lr.status = 'REJECTED' THEN 'REVIEW_REJECTED'
    WHEN fg.requires_legal_review = true AND lr.status = 'CONDITIONAL' THEN 'CONDITIONALLY_APPROVED'
    WHEN fg.requires_legal_review = true AND lr.status = 'APPROVED'
         AND lr.valid_until IS NOT NULL AND lr.valid_until < CURRENT_DATE THEN 'REVIEW_EXPIRED'
    WHEN fgs.enabled = true THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END AS gate_status
FROM feature_gate_status fgs
  JOIN feature_gates fg     ON fg.id = fgs.feature_gate_id
  LEFT JOIN jurisdictions j ON j.id  = fgs.jurisdiction_id
  LEFT JOIN legal_reviews lr ON lr.id = fgs.legal_review_id;

-- ----------------------------------------------------------------------------
-- 4.3 v_jurisdiction_coverage — Summary of rule coverage per jurisdiction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_jurisdiction_coverage AS
SELECT
  j.id              AS jurisdiction_id,
  j.code,
  j.name,
  j.region,
  j.gdpr_applies,
  j.is_active,
  COUNT(jr.id)                                                    AS total_rules,
  COUNT(jr.id) FILTER (WHERE jr.module = 'PERSONNEL')             AS personnel_rules,
  COUNT(jr.id) FILTER (WHERE jr.module = 'RETENTION')             AS retention_rules,
  COUNT(jr.id) FILTER (WHERE jr.module = 'FINANCIAL')             AS financial_rules,
  COUNT(jr.id) FILTER (WHERE jr.module = 'COMPLAINTS')            AS complaints_rules,
  COUNT(jr.id) FILTER (WHERE jr.requires_legal_review = true)     AS rules_requiring_review,
  COUNT(jr.id) FILTER (WHERE jr.legal_reviewed_at IS NOT NULL)    AS rules_reviewed,
  COUNT(jr.id) FILTER (WHERE jr.requires_legal_review = true
                          AND jr.legal_reviewed_at IS NULL)        AS rules_pending_review,
  COUNT(DISTINCT oj.org_id)                                       AS org_count
FROM jurisdictions j
  LEFT JOIN jurisdiction_rules jr ON jr.jurisdiction_id = j.id
  LEFT JOIN org_jurisdictions oj  ON oj.jurisdiction_id = j.id
GROUP BY j.id, j.code, j.name, j.region, j.gdpr_applies, j.is_active;


-- ============================================================================
-- 5. SEED — Jurisdictions
-- ============================================================================

INSERT INTO jurisdictions (code, name, region, gdpr_applies, description) VALUES
  ('SE',      'Sweden',                             'EU',       true,
   'EU member state. Strong employment protections, LAS (Lagen om anställningsskydd). GDPR via Swedish Data Protection Authority (IMY).'),
  ('LT',      'Lithuania',                          'EU',       true,
   'EU member state. Labour Code with employee protections. GDPR via State Data Protection Inspectorate (VDAI).'),
  ('US',      'United States (Federal)',             'AMERICAS', false,
   'Federal level. At-will employment. No federal GDPR equivalent. SOX, FCPA, state-level privacy laws vary.'),
  ('US-TX',   'United States — Texas',              'AMERICAS', false,
   'Texas state. At-will employment. Texas Data Privacy and Security Act (TDPSA). No state income tax.'),
  ('US-DE',   'United States — Delaware',           'AMERICAS', false,
   'Delaware state. At-will employment. Popular incorporation state. Delaware Personal Data Privacy Act (DPDPA).'),
  ('AE',      'United Arab Emirates (Federal)',      'MENA',     false,
   'Federal UAE. UAE Labour Law (Federal Decree-Law No. 33 of 2021). UAE PDPL (Federal Decree-Law No. 45 of 2021).'),
  ('AE-DIFC', 'UAE — DIFC (Dubai International Financial Centre)', 'MENA', false,
   'DIFC free zone. Own employment law (DIFC Law No. 2 of 2019). DIFC Data Protection Law 2020 (GDPR-aligned).'),
  ('EU',      'European Union (Supranational)',      'EU',       true,
   'Supranational. GDPR regulation. Framework directives on employment, consumer protection, and financial reporting.'),
  ('GB',      'United Kingdom',                     'EEA',      false,
   'Post-Brexit. UK GDPR + Data Protection Act 2018. Employment Rights Act 1996. FCA regulated.'),
  ('DE',      'Germany',                            'EU',       true,
   'EU member state. Strongest employment protections in EU. Works councils. Betriebsverfassungsgesetz (BetrVG). GDPR via BfDI.'),
  ('EE',      'Estonia',                            'EU',       true,
   'EU member state. Digital-first governance. E-residency program. Employment Contracts Act. GDPR via AKI.'),
  ('FI',      'Finland',                            'EU',       true,
   'EU member state. Strong collective bargaining. Employment Contracts Act. GDPR via Office of the Data Protection Ombudsman.'),
  ('NO',      'Norway',                             'EEA',      true,
   'EEA member (not EU). GDPR applies via EEA Agreement. Working Environment Act. Datatilsynet.')
ON CONFLICT (code) DO UPDATE SET
  name         = EXCLUDED.name,
  region       = EXCLUDED.region,
  gdpr_applies = EXCLUDED.gdpr_applies,
  description  = EXCLUDED.description,
  is_active    = true;


-- ============================================================================
-- 6. SEED — Jurisdiction Rules
-- ============================================================================

-- --------------------------------------------------------------------------
-- 6.1 PERSONNEL rules
-- --------------------------------------------------------------------------

-- Sweden (SE) — Personnel
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'termination_notice_period',
   '{"employer_months": [1,2,3,4,5,6], "thresholds_years": [0,2,4,6,8,10], "employee_months": [1,2,3,3,3,3]}'::JSONB,
   'LAS §11', 'Notice period scales with years of service under LAS'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'termination_requires_union',
   '{"required": true, "consultation_days": 14, "negotiation_required": true}'::JSONB,
   'MBL §11-14', 'Employer must negotiate with union before termination decisions'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'termination_legal_basis',
   '{"valid_grounds": ["REDUNDANCY","PERSONAL_REASONS"], "prohibited_grounds": ["UNION_MEMBERSHIP","PREGNANCY","PARENTAL_LEAVE","WHISTLEBLOWING"], "last_in_first_out": true}'::JSONB,
   'LAS §7', 'Objective grounds required. LIFO principle (turordningsregler) applies for redundancy'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'warning_before_termination',
   '{"required_for_personal_reasons": true, "documentation_required": true, "min_warnings": 1}'::JSONB,
   'LAS §7, AD case law', 'Written warning typically required before termination for personal reasons'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'max_probation_months',
   '{"months": 6}'::JSONB,
   'LAS §6', 'Maximum probationary period is 6 months'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'sick_leave_employer_days',
   '{"employer_pays_days": 14, "day_1_karensdag": true, "employer_rate_pct": 80, "after_day_14": "FORSAKRINGSKASSAN"}'::JSONB,
   'SjLL', 'Employer pays day 2-14 at 80%. Day 1 is karensdag (unpaid). Försäkringskassan after day 14'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'auto_escalation_enabled',
   '{"enabled": true, "reason": "Union consultation requirements demand timely escalation"}'::JSONB,
   'MBL §11', 'Auto-escalation enabled to ensure MBL compliance timelines are met'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'PERSONNEL', 'auto_escalation_max_level',
   '{"max_level": 3, "levels": ["DIRECT_MANAGER","HR_MANAGER","LEGAL_COUNSEL"]}'::JSONB,
   'Internal policy', 'Three-tier escalation: manager, HR, legal counsel')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- United States (US) — Personnel
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'termination_notice_period',
   '{"employer_months": [0], "thresholds_years": [0], "at_will": true, "warn_act_threshold_employees": 100, "warn_act_notice_days": 60}'::JSONB,
   'At-will doctrine, WARN Act', 'At-will employment. No notice required except WARN Act for mass layoffs (100+ employees, 60 days notice)'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'termination_requires_union',
   '{"required": false, "if_unionized": true, "cba_governs": true}'::JSONB,
   'NLRA', 'No union requirement unless workforce is unionized; then CBA governs'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'termination_legal_basis',
   '{"valid_grounds": ["AT_WILL","CAUSE","REDUNDANCY"], "prohibited_grounds": ["RACE","SEX","RELIGION","NATIONAL_ORIGIN","AGE","DISABILITY","GENETIC_INFO","RETALIATION"], "at_will": true}'::JSONB,
   'Title VII, ADA, ADEA', 'At-will but cannot terminate for protected class membership or retaliation'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'warning_before_termination',
   '{"required_for_personal_reasons": false, "recommended": true, "progressive_discipline_common": true}'::JSONB,
   'Best practice', 'Not legally required but progressive discipline recommended to mitigate wrongful termination claims'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'max_probation_months',
   '{"months": null, "note": "No statutory limit; employer discretion"}'::JSONB,
   'N/A', 'No federal statutory limit on probationary periods'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'sick_leave_employer_days',
   '{"employer_pays_days": null, "federal_mandate": false, "state_varies": true, "fmla_weeks": 12, "fmla_unpaid": true}'::JSONB,
   'FMLA', 'No federal paid sick leave mandate. FMLA provides 12 weeks unpaid. State laws vary'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'auto_escalation_enabled',
   '{"enabled": true, "reason": "Documentation trail critical for at-will defense"}'::JSONB,
   'Best practice', 'Auto-escalation enabled to build documentation trail for potential litigation defense'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'PERSONNEL', 'auto_escalation_max_level',
   '{"max_level": 3, "levels": ["DIRECT_MANAGER","HR_BUSINESS_PARTNER","EMPLOYMENT_COUNSEL"]}'::JSONB,
   'Internal policy', 'Three-tier escalation: manager, HR BP, employment counsel')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- UAE-DIFC — Personnel
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'termination_notice_period',
   '{"employer_days": [30], "employee_days": [30], "during_probation_days": 7, "minimum_days": 30}'::JSONB,
   'DIFC Law No. 2/2019, Art. 59', 'Minimum 30 days notice by either party. 7 days during probation'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'termination_requires_union',
   '{"required": false, "unions_exist": false}'::JSONB,
   'DIFC Law No. 2/2019', 'No trade unions in DIFC. No consultation requirement'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'termination_legal_basis',
   '{"valid_grounds": ["REDUNDANCY","MISCONDUCT","POOR_PERFORMANCE","INCAPACITY","MUTUAL_AGREEMENT"], "prohibited_grounds": ["DISCRIMINATION","WHISTLEBLOWING","FILING_COMPLAINT"], "end_of_service_gratuity": true}'::JSONB,
   'DIFC Law No. 2/2019, Art. 58-62', 'Valid grounds required. End-of-service gratuity mandatory'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'warning_before_termination',
   '{"required_for_personal_reasons": true, "documentation_required": true, "min_warnings": 1, "performance_improvement_plan": true}'::JSONB,
   'DIFC Law No. 2/2019, Art. 58', 'Written warning required for performance-related termination. PIP recommended'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'max_probation_months',
   '{"months": 6}'::JSONB,
   'DIFC Law No. 2/2019, Art. 34', 'Maximum probation period is 6 months'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'sick_leave_employer_days',
   '{"employer_pays_days": 60, "full_pay_days": 10, "half_pay_days": 20, "unpaid_days": 30}'::JSONB,
   'DIFC Law No. 2/2019, Art. 37', 'Sick leave: 10 days full pay, 20 days half pay, 30 days unpaid (per year)'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'auto_escalation_enabled',
   '{"enabled": true, "reason": "End-of-service gratuity calculation requires timely HR processing"}'::JSONB,
   'Internal policy', 'Auto-escalation to ensure gratuity and notice period compliance'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'PERSONNEL', 'auto_escalation_max_level',
   '{"max_level": 2, "levels": ["HR_MANAGER","LEGAL_COUNSEL"]}'::JSONB,
   'Internal policy', 'Two-tier escalation: HR manager, legal counsel')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- Lithuania (LT) — Personnel
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'termination_notice_period',
   '{"employer_months": [1], "extended_for_vulnerable_months": [3], "vulnerable_groups": ["PREGNANT","DISABLED","UNDER_3_CHILD","PRE_RETIREMENT"], "employee_months": [1]}'::JSONB,
   'Labour Code Art. 57', 'Standard 1 month notice. Extended to 3 months for vulnerable employees'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'termination_requires_union',
   '{"required": true, "if_work_council_exists": true, "consultation_days": 5}'::JSONB,
   'Labour Code Art. 65', 'Must inform work council at least 5 working days before dismissal'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'termination_legal_basis',
   '{"valid_grounds": ["REDUNDANCY","FAULT","WILL_OF_EMPLOYER","MUTUAL_AGREEMENT"], "prohibited_grounds": ["UNION_MEMBERSHIP","PREGNANCY","PARENTAL_LEAVE","WHISTLEBLOWING","SICK_LEAVE"], "severance_required": true, "severance_months": 2}'::JSONB,
   'Labour Code Art. 57-59', 'Valid grounds required. Severance pay of 2 average monthly salaries for redundancy'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'warning_before_termination',
   '{"required_for_personal_reasons": true, "documentation_required": true, "min_warnings": 1}'::JSONB,
   'Labour Code Art. 58', 'Written warning required before termination for employee fault'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'max_probation_months',
   '{"months": 3}'::JSONB,
   'Labour Code Art. 36', 'Maximum probation period is 3 months'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'sick_leave_employer_days',
   '{"employer_pays_days": 2, "employer_rate_pct": 62.06, "after_day_2": "SODRA", "sodra_rate_pct": 62.06}'::JSONB,
   'Sickness and Maternity Social Insurance Law', 'Employer pays first 2 days at 62.06%. SODRA (social insurance) pays from day 3'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'auto_escalation_enabled',
   '{"enabled": true, "reason": "Work council notification deadlines require timely processing"}'::JSONB,
   'Labour Code Art. 65', 'Auto-escalation to meet statutory work council notification deadlines'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'PERSONNEL', 'auto_escalation_max_level',
   '{"max_level": 3, "levels": ["DIRECT_MANAGER","HR_MANAGER","LEGAL_COUNSEL"]}'::JSONB,
   'Internal policy', 'Three-tier escalation: manager, HR, legal counsel')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;


-- --------------------------------------------------------------------------
-- 6.2 RETENTION rules
-- --------------------------------------------------------------------------

-- EU (supranational) — Retention
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'RETENTION', 'personnel_signals_days',
   '{"default_days": 90, "with_consent_days": 365, "sensitive_data_days": 30}'::JSONB,
   'GDPR Art. 5(1)(e)', 'Personnel signal data retained per purpose limitation and storage limitation principles'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'RETENTION', 'personnel_cases_active_years',
   '{"active_years": 3, "after_closure_years": 5, "litigation_hold": true}'::JSONB,
   'GDPR Art. 17, national labour laws', 'Personnel cases retained for statute of limitations period'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'RETENTION', 'gdpr_right_to_erasure',
   '{"enabled": true, "response_days": 30, "extension_days": 60, "exceptions": ["LEGAL_OBLIGATION","PUBLIC_INTEREST","LEGAL_CLAIMS"]}'::JSONB,
   'GDPR Art. 17', 'Right to erasure (right to be forgotten) with 30-day response window, extendable by 60 days'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'RETENTION', 'gdpr_right_to_access',
   '{"enabled": true, "response_days": 30, "extension_days": 60, "format": "MACHINE_READABLE", "free_of_charge": true}'::JSONB,
   'GDPR Art. 15', 'Data subject access request — 30-day response, electronic format if requested'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'RETENTION', 'data_localization',
   '{"required": false, "eu_eea_adequate": true, "sccs_required_for_third_country": true, "transfer_impact_assessment": true}'::JSONB,
   'GDPR Art. 44-49', 'Data may transfer within EU/EEA. SCCs required for third-country transfers'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'RETENTION', 'dp_law',
   '{"name": "General Data Protection Regulation", "short": "GDPR", "regulation_number": "EU 2016/679", "effective_date": "2018-05-25", "supervisory_authority": "National DPAs"}'::JSONB,
   'GDPR', 'GDPR is the primary data protection regulation across all EU member states')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- US (federal) — Retention
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'RETENTION', 'personnel_signals_days',
   '{"default_days": 365, "no_federal_limit": true, "state_varies": true}'::JSONB,
   'EEOC guidelines', 'No strict federal retention limit for personnel signals. EEOC recommends 1 year minimum'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'RETENTION', 'personnel_cases_active_years',
   '{"active_years": 3, "after_closure_years": 7, "eeoc_charge_years": 1, "litigation_hold": true}'::JSONB,
   'Title VII, FLSA, ADEA', 'Personnel records retained 1 year after termination (EEOC), payroll 3 years (FLSA), I-9 forms 3 years'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'RETENTION', 'gdpr_right_to_erasure',
   '{"enabled": false, "state_level_rights": true, "ccpa_deletion": true, "ccpa_response_days": 45}'::JSONB,
   'CCPA/CPRA (CA), TDPSA (TX)', 'No federal right to erasure. CCPA provides deletion rights (45-day response). State laws vary'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'RETENTION', 'gdpr_right_to_access',
   '{"enabled": false, "state_level_rights": true, "ccpa_access": true, "ccpa_response_days": 45}'::JSONB,
   'CCPA/CPRA (CA), TDPSA (TX)', 'No federal right to access. CCPA provides access rights. State laws vary'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'RETENTION', 'data_localization',
   '{"required": false, "no_federal_requirement": true, "sector_specific": true, "hipaa_phi": true, "ferpa_education": true}'::JSONB,
   'Various federal statutes', 'No general data localization. Sector-specific rules (HIPAA for health, FERPA for education)'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'RETENTION', 'dp_law',
   '{"name": "No federal comprehensive privacy law", "short": "Various", "sector_laws": ["HIPAA","FERPA","GLBA","COPPA","CCPA","CPRA"], "state_comprehensive": ["CA","VA","CO","CT","UT","TX","OR","MT"]}'::JSONB,
   'Various', 'Patchwork of federal sector-specific and state comprehensive privacy laws')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- UAE (federal) — Retention
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'RETENTION', 'personnel_signals_days',
   '{"default_days": 365, "sensitive_data_days": 90}'::JSONB,
   'PDPL Art. 5', 'Data retained per purpose limitation under UAE PDPL'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'RETENTION', 'personnel_cases_active_years',
   '{"active_years": 2, "after_closure_years": 5, "litigation_hold": true}'::JSONB,
   'UAE Labour Law Art. 6', 'Personnel records retained for litigation period'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'RETENTION', 'gdpr_right_to_erasure',
   '{"enabled": true, "response_days": 30, "exceptions": ["LEGAL_OBLIGATION","PUBLIC_INTEREST"]}'::JSONB,
   'PDPL Art. 14', 'UAE PDPL provides erasure rights similar to GDPR'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'RETENTION', 'gdpr_right_to_access',
   '{"enabled": true, "response_days": 30}'::JSONB,
   'PDPL Art. 13', 'UAE PDPL provides data access rights'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'RETENTION', 'data_localization',
   '{"required": true, "exceptions": ["ADEQUATE_COUNTRY","CONTRACTUAL_NECESSITY","EXPLICIT_CONSENT"], "cross_border_requires_approval": true}'::JSONB,
   'PDPL Art. 22', 'Data localization required with limited exceptions for cross-border transfer'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'RETENTION', 'dp_law',
   '{"name": "Personal Data Protection Law", "short": "PDPL", "decree": "Federal Decree-Law No. 45 of 2021", "effective_date": "2022-01-02", "supervisory_authority": "UAE Data Office"}'::JSONB,
   'PDPL', 'UAE Personal Data Protection Law effective January 2022')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- AE-DIFC — Retention
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'RETENTION', 'personnel_signals_days',
   '{"default_days": 180, "sensitive_data_days": 60}'::JSONB,
   'DIFC DPL Art. 16', 'Purpose limitation under DIFC Data Protection Law'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'RETENTION', 'personnel_cases_active_years',
   '{"active_years": 2, "after_closure_years": 6, "litigation_hold": true}'::JSONB,
   'DIFC Law No. 2/2019', 'Employment records retained for 6-year limitation period'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'RETENTION', 'gdpr_right_to_erasure',
   '{"enabled": true, "response_days": 30, "extension_days": 30, "exceptions": ["LEGAL_OBLIGATION","LEGAL_CLAIMS","PUBLIC_INTEREST"]}'::JSONB,
   'DIFC DPL Art. 27', 'DIFC DPL right to erasure — GDPR-aligned with 30-day response'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'RETENTION', 'gdpr_right_to_access',
   '{"enabled": true, "response_days": 30, "extension_days": 30, "format": "MACHINE_READABLE"}'::JSONB,
   'DIFC DPL Art. 22', 'DIFC DPL data subject access right — GDPR-aligned'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'RETENTION', 'data_localization',
   '{"required": false, "adequate_jurisdictions_accepted": true, "binding_corporate_rules": true, "standard_contractual_clauses": true}'::JSONB,
   'DIFC DPL Art. 26', 'DIFC allows cross-border transfers to adequate jurisdictions or with safeguards'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'RETENTION', 'dp_law',
   '{"name": "DIFC Data Protection Law", "short": "DIFC DPL", "law_number": "DIFC Law No. 5 of 2020", "effective_date": "2020-07-01", "supervisory_authority": "Commissioner of Data Protection", "gdpr_aligned": true}'::JSONB,
   'DIFC DPL 2020', 'DIFC Data Protection Law is substantially aligned with GDPR')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;


-- --------------------------------------------------------------------------
-- 6.3 FINANCIAL rules
-- --------------------------------------------------------------------------

-- Sweden (SE) — Financial
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'chart_of_accounts',
   '{"standard": "BAS", "version": "BAS 2024", "mandatory": false, "widely_used": true}'::JSONB,
   'BAS-kontogruppen', 'BAS chart of accounts is the de facto standard in Sweden'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'vat_rate_standard',
   '{"standard_pct": 25, "reduced_pct": [12, 6], "reduced_categories": {"12": "food,hotels,camping", "6": "books,newspapers,cultural,transport"}, "zero_rated": ["export","intra_eu_supply"]}'::JSONB,
   'Mervärdesskattelagen (ML)', 'Standard VAT 25%. Reduced rates 12% (food/hotels) and 6% (books/transport)'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'vat_reporting',
   '{"frequency": "MONTHLY", "threshold_annual_sek": 40000000, "quarterly_below": true, "annual_below_sek": 1000000, "filing_deadline_days": 26, "digital_filing": true}'::JSONB,
   'Skatteförfarandelagen (SFL)', 'Monthly VAT if turnover > 40M SEK, quarterly below that, annual < 1M SEK'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'fiscal_year',
   '{"standard": "CALENDAR", "alternatives": ["0101-1231","0501-0430","0701-0630","0901-0831"], "custom_allowed": true}'::JSONB,
   'Bokföringslagen (BFL)', 'Calendar year default. Broken fiscal years allowed with Tax Agency approval'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'export_format',
   '{"primary": "SIE4", "alternatives": ["SIE5"], "description": "Standard Import/Export format for Swedish accounting"}'::JSONB,
   'SIE-gruppen', 'SIE4 is the standard accounting data exchange format in Sweden'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'audit_required',
   '{"required": true, "exemption_thresholds": {"employees": 3, "assets_msek": 1.5, "revenue_msek": 3}, "exemption_rule": "meet_2_of_3_for_2_years"}'::JSONB,
   'Aktiebolagslagen (ABL) 9 kap', 'Statutory audit required for all AB. Small companies exempt if meeting 2 of 3 thresholds for 2 years'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'corporate_tax',
   '{"rate_pct": 20.6, "tax_year": "FISCAL_YEAR", "advance_payments": true}'::JSONB,
   'Inkomstskattelagen (IL)', 'Corporate tax rate 20.6%. Paid as advance payments during the fiscal year'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'FINANCIAL', 'sales_tax',
   '{"type": "VAT", "included_in_price": true, "reverse_charge": true}'::JSONB,
   'ML', 'VAT system (not sales tax). Consumer prices include VAT. B2B reverse charge for cross-border')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- Lithuania (LT) — Financial
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'chart_of_accounts',
   '{"standard": "Lithuanian_Standard_CoA", "mandatory": true, "regulated_by": "Ministry of Finance"}'::JSONB,
   'Law on Accounting, Government Resolution', 'Mandatory chart of accounts prescribed by Ministry of Finance'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'vat_rate_standard',
   '{"standard_pct": 21, "reduced_pct": [9, 5], "reduced_categories": {"9": "heating,books,hotels,cultural", "5": "pharmaceuticals"}, "zero_rated": ["export","intra_eu_supply"]}'::JSONB,
   'Law on VAT', 'Standard VAT 21%. Reduced rates 9% (heating/books/hotels) and 5% (pharmaceuticals)'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'vat_reporting',
   '{"frequency": "MONTHLY", "quarterly_threshold_eur": 60000, "filing_deadline_day": 25, "digital_filing": true, "system": "i.SAF"}'::JSONB,
   'Law on Tax Administration', 'Monthly VAT filing. Quarterly if turnover < 60k EUR. Digital filing via i.SAF system'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'fiscal_year',
   '{"standard": "CALENDAR", "custom_allowed": false}'::JSONB,
   'Law on Accounting', 'Calendar year is mandatory fiscal year'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'export_format',
   '{"primary": "i.SAF-T", "description": "Lithuanian Standard Audit File for Tax"}'::JSONB,
   'STI regulations', 'i.SAF-T is the mandatory data export format for tax reporting'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'audit_required',
   '{"required": true, "exemption_thresholds": {"employees": 50, "assets_meur": 2, "revenue_meur": 3.5}, "exemption_rule": "meet_2_of_3"}'::JSONB,
   'Law on Audit', 'Statutory audit required. Small companies exempt if meeting 2 of 3 thresholds'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'corporate_tax',
   '{"rate_pct": 15, "small_company_rate_pct": 0, "small_threshold_eur": 300000, "small_max_employees": 10}'::JSONB,
   'Law on Corporate Income Tax', 'Standard 15%. Small companies (< 300k EUR, < 10 employees) can apply 0% for first year'),
  ((SELECT id FROM jurisdictions WHERE code = 'LT'), 'FINANCIAL', 'sales_tax',
   '{"type": "VAT", "included_in_price": true, "reverse_charge": true}'::JSONB,
   'Law on VAT', 'VAT system. Consumer prices include VAT. Reverse charge for B2B cross-border')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- United States (US) — Financial
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'chart_of_accounts',
   '{"standard": "US_GAAP", "mandatory_for_public": true, "private_flexible": true, "sec_reporting": true}'::JSONB,
   'FASB ASC, SEC regulations', 'US GAAP mandatory for public companies. Private companies have flexibility'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'vat_rate_standard',
   '{"standard_pct": null, "type": "SALES_TAX", "no_federal_vat": true, "state_rates_vary": true, "avg_combined_pct": 7.12}'::JSONB,
   'State tax codes', 'No federal VAT. Sales tax at state/local level. Rates vary by state (0-10%+)'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'vat_reporting',
   '{"frequency": "VARIES_BY_STATE", "quarterly_common": true, "monthly_high_volume": true, "nexus_rules": true}'::JSONB,
   'State tax authorities, Wayfair ruling', 'Sales tax filing frequency varies by state and volume. Economic nexus rules apply post-Wayfair'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'fiscal_year',
   '{"standard": "FLEXIBLE", "calendar_or_fiscal": true, "irs_form_1128_to_change": true}'::JSONB,
   'IRC §441-§443', 'Calendar or fiscal year. IRS Form 1128 required to change'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'export_format',
   '{"primary": "XBRL", "alternatives": ["CSV","QBO"], "sec_requires_xbrl": true}'::JSONB,
   'SEC EDGAR requirements', 'XBRL required for SEC filings. Various formats for private companies'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'audit_required',
   '{"required_for_public": true, "sox_compliance": true, "private_varies": true, "pcaob_regulated": true}'::JSONB,
   'SOX Section 404, Securities Exchange Act', 'Public companies require annual audit + SOX compliance. Private companies per lender/investor requirements'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'corporate_tax',
   '{"federal_rate_pct": 21, "state_rate_pct_range": [0, 11.5], "no_state_tax_states": ["NV","SD","TX","WA","WY"], "estimated_payments_quarterly": true}'::JSONB,
   'IRC §11, state tax codes', 'Federal 21%. State rates 0-11.5%. Some states have no corporate income tax'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'FINANCIAL', 'sales_tax',
   '{"type": "SALES_TAX", "included_in_price": false, "added_at_checkout": true, "origin_or_destination": "DESTINATION_MOST_STATES"}'::JSONB,
   'State tax codes', 'Sales tax added at point of sale (not included in listed price). Destination-based in most states')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- UAE (federal) — Financial
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'chart_of_accounts',
   '{"standard": "IFRS", "mandatory": true, "local_gaap_alternative": false}'::JSONB,
   'Federal Law No. 32 of 2021 (Commercial Companies Law)', 'IFRS mandatory for all companies in UAE'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'vat_rate_standard',
   '{"standard_pct": 5, "zero_rated": ["export","international_transport","first_supply_residential","education","healthcare"], "exempt": ["financial_services","bare_land","local_transport"]}'::JSONB,
   'Federal Decree-Law No. 8 of 2017', 'Standard VAT 5%. Zero-rated for exports. Exempt for financial services'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'vat_reporting',
   '{"frequency": "QUARTERLY", "monthly_threshold_aed": 150000000, "filing_deadline_day": 28, "digital_filing": true, "system": "FTA_e-Services"}'::JSONB,
   'VAT Decree-Law, Cabinet Decision No. 40 of 2017', 'Quarterly VAT return. Monthly if turnover > 150M AED'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'fiscal_year',
   '{"standard": "CALENDAR", "alternatives_allowed": true, "mof_approval": true}'::JSONB,
   'Commercial Companies Law', 'Calendar year default. Alternative fiscal years with Ministry of Finance approval'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'export_format',
   '{"primary": "FTA_Format", "alternatives": ["CSV","XBRL"], "faf_file": true}'::JSONB,
   'FTA regulations', 'Federal Tax Authority prescribed format (FAF). CSV/XBRL alternatives'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'audit_required',
   '{"required": true, "all_companies": false, "llc_required": true, "free_zone_required": true, "threshold_varies_by_emirate": true}'::JSONB,
   'Commercial Companies Law, Free Zone regulations', 'Audit required for LLCs and free zone companies. Requirements vary by emirate'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'corporate_tax',
   '{"rate_pct": 9, "threshold_aed": 375000, "below_threshold_pct": 0, "free_zone_qualified_pct": 0, "effective_date": "2023-06-01"}'::JSONB,
   'Federal Decree-Law No. 47 of 2022', 'Corporate tax 9% on profit > 375k AED. 0% below threshold. Qualifying free zone entities 0%'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE'), 'FINANCIAL', 'sales_tax',
   '{"type": "VAT", "included_in_price": true, "reverse_charge": true, "designated_zones_zero_rated": true}'::JSONB,
   'VAT Decree-Law', 'VAT system. Consumer prices include VAT. Designated zones treated as outside UAE for VAT')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- AE-DIFC — Financial
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'chart_of_accounts',
   '{"standard": "IFRS", "mandatory": true, "dfsa_regulated": true}'::JSONB,
   'DIFC Companies Law, DFSA Rulebook', 'IFRS mandatory. DFSA-regulated entities have additional reporting requirements'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'vat_rate_standard',
   '{"standard_pct": 5, "note": "DIFC follows UAE federal VAT regime"}'::JSONB,
   'Federal Decree-Law No. 8 of 2017', 'DIFC follows UAE federal VAT at 5%'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'vat_reporting',
   '{"frequency": "QUARTERLY", "filing_deadline_day": 28, "digital_filing": true, "system": "FTA_e-Services"}'::JSONB,
   'VAT Decree-Law', 'Quarterly VAT filing through FTA e-Services'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'fiscal_year',
   '{"standard": "FLEXIBLE", "registrar_approval": true}'::JSONB,
   'DIFC Companies Law', 'Flexible fiscal year with DIFC Registrar approval'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'export_format',
   '{"primary": "XBRL", "alternatives": ["FTA_Format","CSV"], "dfsa_reporting": true}'::JSONB,
   'DFSA Rulebook', 'XBRL for DFSA-regulated entities. FTA format for tax reporting'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'audit_required',
   '{"required": true, "all_entities": true, "dfsa_regulated_additional": true, "auditor_must_be_registered": true}'::JSONB,
   'DIFC Companies Law Art. 84-87', 'Annual audit required for all DIFC entities. Auditor must be DIFC-registered'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'corporate_tax',
   '{"rate_pct": 9, "note": "DIFC follows UAE federal corporate tax. Qualifying income at 0%", "qualifying_income_pct": 0}'::JSONB,
   'Federal Decree-Law No. 47 of 2022, MoF Decision No. 265 of 2023', 'DIFC follows UAE corporate tax. Qualifying income from qualifying activities at 0%'),
  ((SELECT id FROM jurisdictions WHERE code = 'AE-DIFC'), 'FINANCIAL', 'sales_tax',
   '{"type": "VAT", "included_in_price": true, "follows_uae_federal": true}'::JSONB,
   'VAT Decree-Law', 'DIFC follows UAE federal VAT regime')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;


-- --------------------------------------------------------------------------
-- 6.4 COMPLAINTS rules
-- --------------------------------------------------------------------------

-- EU (supranational) — Complaints
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'COMPLAINTS', 'consumer_right_to_complaint_days',
   '{"defect_notification_days": null, "legal_guarantee_years": 2, "extended_by_member_state": true}'::JSONB,
   'Consumer Sales Directive 1999/44/EC, Directive 2019/771', 'EU minimum 2-year legal guarantee. Member states may extend. No strict notification deadline at EU level'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'COMPLAINTS', 'response_required_days',
   '{"acknowledgement_days": 5, "resolution_days": 30, "adr_available": true, "odr_platform": true}'::JSONB,
   'ADR Directive 2013/11/EU, ODR Regulation 524/2013', 'ADR entities must resolve within 90 days. ODR platform available for online purchases'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'COMPLAINTS', 'consumer_law',
   '{"primary": "Consumer Rights Directive 2011/83/EU", "supplementary": ["Unfair Commercial Practices Directive 2005/29/EC","Consumer Sales Directive 2019/771","Digital Content Directive 2019/770"], "enforcement": "National consumer protection authorities"}'::JSONB,
   'EU Consumer acquis', 'Harmonized consumer protection framework across EU member states'),
  ((SELECT id FROM jurisdictions WHERE code = 'EU'), 'COMPLAINTS', 'warranty_legal_guarantee_years',
   '{"years": 2, "burden_of_proof_reversal_months": 12, "extended_to_24_months_2022": true}'::JSONB,
   'Directive 2019/771 Art. 10-11', 'Minimum 2-year legal guarantee. Burden of proof reversed for first 12 months (24 months from 2022)')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- Sweden (SE) — Complaints
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'COMPLAINTS', 'consumer_right_to_complaint_days',
   '{"defect_notification_days": 60, "from": "defect_discovery", "legal_guarantee_years": 3, "extended_eu_minimum": true}'::JSONB,
   'Konsumentköplagen (2022:260) §23-24', 'Consumer must complain within 2 months (reasonable time) of discovering defect. 3-year guarantee (exceeds EU minimum)'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'COMPLAINTS', 'response_required_days',
   '{"acknowledgement_days": 3, "resolution_days": 30, "arn_referral_available": true}'::JSONB,
   'Konsumentköplagen, ARN guidelines', 'Best practice: acknowledge within 3 days, resolve within 30. Consumer can refer to ARN (Allmänna reklamationsnämnden)'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'COMPLAINTS', 'consumer_law',
   '{"primary": "Konsumentköplagen (2022:260)", "supplementary": ["Konsumenttjänstlagen (1985:716)","Distansavtalslagen (2005:59)"], "enforcement": "Konsumentverket", "ombudsman": "Konsumentombudsmannen (KO)"}'::JSONB,
   'Swedish consumer protection framework', 'Strong consumer protection. Konsumentverket (Consumer Agency) enforces. KO can bring cases to court'),
  ((SELECT id FROM jurisdictions WHERE code = 'SE'), 'COMPLAINTS', 'warranty_legal_guarantee_years',
   '{"years": 3, "burden_of_proof_reversal_months": 24, "exceeds_eu_minimum": true}'::JSONB,
   'Konsumentköplagen (2022:260) §20', '3-year legal guarantee (exceeds EU 2-year minimum). Burden of proof reversed for first 24 months')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;

-- United States (US) — Complaints
INSERT INTO jurisdiction_rules (jurisdiction_id, module, rule_key, rule_value, legal_reference, description) VALUES
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'COMPLAINTS', 'consumer_right_to_complaint_days',
   '{"defect_notification_days": null, "ucc_statute_of_limitations_years": 4, "implied_warranty_varies": true, "magnuson_moss_applies": true}'::JSONB,
   'UCC §2-725, Magnuson-Moss Warranty Act', 'UCC 4-year statute of limitations for breach of warranty. State implied warranty laws vary'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'COMPLAINTS', 'response_required_days',
   '{"acknowledgement_days": null, "no_federal_mandate": true, "ftc_guidelines": true, "state_lemon_laws": true}'::JSONB,
   'FTC Act §5, state consumer protection statutes', 'No federal response time mandate. FTC enforces unfair/deceptive practices. State lemon laws for vehicles'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'COMPLAINTS', 'consumer_law',
   '{"primary": "FTC Act Section 5", "supplementary": ["Magnuson-Moss Warranty Act","Consumer Product Safety Act","Fair Credit Reporting Act"], "enforcement": "FTC, CFPB, State AGs", "class_action_risk": true}'::JSONB,
   'Federal consumer protection framework', 'Patchwork of federal and state consumer laws. Class action litigation risk significant'),
  ((SELECT id FROM jurisdictions WHERE code = 'US'), 'COMPLAINTS', 'warranty_legal_guarantee_years',
   '{"implied_warranty_years": null, "state_varies": true, "ucc_reasonable_time": true, "express_warranty_per_manufacturer": true, "magnuson_moss_full_or_limited": true}'::JSONB,
   'UCC §2-314, §2-315, Magnuson-Moss', 'Implied warranties of merchantability and fitness. Duration varies by state. Express warranties per manufacturer terms')
ON CONFLICT (jurisdiction_id, module, rule_key) DO UPDATE SET
  rule_value      = EXCLUDED.rule_value,
  legal_reference = EXCLUDED.legal_reference,
  description     = EXCLUDED.description;


-- ============================================================================
-- 7. SEED — Feature Gates
-- ============================================================================

INSERT INTO feature_gates (feature_code, module, description, default_enabled, requires_legal_review) VALUES
  ('PERSONNEL_AUTO_SIGNALS',
   'PERSONNEL',
   'Automatic generation of personnel warning signals based on behavioral patterns and attendance data',
   false, true),
  ('PERSONNEL_AUTO_ESCALATION',
   'PERSONNEL',
   'Automatic escalation of personnel cases through management hierarchy based on severity and jurisdiction rules',
   false, true),
  ('PERSONNEL_FREEZE',
   'PERSONNEL',
   'Ability to freeze personnel case processing during legal proceedings or regulatory investigations',
   false, true),
  ('RECALL_SYSTEM',
   'CUSTOMER_QUALITY',
   'Product/service recall management system including customer notification and regulatory reporting',
   false, true),
  ('AI_STRATEGIC_REVIEW',
   'STRATEGIC',
   'AI-assisted strategic review analysis including trend detection, risk assessment, and recommendation generation',
   false, true),
  ('SIE4_EXPORT',
   'FINANCIAL',
   'SIE4 accounting data export for Swedish standard accounting file interchange',
   false, false),
  ('MULTI_CURRENCY',
   'FINANCIAL',
   'Multi-currency support for transactions, reporting, and exchange rate management',
   false, false),
  ('GDPR_AUTO_RETENTION',
   'RETENTION',
   'Automated GDPR-compliant data retention and deletion based on jurisdiction-specific retention periods',
   false, true),
  ('CAPABILITY_AUTO_ASSESSMENT',
   'PERSONNEL',
   'Automated capability and competence assessment scoring based on training records and performance data',
   false, true),
  ('EXTERNAL_AUDITOR_ACCESS',
   'FINANCIAL',
   'Controlled read-only access for external auditors with audit trail and time-limited permissions',
   false, true)
ON CONFLICT (feature_code) DO UPDATE SET
  module                = EXCLUDED.module,
  description           = EXCLUDED.description,
  default_enabled       = EXCLUDED.default_enabled,
  requires_legal_review = EXCLUDED.requires_legal_review;


-- ============================================================================
-- Done. Multi-Jurisdiction Compliance Framework is ready.
-- ============================================================================

COMMIT;
