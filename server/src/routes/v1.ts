// ─── v1 Route Registry ────────────────────────────────────────────────────────
// Stable API contract. Never introduce breaking changes here.
// New features go to /api/v2/
// Support window: 12 months from v2 release

import { Router } from 'express'
// Re-export all existing routes under /v1 namespace
// This is a compatibility layer — all /api/X routes are also available at /api/v1/X

const v1Router = Router()

// Health
v1Router.get('/health', (_req, res) => {
  res.json({ 
    version: '1.0', 
    status: 'ok', 
    deprecated: false,
    sunset: null  // Set to ISO date when v2 is stable
  })
})

export default v1Router
