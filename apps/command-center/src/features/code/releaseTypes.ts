export type ReleaseStatus =
  | 'draft'            // Jobbar på det
  | 'review'           // Publicerat, automatiska checks körs
  | 'checklist'        // Checks klara, manuell checklista
  | 'pending_approval' // Skickad till grundare
  | 'approved'         // Grundare godkänt
  | 'live'             // Deployat live
  | 'rejected'         // Grundare avslog

export interface ReleaseCheck {
  id: string
  label: string
  status: 'pending' | 'running' | 'pass' | 'fail' | 'skipped'
  detail?: string
  required: boolean
}

export interface ProductionChecklist {
  id: string
  label: string
  description: string
  checked: boolean
  required: boolean
  category: 'quality' | 'security' | 'performance' | 'documentation' | 'legal'
}

export interface Release {
  id: string
  repo_full_name: string
  repo_name: string
  branch: string
  commit_sha: string
  commit_message: string
  version: string
  status: ReleaseStatus
  created_by: string
  created_at: string
  updated_at: string
  checks: ReleaseCheck[]
  checklist: ProductionChecklist[]
  approval_note?: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  deploy_url?: string
}
