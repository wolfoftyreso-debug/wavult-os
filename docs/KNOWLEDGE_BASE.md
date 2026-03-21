# pixdrift Kunskapsarkiv
> Skapad: 2026-03-21 | Uppdateras kontinuerligt av Bernt

## Snabbnavigering

| Dokument | Innehåll | Plats |
|---------|---------|-------|
| BRAND_POSITIONING_V2.md | Varumärke, tagline, messaging | /hypbit/ |
| GTM_STRATEGY.md | Global go-to-market (2 600+ rader) | /hypbit/ |
| GTM_OUTREACH_PLAYBOOK.md | Email-templates, cold outreach | /hypbit/ |
| GTM_WORKSHOP_10_CUSTOMERS.md | Exakt playbook för första 10 kunder | /hypbit/ |
| COMPETITOR_ANALYSIS.md | 8 konkurrenter i djupanalys | /hypbit/ |
| ENTERPRISE_AUDIT_REPORT.md | 10-fas audit, 67/100, säkerhetsfynd | /hypbit/ |
| FULL_AUDIT_REPORT.md | Brand/UX/system audit | /hypbit/ |
| VW_AUDIT_REPORT.md | VW DMS-certifieringsaudit | /hypbit/ |
| DMS_VW_COMPATIBILITY.md | SAGA2 shadow compatibility | /hypbit/ |
| MIRROR_MODE_ARCHITECTURE.md | 4-fas takeover-strategi | /hypbit/ |
| BUSINESS_MODEL_REVIEW.md | Affärsmodell (genereras nu) | /hypbit/ |
| SALES_DECK_WORKSHOP.md | Säljpitch bilverkstad | /hypbit/ |
| LAUNCH_PLAN.md | Go-live checklista + marknadsföring | /hypbit/ |
| TODO_FOR_ERIK.md | Manuella åtgärder | /hypbit/ |
| UNREAL_ENGINE_CONCEPT.md | UE5 Pixel Streaming-strategi | /hypbit/ |
| BANKING_INTEGRATION.md | Open Banking PSD2-dokumentation | /hypbit/ |
| ERP_INTEGRATIONS.md | SAP, Oracle, Dynamics 65+ integrationer | /hypbit/ |
| TAX_COMPLIANCE.md | Personalliggare, kassaregister, moms | /hypbit/ |
| DMS_CERTIFICATION.md | OEM-certifieringskrav per märke | /hypbit/ |
| SEO_STRATEGY.md | Sökordsstrategi, content calendar | /hypbit/ |
| PERFORMANCE_REPORT.md | API-svarstider per endpoint | /hypbit/ |
| SIMULATION_REPORT.md | 6 testföretag i simulerad drift | /hypbit/ |

## Strategiska beslut tagna (2026-03-21)

### Positionering
- **Tagline:** "Your Business, Running on pixdrift."
- **Kategori:** Business Operating System (BOS) — inte SaaS-verktyg
- **Analogi:** "Windows för moderna team"
- **Primär differentiering:** Ersätter 5+ verktyg, team-flat pricing, SIE4 nativt

### Vertikal-strategi
- **Beachhead:** Bilverkstäder (DMS + ISO + banking = stark ROI)
- **Entry point:** pixdrift.com/verkstad/ — "Driv hela din verkstad från ett system"
- **Nästa vertikal:** Restaurang (pixdrift.com/restaurang/ finns)
- **Princip:** Samma core → olika entry points (inte olika produkter)

### Mirror Mode
- Fas 1: Kör parallellt, personal märker ingenting
- Fas 2: pixdrift source of truth, skriver bakåt
- Fas 3: Shadow-export till OEM (SAGA2 etc.)
- Fas 4: Legacy avvecklat

### OEM-strategi
- **Börja med:** Volvo Cars (öppnare API, svensk hemmamarknad)
- **Inte:** VW/SAGA2 (kräver kommersiellt avtal, 3-6 mån bara för sandbox)
- **Shadow compatibility:** SAGA2-fält klara, XML-export implementerad

### Pricing
- Starter: €499/mo (upp till obegränsat, team-flat)
- Growth: €999/mo (avancerade features + OEM)
- DMS Pro: €1,499/mo (generalagent-certifiering + multi-location)
- Enterprise: custom

### Budget
- Initialt: 150 000 SEK
- Team: 10 personer + OpenClaw-agenter (~50-persons kapacitet)
- Mål: €80K MRR / €1M ARR på 12 månader

## Teknisk status (2026-03-21)

### Live
- pixdrift.com ✅
- app.bc.pixdrift.com ✅
- admin.bc.pixdrift.com ✅
- crm.bc.pixdrift.com ✅
- sales.bc.pixdrift.com ✅
- api.bc.pixdrift.com ✅
- evasvensson.se ✅ (DNS propagerar)

### Infrastruktur
- AWS Account: 155407238699, eu-north-1
- ECS Cluster: hypbit, Service: hypbit-api
- Supabase: znmxtnxxjpmgtycmsqjv.supabase.co (158 tabeller)
- CloudFront distributions: E30M5LZSQ7FMEZ (apex), EN6V1PLNRWZV (admin), E2P38O4WNORKE9 (crm), E1R5ZQK0FQYN5D (sales)
- GitHub: wolfoftyreso-debug/hypbit (branch: claude/setup-hypbit-oms-B9rQI)

### Credentials att konfigurera (blockerar intäkter)
- STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (saknas → login fungerar ej)
- SUPABASE_ANON_KEY ✅ (fixad 2026-03-21)
- FORTNOX_CLIENT_ID (saknas)
- TINK_CLIENT_ID (saknas)
- ANTHROPIC_API_KEY (saknas → AI-assistent inaktiv)

## Konversationshistorik — Nyckelinsikter

### Om positionering (Erik, 2026-03-21)
"pixdrift ska kännas som Microsoft och att vårt system är Windows"
→ Implementerat: "Business Operating System" kategori, "Running on pixdrift"

### Om vertikal-strategi (Erik, 2026-03-21)
"Vi ska inte paketera olika system — vi ska paketera olika entry points till SAMMA system"
→ Implementerat: /verkstad/, /restaurang/, same core

### Om enforcement (Erik, 2026-03-21)
"Ingen verkstad kan göra fel – systemet tillåter det inte"
→ Implementerat: Hard Enforcement Engine, state machine, 9 transitions

### Om OEM (Erik, 2026-03-21)
"Bygger vi för Volkswagen → funkar för alla"
→ Analys: Shadow compatibility first, Volvo rekommenderas som start

### Om mirror mode (Erik, 2026-03-21)
"Du måste vara både bättre OCH enklare att byta till"
→ Implementerat: Mirror Mode 4-fas, import engine, guarantee-safe mode

## evasvensson.se

### Vad det är
Eva Svenssons coaching-sajt. Separat projekt från pixdrift.

### Status
- Next.js 14 + Tailwind + framer-motion
- Live på Vercel: evasvensson-site.vercel.app
- Domän evasvensson.se propagerar (DNS-byte från Oderland till Cloudflare)
- GitHub: wolfoftyreso-debug/evasvensson-site

### Innehåll
- ICF-certifierad coach, 30+ års erfarenhet
- 9 sidor: /, /handledning-rektorer, /coaching, /sjalvledarskap, /workshops, /om-mig, /referenser, /kontakt, /feedback-som-lyfter
- E-bok: "Feedback som lyfter"
- Sticky CTA, framer-motion animationer, AI-genererade bilder

### Kontakt
- eva@evasvensson.se (placeholder)
- Calendly: https://calendly.com/evasvensson (placeholder)
