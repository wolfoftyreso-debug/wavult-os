# pixdrift DMS — Certifieringsguide
*Senior Automotive Software Architecture Review — v1.0 — 2026-03-21*

---

## Sammanfattning

pixdrift DMS är byggt för att kunna certifieras och godkännas av generalagenter i den svenska/nordiska bilbranschen. Nedan dokumenteras kraven per OEM, tekniska certifieringssteg och rekommenderad roadmap.

---

## DEL 1: Regulatoriska krav (Sverige/EU)

### ✅ Implementerat
| Krav | Status | Fil |
|------|--------|-----|
| VIN-validering (ISO 3779) | ✅ Fullt implementerat | `server/src/vehicles.ts` |
| GDPR — org-isolering (RLS) | ✅ Row Level Security | `sql/32_dms_schema.sql` |
| Moms 25% (ML 2023:200) | ✅ Faktura-beräkning | `server/src/workshop.ts` |
| ÅRKR/effektiv ränta (KkrL 2010:1846) | ✅ Newton-Raphson impl. | `server/src/vehicle-sales.ts` |
| 3 års reklamationsrätt (KköpL 2022:260) | ✅ Garantiperiod i kontrakt | `server/src/vehicle-sales.ts` |
| Multi-tenant isolering | ✅ `org_id` på alla tabeller | `sql/32_dms_schema.sql` |
| Soft delete (GDPR right to erasure) | ✅ Status=SCRAPPED | `server/src/vehicles.ts` |

### ⚠️ Kräver avtal/API-nyckel
| Krav | Status | Åtgärd |
|------|--------|--------|
| Transportstyrelsen fordonsregistret | 🟡 STUB | Avtal via Bolagsverket + Transportstyrelsen API |
| BankID-signering | 🟡 STUB | Integration med Scrive eller Visma Sign |
| Finansinspektionen (FI) | 🟡 Delvis | Kreditprövning kräver FI-licens om pixdrift erbjuder kredit direkt |
| SPAR (Befolkningsregistret) | 🟡 STUB | Avtal med Skatteverket för adressuppgifter |

---

## DEL 2: Certifieringskrav per generalagent

### 🟡 Volvo Car Sverige — PRIORITET 1

**Varför börja här:** Volvo har tydliga DMS-partnerprogram och öppna API-specifikationer via `developer.volvocars.com`.

| System | Status | Beskrivning |
|--------|--------|-------------|
| VIDA (Vehicle Information and Diagnostics for Aftersales) | 🟡 STUB | Workshop-system för TSB, garantier, teknisk info |
| VOSA (Volvo Order System for Aftersales) | 🟡 STUB | Garantianmälningar och reservdelsorder |
| Volvo Dealer Net (VDN) | 🟡 STUB | Återförsäljarportal för KPI-rapportering |
| CSI-rapportering | ✅ Implementerat | `GET /api/oem/reporting/monthly` + `GET /api/automotive-crm/csi-statistics` |
| ISO 27001 | ❌ Krävs | Under certifiering — prioritera säkerhetsaudit |
| GDPR DPA | ✅ Delvis | Kräver Data Processing Agreement med Volvo Car Sverige |

**Kontakt:** dms@volvocars.com  
**DMS Partner Program:** https://developer.volvocars.com  
**Tid till certifiering:** 3–6 månader

---

### 🟡 Volkswagen Group Sverige — PRIORITET 1 (parallel track)

| System | Status | Beskrivning |
|--------|--------|-------------|
| CROSS DMS-integration | 🟡 STUB | Standardiserat API för orderhantering |
| ETKA (Elektronischer Teile Katalog) | 🟡 STUB | `GET /api/oem/vwgroup/etka/parts` |
| ELSA Pro | 🟡 STUB | Workshop-information och TSB |
| Audi/VW dealer portal APIs | 🟡 STUB | Dealer-portalen |

**Kontakt:** dealer.integration@volkswagen.de  
**Tid till certifiering:** 3–6 månader

---

### 🔵 BMW Group Sverige — PRIORITET 2

| System | Status | Beskrivning |
|--------|--------|-------------|
| BMW DIS (Dealer Integration Standards) | 🟡 STUB | `server/src/integrations/oem.ts` |
| BMW ISTA (Integrated Service Technical Application) | ❌ Krävs | Workshop-diagnostik — kräver BMW-avtal |
| KOBRA (BMW Dealer Online Portal) | 🟡 STUB | KPI och garantihantering via ESB |
| CSI via ESB | ✅ Data tillgänglig | Exporteras via `/api/oem/reporting/monthly` |
| X.509 certifikat | ❌ Krävs | BMW kräver PKI-baserad autentisering |

---

### 🔵 Stellantis Nordic — PRIORITET 3

| System | Status | Beskrivning |
|--------|--------|-------------|
| DealerConnect | 🟡 STUB | Fordonsstatus och orderhantering |
| eParts | 🟡 STUB | Reservdelskatalogsintegration |
| WMS (Warranty Management System) | 🟡 STUB | Garantihantering |

---

### 🔵 Mercedes-Benz Sverige — PRIORITET 3

| System | Status | Beskrivning |
|--------|--------|-------------|
| MO360 DMS-standard | 🟡 STUB | Mercedes DMS-certifieringsstandard |
| XENTRY workshop diagnostics | ❌ Krävs | Kräver MB Star-utrustning och certifiering |
| Warranty Online | 🟡 STUB | `POST /api/oem/mercedes/warranty-claim` |

---

## DEL 3: Tekniska certifieringssteg

### Steg 1 — Sandbox-miljö
```
1. Ansök om DMS Partner-status hos vald OEM (Volvo eller VW)
2. Få access till sandbox/testmiljö
3. Implementera riktig API-integration (byt ut STUB-svar mot riktiga anrop)
4. Kör automatiserade tester mot sandboxen
```

### Steg 2 — Datakvalitetskontroll
```
□ VIN-format: ISO 3779 — KLART (server/src/vehicles.ts)
□ Kunddata: GDPR-kompatibel struktur — KLART
□ Finansieringsberäkning: ÅRKR enligt KkrL — KLART
□ Garantiperioder: KköpL 3 år — KLART
□ Moms: 25% på arbete och delar — KLART
□ Transportstyrelsen: VIN-uppslagning — STUB (kräver avtal)
```

### Steg 3 — Säkerhetsaudit
```
□ Penetrationstest (krav för alla OEM-certifieringar)
□ ISO 27001 (Volvo kräver, BMW rekommenderar)
□ SOC 2 Type II (valfritt men stärker trovärdigheten)
□ API-rate-limiting: ✅ Implementerat
□ JWT-autentisering: ✅ Implementerat
□ Row Level Security (RLS): ✅ Implementerat
□ Audit logging: Delvis (rekommenderas: heltäckande audit trail)
```

### Steg 4 — GDPR DPA
```
□ Data Processing Agreement (DPA) med generalagenten
□ Dataskyddsombud (DPO) — rekommenderas
□ Registerförteckning enligt GDPR Art. 30
□ Dataskyddskonsekvensbedömning (DPIA) för känsliga data
```

### Steg 5 — Pilotinstallation
```
□ 2–3 pilotanläggningar
□ 90 dagars parallellkörning med befintligt DMS
□ User Acceptance Testing (UAT)
□ Datamigration från befintligt DMS (Cabas/Winbas/CDK)
```

### Steg 6 — Godkännandeprocess
```
□ OEM-granskning av certifieringsdokument
□ Teknisk verifiering av API-integrationer
□ Juridisk granskning (avtal, ansvar, SLA)
□ Go/no-go beslut från OEM
Tid: 3–6 månader per OEM
```

---

## DEL 4: Vad saknas för full DMS-certifiering

### Kritiska luckor (blockerande)

| Funktion | Prioritet | Beskrivning |
|----------|-----------|-------------|
| Transportstyrelsen API | 🔴 KRITISK | Fordonsdata, skuldsaldo, besiktning — kräver avtal |
| VIDA-integration (Volvo) | 🔴 KRITISK | Workshop måste kunna se TSB och garantihistorik live |
| ETKA-integration (VW) | 🔴 KRITISK | Reservdelskatalogsökning i realtid |
| BankID-signering | 🟠 HÖG | Kontrakt måste kunna signeras digitalt (Scrive/Visma Sign) |
| PDF-generering | 🟠 HÖG | Offert, kontrakt, leveransprotokoll, PDI-rapport som PDF |
| Bokningskalender | 🟠 HÖG | Riktig mekaniker-/platsbokning med kapacitetsstyrning |

### Viktiga funktioner (ej blockerande initialt)

| Funktion | Prioritet | Beskrivning |
|----------|-----------|-------------|
| Inbytes-värdering | 🟡 MEDEL | Integration med Kvd.se/Bilweb/Autovista för marknadspriser |
| Tekniker-app (mobil) | 🟡 MEDEL | Mekaniker behöver mobil-UI för tidsregistrering |
| Kassaregister (SKVFS 2014:9) | 🟡 MEDEL | Krävs för kontantbetalningar |
| PDI-checklista (OEM-specifik) | 🟡 MEDEL | Volvo/BMW har specifika PDI-krav |
| ACEA data standards | 🟡 MEDEL | Standardiserad datautbyte mellan OEM-system |
| DMS-migrationsverktyg | 🟡 MEDEL | Import från Cabas/Winbas/CDK |
| Besiktningspåminnelser | 🟡 MEDEL | Kräver Transportstyrelsen-data |

### Valfritt (stärker erbjudandet)

| Funktion | Prioritet | Beskrivning |
|----------|-----------|-------------|
| ISO 27001 | 🟢 REKOMMENDERAS | Krävs av Volvo, stärker alla OEM-relationer |
| Elfordons-specifik service | 🟢 REKOMMENDERAS | EV-batteridiagnostik, laddning |
| Försäkringsintegration | 🟢 REKOMMENDERAS | F&I (Finance & Insurance) — intäktspotential |
| Fordonskamera-integrering | 🟢 VALFRITT | Foto vid in/ut för skadeinventering |

---

## DEL 5: API-endpoint-inventering

### Implementerade endpoints: 57 st

#### Fordonsmodul (10 endpoints)
- `POST /api/vehicles/inventory` — Lägg till fordon (VIN-validering inkl.)
- `GET /api/vehicles/inventory` — Lista med filter
- `GET /api/vehicles/inventory/:vin` — Specifikt fordon + VIN-dekodning
- `PATCH /api/vehicles/inventory/:vin/status` — Uppdatera status
- `DELETE /api/vehicles/inventory/:vin` — Soft delete (SCRAPPED)
- `POST /api/vehicles/validate-vin` — ISO 3779 VIN-validering
- `GET /api/vehicles/transportstyrelsen/:reg` — STUB: Transportstyrelsen
- `GET /api/vehicles/inventory/valuation` — Lagervärdering
- `GET /api/vehicles/search` — Fordonssökning

#### Verkstad (13 endpoints)
- `POST/GET /api/workshop/work-orders` — Arbetsorder
- `GET /api/workshop/work-orders/:id` — Detaljer
- `PATCH /api/workshop/work-orders/:id/status` — Status-uppdatering
- `POST /api/workshop/work-orders/:id/time-entry` — Tidsregistrering
- `POST /api/workshop/work-orders/:id/invoice` — Fakturagenerering
- `GET/POST /api/workshop/bookings` — Bokningskalender
- `GET /api/workshop/availability` — Tillgänglighetskontroll
- `GET /api/workshop/technicians` — Teknikerlista
- `GET /api/workshop/technicians/:id/schedule` — Dagplanering
- `POST /api/workshop/pdi` — PDI-rapport
- `POST/GET /api/workshop/warranty-claims` — Garantiärenden
- `GET /api/workshop/warranty-claims/:id/status` — OEM-status
- `GET /api/workshop/recalls` — Aktiva återkallelser
- `POST /api/workshop/recalls/:id/complete` — Slutför återkallelse

#### Reservdelar (8 endpoints)
- `GET/POST /api/parts/inventory` — Lagersaldo
- `GET /api/parts/inventory/low-stock` — Lågt lager
- `PATCH /api/parts/inventory/:part_number` — Uppdatera saldo
- `POST/GET /api/parts/orders` — Beställningar
- `PATCH /api/parts/orders/:id/receive` — Ta emot leverans
- `GET /api/parts/pricing/:part_number` — Prissättning
- `POST /api/parts/pricing/calculate` — Prisberäkning
- `GET /api/parts/catalog/search` — Katalogsökning (STUB+lokal)
- `GET /api/parts/suppliers` — Leverantörslista

#### Bilförsäljning (9 endpoints)
- `POST/GET /api/vehicle-sales/quotes` — Offert-hantering
- `GET /api/vehicle-sales/quotes/:id` — Offertdetaljer
- `PATCH /api/vehicle-sales/quotes/:id/accept` — Acceptera offert
- `POST /api/vehicle-sales/contracts` — Köpekontrakt
- `POST /api/vehicle-sales/trade-in/valuate` — Inbytesvärdering
- `POST /api/vehicle-sales/financing/calculate` — ÅRKR-beräkning
- `GET /api/vehicle-sales/financing/providers` — Finansieringspartners
- `POST /api/vehicle-sales/delivery` — Leveransprotokoll
- `GET /api/vehicle-sales/statistics` — Försäljningsstatistik

#### CRM Automotive (7 endpoints)
- `GET/POST /api/automotive-crm/customer/:id/vehicles` — Kundfordon
- `GET /api/automotive-crm/vehicle/:vin/service-history` — Servicehistorik
- `GET /api/automotive-crm/service-due` — Service inom 30 dagar
- `GET /api/automotive-crm/inspection-due` — Besiktning inom 60 dagar
- `GET/POST /api/automotive-crm/test-drives` — Provkörningar
- `POST /api/automotive-crm/csi-surveys` — CSI-registrering
- `GET /api/automotive-crm/csi-statistics` — CSI-statistik

#### OEM-integrationer (12 endpoints)
- Volvo: 4 endpoints (order-status, warranty, bulletins, recalls)
- BMW: 3 endpoints (vehicle-status, warranty, bulletins)
- VW Group: 3 endpoints (vehicle-tracking, warranty, ETKA)
- Stellantis: 2 endpoints (vehicle-status, warranty)
- Mercedes: 2 endpoints (vehicle-status, warranty)
- `POST /api/oem/webhook/:manufacturer` — Generisk webhook-mottagare
- `GET /api/oem/reporting/monthly` — KPI-rapportering

---

## DEL 6: Snabbaste vägen till certifiering

### Rekommenderad roadmap

```
Vecka 1–4:    Ansök om DMS Partner-status hos Volvo Cars och VW Group
Vecka 2–6:    Implementera riktig Transportstyrelsen-integration
Vecka 4–8:    BankID-signering via Scrive
Vecka 4–8:    PDF-generering (offert, kontrakt, PDI)
Vecka 6–10:   VIDA/VOSA sandbox-integration (Volvo)
Vecka 6–10:   CROSS/ETKA sandbox-integration (VW Group)
Vecka 8–12:   Penetrationstest + säkerhetsaudit
Vecka 10–16:  Pilotinstallation (2–3 anläggningar)
Vecka 16–24:  OEM-certifieringsprocess

Totalt: ~6 månader till första OEM-certifiering
```

### Kontakter
| OEM | Kontakt | Länk |
|-----|---------|------|
| Volvo Cars | dms@volvocars.com | https://developer.volvocars.com |
| VW Group | dealer.integration@volkswagen.de | https://vwgroupsupply.com |
| BMW | dealer.software@bmw.de | https://www.bmw-partner.com |
| Stellantis | dms@stellantis.com | https://dealerconnect.stellantis.com |
| BIL Sweden | info@bilsweden.se | https://bilsweden.se |

### Parallella spår
Medan OEM-certifieringarna pågår:
1. **ISO 27001** — starta certifieringsprocessen direkt (6–12 månader)
2. **GDPR DPA** — ta fram standard DPA-mall med jurist
3. **Pilotanläggningar** — rekrytera 2–3 testanläggningar (gärna multi-märke)
4. **Transportstyrelsen** — avtal tar 4–8 veckor, prioritera

---

## Databastabeller (12 nya)

| Tabell | Rader | Syfte |
|--------|-------|-------|
| `vehicles` | — | Fordonsregister (ISO 3779 VIN) |
| `work_orders` | — | Arbetsorder |
| `work_order_items` | — | Arbetsorderrader (delar, arbete) |
| `time_entries` | — | Teknikertidsregistrering |
| `parts_inventory` | — | Reservdelslager |
| `vehicle_quotes` | — | Offerter (inkl. ÅRKR) |
| `vehicle_contracts` | — | Köpekontrakt (KköpL 3 år) |
| `warranty_claims` | — | Garantiärenden |
| `recalls` | — | Återkallelser |
| `customer_vehicles` | — | Kund ↔ fordon-historik |
| `csi_surveys` | — | Nöjdhetsundersökningar |
| `oem_kpis` | — | OEM KPI-data |
| `test_drives` | — | Provkörningsbokning |

---

*Dokument genererat: 2026-03-21 av pixdrift DMS architector*
*Nästa revision: efter första OEM sandbox-access*
