-- ============================================================
-- Atomic Double-Entry Journal Entry
-- 
-- REGEL: Debet måste alltid = Kredit.
-- Hela journalposten skapas i en transaktion — allt eller inget.
-- Ingen half-written bokföring är möjlig.
-- ============================================================

CREATE OR REPLACE FUNCTION create_journal_entry(
  p_org_id         UUID,
  p_entry_date     DATE,
  p_description    TEXT,
  p_currency       TEXT,
  p_type           TEXT    DEFAULT 'STANDARD',
  p_reference      TEXT    DEFAULT NULL,
  p_idempotency_key TEXT   DEFAULT NULL,
  p_lines          JSONB   -- [{account_code, debit_minor, credit_minor, description}]
) RETURNS journal_entries
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry         journal_entries;
  v_line          JSONB;
  v_total_debit   BIGINT := 0;
  v_total_credit  BIGINT := 0;
BEGIN
  -- ── Idempotency: returnera befintlig post om nyckeln redan finns ──────────
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_entry
    FROM journal_entries
    WHERE idempotency_key = p_idempotency_key
      AND org_id = p_org_id;
    IF FOUND THEN
      RETURN v_entry;
    END IF;
  END IF;

  -- ── Validera balans INNAN vi skriver någonting ────────────────────────────
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_total_debit  := v_total_debit  + COALESCE((v_line->>'debit_minor')::BIGINT, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit_minor')::BIGINT, 0);
  END LOOP;

  IF v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Journal entry unbalanced: debit=% credit=% (org_id=%)',
      v_total_debit, v_total_credit, p_org_id;
  END IF;

  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry has zero value (org_id=%)', p_org_id;
  END IF;

  -- ── Skapa journal-huvud ───────────────────────────────────────────────────
  INSERT INTO journal_entries (
    org_id, entry_date, description, currency,
    type, reference, idempotency_key, status
  )
  VALUES (
    p_org_id, p_entry_date, p_description, p_currency,
    p_type, p_reference, p_idempotency_key, 'DRAFT'
  )
  RETURNING * INTO v_entry;

  -- ── Skapa alla rader atomiskt i samma transaktion ─────────────────────────
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO journal_lines (
      entry_id, account_code, debit_minor, credit_minor, description, org_id
    )
    VALUES (
      v_entry.id,
      v_line->>'account_code',
      COALESCE((v_line->>'debit_minor')::BIGINT, 0),
      COALESCE((v_line->>'credit_minor')::BIGINT, 0),
      v_line->>'description',
      p_org_id
    );
  END LOOP;

  RETURN v_entry;
END;
$$;

-- ============================================================
-- Atomic Mission Assignment (race condition fix)
-- Returnerar NULL om missionen inte längre är OPEN
-- ============================================================

CREATE OR REPLACE FUNCTION assign_mission(
  p_mission_id     UUID,
  p_zoomer_id      UUID
) RETURNS missions
LANGUAGE plpgsql
AS $$
DECLARE
  v_mission missions;
BEGIN
  UPDATE missions
  SET
    status                  = 'ASSIGNED',
    assigned_photographer_id = p_zoomer_id,
    assigned_at             = NOW(),
    updated_at              = NOW()
  WHERE id = p_mission_id
    AND status = 'OPEN'
  RETURNING * INTO v_mission;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission % is not available for assignment (already assigned or does not exist)', p_mission_id;
  END IF;

  -- Logga event atomiskt
  INSERT INTO mission_events (
    mission_id, event_type, from_status, to_status,
    actor_id, actor_type
  ) VALUES (
    p_mission_id, 'ASSIGNED', 'OPEN', 'ASSIGNED',
    p_zoomer_id, 'ZOOMER'
  );

  RETURN v_mission;
END;
$$;
