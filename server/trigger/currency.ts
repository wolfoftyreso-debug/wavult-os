import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. ECB Rate Update — Mån-Fre 16:00
// ---------------------------------------------------------------------------
export const ecbRateUpdate = schedules.task({
  id: "currency-ecb-rate-update",
  cron: "0 16 * * 1-5",
  run: async () => {
    const ECB_URL =
      "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

    const response = await fetch(ECB_URL);
    if (!response.ok) {
      throw new Error(`ECB fetch failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    // Parse rates from the ECB XML using regex (lightweight, no XML dep)
    const rateRegex = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g;
    const rates: { currency: string; rate: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = rateRegex.exec(xml)) !== null) {
      rates.push({ currency: match[1], rate: parseFloat(match[2]) });
    }

    if (rates.length === 0) {
      throw new Error("No rates parsed from ECB response");
    }

    // Extract the date from the XML
    const dateMatch = xml.match(/time='(\d{4}-\d{2}-\d{2})'/);
    const rateDate = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

    const rows = rates.map((r) => ({
      base_currency: "EUR",
      quote_currency: r.currency,
      rate: r.rate,
      rate_date: rateDate,
      source: "ECB",
      fetched_at: new Date().toISOString(),
    }));

    await supabase.from("exchange_rates").upsert(rows, {
      onConflict: "base_currency,quote_currency,rate_date",
    });

    // Derive SEK cross-rates for common currencies
    const sekRate = rates.find((r) => r.currency === "SEK")?.rate;
    if (sekRate) {
      const crossRates = rates
        .filter((r) => r.currency !== "SEK")
        .map((r) => ({
          base_currency: "SEK",
          quote_currency: r.currency,
          rate: Math.round((r.rate / sekRate) * 1_000_000) / 1_000_000,
          rate_date: rateDate,
          source: "ECB_CROSS",
          fetched_at: new Date().toISOString(),
        }));

      await supabase.from("exchange_rates").upsert(crossRates, {
        onConflict: "base_currency,quote_currency,rate_date",
      });
    }

    return { date: rateDate, ratesStored: rates.length };
  },
});

// ---------------------------------------------------------------------------
// 2. FX Revaluation — 1st of every month, auto-books to account 3960
// ---------------------------------------------------------------------------
export const fxRevaluation = schedules.task({
  id: "currency-fx-revaluation",
  cron: "0 8 1 * *",
  run: async () => {
    const REVALUATION_ACCOUNT = "3960";
    const now = new Date();
    const revalDate = now.toISOString().slice(0, 10);

    // Get current exchange rates (latest)
    const { data: currentRates, error: rateErr } = await supabase
      .from("exchange_rates")
      .select("quote_currency, rate")
      .eq("base_currency", "SEK")
      .eq("rate_date", revalDate);

    if (rateErr) throw new Error(`fxRevaluation rates: ${rateErr.message}`);

    // Fall back to most recent rates if today's aren't available yet
    let rateMap = new Map<string, number>();
    if (currentRates && currentRates.length > 0) {
      currentRates.forEach((r) => rateMap.set(r.quote_currency, r.rate));
    } else {
      const { data: latestRates } = await supabase
        .from("exchange_rates")
        .select("quote_currency, rate, rate_date")
        .eq("base_currency", "SEK")
        .order("rate_date", { ascending: false })
        .limit(50);

      const seen = new Set<string>();
      (latestRates ?? []).forEach((r) => {
        if (!seen.has(r.quote_currency)) {
          rateMap.set(r.quote_currency, r.rate);
          seen.add(r.quote_currency);
        }
      });
    }

    // Get all open foreign-currency balances
    const { data: fxBalances, error: balErr } = await supabase
      .from("account_balances")
      .select("account_id, currency, balance_foreign, balance_sek, booked_rate")
      .neq("currency", "SEK")
      .gt("balance_foreign", 0);

    if (balErr) throw new Error(`fxRevaluation balances: ${balErr.message}`);

    const journalEntries: Record<string, unknown>[] = [];
    let totalRevaluation = 0;

    for (const bal of fxBalances ?? []) {
      const newRate = rateMap.get(bal.currency);
      if (!newRate) continue;

      const newSekValue = Math.round(bal.balance_foreign * newRate * 100) / 100;
      const currentSekValue = bal.balance_sek ?? 0;
      const difference = Math.round((newSekValue - currentSekValue) * 100) / 100;

      if (Math.abs(difference) < 0.01) continue;

      totalRevaluation += difference;

      // Update the account balance with new SEK value
      await supabase
        .from("account_balances")
        .update({ balance_sek: newSekValue, booked_rate: newRate })
        .eq("account_id", bal.account_id)
        .eq("currency", bal.currency);

      // Create journal entry for the revaluation
      journalEntries.push({
        date: revalDate,
        description: `Valutaomvärdering ${bal.currency} konto ${bal.account_id}`,
        debit_account: difference > 0 ? bal.account_id : REVALUATION_ACCOUNT,
        credit_account: difference > 0 ? REVALUATION_ACCOUNT : bal.account_id,
        debit: Math.abs(difference),
        credit: Math.abs(difference),
        currency: "SEK",
        type: "fx_revaluation",
        created_at: now.toISOString(),
      });
    }

    if (journalEntries.length > 0) {
      await supabase.from("journal_entries").insert(journalEntries);
    }

    // Log the revaluation run
    await supabase.from("audit_logs").insert({
      type: "fx_revaluation",
      result: "completed",
      details: {
        date: revalDate,
        entries: journalEntries.length,
        total_revaluation_sek: Math.round(totalRevaluation * 100) / 100,
        account: REVALUATION_ACCOUNT,
      },
      checked_at: now.toISOString(),
    });

    return {
      date: revalDate,
      entriesBooked: journalEntries.length,
      totalRevaluationSEK: Math.round(totalRevaluation * 100) / 100,
      revaluationAccount: REVALUATION_ACCOUNT,
    };
  },
});
