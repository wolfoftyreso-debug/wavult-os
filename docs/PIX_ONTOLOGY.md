# PIX Ontology — The Automotive Operational Graph
*Pixdrift's answer to Palantir Foundry's Ontology*

> Palantir charges €500k+/year for a generic ontology that takes 18 months to configure.
> PIX Ontology ships pre-built for automotive, live on Day 1, at €499/month.

---

## What is an Ontology?

An ontology is a **semantic layer** that maps real-world business entities to data.
Instead of writing SQL, you query by **business meaning**:

- "Which technicians are overloaded today?" — not `SELECT COUNT(*) FROM work_orders GROUP BY technician_id HAVING ...`
- "What parts are at risk this week?" — not a six-table JOIN
- "Which customers haven't returned in 12 months?" — not a correlated subquery

This is the same capability that powers Palantir's AIP (AI Platform) — but Palantir needs
a team of data scientists to build the ontology for your business. PIX Ontology is
**pre-built for automotive workshops** and works out of the box.

---

## Core Objects

### VEHICLE
```
Properties:
  reg             — Registration number (primary human identifier)
  vin             — VIN (17-char unique)
  make            — Manufacturer (Volvo, BMW, VW...)
  model           — Model name
  year            — Year of manufacture
  mileage         — Last recorded mileage (km)
  fuel_type       — petrol | diesel | hybrid | electric
  owner           — → CUSTOMER
  current_status  — checked_in | in_service | awaiting_parts | completed | collected

Links:
  → WORK_ORDER    (has_service)       — all service history
  → CUSTOMER      (owned_by)          — current and historical owners
  → RECALL        (subject_to)        — active OEM recalls
  → INSPECTION    (passed)            — roadworthiness history

PIX Signals:
  vehicle_checked_in       — vehicle arrived at workshop
  vehicle_moved_to_bay     — spatial tracking event
  vehicle_completed        — all work orders closed
  vehicle_collected        — customer picked up
  mileage_updated          — new mileage recorded (triggers service interval analysis)
  recall_detected          — OEM recall match found on check-in
```

### TECHNICIAN
```
Properties:
  name                — Full name
  employee_id         — Internal ID
  specializations     — [ 'brakes', 'diagnostics', 'electrical', 'tyres', 'bodywork' ]
  certifications      — [ 'VW-ISTA', 'Volvo-VIDA', 'ISO-9001-auditor' ]
  current_load_pct    — Calculated: assigned hours today / available hours today × 100
  available_hours     — Hours available today (after absences, breaks)
  avg_efficiency      — Historical: actual_hours / estimated_hours (rolling 30d)
  quality_score       — Derived from: rework rate, customer complaints, QC passes

Links:
  → WORK_ORDER    (assigned_to)       — current and historical jobs
  → SKILL         (certified_in)      — certifications and competencies
  → SHIFT         (working)           — planned shifts

PIX Signals:
  job_started              — technician began work
  job_paused               — work interrupted (parts wait, break, priority shift)
  job_completed            — technician closed the job
  overloaded               — load_pct > 85% — triggers reallocation suggestion
  underutilized            — load_pct < 40% — triggers capacity alert
  efficiency_drop          — avg_efficiency trending down — triggers coaching flag
```

### WORK_ORDER
```
Properties:
  order_number        — Human-readable ID (WO-2026-000123)
  status              — OPEN | IN_PROGRESS | AWAITING_PARTS | AWAITING_APPROVAL | COMPLETED | INVOICED
  type                — annual_service | repair | warranty | recall | tyre_change | diagnostic | bodywork
  priority            — urgent | normal | low
  estimated_hours     — At creation
  actual_hours        — Running clock from PIX signals
  promised_date       — Customer commitment datetime
  sla_at_risk         — Boolean: will we miss promised_date based on current velocity?
  delay_reason        — parts_wait | technician_unavailable | customer_approval | oem_data | unknown

Links:
  → VEHICLE           — which vehicle is being serviced
  → TECHNICIAN        — who is doing the work
  → PART              (requires)      — parts consumed or pending
  → CUSTOMER          (invoiced_to)   — who pays
  → WORKFLOW_INSTANCE (guided_by)     — if a workflow template was used

PIX Signals:
  job_created              — new work order opened
  job_assigned             — technician assigned
  in_progress              — work started (from technician signal)
  parts_wait_started       — paused waiting for parts
  parts_wait_ended         — parts arrived, work resumes
  customer_approval_sent   — approval request dispatched
  customer_approval_received — customer responded
  delayed                  — actual > estimated by > 20% or SLA at risk
  completed                — all steps done
  invoiced                 — invoice issued
  warranty_flagged         — warranty claim triggered
```

### PART
```
Properties:
  part_number         — OEM or aftermarket number
  description         — Human-readable
  make_compatibility  — [ 'Volvo', 'BMW', 'generic' ]
  stock_qty           — Current quantity in stock
  reorder_point       — Quantity at which reorder triggers
  reorder_qty         — How many to order
  unit_cost           — Purchase cost (EUR)
  selling_price       — Customer invoice price
  location            — Shelf/bin location in workshop
  supplier            — → SUPPLIER
  lead_time_days      — Typical delivery time

Links:
  → WORK_ORDER        (used_in)       — consumption history
  → SUPPLIER          (sourced_from)  — preferred supplier
  → REORDER_EVENT     (triggered)     — ordering history

PIX Signals:
  part_reserved            — reserved for a work order (stock reserved, not yet consumed)
  part_consumed            — physically used (stock decremented)
  stock_low                — stock_qty <= reorder_point
  reorder_triggered        — automatic or manual reorder initiated
  part_arrived             — delivery received
  part_shortage_risk       — reserved > available (work order may be delayed)
```

### CUSTOMER
```
Properties:
  name                — Full name or company name
  contact             — email, phone, preferred_channel
  vehicles[]          — → VEHICLE (owns)
  lifetime_value      — Total invoiced (all time)
  visit_count         — Number of completed service visits
  last_visit          — Date of last completed work order
  satisfaction_score  — Average from feedback (0–100)
  churn_risk          — low | medium | high (calculated from recency + frequency)
  segment             — fleet | private | vip | warranty_only

Links:
  → VEHICLE           (owns)          — one or more vehicles
  → WORK_ORDER        (billed_for)    — all invoiced work orders
  → FEEDBACK          (gave)          — satisfaction responses

PIX Signals:
  checked_in               — customer or vehicle arrived
  notified                 — status update sent (SMS/email)
  approval_requested       — customer approval needed for additional work
  invoice_sent             — invoice dispatched
  payment_received         — payment confirmed
  feedback_received        — post-service feedback captured
  churn_risk_elevated      — 9+ months since last visit + no booking
```

### SUPPLIER
```
Properties:
  name                — Supplier name
  type                — oem | aftermarket | consumables
  lead_time_days      — Standard delivery time
  reliability_score   — On-time delivery % (rolling 90d)
  account_number      — Our account reference
  contact             — rep name, email, phone

Links:
  → PART              (supplies)      — parts catalog
  → REORDER_EVENT     (fulfilled)     — order history

PIX Signals:
  order_placed             — reorder sent to supplier
  order_confirmed          — supplier acknowledged
  delivery_late            — expected date passed without delivery
  delivery_received        — parts arrived and checked in
```

---

## Semantic Queries

What the PIX Intelligence Engine can answer — in plain language, without SQL:

```
Technician Queries:
  "Which technicians are overloaded today?"
  → TECHNICIAN.current_load_pct > 85, ordered by load_pct DESC

  "Who has capacity to take on an urgent job right now?"
  → TECHNICIAN.current_load_pct < 60 AND TECHNICIAN.specializations matches job.type

  "Which technician has the lowest quality score this month?"
  → TECHNICIAN.quality_score, rolling 30d

Part / Inventory Queries:
  "What parts are at risk of running out this week?"
  → PART.stock_qty <= reorder_point + (open WORK_ORDERS.parts_needed in next 7 days)

  "Which parts are causing the most delays?"
  → PIX signals: parts_wait_started frequency by part_number, last 30d

  "What should we reorder today?"
  → PART where stock_qty <= reorder_point, no pending order

Work Order Queries:
  "Which jobs are at risk of missing their promised time today?"
  → WORK_ORDER.sla_at_risk = true AND status != COMPLETED

  "What is causing the most delays across all open jobs?"
  → WORK_ORDER.delay_reason aggregation, current month

  "Show me all jobs waiting longer than 4 hours for parts"
  → WORK_ORDER.status = AWAITING_PARTS AND parts_wait_started > 4h ago

Customer Queries:
  "Which customers haven't returned in 12 months?"
  → CUSTOMER.last_visit < today - 365d AND no future booking

  "Who are our highest-value customers at churn risk?"
  → CUSTOMER.lifetime_value > median AND churn_risk = high

  "Which customers are waiting for approval right now?"
  → CUSTOMER where linked WORK_ORDER.status = AWAITING_APPROVAL

Revenue / Operations:
  "What's our projected revenue for this week?"
  → Open WORK_ORDERS × avg invoice value by type

  "Which job types have the highest profitability?"
  → (selling_price - parts_cost - technician_cost) by work_type, last 90d

  "What would happen to capacity if we added one technician?"
  → Simulation: redistribute WORK_ORDER load
```

---

## Ontology vs Raw Database

| Approach | Query | Who can use it |
|---------|-------|----------------|
| Raw SQL | `SELECT t.name, COUNT(wo.id) as jobs, SUM(wo.estimated_hours) as load...` | Data engineer |
| PIX Ontology | `"Who is overloaded today?"` | Workshop owner, AI agent |
| Palantir AIP | Same as PIX but €500k setup | Fortune 500 |

---

## Implementation Notes

The PIX Ontology is not a separate database — it's a **semantic interpretation layer**
over the existing Supabase tables:

```
PIX Object     → Supabase Table(s)
─────────────────────────────────────────
VEHICLE        → vehicles
TECHNICIAN     → users (role=TECHNICIAN) + personnel
WORK_ORDER     → work_orders
PART           → parts_inventory
CUSTOMER       → automotive_crm_contacts
SUPPLIER       → supplier_contacts (via supplier-management)
```

PIX Signals are emitted via the existing event system (`entity_events` table) and
consumed by the Intelligence Engine to answer semantic queries.

---

## Competitive Moat

1. **Pre-built** — No data scientists or setup required. Automotive domain baked in.
2. **Signal-native** — Real-time via PIX signals, not batch analytics.
3. **Action-linked** — Every insight connects to a suggested action (Systemförslag).
4. **SMB-priced** — €499/month vs Palantir's €500k/year minimum.
5. **Extensible** — New objects (RECALL, FLEET, INSURANCE) can be added without breaking existing queries.

---

*PIX Ontology v1.0 — March 2026*
*Classified: Pixdrift Internal — Competitive Strategy*
