export interface JurisdictionRule {
  id: string
  category: 'skatt' | 'bolagsrätt' | 'arbetsrätt' | 'dataskydd' | 'rapportering' | 'licens'
  title: string
  description: string
  deadline?: string
  frequency?: 'månatlig' | 'kvartalsvis' | 'årsvis' | 'engång'
  authority: string
  status: 'uppfyllt' | 'pågår' | 'gap' | 'ej_tillämplig'
  priority: 'hög' | 'medel' | 'låg'
}

export interface Jurisdiction {
  id: string
  country: string
  country_code: string
  flag: string
  entity_ids: string[]
  tax_rate_corporate: string
  tax_rate_vat: string
  currency: string
  key_authorities: string[]
  rules: JurisdictionRule[]
  gaps: JurisdictionRule[]
  products: string[]
}

export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: 'se',
    country: 'Sverige',
    country_code: 'SE',
    flag: '🇸🇪',
    entity_ids: ['2'],
    tax_rate_corporate: '20,6%',
    tax_rate_vat: '25% (standard) / 12% / 6%',
    currency: 'SEK',
    key_authorities: ['Bolagsverket', 'Skatteverket', 'Integritetsskyddsmyndigheten (IMY)', 'Arbetsgivarverket'],
    products: ['Wavult DS', 'quiXzoom SE'],
    rules: [
      { id: 'se-1', category: 'skatt', title: 'Inkomstdeklaration 2 (2025)', description: 'Bolagets årsdeklaration för räkenskapsåret 2025', deadline: '2026-07-01', frequency: 'årsvis', authority: 'Skatteverket', status: 'pågår', priority: 'hög' },
      { id: 'se-2', category: 'skatt', title: 'Momsdeklaration Q1 2026', description: 'Momsredovisning jan–mars 2026', deadline: '2026-05-12', frequency: 'kvartalsvis', authority: 'Skatteverket', status: 'gap', priority: 'hög' },
      { id: 'se-3', category: 'bolagsrätt', title: 'Årsredovisning 2025', description: 'Inlämning till Bolagsverket senast 7 månader efter räkenskapsårets slut', deadline: '2026-07-31', frequency: 'årsvis', authority: 'Bolagsverket', status: 'pågår', priority: 'hög' },
      { id: 'se-4', category: 'bolagsrätt', title: 'Styrelseprotokoll 2026', description: 'Minst ett styrelsemöte per år dokumenterat', deadline: '2026-12-31', frequency: 'årsvis', authority: 'Bolagsverket', status: 'gap', priority: 'medel' },
      { id: 'se-5', category: 'dataskydd', title: 'GDPR-register (Art. 30)', description: 'Behandlingsregister ska föras och hållas uppdaterat', authority: 'IMY', status: 'gap', priority: 'hög' },
      { id: 'se-6', category: 'arbetsrätt', title: 'Arbetsgivardeklaration (AGI)', description: 'Månadsvis redovisning av löner och arbetsgivaravgifter', frequency: 'månatlig', authority: 'Skatteverket', status: 'uppfyllt', priority: 'hög' },
      { id: 'se-7', category: 'bolagsrätt', title: 'Kontrolluppgifter (KU)', description: 'Uppgifter till Skatteverket om utbetalda ersättningar', deadline: '2027-01-31', frequency: 'årsvis', authority: 'Skatteverket', status: 'pågår', priority: 'medel' },
    ],
    gaps: [],
  },
  {
    id: 'ae_difc',
    country: 'UAE — DIFC',
    country_code: 'AE',
    flag: '🇦🇪',
    entity_ids: ['1', '5'],
    tax_rate_corporate: '9% (mainland) / 0% (DIFC free zone, kvalificerade)',
    tax_rate_vat: '5%',
    currency: 'AED',
    key_authorities: ['DMCC Authority', 'Federal Tax Authority (FTA)', 'DIFC Courts', 'Central Bank UAE'],
    products: ['Wavult DS', 'LandveX AE'],
    rules: [
      { id: 'ae-1', category: 'licens', title: 'DMCC Trade License — Förnyelse', description: 'Årlig förnyelse av DMCC-licensen', deadline: '2026-06-01', frequency: 'årsvis', authority: 'DMCC Authority', status: 'pågår', priority: 'hög' },
      { id: 'ae-2', category: 'skatt', title: 'UAE Corporate Tax Registration', description: 'Registrering hos FTA för bolagsskatt (gäller from 2023)', authority: 'FTA', status: 'uppfyllt', priority: 'hög' },
      { id: 'ae-3', category: 'skatt', title: 'VAT Return Q1 2026', description: 'Momsdeklaration för jan–mars 2026', deadline: '2026-04-28', frequency: 'kvartalsvis', authority: 'FTA', status: 'gap', priority: 'hög' },
      { id: 'ae-4', category: 'rapportering', title: 'Economic Substance Notification', description: 'Annual notification om economic substance requirements', deadline: '2026-12-31', frequency: 'årsvis', authority: 'DMCC Authority', status: 'pågår', priority: 'medel' },
      { id: 'ae-5', category: 'bolagsrätt', title: 'UBO Register Update', description: 'Ultimate Beneficial Owners register ska hållas uppdaterat', authority: 'DMCC Authority', status: 'uppfyllt', priority: 'medel' },
    ],
    gaps: [],
  },
  {
    id: 'lt',
    country: 'Litauen',
    country_code: 'LT',
    flag: '🇱🇹',
    entity_ids: ['3'],
    tax_rate_corporate: '15% (standard) / 5% (startup, <10 anst)',
    tax_rate_vat: '21%',
    currency: 'EUR',
    key_authorities: ['Juridinių asmenų registras (JAR)', 'Valstybinė mokesčių inspekcija (VMI)', 'Sodra', 'Asmens duomenų apsaugos inspekcija'],
    products: ['quiXzoom EU'],
    rules: [
      { id: 'lt-1', category: 'skatt', title: 'Corporate Income Tax 2025', description: 'Bolagets årsdeklaration inlämnad till VMI', deadline: '2026-06-01', frequency: 'årsvis', authority: 'VMI', status: 'gap', priority: 'hög' },
      { id: 'lt-2', category: 'skatt', title: 'PVM (Moms) månadsdeklaration', description: 'Månadsvis momsredovisning för EU-registrerade bolag', frequency: 'månatlig', authority: 'VMI', status: 'gap', priority: 'hög' },
      { id: 'lt-3', category: 'arbetsrätt', title: 'Sodra månadsrapport', description: 'Månadsvis rapportering av sociala avgifter', deadline: '2026-04-15', frequency: 'månatlig', authority: 'Sodra', status: 'gap', priority: 'hög' },
      { id: 'lt-4', category: 'dataskydd', title: 'GDPR-anmälan (Art. 37)', description: 'Dataskyddsombud krävs om behandling i stor skala', authority: 'Asmens duomenų apsaugos inspekcija', status: 'ej_tillämplig', priority: 'låg' },
    ],
    gaps: [],
  },
  {
    id: 'us_de',
    country: 'Delaware, USA',
    country_code: 'US',
    flag: '🇺🇸',
    entity_ids: ['4'],
    tax_rate_corporate: '21% (federal) + 8.7% (Delaware)',
    tax_rate_vat: 'Ingen (Delaware har ingen sales tax)',
    currency: 'USD',
    key_authorities: ['Delaware Division of Corporations', 'IRS', 'SEC', 'FinCEN'],
    products: ['quiXzoom US'],
    rules: [
      { id: 'us-1', category: 'skatt', title: 'Federal Corporate Tax (Form 1120) 2025', description: 'Federal bolagsskatt för räkenskapsåret 2025', deadline: '2026-04-15', frequency: 'årsvis', authority: 'IRS', status: 'pågår', priority: 'hög' },
      { id: 'us-2', category: 'bolagsrätt', title: 'Delaware Annual Report + Franchise Tax', description: 'Årsrapport och franchisskatt till Delaware', deadline: '2026-03-01', frequency: 'årsvis', authority: 'Delaware Division of Corporations', status: 'pågår', priority: 'hög' },
      { id: 'us-3', category: 'skatt', title: 'EIN — Employer Identification Number', description: 'Federal skattenummer — ansökan pågår via Northwest', authority: 'IRS', status: 'pågår', priority: 'hög' },
      { id: 'us-4', category: 'bolagsrätt', title: '83(b) Election', description: 'KRITISK — måste lämnas in inom 30 dagar från bolagsbildning (27 mars)', deadline: '2026-04-27', authority: 'IRS', status: 'gap', priority: 'hög' },
      { id: 'us-5', category: 'rapportering', title: 'FinCEN BOI Report', description: 'Beneficial Ownership Information report krävs för nya bolag 2024+', deadline: '2027-01-01', frequency: 'engång', authority: 'FinCEN', status: 'gap', priority: 'medel' },
    ],
    gaps: [],
  },
  {
    id: 'us_tx',
    country: 'Texas, USA',
    country_code: 'US',
    flag: '🇺🇸',
    entity_ids: ['6'],
    tax_rate_corporate: '21% (federal) + Texas Franchise Tax (~0.375%)',
    tax_rate_vat: '6.25% state + max 2% lokal',
    currency: 'USD',
    key_authorities: ['Texas Secretary of State', 'Texas Comptroller', 'IRS', 'Northwest Registered Agent'],
    products: ['LandveX US'],
    rules: [
      { id: 'tx-1', category: 'skatt', title: 'Texas Franchise Tax 2025', description: 'Texas Franchise Tax Report — årsvis', deadline: '2026-05-15', frequency: 'årsvis', authority: 'Texas Comptroller', status: 'gap', priority: 'hög' },
      { id: 'tx-2', category: 'bolagsrätt', title: 'Texas PIR (Public Information Report)', description: 'Obligatorisk årsrapport till Texas SoS', deadline: '2026-05-15', frequency: 'årsvis', authority: 'Texas Secretary of State', status: 'gap', priority: 'hög' },
      { id: 'tx-3', category: 'skatt', title: 'EIN filing — LandveX Inc', description: 'EIN-ansökan via Northwest pågår för icke-US ägare', authority: 'IRS / Northwest', status: 'pågår', priority: 'hög' },
    ],
    gaps: [],
  },
]

// Beräkna gaps per jurisdiktion
JURISDICTIONS.forEach(j => {
  j.gaps = j.rules.filter(r => r.status === 'gap')
})
