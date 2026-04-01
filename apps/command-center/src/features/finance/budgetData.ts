// budgetData.ts — Wavult Group Budget 2026
// Realistisk startup-budget för hela koncernens operativa år 2026

export type BudgetCategory =
  | 'personal'
  | 'infrastruktur'
  | 'juridik'
  | 'marknadsforing'
  | 'workcamp'
  | 'reserve'

export type BudgetQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface BudgetLine {
  id: string
  category: BudgetCategory
  title: string
  description: string
  /** Belopp i SEK */
  amountSEK: number
  /** Kvartal beloppet faller */
  quarter: BudgetQuarter
  /** Ansvarig */
  owner: string
  /** Engångskostnad eller löpande */
  type: 'engangskostnad' | 'lopande'
  /** Bolag / entitet */
  entity?: string
}

export interface BudgetSummary {
  category: BudgetCategory
  label: string
  icon: string
  color: string
  totalSEK: number
  lines: BudgetLine[]
}

// ─── Budget Lines 2026 ────────────────────────────────────────────────────────

export const BUDGET_LINES_2026: BudgetLine[] = [
  // ─── Personal (5 pers) — ~2 500 000 SEK/år ────────────────────────────
  {
    id: 'p-1',
    category: 'personal',
    title: 'Erik Svensson — Chairman/CEO',
    description: 'Ledning, strategi, investerarkontakter, styrelsearbete',
    amountSEK: 600000,
    quarter: 'Q1',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'p-2',
    category: 'personal',
    title: 'Dennis Bjarnemark — Legal/Ops',
    description: 'Juridik, bolagsbildning, compliance, operativ koordinering',
    amountSEK: 480000,
    quarter: 'Q1',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Landvex AB',
  },
  {
    id: 'p-3',
    category: 'personal',
    title: 'Leon Russo — CEO Operations',
    description: 'Försäljning, kundrelationer, marknad, quiXzoom-rekrytering',
    amountSEK: 480000,
    quarter: 'Q1',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Landvex AB',
  },
  {
    id: 'p-4',
    category: 'personal',
    title: 'Winston Bjarnemark — CFO',
    description: 'Finansiell styrning, rapportering, skatteplanering, treasury',
    amountSEK: 480000,
    quarter: 'Q1',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'p-5',
    category: 'personal',
    title: 'Johan Berglund — CTO',
    description: 'Teknisk ledning, systemarkitektur, Wavult OS, quiXzoom-plattform',
    amountSEK: 460000,
    quarter: 'Q1',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },

  // ─── Infrastruktur — ~200 000 SEK/år ─────────────────────────────────
  {
    id: 'i-1',
    category: 'infrastruktur',
    title: 'AWS — ECS, RDS, S3, CloudFront',
    description: 'Hosting av quiXzoom-API, Wavult OS API, n8n, tjänster',
    amountSEK: 84000,
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-2',
    category: 'infrastruktur',
    title: 'Supabase — databas & auth',
    description: 'PostgreSQL, realtime, storage för Wavult OS och quiXzoom',
    amountSEK: 36000,
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-3',
    category: 'infrastruktur',
    title: 'Cloudflare — DNS, Pages, Workers',
    description: 'CDN, edge-functions, WAF, domänhantering',
    amountSEK: 18000,
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-4',
    category: 'infrastruktur',
    title: 'SaaS-verktyg — Slack, Linear, Figma, m.fl.',
    description: 'Teamkommunikation, projekthantering, design, analys',
    amountSEK: 36000,
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-5',
    category: 'infrastruktur',
    title: 'Stripe & betalinfrastruktur',
    description: 'Transaktionsavgifter, zoomer-utbetalningar, prenumerationshantering',
    amountSEK: 26000,
    quarter: 'Q2',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'QuiXzoom Inc',
  },
  // ─── Infrastruktur (detaljerad från Infrastructure Operations Center) ──────
  {
    id: 'i-infra-aws-ecs-s3',
    category: 'infrastruktur',
    title: 'AWS ECS + S3 + SSM — WG-TECH-2026-001/007/009',
    description: 'ECS: wavult-api (800 SEK) + quixzoom-api (400 SEK) + S3 EU/US primary/backup (120 SEK) = ~1 320 SEK/mån',
    amountSEK: 15840,   // 1 320 × 12
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-infra-supabase',
    category: 'infrastruktur',
    title: 'Supabase — Wavult OS + quiXzoom — WG-TECH-2026-005/006',
    description: 'Supabase wavult-os (250 SEK) + quixzoom-v2 (250 SEK) = 500 SEK/mån',
    amountSEK: 6000,    // 500 × 12
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-infra-cloudflare',
    category: 'infrastruktur',
    title: 'Cloudflare Pages — Wavult OS + quiXzoom — WG-TECH-2026-010/015',
    description: 'Free tier — 0 SEK/mån',
    amountSEK: 0,
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-infra-mapbox',
    category: 'infrastruktur',
    title: 'Mapbox API — WG-TECH-2026-012',
    description: 'Kartrendering quiXzoom — ~500 SEK/mån',
    amountSEK: 6000,    // 500 × 12
    quarter: 'Q2',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'QuiXzoom Inc',
  },
  {
    id: 'i-infra-github',
    category: 'infrastruktur',
    title: 'GitHub Actions CI/CD — WG-TECH-2026-013',
    description: 'Free tier (public repo) — 0 SEK/mån',
    amountSEK: 0,
    quarter: 'Q1',
    owner: 'Johan Berglund',
    type: 'lopande',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'i-infra-stripe-tx',
    category: 'infrastruktur',
    title: 'Stripe — transaktionsbaserat (WG-FIN-2026-004)',
    description: 'Ingen fast kostnad — transaktionsavgifter beräknas per volym. Konfigureras Q2.',
    amountSEK: 0,
    quarter: 'Q2',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'QuiXzoom Inc',
  },

  // ─── Juridik & bolagsbildning — ~300 000 SEK ─────────────────────────
  {
    id: 'j-1',
    category: 'juridik',
    title: 'Wavult Group FZCO — IFZA Dubai-registrering',
    description: 'Freezone-licens, lokal agent, trade license, corporate documents',
    amountSEK: 65000,
    quarter: 'Q2',
    owner: 'Dennis Bjarnemark',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'j-2',
    category: 'juridik',
    title: 'Wavult DevOps FZCO — Dubai-registrering',
    description: 'Freezone-licens andra entiteten, trade license, shareholder agreements',
    amountSEK: 55000,
    quarter: 'Q2',
    owner: 'Dennis Bjarnemark',
    type: 'engangskostnad',
    entity: 'Wavult DevOps FZCO',
  },
  {
    id: 'j-3',
    category: 'juridik',
    title: 'QuiXzoom Inc — Delaware incorporation',
    description: 'Inc-registrering, EIN, registered agent, operating agreement',
    amountSEK: 25000,
    quarter: 'Q2',
    owner: 'Dennis Bjarnemark',
    type: 'engangskostnad',
    entity: 'QuiXzoom Inc',
  },
  {
    id: 'j-4',
    category: 'juridik',
    title: 'QuiXzoom UAB — Litauisk registrering',
    description: 'UAB-bildning, bokföringsfirma Q1, share register, GDPR-DPA',
    amountSEK: 35000,
    quarter: 'Q2',
    owner: 'Dennis Bjarnemark',
    type: 'engangskostnad',
    entity: 'QuiXzoom UAB',
  },
  {
    id: 'j-5',
    category: 'juridik',
    title: 'Landvex Inc — Texas/Delaware incorporation',
    description: 'LLC-bildning Houston, EIN, registered agent, operating agreement',
    amountSEK: 25000,
    quarter: 'Q2',
    owner: 'Dennis Bjarnemark',
    type: 'engangskostnad',
    entity: 'Landvex Inc',
  },
  {
    id: 'j-6',
    category: 'juridik',
    title: 'IP-avtal & licensstruktur',
    description: 'IP-assignment från grundare till holding, licensavtal per bolag, NDA-mall',
    amountSEK: 45000,
    quarter: 'Q2',
    owner: 'Dennis Bjarnemark',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'j-7',
    category: 'juridik',
    title: 'Löpande juridik 2026',
    description: 'Zoomer-avtal, uppdragsgivaravtal, GDPR-compliance, kommunavtalsmallar',
    amountSEK: 50000,
    quarter: 'Q3',
    owner: 'Dennis Bjarnemark',
    type: 'lopande',
    entity: 'Landvex AB',
  },

  // ─── Marknadsföring quiXzoom launch — ~500 000 SEK ───────────────────
  {
    id: 'm-1',
    category: 'marknadsforing',
    title: 'Digital annonsering — Meta & Google',
    description: 'Zoomers-rekrytering, uppdragsgivar-leads, awareness-kampanj Sverige',
    amountSEK: 180000,
    quarter: 'Q2',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'QuiXzoom Inc',
  },
  {
    id: 'm-2',
    category: 'marknadsforing',
    title: 'PR & media launch',
    description: 'Pressrelease, media-outreach, influencer-seeding, launch-event',
    amountSEK: 80000,
    quarter: 'Q2',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'QuiXzoom Inc',
  },
  {
    id: 'm-3',
    category: 'marknadsforing',
    title: 'Webbplats & landningssida quiXzoom',
    description: 'Design, copy, SEO-optimering, zoomer-onboarding-flow',
    amountSEK: 60000,
    quarter: 'Q2',
    owner: 'Johan Berglund',
    type: 'engangskostnad',
    entity: 'QuiXzoom Inc',
  },
  {
    id: 'm-4',
    category: 'marknadsforing',
    title: 'Content & video-produktion',
    description: 'Förklaringsvideo quiXzoom, zoomer-testimonials, sociala medier-paket',
    amountSEK: 70000,
    quarter: 'Q2',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'QuiXzoom Inc',
  },
  {
    id: 'm-5',
    category: 'marknadsforing',
    title: 'Landvex B2G — säljmaterial',
    description: 'Pitch deck, kommunpresentationer, case study, ROI-kalkylator',
    amountSEK: 40000,
    quarter: 'Q3',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'Landvex AB',
  },
  {
    id: 'm-6',
    category: 'marknadsforing',
    title: 'quiXzoom Nederländerna — pre-launch',
    description: 'Marknadsanalys NL, lokalt nätverk, partner-identifiering Q4 2026',
    amountSEK: 70000,
    quarter: 'Q4',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'QuiXzoom Inc',
  },

  // ─── Thailand Workcamp — ~250 000 SEK ────────────────────────────────
  {
    id: 'w-1',
    category: 'workcamp',
    title: 'Flyg — 5 pers tur/retur Bangkok',
    description: 'Ekonomiklass, flexibla biljetter, avrese ca 9 april 2026',
    amountSEK: 75000,
    quarter: 'Q2',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'w-2',
    category: 'workcamp',
    title: 'Boende — villa/co-living 1 månad',
    description: 'Gemensamt boende med arbetsyta, Chiang Mai eller Koh Samui, 5 pers',
    amountSEK: 80000,
    quarter: 'Q2',
    owner: 'Leon Russo',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'w-3',
    category: 'workcamp',
    title: 'Levnadskostnader & mat — 5 pers × 1 mån',
    description: 'Dagliga kostnader, transport, internet, arbetsredskap på plats',
    amountSEK: 60000,
    quarter: 'Q2',
    owner: 'Erik Svensson',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'w-4',
    category: 'workcamp',
    title: 'Workcamp-aktiviteter & teambuilding',
    description: 'Kickoff-middag, teamaktiviteter, planerings-workshops, kundbesök',
    amountSEK: 35000,
    quarter: 'Q2',
    owner: 'Erik Svensson',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },

  // ─── Reserve & övrigt — ~500 000 SEK ────────────────────────────────
  {
    id: 'r-1',
    category: 'reserve',
    title: 'Finansiell buffer — oförutsedda kostnader',
    description: 'Likviditetsreserv för oväntade utgifter, förseningar, prisökningar',
    amountSEK: 250000,
    quarter: 'Q3',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'r-2',
    category: 'reserve',
    title: 'Konto-öppning & bankavgifter — 5 entiteter',
    description: 'Merkantile Bank, Mercury, Revolut Business, UAE-bankkonto',
    amountSEK: 35000,
    quarter: 'Q2',
    owner: 'Winston Bjarnemark',
    type: 'engangskostnad',
    entity: 'Wavult Group FZCO',
  },
  {
    id: 'r-3',
    category: 'reserve',
    title: 'Revision & redovisning 2026',
    description: 'Årsredovisning Landvex AB, bokföring alla entiteter Q3-Q4',
    amountSEK: 80000,
    quarter: 'Q4',
    owner: 'Winston Bjarnemark',
    type: 'lopande',
    entity: 'Landvex AB',
  },
  {
    id: 'r-4',
    category: 'reserve',
    title: 'Resor & kundmöten Sverige',
    description: 'Kommunbesök, Trafikverket-möten, pitch-resor under H2 2026',
    amountSEK: 60000,
    quarter: 'Q3',
    owner: 'Leon Russo',
    type: 'lopande',
    entity: 'Landvex AB',
  },
  {
    id: 'r-5',
    category: 'reserve',
    title: 'Hardware & utrustning',
    description: 'Laptops, kameror för demo, testenheter för Optical Insight-piloter',
    amountSEK: 75000,
    quarter: 'Q2',
    owner: 'Johan Berglund',
    type: 'engangskostnad',
    entity: 'Wavult DevOps FZCO',
  },
]

// ─── Category meta ────────────────────────────────────────────────────────────

export const BUDGET_CATEGORY_META: Record<
  BudgetCategory,
  { label: string; icon: string; color: string; budgetSEK: number }
> = {
  personal: {
    label: 'Personal',
    icon: '👥',
    color: '#3B82F6',
    budgetSEK: 2500000,
  },
  infrastruktur: {
    label: 'Infrastruktur',
    icon: '☁️',
    color: '#60A5FA',
    budgetSEK: 200000,
  },
  juridik: {
    label: 'Juridik & Bolagsbildning',
    icon: '⚖️',
    color: '#F59E0B',
    budgetSEK: 300000,
  },
  marknadsforing: {
    label: 'Marknadsföring',
    icon: '📣',
    color: '#EC4899',
    budgetSEK: 500000,
  },
  workcamp: {
    label: 'Thailand Workcamp',
    icon: '🇹🇭',
    color: '#EF4444',
    budgetSEK: 250000,
  },
  reserve: {
    label: 'Reserve & Övrigt',
    icon: '🛡️',
    color: '#6B7280',
    budgetSEK: 500000,
  },
}

// ─── Totals ───────────────────────────────────────────────────────────────────

export const BUDGET_TOTAL_2026_SEK = 4250000

export const BUDGET_QUARTERS: BudgetQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

/** Beräkna totalt per kategori från budget-raderna */
export function getBudgetSummaries(): BudgetSummary[] {
  const categories = Object.keys(BUDGET_CATEGORY_META) as BudgetCategory[]
  return categories.map(cat => {
    const meta = BUDGET_CATEGORY_META[cat]
    const lines = BUDGET_LINES_2026.filter(l => l.category === cat)
    const totalSEK = lines.reduce((sum, l) => sum + l.amountSEK, 0)
    return {
      category: cat,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      totalSEK,
      lines,
    }
  })
}

/** Totalt per kvartal */
export function getBudgetByQuarter(): Record<BudgetQuarter, number> {
  const result: Record<BudgetQuarter, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  for (const line of BUDGET_LINES_2026) {
    result[line.quarter] += line.amountSEK
  }
  return result
}

// ─── Aktivitetsplan Q2-Q4 2026 ───────────────────────────────────────────────

export type ActivityStatus = 'planerad' | 'pagande' | 'klar'

export interface ActivityItem {
  id: string
  month: string
  quarter: BudgetQuarter
  title: string
  description: string
  owner: string
  project: 'quiXzoom' | 'Landvex' | 'Wavult OS' | 'Bolagsstruktur' | 'Övrigt'
  status: ActivityStatus
  milstolpe?: boolean
}

export const ACTIVITY_PLAN: ActivityItem[] = [
  // ─── April 2026 ──────────────────────────────────────────────────────
  {
    id: 'act-1',
    month: 'April 2026',
    quarter: 'Q2',
    title: 'Thailand Workcamp — officiell projektstart',
    description: 'Hela teamet samlas i Thailand 11 april. Kickoff, strategi, team-briefing och operationell start för alla projekt.',
    owner: 'Erik Svensson',
    project: 'Övrigt',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-2',
    month: 'April 2026',
    quarter: 'Q2',
    title: 'Alla bolag strukturerade — juridik klar',
    description: 'Wavult Group FZCO, Wavult DevOps FZCO, QuiXzoom Inc, QuiXzoom UAB och Landvex Inc — alla under bildning eller klara vid workcamp-start.',
    owner: 'Dennis Bjarnemark',
    project: 'Bolagsstruktur',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-3',
    month: 'April 2026',
    quarter: 'Q2',
    title: 'Wavult OS live för hela teamet',
    description: 'Alla 5 teammedlemmar kör Wavult OS dagligen. Milestones, Finance, CRM och WHOOP-integration live.',
    owner: 'Johan Berglund',
    project: 'Wavult OS',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-4',
    month: 'April 2026',
    quarter: 'Q2',
    title: 'quiXzoom-plattform redo för beta',
    description: 'App med karta, uppdragsflöde och betalningar redo att testas av första 20 zoomers.',
    owner: 'Johan Berglund',
    project: 'quiXzoom',
    status: 'planerad',
  },

  // ─── Maj 2026 ────────────────────────────────────────────────────────
  {
    id: 'act-5',
    month: 'Maj 2026',
    quarter: 'Q2',
    title: 'quiXzoom beta-test med 20 zoomers',
    description: 'Kontrollerad beta med 20 rekryterade zoomers i Stockholm. Testa uppdragsflöde, kvalitetskontroll, utbetalningar och feedback.',
    owner: 'Leon Russo',
    project: 'quiXzoom',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-6',
    month: 'Maj 2026',
    quarter: 'Q2',
    title: 'quiXzoom landningssida & zoomer-onboarding live',
    description: 'Webbplats med zoomer-registrering, FAQ, hur-det-fungerar och uppdragsgivare-kontaktformulär.',
    owner: 'Johan Berglund',
    project: 'quiXzoom',
    status: 'planerad',
  },
  {
    id: 'act-7',
    month: 'Maj 2026',
    quarter: 'Q2',
    title: 'Landvex — 5 kommuner kontaktade',
    description: 'Initiala kontakter med 5 svenska kommuner för Optical Insight-demonstration. Förbered pilot-erbjudande.',
    owner: 'Leon Russo',
    project: 'Landvex',
    status: 'planerad',
  },

  // ─── Juni 2026 ───────────────────────────────────────────────────────
  {
    id: 'act-8',
    month: 'Juni 2026',
    quarter: 'Q2',
    title: 'quiXzoom — public launch Sverige',
    description: 'Officiell lansering quiXzoom i Sverige. PR-kampanj, media-outreach, digital annonsering. Mål: 100 aktiva zoomers, 500 uppdrag inom 90 dagar.',
    owner: 'Leon Russo',
    project: 'quiXzoom',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-9',
    month: 'Juni 2026',
    quarter: 'Q2',
    title: 'Landvex konceptvalidering & demo-film klar',
    description: 'Optical Insight-demo redo för kundpresentationer. ROI-kalkylator och kommunanpassad pitch klar.',
    owner: 'Leon Russo',
    project: 'Landvex',
    status: 'planerad',
  },

  // ─── Juli–Augusti 2026 ───────────────────────────────────────────────
  {
    id: 'act-10',
    month: 'Juli 2026',
    quarter: 'Q3',
    title: 'Landvex — pilot-förhandlingar inleds',
    description: 'Aktiva förhandlingar med minst 2 kommuner om betalda pilot-abonnemang. Mål: signerat pilotavtal Q3.',
    owner: 'Leon Russo',
    project: 'Landvex',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-11',
    month: 'Juli 2026',
    quarter: 'Q3',
    title: 'quiXzoom — 100 aktiva zoomers',
    description: 'Tillväxtmål: 100 verifierade och aktiva zoomers i Sverige. Mäts som zoomers som slutfört minst ett uppdrag.',
    owner: 'Leon Russo',
    project: 'quiXzoom',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-12',
    month: 'Augusti 2026',
    quarter: 'Q3',
    title: 'Trafikverket — pilot-dialog initieras',
    description: 'Initiala samtal med Trafikverket om Optical Insight-pilot. Fokus: vägunderhåll, infrastrukturövervakning.',
    owner: 'Leon Russo',
    project: 'Landvex',
    status: 'planerad',
  },
  {
    id: 'act-13',
    month: 'Augusti 2026',
    quarter: 'Q3',
    title: 'WHOOP-integration live för alla',
    description: 'WHOOP-data kopplat till Wavult OS för alla 5 teammedlemmar. Team-hälsa och recovery synkroniserat.',
    owner: 'Johan Berglund',
    project: 'Wavult OS',
    status: 'planerad',
  },

  // ─── September 2026 ──────────────────────────────────────────────────
  {
    id: 'act-14',
    month: 'September 2026',
    quarter: 'Q3',
    title: 'Quixom Ads beta-lansering',
    description: 'Beta-version av Quixom Ads-plattformen: hyperlokala annonser kopplade till quiXzoom-kartan. Første annonsörer onboardade.',
    owner: 'Johan Berglund',
    project: 'quiXzoom',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-15',
    month: 'September 2026',
    quarter: 'Q3',
    title: 'Landvex — första kommunavtal signerat',
    description: 'Mål: signerat betalt Optical Insight-abonnemang med minst en svensk kommun före Q3-slut.',
    owner: 'Leon Russo',
    project: 'Landvex',
    status: 'planerad',
    milstolpe: true,
  },

  // ─── Q4 2026 ──────────────────────────────────────────────────────────
  {
    id: 'act-16',
    month: 'Oktober 2026',
    quarter: 'Q4',
    title: 'Trafikverket — formell pilot-start',
    description: 'Betalande pilot med Trafikverket för Optical Insight. Definierat scope, KPIer och leveransplan.',
    owner: 'Leon Russo',
    project: 'Landvex',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-17',
    month: 'November 2026',
    quarter: 'Q4',
    title: 'quiXzoom Nederländerna — marknadsberedning',
    description: 'Marknadsanalys klar, lokalt nätverk etablerat, partner-avtal under förhandling. Mål: soft launch Q1 2027.',
    owner: 'Leon Russo',
    project: 'quiXzoom',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-18',
    month: 'December 2026',
    quarter: 'Q4',
    title: 'quiXzoom — 500 uppdrag genomförda',
    description: 'Kumulativt mål: 500 slutförda och godkända uppdrag på quiXzoom-plattformen sedan launch.',
    owner: 'Leon Russo',
    project: 'quiXzoom',
    status: 'planerad',
    milstolpe: true,
  },
  {
    id: 'act-19',
    month: 'December 2026',
    quarter: 'Q4',
    title: 'Årsavstämning & 2027-planering',
    description: 'Helårsgenomgång av KPIer, budget-utfall, bolagsstruktur. Sätt mål och budget för 2027 — inklusive quiXzoom NL-lansering.',
    owner: 'Erik Svensson',
    project: 'Övrigt',
    status: 'planerad',
  },
]
