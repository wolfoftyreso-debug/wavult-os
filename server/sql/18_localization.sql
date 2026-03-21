-- ============================================================================
-- Hypbit OMS — Internationalization & Localization
-- File: 18_localization.sql
-- Run: AFTER 16_personnel_cases.sql in Supabase (PostgreSQL)
--
-- Establishes the complete i18n/l10n layer: languages, locale profiles with
-- jurisdiction-specific formatting, translations, and custom per-org overrides.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 languages — ISO 639-1 language registry
-- Controls which languages are available system-wide for UI and content.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  code         TEXT        PRIMARY KEY,  -- ISO 639-1 (e.g. 'sv', 'en')
  name_english TEXT        NOT NULL,
  name_native  TEXT        NOT NULL,
  direction    TEXT        NOT NULL DEFAULT 'LTR'
                           CHECK (direction IN ('LTR', 'RTL')),
  is_active    BOOLEAN     DEFAULT true
);

-- ----------------------------------------------------------------------------
-- 1.2 locale_profiles — Jurisdiction-specific formatting & compliance rules
-- Each profile combines a language with a jurisdiction to define how numbers,
-- dates, currencies, tax, and legal entities are formatted and labelled.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locale_profiles (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    TEXT        UNIQUE NOT NULL,          -- e.g. 'sv-SE'
  language_code           TEXT        NOT NULL REFERENCES languages(code),
  jurisdiction_code       TEXT,                                 -- ISO 3166-1 alpha-2

  -- Number formatting
  decimal_separator       TEXT        DEFAULT '.',
  thousands_separator     TEXT        DEFAULT ',',
  number_example          TEXT        DEFAULT '1,234.56',

  -- Currency formatting
  default_currency        TEXT,
  currency_position       TEXT        DEFAULT 'BEFORE'
                                      CHECK (currency_position IN ('BEFORE', 'AFTER')),
  currency_space          BOOLEAN     DEFAULT true,

  -- Date & time formatting
  date_format             TEXT        DEFAULT 'YYYY-MM-DD',
  date_format_short       TEXT,
  date_format_long        TEXT,
  time_format             TEXT        DEFAULT 'H24'
                                      CHECK (time_format IN ('H24', 'H12')),
  first_day_of_week       TEXT        DEFAULT 'MONDAY'
                                      CHECK (first_day_of_week IN ('MONDAY', 'SUNDAY', 'SATURDAY')),
  fiscal_year_start       TEXT        DEFAULT '01-01',

  -- Measurement
  measurement_system      TEXT        DEFAULT 'METRIC'
                                      CHECK (measurement_system IN ('METRIC', 'IMPERIAL', 'MIXED')),
  temperature_unit        TEXT        DEFAULT 'CELSIUS'
                                      CHECK (temperature_unit IN ('CELSIUS', 'FAHRENHEIT')),
  paper_size              TEXT        DEFAULT 'A4'
                                      CHECK (paper_size IN ('A4', 'LETTER', 'LEGAL')),

  -- Tax / VAT
  vat_name                TEXT        DEFAULT 'VAT',
  vat_rates               JSONB       DEFAULT '{"standard": 0}',
  vat_on_invoice          BOOLEAN     DEFAULT true,
  tax_id_name             TEXT        DEFAULT 'Tax ID',
  tax_id_format           TEXT,

  -- Documents & reporting
  document_language       TEXT,
  report_language         TEXT,
  address_format          JSONB,
  name_order              TEXT        DEFAULT 'GIVEN_FAMILY'
                                      CHECK (name_order IN ('GIVEN_FAMILY', 'FAMILY_GIVEN')),
  phone_prefix            TEXT,

  -- Legal
  legal_entity_format     TEXT,
  registration_authority  TEXT,
  invoice_legal_requirements JSONB    DEFAULT '[]',

  is_active               BOOLEAN     DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.3 translations — System-wide translation strings
-- Keyed by (language_code, namespace, key). Namespace groups related strings.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS translations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT        NOT NULL REFERENCES languages(code),
  namespace     TEXT        NOT NULL,
  key           TEXT        NOT NULL,
  value         TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(language_code, namespace, key)
);

-- ----------------------------------------------------------------------------
-- 1.4 custom_translations — Per-organization translation overrides
-- Orgs can customise any system translation or add their own terminology.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_translations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,
  language_code TEXT        NOT NULL REFERENCES languages(code),
  namespace     TEXT        NOT NULL,
  key           TEXT        NOT NULL,
  value         TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, language_code, namespace, key)
);

-- ============================================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================================

-- Organizations: locale preferences
DO $$ BEGIN
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_locale    TEXT    DEFAULT 'en-US';
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS supported_locales TEXT[]  DEFAULT '{en-US}';
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reporting_locale  TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Users: personal locale preferences
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS locale      TEXT DEFAULT 'en-US';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_language TEXT DEFAULT 'en';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- languages
CREATE INDEX IF NOT EXISTS idx_languages_active
  ON languages (is_active) WHERE is_active = true;

-- locale_profiles
CREATE INDEX IF NOT EXISTS idx_locale_profiles_language_code
  ON locale_profiles (language_code);
CREATE INDEX IF NOT EXISTS idx_locale_profiles_jurisdiction_code
  ON locale_profiles (jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_locale_profiles_active
  ON locale_profiles (is_active) WHERE is_active = true;

-- translations
CREATE INDEX IF NOT EXISTS idx_translations_language_code
  ON translations (language_code);
CREATE INDEX IF NOT EXISTS idx_translations_namespace
  ON translations (namespace);
CREATE INDEX IF NOT EXISTS idx_translations_key
  ON translations (key);
CREATE INDEX IF NOT EXISTS idx_translations_ns_key
  ON translations (namespace, key);

-- custom_translations
CREATE INDEX IF NOT EXISTS idx_custom_translations_org_id
  ON custom_translations (org_id);
CREATE INDEX IF NOT EXISTS idx_custom_translations_language_code
  ON custom_translations (language_code);
CREATE INDEX IF NOT EXISTS idx_custom_translations_ns_key
  ON custom_translations (namespace, key);
CREATE INDEX IF NOT EXISTS idx_custom_translations_org_ns
  ON custom_translations (org_id, namespace);

-- ============================================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_translations ENABLE ROW LEVEL SECURITY;

-- translations: readable by all authenticated users, writable by admins
CREATE POLICY translations_select ON translations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY translations_manage ON translations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.user_id = auth.uid()
        AND 'EXECUTIVE' = ANY(org_members.roles)
    )
  );

-- custom_translations: scoped to own organization
CREATE POLICY custom_translations_select ON custom_translations
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY custom_translations_manage ON custom_translations
  FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.primary_role IN ('EXECUTIVE', 'MANAGEMENT_REPRESENTATIVE')
    )
  );

-- ============================================================================
-- 5. SEED DATA — Languages (24 ISO 639-1)
-- ============================================================================

INSERT INTO languages (code, name_english, name_native, direction) VALUES
  ('sv', 'Swedish',    'Svenska',     'LTR'),
  ('en', 'English',    'English',     'LTR'),
  ('lt', 'Lithuanian', 'Lietuvių',    'LTR'),
  ('de', 'German',     'Deutsch',     'LTR'),
  ('fr', 'French',     'Français',    'LTR'),
  ('es', 'Spanish',    'Español',     'LTR'),
  ('fi', 'Finnish',    'Suomi',       'LTR'),
  ('no', 'Norwegian',  'Norsk',       'LTR'),
  ('da', 'Danish',     'Dansk',       'LTR'),
  ('pl', 'Polish',     'Polski',      'LTR'),
  ('nl', 'Dutch',      'Nederlands',  'LTR'),
  ('it', 'Italian',    'Italiano',    'LTR'),
  ('pt', 'Portuguese', 'Português',   'LTR'),
  ('ja', 'Japanese',   '日本語',       'LTR'),
  ('zh', 'Chinese',    '中文',         'LTR'),
  ('ko', 'Korean',     '한국어',       'LTR'),
  ('ar', 'Arabic',     'العربية',     'RTL'),
  ('he', 'Hebrew',     'עברית',       'RTL'),
  ('th', 'Thai',       'ไทย',         'LTR'),
  ('hi', 'Hindi',      'हिन्दी',        'LTR'),
  ('ru', 'Russian',    'Русский',     'LTR'),
  ('uk', 'Ukrainian',  'Українська',  'LTR'),
  ('cs', 'Czech',      'Čeština',     'LTR'),
  ('et', 'Estonian',   'Eesti',       'LTR')
ON CONFLICT (code) DO UPDATE SET
  name_english = EXCLUDED.name_english,
  name_native  = EXCLUDED.name_native,
  direction    = EXCLUDED.direction;

-- ============================================================================
-- 6. SEED DATA — Locale Profiles (9 jurisdictions)
-- ============================================================================

INSERT INTO locale_profiles (
  code, language_code, jurisdiction_code,
  decimal_separator, thousands_separator, number_example,
  default_currency, currency_position, currency_space,
  date_format, date_format_short, date_format_long,
  time_format, first_day_of_week, fiscal_year_start,
  measurement_system, temperature_unit, paper_size,
  vat_name, vat_rates, vat_on_invoice, tax_id_name, tax_id_format,
  document_language, report_language,
  address_format, name_order, phone_prefix,
  legal_entity_format, registration_authority, invoice_legal_requirements
) VALUES

-- sv-SE: Swedish / Sweden
(
  'sv-SE', 'sv', 'SE',
  ',', ' ', '1 234,56',
  'SEK', 'AFTER', true,
  'YYYY-MM-DD', 'DD/MM', 'D MMMM YYYY', 'H24', 'MONDAY', '01-01',
  'METRIC', 'CELSIUS', 'A4',
  'Moms', '{"standard": 25, "reduced": 12, "low": 6}', true,
  'Org.nr', '######-####',
  'sv', 'sv',
  '{"format": ["name", "street", "postal_code city", "country"]}',
  'GIVEN_FAMILY', '+46',
  'AB', 'Bolagsverket',
  '["Organisationsnummer måste anges", "Momsregistreringsnummer (SE + org.nr + 01)", "F-skattsedel status", "Betalningsvillkor"]'
),

-- en-US: English / United States
(
  'en-US', 'en', 'US',
  '.', ',', '1,234.56',
  'USD', 'BEFORE', false,
  'MM/DD/YYYY', 'MM/DD', 'MMMM D, YYYY', 'H12', 'SUNDAY', '01-01',
  'IMPERIAL', 'FAHRENHEIT', 'LETTER',
  'Sales Tax', '{"standard": 0}', false,
  'EIN', '##-#######',
  'en', 'en',
  '{"format": ["name", "street", "city, state zip", "country"]}',
  'GIVEN_FAMILY', '+1',
  'Inc', 'Secretary of State',
  '["Invoice number required", "Payment terms required"]'
),

-- en-GB: English / United Kingdom
(
  'en-GB', 'en', 'GB',
  '.', ',', '1,234.56',
  'GBP', 'BEFORE', false,
  'DD/MM/YYYY', 'DD/MM', 'D MMMM YYYY', 'H24', 'MONDAY', '04-06',
  'METRIC', 'CELSIUS', 'A4',
  'VAT', '{"standard": 20, "reduced": 5, "zero": 0}', true,
  'VAT Number', 'GB#########',
  'en', 'en',
  '{"format": ["name", "street", "city", "county", "postcode", "country"]}',
  'GIVEN_FAMILY', '+44',
  'Ltd', 'Companies House',
  '["VAT registration number required if VAT registered", "Company registration number", "Registered office address"]'
),

-- lt-LT: Lithuanian / Lithuania
(
  'lt-LT', 'lt', 'LT',
  ',', ' ', '1 234,56',
  'EUR', 'AFTER', true,
  'YYYY-MM-DD', 'MM-DD', 'YYYY m. MMMM D d.', 'H24', 'MONDAY', '01-01',
  'METRIC', 'CELSIUS', 'A4',
  'PVM', '{"standard": 21, "reduced": 9, "low": 5}', true,
  'Įmonės kodas', '#########',
  'lt', 'lt',
  '{"format": ["name", "street", "LT-postal_code city", "country"]}',
  'GIVEN_FAMILY', '+370',
  'UAB', 'Registrų centras',
  '["Įmonės kodas privalomas", "PVM mokėtojo kodas (LT + 9 arba 12 skaitmenų)", "Sąskaitos serija ir numeris"]'
),

-- de-DE: German / Germany
(
  'de-DE', 'de', 'DE',
  ',', '.', '1.234,56',
  'EUR', 'AFTER', true,
  'DD.MM.YYYY', 'DD.MM.', 'D. MMMM YYYY', 'H24', 'MONDAY', '01-01',
  'METRIC', 'CELSIUS', 'A4',
  'USt', '{"standard": 19, "reduced": 7}', true,
  'Steuernummer', '##/###/#####',
  'de', 'de',
  '{"format": ["name", "street", "postal_code city", "country"]}',
  'GIVEN_FAMILY', '+49',
  'GmbH', 'Handelsregister',
  '["Steuernummer oder USt-IdNr. erforderlich", "Handelsregisternummer", "Geschäftsführer muss genannt werden", "Amtsgericht"]'
),

-- ar-AE: Arabic / United Arab Emirates
(
  'ar-AE', 'ar', 'AE',
  '.', ',', '1,234.56',
  'AED', 'BEFORE', true,
  'DD/MM/YYYY', 'DD/MM', 'D MMMM YYYY', 'H12', 'SUNDAY', '01-01',
  'METRIC', 'CELSIUS', 'A4',
  'VAT', '{"standard": 5}', true,
  'TRN', '###-####-#######-###',
  'ar', 'en',
  '{"format": ["name", "street", "area", "emirate", "country"]}',
  'GIVEN_FAMILY', '+971',
  'FZCO', 'DED / Free Zone Authority',
  '["Tax Registration Number (TRN) required", "Bilingual invoice (Arabic + English)", "VAT amount in AED"]'
),

-- ja-JP: Japanese / Japan
(
  'ja-JP', 'ja', 'JP',
  '.', ',', '1,234',
  'JPY', 'BEFORE', false,
  'YYYY年MM月DD日', 'MM/DD', 'YYYY年MM月DD日', 'H24', 'SUNDAY', '04-01',
  'METRIC', 'CELSIUS', 'A4',
  '消費税', '{"standard": 10, "reduced": 8}', true,
  '法人番号', 'T#############',
  'ja', 'ja',
  '{"format": ["postal_code", "prefecture", "city", "street", "building", "name"]}',
  'FAMILY_GIVEN', '+81',
  '株式会社', '法務局',
  '["適格請求書発行事業者登録番号 (インボイス番号)", "消費税額の明記", "軽減税率対象品目の明記"]'
),

-- fr-FR: French / France
(
  'fr-FR', 'fr', 'FR',
  ',', ' ', '1 234,56',
  'EUR', 'AFTER', true,
  'DD/MM/YYYY', 'DD/MM', 'D MMMM YYYY', 'H24', 'MONDAY', '01-01',
  'METRIC', 'CELSIUS', 'A4',
  'TVA', '{"standard": 20, "intermediate": 10, "reduced": 5.5, "super_reduced": 2.1}', true,
  'SIRET', '### ### ### #####',
  'fr', 'fr',
  '{"format": ["name", "street", "postal_code city", "country"]}',
  'GIVEN_FAMILY', '+33',
  'SARL', 'Greffe du Tribunal de Commerce',
  '["Numéro SIRET obligatoire", "Numéro de TVA intracommunautaire", "Mention obligatoire: auto-liquidation si applicable", "Capital social"]'
),

-- es-ES: Spanish / Spain
(
  'es-ES', 'es', 'ES',
  ',', '.', '1.234,56',
  'EUR', 'AFTER', true,
  'DD/MM/YYYY', 'DD/MM', 'D de MMMM de YYYY', 'H24', 'MONDAY', '01-01',
  'METRIC', 'CELSIUS', 'A4',
  'IVA', '{"standard": 21, "reduced": 10, "super_reduced": 4}', true,
  'CIF', 'X-########',
  'es', 'es',
  '{"format": ["name", "street", "postal_code city", "province", "country"]}',
  'GIVEN_FAMILY', '+34',
  'SL', 'Registro Mercantil',
  '["CIF obligatorio", "Número de IVA intracomunitario", "Datos del Registro Mercantil", "Domicilio social"]'
)

ON CONFLICT (code) DO UPDATE SET
  language_code               = EXCLUDED.language_code,
  jurisdiction_code           = EXCLUDED.jurisdiction_code,
  decimal_separator           = EXCLUDED.decimal_separator,
  thousands_separator         = EXCLUDED.thousands_separator,
  number_example              = EXCLUDED.number_example,
  default_currency            = EXCLUDED.default_currency,
  currency_position           = EXCLUDED.currency_position,
  currency_space              = EXCLUDED.currency_space,
  date_format                 = EXCLUDED.date_format,
  date_format_short           = EXCLUDED.date_format_short,
  date_format_long            = EXCLUDED.date_format_long,
  time_format                 = EXCLUDED.time_format,
  first_day_of_week           = EXCLUDED.first_day_of_week,
  fiscal_year_start           = EXCLUDED.fiscal_year_start,
  measurement_system          = EXCLUDED.measurement_system,
  temperature_unit            = EXCLUDED.temperature_unit,
  paper_size                  = EXCLUDED.paper_size,
  vat_name                    = EXCLUDED.vat_name,
  vat_rates                   = EXCLUDED.vat_rates,
  vat_on_invoice              = EXCLUDED.vat_on_invoice,
  tax_id_name                 = EXCLUDED.tax_id_name,
  tax_id_format               = EXCLUDED.tax_id_format,
  document_language           = EXCLUDED.document_language,
  report_language             = EXCLUDED.report_language,
  address_format              = EXCLUDED.address_format,
  name_order                  = EXCLUDED.name_order,
  phone_prefix                = EXCLUDED.phone_prefix,
  legal_entity_format         = EXCLUDED.legal_entity_format,
  registration_authority      = EXCLUDED.registration_authority,
  invoice_legal_requirements  = EXCLUDED.invoice_legal_requirements;

-- ============================================================================
-- 7. SEED DATA — Translations (sv + en)
-- ============================================================================

-- We use a single large INSERT with ON CONFLICT for idempotency.

INSERT INTO translations (language_code, namespace, key, value) VALUES

-- =========================================================================
-- 7.1 ui.nav — Navigation items
-- =========================================================================
('en', 'ui.nav', 'dashboard',    'Dashboard'),
('en', 'ui.nav', 'processes',    'Processes'),
('en', 'ui.nav', 'tasks',        'Tasks'),
('en', 'ui.nav', 'deals',        'Deals'),
('en', 'ui.nav', 'contacts',     'Contacts'),
('en', 'ui.nav', 'companies',    'Companies'),
('en', 'ui.nav', 'leads',        'Leads'),
('en', 'ui.nav', 'capabilities', 'Capabilities'),
('en', 'ui.nav', 'development',  'Development'),
('en', 'ui.nav', 'goals',        'Goals'),
('en', 'ui.nav', 'compliance',   'Compliance'),
('en', 'ui.nav', 'risks',        'Risks'),
('en', 'ui.nav', 'audits',       'Audits'),
('en', 'ui.nav', 'documents',    'Documents'),
('en', 'ui.nav', 'training',     'Training'),
('en', 'ui.nav', 'chat',         'Chat'),
('en', 'ui.nav', 'settings',     'Settings'),
('en', 'ui.nav', 'reports',      'Reports'),
('en', 'ui.nav', 'reviews',      'Reviews'),

('sv', 'ui.nav', 'dashboard',    'Översikt'),
('sv', 'ui.nav', 'processes',    'Processer'),
('sv', 'ui.nav', 'tasks',        'Uppgifter'),
('sv', 'ui.nav', 'deals',        'Affärer'),
('sv', 'ui.nav', 'contacts',     'Kontakter'),
('sv', 'ui.nav', 'companies',    'Företag'),
('sv', 'ui.nav', 'leads',        'Leads'),
('sv', 'ui.nav', 'capabilities', 'Kompetenser'),
('sv', 'ui.nav', 'development',  'Utveckling'),
('sv', 'ui.nav', 'goals',        'Mål'),
('sv', 'ui.nav', 'compliance',   'Efterlevnad'),
('sv', 'ui.nav', 'risks',        'Risker'),
('sv', 'ui.nav', 'audits',       'Revisioner'),
('sv', 'ui.nav', 'documents',    'Dokument'),
('sv', 'ui.nav', 'training',     'Utbildning'),
('sv', 'ui.nav', 'chat',         'Chatt'),
('sv', 'ui.nav', 'settings',     'Inställningar'),
('sv', 'ui.nav', 'reports',      'Rapporter'),
('sv', 'ui.nav', 'reviews',      'Granskningar'),

-- =========================================================================
-- 7.2 ui.actions — Action buttons / verbs
-- =========================================================================
('en', 'ui.actions', 'save',    'Save'),
('en', 'ui.actions', 'cancel',  'Cancel'),
('en', 'ui.actions', 'delete',  'Delete'),
('en', 'ui.actions', 'edit',    'Edit'),
('en', 'ui.actions', 'create',  'Create'),
('en', 'ui.actions', 'approve', 'Approve'),
('en', 'ui.actions', 'reject',  'Reject'),
('en', 'ui.actions', 'close',   'Close'),
('en', 'ui.actions', 'export',  'Export'),
('en', 'ui.actions', 'search',  'Search'),
('en', 'ui.actions', 'filter',  'Filter'),
('en', 'ui.actions', 'submit',  'Submit'),
('en', 'ui.actions', 'confirm', 'Confirm'),

('sv', 'ui.actions', 'save',    'Spara'),
('sv', 'ui.actions', 'cancel',  'Avbryt'),
('sv', 'ui.actions', 'delete',  'Radera'),
('sv', 'ui.actions', 'edit',    'Redigera'),
('sv', 'ui.actions', 'create',  'Skapa'),
('sv', 'ui.actions', 'approve', 'Godkänn'),
('sv', 'ui.actions', 'reject',  'Avvisa'),
('sv', 'ui.actions', 'close',   'Stäng'),
('sv', 'ui.actions', 'export',  'Exportera'),
('sv', 'ui.actions', 'search',  'Sök'),
('sv', 'ui.actions', 'filter',  'Filtrera'),
('sv', 'ui.actions', 'submit',  'Skicka'),
('sv', 'ui.actions', 'confirm', 'Bekräfta'),

-- =========================================================================
-- 7.3 status — All status labels across domains
-- =========================================================================

-- Task / generic statuses
('en', 'status', 'TODO',            'To Do'),
('en', 'status', 'IN_PROGRESS',     'In Progress'),
('en', 'status', 'REVIEW',          'Review'),
('en', 'status', 'DONE',            'Done'),
('en', 'status', 'BLOCKED',         'Blocked'),

('sv', 'status', 'TODO',            'Att göra'),
('sv', 'status', 'IN_PROGRESS',     'Pågående'),
('sv', 'status', 'REVIEW',          'Granskning'),
('sv', 'status', 'DONE',            'Klar'),
('sv', 'status', 'BLOCKED',         'Blockerad'),

-- Deal / CRM statuses
('en', 'status', 'NEW',             'New'),
('en', 'status', 'QUALIFIED',       'Qualified'),
('en', 'status', 'DEMO',            'Demo'),
('en', 'status', 'OFFER',           'Offer'),
('en', 'status', 'NEGOTIATION',     'Negotiation'),
('en', 'status', 'WON',             'Won'),
('en', 'status', 'LOST',            'Lost'),

('sv', 'status', 'NEW',             'Ny'),
('sv', 'status', 'QUALIFIED',       'Kvalificerad'),
('sv', 'status', 'DEMO',            'Demo'),
('sv', 'status', 'OFFER',           'Offert'),
('sv', 'status', 'NEGOTIATION',     'Förhandling'),
('sv', 'status', 'WON',             'Vunnen'),
('sv', 'status', 'LOST',            'Förlorad'),

-- NC / corrective action statuses
('en', 'status', 'OPEN',            'Open'),
('en', 'status', 'ANALYZING',       'Analyzing'),
('en', 'status', 'ACTION_PLANNED',  'Action Planned'),
('en', 'status', 'IMPLEMENTING',    'Implementing'),
('en', 'status', 'VERIFYING',       'Verifying'),
('en', 'status', 'CLOSED',          'Closed'),

('sv', 'status', 'OPEN',            'Öppen'),
('sv', 'status', 'ANALYZING',       'Analyseras'),
('sv', 'status', 'ACTION_PLANNED',  'Åtgärd planerad'),
('sv', 'status', 'IMPLEMENTING',    'Implementeras'),
('sv', 'status', 'VERIFYING',       'Verifieras'),
('sv', 'status', 'CLOSED',          'Stängd'),

-- Approval statuses
('en', 'status', 'PENDING',         'Pending'),
('en', 'status', 'APPROVED',        'Approved'),
('en', 'status', 'REJECTED',        'Rejected'),

('sv', 'status', 'PENDING',         'Väntande'),
('sv', 'status', 'APPROVED',        'Godkänd'),
('sv', 'status', 'REJECTED',        'Avvisad'),

-- Document statuses
('en', 'status', 'DRAFT',           'Draft'),
('en', 'status', 'ACTIVE',          'Active'),
('en', 'status', 'ARCHIVED',        'Archived'),

('sv', 'status', 'DRAFT',           'Utkast'),
('sv', 'status', 'ACTIVE',          'Aktiv'),
('sv', 'status', 'ARCHIVED',        'Arkiverad'),

-- =========================================================================
-- 7.4 roles — ISO system role display names
-- =========================================================================
('en', 'roles', 'EXECUTIVE',                'Executive'),
('en', 'roles', 'QUALITY_MANAGER',          'Quality Manager'),
('en', 'roles', 'PROCESS_OWNER',            'Process Owner'),
('en', 'roles', 'INTERNAL_AUDITOR',         'Internal Auditor'),
('en', 'roles', 'HR_MANAGER',               'HR Manager'),
('en', 'roles', 'DOCUMENT_CONTROLLER',      'Document Controller'),
('en', 'roles', 'FINANCE_CONTROLLER',       'Finance Controller'),
('en', 'roles', 'OPERATIONS_MANAGER',       'Operations Manager'),
('en', 'roles', 'MANAGEMENT_REPRESENTATIVE','Management Representative'),
('en', 'roles', 'EXTERNAL_AUDITOR',         'External Auditor'),
('en', 'roles', 'EMPLOYEE',                 'Employee'),
('en', 'roles', 'SUPPLIER',                 'Supplier'),

('sv', 'roles', 'EXECUTIVE',                'Ledning'),
('sv', 'roles', 'QUALITY_MANAGER',          'Kvalitetschef'),
('sv', 'roles', 'PROCESS_OWNER',            'Processägare'),
('sv', 'roles', 'INTERNAL_AUDITOR',         'Internrevisor'),
('sv', 'roles', 'HR_MANAGER',               'HR-chef'),
('sv', 'roles', 'DOCUMENT_CONTROLLER',      'Dokumentansvarig'),
('sv', 'roles', 'FINANCE_CONTROLLER',       'Ekonomiansvarig'),
('sv', 'roles', 'OPERATIONS_MANAGER',       'Driftchef'),
('sv', 'roles', 'MANAGEMENT_REPRESENTATIVE','Ledningens representant'),
('sv', 'roles', 'EXTERNAL_AUDITOR',         'Extern revisor'),
('sv', 'roles', 'EMPLOYEE',                 'Medarbetare'),
('sv', 'roles', 'SUPPLIER',                 'Leverantör'),

-- =========================================================================
-- 7.5 iso.9001 — ISO 9001:2015 clause titles (4.1–10.3)
-- =========================================================================

-- Clause 4: Context of the organization
('en', 'iso.9001', '4.1', 'Understanding the organization and its context'),
('en', 'iso.9001', '4.2', 'Understanding the needs and expectations of interested parties'),
('en', 'iso.9001', '4.3', 'Determining the scope of the quality management system'),
('en', 'iso.9001', '4.4', 'Quality management system and its processes'),

('sv', 'iso.9001', '4.1', 'Förstå organisationen och dess förutsättningar'),
('sv', 'iso.9001', '4.2', 'Förstå intressenters behov och förväntningar'),
('sv', 'iso.9001', '4.3', 'Bestämma kvalitetsledningssystemets omfattning'),
('sv', 'iso.9001', '4.4', 'Kvalitetsledningssystemet och dess processer'),

-- Clause 5: Leadership
('en', 'iso.9001', '5.1', 'Leadership and commitment'),
('en', 'iso.9001', '5.1.1', 'General'),
('en', 'iso.9001', '5.1.2', 'Customer focus'),
('en', 'iso.9001', '5.2', 'Policy'),
('en', 'iso.9001', '5.2.1', 'Establishing the quality policy'),
('en', 'iso.9001', '5.2.2', 'Communicating the quality policy'),
('en', 'iso.9001', '5.3', 'Organizational roles, responsibilities and authorities'),

('sv', 'iso.9001', '5.1', 'Ledarskap och åtagande'),
('sv', 'iso.9001', '5.1.1', 'Allmänt'),
('sv', 'iso.9001', '5.1.2', 'Kundfokus'),
('sv', 'iso.9001', '5.2', 'Policy'),
('sv', 'iso.9001', '5.2.1', 'Fastställa kvalitetspolicyn'),
('sv', 'iso.9001', '5.2.2', 'Kommunicera kvalitetspolicyn'),
('sv', 'iso.9001', '5.3', 'Roller, ansvar och befogenheter i organisationen'),

-- Clause 6: Planning
('en', 'iso.9001', '6.1', 'Actions to address risks and opportunities'),
('en', 'iso.9001', '6.1.1', 'General'),
('en', 'iso.9001', '6.1.2', 'Planning actions'),
('en', 'iso.9001', '6.2', 'Quality objectives and planning to achieve them'),
('en', 'iso.9001', '6.2.1', 'Quality objectives'),
('en', 'iso.9001', '6.2.2', 'Planning to achieve quality objectives'),
('en', 'iso.9001', '6.3', 'Planning of changes'),

('sv', 'iso.9001', '6.1', 'Åtgärder för att hantera risker och möjligheter'),
('sv', 'iso.9001', '6.1.1', 'Allmänt'),
('sv', 'iso.9001', '6.1.2', 'Planering av åtgärder'),
('sv', 'iso.9001', '6.2', 'Kvalitetsmål och planering för att uppnå dem'),
('sv', 'iso.9001', '6.2.1', 'Kvalitetsmål'),
('sv', 'iso.9001', '6.2.2', 'Planering för att uppnå kvalitetsmål'),
('sv', 'iso.9001', '6.3', 'Planering av ändringar'),

-- Clause 7: Support
('en', 'iso.9001', '7.1', 'Resources'),
('en', 'iso.9001', '7.1.1', 'General'),
('en', 'iso.9001', '7.1.2', 'People'),
('en', 'iso.9001', '7.1.3', 'Infrastructure'),
('en', 'iso.9001', '7.1.4', 'Environment for the operation of processes'),
('en', 'iso.9001', '7.1.5', 'Monitoring and measuring resources'),
('en', 'iso.9001', '7.1.5.1', 'General'),
('en', 'iso.9001', '7.1.5.2', 'Measurement traceability'),
('en', 'iso.9001', '7.1.6', 'Organizational knowledge'),
('en', 'iso.9001', '7.2', 'Competence'),
('en', 'iso.9001', '7.3', 'Awareness'),
('en', 'iso.9001', '7.4', 'Communication'),
('en', 'iso.9001', '7.5', 'Documented information'),
('en', 'iso.9001', '7.5.1', 'General'),
('en', 'iso.9001', '7.5.2', 'Creating and updating'),
('en', 'iso.9001', '7.5.3', 'Control of documented information'),
('en', 'iso.9001', '7.5.3.1', 'Availability and suitability'),
('en', 'iso.9001', '7.5.3.2', 'Storage and preservation'),

('sv', 'iso.9001', '7.1', 'Resurser'),
('sv', 'iso.9001', '7.1.1', 'Allmänt'),
('sv', 'iso.9001', '7.1.2', 'Personal'),
('sv', 'iso.9001', '7.1.3', 'Infrastruktur'),
('sv', 'iso.9001', '7.1.4', 'Miljö för processernas funktion'),
('sv', 'iso.9001', '7.1.5', 'Resurser för övervakning och mätning'),
('sv', 'iso.9001', '7.1.5.1', 'Allmänt'),
('sv', 'iso.9001', '7.1.5.2', 'Mätningsspårbarhet'),
('sv', 'iso.9001', '7.1.6', 'Organisatorisk kunskap'),
('sv', 'iso.9001', '7.2', 'Kompetens'),
('sv', 'iso.9001', '7.3', 'Medvetenhet'),
('sv', 'iso.9001', '7.4', 'Kommunikation'),
('sv', 'iso.9001', '7.5', 'Dokumenterad information'),
('sv', 'iso.9001', '7.5.1', 'Allmänt'),
('sv', 'iso.9001', '7.5.2', 'Skapande och uppdatering'),
('sv', 'iso.9001', '7.5.3', 'Styrning av dokumenterad information'),
('sv', 'iso.9001', '7.5.3.1', 'Tillgänglighet och lämplighet'),
('sv', 'iso.9001', '7.5.3.2', 'Lagring och bevarande'),

-- Clause 8: Operation
('en', 'iso.9001', '8.1', 'Operational planning and control'),
('en', 'iso.9001', '8.2', 'Requirements for products and services'),
('en', 'iso.9001', '8.2.1', 'Customer communication'),
('en', 'iso.9001', '8.2.2', 'Determining the requirements for products and services'),
('en', 'iso.9001', '8.2.3', 'Review of the requirements for products and services'),
('en', 'iso.9001', '8.2.3.1', 'Review criteria'),
('en', 'iso.9001', '8.2.3.2', 'Retained documented information'),
('en', 'iso.9001', '8.2.4', 'Changes to requirements for products and services'),
('en', 'iso.9001', '8.3', 'Design and development of products and services'),
('en', 'iso.9001', '8.3.1', 'General'),
('en', 'iso.9001', '8.3.2', 'Design and development planning'),
('en', 'iso.9001', '8.3.3', 'Design and development inputs'),
('en', 'iso.9001', '8.3.4', 'Design and development controls'),
('en', 'iso.9001', '8.3.5', 'Design and development outputs'),
('en', 'iso.9001', '8.3.6', 'Design and development changes'),
('en', 'iso.9001', '8.4', 'Control of externally provided processes, products and services'),
('en', 'iso.9001', '8.4.1', 'General'),
('en', 'iso.9001', '8.4.2', 'Type and extent of control'),
('en', 'iso.9001', '8.4.3', 'Information for external providers'),
('en', 'iso.9001', '8.5', 'Production and service provision'),
('en', 'iso.9001', '8.5.1', 'Control of production and service provision'),
('en', 'iso.9001', '8.5.2', 'Identification and traceability'),
('en', 'iso.9001', '8.5.3', 'Property belonging to customers or external providers'),
('en', 'iso.9001', '8.5.4', 'Preservation'),
('en', 'iso.9001', '8.5.5', 'Post-delivery activities'),
('en', 'iso.9001', '8.5.6', 'Control of changes'),
('en', 'iso.9001', '8.6', 'Release of products and services'),
('en', 'iso.9001', '8.7', 'Control of nonconforming outputs'),
('en', 'iso.9001', '8.7.1', 'General'),
('en', 'iso.9001', '8.7.2', 'Retained documented information'),

('sv', 'iso.9001', '8.1', 'Planering och styrning av verksamheten'),
('sv', 'iso.9001', '8.2', 'Krav för produkter och tjänster'),
('sv', 'iso.9001', '8.2.1', 'Kundkommunikation'),
('sv', 'iso.9001', '8.2.2', 'Bestämning av krav för produkter och tjänster'),
('sv', 'iso.9001', '8.2.3', 'Genomgång av krav för produkter och tjänster'),
('sv', 'iso.9001', '8.2.3.1', 'Genomgångskriterier'),
('sv', 'iso.9001', '8.2.3.2', 'Bevarad dokumenterad information'),
('sv', 'iso.9001', '8.2.4', 'Ändringar av krav för produkter och tjänster'),
('sv', 'iso.9001', '8.3', 'Konstruktion och utveckling av produkter och tjänster'),
('sv', 'iso.9001', '8.3.1', 'Allmänt'),
('sv', 'iso.9001', '8.3.2', 'Planering av konstruktion och utveckling'),
('sv', 'iso.9001', '8.3.3', 'Indata för konstruktion och utveckling'),
('sv', 'iso.9001', '8.3.4', 'Styrning av konstruktion och utveckling'),
('sv', 'iso.9001', '8.3.5', 'Resultat av konstruktion och utveckling'),
('sv', 'iso.9001', '8.3.6', 'Ändringar av konstruktion och utveckling'),
('sv', 'iso.9001', '8.4', 'Styrning av externt tillhandahållna processer, produkter och tjänster'),
('sv', 'iso.9001', '8.4.1', 'Allmänt'),
('sv', 'iso.9001', '8.4.2', 'Typ och omfattning av styrning'),
('sv', 'iso.9001', '8.4.3', 'Information till externa leverantörer'),
('sv', 'iso.9001', '8.5', 'Produktion och tillhandahållande av tjänst'),
('sv', 'iso.9001', '8.5.1', 'Styrning av produktion och tillhandahållande av tjänst'),
('sv', 'iso.9001', '8.5.2', 'Identifiering och spårbarhet'),
('sv', 'iso.9001', '8.5.3', 'Egendom som tillhör kunder eller externa leverantörer'),
('sv', 'iso.9001', '8.5.4', 'Bevarande'),
('sv', 'iso.9001', '8.5.5', 'Aktiviteter efter leverans'),
('sv', 'iso.9001', '8.5.6', 'Styrning av ändringar'),
('sv', 'iso.9001', '8.6', 'Frisläppning av produkter och tjänster'),
('sv', 'iso.9001', '8.7', 'Styrning av avvikande utdata'),
('sv', 'iso.9001', '8.7.1', 'Allmänt'),
('sv', 'iso.9001', '8.7.2', 'Bevarad dokumenterad information'),

-- Clause 9: Performance evaluation
('en', 'iso.9001', '9.1', 'Monitoring, measurement, analysis and evaluation'),
('en', 'iso.9001', '9.1.1', 'General'),
('en', 'iso.9001', '9.1.2', 'Customer satisfaction'),
('en', 'iso.9001', '9.1.3', 'Analysis and evaluation'),
('en', 'iso.9001', '9.2', 'Internal audit'),
('en', 'iso.9001', '9.2.1', 'General'),
('en', 'iso.9001', '9.2.2', 'Audit programme'),
('en', 'iso.9001', '9.3', 'Management review'),
('en', 'iso.9001', '9.3.1', 'General'),
('en', 'iso.9001', '9.3.2', 'Management review inputs'),
('en', 'iso.9001', '9.3.3', 'Management review outputs'),

('sv', 'iso.9001', '9.1', 'Övervakning, mätning, analys och utvärdering'),
('sv', 'iso.9001', '9.1.1', 'Allmänt'),
('sv', 'iso.9001', '9.1.2', 'Kundnöjdhet'),
('sv', 'iso.9001', '9.1.3', 'Analys och utvärdering'),
('sv', 'iso.9001', '9.2', 'Internrevision'),
('sv', 'iso.9001', '9.2.1', 'Allmänt'),
('sv', 'iso.9001', '9.2.2', 'Revisionsprogram'),
('sv', 'iso.9001', '9.3', 'Ledningens genomgång'),
('sv', 'iso.9001', '9.3.1', 'Allmänt'),
('sv', 'iso.9001', '9.3.2', 'Indata till ledningens genomgång'),
('sv', 'iso.9001', '9.3.3', 'Utdata från ledningens genomgång'),

-- Clause 10: Improvement
('en', 'iso.9001', '10.1', 'General'),
('en', 'iso.9001', '10.2', 'Nonconformity and corrective action'),
('en', 'iso.9001', '10.2.1', 'Reaction to nonconformity'),
('en', 'iso.9001', '10.2.2', 'Retained documented information'),
('en', 'iso.9001', '10.3', 'Continual improvement'),

('sv', 'iso.9001', '10.1', 'Allmänt'),
('sv', 'iso.9001', '10.2', 'Avvikelse och korrigerande åtgärd'),
('sv', 'iso.9001', '10.2.1', 'Reaktion vid avvikelse'),
('sv', 'iso.9001', '10.2.2', 'Bevarad dokumenterad information'),
('sv', 'iso.9001', '10.3', 'Ständig förbättring'),

-- =========================================================================
-- 7.6 report — Financial report titles
-- =========================================================================
('en', 'report', 'income_statement.title',  'Income Statement'),
('en', 'report', 'balance_sheet.title',     'Balance Sheet'),
('en', 'report', 'trial_balance.title',     'Trial Balance'),
('en', 'report', 'general_ledger.title',    'General Ledger'),
('en', 'report', 'vat_report.title',        'VAT Report'),
('en', 'report', 'cashflow.title',          'Cash Flow Statement'),
('en', 'report', 'chart_of_accounts.title', 'Chart of Accounts'),
('en', 'report', 'sie4.title',              'SIE4 Export'),

('sv', 'report', 'income_statement.title',  'Resultaträkning'),
('sv', 'report', 'balance_sheet.title',     'Balansräkning'),
('sv', 'report', 'trial_balance.title',     'Huvudbok (saldon)'),
('sv', 'report', 'general_ledger.title',    'Huvudbok'),
('sv', 'report', 'vat_report.title',        'Momsrapport'),
('sv', 'report', 'cashflow.title',          'Kassaflödesanalys'),
('sv', 'report', 'chart_of_accounts.title', 'Kontoplan'),
('sv', 'report', 'sie4.title',              'SIE4-export'),

-- =========================================================================
-- 7.7 email — Email template subjects and bodies
-- =========================================================================

-- complaint_acknowledged
('en', 'email', 'complaint_acknowledged.subject', 'Your complaint has been acknowledged'),
('en', 'email', 'complaint_acknowledged.body',    'Dear {{contact_name}},\n\nThank you for bringing this matter to our attention. Your complaint (ref: {{complaint_ref}}) has been received and registered in our quality management system.\n\nWe will investigate and respond within {{response_days}} business days.\n\nBest regards,\n{{organization_name}}'),

('sv', 'email', 'complaint_acknowledged.subject', 'Ditt klagomål har mottagits'),
('sv', 'email', 'complaint_acknowledged.body',    'Hej {{contact_name}},\n\nTack för att du uppmärksammat oss på detta. Ditt klagomål (ref: {{complaint_ref}}) har mottagits och registrerats i vårt kvalitetsledningssystem.\n\nVi kommer att utreda ärendet och återkomma inom {{response_days}} arbetsdagar.\n\nMed vänliga hälsningar,\n{{organization_name}}'),

-- survey_invitation
('en', 'email', 'survey_invitation.subject', 'We value your feedback — please complete our survey'),
('en', 'email', 'survey_invitation.body',    'Dear {{contact_name}},\n\nAs part of our commitment to continual improvement, we would appreciate your feedback.\n\nPlease take a few minutes to complete our customer satisfaction survey:\n{{survey_url}}\n\nYour responses help us improve our products and services.\n\nBest regards,\n{{organization_name}}'),

('sv', 'email', 'survey_invitation.subject', 'Vi värdesätter din feedback — vänligen fyll i vår enkät'),
('sv', 'email', 'survey_invitation.body',    'Hej {{contact_name}},\n\nSom en del av vårt arbete med ständig förbättring uppskattar vi din feedback.\n\nVänligen ta några minuter att fylla i vår kundnöjdhetsenkät:\n{{survey_url}}\n\nDina svar hjälper oss att förbättra våra produkter och tjänster.\n\nMed vänliga hälsningar,\n{{organization_name}}'),

-- task_assigned
('en', 'email', 'task_assigned.subject', 'New task assigned: {{task_title}}'),
('en', 'email', 'task_assigned.body',    'Hi {{assignee_name}},\n\nYou have been assigned a new task:\n\nTask: {{task_title}}\nDue date: {{due_date}}\nPriority: {{priority}}\nAssigned by: {{assigner_name}}\n\nPlease review and begin work at your earliest convenience.\n\nView task: {{task_url}}'),

('sv', 'email', 'task_assigned.subject', 'Ny uppgift tilldelad: {{task_title}}'),
('sv', 'email', 'task_assigned.body',    'Hej {{assignee_name}},\n\nDu har tilldelats en ny uppgift:\n\nUppgift: {{task_title}}\nFörfallodatum: {{due_date}}\nPrioritet: {{priority}}\nTilldelad av: {{assigner_name}}\n\nVänligen granska och påbörja arbetet.\n\nVisa uppgift: {{task_url}}'),

-- =========================================================================
-- 7.8 nc.severity — Non-conformity severity levels
-- =========================================================================
('en', 'nc.severity', 'OBSERVATION', 'Observation'),
('en', 'nc.severity', 'MINOR',       'Minor'),
('en', 'nc.severity', 'MAJOR',       'Major'),
('en', 'nc.severity', 'CRITICAL',    'Critical'),

('sv', 'nc.severity', 'OBSERVATION', 'Observation'),
('sv', 'nc.severity', 'MINOR',       'Mindre'),
('sv', 'nc.severity', 'MAJOR',       'Större'),
('sv', 'nc.severity', 'CRITICAL',    'Kritisk'),

-- =========================================================================
-- 7.9 risk.level — Risk assessment levels
-- =========================================================================
('en', 'risk.level', 'LOW',      'Low'),
('en', 'risk.level', 'MEDIUM',   'Medium'),
('en', 'risk.level', 'HIGH',     'High'),
('en', 'risk.level', 'CRITICAL', 'Critical'),

('sv', 'risk.level', 'LOW',      'Låg'),
('sv', 'risk.level', 'MEDIUM',   'Medel'),
('sv', 'risk.level', 'HIGH',     'Hög'),
('sv', 'risk.level', 'CRITICAL', 'Kritisk'),

-- =========================================================================
-- 7.10 pdca — PDCA cycle phases
-- =========================================================================
('en', 'pdca', 'PLAN',  'Plan'),
('en', 'pdca', 'DO',    'Do'),
('en', 'pdca', 'CHECK', 'Check'),
('en', 'pdca', 'ACT',   'Act'),

('sv', 'pdca', 'PLAN',  'Planera'),
('sv', 'pdca', 'DO',    'Genomföra'),
('sv', 'pdca', 'CHECK', 'Kontrollera'),
('sv', 'pdca', 'ACT',   'Agera')

ON CONFLICT (language_code, namespace, key) DO UPDATE SET
  value = EXCLUDED.value;

COMMIT;
