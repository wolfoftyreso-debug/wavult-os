import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Spatial Flow Intelligence — Zone tracking, Spaghetti Diagrams, Friction Detection
// ---------------------------------------------------------------------------
// Core insight: No GPS needed. Movement inferred from work events:
//   tool checkout/checkin, task start/end, zone tagging = movement pattern
//
// Endpoints:
//   GET    /api/spatial/zones              → List zones with current occupancy
//   POST   /api/spatial/zones             → Create zone
//   PUT    /api/spatial/zones/:id         → Update zone (position, size, color)
//   GET    /api/spatial/zones/:id/current → Who/what is in this zone now
//   POST   /api/spatial/events            → Log a zone event
//   GET    /api/spatial/spaghetti         → Spaghetti diagram data (nodes + edges)
//   GET    /api/spatial/movement/summary  → Per-user & per-zone movement analysis
//   POST   /api/spatial/analyze           → Run friction detection engine
//   GET    /api/spatial/friction          → Active friction detections
//   PATCH  /api/spatial/friction/:id/resolve
//   GET    /api/spatial/map/:org_id       → Full workshop map (zones + current positions)
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// Demo data — Lindqvists Bilverkstad
// ---------------------------------------------------------------------------
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

const DEMO_ZONES = [
  { id: "11111111-0001-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Lift 1",          zone_type: "LIFT",          x_position: 10, y_position: 20, width: 8,  height: 12, color: "#007AFF", capacity: 1, is_active: true },
  { id: "11111111-0002-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Lift 2",          zone_type: "LIFT",          x_position: 25, y_position: 20, width: 8,  height: 12, color: "#007AFF", capacity: 1, is_active: true },
  { id: "11111111-0003-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Lift 3",          zone_type: "LIFT",          x_position: 40, y_position: 20, width: 8,  height: 12, color: "#007AFF", capacity: 1, is_active: true },
  { id: "11111111-0004-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Verktygsrum",     zone_type: "TOOL_ROOM",     x_position: 60, y_position: 5,  width: 12, height: 10, color: "#FF9500", capacity: 3, is_active: true },
  { id: "11111111-0005-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Reservdelslager", zone_type: "PARTS_STORAGE", x_position: 60, y_position: 20, width: 12, height: 15, color: "#34C759", capacity: 2, is_active: true },
  { id: "11111111-0006-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Reception",       zone_type: "RECEPTION",     x_position: 5,  y_position: 5,  width: 10, height: 10, color: "#AF52DE", capacity: 2, is_active: true },
  { id: "11111111-0007-0000-0000-000000000001", org_id: DEMO_ORG_ID, name: "Besiktning",      zone_type: "INSPECTION",    x_position: 10, y_position: 40, width: 15, height: 10, color: "#FF3B30", capacity: 2, is_active: true },
];

// Zone center coordinates for spaghetti diagram
function zoneCenter(zone: typeof DEMO_ZONES[0]) {
  return {
    x: zone.x_position + zone.width / 2,
    y: zone.y_position + zone.height / 2,
  };
}

// Estimated distance (meters) between two zone centers on a 100x60 SVG grid
// Assume grid unit ≈ 1 meter in a typical 80m² workshop
function estimateDistance(from: typeof DEMO_ZONES[0], to: typeof DEMO_ZONES[0]): number {
  const fc = zoneCenter(from);
  const tc = zoneCenter(to);
  const dx = (tc.x - fc.x) * 0.8;
  const dy = (tc.y - fc.y) * 0.8;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

// Demo events for Anders (u1): Lift1 → Tool → Lift1 → Parts → Lift1 → Tool → Lift1
// = 6 zone changes, repeated tool room trips → friction
function generateDemoEvents() {
  const now = new Date();
  const baseTime = new Date(now);
  baseTime.setHours(8, 0, 0, 0);

  const andersSequence = [
    { zone_id: "11111111-0001-0000-0000-000000000001", zone_name: "Lift 1",          event_type: "TASK_START",    minutes: 0   },
    { zone_id: "11111111-0004-0000-0000-000000000001", zone_name: "Verktygsrum",     event_type: "TOOL_CHECKOUT", minutes: 15  },
    { zone_id: "11111111-0001-0000-0000-000000000001", zone_name: "Lift 1",          event_type: "ENTER",         minutes: 18  },
    { zone_id: "11111111-0005-0000-0000-000000000001", zone_name: "Reservdelslager", event_type: "PARTS_PICKUP",  minutes: 45  },
    { zone_id: "11111111-0001-0000-0000-000000000001", zone_name: "Lift 1",          event_type: "ENTER",         minutes: 50  },
    { zone_id: "11111111-0004-0000-0000-000000000001", zone_name: "Verktygsrum",     event_type: "TOOL_CHECKOUT", minutes: 80  },
    { zone_id: "11111111-0001-0000-0000-000000000001", zone_name: "Lift 1",          event_type: "ENTER",         minutes: 83  },
    { zone_id: "11111111-0004-0000-0000-000000000001", zone_name: "Verktygsrum",     event_type: "TOOL_CHECKIN",  minutes: 110 },
    { zone_id: "11111111-0007-0000-0000-000000000001", zone_name: "Besiktning",      event_type: "INSPECTION",    minutes: 115 },
  ];

  const mariaSequence = [
    { zone_id: "11111111-0002-0000-0000-000000000001", zone_name: "Lift 2",          event_type: "TASK_START",    minutes: 0   },
    { zone_id: "11111111-0005-0000-0000-000000000001", zone_name: "Reservdelslager", event_type: "PARTS_PICKUP",  minutes: 30  },
    { zone_id: "11111111-0002-0000-0000-000000000001", zone_name: "Lift 2",          event_type: "ENTER",         minutes: 35  },
    { zone_id: "11111111-0007-0000-0000-000000000001", zone_name: "Besiktning",      event_type: "INSPECTION",    minutes: 90  },
    { zone_id: "11111111-0006-0000-0000-000000000001", zone_name: "Reception",       event_type: "HANDOVER",      minutes: 105 },
  ];

  const events: Array<{
    id: string;
    org_id: string;
    user_id: string;
    zone_id: string;
    zone_name: string;
    event_type: string;
    work_order_id: string;
    triggered_by: string;
    created_at: string;
  }> = [];

  let evId = 1;
  for (const ev of andersSequence) {
    events.push({
      id: `22222222-0099-0000-0000-0000000${String(evId).padStart(5, "0")}`,
      org_id: DEMO_ORG_ID,
      user_id: "22222222-0001-0000-0000-000000000001",
      zone_id: ev.zone_id,
      zone_name: ev.zone_name,
      event_type: ev.event_type,
      work_order_id: "wo-001",
      triggered_by: "task_event",
      created_at: new Date(baseTime.getTime() + ev.minutes * 60000).toISOString(),
    });
  }
  for (const ev of mariaSequence) {
    events.push({
      id: `22222222-0099-0000-0000-0000000${String(evId).padStart(5, "0")}`,
      org_id: DEMO_ORG_ID,
      user_id: "22222222-0002-0000-0000-000000000001",
      zone_id: ev.zone_id,
      zone_name: ev.zone_name,
      event_type: ev.event_type,
      work_order_id: "wo-002",
      triggered_by: "task_event",
      created_at: new Date(baseTime.getTime() + ev.minutes * 60000).toISOString(),
    });
  }
  return events;
}

// ---------------------------------------------------------------------------
// Exported helper: logZoneEvent — called from other modules
// ---------------------------------------------------------------------------
export async function logZoneEvent(
  orgId: string,
  userId: string,
  zoneId: string | null,
  eventType: string,
  metadata?: { asset_id?: string; work_order_id?: string; task_id?: string; duration_minutes?: number }
): Promise<void> {
  try {
    let zoneName: string | null = null;
    if (zoneId) {
      const { data } = await supabase
        .from("spatial_zones")
        .select("name")
        .eq("id", zoneId)
        .single();
      zoneName = data?.name ?? null;
    }

    await supabase.from("zone_events").insert({
      org_id: orgId,
      user_id: userId,
      zone_id: zoneId,
      zone_name: zoneName,
      event_type: eventType,
      asset_id: metadata?.asset_id ?? null,
      work_order_id: metadata?.work_order_id ?? null,
      task_id: metadata?.task_id ?? null,
      duration_minutes: metadata?.duration_minutes ?? null,
      triggered_by: "task_event",
    });
  } catch (err) {
    console.error("[spatial/logZoneEvent]", err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/spatial/zones — List zones with current occupancy
// ---------------------------------------------------------------------------
router.get("/zones", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.org_id ?? DEMO_ORG_ID; // SECURITY: never trust query param for org_id

    const { data, error } = await supabase
      .from("spatial_zones")
      .select("*")
      .eq("org_id", orgId ?? DEMO_ORG_ID)
      .eq("is_active", true)
      .order("name");

    if (error || !data || data.length === 0) {
      return res.json({ demo: true, zones: DEMO_ZONES });
    }

    return res.json({ demo: false, zones: data });
  } catch (err) {
    console.error("[spatial/zones]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/spatial/zones — Create zone
// ---------------------------------------------------------------------------
router.post("/zones", async (req: Request, res: Response) => {
  try {
    const orgId = req.body.org_id ?? req.user?.org_id;
    const { name, zone_type, x_position, y_position, width, height, color, capacity, notes } = req.body;

    if (!name || !zone_type) {
      return res.status(400).json({ error: "name and zone_type required" });
    }

    const { data, error } = await supabase
      .from("spatial_zones")
      .insert({ org_id: orgId, name, zone_type, x_position, y_position, width, height, color, capacity, notes })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ zone: data });
  } catch (err) {
    console.error("[spatial/zones POST]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/spatial/zones/:id — Update zone
// ---------------------------------------------------------------------------
router.put("/zones/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    delete updates.org_id;

    const { data, error } = await supabase
      .from("spatial_zones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ zone: data });
  } catch (err) {
    console.error("[spatial/zones PUT]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spatial/zones/:id/current — Who/what is in this zone now
// ---------------------------------------------------------------------------
router.get("/zones/:id/current", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("zone_events")
      .select("user_id, asset_id, event_type, created_at")
      .eq("zone_id", id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    // Simple heuristic: last event per user_id
    const userMap = new Map<string, typeof data[0]>();
    for (const ev of data ?? []) {
      if (ev.user_id && !userMap.has(ev.user_id)) {
        userMap.set(ev.user_id, ev);
      }
    }

    // Users whose last event was ENTER/TASK_START/etc (not EXIT)
    const currentUsers = [...userMap.values()].filter(
      ev => !["EXIT", "TOOL_CHECKIN"].includes(ev.event_type)
    );

    return res.json({ zone_id: id, current_users: currentUsers });
  } catch (err) {
    console.error("[spatial/zones/current]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/spatial/events — Log a zone event
// ---------------------------------------------------------------------------
router.post("/events", async (req: Request, res: Response) => {
  try {
    const {
      org_id, user_id, asset_id, zone_id, zone_name, event_type,
      work_order_id, task_id, duration_minutes, triggered_by
    } = req.body;

    const orgId = org_id ?? req.user?.org_id;

    if (!event_type) {
      return res.status(400).json({ error: "event_type required" });
    }

    const { data, error } = await supabase
      .from("zone_events")
      .insert({
        org_id: orgId,
        user_id,
        asset_id,
        zone_id,
        zone_name,
        event_type,
        work_order_id,
        task_id,
        duration_minutes,
        triggered_by: triggered_by ?? "manual",
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ event: data });
  } catch (err) {
    console.error("[spatial/events POST]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spatial/spaghetti — Spaghetti diagram data
// Query: { user_id?, date_from, date_to, work_order_id?, org_id? }
// Returns: nodes (zones), edges (movements with count), crossings
// ---------------------------------------------------------------------------
router.get("/spaghetti", async (req: Request, res: Response) => {
  try {
    const { user_id, date_from, date_to, work_order_id, org_id } = req.query as Record<string, string>;
    const orgId = org_id ?? req.user?.org_id;

    let query = supabase
      .from("zone_events")
      .select("user_id, zone_id, zone_name, event_type, created_at, work_order_id")
      .order("user_id")
      .order("created_at", { ascending: true });

    if (orgId)        query = query.eq("org_id", orgId);
    if (user_id)      query = query.eq("user_id", user_id);
    if (date_from)    query = query.gte("created_at", date_from);
    if (date_to)      query = query.lte("created_at", date_to + "T23:59:59Z");
    if (work_order_id) query = query.eq("work_order_id", work_order_id);

    const { data, error } = await query.limit(2000);

    const useDemoData = error || !data || data.length === 0;
    const events = useDemoData ? generateDemoEvents() : data;

    // Fetch zones for coordinates
    const { data: zonesData } = await supabase
      .from("spatial_zones")
      .select("*")
      .eq("org_id", orgId ?? DEMO_ORG_ID);

    const zones = zonesData && zonesData.length > 0 ? zonesData : DEMO_ZONES;
    const zoneMap = new Map(zones.map((z: typeof DEMO_ZONES[0]) => [z.id, z]));

    // Build nodes
    const nodes = zones.map((z: typeof DEMO_ZONES[0]) => ({
      id: z.id,
      name: z.name,
      zone_type: z.zone_type,
      x: zoneCenter(z).x,
      y: zoneCenter(z).y,
      color: z.color,
    }));

    // Build edges per user
    const edgeMap = new Map<string, { from_id: string; to_id: string; count: number; user_color: string; from_x: number; from_y: number; to_x: number; to_y: number }>();
    const userColors = ["#007AFF", "#FF9500", "#34C759", "#AF52DE", "#FF3B30", "#5AC8FA"];
    const userColorMap = new Map<string, string>();
    let colorIdx = 0;

    // Group by user, sequence events
    const byUser = new Map<string, typeof events>();
    for (const ev of events) {
      if (!ev.user_id) continue;
      if (!byUser.has(ev.user_id)) byUser.set(ev.user_id, []);
      byUser.get(ev.user_id)!.push(ev);
    }

    for (const [uid, userEvents] of byUser) {
      if (!userColorMap.has(uid)) {
        userColorMap.set(uid, userColors[colorIdx++ % userColors.length]);
      }
      const color = userColorMap.get(uid)!;

      for (let i = 1; i < userEvents.length; i++) {
        const from = userEvents[i - 1];
        const to = userEvents[i];
        if (!from.zone_id || !to.zone_id || from.zone_id === to.zone_id) continue;

        const key = `${uid}:${from.zone_id}→${to.zone_id}`;
        if (edgeMap.has(key)) {
          edgeMap.get(key)!.count++;
        } else {
          const fromZone = zoneMap.get(from.zone_id) as typeof DEMO_ZONES[0] | undefined;
          const toZone = zoneMap.get(to.zone_id) as typeof DEMO_ZONES[0] | undefined;
          if (!fromZone || !toZone) continue;
          const fc = zoneCenter(fromZone);
          const tc = zoneCenter(toZone);
          edgeMap.set(key, {
            from_id: from.zone_id,
            to_id: to.zone_id,
            count: 1,
            user_color: color,
            from_x: fc.x,
            from_y: fc.y,
            to_x: tc.x,
            to_y: tc.y,
          });
        }
      }
    }

    const edges = [...edgeMap.values()];

    // Detect approximate line crossings (waste indicators)
    const crossings: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const cross = lineIntersect(edges[i], edges[j]);
        if (cross) crossings.push(cross);
      }
    }

    return res.json({
      demo: useDemoData,
      nodes,
      edges,
      crossings: crossings.slice(0, 20), // cap for performance
    });
  } catch (err) {
    console.error("[spatial/spaghetti]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Line segment intersection helper
function lineIntersect(
  a: { from_x: number; from_y: number; to_x: number; to_y: number },
  b: { from_x: number; from_y: number; to_x: number; to_y: number }
): { x: number; y: number } | null {
  const x1 = a.from_x, y1 = a.from_y, x2 = a.to_x, y2 = a.to_y;
  const x3 = b.from_x, y3 = b.from_y, x4 = b.to_x, y4 = b.to_y;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.001) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95) {
    return { x: Math.round((x1 + t * (x2 - x1)) * 10) / 10, y: Math.round((y1 + t * (y2 - y1)) * 10) / 10 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/spatial/movement/summary — Per-user & per-zone analysis
// ---------------------------------------------------------------------------
router.get("/movement/summary", async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, org_id } = req.query as Record<string, string>;
    const orgId = org_id ?? req.user?.org_id;

    const from = date_from ?? new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const to   = date_to   ?? new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("zone_events")
      .select("user_id, zone_id, zone_name, event_type, created_at")
      .eq("org_id", orgId ?? DEMO_ORG_ID)
      .gte("created_at", from)
      .lte("created_at", to + "T23:59:59Z")
      .order("user_id")
      .order("created_at", { ascending: true });

    const useDemoData = error || !data || data.length === 0;
    const events = useDemoData ? generateDemoEvents() : data;

    // Fetch zones for distance calc
    const { data: zonesData } = await supabase
      .from("spatial_zones")
      .select("*")
      .eq("org_id", orgId ?? DEMO_ORG_ID);
    const zones = zonesData && zonesData.length > 0 ? zonesData : DEMO_ZONES;
    const zoneMap = new Map(zones.map((z: typeof DEMO_ZONES[0]) => [z.id, z]));

    // Per-user stats
    const userStats = new Map<string, {
      user_id: string;
      zone_changes: number;
      distance_meters: number;
      zone_counts: Map<string, number>;
      last_zone: string | null;
    }>();

    for (const ev of events) {
      if (!ev.user_id) continue;
      if (!userStats.has(ev.user_id)) {
        userStats.set(ev.user_id, { user_id: ev.user_id, zone_changes: 0, distance_meters: 0, zone_counts: new Map(), last_zone: null });
      }
      const u = userStats.get(ev.user_id)!;
      if (ev.zone_id) {
        u.zone_counts.set(ev.zone_id, (u.zone_counts.get(ev.zone_id) ?? 0) + 1);
        if (u.last_zone && u.last_zone !== ev.zone_id) {
          u.zone_changes++;
          const fromZ = zoneMap.get(u.last_zone) as typeof DEMO_ZONES[0] | undefined;
          const toZ   = zoneMap.get(ev.zone_id) as typeof DEMO_ZONES[0] | undefined;
          if (fromZ && toZ) u.distance_meters += estimateDistance(fromZ, toZ);
        }
        u.last_zone = ev.zone_id;
      }
    }

    const perUser = [...userStats.values()].map(u => {
      const topZoneEntry = [...u.zone_counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const topZone = topZoneEntry ? (zoneMap.get(topZoneEntry[0]) as typeof DEMO_ZONES[0] | undefined)?.name ?? topZoneEntry[0] : "—";
      // Friction score: 0-10 based on zone changes vs distance ratio
      const frictionScore = Math.min(10, Math.round((u.zone_changes * 0.5) - (u.distance_meters / 50)));
      return {
        user_id: u.user_id,
        zone_changes: u.zone_changes,
        estimated_meters: u.distance_meters,
        friction_score: Math.max(0, frictionScore),
        top_zone: topZone,
      };
    });

    // Per-zone stats
    const zoneStats = new Map<string, { zone_id: string; zone_name: string; visits: number; unique_users: Set<string> }>();
    for (const ev of events) {
      if (!ev.zone_id) continue;
      if (!zoneStats.has(ev.zone_id)) {
        zoneStats.set(ev.zone_id, { zone_id: ev.zone_id, zone_name: ev.zone_name ?? ev.zone_id, visits: 0, unique_users: new Set() });
      }
      const z = zoneStats.get(ev.zone_id)!;
      z.visits++;
      if (ev.user_id) z.unique_users.add(ev.user_id);
    }

    const perZone = [...zoneStats.values()].map(z => ({
      zone_id: z.zone_id,
      zone_name: z.zone_name,
      visits: z.visits,
      unique_users: z.unique_users.size,
    })).sort((a, b) => b.visits - a.visits);

    return res.json({ demo: useDemoData, per_user: perUser, per_zone: perZone });
  } catch (err) {
    console.error("[spatial/movement/summary]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/spatial/analyze — Run friction detection engine
// ---------------------------------------------------------------------------
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { org_id, date_from, date_to } = req.body;
    const orgId = org_id ?? req.user?.org_id ?? DEMO_ORG_ID;

    const from = date_from ?? new Date(Date.now() - 7 * 86400000).toISOString();
    const to   = date_to   ?? new Date().toISOString();

    const { data, error } = await supabase
      .from("zone_events")
      .select("user_id, zone_id, zone_name, event_type, work_order_id, created_at")
      .eq("org_id", orgId)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("user_id")
      .order("created_at", { ascending: true });

    const useDemoData = error || !data || data.length === 0;
    const events = useDemoData ? generateDemoEvents() : data;

    const detections: Array<{
      org_id: string;
      detection_type: string;
      severity: string;
      title: string;
      description: string;
      affected_user_id: string | null;
      affected_zone_id: string | null;
      occurrences: number;
      estimated_minutes_lost_per_day: number;
      suggestion: string;
      status: string;
    }> = [];

    // Rule 1: REPEATED_TRIPS — same user visits same zone >5x in one job
    const tripsByUserZoneJob = new Map<string, number>();
    for (const ev of events) {
      if (!ev.user_id || !ev.zone_id || !ev.work_order_id) continue;
      const key = `${ev.user_id}:${ev.zone_id}:${ev.work_order_id}`;
      tripsByUserZoneJob.set(key, (tripsByUserZoneJob.get(key) ?? 0) + 1);
    }
    for (const [key, count] of tripsByUserZoneJob) {
      if (count >= 5) {
        const [userId, zoneId] = key.split(":");
        const zoneInfo = useDemoData ? DEMO_ZONES.find(z => z.id === zoneId) : null;
        const zoneName = zoneInfo?.name ?? zoneId;
        detections.push({
          org_id: orgId,
          detection_type: "REPEATED_TRIPS",
          severity: count >= 8 ? "HIGH" : "MEDIUM",
          title: `Upprepade resor till ${zoneName}`,
          description: `Användare besökte ${zoneName} ${count} gånger under ett arbete.`,
          affected_user_id: userId,
          affected_zone_id: zoneId,
          occurrences: count,
          estimated_minutes_lost_per_day: (count - 2) * 3,
          suggestion: `Placera nödvändiga verktyg/material vid arbetsstationen för att minska rörelser.`,
          status: "OPEN",
        });
      }
    }

    // Rule 2: TOOL_FAR_FROM_ZONE — tool checkout zone != primary work zone
    const userPrimaryZone = new Map<string, Map<string, number>>();
    const userToolZone    = new Map<string, string>();
    for (const ev of events) {
      if (!ev.user_id || !ev.zone_id) continue;
      if (!userPrimaryZone.has(ev.user_id)) userPrimaryZone.set(ev.user_id, new Map());
      const zc = userPrimaryZone.get(ev.user_id)!;
      zc.set(ev.zone_id, (zc.get(ev.zone_id) ?? 0) + 1);
      if (["TOOL_CHECKOUT", "TOOL_CHECKIN"].includes(ev.event_type)) {
        userToolZone.set(ev.user_id, ev.zone_id);
      }
    }
    for (const [userId, zoneCounts] of userPrimaryZone) {
      const primaryEntry = [...zoneCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!primaryEntry) continue;
      const primaryZoneId = primaryEntry[0];
      const toolZoneId = userToolZone.get(userId);
      if (toolZoneId && toolZoneId !== primaryZoneId) {
        // Fetch zones to check distance
        const primaryZ = useDemoData ? DEMO_ZONES.find(z => z.id === primaryZoneId) : null;
        const toolZ    = useDemoData ? DEMO_ZONES.find(z => z.id === toolZoneId)    : null;
        const dist     = primaryZ && toolZ ? estimateDistance(primaryZ, toolZ) : 20;
        if (dist > 10) {
          detections.push({
            org_id: orgId,
            detection_type: "TOOL_FAR_FROM_ZONE",
            severity: dist > 25 ? "HIGH" : "MEDIUM",
            title: `Verktyg långt från arbetszon`,
            description: `Verktygsrum är ~${dist}m från den primära arbetszonen (${primaryZ?.name ?? primaryZoneId}).`,
            affected_user_id: userId,
            affected_zone_id: toolZoneId,
            occurrences: Math.round(zoneCounts.get(toolZoneId) ?? 1),
            estimated_minutes_lost_per_day: Math.round(dist / 50 * 60),
            suggestion: `Flytta ofta använda verktyg till ${primaryZ?.name ?? "primär arbetszon"} eller närmaste förvaringspunkt.`,
            status: "OPEN",
          });
        }
      }
    }

    // Rule 3: BOTTLENECK — zone has >3 users within a 30-minute window
    const zoneTimeSlots = new Map<string, Map<number, Set<string>>>(); // zone→slot→users
    for (const ev of events) {
      if (!ev.user_id || !ev.zone_id) continue;
      const slot = Math.floor(new Date(ev.created_at).getTime() / (30 * 60000));
      if (!zoneTimeSlots.has(ev.zone_id)) zoneTimeSlots.set(ev.zone_id, new Map());
      const slots = zoneTimeSlots.get(ev.zone_id)!;
      if (!slots.has(slot)) slots.set(slot, new Set());
      slots.get(slot)!.add(ev.user_id);
    }
    for (const [zoneId, slots] of zoneTimeSlots) {
      for (const [, users] of slots) {
        if (users.size >= 3) {
          const zoneInfo = useDemoData ? DEMO_ZONES.find(z => z.id === zoneId) : null;
          detections.push({
            org_id: orgId,
            detection_type: "BOTTLENECK",
            severity: users.size >= 5 ? "HIGH" : "MEDIUM",
            title: `Flaskhals i ${zoneInfo?.name ?? zoneId}`,
            description: `${users.size} användare i samma zon under 30 minuter — kapaciteten är begränsad.`,
            affected_user_id: null,
            affected_zone_id: zoneId,
            occurrences: users.size,
            estimated_minutes_lost_per_day: (users.size - 1) * 5,
            suggestion: `Schemalägg zontillgång för att undvika köer. Överväg att utöka kapaciteten.`,
            status: "OPEN",
          });
          break; // one detection per zone per analysis
        }
      }
    }

    // Rule 4: LONG_DISTANCE — total path distance > 200m
    const userTotalDist = new Map<string, { dist: number; changes: number; lastZone: string | null }>();
    for (const ev of events) {
      if (!ev.user_id || !ev.zone_id) continue;
      if (!userTotalDist.has(ev.user_id)) userTotalDist.set(ev.user_id, { dist: 0, changes: 0, lastZone: null });
      const u = userTotalDist.get(ev.user_id)!;
      if (u.lastZone && u.lastZone !== ev.zone_id) {
        const fromZ = useDemoData ? DEMO_ZONES.find(z => z.id === u.lastZone!) : null;
        const toZ   = useDemoData ? DEMO_ZONES.find(z => z.id === ev.zone_id)  : null;
        if (fromZ && toZ) u.dist += estimateDistance(fromZ, toZ);
        u.changes++;
      }
      u.lastZone = ev.zone_id;
    }
    for (const [userId, stats] of userTotalDist) {
      if (stats.dist > 200) {
        detections.push({
          org_id: orgId,
          detection_type: "LONG_DISTANCE",
          severity: stats.dist > 400 ? "HIGH" : "MEDIUM",
          title: `Lång total förflyttning (${stats.dist}m)`,
          description: `Användare gick ~${stats.dist}m med ${stats.changes} zonskiften. Ökar trötthet och slöseri.`,
          affected_user_id: userId,
          affected_zone_id: null,
          occurrences: stats.changes,
          estimated_minutes_lost_per_day: Math.round(stats.dist / 80),
          suggestion: `Omorganisera arbetsflödet för att klumpa ihop aktiviteter geografiskt.`,
          status: "OPEN",
        });
      }
    }

    // Upsert detections into DB
    if (detections.length > 0) {
      await supabase.from("friction_detections").insert(detections);
    }

    return res.json({
      demo: useDemoData,
      detections_found: detections.length,
      detections,
    });
  } catch (err) {
    console.error("[spatial/analyze]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spatial/friction — Active friction detections
// ---------------------------------------------------------------------------
router.get("/friction", async (req: Request, res: Response) => {
  try {
    const { org_id, status } = req.query as Record<string, string>;
    const orgId = org_id ?? req.user?.org_id;

    let query = supabase
      .from("friction_detections")
      .select("*")
      .eq("org_id", orgId ?? DEMO_ORG_ID)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.in("status", ["OPEN", "ACKNOWLEDGED"]);
    }

    const { data, error } = await query.limit(100);

    if (error || !data || data.length === 0) {
      // Demo friction detections
      const demoFrictions = [
        {
          id: "f1",
          org_id: DEMO_ORG_ID,
          detection_type: "REPEATED_TRIPS",
          severity: "HIGH",
          title: "Anders besökte Verktygsrum 8 gånger",
          description: "Anders besökte Verktygsrum 8 gånger under arbetsorder WO-001.",
          affected_user_id: "22222222-0001-0000-0000-000000000001",
          affected_zone_id: "11111111-0004-0000-0000-000000000001",
          occurrences: 8,
          estimated_minutes_lost_per_day: 18,
          suggestion: "Flytta momentnyckel till Lift 1 förvaringsenhet → sparar ~18 min/dag",
          status: "OPEN",
          created_at: new Date().toISOString(),
        },
        {
          id: "f2",
          org_id: DEMO_ORG_ID,
          detection_type: "TOOL_FAR_FROM_ZONE",
          severity: "MEDIUM",
          title: "Verktygsrum 28m från primär arbetszon",
          description: "Verktygsrum är placerat 28m från Lift 1 (primär arbetszon för Anders).",
          affected_user_id: "22222222-0001-0000-0000-000000000001",
          affected_zone_id: "11111111-0004-0000-0000-000000000001",
          occurrences: 8,
          estimated_minutes_lost_per_day: 21,
          suggestion: "Placera en verktygsstation vid Lift 1–3 med de 10 vanligaste verktygen.",
          status: "OPEN",
          created_at: new Date().toISOString(),
        },
        {
          id: "f3",
          org_id: DEMO_ORG_ID,
          detection_type: "LONG_DISTANCE",
          severity: "MEDIUM",
          title: "Hög total förflyttning (320m idag)",
          description: "Anders gick ~320m med 9 zonskiften under en arbetsdag.",
          affected_user_id: "22222222-0001-0000-0000-000000000001",
          affected_zone_id: null,
          occurrences: 9,
          estimated_minutes_lost_per_day: 4,
          suggestion: "Samla delar och verktyg i ett steg innan arbetet startar.",
          status: "OPEN",
          created_at: new Date().toISOString(),
        },
      ];
      return res.json({ demo: true, frictions: demoFrictions, efficiency_pct: 73 });
    }

    const avgLostMin = data.reduce((s: number, f: { estimated_minutes_lost_per_day?: number }) => s + (f.estimated_minutes_lost_per_day ?? 0), 0) / Math.max(data.length, 1);
    const efficiencyPct = Math.max(0, Math.round(100 - avgLostMin));

    return res.json({ demo: false, frictions: data, efficiency_pct: efficiencyPct });
  } catch (err) {
    console.error("[spatial/friction]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/spatial/friction/:id/resolve
// ---------------------------------------------------------------------------
router.patch("/friction/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status = "RESOLVED" } = req.body;

    const { data, error } = await supabase
      .from("friction_detections")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ friction: data });
  } catch (err) {
    console.error("[spatial/friction/resolve]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spatial/map/:org_id — Full workshop map
// ---------------------------------------------------------------------------
router.get("/map/:org_id", async (req: Request, res: Response) => {
  try {
    const { org_id } = req.params;
    const orgId = org_id === "demo" ? DEMO_ORG_ID : org_id;

    const { data: zonesData, error } = await supabase
      .from("spatial_zones")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_active", true);

    const zones = error || !zonesData || zonesData.length === 0 ? DEMO_ZONES : zonesData;

    // Get recent zone events (last 8h) to determine current occupancy
    const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const { data: recentEvents } = await supabase
      .from("zone_events")
      .select("user_id, asset_id, zone_id, event_type, created_at")
      .eq("org_id", orgId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    const events = recentEvents ?? generateDemoEvents().filter(e => new Date(e.created_at) > new Date(Date.now() - 8 * 60 * 60 * 1000));

    // Current users per zone (last event for each user)
    const userLastZone = new Map<string, { zone_id: string; event_type: string }>();
    const sortedEvents = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const ev of sortedEvents) {
      if (ev.user_id && !userLastZone.has(ev.user_id)) {
        userLastZone.set(ev.user_id, { zone_id: ev.zone_id, event_type: ev.event_type });
      }
    }

    // Build zone map with current occupants
    const zoneUsersMap = new Map<string, Array<{ id: string }>>();
    for (const [userId, info] of userLastZone) {
      if (["EXIT", "TOOL_CHECKIN"].includes(info.event_type)) continue;
      if (!zoneUsersMap.has(info.zone_id)) zoneUsersMap.set(info.zone_id, []);
      zoneUsersMap.get(info.zone_id)!.push({ id: userId });
    }

    const enrichedZones = zones.map((z: typeof DEMO_ZONES[0]) => ({
      id: z.id,
      name: z.name,
      type: z.zone_type,
      x: z.x_position,
      y: z.y_position,
      w: z.width,
      h: z.height,
      color: z.color,
      capacity: z.capacity,
      current_users: zoneUsersMap.get(z.id) ?? [],
      current_assets: [],
    }));

    return res.json({ demo: !recentEvents || recentEvents.length === 0, zones: enrichedZones });
  } catch (err) {
    console.error("[spatial/map]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Seed demo data — POST /api/spatial/seed (dev only)
// ---------------------------------------------------------------------------
router.post("/seed", async (_req: Request, res: Response) => {
  try {
    // Insert demo zones
    const { error: zoneError } = await supabase
      .from("spatial_zones")
      .upsert(DEMO_ZONES.map(z => ({
        id: z.id,
        org_id: z.org_id,
        name: z.name,
        zone_type: z.zone_type,
        x_position: z.x_position,
        y_position: z.y_position,
        width: z.width,
        height: z.height,
        color: z.color,
        capacity: z.capacity,
        is_active: z.is_active,
      })));

    if (zoneError) return res.status(500).json({ error: zoneError.message });

    // Insert demo events
    const demoEvents = generateDemoEvents();
    const { error: evError } = await supabase
      .from("zone_events")
      .insert(demoEvents.map(ev => ({
        org_id: ev.org_id,
        user_id: ev.user_id,
        zone_id: ev.zone_id,
        zone_name: ev.zone_name,
        event_type: ev.event_type,
        work_order_id: ev.work_order_id,
        triggered_by: ev.triggered_by,
        created_at: ev.created_at,
      })));

    if (evError) return res.status(500).json({ error: evError.message });

    return res.json({ ok: true, zones_seeded: DEMO_ZONES.length, events_seeded: demoEvents.length });
  } catch (err) {
    console.error("[spatial/seed]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
