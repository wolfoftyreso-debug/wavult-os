// Wavult OS — Authenticated user attached to Express requests by auth middleware

export interface AuthUser {
  id: string
  org_id: string
  role: string
  email: string
  full_name: string | null
}

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      user: AuthUser | null
      locale: string
    }
  }
}
