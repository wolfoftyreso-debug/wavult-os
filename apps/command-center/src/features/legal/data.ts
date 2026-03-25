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

export const DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  ip_license: 'IP-licensavtal',
  management_agreement: 'Management Agreement',
  service_agreement: 'Service Agreement',
  shareholder_agreement: 'Aktieägaravtal',
  intercompany_loan: 'Koncernlån',
  employment_contract: 'Anställningsavtal',
  nda: 'Sekretessavtal (NDA)',
  data_processing_agreement: 'Personuppgiftsbiträdesavtal (DPA)',
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
    title: 'IP-licensavtal — Wavult Group Dubai (IP Holding) → LandveX Inc',
    party_a: 'wavult-group',
    party_b: 'landvex-inc',
    signing_level: 'L3',
    sign_method: 'docusign',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Icke-exklusiv licens för LandveX i USA. Royalty 8%.',
    required: true,
    auto_proposed: true,
    royalty_rate: 8,
  },
  {
    id: 'ip-004',
    type: 'ip_license',
    title: 'IP-licensavtal — Wavult Group Dubai (IP Holding) → Sommarliden Holding AB',
    party_a: 'wavult-group',
    party_b: 'landvex-ab',
    signing_level: 'L3',
    sign_method: 'bankid',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'IP-licens för LandveX-plattformen i Sverige/EU. Sommarliden AB (blivande LandveX AB) äger INTE IP — licensierar från Dubai-holdingen. Royalty 7% av nettointäkter.',
    required: true,
    auto_proposed: true,
    royalty_rate: 7,
  },
  {
    id: 'ma-001',
    type: 'management_agreement',
    title: 'Management Agreement — Sommarliden Holding → Wavult Operations',
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
    title: 'Service Agreement — Wavult Operations → LandveX Inc',
    party_a: 'wavult-operations',
    party_b: 'landvex-inc',
    signing_level: 'L2',
    sign_method: 'email_otp',
    status: 'proposed',
    created_at: '2026-03-25',
    description: 'Tekniska plattformstjänster för LandveX US.',
    required: true,
    auto_proposed: true,
    amount: 2500,
    currency: 'USD',
  },
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
]
