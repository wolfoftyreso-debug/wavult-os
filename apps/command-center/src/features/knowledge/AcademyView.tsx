import { useState } from 'react'
import { useTranslation } from '../../shared/i18n/useTranslation'

interface Lesson {
  title: string
  duration: number // minutes
  content: string
}

interface Course {
  id: string
  title: string
  description: string
  icon: string
  color: string
  lessons: Lesson[]
}

const COURSES: Course[] = [
  // ── Dag 1-kurs ── Ny teammedlem — snabbstart ────────────────────────────────
  {
    id: 'dag-1',
    title: 'Ny teammedlem — Dag 1',
    description: 'Den snabbaste vägen in. Vad vi bygger, vilka vi är och hur du hittar rätt från dag ett.',
    icon: '🚀',
    color: '#EC4899',
    lessons: [
      {
        title: 'Vad vi bygger — 2 minuter',
        duration: 2,
        content: `Wavult Group bygger tre inbyggda produkter som tillsammans bildar en värdekedja.

**QuiXzoom**
En mobilapp där zoomers — frilansar med smartphones — tar geo-taggade fotouppdrag mot betalning. Tänk Uber Eats, fast för bilddata. Vi kallar det "last mile intelligence capture".

**Quixom Ads**
B2B-monetisering av QuiXzoom-datan. Hyperlokal affärsintelligens och annonsering. Aktiveras i fas 2.

**Landvex**
Enterprise B2G-plattform. Säljer händelsebaserade larm och analysabonnemang till kommuner och Trafikverket. Kärnvärdet: *"Right control. Right cost. Right interval."*

**Sekvensen är låst:**
QuiXzoom bygger datan → Quixom Ads monetiserar den → Landvex säljer analysen till offentlig sektor. I den ordningen, inte tvärtom.

**Nästa lansering:** Sverige, mitten juni 2026. Startpunkt: Stockholms skärgård.`,
      },
      {
        title: 'Teamet — vem gör vad',
        duration: 3,
        content: `Wavult Group är 5 personer plus en AI-agent. Lär dig vem som äger vad.

**Erik Svensson — Chairman & Group CEO**
Grundare och yttersta beslutsfattaren. Äger produktvisionen. Alla L3-beslut (> 50 000 SEK, bolagsavtal) kräver Eriks signatur.
Kontakt: +46 709 123 223

**Leon Russo — CEO Wavult Operations**
Dag-till-dag drift, sälj och zoomer-rekrytering. Frågor om operations, HR, sälj → Leon.
Kontakt: +46 738 968 949

**Dennis Bjarnemark — Chief Legal & Operations (Interim)**
Allt juridiskt: bolagsbildningar, avtal, compliance, GDPR. Frågor om juridik → Dennis.
Kontakt: +46 761 474 243

**Winston Bjarnemark — CFO**
Finans, bokföring, bank, transfer pricing, zoomer-utbetalningar. Frågor om ekonomi → Winston.
Kontakt: +46 768 123 548

**Johan Berglund — Group CTO**
All tech: AWS, frontend, backend, mobile, CI/CD. Frågor om teknik → Johan.
Kontakt: +46 736 977 576

**Bernt — AI-agent**
OpenClaw-instans integrerad i Wavult OS. Klicka på 🤖-knappen i topbaren. Bernt kan svara på de flesta frågor och utföra uppgifter.

**Kommunikation:** Telegram är primär kanal. Be om access till teamets grupp direkt.`,
      },
      {
        title: 'Bolagsstrukturen — förenklat',
        duration: 3,
        content: `Wavult Group har 6 juridiska entiteter. Du behöver förstå strukturen på en övergripande nivå.

**Lagret 1 — Dubai (Holding & IP)**
• Wavult Group FZCO — äger all IP, varumärken och kod. 0% skatt på IP-inkomster.
• Wavult DevOps FZCO — bygger systemen, licensierar IP till driftsbolagen.

**Lagret 2 — Driftsbolag**
• QuiXzoom Inc (Delaware, USA) — global/USA-verksamhet
• QuiXzoom UAB (Litauen) — EU-verksamhet, GDPR-hemvist
• Landvex AB (Stockholm, Sverige) — säljer till svenska kommuner
• Landvex Inc (Houston, Texas) — säljer till amerikanska myndigheter

**Varför Dubai?**
IP registrerat i Dubai beskattas med 0%. Driftsbolagen betalar en del av sina intäkter som "IP-licens" uppåt till Dubai — legalt och OECD-compliant. Effektiv skattesats för koncernen: < 5%.

**Status 2026-03-27:**
Dubai-bolagen är inte bildade ännu (business plan klar). Texas LLC halvklar. Sverige-namnbyte pågår.

**Du behöver inte detaljerna nu** — läs "Bolagsstruktur — Komplett Koncernkarta" i Kunskapsbasen när du är redo.`,
      },
      {
        title: 'Verktyg & access — checklista',
        duration: 2,
        content: `Säkra din access dag 1 — be din manager om följande:

**Alla i teamet:**
• Telegram — primär kommunikationskanal (privat grupp)
• Wavult OS — admin-inbjudan (detta system)
• E-postkonto (namn@hypbit.com) — be Leon

**Tech-teamet (Johan-sidan):**
• GitHub — wolfoftyreso-debug/hypbit (repo-access)
• Supabase — wavult-os + quixzoom-v2 projekt
• AWS Console — account 155407238699 (begränsat read-only för start)
• Cloudflare — pages.dev-access

**Finance (Winston-sidan):**
• Revolut Business — kortaccess

**Legal (Dennis-sidan):**
• DocuSign — för digitala signaturer
• Bolagsverket-access (om relevant)

**Bernt är alltid tillgänglig** via 🤖-knappen — ingen access krävs. Fråga Bernt om du fastnar.`,
      },
      {
        title: 'Thailand Workcamp — 11 april 2026',
        duration: 2,
        content: `**Det första stora milstolpen för hela teamet är Thailand Workcamp.**

**Datum:** 11 april 2026  
**Plats:** Bangkok, Thailand — Nysa Hotel, Sukhumvit 13  
**Deltagare:** Erik, Leon, Dennis, Winston, Johan

**Vecka 1 — Utbildning & Orientering:**
• Måndag: Ankomst & kickoff
• Tisdag: Wavult OS Bootcamp — alla tar Academy-kurserna
• Onsdag: Bolagsstruktur & juridik
• Torsdag: Tech Deep Dive
• Fredag: Teambuilding
• Lördag–Söndag: Sprint-planering

**Vecka 2+ — Byggfas:**
• QuiXzoom MVP klart för Sverige-lansering
• Landvex beta-sajt live
• Dubai-struktur presenterad

**Mål för dig innan workcamp:**
Klara minst 2 Academy-kurser + Zoomer-certifieringen. Alla i teamet ska vara certifierade.`,
      },
    ],
  },
  {
    id: 'wavult-os',
    title: 'Wavult OS — Grundkurs',
    description: 'Lär dig navigera Wavult OS: moduler, entiteter, roller och workflow för hela koncernen.',
    icon: '🖥️',
    color: '#3B82F6',
    lessons: [
      {
        title: 'Vad är Wavult OS?',
        duration: 5,
        content: `Wavult OS är det interna enterprise-operativsystemet för hela Wavult Group. Det är inte ett traditionellt operativsystem — det är ett webbaserat control center som samlar all verksamhetsinformation på ett ställe.

**Varför Wavult OS?**
Utan ett centralt OS tappar växande bolag kontrollen. Information ligger utspridd i e-post, Notion, Google Sheets och Slack. Wavult OS löser det problemet genom att ge varje teammedlem exakt den information och de verktyg de behöver — baserat på deras roll.

**Vad finns i Wavult OS?**
• Dashboard — realtidsöversikt av hela koncernen
• Finance — budgetar, cashflow, intercompany-fakturering  
• CRM — kunder och säljpipeline (Landvex-kunder, QuiXzoom B2B)
• Legal — bolagsavtal, compliance-status, signaturer
• Knowledge Hub — detta system! Allt Wavult Group vet, strukturerat
• Communications — nyhetsbrev, Bernt-interaktion
• System Status — infrastrukturhälsa, ECS-status, alerts

**Tech Stack:**
Wavult OS är byggt i React 18 + TypeScript, Tailwind CSS, Vite. Det körs på Cloudflare Pages (global CDN, blixtsnabbt). Ingen server — all state i Supabase (projekt: wavult-os, eu-west-1).`,
      },
      {
        title: 'Shell, Sidebar & Navigation',
        duration: 5,
        content: `Wavult OS har ett konsekvent shell-ramverk som omsluter alla moduler.

**Sidebar (vänster)**
Sidebaren är organiserad i grupper:
• CORE: Dashboard, Alerts
• BUSINESS: Finance, CRM, Legal
• PRODUCTS: QuiXzoom, Landvex
• TEAM: HR, Communications
• KNOWLEDGE: Knowledge Hub (du är här)
• SYSTEM: Settings, Status

Klicka på en grupp för att fälla ut/ihop den. Aktivt objekt markeras med brand-accent (lila).

**Topbar**
• Vänster: Wavult-logga + bolagets namn
• Mitten: Global sökruta (sök i hela OS:et)
• Höger: Entitetsväljare + Rollindikator + Bernt-knapp

**Bernt-knapp (🤖)**
Klicka för att öppna Bernt direkt i OS:et. Bernt har tillgång till all data i Wavult OS och kan svara på frågor, skapa rapporter och utföra uppgifter.

**Tangentbordsgenvägar:**
• Cmd/Ctrl + K → Global sök
• Escape → Stäng modal
• Tab → Navigera mellan element`,
      },
      {
        title: 'Entity Scope — Filtrera per Bolag',
        duration: 5,
        content: `Wavult Group har 6 juridiska entiteter. Entity Scope låter dig se data för ett specifikt bolag — eller för hela koncernen.

**Entiteter i systemet:**
• Wavult Group (hela koncernen — aggregerad vy)
• Wavult DevOps FZCO (Dubai — tech + operations)
• QuiXzoom Inc (Delaware, USA)
• QuiXzoom UAB (Vilnius, Litauen)
• Landvex AB (Stockholm, Sverige — org.nr 559141-7042)
• Landvex Inc (Houston, Texas)

**Hur det fungerar:**
Välj entity i topbar-dropdown. Alla moduler filtreras automatiskt — Finance visar bara det bolagets konton, Legal visar bara det bolagets avtal, CRM visar bara det bolagets kunder.

**Varför det är viktigt:**
Intercompany-transaktioner kräver tydlig separation. Om du jobbar med Landvex AB:s bokföring ska du INTE se QuiXzoom:s data — det förvirrar och kan leda till felaktiga beslut.

**Admin-rollen** ser alltid hela koncernen oavsett entity scope.`,
      },
      {
        title: 'Roller: Admin, CEO, CFO, CTO, Ops',
        duration: 5,
        content: `Wavult OS har ett rollbaserat åtkomstsystem (RBAC). Din roll bestämmer vilka moduler du ser och vilka åtgärder du kan utföra.

**Rollerna:**

**Admin (Erik Svensson)**
Full access till allt. Kan skapa användare, ändra systemkonfiguration, godkänna L3-beslut.

**CEO (Erik / Leon)**
Access till alla affärsmoduler: Finance, CRM, Legal, Products, Communications. Kan godkänna avtal upp till L2.

**CFO (Winston Bjarnemark)**
Full access till Finance-modulen. Begränsad access till Legal (se ej signera). Kan se men ej ändra CRM.

**CTO (Johan Berglund)**
Full access till Systems-sektionen. Kan se men ej ändra Finance. Access till alla tekniska konfigurationer.

**Ops (Leon Russo)**
Access till CRM, Communications, HR. Begränsad Finance (kan se budgetar, ej ändra).

**Signaturrätt:**
• L1: Valfri roll < 1 000 SEK
• L2: CEO-roll < 50 000 SEK  
• L3: Admin + Board Member (Dennis) — allt ovanför`,
      },
      {
        title: 'Knowledge Hub — Så Används Det',
        duration: 5,
        content: `Knowledge Hub (denna modul) är Wavult Groups samlade kunskapsbank. Det är designat för djupläsning — inte snabb skanning.

**Flikar i Knowledge Hub:**
• Kunskapsbas — dokument med djupt innehåll (detta!)
• Kunskapsgraf — visuell karta över hur entiteter hänger ihop
• Utbildning — strukturerade kurser med progress-tracking
• Zoomer-cert — certifieringsprogram för QuiXzoom-fältpersonal
• Idéportfolio — Eriks 13 Lovable-projekt, klonare Mars 2026

**Hur du läser ett dokument:**
1. Välj kategori (eller Alla)
2. Sök om du letar efter något specifikt
3. Klicka ett kort för att öppna dokumentet
4. Scrolla — varje dokument har hundratals ord av verklig information
5. Använd "Nästa dokument" för att fortsätta läsa

**Lästiden** visas på varje kort (~X min). Ta din tid — dessa dokument är skrivna för att du ska lära dig, inte för att du ska hinna klicka igenom.

**Bernt och Knowledge Hub:**
Bernt har tillgång till all information i Knowledge Hub. Istället för att läsa allt kan du fråga Bernt: "Förklara Landvex prismodell" eller "Vilka är stegen för Texas LLC?"`,
      },
      {
        title: 'Dashboard & Alerts',
        duration: 5,
        content: `Dashboard är Wavult OS startsida — realtidsöversikt av hela koncernen.

**Dashboard-widgets:**
• Infrastrukturstatus (ECS, Supabase, CloudFront — grön/gul/röd)
• Bolagsstatus (6 entiteter, bildningsstatus)
• Finansöversikt (budget vs utfall per bolag)
• Aktiva uppgifter och deadlines
• Team-aktivitet (senaste commits, deployments)
• Bernt-aktivitet (senaste AI-interaktioner)

**Alerts:**
Samlar alla aktiva incidents — tekniska problem, juridiska deadlines, kritiska affärshändelser.

Incident-nivåer:
• P0 (Röd): Produktionen nere — omedelbar åtgärd
• P1 (Orange): Kritisk funktion påverkad — åtgärd inom 1h  
• P2 (Gul): Degraderad funktion — åtgärd inom 24h
• P3 (Blå): Planerat arbete — nästa sprint

**Bernt-integration:**
Bernt kan skapa incidents automatiskt när den detekterar problem. Ex: "ECS service unhealthy → P1 incident skapad automatiskt."`,
      },
      {
        title: 'Inställningar & Systemstatus',
        duration: 5,
        content: `Settings-modulen ger admin-kontroll över Wavult OS konfiguration.

**Användare & Roller:**
Lägg till teammedlemmar, tilldela roller, sätt entity-access per person.

**Integrationer:**
• Cloudflare API (DNS, Pages deploy)
• AWS (ECS, S3, CloudFront — read-only)
• Supabase (real-time data)
• n8n (automation-triggers)
• GitHub (webhook för commits/deploys)

**Bernt-konfiguration:**
• Ändra Bernt-persona och instruktioner
• Konfigurera vilka kanaler Bernt svarar på
• Sätt Bernt-access till specifika moduler

**System Status:**
Realtidsstatus för all infrastruktur:
• ECS Services (wavult-os-api, quixzoom-api, n8n, team-pulse)
• Supabase (EU West — quixzoom-v2 + wavult-os)
• CloudFront distributions
• Cloudflare Pages (wavult-os, landvex-eu, optical-insight-eu)
• S3 Buckets (4 buckets, EU + US)

Allt grönt = allt bra. Rött = Bernt notifierar automatiskt.`,
      },
    ],
  },
  {
    id: 'quixzoom',
    title: 'QuiXzoom — Plattformsguide',
    description: 'Crowdsourcad kamerainfrastruktur: affärsmodell, tech stack, uppdragsflöde och Zoomer-nätverket.',
    icon: '📸',
    color: '#F59E0B',
    lessons: [
      {
        title: 'Vision: Last Mile Intelligence Capture',
        duration: 6,
        content: `QuiXzoom är byggt kring en enkel insikt: världen är full av platser som aldrig fotograferas systematiskt.

**Problemet:**
Privata bryggor, industriområden, landsvägar, parkeringsplatser, parker — dessa platser förändras konstant men ingen ser det. Kommuner vet inte när en brygga gått sönder. Fastighetsbolag vet inte när ett tak börjar läcka. Infrastrukturägare blundar och hoppas.

**Lösningen:**
QuiXzoom bygger ett nätverk av zoomers — vanliga människor med smartphones — som tar geo-taggade uppdrag och levererar bilddata mot betalning. Resultatet: ett levande, uppdaterat bildlager av hela världen.

**"Last Mile Intelligence Capture"**
Satellit täcker allt — men på 500 meters höjd. Drönare täcker mycket — men kräver tillstånd och är dyra. Traditionell kamera täcker lite — och kräver anställda.

Zoomers täcker last mile: gatunivå, inomhus, bryggor, gränder, taketer. Allt det satelliter och drönare inte når.

**Varför nu?**
• 6,8 miljarder smartphones globalt
• Gig-economy-vanan hos 18–35-åringar
• AI kan nu analysera bilder automatiskt på sekunder
• 5G gör realtidsuppladdning möjlig överallt

QuiXzoom är infrastruktur. Det spelar ingen roll om zoomers vet varför deras data är värdefull — de tar uppdrag, levererar, får betalt. Vi gör resten.`,
      },
      {
        title: 'Affärsmodell & Intäktsflöden',
        duration: 7,
        content: `QuiXzoom har tre intäktsströmmar som aktiveras i sekvens.

**Ström 1: Uppdragsmarginalen (live från dag 1)**
Klienter betalar för uppdrag. Zoomers utför. QuiXzoom tar 25%.

Exempelkalkyl:
• Klient betalar 100 SEK/uppdrag
• Zoomer får 75 SEK
• QuiXzoom behåller 25 SEK brutto
• Kostnader (infra, validering, support): ~5 SEK
• Netto: ~20 SEK per uppdrag

Vid 10 000 uppdrag/månad → 200 000 SEK/mån i bruttovinst.
Vid 100 000 uppdrag/månad → 2 000 000 SEK/mån.

**Ström 2: Quixom Ads (aktiveras fas 2)**
Datan paketeras och säljs B2B. Exempelpriser:
• "Alla bryggägare på Värmdö" — leadpaket: 25 000 SEK
• Hyperlokal annons i appen: 50 SEK CPM
• Månatlig databasering (franchise): 5 000–50 000 SEK/mån

**Ström 3: Landvex Enterprise (aktiveras fas 3)**
Databasen licensieras till kommuner via Landvex-plattformen.
• Basabonnemang: 4 900 SEK/mån
• Standard: 14 900 SEK/mån
• Enterprise: 49 000+ SEK/mån

**Unit Economics (mål år 1–2):**
• CAC (cost to acquire one zoomer): < 300 SEK
• LTV (lifetime value per zoomer): 5 000 SEK (83 uppdrag × 60 SEK netto)
• LTV/CAC ratio: > 16x — mycket hälsosamt`,
      },
      {
        title: 'Zoomer-roller: Standard, Pro, Elite',
        duration: 5,
        content: `QuiXzoom-nätverket har tre nivåer av zoomers. Alla börjar som Standard och uppgraderar baserat på merit.

**Standard Zoomer**
Krav: Grundkurs klar, 5 godkända testuppdrag, ID-verifierad, avtal signerat.
Tillgång: Standarduppdrag i sin region.
Betalning: Basersättning per uppdrag.
Exempel: 25–150 SEK beroende på uppdragstyp.

**Pro Zoomer**
Krav: 50+ slutförda uppdrag, genomsnittligt betyg ≥ 4.5/5.0.
Tillgång: Alla standarduppdrag + prioritetskö + specialuppdrag (videouppdrag, nattuppdrag).
Betalning: Basersättning × 1.20 (20% bonus).
Förmåner: Dedicated support, tidig access till nya uppdragstyper.

**Elite Zoomer**
Krav: 200+ uppdrag, betyg ≥ 4.8/5.0, specialistutbildning (drönare, termalkamera, etc.)
Tillgång: Alla uppdrag + exklusiva enterprise-uppdrag (direkta Landvex-kontrakt).
Betalning: Basersättning × 1.50 + kvartalsbonus.
Förmåner: Officiell QuiXzoom Ambassador, co-marketing möjligheter.

**Varför nivåer?**
Det skapar motivation att stanna kvar och bli bättre. En Elite Zoomer är en investering — de har bevisat sin kvalitet och vi vill behålla dem. Churn-risken minskar dramatiskt efter 50+ uppdrag.

**VIKTIGT — NOMENKLATUR:**
Kalla dem ALDRIG fotografer, fältpersonal, operatörer eller field agents.
De är ZOOMERS. Det är en identitet, inte en jobbeskrivning.`,
      },
      {
        title: 'Uppdragsflöde: Skapande → Leverans',
        duration: 6,
        content: `Varje uppdrag i QuiXzoom följer en strikt livscykel med 7 statusar.

**Status 1: Draft**
Klienten (eller Wavult internt) skapar uppdrag i systemet.
Innehåll: Plats (GPS-koordinater), uppdragstyp, instruktioner, bilder önskas, ersättning, deadline.
Verktyg: Web-app för klienter, API för enterprise-kunder.

**Status 2: Published**
Uppdraget är verifierat och publiceras i kartan för zoomers i närheten (standardradie: 5 km).
Zoomers ser: Uppdragsbeskrivning, ersättning, deadline, avstånd, tid att ta sig dit.

**Status 3: Assigned**
Zoomer accepterar uppdraget. Det låses i 2 timmar (ej synligt för andra).
Om zoomer inte levererar inom 2h → uppdraget goes back to Published.

**Status 4: Submitted**
Zoomer laddar upp bilder/video via appen.
Systemet validerar automatiskt: GPS-metadata, tidsstämpel, bildkvalitet (suddig/rätt vinkel), filstorlek.
Om validering misslyckas → omedelbar feedback till zoomer.

**Status 5: Under Validation**
AI-analys av bildinnehåll (30 sek–2 min).
Kontrollerar: Korrekt objekt fotograferat? Avvikelser detekterade? Tillräcklig bildkvalitet?

**Status 6: Completed**
Uppdraget godkänt. Billing-service initierar utbetalning.
Zoomer ser "Approved" + belopp i sin plånbok (utbetalning inom 24h).
Data tillgänglig för klientens rapport.

**Status 7: Paid**
Utbetalning genomförd. Uppdrag arkiverat i databasen.

**Om uppdraget underkänns:**
Zoomer får bildspecifik feedback. Kan göra om uppdraget om deadline tillåter.
Upprepade fel → review-process → möjlig suspension.`,
      },
      {
        title: 'Tech Stack: React Native + AWS',
        duration: 7,
        content: `QuiXzoom är byggt för skalbarhet — arkitekturen ska hantera 1 000 zoomers lika smidigt som 1 000 000.

**Mobilapp (React Native + Expo)**
Cross-platform: En kodbas, iOS och Android.
Expo SDK: Snabb iteration, OTA-updates utan App Store-granskning.
Vision Camera: Nativt kameraframework med real-time processing.
Mapbox SDK: Offline-kartfunktionalitet, gesture-API, custom styling.
Expo Push Notifications: Push-notiser på båda plattformarna.

**Backend (Node.js + TypeScript, AWS ECS)**
5 microservices på ECS Fargate (eu-north-1):
• mission-service: Uppdragslogik, geo-sökning (PostGIS)
• auth-service: JWT, Supabase Auth wrapper
• media-service: Bilduppladdning, S3, CloudFront
• notification-service: Push, SMS, e-post
• billing-service: Stripe Connect, payout-logik

**Databas (Supabase PostgreSQL)**
Projekt: quixzoom-v2 (eu-west-1)
Row Level Security: Varje zoomer ser bara sina egna uppdrag
Real-time subscriptions: Kartan uppdateras live när nya uppdrag publiceras
PostGIS-extension: Geografiska frågor (vilka uppdrag är nära mig?)

**Infrastruktur:**
• ALB: Routar trafik till rätt microservice baserat på host/path
• CloudFront: CDN för bilder (app.quixzoom.com)
• S3: Bildlagring (wavult-images-eu-primary, eu-north-1)
• GitHub Actions → ECR → ECS: CI/CD-pipeline (~3–5 min deploy)`,
      },
      {
        title: 'Marknadsstrategi & Expansion',
        duration: 5,
        content: `QuiXzoom rullas ut marknad för marknad, med Sverige som testbädd.

**Sverige (mitten juni 2026)**
Startpunkt: Stockholms skärgård. 30 000+ öar, bryggor, pirar.
Rekryteringsstrategi: Instagram/TikTok-kampanj, influencer-samarbeten.
Mål: 100 aktiva zoomers inom 60 dagar.

**Varför skärgården?**
Visuellt imponerande för demos. Kommunerna (Värmdö, Nacka) är framtida Landvex-kunder. Perfekt för sommar-PR.

**Expansion — Nordics (Q3–Q4 2026)**
Finland (Helsinki), Norge (Oslo), Danmark (Köpenhamn).
Liknande demografisk profil, gig-economy-van befolkning.
QuiXzoom UAB (Litauen) hanterar EU-verksamheten, GDPR-compliant.

**Expansion — Global (2027+)**
USA: QuiXzoom Inc (Delaware). Fokus: New York, Miami, LA.
Asien: Singapore, Bangkok — stark gig-economy, hög smartphonedensitet.
Mellanöstern: Dubai (naturlig koppling till Wavult Groups Dubai-struktur).

**Konkurrenslandskap:**
Ingen direkt konkurrent kombinerar crowdsourcing + geo-taggning + AI-analys + B2G-försäljning.
Närmaste: Mapillary (Facebook, statisk), StreetView (Google, inte realtid), Mechanical Turk (Amazon, ej geo-fokus).

**QuiXzoom-fördelar:**
• Snabbare uppdatering (dagar vs månader)
• Lägre kostnad (zoomers vs anställda)
• Händelsebaserat (uppdrag skapas vid behov)
• Integrerat med Landvex (värdekedjan är inbyggd)`,
      },
      {
        title: 'Optical Insight: B2B-armen',
        duration: 6,
        content: `Optical Insight är det tekniska systemet som köper tillgång till QuiXzoom-data och säljer analyserade insights.

**OBS — Varumärkes-regel:**
• Optical Insight = det TEKNISKA systemet/motorn
• Landvex = FÖRSÄLJNINGSPLATTFORMEN mot kommuner och myndigheter
• QuiXzoom = DATA-INSAMLINGSPLATTFORMEN (supply-sidan)

Dessa tre är separata produkter med separata varumärken. Nämn ALDRIG Landvex i QuiXzoom-kontext mot zoomers eller B2C.

**Optical Insight-motorn:**
Tar QuiXzoom-bilder → Validerar kvalitet → Analyserar innehåll → Detekterar avvikelser → Genererar rapporter och larm.

Tekniken: Computer vision, objekt-detektering, anomali-identifiering, historisk jämförelse.

**Tre Deployment-Tiers:**
• OI Cloud EU: optical-insight-eu.pages.dev (kommuner, fastighetsbolag)
• OI Cloud US: optical-insight-us.pages.dev (US municipalities)
• OI Enterprise: On-premise (Trafikverket, Försvarsmakten)

**Från data till pengar (kedjan):**
1. Zoomer zoomar brygga (QuiXzoom)
2. Optical Insight analyserar bilden
3. Avvikelse detekterad (spricka i räcket)
4. Landvex skickar larm till kommunen
5. Kommunen betalar sin månadsavgift till Landvex
6. Landvex betalar QuiXzoom för uppdraget
7. QuiXzoom betalar zoomer

Hela kedjan är integrerad. Det är styrkan.`,
      },
    ],
  },
  {
    id: 'landvex',
    title: 'Landvex — Produktkurs',
    description: 'AI-driven infrastrukturinspektion: målgrupper, EU-marknad, tech och sälj.',
    icon: '🏗️',
    color: '#10B981',
    lessons: [
      {
        title: 'Vad löser Landvex?',
        duration: 5,
        content: `Landvex löser ett specifikt problem: infrastrukturägare vet inte vad som händer med deras objekt.

**Problemet i siffror:**
• Manuell inspektion av en brygga: 500–2 000 SEK/tillfälle
• Inspektionsfrekvens: 1–4 ggr/år
• Skador som missas: 1–3 per 100 objekt/år
• Kostnad för missad skada: 50 000–500 000 SEK (reparation + ansvar)

En medelstor svensk kommun med 300 infrastrukturobjekt spenderar ~600 000 SEK/år på inspektioner och missar ändå kritiska skador.

**Landvex-kärnvärdet (LÅST av Erik Svensson):**
"Right control. Right cost. Right interval."

Det handlar INTE om att övervaka allt hela tiden. Det handlar om att optimera kontrollekonomi. Vilka objekt behöver inspekteras när? Vad är kostnaden för en inspektion vs kostnaden för att missa en skada?

Landvex gör den kalkylen möjlig — automatiskt, kontinuerligt, för tusentals objekt.

**Vad Landvex INTE är:**
• Inte en kameraövervakningslösning
• Inte en IoT-sensor-plattform  
• Inte "AI-bevakning" (Erik har förbjudit detta ord)
• Inte en GIS-plattform (statisk kartdata)

**Vad Landvex ÄR:**
• En händelsebaserad alarmeringstjänst
• En inspektionsrapport-generator
• En kontrollekonomi-optimerare
• En partner till infrastrukturägare`,
      },
      {
        title: 'Målkunder: Kommuner, Trafikverket',
        duration: 5,
        content: `Landvex riktar sig mot offentlig sektor och privata infrastrukturägare med tydliga inspektionsansvar.

**Primär Målkund: Svenska Kommuner**
Sverige har 290 kommuner. Alla ansvarar för kommunal infrastruktur: bryggor, vägar, parker, badplatser, lekplatser, tunnlar.

Typisk budget för infrastrukturinspektion: 500 000–5 000 000 SEK/år beroende på kommunens storlek.

Beslutsprocesen: Teknisk chef → Ekonomichef → Stadsdelsnämnd/KS. Långsam (6–12 månader) men stabil. Avtal brukar vara 3-åriga.

**Sekundär Målkund: Trafikverket**
Ansvarar för 98 000 km vägar, 4 000 broar, hundratals tunnlar.
Enormt inspektionsbehov — och enorma budgetar.
Landvex Enterprise (on-premise) är relevant här.
Processen är längre (LOU-upphandling, 1–2 år) men kontraktsstorlekarna är massiva.

**Tertiär Målkund: Kommunala Fastighetsbolag**
MKB (Malmö), Stångåstaden (Linköping), Familjebostäder (Stockholm).
Ansvarar för tusentals bostäder + tillhörande infrastruktur.
Kortare säljcykel än kommuner (privat bolag, snabbare beslut).

**Hamnar:**
Ports of Stockholm, Göteborgs Hamn, Helsingborgs Hamn.
Kritisk infrastruktur. Lagkrav på regelbunden inspektion.
Hög betalningsvilja — konsekvensen av en miss är enorm.

**Inte Landvex-kunder (ännu):**
Privatpersoner, fastighetsägare utan inspektionsansvar, utländska kunder (fas 3+).`,
      },
      {
        title: 'EU-strategi: Litauen UAB som bas',
        duration: 5,
        content: `Landvex ABs EU-struktur är designad för att möjliggöra snabb expansion till fler EU-länder.

**Varför Litauen (QuiXzoom UAB)?**
• 15% bolagsskatt (lägst i EU med substans)
• EU-hemvist för GDPR-compliance
• SEPA-betalningar utan extra avgifter
• Enkel bolagsbildning (2–5 dagar via agent)
• EU-upphandlingsdeltagande utan hinder

**Varför Sverige (Landvex AB)?**
• Svenska kommuner premierar svenska leverantörer
• LOU-upphandling — inhemsk aktör ger förtroende
• Personliga relationer — Dennis och Leon pratar med svenska beslutfattare på deras språk
• Befintlig entitet (Sommarliden AB → Landvex AB, org.nr 559141-7042)

**Expansion-plan EU:**
Fas 1: Sverige (juni 2026) — via Landvex AB
Fas 2: Nederländerna (Q1 2027) — via QuiXzoom UAB som EU-hub
Fas 3: Danmark, Finland, Norge — Nordic cluster
Fas 4: Tyskland, Frankrike, Belgien — via ny UAB eller filial

**OI Cloud EU:**
optical-insight-eu.pages.dev hanterar ALLA EU-kunder.
All data stannar i EU (eu-north-1, eu-west-1).
GDPR-compliance är inbyggd — inte ett efterkrav.
DPA (Data Processing Agreement) medföljer standardavtalet.`,
      },
      {
        title: 'Lansering Sverige juni 2026',
        duration: 5,
        content: `Landvex Sverige-lansering sker parallellt med QuiXzoom. Databasen byggs av QuiXzoom, Landvex säljer tillgång till den.

**Timing:**
QuiXzoom startar i juni → samlar data i skärgården → Landvex kan demo med verklig lokal data → kommunen köper abonnemang.

Det är ett hönan-och-ägget-problem löst: vi skapar datan själva (Wavult lägger ut uppdrag) tills vi har tillräckligt för en trovärdig demo.

**Pilot-strategi:**
2–3 kommuner erbjuds 90 dagars gratis pilot (20–50 objekt).
Krav: Deltagande i case study + 30 min intervju efter piloten.
Mål: Case study publiceras och används i nästa säljmöte.

**Target-kommuner (skärgård):**
• Värmdö — 40 000 invånare, högtäthet av bryggor och kommunal infrastruktur
• Nacka — 105 000 invånare, Erstavik naturreservat, kommunal hamn
• Vaxholm — 12 000 invånare, fästning, historisk infrastruktur
• Norrtälje — 62 000 invånare, norrhavsöarna, stor ytaansvar

**Säljprocessen:**
1. Cold e-post till teknisk chef (personaliserat, kortfattat)
2. Telefonsamtal inom 3 dagar
3. 30 min demo (online eller fysiskt)
4. Gratis pilot-erbjudande
5. 90 dagars pilot
6. Kommersiellt avtal

Mål: 3 demos bokade vid Thailand Workcamp (april).
Mål: 2 piloter startade juni.
Mål: 1 betalande kund september.`,
      },
      {
        title: 'Tech: AI-analys & Alertssystem',
        duration: 6,
        content: `Landvex tekniska kärna är Optical Insight — analysmotorn som förvandlar bilder till åtgärdbara larm.

**Bildanalys-pipeline:**
1. Bild inkommer från QuiXzoom (via S3, pre-signed URL)
2. Förvalidering: Storlek, format, GPS-metadata
3. Objektigenkänning: Vad är på bilden? (brygga, brunn, vägskylt, lekplats)
4. Tillståndsanalys: Korrekt tillstånd vs avvikelse?
5. Historisk jämförelse: Värre/bättre/oförändrat sedan förra gången?
6. Larmbeslut: Generera larm? Vilken prioritet?
7. Rapportgenerering: PDF med bild, GPS, analys, rekommendation

**Larmtyper:**
• Kritiskt (röd): Omedelbar säkerhetsrisk — räcke avbrutet, bro skadad
• Allvarligt (orange): Åtgärd inom 7 dagar — sprickor, rost, erosion
• Påminnelse (gul): Schemalagd underhållspåminnelse
• Info (blå): Förändring detekterad, ej säkerhetsrisk

**Alert-leverans:**
• E-post (alla abonnemang)
• SMS (Standard+)
• Webhook → CMMS/ServiceNow/Maximo (Enterprise)
• In-app notifiering i Landvex-portalen

**Inspektionsfrekvens (konfigurerbar per objekt):**
• Daglig (kritiska objekt — bro, tunnel)
• Veckovis (bryggor, hamnar)
• Månadsvis (parker, lekplatser)
• Händelsebaserad (trigger vid specifika väderförhållanden)`,
      },
      {
        title: 'Prismodell & Upphandling (LOU/LUF)',
        duration: 6,
        content: `Landvex prismodell är designad för att passa offentlig sektors upphandlingsprocesser.

**Produktkataloger:**

Bas: 4 900 SEK/mån
• 50 objekt
• Månadsinspektion
• E-post-larm
• Rapportgenerering (PDF)

Standard: 14 900 SEK/mån
• 500 objekt
• Valfri inspektionsfrekvens per objekt
• SMS + e-post + webhook
• REST API-access
• Dashboard med historik

Enterprise: Offertbaserat (från 49 000 SEK/mån)
• Obegränsat antal objekt
• On-premise möjlig
• SSO (Azure AD, Okta)
• SLA 99,9%
• Dedicated customer success

**Upphandling enligt LOU:**

Direkt upphandling (< 700 000 SEK/år): Kan köpas direkt utan anbudsprocess.
Bas och Standard-abonnemang faller under denna gräns — viktigt säljargument!

Förenklad upphandling (700 000–6 MSEK): Anbudsförfarande, 10 dagar.
Öppen upphandling (> 6 MSEK): EU-direktiv, längre process.

**Tips för kommunsälj:**
Strukturera initialt avtal som 12-månaders bas-abonnemang (< 700 000 SEK) → direktupphandling möjlig → snabbare avslut.
Utöka till Standard/Enterprise i förnyelse (år 2+).

**Ramavtal (2027-ambition):**
SKR Kommentus har ramavtal för digitala tjänster. Att finnas på ett ramavtal ger 290 kommuner enkel access utan individuell upphandling.`,
      },
      {
        title: 'Nästa marknad: Nederländerna Q1 2027',
        duration: 5,
        content: `Nederländerna är Landvex andra marknad och en naturlig expansion från Sverige.

**Varför Nederländerna?**
• 342 kommuner med enormt infrastrukturansvar (dikes, kanaler, broar — vatten är existentiellt)
• GovTech-mogen marknad — tidiga adoptörer av digital förvaltning
• Hög betalningsvilja för infrastrukturövervakning (tullar/dikes misslyckanden är nationella katastrofer)
• EU-hemvist (QuiXzoom UAB täcker GDPR)
• Engelska som affärsspråk — inga språkbarriärer

**Marknadsstorleken:**
Nederländerna: 17,9 miljoner invånare, 342 kommuner.
Genomsnittlig infrastrukturbudget: 2–10 MSEK/år.
Total adresserbar marknad: ~500 MSEK/år.

**Timing:**
Q4 2026: Första kontakter, demo-förberedelse
Q1 2027: Officiell lansering, 2–3 pilot-kommuner
Q2 2027: 5+ betalande kunder i Nederländerna

**Lokal anpassning:**
• Holländsk UI-translation (QuiXzoom UAB som kontrakt-part)
• GDPR DPA på holländska
• Lokal registered agent för bolagsrepresentation
• Fokus: vattennära infrastruktur (bryggor, slussar, dikes) — perfekt match med QuiXzoom-kompetens

**Konkurrens i NL:**
Ingen identifierad direkt konkurrent i samma nisch.
Närmaste: traditionella inspektionsföretag, drone-survey-bolag (dyra, sällan, ej kontinuerliga).`,
      },
    ],
  },
  {
    id: 'dubai',
    title: 'Dubai-strukturen',
    description: 'Wavult Groups juridiska och skattemässiga struktur: Dubai Free Zone, IP-ägande, pengaflöden.',
    icon: '🏙️',
    color: '#8B5CF6',
    lessons: [
      {
        title: 'Varför Dubai? Skatt, IP, kontroll',
        duration: 5,
        content: `Dubai är Wavult Groups juridiska hem. Det är inte ett skatteparadis i negativ mening — det är ett smart val av en jurisdiktion som erbjuder rätt kombinationen av fördelar.

**Skattefördelar:**
• 0% bolagsskatt på kvalificerade IP-inkomster (UAE Corporate Income Tax, 2023)
• 9% standard CIT, men undantag för Small Business Relief (omsättning < AED 3M) och qualifying income
• 0% källskatt på utdelningar — ingen skatt när pengar lämnar UAE
• 0% kapitalvinstskatt
• 0% personlig inkomstskatt

**IP-skydd:**
UAE har ett starkt immateriellt rättssystem. DMCC och DIFC är internationellt erkända jurisdiktioner.
IP registrerat i UAE skyddas av internationella avtal (TRIPS, Paris Convention).
Wavult Groups IP (kod, varumärken, domäner) ägs av Wavult Group FZCO — tryggt.

**Kontrollstruktur:**
Erik Svensson äger Wavult Group FZCO → äger allt annat.
Oavsett var de operationella bolagen finns — Delaware, Litauen, Sverige — kontrolleras de av Dubai-holdingen.
Om ett driftsbolag krånglar (ex. förlust, tvist) kan det avvecklas utan att affektera IP eller holdingbolaget.

**100% utländskt ägande:**
Free Zone-strukturen tillåter 100% utländskt ägande. Inget krav på lokal partner.
Detta var historiskt det stora hindret för UAE — det är löst i Free Zones.`,
      },
      {
        title: 'Free Zone LLC: IFZA vs DIFC vs ADGM',
        duration: 6,
        content: `Det finns ~40 Free Zones i UAE. För Wavult Group är tre relevanta.

**IFZA — International Free Zone Authority**
Kostnad: ~15 000–25 000 AED/år (beroende på aktiviteter)
Fördelar: Billig, snabb setup (5–7 dagar), flexibel. Bra för operationsbolag.
Nackdelar: Mindre prestige, begränsade finansiella licenser.
Passar: Wavult DevOps FZCO (operationellt bolag)

**DMCC — Dubai Multi Commodities Centre**
Kostnad: ~25 000–40 000 AED/år
Fördelar: Mest prestigefull Free Zone. Över 22 000 bolag. Stark community. Bra bankförbindelser.
Nackdelar: Dyrare, lite mer byråkrati.
Passar: Wavult Group FZCO (holding/IP) — prestige ökar trovärdighet mot investerare och banker.

**DIFC — Dubai International Financial Centre**
Kostnad: 50 000–100 000 AED/år
Fördelar: Engelsk common law. Bästa för finansiella verksamheter, fondförvaltning, banking.
Nackdelar: Dyrast. Overkill för operativt holdingbolag.
Passar: Om Wavult Group går in i finansiell verksamhet (payment processor, fond).

**Rekommendation:**
• Wavult Group FZCO → DMCC (prestige, IP-holding)
• Wavult DevOps FZCO → IFZA (operationell, kostadseffektiv)

**Nästa steg:** Kontakta DMCC (dmcc.ae/apply). Business plan finns klar.`,
      },
      {
        title: 'Wavult Group: IP & Control Layer',
        duration: 5,
        content: `Wavult Group FZCO är det ultimata holdingbolaget — det äger allt immateriellt värde i koncernen.

**Vad Wavult Group äger:**
• Alla varumärken: Wavult, QuiXzoom, Landvex, Bernt, Wavult OS, Wavult Mobile
• All källkod (de registrerade IP-rättigheterna)
• Alla domäner: wavult.com, quixzoom.com, landvex.com och derivat
• Patent (framtida)
• Affärshemligheter och know-how

**Varför IP i Dubai?**
IP-inkomster (royalties) betraktas som "qualifying income" under UAE CIT — potentiellt 0% skatt.
UAE är med i internationella IP-skyddsavtal. Din kod är lika skyddad här som i Sverige.
Kapital kan röra sig fritt ut ur UAE — inga valutakontroller.

**IP-licensstrukturen:**
Wavult Group äger IP → licensierar till Wavult DevOps (som bygger och förvaltar) → DevOps sublicensierar till driftsbolagen.

Eller: Wavult Group licensierar direkt till driftsbolagen (enklare struktur).

Valet avgörs av transfer pricing-analys.

**Substans-krav:**
För att IP-inkomster ska vara skattefria krävs att Wavult Group FZCO har faktisk substans i Dubai:
• Kontor (kan vara co-working via DMCC)
• Ledning som faktiskt befinner sig i UAE delar av året
• Styrelsmöten som hålls i UAE
• Anställda eller contracted services

Erik behöver inte bo i Dubai — men styrelsemöten och nyckelverksamhet måste kunna dokumenteras som UAE-baserade.`,
      },
      {
        title: 'Pengaflöde: Royalties & Service Fees',
        duration: 6,
        content: `Pengarna flödar uppåt i strukturen via legala, dokumenterade transaktioner.

**Tre typer av intercompany-flöden:**

1. IP-licensavgift (Royalty)
Driftsbolag betalar X% av omsättning till Wavult Group FZCO för rätten att använda IP.
Arm's length-nivå: 5–15% beroende på marknad och typ av IP.
Dokumentation: Intercompany License Agreement krävs.

2. Management Service Fee
Driftsbolag betalar till Wavult DevOps FZCO för management-tjänster (tech, HR, strategi).
Arm's length-nivå: Kostnad + 10–15% marknadsmässig markup.
Dokumentation: Management Service Agreement (MSA) krävs.

3. Dividend
När Dubai-bolagen har ackumulerat kapital → utdelning till aktieägare (Erik).
UAE: 0% källskatt på utdelning.
Sverige: Om Erik är obegränsat skattskyldig i Sverige kan utdelning beskattas i Sverige (CFC-regler). Konsultera skatterådgivare.

**Praktisk kalkyl (Landvex AB, 1 MSEK intäkt):**
IP-licens (10%): 100 000 SEK → Dubai (0% skatt)
Management fee (15%): 150 000 SEK → Dubai (0% skatt)
Kvar i Sverige: 750 000 SEK
Drift & kostnader: 600 000 SEK
Lokal vinst: 150 000 SEK × 20,6% = 30 900 SEK skatt
Effektiv skattesats: 3,09% på total intäkt

**OBS:** Alla intercompany-transaktioner måste vara arm's length och dokumenterade. Skattemyndigheter i Sverige, USA och Litauen granskar detta. Winston (CFO) ansvarar för compliance.`,
      },
      {
        title: 'Lokala bolag: UAB & Inc',
        duration: 5,
        content: `Under Wavult DevOps FZCO finns fyra driftsbolag som hanterar lokal verksamhet.

**QuiXzoom Inc (Delaware, USA)**
Bolagsform: C Corporation
Varför Delaware: Investerarvänlig, välkänd för VC, flexibel bolagsrätt.
Bank: Mercury Bank (startup-vänlig remote onboarding).
Skatt: USA federal CIT 21% + state tax. Med IP-licens-avdrag reduceras effektiv skatt.
Status: Stripe Atlas under granskning.

**QuiXzoom UAB (Vilnius, Litauen)**
Bolagsform: UAB (Uždaroji akcinė bendrovė)
Varför Litauen: 15% bolagsskatt, EU-hemvist, SEPA, GDPR.
Hantera: EU-zoomers, EU-kunder, EU-upphandlingar.
Status: Compliance-förfrågan till 6 byråer.

**Landvex AB (Stockholm, Sverige)**
Bolagsform: Aktiebolag
Org.nr: 559141-7042 (tidigare Sommarliden Holding AB)
Varför Sverige: Sälja till svenska kommuner, trovärdighet.
Skatt: 20,6% CIT.
Status: Namnbyte inlämnat Bolagsverket.

**Landvex Inc (Houston, Texas)**
Bolagsform: Texas LLC
Varför Texas: Enkel LLC-form, ingen statlig inkomstskatt.
Adress: Registered agent i Austin (Northwest Registered Agent).
Status: SOSDirect Form 201 halvklar — $325 att betala.

**Intercompany-compliance:**
Alla fyra driftsbolag måste:
✓ Ha skriftliga IP-licensavtal med Wavult Group FZCO
✓ Ha MSA med Wavult DevOps FZCO
✓ Betala intercompany-fakturor i tid
✓ Dokumentera arm's length-prissättning`,
      },
      {
        title: 'Juridisk separation: Praktiken',
        duration: 5,
        content: `Juridisk separation är inte bara papper — det måste vara verklig separation i praktiken.

**Vad som MÅSTE vara separerat:**

Bankkonton: Varje entitet har sitt eget bankkonto. Inga blandningar.
Bokföring: Separat bokföring per entitet. Ingen "vi betalar härifrån nu och bokför sen."
Avtal: Varje avtal ingås av rätt entitet. Landvex AB skriver kundavtal, inte Erik personligen.
E-post: Viktiga affärskommunikationer från rätt domän (erik@wavult.com, ej personlig Gmail).
Styrelsmöten: Dokumenterade protokoll för varje entitet.

**Risk om separation inte upprätthålls:**

Piercing the corporate veil: En domstol kan hålla aktieägare personligt ansvarigt om bolagets juridiska identitet inte respekterats.
Skattemässig genomsyn: Skattemyndigheter (Skatteverket, IRS) kan underkänna intercompany-transaktioner om de inte är genuina.
Transfer pricing-underkännande: Om management fees inte är marknadsmässiga → hela skatteoptimeringen faller.

**Praktiska steg:**

Dennis och Winston ansvarar för att dessa är på plats:
☐ Separata bankkonton för varje entitet (pågår)
☐ IP-licensavtal (utkast finns i docs/legal/)
☐ Management Service Agreement (utkast finns)
☐ Shareholders Agreement
☐ Intercompany-fakturering rutin (månadsvis)
☐ Styrelseprotokoll per kvartal per entitet

**Signaturrätt:**
Alla bolagsavtal kräver L3-signatur: Erik Svensson + Dennis Bjarnemark.
DocuSign används för digitala signaturer på internationella avtal.`,
      },
      {
        title: 'Juridisk separation: Praktiken (del 2)',
        duration: 4,
        content: `Sammanfattning av vad som är klart och vad som återstår.

**Status per 2026-03-27:**

Wavult Group FZCO: 🔴 Ej bildat. Business plan klar. Nästa steg: dmcc.ae/apply.
Wavult DevOps FZCO: 🔴 Ej bildat. Bildas parallellt med Group.
QuiXzoom Inc: 🟡 Under bildning via Stripe Atlas. 83(b) kritisk deadline.
QuiXzoom UAB: 🟡 6 byråer kontaktade. Väntar på svar.
Landvex AB: 🟡 Namnbyte inlämnat. Väntar 1–2 veckor.
Landvex Inc: 🔴 SOSDirect halvklar. $325 att betala ASAP.

**Thailand Workcamp (11 april) — Juridiska mål:**
• Dennis presenterar status på alla 6 entiteter
• Beslut om UAE Free Zone (DMCC vs IFZA)
• IP-licensavtal signerade (om bolagen är klara)
• Texas LLC slutförd av Dennis

**Långsiktig mål — end state:**
Erik Svensson äger Wavult Group FZCO.
Wavult Group FZCO äger Wavult DevOps FZCO.
Wavult DevOps FZCO äger QuiXzoom Inc, QuiXzoom UAB, Landvex AB, Landvex Inc.
Alla intercompany-flöden är dokumenterade och arm's length.
Koncernen är OECD-compliant och redo för externa investerare.`,
      },
    ],
  },
  {
    id: 'arkitektur',
    title: 'Systemarkitektur',
    description: 'Teknisk djupdykning: AWS ECS, microservices, frontend-stack och deployment-pipeline.',
    icon: '⚙️',
    color: '#6366F1',
    lessons: [
      {
        title: 'Arkitekturprinciper & Four-Layer Framework',
        duration: 5,
        content: `Wavult Groups tech-arkitektur är byggd kring fyra principer och ett four-layer framework.

**Fyra Principer:**

1. Serverless-first
Vi kör inga EC2-instanser. ECS Fargate hanterar alla containers utan att vi behöver underhålla servrar. Auto-scaling är inbyggt.

2. Edge-first
Frontends körs på Cloudflare Pages — det globala edge-nätverket. Ingen latens var du än befinner dig i världen. Gratis för statiska sajter.

3. EU-first
eu-north-1 (Stockholm) som primär AWS-region. GDPR-compliance är inbyggd, inte en efterkonstruktion. EU-data replikeras ALDRIG till USA.

4. GitOps
All förändring börjar i Git. Ingen manuell config av produktionsmiljön. GitHub Actions hanterar hela deploy-processen.

**Four-Layer Framework:**

Layer 1 — Edge (Cloudflare Pages)
Statiska frontends globalt distribuerade. Wavult OS, Landvex-sajt, QuiXzoom-landing.

Layer 2 — API (AWS ECS Fargate)
Node.js microservices i containers. Skalbar, isolerad, deployment-oberoende.

Layer 3 — Data (Supabase + S3)
PostgreSQL-databaser med real-time subscriptions. S3 för filer och bilder.

Layer 4 — Intelligence (Bernt + n8n)
AI-agent och automation-hub. Kör analyser, skickar nyhetsbrev, hanterar workflows.`,
      },
      {
        title: 'AWS Setup: ECS Fargate, eu-north-1',
        duration: 7,
        content: `AWS Account: 155407238699, Region: eu-north-1 (Stockholm).

**ECS Cluster: hypbit**
(Ska byta namn till "wavult" i nästa infrastruktur-sprint)

Aktiva services:
• wavult-os-api (task def: hypbit-api:14) — Wavult OS backend API
• quixzoom-api (task def: quixzoom-api:6) — QuiXzoom platform API
• n8n (task def: n8n-task:latest) — Automation hub
• team-pulse (task def: team-pulse:latest) — Intern teamverktyg

**Application Load Balancer: hypbit-api-alb**
En ALB hanterar all inkommande trafik och routar till rätt target group:

Priority 10: /n8n* → n8n-tg (port 5678)
Priority 20: host api.quixzoom.com → quixzoom-api-tg
Priority 30: host api.hypbit.com → hypbit-api-tg
Default: hypbit-api-tg (port 3001)

**ACM Certifikat (ISSUED):**
• eu-north-1: api.quixzoom.com + app + root + wildcard
• eu-north-1: api/app/www/hypbit.com
• us-east-1: app/api/www/quixzoom.com (för CloudFront)

**CloudFront Distributions:**
E2QUO7HIHWWP18 → dewrtqzc20flx.cloudfront.net → app.quixzoom.com ✅
EE30B9WM5ZYM7 → d3nf5qp2za1hod.cloudfront.net → quixzoom.com, www
E2JOYHG1LYOXGM → d14gf6x22fx96q.cloudfront.net → hypbit.com, www

**S3 Buckets:**
wavult-images-eu-primary (eu-north-1) — EU primär
wavult-images-eu-backup (eu-west-1) — EU backup (CRR aktiv)
wavult-images-us-primary (us-east-1) — USA primär
wavult-images-us-backup (us-west-2) — USA backup (CRR aktiv)
IAM-roll: wavult-s3-replication hanterar cross-region replication`,
      },
      {
        title: 'Microservices: Mission, Auth, Media, Billing',
        duration: 6,
        content: `QuiXzoom-backend är indelad i 5 separata microservices, var och en med ett tydligt ansvar.

**mission-service**
Ansvar: Hela uppdragslogiken
• CRUD för missions
• Geo-sökning (PostGIS ST_DWithin) — "visa uppdrag inom 5 km"
• Assignment-logik — lås uppdrag, 2h timeout
• Status-maskin: draft → published → assigned → submitted → validated → completed → paid
• Geo-indexering: Automatisk spatial index för snabba sökningar

**auth-service**
Ansvar: Autentisering och auktorisering
• JWT-verifiering för alla inkommande requests (via middleware)
• Supabase Auth-integration (email, Google, Apple Sign-In)
• Rollhantering: zoomer / client / admin
• KYC-flaggning (ID-verifiering genomförd?)
• Session-hantering och refresh tokens

**media-service**
Ansvar: All media-hantering
• Tar emot multipart uploads från appen
• Validerar: GPS-metadata, timestamp, filformat, storlek (max 50MB)
• Komprimerar och formaterar (WebP för web, original för arkiv)
• Laddar upp till S3 (wavult-images-eu-primary)
• Genererar CloudFront-signerade URLs med expiry
• Thumbnail-generering för preview

**notification-service**
Ansvar: Alla notifieringar
• Expo Push Notifications (iOS + Android)
• E-post via AWS SES (transaktionell)
• SMS via Twilio (planerat för kritiska larm)
• In-app notiser via Supabase real-time channels
• Notification preferences per zoomer

**billing-service**
Ansvar: Betalningar åt båda håll
• Kunder → QuiXzoom: Stripe (kreditkort, faktura)
• QuiXzoom → Zoomers: Stripe Connect (utbetalningar)
• Wise Business (planerat för internationella zoomers)
• Automatisk beräkning av zoomer-ersättning vid uppdragsgodkännande
• Fakturahantering för enterprise-kunder`,
      },
      {
        title: 'Frontend: React + TypeScript + Vite',
        duration: 5,
        content: `Wavult OS frontend är en SPA (Single Page Application) byggd i modern React.

**Teknikstack:**
React 18: Server Components används inte — ren client-side rendering.
TypeScript strict: Alla props och state är strikt typade. Ingen any.
Vite: Byggsystem. Extremt snabb HMR (Hot Module Replacement) under dev.
Tailwind CSS: Utility-first styling. Konsekvent design-system.
Cloudflare Pages: Hosting. Deploy sker automatiskt vid push till main.

**Projektstruktur (apps/command-center/src/):**
features/ — Alla moduler (dashboard, finance, knowledge, etc.)
components/ — Delade UI-komponenter (Shell, Sidebar, Modal, Button)
contexts/ — React Context (RoleContext, EntityScopeContext)
hooks/ — Custom hooks (useDebounce, useLocalStorage)
lib/ — Utilities och helpers

**Design-system:**
Alla färger är CSS-variabler (--brand-accent, --surface-border).
Tailwind-klasser som bg-white används för att matcha mörkt tema.
Typografin: font-mono för system-data, sans för prosa.

**State-hantering:**
Lokal UI-state: React useState/useReducer
Global app-state: React Context (roller, entitet, tema)
Server state: Supabase JS-klient (real-time subscriptions)
Persistent state: localStorage (progress, preferences)

**Build och deploy:**
npx vite build → dist/
wrangler pages deploy dist --project-name=wavult-os
Deploy-tid: ~2–3 minuter totalt`,
      },
      {
        title: 'Cloudflare: Pages, DNS, Workers',
        duration: 5,
        content: `Cloudflare är Wavult Groups edge-lager — DNS, CDN och serverless functions.

**Cloudflare Pages (aktiva projekt):**
wavult-os → wavult-os.pages.dev (→ os.wavult.com när NS satt)
landvex-eu → landvex-eu.pages.dev (Landvex-sajten)
optical-insight-eu → optical-insight-eu.pages.dev (OI Portal EU)

Deploy via: wrangler pages deploy dist --project-name=[projekt]

**Cloudflare DNS Zones:**
wavult.com (Zone: 5bed27e91d719b3f9d82c234d191ad99) — PENDING (NS ej bytt på Loopia)
quixzoom.com (Zone: e9a9520b64cd67eca1d8d926ca9daa79) — ACTIVE ✅
hypbit.com (Zone: 128f872b669d059d1dfca3c9474098f1) — ACTIVE ✅

NS för wavult.com (ska sättas på Loopia):
arch.ns.cloudflare.com
gina.ns.cloudflare.com

**Cloudflare Workers (planerat):**
Email Workers: Hantera inkommande e-post → Supabase trigger
Rate Limiting: Skydda API-endpoints mot brute force
Edge Cache: Cache API-svar vid Cloudflare-edge för snabbare respons

**Auth:**
Global API Key: Används med X-Auth-Email + X-Auth-Key headers.
INTE Authorization: Bearer — det är för scoped tokens.
Scoped token (cfut_...): Begränsad access, ej för zone:create.`,
      },
      {
        title: 'CI/CD: GitHub Actions → ECR → ECS',
        duration: 5,
        content: `Wavult Groups deploy-pipeline är fullständigt automatiserad via GitHub Actions.

**Repo:** wolfoftyreso-debug/hypbit (ska byta till wavult-os)

**Workflow 1: deploy-api.yml**
Trigger: Push till main, path-filter apps/api/**
Steg:
1. Checkout kod
2. Configure AWS credentials (via GitHub Secrets)
3. Docker build (Dockerfile i apps/api/)
4. Tag och push till ECR (eu-north-1)
5. ECS force-new-deployment (service: wavult-os-api)
6. Vänta på healthcheck (/health endpoint)
Total tid: ~3–5 minuter

**Workflow 2: deploy-quixzoom.yml**
Trigger: Push till main, path-filter apps/quixzoom-api/**
Samma struktur, target: quixzoom-api ECS service.

**Workflow 3: deploy-pages.yml**
Trigger: Push till main, path-filter apps/command-center/**
Steg:
1. Checkout kod
2. npm ci (install dependencies)
3. npx vite build
4. wrangler pages deploy dist

**GitHub Secrets (konfigurerade):**
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
SUPABASE_SERVICE_KEY (lades till 2026-03-27 — quixzoom-api kraschade utan den)

**Lokalt — Snabbkommandon:**
cd apps/command-center && npx vite build
wrangler pages deploy dist --project-name=wavult-os --commit-dirty=true`,
      },
      {
        title: 'Bernt: AI-agent-arkitektur',
        duration: 5,
        content: `Bernt är Wavult Groups AI-agent — byggd på OpenClaw och körs som en integrerad del av Wavult OS.

**Vad Bernt är:**
OpenClaw-instans konfigurerad med Wavult Groups kontext. Inte ett chatbot — en AI-operatör med tillgång till verktyg, filer och externa tjänster.

**Bernts verktyg:**
• read/write/edit — filsystemsaccess
• exec — shell-kommandon (bygg, deploya, konfigurera)
• web_search / web_fetch — internetsökning
• image_generate — bildgenerering

**Bernts access:**
• Wavult OS workspace (/home/erikwsl/.openclaw/workspace/)
• Projektfiler (/mnt/c/Users/erik/Desktop/hypbit/)
• Cloudflare API (DNS, Pages)
• AWS (via CLI)
• GitHub (via SSH key)

**Wavult Mobile — Röstintegration:**
Siri → "Hey Siri, Bernt" → wavult:// deep link → Wavult Mobile-app → VoiceButton (håll inne) → Whisper transkribering → Bernt → svar i appen.

Filer byggda:
• apps/wavult-mobile/lib/bernt.ts — OpenClaw webhook
• apps/wavult-mobile/components/chat/VoiceButton.tsx — röstknapp
• apps/wavult-mobile/app/_layout.tsx — deep link handler

Nästa steg: Expo build + TestFlight för att testa på iPhone.

**Bernt i Knowledge Hub:**
Bernt har läst alla kunskapsdokument och kan svara på frågor om Wavult Group.
Fråga Bernt: "Vad är Texas LLC-stegen?" eller "Förklara Landvex prismodell" — Bernt vet.`,
      },
    ],
  },

  // ── Finance & Ekonomi ──────────────────────────────────────────────────────
  {
    id: 'finance',
    title: 'Finance & Ekonomi',
    description: 'Wavult Groups ekonomimodell: intercompany-flöden, Revolut, Stripe, budget och transfer pricing.',
    icon: '💰',
    color: '#22C55E',
    lessons: [
      {
        title: 'Koncernens pengaflöde — översikt',
        duration: 5,
        content: `Wavult Groups ekonomimodell är byggd för skatteeffektivitet och full kontroll.

**Tre nivåer av kassaflöde:**

Nivå 1 — Lokal intäkt (driftsbolagen)
Kunder betalar till närmaste bolag: svenska kommuner betalar Landvex AB, amerikanska betalar Landvex Inc, zoomers-relaterat via QuiXzoom UAB.

Nivå 2 — Upward transfer (till Dubai)
Driftsbolagen betalar IP-licens (5–15%) och management fees (8–15%) till Dubai-holdingen. Legala avdrag som minskar lokal skattebas.

Nivå 3 — Kapitalackumulering (Dubai)
Nettovinster samlas i Wavult Group FZCO (Dubai, 0% skatt). Härifrån reinvesteras i verksamheten eller delas ut till Erik.

**Konkret exempel (QuiXzoom EU, 1 MSEK/mån intäkt):**
Zoomer-utbetalningar: 750 000 SEK
Bruttomarginal: 250 000 SEK
IP-licens (10%): 100 000 SEK → Dubai
Management fee (10%): 100 000 SEK → Dubai
Kvar i UAB (Litauen): 50 000 SEK × 15% = 7 500 SEK skatt
Till Dubai: 200 000 SEK × 0% = 0 SEK skatt
Effektiv skattesats: 3%

**Nyckelregel:** Inga pengar ska röra sig utan faktura och dokumentation. Winston (CFO) ansvarar för alla intercompany-transaktioner.`,
      },
      {
        title: 'Revolut Business — vår moderna bank',
        duration: 4,
        content: `Revolut Business är Wavult Groups primära bankplattform. Det ersätter traditionella banker för 80% av vår verksamhet.

**Varför Revolut Business?**
• Multi-currency accounts (SEK, EUR, USD, GBP, AED) i ett gränssnitt
• Instant transfers (inga 2–3 dagars väntetider)
• Virtuella kort per projekt/avdelning (budgetkontroll)
• Automatisk kategorisering av utgifter
• API-integration för programmatiska utbetalningar
• Inget krav på fysisk närvaro för att öppna konto

**Hur vi använder det:**
Stripe-intäkter → Revolut Business-konton
Zoomer-utbetalningar → Revolut Pay / SEPA
AWS, GitHub, Cloudflare → Revolut virtuellt kort (IT-budget)
Löner → SEPA-överföring direkt från Revolut
Intercompany → Revolut-till-Revolut (instant, gratis)

**Virtual cards per kostnadscenter:**
• IT-infra: AWS, GitHub, Cloudflare, Supabase
• Marketing: Meta Ads, TikTok Ads, influencer-betalningar
• Legal: Bolagsregistreringsavgifter, DocuSign
• Travel: Hotell, flyg (Thailand!)

**Limit-sättning:** Winston sätter månadslimits per kort. Inget kort har obegränsad limit.

**OBS:** Mercury Bank planeras för QuiXzoom Inc (USA) — Revolut är inte tillgängligt som fullservice US business bank.`,
      },
      {
        title: 'Stripe — betalningsinfrastruktur',
        duration: 5,
        content: `Stripe hanterar alla inkommande betalningar och zoomer-utbetalningar för QuiXzoom.

**Stripe-produkter vi använder:**

Stripe Payments — Kundbetalningar
• Landvex-kunder: Månadsabonnemang via Stripe Billing
• QuiXzoom B2B-kunder: Faktura via Stripe Invoicing
• Betalningsmetoder: Kort, SEPA-debit, Swish (via partner)
• PCI DSS Level 1 compliance — vi lagrar aldrig kortdata

Stripe Billing — Prenumerationer
• Automatisk fakturering varje månad
• Failed payment retry-logik (3 försök i 28 dagar)
• Proration vid uppgradering/nedgradering
• Dunning-e-post för förfallna betalningar

Stripe Connect — Zoomer-utbetalningar
• Zoomers registrerar sitt konto (Stripe Express)
• Wavult samlar in betalningar → håller kvar 25% → betalar ut 75%
• Automatisk skatteformulär (1099 för USA, om tillämpligt)
• Stöd för SEPA, Swish, banköverföring

**Webhook-integration:**
payment_intent.succeeded → Supabase markerar konton aktiva
payout.paid → Supabase uppdaterar zoomer-plånbok
invoice.payment_failed → notification-service skickar e-post

**Testmiljö:** Stripe testläge körs i staging-branch. Aldrig testa med riktiga kort i dev.`,
      },
      {
        title: 'Budget & Kostnadskontroll',
        duration: 5,
        content: `Wavult Group har en lean kostnadsstruktur. Varje SEK räknas i early stage.

**Månatliga fasta kostnader (uppskattning, 2026-Q2):**

**Infrastruktur:**
• AWS ECS (4 services): ~$150/mån
• Supabase Pro: $25/mån × 2 projekt = $50/mån
• Cloudflare Pro: $20/mån
• GitHub: $19/mån (Team)
• Totalt: ~$240/mån (~2 500 SEK)

**Verktyg:**
• OpenClaw (Bernt): ~$100/mån
• n8n Cloud: $24/mån
• DocuSign: $25/mån
• Totalt: ~$150/mån (~1 500 SEK)

**Rörliga kostnader:**
• AWS S3 + CloudFront: $0.05/GB (variabel)
• Stripe fees: 1,4% + 0,25 EUR per transaktion (EU)
• Zoomer-utbetalningar: Stripe Connect-avgift (~0,25%)

**Bootstrapping-budget (fas 1):**
• Zoomer-rekrytering (Sverige): 75 000 SEK
• Marketing (Instagram/TikTok): 15 000 SEK
• Juridik (bolagsregistreringar): 50 000 SEK
• Totalt fas 1: ~140 000 SEK

**Runway:**
Med nuvarande kostnadsbas (~30 000 SEK/mån drift) och 500 000 SEK i kassa → ~16 månaders runway utan intäkter.

**Break-even beräkning:**
Med 10 Landvex-kunder à 9 000 SEK/mån = 90 000 SEK/mån → lönsamt från dag 1 med den basen.`,
      },
      {
        title: 'Transfer Pricing — Compliance i Praktiken',
        duration: 6,
        content: `Transfer pricing är reglerna som styr hur Wavult Groups intercompany-transaktioner prissätts. Det är kritiskt att göra rätt — fel kan kosta mångmiljonbelopp i skattetillägg.

**OECD Arm's Length Principen:**
Alla transaktioner mellan Wavult-bolag måste prissättas som om de vore mellan oberoende parter (arm's length). Du kan inte sätta ett löjligt lågt pris på IP-licensen bara för att optimera skatt.

**De tre accepterade metoderna vi använder:**

1. Comparable Uncontrolled Transaction (CUT)
Jämför vår royalty-rate med liknande licensavtal på marknaden.
Ex: "SaaS-plattformar licensieras vanligen på 8–15% av omsättning" → vi sätter 10%.

2. Cost Plus
Management fees beräknas som Wavult DevOps faktiska kostnader + 10–15% marknadsmässig markup.
Ex: Tech-kostnad 200 000 SEK/mån + 15% = 230 000 SEK faktura till Landvex AB.

3. Profit Split
Om det är svårt att hitta jämförbara transaktioner → dela vinsten proportionellt baserat på värdeskapande.

**Dokumentationskrav (KRITISKT):**

Winston ansvarar för:
☐ Master File: Koncernöversikt, IP-beskrivning, finansiell sammandrag
☐ Local File per entitet: Specifika intercompany-transaktioner, benchmarking
☐ Intercompany-avtal: Skriftliga avtal för varje transaktion-typ
☐ Uppdatering: Minst en gång per år, eller vid väsentlig förändring

**Vad som händer vid brister:**
Sverige: Skattetillägg 10–40%, retroaktiv omprövning 5 år
USA: IRS §482 — 20–40% penalty på underprisade transaktioner
EU (Litauen): Nationell skattemyndighet granskar, EU Anti-BEPS direktiv

**Vår skyddsåtgärd:** Winston håller löpande dokumentation. Dennis granskar avtalen. Extern revisor certifierar en gång per år.`,
      },
    ],
  },

  // ── Sälj & GTM ────────────────────────────────────────────────────────────
  {
    id: 'salj-gtm',
    title: 'Sälj & Go-to-Market',
    description: 'Hela säljprocessen: pitchar, CRM, B2G-upphandling, invändningshantering och demos.',
    icon: '🎯',
    color: '#F97316',
    lessons: [
      {
        title: 'Wavults försäljningsstrategi — en översikt',
        duration: 4,
        content: `Wavult Group har tre parallella säljrörelser, var och en med olika köpare, säljcykler och taktiker.

**Rörelse 1: QuiXzoom — Zoomer-rekrytering (B2C)**
Köpare: Privatpersoner (zoomers)
Säljcykel: 1–7 dagar (ladda ner appen → onboarding → första uppdraget)
Kanal: Social media (Instagram, TikTok), word-of-mouth
Konverteringsmål: < 300 SEK per aktiv zoomer
Ansvar: Leon Russo

**Rörelse 2: QuiXzoom — B2B-kunder (B2B)**
Köpare: Fastighetsbolag, försäkringsbolag, franchise
Säljcykel: 2–8 veckor
Kanal: Direktförsäljning, partnerships
Konverteringsmål: < 5 000 SEK CAC
Ansvar: Leon Russo

**Rörelse 3: Landvex — Kommuner & Myndigheter (B2G)**
Köpare: Teknisk chef, ekonomichef, nämnd
Säljcykel: 6–18 månader
Kanal: Cold outreach, demos, LOU-upphandling
Konverteringsmål: < 30 000 SEK CAC (motiverat av 3-åriga avtal = 150 000+ SEK LTV)
Ansvar: Leon + Dennis

**Regel:** Blanda ALDRIG ihop varumärkena i säljkommunikation.
• Mot zoomers: QuiXzoom
• Mot B2B-kunder: QuiXzoom / Quixom Ads
• Mot kommuner: Landvex (nämn INTE QuiXzoom)`,
      },
      {
        title: 'Landvex B2G Säljprocess — Steg för Steg',
        duration: 6,
        content: `Att sälja till kommuner är annorlunda från allt annat. Det kräver tålamod, trovärdighet och en noggrann process.

**Steg 1 — Research & Identifiering**
Hitta kommuner med hög infrastrukturkostnad och inspektionsansvar:
• Källa 1: Kommuners årsredovisningar (skl.se → ekonomidata)
• Källa 2: SKR:s infrastruktur-rapporter
• Källa 3: Mediebevakning ("brygga rasade", "väg skadad")
• Källa 4: LinkedIn (tekniska chefer på kommuner)

Prioritera: Skärgårdskommuner (hög bryggtäthet), städer med upprustningsplaner.

**Steg 2 — Kontakt (Cold)**
E-post till teknisk chef + kopia till stadsmiljöchef.
Ämne: "Halvera inspektionskostnaderna — 10 min av er tid?"
Body: 3 meningar (problem → lösning → CTA). Ingen bilaga.

Telefonuppföljning: Ring 3 dagar efter e-post om inget svar.
Voicemail är OK — kort, konkret, lägg till namn och direktnummer.

**Steg 3 — Kvalificering (Discovery Call)**
15–20 min Zoom/telefon. Frågor att ställa:
• "Hur inspekterar ni er infrastruktur idag?"
• "Hur många objekt har ni ansvar för?"
• "Vad kostar er inspektion ungefär per år?"
• "Har ni haft problem med försenat underhåll pga missade skador?"

Lyssna — anpassa demos och ROI-kalkyl baserat på svaren.

**Steg 4 — Demo (30–45 min)**
Se separat lektion: "Demo-flödet i detalj"

**Steg 5 — Pilot-erbjudandet**
"90 dagar gratis, 20 objekt, inga bindningstider."
Krav (intern): Case study + 30 min intervju efter pilot.

**Steg 6 — Avtal**
Under 700 000 SEK/år → direktupphandling möjlig (snabb!)
Över 700 000 SEK/år → LOU-upphandling (längre)
Strukturera initial deal under gränsen vid behov.`,
      },
      {
        title: 'Demo-flödet i detalj (30 min)',
        duration: 5,
        content: `Varje Landvex-demo följer ett strukturerat flöde. Avvik inte — det fungerar.

**Förberedelse (15 min innan):**
• Research kommunens infrastruktur online — vad finns? Bryggor, vägar, parker?
• Hitta ett relevant foto (Google Maps / kommunens hemsida) på deras infrastruktur
• Öppna ROI-kalkylen redo med deras kommuns befolkningstal som startpunkt

**Intro (5 min)**
"Tack för er tid. Jag vet att kommuner har massor av säljmöten — jag lovar att inte slösa er tid. Låt mig ställa en fråga direkt: Hur inspekterar ni era bryggor och parker idag?"

*Lyssna. Notera. Det här formar resten av demon.*

**Problemet (5 min)**
Återspegla deras svar. "Ni sa att det kostar ungefär X kronor per inspektion och ni gör det 2 gånger per år — det är X SEK om ni har Y objekt. Och ni sa att ni missade [deras specifika problem] förra sommaren."

*Gör det personligt. Använd deras egna siffror.*

**Produktvisning (10 min)**
1. Visa kartan med ett aktivt uppdragsområde nära dem
2. Klicka på ett uppdrag → visa vad zoomer ser (instruktioner, ersättning)
3. Hoppa till en "completed inspection" → visa bild + GPS + analys
4. Visa ett larm: "Det här är vad ni hade fått om Landvex var igång"
5. Visa rapporten: "Det här skickas automatiskt till er varannan vecka"

**ROI-kalkyl live (5 min)**
Fyll i deras siffror:
"Ni sa Y objekt och X kr/inspektion, Z gånger per år."
Visa besparingskalkylen → "Det ger er en ROI på [X gånger] under ett avtal."

**Stäng (5 min)**
"Vad tycker ni om att testa detta med era 20 viktigaste objekt under 90 dagar, helt utan kostnad?"

*Om tveksamhet: Fråga "Vad behöver ni se/veta för att vara komfortabla med en pilot?"*`,
      },
      {
        title: 'Invändningshantering — B2G',
        duration: 4,
        content: `Kommunala säljmöten har predictabla invändningar. Lär dig dessa svar utantill.

**"Vi måste upphandla allt."**
→ "Under 700 000 SEK/år kan ni direktupphandla — ingen anbudsprocess. Basabonnemanget med 50 objekt är 58 800 SEK/år. Väldig under gränsen."

**"Vi har budget-frys just nu."**
→ "Piloten kostar ingenting — 90 dagar gratis. Om ni ser ROI kan ni söka budget inför nästa budgetcykel. Många av våra pilotkommuner har tagit beslutet om pilot i nämnd på ett möte."

**"Vi har redan ett inspektionssystem."**
→ "Det kompletterar vi, ersätter inte. Landvex tar bilderna och levererar larm — ert system hanterar arbetsorder och åtgärder. Vi har API-integration mot ServiceNow och Maximo."

**"Varifrån kommer bilderna? Är det säkert?"**
→ "Zoomers är verifierade fältpersonal — ID-verifierade, KYC-clearade, certifierade via vår Academy. Varje bild valideras automatiskt för GPS och bildkvalitet. Ni ser aldrig en bild som inte är verifierad."

**"GDPR — fotografering av kommunal infrastruktur?"**
→ "Zoomers fotograferar infrastruktur (bryggor, skyltar, vägar) — inte personer. Inga ansikten, inga privata miljöer. Data lagras i EU (Stockholm/Irland). QuiXzoom UAB är vår GDPR-personuppgiftsbiträde med DPA inkluderat i standardavtalet."

**"Vad händer om ni lägger ner?"**
→ "Avtalsmässigt: Ni äger all data från era objekt under avtalstiden — full export i standardformat (JSON/CSV) på begäran. Vi erbjuder även 12-månaders escrow-arrangemang för enterprise-kunder."`,
      },
      {
        title: 'CRM & Pipeline-hantering',
        duration: 4,
        content: `Utan ett CRM tappar vi bort leads och missar uppföljningar. Wavult OS CRM-modul är vår sanningskälla.

**Pipeline-steg:**
1. Prospekt — identifierad, ej kontaktad
2. Kontaktad — cold e-post eller call gjort
3. Intresserad — svarat positivt, bokat möte
4. Demo gjord — möte genomfört, awaiting feedback
5. Pilot — gratis 90-dagars pilot aktiv
6. Förhandling — kommersiellt avtal under förhandling
7. Kund — betalande abonnemang aktivt
8. Churnad — avslutade abonnemanget

**Viktiga fält att fylla i per kontakt:**
• Kontaktperson + roll (Teknisk chef / Ekonomichef / Nämndpolitiker)
• Kommunens storlek (invånare)
• Uppskattad infrastrukturbudget
• Antal objekt de ansvarar för
• Nästa åtgärd + datum
• Senaste interaktion

**Uppföljningsregler:**
• Inget svar på e-post → Ring efter 3 dagar
• Ingen respons efter ring → E-post dag 7 med ny infopunkt (en ny ROI-siffra eller referenskund)
• Inget svar på 14 dagar → Lägg i "Vilande" — återkontakta om 3 månader
• Aldrig ge upp på ett prospekt under 6 månader (kommunala beslutsprocesser tar tid)

**Målet vid Thailand Workcamp:**
Kontaktlista med 20 kommuner identifierade.
3 demos bokade (gärna fler).
2 piloter klara att starta juni 2026.`,
      },
    ],
  },

  // ── HR & Team ─────────────────────────────────────────────────────────────
  {
    id: 'hr-team',
    title: 'HR & Teamkultur',
    description: 'Rekrytering, onboarding, roller, beslutsmandat och hur teamet jobbar.',
    icon: '👥',
    color: '#EC4899',
    lessons: [
      {
        title: 'Wavults arbetskultur — vad vi tror på',
        duration: 4,
        content: `Wavult Group är ett litet team med höga ambitioner. Kulturen är inte något vi skriver på en vägg — den syns i hur vi fattar beslut.

**Vad vi tror på:**

Ägandeskap, inte uppgifter
Varje person äger sitt område. Johan äger tech-infrastrukturen, inte bara "sin lista med tickets". Dennis äger juridiken, inte bara "de avtal han fått sig tilldelade". Ägandeskap innebär att du förutser problem, proaktivt löser dem och kommunicerar status utan att bli tillfrågad.

Tydlighet framför artighet
Om du inte förstår en instruktion → fråga. Om du tycker en plan är fel → säg det, och varför. Vi värdesätter intellektuell ärlighet mer än att alla ska vara nöjda hela tiden.

Snabbhet med kvalitet
Vi är ett startup. Vi rör oss snabbt. Men snabbhet utan kvalitet skapar teknisk skuld, juridiska problem och missnöjda kunder. Hitta balansen.

Skriftlig kommunikation
Det viktigaste dokumenteras. Muntliga beslut som inte skrivs ner finns inte. Bernt och Wavult OS är verktygen — använd dem.

**Kommunikationskanaler:**
• Telegram (teamgrupp): Dag-till-dag kommunikation, snabba frågor
• Wavult OS: Dokumentation, beslut, CRM, finance
• GitHub: Kod, tekniska issues, pull requests
• E-post: Extern kommunikation (kunder, partner, myndigheter)

**Möteskultur:**
Vi har inga möten för mötes skull. Varje möte har en agenda, ett beslut att fatta eller ett problem att lösa. Default är asynkron kommunikation.`,
      },
      {
        title: 'Beslutsnivåer: L1–L3',
        duration: 4,
        content: `Wavult Group har ett tydligt beslutssystem. Fel beslut på fel nivå skapar problem — för bolaget och den personen.

**L1 — Autonomt (valfri teammedlem)**
Beslut under 1 000 SEK och utan juridiska konsekvenser.
Exempel: Köpa ett verktyg, boka en resa under budget, fixa en bugg, skicka ett e-post till en kund.
Dokumentation: Slacka/Telegram-notering räcker.

**L2 — Godkänns av CEO (Erik eller Leon)**
Avtal under 50 000 SEK, anställning av konsulter, partnerskap, prisförändringar.
Process: Beskriv i kort memo → skicka till Erik/Leon → svar inom 24h.
Dokumentation: E-post-godkännande + notering i Wavult OS.

**L3 — Board-beslut (Erik + Dennis)**
Bolagsavtal, IP-avtal, investeringar, anställning av fast personal, beslut > 50 000 SEK.
Process: Formellt memo → styrelsemöte (kan vara Zoom) → protokoll signerat.
Dokumentation: Styrelseprotokoll arkiverat i Legal-modulen.

**Signaturrätt per bolag:**
Landvex AB: Erik Svensson + Dennis Bjarnemark (gemensam)
QuiXzoom UAB: Kräver lokal representant (via agent) + Erik
Landvex Inc (TX LLC): Erik Svensson (ensam för LLC)

**Vad som INTE kräver godkännande:**
• Interna diskussioner och förslag
• Research och analys
• Läsa och dela information
• Kommunicera med teamet
• Köra tester i staging-miljö

Princip: Fråga hellre en gång för mycket än en gång för lite på L2/L3-nivå.`,
      },
      {
        title: 'Rekrytering — Wavults process',
        duration: 5,
        content: `Wavult Group rekryterar selektivt. Varje person vi lägger till är en investering vi tar på allvar.

**Rekryteringsprinciper:**

Kompetens och driv, inte meriter
Vi anställer inte per CV. Vi rekryterar per kapacitet och potential. En driven 23-åring utan examen slår en lat 30-åring med MBA.

Kulturpassning är lika viktigt som kompetens
En tekniskt brilliant person som inte kommunicerar, inte äger sina uppgifter eller inte är transparent skapar mer problem än hen löser.

Startläge: Konsult → Fastanställd
Första 3 månader: konsultrelation (per timme eller project). Därefter: utvärdering → fast anställning om match.

**Rekryteringsprocessen:**

Steg 1: Behovet identifieras
Leon och Erik diskuterar → beslut om att rekrytera → L2-godkännande (Erik)

Steg 2: Jobbbeskrivning
Konkret, ärlig, inte corporate-speak. "Vi söker en person som kan X för att lösa Y" — inte "Vi söker en driven medarbetare med passion för..."

Steg 3: Screening
CV-granskning → 15 min screeningsamtal → tekniskt test (om tech-roll)

Steg 4: Intervju
1 timme med Leon (operations-fit) + 30 min med Erik (vision + kultur-fit)

Steg 5: Decision
Erik + Leon fattar beslut gemensamt → L2-godkännande

Steg 6: Onboarding
Dag-1-dokument + Wavult OS Access + Academy + parad med befintlig teammedlem

**Ersättning:**
Baserat på marknadssalär för rollen och geografin.
Dubai-entiteter: AED-löner konkurrenskraftiga med UAE-marknad.
Sverige: Kollektivavtal-liknande ersättning + optionsprogram (framtida).`,
      },
      {
        title: 'Optionsprogram & Equity',
        duration: 4,
        content: `Wavult Group planerar ett optionsprogram för teamet. Här är principtänkandet.

**Varför Options/Equity?**
Early-stage startups kan inte alltid betala marknadslöner. Equity kompenserar för lägre lön + risk + lojalitet. Det skapar ägarskap — i ordets rätta mening.

**Strukturen (planerad):**
Option pool: 10–15% av Wavult Group FZCO
Vesting: 4 år total, 1 år cliff (inget om du slutar innan 1 år)
Strike price: Satt vid tilldelningstillfället (tidigt = lågt = bra för dig)

**Per roll (riktlinje):**
C-suite (CTO, CFO, CLO): 1–3%
Senior individual contributor: 0,25–0,5%
Konsult → fast anställd: 0,1–0,25%

**Skatteaspekter:**
Sverige: Personaloptioner → förmånsbeskattning vid inlösen (QESO-reglerna ger viss lättnad för startups)
Dubai-entitet: UAE har ingen inkomstskatt → 0% skatt på option-gains
Dennis + Winston hanterar strukturen

**Tidlinje:**
Optionsprogrammet upprättas när Wavult Group FZCO är bildat.
Befintliga teammedlemmar retroaktivt inkluderade från start-datum.

**VIKTIGT:** Diskutera aldrig equity-erbjudanden publikt eller med externa. Det kräver L3-beslut innan något lovas.`,
      },
      {
        title: 'Thailand Workcamp — vad förväntas av dig',
        duration: 3,
        content: `Thailand Workcamp 11 april 2026 är Wavult Groups officiella projektstart. Alla i teamet förväntas leverera.

**Förberedelse inför avresa:**
• Klara minst 2 Academy-kurser (helst din roll-specifika)
• Ta Zoomer-certifieringen i ZoomerCert-fliken
• Läs igenom doc-wg-003 (Thailand Workcamp) — fullständig agenda
• Ha ett specifikt bidrag klart för sprint-planeringen

**Dag 1–2 (ankomst och kickoff):**
Öppet sinne. Vi är 5 personer som ska jobba intensivt i minst 1 månad.

**Vecka 1 (utbildning):**
Du förväntas vara aktivt deltagande. Inte sitta med telefonen. Inte svara på e-post under sessions.

**Vecka 2+ (byggfas):**
Tydliga deliverables per person — sätts i sprint-planeringen lördag/söndag vecka 1.

**Kommunikation under workcamp:**
Leon hanterar logistik (hotell, mat, utflykter).
Erik hanterar investerarmöten / externa möten.
Johan hanterar tekniska deployments.
Dennis hanterar juridik (fortsätter löpande).
Winston hanterar löpande ekonomi.

**Förväntad output:**
Varje person lämnar workcamp med ett tydligt ägandeskap av sin del av produkten — redo att köra självständigt.`,
      },
    ],
  },

  // ── Compliance & GDPR ─────────────────────────────────────────────────────
  {
    id: 'compliance',
    title: 'Compliance & GDPR',
    description: 'GDPR, LOU-upphandling, dataskydd, KYC för zoomers och internationell compliance.',
    icon: '⚖️',
    color: '#EF4444',
    lessons: [
      {
        title: 'GDPR — grunden för alla som hanterar data',
        duration: 6,
        content: `GDPR (General Data Protection Regulation) är EU-lagen som reglerar hur personuppgifter hanteras. Den gäller Wavult Group i tre sammanhang: som zoomer-plattform, som B2B SaaS-leverantör och som arbetsgivare.

**De sex grundprinciperna (förenklade):**

1. Laglighet, korrekthet, öppenhet
Vi samlar bara data med rättslig grund: samtycke, avtal, eller berättigat intresse.
Zoomers samtycker explicit vid registrering.

2. Ändamålsbegränsning
Data samlas för ett specifikt syfte och används bara för det. Zoomer-GPS-data används för att validera uppdrag — inte för reklam utan samtycke.

3. Dataminimering
Samla bara vad som behövs. Vi behöver zoomer-ID för KYC. Vi behöver inte zoomer-ålder.

4. Korrekthet
Data ska vara korrekt. Zoomers kan uppdatera sina uppgifter i appen.

5. Lagringsbegränsning
Data sparas inte längre än nödvändigt. Inaktiva zoomer-konton: data raderas efter 3 år.

6. Integritet och konfidentialitet
Data skyddas mot obehörig access. Vi krypterar, använder RLS i Supabase, och begränsar access.

**Wavults roller:**
• QuiXzoom → Personuppgiftsansvarig (Controller) för zoomer-data
• Landvex → Personuppgiftsbiträde (Processor) för kommuners objektdata
• Som arbetsgivare → Controller för personaldata

**Viktigt:** Dennis och Johan ansvarar gemensamt för GDPR-compliance. Alla nya features som hanterar persondata måste Privacy Impact Assessment (PIA) genomföras för.`,
      },
      {
        title: 'Vad som kräver samtycke vs inte',
        duration: 4,
        content: `GDPR tillåter behandling av personuppgifter med sex rättsliga grunder. Samtycke är bara en av dem — och ofta inte den bästa.

**Grund 1: Samtycke (Art. 6(1)(a))**
Kräver: Frivilligt, specifikt, informerat, otvetydigt.
Används för: Marknadsföring, tracking-cookies, analys.
OBS: Samtycke kan återkallas — ha alltid en opt-out.

**Grund 2: Avtal (Art. 6(1)(b))**
Kräver: Behandlingen är nödvändig för att fullgöra ett avtal.
Används för: Zoomer-registration, utbetalningar, kunddata i Landvex.
Fördel: Inget separat samtycke krävs — registreringen är avtalet.

**Grund 3: Rättslig förpliktelse (Art. 6(1)(c))**
Används för: Bokföring (behåll fakturor 7 år), skatteuppgifter, AML-rapportering.

**Grund 4: Berättigat intresse (Art. 6(1)(f))**
Kräver: Intresset väger tyngre än personens intressen.
Används för: Loggar för säkerhet, fraud detection.
OBS: Kräver en intresseavvägning dokumenterad.

**Praktisk guide för vår verksamhet:**
• Zoomer-kontodata: Avtal ✅
• Zoomer-GPS under uppdrag: Avtal ✅
• Marknadsförings-e-post: Samtycke ✅
• Cookies: Samtycke ✅
• AWS-loggar: Berättigat intresse ✅
• Bokföringsdata: Rättslig förpliktelse ✅

**När är du osäker?** Fråga Dennis. Gör inget med persondata du är osäker på rättslig grund för.`,
      },
      {
        title: 'KYC — Know Your Customer (Zoomers)',
        duration: 4,
        content: `Know Your Customer (KYC) är processen för att verifiera zoomers identitet. Det krävs för betalningsreglering (AML-lagen) och skyddar plattformen mot missbruk.

**Varför KYC för zoomers?**
Zoomers tar emot betalningar → vi är en payment platform → AML-lagen (Anti Money Laundering) kräver att vi vet vem vi betalar.

Utan KYC: Vi kan bli ansvariga för finansiell brottslighet om en zoomer använder plattformen för pengatvätt.

**KYC-processen (Standard Zoomer):**

Steg 1: ID-verifiering
Zoomer laddar upp nationellt ID, pass eller körkort.
System: Sumsub (planerat) — automatisk OCR + face match.
Tid: 2–5 minuter.

Steg 2: Face Match
Selfie jämförs med ID-kortet.
Sumsub-AI gör jämförelsen automatiskt.

Steg 3: Sanctions Screening
Zoomer matchas mot sanktionslistor (EU, US OFAC, UN).
Automatiskt i bakgrunden.

Steg 4: Godkännande
Godkänd → KYC-flagga satt i Supabase → zoomer kan ta uppdrag och ta emot betalningar.
Underkänd → Zoomer meddelas med orsak → kan överklag till support.

**KYC-data:**
Lagras krypterat. Dennis ansvarar för policy. Sumsub ansvarar för verifieringsprocessen (DPA med Sumsub krävs).

Radering: KYC-data behålls 5 år efter kontoavslutning (AML-krav, kortare kan strida mot lag).`,
      },
      {
        title: 'LOU — Lagen om Offentlig Upphandling',
        duration: 5,
        content: `LOU är det regelverk som styr hur kommuner och myndigheter köper in varor och tjänster. För Landvex att förstå LOU är affärskritiskt.

**Grundprincipen:**
Offentliga medel ska användas effektivt och rättvist. Alla leverantörer ska ha lika chans att vinna offentliga kontrakt.

**Upphandlingstyper:**

Direktupphandling (< 700 000 SEK / år)
Kommunen kan köpa direkt utan anbudsprocess.
Krav: Dokumentera varför just du valdes (priset, erfarenhet, etc.)
Vår strategi: Strukturera initialt avtal under tröskeln.

Förenklad upphandling (700 000 – 6 MSEK)
Kommunen annonserar på e-avrop.se.
Leverantörer lämnar anbud inom 10 dagar.
Utvärdering: Lägst pris eller bästa förhållande pris/kvalitet.
Vi behöver en formell anbudsmall redo.

Öppen upphandling (> 6 MSEK)
EU-direktiv, annons i TED (Tender Electronic Daily).
Längre process (40+ dagar anbudstid).
Relevant för Trafikverket och stora kommuner.

**Vanliga utvärderingskriterier:**
• Pris (30–50% av totalpoäng)
• Funktionalitet och teknik (30–40%)
• Leverantörens stabilitet (finansiell styrka, referenskunder)
• Supportkvalitet och SLA
• GDPR-compliance

**Ramavtal (ambition 2027):**
SKR Kommentus upphandlar ramavtal för digitala tjänster.
Om Landvex finns på ett ramavtal → 290 kommuner kan köpa utan individuell upphandling.
Dennis ansvarar för att undersöka processen.

**Vår skyddsåtgärd:** Prissätt Bas-abonnemanget (4 900 SEK/mån = 58 800 SEK/år) under direktupphandlingsgränsen. Enkelt, snabbt, inga advokater krävs.`,
      },
      {
        title: 'Data Security & Access Control',
        duration: 5,
        content: `Dataskydd är inte en GDPR-fråga — det är en affärs-survival-fråga. Ett dataintrång kan förstöra Wavults trovärdighet mot kommuner i ett slag.

**Säkerhetslager:**

Layer 1 — Nätverkssäkerhet
Cloudflare WAF framför alla publika endpoints.
DDoS-skydd: Cloudflare absorber och filtrerar attacker.
SSL/TLS: All trafik krypteras (HTTPS, TLS 1.3 minimum).

Layer 2 — API-säkerhet
Autentisering: JWT Bearer tokens på alla endpoints.
Rate limiting: Max 100 requests/minut per IP (Cloudflare Workers).
Input validation: Zod-schema på alla API-inpus (rejects malformed data).
CORS: Explicit whitelist av tillåtna origins.

Layer 3 — Databasäkerhet
Supabase Row Level Security: Varje rad har en organization_id.
RLS-policy: "Du ser bara din data" — implementerat på databasnivå.
Service key vs Anon key: Service key (admin) aldrig exponerat i frontend.

Layer 4 — Applikationssäkerhet
Miljövariabler: Aldrig i kod, aldrig i GitHub.
Secrets: GitHub Secrets för CI/CD, AWS Parameter Store för produktion.
Dependency scanning: Dependabot i GitHub skapar PRs för sårbarhetsfixar.

**Access control (Principle of Least Privilege):**
Varje person har minimal access de behöver för sin roll.
Johan: Full AWS access (CTO)
Winston: Revolut Business + Stripe Dashboard (CFO)
Dennis: DocuSign + bolagsregistrerings-portaler (CLO)
Leon: CRM + Communications i Wavult OS (CEO Ops)

**Incidentrespons:**
P0-incident (dataintrång): Erik + Johan informeras omedelbart.
GDPR-anmälan till Datainspektionen: Inom 72 timmar om persondata läckt.
Kundkommunikation: Dennis + Erik koordinerar.`,
      },
    ],
  },

  // ── Techstack Deep Dive ───────────────────────────────────────────────────
  {
    id: 'techstack',
    title: 'Techstack Deep Dive',
    description: 'Detaljerad genomgång av Wavults hela teknikstack: n8n, Supabase, GitHub, Docker och mer.',
    icon: '🔧',
    color: '#6366F1',
    lessons: [
      {
        title: 'n8n — Automation Hub',
        duration: 5,
        content: `n8n är Wavults automation-plattform. Det är "Make/Zapier för självhostat" — ett visuellt workflow-verktyg som kopplar ihop alla system.

**Var körs n8n?**
ECS Fargate, cluster hypbit (eu-north-1), task: n8n-task:latest.
Access: Via ALB-path /n8n (intern URL, ej publik).
Port: 5678.

**Befintliga workflows:**

Morning Brief (kl 08:00 varje dag)
Trigger: Cron
1. Hämtar nyheter (RSS, web scraping)
2. Frågar Claude (via OpenClaw API) om sammanfattning
3. Formaterar nyhetsbrev (HTML-template)
4. Skickar via AWS SES till teamet (5 mottagare + BCC till erik@hypbit.com)
Output: 08:00 varje dag i inkorgen.

Supabase → Notifikation (webhook-trigger)
Trigger: Supabase webhook vid ny row i "missions" tabell
1. Formaterar push-notification
2. Skickar via Expo Push API
3. Loggar i Supabase.

**Planerade workflows:**
• Zoomer-payout automation (Stripe Connect → Supabase → utbetalning)
• Landvex inspection cycle trigger (kör dagliga/veckovisa inspektioner)
• Slack/Telegram-alert när ECS-service unhealthy
• Monthly invoice generation (Landvex-kunder)

**n8n Credentials-hantering:**
Alla API-keys sparas som n8n Credentials (krypterade i n8n-databasen).
Aldrig hårdkodade i workflow-noder.

**Backup:**
n8n-exporterar workflow-JSON automatiskt till S3 dagligen.`,
      },
      {
        title: 'Supabase — Djupdykning',
        duration: 6,
        content: `Supabase är Wavults databaslager. Det är mer än en databas — det är en komplett backend-as-a-service.

**Supabase-projekt:**

quixzoom-v2 (eu-west-1): QuiXzoom-plattformens databas.
• 13 migrationer live
• Tabeller: missions, assignments, submissions, users, organizations, payouts...
• RLS aktiverat på alla publika tabeller

wavult-os (eu-west-1): Interna Wavult OS-datan.
• Tabeller: decisions, milestones, contacts, finance_entries...
• Används av command-center-appen

**Tre sätt att prata med Supabase:**

1. Supabase JS Client (frontend)
const { data } = await supabase.from('missions').select('*').eq('status', 'published')
Kräver: anon key (publik) + RLS-policies
Säkerhet: RLS säkerställer att du bara ser din data

2. REST API (bakifrån)
Supabase exponerar automatiskt ett REST API från databasen.
Auth: Service key (SECRET — aldrig i frontend!)
Används av ECS-services för admin-operationer.

3. Realtime Subscriptions
supabase.channel('missions').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'missions' }, callback).subscribe()
Zoomer-appen prenumererar på nya uppdrag i närheten → kartan uppdateras automatiskt.

**Row Level Security (RLS) — exempel:**
CREATE POLICY "Users can see own assignments" ON assignments FOR SELECT USING (auth.uid() = user_id);
Denna policy körs på VARJE select mot assignments-tabellen. Ingen kod behövs i applikationslagret.

**Supabase Edge Functions (planerat):**
Serverless TypeScript-funktioner som körs på Supabase-infrastrukturen.
Användning: Webhook handlers, schemalagda jobs, tung bildanalys.`,
      },
      {
        title: 'GitHub Actions — CI/CD i Detalj',
        duration: 5,
        content: `GitHub Actions är Wavults automatiserade deploy-pipeline. Varje push till main kan resultera i ett nytt deployment på minuter.

**Repo-struktur:**
wolfoftyreso-debug/hypbit (monorepo)
apps/
  api/ — Wavult OS API
  quixzoom-api/ — QuiXzoom backend
  command-center/ — Wavult OS frontend
  wavult-mobile/ — Expo React Native-app
.github/
  workflows/
    deploy-api.yml
    deploy-quixzoom.yml
    deploy-pages.yml

**deploy-api.yml — Komplett flöde:**
name: Deploy Wavult OS API
on:
  push:
    branches: [main]
    paths: ['apps/api/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-north-1
      - run: aws ecr get-login-password | docker login --username AWS --password-stdin \$ECR_REGISTRY
      - run: docker build -t wavult-os-api ./apps/api
      - run: docker push \$ECR_REGISTRY/wavult-os-api:\$GITHUB_SHA
      - run: aws ecs update-service --cluster hypbit --service wavult-os-api --force-new-deployment

**Path-filter (VIKTIGT):**
paths: ['apps/api/**'] — Deploy triggas BARA om filer i api/-mappen ändrats.
Utan path-filter → varje push deployer ALLA services = onödig tid + risk.

**GitHub Secrets (konfigurerade):**
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — IAM-user med ECS+ECR access
CLOUDFLARE_API_TOKEN — CF Pages deploy
CLOUDFLARE_ACCOUNT_ID — CF account
SUPABASE_SERVICE_KEY — Supabase admin key (lades till 2026-03-27)

**Vanliga fel och lösningar:**
"unauthorized" på ECR → AWS credentials saknas eller utgångna
"task definition invalid" → Ny env var adderad men ej i task definition
"health check failed" → App-crashar vid startup, kolla CloudWatch logs`,
      },
      {
        title: 'Docker — Hur våra containers byggs',
        duration: 5,
        content: `Docker är fundamentet för vår deploy-process. Varje service har en Dockerfile som definierar exakt hur applikationen paketeras.

**Wavult OS API Dockerfile (apps/api/Dockerfile):**
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]

**Multi-stage build — varför:**
Byggstadiet (builder) innehåller devDependencies och TypeScript-kompilatorn.
Produktionsstadiet (production) innehåller bara det som behövs för att köra.
Resultat: Image-storlek minskar med 60–70% — snabbare deploy, lägre kostnad.

**HEALTHCHECK:**
ECS använder HEALTHCHECK för att veta om containern är frisk.
Om /health svarar med != 200 tre gånger → ECS startar om containern automatiskt.
Vår /health endpoint returnerar: { status: "ok", version: "1.2.3", uptime: 3600 }

**ECR (Elastic Container Registry):**
Privat Docker registry på AWS. Varje image pushas hit innan ECS startar den.
Format: 155407238699.dkr.ecr.eu-north-1.amazonaws.com/[image-name]:[tag]
Tag: Vi använder GITHUB_SHA (commit-hash) för att kunna rollbacka exakt.

**Lokal debug:**
docker build -t wavult-api ./apps/api
docker run -p 3001:3001 --env-file .env wavult-api
Testar exakt samma container som körs i produktion.`,
      },
      {
        title: 'Wavult Mobile — React Native + Expo',
        duration: 5,
        content: `Wavult Mobile är teamets interna app för mobil access till Wavult OS och för Bernt-röstinteraktion.

**Teknologier:**
React Native: Cross-platform (iOS + Android) med en kodbas.
Expo: Build-infrastruktur, OTA-updates, native modules.
Expo Router: File-baserad navigation (som Next.js App Router, fast för mobile).
NativeWind: Tailwind CSS för React Native.

**Projektstruktur:**
apps/wavult-mobile/
  app/ — Expo Router screens
    _layout.tsx — Root layout, deep link handler
    (tabs)/ — Tab-navigering
      index.tsx — Dashboard
      chat.tsx — Bernt-chat
  components/
    chat/
      VoiceButton.tsx — Röstknapp (håll inne → spela in)
      ChatInterface.tsx
  lib/
    bernt.ts — OpenClaw webhook-integration
    whisper.ts — OpenAI Whisper transcription

**Röstflödet (Siri → Bernt):**
1. "Hey Siri, Bernt" → iOS Shortcut-app
2. Shortcut öppnar deep link: wavult://chat
3. Wavult Mobile öppnas automatiskt
4. VoiceButton aktiveras (håll inne för att tala)
5. Expo Audio spelar in → Whisper transkriberar
6. Text skickas till OpenClaw (Bernt)
7. Svar visas i chat + TTS-läses upp (valfritt)

**Build-process:**
eas build --platform ios → Expo Application Services bygger
eas submit → Laddar upp till App Store Connect
TestFlight: Interna testers (teamet) testar innan release

**Status 2026-03-27:**
Röstintegration-kod klar (VoiceButton + bernt.ts + _layout.tsx).
Nästa steg: eas build + TestFlight-distribution till teamet.
Kräver: Apple Developer Account aktiv (Erik eller Johan ansvarar).`,
      },
      {
        title: 'Monitoring & Observability',
        duration: 4,
        content: `Wavult Group behöver veta när saker går fel — innan kunderna vet det.

**Nuvarande monitoring:**

ECS Health Checks
Varje container kör HEALTHCHECK mot /health endpoint.
Om tre på varann checks misslyckas → ECS stoppar och startar om containern.
Logg finns i AWS CloudWatch Logs.

Bernt Morning/Evening Check
Bernt kör dagliga statusrapporter kl 08:00 och 20:00.
Kontrollerar: URL-status (api.quixzoom.com, api.hypbit.com), ECS tasks räkning, GitHub Actions senaste status.
Mail skickas om något är rött.

Cloudflare Analytics
Inbyggd i Cloudflare — trafikvolym, error rates, blocked attacks.
Gratis, ingen konfiguration.

**Planerad monitoring (nästa sprint):**

Sentry — Error Tracking
Frontend och backend skickar uncaught exceptions till Sentry.
Varje error: stack trace, user context, repro-steg.
Kostar: $0 för Sentry Community-plan.

Datadog / AWS CloudWatch Dashboards
CPU, minne, request latency per ECS service.
Alert: Slack-notis om CPU > 80% i mer än 5 min.

Uptime Robot / check-host.net
External monitoring — pinga våra publika endpoints var 5:e minut.
Alert om endpoint ej nås inom 10s.

**Incident Response:**
P0: Johan + Erik på Telegram omedelbart.
P1: Johan åtgärdar inom 1 timme, rapporterar till Erik.
P2: Löses i nästa arbetspass, dokumenteras i Wavult OS Incidents.
Post-mortem: Alla P0-incidents får ett skrivet post-mortem (vad hände, varför, åtgärd).`,
      },
    ],
  },

  // ── CRM & Kundhantering ─────────────────────────────────────────────────────
  {
    id: 'crm',
    title: 'CRM & Kundhantering',
    description: 'Pipeline-hantering, kundkort, uppföljningsregler och CRM som teamverktyg i Wavult OS.',
    icon: '🤝',
    color: '#06B6D4',
    lessons: [
      {
        title: 'Vad är ett CRM och varför vi behöver ett',
        duration: 4,
        content: `**Vad är ett CRM?**
CRM = Customer Relationship Management. Ett system för att spåra alla kontakter, konversationer och affärer med potentiella och befintliga kunder.

**Varför Excel inte räcker**
• Excel har ingen historik per kund — vem sa vad och när?
• Ingen pipeline-vy — var i säljprocessen befinner sig varje kund?
• Ingen påminnelselogik — uppföljningar faller bort
• Ingen teamdelning i realtid

**Pipeline-konceptet**
En pipeline visualiserar affärer som rör sig genom stadier — från första kontakt till stängd affär. Varje kund befinner sig alltid i ett tydligt steg.

**Wavults CRM-modul i Wavult OS**
• Tillgänglig under CRM-fliken i Wavult OS
• Kopplad till Landvex-pipelines (kommuner + Trafikverket)
• Alla teammedlemmar har läsrättigheter
• Leon och Erik har skrivrättigheter för pipelines`,
      },
      {
        title: 'Pipeline-stadier för Landvex-kunder',
        duration: 5,
        content: `**De sju stadierna**

• **Prospekt** — Identifierad som potentiell kund. Ingen kontakt ännu. Källa: LOU-databas, kommunlistor, tips.

• **Kontaktad** — Första e-post eller samtal gjort. Väntar på svar. Dokumentera datum och kanal.

• **Intresserad** — Kunden har svarat positivt och vill veta mer. Boka in ett informationsmöte.

• **Demo** — Vi har presenterat Landvex live. Kunden har sett produkten i aktion. Notera reaktioner.

• **Pilot** — Kunden testar Landvex i liten skala, typiskt 1-3 månader. Stöd aktivt.

• **Kund** — Signerat avtal och betalar prenumeration. Flytta till customer success-flödet.

• **Churnad** — Kunden avslutade. Dokumentera alltid orsaken — det är guld för produktförbättring.

**Vad som händer i varje steg**
Varje steg har en "definition of done" — tydliga kriterier för när man flyttar en kund vidare. Fråga Leon om du är osäker.

**Hur man dokumenterar**
Lägg alltid in ett notat efter varje kontakt: datum, vem du pratade med, vad som sades, nästa åtgärd.`,
      },
      {
        title: 'Kundkort — vad ska fyllas i',
        duration: 4,
        content: `**Kundkortet är Landvex-teamets gemensamma minne**
Allt som händer med en kund dokumenteras här. Inget i huvudet, allt i systemet.

**Obligatoriska fält**

• **Kontaktperson + roll** — Namn, titel, e-post, telefon. Vem är beslutsfattaren? Vem är teknikansvarig?

• **Kommunstorlek** — Antal invånare och antal objekt (kameror, sensorer) de potentiellt kan köpa

• **Budget-estimat** — Vad tror vi kunden kan betala per år? Bas: kommunens storlek och befintliga tech-budget

• **Antal objekt** — Estimat på hur många kameror/platser de vill övervaka

• **Nästa åtgärd** — Alltid en tydlig next step med datum. Aldrig tomt.

• **Senaste interaktion** — Datum + kort beskrivning av vad som hände

**Tips**
Fyll i kundkortet direkt efter varje möte eller samtal. Minnet bleknar fort. Ett komplett kundkort är skillnaden mellan att vinna och förlora en affär.`,
      },
      {
        title: 'Uppföljningsregler och kadenser',
        duration: 4,
        content: `**B2G kräver tålamod — men inte passivitet**
Kommuner beslutar långsamt. Det betyder inte att vi väntar passivt. Struktur vinner.

**Standardkadensen vid tystnad**

• Ingen svar efter första kontakt: Ring dag 3
• Fortfarande ingen respons: E-post dag 7 med nytt värdeargument
• Vilande efter 14 dagar utan respons: Markera som "vilande", schemalägg nästa försök om 30 dagar
• Aldrig ge upp under de första 6 månaderna — kommuner har långa beslutsprocesser

**Varför B2G kräver tålamod**
• Kommuner har budgetcykler (jan-dec), beslut fattas ofta i september-november
• Upphandlingsprocesser tar 3-6 månader under LOU
• Besluten involverar ofta 3-5 beslutsfattare
• En "nej" i dag kan bli ett "ja" nästa budgetår

**Vad du INTE gör**
• Skicka inte samma e-post igen utan att lägga till nytt värde
• Ring inte mer än en gång i veckan under vilofas
• Ge aldrig upp utan att dokumentera varför i CRM`,
      },
      {
        title: 'CRM som teamverktyg — inte bara säljarens',
        duration: 3,
        content: `**CRM tillhör hela teamet**
Det är lätt att se CRM som ett säljverktyg. Det är det inte. Det är hela bolagets gemensamma kundminne.

**Vad varje roll ser i CRM**

• **Leon** — Sälj: pipeline-status, nästa steg, affärspotential
• **Johan** — Tech: tekniska krav kunden ställde, integrationsbehov, API-frågor från demos
• **Dennis** — Juridik: avtalskrav, GDPR-frågor kunden lyfte, LOU-krav för upphandling
• **Winston** — Finance: estimerad affärsstorlek, betalningsvillkor, fakturaadress

**Gemensam sanning**
Ingen information om en kund lever i en persons huvud eller privata anteckningar. Allt som är affärskritiskt dokumenteras i CRM.

**Praktisk regel**
Om du har haft ett möte, ett samtal eller ett mejlutbyte med en kund eller prospekt — logga det i CRM inom 24 timmar.`,
      },
    ],
  },

  // ── Milestones & OKR ────────────────────────────────────────────────────────
  {
    id: 'milestones',
    title: 'Milestones & OKR',
    description: 'OKR-ramverket, Wavults Q2-struktur, skillnaden mot KPI och hur du uppdaterar status i Wavult OS.',
    icon: '🎯',
    color: '#10B981',
    lessons: [
      {
        title: 'Vad är OKR och varför startups använder det',
        duration: 4,
        content: `**OKR = Objectives and Key Results**
Ett ramverk för att sätta och mäta mål. Ursprungligen från Intel, populariserat av Google på 1990-talet.

**Strukturen**
• **Objective (O)** — En inspirerande, kvalitativ riktning. Inte mätbar i sig. Exempel: "Etablera Landvex som marknadsledare i Sverige"
• **Key Results (KR)** — 3-5 mätbara utfall som definierar om Objective är uppnått. Exempel: "Signera 5 kommunavtal", "Nå NPS > 40"

**Skillnad mot KPI**
KPI = löpande nyckeltal man alltid mäter (ex. antal aktiva kunder, churn rate).
OKR = tidsbegränsade mål (per kvartal) som driver förändring och prioritering.

**Varför det funkar för snabbväxande bolag**
• Skapar fokus — alla vet vad som prioriteras just nu
• Mätbart — inga luddiga mål som "bli bättre"
• Transparent — alla ser varandras OKR
• Ambitiöst — 70% completion av ett OKR är ofta bättre än 100% av ett för enkelt mål

**Googles ursprung**
John Doerr lärde sig OKR av Andy Grove på Intel och introducerade det på Google 1999. Sedan dess har det spridits till tusentals bolag.`,
      },
      {
        title: 'Wavults Q2 2026 OKR-struktur',
        duration: 5,
        content: `**Wavults primära Objective Q2 2026**
"QuiXzoom live i Sverige med 100 aktiva Zoomers"

**Key Results (KR)**
• KR1: 100 Zoomers registrerade och verifierade i Sverige senast 30 juni 2026
• KR2: Minst 3 betalande B2B-kunder (via Quixom Ads eller Landvex) signerade Q2
• KR3: Appen lever i App Store och Google Play med betyg > 4.0 vid lansering

**Hur de bryts ned till dagliga uppgifter**
Varje Key Result delas upp i veckovisa initiativ och dagliga tasks:
• KR1 → Leon rekryterar via sociala medier + referrals, mål: 15 nya Zoomers/vecka
• KR2 → Erik + Leon driver 2 demos/vecka mot kommuner
• KR3 → Johan + team levererar release candidate senast 1 juni

**Ägarskap**
Varje KR har en tydlig ägare. Ägaren rapporterar status varje vecka i Wavult OS Milestones-modulen.

**Vad händer om vi missar?**
En post-mortem per missat KR: vad blockerade, vad lärde vi oss, vad justerar vi för Q3?`,
      },
      {
        title: 'Milestones vs OKR vs Tasks',
        duration: 4,
        content: `**Tre nivåer — olika syften**

**Milestone**
• Binärt: antingen klart eller inte klart
• Exempel: "Appen är live i App Store" — ja eller nej
• Används för stora delmål som markerar verkliga framsteg
• Synlig för hela teamet och styrelsen

**OKR**
• Riktning + mätning
• Sätts per kvartal, ägs av en person
• Exempel: "Nå 100 Zoomers" — mäts löpande
• Balanserar ambition med verklighet

**Task**
• Daglig handling som bidrar till ett OKR eller Milestone
• Exempel: "Ring kommunen i Nacka tisdag kl 10"
• Hanteras i Wavult OS Tasks-modulen eller i personliga to-do-listor

**Hur de hänger ihop**
Tasks → uppfyller OKR Key Results → leder till Milestones.
Gör du rätt tasks varje dag, tar sig OKR:en framåt, och Milestones uppnås i rätt tid.

**Vanligaste misstaget**
Att blanda ihop nivåerna. En Milestone är INTE ett KR. En task är INTE ett OKR. Håll dem separata.`,
      },
      {
        title: 'Sprint-planering på Thailand Workcamp',
        duration: 5,
        content: `**Thailand Workcamp — 11 april 2026**
Hela teamet samlas för intensiv sprint-planering. Det är startskottet för Q2.

**90-dagars sprint**
April-juni är en sammanhängande 90-dagars sprint mot Q2 OKR. Allt som planeras på Thailand ska leda till de tre Key Results.

**Vem äger vad**
Ägarskap bestäms på Workcamp och dokumenteras i Wavult OS:
• Leon: Zoomer-rekrytering och B2B-sälj
• Johan: App-release och tech-infrastruktur
• Dennis: Juridik, avtal och compliance
• Winston: Finans, payroll och budget
• Erik: Produktvision, investerare och styrning

**Definition of Done**
Varje deliverable definieras tydligt — vad innebär det att något är "klart"? Inga gissningar.

**Dagliga standups**
Under Workcamp: standup kl 09:00 varje dag.
Efter Workcamp: asynkron standup i Telegram (vad gjorde jag igår, vad gör jag idag, blockerat av?).

**Veckovis review**
Varje fredag: gå igenom KR-status i Wavult OS, eskalera blockerade punkter till Erik.`,
      },
      {
        title: 'Hur du uppdaterar status i Wavult OS',
        duration: 3,
        content: `**Milestones-modulen i Wavult OS**
Navigera till Milestones i sidomenyn. Här ser du alla aktiva milstolpar för bolaget.

**Statuskoder**
• ✅ Klart — Milestonet är uppnått, datum registrerat
• 🔄 Pågår — Aktivt arbete, förväntat slutdatum satt
• ⚠️ Försenat — Deadline passerad, men arbete pågår
• 🔴 Blockerat — Kan inte fortsätta utan extern insats

**Blockerat vs Försenat**
Viktigt att skilja på:
• Försenat = vi jobbar på det, men hinner inte i tid
• Blockerat = vi kan inte jobba på det alls — det saknas ett beslut, en resurs eller en extern faktor

**Kommunicera tidigt**
Uppdatera status INNAN deadlines missas. En sen varning är bättre än en chock. Skriv alltid en kommentar: vad blockerar, vad behövs för att komma vidare.

**Frekvens**
Uppdatera din status minst en gång per vecka — gärna i samband med fredagsreviewen.`,
      },
    ],
  },

  // ── Finance-modulen ─────────────────────────────────────────────────────────
  {
    id: 'finance-module',
    title: 'Finance-modulen — Praktisk Guide',
    description: 'P&L, intercompany-fakturering, budget vs utfall och Causal OS för finansiell simulering.',
    icon: '📊',
    color: '#22C55E',
    lessons: [
      {
        title: 'Finance-modulens delar',
        duration: 4,
        content: `**Finance-modulen i Wavult OS**
Tillgänglig under Finance-fliken. Winston är primär ägare och ansvarig.

**Sektioner**

• **Översikt** — Dashboard med nyckeltal: burn rate, runway, totala tillgångar per entitet

• **Transaktioner** — Alla in- och utbetalningar per bolag. Kopplade till Revolut och bankkonton.

• **Payroll** — Löner och arvoden. Vem får vad, när och från vilket bolag. Inklusive skatteberäkningar per jurisdiktion.

• **Procurement** — Inköp och leverantörer. Alla återkommande kostnader registrerade: AWS, Supabase, Cloudflare, etc.

• **Optimering** — Analys av var bolaget kan spara. Duplicerade abonnemang, underutnyttjad kapacitet, alternativa leverantörer.

**Åtkomst**
• Alla teammedlemmar har läsrättigheter till Översikt
• Winston har full skrivrättighet
• Erik har godkännanderätt för betalningar > 10 000 SEK`,
      },
      {
        title: 'Hur du läser en P&L (Resultaträkning)',
        duration: 5,
        content: `**Vad är en P&L?**
P&L = Profit and Loss. På svenska: Resultaträkning. Det är bolagets ekonomiska facit för en period.

**Grundstrukturen**
Intäkter (Revenue)
– Kostnad för sålda varor/tjänster (COGS)
= Bruttoresultat (Gross Profit)
– Rörelsekostnader (OpEx: löner, hyra, marknadsföring)
= Rörelseresultat (EBIT)
– Räntor och skatt
= Nettoresultat (Net Profit / Loss)

**Bruttomarginal vs Nettomarginal**
• Bruttomarginal = (Intäkt - COGS) / Intäkt. Visar hur lönsam produkten är.
• Nettomarginal = Nettoresultat / Intäkt. Visar vad som faktiskt blir kvar.

**Wavults P&L i dag**
Vi är i pre-revenue-fas: noll intäkter, negativ burn (vi spenderar mer än vi tjänar). Det är normalt för en startup i byggfas. Fokus är att minimera burn och nå intäkter senast Q3 2026.

**Varför siffrorna är viktiga**
P&L styr alla viktiga beslut: anställningar, investeringar, produktprioriteringar. Förstår du P&L förstår du bolagets hälsa.`,
      },
      {
        title: 'Intercompany-fakturering i praktiken',
        duration: 5,
        content: `**Vad är intercompany-fakturering?**
Transaktioner mellan bolag inom samma koncern. Wavult Group har 6 entiteter — de fakturerar varandra för tjänster och kostnader.

**Praktiskt exempel**
Winston skapar en faktura från Landvex AB (Sverige) till Wavult DevOps FZCO (Dubai) för management fee.

**Vad ska stå på fakturan**
• Fakturanummer (sekventiellt per bolag)
• Fakturadatum och förfallodatum
• Säljarens fullständiga bolagsuppgifter (namn, org.nr, adress, VAT-nr)
• Köparens fullständiga bolagsuppgifter
• Beskrivning av tjänsten: "Management services fee, [månad] 2026"
• Belopp i avtalad valuta (typiskt SEK eller USD)
• Betalningsvillkor: 30 dagar netto

**Viktigt**
Alla intercompany-transaktioner ska följa arm's length-principen — priset ska motsvara vad oberoende parter skulle betala. Dennis och Winston ansvarar för transfer pricing-dokumentationen.

**Arkivering**
Alla fakturor sparas i Legal Hub under respektive bolags mapp.`,
      },
      {
        title: 'Budget vs Utfall — hur vi följer upp',
        duration: 4,
        content: `**Budget**
Budget sätts per kvartal i samband med OKR-planeringen. Winston ansvarar för budgetprocessen med input från alla avdelningsägare.

**Utfall**
Faktiska kostnader och intäkter stäms av månadsvis mot budgeten. Avvikelse = utfall minus budget.

**Avvikelsegränser**
• Avvikelse under 5%: acceptabelt utan förklaring
• Avvikelse 5-10%: dokumentera orsaken i Finance-modulen
• Avvikelse över 10%: kräver skriftlig förklaring och godkännande från Erik

**Winstons roll**
Winston producerar månadsrapporten senast den 5:e i efterföljande månad. Rapporten distribueras till Erik och Dennis.

**Varför detta är viktigt**
Utan budget vs utfall-uppföljning vet vi inte om vi spenderar för mycket, om intäkterna håller plan eller om vi riskerar att köra slut på cash. Det är bolagets ekonomiska kompass.`,
      },
      {
        title: 'Causal OS — finansiell simulering',
        duration: 4,
        content: `**Vad är Causal OS-modulen?**
En inbyggd finansiell simulator i Wavult OS. Låter dig simulera ekonomiska scenarion utan att röra bokföringen.

**Likviditetsvyn**
Visar dag-för-dag kassaflöde baserat på:
• Kända inbetalningar (avtal, abonnemang)
• Kända utbetalningar (löner, infrastruktur, abonnemang)
• Uppskattade framtida flöden (sannolikhetsvägt)

**Confidence-nivåer**
• Säkert (grön): Kontrakterade flöden, bekräftade fakturor
• Sannolikt (gul): Pipelineaffärer med hög sannolikhet
• Spekulativt (orange): Möjliga men osäkra framtida intäkter

**Scenario Engine**
Skapa scenarion: vad händer om vi anställer en säljare? Vad händer om Landvex-affären dröjer 3 månader? Simulera utan risk.

**Beslutsstöd**
Causal OS ger svar på: "Har vi råd med detta?" och "Hur länge håller kassan?" — viktiga frågor inför varje större beslut.`,
      },
    ],
  },

  // ── Legal Hub & Bolagsadmin ─────────────────────────────────────────────────
  {
    id: 'legal-hub',
    title: 'Legal Hub & Bolagsadmin',
    description: 'Avtalshierarki, DocuSign, bolagsadmin per jurisdiktion och vad du aldrig gör utan Dennis.',
    icon: '⚖️',
    color: '#F59E0B',
    lessons: [
      {
        title: 'Legal Hub — vad som finns här',
        duration: 4,
        content: `**Legal Hub i Wavult OS**
Samlingsplatsen för allt juridiskt material i Wavult Group. Dennis är ansvarig och primär ägare.

**Vad som finns**
• Alla bolagsavtal (SHA, MSA, IP-licensavtal)
• Kundavtal och NDA:er
• Compliance-dokumentation per bolag (GDPR, LOU, AML)
• Signeringshistorik via DocuSign

**Compliance-status**
Varje bolag har en compliance-dashboard som visar:
• Årsredovisningsstatus (inlämnad/förfaller/försenad)
• GDPR-registerföring (uppdaterad/behöver uppdateras)
• Pågående juridiska processer (om sådana finns)

**Hur man hittar ett specifikt avtal**
1. Navigera till Legal Hub i Wavult OS
2. Välj bolag (Landvex AB, QuiXzoom Ltd, etc.)
3. Välj avtalskategori (Bolagsavtal, Kundavtal, etc.)
4. Sök på motpart eller datum

**Viktigt**
Ladda aldrig ner och skicka avtal externt utan Denniss godkännande. Avtal är konfidentiella.`,
      },
      {
        title: 'Avtalshierarki i Wavult Group',
        duration: 5,
        content: `**Fyra nivåer av avtal**

**1. SHA — Shareholders Agreement (Ägaravtal)**
Det viktigaste avtalet. Reglerar ägarförhållanden, rösträtt, drag-along/tag-along, vesting för grundare. Signerat av alla ägare. Ändras bara med unanimitet.

**2. MSA — Management Services Agreement**
Reglerar hur holding-bolaget (Dubai) tillhandahåller tjänster till dotterbolagen. Grunden för intercompany-fakturering och management fees.

**3. IP-licensavtal**
Reglerar hur Dubai-holdingen licensierar all IP (kod, varumärken, algoritmer) till dotterbolagen. Säkerställer att all IP ägs centralt.

**4. Kundavtal**
Avtal med externa kunder (kommuner, B2B-kunder). Underordnade alla ovanstående.

**Vilket avtal styr vid konflikt?**
SHA vinner alltid. MSA vinner över IP-licens. Kundavtal kan aldrig strida mot SHA eller MSA.

**Varför denna struktur?**
Skyddar bolaget vid investeringar, förvärv och tvister. Dennis och Erik har utformat hierarkin gemensamt.`,
      },
      {
        title: 'DocuSign — digital signering',
        duration: 4,
        content: `**DocuSign i Wavult OS**
Alla avtal signeras digitalt via DocuSign, integrerat i Legal Hub. Ingen pappershantering krävs.

**Hur man signerar ett avtal**
1. Du får ett e-postmeddelande från DocuSign med länk
2. Klicka på länken, granska dokumentet NOGGRANT
3. Klicka på signaturmarkeringarna och signera
4. Bekräfta med BankID (eller annan verifiering beroende på jurisdiktion)
5. Alla parter får en kopia automatiskt, arkiveras i Legal Hub

**Vad du ska läsa innan du skriver under**
• Avtalsparter — är bolagsnamnen korrekta?
• Belopp och valuta — stämmer de?
• Löptid och uppsägningstid — vad har vi åtagit oss?
• Jurisdiktion — vilket lands lag gäller?

**L3-krav: Erik + Dennis**
Avtal av typ SHA, MSA och IP-licensavtal kräver signatur av BÅDE Erik och Dennis (L3-beslutsnivå). Inga undantag.

**Arkivering**
Signerade avtal arkiveras automatiskt i Legal Hub med datum, parter och avtalskategori.`,
      },
      {
        title: 'Bolagsadmin — löpande krav',
        duration: 5,
        content: `**Varje bolag har löpande juridiska krav**
Dennis ansvarar för dessa, men alla bör känna till dem.

**Årsredovisning**
Varje bolag lämnar in årsredovisning enligt lokal lagstiftning:
• Sverige (AB): senast 7 månader efter räkenskapsårets slut → Bolagsverket
• UK (Ltd): senast 9 månader → Companies House
• Dubai (FZCO): senast 3 månader → DMCC

**Styrelsemöten**
• Minst ett per år per bolag (ofta fler)
• KRÄVER skriftligt protokoll med datum, deltagare och beslutspunkter
• Protokoll arkiveras i Legal Hub
• Beslut utan protokoll är juridiskt ogiltiga

**Ändringsanmälningar**
Namnbyten, styrelseändringar, adressändringar måste anmälas till rätt myndighet:
• Sverige: Bolagsverket (digitalt via Mina sidor)
• UK: Companies House (Companies House WebFiling)
• Dubai: DMCC (DMCC-portalen)

**Deadline-krav**
Missade deadlines leder till böter och i värsta fall att bolaget avregistreras. Dennis håller en kalender i Legal Hub.`,
      },
      {
        title: 'Vad du ALDRIG gör utan Dennis',
        duration: 3,
        content: `**Fyra absoluta regler**

**1. Signera aldrig ett avtal**
Oavsett hur enkelt det verkar — NDA, samarbetsavtal, villkorsuppdatering. Allt går via Dennis för granskning innan signering.

**2. Gör aldrig offentliga uttalanden om ägarstruktur**
Ägarförhållanden i Wavult Group är konfidentiella. Frågor om vem som äger vad besvaras av Erik eller Dennis — aldrig av dig.

**3. Svara aldrig på myndighetsförfrågningar**
Brev, e-post eller samtal från Skatteverket, Bolagsverket, Finansinspektionen, DMCC eller andra myndigheter vidarebefordras OMEDELBART till Dennis utan eget svar.

**4. Ingå aldrig partnerskap med immateriella rättigheter**
Integrationer, co-branding, plattformsavtal som involverar delning av kod, data eller varumärke kräver Denniss granskning och Eriks godkännande.

**Varför dessa regler finns**
Juridiska misstag är dyra och ibland oåterkalleliga. Det kostar mer att undo ett dåligt avtal än att förebygga det. Dennis är vår försäkring.`,
      },
    ],
  },

  // ── Communications & Morning Brief ─────────────────────────────────────────
  {
    id: 'communications',
    title: 'Communications & Morning Brief',
    description: 'Kommunikationsmodulen, Morning Brief, Telegram som primär kanal och extern kommunikationspolicy.',
    icon: '📡',
    color: '#8B5CF6',
    lessons: [
      {
        title: 'Communications-modulen — översikt',
        duration: 3,
        content: `**Communications-modulen i Wavult OS**
Samlingsplatsen för intern och extern kommunikationsinfrastruktur.

**Morning Brief-konfiguration**
Konfigurera vad som ingår i din dagliga Morning Brief: nyhetsflöden, systemstatus, company knowledge, citat. Levereras kl 08:00 varje vardag.

**Notifikationscentret**
Hantera vilka larm och notifikationer du vill ta emot:
• Systemlarm (infrastruktur)
• Landvex-incidenter
• CRM-påminnelser
• Finansiella varningar

**API-status-vyn**
Realtidsöversikt av alla externa API-integrationer: Stripe, Supabase, AWS, n8n. Ser du rött här — eskalera till Johan.

**Varför intern kommunikation är strukturerad**
Med ett distribuerat team (Sverige + Dubai + remote) är strukturerad kommunikation inte en nice-to-have — det är vad som håller bolaget koordinerat.`,
      },
      {
        title: 'Morning Brief — hur det fungerar',
        duration: 4,
        content: `**Morning Brief**
En daglig e-postsammanfattning som Bernt genererar och skickar varje vardag kl 08:00.

**Teknisk pipeline**
Bernt (AI-agent) → n8n (automation) → AWS SES (e-postleverans) → Din inkorg

**Innehållssektioner**
• **Nyheter** — Curated nyheter relevanta för Wavults branscher (drone-tech, B2G, SaaS)
• **Systemskola** — En lärdom per dag om Wavult OS, produkterna eller branschen
• **Company knowledge** — Interna uppdateringar, beslut, milstolpar från föregående dag
• **Citat** — Ett inspirerande citat för dagen

**BCC-regel**
Alla Morning Briefs skickas alltid med BCC till erik@hypbit.com. Erik har alltid en kopia av vad som kommuniceras.

**Anpassa din brief**
Gå till Communications → Morning Brief Settings för att justera vilka sektioner du vill ha och eventuella extra nyhetsflöden.`,
      },
      {
        title: 'Telegram som primär kanal',
        duration: 4,
        content: `**Varför Telegram?**
• End-to-end krypterat (Secret Chats)
• Snabbt och tillförlitligt på alla enheter
• Stödjer bots och automation (Bernt-boten)
• Gratis och utan företagsbindning

**Kanalstrukturen**
• **Team-gruppen** — Hela teamet, daglig kommunikation
• **Direktkanaler** — Bilaterala konversationer (Erik-Leon, Erik-Dennis etc.)
• **Bernt-boten** — Skriv till @BerntBot för AI-assistans direkt i Telegram

**Vad kommuniceras var**
• Telegram: snabba uppdateringar, frågor, daglig status, larm
• E-post: formell kommunikation, externa parter, dokumentation
• Wavult OS: strukturerad data, milestones, CRM, Finance

**Vad som INTE kommuniceras i Telegram**
• Lösenord eller tokens (aldrig — använd Secrets-modulen)
• Kunddata eller personuppgifter (GDPR-risk)
• Kontroversiella ämnen som ska dokumenteras formellt

**Responstid**
Förväntan: svar inom 2 timmar på vardagar. Urgent = ring direkt.`,
      },
      {
        title: 'Extern kommunikation — regler',
        duration: 5,
        content: `**Vem pratar med pressen?**
Bara Erik. Ingen annan i teamet uttalar sig till media om Wavult Group, QuiXzoom eller Landvex utan Eriks explicita godkännande.

**Om du kontaktas av media**
Standardsvar: "Tack för ditt intresse. Vänligen kontakta vår CEO Erik Svensson på erik@hypbit.com."
Säg ingenting mer. Inga kommentarer, inga spekulationer.

**Social media-policy för teamet**
• Du får gärna posta om branschen, tech och generella iakttagelser
• Du får gärna säga att du jobbar på Wavult/QuiXzoom/Landvex
• Du får INTE avslöja ej offentliggjord information (produktplaner, finansiella data, partnerskap)
• Du får INTE kritisera kollegor, kunder eller konkurrenter offentligt

**Vad som aldrig postas offentligt**
• Finansiell information (burn rate, kapitalresning, runway)
• Kundnamn utan deras skriftliga godkännande
• Intern strategi eller roadmap
• Information om pågående upphandlingar eller avtal

**Konsekvenser**
Brott mot extern kommunikationspolicy är ett allvarligt disciplinärende. Fråga alltid Erik om du är osäker.`,
      },
      {
        title: 'Notifikationscentret',
        duration: 3,
        content: `**Notifikationscentret i Wavult OS**
Konfigurera vilka händelser som ska trigga en notifikation till dig — i appen, via Telegram eller e-post.

**Notifikationstyper**

• **Systemlarm** — Infrastruktur-alerts (CPU, memory, service down). Levereras till Johan primärt.

• **Landvex-larm** — Händelsebaserade larm från kameranätverket landar i Communications-modulen och kan vidarebefordras till ansvarig person.

• **CRM-påminnelser** — "Du har inte följt upp [kund] på 7 dagar." Levereras till den som äger kontakten.

• **Finansiella varningar** — Runway-varningar, missade fakturor, ovanliga transaktioner.

**Hur man sätter upp notiser**
1. Gå till Communications → Notification Center
2. Välj notifikationstyp
3. Välj leveranskanal (in-app, Telegram, e-post)
4. Sätt tröskelvärden om tillämpligt (ex. "varna om CPU > 80%")

**Best practice**
Undvik notifikationsfatigue. Välj bara notiser du faktiskt agerar på.`,
      },
    ],
  },

  // ── Causal OS & Finansiell Simulering ──────────────────────────────────────
  {
    id: 'causal-os-course',
    title: 'Causal OS — Finansiell Simulering',
    description: 'Kausal logik, likviditetsmotorn, scenario-engine, Decision Impact Calculator och systemvarningar.',
    icon: '🧠',
    color: '#6366F1',
    lessons: [
      {
        title: 'Vad är ett kausalt operativsystem',
        duration: 4,
        content: `**Bortom siffror**
Traditionella finansverktyg visar vad som HÄNT. Causal OS visar vad som HÄNDER och vad som KOMMER ATT HÄNDA — och varför.

**Kausalitet vs korrelation**
• Korrelation: "När det regnar säljer vi mer paraplyer" (två saker samvarierar)
• Kausalitet: "Regn ORSAKAR ökad paraplförsäljning" (orsak-verkan)
Causal OS modellerar orsak-verkan-kedjor, inte bara statistiska mönster.

**Hur ett beslut påverkar hela verksamheten**
Varje beslut har kaskadeffekter. Exempel: "Vi anställer en säljare":
• Lönen ökar burn rate (+15 000 SEK/mån)
• Säljaren förväntas generera X nya kunder om 6 månader
• Nya kunder genererar MRR
• MRR förändrar runway
Causal OS beräknar hela kedjan automatiskt.

**Wavults Causal OS som digital tvilling**
Causal OS är en digital kopia av bolagets ekonomi. Alla kända parametrar är inlagda. Ändringar i verkligheten uppdaterar modellen.`,
      },
      {
        title: 'Likviditetsmotorn — dag-för-dag',
        duration: 5,
        content: `**Likviditetsvyn**
En tidslinje som visar kassan dag-för-dag under de kommande 12 månaderna.

**Hur man läser vyn**
• X-axeln = tid (dagar/veckor/månader)
• Y-axeln = kassan (SEK)
• Linjen sjunker vid utbetalningar, stiger vid inbetalningar

**Confidence-nivåer**
Varje kassaflöde är klassificerat:
• Säkert (grön) — Kontrakterade, bekräftade flöden
• Sannolikt (gul) — Pipelineaffärer med >70% sannolikhet
• Spekulativt (orange) — Möjliga men osäkra framtida intäkter

**Varningsnivåer**
• Gul: Runway under 6 månader — planera nu
• Orange: Runway under 3 månader — agera nu
• Röd: Runway under 1 månad — kris

**Runway-begreppet**
Runway = hur länge kassan räcker till vid nuvarande burn rate.
Formel: Kassa / Månatlig burn = Runway i månader
Mål: alltid ha minst 6 månaders runway.`,
      },
      {
        title: 'Scenario Engine — simulera framtiden',
        duration: 5,
        content: `**Scenario Engine**
Skapa parallella versioner av framtiden och jämför dem. Inga konsekvenser i verkligheten — bara i simuleringen.

**Tre grundscenarios**
• **Basfall** — Realistisk prognos baserad på nuvarande pipeline och kända kostnader
• **Bull** — Optimistiskt scenario: alla affärer stängs, inga oväntade kostnader
• **Bear** — Pessimistiskt scenario: inga nya intäkter, oväntade kostnader uppstår

**Hur man drar i reglage**
Varje variabel (MRR-tillväxt, burn rate, anställningar, churn) har ett reglage. Dra i ett reglage och se effekten i realtid i likviditetsvyn.

**Kausal propagation**
När du ändrar en variabel beräknar Causal OS automatiskt alla nedströms effekter.
Exempel: Öka "antal Landvex-kunder" med 5 → systemet beräknar MRR-ökning → beräknar ökad support-kostnad → justerar runway.

**Live preview**
Alla scenarioändringar visas live utan att du behöver spara. Spara bara det scenario du vill presentera för styrelsen.`,
      },
      {
        title: 'Decision Impact Calculator',
        duration: 5,
        content: `**Decision Impact Calculator**
Ett verktyg för att beräkna den faktiska ekonomiska effekten av ett specifikt beslut innan det fattas.

**Hur det fungerar**
1. Välj ett beslut från listan (eller skapa ett eget)
2. Fyll i parametrar (kostnad, förväntad effekt, tidshorisont)
3. Systemet beräknar kausala konsekvenser
4. Du får en rekommendation: "Genomförbar nu / Inte genomförbar / Genomförbar om X"

**Exempelbeslut**
• Anställ en fältsäljare: +15 000 SEK/mån kostnad, förväntat +3 kunder/kvartal
• Dubbla marknadsföringsbudgeten: +20 000 SEK/mån, förväntat +40% leads
• Köp serverhardware: engångskostnad 50 000 SEK, sparar 5 000 SEK/mån

**Genomförbarhetscheck**
"Kan vi göra detta nu?" Systemet kontrollerar:
• Räcker kassan?
• Finns kapacitet i teamet?
• Är det i linje med Q2 OKR?

**Side-by-side jämförelse**
Jämför upp till 3 besluts alternativ bredvid varandra för att välja det optimala.`,
      },
      {
        title: 'Systemvarningar — lyssna på systemet',
        duration: 4,
        content: `**Causal OS genererar automatiska varningar**
När modellen detekterar ett potentiellt problem skickas en varning — innan det är ett akut problem.

**Varningsnivåer**

• **Info (blå)** — Notera detta. Ingen omedelbar åtgärd krävs. Exempel: "Runway sjunker mot 8 månader"

• **Warning (gul)** — Uppmärksamhet krävs. Planera en åtgärd. Exempel: "Runway under 6 månader om ingen ny intäkt inom 60 dagar"

• **Critical (röd)** — Agera nu. Eskalera till Erik omedelbart. Exempel: "Runway under 3 månader"

**Suggested Actions**
Varje varning innehåller förslag på åtgärder:
• Reducera burn rate (vilka kostnader kan skäras?)
• Accelerera intäkter (vilka affärer kan stängas snabbare?)
• Kapitalanskaffning (är det dags att söka bridge-finansiering?)

**Bernt integreras med Causal OS**
Bernt prenumererar på Causal OS-varningar och kan proaktivt meddela teamet via Telegram när en kritisk tröskel nås — utan att någon manuellt behöver kolla dashboarden.`,
      },
    ],
  },

  // ── Infrastructure & Drift ──────────────────────────────────────────────────
  {
    id: 'infrastructure-course',
    title: 'Infrastructure & Drift',
    description: 'Infrastructure Operations Center, larmhantering, failover, fakturering och underhållsrutiner.',
    icon: '🖥️',
    color: '#64748B',
    lessons: [
      {
        title: 'Infrastructure Operations Center — översikt',
        duration: 4,
        content: `**Infrastructure Operations Center (IOC)**
Finns under Infrastructure-fliken i Wavult OS. Realtidsvy av all teknisk infrastruktur.

**Vad modulen visar**
• Status för varje registrerad tjänst (grön/gul/röd)
• CPU, minne och lagring per service
• Uptime-statistik och incidenthistorik
• Deployment-logg (vad deployades, när, av vem)

**15 registrerade tjänster**
Inkluderar: wavult-os-api, quixzoom-api, n8n, supabase, cloudflare-pages, team-pulse, och mer. Varje tjänst har ett referensnummer (WG-TECH-2026-XXX).

**Kritikalitetsnivåer**
• Nivå 1 (Kritisk): Tjänsten påverkar intäkter eller kundleverans. Kräver omedelbar åtgärd vid fel.
• Nivå 2 (Viktig): Påverkar intern drift men inte kundleverans. Åtgärdas inom 4 timmar.
• Nivå 3 (Nice-to-have): Påverkar inte drift. Kan vänta till nästa arbetspass.

**Johan är primär ägare**
Alla infrastrukturfrågor eskaleras till Johan i första hand.`,
      },
      {
        title: 'Larmhantering — vad gör du när något är rött',
        duration: 5,
        content: `**Incidentnivåer**

• **P0** — Kritisk: Produktion nere, kunder påverkade. Eskalera till Johan OCH Erik omedelbart (Telegram + ring).

• **P1** — Allvarlig: Degraderad funktionalitet, kunder potentiellt påverkade. Johan åtgärdar inom 1 timme.

• **P2** — Varning: Ej kritisk men behöver åtgärd. Löses i nästa arbetspass.

• **P3** — Info: Notera och dokumentera. Åtgärdas vid nästa planerat underhåll.

**Eskaleringskedja**
Johan (primär) → Erik (eskalering vid P0) → Dennis (vid juridiska konsekvenser) → Winston (vid finansiella konsekvenser)

**Hur man kvitterar ett larm**
1. Öppna larmet i IOC
2. Klicka "Acknowledge" — larmet är nu känt
3. Tilldela ägare och estimerad lösningstid
4. Uppdatera status allteftersom

**Post-mortem vid P0**
Alla P0-incidenter KRÄVER ett skrivet post-mortem inom 48 timmar:
• Vad hände?
• Varför hände det (root cause)?
• Vad gör vi för att det inte händer igen?`,
      },
      {
        title: 'Failover — vad händer om en tjänst faller',
        duration: 4,
        content: `**Wavults redundansstrategi**
Vi bygger system som klarar fel utan manuell intervention — men vi behöver förstå hur.

**ECS Auto-restart**
AWS Elastic Container Service (ECS) overvakar alla containerbaserade tjänster med health checks.
• Health check misslyckas 3 gånger i rad → ECS startar om containern automatiskt
• Typisk återhämtningstid: 30-60 sekunder
• Ingen manuell åtgärd krävs för transienta fel

**S3 Cross-Region Replication (CRR)**
All data i S3 replikeras automatiskt till en backup-region.
• Primär region: eu-north-1 (Stockholm)
• Backup-region: eu-west-1 (Irland)
• Om primärregionen faller helt kan vi aktivera backup inom timmar

**RTO och RPO**
• RTO (Recovery Time Objective): Hur lång tid det tar att återställa service. Mål: < 4 timmar.
• RPO (Recovery Point Objective): Hur gammal data vi maximalt förlorar. Mål: < 1 timme.

**Varför vi har redundans**
En enda server som faller = potentiell datakatastrof. Redundans kostar lite extra men skyddar mot katastrofer.`,
      },
      {
        title: 'Betalningar och fakturering för infra',
        duration: 4,
        content: `**Infrastrukturkostnader är löpande**
Alla infra-kostnader betalas med Revolut virtuella kort kopplade till Wavult DevOps FZCO (Dubai).

**Månadsvis fakturering**

• **AWS** — Faktura varje månad baserat på förbrukning. Inkluderar ECS, S3, SES, CloudWatch.
• **Supabase** — Månatlig prenumeration för databas och auth-tjänster.
• **Cloudflare** — Domänregistrering och CDN/DNS-tjänster.
• **GitHub** — Repository-hosting och CI/CD Actions.

**Revolut virtuella kort**
Vi använder separata virtuella kort per kostnadscenter — ett för AWS, ett för SaaS-tjänster, etc. Detta gör det enkelt att följa upp kostnader per kategori.

**Total infra-kostnad**
Aktuell total infrastrukturkostnad: 27 840 SEK/år (exkl. skalningskostnader).

**Winstons roll**
Winston stämmer av infra-fakturor mot budget månadsvis. Johan flaggar oväntade kostnadsökningar.`,
      },
      {
        title: 'Underhåll och uppdateringar',
        duration: 4,
        content: `**Löpande underhåll är preventivt arbete**
Regelbundna uppdateringar förhindrar säkerhetsproblem och teknisk skuld.

**Uppdatera en ECS-service (ny Docker-tag)**
1. Johan bygger ny Docker-image och pushar till ECR
2. Image taggas med commit-SHA (ex. v1.2.3-abc1234)
3. ECS Task Definition uppdateras med ny image-tag
4. ECS rolling deployment startar — ny version rullas ut utan driftstopp
5. Health checks bekräftar att nya versionen fungerar

**Cloudflare Pages-deploy**
Sker automatiskt via GitHub Actions vid push till main-branchen.
• Push → GitHub Actions bygger → Cloudflare Pages deployas
• Typisk byggtid: 2-4 minuter

**n8n-uppdatering**
n8n körs som en ECS-service och uppdateras via Docker-tag-metoden ovan. OBS: testa alltid n8n-workflows efter uppdatering.

**Dependabot-alerts i GitHub**
GitHub Dependabot skannar dependencies automatiskt och skapar Pull Requests för säkerhetsuppdateringar. Johan reviewar och mergar veckovis.`,
      },
    ],
  },

  // ── Finansiella Begrepp & Facktermer ────────────────────────────────────────
  {
    id: 'financial-terms',
    title: 'Finansiella Begrepp & Facktermer',
    description: 'SaaS-metriker, unit economics, burn rate, EBITDA, kapitalstruktur och intercompany-grunderna.',
    icon: '📚',
    color: '#0EA5E9',
    lessons: [
      {
        title: 'SaaS-metriker: MRR, ARR, Churn',
        duration: 5,
        content: `**MRR — Monthly Recurring Revenue**
Summan av alla aktiva månatliga prenumerationsintäkter. Exempel: 50 kunder betalar 1 000 SEK/mån = MRR 50 000 SEK.
Inkluderar INTE: engångsbetalningar, setup-avgifter, konsulttimmar.

**ARR — Annual Recurring Revenue**
ARR = MRR x 12. Annualiserar intäkterna för att ge en mer jämförbar siffra vid investerardiskussioner.

**Churn**
Andelen kunder (eller MRR) som försvinner per månad.
• Customer churn: "5% av våra kunder lämnar varje månad"
• Revenue churn: "3% av vår MRR churnar varje månad"

**Varför churn är viktigare än tillväxt**
Om du tappar kunder lika snabbt som du vinner dem stannar MRR. Hög churn dödar ett SaaS-bolag trots stark tillväxt.

Formel: Netto MRR-tillväxt = Ny MRR + Expansion MRR – Churn MRR

**Hälsosamma riktmärken (B2B SaaS)**
• MRR-tillväxt: >10% per månad i tidigt skede
• Churn: <2% per månad är bra, <5% är acceptabelt`,
      },
      {
        title: 'CAC, LTV och unit economics',
        duration: 5,
        content: `**CAC — Customer Acquisition Cost**
Total kostnad för att förvärva en ny kund.
Formel: Total sälj- och marknadsföringskostnad / Antal nya kunder under perioden
Exempel: Vi spenderar 100 000 SEK på sälj och vinner 10 kunder = CAC 10 000 SEK

**LTV — Lifetime Value**
Total intäkt från en kund under hela relationen.
Formel: Genomsnittlig MRR per kund / Churn rate
Exempel: Kund betalar 2 000 SEK/mån, churn 2%/mån = LTV 100 000 SEK

**LTV/CAC-kvoten**
Nyckeltal för hälsosam unit economics:
• LTV/CAC > 3: Hälsosamt — för varje SEK vi spenderar på sälj tjänar vi 3 SEK
• LTV/CAC < 1: Katastrofalt — vi förlorar pengar på varje kund
• Mål för Wavult: LTV/CAC > 3 vid slutet av 2026

**Hur Wavult beräknar detta per produkt**
Landvex och QuiXzoom beräknas separat — de har olika CAC (Landvex är dyrare att sälja) och olika LTV (Landvex har längre kundrelationer).`,
      },
      {
        title: 'Burn rate, runway och break-even',
        duration: 5,
        content: `**Burn rate**
Netto kassautflöde per månad — hur mycket pengar vi "bränner" (spenderar mer än vi tjänar).
Formel: Totala utbetalningar – Totala inbetalningar per månad
Exempel: Vi spenderar 200 000 SEK och tjänar 50 000 SEK = Burn rate 150 000 SEK/mån

**Gross burn vs Net burn**
• Gross burn: Totala kostnader (oavsett intäkter)
• Net burn: Kostnader minus intäkter (vad vi faktiskt förlorar)

**Runway**
Hur länge kassan räcker vid nuvarande burn rate.
Formel: Kassa i banken / Månatlig net burn = Runway i månader
Exempel: 900 000 SEK kassa / 150 000 SEK/mån = 6 månaders runway

**Break-even**
Punkten när intäkter täcker kostnader — net burn = 0.
Mål för Wavult: Break-even vid ca 50 betalande Landvex-kunder (estimat).

**Varför startup-bolag fokuserar på runway**
Runway är livsnerven. Tar pengarna slut innan intäkterna kickar in är det game over. Förvalta runway med respekt.`,
      },
      {
        title: 'Marginal, EBITDA och rörelseresultat',
        duration: 5,
        content: `**Bruttomarginal**
Formel: (Intäkt – COGS) / Intäkt x 100 = Bruttomarginal %
COGS = direkt kostnad för att leverera tjänsten (hosting, transaktionsavgifter, support)
Hälsosam SaaS-bruttomarginal: 70-85%

**Rörelseresultat (EBIT)**
EBIT = Earnings Before Interest and Taxes
= Intäkter – Alla rörelsekostnader (COGS + OpEx)
Visar hur lönsam den operativa verksamheten är, innan finanskostnader och skatt.

**EBITDA**
EBITDA = Earnings Before Interest, Taxes, Depreciation, and Amortization
= EBIT + Avskrivningar
Vanligt mått vid bolagsvärdering. Eliminerar effekten av finansieringsstruktur och redovisningsval.

**Varför investerare fokuserar på EBITDA**
EBITDA är ett proxy för kassagenerering — hur mycket kontanter verksamheten genererar från sin kärnverksamhet. Jämförbart mellan bolag med olika skuldsättning.

**Wavults situation**
Negativ EBITDA i dag (pre-revenue). Målet är positiv EBITDA 12 månader efter intäktsstart.`,
      },
      {
        title: 'Kapitalstruktur och equity',
        duration: 5,
        content: `**Kapitalstruktur**
Hur ett bolag finansieras: mix av eget kapital (equity) och skuld (debt).

**Equity (eget kapital)**
Ägarnas andel i bolaget. Representeras av aktier.
• Fördel: Inga återbetalningskrav
• Nackdel: Ägarandelen späds ut (dilution) vid ny emission

**Skuld (debt)**
Lån som ska återbetalas med ränta.
• Fördel: Ingen dilution
• Nackdel: Kräver kassaflöde för amortering och ränta

**Dilution**
När nya aktier emitteras späds befintliga ägares procentuella andel ut. Exempel: Du äger 20% av 1 000 aktier = 200 aktier. Bolaget emitterar 1 000 nya aktier → du äger nu 200 av 2 000 = 10%.

**Pre-money vs post-money valuation**
• Pre-money: Bolagets värde INNAN ny investering
• Post-money: Pre-money + Investerat belopp
Exempel: Pre-money 10M SEK, investering 2M SEK = Post-money 12M SEK, investeraren äger 2/12 = 16,7%

**Wavults Dubai-struktur**
IP och equity samlat i Dubai-holdingen. Dotterbolagen äger ingen IP. Vid en exit säljs holdingen.`,
      },
      {
        title: 'Intercompany och transfer pricing — grunderna',
        duration: 5,
        content: `**Intercompany-transaktioner**
Affärshändelser mellan bolag inom samma koncern.
Exempel: Wavult DevOps FZCO (Dubai) licensierar IP till Landvex AB (Sverige) och tar betalt för det.

**Arm's length-principen**
Prissättningen mellan koncernbolag ska vara densamma som om de vore oberoende parter på marknaden. Du kan inte sätta priser godtyckligt för att minimera skatt.

**Transfer pricing-dokumentation**
Skattemyndigheter kräver dokumentation som visar att intercompany-priser följer arm's length.
Dennis och Winston ansvarar för denna dokumentation i Wavult Group.

**Varför transfer pricing-dokumentation krävs**
Utan dokumentation kan skattemyndigheten (Skatteverket, DMCC, HMRC) omvärdera priserna och kräva mer skatt + ränta + sanktioner.

**Vad som händer vid brister**
• Påslag av skatt retroaktivt
• Ränta och böter
• I allvarliga fall: kriminellt ansvar för företagsledningen

**Vår approach**
Alla intercompany-flöden dokumenteras löpande. Årsvis review med extern skatterådgivare. Dennis äger processen.`,
      },
    ],
  },

  // ── Juridiska & Affärsmässiga Begrepp ──────────────────────────────────────
  {
    id: 'legal-terms',
    title: 'Juridiska & Affärsmässiga Begrepp',
    description: 'Bolagsformer, avtalstyper, GDPR, LOU, immateriella rättigheter och investerartermer.',
    icon: '📜',
    color: '#EF4444',
    lessons: [
      {
        title: 'Bolagsformer globalt: LLC, UAB, FZCO, AB',
        duration: 5,
        content: `**Varför vi har olika bolagsformer**
Olika jurisdiktioner, olika skattemässiga behandling, olika ägarkrav. Wavult Group är globalt strukturerat för optimal flexibilitet.

**LLC — Limited Liability Company (USA)**
Pass-through-beskattning: vinster beskattas hos ägarna, inte bolaget (undviker dubbelbeskattning).
Enkel administration. Används i Texas.

**C-Corp (USA)**
Dubbelbeskattning: bolaget betalar bolagsskatt, sedan betalar ägarna skatt på utdelning.
Föredras av VC-investerare. Wavult använder inte C-Corp just nu.

**UAB (Litauen)**
Litauisk variant av limited liability company. Låg bolagsskatt (15%). Bra EU-tillgång.

**FZCO — Free Zone Company (Dubai)**
Bolagsform i Dubais fri-zoner (ex. DMCC). 0% bolagsskatt. 100% utländskt ägande tillåtet.
Wavults primärt holding- och IP-bolag.

**AB — Aktiebolag (Sverige)**
Standardform för svenska bolag. 20,6% bolagsskatt. Strikt Bolagsverket-reglering.
Landvex AB och QuiXzoom AB är svenska AB.`,
      },
      {
        title: 'Avtal: SHA, MSA, DPA, IP-licens',
        duration: 5,
        content: `**De fyra viktigaste avtalstyperna i Wavult**

**SHA — Shareholders Agreement (Ägaravtal)**
Reglerar relationen mellan ägare/aktieägare.
Täcker: vinstdelning, rösträtt, drag-along (majority kan tvinga minority att sälja), tag-along (minority kan följa med vid försäljning), vesting.
Förändras bara med unanimitet.

**MSA — Management Services Agreement**
Avtal om tjänsteleverans — typiskt från holding till dotterbolag.
Wavults Dubai-bolag levererar "management services" (strategi, IP, infra) till dotterbolagen mot en fee.
Grunden för intercompany-fakturering.

**DPA — Data Processing Agreement**
GDPR-krav. Krävs när ett bolag (processor) behandlar personuppgifter på uppdrag av ett annat (controller).
Wavult måste ha DPA med leverantörer som hanterar kunddata (Supabase, AWS, etc.).

**IP-licensavtal**
Reglerar rätten att använda immateriella rättigheter som ägs av ett bolag.
Dubai-holdingen äger all IP. Dotterbolagen licensierar rätten att använda IP mot en licensavgift.`,
      },
      {
        title: 'GDPR-begrepp: controller, processor, DPO',
        duration: 5,
        content: `**GDPR — General Data Protection Regulation**
EU:s dataskyddsförordning. Gäller alla bolag som behandlar personuppgifter om EU-medborgare.

**Personuppgiftsansvarig (Controller)**
Bestämmer VARFÖR och HUR personuppgifter behandlas.
Wavult Group är controller för zoomer-data och kunddata.
Ansvarig: Dennis (och ytterst Erik).

**Personuppgiftsbiträde (Processor)**
Behandlar personuppgifter på uppdrag av en controller.
Supabase är vår processor (hostar data). AWS är processor (kör infrastruktur).
Kräver DPA-avtal med varje processor.

**DPO — Dataskyddsombud**
Krävs inte alltid men rekommenderas. Övervakar GDPR-compliance internt.
Wavult har Dennis i en quasi-DPO-roll.

**Rättslig grund**
Personuppgiftsbehandling kräver en av sex rättsliga grunder:
• Samtycke — användaren godkänner
• Avtal — nödvändigt för avtalsuppfyllelse
• Berättigat intresse — vi har ett legitimt skäl

**Rätt till radering**
Individer kan begära att deras data raderas ("rätten att bli glömd"). Vi måste kunna efterleva detta inom 30 dagar.`,
      },
      {
        title: 'LOU och offentlig upphandling',
        duration: 5,
        content: `**LOU — Lagen om offentlig upphandling**
Reglerar hur offentliga aktörer (kommuner, regioner, statliga myndigheter) köper varor och tjänster.
Grundprincipen: transparens, icke-diskriminering, konkurrens.

**Direktupphandling**
Under en viss gräns kan kommunen köpa utan upphandlingsprocess.
Gräns: 700 000 SEK per år (2024-nivå).
Möjlighet: Landvex kan sälja direkt till kommuner under gränsen — snabbare säljcykel.

**Förenklad upphandling**
Mellan direktupphandlingsgränsen och EU-tröskelvärdena. Enklare process, kortare tid.

**Öppen upphandling**
Över EU-tröskelvärdena (ca 7 MSEK för varor/tjänster). Fullt upphandlingsförfarande med annonsering, anbud och utvärdering. Tar 6-18 månader.

**Hur Landvex navigerar LOU**
• Primär strategi: Direktupphandling (snabbast, under 700k SEK/år)
• Sekundär strategi: Förenklad upphandling via befintliga ramavtal
• Vi hjälper kommuner formulera kravspecifikationer för att säkerställa att Landvex passar upphandlingen

**Viktigt**
Fråga Dennis om det finns LOU-frågor. Felaktig rådgivning kan leda till att kommunen måste avbryta en upphandling.`,
      },
      {
        title: 'Immateriella rättigheter: patent, varumärke, upphovsrätt',
        duration: 5,
        content: `**Fyra typer av immateriella rättigheter**

**Patent**
Skyddar uppfinningar och tekniska lösningar.
• Kräver ansökan och godkännande
• Tidsbegränsat (20 år)
• Ger exklusiv rätt att kommersialisera uppfinningen
• Wavult har inga patent just nu men AI-algoritmerna kan bli patenterbara

**Varumärke**
Skyddar namn, logotyper och kännetecken.
• Registreras per klass och jurisdiktion
• QuiXzoom, Landvex, Wavult Group är skyddsvärda varumärken
• Dennis hanterar varumärkesregistrering

**Upphovsrätt**
Uppstår automatiskt vid skapande av kod, text, bilder.
• Ingen registrering krävs
• All kod Johan skriver ägs av Wavult Group (via anställningsavtal)
• Skyddstid: 70 år efter upphovsmannens död

**Trade secret**
Konfidentiell information som ger konkurrensfördel.
• Skyddas via sekretessavtal (NDA)
• Exempel: Landvex algoritmer, Zoomer-nätverksdata

**Wavults IP i Dubai**
All IP ägs centralt av holdingbolaget i Dubai. Dotterbolagen har licens att använda IP. Vid en exit säljs holdingen — med all IP.`,
      },
      {
        title: 'Due diligence och investerartermer',
        duration: 5,
        content: `**Due diligence**
Grundlig granskning som en investerare gör innan de investerar. Täcker: juridik, finans, teknik, team, marknad.
Wavult måste vara redo för due diligence — alla avtal klara, böcker i ordning.

**Term sheet**
Icke-bindande dokument som sammanfattar villkoren för en investering:
• Värdering (pre-money)
• Investeringsbelopp
• Typ av aktier (ordinary vs preferred)
• Styrelserepresentation
• Anti-dilution-klausuler

**Cap table (Capitalization table)**
Tabell som visar alla ägare och deras andelar. Inkluderar grundare, investerare, optionspool.
Winston och Dennis underhåller Wavults cap table.

**Dilution**
Se Kapitalstruktur-kursen. Varje ny aktieemission späder ut befintliga ägare.

**Pro rata**
Befintliga investerares rätt att delta i framtida investeringsrundor pro rata (i proportion till sin ägarandel) för att undvika dilution.

**Vesting och cliff**
Vesting: Grundare "tjänar ihop" sina aktier över tid (ex. 4 år).
Cliff: Ingen aktie innan ett minimum av tid (ex. 1 år) — skyddar mot att en grundare hoppar av tidigt.`,
      },
    ],
  },

  // ── Tech-termer för Icke-tekniker ───────────────────────────────────────────
  {
    id: 'tech-terms',
    title: 'Tech-termer för Icke-tekniker',
    description: 'API, cloud, databaser, CI/CD, säkerhetsbegrepp och skalbarhet — förklarat utan jargong.',
    icon: '💻',
    color: '#6366F1',
    lessons: [
      {
        title: 'API, REST och webhooks — vad det faktiskt är',
        duration: 5,
        content: `**API — Application Programming Interface**
En programmatisk ingångspunkt: ett sätt för ett program att prata med ett annat.
Tänk det som en meny på en restaurang — du vet vad du kan beställa, men behöver inte veta hur köket fungerar.

**REST-API**
REST = Representational State Transfer. En arkitekturstil för hur API:er byggs.
De flesta moderna API:er är REST-baserade. De använder HTTP-metoder:
• GET — hämta data
• POST — skapa ny data
• PUT/PATCH — uppdatera data
• DELETE — radera data

**Webhook**
"Ring mig när något händer."
Istället för att du frågar ett system varje sekund (polling) skickar systemet dig ett meddelande när något händer.
Exempel: Stripe skickar en webhook till vår server när en betalning lyckas → vi aktiverar kundkontot automatiskt.

**Varför Landvex kan integreras mot kommuner**
Kommuner har egna IT-system (trafikledning, fastighetshantering). Via API:er kan Landvex skicka larm direkt in i kommunens system — utan manuell hantering.`,
      },
      {
        title: 'Cloud och infrastruktur-begrepp',
        duration: 5,
        content: `**Server vs Cloud**
Traditionell server: en fysisk maskin du äger och underhåller.
Cloud: computing-kapacitet du hyr on-demand. Skalbart, flexibelt, ingen hårdvarukostnad.

**IaaS / PaaS / SaaS**
• IaaS (Infrastructure as a Service): Du hyr servrar och nätverk. Du installerar allt själv. (Ex: AWS EC2)
• PaaS (Platform as a Service): Plattform är förberedd, du deployer kod. (Ex: Heroku, Cloudflare Pages)
• SaaS (Software as a Service): Färdig applikation du prenumererar på. (Ex: Slack, Wavult OS)

**Container vs VM**
• VM (Virtual Machine): En hel dator i en dator. Tung att starta, isolerad.
• Container: Lättviktspaket med kod och dependencies. Startar på sekunder. (Docker)
Wavult kör allt i containers via AWS ECS.

**Serverless**
Kod som körs utan att du hanterar servrar. Betala per exekvering, inte per timme.
Vi använder serverless för enklare automatiseringsuppgifter.

**Region och Availability Zone**
• Region: Geografisk plats för datacenter (ex. eu-north-1 = Stockholm)
• Availability Zone: Separat datacenter inom en region. Vi kör i minst 2 AZ:er för redundans.`,
      },
      {
        title: 'Databas-begrepp: SQL, NoSQL, realtid',
        duration: 5,
        content: `**Relationsdatabas (SQL)**
Data lagras i tabeller med rader och kolumner — som ett Excel-ark, men kraftfullare.
Relationer mellan tabeller (ex. "Kund" kopplas till "Order").
SQL = Structured Query Language — språket för att hämta och manipulera data.

**NoSQL**
Icke-relationell databas. Data lagras som dokument, nyckel-värde-par eller grafer.
Flexibelt schema, snabbt för enkla queries. Bra för ostrukturerad data.

**SQL-frågor — det grundläggande**
SELECT * FROM kunder WHERE stad = "Stockholm" — hämta alla kunder i Stockholm.
INSERT, UPDATE, DELETE — skapa, uppdatera, radera data.

**Index**
En databas-index gör queries snabbare — som ett register i en bok.
Utan index måste databasen läsa varje rad. Med index hoppar den direkt till rätt ställe.

**Row Level Security (RLS)**
Säkerhetslager i databasen: du ser bara rader du har behörighet till.
Wavult använder RLS i Supabase — en kund ser bara sin egen data, aldrig andras.

**Realtidsprenumerationer**
Supabase kan skicka uppdateringar i realtid till klienten när data ändras — utan att klienten behöver fråga.`,
      },
      {
        title: 'CI/CD och DevOps för icke-tekniker',
        duration: 5,
        content: `**CI/CD — Continuous Integration / Continuous Deployment**
Automatiserad pipeline från kod till produktion. Minskar mänskliga fel och snabbar upp leverans.

**Vad som händer när Johan pushar kod**
1. Johan skriver kod, commitar och pushar till GitHub
2. GitHub Actions triggas automatiskt (CI-steget)
3. Automatiska tester körs — hittas fel: pipeline avbryts, Johan får notis
4. Koden byggs till en Docker-image
5. Image deployas till AWS ECS (CD-steget)
6. Health checks bekräftar att nya versionen fungerar
7. Gammal version ersätts med ny — utan driftstopp

**Health check**
Automatisk kontroll av att en tjänst fungerar. "Svarar du på /health? Bra. Svarar du inte? Starta om."

**Rollback**
Om en ny version har buggar kan vi snabbt byta tillbaka till föregående version. ECS-historik bevarar gamla versioner.

**Varför automatisering minskar mänskliga fel**
Manuell deployment kräver att rätt person gör rätt saker i rätt ordning. Automatisering gör samma sak varje gång — deterministiskt och reproducerbart.`,
      },
      {
        title: 'Säkerhetsbegrepp: JWT, HTTPS, 2FA, RLS',
        duration: 5,
        content: `**JWT — JSON Web Token**
En token som bevisar din identitet.
När du loggar in får du ett JWT. Det innehåller (krypterat): vem du är, vilka rättigheter du har, när token upphör.
Du skickar JWT med varje API-request — servern verifierar den utan att fråga databasen varje gång.

**HTTPS**
HTTP + kryptering (TLS).
All trafik mellan din browser och servern är krypterad. Ingen i mitten kan läsa vad som skickas.
Alla Wavults tjänster kör HTTPS. Aldrig HTTP i produktion.

**2FA — Tvåfaktorsautentisering**
Inloggning kräver två bevis på identitet:
• Något du vet (lösenord)
• Något du har (SMS-kod, autentisieringsapp, hardware-key)
Wavults admin-gränssnitt kräver 2FA för alla. Inga undantag.

**RLS — Row Level Security**
Databassäkerhet: varje rad i databasen är skyddad med regler.
Exempel: "En kund får bara se sina egna ärenden." Även om ett API-anrop försöker hämta annan kunds data — RLS blockerar det på databasnivå.`,
      },
      {
        title: 'Skalbarhet och prestanda',
        duration: 5,
        content: `**Skalbarhet**
Förmågan att hantera ökad belastning utan att systemet kraschar eller saktar ner.

**Horisontell skalning**
Lägg till fler servrar (instanser) för att fördela belastningen.
Wavult kör ECS-tjänster med auto-scaling: om CPU > 70% startar AWS automatiskt fler containrar.

**Vertikal skalning**
Uppgradera en server till kraftigare hårdvara (mer CPU, mer RAM).
Enkelt men har ett tak — du kan inte ha en oändligt stor server.

**Latency vs Throughput**
• Latency: Tid för en request att få svar (millisekunder). Låg latency = snabb respons.
• Throughput: Antal requests systemet kan hantera per sekund. Högt throughput = kapacitet.

**CDN — Content Delivery Network**
Distribuerar statiska filer (bilder, JS, CSS) från servrar nära slutanvändaren.
Wavult använder Cloudflare som CDN. En kund i Göteborg hämtar filer från Cloudflares Stockholm-nod, inte från vår origin-server.

**Caching**
Spara resultatet av en tung operation för att svara snabbt nästa gång.
Exempel: En databas-query som tar 200ms cachas i Redis — nästa anrop svarar på 1ms.

**Wavults arkitektur och 100x-design**
Vi designar för att klara 100x mer trafik utan ombyggnad. Det kostar lite mer nu men undviker katastrofala omskrivningar när vi växer.`,
      },
    ],
  },

  // ── Code of Conduct & Företagspolicies ─────────────────────────────────────
  {
    id: 'code-of-conduct',
    title: 'Code of Conduct & Företagspolicies',
    description: 'Beteendekod, kommunikationspolicy, GDPR i vardagen, expenses, intressekonflikt och IP-äganderätt.',
    icon: '🏛️',
    color: '#DC2626',
    lessons: [
      {
        title: 'Code of Conduct — Wavults beteendekod',
        duration: 5,
        content: `**Varför det finns**
En Code of Conduct (CoC) sätter tydliga förväntningar på beteende. Det skyddar individer, bolaget och kulturen.

**Vad det täcker**
• Respekt: Behandla alla kollegor, kunder och partners med respekt oavsett bakgrund, roll eller åsikt
• Ärlighet: Kommunicera sanningsenligt. Inga dolda agendor, inga halvsanningar.
• Ägandeskap: Ta ansvar för dina uppgifter. Inga fingerpekar, inga bortförklaringar.

**Vad som är oacceptabelt**
• Diskriminering baserad på kön, etnicitet, religion, sexuell läggning, ålder eller funktionsförmåga
• Trakasserier (inklusive subtil underminerande av kollegor)
• Oärlighet mot kunder, partners eller kollegor
• Missbruk av bolagets resurser (tid, pengar, data)

**Rapporteringsvägar**
Upplever du brott mot CoC: rapportera till Erik eller Dennis direkt. Anonymitet respekteras i möjligaste mån.

**Konsekvenser**
Varning → formell reprimand → avslutad samarbetsrelation. Allvarliga brott (diskriminering, bedrägeri) leder till omedelbar avslutning.`,
      },
      {
        title: 'Kommunikationspolicy — vem pratar med vem',
        duration: 4,
        content: `**Intern kommunikation**
Fritt och öppet — men respektfullt. Telegram för löpande dialog, Wavult OS för strukturerad information.

**Extern kommunikation**
Mer reglerad. Wavult Group kommunicerar med en röst utåt.

**Vem får uttala sig till media?**
Bara Erik. Ingen annan i teamet pratar med journalister, podcasts, branschmedia eller investerare utan Eriks explicita godkännande.

**Social media-regler för anställda**
• OK: Dela generell kunskap om branschen, din yrkesroll, din personliga utveckling
• OK: Nämna att du jobbar på Wavult/QuiXzoom/Landvex
• INTE OK: Dela icke-offentlig information om produkter, kunder eller strategi
• INTE OK: Kritisera bolaget, kollegor eller kunder offentligt

**Vad man inte delar offentligt om Wavult**
• Finansiell information
• Pågående upphandlingar eller partnerskapsförhandlingar
• Intern strategi eller produktroadmap
• Information om team-konflikter eller interna processer`,
      },
      {
        title: 'Dataskydd i vardagen — praktisk GDPR',
        duration: 5,
        content: `**GDPR i din vardag**
GDPR är inte bara ett juridiskt dokument — det påverkar hur vi hanterar information varje dag.

**Vad du INTE skickar på Telegram**
• Lösenord eller access tokens (använd Wavult OS Secrets-modulen)
• Kunddata (namn + e-post + telefon = personuppgifter)
• Känslig intern information som kan identifiera individer

**Vad som kräver kryptering**
• Filer med personuppgifter (zoomer-data, kundregister) ska krypteras vid överföring och lagring
• E-postbilagor med personuppgifter ska skickas krypterat eller via säker delning

**Clean desk policy för remote work**
• Lämna inte känsliga dokument synliga på skärmen om du sitter på offentlig plats
• Använd VPN vid arbete på okänt nätverk
• Lås skärmen när du lämnar datorn (Windows: Win+L, Mac: Cmd+Ctrl+Q)

**Hur man hanterar en dataincidens**
Om du misstänker att personuppgifter har läckt eller kommit åt av obehörig:
1. Meddela Dennis och Erik OMEDELBART
2. Dokumentera: vad hände, när, vilken data
3. Dennis hanterar rapportering till Datainspektionen (krav inom 72 timmar)`,
      },
      {
        title: 'Travel & Expense Policy',
        duration: 4,
        content: `**Vad som ersätts**
• Flygbiljetter: Economy class. Business kräver L2-godkännande.
• Hotell: Rimlig standard (max 1 500 SEK/natt i Stockholm, 2 500 SEK i internationella städer)
• Måltider: Max 500 SEK/dag vid tjänsteresa (frukost ingår normalt i hotell)
• Transport: Taxi/Uber vid sen ankomst eller tung packning. Annars kollektivtrafik.

**Vad som INTE ersätts**
• Alkohol (oavsett om det är på middag med kund)
• Personliga shopping under resa
• Uppgradering av flyg eller hotell utan godkännande
• Familjemedlemmars kostnader

**Godkännandeprocess**
• Under 1 000 SEK (L1): Godkänn själv, dokumentera med kvitto
• 1 000 – 10 000 SEK (L2): Godkänns av Leon eller Dennis
• Över 10 000 SEK (L3): Kräver Eriks godkännande

**Kvitto är obligatoriskt**
Inga kvitton = ingen ersättning. Ladda upp kvitton i Finance-modulen under Expenses samma dag.

**Rapportering till Winston**
Winston sammanställer expenses månadsvis och stämmer av mot budget.`,
      },
      {
        title: 'Intressekonflikt och sidointressen',
        duration: 4,
        content: `**Vad är en intressekonflikt?**
En situation där dina privata intressen kan påverka (eller verka påverka) dina beslut i Wavult Group.

**Vad som ska deklareras**
• Ägande eller styrelsepost i ett bolag som är kund, leverantör eller konkurrent till Wavult
• Familjemedlem med affärsrelation till Wavult
• Personlig vinning av ett beslut du är involverad i på Wavult

**Ingen konkurrens utan godkännande**
Du får inte driva eller ha substantiellt ägande i ett bolag som konkurrerar med QuiXzoom, Landvex eller Quixom Ads — utan Eriks skriftliga godkännande.

**Vad som händer vid ej deklarerad konflikt**
Om en odeklarerad intressekonflikt upptäcks: formell varning. Vid allvarliga fall (finansiell skada för Wavult): omedelbar avslutning och potentiellt skadeståndskrav.

**Hur man anmäler**
Kontakta Dennis skriftligt (e-post). Beskriv situationen neutralt. Dennis bedömer om det är en intressekonflikt och hur den hanteras.`,
      },
      {
        title: 'IP och äganderätt till arbete',
        duration: 5,
        content: `**Grundregeln**
Allt du skapar i Wavults tjänst ägs av Wavult Group — via holding-bolaget i Dubai. Det gäller kod, design, affärsidéer, dokument och processer.

**Vad som regleras i ditt avtal**
Ditt anställnings- eller konsultavtal innehåller en IP-klausul som bekräftar att allt du producerar för Wavult ägs av Wavult. Läs den.

**Vad som gäller för sidoprojekt**
• Sidoprojekt som INTE konkurrerar med Wavult och som görs på din fritid med egna resurser: du äger det
• Sidoprojekt som är relaterade till Wavults verksamhetsområde: deklarera till Erik och Dennis innan du börjar
• Om du använder Wavults resurser (tid, AWS, kod, data) för sidoprojekt: Wavult äger resultatet

**Hur open source-bidrag hanteras**
Om du vill bidra till ett open source-projekt med kod du skrivit för Wavult: be om skriftligt godkännande från Erik.
Bidrag till open source-projekt med din privata kod (ej relaterad till Wavult): fritt.

**Varför Dubai-holdingen äger all IP**
Vid en framtida exit (försäljning av bolaget) säljs holdingen med all IP. Det maximerar värdet och förenklar strukturen för köparen.`,
      },
    ],
  },

  // ── Varumärkesguide & Kommunikation ────────────────────────────────────────
  {
    id: 'brand-guide',
    title: 'Varumärkesguide & Kommunikation',
    description: 'Varumärkeshierarki, ton och identitet för QuiXzoom och Landvex, förbjudna fraser och kommunikationsstandard.',
    icon: '🎨',
    color: '#F97316',
    lessons: [
      {
        title: 'Wavult Groups varumärkeshierarki',
        duration: 4,
        content: `**Fyra separata varumärken — ett holding**

**Wavult Group**
Holding-entiteten. Kommunicerar B-to-investor (investerare, styrelsemedlemmar, media om struktur).
Ton: professionell, strategisk, koncis. Inte konsumentvänlig.

**QuiXzoom**
B2C-produkten. Kommunicerar direkt med Zoomers och potentiella Zoomers.
Ton: ung, fri, lite rebellisk, visuell.

**Landvex**
Enterprise B2G-produkten. Kommunicerar med kommuner och offentliga aktörer.
Ton: kompetent, metodisk, seriös, lösningsorienterad.

**Quixom Ads**
B2B-dataplattformen. Kommunicerar med annonsörer och dataköpare.
Ton: analytisk, affärsmässig, datadrivet.

**Varför de aldrig blandas**
Varje varumärke talar till en specifik målgrupp med specifika behov. En Zoomer responderar inte på Landvex-ton. En kommuntjänsteman responderar inte på QuiXzoom-ton. Blandning skadar båda.

**Regel**
Fråga alltid: "Vilket varumärke är det här?" och kommunicera konsekvent under det varumärket.`,
      },
      {
        title: 'QuiXzoom — ton och identitet',
        duration: 5,
        content: `**QuiXzoom-identiteten**
"Uber Eats möter ett socialt uppdrag." Frihet, rörlighet, tjäna pengar med din smartphone.

**Ton**
• Ung och energisk — men inte barnslig
• Lite rebellisk — du äger din tid, du bestämmer när du jobbar
• Direkt — inga långa meningar, ingen corporate-speak
• Visuell — bilder och video berättar historien bättre än text

**Aldrig "fotografer" — alltid "Zoomers"**
"Fotografer" låter som ett yrke som kräver utbildning. "Zoomers" är vem som helst med en smartphone och driv. Viktig distinktion — använd konsekvent.

**Taglines**
• "See the world. Get paid."
• "Your lens. Your rules. Your income."
• "Every street is a job opportunity."

**Förbjudet i QuiXzoom-kommunikation**
• "Fotograferingsuppdrag" (for formellt)
• "AI-övervakningssystem" (skrämmer bort Zoomers)
• Bilderna kallas "foto-data" internt men "uppdrag" externt
• Aldrig omnämna kopplingen till Landvex (B2G-sidan ska hållas separat)`,
      },
      {
        title: 'Landvex — ton och identitet',
        duration: 5,
        content: `**Landvex-identiteten**
En lösning för offentliga aktörer som vill ha rätt information vid rätt tidpunkt — till rätt kostnad.

**Ton**
• Kompetent — vi förstår kommuners utmaningar
• Metodisk — vi har en beprövad process
• B2G-seriös — kommunala beslutsfattare vill ha fakta, inte hype
• Lösningsorienterad — fokus på problem vi löser, inte tekniken i sig

**Aldrig "AI-övervakning" — alternativ**
• "Optisk analys"
• "Händelsebaserade larm"
• "Automatisk tillståndskontroll"
AI-övervakning väcker GDPR-farhågor och politisk motreaktion. Fokusera på vad systemet GÖR, inte hur.

**Kärnbudskapet**
"Right control. Right cost. Right interval."
Kommuner betalar i dag för antingen för lite tillsyn (incidenter händer) eller för mycket (dyr personal på plats hela tiden). Landvex hittar optimum.

**Vad kommuner vill höra**
• Kostnadsbesparingar i kronor och ören
• Minskad personalbörda
• Compliance med tillsynskrav
• Inga tekniska buzzwords — tala kommunalt`,
      },
      {
        title: 'Förbjudna ord och fraser (hela bolaget)',
        duration: 4,
        content: `**Ord och fraser vi ALDRIG använder**

• "AI-driven" eller "AI-powered" — Det är tomt. Beskriv istället vad AI:n faktiskt gör.
  Istället: "Systemet identifierar automatiskt avvikelser i realtid"

• "Fotografer" eller "fältpersonal" — Se QuiXzoom-lektionen. Alltid "Zoomers".

• "Disruptivt" eller "game-changer" — Alla säger det, ingen tror det. Visa istället konkreta resultat.
  Istället: "Kommuner i piloten sparade i snitt 40% på tillsynskostnader"

• "Vi är glada att kunna meddela" — Passivt och byråkratiskt. Säg bara vad det är.
  Istället: "QuiXzoom lanseras i Sverige 15 juni."

• "Lösung" (på svenska: solution) som substantiv — "Vi levererar en lösning" säger ingenting.
  Istället: Beskriv exakt vad du levererar.

**Varför konkret alltid slår abstrakt**
Abstrakta påståenden ("vi är bäst", "vi är unika") är obevisade. Konkreta påståenden ("50% kostnadsminskning i 3 kommuner") är trovärdiga och minnesvärda.

**Regel**
Om du kan ersätta en mening med ett konkret faktum — gör det.`,
      },
      {
        title: 'E-postkommunikation — professionell standard',
        duration: 5,
        content: `**Ämnesrad-formeln**
[Bolag/Projekt] — [Vad gäller det] — [Eventuell deadline]
Exempel: "Landvex — Offertförfrågan Nacka Kommun — Svar önskas 30 mars"

**Cold e-post: max 4 meningar**
1. Vem du är och varför du skriver
2. Problemet du löser (ur mottagarens perspektiv)
3. Hur du löser det
4. En tydlig call-to-action ("Har du 20 minuter för ett samtal nästa vecka?")

**Hur man följer upp**
Om inget svar efter 5 dagar: ett kort follow-up-mail. Lägg till nytt värde — en fallstudie, en ny insikt.
Aldrig: "Bara kollar om du fick mitt förra mail." Det är irriterande.

**Signatur-standard**
[Namn]
[Roll], [Bolag]
[Direktnummer]
[E-postadress]
Inget mer. Inga citat, inga långa signaturer.

**Vad som aldrig skickas i e-post**
• Lösenord eller access tokens — använd Secrets-modulen
• Personnummer eller känsliga personuppgifter — använd krypterad kanal
• Konfidentiella avtalstexter till externa parter utan Denniss godkännande`,
      },
      {
        title: 'Social media och extern närvaro',
        duration: 4,
        content: `**LinkedIn — Wavult Group-perspektiv**
Primär kanal för B2B och investerarkommunikation.
• Posta om: milstolpar (lansering, nya kunder), insikter från branschen, teamets expertis
• Ton: professionell, strategisk, trovärdig
• Frekvens: 1-2 inlägg per vecka från bolagssidan
• Erik är primär röst — personliga inlägg från Erik > bolagsposter

**Instagram/TikTok — QuiXzoom**
Primär kanal för Zoomer-rekrytering och varumärkesbyggande.
• Innehåll: visuellt, autentiskt, behind-the-scenes, Zoomer-stories
• Ton: energisk, fri, inspirerande
• Format: Reels och Stories dominerar, statiska bilder som komplement

**Vad anställda får posta om Wavult**
• Din personliga erfarenhet och tillväxt i rollen
• Generella insikter från arbete i ett startup
• Glädjeämnen och milstolpar (efter att de offentliggjorts officiellt)

**Vad anställda INTE får posta**
• Finansiell information
• Produktplaner som ej offentliggjorts
• Information om pågående förhandlingar

**Hur man hanterar negativa kommentarer**
Svara aldrig defensivt offentligt. Om det är en legitim klagomål: "Tack för din feedback, kontakta oss på [e-post] så hjälper vi dig." Eskalera sedan internt.`,
      },
    ],
  },
]

type ProgressMap = Record<string, number> // courseId → lessons completed

function getProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem('wavult_academy_progress_v2') ?? '{}')
  } catch {
    return {}
  }
}

function saveProgress(p: ProgressMap) {
  localStorage.setItem('wavult_academy_progress_v2', JSON.stringify(p))
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function LessonModal({ course, lessonIndex, progress, onUpdate, onClose }: {
  course: Course
  lessonIndex: number
  progress: number
  onUpdate: (lessons: number) => void
  onClose: () => void
}) {
  const [currentLesson, setCurrentLesson] = useState(lessonIndex)
  const lesson = course.lessons[currentLesson]
  const isCompleted = currentLesson < progress
  const isNextUp = currentLesson === progress

  function markAndNext() {
    const newProgress = Math.max(progress, currentLesson + 1)
    onUpdate(newProgress)
    if (currentLesson < course.lessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white border border-surface-border rounded-xl w-full max-w-2xl mx-4 flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{course.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-mono uppercase">{course.title}</p>
              <h2 className="text-sm font-semibold text-gray-900">{lesson.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {/* Lesson selector */}
          <div className="flex gap-1.5 flex-wrap">
            {course.lessons.map((l, i) => (
              <button
                key={i}
                onClick={() => setCurrentLesson(i)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  i === currentLesson
                    ? 'text-gray-900'
                    : i < progress
                    ? 'text-green-500 bg-green-500/10'
                    : 'text-gray-500 bg-white/[0.03] hover:text-gray-500'
                }`}
                style={i === currentLesson ? { background: course.color + '25', color: course.color } : {}}
              >
                {i < progress ? '✓' : i + 1}. {l.title.length > 20 ? l.title.slice(0, 18) + '…' : l.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: course.color + '20', color: course.color }}
            >
              Lektion {currentLesson + 1} av {course.lessons.length}
            </div>
            <span className="text-xs text-gray-500 font-mono">~{lesson.duration} min</span>
            {isCompleted && (
              <span className="text-xs text-green-500 font-mono ml-auto">✓ Avklarad</span>
            )}
          </div>

          {/* Lesson text rendered */}
          <div className="space-y-2">
            {lesson.content.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <h3 key={i} className="text-sm font-semibold text-gray-900 mt-4 mb-1">
                    {line.replace(/\*\*/g, '')}
                  </h3>
                )
              }
              if (line.startsWith('• ')) {
                return (
                  <div key={i} className="flex gap-2 text-xs text-gray-600 leading-relaxed pl-2">
                    <span className="text-gray-500 flex-shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900">$1</strong>') }} />
                  </div>
                )
              }
              if (line.trim() === '') return <div key={i} className="h-1.5" />
              return (
                <p key={i} className="text-xs text-gray-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900">$1</strong>') }}
                />
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <ProgressBar value={progress} max={course.lessons.length} color={course.color} />
          <p className="text-xs text-gray-500 font-mono mt-1 mb-3">
            {progress}/{course.lessons.length} lektioner avklarade
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentLesson(Math.max(0, currentLesson - 1))}
              disabled={currentLesson === 0}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-surface-border hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Föregående
            </button>

            <div className="flex-1" />

            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-surface-border hover:text-gray-600 transition-colors">
              Stäng
            </button>

            {currentLesson < course.lessons.length - 1 ? (
              <button
                onClick={markAndNext}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-900 transition-colors"
                style={{ background: course.color }}
              >
                {isCompleted || isNextUp ? 'Markera & Nästa →' : 'Nästa →'}
              </button>
            ) : (
              <button
                onClick={() => {
                  onUpdate(Math.max(progress, currentLesson + 1))
                  onClose()
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-900 transition-colors"
                style={{ background: '#10B981' }}
              >
                🎓 Avsluta kurs
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Rekommenderad kursordning för nybörjare — visas tills 2 kurser är klara
const ONBOARDING_ORDER: { courseId: string; reason: string }[] = [
  { courseId: 'dag-1', reason: 'Börja här — 12 min' },
  { courseId: 'wavult-os', reason: 'Förstå verktyget du jobbar i' },
  { courseId: 'quixzoom', reason: 'Kärnprodukten — 7 lektioner' },
  { courseId: 'landvex', reason: 'B2G-armen och intäktsmodellen' },
  { courseId: 'dubai', reason: 'Juridisk struktur och skatteoptimering' },
  { courseId: 'finance', reason: 'Ekonomimodell och cashflow' },
  { courseId: 'salj-gtm', reason: 'Sälj, pitch och demo-flödet' },
  { courseId: 'compliance', reason: 'GDPR, LOU och dataskydd' },
  { courseId: 'techstack', reason: 'n8n, Docker, GitHub och mer' },
]

export function AcademyView() {
  const { t: _t } = useTranslation() // ready for i18n
  const [progress, setProgress] = useState<ProgressMap>(getProgress)
  const [openCourse, setOpenCourse] = useState<{ course: Course; lesson: number } | null>(null)

  const totalLessons = COURSES.reduce((sum, c) => sum + c.lessons.length, 0)
  const completedLessons = COURSES.reduce((sum, c) => sum + Math.min(progress[c.id] ?? 0, c.lessons.length), 0)
  const overallPct = Math.round((completedLessons / totalLessons) * 100)
  const completedCourses = COURSES.filter(c => (progress[c.id] ?? 0) >= c.lessons.length).length

  // Visa onboarding-guide tills minst 2 kurser är avklarade
  const showOnboarding = completedCourses < 2

  function handleUpdate(courseId: string, lessons: number) {
    const next = { ...progress, [courseId]: lessons }
    setProgress(next)
    saveProgress(next)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Onboarding "Var börjar jag?" — visas tills 2 kurser är klara */}
      {showOnboarding && (
        <div className="mb-4 bg-white border border-brand-accent/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🧭</span>
            <h3 className="text-sm font-semibold text-gray-900">Ny här? Börja i den här ordningen</h3>
            <span className="ml-auto text-xs text-gray-500 font-mono">Försvinner när 2 kurser är klara</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_ORDER.map((item, idx) => {
              const course = COURSES.find(c => c.id === item.courseId)
              if (!course) return null
              const done = (progress[course.id] ?? 0) >= course.lessons.length
              return (
                <button
                  key={item.courseId}
                  onClick={() => {
                    const nextLesson = Math.min(progress[course.id] ?? 0, course.lessons.length - 1)
                    setOpenCourse({ course, lesson: nextLesson })
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    done
                      ? 'border-green-500/20 bg-green-500/5 text-green-400'
                      : 'border-brand-accent/20 bg-brand-accent/5 text-gray-600 hover:text-gray-900 hover:border-brand-accent/40'
                  }`}
                >
                  <span className="font-mono text-gray-500">{idx + 1}.</span>
                  <span>{course.icon}</span>
                  <span>{course.title}</span>
                  {done && <span className="text-green-500">✓</span>}
                  {!done && <span className="text-gray-500 text-xs">— {item.reason}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-xs text-gray-500 font-mono mb-1">TOTAL PROGRESS</p>
          <p className="text-2xl font-bold text-gray-900">{overallPct}%</p>
          <div className="mt-2">
            <ProgressBar value={completedLessons} max={totalLessons} color="#8B5CF6" />
          </div>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-xs text-gray-500 font-mono mb-1">KURSER KLARA</p>
          <p className="text-2xl font-bold text-gray-900">
            {COURSES.filter(c => (progress[c.id] ?? 0) >= c.lessons.length).length}
            <span className="text-base text-gray-500">/{COURSES.length}</span>
          </p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-xs text-gray-500 font-mono mb-1">LEKTIONER KLARA</p>
          <p className="text-2xl font-bold text-gray-900">
            {completedLessons}
            <span className="text-base text-gray-500">/{totalLessons}</span>
          </p>
        </div>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 overflow-y-auto">
        {COURSES.map(course => {
          const done = progress[course.id] ?? 0
          const total = course.lessons.length
          const pct = Math.round((done / total) * 100)
          const isComplete = done >= total
          const nextLessonIndex = Math.min(done, total - 1)

          return (
            <button
              key={course.id}
              onClick={() => setOpenCourse({ course, lesson: nextLessonIndex })}
              className="text-left p-5 bg-white border border-surface-border rounded-xl hover:border-gray-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{course.icon}</span>
                <div className="flex flex-col items-end gap-1">
                  {isComplete && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-mono border border-green-500/20">
                      ✓ Klar
                    </span>
                  )}
                  {!isComplete && done > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-mono"
                      style={{ background: course.color + '15', color: course.color, border: `1px solid ${course.color}30` }}
                    >
                      {pct}%
                    </span>
                  )}
                  <span className="text-xs text-gray-600 font-mono">
                    {total} lektioner
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-brand-accent transition-colors">
                {course.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{course.description}</p>

              {/* Next lesson preview */}
              {!isComplete && (
                <div
                  className="text-xs font-mono px-2 py-1 rounded mb-3 text-left truncate"
                  style={{ background: course.color + '10', color: course.color + 'cc' }}
                >
                  ▶ {course.lessons[nextLessonIndex]?.title}
                </div>
              )}

              <div className="space-y-2">
                <ProgressBar value={done} max={total} color={course.color} />
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">{done}/{total} lektioner</span>
                  <span className="text-gray-500">
                    ~{course.lessons.reduce((s, l) => s + l.duration, 0)} min totalt
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {openCourse && (
        <LessonModal
          course={openCourse.course}
          lessonIndex={openCourse.lesson}
          progress={progress[openCourse.course.id] ?? 0}
          onUpdate={n => handleUpdate(openCourse.course.id, n)}
          onClose={() => setOpenCourse(null)}
        />
      )}
    </div>
  )
}
