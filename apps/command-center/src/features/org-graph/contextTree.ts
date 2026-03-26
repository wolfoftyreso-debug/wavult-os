// ─── Contextual tree builder ───────────────────────────────────────────────────
// Generates the top→role→down view for a given user role.
// Reads from existing data.ts — never duplicates or overwrites.

import { RoleId } from '../../shared/auth/RoleContext'
import { ENTITIES, ROLE_MAPPINGS, Entity, RoleMapping } from './data'

// ─── Node types ───────────────────────────────────────────────────────────────

export type NodeType = 'entity' | 'role' | 'team' | 'individual' | 'system'
export type NodePosition = 'above' | 'self' | 'below' | 'lateral'

export interface TreeNode {
  id: string
  type: NodeType
  position: NodePosition   // relative to current user's role
  level: number            // 0 = root, higher = deeper
  label: string
  sublabel: string
  color: string
  flag: string
  status?: string
  isCurrentUser: boolean
  isOnPath: boolean        // on the direct chain from root → self
  expandable: boolean
  expanded?: boolean
  entityId?: string        // link back to entity for drill-down
  roleMapping?: RoleMapping
  children?: TreeNode[]
  metadata?: Record<string, string>
}

// ─── Role → entity mapping ────────────────────────────────────────────────────
// Which entities each role primarily operates in (for upward path traversal)

const ROLE_PRIMARY_ENTITY: Record<RoleId, string> = {
  'admin':      'wavult-group',
  'group-ceo':  'wavult-group',
  'ceo-ops':    'wavult-operations',
  'cfo':        'wavult-operations',
  'cto':        'wavult-operations',
  'clo':        'wavult-group',
  'cpo':        'wavult-operations',
}

// ─── Role → subordinate definitions ───────────────────────────────────────────
// What each role can see below themselves

interface SubNode {
  id: string
  type: NodeType
  label: string
  sublabel: string
  color: string
  flag: string
  status: string
  expandable: boolean
  entityId?: string
  children?: SubNode[]
  metadata?: Record<string, string>
}

const ROLE_SUBORDINATES: Partial<Record<RoleId, SubNode[]>> = {
  'admin': [], // admin sees everything — built dynamically

  'group-ceo': [
    {
      id: 'sub-ceo-strategy', type: 'team', label: 'Group Strategy',
      sublabel: 'Capital · Structure · Direction', color: '#8B5CF6', flag: '🧭',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-ceo-s1', type: 'individual', label: 'Erik Svensson', sublabel: 'Chairman & Group CEO', color: '#8B5CF6', flag: '👑', status: 'active', expandable: false },
        { id: 'sub-ceo-s2', type: 'individual', label: 'Dennis Bjarnemark', sublabel: 'Board / Chief Legal', color: '#F59E0B', flag: '⚖️', status: 'active', expandable: false },
      ],
    },
    {
      id: 'sub-ceo-ent', type: 'team', label: 'Portfolio Entities',
      sublabel: 'All 6 entities under governance', color: '#0EA5E9', flag: '🏗',
      status: 'active', expandable: true,
      children: [
        { id: 'wavult-operations', type: 'entity', label: 'Wavult Operations', sublabel: 'Dubai · Operations hub', color: '#0EA5E9', flag: '🇦🇪', status: 'forming', expandable: true, entityId: 'wavult-operations' },
        { id: 'quixzoom-uab', type: 'entity', label: 'QuiXzoom UAB', sublabel: 'Litauen · EU product', color: '#10B981', flag: '🇱🇹', status: 'planned', expandable: false, entityId: 'quixzoom-uab' },
        { id: 'quixzoom-inc', type: 'entity', label: 'QuiXzoom Inc', sublabel: 'Delaware · US product', color: '#22D3EE', flag: '🇺🇸', status: 'planned', expandable: false, entityId: 'quixzoom-inc' },
        { id: 'landvex-inc', type: 'entity', label: 'LandveX Inc', sublabel: 'Texas · US enterprise', color: '#F59E0B', flag: '🇺🇸', status: 'forming', expandable: false, entityId: 'landvex-inc' },
        { id: 'landvex-ab', type: 'entity', label: 'LandveX AB', sublabel: 'Sweden · EU enterprise', color: '#EC4899', flag: '🇸🇪', status: 'live', expandable: false, entityId: 'landvex-ab' },
      ],
    },
  ],

  'ceo-ops': [
    {
      id: 'sub-ops-team', type: 'team', label: 'Core Team',
      sublabel: 'Daily operations & delivery', color: '#10B981', flag: '👥',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-ops-t1', type: 'individual', label: 'Leon Russo De Cerame', sublabel: 'CEO Operations', color: '#10B981', flag: '⚙️', status: 'active', expandable: false },
        { id: 'sub-ops-t2', type: 'individual', label: 'Winston Bjarnemark', sublabel: 'CFO', color: '#3B82F6', flag: '💰', status: 'active', expandable: false },
        { id: 'sub-ops-t3', type: 'individual', label: 'Johan Berglund', sublabel: 'Group CTO', color: '#06B6D4', flag: '🧠', status: 'active', expandable: false },
      ],
    },
    {
      id: 'sub-ops-sys', type: 'system', label: 'Hypbit OS',
      sublabel: 'Internal operating system', color: '#A78BFA', flag: '⚙️',
      status: 'live', expandable: true, entityId: 'hypbit-system',
      metadata: { 'Deployed': 'AWS ECS eu-north-1', 'Modules': '6 core modules' },
      children: [
        { id: 'sub-ops-sys-db', type: 'system', label: 'Dashboard', sublabel: 'Role-based overview', color: '#A78BFA', flag: '📊', status: 'live', expandable: false },
        { id: 'sub-ops-sys-cg', type: 'system', label: 'Corporate Graph', sublabel: 'Entity map & relations', color: '#A78BFA', flag: '🏗', status: 'live', expandable: false },
        { id: 'sub-ops-sys-fi', type: 'system', label: 'Transactions', sublabel: 'Financial flows', color: '#A78BFA', flag: '↕', status: 'live', expandable: false },
        { id: 'sub-ops-sys-pr', type: 'system', label: 'Projects & KPI', sublabel: 'Roadmap tracking', color: '#A78BFA', flag: '🚀', status: 'live', expandable: false },
      ],
    },
  ],

  'cfo': [
    {
      id: 'sub-cfo-flows', type: 'team', label: 'Financial Flows',
      sublabel: 'Revenue · Service fees · Royalty', color: '#3B82F6', flag: '💸',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-cfo-f1', type: 'system', label: 'QuiXzoom UAB → WGH', sublabel: 'EU royalty + dividends', color: '#10B981', flag: '↑', status: 'planned', expandable: false },
        { id: 'sub-cfo-f2', type: 'system', label: 'LandveX AB → WGH', sublabel: 'SE royalty + dividends', color: '#EC4899', flag: '↑', status: 'forming', expandable: false },
        { id: 'sub-cfo-f3', type: 'system', label: 'LandveX Inc → WGH', sublabel: 'US royalty + dividends', color: '#F59E0B', flag: '↑', status: 'forming', expandable: false },
        { id: 'sub-cfo-f4', type: 'system', label: 'WOP service fee', sublabel: 'All entities → Operations', color: '#0EA5E9', flag: '→', status: 'planned', expandable: false },
      ],
    },
    {
      id: 'sub-cfo-budget', type: 'team', label: 'Budget Control',
      sublabel: 'AWS · Supabase · Cloudflare · Stripe', color: '#3B82F6', flag: '📊',
      status: 'active', expandable: false,
      metadata: { 'AWS ECS': 'eu-north-1 — hypbit-api, quixzoom-api', 'Supabase': '2 projects — EU West', 'CF Pages': '10/10 slots (limit reached)' },
    },
  ],

  'cto': [
    {
      id: 'sub-cto-infra', type: 'team', label: 'Infrastructure',
      sublabel: 'AWS · ECS · S3 · CloudFront', color: '#06B6D4', flag: '☁️',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-cto-i1', type: 'system', label: 'hypbit-api', sublabel: 'ECS eu-north-1 · api.bc.pixdrift.com', color: '#06B6D4', flag: '🟢', status: 'live', expandable: false },
        { id: 'sub-cto-i2', type: 'system', label: 'quixzoom-api', sublabel: 'ECS cluster hypbit · task :2', color: '#06B6D4', flag: '🟢', status: 'live', expandable: false },
        { id: 'sub-cto-i3', type: 'system', label: 'S3 multi-region', sublabel: 'EU + US primary + backup · CRR', color: '#06B6D4', flag: '🪣', status: 'live', expandable: false },
        { id: 'sub-cto-i4', type: 'system', label: 'CloudFront', sublabel: 'dewrtqzc20flx · quiXzoom frontend', color: '#06B6D4', flag: '🌐', status: 'live', expandable: false },
      ],
    },
    {
      id: 'sub-cto-db', type: 'team', label: 'Database Layer',
      sublabel: 'Supabase · PostgreSQL', color: '#3ECF8E', flag: '🗄️',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-cto-db1', type: 'system', label: 'quixzoom-v2', sublabel: 'lpeipzdm · EU West · 13 migrations', color: '#3ECF8E', flag: '🟢', status: 'live', expandable: false },
        { id: 'sub-cto-db2', type: 'system', label: 'hypbit', sublabel: 'znmxtnxx · EU West · internal OS', color: '#3ECF8E', flag: '🟢', status: 'live', expandable: false },
        { id: 'sub-cto-db3', type: 'system', label: 'Supabase US East', sublabel: 'Not created — Pro plan needed', color: '#6B7280', flag: '⚪', status: 'planned', expandable: false },
      ],
    },
    {
      id: 'sub-cto-todo', type: 'team', label: 'Open Technical TODO',
      sublabel: '5 items pending', color: '#EF4444', flag: '⚠️',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-cto-t1', type: 'system', label: 'CF Pages slots', sublabel: 'Remove landvex-fr/nl/de/fi/be/it', color: '#EF4444', flag: '🔴', status: 'blocked', expandable: false },
        { id: 'sub-cto-t2', type: 'system', label: 'optical-insight-eu', sublabel: 'CF Pages deploy pending', color: '#F59E0B', flag: '🟡', status: 'planned', expandable: false },
        { id: 'sub-cto-t3', type: 'system', label: 'ECS us-east-1', sublabel: 'New service for OI US API', color: '#F59E0B', flag: '🟡', status: 'planned', expandable: false },
        { id: 'sub-cto-t4', type: 'system', label: 'CF Pages API token', sublabel: 'Erik must create on dash.cloudflare.com', color: '#EF4444', flag: '🔴', status: 'blocked', expandable: false },
      ],
    },
  ],

  'clo': [
    {
      id: 'sub-clo-struct', type: 'team', label: 'Corporate Structure',
      sublabel: '6 entities across 4 jurisdictions', color: '#F59E0B', flag: '🏛',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-clo-s1', type: 'entity', label: 'Wavult Group Dubai', sublabel: 'Holding · IP owner · Forming', color: '#8B5CF6', flag: '🇦🇪', status: 'forming', expandable: false, entityId: 'wavult-group' },
        { id: 'sub-clo-s2', type: 'entity', label: 'Wavult Operations Dubai', sublabel: 'Operations hub · Forming', color: '#0EA5E9', flag: '🇦🇪', status: 'forming', expandable: false, entityId: 'wavult-operations' },
        { id: 'sub-clo-s3', type: 'entity', label: 'LandveX AB', sublabel: 'Sweden · Live', color: '#EC4899', flag: '🇸🇪', status: 'live', expandable: false, entityId: 'landvex-ab' },
        { id: 'sub-clo-s4', type: 'entity', label: 'LandveX Inc', sublabel: 'Texas · Forming', color: '#F59E0B', flag: '🇺🇸', status: 'forming', expandable: false, entityId: 'landvex-inc' },
        { id: 'sub-clo-s5', type: 'entity', label: 'QuiXzoom UAB', sublabel: 'Litauen · Planned', color: '#10B981', flag: '🇱🇹', status: 'planned', expandable: false, entityId: 'quixzoom-uab' },
        { id: 'sub-clo-s6', type: 'entity', label: 'QuiXzoom Inc', sublabel: 'Delaware · Planned', color: '#22D3EE', flag: '🇺🇸', status: 'planned', expandable: false, entityId: 'quixzoom-inc' },
      ],
    },
    {
      id: 'sub-clo-prio', type: 'team', label: 'Legal Priorities',
      sublabel: 'Active items', color: '#F59E0B', flag: '📋',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-clo-p1', type: 'system', label: 'IP Transfer', sublabel: 'Code + trademarks → Wavult Group Dubai', color: '#EF4444', flag: '🔴', status: 'planned', expandable: false },
        { id: 'sub-clo-p2', type: 'system', label: 'Intercompany agreements', sublabel: 'Service fee + royalty structure', color: '#F59E0B', flag: '🟡', status: 'planned', expandable: false },
        { id: 'sub-clo-p3', type: 'system', label: 'Texas LLC incorporation', sublabel: 'Dennis driving docs', color: '#F59E0B', flag: '🟡', status: 'in-progress', expandable: false },
        { id: 'sub-clo-p4', type: 'system', label: 'Transfer pricing policy', sublabel: 'CFO + external advisor needed', color: '#EF4444', flag: '🔴', status: 'blocked', expandable: false },
      ],
    },
  ],

  'cpo': [
    {
      id: 'sub-cpo-prod', type: 'team', label: 'Product Portfolio',
      sublabel: '4 products active or planned', color: '#EC4899', flag: '🧩',
      status: 'active', expandable: true,
      children: [
        { id: 'sub-cpo-p1', type: 'system', label: 'quiXzoom', sublabel: 'Crowdsourced camera · Zoomer platform · Sverige juni 2026', color: '#10B981', flag: '📸', status: 'active', expandable: false },
        { id: 'sub-cpo-p2', type: 'system', label: 'Optical Insight / LandveX', sublabel: 'B2G control system · Right control. Right cost.', color: '#F59E0B', flag: '🔭', status: 'active', expandable: false },
        { id: 'sub-cpo-p3', type: 'system', label: 'Hypbit OS', sublabel: 'Internal operating system · All Wavult entities', color: '#A78BFA', flag: '⚙️', status: 'active', expandable: false },
        { id: 'sub-cpo-p4', type: 'system', label: 'Quixom Ads', sublabel: 'Data monetization · Phase 2 after quiXzoom', color: '#6B7280', flag: '📢', status: 'planned', expandable: false },
      ],
    },
  ],
}

// ─── Build upward path from role to root ───────────────────────────────────────

function buildUpwardPath(roleId: RoleId): Entity[] {
  const primaryEntityId = ROLE_PRIMARY_ENTITY[roleId]
  const path: Entity[] = []
  let currentId: string | null = primaryEntityId

  while (currentId) {
    const entity = ENTITIES.find(e => e.id === currentId)
    if (!entity) break
    path.unshift(entity) // prepend → root first
    currentId = entity.parent_entity_id
  }

  return path
}

// ─── Build the full contextual tree for a role ────────────────────────────────

export function buildContextualTree(roleId: RoleId): TreeNode[] {
  const upwardPath = buildUpwardPath(roleId)
  const nodes: TreeNode[] = []

  // ── Upward chain (above user) ──
  upwardPath.forEach((entity, idx) => {
    const isSelf = idx === upwardPath.length - 1
    nodes.push({
      id: entity.id,
      type: 'entity',
      position: isSelf ? 'self' : 'above',
      level: idx,
      label: entity.shortName,
      sublabel: entity.name,
      color: entity.color,
      flag: entity.flag,
      status: entity.active_status,
      isCurrentUser: false,
      isOnPath: true,
      expandable: true,
      entityId: entity.id,
      metadata: entity.metadata,
    })
  })

  // ── Self role node (centered) ──
  // If upward path already contains the role entity, add role card BELOW it
  const selfRole = ROLE_MAPPINGS.find(rm => {
    const nameMap: Record<RoleId, string> = {
      'admin': 'Erik',
      'group-ceo': 'Erik',
      'ceo-ops': 'Leon',
      'cfo': 'Winston',
      'cto': 'Johan',
      'clo': 'Dennis',
      'cpo': 'CPO',
    }
    return rm.person.startsWith(nameMap[roleId] ?? '')
  })

  if (selfRole && roleId !== 'admin') {
    nodes.push({
      id: `role-self-${roleId}`,
      type: 'role',
      position: 'self',
      level: upwardPath.length,
      label: selfRole.initials,
      sublabel: selfRole.role_type,
      color: selfRole.color,
      flag: '🎯',
      isCurrentUser: true,
      isOnPath: true,
      expandable: false,
      roleMapping: selfRole,
    })
  }

  // ── Subordinate nodes (below user) ──
  const subs = ROLE_SUBORDINATES[roleId] ?? []
  subs.forEach((sub, i) => {
    nodes.push({
      id: sub.id,
      type: sub.type,
      position: 'below',
      level: upwardPath.length + 1 + Math.floor(i / 3),
      label: sub.label,
      sublabel: sub.sublabel,
      color: sub.color,
      flag: sub.flag,
      status: sub.status,
      isCurrentUser: false,
      isOnPath: false,
      expandable: sub.expandable,
      entityId: sub.entityId,
      metadata: sub.metadata,
      children: sub.children?.map(c => ({
        id: c.id,
        type: c.type,
        position: 'below' as NodePosition,
        level: upwardPath.length + 2,
        label: c.label,
        sublabel: c.sublabel,
        color: c.color,
        flag: c.flag,
        status: c.status,
        isCurrentUser: false,
        isOnPath: false,
        expandable: c.expandable ?? false,
        entityId: c.entityId,
        metadata: c.metadata,
      })),
    })
  })

  return nodes
}
