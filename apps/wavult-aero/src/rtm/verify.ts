/**
 * verify — build-time requirements traceability verifier.
 *
 * Rules:
 *   1. Every requirement listed in REQUIREMENTS must have existing
 *      implementation files and at least one verification file.
 *   2. Every implementation file must contain an @req tag that names
 *      the requirement id.
 *   3. For a production release (RTM_STRICT=1), no requirement may be
 *      in status "draft". A draft requirement on a prod build fails
 *      the Docker build.
 *
 * Outputs a JSON matrix to docs/aero/rtm-matrix.json for auditors.
 *
 * Exit codes:
 *   0  OK
 *   1  file system error
 *   2  RTM violation
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { REQUIREMENTS } from './requirements'

const STRICT = process.env.RTM_STRICT === '1'
const ROOT = resolve(__dirname, '..', '..')
const MATRIX_OUT = resolve(ROOT, '..', '..', 'docs', 'aero', 'rtm-matrix.json')

const violations: string[] = []

for (const req of REQUIREMENTS) {
  for (const rel of req.implementation) {
    const abs = resolve(ROOT, rel)
    if (!existsSync(abs)) {
      violations.push(`${req.id}: implementation file not found: ${rel}`)
      continue
    }
    const content = readFileSync(abs, 'utf8')
    if (!content.includes(req.id)) {
      violations.push(`${req.id}: no @req tag in ${rel}`)
    }
  }

  if (req.verification.length === 0) {
    violations.push(`${req.id}: no verification file listed`)
  }

  if (STRICT && req.status === 'draft') {
    violations.push(`${req.id}: draft status is not permitted for RTM_STRICT=1`)
  }
}

const summary = {
  total: REQUIREMENTS.length,
  implemented: REQUIREMENTS.filter((r) => r.status === 'implemented').length,
  verified: REQUIREMENTS.filter((r) => r.status === 'verified').length,
  drafts: REQUIREMENTS.filter((r) => r.status === 'draft').length,
  strict_mode: STRICT,
  violations: violations.length,
  requirements: REQUIREMENTS.map((r) => ({
    id: r.id,
    text: r.text,
    regulation: r.regulation,
    status: r.status,
    hazard_classification: r.hazard_classification ?? null,
    implementation: r.implementation,
    verification: r.verification,
  })),
}

try {
  mkdirSync(dirname(MATRIX_OUT), { recursive: true })
  writeFileSync(MATRIX_OUT, JSON.stringify(summary, null, 2) + '\n')
  console.log('[rtm] wrote %s', MATRIX_OUT)
} catch (err) {
  console.error('[rtm] FS error writing matrix:', err)
  process.exit(1)
}

if (violations.length > 0) {
  console.error('[rtm] %d violation(s):', violations.length)
  for (const v of violations) console.error('  -', v)
  process.exit(2)
}

console.log('[rtm] OK  %d requirements, %d implemented, %d verified, %d drafts%s',
  summary.total, summary.implemented, summary.verified, summary.drafts,
  STRICT ? ' (strict)' : '')
