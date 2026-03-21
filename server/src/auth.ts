import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

const router = Router();

// ─────────────────────────────────────────────
// POST /api/auth/login  — email + password
// ─────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return res.status(401).json({ error: error?.message ?? "Login failed" });
  }

  const { session, user } = data;

  // Hämta extra info från users-tabellen
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, org_id, role, full_name")
    .eq("auth_id", user.id)
    .maybeSingle();

  const userPayload = {
    id: dbUser?.id ?? user.id,
    email: user.email,
    role: dbUser?.role ?? "ADMIN",
    org_id: dbUser?.org_id ?? null,
    full_name: dbUser?.full_name ?? null,
  };

  // Sätt HttpOnly-cookie
  res.cookie("pixdrift_session", session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7 * 1000, // 7 dagar
    path: "/",
  });

  return res.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: userPayload,
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/magic-link
// ─────────────────────────────────────────────
router.post("/magic-link", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo:
        process.env.MAGIC_LINK_REDIRECT ?? "https://workstation.bc.pixdrift.com",
    },
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: "Check your email" });
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post("/logout", async (_req: Request, res: Response) => {
  await supabase.auth.signOut();
  res.clearCookie("pixdrift_session", { path: "/" });
  return res.json({ success: true });
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get("/me", async (req: Request, res: Response) => {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (req as any).cookies?.pixdrift_session;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ error: "Invalid or expired token" });

  const { user: authUser } = data;

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, org_id, role, full_name")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  return res.json({
    user: {
      id: dbUser?.id ?? authUser.id,
      email: authUser.email,
      role: dbUser?.role ?? "ADMIN",
      org_id: dbUser?.org_id ?? null,
      full_name: dbUser?.full_name ?? null,
    },
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────
router.post("/refresh", async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token)
    return res.status(400).json({ error: "refresh_token required" });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error || !data.session)
    return res.status(401).json({ error: error?.message ?? "Refresh failed" });

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, full_name, org_name } = req.body;
  if (!email || !password || !full_name || !org_name)
    return res.status(400).json({ error: "email, password, full_name and org_name required" });

  // 1. Skapa Supabase-användare
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError || !authData.user)
    return res.status(400).json({ error: authError?.message ?? "Signup failed" });

  const authUserId = authData.user.id;

  // 2. Skapa organisation
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: org_name })
    .select()
    .single();

  if (orgError) {
    console.error("Org creation failed:", orgError.message);
    return res.status(500).json({ error: "Failed to create organization" });
  }

  // 3. Skapa user-rad kopplad till org
  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .insert({
      auth_id: authUserId,
      email,
      full_name,
      org_id: org.id,
      role: "ADMIN",
    })
    .select()
    .single();

  if (userError) {
    console.error("User creation failed:", userError.message);
    return res.status(500).json({ error: "Failed to create user record" });
  }

  // Returnera session om den finns (e-post ej bekräftad ger null session)
  const session = authData.session;

  return res.status(201).json({
    access_token: session?.access_token ?? null,
    user: {
      id: dbUser.id,
      email,
      full_name,
      role: "ADMIN",
      org_id: org.id,
    },
    org: { id: org.id, name: org.name },
  });
});

// ─────────────────────────────────────────────
// Auth middleware — exporteras för övriga routes
// ─────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (req as any).cookies?.pixdrift_session;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user)
      return res.status(401).json({ error: "Invalid token" });
    // Lägg på req.user om det inte redan satts av global middleware
    if (!(req as any).user) {
      (req as any).user = { id: data.user.id, email: data.user.email };
    }
    next();
  });
}

export default router;
