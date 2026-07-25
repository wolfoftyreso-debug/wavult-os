/**
 * build-info — static build metadata, filled in at build time by CI.
 *
 * CI overwrites this file before `npm run build` with the real git SHA,
 * build timestamp, and SBOM hash. For local dev it stays at the defaults
 * below so the TypeScript compilation does not fail.
 */

export const BUILD_INFO = {
  service: 'wavult-aero',
  version: '0.1.0',
  git_sha: process.env.GIT_SHA || 'dev',
  built_at: process.env.BUILT_AT || new Date(0).toISOString(),
  sbom_sha256: process.env.SBOM_SHA256 || '0'.repeat(64),
} as const
