import type {
  Campaign,
  MediaChannel,
  Creative,
  Audience,
  BudgetAllocation,
} from './types'

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-001',
    name: 'Landvex Sverige Launch',
    objective: 'awareness',
    geo_scope: 'national',
    budget_total: 50000,
    currency: 'SEK',
    start_date: '2026-05-01',
    end_date: '2026-06-30',
    status: 'draft',
    entity_id: 'entity-landvex',
    created_by: 'erik@hypbit.com',
    created_at: '2026-03-27T00:00:00Z',
  },
  {
    id: 'camp-002',
    name: 'Wavult Group Brand',
    objective: 'awareness',
    geo_scope: 'global',
    budget_total: 20000,
    currency: 'EUR',
    start_date: '2026-06-01',
    end_date: '2026-12-31',
    status: 'draft',
    entity_id: 'entity-wavult-group',
    created_by: 'erik@hypbit.com',
    created_at: '2026-03-27T00:00:00Z',
  },
  {
    id: 'camp-003',
    name: 'Thailand Zoomer Recruit',
    objective: 'leads',
    geo_scope: 'local',
    budget_total: 15000,
    currency: 'SEK',
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    status: 'active',
    entity_id: 'entity-wavult-ops',
    created_by: 'leon@hypbit.com',
    created_at: '2026-03-25T00:00:00Z',
  },
]

// ─── Channels ─────────────────────────────────────────────────────────────────

export const MOCK_CHANNELS: MediaChannel[] = [
  {
    id: 'ch-spotify',
    type: 'audio',
    provider: 'spotify',
    api_adapter: 'SpotifyDummyAdapter',
    status: 'pending',
    daily_budget: 0,
  },
  {
    id: 'ch-youtube',
    type: 'video',
    provider: 'youtube',
    api_adapter: 'YouTubeDummyAdapter',
    status: 'pending',
    daily_budget: 0,
  },
  {
    id: 'ch-meta',
    type: 'social',
    provider: 'meta',
    api_adapter: 'MetaDummyAdapter',
    status: 'pending',
    daily_budget: 0,
  },
  {
    id: 'ch-ttd',
    type: 'programmatic',
    provider: 'trade_desk',
    api_adapter: 'TradesDeskDummyAdapter',
    status: 'disconnected',
    daily_budget: 0,
  },
  {
    id: 'ch-dv360',
    type: 'programmatic',
    provider: 'google_dv360',
    api_adapter: 'DV360DummyAdapter',
    status: 'disconnected',
    daily_budget: 0,
  },
  {
    id: 'ch-acast',
    type: 'audio',
    provider: 'acast',
    api_adapter: 'AcastDummyAdapter',
    status: 'disconnected',
    daily_budget: 0,
  },
  {
    id: 'ch-manual',
    type: 'display',
    provider: 'manual',
    api_adapter: 'ManualAdapter',
    status: 'pending',
    daily_budget: 0,
  },
]

// ─── Creatives ────────────────────────────────────────────────────────────────

export const MOCK_CREATIVES: Creative[] = [
  {
    id: 'cr-001',
    campaign_id: 'camp-001',
    type: 'audio',
    hook: 'Sveriges infrastruktur behöver ögon.',
    message: 'Landvex levererar realtidsdata om mark, vägar och infrastruktur till de som bygger Sverige.',
    cta: 'Läs mer på landvex.se',
    variants: [
      { id: 'v-001a', label: 'Version A — Direkt' },
      { id: 'v-001b', label: 'Version B — Berättande' },
    ],
    status: 'draft',
  },
  {
    id: 'cr-002',
    campaign_id: 'camp-001',
    type: 'video',
    hook: 'Vad händer när ingen ser?',
    message: 'Vi fångar det som infrastrukturägare missar. Landvex — markdata i realtid.',
    cta: 'Se demo',
    variants: [{ id: 'v-002a', label: 'Version A — 15s' }],
    status: 'draft',
  },
  {
    id: 'cr-003',
    campaign_id: 'camp-002',
    type: 'image',
    hook: 'One Group. Multiple Ventures.',
    message: 'Wavult Group operates at the intersection of data, infrastructure and scale.',
    cta: 'wavult.com',
    variants: [
      { id: 'v-003a', label: 'Dark theme' },
      { id: 'v-003b', label: 'Light theme' },
    ],
    status: 'draft',
  },
  {
    id: 'cr-004',
    campaign_id: 'camp-003',
    type: 'text',
    hook: 'Tjäna pengar på din tid i Thailand.',
    message: 'Vi söker fältpersonal för uppdrag i Bangkok, Chiang Mai och Phuket. Flexibelt. Betalt per uppdrag.',
    cta: 'Ansök nu',
    variants: [{ id: 'v-004a', label: 'Thai språk' }, { id: 'v-004b', label: 'Engelska' }],
    status: 'draft',
  },
  {
    id: 'cr-005',
    campaign_id: 'camp-003',
    type: 'image',
    hook: 'Bli en del av laget.',
    message: 'Wavult söker drivna fältoperatörer i Sydostasien. Starta i april 2026.',
    cta: 'Se mer',
    variants: [{ id: 'v-005a', label: 'Bild A — Stad' }],
    status: 'draft',
  },
]

// ─── Audiences ────────────────────────────────────────────────────────────────

export const MOCK_AUDIENCES: Audience[] = [
  {
    id: 'aud-001',
    campaign_id: 'camp-001',
    geo: ['Sverige', 'Stockholm', 'Göteborg', 'Malmö'],
    age_range: [30, 60],
    interests: ['infrastruktur', 'kommunal teknik', 'fastigheter', 'samhällsbyggnad'],
    custom_data: 'CRM-segment: SE-kommuner',
  },
  {
    id: 'aud-002',
    campaign_id: 'camp-002',
    geo: ['Global', 'EU', 'USA', 'UAE'],
    age_range: [28, 55],
    interests: ['tech', 'venture', 'startups', 'AI', 'infrastructure'],
    custom_data: 'CRM-segment: Global Tech Investors',
  },
  {
    id: 'aud-003',
    campaign_id: 'camp-002',
    geo: ['Sverige', 'Norge', 'Danmark', 'Finland'],
    age_range: [32, 58],
    interests: ['B2B SaaS', 'enterprise tech', 'data platforms'],
    custom_data: 'CRM-segment: Nordic B2B',
  },
]

// ─── Budget Allocations (Fas 1 — alla 0) ─────────────────────────────────────

export const MOCK_BUDGET_ALLOCATIONS: BudgetAllocation[] = MOCK_CAMPAIGNS.flatMap(campaign =>
  MOCK_CHANNELS.slice(0, 3).map((ch) => ({
    id: `ba-${campaign.id}-${ch.id}`,
    campaign_id: campaign.id,
    channel_id: ch.id,
    daily_budget: 0,
    total_spent: 0,
    performance_score: 0,
    auto_optimize: false,
  }))
)
