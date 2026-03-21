# pixdrift — Komplett Affärsmodellsanalys & Utvecklingsplan
**Version: 1.0 | Datum: 2026-03-21 | Klassificering: Strikt Konfidentiell**
**Upprättad av:** Senior Business Strategy Analysis — OpenClaw

> **Direktivet:** Var brutalt ärlig. Inga vaga råd. Riktiga tal.

---

## EXECUTIVE SUMMARY

pixdrift är ett tekniskt ambitiöst, strategiskt välpositionerat B2B SaaS-system med ett **genuint unikt värdeförslag i ett specifikt marknadssegment** — bilverkstäder i Norden. Det är *inte* ett generellt OMS-verktyg som råkar ha verkstadsfunktioner. Det är ett komplett DMS + Ekonomi + ISO + Banking i ett paket som ingen konkurrent ens är nära att matcha — till ett pris som gör valet nästan löjligt enkelt.

**Den brutala sanningen:** Produkten finns. Moaten är real. Men intäkterna är €0. Det är ett go-to-market-problem, inte ett produktproblem.

**Topp 5 insikter:**
1. **Verkstad är rätt beachhead** — inte för att det är lättast, utan för att ROI-story är omedelbar och oomtvistlig (€1,500-3,200/mo ned till €999/mo)
2. **Mirror Mode är företagets starkaste säljargument** — inte produkten, inte priset. Att byta utan risk eliminerar den enda objektionen som faktiskt kan stoppa en affär
3. **Redovisningsbyråer är den mest underutnyttjade kanalen** — en partner = 5-10 kunder/år, CAC ~€300
4. **Scope creep är den största risken för misslyckande** — 497 endpoints mot annonserade 82 är ett varningssymptom på ett system som försöker vara allt för alla
5. **Verkstad Sverige är tillräckligt stor för €1M ARR ensam** — 4,500 oberoende verkstäder × €999/mo vid 23% penetration = €1M ARR. Det är en rimlig 3-årsplan, inte 10 år

---

# DEL 1: AFFÄRSMODELLSANALYS

## 1.1 Intäktsmodell — Styrkor och Svagheter

### Team-flat Pricing vs Per-Seat: Kvantifierad Fördel

**Team-flat är ett strategiskt vapen, inte bara en prisstrategi.**

| Scenario | Per-Seat (konkurrent) | Team-Flat (pixdrift) | Fördel pixdrift |
|----------|----------------------|---------------------|-----------------|
| 8-mannaverk stad | Keyloop ~€1,200 | Growth €999 | +€201/mo |
| 15-mekaniker | Keyloop ~€1,800 | Growth €999 | +€801/mo |
| 25-mekaniker | Keyloop ~€2,800 | Growth €999 | +€1,801/mo |
| Tillväxt: 8→15 mek | Kostnad × 2 | Kostnad = samma | Inget penalty att växa |

**Kvantifiering:** En verkstad som växer från 8 till 15 mekaniker betalar med pixdrift €0 extra. Med Keyloop betalar de €600 mer per månad — varje år. Det är €7,200/år i penalty för att ha anställt folk.

**Psykologisk effekt:** Per-seat pricing är ett *switching cost mot kunden*. Team-flat är ett *lojalitetsincitament*. Verkstadschefen som lägger till en mekaniker i pixdrift känner ingen smärta — i Keyloop gör varje ny anställning ont.

**Svagheter med team-flat:**
- LTV-tak per kund utan upsell-plan: En 5-mannaverkstad och en 25-mannaverkstad betalar samma
- Ingen expansion revenue automatisk — måste aktivt sälja upp till Enterprise
- Grossmarginalen varierar med kundstorlek (stora kunder är dyrare att supporta, betalar lika)

**Rekommendation:** Behåll team-flat men lägg till ett "site-paket" för verkstäder med >20 mekaniker (€1,499/mo) och ett "kedja-paket" för 3+ anläggningar (€2,499/mo). Det ger naturlig expansion revenue utan att straffa tillväxt.

---

### Optimal Prisnivå för Verkstads-ICP

**Nulägesanalys:**
- Starter €499: Underprisat för en verkstad. Täcker inte ens Fortnox + ett DMS-abonnemang.
- Growth €999: **Rätt pris.** Är lägre än Keyloop ensam. Stark ROI-story.
- Enterprise: Custom — korrekt men för odefinerat.

**Marknadsbenchmark (verkstad-specifikt):**
- Keyloop/CDK: €800-1,500/mo
- Automaster: €500-900/mo
- Winbas: €400-700/mo
- Cabas: €600-1,200/mo
- Fortnox + DMS + CRM: €700-1,200/mo kombinerat

**Slutsats:** Growth €999/mo är det rätta priset för bilverkstäder. Det slår varje alternativ på pris OCH funktionalitet. Starter €499 bör inte marknadsföras till verkstäder — det är för billigt och skapar fel prisförväntning. Verkstäder ska direkt in på Growth.

**Rekommendation prisstrategi verkstad:**
- Inga Starter-avtal för verkstäder
- Growth €999 = standard (positioneras som "standard verkstadsabonnemang")
- Enterprise €1,999+ för auktoriserade kedjor 3+ anläggningar
- Årsbetalning: -2 månader (effektivt €832/mo) — drivs aktivt vid konvertering

---

### Upsell-Potential

**Nuläge:** Intäktsmodellen är i princip ren recurring SaaS — minimal expansion revenue.

**Upsell-möjligheter, rankade på realism och värde:**

| Upsell | Pris | Sannolikhet | TAM |
|--------|------|-------------|-----|
| Årskontrakt (2 mån gratis) | Kassaflödesförbättring | Hög | Alla kunder |
| Implementation-fee | €2,000-5,000 engång | Hög | Alla kunder |
| Extra anläggning (+50% per enhet) | €499/mo per extra site | Medium | Kedjor |
| Certifierad ISO-implementering | €3,000-8,000 | Medium | Konsult/bygg |
| OEM-integration premium | €200/mo per OEM | Medium | Verkstäder |
| Dedicated Success Manager | €300/mo | Låg (nu) | Enterprise |
| Data analytics add-on | €200/mo | Låg (nu) | >30 kunder |

**Implementation fee är underprioriterat och borde vara standard.** Onboarding, datamigration, Terminology setup, Shadow Sync konfiguration — detta är professionellt arbete värt €2,000-5,000 per kund. Att det "ingår" sänker upplevt värde och sätter fel förväntning.

**Rekommendation:** Lägg till €1,500-3,000 setup-fee för alla nya kunder. Presentera det som "Certified Implementation" — inte som extrakostnad utan som kvalitetsgaranti. "Vi gör allt jobb. Era mekaniker börjar måndagen utan att ha fått ny utbildning."

---

### Recurring vs One-Time

**Nuläge:** 100% recurring, 0% one-time.

**Optimal mix:**
- Recurring: 75% av intäkter (MRR)
- One-time implementation: 20% (NRR booster, cash-flow positiv)
- Professional services (ISO-implementation, OEM-certifiering): 5% (hög-marginal)

**Konkret:** 30 kunder × €999 MRR + €2,000 setup/kund (1 gång) = €29,970 MRR + €60,000 engångsintäkter under 12 månader. Det är skillnaden mellan €360K ARR och €420K kassaflöde år 1.

---

## 1.2 Unit Economics

*Beräknade med rimliga antaganden för B2B SaaS i SMB-segmentet, Q1 2026.*

### CAC per Kanal

| Kanal | CAC-beräkning | Estimerat CAC | Källa/Logik |
|-------|---------------|---------------|-------------|
| Cold outreach (founder-led) | 200 prospekt × 1h research + 10 replies × 2h + 2 kunder = 120h × €50/h | **€1,500** | Tid värderat till €50/h |
| Cold outreach (SDR) | Lön €4,000/mo ÷ 4 kunder/mo = €1,000 + tools €150 | **€1,150** | Med dedikerad säljare |
| Redovisningsbyrå/referral | Partner-provision: 2 månaders MRR = €1,998 + onboarding 3h | **€2,200** | Högre CAC, men lägre risk |
| Inbound/SEO | Content-kostnad €500/mo ÷ 0.5 kunder/mo (månad 3-6) | **€2,000** | Sjunker till €500 vid scale |
| Partner-referral (inte byrå) | Nöjd kund introducerar gratis | **€100-300** | Bäst CAC i systemet |
| Event | Event-kostnad €2,000 ÷ 2 kunder | **€1,000** | Varierar kraftigt |

**Viktig insikt:** Redovisningsbyrå-CAC ser högt ut (€2,200) men ger recurring provision 20% år 2+, vilket minskar netto-CAC dramatiskt. Och byråns kunder har mycket lägre churn-risk (bokföringskonsulten är ambassadör).

---

### LTV per Kundsegment

*Antaganden: Growth €999/mo, 24 månaders genomsnittlig livslängd som bas. Churn-rater nedan.*

| Segment | MRR | Churn/mo | Genomsnittlig LTV | LTV-källa |
|---------|-----|----------|-------------------|-----------|
| **Bilverkstad (3-15 mek)** | €999 | 2.5% | **€39,960** | Data-beroende, hög switching cost |
| **Bilverkstad (15+ mek)** | €1,499 | 1.5% | **€99,933** | Mer inlåst, komplexare migration |
| **Konsultbolag** | €999 | 4% | **€24,975** | Lägre inlåsning, mer konkurrens |
| **Restaurang** | €499 | 8% | **€6,238** | Hög bransch-churn, fel ICP |
| **Bygg/entreprenad** | €999 | 3% | **€33,300** | Säsongsvariation ökar churn-risk |

**Churn-antaganden baserade på:**
- Verkstad: Hög switching cost (Mirror Mode, data locked, OEM-integration) → 2.5%/mo är aggressivt lågt men möjligt. Realistisk benchmark: 3-4%
- Konsult: SaaS-segment med mer konkurrens, lättare att byta
- Restaurang: SMB-restauranger är den mest churner-benägna kategorin i SaaS

---

### LTV/CAC-ratio per Segment

| Segment | LTV | CAC (outbound) | LTV/CAC | Bedömning |
|---------|-----|----------------|---------|-----------|
| Bilverkstad 3-15 mek | €39,960 | €1,500 | **26.6x** | ✅ Exceptionellt |
| Bilverkstad 15+ mek | €99,933 | €3,000 | **33.3x** | ✅ Exceptionellt |
| Konsultbolag | €24,975 | €1,500 | **16.7x** | ✅ Utmärkt |
| Restaurang | €6,238 | €1,500 | **4.2x** | ⚠️ Under gränsen (VC kräver >5x) |

**Verkstad är inte bara bäst ICP för produkt-fit — det är bäst ICP för unit economics. Varje verkstadskund är 2-5x mer värdefull än en restaurangkund.**

---

### Payback Period

| Segment | CAC | Gross Profit/mo (80%) | Payback |
|---------|-----|-----------------------|---------|
| Verkstad Growth | €1,500 | €799 | **1.9 månader** |
| Konsult Growth | €1,500 | €799 | **1.9 månader** |
| Verkstad via partner (CAC €2,200) | €2,200 | €799 (minus 20% rev share = €640) | **3.4 månader** |

**Kommentar:** Payback under 2 månader är extremt bra. World-class SaaS target är <12 månader. pixdrift är ett order of magnitude bättre — förutsatt att churn-antaganden håller.

---

### Gross Margin

**Standard SaaS gross margin: 70-85%**

pixdrift:s kostnadsstruktur (estimerat):
- AWS ECS Fargate: ~€200/mo
- Supabase: ~€100/mo (Pro plan)
- Tink (banking): variable, ~€2-5/kund/mo
- Anthropic/OpenAI: ~€1-3/kund/mo
- Stripe: 2.9% + €0.30/transaktion

**Estimerad gross margin per kund (Growth €999):**
- Direkt COGS: ~€20-30/kund/mo (hosting, APIs)
- Gross margin: **97%** på intäkter (exkl. support, Success)
- Med support/Success (1 person per 100 kunder): **~82%**
- Med partner-provision (20% rev share): **~65%**

**Slutsats:** Utan partner-provision är gross margin i toppklass (~82%). Med partner-provision sjunker den — men partner-CAC är också lägre, och total LTV per partner-kund är densamma. Det är en trade-off som är rätt att göra.

---

### Churn-risk per Segment

| Segment | Churn-driver | Risk-nivå | Mitigering |
|---------|-------------|-----------|------------|
| Bilverkstad | Ekonomisk kris (ägarskifte, konkurs), OEM-krav på certifierat system | **Låg** | Garantimodellen + compliance = nödvändig |
| Konsultbolag | Konkurrens från Harvest, Teamwork, Monday | **Medium** | Tid-tracking är critical missing feature |
| Restaurang | Bransch-volatilitet, prispress, konkurs-frekvens | **Hög** | Undvik som primär ICP |
| Bygg | Säsong, projektslut, konkurs | **Medium-hög** | Säsongsrabatt minskar churn |

**Praktisk churn-varning:** Om pixdrift når 30 kunder vid månad 6 och churn är 5%/mo tappar de 1.5 kunder/månad — för att nettogrowtha behöver de 2+ nya kunder/månad bara för att stå still. **Retention är lika viktigt som förvärv från dag ett.**

---

## 1.3 Moat-analys

### Data Moat — Bedömning: STARK

**Vad är inlåst i pixdrift:**
- Komplett arbetsorderhistorik (kunder + fordon + mekaniker + material)
- SIE4-transaktionshistorik (om den används som primärt bokföringssystem)
- ISO 9001-processdokumentation och NC/CAPA-historik
- Capability-assessments (personalutvecklingsdata)
- Garantiärenden med audit trail (juridiskt känsligt!)

**Switching cost kvantifierat:**
En verkstad med 2 år i pixdrift har:
- ~2,400 arbetsordrar (1 per dag × 6 dagar × 52 veckor × 2 år)
- ~800 unika fordonsregisteringar
- ~500 kundprofiler
- 2 år av SIE4-bokföring
- 100+ ISO-processer och NC-ärenden

**Att migrera detta tar en konsult 3-4 veckor och kostar €5,000-15,000.** Det är den verkliga switching cost — inte kontraktet.

**Data moat byggs snabbt:** Vid 12 månader är data moaten full-size. Tidiga kunder är de starkaste kunderna.

---

### Process Moat — Mirror Mode = Switching Cost Byggare

**Mirror Mode är det smartaste draget i pixdrifts arkitektur.**

Varför: Det sänker den *initiala switching cost* (lättare att komma in) medan det *bygger switching cost* (svårare att lämna). Det är asymmetrisk risk till pixdrifts fördel.

**Switching cost timeline:**
- Dag 1-14: Noll switching cost (data finns i båda system)
- Månad 1-3: Medium (pixdrift är primärt, legacy är backup)
- Månad 3-6: Hög (legacy avvecklat, allt nytt data only i pixdrift)
- År 1+: Mycket hög (all historik i pixdrift, team är tränat, ISO-dokumentation = ej portabel)

**Process moat stärks av:** Varje ISO-process, varje NC-ärende, varje capability assessment som loggas i pixdrift är ett klister-lager. Bolaget kan exportera data, men de kan inte exportera *processen* — den är inbakad i hur pixdrift fungerar.

---

### Compliance Moat — SIE4 är den verkliga moaten

**Detta är pixdrifts djupaste vallgrav och den är kronologiskt skyddad.**

Konkreta siffror:
- SIE4 native: Uppskattad utvecklingstid för en utländsk konkurrent: **18-24 månader** (kräver djup kunskap om BAS-kontoplanen, Skatteverkets regler, revisors validering)
- BAS-kontoplan: Inte dokumenterad på engelska i praktiken. Kräver svensk revisionskompetens
- Personalliggare (SFL 39 kap.): Legalmodul med Skatteverket-krav
- Kassaregister SKVFS 2014:9: Certifieringskrav
- ISO 9001-integrering: Byggt i, inte på

**Nordic competitors utan dessa features:** Monday.com, Asana, Notion, Rippling, HubSpot — alla saknar SIE4. För att de ska konkurrera i svenska SMB-segmentet måste de bygga det från grunden. **pixdrift har ett 18-24 månaders teknologiskt försprång, och försprånget ökar med varje compliance-funktion som läggs till.**

---

### Network Effects — Svaga idag, Byggbara

**Idag finns inga network effects i pixdrift.** Det är ett standalone SaaS-verktyg. Varje kund är en ö.

**Hur man bygger network effects:**
1. **Partner-ekosystem** (hög prioritet): 50 redovisningsbyråer som använder pixdrift skapar ett nätverk där varje ny kund *helst* ska vara i pixdrift (för konsultens skull)
2. **Benchmark-data** (medium): "Du har 12.3 timmar/AO — branschen har 10.8. Vill du se vad toppresterande verkstäder gör annorlunda?" — aggregerade anonymiserade branschnyckeltal är ett starkt retention-verktyg
3. **Integrations-marknadsplats** (långsiktig): OEM-integrationer, bokföringssystem, betalsystem — varje ny integration ökar värdet för ALLA kunder
4. **Referral-nätverk** (naturlig): Verkstadschefer pratar med varandra. En nöjd kund i en region är en levande annons för alla konkurrerande verkstäder

**Svag punkt:** Utan aktivt arbete har pixdrift inga network effects. Det måste byggas — det händer inte automatiskt.

---

### Speed Moat — AI-förstärkt Exekvering

**Teorin:** 10 personer + AI-agenter = 50-personers kapacitet.

**Praktiken:** Content, outreach, research, support kan accelereras kraftigt med AI. Men säljcykeln för verkstäder är fundamentalt human — de vill träffa Erik, inte en bot.

**Speed moat gäller för:** Content-produktion, SEO, onboarding, support, monitoring, dataanalys.

**Speed moat gäller INTE för:** Säljcykeln, enterprise-affärer, partner-relations, compliance-certifiering.

**Realistisk bedömning:** AI-förstärkning ger 2-3x effektivitet på operationell nivå — inte 5x. Och det är bra nog för bootstrap-fas.

---

## 1.4 Konkurrentanalys — Verkstadssegmentet

### Keyloop/CDK Global

**Vem de är:** Global DMS-leverantör, ägs av Francisco Partners. Dominerar premium/franchise-segmentet.

**Pris:** €800-1,500/mo beroende på moduler och fordonsmärken. Enterprise-avtal upp till €5,000/mo.

**Svagheter:**
- Legacy-arkitektur (on-premise i många installationer)
- Inget inbyggt ekonomisystem — kräver Fortnox/Visma integration
- Inget inbyggt ISO/compliance-system
- Implementation tar 2-4 månader
- Kundservice är ofta outsourcad, låg NPS
- OEM-tvångsavtal: Volvo-certifierade verkstäder *kan* tvingas köra Keyloop

**Hur pixdrift vinner:** Pris (€500-1,000/mo billigare), enkelhet (Mirror Mode vs 2-månaders implementation), inbyggd ekonomi (eliminerar Fortnox-behovet), modern mekaniker-app.

**Svaghet hos pixdrift vs Keyloop:** OEM-certifiering. Auktoriserade Volvo/BMW-verkstäder är ofta kontraktuellt bundna till godkänd DMS. pixdrift behöver aktivt arbeta för att bli OEM-certifierat — annars stängs de ute från det segmentet.

**Tid innan Keyloop kopierar pixdrift:** 3-5 år. De är ett private equity-ägd legacybolag. De förvärvar inte kopierar. Och de är för stora för att bry sig om 20-mekanikern.

---

### Automaster

**Vem de är:** Nordisk DMS-leverantör, stark i Sverige och Norge.

**Pris:** €500-900/mo (abonnemang), plus setup-avgifter.

**Svagheter:**
- Ingen cloud-native app — klient-installationer fortfarande vanliga
- Inget inbyggt ekonomisystem
- UX från 2010-talets design
- Inget CRM
- Ingen ISO-integration
- Mekaniker-app: rudimentär

**Hur pixdrift vinner:** Modern UI, inbyggd ekonomi, Mirror Mode som importerar deras exakt Automaster-data, cloud-native.

**Tid innan Automaster kopierar:** 2-3 år. Mer agilt än Keyloop, men fortfarande en nordisk nisch-aktör med begränsade dev-resurser.

---

### Winbas

**Vem de är:** Liten svensk DMS-leverantör, fokus på oberoende verkstäder.

**Pris:** €400-700/mo.

**Svagheter:**
- Mycket begränsad modern funktionalitet
- Ingen app
- Inget ekonomisystem
- Liten supportorganisation
- Låg produktutvecklingstakt

**Hur pixdrift vinner:** På alla fronter. Winbas-kunder är de lättaste att konvertera. Mirror Mode importerar Winbas-data direkt.

**Tid innan Winbas kopierar:** Kopierar inte — de har inte resurser. De överlever på befintliga kunder tills de tappas en efter en.

---

### Cabas

**Vem de är:** Nordisk DMS med fokus på fordonssäljare och verkstäder.

**Pris:** €600-1,200/mo beroende på konfiguration.

**Svagheter:**
- Primärt fordonssälj-fokus, verkstad är sekundärt
- Dyr för vad man får
- Ingen inbyggd ekonomi
- Ingen ISO-integration

**Hur pixdrift vinner:** Komplett paket, lägre pris, bättre verkstads-specifika funktioner.

---

### Sammanfattning Konkurrens

**Den gemensamma svagheten hos alla konkurrenter:** De säljer ett verktyg. pixdrift säljer ett operativsystem. Ingen av dem har:
- Inbyggd SIE4/BAS-plan bokföring
- ISO 9001 compliance inbyggt
- Personalliggare SFL integrerat
- Mirror Mode (byta utan risk)
- Modern mekaniker-app med cloud-sync
- Team-flat pricing

**pixdrift har ett 18-24 månaders runway** innan en välfinansierad konkurrent (t.ex. om Visma förvärvar en DMS-spelare och integrerar) kan hota. Använd den tiden smart.

---

# DEL 2: VERTIKAL-STRATEGI

## 2.1 Beachhead-Evaluering (Verkstad)

### Marknadstal

| Geografi | Oberoende bilverkstäder | Auktoriserade verkstäder | Totalt |
|----------|------------------------|--------------------------|--------|
| **Sverige** | ~3,200 | ~1,300 | **~4,500** |
| **Norge** | ~2,000 | ~800 | **~2,800** |
| **Danmark** | ~2,500 | ~900 | **~3,400** |
| **Finland** | ~1,800 | ~700 | **~2,500** |
| **DACH** | ~35,000 | ~18,000 | **~53,000** |
| **UK** | ~22,000 | ~8,000 | **~30,000** |

**Primär ICP (Sverige, oberoende, 5-20 mek):** ~1,800 verkstäder

*Källor/logik: SCB (bilverkstäder 2023), DEKRA-register, Motorbranschens Riksförbund (MRF). Oberoende = ej Mekonomen/Midas-kedja.*

---

### Genomsnittlig Intäkt per Verkstadskund

**Antaganden för ICP (oberoende verkstad, 5-20 mek):**
- Plan: Growth €999/mo (inga Starter-avtal för verkstäder)
- Setup fee: €2,000 (rekommenderas, inte nuläge)
- Årsavtal: -2 månader → €10,989/år
- Upsell år 2: OEM-integration €200/mo → €11,389/år
- ARPU år 1 (med setup fee): **€13,000**
- ARPU år 2: **€11,389**
- ARPU 5-årsscenario: **€57,000** (konservativt)

---

### SAM (Serviceable Addressable Market)

| Geografi | Antal ICP | ARPU/år | SAM |
|----------|-----------|---------|-----|
| Sverige (år 1-2) | 1,800 | €13,000 | **€23.4M** |
| Norden totalt | 5,500 | €13,000 | **€71.5M** |
| DACH (år 3-4) | 15,000 | €11,000 | **€165M** |
| UK (år 3-4) | 8,000 | €11,000 | **€88M** |
| **Total SAM verkstad Europa** | | | **~€347M** |

**SOM år 1 (realistisk penetration 0.5%):** 9 betalande kunder = ~€90K ARR

---

### Tid till 100 Kunder — Om Allt Går Rätt

*"Allt går rätt" = aktiv outreach, partner-kanaler igång, Mirror Mode demo-redo*

| Period | Kunder | Aktivitet |
|--------|--------|-----------|
| Månad 1-2 | 5 | Founder-led direktsälj, 200 outreach |
| Månad 3-4 | 12 | 3 redovisningsbyrå-partners live |
| Månad 5-6 | 22 | Product Hunt + referral-effekt |
| Månad 7-9 | 45 | SDR anställd, referral-program skalat |
| Månad 10-12 | 75 | MRF-partnership, event-kanal |
| Månad 13-15 | 100 | Steady state |

**Tid till 100 kunder om allt går rätt: 15 månader.**

**Tid till 100 kunder med tur och kapital (€200K+): 9-10 månader.**

**Tid till 100 kunder bootstrapped med 150K SEK-budget: 18-24 månader.**

---

## 2.2 Nästa Vertikal (Efter Verkstad)

*Rankat på: Marknadsstorlek × Switching friction × pixdrift-fit*

| Rank | Vertikal | Marknadsstorlek SE | Switching friction | pixdrift-fit | Totalpoäng | Kommentar |
|------|----------|-------------------|-------------------|-------------|------------|-----------|
| **1** | **Konsultbolag** | 8,500 bolag | Hög (process, ISO) | 82/100 | **⭐⭐⭐⭐⭐** | Bästa fit. Saknar tid-tracking (bygg det!) |
| **2** | **Bygg/Entreprenad** | 6,200 bolag | Hög (Personalliggare!) | 71/100 | **⭐⭐⭐⭐** | Personalliggare är redan byggt — killer feature |
| **3** | **Franchisekedjor** | 450 kedjor | Mycket hög | 58/100 | **⭐⭐⭐** | Kräver cross-org hierarchy (ej byggt) |
| **4** | **Fastighetsmäkleri** | 2,800 byråer | Medium | 45/100 | **⭐⭐** | CRM-fit, men inget domänspecifikt |
| **5** | **Restaurang** | 18,000 lokaler | Låg (hög churn) | 44/100 | **⭐⭐** | Fel ICP trots att sidan finns |
| **6** | **Hälso/Sjukvård** | 1,200 privata | Låg (regulatorisk) | 35/100 | **⭐** | Kräver medicinsk certifiering |

**Rekommendation:** Konsultbolag är nästa vertikal. Varför:
- Pixdrift Enterprise Audit score: 82/100 för consulting
- Capability-modulen matchar konsultbranschen perfekt (L1-L5 kompetenshantering)
- ISO 9001 är standard i konsultbranschen
- Enda kritiska missing feature: Tid-tracking (4-6 veckors dev)
- ARPU för konsultbolag: €999-1,499/mo (20-50 anst., Growth/Enterprise)

**Bygg/Entreprenad är outrunner:** Personalliggare-kravet är en *tvingad* anledning att köpa nytt system. Lagstiftning säljer åt pixdrift. Det är unikt.

---

## 2.3 White-Label / Franchise-Modell

### Branschorganisationer (MRF, MECA m.fl.)

**Motorbranschens Riksförbund (MRF):** 2,800 medlemsföretag, starkt förtroende, aktiv i digitalisering.

**Potential:** Om MRF endorsar pixdrift som "Official Digital Platform for MRF Members" med 20% rabatt (€799/mo):
- Potentiell penetration: 400-600 verkstäder (15-20% av MRF-base)
- ARR vid 500 verkstäder: €4.8M
- Tid: 24-36 månader

**White-label pris till MRF:** Minst €700/kund/mo (behåll 70% av normal pris), MRF-branded interface, MRF-stöd.

**Realism-check:** Organisationer som MRF rör sig långsamt. En endorsement tar 6-12 månader att förhandla fram. Men det är värt att initiera tidigt — även ett möte med MRF år 1 bygger trovärdighet.

---

### Franchisegivare

**Potential:** En franchisegivare med 50+ enheter är en deal värd €50K+/år om alla enheter kör pixdrift.

**Krav:** Cross-org hierarchy (parent/child org_id) är **kritisk missing feature** för franchise. Den finns inte idag. Utan den kan pixdrift inte sälja till franchise.

**Timeline:** Bygg cross-org hierarchy (8 veckors dev), sedan pitch franchisegivare.

**Priority:** Medium. Bygg feature, testa med 1 franchise-kund, sedan skalas.

---

### Redovisningsbyråer som White-Label

**Detta är det mest konkreta white-label-tillfället.**

En redovisningsbyrå som erbjuder pixdrift till alla sina kunder som "Byrå Digital Plattform":
- Byrån fakturerar kunderna direkt (markup möjlig)
- pixdrift fakturerar byrån €700/kund/mo (30% rev-share)
- Byrån har kontroll och support-ansvar

**Realistisk partner (stor byrå):**
- Azets (5,000+ kunder i Norden): Om 200 kunder är i segment = €140K/mo
- KPMG Advisory: 50-100 potentiella kunder

**Krav för detta:** API-dokumentation, white-label branding, byråspecifik pricing.

---

## 2.4 Partner-Ekosystem

### Redovisningsbyråer — Viktigaste Kanalen

**Varför redovisningsbyråer är bättre än direkt outreach:**

| Parameter | Direkt outreach | Via redovisningsbyrå |
|-----------|----------------|---------------------|
| CAC | €1,500 | €300-500 |
| Förtroende | Från noll | Transfererat från revisor |
| Churn-risk | Medium | Låg (revisorn är advocate) |
| Säljtid | 3-6 veckor | 1-2 veckor |
| Skalbarhet | Linjär (en i taget) | Multiplikatoreffekt |

**Konkret:** 10 aktiva byrå-partners × 5 kunder/partner/år = 50 kunder/år från partner-kanalen. Med direkt outreach krävs 2,500 email-utskick för samma resultat.

**SRF-konsulterna:** 4,000 auktoriserade redovisningskonsulter i Sverige. **Dessa är det viktigaste säljteamet pixdrift inte anställt ännu.**

---

### OEM-Certifierade Installatörer

**Volvo Cars Workshop:** ~800 auktoriserade verkstäder i Sverige. Om pixdrift blir OEM-certifierat av Volvo (ett strategiskt mål, inte en snabb win) öppnas detta segment.

**Tid till OEM-certifiering:** 12-18 månader (kräver teknisk verifiering, partneravtal, OEM-integration). **Prioritera detta parallellt med sales — det tar tid att processa.**

---

### Hur Strukturerar Man Partner-Programmet

**Tier 1: Referral Partner (Redovisningsbyrå, IT-konsult)**
- Registrering via partner-portal (bygg Q2 2026)
- Onboarding-certifiering: 4 timmars webinar-serie (3 moduler)
- Provision: 2 månaders MRR engång (€1,998 per Growth-kund)
- Krav: 0 kunder minimum (låg tröskel)
- Erbjudande: Gratis demo-konto, co-branded materials

**Tier 2: Certified Implementer**
- Krav: 3 implementerade kunder
- Provision: 20% recurring år 1, 10% år 2+
- Ingår: Priority support, partner badge, co-marketing
- Target: IT-konsulter, digitala byråer

**Tier 3: Strategic Partner (Branschorganisation, OEM)**
- Krav: Anpassad avtalsdiskussion
- Provision: Custom (typiskt 15% recurring + implementation-kit)
- Ingår: Co-branded produkt, dedikaterat Success-stöd

**Budget partner-program (år 1):** 12,000 SEK (per GTM-budget) — täcker kickback för ~3 Tier 1-partners. Realistisk underskattning. Behöver €5,000-10,000 för att fungera.

---

# DEL 3: TILLVÄXTSTRATEGI

## 3.1 Tre Scenarion (12 Månader)

### Konservativt (Bootstrap, 150K SEK ≈ €13K Budget)

*Antaganden: Erik säljer personligen, inga anställda, AI-agenter för content/outreach*

| Period | Kunder | MRR | Aktiviteter |
|--------|--------|-----|-------------|
| Månad 1-2 | 3 | €2,997 | 200 cold emails/vecka, 2 partner-demos |
| Månad 3-4 | 7 | €6,993 | 3 partner-avtal, referral från kund 1-3 |
| Månad 5-6 | 12 | €11,988 | Product Hunt, 200 fler prospects |
| Månad 7-9 | 20 | €19,980 | Referral-program live, partner-scale |
| Månad 10-12 | 28 | €27,972 | Norden-expansion (NO, DK via outreach) |

**€27K MRR vid månad 12. €324K ARR.**

**Kapitalintensitet:** Låg. Founder-lön €0 om nödvändigt. Håller sig vid liv.

---

### Sannolikt (Med Rätt Exekvering)

*Antaganden: Erik + 1 SDR (anställd månad 3), partner-program live månad 2, Product Hunt Q2*

| Period | Kunder | MRR | Aktiviteter |
|--------|--------|-----|-------------|
| Månad 1-3 | 8 | €7,992 | Founder-led, 10 partner-demos, Mirror Mode demo-ready |
| Månad 4-6 | 20 | €19,980 | SDR anställd, Product Hunt (€5K MRR boost), 5 partner-avtal |
| Månad 7-9 | 38 | €37,962 | Partner-scale, referral-program, ALMI-lån ansökt |
| Månad 10-12 | 55 | €54,945 | DACH-expansion start, NO/DK kunder, 2 enterprise-piloter |

**€55K MRR vid månad 12. €660K ARR.**

**Kapitalintensitet:** Medium. ALMI-lån €500K SEK + befintligt kapital. SDR + Customer Success.

---

### Aggressivt (Med Seed-Kapital €500K)

*Antaganden: Kapital säkrat Q2 2026, 3 AE (Account Executives), DACH-partner aktiv, brand-push*

| Period | Kunder | MRR | Aktiviteter |
|--------|--------|-----|-------------|
| Månad 1-3 | 15 | €14,985 | Samma som Sannolikt |
| Månad 4-6 | 35 | €34,965 | 3 AE anställda, DACH-lokalisering klar, 10 partner-avtal |
| Månad 7-9 | 70 | €69,930 | Verkstad + Konsult parallellt, 3 DACH-kunder |
| Månad 10-12 | 120 | €119,880 | Franchise-modul klar, 5 enterprise-piloter, UK-expansion |

**€120K MRR vid månad 12. €1.44M ARR.**

**Kapitalintensitet:** Hög. €500K seed räcker till ~14 månader med 5-personers team. Kräver Series A vid månad 14-16.

---

## 3.2 Kapitalbehov och Timing

### Bootstrapped Path (Rekommenderas för månader 1-9)

**Varför inte resa kapital nu:**
- 0 betalande kunder = minimal förhandlingsstyrka
- Venture-värdering vid €0 ARR: oklart, risk för 30-40% dilution för €500K
- Samma €500K vid €50K MRR ger 15-20% dilution

**Break-even analys:**
- 10 kunder × €999 = €9,990/mo gross
- Personalkostnad (Erik + 1 part-time): ~€8,000/mo
- Infrastructure + verktyg: ~€1,500/mo
- **Break-even: 10 betalande kunder**

**10 kunder = ekonomisk hållbarhet utan externt kapital.**

---

### Optimal Fundraise-Trigger

**Timing:** Resa kapital när *alla* följande kriterier uppfylls:
- ✅ €30K MRR (30 betalande kunder)
- ✅ <4% månadsvis churn (3+ månader)
- ✅ LTV/CAC-ratio verifierat >10:1
- ✅ 5+ referenskunder med case studies
- ✅ DACH-prospect-lista byggd (signalerar global ambition)

**Realistisk timing:** Månad 8-10 (i Sannolikt-scenariot)

---

### Hur Mycket och Vad Används Det Till

**Seed-runda: €500K-€1M**

| Användning | €500K | €1M |
|-----------|-------|-----|
| Sales team (2-3 AE + SDR) | €180K (12 mo) | €280K |
| DACH-expansion (lokalisering, DATEV, legal) | €80K | €120K |
| Product (tid-tracking, cross-org, job monitoring) | €60K | €100K |
| Marketing (brand, events, content) | €50K | €80K |
| Legal + compliance (ISO 27001, UK MTD) | €30K | €50K |
| Infrastructure upgrade (multi-AZ, Redis) | €30K | €50K |
| Runway buffer (12 mo) | €70K | €320K |

**Med €500K seed: 12-14 månaders runway. Kräver €3M Series A vid månad 14.**
**Med €1M seed: 18-20 månaders runway. Bättre position.**

---

### Nordic VC-Lista (Prioriterad)

| VC | Varför relevant | Ticket | Kontaktpersoner |
|----|----------------|--------|-----------------|
| **Luminar Ventures** | B2B SaaS Nordic focus, rätt storlek | €500K-€2M | luminarventures.com |
| **byFounders** | Nordic founders, Seed-specialist | €200K-€2M | byfounders.vc |
| **Inventure** | Nordic B2B, förstår Norden | €200K-€2M | inventure.fi |
| **Industrifonden** | Swedish, tech-focus, patient capital | €500K-€5M | industrifonden.se |
| **Northzone** | Norden→Europa, B2B playbooks | €2M-€10M (Series A) | northzone.com |
| **Creandum** | B2B SaaS champions, Spotify etc. | Series A focus | creandum.com |

**Approach:** Build relationship 6 månader INNAN du pitchar. Skicka månadsuppdateringar till 3-4 partners från dag 1. "Wanted to share our first month: 3 paying customers, €2,997 MRR, 0 churn. Building for DACH in Q4."

---

### Alternativ: Revenue-Based Financing (RBF)

**Clearco, Capchase, Arc:** Ger kapital baserat på ARR × 3-6x, återbetalas som % av intäkter.

**Krav:** Typiskt €10K+ MRR, >6 månaders historik.

**Villkor (estimat):** €100K vid €15K MRR, 8-12% av månatliga intäkter tills €115-120K återbetalat.

**Rätt för:** Bridgefinansiering till seed-runda. Skalning av outreach-budget utan equity dilution.

---

## 3.3 Team-Behov

### Nuläge: 10 Pers + AI-Agenter

*Okänd fördelning, men antaget: Erik (VD/tech), 2-3 devs, 1-2 design/content, 1 ops*

**Vad saknas:**

---

### Säljare (Account Executive) — När och Vilken Typ

**Rekrytera AE vid:** €15K MRR (15 kunder). Tidigare är det för tidigt — sälprocessen är inte tillräckligt testad.

**Profil:** Ej enterprise-AE. En **verkstads-kunnig** AE med tidigare erfarenhet från Automaster, Keyloop eller liknande. De kan prospektera, demonstrera, och snacka teknik med mekanikerchefer.

**Lön:** €4,500-6,000/mo base + provision (10-15% av ARR first year).

**KPI:** 3 nya kunder/månad. Break-even om de stänger 4.5 kunder/mo.

---

### Customer Success — När och Varför Nu

**Rekrytera CS vid:** 20 kunder, ELLER när churn börjar dyka upp (välj det som kommer först).

**Varför CS är kritisk:** 
- Vid 80% gross margin är churn extremt kostsamt (varje churnad kund kräver en ny att ersätta)
- CS är retention-motorn — proaktivt contact vid dag 7, 30, 60, 90 är skillnaden mellan 3% och 8% churn

**Profil:** Tekniskt lagd person med service-mindset. Bakgrund i SaaS-support, gärna med branschkunskap (ekonomi/verkstad).

**Lön:** €3,500-4,500/mo. Betalar sig om de förhindrar 2 churns/kvartal.

---

### Teknisk Medgrundare — Behövs?

**Brutalt ärlig bedömning:** Det beror på vem som är CTO idag.

**Om Erik är ensam tech-beslutsfattare:** Ja, teknisk co-founder eller senior CTO behövs. Enterprise-kunder kräver security reviews, ISO 27001-arbete, och arkitekturella beslut om Supabase-exit-plan. Det är heltidsarbete.

**Om det finns en tech-lead i teamet:** Nej, ingen teknisk medgrundare. Men den tech-leaden måste ha mandat och lön att matcha.

**Vad som faktiskt behövs:** 1 senior backend-ingenjör med security-kompetens. Kostnad: €6,000-8,000/mo. Utan denna kan enterprise-sales blockeras av security-audits.

---

# DEL 4: DE 5 VIKTIGASTE BESLUTEN NU

## Beslut 1: Vilken Kanal Prioriterar du Vecka 1-8?

**Vad det handlar om:** Outbound cold email vs redovisningsbyrå-partner vs event. Med begränsat kapital och tid kan du bara köra en kanal riktigt bra.

**Alternativ A:** Cold email outreach (200 emails/vecka till verkstäder)
**Alternativ B:** Redovisningsbyrå-partner (identifiera, boka, onboarda 5 byråer)

**Rekommendation: B — Redovisningsbyrå-partner**

**Motivering:**
- CAC byrå-kanal: €300-500 vs cold outreach €1,500
- En aktiv byrå med 50 SME-kunder genererar 3-5 kunder/år passivt
- Byråer pratar med sina kunder OM bokföring, systemval och kostnadseffektivitet — precis när pixdrift är relevant
- Förtroendeöverföring: En verkstadschef som hör om pixdrift från sin revisor köper på 2-3 veckor, inte 6

**Konsekvens om fel val:** Cold outreach ger snabbare första 2-3 kunder men linjär skalbarhet. Byrå-kanal tar 4-6 veckor att sätta upp men ger exponentiell potential. Väljer du cold email i 3 månader och sedan pivots till byrå — du har förlorat 3 månader av compound-growth.

---

## Beslut 2: Ska du Ta Setup-Avgift?

**Vad det handlar om:** Nuläget är 0 setup-fee, allt "ingår". Det sänker köptröskel men sänker också upplevt värde och kapar kassaflödet.

**Alternativ A:** Behåll gratis setup (lägre tröskel, snabbare close)
**Alternativ B:** Introducera €2,000 setup-fee som standard ("Certified Implementation")

**Rekommendation: B — Introducera Setup-Fee**

**Motivering:**
- €2,000 × 30 kunder år 1 = €60,000 extra kassaflöde
- Setup-fee signalerar att implementationen är professionell och värdefull
- Kunder som betalar setup-fee churnar LESS (de är mer investerade)
- Konkurrenter (Keyloop, Automaster) tar €5,000-20,000 i setup — €2,000 är fortfarande lägre

**Konsekvens om fel val:** Du lämnar €60K på bordet år 1. Och du skapar förväntningen att "byta system är gratis" — som du sedan inte kan ta betalt för.

---

## Beslut 3: Vilken ICP Fokuserar du på Månad 1-6?

**Vad det handlar om:** Verkstad ELLER konsultbolag (de är bakom med att bygga tid-tracking, men 82/100 fit).

**Alternativ A:** 100% verkstad (beachhead-strategi, Mirror Mode redo)
**Alternativ B:** Verkstad + konsult parallellt (bredare TAM, snabbare till €50K MRR)

**Rekommendation: A — 100% Verkstad de första 6 månaderna**

**Motivering:**
- Mirror Mode är redo för verkstad. Tid-tracking finns inte för konsult.
- Att sälja konsult utan tid-tracking är att sälja ett halvfärdigt system
- Verkstads-ICP har tydligare ROI-story (räkna på en servett)
- 5 verkstads-referenskunder + 1 case study = fundament för konsult-ICP
- Delad fokus med litet team = ingen kanal körs bra

**Konsekvens om fel val:** Du springer på två harar och fångar ingen. Konsulter frågar om tid-tracking och du lovar "det kommer snart" — det skadar trovärdigheten.

---

## Beslut 4: När Anställer du Din Första Säljare?

**Vad det handlar om:** För tidig anställning dödar kassaflödet. För sen = du kan inte skala.

**Alternativ A:** Anställ AE direkt (månad 1-2, "vi behöver sales-kapacitet nu")
**Alternativ B:** Founder-led sales tills €15K MRR, SEDAN anställ AE

**Rekommendation: B — Vänta till €15K MRR**

**Motivering:**
- Innan €15K MRR finns ingen bevisad playbook att ge en AE. Du vet inte exakt vilket pitch som stänger, vilka objektioner som är fatala, vilka kanaler som konverterar
- En AE kostar €5,000-6,000/mo. Vid €5K MRR är det 100% av intäkterna
- Founder-led sales ger produktinsikter ingen AE kan ge — du lär dig marknaden
- "Hire slow" gäller extra starkt för first AE — en dålig AE förstör relationer och skadar varumärket

**Konsekvens om fel val:** En AE anställd för tidigt ger 3 månaders salary-burn (€15,000-18,000) utan proportionell intäktsökning, och gör det svårare att nå break-even.

---

## Beslut 5: Ska du Söka Externt Kapital Nu?

**Vad det handlar om:** VC nu (pre-revenue, sämre villkor) eller bootstrap till traction?

**Alternativ A:** Resa €500K seed nu — accelerera tidslinje
**Alternativ B:** Bootstrap till €30K MRR, SEDAN resa kapital från styrkeposition

**Rekommendation: B — Bootstrap till €30K MRR**

**Motivering:**
- Pre-revenue valuation: En VC som investerar €500K tar 25-35% equity (impliedVal €1.4-2M). Det är för billigt för ett system med denna komplexitet
- Vid €30K MRR (SaaS × 60x ARR multipelm) är implied valuation €21.6M. €500K = 2.3% dilution. En order of magnitude bättre
- ALMI-lån (500K-1M SEK, ingen equity) bridgar gapet fram till €30K MRR
- Bootstrap tvingar disciplin: du kan inte "spendera dig till kunder" — du måste hitta vad som faktiskt fungerar

**Konsekvens om fel val:** Om du tar €500K nu mot 30% equity, och sedan når €1M ARR, har du "lämnat" €300K i value på bordet. Och VC-pressen kan driva dig att ta suboptimala beslut (gå till USA för tidigt, bränna budget på ads som inte konverterar).

**Undantag:** Om det finns en warm intro till en Nordic VC som vill investera till rimlig valuation (€5-8M pre-money) OCH kan ge strategiskt värde (intro till MRF, DACH-kontakter etc.) — ta mötet. Men acceptera inte vilket villkor som helst.

---

# DEL 5: 90-DAGARS ACTIONPLAN

## Vecka 1-2 (Denna Vecka) — Foundation

### Exakta Åtgärder

| # | Åtgärd | Ansvarig | KPI |
|---|--------|----------|-----|
| 1 | Kartlägg 50 redovisningsbyråer i Stockholm/Göteborg (LinkedIn, SRF-register) | Erik | Lista klar med kontaktinfo |
| 2 | Skriv personligt outreach-brev till 10 byråer (founder-till-partner) | Erik | 10 emails ute dag 5 |
| 3 | Sätt terminology presets klara för Automaster, Winbas, Keyloop i demo-miljö | Tech | Demo-redo |
| 4 | Bygg minimal ROI-kalkylator på pixdrift.com/verkstad/ | Tech | Live |
| 5 | Identifiera 100 bilverkstäder via Google Maps + LinkedIn (Stockholm → Uppsala → Göteborg) | Research-agent | Lista klar |
| 6 | Ansök om ALMI-lån (500K SEK, ingen equity, 3-4% ränta) | Erik | Ansökan inlämnad |
| 7 | Dokumentera Mirror Mode demo-script (45 min) | Erik | Script finaliserat |
| 8 | Skapa partner-onboarding-material (one-pager, pricing, provision-struktur) | Erik + Content | PDF redo |

### Mätbara KPIs Vecka 2
- 10 redovisningsbyrå-emails skickade
- 100 verkstads-prospects identifierade
- ALMI-ansökan inlämnad
- ROI-kalkylator live
- Demo-miljö redo för 3 source-system

---

## Vecka 3-4 — Outreach Startar

| # | Åtgärd | Ansvarig | KPI |
|---|--------|----------|-----|
| 1 | Skicka 100 cold emails till verkstäder (Batch 1) | Outreach-agent | 100 emails |
| 2 | Boka 3 byrå-demos (av 10 utskick) | Erik | 3 möten i kalender |
| 3 | LinkedIn-posting startar: 2 posts/vecka (Mirror Mode story + verkstads-ROI) | Content-agent | 4 posts publicerade |
| 4 | Genomför 3 byrå-demos med partner-pitch | Erik | Feedback dokumenterad |
| 5 | Bygg SEO-pillar page: "Vilket DMS-system passar din bilverkstad 2026?" | Content-agent | Publicerad |
| 6 | Skapa onboarding-email-sekvens dag 1, 3, 7, 14, 30 | Support-agent | Automatiserat i Intercom/Crisp |

### Mätbara KPIs Vecka 4
- 5+ replies från cold emails (>5% reply rate)
- 2+ byrå-demos genomförda
- 2+ discovery calls bokade med verkstäder
- Första betalande kund: Mål 1 (€999 i Stripe)

---

## Månad 2 — Första Kunder + Partner-Aktivering

### Vecka 5-6

| # | Åtgärd | Ansvarig | KPI |
|---|--------|----------|-----|
| 1 | 150 cold emails Batch 2 | Outreach-agent | 150 emails |
| 2 | Signera 2 redovisningsbyrå-avtal (Tier 1 Referral) | Erik | 2 partneravtal |
| 3 | Genomför 4 verkstads-demos (Mirror Mode full demo) | Erik | 4 demos |
| 4 | Starta gratis 30-dagars pilot med 2 verkstäder | Tech + Erik | 2 piloter live |
| 5 | Bygg case study-mall (för pilot-kund dag 30) | Content-agent | Mall redo |
| 6 | G2/Capterra-profil skapad | Marketing | Profil live |

### Vecka 7-8

| # | Åtgärd | Ansvarig | KPI |
|---|--------|----------|-----|
| 1 | Konvertera pilot 1 och pilot 2 → betalande kunder | Erik | €1,998/mo ny MRR |
| 2 | Referral ask hos kund 1: "Introducera 2 kollegor" | Erik | 2+ intros |
| 3 | Byrå-partner webinar: "Hur pixdrift sparar dina klienters tid" | Erik + Byrå | 20+ deltagare |
| 4 | ALMI-beslut (svar ~4-6 veckor) | Erik | Beslut väntat |
| 5 | LinkedIn viralt-fokus-post: "Vi bytte från 4 system till 1" (kund-story) | Content-agent | >300 likes target |

### KPIs Månad 2
- 5-7 betalande kunder
- €5,000-7,000 MRR
- 2 aktiva redovisningsbyrå-partners
- 1 case study publicerad
- 3+ aktiva referrals i pipeline

---

## Månad 3 — Scale + Product Hunt + DACH-prep

### Vecka 9-10

| # | Åtgärd | Ansvarig | KPI |
|---|--------|----------|-----|
| 1 | Product Hunt "Upcoming" page live | Marketing | 100+ subscribers |
| 2 | 200 cold emails Batch 3 (utöka geografin: Malmö, Örebro, Västerås) | Outreach-agent | 200 emails |
| 3 | Bygg tid-tracking MVP-spec (kritisk feature för konsult-ICP) | Tech | Spec godkänd |
| 4 | Norsk outreach startar: 50 norska verkstäder | Outreach-agent | 50 emails |
| 5 | Anmäl pixdrift till Breakit Summit (maj 2026) | Erik | Bekräftad |
| 6 | Kontakta MRF (Motorbranschens Riksförbund) — introduktionsmöte | Erik | Möte bokat |

### Vecka 11-12

| # | Åtgärd | Ansvarig | KPI |
|---|--------|----------|-----|
| 1 | Product Hunt Launch | Alla | Top 5 day |
| 2 | Konvertera 3-4 piloter → betalande | Erik | €3,000-4,000 ny MRR |
| 3 | DATEV-integration research (kräver DACH-expansion månad 5-8) | Tech | Research-rapport |
| 4 | Rekrytera Byrå-partner 3, 4, 5 | Erik | 5 aktiva partners |
| 5 | Churn-review: Varför churnar folk? (om churn uppstår) | Data-agent + Erik | Insights-dokument |

### KPIs Månad 3
- 10-15 betalande kunder
- €10,000-15,000 MRR
- 5 aktiva byrå-partners
- 3+ norska prospects i pipeline
- Product Hunt genomförd
- Tid-tracking i development

---

## Critical Path

Det som MÅSTE stämma för att planen ska hålla:

```
VECKA 1: ROI-kalkylator live + demo-miljö redo
         ↓
VECKA 2: Byrå-outreach startar (10 emails)
         ↓ 
VECKA 4: 2 byrå-demos → minst 1 intresserad partner
         ↓
VECKA 5: 2 verkstads-piloter startar
         ↓
VECKA 8: 2 betalande kunder från piloter (INFLECTION POINT)
         ↓
MÅNAD 2: 5+ kunder, €5K MRR (bootstrap validates)
         ↓
MÅNAD 3: 10+ kunder, Product Hunt, €15K MRR
         ↓
MÅNAD 6: 25 kunder, €25K MRR (ALMI-lån bridgar)
         ↓
MÅNAD 9: 40 kunder, €40K MRR (VC pitch-redo)
```

**Om vecka 8-kravet (2 betalande kunder) inte uppnås:** Omvärdera messaging, demo-flow, och pricing. Problemet är inte produkten — det är presentationen. Boka 3 kundintervjuer och lyssna.

---

# SAMMANFATTNING: TOP 5 INSIKTER

## 1. Redovisningsbyrå-kanalen är 5x effektivare än cold outreach

CAC via byrå (€300-500) vs cold email (€1,500). Byrå-kunder churnar mindre, konverterar snabbare, och betalar mer (de har råd, revisorn har validerat). Ändå är cold outreach vad alla fokuserar på. **Börja med byråer.**

## 2. Mirror Mode är inte en feature — det är den enda säljstrategi som fungerar för verkstäder

Verkstadschefer köper inte system. De köper trygghet att inte förstöra verksamheten. Mirror Mode omformulerar köpfrågan från "ska vi byta?" till "ska vi prova?" Det är psykologiskt revolutionerande. Demo:n ska visa dataimport + terminologibyte + garantiärendets säkerhet — i den ordningen. Det är den magiska sekvensen.

## 3. €999/mo är för billigt om du tar setup-fee — men perfekt om du inte gör det

€999 utan setup-fee = €11,988/år. Med setup-fee €2,000 = €13,988 år 1. Och kunder som betalar setup-fee churnar signifikant less (de är emotionellt investerade). Introducera setup-fee NU — inte som "vi höjer priset" utan som "vi garanterar er implementation."

## 4. Scope creep kan döda pixdrift snabbare än konkurrenter

497 endpoints mot annonserade 82. 10+ moduler. Verkstad + restaurang + konsult + bygg + franchise parallellt. Det är ett system som inte vet vad det är. Välj en ICP, gå djup, bygg 5 case studies, och expandera därifrån. Varje ny modul ökar support-belastning, onboarding-komplexitet och churn-risk utan proportionell intäktsökning.

## 5. €1M ARR är 12-18 månader bort — inte 36

Med 4,500 oberoende bilverkstäder i Sverige, Growth €999, Mirror Mode-differentieringen, och redovisningsbyrå-kanalen är €1M ARR realistiskt vid månad 15-18 (sannolikt scenario) eller månad 10-12 (aggressivt scenario med €500K seed). Det är en nisch som är tillräckligt stor för ett fundament — och tillräckligt liten för att pixdrift kan dominera den.

---

# VIKTIGASTE BESLUTET

**Beslutet som avgör allt:** Ska pixdrift vara ett verkstadssystem som råkar ha OMS-features, eller ett OMS som råkar ha verkstadsfeatures?

Svaret avgör varje säljsamtal, varje hiring-beslut, varje product-roadmap-beslut för de nästa 24 månaderna.

**Rekommendation:** Var ett **verkstadssystem** de nästa 12 månaderna. Sedan, med 50 verkstads-referenskunder och €50K MRR, bygg den horisontella OMS-plattformen ovanpå ett bevisat fundament.

Tesla byggde inte en "generalfordon-plattform" från dag ett. De byggde Roadster, sedan Model S, sedan Model 3. Varje modell finansierade nästa. pixdrift bör göra detsamma.

---

*Rapport upprättad: 2026-03-21*  
*Nästa revision: 2026-06-21 (efter 90-dagars sprint)*  
*Kontakt: OpenClaw Business Strategy Analysis*

---

> **Disclaimer:** Alla unit economics-beräkningar baseras på bransch-benchmarks och rimliga antaganden. Faktisk data från betalkunder bör ersätta dessa uppskattningar snarast möjligt. Marknadstal är estimat baserade på tillgänglig branschdata (SCB, MRF, DEKRA).
