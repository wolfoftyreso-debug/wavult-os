export interface LaunchStep {
  id: string;
  title: string;
  description: string;
  owner: 'erik' | 'dennis' | 'winston' | 'leon' | 'external';
  category: 'registration' | 'banking' | 'legal' | 'tax' | 'ip' | 'compliance';
  estimated_days: number;
  cost_eur?: number;
  prerequisites: string[]; // step ids
  evidence_required: string; // vad som krävs för att markera som klar
  external_url?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'done';
}

export interface CompanyLaunch {
  id: string;
  name: string;
  type: 'AB' | 'Inc' | 'UAB' | 'LLC';
  jurisdiction: 'SE' | 'US-TX' | 'US-DE' | 'LT' | 'AE-DMCC';
  flag: string;
  status: 'not_started' | 'in_progress' | 'operational';
  priority: number; // 1=highest
  steps: LaunchStep[];
}

export const COMPANY_LAUNCHES: CompanyLaunch[] = [
  // ─────────────────────────────────────────────
  // 1. Landvex AB (Sverige)
  // ─────────────────────────────────────────────
  {
    id: 'landvex-se',
    name: 'Landvex AB',
    type: 'AB',
    jurisdiction: 'SE',
    flag: '🇸🇪',
    status: 'not_started',
    priority: 1,
    steps: [
      {
        id: 'lvx-se-01',
        title: 'Landvex AB — Registrering & Varumärke',
        description: 'Byta firma via Bolagsverkets e-tjänst. Org.nr 559141-7042 behålls.',
        owner: 'dennis',
        category: 'registration',
        estimated_days: 7,
        cost_eur: 130, // ~1500 SEK
        prerequisites: [],
        evidence_required: 'Registreringsbevis från Bolagsverket med nytt namn',
        external_url: 'https://www.bolagsverket.se',
        status: 'pending',
      },
      {
        id: 'lvx-se-02',
        title: 'Uppdatera registrerad adress',
        description: 'Ändra registrerad adress till Åvägen 9, 135 48 Tyresö via Bolagsverket.',
        owner: 'dennis',
        category: 'registration',
        estimated_days: 3,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'Bekräftelse från Bolagsverket om adressändring',
        external_url: 'https://www.bolagsverket.se',
        status: 'pending',
      },
      {
        id: 'lvx-se-03',
        title: 'Öppna bankkonto Swedbank Business',
        description: 'Öppna företagskonto hos Swedbank för Landvex AB.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 14,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'IBAN + bankbekräftelse från Swedbank',
        external_url: 'https://www.swedbank.se/foretag',
        status: 'pending',
      },
      {
        id: 'lvx-se-04',
        title: 'IP-licensavtal: Wavult Group Dubai → Landvex AB',
        description: 'Upprätta och signera IP-licensavtal där Wavult Group Dubai licensierar IP-rättigheter till Landvex AB. Signeras med BankID.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'Signerat licensavtal (BankID-signatur)',
        status: 'pending',
      },
      {
        id: 'lvx-se-05',
        title: 'Registrera F-skatt och moms (Skatteverket)',
        description: 'Ansök om F-skattsedel och momsregistrering hos Skatteverket.',
        owner: 'dennis',
        category: 'tax',
        estimated_days: 14,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'F-skattsedel + momsregistreringsbevis från Skatteverket',
        external_url: 'https://www.skatteverket.se',
        status: 'pending',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 2. Landvex Inc (Texas)
  // ─────────────────────────────────────────────
  {
    id: 'landvex-tx',
    name: 'Landvex Inc',
    type: 'Inc',
    jurisdiction: 'US-TX',
    flag: '🇺🇸',
    status: 'not_started',
    priority: 2,
    steps: [
      {
        id: 'lvx-tx-01',
        title: 'Anlita Registered Agent i Texas',
        description: 'Anlita Northwest Registered Agent som registered agent för Texas Corporation.',
        owner: 'dennis',
        category: 'legal',
        estimated_days: 1,
        cost_eur: 115, // ~125 USD
        prerequisites: [],
        evidence_required: 'Bekräftelse från Northwest Registered Agent',
        external_url: 'https://www.northwestregisteredagent.com',
        status: 'pending',
      },
      {
        id: 'lvx-tx-02',
        title: 'Registrera Texas Corporation',
        description: 'Lämna in Certificate of Formation till Texas Secretary of State.',
        owner: 'dennis',
        category: 'registration',
        estimated_days: 3,
        cost_eur: 275, // ~300 USD
        prerequisites: ['lvx-tx-01'],
        evidence_required: 'Certificate of Formation från Texas Secretary of State',
        external_url: 'https://www.sos.state.tx.us',
        status: 'pending',
      },
      {
        id: 'lvx-tx-03',
        title: 'Ansök om EIN (IRS Form SS-4)',
        description: 'Ansök om Employer Identification Number hos IRS.',
        owner: 'dennis',
        category: 'tax',
        estimated_days: 1,
        prerequisites: ['lvx-tx-02'],
        evidence_required: 'EIN confirmation letter från IRS',
        external_url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
        status: 'pending',
      },
      {
        id: 'lvx-tx-04',
        title: 'Öppna bankkonto JPMorgan Chase Business',
        description: 'Öppna företagskonto hos JPMorgan Chase för Landvex Inc.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 14,
        prerequisites: ['lvx-tx-02', 'lvx-tx-03'],
        evidence_required: 'Kontonummer/IBAN-bekräftelse från Chase',
        external_url: 'https://www.chase.com/business',
        status: 'pending',
      },
      {
        id: 'lvx-tx-05',
        title: 'IP-licensavtal: Wavult Group → Landvex Inc',
        description: 'Upprätta och signera IP-licensavtal där Wavult Group Dubai licensierar IP-rättigheter till Landvex Inc.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['lvx-tx-02'],
        evidence_required: 'Signerat licensavtal',
        status: 'pending',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 3. QuiXzoom UAB (Litauen)
  // ─────────────────────────────────────────────
  {
    id: 'quixzoom-lt',
    name: 'QuiXzoom UAB',
    type: 'UAB',
    jurisdiction: 'LT',
    flag: '🇱🇹',
    status: 'not_started',
    priority: 3,
    steps: [
      {
        id: 'qxz-lt-01',
        title: 'Anlita litauisk registreringstjänst',
        description: 'Anlita Acta Juridica eller liknande registreringstjänst för UAB-registrering i Litauen.',
        owner: 'dennis',
        category: 'legal',
        estimated_days: 3,
        cost_eur: 500,
        prerequisites: [],
        evidence_required: 'Signerat uppdragsavtal med registreringstjänst',
        status: 'pending',
      },
      {
        id: 'qxz-lt-02',
        title: 'Registrera UAB hos Juridinių asmenų registras',
        description: 'Registrering av QuiXzoom UAB i det litauiska juridikregistret (Registrų centras).',
        owner: 'external',
        category: 'registration',
        estimated_days: 5,
        cost_eur: 300,
        prerequisites: ['qxz-lt-01'],
        evidence_required: 'Company registration certificate från Registrų centras',
        external_url: 'https://www.registrucentras.lt',
        status: 'pending',
      },
      {
        id: 'qxz-lt-03',
        title: 'Öppna bankkonto Swedbank Litauen',
        description: 'Öppna SEPA-bankkonto hos Swedbank i Litauen för QuiXzoom UAB.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 10,
        prerequisites: ['qxz-lt-02'],
        evidence_required: 'SEPA IBAN-bekräftelse från Swedbank LT',
        external_url: 'https://www.swedbank.lt/business',
        status: 'pending',
      },
      {
        id: 'qxz-lt-04',
        title: 'Ansök om PVM-nummer (moms) hos VMI',
        description: 'Registrera QuiXzoom UAB för moms (PVM) hos Valstybinė mokesčių inspekcija.',
        owner: 'external',
        category: 'tax',
        estimated_days: 14,
        prerequisites: ['qxz-lt-02'],
        evidence_required: 'PVM certificate från VMI',
        external_url: 'https://www.vmi.lt',
        status: 'pending',
      },
      {
        id: 'qxz-lt-05',
        title: 'IP-licensavtal: Wavult Group → QuiXzoom UAB',
        description: 'Upprätta och signera IP-licensavtal där Wavult Group Dubai licensierar IP-rättigheter till QuiXzoom UAB.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['qxz-lt-02'],
        evidence_required: 'Signerat licensavtal',
        status: 'pending',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 4. QuiXzoom Inc (Delaware)
  // ─────────────────────────────────────────────
  {
    id: 'quixzoom-de',
    name: 'QuiXzoom Inc',
    type: 'Inc',
    jurisdiction: 'US-DE',
    flag: '🇺🇸',
    status: 'not_started',
    priority: 4,
    steps: [
      {
        id: 'qxz-de-01',
        title: 'Registrera Delaware C-Corp via Stripe Atlas',
        description: 'Registrera QuiXzoom Inc som Delaware C-Corp via Stripe Atlas. Inkluderar registered agent och initial dokumentation.',
        owner: 'erik',
        category: 'registration',
        estimated_days: 1,
        cost_eur: 460, // ~500 USD
        prerequisites: [],
        evidence_required: 'Certificate of Incorporation från Delaware Secretary of State',
        external_url: 'https://stripe.com/atlas',
        status: 'pending',
      },
      {
        id: 'qxz-de-02',
        title: 'Ansök om EIN',
        description: 'Ansök om Employer Identification Number för QuiXzoom Inc hos IRS.',
        owner: 'dennis',
        category: 'tax',
        estimated_days: 1,
        prerequisites: ['qxz-de-01'],
        evidence_required: 'EIN confirmation letter från IRS',
        external_url: 'https://www.irs.gov',
        status: 'pending',
      },
      {
        id: 'qxz-de-03',
        title: 'Öppna bankkonto Mercury',
        description: 'Öppna startup-vänligt bankkonto hos Mercury (remote-friendly, ingen fysisk närvaro krävs).',
        owner: 'winston',
        category: 'banking',
        estimated_days: 7,
        prerequisites: ['qxz-de-01', 'qxz-de-02'],
        evidence_required: 'Kontonummer-bekräftelse från Mercury',
        external_url: 'https://mercury.com',
        status: 'pending',
      },
      {
        id: 'qxz-de-04',
        title: 'Shareholders Agreement + Cap Table',
        description: 'Upprätta shareholders agreement och cap table för QuiXzoom Inc. Definiera ägarstrukturen.',
        owner: 'dennis',
        category: 'legal',
        estimated_days: 14,
        prerequisites: ['qxz-de-01'],
        evidence_required: 'Signerat shareholders agreement + initialt cap table-dokument',
        status: 'pending',
      },
      {
        id: 'qxz-de-05',
        title: 'IP-licensavtal: Wavult Group → QuiXzoom Inc',
        description: 'Upprätta och signera IP-licensavtal där Wavult Group Dubai licensierar IP-rättigheter till QuiXzoom Inc.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['qxz-de-01'],
        evidence_required: 'Signerat licensavtal',
        status: 'pending',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 5. Wavult Group Dubai (DMCC)
  // ─────────────────────────────────────────────
  {
    id: 'wavult-ae',
    name: 'Wavult Group',
    type: 'LLC',
    jurisdiction: 'AE-DMCC',
    flag: '🇦🇪',
    status: 'not_started',
    priority: 5,
    steps: [
      {
        id: 'wg-ae-01',
        title: 'Välj Free Zone: DMCC (Jumeirah Lakes Towers)',
        description: 'Formellt beslut om att etablera Wavult Group som DMCC Free Zone LLC i Jumeirah Lakes Towers, Dubai.',
        owner: 'erik',
        category: 'legal',
        estimated_days: 3,
        prerequisites: [],
        evidence_required: 'Internt beslutsdokument signerat av styrelsen',
        external_url: 'https://www.dmcc.ae',
        status: 'pending',
      },
      {
        id: 'wg-ae-02',
        title: 'Ansök om DMCC Trade License',
        description: 'Lämna in ansökan om DMCC trade license för Wavult Group. Inkluderar company setup och initial dokumentation.',
        owner: 'external',
        category: 'registration',
        estimated_days: 30,
        cost_eur: 3750, // ~15000 AED
        prerequisites: ['wg-ae-01'],
        evidence_required: 'DMCC Trade License',
        external_url: 'https://www.dmcc.ae/setup-your-business',
        status: 'pending',
      },
      {
        id: 'wg-ae-03',
        title: 'Emirates ID för direktör (Erik)',
        description: 'Ansök om Emirates ID för Erik Svensson som direktör i Wavult Group DMCC.',
        owner: 'erik',
        category: 'compliance',
        estimated_days: 14,
        prerequisites: ['wg-ae-02'],
        evidence_required: 'Kopia av Emirates ID',
        status: 'pending',
      },
      {
        id: 'wg-ae-04',
        title: 'Öppna bankkonto Emirates NBD Business',
        description: 'Öppna företagskonto hos Emirates NBD för Wavult Group DMCC.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 21,
        prerequisites: ['wg-ae-02', 'wg-ae-03'],
        evidence_required: 'IBAN-bekräftelse från Emirates NBD',
        external_url: 'https://www.emiratesnbd.com/business',
        status: 'pending',
      },
      {
        id: 'wg-ae-05',
        title: 'Registrera varumärken hos UAE IP Dept',
        description: 'Registrera varumärkena Landvex, QuiXzoom, Hypbit och Optical Insight hos UAE Ministry of Economy (IP-avdelningen).',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 30,
        cost_eur: 2500, // ~10000 AED
        prerequisites: ['wg-ae-02'],
        evidence_required: 'Trademark registration certificates för alla 4 varumärken',
        external_url: 'https://www.moec.gov.ae/en/intellectual-property',
        status: 'pending',
      },
      {
        id: 'wg-ae-06',
        title: 'IP Assignment Agreement: alla IP → Wavult Group',
        description: 'Upprätta IP Assignment Agreement som formellt överlåter alla IP-rättigheter (kod, varumärken, patent) till Wavult Group DMCC.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 14,
        prerequisites: ['wg-ae-02'],
        evidence_required: 'Signerat IP Assignment Agreement',
        status: 'pending',
      },
    ],
  },
]
