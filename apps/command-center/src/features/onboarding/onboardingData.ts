// ─── Onboarding Data — Reactive, never hardcoded ───────────────────────────────
// All dates and countdowns are computed at runtime from known milestones.
// Entity data is pulled live from entityData.ts — never duplicated here.
import { ENTITIES } from '../entity/entityData'

// ─── Reactive entity summary ──────────────────────────────────────────────────
function getEntitySummary(): string {
  const count = ENTITIES.filter(e => e.status !== 'pending').length
  const jurisdictions = [...new Set(ENTITIES.map(e => e.jurisdiction))].length
  return `Wavult Group opererar via ${count} juridiska entiteter i ${jurisdictions} jurisdiktioner.`
}

function getEntityKeyPoints(): string[] {
  return ENTITIES
    .filter(e => e.status !== 'pending')
    .slice(0, 7)
    .map(e => `${e.name} — ${e.role || e.jurisdiction}`)
}

export interface OnboardingStep {
  id: string
  route: string
  title: string
  description: string
  bullets?: string[]
  example?: string
  callout?: {
    type: 'info' | 'warning' | 'tip'
    text: string
  }
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  targetSelector?: string
  icon: string
  visual?: 'entity-switcher' | 'finance' | 'mission-control' | 'system-graph' | 'knowledge'
  keyPoints?: string[]
}

export interface OnboardingTour {
  id: string
  name: string
  description: string
  estimatedMinutes: number
  steps: OnboardingStep[]
}

// ─── Computed milestones (reactive) ───────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const now = new Date()
  const target = new Date(isoDate)
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

function formatCountdown(isoDate: string, label: string): string {
  const days = daysUntil(isoDate)
  if (days === 0) return `${label} är idag`
  if (days === 1) return `${label} är imorgon`
  if (days <= 7) return `${label} om ${days} ${days === 1 ? 'dag' : 'dagar'}`
  const weeks = Math.floor(days / 7)
  const rem = days % 7
  const weeksStr = `${weeks} ${weeks === 1 ? 'vecka' : 'veckor'}`
  const remStr = rem > 0 ? ` och ${rem} ${rem === 1 ? 'dag' : 'dagar'}` : ''
  return `${label} om ${weeksStr}${remStr}`
}

const BANGKOK = formatCountdown('2026-04-11', 'Bangkok Workcamp')
const SWEDEN_LAUNCH = formatCountdown('2026-06-01', 'quiXzoom Sverige-lansering')
const NETHERLANDS_LAUNCH = formatCountdown('2027-01-01', 'Nederland-expansion')

// ─── Tours ────────────────────────────────────────────────────────────────────

export const TOURS: OnboardingTour[] = [
  {
    id: 'first-run',
    name: 'Välkommen till Wavult OS',
    description: 'Ditt operativsystem för hela Wavult Group.',
    estimatedMinutes: 3,
    steps: [
      {
        id: 'welcome',
        route: '/',
        title: 'Välkommen till Wavult OS',
        description: `Wavult OS är det operativa navet för hela Wavult Group. Härifrån styr du ventures, team, ekonomi och infrastruktur — allt i ett system.\n\n${BANGKOK}. ${SWEDEN_LAUNCH}.`,
        icon: '⬡',
        position: 'center',
        keyPoints: [
          'Realtidsövervakning av alla 9 backend-tjänster',
          'Ekonomi, CRM, juridik och HR i ett system',
          'Apollo.io-integration för försäljning och prospektering',
          'Automatiserade reseflöden och bokningar',
        ],
      },
      {
        id: 'entities',
        route: '/entities',
        title: 'Wavult Group — Bolagsstruktur',
        description: getEntitySummary(),
        icon: '🏛️',
        position: 'center',
        keyPoints: getEntityKeyPoints(),
      },
      {
        id: 'ventures',
        route: '/quixzoom-app',
        title: 'quiXzoom — Optisk datanätverk',
        description: `quiXzoom är plattformen där Zoomers tar visuella uppdrag på kartan och tjänar pengar. Data säljs via Quixom Ads (leads, marknadsdata) och LandveX (enterprise intelligence). ${SWEDEN_LAUNCH}.`,
        icon: '📍',
        position: 'center',
        keyPoints: [
          'Zoomers (aldrig "fotografer") tar geo-lokaliserade uppdrag',
          'Quixom Ads: leads-paket och kartreklam för företag',
          'LandveX: optisk intelligence till kommuner och infrastrukturägare',
          'Separata produkter — blanda dem aldrig i kommunikation',
        ],
        callout: {
          type: 'warning',
          text: 'Regel: Kalla dem alltid Zoomers, aldrig fotografer eller fältpersonal.',
        },
      },
      {
        id: 'ops',
        route: '/ops',
        title: 'Operations & Genomförande',
        description: 'Incident-systemet reagerar automatiskt på KPI-avvikelser. Alla kritiska händelser eskalerar till rätt person utan manuell handläggning.',
        icon: '⚙️',
        position: 'center',
        keyPoints: [
          'Kafka event-streaming för all systemkommunikation',
          'Automatisk eskalering vid KPI-avvikelse',
          'n8n workflow-automation för repetitiva processer',
          'ECS Fargate — 9 tjänster, all upptime-monitoring i realtid',
        ],
      },
      {
        id: 'travel',
        route: '/flights',
        title: 'Resor & Rörlighet',
        description: `Reseflöden triggas automatiskt via kalenderintegration. Visum, flyg, boende, transport och gym hanteras i en pipeline. ${BANGKOK}`,
        icon: '✈️',
        position: 'center',
        keyPoints: [
          'Visum-kontroll per destination och pass-typ',
          'Uber for Business — centralbetalt för hela teamet',
          'Wellhub (Gympass) — hälsa är en del av arbetet',
          'Boende: Nysa Hotel Bangkok, Sukhumvit 13',
        ],
        callout: {
          type: 'info',
          text: `${BANGKOK} — Visum: 30 dagar visumfritt för svenska pass. >30 dagar kräver TR-90.`,
        },
      },
    ],
  },
]
