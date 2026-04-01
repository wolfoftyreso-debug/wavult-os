// ─── Market Expansion System — data layer ──────────────────────────────────────

export type SiteStatus = 'planned' | 'setup' | 'active' | 'scaling' | 'failing'
export type RolloutStage = 'planned' | 'setup' | 'launch' | 'scale' | 'mature'
export type ProductType = 'quixzoom' | 'quixom-ads' | 'landvex' | 'wavult'

export interface MarketSite {
  id: string
  name: string
  country: string
  countryCode: string   // ISO 2-letter, used for flag emoji lookup
  region: 'EU' | 'NA' | 'ME' | 'APAC' | 'LATAM'
  status: SiteStatus
  entity_id: string     // links to ENTITIES in org-graph/data.ts
  product_type: ProductType
  responsible_role_id: string  // links to COMMAND_CHAIN
  stage: RolloutStage

  strategy: {
    purpose: string
    market_reasoning: string
  }

  kpis: {
    revenue_target: number        // monthly USD
    revenue_current: number
    leads_target: number
    leads_current: number
    conversion_target: number     // percent
    conversion_current: number
    growth_target: number         // MoM percent
    growth_current: number
  }

  marketing: {
    campaigns: Array<{
      id: string
      name: string
      channel: 'paid-social' | 'seo' | 'outbound' | 'partnership' | 'event'
      status: 'planned' | 'active' | 'paused'
      budget_monthly: number
      spend_to_date: number
      leads_generated: number
    }>
  }

  operations: {
    team_size: number
    capacity_pct: number    // 0-100
    notes: string
  }

  legal: {
    entity_linkage: string
    contracts: Array<{ name: string; status: 'draft' | 'signed' | 'expired' }>
  }

  rollout: {
    stages: Array<{
      stage: RolloutStage
      completed: boolean
      checklist: Array<{ item: string; done: boolean }>
      kpi_targets: string
      responsible_role_id: string
    }>
  }

  alerts: Array<{
    id: string
    kpi: string
    severity: 'warning' | 'critical'
    message: string
    escalated: boolean
    action_required: string
  }>

  // Geographic coords for positioning (approx, not real GPS)
  x_pct: number   // 0-100, left-to-right world position
  y_pct: number   // 0-100, top-to-bottom world position
}

// ─── Status & product colors ───────────────────────────────────────────────────

export const SITE_STATUS_COLOR: Record<SiteStatus, string> = {
  planned:  '#6B7280',
  setup:    '#F59E0B',
  active:   '#10B981',
  scaling:  '#3B82F6',
  failing:  '#EF4444',
}

export const PRODUCT_COLOR: Record<ProductType, string> = {
  'quixzoom':   '#2563EB',
  'quixom-ads': '#0EA5E9',
  'landvex':    '#10B981',
  'wavult':     '#F59E0B',
}

// ─── Alert engine ─────────────────────────────────────────────────────────────

export function getSiteAlerts(site: MarketSite): MarketSite['alerts'] {
  const alerts = [...site.alerts]
  if (site.kpis.revenue_current < site.kpis.revenue_target * 0.5 && site.status === 'active') {
    alerts.push({
      id: 'auto-rev',
      kpi: 'revenue',
      severity: 'critical',
      message: 'Revenue below 50% of target',
      escalated: false,
      action_required: 'Review pricing and channel mix',
    })
  }
  if (site.kpis.conversion_current < site.kpis.conversion_target * 0.6 && site.status === 'active') {
    alerts.push({
      id: 'auto-conv',
      kpi: 'conversion',
      severity: 'warning',
      message: 'Conversion rate lagging',
      escalated: false,
      action_required: 'Review funnel — check landing page quality',
    })
  }
  return alerts
}

// ─── Seed data ────────────────────────────────────────────────────────────────

export const MARKET_SITES: MarketSite[] = [
  // ── 1. Sweden ────────────────────────────────────────────────────────────────
  {
    id: 'site-se',
    name: 'Sweden',
    country: 'Sweden',
    countryCode: 'SE',
    region: 'EU',
    status: 'active',
    entity_id: 'quixzoom-uab',
    product_type: 'quixzoom',
    responsible_role_id: 'ceo-ops',
    stage: 'launch',
    strategy: {
      purpose: 'First market. Build the zoomer network in Scandinavia.',
      market_reasoning: 'High smartphone penetration, outdoor culture, strong creator economy. Regulatory environment favorable for image capture.',
    },
    kpis: {
      revenue_target: 15000,
      revenue_current: 8200,
      leads_target: 200,
      leads_current: 142,
      conversion_target: 6.0,
      conversion_current: 4.2,
      growth_target: 25,
      growth_current: 18,
    },
    marketing: {
      campaigns: [
        {
          id: 'se-c1',
          name: 'QuixZoom SE — Paid Social',
          channel: 'paid-social',
          status: 'active',
          budget_monthly: 3000,
          spend_to_date: 4800,
          leads_generated: 88,
        },
        {
          id: 'se-c2',
          name: 'SE Organic SEO',
          channel: 'seo',
          status: 'active',
          budget_monthly: 500,
          spend_to_date: 700,
          leads_generated: 54,
        },
      ],
    },
    operations: {
      team_size: 3,
      capacity_pct: 72,
      notes: 'Core team on-ground in Stockholm. Onboarding 2 more zoomers in Q2.',
    },
    legal: {
      entity_linkage: 'QuiXzoom UAB (EU-LT)',
      contracts: [
        { name: 'Zoomer platform agreement', status: 'signed' },
        { name: 'Data processing agreement (GDPR)', status: 'signed' },
      ],
    },
    rollout: {
      stages: [
        {
          stage: 'planned',
          completed: true,
          checklist: [
            { item: 'Market research completed', done: true },
            { item: 'Entity identified (QuiXzoom UAB)', done: true },
          ],
          kpi_targets: 'N/A — planning phase',
          responsible_role_id: 'group-ceo',
        },
        {
          stage: 'setup',
          completed: true,
          checklist: [
            { item: 'Payment rails active', done: true },
            { item: 'App configured for SE market', done: true },
            { item: 'Legal review complete', done: true },
          ],
          kpi_targets: 'N/A — setup phase',
          responsible_role_id: 'clo',
        },
        {
          stage: 'launch',
          completed: false,
          checklist: [
            { item: 'First 100 zoomers onboarded', done: true },
            { item: 'First paying customers', done: true },
            { item: '200 leads / month', done: false },
            { item: 'Revenue target 15k USD/mo', done: false },
          ],
          kpi_targets: 'Rev: 15k/mo · Leads: 200 · Conv: 6%',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'scale',
          completed: false,
          checklist: [
            { item: 'Gothenburg & Malmö coverage', done: false },
            { item: '500+ active zoomers', done: false },
          ],
          kpi_targets: 'Rev: 40k/mo · Growth: 30% MoM',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'mature',
          completed: false,
          checklist: [
            { item: 'Market self-sustaining', done: false },
          ],
          kpi_targets: 'Rev: 80k/mo · Churn <5%',
          responsible_role_id: 'ceo-ops',
        },
      ],
    },
    alerts: [
      {
        id: 'se-a1',
        kpi: 'leads',
        severity: 'warning',
        message: 'Lead volume 29% below monthly target',
        escalated: false,
        action_required: 'Increase paid social budget or add outbound channel',
      },
    ],
    x_pct: 52,
    y_pct: 22,
  },

  // ── 2. Netherlands ───────────────────────────────────────────────────────────
  {
    id: 'site-nl',
    name: 'Netherlands',
    country: 'Netherlands',
    countryCode: 'NL',
    region: 'EU',
    status: 'planned',
    entity_id: 'quixzoom-uab',
    product_type: 'quixzoom',
    responsible_role_id: 'ceo-ops',
    stage: 'planned',
    strategy: {
      purpose: 'Q1 2027 expansion target. High urban density, camera-friendly culture.',
      market_reasoning: 'Amsterdam + Rotterdam are ideal density markets. Cycling infrastructure generates high demand for street-level image capture. Strong creative economy.',
    },
    kpis: {
      revenue_target: 0,
      revenue_current: 0,
      leads_target: 0,
      leads_current: 0,
      conversion_target: 0,
      conversion_current: 0,
      growth_target: 0,
      growth_current: 0,
    },
    marketing: {
      campaigns: [],
    },
    operations: {
      team_size: 0,
      capacity_pct: 0,
      notes: 'No team yet. Q1 2027 target start.',
    },
    legal: {
      entity_linkage: 'QuiXzoom UAB (EU-LT) — covers NL under EU license',
      contracts: [],
    },
    rollout: {
      stages: [
        {
          stage: 'planned',
          completed: false,
          checklist: [
            { item: 'Market research', done: false },
            { item: 'Partner identification', done: false },
            { item: 'Entity check (EU coverage ok)', done: true },
          ],
          kpi_targets: 'N/A — planning phase',
          responsible_role_id: 'group-ceo',
        },
        {
          stage: 'setup',
          completed: false,
          checklist: [
            { item: 'NL payment rails', done: false },
            { item: 'Local compliance review', done: false },
          ],
          kpi_targets: 'N/A — setup phase',
          responsible_role_id: 'clo',
        },
        {
          stage: 'launch',
          completed: false,
          checklist: [
            { item: 'First 50 zoomers', done: false },
            { item: 'Initial marketing live', done: false },
          ],
          kpi_targets: 'Rev: 8k/mo · Leads: 100',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'scale',
          completed: false,
          checklist: [
            { item: '200+ zoomers', done: false },
          ],
          kpi_targets: 'Rev: 25k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'mature',
          completed: false,
          checklist: [
            { item: 'Self-sustaining market', done: false },
          ],
          kpi_targets: 'Rev: 60k/mo',
          responsible_role_id: 'ceo-ops',
        },
      ],
    },
    alerts: [],
    x_pct: 48,
    y_pct: 26,
  },

  // ── 3. UAE / Dubai ───────────────────────────────────────────────────────────
  {
    id: 'site-ae',
    name: 'UAE / Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    region: 'ME',
    status: 'setup',
    entity_id: 'wavult-group',
    product_type: 'landvex',
    responsible_role_id: 'group-ceo',
    stage: 'setup',
    strategy: {
      purpose: 'Landvex enterprise anchor. Smart city government contracts.',
      market_reasoning: 'Dubai Smart City initiative, massive infrastructure investment. Government RFPs in progress. Regulatory sandboxes favor new tech.',
    },
    kpis: {
      revenue_target: 30000,
      revenue_current: 0,
      leads_target: 50,
      leads_current: 12,
      conversion_target: 8.0,
      conversion_current: 0,
      growth_target: 0,
      growth_current: 0,
    },
    marketing: {
      campaigns: [
        {
          id: 'ae-c1',
          name: 'Dubai Smart City Outbound',
          channel: 'outbound',
          status: 'active',
          budget_monthly: 1500,
          spend_to_date: 2200,
          leads_generated: 12,
        },
      ],
    },
    operations: {
      team_size: 2,
      capacity_pct: 40,
      notes: 'Erik + Leon managing. Government meeting pipeline active.',
    },
    legal: {
      entity_linkage: 'Wavult Group (Dubai Free Zone LLC)',
      contracts: [
        { name: 'Smart city pilot MOU', status: 'draft' },
        { name: 'Wavult Group operating license', status: 'signed' },
      ],
    },
    rollout: {
      stages: [
        {
          stage: 'planned',
          completed: true,
          checklist: [
            { item: 'Market identification', done: true },
            { item: 'Government contact list built', done: true },
          ],
          kpi_targets: 'N/A',
          responsible_role_id: 'group-ceo',
        },
        {
          stage: 'setup',
          completed: false,
          checklist: [
            { item: 'First government meeting', done: true },
            { item: 'MOU / pilot agreement signed', done: false },
            { item: 'Local partner identified', done: false },
            { item: 'Entity banking active', done: true },
          ],
          kpi_targets: 'Leads: 50 · 1 signed pilot',
          responsible_role_id: 'group-ceo',
        },
        {
          stage: 'launch',
          completed: false,
          checklist: [
            { item: 'First paid contract', done: false },
            { item: 'Pilot deployment live', done: false },
          ],
          kpi_targets: 'Rev: 30k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'scale',
          completed: false,
          checklist: [
            { item: '3+ government contracts', done: false },
          ],
          kpi_targets: 'Rev: 100k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'mature',
          completed: false,
          checklist: [
            { item: 'Regional MENA expansion', done: false },
          ],
          kpi_targets: 'Rev: 200k/mo',
          responsible_role_id: 'ceo-ops',
        },
      ],
    },
    alerts: [],
    x_pct: 62,
    y_pct: 38,
  },

  // ── 4. USA / Texas ───────────────────────────────────────────────────────────
  {
    id: 'site-us-tx',
    name: 'USA / Texas',
    country: 'United States',
    countryCode: 'US',
    region: 'NA',
    status: 'planned',
    entity_id: 'landvex-inc',
    product_type: 'landvex',
    responsible_role_id: 'clo',
    stage: 'planned',
    strategy: {
      purpose: 'US infrastructure market entry via Texas LLC.',
      market_reasoning: 'US municipalities and port authorities represent the largest Landvex TAM. Texas LLC structure enables federal contracting eligibility.',
    },
    kpis: {
      revenue_target: 0,
      revenue_current: 0,
      leads_target: 0,
      leads_current: 0,
      conversion_target: 0,
      conversion_current: 0,
      growth_target: 0,
      growth_current: 0,
    },
    marketing: {
      campaigns: [],
    },
    operations: {
      team_size: 0,
      capacity_pct: 0,
      notes: 'Entity forming. No team on-ground yet.',
    },
    legal: {
      entity_linkage: 'Landvex Inc (US-TX)',
      contracts: [
        { name: 'Texas LLC formation docs', status: 'draft' },
      ],
    },
    rollout: {
      stages: [
        {
          stage: 'planned',
          completed: false,
          checklist: [
            { item: 'Texas LLC formation', done: false },
            { item: 'US bank account', done: false },
            { item: 'Federal contracting registration (SAM.gov)', done: false },
          ],
          kpi_targets: 'N/A — planning',
          responsible_role_id: 'clo',
        },
        {
          stage: 'setup',
          completed: false,
          checklist: [
            { item: 'US sales rep hired', done: false },
            { item: 'First RFP responses submitted', done: false },
          ],
          kpi_targets: 'Leads: 20',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'launch',
          completed: false,
          checklist: [
            { item: 'First paid US contract', done: false },
          ],
          kpi_targets: 'Rev: 50k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'scale',
          completed: false,
          checklist: [
            { item: '5+ municipalities', done: false },
          ],
          kpi_targets: 'Rev: 200k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'mature',
          completed: false,
          checklist: [
            { item: 'National expansion', done: false },
          ],
          kpi_targets: 'Rev: 500k/mo',
          responsible_role_id: 'ceo-ops',
        },
      ],
    },
    alerts: [],
    x_pct: 20,
    y_pct: 36,
  },

  // ── 5. Lithuania ─────────────────────────────────────────────────────────────
  {
    id: 'site-lt',
    name: 'Lithuania',
    country: 'Lithuania',
    countryCode: 'LT',
    region: 'EU',
    status: 'active',
    entity_id: 'quixzoom-uab',
    product_type: 'wavult',
    responsible_role_id: 'ceo-ops',
    stage: 'scale',
    strategy: {
      purpose: 'EU operational backbone. Hypbit internal + external.',
      market_reasoning: 'UAB structure enables cost-efficient EU operations. Strong tech talent pool. Strategic for EU data residency compliance.',
    },
    kpis: {
      revenue_target: 8000,
      revenue_current: 4100,
      leads_target: 120,
      leads_current: 88,
      conversion_target: 5.0,
      conversion_current: 3.8,
      growth_target: 20,
      growth_current: 15,
    },
    marketing: {
      campaigns: [
        {
          id: 'lt-c1',
          name: 'LT Hypbit Outbound',
          channel: 'outbound',
          status: 'active',
          budget_monthly: 800,
          spend_to_date: 1200,
          leads_generated: 55,
        },
        {
          id: 'lt-c2',
          name: 'LT Partnership Network',
          channel: 'partnership',
          status: 'active',
          budget_monthly: 400,
          spend_to_date: 600,
          leads_generated: 33,
        },
      ],
    },
    operations: {
      team_size: 4,
      capacity_pct: 65,
      notes: 'Core ops team. Scaling to 6 post-Thailand workcamp.',
    },
    legal: {
      entity_linkage: 'QuiXzoom UAB (EU-LT)',
      contracts: [
        { name: 'UAB operating agreement', status: 'signed' },
        { name: 'EU data residency DPA', status: 'signed' },
        { name: 'Team employment contracts', status: 'signed' },
      ],
    },
    rollout: {
      stages: [
        {
          stage: 'planned',
          completed: true,
          checklist: [
            { item: 'UAB structure selected', done: true },
            { item: 'Tax optimization confirmed', done: true },
          ],
          kpi_targets: 'N/A',
          responsible_role_id: 'group-ceo',
        },
        {
          stage: 'setup',
          completed: true,
          checklist: [
            { item: 'UAB incorporated', done: true },
            { item: 'Banking operational', done: true },
            { item: 'Team hired', done: true },
          ],
          kpi_targets: 'N/A',
          responsible_role_id: 'clo',
        },
        {
          stage: 'launch',
          completed: true,
          checklist: [
            { item: 'First paying clients', done: true },
            { item: 'Hypbit deployed internally', done: true },
          ],
          kpi_targets: 'Rev: 2k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'scale',
          completed: false,
          checklist: [
            { item: 'External client onboarding', done: true },
            { item: '8k MRR target', done: false },
            { item: 'Team expanded to 6', done: false },
          ],
          kpi_targets: 'Rev: 8k/mo · Leads: 120',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'mature',
          completed: false,
          checklist: [
            { item: 'EU market fully served from LT', done: false },
          ],
          kpi_targets: 'Rev: 20k/mo',
          responsible_role_id: 'ceo-ops',
        },
      ],
    },
    alerts: [],
    x_pct: 55,
    y_pct: 25,
  },

  // ── 6. Thailand ──────────────────────────────────────────────────────────────
  {
    id: 'site-th',
    name: 'Thailand',
    country: 'Thailand',
    countryCode: 'TH',
    region: 'APAC',
    status: 'setup',
    entity_id: 'quixzoom-uab',
    product_type: 'quixzoom',
    responsible_role_id: 'ceo-ops',
    stage: 'setup',
    strategy: {
      purpose: 'APAC pilot. Workcamp team on-ground from April 11, 2026.',
      market_reasoning: 'High tourist volume creates natural demand for location imagery. Strong mobile-first culture. Cost-efficient team base for APAC operations.',
    },
    kpis: {
      revenue_target: 5000,
      revenue_current: 0,
      leads_target: 30,
      leads_current: 0,
      conversion_target: 4.0,
      conversion_current: 0,
      growth_target: 0,
      growth_current: 0,
    },
    marketing: {
      campaigns: [
        {
          id: 'th-c1',
          name: 'TH Pre-launch Social',
          channel: 'paid-social',
          status: 'planned',
          budget_monthly: 1000,
          spend_to_date: 0,
          leads_generated: 0,
        },
      ],
    },
    operations: {
      team_size: 0,
      capacity_pct: 0,
      notes: 'Workcamp team arrives April 11, 2026. Week 1: team building + training. Week 2+: product rollout prep.',
    },
    legal: {
      entity_linkage: 'QuiXzoom UAB (EU-LT) — operating license TBD',
      contracts: [
        { name: 'Workcamp venue contract', status: 'signed' },
        { name: 'TH operating license', status: 'draft' },
      ],
    },
    rollout: {
      stages: [
        {
          stage: 'planned',
          completed: true,
          checklist: [
            { item: 'Workcamp dates confirmed (Apr 11)', done: true },
            { item: 'Venue booked', done: true },
            { item: 'Team travel arranged', done: true },
          ],
          kpi_targets: 'N/A',
          responsible_role_id: 'group-ceo',
        },
        {
          stage: 'setup',
          completed: false,
          checklist: [
            { item: 'Team on-ground (Apr 11)', done: false },
            { item: 'Week 1 training complete', done: false },
            { item: 'TH operating license obtained', done: false },
            { item: 'First 10 zoomers recruited', done: false },
          ],
          kpi_targets: 'Leads: 10 · Zoomers: 10',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'launch',
          completed: false,
          checklist: [
            { item: 'App live in TH market', done: false },
            { item: 'First paying bookings', done: false },
          ],
          kpi_targets: 'Rev: 5k/mo · Leads: 30',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'scale',
          completed: false,
          checklist: [
            { item: 'Bangkok + Phuket coverage', done: false },
          ],
          kpi_targets: 'Rev: 15k/mo',
          responsible_role_id: 'ceo-ops',
        },
        {
          stage: 'mature',
          completed: false,
          checklist: [
            { item: 'APAC hub operational', done: false },
          ],
          kpi_targets: 'Rev: 40k/mo',
          responsible_role_id: 'ceo-ops',
        },
      ],
    },
    alerts: [],
    x_pct: 76,
    y_pct: 46,
  },
]
