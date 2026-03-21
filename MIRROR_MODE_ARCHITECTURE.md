# Mirror Mode Architecture — pixdrift

> **Kärnprincipen:** Sälj inte "bättre system". Sälj "byt utan att märka det."
> 
> Mirror Mode gör att pixdrift smyger in, speglar hur verkstaden redan jobbar, och tar gradvis över — utan dramatik, utan utbildning, utan risk.

---

## Strategisk grund

Varför misslyckas systembyten i verkstäder?

1. **Utbildningschock** — Personal måste lära sig ny terminologi, nytt flöde
2. **Data-ångest** — "Vad händer med vår gamla historik?"
3. **Garantirisk** — "Om vi tappar OEM-data är vi körda"
4. **Verksamhetsavbrott** — Ingen verkstad kan stänga ner 2 veckor för migration

Mirror Mode eliminerar alla fyra. pixdrift anpassar sig till verkstaden — inte tvärtom.

---

## De 4 faserna

### Fas 1 — Workflow Mirror (Vecka 1–2)

**Mål:** pixdrift ser ut och beter sig exakt som deras gamla system.

| Aktivitet | Detalj |
|-----------|--------|
| Data-import | ALL historisk data importeras: kunder, fordon, arbetsordrar, reservdelar |
| Terminologi | Samma ord som deras system (Automaster = "Serviceorder", Winbas = "Arbetsorder", Keyloop = "RO") |
| Parallell drift | pixdrift körs BREDVID gamla systemet — ingen integration krävs |
| Noll inlärning | Personal jobbar som vanligt. pixdrift är bara "ett till fönster" |
| Konfiguration | Terminology preset sätts baserat på source_system vid onboarding |

**Framgångsmått:** Personal använder pixdrift utan att fråga "var är X?"

---

### Fas 2 — Data Ownership (Vecka 3–4)

**Mål:** pixdrift blir "source of truth" — data flödar bakåt till gamla systemet.

| Aktivitet | Detalj |
|-----------|--------|
| Nya arbetsordrar | Skapas ENBART i pixdrift |
| Write-through sync | Varje ny AO i pixdrift → automatiskt speglad in i legacy-systemet |
| Gamla AO | Körs fortfarande i gamla systemet (garanti, OEM) |
| Personal | Märker ingen skillnad — de jobbar i pixdrift, legacy uppdateras i bakgrunden |

**Shadow Sync config:**
```json
{
  "source_system": "keyloop",
  "sync_direction": "pixdrift_to_legacy",
  "trigger": "work_order.created",
  "fields": ["customer", "vehicle", "work_description", "parts", "technician"]
}
```

**Framgångsmått:** 0 arbetsordrar skapas direkt i gamla systemet av personal.

---

### Fas 3 — Gradual Lock-out (Månad 2–3)

**Mål:** Gamla systemet används bara som passiv mottagare och OEM-gateway.

| Modul | Lösning |
|-------|---------|
| Garanti & OEM | pixdrift → shadow-export till SAGA2/VIN-system via `guarantee-safe` XML-export |
| Ekonomi | Fortnox/Visma fortfarande aktiv MEN pixdrift genererar SIE4-filer parallellt |
| Lagerstatus | pixdrift är master, gamla systemet uppdateras via sync |
| Rapporter | Chefer kör rapporter i pixdrift (bättre UI), gamla systemet används inte |

**Guarantee-Safe Mode aktiveras:** Alla garantiärenden låsta, audit trail, XML-export kompatibel med SAGA2.

**Framgångsmått:** Personal loggar in i gamla systemet <2 gånger/vecka (enbart garanti).

---

### Fas 4 — Full Takeover (Månad 3–6)

**Mål:** Gamla systemet avvecklat. pixdrift = allt.

| Aktivitet | Detalj |
|-----------|--------|
| OEM-integration | pixdrift → direktintegration med SAGA2/Volvo/BMW via shadow compatibility layer |
| Ekonomi | SIE4-export ersätter Fortnox-integration (eller direkt API-koppling) |
| Gamla systemet | Licensavtal avslutas. Historik arkiveras i pixdrift |
| ROI-rapport | Levereras till kund: sparade timmar, kostnadsbesparing, uptime |

**Framgångsmått:** Gamla systemet är avstängt. Ingen saknar det.

---

## Terminology Mirror

Konfigurerbar per kund. Sätts vid onboarding baserat på vilket system de kommer ifrån.

### Implementation: `server/src/terminology.ts`

```typescript
export type TerminologyKey = 
  | 'work_order' 
  | 'customer' 
  | 'vehicle' 
  | 'technician' 
  | 'parts' 
  | 'warranty';

export type TerminologyPreset = Record<TerminologyKey, string>;

export const TERMINOLOGY_PRESETS: Record<string, TerminologyPreset> = {
  automaster: {
    work_order: 'Serviceorder',
    customer: 'Ägare',
    vehicle: 'Fordon',
    technician: 'Tekniker',
    parts: 'Artiklar',
    warranty: 'Garanti',
  },
  winbas: {
    work_order: 'Arbetsorder',
    customer: 'Kund',
    vehicle: 'Bil',
    technician: 'Mekaniker',
    parts: 'Reservdelar',
    warranty: 'Garantiärende',
  },
  keyloop: {
    work_order: 'RO (Repair Order)',
    customer: 'Customer',
    vehicle: 'Vehicle',
    technician: 'Technician',
    parts: 'Parts',
    warranty: 'Warranty Claim',
  },
  default: {
    work_order: 'Arbetsorder',
    customer: 'Kund',
    vehicle: 'Fordon',
    technician: 'Tekniker',
    parts: 'Reservdelar',
    warranty: 'Garantiärende',
  }
};

// GET /api/config/terminology  → returnerar aktuell terminologi för org
// POST /api/config/terminology → sätt preset ('automaster' | 'winbas' | 'keyloop') eller custom mapping
```

**API-kontrakt:**
- `GET /api/config/terminology` — returnerar aktuell terminologi för organisation
- `POST /api/config/terminology` — `{ preset: 'automaster' }` eller `{ custom: { work_order: 'Serviceuppdrag', ... } }`

---

## Data Import Engine

### Import-flöde

```
Legacy system export  →  Upload (CSV/Excel/JSON/XML)
         ↓
   Preview & Mapping   →  Visa vad som importeras, field-mapping, fel
         ↓
   Validation pass     →  Kontrollera integritet (duplicates, required fields)
         ↓
   Execute import      →  Transaktionell, rollback-säker
         ↓
   Status polling      →  Real-time progress via GET /api/import/status/:job_id
         ↓
   Rollback (24h)      →  Soft delete + restore inom 24 timmar
```

### Stödda källsystem

| System | Format | Kommentar |
|--------|--------|-----------|
| Automaster | CSV export | Standardexport från Automaster 5.x+ |
| Winbas | Excel (.xlsx) | Rapport-export |
| Keyloop | JSON API / CSV | Via Keyloop Export API |
| Fortnox | SIE4 / JSON | Via Fortnox API eller SIE4-fil |
| Generic | CSV, JSON, XML | Konfigurerbar field-mapping |

### SQL: `sql/35_import_jobs.sql`

```sql
CREATE TABLE IF NOT EXISTS import_jobs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            UUID REFERENCES organizations(id),
  source_system     TEXT NOT NULL,    -- 'automaster', 'winbas', 'keyloop', 'fortnox', 'generic'
  status            TEXT DEFAULT 'pending',  -- pending | running | completed | failed | rolled_back
  total_records     INTEGER DEFAULT 0,
  imported_records  INTEGER DEFAULT 0,
  failed_records    INTEGER DEFAULT 0,
  mapping_config    JSONB DEFAULT '{}',
  error_log         JSONB DEFAULT '[]',
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON import_jobs(org_id);
CREATE INDEX ON import_jobs(status);
```

### API-kontrakt: `server/src/import-engine.ts`

```
POST /api/import/preview          → visa mappning och eventuella fel (dry run)
POST /api/import/execute          → kör faktisk import (async job)
GET  /api/import/status/:job_id   → poll status på pågående import
POST /api/import/rollback/:job_id → ångra import (soft delete, 24h window)
POST /api/import/automaster       → shortcut: automaster preset mapping
POST /api/import/winbas           → shortcut: winbas preset mapping
POST /api/import/keyloop          → shortcut: keyloop preset mapping
POST /api/import/fortnox          → shortcut: fortnox/SIE4 mapping
POST /api/import/generic-csv      → generic med custom mapping i body
```

---

## Guarantee-Safe Mode

**Principen:** Garantiärenden är juridiskt känsliga. De kan ALDRIG raderas eller ändras utan spårbarhet.

```
Garanti-AO skapas i pixdrift
        ↓
Guarantee-Safe Mode aktiveras automatiskt
        ↓
Immutable audit trail: varje ändring loggas (timestamp + user + reason)
        ↓
OEM-export: XML i SAGA2-kompatibelt format
        ↓
Submission validation: kontrollera innan man skickar till OEM
```

### API-kontrakt: `server/src/guarantee-safe.ts`

```
GET  /api/warranty/safe-export/:claim_id  → XML för SAGA2/Volvo/BMW/VW
POST /api/warranty/safe-validate          → validera garantiärende innan OEM-submission
GET  /api/warranty/audit-trail/:claim_id  → komplett historik med diff
```

**Säkerhetsregler:**
- `DELETE` är förbjudet på garantiärenden — soft delete with approval workflow
- Alla `PATCH/PUT` kräver `reason` i body
- Audit trail är append-only i separat tabell
- Export-XML valideras mot OEM XSD-schema innan leverans

---

## Shadow Sync

Kör pixdrift och legacy-systemet parallellt under transition — personal märker ingenting.

### Konfiguration

```typescript
// POST /api/shadow-sync/configure
{
  "source_system": "keyloop",       // legacy-systemet
  "sync_direction": "pixdrift_to_legacy",
  "trigger": "work_order.created",  // eller 'work_order.updated', 'invoice.created'
  "fields": [
    "customer_name", "vehicle_reg", "work_description",
    "parts_list", "technician_id", "status"
  ],
  "transform": {
    // Fältmappning pixdrift → legacy-format
    "work_order_id": "RO_NUMBER",
    "customer": "CUSTOMER_NAME"
  }
}
```

### Synk-flöde

```
Tekniker skapar AO i pixdrift
         ↓
Shadow Sync fångar event (webhook/trigger)
         ↓
Transform: pixdrift-format → legacy-format
         ↓
POST till legacy-system API / fil-drop / direktdatabas
         ↓
Log: sync_status = 'success' | 'failed'
         ↓
Retry på fel (3 försök, exponential backoff)
```

---

## Migration Checklist per Fas

### ✅ Fas 1 Ready
- [ ] Terminology preset konfigurerad
- [ ] Historisk data importerad (preview + execute)
- [ ] Personal kan logga in och navigera
- [ ] Gamla systemet fortfarande aktivt

### ✅ Fas 2 Ready
- [ ] Shadow sync konfigurerad och testad
- [ ] Nya AO skapas i pixdrift
- [ ] Sync-logs visar 0 fel under 3 dagar
- [ ] Stickprov: data i gamla systemet matchar pixdrift

### ✅ Fas 3 Ready
- [ ] Guarantee-Safe Mode aktiverat
- [ ] OEM XML-export testad och validerad
- [ ] SIE4 parallell-export aktiv
- [ ] Chefer kör rapporter i pixdrift

### ✅ Fas 4 Ready
- [ ] 30 dagars ren drift utan legacy-inlogg
- [ ] OEM direkt-integration aktiv
- [ ] Ekonomi-integration verifierad
- [ ] ROI-rapport levererad
- [ ] Legacy-avtal avslutat

---

## Riskmatris

| Risk | Sannolikhet | Impact | Mitigation |
|------|-------------|--------|------------|
| Data-förlust vid import | Låg | Hög | Rollback inom 24h, preview innan execute |
| OEM-garanti failar | Låg | Kritisk | Guarantee-Safe Mode + XML validation |
| Legacy-sync tappar data | Medium | Medium | Retry-logic + sync-log monitoring |
| Personal vägrar byta | Låg | Hög | Mirror terminologi + identisk UX i Fas 1 |
| Ekonomi-mismatch | Låg | Medium | SIE4 parallell under 60 dagar |

---

*Mirror Mode — pixdrift Architecture v1.0*  
*Skapad: 2026-03-21*
