export interface TrustJurisdiction {
  id: string
  name: string
  flag: string
  type: 'trust' | 'foundation' | 'both'

  // Struktur
  structure: string
  governing_law: string

  // Fördelar
  advantages: string[]

  // Skatt
  tax_rate: string
  tax_treaty: boolean
  capital_gains_tax: string
  estate_tax: string

  // Setup
  setup_cost_usd: number
  annual_cost_usd: number
  setup_weeks: number

  // Krav
  requires_local_trustee: boolean
  requires_substance: boolean
  min_assets_usd?: number
  public_register: boolean

  // Bäst för
  best_for: string[]

  // Setup-steg
  setup_steps: TrustSetupStep[]
}

export interface TrustSetupStep {
  id: string
  order: number
  title: string
  description: string
  duration: string
  cost_usd?: number
  requires: string[]
  status: 'not_started' | 'in_progress' | 'completed'
  category: 'legal' | 'banking' | 'registration' | 'documentation' | 'tax'
}

export interface TrustStructure {
  id: string
  jurisdiction_id: string
  name: string
  type: 'discretionary_trust' | 'purpose_trust' | 'foundation' | 'private_trust_company'

  // Parter
  settlor: string
  trustee: string
  protector?: string
  beneficiaries: string[]

  // Tillgångar
  assets: TrustAsset[]

  // Status
  status: 'planning' | 'establishing' | 'active' | 'winding_up'
  established_date?: string

  // Dokument
  documents: TrustDocument[]
}

export interface TrustAsset {
  type: 'ip' | 'shares' | 'real_estate' | 'cash' | 'crypto' | 'other'
  description: string
  value_usd?: number
  transferred: boolean
}

export interface TrustDocument {
  name: string
  status: 'draft' | 'signed' | 'filed'
  required: boolean
}

// ── JURISDIKTIONER ─────────────────────────────────────────────────────────────

export const TRUST_JURISDICTIONS: TrustJurisdiction[] = [
  {
    id: 'difc',
    name: 'UAE — DIFC (Dubai)',
    flag: '🇦🇪',
    type: 'both',
    structure: 'DIFC Trust / Foundation',
    governing_law: 'DIFC Trusts Law 2018 (DIFC Law No. 4 of 2018)',
    advantages: [
      '0% kapitalvinstskatt och arvsskatt',
      'Engelsk common law — globalt erkänd',
      'Politisk stabilitet, stark rättsstat',
      'Perfekt för IP-holding och familjeförmögenheter',
      'Diskret — inget publikt register',
      'Nära Wavult Group DMCC (samma jurisdiktion)',
      'Kan hålla tillgångar globalt utan begränsning',
    ],
    tax_rate: '0%',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 25000,
    annual_cost_usd: 8000,
    setup_weeks: 8,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['IP-skydd', 'Familjeförmögenhet', 'Succession', 'Koncernstruktur', 'Investeringar'],
    setup_steps: [
      {
        id: 'difc-1', order: 1, title: 'Välj DIFC-licensierad trustee',
        description: 'Identifiera och kontraktera en DIFC-licensierad trustee (t.ex. Trident Trust, Intertrust, Vistra)',
        duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started',
      },
      {
        id: 'difc-2', order: 2, title: 'Utarbeta Trust Deed',
        description: 'Trustee utarbetar Trust Deed med settlor-instruktioner, beneficiary-struktur och protector-mandat',
        duration: '2-3 veckor', cost_usd: 8000, category: 'legal',
        requires: ['passport', 'proof_of_address', 'source_of_funds'], status: 'not_started',
      },
      {
        id: 'difc-3', order: 3, title: 'DIFC registrering',
        description: 'Registrering hos DIFC Registrar of Trusts (om önskas — frivilligt)',
        duration: '1 vecka', cost_usd: 5000, category: 'registration',
        requires: ['trust_deed'], status: 'not_started',
      },
      {
        id: 'difc-4', order: 4, title: 'KYC/AML-process',
        description: 'Fullständig KYC för settlor, beneficiaries och UBO-deklaration',
        duration: '2-3 veckor', category: 'documentation',
        requires: ['passport', 'bank_statements', 'source_of_wealth'], status: 'not_started',
      },
      {
        id: 'difc-5', order: 5, title: 'Bankkonto',
        description: 'Öppna trustkonto hos UAE-bank (Emirates NBD, ADCB, Mashreq Private Banking)',
        duration: '4-8 veckor', cost_usd: 1000, category: 'banking',
        requires: ['trust_deed', 'kyc_complete'], status: 'not_started',
      },
      {
        id: 'difc-6', order: 6, title: 'Tillgångsöverföring',
        description: 'Överlåt IP, aktier och andra tillgångar till trusten',
        duration: '2-4 veckor', category: 'legal',
        requires: ['bank_account', 'valuation'], status: 'not_started',
      },
    ],
  },
  {
    id: 'jersey',
    name: 'Jersey (Channel Islands)',
    flag: '🇯🇪',
    type: 'trust',
    structure: 'Jersey Discretionary Trust',
    governing_law: 'Trusts (Jersey) Law 1984 (as amended)',
    advantages: [
      'Världens mest använda trustjurisdiktion för HNW',
      'Engelsk common law — globalt erkänd rättsordning',
      'Stark integritetsskydd — inget publikt register',
      'Politisk stabilitet, Crown Dependency',
      'Stora banker och professionella trustees tillgängliga',
      'OECD-vit lista, EU-godkänd (BEPS-kompatibel)',
      'Flexibel truststruktur — enkelt att modifiera',
    ],
    tax_rate: '0% (Jersey-baserade inkomster)',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 20000,
    annual_cost_usd: 12000,
    setup_weeks: 10,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['Familjeförmögenhet', 'IP-holding', 'Investeringsportfölj', 'Succession', 'Internationell expansion'],
    setup_steps: [
      {
        id: 'jersey-1', order: 1, title: 'Välj Jersey-licensierad trustee',
        description: 'Välj bland JFSC-licensierade trustees: Vistra, Intertrust, Ocorian, Apex Group',
        duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started',
      },
      {
        id: 'jersey-2', order: 2, title: 'Trust Deed & Letter of Wishes',
        description: 'Utarbeta Trust Deed och Letter of Wishes (ej bindande men vägledande för trustee)',
        duration: '3-4 veckor', cost_usd: 10000, category: 'legal',
        requires: ['passport', 'proof_of_address'], status: 'not_started',
      },
      {
        id: 'jersey-3', order: 3, title: 'KYC & Due Diligence',
        description: 'Djupgående KYC för alla parter inkl. source of wealth-dokumentation',
        duration: '2-4 veckor', category: 'documentation',
        requires: ['passport', 'bank_references', 'source_of_wealth'], status: 'not_started',
      },
      {
        id: 'jersey-4', order: 4, title: 'Bankkonto Jersey',
        description: 'Trustkonto hos Jersey-bank: NatWest International, Barclays Private, HSBC Private',
        duration: '6-12 veckor', category: 'banking',
        requires: ['trust_deed', 'kyc_complete'], status: 'not_started',
      },
      {
        id: 'jersey-5', order: 5, title: 'Tillgångsöverföring',
        description: 'Värdering och överföring av tillgångar till trusten',
        duration: '2-4 veckor', category: 'legal',
        requires: ['bank_account'], status: 'not_started',
      },
    ],
  },
  {
    id: 'bvi',
    name: 'British Virgin Islands',
    flag: '🇻🇬',
    type: 'trust',
    structure: 'BVI VISTA Trust / Purpose Trust',
    governing_law: 'Trustee Act 1961, Virgin Islands Special Trusts Act 2003 (VISTA)',
    advantages: [
      'VISTA-trust — unikt: trustee kan INTE ingripa i bolagsförvaltning',
      'Perfekt för att hålla BVI Business Companies',
      'Stark sekretess — inget beneficiary-register',
      '0% skatt på alla trust-inkomster',
      'Kostnadseffektivt — lägre fees än Jersey/DIFC',
      'Engelsk common law',
      'Enkel administration',
    ],
    tax_rate: '0%',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 12000,
    annual_cost_usd: 6000,
    setup_weeks: 6,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['Aktieholding', 'Start-up equity', 'Crypto-tillgångar', 'Kostnadseffektiv struktur'],
    setup_steps: [
      {
        id: 'bvi-1', order: 1, title: 'BVI-licensierad trustee',
        description: 'VISTA-auktoriserad trustee — Harneys, Conyers, Maples, Carey Olsen',
        duration: '1 vecka', category: 'legal', requires: [], status: 'not_started',
      },
      {
        id: 'bvi-2', order: 2, title: 'Trust Deed (VISTA)',
        description: 'VISTA-anpassad Trust Deed med Office of Director-klausul',
        duration: '2-3 veckor', cost_usd: 5000, category: 'legal',
        requires: ['passport', 'proof_of_address'], status: 'not_started',
      },
      {
        id: 'bvi-3', order: 3, title: 'KYC-process',
        description: 'KYC enligt BVI AML-krav',
        duration: '2-3 veckor', category: 'documentation',
        requires: ['passport', 'proof_of_address', 'bank_reference'], status: 'not_started',
      },
      {
        id: 'bvi-4', order: 4, title: 'Tillgångsöverföring',
        description: 'Överlåt aktier/tillgångar till VISTA-trusten',
        duration: '1-2 veckor', category: 'legal',
        requires: ['trust_deed'], status: 'not_started',
      },
    ],
  },
  {
    id: 'cayman',
    name: 'Cayman Islands',
    flag: '🇰🇾',
    type: 'both',
    structure: 'Cayman STAR Trust / Foundation Company',
    governing_law: 'Special Trusts (Alternative Regime) Law 1997 (STAR)',
    advantages: [
      'STAR Trust — kan ha både beneficiaries och ändamål simultaneously',
      'Foundation Company — hybridstruktur bolag/trust',
      '0% skatt, ingen kapitalvinstskatt',
      'Ledande för institutionell kapitalförvaltning och PE-fonder',
      'Engelsk common law, välkänd internationellt',
      'Stark sekretess',
    ],
    tax_rate: '0%',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 18000,
    annual_cost_usd: 10000,
    setup_weeks: 8,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['PE/VC-strukturer', 'Family office', 'Filantropiska ändamål', 'Komplex kapitalförvaltning'],
    setup_steps: [
      {
        id: 'cayman-1', order: 1, title: 'Välj CIMA-licensierad trustee',
        description: 'Cayman Islands Monetary Authority-licensierad trustee',
        duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started',
      },
      {
        id: 'cayman-2', order: 2, title: 'STAR Trust Deed eller Foundation Articles',
        description: 'Välj rätt struktur: STAR Trust eller Foundation Company',
        duration: '3-4 veckor', cost_usd: 8000, category: 'legal',
        requires: ['passport'], status: 'not_started',
      },
      {
        id: 'cayman-3', order: 3, title: 'Registrering',
        description: 'Foundation Company registreras hos Cayman Registrar',
        duration: '1-2 veckor', cost_usd: 3000, category: 'registration',
        requires: ['articles'], status: 'not_started',
      },
      {
        id: 'cayman-4', order: 4, title: 'KYC & Banking',
        description: 'KYC-process och bankkonto (Butterfield, Cayman National)',
        duration: '4-8 veckor', category: 'banking',
        requires: ['trust_deed', 'kyc_complete'], status: 'not_started',
      },
    ],
  },
  {
    id: 'liechtenstein',
    name: 'Liechtenstein',
    flag: '🇱🇮',
    type: 'foundation',
    structure: 'Liechtenstein Stiftung (Foundation)',
    governing_law: 'Personen- und Gesellschaftsrecht (PGR) 1926',
    advantages: [
      'Äldsta och mest ansedda foundation-jurisdiktionen i Europa',
      'Stiftung är en juridisk person — inte beroende av trustee',
      'EES-medlem — EU-marknadstillgång',
      'Familjetradition och succession',
      'Diskret — Liechtenstein har starka sekretesslagar',
      'Kan äga bolag, fastigheter, IP globalt',
    ],
    tax_rate: '12.5% (på Liechtenstein-inkomster)',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 30000,
    annual_cost_usd: 15000,
    setup_weeks: 12,
    requires_local_trustee: false,
    requires_substance: true,
    public_register: true,
    best_for: ['Generationsskifte', 'Europeisk familjeförmögenhet', 'Filantropiska ändamål', 'EES-tillgång'],
    setup_steps: [
      {
        id: 'li-1', order: 1, title: 'Välj Liechtenstein-advokat',
        description: 'Liechtenstein-licensierad advokat krävs: Marxer & Partner, Schädler Haas',
        duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started',
      },
      {
        id: 'li-2', order: 2, title: 'Stiftungsurkunde',
        description: 'Stiftelseurkund med ändamålsbeskrivning, styrelse och förmånstagare',
        duration: '4-6 veckor', cost_usd: 15000, category: 'legal',
        requires: ['passport', 'proof_of_address', 'source_of_wealth'], status: 'not_started',
      },
      {
        id: 'li-3', order: 3, title: 'Registrering Handelsregister',
        description: 'Obligatorisk registrering i Liechtenstein Handelsregister',
        duration: '2-3 veckor', cost_usd: 3000, category: 'registration',
        requires: ['stiftungsurkunde'], status: 'not_started',
      },
      {
        id: 'li-4', order: 4, title: 'Bankkonto',
        description: 'LLB (Liechtensteinische Landesbank), VP Bank, Liechtensteinische Privatbank',
        duration: '4-8 veckor', category: 'banking',
        requires: ['registration', 'kyc_complete'], status: 'not_started',
      },
    ],
  },
  {
    id: 'singapore',
    name: 'Singapore',
    flag: '🇸🇬',
    type: 'trust',
    structure: 'Singapore Trust / VCC',
    governing_law: 'Trustees Act (Cap. 337)',
    advantages: [
      'Asiens ledande finanscentrum',
      'Stark regel of law, politisk stabilitet',
      'Extensivt nät av skatteavtal (80+ länder)',
      'Variable Capital Company (VCC) — unik hybridstruktur',
      'Attraktivt för Asien-expansion',
      'MAS-reglerat — högt förtroende',
    ],
    tax_rate: '17% bolagsskatt (undantag för godkända strukturer)',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 22000,
    annual_cost_usd: 12000,
    setup_weeks: 10,
    requires_local_trustee: true,
    requires_substance: true,
    public_register: false,
    best_for: ['Asiatisk expansion', 'Family office', 'PE-fonder', 'IP-holding Asien'],
    setup_steps: [
      {
        id: 'sg-1', order: 1, title: 'MAS-licensierad trustee',
        description: 'Monetary Authority of Singapore-licensierad trustee',
        duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started',
      },
      {
        id: 'sg-2', order: 2, title: 'Trust Deed',
        description: 'Singapore-anpassad Trust Deed',
        duration: '3-4 veckor', cost_usd: 10000, category: 'legal',
        requires: ['passport', 'proof_of_address'], status: 'not_started',
      },
      {
        id: 'sg-3', order: 3, title: 'MAS-ansökan (om Family Office)',
        description: 'Family Office-godkännande hos MAS för skatteundantag 13O/13U',
        duration: '8-16 veckor', cost_usd: 5000, category: 'registration',
        requires: ['trust_deed', 'aum_proof'], status: 'not_started',
      },
      {
        id: 'sg-4', order: 4, title: 'Bankkonto Singapore',
        description: 'DBS Private, UOB, OCBC, Standard Chartered Private',
        duration: '4-8 veckor', category: 'banking',
        requires: ['trust_deed', 'kyc_complete'], status: 'not_started',
      },
    ],
  },
  {
    id: 'luxembourg',
    name: 'Luxemburg',
    flag: '🇱🇺',
    type: 'foundation',
    structure: 'Luxembourg Foundation / SPF',
    governing_law: 'Loi du 27 juillet 2003 (Foundation), Loi SPF 2007',
    advantages: [
      'Hjärtat av EU — passporterar till alla 27 EU-länder',
      'SPF (Société de Gestion de Patrimoine Familial) — 0% skatt på utdelningar och reavinster',
      'Extensivt skatteavtalsnät (85+ länder)',
      'Världens näst största fondmarknad efter USA',
      'Stark sekretess, politisk stabilitet',
      'Idealisk för europeiska familjeförmögenheter och PE-strukturer',
    ],
    tax_rate: '0% (SPF), 17% bolagsskatt (vanliga bolag)',
    tax_treaty: true,
    capital_gains_tax: '0% (SPF)',
    estate_tax: '0% (direkt arvinge)',
    setup_cost_usd: 35000,
    annual_cost_usd: 18000,
    setup_weeks: 10,
    requires_local_trustee: false,
    requires_substance: true,
    public_register: true,
    best_for: ['Europeisk familjeförmögenhet', 'PE/VC-strukturer', 'IP-holding EU', 'Fondstruktur', 'EU-passportering'],
    setup_steps: [
      { id: 'lu-1', order: 1, title: 'Välj Luxembourg-advokat', description: 'CSSF-registrerad advokat: Arendt & Medernach, Elvinger Hoss Prussen, Allen & Overy Luxembourg', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'lu-2', order: 2, title: 'Välj struktur: SPF eller Foundation', description: 'SPF = skatteoptimerat familjeförmögenhetsbolag. Foundation = välgörenhet/filantropiska ändamål', duration: '1 vecka', category: 'legal', requires: [], status: 'not_started' },
      { id: 'lu-3', order: 3, title: 'Notariatsakt och bolagsordning', description: 'SPF-stiftningsakt hos luxemburgsk notarie, minsta aktiekapital €12 000', duration: '2-3 veckor', cost_usd: 15000, category: 'legal', requires: ['passport', 'proof_of_address', 'source_of_wealth'], status: 'not_started' },
      { id: 'lu-4', order: 4, title: 'Registrering RCS', description: 'Registrering i Registre de Commerce et des Sociétés (RCS Luxembourg)', duration: '1-2 veckor', cost_usd: 2000, category: 'registration', requires: ['notarial_act'], status: 'not_started' },
      { id: 'lu-5', order: 5, title: 'Bankkonto Luxembourg', description: 'BGL BNP Paribas, Banque de Luxembourg, ING Luxembourg, Spuerkeess', duration: '4-8 veckor', category: 'banking', requires: ['rcs_registration', 'kyc_complete'], status: 'not_started' },
      { id: 'lu-6', order: 6, title: 'Tillgångsöverföring', description: 'Överlåt aktier, IP och finansiella instrument till SPF/Foundation', duration: '2-4 veckor', category: 'legal', requires: ['bank_account'], status: 'not_started' },
    ],
  },
  {
    id: 'monaco',
    name: 'Monaco',
    flag: '🇲🇨',
    type: 'foundation',
    structure: 'Monaco Foundation / SAM',
    governing_law: 'Loi n° 56 du 29 janvier 1922 (Associations), Ordonnance 2.318 (Fondations)',
    advantages: [
      '0% inkomstskatt för privatpersoner (sedan 1869)',
      'Ingen kapitalvinstskatt, ingen arvsskatt (direkt arvinge)',
      'Prestige — världens mest eftertraktade residens',
      'Litet territorium, extremt hög diskretion i praktiken',
      'Franska rättssystem — EU-kompatibelt',
      'Ingen automatisk informationsutbyte för privatpersoner',
    ],
    tax_rate: '0% (privatperson med Monaco-residens)',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0% (direkt arvinge)',
    setup_cost_usd: 50000,
    annual_cost_usd: 25000,
    setup_weeks: 16,
    requires_local_trustee: false,
    requires_substance: true,
    public_register: false,
    min_assets_usd: 500000,
    best_for: ['UHNW privatpersoner', 'Succession', 'Diskret förmögenhetsförvaltning', 'Residens + struktur'],
    setup_steps: [
      { id: 'mc-1', order: 1, title: 'Monaco-residens (förutsättning)', description: 'Foundation är enklast med Monaco-residens. Kontakta Direction de la Résidence privée', duration: '6-12 månader', cost_usd: 10000, category: 'legal', requires: ['financial_proof', 'clean_criminal_record'], status: 'not_started' },
      { id: 'mc-2', order: 2, title: 'Välj Monaco-advokat', description: 'Licencierade advokater: Zabaldano Lef & Associés, Gordon S. Blair, Moussé & Joly', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'mc-3', order: 3, title: 'Foundation-ansökan till Ministère d\'État', description: 'Stiftelse kräver godkännande av Monaco-regeringen och tjänar allmänt ändamål', duration: '8-16 veckor', cost_usd: 20000, category: 'registration', requires: ['statutes', 'government_approval'], status: 'not_started' },
      { id: 'mc-4', order: 4, title: 'Bankkonto Monaco', description: 'Credit Suisse Monaco, BNP Paribas Wealth Management, Julius Bär Monaco', duration: '4-8 veckor', category: 'banking', requires: ['foundation_registered', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'guernsey',
    name: 'Guernsey (Channel Islands)',
    flag: '🇬🇬',
    type: 'both',
    structure: 'Guernsey Trust / Protected Cell Company',
    governing_law: 'Trusts (Guernsey) Law 2007',
    advantages: [
      'FATCA- och CRS-kompatibel — lättare bankrelationer',
      'Stark trusträtt, engelsk common law',
      'Protected Cell Company (PCC) — unik för fondstrukturer',
      'Crown Dependency — politisk stabilitet',
      'Konkurrenskraftiga avgifter jämfört med Jersey',
      'GSFIA-reglerat — högt institutionellt förtroende',
    ],
    tax_rate: '0% (trust-inkomster)',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 15000,
    annual_cost_usd: 8000,
    setup_weeks: 8,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['Kapitalförvaltning', 'Fondstruktur', 'Familjeförmögenhet', 'Kostnadseffektivt alternativ till Jersey'],
    setup_steps: [
      { id: 'gg-1', order: 1, title: 'GSFIA-licensierad trustee', description: 'Guernsey Financial Services Commission-licensierad: Apex, Suntera, Aztec Group', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'gg-2', order: 2, title: 'Trust Deed', description: 'Guernsey-anpassad Trust Deed, Letter of Wishes', duration: '2-3 veckor', cost_usd: 6000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'gg-3', order: 3, title: 'KYC & AML', description: 'KYC-process enligt Guernsey AML/CFT Handbook', duration: '2-3 veckor', category: 'documentation', requires: ['passport', 'source_of_wealth'], status: 'not_started' },
      { id: 'gg-4', order: 4, title: 'Bankkonto', description: 'NatWest International, Barclays, RBC Guernsey', duration: '4-8 veckor', category: 'banking', requires: ['trust_deed', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'malta',
    name: 'Malta',
    flag: '🇲🇹',
    type: 'trust',
    structure: 'Malta Trust / Private Foundation',
    governing_law: 'Trusts and Trustees Act (Cap. 331), Second Schedule',
    advantages: [
      'EU-member — full EU-marknadstillgång',
      'Baserat på brittisk trusträtt + kodifierat',
      'Skatteavtal med 70+ länder',
      'Konkurrenskraftiga avgifter i EU-kontext',
      'MFSA-reglerat — välkänt internationellt',
      'Idealisk för europeiska familjer som vill ha EU-jurisdiktion',
    ],
    tax_rate: '0% (trust utan maltesiska beneficiaries)',
    tax_treaty: true,
    capital_gains_tax: '0% (utländska tillgångar)',
    estate_tax: '0%',
    setup_cost_usd: 18000,
    annual_cost_usd: 9000,
    setup_weeks: 8,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['EU-baserade familjer', 'IP-holding EU', 'Kostnadseffektiv EU-trust', 'Skatteavtal'],
    setup_steps: [
      { id: 'mt-1', order: 1, title: 'MFSA-licensierad trustee', description: 'Malta Financial Services Authority-licensierad trustee: Zenith Trust, Atlas Trustees, WH Partners', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'mt-2', order: 2, title: 'Trust Deed', description: 'Malta Trust Deed eller Foundation Deed', duration: '2-3 veckor', cost_usd: 7000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'mt-3', order: 3, title: 'Registrering (frivillig)', description: 'Frivillig registrering hos MFSA kan öka trovärdighet', duration: '1-2 veckor', cost_usd: 1500, category: 'registration', requires: ['trust_deed'], status: 'not_started' },
      { id: 'mt-4', order: 4, title: 'Bankkonto Malta', description: 'BOV (Bank of Valletta), HSBC Malta, APS Bank', duration: '4-6 veckor', category: 'banking', requires: ['trust_deed', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'isle_of_man',
    name: 'Isle of Man',
    flag: '🇮🇲',
    type: 'trust',
    structure: 'Isle of Man Trust',
    governing_law: 'Trusts Act 1995 (Isle of Man)',
    advantages: [
      'Crown Dependency — utmärkt rykte och stabilitet',
      'Låg inkomstskatt (20% max), 0% kapitalvinstskatt',
      'Stark trusträtt baserad på engelsk common law',
      'Nul arvsskatt',
      'Bra för shipping, fintech och digital assets',
      'IOMFSA-reglerat — erkänt internationellt',
    ],
    tax_rate: '0-20% (cap)',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 16000,
    annual_cost_usd: 8000,
    setup_weeks: 8,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['Shipping', 'Digital assets/Crypto', 'Fintech-holding', 'Familjeförmögenhet'],
    setup_steps: [
      { id: 'iom-1', order: 1, title: 'IOMFSA-licensierad trustee', description: 'Isle of Man FSA-licensierad: Equity Trust, Suntera Global, Apex Group', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'iom-2', order: 2, title: 'Trust Deed', description: 'IOM Trust Deed med Letter of Wishes', duration: '2-3 veckor', cost_usd: 6000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'iom-3', order: 3, title: 'KYC-process', description: 'KYC enligt IOM AML/CFT Code', duration: '2-3 veckor', category: 'documentation', requires: ['passport', 'source_of_wealth'], status: 'not_started' },
      { id: 'iom-4', order: 4, title: 'Bankkonto IOM', description: 'Isle of Man Bank, HSBC IoM, Conister Bank', duration: '4-6 veckor', category: 'banking', requires: ['trust_deed', 'kyc_complete'], status: 'not_started' },
    ],
  },
]

// Wavults rekommenderade struktur
export const WAVULT_RECOMMENDED_STRUCTURE = {
  tier1: 'difc',
  tier2: 'jersey',
  rationale: 'DIFC passar perfekt eftersom Wavult Group DMCC redan är i Dubai. IP, aktier och royalties kan hanteras i samma jurisdiktion utan cross-border-komplikationer.',
  ip_structure: `
Wavult DIFC Foundation (Dubai)
  ↓ äger IP-rättigheter (kod, varumärken, patent)
  ↓ licensierar till →
Wavult Group DMCC (Dubai) → Wavult Operations AB (Sverige) → Dotterbolag
  ↓
Royalty-flöde tillbaka till Foundation (0% skatt)
  `,
}
