// ─── People Intelligence — Data ───────────────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
  title: string
  emoji: string
  color: string
  email: string
  phone: string
  reportsTo: string | null  // id
  directReports: string[]   // ids
  entity: string            // vilket bolag
  responsibilities: string[]
  workDescription: string
  contactPreference: 'telegram' | 'email' | 'phone'
  mbti?: string
  disc?: string
  strengths: string[]
  feedbackStyle: string
}

export interface Entity {
  id: string
  name: string
  shortName: string
  emoji: string
  color: string
  purpose: string
  jurisdiction: string
  status: 'active' | 'forming' | 'planned'
  memberIds: string[]
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    title: 'Chairman & Group CEO',
    emoji: '👑',
    color: '#2563EB',
    email: 'erik@wavult.com',
    phone: '+46709123223',
    reportsTo: null,
    directReports: ['dennis', 'leon', 'winston', 'johan'],
    entity: 'wavult-group',
    responsibilities: [
      'Övergripande strategi & vision',
      'Investerarrelationer',
      'Bolagsstruktur & expansion',
      'Produktvision',
      'Externa partnerskap',
    ],
    workDescription:
      'Sätter riktning för hela Wavult Group, koordinerar alla verksamhetsgrenar och håller externa relationer. Driver bolagsstrukturen (Dubai, Litauen, USA), fattar kapitalallokerings-beslut och representerar gruppen mot investerare och strategiska partners.',
    contactPreference: 'telegram',
    mbti: 'ENTJ',
    disc: 'D',
    strengths: ['Vision', 'Systemtänk', 'Snabb exekvering', 'Strategisk riktning'],
    feedbackStyle:
      'Vill ha direkt, koncist feedback. Kom till poängen — skippa bakgrunden. Presentera slutsatser, inte process.',
  },
  {
    id: 'dennis',
    name: 'Dennis Bjarnemark',
    title: 'Chief Legal & Operations (Interim)',
    emoji: '⚖️',
    color: '#10B981',
    email: 'dennis@wavult.com',
    phone: '0761474243',
    reportsTo: 'erik',
    directReports: [],
    entity: 'wavult-group',
    responsibilities: [
      'Juridik & avtalsgranskning',
      'Bolagsbildning & compliance',
      'Operativ styrning & SOP:er',
      'Riskbedömningar',
      'Styrelsedokument',
    ],
    workDescription:
      'Granskar och förhandlar juridiska dokument, hanterar bolagsadmin för alla entiteter (Dubai FZCO, SE, US), dokumenterar och standardiserar operativa processer. Säkerställer att noll compliance-deadlines missas.',
    contactPreference: 'email',
    mbti: 'ISTJ',
    disc: 'C',
    strengths: ['Legal precision', 'Riskanalys', 'Processdesign', 'Dokumentation'],
    feedbackStyle:
      'Vill ha skriftlig, strukturerad feedback med data och konkreta exempel. Ge tid att processa.',
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cerame',
    title: 'CEO Wavult Operations',
    emoji: '⚙️',
    color: '#F59E0B',
    email: 'leon@wavult.com',
    phone: '+46738968949',
    reportsTo: 'erik',
    directReports: [],
    entity: 'wavult-group',
    responsibilities: [
      'Sälj & go-to-market',
      'Operativ execution',
      'Zoomer-rekrytering (quiXzoom)',
      'Partnerskap & kundrelationer',
      'Teambuilding & kultur',
    ],
    workDescription:
      'Driver quiXzoom och LandveX mot marknaden. Koordinerar daglig operativ drift, genererar och stänger leads, onboardar nya teammedlemmar och håller teamets energi hög. Primär kontakt för externa partners och kunder.',
    contactPreference: 'phone',
    mbti: 'ENFJ',
    disc: 'I',
    strengths: ['Relationsbyggande', 'Säljförmåga', 'Teamenergi', 'Exekvering'],
    feedbackStyle:
      'Reagerar bäst på entusiastisk, positiv feedback med fokus på framsteg. Börja med relation, sedan agendan.',
  },
  {
    id: 'winston',
    name: 'Winston Bjarnemark',
    title: 'CFO',
    emoji: '💰',
    color: '#3B82F6',
    email: 'winston@wavult.com',
    phone: '0768123548',
    reportsTo: 'erik',
    directReports: [],
    entity: 'wavult-group',
    responsibilities: [
      'Finansiell rapportering & bokslut',
      'Budget & forecasts',
      'Kassaflöde & likviditet',
      'Intercompany-flöden',
      'Skatteplanering & revision',
    ],
    workDescription:
      'Ansvarar för månads- och kvartalsrapporter, budgetuppföljning och P&L per bolag. Hanterar intercompany-flöden och säkerställer att varje entitet har tillräcklig likviditet. Löner betalas ut den 25:e varje månad.',
    contactPreference: 'email',
    mbti: 'ISTJ',
    disc: 'C/S',
    strengths: ['Finansiell precision', 'Budgetuppföljning', 'Riskminimering', 'Pålitlig leverans'],
    feedbackStyle:
      'Sifferdrivet och metodiskt — vill ha data och underlag. Ge tid att reflektera, inte beslut i stunden.',
  },
  {
    id: 'johan',
    name: 'Johan Berglund',
    title: 'Group CTO',
    emoji: '🔧',
    color: '#06B6D4',
    email: 'johan@wavult.com',
    phone: '+46736977576',
    reportsTo: 'erik',
    directReports: [],
    entity: 'wavult-group',
    responsibilities: [
      'Systemarkitektur & teknisk vision',
      'Infrastruktur & driftsäkerhet',
      'Kodkvalitet & developer standards',
      'Säkerhet & data compliance',
      'API & integrations-beslut',
    ],
    workDescription:
      'Sätter teknisk riktning för hela gruppen. Ansvarar för AWS, Cloudflare, Supabase och alla produktionsmiljöer. Hanterar CI/CD, code reviews och onboarding av nya developers. Inga driftstörningar utan RCA.',
    contactPreference: 'telegram',
    mbti: 'INTJ',
    disc: 'C',
    strengths: ['Systemarkitektur', 'Kodkvalitet', 'Teknisk vision', 'Integration & API-design'],
    feedbackStyle:
      'Analytisk och metodisk. Vill ha fullständig information och tid att tänka. Vara exakt och precis.',
  },
]

export const ENTITIES: Entity[] = [
  {
    id: 'wavult-group',
    name: 'Wavult Group',
    shortName: 'Gruppen',
    emoji: '🌐',
    color: '#2563EB',
    purpose: 'Moderbolag och strategisk holdingstruktur för alla verksamheter',
    jurisdiction: 'Sverige / Dubai / Litauen / USA',
    status: 'active',
    memberIds: ['erik', 'dennis', 'leon', 'winston', 'johan'],
  },
  {
    id: 'quixzoom',
    name: 'quiXzoom UAB',
    shortName: 'quiXzoom',
    emoji: '📸',
    color: '#F59E0B',
    purpose: 'Global crowdsourcad bildinfrastruktur — zoomers tar uppdrag via app, levererar bilddata',
    jurisdiction: 'Litauen (UAB)',
    status: 'forming',
    memberIds: ['leon', 'johan'],
  },
  {
    id: 'optical-insight',
    name: 'Optical Insight',
    shortName: 'Optical',
    emoji: '👁',
    color: '#10B981',
    purpose: 'B2B: säljer analyserad intelligens till infrastrukturägare och myndigheter',
    jurisdiction: 'Sverige / Dubai',
    status: 'planned',
    memberIds: ['erik', 'leon'],
  },
  {
    id: 'landvex',
    name: 'LandveX',
    shortName: 'LandveX',
    emoji: '🗺',
    color: '#06B6D4',
    purpose: 'Geospatial dataplattform — leads, marknadsdata och hyperlokal annonsering på karta',
    jurisdiction: 'Dubai FZCO',
    status: 'forming',
    memberIds: ['erik', 'johan'],
  },
  {
    id: 'wavult-ops',
    name: 'Wavult Operations',
    shortName: 'Operations',
    emoji: '⚙️',
    color: '#EC4899',
    purpose: 'Operativt bolag — driver daglig execution för hela gruppen',
    jurisdiction: 'Sverige',
    status: 'active',
    memberIds: ['leon', 'dennis', 'winston'],
  },
]

export const MOCK_TASKS: Record<string, { id: string; title: string; status: 'active' | 'waiting' | 'done'; priority: 'high' | 'medium' | 'low' }[]> = {
  erik: [
    { id: 't1', title: 'Dubai FZCO — koordinera registrering med Dennis', status: 'active', priority: 'high' },
    { id: 't2', title: 'Thailand workcamp agenda Q2 2026', status: 'active', priority: 'high' },
    { id: 't3', title: 'Investerarrelationer — pitch deck v3', status: 'waiting', priority: 'medium' },
    { id: 't4', title: 'Bolagsstruktur-diagram uppdateras', status: 'active', priority: 'medium' },
  ],
  dennis: [
    { id: 't5', title: 'Dubai FZCO registreringshandlingar', status: 'active', priority: 'high' },
    { id: 't6', title: 'Standardavtal NDA — mall i Legal Hub', status: 'active', priority: 'medium' },
    { id: 't7', title: 'SOP onboarding ny teammedlem', status: 'waiting', priority: 'low' },
  ],
  leon: [
    { id: 't8', title: 'quiXzoom — 5 kvalificerade leads denna vecka', status: 'active', priority: 'high' },
    { id: 't9', title: 'Demo-bokning LandveX partner', status: 'active', priority: 'high' },
    { id: 't10', title: 'Thailand workcamp — teambuilding-schema', status: 'waiting', priority: 'medium' },
  ],
  winston: [
    { id: 't11', title: 'Månadsrapport april — klar senast den 5:e', status: 'active', priority: 'high' },
    { id: 't12', title: 'Intercompany-flöden dokumenterade', status: 'active', priority: 'medium' },
    { id: 't13', title: 'Löner april — kontrollkörning', status: 'waiting', priority: 'high' },
  ],
  johan: [
    { id: 't14', title: 'Wavult OS — People Intelligence modul', status: 'done', priority: 'high' },
    { id: 't15', title: 'quiXzoom backend API — endpoints', status: 'active', priority: 'high' },
    { id: 't16', title: 'AWS ECS monitoring setup', status: 'active', priority: 'medium' },
    { id: 't17', title: 'CI/CD pipeline för quiXzoom', status: 'waiting', priority: 'medium' },
  ],
}
