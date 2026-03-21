import { supabase } from './supabase';
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sendApprovalSMS } from './sms-service';

// ============================================================
// Real-time Customer Approval Engine
// pixdrift — Automotive Workshop Platform
// ============================================================

// Initialize DB pool (uses DATABASE_URL or Supabase connection string)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF || 'znmxtnxxjpmgtycmsqjv'}:${process.env.SUPABASE_DB_PASSWORD || 'Certified2026abc'}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`,
  max: 5,
  idleTimeoutMillis: 30000,
});
const db = { query: (text: string, params?: any[]) => pool.query(text, params) };

const router = Router();

// DB pool — uses existing connection from app context

// S3 config
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' });
const BUCKET = process.env.S3_APPROVALS_BUCKET || 'pixdrift-approvals-prod';
const CDN_BASE = process.env.CLOUDFRONT_CDN || 'https://cdn.pixdrift.com';

// ============================================================
// TYPES
// ============================================================

type IssueCategory = 'SAFETY' | 'MAINTENANCE' | 'PREVENTIVE' | 'COSMETIC';
type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type ApprovalStatus = 'PENDING' | 'VIEWED' | 'APPROVED' | 'REJECTED' | 'CALLBACK' | 'EXPIRED';
type Decision = 'APPROVED' | 'REJECTED' | 'CALLBACK_REQUESTED';

interface CaptureBody {
  work_order_id: string;
  video_url?: string;
  voice_transcript?: string;
  issue_category: IssueCategory;
  urgency: Urgency;
  images?: string[];
  technician_price_estimate?: number;
  technician_notes?: string;
}

interface TranslationResult {
  simple_explanation_title: string;
  simple_explanation: string;
  recommended_action: string;
  risk_if_ignored: string;
  delay_cost_warning: string;
  price_estimate?: number;
  price_estimate_high?: number;
  time_estimate_hours?: number;
}

// ============================================================
// AI TRANSLATION
// ============================================================

async function translateToCustomerLanguage(
  category: IssueCategory,
  urgency: Urgency,
  voiceTranscript?: string,
  technicianNotes?: string,
  priceEstimate?: number
): Promise<TranslationResult> {
  // Try Claude/Anthropic first (configured in env)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey || openaiKey) {
    try {
      return await aiTranslate(category, urgency, voiceTranscript, technicianNotes, priceEstimate, anthropicKey, openaiKey);
    } catch (err) {
      console.error('[Approval] AI translation failed, using fallback:', err);
    }
  }

  // Rule-based fallback
  return ruleBasedTranslation(category, urgency, voiceTranscript, technicianNotes, priceEstimate);
}

async function aiTranslate(
  category: IssueCategory,
  urgency: Urgency,
  voiceTranscript?: string,
  technicianNotes?: string,
  priceEstimate?: number,
  anthropicKey?: string,
  openaiKey?: string
): Promise<TranslationResult> {
  const input = [voiceTranscript, technicianNotes].filter(Boolean).join('. ');

  const systemPrompt = `Du är en bilmekaniker som förklarar bilproblem för kunder på ett tydligt och vänligt sätt.
Skriv på enkel, klar svenska. Inga tekniska förkortningar. Max 2-3 meningar per fält.
Fokusera på kundens trygghet och säkerhet. Var ärlig men inte skrämmande.
Svara alltid med JSON i exakt detta format:
{
  "title": "Kortfattad titel på problemet (max 8 ord)",
  "explanation": "Förklaring av vad vi hittade (2-3 meningar, ingen jargong)",
  "action": "Vad vi rekommenderar och varför",
  "risk": "Konkret konsekvens om detta inte åtgärdas",
  "delay_cost": "Vad det kan kosta/innebära att vänta"
}`;

  const userPrompt = `Kategori: ${category}
Prioritet: ${urgency}
Tekniker-input: ${input || 'Inget ytterligare input tillgängligt'}
${priceEstimate ? `Estimerad kostnad: ${priceEstimate} kr` : ''}

Översätt detta till ett kundvänligt meddelande.`;

  let content: string;

  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Fast + cheap for translation
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await response.json() as any;
    content = data.content[0].text;
  } else {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await response.json() as any;
    content = data.choices[0].message.content;
  }

  const parsed = JSON.parse(content);

  return {
    simple_explanation_title: parsed.title,
    simple_explanation: parsed.explanation,
    recommended_action: parsed.action,
    risk_if_ignored: parsed.risk,
    delay_cost_warning: parsed.delay_cost,
    price_estimate: priceEstimate,
    time_estimate_hours: estimateHours(category),
  };
}

function ruleBasedTranslation(
  category: IssueCategory,
  urgency: Urgency,
  voiceTranscript?: string,
  technicianNotes?: string,
  priceEstimate?: number
): TranslationResult {
  const templates: Record<IssueCategory, Omit<TranslationResult, 'price_estimate' | 'price_estimate_high' | 'time_estimate_hours'>> = {
    SAFETY: {
      simple_explanation_title: 'Säkerhetsproblem hittades på din bil',
      simple_explanation: 'Vi har hittat ett säkerhetsproblem under servicen. Det behöver åtgärdas för att din bil ska vara säker att köra.',
      recommended_action: 'Vi rekommenderar att detta åtgärdas direkt under pågående service.',
      risk_if_ignored: 'Att köra med detta problem kan vara farligt och innebär risk för dig och andra trafikanter.',
      delay_cost_warning: 'Om detta väntar kan problemet förvärras och bli betydligt dyrare att åtgärda.',
    },
    MAINTENANCE: {
      simple_explanation_title: 'Underhållsbehov identifierat',
      simple_explanation: 'Vi har identifierat en komponent som behöver bytas eller justeras. Det är normalt underhåll för din bilmodell.',
      recommended_action: 'Vi rekommenderar att åtgärda detta nu när bilen ändå är inne hos oss.',
      risk_if_ignored: 'Utan åtgärd kan denna del sluta fungera, vilket kan leda till driftstopp.',
      delay_cost_warning: 'Att göra detta nu sparar tid och pengar — bilen är redan inne och uppbockad.',
    },
    PREVENTIVE: {
      simple_explanation_title: 'Förebyggande åtgärd rekommenderas',
      simple_explanation: 'Vi ser tidiga tecken på slitage som ännu inte är akut men snart behöver åtgärdas.',
      recommended_action: 'Vi kan ta hand om det nu för att förhindra problem längre fram.',
      risk_if_ignored: 'Inget akut problem ännu, men att vänta kan leda till dyrare reparationer.',
      delay_cost_warning: 'Förebyggande underhåll är alltid billigare än att vänta tills något går sönder.',
    },
    COSMETIC: {
      simple_explanation_title: 'Kosmetisk anmärkning noterad',
      simple_explanation: 'Vi har noterat en kosmetisk brist som inte påverkar bilens funktion eller säkerhet.',
      recommended_action: 'Detta är valfritt att åtgärda och påverkar inte körning eller säkerhet.',
      risk_if_ignored: 'Ingen funktionell risk — detta är enbart estetiskt.',
      delay_cost_warning: 'Kan vänta — ta gärna upp detta vid nästa service.',
    },
  };

  const template = templates[category];
  return {
    ...template,
    price_estimate: priceEstimate,
    time_estimate_hours: estimateHours(category),
  };
}

function estimateHours(category: IssueCategory): number {
  const defaults: Record<IssueCategory, number> = {
    SAFETY: 2.0,
    MAINTENANCE: 1.5,
    PREVENTIVE: 1.0,
    COSMETIC: 0.5,
  };
  return defaults[category];
}

// ============================================================
// HELPER: Log approval event
// ============================================================

async function logEvent(
  pool: Pool,
  approvalId: string,
  eventType: string,
  eventData: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO approval_events (approval_id, event_type, event_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [approvalId, eventType, JSON.stringify(eventData), ipAddress || null, userAgent || null]
  );
}

// ============================================================
// ROUTE: POST /api/approvals/upload-url
// Returns S3 presigned upload URL
// ============================================================

router.get('/upload-url', async (req: Request, res: Response) => {
  const { work_order_id, file_type = 'video' } = req.query as Record<string, string>;

  if (!work_order_id) {
    return res.status(400).json({ error: 'work_order_id required' });
  }

  const ext = file_type === 'video' ? 'mp4' : 'jpg';
  const key = `approvals/${work_order_id}/${uuidv4()}.${ext}`;
  const contentType = file_type === 'video' ? 'video/mp4' : 'image/jpeg';

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // 30-day lifecycle policy applied at bucket level
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const cdnUrl = `${CDN_BASE}/${key}`;

  res.json({ upload_url: presignedUrl, cdn_url: cdnUrl, key });
});

// ============================================================
// ROUTE: POST /api/approvals/capture
// Technician creates approval request
// ============================================================

router.post('/capture', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId; // Set by auth middleware
  const technicianId = (req as any).userId;

  const body: CaptureBody = req.body;

  if (!body.work_order_id || !body.issue_category || !body.urgency) {
    return res.status(400).json({ error: 'work_order_id, issue_category, urgency required' });
  }

  // Fetch work order + customer + contact info
  const woResult = await db.query(
    `SELECT wo.*, c.id as contact_id, c.phone, c.email, c.name as customer_name,
            v.registration_number as vehicle_reg,
            org.name as workshop_name
     FROM work_orders wo
     LEFT JOIN contacts c ON wo.customer_id = c.id
     LEFT JOIN vehicles v ON wo.vehicle_id = v.id
     LEFT JOIN organizations org ON wo.org_id = org.id
     WHERE wo.id = $1 AND wo.org_id = $2`,
    [body.work_order_id, orgId]
  );

  if (woResult.rows.length === 0) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  const wo = woResult.rows[0];

  // Generate AI translation
  const translation = await translateToCustomerLanguage(
    body.issue_category,
    body.urgency,
    body.voice_transcript,
    body.technician_notes,
    body.technician_price_estimate
  );

  // Create approval request
  const insertResult = await db.query(
    `INSERT INTO approval_requests (
      org_id, work_order_id, technician_id, customer_id,
      video_url, voice_transcript, issue_category, urgency,
      images, technician_notes,
      simple_explanation, simple_explanation_title, recommended_action,
      risk_if_ignored, delay_cost_warning,
      price_estimate, price_estimate_high, time_estimate_hours,
      vehicle_reg, workshop_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING id, customer_token, token_expires_at`,
    [
      orgId, body.work_order_id, technicianId, wo.contact_id,
      body.video_url || null, body.voice_transcript || null,
      body.issue_category, body.urgency,
      body.images ? JSON.stringify(body.images) : '{}', body.technician_notes || null,
      translation.simple_explanation,
      translation.simple_explanation_title,
      translation.recommended_action,
      translation.risk_if_ignored,
      translation.delay_cost_warning,
      translation.price_estimate || null,
      translation.price_estimate_high || null,
      translation.time_estimate_hours || null,
      wo.vehicle_reg || null,
      wo.workshop_name || null,
    ]
  );

  const approval = insertResult.rows[0];
  const customerLink = `https://pixdrift.com/approve?t=${approval.customer_token}`;

  // Log creation event
  await logEvent(db, approval.id, 'created', {
    issue_category: body.issue_category,
    urgency: body.urgency,
    technician_id: technicianId,
  });

  // Send SMS if customer has phone
  if (wo.phone) {
    const smsSent = await sendApprovalSMS(
      wo.phone,
      approval.id,
      approval.customer_token,
      wo.workshop_name || 'Verkstad'
    );

    if (smsSent) {
      await db.query(
        `UPDATE approval_requests SET sms_sent_at = NOW() WHERE id = $1`,
        [approval.id]
      );
      await logEvent(db, approval.id, 'sms_sent', { phone_masked: wo.phone.slice(0, -4) + '****' });
    }
  }

  res.json({
    approval_id: approval.id,
    customer_link: customerLink,
    expires_at: approval.token_expires_at,
    translation, // So technician can preview what customer sees
  });
});

// ============================================================
// ROUTE: POST /api/approvals/:id/translate
// Re-run AI translation (e.g. after editing notes)
// ============================================================

router.post('/:id/translate', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;

  const result = await db.query(
    `SELECT * FROM approval_requests WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const approval = result.rows[0];

  const translation = await translateToCustomerLanguage(
    approval.issue_category,
    approval.urgency,
    approval.voice_transcript,
    approval.technician_notes,
    approval.price_estimate
  );

  await db.query(
    `UPDATE approval_requests SET
       simple_explanation = $1,
       simple_explanation_title = $2,
       recommended_action = $3,
       risk_if_ignored = $4,
       delay_cost_warning = $5,
       updated_at = NOW()
     WHERE id = $6`,
    [
      translation.simple_explanation,
      translation.simple_explanation_title,
      translation.recommended_action,
      translation.risk_if_ignored,
      translation.delay_cost_warning,
      id,
    ]
  );

  res.json(translation);
});

// ============================================================
// CUSTOMER ROUTES (no auth — token in URL)
// ============================================================

// GET /api/approvals/customer/:token — Fetch approval details
router.get('/customer/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  const result = await db.query(
    `SELECT ar.*, wo.description as work_order_description
     FROM approval_requests ar
     LEFT JOIN work_orders wo ON ar.work_order_id = wo.id
     WHERE ar.customer_token = $1
       AND ar.token_expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found or expired' });
  }

  const approval = result.rows[0];

  // Generate signed CloudFront URL for video if present
  let videoUrl = null;
  if (approval.video_url) {
    // If already a CDN URL, use as-is (or re-sign if needed)
    videoUrl = approval.video_url;
  }

  res.json({
    approval_id: approval.id,
    status: approval.status,
    workshop_name: approval.workshop_name,
    vehicle_reg: approval.vehicle_reg,
    issue_category: approval.issue_category,
    urgency: approval.urgency,
    video_url: videoUrl,
    simple_explanation_title: approval.simple_explanation_title,
    simple_explanation: approval.simple_explanation,
    recommended_action: approval.recommended_action,
    risk_if_ignored: approval.risk_if_ignored,
    delay_cost_warning: approval.delay_cost_warning,
    price_estimate: approval.price_estimate,
    price_estimate_high: approval.price_estimate_high,
    time_estimate_hours: approval.time_estimate_hours,
    images: approval.images,
    expires_at: approval.token_expires_at,
  });
});

// POST /api/approvals/customer/:token/viewed — Log view event
router.post('/customer/:token/viewed', async (req: Request, res: Response) => {
  const { token } = req.params;
  const ip = req.ip || req.headers['x-forwarded-for'] as string;
  const ua = req.headers['user-agent'];

  const result = await db.query(
    `UPDATE approval_requests
     SET status = CASE WHEN status = 'PENDING' THEN 'VIEWED' ELSE status END,
         customer_viewed_at = COALESCE(customer_viewed_at, NOW()),
         updated_at = NOW()
     WHERE customer_token = $1 AND token_expires_at > NOW()
     RETURNING id, status`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ ok: false });
  }

  await logEvent(db, result.rows[0].id, 'viewed', {}, ip, ua);

  res.json({ ok: true });
});

// POST /api/approvals/customer/:token/respond — Customer decision
router.post('/customer/:token/respond', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { decision, note }: { decision: Decision; note?: string } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] as string;
  const ua = req.headers['user-agent'];

  if (!['APPROVED', 'REJECTED', 'CALLBACK_REQUESTED'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }

  const result = await db.query(
    `UPDATE approval_requests
     SET status = $1,
         customer_decision = $1,
         customer_note = $2,
         customer_responded_at = NOW(),
         customer_ip = $3,
         updated_at = NOW()
     WHERE customer_token = $4
       AND token_expires_at > NOW()
       AND status NOT IN ('APPROVED', 'REJECTED', 'EXPIRED')
     RETURNING id, work_order_id, org_id, urgency`,
    [decision === 'CALLBACK_REQUESTED' ? 'CALLBACK' : decision, note || null, ip, token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found, expired, or already responded' });
  }

  const approval = result.rows[0];

  // Log decision event
  await logEvent(db, approval.id, decision.toLowerCase(), { note }, ip, ua);

  // If approved → advance work order
  if (decision === 'APPROVED' && approval.work_order_id) {
    await db.query(
      `UPDATE work_orders SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`,
      [approval.work_order_id]
    ).catch(err => console.error('[Approval] Failed to advance work order:', err));

    await logEvent(db, approval.id, 'work_order_advanced', {
      work_order_id: approval.work_order_id,
      new_status: 'IN_PROGRESS',
    });
  }

  // TODO: Push WebSocket notification to workshop dashboard
  // notifyWorkshop(approval.org_id, approval.id, decision);

  const nextSteps: Record<string, string> = {
    APPROVED: 'Tack! Vi startar arbetet direkt. Du får ett meddelande när bilen är klar.',
    REJECTED: 'Förstått. Din bil är klar att hämtas. Vi noterar detta för nästa service.',
    CALLBACK_REQUESTED: 'Vi ringer dig inom 5 minuter för att diskutera.',
  };

  res.json({
    confirmed: true,
    decision,
    next_steps: nextSteps[decision] || '',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/approvals/customer/:token/question — Customer sends question
router.post('/customer/:token/question', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message required' });
  }

  const result = await db.query(
    `SELECT id, org_id FROM approval_requests
     WHERE customer_token = $1 AND token_expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const approval = result.rows[0];

  // Log the question
  await logEvent(db, approval.id, 'customer_question', { message });

  // TODO: Push to service advisor's dashboard/phone
  // notifyServiceAdvisor(approval.org_id, approval.id, message);

  res.json({ message_sent: true });
});

// ============================================================
// WORKSHOP ROUTES (authenticated)
// ============================================================

// GET /api/approvals/pending — All pending approvals for org
router.get('/pending', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;

  const result = await db.query(
    `SELECT ar.*,
            wo.vehicle_id,
            c.name as customer_name, c.phone as customer_phone,
            EXTRACT(EPOCH FROM (NOW() - ar.created_at))/60 as wait_minutes,
            CASE
              WHEN ar.customer_viewed_at IS NOT NULL THEN
                EXTRACT(EPOCH FROM (NOW() - ar.customer_viewed_at))/60
              ELSE NULL
            END as viewed_minutes_ago
     FROM approval_requests ar
     LEFT JOIN work_orders wo ON ar.work_order_id = wo.id
     LEFT JOIN contacts c ON ar.customer_id = c.id
     WHERE ar.org_id = $1
       AND ar.status IN ('PENDING', 'VIEWED', 'CALLBACK')
       AND ar.token_expires_at > NOW()
     ORDER BY
       CASE ar.urgency
         WHEN 'CRITICAL' THEN 1
         WHEN 'HIGH' THEN 2
         WHEN 'MEDIUM' THEN 3
         WHEN 'LOW' THEN 4
       END,
       ar.created_at ASC`,
    [orgId]
  );

  res.json({ approvals: result.rows, count: result.rows.length });
});

// GET /api/approvals/:id/status — Real-time status for one approval
router.get('/:id/status', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;

  const result = await db.query(
    `SELECT ar.id, ar.status, ar.customer_viewed_at, ar.customer_responded_at,
            ar.customer_decision, ar.customer_ip,
            ar.sms_sent_at, ar.email_sent_at,
            ar.created_at, ar.updated_at,
            ar.token_expires_at,
            EXTRACT(EPOCH FROM (NOW() - ar.created_at))/60 as age_minutes
     FROM approval_requests ar
     WHERE ar.id = $1 AND ar.org_id = $2`,
    [id, orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  // Fetch events
  const events = await db.query(
    `SELECT event_type, event_data, created_at
     FROM approval_events
     WHERE approval_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  res.json({
    ...result.rows[0],
    events: events.rows,
  });
});

// GET /api/approvals/:id — Full approval details (for dashboard)
router.get('/:id', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;

  const result = await db.query(
    `SELECT ar.*,
            c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
            wo.description as work_order_description
     FROM approval_requests ar
     LEFT JOIN contacts c ON ar.customer_id = c.id
     LEFT JOIN work_orders wo ON ar.work_order_id = wo.id
     WHERE ar.id = $1 AND ar.org_id = $2`,
    [id, orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  res.json(result.rows[0]);
});

// ============================================================
// CUSTOMER PORTAL (My Pages)
// ============================================================

// GET /api/customer-portal/:customer_token/history
router.get('/portal/:customer_token/history', async (req: Request, res: Response) => {
  const { customer_token } = req.params;

  // Validate portal token (separate from approval tokens)
  const contactResult = await db.query(
    `SELECT c.* FROM contacts c
     WHERE c.portal_token = $1`,
    [customer_token]
  );

  if (contactResult.rows.length === 0) {
    return res.status(403).json({ error: 'Invalid portal token' });
  }

  const contact = contactResult.rows[0];

  // Fetch history
  const history = await db.query(
    `SELECT ar.id, ar.created_at, ar.status, ar.customer_decision,
            ar.simple_explanation_title, ar.issue_category, ar.urgency,
            ar.price_estimate, ar.video_url,
            ar.vehicle_reg, ar.workshop_name,
            wo.description as work_description
     FROM approval_requests ar
     LEFT JOIN work_orders wo ON ar.work_order_id = wo.id
     WHERE ar.customer_id = $1
     ORDER BY ar.created_at DESC
     LIMIT 50`,
    [contact.id]
  );

  res.json({
    customer_name: contact.name,
    approvals: history.rows,
  });
});

// ============================================================
// AUTO-EXPIRE & ESCALATION
// ============================================================

// POST /api/approvals/:id/escalate — Manual or automated escalation
router.post('/:id/escalate', async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;
  const { reason = 'timeout' } = req.body;

  const result = await db.query(
    `SELECT ar.*, c.phone as customer_phone, c.name as customer_name
     FROM approval_requests ar
     LEFT JOIN contacts c ON ar.customer_id = c.id
     WHERE ar.id = $1 AND ar.org_id = $2 AND ar.status IN ('PENDING', 'VIEWED')`,
    [id, orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Approval not found or already resolved' });
  }

  const approval = result.rows[0];

  // Send reminder SMS
  if (approval.customer_phone) {
    await sendApprovalSMS(
      approval.customer_phone,
      approval.id,
      approval.customer_token,
      approval.workshop_name || 'Verkstad'
    );

    await db.query(
      `UPDATE approval_requests SET sms_reminder_sent_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  await logEvent(db, id, 'escalated', { reason, customer_phone: approval.customer_phone ? '****' : null });

  res.json({ escalated: true, reason });
});

// ============================================================
// CRON: Expire old approvals (called by scheduler)
// ============================================================

export async function expireOldApprovals(pool: Pool): Promise<number> {
  const result = await pool.query(
    `UPDATE approval_requests
     SET status = 'EXPIRED', updated_at = NOW()
     WHERE status IN ('PENDING', 'VIEWED')
       AND token_expires_at < NOW()
     RETURNING id`
  );

  for (const row of result.rows) {
    await logEvent(pool, row.id, 'expired', {});
  }

  return result.rows.length;
}

export default router;
