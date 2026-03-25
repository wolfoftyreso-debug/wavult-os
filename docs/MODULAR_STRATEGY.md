# Pixdrift Modular Strategy
*Version 1.0 — 2026-03-22*

---

## Core Principle

**Modularitet är en produktstrategi. Microservices är en skalningsstrategi.**

Sell modularity. Build as modular monolith. Extract to microservices under scale pressure.

---

## Architecture Layers

### Layer 1: Pixdrift Core (always included — never modular externally)

```
PIX Event Layer     — the operational source of truth
Ledger              — financial truth, never duplicated
Identity            — users, roles, permissions
Company Core        — legal entity, compliance, ownership
```

This is the foundation. Modules NEVER have their own truth.
Everything writes to central PIX + Ledger.

### Layer 2: Modules (what customers pay for)

| Module | Use case |
|--------|---------|
| Execution | CRM, deals, tasks, team ops |
| Process | ISO, NC, compliance, audit |
| Finance | Accounting, SIE4, banking |
| Workforce | HR, People OS, culture |
| Workshop | DMS, work orders, automotive |
| Rental | PIX-driven availability engine |
| Inventory | Assets, consumables, spatial |
| Intelligence | Control Layer, RCA, PIX Feed |

### Layer 3: Industry Packs (pre-configured bundles)

```
Automotive Pack     — Workshop + Rental + DMS + Cabas
Construction Pack   — Project + Inventory + Compliance + Personnel
Healthcare Pack     — Process + Compliance + Workforce + Documentation  
Restaurant Pack     — Ops + Personnel + Consumables + Culture
Professional Pack   — CRM + Finance + Time + Invoicing
```

Each pack contains:
- Pre-configured PIX flows
- Industry-specific dashboards
- Standard compliance templates
- Ready-to-use reporting

### Layer 4: Intelligence Layer (premium, highest margin)

```
Control Tower        — live operational map
Root Cause Engine    — automated RCA from PIX patterns
PIX Analytics        — flow intelligence, bottleneck prediction
AI Insights          — pattern recognition across PIX history
```

---

## Pricing Model

**What we do NOT sell:**
- ❌ Licenses
- ❌ Per-user seats

**What we sell:**
- ✅ Capacity + function

### Recommended structure:

```
Core Plan           €299/mo   — PIX Core + Identity + 1 Module
Growth Plan         €699/mo   — Core + up to 3 Modules
Operations Plan     €1,299/mo — Core + all Modules + 1 Industry Pack
Enterprise          Custom    — Everything + Intelligence Layer + SLA
```

**Industry Pack add-ons:**
```
Automotive Pack     €299/mo add-on
Construction Pack   €249/mo add-on
Restaurant Pack     €199/mo add-on
```

**Intelligence Layer:**
```
Control Tower       €399/mo add-on
Full Intelligence   €699/mo add-on
```

---

## Go-to-Market: Module Launch Sequence

### Phase 1 (now): Automotive vertical
- Workshop Module → proven, high value, clear ROI
- Rental Module → differentiator, no competitor has it right
- Core + Automotive Pack = €999–1,299/mo

### Phase 2 (month 3-6): Professional services
- Execution + Finance + Process → replaces HubSpot + Fortnox + ISO binders
- Core + Professional Pack = €699–999/mo

### Phase 3 (month 6-12): Intelligence Layer
- Upsell existing customers
- Control Tower = highest margin product
- RCA engine = defensible, AI-powered, sticky

---

## Technical Roadmap (aligned to strategy)

**Phase 1 (now):** Modular monolith, clear domain boundaries (DDD)
**Phase 2 (scale):** Extract: payments, notifications, integrations
**Phase 3 (high-scale):** Separate services: analytics, AI, availability engine

**Rule:** Never break out a service unless there is clear performance or team-scale pressure.

---

## How to Communicate This

### To customers:
> "You start with what you need — and expand as your business grows. Core infrastructure is always included. From there, you add operational modules, industry-specific functionality, and advanced intelligence capabilities. You don't adapt to the system. The system adapts to you."

### To investors:
> "We sell layers of capability, not feature lists. Each layer adds clarity, not complexity. The Intelligence Layer — our highest-margin product — becomes more valuable as more PIX accumulate. This is a compounding business."

### The brutal one-liner:
> "Traditional systems grow by adding features. Pixdrift grows by increasing clarity."

---

## One System. Infinite Configurations.

No migrations. No re-platforming. No rebuilding.
Just continuous expansion — on a structure that already fits.


---

## Role Strategy: The Three Operational Roles

### Mekaniker (Technician)
- Sees: NU / NÄSTA / ATT TÄNKA PÅ / MIN DAG
- Does NOT see: Pipeline, Finance, CRM, Reports
- Principle: "Show the work, not the system"

### Servicerådgivare (Service Advisor) — the key insight
**Old role:** Administrative middleman (booking, reception, paperwork)
**New role (with Pixdrift):** Operational controller + exception manager

What gets automated:
- Booking → online self-service
- Check-in → kiosk / key box / mobile
- Work order → auto-generated from booking
- Status updates → real-time, automatic

What the service advisor does instead:
1. Handle exceptions (overdue, missing parts, waiting customers)
2. Customer relationship (complex cases, upsell, escalations)  
3. Flow control (load balancing, priority decisions)
4. Quality gatekeeping

**How to sell this:**
> "We don't remove roles. We remove unnecessary work."
> "Service advisors shouldn't manage bookings. They should manage reality."

### Manager / CEO
- Full dashboard with PIX Feed, analytics, compliance
- Control Layer access
- Financial overview

---

## Self Check-in Integration Layer

Integration surface (we own the logic, not the hardware):
- Checkvik (SE key boxes)
- iLOQ (FI/SE digital keys)
- CustomerLane (kiosks)
- KeyWatcher (key cabinets)
- QR / Mobile (built-in)
- Custom webhook (any system)

PIX events on check-in:
- vehicle_checked_in
- job_created
- key_dropped
- vehicle_location_updated


---

## The Operations Lead — A New Role in the Workshop

**Not:** Service Advisor, Receptionist, Assistant, Administrator

**Yes:** Operations Lead — the operational control point of the team

### What the Operations Lead does:

1. **Ensures flow** (primary task)
   - Jobs move forward
   - Nothing stalls
   - Right prioritization

2. **Absorbs all friction** (the key function)
   - Missing parts → they handle it
   - Additional work approvals → they handle it
   - Customer contact → they handle it
   - Warranty questions → they handle it
   - The mechanic NEVER leaves the job

3. **System owner in practice**
   - Receives system alerts
   - Responds to exceptions
   - Feeds real operational feedback
   - Trains the PIX intelligence over time

4. **Resource allocation**
   - Moves jobs between technicians
   - Re-prioritizes when needed
   - Balances team load

### The three-layer model:

```
Mechanics    → execution
System       → structure  
Ops Lead     → control
```

### How to sell this role:

> "In traditional systems, service advisors manage administration.
> In Pixdrift, they manage operations."

> "Mechanics should never stop working to look for parts, handle system issues, or chase information. That is handled by the system — and by the Operations Lead."

### The Operations Lead dashboard:

Not 100 cases. Not complicated menus.

Just: **"These require your attention NOW"**

```
⚠️ 4 things to resolve

1. Missing part — Audi A6
2. Additional work approval — BMW 320
3. Delay risk — Volvo XC60
4. Technician overloaded — Robin
```

Done.

### Demo user:
opslead@lindqvistsverkstad.se / Demo2026! → role: OPERATIONS_LEAD
