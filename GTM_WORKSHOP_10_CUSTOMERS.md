# GTM Playbook — Första 10 Betalande Verkstadskunder

> **Mål:** 10 betalande verkstäder inom 90 dagar.  
> **Strategi:** Målinriktad outreach → pilot (gratis 30 dagar) → konvertering.  
> **Nyckelmeddelande:** "Byt system utan att märka det."

---

## Vecka 1–2: Identifiera Targets

### Sökkriterie

**Primär ICP (Ideal Customer Profile):**
- Oberoende verkstad eller liten franchise (ej rikskedja)
- 3–20 mekaniker
- Kör Automaster, Winbas eller Keyloop idag
- Sverige eller DACH (Österrike, Schweiz, Tyskland)
- Har frustrationer med nuvarande system (högt pris, gammal UX, många inlogg)

**Uteslut:**
- Rikskedjor (Mekonomen, Midas, etc.) — för lång säljcykel, kräver upphandling
- Verkstäder med <3 mekaniker — för liten ROI
- OEM-ägda workshops — inlåsta i OEM-system

---

### Prospektlista: Källor

**Google:**
```
"bilverkstad" + "Keyloop" + site:linkedin.com
"bilverkstad" + "Automaster" inurl:linkedin
"oberoende bilverkstad" + "mekaniker" + "plats"
```

**LinkedIn Sales Navigator-filter:**
- Job title: "Verkstadschef" OR "Bilhandlare" OR "Workshop Manager"
- Industry: Automotive
- Company size: 10–200 anställda
- Geography: Sverige, DACH

**Branschregister:**
- Motorbranschens Riksförbund (MRF) — medlemslista
- Bilhandlarna Sverige
- Dekra/Besiktningsregister

**Target: 200 kvalificerade prospects per vecka.**

---

### Kvalificeringsfrågor (för SDR)

Innan du når ut — bekräfta:
- [ ] Verkstaden syns online (hemsida/Google Maps) och är aktiv
- [ ] Mer än 5 anställda (LinkedIn/Bolagsverket)
- [ ] Inget tecken på att de nyligen bytte system (jobbannons efter "Keyloop/Automaster-erfaren" = bra signal)

---

## Vecka 3–4: Outreach

### Cold Email — 3 Subject Lines att testa parallellt

**A: Nyfikenhet**
> "Hur många system loggar dina mekaniker in i varje dag?"

**B: Kostnad**
> "[Förnamn], vad kostar Keyloop er egentligen per år?"

**C: Social proof**
> "En verkstad i [stad] sparar €1,200/mån med pixdrift"

**Testa A/B/C mot 60 prospects vardera (vecka 1). Kör vinnaren mot resterande lista.**

---

### Cold Email — Mall

**Subject:** [Välj A, B eller C ovan]

```
Hej [Förnamn],

Såg att ni kör [Automaster/Winbas/Keyloop]. De flesta verkstäder 
vi pratar med loggar in i 3–5 olika system varje dag — DMS, 
garanti, ekonomi, lager, tidbokning.

Vi har byggt pixdrift — ett DMS för moderna verkstäder. 
En inloggning. Allt på ett ställe.

Det speciella: vi importerar all er data från [system] och 
speglar hur ni redan jobbar. Personalen lär sig ingenting nytt 
under de första veckorna.

Är det värt 20 minuter nästa vecka för att se om det passar er?

[Förnamn från pixdrift]
```

---

### Follow-up sekvens (5-email)

**Email 1 (dag 0):** Initial cold email ovan  
**Email 2 (dag 3):** Kort follow-up — länka en case study / ROI-beräkning  
**Email 3 (dag 7):** Värde-driven — "3 saker som kostar svenska verkstäder pengar"  
**Email 4 (dag 14):** Breakup email — "Ska jag ta bort dig från min lista?"  
**Email 5 (dag 21):** LinkedIn connect + kort DM

**Stoppa sekvensen direkt vid reply — överför till discovery call.**

---

### LinkedIn Outreach

```
Hej [Förnamn],

Jag ser att du driver [Verkstad] i [stad]. Vi bygger 
DMS-system för oberoende verkstäder och pratar just nu 
med ett fåtal verkstäder i Sverige.

Kör ni [Keyloop/Automaster] idag?

Mvh, [Namn]
pixdrift
```

---

## Discovery Call (30 min)

### Agenda

**0–5 min:** Öppningsfråga  
**5–15 min:** Nuläge och pain  
**15–25 min:** ROI-kalkylator  
**25–30 min:** Nästa steg

---

### Script

**Öppna:**
> "Berätta — hur många system loggar era mekaniker in i varje dag?"

*(Låt dem räkna. Svaret är nästan alltid 3–6. Reaktionen är irritation.)*

**Gräv i pain:**
> "Vilket system stör mest? Varför?"  
> "Hur lång tid tar det att sätta upp en ny arbetsorder idag?"  
> "Hur hanterar ni garanti just nu — hur lång tid tar det?"

**Introduktion:**
> "pixdrift är ett DMS som ersätter allt det där. En inloggning.
> Det speciella — och det här är viktigt — vi importerar all er 
> data från [system] och speglar hur ni jobbar idag. Under de 
> första veckorna jobbar personalen precis som vanligt. 
> De märker knappt att de bytt system."

**ROI-kalkylator live:**
Öppna pixdrift.com/verkstad/#kalkylator med deras siffror:
- Antal mekaniker × 15 min/dag sparad admin-tid = X timmar/mån
- X timmar × debiterbar timpris = €Y/mån
- pixdrift kostnad vs nuvarande system = €Z/mån
- **Nettobesparing: €Y - €Z = ROI**

**Avsluta:**
> "Vi erbjuder en 30-dagars pilot, kostnadsfritt. Vi importerar 
> all er data, sätter upp allt, och ni kör. Ingen bindningstid.
> Om ni inte sparar tid — avsluta utan kostnad.
> 
> Kan vi boka en demo nästa vecka?"

---

## Demo (45 min)

### Förberedelse (dag innan)

- [ ] Kolla deras hemsida — vilket system nämner de? Certifieringar?
- [ ] Sätt terminology preset: `POST /api/config/terminology { preset: 'keyloop' }`
- [ ] Ha deras branschord i UI:n under demot (ROW → "RO (Repair Order)")

### Agenda

**0–5 min:** Agenda + bakgrund  
**5–20 min:** "Så här ser er vardag ut i pixdrift"  
**20–30 min:** Import-demonstration  
**30–40 min:** Garanti & OEM-hantering  
**40–45 min:** Pilot-erbjudande + Q&A

---

### Demo-script: Nyckelmoment

**"Vi importerar allt"**
> "Visa importflödet — ladda upp en CSV-export från deras system.
> Kör preview-steget: 'Här är era 847 kunder och 1,203 fordon.
> Allt mappat korrekt. Vill du importera?'
> 
> Klicka execute. Watching the bar fill.
> 
> 'Klart. All er historik finns nu i pixdrift. Ni har inte 
> förlorat ett enda ärende.'"

**"Samma terminologi"**
> "Märker ni att vi kallar arbetsordrar 'RO (Repair Order)' 
> — precis som i Keyloop? Vi anpassar pixdrift till er. 
> Inte tvärtom."

**"Garanti är säkert"**
> "Garantiärenden är låsta. Ingen kan radera eller ändra dem 
> utan spårbarhet. Vi exporterar direkt till SAGA2 XML — 
> kompatibelt med Volvo, BMW, VW, Stellantis.
> 
> Ni riskerar ingenting på garanti-sidan."

**"En inloggning"**
> "Istället för att logga in i DMS, sedan garanti-systemet, 
> sedan Fortnox, sedan lagerhanteringen — en inloggning.
> Det här är det enda fönstret mekanikerna behöver."

---

## Pilotprogram — Vad som ingår (Gratis 30 dagar)

| Vad | Detalj |
|-----|--------|
| Full implementation | Alla moduler konfigurerade |
| Data-migration | Import från befintligt system ingår |
| Terminology setup | UI anpassad till deras ord |
| Shadow sync | pixdrift + legacy kör parallellt |
| Dedikerad onboarding | 2x videocall under perioden |
| ROI-rapport | Levereras dag 30 med faktiska siffror |
| Ingen bindningstid | Avsluta utan kostnad |

**Piloten är inte "gratis trial" — det är ett partnership.**  
Deras framgång är vår referens.

---

## Konvertering (Dag 28–30)

### ROI-rapport innehåll

- Sparade admin-timmar per mekaniker
- Antal arbetsordrar skapade i pixdrift vs gamla systemet
- Support-ärenden under perioden
- Systemkostnad: pixdrift vs nuvarande setup
- **Nettobesparing: X kr/mån | Y kr/år**

### Konversationsskript

> "Baserat på er ROI-rapport sparar ni [X timmar/mån] och 
> [Y kr/mån] jämfört med [gamla systemet].
> 
> Vi erbjuder er 12 månaders avtal med 3 månaders gratis 
> om ni betalar årsvis. Det innebär att ni tjänar tillbaka 
> investeringen på [beräkna] dagar.
> 
> Ska vi köra?"

### Referral ask

> "Om ni är nöjda — och det verkar ni vara — kan ni 
> introducera oss till 2 kollegor i branschen? Vi belönar 
> det med en extra fri månad per referral som konverterar."

---

## Mål & KPI:er per Fas

| Fas | KPI | Mål |
|-----|-----|-----|
| Prospektering | Kvalificerade prospects | 200/vecka |
| Outreach | Reply rate | >5% |
| Discovery | Booking rate | >40% av replies |
| Demo | Pilot-konvertering | >60% |
| Pilot | Paid konvertering | >70% |
| Referral | Refs per kund | 1.5 |

---

## 90-dagars Target: 10 Betalande Kunder

```
Vecka 1-2:   200 prospects identifierade
Vecka 3-4:   200 emails skickade → 10 replies → 4 discovery calls
Vecka 5-6:   4 demos → 3 pilot-starter
Vecka 7-8:   200 fler emails → 8 replies → 3 demos → 2 pilot-starter
Vecka 9-12:  5 pilots löper ut → 4 betalande kunder
Vecka 10-12: Referrals från pilot-kunder → 3 extra demos → 2 pilotar → 1-2 kunder
Vecka 11-12: Ny email-batch → 4 kunder
             ────────────────────────────
Total mål:   10 betalande kunder, dag 90
```

---

## Teknisk Sales Kit

| Asset | Status | Länk |
|-------|--------|------|
| ROI-kalkylator | Byggas | pixdrift.com/verkstad/#kalkylator |
| Demo-miljö | Finns | Konfigurera med kundens terminology preset |
| Case study (pilot 1) | Skapas efter pilot 1 | — |
| One-pager | Finns | SALES_PITCH_ONE_PAGER.md |
| Competitor comparison | Finns | COMPETITOR_ANALYSIS.md |

---

*GTM Workshop — 10 Customers Playbook v1.0*  
*pixdrift — 2026-03-21*
