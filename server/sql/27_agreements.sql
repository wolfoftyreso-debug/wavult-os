-- ---------------------------------------------------------------------------
-- Module 27a: Agreements, Job Descriptions, Document Templates
-- ISO 5.3, 7.2, 8.4.3, GDPR Art 28
-- ---------------------------------------------------------------------------

-- ENUMs
DO $$ BEGIN CREATE TYPE agreement_status AS ENUM ('DRAFT','PENDING_REVIEW','PENDING_SIGNATURE','ACTIVE','EXPIRING','EXPIRED','TERMINATED','RENEWED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agreement_type AS ENUM ('EMPLOYMENT','CONTRACTOR','NDA','DPA','SUPPLIER','CUSTOMER','PARTNERSHIP','LICENSE','LEASE','SERVICE_LEVEL','SUBCONTRACTOR','CONSULTANCY','INTERNSHIP','BOARD_MEMBER','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE confidentiality_level AS ENUM ('PUBLIC','INTERNAL','CONFIDENTIAL','STRICTLY_CONFIDENTIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE signature_method AS ENUM ('MANUAL','ELECTRONIC','BANKID','DOCUSIGN','SCRIVE','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE recurring_frequency AS ENUM ('MONTHLY','QUARTERLY','ANNUALLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE clause_type AS ENUM ('TERM','TERMINATION','PAYMENT','CONFIDENTIALITY','IP_RIGHTS','LIABILITY','INDEMNITY','DATA_PROTECTION','NON_COMPETE','NON_SOLICITATION','FORCE_MAJEURE','WARRANTY','SLA','PENALTY','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE job_description_status AS ENUM ('DRAFT','ACTIVE','UNDER_REVIEW','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employment_type AS ENUM ('FULL_TIME','PART_TIME','CONTRACTOR','TEMPORARY','INTERN','BOARD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE template_type AS ENUM ('EMPLOYMENT_AGREEMENT','NDA','DPA','SUPPLIER_AGREEMENT','CUSTOMER_AGREEMENT','JOB_DESCRIPTION','POLICY','SOP','AUDIT_REPORT','CALIBRATION_CERT','COMPLAINT_RESPONSE','RECALL_NOTICE','MEETING_MINUTES','CREDIT_NOTE','ONBOARDING_CHECKLIST','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE template_format AS ENUM ('DOCX','PDF','HTML','MARKDOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE template_status AS ENUM ('DRAFT','ACTIVE','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS agreement_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS job_desc_number_seq START 1;

-- ---------------------------------------------------------------------------
-- agreements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  code TEXT NOT NULL,
  status agreement_status DEFAULT 'DRAFT',
  agreement_type agreement_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  -- Parties
  party_internal TEXT NOT NULL,
  party_internal_signatory_id UUID REFERENCES profiles(id),
  party_external_company_id UUID,
  party_external_contact_id UUID,
  party_external_name TEXT,
  -- Legal
  jurisdiction_id UUID,
  governing_law TEXT,
  dispute_resolution TEXT,
  confidentiality_level confidentiality_level DEFAULT 'CONFIDENTIAL',
  -- Dates
  effective_date DATE,
  expiration_date DATE,
  notice_period_days INTEGER,
  auto_renew BOOLEAN DEFAULT false,
  auto_renew_period_months INTEGER,
  terminated_date DATE,
  termination_reason TEXT,
  termination_notice_given_at DATE,
  -- Financial
  contract_value NUMERIC(12,2),
  contract_currency TEXT DEFAULT 'EUR',
  payment_terms TEXT,
  recurring_amount NUMERIC(12,2),
  recurring_frequency recurring_frequency,
  -- Document
  document_url TEXT,
  document_version_history JSONB DEFAULT '[]',
  template_id UUID,
  -- Signature
  requires_signature BOOLEAN DEFAULT true,
  signature_method signature_method,
  signed_at TIMESTAMPTZ,
  signed_by_internal UUID REFERENCES profiles(id),
  signed_by_external TEXT,
  countersigned_at TIMESTAMPTZ,
  -- Links
  linked_user_id UUID REFERENCES profiles(id),
  linked_supplier_id UUID,
  linked_deal_id UUID,
  linked_asset_id UUID,
  parent_agreement_id UUID REFERENCES agreements(id),
  -- Reminders
  renewal_reminder_days INTEGER DEFAULT 90,
  review_interval_months INTEGER DEFAULT 12,
  next_review_date DATE,
  last_reviewed_at DATE,
  reviewed_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code)
);

-- Auto-code trigger
CREATE OR REPLACE FUNCTION generate_agreement_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'AVT-' || EXTRACT(YEAR FROM NOW())::text || '-' || LPAD(nextval('agreement_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agreement_code ON agreements;
CREATE TRIGGER trg_agreement_code BEFORE INSERT ON agreements FOR EACH ROW EXECUTE FUNCTION generate_agreement_code();

-- ---------------------------------------------------------------------------
-- agreement_clauses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agreement_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  clause_number TEXT,
  clause_type clause_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_text TEXT,
  triggers_action BOOLEAN DEFAULT false,
  action_description TEXT,
  action_date DATE,
  action_responsible_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- agreement_amendments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agreement_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  amendment_number INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  effective_date DATE NOT NULL,
  changes JSONB NOT NULL,
  signed_at TIMESTAMPTZ,
  signed_by_internal UUID REFERENCES profiles(id),
  signed_by_external TEXT,
  document_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- job_descriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  code TEXT NOT NULL,
  status job_description_status DEFAULT 'DRAFT',
  version INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  department TEXT,
  reports_to_role TEXT,
  reports_to_user_id UUID REFERENCES profiles(id),
  purpose TEXT NOT NULL,
  scope TEXT,
  responsibilities JSONB NOT NULL DEFAULT '[]',
  authority JSONB DEFAULT '[]',
  delegation JSONB DEFAULT '[]',
  required_capabilities JSONB DEFAULT '[]',
  required_education TEXT,
  required_experience TEXT,
  required_certifications JSONB DEFAULT '[]',
  desired_qualifications TEXT,
  role_code TEXT,
  process_ids UUID[] DEFAULT '{}',
  asset_ids UUID[] DEFAULT '{}',
  critical_function_ids UUID[] DEFAULT '{}',
  agreement_template_id UUID,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  next_review_date DATE,
  review_interval_months INTEGER DEFAULT 12,
  document_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code)
);

CREATE OR REPLACE FUNCTION generate_job_desc_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'BEF-' || LPAD(nextval('job_desc_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_desc_code ON job_descriptions;
CREATE TRIGGER trg_job_desc_code BEFORE INSERT ON job_descriptions FOR EACH ROW EXECUTE FUNCTION generate_job_desc_code();

-- ---------------------------------------------------------------------------
-- user_job_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  job_description_id UUID NOT NULL REFERENCES job_descriptions(id),
  agreement_id UUID REFERENCES agreements(id),
  start_date DATE NOT NULL,
  end_date DATE,
  is_primary BOOLEAN DEFAULT true,
  employment_type employment_type DEFAULT 'FULL_TIME',
  employment_percentage NUMERIC(5,2) DEFAULT 100,
  probation_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- document_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_type template_type NOT NULL,
  format template_format DEFAULT 'MARKDOWN',
  template_content TEXT,
  template_url TEXT,
  variables JSONB NOT NULL DEFAULT '[]',
  jurisdiction_id UUID,
  requires_legal_review BOOLEAN DEFAULT false,
  legal_reviewed_at DATE,
  legal_review_id UUID,
  version INTEGER DEFAULT 1,
  status template_status DEFAULT 'DRAFT',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  language_code TEXT DEFAULT 'sv',
  is_default BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, code, version)
);

-- ---------------------------------------------------------------------------
-- generated_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  template_id UUID REFERENCES document_templates(id),
  title TEXT NOT NULL,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  variable_values JSONB NOT NULL,
  output_url TEXT,
  output_format TEXT,
  linked_agreement_id UUID REFERENCES agreements(id),
  linked_entity_type TEXT,
  linked_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agreements_org ON agreements(org_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_type ON agreements(agreement_type);
CREATE INDEX IF NOT EXISTS idx_agreements_expiration ON agreements(expiration_date);
CREATE INDEX IF NOT EXISTS idx_agreements_user ON agreements(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_agreements_supplier ON agreements(linked_supplier_id);
CREATE INDEX IF NOT EXISTS idx_agreement_clauses_agreement ON agreement_clauses(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_amendments_agreement ON agreement_amendments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_org ON job_descriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_role ON job_descriptions(role_code);
CREATE INDEX IF NOT EXISTS idx_user_job_assignments_user ON user_job_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_assignments_job ON user_job_assignments(job_description_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template ON generated_documents(template_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreements_org" ON agreements USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "clauses_org" ON agreement_clauses USING (EXISTS (SELECT 1 FROM agreements a WHERE a.id = agreement_id AND a.org_id = current_setting('app.org_id', true)::uuid));
CREATE POLICY "amendments_org" ON agreement_amendments USING (EXISTS (SELECT 1 FROM agreements a WHERE a.id = agreement_id AND a.org_id = current_setting('app.org_id', true)::uuid));
CREATE POLICY "job_desc_org" ON job_descriptions USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "job_assign_org" ON user_job_assignments USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "templates_org" ON document_templates USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "gen_docs_org" ON generated_documents USING (org_id = current_setting('app.org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Seed — Job Descriptions for ISO roles
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO job_descriptions (org_id, code, title, purpose, role_code, responsibilities, required_capabilities, status)
  VALUES
    (v_org_id, 'BEF-001', 'VD / Verkställande direktör',
     'Leda organisationen strategiskt och operativt. Representera organisationen externt. Äga den övergripande kvalitetsmålsättningen.',
     'EXECUTIVE',
     '[{"area":"Strategisk ledning","description":"Sätta och följa upp organisationens mål","iso_reference":"5.1.1"},{"area":"Kundfokus","description":"Säkerställa att kundkrav identifieras och uppfylls","iso_reference":"5.1.2"},{"area":"Kvalitetspolicy","description":"Upprätta och kommunicera kvalitetspolicy","iso_reference":"5.2"},{"area":"Resursallokering","description":"Tillhandahålla nödvändiga resurser","iso_reference":"7.1.1"},{"area":"Ledningens genomgång","description":"Leda kvartalsvis strategisk review","iso_reference":"9.3"},{"area":"Återkallningsbeslut","description":"Godkänna recall vid CLASS I/II","iso_reference":"8.7"}]',
     '[{"capability_id":"c_decision_making","min_level":"L5","critical":true},{"capability_id":"c_stakeholder","min_level":"L4","critical":true}]',
     'ACTIVE'),
    (v_org_id, 'BEF-002', 'Kvalitetsansvarig',
     'Äga kvalitetsledningssystemet. Säkerställa att processer är definierade, implementerade, och förbättras kontinuerligt.',
     'QUALITY_MANAGER',
     '[{"area":"QMS-ägande","description":"Upprätta, implementera och underhålla QMS","iso_reference":"5.3"},{"area":"Avvikelsehantering","description":"Hantera NC: rotorsak, korrigerande åtgärd, verifiering","iso_reference":"10.2"},{"area":"Internrevision","description":"Planera och samordna internrevisionsprogram","iso_reference":"9.2"},{"area":"Ständig förbättring","description":"Driva PDCA-cykler och förbättringsinitiativ","iso_reference":"10.3"},{"area":"Leverantörskvalitet","description":"Bedöma och godkänna leverantörer","iso_reference":"8.4"},{"area":"Dokumentstyrning","description":"Övergripande ansvar för dokumenterad information","iso_reference":"7.5"},{"area":"Kalibrering","description":"Säkerställa att mätresurser är kalibrerade","iso_reference":"7.1.5"},{"area":"Compliance","description":"Övervaka efterlevnad av standarder","iso_reference":"4.1"},{"area":"Rapportering","description":"Rapportera QMS-prestanda till ledningen","iso_reference":"9.3.2"}]',
     '[{"capability_id":"c_quality_focus","min_level":"L5","critical":true},{"capability_id":"c_process_ownership","min_level":"L5","critical":true},{"capability_id":"c_data_driven","min_level":"L4","critical":true}]',
     'ACTIVE'),
    (v_org_id, 'BEF-003', 'Ekonomiansvarig / CFO',
     'Ansvara för organisationens ekonomiska styrning, redovisning, och finansiell rapportering.',
     'FINANCE_CONTROLLER',
     '[{"area":"Redovisning","description":"Löpande bokföring och månadsavstämning","iso_reference":"7.1.1"},{"area":"Rapportering","description":"Resultaträkning, balansräkning, kassaflöde","iso_reference":"9.1"},{"area":"Budget","description":"Upprätta och följa upp budget","iso_reference":"6.2.2"},{"area":"Utbetalningar","description":"Godkänna utbetalningar, dubbelsignatur >€1000","iso_reference":"7.1.1"},{"area":"Moms/skatt","description":"Momsredovisning, skattedeklaration, SIE4-export","iso_reference":""},{"area":"Valuta","description":"FX-hantering, revaluation, hedging-strategi","iso_reference":""},{"area":"Revision","description":"Stödja intern och extern revision","iso_reference":"9.2"}]',
     '[{"capability_id":"c_domain_expertise","min_level":"L5","critical":true},{"capability_id":"c_data_driven","min_level":"L4","critical":true}]',
     'ACTIVE'),
    (v_org_id, 'BEF-004', 'IT- och säkerhetsansvarig',
     'Ansvara för IT-infrastruktur, informationssäkerhet, och systemutveckling.',
     'IT',
     '[{"area":"Infrastruktur","description":"Drift av alla IT-system och plattformar","iso_reference":"7.1.3"},{"area":"Informationssäkerhet","description":"Implementera och underhålla ISMS","iso_reference":"ISO 27001"},{"area":"Systemuppdateringar","description":"Change management för alla IT-system","iso_reference":"8.5.6"},{"area":"Backup/DR","description":"Backup-strategi och disaster recovery","iso_reference":"7.1.3"},{"area":"Behörigheter","description":"Administrera systemåtkomst och roller","iso_reference":"7.5.3"},{"area":"GDPR tekniskt","description":"Privacy by design, dataskydd, kryptering","iso_reference":"GDPR Art 25/32"}]',
     '[{"capability_id":"c_system_usage","min_level":"L5","critical":true},{"capability_id":"c_problem_solving","min_level":"L4","critical":true}]',
     'ACTIVE'),
    (v_org_id, 'BEF-005', 'HR- och driftsansvarig',
     'Ansvara för personal, rekrytering, onboarding, drift, logistik, och kontorsadministration.',
     'OPERATIONS_MANAGER',
     '[{"area":"Personaladmin","description":"Anställningsavtal, register, behörigheter","iso_reference":"7.1.2"},{"area":"Rekrytering","description":"Behovsanalys, annonsering, intervju, anställning","iso_reference":"7.1.2"},{"area":"Onboarding","description":"Introduktion, utbildningsplan, behörigheter","iso_reference":"7.2"},{"area":"Drift","description":"Kontorsstyrning, leveranser, logistik","iso_reference":"8.5.1"},{"area":"Kundreklamationer","description":"Ta emot och hantera reklamationer inom SLA","iso_reference":"8.2.1"},{"area":"Leverantörskontakt","description":"Operativ kontakt med leverantörer","iso_reference":"8.4.3"}]',
     '[{"capability_id":"c_task_completion","min_level":"L4","critical":true},{"capability_id":"c_follow_through","min_level":"L4","critical":true}]',
     'ACTIVE'),
    (v_org_id, 'BEF-006', 'Intern revisor',
     'Planera och genomföra interna revisioner. Bedöma processefektivitet och regelefterlevnad.',
     'INTERNAL_AUDITOR',
     '[{"area":"Revisionsplanering","description":"Upprätta årligt revisionsprogram baserat på risk","iso_reference":"9.2.2"},{"area":"Revisionsgenomförande","description":"Genomföra revisioner, samla bevis, bedöma","iso_reference":"9.2.1"},{"area":"Rapportering","description":"Rapportera findings som NC eller observationer","iso_reference":"9.2.1"},{"area":"Uppföljning","description":"Verifiera att korrigerande åtgärder är effektiva","iso_reference":"10.2"}]',
     '[{"capability_id":"c_data_driven","min_level":"L4","critical":true},{"capability_id":"c_documentation","min_level":"L4","critical":true}]',
     'ACTIVE')
  ON CONFLICT (org_id, code) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job descriptions seed failed: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Seed — Document Templates
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO document_templates (org_id, code, name, template_type, format, variables, language_code, status)
  VALUES
    (v_org_id, 'MALL-001', 'Anställningsavtal (Sverige)', 'EMPLOYMENT_AGREEMENT', 'MARKDOWN',
     '[{"key":"employee_name","label":"Namn","source":"users.full_name","required":true},{"key":"personal_number","label":"Personnummer","source":"manual","required":true},{"key":"job_title","label":"Befattning","source":"job_descriptions.title","required":true},{"key":"department","label":"Avdelning","source":"job_descriptions.department"},{"key":"start_date","label":"Tillträdesdag","source":"manual","type":"date","required":true},{"key":"salary_monthly","label":"Månadslön","source":"manual","type":"number","required":true},{"key":"salary_currency","label":"Valuta","source":"org.default_currency"},{"key":"probation_months","label":"Prövotid (månader)","source":"jurisdiction.max_probation_months"},{"key":"notice_period","label":"Uppsägningstid","source":"jurisdiction.termination_notice_period"},{"key":"workplace","label":"Arbetsplats","source":"manual"},{"key":"working_hours","label":"Arbetstid","source":"manual","default":"40 timmar/vecka"},{"key":"vacation_days","label":"Semesterdagar","source":"manual","default":"25"},{"key":"employer_name","label":"Arbetsgivare","source":"organizations.name"},{"key":"responsibilities","label":"Huvudansvar","source":"job_descriptions.responsibilities","type":"list"},{"key":"capabilities","label":"Kompetenskrav","source":"job_descriptions.required_capabilities","type":"list"}]',
     'sv', 'ACTIVE'),
    (v_org_id, 'MALL-002', 'NDA / Sekretessavtal', 'NDA', 'MARKDOWN',
     '[{"key":"party_name","label":"Motpart","required":true},{"key":"party_org_number","label":"Org.nr"},{"key":"purpose","label":"Syfte","required":true},{"key":"confidential_info","label":"Konfidentiell information","required":true},{"key":"term_months","label":"Giltighetstid (månader)","default":"24"},{"key":"governing_law","label":"Tillämplig lag","source":"jurisdiction.governing_law"}]',
     'sv', 'ACTIVE'),
    (v_org_id, 'MALL-003', 'DPA / Personuppgiftsbiträdesavtal', 'DPA', 'MARKDOWN',
     '[{"key":"processor_name","label":"Biträde","required":true},{"key":"processing_purpose","label":"Ändamål","required":true},{"key":"data_categories","label":"Kategorier av personuppgifter","required":true},{"key":"data_subjects","label":"Kategorier av registrerade","required":true},{"key":"sub_processors","label":"Underbiträden","type":"list"},{"key":"transfer_countries","label":"Tredjelandsöverföring"},{"key":"security_measures","label":"Tekniska och organisatoriska åtgärder","required":true},{"key":"deletion_policy","label":"Radering efter avtalets upphörande","required":true}]',
     'sv', 'ACTIVE'),
    (v_org_id, 'MALL-004', 'Leverantörsavtal', 'SUPPLIER_AGREEMENT', 'MARKDOWN',
     '[{"key":"supplier_name","label":"Leverantör","source":"suppliers.company.name","required":true},{"key":"products_services","label":"Produkter/tjänster","required":true},{"key":"quality_requirements","label":"Kvalitetskrav","required":true},{"key":"delivery_terms","label":"Leveransvillkor","required":true},{"key":"payment_terms","label":"Betalningsvillkor","required":true},{"key":"warranty","label":"Garanti","required":true},{"key":"audit_right","label":"Revisionsrätt","default":"true"},{"key":"nc_handling","label":"Avvikelsehantering","required":true}]',
     'sv', 'ACTIVE'),
    (v_org_id, 'MALL-005', 'Befattningsbeskrivning', 'JOB_DESCRIPTION', 'MARKDOWN',
     '[{"key":"title","label":"Befattning","source":"job_descriptions.title","required":true},{"key":"department","label":"Avdelning","source":"job_descriptions.department"},{"key":"reports_to","label":"Rapporterar till","source":"job_descriptions.reports_to_role"},{"key":"purpose","label":"Syfte","source":"job_descriptions.purpose","required":true},{"key":"responsibilities","label":"Ansvar","source":"job_descriptions.responsibilities","type":"list","required":true},{"key":"authority","label":"Befogenheter","source":"job_descriptions.authority","type":"list"},{"key":"capabilities","label":"Kompetenskrav","source":"job_descriptions.required_capabilities","type":"list"},{"key":"education","label":"Utbildning","source":"job_descriptions.required_education"},{"key":"experience","label":"Erfarenhet","source":"job_descriptions.required_experience"},{"key":"certifications","label":"Certifieringar","source":"job_descriptions.required_certifications","type":"list"}]',
     'sv', 'ACTIVE'),
    (v_org_id, 'MALL-006', 'Onboarding-checklist', 'ONBOARDING_CHECKLIST', 'MARKDOWN',
     '[{"key":"employee_name","label":"Namn","required":true},{"key":"start_date","label":"Startdatum","type":"date","required":true},{"key":"role","label":"Roll","source":"job_descriptions.title"},{"key":"manager","label":"Närmaste chef"},{"key":"buddy","label":"Fadder/mentor"}]',
     'sv', 'ACTIVE')
  ON CONFLICT (org_id, code, version) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Document templates seed failed: %', SQLERRM;
END $$;
