// ─── Payment OS Data Layer ───────────────────────────────────────────────────
// Enterprise-grade payment network architecture.
// 4 layers: Core Switch → Clearing → Ledger/Billing → Integrations
// Modeled after Stripe + Adyen + SAP + SWIFT — privately owned.

import { ENTITIES, type Entity } from '../org-graph/data'

// ─── ARCHITECTURE LAYERS ────────────────────────────────────────────────────

export type ArchLayer = 0 | 1 | 2 | 3

export interface ArchLayerMeta {
  layer: ArchLayer
  label: string
  subtitle: string
  description: string
  color: string
  components: SystemComponent[]
}

export type ComponentStatus = 'live' | 'deploying' | 'planned' | 'evaluating'
export type ComponentPriority = 'critical' | 'high' | 'medium' | 'low'

export interface SystemComponent {
  id: string
  name: string
  repo: string | null        // GitHub repo URL
  technology: string
  description: string
  status: ComponentStatus
  priority: ComponentPriority
  capabilities: string[]
  entityScope: string[]      // Which entities use this
  deployTarget: string       // AWS ECS, self-hosted, etc.
  notes: string
}

// ─── LAYER 0 — PAYMENT CORE (The Switch) ────────────────────────────────────

const LAYER_0_COMPONENTS: SystemComponent[] = [
  {
    id: 'hyperswitch',
    name: 'Hyperswitch',
    repo: 'juspay/hyperswitch',
    technology: 'Rust',
    description: 'Global payment switch. Smart routing across PSPs, retry logic, failover, multi-PSP orchestration. The closest thing to running Stripe/Adyen internally.',
    status: 'planned',
    priority: 'critical',
    capabilities: [
      'Smart routing (EU vs US vs Dubai)',
      'Retry logic + failover',
      'Multi-PSP orchestration',
      'PCI-compliant vaulting',
      'Observability built-in',
      'Webhook management',
      'Fraud detection hooks',
    ],
    entityScope: ['wavult-group', 'landvex-ab', 'landvex-inc', 'quixzoom-uab', 'quixzoom-inc'],
    deployTarget: 'AWS ECS eu-north-1 + us-east-1',
    notes: 'Layer 0 — ALL payment routing goes through this. Entity-aware routing based on customer jurisdiction.',
  },
  {
    id: 'payment-vault',
    name: 'Payment Vault (Locker)',
    repo: 'juspay/hyperswitch',
    technology: 'Rust',
    description: 'PCI-DSS compliant card vault. Tokenizes and stores payment credentials separately from the main system.',
    status: 'planned',
    priority: 'critical',
    capabilities: [
      'PCI DSS Level 1 separation',
      'Card tokenization',
      'Multi-tenant token storage',
      'HSM integration ready',
    ],
    entityScope: ['wavult-operations'],
    deployTarget: 'AWS ECS (isolated VPC)',
    notes: 'MUST be isolated from main infra. Separate VPC, separate DB, separate access controls.',
  },
]

// ─── LAYER 1 — CLEARING & SETTLEMENT ────────────────────────────────────────

const LAYER_1_COMPONENTS: SystemComponent[] = [
  {
    id: 'mojaloop-core',
    name: 'Mojaloop Settlement',
    repo: 'mojaloop/mojaloop',
    technology: 'Node.js (microservices)',
    description: 'Intercompany clearing and settlement engine. Handles money movement between Dubai ↔ EU ↔ US entities.',
    status: 'evaluating',
    priority: 'high',
    capabilities: [
      'Intercompany clearing',
      'Multi-currency settlement',
      'Net settlement calculation',
      'Position management',
      'Transfer lifecycle management',
      'Participant management (per entity)',
    ],
    entityScope: ['wavult-group', 'wavult-operations', 'landvex-ab', 'landvex-inc', 'quixzoom-uab'],
    deployTarget: 'AWS ECS + RDS',
    notes: 'Each Wavult entity = a "participant" in the settlement network. Dubai holding acts as the central settlement hub.',
  },
  {
    id: 'fx-engine',
    name: 'FX Engine',
    repo: null,
    technology: 'TypeScript',
    description: 'Multi-currency foreign exchange engine. Real-time rates, conversion, hedging rules.',
    status: 'planned',
    priority: 'high',
    capabilities: [
      'Real-time FX rates (ECB + market feeds)',
      'Automatic conversion at settlement',
      'FX exposure tracking per entity',
      'Hedging rule engine',
      'SEK/EUR/USD/AED corridors',
    ],
    entityScope: ['wavult-operations'],
    deployTarget: 'AWS Lambda + DynamoDB',
    notes: 'Critical for intercompany flows. All royalties/fees must be converted at documented market rates.',
  },
]

// ─── LAYER 2 — LEDGER & BILLING (Money & Truth) ────────────────────────────

const LAYER_2_COMPONENTS: SystemComponent[] = [
  {
    id: 'lago-billing',
    name: 'Lago Billing Engine',
    repo: 'getlago/lago',
    technology: 'Ruby + PostgreSQL',
    description: 'Usage-based billing engine. Stripe Billing replacement — gateway-agnostic, audit-trail-first.',
    status: 'planned',
    priority: 'critical',
    capabilities: [
      'Usage-based billing',
      'Subscription management',
      'Invoice generation',
      'Revenue recognition',
      'Multi-currency billing',
      'Audit trail (every event logged)',
      'Webhook → payment trigger',
    ],
    entityScope: ['landvex-ab', 'landvex-inc', 'quixzoom-uab', 'quixzoom-inc'],
    deployTarget: 'AWS ECS + RDS PostgreSQL',
    notes: 'Each entity has its own billing context. Feeds invoices into Hyperswitch for collection.',
  },
  {
    id: 'ledger-core',
    name: 'Double-Entry Ledger',
    repo: 'ledgersmb/ledgersmb',
    technology: 'Perl + PostgreSQL',
    description: 'Enterprise double-entry accounting ledger. Financial source of truth across all entities.',
    status: 'evaluating',
    priority: 'critical',
    capabilities: [
      'Double-entry bookkeeping',
      'Multi-currency ledger',
      'Multi-company chart of accounts',
      'Intercompany elimination',
      'Financial reporting (P&L, BS, CF)',
      'Audit-ready export',
      'Tax jurisdiction mapping',
    ],
    entityScope: ['wavult-group', 'wavult-operations', 'landvex-ab', 'landvex-inc', 'quixzoom-uab', 'quixzoom-inc'],
    deployTarget: 'AWS ECS + RDS',
    notes: 'THE source of truth. Every payment event from Hyperswitch creates a ledger entry. Intercompany flows auto-eliminate in consolidated view.',
  },
  {
    id: 'ic-billing',
    name: 'Intercompany Billing Automation',
    repo: null,
    technology: 'TypeScript',
    description: 'Auto-generates intercompany invoices: royalties (10%), service fees (cost+5%), management fees.',
    status: 'planned',
    priority: 'high',
    capabilities: [
      'Automatic royalty invoice generation',
      'Service fee calculation (cost + margin)',
      'Transfer pricing rate application',
      'Withholding tax calculation',
      'Invoice approval workflow',
      'Settlement trigger → Mojaloop',
    ],
    entityScope: ['wavult-group', 'wavult-operations'],
    deployTarget: 'AWS Lambda (cron)',
    notes: 'Runs quarterly for royalties, monthly for service fees. Must maintain transfer pricing documentation.',
  },
]

// ─── LAYER 3 — INTEGRATIONS (Out to the World) ─────────────────────────────

const LAYER_3_COMPONENTS: SystemComponent[] = [
  {
    id: 'stripe-connector',
    name: 'Stripe Connector',
    repo: null,
    technology: 'TypeScript',
    description: 'Direct Stripe integration for card payments, subscriptions, Connect payouts.',
    status: 'live',
    priority: 'critical',
    capabilities: [
      'Card payments (3DS2)',
      'SEPA Direct Debit (EU)',
      'ACH (US)',
      'Subscriptions',
      'Connect (multi-entity payouts)',
      'Invoicing',
    ],
    entityScope: ['landvex-ab', 'landvex-inc', 'quixzoom-uab', 'quixzoom-inc'],
    deployTarget: 'Hyperswitch connector',
    notes: 'Primary PSP. One Stripe account per entity. Routed via Hyperswitch.',
  },
  {
    id: 'adyen-connector',
    name: 'Adyen Connector',
    repo: null,
    technology: 'TypeScript',
    description: 'Adyen integration for EU-optimized payments. Higher auth rates in European markets.',
    status: 'planned',
    priority: 'medium',
    capabilities: [
      'EU card optimization',
      'iDEAL (NL)',
      'Bancontact (BE)',
      'Klarna (SE/EU)',
      'SEPA',
      'Local payment methods',
    ],
    entityScope: ['quixzoom-uab', 'landvex-ab'],
    deployTarget: 'Hyperswitch connector',
    notes: 'Secondary PSP for EU. Better auth rates for local European payment methods.',
  },
  {
    id: 'wise-connector',
    name: 'Wise Business API',
    repo: null,
    technology: 'TypeScript',
    description: 'Wise integration for intercompany transfers and contractor payouts. Low FX fees.',
    status: 'planned',
    priority: 'high',
    capabilities: [
      'Multi-currency transfers',
      'Batch payments',
      'Low FX rates (mid-market)',
      'Contractor payouts globally',
      'Intercompany wire transfers',
    ],
    entityScope: ['wavult-operations', 'wavult-group'],
    deployTarget: 'Direct API integration',
    notes: 'Primary rail for intercompany money movement. Cheaper than bank wires.',
  },
  {
    id: 'bank-api-connector',
    name: 'Bank API Layer',
    repo: null,
    technology: 'TypeScript',
    description: 'Direct bank integrations: SEB (SE), Emirates NBD (UAE), Mercury (US).',
    status: 'planned',
    priority: 'high',
    capabilities: [
      'Account balance sync',
      'Transaction feed (MT940/CAMT.053)',
      'Payment initiation (PSD2 / Open Banking)',
      'Reconciliation data',
      'Statement download',
    ],
    entityScope: ['landvex-ab', 'wavult-group', 'landvex-inc'],
    deployTarget: 'AWS Lambda + encrypted credentials',
    notes: 'SEB via PSD2/Open Banking API. Emirates NBD via corporate API. Mercury via REST API.',
  },
  {
    id: 'btcpay-connector',
    name: 'BTCPay Server',
    repo: 'btcpayserver/btcpayserver',
    technology: 'C#/.NET',
    description: 'Self-hosted cryptocurrency payment processor. Zero third-party dependency.',
    status: 'evaluating',
    priority: 'low',
    capabilities: [
      'Bitcoin + Lightning payments',
      'Self-hosted (sovereign)',
      'No KYC for receiving',
      'Auto-conversion to fiat',
      'Invoice generation',
    ],
    entityScope: ['wavult-group'],
    deployTarget: 'AWS ECS (dedicated)',
    notes: 'Dubai-legal. Fallback/alternative rail. Censorship-resistant. Evaluating for specific use cases.',
  },
  {
    id: 'erp-connector',
    name: 'ERP Governance Layer',
    repo: 'AdempiereFoundation/adempiere',
    technology: 'Java',
    description: 'Enterprise governance: multi-tenant, multi-company compliance and operations layer.',
    status: 'evaluating',
    priority: 'medium',
    capabilities: [
      'Multi-tenant operations',
      'Multi-company consolidation',
      'Tax compliance automation',
      'Procurement management',
      'Document management',
      'Workflow engine',
    ],
    entityScope: ['wavult-group', 'wavult-operations'],
    deployTarget: 'AWS ECS',
    notes: 'Evaluating iDempiere vs metasfresh. Needed for German-level compliance at scale.',
  },
]

// ─── ASSEMBLED LAYERS ───────────────────────────────────────────────────────

export const ARCH_LAYERS: ArchLayerMeta[] = [
  {
    layer: 0,
    label: 'Payment Core',
    subtitle: 'The Global Switch',
    description: 'ALL payment routing goes through here. Smart routing, PSP orchestration, PCI vaulting. This is your private Stripe/Adyen.',
    color: '#EF4444',
    components: LAYER_0_COMPONENTS,
  },
  {
    layer: 1,
    label: 'Clearing & Settlement',
    subtitle: 'Intercompany Money Movement',
    description: 'Clearing engine for intercompany flows. Dubai ↔ EU ↔ US settlement, FX conversion, position management.',
    color: '#F59E0B',
    components: LAYER_1_COMPONENTS,
  },
  {
    layer: 2,
    label: 'Ledger & Billing',
    subtitle: 'Money & Truth',
    description: 'Double-entry ledger + billing engine. Financial source of truth. Revenue recognition, audit trail, tax jurisdiction mapping.',
    color: '#8B5CF6',
    components: LAYER_2_COMPONENTS,
  },
  {
    layer: 3,
    label: 'Integrations',
    subtitle: 'Out to the World',
    description: 'PSP connectors (Stripe, Adyen), bank APIs (SEB, ENBD, Mercury), alternative rails (Wise, BTCPay), ERP governance.',
    color: '#10B981',
    components: LAYER_3_COMPONENTS,
  },
]

// ─── TRANSACTION FLOWS ──────────────────────────────────────────────────────

export type FlowDirection = 'inbound' | 'outbound' | 'intercompany'

export interface TransactionFlow {
  id: string
  name: string
  direction: FlowDirection
  description: string
  steps: FlowStep[]
  entities: string[]
  frequency: string
  estimatedVolume: string
}

export interface FlowStep {
  order: number
  system: string          // component id
  action: string
  entity: string          // entity id
  notes: string
}

export const TRANSACTION_FLOWS: TransactionFlow[] = [
  {
    id: 'tf-1',
    name: 'EU Customer Payment (SaaS)',
    direction: 'inbound',
    description: 'EU customer pays for SaaS subscription via card/SEPA. Routed to correct EU entity.',
    entities: ['quixzoom-uab', 'landvex-ab'],
    frequency: 'Daily',
    estimatedVolume: '€10K-100K/mo',
    steps: [
      { order: 1, system: 'hyperswitch', action: 'Receive payment intent', entity: 'wavult-operations', notes: 'Customer jurisdiction → EU routing' },
      { order: 2, system: 'hyperswitch', action: 'Route to Stripe EU or Adyen', entity: 'quixzoom-uab', notes: 'Smart routing: best auth rate' },
      { order: 3, system: 'stripe-connector', action: 'Process card/SEPA payment', entity: 'quixzoom-uab', notes: '3DS2 authentication if required' },
      { order: 4, system: 'lago-billing', action: 'Record revenue event', entity: 'quixzoom-uab', notes: 'Usage metering + invoice generation' },
      { order: 5, system: 'ledger-core', action: 'Debit bank, credit revenue', entity: 'quixzoom-uab', notes: 'Double-entry: EUR revenue recognized' },
    ],
  },
  {
    id: 'tf-2',
    name: 'US Customer Payment',
    direction: 'inbound',
    description: 'US customer pays via card/ACH. Routed to US C-Corp.',
    entities: ['landvex-inc', 'quixzoom-inc'],
    frequency: 'Daily',
    estimatedVolume: '$50K-500K/mo',
    steps: [
      { order: 1, system: 'hyperswitch', action: 'Receive payment intent', entity: 'wavult-operations', notes: 'Customer jurisdiction → US routing' },
      { order: 2, system: 'hyperswitch', action: 'Route to Stripe US', entity: 'landvex-inc', notes: 'US domestic processing' },
      { order: 3, system: 'stripe-connector', action: 'Process card/ACH payment', entity: 'landvex-inc', notes: 'Lower fees for domestic' },
      { order: 4, system: 'lago-billing', action: 'Record revenue event', entity: 'landvex-inc', notes: 'Invoice generation in USD' },
      { order: 5, system: 'ledger-core', action: 'Debit bank, credit revenue', entity: 'landvex-inc', notes: 'Double-entry: USD revenue recognized' },
    ],
  },
  {
    id: 'tf-3',
    name: 'Quarterly Royalty Payment',
    direction: 'intercompany',
    description: 'Subsidiary pays 10% IP royalty to Dubai holding. Transfer pricing documented.',
    entities: ['landvex-ab', 'wavult-group'],
    frequency: 'Quarterly',
    estimatedVolume: '10% of subsidiary revenue',
    steps: [
      { order: 1, system: 'ic-billing', action: 'Generate royalty invoice', entity: 'wavult-group', notes: 'Auto-calculated: 10% of Q revenue' },
      { order: 2, system: 'ledger-core', action: 'Record intercompany payable', entity: 'landvex-ab', notes: 'Debit royalty expense, credit IC payable' },
      { order: 3, system: 'mojaloop-core', action: 'Initiate settlement', entity: 'wavult-operations', notes: 'Net settlement across all entities' },
      { order: 4, system: 'fx-engine', action: 'Convert SEK → USD', entity: 'wavult-operations', notes: 'Market rate at settlement date' },
      { order: 5, system: 'wise-connector', action: 'Execute wire transfer', entity: 'wavult-operations', notes: 'LandveX AB → Wavult Group (Dubai)' },
      { order: 6, system: 'ledger-core', action: 'Confirm receipt, clear IC', entity: 'wavult-group', notes: 'Debit bank, credit royalty income (0% tax)' },
    ],
  },
  {
    id: 'tf-4',
    name: 'Monthly Service Fee',
    direction: 'intercompany',
    description: 'Subsidiaries pay operations service fee to Wavult Operations (Dubai).',
    entities: ['landvex-ab', 'landvex-inc', 'wavult-operations'],
    frequency: 'Monthly',
    estimatedVolume: 'Cost + 5% margin',
    steps: [
      { order: 1, system: 'ic-billing', action: 'Calculate service fee', entity: 'wavult-operations', notes: 'Allocated costs + 5% margin' },
      { order: 2, system: 'ic-billing', action: 'Generate invoice per subsidiary', entity: 'wavult-operations', notes: 'One invoice per entity' },
      { order: 3, system: 'mojaloop-core', action: 'Net against other IC flows', entity: 'wavult-operations', notes: 'Reduce actual wire count' },
      { order: 4, system: 'wise-connector', action: 'Execute net payment', entity: 'wavult-operations', notes: 'Single wire per entity' },
      { order: 5, system: 'ledger-core', action: 'Record in all entity ledgers', entity: 'wavult-operations', notes: 'Expense in subsidiary, income in ops' },
    ],
  },
  {
    id: 'tf-5',
    name: 'Contractor Payout',
    direction: 'outbound',
    description: 'Pay contractor/vendor globally via Wise.',
    entities: ['wavult-operations'],
    frequency: 'Monthly',
    estimatedVolume: '$5K-50K/mo',
    steps: [
      { order: 1, system: 'ledger-core', action: 'Record payable', entity: 'wavult-operations', notes: 'Approved invoice from contractor' },
      { order: 2, system: 'wise-connector', action: 'Execute payout', entity: 'wavult-operations', notes: 'Multi-currency at mid-market rate' },
      { order: 3, system: 'ledger-core', action: 'Clear payable, debit bank', entity: 'wavult-operations', notes: 'Auto-reconcile with bank feed' },
    ],
  },
  {
    id: 'tf-6',
    name: 'Annual Dividend Distribution',
    direction: 'intercompany',
    description: 'Subsidiary distributes dividend to Dubai holding after board approval.',
    entities: ['landvex-ab', 'wavult-group'],
    frequency: 'Annual',
    estimatedVolume: 'Board-approved amount',
    steps: [
      { order: 1, system: 'ledger-core', action: 'Board resolution recorded', entity: 'landvex-ab', notes: 'Requires formal board decision' },
      { order: 2, system: 'ic-billing', action: 'Generate dividend notice', entity: 'landvex-ab', notes: 'Including WHT calculation' },
      { order: 3, system: 'fx-engine', action: 'Lock FX rate', entity: 'wavult-operations', notes: 'SEK → USD conversion' },
      { order: 4, system: 'bank-api-connector', action: 'Execute bank wire', entity: 'landvex-ab', notes: 'SEB → Emirates NBD' },
      { order: 5, system: 'ledger-core', action: 'Record in both entities', entity: 'wavult-group', notes: 'Debit retained earnings (SE), credit dividend income (UAE, 0%)' },
    ],
  },
]

// ─── COMPLIANCE MAP ─────────────────────────────────────────────────────────

export interface ComplianceRequirement {
  id: string
  jurisdiction: string
  regulation: string
  applies_to: string[]
  status: 'compliant' | 'in-progress' | 'not-started' | 'not-applicable'
  notes: string
  deadline: string | null
}

export const COMPLIANCE_MAP: ComplianceRequirement[] = [
  { id: 'cr-1', jurisdiction: 'EU', regulation: 'PSD2 (Payment Services)', applies_to: ['quixzoom-uab', 'landvex-ab'], status: 'not-started', notes: 'Not required if using licensed PSP (Stripe/Adyen). Only needed if handling funds directly.', deadline: null },
  { id: 'cr-2', jurisdiction: 'EU', regulation: 'GDPR (Data Protection)', applies_to: ['quixzoom-uab', 'landvex-ab'], status: 'in-progress', notes: 'Payment data must stay in EU. Hyperswitch EU deployment required.', deadline: '2026-Q3' },
  { id: 'cr-3', jurisdiction: 'US', regulation: 'SOX Compliance', applies_to: ['landvex-inc', 'quixzoom-inc'], status: 'not-applicable', notes: 'Only for public companies. Not required yet.', deadline: null },
  { id: 'cr-4', jurisdiction: 'US', regulation: 'State Money Transmitter', applies_to: ['landvex-inc'], status: 'not-started', notes: 'Not required if using Stripe as payment facilitator. Required if handling funds directly.', deadline: null },
  { id: 'cr-5', jurisdiction: 'UAE', regulation: 'CBUAE Payment License', applies_to: ['wavult-group'], status: 'not-applicable', notes: 'Free zone holding — not processing payments directly. All processing via licensed PSPs.', deadline: null },
  { id: 'cr-6', jurisdiction: 'UAE', regulation: 'Economic Substance', applies_to: ['wavult-group', 'wavult-operations'], status: 'in-progress', notes: 'CRITICAL — must demonstrate real economic activity in UAE.', deadline: '2026-Q3' },
  { id: 'cr-7', jurisdiction: 'Global', regulation: 'PCI DSS', applies_to: ['wavult-operations'], status: 'not-started', notes: 'Required when self-hosting Hyperswitch vault. SAQ-D or Level 1 depending on volume.', deadline: '2026-Q4' },
  { id: 'cr-8', jurisdiction: 'Global', regulation: 'AML/KYC', applies_to: ['wavult-group', 'landvex-ab', 'landvex-inc'], status: 'in-progress', notes: 'KYC via PSP (Stripe). AML screening via sanctions list checking.', deadline: null },
  { id: 'cr-9', jurisdiction: 'SE→UAE', regulation: 'Transfer Pricing', applies_to: ['wavult-group', 'landvex-ab'], status: 'not-started', notes: 'Must document arms-length royalty rates (5-15%). Get TP advisor.', deadline: '2026-Q3' },
  { id: 'cr-10', jurisdiction: 'SE', regulation: 'CFC Rules', applies_to: ['wavult-group'], status: 'not-started', notes: 'CRITICAL — Dubai entity must not be controlled from Sweden after tax exit.', deadline: '2026-H2' },
]

// ─── DEPLOYMENT BLUEPRINT ───────────────────────────────────────────────────

export interface DeploymentNode {
  id: string
  region: string
  provider: string
  services: string[]       // component ids
  purpose: string
}

export const DEPLOYMENT_BLUEPRINT: DeploymentNode[] = [
  {
    id: 'deploy-eu',
    region: 'eu-north-1 (Stockholm)',
    provider: 'AWS',
    services: ['hyperswitch', 'lago-billing', 'ledger-core', 'stripe-connector', 'adyen-connector'],
    purpose: 'EU payment processing. GDPR-compliant. Serves SE/EU customers.',
  },
  {
    id: 'deploy-us',
    region: 'us-east-1 (Virginia)',
    provider: 'AWS',
    services: ['hyperswitch', 'lago-billing', 'stripe-connector'],
    purpose: 'US payment processing. Low latency for US customers.',
  },
  {
    id: 'deploy-uae',
    region: 'me-south-1 (Bahrain)',
    provider: 'AWS',
    services: ['mojaloop-core', 'fx-engine', 'ic-billing', 'wise-connector', 'ledger-core'],
    purpose: 'Intercompany settlement hub. Clearing engine. Treasury operations.',
  },
  {
    id: 'deploy-vault',
    region: 'eu-north-1 (Stockholm)',
    provider: 'AWS (Isolated VPC)',
    services: ['payment-vault'],
    purpose: 'PCI-DSS isolated card vault. No other services in this VPC.',
  },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getLayerComponents(layer: ArchLayer): SystemComponent[] {
  return ARCH_LAYERS.find(l => l.layer === layer)?.components ?? []
}

export function getComponentById(id: string): SystemComponent | undefined {
  return ARCH_LAYERS.flatMap(l => l.components).find(c => c.id === id)
}

export function getFlowsByDirection(dir: FlowDirection): TransactionFlow[] {
  return TRANSACTION_FLOWS.filter(f => f.direction === dir)
}

export function getSystemStats() {
  const all = ARCH_LAYERS.flatMap(l => l.components)
  return {
    total: all.length,
    live: all.filter(c => c.status === 'live').length,
    deploying: all.filter(c => c.status === 'deploying').length,
    planned: all.filter(c => c.status === 'planned').length,
    evaluating: all.filter(c => c.status === 'evaluating').length,
    critical: all.filter(c => c.priority === 'critical').length,
  }
}
