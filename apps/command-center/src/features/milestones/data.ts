// milestones/data.ts — Wavult Group Milestones & Thailand Prep data

export type MilestoneStatus = 'done' | 'in-progress' | 'pending' | 'delayed'
export type ProjectKey = 'quixzoom' | 'landvex' | 'wavult' | 'bolagsstruktur' | 'thailand'

export interface Milestone {
  id: string
  project: ProjectKey
  title: string
  status: MilestoneStatus
  deadline: string // ISO date string
  owner: string
  category?: string
  description?: string
}

export interface ThailandCheckItem {
  id: string
  category: string
  title: string
  status: MilestoneStatus
  owner: string
  deadline: string
  notes?: string
}

export interface QuixzoomMilestone {
  id: string
  title: string
  status: MilestoneStatus
  startDate: string
  endDate: string
  owner: string
}

export interface Bolag {
  id: string
  name: string
  jurisdiction: string
  flag: string
  color: string
  currentStep: 'registrering' | 'bankkonto' | 'skatteregistrering' | 'operativt'
  estimatedDate: string
  owner: string
  blockers: string[]
  progress: number // 0-100
}

export interface RoadmapItem {
  id: string
  project: ProjectKey
  title: string
  quarter: 'Q2-2026' | 'Q3-2026' | 'Q4-2026'
  status: MilestoneStatus
  month?: string
  deadline?: string
  owner?: string
}

// ─── Thailand Prep ────────────────────────────────────────────────────────────
export const THAILAND_DATE = '2026-04-11'
export const SWEDEN_LAUNCH_DATE = '2026-06-15'

export const THAILAND_CHECKLIST: ThailandCheckItem[] = [
  {
    id: 'th-1',
    category: 'Bolagsstruktur',
    title: 'Wavult Group FZCO — Dubai registrering initierad',
    status: 'in-progress',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-10',
    notes: 'IFZA-licens vald, dokument under förberedelse',
  },
  {
    id: 'th-2',
    category: 'Bolagsstruktur',
    title: 'QuiXzoom Inc — Delaware incorporation',
    status: 'in-progress',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-05',
    notes: 'EIN ansökt, väntar på bekräftelse, registered agent klar',
  },
  {
    id: 'th-3',
    category: 'Bolagsstruktur',
    title: 'Landvex Inc — Houston/Texas LLC',
    status: 'pending',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-08',
    notes: 'Väntar på Delaware-klar för samordning av EIN',
  },
  {
    id: 'th-4',
    category: 'Bolagsstruktur',
    title: 'IP-struktur & licensavtal klara',
    status: 'pending',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-10',
    notes: 'IP assigneras till Wavult Group FZCO, licenseras ned per bolag',
  },
  {
    id: 'th-5',
    category: 'Teknik',
    title: 'Wavult OS redo för hela teamet',
    status: 'in-progress',
    owner: 'Johan Berglund',
    deadline: '2026-04-09',
    notes: 'Milestones, CRM, Finance och WHOOP ska vara live',
  },
  {
    id: 'th-6',
    category: 'Teknik',
    title: 'CRM live med prospects & pipeline',
    status: 'in-progress',
    owner: 'Johan Berglund',
    deadline: '2026-04-07',
  },
  {
    id: 'th-7',
    category: 'Teknik',
    title: 'Finance-modul live med budgetdata',
    status: 'in-progress',
    owner: 'Winston Bjarnemark',
    deadline: '2026-04-08',
    notes: 'Budget 2026, intercompany-flöden och cashflow',
  },
  {
    id: 'th-8',
    category: 'Produkt',
    title: 'quiXzoom-app klar för demo',
    status: 'pending',
    owner: 'Johan Berglund',
    deadline: '2026-04-09',
    notes: 'MVP med karta, uppdragsflöde och zoomer-onboarding',
  },
  {
    id: 'th-9',
    category: 'Organisation',
    title: 'Team-briefing genomförd',
    status: 'pending',
    owner: 'Erik Svensson',
    deadline: '2026-04-10',
    notes: 'Roller, ansvar, workcamp-agenda och Q2-Q4 plan',
  },
  {
    id: 'th-10',
    category: 'Logistik',
    title: 'Flights & boende klart — 5 pers',
    status: 'pending',
    owner: 'Leon Russo',
    deadline: '2026-04-01',
    notes: 'Tur/retur Bangkok, villa/co-living med arbetsyta ~1 mån',
  },
  {
    id: 'th-11',
    category: 'Juridik',
    title: 'Anställnings- & samarbetsavtal förberedda',
    status: 'pending',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-08',
    notes: 'Kontrakt per entitet, NDA, zoomer-villkor v1',
  },
  {
    id: 'th-12',
    category: 'Finans',
    title: 'Bankkonton öppnade — minst 2 entiteter',
    status: 'pending',
    owner: 'Winston Bjarnemark',
    deadline: '2026-04-10',
    notes: 'Mercury (QuiXzoom Inc) + Revolut Business (Landvex AB) prioritet',
  },
]

// ─── quiXzoom Launch ──────────────────────────────────────────────────────────
export const QUIXZOOM_MILESTONES: QuixzoomMilestone[] = [
  {
    id: 'qx-1',
    title: '20 zoomers rekryterade för beta',
    status: 'pending',
    startDate: '2026-04-12',
    endDate: '2026-05-10',
    owner: 'Leon Russo',
  },
  {
    id: 'qx-2',
    title: 'Landningssida & zoomer-onboarding live',
    status: 'pending',
    startDate: '2026-04-15',
    endDate: '2026-04-30',
    owner: 'Johan Berglund',
  },
  {
    id: 'qx-3',
    title: 'Betalningsflöde & zoomer-utbetalningar live',
    status: 'in-progress',
    startDate: '2026-04-20',
    endDate: '2026-05-20',
    owner: 'Winston Bjarnemark',
  },
  {
    id: 'qx-4',
    title: 'Beta-test med 20 zoomers — feedback & iteration',
    status: 'pending',
    startDate: '2026-05-11',
    endDate: '2026-05-31',
    owner: 'Leon Russo',
  },
  {
    id: 'qx-5',
    title: 'Första uppdraget publicerat & genomfört',
    status: 'pending',
    startDate: '2026-05-15',
    endDate: '2026-06-01',
    owner: 'Erik Svensson',
  },
  {
    id: 'qx-6',
    title: 'PR & media outreach — launch-kampanj',
    status: 'pending',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    owner: 'Leon Russo',
  },
  {
    id: 'qx-7',
    title: 'Public launch quiXzoom Sverige',
    status: 'pending',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    owner: 'Erik Svensson',
  },
]

// ─── Bolagsstruktur ──────────────────────────────────────────────────────────
// Korrekt Wavult Group-struktur:
// Wavult Group FZCO (Dubai, holding) → Wavult DevOps FZCO (Dubai)
//   → QuiXzoom Inc (Delaware) + QuiXzoom UAB (Litauen)
//   → Landvex AB (Sverige, aktiv) + Landvex Inc (Houston)

export const BOLAG_LIST: Bolag[] = [
  {
    id: 'wavult-group-fzco',
    name: 'Wavult Group FZCO',
    jurisdiction: 'UAE — Dubai (IFZA Freezone)',
    flag: '🇦🇪',
    color: '#2563EB',
    currentStep: 'registrering',
    estimatedDate: '2026-04-10',
    owner: 'Erik Svensson',
    blockers: ['IFZA-dokument under granskning', 'Kräver lokal agent'],
    progress: 25,
  },
  {
    id: 'wavult-devops-fzco',
    name: 'Wavult DevOps FZCO',
    jurisdiction: 'UAE — Dubai (IFZA Freezone)',
    flag: '🇦🇪',
    color: '#EC4899',
    currentStep: 'registrering',
    estimatedDate: '2026-04-10',
    owner: 'Johan Berglund',
    blockers: ['Väntar på Wavult Group FZCO-klar för samordning'],
    progress: 15,
  },
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    jurisdiction: 'Sverige — Stockholm',
    flag: '🇸🇪',
    color: '#10B981',
    currentStep: 'operativt',
    estimatedDate: '2025-01-01',
    owner: 'Erik Svensson',
    blockers: [],
    progress: 100,
  },
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    jurisdiction: 'USA — Delaware',
    flag: '🇺🇸',
    color: '#3B82F6',
    currentStep: 'skatteregistrering',
    estimatedDate: '2026-04-05',
    owner: 'Dennis Bjarnemark',
    blockers: ['EIN-bekräftelse inväntas', 'Bankkonto kräver EIN'],
    progress: 60,
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    jurisdiction: 'Litauen — Vilnius',
    flag: '🇱🇹',
    color: '#60A5FA',
    currentStep: 'registrering',
    estimatedDate: '2026-05-01',
    owner: 'Dennis Bjarnemark',
    blockers: ['Bokföringsfirma ej anlitad', 'GDPR-DPA behöver upprättas'],
    progress: 10,
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc',
    jurisdiction: 'USA — Houston, Texas',
    flag: '🇺🇸',
    color: '#34D399',
    currentStep: 'registrering',
    estimatedDate: '2026-04-08',
    owner: 'Dennis Bjarnemark',
    blockers: ['Väntar på Delaware-klar för samordning'],
    progress: 20,
  },
]

// ─── Roadmap ─────────────────────────────────────────────────────────────────
export const ROADMAP_ITEMS: RoadmapItem[] = [
  // Q2 2026
  { id: 'rm-1', project: 'quixzoom', title: 'Beta-test med 20 zoomers', quarter: 'Q2-2026', status: 'pending', month: 'Maj', owner: 'Leon Russo' },
  { id: 'rm-2', project: 'quixzoom', title: 'Public launch quiXzoom Sverige', quarter: 'Q2-2026', status: 'pending', month: 'Jun', owner: 'Erik Svensson' },
  { id: 'rm-3', project: 'wavult', title: 'Milestones-modul live', quarter: 'Q2-2026', status: 'done', month: 'Mar', owner: 'Johan Berglund' },
  { id: 'rm-4', project: 'wavult', title: 'Finance-modul live', quarter: 'Q2-2026', status: 'in-progress', month: 'Apr', owner: 'Johan Berglund' },
  { id: 'rm-5', project: 'bolagsstruktur', title: 'Alla 6 bolag registrerade', quarter: 'Q2-2026', status: 'in-progress', month: 'Apr', owner: 'Dennis Bjarnemark' },
  { id: 'rm-6', project: 'landvex', title: 'Optical Insight — demo & konceptvalidering', quarter: 'Q2-2026', status: 'pending', month: 'Jun', owner: 'Leon Russo' },
  { id: 'rm-7', project: 'thailand', title: 'Thailand Workcamp — alla system live', quarter: 'Q2-2026', status: 'pending', month: 'Apr', owner: 'Erik Svensson' },

  // Q3 2026
  { id: 'rm-8', project: 'quixzoom', title: '100 aktiva zoomers', quarter: 'Q3-2026', status: 'pending', month: 'Jul', owner: 'Leon Russo' },
  { id: 'rm-9', project: 'quixzoom', title: '500 uppdrag genomförda', quarter: 'Q3-2026', status: 'pending', month: 'Sep', owner: 'Leon Russo' },
  { id: 'rm-10', project: 'quixzoom', title: 'Quixom Ads beta', quarter: 'Q3-2026', status: 'pending', month: 'Sep', owner: 'Johan Berglund' },
  { id: 'rm-11', project: 'landvex', title: 'Pilot-förhandlingar inleds', quarter: 'Q3-2026', status: 'pending', month: 'Jul', owner: 'Leon Russo' },
  { id: 'rm-12', project: 'landvex', title: 'Första kommunavtal signerat', quarter: 'Q3-2026', status: 'pending', month: 'Sep', owner: 'Leon Russo' },
  { id: 'rm-13', project: 'wavult', title: 'WHOOP kopplat — hela teamet', quarter: 'Q3-2026', status: 'pending', month: 'Aug', owner: 'Johan Berglund' },

  // Q4 2026
  { id: 'rm-14', project: 'landvex', title: 'Trafikverket — pilot-start', quarter: 'Q4-2026', status: 'pending', month: 'Okt', owner: 'Leon Russo' },
  { id: 'rm-15', project: 'quixzoom', title: 'Nederländerna — marknadsberedning', quarter: 'Q4-2026', status: 'pending', month: 'Nov', owner: 'Leon Russo' },
  { id: 'rm-16', project: 'quixzoom', title: 'Serie A-förberedelser', quarter: 'Q4-2026', status: 'pending', month: 'Dec', owner: 'Erik Svensson' },
  { id: 'rm-17', project: 'wavult', title: 'Wavult OS — extern kund onboardad', quarter: 'Q4-2026', status: 'pending', month: 'Dec', owner: 'Johan Berglund' },
]

// ─── Helper functions ─────────────────────────────────────────────────────────
export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: MilestoneStatus): string {
  switch (status) {
    case 'done': return '#10B981'
    case 'in-progress': return '#3B82F6'
    case 'pending': return '#6B7280'
    case 'delayed': return '#EF4444'
  }
}

export function getStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case 'done': return 'Klar'
    case 'in-progress': return 'Pågår'
    case 'pending': return 'Ej påbörjad'
    case 'delayed': return 'Försenad'
  }
}

export const PROJECT_META: Record<ProjectKey, { label: string; color: string; icon: string }> = {
  quixzoom: { label: 'quiXzoom', color: '#3B82F6', icon: '📷' },
  landvex: { label: 'Landvex', color: '#10B981', icon: '🌍' },
  wavult: { label: 'Wavult OS', color: '#60A5FA', icon: '⚙️' },
  bolagsstruktur: { label: 'Bolagsstruktur', color: '#F59E0B', icon: '🏛️' },
  thailand: { label: 'Thailand Workcamp', color: '#EF4444', icon: '🇹🇭' },
}
