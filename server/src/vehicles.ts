import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─── Auth helper ──────────────────────────────────────────────────────────────
const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ─── VIN validation (ISO 3779) ────────────────────────────────────────────────
const WMI: Record<string, string> = {
  YV1: "Volvo Cars",   YV2: "Volvo Trucks", WBA: "BMW",     WBS: "BMW M",
  WBY: "BMW i",        WAU: "Audi",         WVW: "Volkswagen", VSS: "SEAT",
  TM9: "Tesla EMEA",   VF1: "Renault",      VF3: "Peugeot", VF7: "Citroën",
  ZFF: "Ferrari",      ZAR: "Alfa Romeo",   SAL: "Land Rover", SAJ: "Jaguar",
  SCA: "Rolls-Royce",  TRU: "Audi Hungary", YS2: "Scania",  YS3: "Saab",
  W0L: "Opel",         VSK: "Nissan Spain", TMB: "ŠKODA",
};

const MODEL_YEAR_MAP: Record<string, number> = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016,
  H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023,
  R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2009, Y: 2008,
};

const COUNTRY_MAP: Record<string, string> = {
  AA: "South Africa", AC: "South Africa", JA: "Japan", JF: "Japan",
  KL: "South Korea",  L8: "China",        LA: "China", LB: "China",
  MA: "India",        NM: "Mexico",       SA: "United Kingdom",
  SB: "United Kingdom", TM: "Czech Republic", TR: "Hungary",
  VF: "France",       VN: "France",       VS: "Spain",
  VW: "Germany",      WA: "Germany",      WB: "Germany",
  WD: "Germany",      WF: "Germany",      WV: "Germany",
  XL: "Netherlands",  YS: "Sweden",       YV: "Sweden",
  ZA: "Italy",        ZD: "Italy",        ZF: "Italy",
};

function validateVIN(vin: string): { valid: boolean; errors: string[]; decoded?: any } {
  const errors: string[] = [];
  if (!vin || vin.length !== 17) {
    errors.push("VIN måste vara exakt 17 tecken");
    return { valid: false, errors };
  }
  const upper = vin.toUpperCase();
  if (/[IOQ]/.test(upper)) errors.push("VIN får inte innehålla I, O eller Q");
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(upper)) errors.push("Ogiltiga tecken i VIN");

  // Check digit (position 9, North American standard)
  const values: Record<string, number> = {
    A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,
    S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,'0':0,'1':1,'2':2,'3':3,'4':4,
    '5':5,'6':6,'7':7,'8':8,'9':9
  };
  const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
  const checkMap: Record<number, string> = {0:'0',1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'X'};
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (values[upper[i]] ?? 0) * weights[i];
  }
  const check = checkMap[sum % 11];
  const wmi = upper.substring(0, 3);
  const countryPrefix = upper.substring(0, 2);
  const yearChar = upper[9];
  const modelYear = MODEL_YEAR_MAP[yearChar] ?? null;

  return {
    valid: errors.length === 0,
    errors,
    decoded: {
      wmi,
      manufacturer: WMI[wmi] ?? "Okänd tillverkare",
      country: COUNTRY_MAP[countryPrefix] ?? "Okänt land",
      model_year: modelYear,
      year_code: yearChar,
      check_digit: upper[8],
      calculated_check: check,
      check_valid: upper[8] === check,
      vds: upper.substring(3, 9),
      vis: upper.substring(9, 17),
      serial: upper.substring(11, 17),
    },
  };
}

// ─── POST /api/vehicles/validate-vin ─────────────────────────────────────────
router.post("/api/vehicles/validate-vin", auth, async (req: Request, res: Response) => {
  const { vin } = req.body;
  const result = validateVIN(vin);
  // Transportstyrelsen stub — ready for real API
  const transportstyrelsenStub = result.valid ? {
    registered: true,
    status: "I_TRAFIK",
    inspection_valid_until: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split("T")[0],
    tax_class: "PERSONBIL",
    note: "[STUB] Riktig Transportstyrelsen-integration kräver API-nyckel via Bolagsverket",
  } : null;
  res.json({ ...result, transportstyrelsen: transportstyrelsenStub });
});

// ─── GET /api/vehicles/transportstyrelsen/:reg ────────────────────────────────
router.get("/api/vehicles/transportstyrelsen/:reg_number", auth, async (req: Request, res: Response) => {
  const { reg_number } = req.params;
  // STUB — ready for Transportstyrelsen Fordonsregistret API
  // Real API: https://fordonsuppgifter.transportstyrelsen.se (kräver avtal)
  res.json({
    stub: true,
    registration_number: reg_number.toUpperCase(),
    owner: { masked: "Erik S***nsson", municipality: "Stockholm" },
    vehicle: {
      make: "Volvo",
      model: "XC60",
      model_year: 2023,
      color: "Svart",
      fuel_type: "PHEV",
      co2_g_km: 18,
      weight_kg: 2050,
      engine_cc: 1969,
      horsepower: 340,
    },
    registration: {
      first_registered: "2023-03-15",
      status: "I_TRAFIK",
      deregistered_at: null,
    },
    inspection: {
      last_passed: "2024-02-10",
      valid_until: "2026-02-28",
      station: "Opus Bilprovning",
    },
    encumbrances: {
      has_debt: false,
      debt_amount: 0,
      creditor: null,
    },
    note: "[STUB] Transportstyrelsen API kräver avtal — se https://www.transportstyrelsen.se/sv/webbtjanster-och-apier/",
  });
});

// ─── POST /api/vehicles/inventory ────────────────────────────────────────────
router.post("/api/vehicles/inventory", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body = req.body;

  const vinResult = validateVIN(body.vin);
  if (!vinResult.valid) {
    return res.status(400).json({ error: "Ogiltigt VIN", details: vinResult.errors });
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      org_id: user.org_id,
      vin: body.vin.toUpperCase(),
      registration_number: body.registration_number?.toUpperCase(),
      make: body.make,
      model: body.model,
      model_year: body.model_year,
      variant: body.variant,
      color_code: body.color_code,
      interior_code: body.interior_code,
      engine_code: body.engine_code,
      fuel_type: body.fuel_type,
      transmission: body.transmission,
      drive: body.drive,
      odometer_km: body.odometer_km ?? 0,
      condition: body.condition ?? "NEW",
      status: body.status ?? "IN_STOCK",
      location: body.location,
      list_price: body.list_price,
      dealer_cost: body.dealer_cost,
      equipment_codes: body.equipment_codes ?? [],
      equipment_text: body.equipment_text,
      arrival_date: body.arrival_date ?? new Date().toISOString().split("T")[0],
      purchase_date: body.purchase_date,
      notes: body.notes,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ ...data, vin_decoded: vinResult.decoded });
});

// ─── GET /api/vehicles/inventory/valuation ────────────────────────────────────
router.get("/api/vehicles/inventory/valuation", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("org_id", user.org_id)
    .not("status", "in", '("SOLD","SCRAPPED")')
    .order("arrival_date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const now = Date.now();
  const vehicles = (data ?? []).map((v: any) => {
    const arrivalDate = v.arrival_date ? new Date(v.arrival_date) : new Date(v.created_at);
    const daysInStock = Math.floor((now - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
    // Simple depreciation stub — real implementation uses Bilweb/Kvd/Blocket data
    const depreciationFactor = Math.max(0.7, 1 - (daysInStock / 365) * 0.15);
    const estimatedValue = (v.list_price ?? 0) * depreciationFactor;
    return {
      ...v,
      days_in_stock_computed: daysInStock,
      estimated_market_value: Math.round(estimatedValue),
      flagged_old: daysInStock > 90,
    };
  });

  const totalListValue = vehicles.reduce((s: number, v: any) => s + (v.list_price ?? 0), 0);
  const totalEstimatedValue = vehicles.reduce((s: number, v: any) => s + v.estimated_market_value, 0);
  const avgDaysInStock = vehicles.length
    ? Math.round(vehicles.reduce((s: number, v: any) => s + v.days_in_stock_computed, 0) / vehicles.length)
    : 0;
  const flaggedOld = vehicles.filter((v: any) => v.flagged_old);

  res.json({
    vehicles,
    summary: {
      total_vehicles: vehicles.length,
      total_list_value: totalListValue,
      total_estimated_value: totalEstimatedValue,
      avg_days_in_stock: avgDaysInStock,
      flagged_over_90_days: flaggedOld.length,
      flagged_vehicles: flaggedOld.map((v: any) => ({ vin: v.vin, make: v.make, model: v.model, days: v.days_in_stock_computed })),
    },
  });
});

// ─── GET /api/vehicles/inventory ─────────────────────────────────────────────
router.get("/api/vehicles/inventory", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, make, model, fuel_type, condition, location } = req.query;

  let query = supabase
    .from("vehicles")
    .select("*")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (make) query = query.ilike("make", `%${make}%`);
  if (model) query = query.ilike("model", `%${model}%`);
  if (fuel_type) query = query.eq("fuel_type", fuel_type);
  if (condition) query = query.eq("condition", condition);
  if (location) query = query.ilike("location", `%${location}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/vehicles/search ─────────────────────────────────────────────────
router.get("/api/vehicles/search", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { make, model, fuel_type, price_min, price_max, condition, location } = req.query;

  let query = supabase
    .from("vehicles")
    .select("id, vin, make, model, model_year, variant, fuel_type, transmission, drive, odometer_km, condition, status, location, list_price, equipment_codes, color_code")
    .eq("org_id", user.org_id)
    .not("status", "in", '("SOLD","SCRAPPED")')
    .order("list_price");

  if (make) query = query.ilike("make", `%${make}%`);
  if (model) query = query.ilike("model", `%${model}%`);
  if (fuel_type) query = query.eq("fuel_type", fuel_type);
  if (condition) query = query.eq("condition", condition);
  if (location) query = query.ilike("location", `%${location}%`);
  if (price_min) query = query.gte("list_price", Number(price_min));
  if (price_max) query = query.lte("list_price", Number(price_max));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ results: data, count: data?.length ?? 0 });
});

// ─── GET /api/vehicles/inventory/:vin ────────────────────────────────────────
router.get("/api/vehicles/inventory/:vin", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("vin", req.params.vin.toUpperCase())
    .single();

  if (error) return res.status(404).json({ error: "Fordon ej hittat" });
  const vinDecoded = validateVIN(data.vin);
  res.json({ ...data, vin_decoded: vinDecoded.decoded });
});

// ─── PATCH /api/vehicles/inventory/:vin/status ───────────────────────────────
router.patch("/api/vehicles/inventory/:vin/status", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, notes } = req.body;
  const validStatuses = ["IN_STOCK", "ORDERED", "IN_TRANSIT", "RESERVED", "SOLD", "LOANER", "SCRAPPED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Ogiltigt status. Tillåtna: ${validStatuses.join(", ")}` });
  }

  const updateData: any = { status, updated_at: new Date().toISOString() };
  if (status === "SOLD") updateData.sold_date = new Date().toISOString().split("T")[0];
  if (notes) updateData.notes = notes;

  const { data, error } = await supabase
    .from("vehicles")
    .update(updateData)
    .eq("org_id", user.org_id)
    .eq("vin", req.params.vin.toUpperCase())
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── DELETE /api/vehicles/inventory/:vin (soft delete) ───────────────────────
router.delete("/api/vehicles/inventory/:vin", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("vehicles")
    .update({ status: "SCRAPPED", updated_at: new Date().toISOString() })
    .eq("org_id", user.org_id)
    .eq("vin", req.params.vin.toUpperCase())
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Fordon markerat som skrotat (soft delete)", vehicle: data });
});

export default router;
