import React, { createContext, useContext, useState } from 'react'

// ─── Role definitions (from wavult-internal-handbook-v1, section 9.3) ─────────

export type RoleId = 'admin' | 'group-ceo' | 'ceo-ops' | 'cfo' | 'cto' | 'clo' | 'cpo'

export interface RoleProfile {
  id: RoleId
  name: string
  title: string
  person: string
  color: string
  initials: string
  emoji: string
  access: AccessScope[]
}

export type AccessScope =
  | 'full'
  | 'finance'
  | 'tech'
  | 'legal'
  | 'product'
  | 'execution'
  | 'strategy'
  | 'sales'
  | 'systems'
  | 'infra'
  | 'support'
  | 'contracts'

// ─── Role registry ─────────────────────────────────────────────────────────────

export const ROLES: RoleProfile[] = [
  {
    id: 'admin' as RoleId,
    name: 'Erik Svensson',
    title: 'System Administrator',
    person: 'Admin',
    color: '#FF6B35',
    initials: 'SA',
    emoji: '🔐',
    access: ['full', 'strategy', 'finance', 'tech', 'legal', 'product', 'execution'],
  },
  {
    id: 'group-ceo',
    name: 'Erik Svensson',
    title: 'Chairman & Group CEO',
    person: 'Erik',
    color: '#8B5CF6',
    initials: 'ES',
    emoji: '👑',
    access: ['full', 'strategy', 'finance', 'tech', 'legal', 'product', 'execution'],
  },
  {
    id: 'ceo-ops',
    name: 'Leon Russo De Cerame',
    title: 'CEO – Sälj & Execution',
    person: 'Leon',
    color: '#10B981',
    initials: 'LR',
    emoji: '⚙️',
    access: ['execution', 'sales', 'strategy'],
  },
  {
    id: 'cfo',
    name: 'Winston Bjarnemark',
    title: 'CFO – Ekonomisk infrastruktur',
    person: 'Winston',
    color: '#3B82F6',
    initials: 'WB',
    emoji: '💰',
    access: ['finance', 'systems'],
  },
  {
    id: 'cto',
    name: 'Johan Berglund',
    title: 'CTO – Drift, APIer & Support',
    person: 'Johan',
    color: '#06B6D4',
    initials: 'JB',
    emoji: '🧠',
    access: ['tech', 'infra', 'support'],
  },
  {
    id: 'clo',
    name: 'Dennis Bjarnemark',
    title: 'Board / Chief Legal – Juridik & Avtal',
    person: 'Dennis',
    color: '#F59E0B',
    initials: 'DB',
    emoji: '⚖️',
    access: ['legal', 'contracts'],
  },
  {
    id: 'cpo',
    name: '— Vakant —',
    title: 'Chief Product Officer',
    person: 'CPO',
    color: '#EC4899',
    initials: 'CP',
    emoji: '🧩',
    access: ['product'],
  },
]

// ─── Context ───────────────────────────────────────────────────────────────────

interface RoleContextValue {
  role: RoleProfile | null
  setRole: (role: RoleProfile | null) => void
  hasAccess: (scope: AccessScope) => boolean
  isAdmin: boolean
  viewAs: RoleProfile | null
  setViewAs: (role: RoleProfile | null) => void
  effectiveRole: RoleProfile | null
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  setRole: () => {},
  hasAccess: () => false,
  isAdmin: false,
  viewAs: null,
  setViewAs: () => {},
  effectiveRole: null,
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<RoleProfile | null>(null)
  const [viewAs, setViewAs] = useState<RoleProfile | null>(null)

  const isAdmin = role?.id === 'admin'
  const effectiveRole = isAdmin && viewAs ? viewAs : role

  const hasAccess = (scope: AccessScope) => {
    if (!effectiveRole) return false
    return effectiveRole.access.includes('full') || effectiveRole.access.includes(scope)
  }

  return (
    <RoleContext.Provider value={{ role, setRole, hasAccess, isAdmin, viewAs, setViewAs, effectiveRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
