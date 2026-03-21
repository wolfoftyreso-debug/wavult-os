# pixdrift DMS — VW Group Compatibility Guide
**Version:** 1.0  
**Updated:** 2026-03-21  
**Status:** Shadow Compatibility (not yet live integration)

---

## Overview

This document defines the exact mapping between pixdrift's DMS data model and VW Group's aftersales systems: SAGA2 (warranty), ETKA (parts catalog), ElsaPro (repair procedures), and GOLIA (parts ordering). It is the technical reference for implementing live integrations once the VW Group partner agreement is signed.

---

## 1. SAGA2 Field Mapping (Complete)

SAGA2 = "Service And Guarantee Administration 2" — VW Group's warranty processing system.

### 1.1 Header Fields

| SAGA2 XML Field | Source in pixdrift | Table | Notes |
|-----------------|-------------------|-------|-------|
| `DealerCode` | `vw_dealer_code` | `organizations` | Assigned by VW Group SE. Format: SE-XXXX |
| `ClaimNumber` | `claim_number` | `warranty_claims` | pixdrift generates WC-YYYY-NNNNNN |
| `ClaimType` | `work_orders.work_type` | `work_orders` | Map: WARRANTY→W, RECALL→R, GOODWILL→G |
| `ClaimDate` | `submitted_at` | `warranty_claims` | ISO 8601 date |
| `RepairDate` | `repair_date` | `warranty_claims` | ⚠️ Must be actual repair date, not submission |
| `AuthorizationCode` | Manual entry | — | Required for pre-auth repairs over threshold |

### 1.2 Vehicle Fields

| SAGA2 XML Field | Source in pixdrift | Table | Notes |
|-----------------|-------------------|-------|-------|
| `VIN` | `vehicle_vin` | `warranty_claims` | 17-char ISO 3779 VIN |
| `MileageAtRepair` | `mileage_at_repair` | `warranty_claims` | km at time of repair — ⚠️ ADDED in migration 33 |
| `PRNumber` | `pr_number` | `warranty_claims` | Production range from factory build |
| `ModelYear` | `model_year` | `vehicles` | 4-digit year |

### 1.3 Fault Codes (Critical — all mandatory)

| SAGA2 XML Field | Source in pixdrift | Notes |
|-----------------|-------------------|-------|
| `DTC[@code]` | `dtc_codes[]` | OBD-II / UDS format, e.g. "P0301". ADDED in migration 33. |
| `SymptomCode` | `symptom_codes[0]` | VW symptom code, e.g. "E0002" (engine rough). ADDED in migration 33. |
| `ComplaintCode` | `complaint_code` | Customer-reported complaint code. ADDED in migration 33. |
| `CauseCode` | `cause_code` | Root cause code from VW fault taxonomy. ADDED in migration 33. |
| `CorrectionCode` | `correction_code` | Corrective action code. ADDED in migration 33. |

**VW Fault Code Structure:**
```
E-codes: Symptoms from technician perspective  (E0001 = engine doesn't start)
CC-codes: Customer complaint codes             (CC-103 = noise from engine)
CA-codes: Cause codes                          (CA-047 = faulty injector)
CO-codes: Correction codes                     (CO-022 = injector replaced)
```

### 1.4 Labor Operations

| SAGA2 XML Field | Source in pixdrift | Notes |
|-----------------|-------------------|-------|
| `OperationCode` (ArbNr) | `labor_operation_codes[]` | Format: "10-25 00 00 00" (group-subgroup-op) |
| `StandardTimeUnits` | Lookup from ElsaPro | AW units — 1 AW = 5 minutes |
| `ActualTimeUnits` | `labor_time_units` | Actual AW worked. ADDED in migration 33. |
| `TechnicianID` | `technician_vw_id` | VW-registered technician number. ADDED in migration 33. |

**AW Conversion:**
```
decimal hours × 12 = AW units
Example: 2.5 hours = 30 AW
```

**ArbNr Format Examples:**
```
10-25 00 00 00  = Engine — remove/install cylinder head
34-00 12 00 00  = Brakes — replace front brake pads
00-35 40 00 00  = Wheels/Tires — mount and balance
```

### 1.5 Parts

| SAGA2 XML Field | Source in pixdrift | Notes |
|-----------------|-------------------|-------|
| `PartNumber` | `warranty_claims.parts_replaced[].part_number` | Must be OEM part number |
| `Quantity` | `warranty_claims.parts_replaced[].quantity` | Integer |
| `FaultCode` | `part_fault_codes[]` | Per-part fault code. ADDED in migration 33. |
| `UnitCostEUR` | `parts_inventory.price_eur` | EUR, not SEK. ADDED in migration 33. |

### 1.6 SAGA2 XML Template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<WarrantyClaim xmlns="http://saga2.vwgroup.com/warranty/v2"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xsi:schemaLocation="http://saga2.vwgroup.com/warranty/v2 saga2-warranty-v2.xsd">

  <ClaimHeader>
    <DealerCode>{{organizations.vw_dealer_code}}</DealerCode>
    <ClaimNumber>{{warranty_claims.claim_number}}</ClaimNumber>
    <ClaimType>W</ClaimType>
    <ClaimDate>{{warranty_claims.submitted_at | date}}</ClaimDate>
    <RepairDate>{{warranty_claims.repair_date}}</RepairDate>
  </ClaimHeader>

  <Vehicle>
    <VIN>{{warranty_claims.vehicle_vin}}</VIN>
    <MileageAtRepair>{{warranty_claims.mileage_at_repair}}</MileageAtRepair>
    <PRNumber>{{warranty_claims.pr_number}}</PRNumber>
  </Vehicle>

  <FaultAnalysis>
    {{#each warranty_claims.dtc_codes}}
    <DTC code="{{this}}" />
    {{/each}}
    {{#each warranty_claims.symptom_codes}}
    <SymptomCode>{{this}}</SymptomCode>
    {{/each}}
    <ComplaintCode>{{warranty_claims.complaint_code}}</ComplaintCode>
    <CauseCode>{{warranty_claims.cause_code}}</CauseCode>
    <CorrectionCode>{{warranty_claims.correction_code}}</CorrectionCode>
  </FaultAnalysis>

  <LaborOperations>
    {{#each warranty_claims.labor_operation_codes}}
    <Operation>
      <OperationCode>{{this}}</OperationCode>
      <ActualTimeUnits>{{../warranty_claims.labor_time_units}}</ActualTimeUnits>
    </Operation>
    {{/each}}
  </LaborOperations>

  <Parts>
    {{#each warranty_claims.parts_replaced}}
    <Part>
      <PartNumber>{{this.part_number}}</PartNumber>
      <Quantity>{{this.quantity}}</Quantity>
      <FaultCode>{{this.fault_code}}</FaultCode>
    </Part>
    {{/each}}
  </Parts>

  <FinancialSummary>
    <LaborCostEUR>{{labor_cost_eur}}</LaborCostEUR>
    <PartsCostEUR>{{parts_cost_eur}}</PartsCostEUR>
    <TotalClaimEUR>{{total_claim_eur}}</TotalClaimEUR>
  </FinancialSummary>

</WarrantyClaim>
```

---

## 2. ETKA Data Structure Requirements

ETKA = "Elektronischer Teile Katalog" — VW Group's electronic parts catalog.

### 2.1 Required Fields for ETKA Integration

| ETKA Field | Description | pixdrift Location | Status |
|-----------|-------------|-------------------|--------|
| `VIN` | Vehicle Identification Number | `vehicles.vin` | ✅ Present |
| `PR_CODES[]` | Production range codes from factory | `vehicles.pr_numbers[]` | 🔶 Added in migration 33 |
| `CATALOG_PART_NUMBER` | Full OEM part number with dashes | `parts_inventory.part_number` | ✅ Present (format varies) |
| `GROUP_NUMBER` | ETKA assembly group (2-digit) | `parts_inventory.oem_group_number` | 🔶 Added in migration 33 |
| `SUB_GROUP` | ETKA sub-group | `parts_inventory.oem_sub_group` | 🔶 Added in migration 33 |
| `NET_PRICE_EUR` | Dealer net price in EUR | `parts_inventory.price_eur` | 🔶 Added in migration 33 |
| `AVAILABILITY` | IN_STOCK / CENTRAL_WAREHOUSE / ORDER | `parts_inventory.etka_availability` | 🔶 Added in migration 33 |
| `SUPERSEDED_BY` | Replacement part number | `parts_inventory.superseded_by` | 🔶 Added in migration 33 |
| `SUPERSEDES` | Previous part number | `parts_inventory.supersedes` | 🔶 Added in migration 33 |

### 2.2 ETKA Assembly Groups Reference

```
10  Engine
12  Engine lubrication
15  Cooling
16  Fuel system
17  Exhaust system
18  Fuel injection
19  Engine electrics
25  Transmission
26  Axle drive
30  Brakes
33  Wheels/Tyres
40  Front suspension
42  Rear suspension
44  Steering
47  Anti-lock braking
48  Brake hydraulics
50  Body
60  Body interior
65  Seats
70  Windshield/Glass
72  Locks/Security
75  Bumpers
80  Electrical system
82  Instruments
87  Radio/Navigation
90  Accessories
```

### 2.3 Part Number Format

VW Group part numbers follow this structure:
```
XXX-YYY-ZZZ-A
│   │   │   └── Revision suffix (optional)
│   │   └────── Part number within group  
│   └────────── Assembly group code
└────────────── Vehicle family prefix (e.g. 1K = Golf 5/6, 3C = Passat B6)
```

Examples:
- `06L-115-403-Q` — oil filter, 2.0 TFSI
- `1K0-698-451-H` — front brake pads, Golf/Jetta
- `3C0-907-049-AH` — throttle body, Passat B6

---

## 3. ElsaPro Integration Requirements

ElsaPro = "Elektronische Service Auskunft" (formerly ELSA) — VW Group's repair guide system.

### 3.1 Key Data from ElsaPro

| Data | Use in pixdrift | Where Stored |
|------|----------------|--------------|
| Standard labor times (AW) | Warranty claim labor_time_units | Cache locally |
| Repair procedure steps | Work order guided workflow | Reference only |
| Technical Service Bulletins (TSB) | Technical alerts on work orders | `recalls` table or new `tsb` table |
| Campaign (recall) codes | Recall management | `recalls.recall_number` |
| Operation codes (ArbNr) | `labor_operation_codes[]` | Cache locally |

### 3.2 ElsaPro Integration Pattern

```
pixdrift                    ElsaPro API
─────────                   ───────────
GET /api/oem/vwgroup/elsa/operation-codes?vin={vin}
                        ──►  POST /elsa/vehicle/operations
                             Body: { vin, model_year, engine_code }
                        ◄──  [{ arbNr, description, standardAW, group }]

GET /api/oem/vwgroup/elsa/tsb?vin={vin}
                        ──►  POST /elsa/vehicle/bulletins
                        ◄──  [{ tsbId, title, mandatory, dateIssued }]
```

### 3.3 Standard AW Cache Strategy

ElsaPro standard times rarely change. Cache locally:
```sql
CREATE TABLE IF NOT EXISTS labor_operation_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL DEFAULT 'VW',
  arb_nr TEXT NOT NULL,              -- "10-25 00 00 00"
  description TEXT NOT NULL,
  standard_aw DECIMAL(6,1) NOT NULL, -- Standard time in AW
  group_number TEXT,
  model_applicability TEXT[],
  valid_from DATE,
  valid_to DATE,
  UNIQUE(manufacturer, arb_nr)
);
```

---

## 4. GOLIA Integration Requirements

GOLIA = VW Group's dealer parts ordering system (successor to KOVP).

### 4.1 GOLIA Order Flow

```
pixdrift                       GOLIA
─────────                      ─────
POST /api/parts/orders ──────► GOLIA order submission
  { part_number, qty,           { dealerCode, orderLines[] }
    vw_dealer_code }
                         ◄───── { orderId, etaDate, netPrice }

PATCH /orders/:id/receive ◄─── GOLIA webhook: parts_arrived
```

### 4.2 GOLIA Required Fields

| Field | Source | Notes |
|-------|--------|-------|
| `DealerCode` | `organizations.vw_dealer_code` | Mandatory |
| `OrderType` | `parts_inventory.supplier` | STOCK / EMERGENCY / WARRANTY |
| `PartNumber` | `parts_inventory.part_number` | Must match ETKA exactly |
| `Quantity` | Order quantity | Integer |
| `DeliveryAddress` | `organizations` address | Dealer's delivery address |
| `CostCenterCode` | Workshop/Parts department | Internal accounting |
| `WorkOrderRef` | `work_orders.order_number` | For warranty parts |

---

## 5. Shadow Compatibility Implementation Plan

### 30-Day Sprint — Internal Only (No VW Access Needed)

**Goal:** Make pixdrift's data model SAGA2-compatible. No live connections yet.

| Task | Effort | Owner | Done? |
|------|--------|-------|-------|
| SQL migration 33 (SAGA2 fields) | 0.5d | Backend | ✅ DONE |
| Work order state machine | 2d | Backend | ❌ |
| Fault code entry on work orders | 2d | Backend + Frontend | ❌ |
| Audit log table + triggers | 3d | Backend | ❌ |
| VW dealer code on organizations | 0.5d | Backend | ❌ |
| AW converter utility function | 0.5d | Backend | ❌ |
| SAGA2 XML generator function | 3d | Backend | ❌ |
| SAGA2 validation (pre-submit check) | 1d | Backend | ❌ |
| ETKA schema additions | 1d | Backend | ❌ |
| Labor operation catalog table | 1d | Backend | ❌ |
| **Total** | **~15 days** | | |

### 60-Day Sprint — Build Integration Shells

**Goal:** Live SAGA2 XML generation, ETKA schema populated manually, VW partner application submitted.

| Task | Effort | Notes |
|------|--------|-------|
| SAGA2 XML export endpoint | 3d | GET /api/oem/vwgroup/warranty-claim/:id/saga2-xml |
| ETKA mock server (local) | 3d | For development without live ETKA |
| ElsaPro operation code CSV import | 2d | Import public-available ArbNr list |
| Currency handling EUR/SEK | 1d | Parts priced in EUR from ETKA |
| VW partner agreement process | Business | 3–6 months pipeline, start NOW |
| Recall completion reporting | 2d | Format to VW portal spec |
| OEM KPI export (VW format XML) | 3d | Monthly KPI to VW Sweden |

### 90-Day Sprint — Live Integration (IF VW Agreement Signed)

| Task | Effort | Dependency |
|------|--------|-----------|
| ETKA live lookup endpoint | 2w | VW API credentials |
| SAGA2 submission (sandbox) | 2w | VW SAGA2 sandbox access |
| ElsaPro live repair procedures | 2w | ElsaPro API credentials |
| GOLIA parts ordering | 1w | GOLIA API credentials |
| Webhook receiver (live events) | 1w | VW webhook endpoint configured |
| Full integration test suite | 2w | All above |
| Prepare for VW technical audit | 4w | Everything above |

---

## 6. What to Build vs What to Stub (Decision Matrix)

| Component | Decision | Reasoning |
|-----------|----------|-----------|
| SAGA2 XML structure | **BUILD NOW** | Can build without VW access. Needed for audit readiness. |
| SAGA2 HTTP submission | **STUB** | Need VW SAGA2 sandbox credentials first. |
| ETKA DB schema | **BUILD NOW** | Can design schema before live access. |
| ETKA live lookup | **STUB** | Need VW ETKA API credentials. |
| ElsaPro ArbNr list | **BUILD (CSV)** | ArbNr codes are semi-public, can import from documentation. |
| ElsaPro live procedures | **STUB** | Need ElsaPro API access. |
| GOLIA ordering | **STUB** | Low priority, needs ETKA first. |
| Audit log | **BUILD NOW** | No VW dependency. Required for certification regardless. |
| State machine | **BUILD NOW** | No VW dependency. |
| Fault code UI | **BUILD NOW** | No VW dependency. |
| PDF documents | **STUB** | Not certification-blocking. |
| BankID | **STUB** | Sales feature, not workshop. |
| Transportstyrelsen | **STUB** | Needs separate agreement, not VW-related. |

---

## 7. VW Group Partner Agreement Process

To get SAGA2/ETKA/ElsaPro access, pixdrift needs:

1. **Dealer network sponsorship** — an existing VW Group dealer must sponsor pixdrift as their DMS provider. Cold approach to VW Group directly rarely works.
2. **Contact:** Volkswagen Group Sverige AB, Marknads & Teknisk Support, Södertälje
   - dealer.integration@volkswagen.de (Germany HQ)
   - Volkswagen Sverige: https://www.vwgroup.se
3. **Documents required:**
   - ISO 27001 or equivalent security documentation
   - GDPR data processing agreement
   - API integration specification (what data pixdrift will read/write)
   - Technical architecture document
   - Test dealer environment setup
4. **Timeline:** 3–6 months from first contact to sandbox access
5. **Costs:** Certification audit fee (approx. €5,000–15,000 depending on scope)

---

## 8. Quick Reference — Common SAGA2 Rejection Reasons

VW Group SAGA2 most frequently rejects claims for:

| Rejection Code | Reason | Fix in pixdrift |
|---------------|--------|----------------|
| ERR-01 | Missing ArbNr | `labor_operation_codes[]` required |
| ERR-02 | AW mismatch | Actual AW > Standard AW × 1.2 (20% tolerance) |
| ERR-03 | Missing DTC code | `dtc_codes[]` required for electrical/software |
| ERR-04 | Part not listed in ETKA | Part number must match ETKA exactly |
| ERR-05 | Outside warranty period | Check `vehicle_contracts.warranty_expires` |
| ERR-06 | Dealer code invalid | `organizations.vw_dealer_code` must be active |
| ERR-07 | VIN not in VW system | Vehicle must be registered in VW's systems |
| ERR-08 | Missing cause code | `cause_code` required |
| ERR-09 | Claim already exists | Duplicate check on VIN + RepairDate + ArbNr |
| ERR-10 | Mileage regression | `mileage_at_repair` must be > last known mileage |

---

*This document is pixdrift's working reference for VW Group DMS integration. Update as agreements progress and API documentation becomes available.*
