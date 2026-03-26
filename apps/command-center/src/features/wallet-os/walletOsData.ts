// ─── Wallet OS Data Layer ────────────────────────────────────────────────────
// Real-time payout system + Intelligence Repos marketplace + gamification.
// Zero latency payouts via pre-funded wallets.
// Event-driven: ImageApproved → TaskCompleted → PaymentTriggered → WalletUpdated

// ─── LEVEL SYSTEM ───────────────────────────────────────────────────────────

export type UserLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface LevelDefinition {
  level: UserLevel
  name: string
  icon: string
  color: string
  minXP: number
  maxPayoutPerTask: number        // SEK/USD
  maxTasksPerDay: number
  revenueSplitPct: number         // Creator's share of IR sales
  unlocks: string[]
  streakBonusPct: number          // Extra % for streak jobs
}

export const LEVELS: LevelDefinition[] = [
  {
    level: 1, name: 'Beginner', icon: '○', color: '#6B7280',
    minXP: 0, maxPayoutPerTask: 15, maxTasksPerDay: 5,
    revenueSplitPct: 50, streakBonusPct: 0,
    unlocks: ['Basic tasks', 'Photo capture', 'Wallet'],
  },
  {
    level: 2, name: 'Hobby', icon: '◎', color: '#22D3EE',
    minXP: 100, maxPayoutPerTask: 25, maxTasksPerDay: 10,
    revenueSplitPct: 55, streakBonusPct: 5,
    unlocks: ['Streak jobs', 'Area selection', 'Basic analytics'],
  },
  {
    level: 3, name: 'Explorer', icon: '◈', color: '#10B981',
    minXP: 500, maxPayoutPerTask: 40, maxTasksPerDay: 20,
    revenueSplitPct: 60, streakBonusPct: 10,
    unlocks: ['Route optimization', 'Priority tasks', 'IR preview'],
  },
  {
    level: 4, name: 'Creative', icon: '◆', color: '#F59E0B',
    minXP: 2000, maxPayoutPerTask: 60, maxTasksPerDay: 30,
    revenueSplitPct: 65, streakBonusPct: 15,
    unlocks: ['Create IR', 'AI analysis', 'Lead scoring', 'Exclusive areas'],
  },
  {
    level: 5, name: 'Professional', icon: '◉', color: '#8B5CF6',
    minXP: 10000, maxPayoutPerTask: 100, maxTasksPerDay: 50,
    revenueSplitPct: 70, streakBonusPct: 20,
    unlocks: ['Premium IR marketplace', 'Custom pricing', 'API access', 'Team building'],
  },
  {
    level: 6, name: 'Elite', icon: '★', color: '#EC4899',
    minXP: 50000, maxPayoutPerTask: 200, maxTasksPerDay: 100,
    revenueSplitPct: 80, streakBonusPct: 30,
    unlocks: ['White-label', 'Enterprise clients', 'Revenue share from referrals', 'Guaranteed minimum'],
  },
]

// ─── WALLET ─────────────────────────────────────────────────────────────────

export type WalletTxType = 'task-payout' | 'ir-sale' | 'streak-bonus' | 'withdrawal' | 'investment' | 'refund' | 'fee'
export type WalletTxStatus = 'completed' | 'pending' | 'processing' | 'failed'

export interface WalletBalance {
  available: number
  pending: number       // Awaiting validation
  locked: number        // Invested in IR / held
  currency: string
  totalEarned: number
  totalWithdrawn: number
}

export interface WalletTransaction {
  id: string
  type: WalletTxType
  amount: number
  currency: string
  status: WalletTxStatus
  description: string
  taskId: string | null
  irId: string | null
  createdAt: string
}

export interface PayoutRail {
  id: string
  name: string
  region: string
  speed: string
  fee: string
  minAmount: number
  status: 'active' | 'planned'
}

export const PAYOUT_RAILS: PayoutRail[] = [
  { id: 'sepa-instant', name: 'SEPA Instant', region: 'EU', speed: '<10 seconds', fee: '€0.20', minAmount: 1, status: 'planned' },
  { id: 'sepa-batch', name: 'SEPA Batch', region: 'EU', speed: '1-2 business days', fee: '€0.05', minAmount: 5, status: 'planned' },
  { id: 'rtp', name: 'RTP (Real-Time Payments)', region: 'US', speed: '<10 seconds', fee: '$0.25', minAmount: 1, status: 'planned' },
  { id: 'ach', name: 'ACH Same-Day', region: 'US', speed: 'Same day', fee: '$0.10', minAmount: 5, status: 'planned' },
  { id: 'swish', name: 'Swish', region: 'SE', speed: 'Instant', fee: '0 SEK', minAmount: 1, status: 'planned' },
  { id: 'stripe-instant', name: 'Stripe Instant Payout', region: 'Global', speed: 'Minutes', fee: '1%', minAmount: 10, status: 'active' },
]

// ─── TASK ENGINE ────────────────────────────────────────────────────────────

export type TaskStatus = 'available' | 'claimed' | 'in-progress' | 'validating' | 'completed' | 'rejected' | 'expired'
export type TaskType = 'photo-capture' | 'data-collection' | 'verification' | 'survey' | 'ir-contribution'
export type ValidationMethod = 'ai-auto' | 'peer-review' | 'client-review' | 'hybrid'

export interface Task {
  id: string
  type: TaskType
  title: string
  description: string
  location: { lat: number; lng: number; address: string; radius: number }
  payout: number
  currency: string
  status: TaskStatus
  requiredLevel: UserLevel
  timeLimit: number           // minutes
  validationMethod: ValidationMethod
  requiredImages: number
  tags: string[]
  demandSource: string | null // Who triggered the demand
  streakEligible: boolean
  xpReward: number
}

export interface TaskEvent {
  event: string
  timestamp: string
  data: Record<string, any>
}

// ─── Event flow for a task
export const TASK_EVENT_FLOW: { event: string; description: string; color: string }[] = [
  { event: 'TaskCreated', description: 'Task published to marketplace', color: '#6B7280' },
  { event: 'TaskClaimed', description: 'User claims task', color: '#22D3EE' },
  { event: 'ImageCaptured', description: 'Photo taken at location', color: '#0EA5E9' },
  { event: 'ImageValidated', description: 'AI + rules validate image', color: '#F59E0B' },
  { event: 'TaskCompleted', description: 'All requirements met', color: '#10B981' },
  { event: 'PaymentTriggered', description: 'Instant ledger commit', color: '#8B5CF6' },
  { event: 'WalletUpdated', description: 'User wallet credited', color: '#EC4899' },
  { event: 'NotificationSent', description: 'Push notification to user', color: '#10B981' },
]

// ─── SAMPLE TASKS ───────────────────────────────────────────────────────────

export const SAMPLE_TASKS: Task[] = [
  {
    id: 'task-1', type: 'photo-capture', title: 'Skyltfönster Södermalm',
    description: 'Fotografera alla skyltfönster på Götgatan 1-50. Varje fönster = 1 bild. AI validerar automatiskt.',
    location: { lat: 59.316, lng: 18.074, address: 'Götgatan, Södermalm, Stockholm', radius: 500 },
    payout: 35, currency: 'SEK', status: 'available', requiredLevel: 2,
    timeLimit: 120, validationMethod: 'ai-auto', requiredImages: 25,
    tags: ['skyltfönster', 'retail', 'södermalm'], demandSource: 'Search: "skyltfönster södermalm"',
    streakEligible: true, xpReward: 50,
  },
  {
    id: 'task-2', type: 'data-collection', title: 'Träfasader Långsjövägen',
    description: 'Dokumentera alla träfasader. Fotografera + notera skick (1-5). Lead-generation för fasadföretag.',
    location: { lat: 59.298, lng: 18.102, address: 'Långsjövägen, Enskede, Stockholm', radius: 300 },
    payout: 50, currency: 'SEK', status: 'available', requiredLevel: 3,
    timeLimit: 90, validationMethod: 'hybrid', requiredImages: 15,
    tags: ['fasad', 'trä', 'renovation'], demandSource: 'AI: "renovationspotential hög i området"',
    streakEligible: true, xpReward: 80,
  },
  {
    id: 'task-3', type: 'photo-capture', title: 'Smutsiga fönster Vasastan',
    description: 'Hitta och fotografera smutsiga fönster. AI bedömer smutsnivå. Data säljs till fönsterputsare.',
    location: { lat: 59.342, lng: 18.050, address: 'Vasastan, Stockholm', radius: 800 },
    payout: 25, currency: 'SEK', status: 'available', requiredLevel: 1,
    timeLimit: 60, validationMethod: 'ai-auto', requiredImages: 20,
    tags: ['fönster', 'smutsiga', 'fönsterputsare'], demandSource: null,
    streakEligible: true, xpReward: 30,
  },
  {
    id: 'task-4', type: 'survey', title: 'Butiksinventering Kungsholmen',
    description: 'Gå förbi och dokumentera butiker: namn, typ, öppettider, kontaktinfo. Lead-data för B2B.',
    location: { lat: 59.332, lng: 18.028, address: 'Kungsholmen, Stockholm', radius: 600 },
    payout: 75, currency: 'SEK', status: 'available', requiredLevel: 4,
    timeLimit: 180, validationMethod: 'peer-review', requiredImages: 30,
    tags: ['butiker', 'B2B', 'leads'], demandSource: 'Client: MarketFirm AB',
    streakEligible: false, xpReward: 120,
  },
]

// ─── STREAK SYSTEM ──────────────────────────────────────────────────────────

export interface StreakDefinition {
  id: string
  name: string
  requiredTasks: number
  timeWindow: string        // "24h", "7d", etc.
  bonusPct: number
  unlocks: string[]
  color: string
}

export const STREAK_DEFINITIONS: StreakDefinition[] = [
  { id: 'streak-3', name: 'Warming Up', requiredTasks: 3, timeWindow: '24h', bonusPct: 5, unlocks: ['Higher payout tier'], color: '#F59E0B' },
  { id: 'streak-5', name: 'On Fire', requiredTasks: 5, timeWindow: '24h', bonusPct: 10, unlocks: ['Larger areas', 'Priority queue'], color: '#EF4444' },
  { id: 'streak-10', name: 'Unstoppable', requiredTasks: 10, timeWindow: '48h', bonusPct: 20, unlocks: ['Exclusive tasks', 'Double XP'], color: '#8B5CF6' },
  { id: 'streak-7d', name: 'Weekly Warrior', requiredTasks: 7, timeWindow: '7d', bonusPct: 15, unlocks: ['Weekly bonus', 'IR creation boost'], color: '#10B981' },
  { id: 'streak-30d', name: 'Legendary', requiredTasks: 30, timeWindow: '30d', bonusPct: 30, unlocks: ['Guaranteed minimum', 'Custom tasks', 'VIP support'], color: '#EC4899' },
]

// ─── INTELLIGENCE REPOS (IR) ────────────────────────────────────────────────

export type IRStatus = 'draft' | 'collecting' | 'analyzing' | 'published' | 'sold' | 'archived'
export type IRCategory = 'retail' | 'real-estate' | 'infrastructure' | 'advertising' | 'municipal' | 'custom'

export interface IntelligenceRepo {
  id: string
  title: string
  description: string
  category: IRCategory
  creatorLevel: UserLevel
  status: IRStatus
  location: { area: string; city: string; country: string }
  dataPoints: number
  images: number
  aiAnalysis: AIAnalysisResult[]
  pricing: IRPricing
  buyers: number
  totalRevenue: number
  createdAt: string
}

export interface AIAnalysisResult {
  type: string             // 'facade-condition', 'window-cleanliness', 'lead-score', 'footfall-estimate'
  score: number            // 0-100
  confidence: number       // 0-100
  insight: string
}

export interface IRPricing {
  oneTimePurchase: number | null
  subscriptionMonthly: number | null
  perDataPoint: number | null
  currency: string
}

export const SAMPLE_IRS: IntelligenceRepo[] = [
  {
    id: 'ir-1',
    title: 'Skyltfönster Södermalm Q1 2026',
    description: 'Komplett kartläggning av 450+ skyltfönster på Södermalm. Inkluderar fasadbilder, skickbedömning (AI), kontaktmöjligheter, och lead scoring för fönsterputsare/reklam.',
    category: 'retail',
    creatorLevel: 4,
    status: 'published',
    location: { area: 'Södermalm', city: 'Stockholm', country: 'SE' },
    dataPoints: 456,
    images: 1200,
    aiAnalysis: [
      { type: 'window-cleanliness', score: 34, confidence: 89, insight: '66% av fönstren har tydligt behov av puts (score < 40)' },
      { type: 'lead-score', score: 78, confidence: 82, insight: '78% av butikerna = potentiella kunder för fönsterputsning' },
      { type: 'footfall-estimate', score: 85, confidence: 75, insight: 'Högt fotgängarflöde → hög visibilitet för reklam' },
    ],
    pricing: { oneTimePurchase: 4900, subscriptionMonthly: 990, perDataPoint: 15, currency: 'SEK' },
    buyers: 3,
    totalRevenue: 14700,
    createdAt: '2026-02-15',
  },
  {
    id: 'ir-2',
    title: 'Träfasader Söderort — Renoveringspotential',
    description: 'AI-analyserade träfasader i Enskede/Farsta/Skarpnäck. Skickbedömning, materialtyp, uppskattad renoveringskostnad. Perfekt för entreprenörer.',
    category: 'real-estate',
    creatorLevel: 5,
    status: 'published',
    location: { area: 'Söderort', city: 'Stockholm', country: 'SE' },
    dataPoints: 289,
    images: 870,
    aiAnalysis: [
      { type: 'facade-condition', score: 42, confidence: 91, insight: '58% av fasaderna bedöms som "renoveringsbehov" (score < 50)' },
      { type: 'lead-score', score: 65, confidence: 78, insight: 'Hög sannolikhet för renoveringsuppdrag inom 12 mån' },
    ],
    pricing: { oneTimePurchase: 7900, subscriptionMonthly: null, perDataPoint: 30, currency: 'SEK' },
    buyers: 1,
    totalRevenue: 7900,
    createdAt: '2026-03-01',
  },
  {
    id: 'ir-3',
    title: 'Municipal Infrastructure Scan — Kungsholmen',
    description: 'Vägar, trottoarer, belysning, bänkar. Tillståndsbedömning via AI. Redo för kommunal upphandling.',
    category: 'municipal',
    creatorLevel: 5,
    status: 'collecting',
    location: { area: 'Kungsholmen', city: 'Stockholm', country: 'SE' },
    dataPoints: 120,
    images: 340,
    aiAnalysis: [
      { type: 'infrastructure-condition', score: 55, confidence: 85, insight: 'Medelskick — 45% behöver underhåll inom 2 år' },
    ],
    pricing: { oneTimePurchase: 15000, subscriptionMonthly: 2500, perDataPoint: 50, currency: 'SEK' },
    buyers: 0,
    totalRevenue: 0,
    createdAt: '2026-03-10',
  },
]

// ─── DEMAND-DRIVEN TASK GENERATION ──────────────────────────────────────────

export interface DemandSignal {
  id: string
  source: 'search' | 'client' | 'ai-prediction' | 'seasonal'
  query: string
  area: string
  urgency: 'low' | 'medium' | 'high'
  tasksGenerated: number
  estimatedValue: number
  currency: string
  status: 'active' | 'fulfilled' | 'expired'
}

export const DEMAND_SIGNALS: DemandSignal[] = [
  { id: 'ds-1', source: 'search', query: 'skyltfönster södermalm', area: 'Södermalm, Stockholm', urgency: 'high', tasksGenerated: 3, estimatedValue: 4900, currency: 'SEK', status: 'active' },
  { id: 'ds-2', source: 'client', query: 'Fasadföretag X: "träfasader enskede"', area: 'Enskede, Stockholm', urgency: 'high', tasksGenerated: 2, estimatedValue: 7900, currency: 'SEK', status: 'active' },
  { id: 'ds-3', source: 'ai-prediction', query: 'Seasonal: fönsterputsning vår 2026', area: 'Hela Stockholm', urgency: 'medium', tasksGenerated: 15, estimatedValue: 45000, currency: 'SEK', status: 'active' },
  { id: 'ds-4', source: 'search', query: 'träfasader långsjövägen', area: 'Långsjövägen, Stockholm', urgency: 'medium', tasksGenerated: 1, estimatedValue: 2500, currency: 'SEK', status: 'fulfilled' },
]

// ─── MOCK USER STATE ────────────────────────────────────────────────────────

export interface UserState {
  id: string
  name: string
  level: UserLevel
  xp: number
  wallet: WalletBalance
  currentStreak: number
  longestStreak: number
  tasksCompleted: number
  irsCreated: number
  recentTransactions: WalletTransaction[]
}

export const MOCK_USER: UserState = {
  id: 'user-1',
  name: 'Alex Johansson',
  level: 3,
  xp: 1850,
  wallet: {
    available: 1245,
    pending: 350,
    locked: 500,
    currency: 'SEK',
    totalEarned: 8900,
    totalWithdrawn: 6805,
  },
  currentStreak: 4,
  longestStreak: 12,
  tasksCompleted: 67,
  irsCreated: 1,
  recentTransactions: [
    { id: 'tx-1', type: 'task-payout', amount: 35, currency: 'SEK', status: 'completed', description: 'Skyltfönster Södermalm', taskId: 'task-1', irId: null, createdAt: '2026-03-26T08:15:00Z' },
    { id: 'tx-2', type: 'streak-bonus', amount: 17.5, currency: 'SEK', status: 'completed', description: 'Streak bonus (5 in a row) +10%', taskId: null, irId: null, createdAt: '2026-03-26T08:15:01Z' },
    { id: 'tx-3', type: 'ir-sale', amount: 990, currency: 'SEK', status: 'completed', description: 'IR sale: Skyltfönster Södermalm (subscription)', taskId: null, irId: 'ir-1', createdAt: '2026-03-25T14:30:00Z' },
    { id: 'tx-4', type: 'task-payout', amount: 50, currency: 'SEK', status: 'completed', description: 'Träfasader Långsjövägen', taskId: 'task-2', irId: null, createdAt: '2026-03-25T11:00:00Z' },
    { id: 'tx-5', type: 'withdrawal', amount: -500, currency: 'SEK', status: 'completed', description: 'Withdrawal → Swish', taskId: null, irId: null, createdAt: '2026-03-24T16:00:00Z' },
    { id: 'tx-6', type: 'task-payout', amount: 25, currency: 'SEK', status: 'pending', description: 'Smutsiga fönster Vasastan (validating)', taskId: 'task-3', irId: null, createdAt: '2026-03-26T09:00:00Z' },
  ],
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getLevelDef(level: UserLevel): LevelDefinition {
  return LEVELS.find(l => l.level === level) ?? LEVELS[0]
}

export function getNextLevel(level: UserLevel): LevelDefinition | null {
  return LEVELS.find(l => l.level === (level + 1) as UserLevel) ?? null
}

export function getLevelProgress(xp: number, level: UserLevel): number {
  const current = getLevelDef(level)
  const next = getNextLevel(level)
  if (!next) return 100
  return Math.min(100, Math.round(((xp - current.minXP) / (next.minXP - current.minXP)) * 100))
}

export function getActiveStreak(completedInWindow: number): StreakDefinition | null {
  // Return highest qualifying streak
  return [...STREAK_DEFINITIONS].reverse().find(s => completedInWindow >= s.requiredTasks) ?? null
}
