import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Router imports – each module exposes an Express Router
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
// Auth middleware – extracts user from Supabase JWT
// In development requests are allowed through even without a valid token.
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

      // Attach user to request for downstream handlers
      (req as any).user = user ?? null;
    } catch (err) {
      console.warn("Auth token verification failed:", err);
      (req as any).user = null;
    }
  } else {
    (req as any).user = null;
  }

  // Allow request through regardless – individual routes can enforce auth
  next();
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
// Module routes — Asset Management, Customer Quality, Deputies, Suppliers, Calibration
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
// Start server
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Bootstrap: load state machine configs + register event subscribers
// ---------------------------------------------------------------------------
async function bootstrap() {
  await stateMachine.loadConfigs();
  registerSubscribers();
  console.log("Certified Core initialized: StateMachine + EventBus + Subscribers");
}

bootstrap().catch((err) => console.error("Core bootstrap failed:", err));

app.listen(PORT, () => {
  console.log(`Hypbit OMS API running on http://localhost:${PORT}`);
});

export default app;
