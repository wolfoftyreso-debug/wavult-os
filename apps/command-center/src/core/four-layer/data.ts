// ─── Four-Layer System Data — Real Business Entities ─────────────────────────
// Every item passes full 4-layer validation. No exceptions.

import type { FourLayerEntity } from './model'

export const SYSTEM_ENTITIES: FourLayerEntity[] = [
  // ─── FINANCE ──────────────────────────────────────────────────────────
  {
    id: 'uninvoiced-work',
    title: 'Uninvoiced Work',
    definition: {
      description: 'Completed jobs not yet invoiced to customers',
      problem: 'Revenue earned but not billed — cash sits on the table',
      category: 'finance',
    },
    purpose: {
      importance: 'Delays revenue inflow, impacts cash flow and runway calculation',
      ifIgnored: 'Cash runway shortens. Work done for free. Team morale drops.',
      affectedKPI: 'Cash flow, Revenue MTD, Days Sales Outstanding',
    },
    method: {
      steps: ['Identify completed jobs marked "done"', 'Generate invoice in Fortnox', 'Send to customer', 'Track payment (3-30 days)'],
      dependencies: ['Job completion confirmation', 'Customer billing details', 'Fortnox integration'],
      rules: ['Invoice within 48h of job completion', 'Payment terms: 30 days', 'Follow up at day 14 if unpaid'],
      tools: ['Fortnox', 'Stripe Invoicing'],
    },
    execution: {
      status: 'active',
      owner: 'Winston',
      nextAction: 'Send 14 pending invoices',
      deadline: '2026-03-26 17:00',
      outcomeSEK: 126_000,
      outcomeDescription: 'Cash inflow within 3-5 business days for direct debit, 30 days for invoice',
    },
    createdAt: '2026-03-20', updatedAt: '2026-03-26',
  },
  {
    id: 'us-bank-setup',
    title: 'US Bank Account Setup',
    definition: {
      description: 'Opening a US business bank account for LandveX Inc (Texas LLC)',
      problem: 'Cannot accept US customer payments without US banking',
      category: 'finance',
    },
    purpose: {
      importance: 'Blocks entire US revenue stream. No bank = no Stripe = no payments.',
      ifIgnored: 'US market launch delayed indefinitely. Pipeline value at risk: 570,000 SEK.',
      affectedKPI: 'US Revenue, Pipeline conversion, Market expansion',
    },
    method: {
      steps: ['Get EIN from IRS (SS-4 filed)', 'Receive EIN letter', 'Apply at Mercury/Chase with EIN + articles', 'Setup Stripe US entity'],
      dependencies: ['EIN approval', 'Texas LLC registration complete', 'Registered agent active'],
      rules: ['Must be US-domiciled entity', 'Non-resident director acceptable at Mercury', 'Chase requires in-person visit'],
      tools: ['Mercury', 'Chase', 'Stripe'],
    },
    execution: {
      status: 'blocked',
      owner: 'Winston',
      nextAction: 'Wait for EIN letter, then apply at Mercury',
      deadline: '2026-04-30',
      outcomeSEK: 570_000,
      outcomeDescription: 'Unlocks US pipeline: 2 deals worth 570K SEK currently blocked',
    },
    createdAt: '2026-03-01', updatedAt: '2026-03-26',
  },
  {
    id: 'monthly-burn-optimization',
    title: 'Monthly Burn Rate Optimization',
    definition: {
      description: 'Current monthly burn is 52,100 SEK against 67,400 SEK revenue',
      problem: 'Net margin is thin (15,300 SEK/mo). One bad month = cash negative.',
      category: 'finance',
    },
    purpose: {
      importance: 'Extends runway from 4.9 months to 7+ months if burn drops 20%',
      ifIgnored: 'One revenue dip pushes company cash-negative. Existential risk.',
      affectedKPI: 'Runway, Burn rate, Net margin',
    },
    method: {
      steps: ['Audit all subscriptions', 'Renegotiate AWS reservations', 'Defer non-critical hires', 'Move to annual billing where cheaper'],
      dependencies: ['Current cost breakdown', 'AWS usage data'],
      rules: ['No cuts that reduce revenue capacity', 'Maintain core team', 'Savings must be sustainable'],
      tools: ['Fortnox', 'AWS Cost Explorer'],
    },
    execution: {
      status: 'pending',
      owner: 'Winston',
      nextAction: 'Complete cost audit and propose 3 savings',
      deadline: '2026-04-10',
      outcomeSEK: 10_000,
      outcomeDescription: 'Target: reduce burn by 10K/mo → runway extends to 7+ months',
    },
    createdAt: '2026-03-25', updatedAt: '2026-03-26',
  },

  // ─── SALES ────────────────────────────────────────────────────────────
  {
    id: 'landvex-beta-launch',
    title: 'LandveX Beta Launch — Swedish Market',
    definition: {
      description: 'Launch LandveX to first 3 paying municipalities in Sweden',
      problem: 'Zero paying customers. All revenue is projected, not real.',
      category: 'sales',
    },
    purpose: {
      importance: 'First real revenue validates the business model. Without this, everything is theoretical.',
      ifIgnored: 'Company has no product-market fit evidence. Investor conversations impossible.',
      affectedKPI: 'Revenue, Customer count, Conversion rate',
    },
    method: {
      steps: ['Finalize beta with 3 test municipalities', 'Onboard first customer (handholding)', 'Collect feedback week 1', 'Invoice first month', 'Iterate based on usage data'],
      dependencies: ['Product ready for beta', 'Customer onboarding flow', 'Stripe SE active'],
      rules: ['Max 3 beta customers', 'Free first month, then paid', 'Weekly check-ins'],
      tools: ['LandveX platform', 'Stripe', 'Fortnox'],
    },
    execution: {
      status: 'active',
      owner: 'Erik',
      nextAction: 'Schedule demo with Stockholms kommun (confirmed interest)',
      deadline: '2026-04-15',
      outcomeSEK: 180_000,
      outcomeDescription: 'First contract: 180K SEK ARR. Validates GTM and pricing.',
    },
    createdAt: '2026-03-15', updatedAt: '2026-03-26',
  },
  {
    id: 'pipeline-goteborgs-hamn',
    title: 'Göteborgs Hamn AB — Proposal',
    definition: {
      description: 'Infrastructure monitoring deal with Göteborgs Hamn',
      problem: 'Large deal in qualification — needs proposal to advance',
      category: 'sales',
    },
    purpose: {
      importance: '250K SEK deal. Validates port authority market segment.',
      ifIgnored: 'Deal goes cold. Port authority segment unproven.',
      affectedKPI: 'Pipeline value, Win rate, Average deal size',
    },
    method: {
      steps: ['Send tailored proposal', 'Technical demo with ops team', 'Procurement review', 'Contract negotiation'],
      dependencies: ['Product demo environment ready', 'Pricing approved', 'Reference customer (beta)'],
      rules: ['Government procurement rules apply', 'Proposal must include SLA', 'Budget approval needed Q2'],
      tools: ['LandveX platform', 'Proposal template'],
    },
    execution: {
      status: 'active',
      owner: 'Erik',
      nextAction: 'Send proposal by Friday',
      deadline: '2026-03-28',
      outcomeSEK: 250_000,
      outcomeDescription: 'Close in Q2. 250K ARR + reference for port authority vertical.',
    },
    createdAt: '2026-03-18', updatedAt: '2026-03-26',
  },

  // ─── OPERATIONS ───────────────────────────────────────────────────────
  {
    id: 'fortnox-integration',
    title: 'Fortnox Accounting Integration',
    definition: {
      description: 'Connect Fortnox to Wavult OS for real-time financial data',
      problem: 'Finance module shows static data. No live sync. Manual entry.',
      category: 'operations',
    },
    purpose: {
      importance: 'Without live data, Finance module is useless. Decisions based on stale numbers.',
      ifIgnored: 'Manual bookkeeping errors. Late invoices. Wrong cash position.',
      affectedKPI: 'Data accuracy, Time to invoice, Cash flow visibility',
    },
    method: {
      steps: ['Get Fortnox API credentials', 'Build sync adapter (invoices, payments, accounts)', 'Map chart of accounts', 'Test with LandveX AB data', 'Deploy'],
      dependencies: ['Fortnox subscription active', 'API access approved', 'Chart of accounts defined'],
      rules: ['Sync every 15 minutes', 'Retry on failure', 'Alert on sync error'],
      tools: ['Fortnox API v3', 'Wavult OS server', 'PostgreSQL'],
    },
    execution: {
      status: 'pending',
      owner: 'Johan',
      nextAction: 'Request Fortnox API credentials from Winston',
      deadline: '2026-05-15',
      outcomeSEK: null,
      outcomeDescription: 'Live finance data in Wavult OS. Eliminates manual entry.',
    },
    createdAt: '2026-03-20', updatedAt: '2026-03-26',
  },
  {
    id: 'transfer-pricing-docs',
    title: 'Transfer Pricing Documentation',
    definition: {
      description: 'Create arms-length documentation for intercompany royalty rates (5-15%)',
      problem: 'No TP documentation = royalty structure can be challenged by tax authorities',
      category: 'operations',
    },
    purpose: {
      importance: 'Without TP docs, the entire Dubai holding structure is at legal risk',
      ifIgnored: 'Tax authorities can reclassify royalties as profit. Full tax liability + penalties.',
      affectedKPI: 'Compliance, Tax exposure, Holding structure viability',
    },
    method: {
      steps: ['Engage TP advisor', 'Benchmark royalty rates vs market', 'Document IP valuation', 'Create intercompany agreements', 'Annual review process'],
      dependencies: ['Dubai FZCO registered', 'IP ownership transferred', 'Advisor selected'],
      rules: ['Rates must be 5-15% (market range)', 'Documentation must be current', 'Annual review mandatory'],
      tools: ['TP advisor firm', 'Legal templates'],
    },
    execution: {
      status: 'pending',
      owner: 'Dennis',
      nextAction: 'Get 3 quotes from TP advisory firms',
      deadline: '2026-Q3',
      outcomeSEK: null,
      outcomeDescription: 'Bulletproof TP documentation. Protects 0% structure.',
    },
    createdAt: '2026-03-10', updatedAt: '2026-03-26',
  },

  // ─── PEOPLE ───────────────────────────────────────────────────────────
  {
    id: 'erik-overload',
    title: 'CEO Capacity Overload',
    definition: {
      description: 'Erik at 95% utilization with 4 active items. Single point of failure.',
      problem: 'One person holds GTM, product decisions, and investor relations',
      category: 'people',
    },
    purpose: {
      importance: 'If Erik is unavailable for 2 weeks, all active deals and launch stall',
      ifIgnored: 'Burnout risk. Single point of failure. No delegation structure.',
      affectedKPI: 'Team velocity, Risk exposure, Execution speed',
    },
    method: {
      steps: ['Identify delegatable work', 'Assign GTM execution to Leon', 'Move finance oversight to Winston', 'Define decision rights per role'],
      dependencies: ['Leon available for GTM', 'Winston has Fortnox access'],
      rules: ['Erik retains: strategy, investor relations, key accounts', 'Everything else: delegate or drop'],
      tools: ['Wavult OS (this system)'],
    },
    execution: {
      status: 'active',
      owner: 'Erik',
      nextAction: 'Delegate 2 items to Leon by Friday',
      deadline: '2026-03-28',
      outcomeSEK: null,
      outcomeDescription: 'Erik at 70% utilization. Sustainable. No single point of failure.',
    },
    createdAt: '2026-03-25', updatedAt: '2026-03-26',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getEntitiesByCategory(category: string): FourLayerEntity[] {
  return SYSTEM_ENTITIES.filter(e => e.definition.category === category)
}

export function getActiveEntities(): FourLayerEntity[] {
  return SYSTEM_ENTITIES.filter(e => e.execution.status !== 'done')
}

export function getTotalOutcomeSEK(): number {
  return SYSTEM_ENTITIES.reduce((s, e) => s + (e.execution.outcomeSEK ?? 0), 0)
}

export function getBlockedEntities(): FourLayerEntity[] {
  return SYSTEM_ENTITIES.filter(e => e.execution.status === 'blocked')
}

export function getOverdueEntities(): FourLayerEntity[] {
  const now = new Date().toISOString().slice(0, 10)
  return SYSTEM_ENTITIES.filter(e => e.execution.deadline <= now && e.execution.status !== 'done')
}
