import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// =============================================================================
// 46elks Telephony Engine — Full phone number management, voice, IVR, SMS
//
// Features:
//   1. Number provisioning (08-nummer, mobilnummer, etc.)
//   2. Outbound/inbound voice calls
//   3. IVR (Interactive Voice Response) with menu trees
//   4. Call routing to departments/users
//   5. Call recording & transcription
//   6. Webhooks for incoming calls/SMS
//   7. Number management (list, update, deallocate)
//   8. Integration with Communication Hub
// =============================================================================

const router = Router();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ELKS_API = "https://api.46elks.com/a1";

function getElksAuth(): string | null {
  const u = process.env.ELKS_API_USERNAME;
  const p = process.env.ELKS_API_PASSWORD;
  if (!u || !p) return null;
  return Buffer.from(`${u}:${p}`).toString("base64");
}

async function elksRequest(method: string, endpoint: string, body?: Record<string, string>): Promise<any> {
  const auth = getElksAuth();
  if (!auth) throw new Error("46elks credentials not configured (ELKS_API_USERNAME/ELKS_API_PASSWORD)");

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = new URLSearchParams(body).toString();
  }

  const url = endpoint.startsWith("http") ? endpoint : `${ELKS_API}${endpoint}`;
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || `46elks API error ${response.status}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
interface AuthUser { id: string; org_id: string; role: string; }

function getUser(req: Request, res: Response): AuthUser | null {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
}

async function audit(userId: string, orgId: string, action: string, entityType: string, entityId?: string, meta?: any) {
  await supabase.from("audit_log").insert({ user_id: userId, org_id: orgId, action, entity_type: entityType, entity_id: entityId, metadata: meta });
}

// =============================================================================
// 1. ACCOUNT — Check balance and status
// =============================================================================

router.get("/api/telephony/account", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("GET", "/me");
    res.json({
      balance: data.balance,
      currency: data.currency || "EUR",
      name: data.name,
      email: data.email,
      creditlimit: data.creditlimit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 2. NUMBER MANAGEMENT — Provision, list, update, deallocate
// =============================================================================

// List all allocated numbers
router.get("/api/telephony/numbers", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("GET", "/numbers");
    // data.data is array of numbers
    res.json(data.data || data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Allocate a new number
router.post("/api/telephony/numbers", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { country, category, capabilities, voice_start, sms_url } = req.body;

  // Build allocation params
  const params: Record<string, string> = {
    country: country || "se",
  };

  // category: "fixed" for 08-nummer, "mobile" for mobilnummer
  if (category) params.category = category;

  // capabilities: "sms", "voice", "sms,voice"
  if (capabilities) params.capabilities = capabilities;
  else params.capabilities = "sms,voice";

  // Set webhooks for the number
  const baseUrl = process.env.API_BASE_URL || `https://api.bc.pixdrift.com`;

  if (voice_start) params.voice_start = voice_start;
  else params.voice_start = `${baseUrl}/api/telephony/webhook/voice`;

  if (sms_url) params.sms_url = sms_url;
  else params.sms_url = `${baseUrl}/api/telephony/webhook/sms`;

  try {
    const data = await elksRequest("POST", "/numbers", params);

    // Store in our database
    await supabase.from("telephony_numbers").insert({
      org_id: user.org_id,
      elks_id: data.id,
      number: data.number,
      country: data.country,
      category: data.category || category || "fixed",
      capabilities: (data.capabilities || capabilities || "sms,voice").split(","),
      voice_start_url: params.voice_start,
      sms_url: params.sms_url,
      is_active: true,
      allocated_by: user.id,
      monthly_cost_eur: (category === "fixed") ? 15.00 : 3.00,
    });

    await audit(user.id, user.org_id, "ALLOCATE_NUMBER", "telephony_numbers", data.id, {
      number: data.number, country: data.country, category,
    });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get number details
router.get("/api/telephony/numbers/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("GET", `/numbers/${req.params.id}`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update number webhooks
router.patch("/api/telephony/numbers/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const params: Record<string, string> = {};
  if (req.body.voice_start) params.voice_start = req.body.voice_start;
  if (req.body.sms_url) params.sms_url = req.body.sms_url;
  if (req.body.mms_url) params.mms_url = req.body.mms_url;

  try {
    const data = await elksRequest("POST", `/numbers/${req.params.id}`, params);

    // Update our DB
    await supabase
      .from("telephony_numbers")
      .update({
        voice_start_url: params.voice_start,
        sms_url: params.sms_url,
      })
      .eq("elks_id", req.params.id)
      .eq("org_id", user.org_id);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deallocate number
router.delete("/api/telephony/numbers/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("POST", `/numbers/${req.params.id}`, { active: "no" });

    await supabase
      .from("telephony_numbers")
      .update({ is_active: false, deallocated_at: new Date().toISOString() })
      .eq("elks_id", req.params.id)
      .eq("org_id", user.org_id);

    await audit(user.id, user.org_id, "DEALLOCATE_NUMBER", "telephony_numbers", req.params.id);
    res.json({ success: true, number: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 3. VOICE CALLS — Make outbound calls
// =============================================================================

router.post("/api/telephony/calls", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { from, to, voice_start, whenhangup, timeout, record } = req.body;

  if (!from || !to) {
    return res.status(400).json({ error: "from and to required" });
  }

  const params: Record<string, string> = {
    from: normalizePhone(from),
    to: normalizePhone(to),
  };

  // IVR or connect action
  if (voice_start) {
    params.voice_start = typeof voice_start === "string" ? voice_start : JSON.stringify(voice_start);
  } else {
    // Default: connect to the 'to' number
    params.voice_start = JSON.stringify({
      connect: normalizePhone(to),
      callerid: normalizePhone(from),
    });
  }

  if (whenhangup) params.whenhangup = whenhangup;
  if (timeout) params.timeout = String(timeout);

  try {
    const data = await elksRequest("POST", "/calls", params);

    // Log call
    await supabase.from("telephony_calls").insert({
      org_id: user.org_id,
      elks_call_id: data.id,
      direction: "OUTBOUND",
      from_number: normalizePhone(from),
      to_number: normalizePhone(to),
      status: data.state || "initiated",
      initiated_by: user.id,
      record: record || false,
    });

    await audit(user.id, user.org_id, "MAKE_CALL", "telephony_calls", data.id, {
      from, to: maskPhone(to),
    });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List calls
router.get("/api/telephony/calls", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("GET", "/calls");
    res.json(data.data || data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get call details
router.get("/api/telephony/calls/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("GET", `/calls/${req.params.id}`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 4. IVR CONFIGURATIONS — Menu trees for incoming calls
// =============================================================================

router.get("/api/telephony/ivr", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("telephony_ivr_configs")
    .select("*")
    .eq("org_id", user.org_id)
    .order("name");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/telephony/ivr", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { name, description, number_id, greeting_text, greeting_audio_url, menu_options, business_hours, after_hours_action, language } = req.body;

  if (!name) return res.status(400).json({ error: "name required" });

  // Build 46elks IVR JSON action
  const ivrAction = buildIvrAction({
    greeting_text, greeting_audio_url, menu_options,
    business_hours, after_hours_action, language,
  });

  const { data, error } = await supabase
    .from("telephony_ivr_configs")
    .insert({
      org_id: user.org_id,
      name, description,
      number_id,
      greeting_text,
      greeting_audio_url,
      menu_options: menu_options || [],
      business_hours,
      after_hours_action,
      language: language || "sv",
      ivr_json: ivrAction,
      is_active: true,
      created_by: user.id,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  // If number_id provided, update the number's voice_start webhook
  if (number_id) {
    const baseUrl = process.env.API_BASE_URL || "https://api.bc.pixdrift.com";
    try {
      await elksRequest("POST", `/numbers/${number_id}`, {
        voice_start: `${baseUrl}/api/telephony/webhook/voice?ivr=${data.id}`,
      });
    } catch (err) {
      console.error("[IVR] Failed to update number webhook:", err);
    }
  }

  await audit(user.id, user.org_id, "CREATE", "telephony_ivr_configs", data.id);
  res.status(201).json(data);
});

router.patch("/api/telephony/ivr/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const allowed = ["name", "description", "greeting_text", "greeting_audio_url",
    "menu_options", "business_hours", "after_hours_action", "language", "is_active"];
  const updates: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  // Rebuild IVR JSON
  if (updates.greeting_text || updates.menu_options || updates.business_hours) {
    const { data: current } = await supabase
      .from("telephony_ivr_configs")
      .select("*")
      .eq("id", req.params.id).eq("org_id", user.org_id)
      .single();

    if (current) {
      updates.ivr_json = buildIvrAction({
        greeting_text: updates.greeting_text || current.greeting_text,
        greeting_audio_url: updates.greeting_audio_url || current.greeting_audio_url,
        menu_options: updates.menu_options || current.menu_options,
        business_hours: updates.business_hours || current.business_hours,
        after_hours_action: updates.after_hours_action || current.after_hours_action,
        language: updates.language || current.language,
      });
    }
  }

  const { data, error } = await supabase
    .from("telephony_ivr_configs")
    .update(updates)
    .eq("id", req.params.id).eq("org_id", user.org_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// 5. WEBHOOKS — Receive incoming calls & SMS from 46elks
// =============================================================================

// Incoming voice call webhook
router.post("/api/telephony/webhook/voice", async (req: Request, res: Response) => {
  // 46elks sends form-urlencoded
  const { callid, from, to, direction, result } = req.body;
  const ivrId = req.query.ivr as string;

  console.log(`[VOICE WEBHOOK] Call ${callid} from ${from} to ${to} dir=${direction}`);

  // Log incoming call
  await supabase.from("telephony_calls").insert({
    org_id: null, // Will be matched by number
    elks_call_id: callid,
    direction: "INBOUND",
    from_number: from,
    to_number: to,
    status: result || "incoming",
  }).then(() => {});

  // Find IVR config for this number or explicit IVR id
  let ivrConfig: any = null;

  if (ivrId) {
    const { data } = await supabase
      .from("telephony_ivr_configs")
      .select("*")
      .eq("id", ivrId)
      .eq("is_active", true)
      .single();
    ivrConfig = data;
  }

  if (!ivrConfig) {
    // Find by number
    const { data: numData } = await supabase
      .from("telephony_numbers")
      .select("id, org_id")
      .eq("number", to)
      .eq("is_active", true)
      .single();

    if (numData) {
      const { data } = await supabase
        .from("telephony_ivr_configs")
        .select("*")
        .eq("number_id", numData.id)
        .eq("is_active", true)
        .single();
      ivrConfig = data;
    }
  }

  if (ivrConfig?.ivr_json) {
    // Return IVR action
    res.set("Content-Type", "application/json");
    return res.json(ivrConfig.ivr_json);
  }

  // Default: play message and hang up
  res.json({
    play: "https://api.46elks.com/a1/recordings/welcome-sv.wav",
    next: JSON.stringify({ hangup: "reject" }),
  });
});

// IVR menu selection webhook
router.post("/api/telephony/webhook/ivr-select", async (req: Request, res: Response) => {
  const { callid, from, to, result } = req.body;
  const ivrId = req.query.ivr as string;
  const pressedKey = result;

  console.log(`[IVR SELECT] Call ${callid} pressed ${pressedKey}`);

  if (!ivrId) return res.json({ hangup: "reject" });

  const { data: ivr } = await supabase
    .from("telephony_ivr_configs")
    .select("menu_options")
    .eq("id", ivrId)
    .single();

  if (!ivr?.menu_options) return res.json({ hangup: "reject" });

  const option = (ivr.menu_options as any[]).find((o: any) => String(o.key) === String(pressedKey));

  if (!option) {
    return res.json({
      play: "https://api.46elks.com/a1/recordings/invalid-sv.wav",
      next: JSON.stringify({ hangup: "reject" }),
    });
  }

  // Route based on option action
  if (option.action === "connect" && option.connect_to) {
    return res.json({
      connect: normalizePhone(option.connect_to),
      callerid: to,
      timeout: option.timeout || 30,
    });
  }

  if (option.action === "voicemail") {
    return res.json({
      play: option.message || "Lämna ett meddelande efter tonen.",
      next: JSON.stringify({
        record: `${process.env.API_BASE_URL || "https://api.bc.pixdrift.com"}/api/telephony/webhook/voicemail?ivr=${ivrId}&key=${pressedKey}`,
        recordmaxlength: 120,
      }),
    });
  }

  if (option.action === "play") {
    return res.json({ play: option.message || "Tack för ditt samtal." });
  }

  // Default: connect to number
  if (option.connect_to) {
    return res.json({
      connect: normalizePhone(option.connect_to),
      callerid: to,
    });
  }

  res.json({ hangup: "reject" });
});

// Voicemail recording webhook
router.post("/api/telephony/webhook/voicemail", async (req: Request, res: Response) => {
  const { callid, from, to, recording } = req.body;
  const ivrId = req.query.ivr as string;

  console.log(`[VOICEMAIL] Call ${callid} from ${from}, recording: ${recording}`);

  // Store voicemail
  await supabase.from("telephony_voicemails").insert({
    call_id: callid,
    from_number: from,
    to_number: to,
    recording_url: recording,
    ivr_config_id: ivrId || null,
    is_listened: false,
  }).then(() => {});

  res.json({ play: "Tack för ditt meddelande. Vi återkommer så snart som möjligt." });
});

// Incoming SMS webhook
router.post("/api/telephony/webhook/sms", async (req: Request, res: Response) => {
  const { id, from, to, message, created } = req.body;

  console.log(`[SMS WEBHOOK] ${id} from ${from} to ${to}: ${message?.substring(0, 50)}`);

  // Find org by number
  const { data: numData } = await supabase
    .from("telephony_numbers")
    .select("org_id")
    .eq("number", to)
    .eq("is_active", true)
    .single();

  // Store in communication hub as inbound message
  if (numData) {
    await supabase.from("comm_messages").insert({
      org_id: numData.org_id,
      channel: "SMS",
      direction: "INBOUND",
      from_address: from,
      to_address: to,
      subject: null,
      body_text: message,
      external_id: id,
      status: "RECEIVED",
    }).then(() => {});
  }

  // Respond with empty 200 (no auto-reply)
  res.status(200).send("");
});

// Call status webhook (hangup)
router.post("/api/telephony/webhook/hangup", async (req: Request, res: Response) => {
  const { callid, from, to, result, duration, cost, actions, legs, recording } = req.body;

  console.log(`[HANGUP] Call ${callid} result=${result} duration=${duration}s cost=${cost}`);

  // Update call record
  await supabase
    .from("telephony_calls")
    .update({
      status: result || "completed",
      duration_seconds: duration ? parseInt(duration) : null,
      cost: cost ? parseFloat(cost) : null,
      recording_url: recording || null,
      ended_at: new Date().toISOString(),
    })
    .eq("elks_call_id", callid)
    .then(() => {});

  res.status(200).send("");
});

// =============================================================================
// 6. RECORDINGS — List and download
// =============================================================================

router.get("/api/telephony/recordings", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  try {
    const data = await elksRequest("GET", "/recordings");
    res.json(data.data || data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 7. SMS — Send via API (extends existing sms-service)
// =============================================================================

router.post("/api/telephony/sms", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { from, to, message, whendelivered } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "to and message required" });
  }

  const params: Record<string, string> = {
    from: from || process.env.ELKS_SENDER || "Hypbit",
    to: normalizePhone(to),
    message,
  };

  // Delivery report webhook
  if (whendelivered) {
    params.whendelivered = whendelivered;
  } else {
    const baseUrl = process.env.API_BASE_URL || "https://api.bc.pixdrift.com";
    params.whendelivered = `${baseUrl}/api/telephony/webhook/sms-delivery`;
  }

  try {
    const data = await elksRequest("POST", "/sms", params);

    // Log in communication hub
    await supabase.from("comm_messages").insert({
      org_id: user.org_id,
      channel: "SMS",
      direction: "OUTBOUND",
      from_address: params.from,
      to_address: params.to,
      body_text: message,
      external_id: data.id,
      status: "SENT",
      sent_by: user.id,
    }).then(() => {});

    await audit(user.id, user.org_id, "SEND_SMS", "telephony", data.id, {
      to: maskPhone(to), chars: message.length,
    });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SMS delivery report webhook
router.post("/api/telephony/webhook/sms-delivery", async (req: Request, res: Response) => {
  const { id, status, delivered } = req.body;
  console.log(`[SMS DELIVERY] ${id} status=${status} delivered=${delivered}`);

  await supabase
    .from("comm_messages")
    .update({ status: status === "delivered" ? "DELIVERED" : "FAILED" })
    .eq("external_id", id)
    .then(() => {});

  res.status(200).send("");
});

// =============================================================================
// 8. VOICEMAILS — List and manage
// =============================================================================

router.get("/api/telephony/voicemails", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("telephony_voicemails")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch("/api/telephony/voicemails/:id/listened", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("telephony_voicemails")
    .update({ is_listened: true, listened_by: user.id, listened_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// 9. DASHBOARD — Telephony overview
// =============================================================================

router.get("/api/telephony/dashboard", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const [numbersRes, callsRes, smsRes, vmRes, accountRes] = await Promise.all([
    supabase.from("telephony_numbers").select("id, number, category, capabilities", { count: "exact" })
      .eq("org_id", user.org_id).eq("is_active", true),
    supabase.from("telephony_calls").select("id, direction, status, duration_seconds")
      .eq("org_id", user.org_id)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from("comm_messages").select("id, direction, status")
      .eq("org_id", user.org_id).eq("channel", "SMS")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from("telephony_voicemails").select("id, is_listened", { count: "exact" })
      .eq("is_listened", false),
    elksRequest("GET", "/me").catch(() => null),
  ]);

  const calls = callsRes.data || [];
  const sms = smsRes.data || [];

  res.json({
    account_balance: accountRes?.balance || null,
    numbers: {
      total: numbersRes.count || 0,
      list: (numbersRes.data || []).map((n: any) => ({
        number: n.number, category: n.category, capabilities: n.capabilities,
      })),
    },
    calls_30d: {
      total: calls.length,
      inbound: calls.filter((c: any) => c.direction === "INBOUND").length,
      outbound: calls.filter((c: any) => c.direction === "OUTBOUND").length,
      total_minutes: Math.round(calls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / 60),
    },
    sms_30d: {
      total: sms.length,
      inbound: sms.filter((s: any) => s.direction === "INBOUND").length,
      outbound: sms.filter((s: any) => s.direction === "OUTBOUND").length,
    },
    voicemails_unlistened: vmRes.count || 0,
  });
});

// =============================================================================
// Helpers
// =============================================================================

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-\(\)]/g, "");
  if (normalized.startsWith("0")) {
    normalized = "+46" + normalized.slice(1);
  } else if (!normalized.startsWith("+")) {
    normalized = "+" + normalized;
  }
  return normalized;
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return "****";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}

function buildIvrAction(config: {
  greeting_text?: string;
  greeting_audio_url?: string;
  menu_options?: any[];
  business_hours?: any;
  after_hours_action?: any;
  language?: string;
}): any {
  const baseUrl = process.env.API_BASE_URL || "https://api.bc.pixdrift.com";
  const lang = config.language || "sv";

  // Build IVR menu from options
  const ivr: any = {};

  if (config.menu_options?.length) {
    for (const opt of config.menu_options) {
      ivr[String(opt.key)] = `${baseUrl}/api/telephony/webhook/ivr-select?ivr=__IVR_ID__&key=${opt.key}`;
    }
  }

  // Build greeting text with menu options
  let greetingParts = [];
  if (config.greeting_text) {
    greetingParts.push(config.greeting_text);
  } else {
    greetingParts.push("Välkommen till oss.");
  }

  if (config.menu_options?.length) {
    for (const opt of config.menu_options) {
      greetingParts.push(`Tryck ${opt.key} för ${opt.label}.`);
    }
  }

  const action: any = {};

  if (config.greeting_audio_url) {
    action.play = config.greeting_audio_url;
  } else {
    action.play = greetingParts.join(" ");
  }

  if (Object.keys(ivr).length > 0) {
    action.ivr = ivr;
    action.timeout = 10;
    action.repeat = 2;
  }

  return action;
}

export default router;
