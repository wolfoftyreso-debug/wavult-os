-- ---------------------------------------------------------------------------
-- Module 28b: Universal Metrics Layer
-- ISO 9.1 — Monitoring, measurement, analysis and evaluation
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE metric_category AS ENUM ('PERFORMANCE','QUALITY','FINANCIAL','CUSTOMER','COMPLIANCE','RISK','CAPACITY','EFFICIENCY','GROWTH','OPERATIONAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE aggregation_type AS ENUM ('COUNT','SUM','AVG','MIN','MAX','RATE','PERCENTAGE','RATIO','TREND','LATEST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE metric_period AS ENUM ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL','ROLLING_7D','ROLLING_30D','ROLLING_90D','ALL_TIME'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE threshold_direction AS ENUM ('HIGHER_IS_BETTER','LOWER_IS_BETTER','TARGET_IS_BEST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE metric_display AS ENUM ('NUMBER','GAUGE','SPARKLINE','BAR','TREND_ARROW','TRAFFIC_LIGHT','RATIO','HEATMAP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE calculate_frequency AS ENUM ('REALTIME','HOURLY','DAILY','WEEKLY','MONTHLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE metric_trend AS ENUM ('UP','DOWN','STABLE','NEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE metric_status AS ENUM ('GREEN','YELLOW','RED','GRAY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE widget_type AS ENUM ('METRIC_SINGLE','METRIC_GROUP','METRIC_CHART','METRIC_TABLE','METRIC_COMPARISON','METRIC_HEATMAP','METRIC_GAUGE','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE widget_width AS ENUM ('QUARTER','THIRD','HALF','TWO_THIRDS','FULL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE decision_type AS ENUM ('INVESTIGATE','ESCALATE','CHANGE_TARGET','ALLOCATE_RESOURCE','CREATE_IMPROVEMENT','ACCEPT_RISK','NO_ACTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- metric_definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  category metric_category NOT NULL,
  aggregation_type aggregation_type NOT NULL,
  source_entity_type TEXT,
  source_filter JSONB DEFAULT '{}',
  source_field TEXT,
  source_query TEXT,
  default_period metric_period DEFAULT 'ROLLING_30D',
  default_target NUMERIC(12,4),
  default_threshold_green NUMERIC(12,4),
  default_threshold_yellow NUMERIC(12,4),
  default_threshold_red NUMERIC(12,4),
  threshold_direction threshold_direction DEFAULT 'HIGHER_IS_BETTER',
  unit TEXT,
  format TEXT DEFAULT 'number',
  decimal_places INTEGER DEFAULT 1,
  display_as metric_display DEFAULT 'NUMBER',
  iso_reference TEXT,
  decision_context TEXT,
  action_if_red TEXT,
  action_if_yellow TEXT,
  calculate_frequency calculate_frequency DEFAULT 'DAILY',
  last_calculated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- metric_values
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC(16,4) NOT NULL,
  previous_value NUMERIC(16,4),
  change_pct NUMERIC(8,2),
  trend metric_trend,
  status metric_status DEFAULT 'GRAY',
  data_points INTEGER DEFAULT 0,
  breakdown JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, metric_id, period_type, period_start)
);

-- ---------------------------------------------------------------------------
-- metric_data_points
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  value NUMERIC(16,4) NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  user_id UUID,
  dimensions JSONB DEFAULT '{}',
  event_type TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdp_metric ON metric_data_points(metric_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_mdp_org ON metric_data_points(org_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_mdp_metric_org ON metric_data_points(org_id, metric_id, recorded_at);

-- ---------------------------------------------------------------------------
-- dashboard_widgets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  role_code TEXT NOT NULL,
  widget_code TEXT NOT NULL,
  widget_type widget_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metrics JSONB NOT NULL,
  layout_position INTEGER DEFAULT 0,
  layout_width widget_width DEFAULT 'QUARTER',
  layout_row INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- metric_decisions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  metric_id UUID REFERENCES metric_definitions(id),
  metric_value_id UUID REFERENCES metric_values(id),
  decision_type decision_type NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  decided_by UUID REFERENCES profiles(id),
  resulting_entity_type TEXT,
  resulting_entity_id UUID,
  decided_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mv_org ON metric_values(org_id);
CREATE INDEX IF NOT EXISTS idx_mv_metric ON metric_values(metric_id);
CREATE INDEX IF NOT EXISTS idx_mv_status ON metric_values(status);
CREATE INDEX IF NOT EXISTS idx_dw_role ON dashboard_widgets(role_code);
CREATE INDEX IF NOT EXISTS idx_md_metric ON metric_decisions(metric_id);

-- RLS
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metric_defs_global_or_org" ON metric_definitions USING (org_id IS NULL OR org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "metric_values_org" ON metric_values USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "metric_dp_org" ON metric_data_points USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "dashboard_widgets_global_or_org" ON dashboard_widgets USING (org_id IS NULL OR org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "metric_decisions_org" ON metric_decisions USING (org_id = current_setting('app.org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Seed — ~40 Metric Definitions
-- ---------------------------------------------------------------------------
DO $$
BEGIN
INSERT INTO metric_definitions (code, name, module, category, aggregation_type, source_entity_type, source_filter, default_period, default_target, threshold_direction, unit, format, display_as, iso_reference, decision_context, action_if_red) VALUES
  ('TASK_COMPLETION_RATE','Task completion rate','EXECUTION','PERFORMANCE','PERCENTAGE','tasks','{"status":"DONE"}','ROLLING_30D',90,'HIGHER_IS_BETTER','%','percentage','GAUGE','8.5.1','Levererar teamet det de ska?','Identifiera blockers. Omfördela resurser.'),
  ('TASK_OVERDUE_COUNT','Försenade tasks','EXECUTION','OPERATIONAL','COUNT','tasks','{"overdue":true}','ROLLING_7D',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','8.5.1','Hur många uppgifter är försenade?','Eskalera. Omfördela. Minska scope.'),
  ('TASK_AVG_COMPLETION_DAYS','Snittid per task','EXECUTION','EFFICIENCY','AVG','tasks','{"status":"DONE"}','ROLLING_30D',5,'LOWER_IS_BETTER','dagar','number','SPARKLINE','','Blir vi snabbare eller långsammare?','Analysera vilka tasktyper som tar tid.'),
  ('DEAL_CONVERSION_RATE','Deal konverteringsgrad','EXECUTION','GROWTH','PERCENTAGE','deals','{"status":"WON"}','ROLLING_90D',25,'HIGHER_IS_BETTER','%','percentage','GAUGE','8.2','Stänger vi affärer effektivt?','Granska demo-kvalitet. Förbättra offertprocess.'),
  ('DEAL_PIPELINE_VALUE','Pipeline-värde','EXECUTION','FINANCIAL','SUM','deals','{}','ROLLING_30D',50000,'HIGHER_IS_BETTER','EUR','currency','NUMBER','','Har vi tillräckligt i pipeline?','Öka prospektering. Fler leads.'),
  ('DEAL_AVG_CYCLE_DAYS','Snitt säljcykel','EXECUTION','EFFICIENCY','AVG','deals','{"status":"WON"}','ROLLING_90D',30,'LOWER_IS_BETTER','dagar','number','SPARKLINE','','Hur lång tid tar det att stänga?','Identifiera flaskhalsar i pipeline.'),
  ('LEADS_PER_WEEK','Leads per vecka','EXECUTION','GROWTH','COUNT','leads','{}','ROLLING_7D',10,'HIGHER_IS_BETTER','st','number','TREND_ARROW','','Får vi in tillräckligt med leads?','Öka marknadsföring. Outreach.'),
  ('MRR','Monthly Recurring Revenue','FINANCIAL','FINANCIAL','SUM','transactions','{"account_code":"3300"}','MONTHLY',10000,'HIGHER_IS_BETTER','EUR','currency','SPARKLINE','9.1.3','Växer intäkterna?','Fokusera på churn. Upsell.'),
  ('BURN_RATE','Burn rate','FINANCIAL','FINANCIAL','SUM','transactions','{"type":"expense"}','MONTHLY',5000,'LOWER_IS_BETTER','EUR','currency','SPARKLINE','','Bränner vi för mycket?','Identifiera kostnadsdrivare. Optimera.'),
  ('RUNWAY_MONTHS','Runway','FINANCIAL','RISK','RATIO','transactions','{}','MONTHLY',12,'HIGHER_IS_BETTER','mån','number','GAUGE','','Hur länge räcker pengarna?','Sälj snabbare eller minska burn.'),
  ('TRIAL_BALANCE_DIFF','Trial Balance differens','FINANCIAL','COMPLIANCE','LATEST','transactions','{}','DAILY',0,'LOWER_IS_BETTER','EUR','currency','TRAFFIC_LIGHT','','Stämmer bokföringen?','OMEDELBART: Winston utreder. Aldrig OK.'),
  ('NC_OPEN_COUNT','Öppna avvikelser','PROCESS','QUALITY','COUNT','non_conformances','{}','ROLLING_30D',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','10.2','Hur många olösta avvikelser har vi?','Prioritera stängning. Allokera resurser.'),
  ('NC_AVG_CLOSE_DAYS','Snittid stänga NC','PROCESS','EFFICIENCY','AVG','non_conformances','{"status":"CLOSED"}','ROLLING_90D',14,'LOWER_IS_BETTER','dagar','number','SPARKLINE','10.2','Stänger vi avvikelser snabbt nog?','Snabba upp rotorsaksanalys. Mer resurser.'),
  ('NC_REPEAT_RATE','Upprepade NC','PROCESS','QUALITY','PERCENTAGE','non_conformances','{}','ROLLING_90D',0,'LOWER_IS_BETTER','%','percentage','GAUGE','10.2','Fungerar korrigerande åtgärder?','Rotorsak ej eliminerad. Djupare analys.'),
  ('IMPROVEMENT_COMPLETION_RATE','Förbättringar slutförda','PROCESS','QUALITY','PERCENTAGE','improvements','{"status":"COMPLETED"}','QUARTERLY',80,'HIGHER_IS_BETTER','%','percentage','GAUGE','10.3','Driver vi förbättring effektivt?','Granska blockers. Prioritera.'),
  ('NPS_SCORE','NPS','CUSTOMER','CUSTOMER','AVG','customer_satisfaction_surveys','{}','ROLLING_90D',50,'HIGHER_IS_BETTER','poäng','score','GAUGE','9.1.2','Är kunderna nöjda?','Kontakta detractors. Analysera orsaker.'),
  ('COMPLAINT_COUNT','Reklamationer','CUSTOMER','CUSTOMER','COUNT','complaints','{}','MONTHLY',0,'LOWER_IS_BETTER','st','number','TREND_ARROW','8.2.1','Hur många reklamationer?','Rotorsaksanalys. Processkoppling.'),
  ('COMPLAINT_SLA_BREACH_RATE','SLA-brott reklamation','CUSTOMER','COMPLIANCE','PERCENTAGE','complaints','{"sla_breached":true}','ROLLING_30D',0,'LOWER_IS_BETTER','%','percentage','TRAFFIC_LIGHT','8.2.1','Svarar vi i tid?','Öka kapacitet. Eskalera snabbare.'),
  ('SUPPORT_AVG_RESPONSE_HOURS','Support snitt svarstid','CUSTOMER','EFFICIENCY','AVG','support_tickets','{}','ROLLING_30D',4,'LOWER_IS_BETTER','timmar','number','SPARKLINE','8.2.1','Hur snabbt svarar vi?','Fler resurser. Bättre routing.'),
  ('TEAM_AVG_CAPABILITY','Team capability snitt','CAPABILITY','CAPACITY','AVG','user_capabilities','{}','MONTHLY',3.5,'HIGHER_IS_BETTER','nivå','score','HEATMAP','7.1.2','Har vi rätt kompetens?','Investera i utveckling. Rekrytera.'),
  ('CAPABILITY_GAP_COUNT','Kritiska capability gaps','CAPABILITY','RISK','COUNT','user_capabilities','{}','MONTHLY',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','7.1.2','Hur många kritiska gaps har vi?','Utvecklingsplaner. Rekrytering.'),
  ('DEVELOPMENT_PLAN_PROGRESS','Utvecklingsplan progress','CAPABILITY','PERFORMANCE','PERCENTAGE','development_actions','{"status":"COMPLETED"}','QUARTERLY',80,'HIGHER_IS_BETTER','%','percentage','GAUGE','7.2','Investerar vi i utveckling?','Fler coaching-sessioner. Prioritera.'),
  ('ISO_COMPLIANCE_PCT','ISO 9001 compliance','PROCESS','COMPLIANCE','PERCENTAGE','compliance_requirements','{"status":"COMPLIANT"}','MONTHLY',100,'HIGHER_IS_BETTER','%','percentage','GAUGE','4.4','Uppfyller vi kraven?','Fokusera på non-compliant klausuler.'),
  ('AUDIT_FINDING_COUNT','Audit findings öppna','PROCESS','COMPLIANCE','COUNT','audits','{}','ROLLING_90D',0,'LOWER_IS_BETTER','st','number','TREND_ARROW','9.2','Hur många findings har vi?','Stäng findings innan certifieringsrevision.'),
  ('DOCUMENT_REVIEW_OVERDUE','Dokument försenad granskning','PROCESS','COMPLIANCE','COUNT','documents','{"review_overdue":true}','ROLLING_30D',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','7.5','Håller vi dokumenten aktuella?','Granska omedelbart. Tilldela ägare.'),
  ('CALIBRATION_OVERDUE_COUNT','Kalibrering försenad','ASSETS','COMPLIANCE','COUNT','assets','{}','DAILY',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','7.1.5','Har vi okalibrerade instrument?','Stoppa användning. Boka kalibrering.'),
  ('MAINTENANCE_OVERDUE_COUNT','Underhåll försenat','ASSETS','OPERATIONAL','COUNT','assets','{}','DAILY',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','7.1.3','Sköter vi underhållet?','Prioritera kritiska assets.'),
  ('ASSET_DOWNTIME_HOURS','Total driftstopp','ASSETS','EFFICIENCY','SUM','maintenance_records','{}','MONTHLY',10,'LOWER_IS_BETTER','timmar','number','SPARKLINE','7.1.3','Hur mycket driftstopp?','Förebyggande underhåll. Byt utrustning.'),
  ('SUPPLIER_AVG_RATING','Leverantörssnitt','SUPPLIERS','QUALITY','AVG','suppliers','{"status":"APPROVED"}','QUARTERLY',4.0,'HIGHER_IS_BETTER','betyg','score','GAUGE','8.4','Presterar leverantörerna?','Granska underpresterande. Omförhandla.'),
  ('SUPPLIER_ON_WATCH_COUNT','Leverantörer under observation','SUPPLIERS','RISK','COUNT','suppliers','{"status":"ON_WATCH"}','ROLLING_30D',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','8.4','Har vi riskfyllda leverantörer?','Eskalera. Hitta alternativ.'),
  ('RISK_HIGH_CRITICAL_COUNT','Höga/kritiska risker','PROCESS','RISK','COUNT','risks','{}','MONTHLY',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','6.1','Hur exponerade är vi?','Mitigera. Allokera resurser.'),
  ('PERSONNEL_CASE_COUNT','Aktiva personalärenden','PERSONNEL','OPERATIONAL','COUNT','personnel_cases','{}','ROLLING_30D',null,'LOWER_IS_BETTER','st','number','NUMBER','7.1.2','Har vi personalproblem?','HR agerar.'),
  ('DEPUTY_COVERAGE_PCT','Ställföreträdartäckning','EXECUTION','RISK','PERCENTAGE','critical_functions','{"has_deputy":true}','MONTHLY',100,'HIGHER_IS_BETTER','%','percentage','GAUGE','5.3','Kan vi hantera frånvaro?','Tilldela deputies. Utbilda.'),
  ('AGREEMENTS_EXPIRING_30D','Avtal som löper ut <30d','AGREEMENTS','RISK','COUNT','agreements','{}','DAILY',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','','Har vi avtal som löper ut?','Förnya eller avsluta.'),
  ('AGREEMENTS_UNSIGNED','Osignerade avtal','AGREEMENTS','COMPLIANCE','COUNT','agreements','{"status":"PENDING_SIGNATURE"}','ROLLING_30D',0,'LOWER_IS_BETTER','st','number','TRAFFIC_LIGHT','','Har vi osignerade avtal?','Påminn. Eskalera.'),
  ('GOAL_ON_TRACK_PCT','Mål on track','STRATEGIC','PERFORMANCE','PERCENTAGE','goals','{"status":"ON_TRACK"}','QUARTERLY',80,'HIGHER_IS_BETTER','%','percentage','GAUGE','6.2','Når vi våra mål?','Justera eller eskalera.'),
  ('DECISION_IMPLEMENTATION_RATE','Beslut genomförda','STRATEGIC','PERFORMANCE','PERCENTAGE','review_action_items','{"status":"COMPLETED"}','QUARTERLY',90,'HIGHER_IS_BETTER','%','percentage','GAUGE','9.3','Genomförs besluten?','Fördel ansvar. Följ upp.'),
  ('PROCESS_EXECUTION_COUNT','Processkörningar','PROCESS','OPERATIONAL','COUNT','process_executions','{}','MONTHLY',null,'HIGHER_IS_BETTER','st','number','SPARKLINE','4.4','Körs processerna?','Inaktiva processer = risk.'),
  ('PROCESS_AVG_DURATION','Snitt processduration','PROCESS','EFFICIENCY','AVG','process_executions','{"status":"COMPLETED"}','MONTHLY',null,'LOWER_IS_BETTER','min','number','SPARKLINE','4.4','Är processerna effektiva?','Optimera steg. Ta bort waste.')
ON CONFLICT (code) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Metric definitions seed failed: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Seed — Dashboard Widgets per role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
INSERT INTO dashboard_widgets (role_code, widget_code, widget_type, title, metrics, layout_position, layout_width) VALUES
  ('EXECUTIVE','exec_financial','METRIC_GROUP','Ekonomi','[{"metric_code":"MRR","display_as":"SPARKLINE"},{"metric_code":"BURN_RATE","display_as":"SPARKLINE"},{"metric_code":"RUNWAY_MONTHS","display_as":"GAUGE"}]',1,'FULL'),
  ('EXECUTIVE','exec_goals','METRIC_SINGLE','Mål on track','[{"metric_code":"GOAL_ON_TRACK_PCT","display_as":"GAUGE"}]',2,'QUARTER'),
  ('EXECUTIVE','exec_nps','METRIC_SINGLE','NPS','[{"metric_code":"NPS_SCORE","display_as":"GAUGE"}]',3,'QUARTER'),
  ('EXECUTIVE','exec_risk','METRIC_GROUP','Riskexponering','[{"metric_code":"RISK_HIGH_CRITICAL_COUNT"},{"metric_code":"SUPPLIER_ON_WATCH_COUNT"},{"metric_code":"AGREEMENTS_EXPIRING_30D"}]',4,'HALF'),
  ('EXECUTIVE','exec_compliance','METRIC_SINGLE','ISO Compliance','[{"metric_code":"ISO_COMPLIANCE_PCT","display_as":"GAUGE"}]',5,'QUARTER'),
  ('EXECUTIVE','exec_decisions','METRIC_SINGLE','Beslut genomförda','[{"metric_code":"DECISION_IMPLEMENTATION_RATE","display_as":"GAUGE"}]',6,'QUARTER'),
  ('QUALITY_MANAGER','qm_nc','METRIC_GROUP','Avvikelser','[{"metric_code":"NC_OPEN_COUNT","display_as":"TRAFFIC_LIGHT"},{"metric_code":"NC_AVG_CLOSE_DAYS","display_as":"SPARKLINE"},{"metric_code":"NC_REPEAT_RATE","display_as":"GAUGE"}]',1,'FULL'),
  ('QUALITY_MANAGER','qm_improvement','METRIC_SINGLE','Förbättringar','[{"metric_code":"IMPROVEMENT_COMPLETION_RATE","display_as":"GAUGE"}]',2,'QUARTER'),
  ('QUALITY_MANAGER','qm_compliance','METRIC_SINGLE','Compliance','[{"metric_code":"ISO_COMPLIANCE_PCT","display_as":"GAUGE"}]',3,'QUARTER'),
  ('QUALITY_MANAGER','qm_calibration','METRIC_SINGLE','Kalibrering','[{"metric_code":"CALIBRATION_OVERDUE_COUNT","display_as":"TRAFFIC_LIGHT"}]',4,'QUARTER'),
  ('QUALITY_MANAGER','qm_supplier','METRIC_GROUP','Leverantörer','[{"metric_code":"SUPPLIER_AVG_RATING","display_as":"GAUGE"},{"metric_code":"SUPPLIER_ON_WATCH_COUNT","display_as":"TRAFFIC_LIGHT"}]',5,'HALF'),
  ('QUALITY_MANAGER','qm_documents','METRIC_SINGLE','Dokumentstatus','[{"metric_code":"DOCUMENT_REVIEW_OVERDUE","display_as":"TRAFFIC_LIGHT"}]',6,'QUARTER'),
  ('QUALITY_MANAGER','qm_complaints','METRIC_GROUP','Kundklagomål','[{"metric_code":"COMPLAINT_COUNT","display_as":"TREND_ARROW"},{"metric_code":"COMPLAINT_SLA_BREACH_RATE","display_as":"TRAFFIC_LIGHT"}]',7,'HALF'),
  ('QUALITY_MANAGER','qm_process','METRIC_GROUP','Processhälsa','[{"metric_code":"PROCESS_EXECUTION_COUNT","display_as":"SPARKLINE"},{"metric_code":"PROCESS_AVG_DURATION","display_as":"SPARKLINE"}]',8,'HALF'),
  ('FINANCE_CONTROLLER','fin_tb','METRIC_SINGLE','Trial Balance','[{"metric_code":"TRIAL_BALANCE_DIFF","display_as":"TRAFFIC_LIGHT"}]',1,'QUARTER'),
  ('FINANCE_CONTROLLER','fin_revenue','METRIC_SINGLE','MRR','[{"metric_code":"MRR","display_as":"SPARKLINE"}]',2,'QUARTER'),
  ('FINANCE_CONTROLLER','fin_burn','METRIC_SINGLE','Burn rate','[{"metric_code":"BURN_RATE","display_as":"SPARKLINE"}]',3,'QUARTER'),
  ('FINANCE_CONTROLLER','fin_runway','METRIC_SINGLE','Runway','[{"metric_code":"RUNWAY_MONTHS","display_as":"GAUGE"}]',4,'QUARTER'),
  ('HR_MANAGER','hr_capability','METRIC_SINGLE','Team capability','[{"metric_code":"TEAM_AVG_CAPABILITY","display_as":"HEATMAP"}]',1,'FULL'),
  ('HR_MANAGER','hr_gaps','METRIC_SINGLE','Kritiska gaps','[{"metric_code":"CAPABILITY_GAP_COUNT","display_as":"TRAFFIC_LIGHT"}]',2,'QUARTER'),
  ('HR_MANAGER','hr_development','METRIC_SINGLE','Utvecklingsplaner','[{"metric_code":"DEVELOPMENT_PLAN_PROGRESS","display_as":"GAUGE"}]',3,'QUARTER'),
  ('HR_MANAGER','hr_personnel','METRIC_SINGLE','Personalärenden','[{"metric_code":"PERSONNEL_CASE_COUNT","display_as":"NUMBER"}]',4,'QUARTER'),
  ('HR_MANAGER','hr_deputies','METRIC_SINGLE','Ställföreträdare','[{"metric_code":"DEPUTY_COVERAGE_PCT","display_as":"GAUGE"}]',5,'QUARTER'),
  ('OPERATIONS_MANAGER','ops_tasks','METRIC_GROUP','Tasks','[{"metric_code":"TASK_COMPLETION_RATE","display_as":"GAUGE"},{"metric_code":"TASK_OVERDUE_COUNT","display_as":"TRAFFIC_LIGHT"},{"metric_code":"TASK_AVG_COMPLETION_DAYS","display_as":"SPARKLINE"}]',1,'FULL'),
  ('OPERATIONS_MANAGER','ops_pipeline','METRIC_GROUP','Pipeline','[{"metric_code":"DEAL_PIPELINE_VALUE","display_as":"NUMBER"},{"metric_code":"DEAL_CONVERSION_RATE","display_as":"GAUGE"},{"metric_code":"LEADS_PER_WEEK","display_as":"TREND_ARROW"}]',2,'FULL'),
  ('OPERATIONS_MANAGER','ops_maintenance','METRIC_SINGLE','Underhåll','[{"metric_code":"MAINTENANCE_OVERDUE_COUNT","display_as":"TRAFFIC_LIGHT"}]',3,'QUARTER'),
  ('INTERNAL_AUDITOR','aud_compliance','METRIC_SINGLE','Compliance','[{"metric_code":"ISO_COMPLIANCE_PCT","display_as":"GAUGE"}]',1,'THIRD'),
  ('INTERNAL_AUDITOR','aud_findings','METRIC_SINGLE','Findings','[{"metric_code":"AUDIT_FINDING_COUNT","display_as":"TREND_ARROW"}]',2,'THIRD'),
  ('INTERNAL_AUDITOR','aud_nc','METRIC_SINGLE','Öppna NC','[{"metric_code":"NC_OPEN_COUNT","display_as":"TRAFFIC_LIGHT"}]',3,'THIRD')
ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Dashboard widgets seed failed: %', SQLERRM;
END $$;
