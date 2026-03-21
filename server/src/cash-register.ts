/**
 * KASSAREGISTER — Kassasystem enligt SFL 39 kap. 4-14§§ + SKVFS 2014:9
 *
 * VIKTIGT LAGKRAV:
 *  pixdrift är kassasystem (mjukvara) men ERSÄTTER INTE en certifierad
 *  kontrollenhet (CE). CE krävs separat och måste vara godkänd av
 *  Skatteverket. Se TAX_COMPLIANCE.md för detaljer.
 *
 * Lagstöd:
 *  - SFL 2011:1244, 39 kap. 4-14§§
 *  - SKVFS 2014:9 (Skatteverkets föreskrifter om kassaregister)
 *  - BFL 1999:1078, 7 kap. (7 års lagringstid)
 *
 * Sanktioner:
 *  - Kontrollavgift 10 000 kr vid saknat kassaregister (SFL 50:7)
 *  - Ytterligare 20 000 kr om ej åtgärdat inom tid
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

// ─── Typer ──────────────────────────────────────────────────────────────────
interface SaleItem {
  description: string;
  quantity: number;
  unit_price: number;      // Exkl. moms
  vat_rate: 6 | 12 | 25;  // Svenska momssatser (ML 2023:200)
}

interface SaleRequest {
  items: SaleItem[];
  payment_method: 'cash' | 'card' | 'swish' | 'invoice';
  cash_received?: number;
  workplace_id: string;
  ce_number?: string;  // Kontrollenhets-nummer från certifierad CE
}

// ─── Momsberäkning (ML 2023:200) ────────────────────────────────────────────
function calculateVat(netAmount: number, vatRate: number): {
  net: number;
  vat: number;
  gross: number;
} {
  const vat = Math.round(netAmount * (vatRate / 100) * 100) / 100;
  return {
    net: Math.round(netAmount * 100) / 100,
    vat: vat,
    gross: Math.round((netAmount + vat) * 100) / 100,
  };
}

// ─── Beräkna totaler per momssats ────────────────────────────────────────────
function calculateSaleTotals(items: SaleItem[]) {
  let vat25Net = 0, vat25 = 0;
  let vat12Net = 0, vat12 = 0;
  let vat6Net  = 0, vat6  = 0;

  for (const item of items) {
    const lineNet = item.unit_price * item.quantity;
    const { vat } = calculateVat(lineNet, item.vat_rate);
    if (item.vat_rate === 25) { vat25Net += lineNet; vat25 += vat; }
    if (item.vat_rate === 12) { vat12Net += lineNet; vat12 += vat; }
    if (item.vat_rate === 6)  { vat6Net  += lineNet; vat6  += vat; }
  }

  const totalNet   = vat25Net + vat12Net + vat6Net;
  const totalVat   = vat25 + vat12 + vat6;
  const totalGross = totalNet + totalVat;

  return {
    vat_25: Math.round(vat25 * 100) / 100,
    vat_12: Math.round(vat12 * 100) / 100,
    vat_6:  Math.round(vat6  * 100) / 100,
    net_amount:   Math.round(totalNet   * 100) / 100,
    vat_amount:   Math.round(totalVat   * 100) / 100,
    gross_amount: Math.round(totalGross * 100) / 100,
  };
}

// ─── Kedjehash för journalintegritet (SKVFS 2014:9) ─────────────────────────
async function calculateJournalHash(
  receiptNumber: number,
  amount: number,
  previousHash: string
): Promise<string> {
  const data = `${receiptNumber}|${amount}|${previousHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ─── Generera kvitto-HTML (SKVFS 2014:9 §18) ────────────────────────────────
function generateReceiptHtml(params: {
  receiptNumber: number;
  ceNumber: string;
  companyName: string;
  companyAddress: string;
  orgNumber: string;
  date: string;
  time: string;
  items: SaleItem[];
  totals: ReturnType<typeof calculateSaleTotals>;
  paymentMethod: string;
  cashReceived?: number;
  changeDue?: number;
  isCopy?: boolean;
}): string {
  const {
    receiptNumber, ceNumber, companyName, companyAddress, orgNumber,
    date, time, items, totals, paymentMethod, cashReceived, changeDue, isCopy
  } = params;

  const itemRows = items.map(item => {
    const lineGross = item.unit_price * item.quantity * (1 + item.vat_rate / 100);
    return `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:right">${item.quantity} st</td>
        <td style="text-align:right">${lineGross.toFixed(2)} kr</td>
        <td style="color:#999;font-size:0.8em">${item.vat_rate}%</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>Kvitto ${receiptNumber}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    .separator { border-top: 1px dashed #000; margin: 6px 0; }
    .totals td { font-weight: bold; }
    .vat-summary { font-size: 10px; color: #333; }
    .copy-stamp { 
      text-align: center; color: red; font-size: 18px; font-weight: bold; 
      border: 2px solid red; padding: 4px; margin-bottom: 8px; 
    }
    .footer { text-align: center; margin-top: 8px; font-size: 10px; color: #666; }
    .legal { font-size: 9px; color: #999; text-align: center; }
  </style>
</head>
<body>
  ${isCopy ? '<div class="copy-stamp">⚠ KOPIA ⚠</div>' : ''}
  <div class="header">
    <strong>${companyName}</strong><br>
    ${companyAddress}<br>
    Org.nr: ${orgNumber}
  </div>
  <div class="meta">
    <span>Kvitto nr: <strong>${receiptNumber}</strong></span>
    <span>CE: ${ceNumber || 'SE DOKUMENTATION'}</span>
  </div>
  <div class="meta">
    <span>${date}</span>
    <span>${time}</span>
  </div>
  <div class="separator"></div>
  <table>
    <tbody>
      ${itemRows}
    </tbody>
  </table>
  <div class="separator"></div>
  <table class="vat-summary">
    ${totals.vat_25 > 0 ? `<tr><td>Moms 25%:</td><td style="text-align:right">${totals.vat_25.toFixed(2)} kr</td></tr>` : ''}
    ${totals.vat_12 > 0 ? `<tr><td>Moms 12%:</td><td style="text-align:right">${totals.vat_12.toFixed(2)} kr</td></tr>` : ''}
    ${totals.vat_6  > 0 ? `<tr><td>Moms 6%:</td><td style="text-align:right">${totals.vat_6.toFixed(2)} kr</td></tr>` : ''}
  </table>
  <div class="separator"></div>
  <table class="totals">
    <tr><td>TOTALT:</td><td style="text-align:right">${totals.gross_amount.toFixed(2)} kr</td></tr>
    ${paymentMethod === 'cash' ? `
    <tr><td>Kontant:</td><td style="text-align:right">${(cashReceived || 0).toFixed(2)} kr</td></tr>
    <tr><td>Växel:</td><td style="text-align:right">${(changeDue || 0).toFixed(2)} kr</td></tr>
    ` : `<tr><td>${paymentMethodLabel(paymentMethod)}:</td><td style="text-align:right">${totals.gross_amount.toFixed(2)} kr</td></tr>`}
  </table>
  <div class="separator"></div>
  <div class="footer">Tack för besöket!</div>
  <div class="legal">
    Lagrat enligt SFL 39 kap. + BFL 7 kap. (7 år)<br>
    SKVFS 2014:9 §18
  </div>
</body>
</html>`;
}

function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Kontant', card: 'Kort', swish: 'Swish', invoice: 'Faktura'
  };
  return labels[method] || method;
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// ─── POST /api/cash-register/sale ───────────────────────────────────────────
/**
 * Registrera kassaförsäljning (SFL 39:5, SKVFS 2014:9)
 * Skapar immutable journal-entry med kedjehash
 */
router.post('/sale', async (req: Request, res: Response) => {
  try {
    const body = req.body as SaleRequest;
    const { items, payment_method, cash_received, workplace_id, ce_number } = body;

    if (!items?.length || !payment_method || !workplace_id) {
      return res.status(400).json({ error: 'items, payment_method och workplace_id krävs' });
    }

    // Validera momssatser
    const validRates = [6, 12, 25];
    for (const item of items) {
      if (!validRates.includes(item.vat_rate)) {
        return res.status(400).json({
          error: `Ogiltig momssats: ${item.vat_rate}%. Svenska momssatser: 6%, 12%, 25% (ML 2023:200)`,
          law: 'Mervärdesskattelagen 2023:200',
        });
      }
    }

    const totals = calculateSaleTotals(items);

    // Kontrollera växel
    let changeDue = 0;
    if (payment_method === 'cash') {
      if (!cash_received || cash_received < totals.gross_amount) {
        return res.status(400).json({ error: 'Kontantbetalning: cash_received måste täcka totalen' });
      }
      changeDue = Math.round((cash_received - totals.gross_amount) * 100) / 100;
    }

    const supabase = getSupabase();

    // Hämta föregående hash för kedjan (SKVFS 2014:9 — obrytbar journal)
    const { data: lastTx } = await supabase
      .from('cash_transactions')
      .select('receipt_number, journal_hash')
      .eq('workplace_id', workplace_id)
      .order('receipt_number', { ascending: false })
      .limit(1)
      .single();

    const previousHash = lastTx?.journal_hash || '0000000000000000';

    // Hämta arbetsplatsinformation för kvitto
    const { data: workplace } = await supabase
      .from('workplaces')
      .select('*')
      .eq('id', workplace_id)
      .single();

    // Hämta organisationsinformation
    const { data: org } = await supabase
      .from('organizations')
      .select('name, address, org_number')
      .eq('id', (req as any).orgId)
      .single();

    const now = new Date();
    const dateStr = now.toLocaleDateString('sv-SE');
    const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Infoga transaktion (receipt_number är BIGSERIAL — aldrig återanvänt)
    const { data: tx, error } = await supabase
      .from('cash_transactions')
      .insert({
        org_id: (req as any).orgId,
        workplace_id,
        transaction_time: now.toISOString(),
        items,
        payment_method,
        gross_amount: totals.gross_amount,
        vat_25: totals.vat_25,
        vat_12: totals.vat_12,
        vat_6:  totals.vat_6,
        cash_received: payment_method === 'cash' ? cash_received : null,
        change_given:  payment_method === 'cash' ? changeDue : null,
        cashier_id: (req as any).userId,
        ce_number: ce_number || null,
        journal_hash: 'pending', // Uppdateras nedan
      })
      .select('id, receipt_number')
      .single();

    if (error) throw error;

    // Beräkna kedjehash och uppdatera
    const journalHash = await calculateJournalHash(
      tx.receipt_number,
      totals.gross_amount,
      previousHash
    );
    await supabase
      .from('cash_transactions')
      .update({ journal_hash: journalHash })
      .eq('id', tx.id);

    // Generera kvitto-HTML
    const receiptHtml = generateReceiptHtml({
      receiptNumber: tx.receipt_number,
      ceNumber: ce_number || 'EJ ANSLUTEN — SE DOKUMENTATION',
      companyName: org?.name || '',
      companyAddress: org?.address || workplace?.address || '',
      orgNumber: org?.org_number || '',
      date: dateStr,
      time: timeStr,
      items,
      totals,
      paymentMethod: payment_method,
      cashReceived: cash_received,
      changeDue,
    });

    return res.status(201).json({
      receipt_number: tx.receipt_number,
      transaction_id: tx.id,
      totals,
      change_due: changeDue,
      receipt_html: receiptHtml,
      journal_hash: journalHash,
      ce_warning: !ce_number
        ? 'VARNING: Ingen kontrollenhet ansluten. Certifierad CE krävs enligt SKVFS 2014:9!'
        : null,
      law_reference: 'SFL 39 kap. 5§, SKVFS 2014:9 §18',
    });
  } catch (err: any) {
    console.error('Cash register sale error:', err);
    return res.status(500).json({ error: 'Serverfel vid kassaregistrering' });
  }
});

// ─── POST /api/cash-register/z-report ───────────────────────────────────────
/**
 * Z-rapport (daglig stängningsrapport) — SKVFS 2014:9
 * Immutable: skapas en gång per dag, kan ej ändras
 */
router.post('/z-report', async (req: Request, res: Response) => {
  try {
    const { workplace_id, date } = req.query;
    const reportDate = (date as string) || new Date().toISOString().slice(0, 10);

    if (!workplace_id) return res.status(400).json({ error: 'workplace_id krävs' });

    const supabase = getSupabase();

    // Kontrollera om Z-rapport redan finns (en per dag, immutable)
    const { data: existing } = await supabase
      .from('z_reports')
      .select('id')
      .eq('workplace_id', workplace_id)
      .eq('report_date', reportDate)
      .single();

    if (existing) {
      return res.status(409).json({
        error: `Z-rapport för ${reportDate} existerar redan och kan inte ändras`,
        law: 'SKVFS 2014:9 — Z-rapport är immutable',
      });
    }

    // Summera dagens transaktioner
    const { data: transactions } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('workplace_id', workplace_id)
      .gte('transaction_time', `${reportDate}T00:00:00Z`)
      .lte('transaction_time', `${reportDate}T23:59:59Z`)
      .eq('voided', false);

    const txs = transactions || [];
    if (txs.length === 0) {
      return res.status(400).json({
        error: `Inga transaktioner för ${reportDate}`,
        message: 'Z-rapport kan endast skapas om det finns transaktioner',
      });
    }

    const totalSales = txs.reduce((s, t) => s + parseFloat(t.gross_amount), 0);
    const totalVat25 = txs.reduce((s, t) => s + parseFloat(t.vat_25 || 0), 0);
    const totalVat12 = txs.reduce((s, t) => s + parseFloat(t.vat_12 || 0), 0);
    const totalVat6  = txs.reduce((s, t) => s + parseFloat(t.vat_6  || 0), 0);
    const cashSales  = txs.filter(t => t.payment_method === 'cash').reduce((s, t) => s + parseFloat(t.gross_amount), 0);
    const cardSales  = txs.filter(t => t.payment_method === 'card').reduce((s, t) => s + parseFloat(t.gross_amount), 0);
    const receiptNumbers = txs.map(t => t.receipt_number).sort();

    const { data: report, error } = await supabase
      .from('z_reports')
      .insert({
        org_id: (req as any).orgId,
        workplace_id,
        report_date: reportDate,
        total_sales:  Math.round(totalSales * 100) / 100,
        total_vat_25: Math.round(totalVat25 * 100) / 100,
        total_vat_12: Math.round(totalVat12 * 100) / 100,
        total_vat_6:  Math.round(totalVat6  * 100) / 100,
        transaction_count: txs.length,
        cash_sales: Math.round(cashSales * 100) / 100,
        card_sales: Math.round(cardSales * 100) / 100,
        first_receipt_number: receiptNumbers[0],
        last_receipt_number:  receiptNumbers[receiptNumbers.length - 1],
        generated_by: (req as any).userId,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      ...report,
      message: 'Z-rapport skapad och sparad permanent (BFL 7 kap. — 7 år)',
      law_reference: 'SKVFS 2014:9, BFL 1999:1078 7 kap.',
    });
  } catch (err: any) {
    console.error('Z-report error:', err);
    return res.status(500).json({ error: 'Serverfel vid Z-rapport' });
  }
});

// ─── GET /api/cash-register/journal ─────────────────────────────────────────
router.get('/journal', async (req: Request, res: Response) => {
  try {
    const { workplace_id, from_date, to_date } = req.query;
    if (!workplace_id) return res.status(400).json({ error: 'workplace_id krävs' });

    const supabase = getSupabase();
    let query = supabase
      .from('cash_transactions')
      .select('*')
      .eq('workplace_id', workplace_id)
      .order('receipt_number', { ascending: true });

    if (from_date) query = query.gte('transaction_time', `${from_date}T00:00:00Z`);
    if (to_date)   query = query.lte('transaction_time', `${to_date}T23:59:59Z`);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({
      count: data?.length || 0,
      transactions: data || [],
      note: 'Immutable journal — SKVFS 2014:9. Data sparas 7 år (BFL 7 kap.)',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/cash-register/receipt/:receipt_number ─────────────────────────
/**
 * Kvitto-reprint — stämplas "KOPIA" (SKVFS 2014:9)
 */
router.get('/receipt/:receipt_number', async (req: Request, res: Response) => {
  try {
    const { receipt_number } = req.params;
    const supabase = getSupabase();

    const { data: tx, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('receipt_number', receipt_number)
      .single();

    if (error || !tx) return res.status(404).json({ error: 'Kvitto hittades inte' });

    const { data: org } = await supabase
      .from('organizations')
      .select('name, address, org_number')
      .eq('id', tx.org_id)
      .single();

    const txDate = new Date(tx.transaction_time);
    const totals = {
      vat_25: parseFloat(tx.vat_25),
      vat_12: parseFloat(tx.vat_12),
      vat_6:  parseFloat(tx.vat_6),
      net_amount:   parseFloat(tx.gross_amount) - parseFloat(tx.vat_25) - parseFloat(tx.vat_12) - parseFloat(tx.vat_6),
      vat_amount:   parseFloat(tx.vat_25) + parseFloat(tx.vat_12) + parseFloat(tx.vat_6),
      gross_amount: parseFloat(tx.gross_amount),
    };

    const receiptHtml = generateReceiptHtml({
      receiptNumber: tx.receipt_number,
      ceNumber: tx.ce_number || '',
      companyName: org?.name || '',
      companyAddress: org?.address || '',
      orgNumber: org?.org_number || '',
      date: txDate.toLocaleDateString('sv-SE'),
      time: txDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      items: tx.items,
      totals,
      paymentMethod: tx.payment_method,
      cashReceived: tx.cash_received ? parseFloat(tx.cash_received) : undefined,
      changeDue:    tx.change_given  ? parseFloat(tx.change_given)  : undefined,
      isCopy: true,
    });

    return res.json({
      receipt_number: tx.receipt_number,
      transaction_time: tx.transaction_time,
      is_copy: true,
      voided: tx.voided,
      receipt_html: receiptHtml,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/cash-register/status ──────────────────────────────────────────
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { workplace_id } = req.query;
    if (!workplace_id) return res.status(400).json({ error: 'workplace_id krävs' });

    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    const [txResult, zResult] = await Promise.all([
      supabase
        .from('cash_transactions')
        .select('gross_amount, payment_method, transaction_time')
        .eq('workplace_id', workplace_id)
        .gte('transaction_time', `${today}T00:00:00Z`)
        .eq('voided', false),
      supabase
        .from('z_reports')
        .select('*')
        .eq('workplace_id', workplace_id)
        .order('report_date', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const todayTxs = txResult.data || [];
    const todaySales = todayTxs.reduce((s, t) => s + parseFloat(t.gross_amount), 0);

    return res.json({
      today_date: today,
      today_transaction_count: todayTxs.length,
      today_total_sales: Math.round(todaySales * 100) / 100,
      z_report_done_today: zResult.data?.report_date === today,
      last_z_report: zResult.data || null,
      warning: !zResult.data
        ? 'Ingen Z-rapport har skapats. Daglig Z-rapport krävs enligt SKVFS 2014:9!'
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

export default router;
