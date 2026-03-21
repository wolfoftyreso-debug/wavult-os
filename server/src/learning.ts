/**
 * Learning & Knowledge Module — Express Router
 * Endpoints: playbooks, articles, courses, quizzes, progress, certificates, certifications, AI-ask
 */
import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────
const getUser = (req: Request) => (req as any).user;
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json(data);
const err = (res: Response, msg: string, status = 400) => res.status(status).json({ error: msg });

// ════════════════════════════════════════════════════════════════════════════
// PLAYBOOKS
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/playbooks
router.post("/playbooks", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { title, description, category, process_id } = req.body;
  if (!title) return err(res, "title krävs");

  const { data, error } = await supabase
    .from("playbooks")
    .insert({
      org_id: user?.org_id,
      title,
      description,
      category,
      process_id: process_id || null,
      created_by: user?.id,
      status: "draft",
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// GET /api/learning/playbooks
router.get("/playbooks", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { category, process_id, status } = req.query;

  let query = supabase
    .from("playbooks")
    .select("*, playbook_steps(count)")
    .order("created_at", { ascending: false });

  if (user?.org_id) query = query.eq("org_id", user.org_id);
  if (category) query = query.eq("category", category as string);
  if (process_id) query = query.eq("process_id", process_id as string);
  if (status) query = query.eq("status", status as string);

  const { data, error } = await query;
  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// GET /api/learning/playbooks/:id
router.get("/playbooks/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("playbooks")
    .select("*, playbook_steps(*)")
    .eq("id", req.params.id)
    .order("step_number", { foreignTable: "playbook_steps", ascending: true })
    .single();

  if (error) return err(res, error.message, 404);
  return ok(res, data);
});

// PUT /api/learning/playbooks/:id
router.put("/playbooks/:id", async (req: Request, res: Response) => {
  const { title, description, category, process_id, steps } = req.body;

  const { data, error } = await supabase
    .from("playbooks")
    .update({ title, description, category, process_id: process_id || null, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return err(res, error.message);

  // Replace steps if provided
  if (steps && Array.isArray(steps)) {
    await supabase.from("playbook_steps").delete().eq("playbook_id", req.params.id);
    const stepsToInsert = steps.map((s: any, i: number) => ({
      playbook_id: req.params.id,
      step_number: i + 1,
      title: s.title,
      content: s.content,
      media_url: s.media_url || null,
      estimated_minutes: s.estimated_minutes || 5,
      required: s.required !== false,
    }));
    await supabase.from("playbook_steps").insert(stepsToInsert);
  }

  return ok(res, data);
});

// DELETE /api/learning/playbooks/:id
router.delete("/playbooks/:id", async (req: Request, res: Response) => {
  const { error } = await supabase.from("playbooks").delete().eq("id", req.params.id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// POST /api/learning/playbooks/:id/publish
router.post("/playbooks/:id/publish", async (req: Request, res: Response) => {
  const { data: current } = await supabase
    .from("playbooks")
    .select("version")
    .eq("id", req.params.id)
    .single();

  const { data, error } = await supabase
    .from("playbooks")
    .update({
      status: "published",
      version: (current?.version || 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data);
});

// ════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE ARTICLES
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/articles
router.post("/articles", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { title, content, category, tags } = req.body;
  if (!title) return err(res, "title krävs");

  const { data, error } = await supabase
    .from("knowledge_articles")
    .insert({
      org_id: user?.org_id,
      title,
      content,
      category,
      tags: tags || [],
      author_id: user?.id,
      status: "published",
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// GET /api/learning/articles
router.get("/articles", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { q, category, status } = req.query;

  let query = supabase
    .from("knowledge_articles")
    .select("id, title, category, tags, author_id, version, status, views, helpful_votes, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (user?.org_id) query = query.eq("org_id", user.org_id);
  if (category) query = query.eq("category", category as string);
  if (status) query = query.eq("status", status as string);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// GET /api/learning/articles/:id
router.get("/articles/:id", async (req: Request, res: Response) => {
  // Increment view count
  await supabase.rpc("increment_article_views", { article_id: req.params.id }).catch(() => {
    // RPC may not exist yet — silent fail
  });

  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return err(res, error.message, 404);

  // Increment views manually as fallback
  await supabase
    .from("knowledge_articles")
    .update({ views: (data.views || 0) + 1 })
    .eq("id", req.params.id);

  return ok(res, data);
});

// PUT /api/learning/articles/:id
router.put("/articles/:id", async (req: Request, res: Response) => {
  const { title, content, category, tags, status } = req.body;

  const { data: current } = await supabase
    .from("knowledge_articles")
    .select("version")
    .eq("id", req.params.id)
    .single();

  const { data, error } = await supabase
    .from("knowledge_articles")
    .update({
      title,
      content,
      category,
      tags: tags || [],
      status,
      version: (current?.version || 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data);
});

// GET /api/learning/articles/:id/versions
router.get("/articles/:id/versions", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id, title, version, updated_at, author_id, status")
    .eq("id", req.params.id)
    .single();

  if (error) return err(res, error.message, 404);
  // Return version info (extend with article_versions table if needed later)
  return ok(res, { current: data, versions: [{ version: data.version, updated_at: data.updated_at }] });
});

// POST /api/learning/articles/:id/vote
router.post("/articles/:id/vote", async (req: Request, res: Response) => {
  const { helpful } = req.body;
  const { data: current } = await supabase
    .from("knowledge_articles")
    .select("helpful_votes")
    .eq("id", req.params.id)
    .single();

  if (helpful) {
    await supabase
      .from("knowledge_articles")
      .update({ helpful_votes: (current?.helpful_votes || 0) + 1 })
      .eq("id", req.params.id);
  }
  return ok(res, { recorded: true });
});

// ════════════════════════════════════════════════════════════════════════════
// COURSES & MODULES
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/courses
router.post("/courses", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { title, description, thumbnail_url, duration_minutes, difficulty, required_for_roles, passing_score } = req.body;
  if (!title) return err(res, "title krävs");

  const { data, error } = await supabase
    .from("courses")
    .insert({
      org_id: user?.org_id,
      title,
      description,
      thumbnail_url,
      duration_minutes,
      difficulty: difficulty || "beginner",
      required_for_roles: required_for_roles || [],
      passing_score: passing_score || 80,
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// GET /api/learning/courses
router.get("/courses", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { difficulty } = req.query;

  let query = supabase
    .from("courses")
    .select("*, course_modules(count)")
    .order("created_at", { ascending: false });

  if (user?.org_id) query = query.eq("org_id", user.org_id);
  if (difficulty) query = query.eq("difficulty", difficulty as string);

  const { data, error } = await query;
  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// GET /api/learning/courses/:id
router.get("/courses/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("courses")
    .select("*, course_modules(*)")
    .eq("id", req.params.id)
    .order("module_number", { foreignTable: "course_modules", ascending: true })
    .single();

  if (error) return err(res, error.message, 404);
  return ok(res, data);
});

// POST /api/learning/courses/:id/enroll
router.post("/courses/:id/enroll", async (req: Request, res: Response) => {
  const user = getUser(req);
  const userId = req.body.user_id || user?.id;

  // Check if already enrolled
  const { data: existing } = await supabase
    .from("learning_progress")
    .select("id, status")
    .eq("user_id", userId)
    .eq("content_id", req.params.id)
    .eq("content_type", "course")
    .single();

  if (existing) return ok(res, { enrolled: true, progress: existing });

  const { data, error } = await supabase
    .from("learning_progress")
    .insert({
      user_id: userId,
      org_id: user?.org_id,
      content_type: "course",
      content_id: req.params.id,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, { enrolled: true, progress: data }, 201);
});

// GET /api/learning/courses/:id/progress
router.get("/courses/:id/progress", async (req: Request, res: Response) => {
  const user = getUser(req);

  const { data, error } = await supabase
    .from("learning_progress")
    .select("*, users(full_name, role)")
    .eq("content_id", req.params.id)
    .eq("content_type", "course");

  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// ════════════════════════════════════════════════════════════════════════════
// QUIZ & BEDÖMNING
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/quizzes
router.post("/quizzes", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { title, questions, passing_score, time_limit_minutes } = req.body;
  if (!title || !questions) return err(res, "title och questions krävs");

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      org_id: user?.org_id,
      title,
      questions,
      passing_score: passing_score || 80,
      time_limit_minutes,
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// POST /api/learning/quizzes/:id/attempt
router.post("/quizzes/:id/attempt", async (req: Request, res: Response) => {
  const user = getUser(req);

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("id, title, questions, passing_score, time_limit_minutes")
    .eq("id", req.params.id)
    .single();

  if (error) return err(res, "Quiz hittades inte", 404);

  // Return quiz without correct_index (so client can't cheat)
  const sanitizedQuestions = (quiz.questions as any[]).map((q: any) => ({
    question: q.question,
    options: q.options,
    // Do NOT expose correct_index
  }));

  return ok(res, {
    quiz_id: quiz.id,
    title: quiz.title,
    questions: sanitizedQuestions,
    passing_score: quiz.passing_score,
    time_limit_minutes: quiz.time_limit_minutes,
    started_at: new Date().toISOString(),
  });
});

// POST /api/learning/quizzes/:id/submit
router.post("/quizzes/:id/submit", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { answers, time_spent_minutes } = req.body; // answers: number[]

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return err(res, "Quiz hittades inte", 404);

  const questions = quiz.questions as any[];
  let correct = 0;
  const results = questions.map((q: any, i: number) => {
    const userAnswer = answers?.[i];
    const isCorrect = userAnswer === q.correct_index;
    if (isCorrect) correct++;
    return {
      question: q.question,
      user_answer: userAnswer,
      correct_index: q.correct_index,
      correct: isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= quiz.passing_score;

  // Record progress
  await supabase.from("learning_progress").insert({
    user_id: user?.id,
    org_id: user?.org_id,
    content_type: "quiz",
    content_id: req.params.id,
    status: passed ? "completed" : "failed",
    score,
    completed_at: new Date().toISOString(),
    time_spent_minutes: time_spent_minutes || 0,
  });

  return ok(res, { score, passed, correct, total: questions.length, results });
});

// GET /api/learning/quizzes/:id/results
router.get("/quizzes/:id/results", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("learning_progress")
    .select("user_id, score, status, completed_at, time_spent_minutes, users(full_name)")
    .eq("content_id", req.params.id)
    .eq("content_type", "quiz")
    .order("completed_at", { ascending: false });

  if (error) return err(res, error.message);

  const rows = data || [];
  const passed = rows.filter((r: any) => r.status === "completed");
  const avgScore = rows.length > 0 ? Math.round(rows.reduce((s: number, r: any) => s + (r.score || 0), 0) / rows.length) : 0;

  return ok(res, { attempts: rows.length, passed: passed.length, avg_score: avgScore, results: rows });
});

// ════════════════════════════════════════════════════════════════════════════
// UTBILDNINGSSPÅRNING
// ════════════════════════════════════════════════════════════════════════════

// GET /api/learning/progress/:userId
router.get("/progress/:userId", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", req.params.userId)
    .order("created_at", { ascending: false });

  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// GET /api/learning/team-progress
router.get("/team-progress", async (req: Request, res: Response) => {
  const user = getUser(req);

  const { data, error } = await supabase
    .from("learning_progress")
    .select("*, users(full_name, role)")
    .eq("org_id", user?.org_id || "")
    .order("created_at", { ascending: false });

  if (error) return err(res, error.message);

  // Group by user
  const byUser: Record<string, any> = {};
  for (const row of (data || [])) {
    const uid = row.user_id;
    if (!byUser[uid]) {
      byUser[uid] = { user_id: uid, full_name: (row as any).users?.full_name, role: (row as any).users?.role, completed: 0, in_progress: 0, total_time: 0 };
    }
    if (row.status === "completed") byUser[uid].completed++;
    if (row.status === "in_progress") byUser[uid].in_progress++;
    byUser[uid].total_time += row.time_spent_minutes || 0;
  }

  return ok(res, { team: Object.values(byUser), raw: data });
});

// POST /api/learning/completions
router.post("/completions", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { content_type, content_id, score, time_spent_minutes } = req.body;
  if (!content_type || !content_id) return err(res, "content_type och content_id krävs");

  const { data, error } = await supabase
    .from("learning_progress")
    .upsert({
      user_id: user?.id,
      org_id: user?.org_id,
      content_type,
      content_id,
      status: "completed",
      score: score || null,
      completed_at: new Date().toISOString(),
      time_spent_minutes: time_spent_minutes || 0,
    }, { onConflict: "user_id,content_type,content_id" })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// GET /api/learning/certificates
router.get("/certificates", async (req: Request, res: Response) => {
  const user = getUser(req);
  const userId = (req.query.user_id as string) || user?.id;

  const { data, error } = await supabase
    .from("learning_certificates")
    .select("*, courses(title)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });

  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// POST /api/learning/certificates/generate
router.post("/certificates/generate", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { course_id, user_id, expires_in_days } = req.body;
  if (!course_id) return err(res, "course_id krävs");

  const targetUserId = user_id || user?.id;
  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : null;

  // Generate placeholder certificate URL
  const certUrl = `https://api.bc.pixdrift.com/certificates/${targetUserId}/${course_id}/cert.pdf`;

  const { data, error } = await supabase
    .from("learning_certificates")
    .insert({
      user_id: targetUserId,
      org_id: user?.org_id,
      course_id,
      expires_at: expiresAt,
      certificate_url: certUrl,
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// ════════════════════════════════════════════════════════════════════════════
// EXTERNA CERTIFIERINGAR
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/certifications
router.post("/certifications", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { name, issuer, issued_date, expiry_date, certificate_number, document_url } = req.body;
  if (!name) return err(res, "name krävs");

  const { data, error } = await supabase
    .from("external_certifications")
    .insert({
      user_id: user?.id,
      org_id: user?.org_id,
      name,
      issuer,
      issued_date,
      expiry_date,
      certificate_number,
      document_url,
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// GET /api/learning/certifications
router.get("/certifications", async (req: Request, res: Response) => {
  const user = getUser(req);
  const userId = (req.query.user_id as string) || user?.id;

  let query = supabase
    .from("external_certifications")
    .select("*")
    .order("expiry_date", { ascending: true });

  if (userId) query = query.eq("user_id", userId);
  else if (user?.org_id) query = query.eq("org_id", user.org_id);

  const { data, error } = await query;
  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// GET /api/learning/certifications/expiring
router.get("/certifications/expiring", async (req: Request, res: Response) => {
  const user = getUser(req);
  const daysAhead = parseInt(req.query.days as string) || 30;
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("external_certifications")
    .select("*, users(full_name, role)")
    .gte("expiry_date", today)
    .lte("expiry_date", cutoff)
    .order("expiry_date", { ascending: true });

  if (user?.org_id) query = query.eq("org_id", user.org_id);

  const { data, error } = await query;
  if (error) return err(res, error.message);
  return ok(res, data || []);
});

// ════════════════════════════════════════════════════════════════════════════
// AI ASSISTENT (PLACEHOLDER)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/ask
router.post("/ask", async (req: Request, res: Response) => {
  const user = getUser(req);
  const { question, context } = req.body;
  if (!question) return err(res, "question krävs");

  const q = question.toLowerCase();

  // Full-text search i articles
  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("id, title, content, category, updated_at")
    .ilike("content", `%${q.split(" ").slice(0, 3).join("%")}%`)
    .eq("status", "published")
    .limit(3);

  // Full-text search i playbooks
  const { data: playbooks } = await supabase
    .from("playbooks")
    .select("id, title, description, category")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .eq("status", "published")
    .limit(3);

  const sources: any[] = [];

  for (const a of articles || []) {
    const snippet = (a.content || "").substring(0, 300) + "...";
    sources.push({ type: "article", id: a.id, title: a.title, snippet, category: a.category, updated_at: a.updated_at });
  }

  for (const p of playbooks || []) {
    sources.push({ type: "playbook", id: p.id, title: p.title, snippet: p.description || "", category: p.category });
  }

  return ok(res, {
    question,
    sources,
    answer: sources.length > 0
      ? `Hittade ${sources.length} relevanta källor. Se nedan för detaljer. (AI-svar aktiveras vid LLM-integration.)`
      : "Ingen matchande information hittades i kunskapsbasen.",
    llm_ready: true,
    llm_hint: "Inject sources into LLM prompt for RAG-based answer generation.",
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PLAYBOOK STEPS (fristående endpoints)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/learning/playbooks/:id/steps
router.post("/playbooks/:id/steps", async (req: Request, res: Response) => {
  const { step_number, title, content, media_url, estimated_minutes, required } = req.body;

  const { data, error } = await supabase
    .from("playbook_steps")
    .insert({
      playbook_id: req.params.id,
      step_number,
      title,
      content,
      media_url,
      estimated_minutes: estimated_minutes || 5,
      required: required !== false,
    })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// POST /api/learning/courses/:id/modules
router.post("/courses/:id/modules", async (req: Request, res: Response) => {
  const { module_number, title, content_type, content_id, duration_minutes } = req.body;

  const { data, error } = await supabase
    .from("course_modules")
    .insert({ course_id: req.params.id, module_number, title, content_type, content_id, duration_minutes })
    .select()
    .single();

  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

export default router;
