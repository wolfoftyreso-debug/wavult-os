import { Router, Request, Response } from "express";
import { supabase } from "../supabase";

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ─── OEM stub factory ─────────────────────────────────────────────────────────
function oemStub(manufacturer: string, endpoint: string, data?: any) {
  return {
    stub: true,
    manufacturer,
    endpoint,
    note: `[STUB] ${manufacturer} API-integration kräver partneravtal och sandbox-access`,
    data: data ?? null,
    timestamp: new Date().toISOString(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLVO CARS (VCC)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/api/oem/volvo/vehicle-order-status/:order_id", auth, async (req: Request, res: Response) => {
  res.json(oemStub("Volvo Cars", "vehicle-order-status", {
    order_id: req.params.order_id,
    status: "PRODUCTION_SCHEDULED",
    factory: "Torslanda, Göteborg",
    planned_completion: "2026-05-15",
    dealer_eta: "2026-05-22",
    vida_reference: "VOR-2026-STUB",
    integration_doc: "https://developer.volvocars.com (Volvo Cars Open API)",
  }));
});

router.post("/api/oem/volvo/warranty-claim", auth, async (req: Request, res: Response) => {
  const b = req.body;
  res.json(oemStub("Volvo Cars", "warranty-claim", {
    submitted: { vin: b.vin, claim_amount: b.claim_amount, failure: b.failure_description },
    vosa_reference: `VOSA-${Date.now()}`,
    expected_response_days: 14,
    integration: "VOSA (Volvo Order System for Aftersales) — kräver dealer-credentials",
  }));
});

router.get("/api/oem/volvo/technical-bulletins", auth, async (_req: Request, res: Response) => {
  res.json(oemStub("Volvo Cars", "technical-bulletins", {
    bulletins: [
      { tsb_id: "TSB-V-2026-001", title: "Software update — infotainment v23.2", models: ["XC90", "XC60"], severity: "RECOMMENDED", vida_doc: "VIDA-TSB-2026-001" },
      { tsb_id: "TSB-V-2026-002", title: "EV battery calibration procedure", models: ["C40", "XC40 Recharge"], severity: "MANDATORY", vida_doc: "VIDA-TSB-2026-002" },
    ],
    integration: "Volvo Dealer Net (VDN) + VIDA API",
  }));
});

router.get("/api/oem/volvo/recalls", auth, async (_req: Request, res: Response) => {
  res.json(oemStub("Volvo Cars", "recalls", {
    active_recalls: [
      { recall_number: "RC-V-2026-001", description: "Airbag sensor calibration", affected_models: ["S60", "V60"], remedy: "Software update" },
    ],
    source: "Volvo Recall Portal + EU RAPEX",
  }));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BMW GROUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/api/oem/bmw/vehicle-status/:vin", auth, async (req: Request, res: Response) => {
  res.json(oemStub("BMW Group", "vehicle-status", {
    vin: req.params.vin.toUpperCase(),
    production_status: "DELIVERED_TO_DEALER",
    model: "BMW 530e",
    options_code: "M Sport + Innovation Package",
    dealer_portal: "KOBRA (BMW Dealer Online Portal)",
    ista_available: true,
    integration: "BMW DIS (Dealer Integration Standards)",
  }));
});

router.post("/api/oem/bmw/warranty-submission", auth, async (req: Request, res: Response) => {
  res.json(oemStub("BMW Group", "warranty-submission", {
    submitted: req.body,
    kobra_reference: `KOBRA-${Date.now()}`,
    esb_queue: "BMW Enterprise Service Bus",
    integration: "BMW DIS via ESB — kräver X.509 certifikat och dealer-code",
  }));
});

router.get("/api/oem/bmw/dealer-bulletin", auth, async (_req: Request, res: Response) => {
  res.json(oemStub("BMW Group", "dealer-bulletin", {
    bulletins: [
      { id: "SI-B-65-09-026", title: "iDrive update 22.11 compatibility", models: ["5 Series", "7 Series", "X5"], type: "SI" },
    ],
    source: "KOBRA Dealer Portal",
  }));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLKSWAGEN GROUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/api/oem/vwgroup/vehicle-tracking/:vin", auth, async (req: Request, res: Response) => {
  res.json(oemStub("Volkswagen Group", "vehicle-tracking", {
    vin: req.params.vin.toUpperCase(),
    status: "AT_PORT_GOTHENBURG",
    make: "Volkswagen",
    model: "ID.4",
    cross_status: "VESSEL_ARRIVED",
    expected_dealer_delivery: "2026-04-10",
    integration: "CROSS DMS-integration standard",
  }));
});

router.post("/api/oem/vwgroup/warranty-claim", auth, async (req: Request, res: Response) => {
  res.json(oemStub("Volkswagen Group", "warranty-claim", {
    submitted: req.body,
    elsa_reference: `ELSA-WC-${Date.now()}`,
    integration: "ELSA Pro + VW Group Warranty Portal — kräver dealer.integration@volkswagen.de",
  }));
});

router.get("/api/oem/vwgroup/etka/parts", auth, async (req: Request, res: Response) => {
  const { vin, part_number, search } = req.query;
  res.json(oemStub("Volkswagen Group", "etka-parts", {
    query: { vin, part_number, search },
    integration: "ETKA (Elektronischer Teile Katalog) — kräver VW Group partner-avtal",
    sample_results: vin ? [
      { part_number: "06L-115-403-Q", description: "Oljefilter", oem_price_eur: 18.40, availability: "IN_STOCK" },
      { part_number: "6Q0-698-451-B", description: "Bromsbelägg fram", oem_price_eur: 42.80, availability: "2 days" },
    ] : [],
  }));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STELLANTIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/api/oem/stellantis/vehicle-status", auth, async (req: Request, res: Response) => {
  const { vin, order_id } = req.query;
  res.json(oemStub("Stellantis", "vehicle-status", {
    vin: vin?.toString()?.toUpperCase(),
    order_id,
    status: "IN_PRODUCTION",
    brands: ["Peugeot", "Citroën", "Opel", "Fiat", "Alfa Romeo", "Jeep", "DS"],
    dealerconnect: "DealerConnect — https://dealerconnect.stellantis.com",
    integration: "Stellantis DealerConnect API",
  }));
});

router.post("/api/oem/stellantis/warranty-claim", auth, async (req: Request, res: Response) => {
  res.json(oemStub("Stellantis", "warranty-claim", {
    submitted: req.body,
    wms_reference: `WMS-${Date.now()}`,
    integration: "Stellantis Warranty Management System (WMS)",
  }));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MERCEDES-BENZ (stub via MO360)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/api/oem/mercedes/vehicle-status/:vin", auth, async (req: Request, res: Response) => {
  res.json(oemStub("Mercedes-Benz", "vehicle-status", {
    vin: req.params.vin.toUpperCase(),
    mo360_status: "AVAILABLE",
    integration: "MO360 DMS-standard + XENTRY workshop diagnostics",
  }));
});

router.post("/api/oem/mercedes/warranty-claim", auth, async (req: Request, res: Response) => {
  res.json(oemStub("Mercedes-Benz", "warranty-claim", {
    submitted: req.body,
    warranty_online_ref: `MB-WO-${Date.now()}`,
    integration: "Mercedes-Benz Warranty Online",
  }));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERIC OEM WEBHOOK RECEIVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/api/oem/webhook/:manufacturer", async (req: Request, res: Response) => {
  const { manufacturer } = req.params;
  const event = req.body;
  const validManufacturers = ["volvo", "bmw", "vwgroup", "stellantis", "mercedes", "ford", "toyota", "hyundai"];

  console.log(`[OEM Webhook] ${manufacturer.toUpperCase()} event received:`, JSON.stringify(event).slice(0, 200));

  // Route to appropriate handler based on event type
  const eventType = event.event_type ?? event.type ?? "unknown";
  let action = "logged";

  if (validManufacturers.includes(manufacturer.toLowerCase())) {
    switch (eventType) {
      case "vehicle_arrived":
        // Update vehicle status to IN_STOCK
        action = "vehicle_status_updated";
        break;
      case "recall_issued":
        // Create recall record
        action = "recall_created";
        break;
      case "tsb_published":
        action = "tsb_logged";
        break;
      case "warranty_approved":
        // Update warranty claim status
        action = "warranty_claim_approved";
        break;
      case "warranty_rejected":
        action = "warranty_claim_rejected";
        break;
      default:
        action = "logged";
    }
  }

  res.json({
    received: true,
    manufacturer,
    event_type: eventType,
    action,
    timestamp: new Date().toISOString(),
    note: "Webhook received. Full processing kräver event-pipeline implementation.",
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OEM KPI REPORTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/api/oem/reporting/monthly", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { year, month, manufacturer } = req.query;

  const now = new Date();
  const targetYear = Number(year ?? now.getFullYear());
  const targetMonth = Number(month ?? now.getMonth() + 1);

  // Sales volume from vehicles
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split("T")[0];

  const { data: soldVehicles } = await supabase
    .from("vehicles")
    .select("make, model, list_price, dealer_cost")
    .eq("org_id", user.org_id)
    .eq("status", "SOLD")
    .gte("sold_date", startDate)
    .lte("sold_date", endDate);

  const { data: csiSurveys } = await supabase
    .from("csi_surveys")
    .select("transaction_type, score, nps_score")
    .eq("org_id", user.org_id)
    .gte("surveyed_at", startDate)
    .lte("surveyed_at", endDate + "T23:59:59");

  const { data: warrantyClaims } = await supabase
    .from("warranty_claims")
    .select("claim_amount, approved_amount, status")
    .eq("org_id", user.org_id)
    .gte("submitted_at", startDate)
    .lte("submitted_at", endDate + "T23:59:59");

  const vehicles = soldVehicles ?? [];
  const surveys = csiSurveys ?? [];
  const claims = warrantyClaims ?? [];

  // Sales by make
  const salesByMake = vehicles.reduce((acc: any, v: any) => {
    const make = manufacturer ? (v.make === manufacturer ? v.make : null) : v.make;
    if (!make) return acc;
    if (!acc[make]) acc[make] = { count: 0, revenue: 0 };
    acc[make].count++;
    acc[make].revenue += v.list_price ?? 0;
    return acc;
  }, {});

  const avgCSI = surveys.length
    ? Math.round((surveys.reduce((s: number, x: any) => s + x.score, 0) / surveys.length) * 10) / 10
    : null;

  const warrantyCost = claims.reduce((s: number, c: any) => s + (c.claim_amount ?? 0), 0);
  const approvedWarranty = claims.reduce((s: number, c: any) => s + (c.approved_amount ?? 0), 0);

  const { data: quotes } = await supabase
    .from("vehicle_quotes")
    .select("financing_type, status")
    .eq("org_id", user.org_id)
    .eq("status", "ACCEPTED")
    .gte("accepted_at", startDate)
    .lte("accepted_at", endDate + "T23:59:59");

  const financeCount = (quotes ?? []).filter((q: any) => q.financing_type && q.financing_type !== "CASH").length;
  const finPenetration = (quotes ?? []).length > 0
    ? Math.round((financeCount / (quotes ?? []).length) * 100)
    : 0;

  res.json({
    period: { year: targetYear, month: targetMonth },
    manufacturer: manufacturer ?? "all",
    kpis: {
      sales_volume: {
        total_vehicles: vehicles.length,
        by_make: salesByMake,
        total_revenue_sek: vehicles.reduce((s: number, v: any) => s + (v.list_price ?? 0), 0),
      },
      csi: {
        surveys_count: surveys.length,
        avg_score_out_of_10: avgCSI,
        oem_format: avgCSI ? `${Math.round((avgCSI / 10) * 100)}%` : null,
      },
      warranty: {
        claims_count: claims.length,
        total_claimed_sek: warrantyCost,
        total_approved_sek: approvedWarranty,
        approval_rate_pct: claims.length > 0 ? Math.round((approvedWarranty / warrantyCost) * 100) : null,
      },
      financing_penetration_pct: finPenetration,
    },
    export_formats: ["OEM_JSON", "XLSX_STUB", "PDF_STUB"],
    note: "Exportformat per OEM: Volvo→VDN, BMW→KOBRA/ESB, VW→CROSS, Stellantis→DealerConnect",
  });
});

export default router;
