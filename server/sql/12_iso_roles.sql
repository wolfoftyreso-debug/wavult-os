-- ============================================================================
-- Hypbit OMS Certified — ISO System Roles Seed
-- File: 12_iso_roles.sql
-- Seeds ALL ISO-required system roles into role_definitions.
--
-- Roles are system-level defaults (org_id = SYSTEM_UUID, is_system_role = true).
-- Each organization inherits these and can override display_name / permissions.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Ensure role_definitions table exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_definitions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  role_code         TEXT        NOT NULL,
  display_name      TEXT        NOT NULL,
  description       TEXT,
  iso_reference     TEXT,
  is_system_role    BOOLEAN     NOT NULL DEFAULT false,
  base_permissions  JSONB       NOT NULL DEFAULT '{}',
  dashboard_config  JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_role_definitions_org_id
  ON role_definitions (org_id);
CREATE INDEX IF NOT EXISTS idx_role_definitions_role_code
  ON role_definitions (role_code);

-- ============================================================================
-- 2. Seed ISO system roles
-- ============================================================================

INSERT INTO role_definitions (
  org_id, role_code, display_name, description, iso_reference,
  is_system_role, base_permissions, dashboard_config
)
VALUES

-- --------------------------------------------------------------------------
-- 1. EXECUTIVE — Högsta ledningen (§5.1)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'EXECUTIVE',
  'Högsta ledningen',
  'Ledningens ansvar för kvalitetsledningssystemet. Fastställer policy, mål och strategisk inriktning. Säkerställer att resurser finns tillgängliga och att systemet uppnår avsedda resultat.',
  'ISO 9001:2015 §5.1',
  true,
  '{
    "modules": ["goals", "kpi", "finance", "risk", "compliance", "strategic_review", "management_review", "reports", "processes"],
    "actions": ["view_all", "approve_policy", "approve_goals", "approve_budget", "initiate_review", "view_reports", "delegate", "set_strategic_direction"]
  }'::JSONB,
  '{
    "widgets": ["goals_progress", "kpi_summary", "financial_overview", "risk_top5", "compliance_status", "strategic_review_summary"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 2. QUALITY_MANAGER — Kvalitetsansvarig (§5.3)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'QUALITY_MANAGER',
  'Kvalitetsansvarig',
  'Ansvarar för kvalitetsledningssystemets effektivitet. Hanterar avvikelser, förbättringar, internrevisioner, dokumentstyrning och kompetensuppföljning. Rapporterar till högsta ledningen.',
  'ISO 9001:2015 §5.3',
  true,
  '{
    "modules": ["nc", "improvements", "processes", "compliance", "documents", "audits", "capabilities", "kpi", "reports", "management_review", "risk"],
    "actions": ["view_all", "create_nc", "manage_nc", "create_improvement", "manage_improvements", "manage_processes", "manage_compliance", "manage_documents", "plan_audits", "manage_capabilities", "generate_reports", "prepare_management_review"]
  }'::JSONB,
  '{
    "widgets": ["nc_pipeline", "improvement_pdca", "process_health", "compliance_matrix", "document_review_due", "audit_plan", "capability_gaps"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 3. PROCESS_OWNER — Processägare (§4.4)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'PROCESS_OWNER',
  'Processägare',
  'Ansvarar för en eller flera processer. Definierar processflöden, övervakar processprestanda, identifierar förbättringsmöjligheter och hanterar avvikelser inom sina processer.',
  'ISO 9001:2015 §4.4',
  true,
  '{
    "modules": ["processes", "nc", "tasks", "improvements", "kpi"],
    "actions": ["view_own_processes", "edit_own_processes", "create_nc", "manage_own_nc", "create_tasks", "manage_own_tasks", "view_process_kpi", "log_process_execution"]
  }'::JSONB,
  '{
    "widgets": ["my_processes", "my_nc", "my_tasks", "process_execution_log"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 4. INTERNAL_AUDITOR — Intern revisor (§9.2)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'INTERNAL_AUDITOR',
  'Intern revisor',
  'Genomför internrevisioner enligt revisionsplan. Granskar processefterlevnad, identifierar avvikelser och förbättringsmöjligheter. Oberoende från de processer som granskas.',
  'ISO 9001:2015 §9.2',
  true,
  '{
    "modules": ["audits", "compliance", "nc", "documents", "processes"],
    "actions": ["view_all_processes", "create_audit", "manage_audits", "create_findings", "create_nc", "view_documents", "view_compliance", "generate_audit_reports"]
  }'::JSONB,
  '{
    "widgets": ["audit_plan", "findings", "compliance_matrix", "nc_trends", "document_status"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 5. HR_MANAGER — Personalansvarig (§7.1.2, §7.2, §7.3)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'HR_MANAGER',
  'Personalansvarig',
  'Ansvarar för personalresurser, kompetenshantering och kompetensutveckling. Säkerställer att medarbetare har rätt kompetens för sina roller och att utbildningsbehov identifieras och tillgodoses.',
  'ISO 9001:2015 §7.1.2, §7.2, §7.3',
  true,
  '{
    "modules": ["capabilities", "development", "training", "teams", "reports"],
    "actions": ["view_all_capabilities", "manage_capabilities", "create_development_plans", "manage_training", "view_teams", "generate_capability_reports", "manage_competency_matrix"]
  }'::JSONB,
  '{
    "widgets": ["capability_heatmap", "development_progress", "training_due", "team_gaps"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 6. DOCUMENT_CONTROLLER — Dokumentansvarig (§7.5)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'DOCUMENT_CONTROLLER',
  'Dokumentansvarig',
  'Ansvarar för dokumentstyrning inom kvalitetsledningssystemet. Hanterar dokumentregister, versionshantering, granskning och godkännande av styrd dokumentation.',
  'ISO 9001:2015 §7.5',
  true,
  '{
    "modules": ["documents", "compliance"],
    "actions": ["view_all_documents", "create_documents", "manage_documents", "approve_documents", "manage_versions", "manage_document_categories", "view_compliance_mappings"]
  }'::JSONB,
  '{
    "widgets": ["document_register", "review_due", "version_history", "compliance_mappings"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 7. FINANCE_CONTROLLER — Ekonomiansvarig
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'FINANCE_CONTROLLER',
  'Ekonomiansvarig',
  'Ansvarar för ekonomisk styrning och rapportering. Hanterar redovisning, kassaflöde, valutaexponering, utbetalningar och momsrapportering.',
  NULL,
  true,
  '{
    "modules": ["finance", "payouts", "reports"],
    "actions": ["view_all_financial", "manage_transactions", "approve_payouts", "manage_vat", "manage_fx", "generate_financial_reports", "view_trial_balance", "manage_cashflow"]
  }'::JSONB,
  '{
    "widgets": ["trial_balance", "cashflow", "fx_exposure", "payout_queue", "vat_summary"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 8. OPERATIONS_MANAGER — Driftsansvarig
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'OPERATIONS_MANAGER',
  'Driftsansvarig',
  'Ansvarar för daglig verksamhetsstyrning. Hanterar teamuppgifter, resursallokering och möten. Säkerställer att operativa processer fungerar effektivt.',
  NULL,
  true,
  '{
    "modules": ["tasks", "teams", "meetings", "resources", "processes"],
    "actions": ["view_all_tasks", "create_tasks", "manage_tasks", "assign_tasks", "manage_teams", "manage_meetings", "view_resource_load", "manage_kanban"]
  }'::JSONB,
  '{
    "widgets": ["team_kanban", "task_overview", "resource_load", "meeting_calendar"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 9. MANAGEMENT_REPRESENTATIVE — Ledningens representant (§5.5.2 in 2008)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'MANAGEMENT_REPRESENTATIVE',
  'Ledningens representant',
  'Representerar ledningen i kvalitetsfrågor. Säkerställer att kvalitetsledningssystemet upprätthålls och rapporterar om dess prestanda till högsta ledningen. Roll från ISO 9001:2008 §5.5.2, behålls för bakåtkompatibilitet.',
  'ISO 9001:2008 §5.5.2',
  true,
  '{
    "modules": ["nc", "improvements", "processes", "compliance", "documents", "audits", "capabilities", "kpi", "reports", "management_review", "risk", "goals", "strategic_review"],
    "actions": ["view_all", "create_nc", "manage_nc", "create_improvement", "manage_improvements", "manage_processes", "manage_compliance", "manage_documents", "plan_audits", "manage_capabilities", "generate_reports", "prepare_management_review", "view_strategic_review"]
  }'::JSONB,
  '{
    "widgets": ["nc_pipeline", "improvement_pdca", "process_health", "compliance_matrix", "document_review_due", "audit_plan", "capability_gaps", "strategic_review_summary"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 10. EXTERNAL_AUDITOR — Extern revisor (readonly, time-limited)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'EXTERNAL_AUDITOR',
  'Extern revisor',
  'Extern revisor med begränsad, tidsbunden läsbehörighet. Kan granska efterlevnad, processer, avvikelser, dokument och revisionsfynd men kan inte ändra data.',
  NULL,
  true,
  '{
    "modules": ["compliance", "processes", "nc", "documents", "audits"],
    "actions": ["view_compliance", "view_processes", "view_nc_history", "view_documents", "view_audit_findings"],
    "constraints": {"read_only": true, "time_limited": true}
  }'::JSONB,
  '{
    "widgets": ["compliance_matrix", "process_register", "nc_history", "document_register", "audit_findings"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 11. EMPLOYEE — Medarbetare (default)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'EMPLOYEE',
  'Medarbetare',
  'Standardroll för alla medarbetare. Kan se och hantera egna uppgifter, kompetensprofil och utvecklingsplan. Kan rapportera avvikelser.',
  NULL,
  true,
  '{
    "modules": ["tasks", "capabilities", "development", "nc"],
    "actions": ["view_own_tasks", "update_own_tasks", "view_own_capabilities", "view_own_development", "report_nc"]
  }'::JSONB,
  '{
    "widgets": ["my_tasks", "my_development", "my_capabilities", "report_nc_button"]
  }'::JSONB
),

-- --------------------------------------------------------------------------
-- 12. SUPPLIER — Leverantör (extern, begränsad)
-- --------------------------------------------------------------------------
(
  '00000000-0000-0000-0000-000000000000',
  'SUPPLIER',
  'Leverantör',
  'Extern leverantörsroll med begränsad åtkomst. Kan se leverantörsrelaterade dokument och revisioner.',
  NULL,
  true,
  '{
    "modules": ["supplier_portal"],
    "actions": ["view_supplier_documents", "upload_supplier_documents", "view_supplier_audits"],
    "constraints": {"external": true, "limited_scope": true}
  }'::JSONB,
  '{
    "widgets": ["supplier_documents", "supplier_audits"]
  }'::JSONB
)

ON CONFLICT (org_id, role_code) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  description      = EXCLUDED.description,
  iso_reference    = EXCLUDED.iso_reference,
  is_system_role   = EXCLUDED.is_system_role,
  base_permissions = EXCLUDED.base_permissions,
  dashboard_config = EXCLUDED.dashboard_config,
  updated_at       = now();


-- ============================================================================
-- 3. RLS
-- ============================================================================
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

-- System roles (org_id = 0-UUID) are readable by everyone
DROP POLICY IF EXISTS role_definitions_read ON role_definitions;
CREATE POLICY role_definitions_read ON role_definitions
  FOR SELECT
  USING (
    org_id = '00000000-0000-0000-0000-000000000000'
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );

-- Only service_role can manage system roles; org admins can manage their own
DROP POLICY IF EXISTS role_definitions_manage ON role_definitions;
CREATE POLICY role_definitions_manage ON role_definitions
  FOR ALL
  USING (
    (org_id = '00000000-0000-0000-0000-000000000000' AND current_setting('role', TRUE) = 'service_role')
    OR org_id = (current_setting('app.current_org_id', TRUE))::UUID
  );


-- ============================================================================
-- Done. ISO system roles are seeded.
-- ============================================================================

COMMIT;
