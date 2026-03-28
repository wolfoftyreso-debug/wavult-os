// ─── Causal OS — Model Data ────────────────────────────────────────────────────

import type { CausalVariable, CashFlowEntry, Scenario, DecisionOption } from './causalTypes'

export const CAUSAL_VARIABLES: CausalVariable[] = [
  {
    id: 'zoomer_count',
    label: 'Antal zoomers (aktiva)',
    category: 'capacity',
    unit: 'count',
    baseValue: 0,
    currentValue: 0,
    affects: [
      { targetId: 'missions_per_month', multiplier: 15, direction: 1, description: '15 uppdrag/zoomer/mån' }
    ]
  },
  {
    id: 'missions_per_month',
    label: 'Uppdrag per månad',
    category: 'revenue',
    unit: 'count',
    baseValue: 0,
    currentValue: 0,
    affects: [
      { targetId: 'monthly_revenue', multiplier: 25, direction: 1, description: '25 SEK/uppdrag (Wavults 25%)' }
    ]
  },
  {
    id: 'landvex_customers',
    label: 'Landvex-kunder',
    category: 'revenue',
    unit: 'count',
    baseValue: 0,
    currentValue: 0,
    affects: [
      { targetId: 'monthly_revenue', multiplier: 9000, direction: 1, description: '9 000 SEK/kund/mån (snitt)' }
    ]
  },
  {
    id: 'monthly_revenue',
    label: 'Månadsintäkt',
    category: 'revenue',
    unit: 'SEK',
    baseValue: 0,
    currentValue: 0,
    affects: [
      { targetId: 'cash_balance', multiplier: 1, direction: 1, description: 'Intäkt → kassan' }
    ]
  },
  {
    id: 'monthly_fixed_cost',
    label: 'Fasta kostnader/mån',
    category: 'cost',
    unit: 'SEK',
    baseValue: 30000,
    currentValue: 30000,
    affects: [
      { targetId: 'monthly_burn', multiplier: 1, direction: 1, description: 'Del av total burn' }
    ]
  },
  {
    id: 'monthly_salary_cost',
    label: 'Lönekostnad/mån',
    category: 'cost',
    unit: 'SEK',
    baseValue: 0,
    currentValue: 0,
    affects: [
      { targetId: 'monthly_burn', multiplier: 1, direction: 1, description: 'Del av total burn' }
    ]
  },
  {
    id: 'monthly_marketing_spend',
    label: 'Marknadsföringsbudget/mån',
    category: 'cost',
    unit: 'SEK',
    baseValue: 15000,
    currentValue: 15000,
    affects: [
      { targetId: 'zoomer_count', multiplier: 0.00333, direction: 1, description: '1 zoomer per 300 SEK spend' },
      { targetId: 'monthly_burn', multiplier: 1, direction: 1, description: 'Del av total burn' }
    ]
  },
  {
    id: 'monthly_burn',
    label: 'Total burn/mån',
    category: 'cost',
    unit: 'SEK',
    baseValue: 45000,
    currentValue: 45000,
    affects: [
      { targetId: 'cash_balance', multiplier: -1, direction: 1, description: 'Burn minskar kassan' },
      { targetId: 'runway_days', multiplier: -0.0222, direction: 1, description: 'Runway = kassa/burn' }
    ]
  },
  {
    id: 'cash_balance',
    label: 'Kassa (aktuell)',
    category: 'liquidity',
    unit: 'SEK',
    baseValue: 500000,
    currentValue: 500000,
    affects: [
      { targetId: 'runway_days', multiplier: 0.0222, direction: 1, description: 'Runway = kassa / (burn/30)' }
    ]
  },
  {
    id: 'runway_days',
    label: 'Runway',
    category: 'liquidity',
    unit: 'days',
    baseValue: 333,
    currentValue: 333,
    affects: []
  },
  {
    id: 'cac_zoomer',
    label: 'CAC (zoomer)',
    category: 'cost',
    unit: 'SEK',
    baseValue: 300,
    currentValue: 300,
    affects: []
  },
  {
    id: 'cac_landvex',
    label: 'CAC (Landvex-kund)',
    category: 'cost',
    unit: 'SEK',
    baseValue: 25000,
    currentValue: 25000,
    affects: []
  }
]

export const BASE_CASH_FLOW_ENTRIES: CashFlowEntry[] = [
  {
    date: '2026-04-01',
    category: 'subscription',
    label: 'AWS Infrastruktur',
    amount: -1320,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'certain'
  },
  {
    date: '2026-04-01',
    category: 'subscription',
    label: 'Supabase',
    amount: -500,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'certain'
  },
  {
    date: '2026-04-01',
    category: 'subscription',
    label: 'Mapbox + verktyg',
    amount: -500,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'certain'
  },
  {
    date: '2026-04-01',
    category: 'subscription',
    label: 'OpenClaw (Bernt)',
    amount: -1000,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'certain'
  },
  {
    date: '2026-04-11',
    category: 'other',
    label: 'Thailand Workcamp',
    amount: -80000,
    isRecurring: false,
    confidence: 'certain'
  },
  {
    date: '2026-04-01',
    category: 'other',
    label: 'Juridik (bolagsregistreringar)',
    amount: -15000,
    isRecurring: false,
    confidence: 'probable'
  },
  {
    date: '2026-06-01',
    category: 'revenue',
    label: 'QuiXzoom lansering (estimat)',
    amount: 5000,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'speculative'
  },
  {
    date: '2026-09-01',
    category: 'revenue',
    label: 'Landvex pilot-kund 1',
    amount: 4900,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'speculative'
  },
  {
    date: '2026-10-01',
    category: 'revenue',
    label: 'Landvex pilot-kund 2',
    amount: 4900,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    confidence: 'speculative'
  },
]

export const PRESET_SCENARIOS: Scenario[] = [
  { id: 'base', name: 'Basfall', adjustments: [] },
  {
    id: 'bull',
    name: 'Optimistiskt',
    adjustments: [
      { variableId: 'zoomer_count', deltaPercent: 100 },
      { variableId: 'landvex_customers', deltaPercent: 200 },
      { variableId: 'monthly_marketing_spend', deltaPercent: 50 },
    ],
  },
  {
    id: 'bear',
    name: 'Pessimistiskt',
    adjustments: [
      { variableId: 'monthly_fixed_cost', deltaPercent: 30 },
      { variableId: 'monthly_marketing_spend', deltaPercent: -50 },
    ],
  },
]

export const DECISION_OPTIONS: DecisionOption[] = [
  {
    id: 'hire-salesperson',
    label: 'Anställ säljare',
    description: 'Heltidssäljare för Landvex B2G. Lön 45 000 SEK/mån.',
    impacts: [
      { variableId: 'monthly_salary_cost', deltaPercent: 100, timeframe: 'Omedelbart' },
      { variableId: 'landvex_customers', deltaPercent: 20, timeframe: '6 månader' },
    ],
  },
  {
    id: 'double-marketing',
    label: 'Dubbla marketing-budget',
    description: 'Zoomer-rekrytering från 15k till 30k/mån.',
    impacts: [
      { variableId: 'monthly_marketing_spend', deltaPercent: 100, timeframe: 'Omedelbart' },
      { variableId: 'zoomer_count', deltaPercent: 80, timeframe: '60 dagar' },
    ],
  },
  {
    id: 'cut-fixed-costs',
    label: 'Skär fasta kostnader 20%',
    description: 'Optimera infra och verktyg, spara ca 6 000 SEK/mån.',
    impacts: [
      { variableId: 'monthly_fixed_cost', deltaPercent: -20, timeframe: 'Omedelbart' },
    ],
  },
]
