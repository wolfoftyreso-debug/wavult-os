# SIMULATION_REPORT.md
## Operationell simulering — 6 testföretag
**Datum:** 2026-03-21  
**Utförd av:** OpenClaw subagent (pixdrift-simulation)  
**Miljö:** Supabase (eu-west-1) + API `https://api.bc.pixdrift.com`

---

## Sammanfattning

| Företag | Bransch | Personal | Simulation | Kommentar |
|---|---|---|---|---|
| Restaurang Björnen AB | Restaurang | 8 | ✅ OK | 3/3 bokf.poster, task, KPI |
| Lindqvists Bilverkstad | Bilverkstad | 12 | ✅ OK | Arbetsorder, garantiärende, NC, serviceintäkt |
| Novacode AB | Tech/SaaS | 45 | ✅ OK | 3 deals framsteg, USD-transaktion, sprint-task, MRR-KPI |
| Svensson Snickeri | Hantverk | 3 | ✅ OK | Projektfaktura, materialkostnad, task |
| VVS Proffsen AB | VVS | 18 | ✅ OK | Serviceintäkt, material, inköpstask, NC |
| Nordic Shop AB | E-handel | 150 | ✅ OK | 47-ordrar batch, EUR-FX, frakt, KPI, NC |

**Resultat: 6/6 simuleringar genomförda utan fel.**

---

## Dataintegritetscheck (1h-window efter simulering)

| Mätvärde | Värde |
|---|---|
| Organisationer (ex Hypbit) | 6 |
| Nya transaktioner | 12 |
| Simulerad omsättning SEK | 131 330 |
| FX-intäkter (reporting SEK) | 144 348 |
| Nya tasks | 4 |
| Nya NC-avvikelser | 3 |
| Nya arbetsordrar | 1 |
| Nya garantiärenden | 1 |
| Nya KPI-poster | 3 |
| Totala deals i systemet | 335 |

---

## API End-to-End Test

### ✅ Fungerar utan autentisering

| Endpoint | Status | Svarstid |
|---|---|---|
| `GET /health` | 200 OK | - |
| `GET /api/reports/income-statement` | 200 OK | 0.85s |
| `GET /api/reports/balance-sheet` | 200 OK | 0.17s |
| `GET /api/reports/sie4` | 200 OK | 0.16s |
| `GET /api/processes` | 200 OK | 0.17s |
| `GET /api/risks/matrix` | 200 OK | 0.14s |
| `GET /api/currencies` | 200 OK | - |
| `GET /api/exchange-rates` | 200 OK | - |

### 🔒 Kräver autentisering (401)

| Endpoint | Status | Kommentar |
|---|---|---|
| `GET /api/contacts` | 401 | Korrekt beteende |
| `GET /api/deals` | 401 | Korrekt beteende |
| `GET /api/dashboards/admin` | 401 | Korrekt beteende |
| `GET /api/banking/banks` | 401 | Korrekt beteende |
| `GET /api/learning/playbooks` | 401 | Korrekt beteende |
| `GET /api/learning/courses` | 401 | Korrekt beteende |
| `GET /api/spaghetti/live-overview` | 401 | Korrekt beteende |
| `GET /api/tasks` | 401 | Korrekt beteende |
| `GET /api/kpis` | 401 | Korrekt beteende |
| `GET /api/non-conformances` | 401 | Korrekt beteende |
| `GET /api/transactions` | 401 | Korrekt beteende |
| `GET /api/work-orders` | 401 | Korrekt beteende |
| `GET /api/warranty-claims` | 401 | Korrekt beteende |

> ℹ️ Notera: `/api/reports/*`, `/api/processes`, `/api/risks/matrix` och `/api/currencies` returnerar 200 utan auth. Det kan vara avsiktligt (publika endpoints) eller ett säkerhetsgap.

---

## Identifierade Problem & Brister

### 🔴 Kritiska schemaproblem (fixade i detta skript)

1. **`transactions.amount` finns inte** — Korrekt schema använder `debit`/`credit`-kolumner (dubbel bokföring). Original-skriptet antog enkelt `amount`-fält.
2. **`kpis.val` finns inte** — Korrekt kolumnnamn är `value`.
3. **`tasks` status enum** — Giltiga värden: `TODO/IN_PROGRESS/REVIEW/DONE/BLOCKED`. Ej `done/in_progress` (gemener).
4. **`deals` status enum** — Pipeline: `NEW → QUALIFIED → DEMO → OFFER → NEGOTIATION → WON/LOST`. Ej `PROPOSAL`.
5. **`non_conformances.code` NOT NULL** — Kräver unikt code-värde; ej auto-genererat.
6. **`work_orders.order_number` NOT NULL** — Kräver unikt ordernummer.
7. **`warranty_claims.claim_number` NOT NULL** — Kräver unikt ärendenummer.

### 🟡 Observationer

1. **Rapporter utan auth** — `/api/reports/income-statement`, `/balance-sheet`, `/sie4`, `/api/processes`, `/api/risks/matrix` svarar 200 utan JWT. Bör verifieras om detta är intentionellt eller ett säkerhetsgap.
2. **`/health` saknar DB-info** — `services.database` returnerar `None`. Health-endpoint rapporterar inte DB-status korrekt (trots att DB fungerar).
3. **DB-anslutning via pooler** — Använder Supabase Connection Pooler (port 5432). Fungerar, men prepared statements måste undvikas vid hög trafik.
4. **KPI ON CONFLICT** — Ursprungsskriptet använde `ON CONFLICT DO NOTHING` utan unik constraint, vilket kan ge duplicerade KPI-rader. Bör lägga till unique constraint på `(org_id, name, period, measured_at::date)`.
5. **Novacode AB** — `reporting_credit` beräkning för FX-transaktion: skriptet beräknar `4800 * 10.42 = 49,980` men loggade `50,016` (pga avrundning med `Math.round`). Bör använda bankens officiella kurs från exchange_rates-tabellen.

### 🟢 Fungerar väl

- Multi-currency-stöd (SEK/USD/EUR) med korrekt `exchange_rate` + `reporting_credit/debit`
- Dubbel bokföring via debit/credit-modell
- NC-systemet med severity-enum fungerar
- Deals pipeline fungerar med korrekt enum-progression
- Work orders och warranty claims fungerar när rätt fält inkluderas
- KPI-mätpunkter skapas korrekt

---

## Rekommendationer

1. **Fixa health-endpoint** — Returnera faktisk DB-status (ping latency, connection pool status).
2. **Säkra publika report-endpoints** — Lägg till org_id-filtrering via JWT-claim eller flytta till autentiserade routes.
3. **Auto-generera löpnummer** — `work_orders.order_number`, `warranty_claims.claim_number`, `non_conformances.code` bör ha DB-sequences eller triggers för att undvika applikationslogik.
4. **API-dokumentation** — Dokumentera vilka endpoints som är publika vs autentiserade.
5. **Unique constraint på KPIs** — Lägg till `UNIQUE(org_id, name, period, DATE(measured_at))` för att undvika duplicering.
6. **FX-kurs från DB** — Hämta exchange rates dynamiskt från `exchange_rates`-tabellen istället för hårdkodade värden.
7. **E2E-test med JWT** — Kör nästa simuleringsomgång med faktiska JWT-tokens för att testa de 401-skyddade endpoints.

---

## Teknisk detalj — körning

```
Simulering kördes: 2026-03-21 ~20:45 CET
Databasmiljö: Supabase (aws-1-eu-west-1)
Node.js version: v22.22.1
Script: scripts/simulate_operations.js
```
