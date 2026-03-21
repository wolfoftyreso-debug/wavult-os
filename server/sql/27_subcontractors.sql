-- ---------------------------------------------------------------------------
-- Module 27b: Subcontractors, Supply Chain, Flowdown, Receiving Inspections
-- ISO 8.4 (complete) — Control of externally provided processes
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE supply_chain_relationship AS ENUM ('SUBCONTRACTOR','SUB_SUPPLIER','OUTSOURCED_PROCESS','AGENT','DISTRIBUTOR','CALIBRATION_SUB','MATERIAL_SOURCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supply_chain_status AS ENUM ('ACTIVE','UNDER_EVALUATION','APPROVED','CONDITIONAL','SUSPENDED','UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supply_chain_disclosed_by AS ENUM ('SUPPLIER_DECLARATION','AUDIT_FINDING','SELF_REPORTED','CUSTOMER_REQUIREMENT','REGULATORY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE outsourced_process_status AS ENUM ('ACTIVE','UNDER_EVALUATION','SUSPENDED','TERMINATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE control_method AS ENUM ('FULL_SPECIFICATION','PERFORMANCE_BASED','RESULT_VERIFICATION','EMBEDDED_RESOURCE','AUDIT_BASED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE monitoring_frequency AS ENUM ('CONTINUOUS','DAILY','WEEKLY','MONTHLY','QUARTERLY','PER_DELIVERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_method AS ENUM ('INCOMING_INSPECTION','SAMPLING','FULL_CHECK','CERTIFICATE_BASED','NONE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE flowdown_requirement_type AS ENUM ('QUALITY_STANDARD','REGULATORY','CUSTOMER_SPECIFIC','ENVIRONMENTAL','SOCIAL','SAFETY','DATA_PROTECTION','TRACEABILITY','CONFLICT_MINERALS','REACH','ROHS','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE flowdown_applies_to AS ENUM ('ALL_SUPPLIERS','CRITICAL_ONLY','SPECIFIC_CATEGORIES','SPECIFIC_SUPPLIERS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE flowdown_evidence_type AS ENUM ('CERTIFICATE','DECLARATION','AUDIT_RESULT','TEST_REPORT','SELF_ASSESSMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE flowdown_verification AS ENUM ('DOCUMENT_REVIEW','AUDIT','TEST','DECLARATION_ACCEPTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE flowdown_source AS ENUM ('ISO_REQUIREMENT','REGULATORY','CUSTOMER_CONTRACT','INTERNAL_POLICY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE declaration_status AS ENUM ('REQUESTED','RECEIVED','UNDER_REVIEW','ACCEPTED','REJECTED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE declaration_type AS ENUM ('SELF_DECLARATION','THIRD_PARTY_CERTIFICATE','TEST_REPORT','AUDIT_REPORT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inspection_type AS ENUM ('FULL','SAMPLING','SKIP_LOT','CERTIFICATE_ONLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inspection_result AS ENUM ('ACCEPTED','CONDITIONALLY_ACCEPTED','REJECTED','QUARANTINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE disposition_type AS ENUM ('USE_AS_IS','REWORK','RETURN','SCRAP','CONCESSION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- supply_chain_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supply_chain_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  parent_supplier_id UUID NOT NULL REFERENCES suppliers(id),
  sub_supplier_id UUID NOT NULL REFERENCES suppliers(id),
  relationship_type supply_chain_relationship NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  products_or_services TEXT,
  criticality supplier_criticality NOT NULL DEFAULT 'MEDIUM',
  status supply_chain_status DEFAULT 'UNKNOWN',
  known_since DATE,
  disclosed_by supply_chain_disclosed_by,
  flowdown_requirements JSONB DEFAULT '[]',
  right_to_audit BOOLEAN DEFAULT false,
  audit_clause_in_contract BOOLEAN DEFAULT false,
  last_audited_at DATE,
  next_audit_planned DATE,
  single_source_for_parent BOOLEAN DEFAULT false,
  geographical_risk TEXT,
  quality_history TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, parent_supplier_id, sub_supplier_id),
  CONSTRAINT no_self_supply CHECK (parent_supplier_id != sub_supplier_id)
);

-- ---------------------------------------------------------------------------
-- outsourced_processes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outsourced_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  process_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status outsourced_process_status DEFAULT 'ACTIVE',
  description TEXT NOT NULL,
  scope TEXT NOT NULL,
  retained_control TEXT NOT NULL,
  control_method control_method NOT NULL,
  quality_requirements JSONB DEFAULT '[]',
  sla JSONB DEFAULT '{}',
  kpi_targets JSONB DEFAULT '[]',
  monitoring_frequency monitoring_frequency DEFAULT 'MONTHLY',
  monitoring_method TEXT,
  last_monitored_at TIMESTAMPTZ,
  current_performance JSONB DEFAULT '{}',
  verification_method verification_method DEFAULT 'INCOMING_INSPECTION',
  verification_criteria TEXT,
  acceptance_criteria TEXT,
  contract_reference TEXT,
  contract_start DATE,
  contract_end DATE,
  penalty_clauses BOOLEAN DEFAULT false,
  linked_nc_ids UUID[] DEFAULT '{}',
  responsible_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- flowdown_requirements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flowdown_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  requirement_type flowdown_requirement_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  applies_to flowdown_applies_to DEFAULT 'ALL_SUPPLIERS',
  applies_to_categories TEXT[] DEFAULT '{}',
  applies_to_supplier_ids UUID[] DEFAULT '{}',
  mandatory BOOLEAN DEFAULT true,
  evidence_required BOOLEAN DEFAULT true,
  evidence_type flowdown_evidence_type,
  verification_method flowdown_verification,
  review_interval_months INTEGER DEFAULT 12,
  regulatory_reference TEXT,
  iso_clause TEXT,
  customer_requirement_ref TEXT,
  source flowdown_source DEFAULT 'INTERNAL_POLICY',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- supplier_declarations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  requirement_id UUID NOT NULL REFERENCES flowdown_requirements(id),
  declaration_status declaration_status DEFAULT 'REQUESTED',
  requested_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  declaration_type declaration_type,
  document_url TEXT,
  document_id UUID,
  valid_until DATE,
  notes TEXT,
  rejection_reason TEXT,
  corrective_action_required BOOLEAN DEFAULT false,
  linked_nc_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- receiving_inspections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receiving_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  delivery_reference TEXT,
  delivery_date DATE NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspected_by UUID NOT NULL REFERENCES profiles(id),
  inspection_type inspection_type NOT NULL,
  items_received INTEGER,
  items_inspected INTEGER,
  items_accepted INTEGER,
  items_rejected INTEGER,
  defect_rate_pct NUMERIC(5,2),
  result inspection_result NOT NULL,
  quarantine_reason TEXT,
  disposition disposition_type,
  disposition_approved_by UUID REFERENCES profiles(id),
  concession_customer_notified BOOLEAN,
  findings JSONB DEFAULT '[]',
  linked_nc_id UUID,
  linked_complaint_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-calculate defect_rate
CREATE OR REPLACE FUNCTION calc_defect_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.items_received IS NOT NULL AND NEW.items_received > 0 THEN
    NEW.defect_rate_pct := ROUND((COALESCE(NEW.items_rejected, 0)::NUMERIC / NEW.items_received) * 100, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_defect_rate ON receiving_inspections;
CREATE TRIGGER trg_defect_rate BEFORE INSERT OR UPDATE ON receiving_inspections FOR EACH ROW EXECUTE FUNCTION calc_defect_rate();

-- Auto-NC on REJECTED inspection
CREATE OR REPLACE FUNCTION auto_nc_on_rejected_inspection()
RETURNS TRIGGER AS $$
DECLARE v_nc_id UUID;
BEGIN
  IF NEW.result = 'REJECTED' AND NEW.linked_nc_id IS NULL THEN
    INSERT INTO non_conformances (org_id, title, description, severity, source, status)
    VALUES (
      NEW.org_id,
      'Inkommande kontroll: avvisad leverans',
      'Leverans ' || COALESCE(NEW.delivery_reference, 'N/A') || ' avvisad vid mottagningskontroll. ' ||
      COALESCE(NEW.items_rejected::text, '0') || ' av ' || COALESCE(NEW.items_received::text, '0') || ' enheter.',
      'MAJOR', 'RECEIVING_INSPECTION', 'OPEN'
    ) RETURNING id INTO v_nc_id;
    NEW.linked_nc_id := v_nc_id;

    -- Register in supplier_nc_register
    INSERT INTO supplier_nc_register (org_id, supplier_id, nc_id, impact_description, corrective_action_required)
    VALUES (NEW.org_id, NEW.supplier_id, v_nc_id, 'Avvisad vid mottagningskontroll', true);
  END IF;
  RETURN NEW;
EXCEPTION WHEN undefined_table THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_inspection_nc ON receiving_inspections;
CREATE TRIGGER trg_inspection_nc BEFORE INSERT ON receiving_inspections FOR EACH ROW EXECUTE FUNCTION auto_nc_on_rejected_inspection();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_supply_chain_depth AS
SELECT
  scl.org_id,
  ps.supplier_code AS parent_code,
  pc.name AS parent_name,
  ss.supplier_code AS sub_code,
  sc.name AS sub_name,
  scl.tier,
  scl.relationship_type,
  scl.criticality,
  scl.status,
  scl.right_to_audit,
  scl.single_source_for_parent,
  CASE
    WHEN scl.status = 'UNKNOWN' THEN 'UNDISCLOSED'
    WHEN scl.status = 'SUSPENDED' THEN 'SUSPENDED'
    WHEN scl.criticality IN ('CRITICAL','HIGH') AND scl.right_to_audit = false THEN 'NO_AUDIT_RIGHT'
    WHEN scl.criticality IN ('CRITICAL','HIGH') AND scl.last_audited_at IS NULL THEN 'NEVER_AUDITED'
    WHEN scl.criticality IN ('CRITICAL','HIGH') AND scl.last_audited_at < CURRENT_DATE - INTERVAL '12 months' THEN 'AUDIT_OVERDUE'
    ELSE 'OK'
  END AS risk_flag
FROM supply_chain_links scl
JOIN suppliers ps ON ps.id = scl.parent_supplier_id
JOIN companies pc ON pc.id = ps.company_id
JOIN suppliers ss ON ss.id = scl.sub_supplier_id
JOIN companies sc ON sc.id = ss.company_id;

CREATE OR REPLACE VIEW v_outsourced_process_status AS
SELECT
  op.org_id,
  op.id AS outsourced_process_id,
  p.name AS process_name,
  c.name AS supplier_name,
  s.current_rating,
  op.status,
  op.control_method,
  op.monitoring_frequency,
  op.last_monitored_at,
  CASE
    WHEN op.status = 'SUSPENDED' THEN 'CRITICAL'
    WHEN op.last_monitored_at IS NULL THEN 'NEVER_MONITORED'
    WHEN op.monitoring_frequency = 'MONTHLY' AND op.last_monitored_at < CURRENT_DATE - INTERVAL '35 days' THEN 'OVERDUE'
    WHEN op.monitoring_frequency = 'QUARTERLY' AND op.last_monitored_at < CURRENT_DATE - INTERVAL '100 days' THEN 'OVERDUE'
    ELSE 'OK'
  END AS monitoring_status,
  array_length(op.linked_nc_ids, 1) AS nc_count
FROM outsourced_processes op
JOIN processes p ON p.id = op.process_id
JOIN suppliers s ON s.id = op.supplier_id
JOIN companies c ON c.id = s.company_id;

CREATE OR REPLACE VIEW v_flowdown_compliance AS
SELECT
  fr.org_id,
  fr.title AS requirement,
  fr.requirement_type,
  fr.mandatory,
  s.supplier_code,
  c.name AS supplier_name,
  sd.declaration_status,
  sd.valid_until,
  CASE
    WHEN sd.id IS NULL AND fr.mandatory THEN 'MISSING'
    WHEN sd.declaration_status = 'REJECTED' THEN 'REJECTED'
    WHEN sd.valid_until < CURRENT_DATE THEN 'EXPIRED'
    WHEN sd.valid_until < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING'
    WHEN sd.declaration_status = 'ACCEPTED' THEN 'COMPLIANT'
    WHEN sd.declaration_status IN ('REQUESTED','RECEIVED','UNDER_REVIEW') THEN 'PENDING'
    ELSE 'UNKNOWN'
  END AS compliance_status
FROM flowdown_requirements fr
CROSS JOIN suppliers s
JOIN companies c ON c.id = s.company_id
LEFT JOIN supplier_declarations sd ON sd.supplier_id = s.id AND sd.requirement_id = fr.id
WHERE s.status IN ('APPROVED','CONDITIONALLY_APPROVED','ON_WATCH')
  AND (fr.applies_to = 'ALL_SUPPLIERS'
    OR (fr.applies_to = 'CRITICAL_ONLY' AND s.criticality IN ('CRITICAL','HIGH'))
    OR (fr.applies_to = 'SPECIFIC_SUPPLIERS' AND s.id = ANY(fr.applies_to_supplier_ids)));

CREATE OR REPLACE VIEW v_receiving_inspection_trend AS
SELECT
  ri.org_id,
  s.supplier_code,
  c.name AS supplier_name,
  DATE_TRUNC('month', ri.inspection_date) AS month,
  COUNT(*) AS inspections,
  SUM(ri.items_received) AS total_received,
  SUM(ri.items_rejected) AS total_rejected,
  ROUND(SUM(COALESCE(ri.items_rejected, 0))::NUMERIC / NULLIF(SUM(ri.items_received), 0) * 100, 2) AS reject_rate_pct,
  COUNT(*) FILTER (WHERE ri.result = 'REJECTED') AS rejected_deliveries,
  COUNT(*) FILTER (WHERE ri.result = 'QUARANTINED') AS quarantined
FROM receiving_inspections ri
JOIN suppliers s ON s.id = ri.supplier_id
JOIN companies c ON c.id = s.company_id
GROUP BY ri.org_id, s.supplier_code, c.name, DATE_TRUNC('month', ri.inspection_date);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_scl_parent ON supply_chain_links(parent_supplier_id);
CREATE INDEX IF NOT EXISTS idx_scl_sub ON supply_chain_links(sub_supplier_id);
CREATE INDEX IF NOT EXISTS idx_scl_org ON supply_chain_links(org_id);
CREATE INDEX IF NOT EXISTS idx_op_process ON outsourced_processes(process_id);
CREATE INDEX IF NOT EXISTS idx_op_supplier ON outsourced_processes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fd_org ON flowdown_requirements(org_id);
CREATE INDEX IF NOT EXISTS idx_sd_supplier ON supplier_declarations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sd_requirement ON supplier_declarations(requirement_id);
CREATE INDEX IF NOT EXISTS idx_ri_supplier ON receiving_inspections(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ri_date ON receiving_inspections(inspection_date);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE supply_chain_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE outsourced_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowdown_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scl_org" ON supply_chain_links USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "op_org" ON outsourced_processes USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "fd_org" ON flowdown_requirements USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "sd_org" ON supplier_declarations USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "ri_org" ON receiving_inspections USING (org_id = current_setting('app.org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Seed — Standard Flowdown Requirements
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO flowdown_requirements (org_id, title, requirement_type, description, applies_to, mandatory, evidence_type, source, iso_clause)
  VALUES
    (v_org_id, 'ISO 9001-certifiering', 'QUALITY_STANDARD', 'Leverantör ska vara ISO 9001-certifierad eller uppvisa likvärdigt kvalitetssystem.', 'CRITICAL_ONLY', false, 'CERTIFICATE', 'INTERNAL_POLICY', '8.4.1'),
    (v_org_id, 'Kvalitetsdeklaration', 'QUALITY_STANDARD', 'Leverantör ska bekräfta förmåga att uppfylla specificerade krav.', 'ALL_SUPPLIERS', true, 'DECLARATION', 'ISO_REQUIREMENT', '8.4.3'),
    (v_org_id, 'GDPR/dataskydd', 'DATA_PROTECTION', 'Leverantör som behandlar personuppgifter ska uppfylla GDPR/tillämplig dataskyddslagstiftning.', 'SPECIFIC_CATEGORIES', true, 'DECLARATION', 'REGULATORY', '8.4.3'),
    (v_org_id, 'Underleverantörsdeklaration', 'TRACEABILITY', 'Leverantör ska redovisa kritiska underleverantörer.', 'CRITICAL_ONLY', true, 'DECLARATION', 'INTERNAL_POLICY', '8.4.3'),
    (v_org_id, 'Audit-rätt', 'QUALITY_STANDARD', 'Organisationen ska ha rätt att auditera leverantör och dennes underleverantörer.', 'CRITICAL_ONLY', true, 'DECLARATION', 'INTERNAL_POLICY', '8.4.3'),
    (v_org_id, 'Avvikelsehantering', 'QUALITY_STANDARD', 'Leverantör ska ha dokumenterad process för avvikelsehantering.', 'ALL_SUPPLIERS', true, 'DECLARATION', 'ISO_REQUIREMENT', '8.4.2'),
    (v_org_id, 'Ändringsnotifiering', 'QUALITY_STANDARD', 'Leverantör ska notifiera vid ändringar i process, material, eller underleverantör som kan påverka kvalitet.', 'ALL_SUPPLIERS', true, 'DECLARATION', 'ISO_REQUIREMENT', '8.5.6'),
    (v_org_id, 'Spårbarhet', 'TRACEABILITY', 'Leverantör ska kunna spåra material/komponenter till ursprung.', 'CRITICAL_ONLY', true, 'DECLARATION', 'ISO_REQUIREMENT', '8.5.2')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Flowdown seed failed: %', SQLERRM;
END $$;
