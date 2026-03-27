import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// =============================================================================
// Voice AI Engine — Autonomous Customer Interaction Motor
//
// Architecture:
//   46elks (telephony) → Voice AI Pipeline → Automation Layer → CRM/Tickets
//
// Pipeline:
//   1. Inbound call → 46elks webhook
//   2. Audio stream → ASR (Whisper/Deepgram) → real-time transcript
//   3. Transcript → LLM (Claude) → intent detection + response
//   4. Response → TTS (ElevenLabs) → audio back to caller
//   5. Post-call → summary, sentiment, tasks, CRM update
//
// Features:
//   - Intent-driven routing (support/sales/billing/VIP)
//   - Voice personas per department
//   - Real-time CRM enrichment during call
//   - After-call intelligence (summary, sentiment, next steps)
//   - Proactive outbound AI calls
//   - Multichannel unification (phone/SMS/WhatsApp/email/chat)
//   - Self-learning from call outcomes
// =============================================================================

const router = Router();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
interface AuthUser { id: string; org_id: string; role: string; }

function getUser(req: Request, res: Response): AuthUser | null {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
}

// ---------------------------------------------------------------------------
// Provider configs
// ---------------------------------------------------------------------------
function getAnthropicKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

function getElevenLabsKey(): string | null {
  return process.env.ELEVENLABS_API_KEY || null;
}

function getDeepgramKey(): string | null {
  return process.env.DEEPGRAM_API_KEY || null;
}

// =============================================================================
// 1. VOICE AGENTS — Configurable AI agents per department
// =============================================================================

router.get("/api/voice-ai/agents", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("voice_ai_agents")
    .select("*")
    .eq("org_id", user.org_id)
    .order("name");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/voice-ai/agents", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const {
    name, department, description, language,
    // Voice persona
    voice_provider, voice_id, voice_name, voice_style,
    speaking_rate, pitch,
    // LLM config
    llm_model, system_prompt, temperature, max_tokens,
    // Behavior
    greeting_message, fallback_message, transfer_message,
    max_conversation_turns, silence_timeout_ms, interrupt_sensitivity,
    // Routing
    can_transfer_to_human, human_transfer_number, escalation_intents,
    // Knowledge
    knowledge_base_ids, rag_enabled,
    // Number assignment
    assigned_number,
  } = req.body;

  if (!name || !department) {
    return res.status(400).json({ error: "name and department required" });
  }

  const { data, error } = await supabase
    .from("voice_ai_agents")
    .insert({
      org_id: user.org_id,
      name, department, description,
      language: language || "sv",
      // Voice
      voice_provider: voice_provider || "ELEVENLABS",
      voice_id, voice_name,
      voice_style: voice_style || "calm_professional",
      speaking_rate: speaking_rate || 1.0,
      pitch: pitch || 1.0,
      // LLM
      llm_model: llm_model || "claude-sonnet-4-5-20250514",
      system_prompt: system_prompt || buildDefaultPrompt(department, language || "sv"),
      temperature: temperature || 0.3,
      max_tokens: max_tokens || 300,
      // Behavior
      greeting_message: greeting_message || defaultGreeting(department, language || "sv"),
      fallback_message: fallback_message || "Ursäkta, jag förstod inte riktigt. Kan du upprepa?",
      transfer_message: transfer_message || "Jag kopplar dig vidare till en kollega. Vänta ett ögonblick.",
      max_conversation_turns: max_conversation_turns || 20,
      silence_timeout_ms: silence_timeout_ms || 5000,
      interrupt_sensitivity: interrupt_sensitivity || "MEDIUM",
      // Routing
      can_transfer_to_human: can_transfer_to_human !== false,
      human_transfer_number,
      escalation_intents: escalation_intents || ["angry_customer", "legal_issue", "complex_technical"],
      // Knowledge
      knowledge_base_ids: knowledge_base_ids || [],
      rag_enabled: rag_enabled || false,
      // Number
      assigned_number,
      //
      is_active: true,
      created_by: user.id,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch("/api/voice-ai/agents/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const allowed = [
    "name", "department", "description", "language",
    "voice_provider", "voice_id", "voice_name", "voice_style",
    "speaking_rate", "pitch",
    "llm_model", "system_prompt", "temperature", "max_tokens",
    "greeting_message", "fallback_message", "transfer_message",
    "max_conversation_turns", "silence_timeout_ms", "interrupt_sensitivity",
    "can_transfer_to_human", "human_transfer_number", "escalation_intents",
    "knowledge_base_ids", "rag_enabled", "assigned_number", "is_active",
  ];
  const updates: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const { data, error } = await supabase
    .from("voice_ai_agents")
    .update(updates)
    .eq("id", req.params.id).eq("org_id", user.org_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// 2. CONVERSATION PROCESSING — Real-time voice AI pipeline
// =============================================================================

// Process incoming call through AI pipeline
router.post("/api/voice-ai/process-call", async (req: Request, res: Response) => {
  const { callid, from, to, transcript, agent_id } = req.body;

  // Find agent for this number/department
  let agent: any = null;

  if (agent_id) {
    const { data } = await supabase
      .from("voice_ai_agents")
      .select("*")
      .eq("id", agent_id)
      .eq("is_active", true)
      .single();
    agent = data;
  } else if (to) {
    const { data } = await supabase
      .from("voice_ai_agents")
      .select("*")
      .eq("assigned_number", to)
      .eq("is_active", true)
      .single();
    agent = data;
  }

  if (!agent) {
    return res.status(404).json({ error: "No active voice agent found" });
  }

  // Get or create conversation session
  let session = await getOrCreateSession(callid, from, to, agent);

  // Detect intent from transcript
  const intent = await detectIntent(transcript, agent, session);

  // Check for escalation
  if (agent.escalation_intents?.includes(intent.primary_intent)) {
    // Transfer to human
    return res.json({
      action: "transfer",
      message: agent.transfer_message,
      transfer_to: agent.human_transfer_number,
      intent,
    });
  }

  // Generate AI response
  const response = await generateResponse(transcript, agent, session, intent);

  // Update session
  await supabase
    .from("voice_ai_sessions")
    .update({
      turn_count: (session.turn_count || 0) + 1,
      last_intent: intent.primary_intent,
      conversation_history: [
        ...(session.conversation_history || []),
        { role: "user", content: transcript, timestamp: new Date().toISOString() },
        { role: "assistant", content: response.text, timestamp: new Date().toISOString() },
      ],
    })
    .eq("id", session.id);

  res.json({
    action: "respond",
    text: response.text,
    voice_config: {
      provider: agent.voice_provider,
      voice_id: agent.voice_id,
      speaking_rate: agent.speaking_rate,
      pitch: agent.pitch,
    },
    intent,
    session_id: session.id,
  });
});

// =============================================================================
// 3. INTENT DETECTION — Classify customer intent
// =============================================================================

async function detectIntent(transcript: string, agent: any, session: any): Promise<any> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return { primary_intent: "general_inquiry", confidence: 0.5, entities: {} };
  }

  const history = (session.conversation_history || [])
    .slice(-6)
    .map((h: any) => `${h.role}: ${h.content}`)
    .join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: `Classify the customer's intent. Return JSON:
{"primary_intent":"...", "secondary_intent":"...", "sentiment":"positive|neutral|negative|angry", "urgency":"low|medium|high|critical", "entities":{"customer_name":"...","order_id":"...","product":"..."}, "confidence":0.0-1.0}

Valid intents: booking, support, complaint, billing, sales_inquiry, order_status, cancel, reschedule, technical_issue, angry_customer, legal_issue, complex_technical, general_inquiry, callback_request, pricing, warranty`,
        messages: [
          { role: "user", content: `Department: ${agent.department}\nHistory:\n${history}\n\nLatest: ${transcript}` },
        ],
      }),
    });

    const data = await response.json() as any;
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch (err) {
    return { primary_intent: "general_inquiry", confidence: 0.3, entities: {} };
  }
}

// =============================================================================
// 4. RESPONSE GENERATION — LLM-powered conversational responses
// =============================================================================

async function generateResponse(transcript: string, agent: any, session: any, intent: any): Promise<{ text: string }> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return { text: agent.fallback_message };
  }

  // Build conversation history for context
  const history = (session.conversation_history || []).map((h: any) => ({
    role: h.role,
    content: h.content,
  }));

  // CRM enrichment — look up caller
  let customerContext = "";
  if (session.from_number) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone, company_id, companies(name)")
      .or(`phone.eq.${session.from_number},phone.eq.${session.from_number.replace("+46", "0")}`)
      .limit(1);

    if (contacts?.length) {
      const c = contacts[0] as any;
      customerContext = `\nKänd kund: ${c.full_name}, Företag: ${c.companies?.name || "Okänt"}, Email: ${c.email}`;
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.llm_model || "claude-sonnet-4-5-20250514",
        max_tokens: agent.max_tokens || 300,
        temperature: agent.temperature || 0.3,
        system: `${agent.system_prompt}\n\nDetected intent: ${intent.primary_intent} (${intent.sentiment})${customerContext}\n\nKeep responses concise (1-3 sentences) and natural for spoken conversation.`,
        messages: [
          ...history,
          { role: "user", content: transcript },
        ],
      }),
    });

    const data = await response.json() as any;
    const text = data.content?.[0]?.text || agent.fallback_message;
    return { text };
  } catch (err) {
    return { text: agent.fallback_message };
  }
}

// =============================================================================
// 5. TTS — Text-to-Speech via ElevenLabs
// =============================================================================

router.post("/api/voice-ai/tts", async (req: Request, res: Response) => {
  const { text, voice_id, speaking_rate, pitch } = req.body;

  const apiKey = getElevenLabsKey();
  if (!apiKey) {
    return res.status(503).json({ error: "ElevenLabs not configured (ELEVENLABS_API_KEY)" });
  }

  if (!text) return res.status(400).json({ error: "text required" });

  const vid = voice_id || "pNInz6obpgDQGcFmaJgB"; // Default Swedish voice

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: speaking_rate || 1.0,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err });
    }

    // Stream audio back
    const buffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 6. ASR — Speech-to-Text via Deepgram
// =============================================================================

router.post("/api/voice-ai/transcribe", async (req: Request, res: Response) => {
  const apiKey = getDeepgramKey();
  if (!apiKey) {
    return res.status(503).json({ error: "Deepgram not configured (DEEPGRAM_API_KEY)" });
  }

  const { audio_url, language } = req.body;
  if (!audio_url) return res.status(400).json({ error: "audio_url required" });

  try {
    const response = await fetch(`https://api.deepgram.com/v1/listen?model=nova-2&language=${language || "sv"}&smart_format=true&diarize=true`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audio_url }),
    });

    const data = await response.json() as any;
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    res.json({
      transcript,
      confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence,
      words: data.results?.channels?.[0]?.alternatives?.[0]?.words,
      duration: data.metadata?.duration,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 7. AFTER-CALL INTELLIGENCE — Post-call analysis
// =============================================================================

router.post("/api/voice-ai/analyze-call", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { session_id, call_id } = req.body;

  // Get session with full conversation
  const { data: session } = await supabase
    .from("voice_ai_sessions")
    .select("*")
    .eq("id", session_id)
    .single();

  if (!session) return res.status(404).json({ error: "Session not found" });

  const apiKey = getAnthropicKey();
  if (!apiKey) return res.status(503).json({ error: "Anthropic not configured" });

  const conversation = (session.conversation_history || [])
    .map((h: any) => `${h.role === "user" ? "Kund" : "Agent"}: ${h.content}`)
    .join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 1000,
        system: `Analyze this customer call and return JSON:
{
  "summary": "2-3 sentence summary",
  "sentiment_overall": "positive|neutral|negative",
  "sentiment_score": -1.0 to 1.0,
  "primary_intent": "...",
  "resolution": "resolved|unresolved|transferred|callback_needed",
  "customer_satisfaction_estimate": 1-5,
  "key_topics": ["topic1", "topic2"],
  "action_items": [{"task": "...", "priority": "high|medium|low", "assigned_to": "..."}],
  "follow_up_needed": true/false,
  "follow_up_suggestion": "...",
  "upsell_opportunities": ["..."],
  "compliance_flags": ["..."],
  "training_feedback": "What the AI agent did well/poorly"
}`,
        messages: [
          { role: "user", content: `Conversation:\n${conversation}` },
        ],
      }),
    });

    const data = await response.json() as any;
    const analysis = JSON.parse(data.content?.[0]?.text || "{}");

    // Store analysis
    await supabase
      .from("voice_ai_sessions")
      .update({
        analysis,
        status: "ANALYZED",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // Auto-create tasks from action items
    if (analysis.action_items?.length) {
      for (const item of analysis.action_items) {
        await supabase.from("tasks").insert({
          org_id: user.org_id,
          title: `[Samtal] ${item.task}`,
          description: `Auto-genererat från samtal ${session.call_id}.\n\nSammanfattning: ${analysis.summary}`,
          status: "TODO",
          priority: item.priority === "high" ? 1 : item.priority === "medium" ? 2 : 3,
          created_by: user.id,
        }).then(() => {});
      }
    }

    // Auto-create support ticket if unresolved
    if (analysis.resolution === "unresolved" || analysis.resolution === "callback_needed") {
      await supabase.from("support_tickets").insert({
        org_id: user.org_id,
        channel: "PHONE",
        subject: `Uppföljning: ${analysis.summary?.substring(0, 100)}`,
        description: `AI-agent kunde inte lösa ärendet.\n\n${analysis.summary}\n\nSentiment: ${analysis.sentiment_overall} (${analysis.sentiment_score})`,
        priority: analysis.sentiment_overall === "negative" ? "HIGH" : "MEDIUM",
        source_call_id: call_id,
        status: "OPEN",
      }).then(() => {});
    }

    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 8. PROACTIVE OUTBOUND — AI-driven outbound calls
// =============================================================================

router.post("/api/voice-ai/outbound", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { agent_id, to, purpose, context, scheduled_at } = req.body;

  if (!agent_id || !to) {
    return res.status(400).json({ error: "agent_id and to required" });
  }

  const { data, error } = await supabase
    .from("voice_ai_outbound_queue")
    .insert({
      org_id: user.org_id,
      agent_id,
      to_number: to,
      purpose: purpose || "follow_up",
      context: context || {},
      scheduled_at: scheduled_at || new Date().toISOString(),
      status: "QUEUED",
      created_by: user.id,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get("/api/voice-ai/outbound", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("voice_ai_outbound_queue")
    .select("*, agent:voice_ai_agents(name, department)")
    .eq("org_id", user.org_id)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// 9. VOICE PERSONAS — ElevenLabs voice library
// =============================================================================

router.get("/api/voice-ai/voices", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const apiKey = getElevenLabsKey();
  if (!apiKey) {
    // Return built-in voice presets
    return res.json([
      { id: "preset_support_sv", name: "Support (SV)", style: "calm_professional", language: "sv" },
      { id: "preset_sales_sv", name: "Försäljning (SV)", style: "energetic", language: "sv" },
      { id: "preset_reception_sv", name: "Reception (SV)", style: "warm_welcoming", language: "sv" },
      { id: "preset_technical_sv", name: "Teknisk (SV)", style: "precise_knowledgeable", language: "sv" },
      { id: "preset_vip_sv", name: "VIP (SV)", style: "personal_premium", language: "sv" },
    ]);
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const data = await response.json() as any;
    res.json(data.voices || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 10. KNOWLEDGE BASE — RAG for voice agents
// =============================================================================

router.post("/api/voice-ai/knowledge", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { name, content, category, tags } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: "name and content required" });
  }

  const { data, error } = await supabase
    .from("voice_ai_knowledge")
    .insert({
      org_id: user.org_id,
      name,
      content,
      category: category || "general",
      tags: tags || [],
      created_by: user.id,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get("/api/voice-ai/knowledge", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("voice_ai_knowledge")
    .select("*")
    .eq("org_id", user.org_id)
    .order("name");

  if (req.query.category) query = query.eq("category", req.query.category as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// 11. SESSIONS & ANALYTICS — Call session management
// =============================================================================

router.get("/api/voice-ai/sessions", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("voice_ai_sessions")
    .select("*, agent:voice_ai_agents(name, department)")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (req.query.agent_id) query = query.eq("agent_id", req.query.agent_id as string);
  if (req.query.status) query = query.eq("status", req.query.status as string);

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Dashboard
router.get("/api/voice-ai/dashboard", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [agentsRes, sessionsRes, outboundRes] = await Promise.all([
    supabase.from("voice_ai_agents").select("id, name, department, is_active")
      .eq("org_id", user.org_id),
    supabase.from("voice_ai_sessions").select("id, status, turn_count, analysis, agent_id")
      .eq("org_id", user.org_id)
      .gte("created_at", thirtyDaysAgo),
    supabase.from("voice_ai_outbound_queue").select("id, status")
      .eq("org_id", user.org_id)
      .gte("created_at", thirtyDaysAgo),
  ]);

  const sessions = sessionsRes.data || [];
  const analyzed = sessions.filter((s: any) => s.analysis);
  const avgSatisfaction = analyzed.length > 0
    ? analyzed.reduce((sum: number, s: any) => sum + (s.analysis?.customer_satisfaction_estimate || 3), 0) / analyzed.length
    : null;

  const sentiments = analyzed.reduce((acc: any, s: any) => {
    const sent = s.analysis?.sentiment_overall || "neutral";
    acc[sent] = (acc[sent] || 0) + 1;
    return acc;
  }, {});

  const intents = analyzed.reduce((acc: any, s: any) => {
    const intent = s.analysis?.primary_intent || "unknown";
    acc[intent] = (acc[intent] || 0) + 1;
    return acc;
  }, {});

  res.json({
    agents: {
      total: (agentsRes.data || []).length,
      active: (agentsRes.data || []).filter((a: any) => a.is_active).length,
    },
    sessions_30d: {
      total: sessions.length,
      analyzed: analyzed.length,
      avg_turns: sessions.length > 0
        ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.turn_count || 0), 0) / sessions.length)
        : 0,
      avg_satisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null,
      sentiments,
      top_intents: Object.entries(intents)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([intent, count]) => ({ intent, count })),
    },
    outbound_30d: {
      total: (outboundRes.data || []).length,
      completed: (outboundRes.data || []).filter((o: any) => o.status === "COMPLETED").length,
    },
  });
});

// =============================================================================
// Helpers
// =============================================================================

async function getOrCreateSession(callId: string, from: string, to: string, agent: any): Promise<any> {
  // Check for existing session
  const { data: existing } = await supabase
    .from("voice_ai_sessions")
    .select("*")
    .eq("call_id", callId)
    .single();

  if (existing) return existing;

  // Create new session
  const { data: session } = await supabase
    .from("voice_ai_sessions")
    .insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      call_id: callId,
      from_number: from,
      to_number: to,
      status: "ACTIVE",
      turn_count: 0,
      conversation_history: [],
    })
    .select().single();

  return session;
}

function buildDefaultPrompt(department: string, language: string): string {
  const lang = language === "sv" ? "svenska" : "engelska";
  const prompts: Record<string, string> = {
    support: `Du är en professionell kundsupport-agent. Svara på ${lang}. Du hjälper kunder med tekniska problem, frågor och ärenden. Var vänlig, tålmodig och lösningsorienterad. Om du inte kan lösa problemet, erbjud att koppla till en människa.`,
    sales: `Du är en erfaren säljare. Svara på ${lang}. Du hjälper kunder med information om produkter och tjänster, priser och erbjudanden. Var entusiastisk men inte påträngande. Identifiera behov och föreslå passande lösningar.`,
    billing: `Du är en ekonomiassistent. Svara på ${lang}. Du hjälper kunder med fakturafrågor, betalningar och ekonomiska ärenden. Var exakt och tydlig med siffror. Hänvisa till specifika fakturanummer och belopp.`,
    reception: `Du är en vänlig receptionist. Svara på ${lang}. Du tar emot samtal, identifierar ärenden och kopplar vidare till rätt avdelning. Var välkomnande och effektiv.`,
    technical: `Du är en teknisk specialist. Svara på ${lang}. Du hjälper med tekniska frågor, felsökning och konfiguration. Ge steg-för-steg instruktioner. Var tydlig och pedagogisk.`,
    hr: `Du är en personalassistent. Svara på ${lang}. Du hjälper med personalfrågor, ledighet, anställningsvillkor och intern information. Var diskret och omtänksam.`,
  };

  return prompts[department] || prompts.reception;
}

function defaultGreeting(department: string, language: string): string {
  if (language !== "sv") {
    return "Hello and welcome. How can I help you today?";
  }

  const greetings: Record<string, string> = {
    support: "Hej och välkommen till supporten. Hur kan jag hjälpa dig?",
    sales: "Hej och välkommen! Vad kan jag hjälpa dig med idag?",
    billing: "Hej, du har nått ekonomiavdelningen. Hur kan jag hjälpa dig?",
    reception: "Välkommen! Hur kan jag koppla dig rätt?",
    technical: "Hej, du har nått teknisk support. Beskriv ditt ärende så hjälper jag dig.",
    hr: "Hej, du har nått personalavdelningen. Vad gäller ditt ärende?",
  };

  return greetings[department] || greetings.reception;
}

export default router;
