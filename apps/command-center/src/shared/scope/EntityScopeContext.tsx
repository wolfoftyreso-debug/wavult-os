import React, { createContext, useContext, useState } from 'react'
import { ENTITIES, Entity } from '../../features/org-graph/data'

interface EntityScopeContextValue {
  activeEntity: Entity
  setActiveEntity: (e: Entity) => void
  // Returns true if the given entity_id is "in scope" for the active entity
  // Logic: active entity is root (layer 0) → everything is in scope
  // active entity layer 1+ → only entities in its subtree are in scope
  isInScope: (entityId: string) => boolean
  // All entities that are in scope
  scopedEntities: Entity[]
}

// Build subtree: entity + all its descendants (recursive via parent_entity_id)
function getSubtree(root: Entity, all: Entity[]): Entity[] {
  const result: Entity[] = [root]
  const children = all.filter(e => e.parent_entity_id === root.id)
  for (const child of children) {
    result.push(...getSubtree(child, all))
  }
  return result
}

const EntityScopeContext = createContext<EntityScopeContextValue | null>(null)

export function EntityScopeProvider({ children }: { children: React.ReactNode }) {
  // Default: root holding (wavult-group)
  const defaultEntity = ENTITIES.find(e => e.id === 'wavult-group') ?? ENTITIES[0]
  const [activeEntity, setActiveEntity] = useState<Entity>(defaultEntity)

  const scopedEntities = getSubtree(activeEntity, ENTITIES)
  const scopedIds = new Set(scopedEntities.map(e => e.id))
  const isInScope = (entityId: string) => scopedIds.has(entityId)

  return (
    <EntityScopeContext.Provider value={{ activeEntity, setActiveEntity, scopedEntities, isInScope }}>
      {children}
    </EntityScopeContext.Provider>
  )
}

export function useEntityScope() {
  const ctx = useContext(EntityScopeContext)
  if (!ctx) throw new Error('useEntityScope must be used inside EntityScopeProvider')
  return ctx
}
