# TAX_COMPLIANCE.md — pixdrift OMS
# Skatteefterlevnad & Juridiska krav

> **Uppdaterad:** 2026-03-21  
> **Gäller:** pixdrift OMS, version med Swedish Tax Compliance-modulen  
> **Ansvarig:** Implementerande organisation + juridisk rådgivare

---

## ⚠️ KRITISKA VARNINGAR

### 1. Kassaregister — pixdrift ersätter INTE en certifierad kontrollenhet

Enligt **SFL 39 kap. 4-8§§** och **SKVFS 2014:9** krävs:

1. **Certifierad kontrollenhet (CE)** — godkänd av Skatteverket
2. **Kassasystem** (mjukvara) — t.ex. pixdrift

**pixdrift är kassasystem. pixdrift är INTE och kan ALDRIG vara certifierad kontrollenhet.**

En kontrollenhet är en separat hårdvaruenhet som:
- Skyddar och lagrar journaldata på ett manipulationssäkert sätt
- Är godkänd och certifierad av ackrediterat organ
- Kopplas fysiskt till kassasystemet (RS232, USB eller TCP/IP)

**Godkända CE-leverantörer (Skatteverket-certifierade):**
| Leverantör | Produkt | Hemsida |
|---|---|---|
| Infrasec | Infrasec CE | infrasec.se |
| Retail Innovation | CE-enhet | retailinnovation.se |
| ClearOps | ClearOps CE | clearops.se |
| Kassaregistertjänst | KR-CE | kassaregistertjänst.se |

**Aktuell lista:** https://www.skatteverket.se/foretagochorganisationer/moms/kassaregister

**Bot utan CE:** 10 000 kr kontrollavgift (SFL 50:7) + 20 000 kr om ej åtgärdat inom tid.

---

## 2. Personalliggare — Branscher med krav

Enligt **SFL 39 kap. 9-12§§** gäller elektronisk personalliggare för:

| Bransch | SNI-kod | Anmärkning |
|---|---|---|
| Byggverksamhet | 41, 42, 43 | ALL byggarbetsplats med fler än EN person |
| Restaurang och catering | 56 | Inkl. pizzerior, caféer, barer |
| Tvätterier | 9601 | Professionell tvätt |
| Frisörer och skönhetssalonger | 9602 | Inkl. nagelsalonger, barberare |
| Kroppsvård | 9604 | Massage, spa, solarium |
| Biltvättar | 4520 | Automattvättar och handtvätt |

### Krav på personalliggaren (SFL 39:11):
- **Personnummer KRÄVS** (ej valfritt) — kan vara samordningsnummer för utländska
- **Incheckning vid ankomst** — INNAN arbetet påbörjas
- **Utcheckning vid avresa** — NÄR arbetet avslutas
- **Skatteverket kan begära listan** vid kontrollbesök — utan förvarning

### Böter (SFL 50:7a):
- **12 500 kr** per felregistrering (fel personnummer, fel tid, manipulation)
- **2 500 kr** per person som saknas i liggaren
- Inga undantag för "tekniska fel" — systemet måste fungera

---

## 3. Momshantering

### Momssatser (ML 2023:200):
| Sats | Tillämpning |
|---|---|
| **25%** | Standardsats — varor och tjänster generellt (ML 7:1) |
| **12%** | Livsmedel, hotell, restaurang (mat, ej alkohol), rumsuthyrning (ML 7:1 2st.) |
| **6%** | Böcker, tidningar, kulturella tjänster, persontransport (ML 7:1 3st.) |
| **0%** | Export, inomeuropeisk handel (ML 3 kap.), vissa undantag |

### Deklarationsperioder (SFL 26 kap.):
| Omsättning | Period | Förfallodatum |
|---|---|---|
| > 40 MSEK/år | Månadsvis | 26:e månaden efter perioden |
| 1-40 MSEK/år | Kvartalsvis | 26:e kvartalet efter perioden |
| < 1 MSEK/år | Årsvis (valfritt) | 26 december (eller mars om företaget väljer) |

> **OBS:** Förfallodatumet (26:e) flyttas till nästa vardag om det infaller på helg eller röd dag.

### OSS (One Stop Shop) — ML 2023:200, 10c kap.:
- Gäller om du säljer digitalt/fysiskt till EU-konsumenter
- Tröskel: 10 000 EUR/år för SAMTLIGA EU-länder sammanlagt
- Registrera via Skatteverkets OSS-portal

---

## 4. Arbetsgivaravgifter 2026 (SAL 2000:980)

| Ålder | Avgiftssats | Anmärkning |
|---|---|---|
| Under 15 år | 0% | Inga avgifter |
| 15-18 år | 10.21% | Nedsatt (SAL 2:26b) |
| 19-66 år | 31.42% | Full avgift (SAL 2:26) |
| 67-74 år | 16.36% | Nedsatt (SAL 2:26c) |
| Över 74 år | 10.21% | Nedsatt (SAL 2:26d) |

### Arbetsgivardeklaration (AGI) — SFL 26 kap. 19-20§§:
- Lämnas **månadsvis** för varje anställd
- Förfallodatum: **12:e månaden** efter löneutbetalning
- Innehåller: löneutbetalning per anställd + preliminärskatt
- Bot: 625 kr/mån förseningsavgift + skattetillägg

### ROT och RUT — IL 67 kap.:
| Typ | Avdragssats | Maxbelopp/år/person |
|---|---|---|
| ROT (Reparation, Ombyggnad, Tillbyggnad) | 50% av arbetskostnad | 50 000 kr |
| RUT (Rengöring, Underhåll, Tvätt) | 50% av arbetskostnad | 75 000 kr |

**ROT kräver:** fastighetsbeteckning + ägarskap verifierat hos Lantmäteriet  
**Ansökan:** via Skatteverkets e-tjänst — utbetalning direkt till utföraren

---

## 5. Datalagring och GDPR

### Lagringstider (BFL 7 kap. + SFL):

| Data | Lagringstid | Lagstöd |
|---|---|---|
| Räkenskapsinformation (fakturor, kassajournal, Z-rapporter) | **7 år** | BFL 1999:1078, 7 kap. 2§ |
| Personalliggare (incheckningstider, roller) | **5 år** | SFL-praxis + BFL |
| Personnummer | **5 år** (sedan anställningens slut) | GDPR + SFL |
| Momsdeklarationer | **7 år** | BFL 7:2 |

### GDPR-hantering av personnummer:

**pixdrift lagrar aldrig personnummer i klartext.** Implementering:

1. **SHA-256 hash** (med salt) — för sökning/identifiering utan att lagra klartextnummer
2. **AES-256-CBC kryptering** — för att kunna läsa upp numret vid kontrollbesök
3. **Row Level Security (RLS)** — Supabase-policies tillåter bara ADMIN/OWNER att läsa krypterade personnummer
4. **Aldrig i API-svar** — endpoints returnerar aldrig fullständigt personnummer, bara maskerat (****-**XX)

**Konfiguration som MÅSTE sättas i .env:**
```env
PNR_ENCRYPTION_KEY=<64 hex-tecken, genereras med: openssl rand -hex 32>
PNR_HASH_SALT=<64 hex-tecken, genereras med: openssl rand -hex 32>
```

**Dessa nycklar får ALDRIG:**
- Committas till Git
- Loggas
- Skickas i API-svar
- Delas med tredje part (utom vid Skatteverkets officiella förfrågan med domstolsbeslut)

**GDPR-rättigheter:**
- Rätt till radering (GDPR Art. 17) — BEGRÄNSAD av BFL/SFL-lagringstider under 5-7 år
- Rätt till access (GDPR Art. 15) — individen kan begära ut sina egna data

---

## 6. API-nycklar och Skatteverket-integration

### Skatteverkets e-tjänster (kräver e-legitimation/certifikat):

| Tjänst | URL | Används för |
|---|---|---|
| Momsdeklaration | skatteverket.se/etjanster | Inlämning av momsdeklaration |
| AGI | skatteverket.se/agi | Arbetsgivardeklaration per anställd |
| ROT/RUT | skatteverket.se/rotochrut | Ansökan om utbetalning |
| KU-uppgifter | skatteverket.se/ku | Kontrolluppgifter (KU10) |
| VIES | ec.europa.eu/vies | EU VAT-nummer validering |

### API-integration (framtida):
Skatteverket erbjuder API via **Skatteverkets API-portal** (api.skatteverket.se).  
Kräver: organisationsnummer + e-legitimation för autentisering.

---

## 7. Kontrollbesök av Skatteverket

Skatteverket har rätt att göra oanmälda kontrollbesök och begära:

1. **Personalliggare** — lista över alla inne just nu (GET /api/personnel-ledger/present)
2. **Kassajournal** — transaktioner för valfri period (GET /api/cash-register/journal)
3. **Z-rapporter** — dagliga stängningsrapporter

**Vid kontrollbesök:**
- Administratör loggar in → Tax Compliance → Personalliggare → Exportera XML (Skatteverket)
- Kassajournal kan exporteras som CSV direkt

---

## 8. Vad pixdrift INTE gör (och vad som kräver externt system)

| Funktion | pixdrift | Externt krav |
|---|---|---|
| Kassasystem (mjukvara) | ✅ | — |
| Certifierad kontrollenhet (CE) | ❌ | Separat hårdvara (CE-leverantör) |
| Signering av skattedata mot Skatteverket | ❌ | E-legitimation/certifikat |
| Lönesystem (exakt skattetabell) | Approximation | Skatteverkets skattetabeller (SKV 425) |
| Bokföring (verifikat) | Delvis | Bokföringsprogram (Fortnox, Visma, etc.) |

---

## 9. Ansvar

**pixdrift tillhandahåller verktyg.** Ansvaret för skatteefterlevnad ligger hos:
- Företagaren (juridiskt ansvarig)
- Redovisningskonsulten/revisorn
- Eventuell juridisk rådgivare

pixdrift kan inte hållas ansvarigt för böter som uppstår p.g.a.:
- Att certifierad kontrollenhet ej är ansluten
- Felaktig konfiguration av branscher/arbetsplatser
- Manuell manipulation av data
- Fel i externa system (VIES, Skatteverkets API)

---

*Denna dokumentation är baserad på gällande lagstiftning per 2026-03-21.*  
*Kontrollera alltid med auktoriserad redovisningskonsult eller jurist för er specifika situation.*
