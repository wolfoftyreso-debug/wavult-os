-- ---------------------------------------------------------------------------
-- Module 29: Quality-by-Design Engine
-- ISO 8.5.1 — Controlled conditions, 10.2 — Corrective action, 10.3 — Continual improvement
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE gate_type AS ENUM ('VALIDATION','VERIFICATION','APPROVAL','CHECKLIST','MEASUREMENT','DOCUMENT','CAPABILITY','DEPENDENCY','AUTOMATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gate_severity AS ENUM ('BLOCKING','WARNING','INFO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gate_failure_action AS ENUM ('BLOCK','NOTIFY','CREATE_NC','ESCALATE','ALL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gate_result_status AS ENUM ('PASSED','FAILED','BYPASSED','PENDING','WAIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gate_checker AS ENUM ('SYSTEM','USER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE prevention_rule_type AS ENUM ('INPUT_VALIDATION','CONSTRAINT','POKA_YOKE','STANDARD_WORK','ESCALATION_TRIGGER','CAPACITY_CHECK','COMPETENCY_CHECK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- process_quality_gates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  process_id UUID NOT NULL,
  step_order INTEGER NOT NULL,
  gate_type gate_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  gate_config JSONB NOT NULL,
  severity gate_severity DEFAULT 'BLOCKING',
  bypass_allowed BOOLEAN DEFAULT false,
  bypass_requires_role TEXT,
  bypass_requires_reason BOOLEAN DEFAULT true,
  auto_check BOOLEAN DEFAULT true,
  failure_action gate_failure_action DEFAULT 'BLOCK',
  failure_notification_role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- gate_results (IMMUTABLE — audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gate_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  gate_id UUID NOT NULL REFERENCES process_quality_gates(id),
  execution_id UUID NOT NULL,
  result gate_result_status NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now(),
  checked_by gate_checker DEFAULT 'SYSTEM',
  checker_user_id UUID REFERENCES profiles(id),
  check_data JSONB DEFAULT '{}',
  failure_reasons JSONB DEFAULT '[]',
  bypass_reason TEXT,
  bypass_approved_by UUID REFERENCES profiles(id),
  linked_nc_id UUID,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Immutability
CREATE OR REPLACE FUNCTION prevent_gate_result_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Gate results are immutable for quality traceability (ISO 8.5.1)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gate_result_immutable_upd ON gate_results;
DROP TRIGGER IF EXISTS trg_gate_result_immutable_del ON gate_results;
CREATE TRIGGER trg_gate_result_immutable_upd BEFORE UPDATE ON gate_results FOR EACH ROW EXECUTE FUNCTION prevent_gate_result_modification();
CREATE TRIGGER trg_gate_result_immutable_del BEFORE DELETE ON gate_results FOR EACH ROW EXECUTE FUNCTION prevent_gate_result_modification();

-- ---------------------------------------------------------------------------
-- prevention_rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prevention_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  rule_type prevention_rule_type NOT NULL,
  trigger_entity TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  action JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- execution_quality_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS execution_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  execution_id UUID NOT NULL,
  gates_total INTEGER DEFAULT 0,
  gates_passed INTEGER DEFAULT 0,
  gates_failed INTEGER DEFAULT 0,
  gates_bypassed INTEGER DEFAULT 0,
  quality_score NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN gates_total > 0 THEN (gates_passed::NUMERIC / gates_total) * 100 ELSE 0 END
  ) STORED,
  prevention_rules_triggered INTEGER DEFAULT 0,
  prevention_rules_blocked INTEGER DEFAULT 0,
  first_pass_yield BOOLEAN,
  rework_count INTEGER DEFAULT 0,
  total_duration_min INTEGER,
  value_added_duration_min INTEGER,
  waste_duration_min INTEGER GENERATED ALWAYS AS (
    COALESCE(total_duration_min, 0) - COALESCE(value_added_duration_min, 0)
  ) STORED,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_process_quality_summary AS
SELECT
  eqs.org_id,
  p.name AS process_name,
  p.code AS process_code,
  COUNT(eqs.id) AS executions,
  ROUND(AVG(eqs.quality_score), 1) AS avg_quality_score,
  COUNT(*) FILTER (WHERE eqs.first_pass_yield = true) AS first_pass_count,
  ROUND(COUNT(*) FILTER (WHERE eqs.first_pass_yield = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS first_pass_yield_pct,
  SUM(eqs.rework_count) AS total_reworks,
  SUM(eqs.gates_bypassed) AS total_bypasses,
  ROUND(AVG(eqs.waste_duration_min), 0) AS avg_waste_min
FROM execution_quality_scores eqs
JOIN process_executions pe ON pe.id = eqs.execution_id
JOIN processes p ON p.id = pe.process_id
GROUP BY eqs.org_id, p.name, p.code;

CREATE OR REPLACE VIEW v_gate_failure_analysis AS
SELECT
  gr.org_id,
  pqg.gate_type,
  pqg.title AS gate_title,
  p.name AS process_name,
  pqg.step_order,
  COUNT(*) FILTER (WHERE gr.result = 'FAILED') AS fail_count,
  COUNT(*) FILTER (WHERE gr.result = 'BYPASSED') AS bypass_count,
  COUNT(*) FILTER (WHERE gr.result = 'PASSED') AS pass_count,
  ROUND(COUNT(*) FILTER (WHERE gr.result = 'FAILED')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS fail_rate_pct
FROM gate_results gr
JOIN process_quality_gates pqg ON pqg.id = gr.gate_id
JOIN process_executions pe ON pe.id = gr.execution_id
JOIN processes p ON p.id = pe.process_id
GROUP BY gr.org_id, pqg.gate_type, pqg.title, p.name, pqg.step_order
ORDER BY fail_count DESC;

CREATE OR REPLACE VIEW v_prevention_rule_effectiveness AS
SELECT
  pr.org_id,
  pr.name,
  pr.rule_type,
  pr.trigger_entity,
  pr.failure_count AS times_blocked,
  pr.last_triggered_at,
  pr.is_active
FROM prevention_rules pr
ORDER BY pr.failure_count DESC;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pqg_process ON process_quality_gates(process_id);
CREATE INDEX IF NOT EXISTS idx_pqg_step ON process_quality_gates(process_id, step_order);
CREATE INDEX IF NOT EXISTS idx_gr_gate ON gate_results(gate_id);
CREATE INDEX IF NOT EXISTS idx_gr_execution ON gate_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_gr_result ON gate_results(result);
CREATE INDEX IF NOT EXISTS idx_pr_entity ON prevention_rules(trigger_entity, trigger_event);
CREATE INDEX IF NOT EXISTS idx_eqs_execution ON execution_quality_scores(execution_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE process_quality_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pqg_org" ON process_quality_gates USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "gr_org" ON gate_results USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "pr_org" ON prevention_rules USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "eqs_org" ON execution_quality_scores USING (org_id = current_setting('app.org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Seed — Quality Gates
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id UUID;
  v_proc_001 UUID;
  v_proc_003 UUID;
  v_proc_006 UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_proc_001 FROM processes WHERE code = 'PROC-001' LIMIT 1;
  SELECT id INTO v_proc_003 FROM processes WHERE code = 'PROC-003' LIMIT 1;
  SELECT id INTO v_proc_006 FROM processes WHERE code = 'PROC-006' LIMIT 1;

  -- PROC-001: Lead → Deal
  IF v_proc_001 IS NOT NULL THEN
    INSERT INTO process_quality_gates (org_id, process_id, step_order, gate_type, title, gate_config, severity) VALUES
      (v_org_id, v_proc_001, 1, 'VALIDATION', 'Lead har kontaktdata',
       '{"rules":[{"field":"contact_id","operator":"not_null"},{"field":"email","operator":"not_null"}]}', 'BLOCKING'),
      (v_org_id, v_proc_001, 3, 'CAPABILITY', 'Presentatör har demo-kompetens',
       '{"required_capability":"c_stakeholder","min_level":"L3"}', 'WARNING'),
      (v_org_id, v_proc_001, 4, 'CHECKLIST', 'Demo quality check',
       '{"items":["Kundkrav dokumenterade","Lösningsförslag presenterat","Prissättning diskuterad","Nästa steg överenskommet"]}', 'BLOCKING'),
      (v_org_id, v_proc_001, 5, 'DOCUMENT', 'Offert finns',
       '{"required_documents":["offer"],"must_be_approved":false}', 'BLOCKING'),
      (v_org_id, v_proc_001, 7, 'VALIDATION', 'Deal har värde + Stripe',
       '{"rules":[{"field":"value_eur","operator":"gt","value":0},{"field":"stripe_customer_id","operator":"not_null"}]}', 'BLOCKING'),
      (v_org_id, v_proc_001, 7, 'APPROVAL', 'Deal-signering godkänd',
       '{"approver_roles":["EXECUTIVE","CEO"],"dual_approval_threshold":10000}', 'BLOCKING')
    ON CONFLICT DO NOTHING;
  END IF;

  -- PROC-003: Månadsavstämning
  IF v_proc_003 IS NOT NULL THEN
    INSERT INTO process_quality_gates (org_id, process_id, step_order, gate_type, title, gate_config, severity) VALUES
      (v_org_id, v_proc_003, 4, 'AUTOMATION', 'Trial Balance = 0',
       '{"check":"trial_balance_zero","auto_block":true}', 'BLOCKING'),
      (v_org_id, v_proc_003, 5, 'MEASUREMENT', 'FX-differens inom tolerans',
       '{"parameter":"fx_diff","min":-100,"max":100,"unit":"EUR"}', 'WARNING'),
      (v_org_id, v_proc_003, 6, 'VERIFICATION', 'Resultaträkning granskad',
       '{"verifier_role":"EXECUTIVE","different_person":true}', 'BLOCKING')
    ON CONFLICT DO NOTHING;
  END IF;

  -- PROC-006: Avvikelsehantering
  IF v_proc_006 IS NOT NULL THEN
    INSERT INTO process_quality_gates (org_id, process_id, step_order, gate_type, title, gate_config, severity) VALUES
      (v_org_id, v_proc_006, 3, 'CHECKLIST', '5 Varför komplett',
       '{"items":["Varför 1 besvarat","Varför 2 besvarat","Varför 3 besvarat","Rotorsak identifierad","Rotorsak är inte symptom"]}', 'BLOCKING'),
      (v_org_id, v_proc_006, 4, 'VALIDATION', 'Åtgärd har deadline + ansvarig',
       '{"rules":[{"field":"corrective_action","operator":"not_null"},{"field":"corrective_action_deadline","operator":"not_null"},{"field":"corrective_action_by","operator":"not_null"}]}', 'BLOCKING'),
      (v_org_id, v_proc_006, 6, 'VERIFICATION', 'Verifiering av annan person',
       '{"verifier_role":"QUALITY_MANAGER","different_person":true}', 'BLOCKING'),
      (v_org_id, v_proc_006, 6, 'VALIDATION', 'Effektivitet bedömd',
       '{"rules":[{"field":"verification_effective","operator":"not_null"}]}', 'BLOCKING')
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Quality gates seed failed: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Seed — Prevention Rules
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO prevention_rules (org_id, name, rule_type, trigger_entity, trigger_event, conditions, action) VALUES
    (v_org_id, 'Separation: skapare ≠ godkännare', 'CONSTRAINT', 'payouts', 'before_status_change',
     '{"new_status":"PROCESSING"}',
     '{"block_if":{"field":"approved_by","equals":"created_by"},"message":"Skapare och godkännare måste vara olika personer"}'),
    (v_org_id, 'Separation: NC-registrerare ≠ verifierare', 'CONSTRAINT', 'non_conformances', 'before_status_change',
     '{"new_status":"CLOSED"}',
     '{"block_if":{"field":"verified_by","equals":"detected_by"},"message":"Den som registrerade NC kan inte verifiera den"}'),
    (v_org_id, 'Auto-SLA på reklamation', 'POKA_YOKE', 'complaints', 'before_create',
     '{}',
     '{"auto_fill":{"sla_response_hours":{"from":"config","key":"complaint_sla_response_hours","based_on":"priority"}}}'),
    (v_org_id, 'Max tasks per person', 'CAPACITY_CHECK', 'tasks', 'before_assign',
     '{}',
     '{"check":"user_open_tasks","max":15,"action":"warn_manager","message":"Personen har redan {{count}} öppna tasks"}'),
    (v_org_id, 'Kalibrerare måste ha L3+', 'COMPETENCY_CHECK', 'calibration_records', 'before_create',
     '{}',
     '{"check":"user_capability","capability":"c_domain_expertise","min_level":"L3","message":"Kalibrerare saknar tillräcklig kompetens"}'),
    (v_org_id, 'Revisor måste ha utbildning', 'COMPETENCY_CHECK', 'audits', 'before_create',
     '{"type":"INTERNAL"}',
     '{"check":"user_training","required":"ISO 9001 Internal Auditor","message":"Intern revisor saknar ISO 9001-utbildning"}'),
    (v_org_id, 'Anställningsavtal kräver mall', 'STANDARD_WORK', 'agreements', 'before_create',
     '{"agreement_type":"EMPLOYMENT"}',
     '{"require_template":"MALL-001","message":"Anställningsavtal måste skapas från godkänd mall"}'),
    (v_org_id, 'Eskalera vid 3+ complaints/vecka', 'ESCALATION_TRIGGER', 'complaints', 'after_create',
     '{}',
     '{"if":{"metric":"COMPLAINT_COUNT","period":"7d","threshold":3},"then":"notify","role":"EXECUTIVE","message":"3+ reklamationer senaste 7 dagarna"}'),
    (v_org_id, 'Eskalera vid NC repeat', 'ESCALATION_TRIGGER', 'non_conformances', 'after_create',
     '{}',
     '{"if":{"same_process_nc_count":"90d","threshold":2},"then":"create_improvement","message":"Upprepade NC i samma process"}'),
    (v_org_id, 'Deadline minst 1 dag fram', 'INPUT_VALIDATION', 'tasks', 'before_create',
     '{}',
     '{"validate":[{"field":"deadline","rule":"min_days_from_now","value":1,"message":"Deadline måste vara minst 1 dag fram"}]}'),
    (v_org_id, 'Leverantörsbedömning kräver data', 'INPUT_VALIDATION', 'supplier_evaluations', 'before_create',
     '{}',
     '{"validate":[{"field":"quality_score","rule":"between","min":1,"max":5},{"field":"delivery_score","rule":"between","min":1,"max":5}]}'),
    (v_org_id, 'Auto-pris på deal', 'POKA_YOKE', 'deals', 'before_create',
     '{}',
     '{"suggest_fill":{"value_eur":{"from":"config","key":"pricing_standard_eur"}}}')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Prevention rules seed failed: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Additional metrics for Quality-by-Design
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO metric_definitions (code, name, module, category, aggregation_type, default_period, default_target, threshold_direction, unit, format, display_as, iso_reference, decision_context, action_if_red) VALUES
    ('FIRST_PASS_YIELD', 'First Pass Yield', 'PROCESS', 'QUALITY', 'PERCENTAGE', 'MONTHLY', 95, 'HIGHER_IS_BETTER', '%', 'percentage', 'GAUGE', '8.5.1', 'Hur ofta går saker rätt första gången?', 'Granska quality gates. Förstärk prevention.'),
    ('GATE_PASS_RATE', 'Quality Gate pass rate', 'PROCESS', 'QUALITY', 'PERCENTAGE', 'MONTHLY', 90, 'HIGHER_IS_BETTER', '%', 'percentage', 'GAUGE', '8.5.1', 'Passerar vi quality gates?', 'Identifiera vilka gates som ofta failar.'),
    ('PREVENTION_EFFECTIVENESS', 'Prevention rules effectiveness', 'PROCESS', 'QUALITY', 'PERCENTAGE', 'MONTHLY', 80, 'HIGHER_IS_BETTER', '%', 'percentage', 'GAUGE', '10.3', 'Förhindrar vi fel innan de uppstår?', 'Fler regler? Bättre regler? Utbildning?'),
    ('REWORK_RATE', 'Omarbetningsgrad', 'PROCESS', 'EFFICIENCY', 'PERCENTAGE', 'MONTHLY', 5, 'LOWER_IS_BETTER', '%', 'percentage', 'GAUGE', '10.3', 'Hur mycket gör vi om?', 'Rotorsak till omarbete. Stärk gates.'),
    ('WASTE_PERCENTAGE', 'Spill (icke värdeskapande tid)', 'PROCESS', 'EFFICIENCY', 'PERCENTAGE', 'MONTHLY', 10, 'LOWER_IS_BETTER', '%', 'percentage', 'GAUGE', '10.3', 'Hur effektiva är våra processer?', 'Lean-analys. Eliminera waste.'),
    ('COST_OF_QUALITY', 'Kvalitetskostnad', 'FINANCIAL', 'QUALITY', 'SUM', 'MONTHLY', 0, 'LOWER_IS_BETTER', 'EUR', 'currency', 'SPARKLINE', '10.3', 'Vad kostar bristande kvalitet?', 'Investera i prevention > detection.')
  ON CONFLICT (code) DO NOTHING;
EXCEPTION WHEN undefined_table THEN NULL;
WHEN OTHERS THEN
  RAISE NOTICE 'QbD metrics seed failed: %', SQLERRM;
END $$;
