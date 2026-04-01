// ─── Campaign Operating System — data layer ───────────────────────────────────
// Global execution engine: Plan → Budget → Asset → Deploy → Measure → Adjust

export type CampaignChannel = 'linkedin' | 'meta' | 'google' | 'email' | 'outbound' | 'pr' | 'event' | 'sms' | 'reddit'
export type ActivityStatus = 'planned' | 'ready' | 'deployed' | 'failed' | 'paused'
export type BudgetStatus = 'pending' | 'approved' | 'paid' | 'over'
export type KPIResult = 'success' | 'underperform' | 'fail' | 'pending'

export interface CampaignAsset {
  id: string
  type: 'copy' | 'image' | 'video' | 'landing-page' | 'email-template'
  name: string
  ready: boolean
  url?: string
}

export interface CampaignBudget {
  id: string
  cost_monthly: number   // USD
  approved: boolean
  status: BudgetStatus
  spend_to_date: number
}

export interface CampaignAutomation {
  id: string
  trigger: 'cron' | 'webhook' | 'manual'
  schedule?: string   // cron expression if trigger=cron
  channel_api: CampaignChannel
  retry_count: number
  fallback_channel?: CampaignChannel
  last_run?: string   // ISO date
  next_run?: string
}

export interface CampaignKPI {
  metric: 'leads' | 'ctr' | 'revenue' | 'impressions' | 'conversions'
  target: number
  current: number
  result: KPIResult
}

export interface CampaignActivity {
  id: string
  name: string
  brand: 'quixzoom' | 'quixom-ads' | 'landvex' | 'wavult' | 'wavult'
  country: string
  entity_id: string
  site_id: string       // links to MARKET_SITES
  date: string          // ISO date YYYY-MM-DD
  time: string          // HH:MM
  channel: CampaignChannel
  status: ActivityStatus
  asset: CampaignAsset
  budget: CampaignBudget
  automation: CampaignAutomation
  kpi: CampaignKPI
  responsible_role_id: string
  description: string
  alerts: Array<{
    id: string
    severity: 'warning' | 'critical'
    message: string
    action: string
    escalated: boolean
  }>
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isActivityValid(a: CampaignActivity): boolean {
  return a.asset.ready && a.budget.approved && a.kpi.target > 0 && a.automation.trigger !== undefined
}

// ─── Display constants ────────────────────────────────────────────────────────

export const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  linkedin: 'LinkedIn',
  meta: 'Meta Ads',
  google: 'Google',
  email: 'Email',
  outbound: 'Outbound',
  pr: 'PR',
  event: 'Event',
  sms: 'SMS',
  reddit: 'Reddit',
}

export const CHANNEL_COLOR: Record<CampaignChannel, string> = {
  linkedin: '#0A66C2',
  meta: '#1877F2',
  google: '#4285F4',
  email: '#10B981',
  outbound: '#2563EB',
  pr: '#F59E0B',
  event: '#EC4899',
  sms: '#06B6D4',
  reddit: '#FF4500',
}

export const STATUS_COLOR: Record<ActivityStatus, string> = {
  planned: '#6B7280',
  ready: '#F59E0B',
  deployed: '#10B981',
  failed: '#EF4444',
  paused: '#2563EB',
}

export const KPI_COLOR: Record<KPIResult, string> = {
  success: '#10B981',
  underperform: '#F59E0B',
  fail: '#EF4444',
  pending: '#6B7280',
}

// ─── Entity display helpers ───────────────────────────────────────────────────

export const ENTITY_FILTER_OPTIONS: Array<{ id: string; label: string; region: 'EU' | 'US' | 'Global' }> = [
  { id: 'all', label: 'Alla', region: 'Global' },
  { id: 'wavult-group', label: 'Wavult Group', region: 'Global' },
  { id: 'quixzoom-uab', label: 'QuiXzoom (EU)', region: 'EU' },
  { id: 'landvex-inc', label: 'Landvex (US)', region: 'US' },
]

export const ENTITY_COLOR: Record<string, string> = {
  'wavult-group': '#2563EB',
  'quixzoom-uab': '#10B981',
  'landvex-inc': '#F59E0B',
  'wavult': '#60A5FA',
}

export const ENTITY_REGION: Record<string, 'EU' | 'US' | 'Global'> = {
  'wavult-group': 'Global',
  'quixzoom-uab': 'EU',
  'landvex-inc': 'US',
  'wavult': 'EU',
}

// ─── Alert engine ─────────────────────────────────────────────────────────────

export function getActivityAlerts(a: CampaignActivity): CampaignActivity['alerts'] {
  const auto = [...a.alerts]
  if (!a.asset.ready && a.status === 'ready') {
    auto.push({
      id: 'auto-asset',
      severity: 'critical' as const,
      message: 'Asset not ready but status is ready',
      action: 'Upload asset before deploy',
      escalated: false,
    })
  }
  if (a.kpi.current < a.kpi.target * 0.5 && a.status === 'deployed') {
    auto.push({
      id: 'auto-kpi',
      severity: 'warning' as const,
      message: 'KPI below 50% of target',
      action: 'Review channel performance',
      escalated: false,
    })
  }
  return auto
}

// ─── Campaign Activities ──────────────────────────────────────────────────────
// Tom tills kampanjer konfigureras. Koppla Revolut och CRM för live-data.

export const CAMPAIGN_ACTIVITIES: CampaignActivity[] = []

