# EU Compliance Strategy — Pixdrift as Business Infrastructure Layer

*Captured: 2026-03-22 — Strategic positioning document*

---

## The Core Insight

EU is building digital company infrastructure from below.
Pixdrift builds operational infrastructure from above.

**Combined:** Pixdrift becomes the operational OS for EU companies.

---

## What EU is Building (Timeline)

### EU Inc (2026+)
- Single digital company form for all 27 EU countries
- €100 registration fee, 48h, fully online
- "Once-only principle" — submit data once, valid across EU
- Common API layer across all member states

### EU Digital Identity Wallet (EUDI) — Deadline: 2026
- Every company and person gets a digital identity
- Contains: company data, identity, permissions, authorizations
- Direct use against authorities and business systems

### VAT in the Digital Age (ViDA) — 2025-2030 rollout
- Real-time VAT reporting to tax authorities
- E-invoicing becomes mandatory standard
- Full digital traceability required

---

## Strategic Position

**Today:** Businesses operate in systems
**Tomorrow:** Systems operate businesses — and report directly to governments

**Pixdrift formulation:**
> "Pixdrift connects operations to reality — and reality to regulation."

**The edge:**
- EU builds: digital companies
- Pixdrift builds: digital operation of companies
- Combined: Pixdrift becomes the operating layer that makes EU's infrastructure usable

---

## What Pixdrift Must Build

### 1. Company Core (PIX-based)
```
Company Entity
→ legal_entity (org number, legal form)
→ roles (board, CEO, authorized signatories)
→ permissions (what each role can do)
→ documents (articles of association, board minutes)
→ filings (annual reports, VAT, payroll)
→ ownership_structure (shareholders, %s)
```

### 2. Document Engine
All company documents must be:
- Versioned (every change tracked)
- Signed (digital signatures, legally valid)
- Traceable (full audit trail)
- API-ready (exportable to authorities)

Examples: Annual reports, board decisions, ownership changes, power of attorney

### 3. Compliance Engine
System automatically knows:
- What must be submitted
- When
- To whom
- What happens if missed

System tells the user: "You must do this now. Deadline: 3 days."

### 4. Authority API Layer
```
POST /api/company/filing/submit → to Bolagsverket
POST /api/company/vat/report → to Skatteverket
GET /api/company/status → current compliance status
POST /api/company/sign → digital signature via BankID/EUDI
```

---

## Integration Roadmap

### Near term (Sweden)
- Bolagsverket API — company registration and changes
- Skatteverket API — VAT, employer declarations, AGI
- verksamt.se — single entry point for business admin
- BankID — digital signing

### Medium term (EU)
- EU Inc registry — when available (2026+)
- EUDI Wallet — digital identity verification
- ViDA — real-time VAT reporting
- PEPPOL — e-invoicing network (already standardized)

### Long term
- Cross-border operations — single Pixdrift instance for EU-wide company
- Automatic regulatory mapping — Pixdrift knows the rules in each country
- Predictive compliance — "based on your Q3 numbers, you need to file X by Y"

---

## Investor Pitch Angle

**The market:** Every company in EU will be required to have digital identity and real-time reporting by 2030.

**The opportunity:** Nobody is building the operational layer that connects day-to-day business with this new regulatory infrastructure.

**Pixdrift's position:** Not just another SaaS. The operational OS that sits between companies and EU's digital infrastructure.

**Comparable:** Like Stripe was to payments — but for EU business compliance.

---

## The Brutal Bottom Line

This is not a feature.

This is an entirely new layer of the system — and timing is perfect.

Companies don't know they need this yet. By the time they do, Pixdrift will already be the infrastructure.

