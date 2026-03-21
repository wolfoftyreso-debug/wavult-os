-- ============================================================================
-- Migration 33: SAGA2 / VW Group Warranty Compatibility Fields
-- Adds mandatory SAGA2 fields to warranty_claims table
-- VW Group warranty system: SAGA2 (Service And Guarantee Administration 2)
-- ============================================================================

-- Core SAGA2 mandatory fields
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS dtc_codes TEXT[];               -- OBD/UDS DTC fault codes, e.g. ["P0301","P0302"]
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS labor_operation_codes TEXT[];   -- VW ArbNr codes, e.g. ["10-25 00 00 00"]
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS part_fault_codes TEXT[];        -- Part fault/symptom codes per SAGA2 spec
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS saga2_claim_id TEXT;            -- SAGA2 reference number (returned after submission)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS saga2_status TEXT;              -- SAGA2 processing status
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS labor_time_units DECIMAL(8,2);  -- VW AW units (1 AW = 5 minutes, not decimal hours)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS cause_code TEXT;                -- Root cause code per VW fault taxonomy
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS correction_code TEXT;           -- Correction action code per VW taxonomy

-- Additional SAGA2 fields identified in Phase 3 audit
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS complaint_code TEXT;            -- Customer complaint code (symptom from customer view)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS symptom_codes TEXT[];           -- Array of symptom codes per SAGA2 spec
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS mileage_at_repair INTEGER;      -- Odometer reading at time of repair (km)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS pr_number TEXT;                 -- VW Production Range number from factory order
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS repair_date DATE;               -- Actual date repair was performed (≠ submitted_at)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS technician_vw_id TEXT;          -- VW-registered technician number (external ID)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS saga2_xml_payload TEXT;         -- Generated SAGA2 XML for submission (stored for audit)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS saga2_submitted_at TIMESTAMPTZ; -- When claim was submitted to SAGA2
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS saga2_response JSONB;           -- Full SAGA2 response (for audit trail)

-- SAGA2 status constraint
ALTER TABLE warranty_claims DROP CONSTRAINT IF EXISTS warranty_claims_saga2_status_check;
ALTER TABLE warranty_claims ADD CONSTRAINT warranty_claims_saga2_status_check
  CHECK (saga2_status IS NULL OR saga2_status IN (
    'NOT_SUBMITTED', 'PENDING_VALIDATION', 'SUBMITTED', 'IN_REVIEW',
    'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'
  ));

-- Indexes for SAGA2 workflow
CREATE INDEX IF NOT EXISTS idx_warranty_saga2_id ON warranty_claims(saga2_claim_id) WHERE saga2_claim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_saga2_status ON warranty_claims(org_id, saga2_status) WHERE saga2_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_repair_date ON warranty_claims(repair_date) WHERE repair_date IS NOT NULL;

-- VW dealer code on organizations (prerequisite for SAGA2 submission)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS vw_dealer_code TEXT;              -- e.g. "SE-1234" — assigned by VW Group Sweden
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS volvo_dealer_code TEXT;           -- Volvo dealer number
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bmw_dealer_code TEXT;             -- BMW dealer code

-- Fault codes on work_orders (required for SAGA2 — diagnosis must be attached to WO first)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS fault_codes TEXT[];                 -- DTC codes from diagnostic scan
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS symptom_description TEXT;           -- Technician's symptom description
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS diagnostic_report JSONB;            -- Full diagnostic session data
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS elsa_operation_code TEXT;           -- ElsaPro operation code used for this WO
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quality_check_by UUID REFERENCES users(id); -- Who signed off quality check

-- VW-specific fields on vehicles (for ETKA lookups)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pr_numbers TEXT[];                     -- Production range codes (factory options)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_code_vw TEXT;                   -- VW internal engine code (e.g. "DFGA")
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gearbox_code TEXT;                     -- VW gearbox code
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS paint_code TEXT;                       -- VW paint code (e.g. "LY7W")
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS country_of_origin TEXT;               -- From VIN decode

-- VW fields on parts_inventory (for ETKA shadow)
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS oem_group_number TEXT;          -- ETKA assembly group (e.g. "10" = Engine)
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS oem_sub_group TEXT;             -- ETKA sub-group
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS superseded_by TEXT;             -- New part number if this part is superseded
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS supersedes TEXT;                -- Old part number this replaces
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2);        -- EUR price from ETKA (for VW parts)
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS etka_availability TEXT;         -- ETKA availability code
ALTER TABLE parts_inventory ADD COLUMN IF NOT EXISTS last_etka_sync TIMESTAMPTZ;     -- When last synced from ETKA

-- Audit log table (mandatory for ISO 9001 + VW certification)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(changed_by, changed_at DESC);

-- ── Deploy note ───────────────────────────────────────────────────────────────
-- Run in Supabase SQL Editor or via: supabase db push
-- No destructive changes — all ADD COLUMN IF NOT EXISTS
-- Safe to run on production
COMMENT ON TABLE audit_log IS 'Immutable audit trail — required for VW certification and ISO 9001';
COMMENT ON COLUMN warranty_claims.dtc_codes IS 'OBD/UDS DTC fault codes — mandatory for SAGA2 warranty submission';
COMMENT ON COLUMN warranty_claims.labor_operation_codes IS 'VW ArbNr codes — mandatory for SAGA2 labor line items';
COMMENT ON COLUMN warranty_claims.labor_time_units IS 'VW AW units (Arbeitszeit-Einheit, 1 AW = 5 min) — NOT decimal hours';
COMMENT ON COLUMN warranty_claims.cause_code IS 'Root cause code per VW fault taxonomy — mandatory SAGA2 field';
COMMENT ON COLUMN warranty_claims.correction_code IS 'Correction action code per VW taxonomy — mandatory SAGA2 field';
COMMENT ON COLUMN warranty_claims.saga2_xml_payload IS 'Generated SAGA2 XML stored for audit trail — never delete';
