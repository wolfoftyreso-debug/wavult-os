import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const OEM_SUPPLIERS: Record<string, { name: string; web: string; api_stub: string }[]> = {
  Volvo: [
    { name: "Volvo Original Parts (VOR)", web: "https://volvooriginalparts.com", api_stub: "ELSA/VIDA" },
    { name: "Mekonomen", web: "https://mekonomen.se", api_stub: "Mekonomen API" },
  ],
  BMW: [
    { name: "BMW Original Parts", web: "https://bmw-motorrad-accessories.com", api_stub: "BMW ISTA" },
    { name: "KFZ-Teile24", web: "https://kfzteile24.de", api_stub: "Generic" },
  ],
  Volkswagen: [
    { name: "VW Genuine Parts (ETKA)", web: "https://etka.de", api_stub: "ETKA API" },
    { name: "InterCar", web: "https://intercar.se", api_stub: "Generic" },
  ],
  Mercedes: [
    { name: "Mercedes-Benz Original", web: "https://mercedes-benz.com/parts", api_stub: "MB Star" },
  ],
  generic: [
    { name: "Autodistribution Sverige", web: "https://autodistribution.se", api_stub: "Generic" },
    { name: "Inter-Team", web: "https://inter-team.se", api_stub: "Generic" },
    { name: "Mekonomen Group", web: "https://mekonomengroup.com", api_stub: "Mekonomen API" },
  ],
};

// ─── GET /api/parts/inventory ─────────────────────────────────────────────────
router.get("/api/parts/inventory", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { make, search, location } = req.query;

  let query = supabase
    .from("parts_inventory")
    .select("*")
    .eq("org_id", user.org_id)
    .order("part_number");

  if (make) query = query.ilike("make", `%${make}%`);
  if (location) query = query.ilike("location", `%${location}%`);
  if (search) {
    query = query.or(`part_number.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/parts/inventory/low-stock ───────────────────────────────────────
router.get("/api/parts/inventory/low-stock", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("parts_inventory")
    .select("*")
    .eq("org_id", user.org_id)
    .filter("quantity_on_hand", "lt", "min_quantity") // raw filter workaround
    .order("part_number");

  // Supabase doesn't support column-to-column comparison directly — post-filter:
  if (error) return res.status(500).json({ error: error.message });
  const lowStock = (data ?? []).filter((p: any) => p.quantity_on_hand < p.min_quantity);
  res.json({ low_stock_count: lowStock.length, parts: lowStock });
});

// ─── POST /api/parts/inventory ────────────────────────────────────────────────
router.post("/api/parts/inventory", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const b = req.body;

  const { data, error } = await supabase
    .from("parts_inventory")
    .upsert({
      org_id: user.org_id,
      part_number: b.part_number,
      description: b.description,
      make: b.make,
      quantity_on_hand: b.quantity_on_hand ?? 0,
      min_quantity: b.min_quantity ?? 2,
      location: b.location,
      cost_price: b.cost_price,
      list_price: b.list_price,
      supplier: b.supplier,
    }, { onConflict: "org_id,part_number" })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ─── PATCH /api/parts/inventory/:part_number ──────────────────────────────────
router.patch("/api/parts/inventory/:part_number", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { quantity_on_hand, quantity_reserved, quantity_on_order, location, cost_price, list_price } = req.body;

  const updates: any = {};
  if (quantity_on_hand !== undefined) updates.quantity_on_hand = quantity_on_hand;
  if (quantity_reserved !== undefined) updates.quantity_reserved = quantity_reserved;
  if (quantity_on_order !== undefined) updates.quantity_on_order = quantity_on_order;
  if (location !== undefined) updates.location = location;
  if (cost_price !== undefined) updates.cost_price = cost_price;
  if (list_price !== undefined) updates.list_price = list_price;

  const { data, error } = await supabase
    .from("parts_inventory")
    .update(updates)
    .eq("org_id", user.org_id)
    .eq("part_number", decodeURIComponent(req.params.part_number))
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── POST /api/parts/orders ───────────────────────────────────────────────────
router.post("/api/parts/orders", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { part_number, quantity, supplier, notes } = req.body;

  // Update parts_inventory quantity_on_order
  const { data: part } = await supabase
    .from("parts_inventory")
    .select("quantity_on_order")
    .eq("org_id", user.org_id)
    .eq("part_number", part_number)
    .single();

  if (part) {
    await supabase
      .from("parts_inventory")
      .update({
        quantity_on_order: (part.quantity_on_order ?? 0) + quantity,
        last_order_date: new Date().toISOString().split("T")[0],
      })
      .eq("org_id", user.org_id)
      .eq("part_number", part_number);
  }

  const order = {
    order_id: crypto.randomUUID(),
    order_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`,
    org_id: user.org_id,
    part_number,
    quantity,
    supplier,
    notes,
    status: "ORDERED",
    ordered_at: new Date().toISOString(),
    estimated_delivery: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0],
  };

  res.status(201).json(order);
});

// ─── GET /api/parts/orders ────────────────────────────────────────────────────
router.get("/api/parts/orders", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  // Return parts with active orders (quantity_on_order > 0)
  const { data, error } = await supabase
    .from("parts_inventory")
    .select("part_number, description, make, quantity_on_order, supplier, last_order_date")
    .eq("org_id", user.org_id)
    .gt("quantity_on_order", 0)
    .order("last_order_date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── PATCH /api/parts/orders/:id/receive ──────────────────────────────────────
router.patch("/api/parts/orders/:id/receive", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { part_number, quantity_received } = req.body;

  const { data: part } = await supabase
    .from("parts_inventory")
    .select("quantity_on_hand, quantity_on_order")
    .eq("org_id", user.org_id)
    .eq("part_number", part_number)
    .single();

  if (!part) return res.status(404).json({ error: "Del ej hittad" });

  const newOnHand = (part.quantity_on_hand ?? 0) + quantity_received;
  const newOnOrder = Math.max(0, (part.quantity_on_order ?? 0) - quantity_received);

  await supabase
    .from("parts_inventory")
    .update({
      quantity_on_hand: newOnHand,
      quantity_on_order: newOnOrder,
      last_received_date: new Date().toISOString().split("T")[0],
    })
    .eq("org_id", user.org_id)
    .eq("part_number", part_number);

  res.json({ part_number, quantity_received, new_on_hand: newOnHand, new_on_order: newOnOrder });
});

// ─── GET /api/parts/pricing/:part_number ──────────────────────────────────────
router.get("/api/parts/pricing/:part_number", auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data, error } = await supabase
    .from("parts_inventory")
    .select("part_number, description, cost_price, list_price, make")
    .eq("org_id", user.org_id)
    .eq("part_number", decodeURIComponent(req.params.part_number))
    .single();

  if (error) return res.status(404).json({ error: "Del ej hittad" });

  const costPrice = data.cost_price ?? 0;
  const listPrice = data.list_price ?? 0;
  const markupPct = costPrice > 0 ? ((listPrice - costPrice) / costPrice) * 100 : 0;

  res.json({
    ...data,
    markup_pct: Math.round(markupPct * 100) / 100,
    dealer_price: listPrice,
    customer_price_incl_vat: Math.round(listPrice * 1.25 * 100) / 100,
    vat_rate: 25,
  });
});

// ─── POST /api/parts/pricing/calculate ───────────────────────────────────────
router.post("/api/parts/pricing/calculate", auth, async (req: Request, res: Response) => {
  const { cost_price, markup_pct, include_vat } = req.body;
  const markup = markup_pct ?? 30;
  const dealerPrice = cost_price * (1 + markup / 100);
  const customerPrice = include_vat ? dealerPrice * 1.25 : dealerPrice;

  res.json({
    cost_price,
    markup_pct: markup,
    dealer_price: Math.round(dealerPrice * 100) / 100,
    customer_price: Math.round(customerPrice * 100) / 100,
    vat_amount: include_vat ? Math.round(dealerPrice * 0.25 * 100) / 100 : 0,
    vat_included: !!include_vat,
  });
});

// ─── GET /api/parts/catalog/search ───────────────────────────────────────────
router.get("/api/parts/catalog/search", auth, async (req: Request, res: Response) => {
  const { vin, description, part_number } = req.query;

  // First search local inventory
  const user = (req as any).user;
  let query = supabase
    .from("parts_inventory")
    .select("*")
    .eq("org_id", user.org_id);

  if (part_number) query = query.ilike("part_number", `%${part_number}%`);
  if (description) query = query.ilike("description", `%${description}%`);

  const { data: localResults } = await query.limit(20);

  res.json({
    local_inventory: localResults ?? [],
    oem_catalog_stub: {
      note: "[STUB] OEM-katalog kräver integration med ETKA (VW/Audi), ELSA (Volvo), TIS (BMW), EPC (Mercedes)",
      vin_queried: vin ?? null,
      search_term: description ?? part_number ?? null,
      sample_results: vin ? [
        { part_number: `OEM-${String(vin).slice(-6)}-001`, description: "Oljefilter (OEM)", oem_price: 285, availability: "IN_STOCK" },
        { part_number: `OEM-${String(vin).slice(-6)}-002`, description: "Luftfilter (OEM)", oem_price: 420, availability: "2-3 dagar" },
      ] : [],
    },
  });
});

// ─── GET /api/parts/suppliers ─────────────────────────────────────────────────
router.get("/api/parts/suppliers", auth, async (req: Request, res: Response) => {
  const { make } = req.query;
  const suppliers = make
    ? (OEM_SUPPLIERS[make as string] ?? OEM_SUPPLIERS.generic)
    : { ...OEM_SUPPLIERS };

  res.json({ make: make ?? "all", suppliers });
});

export default router;
