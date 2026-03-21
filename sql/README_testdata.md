# Pixdrift — Testdata README

Genererat av `gen_seed.py` · 6 testföretag · 12 månaders data (2025-03-01 → 2026-02-28)

---

## Översikt

| # | Företag | Bransch | Omsättning | Team | Valuta |
|---|---------|---------|------------|------|--------|
| 1 | Restaurang Björnen AB | Restaurang/Hospitality | ~3,5M SEK/år | 8 pers | SEK |
| 2 | Lindqvists Bilverkstad | Automotive service | ~8M SEK/år | 12 pers | SEK |
| 3 | Novacode AB | SaaS/Tech | ~22M SEK/år | 15 pers | EUR/USD/SEK |
| 4 | Svensson Snickeri | Hantverkstjänster | ~1,8M SEK/år | 3 pers | SEK |
| 5 | VVS Proffsen AB | VVS/Installation | ~12M SEK/år | 18 pers | SEK |
| 6 | Nordic Shop AB | E-commerce | ~95M SEK/år | 15 pers | SEK/EUR/USD/GBP/NOK |

---

## Företagsbeskrivningar

### Org 1 – Restaurang Björnen AB
**Slug:** `restaurang-bjornen` | **Domain:** `bjornen.se` | **UUID-prefix:** `0001xxxx-...`

En medelstort stockholmsrestaurang med 8 anställda. Utmaningar inkluderar hög personalomsättning, leverantörsproblem med råvaror, och varierande trafik under kvällspeaks. Data innehåller dagliga transaktioner, leverantörsfakturor, hygien-compliance (processer) och bemannings-tasks.

**Admin/VD:** Anna Bergström — `anna.bergstrom@bjornen.se`

**Nyckeltal (förväntade):**
- Omsättning: ~291 000 SEK/månad
- Deals: 55 st (cateringavtal, privata event)
- Avvikelser: 6 NC (inklusive 2 kritiska – allergen + kylrum)
- Risker: 3 (personalomsättning, leverantör, brand)

---

### Org 2 – Lindqvists Bilverkstad
**Slug:** `lindqvists-bilverkstad` | **Domain:** `lindqvistsbil.se` | **UUID-prefix:** `0002xxxx-...`

Göteborgbaserad bilverkstad med 12 anställda. Utmaningar: kalibreringsdeadlines för mätinstrument, reservdelshantering, och kundreklamationer. Arbetsordrar modelleras som deals.

**Admin/VD:** Bengt Lindqvist — `bengt.lindqvist@lindqvistsbil.se`

**Nyckeltal (förväntade):**
- Omsättning: ~667 000 SEK/månad
- Deals: 55 st (servicearbeten, reparationer)
- Avvikelser: 6 NC (kalibrering, reklamation, kassaavvikelse)
- Risker: 3 (kalibreringsrisk, reklamationsrisk, nyckelperson)

---

### Org 3 – Novacode AB
**Slug:** `novacode` | **Domain:** `novacode.se` | **UUID-prefix:** `0003xxxx-...`

Stockholmsbaserat tech-bolag med 15 kärnmedlemmar (av totalt 45). Snabb tillväxt, internationella kunder och multi-currency (EUR + USD + SEK). Capability-gaps identifierade inom frontend. Data innehåller projekt-deals, FX-transaktioner, capability-assessments och OKR-goals.

**Admin/VD:** Erik Svensson — `erik.svensson@novacode.se`

**Nyckeltal (förväntade):**
- Omsättning: ~1 833 000 SEK/månad (≈159 000 EUR)
- Deals: 55 st (SaaS-licenser, enterprise, consulting)
- Avvikelser: 6 NC (inklusive GDPR-brott, produktionsincident)
- Risker: 4 (nyckelutvecklare, AWS-outage, FX, GDPR)

---

### Org 4 – Svensson Snickeri
**Slug:** `svensson-snickeri` | **Domain:** `svenssonsnickeri.se` | **UUID-prefix:** `0004xxxx-...`

Litet hantverksföretag i Uppsala med 3 anställda. Enkel struktur med fokus på offert-deals, fakturor och basala tasks. Utmaningar: sjukfrånvaro i litet team och materialprisstegringar.

**Admin/Ägare:** Göran Svensson — `goran.svensson@svenssonsnickeri.se`

**Nyckeltal (förväntade):**
- Omsättning: ~150 000 SEK/månad
- Deals: 55 st (köksrenoveringar, altaner, fönsterbyten)
- Avvikelser: 5 NC (material, kundmissnöje, skydd)
- Risker: 3 (sjukfrånvaro, materialpris, utrustning)

---

### Org 5 – VVS Proffsen AB
**Slug:** `vvs-proffsen` | **Domain:** `vvsproffsen.se` | **UUID-prefix:** `0005xxxx-...`

Malmöbaserat VVS-företag med 18 anställda. Komplexa projekt med subcontractors, certifieringskrav och projektledning. Data inkluderar projektdeals, subcontractor-relaterade NC och compliance-processer.

**Admin/VD:** Christer Magnusson — `christer.magnusson@vvsproffsen.se`

**Nyckeltal (förväntade):**
- Omsättning: ~1 000 000 SEK/månad
- Deals: 55 st (stambyte, värmepumpar, serviceavtal)
- Avvikelser: 6 NC (läckage, certifikat, subcontractor)
- Risker: 3 (subcontractor, certifiering, kopparpris)

---

### Org 6 – Nordic Shop AB
**Slug:** `nordic-shop` | **Domain:** `nordicshop.com` | **UUID-prefix:** `0006xxxx-...`

Stor e-handelsaktör med 150 anställda och 15 kärnpersoner i databasen. Multi-currency (SEK, EUR, USD, GBP, NOK) med komplex finansiell rapportering och hög transaktionsvolym. Utmaningar: cybersäkerhet, logistikavbrott, FX-exponering och GDPR.

**Admin/VD:** Fredrik Almqvist — `fredrik.almqvist@nordicshop.com`

**Nyckeltal (förväntade):**
- Omsättning: ~7 916 000 SEK/månad
- Deals: 55 st (B2B-avtal, marketplace, wholesale)
- Avvikelser: 6 NC (inklusive 2 kritiska – dataintrång, massfelorder)
- Risker: 4 (cyber, logistik, valuta, GDPR)

---

## Hur man kör seed-datan

### Alternativ 1: Supabase SQL Editor (rekommenderas)
1. Öppna [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj projektet `znmxtnxxjpmgtycmsqjv`
3. Gå till **SQL Editor** → New query
4. Klistra in innehållet från `sql/seed_testdata.sql`
5. Klicka **Run**

### Alternativ 2: psql (direkt)
```bash
psql "postgresql://postgres.znmxtnxxjpmgtycmsqjv:Certified2026abc@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f sql/seed_testdata.sql
```

### Alternativ 3: Via Python/supabase-py
```python
from supabase import create_client
import os

url = "https://znmxtnxxjpmgtycmsqjv.supabase.co"
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
sb  = create_client(url, key)

sql = open("sql/seed_testdata.sql").read()
sb.rpc("exec_sql", {"query": sql}).execute()
```

> **Obs:** SQL-filen använder `ON CONFLICT DO NOTHING` och är helt idempotent — kan köras flera gånger utan att duplicera data.

---

## Återställa / rensa testdata

```sql
-- Ta bort allt per org (kör per org_id du vill rensa)
DELETE FROM organizations WHERE slug IN (
  'restaurang-bjornen',
  'lindqvists-bilverkstad',
  'novacode',
  'svensson-snickeri',
  'vvs-proffsen',
  'nordic-shop'
);
-- Cascade tar hand om alla beroende rader automatiskt
```

---

## Tabeller som seedas

| Tabell | Rader totalt | Per org (ca) |
|--------|-------------|--------------|
| `organizations` | 6 | 1 |
| `users` | 71 | 3–15 |
| `companies` | 210 | 35 |
| `contacts` | 210 | 35 |
| `deals` | 330 | 55 |
| `tasks` | 150 | 25 |
| `invoices` | 72 | 12 |
| `transactions` | 216 | 36 |
| `processes` | 60 | 10 |
| `process_executions` | 180 | 30 |
| `non_conformances` | 35 | 5–6 |
| `risks` | 20 | 3–4 |
| `kpis` | 360 | 60 (5 KPIs × 12 månader) |
| `goals` | 18 | 3 |
| **Totalt** | **~1938** | **~323** |

---

## UUID-namnkonvention

Alla IDs är deterministiska och följer mönstret:
```
{ORG_PREFIX:04x}{GROUP:04x}-0000-0000-0000-{SEQ:012x}
```

Exempel:
- `00010001-0000-0000-0000-000000000001` → Org 1, Users group, seq 1 (Anna Bergström)
- `00060006-0000-0000-0000-000000000001` → Org 6, Deals group, seq 1

Groups: `0001`=Org, `0002`=Users, `0003`=Companies, `0004`=Contacts, `0005`=Leads, `0006`=Deals, `0007`=Tasks, `0008`=Invoices, `0009`=Transactions, `000a`=Payouts, `000b`=Processes, `000c`=Executions, `000d`=NC, `000e`=Risks, `000f`=KPIs, `0010`=Capabilities, `0011`=Goals, `0012`=Improvements

---

## Inloggningsuppgifter (mock)

Dessa är mock-credentials för testmiljöer. Auth kopplas via Supabase Auth; `auth_id` i `users`-tabellen är `NULL` tills en faktisk auth.user skapas.

| Org | Rollinnehavare | Email | Lösenord (mock) |
|-----|---------------|-------|-----------------|
| Restaurang Björnen | Anna Bergström | `anna.bergstrom@bjornen.se` | `Test2025!` |
| Lindqvists Bilverkstad | Bengt Lindqvist | `bengt.lindqvist@lindqvistsbil.se` | `Test2025!` |
| Novacode AB | Erik Svensson | `erik.svensson@novacode.se` | `Test2025!` |
| Svensson Snickeri | Göran Svensson | `goran.svensson@svenssonsnickeri.se` | `Test2025!` |
| VVS Proffsen | Christer Magnusson | `christer.magnusson@vvsproffsen.se` | `Test2025!` |
| Nordic Shop | Fredrik Almqvist | `fredrik.almqvist@nordicshop.com` | `Test2025!` |

> Skapa auth-användare via Supabase Dashboard → Authentication → Users, och uppdatera sedan `auth_id` i `users`-tabellen.

---

*Genererat 2026-03-21 av pixdrift-testdata subagent.*
