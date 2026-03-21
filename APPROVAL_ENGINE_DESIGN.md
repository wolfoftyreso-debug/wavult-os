# Pixdrift — Real-time Customer Approval Engine
## Complete System Design

**Version:** 1.0  
**Date:** 2026-03-21  
**Status:** Production Blueprint

---

## Executive Summary

The Approval Engine transforms a critical revenue bottleneck — waiting for customer decisions on discovered issues — into a frictionless 30-second interaction. Technician films the issue → AI translates to plain Swedish → customer receives SMS → taps Approve → work order advances automatically.

**Target metric:** < 4 minutes from issue discovery to customer approval.  
**Revenue impact:** Capture 40–60% of currently-declined or deferred upsell work through transparent, trust-building video communication.

---

## Phase 1: Issue Discovery & Capture

### Technician UX (Mobile-First)

The technician's workflow must be **zero-friction** — they are under a car, hands potentially dirty, time-pressured.

**Primary flow:**
1. Open work order on mobile
2. Tap "Nytt fynd" (New Finding) — large button, always visible
3. Choose category via 4 large icon buttons: 🔴 Safety / 🟠 Maintenance / 🔵 Preventive / ⚪ Cosmetic
4. Tap Record — back camera opens immediately, no pre-recording setup
5. Talk while filming: "Here you can see the brake pads are at 2mm, limit is 3mm..."
6. Stop — video auto-saves to S3
7. Voice is auto-transcribed in background
8. AI generates customer-friendly message in < 5 seconds
9. Technician confirms price estimate (pre-filled from labor catalog if integrated)
10. Tap "Skicka till kund" — SMS sent, technician returns to work

**Design constraints:**
- Total taps from work order to SMS sent: ≤ 5
- Works offline (queued upload when connection restored)
- Video max duration: 90 seconds (enforced, not suggested)
- Video compression: H.264 ≤ 720p, auto-compressed on device before upload

### Video Infrastructure

```
Device → Pre-signed S3 URL → S3 (eu-north-1) → CloudFront CDN
                                                    ↓
                                              Customer views via CDN
```

- **Storage:** S3 `pixdrift-approvals-prod`, retention policy: 30 days auto-delete
- **Delivery:** CloudFront with signed URLs (expiry matches token_expires_at)
- **Fallback:** If video upload fails, approval still sends with images/text only
- **GDPR:** Videos purged at 30 days; customer can request earlier deletion

---

## Phase 2: AI Translation Engine

### Problem
Technicians speak in technical shorthand. Customers don't understand "bromsbelägg 2mm" but they understand "your brakes are dangerously worn and may fail."

### Translation Pipeline

```
Technician input (voice transcript + category + notes)
        ↓
AI Prompt (GPT-4 / Claude) with Swedish automotive context
        ↓
Structured output:
  - simple_explanation_title: 1 sentence, plain Swedish
  - simple_explanation: 2–3 sentences, no jargon
  - recommended_action: What we suggest and why
  - risk_if_ignored: Concrete consequence (safety/cost/legal)
  - delay_cost_warning: "If this isn't fixed today, it could cost X more"
  - price_estimate_context: "This is typical for this repair"
```

### Fallback (no AI configured)
Rule-based templates by category:
- **SAFETY:** "Vi har hittat ett säkerhetsproblem med [component]. Det behöver åtgärdas för att din bil ska vara säker att köra."
- **MAINTENANCE:** "Din [component] behöver bytas. Det är ett normalt underhåll vid [mileage/age]."
- etc.

### AI Prompt Engineering (Swedish automotive context)
```
System: Du är en biltekniker som förklarar bilproblem för kunder. 
Skriv på klar, vänlig svenska. Inga tekniska termer. Inga förkortningar.
Max 3 meningar per fält. Fokusera på kundens nytta och säkerhet.
Undvik skrämseltaktik men var ärlig om konsekvenser.
```

---

## Phase 3: Customer Notification

### SMS Flow (Primary)

```
Technician taps Send
    ↓
Backend creates approval_request + generates token
    ↓
SMS sent within 3 seconds:
"[Workshop]: Vi har hittat något på din Volvo (ABC 123) som behöver 
ditt godkännande. Se videon och godkänn här: pixdrift.com/approve?t=TOKEN"
    ↓
Customer opens link in browser (no app required)
    ↓
Video loads, plays automatically (muted autoplay then unmutes)
    ↓
Customer taps ✓ Godkänn
    ↓
Workshop notified in < 2 seconds
    ↓
Work order status → IN_PROGRESS
```

### Notification Channels (Priority Order)
1. **SMS** — Primary, highest conversion, works on any phone
2. **Email** — Fallback if no phone, or as supplementary
3. **Push** (if customer has pixdrift app) — Instant, best UX
4. **WhatsApp** (future) — High open rates in Sweden

### SMS Provider Strategy
- **Primary:** 46elks (Swedish, no VAT complications, GDPR-friendly)
- **Fallback:** Twilio (global reliability)
- **Cost:** ~0.05 SEK/SMS via 46elks vs ~0.10 SEK via Twilio

---

## Phase 4: Customer Approval Experience

### Design Philosophy
The customer approval page must achieve one thing: **eliminate hesitation**.

Hesitation sources:
1. Don't understand the problem → Video + plain language solves this
2. Don't trust the recommendation → Trust signals + technician credibility
3. Worry about price → Transparent upfront pricing
4. Fear of being scammed → History, certifications, cancellation window
5. Too much friction → 1 large green button

### Page Architecture (Mobile-First)

```
┌─────────────────────────────┐
│ [Workshop Logo] Lindqvists  │  ← Branded header, trust anchor
│ Din Volvo V70 · ABC 123     │
├─────────────────────────────┤
│                             │
│   [VIDEO PLAYER 16:9]       │  ← Autoplay (muted), prominent
│   ⚠️ VIKTIGT               │  ← Urgency badge overlay
│                             │
├─────────────────────────────┤
│ Bromsbelägg fram —          │  ← Plain Swedish title
│ kritiskt slitage            │
│                             │
│ Vi har kontrollerat dina    │  ← 2-3 sentences, no jargon
│ bromsar och ser att...      │
│                             │
│ ⚠️ Om detta inte åtgärdas: │  ← Risk warning (amber bg)
│ risk för förlängd           │
│ bromssträcka...             │
│                             │
│ Estimerad kostnad    2 400kr│  ← Price, prominent
│ Ca 1.5h inkl. delar        │
│                             │
│ ┌─────────────────────────┐ │
│ │  ✓ Ja, utför arbetet   │ │  ← PRIMARY CTA (56px, green)
│ └─────────────────────────┘ │
│                             │
│ [📞 Ring mig] [💬 Fråga]   │  ← Secondary actions
│                             │
│    Nej, tack               │  ← Reject (small, red text)
│                             │
│ ✓ Verifierat av certif.    │
│ ✓ Loggas & tidsstämplas    │  ← Trust signals
│ ✓ Avboka inom 30 min       │
└─────────────────────────────┘
```

### Behavioral Psychology Applied

**Loss aversion:** "Om detta inte åtgärdas idag kan det kosta 3x mer"
**Social proof:** "Vi rekommenderar detta för alla Volvo V70 av denna årsmodell"
**Authority:** Technician name, certification badge, years of experience
**Commitment reduction:** "Du kan alltid avboka inom 30 minuter"
**Transparency:** Itemized price breakdown available (tap to expand)
**Urgency (honest):** Only shown for CRITICAL/HIGH — never faked

### Trust Overlay Components
- Workshop name + logo (white-label)
- Technician first name + photo (optional)
- Vehicle reg + model confirmation ("Your car: Volvo V70")
- Service history blurb: "3rd service with us — we know your car"
- Certifications: Autoklubben, Dekra, BIL Sweden badges
- GDPR notice: small footer "Your data is protected per GDPR"

---

## Phase 5: Real-time Workshop Notification

### Notification Flow
```
Customer taps Approve
    ↓
POST /api/approvals/customer/:token/respond
    ↓
approval_requests.status = 'APPROVED'
approval_requests.customer_responded_at = NOW()
    ↓
Log approval_events record
    ↓
Parallel:
  → WebSocket push to workstation dashboard
  → POST to work_orders (status = IN_PROGRESS)
  → Push notification to technician's phone
  → Webhook to any DMS integration
    ↓
Technician phone vibrates with: "✅ Kunden godkände — starta arbetet"
```

### Pending Approvals Dashboard
Workshop staff see a live list of all pending approvals:
- Sorted by: urgency (CRITICAL first), then wait time
- Color coding: green (<30min), yellow (30-60min), red (>60min)
- One-click escalation: "Send reminder"
- Click to see full approval details + customer view

---

## Phase 6: Auto-Escalation & Timeout Handling

### Escalation Timeline
```
T+0:    SMS sent
T+30min: If not viewed → Send reminder SMS ("Don't forget to check this")
T+2h:   If not responded → Alert service advisor in app
T+4h:   If no response → Webhook/call to service advisor
T+48h:  Token expires → Status = EXPIRED, advisor must handle manually
```

### Customer Re-engagement Messages (Swedish)
- **T+30min:** "Hej! Vi väntar på ditt svar angående din bil. Länk: [URL]"
- **T+2h:** "Vi behöver ditt godkännande för att kunna slutföra servicen. Ring oss på XXX om du har frågor."

### Business Rules
- CRITICAL urgency: Escalate to phone call at T+1h (not T+4h)
- If customer is unreachable: Service advisor calls and logs in system
- Expired approvals: Auto-archive, notify advisor to contact customer

---

## Phase 7: GDPR & Audit Trail

### Data Classification
| Data Type | Classification | Retention | Deletion |
|-----------|---------------|-----------|---------|
| Video of car (no persons) | Normal | 30 days | Auto-purge |
| Video with persons visible | Sensitive | 30 days | Auto-purge + notify |
| Customer name/phone | Personal | Duration of work order + 7 years (tax) | On request |
| Approval decision + timestamp | Legal record | 7 years | Not deletable (legal basis) |
| IP address at approval | Personal | 30 days | Auto-purge |

### GDPR Compliance Checklist
- ✅ No login required → No account creation, no password storage
- ✅ Token-based access → Minimal data exposure
- ✅ Explicit consent text shown before approve button
- ✅ Data processing notice in footer
- ✅ Right to erasure: Video deleted on request (except legal hold)
- ✅ Audit log cannot be deleted (legal requirement for approval documentation)
- ✅ Data stored in EU (eu-north-1 Stockholm)
- ✅ Sub-processor list: AWS, Twilio/46elks documented
- ✅ DPA agreements with all sub-processors

### Audit Trail Schema
Every action creates an immutable event record:
```
approval_events:
  - approval_id
  - event_type: created|sms_sent|viewed|approved|rejected|expired|escalated
  - event_data: { ip, user_agent, decision, note, ... }
  - ip_address
  - created_at (immutable)
```

### Legal Standing of Digital Approval
The approval is legally equivalent to written consent because:
1. Timestamp + IP logged
2. Token-based identity (only SMS recipient has the link)
3. Content shown to customer is logged (snapshot)
4. Explicit action required (can't be accidental)
5. Confirmation sent to customer immediately

---

## Phase 8: White-Label Customer Portal (My Pages)

### "My Pages" — Customer Self-Service

Accessed via magic link (no login): `pixdrift.com/mina-sidor?t=CUSTOMER_TOKEN`

Customer can see:
- All vehicles registered with their number
- Service history with all visits
- Past approval videos (available 30 days)
- Invoices and service records
- Upcoming bookings
- Contact workshop button

### White-Label Configuration
Each workshop can configure:
- Logo (SVG/PNG upload)
- Primary color
- Workshop name and address
- Service advisor contact
- Custom domain (e.g., `service.lindqvists.se/godkann?t=TOKEN`)
- Custom SMS sender name (e.g., "Lindqvists" instead of "Pixdrift")

### API for White-Label
```
GET /api/org/:org_id/branding
→ { logo_url, primary_color, workshop_name, custom_domain, sms_sender }
```

Approval page fetches branding on load and applies dynamically.

---

## Technical Architecture Summary

```
                    TECHNICIAN
                        │
                  Mobile browser
                  (workstation app)
                        │
              POST /api/approvals/capture
                        │
                ┌───────────────┐
                │  API Server   │
                │  (ECS Fargate)│
                │               │
                │  ┌─────────┐  │
                │  │Approval │  │
                │  │Engine   │  │
                │  └────┬────┘  │
                └───────┼───────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       Supabase       S3 +         46elks/
      (PostgreSQL)  CloudFront     Twilio
     (audit trail)  (videos)        (SMS)
                        │
                  CUSTOMER PHONE
                  pixdrift.com/approve?t=TOKEN
                        │
              ┌─────────────────┐
              │ Static HTML page│
              │ (S3 + CloudFront│
              │   CDN edge)     │
              └────────┬────────┘
                       │ Customer approves
              POST /api/approvals/customer/:token/respond
                       │
              ┌────────┴────────┐
              │    Work Order   │
              │  Status Update  │
              │  → IN_PROGRESS  │
              └─────────────────┘
                       │
              WebSocket push
              to workshop dashboard
```

---

## Success Metrics

| Metric | Current (baseline) | Target (6 months) |
|--------|-------------------|-------------------|
| Approval rate | ~60% (phone calls) | 78% (video approvals) |
| Time to approval | 45 min avg | < 5 min |
| Revenue per work order | 100% baseline | +25% upsell capture |
| Customer satisfaction | Unknown | NPS > 50 for approval flow |
| Technician adoption | N/A | > 80% of discovered issues |

---

## Implementation Phases

| Phase | Scope | Timeline |
|-------|-------|---------|
| MVP | Capture + SMS + Approve page + basic audit | Week 1–2 |
| AI Translation | GPT/Claude integration, Swedish automotive prompts | Week 2–3 |
| Dashboard | Pending approvals, real-time updates, escalation | Week 3–4 |
| Customer Portal | My Pages, history, white-label | Month 2 |
| Analytics | Approval rates, revenue attribution, timing | Month 2 |
| DMS Integration | Auto-advance work orders in external DMS | Month 3 |

---

*Built for pixdrift — the modern workshop operating system.*
