// ─── Role-based graph permissions ─────────────────────────────────────────────
// Extends RoleContext (shared/auth/RoleContext.tsx) — does NOT duplicate it.
// Maps role IDs to which overlays, relationship types, and entity layers are visible.

import { RoleId } from '../../shared/auth/RoleContext'
import { RelationshipType } from './data'

export type OverlayMode =
  | 'full'         // All layers, all relationships, all detail
  | 'financial'    // Highlight financial_flow + show CFO metadata
  | 'legal'        // Highlight ownership + licensing, show jurisdiction detail
  | 'technical'    // Highlight service + system nodes, show tech metadata
  | 'execution'    // Highlight operations layer + service relationships

export interface GraphPermissions {
  overlayMode: OverlayMode
  visibleRelTypes: RelationshipType[]
  visibleLayers: number[]          // 0–3
  canDrillToSystem: boolean        // Can see Layer 3 (Hypbit OS internals)
  canSeeFinancialMeta: boolean
  canSeeLegalMeta: boolean
  canSeeTechMeta: boolean
  highlightRelTypes: RelationshipType[]  // These get extra visual emphasis
  dimmedByDefault: boolean               // Start with dim-all, highlight on click
}

const FULL: GraphPermissions = {
  overlayMode: 'full',
  visibleRelTypes: ['ownership', 'financial_flow', 'licensing', 'service', 'control'],
  visibleLayers: [0, 1, 2, 3],
  canDrillToSystem: true,
  canSeeFinancialMeta: true,
  canSeeLegalMeta: true,
  canSeeTechMeta: true,
  highlightRelTypes: [],
  dimmedByDefault: false,
}

export const ROLE_PERMISSIONS: Record<RoleId, GraphPermissions> = {
  'admin': FULL,

  'group-ceo': FULL,

  'cfo': {
    overlayMode: 'financial',
    visibleRelTypes: ['financial_flow', 'ownership', 'licensing'],
    visibleLayers: [0, 1, 2],
    canDrillToSystem: false,
    canSeeFinancialMeta: true,
    canSeeLegalMeta: false,
    canSeeTechMeta: false,
    highlightRelTypes: ['financial_flow'],
    dimmedByDefault: true,
  },

  'clo': {
    overlayMode: 'legal',
    visibleRelTypes: ['ownership', 'licensing', 'control'],
    visibleLayers: [0, 1, 2],
    canDrillToSystem: false,
    canSeeFinancialMeta: false,
    canSeeLegalMeta: true,
    canSeeTechMeta: false,
    highlightRelTypes: ['ownership', 'licensing'],
    dimmedByDefault: true,
  },

  'cto': {
    overlayMode: 'technical',
    visibleRelTypes: ['service', 'control', 'ownership'],
    visibleLayers: [0, 1, 2, 3],
    canDrillToSystem: true,
    canSeeFinancialMeta: false,
    canSeeLegalMeta: false,
    canSeeTechMeta: true,
    highlightRelTypes: ['service'],
    dimmedByDefault: true,
  },

  'ceo-ops': {
    overlayMode: 'execution',
    visibleRelTypes: ['service', 'financial_flow', 'ownership'],
    visibleLayers: [0, 1, 2],
    canDrillToSystem: false,
    canSeeFinancialMeta: true,
    canSeeLegalMeta: false,
    canSeeTechMeta: false,
    highlightRelTypes: ['service'],
    dimmedByDefault: false,
  },

  'cpo': {
    overlayMode: 'full',
    visibleRelTypes: ['ownership', 'service', 'licensing'],
    visibleLayers: [0, 1, 2],
    canDrillToSystem: false,
    canSeeFinancialMeta: false,
    canSeeLegalMeta: false,
    canSeeTechMeta: false,
    highlightRelTypes: [],
    dimmedByDefault: false,
  },
}

export const OVERLAY_LABELS: Record<OverlayMode, { label: string; color: string; icon: string }> = {
  full:       { label: 'Full View',        color: '#2563EB', icon: '🔭' },
  financial:  { label: 'Financial Overlay', color: '#10B981', icon: '💰' },
  legal:      { label: 'Legal Overlay',     color: '#F59E0B', icon: '⚖️' },
  technical:  { label: 'Tech Overlay',      color: '#06B6D4', icon: '🧠' },
  execution:  { label: 'Ops Overlay',       color: '#0EA5E9', icon: '⚙️' },
}
