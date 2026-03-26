// ─── Corporate data types & mock data ──────────────────────────────────────

export type CompanyId = 'landvex-ab' | 'quixzoom-inc' | 'landvex-inc' | 'quixzoom-uab' | 'wavult-group'

export interface Company {
  id: CompanyId
  name: string
  shortName: string
  jurisdiction: string
  jurisdictionCode: string
  orgNr: string
  founded: string
  status: 'aktiv' | 'under bildning'
  color: string
}

export const COMPANIES: Company[] = [
  {
    id: 'wavult-group',
    name: 'Wavult Group DMCC',
    shortName: 'Wavult Group',
    jurisdiction: 'Dubai, UAE',
    jurisdictionCode: 'AE',
    orgNr: 'DMCC-2025-4471',
    founded: '2025-06-01',
    status: 'aktiv',
    color: '#6366f1',
  },
  {
    id: 'landvex-ab',
    name: 'LandveX AB',
    shortName: 'LandveX AB',
    jurisdiction: 'Sverige',
    jurisdictionCode: 'SE',
    orgNr: '559412-8834',
    founded: '2024-03-15',
    status: 'aktiv',
    color: '#3b82f6',
  },
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    shortName: 'QuiXzoom',
    jurisdiction: 'Delaware, USA',
    jurisdictionCode: 'US-DE',
    orgNr: 'DE-7782341',
    founded: '2024-08-20',
    status: 'aktiv',
    color: '#10b981',
  },
  {
    id: 'landvex-inc',
    name: 'LandveX Inc',
    shortName: 'LandveX Inc',
    jurisdiction: 'Texas, USA',
    jurisdictionCode: 'US-TX',
    orgNr: 'TX-0041882',
    founded: '2025-01-10',
    status: 'aktiv',
    color: '#f59e0b',
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    shortName: 'QuiXzoom UAB',
    jurisdiction: 'Litauen',
    jurisdictionCode: 'LT',
    orgNr: '306182744',
    founded: '2025-03-01',
    status: 'aktiv',
    color: '#ec4899',
  },
]

// ─── Board meetings ──────────────────────────────────────────────────────────

export type MeetingType = 'styrelsemöte' | 'extra styrelsemöte' | 'skriftligt beslut'
export type MeetingStatus = 'planerat' | 'genomfört' | 'protokoll klart'

export interface BoardMeeting {
  id: string
  companyId: CompanyId
  date: string
  type: MeetingType
  status: MeetingStatus
  agenda: string[]
  decisions: string[]
  attendees: string[]
  chairperson: string
  minutesTaker?: string
}

export const BOARD_MEETINGS: BoardMeeting[] = [
  {
    id: 'bm-001',
    companyId: 'wavult-group',
    date: '2026-03-15',
    type: 'styrelsemöte',
    status: 'protokoll klart',
    agenda: ['Godkännande av årsredovisning 2025', 'Investeringsstrategi Q2 2026', 'Uppdatering koncernstruktur'],
    decisions: [
      'Årsredovisning 2025 godkänd och undertecknad.',
      'Investering i QuiXzoom produktutveckling om 500 000 AED godkänd.',
      'Bolagsstruktur oförändrad, nytt holdingbolag utreds.',
    ],
    attendees: ['Erik Svensson', 'Dennis Bjarnemark', 'Winston Bjarnemark'],
    chairperson: 'Erik Svensson',
    minutesTaker: 'Dennis Bjarnemark',
  },
  {
    id: 'bm-002',
    companyId: 'landvex-ab',
    date: '2026-03-10',
    type: 'styrelsemöte',
    status: 'protokoll klart',
    agenda: ['Bokslutsdisposition 2025', 'Nyemission', 'Tecknande av avtal med Bolagsverket'],
    decisions: [
      'Resultat balanseras i ny räkning.',
      'Nyemission om 500 000 SEK godkänd, teckningskurs 1 kr/aktie.',
      'VD ges fullmakt att teckna avtal med Bolagsverket.',
    ],
    attendees: ['Erik Svensson', 'Dennis Bjarnemark'],
    chairperson: 'Erik Svensson',
    minutesTaker: 'Dennis Bjarnemark',
  },
  {
    id: 'bm-003',
    companyId: 'quixzoom-inc',
    date: '2026-02-28',
    type: 'skriftligt beslut',
    status: 'protokoll klart',
    agenda: ['Godkännande av option pool-expansion'],
    decisions: ['Option pool utökas från 10% till 15% av totalt antal aktier.'],
    attendees: ['Erik Svensson', 'Wavult Group DMCC (proxy)'],
    chairperson: 'Erik Svensson',
  },
  {
    id: 'bm-004',
    companyId: 'landvex-ab',
    date: '2026-02-14',
    type: 'extra styrelsemöte',
    status: 'protokoll klart',
    agenda: ['Godkännande av ny VD-instruktion', 'Firmateckning'],
    decisions: [
      'VD-instruktion fastställd per 2026-02-14.',
      'Firmateckning: VD ensam upp till 100 000 SEK, styrelse gemensamt däröver.',
    ],
    attendees: ['Erik Svensson', 'Dennis Bjarnemark'],
    chairperson: 'Erik Svensson',
    minutesTaker: 'Dennis Bjarnemark',
  },
  {
    id: 'bm-005',
    companyId: 'wavult-group',
    date: '2026-01-20',
    type: 'styrelsemöte',
    status: 'protokoll klart',
    agenda: ['Budgetgodkännande 2026', 'Strategiplan Q1-Q2', 'Thailand workcamp'],
    decisions: [
      'Budgetram 2026 om 3,2 MAED godkänd.',
      'Thailand workcamp 11 april 2026 godkänt.',
      'CEO ges fullmakt att ingå avtal upp till 200 000 AED.',
    ],
    attendees: ['Erik Svensson', 'Dennis Bjarnemark', 'Leon Russo De Cerame'],
    chairperson: 'Erik Svensson',
    minutesTaker: 'Dennis Bjarnemark',
  },
  {
    id: 'bm-006',
    companyId: 'quixzoom-uab',
    date: '2026-04-05',
    type: 'styrelsemöte',
    status: 'planerat',
    agenda: ['Årsredovisning 2025', 'Rekryteringsplan Q2', 'Hyresavtal Vilnius'],
    decisions: [],
    attendees: ['Erik Svensson', 'Dennis Bjarnemark'],
    chairperson: 'Erik Svensson',
  },
  {
    id: 'bm-007',
    companyId: 'landvex-inc',
    date: '2026-03-25',
    type: 'skriftligt beslut',
    status: 'genomfört',
    agenda: ['Godkännande av bankkonto opening'],
    decisions: ['Styrelsen godkänner öppnandet av bankkonto hos JPMorgan Chase Texas.'],
    attendees: ['Erik Svensson'],
    chairperson: 'Erik Svensson',
  },
  {
    id: 'bm-008',
    companyId: 'quixzoom-inc',
    date: '2026-04-15',
    type: 'styrelsemöte',
    status: 'planerat',
    agenda: ['Delaware franchise tax', 'Cap table review', 'Series A förberedelse'],
    decisions: [],
    attendees: ['Erik Svensson', 'Dennis Bjarnemark', 'Johan Berglund'],
    chairperson: 'Erik Svensson',
  },
]

// ─── Jurisdiction requirements ───────────────────────────────────────────────

export type FilingStatus = 'ej inlämnad' | 'inlämnad' | 'betald'

export interface JurisdictionRequirement {
  id: string
  companyId: CompanyId
  authority: string
  requirement: string
  deadline: string
  status: FilingStatus
  amount?: string
  notes?: string
}

export const JURISDICTION_REQUIREMENTS: JurisdictionRequirement[] = [
  // LandveX AB (SE)
  {
    id: 'jr-001',
    companyId: 'landvex-ab',
    authority: 'Bolagsverket',
    requirement: 'Årsredovisning 2025',
    deadline: '2026-07-31',
    status: 'ej inlämnad',
    notes: 'Registreras inom 7 månader från räkenskapsårets slut',
  },
  {
    id: 'jr-002',
    companyId: 'landvex-ab',
    authority: 'Skatteverket',
    requirement: 'Inkomstdeklaration 2 (2025)',
    deadline: '2026-07-01',
    status: 'ej inlämnad',
  },
  {
    id: 'jr-003',
    companyId: 'landvex-ab',
    authority: 'Skatteverket',
    requirement: 'Arbetsgivardeklaration Jan 2026',
    deadline: '2026-02-12',
    status: 'inlämnad',
  },
  {
    id: 'jr-004',
    companyId: 'landvex-ab',
    authority: 'Bolagsverket',
    requirement: 'Revisorsanmälan (revisor krävs ej ännu)',
    deadline: '2027-04-01',
    status: 'ej inlämnad',
    notes: 'Revisorsplikt uppstår vid >3 av: >3 anst, >1,5 MSEK bal, >3 MSEK nettoomsättning',
  },

  // QuiXzoom Inc (US-DE)
  {
    id: 'jr-005',
    companyId: 'quixzoom-inc',
    authority: 'Delaware Division of Corporations',
    requirement: 'Franchise Tax Report 2025',
    deadline: '2026-03-01',
    status: 'betald',
    amount: '$450',
  },
  {
    id: 'jr-006',
    companyId: 'quixzoom-inc',
    authority: 'Delaware Division of Corporations',
    requirement: 'Annual Report 2026',
    deadline: '2027-03-01',
    status: 'ej inlämnad',
    amount: '$50',
  },

  // LandveX Inc (US-TX)
  {
    id: 'jr-007',
    companyId: 'landvex-inc',
    authority: 'Texas Comptroller',
    requirement: 'Texas Franchise Tax Report 2025',
    deadline: '2026-05-15',
    status: 'ej inlämnad',
    notes: 'No tax owed if revenue <$2.47M (threshold 2026)',
  },
  {
    id: 'jr-008',
    companyId: 'landvex-inc',
    authority: 'Texas Secretary of State',
    requirement: 'Annual Report / PIR 2026',
    deadline: '2026-05-15',
    status: 'ej inlämnad',
    amount: '$25',
  },

  // QuiXzoom UAB (LT)
  {
    id: 'jr-009',
    companyId: 'quixzoom-uab',
    authority: 'VMI (Valstybinė mokesčių inspekcija)',
    requirement: 'Pelno mokesčio deklaracija 2025',
    deadline: '2026-06-01',
    status: 'ej inlämnad',
    notes: 'Corporate income tax 15%',
  },
  {
    id: 'jr-010',
    companyId: 'quixzoom-uab',
    authority: 'Sodra (Social Insurance)',
    requirement: 'Månatlig Sodra-rapport Mars 2026',
    deadline: '2026-04-15',
    status: 'ej inlämnad',
  },
  {
    id: 'jr-011',
    companyId: 'quixzoom-uab',
    authority: 'Registrų centras',
    requirement: 'Årsredovisning 2025',
    deadline: '2026-07-01',
    status: 'ej inlämnad',
  },

  // Wavult Group DMCC (AE)
  {
    id: 'jr-012',
    companyId: 'wavult-group',
    authority: 'DMCC',
    requirement: 'DMCC Annual License Renewal',
    deadline: '2026-06-01',
    status: 'ej inlämnad',
    amount: '20 000 AED',
    notes: 'Förfaller 12 månader efter registreringsdatum',
  },
  {
    id: 'jr-013',
    companyId: 'wavult-group',
    authority: 'Federal Tax Authority (FTA)',
    requirement: 'UAE Corporate Tax Registration',
    deadline: '2026-05-31',
    status: 'inlämnad',
    notes: 'CIT 9% på vinst >375 000 AED. Gratisbas under threshold.',
  },
  {
    id: 'jr-014',
    companyId: 'wavult-group',
    authority: 'FTA',
    requirement: 'VAT Return Q1 2026',
    deadline: '2026-04-28',
    status: 'ej inlämnad',
    notes: 'VAT 5%, registrering vid omsättning >375k AED',
  },
]

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocumentCategory = 'Bolagsordning' | 'Aktiebok' | 'Styrelsebeslut' | 'Avtal' | 'Registreringsbevis'
export type DocumentStatus = 'utkast' | 'signerat' | 'arkiverat'

export interface Document {
  id: string
  companyId: CompanyId
  name: string
  category: DocumentCategory
  date: string
  status: DocumentStatus
  fileType: 'pdf' | 'docx' | 'xlsx'
  size?: string
}

export const DOCUMENTS: Document[] = [
  // LandveX AB
  { id: 'doc-001', companyId: 'landvex-ab', name: 'Bolagsordning LandveX AB', category: 'Bolagsordning', date: '2024-03-15', status: 'arkiverat', fileType: 'pdf', size: '124 KB' },
  { id: 'doc-002', companyId: 'landvex-ab', name: 'Aktiebok 2026-03-01', category: 'Aktiebok', date: '2026-03-01', status: 'signerat', fileType: 'xlsx', size: '48 KB' },
  { id: 'doc-003', companyId: 'landvex-ab', name: 'Protokoll styrelsemöte 2026-03-10', category: 'Styrelsebeslut', date: '2026-03-10', status: 'signerat', fileType: 'pdf', size: '88 KB' },
  { id: 'doc-004', companyId: 'landvex-ab', name: 'VD-instruktion 2026', category: 'Avtal', date: '2026-02-14', status: 'signerat', fileType: 'pdf', size: '56 KB' },
  { id: 'doc-005', companyId: 'landvex-ab', name: 'Registreringsbevis Bolagsverket', category: 'Registreringsbevis', date: '2024-03-18', status: 'arkiverat', fileType: 'pdf', size: '32 KB' },
  // QuiXzoom Inc
  { id: 'doc-006', companyId: 'quixzoom-inc', name: 'Certificate of Incorporation (DE)', category: 'Registreringsbevis', date: '2024-08-20', status: 'arkiverat', fileType: 'pdf', size: '64 KB' },
  { id: 'doc-007', companyId: 'quixzoom-inc', name: 'Bylaws QuiXzoom Inc', category: 'Bolagsordning', date: '2024-08-20', status: 'arkiverat', fileType: 'pdf', size: '210 KB' },
  { id: 'doc-008', companyId: 'quixzoom-inc', name: 'Cap Table 2026-Q1', category: 'Aktiebok', date: '2026-03-01', status: 'signerat', fileType: 'xlsx', size: '72 KB' },
  { id: 'doc-009', companyId: 'quixzoom-inc', name: 'Shareholder Agreement v2', category: 'Avtal', date: '2025-09-10', status: 'signerat', fileType: 'pdf', size: '340 KB' },
  { id: 'doc-010', companyId: 'quixzoom-inc', name: 'NDA — Erik Svensson', category: 'Avtal', date: '2024-08-20', status: 'arkiverat', fileType: 'pdf', size: '40 KB' },
  // LandveX Inc
  { id: 'doc-011', companyId: 'landvex-inc', name: 'Certificate of Formation (TX)', category: 'Registreringsbevis', date: '2025-01-10', status: 'arkiverat', fileType: 'pdf', size: '48 KB' },
  { id: 'doc-012', companyId: 'landvex-inc', name: 'Operating Agreement LandveX Inc', category: 'Bolagsordning', date: '2025-01-10', status: 'signerat', fileType: 'pdf', size: '188 KB' },
  // QuiXzoom UAB
  { id: 'doc-013', companyId: 'quixzoom-uab', name: 'Steigimo dokumentai (UAB)', category: 'Registreringsbevis', date: '2025-03-01', status: 'arkiverat', fileType: 'pdf', size: '92 KB' },
  { id: 'doc-014', companyId: 'quixzoom-uab', name: 'Įstatai QuiXzoom UAB', category: 'Bolagsordning', date: '2025-03-01', status: 'arkiverat', fileType: 'pdf', size: '156 KB' },
  { id: 'doc-015', companyId: 'quixzoom-uab', name: 'Hyresavtal Vilnius Office (utkast)', category: 'Avtal', date: '2026-03-20', status: 'utkast', fileType: 'docx', size: '68 KB' },
  // Wavult Group
  { id: 'doc-016', companyId: 'wavult-group', name: 'DMCC Trade License', category: 'Registreringsbevis', date: '2025-06-01', status: 'arkiverat', fileType: 'pdf', size: '110 KB' },
  { id: 'doc-017', companyId: 'wavult-group', name: 'Memorandum of Association DMCC', category: 'Bolagsordning', date: '2025-06-01', status: 'arkiverat', fileType: 'pdf', size: '290 KB' },
  { id: 'doc-018', companyId: 'wavult-group', name: 'Intercompany Loan Agreement — WG → LandveX AB', category: 'Avtal', date: '2025-11-01', status: 'signerat', fileType: 'pdf', size: '148 KB' },
]

// ─── Compliance ──────────────────────────────────────────────────────────────

export type ComplianceStatus = 'ej påbörjad' | 'pågår' | 'klar' | 'förfallen'

export interface ComplianceItem {
  id: string
  companyId: CompanyId
  category: 'Årsredovisning' | 'Skattedeklaration' | 'Bolagsregistrering' | 'Licens' | 'Social försäkring'
  requirement: string
  deadline: string
  status: ComplianceStatus
  owner?: string
  notes?: string
}

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  // LandveX AB
  { id: 'ci-001', companyId: 'landvex-ab', category: 'Årsredovisning', requirement: 'Årsredovisning 2025 → Bolagsverket', deadline: '2026-07-31', status: 'ej påbörjad', owner: 'Winston Bjarnemark' },
  { id: 'ci-002', companyId: 'landvex-ab', category: 'Skattedeklaration', requirement: 'Inkomstdeklaration 2 (2025)', deadline: '2026-07-01', status: 'pågår', owner: 'Winston Bjarnemark' },
  { id: 'ci-003', companyId: 'landvex-ab', category: 'Skattedeklaration', requirement: 'Momsdeklaration Q1 2026', deadline: '2026-05-12', status: 'ej påbörjad', owner: 'Winston Bjarnemark' },
  { id: 'ci-004', companyId: 'landvex-ab', category: 'Bolagsregistrering', requirement: 'Styrelseledamot anmälan (uppdaterad 2026)', deadline: '2026-06-01', status: 'klar', owner: 'Dennis Bjarnemark' },
  // QuiXzoom Inc
  { id: 'ci-005', companyId: 'quixzoom-inc', category: 'Skattedeklaration', requirement: 'Delaware Franchise Tax 2025', deadline: '2026-03-01', status: 'klar', owner: 'Winston Bjarnemark' },
  { id: 'ci-006', companyId: 'quixzoom-inc', category: 'Årsredovisning', requirement: 'Annual Report Delaware 2026', deadline: '2027-03-01', status: 'ej påbörjad' },
  { id: 'ci-007', companyId: 'quixzoom-inc', category: 'Skattedeklaration', requirement: 'Federal Corporate Tax Return (Form 1120) 2025', deadline: '2026-04-15', status: 'pågår', owner: 'Winston Bjarnemark' },
  // LandveX Inc
  { id: 'ci-008', companyId: 'landvex-inc', category: 'Skattedeklaration', requirement: 'Texas Franchise Tax 2025', deadline: '2026-05-15', status: 'ej påbörjad', owner: 'Winston Bjarnemark' },
  { id: 'ci-009', companyId: 'landvex-inc', category: 'Bolagsregistrering', requirement: 'Texas PIR (Public Information Report)', deadline: '2026-05-15', status: 'ej påbörjad', owner: 'Dennis Bjarnemark' },
  // QuiXzoom UAB
  { id: 'ci-010', companyId: 'quixzoom-uab', category: 'Skattedeklaration', requirement: 'Corporate Income Tax 2025 (VMI)', deadline: '2026-06-01', status: 'ej påbörjad', owner: 'Winston Bjarnemark' },
  { id: 'ci-011', companyId: 'quixzoom-uab', category: 'Social försäkring', requirement: 'Sodra månadsrapport Mars 2026', deadline: '2026-04-15', status: 'ej påbörjad', owner: 'Dennis Bjarnemark' },
  { id: 'ci-012', companyId: 'quixzoom-uab', category: 'Årsredovisning', requirement: 'Metinė finansinė atskaitomybė 2025', deadline: '2026-07-01', status: 'ej påbörjad' },
  // Wavult Group
  { id: 'ci-013', companyId: 'wavult-group', category: 'Licens', requirement: 'DMCC License Renewal 2026', deadline: '2026-06-01', status: 'pågår', owner: 'Dennis Bjarnemark' },
  { id: 'ci-014', companyId: 'wavult-group', category: 'Skattedeklaration', requirement: 'UAE Corporate Tax Registration', deadline: '2026-05-31', status: 'klar', owner: 'Winston Bjarnemark' },
  { id: 'ci-015', companyId: 'wavult-group', category: 'Skattedeklaration', requirement: 'VAT Return Q1 2026', deadline: '2026-04-28', status: 'ej påbörjad', owner: 'Winston Bjarnemark' },
]
