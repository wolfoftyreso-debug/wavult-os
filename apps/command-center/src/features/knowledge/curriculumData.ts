// ============================================================
// Systemskolan — 30-dagars kursplan
// TypeScript-konvertering av CURRICULUM från newsletter-curriculum.js
// ============================================================

export interface Lesson {
  day: number
  system: string
  emoji: string
  color: string
  title: string
  analogy: string
  technical: string
  connection: string
  tomorrow: string
}

export const CURRICULUM: Lesson[] = [
  // ── VECKA 1: INFRASTRUKTUR-GRUNDEN ──────────────────────
  {
    day: 1,
    system: 'AWS',
    emoji: '☁️',
    color: '#FF9500',
    title: 'Vad är AWS — förklarat för en 3-åring',
    analogy:
      'Föreställ dig att du har en leksak hemma. Du kan leka med den, men bara du kan nå den. AWS är som ett enormt lekrumshotell. Istället för att ha datorer hemma, hyr vi plats i Amazons jättestora datorhallar runt om i världen. Vår app bor där — och kan nås av vem som helst, var som helst, när som helst.',
    technical:
      'Vi använder ECS (kör vår serverkod i containers), ECR (lagrar kodpaket) och CloudFront (levererar appen blixtsnabbt globalt).',
    connection:
      'Användaren öppnar Wavult OS → Cloudflare skyddar → CloudFront levererar appen → ECS kör servern → Supabase ger data. Allt på <200ms.',
    tomorrow: 'Supabase — vad är egentligen en databas?',
  },
  {
    day: 2,
    system: 'Supabase',
    emoji: '🗄️',
    color: '#34C759',
    title: 'Supabase — vår hjärna som minns allt',
    analogy:
      'Tänk dig en gigantisk anteckningsbok. Varje gång en zoomer slutför ett uppdrag på quiXzoom, skrivs det ner. Varje uppdrag, varje zoomer, varje larm — allt lagras och kan sökas fram på millisekunder. Det är en databas.',
    technical:
      'Supabase är en "Backend as a Service" byggd på PostgreSQL. Vi slipper bygga auth, realtidsuppdateringar och REST-API från scratch — Supabase ger oss det direkt.',
    connection:
      'Vår server (ECS på AWS) pratar med Supabase via en service role key. Frontenden (appen) kan även prata direkt med Supabase för realtidsdata.',
    tomorrow: 'GitHub — hur vi samarbetar kring kod',
  },
  {
    day: 3,
    system: 'GitHub',
    emoji: '🐙',
    color: '#5E9CF5',
    title: 'GitHub — kodens hemvist och tidmaskin',
    analogy:
      'Föreställ dig att du skriver en bok med 5 personer. Utan system skriver alla på samma sida samtidigt — kaos. GitHub är som Google Docs för kod. Alla kan jobba på sin del, och systemet håller koll på alla ändringar. Gick något fel? Vi kan backa till igår.',
    technical:
      'Git är versionshantering. GitHub är molntjänsten som lagrar vårt git-repo. Varje "commit" är en sparad version. "Push" laddar upp till GitHub. "Actions" kör automatiska tester och deploy vid varje push till main.',
    connection:
      'Vi pushar kod → GitHub Actions bygger Docker image → pushar till AWS ECR → ECS startar ny version. Det är hela vår deploy-pipeline.',
    tomorrow: 'Cloudflare — vår säkerhetsvakt och snabbhetsmotorn',
  },
  {
    day: 4,
    system: 'Cloudflare',
    emoji: '🛡️',
    color: '#FF9500',
    title: 'Cloudflare — säkerhetsvakten som gör allt snabbt',
    analogy:
      'Tänk dig en populär restaurang. Utan vakt kan vem som helst storma in och orsaka kaos. Cloudflare är vakten vid dörren — kontrollerar vem som kommer in, blockerar bråkstakar (DDoS-attacker) och guidar gäster till rätt bord snabbast möjligt.',
    technical:
      'Cloudflare är ett CDN + WAF (Web Application Firewall). Våra DNS-poster pekar på Cloudflare, som sedan proxar trafik till vår server. Vi använder det för: SSL-certifikat, DDoS-skydd, caching, och URL-redirects.',
    connection:
      'Domänerna wavult.com och quixzoom.com pekar på Cloudflare. Cloudflare bestämmer vad som ska cach:as lokalt och vad som ska skickas vidare till AWS/Vercel.',
    tomorrow: 'OpenClaw — vår AI-assistent som faktiskt gör saker',
  },
  {
    day: 5,
    system: 'OpenClaw',
    emoji: '🦞',
    color: '#BF5FFF',
    title: 'OpenClaw — AI-assistenten som skickar det här mailet',
    analogy:
      'Ni vet hur Siri eller Google Assistant kan svara på frågor? OpenClaw är som en betydligt smartare version som faktiskt kan utföra arbete — köra kod, kolla serverstatus, skicka mail, deploya kod. Det är Bernt (er AI-kollega) som kör på OpenClaw.',
    technical:
      'OpenClaw är en lokal AI-gateway som kopplar Claude (Anthropics AI-modell) till verktyg: shell-kommandon, filsystem, webb-API:er, cron-jobb. Bernt kör som en agent med tillgång till era servers, GitHub och AWS.',
    connection:
      'OpenClaw → Claude (AI-hjärnan) → Tools (shell, web, files) → Era system. Det är så Bernt kan fixa deploy-problem kl 02:00 och skicka det här mailet automatiskt kl 08:00.',
    tomorrow: 'Stripe — hur vi tar betalt',
  },
  {
    day: 6,
    system: 'Stripe',
    emoji: '💳',
    color: '#5E9CF5',
    title: 'Stripe — betalningsinfrastrukturen bakom allt',
    analogy:
      'När du köper något i en fysisk butik finns det en kortläsare som pratar med din bank. Stripe är den digitala kortläsaren för internet — men en miljard gånger smartare. De hanterar säkerhet, valutaomvandling, fakturahantering och prenumerationer.',
    technical:
      'Stripe hanterar: engångsbetalningar, SaaS-prenumerationer (recurring), webhooks (notifierar oss när betalning lyckas/misslyckas), och Stripe Connect (zoomer-utbetalningar). PCI-compliance ingår.',
    connection:
      'Landvex-kund betalar via Stripe → Stripe webhook → vår server på ECS → Supabase markerar kontot som aktivt → kunden får tillgång till plattformen.',
    tomorrow: 'Revolut — vår moderna företagsbank',
  },
  {
    day: 7,
    system: 'Revolut Business',
    emoji: '🏦',
    color: '#34C759',
    title: 'Revolut — banken som hänger med i 2026',
    analogy:
      'Traditionella banker är som postkontor — de finns till, men är långsamma, dyra och krångliga. Revolut Business är som Swish på steroider för företag. Instant transfers, multi-valuta, utgiftskort till teamet, automatisk bokföring.',
    technical:
      'Revolut Business erbjuder: multi-currency accounts (SEK, EUR, USD, GBP), virtuella kort per projekt/avdelning, API-integration för automatiska utbetalningar, och direkt integration med bokföringssystem.',
    connection:
      'Stripe-intäkter → Revolut Business-konto → utgifter (AWS, GitHub, domäner, löner). Vi kan ha separata virtuella kort för varje kostnadscenter.',
    tomorrow: 'Google Search Console — hur vi syns på Google',
  },

  // ── VECKA 2: SYNLIGHET & TOOLS ──────────────────────────
  {
    day: 8,
    system: 'Google Search Console',
    emoji: '🔍',
    color: '#FFD60A',
    title: 'Google Search Console — hur Google ser oss',
    analogy:
      'Tänk dig att Google är en enorm bibliotekarie som indexerar alla böcker på internet. Search Console är som ett direkttelefonnummer till bibliotekarien — vi kan fråga "har du hittat vår bok?" och "hur ofta letar folk efter den?"',
    technical:
      'GSC visar: vilka sökord vi rankar på, hur många klick vi får, vilka sidor Google indexerat, tekniska fel (404, crawl-errors), Core Web Vitals-scores. Vi kan också manuellt be Google indexera nya sidor.',
    connection:
      'Ny sida publiceras → vi pingar GSC → Google crawlar sidan → indexeras → syns i sökresultat. Utan GSC vet vi inte hur länge det tar eller om något gick fel.',
    tomorrow: 'Docker — boxarna som gör deploy förutsägbar',
  },
  {
    day: 9,
    system: 'Docker',
    emoji: '🐳',
    color: '#5E9CF5',
    title: 'Docker — varför "fungerar på min dator" är ett minne blott',
    analogy:
      'Föreställ dig att du lagar en rätt hemma och den smakar perfekt. Du skickar receptet till en vän men hen saknar samma ugn, kryddor och höjd över havet. Docker är som att skicka hela ditt kök — ugnen, kryddorna, allt — i en låda. Garanterad samma resultat.',
    technical:
      'Docker packar vår app + alla beroenden i en "container image". Samma image körs lokalt, i CI och på AWS ECS. Dockerfile = recept. Image = den färdiga maten. Container = maten som körs.',
    connection:
      'Vi pushar kod → GitHub Actions bygger Docker image med vår Dockerfile → pushar image till AWS ECR → ECS startar en ny container med den imagen.',
    tomorrow: 'DNS — internets telefonbok',
  },
  {
    day: 10,
    system: 'DNS & Domäner',
    emoji: '📡',
    color: '#FF453A',
    title: 'DNS — internets telefonbok',
    analogy:
      'Alla datorer på internet har en siffrig adress (IP), ungefär som ett telefonnummer. DNS är som en telefonbok — när du skriver "wavult.com" slår den upp vilket IP-nummer det motsvarar och kopplar dig dit.',
    technical:
      'DNS-poster vi använder: A-record (pekar domän → IP), CNAME (alias, t.ex. www → wavult.com), MX (mail-routing), TXT (verifiering för Google, Stripe etc). Cloudflare är vår DNS-provider och hanterar alla records.',
    connection:
      'wavult.com → Cloudflare DNS → Cloudflare proxy → AWS CloudFront → vår app. Ändrar vi DNS tar det upp till 24h att sprida sig globalt (TTL).',
    tomorrow: 'TypeScript — varför vi skriver "typad" kod',
  },
  {
    day: 11,
    system: 'TypeScript',
    emoji: '🔷',
    color: '#5E9CF5',
    title: 'TypeScript — kod med säkerhetsbälte',
    analogy:
      'JavaScript är som att köra bil utan säkerhetsbälte — det funkar, men kraschen är smärtsam. TypeScript lägger på säkerhetsbältet. Det berättar för oss om fel INNAN vi kör koden, inte när kunden redan sitter i appen.',
    technical:
      'TypeScript är ett superset av JavaScript som lägger till static typing. Vi kompilerar TS → JS innan deploy. Fördelar: autocomplete, fler fel hittas vid kompilering, bättre teamwork (alla vet vad en funktion förväntar sig).',
    connection:
      'Hela vår server (server/src/) och Wavult OS-appen är skriven i TypeScript. tsc kompilerar. tsx kör TypeScript direkt i Node utan kompilering (används i produktion via Docker).',
    tomorrow: 'React & Next.js — hur vi bygger användargränssnitt',
  },
  {
    day: 12,
    system: 'React & Next.js',
    emoji: '⚛️',
    color: '#5E9CF5',
    title: 'React — byggstenarna i vår app',
    analogy:
      'Tänk dig LEGO. Varje LEGO-bit är en "komponent" — en knapp, en meny, ett formulär. React låter oss bygga hela appen av återanvändbara bitar. Ändrar vi en bit uppdateras allt som använder den automatiskt.',
    technical:
      'React är ett JavaScript-bibliotek för UI. Next.js är ramverket ovanpå som ger: server-side rendering (snabbare SEO), filbaserad routing, API-routes och edge-funktioner. Landvex-frontenden körs i Next.js.',
    connection:
      'Next.js-app → byggs till statiska filer → deployas till Cloudflare Pages. Pratar med backend via REST API (vår ECS-server).',
    tomorrow: 'Node.js & Express — vår servermiljö',
  },
  {
    day: 13,
    system: 'Node.js & Express',
    emoji: '🟢',
    color: '#34C759',
    title: 'Node.js — JavaScript på serversidan',
    analogy:
      'JavaScript uppfanns för webbläsaren. Node.js är som att ta motorn ur bilen och köra den i ett fabrikslokale — samma motor, helt nya möjligheter. Vi kan köra JavaScript på servern, utan webbläsare.',
    technical:
      'Node.js kör vårt API. Express är webbramverket — hanterar HTTP-requests, routing och middleware. Vår server lyssnar på port 3001 och exponeras via AWS ECS bakom en load balancer.',
    connection:
      'React-appen skickar request → ECS kör vår Express-server → Express router matchar URL → controller hanterar logik → Supabase hämtar data → svar skickas tillbaka till appen.',
    tomorrow: 'Vercel — enklaste sättet att deploya Next.js',
  },
  {
    day: 14,
    system: 'Vercel',
    emoji: '▲',
    color: '#fff',
    title: 'Vercel — deploy på 30 sekunder',
    analogy:
      'Att deploya en hemsida brukade kräva en IT-avdelning. Vercel är som att trycka på "publicera" i WordPress — men för professionella appar. Push till GitHub → Vercel bygger och deployer automatiskt.',
    technical:
      'Vercel är optimerat för Next.js (samma team). Ger: automatiska preview deployments per PR, edge network (snabb globalt), serverless functions, och automatisk SSL.',
    connection:
      'Push till GitHub main → Vercel webhook triggas → bygger Next.js-appen → deployer till Vercels edge network → live på sekunder. Ingen AWS-konfiguration behövs.',
    tomorrow: 'Hela stacken ihop — en komplett resa från kodrad till användare',
  },

  // ── VECKA 3: DJUPDYK ────────────────────────────────────
  {
    day: 15,
    system: 'Hela stacken',
    emoji: '🗺️',
    color: '#BF5FFF',
    title: 'Dag 15: Hela resan — från kodrad till användare',
    analogy: 'Nu har vi gått igenom alla pusselbitar. Idag sätter vi ihop dem.',
    technical: `Erik skriver kod (TypeScript) →
git push → GitHub →
GitHub Actions triggas →
Docker image byggs →
Image pushas till AWS ECR →
ECS hämtar nya imagen →
Gammal container byts mot ny →
Användaren öppnar wavult.com →
Cloudflare tar emot request →
CloudFront levererar frontend →
Frontend anropar api.wavult.com →
ECS kör Express-servern →
Servern frågar Supabase →
Data returneras →
Användaren ser sitt Wavult OS-flöde.`,
    connection:
      'Allt hänger ihop. En bugg i ett steg kan stoppa hela kedjan. Därför har vi monitoring, health checks och Bernt som vaktar.',
    tomorrow: 'IAM & Säkerhet på AWS — vem får göra vad?',
  },
  {
    day: 16,
    system: 'AWS IAM',
    emoji: '🔑',
    color: '#FF9500',
    title: 'IAM — nycklarna till kungariket (och varför vi är försiktiga)',
    analogy:
      'På ett hotell finns det olika nycklar. Städaren kommer in i rummet men inte i kassavalvet. Chefen kommer in överallt. IAM (Identity and Access Management) är hotellets nyckelsystem för AWS.',
    technical:
      'IAM-roller, policies och users styr vem som kan göra vad på AWS. Principle of least privilege = ge bara de rättigheter som behövs. GitHub Actions har en IAM-användare med rätt att pusha till ECR och deploya till ECS — inget mer.',
    connection:
      'AWS_ACCESS_KEY_ID och AWS_SECRET_ACCESS_KEY i GitHub Secrets är vår "hotelinyckel" för deploy-pipelinen. Dessa ska ALDRIG hamna i kod eller loggar.',
    tomorrow: 'Environment variables — hemligheterna som håller allt igång',
  },
  {
    day: 17,
    system: 'Environment Variables',
    emoji: '🔐',
    color: '#FF453A',
    title: 'Env vars — hemligheterna som körs i bakgrunden',
    analogy:
      'Tänk dig en restaurang. Receptet är öppet, men hemliga ingredienser förvaras i ett låst skåp. Environment variables är det låsta skåpet — API-nycklar, lösenord och konfiguration som appen behöver men som aldrig ska visas i koden.',
    technical:
      'Vi använder .env-filer lokalt (aldrig committade till Git). I produktion sätter vi env vars direkt på ECS task definitions. Vår server validerar ALLA env vars vid startup via Zod — om något saknas vägrar appen starta.',
    connection:
      'Lokalt: .env-fil. GitHub Actions: Secrets. ECS produktion: Task definition environment. OpenClaw: /home/erikwsl/.openclaw/secrets/credentials.env.',
    tomorrow: 'PostgreSQL — hur vår databas faktiskt fungerar',
  },
  {
    day: 18,
    system: 'PostgreSQL',
    emoji: '🐘',
    color: '#5E9CF5',
    title: 'PostgreSQL — världens mest avancerade open source-databas',
    analogy:
      'Excel är bra för listor. Men tänk dig en Excel som kan hantera miljarder rader, söka på millisekunder, koppla ihop 50 tabeller simultant och aldrig förlora data även om strömmen går. Det är PostgreSQL.',
    technical:
      'Postgres är relationsdatabas — data lagras i tabeller med relationer. Supabase kör Postgres under huven. Vi använder: JOIN (koppla tabeller), INDEX (snabbare sökning), RLS (row-level security — varje organisation ser bara sin data), och transactions.',
    connection:
      'All data för Wavult OS, quiXzoom och LandveX — zoomers, uppdrag, larm, kunder — bor i PostgreSQL-databaser på Supabase.',
    tomorrow: 'REST API — hur frontend och backend pratar',
  },
  {
    day: 19,
    system: 'REST API',
    emoji: '🔌',
    color: '#34C759',
    title: 'REST API — språket som frontend och backend talar',
    analogy:
      'Tänk dig en restaurang. Du (frontend) pratar inte direkt med kocken (databasen). Du pratar med servitören (API:et). "Ge mig menyn" = GET. "Jag vill beställa" = POST. "Ändra min beställning" = PUT. "Avbryt" = DELETE.',
    technical:
      'REST (Representational State Transfer) är en arkitekturstil för HTTP-API:er. Vi har endpoints som /api/missions, /api/zoomers etc. Varje endpoint accepterar JSON och returnerar JSON. Auth via Bearer token i headers.',
    connection:
      'Wavult OS skickar: GET api.wavult.com/api/zoomers → Express-router → controller → Supabase query → JSON-svar → appen visar data. Samma mönster för alla endpoints.',
    tomorrow: 'WebSockets & Realtid — när saker uppdateras live',
  },
  {
    day: 20,
    system: 'Realtid & WebSockets',
    emoji: '⚡',
    color: '#FFD60A',
    title: 'Realtid — när data uppdateras utan att ladda om sidan',
    analogy:
      'Normalt är internet som brev — du skickar ett brev, väntar på svar. WebSockets är som ett telefonsamtal som aldrig avslutas. Servern kan ringa dig när något nytt händer.',
    technical:
      'Supabase har inbyggd realtid via WebSockets. Vi kan prenumerera på databasändringar: INSERT, UPDATE, DELETE. När en ny zoomer-submission kommer in kan alla inloggade admins se den direkt — utan att ladda om.',
    connection:
      'Frontend öppnar WebSocket-anslutning till Supabase → Supabase lyssnar på Postgres → ändring i databasen → Supabase pushar event → frontend uppdateras live.',
    tomorrow: 'CI/CD — hur automatisk deploy fungerar i detalj',
  },
  {
    day: 21,
    system: 'CI/CD',
    emoji: '🔄',
    color: '#BF5FFF',
    title: 'CI/CD — automatisk kvalitetskontroll och deploy',
    analogy:
      'Tänk dig en bilfabrik. Varje bil passerar automatiska kontrollstationer innan den lämnar fabriken. CI/CD är vår automatiska fabrik för kod — varje förändring testas och deployas automatiskt.',
    technical:
      'CI (Continuous Integration): kör tester, lint och build vid varje push. CD (Continuous Deployment): om CI klarar sig, deploya till produktion automatiskt. Vår pipeline: push → test → build Docker → push ECR → deploy ECS.',
    connection:
      'GitHub Actions är vår CI/CD-plattform. Konfigureras i .github/workflows/. Vi har: deploy-api.yml (server) och deploy-pages.yml (Cloudflare Pages).',
    tomorrow: 'Monitoring & Logging — hur vi vet när något går fel',
  },

  // ── VECKA 4: AFFÄR & STRATEGI ───────────────────────────
  {
    day: 22,
    system: 'Monitoring',
    emoji: '👁️',
    color: '#FF453A',
    title: 'Monitoring — att ha koll utan att stirra på skärmen',
    analogy:
      'Ett flygplan har hundratals instrument. Piloten stirrar inte på dem hela tiden — alarm går om något avviker. Vår monitoring är samma sak för servern.',
    technical:
      'Vi kör: ECS health checks (container omstartas om /health inte svarar), Bernts automatiska statusrapporter (08:00 + 20:00), check-host.net för global tillgänglighet. Nästa steg: Sentry för error tracking, Datadog/CloudWatch för metrics.',
    connection:
      'ECS healthcheck → /health endpoint → 200 OK = allt ok, annars omstart. Bernt kollar: URL-status, ECS tasks, GitHub Actions. Mail om något är rött.',
    tomorrow: 'SaaS-affärsmodellen — hur vi tjänar pengar',
  },
  {
    day: 23,
    system: 'Affärsmodell',
    emoji: '💰',
    color: '#34C759',
    title: 'SaaS — Software as a Service-modellen',
    analogy:
      'Förr köpte man mjukvara på CD — en gång. Nu prenumererar man som Netflix. SaaS (Software as a Service) är Netflix-modellen för företagssystem. Kunden betalar månadsvis, vi levererar alltid senaste versionen.',
    technical:
      'LandveX säljer till kommuner: fast månadsavgift per abonnemang. Fördelar: förutsägbar intäkt (ARR/MRR), hög retention om värdet är tydligt, skalbar utan proportionell kostnad. Nyckelmetrics: MRR, Churn, LTV, CAC.',
    connection:
      'Kommun registrerar → betalar via Stripe → Supabase aktiverar kontot → kommunen använder LandveX → support via vår helpdesk → förhoppningsvis aldrig churnar.',
    tomorrow: 'Go-to-market — hur vi når kommunerna',
  },
  {
    day: 24,
    system: 'GTM & Försäljning',
    emoji: '🎯',
    color: '#FF9500',
    title: 'Go-to-market — från produkt till betalande kund',
    analogy:
      'Den bästa produkten i världen säljer inte sig själv. GTM (Go-to-Market) är planen för hur vi hittar kunder, konverterar dem och behåller dem.',
    technical:
      'Vår GTM-stack: wavult.com (SEO + content), Google Search Console (mät synlighet), direktförsäljning (outreach till kommuner), potentiellt partnernätverk (fastighetsbolag, försäkring). CRM-data spåras i Supabase.',
    connection:
      'Kund hittar landvex.com → demo → pilot → betalar månadsvis → berättar för en annan kommun (word of mouth).',
    tomorrow: 'API-ekonomin — hur vi kan sälja data och integrationer',
  },
  {
    day: 25,
    system: 'API-ekonomi',
    emoji: '🔗',
    color: '#5E9CF5',
    title: 'API-ekonomin — vår data som produkt',
    analogy:
      'Stripe tjänar pengar på att andra bygger betalningar ovanpå deras API. Twilio på SMS. Vi kan göra samma sak — låta kommuner, försäkringsbolag och andra integrera med quiXzoom och LandveX via API.',
    technical:
      'En publik API-strategi kräver: API-nycklar per kund, rate limiting, versionshantering (v1, v2), webhook-support, dokumentation. Intäktsmodell: per API-call eller ingår i enterprise-tier.',
    connection:
      'quiXzoom API → kommunens system → försäkringsbolag (skadehantering) → fastighetsbolag (fastighetsinspektion). Varje integration är ett nytt intäktsflöde.',
    tomorrow: 'Skalbarhet — hur vi klarar 10x mer kunder utan 10x mer jobb',
  },
  {
    day: 26,
    system: 'Skalbarhet',
    emoji: '📈',
    color: '#34C759',
    title: 'Skalbarhet — byggt för att växa',
    analogy:
      "En liten kiosk och en McDonald's säljer båda hamburgare. Men McDonald's kan öppna tusen nya restauranger med samma system. Vi bygger Wavult OS som McDonald's, inte som kiosken.",
    technical:
      'Vår stack är horisontellt skalbar: ECS kan automatiskt starta fler containers (auto scaling), Supabase/RDS skalbar med read replicas, CloudFront cach:ar statiskt innehåll globalt, stateless API (ingen session på servern).',
    connection:
      '100 zoomers = 2 ECS tasks. 10 000 zoomers = auto scaling till 20 tasks + read replica på Supabase. Kostnaden ökar linjärt, intäkten exponentiellt (förhoppningsvis).',
    tomorrow: 'GDPR & Compliance — att driva SaaS i Europa',
  },
  {
    day: 27,
    system: 'GDPR & Compliance',
    emoji: '⚖️',
    color: '#FF453A',
    title: 'GDPR — reglerna som skyddar våra kunders kunder',
    analogy:
      'Om du förvarar folks saker i ett lager är du ansvarig för att de är säkra. GDPR är lagen som bestämmer hur vi får hantera persondata. Bryter vi mot den: böter upp till 4% av global omsättning.',
    technical:
      'Som SaaS-leverantör är vi "data processor". Kunden (kommunen) är "data controller". Vi behöver: Privacy Policy, DPA (Data Processing Agreement), rätt att radera data (RTBF), data i EU (vi kör eu-north-1 = Stockholm), och loggning av vad vi gör med data.',
    connection:
      'Supabase på AWS eu-north-1 (Stockholm) = data stannar i EU ✅. QuiXzoom UAB i Litauen = EU-registrerad GDPR-hemvist ✅. Vi behöver formella DPAs med kunder som processerar persondata.',
    tomorrow: 'Trigger.dev — schemalagda och event-drivna jobb',
  },
  {
    day: 28,
    system: 'Trigger.dev',
    emoji: '⚡',
    color: '#BF5FFF',
    title: 'Trigger.dev — bakgrundsarbete utan att blockera appen',
    analogy:
      'När du beställer mat på Uber Eats väntar du inte i appen tills maten är lagad. Du går och gör annat, och får en notis när den är klar. Trigger.dev är systemet som hanterar sådant bakgrundsarbete för vår app.',
    technical:
      'Trigger.dev är en "background jobs" plattform. Vi kan schemalägga jobs (skicka faktura 1:a varje månad), event-driva (skicka SMS när zoomer-uppdrag skapas), och långkörande uppgifter (generera PDF-rapporter). Körs separat från main API.',
    connection:
      'Vår server → Trigger.dev SDK → job queue → workers kör jobbet → resultat sparas i Supabase. Systemet är en viktig del av zoomer-payout-flödet.',
    tomorrow: 'Multi-tenant arkitektur — en app, tusen kunder',
  },
  {
    day: 29,
    system: 'Multi-tenancy',
    emoji: '🏢',
    color: '#FFD60A',
    title: 'Multi-tenant — en app som tjänar tusen kunder',
    analogy:
      'Ett kontorshus har hundra företag men delar hiss, el och parkering. Multi-tenant SaaS är samma sak — en installation av vår app, men varje kund ser bara sin egen data.',
    technical:
      'Vi implementerar multi-tenancy via Supabase RLS (Row Level Security). Varje rad i databasen har en organization_id. RLS-policies säkerställer att queries automatiskt filtreras — kommun A kan aldrig se kommun B:s data, oavsett buggar i appkoden.',
    connection:
      'Token i header → server extraherar org_id → Supabase query kör med RLS → automatisk filtrering. Det är säkerheten som låter oss ha alla kunder i samma databas utan risk.',
    tomorrow: 'Dag 30: Helheten — var vi är och vart vi är på väg',
  },
  {
    day: 30,
    system: 'Vision & Roadmap',
    emoji: '🚀',
    color: '#34C759',
    title: 'Dag 30: Vi har byggt grunden — nu skalar vi',
    analogy:
      'Ni har följt med på hela resan. Från "vad är AWS" till multi-tenant arkitektur och GDPR. Det är 30 dagars komprimerad startup-utbildning. Nu vet ni varför besluten fattas som de gör.',
    technical:
      'Stack summary: TypeScript + React (frontend) → Express/Node.js (API) → PostgreSQL/Supabase (data) → Docker/ECS (deployment) → Cloudflare (edge) → GitHub Actions (CI/CD) → Stripe (payments) → OpenClaw/Bernt (AI ops).',
    connection:
      'Ni är inte längre bara teammedlemmar — ni förstår maskinen. Det gör er till bättre beslutsfattare, bättre säljare och bättre builders. Välkommen till laget på riktigt. 🔥',
    tomorrow: 'Kursen börjar om på nästa nivå — djupare dive in i varje system',
  },
]
