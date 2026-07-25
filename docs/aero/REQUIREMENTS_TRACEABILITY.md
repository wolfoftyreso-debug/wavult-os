# AEAN — Requirements Traceability

> The live matrix is generated at build time from
> `apps/wavult-aero/src/rtm/requirements.ts` into
> `docs/aero/rtm-matrix.json`. This document is the operator's guide to
> what that matrix means and how to change it safely.

## 1. Why RTM-as-code

Every safety-relevant software certification standard asks for the
same thing: a line from every requirement to the code that
implements it and the test that verifies it.

The usual way to do this is a spreadsheet that drifts away from the
code within a week. We refuse to do that. Instead:

1. Requirements live in TypeScript (`src/rtm/requirements.ts`) with
   an id, a text, a regulation citation, the file(s) that implement
   them, and the file(s) that verify them.
2. Each implementation file is required to contain an `@req` tag
   whose value is the requirement id.
3. `npm run rtm:verify` walks the list, checks that files exist,
   checks that tags are present, and writes a JSON matrix to
   `docs/aero/rtm-matrix.json`.
4. The Docker build runs the verifier as a build step. A missing
   tag, a missing file, or a draft requirement under `RTM_STRICT=1`
   fails the build. CI sets `RTM_STRICT=1` for the `rtm` and `main`
   branches but not for feature branches.

## 2. Requirement ids

Format: `AEAN-REQ-<AREA>-<NNN>`

| Area  | Meaning                                                    |
|-------|------------------------------------------------------------|
| SEC   | Authentication, authorisation, cryptography                 |
| AUD   | Audit log, tamper detection, record retention              |
| FLT   | Fleet registry                                              |
| EDG   | Edge-node enrolment and lifecycle                          |
| TEL   | Telemetry ingest                                            |
| SMS   | Safety Management System (ICAO Annex 19)                   |
| CNT   | Content pack publishing and distribution                   |
| PFT   | Prefetch policy governance                                  |

Ids are never reused. Retiring a requirement means changing its
status to `retired` (future), not deleting the entry.

## 3. Status lifecycle

```
 draft          -- written, not yet implemented
   |
   v
 implemented    -- implementation file(s) exist, @req tag present
   |
   v
 verified       -- implementation + an automated test file
                   that actually exercises the requirement
```

For MVP we permit `implemented` in production; `draft` is not
allowed under `RTM_STRICT=1`. The long-term target is `verified`
for every requirement whose hazard classification is `hazardous` or
higher.

## 4. Hazard classification

Follows ARP4761:

| Class         | Meaning                                                     |
|---------------|-------------------------------------------------------------|
| catastrophic  | Loss of aircraft / multiple fatalities                      |
| hazardous     | Large reduction in safety margin                            |
| major         | Significant reduction in safety margin                      |
| minor         | Slight reduction in safety margin                           |
| no-effect     | No safety consequence                                       |

For AEAN, catastrophic requirements are concentrated around content
pack signing (AEAN-REQ-SEC-005) because that is the one path from
the control plane to code-running-on-the-airplane. Hazardous
requirements are concentrated around the audit log and edge-node
identity — they protect the integrity of the record and the ability
to revoke a compromised appliance.

## 5. How to add a requirement

1. Open `apps/wavult-aero/src/rtm/requirements.ts`.
2. Append a new entry with a fresh id.
3. Add the `@req AEAN-REQ-...` tag to each implementation file in
   a header comment (the verifier looks for the literal string, so
   any position works — convention is the file header).
4. Add a placeholder test file to `verification[]`. If the test
   does not yet exist, CI on a feature branch will still pass as
   long as the file is present. The `verified` status is only
   awarded when the test actually exercises the requirement.
5. Open the PR. The existing four-approval RTM gate applies. The
   template asks the reviewer to check that the new requirement is
   mapped correctly and that no existing id has been reused.

## 6. How to retire a requirement

Never delete an entry. Change the status to `retired` (a future
status value) and add a `retired_at` field and a `superseded_by`
field if the requirement has been replaced. The JSON matrix will
carry retired entries so that auditors can reconstruct state at any
point in time.

## 7. External regulations currently cited

- AS9100D (ISO 9001 with aerospace addendum)
- DO-326A / ED-202A (Airworthiness Security Process Specification)
- DO-178C (Software Considerations in Airborne Systems — indirect,
  for traceability format only; AEAN is not on-aircraft software)
- EASA Part-145.A.55 (maintenance records retention)
- FAA 14 CFR §43.9 (maintenance record retention in US ops)
- ICAO Annex 7 (Aircraft Nationality and Registration Marks)
- ICAO Annex 19 (Safety Management Systems)
- EASA Part-21.A.801 (identification of products, parts, appliances)
- ISO 27001:2022 (clauses A.5.15–18, A.8.24)
- NIS2 Annex I (EU cyber resilience for essential entities)

## 8. Where auditors look

| Question                                     | Where to look                                |
|----------------------------------------------|----------------------------------------------|
| "Show me the current matrix."                | `docs/aero/rtm-matrix.json`                  |
| "Show me the history of this requirement."  | `git log -- apps/wavult-aero/src/rtm/requirements.ts` |
| "Show me the event log for aircraft X."     | `/v1/fleet/aircraft/X/history` with auditor token |
| "Prove the event log has not been tampered." | `/health/status` + nightly evidence collector |
| "Show me the threat model."                  | `docs/aero/THREAT_MODEL.md` + `threat-model.ts` |
