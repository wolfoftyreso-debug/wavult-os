// ─── Wavult OS — Insurance Hub Data & Audit Logic ────────────────────────────

export type InsuranceStatus = 'active' | 'expiring_soon' | 'expired' | 'missing' | 'review_needed'
export type InsurancePriority = 'critical' | 'important' | 'optional'
export type InsuranceCategory = 'liability' | 'cyber' | 'personnel' | 'do' | 'property' | 'travel' | 'ip'

export interface InsurancePolicy {
  id: string
  name: string
  category: InsuranceCategory
  priority: InsurancePriority
  status: InsuranceStatus
  provider?: string
  coverage?: string
  premium?: string
  renewalDate?: string
  entities: string[]
  description: string
  why: string
  recommendation?: string
  lastReviewed?: string
  notes?: string
}

export interface WeeklyAuditResult {
  auditDate: string
  weekNumber: number
  overallScore: number
  criticalGaps: string[]
  recommendations: AuditRecommendation[]
  nextReviewDate: string
}

export interface AuditRecommendation {
  policyId: string
  priority: InsurancePriority
  action: 'obtain' | 'renew' | 'review' | 'increase_coverage'
  title: string
  detail: string
  deadline?: string
}

// ─── Entity definitions ───────────────────────────────────────────────────────

export const INSURANCE_ENTITIES = [
  { id: 'wavult-group',      name: 'Wavult Group',      shortName: 'WG' },
  { id: 'wavult-operations', name: 'Wavult Operations', shortName: 'WO' },
  { id: 'landvex-ab',        name: 'LandveX AB',        shortName: 'LX' },
]

// ─── Policies ─────────────────────────────────────────────────────────────────

export const POLICIES: InsurancePolicy[] = [
  {
    id: 'professional-liability',
    name: 'Ansvarsförsäkring — Professional Liability / E&O',
    category: 'liability',
    priority: 'critical',
    status: 'missing',
    entities: ['wavult-group', 'landvex-ab', 'wavult-operations'],
    coverage: 'Rekommenderat: 10–50 MSEK',
    description: 'Skyddar om optisk analys eller data leder till felaktiga beslut hos kund. Täcker skadeståndskrav vid fel i levererad tjänst.',
    why: 'LandveX säljer enterprise-beslutsstöd till Trafikverket och kommuner. En felaktig incident-alert kan leda till miljonkrav.',
    recommendation: 'Teckna omedelbart — krävs innan första LandveX-kundavtal signeras.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'cyber',
    name: 'Cyber & Data Breach',
    category: 'cyber',
    priority: 'critical',
    status: 'missing',
    entities: ['wavult-group', 'wavult-operations'],
    coverage: 'Rekommenderat: 5–20 MSEK',
    description: 'Täcker dataintrång, ransomware, GDPR-böter (delvis), forensik och krishantering.',
    why: 'Ni hanterar bilddata, biometrik (WHOOP) och infrastrukturdata. GDPR-böter kan uppgå till 4% av global omsättning.',
    recommendation: 'Prioritet 1 — teckna inom 30 dagar. Leverantörer: Hiscox, AXA XL, Tryg.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'employer-liability',
    name: 'Arbetsgivaransvar',
    category: 'personnel',
    priority: 'critical',
    status: 'missing',
    entities: ['wavult-group', 'wavult-operations'],
    coverage: 'Rekommenderat: per jurisdiktion',
    description: 'Täcker anspråk från anställda — diskriminering, felaktig uppsägning, arbetsplatsolyckor.',
    why: 'Ni anställer i minst tre jurisdiktioner (SE, UAE, USA) med olika arbetsrättsliga regler.',
    recommendation: 'Krävs i varje land ni har anställda. Kontakta lokaladvokat per jurisdiktion.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'do',
    name: 'D&O — Directors & Officers',
    category: 'do',
    priority: 'important',
    status: 'missing',
    entities: ['wavult-group'],
    coverage: 'Rekommenderat: 5–10 MSEK',
    description: 'Personligt skydd för styrelsemedlemmar (Erik, Dennis) vid krav från aktieägare, borgenärer eller myndigheter.',
    why: 'Med Dubai holding-struktur och planerad extern kapitalresa ökar exponeringen avsevärt.',
    recommendation: 'Teckna innan extern kapitalresa eller investeraravtal.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'zoomer-liability',
    name: 'Produktansvar — Zoomer-uppdrag',
    category: 'liability',
    priority: 'important',
    status: 'missing',
    entities: ['wavult-operations'],
    coverage: 'Rekommenderat: 5 MSEK',
    description: 'Täcker om zoomer skadar sig under uppdrag, eller skadar tredje part vid bildtagning.',
    why: 'quiXzoom instruerar zoomers att utföra uppdrag i specifika miljöer. Gränsen mot anställd/konsult är juridiskt oklar i många länder.',
    recommendation: 'Granska zoomer-avtal med Dennis. Klargör ansvarsfördelning innan launch.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'ip-legal',
    name: 'IP-skydd / Rättegångskostnadsförsäkring',
    category: 'ip',
    priority: 'important',
    status: 'missing',
    entities: ['wavult-group'],
    coverage: 'Rekommenderat: 2–5 MSEK',
    description: 'Täcker kostnader för att försvara er IP eller driva intrångsmål.',
    why: 'Optical Insight-tekniken är ett differentierat system — ni vill kunna försvara den mot konkurrenter.',
    recommendation: 'Relevant från fas 2 (Quixom Ads) när ni har kommersiell data att skydda.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'travel-group',
    name: 'Reseförsäkring — Teamet',
    category: 'travel',
    priority: 'important',
    status: 'missing',
    entities: ['wavult-operations'],
    coverage: 'Gruppreseförsäkring',
    description: 'Täcker olycka, sjukdom, avbokning och evakuering för hela teamet vid tjänsteresor.',
    why: 'Thailand workcamp 11 april — hela teamet reser. Utan försäkring är ni exponerade.',
    recommendation: 'BRÄDSKANDE: Teckna gruppförsäkring för Thailand-resan omedelbart. Leverantör: Europeiska/Gouda.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'property',
    name: 'Egendomsförsäkring — Kontor & Utrustning',
    category: 'property',
    priority: 'optional',
    status: 'missing',
    entities: ['wavult-operations'],
    coverage: 'Rekommenderat: ersättningsvärde inventarier',
    description: 'Täcker skador på kontorsmiljö, IT-utrustning, kameror och hårdvara.',
    why: 'Zoomer-kameror och kontorsutrustning är operationellt kritisk infrastruktur.',
    recommendation: 'Teckna i samband med kontor/team-etablering. Lägre prioritet tills fysisk närvaro etableras.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
  {
    id: 'key-person',
    name: 'Nyckelmannaförsäkring',
    category: 'personnel',
    priority: 'important',
    status: 'missing',
    entities: ['wavult-group'],
    coverage: 'Rekommenderat: 3–5x årslön per nyckelmedlem',
    description: 'Skyddar bolaget vid sjukdom/frånfälle av nyckelpersoner (Erik, Johan, Dennis).',
    why: 'Startupfas med hög personberoende. En nyckelmedlems bortfall kan hota verksamhetens kontinuitet.',
    recommendation: 'Teckna inför extern kapitalresa — investerare kräver ofta nyckelmannaförsäkring.',
    lastReviewed: new Date().toISOString().split('T')[0],
  },
]

// ─── Week number utility ──────────────────────────────────────────────────────

function getISOWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function getNextMonday(from: Date): string {
  const d = new Date(from)
  const day = d.getDay()
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7
  d.setDate(d.getDate() + daysUntilMonday)
  return d.toISOString().split('T')[0]
}

// ─── Weekly Audit ─────────────────────────────────────────────────────────────

export function runWeeklyAudit(): WeeklyAuditResult {
  const now = new Date()
  const auditDate = now.toISOString().split('T')[0]
  const weekNumber = getISOWeekNumber(now)

  const criticalMissing = POLICIES.filter(
    p => p.priority === 'critical' && (p.status === 'missing' || p.status === 'expired')
  )
  const importantMissing = POLICIES.filter(
    p => p.priority === 'important' && (p.status === 'missing' || p.status === 'expired')
  )
  const expiringSoon = POLICIES.filter(p => p.status === 'expiring_soon')
  const reviewNeeded = POLICIES.filter(p => p.status === 'review_needed')

  const criticalGaps = criticalMissing.map(p => p.id)

  // Score calculation
  const rawScore = 100
    - criticalMissing.length * 15
    - importantMissing.length * 8
    - expiringSoon.length * 5
    - reviewNeeded.length * 3
  const overallScore = Math.max(0, Math.min(100, rawScore))

  // Generate recommendations
  const recommendations: AuditRecommendation[] = []

  for (const p of criticalMissing) {
    recommendations.push({
      policyId: p.id,
      priority: 'critical',
      action: 'obtain',
      title: `Teckna: ${p.name}`,
      detail: p.recommendation ?? p.why,
      deadline: p.id === 'travel-group' ? '2026-04-10' : undefined,
    })
  }

  for (const p of importantMissing) {
    recommendations.push({
      policyId: p.id,
      priority: 'important',
      action: 'obtain',
      title: `Teckna: ${p.name}`,
      detail: p.recommendation ?? p.why,
    })
  }

  for (const p of expiringSoon) {
    recommendations.push({
      policyId: p.id,
      priority: p.priority,
      action: 'renew',
      title: `Förnya: ${p.name}`,
      detail: `Försäkringen löper ut ${p.renewalDate ?? 'snart'}. Förnya innan utgång.`,
      deadline: p.renewalDate,
    })
  }

  for (const p of reviewNeeded) {
    recommendations.push({
      policyId: p.id,
      priority: p.priority,
      action: 'review',
      title: `Granska: ${p.name}`,
      detail: `Villkor eller täckning bör ses över. ${p.recommendation ?? ''}`,
    })
  }

  return {
    auditDate,
    weekNumber,
    overallScore,
    criticalGaps,
    recommendations,
    nextReviewDate: getNextMonday(now),
  }
}

// ─── Mock audit history ───────────────────────────────────────────────────────

export const MOCK_AUDIT_HISTORY: { date: string; week: number; score: number }[] = [
  { date: '2026-03-02', week: 10, score: 0 },
  { date: '2026-03-09', week: 11, score: 0 },
  { date: '2026-03-16', week: 12, score: 0 },
  { date: '2026-03-23', week: 13, score: 0 },
]

// ─── Category labels ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<InsuranceCategory, string> = {
  liability: 'Ansvar',
  cyber:     'Cyber',
  personnel: 'Personal',
  do:        'D&O',
  property:  'Egendom',
  travel:    'Resa',
  ip:        'IP',
}

export const STATUS_CONFIG: Record<InsuranceStatus, { label: string; color: string; bg: string }> = {
  active:        { label: 'Aktiv',          color: '#10B981', bg: '#10B98115' },
  expiring_soon: { label: 'Löper ut snart', color: '#F59E0B', bg: '#F59E0B15' },
  expired:       { label: 'Utgången',       color: '#EF4444', bg: '#EF444415' },
  missing:       { label: 'Saknas',         color: '#EF4444', bg: '#EF444415' },
  review_needed: { label: 'Granskas',       color: '#F59E0B', bg: '#F59E0B15' },
}

export const PRIORITY_CONFIG: Record<InsurancePriority, { label: string; color: string }> = {
  critical:  { label: 'Kritisk',  color: '#EF4444' },
  important: { label: 'Viktig',   color: '#F59E0B' },
  optional:  { label: 'Valfri',   color: '#6B7280' },
}
