// ─── Knowledge Hub — Data Layer ──────────────────────────────────────────────

export type DocCategory = 'Wavult Group' | 'QuiXzoom' | 'Landvex' | 'Internt' | 'Juridik'

export interface KnowledgeDoc {
  id: string
  title: string
  category: DocCategory
  summary: string
  tags: string[]
  updatedAt: string
  content: string
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: 'doc-001',
    title: 'Wavult Group — Bolagsstruktur',
    category: 'Wavult Group',
    summary: 'Komplett bolagsstruktur: Dubai holding, Litauen UAB, Delaware Inc. Pengaflöde och juridisk separation.',
    tags: ['holding', 'dubai', 'struktur', 'entiteter'],
    updatedAt: '2026-03-25',
    content: `## Wavult Group — Bolagsstruktur

**Koncernhierarki:**
- Wavult Group (Dubai, holding + IP)
- Wavult Operations (Dubai, drift + personal)
- QuiXzoom UAB (Litauen, EU-verksamhet)
- QuiXzoom Inc (Delaware, USA-verksamhet)
- Landvex UAB (Litauen, EU-verksamhet)
- Landvex Inc (Delaware, USA-verksamhet)

**Pengaflöde:** Intäkter i lokala bolag → fees till Operations → royalty 5–15% till Group.

**Juridisk separation:** Separata konton, styrelser och avtal för varje bolag.`
  },
  {
    id: 'doc-002',
    title: 'Dubai-struktur — Free Zone Setup',
    category: 'Wavult Group',
    summary: 'Hur Dubai Free Zone fungerar, fördelar med UAE-struktur, skattestrategi och IP-skydd.',
    tags: ['dubai', 'free zone', 'skatt', 'ip'],
    updatedAt: '2026-03-25',
    content: `## Dubai Free Zone Setup

**Fördelar:**
- 0% bolagsskatt (upp till en gräns)
- 100% utländskt ägande tillåtet
- Full kapitalrepatriering
- Stark IP-skyddslagstiftning

**Free Zone alternativ:** IFZA, DIFC, ADGM
**Rekommendation:** IFZA för operationsbolag, DIFC för IP-holding

**IP-strategi:** Wavult Group äger all kod, varumärken och arkitektur. Licensierar till driftsbolag via IP-avtal.`
  },
  {
    id: 'doc-003',
    title: 'QuiXzoom — Plattformsarkitektur',
    category: 'QuiXzoom',
    summary: 'Crowdsourcad kamerainfrastruktur: arkitektur, tech stack, mikrotjänster på AWS ECS.',
    tags: ['arkitektur', 'aws', 'ecs', 'microservices', 'react-native'],
    updatedAt: '2026-03-23',
    content: `## QuiXzoom Platform Architecture

**Koncept:** Global crowdsourcad kamerainfrastruktur — fotografer tar uppdrag via karta, levererar bilddata, tjänar pengar.

**Tech Stack:**
- Mobile: React Native (Expo) + Mapbox + Vision Camera
- Backend: Node.js/TypeScript på AWS ECS Fargate
- Data: PostgreSQL (RDS Multi-AZ) + S3 + CloudFront
- Events: SNS/SQS event bus

**Services:** mission-service, auth-service, media-service, notification-service, billing-service

**Region:** eu-north-1 (primär) → multi-region`
  },
  {
    id: 'doc-004',
    title: 'Landvex — Produktspec & Marknad',
    category: 'Landvex',
    summary: 'AI-driven inspektionsplattform för infrastruktur. Marknad: kommuner, Trafikverket, fastighetsbolag.',
    tags: ['landvex', 'infrastruktur', 'ai', 'kommuner', 'b2b'],
    updatedAt: '2026-03-25',
    content: `## Landvex — Produktspec

**Produktbeskrivning:** AI-analyserad intelligens för infrastrukturägare. Händelsebaserade alerts, inte rådata.

**Målkunder:**
- Kommuner och regioner
- Trafikverket och transportmyndigheter  
- Fastighetsbolag med infrastrukturansvar
- Hamnar och logistikterminaler

**Marknad:**
- Sverige (lansering juni 2026 — skärgården som startpunkt)
- Nederländerna (Q1 2027)
- Övriga EU

**Bolagsstruktur:** Landvex UAB (Litauen) + Landvex Inc (Delaware)`
  },
  {
    id: 'doc-005',
    title: 'Landvex — Deploy & Infrastruktur',
    category: 'Landvex',
    summary: 'AWS-infrastruktur, deployment pipeline och techniska specifikationer för Landvex.',
    tags: ['aws', 'deploy', 'infrastructure', 'ecs'],
    updatedAt: '2026-03-20',
    content: `## Landvex Deploy

**Infrastruktur:** AWS ECS Fargate, eu-north-1
**CI/CD:** GitHub Actions → ECR → ECS
**Databas:** Aurora PostgreSQL Serverless v2
**CDN:** CloudFront + S3

**Miljöer:**
- dev: landvex-dev.hypbit.com
- staging: landvex-staging.hypbit.com  
- prod: landvex.com + app.landvex.com`
  },
  {
    id: 'doc-006',
    title: 'Wavult OS — Systemarkitektur',
    category: 'Internt',
    summary: 'Wavult OS (Hypbit) systemarkitektur: React frontend, modulstruktur, entity-scope, rollhantering.',
    tags: ['wavult-os', 'hypbit', 'frontend', 'react', 'arkitektur'],
    updatedAt: '2026-03-25',
    content: `## Wavult OS (Hypbit) — Systemarkitektur

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- UI: Tailwind CSS + shadcn/ui
- State: React Context + localStorage
- Deploy: Cloudflare Pages

**Modulstruktur:** features/ (dashboard, crm, finance, legal, communications, etc.)

**Kärnkoncept:**
- RoleContext: admin/ceo/cfo/cto/ops
- EntityScopeContext: filtrera per bolag
- Shell: sidebar-layout med nav-grupper
- MaturityModel: modul-mognadsnivåer (alpha/beta/stable)`
  },
  {
    id: 'doc-007',
    title: 'Internt Handbok v1',
    category: 'Internt',
    summary: 'Wavult Groups interna handbok: roller, ansvar, processer och kulturella principer.',
    tags: ['handbok', 'roller', 'processer', 'kultur'],
    updatedAt: '2026-03-20',
    content: `## Wavult Intern Handbok v1

**Principer:**
- Snabbt > Perfekt i tidiga faser
- Dokumentera allt som ska överleva en session
- Dubai-strukturen är ryggraden — respektera juridiska gränser

**Team:**
- Erik Svensson — Chairman + Group CEO
- Dennis Bjarnemark — Chief Legal & Operations
- Leon Russo De Cerame — CEO Wavult Operations
- Winston Bjarnemark — CFO
- Johan Berglund — Group CTO

**Kommunikation:** Telegram-first för interna uppdateringar
**Kodnorm:** TypeScript strict, Prettier, ESLint`
  },
  {
    id: 'doc-008',
    title: 'API-integrationer — Översikt',
    category: 'Internt',
    summary: 'Alla externa API:er som används: Cloudflare, AWS, BankID, n8n, Supabase.',
    tags: ['api', 'integrationer', 'cloudflare', 'aws', 'bankid'],
    updatedAt: '2026-03-22',
    content: `## API-integrationer

**Cloudflare:**
- Pages Deploy: wrangler CLI
- DNS: zones per domän
- Email Workers (planerat)

**AWS:**
- ECS Fargate: wavult-os-api, quixzoom-api, n8n, team-pulse
- Region: eu-north-1
- Account: 155407238699

**BankID:**
- Planerat för Landvex (myndighetsinloggning)
- Kräver avtal via Visma eller liknande

**n8n:** Automation hub, körs på ECS
**Supabase:** command-center frontend DB`
  },
  {
    id: 'doc-009',
    title: 'Juridiska Dokument — Status',
    category: 'Juridik',
    summary: 'Status på bolagsregistreringar, avtal och juridiska milestones för hela koncernen.',
    tags: ['juridik', 'bolagsregistrering', 'avtal', 'compliance'],
    updatedAt: '2026-03-25',
    content: `## Juridiska Dokument — Status

**Bolagsregistreringar:**
- Wavult Group (Dubai): Planerad Q2 2026
- Wavult Operations (Dubai): Planerad Q2 2026  
- QuiXzoom UAB: Planerad Q2 2026
- Landvex UAB: Planerad Q2 2026

**Kritiska avtal att upprätta:**
- IP-licensavtal: Wavult Group → alla operationsbolag
- Management Service Agreement: Operations → alla bolag
- Shareholders Agreement

**Signaturkrav:** L3 (Board-nivå) krävs för bolagsavtal
**Signaturmetod:** DocuSign för internationella avtal`
  },
  {
    id: 'doc-010',
    title: 'Thailand Workcamp — Plan',
    category: 'Internt',
    summary: 'Teamcamp i Thailand 11 april 2026: vecka 1 teambuilding + utbildning, sedan projektlansering.',
    tags: ['thailand', 'workcamp', 'team', 'utbildning'],
    updatedAt: '2026-03-21',
    content: `## Thailand Workcamp — April 2026

**Datum:** 11 april 2026
**Plats:** Thailand (TBD)

**Schema:**
- Vecka 1: Teambuilding + Wavult OS-utbildning
- Vecka 2+: Projektlansering — quiXzoom, Landvex, Wavult OS

**Mål:**
- Hela teamet certifierat på Wavult OS
- QuiXzoom MVP-demo klar
- Landvex beta-site live
- Dubai-struktur presenterad och förankrad

**Deltagare:** Erik, Dennis, Leon, Winston, Johan`
  },
  {
    id: 'doc-011',
    title: 'Domänportfölj — Wavult',
    category: 'Internt',
    summary: 'Alla domäner i Wavult Groups portfölj med status, DNS och Cloudflare zone-IDs.',
    tags: ['domäner', 'dns', 'cloudflare', 'wavult', 'quixzoom'],
    updatedAt: '2026-03-25',
    content: `## Domänportfölj

| Domän | Status | Zone ID |
|-------|--------|---------|
| wavult.com | Pending (NS ej satt) | 5bed27e91d719b3f9d82c234d191ad99 |
| quixzoom.com | Active | e9a9520b64cd67eca1d8d926ca9daa79 |
| hypbit.com | Active | 128f872b669d059d1dfca3c9474098f1 |
| landvex.com | TBD | — |

**NS för wavult.com:**
- arch.ns.cloudflare.com
- gina.ns.cloudflare.com

**DNS-provider:** Cloudflare (alla domäner)`
  },
  {
    id: 'doc-012',
    title: 'QuiXzoom — Zoomer-certifiering',
    category: 'QuiXzoom',
    summary: 'Certifieringsprogram för QuiXzoom-fotografer: kvalitetskrav, betygssystem och uppdragstyper.',
    tags: ['zoomer', 'certifiering', 'fotograf', 'kvalitet'],
    updatedAt: '2026-03-20',
    content: `## Zoomer-certifiering

**Syfte:** Säkerställa kvalitet i QuiXzoom-nätverket

**Certifieringsnivåer:**
- Standard Zoomer: Klarat grundkurs + 5 godkända uppdrag
- Pro Zoomer: 50+ uppdrag, 4.5+ betyg
- Elite Zoomer: 200+ uppdrag, 4.8+ betyg, specialistutbildning

**Krav för Standard:**
- Genomfört Zoomer-certifieringskursen
- Klarat quiz (80% rätt)
- 5 godkända testuppdrag
- Accepterat plattformsavtalet

**Belöningssystem:** Högre nivå = fler uppdrag, bättre betalning, prioritet i app`
  }
]

// ─── Knowledge Graph Nodes ────────────────────────────────────────────────────

export type NodeType = 'holding' | 'operations' | 'product' | 'system' | 'person' | 'market'

export interface GraphNode {
  id: string
  name: string
  type: NodeType
  color: string
  description: string
  layer: number
  links?: string[]
}

export const GRAPH_NODES: GraphNode[] = [
  {
    id: 'wavult-group',
    name: 'Wavult Group',
    type: 'holding',
    color: '#8B5CF6',
    description: 'Ultimate parent. Äger all IP, varumärken och kod. Dubai Free Zone.',
    layer: 0,
    links: ['wavult-ops', 'quixzoom-uab', 'quixzoom-inc', 'landvex-uab', 'landvex-inc']
  },
  {
    id: 'wavult-ops',
    name: 'Wavult Operations',
    type: 'operations',
    color: '#6366F1',
    description: 'Central driftsenhet. Anställer personal, kör Hypbit, hanterar payments. Dubai.',
    layer: 1,
    links: ['hypbit', 'bernt', 'quixzoom-uab', 'landvex-uab']
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    type: 'product',
    color: '#F59E0B',
    description: 'QuiXzoom EU-verksamhet. Litauen UAB. Crowdsourcad kamerainfrastruktur.',
    layer: 2,
    links: ['quixzoom-app', 'quixzoom-api']
  },
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    type: 'product',
    color: '#F59E0B',
    description: 'QuiXzoom USA-verksamhet. Delaware Inc.',
    layer: 2,
    links: ['quixzoom-app', 'quixzoom-api']
  },
  {
    id: 'landvex-uab',
    name: 'Landvex UAB',
    type: 'product',
    color: '#10B981',
    description: 'Landvex EU-verksamhet. Litauen UAB. AI-driven infrastrukturinspektion.',
    layer: 2,
    links: ['landvex-app']
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc',
    type: 'product',
    color: '#10B981',
    description: 'Landvex USA-verksamhet. Delaware Inc.',
    layer: 2,
    links: ['landvex-app']
  },
  {
    id: 'hypbit',
    name: 'Wavult OS (Hypbit)',
    type: 'system',
    color: '#3B82F6',
    description: 'Internt OS för hela koncernen. React + TypeScript, Cloudflare Pages. INTE ett bolag.',
    layer: 3,
    links: ['bernt']
  },
  {
    id: 'quixzoom-app',
    name: 'QuiXzoom App',
    type: 'system',
    color: '#FCD34D',
    description: 'React Native mobilapp. Mapbox + Vision Camera. Fotografernas verktyg.',
    layer: 3,
    links: ['quixzoom-api']
  },
  {
    id: 'quixzoom-api',
    name: 'QuiXzoom API',
    type: 'system',
    color: '#FCD34D',
    description: 'Node.js backend på AWS ECS. Mission, auth, media, notification services.',
    layer: 3
  },
  {
    id: 'landvex-app',
    name: 'Landvex Platform',
    type: 'system',
    color: '#34D399',
    description: 'AI-analyserad infrastrukturdata. Händelsebaserade alerts för kommuner och myndigheter.',
    layer: 3
  },
  {
    id: 'bernt',
    name: 'Bernt (AI)',
    type: 'person',
    color: '#EC4899',
    description: 'Wavult Groups AI-agent. Kör i Wavult OS. Hjälper hela teamet med drift, analys och beslut.',
    layer: 4
  },
  {
    id: 'dubai',
    name: 'Dubai (UAE)',
    type: 'market',
    color: '#EF4444',
    description: 'Primär juridisk hemvist. Free Zone LLC. 0% skatt, full kapitalrepatriering.',
    layer: 1,
    links: ['wavult-group', 'wavult-ops']
  },
  {
    id: 'eu-market',
    name: 'EU Market',
    type: 'market',
    color: '#0EA5E9',
    description: 'Litauen som EU-bas. GDPR-hemvist, SEPA-betalningar, EU-upphandlingar.',
    layer: 2,
    links: ['quixzoom-uab', 'landvex-uab']
  },
  {
    id: 'usa-market',
    name: 'USA Market',
    type: 'market',
    color: '#0EA5E9',
    description: 'Delaware Inc för USA-verksamhet. Enkel bolagsform, välkänd för investerare.',
    layer: 2,
    links: ['quixzoom-inc', 'landvex-inc']
  }
]
