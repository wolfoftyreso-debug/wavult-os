/**
 * Wavult Governance Swarm — Main export
 * Kör alla audit agents
 */

export { runLedgerAudit } from './ledger-auditor'
export type { AuditResult } from './ledger-auditor'
export { runPaymentAudit } from './payment-auditor'
export { runSystemHealth } from './system-health'

import { runLedgerAudit } from './ledger-auditor'
import { runPaymentAudit } from './payment-auditor'
import { runSystemHealth } from './system-health'

type LedgerResult = Awaited<ReturnType<typeof runLedgerAudit>>
type PaymentResult = Awaited<ReturnType<typeof runPaymentAudit>>
type HealthResult = Awaited<ReturnType<typeof runSystemHealth>>

/**
 * Kör full governance sweep (alla agents)
 */
export async function runFullGovernanceSweep(orgId?: string): Promise<{
  ledger: LedgerResult
  payment: PaymentResult
  health: HealthResult
}> {
  const [ledger, payment, health] = await Promise.all([
    runLedgerAudit(orgId),
    runPaymentAudit(orgId),
    runSystemHealth(),
  ])

  return { ledger, payment, health }
}
