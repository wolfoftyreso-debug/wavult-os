// Legal Hub — statisk data per bolag
// Byts mot API-anrop när /v1/legal/* är byggt

export interface LegalDocument {
  id: string
  title: string
  type: 'avtal' | 'bolagsordning' | 'protokoll' | 'licens' | 'nda' | 'ip' | 'övrigt'
  entity_id: string
  status: 'aktiv' | 'utgången' | 'utkast' | 'under_förhandling'
  counterpart?: string
  signed_date?: string
  expiry_date?: string
  value_sek?: number
  s3_key?: string        // länk till faktisk fil
  tags: string[]
  created_at: string
}

export interface LegalTemplate {
  id: string
  name: string
  description: string
  category: 'nda' | 'anställning' | 'aktieägaravtal' | 'leverantör' | 'kund' | 'ip'
  language: 'sv' | 'en'
  download_url?: string
}

export interface IPAsset {
  id: string
  name: string
  type: 'varumärke' | 'patent' | 'domän' | 'källkod' | 'affärshemlighet'
  jurisdiction: string
  entity_id: string
  registered: boolean
  registration_number?: string
  expiry_date?: string
  status: 'aktiv' | 'under_ansökan' | 'utgången'
}

// ── DOKUMENT PER BOLAG ─────────────────────────────────────────────────────

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  // WGH — Dubai
  { id: 'd1', title: 'DMCC Trade License', type: 'bolagsordning', entity_id: '1', status: 'aktiv', signed_date: '2025-06-01', expiry_date: '2026-06-01', tags: ['dmcc', 'licens'], created_at: '2025-06-01' },
  { id: 'd2', title: 'Memorandum of Association DMCC', type: 'bolagsordning', entity_id: '1', status: 'aktiv', signed_date: '2025-06-01', tags: ['dmcc', 'bolagsordning'], created_at: '2025-06-01' },
  { id: 'd3', title: 'Intercompany Loan Agreement — WGH → LandveX AB', type: 'avtal', entity_id: '1', status: 'aktiv', counterpart: 'LandveX AB (559141-7042)', signed_date: '2025-11-01', value_sek: 2000000, tags: ['internlån', 'koncern'], created_at: '2025-11-01' },

  // WOH — Sverige
  { id: 'd4', title: 'Bolagsordning — Wavult Operations Holding AB', type: 'bolagsordning', entity_id: '2', status: 'aktiv', signed_date: '2024-01-15', tags: ['bolagsordning', 'sverige'], created_at: '2024-01-15' },
  { id: 'd5', title: 'Aktieägaravtal — Wavult Operations', type: 'avtal', entity_id: '2', status: 'aktiv', counterpart: 'Erik Svensson', signed_date: '2024-01-15', tags: ['aktieägaravtal'], created_at: '2024-01-15' },

  // OZ-LT — Litauen
  { id: 'd6', title: 'Steigimo dokumentai — Optical Zoom UAB', type: 'bolagsordning', entity_id: '3', status: 'aktiv', signed_date: '2025-03-01', tags: ['litauen', 'uab'], created_at: '2025-03-01' },
  { id: 'd7', title: 'EU Data Processing Agreement — GDPR', type: 'avtal', entity_id: '3', status: 'aktiv', tags: ['gdpr', 'dpa'], created_at: '2025-03-01' },

  // OZ-US — Delaware
  { id: 'd8', title: 'Certificate of Incorporation — Optical Zoom Inc', type: 'bolagsordning', entity_id: '4', status: 'aktiv', signed_date: '2026-03-27', tags: ['delaware', 'stripe-atlas'], created_at: '2026-03-27' },
  { id: 'd9', title: 'Bylaws — Optical Zoom Inc', type: 'bolagsordning', entity_id: '4', status: 'aktiv', signed_date: '2026-03-27', tags: ['delaware', 'bylaws'], created_at: '2026-03-27' },
  { id: 'd10', title: '83(b) Election — Erik Svensson', type: 'övrigt', entity_id: '4', status: 'aktiv', signed_date: '2026-03-27', expiry_date: '2026-04-27', tags: ['irs', '83b', 'urgent'], created_at: '2026-03-27' },

  // LVX-AE
  { id: 'd11', title: 'LandveX AC — DIFC Formation Documents', type: 'bolagsordning', entity_id: '5', status: 'utkast', tags: ['difc', 'forming'], created_at: '2026-04-01' },

  // LVX-US
  { id: 'd12', title: 'Certificate of Formation — LandveX Inc (TX)', type: 'bolagsordning', entity_id: '6', status: 'aktiv', signed_date: '2026-03-31', tags: ['texas', 'llc', 'northwest'], created_at: '2026-03-31' },
  { id: 'd13', title: 'EIN Application — LandveX Inc', type: 'övrigt', entity_id: '6', status: 'under_förhandling', counterpart: 'IRS / Northwest Registered Agent', tags: ['ein', 'tax-id', 'pending'], created_at: '2026-03-29' },
]

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  { id: 't1', name: 'NDA — Standard (SV)', description: 'Sekretessavtal för interna och externa parter', category: 'nda', language: 'sv' },
  { id: 't2', name: 'NDA — Standard (EN)', description: 'Non-Disclosure Agreement for international use', category: 'nda', language: 'en' },
  { id: 't3', name: 'Anställningsavtal — Sverige', description: 'Standard anställningsavtal enligt LAS', category: 'anställning', language: 'sv' },
  { id: 't4', name: 'Konsultavtal', description: 'Avtal för konsulter och frilansare', category: 'leverantör', language: 'sv' },
  { id: 't5', name: 'Aktieägaravtal — Enkelt', description: 'Grundläggande aktieägaravtal för startup', category: 'aktieägaravtal', language: 'sv' },
  { id: 't6', name: 'IP Assignment Agreement', description: 'Transfer of intellectual property rights', category: 'ip', language: 'en' },
  { id: 't7', name: 'GDPR Data Processing Agreement', description: 'DPA for EU data processors', category: 'kund', language: 'en' },
  { id: 't8', name: 'SaaS Customer Agreement', description: 'Standard terms for SaaS customers', category: 'kund', language: 'en' },
]

export const IP_ASSETS: IPAsset[] = [
  { id: 'ip1', name: 'Wavult', type: 'varumärke', jurisdiction: 'Sverige', entity_id: '2', registered: false, status: 'under_ansökan' },
  { id: 'ip2', name: 'quiXzoom', type: 'varumärke', jurisdiction: 'Sverige', entity_id: '2', registered: false, status: 'under_ansökan' },
  { id: 'ip3', name: 'LandveX', type: 'varumärke', jurisdiction: 'Sverige', entity_id: '2', registered: false, status: 'under_ansökan' },
  { id: 'ip4', name: 'wavult.com', type: 'domän', jurisdiction: 'Global', entity_id: '1', registered: true, registration_number: 'Ascio/2026', expiry_date: '2027-01-07', status: 'aktiv' },
  { id: 'ip5', name: 'quixzoom.com', type: 'domän', jurisdiction: 'Global', entity_id: '1', registered: true, expiry_date: '2027-03-15', status: 'aktiv' },
  { id: 'ip6', name: 'landvex.com', type: 'domän', jurisdiction: 'Global', entity_id: '1', registered: true, expiry_date: '2027-01-15', status: 'aktiv' },
  { id: 'ip7', name: 'Wavult DS — Källkod', type: 'källkod', jurisdiction: 'Global', entity_id: '1', registered: false, status: 'aktiv' },
]
