// ============================================================
// Systemskolan v2 — 60 lektioner, Wavult-specifika
// Scannat från faktisk systemstatus 2026-04-02
//
// ECS Services: wavult-os-api:6, identity-core:3, wavult-core:3,
//   quixzoom-api:6, n8n-task:13, landvex-api:3, bos-scheduler:3,
//   gitea:2, team-pulse:3, wavult-redis:1, wavult-kafka:7
// Cloudflare Zones: 29 st (wavult.com, quixzoom.com, landvex.com...)
// GitHub Repos: wavult-os, quixzoom-api, wavult-eos, apifly, dissg, uapix...
// Bolag: Wavult Group DMCC, QuiXzoom Inc (DE), Landvex AB, FinanceCo FZCO
// ============================================================

export type LessonCategory =
  | 'infrastructure'
  | 'product'
  | 'company'
  | 'api'
  | 'legal'
  | 'finance'
  | 'operations'
  | 'team'

export interface Lesson {
  day: number
  week: number
  category: LessonCategory
  system: string
  emoji: string
  color: string
  title: string
  analogy: string
  technical: string
  connection: string
  tomorrow: string
  wavult_specific: boolean
  source_entities: string[]
}

export const CATEGORY_COLORS: Record<LessonCategory, string> = {
  infrastructure: '#FF9500',
  product: '#F59E0B',
  company: '#10B981',
  api: '#3B82F6',
  legal: '#8B5CF6',
  finance: '#F59E0B',
  operations: '#EF4444',
  team: '#EC4899',
}

export const CATEGORY_LABELS: Record<LessonCategory, string> = {
  infrastructure: '🏗️ Infrastruktur',
  product: '📦 Produkter',
  company: '🏢 Bolag',
  api: '🔌 API:er',
  legal: '⚖️ Juridik',
  finance: '💰 Finans',
  operations: '⚙️ Drift',
  team: '👥 Team',
}

export const CURRICULUM: Lesson[] = [
  // ══════════════════════════════════════════════════
  // VECKA 1-2: INFRASTRUKTUR
  // ══════════════════════════════════════════════════
  {
    day: 1,
    week: 1,
    category: 'infrastructure',
    system: 'Wavult Stack',
    emoji: '🏗️',
    color: '#FF9500',
    title: 'Wavult Groups tech stack — den kompletta bilden',
    analogy:
      'Tänk dig en stad. AWS är marken vi bygger på, ECS är byggnaderna, Cloudflare är gatorna och trafikljusen, Kafka är budsystemet som bär meddelanden mellan stadsdelarna, och Redis är postboxarna på varje gathörn. Wavult OS är kommunhuset där allt administreras.',
    technical:
      'Vår stack: React/Vite frontend → Cloudflare Pages. Node.js/Express API:er → AWS ECS Fargate (cluster: wavult, eu-north-1). PostgreSQL på RDS (3 databaser: wavult_os, quixzoom, wavult_identity). Redis + Kafka på ECS. DNS och WAF: Cloudflare (29 zoner). CDN: CloudFront + S3. CI/CD: GitHub Actions → ECR → ECS.',
    connection:
      'Konkret: os.wavult.com serveras från Cloudflare Pages. API-anrop går till api.wavult.com → wavult-api-alb → ECS task wavult-os-api:6. Data lagras i wavult_os/quixzoom/wavult_identity på RDS eu-north-1. Events flödar via wavult-kafka:7.',
    tomorrow: 'AWS ECS Fargate — varför vi valde containers',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'wavult-core', 'identity-core', 'quixzoom-api', 'landvex-api'],
  },
  {
    day: 2,
    week: 1,
    category: 'infrastructure',
    system: 'AWS ECS Fargate',
    emoji: '📦',
    color: '#FF9500',
    title: 'AWS ECS Fargate — varför vi valde containers',
    analogy:
      'Traditionell server = äga en lastbil. EC2 = hyra en lastbil. ECS Fargate = boka ett bud — du säger bara vad som ska levereras och när, Amazon fixar resten. Inga servrar att underhålla, ingen kapacitetsplanering, betala per sekund som koden körs.',
    technical:
      'ECS (Elastic Container Service) kör Docker-containers utan att vi behöver hantera servrar. Cluster: wavult i eu-north-1. Aktuella services och task-definitioner: wavult-os-api:6, identity-core:3, wavult-core:3, quixzoom-api:6, n8n-task:13, landvex-api:3, bos-scheduler:3, gitea:2, team-pulse:3, wavult-redis:1, wavult-kafka:7.',
    connection:
      'Varje service har en task definition (CPU, RAM, env vars, Docker image från ECR). Fargate startar containers vid deploy och omstartar automatiskt vid krasch. Health checks via /health endpoint på varje service.',
    tomorrow: 'wavult-api-alb — Application Load Balancer, hur trafiken routas',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api', 'identity-core', 'wavult-core'],
  },
  {
    day: 3,
    week: 1,
    category: 'infrastructure',
    system: 'Application Load Balancer',
    emoji: '⚖️',
    color: '#FF9500',
    title: 'wavult-api-alb — hur inkommande trafik routas till rätt service',
    analogy:
      'Tänk dig ett företag med reception. Alla besökare går in genom samma dörr, men receptionisten dirigerar dem: "ekonomiavdelningen är till vänster, tech är till höger." wavult-api-alb är den receptionisten — tar emot alla API-anrop och vidarebefordrar till rätt ECS service.',
    technical:
      'Application Load Balancer (ALB) i AWS sitter framför våra ECS services. Listener rules matchar URL-prefix: /api/identity/* → identity-core, /api/zoomers/* → quixzoom-api, /api/landvex/* → landvex-api, /* → wavult-os-api. Target groups håller koll på hälsosamma containers.',
    connection:
      'api.wavult.com (DNS i Cloudflare) → wavult-api-alb (AWS ALB) → Target Group → ECS container. Om en container är ohälsosam (health check misslyckas) tar ALB bort den ur rotation automatiskt.',
    tomorrow: 'RDS PostgreSQL — vår databas, 3 separata databaser',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api', 'identity-core'],
  },
  {
    day: 4,
    week: 1,
    category: 'infrastructure',
    system: 'RDS PostgreSQL',
    emoji: '🐘',
    color: '#3B82F6',
    title: 'wavult-identity-ecs RDS — PostgreSQL, 3 databaser på en instans',
    analogy:
      'Tänk dig ett kontorsbyggnad med tre helt separata arkiv: ett för Wavult OS-verksamheten, ett för quiXzoom bilduppdrags-data, och ett för identiteter och KYC. Alla tre arkiv finns i samma byggnad (RDS-instansen), men med separata lås och behörigheter.',
    technical:
      'AWS RDS PostgreSQL eu-north-1, tre databaser: 1) wavult_os — ve_opportunities, company_launches, team_locations, morning_brief, system_events. 2) quixzoom — missions, submissions, zoomers, wallets, payouts, zoomer_certs. 3) wavult_identity — identities, kyc_sessions, bos_records, mrz_scans.',
    connection:
      'Varje ECS service har sin egen connection string i task definition env vars. wavult-os-api pratar med wavult_os. quixzoom-api pratar med quixzoom. identity-core pratar med wavult_identity. Separata credentials för varje databas.',
    tomorrow: 'wavult-kafka — event-driven arkitektur, varför vi skickar events',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'identity-core', 'bos-scheduler'],
  },
  {
    day: 5,
    week: 1,
    category: 'infrastructure',
    system: 'Kafka',
    emoji: '📨',
    color: '#FF9500',
    title: 'wavult-kafka — event-driven arkitektur och varför vi kör events',
    analogy:
      'Utan Kafka är services som människor som ringer varandra — om den du ringer inte svarar, missas meddelandet. Kafka är som ett postsystem med garanterad leverans: skicka meddelandet, det hamnar i postboxen, och mottagaren läser det när de är redo, även om de var offline.',
    technical:
      'wavult-kafka (task-definition: wavult-kafka:7) kör Apache Kafka på ECS. Topics vi använder: zoomer.submission.created, mission.completed, identity.verified, landvex.alert.triggered, morning_brief.generated. Producers (API:er) skickar events. Consumers (bos-scheduler, n8n) processar dem.',
    connection:
      'Exempel: quixzoom-api producerar zoomer.submission.created → bos-scheduler konsumerar → skapar BOS-entry → identity-core validerar → wallet uppdateras. Allt asynkront, ingen tight coupling.',
    tomorrow: 'wavult-redis — caching och pub/sub',
    wavult_specific: true,
    source_entities: ['wavult-kafka', 'quixzoom-api', 'bos-scheduler', 'wavult-core'],
  },
  {
    day: 6,
    week: 1,
    category: 'infrastructure',
    system: 'Redis',
    emoji: '⚡',
    color: '#FF4500',
    title: 'wavult-redis — caching, sessions och pub/sub',
    analogy:
      'PostgreSQL är ett bibliotek med alla böcker. Redis är post-it-lapparna på skrivbordet — för de saker du kollar 50 gånger per dag. Istället för att gå till biblioteket varje gång hämtar du från skrivbordet. Enormt mycket snabbare.',
    technical:
      'wavult-redis (task-definition: wavult-redis:1) kör Redis 7 på ECS. Användningsområden: 1) Session cache — API-auth tokens med TTL. 2) Rate limiting — max requests per IP. 3) Pub/sub för realtidsuppdateringar (t.ex. live-status i Team Pulse). 4) Queue buffer innan Kafka.',
    connection:
      'wavult-os-api → Redis (session lookup, <1ms) vs PostgreSQL (full query, ~5-20ms). Team Pulse-realtid: wavult-core publicerar till Redis channel → team-pulse subscribar → frontend får live-update via WebSocket.',
    tomorrow: 'Cloudflare — 29 zoner, DNS, WAF och Pages',
    wavult_specific: true,
    source_entities: ['wavult-redis', 'wavult-os-api', 'team-pulse', 'wavult-core'],
  },
  {
    day: 7,
    week: 1,
    category: 'infrastructure',
    system: 'Cloudflare',
    emoji: '🛡️',
    color: '#F38020',
    title: 'Cloudflare — 29 zoner, DNS, WAF, Workers och Pages',
    analogy:
      'Cloudflare är vakten, conciergen och snabbkörsaren i ett. Alla besökare passerar genom Cloudflare innan de ens når våra servrar. Cloudflare bestämmer vad som blockas (attacker), vad som cach:as lokalt (snabbhet), och vad som skickas vidare till AWS.',
    technical:
      'Vi hanterar 29 Cloudflare-zoner. Aktiva: wavult.com, quixzoom.com, hypbit.com, pixdrift.com, evasvensson.se, apbxp.io, apbxp.cloud, apbxp.online, apbxp.org, apbxp.tech. Pending: landvex.com, landvex.se, apifly.com, uapix.com, dissg.*, apbxp.com, apbxp.dev. Cloudflare Pages deployas direkt från GitHub.',
    connection:
      'Wavult OS frontend: Cloudflare Pages (wavult-os.pages.dev → os.wavult.com). API-trafik: Cloudflare proxy → wavult-api-alb. WAF blockerar SQL injection, XSS. Rate limiting på /api/auth/*.',
    tomorrow: 'GitHub Actions — CI/CD pipeline från push till live',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api'],
  },
  {
    day: 8,
    week: 2,
    category: 'infrastructure',
    system: 'GitHub Actions',
    emoji: '⚙️',
    color: '#6E40C9',
    title: 'GitHub Actions — vår CI/CD pipeline, push till live på minuter',
    analogy:
      'Förr var deploy som att baka bröd för hand — varje gång. GitHub Actions är som en automatisk brödmaskin: tryck på en knapp (git push), och den kör allt automatiskt: testar, bygger, deployer. Du kan gå och göra något annat.',
    technical:
      'Aktiva repos: wavult-os (pushed 2026-04-01), quixzoom-api (2026-04-01), wavult-eos (2026-04-01), apifly (2026-03-30), dissg (2026-03-29). Workflows: .github/workflows/deploy.yml kör: 1) npm ci + npm test, 2) docker build, 3) ECR push, 4) ECS update-service --force-new-deployment.',
    connection:
      'git push origin main → GitHub Actions triggas → Docker image byggs och taggas med commit SHA → pushas till ECR (155407238699.dkr.ecr.eu-north-1.amazonaws.com) → ECS hämtar ny image → rolling deployment.',
    tomorrow: 'Gitea — vår interna kodserver på git.wavult.com',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api', 'wavult-core'],
  },
  {
    day: 9,
    week: 2,
    category: 'infrastructure',
    system: 'Gitea',
    emoji: '🍵',
    color: '#609926',
    title: 'Gitea — vår interna GitHub på git.wavult.com',
    analogy:
      'GitHub är som att hyra ett postkontor som alla kan komma in i. Gitea är som att bygga ett eget postkontor i källaren — vi äger det, ingen annan har tillgång, och vi betalar ingen hyra. Perfekt för intern kod och hemliga projekt.',
    technical:
      'gitea (task-definition: gitea:2) kör Gitea self-hosted på ECS. Tillgänglig på git.wavult.com. Används för: intern kod som inte ska ligga på GitHub, licenser och IP-känsliga algoritmer, konfigurationsfiler med hemligheter. Mirror av kritiska GitHub-repos för backup.',
    connection:
      'Gitea på ECS → EFS (Elastic File System) för persistent storage. Backupas automatiskt. Developer pushar till git.wavult.com istället för GitHub för känsliga repositories. SSH-nyckelbaserad autentisering.',
    tomorrow: 'ECR — Docker registry, hur vi lagrar och versionerar images',
    wavult_specific: true,
    source_entities: ['gitea'],
  },
  {
    day: 10,
    week: 2,
    category: 'infrastructure',
    system: 'ECR',
    emoji: '🗂️',
    color: '#FF9500',
    title: 'ECR — Docker images, versionshantering och rollback',
    analogy:
      'ECR (Elastic Container Registry) är som ett lager för alla versioner av vår app. Varje gång vi deployer sparas en ny "förpackning" i lagret. Om en ny version är trasig kan vi öppna en äldre förpackning från lagret och installera den istället.',
    technical:
      'AWS ECR (155407238699.dkr.ecr.eu-north-1.amazonaws.com) lagrar Docker images per service. Tags: latest (alltid senaste), git-commit-sha (specifik version). Image lifecycle policy: behåll senaste 10 images, radera äldre automatiskt. Scanning: ECR Basic Scanning hittar kända CVE:er.',
    connection:
      'GitHub Actions: docker build → docker tag → docker push till ECR. ECS task definition refererar till specifik image tag. Rollback: uppdatera task definition till en äldre image SHA → ECS deployer den.',
    tomorrow: 'ECS deployment flow — hela resan från kod till live container',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api'],
  },
  {
    day: 11,
    week: 2,
    category: 'infrastructure',
    system: 'ECS Deployment',
    emoji: '🚀',
    color: '#FF9500',
    title: 'ECS deployment flow — från git push till live på 5 minuter',
    analogy:
      'Att deploya kod är som att byta ut en motor på ett plan som är i luften. ECS gör det med "rolling deployments" — startar en ny container, väntar tills den är hälsosam, sedan tar den gamla ner. Inga downtime, inga dramatik.',
    technical:
      'Rolling deployment: ECS startar ny task med ny image → health check passerar (/health returnerar 200) → ALB börjar skicka trafik till den nya → gamla tasken dränas (pågående requests avslutas) → gamla tasken stoppas. Tar ~2-3 minuter. Circuit breaker: om nya imagen misslyckas health check, deploymenten rullas tillbaka.',
    connection:
      'Komplett flow: git push → Actions (2 min) → ECR push (1 min) → ECS update-service (2-3 min) → live. Totalt ~5-6 minuter. Monitor: aws ecs describe-services --cluster wavult --services wavult-os-api.',
    tomorrow: 'CloudFront + S3 — vår CDN för statiska assets',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api', 'identity-core'],
  },
  {
    day: 12,
    week: 2,
    category: 'infrastructure',
    system: 'CloudFront + S3',
    emoji: '🌐',
    color: '#FF9500',
    title: 'CloudFront + S3 — global CDN och fillagring',
    analogy:
      'Om du ska leverera bröd till hela Sverige, är det smartare att ha lokala bagerier i varje stad än att baka allt i Stockholm. CloudFront är det distribuerade nätverket av "bagerier" — din app levereras från närmaste edgenod, oavsett om användaren är i Malmö eller Manila.',
    technical:
      'CloudFront distributions: wavult-os frontend (origin: S3 bucket), LandveX kartor och ortofoto tiles (origin: S3 med tunga filer). S3 buckets: wavult-static (frontend assets), wavult-uploads (zoomer-bilder, kvitton), landvex-tiles (kartdata). Signerade URLs för privata filer.',
    connection:
      'quiXzoom zoomer laddar upp bild → S3 wavult-uploads → presigned URL skickas till quixzoom-api → sparas i quixzoom DB. LandveX karta: tiles laddas från CloudFront edge → snabb rendering av kartlager utan att belasta API.',
    tomorrow: 'n8n på ECS — automationsmotor, ersätter hundratals cron-jobb',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api'],
  },
  {
    day: 13,
    week: 2,
    category: 'infrastructure',
    system: 'n8n',
    emoji: '🔀',
    color: '#EA4B71',
    title: 'n8n på ECS — automationsmotor, varför inte cron-jobb',
    analogy:
      'Cron-jobb är som att sätta larm på en väckarklocka — enkelt, men du måste hantera varje larm separat, det finns ingen historia, inget sätt att pausa, och om det misslyckas märker du inte det. n8n är som en smart assistent som kan köra flöden, visualisera dem, logga varje körning och skicka alert om något går fel.',
    technical:
      'n8n (task-definition: n8n-task:13) kör på ECS. Aktiva workflows: Morning Brief (daglig kl 07:00 → OpenAI → ElevenLabs → Resend), System Healthcheck (var 15:e min → status → alert om fel), Company Formation Tracker (daglig → Supabase company_launches → Resend notis), Team Pulse (daglig → team-pulse API).',
    connection:
      'n8n → Kafka producer (för events) och direkt HTTP till API:erna. Credentials lagrade i n8n Credential Store (ej i miljövariabler). Webhook-mottagning för externa tjänster (Stripe webhooks, 46elks inkommande SMS).',
    tomorrow: 'Security — RLS, API keys, secrets management i vår stack',
    wavult_specific: true,
    source_entities: ['n8n', 'wavult-core', 'team-pulse'],
  },
  {
    day: 14,
    week: 2,
    category: 'infrastructure',
    system: 'Security',
    emoji: '🔒',
    color: '#FF453A',
    title: 'Security — RLS, API keys, AWS SSM och secrets management',
    analogy:
      'Säkerhet är som ett hus med flera lager: ytterdörren (Cloudflare WAF), innerdörren (API auth), källarlåset (RLS i databasen), och kassavalvet (AWS SSM för secrets). Ingen enskild spärr är tillräcklig — säkerhet är djupet.',
    technical:
      'Lager 1: Cloudflare WAF — blockerar kända attack-patterns. Lager 2: JWT/Bearer tokens på alla API-anrop. Lager 3: RLS (Row Level Security) i PostgreSQL — varje query filtreras automatiskt per org_id. Lager 4: AWS SSM Parameter Store — alla API-nycklar lagras som SecureString, injectas i ECS task definitions. Lager 5: credentials.env lokalt på /home/erikwsl/.openclaw/secrets/ (chmod 600).',
    connection:
      'ECS task → AWS IAM Role → SSM Parameter Store → hämtar DB_PASSWORD, OPENAI_KEY etc → task startar med korrekta env vars. Ingen API-nyckel i kod, ingen i GitHub, ingen i CloudWatch logs.',
    tomorrow: 'quiXzoom — produkten, konceptet, zoomers och uppdrag',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'identity-core', 'wavult-core'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 3-4: PRODUKTERNA
  // ══════════════════════════════════════════════════
  {
    day: 15,
    week: 3,
    category: 'product',
    system: 'quiXzoom',
    emoji: '📸',
    color: '#F59E0B',
    title: 'quiXzoom — crowdsourcad bilddata, zoomers och uppdrag',
    analogy:
      'Tänk dig Uber, men istället för att transportera människor transporterar du bilddata. "Zoomers" är fältoperatörerna (driverna) som tar uppdrag på en karta — fotografera denna korsning, dokumentera denna byggnad. Beställarna är kommuner, försäkringsbolag och infrastrukturägare som behöver aktuell visuell data.',
    technical:
      'quiXzoom bygger på: quixzoom-api:6 (ECS), quixzoom databas (RDS), quixzoom-mobile (React Native app för zoomers), quixzoom-landing (Cloudflare Pages). Flöde: Uppdragsgivare skapar mission → zoomers ser det på kartan → accepterar → fotograferar → laddar upp → AI-verifiering → godkänd → utbetalning.',
    connection:
      'quixzoom-api hanterar: GET /missions (kartan), POST /submissions, GET /wallet/balance. Koppling till identity-core för zoomer-verifiering. Koppling till wavult-core för BOS (Behavior Observation System).',
    tomorrow: 'quiXzoom datamodell — missions, submissions, wallets, payouts',
    wavult_specific: true,
    source_entities: ['quixzoom-api', 'identity-core', 'bos-scheduler'],
  },
  {
    day: 16,
    week: 3,
    category: 'product',
    system: 'quiXzoom Data',
    emoji: '🗃️',
    color: '#F59E0B',
    title: 'quiXzoom datamodell — missions, submissions, wallets, payouts',
    analogy:
      'En taxibolag har: bilar (zoomers), resor (missions), kvitton (submissions), och lönekonton (wallets). quiXzoom-databasen är precis det — men för bilduppdrag.',
    technical:
      'quixzoom-databasen (PostgreSQL RDS):\n- zoomers: id, identity_id (FK till wavult_identity), level, status, created_at\n- missions: id, title, lat, lng, reward_sek, deadline, org_id, status (open/assigned/completed)\n- submissions: id, mission_id, zoomer_id, image_urls[], status (pending/approved/rejected), ai_score\n- wallets: id, zoomer_id, balance_sek, pending_sek\n- payouts: id, wallet_id, amount_sek, method (swish/bankgiro), status, processed_at\n- zoomer_certs: id, zoomer_id, cert_type, issued_at, valid_until',
    connection:
      'Submission godkänns → wallet.pending_sek ökar → bos-scheduler triggas (Kafka event) → BOS-poäng beräknas → payout skapas → Stripe/Swish-utbetalning → wallet.balance_sek minskar, wallet.paid_sek ökar.',
    tomorrow: 'LandveX — enterprise optisk intelligens och kunderna',
    wavult_specific: true,
    source_entities: ['quixzoom-api', 'bos-scheduler'],
  },
  {
    day: 17,
    week: 3,
    category: 'product',
    system: 'LandveX',
    emoji: '🔭',
    color: '#10B981',
    title: 'LandveX — enterprise optisk intelligens för kommuner och infrastruktur',
    analogy:
      'Kommuner och infrastrukturägare har idag blinda fläckar. De vet inte vad som händer på deras mark förrän någon ringer och rapporterar. LandveX är som att ge dem hundratals kameror med AI-ögon — de ser allt i realtid, utan att anställa ett enda vaktbolag.',
    technical:
      'LandveX bygger på: landvex-api:3 (ECS), landvex databas, landvex-web (Cloudflare Pages via optic-insights-web repo), Cloudflare zoner landvex.com + landvex.se. Kunder: kommuner, fastighetsbolag, infrastrukturägare. Data source: quiXzoom-bilder + externa kamerafeeds + satellite tiles.',
    connection:
      'LandveX konsumerar quiXzoom-data som råmaterial. Zoomer fotograferar → LandveX AI analyserar → alert skapas om anomali (olovlig parkering, skadegörelse, infrastrukturproblem) → kommunen notifieras. B2B SaaS, månadsabonnemang.',
    tomorrow: 'LandveX datamodell — alerts, objects, clients, subscriptions',
    wavult_specific: true,
    source_entities: ['landvex-api', 'quixzoom-api'],
  },
  {
    day: 18,
    week: 3,
    category: 'product',
    system: 'LandveX Data',
    emoji: '📊',
    color: '#10B981',
    title: 'LandveX datamodell — alerts, objects, clients, subscriptions',
    analogy:
      'En säkerhetscentral har: kunder (kommuner), bevakningsområden (zones), incidenter (alerts), och objekt att bevaka (buildings, vehicles). LandveX-databasen är precis det — men allt drivet av AI och crowdsourcad bilddata.',
    technical:
      'landvex-databas (PostgreSQL RDS):\n- clients: id, name, org_nr, municipality_code, subscription_tier\n- zones: id, client_id, name, geometry (PostGIS polygon), alert_config\n- objects: id, zone_id, object_type (vehicle/person/structure), first_seen, last_seen\n- alerts: id, zone_id, alert_type, severity (low/medium/high/critical), image_url, lat, lng, resolved_at\n- subscriptions: id, client_id, tier (basic/professional/enterprise), monthly_sek, tokens_included\n- tokens: id, client_id, type (api_call/alert/report), used_at',
    connection:
      'Kund (kommun) → LandveX dashboard (landvex-web) → API-anrop till landvex-api → PostgreSQL query med RLS (ser bara sin zones/alerts) → karta med realtidsalerts. Stripe hanterar månadsdebitering av subscriptions.',
    tomorrow: 'Wavult OS — command center, alla moduler och vad de gör',
    wavult_specific: true,
    source_entities: ['landvex-api'],
  },
  {
    day: 19,
    week: 3,
    category: 'product',
    system: 'Wavult OS',
    emoji: '🖥️',
    color: '#6366F1',
    title: 'Wavult OS — enterprise command center, alla moduler',
    analogy:
      'Wavult OS är som ett flygledartorn. Allt flyg (alla produkter, bolag, team, operationer) rapporterar hit. Flygledaren (Erik och teamet) ser allt i en skärm — ingen separat app för varje sak, allt samlas i Wavult OS.',
    technical:
      'wavult-os (GitHub repo, Cloudflare Pages) byggt med React/Vite/TypeScript. Moduler: Knowledge Hub (Systemskolan, dokument), Command Center (ECS-status, health), Team Pulse, Portfolio View (bolag och status), Morning Brief, Operations. APIs: wavult-os-api:6 på ECS, pratar med wavult_os RDS och Supabase.',
    connection:
      'Startpunkt för allt internt arbete: os.wavult.com. Erik ser company_launches status, team locations, morning brief, system health — allt utan att logga in på AWS-konsolen eller Supabase-dashboarden.',
    tomorrow: 'UAPIX — vårt API-protokoll, institutional-grade',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'wavult-core', 'team-pulse'],
  },
  {
    day: 20,
    week: 3,
    category: 'product',
    system: 'UAPIX',
    emoji: '🔌',
    color: '#8B5CF6',
    title: 'UAPIX — Wavults API-protokoll, institutional-grade',
    analogy:
      'VISA är ett protokoll som banker och butiker pratar genom. UAPIX är Wavults version — ett standardiserat sätt att kommunicera med alla våra services och externa system. Institutional-grade betyder: säkert, auditerat, SLA-garanterat.',
    technical:
      'uapix (GitHub repo, pushed 2026-03-27). UAPIX är ett API-protokoll/wrapper ovanpå vår servicestack. Features: standardiserade error-format, audit-logging av alla anrop, rate limiting per API-nyckel, versionshantering (v1/v2/v3), webhook-support med signering. Cloudflare-zon: uapix.com (pending).',
    connection:
      'Extern kund (t.ex. ett försäkringsbolag) integrerar mot UAPIX istället för direkta API-anrop. UAPIX validerar, loggar, vidarebefordrar till rätt intern service. Pricing: per API-call i enterprise-tier.',
    tomorrow: 'Apifly — SMB API-plattform, lagret ovanpå UAPIX',
    wavult_specific: true,
    source_entities: ['wavult-core', 'wavult-os-api'],
  },
  {
    day: 21,
    week: 4,
    category: 'product',
    system: 'Apifly',
    emoji: '🪰',
    color: '#06B6D4',
    title: 'Apifly — SMB API-plattform, enklare versionen av UAPIX',
    analogy:
      'UAPIX är som ett institutionellt bankkonto för storbolag — kraftfullt men komplext. Apifly är som Swish — enkelt, direkt, för alla. SMB:ar (small/medium businesses) som vill ha enkel API-access till Wavults data och tjänster.',
    technical:
      'apifly (GitHub repo, pushed 2026-03-30). Cloudflare-zon: apifly.com (pending). Apifly paketerar UAPIX-funktionalitet i enklare developer-experience: no-code integrationer, webhook-builder, pay-as-you-go (ingen enterprise-kontrakt), sandbox-environment.',
    connection:
      'Liten e-handlare vill ha geo-data för leveransoptimering → registrerar på apifly.com → väljer datapaketet → integrerar med 10 raders kod → betalar per query via Stripe. Inga kontrakt, inget säljmöte.',
    tomorrow: 'Wavult Group DMCC — IP-holding i Dubai, royalty-strukturen',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 5: BOLAGSSTRUKTUREN
  // ══════════════════════════════════════════════════
  {
    day: 22,
    week: 5,
    category: 'company',
    system: 'Wavult Group DMCC',
    emoji: '🏙️',
    color: '#10B981',
    title: 'Wavult Group DMCC — IP-holding i Dubai, royalty-strukturen',
    analogy:
      'Tänk dig en franchise-kedja. Hamburgerkedjan (Wavult DMCC) äger receptet och varumärket. Varje restaurang (dotterbolag) betalar en licensavgift för att använda receptet. Pengarna flödar upp till ägaren. Wavult DMCC är den ägarentiteten.',
    technical:
      'Wavult Group DMCC (status: not_started, jurisdiction: AE-DMCC). DMCC = Dubai Multi Commodities Centre, en fri handelszon med 0% bolagsskatt och 0% royalty-skatt. Äger: all IP (kod, varumärken, patent), licensierar till Landvex AB, QuiXzoom Inc och andra dotterbolag mot royalty (% av omsättning).',
    connection:
      'Arkitektur: Wavult DMCC (IP-ägare, AE) → licens → Landvex AB (SE) → intäkter − royalty = lägre skattepliktig vinst i Sverige. Wavult DMCC (AE) mottar royalty med 0% skatt. Legal dokumentation krävs: IP Assignment, License Agreement.',
    tomorrow: 'QuiXzoom Inc (Delaware) — varför C Corp för USA',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },
  {
    day: 23,
    week: 5,
    category: 'company',
    system: 'QuiXzoom Inc',
    emoji: '🗽',
    color: '#10B981',
    title: 'QuiXzoom Inc (Delaware) — varför C Corp för USA',
    analogy:
      'Silicon Valley-investerare föredrar Delaware C Corp som en restaurangkritiker föredrar en viss tallriksstorlek — det är branschstandard. Alla vet hur det fungerar, alla dokument är standardiserade, och VC-firmor har sina jurister färdiga.',
    technical:
      'QuiXzoom Inc (status: in_progress, jurisdiction: US-DE). Delaware C Corporation är standard för amerikanska VC-financierade startups. Fördelar: välkänd bolagsform, enkel aktiestruktur (SAFE-notes, option pool), inga krav på amerikanskt medborgarskap för grundare, Delaware Court of Chancery.',
    connection:
      'QuiXzoom Inc är det juridiska fordonet för USA-marknaden och eventuell VC-runda. Kundavtal med amerikanska bolag tecknas via QuiXzoom Inc. IP licensieras från Wavult DMCC till QuiXzoom Inc.',
    tomorrow: 'Landvex AB — det svenska bolaget, Bolagsverket',
    wavult_specific: true,
    source_entities: ['quixzoom-api'],
  },
  {
    day: 24,
    week: 5,
    category: 'company',
    system: 'Landvex AB',
    emoji: '🇸🇪',
    color: '#10B981',
    title: 'Landvex AB — det svenska bolaget, Bolagsverket',
    analogy:
      'För att sälja till svenska kommuner behövs ett AB. Kommuner vill se ett momsregistrerat svenskt bolag med ett organisationsnummer de kan slå upp på Bolagsverket. Landvex AB är den trovärdigheten.',
    technical:
      'Landvex AB (status: in_progress, jurisdiction: SE). Aktiebolag per Aktiebolagslagen. Krav: minst 25 000 SEK aktiekapital, styrelse (minst 1 svensk eller EU-medborgare), F-skattsedel, momsregistrering, registrering hos Bolagsverket. Verksamhet: försäljning av LandveX-tjänster på den svenska marknaden.',
    connection:
      'Landvex AB tecknar avtal med svenska kommuner. Fakturerar i SEK med 25% moms. Betalar royalty till Wavult DMCC. Rekryterar eventuell salesforce i Sverige. Bank: Revolut Business (SEK + EUR-konton).',
    tomorrow: 'Wavult FinanceCo FZCO — den finansiella hubben i Dubai',
    wavult_specific: true,
    source_entities: ['landvex-api'],
  },
  {
    day: 25,
    week: 5,
    category: 'company',
    system: 'FinanceCo FZCO',
    emoji: '💰',
    color: '#10B981',
    title: 'Wavult FinanceCo FZCO — den finansiella hubben i Dubai',
    analogy:
      'I en stor konsern finns det ofta ett finansbolag som hanterar alla penningflöden — konsoliderar intäkter från dotterbolagen, betalar leverantörer, och effektiviserar kassaflödet. Wavult FinanceCo är det bolaget.',
    technical:
      'Wavult FinanceCo FZCO (status: not_started, jurisdiction: AE-DMCC). FZCO = Free Zone Company, kan ha 1 ägare. Hanterar: intercompany transfers, valutaväxling (SEK/EUR/USD/AED), betalningar till internationella leverantörer (AWS, Cloudflare, GitHub), och konsolidering av räkenskaper.',
    connection:
      'Landvex AB intäkter → FinanceCo FZCO → betalar AWS-faktura i USD utan valutakonverterings-overhead. FinanceCo hanterar Revolut Business-kontona och kontot mot Stripe payouts.',
    tomorrow: 'QuiXzoom UAB — Litauisk struktur, EU-försäljning och GDPR',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },
  {
    day: 26,
    week: 5,
    category: 'company',
    system: 'QuiXzoom UAB',
    emoji: '🇱🇹',
    color: '#10B981',
    title: 'QuiXzoom UAB — Litauisk struktur, EU-försäljning och GDPR-hemvist',
    analogy:
      'Litauen är Europas digitala hotspot — låg bolagsskatt (15%), snabb bolagsregistrering, EU-hemvist (fullt GDPR-kompatibelt) och bred EU-marknadstillgång. UAB är Litauens version av AB.',
    technical:
      'QuiXzoom UAB (status: not_started, jurisdiction: LT). UAB = Uždaroji akcinė bendrovė (privat aktiebolag). Litauisk bolagsskatt: 15% (vs 20.6% i Sverige). EU-hemvist ger: fri rörlighet inom EU, GDPR Data Controller status, EU-kunder kan teckna avtal utan extra compliance-krav.',
    connection:
      'QuiXzoom UAB är försäljningsentitet för EU-marknaden (exkl. Sverige). Kunder i Frankrike, Nederländerna, Tyskland tecknar avtal med UAB. Licenserar IP från Wavult DMCC. Data processas på AWS eu-north-1 (Stockholm).',
    tomorrow: 'Skatteoptimering — 0% UAE royalty, CFC-regler och gränser',
    wavult_specific: true,
    source_entities: ['quixzoom-api', 'identity-core'],
  },
  {
    day: 27,
    week: 5,
    category: 'finance',
    system: 'Skatteoptimering',
    emoji: '📉',
    color: '#F59E0B',
    title: 'Skatteoptimering — 0% UAE royalty, CFC-regler och var gränsen går',
    analogy:
      'Skatteplanering är som att planera en bilresa — du väljer den väg som är laglig och snabbast. Skatteflykt är som att köra på fel sida vägen. Vi kör lagliga motorvägar: IP-holding i UAE, royalty-betalningar med armslängdsprincip.',
    technical:
      'Laglig struktur: 1) Wavult DMCC i UAE → 0% bolagsskatt, 0% royalty-källskatt. 2) Royalty-betalningar från dotterbolag minskar skattebasen i Sverige/Litauen (avdragsgilla). 3) CFC-regler (Controlled Foreign Corporation): Sverige kan beskatta Erik personligen på DMCC-vinst om "inte genuint etablerat". Krav: faktisk verksamhet i UAE.',
    connection:
      'Risker att hantera: Transfer pricing — royaltyns storlek måste motsvara marknadspris (armslängdsprincip). CFC-risk om DMCC saknar substans. Lösning: Erik spenderar >183 dagar/år i UAE ELLER DMCC har faktisk operativ verksamhet.',
    tomorrow: 'Bankkonton — Revolut Business, Stripe och varför digitala banker',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },
  {
    day: 28,
    week: 5,
    category: 'finance',
    system: 'Bankkonton',
    emoji: '🏦',
    color: '#F59E0B',
    title: 'Bankkonton — Revolut Business, Stripe och varför digitala banker vinner',
    analogy:
      'Traditionella banker är som fax-maskiner — de finns, men varför? Revolut Business är som WhatsApp för pengar: instant transfers, multi-valuta, virtuella kort per projekt, realtids-notiser. För ett globalt bolag som Wavult Group är det ingen tävling.',
    technical:
      'Stack: Revolut Business (daglig bank, SEK + EUR + USD + AED, virtuella kort för AWS/GitHub/verksamhetskostnader), Stripe (betalningsprovider, onboarding, webhooks), potentiellt Wise Business (internationella transfers med lägre spread). UAE: RAKBANK eller Emirates NBD för lokal bankrelation.',
    connection:
      'Stripe intäkter → weekly payout till Revolut Business → betala AWS månadsräkning med virtuellt kort → bokföring automatiskt via Revolut Export till redovisningssystem.',
    tomorrow: 'Resend — transaktionell e-post, varför inte SMTP längre',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 6: API-INTEGRATIONER
  // ══════════════════════════════════════════════════
  {
    day: 29,
    week: 6,
    category: 'api',
    system: 'Resend',
    emoji: '📧',
    color: '#3B82F6',
    title: 'Resend — transaktionell e-post, varför inte SMTP',
    analogy:
      'SMTP är som att posta brev — du skickar och hoppas på det bästa. Resend är som ett certifierat budbud med kvitto — du vet exakt om mailet levererades, öppnades, eller studsade. Och det levereras till inkorgen, inte spam.',
    technical:
      'Resend API används för: Morning Brief-distribution (dagligt HTML-mail till teamet), transaktionella mails (välkomstmail, bekräftelser, alerts). Fördelar: deliverability (SPF, DKIM, DMARC automatiskt), webhooks för open/click-tracking, React Email-templates. Domain: @wavult.com, @quixzoom.com.',
    connection:
      'n8n workflow (Morning Brief) → HTTP request till Resend API → POST /emails med HTML-body → levereras till dennis@wavult.com, leon@wavult.com, winston@wavult.com, johan@wavult.com.',
    tomorrow: '46elks — SMS i Sverige, inkommande webhooks',
    wavult_specific: true,
    source_entities: ['wavult-core', 'n8n'],
  },
  {
    day: 30,
    week: 6,
    category: 'api',
    system: '46elks',
    emoji: '📱',
    color: '#3B82F6',
    title: '46elks — SMS i Sverige, röstsamtal och webhook-mottagning',
    analogy:
      '46elks är som Telenors API. Istället för att ringa via mobilen ringer du via kod. Vi kan skicka SMS, ta emot SMS, ringa samtal och ta emot samtal — allt via HTTP requests.',
    technical:
      '46elks nummer: +46766862613. ID: nc440253e9ddd68833fd86e61fff0b2bb, saldo ~21 132 SEK. Webhook inkommande: https://api.wavult.com/voice/inbound. Bernt (AI-röst) kör på: STT (Whisper) → Bernt (Claude Haiku) → TTS (ElevenLabs Sarah EXAVITQu4vr4xnSDxMaL) → 46elks PSTN. Routes: POST /voice/inbound, POST /voice/gather/:callId.',
    connection:
      'n8n kan trigga SMS-alerts via 46elks API. Bernt svarar på inkommande samtal till +46766862613 — fullt operationellt röst-AI.',
    tomorrow: 'ElevenLabs — TTS för Morning Brief och Bernts röst',
    wavult_specific: true,
    source_entities: ['wavult-core', 'identity-core'],
  },
  {
    day: 31,
    week: 6,
    category: 'api',
    system: 'ElevenLabs',
    emoji: '🎤',
    color: '#3B82F6',
    title: 'ElevenLabs — TTS för Morning Brief, Bernts röst (Sarah)',
    analogy:
      'Text-to-speech brukade låta som ett NES-spel. ElevenLabs låter som en riktig människa — modulering, pauser, betoning. Vi använder det för att göra Morning Brief till en röstupplevelse, inte bara ett mail.',
    technical:
      'ElevenLabs API: Text → naturlig röstinspelning. Voice ID "Sarah" (EXAVITQu4vr4xnSDxMaL) — Bernts standardröst för telefonsamtal. Används i: 1) Morning Brief audio-version (daglig). 2) Bernt röst-svar på 46elks-samtal. 3) Potentiellt: quiXzoom-notiser via röst.',
    connection:
      'Bernt (Claude Haiku svarar) → text-svar → ElevenLabs API → MP3-ljud → serveras via /voice/audio/:file på wavult-core → 46elks spelar upp för uppringaren. Latency: ~800ms för en mening.',
    tomorrow: 'OpenAI — GPT-4o, vilken modell vi använder för vad',
    wavult_specific: true,
    source_entities: ['wavult-core', 'n8n'],
  },
  {
    day: 32,
    week: 6,
    category: 'api',
    system: 'OpenAI',
    emoji: '🧠',
    color: '#3B82F6',
    title: 'OpenAI — GPT-4o, Whisper, och när vi väljer vilken modell',
    analogy:
      'Att välja AI-modell är som att välja verktyg. En hammare för spik, en skruvmejsel för skruvar. GPT-4o för komplex reasoning, GPT-4o-mini för enkla uppgifter (billigare), Whisper för transkription. Rätt verktyg sparar pengar och ger bättre resultat.',
    technical:
      'OpenAI-modeller: gpt-4o (Morning Brief-generering, komplex analys), gpt-4o-mini (snabba API-svar, chat-completion), whisper-1 (STT för Bernt röst, 46elks-transkription). Bildanalys: gpt-4o med vision (quiXzoom submission-verifiering). Embedding: text-embedding-3-small (semantisk sökning i Knowledge Engine).',
    connection:
      'Morning Brief: n8n → OpenAI gpt-4o (skriv brief baserat på yesterday events) → Resend mail + ElevenLabs audio. Röst-Bernt: 46elks audio → Whisper STT → Claude Haiku svar → ElevenLabs TTS.',
    tomorrow: 'Perplexity — real-time research, sonar-pro',
    wavult_specific: true,
    source_entities: ['wavult-core', 'n8n', 'identity-core'],
  },
  {
    day: 33,
    week: 6,
    category: 'api',
    system: 'Perplexity',
    emoji: '🔍',
    color: '#3B82F6',
    title: 'Perplexity — real-time research med sonar-pro',
    analogy:
      'ChatGPT vet vad som hände fram till sin träningsdata-cutoff, typ 2023. Perplexity söker live på internet och sammanställer svar med källor. För Morning Brief och Bernts omvärldsanalys behöver vi aktuell information — det är Perplexity.',
    technical:
      'Perplexity sonar-pro API: realtids-websökning + LLM-sammanfattning med källhänvisningar. Används för: Morning Brief nyhetssektionen (vad hände igår i relevant bransch), Bernt research-kommando, company formation tracking (senaste nyheter om bolagsregistrering i UAE/DE/SE).',
    connection:
      'Bernt kommando "researcha X" → Perplexity sonar-pro API → svar med källor → Bernt sammanfattar → presenterar med källlänkar. Komplement till OpenAI som saknar realtid.',
    tomorrow: 'Pexels — stock video/bild API, HD-assets',
    wavult_specific: true,
    source_entities: ['wavult-core', 'n8n'],
  },
  {
    day: 34,
    week: 6,
    category: 'api',
    system: 'Pexels',
    emoji: '🖼️',
    color: '#3B82F6',
    title: 'Pexels — stock video/bild API, royalty-free HD-assets',
    analogy:
      'Istället för att anlita en fotograf för varje bild vi behöver i presentationer och marknadsmaterial, har vi tillgång till miljontals professionella foton och videor via API. Pexels är biblioteket, vi väljer det vi behöver.',
    technical:
      'Pexels API: search photos/videos, hämta specifik resolution (original/large2x/large/medium). Används i: Morning Brief (illustrationer), LandveX-dashboard bakgrundsbilder, quiXzoom onboarding-material. Rate limit: 200 req/timme. Licensmodell: royalty-free, kommersiell användning tillåten.',
    connection:
      'n8n Morning Brief-workflow → Pexels API (sök "smart city" eller relevant keyword) → hämta HD-bild URL → inkludera i HTML-mail. Ingen kostnad per bild, bara API-nyckel-access.',
    tomorrow: 'Stripe — betalningar, webhooks, zoomer-payouts',
    wavult_specific: true,
    source_entities: ['wavult-core', 'n8n'],
  },
  {
    day: 35,
    week: 6,
    category: 'api',
    system: 'Stripe',
    emoji: '💳',
    color: '#3B82F6',
    title: 'Stripe — betalningar, webhooks, zoomer-payouts och test vs live',
    analogy:
      'Stripe hanterar allt som rör pengar: ta emot betalt, betala ut till zoomers, prenumerera kunder, och ge oss exakt data om varje transaktion. Det är som att ha en hel finansavdelning i ett API.',
    technical:
      'Stripe-integration: 1) Landvex-prenumerationer (recurring subscriptions, monthly/annual). 2) Apifly pay-as-you-go (metered billing). 3) quiXzoom zoomer-payouts (Stripe Connect, instant payouts till bankkonto). Webhooks: payment.succeeded → aktivera konto, payment.failed → notifiera, payout.paid → uppdatera wallet.',
    connection:
      'Stripe webhook → POST /api/webhooks/stripe på wavult-core → validera signature (STRIPE_WEBHOOK_SECRET) → uppdatera PostgreSQL → triggera Kafka event.',
    tomorrow: 'Morning Brief — hur vi genererar och distribuerar daglig brief',
    wavult_specific: true,
    source_entities: ['wavult-core', 'quixzoom-api'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 7: OPERATIV DRIFT
  // ══════════════════════════════════════════════════
  {
    day: 36,
    week: 7,
    category: 'operations',
    system: 'Morning Brief',
    emoji: '☀️',
    color: '#EF4444',
    title: 'Morning Brief — generering, distribution och röstversion',
    analogy:
      'Militära stabschefer har alltid en morgonbriefing om läget. Morning Brief är vår version — varje morgon kl 07:00 vet hela teamet vad som hände igår, vad som är kritiskt idag, och vad som behöver åtgärdas. Automatiskt genererat, inga möten.',
    technical:
      'n8n workflow (kör dagligen 07:00): 1) Hämta system events från wavult_os.morning_brief-tabellen (senaste 24h). 2) Hämta ECS service health. 3) Hämta company_launches status. 4) Skicka allt till OpenAI gpt-4o → strukturerad brief. 5) Hämta relevant bild från Pexels. 6) Bygg HTML-mail med React Email template. 7) Skicka via Resend till teamet. 8) Generera audio-version via ElevenLabs.',
    connection:
      'Mottagare: Erik, Dennis, Leon, Winston, Johan. Mail: @wavult.com-adresser. Audio: sparas på S3, länkas i mailet. Wavult OS-modul "Morning Brief" visar senaste briefen i os.wavult.com.',
    tomorrow: 'n8n workflows — healthcheck, formation tracker och mer',
    wavult_specific: true,
    source_entities: ['n8n', 'wavult-core', 'wavult-os-api'],
  },
  {
    day: 37,
    week: 7,
    category: 'operations',
    system: 'n8n Workflows',
    emoji: '🔄',
    color: '#EF4444',
    title: 'n8n workflows — healthcheck, formation tracker, alla automation',
    analogy:
      'n8n är vår automatiska assistent som körs i bakgrunden 24/7. Det är som att ha en administratör som aldrig sover och alltid kör sina checklistor — men det är kod, inte en människa.',
    technical:
      'Aktiva n8n workflows (n8n-task:13 på ECS):\n1. Morning Brief (daglig 07:00)\n2. System Healthcheck (var 15:e min) — ping alla ECS services /health, ping Cloudflare, kontrollera RDS connection. Alert via Resend om något misslyckas.\n3. Company Formation Tracker (daglig) — kolla Supabase company_launches, skicka statusuppdatering.\n4. Team Pulse (daglig 17:00) — samla in team-pulse data.\n5. Stripe Reconciliation (daglig) — kontrollera Stripe payouts mot wallet-tabellen.',
    connection:
      'n8n har credentials till: Supabase, AWS (för healthcheck), Resend, Stripe, OpenAI, Perplexity, Pexels, ElevenLabs. Alla credentials lagras i n8n:s krypterade credential store.',
    tomorrow: 'Team Pulse — hur vi mäter och bibehåller teamhälsa',
    wavult_specific: true,
    source_entities: ['n8n', 'wavult-core', 'team-pulse'],
  },
  {
    day: 38,
    week: 7,
    category: 'operations',
    system: 'Team Pulse',
    emoji: '💓',
    color: '#EF4444',
    title: 'Team Pulse — hur vi mäter teamhälsa och motivation',
    analogy:
      'En bra idrottslag kollar spelarna efter varje match — inte bara poängen, utan hur de mår. Team Pulse är vår kontinuerliga "spelarmätning" för Wavult-teamet: är folk motiverade, överarbetade, eller behöver de stöd?',
    technical:
      'team-pulse (task-definition: team-pulse:3) är en ECS service. Teammedlemmar (Dennis, Leon, Winston, Johan) svarar på dagliga micro-check-ins (1-3 frågor, <30 sekunder). Data lagras i wavult_os databas. Wavult OS visar aggregerad teamhälsa: momentum-score, burnout-risk, top priorities.',
    connection:
      'team-pulse API → Redis pub/sub (realtidsuppdatering i Wavult OS-dashboarden) → Erik ser team momentum i os.wavult.com. n8n Workflow skickar daglig sammanfattning i Morning Brief.',
    tomorrow: 'Deployment pipeline — push till ECR till live, steg för steg',
    wavult_specific: true,
    source_entities: ['team-pulse', 'wavult-os-api', 'wavult-redis'],
  },
  {
    day: 39,
    week: 7,
    category: 'operations',
    system: 'Deployment Pipeline',
    emoji: '🔧',
    color: '#EF4444',
    title: 'Deployment pipeline — push → ECR → ECS, hela flödet',
    analogy:
      'En rymdfärd har en countdown med checkpoints — T-10min, T-5min, T-0. Vår deployment pipeline är samma sak: varje steg är ett checkpoint. Om ett checkpoint misslyckas stoppar vi, inte deployer halvfärdig kod till produktion.',
    technical:
      'Full pipeline för t.ex. wavult-os-api:\n1. git push origin main\n2. GitHub Actions triggas (.github/workflows/deploy-api.yml)\n3. npm ci + npm test\n4. docker build -t wavult-os-api:{COMMIT_SHA} .\n5. aws ecr get-login-password | docker login ECR\n6. docker push ECR/wavult-os-api:{SHA}\n7. aws ecs update-service --cluster wavult --service wavult-os-api --force-new-deployment\n8. aws ecs wait services-stable\n9. Notis: "Deployed wavult-os-api SHA abc123"',
    connection:
      'Om step 7 misslyckas (health check failar): ECS circuit breaker rullar tillbaka till föregående task definition automatiskt. Bernt notifieras via n8n healthcheck.',
    tomorrow: 'Incident response — vad gör vi om något kraschar',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'landvex-api'],
  },
  {
    day: 40,
    week: 7,
    category: 'operations',
    system: 'Incident Response',
    emoji: '🚨',
    color: '#EF4444',
    title: 'Incident response — vad gör vi om något kraschar',
    analogy:
      'Brandkåren övar brandsläckning innan det brinner. Incident response är vår brandövning — en tydlig plan för vad som händer när (inte om) något kraschar, så att ingen panikerar och vi löser det snabbt.',
    technical:
      'Incident Response Playbook:\n1. DETECT: n8n healthcheck alert → Resend mail till teamet inom 5 min av krasch\n2. DIAGNOSE: aws ecs describe-tasks --cluster wavult + CloudWatch Logs\n3. ROLLBACK: aws ecs update-service --task-definition wavult-os-api:{prev-version}\n4. COMMUNICATE: Bernt skickar status till teamet\n5. POST-MORTEM: Dokumentera i Wavult OS system_events-tabellen\nVerktyg: AWS Console, CloudWatch Logs, Bernt (diagnostik via CLI)',
    connection:
      'Kontakt-hierarki: Bernt → Erik (primär) → Johan (CTO, teknisk) → Dennis (legal/kommunikation om kundpåverkan). SLA för kritiska services: max 30 minuters downtime.',
    tomorrow: 'Databas-migration — från Supabase cloud till RDS',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'wavult-core', 'n8n'],
  },
  {
    day: 41,
    week: 7,
    category: 'operations',
    system: 'Databas-migration',
    emoji: '🗄️',
    color: '#EF4444',
    title: 'Databas-migration — från Supabase cloud till RDS, varför och hur',
    analogy:
      'Vi bodde i ett möblerat hyresrum (Supabase cloud) — smidigt att komma igång men man betalar premium och har begränsad kontroll. Vi har nu byggt ett eget hus (AWS RDS) — mer jobb att sätta upp, men fullständig kontroll, lägre kostnad i skala, och data stannar på vår AWS-account.',
    technical:
      'Migration genomförd: Supabase cloud → AWS RDS PostgreSQL eu-north-1. Tre databaser: wavult_os, quixzoom, wavult_identity. Processen: 1) pg_dump från Supabase. 2) pg_restore till RDS. 3) Verifiera rowcounts och constraints. 4) Uppdatera ECS task definitions med ny DB connection string. 5) Cutover under lågtrafik. 6) Monitor 48h.',
    connection:
      'Supabase används fortfarande för: Bernt:s direkta API-access (znmxtnxxjpmgtycmsqjv.supabase.co), company_launches-tabellen, historisk data. Ny data går till RDS. Hybrid under transition.',
    tomorrow: 'Gitea vs GitHub — när vi använder vad och varför',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'quixzoom-api', 'identity-core'],
  },
  {
    day: 42,
    week: 7,
    category: 'operations',
    system: 'Gitea vs GitHub',
    emoji: '🔀',
    color: '#EF4444',
    title: 'Gitea vs GitHub — vad vi lägger var och varför',
    analogy:
      'GitHub är det publika torget — vad vi lägger där kan i princip ses av vem som helst. Gitea är vårt eget låsta kassavalv. Känslig kod och algoritmer stannar där.',
    technical:
      'GitHub (wolfoftyreso-debug): Wavult OS frontend, quixzoom-mobile, landvex-web, apifly, dissg, uapix — allt som kan vara publikt i framtiden. CI/CD via GitHub Actions. Externa samarbeten.\n\nGitea (git.wavult.com, gitea:2 ECS): Kärnalgoritmer (quiXzoom matching, LandveX AI-modeller), interna konfigurationsfiler, licensnycklar och IP-känsliga komponenter, mirror av kritiska repos för backup.',
    connection:
      'Tumregel: kan detta repo stå på GitHub om det läckte? Ja → GitHub. Nej → Gitea. Alla ECS-services deployas via GitHub Actions, men källkoden för känsliga delar speglas från Gitea.',
    tomorrow: 'quiXzoom affärsmodell — uppdrag, belöningar och ledpaket',
    wavult_specific: true,
    source_entities: ['gitea'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 8: AFFÄRSMODELL & GO-TO-MARKET
  // ══════════════════════════════════════════════════
  {
    day: 43,
    week: 8,
    category: 'finance',
    system: 'quiXzoom GTM',
    emoji: '📸',
    color: '#F59E0B',
    title: 'quiXzoom affärsmodell — uppdrag, belöningar, ledpaket och dataintäkter',
    analogy:
      'quiXzoom är en tvåsidig marknad (two-sided market) som AirBnB — det finns beställare (kommuner, bolag) och leverantörer (zoomers). Värdet skapas av att matcha dem. Vi tar en cut av varje transaktion.',
    technical:
      'Intäktsströmmar:\n1. Uppdragskommission — 15-25% av missionsvärdet\n2. Ledpaket — beställare köper buntar med bilduppdrag i förväg (rabatt vs pay-per-mission)\n3. Quixom Ads — B2B data-plattform, anonymiserad geodata till annonsörer\n4. API-access — LandveX och externa köpare betalar per bilddata-query\n5. Zoomer certifiering — premium-nivåer (Zoomer Pro, Zoomer Expert) mot avgift',
    connection:
      'Unit economics: Mission à 200 SEK → zoomer får 160 SEK (80%), quiXzoom tar 40 SEK (20%). Med 1000 completions/dag = 40 000 SEK/dag = ~14.6 MSEK/år gross revenue vid steady state.',
    tomorrow: 'LandveX affärsmodell — abonnemang, tokens och enterprise-pricing',
    wavult_specific: true,
    source_entities: ['quixzoom-api', 'wavult-core'],
  },
  {
    day: 44,
    week: 8,
    category: 'finance',
    system: 'LandveX GTM',
    emoji: '🔭',
    color: '#F59E0B',
    title: 'LandveX affärsmodell — abonnemang, tokens och enterprise-pricing',
    analogy:
      'SaaS-modellen med tokens är som ett gym-medlemskap med PT-sessioner: månadspriset ger tillgång till gymmet (plattformen), extra PT-sessioner (tokens för premium-features) kostar extra.',
    technical:
      'Pricing-tiers (LandveX):\n- Basic: 9 900 SEK/mån — upp till 3 zoner, 50 alerts/mån, standard karta\n- Professional: 24 900 SEK/mån — obegränsade zoner, 500 alerts, AI-analys, API-access\n- Enterprise: Custom — SLA-garanti, dedikerad support, white-label\nToken-ekonomi: Varje alert = 1 token. Extra tokens: 199 SEK per 100-pack.',
    connection:
      'Target customers: 290 svenska kommuner (betalningsförmåga: 10-50k SEK/mån), infrastrukturbolag (Vattenfall, Trafikverket), fastighetsbolag. ACV target: 200k-500k SEK/kund.',
    tomorrow: 'Quixom Ads — B2B data-monetisering av crowdsourcad bilddata',
    wavult_specific: true,
    source_entities: ['landvex-api', 'wavult-core'],
  },
  {
    day: 45,
    week: 8,
    category: 'finance',
    system: 'Quixom Ads',
    emoji: '📊',
    color: '#F59E0B',
    title: 'Quixom Ads — B2B data-monetisering och anonymiserad geodata',
    analogy:
      'Google tjänar pengar på att folk söker saker och annonsörer betalar för att synas. Quixom Ads är vår version — anonymiserad geo-data om vad som händer på specifika platser, säljs till analysbolag och annonsörer.',
    technical:
      'Quixom Ads (quixom.com, Cloudflare zone pending) — B2B data-plattform. Produkt: aggregerad, anonymiserad data från quiXzoom-uppdrag: trafikintensitet per plats, byggaktivitet, säsongsvariation. Kunder: analytics-bolag, stadsplanerare, fastighetsbolag, mediebyråer. Pricing: data-subscription per stad/region.',
    connection:
      'quixzoom-api → anonymisering pipeline → Quixom Ads data warehouse → API → kund. GDPR: all persondata (zoomer-identitet) strippad, bara aggregerad geo-data levereras.',
    tomorrow: 'SupportFunds — Venture Engine och kapitalallokering',
    wavult_specific: true,
    source_entities: ['quixzoom-api', 'wavult-core'],
  },
  {
    day: 46,
    week: 8,
    category: 'finance',
    system: 'SupportFunds',
    emoji: '🏦',
    color: '#F59E0B',
    title: 'SupportFunds — Venture Engine och kapitalallokering',
    analogy:
      'SupportFunds är Wavults interna kapitalallokator — en struktur som samlar kapital från lönsamma delar av gruppen och återinvesterar i nya ventures, exakt som ett VC-bolag men internt.',
    technical:
      'SupportFunds (supportfounds.com, Cloudflare zone pending) är ett Venture Engine-koncept. Kopplat till Wavult FinanceCo FZCO i Dubai. Funktioner: 1) Intercompany loans till nya dotterbolag. 2) Equity stake i externstartups via SAFE-notes. 3) Capital recycling: exitintäkter reinvesteras i nästa venture.',
    connection:
      'Landvex AB lönsam → betalar royalty till DMCC → FinanceCo allokerar delar till SupportFunds → investerar i nästa Wavult-venture (t.ex. DISSG, apbxp).',
    tomorrow: 'Sverige-lansering — quiXzoom i skärgården, juni 2026',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },
  {
    day: 47,
    week: 8,
    category: 'finance',
    system: 'Sverige-lansering',
    emoji: '🇸🇪',
    color: '#F59E0B',
    title: 'Sverige-lansering — quiXzoom i skärgården, juni 2026',
    analogy:
      'Varje stor lansering börjar litet. Uber startade i San Francisco. AirBnB på en konferens. Vi startar quiXzoom i den svenska skärgården — specifik geografi, tydlig use case, mätbara resultat.',
    technical:
      'Lanseringsplan: Juni 2026, Stockholms skärgård (Värmdö, Nacka, Lidingö kommuner som pilotkunder). Pilotfokus: LandveX kajevidokumentation, bryggedokumentation, kommunal infrastruktur. Zoomer-rekrytering: 50 lokala zoomers. Target: 500 completed missions första månaden. Tech: BankID-verifiering för zoomers.',
    connection:
      'identity-core → BankID-integration (dag 54) → Zoomer-verifiering. quixzoom-api → missions i skärgårdens koordinater. Betalning: Swish till zoomers (via Stripe Connect). LandveX: Kommunala pilotkunder (via Landvex AB).',
    tomorrow: 'Nederländerna — expansion Q1 2027, strategin',
    wavult_specific: true,
    source_entities: ['quixzoom-api', 'identity-core', 'landvex-api'],
  },
  {
    day: 48,
    week: 8,
    category: 'finance',
    system: 'Internationell expansion',
    emoji: '🇳🇱',
    color: '#F59E0B',
    title: 'Nederländerna — Q1 2027-strategin och varför Holland first',
    analogy:
      'Nederländerna är Europas tech-testlaboratorium — hög digital mognad, täta städer (perfekt för geodata), stark kommunal förvaltning med digitaliseringsbudget, och English-first affärsmiljö.',
    technical:
      'Holland Q1 2027: Target: Gemeente Amsterdam, Rotterdam, Utrecht som LandveX-kunder. Legal: QuiXzoom UAB (Litauen) tecknar avtal med holländska kommuner (EU-till-EU). Zoomer-rekrytering: Amsterdam zoomers via Instagram/TikTok-kampanj. Infrastruktur: Cloudflare-zon (wavult.nl, quixzoom.nl).',
    connection:
      'Expansion-checklist: Cloudflare-zon → lokal domän. Kommunal sales-outreach. Zoomer-onboarding (lokal app store). LandveX-dashboard på holländska. Stripe (EUR-pricing). QuiXzoom UAB som faktureringspart.',
    tomorrow: 'Pricing — hur vi prissätter optisk intelligens',
    wavult_specific: true,
    source_entities: ['landvex-api', 'quixzoom-api'],
  },
  {
    day: 49,
    week: 8,
    category: 'finance',
    system: 'Pricing Strategy',
    emoji: '💲',
    color: '#F59E0B',
    title: 'Pricing — hur vi prissätter optisk intelligens och bilddata',
    analogy:
      'Pricing är psykologi lika mycket som ekonomi. En kund köper inte "API-calls" — de köper "att se vad som händer på deras fastigheter utan att anställa vakter." Vi prissätter värdet, inte kostnaden.',
    technical:
      'Pricing-principer:\n- Value-based: vad är värdet för kunden? 1 prevented vandalism = saved 50k SEK. LandveX Professional @ 24.9k SEK/mån = 1 incident prevented per månad = ROI.\n- Anchoring: Enterprise-tier (custom) gör Professional se billigt ut.\n- Freemium-funnel: quiXzoom zoomers börjar gratis, uppgraderar till Pro-certifiering.\n- Token-ekonomi: tokens skapar lock-in och förutsägbar intäkt.',
    connection:
      'Landvex AB → kommunal upphandling (kräver offentlig prislista). UAPIX/Apifly → per-call pricing (öppen prislista). quiXzoom missions → marknadsbaserat (uppdragsgivare sätter pris, zoomers accepterar eller inte).',
    tomorrow: 'GDPR — vad det faktiskt innebär för Wavult Group',
    wavult_specific: true,
    source_entities: ['wavult-core', 'landvex-api', 'quixzoom-api'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 9: JURIDIK & COMPLIANCE
  // ══════════════════════════════════════════════════
  {
    day: 50,
    week: 9,
    category: 'legal',
    system: 'GDPR',
    emoji: '⚖️',
    color: '#8B5CF6',
    title: 'GDPR — vad det faktiskt innebär för Wavult Group',
    analogy:
      'GDPR är inte ett formulär att fylla i och glömma. Det är ett sätt att tänka på data: vi lånar kundernas data, vi äger den inte. När de vill ha tillbaka den (eller att vi raderar den) måste vi kunna göra det.',
    technical:
      'GDPR-roller:\n- Data Controller: Landvex AB (bestämmer syfte och medel) + QuiXzoom UAB\n- Data Processor: Wavult Group DMCC (utför teknisk behandling)\n- Sub-processors: AWS (eu-north-1 Stockholm), ElevenLabs, OpenAI\nKrav: Privacy Policy per produkt, Cookie Consent, Right to Erasure, Data Portability, DPA med kunder.',
    connection:
      'identity-core hanterar: consent-logging, data deletion requests (RTBF), data export. wavult_identity-databasen: gdpr_consents-tabell, deletion_requests-tabell. EU-data på AWS eu-north-1 Stockholm.',
    tomorrow: 'IP-ägarskap — varför Wavult DMCC äger all kod och varumärken',
    wavult_specific: true,
    source_entities: ['identity-core', 'wavult-core'],
  },
  {
    day: 51,
    week: 9,
    category: 'legal',
    system: 'IP-ägarskap',
    emoji: '©️',
    color: '#8B5CF6',
    title: 'IP-ägarskap — varför Wavult DMCC äger all kod och varumärken',
    analogy:
      'IP (Intellectual Property) är Wavults viktigaste tillgång. Det är inte kontorerna, inte teamet, utan koden och varumärkena. Precis som IKEA äger flat-pack furniture-konceptet, ska Wavult DMCC äga quiXzoom-algoritmerna och Wavult-varumärket.',
    technical:
      'IP-portfölj som Wavult DMCC äger (eller ska äga):\n- Source code: alla repos (wavult-os, quixzoom-api, landvex-api, etc.)\n- Varumärken: Wavult, quiXzoom, LandveX, UAPIX, Apifly, DISSG\n- Domain names: wavult.com, quixzoom.com, landvex.com etc\n- Algoritmer: quiXzoom matching engine, LandveX AI-modeller\nDokumentation: IP Assignment Agreement från varje grundare till DMCC.',
    connection:
      'IP Assignment: Erik (som grundare) → skriver under IP Assignment Agreement → all kod och idéer skapade i tjänsten för Wavult tillhör Wavult DMCC. Utan detta dokument är IP-strukturen skör.',
    tomorrow: 'Licensavtal — royalty-struktur och intercompany-avtal',
    wavult_specific: true,
    source_entities: ['wavult-core'],
  },
  {
    day: 52,
    week: 9,
    category: 'legal',
    system: 'Licensavtal',
    emoji: '📝',
    color: '#8B5CF6',
    title: 'Licensavtal — royalty-struktur och intercompany-avtal',
    analogy:
      "McDonalds-franchisetagare betalar royalty för att använda McDonalds-varumärket och recept. Wavults dotterbolag betalar royalty till DMCC för att använda Wavults IP. Det är licensavtalet som gör detta legalt och skattemässigt hållbart.",
    technical:
      'Intercompany-avtal som behövs:\n1. IP License Agreement: Wavult DMCC → Landvex AB (exklusiv licens för SE)\n2. IP License Agreement: Wavult DMCC → QuiXzoom Inc (exklusiv licens för US)\n3. IP License Agreement: Wavult DMCC → QuiXzoom UAB (exklusiv licens för EU)\n4. Service Agreement: Wavult DevOps FZCO → alla dotterbolag (tech-tjänster)\n5. Intercompany Loan Agreement: FinanceCo FZCO → startkapital till dotterbolag\nRoyalty rate: 10-20% av nettoomsättning.',
    connection:
      'Utan dessa avtal är skatteoptimeringen en skatteflykt. Med korrekt dokumenterade armslängdsavtal är det laglig skatteplanering. Kräver en skatteadvokat (UAE + SE specialist).',
    tomorrow: 'KYC/KYB — Wavult ID, identitetsverifiering och BOS',
    wavult_specific: true,
    source_entities: ['identity-core', 'wavult-core'],
  },
  {
    day: 53,
    week: 9,
    category: 'legal',
    system: 'KYC/KYB',
    emoji: '🪪',
    color: '#8B5CF6',
    title: 'KYC/KYB — Wavult ID, identitetsverifiering och BOS-systemet',
    analogy:
      'KYC (Know Your Customer) och KYB (Know Your Business) är bankerns sätt att fråga "vem är du egentligen?". Innan vi betalar ut pengar till en zoomer måste vi veta att de är den de säger sig vara.',
    technical:
      'identity-core (ECS service, task-definition: identity-core:3) hanterar:\n- KYC: identitetsverifiering av zoomers (BankID, MRZ-scanning av pass)\n- KYB: affärsverifiering av LandveX-kunder (org-nummer, firmatecknare)\n- BOS (Behavior Observation System): poängsystem för zoomer-beteende\n- wavult_identity databas: identities, kyc_sessions, bos_records, mrz_scans\nbos-scheduler (ECS service): kör BOS-beräkningar baserat på Kafka-events',
    connection:
      'Ny zoomer registrerar → identity-core initierar KYC → BankID-verifiering → identity.status = verified → kan ta uppdrag. BOS-poäng beräknas per vecka → påverkar vilka uppdrag zoomern syns i.',
    tomorrow: 'BankID-integration — identity-core, MRZ och verifieringsflöde',
    wavult_specific: true,
    source_entities: ['identity-core', 'bos-scheduler'],
  },
  {
    day: 54,
    week: 9,
    category: 'legal',
    system: 'BankID',
    emoji: '🔐',
    color: '#8B5CF6',
    title: 'BankID-integration — identity-core, MRZ-scanning och verifieringsflöde',
    analogy:
      'BankID är Swedish-made digitalt pass — nästan alla vuxna i Sverige har det, och det är juridiskt bindande. Att använda BankID för zoomer-verifiering är som att låta Skatteverket stämpla varje ny medarbetares anställningskontrakt.',
    technical:
      'BankID-integration via identity-core:\n- BankID REST API (Bankgirocentralen) — kräver godkänd RP-certifikat (Relying Party)\n- Flöde: 1) Initiera auth session (POST /rp/v6.0/auth), 2) Zoomer öppnar BankID-app, 3) Signerar, 4) Collect (GET /rp/v6.0/collect) tills status=complete, 5) Spara personnummer (krypterat)\nMRZ (Machine Readable Zone): passskanning via kameran, extraherar personnummer + foto.\nDuix API: AI-driven KYC-video (live facial recognition).',
    connection:
      'identity-core → BankID API → verified → Kafka event identity.verified → quixzoom-api → zoomer kan ta uppdrag. BankID kräver: godkänd ansökan hos Bankgirocentralen, produktionscertifikat (~4-8 veckors handläggningstid).',
    tomorrow: 'Datasovereignitet — EU vs USA-dataseparation och Schrems II',
    wavult_specific: true,
    source_entities: ['identity-core'],
  },
  {
    day: 55,
    week: 9,
    category: 'legal',
    system: 'Datasovereignitet',
    emoji: '🌍',
    color: '#8B5CF6',
    title: 'Datasovereignitet — EU vs USA-dataseparation och Schrems II',
    analogy:
      'Efter Schrems II-domen 2020 är det juridiskt komplicerat att skicka europeisk persondata till USA. Vi måste veta exakt var data bor och vem som kan komma åt den.',
    technical:
      'Dataseparation i vår stack:\nEU-data (GDPR-skyddat): AWS eu-north-1 (Stockholm) — alla databaser, ECS services, S3 buckets.\nUSA-data: OpenAI (vi skickar textprompts, INGA personuppgifter), Pexels (publika bilder).\nRisker: Cloudflare (US-bolag, men EU-noder) — har Standard Contractual Clauses (SCC).\nLösning: Data Processing Agreement (DPA) med varje US sub-processor.',
    connection:
      'Operationellt: zoomer-bilder → S3 eu-north-1 (EU) ✅. Analys-prompts till OpenAI → inga personuppgifter i prompten ✅. BankID-data → stannar i wavult_identity RDS eu-north-1 ✅.',
    tomorrow: 'Thailand workcamp — agenda, mål och vad vi ska uppnå',
    wavult_specific: true,
    source_entities: ['identity-core', 'wavult-core'],
  },

  // ══════════════════════════════════════════════════
  // VECKA 10: TEAM & ORGANISATION
  // ══════════════════════════════════════════════════
  {
    day: 56,
    week: 10,
    category: 'team',
    system: 'Thailand Workcamp',
    emoji: '🌴',
    color: '#EC4899',
    title: 'Thailand workcamp — agenda, mål och vad vi ska uppnå under 60 dagar',
    analogy:
      'Många team jobbar remote och ses aldrig. Vi tror på det motsatta: samla teamet intensivt under en period, bygg djupa relationer och alignment, och sen kan folk spridas globalt med en stark gemensam grund.',
    technical:
      'Thailand Workcamp 11 april → ~juni 2026:\nVecka 1-2: Systemskolan (60 lektioner), teambuilding, gemensam förståelse av hela systemet.\nVecka 3-4: Produktsprint — quiXzoom MVP klar för Sverige-lansering. LandveX redo för pilot.\nVecka 5-6: Go-to-market förberedelse — bolagsregistreringar färdiga, bankkonton öppna.\nVecka 7-8: Beta-lansering skärgården — 50 zoomers onboardade, 3 kommuner som pilotkunder.',
    connection:
      'Varje teammedlem lämnar Thailand med: 1) Djup förståelse för hela systemet (Systemskolan). 2) Tydlig roll och ansvar. 3) Verktyg och access till alla system. 4) Konkret mål för Q2 2026.',
    tomorrow: 'Teamstruktur — Dennis, Leon, Winston, Johan och rollerna',
    wavult_specific: true,
    source_entities: ['team-pulse', 'wavult-os-api'],
  },
  {
    day: 57,
    week: 10,
    category: 'team',
    system: 'Teamstruktur',
    emoji: '👥',
    color: '#EC4899',
    title: 'Teamstruktur — Dennis, Leon, Winston, Johan och deras roller',
    analogy:
      'Ett fotbollslag med 11 anfallare vinner inga matcher. Wavult-teamet är satt med komplementära roller — legal+ops, operations, finance, tech — precis som ett lag med anfallare, mittfält, backar och målvakt.',
    technical:
      'Teamet:\n- Erik Svensson — Chairman & Group CEO. Strategi, vision, kapitalallokering, externa relationer.\n- Dennis Bjarnemark — Board Member, Chief Legal & Operations (Interim). Legal struktur, kontrakt, operativ koordination. +46761474243\n- Leon Maurizio Russo De Cerame — CEO Wavult Operations. Daglig drift, produkt-execution. +46738968949\n- Winston Gustav Bjarnemark — CFO. Finansiell kontroll, bokföring, budget. +46768123548\n- Johan Putte Berglund — Group CTO. Teknisk arkitektur, dev-team, platform reliability. +46736977576',
    connection:
      'RACI-matris per projekt behövs: vem är Responsible, Accountable, Consulted, Informed för varje beslut. Team Pulse mäter teamets hälsa och motivation kontinuerligt.',
    tomorrow: 'Four-Layer Framework — Makro/Meso/Micro/Pix',
    wavult_specific: true,
    source_entities: ['team-pulse', 'wavult-os-api'],
  },
  {
    day: 58,
    week: 10,
    category: 'team',
    system: 'Four-Layer Framework',
    emoji: '🏛️',
    color: '#EC4899',
    title: 'Four-Layer Framework — Makro/Meso/Micro/Pix, hur vi tänker om system',
    analogy:
      'Allt vi bygger kan beskrivas på fyra nivåer: Makro (hela bolaget/marknaden), Meso (produkten/plattformen), Micro (en specifik feature/service), Pix (en enskild pixel/datapunkt). Rätt beslut på rätt nivå. Blanda inte ihop dem.',
    technical:
      'Four-Layer Framework:\n- MAKRO: Wavult Group som helhet — bolagsstruktur, marknad, strategi, funding. Tid: kvartal, år.\n- MESO: Produkter — quiXzoom, LandveX, Wavult OS. Arkitektur, go-to-market, pricing. Tid: månader.\n- MICRO: Services — wavult-os-api, quixzoom-api, landvex-api. Features, endpoints, datamodeller. Tid: veckor.\n- PIX: Data-punkter — en enskild zoomer-submission, ett alert, en transaktion. Tid: realtid.',
    connection:
      'Praktisk användning: Erik tänker Makro (bolagsstruktur, exit). Johan tänker Micro (API-arkitektur). Dennis tänker Makro/Meso (legal struktur per produkt). Bernt (AI) tänker Pix → Micro (systemhälsa, datakvalitet).',
    tomorrow: 'Knowledge Engine — hur Wavult OS lär sig och förbättrar sig',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'wavult-core'],
  },
  {
    day: 59,
    week: 10,
    category: 'team',
    system: 'Knowledge Engine',
    emoji: '🧠',
    color: '#EC4899',
    title: 'Knowledge Engine — hur Wavult OS lär sig och förbättrar sig',
    analogy:
      'En traditionell databas minns fakta. En Knowledge Engine förstår sammanhang — "quixzoom-api kraschade igår kl 14:23 efter deploy av commit abc123 som ändrade Redis-konfigurationen." Det är kunskap, inte bara data.',
    technical:
      'Knowledge Engine i Wavult OS:\n- systemRegistry.ts: definierar alla "entities" (services, databaser, bolag, integrationer)\n- knowledgeData.ts: innehåll och metadata per entity\n- Reactive Knowledge: varje system-event → skrivs till morning_brief-tabellen → Bernt kan söka\n- Integration med curriculumData.ts: lektioner länkas till faktiska entities via source_entities[]\n- /api/knowledge/articles?source_entity=wavult-os-api → hämtar relaterade artiklar',
    connection:
      'Wavult OS Knowledge Hub visar: senaste system events för en service, relaterade lektioner (från Systemskolan), aktuell status, dokumentation. Bernt kan svara på "vad är statusen för quixzoom-api?" med kontext från hela Knowledge Engine.',
    tomorrow: 'Framtiden — år 2 och 3, exit-möjligheter och vision',
    wavult_specific: true,
    source_entities: ['wavult-os-api', 'wavult-core', 'n8n'],
  },
  {
    day: 60,
    week: 10,
    category: 'team',
    system: 'Vision & Exit',
    emoji: '🚀',
    color: '#EC4899',
    title: 'Framtiden — år 2 och 3, exit-möjligheter och vad vi bygger mot',
    analogy:
      'Varje byggare vet att ett hus tar 2 år men man tänker 20 år framåt. Vi bygger Wavult Group för att vara relevant om 10 år — men vi gör rätt val idag (IP-struktur, bolagsform, tech-stack) som gör alla exit-vägar öppna.',
    technical:
      'Roadmap:\nÅr 1 (2026): quiXzoom Sweden launch. LandveX 10 kommuner. Bolagsstruktur klar. Team på plats.\nÅr 2 (2027): Nordisk expansion (DK, NO, FI). UAPIX/Apifly externa kunder. 5 MSEK ARR.\nÅr 3 (2028): EU-expansion (NL, DE, FR). Series A (20-50 MSEK). Potentiell exit-förberedelse.\n\nExit-möjligheter:\n1. Strategic acquirer — Hitta AB, Trimble, Esri (GIS-bolag)\n2. PE buyout — Nordic private equity\n3. IPO — Nasdaq First North (om >100 MSEK ARR)\n4. Management buyout — teamet köper ut investerare',
    connection:
      'Allt vi gör idag bygger mot exit-optionalitet: IP i DMCC (lätt att flytta), clean cap table (Delaware C Corp), skalbar tech-stack (ECS auto-scaling), och ett team som kan köra utan grundarens närvaro. Det är fundamentet för alla exits.',
    tomorrow: 'Kursen börjar om på nästa nivå — vi har gått igenom hela Wavult Groups system',
    wavult_specific: true,
    source_entities: ['wavult-core', 'wavult-os-api'],
  },
]
