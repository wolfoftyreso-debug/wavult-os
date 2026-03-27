export type MaturityLevel =
  | 'skeleton'      // Struktur finns, inga features aktiva
  | 'alpha'         // Grundfunktioner, mockdata, ej produktionsklar
  | 'beta'          // Kärnfunktioner live, viss mockdata, används av teamet
  | 'production'    // Fullt funktionell, live data, stabil
  | 'enterprise'    // Battle-tested, SLA, audit trail, multi-entity

export interface ModuleMaturity {
  id: string
  name: string
  path: string
  icon: string
  level: MaturityLevel
  phase: number        // 1-4
  liveFeatures: string[]
  mockFeatures: string[]
  plannedFeatures: string[]
  dataSource: 'mock' | 'partial' | 'live'
  lastUpdated: string
  notes?: string
}

export const MATURITY_COLORS: Record<MaturityLevel, string> = {
  skeleton:   '#374151',  // grå
  alpha:      '#92400E',  // mörkbrun/orange
  beta:       '#1E40AF',  // blå
  production: '#065F46',  // mörkgrön
  enterprise: '#4C1D95',  // lila (premium)
}

export const MATURITY_BG: Record<MaturityLevel, string> = {
  skeleton:   '#1F2937',
  alpha:      '#1C1107',
  beta:       '#0D1B3E',
  production: '#022C22',
  enterprise: '#1E0A3C',
}

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  skeleton:   'SKELETON',
  alpha:      'ALPHA',
  beta:       'BETA',
  production: 'PRODUCTION',
  enterprise: 'ENTERPRISE',
}

export const MATURITY_DESCRIPTION: Record<MaturityLevel, string> = {
  skeleton:   'Arkitektur definierad. Inga live-features.',
  alpha:      'Grundfunktioner byggda med mockdata.',
  beta:       'Kärnfunktioner live. Används av teamet.',
  production: 'Fullt funktionell med live-data.',
  enterprise: 'Battle-tested. SLA, audit trail, multi-entity.',
}

// ALLA MODULER MED RÄTT MOGNADSGRAD
export const MODULE_REGISTRY: ModuleMaturity[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: '⬛',
    level: 'beta',
    phase: 2,
    liveFeatures: ['Systemstatus', 'Team-aktivitet', 'Thailand countdown', 'Quick links'],
    mockFeatures: ['GitHub CI/CD status', 'Uptime-diagram'],
    plannedFeatures: ['Live alerts', 'Realtime metrics'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'crm',
    name: 'CRM',
    path: '/crm',
    icon: '🎯',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Pipeline-vy', 'Prospect-lista', 'Kontakter', 'Aktivitetslogg'],
    mockFeatures: ['Alla prospects och deals (mockdata)', 'Thailand targets'],
    plannedFeatures: ['Live Supabase-koppling', 'Email-integration', 'Deal-automation'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'finance',
    name: 'Finance',
    path: '/finance',
    icon: '💰',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Kontoplan', 'Transaktionsvy', 'Fakturalista', 'Kassaflödesdiagram'],
    mockFeatures: ['Alla siffror är mockdata', 'Intercompany-flöden'],
    plannedFeatures: ['Revolut API-koppling', 'Stripe-fakturor', 'Live ledger mot Supabase'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'payroll',
    name: 'Lön & Personal',
    path: '/payroll',
    icon: '👥',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Löneoversikt', 'Anställningslista', 'Lönespecar', 'Semesterspårning'],
    mockFeatures: ['Alla lönebelopp (mockdata)', 'AGI-status'],
    plannedFeatures: ['BankID-signering', 'Fortnox-integration', 'Skattemyndigheten API'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'legal',
    name: 'Legal Hub',
    path: '/legal',
    icon: '⚖',
    level: 'beta',
    phase: 2,
    liveFeatures: ['Dokumentlista', '23 dokument', 'Signeringsflöden', 'Skapa dokument-modal'],
    mockFeatures: ['Signeringsstatus (ej live BankID)'],
    plannedFeatures: ['Live BankID-integration', 'DocuSign webhook', 'Auto-contract generation'],
    dataSource: 'partial',
    lastUpdated: '2026-03-27',
  },
  {
    id: 'corporate',
    name: 'Bolagsadmin',
    path: '/corporate',
    icon: '⚖️',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Ägarstruktur', 'Jurisdiktionsöversikt', 'Compliance-tracker'],
    mockFeatures: ['Alla deadlines (mockdata)', 'Dokumentvalv'],
    plannedFeatures: ['Bolagsverket API', 'DMCC-portal integration', 'Auto-compliance alerts'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'milestones',
    name: 'Milestones',
    path: '/milestones',
    icon: '🚀',
    level: 'beta',
    phase: 2,
    liveFeatures: ['Thailand prep checklista', 'Bolagsstruktur tracker', 'Roadmap Q2-Q4'],
    mockFeatures: ['quiXzoom launch tracker'],
    plannedFeatures: ['Automatisk milestone-extraktion från tasks', 'Gantt-integration'],
    dataSource: 'partial',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'communications',
    name: 'Kommunikation',
    path: '/communications',
    icon: '📡',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Inbox UI', 'API-statusöversikt', 'Webhook-logg UI'],
    mockFeatures: ['Alla meddelanden (mockdata)', 'SMS-logg'],
    plannedFeatures: ['46elks live SMS', 'Slack/Teams webhook', 'Realtime inbox via Supabase'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'procurement',
    name: 'Inköp',
    path: '/procurement',
    icon: '🛒',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Leverantörslista', 'Inköpsordrar UI', 'Godkännandeflöde UI'],
    mockFeatures: ['Alla leverantörer och kontrakt (mockdata)'],
    plannedFeatures: ['Live leverantörskontrakt', 'PO-automation', 'Fortnox-integration'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'reports',
    name: 'Rapporter',
    path: '/reports',
    icon: '📊',
    level: 'alpha',
    phase: 1,
    liveFeatures: ['Executive Summary UI', 'P&L-vy', 'Säljrapport UI'],
    mockFeatures: ['Alla siffror (mockdata)'],
    plannedFeatures: ['Live data från Finance + CRM', 'PDF-export', 'Scheduled reports'],
    dataSource: 'mock',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'settings',
    name: 'Inställningar',
    path: '/settings',
    icon: '⚙️',
    level: 'beta',
    phase: 2,
    liveFeatures: ['API-nyckelöversikt', 'Rollhantering UI', 'System-info'],
    mockFeatures: ['Alla API-statusar (mockdata)'],
    plannedFeatures: ['Live API-key management', 'SSO/OAuth2', 'Audit log'],
    dataSource: 'partial',
    lastUpdated: '2026-03-26',
  },
  {
    id: 'media',
    name: 'Media & Ads',
    path: '/media',
    icon: '📡',
    level: 'skeleton',
    phase: 1,
    liveFeatures: [],
    mockFeatures: ['Kampanjstruktur', 'Channel-lista', 'Budget-UI'],
    plannedFeatures: ['Spotify Ads API', 'Google Ads API', 'Meta Ads API', 'The Trade Desk', 'Auto-budget'],
    dataSource: 'mock',
    lastUpdated: '2026-03-27',
    notes: 'Fas 1 — Skeleton. Alla integrationer planerade för Fas 2+',
  },
  {
    id: 'org',
    name: 'Corporate Graph',
    path: '/org',
    icon: '🏗',
    level: 'beta',
    phase: 2,
    liveFeatures: ['Org-graf', 'Command Chain', 'Entity-switcher'],
    mockFeatures: ['KPI-data per person'],
    plannedFeatures: ['Live HR-data', 'Realtime org-changes'],
    dataSource: 'partial',
    lastUpdated: '2026-03-25',
  },
]
