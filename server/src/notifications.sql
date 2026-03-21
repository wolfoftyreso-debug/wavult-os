-- ═══════════════════════════════════════════════════════════
-- pixdrift — Notifications Schema
-- Run in Supabase SQL Editor or via migration
-- ═══════════════════════════════════════════════════════════

-- Prenumerationer för changelog och incidentnotiser
CREATE TABLE IF NOT EXISTS notifications_subscriptions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT        NOT NULL,
  types       TEXT[]      DEFAULT ARRAY['release', 'incident'],
  verified    BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT notifications_subscriptions_email_key UNIQUE (email)
);

-- Index för snabb uppslagning per email
CREATE INDEX IF NOT EXISTS idx_notifications_subscriptions_email
  ON notifications_subscriptions (email);

-- Index för att hämta verifierade prenumeranter per typ
CREATE INDEX IF NOT EXISTS idx_notifications_subscriptions_types
  ON notifications_subscriptions USING GIN (types);

-- Row Level Security
ALTER TABLE notifications_subscriptions ENABLE ROW LEVEL SECURITY;

-- Tillåt insert utan autentisering (publik prenumerationsform)
CREATE POLICY "Allow public insert"
  ON notifications_subscriptions FOR INSERT
  WITH CHECK (true);

-- Tillåt service_role att läsa alla prenumeranter (för utskick)
CREATE POLICY "Allow service_role full access"
  ON notifications_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────
-- Changelog entries (valfritt — om du vill driva changelog via DB)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS changelog_entries (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  version     TEXT        NOT NULL,
  date        DATE        NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('feature', 'improvement', 'bugfix', 'security', 'breaking')),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  docs_url    TEXT,
  published   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_version
  ON changelog_entries (version);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_date
  ON changelog_entries (date DESC);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_category
  ON changelog_entries (category);

-- RLS för changelog (publik läsning, service_role skrivning)
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read published entries"
  ON changelog_entries FOR SELECT
  USING (published = true);

CREATE POLICY "Allow service_role full access"
  ON changelog_entries FOR ALL
  USING (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────
-- System incidents (för statussida)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_incidents (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  severity    TEXT        NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  occurred_at TIMESTAMPTZ NOT NULL,
  resolved    BOOLEAN     DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read resolved incidents"
  ON system_incidents FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access"
  ON system_incidents FOR ALL
  USING (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────
-- Seed: Changelog entries (matchar changelog.html)
-- ───────────────────────────────────────────────────────────

INSERT INTO changelog_entries (version, date, category, title, description, docs_url) VALUES
  ('1.3.0', '2026-03-21', 'feature',     'Admin, CRM och Sales-appar lanserade',       'Tre nya dedikerade appar: Admin-appen, CRM-appen och Sales-appen.',                                        '/docs/apps'),
  ('1.3.0', '2026-03-21', 'feature',     'Enterprise landningssida',                    'Ny enterprise-fokuserad landningssida med changelog, status, roadmap och pressrum.',                        NULL),
  ('1.3.0', '2026-03-21', 'improvement', 'Stripe-integration (beta)',                   'Stripe-betalning tillgänglig i beta med Customer Portal och självbetjäning.',                              '/docs/billing'),
  ('1.3.0', '2026-03-21', 'security',    'Uppdaterade beroenden',                       'Alla npm-paket uppdaterade. 3 låg-allvarlighetssårbarheter patchade.',                                     NULL),
  ('1.2.0', '2026-03-01', 'feature',     'Multi-valuta FX revaluation',                 'Automatisk omvärdering av balanser enligt ECB-kurser. Stöder SEK, NOK, DKK, EUR, USD, GBP, CHF.',        '/docs/currency'),
  ('1.2.0', '2026-03-01', 'feature',     'SIE4-export',                                 'Exportera verifikationer i SIE4-format. Kompatibelt med Fortnox och Visma Administration.',               '/docs/sie4'),
  ('1.2.0', '2026-03-01', 'improvement', 'Dashboard-prestanda +40%',                    'Laddningstid reducerad från ~1 800ms till ~1 080ms via lazy loading och SWR-cache.',                      NULL),
  ('1.2.0', '2026-03-01', 'bugfix',      'Trial balance-beräkning vid månadsslut',      'Åtgärdat fel med felaktiga ingående balanser för poster daterade sista dagen i månaden.',                  NULL),
  ('1.1.0', '2026-02-01', 'feature',     'Capability assessment-motor',                 'Strukturerade kompetensassessments med anpassningsbara matriser och kompetensprofiler.',                  '/docs/capability'),
  ('1.1.0', '2026-02-01', 'feature',     'Compliance-modul med ISO 9001-stöd',          'ISO 9001:2015-kravmappning, kravspårning och revisionsberedda rapporter.',                                '/docs/compliance'),
  ('1.1.0', '2026-02-01', 'improvement', 'API-responstid -60%',                         'Median responstid från 320ms till 128ms via Redis-caching och optimerade queries.',                       NULL),
  ('1.0.0', '2026-01-10', 'feature',     'Initial release — pixdrift OMS-plattformen',  'Lansering med fem kärnmoduler: Execution, Capability, Process, Currency, Reports.',                       NULL)
ON CONFLICT DO NOTHING;
