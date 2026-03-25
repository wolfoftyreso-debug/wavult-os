// ─── Entity & Relationship data model ─────────────────────────────────────────
// Extends existing EntitySwitcher / PeopleView data — never replaces.

export type EntityType = 'holding' | 'operations' | 'product' | 'legal' | 'system'
export type Jurisdiction = 'Dubai' | 'EU-LT' | 'US-DE' | 'US-TX' | 'SE' | 'Global'
export type ActiveStatus = 'live' | 'forming' | 'planned'

export interface Entity {
  id: string
  name: string
  shortName: string
  type: EntityType
  jurisdiction: Jurisdiction
  parent_entity_id: string | null
  description: string
  active_status: ActiveStatus
  color: string
  flag: string
  layer: number // 0 = root, 1 = group, 2 = regional, 3 = product
  metadata: Record<string, string>
}

export type RelationshipType = 'ownership' | 'control' | 'service' | 'licensing' | 'financial_flow'

export interface EntityRelationship {
  id: string
  from_entity_id: string
  to_entity_id: string
  type: RelationshipType
  label: string
  bidirectional?: boolean
}

export type RoleScope = 'group' | 'operations' | 'entity'

export interface RoleMapping {
  person: string
  initials: string
  color: string
  role_type: string
  scope: RoleScope
  entity_ids: string[]
  permissions: string[]
}

// ─── ENTITIES ──────────────────────────────────────────────────────────────────

export const ENTITIES: Entity[] = [
  // Layer 0 — Root holding
  {
    id: 'wavult-group',
    name: 'Wavult Group',
    shortName: 'WGH',
    type: 'holding',
    jurisdiction: 'Dubai',
    parent_entity_id: null,
    description: 'Dubai Free Zone IP Holding. Owns ALL software, trademarks, code and patents for the entire group. Licenses IP to operating entities via royalty agreements (5–15%). No direct operations.',
    active_status: 'forming',
    color: '#8B5CF6',
    flag: '🇦🇪',
    layer: 0,
    metadata: {
      'IP owner': 'QuiXzoom, LandveX, Optical Insight — ALL group IP',
      'Revenue model': 'IP royalty 5–15% from all subsidiaries',
      'Legal form': 'DMCC Free Zone LLC',
      'Tax rate': '0% on royalty income (UAE)',
      'Substance req': 'Board meetings, IP management in Dubai',
      'Bank': 'ENBD / Emirates NBD',
    },
  },
  // Layer 1 — Operations hub
  {
    id: 'wavult-operations',
    name: 'Wavult Operations',
    shortName: 'WOP',
    type: 'operations',
    jurisdiction: 'Dubai',
    parent_entity_id: 'wavult-group',
    description: 'Internal operations hub. Employs core team globally, runs Hypbit OS, handles billing and service delivery to all subsidiaries.',
    active_status: 'forming',
    color: '#0EA5E9',
    flag: '🇦🇪',
    layer: 1,
    metadata: {
      'Function': 'Internal service provider',
      'Revenue model': 'Service fee from subsidiaries',
      'Systems': 'Hypbit OS',
      'Team': 'All core team members',
    },
  },
  // Layer 2 — Product entities
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    shortName: 'QZ-EU',
    type: 'product',
    jurisdiction: 'EU-LT',
    parent_entity_id: 'wavult-group',
    description: 'EU entity for quiXzoom and Quixom Ads platform. EU data residency. GDPR-compliant. Operates in all EU markets.',
    active_status: 'planned',
    color: '#10B981',
    flag: '🇱🇹',
    layer: 2,
    metadata: {
      'Products': 'quiXzoom, Quixom Ads',
      'Market': 'EU, starting Sweden June 2026',
      'Legal form': 'UAB (Lithuanian LLC)',
      'Tax rate': '15% (lower than SE)',
    },
  },
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    shortName: 'QZ-US',
    type: 'product',
    jurisdiction: 'US-DE',
    parent_entity_id: 'wavult-group',
    description: 'US entity for quiXzoom platform. Delaware C-Corp, optimized for US investment and capital raising.',
    active_status: 'planned',
    color: '#22D3EE',
    flag: '🇺🇸',
    layer: 2,
    metadata: {
      'Products': 'quiXzoom (US market)',
      'Legal form': 'Delaware C-Corp',
      'Purpose': 'US capital raising + investment',
      'Market': 'US municipalities, commercial',
    },
  },
  {
    id: 'landvex-inc',
    name: 'LandveX Inc',
    shortName: 'LVX-US',
    type: 'product',
    jurisdiction: 'US-TX',
    parent_entity_id: 'wavult-group',
    description: 'US entity for LandveX. Texas LLC, targeting US municipalities, port authorities, federal infrastructure operators.',
    active_status: 'forming',
    color: '#F59E0B',
    flag: '🇺🇸',
    layer: 2,
    metadata: {
      'Products': 'LandveX (US), Optical Insight Cloud US',
      'Legal form': 'Texas LLC (Houston)',
      'Market': 'US municipalities, port authorities',
      'Bank': 'JPMorgan Chase / Bank of America',
    },
  },
  {
    id: 'landvex-ab',
    name: 'LandveX AB',
    shortName: 'SOMH',
    type: 'holding',
    jurisdiction: 'SE',
    parent_entity_id: 'wavult-group',
    description: 'Operativt SE-bolag (LandveX AB, org. 559141-7042). Planerad namnändring till LandveX AB. Hanterar EU/SE-försäljning av LandveX-plattformen. Äger INTE IP — licensierar från Dubai-holdingen.',
    active_status: 'forming',
    color: '#EC4899',
    flag: '🇸🇪',
    layer: 2,
    metadata: {
      'Legal name': 'LandveX AB',
      'Future name': 'LandveX AB (namnändring pågår)',
      'Org. nummer': '559141-7042',
      'Legal form': 'AB (Aktiebolag)',
      'Jurisdiction': 'Sweden (SE)',
      'IP owner': 'NEJ — licensieras från Wavult Group (Dubai)',
      'Roll': 'Operativt SE-bolag, EU-försäljning',
      'Produkter': 'LandveX SE/EU, Optical Insight Cloud EU',
      'Marknad': 'Sverige → Nederländerna → EU',
      'Lansering': 'Juni 2026 — svenska skärgården',
    },
  },
  // Layer 3 — Systems
  {
    id: 'hypbit-system',
    name: 'Hypbit OS',
    shortName: 'HYP',
    type: 'system',
    jurisdiction: 'Global',
    parent_entity_id: 'wavult-operations',
    description: 'Internal operating system for all Wavult entities. Quest engine, role-based access, financial flows, compliance tracking. NOT a legal entity.',
    active_status: 'live',
    color: '#A78BFA',
    flag: '⚙️',
    layer: 3,
    metadata: {
      'Type': 'Internal software system',
      'Deployed': 'AWS ECS eu-north-1 + CloudFront',
      'Modules': 'Dashboard, Projects, People, Finance, Tasks, Org Graph',
      'Auth': 'Role-based (admin → C-suite → operations)',
    },
  },
]

// ─── RELATIONSHIPS ─────────────────────────────────────────────────────────────

export const RELATIONSHIPS: EntityRelationship[] = [
  // Ownership
  { id: 'r1', from_entity_id: 'wavult-group', to_entity_id: 'wavult-operations', type: 'ownership', label: 'Owns 100%' },
  { id: 'r2', from_entity_id: 'wavult-group', to_entity_id: 'quixzoom-uab', type: 'ownership', label: 'Owns 100%' },
  { id: 'r3', from_entity_id: 'wavult-group', to_entity_id: 'quixzoom-inc', type: 'ownership', label: 'Owns 100%' },
  { id: 'r4', from_entity_id: 'wavult-group', to_entity_id: 'landvex-inc', type: 'ownership', label: 'Owns 100%' },
  { id: 'r5', from_entity_id: 'wavult-group', to_entity_id: 'landvex-ab', type: 'ownership', label: 'Owns 100%' },

  // IP licensing
  { id: 'r6', from_entity_id: 'wavult-group', to_entity_id: 'quixzoom-uab', type: 'licensing', label: 'IP license 5–15%' },
  { id: 'r7', from_entity_id: 'wavult-group', to_entity_id: 'quixzoom-inc', type: 'licensing', label: 'IP license 5–15%' },
  { id: 'r8', from_entity_id: 'wavult-group', to_entity_id: 'landvex-inc', type: 'licensing', label: 'IP license 5–15%' },
  { id: 'r9', from_entity_id: 'wavult-group', to_entity_id: 'landvex-ab', type: 'licensing', label: 'IP license 5–15%' },

  // Service
  { id: 'r10', from_entity_id: 'wavult-operations', to_entity_id: 'quixzoom-uab', type: 'service', label: 'Service fee' },
  { id: 'r11', from_entity_id: 'wavult-operations', to_entity_id: 'quixzoom-inc', type: 'service', label: 'Service fee' },
  { id: 'r12', from_entity_id: 'wavult-operations', to_entity_id: 'landvex-inc', type: 'service', label: 'Service fee' },
  { id: 'r13', from_entity_id: 'wavult-operations', to_entity_id: 'landvex-ab', type: 'service', label: 'Service fee' },

  // Financial flows (subsidiaries → Dubai)
  { id: 'r14', from_entity_id: 'quixzoom-uab', to_entity_id: 'wavult-group', type: 'financial_flow', label: 'Royalty + dividends' },
  { id: 'r15', from_entity_id: 'quixzoom-inc', to_entity_id: 'wavult-group', type: 'financial_flow', label: 'Royalty + dividends' },
  { id: 'r16', from_entity_id: 'landvex-inc', to_entity_id: 'wavult-group', type: 'financial_flow', label: 'Royalty + dividends' },
  { id: 'r17', from_entity_id: 'landvex-ab', to_entity_id: 'wavult-group', type: 'financial_flow', label: 'Royalty + dividends' },

  // Hypbit serves all
  { id: 'r18', from_entity_id: 'hypbit-system', to_entity_id: 'wavult-operations', type: 'service', label: 'Powers operations' },
  { id: 'r19', from_entity_id: 'hypbit-system', to_entity_id: 'quixzoom-uab', type: 'service', label: 'Ops system' },
  { id: 'r20', from_entity_id: 'hypbit-system', to_entity_id: 'landvex-ab', type: 'service', label: 'Ops system' },
]

// ─── ROLE MAPPINGS ─────────────────────────────────────────────────────────────

export const ROLE_MAPPINGS: RoleMapping[] = [
  {
    person: 'Erik Svensson',
    initials: 'ES',
    color: '#8B5CF6',
    role_type: 'Chairman & Group CEO',
    scope: 'group',
    entity_ids: ['wavult-group', 'wavult-operations', 'quixzoom-uab', 'quixzoom-inc', 'landvex-inc', 'landvex-ab'],
    permissions: ['full'],
  },
  {
    person: 'Leon Russo De Cerame',
    initials: 'LR',
    color: '#10B981',
    role_type: 'CEO – Operations',
    scope: 'operations',
    entity_ids: ['wavult-operations'],
    permissions: ['execution', 'strategy'],
  },
  {
    person: 'Winston Bjarnemark',
    initials: 'WB',
    color: '#3B82F6',
    role_type: 'CFO',
    scope: 'group',
    entity_ids: ['wavult-group', 'wavult-operations'],
    permissions: ['finance'],
  },
  {
    person: 'Dennis Bjarnemark',
    initials: 'DB',
    color: '#F59E0B',
    role_type: 'Board / Chief Legal',
    scope: 'group',
    entity_ids: ['wavult-group', 'landvex-ab', 'landvex-inc'],
    permissions: ['legal'],
  },
  {
    person: 'Johan Berglund',
    initials: 'JB',
    color: '#06B6D4',
    role_type: 'Group CTO',
    scope: 'group',
    entity_ids: ['wavult-operations', 'hypbit-system'],
    permissions: ['tech'],
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getEntityById(id: string): Entity | undefined {
  return ENTITIES.find(e => e.id === id)
}

export function getChildren(parentId: string): Entity[] {
  return ENTITIES.filter(e => e.parent_entity_id === parentId)
}

export function getRelationships(entityId: string): EntityRelationship[] {
  return RELATIONSHIPS.filter(r => r.from_entity_id === entityId || r.to_entity_id === entityId)
}

export function getRoleMappings(entityId: string): RoleMapping[] {
  return ROLE_MAPPINGS.filter(r => r.entity_ids.includes(entityId))
}
