/**
 * QMS TypeScript types
 * ISO 9001:2015 / ISO 27001:2022 / GDPR / NIS2
 */

export type QmsStatus =
  | 'not_started'
  | 'in_progress'
  | 'implemented'
  | 'verified'
  | 'not_applicable'

export type MappingType =
  | 'api_route'
  | 'database_table'
  | 'infra'
  | 'policy_doc'
  | 'code_file'
  | 'external_service'

export type HealthStatus = 'healthy' | 'degraded' | 'failing' | 'unknown'

export type EvidenceType =
  | 'screenshot'
  | 'log_sample'
  | 'config'
  | 'certificate'
  | 'policy'
  | 'test_result'

export type AuditType = 'internal' | 'external' | 'surveillance' | 'certification'
export type AuditStatus = 'open' | 'completed' | 'follow_up'
export type AuditResult = 'pass' | 'minor_nc' | 'major_nc' | 'fail'

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface QmsEntity {
  id: string
  slug: string
  name: string
  description: string | null
  scope: string | null
  standard_versions: string[]
  entity_owner: string | null
  created_at: string
  updated_at: string
  stats?: {
    not_started: number
    in_progress: number
    implemented: number
    verified: number
    not_applicable: number
  }
}

// ─── Standards ────────────────────────────────────────────────────────────────

export interface IsoStandard {
  id: string
  code: string
  name: string
  version: string | null
  description: string | null
  total_controls: number
  created_at: string
}

// ─── Controls ─────────────────────────────────────────────────────────────────

export interface IsoControl {
  id: string
  standard_id: string
  clause: string
  title: string
  requirement: string
  guidance: string | null
  category: string | null
  is_mandatory: boolean
  sort_order: number
  created_at: string
  iso_standards?: { code: string; name: string }
  implementation?: QmsImplementation
  mappings?: SystemMapping[]
  evidence?: QmsEvidence[]
}

// ─── Implementations ──────────────────────────────────────────────────────────

export interface QmsImplementation {
  id?: string
  entity_id?: string
  control_id?: string
  status: QmsStatus
  implementation_text?: string | null
  gap_analysis?: string | null
  responsible_person?: string | null
  target_date?: string | null
  verified_at?: string | null
  verified_by?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// ─── System Mappings ──────────────────────────────────────────────────────────

export interface SystemMapping {
  id: string
  implementation_id: string
  mapping_type: MappingType
  label: string
  reference: string
  health_check_url: string | null
  health_check_type: string | null
  last_health_status: HealthStatus | null
  last_health_check: string | null
  created_at: string
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

export interface QmsEvidence {
  id: string
  implementation_id: string
  evidence_type: EvidenceType
  title: string
  content: string | null
  file_url: string | null
  collected_at: string
  collected_by: string | null
  valid_until: string | null
}

// ─── Audit Sessions ───────────────────────────────────────────────────────────

export interface AuditSession {
  id: string
  entity_id: string
  audit_type: AuditType
  auditor_name: string | null
  auditor_org: string | null
  started_at: string
  completed_at: string | null
  status: AuditStatus
  findings: any[]
  overall_result: AuditResult | null
  notes: string | null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface StandardBreakdown {
  code: string
  name: string
  total: number
  implemented: number
  completion_pct: number
}

export interface QmsDashboardData {
  entity: QmsEntity
  stats: {
    total_controls: number
    tracked: number
    not_tracked: number
    not_started: number
    in_progress: number
    implemented: number
    verified: number
    not_applicable: number
  }
  standards: StandardBreakdown[]
  health: {
    healthy: number
    degraded: number
    failing: number
    unknown: number
  }
  recent_activity: any[]
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  checks: Array<{
    id: string
    label: string
    reference: string
    mapping_type: MappingType
    status: HealthStatus
  }>
  summary: {
    healthy: number
    degraded: number
    failing: number
    unknown: number
  }
  checked_at: string
}
