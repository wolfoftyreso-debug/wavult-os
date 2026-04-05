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

// ── YTTERLIGARE JURISDIKTIONER ─────────────────────────────────────────────

export const ADDITIONAL_TRUST_JURISDICTIONS: TrustJurisdiction[] = [
  {
    id: 'panama',
    name: 'Panama',
    flag: '🇵🇦',
    type: 'foundation',
    structure: 'Panama Private Interest Foundation',
    governing_law: 'Ley 25 de 1995 (Fundaciones de Interés Privado)',
    advantages: [
      '0% skatt på inkomster utanför Panama',
      'En av världens mest beprövade förmögenhetsstrukturer (sedan 1995)',
      'Stark sekretess — ingen offentlig beneficiary-information',
      'Låga kostnader jämfört med europeiska alternativ',
      'Panama-kanalen-hubben för handel och shipping',
      'Flexibel struktur — kan äga bolag, fastigheter, konton',
    ],
    tax_rate: '0% (utländska inkomster)',
    tax_treaty: false,
    capital_gains_tax: '0% (utländska tillgångar)',
    estate_tax: '0%',
    setup_cost_usd: 8000,
    annual_cost_usd: 3000,
    setup_weeks: 4,
    requires_local_trustee: false,
    requires_substance: false,
    public_register: false,
    best_for: ['Latin Amerika-expansion', 'Shipping', 'Kostnadseffektiv struktur', 'Handelbolag-holding'],
    setup_steps: [
      { id: 'pa-1', order: 1, title: 'Välj Panama-advokat', description: 'Etablerade byråer: Morgan & Morgan, Arias Fábrega & Fábrega, Mossack Fonseca (ersättare)', duration: '1 vecka', category: 'legal', requires: [], status: 'not_started' },
      { id: 'pa-2', order: 2, title: 'Foundation Charter', description: 'Stiftelseurkund med Foundation Council, Protector och Beneficiaries', duration: '1-2 veckor', cost_usd: 3000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'pa-3', order: 3, title: 'Registrering Registro Público', description: 'Offentlig registrering — Foundation Council syns, Beneficiaries ej', duration: '1-2 veckor', cost_usd: 500, category: 'registration', requires: ['charter'], status: 'not_started' },
      { id: 'pa-4', order: 4, title: 'Bankkonto', description: 'Banco Nacional de Panamá, Multibank, Global Bank', duration: '3-6 veckor', category: 'banking', requires: ['registration', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'mauritius',
    name: 'Mauritius',
    flag: '🇲🇺',
    type: 'trust',
    structure: 'Mauritius Trust / GBC1',
    governing_law: 'Trusts Act 2001, Financial Services Act 2007',
    advantages: [
      'Afrikas ledande finanscentrum (GFCI Top 20)',
      'Extensivt skatteavtalsnät — 46 länder inkl. Indien, Kina, Afrika',
      'Nyckel för Indien-access (DTAA-treaty)',
      'Politisk stabilitet, Common Law-baserat',
      'FSC-reglerat — internationellt erkänt',
      'Perfekt brygga mellan Asien och Afrika',
    ],
    tax_rate: '15% (GBC), 0% (trust utan Mauritius-beneficiaries)',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 20000,
    annual_cost_usd: 10000,
    setup_weeks: 8,
    requires_local_trustee: true,
    requires_substance: true,
    public_register: false,
    best_for: ['Afrika-expansion', 'Indien-access', 'Asia-Afrika-brygga', 'PE-fonder Afrika'],
    setup_steps: [
      { id: 'mu-1', order: 1, title: 'FSC-licensierad trustee', description: 'Financial Services Commission Mauritius-licensierad: Abax, SANNE, IQ-EQ', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'mu-2', order: 2, title: 'Trust Deed', description: 'Mauritius Trust Deed, välj GBC1 eller trust-struktur', duration: '2-3 veckor', cost_usd: 8000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'mu-3', order: 3, title: 'FSC Licens och Tax Residence Certificate', description: 'Kritiskt för treaty-benefits, särskilt India DTAA', duration: '3-4 veckor', cost_usd: 3000, category: 'registration', requires: ['trust_deed'], status: 'not_started' },
      { id: 'mu-4', order: 4, title: 'Bankkonto Mauritius', description: 'MCB (Mauritius Commercial Bank), SBM Bank, AfrAsia Bank', duration: '4-6 veckor', category: 'banking', requires: ['fsc_license', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'cook_islands',
    name: 'Cook Islands',
    flag: '🇨🇰',
    type: 'trust',
    structure: 'Cook Islands International Trust',
    governing_law: 'International Trusts Act 1984 (as amended 1989, 1999)',
    advantages: [
      'Världens STARKASTE tillgångsskyddslagar',
      'Utländsk domstolsdom kan inte verkställas — period',
      'USA-rättssystem kan inte nå tillgångar',
      '0% skatt på trust-inkomster',
      'Trustee kan flytta trusten om hot uppstår',
      'Idealt för creditor protection mot stämningar',
    ],
    tax_rate: '0%',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 18000,
    annual_cost_usd: 8000,
    setup_weeks: 6,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['Tillgångsskydd', 'Creditor protection', 'Rättviseskydd', 'UHNW-säkerhet'],
    setup_steps: [
      { id: 'ck-1', order: 1, title: 'Cook Islands-licensierad trustee', description: 'Trustee måste vara Cook Islands-baserad: Southpac Trust, Cook Islands Trust Corporation', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'ck-2', order: 2, title: 'International Trust Deed', description: 'Specifik ITA 1984-anpassad Trust Deed med spill-over-klausuler', duration: '2-3 veckor', cost_usd: 8000, category: 'legal', requires: ['passport', 'source_of_wealth'], status: 'not_started' },
      { id: 'ck-3', order: 3, title: 'KYC & AML', description: 'Strikta KYC-krav för att möta internationella standarder', duration: '2-3 veckor', category: 'documentation', requires: ['passport', 'bank_statements'], status: 'not_started' },
      { id: 'ck-4', order: 4, title: 'Tillgångsöverföring', description: 'Överlåt tillgångar — viktigast: MINST 2 år INNAN potentiell fordran', duration: '1-2 veckor', category: 'legal', requires: ['trust_deed'], status: 'not_started' },
    ],
  },
  {
    id: 'seychelles',
    name: 'Seychelles',
    flag: '🇸🇨',
    type: 'foundation',
    structure: 'Seychelles Foundation / International Trust',
    governing_law: 'Foundations Act 2009, International Trusts Act 1994',
    advantages: [
      'Lägsta setup-kostnad bland quality jurisdictions',
      'Snabbt — 2-3 veckor till aktiv struktur',
      'Ingen offentlig registrering av beneficiaries',
      '0% skatt på internationella inkomster',
      'IFSP-reglerat (International Financial Services Authority)',
      'Bra kostnadseffektivt alternativ för enklare strukturer',
    ],
    tax_rate: '0%',
    tax_treaty: false,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 5000,
    annual_cost_usd: 2500,
    setup_weeks: 3,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['Kostnadseffektivt', 'Snabb setup', 'Digital assets', 'Enkel holding-struktur'],
    setup_steps: [
      { id: 'sc-1', order: 1, title: 'IFSP-licensierad trustee', description: 'International Financial Services Authority Seychelles-licensierad', duration: '1 vecka', category: 'legal', requires: [], status: 'not_started' },
      { id: 'sc-2', order: 2, title: 'Foundation Charter / Trust Deed', description: 'Enkel men juridiskt solid stiftelseurkund', duration: '1-2 veckor', cost_usd: 2000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'sc-3', order: 3, title: 'Bankkonto (utmaning)', description: 'Seychelles-banker är restriktiva — ofta behövs internationell bank med Seychelles-enhet', duration: '4-8 veckor', category: 'banking', requires: ['foundation_docs', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'bahrain',
    name: 'Bahrain',
    flag: '🇧🇭',
    type: 'both',
    structure: 'Bahrain Trust / Family Waqf',
    governing_law: 'Bahrain Financial Trusts Law 2016, Law No. 23 of 2016',
    advantages: [
      '0% personlig inkomstskatt, 0% kapitalvinstskatt',
      'GCC-marknadstillgång (Saudi, UAE, Kuwait, Qatar)',
      'Islamisk banking-kompatibel (Waqf-struktur)',
      'CBB-reglerat (Central Bank of Bahrain)',
      'Bra för Mellanöstern-expansion utanför UAE',
      'Starka band till saudiska affärsintressen',
    ],
    tax_rate: '0%',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 20000,
    annual_cost_usd: 8000,
    setup_weeks: 10,
    requires_local_trustee: true,
    requires_substance: false,
    public_register: false,
    best_for: ['GCC-expansion', 'Islamisk banking', 'Saudi-Arabia access', 'Mellanöstern-holding'],
    setup_steps: [
      { id: 'bh-1', order: 1, title: 'CBB-licensierad trustee', description: 'Central Bank of Bahrain-licensierad: Investcorp, BBK, NBB', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'bh-2', order: 2, title: 'Trust Deed (konventionell eller Waqf)', description: 'Välj konventionell trust eller islamisk Waqf-struktur', duration: '3-4 veckor', cost_usd: 8000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'bh-3', order: 3, title: 'CBB-registrering och KYC', description: 'Full KYC, source of funds och CBB compliance', duration: '3-4 veckor', category: 'documentation', requires: ['passport', 'source_of_wealth'], status: 'not_started' },
      { id: 'bh-4', order: 4, title: 'Bankkonto Bahrain', description: 'National Bank of Bahrain, Ahli United Bank, Gulf International Bank', duration: '4-6 veckor', category: 'banking', requires: ['trust_deed', 'kyc_complete'], status: 'not_started' },
    ],
  },
  {
    id: 'hong_kong',
    name: 'Hong Kong',
    flag: '🇭🇰',
    type: 'trust',
    structure: 'Hong Kong Trust',
    governing_law: 'Trustee Ordinance (Cap. 29)',
    advantages: [
      'Kina-access — oersättlig för Kina-affärer trots osäkerhet',
      '0% kapitalvinstskatt, 0% arvsskatt',
      'Engelska common law — stabil rättstradition',
      'Asiens ledande financial centre historiskt',
      'Extensivt nät med Kina (CEPA-avtal)',
      'Lägre kostnader än Singapore för enklare strukturer',
    ],
    tax_rate: '0% (utländska inkomster), 16.5% (HK-inkomster)',
    tax_treaty: true,
    capital_gains_tax: '0%',
    estate_tax: '0%',
    setup_cost_usd: 18000,
    annual_cost_usd: 9000,
    setup_weeks: 8,
    requires_local_trustee: false,
    requires_substance: false,
    public_register: false,
    best_for: ['Kina-expansion', 'Asien-holding', 'Familjeförmögenhet Asien', 'IP-holding'],
    setup_steps: [
      { id: 'hk-1', order: 1, title: 'SFC-registrerad trustee', description: 'Securities and Futures Commission-registrerad eller olicensierad privat trustee', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
      { id: 'hk-2', order: 2, title: 'Trust Deed', description: 'HK Trust Deed — flexibel under Trustee Ordinance', duration: '2-3 veckor', cost_usd: 7000, category: 'legal', requires: ['passport', 'proof_of_address'], status: 'not_started' },
      { id: 'hk-3', order: 3, title: 'KYC & AML', description: 'Strikt KYC — HK har skärpt AML-krav post-2020', duration: '2-4 veckor', category: 'documentation', requires: ['passport', 'source_of_wealth'], status: 'not_started' },
      { id: 'hk-4', order: 4, title: 'Bankkonto HK', description: 'HSBC Private Banking, Standard Chartered HK, Hang Seng Bank', duration: '6-12 veckor', category: 'banking', requires: ['trust_deed', 'kyc_complete'], status: 'not_started' },
    ],
  },
]

// Alla jurisdiktioner kombinerat
export const ALL_TRUST_JURISDICTIONS = [...TRUST_JURISDICTIONS, ...ADDITIONAL_TRUST_JURISDICTIONS]

// Schweiz läggs till i ALL_TRUST_JURISDICTIONS
const SWISS_JURISDICTION: TrustJurisdiction = {
  id: 'switzerland',
  name: 'Schweiz (Zug / Genève)',
  flag: '🇨🇭',
  type: 'foundation',
  structure: 'Swiss Foundation (Stiftung) / Swiss Trust Company',
  governing_law: 'Schweizerisches Zivilgesetzbuch (ZGB) Art. 80-89a',
  advantages: [
    'Världens mest respekterade jurisdiktion för wealth management',
    'Swiss IP Box — 10% effektiv skatt på IP-inkomster',
    'Zürich/Zug: Europas "Crypto Valley" — ledande för digital asset trusts',
    'Politisk neutralitet sedan 1815 — oöverträffad stabilitet',
    'Stark banksekretesskul tur (CRS-undantag för äldre strukturer)',
    'Direktdemokrati — lagar ändras via folkomröstning, inte godtyckligt',
    'Zug: crypto-vänlig, låg kantonsskatt (~14%)',
  ],
  tax_rate: '~14% (Zug kantonal), 10% IP Box',
  tax_treaty: true,
  capital_gains_tax: '0% (privatperson)',
  estate_tax: '0% (direkt arvinge, Zug)',
  setup_cost_usd: 45000,
  annual_cost_usd: 20000,
  setup_weeks: 12,
  requires_local_trustee: false,
  requires_substance: true,
  public_register: true,
  best_for: ['IP-holding (IP Box)', 'Digital assets/Crypto', 'Prestige-struktur', 'Familjeförmögenhet', 'Generationsskifte'],
  setup_steps: [
    { id: 'ch-1', order: 1, title: 'Välj Swiss-advokat och kanton', description: 'Zug: lägst skatt, crypto-vänlig. Genève: internationell prestige. Advokat: Lenz & Staehelin, Baker McKenzie Zürich, Homburger', duration: '1-2 veckor', category: 'legal', requires: [], status: 'not_started' },
    { id: 'ch-2', order: 2, title: 'Stiftungsurkunde (Foundation Charter)', description: 'Notarialt bestyrkt stiftelseurkund med ändamål (måste vara allmännyttigt eller familjeändamål), styrelse och destinatärer', duration: '4-6 veckor', cost_usd: 20000, category: 'legal', requires: ['passport', 'proof_of_address', 'source_of_wealth'], status: 'not_started' },
    { id: 'ch-3', order: 3, title: 'Registrering i Handelsregister', description: 'Obligatorisk registrering hos kantonal handelsregister — stiftelsen blir publik juridisk person', duration: '2-3 veckor', cost_usd: 2000, category: 'registration', requires: ['foundation_charter'], status: 'not_started' },
    { id: 'ch-4', order: 4, title: 'Substance — lokal styrelse', description: 'Minst en schweizisk styrelseledamot krävs för trovärdighet och skattebehandling', duration: '2-4 veckor', cost_usd: 5000, category: 'legal', requires: ['registration'], status: 'not_started' },
    { id: 'ch-5', order: 5, title: 'Bankkonto Schweiz', description: 'UBS Private Banking, Credit Suisse (numera UBS), Julius Bär, Pictet, Lombard Odier — alla kräver substans och KYC', duration: '8-16 veckor', category: 'banking', requires: ['registration', 'local_board', 'kyc_complete'], status: 'not_started' },
    { id: 'ch-6', order: 6, title: 'IP Box-ansökan (valfritt)', description: 'Ansök om Swiss IP Box hos kantonal skattemyndighet för 10% effektiv skatt på patent/IP-royalties', duration: '4-8 veckor', cost_usd: 3000, category: 'tax', requires: ['bank_account', 'ip_valuation'], status: 'not_started' },
  ],
}

// Uppdatera ALL_TRUST_JURISDICTIONS med Schweiz
;(ALL_TRUST_JURISDICTIONS as TrustJurisdiction[]).push(SWISS_JURISDICTION)
