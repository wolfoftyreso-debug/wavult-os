// milestones/data.ts — Wavult Group Milestones & Thailand Prep data

export type MilestoneStatus = 'done' | 'in-progress' | 'pending' | 'delayed'
export type ProjectKey = 'quixzoom' | 'landvex' | 'hypbit' | 'bolagsstruktur' | 'thailand'

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
    title: 'Delaware LLC — registrering klar',
    status: 'in-progress',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-05',
    notes: 'EIN ansökt, väntar på bekräftelse',
  },
  {
    id: 'th-2',
    category: 'Bolagsstruktur',
    title: 'Texas LLC — registrering',
    status: 'pending',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-08',
  },
  {
    id: 'th-3',
    category: 'Bolagsstruktur',
    title: 'Dubai holding — registrering',
    status: 'pending',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-10',
  },
  {
    id: 'th-4',
    category: 'Teknik',
    title: 'Hypbit OS redo för teamet',
    status: 'in-progress',
    owner: 'Johan Putte Berglund',
    deadline: '2026-04-09',
    notes: 'Milestones-modul, CRM och Finance ska vara live',
  },
  {
    id: 'th-5',
    category: 'Teknik',
    title: 'CRM live med prospects',
    status: 'in-progress',
    owner: 'Johan Putte Berglund',
    deadline: '2026-04-07',
  },
  {
    id: 'th-6',
    category: 'Teknik',
    title: 'Finance-modul live',
    status: 'in-progress',
    owner: 'Winston Bjarnemark',
    deadline: '2026-04-08',
  },
  {
    id: 'th-7',
    category: 'Produkt',
    title: 'quiXzoom-app klar för demo',
    status: 'pending',
    owner: 'Johan Putte Berglund',
    deadline: '2026-04-09',
    notes: 'MVP med karta och uppdragsvyn',
  },
  {
    id: 'th-8',
    category: 'Organisation',
    title: 'Team-briefing genomförd',
    status: 'pending',
    owner: 'Erik Svensson',
    deadline: '2026-04-10',
    notes: 'Roller, ansvar och workcamp-agenda',
  },
  {
    id: 'th-9',
    category: 'Logistik',
    title: 'Flights & boende klart',
    status: 'pending',
    owner: 'Leon Russo De Cerame',
    deadline: '2026-04-01',
  },
  {
    id: 'th-10',
    category: 'Juridik',
    title: 'Kontrakt/avtal förberedda',
    status: 'pending',
    owner: 'Dennis Bjarnemark',
    deadline: '2026-04-08',
    notes: 'Anställningsavtal, NDA, partneravtal',
  },
]

// ─── quiXzoom Launch ──────────────────────────────────────────────────────────
export const QUIXZOOM_MILESTONES: QuixzoomMilestone[] = [
  {
    id: 'qx-1',
    title: '20 zoomers rekryterade',
    status: 'pending',
    startDate: '2026-04-12',
    endDate: '2026-05-15',
    owner: 'Leon Russo De Cerame',
  },
  {
    id: 'qx-2',
    title: 'Landningssida live',
    status: 'pending',
    startDate: '2026-04-15',
    endDate: '2026-04-30',
    owner: 'Johan Putte Berglund',
  },
  {
    id: 'qx-3',
    title: 'Betalningsflöde live',
    status: 'in-progress',
    startDate: '2026-04-20',
    endDate: '2026-05-20',
    owner: 'Winston Bjarnemark',
  },
  {
    id: 'qx-4',
    title: '5 kommuner kontaktade',
    status: 'pending',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    owner: 'Leon Russo De Cerame',
  },
  {
    id: 'qx-5',
    title: 'Första uppdraget publicerat',
    status: 'pending',
    startDate: '2026-05-15',
    endDate: '2026-06-01',
    owner: 'Erik Svensson',
  },
  {
    id: 'qx-6',
    title: 'Press/media outreach',
    status: 'pending',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    owner: 'Leon Russo De Cerame',
  },
]

// ─── Bolagsstruktur ──────────────────────────────────────────────────────────
export const BOLAG_LIST: Bolag[] = [
  {
    id: 'wavult-se',
    name: 'Wavult Group AB',
    jurisdiction: 'Sverige',
    flag: '🇸🇪',
    color: '#3B82F6',
    currentStep: 'operativt',
    estimatedDate: '2026-01-01',
    owner: 'Erik Svensson',
    blockers: [],
    progress: 100,
  },
  {
    id: 'delaware-llc',
    name: 'Wavult Inc. (Delaware)',
    jurisdiction: 'USA — Delaware',
    flag: '🇺🇸',
    color: '#10B981',
    currentStep: 'skatteregistrering',
    estimatedDate: '2026-04-05',
    owner: 'Dennis Bjarnemark',
    blockers: ['EIN-bekräftelse inväntas', 'Bankkonto kräver EIN'],
    progress: 60,
  },
  {
    id: 'texas-llc',
    name: 'Wavult Operations LLC (Texas)',
    jurisdiction: 'USA — Texas',
    flag: '🇺🇸',
    color: '#F59E0B',
    currentStep: 'registrering',
    estimatedDate: '2026-04-08',
    owner: 'Dennis Bjarnemark',
    blockers: ['Väntar på Delaware-klar för samordning'],
    progress: 20,
  },
  {
    id: 'dubai-holding',
    name: 'Wavult Holdings FZE (Dubai)',
    jurisdiction: 'UAE — Freezone',
    flag: '🇦🇪',
    color: '#A78BFA',
    currentStep: 'registrering',
    estimatedDate: '2026-04-10',
    owner: 'Dennis Bjarnemark',
    blockers: ['Freezone-val ej fastställt', 'Kräver lokal agent'],
    progress: 15,
  },
  {
    id: 'lithuania-uab',
    name: 'Wavult EU UAB (Litauen)',
    jurisdiction: 'Litauen',
    flag: '🇱🇹',
    color: '#EC4899',
    currentStep: 'registrering',
    estimatedDate: '2026-05-01',
    owner: 'Dennis Bjarnemark',
    blockers: ['Bokföringsfirma ej anlitad'],
    progress: 10,
  },
]

// ─── Roadmap ─────────────────────────────────────────────────────────────────
export const ROADMAP_ITEMS: RoadmapItem[] = [
  // Q2 2026
  { id: 'rm-1', project: 'quixzoom', title: 'Beta-lansering Sverige', quarter: 'Q2-2026', status: 'in-progress', month: 'Jun' },
  { id: 'rm-2', project: 'quixzoom', title: '20 aktiva zoomers', quarter: 'Q2-2026', status: 'pending', month: 'Maj' },
  { id: 'rm-3', project: 'hypbit', title: 'Milestones-modul live', quarter: 'Q2-2026', status: 'done', month: 'Mar' },
  { id: 'rm-4', project: 'hypbit', title: 'Finance-modul live', quarter: 'Q2-2026', status: 'in-progress', month: 'Apr' },
  { id: 'rm-5', project: 'bolagsstruktur', title: 'Alla 5 bolag registrerade', quarter: 'Q2-2026', status: 'in-progress', month: 'Apr' },
  { id: 'rm-6', project: 'landvex', title: 'Konceptvalidering klar', quarter: 'Q2-2026', status: 'pending', month: 'Jun' },

  // Q3 2026
  { id: 'rm-7', project: 'quixzoom', title: '100 aktiva zoomers', quarter: 'Q3-2026', status: 'pending', month: 'Sep' },
  { id: 'rm-8', project: 'quixzoom', title: 'Första betalande uppdragsgivare', quarter: 'Q3-2026', status: 'pending', month: 'Jul' },
  { id: 'rm-9', project: 'hypbit', title: 'Extern kund onboardad', quarter: 'Q3-2026', status: 'pending', month: 'Aug' },
  { id: 'rm-10', project: 'landvex', title: 'MVP byggd', quarter: 'Q3-2026', status: 'pending', month: 'Sep' },
  { id: 'rm-11', project: 'quixzoom', title: 'AI-analys integrerad', quarter: 'Q3-2026', status: 'pending', month: 'Aug' },

  // Q4 2026
  { id: 'rm-12', project: 'quixzoom', title: 'Internationell expansion — pilot', quarter: 'Q4-2026', status: 'pending', month: 'Nov' },
  { id: 'rm-13', project: 'landvex', title: 'Betalande kund #1', quarter: 'Q4-2026', status: 'pending', month: 'Oct' },
  { id: 'rm-14', project: 'hypbit', title: '3 externa kunder', quarter: 'Q4-2026', status: 'pending', month: 'Dec' },
  { id: 'rm-15', project: 'quixzoom', title: 'Serie A-förberedelser', quarter: 'Q4-2026', status: 'pending', month: 'Dec' },
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
  hypbit: { label: 'Hypbit OS', color: '#A78BFA', icon: '⚙️' },
  bolagsstruktur: { label: 'Bolagsstruktur', color: '#F59E0B', icon: '🏛️' },
  thailand: { label: 'Thailand Prep', color: '#EF4444', icon: '🇹🇭' },
}
