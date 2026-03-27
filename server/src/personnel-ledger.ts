/**
 * PERSONALLIGGARE — Elektronisk personalliggare enligt SFL 39 kap. 9-12§§
 *
 * Lagkrav:
 *  - Skatteförfarandelagen (SFL 2011:1244) 39 kap. 9-12§§
 *  - Skatteförfarandeförordningen (SFF 2011:1261)
 *  - GDPR: personnummer krypteras AES-256, hash SHA-256 för sökning
 *
 * Branscher med krav (SFL 39:10):
 *  Byggverksamhet (SNI 41-43), Restaurang/catering (SNI 56),
 *  Tvätterier (SNI 96.01), Frisör/skönhet (SNI 96.02),
 *  Kroppsvård (SNI 96.04), Biltvättar (SNI 45.20)
 *
 * Sanktioner vid fel:
 *  - 12 500 kr per felregistrering
 *  - 2 500 kr per person som saknas i liggaren
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

// ─── SNI-koder som kräver personalliggare (SFL 39:10) ───────────────────────
const PERSONNEL_LEDGER_SNI_CODES = [
  '41', '42', '43',   // Byggverksamhet
  '56',               // Restaurang- och cateringverksamhet
  '9601',             // Tvätterier
  '9602',             // Frisörer och skönhetssalonger
  '9604',             // Kroppsvård
  '4520',             // Biltvättar
];

export function requiresPersonnelLedger(industryCode: string): boolean {
  return PERSONNEL_LEDGER_SNI_CODES.some(sni => industryCode.startsWith(sni));
}

// ─── Personnummer-validering (Luhn-algoritm, SFL 39:9) ─────────────────────
export function validatePersonalNumber(pnr: string): {
  valid: boolean;
  type: 'personal' | 'coordination' | 'invalid';
  gender?: 'M' | 'F';
  birthYear?: number;
} {
  if (!pnr) return { valid: false, type: 'invalid' };

  // Normalisera: ta bort bindestreck, plus och mellanslag
  const clean = pnr.replace(/[\s\-+]/g, '');
  if (!/^\d{10}$|^\d{12}$/.test(clean)) return { valid: false, type: 'invalid' };

  const digits = clean.length === 12 ? clean.slice(2) : clean;
  const century = clean.length === 12 ? parseInt(clean.slice(0, 2)) : null;

  // Samordningsnummer: dag + 60 (SFL 39:9 2 st.)
  const day = parseInt(digits.slice(4, 6));
  const isCoordination = day > 60;

  // Luhn-algoritm (modulus 10)
  const luhn = digits.split('').map(Number);
  const sum = luhn.reduce((acc, d, i) => {
    const v = i % 2 === 0 ? d * 2 : d;
    return acc + (v > 9 ? v - 9 : v);
  }, 0);

  const valid = sum % 10 === 0;
  if (!valid) return { valid: false, type: 'invalid' };

  // Kön: näst sista siffran — udda = man, jämn = kvinna (folkbokföringslagen)
  const genderDigit = parseInt(digits[8]);
  const gender: 'M' | 'F' = genderDigit % 2 !== 0 ? 'M' : 'F';

  // Födelseår
  const yearSuffix = parseInt(digits.slice(0, 2));
  let birthYear: number;
  if (century !== null) {
    birthYear = century * 100 + yearSuffix;
  } else {
    const currentYear = new Date().getFullYear();
    birthYear = (yearSuffix <= currentYear % 100) ? 2000 + yearSuffix : 1900 + yearSuffix;
  }

  return {
    valid,
    type: isCoordination ? 'coordination' : 'personal',
    gender,
    birthYear,
  };
}

// ─── Kryptering av personnummer (GDPR + SFL-krav) ──────────────────────────
const ENCRYPTION_KEY = process.env.PNR_ENCRYPTION_KEY || '';
const IV_LENGTH = 16;

function encryptPersonalNumber(pnr: string): string {
  if (!ENCRYPTION_KEY) throw new Error('PNR_ENCRYPTION_KEY saknas i miljövariabler');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(pnr, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPersonalNumber(encrypted: string): string {
  if (!ENCRYPTION_KEY) throw new Error('PNR_ENCRYPTION_KEY saknas i miljövariabler');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const [ivHex, encHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function hashPersonalNumber(pnr: string): string {
  return crypto.createHash('sha256').update(pnr + process.env.PNR_HASH_SALT).digest('hex');
}

function maskPersonalNumber(pnr: string): string {
  // Format: ****-**XX (visar sista 2 siffrorna)
  const clean = pnr.replace(/[\s\-+]/g, '');
  const digits = clean.length === 12 ? clean.slice(2) : clean;
  return `****-**${digits.slice(8, 10)}`;
}

function maskName(name: string): string {
  // Visa förnamnet + initial på efternamnet
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ─── Supabase-klient ────────────────────────────────────────────────────────
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service key för admin-operationer
  );
}

// ─── POST /api/personnel-ledger/checkin ────────────────────────────────────
/**
 * Stämpla in en person enligt SFL 39 kap. 11§
 * Kräver personnummer ELLER samordningsnummer
 */
router.post('/checkin', async (req: Request, res: Response) => {
  try {
    const { personal_number, coordination_number, workplace_id, role, employer_org_number, full_name } = req.body;

    const idNumber = personal_number || coordination_number;
    if (!idNumber) {
      return res.status(400).json({
        error: 'Personnummer eller samordningsnummer krävs (SFL 39:9)',
        law: 'Skatteförfarandelagen 39 kap. 9§',
      });
    }

    if (!workplace_id || !role || !employer_org_number) {
      return res.status(400).json({
        error: 'workplace_id, role och employer_org_number krävs',
      });
    }

    // Validera personnummer/samordningsnummer
    const validation = validatePersonalNumber(idNumber);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Ogiltigt personnummer eller samordningsnummer — kontrollsumma (Luhn) misslyckas',
        law: 'SFL 39 kap. 9§',
      });
    }

    const supabase = getSupabase();
    const pnrHash = hashPersonalNumber(idNumber);
    const pnrEncrypted = encryptPersonalNumber(idNumber);

    // Kontrollera att ingen redan är incheckad (SFL 39:11 — dubbelregistrering förbjudet)
    const { data: existing } = await supabase
      .from('personnel_checkins')
      .select('id, checkin_time')
      .eq('workplace_id', workplace_id)
      .eq('personal_number_hash', pnrHash)
      .is('checkout_time', null)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Personen är redan incheckad på denna arbetsplats',
        checkin_id: existing.id,
        checkin_time: existing.checkin_time,
        law: 'SFL 39 kap. 11§ — dubbelregistrering ej tillåten',
      });
    }

    // Skapa incheckning
    const { data, error } = await supabase
      .from('personnel_checkins')
      .insert({
        org_id: (req as any).orgId,
        workplace_id,
        personal_number_hash: pnrHash,
        personal_number_encrypted: pnrEncrypted,
        coordination_number_hash: validation.type === 'coordination' ? pnrHash : null,
        full_name: full_name || null,
        role,
        employer_org_number,
        checkin_time: new Date().toISOString(),
        created_by: (req as any).userId,
      })
      .select('id, checkin_time')
      .single();

    if (error) throw error;

    // Returnera ALDRIG personnummer i response (GDPR)
    return res.status(201).json({
      checkin_id: data.id,
      timestamp: data.checkin_time,
      name_hash: pnrHash.slice(0, 8), // Kort hash för referens
      type: validation.type,
      message: 'Incheckning registrerad enligt SFL 39 kap. 11§',
    });
  } catch (err: any) {
    console.error('Personalliggare checkin error:', err);
    return res.status(500).json({ error: 'Serverfel vid incheckning' });
  }
});

// ─── POST /api/personnel-ledger/checkout ───────────────────────────────────
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { checkin_id, workplace_id } = req.body;

    if (!checkin_id || !workplace_id) {
      return res.status(400).json({ error: 'checkin_id och workplace_id krävs' });
    }

    const supabase = getSupabase();

    const { data: checkin } = await supabase
      .from('personnel_checkins')
      .select('id, checkin_time, checkout_time, workplace_id')
      .eq('id', checkin_id)
      .eq('workplace_id', workplace_id)
      .single();

    if (!checkin) {
      return res.status(404).json({ error: 'Incheckning hittades inte' });
    }

    if (checkin.checkout_time) {
      return res.status(409).json({
        error: 'Personen är redan utcheckad',
        checkout_time: checkin.checkout_time,
      });
    }

    const checkoutTime = new Date().toISOString();
    const { error } = await supabase
      .from('personnel_checkins')
      .update({ checkout_time: checkoutTime })
      .eq('id', checkin_id);

    if (error) throw error;

    const duration = Math.round(
      (new Date(checkoutTime).getTime() - new Date(checkin.checkin_time).getTime()) / 60000
    );

    return res.json({
      checkin_id,
      checkout_time: checkoutTime,
      duration_minutes: duration,
      message: 'Utcheckning registrerad enligt SFL 39 kap. 11§',
    });
  } catch (err: any) {
    console.error('Personalliggare checkout error:', err);
    return res.status(500).json({ error: 'Serverfel vid utcheckning' });
  }
});

// ─── GET /api/personnel-ledger/present ────────────────────────────────────
/**
 * Nuvarande närvaro — för Skatteverkets kontrollbesök (SFL 39:12)
 * Personnummer MASKERAT i vanlig vy (****-**XX)
 */
router.get('/present', async (req: Request, res: Response) => {
  try {
    const { workplace_id } = req.query;

    if (!workplace_id) {
      return res.status(400).json({ error: 'workplace_id krävs' });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('personnel_checkins')
      .select('id, full_name, role, checkin_time, employer_org_number, personal_number_encrypted')
      .eq('workplace_id', workplace_id)
      .is('checkout_time', null)
      .order('checkin_time', { ascending: true });

    if (error) throw error;

    const present = (data || []).map(row => {
      let maskedPnr = '****-****';
      try {
        const pnr = decryptPersonalNumber(row.personal_number_encrypted);
        maskedPnr = maskPersonalNumber(pnr);
      } catch {}

      const minutesPresent = Math.round(
        (Date.now() - new Date(row.checkin_time).getTime()) / 60000
      );

      return {
        checkin_id: row.id,
        name: row.full_name ? maskName(row.full_name) : 'Okänd',
        personal_number_masked: maskedPnr,
        role: row.role,
        checkin_time: row.checkin_time,
        minutes_present: minutesPresent,
        employer_org_number: row.employer_org_number,
      };
    });

    return res.json({
      workplace_id,
      timestamp: new Date().toISOString(),
      count: present.length,
      present,
      law_reference: 'SFL 39 kap. 12§ — Skatteverket har rätt att begära denna lista',
    });
  } catch (err: any) {
    console.error('Personalliggare present error:', err);
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/personnel-ledger/log ────────────────────────────────────────
/**
 * Fullständig logg med personnummer — kräver ADMIN (SFL 39:12)
 * Inkluderar CSV-export för Skatteverket
 */
router.get('/log', async (req: Request, res: Response) => {
  try {
    const { workplace_id, from_date, to_date, format } = req.query;

    // Kontrollera admin-behörighet
    const userRole = (req as any).userRole;
    if (!['ADMIN', 'OWNER'].includes(userRole)) {
      return res.status(403).json({
        error: 'Fullständig logg kräver ADMIN-behörighet (GDPR + SFL 39:12)',
        law: 'SFL 39 kap. 12§, GDPR Art. 5',
      });
    }

    if (!workplace_id) {
      return res.status(400).json({ error: 'workplace_id krävs' });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('personnel_checkins')
      .select('*')
      .eq('workplace_id', workplace_id)
      .order('checkin_time', { ascending: false });

    if (from_date) query = query.gte('checkin_time', `${from_date}T00:00:00Z`);
    if (to_date)   query = query.lte('checkin_time', `${to_date}T23:59:59Z`);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map(row => {
      let pnr = '[KRYPTERAT]';
      try { pnr = decryptPersonalNumber(row.personal_number_encrypted); } catch {}
      return { ...row, personal_number: pnr };
    });

    // CSV-export för Skatteverket
    if (format === 'csv') {
      const csvLines = [
        'Datum,Tid in,Tid ut,Personnummer,Namn,Roll,Arbetsgivare org.nr',
        ...rows.map(r => {
          const date = new Date(r.checkin_time).toLocaleDateString('sv-SE');
          const timeIn = new Date(r.checkin_time).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
          const timeOut = r.checkout_time
            ? new Date(r.checkout_time).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
            : 'EJ UTCHECKAD';
          return `${date},${timeIn},${timeOut},${r.personal_number},${r.full_name || ''},${r.role},${r.employer_org_number}`;
        }),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="personalliggare_${workplace_id}_${from_date || 'alla'}.csv"`);
      return res.send('\uFEFF' + csvLines); // BOM för Excel
    }

    return res.json({ count: rows.length, log: rows });
  } catch (err: any) {
    console.error('Personalliggare log error:', err);
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/personnel-ledger/export/skatteverket ────────────────────────
/**
 * XML-export i Skatteverkets format (SFL 39:12)
 * Används vid kontrollbesök eller frivillig inrapportering
 */
router.get('/export/skatteverket', async (req: Request, res: Response) => {
  try {
    const { workplace_id, year, month } = req.query;

    const userRole = (req as any).userRole;
    if (!['ADMIN', 'OWNER'].includes(userRole)) {
      return res.status(403).json({ error: 'Kräver ADMIN-behörighet' });
    }

    if (!workplace_id || !year || !month) {
      return res.status(400).json({ error: 'workplace_id, year och month krävs' });
    }

    const supabase = getSupabase();

    // Hämta arbetsplatsinformation
    const { data: workplace } = await supabase
      .from('workplaces')
      .select('*')
      .eq('id', workplace_id)
      .single();

    const fromDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
    const lastDay = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
    const toDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59Z`;

    const { data: checkins } = await supabase
      .from('personnel_checkins')
      .select('*')
      .eq('workplace_id', workplace_id)
      .gte('checkin_time', fromDate)
      .lte('checkin_time', toDate)
      .order('checkin_time');

    const rows = (checkins || []).map(row => {
      let pnr = '';
      try { pnr = decryptPersonalNumber(row.personal_number_encrypted); } catch {}
      return { ...row, pnr };
    });

    // XML enligt Skatteverkets format för personalliggare
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Personalliggare export enligt SFL 39 kap. 12§ -->
<!-- Genererad: ${new Date().toISOString()} -->
<Personalliggare xmlns="http://www.skatteverket.se/personalliggare/1.0"
                 SkatteverketVersion="1.0"
                 ExportDatum="${new Date().toISOString().slice(0, 10)}">
  <Arbetsplats>
    <Namn>${escapeXml(workplace?.name || '')}</Namn>
    <Adress>${escapeXml(workplace?.address || '')}</Adress>
    <Kommunkod>${workplace?.municipality_code || ''}</Kommunkod>
    <SNIKod>${workplace?.industry_code || ''}</SNIKod>
  </Arbetsplats>
  <Period>
    <År>${year}</År>
    <Månad>${String(month).padStart(2, '0')}</Månad>
  </Period>
  <Poster antal="${rows.length}">
${rows.map(r => `    <Post>
      <Personnummer>${escapeXml(r.pnr)}</Personnummer>
      <Namn>${escapeXml(r.full_name || '')}</Namn>
      <Roll>${escapeXml(r.role)}</Roll>
      <ArbetsgivareOrgnr>${escapeXml(r.employer_org_number)}</ArbetsgivareOrgnr>
      <InTid>${r.checkin_time}</InTid>
      <UtTid>${r.checkout_time || ''}</UtTid>
    </Post>`).join('\n')}
  </Poster>
</Personalliggare>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="personalliggare_SKV_${year}_${month}.xml"`);
    return res.send(xml);
  } catch (err: any) {
    console.error('SKV export error:', err);
    return res.status(500).json({ error: 'Serverfel vid XML-export' });
  }
});

// ─── POST /api/personnel-ledger/workplaces ─────────────────────────────────
router.post('/workplaces', async (req: Request, res: Response) => {
  try {
    const { name, address, municipality_code, industry_code } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'name och address krävs' });
    }

    const requiresLedger = industry_code ? requiresPersonnelLedger(industry_code) : false;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workplaces')
      .insert({
        org_id: (req as any).orgId,
        name,
        address,
        municipality_code,
        industry_code,
        requires_personnel_ledger: requiresLedger,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      ...data,
      requires_personnel_ledger: requiresLedger,
      law_note: requiresLedger
        ? 'Personalliggare KRÄVS för denna bransch (SFL 39:10)'
        : 'Personalliggare krävs ej för denna bransch',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── GET /api/personnel-ledger/workplaces ──────────────────────────────────
router.get('/workplaces', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workplaces')
      .select('*')
      .eq('org_id', (req as any).orgId)
      .order('name');

    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// ─── POST /api/personnel-ledger/validate-personal-number ──────────────────
router.post('/validate-personal-number', async (req: Request, res: Response) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: 'number krävs' });

  const result = validatePersonalNumber(number);

  // Returnera ALDRIG fullständigt personnummer
  return res.json({
    valid: result.valid,
    type: result.type,
    gender: result.gender || null,
    birth_year: result.birthYear || null,
    masked: result.valid ? maskPersonalNumber(number) : null,
    message: result.valid
      ? `Giltigt ${result.type === 'coordination' ? 'samordningsnummer' : 'personnummer'}`
      : 'Ogiltigt nummer — kontrollsumma (Luhn) misslyckas',
  });
});

// ─── Helper: XML-escape ────────────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
export { PERSONNEL_LEDGER_SNI_CODES };
