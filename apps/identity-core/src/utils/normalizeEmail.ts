/**
 * Canonical email normalization.
 * Apply at ALL entry points: login, registration, magic link, password reset, API calls.
 * Never use raw email — always normalize first.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
