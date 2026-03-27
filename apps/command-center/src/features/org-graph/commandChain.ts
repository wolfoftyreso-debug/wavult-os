// ─── Command Hierarchy Layer ───────────────────────────────────────────────────
// Defines the single, unambiguous reporting chain for Wavult Group.
// Every role has exactly ONE superior (except Group CEO).
// This is the authority + responsibility structure — always visible, never optional.

export type CommandStatus = 'green' | 'yellow' | 'red'

export interface CommandRole {
  id: string
  person: string
  initials: string
  color: string
  title: string                   // display title
  reports_to: string | null       // id of superior role (null = apex)
  owns: string[]                  // responsibility domains
  kpis: CommandKPI[]
  status: CommandStatus
  scope: 'group' | 'operations' | 'function'
  entity_ids: string[]            // entities this role operates across
  avatar?: string                 // path to photo, relative to /avatars/
}

export interface CommandKPI {
  label: string
  value: string
  trend: 'up' | 'down' | 'flat'
  good: boolean                   // is current trend positive?
}

// ─── The chain (immutable) ────────────────────────────────────────────────────
// Topology: group-ceo → ceo-ops, cfo, cto, clo (all direct reports)

export const COMMAND_CHAIN: CommandRole[] = [
  // ─── APEX ────────────────────────────────────────────────────────────────
  {
    id: 'group-ceo',
    person: 'Erik Svensson',
    avatar: '/avatars/erik.png',
    initials: 'ES',
    color: '#8B5CF6',
    title: 'Chairman & Group CEO',
    reports_to: null,
    scope: 'group',
    entity_ids: ['wavult-group', 'wavult-operations', 'quixzoom-uab', 'quixzoom-inc', 'landvex-inc', 'landvex-ab'],
    owns: [
      'Group strategy',
      'Capital allocation',
      'IP & brand ownership',
      'System architecture',
      'Market & vision',
    ],
    kpis: [
      { label: 'Entities live',   value: '2 / 7',   trend: 'up',   good: true },
      { label: 'Go-live target',  value: 'Jun 2026', trend: 'flat', good: true },
      { label: 'Systems built',   value: '3',        trend: 'up',   good: true },
    ],
    status: 'green',
  },

  // ─── DIRECT REPORTS ───────────────────────────────────────────────────────
  {
    id: 'ceo-ops',
    avatar: '/avatars/leon.png',
    person: 'Leon Russo De Cerame',
    initials: 'LR',
    color: '#10B981',
    title: 'CEO – Operations',
    reports_to: 'group-ceo',
    scope: 'operations',
    entity_ids: ['wavult-operations'],
    owns: [
      'Daily execution',
      'Resource management',
      'Sales & revenue',
      'Team coordination',
      'Operational KPIs',
    ],
    kpis: [
      { label: 'Active projects',  value: '4',      trend: 'up',   good: true },
      { label: 'Thailand workcamp',value: 'Apr 11', trend: 'flat', good: true },
      { label: 'Revenue (MRR)',    value: 'Pre-rev', trend: 'flat', good: false },
    ],
    status: 'yellow',
  },

  {
    id: 'cfo',
    person: 'Winston Bjarnemark',
    avatar: '/avatars/winston.png',
    initials: 'WB',
    color: '#3B82F6',
    title: 'CFO',
    reports_to: 'group-ceo',
    scope: 'function',
    entity_ids: ['wavult-group', 'wavult-operations'],
    owns: [
      'Financial flows',
      'Intercompany billing',
      'Budget & forecast',
      'Economic infrastructure',
      'Banking relationships',
    ],
    kpis: [
      { label: 'Intercompany setup', value: 'Pending',  trend: 'flat', good: false },
      { label: 'Bank accounts',      value: '0 / 4',    trend: 'flat', good: false },
      { label: 'Cashflow status',    value: 'Watch',    trend: 'down', good: false },
    ],
    status: 'red',
  },

  {
    id: 'cto',
    person: 'Johan Berglund',
    avatar: '/avatars/johan.png',
    initials: 'JB',
    color: '#06B6D4',
    title: 'Group CTO',
    reports_to: 'group-ceo',
    scope: 'function',
    entity_ids: ['wavult-operations', 'hypbit-system'],
    owns: [
      'System architecture',
      'Infrastructure',
      'CI/CD & DevOps',
      'Security',
      'API accounts & credentials',
    ],
    kpis: [
      { label: 'Services live',   value: '2 ECS',    trend: 'up',   good: true },
      { label: 'Uptime',          value: '99%',      trend: 'flat', good: true },
      { label: 'Open tech debt',  value: '3 items',  trend: 'flat', good: false },
    ],
    status: 'yellow',
  },

  {
    id: 'clo',
    person: 'Dennis Bjarnemark',
    avatar: '/avatars/dennis.png',
    initials: 'DB',
    color: '#F59E0B',
    title: 'Board / Chief Legal',
    reports_to: 'group-ceo',
    scope: 'function',
    entity_ids: ['wavult-group', 'landvex-ab', 'landvex-inc'],
    owns: [
      'Corporate structure',
      'Contracts & agreements',
      'IP protection',
      'Multi-jurisdiction compliance',
      'Intercompany legal framework',
    ],
    kpis: [
      { label: 'Entities incorporated', value: '1 / 7',  trend: 'up',   good: false },
      { label: 'Contracts signed',      value: '0',      trend: 'flat', good: false },
      { label: 'Compliance status',     value: 'Watch',  trend: 'flat', good: false },
    ],
    status: 'red',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCommandRole(id: string): CommandRole | undefined {
  return COMMAND_CHAIN.find(r => r.id === id)
}

export function getDirectReports(superiorId: string): CommandRole[] {
  return COMMAND_CHAIN.filter(r => r.reports_to === superiorId)
}

export function getApexRole(): CommandRole {
  const apex = COMMAND_CHAIN.find(r => r.reports_to === null)
  if (!apex) throw new Error('Command chain has no apex role (reports_to === null)')
  return apex
}

/** Ordered chain from apex down — breadth-first */
export function getOrderedChain(): CommandRole[] {
  const result: CommandRole[] = []
  const queue: CommandRole[] = [getApexRole()]
  while (queue.length) {
    const current = queue.shift()!
    result.push(current)
    getDirectReports(current.id).forEach(r => queue.push(r))
  }
  return result
}

/** Reporting path from role to apex (inclusive) */
export function getReportingPath(roleId: string): CommandRole[] {
  const path: CommandRole[] = []
  let current = getCommandRole(roleId)
  while (current) {
    path.unshift(current)
    current = current.reports_to ? getCommandRole(current.reports_to) : undefined
  }
  return path
}

export const STATUS_COLOR: Record<CommandStatus, string> = {
  green:  '#10B981',
  yellow: '#F59E0B',
  red:    '#EF4444',
}

export const STATUS_LABEL: Record<CommandStatus, string> = {
  green:  'On track',
  yellow: 'Watch',
  red:    'Action needed',
}
