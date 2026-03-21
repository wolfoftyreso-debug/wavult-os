-- ---------------------------------------------------------------------------
-- Module 20: Asset Management
-- ISO 7.1.3 Infrastructure, 7.1.5 Monitoring & Measurement, 8.5.1
-- ---------------------------------------------------------------------------

-- ENUMs
DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM (
    'EQUIPMENT', 'VEHICLE', 'TOOL', 'IT_SYSTEM', 'INFRASTRUCTURE',
    'FACILITY', 'SOFTWARE_LICENSE', 'MEASURING_INSTRUMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM (
    'ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED',
    'CALIBRATION_DUE', 'CALIBRATION_OVERDUE', 'LOST', 'DISPOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calibration_result AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_type AS ENUM (
    'PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'CONDITION_BASED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM (
    'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE update_severity AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'PATCH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE update_status AS ENUM (
    'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED', 'DEFERRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-number sequence
CREATE SEQUENCE IF NOT EXISTS asset_number_seq START 1;

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID REFERENCES organizations(id),
  asset_number              TEXT UNIQUE,
  name                      TEXT NOT NULL,
  description               TEXT,
  asset_type                asset_type NOT NULL,
  status                    asset_status DEFAULT 'ACTIVE',
  location                  TEXT,
  department                TEXT,
  responsible_user_id       UUID REFERENCES profiles(id),
  manufacturer              TEXT,
  model                     TEXT,
  serial_number             TEXT,
  purchase_date             DATE,
  purchase_cost             NUMERIC(15,2),
  currency                  TEXT DEFAULT 'EUR',
  current_value             NUMERIC(15,2),
  depreciation_rate         NUMERIC(5,2),
  expected_lifetime_years   INTEGER,
  warranty_expiry           DATE,
  requires_calibration      BOOLEAN DEFAULT false,
  calibration_interval_days INTEGER,
  next_calibration_due      DATE,
  last_calibrated_at        TIMESTAMPTZ,
  requires_maintenance      BOOLEAN DEFAULT false,
  maintenance_interval_days INTEGER,
  next_maintenance_due      DATE,
  last_maintained_at        TIMESTAMPTZ,
  is_it_system              BOOLEAN DEFAULT false,
  criticality_level         INTEGER DEFAULT 3 CHECK (criticality_level BETWEEN 1 AND 5),
  iso_clause                TEXT[] DEFAULT '{}',
  tags                      TEXT[] DEFAULT '{}',
  metadata                  JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by                UUID REFERENCES profiles(id)
);

-- Auto-generate asset_number
CREATE OR REPLACE FUNCTION generate_asset_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.asset_number IS NULL THEN
    NEW.asset_number := 'AST-' || LPAD(nextval('asset_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_number ON assets;
CREATE TRIGGER trg_asset_number
  BEFORE INSERT ON assets
  FOR EACH ROW EXECUTE FUNCTION generate_asset_number();

-- Auto-update asset calibration status
CREATE OR REPLACE FUNCTION update_asset_calibration_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requires_calibration AND NEW.next_calibration_due IS NOT NULL THEN
    IF NEW.next_calibration_due < CURRENT_DATE THEN
      NEW.status := 'CALIBRATION_OVERDUE';
    ELSIF NEW.next_calibration_due <= CURRENT_DATE + INTERVAL '7 days' AND NEW.status = 'ACTIVE' THEN
      NEW.status := 'CALIBRATION_DUE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calibration_status ON assets;
CREATE TRIGGER trg_calibration_status
  BEFORE INSERT OR UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_asset_calibration_status();

-- ---------------------------------------------------------------------------
-- calibration_records (IMMUTABLE — ISO 7.1.5.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calibration_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              UUID NOT NULL REFERENCES assets(id),
  org_id                UUID REFERENCES organizations(id),
  calibration_date      DATE NOT NULL,
  next_due_date         DATE NOT NULL,
  performed_by          TEXT NOT NULL,
  calibration_lab       TEXT,
  certificate_number    TEXT,
  result                calibration_result NOT NULL,
  measurement_before    JSONB DEFAULT '{}',
  measurement_after     JSONB DEFAULT '{}',
  tolerance_spec        TEXT,
  pass_criteria         TEXT,
  notes                 TEXT,
  nc_id                 UUID,
  created_at            TIMESTAMPTZ DEFAULT now(),
  created_by            UUID REFERENCES profiles(id)
);

-- Immutability trigger
CREATE OR REPLACE FUNCTION prevent_calibration_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Calibration records are immutable for traceability compliance (ISO 7.1.5.2)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calibration_immutable_upd ON calibration_records;
DROP TRIGGER IF EXISTS trg_calibration_immutable_del ON calibration_records;

CREATE TRIGGER trg_calibration_immutable_upd
  BEFORE UPDATE ON calibration_records
  FOR EACH ROW EXECUTE FUNCTION prevent_calibration_modification();

CREATE TRIGGER trg_calibration_immutable_del
  BEFORE DELETE ON calibration_records
  FOR EACH ROW EXECUTE FUNCTION prevent_calibration_modification();

-- ---------------------------------------------------------------------------
-- maintenance_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              UUID NOT NULL REFERENCES assets(id),
  org_id                UUID REFERENCES organizations(id),
  maintenance_type      maintenance_type NOT NULL,
  status                maintenance_status DEFAULT 'SCHEDULED',
  scheduled_date        DATE,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  performed_by          UUID REFERENCES profiles(id),
  external_provider     TEXT,
  description           TEXT,
  work_performed        TEXT,
  parts_replaced        TEXT[],
  cost                  NUMERIC(10,2),
  currency              TEXT DEFAULT 'EUR',
  next_maintenance_date DATE,
  findings              TEXT,
  nc_id                 UUID,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by            UUID REFERENCES profiles(id)
);

-- ---------------------------------------------------------------------------
-- system_updates (ISO 8.5.1 — IT system change control)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_updates (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                     UUID NOT NULL REFERENCES assets(id),
  org_id                       UUID REFERENCES organizations(id),
  update_title                 TEXT NOT NULL,
  update_version               TEXT,
  severity                     update_severity NOT NULL,
  status                       update_status DEFAULT 'AVAILABLE',
  description                  TEXT,
  release_notes                TEXT,
  vendor                       TEXT,
  cve_references               TEXT[] DEFAULT '{}',
  risk_assessment_required     BOOLEAN GENERATED ALWAYS AS (severity IN ('MAJOR', 'CRITICAL')) STORED,
  risk_assessment_completed    BOOLEAN DEFAULT false,
  risk_assessment_notes        TEXT,
  scheduled_at                 TIMESTAMPTZ,
  started_at                   TIMESTAMPTZ,
  completed_at                 TIMESTAMPTZ,
  applied_by                   UUID REFERENCES profiles(id),
  rollback_plan                TEXT,
  rollback_performed           BOOLEAN DEFAULT false,
  test_environment_validated   BOOLEAN DEFAULT false,
  downtime_minutes             INTEGER DEFAULT 0,
  created_at                   TIMESTAMPTZ DEFAULT now(),
  updated_at                   TIMESTAMPTZ DEFAULT now(),
  created_by                   UUID REFERENCES profiles(id)
);

-- ---------------------------------------------------------------------------
-- asset_competency_requirements (ISO 7.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_competency_requirements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              UUID NOT NULL REFERENCES assets(id),
  org_id                UUID REFERENCES organizations(id),
  capability_domain_id  UUID,
  minimum_level         INTEGER NOT NULL CHECK (minimum_level BETWEEN 1 AND 5),
  description           TEXT,
  is_mandatory          BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- asset_user_authorizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_user_authorizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id            UUID NOT NULL REFERENCES assets(id),
  org_id              UUID REFERENCES organizations(id),
  user_id             UUID REFERENCES profiles(id),
  authorized_by       UUID REFERENCES profiles(id),
  valid_from          DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until         DATE,
  authorization_level TEXT DEFAULT 'OPERATOR',
  notes               TEXT,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, user_id, authorization_level)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_calibration_due ON assets(next_calibration_due) WHERE requires_calibration = true;
CREATE INDEX IF NOT EXISTS idx_assets_maintenance_due ON assets(next_maintenance_due) WHERE requires_maintenance = true;
CREATE INDEX IF NOT EXISTS idx_calibration_records_asset ON calibration_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_calibration_records_date ON calibration_records(calibration_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_asset ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_system_updates_asset ON system_updates(asset_id);
CREATE INDEX IF NOT EXISTS idx_system_updates_status ON system_updates(status);
CREATE INDEX IF NOT EXISTS idx_asset_authorizations_user ON asset_user_authorizations(user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_competency_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_user_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_org_isolation" ON assets USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "calibration_records_org_isolation" ON calibration_records USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "maintenance_records_org_isolation" ON maintenance_records USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "system_updates_org_isolation" ON system_updates USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "asset_competency_org_isolation" ON asset_competency_requirements USING (org_id = current_setting('app.org_id', true)::uuid);
CREATE POLICY "asset_auth_org_isolation" ON asset_user_authorizations USING (org_id = current_setting('app.org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_calibration_status AS
SELECT
  a.id AS asset_id,
  a.org_id,
  a.asset_number,
  a.name,
  a.serial_number,
  a.next_calibration_due,
  a.last_calibrated_at,
  a.status,
  cr.result AS last_result,
  cr.certificate_number,
  cr.performed_by AS last_performed_by,
  (a.next_calibration_due - CURRENT_DATE) AS days_until_due,
  (a.next_calibration_due < CURRENT_DATE) AS is_overdue
FROM assets a
LEFT JOIN LATERAL (
  SELECT result, certificate_number, performed_by
  FROM calibration_records
  WHERE asset_id = a.id
  ORDER BY calibration_date DESC
  LIMIT 1
) cr ON true
WHERE a.requires_calibration = true
  AND a.status NOT IN ('DECOMMISSIONED', 'DISPOSED');

CREATE OR REPLACE VIEW v_maintenance_due AS
SELECT
  a.id AS asset_id,
  a.org_id,
  a.asset_number,
  a.name,
  a.next_maintenance_due,
  a.last_maintained_at,
  a.department,
  (CURRENT_DATE - a.next_maintenance_due) AS days_overdue,
  (a.next_maintenance_due - CURRENT_DATE) AS days_until_due,
  (a.next_maintenance_due < CURRENT_DATE) AS is_overdue
FROM assets a
WHERE a.requires_maintenance = true
  AND a.next_maintenance_due IS NOT NULL
  AND a.next_maintenance_due <= CURRENT_DATE + INTERVAL '30 days'
  AND a.status NOT IN ('DECOMMISSIONED', 'DISPOSED', 'UNDER_MAINTENANCE')
ORDER BY a.next_maintenance_due;

CREATE OR REPLACE VIEW v_asset_summary AS
SELECT
  org_id,
  asset_type,
  status,
  COUNT(*) AS count,
  SUM(purchase_cost) AS total_purchase_cost,
  SUM(current_value) AS total_current_value,
  currency
FROM assets
WHERE status != 'DISPOSED'
GROUP BY org_id, asset_type, status, currency;

CREATE OR REPLACE VIEW v_system_update_status AS
SELECT
  a.id AS asset_id,
  a.org_id,
  a.asset_number,
  a.name,
  su.id AS update_id,
  su.update_title,
  su.severity,
  su.status AS update_status,
  su.risk_assessment_required,
  su.risk_assessment_completed,
  su.cve_references,
  su.created_at
FROM assets a
JOIN system_updates su ON su.asset_id = a.id
WHERE a.is_it_system = true
  AND su.status IN ('AVAILABLE', 'IN_PROGRESS', 'FAILED')
ORDER BY
  CASE su.severity WHEN 'CRITICAL' THEN 1 WHEN 'MAJOR' THEN 2 WHEN 'MINOR' THEN 3 ELSE 4 END,
  su.created_at;

-- ---------------------------------------------------------------------------
-- ISO Compliance seed
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO compliance_requirements (id, clause, title, description, category, status)
  VALUES
    (gen_random_uuid(), '7.1.3', 'Infrastructure', 'Organization shall determine, provide and maintain the infrastructure necessary for the operation of its processes', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), '7.1.5.1', 'Measurement traceability', 'Measuring equipment shall be calibrated or verified at specified intervals against measurement standards traceable to international standards', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), '7.1.5.2', 'Calibration records', 'Organization shall retain documented information as evidence of fitness for purpose of monitoring and measurement resources', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), '8.5.1(d)', 'Use of suitable infrastructure', 'Organization shall implement the use of suitable infrastructure for the operation of its processes', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), '8.5.1(e)', 'Use of measuring resources', 'Organization shall implement the use of competent persons, including any required qualification', 'OPERATION', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'compliance_requirements table not found, skipping ISO seed';
END $$;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO assets (org_id, name, description, asset_type, status, manufacturer, requires_calibration, calibration_interval_days, next_calibration_due, criticality_level, iso_clause)
  VALUES (v_org_id, 'Kalibrerad mätutrustning', 'Precisionstemperaturmätare', 'MEASURING_INSTRUMENT', 'ACTIVE', 'Fluke', true, 365, CURRENT_DATE + 180, 4, ARRAY['7.1.5.1','7.1.5.2'])
  ON CONFLICT DO NOTHING;

  INSERT INTO assets (org_id, name, description, asset_type, status, manufacturer, requires_maintenance, maintenance_interval_days, next_maintenance_due, criticality_level, iso_clause)
  VALUES (v_org_id, 'CNC Maskin', 'CNC-fräsmaskin för produktion', 'EQUIPMENT', 'ACTIVE', 'DMG Mori', true, 90, CURRENT_DATE + 45, 4, ARRAY['7.1.3','8.5.1'])
  ON CONFLICT DO NOTHING;

  INSERT INTO assets (org_id, name, description, asset_type, status, manufacturer, is_it_system, criticality_level, iso_clause)
  VALUES (v_org_id, 'Produktionsserver', 'Primär applikationsserver', 'IT_SYSTEM', 'ACTIVE', 'Dell', true, 5, ARRAY['7.1.3','8.5.1'])
  ON CONFLICT DO NOTHING;

  INSERT INTO assets (org_id, name, description, asset_type, status, requires_maintenance, maintenance_interval_days, next_maintenance_due, criticality_level)
  VALUES (v_org_id, 'Kontorsprinter', 'Nätverksskrivare kontorsplan', 'EQUIPMENT', 'ACTIVE', true, 365, CURRENT_DATE + 200, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO assets (org_id, name, description, asset_type, status, criticality_level)
  VALUES (v_org_id, 'Företagsbil', 'Tjänstebil för fältpersonal', 'VEHICLE', 'ACTIVE', 2)
  ON CONFLICT DO NOTHING;

  INSERT INTO assets (org_id, name, description, asset_type, status, is_it_system, manufacturer, criticality_level, iso_clause)
  VALUES (v_org_id, 'ERP-system', 'Affärssystem (Fortnox)', 'SOFTWARE_LICENSE', 'ACTIVE', true, 'Fortnox', 5, ARRAY['7.1.3'])
  ON CONFLICT DO NOTHING;

  INSERT INTO assets (org_id, name, description, asset_type, status, requires_maintenance, maintenance_interval_days, next_maintenance_due, criticality_level, iso_clause)
  VALUES (v_org_id, 'Klimatkontrollsystem', 'HVAC för serverrum', 'INFRASTRUCTURE', 'ACTIVE', true, 180, CURRENT_DATE + 60, 5, ARRAY['7.1.3','7.1.4'])
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Asset seed failed: %', SQLERRM;
END $$;
