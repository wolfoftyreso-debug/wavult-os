import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

function genNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${year}-${seq}`;
}

// ─── Finansieringsberäkning (KkrL 2010:1846) ─────────────────────────────────
function calculateFinancing(amount: number, termMonths: number, downPayment: number, annualRate: number) {
  const principal = amount - downPayment;
  if (principal <= 0) return { monthly_payment: 0, total_cost: downPayment, effective_rate: 0, total_interest: 0 };

  const monthlyRate = annualRate / 100 / 12;
  let monthlyPayment: number;

  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  const totalCost = downPayment + monthlyPayment * termMonths;
  const totalInterest = totalCost - amount;

  // Effektiv ränta (ÅRKR) — Newton-Raphson approximation
  // Per KkrL 6 kap. 7 § och ÅRKR-förordningen
  let effectiveRate = annualRate;
  for (let i = 0; i < 50; i++) {
    const r = effectiveRate / 100 / 12;
    const pv = r === 0
      ? monthlyPayment * termMonths
      : monthlyPayment * (1 - Math.pow(1 + r, -termMonths)) / r;
    const diff = pv - principal;
    if (Math.abs(diff) < 0.01) break;
    effectiveRate += diff > 0 ? 0.001 : -0.001;
  }

  return {
    principal,
    monthly_payment: Math.round(monthlyPayment * 100) / 100,
    total_payments: termMonths,
    total_cost: Math.round(totalCost * 100) / 100,
    total_interest: Math.round(totalInterest * 100) / 100,
    nominal_rate: annualRate,
    effective_rate_arkr: Math.round(effectiveRate * 100) / 100, // ÅRKR
    compliance_note: "Beräknat enligt KkrL (2010:1846) och konsumentkreditdirektivet 2023/2225/EU",
  };
}

// ─── POST /api/vehicle-sales/quotes ──────────────────────────────────────────
router.post("/api/vehicle-sales/quotes", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const b = req.body;

  // Calculate list price from vehicle
  let listPrice = 0;
  if (b.vehicle_vin) {
    const { data: veh } = await supabase
      .from("vehicles")
      .select("list_price, make, model")
      .eq("vin", b.vehicle_vin.toUpperCase())
      .single();
    if (veh) listPrice = veh.list_price ?? 0;
  }

  const accessoriesTotal = (b.accessories ?? []).reduce((s: number, a: any) => s + (a.price ?? 0), 0);
  const discountsTotal = (b.discounts ?? []).reduce((s: number, d: any) => s + (d.amount ?? 0), 0);
  const tradeInValue = b.trade_in_valuation ?? 0;
  const netPrice = listPrice + accessoriesTotal - discountsTotal - tradeInValue;

  let financing: any = {};
  if (b.financing && b.financing.type !== "CASH") {
    financing = calculateFinancing(
      netPrice,
      b.financing.term_months ?? 48,
      b.financing.down_payment ?? 0,
      b.financing.interest_rate ?? 6.95,
    );
  }

  const { data, error } = await supabase
    .from("vehicle_quotes")
    .insert({
      org_id: user.org_id,
      quote_number: genNumber("Q"),
      customer_id: b.customer_id,
      sales_person_id: user.id,
      vehicle_vin: b.vehicle_vin,
      vehicle_spec: b.vehicle_order,
      trade_in_vin: b.trade_in_vin,
      trade_in_value: tradeInValue,
      financing_type: b.financing?.type,
      financing_details: { ...b.financing, ...financing },
      accessories: b.accessories,
      discounts: b.discounts,
      list_price: listPrice,
      net_price: netPrice,
      monthly_payment: financing.monthly_payment ?? null,
      effective_rate: financing.effective_rate_arkr ?? null,
      status: "DRAFT",
      valid_until: b.valid_until ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
      notes: b.notes,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    ...data,
    summary: {
      list_price: listPrice,
      accessories: accessoriesTotal,
      discounts: discountsTotal,
      trade_in: tradeInValue,
      net_price: netPrice,
      net_price_incl_vat: Math.round(netPrice * 1.25 * 100) / 100,
      financing,
    },
    pdf_stub: `[STUB] PDF-offert: /api/vehicle-sales/quotes/${data.id}/pdf`,
  });
});

// ─── GET /api/vehicle-sales/quotes ───────────────────────────────────────────
router.get("/api/vehicle-sales/quotes", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, sales_person_id } = req.query;

  let query = supabase
    .from("vehicle_quotes")
    .select("*")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (sales_person_id) query = query.eq("sales_person_id", sales_person_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/vehicle-sales/quotes/:id ────────────────────────────────────────
router.get("/api/vehicle-sales/quotes/:id", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("vehicle_quotes")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Offert ej hittad" });
  res.json({ ...data, pdf_stub: `[STUB] /api/vehicle-sales/quotes/${data.id}/pdf` });
});

// ─── PATCH /api/vehicle-sales/quotes/:id/accept ───────────────────────────────
router.patch("/api/vehicle-sales/quotes/:id/accept", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("vehicle_quotes")
    .update({ status: "ACCEPTED", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", user.org_id)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Reserve vehicle
  if (data.vehicle_vin) {
    await supabase
      .from("vehicles")
      .update({ status: "RESERVED", updated_at: new Date().toISOString() })
      .eq("vin", data.vehicle_vin);
  }

  res.json({ ...data, next_step: "POST /api/vehicle-sales/contracts to create contract" });
});

// ─── POST /api/vehicle-sales/contracts ───────────────────────────────────────
router.post("/api/vehicle-sales/contracts", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { quote_id, signing_method } = req.body;

  const { data: quote } = await supabase
    .from("vehicle_quotes")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("id", quote_id)
    .single();

  if (!quote) return res.status(404).json({ error: "Offert ej hittad" });

  const warrantyExpires = new Date();
  warrantyExpires.setFullYear(warrantyExpires.getFullYear() + 3); // KköpL 2022:260 — 3 år

  const { data, error } = await supabase
    .from("vehicle_contracts")
    .insert({
      org_id: user.org_id,
      contract_number: genNumber("KT"),
      quote_id,
      customer_id: quote.customer_id,
      vehicle_vin: quote.vehicle_vin,
      signing_method: signing_method ?? "physical",
      warranty_expires: warrantyExpires.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    ...data,
    signing_stub: signing_method === "bankid"
      ? "[STUB] BankID-signering kräver integration med Scrive eller Visma Sign"
      : "Fysisk signatur — skriv ut kontrakt",
    warranty_note: `Reklamationsrätt t.o.m. ${warrantyExpires.toISOString().split("T")[0]} (KköpL 2022:260, 3 år)`,
  });
});

// ─── POST /api/vehicle-sales/trade-in/valuate ─────────────────────────────────
router.post("/api/vehicle-sales/trade-in/valuate", auth, async (req: Request, res: Response) => {
  const { vin, reg_number, odometer_km, condition, known_issues } = req.body;

  // Simple valuation model — real: integrate with Kvd.se, Bilweb, Autovista
  const conditionFactors: Record<string, number> = {
    EXCELLENT: 0.85,
    GOOD: 0.75,
    FAIR: 0.65,
    POOR: 0.50,
  };
  const conditionFactor = conditionFactors[condition] ?? 0.70;
  const kmPenalty = Math.max(0, (odometer_km - 10000) / 10000) * 0.01;
  const issuesPenalty = (known_issues?.length ?? 0) * 0.03;
  const estimatedBase = 150000; // Placeholder — would come from market data API
  const estimatedValue = Math.round(estimatedBase * conditionFactor * (1 - Math.min(kmPenalty, 0.25)) * (1 - issuesPenalty));

  res.json({
    vin: vin?.toUpperCase(),
    reg_number: reg_number?.toUpperCase(),
    odometer_km,
    condition,
    known_issues: known_issues ?? [],
    estimated_trade_in_value: estimatedValue,
    transportstyrelsen_stub: {
      encumbrances: { has_debt: false, amount: 0 },
      inspection_valid: true,
      note: "[STUB] Verifierare skuldsaldo via Transportstyrelsen/SPAR",
    },
    market_data_stub: {
      note: "[STUB] Marknadsvärde från Kvd.se/Bilweb/Autovista kräver API-avtal",
      sources: ["Kvd.se", "Bilweb.se", "Autovista Group"],
    },
    valid_hours: 24,
  });
});

// ─── POST /api/vehicle-sales/financing/calculate ──────────────────────────────
router.post("/api/vehicle-sales/financing/calculate", auth, async (req: Request, res: Response) => {
  const { amount, term_months, down_payment, interest_rate } = req.body;
  const result = calculateFinancing(amount, term_months ?? 48, down_payment ?? 0, interest_rate ?? 6.95);
  res.json(result);
});

// ─── GET /api/vehicle-sales/financing/providers ───────────────────────────────
router.get("/api/vehicle-sales/financing/providers", auth, (_req: Request, res: Response) => {
  res.json([
    { name: "Volvo Financial Services", makes: ["Volvo"], products: ["LOAN", "LEASING", "PRIVATE_LEASE"], web: "https://volvocars.com/sv-se/support/articles/financing/" },
    { name: "BMW Financial Services", makes: ["BMW", "MINI"], products: ["LOAN", "LEASING", "PRIVATE_LEASE"], web: "https://bmw.se" },
    { name: "Mercedes-Benz Financial Services", makes: ["Mercedes-Benz", "AMG"], products: ["LOAN", "LEASING", "PRIVATE_LEASE"] },
    { name: "Volkswagen Finans", makes: ["VW", "Audi", "ŠKODA", "SEAT", "Porsche"], products: ["LOAN", "LEASING"] },
    { name: "Santander Consumer Bank", makes: ["*"], products: ["LOAN"], web: "https://santanderconsumer.se" },
    { name: "LeasePlan", makes: ["*"], products: ["LEASING", "PRIVATE_LEASE"], web: "https://leaseplan.com/sv-se" },
    { name: "Nordea Finans", makes: ["*"], products: ["LOAN", "LEASING"], web: "https://nordea.se" },
  ]);
});

// ─── POST /api/vehicle-sales/delivery ────────────────────────────────────────
router.post("/api/vehicle-sales/delivery", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { contract_id, delivery_date, technician_id, checklist_completed, fuel_level, odometer } = req.body;

  const { data: contract } = await supabase
    .from("vehicle_contracts")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("id", contract_id)
    .single();

  if (!contract) return res.status(404).json({ error: "Kontrakt ej hittat" });

  // Update contract
  await supabase
    .from("vehicle_contracts")
    .update({
      delivered_at: delivery_date ?? new Date().toISOString(),
      delivery_technician_id: technician_id,
      delivery_odometer: odometer,
      delivery_fuel_level: fuel_level,
    })
    .eq("id", contract_id);

  // Mark vehicle as SOLD
  if (contract.vehicle_vin) {
    await supabase
      .from("vehicles")
      .update({
        status: "SOLD",
        sold_date: new Date().toISOString().split("T")[0],
        odometer_km: odometer,
        updated_at: new Date().toISOString(),
      })
      .eq("vin", contract.vehicle_vin);
  }

  res.json({
    contract_id,
    vehicle_vin: contract.vehicle_vin,
    delivered_at: delivery_date ?? new Date().toISOString(),
    delivery_protocol_stub: `[STUB] Leveransprotokoll PDF: /api/vehicle-sales/delivery/${contract_id}/pdf`,
    triggered_actions: [
      { action: "welcome_email", status: "[STUB] Välkomstmail triggas via notifikationssystem" },
      { action: "service_reminder_12mo", status: "[STUB] Service-påminnelse om 12 månader" },
      { action: "csi_survey_7days", status: "[STUB] Nöjdhetsundersökning om 7 dagar" },
    ],
  });
});

// ─── GET /api/vehicle-sales/statistics ───────────────────────────────────────
router.get("/api/vehicle-sales/statistics", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const { data: soldVehicles } = await supabase
    .from("vehicles")
    .select("make, model, list_price, dealer_cost, sold_date, arrival_date")
    .eq("org_id", user.org_id)
    .eq("status", "SOLD")
    .not("sold_date", "is", null)
    .order("sold_date", { ascending: false });

  const vehicles = soldVehicles ?? [];
  const totalSold = vehicles.length;
  const avgMargin = vehicles.reduce((s: number, v: any) => {
    const margin = ((v.list_price ?? 0) - (v.dealer_cost ?? 0));
    return s + margin;
  }, 0) / Math.max(totalSold, 1);

  const avgDaysToSell = vehicles.reduce((s: number, v: any) => {
    if (!v.arrival_date || !v.sold_date) return s;
    const days = Math.floor((new Date(v.sold_date).getTime() - new Date(v.arrival_date).getTime()) / (1000 * 60 * 60 * 24));
    return s + days;
  }, 0) / Math.max(totalSold, 1);

  const byMake = vehicles.reduce((acc: any, v: any) => {
    acc[v.make] = (acc[v.make] ?? 0) + 1;
    return acc;
  }, {});

  const { data: quotes } = await supabase
    .from("vehicle_quotes")
    .select("status")
    .eq("org_id", user.org_id);

  const totalQuotes = quotes?.length ?? 0;
  const acceptedQuotes = quotes?.filter((q: any) => q.status === "ACCEPTED").length ?? 0;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  res.json({
    period: "all_time",
    sales: {
      total_sold: totalSold,
      avg_margin_sek: Math.round(avgMargin),
      avg_days_to_sell: Math.round(avgDaysToSell),
      by_make: byMake,
    },
    quotes: {
      total: totalQuotes,
      accepted: acceptedQuotes,
      conversion_rate_pct: conversionRate,
    },
  });
});

export default router;
