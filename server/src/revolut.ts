import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Revolut Business API — Virtuella kort per projekt/kund
// BAS-kontokoppling för bokföring
// ---------------------------------------------------------------------------

const REVOLUT_BASE = "https://b2b.revolut.com/api/1.0";

function revolutHeaders(): Record<string, string> {
  const apiKey = process.env.REVOLUT_API_KEY || "";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

// Auth middleware — kräver inloggad användare
const auth = (req: Request, res: Response, next: any) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ---------------------------------------------------------------------------
// GET /api/revolut/accounts — Lista Revolut-konton
// ---------------------------------------------------------------------------
router.get("/accounts", auth, async (req: Request, res: Response) => {
  try {
    const resp = await fetch(`${REVOLUT_BASE}/accounts`, {
      headers: revolutHeaders(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: "Revolut API error", details: err });
    }

    const accounts = await resp.json();
    return res.json(accounts);
  } catch (err: any) {
    console.error("[revolut] accounts error:", err.message);
    return res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/revolut/cards — Lista virtuella kort (från DB + Revolut)
// ---------------------------------------------------------------------------
router.get("/cards", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { project_id, customer_id } = req.query;

    let query = supabase
      .from("revolut_cards")
      .select("*")
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    if (project_id) query = query.eq("project_id", project_id as string);
    if (customer_id) query = query.eq("customer_id", customer_id as string);

    const { data: cards, error } = await query;
    if (error) throw error;

    return res.json(cards || []);
  } catch (err: any) {
    console.error("[revolut] list cards error:", err.message);
    return res.status(500).json({ error: "Failed to fetch cards" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/revolut/cards — Skapa nytt virtuellt kort
// body: { name, spending_limit, spending_limit_period, currency, project_id, customer_id, bas_account, notes }
// ---------------------------------------------------------------------------
router.post("/cards", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      spending_limit,
      spending_limit_period = "monthly",
      currency = "SEK",
      project_id,
      customer_id,
      bas_account = "5890",
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Card name is required" });
    }

    // 1. Skapa kort i Revolut
    const revolutPayload: any = {
      display_name: name,
      format: "virtual",
    };

    if (spending_limit) {
      revolutPayload.spending_limits = [
        {
          amount: Math.round(spending_limit * 100), // Revolut använder minor units
          currency: currency || "SEK",
          period: spending_limit_period,
        },
      ];
    }

    const revolutResp = await fetch(`${REVOLUT_BASE}/cards`, {
      method: "POST",
      headers: revolutHeaders(),
      body: JSON.stringify(revolutPayload),
    });

    let revolutCardId: string | null = null;
    let lastFour: string | null = null;

    if (revolutResp.ok) {
      const revolutCard = await revolutResp.json();
      revolutCardId = revolutCard.id || null;
      lastFour = revolutCard.last_digits || null;
    } else {
      // Logga fel men fortsätt — vi sparar i DB ändå (sandbox/dev-läge)
      const errText = await revolutResp.text();
      console.warn("[revolut] Card creation warning:", errText);
    }

    // 2. Spara i DB
    const { data: card, error: dbError } = await supabase
      .from("revolut_cards")
      .insert({
        org_id: user.org_id,
        revolut_card_id: revolutCardId,
        card_name: name,
        last_four: lastFour,
        project_id: project_id || null,
        customer_id: customer_id || null,
        spending_limit: spending_limit || null,
        spending_limit_period,
        currency,
        bas_account,
        notes: notes || null,
        status: "active",
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(201).json({
      card,
      revolut_created: !!revolutCardId,
      message: revolutCardId
        ? "Virtuellt kort skapat och kopplat till Revolut"
        : "Kort sparat i DB (Revolut API ej tillgänglig)",
    });
  } catch (err: any) {
    console.error("[revolut] create card error:", err.message);
    return res.status(500).json({ error: "Failed to create card" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/revolut/cards/:id/transactions — Transaktioner per kort
// ---------------------------------------------------------------------------
router.get("/cards/:id/transactions", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { from, to, count = "50" } = req.query;

    // Verifiera att kortet tillhör org
    const { data: card, error: cardError } = await supabase
      .from("revolut_cards")
      .select("*")
      .eq("id", id)
      .eq("org_id", user.org_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (!card.revolut_card_id) {
      return res.json({ transactions: [], card, message: "Inget Revolut-kort kopplat" });
    }

    // Hämta transaktioner från Revolut
    const params = new URLSearchParams({
      card_id: card.revolut_card_id,
      count: count as string,
    });
    if (from) params.append("from", from as string);
    if (to) params.append("to", to as string);

    const revolutResp = await fetch(`${REVOLUT_BASE}/transactions?${params}`, {
      headers: revolutHeaders(),
    });

    if (!revolutResp.ok) {
      const err = await revolutResp.text();
      return res.status(revolutResp.status).json({ error: "Revolut API error", details: err });
    }

    const transactions = await revolutResp.json();

    // Berika med BAS-konto
    const enriched = (Array.isArray(transactions) ? transactions : []).map((tx: any) => ({
      ...tx,
      bas_account: card.bas_account,
      card_name: card.card_name,
      project_id: card.project_id,
      customer_id: card.customer_id,
    }));

    return res.json({ transactions: enriched, card });
  } catch (err: any) {
    console.error("[revolut] transactions error:", err.message);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/revolut/cards/:id/limit — Uppdatera spending limit
// body: { spending_limit, spending_limit_period }
// ---------------------------------------------------------------------------
router.patch("/cards/:id/limit", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { spending_limit, spending_limit_period = "monthly" } = req.body;

    if (!spending_limit) {
      return res.status(400).json({ error: "spending_limit is required" });
    }

    const { data: card, error: cardError } = await supabase
      .from("revolut_cards")
      .select("*")
      .eq("id", id)
      .eq("org_id", user.org_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Uppdatera i Revolut om kopplat
    if (card.revolut_card_id) {
      const revolutResp = await fetch(`${REVOLUT_BASE}/cards/${card.revolut_card_id}/spending-limits`, {
        method: "POST",
        headers: revolutHeaders(),
        body: JSON.stringify({
          limits: [
            {
              amount: Math.round(spending_limit * 100),
              currency: card.currency,
              period: spending_limit_period,
            },
          ],
        }),
      });

      if (!revolutResp.ok) {
        const err = await revolutResp.text();
        console.warn("[revolut] Update limit warning:", err);
      }
    }

    // Uppdatera i DB
    const { data: updated, error: updateError } = await supabase
      .from("revolut_cards")
      .update({ spending_limit, spending_limit_period })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({ card: updated, message: "Spending limit uppdaterat" });
  } catch (err: any) {
    console.error("[revolut] update limit error:", err.message);
    return res.status(500).json({ error: "Failed to update limit" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/revolut/cards/:id/freeze — Frys kort
// ---------------------------------------------------------------------------
router.post("/cards/:id/freeze", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data: card, error: cardError } = await supabase
      .from("revolut_cards")
      .select("*")
      .eq("id", id)
      .eq("org_id", user.org_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (card.revolut_card_id) {
      const revolutResp = await fetch(`${REVOLUT_BASE}/cards/${card.revolut_card_id}/freeze`, {
        method: "POST",
        headers: revolutHeaders(),
      });

      if (!revolutResp.ok) {
        const err = await revolutResp.text();
        console.warn("[revolut] Freeze warning:", err);
      }
    }

    const { data: updated } = await supabase
      .from("revolut_cards")
      .update({ status: "frozen" })
      .eq("id", id)
      .select()
      .single();

    return res.json({ card: updated, message: "Kort fryst" });
  } catch (err: any) {
    console.error("[revolut] freeze error:", err.message);
    return res.status(500).json({ error: "Failed to freeze card" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/revolut/cards/:id/unfreeze — Tina upp kort
// ---------------------------------------------------------------------------
router.post("/cards/:id/unfreeze", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data: card, error: cardError } = await supabase
      .from("revolut_cards")
      .select("*")
      .eq("id", id)
      .eq("org_id", user.org_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (card.revolut_card_id) {
      const revolutResp = await fetch(`${REVOLUT_BASE}/cards/${card.revolut_card_id}/unfreeze`, {
        method: "POST",
        headers: revolutHeaders(),
      });

      if (!revolutResp.ok) {
        const err = await revolutResp.text();
        console.warn("[revolut] Unfreeze warning:", err);
      }
    }

    const { data: updated } = await supabase
      .from("revolut_cards")
      .update({ status: "active" })
      .eq("id", id)
      .select()
      .single();

    return res.json({ card: updated, message: "Kort aktiverat" });
  } catch (err: any) {
    console.error("[revolut] unfreeze error:", err.message);
    return res.status(500).json({ error: "Failed to unfreeze card" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/revolut/cards/:id/terminate — Avsluta kort permanent
// ---------------------------------------------------------------------------
router.post("/cards/:id/terminate", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data: card, error: cardError } = await supabase
      .from("revolut_cards")
      .select("*")
      .eq("id", id)
      .eq("org_id", user.org_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (card.revolut_card_id) {
      const revolutResp = await fetch(`${REVOLUT_BASE}/cards/${card.revolut_card_id}/terminate`, {
        method: "POST",
        headers: revolutHeaders(),
      });

      if (!revolutResp.ok) {
        const err = await revolutResp.text();
        console.warn("[revolut] Terminate warning:", err);
      }
    }

    const { data: updated } = await supabase
      .from("revolut_cards")
      .update({ status: "terminated" })
      .eq("id", id)
      .select()
      .single();

    return res.json({ card: updated, message: "Kort avslutat permanent" });
  } catch (err: any) {
    console.error("[revolut] terminate error:", err.message);
    return res.status(500).json({ error: "Failed to terminate card" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/revolut/cost-report — Kostnadsrapport per projekt med BAS-konto
// Query: ?project_id=uuid&from=ISO&to=ISO
// ---------------------------------------------------------------------------
router.get("/cost-report", auth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { project_id, from, to } = req.query;

    // Hämta alla kort för orgen (filtrerat per projekt om angivet)
    let cardQuery = supabase
      .from("revolut_cards")
      .select("id, revolut_card_id, card_name, last_four, project_id, customer_id, spending_limit, currency, bas_account, status")
      .eq("org_id", user.org_id);

    if (project_id) cardQuery = cardQuery.eq("project_id", project_id as string);

    const { data: cards, error: cardsError } = await cardQuery;
    if (cardsError) throw cardsError;

    // Hämta transaktioner per kort från Revolut och aggregera
    const report: any[] = [];

    for (const card of cards || []) {
      let transactions: any[] = [];

      if (card.revolut_card_id) {
        const params = new URLSearchParams({ card_id: card.revolut_card_id, count: "200" });
        if (from) params.append("from", from as string);
        if (to) params.append("to", to as string);

        try {
          const txResp = await fetch(`${REVOLUT_BASE}/transactions?${params}`, {
            headers: revolutHeaders(),
          });
          if (txResp.ok) {
            const txData = await txResp.json();
            transactions = Array.isArray(txData) ? txData : [];
          }
        } catch {
          // Skip om Revolut ej svarar
        }
      }

      const totalSpend = transactions
        .filter((tx: any) => tx.type === "card_payment" && tx.state === "completed")
        .reduce((sum: number, tx: any) => sum + Math.abs(tx.legs?.[0]?.amount || 0) / 100, 0);

      report.push({
        card_id: card.id,
        revolut_card_id: card.revolut_card_id,
        card_name: card.card_name,
        last_four: card.last_four,
        project_id: card.project_id,
        customer_id: card.customer_id,
        bas_account: card.bas_account,
        currency: card.currency,
        spending_limit: card.spending_limit,
        status: card.status,
        total_spend: totalSpend,
        transaction_count: transactions.length,
        transactions: transactions.slice(0, 10), // Top 10 per rapport
      });
    }

    // Summering per BAS-konto
    const basSummary: Record<string, number> = {};
    for (const item of report) {
      const acc = item.bas_account || "5890";
      basSummary[acc] = (basSummary[acc] || 0) + item.total_spend;
    }

    return res.json({
      report,
      bas_summary: Object.entries(basSummary).map(([account, total]) => ({ account, total })),
      generated_at: new Date().toISOString(),
      period: { from: from || null, to: to || null },
    });
  } catch (err: any) {
    console.error("[revolut] cost report error:", err.message);
    return res.status(500).json({ error: "Failed to generate cost report" });
  }
});

export default router;
