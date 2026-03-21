-- ============================================================================
-- pixdrift DMS Schema — v1.0
-- Fordonshantering, Verkstad, Reservdelar, Bilförsäljning, CSI, OEM
-- Regulatorisk bas: GDPR, KköpL 2022:260, KkrL 2010:1846, ML 2023:200
-- ============================================================================

-- Fordonsregister (ISO 3779 VIN)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  vin TEXT NOT NULL UNIQUE,
  registration_number TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  model_year INTEGER,
  color_code TEXT,
  interior_code TEXT,
  engine_code TEXT,
  fuel_type TEXT CHECK (fuel_type IN ('BEV','PHEV','HEV','ICE_PETROL','ICE_DIESEL','HYDROGEN','MILD_HYBRID')),
  transmission TEXT CHECK (transmission IN ('AUTO','MANUAL','CVT')),
  drive TEXT CHECK (drive IN ('FWD','RWD','AWD','4WD')),
  odometer_km INTEGER DEFAULT 0,
  condition TEXT CHECK (condition IN ('NEW','USED','DEMO','EXCHANGE','LOANER')) DEFAULT 'NEW',
  status TEXT CHECK (status IN ('IN_STOCK','ORDERED','IN_TRANSIT','RESERVED','SOLD','LOANER','SCRAPPED')) DEFAULT 'IN_STOCK',
  location TEXT,
  list_price DECIMAL(12,2),
  dealer_cost DECIMAL(12,2),   -- konfidentiellt, ej synligt för kunder
  equipment_codes TEXT[],
  equipment_text TEXT,
  arrival_date DATE,
  purchase_date DATE,
  sold_date DATE,
  last_odometer_update TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_org_status ON vehicles(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model, condition);
CREATE INDEX IF NOT EXISTS idx_vehicles_sold_date ON vehicles(sold_date) WHERE sold_date IS NOT NULL;

-- Arbetsorder (Verkstad)
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  order_number TEXT UNIQUE NOT NULL,   -- WO-2026-001234
  customer_id UUID REFERENCES contacts(id),
  vehicle_vin TEXT,
  vehicle_reg TEXT,
  work_type TEXT NOT NULL CHECK (work_type IN ('SERVICE','REPAIR','RECALL','WARRANTY','PDI','BODYWORK','TIRES','INSPECTION')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_PARTS','WAITING_CUSTOMER','READY','INVOICED','CLOSED')),
  description TEXT,
  technician_id UUID REFERENCES users(id),
  bay_number INTEGER,
  promised_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  warranty_claim BOOLEAN DEFAULT false,
  recall_number TEXT,
  internal_notes TEXT,
  customer_notes TEXT,
  estimated_hours DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_org ON work_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_vin ON work_orders(vehicle_vin);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(technician_id, promised_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(customer_id);

-- Arbetsorderrader
CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('labor','part','sublet','oil')) NOT NULL,
  part_number TEXT,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  vat_rate INTEGER DEFAULT 25,  -- ML 2023:200 — 25% moms
  warranty_covered BOOLEAN DEFAULT false,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_items_wo ON work_order_items(work_order_id);

-- Tidsregistrering (mekaniker)
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES work_orders(id),
  technician_id UUID REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  hours_worked DECIMAL(5,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservdelslager
CREATE TABLE IF NOT EXISTS parts_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  part_number TEXT NOT NULL,
  description TEXT NOT NULL,
  make TEXT,
  quantity_on_hand DECIMAL(10,2) DEFAULT 0,
  quantity_reserved DECIMAL(10,2) DEFAULT 0,
  quantity_on_order DECIMAL(10,2) DEFAULT 0,
  min_quantity DECIMAL(10,2) DEFAULT 2,
  location TEXT,             -- Hyllplats, t.ex. "B-12-3"
  cost_price DECIMAL(10,2),
  list_price DECIMAL(10,2),
  supplier TEXT,
  last_order_date DATE,
  last_received_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, part_number)
);

CREATE INDEX IF NOT EXISTS idx_parts_org ON parts_inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_parts_low_stock ON parts_inventory(org_id) WHERE quantity_on_hand < min_quantity;

-- Offert (bilförsäljning)
CREATE TABLE IF NOT EXISTS vehicle_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  quote_number TEXT UNIQUE NOT NULL,   -- Q-2026-001234
  customer_id UUID REFERENCES contacts(id),
  sales_person_id UUID REFERENCES users(id),
  vehicle_vin TEXT,
  vehicle_spec JSONB,          -- Fabriksorder-spec
  trade_in_vin TEXT,
  trade_in_value DECIMAL(12,2),
  financing_type TEXT CHECK (financing_type IN ('CASH','LOAN','LEASING','PRIVATE_LEASE')),
  financing_details JSONB,     -- Inkl. ÅRKR per KkrL
  accessories JSONB,
  discounts JSONB,
  list_price DECIMAL(12,2),
  net_price DECIMAL(12,2),
  monthly_payment DECIMAL(10,2),
  effective_rate DECIMAL(6,4),  -- ÅRKR (effektiv ränta per KkrL 2010:1846)
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','ACCEPTED','DECLINED','EXPIRED')),
  valid_until DATE,
  accepted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_org ON vehicle_quotes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON vehicle_quotes(customer_id);

-- Köpekontrakt
CREATE TABLE IF NOT EXISTS vehicle_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  contract_number TEXT UNIQUE NOT NULL,   -- KT-2026-001234
  quote_id UUID REFERENCES vehicle_quotes(id),
  customer_id UUID REFERENCES contacts(id),
  vehicle_vin TEXT,
  signing_method TEXT CHECK (signing_method IN ('physical','bankid','digital')),
  signed_at TIMESTAMPTZ,
  signed_by_customer TEXT,     -- Signatur-referens (BankID/Scrive)
  delivered_at TIMESTAMPTZ,
  delivery_technician_id UUID REFERENCES users(id),
  delivery_odometer INTEGER,
  delivery_fuel_level DECIMAL(5,2),
  delivery_notes TEXT,
  warranty_expires DATE,       -- KköpL 2022:260 — 3 år från leverans
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantiärenden
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  claim_number TEXT UNIQUE NOT NULL,
  work_order_id UUID REFERENCES work_orders(id),
  vehicle_vin TEXT NOT NULL,
  failure_date DATE,
  failure_description TEXT NOT NULL,
  diagnosis TEXT,
  parts_replaced JSONB,
  labor_hours DECIMAL(5,2),
  claim_amount DECIMAL(10,2),
  oem_reference TEXT,          -- OEM:s ärendenummer
  status TEXT DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','IN_REVIEW','APPROVED','PARTIALLY_APPROVED','REJECTED')),
  approved_amount DECIMAL(10,2),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_warranty_org ON warranty_claims(org_id, status);
CREATE INDEX IF NOT EXISTS idx_warranty_vin ON warranty_claims(vehicle_vin);

-- Återkallelser (Recalls)
CREATE TABLE IF NOT EXISTS recalls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  recall_number TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  description TEXT,
  affected_vins TEXT[],        -- VINs på detta lager
  remedy TEXT,
  parts_required TEXT[],
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
  issued_date DATE,
  deadline_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recalls_org ON recalls(org_id, status);
CREATE INDEX IF NOT EXISTS idx_recalls_manufacturer ON recalls(manufacturer);

-- Kundfordon (kund ↔ fordon-historia)
CREATE TABLE IF NOT EXISTS customer_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES contacts(id),
  org_id UUID REFERENCES organizations(id),
  vin TEXT,
  registration_number TEXT,
  make TEXT,
  model TEXT,
  model_year INTEGER,
  owned_since DATE,
  owned_until DATE,
  is_current BOOLEAN DEFAULT true,
  purchase_type TEXT CHECK (purchase_type IN ('new_at_dealer','used_at_dealer','private','trade_in')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer ON customer_vehicles(customer_id, is_current);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_vin ON customer_vehicles(vin);

-- CSI-undersökningar
CREATE TABLE IF NOT EXISTS csi_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  customer_id UUID REFERENCES contacts(id),
  transaction_type TEXT CHECK (transaction_type IN ('SALES','SERVICE')) NOT NULL,
  transaction_id UUID,         -- work_order_id eller contract_id
  score INTEGER CHECK (score BETWEEN 1 AND 10),
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  comments TEXT,
  surveyed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csi_org ON csi_surveys(org_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_csi_customer ON csi_surveys(customer_id);

-- OEM KPI-data (månadsrapportering till generalagenter)
CREATE TABLE IF NOT EXISTS oem_kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  manufacturer TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  kpi_type TEXT CHECK (kpi_type IN ('sales_volume','csi_score','warranty_cost','fin_penetration','recall_completion')),
  value DECIMAL(12,4),
  target DECIMAL(12,4),
  submitted_at TIMESTAMPTZ,
  UNIQUE(org_id, manufacturer, period_year, period_month, kpi_type)
);

CREATE INDEX IF NOT EXISTS idx_oem_kpis_org ON oem_kpis(org_id, manufacturer, period_year, period_month);

-- Test-drives
CREATE TABLE IF NOT EXISTS test_drives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  customer_id UUID REFERENCES contacts(id),
  vehicle_vin TEXT,
  sales_person_id UUID REFERENCES users(id),
  scheduled_time TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'BOOKED' CHECK (status IN ('BOOKED','COMPLETED','NO_SHOW','CANCELLED')),
  outcome TEXT,                -- 'INTERESTED','QUOTE_CREATED','DECLINED'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_drives_org ON test_drives(org_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_test_drives_customer ON test_drives(customer_id);

-- Row Level Security (RLS) — multi-tenant isolering
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE csi_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE oem_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_drives ENABLE ROW LEVEL SECURITY;

-- RLS policies (org-isolering)
DO $$ BEGIN
  -- Vehicles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicles' AND policyname='vehicles_org_isolation') THEN
    CREATE POLICY vehicles_org_isolation ON vehicles USING (org_id = current_setting('app.current_org_id', true)::UUID);
  END IF;
  -- Work Orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_orders' AND policyname='work_orders_org_isolation') THEN
    CREATE POLICY work_orders_org_isolation ON work_orders USING (org_id = current_setting('app.current_org_id', true)::UUID);
  END IF;
  -- Parts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parts_inventory' AND policyname='parts_org_isolation') THEN
    CREATE POLICY parts_org_isolation ON parts_inventory USING (org_id = current_setting('app.current_org_id', true)::UUID);
  END IF;
  -- Quotes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_quotes' AND policyname='quotes_org_isolation') THEN
    CREATE POLICY quotes_org_isolation ON vehicle_quotes USING (org_id = current_setting('app.current_org_id', true)::UUID);
  END IF;
  -- Warranty
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='warranty_claims' AND policyname='warranty_org_isolation') THEN
    CREATE POLICY warranty_org_isolation ON warranty_claims USING (org_id = current_setting('app.current_org_id', true)::UUID);
  END IF;
  -- OEM KPIs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='oem_kpis' AND policyname='oem_kpis_org_isolation') THEN
    CREATE POLICY oem_kpis_org_isolation ON oem_kpis USING (org_id = current_setting('app.current_org_id', true)::UUID);
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vehicles_updated_at') THEN
    CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_work_orders_updated_at') THEN
    CREATE TRIGGER set_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_quotes_updated_at') THEN
    CREATE TRIGGER set_quotes_updated_at BEFORE UPDATE ON vehicle_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── Kommentar: Deploy ──────────────────────────────────────────────────────────
-- Kör mot Supabase via: supabase db push (lokal) eller SQL Editor (hosted)
-- Lägg till i sql/deploy_all.sql: \i sql/32_dms_schema.sql
