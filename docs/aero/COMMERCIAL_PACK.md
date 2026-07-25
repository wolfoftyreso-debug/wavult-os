# AEAN — Commercial Pack

> Everything a Wavult commercial lead needs to take AEAN from scaffold
> to first signed deal. Pitch deck outline, investor case, first-deal
> playbook, pricing tables, objection handling. Use alongside
> `GTM_AVIATION.md`.

---

## A. PITCH DECK (10 slides, the only ones that matter)

Write the slide, not a novel. The goal is a decision, not an education.

### Slide 1 — Cover
**AMOS Edge Aviation Network**
"The last mile of the internet, staged inside the aircraft."
Erik Svensson, Chairman & Group CEO, Wavult Group.

### Slide 2 — The problem (in one sentence + one chart)
Passenger internet at altitude is unpredictable, slow, and the airline
takes the blame for something it does not control. Chart: RTT to
origin vs. RTT to edge — our pitch in one image.

### Slide 3 — Why now
- LEO constellations (Starlink, OneWeb) just made the link fast, so
  the bottleneck moved to origin RTT and repeated fetches.
- EU NIS2 + DO-326A are new regulatory pressure points, and airlines
  need a vendor that already speaks that language.
- Passenger expectations reset post-2023 — "Instagram instantly" is
  the bar, not "good enough to check email".

### Slide 4 — What we built
One diagram:
```
Passenger app → Aircraft Edge Node → [Cached | Prefetched | Satellite]
                         ▲
                         │ signed content packs + policies
                         │
                  Wavult Aero Control Plane (AWS)
```
Two bullets:
- Cloud control plane is live today (`apps/wavult-aero`, this branch)
- Onboard appliance is a partnership with an aviation-grade ODM

### Slide 5 — The moat: ISO-by-design
Screenshot of `docs/aero/rtm-matrix.json` + `/v1/fleet/aircraft/{tail}/history`.
"Every event into a tail, hash-chained, every clause in the standard,
mapped to code. If your regulator asks, we hand you the file."

### Slide 6 — Product surface
- Fleet registry
- Edge node enrolment (TPM attestation)
- Signed content packs
- Prefetch policy with four-eyes promotion
- Telemetry + SMS promotion
- Tamper detection with automatic read-only mode

All live on day one.

### Slide 7 — Business model
| Segment | €/tail/year | First-deal size |
|---|---|---|
| Business aviation | 80 000 | 15 tails = 1.2 M€ |
| Regional airlines | 50 000 | 30 tails = 1.5 M€ |
| Major airlines | 30 000 | 100+ tails = 3+ M€ |

Ancillary: fleet intelligence (anonymised behavioural data, revenue
share with the operator — not the vendor walking away with the asset).

### Slide 8 — Go-to-market (show the path)
1. Paid pilot on 1 tail with a bizav operator (€25k, 90 days)
2. Fleet expansion with same operator (≥10 tails)
3. Public case study
4. Regional airline conversations
5. OEM integration with one of Collins / Panasonic / Thales / Viasat

Timeline visible to the reader.

### Slide 9 — The ask
One of:
- **Strategic partner**: "we want Lufthansa Technik to hold the STC"
- **Customer**: "we want a design-partner slot for one tail"
- **Capital**: "€X for 18 months of runway to the first 50 tails"

Be specific. Never end a deck without an ask.

### Slide 10 — Team, credibility, contact
Erik (Chairman/CEO, Wavult Group) — the rest of the group (Dennis
Legal/QMS, Johan CTO, Leon Ops, Winston CFO). Wavult OS is the
operating backbone of a Swedish holding structure that is already
building ISO-compliant enterprise systems at scale.

---

## B. INVESTOR CASE (the memo)

### B.1 Thesis

AEAN is Cloudflare for aviation connectivity. The internet we built
assumes terrestrial fibre-backed origins and unlimited RTT to them.
In-flight, neither assumption holds. The winning pattern — exactly
like Cloudflare on the ground — is to push the origin closer to the
user. In aviation, "closer" means "on the aircraft". We run that
edge, we run the control plane, and we own the audit rail regulators
will ask for.

### B.2 Market size, honestly

- ~27 500 commercial aircraft in service worldwide (Airbus + Boeing
  in-service fleet, 2024)
- ~22 000 business jets in service
- Connectivity penetration: roughly 70% of widebodies, roughly 50%
  of narrowbodies, trending up
- **Serviceable addressable market**: ~30 000 connected aircraft
- At our target price of €30–80k / tail / year, SAM is roughly
  €1.5–2.5 B ARR at full penetration. We will not get all of it.
  We will get a slice of the connected-aircraft spend that currently
  goes to Viasat, Gogo, and Inmarsat's value-added services.

### B.3 Unit economics (first-deal to steady-state)

| Metric | First 5 tails | Steady state (100 tails) |
|---|---|---|
| Hardware COGS per tail | ~€3 500 | ~€2 500 |
| Cloud + bandwidth per tail / yr | ~€6 000 | ~€2 000 |
| Support + NOC per tail / yr | ~€4 000 | ~€1 000 |
| Gross price per tail / yr | €80 000 | €50 000 |
| **Gross margin** | **~84%** | **~89%** |

Three-year payback on hardware at steady state is under 2 months.
The thing that eats the P&L is not hardware; it is sales cycle
length and pilot-to-fleet conversion.

### B.4 Risks the memo has to be honest about

1. **STC timelines.** Mitigated by partnering with an MRO that
   already holds an IFE STC we can reuse.
2. **Incumbents.** Viasat/Gogo/Inmarsat can copy the architecture
   in 12 months. Our moat is the ISO-by-design audit rail and the
   MRO partnership — neither is a copy-paste exercise.
3. **LEO disruption.** Starlink Aviation cutting link price to
   near-zero would partially compress our "faster" pitch, but our
   "predictable and auditable" pitch survives it. The product
   still sells.
4. **Regulatory drift.** DO-326A is young. Standards will move.
   We mitigate by keeping the RTM in code and making every
   requirement a PR.

### B.5 What we do with €X

At €3–5 M raised:
- 4 engineers (1 staff-level control plane, 1 edge daemon in Go,
  1 ML for prefetch, 1 SRE)
- 1 SE + 1 AE dedicated to aviation
- 1 MRO partnership manager
- Hardware: 10 pilot appliances (€35k total)
- Cloud + bandwidth: 18 months runway at 50 tails
- Compliance: AS9100D certification audit, DO-326A external review

18-month targets:
- 25 paying tails across 3 operators
- First regional airline LOI
- First OEM meeting that did not need Wavult to initiate

---

## C. FIRST-DEAL PLAYBOOK — exact moves

### C.1 Target profile for deal #1

Must have:
- Operator has 10–30 aircraft (big enough to matter, small enough
  to move)
- Operator is in Europe (EASA posture matches our starting regulatory
  stack)
- We have ≤2 degrees of warm introduction to the chief pilot or
  head of flight ops
- Operator's current in-flight Wi-Fi is measurably underperforming
  (we pre-screen publicly available pax reviews)

Examples of the right shape (not endorsements, not commitments):
- European fractional jet operators (VistaJet, GlobeAir, Air Hamburg)
- Scandinavian regional carriers (Braathens Regional, Widerøe)
- Boutique charter operators (Flexjet Europe, Luxaviation)

### C.2 The 14-day sales cycle

| Day | Action |
|---|---|
| 0   | Warm intro request sent via mutual contact |
| 2   | Intro email with 1-page overview + link to a 90-second demo video |
| 3   | Discovery call booked (30 minutes, no deck) |
| 5   | Discovery call — listen more than you talk. Leave with: who is the economic buyer, what is their worst connectivity incident in the last 90 days, what is their regulator asking about. |
| 6   | Send a tailored 1-pager that mirrors what they said back to them. |
| 8   | Technical deep-dive with their head of IT (60 min). Demo the hash-chain, the four-eyes flow, the tamper alarm trip. |
| 10  | Send pilot proposal: 1 tail, 90 days, €25k. MSA + DPA drafts. |
| 12  | Procurement + legal review. |
| 14  | Signed LOI. |

Anything taking longer than this is signalling it will not close.
Move on and come back in Q2.

### C.3 The discovery call script (word for word)

"Thanks for making time. I have two goals for today. First I want
to understand how your passengers experience connectivity today and
what it would take for that to feel acceptable to you. Second I want
to answer whatever questions you have about us — I know we are new,
and I would rather you leave this call knowing where we fit and
where we do not, than pretending we are everything to everyone.

I am going to start by asking you three things:
1. What do passengers actually complain about — is it speed, is it
   cost, is it the login flow, is it coverage?
2. When something breaks, who does the chief pilot call?
3. Has your regulator asked you anything about cybersecurity of
   passenger-facing systems in the last 12 months?

After that I want to tell you one thing about how we are different
and then we can see whether there is a reason to talk again."

### C.4 The pilot proposal

One page. Signed by Erik and the operator's economic buyer.

- **Scope**: one aircraft tail
- **Duration**: 90 days from installation
- **Deliverables from Wavult**: 1U AEAN edge appliance, integration
  with the operator's existing Wi-Fi, cloud control plane access,
  weekly telemetry report, final case-study document
- **Deliverables from the operator**: installation slot at next
  scheduled maintenance event, pax survey distribution (30
  responses minimum), feedback session every 2 weeks
- **Price**: €25 000, invoiced 50% on installation, 50% on completion
- **Success criteria** (agreed up front, binary):
  - Cache hit rate ≥ 60% on measured sessions
  - Pax-rated "noticeably faster" ≥ 70%
  - Zero safety-critical incidents
  - Zero hash-chain breaks
- **What happens next**: if 3 of 4 criteria are met, the operator
  commits to a fleet LOI at the pre-agreed per-tail price. If not,
  we walk away with a clear "why".

### C.5 Objection handling (prepared answers)

> "This sounds like another IFE thing. We already have one."

"Correct — and we sit on top of it, not against it. Your IFE
content server handles stored video. We handle the open internet,
which is everything your passengers actually want now. We do not
replace your IFE vendor; we make their box look better."

> "How do I know you are safe to put on my aircraft?"

"Two answers. First, we do not touch your avionics bus — we hang
off the same passenger services LAN as your existing Wi-Fi. So
the airworthiness path is the same as your Wi-Fi installation.
Second, our control plane is ISO-by-design: every change to your
fleet is in an append-only hash-chained audit log. I will show you
that screen right now if you have 60 seconds."

> "What if your company disappears?"

"The onboard appliance continues to operate in autonomous mode
against the last signed content packs. There is no remote kill
switch that can brick your fleet. We provide escrow of the control
plane source as part of the enterprise agreement — standard SaaS
escrow language, nothing creative."

> "Why not just use Starlink Aviation and be done with it?"

"Starlink made the link fast. It did not make the internet origin
closer. Even at 200 Mbps downlink, your passengers still wait for
Instagram's US-West servers. We mirror the busy parts of the
internet inside the aircraft, so their request never leaves the
plane. Starlink and AEAN are complements, not competitors. In
fact, our existing customers put us on top of Starlink."

> "What is your pricing?"

State it. Do not wiggle. €80k/tail/year for fleets under 20. Do
not discount the first deal — a discounted first deal anchors
every subsequent negotiation.

### C.6 What to do in the 48 hours after signing

1. Spin up the operator's org in `wavult_os` and seed their roles
2. Schedule the MRO installation slot
3. Send the kickoff pack: technical contacts, weekly stand-up
   time, escalation chain, SLA language
4. Write the press release — even if we never publish it, writing
   it forces us to agree on what success looks like
5. Start the case study document with the first telemetry read

---

## D. CHANNEL PARTNER PITCH — how to sell AEAN to an MRO / IFE vendor

Different audience, different pitch. An MRO does not care about
passenger UX; they care about scope (what they install, how many
hours it bills), warranty (who owns the box), and their STC.

### D.1 The three lines they need to hear

1. "You own the STC, we own the software. We will never compete
   with you on installation."
2. "Every tail you install is €80k/year recurring that you earn
   a percentage of, for the life of the contract."
3. "We are AS9100D and DO-326A by design. Your quality manager's
   life gets easier, not harder."

### D.2 The commercial shape

- MRO becomes our exclusive installation partner in their region
- MRO earns 15–20% of the per-tail annual fee for every tail they
  install, for the life of the contract
- MRO holds the STC for the airframe types they are approved on
- Wavult provides training, spares, NOC escalation, and co-sells
  with the MRO on their existing airline relationships

This pitch has been how Gogo, Viasat, Inmarsat, and Panasonic all
scaled. It is a proven shape. It is not novel. That is the point.

---

## E. 1-pager (printable)

```
┌────────────────────────────────────────────────────────────────┐
│  AMOS EDGE AVIATION NETWORK                                    │
│  The last mile of the internet, staged inside the aircraft.   │
├────────────────────────────────────────────────────────────────┤
│  THE PROBLEM                                                   │
│  In-flight internet is slow and unpredictable because your     │
│  passengers' requests still hit origins on the ground, 500 ms  │
│  away, over a link they share with 200 other passengers.       │
│                                                                │
│  THE PRODUCT                                                   │
│  We mirror the top of the internet inside the aircraft,        │
│  predictively prefetch based on fleet-wide behaviour, and      │
│  distribute signed content packs that the onboard box          │
│  verifies before installing. Your passenger gets sub-100ms     │
│  responses for 80% of their requests, over any satellite link. │
│                                                                │
│  THE PROOF                                                     │
│  ISO-by-design: every event in a hash-chained audit log.      │
│  AS9100D + DO-326A control mapping on day one. Four-eyes on    │
│  every change that can reach an aircraft.                      │
│                                                                │
│  THE ASK                                                       │
│  One tail, 90 days, €25k paid pilot. You do the installation   │
│  slot, we do everything else. If we hit 3 of 4 success         │
│  criteria, you commit to a fleet LOI. If not, you walk away    │
│  with a clear answer.                                          │
│                                                                │
│  Erik Svensson — erik@wavult.com — wavult.com/aero            │
└────────────────────────────────────────────────────────────────┘
```

---

## F. What we will not do

To keep the company honest:

1. We will not claim to be DO-178C certified. We are not and we
   do not need to be. Anyone who says they are and who is not
   on the avionics bus is lying to you.
2. We will not MITM passenger HTTPS. Cooperative caching only.
3. We will not sell directly into a paywall that charges
   passengers. The operator pays; the passenger never sees us.
4. We will not take a demo-only meeting without a named economic
   buyer on the call. Aviation is a small industry and we burn
   our reputation fast on wasted meetings.
5. We will not onboard a customer whose chief pilot has not
   personally approved the pilot. Every story in this industry
   of a failed rollout starts with "the chief pilot was not in
   the loop".
