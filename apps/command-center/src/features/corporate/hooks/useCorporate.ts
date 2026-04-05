// useCorporate.ts — statisk data, ingen Supabase
// Supabase bortkopplat. Alla read-hooks returnerar seed-data, alla mutations är no-ops.

// ─── Statisk data ─────────────────────────────────────────────────────────────

const CORP_ENTITIES: CorpEntity[] = [
  { id: '1', name: 'Wavult Group Holding DMCC',  short_name: 'WGH',    jurisdiction: 'UAE (DIFC)',     jurisdiction_code: 'AE', org_nr: '', founded: null, status: 'aktiv',           color: '#E8B84B', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: 'Wavult Operations Holding AB', short_name: 'WOH',  jurisdiction: 'Sverige',        jurisdiction_code: 'SE', org_nr: '', founded: null, status: 'aktiv',           color: '#0A3D62', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '3', name: 'Optical Zoom UAB',           short_name: 'OZ-LT',  jurisdiction: 'Litauen',        jurisdiction_code: 'LT', org_nr: '', founded: null, status: 'aktiv',           color: '#2D7A4F', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '4', name: 'Optical Zoom Inc',           short_name: 'OZ-US',  jurisdiction: 'Delaware, USA',  jurisdiction_code: 'US', org_nr: '', founded: null, status: 'aktiv',           color: '#2C6EA6', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '5', name: 'LandveX AC',                 short_name: 'LVX-AE', jurisdiction: 'UAE (DIFC)',     jurisdiction_code: 'AE', org_nr: '', founded: null, status: 'under bildning',  color: '#C9A84C', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '6', name: 'LandveX Inc',                short_name: 'LVX-US', jurisdiction: 'Texas, USA',     jurisdiction_code: 'US', org_nr: '', founded: null, status: 'under bildning',  color: '#4A7A5B', created_at: '2024-01-01', updated_at: '2024-01-01' },
]

const CORP_BOARD_MEETINGS: CorpBoardMeeting[] = []
const CORP_COMPLIANCE_ITEMS: any[] = []
const CORP_JURISDICTION_REQUIREMENTS: any[] = []
const CORP_DOCUMENTS: any[] = []

import type { CorpBoardMeeting, CorpEntity } from '../../../lib/supabase'

// ─── No-op mutation helper ────────────────────────────────────────────────────

function noopMutation() {
  return {
    mutate: (_data: any) => {},
    mutateAsync: async (_data: any): Promise<never> => {
      throw new Error('Backend ej konfigurerat')
    },
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}

// ─── Corporate Entities ───────────────────────────────────────────────────────

export function useCorpEntities() {
  return { data: CORP_ENTITIES, isLoading: false, error: null, refetch: () => {} }
}

export function useCorpEntity(_id: string) {
  const entity = CORP_ENTITIES.find(e => e.id === _id) ?? null
  return { data: entity, isLoading: false, error: null, refetch: () => {} }
}

export function useUpdateCorpEntity() {
  return noopMutation()
}

// ─── Board Meetings ───────────────────────────────────────────────────────────

export function useCorpBoardMeetings(_filters?: any) {
  return { data: CORP_BOARD_MEETINGS, isLoading: false, isError: false, error: null, refetch: () => {} }
}

export function useCorpBoardMeeting(_id: string) {
  return { data: null, isLoading: false, error: null, refetch: () => {} }
}

export function useCreateBoardMeeting() {
  return noopMutation()
}

export function useUpdateBoardMeeting() {
  return noopMutation()
}

export function useUpdateBoardMeetingStatus() {
  return noopMutation()
}

export function useDeleteBoardMeeting() {
  return noopMutation()
}

// ─── Compliance Items ─────────────────────────────────────────────────────────

export function useCorpComplianceItems(_filters?: any) {
  return { data: CORP_COMPLIANCE_ITEMS, isLoading: false, error: null, refetch: () => {} }
}

export function useCreateComplianceItem() {
  return noopMutation()
}

export function useUpdateComplianceStatus() {
  return noopMutation()
}

export function useUpdateComplianceItem() {
  return noopMutation()
}

// ─── Jurisdiction Requirements ────────────────────────────────────────────────

export function useCorpJurisdictionRequirements(_companyId?: string) {
  return { data: CORP_JURISDICTION_REQUIREMENTS, isLoading: false, error: null, refetch: () => {} }
}

export function useUpdateJurisdictionStatus() {
  return noopMutation()
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useCorpDocuments(_filters?: any) {
  return { data: CORP_DOCUMENTS, isLoading: false, error: null, refetch: () => {} }
}

export function useCreateCorpDocument() {
  return noopMutation()
}

export function useUpdateDocumentStatus() {
  return noopMutation()
}

// ─── Compliance Overview Stats ────────────────────────────────────────────────

export function useCorpComplianceStats() {
  return {
    data: { overdue: 0, dueIn30: 0, completed: 0, total: 0 },
    isLoading: false,
    error: null,
  }
}
