import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { supabase, checkSupabaseConnectivity, isSupabaseFallback } from "./supabase";

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
import decisionIntelligenceRouter from "./decision-intelligence";

// ---------------------------------------------------------------------------
// Previously unregistered routers
// ---------------------------------------------------------------------------
import managementReviewRouter from "./management-review";
import strategicReviewRouter from "./strategic-review-api";
import orgAdminRouter from "./org-admin";
import systemAdminRouter from "./system-admin";
import permissionsAdminRouter from "./permissions-admin";
import localizationRouter from "./localization-api";
import legalReviewRouter from "./legal-review";
import personnelRouter from "./personnel-api";
import auditWorkspaceRouter from "./audit-workspace";
import integrationRouter from "./integrations/integration-api";

// ---------------------------------------------------------------------------
// Certified Core imports
// ---------------------------------------------------------------------------
import { eventsRouter } from "./events";
import stateMachineRouter from "./state-machine";
import { stateMachine } from "./state-machine";
import { registerSubscribers } from "./subscribers";

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

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
            // No matching user at all - set with null org_id
            (req as any).user = {
              id: user.id,
              org_id: null,
              role: "ADMIN",
              email: user.email,
              full_name: null,
            };
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
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supabase: isSupabaseFallback() ? "fallback" : "connected",
  });
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

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Error handling middleware
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { message: err.message }),
  });
});

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
});

export default app;
