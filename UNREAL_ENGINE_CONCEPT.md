# Unreal Engine 5 × pixdrift — Konceptdokument & Teknisk Specifikation

> **Version:** 1.0  
> **Datum:** 2026-03-21  
> **Status:** Strategisk konceptfas  
> **Målgrupp:** Grundare, CTO, investerare, enterprise-kunder

---

## Executive Summary

pixdrift är idag ett kraftfullt OMS-system — men ett som användare *läser och klickar* i. Unreal Engine 5 öppnar dörren till ett OMS-system som användare *upplever och minns*. Ingen aktör i OMS-segmentet har gjort detta. Det är ett vitfält.

De tre mest lovande tillämpningarna, i prioritetsordning:

1. **Interaktiv Produktdemo via Pixel Streaming** — konverteringsverktyg, låg risk, hög ROI
2. **3D Training Simulations** — inlärning som fastnar, mätbar effekt, premium-differentiering
3. **Real-time Data Visualization** — "Bloomberg Terminal i 3D" för enterprise C-suite

Total investering för komplett implementation: **~105 000 SEK** fördelat på 6 månader.  
Beräknad effekt: **4× konverteringsökning på demos**, **40% kortare onboarding**, **30-50% premium-prissättning** för immersive enterprise-tier.

---

## DEL 1: Möjlighetsanalys

### Prioriteringsmatris

| Use Case | Affärsvärde | Teknisk Risk | Time-to-Demo | Prioritet |
|---|---|---|---|---|
| 1.6 Interaktiv Produktdemo | ★★★★★ | Låg | 4 veckor | **#1** |
| 1.1 Training Simulations | ★★★★★ | Medel | 2 månader | **#2** |
| 1.3 Data Visualization | ★★★★☆ | Medel | 3 månader | **#3** |
| 1.2 Digital Twin | ★★★★☆ | Hög | 4 månader | #4 |
| 1.4 Gamifierad Onboarding | ★★★☆☆ | Medel | 3 månader | #5 |
| 1.5 VR/AR Fältarbete | ★★★★☆ | Hög | 6+ månader | #6 |

---

### 1.1 Pixel Streaming — Interaktiva 3D-utbildningssimulationer

**Koncept:** UE5 körs på en AWS GPU-instans och streamar interaktiv 3D-miljö direkt till användarens webbläsare via WebRTC. Noll installation. Noll plugins. Bara en länk.

**Konkret use case:** *"Lär dig hantera en kundreklamation"*
- Användaren kliver in i en virtuell kontorsmiljö
- En MetaHuman-karaktär spelar en missnöjd kund
- Användaren navigerar pixdrifts Process-modul i realtid inom simulationen
- Simulation avslutas med score + rekommenderade förbättringsområden

**Teknisk stack:**
```
UE5 5.4+ 
  → Pixel Streaming Plugin (inbyggt, gratis)
  → AWS EC2 g4dn.xlarge (NVIDIA T4 GPU)
  → CloudFront WebSocket distribution
  → Embed i pixdrift-appen via iframe
```

**Kostnadskalkyl (detaljerad):**
```
Development:        200–400h @ AI-assisterad takt
AWS per session:    $0.52/h (g4dn.xlarge on-demand)
                    $0.16/h (spot instance — 70% besparing)

Per 30-min session:
  EC2 on-demand:    $0.26
  Nätverkstrafik:   ~$0.05
  Total:            ~$0.31/session

50 concurrent users:
  On-demand:        $26/h
  Spot instances:   $8/h (rekommenderat för träning, ej prod-demo)

Månadsbudget scenario (100 sessions/mån):
  EC2:              ~$31
  CloudFront:       ~$10
  Övrigt:           ~$10
  Total:            ~$51/månad för 100 sessioner
```

**Besparingstrick:**
- **Spot instances** för icke-kritiska träningssessioner (–70%)
- **Schemalagd start/stopp**: AMI pre-warms under kontorstid, stänger 18:00
- **Hibernate-state**: Spara GPU-state, snabb återuppstart (< 30 sek)
- **Reserved instances**: 1-årsreservation ger 40% rabatt vid känd volym

---

### 1.2 Digital Twin — Arbetsplatsvisualisering

**Koncept:** En levande 3D-kopia av organisationens operationsflöde. Data från pixdrift API pumpas in i realtid och visualiseras som rörliga objekt, flöden och tillstånd.

**Use cases:**
- Operations Manager ser i realtid var flaskhalsar uppstår i ett team
- CEO flyger in i en miniaturversion av sin organisation
- "Varför levererar Team Nord sämre?" → Zooma in, se kapacitetsproblem

**Datakällor från pixdrift:**
```
GET /api/executions     → Aktiva ärenden (visualiseras som "paket" i pipeline)
GET /api/capabilities   → Teammedlemmars belastning (sfärstorlek)
GET /api/processes      → Processsteg (noder i ett flödesdiagram)
GET /api/currency       → Ekonomisk throughput (flödesanimation)
```

**Realtidsuppdatering:** WebSocket-prenumeration mot pixdrift API → UE5 Web Remote Control Plugin → Blueprint-triggers för animation.

**Bedömning:** Högt wow-värde, men kräver noggrann datamodellering. Rekommenderas som Fas 3-feature efter att Pixel Streaming infrastruktur är på plats.

---

### 1.3 Immersiv Data Visualization

**Koncept:** Istället för platta 2D-grafer — flyg igenom din pipeline som ett levande landskap. Inspirerat av Bloomberg Terminal, men i tre dimensioner.

**Specifika visualiseringar:**

| Data | 3D-representation | Interaktion |
|---|---|---|
| Deal Pipeline | Kolonner per fas, höjd = SEK-värde | Klicka kolumn → deal-detaljer |
| Team Capacity | Sfärer per person, diameter = workload% | Hover → tilldelade ärenden |
| Risk Matrix | Terrängkarta, höjd = allvarlighetsgrad | Flygvy + zoom |
| Cash Flow | Partikelsystem, flödesriktning = in/ut | Tidssläpning med scrubber |
| KPI Trends | Arkitektonisk skyline, byggnader = KPIs | Klicka byggnad → historik |

**Teknik:**
- UE5 Niagara Particle System för kassaflödesanimation
- Procedural Mesh Component för dynamisk terrängkarta
- UMG (Unreal Motion Graphics) för tooltip-overlay
- Web Remote Control Plugin för datainmatning

---

### 1.4 Gamifierad Onboarding

**Koncept:** Ny anställd navigerar en 3D-värld för att "låsa upp" pixdrift-moduler. Psykologin: Completion bias + belöningssystem ökar fullföljningsgraden dramatiskt.

**Spelmekanik kopplad till pixdrift:**
```
Quest: "Din första deal"
  Trigger:  Ny användare skapad i systemet
  Steg 1:   Navigera till Execution-modulen i 3D-världen
  Steg 2:   Skapa en deal (faktisk data i pixdrift)
  Steg 3:   Flytta deal till nästa fas
  Belöning: XP + "Deal Maker" badge i Capability-modulen
  
Quest: "Process-mästare"  
  Krav:     Slutföra 5 ärenden enligt process
  Belöning: Unlock av avancerade rapportfunktioner
```

**XP-integration:**
```
POST /api/capabilities/badges
{
  "user_id": "...",
  "badge": "first_deal",
  "xp": 100,
  "unlocked_at": "2026-03-21T..."
}
```

**Trofé-rum:** 3D-galleri med lagets samlade prestationer — synligt för hela teamet. Socialt bevis + motivation.

---

### 1.5 VR/AR för Fältarbete

**Koncept:** För industriella pixdrift-kunder (service, installation, underhåll) — AR-overlay direkt på verklig utrustning. Montören ser instruktioner, checklistor och pixdrift-ärenden utan att ta fram mobilen.

**Target hardware:**
- **Microsoft HoloLens 2** — enterprise, hands-free, produktionsmiljö
- **Meta Quest 3** — konsumentvänlig, Mixed Reality, lägre kostnad
- **Apple Vision Pro** — premium, kräver UE5 visionOS-plugin (2025)

**Pixdrift Process-integration:**
```
Scenario: Servicetekniker på plats
1. Skannar QR-kod på maskin → öppnar AR-session
2. HoloLens visar:
   - Aktuellt pixdrift-ärende för maskinen
   - Steg-för-steg Playbook i AR-overlay
   - Checklistor med handsigns-interaktion
3. Tekniker slutför steg → POST /api/processes/complete
4. Ärendet uppdateras i realtid i pixdrift
```

**Bedömning:** Enorm potential men hög teknisk komplexitet. Kräver UE5 OpenXR-integration och device-specifik optimering. Rekommenderas som Fas 4+ eller separat produktspår.

---

### 1.6 Interaktiva Produktdemos (Prioritet #1)

**Koncept:** Potentiella kunder besöker pixdrift.com, klickar "Se en demo" och kliver in i ett fiktivt företag — Novacode AB — och upplever pixdrift live utan säljmöte.

**Flöde:**
```
1. Besökare på pixdrift.com/demo
2. Fyller i namn + email (lead capture)
3. Pixel Streaming-session startar (< 10 sek)
4. Välkomnas av MetaHuman-guide: "Välkommen till Novacode AB"
5. Guidat walk-through av pixdrift-modulerna i 3D
6. Interaktiv — kan testa skapa deals, köra rapporter
7. Session avslutas: "Vill du se detta med din data?" → Sales CTA
```

**Konverteringslogik:**
- Traditionell video-demo: 2% konvertering (passiv)
- Interaktiv demo: 6-10% konvertering (branschdata från Gartner/Forrester)
- Pixdrift unik edge: Demo *är* produkten, inte en film om produkten

**Lead-data:**
```javascript
// Skickas till pixdrift CRM vid sessionsslut
POST /api/leads {
  "email": "...",
  "session_duration": 420,
  "modules_explored": ["execution", "reports"],
  "interactions": 47,
  "score": "high_intent"
}
```

---

## DEL 2: Teknisk Arkitektur

### Prioritet 1: Pixel Streaming Interactive Demo

#### Komplett Systemarkitektur

```
┌─────────────────────────────────────────────────────────┐
│                    KLIENTLAGER                           │
│   Browser (Chrome/Edge/Safari) → iframe på pixdrift.com  │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS + WebSocket
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   AWS EDGE-LAGER                         │
│   CloudFront Distribution                                │
│   ├── HTTP → S3 (statiska assets, loading screen)       │
│   └── WebSocket → Application Load Balancer             │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket
                      ▼
┌─────────────────────────────────────────────────────────┐
│               MATCHMAKER-LAGER (EC2 t3.small)           │
│   Node.js Matchmaker Server                              │
│   ├── Tar emot sessionsförfrågan                        │
│   ├── Allokerar tillgänglig GPU-instans                 │
│   ├── Returnerar Signal Server endpoint                  │
│   └── Health-checkar GPU-pool                           │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐
│  GPU Instance 1 │     │  GPU Instance 2 │  ... (auto-scale)
│  EC2 g4dn.xlarge│     │  EC2 g4dn.xlarge│
│                 │     │                 │
│  ┌───────────┐  │     │  ┌───────────┐  │
│  │ UE5 App   │  │     │  │ UE5 App   │  │
│  │ Pixel     │  │     │  │ Pixel     │  │
│  │ Streaming │  │     │  │ Streaming │  │
│  │ Plugin    │  │     │  │ Plugin    │  │
│  └───────────┘  │     │  └───────────┘  │
│  ┌───────────┐  │     │                 │
│  │ Signaling │  │     │                 │
│  │ Server    │  │     │                 │
│  └───────────┘  │     │                 │
│  ┌───────────┐  │     │                 │
│  │ TURN      │  │     │                 │
│  │ (Coturn)  │  │     │                 │
│  └───────────┘  │     │                 │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│            pixdrift API                  │
│   GET /api/demo/company/novacode-ab     │
│   POST /api/leads                       │
│   GET /api/processes                    │
└─────────────────────────────────────────┘
```

#### AWS-resurser (detaljerad spec)

```yaml
# EC2 GPU Instances
Type: g4dn.xlarge
GPU: NVIDIA T4 (16GB GDDR6)
CPU: 4 vCPU (Intel Cascade Lake)
RAM: 16 GB
Nätverk: Up to 25 Gbps
OS: Windows Server 2022 (krävs för UE5 Pixel Streaming)
AMI-bas: aws-marketplace/nvidia-gaming-pc eller custom

Pre-installerat på AMI:
  - Unreal Engine 5.4
  - Pixel Streaming Plugin (aktiverat)
  - Node.js 20 LTS (för Signal Server)
  - Coturn TURN server
  - AWS SSM Agent (remote management)
  - CloudWatch Agent (monitoring)

# Auto Scaling Group
Min: 0 instanser (kostnad $0 vid inaktivitet)
Max: 10 instanser (5 concurrent sessions/instans)
Scale-out: +1 instans om kö > 2 sessioner
Scale-in: Stäng instans efter 15 min inaktivitet
Warmup: 3-5 min (UE5 startup)
Pre-warm strategi: 1 instans alltid varm 08:00-18:00 vardagar

# Matchmaker Server
Type: EC2 t3.small ($0.021/h)
OS: Amazon Linux 2023
Runtime: Node.js + Express
Funktion: Session routing, health checks, load balancing

# CloudFront
Origins:
  - S3: statiska filer (loading screen, pixdrift logo)
  - ALB: WebSocket-trafik
Cache: Ingen för WebSocket (real-time)
SSL: ACM certifikat (gratis)
```

#### UE5 Projekt-struktur

```
pixdrift_demo/
├── Content/
│   ├── Maps/
│   │   ├── L_MainOffice          # Huvudscen: Novacode AB kontor
│   │   ├── L_ExecutionRoom       # Execution-modulen viz
│   │   ├── L_ReportsRoom         # 3D-rapporter
│   │   └── L_Loading             # Loading screen (2D)
│   ├── Blueprints/
│   │   ├── BP_PlayerController   # Mouse/touch-input
│   │   ├── BP_PixdriftAPI        # HTTP-anrop till pixdrift
│   │   ├── BP_MetaHumanGuide     # AI-guide-karaktär
│   │   └── BP_UIManager          # HUD och menyer
│   ├── MetaHumans/
│   │   └── Guide_Sara/           # MetaHuman-guide
│   ├── Materials/
│   │   └── MI_PixdriftBrand/     # Brand colors, logotyp
│   └── UI/
│       ├── WBP_MainMenu
│       ├── WBP_DealCard
│       └── WBP_SessionEnd
├── Config/
│   └── DefaultPixelStreaming.ini
└── Plugins/
    └── PixelStreaming/           # Inbyggt plugin
```

#### pixdrift API-integration från Blueprint

```cpp
// Blueprint HTTP-anrop (pseudokod)
// Hämta Novacode AB-data för demo

void UPixdriftAPIComponent::FetchDemoCompany()
{
    FHttpRequestRef Request = FHttpModule::Get().CreateRequest();
    Request->SetURL("https://api.pixdrift.com/api/demo/novacode-ab");
    Request->SetVerb("GET");
    Request->SetHeader("Authorization", "Bearer " + DemoToken);
    Request->OnProcessRequestComplete().BindUObject(
        this, &UPixdriftAPIComponent::OnCompanyDataReceived
    );
    Request->ProcessRequest();
}

// Blueprint Node: "Fetch Demo Data" → "Update 3D Scene"
```

---

### Prioritet 2: 3D Training Simulations

#### Scenarier och UE5 Levels

```
SCENARIO 1: "Onboarding Day 1"
  Level: L_OnboardingOffice
  Varighet: 15-20 min
  
  Steg 1: Välkomst i reception
    - MetaHuman HR-manager möter användaren
    - Introduktion till pixdrift-modulerna via holografisk karta
    
  Steg 2: Executive Room  
    - CEO-briefing: "Så här jobbar vi med Execution"
    - Interaktiv: Skapa ditt första ärende live
    
  Steg 3: Team Area
    - Träffa virtuella teammedlemmar
    - Lär dig Capability-modulen via demo
    
  Steg 4: Kunskapskontroll
    - 5 quiz-frågor inbakade i miljön
    - "Rätt svar" = dörr öppnas till nästa rum
    
  Slutfört: POST /api/learning/completions
  Score sparas i quiz_results


SCENARIO 2: "Deal-processen"
  Level: L_SalesProcess
  Varighet: 20-25 min
  Mål: Hantera en deal från Lead → Won
  
  Steg 1: Inkommande lead
    - Notification-animation: Ny lead från Acme Corp
    - Uppgift: Kvalificera leaden i pixdrift-systemet
    
  Steg 2: Offertstadiet
    - Virtuell kundmöte-simulation
    - Val av processsteg → feedback på rätt/fel
    
  Steg 3: Förhandling
    - Scenario-träd: Kunden vill ha rabatt
    - Olika vägval → olika outcomes
    
  Steg 4: Deal Won!
    - Konfetti-animation
    - Revenue visualiserat i realtid


SCENARIO 3: "Incidenthantering"
  Level: L_IncidentRoom
  Varighet: 15 min
  Trigger: Missnöjd kund-simulation
  
  Baserat på: pixdrift Process-modul + Playbooks
  
  Steg 1: Inkommande klagomål
    - Arga MetaHuman-kunden ringer
    - Användaren ska följa rätt Playbook-steg
    
  Steg 2: Eskalering
    - Om fel steg väljs → eskalering simuleras
    - Lär av konsekvenser i trygg miljö
    
  Steg 3: Resolution
    - Korrekt hantering → nöjd kund
    - Score baserat på tid + processfölsamhet


SCENARIO 4: "ISO-audit Förberedelse"  
  Level: L_AuditRoom
  Varighet: 30 min
  Target: Processledare, Quality Managers
  
  Simulation av extern ISO-revisors frågor
  Svar hämtas från faktisk pixdrift-data
  Gap-analys visualiseras som 3D-heatmap
```

#### Teknisk integration (detaljerad)

```javascript
// pixdrift Learning API
// Slutför träningsmodul

const completeTraining = async (userId, scenarioId, score, answers) => {
  const response = await fetch('/api/learning/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      scenario_id: scenarioId,         // "onboarding_day1"
      score: score,                     // 0-100
      time_spent_seconds: 1243,
      answers: answers,                 // Array av quiz-svar
      completed_at: new Date().toISOString(),
      metadata: {
        ue5_session_id: sessionId,
        pixel_streaming_quality: "1080p"
      }
    })
  });
  
  // Triggar XP-tilldelning i Capability-modulen
  if (score >= 80) {
    await awardBadge(userId, `${scenarioId}_master`);
  }
};
```

#### Asset-budget

```
Kontorsmiljö (Fab.com):
  "Modern Office Interior" pack:    $50-150
  "Scandinavian Office" pack:       $80-200
  
MetaHumans (gratis i UE5):
  MetaHuman Creator → Anpassade karaktärer
  Guide-karaktär "Sara":            $0 (egenskapad)
  Kund-karaktär "Missnöjd":        $0
  
Animationer:
  Mixamo.com → Gratis riggade anims
  UE5 Control Rig för finare anpassning
  
Ljud:
  Freesound.org → CC-licensierat
  ElevenLabs → AI-röst för MetaHumans (~$22/mån)
  
Totalt assets: ~$150-350 engångskostnad
```

---

### Prioritet 3: Real-time Data Visualization

#### Systemflöde

```
┌──────────────────────────────────────────────────────┐
│                    DATAFLÖDE                          │
│                                                        │
│  pixdrift API                                         │
│  GET /api/executions    ──┐                           │
│  GET /api/capabilities  ──┤                           │
│  GET /api/currency      ──┤→  pixdrift Frontend       │
│  GET /api/processes     ──┘     (Next.js)             │
│                                     │                 │
│                              WebSocket / REST          │
│                                     ▼                 │
│                         UE5 Web Remote Control API    │
│                         (localhost:30010)             │
│                                     │                 │
│                              Blueprint Events          │
│                                     ▼                 │
│                         3D Scene Update               │
│                         ├── Deal columns rise/fall    │
│                         ├── Capacity spheres resize   │
│                         ├── Risk terrain deforms      │
│                         └── Cash flow particles flow  │
└──────────────────────────────────────────────────────┘
```

#### UE5 Blueprint-logik för live-data

```
// Blueprint: BP_DataVisualizer

Event: ReceiveDataUpdate (JSON payload)
  ├── Parse JSON (Make Struct: DealData)
  ├── For Each Deal in Pipeline:
  │   ├── Find Mesh: DealColumn_{stage}
  │   ├── Set Scale Z: deal.value / MAX_DEAL_VALUE
  │   ├── Play Timeline: HeightAnimation (0.5s ease)
  │   └── Update Material: Color by deal status
  │
  ├── For Each TeamMember:
  │   ├── Find Actor: CapacitySphere_{memberId}
  │   ├── Set Scale Uniform: member.workload / 100
  │   └── Set Material: Green→Yellow→Red gradient
  │
  └── Update Niagara System: CashFlowParticles
      ├── Spawn Rate: abs(cashflow) / SCALE_FACTOR
      └── Direction: inflow=up, outflow=down

// REST endpoint i UE5 (Web Remote Control Plugin)
PUT http://localhost:30010/remote/object/call
{
  "objectPath": "/Game/Blueprints/BP_DataVisualizer",
  "functionName": "ReceiveDataUpdate",
  "parameters": { "jsonPayload": "..." }
}
```

#### Visualiseringskatalog

```
DEAL PIPELINE FOREST
  Geometri:    Cylindrar/kolonner, 1 per deal-fas
  Mappning:    Höjd = total deal-value (SEK)
  Färg:        Mörkgrön (varm fas) → Grå (kall fas)
  Animation:   Kolonner växer/krymper vid datauppdatering
  Interaktion: Klick → Deal-lista i UMG overlay

TEAM CAPACITY SOLAR SYSTEM
  Geometri:    Sfärer, 1 per teammedlem
  Mappning:    Diameter = workload-procent
  Orbit:       Sfären kretsar runt "team-solen"
  Färg:        Grön < 70%, Gul 70-90%, Röd > 90%
  Interaktion: Hover → Visa tilldelade ärenden

RISK TERRAIN MAP
  Geometri:    Dynamisk mesh, 20x20 grid
  Mappning:    Y-axel höjd = risknivå (1-5)
  Textur:      Grön dal (låg risk) → Röd berg (hög risk)
  Animation:   Terrain "andas" vid riskförändring
  Interaktion: Flyg över → Detaljer om riskpost

FINANCIAL RIVER SYSTEM
  Geometri:    Niagara-partikelflöde
  Mappning:    Partikelflöde = kassaflödeshastighet
  Riktning:    Inkommande = uppström, utgående = nedström
  Färg:        Blå = intäkter, Orange = kostnader
  Animation:   Realtidspulsering

KPI SKYLINE
  Geometri:    Procedural byggnader
  Mappning:    Byggnadshöjd = KPI-värde vs mål
  Färg:        Grön = over target, Röd = under target
  Animation:   Byggnader "blinkar" vid KPI-alert
```

---

## DEL 3: Implementeringsplan

### Fas 1: Proof of Concept — Interactive Demo (Månad 1-2)

**Mål:** En fungerande 5-minuters interaktiv produktdemo via Pixel Streaming

**Sprint 1 (Vecka 1-2): UE5 Grundmiljö**
- [ ] Installera UE5 5.4+ (175GB download)
- [ ] Skapa `pixdrift_demo.uproject`
- [ ] Aktivera Pixel Streaming Plugin
- [ ] Importera kontorsassets från Fab.com
- [ ] Bygg rum #1: Reception med pixdrift-branding
- [ ] Lokal streaming-test (localhost)
- [ ] Lägg till pixdrift-logotyp, brand-färger (#000000 + accent)

**Sprint 2 (Vecka 3-4): AWS Setup**
- [ ] Sätt upp EC2 g4dn.xlarge med custom AMI
- [ ] Konfigurera Signal Server + Coturn TURN
- [ ] CloudFront WebSocket-distribution
- [ ] Test: Streaming från AWS till webbläsare
- [ ] Latens-optimering (mål: < 80ms RTT inom EU)
- [ ] Matchmaker Node.js-server

**Sprint 3 (Vecka 5-6): pixdrift Integration**
- [ ] MetaHuman-guide "Sara" skapad
- [ ] Blueprint HTTP-anrop till pixdrift demo-API
- [ ] Visa Novacode AB-data i 3D-miljö
- [ ] Grundläggande interaktion (klicka på objekt, navigera)
- [ ] Session tracking + lead capture form

**Sprint 4 (Vecka 7-8): Embed & Polish**
- [ ] Embed på pixdrift.com/demo (iframe + responsive)
- [ ] Loading screen med pixdrift-branding
- [ ] Session timeout + graceful disconnect
- [ ] Error handling (GPU ej tillgänglig)
- [ ] Analytics: session duration, interactions
- [ ] Dela med 5 testanvändare → insamla feedback

**Budget Fas 1:**
```
AWS EC2 (testing, 100h):        ~$52
CloudFront + datatrafik:         ~$20
Kontorsassets (Fab.com):         ~$100
ElevenLabs AI-röst:              ~$22
Övrigt (domains, SSL, misc):     ~$50
Beräknad dev-tid (AI-assisterad): 40-80h
─────────────────────────────────────
Total:                           ~15 000 SEK
```

---

### Fas 2: Training Simulations (Månad 3-4)

**Mål:** 3 kompletta träningsscenarier med pixdrift-integration och quiz-system

**Leveranser:**
- [ ] Scenario 1: Onboarding Day 1 (komplett)
- [ ] Scenario 2: Deal-processen (komplett)
- [ ] Scenario 3: Incidenthantering (komplett)
- [ ] Learning API-integration (completions, scores)
- [ ] MetaHuman-karaktärer med röst (ElevenLabs)
- [ ] Quiz-system inbakat i 3D-miljö
- [ ] Capability-modul badge-integration
- [ ] Admin-panel: se träningsresultat i pixdrift Reports

**Budget Fas 2:**
```
AWS EC2 (dev + staging):         ~$200
Ytterligare assets:              ~$200
ElevenLabs (röstproduktion):     ~$100
Dev-tid (AI-assisterad):         80-120h
─────────────────────────────────────
Total:                           ~40 000 SEK
```

---

### Fas 3: Data Visualization + VR (Månad 5-6)

**Mål:** Real-time 3D-dashboard + VR-stöd via Meta Quest

**Leveranser:**
- [ ] Deal Pipeline Forest (live-data)
- [ ] Team Capacity Solar System
- [ ] Risk Terrain Map
- [ ] Financial River System
- [ ] WebSocket-integration mot pixdrift API
- [ ] Meta Quest WebXR-stöd (via Pixel Streaming)
- [ ] AR-prototyp för en specifik fältarbets-use case
- [ ] Admin: konfigurera vilka KPIs som visas

**Budget Fas 3:**
```
AWS EC2 (prod-miljö):            ~$500
Meta Quest 3 (dev-enhet):        ~$6 000 SEK
VR-optimering assets:            ~$200
Dev-tid:                         100-150h
─────────────────────────────────────
Total:                           ~50 000 SEK
```

---

### Totalsummering

```
Fas 1 (POC Demo):       ~15 000 SEK   ← START HÄR
Fas 2 (Training):       ~40 000 SEK
Fas 3 (DataViz + VR):   ~50 000 SEK
─────────────────────────────────────
TOTALT:                ~105 000 SEK

Löpande AWS-drift (prod):
  Low volume (< 200 sess/mån):    ~500-1 000 SEK/mån
  Medium (200-1000 sess/mån):     ~2 000-5 000 SEK/mån
  High (> 1000 sess/mån):         Spot + reserved → optimeras
```

---

## DEL 4: Competitive Advantage

### Marknadsanalys: 3D/Immersiv i OMS-segmentet

**Konkurrenter och deras approach:**

| Konkurrent | Produkt | 3D/Immersiv? | Kommentar |
|---|---|---|---|
| monday.com | Project/OMS | ❌ | Platt 2D, klassisk SaaS |
| Asana | Task/Project | ❌ | Ingen 3D-roadmap |
| ServiceNow | Enterprise OMS | ❌ | Enormt men legacy UI |
| SAP | ERP/OMS | ❌ | Börjat med AR men ej mainstream |
| Salesforce | CRM/OMS | ⚠️ | Einstein analytics men ej immersivt |
| **pixdrift** | **OMS** | **✅ FIRST** | **Världspremiär** |

**Slutsats:** Ingen OMS-aktör har gjort detta. pixdrift kan äga berättelsen.

---

### Vad BMW, Siemens och Boeing gör med UE5

**BMW Group:**
- Kör hela sin fabriksplanering i UE5 (samarbete med Epic Games)
- Simulerar produktionslinjer innan de byggs fysiskt
- Digital Twin av hela fabriker (miljoner m²)
- Resultat: 30% kortare byggtid, färre designfel
- Citat: *"Vi ser UE5 som lika viktigt som CAD"*

**Siemens:**
- UE5 + Siemens Xcelerator för industrial digital twins
- Energioptimering simuleras i 3D innan implementering
- Tekniker tränas i VR på farliga moment
- Partnerskap med Epic Games sedan 2022

**Boeing:**
- VR-baserad pilotträning (FAA-certifierad)
- Kabindesign och ergonomi testas i UE5
- Maintenance procedures i AR för tekniker
- Estimerar $1M+ besparingar per flygplanstyp i designfasen

**Vad detta betyder för pixdrift:**
- Tekniken är bevisad i tyngsta tänkbara enterprise-miljöer
- pixdrift kan ta BMW-playbooken och applicera på kontorssektorn
- "Det BMW gör för fabriker, gör pixdrift för kunskapsarbete"

---

### Positionering och PR-strategi

**Primär headline:**
> *"pixdrift — Världens första OMS med Unreal Engine 5"*

**Sekundära vinklar:**
- "Din organisation som ett levande 3D-universum"
- "Träna ditt team i VR — mät resultaten i realtid"
- "Produktdemo som är ett upplevelse, inte en presentation"

**PR-möjligheter:**
1. **Epic Games MegaGrants** — Ansök om stipendium ($25k-$500k) för enterprise-innovation med UE5
2. **GDC / AWE Conference** — Tala om enterprise-tillämpning av UE5
3. **TechCrunch / Wired** — "Swedish startup brings Unreal Engine to enterprise ops"
4. **Epic Games Spotlights** — Feature på unrealengine.com
5. **LinkedIn thought leadership** — Erik delar byggresan (developer marketing)

**Enterprise-premium pricing:**
- Standard pixdrift: Basprissättning
- pixdrift Immersive tier: +35-50% premium
- Motivering: ROI från reducerad onboarding + konverteringslift är 10-20× kostnaden

---

### Differentiering i säljsituationer

```
Säljsituation: Enterprise-kund utvärderar pixdrift vs. monday.com

monday.com-demo:    Säljare delar skärm, visar features (20 min)
                    Kund: "Ser ut som alla andra"
                    
pixdrift-demo:      Kund klickar länk, kliver in i SITT företags
                    virtuella kontor, interagerar med SINA typer av 
                    ärenden, avslutar med personlig ROI-kalkyl (5 min)
                    Kund: "Wow. Bok ett möte."
                    
Konverteringseffekt: 2% → 8% (konservativt, baserat på Gartner 2024)
```

---

## DEL 5: Konkreta Nästa Steg

### Veckoplan — Från 0 till Fungerande POC

**Vecka 1: Lokal UE5-setup**
```bash
# Dag 1
1. Skapa konto på unrealengine.com (gratis)
2. Ladda ner Epic Games Launcher
3. Installera UE5 5.4 (175GB, ta en natt)
4. Skapa nytt projekt: "Games" → "Blank" → "pixdrift_demo"

# Dag 2-3
5. Enable Pixel Streaming Plugin:
   Edit → Plugins → sök "Pixel Streaming" → Enable → Restart
6. Konfigurera Project Settings:
   - Target Platform: Windows
   - Enable Hardware Ray Tracing (om GPU stödjer)
7. Bygg en enkel scen: Floor plane + Walls + pixdrift-logotyp (PNG import)

# Dag 4-5
8. Starta lokal Pixel Streaming:
   # I UE5 Editor: Play → Standalone Game med flaggor:
   -PixelStreamingURL=ws://localhost:8888
   -RenderOffscreen
   -ResX=1920 -ResY=1080
9. Starta Signal Server (medföljer UE5):
   cd "C:\Program Files\Epic Games\UE_5.4\Samples\PixelStreaming\..."
   node SignallingWebServer\platform_scripts\cmd\start.bat
10. Öppna webbläsare: http://localhost — SE DIN UE5-SCEN STREAMAD!
```

**Vecka 2: AWS g4dn Setup**
```bash
# AWS CLI Setup
aws configure
# AWS Access Key, Secret Key, Region: eu-west-1

# Starta g4dn.xlarge från NVIDIA-AMI
aws ec2 run-instances \
  --image-id ami-XXXXXXXX \  # NVIDIA Gaming AMI (Windows)
  --instance-type g4dn.xlarge \
  --key-name pixdrift-key \
  --security-group-ids sg-XXXXXXXX \
  --subnet-id subnet-XXXXXXXX \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=pixdrift-ue5-demo}]'

# Security Group regler (inbound):
# Port 443: HTTPS (WebRTC signaling)
# Port 8888: WebSocket (Pixel Streaming)
# Port 19302-19309: UDP (WebRTC media)
# Port 3478: UDP/TCP (TURN server)
# Port 3389: RDP (admin access)

# RDP till instansen, installera UE5, kopiera projekt
# Starta Pixel Streaming:
.\pixdrift_demo\Binaries\Win64\pixdrift_demo.exe `
  -PixelStreamingURL=ws://0.0.0.0:8888 `
  -RenderOffscreen `
  -ResX=1920 -ResY=1080 `
  -AudioMixer

# Test från lokal browser:
# http://<EC2-PUBLIC-IP>/  
# (Signal Server måste köra på EC2)
```

**Vecka 3: pixdrift-branding i UE5**
```
1. Importera pixdrift-logotyp som PNG → Material
2. Lägg logotyp på kontorets vägg (Static Mesh Plane + Material)
3. Ändra färgschema: Golv/väggar → pixdrift brand colors
4. Lägg till pixdrift-texten i receptionen
5. Skapa enkel Blueprint: "Ta emot användarnamn från Pixel Streaming → 
   Visa välkomsttext i 3D"
6. Pixel Streaming Custom Events:
   // I JavaScript (på webbsidan):
   pixelStreaming.emitUIInteraction({ action: "setUserName", name: "Erik" });
   // I UE5 Blueprint: Listen for "setUserName" → Update Text3D Actor
```

**Vecka 4: Embed på pixdrift.com**
```html
<!-- pixdrift.com/demo — Next.js-sida -->
<div className="demo-container">
  <iframe
    src="https://demo.pixdrift.com"
    width="100%"
    height="100%"
    allow="camera; microphone; autoplay"
    frameBorder="0"
  />
</div>

<!-- Pixel Streaming WebSocket URL injiceras dynamiskt -->
<script>
  // Hämta tillgänglig GPU-instans från Matchmaker
  const { streamUrl } = await fetch('/api/demo/allocate-session');
  // Starta Pixel Streaming player
  const pixelStreaming = new PixelStreaming({ signalingServerAddress: streamUrl });
</script>
```

---

### Resurser och Lärande

**Officiell dokumentation:**
- UE5 Pixel Streaming: https://docs.unrealengine.com/5.4/en-US/pixel-streaming-in-unreal-engine/
- MetaHuman Creator: https://metahuman.unrealengine.com/
- Web Remote Control: https://docs.unrealengine.com/5.4/en-US/remote-control-api-for-unreal-engine/

**Assets:**
- Fab.com (Epic Marketplace): https://www.fab.com
- Mixamo (gratis animationer): https://www.mixamo.com
- Quixel Bridge (gratis megascans i UE5): Inbyggt i UE5

**YouTube-resurser:**
- **Unreal Sensei** — Bäst för UE5-grunderna
- **William Faucher** — Pixel Streaming tutorials
- **Dev Enabled** — Blueprint-programmering
- **Virtus Learning Hub** — Enterprise UE5
- **AWS re:Invent (YouTube)** — UE5 on AWS-talks

**Communities:**
- Unreal Engine Discord (officiellt)
- r/unrealengine (Reddit)
- Epic Developer Community Forums

---

## DEL 6: ROI-kalkyl

### 6.1 Interaktiv Demo — Konverteringseffekt

```
NULÄGE (antaganden):
  Besökare pixdrift.com/månad:     1 000
  Klickar på demo-CTA:             100 (10%)
  Bokar möte efter video-demo:     2 (2% konvertering)
  → 2 leads/månad från demo

MED PIXEL STREAMING DEMO:
  Besökare pixdrift.com/månad:     1 000
  Klickar på demo-CTA:             100 (10%)
  Slutför interaktiv demo:         50 (50% completion)
  Bokar möte efter immersiv demo:  4 (8% konvertering)
  → 4 leads/månad från demo

EFFEKT: 2× leads från demo-kanalen

MONETÄRT VÄRDE:
  Antag: ACV (Annual Contract Value) = 50 000 SEK/kund
  Antag: Close rate = 20% av leads
  
  Nuläge:    2 leads × 20% × 50k = 20 000 SEK/månad
  Med demo:  4 leads × 20% × 50k = 40 000 SEK/månad
  
  Månadsökning:  20 000 SEK
  Årsökning:    240 000 SEK
  
  ROI på Fas 1-investering (15 000 SEK):
  Återbetalningstid: < 1 MÅNAD
```

### 6.2 Training Simulations — Onboarding-effekt

```
TRADITIONELL ONBOARDING (nuläge):
  Tid till full produktivitet:  90 dagar
  Kostnad (lön under inlärning): 90d × 800 SEK/d = 72 000 SEK/person
  Felprocent (processer):        15% av ärenden kräver korrigering

MED UE5 TRAINING SIMULATIONS:
  Tid till full produktivitet:  54 dagar (40% reduktion, McKinsey-baserat)
  Kostnad:                      54d × 800 SEK/d = 43 200 SEK/person
  Besparing per ny anställd:    28 800 SEK
  Felprocent:                   9% (40% reduktion)

ENTERPRISE-KUND MED 20 NYA ANSTÄLLDA/ÅR:
  Besparing onboarding:         20 × 28 800 = 576 000 SEK/år
  
  Motiverar en licenspremium på:  50 000-100 000 SEK/år
  (customer's ROI: 5-10× investering)

UE5 Training vs. traditionell videoproduktion:
  Professionell träningsvideo:  100 000-500 000 SEK per modul
  UE5 träningsscenario:         40 000 SEK total (Fas 2)
  UE5 fördel: Interaktivt, uppdaterbart, skalbart till 0 marginal
```

### 6.3 Enterprise Premium Pricing

```
Marknadsdata (Gartner/Forrester 2024):
  Enterprise-kunder betalar 30-50% premium för:
  - Immersive learning experiences
  - AI-personaliserade träningsprogram  
  - VR/AR-utbildning med mätbara outcomes

pixdrift Immersive Tier prissättning:
  Standard tier:          X SEK/mån
  + Immersive module:     +35% premium
  
  Kundernas betalningsvilja:
  "Vi betalar för det som sparar mest tid"
  → Onboarding-besparing ensam motiverar premiumen

SAMMANFATTAD ROI-KALKYL:
┌────────────────────────────────────────────────────┐
│                 PIXDRIFT UNREAL ENGINE              │
│                                                     │
│  Total investering:         105 000 SEK             │
│  Löpande AWS-drift:         ~24 000 SEK/år          │
│                                                     │
│  Intäktseffekter (år 1):                            │
│  ├── Demo konverteringslift: 240 000 SEK/år         │
│  ├── Immersive tier premium: 50 000-150 000 SEK/år  │
│  └── Enterprise deals (UE5 som säljargument):  ???  │
│                                                     │
│  Total estimerad ROI år 1:   290 000-390 000 SEK   │
│  ROI-multipel:               2.7× - 3.7×            │
│  Payback period:             4-6 månader             │
└────────────────────────────────────────────────────┘
```

---

## Appendix A: Teknisk Checklista

### Pre-launch Checklist (Fas 1)

```
SÄKERHET:
[ ] UE5-instansen i privat subnet, Matchmaker i public
[ ] Security Groups: minsta möjliga portöppningar
[ ] TURN-server med autentisering (temporära credentials)
[ ] CloudFront med WAF (Web Application Firewall)
[ ] Session tokens: JWT med 2h expiry
[ ] Ingen faktisk pixdrift-kunddata i demo (synthetic data)

PERFORMANCE:
[ ] GPU Encoder: NVENC (NVIDIA T4 stödjer detta)
[ ] Target bitrate: 20 Mbps (1080p30)
[ ] Frame rate: stabil 30 fps (ej 60 — bandbredd)
[ ] Input lag: < 80ms (mål)
[ ] Cold start: < 5 min (AMI pre-loaded)
[ ] Warm standby: 1 instans alltid redo (kontorstid)

MONITORING:
[ ] CloudWatch: GPU utilization, session count
[ ] CloudWatch Alarms: > 80% GPU → scale out
[ ] Session analytics: duration, interactions, drop-offs
[ ] Cost alerts: budget på $100/mån

FALLBACK:
[ ] Om GPU ej tillgänglig: visa video-demo istället
[ ] Graceful degradation: lägre upplösning vid hög latens
[ ] Error-sida: "Demo tillgänglig igen om X minuter"
```

---

## Appendix B: Ordlista

| Term | Förklaring |
|---|---|
| Pixel Streaming | UE5-funktion som renderar på server, streamar video+input till browser |
| WebRTC | Web Real-Time Communication — protokoll för låg-latens videokommunikation |
| MetaHuman | Epics verktyg för fotorealistiska 3D-karaktärer |
| Blueprint | UE5:s visuella programmeringsspråk (ingen C++ krävs) |
| TURN | Traversal Using Relays around NAT — hanterar brandväggar för WebRTC |
| g4dn.xlarge | AWS GPU-instans med NVIDIA T4, optimal för Pixel Streaming |
| AMI | Amazon Machine Image — förinstallerad serveravbild |
| Niagara | UE5:s partikelsystem för effekter (kassaflöde, rök etc.) |
| UMG | Unreal Motion Graphics — UE5:s UI-system |
| Digital Twin | Digital kopia av fysiskt eller organisatoriskt system |

---

*Dokument skapat av: Senior Technical Architect × pixdrift Strategiteam*  
*Nästa review: Efter Fas 1 POC-completion*
