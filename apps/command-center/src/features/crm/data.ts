// ─── CRM Data Types ────────────────────────────────────────────────────────────

export type CRMProduct = 'quiXzoom' | 'Landvex' | 'Hypbit'
export type CRMStage =
  | 'Lead'
  | 'Kvalificerad'
  | 'Demo/Möte'
  | 'Offert'
  | 'Förhandling'
  | 'Vunnen'
  | 'Förlorad'

export type DealStatus = 'Utkast' | 'Skickad' | 'Under förhandling' | 'Signerad' | 'Avbruten'
export type ActivityType = 'Samtal' | 'Email' | 'Möte' | 'Demo' | 'Offert skickad' | 'Follow-up'
export type TeamMember = 'Leon' | 'Dennis' | 'Erik'

export interface Contact {
  id: string
  name: string
  company: string
  role: string
  email: string
  phone: string
  prospectId?: string
}

export interface Prospect {
  id: string
  company: string
  contactName: string
  contactId: string
  product: CRMProduct
  stage: CRMStage
  valueSEK: number
  lastActivity: string // ISO date
  assignee: TeamMember
  daysInStage: number
  nextStep: string
  notes?: string
}

export interface Deal {
  id: string
  prospectId: string
  company: string
  product: CRMProduct
  status: DealStatus
  valueSEK: number
  startDate: string
  durationMonths: number
  legalDocId?: string
  assignee: TeamMember
}

export interface Activity {
  id: string
  type: ActivityType
  prospectId: string
  company: string
  by: TeamMember
  date: string // ISO
  note: string
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Maria Lindqvist',
    company: 'Tyresö Kommun',
    role: 'IT-chef',
    email: 'maria.lindqvist@tyreso.se',
    phone: '08-5782 2000',
    prospectId: 'p1',
  },
  {
    id: 'c2',
    name: 'Anders Holm',
    company: 'Nacka Kommun',
    role: 'Digitaliseringsstrateg',
    email: 'anders.holm@nacka.se',
    phone: '08-718 80 00',
    prospectId: 'p2',
  },
  {
    id: 'c3',
    name: 'Sofia Bergström',
    company: 'Värmdö Kommun',
    role: 'Teknisk förvaltare',
    email: 'sofia.bergstrom@varmdo.se',
    phone: '08-570 470 00',
    prospectId: 'p3',
  },
  {
    id: 'c4',
    name: 'Mikael Lundgren',
    company: 'Lidingö Stad',
    role: 'Samhällsplanerare',
    email: 'mikael.lundgren@lidingo.se',
    phone: '08-731 30 00',
    prospectId: 'p4',
  },
  {
    id: 'c5',
    name: 'Petra Carlsson',
    company: 'Bravida',
    role: 'Affärsutvecklare',
    email: 'petra.carlsson@bravida.se',
    phone: '08-695 20 00',
    prospectId: 'p5',
  },
  {
    id: 'c6',
    name: 'Jonas Eriksson',
    company: 'Akademiska Hus',
    role: 'Fastighetschef',
    email: 'jonas.eriksson@akademiskahus.se',
    phone: '031-63 55 00',
    prospectId: 'p6',
  },
  {
    id: 'c7',
    name: 'Helena Svensson',
    company: 'Castellum',
    role: 'Head of Operations',
    email: 'helena.svensson@castellum.se',
    phone: '031-60 74 00',
    prospectId: 'p7',
  },
  {
    id: 'c8',
    name: 'Robert Johansson',
    company: 'Stockholms Hamnar',
    role: 'Hamnchef Säkerhet',
    email: 'robert.johansson@stockholmshamnar.se',
    phone: '08-670 26 00',
    prospectId: 'p8',
  },
  {
    id: 'c9',
    name: 'Anna Persson',
    company: 'Trafikverket',
    role: 'Projektledare Infrastruktur',
    email: 'anna.persson@trafikverket.se',
    phone: '0771-921 921',
    prospectId: 'p9',
  },
  {
    id: 'c10',
    name: 'Karl Magnusson',
    company: 'Haninge Kommun',
    role: 'Mark & Exploatering',
    email: 'karl.magnusson@haninge.se',
    phone: '08-606 70 00',
    prospectId: 'p10',
  },
]

// ─── Prospects ────────────────────────────────────────────────────────────────

export const PROSPECTS: Prospect[] = [
  {
    id: 'p1',
    company: 'Tyresö Kommun',
    contactName: 'Maria Lindqvist',
    contactId: 'c1',
    product: 'quiXzoom',
    stage: 'Demo/Möte',
    valueSEK: 180000,
    lastActivity: '2026-03-20',
    assignee: 'Leon',
    daysInStage: 5,
    nextStep: 'Skicka offert efter demo',
    notes: 'Intresserade av kameraövervakning av grönområden och vägar.',
  },
  {
    id: 'p2',
    company: 'Nacka Kommun',
    contactName: 'Anders Holm',
    contactId: 'c2',
    product: 'quiXzoom',
    stage: 'Offert',
    valueSEK: 240000,
    lastActivity: '2026-03-22',
    assignee: 'Leon',
    daysInStage: 3,
    nextStep: 'Invänta svar på offert, follow-up 28 mars',
    notes: 'Störst intresse för events och mötesplatser.',
  },
  {
    id: 'p3',
    company: 'Värmdö Kommun',
    contactName: 'Sofia Bergström',
    contactId: 'c3',
    product: 'quiXzoom',
    stage: 'Kvalificerad',
    valueSEK: 120000,
    lastActivity: '2026-03-18',
    assignee: 'Leon',
    daysInStage: 8,
    nextStep: 'Boka demo',
    notes: 'Budget begränsad, kan bli pilotprojekt.',
  },
  {
    id: 'p4',
    company: 'Lidingö Stad',
    contactName: 'Mikael Lundgren',
    contactId: 'c4',
    product: 'Landvex',
    stage: 'Förhandling',
    valueSEK: 320000,
    lastActivity: '2026-03-24',
    assignee: 'Erik',
    daysInStage: 2,
    nextStep: 'Justera prismodell, möte 27 mars',
    notes: 'Vill ha rabatt vid 2-årsavtal.',
  },
  {
    id: 'p5',
    company: 'Bravida',
    contactName: 'Petra Carlsson',
    contactId: 'c5',
    product: 'quiXzoom',
    stage: 'Lead',
    valueSEK: 150000,
    lastActivity: '2026-03-15',
    assignee: 'Leon',
    daysInStage: 11,
    nextStep: 'Kvalificeringssamtal',
    notes: 'Inkommit via LinkedIn.',
  },
  {
    id: 'p6',
    company: 'Akademiska Hus',
    contactName: 'Jonas Eriksson',
    contactId: 'c6',
    product: 'Landvex',
    stage: 'Demo/Möte',
    valueSEK: 480000,
    lastActivity: '2026-03-21',
    assignee: 'Erik',
    daysInStage: 4,
    nextStep: 'Teknisk deep-dive med deras IT-avdelning',
    notes: 'Stor portfölj, potentiellt ramavtal.',
  },
  {
    id: 'p7',
    company: 'Castellum',
    contactName: 'Helena Svensson',
    contactId: 'c7',
    product: 'Landvex',
    stage: 'Vunnen',
    valueSEK: 420000,
    lastActivity: '2026-03-10',
    assignee: 'Leon',
    daysInStage: 0,
    nextStep: 'Onboarding startar april',
    notes: 'Kontrakt signerat. Pilot Q2 2026.',
  },
  {
    id: 'p8',
    company: 'Stockholms Hamnar',
    contactName: 'Robert Johansson',
    contactId: 'c8',
    product: 'quiXzoom',
    stage: 'Offert',
    valueSEK: 360000,
    lastActivity: '2026-03-19',
    assignee: 'Dennis',
    daysInStage: 7,
    nextStep: 'Juridisk granskning av avtal',
    notes: 'Kritisk infrastruktur, kräver NDA och säkerhetsgodkännande.',
  },
  {
    id: 'p9',
    company: 'Trafikverket',
    contactName: 'Anna Persson',
    contactId: 'c9',
    product: 'quiXzoom',
    stage: 'Kvalificerad',
    valueSEK: 500000,
    lastActivity: '2026-03-17',
    assignee: 'Erik',
    daysInStage: 9,
    nextStep: 'Upphandlingskrav — begär RFI',
    notes: 'Offentlig upphandling kan krävas för kontrakt >500k.',
  },
  {
    id: 'p10',
    company: 'Haninge Kommun',
    contactName: 'Karl Magnusson',
    contactId: 'c10',
    product: 'Landvex',
    stage: 'Lead',
    valueSEK: 95000,
    lastActivity: '2026-03-12',
    assignee: 'Leon',
    daysInStage: 14,
    nextStep: 'Skicka intro-material',
    notes: 'Referens från Tyresö.',
  },
]

// ─── Deals ────────────────────────────────────────────────────────────────────

export const DEALS: Deal[] = [
  {
    id: 'd1',
    prospectId: 'p7',
    company: 'Castellum',
    product: 'Landvex',
    status: 'Signerad',
    valueSEK: 420000,
    startDate: '2026-04-01',
    durationMonths: 24,
    assignee: 'Leon',
  },
  {
    id: 'd2',
    prospectId: 'p4',
    company: 'Lidingö Stad',
    product: 'Landvex',
    status: 'Under förhandling',
    valueSEK: 320000,
    startDate: '2026-05-01',
    durationMonths: 12,
    assignee: 'Erik',
  },
  {
    id: 'd3',
    prospectId: 'p8',
    company: 'Stockholms Hamnar',
    product: 'quiXzoom',
    status: 'Skickad',
    valueSEK: 360000,
    startDate: '2026-06-01',
    durationMonths: 12,
    assignee: 'Dennis',
  },
  {
    id: 'd4',
    prospectId: 'p2',
    company: 'Nacka Kommun',
    product: 'quiXzoom',
    status: 'Utkast',
    valueSEK: 240000,
    startDate: '2026-05-15',
    durationMonths: 12,
    assignee: 'Leon',
  },
]

// ─── Activities ───────────────────────────────────────────────────────────────

export const ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    type: 'Demo',
    prospectId: 'p1',
    company: 'Tyresö Kommun',
    by: 'Leon',
    date: '2026-03-20T10:00:00',
    note: 'Demo av quiXzoom kartvy. Mycket positivt mottagande. Vill se pris.',
  },
  {
    id: 'a2',
    type: 'Offert skickad',
    prospectId: 'p2',
    company: 'Nacka Kommun',
    by: 'Leon',
    date: '2026-03-22T14:30:00',
    note: 'Offert på 240 000 kr/år skickad. 14 dagars svarstid.',
  },
  {
    id: 'a3',
    type: 'Möte',
    prospectId: 'p4',
    company: 'Lidingö Stad',
    by: 'Erik',
    date: '2026-03-24T09:00:00',
    note: 'Förhandlingsmöte. De vill ha 15% rabatt vid 2-årskontrakt.',
  },
  {
    id: 'a4',
    type: 'Samtal',
    prospectId: 'p6',
    company: 'Akademiska Hus',
    by: 'Erik',
    date: '2026-03-21T11:00:00',
    note: 'Inledande samtal om Landvex. Stor portfölj, kan bli strategisk partner.',
  },
  {
    id: 'a5',
    type: 'Email',
    prospectId: 'p5',
    company: 'Bravida',
    by: 'Leon',
    date: '2026-03-15T08:45:00',
    note: 'Intro-mail skickat. Presenterar quiXzoom kort.',
  },
  {
    id: 'a6',
    type: 'Follow-up',
    prospectId: 'p3',
    company: 'Värmdö Kommun',
    by: 'Leon',
    date: '2026-03-18T13:00:00',
    note: 'Follow-up efter kvalificeringssamtal. Bokat demo nästa vecka.',
  },
  {
    id: 'a7',
    type: 'Möte',
    prospectId: 'p7',
    company: 'Castellum',
    by: 'Leon',
    date: '2026-03-10T10:00:00',
    note: 'Signeringsmöte. Kontrakt signerat! 420 000 kr, 2 år.',
  },
  {
    id: 'a8',
    type: 'Email',
    prospectId: 'p8',
    company: 'Stockholms Hamnar',
    by: 'Dennis',
    date: '2026-03-19T16:00:00',
    note: 'Offert skickad, bifogad NDA för granskning.',
  },
  {
    id: 'a9',
    type: 'Samtal',
    prospectId: 'p9',
    company: 'Trafikverket',
    by: 'Erik',
    date: '2026-03-17T14:00:00',
    note: 'Inledande samtal. Upphandling trolig. Begär RFI-underlag.',
  },
  {
    id: 'a10',
    type: 'Email',
    prospectId: 'p10',
    company: 'Haninge Kommun',
    by: 'Leon',
    date: '2026-03-12T09:30:00',
    note: 'Intro-mail baserat på referens från Tyresö.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const STAGE_ORDER: CRMStage[] = [
  'Lead',
  'Kvalificerad',
  'Demo/Möte',
  'Offert',
  'Förhandling',
  'Vunnen',
  'Förlorad',
]

export const STAGE_COLORS: Record<CRMStage, string> = {
  Lead: '#6B7280',
  Kvalificerad: '#3B82F6',
  'Demo/Möte': '#8B5CF6',
  Offert: '#F59E0B',
  Förhandling: '#EF4444',
  Vunnen: '#10B981',
  Förlorad: '#374151',
}

export const PRODUCT_COLORS: Record<CRMProduct, string> = {
  quiXzoom: '#3B82F6',
  Landvex: '#10B981',
  Hypbit: '#8B5CF6',
}

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  Utkast: '#6B7280',
  Skickad: '#3B82F6',
  'Under förhandling': '#F59E0B',
  Signerad: '#10B981',
  Avbruten: '#EF4444',
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  Samtal: '📞',
  Email: '📧',
  Möte: '🤝',
  Demo: '🖥️',
  'Offert skickad': '📄',
  'Follow-up': '🔔',
}

export const TEAM_COLORS: Record<TeamMember, string> = {
  Leon: '#10B981',
  Dennis: '#F59E0B',
  Erik: '#8B5CF6',
}

export function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value)
}

export function daysSince(isoDate: string): number {
  const d = new Date(isoDate)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}
