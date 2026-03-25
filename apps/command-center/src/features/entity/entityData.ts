// ─── Entity-centric data layer ─────────────────────────────────────────────────
// ZERO duplication — all entity/relationship/role data imported from existing modules.
// This file only adds entity-specific finance, legal, ops, and systems records.

import { ENTITIES, RELATIONSHIPS, ROLE_MAPPINGS, getRoleMappings, getRelationships } from '../org-graph/data'
export { ENTITIES, RELATIONSHIPS, ROLE_MAPPINGS, getRoleMappings, getRelationships }

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'ok' | 'watch' | 'risk'

export interface EntityFinance {
  entity_id: string
  currency: string
  revenue_model: string
  estimated_mrr: string
  cashflow_status: RiskLevel
  intercompany_in: string[]   // entity_ids that pay this entity
  intercompany_out: string[]  // entity_ids this entity pays
  billing_notes: string
  open_items: { label: string; status: RiskLevel }[]
}

export interface EntityLegal {
  entity_id: string
  legal_form: string
  jurisdiction_detail: string
  incorporation_status: 'complete' | 'in-progress' | 'not-started'
  compliance_status: RiskLevel
  contracts: { name: string; status: RiskLevel; note: string }[]
  open_items: { label: string; status: RiskLevel }[]
}

export interface EntitySystem {
  entity_id: string
  systems: {
    name: string
    type: 'api' | 'frontend' | 'database' | 'infra' | 'ci'
    url?: string
    status: 'live' | 'building' | 'planned'
    note: string
  }[]
  pipelines: { name: string; status: 'passing' | 'failing' | 'pending'; last_run: string }[]
  open_items: { label: string; status: RiskLevel }[]
}

export interface EntityOps {
  entity_id: string
  active_work: { label: string; owner: string; status: 'active' | 'blocked' | 'done' | 'planned' }[]
  deliverables: { label: string; due: string; status: 'on-track' | 'at-risk' | 'done' }[]
  kpis: { label: string; value: string; delta?: string; good: boolean }[]
}

// ─── Finance data per entity ──────────────────────────────────────────────────

export const ENTITY_FINANCE: EntityFinance[] = [
  {
    entity_id: 'wavult-group',
    currency: 'AED',
    revenue_model: 'IP royalty 5–15% from all subsidiaries',
    estimated_mrr: '—  (pre-revenue)',
    cashflow_status: 'watch',
    intercompany_in: ['quixzoom-uab', 'quixzoom-inc', 'landvex-inc', 'landvex-ab', 'wavult-operations'],
    intercompany_out: [],
    billing_notes: 'WGH is ultimate IP owner. All subsidiaries pay royalty on revenue.',
    open_items: [
      { label: 'IP transfer: code + trademarks → WGH', status: 'risk' },
      { label: 'Transfer pricing policy — external advisor needed', status: 'risk' },
      { label: 'Emirates NBD account setup', status: 'watch' },
    ],
  },
  {
    entity_id: 'wavult-operations',
    currency: 'AED',
    revenue_model: 'Service fee from all subsidiaries (cost + margin)',
    estimated_mrr: '—  (internal billing only)',
    cashflow_status: 'watch',
    intercompany_in: ['quixzoom-uab', 'quixzoom-inc', 'landvex-inc', 'landvex-ab'],
    intercompany_out: ['wavult-group'],
    billing_notes: 'WOP employs core team. Charges service fee to all opcos. Pays royalty to WGH.',
    open_items: [
      { label: 'Intercompany service agreement drafts', status: 'watch' },
      { label: 'Team payroll structure (AED vs SEK)', status: 'watch' },
    ],
  },
  {
    entity_id: 'quixzoom-uab',
    currency: 'EUR',
    revenue_model: 'Zoomer payouts (commission) + Quixom Ads (B2B data leads)',
    estimated_mrr: '—  (pre-launch)',
    cashflow_status: 'ok',
    intercompany_in: [],
    intercompany_out: ['wavult-group', 'wavult-operations'],
    billing_notes: 'Launch Sverige juni 2026. Revenue phase 1: quiXzoom commissions. Phase 2: Quixom Ads.',
    open_items: [
      { label: 'Stripe EU merchant account', status: 'watch' },
      { label: 'Supabase EU GDPR compliance docs', status: 'ok' },
    ],
  },
  {
    entity_id: 'quixzoom-inc',
    currency: 'USD',
    revenue_model: 'US market quiXzoom commissions + Quixom Ads',
    estimated_mrr: '—  (planned)',
    cashflow_status: 'ok',
    intercompany_in: [],
    intercompany_out: ['wavult-group', 'wavult-operations'],
    billing_notes: 'Delaware C-Corp for US investment readiness. No revenue yet.',
    open_items: [
      { label: 'Delaware incorporation', status: 'watch' },
      { label: 'US Stripe + bank account', status: 'watch' },
    ],
  },
  {
    entity_id: 'landvex-inc',
    currency: 'USD',
    revenue_model: 'Enterprise SaaS — municipalities, port authorities, infrastructure owners',
    estimated_mrr: '—  (forming)',
    cashflow_status: 'watch',
    intercompany_in: [],
    intercompany_out: ['wavult-group', 'wavult-operations'],
    billing_notes: 'Texas LLC. B2G pricing model. Annual subscriptions + event-based alerts.',
    open_items: [
      { label: 'Texas LLC incorporation — Dennis driving', status: 'watch' },
      { label: 'US pilot customer pipeline', status: 'watch' },
    ],
  },
  {
    entity_id: 'landvex-ab',
    currency: 'SEK',
    revenue_model: 'Enterprise SaaS — Kommuner, Trafikverket, fastighetsägare',
    estimated_mrr: '—  (building)',
    cashflow_status: 'ok',
    intercompany_in: [],
    intercompany_out: ['wavult-group', 'wavult-operations'],
    billing_notes: 'LandveX AB är befintligt bolag (ex Sommarliden AB). Sverige-marknad. Pilot Q3 2026.',
    open_items: [
      { label: 'Bolags-konvertering till LandveX-varumärke', status: 'watch' },
      { label: 'Trafikverket / kommunpipeline', status: 'watch' },
    ],
  },
  {
    entity_id: 'hypbit-system',
    currency: 'SEK',
    revenue_model: 'Internkostnad — drivs av Wavult Operations',
    estimated_mrr: 'AWS ~$150/mån · Supabase free · CF free',
    cashflow_status: 'ok',
    intercompany_in: [],
    intercompany_out: ['wavult-operations'],
    billing_notes: 'Hypbit OS är internt. Kostnads-center under WOP.',
    open_items: [
      { label: 'AWS cost tracking per module', status: 'watch' },
    ],
  },
]

// ─── Legal data per entity ────────────────────────────────────────────────────

export const ENTITY_LEGAL: EntityLegal[] = [
  {
    entity_id: 'wavult-group',
    legal_form: 'Dubai Free Zone LLC',
    jurisdiction_detail: 'DIFC (Dubai International Financial Centre)',
    incorporation_status: 'in-progress',
    compliance_status: 'watch',
    contracts: [
      { name: 'IP Assignment Agreement', status: 'risk', note: 'Not executed. Code must transfer to WGH.' },
      { name: 'Shareholder Agreement', status: 'watch', note: 'Drafting in progress.' },
      { name: 'Trademark registrations', status: 'watch', note: 'quiXzoom, Hypbit, LandveX pending.' },
    ],
    open_items: [
      { label: 'DIFC incorporation completion', status: 'watch' },
      { label: 'IP transfer from Erik personally → WGH', status: 'risk' },
      { label: 'Transfer pricing policy', status: 'risk' },
    ],
  },
  {
    entity_id: 'wavult-operations',
    legal_form: 'Dubai Free Zone LLC',
    jurisdiction_detail: 'DIFC or Mainland (TBD)',
    incorporation_status: 'in-progress',
    compliance_status: 'watch',
    contracts: [
      { name: 'Intercompany Service Agreement (× 4)', status: 'watch', note: 'Service fee + SLA to all opcos.' },
      { name: 'Employment contracts', status: 'watch', note: 'Team formalization pending structure completion.' },
    ],
    open_items: [
      { label: 'Intercompany agreements drafting', status: 'watch' },
      { label: 'UAE employment law compliance', status: 'watch' },
    ],
  },
  {
    entity_id: 'quixzoom-uab',
    legal_form: 'UAB (Uždaroji akcinė bendrovė)',
    jurisdiction_detail: 'Litauen — EU entity for GDPR + VAT compliance',
    incorporation_status: 'not-started',
    compliance_status: 'ok',
    contracts: [
      { name: 'Royalty Agreement (WGH ← QZ-EU)', status: 'watch', note: 'Not drafted. Part of IC package.' },
      { name: 'Zoomer T&C', status: 'watch', note: 'Consumer-facing. Needs legal review.' },
      { name: 'GDPR Data Processing Policy', status: 'ok', note: 'Supabase EU — compliant infrastructure.' },
    ],
    open_items: [
      { label: 'UAB incorporation (Litauen)', status: 'watch' },
      { label: 'EU VAT registration', status: 'watch' },
    ],
  },
  {
    entity_id: 'quixzoom-inc',
    legal_form: 'Delaware C-Corp',
    jurisdiction_detail: 'United States — Delaware',
    incorporation_status: 'not-started',
    compliance_status: 'ok',
    contracts: [
      { name: 'Royalty Agreement (WGH ← QZ-US)', status: 'watch', note: 'Not drafted.' },
    ],
    open_items: [
      { label: 'Delaware C-Corp filing', status: 'watch' },
      { label: 'US EIN + bank account', status: 'watch' },
    ],
  },
  {
    entity_id: 'landvex-inc',
    legal_form: 'Texas LLC',
    jurisdiction_detail: 'United States — Texas',
    incorporation_status: 'in-progress',
    compliance_status: 'watch',
    contracts: [
      { name: 'Texas LLC Operating Agreement', status: 'watch', note: 'Dennis driving docs.' },
      { name: 'Municipal SaaS contract template', status: 'watch', note: 'B2G contract pending.' },
    ],
    open_items: [
      { label: 'Texas LLC filing — Dennis', status: 'watch' },
      { label: 'US pilot contract template', status: 'watch' },
    ],
  },
  {
    entity_id: 'landvex-ab',
    legal_form: 'Aktiebolag (AB)',
    jurisdiction_detail: 'Sverige — ex Sommarliden AB, konverteras',
    incorporation_status: 'complete',
    compliance_status: 'ok',
    contracts: [
      { name: 'Bolagskonvertering / namnbyte', status: 'watch', note: 'Sommarliden → LandveX AB.' },
      { name: 'Kommunavtal — pilotmall', status: 'watch', note: 'Ej klar.' },
      { name: 'Royalty Agreement (WGH ← LVX-SE)', status: 'watch', note: 'Ingår i IC-paketet.' },
    ],
    open_items: [
      { label: 'Namnbyte till LandveX AB formaliserat', status: 'watch' },
    ],
  },
  {
    entity_id: 'hypbit-system',
    legal_form: 'N/A — internprodukt',
    jurisdiction_detail: 'Ägs av Wavult Operations',
    incorporation_status: 'complete',
    compliance_status: 'ok',
    contracts: [],
    open_items: [],
  },
]

// ─── Systems data per entity ──────────────────────────────────────────────────

export const ENTITY_SYSTEMS: EntitySystem[] = [
  {
    entity_id: 'wavult-group',
    systems: [
      { name: 'Wavult Group Landing', type: 'frontend', status: 'building', note: 'wolfoftyreso-debug/wavult-group → CF Pages (token pending)' },
    ],
    pipelines: [
      { name: 'wavult-group / CF Pages Deploy', status: 'pending', last_run: 'Never — token pending' },
    ],
    open_items: [
      { label: 'CF Pages API token — Erik must create', status: 'risk' },
    ],
  },
  {
    entity_id: 'wavult-operations',
    systems: [
      { name: 'Hypbit API', type: 'api', url: 'https://api.bc.pixdrift.com', status: 'live', note: 'ECS eu-north-1 · hypbit cluster' },
      { name: 'Hypbit DB', type: 'database', status: 'live', note: 'Supabase znmxtnxx · EU West' },
      { name: 'Hypbit Command Center', type: 'frontend', url: 'http://localhost:5175', status: 'live', note: 'This app — local dev' },
    ],
    pipelines: [
      { name: 'Deploy API to ECS', status: 'passing', last_run: '14 min ago' },
      { name: 'TypeScript Check', status: 'passing', last_run: '1h ago' },
    ],
    open_items: [],
  },
  {
    entity_id: 'quixzoom-uab',
    systems: [
      { name: 'quiXzoom API', type: 'api', status: 'live', note: 'ECS cluster hypbit · quixzoom-api · task :2' },
      { name: 'quiXzoom Frontend', type: 'frontend', url: 'https://dewrtqzc20flx.cloudfront.net', status: 'live', note: 'S3 + CloudFront · quixzoom-app-prod' },
      { name: 'quiXzoom DB', type: 'database', status: 'live', note: 'Supabase lpeipzdm · EU West · 13 migrationer' },
      { name: 'quiXzoom Landing', type: 'frontend', status: 'building', note: 'wolfoftyreso-debug/quixzoom-landing → CF Pages' },
    ],
    pipelines: [
      { name: 'quixzoom-api / ECS Deploy', status: 'passing', last_run: '2h ago' },
      { name: 'quixzoom-landing / CF Pages', status: 'passing', last_run: '5h ago' },
    ],
    open_items: [
      { label: 'Supabase US East — Pro upgrade needed', status: 'watch' },
    ],
  },
  {
    entity_id: 'quixzoom-inc',
    systems: [
      { name: 'US API (ECS us-east-1)', type: 'api', status: 'planned', note: 'New ECS service needed in us-east-1' },
      { name: 'US Supabase instance', type: 'database', status: 'planned', note: 'Separate from EU — zero cross-region data' },
      { name: 'US S3 storage', type: 'infra', status: 'live', note: 'wavult-images-us-primary · us-east-1 · CRR to us-west-2' },
    ],
    pipelines: [],
    open_items: [
      { label: 'ECS us-east-1 service creation', status: 'watch' },
      { label: 'Supabase US East project (Pro plan)', status: 'watch' },
    ],
  },
  {
    entity_id: 'landvex-inc',
    systems: [
      { name: 'OI Cloud US', type: 'frontend', url: 'https://optical-insight-us.pages.dev', status: 'planned', note: 'CF Pages — US deployment' },
    ],
    pipelines: [],
    open_items: [
      { label: 'optical-insight-us CF Pages deploy', status: 'watch' },
    ],
  },
  {
    entity_id: 'landvex-ab',
    systems: [
      { name: 'OI Cloud EU', type: 'frontend', url: 'https://optical-insight-eu.pages.dev', status: 'building', note: 'wolfoftyreso-debug/optic-insights-web → CF Pages' },
      { name: 'OI API (ECS eu-north-1)', type: 'api', status: 'planned', note: 'Shares hypbit cluster' },
    ],
    pipelines: [
      { name: 'optic-insights-web / CF Pages', status: 'pending', last_run: 'Token pending' },
    ],
    open_items: [
      { label: 'optical-insight-eu CF Pages deploy', status: 'risk' },
      { label: 'CF Pages token — blocks all CF Pages deploys', status: 'risk' },
    ],
  },
  {
    entity_id: 'hypbit-system',
    systems: [
      { name: 'hypbit-api', type: 'api', url: 'https://api.bc.pixdrift.com', status: 'live', note: 'ECS eu-north-1' },
      { name: 'Supabase hypbit', type: 'database', status: 'live', note: 'znmxtnxx · 13 tables' },
      { name: 'S3 EU Primary', type: 'infra', status: 'live', note: 'wavult-images-eu-primary · CRR → eu-backup' },
      { name: 'CloudFront', type: 'infra', status: 'live', note: 'E2QUO7HIHWWP18 · quiXzoom' },
      { name: 'CF Pages (10 slots)', type: 'frontend', status: 'building', note: '10/10 used — cleanup needed' },
    ],
    pipelines: [
      { name: 'hypbit / Deploy API to ECS', status: 'passing', last_run: '14 min ago' },
      { name: 'hypbit / TypeScript Check', status: 'passing', last_run: '1h ago' },
    ],
    open_items: [
      { label: 'CF Pages slot cleanup (remove unused country variants)', status: 'risk' },
      { label: 'CF Pages API token creation', status: 'risk' },
    ],
  },
]

// ─── Ops data per entity ──────────────────────────────────────────────────────

export const ENTITY_OPS: EntityOps[] = [
  {
    entity_id: 'wavult-group',
    active_work: [
      { label: 'Dubai holding — DIFC incorporation', owner: 'Dennis', status: 'active' },
      { label: 'IP ownership transfer plan', owner: 'Dennis + Erik', status: 'active' },
      { label: 'Bolagsstruktur Dubai/EU/US', owner: 'Erik', status: 'active' },
    ],
    deliverables: [
      { label: 'WGH legal entity complete', due: 'Q2 2026', status: 'at-risk' },
      { label: 'Transfer pricing policy', due: 'Q2 2026', status: 'at-risk' },
    ],
    kpis: [
      { label: 'Entities incorporated', value: '1/6', delta: '', good: false },
      { label: 'IC agreements signed', value: '0/4', delta: '', good: false },
    ],
  },
  {
    entity_id: 'wavult-operations',
    active_work: [
      { label: 'Thailand Workcamp prep', owner: 'Leon', status: 'active' },
      { label: 'Team onboarding to Hypbit OS', owner: 'Johan', status: 'active' },
      { label: 'Q1 execution plan', owner: 'Leon', status: 'active' },
    ],
    deliverables: [
      { label: 'Thailand Workcamp', due: '11 april 2026', status: 'on-track' },
      { label: 'All systems live in Hypbit', due: 'april 2026', status: 'on-track' },
    ],
    kpis: [
      { label: 'Team active', value: '5/5', delta: '', good: true },
      { label: 'Systems live', value: '4/7', delta: '+1 this week', good: true },
    ],
  },
  {
    entity_id: 'quixzoom-uab',
    active_work: [
      { label: 'quiXzoom MVP — final features', owner: 'Erik', status: 'active' },
      { label: 'Zoomer onboarding flow', owner: 'Erik', status: 'active' },
      { label: 'Sverige GTM — skärgård juni 2026', owner: 'Erik + Leon', status: 'active' },
    ],
    deliverables: [
      { label: 'Sverige launch', due: 'Juni 2026', status: 'on-track' },
      { label: 'Netherlands expansion', due: 'Q1 2027', status: 'on-track' },
      { label: 'Zoomer app stores (iOS + Android)', due: 'Maj 2026', status: 'at-risk' },
    ],
    kpis: [
      { label: 'MVP progress', value: '72%', delta: '+4.2 pp/v', good: true },
      { label: 'Zoomers signed up', value: '0', delta: 'Pre-launch', good: false },
      { label: 'Markets ready', value: '1', delta: 'Sverige', good: true },
    ],
  },
  {
    entity_id: 'quixzoom-inc',
    active_work: [
      { label: 'Delaware incorporation', owner: 'Dennis', status: 'planned' },
    ],
    deliverables: [
      { label: 'US entity live', due: 'Q3 2026', status: 'on-track' },
    ],
    kpis: [
      { label: 'Status', value: 'Planned', delta: '', good: false },
    ],
  },
  {
    entity_id: 'landvex-inc',
    active_work: [
      { label: 'Texas LLC — Dennis driving docs', owner: 'Dennis', status: 'active' },
      { label: 'US municipal pilot pipeline', owner: 'Leon', status: 'planned' },
    ],
    deliverables: [
      { label: 'LandveX Inc incorporated', due: 'Q2 2026', status: 'at-risk' },
      { label: 'First US enterprise pilot', due: 'Q4 2026', status: 'on-track' },
    ],
    kpis: [
      { label: 'Status', value: 'Forming', delta: '', good: false },
      { label: 'Pilot prospects', value: '0', delta: 'Pre-pipeline', good: false },
    ],
  },
  {
    entity_id: 'landvex-ab',
    active_work: [
      { label: 'Optical Insight EU portal', owner: 'Erik', status: 'active' },
      { label: 'LandveX brand rollout (ex Sommarliden)', owner: 'Dennis', status: 'active' },
      { label: 'Kommunpipeline — pilot Q3 2026', owner: 'Leon', status: 'planned' },
    ],
    deliverables: [
      { label: 'OI EU portal live', due: 'April 2026', status: 'at-risk' },
      { label: 'First municipality pilot', due: 'Q3 2026', status: 'on-track' },
    ],
    kpis: [
      { label: 'OI progress', value: '35%', delta: '+2.1 pp/v', good: true },
      { label: 'Pilot customers', value: '0', delta: 'Pre-launch', good: false },
    ],
  },
  {
    entity_id: 'hypbit-system',
    active_work: [
      { label: 'Command Center v2 — live build', owner: 'Erik', status: 'active' },
      { label: 'ECS multi-service setup', owner: 'Johan', status: 'active' },
      { label: 'S3 multi-region replication', owner: 'Johan', status: 'done' },
    ],
    deliverables: [
      { label: 'All 6 modules live', due: 'April 2026', status: 'on-track' },
      { label: 'CF Pages token + deploy pipeline', due: 'ASAP', status: 'at-risk' },
    ],
    kpis: [
      { label: 'Infrastructure', value: '85%', delta: '+1.3 pp/v', good: true },
      { label: 'CF Pages slots free', value: '0/10', delta: 'Cleanup needed', good: false },
    ],
  },
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getEntityFinance(entityId: string): EntityFinance | undefined {
  return ENTITY_FINANCE.find(f => f.entity_id === entityId)
}
export function getEntityLegal(entityId: string): EntityLegal | undefined {
  return ENTITY_LEGAL.find(l => l.entity_id === entityId)
}
export function getEntitySystems(entityId: string): EntitySystem | undefined {
  return ENTITY_SYSTEMS.find(s => s.entity_id === entityId)
}
export function getEntityOps(entityId: string): EntityOps | undefined {
  return ENTITY_OPS.find(o => o.entity_id === entityId)
}
export function getEntityPeople(entityId: string) {
  return ROLE_MAPPINGS.filter(r => r.entity_ids.includes(entityId))
}
export function getEntityRelationships(entityId: string) {
  return RELATIONSHIPS.filter(r => r.from_entity_id === entityId || r.to_entity_id === entityId)
}
