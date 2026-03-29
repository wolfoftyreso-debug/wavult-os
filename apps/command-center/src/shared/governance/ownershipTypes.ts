// ─── Wavult OS — Governance Ownership Types ─────────────────────────────────
// Allt i systemet är som en lag eller förordning.
// Referenskod: WG-{DOMAIN}-{YEAR}-{NNN}
// Systemet BLOCKERAR om något saknas — inte varnar, blockerar.

export type RoleId =
  | 'chairman-ceo'
  | 'chief-legal-ops'
  | 'ceo-operations'
  | 'cfo'
  | 'group-cto'

export interface Owner {
  roleId: RoleId
  roleName: string
  personName: string
  email: string
}

export const OWNERS: Record<RoleId, Owner> = {
  'chairman-ceo': {
    roleId: 'chairman-ceo',
    roleName: 'Chairman & Group CEO',
    personName: 'Erik Svensson',
    email: 'erik@wavult.com',
  },
  'chief-legal-ops': {
    roleId: 'chief-legal-ops',
    roleName: 'Chief Legal & Operations',
    personName: 'Dennis Bjarnemark',
    email: 'dennis@wavult.com',
  },
  'ceo-operations': {
    roleId: 'ceo-operations',
    roleName: 'CEO Wavult Operations',
    personName: 'Leon Russo De Cerame',
    email: 'leon@wavult.com',
  },
  'cfo': {
    roleId: 'cfo',
    roleName: 'CFO',
    personName: 'Winston Bjarnemark',
    email: 'winston@wavult.com',
  },
  'group-cto': {
    roleId: 'group-cto',
    roleName: 'Group CTO',
    personName: 'Johan Berglund',
    email: 'johan@wavult.com',
  },
}

export type DomainCode = 'GOV' | 'FIN' | 'OPS' | 'HR' | 'COMP' | 'TECH' | 'LEGAL' | 'STRAT'

export interface GovernanceItem {
  /** WG-GOV-2026-001 */
  refCode: string
  domain: DomainCode
  title: string
  description: string
  owner: RoleId
  /** "Ledningsgenomgång 2026-03-28" | "Annual Planning" etc */
  establishedBy: string
  /** ISO date */
  establishedAt: string
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  /** ALDRIG tom */
  nextAction: string
  /** ALDRIG tom — ISO date */
  deadline: string
  /** andra refCodes detta beror på */
  linkedItems: string[]
  /** refCode som blockerar */
  blockedBy?: string
}

/**
 * Validering — returnerar fel om item är ofullständigt.
 * Systemet BLOCKERAR rendering om detta returnerar fel.
 */
export function validateGovernanceItem(item: Partial<GovernanceItem>): string[] {
  const errors: string[] = []
  if (!item.refCode) errors.push('Referenskod saknas')
  if (!item.owner) errors.push('Ägare saknas — alla items måste ha en ägarroll')
  if (!item.nextAction || item.nextAction.trim() === '') errors.push('Nästa handling saknas')
  if (!item.deadline) errors.push('Deadline saknas')
  if (!item.establishedBy) errors.push('Fastställd av saknas')
  return errors
}

/** Domän-metadata för UI */
export interface DomainMeta {
  code: DomainCode
  label: string
  description: string
}

export const DOMAIN_META: DomainMeta[] = [
  { code: 'GOV',   label: 'Governance',  description: 'Styrning, beslut & möteshierarki' },
  { code: 'FIN',   label: 'Finans',      description: 'Budget, flöden & bankstruktur' },
  { code: 'LEGAL', label: 'Juridik',     description: 'Bolagsbildning & avtal' },
  { code: 'COMP',  label: 'Compliance',  description: 'ISO, GDPR & NIS2' },
  { code: 'OPS',   label: 'Operations',  description: 'Operativ styrning & lansering' },
  { code: 'TECH',  label: 'Teknik',      description: 'Infrastruktur & deployment' },
  { code: 'STRAT', label: 'Strategi',    description: 'Go-to-market & expansion' },
  { code: 'HR',    label: 'HR',          description: 'Personal & organisation' },
]
