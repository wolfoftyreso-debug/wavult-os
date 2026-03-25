# pixdrift — System Architecture

**Classification:** Internal Technical Documentation  
**Version:** 1.1.0  
**Date:** 2026-03-21  
**Status:** Living document — update on every structural change

---

## 1. System Overview

pixdrift is a multi-tenant SaaS platform for operational management, primarily targeting automotive dealerships and ISO-certified service companies in the Nordic market.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                                     │
│                                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │  app.bc.pix   │  │  admin.bc.pix │  │  crm.bc.pix   │  ...          │
│  │  (React SPA)  │  │  (React SPA)  │  │  (React SPA)  │               │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘               │
└──────────┼──────────────────┼──────────────────┼───────────────────────┘
           │                  │                  │
           │         HTTPS / REST API            │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY TIER (AWS)                             │
│                                                                         │
│  CloudFront (CDN + WAF)  →  ALB (HTTPS :443)                           │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION TIER (AWS ECS Fargate)                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Express API  (Node.js 22, TypeScript)                          │   │
│  │                                                                 │   │
│  │  Middleware stack:                                              │   │
│  │    helmet → cors → rate-limit → cookieParser → locale          │   │
│  │    → requestLogger → [auth] → [brand] → [routes]               │   │
│  │    → 404 → errorHandler                                        │   │
│  │                                                                 │   │
│  │  Public routes (no auth):                                      │   │
│  │    /api/auth/*  /api/eva-bot/*  /health  /sitemap.xml          │   │
│  │                                                                 │   │
│  │  Protected routes (JWT required):                              │   │
│  │    /api/* → all domain routers                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────┐
│   DATA TIER         │  │   EXTERNAL SERVICES                         │
│                     │  │                                             │
│  Supabase           │  │  Stripe      — Payments                     │
│  (PostgreSQL)       │  │  Anthropic   — AI (Eva bot)                 │
│   + Auth            │  │  46elks      — SMS                          │
│   + Storage         │  │  Fortnox     — Accounting                   │
│   + Realtime        │  │  Visma       — Payroll                      │
│                     │  │  OEM APIs    — Vehicle data                 │
│  AWS S3             │  │  Cabas       — Damage valuation             │
│  (file storage)     │  │                                             │
└─────────────────────┘  └─────────────────────────────────────────────┘
```

---

## 2. Domain Model

The codebase is organized around bounded contexts. Each domain owns its data and exposes its API via a dedicated router.

| Domain | Router file | Responsibility |
|--------|-------------|----------------|
| **Execution** | `execution.ts` | CRM, deals, tasks, contacts, task-catalog, OMS |
| **Process** | `process.ts` | ISO compliance, NC, audits, quality gates |
| **Capability** | `capability.ts` | Skills, competence, training, goals |
| **Finance** | `currency.ts`, `reports.ts`, `banking.ts` | Currency, SIE4, Fortnox, Visma |
| **Automotive** | `vehicles.ts`, `workshop.ts`, `parts.ts`, `vehicle-sales.ts` | DMS, work orders, inventory |
| **People** | `people-os.ts`, `personnel-api.ts`, `culture-engine.ts` | ERM, HR, pulse surveys, engagement |
| **Assets** | `asset-management.ts`, `consumables.ts`, `spatial-flow.ts` | Inventory, spatial analysis |
| **Compliance** | `personnel-ledger.ts`, `cash-register.ts`, `vat-compliance.ts` | SFL, ML, BFL, SKVFS |
| **Shared / Auth** | `auth.ts` | JWT auth, user session management |
| **Bots** | `eva-bot.ts` | Telegram AI assistant |

**Note:** As of 2026-03-21, the codebase uses a flat router structure. The domain grouping above is the *conceptual* model — full DDD restructuring is documented in Section 7 (Roadmap).

---

## 3. Request Lifecycle

```
Client Request
     │
     ▼
[1] helmet()           — Security headers (X-Frame-Options, CSP, etc.)
     │
     ▼
[2] cors()             — Origin validation against allowlist
     │
     ▼
[3] express.json()     — Body parsing (10mb limit)
     │
     ▼
[4] cookieParser()     — Cookie parsing
     │
     ▼
[5] locale middleware  — Accept-Language → req.locale (sv/en/de/no/da/fi)
     │
     ▼
[6] rateLimit()        — 100 req/15min per IP
     │
     ▼
[7] eva-bot bypass     — /api/eva-bot/* routes skip auth (Telegram webhook)
     │
     ▼
[8] requestLogger      — Method, path, status, duration logging
     │
     ▼
[9] auth middleware    — Supabase JWT validation + org_id/role enrichment
     │                   (req.user = { id, org_id, role, email, full_name })
     ▼
[10] Route handler     — Business logic
     │
     ▼
[11] errorHandler      — Centralized error response (AppError subclasses)
     │
     ▼
Response
```

---

## 4. Authentication & Authorization Model

### JWT Flow
1. Client authenticates via Supabase Auth (`/api/auth/*`)
2. Supabase issues JWT with `sub` = auth UUID
3. Client sends `Authorization: Bearer <jwt>` on all subsequent requests
4. Auth middleware validates JWT → looks up `users` table by `auth_id` → enriches `req.user`

### User Object
```typescript
req.user = {
  id: string;        // users.id (UUID, app-level)
  org_id: string;    // Multi-tenant isolation key
  role: string;      // ADMIN | MANAGER | USER | etc.
  email: string;
  full_name: string;
}
```

### Multi-tenant Isolation
- ALL database queries MUST filter by `org_id` from `req.user.org_id`
- Never trust `org_id` from request body — always use `req.user.org_id`
- Service Role key used server-side — RLS is enforced at application layer

### Role Enforcement
```typescript
const auth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  next();
};
```
Fine-grained role checks should use role middleware (`role-middleware.ts`).

---

## 5. Error Handling Standard

All errors MUST be thrown as `AppError` subclasses. Never return raw error strings.

```typescript
import { NotFoundError, ValidationError, ForbiddenError } from './shared/middleware/error-handler';

// Correct:
throw new NotFoundError('Deal');
throw new ValidationError('Invalid input', zodError.flatten());
throw new ForbiddenError('Only managers can approve this');

// WRONG — never do this:
res.status(500).json({ error: err.message }); // exposes internals
```

### Error Class Hierarchy
```
AppError (base)
├── ValidationError    (422) — Bad input, Zod failures
├── AuthorizationError (401) — Missing/invalid JWT
├── ForbiddenError     (403) — Valid JWT, insufficient role
├── NotFoundError      (404) — Resource does not exist
├── ConflictError      (409) — State conflict
└── DatabaseError      (500) — DB errors (message hidden in production)
```

### Response Format
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": { ... }    // development only
}
```

---

## 6. Input Validation Standard

All mutating endpoints (POST, PUT, PATCH) MUST validate input with Zod.

```typescript
import { validate } from '../shared/validation/middleware';
import { CreateDealSchema } from '../shared/validation/schemas';

router.post('/deals', auth, validate(CreateDealSchema), async (req, res) => {
  // req.body is now typed and validated
  const deal = req.body as CreateDealInput;
});
```

Shared schemas: `server/src/shared/validation/schemas.ts`  
Domain schemas: `server/src/domains/<domain>/schemas.ts` (when DDD restructure is done)

---

## 7. Environment Configuration

All environment variables are validated at startup via Zod in `server/src/config/env.ts`.  
Application refuses to start if required variables are missing.

### Required Variables
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access |

### Optional (with warnings if missing)
| Variable | Purpose |
|----------|---------|
| `SUPABASE_ANON_KEY` | Client-side auth |
| `STRIPE_SECRET_KEY` | Payments |
| `ANTHROPIC_API_KEY` | AI features |
| `EVA_BOT_TOKEN` | Telegram bot |
| `CORS_ORIGIN` | Comma-separated allowed origins |

---

## 8. Deployment Architecture

```
GitHub main branch
     │
     ▼  (push triggers)
AWS CodePipeline / manual deploy
     │
     ▼
ECR (Container Registry)
  └── Docker image: node:22-alpine
     │
     ▼
ECS Fargate (Cluster: hypbit, Service: hypbit-api)
  └── Task: 0.5 vCPU, 1GB RAM
  └── Port: 3001
  └── Health check: GET /health → 200
     │
     ▼
ALB (Application Load Balancer)
  └── HTTPS :443 → HTTP :3001
     │
     ▼
CloudFront (CDN)
  └── api.bc.pixdrift.com
```

### Infrastructure as Code
Located in `infra/terraform/`:
- `main.tf` — Provider config
- `vpc.tf` — Network
- `ecs.tf` — Container service
- `alb.tf` — Load balancer
- `cloudfront.tf` — CDN
- `s3.tf` — Storage buckets
- `ssm.tf` — Secrets management
- `route53.tf` — DNS

---

## 9. Coding Standards

### Mandatory
1. **TypeScript strict mode** for new code (existing: `strict: false` — do not regress)
2. **Zod validation** on all mutating endpoints (POST/PUT/PATCH)
3. **AppError subclasses** for all error responses — never raw strings
4. **org_id from req.user** — never from request body
5. **No raw SQL strings** — use Supabase query builder or repository pattern
6. **No secrets in code** — use environment variables validated at startup

### Architecture principles
- **Single responsibility:** Each router file owns exactly one domain area
- **No business logic in index.ts** — only bootstrap and middleware registration
- **Auth before routes** — middleware order matters; never reorder without review
- **Public routes before auth middleware** — eva-bot, /health, /api/auth must remain public

### Git conventions
```
feat:     New feature
fix:      Bug fix
refactor: Code restructuring without behavior change
docs:     Documentation only
test:     Tests only
chore:    Tooling, deps, CI
```

---

## 10. Recommended Next Steps (Prioritized)

### Priority 1 — Security (immediate)
- [ ] **Add role-based guards** to sensitive endpoints (currently only null-check auth)
- [ ] **Audit org_id leakage** — verify every DB query filters by `req.user.org_id`
- [ ] **Rate limit per user** (not just per IP) to prevent authenticated abuse
- [ ] **Move supabase import** to use `getConfig()` from validated config, not raw `process.env`

### Priority 2 — Structural (next sprint)
- [ ] **Extract inline task-catalog routes** from `index.ts` to `task-catalog.ts` router
  - ~400 lines of business logic currently inline in index.ts
- [ ] **Repository pattern** for frequent DB calls (DealsRepository, WorkOrderRepository)
- [ ] **Extend Zod validation** to all POST/PUT/PATCH endpoints in existing routers
- [ ] **Separate config export** — remove mutable `_config` export, use `getConfig()` everywhere

### Priority 3 — Observability (next quarter)
- [ ] **Structured logging** (replace `console.log` with structured JSON logger, e.g., pino)
- [ ] **Request correlation IDs** (trace ID through logs)
- [ ] **Error tracking** (Sentry or equivalent)
- [ ] **Metrics** (response time p95/p99, error rate by endpoint)

### Priority 4 — DDD Restructure (strategic)
- [ ] **Migrate flat src/ to domain structure** as described in Section 2
  - Target: `server/src/domains/<domain>/` per bounded context
  - Estimated effort: 3–5 engineering days
  - Risk: Low if done incrementally (move one domain at a time)

---

## 11. What Was Implemented (2026-03-21)

| Item | File | Description |
|------|------|-------------|
| Centralized error handler | `shared/middleware/error-handler.ts` | AppError + typed subclasses + global handler middleware |
| Zod validation middleware | `shared/validation/middleware.ts` | `validate()` and `validateQuery()` wrappers |
| Shared Zod schemas | `shared/validation/schemas.ts` | Deals, WorkOrders, TaskExecution, Queue, Contact schemas |
| Upgraded env config | `config/env.ts` | Zod-validated, typed config with startup failure + warnings |
| Enterprise health endpoint | `index.ts` | Checks database + supabase_client, returns structured JSON |
| Zod on key endpoints | `index.ts` | POST task-executions, PATCH advance/override, POST queues |
| Replaced error handler | `index.ts` | Generic handler replaced with structured `errorHandler` |
| Architecture docs | `docs/ARCHITECTURE.md` | This document |
| zod dependency | `server/package.json` | v4.3.6 installed |

---

*Document maintained by: pixdrift engineering team*  
*Next review: On any structural change to middleware, auth, or domain routing*
