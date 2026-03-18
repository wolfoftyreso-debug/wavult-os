import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Module 4 – Currency & FX
// ---------------------------------------------------------------------------
// Principle: Store amounts in original currency, convert to reporting
// currency (EUR) using the exchange rate at time of transaction.
// ---------------------------------------------------------------------------

const router = Router();

// ---- Supported currencies -------------------------------------------------
const SUPPORTED_CURRENCIES = [
  { code: "EUR", name: "Euro", isReporting: true },
  { code: "USD", name: "US Dollar", isReporting: false },
  { code: "SEK", name: "Swedish Krona", isReporting: false },
  { code: "GBP", name: "British Pound", isReporting: false },
  { code: "NOK", name: "Norwegian Krone", isReporting: false },
  { code: "DKK", name: "Danish Krone", isReporting: false },
  { code: "PLN", name: "Polish Zloty", isReporting: false },
  { code: "CHF", name: "Swiss Franc", isReporting: false },
] as const;

const REPORTING_CURRENCY = "EUR";

const currencyCodes = SUPPORTED_CURRENCIES.map((c) => c.code);

// ---------------------------------------------------------------------------
// GET /api/currencies – List supported currencies
// ---------------------------------------------------------------------------
router.get("/currencies", (_req: Request, res: Response) => {
  res.json({
    reportingCurrency: REPORTING_CURRENCY,
    currencies: SUPPORTED_CURRENCIES,
  });
});

// ---------------------------------------------------------------------------
// GET /api/exchange-rates – Get exchange rates
// ---------------------------------------------------------------------------
router.get("/exchange-rates", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("effective_date", { ascending: false });

    if (error) throw error;

    res.json({ rates: data });
  } catch (err: any) {
    console.error("Error fetching exchange rates:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/exchange-rates – Add a manual exchange rate
// ---------------------------------------------------------------------------
router.post("/exchange-rates", async (req: Request, res: Response) => {
  try {
    const { from_currency, to_currency, rate, effective_date } = req.body;

    if (!from_currency || !to_currency || rate == null) {
      return res
        .status(400)
        .json({ error: "from_currency, to_currency, and rate are required" });
    }

    if (
      !currencyCodes.includes(from_currency) ||
      !currencyCodes.includes(to_currency)
    ) {
      return res.status(400).json({
        error: `Unsupported currency. Supported: ${currencyCodes.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("exchange_rates")
      .insert({
        from_currency,
        to_currency,
        rate: Number(rate),
        effective_date: effective_date || new Date().toISOString().slice(0, 10),
        source: "manual",
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ rate: data });
  } catch (err: any) {
    console.error("Error adding exchange rate:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/convert – Convert amount between currencies
// Query params: from, to, amount
// ---------------------------------------------------------------------------
router.get("/convert", async (req: Request, res: Response) => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      return res
        .status(400)
        .json({ error: "Query params from, to, and amount are required" });
    }

    const fromCurrency = String(from).toUpperCase();
    const toCurrency = String(to).toUpperCase();
    const sourceAmount = Number(amount);

    if (!(currencyCodes as readonly string[]).includes(fromCurrency) || !(currencyCodes as readonly string[]).includes(toCurrency)) {
      return res.status(400).json({
        error: `Unsupported currency. Supported: ${currencyCodes.join(", ")}`,
      });
    }

    if (isNaN(sourceAmount)) {
      return res.status(400).json({ error: "amount must be a number" });
    }

    // Same currency – no conversion needed
    if (fromCurrency === toCurrency) {
      return res.json({
        from: fromCurrency,
        to: toCurrency,
        amount: sourceAmount,
        convertedAmount: sourceAmount,
        rate: 1,
        rateDate: new Date().toISOString().slice(0, 10),
      });
    }

    // Look up the most recent rate
    const { data: rateRow, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !rateRow) {
      // Try the inverse rate
      const { data: inverseRow, error: invErr } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("from_currency", toCurrency)
        .eq("to_currency", fromCurrency)
        .order("effective_date", { ascending: false })
        .limit(1)
        .single();

      if (invErr || !inverseRow) {
        return res.status(404).json({
          error: `No exchange rate found for ${fromCurrency} → ${toCurrency}`,
        });
      }

      const inverseRate = 1 / inverseRow.rate;
      const convertedAmount = Math.round(sourceAmount * inverseRate * 100) / 100;

      return res.json({
        from: fromCurrency,
        to: toCurrency,
        amount: sourceAmount,
        convertedAmount,
        rate: Math.round(inverseRate * 1_000_000) / 1_000_000,
        rateDate: inverseRow.effective_date,
        note: "Derived from inverse rate",
      });
    }

    const convertedAmount = Math.round(sourceAmount * rateRow.rate * 100) / 100;

    res.json({
      from: fromCurrency,
      to: toCurrency,
      amount: sourceAmount,
      convertedAmount,
      rate: rateRow.rate,
      rateDate: rateRow.effective_date,
    });
  } catch (err: any) {
    console.error("Error converting currency:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fx/exposure – FX exposure report (amounts per currency)
// ---------------------------------------------------------------------------
router.get("/fx/exposure", async (_req: Request, res: Response) => {
  try {
    // Gather totals per currency from journal entries
    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("currency, amount");

    if (error) throw error;

    const exposure: Record<string, { totalAmount: number; count: number }> = {};

    for (const entry of entries ?? []) {
      const cur = entry.currency || REPORTING_CURRENCY;
      if (!exposure[cur]) {
        exposure[cur] = { totalAmount: 0, count: 0 };
      }
      exposure[cur].totalAmount += Number(entry.amount) || 0;
      exposure[cur].count += 1;
    }

    // Fetch latest rates to EUR for each currency
    const exposureReport = await Promise.all(
      Object.entries(exposure).map(async ([currency, stats]) => {
        let eurEquivalent = stats.totalAmount;

        if (currency !== REPORTING_CURRENCY) {
          const { data: rateRow } = await supabase
            .from("exchange_rates")
            .select("rate")
            .eq("from_currency", currency)
            .eq("to_currency", REPORTING_CURRENCY)
            .order("effective_date", { ascending: false })
            .limit(1)
            .single();

          if (rateRow) {
            eurEquivalent =
              Math.round(stats.totalAmount * rateRow.rate * 100) / 100;
          }
        }

        return {
          currency,
          totalAmount: Math.round(stats.totalAmount * 100) / 100,
          transactionCount: stats.count,
          eurEquivalent,
        };
      })
    );

    res.json({
      reportingCurrency: REPORTING_CURRENCY,
      exposure: exposureReport,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating FX exposure:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fx/adjustments – FX adjustment history
// ---------------------------------------------------------------------------
router.get("/fx/adjustments", async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100;

    const { data, error } = await supabase
      .from("fx_adjustments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ adjustments: data });
  } catch (err: any) {
    console.error("Error fetching FX adjustments:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/ledger/trial-balance/multi – Trial balance in multiple currencies
// ---------------------------------------------------------------------------
router.get("/ledger/trial-balance/multi", async (req: Request, res: Response) => {
  try {
    const requestedCurrencies = req.query.currencies
      ? String(req.query.currencies).split(",").map((c) => c.trim().toUpperCase())
      : [REPORTING_CURRENCY];

    // Fetch trial balance data (grouped by account)
    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("account_number, account_name, debit, credit, currency");

    if (error) throw error;

    // Group by account
    const accounts: Record<
      string,
      { account_number: string; account_name: string; debit: number; credit: number; currency: string }
    > = {};

    for (const e of entries ?? []) {
      const key = e.account_number;
      if (!accounts[key]) {
        accounts[key] = {
          account_number: e.account_number,
          account_name: e.account_name || "",
          debit: 0,
          credit: 0,
          currency: e.currency || REPORTING_CURRENCY,
        };
      }
      accounts[key].debit += Number(e.debit) || 0;
      accounts[key].credit += Number(e.credit) || 0;
    }

    // Fetch latest rates for requested currencies
    const rates: Record<string, number> = { EUR: 1 };
    for (const cur of requestedCurrencies) {
      if (cur === REPORTING_CURRENCY) continue;
      const { data: rateRow } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("from_currency", REPORTING_CURRENCY)
        .eq("to_currency", cur)
        .order("effective_date", { ascending: false })
        .limit(1)
        .single();
      if (rateRow) {
        rates[cur] = rateRow.rate;
      }
    }

    // Build multi-currency trial balance
    const trialBalance = Object.values(accounts).map((acct) => {
      const balanceEUR = acct.debit - acct.credit;
      const balances: Record<string, number> = {};

      for (const cur of requestedCurrencies) {
        const rate = rates[cur] || 1;
        balances[cur] = Math.round(balanceEUR * rate * 100) / 100;
      }

      return {
        accountNumber: acct.account_number,
        accountName: acct.account_name,
        debit: Math.round(acct.debit * 100) / 100,
        credit: Math.round(acct.credit * 100) / 100,
        balances,
      };
    });

    res.json({
      currencies: requestedCurrencies,
      rates,
      trialBalance,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating multi-currency trial balance:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/deals/pipeline/multi – Deal pipeline in multiple currencies
// ---------------------------------------------------------------------------
router.get("/deals/pipeline/multi", async (req: Request, res: Response) => {
  try {
    const requestedCurrencies = req.query.currencies
      ? String(req.query.currencies).split(",").map((c) => c.trim().toUpperCase())
      : [REPORTING_CURRENCY];

    const { data: deals, error } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch latest rates for requested currencies
    const rates: Record<string, number> = { EUR: 1 };
    for (const cur of requestedCurrencies) {
      if (cur === REPORTING_CURRENCY) continue;
      const { data: rateRow } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("from_currency", REPORTING_CURRENCY)
        .eq("to_currency", cur)
        .order("effective_date", { ascending: false })
        .limit(1)
        .single();
      if (rateRow) {
        rates[cur] = rateRow.rate;
      }
    }

    // Convert each deal's value to requested currencies
    const pipeline = (deals ?? []).map((deal) => {
      const dealCurrency = deal.currency || REPORTING_CURRENCY;
      const dealAmount = Number(deal.amount) || 0;

      // First convert to EUR if not already
      let amountEUR = dealAmount;
      if (dealCurrency !== REPORTING_CURRENCY) {
        // We need the rate from dealCurrency to EUR — use a simple lookup
        // For the pipeline response we just use the rates we already have
        const rateToEUR = rates[dealCurrency] ? 1 / rates[dealCurrency] : 1;
        amountEUR = dealAmount * rateToEUR;
      }

      const amounts: Record<string, number> = {};
      for (const cur of requestedCurrencies) {
        const rate = rates[cur] || 1;
        amounts[cur] = Math.round(amountEUR * rate * 100) / 100;
      }

      return {
        id: deal.id,
        name: deal.name,
        stage: deal.stage,
        originalCurrency: dealCurrency,
        originalAmount: dealAmount,
        amounts,
      };
    });

    // Summarize by stage
    const stageMap: Record<string, Record<string, number>> = {};
    for (const deal of pipeline) {
      if (!stageMap[deal.stage]) {
        stageMap[deal.stage] = {};
        for (const cur of requestedCurrencies) stageMap[deal.stage][cur] = 0;
      }
      for (const cur of requestedCurrencies) {
        stageMap[deal.stage][cur] += deal.amounts[cur] || 0;
      }
    }

    const summary = Object.entries(stageMap).map(([stage, totals]) => ({
      stage,
      totals: Object.fromEntries(
        Object.entries(totals).map(([c, v]) => [c, Math.round(v * 100) / 100])
      ),
    }));

    res.json({
      currencies: requestedCurrencies,
      rates,
      deals: pipeline,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating multi-currency pipeline:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
