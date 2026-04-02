/**
 * Org Graph API — /api/org-graph/*
 * Hämtar entities, relationships och role mappings från Supabase.
 * Synkad med teammedlemmar och verksamheter i systemet.
 */
import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

function sb() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

async function ensureTables() {
  const client = sb()
  await client.rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS org_entities (
      id TEXT PRIMARY KEY,
      wg_id TEXT,
      parent_wg_id TEXT,
      name TEXT NOT NULL,
      short_name TEXT,
      type TEXT,
      jurisdiction TEXT,
      parent_entity_id TEXT,
      description TEXT,
      active_status TEXT DEFAULT 'planned',
      color TEXT,
      flag TEXT,
      layer INT DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS org_relationships (
      id TEXT PRIMARY KEY,
      from_entity_id TEXT NOT NULL,
      to_entity_id TEXT NOT NULL,
      type TEXT,
      label TEXT,
      bidirectional BOOLEAN DEFAULT false,
      wg_id TEXT,
      parent_wg_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS org_role_mappings (
      id SERIAL PRIMARY KEY,
      person TEXT NOT NULL,
      initials TEXT,
      color TEXT,
      role_type TEXT,
      scope TEXT,
      entity_ids TEXT[],
      permissions TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ` }).catch(() => null)
}

// GET /api/org-graph/entities
router.get('/entities', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('org_entities')
      .select('*')
      .order('layer', { ascending: true })
    if (error) throw error
    // Map snake_case → camelCase
    const mapped = (data ?? []).map((e: any) => ({
      id: e.id,
      wg_id: e.wg_id,
      parent_wg_id: e.parent_wg_id,
      name: e.name,
      shortName: e.short_name,
      type: e.type,
      jurisdiction: e.jurisdiction,
      parent_entity_id: e.parent_entity_id,
      description: e.description,
      active_status: e.active_status,
      color: e.color,
      flag: e.flag,
      layer: e.layer,
      metadata: e.metadata ?? {},
    }))
    res.json(mapped)
  } catch (e: any) {
    console.error('org-graph entities:', e.message)
    res.json([]) // Fallback: frontend uses static data
  }
})

// GET /api/org-graph/relationships
router.get('/relationships', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('org_relationships')
      .select('*')
    if (error) throw error
    const mapped = (data ?? []).map((r: any) => ({
      id: r.id,
      from_entity_id: r.from_entity_id,
      to_entity_id: r.to_entity_id,
      type: r.type,
      label: r.label,
      bidirectional: r.bidirectional,
      wg_id: r.wg_id,
      parent_wg_id: r.parent_wg_id,
    }))
    res.json(mapped)
  } catch (e: any) {
    console.error('org-graph relationships:', e.message)
    res.json([])
  }
})

// GET /api/org-graph/roles
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('org_role_mappings')
      .select('*')
      .order('person', { ascending: true })
    if (error) throw error
    const mapped = (data ?? []).map((r: any) => ({
      person: r.person,
      initials: r.initials,
      color: r.color,
      role_type: r.role_type,
      scope: r.scope,
      entity_ids: r.entity_ids ?? [],
      permissions: r.permissions ?? [],
    }))
    res.json(mapped)
  } catch (e: any) {
    console.error('org-graph roles:', e.message)
    res.json([])
  }
})

// POST /api/org-graph/entities — skapa/uppdatera entity
router.post('/entities', async (req: Request, res: Response) => {
  try {
    const body = req.body
    const row = {
      id: body.id,
      wg_id: body.wg_id,
      parent_wg_id: body.parent_wg_id,
      name: body.name,
      short_name: body.shortName,
      type: body.type,
      jurisdiction: body.jurisdiction,
      parent_entity_id: body.parent_entity_id,
      description: body.description,
      active_status: body.active_status ?? 'planned',
      color: body.color,
      flag: body.flag,
      layer: body.layer ?? 0,
      metadata: body.metadata ?? {},
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await sb()
      .from('org_entities')
      .upsert(row, { onConflict: 'id' })
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/org-graph/sync — synka statisk data till Supabase (engångskörning)
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { entities, relationships, roles } = req.body
    const client = sb()
    await ensureTables()

    let inserted = 0
    if (entities?.length) {
      const rows = entities.map((e: any) => ({
        id: e.id, wg_id: e.wg_id, parent_wg_id: e.parent_wg_id,
        name: e.name, short_name: e.shortName, type: e.type,
        jurisdiction: e.jurisdiction, parent_entity_id: e.parent_entity_id,
        description: e.description, active_status: e.active_status,
        color: e.color, flag: e.flag, layer: e.layer, metadata: e.metadata ?? {},
      }))
      const { error } = await client.from('org_entities').upsert(rows, { onConflict: 'id' })
      if (!error) inserted += rows.length
    }
    if (relationships?.length) {
      const rows = relationships.map((r: any) => ({
        id: r.id, from_entity_id: r.from_entity_id, to_entity_id: r.to_entity_id,
        type: r.type, label: r.label, bidirectional: r.bidirectional ?? false,
        wg_id: r.wg_id, parent_wg_id: r.parent_wg_id,
      }))
      await client.from('org_relationships').upsert(rows, { onConflict: 'id' })
      inserted += rows.length
    }
    res.json({ ok: true, inserted })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
