// ─── CRM Data Types ────────────────────────────────────────────────────────────

export type CRMProduct = 'quiXzoom' | 'Landvex' | 'Wavult OS'
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
// Tom tills riktiga kunder läggs till. Inga prospects — lägg till din första kund.

export const CONTACTS: Contact[] = []

// ─── Prospects ────────────────────────────────────────────────────────────────
// Tom tills riktiga prospects registreras. Inga prospects — lägg till din första kund.

export const PROSPECTS: Prospect[] = []

// ─── Deals ────────────────────────────────────────────────────────────────────
// Inga aktiva deals ännu.

export const DEALS: Deal[] = []

// ─── Activities ───────────────────────────────────────────────────────────────
// Ingen aktivitetshistorik ännu.

export const ACTIVITIES: Activity[] = []

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
  'Demo/Möte': '#2563EB',
  Offert: '#F59E0B',
  Förhandling: '#EF4444',
  Vunnen: '#10B981',
  Förlorad: '#374151',
}

export const PRODUCT_COLORS: Record<CRMProduct, string> = {
  quiXzoom: '#3B82F6',
  Landvex: '#10B981',
  'Wavult OS': '#2563EB',
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
  Erik: '#2563EB',
}

export function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value)
}

export function daysSince(isoDate: string): number {
  const d = new Date(isoDate)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}
