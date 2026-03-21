# Hypbit OMS v1.0

Operating Management System. Execution → Capability → Development → Execution.

## Deploy (5 steg)

```bash
# 1. Skapa projekt
chmod +x deploy.sh && ./deploy.sh

# 2. Databas (1 fil, 2073 rader, 40 tabeller)
# Supabase > SQL Editor > klistra in hypbit_deploy_all.sql > Run

# 3. Auth
# Supabase > Auth > Create 5 users
# SQL Editor > INSERT INTO users (se seed-filerna)

# 4. Miljövariabler
# Fyll i .env (Supabase + Stripe)

# 5. Starta
npm run dev
```

## Filstruktur

```
hypbit/
├── src/
│   ├── index.ts          ← hypbit_main.ts
│   ├── execution.ts      ← hypbit_v1_api.ts
│   ├── capability.ts     ← hypbit_oms_capability_engine.ts
│   ├── process.ts        ← hypbit_oms_process_api.ts
│   ├── currency.ts       ← hypbit_oms_currency_api.ts
│   └── reports.ts        ← hypbit_oms_reports.ts
├── trigger/
│   ├── execution.ts      ← hypbit_v1_notifications.ts
│   ├── oms.ts            ← hypbit_oms_notifications.ts
│   ├── process.ts        ← hypbit_oms_process_notifications.ts
│   └── currency.ts       ← hypbit_oms_currency_api.ts (trigger-delen)
├── sql/
│   └── deploy_all.sql    ← hypbit_deploy_all.sql (alla 8 steg)
├── package.json
├── tsconfig.json
└── .env
```

## 5 moduler

| # | Modul | Tabeller | Endpoints | Jobb |
|---|-------|----------|-----------|------|
| 1 | Execution | 18 | 31 | 8 |
| 2 | Capability | 9 | 10 | 6 |
| 3 | Process | 10 | 26 | 6 |
| 4 | Currency | 3 | 8 | 2 |
| 5 | Reports | — | 7 | — |
| | **Totalt** | **40** | **82** | **22** |

## 40 tabeller

```
EXECUTION (18):
  organizations, users, companies, contacts, leads,
  deals, tasks, meetings, meeting_attendees, invoices,
  transactions, payouts, channels, messages, decisions,
  kpis, configs, audit_log

CAPABILITY (9):
  capability_domains, capabilities, role_capabilities,
  user_capabilities, assessments, development_plans,
  development_actions, goals, feedback

PROCESS (10):
  processes, process_executions, non_conformances,
  improvements, compliance_standards, compliance_requirements,
  documents, audits, risks, training_records

CURRENCY (3):
  currencies, exchange_rates, fx_adjustments
```

## 82 endpoints

```
EXECUTION:
  POST/GET  /api/contacts
  POST/GET  /api/companies
  POST/GET  /api/leads
  POST/GET  /api/deals
  PATCH     /api/deals/:id/status
  POST/GET  /api/tasks
  GET       /api/tasks/my
  PATCH     /api/tasks/:id/status
  POST      /api/meetings
  POST      /api/ledger/entries
  GET       /api/ledger/trial-balance
  POST/GET  /api/payouts
  PATCH     /api/payouts/:id/approve
  GET/PATCH /api/config
  POST/GET  /api/decisions
  GET       /api/channels
  POST      /api/messages
  GET       /api/channels/:id/messages
  GET       /api/dashboards/admin
  GET       /api/dashboards/sales
  GET       /api/dashboards/finance
  GET       /api/audit

CAPABILITY:
  GET       /api/capabilities/profile/:userId
  GET       /api/capabilities/team
  POST      /api/capabilities/assess/:userId
  POST      /api/feedback
  GET       /api/development/plan/:userId
  POST      /api/development/generate/:userId
  POST/GET  /api/goals
  GET       /api/goals/:id/readiness
  GET       /api/dashboards/capabilities

PROCESS:
  POST/GET  /api/processes
  POST      /api/processes/:id/execute
  PATCH     /api/process-executions/:id/step
  GET       /api/processes/performance
  POST/GET  /api/nc
  PATCH     /api/nc/:id/status
  GET       /api/nc/summary
  POST/GET  /api/improvements
  PATCH     /api/improvements/:id
  GET       /api/compliance
  GET       /api/compliance/:id/requirements
  PATCH     /api/compliance/requirements/:id
  POST/GET  /api/documents
  GET       /api/documents/review-due
  POST/GET  /api/audits
  POST/GET  /api/risks
  GET       /api/risks/matrix
  POST/GET  /api/training
  GET       /api/dashboards/management

CURRENCY:
  GET       /api/currencies
  GET/POST  /api/exchange-rates
  GET       /api/convert
  GET       /api/fx/exposure
  GET       /api/fx/adjustments
  GET       /api/ledger/trial-balance/multi
  GET       /api/deals/pipeline/multi

REPORTS:
  GET       /api/reports/sie4
  GET       /api/reports/income-statement
  GET       /api/reports/balance-sheet
  GET       /api/reports/general-ledger
  GET       /api/reports/vat
  GET       /api/reports/cashflow
  GET       /api/reports/chart-of-accounts
```

## 22 bakgrundsjobb

```
EXECUTION (8):
  Mån-Fre 07:00   Morgoncheck (teamstatus)
  Var 6h           Deal idle-kontroll
  Var 3h           Task overdue + eskalering
  Dagligen 06:00   KPI-beräkning
  Dagligen 23:00   Trial Balance-kontroll
  Fredag 16:00     Veckostreaks
  Fredag 14:00     Payout batch
  Var 12h          Config watchdog

CAPABILITY (6):
  Söndag 22:00     Capability assessment
  Måndag 08:00     Gap alert
  Kvartalsvis      Auto dev plans
  Onsdag 09:00     Goal readiness
  Varannan fredag  Feedback-påminnelse
  Fredag 16:30     Dev progress

PROCESS (6):
  Mån-Fre 09:00    NC-eskalering
  Måndag 08:00     Dokumentgranskning
  1:a varje månad  Compliance-rapport
  Kvartalsvis      Riskgranskning
  Varannan vecka   Förbättringspipeline
  Fredag 15:00     Process-hälsa

CURRENCY (2):
  Mån-Fre 16:00    ECB-kursuppdatering
  1:a varje månad  FX revaluation
```

## 7 rapporter

```
SIE4              Svensk standard → .se fil → Fortnox/Visma
Resultaträkning   Intäkter, kostnader, rörelseresultat
Balansräkning     Tillgångar, skulder, eget kapital
Huvudbok          Per konto med löpande saldo
Momsrapport       Utgående/ingående moms, kvartalsvis
Kassaflöde        Dagliga in/ut, netto
Kontokarta        BAS-plan med 60+ konton
```

## Multi-currency

```
Valutor:  EUR (rapport), USD, SEK, GBP, NOK, DKK, PLN, CHF
Kurser:   ECB dagligen (auto) + manuella
Princip:  Lagra i original → konvertera till rapport
Ledger:   Varje rad: original + kurs + rapportbelopp
FX:       Månadsvis revaluation → auto-bokföring 3960
```

## 6 systemlagar

1. Ledger är sanningen — inga skugg-saldon
2. Transaction boundaries — definierat per flöde
3. Failure states — varje fel har hantering
4. Data ownership — varje tabell en ägare
5. Governance runtime — policy är kod
6. Noll hårdkodat — allt i config

## Demo-data (ingår)

```
5 företag, 5 kontakter, 3 leads, 5 deals (EUR+USD+SEK)
9 tasks, 14 transaktioner (3 valutor)
2 avvikelser, 2 förbättringar, 4 beslut
7 processer, 17 compliance-krav, 9 dokument, 5 risker
18 capabilities, 8 KPIs, 3 mål, 6 chattmeddelanden
```

## Filkarta (src/)

```
src/
├── index.ts        ← hypbit_main.ts       (entry point, 5 moduler)
├── types.ts        ← hypbit_types.ts       (alla 40 tabeller som TS)
├── execution.ts    ← hypbit_v1_api.ts      (modul 1: 31 endpoints)
├── capability.ts   ← hypbit_oms_capability_engine.ts (modul 2: 10 ep)
├── process.ts      ← hypbit_oms_process_api.ts      (modul 3: 26 ep)
├── currency.ts     ← hypbit_oms_currency_api.ts      (modul 4: 8 ep)
└── reports.ts      ← hypbit_oms_reports.ts            (modul 5: 7 ep)

trigger/
├── index.ts        ← hypbit_trigger_index.ts  (combined entry)
├── execution.ts    ← hypbit_v1_notifications.ts
├── oms.ts          ← hypbit_oms_notifications.ts
├── process.ts      ← hypbit_oms_process_notifications.ts
└── currency.ts     ← hypbit_oms_currency_api.ts (trigger-del)

sql/
└── deploy_all.sql  ← hypbit_deploy_all.sql (allt i 1 fil)
```
