# 🇹🇭 Thailand Certification Sprint — ISO 9001 Readiness
**Period:** 4–11 april 2026  
**Mål:** Certifieringsredo för extern pre-assessment Q3 2026

---

## Nuläge (4 april 2026) — Audit-sammanfattning

### 10 interna audits genomförda

| Audit | Namn | Attackvinkel | Resultat |
|-------|------|--------------|----------|
| AUDIT-2026-001 | Dokumentkontroll & Beviskedja | Dokumentation & beviskedja | 🔴 major_nc |
| AUDIT-2026-002 | GDPR Dataskyddsrevision | IMY-inspektion simulering | 🔴 major_nc |
| AUDIT-2026-003 | NIS2 Cybersäkerhetsrevision | NIS2 Art. 21 alla åtgärder | 🔴 major_nc |
| AUDIT-2026-004 | ISO 27001 Annex A Tekniska Kontroller | Tema 8 teknologiska kontroller | 🟡 minor_nc |
| AUDIT-2026-005 | Kompetens & Utbildning | Kompetensbevis per person | 🟡 minor_nc |
| AUDIT-2026-006 | OKR & Kvalitetsmål | SMART-mål & prestationsmätning | 🟡 minor_nc |
| AUDIT-2026-007 | Riskhantering & CAPA | CAPA-processen end-to-end | 🟡 minor_nc |
| AUDIT-2026-008 | Leverantörskontroll | Leverantörskedjans compliance | 🔴 major_nc |
| AUDIT-2026-009 | Ledningsgenomgång | Formell management review | 🟡 minor_nc |
| AUDIT-2026-010 | Helhetsbedömning — Certifieringsreadiness | DNV/Bureau Veritas-perspektiv | 🔴 major_nc |

**Totalt:** 5 major NC · 5 minor NC · 0 pass  
**CAPAs i systemet:** 18 (15 nya från certification sprint)

---

## Kritiska blockers (MÅSTE vara klara innan 11 april)

### 1. POL-001 Kvalitetspolicy ✋ Erik (deadline 8 april)
- [ ] Erik läser och godkänner POL-001
- [ ] Dennis kommunicerar till teamet
- [ ] Dennis uppdaterar qms_documents: status=approved, approved_by=erik, approved_at=datum

> **Varför kritisk:** En extern revisor STOPPAR certifieringen om policyn inte är godkänd. ISO 9001 kl. 5.2 absolut krav.

### 2. RoPA quiXzoom + LandveX ✋ Dennis (deadline 8 april)
- [ ] Skapa ropa_records för quiXzoom (zoomers, bilddata, betalningar)
- [ ] Skapa ropa_records för LandveX (kunder, kontaktpersoner)
- [ ] Markera CAPA-2026-002 som completed

> **Varför kritisk:** GDPR Art. 30 kräver RoPA för VARJE personuppgiftsansvarig. IMY-bötesrisk.

### 3. Leverantörskvalificering Top-5 ✋ Winston + Dennis (deadline 10 april)
- [ ] AWS: redan OK — dokumentera formellt
- [ ] Anthropic: kontakta för DPA
- [ ] OpenAI: kontakta för DPA
- [ ] ElevenLabs: kontakta för DPA
- [ ] Revolut: kontakta för DPA

> **Varför kritisk:** ISO 9001 kl. 8.4 kräver leverantörskontroll. GDPR Art. 28 kräver DPA med alla biträden.

### 4. CAPA Rotorsaksanalyser ✋ Alla (deadline 10 april)
- [ ] CAPA-2026-001 (MFA): Johan kör 5-Why
- [ ] CAPA-2026-002 (RoPA): Dennis kör 5-Why
- [ ] CAPA-2026-003 (Policy): Erik + Dennis kör 5-Why

> **Varför kritisk:** ISO 9001 kl. 10.2 kräver RCA — inte bara åtgärd. Revisor kommer fråga.

---

## Thailand dag 1 (11 april) — Obligatorisk agenda

### Morning: Ledningsgenomgång (ISO 9001 kl. 9.3)

**Inputs att adressera (kl. 9.3.2):**
1. Status föregående åtgärder (CAPA-2026-001/002/003)
2. Förändringar i extern/intern kontext
3. Prestanda mot OKR FY2026 (nuläge)
4. Kundtillfredsställelse (NPS om tillgängligt)
5. Processprestation och systemöverensstämmelse
6. Resursbehov Q2/Q3 2026

**Outputs (kl. 9.3.3):**
- Beslut om förbättringsmöjligheter → Decisions-modulen
- Uppdaterade OKRs → OKR-modulen
- Resurstilldelning → Budget-modulen

**Ansvar:** Erik leder · Dennis protokollför · Dokumenteras i management_reviews-tabellen

### Afternoon: ISO 9001 Grundutbildning (kl. 7.2)
- ISO-9001-INTRO kurs (2h, obligatorisk för alla)
- GDPR-BASICS kurs (3h, obligatorisk för alla)

---

## Veckans mål per dag

| Datum | Fokus | Ansvarig | Status |
|-------|-------|----------|--------|
| 4 april | Erik godkänner POL-001 | Erik | ⏳ |
| 5–6 april | RoPA quiXzoom + LandveX | Dennis | ⏳ |
| 7–8 april | DPA-kontakter leverantörer | Dennis + Winston | ⏳ |
| 9–10 april | CAPA rotorsaksanalyser | Alla | ⏳ |
| 11 april | Ledningsgenomgång + ISO-utbildning | Alla | ⏳ |

---

## Styrkepunkter (behåll och bygg vidare)

✅ **Teknisk infrastruktur** — AWS KMS, TLS 1.3, VPC-isolering, audit trail  
✅ **Riskregister** — 15 risker med ägare och deadlines, autonom agent  
✅ **OKR-system** — SMART-mål, automatisk scoring, Annual Planning-koppling  
✅ **Branch protection** — RTM-gate med 4 godkännanden, exemplarisk källkodskontroll  
✅ **Backup & DR** — S3 CRR, RDS automated backups 7 dagar  
✅ **Academy-modulen** — 15 ISO/compliance-kurser redo att köras  

---

## Nästa steg efter Thailand

1. **Boka pre-assessment** med DNV eller Bureau Veritas (Q2 2026)
2. **Implementera MFA** — TOTP i identity-core (Johan, deadline 2026-06-30)
3. **MSB NIS2-registrering** — msb.se/nis2 (Dennis, deadline 2026-05-01)
4. **Sårbarhetsskanningar** — OWASP ZAP via CI/CD (Johan, Q2 2026)
5. **KPI-data** — koppla System Intelligence mot faktiska metrics (Johan, 2026-04-30)
6. **Full extern certifiering** — Q3 2026

---

*Genererat av Wavult OS Certification Sprint Agent · 2026-04-04*  
*10 interna audits genomförda · 18 CAPAs i systemet · Mål: ISO 9001 + ISO 27001 + GDPR + NIS2*
