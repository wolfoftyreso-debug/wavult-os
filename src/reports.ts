import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Module 5 – Reports & Exports
// ---------------------------------------------------------------------------
// Swedish BAS account plan:
//   1xxx = Tillgångar (Assets)
//   2xxx = Skulder/EK (Liabilities/Equity)
//   3xxx = Intäkter (Revenue)
//   4xxx-7xxx = Kostnader (Expenses)
//   8xxx = Finansiellt (Financial)
// ---------------------------------------------------------------------------

const router = Router();

// ---- BAS Chart of Accounts (60+ accounts) ---------------------------------
const BAS_CHART_OF_ACCOUNTS = [
  // 1xxx – Tillgångar (Assets)
  { number: "1010", name: "Utvecklingsutgifter", category: "Tillgångar" },
  { number: "1020", name: "Koncessioner", category: "Tillgångar" },
  { number: "1030", name: "Patent", category: "Tillgångar" },
  { number: "1050", name: "Goodwill", category: "Tillgångar" },
  { number: "1110", name: "Byggnader", category: "Tillgångar" },
  { number: "1120", name: "Förbättringsutgifter på annans fastighet", category: "Tillgångar" },
  { number: "1130", name: "Mark", category: "Tillgångar" },
  { number: "1210", name: "Maskiner och inventarier", category: "Tillgångar" },
  { number: "1220", name: "Inventarier och verktyg", category: "Tillgångar" },
  { number: "1230", name: "Datorer", category: "Tillgångar" },
  { number: "1240", name: "Bilar och transportmedel", category: "Tillgångar" },
  { number: "1310", name: "Andelar i koncernföretag", category: "Tillgångar" },
  { number: "1380", name: "Andra långfristiga fordringar", category: "Tillgångar" },
  { number: "1410", name: "Lager av råvaror", category: "Tillgångar" },
  { number: "1460", name: "Lager av färdiga varor", category: "Tillgångar" },
  { number: "1510", name: "Kundfordringar", category: "Tillgångar" },
  { number: "1610", name: "Kortfristiga fordringar", category: "Tillgångar" },
  { number: "1630", name: "Avräkning för skatter och avgifter", category: "Tillgångar" },
  { number: "1650", name: "Momsfordran", category: "Tillgångar" },
  { number: "1710", name: "Förutbetalda kostnader", category: "Tillgångar" },
  { number: "1910", name: "Kassa", category: "Tillgångar" },
  { number: "1920", name: "PlusGiro", category: "Tillgångar" },
  { number: "1930", name: "Företagskonto/checkkonto", category: "Tillgångar" },
  { number: "1940", name: "Övriga bankkonton", category: "Tillgångar" },

  // 2xxx – Skulder & Eget Kapital (Liabilities & Equity)
  { number: "2010", name: "Eget kapital", category: "Skulder/EK" },
  { number: "2013", name: "Överkursfond", category: "Skulder/EK" },
  { number: "2020", name: "Reservfond", category: "Skulder/EK" },
  { number: "2091", name: "Balanserad vinst eller förlust", category: "Skulder/EK" },
  { number: "2099", name: "Årets resultat", category: "Skulder/EK" },
  { number: "2310", name: "Banklån", category: "Skulder/EK" },
  { number: "2330", name: "Checkräkningskredit", category: "Skulder/EK" },
  { number: "2410", name: "Leverantörsskulder", category: "Skulder/EK" },
  { number: "2440", name: "Upplupna kostnader", category: "Skulder/EK" },
  { number: "2510", name: "Skatteskulder", category: "Skulder/EK" },
  { number: "2610", name: "Utgående moms 25%", category: "Skulder/EK" },
  { number: "2620", name: "Utgående moms 12%", category: "Skulder/EK" },
  { number: "2630", name: "Utgående moms 6%", category: "Skulder/EK" },
  { number: "2640", name: "Ingående moms", category: "Skulder/EK" },
  { number: "2650", name: "Momsredovisning", category: "Skulder/EK" },
  { number: "2710", name: "Personalskatt", category: "Skulder/EK" },
  { number: "2730", name: "Lagstadgade sociala avgifter", category: "Skulder/EK" },
  { number: "2920", name: "Upplupna semesterlöner", category: "Skulder/EK" },

  // 3xxx – Intäkter (Revenue)
  { number: "3010", name: "Försäljning varor 25% moms", category: "Intäkter" },
  { number: "3011", name: "Försäljning varor 12% moms", category: "Intäkter" },
  { number: "3012", name: "Försäljning varor 6% moms", category: "Intäkter" },
  { number: "3040", name: "Försäljning tjänster 25% moms", category: "Intäkter" },
  { number: "3050", name: "Försäljning tjänster utomlands", category: "Intäkter" },
  { number: "3060", name: "Försäljning tjänster inom EU", category: "Intäkter" },
  { number: "3100", name: "Övriga rörelseintäkter", category: "Intäkter" },
  { number: "3590", name: "Fakturerade kostnader", category: "Intäkter" },
  { number: "3740", name: "Öres- och kronutjämning", category: "Intäkter" },

  // 4xxx – Varor/Material (Cost of Goods)
  { number: "4010", name: "Inköp varor och material", category: "Kostnader" },
  { number: "4110", name: "Inköp råvaror", category: "Kostnader" },
  { number: "4500", name: "Övriga direkta kostnader", category: "Kostnader" },

  // 5xxx – Lokalkostnader (Premises)
  { number: "5010", name: "Lokalhyra", category: "Kostnader" },
  { number: "5020", name: "El för lokaler", category: "Kostnader" },
  { number: "5060", name: "Städning och renhållning", category: "Kostnader" },
  { number: "5090", name: "Övriga lokalkostnader", category: "Kostnader" },

  // 6xxx – Övriga kostnader (Other expenses)
  { number: "6110", name: "Kontorsmateriel", category: "Kostnader" },
  { number: "6210", name: "Telekommunikation", category: "Kostnader" },
  { number: "6230", name: "IT-tjänster", category: "Kostnader" },
  { number: "6250", name: "Programvara", category: "Kostnader" },
  { number: "6310", name: "Företagsförsäkringar", category: "Kostnader" },
  { number: "6530", name: "Redovisningstjänster", category: "Kostnader" },
  { number: "6540", name: "IT-konsulttjänster", category: "Kostnader" },
  { number: "6570", name: "Bankkostnader", category: "Kostnader" },
  { number: "6590", name: "Övriga externa tjänster", category: "Kostnader" },

  // 7xxx – Personal (Staff)
  { number: "7010", name: "Löner till tjänstemän", category: "Kostnader" },
  { number: "7082", name: "Sjuklöner", category: "Kostnader" },
  { number: "7210", name: "Löner till kollektivanställda", category: "Kostnader" },
  { number: "7510", name: "Arbetsgivaravgifter", category: "Kostnader" },
  { number: "7519", name: "Sociala avgifter semester", category: "Kostnader" },
  { number: "7570", name: "Premiepension", category: "Kostnader" },
  { number: "7610", name: "Utbildning", category: "Kostnader" },
  { number: "7690", name: "Övriga personalkostnader", category: "Kostnader" },

  // 8xxx – Finansiellt (Financial)
  { number: "8310", name: "Ränteintäkter", category: "Finansiellt" },
  { number: "8410", name: "Räntekostnader", category: "Finansiellt" },
  { number: "8420", name: "Räntekostnader banklån", category: "Finansiellt" },
  { number: "8491", name: "Valutakursförluster", category: "Finansiellt" },
  { number: "8492", name: "Valutakursvinster", category: "Finansiellt" },
  { number: "8910", name: "Skatt på årets resultat", category: "Finansiellt" },
  { number: "8999", name: "Årets resultat", category: "Finansiellt" },
];

// ---------------------------------------------------------------------------
// Helper: classify account by number range
// ---------------------------------------------------------------------------
function classifyAccount(accountNumber: string): string {
  const num = parseInt(accountNumber, 10);
  if (num >= 1000 && num < 2000) return "Tillgångar";
  if (num >= 2000 && num < 3000) return "Skulder/EK";
  if (num >= 3000 && num < 4000) return "Intäkter";
  if (num >= 4000 && num < 8000) return "Kostnader";
  if (num >= 8000 && num < 9000) return "Finansiellt";
  return "Övrigt";
}

// ---------------------------------------------------------------------------
// GET /api/reports/chart-of-accounts – BAS chart of accounts
// ---------------------------------------------------------------------------
router.get("/reports/chart-of-accounts", (_req: Request, res: Response) => {
  const grouped: Record<string, typeof BAS_CHART_OF_ACCOUNTS> = {};
  for (const acct of BAS_CHART_OF_ACCOUNTS) {
    if (!grouped[acct.category]) grouped[acct.category] = [];
    grouped[acct.category].push(acct);
  }

  res.json({
    totalAccounts: BAS_CHART_OF_ACCOUNTS.length,
    accounts: BAS_CHART_OF_ACCOUNTS,
    grouped,
  });
});

// ---------------------------------------------------------------------------
// GET /api/reports/sie4 – Swedish SIE4 export (text format)
// ---------------------------------------------------------------------------
router.get("/reports/sie4", async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Fetch journal entries for the period
    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw error;

    // Build SIE4 text
    const lines: string[] = [];

    // Header
    lines.push("#FLAGGA 0");
    lines.push("#FORMAT PC8");
    lines.push("#SIETYP 4");
    lines.push("#PROGRAM \"Hypbit OMS\" \"1.0\"");
    lines.push(`#GEN ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
    lines.push(`#RAR 0 ${startDate.replace(/-/g, "")} ${endDate.replace(/-/g, "")}`);
    lines.push('#FNAMN "Hypbit AB"');

    // Account plan
    for (const acct of BAS_CHART_OF_ACCOUNTS) {
      lines.push(`#KONTO ${acct.number} "${acct.name}"`);
    }

    lines.push("");

    // Group entries by verification number / date
    const verifications: Record<string, typeof entries> = {};
    for (const entry of entries ?? []) {
      const key = entry.verification_number || entry.date;
      if (!verifications[key]) verifications[key] = [];
      verifications[key].push(entry);
    }

    let verNum = 1;
    for (const [key, verEntries] of Object.entries(verifications)) {
      const date = (verEntries[0].date || "").replace(/-/g, "");
      const desc = verEntries[0].description || "";
      lines.push(`#VER "" ${verNum} ${date} "${desc}"`);
      lines.push("{");

      for (const e of verEntries) {
        const debit = Number(e.debit) || 0;
        const credit = Number(e.credit) || 0;
        const amount = debit > 0 ? debit : -credit;
        lines.push(
          `\t#TRANS ${e.account_number} {} ${amount.toFixed(2)} "" "" 0`
        );
      }

      lines.push("}");
      verNum++;
    }

    const sie4Content = lines.join("\r\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sie4_${year}.se"`
    );
    res.send(sie4Content);
  } catch (err: any) {
    console.error("Error generating SIE4 export:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/income-statement – Resultaträkning
// (Intäkter, Kostnader, Rörelseresultat)
// ---------------------------------------------------------------------------
router.get("/reports/income-statement", async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("account_number, account_name, debit, credit")
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) throw error;

    // Accumulate by account
    const accounts: Record<
      string,
      { name: string; debit: number; credit: number }
    > = {};

    for (const e of entries ?? []) {
      const key = e.account_number;
      if (!accounts[key]) {
        accounts[key] = { name: e.account_name || "", debit: 0, credit: 0 };
      }
      accounts[key].debit += Number(e.debit) || 0;
      accounts[key].credit += Number(e.credit) || 0;
    }

    // Revenue (3xxx) – credit side
    const revenueAccounts = Object.entries(accounts)
      .filter(([num]) => num.startsWith("3"))
      .map(([num, a]) => ({
        accountNumber: num,
        accountName: a.name,
        amount: Math.round((a.credit - a.debit) * 100) / 100,
      }));

    // Expenses (4xxx-7xxx) – debit side
    const expenseAccounts = Object.entries(accounts)
      .filter(([num]) => {
        const n = parseInt(num, 10);
        return n >= 4000 && n < 8000;
      })
      .map(([num, a]) => ({
        accountNumber: num,
        accountName: a.name,
        amount: Math.round((a.debit - a.credit) * 100) / 100,
      }));

    // Financial (8xxx)
    const financialAccounts = Object.entries(accounts)
      .filter(([num]) => num.startsWith("8"))
      .map(([num, a]) => ({
        accountNumber: num,
        accountName: a.name,
        amount: Math.round((a.credit - a.debit) * 100) / 100,
      }));

    const totalRevenue = revenueAccounts.reduce((s, a) => s + a.amount, 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => s + a.amount, 0);
    const totalFinancial = financialAccounts.reduce((s, a) => s + a.amount, 0);
    const operatingResult = Math.round((totalRevenue - totalExpenses) * 100) / 100;
    const netResult = Math.round((operatingResult + totalFinancial) * 100) / 100;

    res.json({
      period: { year, startDate, endDate },
      intäkter: {
        accounts: revenueAccounts,
        total: Math.round(totalRevenue * 100) / 100,
      },
      kostnader: {
        accounts: expenseAccounts,
        total: Math.round(totalExpenses * 100) / 100,
      },
      rörelseresultat: operatingResult,
      finansiellt: {
        accounts: financialAccounts,
        total: Math.round(totalFinancial * 100) / 100,
      },
      årets_resultat: netResult,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating income statement:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/balance-sheet – Balansräkning
// (Tillgångar, Skulder, Eget kapital)
// ---------------------------------------------------------------------------
router.get("/reports/balance-sheet", async (req: Request, res: Response) => {
  try {
    const asOfDate =
      (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("account_number, account_name, debit, credit")
      .lte("date", asOfDate);

    if (error) throw error;

    // Accumulate by account
    const accounts: Record<
      string,
      { name: string; debit: number; credit: number }
    > = {};

    for (const e of entries ?? []) {
      const key = e.account_number;
      if (!accounts[key]) {
        accounts[key] = { name: e.account_name || "", debit: 0, credit: 0 };
      }
      accounts[key].debit += Number(e.debit) || 0;
      accounts[key].credit += Number(e.credit) || 0;
    }

    // Assets (1xxx) – debit balance
    const tillgångar = Object.entries(accounts)
      .filter(([num]) => num.startsWith("1"))
      .map(([num, a]) => ({
        accountNumber: num,
        accountName: a.name,
        balance: Math.round((a.debit - a.credit) * 100) / 100,
      }));

    // Liabilities & Equity (2xxx) – credit balance
    const skulderEK = Object.entries(accounts)
      .filter(([num]) => num.startsWith("2"))
      .map(([num, a]) => ({
        accountNumber: num,
        accountName: a.name,
        balance: Math.round((a.credit - a.debit) * 100) / 100,
      }));

    const totalTillgångar = tillgångar.reduce((s, a) => s + a.balance, 0);
    const totalSkulderEK = skulderEK.reduce((s, a) => s + a.balance, 0);

    res.json({
      asOfDate,
      tillgångar: {
        accounts: tillgångar,
        total: Math.round(totalTillgångar * 100) / 100,
      },
      skulder_och_eget_kapital: {
        accounts: skulderEK,
        total: Math.round(totalSkulderEK * 100) / 100,
      },
      balanceCheck:
        Math.round(totalTillgångar * 100) === Math.round(totalSkulderEK * 100),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating balance sheet:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/general-ledger – Huvudbok per konto med löpande saldo
// ---------------------------------------------------------------------------
router.get("/reports/general-ledger", async (req: Request, res: Response) => {
  try {
    const accountFilter = req.query.account as string | undefined;
    const year = Number(req.query.year) || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from("journal_entries")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("id", { ascending: true });

    if (accountFilter) {
      query = query.eq("account_number", accountFilter);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    // Group by account and compute running balance
    const ledger: Record<
      string,
      {
        accountNumber: string;
        accountName: string;
        entries: Array<{
          date: string;
          description: string;
          debit: number;
          credit: number;
          runningBalance: number;
        }>;
        totalDebit: number;
        totalCredit: number;
        closingBalance: number;
      }
    > = {};

    for (const e of entries ?? []) {
      const key = e.account_number;
      if (!ledger[key]) {
        ledger[key] = {
          accountNumber: key,
          accountName: e.account_name || "",
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
        };
      }

      const debit = Number(e.debit) || 0;
      const credit = Number(e.credit) || 0;
      ledger[key].totalDebit += debit;
      ledger[key].totalCredit += credit;
      ledger[key].closingBalance += debit - credit;

      ledger[key].entries.push({
        date: e.date,
        description: e.description || "",
        debit,
        credit,
        runningBalance:
          Math.round(ledger[key].closingBalance * 100) / 100,
      });
    }

    // Round totals
    for (const acct of Object.values(ledger)) {
      acct.totalDebit = Math.round(acct.totalDebit * 100) / 100;
      acct.totalCredit = Math.round(acct.totalCredit * 100) / 100;
      acct.closingBalance = Math.round(acct.closingBalance * 100) / 100;
    }

    res.json({
      period: { year, startDate, endDate },
      accounts: Object.values(ledger),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating general ledger:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/vat – Momsrapport (utgående/ingående, quarterly)
// ---------------------------------------------------------------------------
router.get("/reports/vat", async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const quarter = req.query.quarter ? Number(req.query.quarter) : undefined;

    // VAT accounts: 2610-2650 range
    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("account_number, account_name, debit, credit, date")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .gte("account_number", "2610")
      .lte("account_number", "2650")
      .order("date", { ascending: true });

    if (error) throw error;

    // Group by quarter
    const quarters: Record<
      number,
      {
        utgåendeMoms: number;
        ingåendeMoms: number;
        momsAttBetala: number;
        details: Array<{
          accountNumber: string;
          accountName: string;
          debit: number;
          credit: number;
        }>;
      }
    > = {};

    for (let q = 1; q <= 4; q++) {
      quarters[q] = {
        utgåendeMoms: 0,
        ingåendeMoms: 0,
        momsAttBetala: 0,
        details: [],
      };
    }

    for (const e of entries ?? []) {
      const month = new Date(e.date).getMonth(); // 0-based
      const q = Math.floor(month / 3) + 1;
      const debit = Number(e.debit) || 0;
      const credit = Number(e.credit) || 0;

      const acctNum = e.account_number;

      // 2610-2630 = Utgående moms (output VAT, credit side)
      if (acctNum >= "2610" && acctNum <= "2630") {
        quarters[q].utgåendeMoms += credit - debit;
      }
      // 2640 = Ingående moms (input VAT, debit side)
      else if (acctNum === "2640") {
        quarters[q].ingåendeMoms += debit - credit;
      }

      quarters[q].details.push({
        accountNumber: acctNum,
        accountName: e.account_name || "",
        debit,
        credit,
      });
    }

    // Calculate net VAT per quarter
    for (const q of Object.values(quarters)) {
      q.utgåendeMoms = Math.round(q.utgåendeMoms * 100) / 100;
      q.ingåendeMoms = Math.round(q.ingåendeMoms * 100) / 100;
      q.momsAttBetala = Math.round((q.utgåendeMoms - q.ingåendeMoms) * 100) / 100;
    }

    const result = quarter
      ? { [`Q${quarter}`]: quarters[quarter] }
      : quarters;

    const totalUtgående = Object.values(quarters).reduce(
      (s, q) => s + q.utgåendeMoms,
      0
    );
    const totalIngående = Object.values(quarters).reduce(
      (s, q) => s + q.ingåendeMoms,
      0
    );

    res.json({
      year,
      ...(quarter ? { quarter } : {}),
      quarters: result,
      totals: {
        utgåendeMoms: Math.round(totalUtgående * 100) / 100,
        ingåendeMoms: Math.round(totalIngående * 100) / 100,
        momsAttBetala: Math.round((totalUtgående - totalIngående) * 100) / 100,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating VAT report:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/cashflow – Kassaflödesanalys (daily in/out, net)
// ---------------------------------------------------------------------------
router.get("/reports/cashflow", async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : undefined;

    let startDate: string;
    let endDate: string;

    if (month) {
      startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // Cash accounts: 19xx (Kassa, PlusGiro, Bank)
    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("account_number, account_name, debit, credit, date, description")
      .gte("date", startDate)
      .lte("date", endDate)
      .gte("account_number", "1900")
      .lte("account_number", "1999")
      .order("date", { ascending: true });

    if (error) throw error;

    // Aggregate by day
    const dailyFlow: Record<
      string,
      { inflow: number; outflow: number; net: number }
    > = {};

    for (const e of entries ?? []) {
      const day = e.date;
      if (!dailyFlow[day]) {
        dailyFlow[day] = { inflow: 0, outflow: 0, net: 0 };
      }
      const debit = Number(e.debit) || 0;
      const credit = Number(e.credit) || 0;

      dailyFlow[day].inflow += debit; // money coming in
      dailyFlow[day].outflow += credit; // money going out
      dailyFlow[day].net += debit - credit;
    }

    // Build sorted daily array with running balance
    let runningBalance = 0;
    const days = Object.entries(dailyFlow)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, flow]) => {
        runningBalance += flow.net;
        return {
          date,
          inflow: Math.round(flow.inflow * 100) / 100,
          outflow: Math.round(flow.outflow * 100) / 100,
          net: Math.round(flow.net * 100) / 100,
          runningBalance: Math.round(runningBalance * 100) / 100,
        };
      });

    const totalInflow = days.reduce((s, d) => s + d.inflow, 0);
    const totalOutflow = days.reduce((s, d) => s + d.outflow, 0);

    res.json({
      period: { startDate, endDate },
      days,
      totals: {
        inflow: Math.round(totalInflow * 100) / 100,
        outflow: Math.round(totalOutflow * 100) / 100,
        net: Math.round((totalInflow - totalOutflow) * 100) / 100,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error generating cashflow report:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
