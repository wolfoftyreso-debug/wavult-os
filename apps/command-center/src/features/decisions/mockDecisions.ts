// ─── Mock-data för Decision-Driven Meeting System ────────────────────────────
import type { Meeting, DecisionBlock } from './decisionTypes'

// ─── Decision Blocks ──────────────────────────────────────────────────────────

const budgetBlock: DecisionBlock = {
  id: 'db-001',
  meetingId: 'meeting-annual-2026',
  title: 'Budgetallokering 2026',
  context:
    'Wavult Group har 4 250 000 SEK i disponibelt kapital för 2026. Tre strategiska allokeringsmodeller har identifierats av systemet baserat på historiska tillväxtdata och marknadsanalys.',
  problemStatement:
    'Vi måste fördela 4,25M SEK på ett sätt som maximerar tillväxt utan att äventyra kassaflöde och operationell stabilitet.',
  objective:
    'Definiera kapitalallokering för 2026 som ger minst 40% YoY tillväxt och kassaflöde ≥ 0 under hela året.',
  alternatives: [
    {
      id: 'A',
      title: 'Tillväxtfokus',
      description:
        'Investera tungt i försäljning och produkt. 60% till sales & marketing, 30% till produktutveckling, 10% operations.',
      revenueImpact: 2_800_000,
      costImpact: -4_250_000,
      riskLevel: 'high',
      timeframe: 'Q1–Q4 2026',
      operationalImpact:
        'Kräver 3 nya säljare och accelererad produktlansering. Kassaflödesnegativt under Q1–Q2.',
    },
    {
      id: 'B',
      title: 'Balanserad tillväxt',
      description:
        'Balans mellan tillväxt och stabilitet. 40% försäljning, 35% produkt, 25% operations & buffert.',
      revenueImpact: 1_900_000,
      costImpact: -4_250_000,
      riskLevel: 'medium',
      timeframe: 'Q1–Q4 2026',
      operationalImpact:
        'Hållbar takt. Kassaflödspositiv från Q3. Möjliggör rekrytering utan stressat tempo.',
    },
    {
      id: 'C',
      title: 'Konsolidering',
      description:
        'Fokus på befintliga kunder och lönsamhet. 20% försäljning, 30% produkt, 50% operations & kassaflöde.',
      revenueImpact: 800_000,
      costImpact: -4_250_000,
      riskLevel: 'low',
      timeframe: 'Q1–Q4 2026',
      operationalImpact:
        'Minimal risk. Kassaflödspositiv från dag 1. Begränsad tillväxt men solid bas för 2027.',
    },
  ],
  votes: {},
  result: null,
  overriddenBy: null,
  overrideReason: null,
  systemActions: [],
  status: 'active',
  createdAt: '2026-03-01T09:00:00Z',
  decidedAt: null,
}

const expansionBlock: DecisionBlock = {
  id: 'db-002',
  meetingId: 'meeting-annual-2026',
  title: 'Geografisk expansion 2026',
  context:
    'Wavult Groups kärnmarknad är Sverige. Systemet har identifierat Nederländerna och övriga EU som potentiella tillväxtmarknader baserat på ICP-analys och konkurrentluckor.',
  problemStatement:
    'Ska vi expandera geografiskt 2026, och i så fall hur aggressivt — givet budgetbeslut som fattats i punkt 1?',
  objective:
    'Definiera geografisk expansionsstrategi som adderar minst en ny intäktsström utan att splitra fokus.',
  alternatives: [
    {
      id: 'A',
      title: 'Sverige First',
      description:
        'Fullt fokus på att dominera den svenska marknaden innan expansion. Öka marknadsandel från 12% till 25%.',
      revenueImpact: 1_200_000,
      costImpact: -600_000,
      riskLevel: 'low',
      timeframe: 'Hela 2026',
      operationalImpact:
        'Enkelt att exekvera. Befintligt team hanterar. Starkt varumärke lokalt.',
    },
    {
      id: 'B',
      title: 'Sverige + Nederländerna',
      description:
        'Pilot i NL via partnerkanal. Kräver 1 country manager och lokal legal setup.',
      revenueImpact: 1_800_000,
      costImpact: -950_000,
      riskLevel: 'medium',
      timeframe: 'Q2–Q4 2026',
      operationalImpact:
        'Måttlig komplexitet. NL är kompatibel med EU GDPR-setup vi redan har. Holländsk marknad receptiv för B2B SaaS.',
    },
    {
      id: 'C',
      title: 'EU-wide lansering',
      description:
        'Aggressiv EU-expansion via direkt försäljning i 5 länder: SE, NL, DE, FR, PL.',
      revenueImpact: 4_500_000,
      costImpact: -3_200_000,
      riskLevel: 'critical',
      timeframe: 'Q1–Q4 2026',
      operationalImpact:
        'Kräver 8+ nya hires, multi-language support, lokal legal i varje land. Hög exekveringsrisk vid parallell produktutveckling.',
    },
  ],
  votes: {},
  result: null,
  overriddenBy: null,
  overrideReason: null,
  systemActions: [],
  status: 'active',
  createdAt: '2026-03-01T09:30:00Z',
  decidedAt: null,
}

// ─── Möten ────────────────────────────────────────────────────────────────────

export const mockMeetings: Meeting[] = [
  {
    id: 'meeting-annual-2026',
    level: 'annual',
    title: 'Annual Planning 2026 — Wavult Group',
    scheduledAt: '2026-04-10T09:00:00Z',
    participants: ['erik@hypbit.com', 'winston@hypbit.com', 'leon@hypbit.com', 'dennis@hypbit.com', 'johan@hypbit.com'],
    agenda: [budgetBlock, expansionBlock],
    status: 'scheduled',
    minutesGenerated: false,
    createdBy: 'erik@hypbit.com',
  },
  {
    id: 'meeting-qbr-q2-2026',
    level: 'qbr',
    title: 'QBR Q2 2026 — Kvartalsgranskning',
    scheduledAt: '2026-05-01T10:00:00Z',
    participants: ['erik@hypbit.com', 'winston@hypbit.com', 'leon@hypbit.com'],
    agenda: [],
    status: 'blocked',
    blockedReason: 'Kräver Annual Planning-beslut om budget (möte 2026-04-10)',
    minutesGenerated: false,
    createdBy: 'erik@hypbit.com',
  },
]

export const mockDecisionBlocks: DecisionBlock[] = [budgetBlock, expansionBlock]
