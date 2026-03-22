-- ============================================================
-- 36_new_tables_2026.sql
-- New tables created 2026-03-22 by agents during pixdrift session
-- Covers: notifications, pix_events, checkin, vehicle intake,
--         rental/mobility, bookings, quality programs, SWEDAC,
--         fluid management
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  user_id    uuid,
  type       text NOT NULL DEFAULT 'system',
  title      text NOT NULL,
  body       text,
  read       boolean NOT NULL DEFAULT false,
  link       text,
  data       jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- PIX EVENTS (audit trail / event sourcing)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pix_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  event_type  text NOT NULL,
  entity_id   uuid,
  entity_type text,
  data        jsonb DEFAULT '{}',
  actor_id    uuid,
  emitted_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- CHECKIN SESSIONS (digital customer check-in)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  session_token       text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  customer_name       text,
  customer_phone      text,
  customer_email      text,
  vehicle_reg         text,
  vehicle_vin         text,
  booking_id          uuid,
  work_order_id       uuid,
  checkin_method      text,
  key_location        text,
  key_number          text,
  mileage_at_checkin  integer,
  fuel_level_at_checkin integer,
  photos              text[] DEFAULT '{}',
  customer_notes      text,
  agreed_to_terms     boolean DEFAULT false,
  digital_signature   text,
  status              text DEFAULT 'PENDING',
  pix_events          jsonb DEFAULT '[]',
  integration_source  text,
  external_reference  text,
  created_at          timestamptz DEFAULT now(),
  completed_at        timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- CHECKIN INTEGRATIONS (DMS/booking system connectors)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_integrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  integration_type    text NOT NULL,
  display_name        text NOT NULL,
  api_endpoint        text,
  api_key_encrypted   text,
  webhook_secret      text,
  config              jsonb DEFAULT '{}',
  is_active           boolean DEFAULT true,
  last_ping_at        timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- VEHICLE INTAKE SESSIONS (technician intake protocol)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_intake_sessions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     uuid NOT NULL,
  work_order_id              uuid NOT NULL,
  technician_id              uuid NOT NULL,
  vehicle_reg                text NOT NULL,
  vehicle_vin                text,
  photos                     jsonb DEFAULT '{}',
  photos_completed_at        timestamptz,
  photos_accepted_by         uuid,
  diagnostic_tool_id         text,
  diagnostic_tool_name       text,
  vin_verified               boolean DEFAULT false,
  connection_timestamp       timestamptz,
  manufacturer_session_id    text,
  odometer_at_connect        integer,
  fault_codes                jsonb DEFAULT '[]',
  diagnostic_raw_data        jsonb,
  diagnostic_protocol_pdf_url text,
  diagnostic_completed_at    timestamptz,
  recalls_checked_at         timestamptz,
  open_recalls               jsonb DEFAULT '[]',
  campaigns                  jsonb DEFAULT '[]',
  status                     text DEFAULT 'NOT_STARTED',
  started_at                 timestamptz DEFAULT now(),
  completed_at               timestamptz,
  pix_events                 jsonb DEFAULT '[]'
);

-- ─────────────────────────────────────────────────────────────
-- VEHICLE RECALL CONSENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_recall_consents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  booking_id            uuid,
  work_order_id         uuid,
  vehicle_reg           text NOT NULL,
  vehicle_vin           text,
  recall_id             text NOT NULL,
  recall_title          text NOT NULL,
  recall_description    text,
  estimated_time_hours  numeric,
  estimated_cost        numeric DEFAULT 0,
  customer_name         text,
  customer_phone        text,
  customer_consented    boolean,
  consented_at          timestamptz,
  consent_method        text,
  consent_signature     text,
  created_at            timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- EXIT CAPTURES (post-delivery customer experience capture)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exit_captures (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  work_order_id           uuid NOT NULL,
  vehicle_reg             text,
  customer_name           text,
  customer_phone          text,
  trigger_type            text,
  issue_resolved          boolean,
  took_longer_than_expected boolean,
  something_unclear       boolean,
  wants_followup          boolean,
  unresolved_reason       text,
  delay_reason            text,
  unclear_what            text,
  payment_completed_at    timestamptz,
  is_returning_customer   boolean,
  days_since_last_visit   integer,
  pix_type                text,
  deviation_severity      text,
  requires_followup       boolean DEFAULT false,
  followup_handled_by     uuid,
  followup_handled_at     timestamptz,
  capture_started_at      timestamptz DEFAULT now(),
  capture_completed_at    timestamptz,
  pix_events              jsonb DEFAULT '[]'
);

-- ─────────────────────────────────────────────────────────────
-- MISSING PART INCIDENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missing_part_incidents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  work_order_id           uuid NOT NULL,
  vehicle_reg             text NOT NULL,
  customer_name           text,
  customer_phone          text,
  customer_email          text,
  part_number             text,
  part_description        text NOT NULL,
  part_supplier           text,
  part_ordered_at         timestamptz,
  part_eta                timestamptz,
  part_confirmed_eta      timestamptz,
  part_arrived_at         timestamptz,
  customer_notified_at    timestamptz,
  notification_method     text,
  customer_acknowledged   boolean DEFAULT false,
  customer_acknowledged_at timestamptz,
  new_appointment_at      timestamptz,
  compensation_type       text,
  compensation_value      numeric,
  compensation_description text,
  compensation_sent_at    timestamptz,
  status                  text DEFAULT 'DETECTED',
  detected_by             uuid,
  ops_lead_notified_at    timestamptz,
  pix_events              jsonb DEFAULT '[]',
  created_at              timestamptz DEFAULT now(),
  resolved_at             timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- RENTAL INTEGRATIONS (rental partner connections)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_integrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  provider            text NOT NULL,
  display_name        text NOT NULL,
  api_key_encrypted   text,
  api_endpoint        text,
  account_id          text,
  location_id         text,
  is_active           boolean DEFAULT true,
  config              jsonb DEFAULT '{}',
  last_sync_at        timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- RENTAL OFFERS (offered replacement vehicles)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_offers (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid NOT NULL,
  missing_part_incident_id  uuid,
  work_order_id             uuid NOT NULL,
  customer_name             text,
  customer_phone            text,
  customer_email            text,
  provider                  text NOT NULL,
  vehicle_class             text,
  vehicle_make              text,
  vehicle_model             text,
  vehicle_reg               text,
  vehicle_year              integer,
  daily_rate                numeric,
  customer_cost             numeric DEFAULT 0,
  pickup_date               timestamptz,
  return_date               timestamptz,
  pickup_location           text,
  external_reservation_id   text,
  status                    text DEFAULT 'OFFERED',
  offered_at                timestamptz DEFAULT now(),
  accepted_at               timestamptz,
  booked_at                 timestamptz,
  customer_response_method  text,
  pix_events                jsonb DEFAULT '[]',
  created_at                timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- COMPENSATION RULES (automatic compensation logic)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compensation_rules (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid NOT NULL,
  rule_name                   text NOT NULL,
  trigger_type                text NOT NULL,
  min_delay_hours             numeric,
  max_delay_hours             numeric,
  compensation_type           text NOT NULL,
  compensation_value          numeric,
  rental_vehicle_class        text,
  rental_covered_days         integer DEFAULT 1,
  rental_provider_preference  text,
  auto_notify_customer        boolean DEFAULT true,
  auto_book_rental            boolean DEFAULT false,
  customer_sms_template       text,
  is_active                   boolean DEFAULT true,
  priority                    integer DEFAULT 0,
  created_at                  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- MOBILITY INCIDENTS (roadside / tow incidents)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobility_incidents (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid NOT NULL,
  vehicle_reg                 text NOT NULL,
  vehicle_vin                 text,
  vehicle_make                text,
  vehicle_model               text,
  vehicle_year                integer,
  customer_name               text,
  customer_phone              text,
  incident_location           text,
  incident_lat                numeric,
  incident_lng                numeric,
  issue_type                  text,
  urgency                     text DEFAULT 'NORMAL',
  customer_description        text,
  tow_provider                text,
  tow_provider_phone          text,
  tow_ordered_at              timestamptz,
  tow_eta                     timestamptz,
  tow_cost_estimate           numeric,
  tow_actual_cost             numeric,
  vehicle_collected_at        timestamptz,
  vehicle_delivered_at        timestamptz,
  receiving_workshop_id       uuid,
  receiving_workshop_name     text,
  work_order_id               uuid,
  responsibility_party        text,
  responsibility_reason       text,
  responsibility_determined_at timestamptz,
  responsibility_evidence     jsonb DEFAULT '{}',
  total_cost                  numeric DEFAULT 0,
  cost_split                  jsonb DEFAULT '{}',
  claim_id                    text,
  claim_submitted_at          timestamptz,
  claim_approved_at           timestamptz,
  claim_rejected_at           timestamptz,
  claim_amount                numeric,
  claim_paid_at               timestamptz,
  status                      text DEFAULT 'INCIDENT_CREATED',
  pix_events                  jsonb DEFAULT '[]',
  created_at                  timestamptz DEFAULT now(),
  resolved_at                 timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- TOW PROVIDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tow_providers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  name                  text NOT NULL,
  phone                 text NOT NULL,
  coverage_areas        text[],
  average_eta_minutes   integer,
  hourly_rate           numeric,
  base_fee              numeric,
  per_km_rate           numeric,
  is_preferred          boolean DEFAULT false,
  is_active             boolean DEFAULT true,
  api_endpoint          text,
  api_key_encrypted     text,
  created_at            timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- BOOKING CAPACITY (technician calendar capacity)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_capacity (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  technician_id     uuid NOT NULL,
  date              date NOT NULL,
  work_start        time NOT NULL DEFAULT '08:00:00',
  work_end          time NOT NULL DEFAULT '17:00:00',
  total_minutes     integer,
  booked_minutes    integer DEFAULT 0,
  buffer_minutes    integer DEFAULT 30,
  available_skills  text[] DEFAULT '{}',
  is_vacation       boolean DEFAULT false,
  is_sick           boolean DEFAULT false,
  is_training       boolean DEFAULT false,
  note              text,
  UNIQUE (org_id, technician_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- BOOKINGS (workshop bookings / appointments)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid NOT NULL,
  service_type              text NOT NULL,
  service_description       text,
  vehicle_reg               text,
  vehicle_make              text,
  vehicle_model             text,
  vehicle_year              integer,
  customer_name             text,
  customer_phone            text NOT NULL,
  customer_email            text,
  customer_preference       text,
  preferred_date            date,
  allocated_technician_id   uuid,
  allocated_technician_name text,
  allocated_date            date,
  allocated_start           time,
  allocated_end             time,
  estimated_minutes         integer,
  estimate_basis            text,
  estimate_confidence       integer,
  delay_risk_pct            integer,
  delay_risk_reason         text,
  required_skills           text[],
  required_parts            text[],
  parts_pre_ordered         boolean DEFAULT false,
  status                    text DEFAULT 'PENDING',
  confirmation_sent_at      timestamptz,
  reminder_sent_at          timestamptz,
  overbooking_slot          boolean DEFAULT false,
  smart_buffer_added        integer DEFAULT 0,
  pix_events                jsonb DEFAULT '[]',
  created_at                timestamptz DEFAULT now(),
  confirmed_at              timestamptz,
  completed_at              timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- SERVICE TIME ESTIMATES (ML-based time estimates per service)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_time_estimates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL,
  service_type     text NOT NULL,
  vehicle_make     text,
  median_minutes   integer NOT NULL,
  p80_minutes      integer,
  p95_minutes      integer,
  sample_count     integer DEFAULT 0,
  last_updated     timestamptz DEFAULT now(),
  standard_minutes integer NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- QUALITY PROGRAMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_programs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL,
  name                     text NOT NULL,
  description              text,
  program_type             text NOT NULL,
  frequency                text NOT NULL,
  target_count_per_cycle   integer DEFAULT 1,
  rotation_mode            text DEFAULT 'RANDOM',
  exclude_self_check       boolean DEFAULT true,
  checklist                jsonb DEFAULT '[]',
  fail_threshold_pct       integer DEFAULT 20,
  trend_window_days        integer DEFAULT 30,
  external_body            text,
  external_contact_email   text,
  external_reference       text,
  auto_submit_to_external  boolean DEFAULT false,
  is_active                boolean DEFAULT true,
  created_at               timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- QUALITY CHECKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_checks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  program_id        uuid NOT NULL,
  inspector_id      uuid NOT NULL,
  inspector_name    text NOT NULL,
  subject_id        uuid,
  subject_name      text,
  work_order_id     uuid,
  vehicle_reg       text,
  check_date        date NOT NULL DEFAULT CURRENT_DATE,
  due_date          date,
  status            text DEFAULT 'ASSIGNED',
  responses         jsonb DEFAULT '[]',
  total_items       integer DEFAULT 0,
  passed_items      integer DEFAULT 0,
  failed_items      integer DEFAULT 0,
  critical_fails    integer DEFAULT 0,
  score_pct         integer,
  findings          text,
  corrective_actions text[],
  pix_type          text,
  pix_events        jsonb DEFAULT '[]',
  assigned_at       timestamptz DEFAULT now(),
  started_at        timestamptz,
  completed_at      timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- QUALITY ACTION PLANS (CAPA)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_action_plans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  trigger_type            text,
  source_check_id         uuid,
  source_rca_id           uuid,
  title                   text NOT NULL,
  description             text,
  root_cause              text,
  actions                 jsonb DEFAULT '[]',
  owner_id                uuid NOT NULL,
  owner_name              text NOT NULL,
  status                  text DEFAULT 'OPEN',
  verification_date       date,
  verified_by             uuid,
  effectiveness_rating    integer,
  recurrence_count        integer DEFAULT 0,
  affected_mechanic_id    uuid,
  affected_mechanic_name  text,
  trend_data              jsonb,
  created_at              timestamptz DEFAULT now(),
  completed_at            timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- QUALITY TRENDS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_trends (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  trend_type              text NOT NULL,
  affected_entity         text,
  affected_entity_id      uuid,
  window_days             integer DEFAULT 30,
  sample_count            integer,
  fail_rate_pct           integer,
  previous_fail_rate_pct  integer,
  trend_direction         text,
  action_plan_id          uuid,
  acknowledged_at         timestamptz,
  detected_at             timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- EXTERNAL AUDIT SUBMISSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_audit_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  quality_check_id  uuid NOT NULL,
  external_body     text NOT NULL,
  submission_method text NOT NULL,
  submitted_at      timestamptz DEFAULT now(),
  status            text DEFAULT 'SENT',
  external_ref      text,
  response          jsonb
);

-- ─────────────────────────────────────────────────────────────
-- SWEDAC CALIBRATION RECORDS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swedac_calibration_records (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        uuid NOT NULL,
  equipment_name                text NOT NULL,
  equipment_type                text,
  equipment_id                  text NOT NULL,
  manufacturer                  text,
  model                         text,
  calibrated_by                 text NOT NULL,
  calibration_lab_accreditation text,
  calibration_date              date NOT NULL,
  valid_until                   date NOT NULL,
  calibration_certificate_url   text,
  traceable_to                  text DEFAULT 'RISE (SP Technical Research Institute of Sweden)',
  measurement_uncertainty       text,
  status                        text DEFAULT 'VALID',
  reminder_days_before          integer DEFAULT 60,
  reminder_sent_at              timestamptz,
  notes                         text,
  created_at                    timestamptz DEFAULT now(),
  updated_at                    timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- SWEDAC COMPETENCE RECORDS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swedac_competence_records (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  technician_id           uuid NOT NULL,
  technician_name         text NOT NULL,
  competence_type         text NOT NULL,
  certificate_name        text NOT NULL,
  certificate_number      text,
  issuing_body            text NOT NULL,
  issue_date              date NOT NULL,
  valid_until             date,
  certificate_url         text,
  verified_by             text,
  verified_at             timestamptz,
  status                  text DEFAULT 'ACTIVE',
  is_swedac_requirement   boolean DEFAULT false,
  swedac_requirement_ref  text,
  created_at              timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- IMPARTIALITY DECLARATIONS (ISO 17020 requirement)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impartiality_declarations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  declarer_id           uuid NOT NULL,
  declarer_name         text NOT NULL,
  declarer_role         text NOT NULL,
  declaration_type      text,
  conflicts_identified  boolean DEFAULT false,
  conflict_description  text,
  mitigation_taken      text,
  owns_shares_in        text[],
  signed_at             timestamptz NOT NULL DEFAULT now(),
  valid_until           date,
  document_url          text,
  created_at            timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- SWEDAC COMPLIANCE ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swedac_compliance_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  standard              text NOT NULL,
  clause                text NOT NULL,
  requirement_text      text NOT NULL,
  requirement_category  text,
  status                text DEFAULT 'NOT_ASSESSED',
  evidence_description  text,
  evidence_url          text,
  gap_description       text,
  action_required       text,
  action_owner          text,
  action_due            date,
  last_assessed_at      timestamptz,
  last_assessed_by      text,
  created_at            timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- FLUID INTEGRATIONS (fluid management system connectors)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fluid_integrations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL,
  provider               text NOT NULL,
  display_name           text NOT NULL,
  system_type            text DEFAULT 'FLUID_MANAGEMENT',
  api_endpoint           text,
  api_key_encrypted      text,
  device_serial          text,
  location               text,
  sync_mode              text DEFAULT 'WEBHOOK',
  polling_interval_mins  integer DEFAULT 5,
  last_sync_at           timestamptz,
  is_active              boolean DEFAULT true,
  created_at             timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- FLUID DISPENSING EVENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fluid_dispensing_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  integration_id        uuid,
  work_order_id         uuid,
  vehicle_reg           text,
  technician_id         uuid,
  fluid_type            text NOT NULL,
  fluid_name            text,
  fluid_grade           text,
  quantity_liters       numeric NOT NULL,
  unit_price_per_liter  numeric,
  total_cost            numeric,
  dispenser_id          text,
  dispenser_location    text,
  bas_account           text,
  booked_to_work_order  boolean DEFAULT false,
  invoiced              boolean DEFAULT false,
  pix_events            jsonb DEFAULT '[]',
  dispensed_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- FLUID INVENTORY (real-time tank levels)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fluid_inventory (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  integration_id          uuid,
  fluid_type              text NOT NULL,
  fluid_name              text NOT NULL,
  fluid_grade             text,
  current_level_liters    numeric,
  tank_capacity_liters    numeric,
  level_pct               integer,
  reorder_point_liters    numeric DEFAULT 20,
  reorder_quantity_liters numeric DEFAULT 200,
  last_updated            timestamptz DEFAULT now(),
  alert_sent_at           timestamptz
);
