// ─── Campaign Operating System — data layer ───────────────────────────────────
// Global execution engine: Plan → Budget → Asset → Deploy → Measure → Adjust

export type CampaignChannel = 'linkedin' | 'meta' | 'google' | 'email' | 'outbound' | 'pr' | 'event' | 'sms' | 'reddit'
export type ActivityStatus = 'planned' | 'ready' | 'deployed' | 'failed' | 'paused'
export type BudgetStatus = 'pending' | 'approved' | 'paid' | 'over'
export type KPIResult = 'success' | 'underperform' | 'fail' | 'pending'

export interface CampaignAsset {
  id: string
  type: 'copy' | 'image' | 'video' | 'landing-page' | 'email-template'
  name: string
  ready: boolean
  url?: string
}

export interface CampaignBudget {
  id: string
  cost_monthly: number   // USD
  approved: boolean
  status: BudgetStatus
  spend_to_date: number
}

export interface CampaignAutomation {
  id: string
  trigger: 'cron' | 'webhook' | 'manual'
  schedule?: string   // cron expression if trigger=cron
  channel_api: CampaignChannel
  retry_count: number
  fallback_channel?: CampaignChannel
  last_run?: string   // ISO date
  next_run?: string
}

export interface CampaignKPI {
  metric: 'leads' | 'ctr' | 'revenue' | 'impressions' | 'conversions'
  target: number
  current: number
  result: KPIResult
}

export interface CampaignActivity {
  id: string
  name: string
  brand: 'quixzoom' | 'quixom-ads' | 'landvex' | 'hypbit' | 'wavult'
  country: string
  entity_id: string
  site_id: string       // links to MARKET_SITES
  date: string          // ISO date YYYY-MM-DD
  time: string          // HH:MM
  channel: CampaignChannel
  status: ActivityStatus
  asset: CampaignAsset
  budget: CampaignBudget
  automation: CampaignAutomation
  kpi: CampaignKPI
  responsible_role_id: string
  description: string
  alerts: Array<{
    id: string
    severity: 'warning' | 'critical'
    message: string
    action: string
    escalated: boolean
  }>
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isActivityValid(a: CampaignActivity): boolean {
  return a.asset.ready && a.budget.approved && a.kpi.target > 0 && a.automation.trigger !== undefined
}

// ─── Display constants ────────────────────────────────────────────────────────

export const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  linkedin: 'LinkedIn',
  meta: 'Meta Ads',
  google: 'Google',
  email: 'Email',
  outbound: 'Outbound',
  pr: 'PR',
  event: 'Event',
  sms: 'SMS',
  reddit: 'Reddit',
}

export const CHANNEL_COLOR: Record<CampaignChannel, string> = {
  linkedin: '#0A66C2',
  meta: '#1877F2',
  google: '#4285F4',
  email: '#10B981',
  outbound: '#8B5CF6',
  pr: '#F59E0B',
  event: '#EC4899',
  sms: '#06B6D4',
  reddit: '#FF4500',
}

export const STATUS_COLOR: Record<ActivityStatus, string> = {
  planned: '#6B7280',
  ready: '#F59E0B',
  deployed: '#10B981',
  failed: '#EF4444',
  paused: '#8B5CF6',
}

export const KPI_COLOR: Record<KPIResult, string> = {
  success: '#10B981',
  underperform: '#F59E0B',
  fail: '#EF4444',
  pending: '#6B7280',
}

// ─── Alert engine ─────────────────────────────────────────────────────────────

export function getActivityAlerts(a: CampaignActivity): CampaignActivity['alerts'] {
  const auto = [...a.alerts]
  if (!a.asset.ready && a.status === 'ready') {
    auto.push({
      id: 'auto-asset',
      severity: 'critical' as const,
      message: 'Asset not ready but status is ready',
      action: 'Upload asset before deploy',
      escalated: false,
    })
  }
  if (a.kpi.current < a.kpi.target * 0.5 && a.status === 'deployed') {
    auto.push({
      id: 'auto-kpi',
      severity: 'warning' as const,
      message: 'KPI below 50% of target',
      action: 'Review channel performance',
      escalated: false,
    })
  }
  return auto
}

// ─── Seed data — Q2 2026 ─────────────────────────────────────────────────────

export const CAMPAIGN_ACTIVITIES: CampaignActivity[] = [
  // 1. QuixZoom Sweden — LinkedIn awareness (planned)
  {
    id: 'cos-001',
    name: 'QZ Sweden LinkedIn Awareness',
    brand: 'quixzoom',
    country: 'Sweden',
    entity_id: 'quixzoom-uab',
    site_id: 'site-se',
    date: '2026-04-01',
    time: '09:00',
    channel: 'linkedin',
    status: 'planned',
    asset: {
      id: 'ast-001',
      type: 'copy',
      name: 'QZ SE LinkedIn copy deck v1',
      ready: false,
    },
    budget: {
      id: 'bud-001',
      cost_monthly: 1200,
      approved: false,
      status: 'pending',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-001',
      trigger: 'cron',
      schedule: '0 9 * * 1',
      channel_api: 'linkedin',
      retry_count: 2,
      fallback_channel: 'email',
      next_run: '2026-04-06T09:00:00Z',
    },
    kpi: {
      metric: 'leads',
      target: 80,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'ceo-ops',
    description: 'LinkedIn awareness campaign targeting Swedish SME owners and real estate decision-makers. Goal: establish QuixZoom brand presence in the Scandinavian professional network before summer launch push.',
    alerts: [],
  },

  // 2. QuixZoom Thailand — Meta pre-launch (planned)
  {
    id: 'cos-002',
    name: 'QZ Thailand Meta Pre-launch',
    brand: 'quixzoom',
    country: 'Thailand',
    entity_id: 'quixzoom-uab',
    site_id: 'site-th',
    date: '2026-04-14',
    time: '10:00',
    channel: 'meta',
    status: 'planned',
    asset: {
      id: 'ast-002',
      type: 'image',
      name: 'TH launch creative set (3 variants)',
      ready: false,
    },
    budget: {
      id: 'bud-002',
      cost_monthly: 900,
      approved: false,
      status: 'pending',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-002',
      trigger: 'manual',
      channel_api: 'meta',
      retry_count: 1,
    },
    kpi: {
      metric: 'impressions',
      target: 50000,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'ceo-ops',
    description: 'Meta Ads pre-launch campaign targeting Thai tourists and expats in Bangkok and Phuket. Timed with team workcamp arrival on April 11. Focus on brand awareness and zoomer recruitment.',
    alerts: [],
  },

  // 3. QuixZoom Netherlands — Email nurture (ready)
  {
    id: 'cos-003',
    name: 'QZ Netherlands Email Nurture',
    brand: 'quixzoom',
    country: 'Netherlands',
    entity_id: 'quixzoom-uab',
    site_id: 'site-nl',
    date: '2026-05-04',
    time: '08:00',
    channel: 'email',
    status: 'ready',
    asset: {
      id: 'ast-003',
      type: 'email-template',
      name: 'NL market intro sequence (5 emails)',
      ready: true,
      url: 'https://hypbit.com/assets/nl-email-v2',
    },
    budget: {
      id: 'bud-003',
      cost_monthly: 400,
      approved: true,
      status: 'approved',
      spend_to_date: 120,
    },
    automation: {
      id: 'aut-003',
      trigger: 'cron',
      schedule: '0 8 1 * *',
      channel_api: 'email',
      retry_count: 3,
      last_run: '2026-04-01T08:00:00Z',
      next_run: '2026-05-04T08:00:00Z',
    },
    kpi: {
      metric: 'leads',
      target: 60,
      current: 18,
      result: 'underperform',
    },
    responsible_role_id: 'ceo-ops',
    description: 'Email nurture sequence for pre-registered interest list collected during NL market research. 5-email drip covering platform value prop, zoomer earnings potential, and early-access invite.',
    alerts: [],
  },

  // 4. LandveX UAE — PR campaign (deployed)
  {
    id: 'cos-004',
    name: 'LandveX Dubai Smart City PR',
    brand: 'landvex',
    country: 'UAE',
    entity_id: 'wavult-group',
    site_id: 'site-ae',
    date: '2026-04-07',
    time: '11:00',
    channel: 'pr',
    status: 'deployed',
    asset: {
      id: 'ast-004',
      type: 'copy',
      name: 'Dubai Smart City press release + media kit',
      ready: true,
      url: 'https://hypbit.com/assets/landvex-dubai-pr',
    },
    budget: {
      id: 'bud-004',
      cost_monthly: 2500,
      approved: true,
      status: 'paid',
      spend_to_date: 2100,
    },
    automation: {
      id: 'aut-004',
      trigger: 'webhook',
      channel_api: 'pr',
      retry_count: 1,
      last_run: '2026-04-07T11:00:00Z',
    },
    kpi: {
      metric: 'impressions',
      target: 25000,
      current: 9800,
      result: 'underperform',
    },
    responsible_role_id: 'group-ceo',
    description: 'Press release and media kit distribution targeting Gulf business media: Arabian Business, Gulf News, and Zawya. Focus on LandveX as AI-powered smart city infrastructure partner. Distribution via PR Wire MENA.',
    alerts: [
      {
        id: 'ale-004-1',
        severity: 'warning',
        message: 'Media pickup below target — only 3 of 8 target outlets covered',
        action: 'Follow up with Gulf News and Zawya editors directly',
        escalated: false,
      },
    ],
  },

  // 5. LandveX Sweden — Outbound (ready)
  {
    id: 'cos-005',
    name: 'LandveX SE Outbound — Municipalities',
    brand: 'landvex',
    country: 'Sweden',
    entity_id: 'quixzoom-uab',
    site_id: 'site-se',
    date: '2026-04-21',
    time: '08:30',
    channel: 'outbound',
    status: 'ready',
    asset: {
      id: 'ast-005',
      type: 'copy',
      name: 'SE municipality cold outreach sequence',
      ready: true,
      url: 'https://hypbit.com/assets/landvex-se-outbound',
    },
    budget: {
      id: 'bud-005',
      cost_monthly: 600,
      approved: true,
      status: 'approved',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-005',
      trigger: 'cron',
      schedule: '30 8 * * 2',
      channel_api: 'outbound',
      retry_count: 3,
      fallback_channel: 'email',
      next_run: '2026-04-21T08:30:00Z',
    },
    kpi: {
      metric: 'leads',
      target: 30,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'clo',
    description: 'Targeted outbound sequence to 80 Swedish municipalities (kommuner) responsible for infrastructure and smart city initiatives. Personalized to each municipality\'s published digitalisation strategy. Managed via HubSpot sequences.',
    alerts: [],
  },

  // 6. LandveX USA — LinkedIn (planned)
  {
    id: 'cos-006',
    name: 'LandveX USA LinkedIn — Port Authorities',
    brand: 'landvex',
    country: 'USA',
    entity_id: 'landvex-inc',
    site_id: 'site-us-tx',
    date: '2026-05-18',
    time: '14:00',
    channel: 'linkedin',
    status: 'planned',
    asset: {
      id: 'ast-006',
      type: 'video',
      name: 'LandveX product demo video (2 min)',
      ready: false,
    },
    budget: {
      id: 'bud-006',
      cost_monthly: 3500,
      approved: false,
      status: 'pending',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-006',
      trigger: 'manual',
      channel_api: 'linkedin',
      retry_count: 2,
    },
    kpi: {
      metric: 'leads',
      target: 25,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'clo',
    description: 'LinkedIn Sponsored Content targeting US port authority directors, municipal infrastructure heads, and federal contract officers. Promoted alongside Texas LLC entity registration to establish US credibility.',
    alerts: [],
  },

  // 7. Hypbit Lithuania — Event (planned)
  {
    id: 'cos-007',
    name: 'Hypbit LT Tech Meetup',
    brand: 'hypbit',
    country: 'Lithuania',
    entity_id: 'quixzoom-uab',
    site_id: 'site-lt',
    date: '2026-05-28',
    time: '18:00',
    channel: 'event',
    status: 'planned',
    asset: {
      id: 'ast-007',
      type: 'landing-page',
      name: 'Hypbit LT Meetup event page',
      ready: false,
    },
    budget: {
      id: 'bud-007',
      cost_monthly: 800,
      approved: false,
      status: 'pending',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-007',
      trigger: 'manual',
      channel_api: 'event',
      retry_count: 0,
    },
    kpi: {
      metric: 'leads',
      target: 40,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'ceo-ops',
    description: 'Vilnius tech community meetup to present Hypbit OS and recruit early B2B clients. Co-hosted with Startup Lithuania. Expected 80 attendees. Demo of role-based command center + quest engine.',
    alerts: [],
  },

  // 8. Hypbit Sweden — Email (ready)
  {
    id: 'cos-008',
    name: 'Hypbit SE Email Onboarding Pilot',
    brand: 'hypbit',
    country: 'Sweden',
    entity_id: 'quixzoom-uab',
    site_id: 'site-se',
    date: '2026-05-11',
    time: '09:00',
    channel: 'email',
    status: 'ready',
    asset: {
      id: 'ast-008',
      type: 'email-template',
      name: 'Hypbit onboarding welcome series (3 emails)',
      ready: true,
      url: 'https://hypbit.com/assets/hypbit-onboarding-se',
    },
    budget: {
      id: 'bud-008',
      cost_monthly: 300,
      approved: true,
      status: 'approved',
      spend_to_date: 80,
    },
    automation: {
      id: 'aut-008',
      trigger: 'webhook',
      channel_api: 'email',
      retry_count: 3,
      last_run: '2026-04-22T09:00:00Z',
      next_run: '2026-05-11T09:00:00Z',
    },
    kpi: {
      metric: 'conversions',
      target: 20,
      current: 7,
      result: 'underperform',
    },
    responsible_role_id: 'ceo-ops',
    description: 'Automated onboarding email series for Swedish pilot clients who signed up via the Hypbit landing page. Webhook-triggered on signup. Series: welcome → feature highlight → ROI calculator → upgrade CTA.',
    alerts: [],
  },

  // 9. Wavult — PR global (planned)
  {
    id: 'cos-009',
    name: 'Wavult Group Seed Round PR',
    brand: 'wavult',
    country: 'UAE',
    entity_id: 'wavult-group',
    site_id: 'site-ae',
    date: '2026-06-02',
    time: '09:00',
    channel: 'pr',
    status: 'planned',
    asset: {
      id: 'ast-009',
      type: 'copy',
      name: 'Seed round announcement press kit',
      ready: false,
    },
    budget: {
      id: 'bud-009',
      cost_monthly: 5000,
      approved: false,
      status: 'pending',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-009',
      trigger: 'manual',
      channel_api: 'pr',
      retry_count: 1,
    },
    kpi: {
      metric: 'impressions',
      target: 100000,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'group-ceo',
    description: 'Global seed round announcement targeting tech and startup media: TechCrunch, Sifted (EU), and Arab News. Press kit includes founder story, product roadmap, and market thesis. Coordinated with legal milestone: all entities incorporated.',
    alerts: [],
  },

  // 10. Wavult — LinkedIn (deployed, with critical alert)
  {
    id: 'cos-010',
    name: 'Wavult Group LinkedIn Employer Brand',
    brand: 'wavult',
    country: 'Sweden',
    entity_id: 'wavult-group',
    site_id: 'site-se',
    date: '2026-04-03',
    time: '10:00',
    channel: 'linkedin',
    status: 'deployed',
    asset: {
      id: 'ast-010',
      type: 'image',
      name: 'Employer brand creative Q2 (6 posts)',
      ready: true,
      url: 'https://hypbit.com/assets/wavult-employer-brand',
    },
    budget: {
      id: 'bud-010',
      cost_monthly: 1500,
      approved: true,
      status: 'paid',
      spend_to_date: 1420,
    },
    automation: {
      id: 'aut-010',
      trigger: 'cron',
      schedule: '0 10 * * 1,3,5',
      channel_api: 'linkedin',
      retry_count: 2,
      last_run: '2026-04-18T10:00:00Z',
      next_run: '2026-04-20T10:00:00Z',
    },
    kpi: {
      metric: 'impressions',
      target: 30000,
      current: 4200,
      result: 'fail',
    },
    responsible_role_id: 'group-ceo',
    description: 'Ongoing LinkedIn employer branding campaign to attract senior talent for Q3 hiring: CRO, Head of Engineering, and two product managers. Posted MWF schedule across Wavult Group company page.',
    alerts: [
      {
        id: 'ale-010-1',
        severity: 'critical',
        message: 'Impressions at 14% of target — page algorithm suppressed',
        action: 'Boost top-performing post with $500 budget or switch to LinkedIn Ads',
        escalated: true,
      },
    ],
  },

  // 11. Quixom Ads — Meta (ready)
  {
    id: 'cos-011',
    name: 'Quixom Ads EU Meta Campaign',
    brand: 'quixom-ads',
    country: 'Lithuania',
    entity_id: 'quixzoom-uab',
    site_id: 'site-lt',
    date: '2026-06-01',
    time: '08:00',
    channel: 'meta',
    status: 'ready',
    asset: {
      id: 'ast-011',
      type: 'video',
      name: 'Quixom Ads explainer video (60s)',
      ready: true,
      url: 'https://hypbit.com/assets/quixom-ads-explainer',
    },
    budget: {
      id: 'bud-011',
      cost_monthly: 2000,
      approved: true,
      status: 'approved',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-011',
      trigger: 'cron',
      schedule: '0 8 1 6 *',
      channel_api: 'meta',
      retry_count: 2,
      fallback_channel: 'email',
      next_run: '2026-06-01T08:00:00Z',
    },
    kpi: {
      metric: 'leads',
      target: 100,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'ceo-ops',
    description: 'EU-wide Meta Ads campaign introducing Quixom Ads as hyperlocal visual advertising platform for SMEs. Target audience: digital marketing managers at companies with 10–200 employees in SE, LT, NL. Lookalike from existing Hypbit base.',
    alerts: [],
  },

  // 12. Quixom Ads — Outbound USA (planned)
  {
    id: 'cos-012',
    name: 'Quixom Ads USA Outbound Pilot',
    brand: 'quixom-ads',
    country: 'USA',
    entity_id: 'landvex-inc',
    site_id: 'site-us-tx',
    date: '2026-06-22',
    time: '15:00',
    channel: 'outbound',
    status: 'planned',
    asset: {
      id: 'ast-012',
      type: 'copy',
      name: 'Quixom Ads US cold outreach sequence (4-step)',
      ready: false,
    },
    budget: {
      id: 'bud-012',
      cost_monthly: 1800,
      approved: false,
      status: 'pending',
      spend_to_date: 0,
    },
    automation: {
      id: 'aut-012',
      trigger: 'cron',
      schedule: '0 15 * * 2,4',
      channel_api: 'outbound',
      retry_count: 3,
      fallback_channel: 'linkedin',
      next_run: '2026-06-23T15:00:00Z',
    },
    kpi: {
      metric: 'leads',
      target: 50,
      current: 0,
      result: 'pending',
    },
    responsible_role_id: 'clo',
    description: 'US outbound pilot targeting real estate marketing teams and local business associations in Texas. Leveraging LandveX Inc entity for credibility. 4-step sequence: intro → case study → demo offer → follow-up. Target 200 prospects.',
    alerts: [],
  },
]
