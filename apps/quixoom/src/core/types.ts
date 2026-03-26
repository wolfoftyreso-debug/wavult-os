import { z } from 'zod';

// ============================================================================
// Entity (legal entity / bolag)
// ============================================================================
export const EntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  jurisdiction: z.string().min(2).max(3),
  base_currency: z.string().length(3),
  status: z.enum(['active', 'suspended', 'closed']).default('active'),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type Entity = z.infer<typeof EntitySchema>;

// ============================================================================
// Account
// ============================================================================
export const AccountType = z.enum([
  'customer', 'treasury', 'revenue', 'payable',
  'receivable', 'suspense', 'fee', 'fx',
]);
export type AccountType = z.infer<typeof AccountType>;

export const AccountSchema = z.object({
  id: z.string().uuid(),
  entity_id: z.string().uuid(),
  type: AccountType,
  currency: z.string().length(3),
  label: z.string().optional(),
  status: z.enum(['active', 'frozen', 'closed']).default('active'),
  created_at: z.string().datetime(),
});
export type Account = z.infer<typeof AccountSchema>;

// ============================================================================
// Transaction
// ============================================================================
export const TransactionType = z.enum([
  'payment', 'payout', 'fee', 'fx', 'transfer', 'adjustment', 'reversal',
]);
export type TransactionType = z.infer<typeof TransactionType>;

export const TransactionStatus = z.enum([
  'pending', 'authorized', 'committed', 'failed', 'reversed',
]);
export type TransactionStatus = z.infer<typeof TransactionStatus>;

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  entity_id: z.string().uuid(),
  type: TransactionType,
  status: TransactionStatus,
  reference: z.string().optional(),
  idempotency_key: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

// ============================================================================
// Ledger Entry
// ============================================================================
export const Direction = z.enum(['debit', 'credit']);
export type Direction = z.infer<typeof Direction>;

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  account_id: z.string().uuid(),
  direction: Direction,
  amount: z.string(), // NUMERIC as string to preserve precision
  currency: z.string().length(3),
  created_at: z.string().datetime(),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// ============================================================================
// Payment
// ============================================================================
export const PaymentDirection = z.enum(['inbound', 'outbound']);
export type PaymentDirection = z.infer<typeof PaymentDirection>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  external_id: z.string().optional(),
  psp: z.string().optional(),
  amount: z.string(),
  currency: z.string().length(3),
  status: z.string(),
  direction: PaymentDirection,
  payer_info: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// ============================================================================
// Domain Events
// ============================================================================
export const EventType = z.enum([
  // Financial
  'PaymentCreated',
  'PaymentAuthorized',
  'PaymentFailed',
  'PaymentTriggered',
  'SplitExecuted',
  'LedgerCommitted',
  'ComplianceFlagged',
  'ComplianceCleared',
  'PayoutExecuted',
  'Reconciled',
  'IntercompanySettled',
  // QuixZoom
  'ImageCaptured',
  'ImageValidated',
  'TaskCompleted',
  'WalletUpdated',
  'IRCreated',
  'IRPurchased',
  'StreakUpdated',
  'LevelUpgraded',
  'DemandProcessed',
]);
export type EventType = z.infer<typeof EventType>;

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  entity_id: z.string().uuid().optional(),
  aggregate_type: z.string(),
  aggregate_id: z.string().uuid(),
  event_type: EventType,
  version: z.number().int().positive(),
  payload: z.record(z.unknown()),
  created_at: z.string().datetime(),
});
export type DomainEvent = z.infer<typeof DomainEventSchema>;

// ============================================================================
// Compliance
// ============================================================================
export const Severity = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof Severity>;

export const ComplianceFlagSchema = z.object({
  id: z.string().uuid(),
  entity_id: z.string().uuid().optional(),
  transaction_id: z.string().uuid().optional(),
  rule: z.string(),
  severity: Severity,
  status: z.enum(['open', 'acknowledged', 'resolved', 'escalated']),
  details: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type ComplianceFlag = z.infer<typeof ComplianceFlagSchema>;

// ============================================================================
// API Input schemas
// ============================================================================
export const CreatePaymentInput = z.object({
  entity_id: z.string().uuid(),
  amount: z.string().refine(v => parseFloat(v) > 0, 'Amount must be positive'),
  currency: z.string().length(3),
  direction: PaymentDirection,
  psp: z.string().optional(),
  reference: z.string().optional(),
  payer_info: z.record(z.unknown()).optional(),
  idempotency_key: z.string().optional(),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentInput>;

export const CreateEntityInput = z.object({
  name: z.string().min(1),
  jurisdiction: z.string().min(2).max(3),
  base_currency: z.string().length(3),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateEntityInput = z.infer<typeof CreateEntityInput>;

export const CreateAccountInput = z.object({
  entity_id: z.string().uuid(),
  type: AccountType,
  currency: z.string().length(3),
  label: z.string().optional(),
});
export type CreateAccountInput = z.infer<typeof CreateAccountInput>;

// ============================================================================
// QuixZoom — Creator
// ============================================================================
export const CreatorMode = z.enum(['beginner', 'hobby', 'creative', 'professional', 'elite']);
export type CreatorMode = z.infer<typeof CreatorMode>;

export const CreateUserInput = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
  phone: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserInput>;

// ============================================================================
// QuixZoom — Task
// ============================================================================
export const TaskCategory = z.enum([
  'storefront', 'facade', 'signage', 'interior',
  'landscape', 'infrastructure', 'vehicle', 'event', 'custom',
]);
export type TaskCategory = z.infer<typeof TaskCategory>;

export const CreateTaskInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: TaskCategory,
  required_images: z.number().int().positive().default(1),
  payout_amount: z.number().positive(),
  currency: z.string().length(3).default('SEK'),
  tier: z.number().int().min(1).max(6).default(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius_meters: z.number().int().positive().default(200),
  address: z.string().optional(),
  area_name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('SE'),
  priority: z.number().int().default(0),
  expires_at: z.string().datetime().optional(),
});
export type CreateTaskApiInput = z.infer<typeof CreateTaskInput>;

// ============================================================================
// QuixZoom — IR
// ============================================================================
export const CreateIRInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  area_name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  price_type: z.enum(['free', 'one_time', 'subscription', 'custom']).default('one_time'),
  price: z.number().min(0).default(0),
  subscription_monthly: z.number().optional(),
});
export type CreateIRApiInput = z.infer<typeof CreateIRInput>;

// ============================================================================
// QuixZoom — Demand
// ============================================================================
export const DemandQueryInput = z.object({
  query_text: z.string().min(1),
  requester_id: z.string().uuid().optional(),
});
export type DemandQueryInput = z.infer<typeof DemandQueryInput>;

// ============================================================================
// QuixZoom — Withdrawal
// ============================================================================
export const WithdrawInput = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('SEK'),
  method: z.enum(['instant', 'batch', 'bank_transfer']),
  destination: z.record(z.unknown()),
});
export type WithdrawInput = z.infer<typeof WithdrawInput>;
