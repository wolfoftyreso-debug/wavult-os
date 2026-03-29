// Deterministic state machines — no transition skipping allowed

export type TaskState = 'created' | 'accepted' | 'in_progress' | 'uploaded' | 'validating' | 'validated' | 'approved' | 'rejected' | 'expired' | 'cancelled'
export type PaymentState = 'initiated' | 'authorized' | 'captured' | 'settled' | 'split_executing' | 'split_executed' | 'completed' | 'failed' | 'refunded'
export type PayoutState = 'pending' | 'approved' | 'queued' | 'executing' | 'executed' | 'failed' | 'reversed'

const TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  created:    ['accepted', 'cancelled', 'expired'],
  accepted:   ['in_progress', 'cancelled'],
  in_progress:['uploaded', 'cancelled'],
  uploaded:   ['validating'],
  validating: ['validated', 'rejected'],
  validated:  ['approved', 'rejected'],
  approved:   [],
  rejected:   [],
  expired:    [],
  cancelled:  [],
}

const PAYMENT_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  initiated:      ['authorized', 'failed'],
  authorized:     ['captured', 'failed'],
  captured:       ['settled', 'failed'],
  settled:        ['split_executing'],
  split_executing:['split_executed', 'failed'],
  split_executed: ['completed'],
  completed:      [],
  failed:         ['initiated'],  // retry allowed
  refunded:       [],
}

const PAYOUT_TRANSITIONS: Record<PayoutState, PayoutState[]> = {
  pending:   ['approved', 'failed'],
  approved:  ['queued'],
  queued:    ['executing'],
  executing: ['executed', 'failed'],
  executed:  [],
  failed:    ['pending'],  // retry allowed
  reversed:  [],
}

export function assertTaskTransition(from: TaskState, to: TaskState): void {
  if (!TASK_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`INVALID_TASK_TRANSITION: ${from} → ${to} is not allowed`)
  }
}

export function assertPaymentTransition(from: PaymentState, to: PaymentState): void {
  if (!PAYMENT_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`INVALID_PAYMENT_TRANSITION: ${from} → ${to} is not allowed`)
  }
}

export function assertPayoutTransition(from: PayoutState, to: PayoutState): void {
  if (!PAYOUT_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`INVALID_PAYOUT_TRANSITION: ${from} → ${to} is not allowed`)
  }
}
