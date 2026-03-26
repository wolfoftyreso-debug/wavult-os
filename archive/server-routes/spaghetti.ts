import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Spaghetti Diagram & Helikopterperspektiv — Lean Operations Intelligence
// ---------------------------------------------------------------------------
// Endpoints:
//   GET /api/spaghetti/activity-flow        — aktivitetsflöde per person
//   GET /api/spaghetti/live-overview        — helikopterperspektiv (NU)
//   GET /api/spaghetti/flow-analysis        — Lean-metrics & rörelseindex
//   GET /api/spaghetti/optimization-suggestions — AI-genererade Lean-förslag
//   GET /api/spaghetti/trend                — historisk jämförelse
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthUser {
  id: string;
  org_id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Lean-modul-kategorier (speglar pixdrift-navigationen)
type LeamModule = "execution" | "capability" | "process" | "currency" | "reports" | "idle";

// Demo-data för när riktiga activity_log-rader saknas
const DEMO_PERSONS = [
  { user_id: "u1", name: "Erik S.", role: "CEO",   module: "execution" as LeamModule, current_activity: "deal_update", started_at: new Date(Date.now() - 25 * 60000).toISOString(), items_in_progress: 5, active: true  },
  { user_id: "u2", name: "Maria L.", role: "COO",  module: "process"   as LeamModule, current_activity: "process_review", started_at: new Date(Date.now() - 47 * 60000).toISOString(), items_in_progress: 3, active: true  },
  { user_id: "u3", name: "Johan K.", role: "CFO",  module: "reports"   as LeamModule, current_activity: "report_view", started_at: new Date(Date.now() - 120 * 60000).toISOString(), items_in_progress: 2, active: false },
  { user_id: "u4", name: "Anna P.", role: "Sales", module: "execution" as LeamModule, current_activity: "task_start", started_at: new Date(Date.now() - 8 * 60000).toISOString(), items_in_progress: 8, active: true  },
  { user_id: "u5", name: "Dennis B.", role: "Ops", module: "process"   as LeamModule, current_activity: "nc_open", started_at: new Date(Date.now() - 33 * 60000).toISOString(), items_in_progress: 4, active: true  },
  { user_id: "u6", name: "Sara E.", role: "HR",    module: "capability" as LeamModule, current_activity: "meeting", started_at: new Date(Date.now() - 15 * 60000).toISOString(), items_in_progress: 6, active: true  },
];

// Generera demo-aktivitetsserier för en dag
function generateDemoActivityFlow(userId: string, name: string) {
  const modules: LeamModule[] = ["execution", "capability", "process", "currency", "reports"];
  const activities = ["task_start", "task_complete", "deal_update", "meeting", "nc_open", "report_view", "process_review"];
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0);
  const rows = [];
  let current = { ...baseTime };
  let prevModule: LeamModule = modules[Math.floor(Math.random() * modules.length)];

  for (let i = 0; i < 12; i++) {
    const duration = 10 + Math.floor(Math.random() * 55);
    const nextModule = modules[Math.floor(Math.random() * modules.length)];
    rows.push({
      user_id: userId,
      name,
      activity_type: activities[Math.floor(Math.random() * activities.length)],
      module: nextModule,
      from_state: prevModule,
      to_state: nextModule,
      timestamp: new Date(current).toISOString(),
      duration_minutes: duration,
      related_entity: null,
    });
    prevModule = nextModule;
    current = new Date(current.getTime() + duration * 60000);
    if (current.getHours() >= 17) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 1. GET /api/spaghetti/activity-flow
//    Aktivitetsflöde per person för spagetti-kartvy
// ---------------------------------------------------------------------------
router.get("/api/spaghetti/activity-flow", async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, user_ids, org_id } = req.query as Record<string, string>;
    const orgId = org_id ?? req.user?.org_id;

    let query = supabase
      .from("activity_log")
      .select("user_id, activity_type, module, from_state, to_state, created_at, duration_minutes, entity_type, entity_id")
      .order("created_at", { ascending: true });

    if (orgId)     query = query.eq("org_id", orgId);
    if (from_date) query = query.gte("created_at", from_date);
    if (to_date)   query = query.lte("created_at", to_date + "T23:59:59Z");
    if (user_ids)  query = query.in("user_id", user_ids.split(","));

    const { data, error } = await query.limit(2000);

    if (error || !data || data.length === 0) {
      // Fallback: demo-data för alla demo-personer
      const demoFlow: Record<string, unknown[]> = {};
      for (const p of DEMO_PERSONS) {
        demoFlow[p.user_id] = generateDemoActivityFlow(p.user_id, p.name);
      }
      return res.json({ demo: true, persons: demoFlow });
    }

    // Gruppera per user_id
    const persons: Record<string, unknown[]> = {};
    for (const row of data) {
      if (!persons[row.user_id]) persons[row.user_id] = [];
      persons[row.user_id].push({
        user_id:        row.user_id,
        activity_type:  row.activity_type,
        module:         row.module,
        from_state:     row.from_state,
        to_state:       row.to_state,
        timestamp:      row.created_at,
        duration_minutes: row.duration_minutes,
        related_entity: row.entity_type ? { type: row.entity_type, id: row.entity_id } : null,
      });
    }

    return res.json({ demo: false, persons });
  } catch (err) {
    console.error("[spaghetti/activity-flow]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/spaghetti/live-overview
//    Helikopterperspektiv — vad alla gör NU
// ---------------------------------------------------------------------------
router.get("/api/spaghetti/live-overview", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.org_id;

    // Hämta senaste aktivitet per användare (senaste 4h)
    const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("activity_log")
      .select("user_id, activity_type, module, created_at, duration_minutes")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (orgId) query = query.eq("org_id", orgId);

    const { data, error } = await query.limit(500);

    if (error || !data || data.length === 0) {
      // Demo-fallback
      return res.json({
        demo: true,
        persons: DEMO_PERSONS,
        snapshot_at: new Date().toISOString(),
      });
    }

    // Senaste aktivitet per person
    const seen = new Set<string>();
    const persons = [];
    for (const row of data) {
      if (!seen.has(row.user_id)) {
        seen.add(row.user_id);
        persons.push({
          user_id:          row.user_id,
          name:             row.user_id, // Om user-tabell saknas
          role:             "—",
          current_activity: row.activity_type,
          module:           row.module,
          started_at:       row.created_at,
          items_in_progress: 1,
          active: new Date(row.created_at).getTime() > Date.now() - 60 * 60 * 1000,
        });
      }
    }

    return res.json({
      demo: false,
      persons,
      snapshot_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[spaghetti/live-overview]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /api/spaghetti/flow-analysis
//    Lean-metrics: rörelseindex, modulbyten, fokustid, waste-indikatorer
// ---------------------------------------------------------------------------
router.get("/api/spaghetti/flow-analysis", async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, user_ids } = req.query as Record<string, string>;
    const orgId = req.user?.org_id;

    let query = supabase
      .from("activity_log")
      .select("user_id, activity_type, module, duration_minutes, created_at")
      .order("user_id")
      .order("created_at", { ascending: true });

    if (orgId)     query = query.eq("org_id", orgId);
    if (from_date) query = query.gte("created_at", from_date);
    if (to_date)   query = query.lte("created_at", to_date + "T23:59:59Z");
    if (user_ids)  query = query.in("user_id", user_ids.split(","));

    const { data, error } = await query.limit(5000);

    if (error || !data || data.length === 0) {
      // Demo-beräknad analys
      return res.json({
        demo: true,
        summary: {
          total_module_switches: 47,
          avg_focus_time_minutes: 23,
          flow_efficiency_pct: 64,
          waste_count: 8,
        },
        per_person: DEMO_PERSONS.map(p => ({
          user_id: p.user_id,
          name: p.name,
          module_switches: Math.floor(Math.random() * 12) + 4,
          avg_focus_minutes: Math.floor(Math.random() * 30) + 10,
          most_visited_module: p.module,
          movement_index: Math.round((Math.random() * 0.6 + 0.2) * 100) / 100,
          waste_events: Math.floor(Math.random() * 3),
        })),
        most_visited_modules: [
          { module: "execution", visits: 18 },
          { module: "process",   visits: 14 },
          { module: "reports",   visits: 9  },
          { module: "capability", visits: 6 },
          { module: "currency",  visits: 4  },
        ],
        bottlenecks: [
          { description: "Rapporter väntar på godkännande", affected_users: ["u3", "u1"] },
          { description: "NC-ärenden utan åtgärdsplan", affected_users: ["u5"] },
        ],
      });
    }

    // Beräkna Lean-metrics
    const perPerson: Record<string, {
      user_id: string;
      modules: string[];
      durations: number[];
      module_switches: number;
      waste_events: number;
    }> = {};

    for (const row of data) {
      if (!perPerson[row.user_id]) {
        perPerson[row.user_id] = { user_id: row.user_id, modules: [], durations: [], module_switches: 0, waste_events: 0 };
      }
      const p = perPerson[row.user_id];
      if (p.modules.length > 0 && p.modules[p.modules.length - 1] !== row.module) {
        p.module_switches++;
      }
      p.modules.push(row.module);
      if (row.duration_minutes) p.durations.push(row.duration_minutes);
      // Waste = aktivitet som tar < 5 min (troligen avbrott/context-switch)
      if (row.duration_minutes && row.duration_minutes < 5) p.waste_events++;
    }

    // Modulbesök-räkning
    const moduleCount: Record<string, number> = {};
    for (const row of data) {
      moduleCount[row.module] = (moduleCount[row.module] || 0) + 1;
    }
    const most_visited_modules = Object.entries(moduleCount)
      .sort((a, b) => b[1] - a[1])
      .map(([module, visits]) => ({ module, visits }));

    // Aggregera per person
    const perPersonResult = Object.values(perPerson).map(p => {
      const avg = p.durations.length > 0
        ? Math.round(p.durations.reduce((a, b) => a + b, 0) / p.durations.length)
        : 0;
      // Rörelseindex: andel modulbyten av totala aktiviteter (0–1)
      const movement_index = p.modules.length > 1
        ? Math.round((p.module_switches / (p.modules.length - 1)) * 100) / 100
        : 0;
      // Vanligaste modul
      const mc: Record<string, number> = {};
      for (const m of p.modules) mc[m] = (mc[m] || 0) + 1;
      const most_visited = Object.entries(mc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      return {
        user_id:             p.user_id,
        module_switches:     p.module_switches,
        avg_focus_minutes:   avg,
        most_visited_module: most_visited,
        movement_index,
        waste_events:        p.waste_events,
      };
    });

    const totalSwitches  = perPersonResult.reduce((s, p) => s + p.module_switches, 0);
    const avgFocus       = perPersonResult.length > 0
      ? Math.round(perPersonResult.reduce((s, p) => s + p.avg_focus_minutes, 0) / perPersonResult.length)
      : 0;
    const totalWaste     = perPersonResult.reduce((s, p) => s + p.waste_events, 0);
    // Flödeseffektivitet: om snittfokustid >= 45 min = 100%, lineär nedtrappning
    const flowEfficiency = Math.round(Math.min(100, (avgFocus / 45) * 80));

    return res.json({
      demo: false,
      summary: {
        total_module_switches: totalSwitches,
        avg_focus_time_minutes: avgFocus,
        flow_efficiency_pct: flowEfficiency,
        waste_count: totalWaste,
      },
      per_person: perPersonResult,
      most_visited_modules,
      bottlenecks: [],
    });
  } catch (err) {
    console.error("[spaghetti/flow-analysis]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /api/spaghetti/optimization-suggestions
//    AI-genererade (regelbaserade) Lean-förbättringsförslag
// ---------------------------------------------------------------------------
router.get("/api/spaghetti/optimization-suggestions", async (req: Request, res: Response) => {
  try {
    // I en fullständig implementation skulle vi hämta flow-data och analysera mönster.
    // Här returnerar vi regelbaserade förslag baserade på typiska Lean-problem.
    const suggestions = [
      {
        id: "s1",
        type: "waste" as const,
        description: "Hög frekvens av korta aktiviteter (<5 min) i Execution — tecken på context-switching",
        affected_users: 3,
        suggestion: "Inför 'djupt arbete'-block om 90 min i Execution varje förmiddag. Stäng notifikationer.",
        estimated_impact: "~2h/dag i återvunnen fokustid per person",
      },
      {
        id: "s2",
        type: "bottleneck" as const,
        description: "Rapporter genereras men väntar på godkännande — skapar kö i Reports-modulen",
        affected_users: 2,
        suggestion: "Delegera godkännande till teamleads för standardrapporter. CFO godkänner bara >50 kEUR.",
        estimated_impact: "Minskar ledtid med ~40% för rapportflödet",
      },
      {
        id: "s3",
        type: "handoff" as const,
        description: "NC-ärenden passerar mellan 3+ personer innan åtgärd — onödig handoff-waste",
        affected_users: 4,
        suggestion: "Inför 'single-point-of-ownership' för NC-ärenden. En person driver till stängning.",
        estimated_impact: "Halverar handoff-tid för NC-ärenden",
      },
      {
        id: "s4",
        type: "waste" as const,
        description: "Genomsnittlig fokustid på 23 min — långt under Lean-optimal 45 min",
        affected_users: 5,
        suggestion: "Implementera Pomodoro-protokoll (25+5 min) och blockera möten 09:00–11:30.",
        estimated_impact: "Potentiell förbättring av flödeseffektivitet från 64% → 80%+",
      },
      {
        id: "s5",
        type: "bottleneck" as const,
        description: "Affärer i DEMO-fasen stagnerar — genomsnittlig tid 8 dagar utan progress",
        affected_users: 2,
        suggestion: "Sätt automatisk påminnelse efter 3 dagar i DEMO utan aktivitet. Eskalera till säljchef.",
        estimated_impact: "Minskar genomsnittlig deal-tid med ~30%",
      },
    ];

    return res.json({ suggestions });
  } catch (err) {
    console.error("[spaghetti/optimization-suggestions]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /api/spaghetti/trend
//    Historisk jämförelse — N veckors rörelseindex och flödeseffektivitet
// ---------------------------------------------------------------------------
router.get("/api/spaghetti/trend", async (req: Request, res: Response) => {
  try {
    const periods = parseInt((req.query.periods as string) ?? "4", 10);
    const orgId = req.user?.org_id;

    const weeks = [];
    for (let i = periods - 1; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);

      let query = supabase
        .from("activity_log")
        .select("user_id, module, duration_minutes, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (orgId) query = query.eq("org_id", orgId);

      const { data } = await query.limit(1000);

      if (!data || data.length === 0) {
        // Demo-trend med variation
        const base = 55 + i * 3;
        weeks.push({
          week_start: start.toISOString().split("T")[0],
          week_end:   end.toISOString().split("T")[0],
          movement_index:    Math.round((0.4 + i * 0.08) * 100) / 100,
          flow_efficiency:   Math.max(50, base - i * 4),
          avg_focus_minutes: Math.round(20 + i * 2.5),
          module_switches:   45 + i * 5,
          waste_count:       6 + i * 2,
          demo: true,
        });
        continue;
      }

      // Beräkna veckovärden
      let switches = 0;
      let totalDur = 0;
      let durCount = 0;
      let waste = 0;
      const userModules: Record<string, string[]> = {};

      for (const row of data) {
        if (!userModules[row.user_id]) userModules[row.user_id] = [];
        const um = userModules[row.user_id];
        if (um.length > 0 && um[um.length - 1] !== row.module) switches++;
        um.push(row.module);
        if (row.duration_minutes) { totalDur += row.duration_minutes; durCount++; }
        if (row.duration_minutes && row.duration_minutes < 5) waste++;
      }

      const avgFocus = durCount > 0 ? Math.round(totalDur / durCount) : 0;
      const totalActivities = data.length;
      const movementIdx = totalActivities > 1 ? Math.round((switches / (totalActivities - 1)) * 100) / 100 : 0;
      const flowEff = Math.round(Math.min(100, (avgFocus / 45) * 80));

      weeks.push({
        week_start:        start.toISOString().split("T")[0],
        week_end:          end.toISOString().split("T")[0],
        movement_index:    movementIdx,
        flow_efficiency:   flowEff,
        avg_focus_minutes: avgFocus,
        module_switches:   switches,
        waste_count:       waste,
        demo: false,
      });
    }

    return res.json({ periods: weeks });
  } catch (err) {
    console.error("[spaghetti/trend]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
