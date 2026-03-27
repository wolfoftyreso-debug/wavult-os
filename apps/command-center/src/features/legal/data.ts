// ─── Legal Document System ────────────────────────────────────────────────

export type SigningLevel = 'L1' | 'L2' | 'L3'
export type DocStatus = 'proposed' | 'draft' | 'pending_signature' | 'signed' | 'expired' | 'rejected'
export type SignMethod = 'click' | 'email_otp' | 'bankid' | 'eid_eidas' | 'docusign'

export interface LegalDocument {
  id: string
  type: LegalDocType
  title: string
  party_a: string
  party_b: string
  signing_level: SigningLevel
  sign_method: SignMethod
  status: DocStatus
  created_at: string
  signed_at?: string
  expires_at?: string
  description: string
  required: boolean
  auto_proposed: boolean
  amount?: number
  currency?: string
  royalty_rate?: number
}

export type LegalDocType =
  | 'ip_license'
  | 'management_agreement'
  | 'service_agreement'
  | 'shareholder_agreement'
  | 'intercompany_loan'
  | 'employment_contract'
  | 'nda'
  | 'data_processing_agreement'
  | 'board_resolution'
  | 'founder_agreement'
  | 'option_agreement'
  | 'consulting_agreement'
  | 'vendor_contract'
  | 'gdpr_policy'
  | 'terms_of_service'
  | 'investment_agreement'

export const DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  ip_license: 'IP-licensavtal',
  management_agreement: 'Management Agreement',
  service_agreement: 'Service Agreement',
  shareholder_agreement: 'Aktieägaravtal',
  intercompany_loan: 'Koncernlån',
  employment_contract: 'Anställningsavtal',
  nda: 'Sekretessavtal (NDA)',
  data_processing_agreement: 'Personuppgiftsbiträdesavtal (DPA)',
  board_resolution: 'Styrelsebeslut',
  founder_agreement: 'Grundaravtal',
  option_agreement: 'Optionsavtal (ESOP)',
  consulting_agreement: 'Konsultavtal',
  vendor_contract: 'Leverantörsavtal',
  gdpr_policy: 'Integritetspolicy (GDPR)',
  terms_of_service: 'Användarvillkor',
  investment_agreement: 'Investeringsavtal',
}

export const SIGNING_LEVEL_LABELS: Record<SigningLevel, string> = {
  L1: 'Klick-signatur',
  L2: 'E-signatur',
  L3: 'Kvalificerad signatur',
}

export const SIGN_METHOD_LABELS: Record<SignMethod, string> = {
  click: '🖱️ Klick',
  email_otp: '📧 E-post OTP',
  bankid: '🇸🇪 BankID',
  eid_eidas: '🇪🇺 eIDAS',
  docusign: '🖊️ DocuSign',
}

export const DOC_TYPE_SIGNING_LEVEL: Record<LegalDocType, SigningLevel> = {
  ip_license: 'L3',
  management_agreement: 'L2',
  service_agreement: 'L2',
  shareholder_agreement: 'L3',
  intercompany_loan: 'L2',
  employment_contract: 'L2',
  nda: 'L1',
  data_processing_agreement: 'L2',
  board_resolution: 'L2',
  founder_agreement: 'L3',
  option_agreement: 'L3',
  consulting_agreement: 'L2',
  vendor_contract: 'L2',
  gdpr_policy: 'L1',
  terms_of_service: 'L1',
  investment_agreement: 'L3',
}

// BankID = Sweden only. Other jurisdictions get fallback.
export function getSignMethod(jurisdiction: string, level: SigningLevel): SignMethod {
  if (level === 'L1') return 'click'
  if (level === 'L3') {
    if (jurisdiction === 'SE') return 'bankid'
    if (jurisdiction.startsWith('EU')) return 'eid_eidas'
    return 'docusign'
  }
  // L2
  if (jurisdiction === 'SE') return 'bankid'
  if (jurisdiction.startsWith('EU')) return 'eid_eidas'
  return 'email_otp'
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  // ── IP-licensavtal ──────────────────────────────────────────────────────
  {
    id: 'ip-001',
    type: 'ip_license',
    title: 'IP-licensavtal — Wavult Group Dubai (IP Holding) → Wavult Operations',
    party_a: 'wavult-group',
    party_b: 'wavult-operations',
    signing_level: 'L3',
    sign_method: 'bankid',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Exklusiv licens för all IP utvecklad inom Wavult Operations. Royalty 10% av nettointäkter.',
    required: true,
    auto_proposed: true,
    royalty_rate: 10,
  },
  {
    id: 'ip-002',
    type: 'ip_license',
    title: 'IP-licensavtal — Wavult Group Dubai (IP Holding) → QuiXzoom UAB',
    party_a: 'wavult-group',
    party_b: 'quixzoom-uab',
    signing_level: 'L3',
    sign_method: 'eid_eidas',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Icke-exklusiv licens för QuiXzoom-plattformen i EU. Royalty 5%.',
    required: true,
    auto_proposed: true,
    royalty_rate: 5,
  },
  {
    id: 'ip-003',
    type: 'ip_license',
    title: 'IP-licensavtal — Wavult Group Dubai (IP Holding) → Landvex Inc',
    party_a: 'wavult-group',
    party_b: 'landvex-inc',
    signing_level: 'L3',
    sign_method: 'docusign',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Icke-exklusiv licens för Landvex i USA. Royalty 8%.',
    required: true,
    auto_proposed: true,
    royalty_rate: 8,
  },
  {
    id: 'ip-004',
    type: 'ip_license',
    title: 'IP-licensavtal — Wavult Group Dubai (IP Holding) → Landvex AB',
    party_a: 'wavult-group',
    party_b: 'landvex-ab',
    signing_level: 'L3',
    sign_method: 'bankid',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'IP-licens för Landvex-plattformen i Sverige/EU. Landvex AB äger INTE IP — licensierar från Dubai-holdingen. Royalty 7% av nettointäkter.',
    required: true,
    auto_proposed: true,
    royalty_rate: 7,
  },

  // ── Management Agreement ─────────────────────────────────────────────────
  {
    id: 'ma-001',
    type: 'management_agreement',
    title: 'Management Agreement — Landvex AB → Wavult Operations',
    party_a: 'wavult-group',
    party_b: 'wavult-operations',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Lednings- och konsulttjänster. Holding tillhandahåller strategisk ledning, juridik och ekonomi.',
    required: true,
    auto_proposed: true,
    amount: 25000,
    currency: 'SEK',
  },

  // ── Service Agreements ───────────────────────────────────────────────────
  {
    id: 'sa-001',
    type: 'service_agreement',
    title: 'Service Agreement — Wavult Operations → QuiXzoom UAB',
    party_a: 'wavult-operations',
    party_b: 'quixzoom-uab',
    signing_level: 'L2',
    sign_method: 'eid_eidas',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Tekniska plattformstjänster: hosting, API, support.',
    required: true,
    auto_proposed: true,
    amount: 3000,
    currency: 'EUR',
  },
  {
    id: 'sa-002',
    type: 'service_agreement',
    title: 'Service Agreement — Wavult Operations → Landvex Inc',
    party_a: 'wavult-operations',
    party_b: 'landvex-inc',
    signing_level: 'L2',
    sign_method: 'email_otp',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Tekniska plattformstjänster för Landvex US.',
    required: true,
    auto_proposed: true,
    amount: 2500,
    currency: 'USD',
  },

  // ── Data Processing Agreements ───────────────────────────────────────────
  {
    id: 'dpa-001',
    type: 'data_processing_agreement',
    title: 'DPA — Wavult Operations ↔ QuiXzoom UAB',
    party_a: 'wavult-operations',
    party_b: 'quixzoom-uab',
    signing_level: 'L2',
    sign_method: 'eid_eidas',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'GDPR: reglerar behandling av personuppgifter mellan EU-bolag.',
    required: true,
    auto_proposed: true,
  },
  {
    id: 'dpa-002',
    type: 'data_processing_agreement',
    title: 'DPA — Wavult Operations ↔ Landvex Inc',
    party_a: 'wavult-operations',
    party_b: 'landvex-inc',
    signing_level: 'L2',
    sign_method: 'email_otp',
    status: 'draft',
    created_at: '2026-03-26',
    description: 'Reglerar behandling av personuppgifter för användare i USA och EU. Standardklausuler enligt SCCs inkluderade.',
    required: true,
    auto_proposed: false,
  },

  // ── Anställningsavtal ────────────────────────────────────────────────────
  {
    id: 'emp-001',
    type: 'employment_contract',
    title: 'Anställningsavtal — Erik Svensson',
    party_a: 'landvex-ab',
    party_b: 'erik-svensson',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'pending_signature',
    created_at: '2026-03-25',
    description: 'Anställningsavtal för Erik Svensson som Chairman of the Board & Group CEO vid Landvex AB.',
    required: true,
    auto_proposed: false,
  },
  {
    id: 'emp-002',
    type: 'employment_contract',
    title: 'Anställningsavtal — Leon Russo De Cerame',
    party_a: 'landvex-ab',
    party_b: 'leon-russo',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'pending_signature',
    created_at: '2026-03-25',
    description: 'Anställningsavtal för Leon Russo De Cerame som CEO Wavult Operations vid Landvex AB.',
    required: true,
    auto_proposed: false,
  },
  {
    id: 'emp-003',
    type: 'employment_contract',
    title: 'Anställningsavtal — Winston Bjarnemark',
    party_a: 'landvex-ab',
    party_b: 'winston-bjarnemark',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'pending_signature',
    created_at: '2026-03-25',
    description: 'Anställningsavtal för Winston Bjarnemark som CFO vid Landvex AB.',
    required: true,
    auto_proposed: false,
  },
  {
    id: 'emp-004',
    type: 'employment_contract',
    title: 'Anställningsavtal — Dennis Bjarnemark',
    party_a: 'landvex-ab',
    party_b: 'dennis-bjarnemark',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'pending_signature',
    created_at: '2026-03-25',
    description: 'Anställningsavtal för Dennis Bjarnemark som Chief Legal & Operations (Interim) vid Landvex AB.',
    required: true,
    auto_proposed: false,
  },
  {
    id: 'emp-005',
    type: 'employment_contract',
    title: 'Anställningsavtal — Johan Berglund',
    party_a: 'landvex-ab',
    party_b: 'johan-berglund',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'pending_signature',
    created_at: '2026-03-25',
    description: 'Anställningsavtal för Johan Berglund som Group CTO vid Landvex AB.',
    required: true,
    auto_proposed: false,
  },

  // ── NDA ──────────────────────────────────────────────────────────────────
  {
    id: 'nda-001',
    type: 'nda',
    title: 'NDA — QuiXzoom Inc ↔ Potentiell investerare',
    party_a: 'quixzoom-inc',
    party_b: 'external-investor',
    signing_level: 'L1',
    sign_method: 'click',
    status: 'draft',
    created_at: '2026-03-26',
    description: 'Ömsesidigt sekretessavtal inför due diligence-process. Giltighet 24 månader.',
    required: false,
    auto_proposed: false,
  },

  // ── Aktieägaravtal ───────────────────────────────────────────────────────
  {
    id: 'sha-001',
    type: 'shareholder_agreement',
    title: 'Aktieägaravtal — QuiXzoom Inc',
    party_a: 'erik-svensson',
    party_b: 'wavult-group',
    signing_level: 'L3',
    sign_method: 'docusign',
    status: 'draft',
    created_at: '2026-03-26',
    description: 'Reglerar rättigheter och skyldigheter mellan aktieägare i QuiXzoom Inc. Inkluderar drag-along, tag-along och pre-emption rights.',
    required: true,
    auto_proposed: false,
  },

  // ── Founder Agreement ─────────────────────────────────────────────────────
  {
    id: 'fa-001',
    type: 'founder_agreement',
    title: 'Founder Agreement — Erik Svensson & Wavult Group',
    party_a: 'erik-svensson',
    party_b: 'wavult-group',
    signing_level: 'L3',
    sign_method: 'docusign',
    status: 'pending_signature',
    created_at: '2026-03-25',
    description: 'Grundaravtal som reglerar Eriks roll, ägarandel, vesting-schema och beslutsmandat inom Wavult-koncernen.',
    required: true,
    auto_proposed: false,
  },

  // ── Optionsavtal (ESOP) ───────────────────────────────────────────────────
  {
    id: 'opt-001',
    type: 'option_agreement',
    title: 'Optionsavtal (ESOP) — QuiXzoom Inc',
    party_a: 'quixzoom-inc',
    party_b: 'esop-pool',
    signing_level: 'L3',
    sign_method: 'docusign',
    status: 'draft',
    created_at: '2026-03-26',
    description: 'Employee Stock Option Plan för QuiXzoom Inc. 10% optionspool reserverad för nyckelpersoner. 4-årig vesting med 1-årig cliff.',
    required: false,
    auto_proposed: false,
  },

  // ── GDPR Integritetspolicy ────────────────────────────────────────────────
  {
    id: 'gdpr-001',
    type: 'gdpr_policy',
    title: 'GDPR Integritetspolicy — quiXzoom',
    party_a: 'quixzoom-inc',
    party_b: 'end-users',
    signing_level: 'L1',
    sign_method: 'click',
    status: 'signed',
    created_at: '2026-03-20',
    signed_at: '2026-03-20',
    description: 'Integritetspolicy för quiXzoom-plattformen. Beskriver insamling, lagring och behandling av personuppgifter enligt GDPR och CCPA.',
    required: true,
    auto_proposed: false,
  },

  // ── Användarvillkor ────────────────────────────────────────────────────────
  {
    id: 'tos-001',
    type: 'terms_of_service',
    title: 'Användarvillkor — quiXzoom',
    party_a: 'quixzoom-inc',
    party_b: 'end-users',
    signing_level: 'L1',
    sign_method: 'click',
    status: 'signed',
    created_at: '2026-03-20',
    signed_at: '2026-03-20',
    description: 'Användarvillkor för quiXzoom-plattformen. Reglerar fotografers och köpares rättigheter, ansvarsbegränsningar och betalningsvillkor.',
    required: true,
    auto_proposed: false,
  },

  // ── Styrelsebeslut ────────────────────────────────────────────────────────
  {
    id: 'br-001',
    type: 'board_resolution',
    title: 'Styrelsebeslut — Namnbyte Landvex AB',
    party_a: 'landvex-ab',
    party_b: 'landvex-ab',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'signed',
    created_at: '2026-03-25',
    signed_at: '2026-03-25',
    description: 'Styrelsebeslut om godkännande av bolagets namnbyte till Landvex AB. Protokoll undertecknat av styrelseledamöter.',
    required: true,
    auto_proposed: false,
  },
  {
    id: 'br-002',
    type: 'board_resolution',
    title: 'Styrelsebeslut — Bolagsbildning QuiXzoom Inc',
    party_a: 'wavult-group',
    party_b: 'quixzoom-inc',
    signing_level: 'L2',
    sign_method: 'docusign',
    status: 'signed',
    created_at: '2026-03-25',
    signed_at: '2026-03-25',
    description: 'Styrelsebeslut om bildande av QuiXzoom Inc som Delaware C-Corp. Godkännande av bolagsordning och utgivande av grundaraktier.',
    required: true,
    auto_proposed: false,
  },

  // ── Konsultavtal ──────────────────────────────────────────────────────────
  {
    id: 'cons-001',
    type: 'consulting_agreement',
    title: 'Konsultavtal — Revisor (PwC/Deloitte)',
    party_a: 'landvex-ab',
    party_b: 'pwc-deloitte',
    signing_level: 'L2',
    sign_method: 'bankid',
    status: 'draft',
    created_at: '2026-03-26',
    description: 'Konsultavtal med revisionsbolag för revision, skatterådgivning och löpande redovisningstjänster för Landvex AB.',
    required: true,
    auto_proposed: false,
  },
]
