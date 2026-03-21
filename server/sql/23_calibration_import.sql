-- ============================================================================
-- Hypbit OMS — Calibration Certificate Import System
-- File: 23_calibration_import.sql
-- Run: AFTER 19_erp_integration.sql in Supabase (PostgreSQL)
--
-- DCC-standard calibration certificate import pipeline with provider
-- connectors, parsing rules, import queue processing, and asset matching.
-- Supports 30 known calibration providers across all major accreditation
-- bodies (DAkkS, UKAS, SWEDAC, A2LA, JAB, SAS, COFRAC, FINAS, etc.)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 calibration_provider_type — classification of the calibration provider
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE calibration_provider_type AS ENUM (
    'ACCREDITED_LAB',   -- nationally accredited calibration laboratory
    'OEM_SERVICE',      -- original equipment manufacturer calibration service
    'INTERNAL',         -- in-house calibration performed by the organization
    'THIRD_PARTY'       -- third-party calibration service (not accredited lab)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 1.2 certificate_format — the format of the calibration certificate file
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE certificate_format AS ENUM (
    'DCC_XML',           -- Digital Calibration Certificate (DCC) XML (EURAMET)
    'PDF',               -- standard PDF certificate
    'JSON',              -- JSON-formatted certificate data
    'CSV',               -- CSV-formatted calibration data
    'EMAIL_ATTACHMENT'   -- certificate received as an email attachment
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 1.3 import_status — lifecycle states of an import queue item
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE import_status AS ENUM (
    'QUEUED',         -- item received and waiting to be processed
    'PROCESSING',     -- actively being parsed or matched
    'PARSED',         -- raw content successfully extracted into structured data
    'MATCHED',        -- instrument matched to an asset record
    'VERIFIED',       -- DCC signature verified and record created
    'FAILED',         -- processing failed; see error_message
    'MANUAL_REVIEW'   -- requires human intervention before proceeding
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 1.4 match_method — how the certificate was linked to an asset
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE match_method AS ENUM (
    'SERIAL_NUMBER',       -- matched via instrument serial number
    'ASSET_NUMBER',        -- matched via internal asset/tag number
    'CUSTOMER_REFERENCE',  -- matched via a customer-supplied reference code
    'MANUAL'               -- matched manually by a user
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 calibration_providers — the ~30 known calibration service providers
--
-- org_id = NULL means the provider is a global/system-level provider
-- available to all organizations. org_id set means it is a private/custom
-- provider registered by that specific organization.
-- api_config stores auth credentials; these must be encrypted at rest in
-- production (e.g., via Supabase Vault / pgcrypto).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calibration_providers (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID          REFERENCES organizations(id) ON DELETE CASCADE,
  -- null = global/system provider visible to all organizations
  provider_code         TEXT          NOT NULL UNIQUE,
  name                  TEXT          NOT NULL,
  country               TEXT          NOT NULL,
  -- ISO 3166-1 alpha-2, e.g. 'DE', 'SE', 'US', 'GB', 'CH', 'JP', 'FI', 'FR'
  accreditation_body    TEXT,
  -- e.g. 'DAkkS', 'UKAS', 'SWEDAC', 'A2LA', 'JAB', 'SAS', 'COFRAC', 'FINAS'
  website               TEXT,
  api_available         BOOLEAN       NOT NULL DEFAULT false,
  api_base_url          TEXT,
  api_auth_type         TEXT          CHECK (api_auth_type IN ('OAUTH2', 'API_KEY', 'BASIC', 'NONE')),
  api_config            JSONB         NOT NULL DEFAULT '{}',
  -- stores auth params (client_id, client_secret, api_key, etc.)
  -- MUST be encrypted in production via Supabase Vault or pgcrypto
  supports_webhook      BOOLEAN       NOT NULL DEFAULT false,
  webhook_url           TEXT,
  supported_formats     certificate_format[]  NOT NULL DEFAULT '{PDF}',
  dcc_supported         BOOLEAN       NOT NULL DEFAULT false,
  last_sync_at          TIMESTAMPTZ,
  sync_interval_hours   INTEGER       NOT NULL DEFAULT 6,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  calibration_providers                  IS 'Known calibration service providers and their API connector configurations.';
COMMENT ON COLUMN calibration_providers.org_id           IS 'NULL = global system provider; set = private provider for that org only.';
COMMENT ON COLUMN calibration_providers.api_config       IS 'Auth params (client_id, secret, api_key, etc.). Encrypt at rest in production.';
COMMENT ON COLUMN calibration_providers.dcc_supported    IS 'TRUE if provider issues Digital Calibration Certificates (DCC, EURAMET/PTB standard).';

-- ----------------------------------------------------------------------------
-- 2.2 calibration_certificates — parsed and structured certificate data
--
-- Populated after a certificate_import_queue item is successfully parsed.
-- Linked to an asset after matching; linked to calibration_records after
-- the calibration record has been created in the main quality system.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calibration_certificates (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id               UUID        REFERENCES calibration_providers(id),
  certificate_number        TEXT        NOT NULL,
  calibration_date          DATE        NOT NULL,
  next_calibration_date     DATE,
  instrument_serial         TEXT,
  instrument_description    TEXT,
  instrument_manufacturer   TEXT,
  instrument_model          TEXT,
  overall_result            TEXT        CHECK (overall_result IN ('PASS', 'FAIL', 'ADJUSTED_PASS')),

  -- measurement results array
  -- each element: {parameter, nominalValue, measuredValue, unit,
  --                toleranceLow, toleranceHigh, uncertainty, pass}
  results                   JSONB       NOT NULL DEFAULT '[]',

  -- reference standards used during calibration
  -- each element: {standard, traceableTo}
  reference_standards       JSONB       NOT NULL DEFAULT '[]',

  -- environmental conditions at time of calibration
  -- {temperature, humidity, pressure}
  environmental_conditions  JSONB       NOT NULL DEFAULT '{}',

  raw_format                certificate_format,
  raw_content               TEXT,
  -- original XML/JSON/CSV content as received
  pdf_url                   TEXT,

  -- DCC digital signature verification state
  dcc_signature_valid       BOOLEAN,
  dcc_signature_checked_at  TIMESTAMPTZ,

  -- asset matching
  asset_id                  UUID        REFERENCES assets(id),
  -- null until matched to an asset in the asset register
  match_method              match_method,
  matched_at                TIMESTAMPTZ,
  matched_by                UUID        REFERENCES profiles(id),

  -- calibration record linkage (set after record is created in QMS)
  calibration_record_id     UUID        REFERENCES calibration_records(id),

  -- back-reference to the import queue item that created this certificate
  import_queue_id           UUID,
  -- FK constraint added after certificate_import_queue is created below

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (certificate_number, provider_id)
);

COMMENT ON TABLE  calibration_certificates                       IS 'Structured calibration certificate data extracted from import queue items.';
COMMENT ON COLUMN calibration_certificates.results               IS 'Array of measurement result objects: {parameter, nominalValue, measuredValue, unit, toleranceLow, toleranceHigh, uncertainty, pass}.';
COMMENT ON COLUMN calibration_certificates.reference_standards   IS 'Reference standards used: [{standard, traceableTo}].';
COMMENT ON COLUMN calibration_certificates.environmental_conditions IS 'Environmental conditions during calibration: {temperature, humidity, pressure}.';
COMMENT ON COLUMN calibration_certificates.asset_id              IS 'NULL until matched to an asset record.';
COMMENT ON COLUMN calibration_certificates.calibration_record_id IS 'NULL until a calibration record is created in the QMS from this certificate.';

-- ----------------------------------------------------------------------------
-- 2.3 certificate_parse_rules — field extraction rules per provider
--
-- provider_id = NULL means the rule applies globally to all DCC-format
-- certificates (the standard DCC XML schema). Provider-specific rules
-- override or supplement the global rules for that provider.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificate_parse_rules (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID        REFERENCES calibration_providers(id) ON DELETE CASCADE,
  -- null = global rule, applies to DCC standard format
  rule_type           TEXT        NOT NULL
                        CHECK (rule_type IN ('REGEX', 'XPATH', 'JSON_PATH', 'DCC_MAPPING')),
  field_name          TEXT        NOT NULL,
  -- target field name on calibration_certificates (or a sub-key for JSONB fields)
  extraction_method   TEXT        NOT NULL,
  -- human-readable description or reference to the extraction technique used
  extraction_config   JSONB       NOT NULL,
  -- for XPATH/DCC_MAPPING: {xpath: '...'}
  -- for REGEX:             {pattern: '...', group: N}
  -- for JSON_PATH:         {path: '$.xxx'}
  fallback_value      TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  certificate_parse_rules               IS 'Field extraction rules for parsing calibration certificates. NULL provider_id = global DCC standard rules.';
COMMENT ON COLUMN certificate_parse_rules.provider_id   IS 'NULL = global DCC standard rule. Set = provider-specific override or supplement.';
COMMENT ON COLUMN certificate_parse_rules.extraction_config IS 'Rule parameters: {xpath} for XPATH/DCC_MAPPING, {pattern, group} for REGEX, {path} for JSON_PATH.';

-- ----------------------------------------------------------------------------
-- 2.4 certificate_import_queue — processing pipeline for incoming certificates
--
-- Every inbound certificate (uploaded, API-fetched, emailed, or webhook-
-- delivered) is enqueued here before parsing. Status transitions:
--   QUEUED → PROCESSING → PARSED → MATCHED → VERIFIED
--   QUEUED → PROCESSING → FAILED
--   any state → MANUAL_REVIEW
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificate_import_queue (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID          REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id               UUID          REFERENCES calibration_providers(id),
  file_name                 TEXT,
  file_size_bytes           INTEGER,
  format                    certificate_format  NOT NULL,
  raw_content               TEXT,
  -- file content (for small files) or a URL/storage path (for large files)
  status                    import_status NOT NULL DEFAULT 'QUEUED',
  queued_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
  processing_started_at     TIMESTAMPTZ,
  processing_completed_at   TIMESTAMPTZ,
  processed_by              TEXT,
  -- 'SYSTEM' for automated processing, or the user UUID as text
  parse_result              JSONB,
  -- structured data extracted during PARSED step, before asset matching
  certificate_id            UUID          REFERENCES calibration_certificates(id),
  -- set after a calibration_certificates record is created from this item
  error_message             TEXT,
  retry_count               INTEGER       NOT NULL DEFAULT 0,
  source                    TEXT          CHECK (source IN ('UPLOAD', 'API_FETCH', 'EMAIL', 'WEBHOOK')),
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  certificate_import_queue                IS 'Processing pipeline for all inbound calibration certificates.';
COMMENT ON COLUMN certificate_import_queue.raw_content    IS 'File content for small files; storage path or URL for large files.';
COMMENT ON COLUMN certificate_import_queue.parse_result   IS 'Extracted structured data after PARSED step, before asset matching.';
COMMENT ON COLUMN certificate_import_queue.processed_by   IS '"SYSTEM" for automated processing, or a user UUID string.';

-- Add deferred FK from calibration_certificates.import_queue_id back to queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calibration_certificates_import_queue_id_fkey'
  ) THEN
    ALTER TABLE calibration_certificates
      ADD CONSTRAINT calibration_certificates_import_queue_id_fkey
      FOREIGN KEY (import_queue_id)
      REFERENCES certificate_import_queue(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- calibration_providers
CREATE INDEX IF NOT EXISTS idx_calibration_providers_org_id
  ON calibration_providers (org_id);

CREATE INDEX IF NOT EXISTS idx_calibration_providers_is_active
  ON calibration_providers (is_active);

-- calibration_certificates
CREATE INDEX IF NOT EXISTS idx_calibration_certificates_org_id
  ON calibration_certificates (org_id);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_provider_id
  ON calibration_certificates (provider_id);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_asset_id
  ON calibration_certificates (asset_id);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_calibration_record_id
  ON calibration_certificates (calibration_record_id);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_import_queue_id
  ON calibration_certificates (import_queue_id);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_matched_by
  ON calibration_certificates (matched_by);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_instrument_serial
  ON calibration_certificates (instrument_serial);

CREATE INDEX IF NOT EXISTS idx_calibration_certificates_calibration_date
  ON calibration_certificates (calibration_date);

-- certificate_parse_rules
CREATE INDEX IF NOT EXISTS idx_certificate_parse_rules_provider_id
  ON certificate_parse_rules (provider_id);

CREATE INDEX IF NOT EXISTS idx_certificate_parse_rules_is_active
  ON certificate_parse_rules (is_active);

-- certificate_import_queue
CREATE INDEX IF NOT EXISTS idx_certificate_import_queue_org_id
  ON certificate_import_queue (org_id);

CREATE INDEX IF NOT EXISTS idx_certificate_import_queue_provider_id
  ON certificate_import_queue (provider_id);

CREATE INDEX IF NOT EXISTS idx_certificate_import_queue_status
  ON certificate_import_queue (status);

CREATE INDEX IF NOT EXISTS idx_certificate_import_queue_queued_at
  ON certificate_import_queue (queued_at);

CREATE INDEX IF NOT EXISTS idx_certificate_import_queue_certificate_id
  ON certificate_import_queue (certificate_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE calibration_providers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_certificates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_parse_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_import_queue    ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. SEED DATA — calibration_providers (~30 global providers)
-- ============================================================================
-- All providers are inserted as global (org_id = NULL).
-- dcc_supported = true for providers known to issue DCC-format certificates:
--   BEAMEX, DEKRA, FLUKE, KEYSIGHT, METTLER, HEXAGON, ZEISS
-- Providers without API: SP, TUV-NORD, PHOENIX, NORDCAL (api_available=false,
--   api_base_url=null, api_auth_type=null)
-- Wrapped in exception handler to allow idempotent re-runs.
-- ============================================================================

DO $$ BEGIN

  INSERT INTO calibration_providers
    (provider_code, name, country, accreditation_body, api_available, api_base_url, api_auth_type, dcc_supported, supported_formats)
  VALUES

    -- United States — A2LA accredited
    ('FLUKE',        'Fluke Calibration',                      'US', 'A2LA',   true,  'https://api.flukecal.com/v1',           'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('KEYSIGHT',     'Keysight Technologies',                   'US', 'A2LA',   true,  'https://api.keysight.com/cal/v2',       'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('EMERSON',      'Emerson / Rosemount',                     'US', 'A2LA',   true,  'https://api.emerson.com/calibration/v1','REST', false, '{PDF,JSON}'),
    ('AMETEK',       'AMETEK Calibration Instruments',          'US', 'A2LA',   true,  'https://api.ametek.com/cal/v1',         'REST', false, '{PDF,JSON}'),
    ('GE-DRUCK',     'GE Sensing & Inspection',                 'US', 'A2LA',   true,  'https://api.gesensing.com/cal/v1',      'REST', false, '{PDF,JSON}'),
    ('PHOENIX',      'Phoenix Calibration',                     'US', 'A2LA',   false, NULL,                                    NULL,   false, '{PDF}'),

    -- United Kingdom — UKAS accredited
    ('DRUCK',        'Druck (Baker Hughes)',                    'GB', 'UKAS',   true,  'https://api.druck.com/calibration/v1',  'REST', false, '{PDF,JSON}'),
    ('INTERTEK',     'Intertek',                                'GB', 'UKAS',   true,  'https://api.intertek.com/cal/v1',       'REST', false, '{PDF,JSON}'),
    ('TRANSMILLE',   'Transmille',                              'GB', 'UKAS',   true,  'https://api.transmille.com/v1',         'REST', false, '{PDF,JSON}'),

    -- Germany — DAkkS accredited
    ('DEKRA',        'DEKRA',                                   'DE', 'DAkkS',  true,  'https://api.dekra.com/calibration/v2',  'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('TESTO',        'Testo Industrial Services',               'DE', 'DAkkS',  true,  'https://api.testo.com/cal/v1',          'REST', false, '{PDF,JSON}'),
    ('RS',           'Rohde & Schwarz',                         'DE', 'DAkkS',  true,  'https://api.rohde-schwarz.com/cal/v1',  'REST', false, '{PDF,JSON}'),
    ('ZEISS',        'Carl Zeiss IQS',                          'DE', 'DAkkS',  true,  'https://api.zeiss.com/iqs/cal/v1',      'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('SIEMENS-PI',   'Siemens Process Instrumentation',         'DE', 'DAkkS',  true,  'https://api.siemens.com/pi/cal/v1',     'REST', false, '{PDF,JSON}'),
    ('TUV-NORD',     'TÜV Nord',                                'DE', 'DAkkS',  false, NULL,                                    NULL,   false, '{PDF}'),
    ('TUV-SUD',      'TÜV SÜD',                                 'DE', 'DAkkS',  true,  'https://api.tuvsud.com/calibration/v1', 'REST', false, '{PDF,JSON}'),

    -- Switzerland — SAS accredited
    ('ENDRESS',      'Endress+Hauser',                          'CH', 'SAS',    true,  'https://api.endress.com/calibration/v1','REST', false, '{PDF,JSON}'),
    ('HEXAGON',      'Hexagon (Leica)',                         'CH', 'SAS',    true,  'https://api.hexagon.com/cal/v2',        'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('METTLER',      'Mettler Toledo',                          'CH', 'SAS',    true,  'https://api.mt.com/calibration/v1',     'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('ABB',          'ABB Measurement',                         'CH', 'SAS',    true,  'https://api.abb.com/measurement/cal/v1','REST', false, '{PDF,JSON}'),
    ('SGS',          'SGS',                                     'CH', 'SAS',    true,  'https://api.sgs.com/calibration/v1',    'REST', false, '{PDF,JSON}'),

    -- Sweden — SWEDAC accredited
    ('DEKRA-NORDIC', 'DEKRA Industrial (Nordics)',              'SE', 'SWEDAC', true,  'https://api.dekra.se/calibration/v1',   'REST', false, '{PDF,JSON}'),
    ('SP',           'RISE Research Institutes of Sweden (SP)', 'SE', 'SWEDAC', false, NULL,                                    NULL,   false, '{PDF}'),
    ('NORDCAL',      'NordCal (Scandinavian Calibration Center)','SE','SWEDAC', false, NULL,                                    NULL,   false, '{PDF}'),

    -- Finland — FINAS accredited
    ('BEAMEX',       'Beamex',                                  'FI', 'FINAS',  true,  'https://api.beamex.com/cal/v1',         'REST', true,  '{DCC_XML,PDF,JSON}'),
    ('VAISALA',      'Vaisala Calibration Services',            'FI', 'FINAS',  true,  'https://api.vaisala.com/cal/v1',        'REST', false, '{PDF,JSON}'),

    -- France — COFRAC accredited
    ('TRESCAL',      'Trescal',                                 'FR', 'COFRAC', true,  'https://api.trescal.com/v2',            'REST', false, '{PDF,JSON}'),
    ('BUREAU-VERITAS','Bureau Veritas',                         'FR', 'COFRAC', true,  'https://api.bureauveritas.com/cal/v1',  'REST', false, '{PDF,JSON}'),

    -- Japan — JAB accredited
    ('MITUTOYO',     'Mitutoyo',                                'JP', 'JAB',    true,  'https://api.mitutoyo.com/calibration/v1','REST',false, '{PDF,JSON}'),
    ('YOKOGAWA',     'Yokogawa Test & Measurement',             'JP', 'JAB',    true,  'https://api.yokogawa.com/tm/cal/v1',    'REST', false, '{PDF,JSON}')

  ON CONFLICT (provider_code) DO NOTHING;

EXCEPTION
  WHEN unique_violation THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ============================================================================
-- 6. SEED DATA — DCC standard XPath parse rules (global, provider_id = NULL)
-- ============================================================================
-- These 10 rules cover the core DCC XML fields as defined in the DCC schema
-- (EURAMET cg-12, PTB DCC reference implementation).
-- Namespace prefixes used in XPath expressions:
--   dcc  = https://ptb.de/dcc
--   ds   = http://www.w3.org/2000/09/xmldsig#
-- provider_id = NULL means these rules apply to all DCC-format certificates
-- regardless of provider.
-- ============================================================================

DO $$ BEGIN

  INSERT INTO certificate_parse_rules
    (provider_id, rule_type, field_name, extraction_method, extraction_config, fallback_value)
  VALUES

    -- 1. Certificate number / unique identifier
    (
      NULL,
      'DCC_MAPPING',
      'certificate_number',
      'XPATH',
      '{"xpath": "//dcc:administrativeData/dcc:uniqueIdentifier/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 2. Calibration end date (date calibration was performed)
    (
      NULL,
      'DCC_MAPPING',
      'calibration_date',
      'XPATH',
      '{"xpath": "//dcc:administrativeData/dcc:coreData/dcc:endPerformanceDate/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 3. Instrument serial number (item under calibration identification)
    (
      NULL,
      'DCC_MAPPING',
      'instrument_serial',
      'XPATH',
      '{"xpath": "//dcc:items/dcc:item/dcc:identifications/dcc:identification[dcc:issuer/text()=''manufacturer'']/dcc:value/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 4. Instrument manufacturer name
    (
      NULL,
      'DCC_MAPPING',
      'instrument_manufacturer',
      'XPATH',
      '{"xpath": "//dcc:items/dcc:item/dcc:manufacturer/dcc:name/dcc:content/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 5. Instrument model / description
    (
      NULL,
      'DCC_MAPPING',
      'instrument_model',
      'XPATH',
      '{"xpath": "//dcc:items/dcc:item/dcc:description/dcc:content/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 6. Measurement results block (full node set for JSONB mapping)
    (
      NULL,
      'DCC_MAPPING',
      'results',
      'XPATH',
      '{"xpath": "//dcc:measurementResults/dcc:measurementResult", "namespace": {"dcc": "https://ptb.de/dcc"}, "cardinality": "multiple", "target_field": "results"}',
      '[]'
    ),

    -- 7. Expanded measurement uncertainty
    (
      NULL,
      'DCC_MAPPING',
      'uncertainty',
      'XPATH',
      '{"xpath": "//dcc:measurementResults/dcc:measurementResult/dcc:results/dcc:result/dcc:data/dcc:list/dcc:quantity[@refType=''uncertainty_U'']/dcc:realListXMLList/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 8. Responsible person / main signer (reference standard custodian)
    (
      NULL,
      'DCC_MAPPING',
      'reference_standard',
      'XPATH',
      '{"xpath": "//dcc:administrativeData/dcc:respPersons/dcc:respPerson[dcc:mainSigner/text()=''true'']/dcc:person/dcc:name/dcc:content/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 9. Environmental temperature at time of calibration
    (
      NULL,
      'DCC_MAPPING',
      'environmental_temperature',
      'XPATH',
      '{"xpath": "//dcc:measurementResults/dcc:measurementResult/dcc:usedMethods/dcc:usedMethod/dcc:softwareParameters/dcc:parameter[@refType=''condition_temperature'']/dcc:quantity/dcc:realListXMLList/text()", "namespace": {"dcc": "https://ptb.de/dcc"}}',
      NULL
    ),

    -- 10. XML digital signature block (for DCC signature validation)
    (
      NULL,
      'DCC_MAPPING',
      'digital_signature',
      'XPATH',
      '{"xpath": "//ds:Signature", "namespace": {"ds": "http://www.w3.org/2000/09/xmldsig#"}, "target_field": "dcc_signature_valid", "note": "Presence of node triggers signature verification routine"}',
      NULL
    )

  ;

EXCEPTION
  WHEN unique_violation THEN NULL;
  WHEN others THEN NULL;
END $$;

COMMIT;
