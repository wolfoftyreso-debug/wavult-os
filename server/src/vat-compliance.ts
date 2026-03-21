/**
 * MOMSHANTERING — Mervärdesskattelagen (ML 2023:200) + SFL 26 kap.
 *
 * Svenska momssatser (ML 2023:200):
 *  25% — standardsats (de flesta varor och tjänster)
 *  12% — livsmedel, hotell, restaurang (mat ej alkohol), transport
 *   6% — böcker, tidningar, kulturella tjänster, persontransport
 *   0% — export, inomeuropeisk försäljning, undantag
 *
 * Deklarationsperioder (SFL 26 kap.):
 *  Månadsvis: omsättning > 40 MSEK/år
 *  Kvartalsvis: omsättning 1-40 MSEK/år
 *  Årsvis: omsättning < 1 MSEK/år (valfritt upp till 40 MSEK)
 *
 * Förfallodatum: 26:e månaden efter perioden (ej helg/röd dag)
 *
 * OSS (One Stop Shop): EU-handel med konsumenter, tröskel 10 000 EUR/år
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// ─── Svenska momssatser ──────────────────────────────────────────────────────
export const VAT_RATES = {
  STANDARD: 25,
  FOOD_HOTEL: 12,
  CULTURE_TRANSPORT: 6,
  ZERO: 0,
} as const;

// Klassificering av varor/tjänster per momssats
export const VAT_CLASSIFICATIONS = {
  25: 'Standardsats — varor och tjänster generellt (ML 7:1)',
  12: 'Reducerad sats — livsmedel, hotell, restaurang, transport (ML 7:1 2 st.)',
   6: 'Reducerad sats — böcker, tidningar, kultur, persontransport (ML 7:1 3 st.)',
   0: 'Nollsats — export, EU-handel, undantag (ML 3 kap.)',
};

// ─── Beräkna moms ────────────────────────────────────────────────────────────
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { amount, vat_rate, price_includes_vat } = req.body;

    if (amount === undefined || vat_rate === undefined || price_includes_vat === undefined) {
      return res.status(400).json({ error: 'amount, vat_rate och price_includes_vat krävs' });
    }

    const validRates = [0, 6, 12, 25];
    if (!validRates.includes(vat_rate)) {
      return res.status(400).json({
        error: `Ogiltig momssats: ${vat_rate}%. Giltiga satser: ${validRates.join(', ')} % (ML 2023:200)`,
      });
    }

    let netAmount: number, vatAmount: number, grossAmount: number;

    if (price_includes_vat) {
      // Pris inkl. moms → beräkna netto
      grossAmount = amount;
      netAmount   = amount / (1 + vat_rate / 100);
      vatAmount   = grossAmount - netAmount;
    } else {
      // Pris exkl. moms → beräkna brutto
      netAmount   = amount;
      vatAmount   = amount * (vat_rate / 100);
      grossAmount = netAmount + vatAmount;
    }

    return res.json({
      net_amount:   Math.round(netAmount   * 100) / 100,
      vat_amount:   Math.round(vatAmount   * 100) / 100,
      gross_amount: Math.round(grossAmount * 100) / 100,
      vat_rate,
      vat_classification: VAT_CLASSIFICATIONS[vat_rate as keyof typeof VAT_CLASSIFICATIONS],
      law_reference: 'ML 2023:200, 7 kap.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── Beräkna förfallodatum för momsdeklaration ──────────────────────────────
function calculateVatDueDate(year: number, period: string): Date {
  let dueMonth: number, dueYear: number;

  if (period.startsWith('Q')) {
    const quarter = parseInt(period.slice(1));
    // Kvartal: Q1 → april, Q2 → juli, Q3 → oktober, Q4 → januari nästa år
    dueMonth = quarter * 3 + 1;
    dueYear  = dueMonth > 12 ? year + 1 : year;
    dueMonth = dueMonth > 12 ? dueMonth - 12 : dueMonth;
  } else {
    const month = parseInt(period);
    dueMonth = month === 12 ? 1 : month + 1;
    dueYear  = month === 12 ? year + 1 : year;
  }

  // Förfallodatum = 26:e (SFL 26:33)
  let dueDate = new Date(dueYear, dueMonth - 1, 26);

  // Flytta till nästa vardag om det är helg
  while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
    dueDate.setDate(dueDate.getDate() + 1);
  }

  return dueDate;
}

// ─── GET /api/vat/declaration ────────────────────────────────────────────────
/**
 * Momsdeklarationsunderlag (SFL 26 kap.)
 * period = månad (1-12) eller kvartal (Q1-Q4)
 */
router.get('/declaration', async (req: Request, res: Response) => {
  try {
    const { year, period } = req.query;

    if (!year || !period) {
      return res.status(400).json({ error: 'year och period krävs (period = 1-12 eller Q1-Q4)' });
    }

    const yearNum = parseInt(year as string);
    const periodStr = period as string;

    let fromDate: string, toDate: string;

    if (periodStr.startsWith('Q')) {
      const quarter = parseInt(periodStr.slice(1));
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth   = startMonth + 2;
      const endDay     = new Date(yearNum, endMonth, 0).getDate();
      fromDate = `${yearNum}-${String(startMonth).padStart(2, '0')}-01`;
      toDate   = `${yearNum}-${String(endMonth).padStart(2, '0')}-${endDay}`;
    } else {
      const month = parseInt(periodStr);
      const endDay = new Date(yearNum, month, 0).getDate();
      fromDate = `${yearNum}-${String(month).padStart(2, '0')}-01`;
      toDate   = `${yearNum}-${String(month).padStart(2, '0')}-${endDay}`;
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Utgående moms (från kassatransaktioner)
    const { data: sales } = await supabase
      .from('cash_transactions')
      .select('gross_amount, vat_25, vat_12, vat_6')
      .eq('org_id', (req as any).orgId)
      .gte('transaction_time', `${fromDate}T00:00:00Z`)
      .lte('transaction_time', `${toDate}T23:59:59Z`)
      .eq('voided', false);

    const outgoingVat25 = (sales || []).reduce((s, t) => s + parseFloat(t.vat_25 || 0), 0);
    const outgoingVat12 = (sales || []).reduce((s, t) => s + parseFloat(t.vat_12 || 0), 0);
    const outgoingVat6  = (sales || []).reduce((s, t) => s + parseFloat(t.vat_6  || 0), 0);
    const totalOutgoing = outgoingVat25 + outgoingVat12 + outgoingVat6;

    // Ingående moms (TODO: implementera när inköpssystem är klart)
    const totalIncoming = 0;

    const netVat  = totalOutgoing - totalIncoming;
    const dueDate = calculateVatDueDate(yearNum, periodStr);

    return res.json({
      period: periodStr,
      year:   yearNum,
      from_date: fromDate,
      to_date:   toDate,
      outgoing_vat: {
        vat_25: Math.round(outgoingVat25 * 100) / 100,
        vat_12: Math.round(outgoingVat12 * 100) / 100,
        vat_6:  Math.round(outgoingVat6  * 100) / 100,
        total:  Math.round(totalOutgoing * 100) / 100,
      },
      incoming_vat: {
        total: Math.round(totalIncoming * 100) / 100,
        note: 'Ingående moms kräver integration med inköpssystem',
      },
      net_vat:  Math.round(netVat * 100) / 100,
      action:   netVat > 0 ? 'BETALA_TILL_SKATTEVERKET' : 'ÅTERFÅ_FRÅN_SKATTEVERKET',
      due_date: dueDate.toISOString().slice(0, 10),
      law_reference: 'ML 2023:200, SFL 26 kap. 33§',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── POST /api/vat/validate-invoice ─────────────────────────────────────────
/**
 * Validera att faktura uppfyller ML:s krav (ML 11 kap.)
 */
router.post('/validate-invoice', async (req: Request, res: Response) => {
  try {
    const { invoice_data } = req.body;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Obligatoriska fält enligt ML 11:8
    const required = [
      { field: 'invoice_number',  label: 'Fakturanummer (ML 11:8 1p)' },
      { field: 'issue_date',      label: 'Utfärdandedatum (ML 11:8 2p)' },
      { field: 'seller_name',     label: 'Säljarens namn (ML 11:8 4p)' },
      { field: 'seller_org_number', label: 'Säljarens organisationsnummer (ML 11:8 5p)' },
      { field: 'buyer_name',      label: 'Köparens namn (ML 11:8 6p)' },
      { field: 'description',     label: 'Beskrivning av vara/tjänst (ML 11:8 7p)' },
      { field: 'quantity',        label: 'Kvantitet eller omfattning (ML 11:8 8p)' },
      { field: 'unit_price',      label: 'Enhetspris exkl. moms (ML 11:8 9p)' },
      { field: 'vat_rate',        label: 'Momssats (ML 11:8 10p)' },
      { field: 'vat_amount',      label: 'Momsbelopp (ML 11:8 11p)' },
      { field: 'total_amount',    label: 'Totalbelopp inkl. moms (ML 11:8 11p)' },
    ];

    for (const { field, label } of required) {
      if (!invoice_data?.[field]) {
        errors.push(`Saknat obligatoriskt fält: ${label}`);
      }
    }

    // Validera momssats
    if (invoice_data?.vat_rate !== undefined) {
      const validRates = [0, 6, 12, 25];
      if (!validRates.includes(invoice_data.vat_rate)) {
        errors.push(`Ogiltig momssats: ${invoice_data.vat_rate}%. Giltiga: 0, 6, 12, 25% (ML 2023:200)`);
      }
    }

    // Momsbelopp-kontroll
    if (invoice_data?.unit_price && invoice_data?.quantity && invoice_data?.vat_rate !== undefined) {
      const expectedVat = invoice_data.unit_price * invoice_data.quantity * (invoice_data.vat_rate / 100);
      const diff = Math.abs(expectedVat - (invoice_data.vat_amount || 0));
      if (diff > 0.02) {
        errors.push(`Momsbelopp stämmer ej: beräknat ${expectedVat.toFixed(2)} kr, angivet ${invoice_data.vat_amount} kr`);
      }
    }

    // Varningar
    if (!invoice_data?.buyer_org_number && !invoice_data?.buyer_personal_number) {
      warnings.push('Köparens organisations- eller personnummer saknas (rekommenderas för B2B)');
    }
    if (!invoice_data?.due_date) {
      warnings.push('Förfallodag saknas (30 dagar standard om ej angivet)');
    }

    return res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      law_reference: 'ML 2023:200, 11 kap. 8§',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/vat/validate-eu-vat/:vat_number ────────────────────────────────
/**
 * Validera EU VAT-nummer via VIES (ML 3:30 — inomeuropeisk handel)
 */
router.get('/validate-eu-vat/:vat_number', async (req: Request, res: Response) => {
  try {
    const { vat_number } = req.params;
    const clean = vat_number.replace(/\s/g, '').toUpperCase();

    if (clean.length < 4) {
      return res.status(400).json({ error: 'Ogiltigt VAT-nummer format' });
    }

    const countryCode = clean.slice(0, 2);
    const vatNum      = clean.slice(2);

    try {
      // VIES SOAP API
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${countryCode}</urn:countryCode>
      <urn:vatNumber>${vatNum}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

      const viesRes = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: soapBody,
        signal: AbortSignal.timeout(5000),
      });

      const xml = await viesRes.text();
      const valid       = xml.includes('<valid>true</valid>');
      const nameMatch   = xml.match(/<traderName>(.*?)<\/traderName>/);
      const addressMatch = xml.match(/<traderAddress>(.*?)<\/traderAddress>/s);

      return res.json({
        vat_number: clean,
        valid,
        company_name: nameMatch?.[1]?.trim() || null,
        address:      addressMatch?.[1]?.trim().replace(/\n/g, ', ') || null,
        source: 'EU VIES',
        law_reference: 'ML 2023:200 3 kap. 30§ — inomeuropeisk handel',
      });
    } catch {
      return res.json({
        vat_number: clean,
        valid: null,
        error: 'VIES API ej tillgängligt — kontrollera manuellt på ec.europa.eu/vies',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/vat/oss-report ─────────────────────────────────────────────────
/**
 * OSS (One Stop Shop) rapport för EU-handel (ML 2023:200, 10c kap.)
 * Tröskel: 10 000 EUR/år för sammanlagd EU-handel
 */
router.get('/oss-report', async (req: Request, res: Response) => {
  try {
    const { year, quarter } = req.query;
    if (!year || !quarter) return res.status(400).json({ error: 'year och quarter (1-4) krävs' });

    const quarterNum = parseInt(quarter as string);
    const startMonth = (quarterNum - 1) * 3 + 1;

    // TODO: Hämta EU-transaktioner per land från orders-tabellen
    // För nu: returnera mall
    return res.json({
      year,
      quarter: `Q${quarter}`,
      period_from: `${year}-${String(startMonth).padStart(2, '0')}-01`,
      period_to:   `${year}-${String(startMonth + 2).padStart(2, '0')}-${new Date(parseInt(year as string), startMonth + 2, 0).getDate()}`,
      sales_by_country: [],
      total_oss_vat: 0,
      note: 'OSS-rapport kräver att EU-försäljning per land-taggning implementeras i ordersystemet',
      due_date: `Kvartalets sista dag + 30 dagar`,
      registration_threshold_eur: 10000,
      law_reference: 'ML 2023:200, 10c kap. — OSS-reglerna',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

export default router;
export { calculateVatDueDate, VAT_RATES };
