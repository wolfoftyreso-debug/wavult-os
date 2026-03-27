// ═══════════════════════════════════════════════════════════════════════════════
// PCI — Normalization Service
// ═══════════════════════════════════════════════════════════════════════════════
// Converts raw data → { type, urgency, entities, summary }
// Uses Anthropic Claude for intelligent classification when available,
// falls back to rule-based heuristics.

import { supabase } from "../supabase";

interface NormalizedResult {
  type: "task" | "info" | "decision";
  urgency: number;
  entities: string[];
  summary: string;
}

// ─── Rule-based normalization (no LLM dependency) ────────────────────────────

function normalizeByRules(raw: {
  type: string;
  content: Record<string, unknown>;
}): NormalizedResult {
  const content = raw.content;
  const text =
    typeof content.text === "string"
      ? content.text
      : typeof content.body === "string"
        ? content.body
        : typeof content.subject === "string"
          ? (content.subject as string)
          : JSON.stringify(content);

  const lower = text.toLowerCase();

  // Type classification
  let type: NormalizedResult["type"] = "info";
  if (
    lower.includes("approve") ||
    lower.includes("sign") ||
    lower.includes("decide") ||
    lower.includes("choose")
  ) {
    type = "decision";
  } else if (
    lower.includes("todo") ||
    lower.includes("task") ||
    lower.includes("deadline") ||
    lower.includes("deliver") ||
    lower.includes("submit") ||
    lower.includes("review") ||
    lower.includes("complete")
  ) {
    type = "task";
  }

  // Urgency scoring
  let urgency = 0.3;
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("immediately")) urgency = 0.9;
  else if (lower.includes("important") || lower.includes("priority") || lower.includes("critical")) urgency = 0.7;
  else if (lower.includes("deadline") || lower.includes("due")) urgency = 0.6;
  else if (lower.includes("fyi") || lower.includes("info") || lower.includes("newsletter")) urgency = 0.1;

  // Entity extraction (simple)
  const entities: string[] = [];
  const entityPatterns = [
    /\b(?:LandveX|quiXzoom|Wavult|Hypbit|Quixom)\b/gi,
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Person names
  ];
  for (const pattern of entityPatterns) {
    const matches = text.match(pattern);
    if (matches) entities.push(...matches);
  }

  // Summary
  const summary =
    typeof content.subject === "string"
      ? (content.subject as string)
      : text.slice(0, 150) + (text.length > 150 ? "…" : "");

  return {
    type,
    urgency: Math.round(urgency * 100) / 100,
    entities: [...new Set(entities)].slice(0, 5),
    summary,
  };
}

// ─── LLM-based normalization (when Anthropic key available) ──────────────────

async function normalizeWithLLM(
  raw: { type: string; content: Record<string, unknown> },
  anthropicKey: string
): Promise<NormalizedResult | null> {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: anthropicKey });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Classify this data. Return JSON only, no markdown.
Input: ${JSON.stringify(raw.content).slice(0, 500)}

Return:
{"type":"task|info|decision","urgency":0.0-1.0,"entities":["..."],"summary":"max 100 chars"}`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text);
    return {
      type: parsed.type || "info",
      urgency: Math.max(0, Math.min(1, parsed.urgency || 0.3)),
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 5) : [],
      summary: (parsed.summary || "").slice(0, 200),
    };
  } catch {
    return null; // Fall back to rules
  }
}

// ─── Main: normalize a single raw_data record ───────────────────────────────

export async function normalizeRawData(
  rawId: string,
  userId: string
): Promise<{ id: string } | { error: string }> {
  // Fetch raw data
  const { data: raw, error: fetchErr } = await supabase
    .from("raw_data")
    .select("*")
    .eq("id", rawId)
    .single();

  if (fetchErr || !raw) return { error: fetchErr?.message || "Not found" };

  // Try LLM first, fall back to rules
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  let result: NormalizedResult;

  if (anthropicKey) {
    const llmResult = await normalizeWithLLM(raw, anthropicKey);
    result = llmResult || normalizeByRules(raw);
  } else {
    result = normalizeByRules(raw);
  }

  // Store
  const { data: norm, error: insertErr } = await supabase
    .from("normalized_data")
    .insert({
      raw_id: rawId,
      user_id: userId,
      ...result,
    })
    .select()
    .single();

  if (insertErr) return { error: insertErr.message };
  return { id: norm.id };
}

// ─── Batch: normalize all un-processed raw data for a user ───────────────────

export async function normalizeAllPending(
  userId: string
): Promise<{ processed: number; errors: number }> {
  // Find raw_data without a corresponding normalized_data
  const { data: raws, error } = await supabase
    .from("raw_data")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !raws) return { processed: 0, errors: 1 };

  const { data: existing } = await supabase
    .from("normalized_data")
    .select("raw_id")
    .eq("user_id", userId);

  const existingIds = new Set((existing || []).map((e) => e.raw_id));
  const pending = raws.filter((r) => !existingIds.has(r.id));

  let processed = 0;
  let errors = 0;

  for (const raw of pending) {
    const result = await normalizeRawData(raw.id, userId);
    if ("id" in result) processed++;
    else errors++;
  }

  return { processed, errors };
}
