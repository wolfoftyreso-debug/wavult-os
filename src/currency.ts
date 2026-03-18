import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Module 4 – Currency & FX
// ---------------------------------------------------------------------------
// Principle: Store in original currency → convert to reporting (EUR)
// using rate at time of transaction.
// ---------------------------------------------------------------------------

const router = Router();

// ── Supported currencies ────────────────────────────────────────────────────
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

// ── GET /api/currencies ─────────────────────────────────────────────────────
// List all supported currencies
// ---------------------------------------------------------------------------
router.get("/currencies", (_req: Request, res: Response) => {
  res.json({
    reportingCurrency: REPORTING_CURRENCY,
    currencies: SUPPORTED_CURRENCIES,
  });
});

// ── GET /api/exchange-rates ─────────────────────────────────────────────────
// Retrieve exchange rates, optionally filtered by base / quote currency
// Query params: ?base=EUR&quote=USD&date=2026-01-15
// ---------------------------------------------------------------------------
router.get("/exchange-rates", async (req: Request, res: Response) => {
  try {
    const { base, quote, date } = req.query;

    let query = supabase
      .from("exchange_rates")
      .select("*")
      .order("effective_date", { ascending: false });

    if (base) query = query.eq("base_currency", String(base).toUpperCase());
    if (quote) query = query.eq("quote_currency", String(quote).toUpperCase());
    if (date) query = query.eq("effective_date", String(date));

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ rates: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/exchange-rates ────────────────────────────────────────────────
// Add a manual exchange rate
// Body: { baseCurrency, quoteCurrency, rate, effectiveDate }
// ---------------------------------------------------------------------------
router.post("/exchange-rates", async (req: Request, res: Response) => {
  try {
    const { baseCurrency, quoteCurrency, rate, effectiveDate } = req.body;

    if (!baseCurrency || !quoteCurrency || rate == null || !effectiveDate) {
      return res.status(400).json({
        error:
          "Missing required fields: baseCurrency, quoteCurrency, rate, effectiveDate",
      });
    }

    const base = String(baseCurrency).toUpperCase();
    const quote = String(quoteCurrency).toUpperCase();

    if (!currencyCodes.includes(base as any) || !currencyCodes.includes(quote as any)) {
      return res.status(400).json({
        error: `Unsupported currency. Supported: ${currencyCodes.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("exchange_rates")
      .insert({
        base_currency: base,
        quote_currency: quote,
        rate: Number(rate),
        effective_date: effectiveDate,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ exchangeRate: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/convert ────────────────────────────────────────────────────────
// Convert an amount between two currencies using the latest available rate
// Query: ?from=USD&to=EUR&amount=1000
// ---------------------------------------------------------------------------
router.get("/convert", async (req: Request, res: Response) => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      return res
        .status(400)
        .json({ error: "Missing required query params: from, to, amount" });
    }

    const fromCur = String(from).toUpperCase();
    const toCur = String(to).toUpperCase();
    const sourceAmount = Number(amount);

    if (isNaN(sourceAmount)) {
      return res.status(400).json({ error: "amount must be a number" });
    }

    if (!currencyCodes.includes(fromCur as any) || !currencyCodes.includes(toCur as any)) {
      return res.status(400).json({
        error: `Unsupported currency. Supported: ${currencyCodes.join(", ")}`,
      });
    }

    // Same currency – no conversion needed
    if (fromCur === toCur) {
      return res.json({
        from: fromCur,
        to: toCur,
        amount: sourceAmount,
        convertedAmount: sourceAmount,
        rate: 1,
        rateDate: null,
      });
    }

    // Look up the latest rate (from → to)
    const { data: directRate } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", fromCur)
      .eq("quote_currency", toCur)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();

    if (directRate) {
      const converted = sourceAmount * directRate.rate;
      return res.json({
        from: fromCur,
        to: toCur,
        amount: sourceAmount,
        convertedAmount: Math.round(converted * 100) / 100,
        rate: directRate.rate,
        rateDate: directRate.effective_date,
      });
    }

    // Try inverse rate (to → from)
    const { data: inverseRate } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", toCur)
      .eq("quote_currency", fromCur)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();

    if (inverseRate) {
      const rate = 1 / inverseRate.rate;
      const converted = sourceAmount * rate;
      return res.json({
        from: fromCur,
        to: toCur,
        amount: sourceAmount,
        convertedAmount: Math.round(converted * 100) / 100,
        rate: Math.round(rate * 1000000) / 1000000,
        rateDate: inverseRate.effective_date,
      });
    }

    // Try triangulation via reporting currency (EUR)
    const { data: fromToEur } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", fromCur)
      .eq("quote_currency", REPORTING_CURRENCY)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();

    const { data: eurToTarget } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", REPORTING_CURRENCY)
      .eq("quote_currency", toCur)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();

    if (fromToEur && eurToTarget) {
      const crossRate = fromToEur.rate * eurToTarget.rate;
      const converted = sourceAmount * crossRate;
      return res.json({
        from: fromCur,
        to: toCur,
        amount: sourceAmount,
        convertedAmount: Math.round(converted * 100) / 100,
        rate: Math.round(crossRate * 1000000) / 1000000,
        rateDate: fromToEur.effective_date,
        method: "triangulated_via_EUR",
      });
    }

    res.status(404).json({
      error: `No exchange rate found for ${fromCur} → ${toCur}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/fx/exposure ────────────────────────────────────────────────────
// FX exposure report – outstanding amounts per currency
// ---------------------------------------------------------------------------
router.get("/fx/exposure", async (_req: Request, res: Response) => {
  try {
    // Aggregate open receivables / payables by currency
    const { data: receivables, error: recErr } = await supabase
      .from("invoices")
      .select("currency, amount_due")
      .eq("status", "sent");

    if (recErr) {
      return res.status(500).json({ error: recErr.message });
    }

    const { data: payables, error: payErr } = await supabase
      .from("bills")
      .select("currency, amount_due")
      .eq("status", "unpaid");

    if (payErr) {
      return res.status(500).json({ error: payErr.message });
    }

    // Build exposure map
    const exposure: Record<
      string,
      { receivable: number; payable: number; net: number }
    > = {};

    for (const cur of currencyCodes) {
      exposure[cur] = { receivable: 0, payable: 0, net: 0 };
    }

    for (const inv of receivables ?? []) {
      const cur = inv.currency ?? REPORTING_CURRENCY;
      if (exposure[cur]) {
        exposure[cur].receivable += Number(inv.amount_due) || 0;
      }
    }

    for (const bill of payables ?? []) {
      const cur = bill.currency ?? REPORTING_CURRENCY;
      if (exposure[cur]) {
        exposure[cur].payable += Number(bill.amount_due) || 0;
      }
    }

    for (const cur of Object.keys(exposure)) {
      exposure[cur].net = exposure[cur].receivable - exposure[cur].payable;
    }

    // Filter out currencies with zero exposure
    const activeExposure = Object.fromEntries(
      Object.entries(exposure).filter(
        ([, v]) => v.receivable !== 0 || v.payable !== 0
      )
    );

    res.json({
      reportingCurrency: REPORTING_CURRENCY,
      exposure: activeExposure,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/fx/adjustments ─────────────────────────────────────────────────
// FX adjustment history (realised / unrealised gains and losses)
// ---------------------------------------------------------------------------
router.get("/fx/adjustments", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    let query = supabase
      .from("fx_adjustments")
      .select("*")
      .order("adjustment_date", { ascending: false });

    if (from) query = query.gte("adjustment_date", String(from));
    if (to) query = query.lte("adjustment_date", String(to));

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const totalGainLoss = (data ?? []).reduce(
      (sum: number, adj: any) => sum + (Number(adj.amount) || 0),
      0
    );

    res.json({
      adjustments: data,
      totalGainLoss: Math.round(totalGainLoss * 100) / 100,
      reportingCurrency: REPORTING_CURRENCY,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ledger/trial-balance/multi ─────────────────────────────────────
// Trial balance expressed in multiple currencies
// Query: ?currencies=EUR,USD,SEK (defaults to all supported)
// ---------------------------------------------------------------------------
router.get(
  "/ledger/trial-balance/multi",
  async (req: Request, res: Response) => {
    try {
      const requestedCurrencies = req.query.currencies
        ? String(req.query.currencies)
            .split(",")
            .map((c) => c.trim().toUpperCase())
        : [...currencyCodes];

      // Fetch trial balance in reporting currency
      const { data: accounts, error } = await supabase
        .from("journal_entries")
        .select("account_code, account_name, debit, credit");

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Aggregate balances per account
      const balances: Record<
        string,
        { accountCode: string; accountName: string; debit: number; credit: number }
      > = {};

      for (const entry of accounts ?? []) {
        const key = entry.account_code;
        if (!balances[key]) {
          balances[key] = {
            accountCode: entry.account_code,
            accountName: entry.account_name ?? key,
            debit: 0,
            credit: 0,
          };
        }
        balances[key].debit += Number(entry.debit) || 0;
        balances[key].credit += Number(entry.credit) || 0;
      }

      // Fetch latest rates for conversion
      const rates: Record<string, number> = { EUR: 1 };
      for (const cur of requestedCurrencies) {
        if (cur === REPORTING_CURRENCY) continue;
        const { data: rate } = await supabase
          .from("exchange_rates")
          .select("rate")
          .eq("base_currency", REPORTING_CURRENCY)
          .eq("quote_currency", cur)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();
        if (rate) rates[cur] = rate.rate;
      }

      // Build multi-currency trial balance
      const trialBalance = Object.values(balances).map((acct) => {
        const multiCurrency: Record<
          string,
          { debit: number; credit: number; net: number }
        > = {};

        for (const cur of requestedCurrencies) {
          const fx = rates[cur] ?? 1;
          multiCurrency[cur] = {
            debit: Math.round(acct.debit * fx * 100) / 100,
            credit: Math.round(acct.credit * fx * 100) / 100,
            net: Math.round((acct.debit - acct.credit) * fx * 100) / 100,
          };
        }

        return {
          accountCode: acct.accountCode,
          accountName: acct.accountName,
          balances: multiCurrency,
        };
      });

      res.json({
        reportingCurrency: REPORTING_CURRENCY,
        currencies: requestedCurrencies,
        trialBalance,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/deals/pipeline/multi ───────────────────────────────────────────
// Deal pipeline values in multiple currencies
// Query: ?currencies=EUR,USD,SEK
// ---------------------------------------------------------------------------
router.get("/deals/pipeline/multi", async (req: Request, res: Response) => {
  try {
    const requestedCurrencies = req.query.currencies
      ? String(req.query.currencies)
          .split(",")
          .map((c) => c.trim().toUpperCase())
      : [...currencyCodes];

    const { data: deals, error } = await supabase
      .from("deals")
      .select("id, name, stage, amount, currency, probability, expected_close_date")
      .order("expected_close_date", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Fetch latest rates from EUR to each requested currency
    const rates: Record<string, number> = { EUR: 1 };
    for (const cur of requestedCurrencies) {
      if (cur === REPORTING_CURRENCY) continue;
      const { data: rate } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("base_currency", REPORTING_CURRENCY)
        .eq("quote_currency", cur)
        .order("effective_date", { ascending: false })
        .limit(1)
        .single();
      if (rate) rates[cur] = rate.rate;
    }

    // Convert each deal to all requested currencies
    const pipeline = (deals ?? []).map((deal: any) => {
      const dealCur = deal.currency ?? REPORTING_CURRENCY;
      const amountEur =
        dealCur === REPORTING_CURRENCY
          ? deal.amount
          : deal.amount / (rates[dealCur] ?? 1);

      const amounts: Record<string, number> = {};
      for (const cur of requestedCurrencies) {
        const fx = rates[cur] ?? 1;
        amounts[cur] = Math.round(amountEur * fx * 100) / 100;
      }

      return {
        id: deal.id,
        name: deal.name,
        stage: deal.stage,
        originalAmount: deal.amount,
        originalCurrency: dealCur,
        probability: deal.probability,
        expectedCloseDate: deal.expected_close_date,
        amounts,
      };
    });

    // Totals per stage per currency
    const stagetotals: Record<string, Record<string, number>> = {};
    for (const deal of pipeline) {
      if (!stagetotals[deal.stage]) {
        stagetotals[deal.stage] = {};
        for (const cur of requestedCurrencies) stagetotals[deal.stage][cur] = 0;
      }
      for (const cur of requestedCurrencies) {
        stagetotals[deal.stage][cur] += deal.amounts[cur] ?? 0;
      }
    }

    // Round stage totals
    for (const stage of Object.keys(stagetotals)) {
      for (const cur of requestedCurrencies) {
        stagetotals[stage][cur] =
          Math.round(stagetotals[stage][cur] * 100) / 100;
      }
    }

    res.json({
      reportingCurrency: REPORTING_CURRENCY,
      currencies: requestedCurrencies,
      pipeline,
      stageTotals: stagetotals,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
