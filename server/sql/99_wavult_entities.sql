-- ============================================================================
-- Wavult Group — Entity Seed
-- Sätter upp de tre Wavult-bolagen med rätt jurisdiktioner
-- Kör EFTER 17_jurisdiction.sql
-- ============================================================================

BEGIN;

-- Wavult org IDs (fasta UUIDs för konsistens)
DO $$
DECLARE
  v_holding_id    UUID := 'a1000000-0000-0000-0000-000000000001';
  v_tech_llc_id   UUID := 'a1000000-0000-0000-0000-000000000002';
  v_intel_uab_id  UUID := 'a1000000-0000-0000-0000-000000000003';
  v_difc_id       UUID;
  v_us_tx_id      UUID;
  v_lt_id         UUID;
BEGIN

  SELECT id INTO v_difc_id   FROM jurisdictions WHERE code = 'AE-DIFC';
  SELECT id INTO v_us_tx_id  FROM jurisdictions WHERE code = 'US-TX';
  SELECT id INTO v_lt_id     FROM jurisdictions WHERE code = 'LT';

  -- Wavult Group Holding (Dubai DIFC)
  INSERT INTO org_jurisdictions (org_id, jurisdiction_id, is_primary, legal_entity_name)
  VALUES (v_holding_id, v_difc_id, true, 'Wavult Group Holding Ltd')
  ON CONFLICT (org_id, jurisdiction_id) DO UPDATE SET
    legal_entity_name = EXCLUDED.legal_entity_name;

  -- Wavult Technologies LLC (Texas)
  INSERT INTO org_jurisdictions (org_id, jurisdiction_id, is_primary, legal_entity_name)
  VALUES (v_tech_llc_id, v_us_tx_id, true, 'Wavult Technologies LLC')
  ON CONFLICT (org_id, jurisdiction_id) DO UPDATE SET
    legal_entity_name = EXCLUDED.legal_entity_name;

  -- Wavult Intelligence UAB (Litauen)
  INSERT INTO org_jurisdictions (org_id, jurisdiction_id, is_primary, legal_entity_name)
  VALUES (v_intel_uab_id, v_lt_id, true, 'Wavult Intelligence UAB')
  ON CONFLICT (org_id, jurisdiction_id) DO UPDATE SET
    legal_entity_name = EXCLUDED.legal_entity_name;

  RAISE NOTICE 'Wavult Group entities seeded: Holding (DIFC), Technologies LLC (TX), Intelligence UAB (LT)';
END $$;

COMMIT;
