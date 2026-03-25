-- ============================================================
-- 37_indexes_2026.sql
-- Indexes for all new tables created 2026-03-22
-- ============================================================

-- ─── notifications ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_org_id    ON notifications (org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications (org_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications (created_at DESC);

-- ─── pix_events ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pix_events_org_id       ON pix_events (org_id);
CREATE INDEX IF NOT EXISTS idx_pix_events_entity        ON pix_events (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_pix_events_event_type    ON pix_events (event_type);
CREATE INDEX IF NOT EXISTS idx_pix_events_emitted_at    ON pix_events (emitted_at DESC);

-- ─── checkin_sessions ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checkin_sessions_org_id       ON checkin_sessions (org_id);
CREATE INDEX IF NOT EXISTS idx_checkin_sessions_token        ON checkin_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_checkin_sessions_work_order   ON checkin_sessions (work_order_id);
CREATE INDEX IF NOT EXISTS idx_checkin_sessions_vehicle_reg  ON checkin_sessions (vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_checkin_sessions_status       ON checkin_sessions (status);

-- ─── checkin_integrations ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checkin_integrations_org_id   ON checkin_integrations (org_id);
CREATE INDEX IF NOT EXISTS idx_checkin_integrations_active   ON checkin_integrations (org_id, is_active) WHERE is_active = true;

-- ─── vehicle_intake_sessions ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vis_org_id           ON vehicle_intake_sessions (org_id);
CREATE INDEX IF NOT EXISTS idx_vis_work_order_id    ON vehicle_intake_sessions (work_order_id);
CREATE INDEX IF NOT EXISTS idx_vis_technician_id    ON vehicle_intake_sessions (technician_id);
CREATE INDEX IF NOT EXISTS idx_vis_vehicle_reg      ON vehicle_intake_sessions (vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_vis_status           ON vehicle_intake_sessions (status);

-- ─── vehicle_recall_consents ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vrc_org_id           ON vehicle_recall_consents (org_id);
CREATE INDEX IF NOT EXISTS idx_vrc_booking_id       ON vehicle_recall_consents (booking_id);
CREATE INDEX IF NOT EXISTS idx_vrc_work_order_id    ON vehicle_recall_consents (work_order_id);
CREATE INDEX IF NOT EXISTS idx_vrc_vehicle_reg      ON vehicle_recall_consents (vehicle_reg);

-- ─── exit_captures ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exit_captures_org_id        ON exit_captures (org_id);
CREATE INDEX IF NOT EXISTS idx_exit_captures_work_order_id ON exit_captures (work_order_id);
CREATE INDEX IF NOT EXISTS idx_exit_captures_requires_followup ON exit_captures (org_id, requires_followup) WHERE requires_followup = true;

-- ─── missing_part_incidents ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mpi_org_id          ON missing_part_incidents (org_id);
CREATE INDEX IF NOT EXISTS idx_mpi_work_order_id   ON missing_part_incidents (work_order_id);
CREATE INDEX IF NOT EXISTS idx_mpi_vehicle_reg     ON missing_part_incidents (vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_mpi_status          ON missing_part_incidents (status);
CREATE INDEX IF NOT EXISTS idx_mpi_created_at      ON missing_part_incidents (created_at DESC);

-- ─── rental_integrations ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rental_integrations_org_id  ON rental_integrations (org_id);
CREATE INDEX IF NOT EXISTS idx_rental_integrations_active  ON rental_integrations (org_id, is_active) WHERE is_active = true;

-- ─── rental_offers ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rental_offers_org_id      ON rental_offers (org_id);
CREATE INDEX IF NOT EXISTS idx_rental_offers_incident_id ON rental_offers (missing_part_incident_id);
CREATE INDEX IF NOT EXISTS idx_rental_offers_work_order  ON rental_offers (work_order_id);
CREATE INDEX IF NOT EXISTS idx_rental_offers_status      ON rental_offers (status);

-- ─── compensation_rules ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_compensation_rules_org_id       ON compensation_rules (org_id);
CREATE INDEX IF NOT EXISTS idx_compensation_rules_active       ON compensation_rules (org_id, is_active, priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_compensation_rules_trigger_type ON compensation_rules (trigger_type);

-- ─── mobility_incidents ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mobility_incidents_org_id      ON mobility_incidents (org_id);
CREATE INDEX IF NOT EXISTS idx_mobility_incidents_vehicle_reg ON mobility_incidents (vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_mobility_incidents_work_order  ON mobility_incidents (work_order_id);
CREATE INDEX IF NOT EXISTS idx_mobility_incidents_status      ON mobility_incidents (status);
CREATE INDEX IF NOT EXISTS idx_mobility_incidents_created_at  ON mobility_incidents (created_at DESC);

-- ─── tow_providers ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tow_providers_org_id   ON tow_providers (org_id);
CREATE INDEX IF NOT EXISTS idx_tow_providers_active   ON tow_providers (org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tow_providers_preferred ON tow_providers (org_id, is_preferred) WHERE is_preferred = true;

-- ─── booking_capacity ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_booking_capacity_org_id       ON booking_capacity (org_id);
CREATE INDEX IF NOT EXISTS idx_booking_capacity_technician   ON booking_capacity (technician_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_capacity_date         ON booking_capacity (org_id, date);

-- ─── bookings ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_org_id           ON bookings (org_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_reg      ON bookings (vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone   ON bookings (customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_allocated_date   ON bookings (allocated_date);
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id    ON bookings (allocated_technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status           ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at       ON bookings (created_at DESC);

-- ─── service_time_estimates ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ste_org_id        ON service_time_estimates (org_id);
CREATE INDEX IF NOT EXISTS idx_ste_service_make  ON service_time_estimates (org_id, service_type, vehicle_make);

-- ─── quality_programs ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quality_programs_org_id  ON quality_programs (org_id);
CREATE INDEX IF NOT EXISTS idx_quality_programs_active  ON quality_programs (org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quality_programs_type    ON quality_programs (program_type);

-- ─── quality_checks ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quality_checks_org_id      ON quality_checks (org_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_program_id  ON quality_checks (program_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_inspector   ON quality_checks (inspector_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_subject     ON quality_checks (subject_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_work_order  ON quality_checks (work_order_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_status      ON quality_checks (status);
CREATE INDEX IF NOT EXISTS idx_quality_checks_check_date  ON quality_checks (check_date DESC);

-- ─── quality_action_plans ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qap_org_id           ON quality_action_plans (org_id);
CREATE INDEX IF NOT EXISTS idx_qap_owner_id         ON quality_action_plans (owner_id);
CREATE INDEX IF NOT EXISTS idx_qap_source_check     ON quality_action_plans (source_check_id);
CREATE INDEX IF NOT EXISTS idx_qap_status           ON quality_action_plans (status);
CREATE INDEX IF NOT EXISTS idx_qap_mechanic         ON quality_action_plans (affected_mechanic_id);

-- ─── quality_trends ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quality_trends_org_id     ON quality_trends (org_id);
CREATE INDEX IF NOT EXISTS idx_quality_trends_entity     ON quality_trends (affected_entity_id);
CREATE INDEX IF NOT EXISTS idx_quality_trends_detected   ON quality_trends (detected_at DESC);

-- ─── external_audit_submissions ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eas_org_id           ON external_audit_submissions (org_id);
CREATE INDEX IF NOT EXISTS idx_eas_quality_check    ON external_audit_submissions (quality_check_id);
CREATE INDEX IF NOT EXISTS idx_eas_external_body    ON external_audit_submissions (external_body);
CREATE INDEX IF NOT EXISTS idx_eas_status           ON external_audit_submissions (status);

-- ─── swedac_calibration_records ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scr_org_id            ON swedac_calibration_records (org_id);
CREATE INDEX IF NOT EXISTS idx_scr_equipment_id      ON swedac_calibration_records (equipment_id);
CREATE INDEX IF NOT EXISTS idx_scr_valid_until       ON swedac_calibration_records (valid_until);
CREATE INDEX IF NOT EXISTS idx_scr_status            ON swedac_calibration_records (status);

-- ─── swedac_competence_records ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scomp_org_id         ON swedac_competence_records (org_id);
CREATE INDEX IF NOT EXISTS idx_scomp_technician     ON swedac_competence_records (technician_id);
CREATE INDEX IF NOT EXISTS idx_scomp_valid_until    ON swedac_competence_records (valid_until);
CREATE INDEX IF NOT EXISTS idx_scomp_status         ON swedac_competence_records (status);
CREATE INDEX IF NOT EXISTS idx_scomp_swedac_req     ON swedac_competence_records (org_id, is_swedac_requirement) WHERE is_swedac_requirement = true;

-- ─── impartiality_declarations ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_imp_decl_org_id      ON impartiality_declarations (org_id);
CREATE INDEX IF NOT EXISTS idx_imp_decl_declarer    ON impartiality_declarations (declarer_id);
CREATE INDEX IF NOT EXISTS idx_imp_decl_signed_at   ON impartiality_declarations (signed_at DESC);

-- ─── swedac_compliance_items ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sci_org_id        ON swedac_compliance_items (org_id);
CREATE INDEX IF NOT EXISTS idx_sci_standard      ON swedac_compliance_items (standard, clause);
CREATE INDEX IF NOT EXISTS idx_sci_status        ON swedac_compliance_items (status);

-- ─── fluid_integrations ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fluid_integrations_org_id  ON fluid_integrations (org_id);
CREATE INDEX IF NOT EXISTS idx_fluid_integrations_active  ON fluid_integrations (org_id, is_active) WHERE is_active = true;

-- ─── fluid_dispensing_events ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fde_org_id           ON fluid_dispensing_events (org_id);
CREATE INDEX IF NOT EXISTS idx_fde_integration_id   ON fluid_dispensing_events (integration_id);
CREATE INDEX IF NOT EXISTS idx_fde_work_order_id    ON fluid_dispensing_events (work_order_id);
CREATE INDEX IF NOT EXISTS idx_fde_technician_id    ON fluid_dispensing_events (technician_id);
CREATE INDEX IF NOT EXISTS idx_fde_fluid_type       ON fluid_dispensing_events (fluid_type);
CREATE INDEX IF NOT EXISTS idx_fde_dispensed_at     ON fluid_dispensing_events (dispensed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fde_not_invoiced     ON fluid_dispensing_events (org_id, invoiced) WHERE invoiced = false;

-- ─── fluid_inventory ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fluid_inventory_org_id        ON fluid_inventory (org_id);
CREATE INDEX IF NOT EXISTS idx_fluid_inventory_integration   ON fluid_inventory (integration_id);
CREATE INDEX IF NOT EXISTS idx_fluid_inventory_type          ON fluid_inventory (org_id, fluid_type);
CREATE INDEX IF NOT EXISTS idx_fluid_inventory_low_level     ON fluid_inventory (org_id, level_pct) WHERE level_pct IS NOT NULL;
