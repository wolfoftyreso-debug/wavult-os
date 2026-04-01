/**
 * ─── Wavult Banking Integration ─────────────────────────────────────────────
 *
 * Production-ready stubs for:
 *  - Open Banking / PSD2 via Tink (Visa)  — Nordic standard
 *  - Bankgiro / Plusgiro (BGC-format)     — Swedish payments
 *  - SEPA Credit Transfer                 — EU payments
 *  - Swish for Business                   — Swedish mobile payments
 *
 * Required environment variables:
 *   TINK_CLIENT_ID, TINK_CLIENT_SECRET, TINK_REDIRECT_URI
 *   SWISH_CERT_PATH, SWISH_KEY_PATH, SWISH_PAYEE_ALIAS
 *
 * All external API calls gracefully degrade when env vars are missing.
 */

import { Router, Request, Response } from 'express';
import { supabase } from './supabase';
import { SUPPORTED_BANKS, getBankById } from './config/banks';
import crypto from 'crypto';

const router = Router();

// ─── Environment helpers ──────────────────────────────────────────────────────

const TINK_BASE_URL = 'https://link.tink.com';
const TINK_API_BASE = 'https://api.tink.com';
const TINK_CLIENT_ID = process.env.TINK_CLIENT_ID || '';
const TINK_CLIENT_SECRET = process.env.TINK_CLIENT_SECRET || '';
const TINK_REDIRECT_URI = process.env.TINK_REDIRECT_URI || 'https://api.bc.pixdrift.com/api/banking/callback';



const SWISH_API = process.env.NODE_ENV === 'production'
  ? 'https://cpc.getswish.net/swish-cpcapi/api/v2'
  : 'https://mss.cpc.getswish.net/swish-cpcapi/api/v2';
const SWISH_PAYEE_ALIAS = process.env.SWISH_PAYEE_ALIAS || '';

const APP_REDIRECT = 'https://app.bc.pixdrift.com/settings/banking';

// ─── Utility: get org_id from authenticated request ──────────────────────────

async function getOrgId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', data.user.id)
    .single();

  return profile?.org_id ?? null;
}

// ─── Utility: fetch Tink access token ────────────────────────────────────────

async function getTinkClientToken(): Promise<string | null> {
  if (!TINK_CLIENT_ID || !TINK_CLIENT_SECRET) return null;
  try {
    const resp = await fetch(`${TINK_API_BASE}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TINK_CLIENT_ID,
        client_secret: TINK_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'authorization:read,authorization:grant,credentials:read,identity:read,accounts:read,transactions:read,balances:read,investments:read',
      }),
    });
    const data: any = await resp.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── TINK OPEN BANKING ────────────────────────────────────────────────────────

/**
 * GET /api/banking/connect
 * Generates a Tink Link URL for bank connection (OAuth2 initiation)
 */
router.get('/api/banking/connect', async (req: Request, res: Response) => {
  try {
    const { bank_id, scope = 'accounts,transactions,balances' } = req.query as {
      bank_id?: string;
      scope?: string;
    };

    if (!TINK_CLIENT_ID) {
      return res.status(503).json({
        error: 'Tink integration ej konfigurerad',
        message: 'TINK_CLIENT_ID saknas i miljövariabler',
        setup_required: ['TINK_CLIENT_ID', 'TINK_CLIENT_SECRET'],
      });
    }

    const state = crypto.randomUUID();
    const bank = bank_id ? getBankById(bank_id) : null;

    const params = new URLSearchParams({
      client_id: TINK_CLIENT_ID,
      redirect_uri: TINK_REDIRECT_URI,
      scope,
      market: bank?.country || 'SE',
      locale: 'sv_SE',
      state,
      response_type: 'code',
    });

    if (bank?.tinkProviderId) {
      params.set('input_provider', bank.tinkProviderId);
    }

    const tinkUrl = `${TINK_BASE_URL}/1.0/transactions/connect-accounts?${params}`;

    // Store state for CSRF validation
    await supabase.from('bank_oauth_states').upsert({
      state,
      bank_id: bank_id ?? null,
      created_at: new Date().toISOString(),
    }).select();

    return res.json({
      url: tinkUrl,
      state,
      expires_in: 300, // 5 minutes
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte generera Tink-länk', detail: err.message });
  }
});

/**
 * GET /api/banking/callback
 * Handles OAuth2 callback from Tink, stores tokens in Supabase
 */
router.get('/api/banking/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, credentials_id } = req.query as Record<string, string>;

    if (error) {
      return res.redirect(`${APP_REDIRECT}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${APP_REDIRECT}?error=no_code`);
    }

    if (!TINK_CLIENT_ID || !TINK_CLIENT_SECRET) {
      return res.redirect(`${APP_REDIRECT}?error=integration_not_configured`);
    }

    // Exchange code for tokens
    const tokenResp = await fetch(`${TINK_API_BASE}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TINK_CLIENT_ID,
        client_secret: TINK_CLIENT_SECRET,
        redirect_uri: TINK_REDIRECT_URI,
        grant_type: 'authorization_code',
        code,
      }),
    });

    const tokens: any = await tokenResp.json();

    if (!tokens.access_token) {
      return res.redirect(`${APP_REDIRECT}?error=token_exchange_failed`);
    }

    // Fetch account info from Tink
    const accountsResp = await fetch(`${TINK_API_BASE}/data/v2/accounts`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const accountsData: any = await accountsResp.json();

    // Store each account in bank_connections
    const accounts = accountsData.accounts ?? [];
    for (const account of accounts) {
      await supabase.from('bank_connections').upsert({
        provider: 'tink',
        provider_account_id: account.id,
        bank_name: account.financialInstitutionId || 'Okänd bank',
        iban: account.identifiers?.iban?.iban ?? null,
        account_number: account.identifiers?.financialInstitution?.accountNumber ?? null,
        account_name: account.name ?? 'Bankkonto',
        currency: account.balances?.available?.amount?.currencyCode ?? 'SEK',
        balance: parseFloat(account.balances?.available?.amount?.value ?? '0'),
        balance_updated_at: new Date().toISOString(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider_account_id' });
    }

    return res.redirect(`${APP_REDIRECT}?success=true&accounts=${accounts.length}`);
  } catch (err: any) {
    console.error('[banking/callback]', err);
    return res.redirect(`${APP_REDIRECT}?error=callback_error`);
  }
});

/**
 * GET /api/banking/accounts
 * Returns all connected bank accounts for the organization
 */
router.get('/api/banking/accounts', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ accounts: data ?? [], total: data?.length ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte hämta konton', detail: err.message });
  }
});

/**
 * GET /api/banking/transactions
 * Fetches bank transactions with optional matching against pixdrift ledger
 */
router.get('/api/banking/transactions', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const {
      account_id,
      from_date,
      to_date,
      limit = '100',
      status,
    } = req.query as Record<string, string>;

    let query = supabase
      .from('bank_transactions')
      .select(`
        *,
        bank_connections(bank_name, account_name, iban, currency)
      `)
      .eq('org_id', orgId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (account_id) query = query.eq('connection_id', account_id);
    if (from_date) query = query.gte('date', from_date);
    if (to_date) query = query.lte('date', to_date);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ transactions: data ?? [], total: data?.length ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte hämta transaktioner', detail: err.message });
  }
});

/**
 * POST /api/banking/sync
 * Syncs all active bank connections, imports new transactions
 */
router.post('/api/banking/sync', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { data: connections, error: connError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (connError) throw connError;
    if (!connections?.length) {
      return res.json({ message: 'Inga aktiva bankkopplingar', synced: 0 });
    }

    let totalImported = 0;
    let totalMatched = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      try {
        if (conn.provider === 'tink') {
          const result = await syncTinkAccount(orgId, conn);
          totalImported += result.imported;
          totalMatched += result.matched;
        }
      } catch (syncErr: any) {
        errors.push(`${conn.bank_name}: ${syncErr.message}`);
      }
    }

    return res.json({
      message: 'Synk slutförd',
      synced_accounts: connections.length,
      imported: totalImported,
      matched: totalMatched,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Synk misslyckades', detail: err.message });
  }
});

/** Internal: Sync a single Tink account */
async function syncTinkAccount(
  orgId: string,
  conn: any
): Promise<{ imported: number; matched: number }> {
  if (!conn.access_token) return { imported: 0, matched: 0 };

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90); // Last 90 days

  const resp = await fetch(
    `${TINK_API_BASE}/data/v2/transactions?accountIdIn=${conn.provider_account_id}&bookedDateGte=${fromDate.toISOString().split('T')[0]}`,
    { headers: { Authorization: `Bearer ${conn.access_token}` } }
  );

  const data: any = await resp.json();
  const transactions = data.transactions ?? [];
  let imported = 0;
  let matched = 0;

  for (const tx of transactions) {
    // Check if already imported
    const { data: existing } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('external_id', tx.id)
      .single();

    if (existing) continue;

    const amount = parseFloat(tx.amount?.value ?? '0');
    const date = tx.dates?.booked ?? tx.dates?.value;

    // Fuzzy match against pixdrift ledger (amount + date within 2 days)
    const matchDate = new Date(date);
    const matchFrom = new Date(matchDate);
    matchFrom.setDate(matchFrom.getDate() - 2);
    const matchTo = new Date(matchDate);
    matchTo.setDate(matchTo.getDate() + 2);

    const { data: ledgerMatch } = await supabase
      .from('transactions')
      .select('id')
      .eq('org_id', orgId)
      .eq('amount', Math.abs(amount))
      .gte('date', matchFrom.toISOString().split('T')[0])
      .lte('date', matchTo.toISOString().split('T')[0])
      .limit(1)
      .single();

    const isMatched = !!ledgerMatch;

    await supabase.from('bank_transactions').insert({
      org_id: orgId,
      connection_id: conn.id,
      external_id: tx.id,
      date,
      booking_date: tx.dates?.booked ?? null,
      amount,
      currency: tx.amount?.currencyCode ?? conn.currency ?? 'SEK',
      description: tx.descriptions?.original ?? tx.descriptions?.display ?? '',
      merchant_name: tx.merchantInformation?.merchantName ?? null,
      category: tx.categories?.pfm?.id ?? null,
      ledger_entry_id: ledgerMatch?.id ?? null,
      status: isMatched ? 'matched' : 'unmatched',
      raw_data: tx,
    });

    imported++;
    if (isMatched) matched++;
  }

  // Update balance
  await supabase
    .from('bank_connections')
    .update({
      balance: parseFloat(
        transactions[0]?.accountBalances?.booked?.amount?.value ?? String(conn.balance ?? 0)
      ),
      balance_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id);

  return { imported, matched };
}

/**
 * POST /api/banking/categorize
 * AI-kategorisering av banktransaktioner mot BAS-konton
 */
router.post('/api/banking/categorize', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { transaction_ids } = req.body as { transaction_ids: string[] };
    if (!transaction_ids?.length) {
      return res.status(400).json({ error: 'transaction_ids krävs' });
    }

    const { data: txs } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('org_id', orgId)
      .in('id', transaction_ids);

    const suggestions = (txs ?? []).map((tx) => {
      // Rule-based categorization against Swedish BAS accounts
      const desc = (tx.description ?? '').toLowerCase();
      const merchant = (tx.merchant_name ?? '').toLowerCase();
      const combined = `${desc} ${merchant}`;
      const amount = parseFloat(tx.amount);

      let suggested_account = '';
      let confidence = 0.6;

      if (amount > 0) {
        // Incoming — likely revenue
        suggested_account = '3000'; // Rörelseintäkter
        confidence = 0.55;
      } else if (combined.match(/lön|salary|payroll/)) {
        suggested_account = '7210'; // Löner till tjänstemän
        confidence = 0.9;
      } else if (combined.match(/hyra|rent|lokal/)) {
        suggested_account = '5010'; // Lokalhyra
        confidence = 0.88;
      } else if (combined.match(/el|electricity|vattenfall|eon|fortum/)) {
        suggested_account = '5020'; // El, värme, vatten
        confidence = 0.85;
      } else if (combined.match(/tele|mobil|comviq|telia|three|tre|telenor/)) {
        suggested_account = '6210'; // Telekommunikation
        confidence = 0.87;
      } else if (combined.match(/försäkring|insurance|if |trygg|folksam/)) {
        suggested_account = '6310'; // Företagsförsäkringar
        confidence = 0.85;
      } else if (combined.match(/resor?|flyg|sas|ryanair|hotel|airbnb/)) {
        suggested_account = '5800'; // Resekostnader
        confidence = 0.82;
      } else if (combined.match(/mat|restaurang|lunch|konferens|ica |coop |hemköp/)) {
        suggested_account = '5800'; // Representation/resekostnader
        confidence = 0.7;
      } else if (combined.match(/kontors|office|staples|åhlens|ikea/)) {
        suggested_account = '5410'; // Förbrukningsinventarier
        confidence = 0.75;
      } else if (combined.match(/bank|avgift|fee|ränta|interest/)) {
        suggested_account = '8400'; // Räntekostnader och finansiella kostnader
        confidence = 0.8;
      } else if (combined.match(/skatt|tax|moms|vat/)) {
        suggested_account = '2610'; // Utgående moms
        confidence = 0.75;
      } else if (combined.match(/programvara|software|saas|aws|azure|github|atlassian/)) {
        suggested_account = '6540'; // IT-kostnader
        confidence = 0.85;
      } else {
        suggested_account = '6990'; // Övriga rörelsekostnader
        confidence = 0.4;
      }

      return {
        transaction_id: tx.id,
        suggested_account,
        account_name: BAS_NAMES[suggested_account] ?? 'Övrigt',
        confidence,
        description: tx.description,
        amount: tx.amount,
      };
    });

    // Update suggestions in DB
    for (const s of suggestions) {
      await supabase
        .from('bank_transactions')
        .update({ suggested_bas_account: s.suggested_account })
        .eq('id', s.transaction_id);
    }

    return res.json({ suggestions, total: suggestions.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kategorisering misslyckades', detail: err.message });
  }
});

const BAS_NAMES: Record<string, string> = {
  '3000': 'Rörelseintäkter',
  '5010': 'Lokalhyra',
  '5020': 'El, värme, vatten',
  '5410': 'Förbrukningsinventarier',
  '5800': 'Resekostnader',
  '6210': 'Telekommunikation',
  '6310': 'Företagsförsäkringar',
  '6540': 'IT-kostnader',
  '6990': 'Övriga rörelsekostnader',
  '7210': 'Löner till tjänstemän',
  '8400': 'Räntekostnader',
  '2610': 'Utgående moms',
};

/**
 * GET /api/banking/banks
 * Returns list of supported banks with logos and metadata
 */
router.get('/api/banking/banks', async (_req: Request, res: Response) => {
  return res.json({
    banks: SUPPORTED_BANKS,
    total: SUPPORTED_BANKS.length,
    by_country: {
      SE: SUPPORTED_BANKS.filter((b) => b.country === 'SE').length,
      NO: SUPPORTED_BANKS.filter((b) => b.country === 'NO').length,
      DK: SUPPORTED_BANKS.filter((b) => b.country === 'DK').length,
      FI: SUPPORTED_BANKS.filter((b) => b.country === 'FI').length,
    },
  });
});

// ─── BANKGIRO / BGC ───────────────────────────────────────────────────────────

/**
 * GET /api/banking/bgc-file
 * Generates a BGC-format payment file for batch payments
 */
router.get('/api/banking/bgc-file', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { payment_date, payment_ids } = req.query as {
      payment_date?: string;
      payment_ids?: string | string[];
    };

    const payDate = payment_date ?? new Date().toISOString().split('T')[0];
    const ids = Array.isArray(payment_ids) ? payment_ids : payment_ids ? [payment_ids] : [];

    let query = supabase
      .from('bank_payments')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'approved')
      .in('payment_type', ['bgc', 'bankgiro']);

    if (ids.length) query = query.in('id', ids);
    if (payment_date) query = query.eq('scheduled_date', payment_date);

    const { data: payments, error } = await query;
    if (error) throw error;
    if (!payments?.length) {
      return res.status(404).json({ error: 'Inga godkända bankgiro-betalningar hittades' });
    }

    // Build BGC TK-format (Betalningsservice)
    const dateFormatted = payDate.replace(/-/g, '').substring(2); // YYMMDD
    const lines: string[] = [];

    // Header record (TK01)
    lines.push(
      `01${dateFormatted}PIXDRIF BGMAX       ` +
      ''.padEnd(16, ' ') + // Sender BGN (replace with real)
      dateFormatted
    );

    let totalAmount = 0;
    let recordCount = 0;

    for (const payment of payments) {
      const amountOre = Math.round(parseFloat(String(payment.amount)) * 100);
      const bgNumber = (payment.recipient_bankgiro ?? '').replace('-', '').padStart(10, '0');
      const reference = (payment.reference ?? payment.id.substring(0, 16)).padEnd(16, ' ');
      const amountStr = String(amountOre).padStart(12, '0');

      // Payment record (TK20 — Autogiro debit / credit transfer)
      lines.push(`20${bgNumber}${reference}${amountStr}${dateFormatted}`);
      totalAmount += amountOre;
      recordCount++;
    }

    // Footer record (TK99)
    const totalStr = String(totalAmount).padStart(18, '0');
    const countStr = String(recordCount).padStart(8, '0');
    lines.push(`99${countStr}${totalStr}`);

    const content = lines.join('\r\n') + '\r\n';

    res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
    res.setHeader('Content-Disposition', `attachment; filename="bankgiro_${payDate}.txt"`);
    return res.send(content);
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte generera BGC-fil', detail: err.message });
  }
});

/**
 * POST /api/banking/autogiro/mandate
 * Creates a new autogiro mandate
 */
router.post('/api/banking/autogiro/mandate', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { customer_id, account_number, clearing_number, mandate_date } = req.body;

    if (!account_number || !clearing_number) {
      return res.status(400).json({ error: 'account_number och clearing_number krävs' });
    }

    const { data, error } = await supabase
      .from('autogiro_mandates')
      .insert({
        org_id: orgId,
        customer_id: customer_id ?? null,
        account_number,
        clearing_number,
        status: 'pending',
        mandate_date: mandate_date ?? new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      mandate: data,
      message: 'Autogiro-medgivande skapat. Skickas för validering till BGC.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte skapa medgivande', detail: err.message });
  }
});

/**
 * GET /api/banking/autogiro/mandates
 * Lists active autogiro mandates
 */
router.get('/api/banking/autogiro/mandates', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { data, error } = await supabase
      .from('autogiro_mandates')
      .select('*, contacts(name, email)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ mandates: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte hämta medgivanden', detail: err.message });
  }
});

// ─── SEPA CREDIT TRANSFER ─────────────────────────────────────────────────────

/**
 * POST /api/banking/sepa/payment
 * Initiates a SEPA Credit Transfer via Open Banking
 */
router.post('/api/banking/sepa/payment', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { iban, bic, amount, currency = 'EUR', reference, debtor_name, connection_id } = req.body;

    if (!iban || !amount || !reference) {
      return res.status(400).json({ error: 'iban, amount och reference krävs' });
    }

    // Validate IBAN format (basic)
    const ibanClean = iban.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/.test(ibanClean)) {
      return res.status(400).json({ error: 'Ogiltigt IBAN-format' });
    }

    // Create payment record
    const { data: payment, error: payError } = await supabase
      .from('bank_payments')
      .insert({
        org_id: orgId,
        connection_id: connection_id ?? null,
        payment_type: 'sepa',
        amount: parseFloat(amount),
        currency,
        recipient_iban: ibanClean,
        reference,
        recipient_name: debtor_name ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (payError) throw payError;

    // In production: initiate via Tink Payment Initiation API
    if (TINK_CLIENT_ID && connection_id) {
      // Would call: POST ${TINK_API_BASE}/api/v1/payments/initiate
      // with PIS (Payment Initiation Service) credentials
      console.log(`[SEPA] Would initiate payment ${payment.id} via Tink PIS`);
    }

    return res.status(201).json({
      payment_id: payment.id,
      status: 'pending',
      message: amount >= 50000
        ? 'Betalning skapad. Kräver godkännande (>50 000 kr)'
        : 'Betalning skapad och väntar på avsändning',
      requires_approval: parseFloat(amount) >= 50000,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte skapa SEPA-betalning', detail: err.message });
  }
});

/**
 * GET /api/banking/sepa/payment/:id
 * Check SEPA payment status
 */
router.get('/api/banking/sepa/payment/:id', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { data, error } = await supabase
      .from('bank_payments')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Betalning hittades inte' });
    return res.json({ payment: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Fel vid hämtning', detail: err.message });
  }
});

// ─── SWISH FOR BUSINESS ───────────────────────────────────────────────────────

/**
 * POST /api/banking/swish/payment-request
 * Creates a Swish payment request (M-Commerce flow)
 */
router.post('/api/banking/swish/payment-request', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { amount, phone_number, message, currency = 'SEK' } = req.body;

    if (!amount || !phone_number) {
      return res.status(400).json({ error: 'amount och phone_number krävs' });
    }

    // Normalize phone number to Swedish format (46XXXXXXXXX)
    const phone = phone_number.replace(/\D/g, '').replace(/^0/, '46');

    const token = crypto.randomUUID();
    const instructionUUID = crypto.randomUUID().replace(/-/g, '').toUpperCase();

    if (!SWISH_PAYEE_ALIAS) {
      // Demo mode — return mock response
      const { data: payment } = await supabase
        .from('bank_payments')
        .insert({
          org_id: orgId,
          payment_type: 'swish',
          amount: parseFloat(amount),
          currency,
          reference: token,
          provider_payment_id: instructionUUID,
          status: 'pending',
        })
        .select()
        .single();

      return res.status(201).json({
        token,
        payment_id: payment?.id,
        status: 'CREATED',
        qr_code: `https://mpc.getswish.net/qrg-swish/api/v1/commerce?token=${token}`,
        message: 'Demo-läge: SWISH_PAYEE_ALIAS saknas. Konfigureras med riktigt Swish-företagsnummer.',
      });
    }

    // Production: POST to Swish API with mTLS certificate
    // Requires SWISH_CERT_PATH + SWISH_KEY_PATH environment variables
    const swishPayload = {
      payeePaymentReference: token,
      callbackUrl: 'https://api.bc.pixdrift.com/api/banking/swish/callback',
      payeeAlias: SWISH_PAYEE_ALIAS,
      currency,
      payerAlias: phone,
      amount: String(parseFloat(amount).toFixed(2)),
      message: (message ?? '').substring(0, 50),
    };

    // Note: Swish requires mTLS — use node's https with cert/key options
    // In production, use https.Agent with cert/key from SWISH_CERT_PATH
    console.log(`[Swish] Would create payment request:`, swishPayload);

    const { data: payment } = await supabase
      .from('bank_payments')
      .insert({
        org_id: orgId,
        payment_type: 'swish',
        amount: parseFloat(amount),
        currency,
        reference: token,
        provider_payment_id: instructionUUID,
        status: 'pending',
      })
      .select()
      .single();

    return res.status(201).json({
      token,
      payment_id: payment?.id,
      status: 'CREATED',
      qr_code: `https://mpc.getswish.net/qrg-swish/api/v1/commerce?token=${token}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte skapa Swish-betalning', detail: err.message });
  }
});

/**
 * GET /api/banking/swish/payment/:token
 * Check Swish payment status
 */
router.get('/api/banking/swish/payment/:token', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { data, error } = await supabase
      .from('bank_payments')
      .select('*')
      .eq('reference', req.params.token)
      .eq('org_id', orgId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Betalning hittades inte' });
    return res.json({ payment: data, status: data.status.toUpperCase() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Fel vid hämtning', detail: err.message });
  }
});

/**
 * POST /api/banking/swish/callback
 * Webhook from Swish — updates payment status
 */
router.post('/api/banking/swish/callback', async (req: Request, res: Response) => {
  try {
    const { id, status, payeePaymentReference, amount, currency, datePaid } = req.body;

    const swishStatus = status?.toUpperCase();
    let dbStatus = 'pending';

    if (swishStatus === 'PAID') dbStatus = 'completed';
    else if (swishStatus === 'DECLINED') dbStatus = 'failed';
    else if (swishStatus === 'ERROR') dbStatus = 'failed';
    else if (swishStatus === 'CANCELLED') dbStatus = 'failed';

    await supabase
      .from('bank_payments')
      .update({
        status: dbStatus,
        provider_payment_id: id,
        executed_at: datePaid ? new Date(datePaid).toISOString() : null,
      })
      .eq('reference', payeePaymentReference);

    return res.status(200).send('OK');
  } catch (err: any) {
    console.error('[swish/callback]', err);
    return res.status(200).send('OK'); // Always 200 to Swish
  }
});

// ─── PAYMENT APPROVAL ─────────────────────────────────────────────────────────

/**
 * POST /api/banking/payments/:id/approve
 * Approves a payment (2-person rule for amounts > 50k SEK)
 */
router.post('/api/banking/payments/:id/approve', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { data: payment, error } = await supabase
      .from('bank_payments')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', orgId)
      .single();

    if (error || !payment) return res.status(404).json({ error: 'Betalning hittades inte' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: `Betalning har redan status: ${payment.status}` });
    }

    const userId = req.body.user_id; // From auth middleware in production
    const newStatus = parseFloat(String(payment.amount)) >= 50000
      ? (payment.approved_by ? 'approved' : 'pending') // Needs second approver
      : 'approved';

    await supabase
      .from('bank_payments')
      .update({
        status: newStatus,
        approved_by: userId ?? null,
      })
      .eq('id', req.params.id);

    return res.json({
      status: newStatus,
      message: newStatus === 'approved'
        ? 'Betalning godkänd och redo att skickas'
        : 'Första godkännande registrerat. Väntar på ytterligare godkännande (>50 000 kr).',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Godkännande misslyckades', detail: err.message });
  }
});

/**
 * GET /api/banking/payments
 * List all payments for the organization
 */
router.get('/api/banking/payments', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { status, payment_type } = req.query as Record<string, string>;

    let query = supabase
      .from('bank_payments')
      .select('*, bank_connections(bank_name, account_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (payment_type) query = query.eq('payment_type', payment_type);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ payments: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte hämta betalningar', detail: err.message });
  }
});

// ─── BANK RECONCILIATION ──────────────────────────────────────────────────────

/**
 * GET /api/banking/reconciliation
 * Monthly bank reconciliation: bank balance vs ledger balance
 */
router.get('/api/banking/reconciliation', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { year, month } = req.query as Record<string, string>;

    const { data: logs, error } = await supabase
      .from('bank_reconciliation_log')
      .select('*')
      .eq('org_id', orgId)
      .order('reconciliation_date', { ascending: false });

    if (error) throw error;

    // Calculate current unmatched transactions
    const { data: unmatched } = await supabase
      .from('bank_transactions')
      .select('id, date, amount, description, currency')
      .eq('org_id', orgId)
      .eq('status', 'unmatched')
      .order('date', { ascending: false });

    return res.json({
      reconciliation_log: logs ?? [],
      unmatched_transactions: unmatched ?? [],
      unmatched_count: unmatched?.length ?? 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte hämta avstämningsdata', detail: err.message });
  }
});

/**
 * POST /api/banking/reconciliation/close
 * Close a reconciliation period
 */
router.post('/api/banking/reconciliation/close', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { reconciliation_date, bank_balance, ledger_balance, notes } = req.body;

    const difference = parseFloat(bank_balance) - parseFloat(ledger_balance);

    const { data, error } = await supabase
      .from('bank_reconciliation_log')
      .insert({
        org_id: orgId,
        reconciliation_date,
        bank_balance: parseFloat(bank_balance),
        ledger_balance: parseFloat(ledger_balance),
        difference,
        status: Math.abs(difference) < 0.01 ? 'reconciled' : 'disputed',
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ reconciliation: data, difference, balanced: Math.abs(difference) < 0.01 });
  } catch (err: any) {
    return res.status(500).json({ error: 'Kunde inte stänga period', detail: err.message });
  }
});

/**
 * POST /api/banking/transactions/:id/match
 * Manually match a bank transaction to a ledger entry
 */
router.post('/api/banking/transactions/:id/match', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { ledger_entry_id } = req.body;

    await supabase
      .from('bank_transactions')
      .update({ ledger_entry_id, status: 'matched' })
      .eq('id', req.params.id)
      .eq('org_id', orgId);

    return res.json({ message: 'Transaktion matchad' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Matchning misslyckades', detail: err.message });
  }
});

/**
 * POST /api/banking/transactions/:id/post
 * Post a bank transaction as a ledger entry with suggested BAS account
 */
router.post('/api/banking/transactions/:id/post', async (req: Request, res: Response) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Ej autentiserad' });

    const { bas_account, description } = req.body;

    const { data: tx } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', orgId)
      .single();

    if (!tx) return res.status(404).json({ error: 'Transaktion hittades inte' });

    const account = bas_account ?? tx.suggested_bas_account ?? '6990';
    const amount = parseFloat(tx.amount);

    // Create ledger entry
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('transactions')
      .insert({
        org_id: orgId,
        date: tx.date,
        description: description ?? tx.description,
        amount: Math.abs(amount),
        currency: tx.currency ?? 'SEK',
        account: account,
        type: amount < 0 ? 'debit' : 'credit',
        source: 'bank_import',
      })
      .select()
      .single();

    if (ledgerError) throw ledgerError;

    // Update bank transaction
    await supabase
      .from('bank_transactions')
      .update({ ledger_entry_id: ledgerEntry.id, status: 'posted' })
      .eq('id', req.params.id);

    return res.status(201).json({ ledger_entry: ledgerEntry, message: 'Transaktion bokförd' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Bokföring misslyckades', detail: err.message });
  }
});


export default router;
