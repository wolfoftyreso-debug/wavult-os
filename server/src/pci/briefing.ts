// ═══════════════════════════════════════════════════════════════════════════════
// PCI — Briefing Engine
// ═══════════════════════════════════════════════════════════════════════════════
// Generates daily briefing: text (max 200 words) + audio (AWS Polly TTS).
// Also handles "What should I do now?" command.

import { supabase } from "../supabase";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoredTask {
  id: string;
  normalized_id: string;
  summary: string;
  type: string;
  urgency: number;
  priority_score: number;
  entities: string[];
}

interface BriefingResult {
  text: string;
  audio_url: string | null;
  task_ids: string[];
}

// ─── Task scoring ────────────────────────────────────────────────────────────

function scoreTask(
  norm: { type: string; urgency: number; summary: string; entities: string[] },
  energy: number
): number {
  let score = norm.urgency * 0.4;

  // Type weight
  if (norm.type === "decision") score += 0.25;
  else if (norm.type === "task") score += 0.2;
  else score += 0.1;

  // Energy fit: decisions need high energy
  const energyNorm = (energy - 1) / 4; // 0-1
  if (norm.type === "decision" && energyNorm < 0.4) score -= 0.15;
  if (norm.type === "info" && energyNorm < 0.4) score += 0.05;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

// ─── Generate briefing text ──────────────────────────────────────────────────

function generateBriefingText(
  tasks: ScoredTask[],
  energy: number,
  date: string
): string {
  const top3 = tasks.slice(0, 3);
  const energyLabel =
    energy >= 4 ? "high" : energy >= 3 ? "moderate" : "low";

  let text = `Briefing for ${date}. Energy level: ${energyLabel}.\n\n`;

  if (top3.length === 0) {
    text += "No pending items. All clear.";
    return text;
  }

  text += `You have ${tasks.length} item${tasks.length === 1 ? "" : "s"}. Top priorities:\n\n`;

  top3.forEach((t, i) => {
    const typeLabel = t.type === "decision" ? "DECISION" : t.type === "task" ? "TASK" : "INFO";
    text += `${i + 1}. [${typeLabel}] ${t.summary}`;
    if (t.entities.length > 0) text += ` (${t.entities.join(", ")})`;
    text += "\n";
  });

  if (energy <= 2) {
    text += "\nEnergy is low. Consider starting with the easiest item.";
  } else if (energy >= 4) {
    text += "\nEnergy is high. Good time for decisions.";
  }

  return text.trim();
}

// ─── TTS via AWS Polly ───────────────────────────────────────────────────────

async function generateAudio(
  text: string,
  userId: string,
  date: string
): Promise<string | null> {
  const region = process.env.AWS_REGION || "eu-north-1";
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) return null;

  try {
    // Dynamic import to avoid breaking if AWS SDK not fully configured
    const { PollyClient, SynthesizeSpeechCommand } = await import(
      "@aws-sdk/client-polly"
    );

    const polly = new PollyClient({ region });
    const pollyCmd = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: "Joanna", // Calm, neutral
      Engine: "neural",
    });

    const pollyRes = await polly.send(pollyCmd);

    if (!pollyRes.AudioStream) return null;

    // Read stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = pollyRes.AudioStream as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Upload to S3
    const s3 = new S3Client({ region });
    const key = `briefings/${userId}/${date}.mp3`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
      })
    );

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (err) {
    console.warn("[PCI] Audio generation failed:", err);
    return null;
  }
}

// ─── Main: Generate daily briefing ───────────────────────────────────────────

export async function generateDailyBriefing(
  userId: string
): Promise<BriefingResult | { error: string }> {
  const today = new Date().toISOString().split("T")[0];

  // Get energy level
  const { data: state } = await supabase
    .from("user_state")
    .select("energy")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  const energy = state?.energy || 3; // Default to moderate

  // Get normalized data (last 48h, not yet in tasks)
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: norms } = await supabase
    .from("normalized_data")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (!norms || norms.length === 0) {
    const text = `Briefing for ${today}. No new items. All clear.`;
    const audioUrl = await generateAudio(text, userId, today);

    await supabase.from("briefings").upsert(
      { user_id: userId, date: today, text, audio_url: audioUrl, task_ids: [] },
      { onConflict: "user_id,date" }
    );

    return { text, audio_url: audioUrl, task_ids: [] };
  }

  // Score and rank
  const scored: ScoredTask[] = norms.map((n) => ({
    id: `task-${n.id}`,
    normalized_id: n.id,
    summary: n.summary,
    type: n.type,
    urgency: n.urgency,
    priority_score: scoreTask(n, energy),
    entities: n.entities || [],
  }));

  scored.sort((a, b) => b.priority_score - a.priority_score);

  // Store tasks
  for (const t of scored) {
    await supabase.from("tasks").upsert(
      {
        normalized_id: t.normalized_id,
        user_id: userId,
        priority_score: t.priority_score,
        status: "pending",
      },
      { onConflict: "normalized_id" }
    ).select();
  }

  // Generate text
  const text = generateBriefingText(scored, energy, today);

  // Generate audio
  const audioUrl = await generateAudio(text, userId, today);

  // Store briefing
  const taskIds = scored.slice(0, 3).map((t) => t.normalized_id);
  await supabase.from("briefings").upsert(
    { user_id: userId, date: today, text, audio_url: audioUrl, task_ids: taskIds },
    { onConflict: "user_id,date" }
  );

  return { text, audio_url: audioUrl, task_ids: taskIds };
}

// ─── Command: "What should I do now?" ────────────────────────────────────────

export async function whatShouldIDoNow(
  userId: string
): Promise<{ tasks: { summary: string; type: string; urgency: number; reason: string }[]; text: string }> {
  // Get today's energy
  const today = new Date().toISOString().split("T")[0];
  const { data: state } = await supabase
    .from("user_state")
    .select("energy")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  const energy = state?.energy || 3;
  const energyNorm = (energy - 1) / 4;

  // Get pending tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, normalized_data(*)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("priority_score", { ascending: false })
    .limit(10);

  if (!tasks || tasks.length === 0) {
    return {
      tasks: [],
      text: "Nothing pending. All clear.",
    };
  }

  const top3 = tasks.slice(0, 3).map((t) => {
    const n = t.normalized_data;
    let reason = "";
    if (n.urgency > 0.7) reason = "High urgency";
    else if (n.type === "decision" && energyNorm > 0.5) reason = "Good energy for decisions";
    else if (n.type === "task") reason = "Pending task";
    else reason = "Queued";

    return {
      summary: n.summary,
      type: n.type,
      urgency: n.urgency,
      reason,
    };
  });

  const text = top3
    .map((t, i) => `${i + 1}. ${t.summary} — ${t.reason}`)
    .join("\n");

  return { tasks: top3, text };
}
