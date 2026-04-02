/**
 * useOrgGraph — live data hook för Corporate Graph
 * Hämtar entities, relationships och role mappings från API.
 * Fallback: hårdkodad data.ts tills backend är live.
 */
import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'
import { ENTITIES, RELATIONSHIPS, ROLE_MAPPINGS } from './data'
import type { Entity, EntityRelationship, RoleMapping } from './data'

interface OrgGraphData {
  entities: Entity[]
  relationships: EntityRelationship[]
  roleMappings: RoleMapping[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useOrgGraph(): OrgGraphData {
  const { apiFetch } = useApi()
  const [entities, setEntities]       = useState<Entity[]>(ENTITIES)
  const [relationships, setRels]      = useState<EntityRelationship[]>(RELATIONSHIPS)
  const [roleMappings, setRoleMaps]   = useState<RoleMapping[]>(ROLE_MAPPINGS)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [entRes, relRes, roleRes] = await Promise.allSettled([
        apiFetch('/api/org-graph/entities'),
        apiFetch('/api/org-graph/relationships'),
        apiFetch('/api/org-graph/roles'),
      ])

      if (entRes.status === 'fulfilled' && entRes.value.ok) {
        const data = await entRes.value.json() as Entity[]
        if (data.length > 0) setEntities(data)
      }
      if (relRes.status === 'fulfilled' && relRes.value.ok) {
        const data = await relRes.value.json() as EntityRelationship[]
        if (data.length > 0) setRels(data)
      }
      if (roleRes.status === 'fulfilled' && roleRes.value.ok) {
        const data = await roleRes.value.json() as RoleMapping[]
        if (data.length > 0) setRoleMaps(data)
      }
    } catch (e: any) {
      setError(e.message)
      // Fallback: keep static data — never blank
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void load()
    // Refresh every 5 minutes
    const interval = setInterval(() => { void load() }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  return { entities, relationships, roleMappings, loading, error, reload: load }
}
