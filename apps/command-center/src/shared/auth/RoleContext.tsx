import React, { createContext, useContext, useState } from 'react'

// ─── Role definitions (from wavult-internal-handbook-v1, section 9.3) ─────────

export type RoleId = 'group-ceo' | 'ceo-ops' | 'cfo' | 'cto' | 'clo' | 'cpo'

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

// ─── Role registry ─────────────────────────────────────────────────────────────

export const ROLES: RoleProfile[] = [
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
    title: 'CEO – Wavult Operations',
    person: 'Leon',
    color: '#10B981',
    initials: 'LR',
    emoji: '⚙️',
    access: ['execution', 'strategy'],
  },
  {
    id: 'cfo',
    name: 'Winston Bjarnemark',
    title: 'Chief Financial Officer',
    person: 'Winston',
    color: '#3B82F6',
    initials: 'WB',
    emoji: '💰',
    access: ['finance'],
  },
  {
    id: 'cto',
    name: 'Johan Berglund',
    title: 'Group CTO',
    person: 'Johan',
    color: '#06B6D4',
    initials: 'JB',
    emoji: '🧠',
    access: ['tech'],
  },
  {
    id: 'clo',
    name: 'Dennis Bjarnemark',
    title: 'Board Member / Chief Legal',
    person: 'Dennis',
    color: '#F59E0B',
    initials: 'DB',
    emoji: '⚖️',
    access: ['legal'],
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
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  setRole: () => {},
  hasAccess: () => false,
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<RoleProfile | null>(null)

  const hasAccess = (scope: AccessScope) => {
    if (!role) return false
    return role.access.includes('full') || role.access.includes(scope)
  }

  return (
    <RoleContext.Provider value={{ role, setRole, hasAccess }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
