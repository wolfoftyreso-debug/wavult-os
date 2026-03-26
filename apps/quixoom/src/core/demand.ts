import { randomUUID } from 'crypto';
import type { DbClient } from './db.js';
import { emit } from './event-bus.js';
import * as tasks from './tasks.js';

// ============================================================================
// Demand → Task Engine
//
// Flow:
// 1. Buyer/searcher queries: "wooden facades Långsjövägen"
// 2. System parses intent + location
// 3. Generates tasks in that area
// 4. Pushes to nearby creators (prioritizing high-level users)
// ============================================================================

export interface DemandQuery {
  query_text: string;
  requester_id?: string;
}

export interface ParsedDemand {
  objects: string[];
  materials: string[];
  location: {
    area?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  category: string;
}

interface GeneratedTask {
  task_id: string;
  title: string;
  category: string;
  area: string;
}

// ============================================================================
// Intent Parser
// ============================================================================

/**
 * Parse a demand query into structured intent.
 * In production, use NLP/LLM. Here: keyword extraction.
 */
export function parseIntent(queryText: string): ParsedDemand {
  const lower = queryText.toLowerCase();
  const words = lower.split(/\s+/);

  // Object detection
  const objectKeywords: Record<string, string[]> = {
    facade: ['facade', 'fasad', 'facades', 'fasader'],
    storefront: ['storefront', 'butik', 'shop', 'store', 'skyltfönster'],
    signage: ['sign', 'signage', 'skylt', 'skyltar'],
    window: ['window', 'fönster', 'windows'],
    roof: ['roof', 'tak', 'rooftop'],
    door: ['door', 'dörr', 'entrance', 'entré'],
  };

  const objects: string[] = [];
  for (const [obj, keywords] of Object.entries(objectKeywords)) {
    if (keywords.some(k => lower.includes(k))) objects.push(obj);
  }
  if (objects.length === 0) objects.push('storefront'); // default

  // Material detection
  const materialKeywords: Record<string, string[]> = {
    wood: ['wood', 'wooden', 'trä'],
    brick: ['brick', 'tegel'],
    concrete: ['concrete', 'betong'],
    glass: ['glass', 'glas'],
    metal: ['metal', 'metall', 'stål'],
  };

  const materials: string[] = [];
  for (const [mat, keywords] of Object.entries(materialKeywords)) {
    if (keywords.some(k => lower.includes(k))) materials.push(mat);
  }

  // Location extraction (naive: last capitalized words or known areas)
  const knownAreas = [
    'södermalm', 'östermalm', 'vasastan', 'kungsholmen', 'gamla stan',
    'norrmalm', 'långsjövägen', 'hammarby', 'hägersten', 'bromma',
  ];

  let area: string | undefined;
  for (const a of knownAreas) {
    if (lower.includes(a)) {
      area = a.charAt(0).toUpperCase() + a.slice(1);
      break;
    }
  }

  // If no known area, take last word as potential location
  if (!area && words.length > 1) {
    const lastWord = words[words.length - 1];
    if (lastWord.length > 3 && !objectKeywords[lastWord] && !materialKeywords[lastWord]) {
      area = lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
    }
  }

  // Map objects to task category
  const category = objects[0] === 'facade' ? 'facade'
    : objects[0] === 'signage' ? 'signage'
    : 'storefront';

  return {
    objects,
    materials,
    location: { area, city: 'Stockholm' }, // default city for MVP
    category,
  };
}

// ============================================================================
// Task Generation from Demand
// ============================================================================

/**
 * Process a demand query: parse, generate tasks, store.
 */
export async function processDemand(
  db: DbClient,
  query: DemandQuery,
): Promise<{ demand_id: string; tasks_generated: GeneratedTask[] }> {
  const parsed = parseIntent(query.query_text);
  const demandId = randomUUID();

  // Store demand query
  await db.query(
    `INSERT INTO qz_demand_queries (
       id, query_text, parsed_intent, parsed_location, category,
       latitude, longitude, radius_meters, requester_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      demandId, query.query_text,
      JSON.stringify({ objects: parsed.objects, materials: parsed.materials }),
      JSON.stringify(parsed.location),
      parsed.category,
      parsed.location.latitude ?? null,
      parsed.location.longitude ?? null,
      500,
      query.requester_id ?? null,
    ],
  );

  // Generate tasks based on parsed intent
  const generated: GeneratedTask[] = [];
  const taskCount = 5; // generate 5 tasks per demand query

  for (let i = 0; i < taskCount; i++) {
    const materialSuffix = parsed.materials.length > 0
      ? ` (${parsed.materials.join(', ')})`
      : '';
    const title = `Capture ${parsed.objects[0]}${materialSuffix} — ${parsed.location.area ?? 'area'}`;

    const taskId = await tasks.createTask(db, {
      title,
      description: `Generated from demand: "${query.query_text}"`,
      category: parsed.category,
      required_images: 3,
      payout_amount: calculateDemandPayout(parsed),
      tier: 1,
      area_name: parsed.location.area,
      city: parsed.location.city,
      latitude: parsed.location.latitude,
      longitude: parsed.location.longitude,
      source: 'demand',
      demand_id: demandId,
      priority: 5, // demand-generated tasks get higher priority
    });

    generated.push({
      task_id: taskId,
      title,
      category: parsed.category,
      area: parsed.location.area ?? 'unknown',
    });
  }

  // Update demand query with task count
  await db.query(
    `UPDATE qz_demand_queries SET tasks_generated = $1 WHERE id = $2`,
    [generated.length, demandId],
  );

  await emit(db, {
    aggregate_type: 'demand',
    aggregate_id: demandId,
    event_type: 'PaymentCreated', // Reusing — in production: DemandProcessed
    payload: {
      event: 'demand_processed',
      query: query.query_text,
      tasks_generated: generated.length,
      parsed: parsed,
    },
  });

  return { demand_id: demandId, tasks_generated: generated };
}

/**
 * Calculate payout for demand-generated tasks.
 * Higher for more specific/complex demands.
 */
function calculateDemandPayout(parsed: ParsedDemand): number {
  let base = 25; // SEK base payout

  // Material specificity bonus
  if (parsed.materials.length > 0) base += 10;

  // Multiple objects bonus
  if (parsed.objects.length > 1) base += 15;

  // Location specificity bonus (street-level > area)
  if (parsed.location.area) base += 5;

  return base;
}

/**
 * Find creators near a demand location, sorted by level (highest first).
 */
export async function findNearbyCreators(
  db: DbClient,
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 20,
): Promise<Array<{ user_id: string; display_name: string; level_ordinal: number; distance_km: number }>> {
  const { rows } = await db.query(
    `SELECT u.id AS user_id, u.display_name, l.ordinal AS level_ordinal,
       (6371 * acos(
         cos(radians($1)) * cos(radians((u.location->>'lat')::numeric)) *
         cos(radians((u.location->>'lng')::numeric) - radians($2)) +
         sin(radians($1)) * sin(radians((u.location->>'lat')::numeric))
       )) AS distance_km
     FROM qz_users u
     JOIN qz_levels l ON l.id = u.level_id
     WHERE u.status = 'active'
       AND u.location->>'lat' IS NOT NULL
     HAVING distance_km <= $3
     ORDER BY l.ordinal DESC, distance_km ASC
     LIMIT $4`,
    [latitude, longitude, radiusKm, limit],
  );
  return rows;
}
