# SYSTEM_MAP.md — Hypbit OS / Wavult Group

> Genererad: 2026-03-26  
> Status: Post-refactor (workstation-vertikal arkiverad)

---

## 🟢 AKTIVA MODULER — Command Center (apps/command-center)

Huvud-UI för Wavult Group. Alla features nedan är live eller aktivt under utveckling.

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/dashboard` | ✅ Live |
| Projects | `/projects` | ✅ Live |
| Tasks | `/tasks` | ✅ Live |
| People | `/people` | ✅ Live |
| Transactions | `/transactions` | ✅ Live |
| Org Graph | `/org` | ✅ Live |
| Org Context | `/org/context` | ✅ Live |
| Command Hierarchy | `/org/command` | ✅ Live |
| Incidents | `/incidents` | ✅ Live |
| Entities | `/entities` | ✅ Live |
| Market Sites | `/markets` | ✅ Live |
| Campaign OS | `/campaigns` | ✅ Live |
| Submissions | `/submissions` | ✅ Live |
| Legal Hub | `/legal` | ✅ Live |
| Company Launch | `/company-launch` | ✅ Live |

**Frontend-stack:** React + TypeScript + Vite + TailwindCSS + shadcn/ui  
**Auth:** RoleContext + EntityScopeContext (multi-entity)

---

## 🟢 AKTIVA SERVER-ROUTES (server/src/)

Routes som är aktiva och relevanta för Wavult/quiXzoom/Optical Insight:

### Core Platform
| Fil | Prefix | Syfte |
|-----|--------|-------|
| `auth.ts` | `/api/auth` | JWT-auth via Supabase |
| `org-admin.ts` | – | Organisation & admin |
| `permissions-admin.ts` | – | Roller & behörigheter |
| `system-admin.ts` | – | Systemadmin |
| `account-safety.ts` | `/api/account-safety` | Kontosäkerhet & offboarding |
| `personnel-api.ts` | – | Personal-API |
| `people-os.ts` | `/api/people` | People OS (ERM) — puls, engagement |
| `deputies.ts` | – | Ställföreträdare |
| `culture-engine.ts` | `/api/culture` | Kultur & event |
| `learning.ts` | `/api/learning` | Utbildning & kompetensutveckling |
| `notifications.ts` | `/api/notifications` | Notifikationer |
| `localization-api.ts` | – | Lokalisering i18n |
| `checkin-api.ts` | `/api/checkin` | Self check-in |

### Wavult Ledger & Finance
| Fil | Prefix | Syfte |
|-----|--------|-------|
| `ledger-api.ts` | `/api/ledger` | Double-entry bokföring, multi-entity |
| `ledger.ts` | – | Ledger-stöd |
| `currency.ts` | `/api/currency` | Multi-currency |
| `reports.ts` | `/api/reports` | Finansiella rapporter |
| `banking.ts` | `/api/banking` | Banking, Fortnox, Visma |
| `billing-api.ts` | `/api/billing` | Fakturering |
| `billing-webhook.ts` | `/api/webhooks` | Billing-webhooks |
| `stripe.ts` | `/api/stripe` | Stripe-integration |
| `revolut.ts` | `/api/revolut` | Revolut-integration |
| `payment-orchestrator-api.ts` | `/api/payment-intents` | Payment Orchestrator |
| `payment-orchestration.ts` | `/api/payments` | Betalningsflöden |
| `payout-api.ts` | `/api/payouts` | quiXzoom fotograf-utbetalningar |
| `psp-router.ts` | – | PSP-routing |
| `vat-compliance.ts` | `/api/vat` | Momshantering (ML 2023:200) |
| `payroll-compliance.ts` | `/api/payroll` | Löne-compliance |
| `personnel-ledger.ts` | `/api/personnel-ledger` | Personalliggare (SFL) |
| `cash-register.ts` | `/api/cash-register` | Kassaregister |
| `compliance-checker.ts` | `/api/compliance` | Compliance-kontroll |
| `asset-accountability.ts` | `/api/tool-assets` | Asset traceability |

### quiXzoom-plattformen
| Fil | Prefix | Syfte |
|-----|--------|-------|
| `mission-api.ts` | `/api/missions` | Fotoruppdrag, geo-zoner, deliverables |
| `mission-engine.ts` | – | Mission-motor (intern) |
| `media-api.ts` | `/api/media` | S3-upload, EXIF, CDN |
| `media-pipeline.ts` | – | Media pipeline-stöd |
| `payout-api.ts` | `/api/payouts` | Fotograf-utbetalningar, escrow |
| `spatial-flow.ts` | `/api/spatial` | Spatial Flow Intelligence |

### Governance & Audit
| Fil | Prefix | Syfte |
|-----|--------|-------|
| `governance-api.ts` | `/api/governance` | Ledger Auditor, Payment Auditor |
| `governance/` | – | Governance-moduler |
| `legal-review.ts` | – | Legal review |
| `audit-workspace.ts` | – | Audit workspace |
| `audit-dashboard-api.ts` | `/api/audit` | Audit dashboard |
| `management-review.ts` | – | Management review |
| `strategic-review-api.ts` | – | Strategic review |
| `company-compliance.ts` | `/api/company` | Bolagscompliance (ABL/SFL/ÅRL) |

### Workflow & Operationellt
| Fil | Prefix | Syfte |
|-----|--------|-------|
| `workflow-engine.ts` | `/api/workflows` | Workflow-motor, mallar, instanser |
| `intelligence-api.ts` | `/api/intelligence` | PIX Intelligence (Palantir-depth analytics) |
| `execution.ts` | – | Task Execution Engine |
| `state-machine.ts` | – | Global state machine |
| `events.ts` | `/api/events` | Event-bus |
| `process.ts` | – | Process-hantering |
| `capability.ts` | – | Capability registry |
| `decision-intelligence.ts` | – | Beslutsintelligens |
| `approvals.ts` | `/api/approvals` | Video-first godkännandeflöden |
| `agreements.ts` | – | Avtal |
| `subcontractors.ts` | – | Underkonsulter |
| `suppliers.ts` | – | Leverantörer |
| `metrics.ts` | – | Metrics |
| `quality-gates.ts` | – | Quality gates |
| `quality-control-api.ts` | – | Kvalitetskontroll |
| `capacity-engine.ts` | – | Kapacitetsplanering |
| `asset-management.ts` | – | Resurshantering |
| `customer-quality.ts` | – | Kundkvalitet |
| `integrations/integration-api.ts` | – | Integrationshubb |
| `dev-integrations.ts` | `/api/dev-integrations` | Dev Infrastructure Hub |
| `seo.ts` | `/api/seo` + `/` | Sitemap, SEO-endpoints |
| `sla-engine.ts` | `/api/sla` | SLA-eskalering |
| `eva-bot.ts` | `/api/eva-bot` | Eva (intern Telegram-bot) |
| `brand-layer.ts` | `/api/brand` | Brand Layer |
| `customer-state.ts` | `/api/customer-state` | Kundstatus |
| `customer-portal.ts` | `/api/customer-portal` | Kundportal |
| `consumables.ts` | `/api/consumables` | Förbrukningsartiklar |
| `shadow-sync.ts` | – | Shadow sync |
| `sms-service.ts` | – | SMS-tjänst |
| `personnel-signals.ts` | – | Personalsignaler |
| `personnel-escalation.ts` | – | Personaleskalonering |
| `exit-capture-api.ts` | – | Exit capture |
| `import-engine.ts` | – | Import-motor |
| `terminology.ts` | – | Terminologi |

---

## 🔴 ARKIVERADE — Bilverkstads-vertikal (beslutat 2026-03-23)

Allt nedan är flyttat till `archive/`. Ska ej driftsättas eller vidareutvecklas.

### Frontend
| App | Kommentar |
|-----|-----------|
| `archive/workstation/` | 35+ bilverkstadsmoduler — DMS, booking, workshop, etc. |

### Server-routes (arkiverade)
| Fil | Syfte |
|-----|-------|
| `vehicles.ts` | Fordonsregister |
| `vehicle-sales.ts` | Fordonsförsäljning |
| `vehicle-intake-api.ts` | Fordonsmottagning (8-vinkel foton etc.) |
| `workshop.ts` | Verkstadshantering |
| `state-machine-workshop.ts` | Workshop state machine |
| `rental-engine.ts` | Hyrbils-motor |
| `rental-partner-api.ts` | Hyrbilspartners (Europcar/Hertz/Avis etc.) |
| `automotive-crm.ts` | Bilverkstads-CRM |
| `booking-engine-api.ts` | Bokningsmotor |
| `missing-part-api.ts` | Missing Part Protocol |
| `fluid-integration-api.ts` | Fluid-integration (Alantec, Orion) |
| `calibration-import.ts` | Kalibreringsimport |
| `swedac-compliance-api.ts` | Swedac-ackreditering |
| `spaghetti.ts` | Spaghetti-diagram (lean verkstad) |
| `damage-management.ts` | Skadehantering |
| `mobility-incident-api.ts` | Mobilitetsskador (bärgning etc.) |
| `checklist-engine.ts` | Checklistmotor (verkstadsflöde) |
| `parts.ts` | Reservdelslager |
| `external-audits.ts` | Externa revisioner (certifieringar) |
| `control-layer.ts` | Control Layer (live-map, bottlenecks) |
| `integrations/oem.ts` | OEM-integrationer |
| `dms-certification.md` | DMS-certifiering (docs, ej kod) |

---

## 🟡 TOMMA STUBS — Ej live, ej prioriterade

| App | Innehåll | Kommentar |
|-----|----------|-----------|
| `apps/hypebit` | `App.tsx` + `LoginScreen.tsx` | Ingen funktion — kravspec saknas |
| `apps/crm` | `App.tsx` + `useApi.ts` | Stub — aktiveras när CRM-spec finns |
| `apps/sales` | Minimalt | Stub — aktiveras när Sales-spec finns |

---

## 🏗️ APPS — Övriga (aktiva)

| App | Status | Syfte |
|-----|--------|-------|
| `apps/command-center` | ✅ Huvud-UI | Wavult enterprise OS |
| `apps/admin` | ✅ Aktiv | BrandSettings, CompensationSettings, IntegrationsHub |
| `apps/landing` | ✅ Aktiv | Statisk landningssida |

---

## 📦 PACKAGES (delade bibliotek)

| Package | Status | Syfte |
|---------|--------|-------|
| `packages/ui` | ✅ Aktiv | Wavult EDOS design system |
| `packages/types` | ✅ Aktiv | Delade TypeScript-typer |
| `packages/i18n` | ✅ Aktiv | Lokalisering (sv, en, de, no, da, fi) |

---

## 🎯 NÄSTA PRIORITET (Q2 2026)

Baserat på HYPBIT_OS_V2.md roadmap:

1. **Ledger Core v2.1** — Multi-currency transaktioner, intercompany flows
2. **quiXzoom Mission Engine** — Stabilisera `/api/missions`, `/api/media`, `/api/payouts`
3. **Entity Core** — Säkerställ att alla tre Wavult-entiteter (Holding/Texas/UAB) är korrekt konfigurerade
4. **Rensa stubs** — Definiera eller ta bort `apps/hypebit`, `apps/crm`, `apps/sales`
5. **Compliance Layer v2.2** — VAT-rapportering per jurisdiktion (Q3 2026)

---

## 📁 ARKIV-STRUKTUR

```
archive/
├── workstation/          ← apps/workstation/ (35 bilverkstadsmoduler)
└── server-routes/        ← Bilverkstads-routes från server/src/
```

---

_Fil skapad av Bernt (OpenClaw AI) 2026-03-26. Uppdatera vid nästa refactor._
