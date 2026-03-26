/**
 * QuixZoom SDK — Typed client for the enterprise platform.
 *
 * Two clients:
 *   const qx = createFinancialClient({ baseUrl: '/api/qx' });  // ledger, payments, compliance
 *   const qz = createPlatformClient({ baseUrl: '/api/qz' });   // users, tasks, wallet, IR, AI
 */

// ============================================================================
// Config
// ============================================================================

export interface SdkConfig {
  baseUrl: string;
  actor?: string;
  headers?: Record<string, string>;
}

async function request(config: SdkConfig, method: string, path: string, body?: unknown) {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-actor': config.actor ?? 'sdk',
      ...config.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`QuixZoom ${method} ${path}: ${err.error ?? res.statusText}`);
  }

  return res.json();
}

// ============================================================================
// Financial API Types (Quixoom Core — /api/qx)
// ============================================================================

export interface CreateEntityParams {
  name: string;
  jurisdiction: string;
  base_currency: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAccountParams {
  entity_id: string;
  type: 'customer' | 'treasury' | 'revenue' | 'payable' | 'receivable' | 'suspense' | 'fee' | 'fx';
  currency: string;
  label?: string;
}

export interface CreatePaymentParams {
  entity_id: string;
  amount: string;
  currency: string;
  direction: 'inbound' | 'outbound';
  psp?: string;
  reference?: string;
  payer_info?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface LedgerLine {
  account_id: string;
  direction: 'debit' | 'credit';
  amount: string;
  currency: string;
}

export interface CommitLedgerParams {
  entity_id: string;
  type: string;
  reference?: string;
  idempotency_key?: string;
  lines: LedgerLine[];
}

export interface ReconcileParams {
  payment_id: string;
  external_amount: string;
}

export interface IntercompanyUpdateParams {
  from_entity: string;
  to_entity: string;
  currency: string;
  amount: string;
}

// ============================================================================
// Platform API Types (QuixZoom — /api/qz)
// ============================================================================

export interface CreateUserParams {
  email: string;
  display_name: string;
  phone?: string;
  location?: { lat: number; lng: number; city?: string; country?: string };
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  category: string;
  required_images?: number;
  payout_amount: number;
  currency?: string;
  tier?: number;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  address?: string;
  area_name?: string;
  city?: string;
  priority?: number;
  expires_at?: string;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  tier?: number;
}

export interface WithdrawParams {
  amount: number;
  currency?: string;
  method: 'instant' | 'batch' | 'bank_transfer';
  destination: Record<string, unknown>;
}

export interface CreateIRParams {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  area_name?: string;
  city?: string;
  country?: string;
  price_type?: 'free' | 'one_time' | 'subscription' | 'custom';
  price?: number;
  subscription_monthly?: number;
}

export interface AddIRItemParams {
  image_id?: string;
  title?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  captured_at?: string;
  ai_category?: string;
  ai_condition?: string;
  ai_score?: number;
  lead_score?: number;
  properties?: Record<string, unknown>;
}

export interface PurchaseIRParams {
  buyer_id?: string;
  buyer_email?: string;
  buyer_company?: string;
}

export interface DemandQueryParams {
  query_text: string;
  requester_id?: string;
}

export interface LeadScoreParams {
  ai_condition: string;
  ai_category: string;
  ai_score: number;
  location: { lat: number; lng: number };
  business_density?: number;
  last_service_date?: string;
}

export interface RouteParams {
  current_location: { lat: number; lng: number };
  tasks: Array<{ id: string; lat: number; lng: number; payout: number; priority: number }>;
  max_duration_mins?: number;
}

export interface CaptureImageParams {
  assignment_id: string;
  user_id: string;
  task_id: string;
  storage_key: string;
  storage_bucket: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy_meters?: number;
  heading?: number;
}

// ============================================================================
// Financial Client (Quixoom Core)
// ============================================================================

export function createFinancialClient(config: SdkConfig) {
  return {
    // Entities
    createEntity: (params: CreateEntityParams) =>
      request(config, 'POST', '/entities', params),
    listEntities: () =>
      request(config, 'GET', '/entities'),

    // Accounts
    createAccount: (params: CreateAccountParams) =>
      request(config, 'POST', '/accounts', params),
    listAccounts: (entityId: string) =>
      request(config, 'GET', `/accounts/${entityId}`),
    getAccountBalance: (accountId: string) =>
      request(config, 'GET', `/accounts/${accountId}/balance`),

    // Payments
    createPayment: (params: CreatePaymentParams) =>
      request(config, 'POST', '/payments', params),
    approvePayment: (paymentId: string) =>
      request(config, 'POST', `/payments/${paymentId}/approve`),

    // Ledger
    commitLedger: (params: CommitLedgerParams) =>
      request(config, 'POST', '/ledger/commit', params),

    // Reconciliation
    reconcile: (params: ReconcileParams) =>
      request(config, 'POST', '/reconcile', params),

    // Intercompany
    getIntercompanyPositions: (entityId: string) =>
      request(config, 'GET', `/intercompany/${entityId}`),
    updateIntercompanyPosition: (params: IntercompanyUpdateParams) =>
      request(config, 'POST', '/intercompany/update', params),
    getNetting: (currency: string) =>
      request(config, 'GET', `/intercompany/netting/${currency}`),

    // Audit
    getAuditLog: (entityId: string, limit?: number) =>
      request(config, 'GET', `/audit/${entityId}?limit=${limit ?? 100}`),

    // Compliance
    getComplianceFlags: (status?: string) =>
      request(config, 'GET', `/compliance/flags?status=${status ?? 'open'}`),
  };
}

// ============================================================================
// Platform Client (QuixZoom)
// ============================================================================

export function createPlatformClient(config: SdkConfig) {
  return {
    // Users
    createUser: (params: CreateUserParams) =>
      request(config, 'POST', '/users', params),
    getUser: (userId: string) =>
      request(config, 'GET', `/users/${userId}`),
    setMode: (userId: string, mode: string) =>
      request(config, 'PATCH', `/users/${userId}/mode`, { mode }),

    // Wallet
    getWallet: (userId: string) =>
      request(config, 'GET', `/wallet/${userId}`),
    getWalletTransactions: (userId: string, limit?: number) =>
      request(config, 'GET', `/wallet/${userId}/transactions?limit=${limit ?? 50}`),
    withdraw: (userId: string, params: WithdrawParams) =>
      request(config, 'POST', `/wallet/${userId}/withdraw`, params),

    // Levels & Streaks
    getLevels: () =>
      request(config, 'GET', '/levels'),
    getStreak: (userId: string) =>
      request(config, 'GET', `/streak/${userId}`),

    // Tasks
    createTask: (params: CreateTaskParams) =>
      request(config, 'POST', '/tasks', params),
    findNearbyTasks: (query: NearbyQuery) => {
      const qs = new URLSearchParams({
        lat: query.lat.toString(),
        lng: query.lng.toString(),
        ...(query.radius && { radius: query.radius.toString() }),
        ...(query.category && { category: query.category }),
        ...(query.tier && { tier: query.tier.toString() }),
      });
      return request(config, 'GET', `/tasks/nearby?${qs}`);
    },
    assignTask: (taskId: string, userId: string) =>
      request(config, 'POST', `/tasks/${taskId}/assign`, { user_id: userId }),
    submitAssignment: (assignmentId: string) =>
      request(config, 'POST', `/tasks/assignments/${assignmentId}/submit`),
    approveAssignment: (assignmentId: string) =>
      request(config, 'POST', `/tasks/assignments/${assignmentId}/approve`),
    rejectAssignment: (assignmentId: string, reason: string) =>
      request(config, 'POST', `/tasks/assignments/${assignmentId}/reject`, { reason }),

    // Images
    captureImage: (params: CaptureImageParams) =>
      request(config, 'POST', '/images', params),
    analyzeImage: (imageId: string) =>
      request(config, 'POST', `/images/${imageId}/analyze`),

    // Intelligence Repos
    createIR: (params: CreateIRParams) =>
      request(config, 'POST', '/ir', params),
    getIR: (repoId: string) =>
      request(config, 'GET', `/ir/${repoId}`),
    addIRItem: (repoId: string, params: AddIRItemParams) =>
      request(config, 'POST', `/ir/${repoId}/items`, params),
    publishIR: (repoId: string) =>
      request(config, 'POST', `/ir/${repoId}/publish`),
    purchaseIR: (repoId: string, params: PurchaseIRParams) =>
      request(config, 'POST', `/ir/${repoId}/purchase`, params),
    searchIR: (query?: string, category?: string, city?: string) => {
      const qs = new URLSearchParams({
        ...(query && { q: query }),
        ...(category && { category }),
        ...(city && { city }),
      });
      return request(config, 'GET', `/ir/search?${qs}`);
    },

    // Demand Engine
    submitDemand: (params: DemandQueryParams) =>
      request(config, 'POST', '/demand', params),
    parseDemand: (queryText: string) =>
      request(config, 'GET', `/demand/parse?q=${encodeURIComponent(queryText)}`),

    // AI
    getLeadScore: (params: LeadScoreParams) =>
      request(config, 'POST', '/ai/lead-score', params),
    getOptimalRoute: (params: RouteParams) =>
      request(config, 'POST', '/ai/route', params),

    // Geo
    getCoverage: (points: Array<{ lat: number; lng: number }>, boundingBox: unknown, gridSize?: number) =>
      request(config, 'POST', '/geo/coverage', { points, bounding_box: boundingBox, grid_size_meters: gridSize }),
    getGapZones: (existingPoints: Array<{ lat: number; lng: number }>, boundingBox: unknown, gridSize?: number) =>
      request(config, 'POST', '/geo/gaps', { existing_points: existingPoints, bounding_box: boundingBox, grid_size_meters: gridSize }),
  };
}

// ============================================================================
// CIS Types (Creative Intelligence System — /api/cis)
// ============================================================================

export interface ValueAssessParams {
  latitude: number;
  longitude: number;
  area_name?: string;
  city?: string;
  area_type?: 'residential' | 'commercial' | 'industrial' | 'mixed';
  category: string;
}

export interface GeneratePackagesParams {
  latitude: number;
  longitude: number;
  max_packages?: number;
  max_radius_km?: number;
  preferred_categories?: string[];
}

export interface CreateListingParams {
  ir_id: string;
  title: string;
  headline?: string;
  description?: string;
  cover_image_key?: string;
  price_type: 'free' | 'one_time' | 'subscription' | 'lead_based';
  price?: number;
  subscription_monthly?: number;
  price_per_lead?: number;
}

export interface MarketplaceSearchParams {
  q?: string;
  category?: string;
  city?: string;
  area_name?: string;
  buyer_segment?: string;
  price_max?: number;
  min_rating?: number;
  sort?: 'relevance' | 'price_low' | 'price_high' | 'newest' | 'popular';
  limit?: number;
  offset?: number;
}

export interface MarketplacePurchaseParams {
  buyer_id: string;
  listing_id: string;
  payment_type: 'one_time' | 'subscription' | 'lead';
  leads_requested?: number;
}

export interface PayoutCalcParams {
  base_payout_per_image: number;
  image_count: number;
  value_score: number;
  streak_multiplier: number;
  level_revenue_share_pct: number;
  completion_time_mins?: number;
  deadline_mins?: number;
  avg_ai_quality_score?: number;
}

// ============================================================================
// CIS Client (Creative Intelligence System)
// ============================================================================

export function createCISClient(config: SdkConfig) {
  return {
    // Value Discovery Engine
    assessValue: (params: ValueAssessParams) =>
      request(config, 'POST', '/value/assess', params),
    batchAssessValue: (areas: ValueAssessParams[]) =>
      request(config, 'POST', '/value/batch', { areas }),
    recordDemandSignal: (params: { category: string; area_name?: string; city?: string; signal_type: string; latitude?: number; longitude?: number }) =>
      request(config, 'POST', '/value/signal', params),

    // Photo Packages (Creative Engine)
    generatePackages: (params: GeneratePackagesParams) =>
      request(config, 'POST', '/packages/generate', params),
    getNearbyPackages: (lat: number, lng: number, radius?: number, tier?: number) => {
      const qs = new URLSearchParams({
        lat: lat.toString(), lng: lng.toString(),
        ...(radius && { radius: radius.toString() }),
        ...(tier && { tier: tier.toString() }),
      });
      return request(config, 'GET', `/packages/nearby?${qs}`);
    },
    claimPackage: (packageId: string) =>
      request(config, 'POST', `/packages/${packageId}/claim`),
    completePackage: (packageId: string) =>
      request(config, 'POST', `/packages/${packageId}/complete`),
    getTemplates: () =>
      request(config, 'GET', '/templates'),

    // Pricing Engine
    calculatePayout: (params: PayoutCalcParams) =>
      request(config, 'POST', '/pricing/payout', params),
    getIRPriceSuggestion: (repoId: string) =>
      request(config, 'GET', `/pricing/ir/${repoId}`),
    getLeadPricing: (listingId: string) =>
      request(config, 'GET', `/pricing/leads/${listingId}`),

    // Marketplace
    createListing: (params: CreateListingParams) =>
      request(config, 'POST', '/marketplace/listings', params),
    getListing: (listingId: string) =>
      request(config, 'GET', `/marketplace/listings/${listingId}`),
    extractLeads: (listingId: string) =>
      request(config, 'POST', `/marketplace/listings/${listingId}/extract-leads`),
    searchMarketplace: (params: MarketplaceSearchParams) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.category) qs.set('category', params.category);
      if (params.city) qs.set('city', params.city);
      if (params.area_name) qs.set('area_name', params.area_name);
      if (params.buyer_segment) qs.set('buyer_segment', params.buyer_segment);
      if (params.price_max) qs.set('price_max', params.price_max.toString());
      if (params.sort) qs.set('sort', params.sort);
      if (params.limit) qs.set('limit', params.limit.toString());
      if (params.offset) qs.set('offset', params.offset.toString());
      return request(config, 'GET', `/marketplace/search?${qs}`);
    },
    purchaseFromMarketplace: (params: MarketplacePurchaseParams) =>
      request(config, 'POST', '/marketplace/purchase', params),

    // Demand Intelligence
    getTopDemandAreas: (limit?: number) =>
      request(config, 'GET', `/demand/top?limit=${limit ?? 20}`),
  };
}

// ============================================================================
// Convenience: combined client
// ============================================================================

export function createQuixZoomClient(config: {
  financialBaseUrl: string;
  platformBaseUrl: string;
  cisBaseUrl: string;
  actor?: string;
  headers?: Record<string, string>;
}) {
  const common = { actor: config.actor, headers: config.headers };
  return {
    financial: createFinancialClient({ baseUrl: config.financialBaseUrl, ...common }),
    platform: createPlatformClient({ baseUrl: config.platformBaseUrl, ...common }),
    cis: createCISClient({ baseUrl: config.cisBaseUrl, ...common }),
  };
}
