import "dotenv/config";
import { validateEnv } from "./config/env";
validateEnv();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { supabase, checkSupabaseConnectivity, isSupabaseFallback } from "./supabase";
import { errorHandler, ValidationError, NotFoundError, AuthorizationError, ForbiddenError } from "./shared/middleware/error-handler";
import { validate } from "./shared/validation/middleware";
import {
  CreateTaskExecutionSchema,
  AdvanceTaskSchema,
  OverrideTaskSchema,
  CreateQueueSchema,
} from "./shared/validation/schemas";

// ---------------------------------------------------------------------------
// Router imports - each module exposes an Express Router
// ---------------------------------------------------------------------------
import executionRouter from "./execution";
import capabilityRouter from "./capability";
import processRouter from "./process";
import currencyRouter from "./currency";
import reportsRouter from "./reports";
import assetManagementRouter from "./asset-management";
import customerQualityRouter from "./customer-quality";
import deputiesRouter from "./deputies";
import supplierManagementRouter from "./supplier-management";
import calibrationImportRouter from "./calibration-import";
import agreementsRouter from "./agreements";
import subcontractorsRouter from "./subcontractors";
import capacityEngineRouter from "./capacity-engine";
import metricsRouter from "./metrics";
import qualityGatesRouter from "./quality-gates";
import qualityControlRouter from "./quality-control-api";
import decisionIntelligenceRouter from "./decision-intelligence";

// ---------------------------------------------------------------------------
// Previously unregistered routers
// ---------------------------------------------------------------------------
import managementReviewRouter from "./management-review";
import strategicReviewRouter from "./strategic-review-api";
import orgAdminRouter from "./org-admin";
import accountSafetyRouter from "./account-safety";
import systemAdminRouter from "./system-admin";
import permissionsAdminRouter from "./permissions-admin";
import localizationRouter from "./localization-api";
import legalReviewRouter from "./legal-review";
import personnelRouter from "./personnel-api";
import auditWorkspaceRouter from "./audit-workspace";
import integrationRouter from "./integrations/integration-api";
import stripeRouter from "./stripe";
import notificationsRouter from "./notifications";
import { billingWebhookRouter } from './billing-webhook';
import { billingRouter } from './billing-api';
import checkinRouter from "./checkin-api";
import learningRouter from "./learning";
import seoRouter from "./seo";
import bankingRouter from "./banking";
import spaghettiRouter from "./spaghetti";
import spatialRouter from "./spatial-flow";
import consumablesRouter from "./consumables";
import { scheduleAutoConsume } from "./jobs/consumables-auto-consume";
import cultureRouter from "./culture-engine";
import peopleOSRouter from "./people-os";

// ---------------------------------------------------------------------------
// Customer Interaction Engine
// ---------------------------------------------------------------------------
import brandRouter from "./brand-layer";
import paymentOrchestrationRouter from "./payment-orchestration";
import customerStateRouter from "./customer-state";
import customerPortalRouter from "./customer-portal";
import revolutRouter from "./revolut";

// ---------------------------------------------------------------------------
// Auth router
// ---------------------------------------------------------------------------
import authRouter from "./auth";

// ---------------------------------------------------------------------------
// DMS — Dealer Management System (pixdrift automotive)
// ---------------------------------------------------------------------------
import vehiclesRouter from "./vehicles";
import externalAuditsRouter from "./external-audits";
import controlLayerRouter from "./control-layer";
import workshopRouter from "./workshop";
import workshopStateMachineRouter from "./state-machine-workshop";
import checklistEngineRouter from "./checklist-engine";
import partsRouter from "./parts";
import vehicleSalesRouter from "./vehicle-sales";
import automotiveCrmRouter from "./automotive-crm";
import rentalRouter from "./rental-engine";
import oemRouter from "./integrations/oem";
import bookingEngineRouter from "./booking-engine-api";

// ---------------------------------------------------------------------------
// PIX Intelligence + Workflow Engine (Palantir-depth for €499/month)
// ---------------------------------------------------------------------------
import intelligenceRouter from "./intelligence-api";
import workflowEngineRouter from "./workflow-engine";

// ---------------------------------------------------------------------------
// Tax Compliance imports (SFL + ML + BFL)
// ---------------------------------------------------------------------------
import personnelLedgerRouter from "./personnel-ledger";
import cashRegisterRouter from "./cash-register";
import vatComplianceRouter from "./vat-compliance";
import payrollComplianceRouter from "./payroll-compliance";
import complianceCheckerRouter from "./compliance-checker";
import assetAccountabilityRouter from "./asset-accountability";

// ---------------------------------------------------------------------------
// Certified Core imports
// ---------------------------------------------------------------------------
import { eventsRouter } from "./events";
import stateMachineRouter from "./state-machine";
import { stateMachine } from "./state-machine";
import { registerSubscribers } from "./subscribers";

import evaBotRouter from './eva-bot';
import slaEngineRouter, { startSLAChecker } from './sla-engine';
import duixProxyRouter from './duix-proxy';
import pciRouter from './pci/router';

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});
// CORS — support both legacy pixdrift.com origins and the live *.bc.pixdrift.com subdomains.
// CORS_ORIGIN env can be a comma-separated list of allowed origins.
// Fix 2026-03-21: Added *.bc.pixdrift.com which hosts the actual production frontends.
const corsOrigins: string[] = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Always include the known production app origins as fallback
const DEFAULT_ORIGINS = [
  "https://pixdrift.com",
  "https://app.bc.pixdrift.com",
  "https://admin.bc.pixdrift.com",
  "https://crm.bc.pixdrift.com",
  "https://sales.bc.pixdrift.com",
  "https://workstation.pixdrift.com",
  "https://admin.pixdrift.com",
  "https://crm.pixdrift.com",
  "https://sales.pixdrift.com",
];
const allowedOrigins = corsOrigins.length > 0
  ? [...new Set([...corsOrigins, ...DEFAULT_ORIGINS])]
  : (process.env.NODE_ENV === "production" ? DEFAULT_ORIGINS : ["*"]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, origin); // returnera specifik origin, inte true
      }
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// i18n / Accept-Language middleware
// ---------------------------------------------------------------------------
const SUPPORTED_LOCALES = ['sv', 'en', 'de', 'no', 'da', 'fi'];

const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  sv: {
    notFound: 'Resursen hittades inte',
    rateLimit: 'För många förfrågningar, försök igen senare',
    serverError: 'Internt serverfel',
    unauthorized: 'Du har inte behörighet',
  },
  en: {
    notFound: 'Resource not found',
    rateLimit: 'Too many requests, please try again later',
    serverError: 'Internal server error',
    unauthorized: 'Unauthorized',
  },
  de: {
    notFound: 'Ressource nicht gefunden',
    rateLimit: 'Zu viele Anfragen, bitte später erneut versuchen',
    serverError: 'Interner Serverfehler',
    unauthorized: 'Nicht autorisiert',
  },
  no: {
    notFound: 'Ressursen ble ikke funnet',
    rateLimit: 'For mange forespørsler, prøv igjen senere',
    serverError: 'Intern serverfeil',
    unauthorized: 'Ikke autorisert',
  },
  da: {
    notFound: 'Ressourcen blev ikke fundet',
    rateLimit: 'For mange forespørgsler, prøv igen senere',
    serverError: 'Intern serverfejl',
    unauthorized: 'Ikke autoriseret',
  },
  fi: {
    notFound: 'Resurssia ei löydy',
    rateLimit: 'Liian monta pyyntöä, yritä myöhemmin uudelleen',
    serverError: 'Sisäinen palvelinvirhe',
    unauthorized: 'Ei valtuutusta',
  },
};

// Extend Express Request type with locale
declare global {
  namespace Express {
    interface Request {
      locale: string;
    }
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const acceptLanguage = (req.headers['accept-language'] as string) || 'sv';
  const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
  req.locale = SUPPORTED_LOCALES.includes(lang) ? lang : 'sv';
  res.setHeader('Content-Language', req.locale);
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req: Request) => ({
    error: ERROR_MESSAGES[req.locale]?.rateLimit ?? ERROR_MESSAGES.sv.rateLimit,
  }),
});
app.use(limiter);

// Eva bot (public — no auth required for Telegram webhook)
app.use('/api/eva-bot', evaBotRouter);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${_res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// ---------------------------------------------------------------------------
// Auth routes — public, MUST be before global auth middleware
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);

// ---------------------------------------------------------------------------
// Duix proxy — public (token is server-side only)
// ---------------------------------------------------------------------------
app.use("/api/duix", duixProxyRouter);

// ---------------------------------------------------------------------------
// PCI — Personal Cognitive Interface
// ---------------------------------------------------------------------------
app.use("/api/pci", pciRouter);

// ---------------------------------------------------------------------------
// Health check — MUST be before auth middleware so it's always public
// Enterprise-grade: checks actual service connectivity
// ---------------------------------------------------------------------------
// Status dashboard — public, no auth
import { getStatusDashboardHTML } from './status-dashboard';
app.get("/status", (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getStatusDashboardHTML(req));
});

// Status probe — checks external URLs for the dashboard
app.get("/api/status-probe", async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url || !url.startsWith('https://')) {
    return res.status(400).json({ ok: false, error: 'invalid url' });
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    res.json({ ok: r.ok, status: r.status });
  } catch (e: any) {
    res.json({ ok: false, error: String(e?.message ?? e) });
  }
});

// Subscribe endpoint — saves to a simple JSON log
import fs from 'fs';
import path from 'path';
app.post("/api/subscribe", (req: Request, res: Response) => {
  const { name, email, source } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const file = path.join('/tmp', 'hypbit-subscribers.json');
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    existing.push({ name, email, source, ts: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(existing, null, 2));
    res.json({ ok: true });
  } catch { res.json({ ok: true }); } // fail silently
});

app.get("/health", async (_req: Request, res: Response) => {
  const start = Date.now();

  interface ServiceStatus { name: string; status: string; error?: string }

  const services: ServiceStatus[] = [];

  try {
    await supabase.from('organizations').select('id', { count: 'exact', head: true }).limit(1);
    services.push({ name: 'database', status: 'ok' });
  } catch (e: any) {
    services.push({ name: 'database', status: 'error', error: String(e?.message ?? e) });
  }

  services.push({
    name: 'supabase_client',
    status: isSupabaseFallback() ? 'fallback' : 'ok',
  });

  const allOk = services.every((s) => s.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - start,
    services,
  });
});

// ---------------------------------------------------------------------------
// Auth middleware - extracts user from Supabase JWT, then enriches with
// org_id and role from the public.users table so downstream handlers
// always have req.user.org_id available.
// ---------------------------------------------------------------------------
app.use(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error) {
        console.warn("Auth warning:", error.message);
      }

      if (user) {
        // Look up org_id, role, and id from the app's users table
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, org_id, role, full_name")
          .eq("auth_id", user.id)
          .single();

        if (dbUser) {
          (req as any).user = {
            id: dbUser.id,
            org_id: dbUser.org_id,
            role: dbUser.role,
            email: user.email,
            full_name: dbUser.full_name,
          };
        } else {
          // Fallback: auth user exists but no matching users row yet
          // Try to find by email as secondary lookup
          const { data: dbUserByEmail } = await supabase
            .from("users")
            .select("id, org_id, role, full_name")
            .eq("email", user.email)
            .single();

          if (dbUserByEmail) {
            // Update auth_id for future lookups
            await supabase
              .from("users")
              .update({ auth_id: user.id })
              .eq("id", dbUserByEmail.id);

            (req as any).user = {
              id: dbUserByEmail.id,
              org_id: dbUserByEmail.org_id,
              role: dbUserByEmail.role,
              email: user.email,
              full_name: dbUserByEmail.full_name,
            };
          } else {
            // No matching user at all — do NOT grant any role.
            // Returning null forces individual auth() guards to reject with 401.
            // SECURITY: The previous code assigned role:"ADMIN" + org_id:null here,
            // which could allow an authenticated-but-unregistered Supabase user to
            // bypass role checks and potentially read cross-org data. Fixed 2026-03-21.
            console.warn(`Auth warning: Supabase user ${user.id} (${user.email}) has no matching users row — treating as unauthenticated`);
            (req as any).user = null;
          }
        }
      } else {
        (req as any).user = null;
      }
    } catch (err) {
      console.warn("Auth token verification failed:", err);
      (req as any).user = null;
    }
  } else {
    (req as any).user = null;
  }

  // Allow request through regardless - individual routes can enforce auth
  next();
});

// ---------------------------------------------------------------------------
// Module routes
// ---------------------------------------------------------------------------
app.use(executionRouter);
app.use(capabilityRouter);
app.use(processRouter);
app.use("/api", currencyRouter);
app.use("/api", reportsRouter);

// ---------------------------------------------------------------------------
// Certified Core routes
// ---------------------------------------------------------------------------
app.use("/api/events", eventsRouter);
app.use(stateMachineRouter);

// ---------------------------------------------------------------------------
// Module routes - Asset Management, Customer Quality, Deputies, Suppliers, Calibration
// ---------------------------------------------------------------------------
app.use(assetManagementRouter);
app.use(customerQualityRouter);
app.use(deputiesRouter);
app.use(supplierManagementRouter);
app.use(calibrationImportRouter);
app.use(agreementsRouter);
app.use(subcontractorsRouter);
app.use(capacityEngineRouter);
app.use(metricsRouter);
app.use(qualityGatesRouter);
app.use(qualityControlRouter);
app.use(decisionIntelligenceRouter);

// ---------------------------------------------------------------------------
// Previously unregistered module routes
// ---------------------------------------------------------------------------
app.use(managementReviewRouter);
app.use(strategicReviewRouter);
app.use(orgAdminRouter);
app.use(systemAdminRouter);
app.use(permissionsAdminRouter);
app.use(localizationRouter);
app.use(legalReviewRouter);
app.use(personnelRouter);
app.use(auditWorkspaceRouter);
app.use(integrationRouter);
app.use("/api/stripe", stripeRouter);
app.use("/api/notifications", notificationsRouter);
app.use('/api/webhooks', billingWebhookRouter);
app.use('/api/billing', billingRouter);
app.use(checkinRouter); // Self Check-in API — /api/checkin/*
app.use("/api/learning", learningRouter);
app.use("/api/spaghetti", spaghettiRouter); // Lean spaghetti diagram & helikopterperspektiv
app.use("/api/spatial", spatialRouter);   // Spatial Flow Intelligence — zones, spaghetti, friction
app.use("/api/consumables", consumablesRouter); // Consumables Management — operational cost control
app.use("/api/culture", cultureRouter);       // Culture & Event Automation — birthdays, breakfast, events
app.use("/api/people", peopleOSRouter);       // People OS (ERM) — pulse surveys, engagement, feedback, warnings, 1-on-1s
app.use(bankingRouter); // Banking: /api/banking/* + /api/integrations/fortnox/* + /api/integrations/visma/*

// ---------------------------------------------------------------------------
// Customer Interaction Engine — Brand Layer, Payment Orchestration, Customer State
// ---------------------------------------------------------------------------
app.use('/api/brand', brandRouter);           // GET/PUT /api/brand/:org_id, GET /api/brand/by-subdomain/:sub, POST /api/brand/upload-logo
app.use('/api/payments', paymentOrchestrationRouter); // GET /api/payments/config, POST /api/payments/create-intent|create-invoice|partial
app.use('/api/customer-state', customerStateRouter);  // GET/POST /api/customer-state/:contact_id, GET /api/customer-state/by-token/:token
app.use('/api/customer-portal', customerPortalRouter); // GET /api/customer-portal/:token
app.use('/api/revolut', revolutRouter);               // GET /api/revolut/accounts|cards, POST /api/revolut/cards, GET /api/revolut/cost-report

// ---------------------------------------------------------------------------
// DMS — Dealer Management System (pixdrift automotive)
// ---------------------------------------------------------------------------
app.use(vehiclesRouter);       // /api/vehicles/*
app.use(externalAuditsRouter); // /api/external-audits/*, /api/certifications/*
app.use('/api/control', controlLayerRouter); // Control Layer — live-map, flow-analysis, bottlenecks, RCA, improvements
app.use(workshopRouter);              // /api/workshop/*
app.use(workshopStateMachineRouter);  // /api/workshop/work-orders/:id/transition, available-transitions, state-audit
app.use(checklistEngineRouter);       // /api/checklists/*
app.use(partsRouter);                 // /api/parts/*
app.use(vehicleSalesRouter);   // /api/vehicle-sales/*
app.use(automotiveCrmRouter);  // /api/automotive-crm/*
app.use('/api/rental', rentalRouter); // /api/rental/* — PIX-event-sourced rental engine
app.use(oemRouter);            // /api/oem/*

// ---------------------------------------------------------------------------
// PIX Intelligence Engine — Palantir-depth analytics for automotive SMBs
// ---------------------------------------------------------------------------
app.use(intelligenceRouter);   // /api/intelligence/* — overloaded-technicians, at-risk-parts, etc.
app.use(workflowEngineRouter); // /api/workflows/* — templates, instances, step completion

// ---------------------------------------------------------------------------
// SEO — sitemap.xml + robots.txt on root, /api/seo/* for endpoints
// ---------------------------------------------------------------------------
app.use('/', seoRouter);       // /sitemap.xml, /robots.txt, /og-image.svg
app.use('/api/seo', seoRouter); // /api/seo/schema/:page, /api/seo/report, /api/seo/invalidate-cache

// ---------------------------------------------------------------------------
// Tax Compliance (SFL 2011:1244, ML 2023:200, BFL 1999:1078, SKVFS 2014:9)
// ---------------------------------------------------------------------------
// Approval Engine — Video-first customer approvals
// ---------------------------------------------------------------------------
import approvalEngineRouter from './approval-engine';
app.use('/api/approvals', approvalEngineRouter); // POST /capture, GET /pending, /customer/:token, etc.

import devIntegrationsRouter from './dev-integrations';
app.use('/api', devIntegrationsRouter); // Dev Infrastructure Hub: /api/dev-integrations/*, /api/dev-secrets/*, /api/dev-catalog

// ---------------------------------------------------------------------------
app.use('/api/personnel-ledger', personnelLedgerRouter); // Personalliggare (SFL 39 kap.)
app.use('/api/cash-register',    cashRegisterRouter);    // Kassaregister (SKVFS 2014:9)
app.use('/api/vat',              vatComplianceRouter);   // Momshantering (ML 2023:200)
app.use('/api/payroll',          payrollComplianceRouter); // Arbetsgivaravgifter (SAL + IL)
app.use('/api/compliance',       complianceCheckerRouter); // Compliance-kontroll
app.use('/api/tool-assets',      assetAccountabilityRouter); // Asset Accountability & Traceability
app.use('/api/account-safety',   accountSafetyRouter);       // Account Safety & Offboarding — master accounts, risk analysis, offboarding wizard

import swedacComplianceRouter from './swedac-compliance-api';
app.use('/api/swedac',           swedacComplianceRouter);    // Swedac Accreditation — ISO 17020/17025/9001, calibration, competence, impartiality

import companyComplianceRouter from './company-compliance';
import vehicleIntakeRouter from './vehicle-intake-api';
import { missingPartRouter } from './missing-part-api';
import rentalPartnerRouter from './rental-partner-api';
import mobilityIncidentRouter from './mobility-incident-api';
app.use('/api/company',          companyComplianceRouter);   // Company Core — legal entities, compliance calendar, authority filings (ABL/SFL/ÅRL)
app.use('/api/intake',           vehicleIntakeRouter);       // Vehicle Intake Protocol — 8-angle photos, diagnostic, recalls (mandatory flow)
app.use('/api/missing-part',     missingPartRouter);         // Missing Part Protocol — airline-style delay response with auto compensation
app.use(rentalPartnerRouter);                               // Rental Partner Integration — Europcar/Hertz/Avis/Sixt/Enterprise + own fleet, compensation rules
app.use('/api/mobility',         mobilityIncidentRouter);    // Mobility Incident Flow Engine — towing, responsibility engine, cost allocation, OEM claims
// Fluid Integration — Alantec, Orion, and generic fluid management systems
import fluidIntegrationRouter from "./fluid-integration-api";
app.use('/api/fluid', fluidIntegrationRouter);              // /api/fluid/integrations, /api/fluid/webhook/*, /api/fluid/events, /api/fluid/inventory, /api/fluid/report
app.use(bookingEngineRouter);                               // Booking Engine — capacity+intent allocation, PIX-driven estimates, delay risk
app.use('/api/sla', slaEngineRouter);                       // SLA Escalation Engine — T-60/T-30/T-0 alerts, customer SMS at breach

import auditDashboardRouter from './audit-dashboard-api';
app.use('/api/audit', auditDashboardRouter);               // Audit Dashboard — performance score, certifications, audit log, readiness

// ---------------------------------------------------------------------------
// quiXzoom Mission Engine — photographer missions, geo-zones, deliverables
// ---------------------------------------------------------------------------
import { missionRouter } from './mission-api';
app.use('/api/missions', missionRouter);                   // GET/POST /api/missions/*, /api/missions/nearby, etc.

// ---------------------------------------------------------------------------
// quiXzoom Media Pipeline v1 — S3 upload, EXIF extraction, CDN delivery
// ---------------------------------------------------------------------------
import { mediaRouter } from './media-api';
app.use('/api/media', mediaRouter);                        // POST /api/media/request-upload, /confirm/:key, GET /mission/:id, /download/:key, /near

// ---------------------------------------------------------------------------
// quiXzoom Payout Engine v1 — Fotograf-utbetalningar, escrow, plattformsavgift
// ---------------------------------------------------------------------------
import { payoutRouter } from './payout-api';
app.use('/api/payouts', payoutRouter);                     // POST /api/payouts/mission/:id, GET /api/payouts/photographer/:id, /platform/:orgId

// ---------------------------------------------------------------------------
// Auth helper for inline routes
// ---------------------------------------------------------------------------
const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ---------------------------------------------------------------------------
// Wavult Ledger Core v1 — Double-entry bookkeeping, multi-entity, multi-currency
// ---------------------------------------------------------------------------
import { ledgerRouter } from './ledger-api';
app.use('/api/ledger', auth, ledgerRouter);

// ---------------------------------------------------------------------------
// Wavult Payment Orchestrator v1 — PaymentIntents, state machine, PSP routing
// ---------------------------------------------------------------------------
import { paymentRouter } from './payment-orchestrator-api';
app.use('/api/payment-intents', auth, paymentRouter);

// ---------------------------------------------------------------------------
// Wavult Governance Swarm — Ledger Auditor, Payment Auditor, System Health
// ---------------------------------------------------------------------------
import { governanceRouter } from './governance-api';
app.use('/api/governance', auth, governanceRouter);

// ============================================================
// CERTIFIED OMS: Task Catalog API
// ============================================================

// ── TASK CATALOG: Kategorier ──
app.get('/api/task-catalog/categories', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── TASK CATALOG: Alla uppgiftstyper ──
app.get('/api/task-catalog/types', auth, async (req, res) => {
  const { category, phase, role } = req.query;
  let query = supabase
    .from('task_types')
    .select('*, task_categories(code, name, entity)')
    .eq('is_active', true)
    .order('sort_order');
  
  if (category) query = query.eq('category_id', category);
  if (phase) query = query.eq('phase', phase);
  if (role) query = query.contains('applicable_roles', [role as string]);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── TASK CATALOG: Enskild uppgiftstyp med positioner ──
app.get('/api/task-catalog/types/:code', auth, async (req, res) => {
  const { data: taskType, error: e1 } = await supabase
    .from('task_types')
    .select('*, task_categories(code, name, entity)')
    .eq('position_code', req.params.code)
    .single();
  if (e1) return res.status(404).json({ error: 'Task type not found' });

  const { data: positions } = await supabase
    .from('task_positions')
    .select('*')
    .eq('task_type_id', taskType.id)
    .order('sort_order');
  
  const { data: manuals } = await supabase
    .from('task_manuals')
    .select('*')
    .eq('task_type_id', taskType.id)
    .eq('is_active', true);

  res.json({ ...taskType, positions: positions || [], manuals: manuals || [] });
});

// ── TASK CATALOG: Positioner för en uppgiftstyp ──
app.get('/api/task-catalog/types/:code/positions', auth, async (req, res) => {
  const { data: taskType } = await supabase
    .from('task_types')
    .select('id')
    .eq('position_code', req.params.code)
    .single();
  if (!taskType) return res.status(404).json({ error: 'Task type not found' });

  const { data, error } = await supabase
    .from('task_positions')
    .select('*')
    .eq('task_type_id', taskType.id)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── TASK EXECUTIONS: Starta en uppgift ──
app.post('/api/task-executions', auth, validate(CreateTaskExecutionSchema), async (req, res) => {
  const { task_type_code, queue_source, deadline, linked_entity_type, linked_entity_id } = req.body;
  
  const { data: taskType } = await supabase
    .from('task_types')
    .select('id, standard_minutes')
    .eq('position_code', task_type_code)
    .single();
  if (!taskType) return res.status(404).json({ error: 'Unknown task type: ' + task_type_code });

  const { data: positions } = await supabase
    .from('task_positions')
    .select('id')
    .eq('task_type_id', taskType.id)
    .order('sort_order');

  const { data, error } = await supabase
    .from('task_executions')
    .insert({
      task_type_id: taskType.id,
      user_id: (req as any).user.id,
      org_id: (req as any).user.org_id,
      queue_source: queue_source || 'huvudbefattning',
      status: 'queued',
      current_step: 0,
      total_steps: positions ? positions.length : 0,
      current_position_id: positions && positions[0] ? positions[0].id : null,
      deadline,
      linked_entity_type,
      linked_entity_id,
      input_data: {},
      evidence_files: []
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── TASK EXECUTIONS: Lista mina aktiva ──
app.get('/api/task-executions/my', auth, async (req, res) => {
  const { status: qs } = req.query;
  let query = supabase
    .from('task_executions')
    .select('*, task_types(position_code, name, standard_minutes, manual_type, attention_type)')
    .eq('user_id', (req as any).user.id)
    .order('priority_score', { ascending: false });
  
  if (qs) query = query.eq('status', qs as string);
  else query = query.in('status', ['queued', 'active', 'paused', 'blocked']);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── TASK EXECUTIONS: Hämta en körning med aktuellt steg ──
app.get('/api/task-executions/:id', auth, async (req, res) => {
  const { data: exec, error: e1 } = await supabase
    .from('task_executions')
    .select('*, task_types(position_code, name, standard_minutes, manual_type, attention_type, iso_clause)')
    .eq('id', req.params.id)
    .single();
  if (e1) return res.status(404).json({ error: 'Execution not found' });

  const { data: positions } = await supabase
    .from('task_positions')
    .select('*')
    .eq('task_type_id', exec.task_type_id)
    .order('sort_order');

  let currentManual = null;
  if (exec.current_position_id) {
    const { data: manuals } = await supabase
      .from('task_manuals')
      .select('*')
      .eq('task_position_id', exec.current_position_id)
      .eq('is_active', true);
    currentManual = manuals && manuals[0] ? manuals[0] : null;
  }

  res.json({ ...exec, positions: positions || [], current_manual: currentManual });
});

// ── TASK EXECUTIONS: Gå till nästa steg ──
app.patch('/api/task-executions/:id/advance', auth, validate(AdvanceTaskSchema), async (req, res) => {
  const { input_data, evidence_file } = req.body;

  const { data: exec } = await supabase
    .from('task_executions')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (!exec) return res.status(404).json({ error: 'Not found' });
  if (exec.user_id !== (req as any).user.id) return res.status(403).json({ error: 'Not your task' });

  const { data: positions } = await supabase
    .from('task_positions')
    .select('*')
    .eq('task_type_id', exec.task_type_id)
    .order('sort_order');

  const nextStep = exec.current_step + 1;
  const isComplete = nextStep >= (positions ? positions.length : 0);

  const mergedInput = { ...(exec.input_data || {}), [`step_${exec.current_step}`]: input_data };

  const mergedEvidence = [...(exec.evidence_files || [])];
  if (evidence_file) mergedEvidence.push({ ...evidence_file, step: exec.current_step, uploaded_at: new Date().toISOString() });

  const update: any = {
    current_step: nextStep,
    current_position_id: isComplete ? null : (positions && positions[nextStep] ? positions[nextStep].id : null),
    input_data: mergedInput,
    evidence_files: mergedEvidence,
    status: isComplete ? 'completed' : 'active',
    started_at: exec.started_at || new Date().toISOString(),
    completed_at: isComplete ? new Date().toISOString() : null,
    actual_minutes: isComplete ? Math.round((Date.now() - new Date(exec.started_at).getTime()) / 60000) : null
  };

  const { data, error } = await supabase
    .from('task_executions')
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('domain_events').insert({
    entity_type: 'task_execution',
    entity_id: req.params.id,
    event_type: isComplete ? 'task.completed' : 'task.step_advanced',
    payload: { step: nextStep, total: positions ? positions.length : 0, is_complete: isComplete },
    triggered_by: (req as any).user.id,
    org_id: (req as any).user.org_id
  });

  res.json(data);
});

// ── TASK EXECUTIONS: Pausa / återuppta ──
app.patch('/api/task-executions/:id/pause', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('task_executions')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', (req as any).user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/task-executions/:id/resume', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('task_executions')
    .update({ status: 'active', paused_at: null })
    .eq('id', req.params.id)
    .eq('user_id', (req as any).user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── TASK EXECUTIONS: Override (lås upp i förtid) ──
app.patch('/api/task-executions/:id/override', auth, validate(OverrideTaskSchema), async (req, res) => {
  const { reason } = req.body;

  const { data, error } = await supabase
    .from('task_executions')
    .update({ override_reason: reason, status: 'active' })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_logs').insert({
    entity_type: 'task_execution', entity_id: req.params.id,
    action: 'priority_override', details: { reason },
    user_id: (req as any).user.id, org_id: (req as any).user.org_id
  });

  res.json(data);
});

// ── USER QUEUES: Hämta mina köer ──
app.get('/api/queues/my', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_queues')
    .select('*, queue_assignments(*, task_executions(*, task_types(position_code, name, standard_minutes, attention_type)))')
    .eq('user_id', (req as any).user.id)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── USER QUEUES: Skapa kö ──
app.post('/api/queues', auth, validate(CreateQueueSchema), async (req, res) => {
  const { queue_name, queue_type } = req.body;
  const { data, error } = await supabase
    .from('user_queues')
    .insert({ user_id: (req as any).user.id, queue_name, queue_type })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── VELOCITY: Daglig statistik ──
app.get('/api/velocity/my', auth, async (req, res) => {
  const { data: today } = await supabase
    .from('task_executions')
    .select('id, status, actual_minutes, completed_at')
    .eq('user_id', (req as any).user.id)
    .gte('created_at', new Date().toISOString().split('T')[0]);

  const completed = (today || []).filter((t: any) => t.status === 'completed').length;
  const total = (today || []).length;
  const totalMinutes = (today || []).filter((t: any) => t.actual_minutes).reduce((s: number, t: any) => s + t.actual_minutes, 0);

  res.json({
    date: new Date().toISOString().split('T')[0],
    completed,
    total,
    completion_rate: total > 0 ? Math.round(completed / total * 100) : 0,
    total_minutes: totalMinutes
  });
});

// ── VELOCITY: Team ──
app.get('/api/velocity/team', auth, async (req, res) => {
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('org_id', (req as any).user.org_id);

  const today = new Date().toISOString().split('T')[0];
  const results: any[] = [];

  for (const user of (users || [])) {
    const { data: tasks } = await supabase
      .from('task_executions')
      .select('id, status')
      .eq('user_id', user.id)
      .gte('created_at', today);
    
    const completed = (tasks || []).filter((t: any) => t.status === 'completed').length;
    const total = (tasks || []).length;
    results.push({
      user_id: user.id,
      name: user.full_name,
      role: user.role,
      completed,
      total,
      completion_rate: total > 0 ? Math.round(completed / total * 100) : 0
    });
  }

  res.json(results);
});

// ── CATALOG STATS ──
app.get('/api/task-catalog/stats', auth, async (req, res) => {
  const { count: typeCount } = await supabase.from('task_types').select('*', { count: 'exact', head: true });
  const { count: posCount } = await supabase.from('task_positions').select('*', { count: 'exact', head: true });
  const { count: catCount } = await supabase.from('task_categories').select('*', { count: 'exact', head: true });
  const { count: execCount } = await supabase.from('task_executions').select('*', { count: 'exact', head: true });

  const { data: types } = await supabase.from('task_types').select('phase');
  const byPhase: Record<string, number> = {};
  (types || []).forEach((t: any) => { byPhase[t.phase] = (byPhase[t.phase] || 0) + 1; });

  res.json({
    categories: catCount,
    task_types: typeCount,
    positions: posCount,
    executions: execCount,
    by_phase: byPhase
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Resource not found" });
});

// ---------------------------------------------------------------------------
// Centralized error handler (must be last middleware)
// Handles AppError subclasses (ValidationError, NotFoundError, etc.)
// and unknown errors uniformly.
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Bootstrap: check Supabase, load state machine configs, register subscribers
// ---------------------------------------------------------------------------
async function bootstrap() {
  await checkSupabaseConnectivity();
  await stateMachine.loadConfigs();
  registerSubscribers();
  console.log("Certified Core initialized: StateMachine + EventBus + Subscribers");
}

bootstrap().catch((err) => console.error("Core bootstrap failed:", err));

app.listen(PORT, () => {
  console.log(`Hypbit OMS API running on http://localhost:${PORT}`);
  // Schedule daily auto-consume job (runs at 06:00)
  scheduleAutoConsume();
  // Start SLA Escalation Engine — checks every 5 minutes
  startSLAChecker();
});

export default app;
// Deploy trigger Sat Mar 21 18:49:08 CET 2026
// Deploy trigger Sat Mar 21 23:55:27 CET 2026
// Sun Mar 22 01:03:37 CET 2026 - force rebuild
// rebuild Sun Mar 22 01:16:44 CET 2026
