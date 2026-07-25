# AEAN — Go-to-Market & Aviation Industry Entry

> This is the commercial playbook for AMOS Edge Aviation Network.
> It is opinionated. It is written to be argued with, not blindly
> executed. Every number here is a hypothesis that needs one customer
> conversation to become a fact.

## 1. The market, in one page

### 1.1 The real problem we are selling into

Passenger internet onboard aircraft is slow, expensive, and
unpredictable. The reason is physics: geostationary satellite links
add 500–700 ms of round-trip latency and, at peak load, fewer than
2 Mbit/s per passenger. LEO (Starlink Aviation, OneWeb) is an order
of magnitude better on paper but still shares the return link with
every other user on the beam and still hits content origins on the
ground. The bottleneck is not raw bandwidth; it is **round-trip time
to the origin and duplicated fetches across passengers**.

AEAN attacks the second one. We do not sell more satellite capacity.
We sell "the last mile of the internet, staged inside the aircraft,
under policy, with an audit trail the chief pilot can hand to a
regulator."

### 1.2 Who pays

Three distinct buyers, three distinct ICPs, three distinct deal sizes:

| Segment | Who pays | Deal size | Sales cycle |
|---|---|---|---|
| **Business aviation operators** (Part-135, fractional, corporate flight departments) | CFO or Director of Flight Ops | EUR 30k – 120k / aircraft / year | 1–3 months |
| **Regional airlines** (Part-121 or EASA CAT small, 10–60 aircraft) | VP Digital / CIO | EUR 200k – 600k / fleet / year | 6–12 months |
| **Major airlines** (100+ aircraft) | CIO + VP Customer Experience, sometimes co-funded by the IFE vendor | EUR 2–10M / year | 12–24 months |

**Start at the top of the business aviation list.** Bizav buys on ROI
and chief-pilot experience, not on RFP. A single deal there pays for
the MVP. A public reference from a fractional operator (NetJets,
VistaJet, Flexjet, Global Jet) is worth 50 cold emails to major
airlines.

### 1.3 Who we are NOT selling to (yet)

- **Commercial low-cost carriers.** They have already priced
  connectivity as an ancillary; the buyer is the commercial team,
  not ops, and the business case is on pax ancillary spend, which
  we cannot influence on day one.
- **Cargo-only carriers.** No passenger experience to improve.
- **General aviation / owner-flown.** Deal size does not cover
  integration cost.

## 2. Why we can actually get in

The aviation industry is famously impenetrable. Here is why AEAN has
a real wedge.

### 2.1 Passenger services is NOT DO-178C

The single biggest barrier to aviation software is DO-178C
certification, which requires a certified toolchain, a certified
verification environment, and a multi-year trail of evidence.
AEAN is deliberately **not on the avionics bus**. The onboard
appliance sits on the passenger services LAN, exactly like the
existing Wi-Fi access points and IFE content servers. That
classification means:

- We need **AS9100D** (quality system) — we already build for this.
- We need **DO-326A / ED-202A** (airworthiness security) — we
  already do, because our control plane is ISO-by-design.
- We do **not** need DO-178C.
- We do need **STC (Supplemental Type Certificate)** for the
  physical installation on each airframe type, but the STC is held
  by the installation partner (Lufthansa Technik, STS, AAR,
  Collins, Honeywell). We piggyback. This is the same path Gogo
  and Viasat took.

### 2.2 The installation partner model

We do not install boxes. We partner with an MRO (Maintenance,
Repair, Overhaul) organisation that already holds EASA Part-145 +
Part-21J approvals. They own the STC; we own the software, the
cloud, and the SLA. This is the lowest-cost way to enter the
industry and it is how every new entrant from 2010 onwards has
succeeded. Candidates:

| Partner             | Region     | Why them                             |
|---------------------|------------|--------------------------------------|
| **Lufthansa Technik** | Global     | Nose-to-tail MRO, owns IFE/connectivity STCs |
| **SR Technics**     | Europe     | Strong in A320/A330 fleet             |
| **AJW Group**       | Europe/US  | Used to onboarding new suppliers      |
| **STS Aviation**    | US         | Bizav + regional focus                |

First partner conversation in month 1, not month 12.

### 2.3 Regulatory posture is a sales asset, not overhead

When the chief of safety asks "how do we know nothing funny is
getting pushed to our aircraft", we open `rtm-matrix.json`,
`THREAT_MODEL.md`, and `/v1/fleet/aircraft/{tail}/history`. Nobody
else in this market can show a hash-chained audit log on day one.
We lead with this in every pitch.

## 3. The 12-month GTM plan

### Phase 0 — Design partners (weeks 1–8)

Goal: three signed LOIs for a paid pilot. Two bizav operators + one
regional airline.

- **Target list: 15 accounts**, all European, all Part-CAT or
  Part-NCC operators, all with a chief pilot or head of operations
  we can reach via one degree of separation (Wavult's aviation
  network, LinkedIn, Stockholm-area flying clubs, VistaJet and
  TAG Aviation crew we already know).
- **Outreach channel: warm introduction > event > direct email.**
  Direct cold outbound is last resort.
- **Events to work in Q2 2026:** EBACE (Geneva, May), Aircraft
  Interiors Expo (Hamburg, June), Connected Aviation Intelligence
  Summit (Brussels, June). EBACE is the single best room in
  Europe for bizav.
- **Pitch structure (8 min + 15 min demo):**
  1. "Your passengers hate your Wi-Fi and you know it." (30 sec)
  2. "The bottleneck is not bandwidth, it is duplicated fetches and
      origin latency." (60 sec)
  3. "We mirror the top-10k of the internet onboard, signed,
      audited, and we prefetch based on fleet-wide behaviour."
      (2 min, slide)
  4. "Here is the regulator conversation you never had to have."
      (2 min, open the RTM matrix live)
  5. "You do nothing. Your MRO installs a 1U box at the next
      C-check. We turn it on in the cloud." (60 sec)
  6. Demo: content pack published in command-center, synced to a
     mock edge node, tamper alarm trips the breaker. (15 min)
  7. Ask for a paid pilot on one tail.

### Phase 1 — Paid pilot (months 3–6)

- **Scope**: one tail per design partner. We bring the hardware
  (contract manufactured 1U appliance, off-the-shelf NVMe), the
  MRO installs it during the next scheduled maintenance event.
- **Price**: EUR 25k for a 90-day paid pilot. This is NOT a free
  trial. A free pilot in aviation gets deprioritised; a paid pilot
  gets calendared.
- **Success metric**: 3 of 4 of these:
  1. Cache hit rate >= 60% on measured sessions
  2. Passenger-reported "noticeably faster" rating on post-flight
     survey (sample >= 30 passengers per tail)
  3. Zero safety-critical incidents, zero broken hash chains
  4. Crew survey: "I would want this on every aircraft"
- **Deliverables at end of pilot**: telemetry report, evidence
  pack, case study ready for external publication.

### Phase 2 — Fleet expansion (months 6–12)

- Convert at least 2 of the 3 pilots to fleet deals.
- First bizav fleet deal: 15 aircraft × EUR 80k/year = EUR 1.2M ARR.
- First regional airline: 30 aircraft × EUR 60k/year = EUR 1.8M ARR.
- Publish: a technical whitepaper on the hash-chained audit log
  and a public case study with the first bizav operator (with
  their PR approval — some bizav operators are reference-shy).

### Phase 3 — OEM conversations (month 9 onwards, runs in parallel)

- Book meetings with **Collins Aerospace**, **Panasonic Avionics**,
  **Thales InFlyt**, and **Viasat**. Goal: an OEM integration that
  puts AEAN inside their next-generation IFE content server, so
  that we do not compete with them but extend them. This is the
  long play. Budget 6–12 months just to get to a pilot.

## 4. Pricing model

Two SKUs at launch, one per-aircraft license, one volume.

### 4.1 AEAN Edge — per aircraft, per year

- **Bizav**:     EUR  80,000 / tail / year
- **Regional**:  EUR  50,000 / tail / year (committed fleet >= 10)
- **Major**:     EUR  30,000 / tail / year (committed fleet >= 100)

Includes: hardware appliance (refresh every 5 years), cloud control
plane, prefetch engine, content packs, 24/7 NOC, SLA.

### 4.2 AEAN Intelligence — fleet data

Ancillary, optional. Aggregated, anonymised fleet behaviour data
(popular content, peak load times) sold back to content owners
(e.g. streaming services) as "optimise your CDN for our flights".

- Pricing: revenue share with the operator. Operator gets 40% of
  the data licensing fee. Aligned incentives.

### 4.3 Why this beats the incumbent model

Gogo and Viasat charge the passenger directly via paywalls. Airlines
hate this because it is a bad passenger experience AND because the
connectivity vendor takes the revenue. AEAN sells to the operator.
The operator makes the connectivity free to the passenger (a
differentiator) and pays us a flat fee. We never touch the paywall.

## 5. The channel stack

```
Wavult Aero (us)
   |
   ├── MRO installation partner (EASA Part-145 / Part-21J)
   |       |
   |       └── Airframe manufacturer approval for STC
   |
   ├── Connectivity provider (Starlink Aviation, Inmarsat, Viasat)
   |       |
   |       └── We are layered ON TOP of their link, not replacing it.
   |           Co-sell is plausible once we have a reference customer.
   |
   ├── IFE content curator partner
   |       |
   |       └── Deltek, Touch, SPAFAX — we ingest their licensed
   |           catalogues into content packs, they earn their fee
   |           as usual.
   |
   └── Direct sales (enterprise AE + sales engineer)
           |
           └── Bizav and regional airlines initially
```

## 6. Build-vs-buy-vs-partner decisions

| Component                    | Decision | Why                                           |
|------------------------------|----------|-----------------------------------------------|
| Cloud control plane          | Build    | Core differentiation, IP                      |
| Hash-chained audit log       | Build    | Core differentiation, IP                      |
| Prefetch ML                  | Build    | Core differentiation; cheap with SageMaker    |
| Onboard hardware             | Buy + co-design | 1U / 2U chassis from an aviation-grade ODM |
| STC                          | Partner  | MRO holds it; we do not take certification risk |
| Satellite link               | Partner  | We are on top of Starlink/Viasat              |
| CDN for content-pack fetch   | Buy      | S3 + CloudFront + BYOC caches in MRO hubs     |
| Identity                     | Reuse    | identity-core (existing)                      |
| QMS                          | Reuse    | Wavult QMS with aviation addendum             |
| Finance / billing            | Reuse    | Wavult ledger + Stripe                        |

## 7. The first 30 days — concrete actions

1. **Day 1–3**: Merge the `claude/aviation-microservice-iso-uBQeQ`
   branch into `rtm`. Get the four RTM approvals on the scaffold.
2. **Day 3–7**: Replace the stub KMS signer in
   `apps/wavult-aero/src/routes/content-packs.ts` with a real
   KMS Sign call. Create the content-pack signing key in
   eu-north-1 with the locked key policy. Move AEAN-REQ-SEC-005
   from `draft` to `implemented`.
3. **Day 7–10**: Wire `wavult-core` to proxy `/v1/aero/*` to
   `wavult-aero`. Add the aero ECS task to the Terraform stack.
4. **Day 10–14**: Run the migrations against the dev
   `wavult_os` database. Smoke-test every route. Write a boot-time
   tamper drill that deliberately corrupts a test stream and
   verifies the breaker trips.
5. **Day 14–21**: Draft a 6-slide intro deck + 1-pager. Build the
   target account list (see Phase 0). Send the first 10 warm
   introductions.
6. **Day 21–30**: Run at least 5 discovery calls. Update the
   threat model and the prefetch-policy schema based on what we
   hear. Lock in one design partner for Phase 1.

## 8. Risks and how we mitigate them

| Risk                                                       | Mitigation                                                          |
|------------------------------------------------------------|---------------------------------------------------------------------|
| STC takes 18 months we do not have                        | Partner with an MRO that already holds an IFE STC we can reuse      |
| Major airlines refuse to buy from a new entrant            | Use bizav references; do not burn cycles on majors in year one      |
| Starlink Aviation makes the problem go away               | It does not — origin RTT is still there. But our pitch shifts from "faster" to "predictable and auditable". |
| Passenger HTTPS ratio keeps climbing and kills caching     | We are a cooperative caching + signed pack model; we never MITM.    |
| Viasat or Gogo builds the same thing                       | Our differentiator is the ISO-by-design audit rail, not the cache   |
| Aviation sales cycles kill us before ARR starts            | Paid pilots, short bizav cycles, LOIs before capacity builds        |

## 9. Talking points for the first customer conversation

1. "We are not replacing your Wi-Fi. We sit between your Wi-Fi and
   the internet and make the internet respond like it is local."
2. "Your passengers do not know what 'edge caching' means. They
   know 'Instagram loads instantly even over the Atlantic'. That
   is what they will see."
3. "Your chief of safety will ask what can go wrong. I will open
   the hash-chained audit log in front of them and show them
   every event that ever touched their fleet."
4. "We are AS9100D and DO-326A by design. If your regulator asks,
   we have the paper. If your MRO asks, we have the STC partner."
5. "First year is a paid pilot on one tail. No fleet commitment.
   No capex on your side. Worst case, you got a free case study."
