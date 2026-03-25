import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterAccount {
  id?: string;
  org_id: string;
  service: string;
  account_type?: "organizational" | "shared" | "personal_risk";
  display_name: string;
  login_email: string;
  email_is_personal?: boolean;
  email_owner?: string;
  two_factor_enabled?: boolean;
  two_factor_method?: string;
  recovery_email?: string;
  recovery_codes_stored?: boolean;
  backup_admin_id?: string | null;
  notes?: string;
  risk_level?: string;
  risk_reasons?: string[];
  created_at?: string;
}

interface OffboardingChecklist {
  id?: string;
  org_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  exit_date?: string;
  status?: string;
  items?: OffboardingItem[];
  completed_by?: string;
  verified_by?: string;
  created_at?: string;
}

interface OffboardingItem {
  id: string;
  service: string;
  action: string;
  status: "pending" | "done" | "skipped";
  assigned_to?: string;
  due_date?: string;
  notes?: string;
}

// ─── Risk calculation ─────────────────────────────────────────────────────────

function calculateRisk(account: MasterAccount): { level: string; reasons: string[] } {
  const reasons: string[] = [];

  if (account.email_is_personal) reasons.push("Personlig email — risk vid avslut");
  if (!account.two_factor_enabled) reasons.push("Ingen tvåfaktorsautentisering");
  if (account.two_factor_method === "sms") reasons.push("SMS-2FA är osäkert (SIM-swapping)");
  if (!account.recovery_codes_stored) reasons.push("Återställningskoder ej sparade");
  if (!account.backup_admin_id) reasons.push("Ingen backup-administratör");
  if (!account.recovery_email) reasons.push("Ingen återställningsemail");

  const level =
    reasons.length === 0 ? "low" :
    reasons.length <= 1  ? "medium" :
    reasons.length <= 3  ? "high" :
    "critical";

  return { level, reasons };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// SECURITY FIX (Clawbot): org_id must come from authenticated user context
function getOrgId(req: Request): string | null {
  return (req as any).user?.org_id ?? null;
}

// Auth guard — require authenticated user
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// SECURITY FIX (Clawbot): All account-safety routes require authentication
router.use(requireAuth);

// ─── GET /api/account-safety/master-accounts ─────────────────────────────────

router.get("/master-accounts", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { data, error } = await supabase
    .from("master_accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("service");

  if (error) return res.status(500).json({ error: error.message });

  // Re-calculate risk dynamically (override stored value)
  const withRisk = (data ?? []).map((acc: MasterAccount) => {
    const { level, reasons } = calculateRisk(acc);
    return { ...acc, risk_level: level, risk_reasons: reasons };
  });

  res.json(withRisk);
});

// ─── POST /api/account-safety/master-accounts ────────────────────────────────

router.post("/master-accounts", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const account: MasterAccount = { ...req.body, org_id: orgId };
  const { level, reasons } = calculateRisk(account);
  account.risk_level = level;
  account.risk_reasons = reasons;

  const { data, error } = await supabase
    .from("master_accounts")
    .insert(account)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ─── PATCH /api/account-safety/master-accounts/:id ───────────────────────────

router.patch("/master-accounts/:id", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  // Fetch existing
  const { data: existing, error: fetchErr } = await supabase
    .from("master_accounts")
    .select("*")
    .eq("id", req.params.id)
    .eq("org_id", orgId)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: "Not found" });

  const merged: MasterAccount = { ...existing, ...req.body };
  const { level, reasons } = calculateRisk(merged);
  merged.risk_level = level;
  merged.risk_reasons = reasons;

  const { data, error } = await supabase
    .from("master_accounts")
    .update(merged)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/account-safety/risk-report ─────────────────────────────────────

router.get("/risk-report", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { data, error } = await supabase
    .from("master_accounts")
    .select("*")
    .eq("org_id", orgId);

  if (error) return res.status(500).json({ error: error.message });

  const accounts = (data ?? []).map((acc: MasterAccount) => {
    const { level, reasons } = calculateRisk(acc);
    return { ...acc, risk_level: level, risk_reasons: reasons };
  });

  const report = {
    critical: accounts.filter((a: MasterAccount) => a.risk_level === "critical"),
    high:     accounts.filter((a: MasterAccount) => a.risk_level === "high"),
    medium:   accounts.filter((a: MasterAccount) => a.risk_level === "medium"),
    low:      accounts.filter((a: MasterAccount) => a.risk_level === "low"),
    recommendations: generateRecommendations(accounts),
  };

  res.json(report);
});

function generateRecommendations(accounts: MasterAccount[]): string[] {
  const recs: string[] = [];

  const personalEmails = accounts.filter(a => a.email_is_personal);
  if (personalEmails.length > 0) {
    recs.push(
      `${personalEmails.length} konton är registrerade på personliga emailadresser. ` +
      `Byt till org-email: ${personalEmails.map(a => a.service).join(", ")}.`
    );
  }

  const no2fa = accounts.filter(a => !a.two_factor_enabled);
  if (no2fa.length > 0) {
    recs.push(`Aktivera tvåfaktorsautentisering för: ${no2fa.map(a => a.service).join(", ")}.`);
  }

  const sms2fa = accounts.filter(a => a.two_factor_method === "sms");
  if (sms2fa.length > 0) {
    recs.push(`Byt SMS-2FA till autentiseringsapp eller hårdvarunyckel: ${sms2fa.map(a => a.service).join(", ")}.`);
  }

  const noBackup = accounts.filter(a => !a.backup_admin_id);
  if (noBackup.length > 0) {
    recs.push(`Lägg till backup-administratör för: ${noBackup.map(a => a.service).join(", ")}.`);
  }

  const noCodes = accounts.filter(a => !a.recovery_codes_stored);
  if (noCodes.length > 0) {
    recs.push(`Spara återställningskoder säkert för: ${noCodes.map(a => a.service).join(", ")}.`);
  }

  return recs;
}

// ─── POST /api/account-safety/offboarding ────────────────────────────────────

router.post("/offboarding", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { user_id, user_name, user_email, exit_date } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required" });

  // Fetch master accounts owned by this user
  const { data: ownedAccounts } = await supabase
    .from("master_accounts")
    .select("*")
    .eq("org_id", orgId);

  // Fetch API keys created by this user
  let apiKeys: any[] = [];
  try {
    const { data: keyData } = await supabase
      .from("api_keys")
      .select("*")
      .eq("org_id", orgId)
      .eq("created_by", user_id)
      .eq("is_active", true);
    apiKeys = keyData ?? [];
  } catch {
    apiKeys = [];
  }

  // Generate checklist items
  const items: OffboardingItem[] = [];

  // Items from master accounts
  (ownedAccounts ?? []).forEach((acc: MasterAccount, i: number) => {
    items.push({
      id: `acc-${acc.id ?? i}`,
      service: acc.service,
      action: `Verifiera åtkomst och uppdatera ägare för ${acc.service} (${acc.login_email})`,
      status: "pending",
    });
  });

  // Items from API keys
  apiKeys.forEach((key: any) => {
    items.push({
      id: `key-${key.id}`,
      service: key.service_name ?? "API-nyckel",
      action: `Rotera eller återkalla API-nyckel: ${key.display_name ?? key.id}`,
      status: "pending",
    });
  });

  // Standard offboarding items
  const standardItems: OffboardingItem[] = [
    { id: "std-github",  service: "GitHub",  action: "Ta bort användare från alla GitHub-repos och organisationer", status: "pending" },
    { id: "std-aws",     service: "AWS",     action: "Ta bort IAM-användare och återkalla access keys", status: "pending" },
    { id: "std-email",   service: "E-post",  action: `Arkivera och vidarebefordra email från ${user_email ?? "användaren"}`, status: "pending" },
    { id: "std-slack",   service: "Slack",   action: "Inaktivera Slack-konto och exportera DM-historik", status: "pending" },
    { id: "std-google",  service: "Google",  action: "Spärra Google Workspace-konto, exportera Drive", status: "pending" },
    { id: "std-stripe",  service: "Stripe",  action: "Ta bort teammedlem och uppdatera webhook-kontakter", status: "pending" },
    { id: "std-vercel",  service: "Vercel",  action: "Ta bort teammedlem från Vercel-projekt", status: "pending" },
    { id: "std-1pass",   service: "1Password", action: "Ta bort från 1Password-team och rotera delade lösenord", status: "pending" },
    { id: "std-hr",      service: "HR",      action: "Avsluta anställning i lönesystem och arkivera dokument", status: "pending" },
  ];

  const allItems = [...items, ...standardItems];

  const checklist: OffboardingChecklist = {
    org_id: orgId,
    user_id,
    user_name: user_name ?? user_email ?? user_id,
    user_email,
    exit_date,
    status: "pending",
    items: allItems as any,
  };

  const { data, error } = await supabase
    .from("offboarding_checklists")
    .insert(checklist)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ─── GET /api/account-safety/offboarding/:id ─────────────────────────────────

router.get("/offboarding/:id", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { data, error } = await supabase
    .from("offboarding_checklists")
    .select("*")
    .eq("id", req.params.id)
    .eq("org_id", orgId)
    .single();

  if (error || !data) return res.status(404).json({ error: "Not found" });

  const items: OffboardingItem[] = data.items ?? [];
  const total = items.length;
  const done = items.filter((i: OffboardingItem) => i.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  res.json({ ...data, progress: { total, done, pct } });
});

// ─── PATCH /api/account-safety/offboarding/:id/items/:item_id ────────────────

router.patch("/offboarding/:id/items/:item_id", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { data: existing, error: fetchErr } = await supabase
    .from("offboarding_checklists")
    .select("*")
    .eq("id", req.params.id)
    .eq("org_id", orgId)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: "Not found" });

  const items: OffboardingItem[] = existing.items ?? [];
  const itemIndex = items.findIndex((i: OffboardingItem) => i.id === req.params.item_id);
  if (itemIndex < 0) return res.status(404).json({ error: "Item not found" });

  items[itemIndex] = { ...items[itemIndex], ...req.body };

  // Update overall status
  const allDone = items.every((i: OffboardingItem) => i.status === "done" || i.status === "skipped");
  const anyStarted = items.some((i: OffboardingItem) => i.status !== "pending");
  const newStatus = allDone ? "completed" : anyStarted ? "in_progress" : "pending";

  const { data, error } = await supabase
    .from("offboarding_checklists")
    .update({ items, status: newStatus })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /api/account-safety/offboarding (list) ───────────────────────────────

router.get("/offboarding", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { data, error } = await supabase
    .from("offboarding_checklists")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ─── GET /api/account-safety/recommendations ─────────────────────────────────

router.get("/recommendations", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const { data: accounts, error } = await supabase
    .from("master_accounts")
    .select("*")
    .eq("org_id", orgId);

  if (error) return res.status(500).json({ error: error.message });

  const recs = generateRecommendations(
    (accounts ?? []).map((acc: MasterAccount) => {
      const { level, reasons } = calculateRisk(acc);
      return { ...acc, risk_level: level, risk_reasons: reasons };
    })
  );

  // Check for recently completed offboardings with pending items
  const { data: recentOffboardings } = await supabase
    .from("offboarding_checklists")
    .select("*")
    .eq("org_id", orgId)
    .neq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(5);

  (recentOffboardings ?? []).forEach((ob: OffboardingChecklist) => {
    const items: OffboardingItem[] = (ob.items as any) ?? [];
    const pending = items.filter(i => i.status === "pending").length;
    if (pending > 0) {
      recs.push(
        `Offboarding för ${ob.user_name ?? ob.user_email ?? "okänd"} har ${pending} items kvar att hantera.`
      );
    }
  });

  res.json({ recommendations: recs, count: recs.length });
});

// ─── Demo seed ────────────────────────────────────────────────────────────────

router.post("/demo-seed", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: "org_id required" });

  const demoAccounts: Omit<MasterAccount, "id" | "created_at">[] = [
    {
      org_id: orgId,
      service: "GitHub",
      account_type: "personal_risk",
      display_name: "GitHub Organisation",
      login_email: "erik.svensson@gmail.com",
      email_is_personal: true,
      email_owner: "personal_gmail",
      two_factor_enabled: true,
      two_factor_method: "authenticator",
      recovery_codes_stored: false,
      backup_admin_id: null,
      notes: "Registrerat på grundarens privata Gmail. Behöver migreras till admin@novacode.se",
      risk_level: "high",
      risk_reasons: ["Personlig email — risk vid avslut", "Ingen backup-administratör", "Återställningskoder ej sparade"],
    },
    {
      org_id: orgId,
      service: "AWS",
      account_type: "organizational",
      display_name: "AWS Root Account",
      login_email: "admin@novacode.se",
      email_is_personal: false,
      email_owner: "google_workspace",
      two_factor_enabled: true,
      two_factor_method: "hardware_key",
      recovery_codes_stored: true,
      recovery_email: "admin@novacode.se",
      backup_admin_id: null,
      notes: "Root-kontot — används aldrig i daglig drift. MFA med YubiKey.",
      risk_level: "low",
      risk_reasons: [],
    },
    {
      org_id: orgId,
      service: "Stripe",
      account_type: "personal_risk",
      display_name: "Stripe Betalningar",
      login_email: "erik.svensson@gmail.com",
      email_is_personal: true,
      email_owner: "personal_gmail",
      two_factor_enabled: false,
      two_factor_method: undefined,
      recovery_codes_stored: false,
      backup_admin_id: null,
      notes: "KRITISK — knutet till grundarens privata Gmail utan 2FA",
      risk_level: "critical",
      risk_reasons: ["Personlig email — risk vid avslut", "Ingen tvåfaktorsautentisering", "Ingen backup-administratör", "Återställningskoder ej sparade", "Ingen återställningsemail"],
    },
    {
      org_id: orgId,
      service: "Google Workspace",
      account_type: "organizational",
      display_name: "Super Admin",
      login_email: "admin@novacode.se",
      email_is_personal: false,
      email_owner: "shared_alias",
      two_factor_enabled: true,
      two_factor_method: "authenticator",
      recovery_codes_stored: true,
      recovery_email: "backup-admin@novacode.se",
      backup_admin_id: null,
      notes: "Minst 2 super-admins rekommenderas",
      risk_level: "medium",
      risk_reasons: ["Ingen backup-administratör"],
    },
    {
      org_id: orgId,
      service: "Vercel",
      account_type: "personal_risk",
      display_name: "Vercel Deployment",
      login_email: "jonas.karlsson@gmail.com",
      email_is_personal: true,
      email_owner: "personal_gmail",
      two_factor_enabled: true,
      two_factor_method: "authenticator",
      recovery_codes_stored: false,
      backup_admin_id: null,
      notes: "Jonas slutade 2026-02-15. Kontot behöver migreras omgående.",
      risk_level: "critical",
      risk_reasons: ["Personlig email — risk vid avslut", "Ingen backup-administratör", "Återställningskoder ej sparade"],
    },
    {
      org_id: orgId,
      service: "1Password",
      account_type: "organizational",
      display_name: "Team-vault",
      login_email: "admin@novacode.se",
      email_is_personal: false,
      email_owner: "google_workspace",
      two_factor_enabled: true,
      two_factor_method: "hardware_key",
      recovery_codes_stored: true,
      recovery_email: "admin@novacode.se",
      backup_admin_id: null,
      notes: "Org-ägd. Säkerhetskopiera Emergency Kit offline.",
      risk_level: "medium",
      risk_reasons: ["Ingen backup-administratör"],
    },
  ];

  const { data, error } = await supabase
    .from("master_accounts")
    .upsert(demoAccounts, { onConflict: "org_id,service" })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ seeded: data?.length ?? 0, accounts: data });
});

export default router;
