import type { VisaApplication } from './visaTypes'

// ─── Helper to generate unique doc IDs ──────────────────────────────────────
function doc(prefix: string, name: string, required = true, notes?: string, status: import('./visaTypes').DocStatus = 'needed') {
  return { id: `${prefix}-${name.toLowerCase().replace(/\s+/g, '-')}`, name, required, status, notes }
}

// ─── UAE Investor Visa — Erik ─────────────────────────────────────────────────
const UAE_INVESTOR_STEPS: VisaApplication['steps'] = [
  {
    id: 'uae-01',
    phase: 'Förberedelse',
    title: 'Engagera PRO-agent (Virtuzone)',
    owner: 'erik',
    status: 'todo',
    est_days: 2,
    cost_usd: 0,
    notes: 'Kontakta Virtuzone: setup@virtuzone.com. De hanterar hela UAE-processen.',
    documents: [
      doc('uae-01', 'Kontrakt med PRO-agent', true, 'Virtuzone-avtal undertecknat'),
    ],
  },
  {
    id: 'uae-02',
    phase: 'Förberedelse',
    title: 'Samla personliga dokument',
    owner: 'erik',
    status: 'todo',
    est_days: 5,
    notes: 'Alla originaldokument + notariserade kopior krävs.',
    documents: [
      doc('uae-02', 'Pass (original + kopia)', true),
      doc('uae-02', 'Passfoton (vit bakgrund, 4 st)', true),
      doc('uae-02', 'Personnummerbevis / CV', true),
      doc('uae-02', 'Bankutdrag (6 månader)', true, 'Visa tillräckliga medel'),
      doc('uae-02', 'Bostadsbevis i Sverige', false),
    ],
  },
  {
    id: 'uae-03',
    phase: 'Ansökan',
    title: 'Bolagsregistrering UAE (Wavult Group FZ)',
    owner: 'erik',
    status: 'todo',
    est_days: 14,
    cost_usd: 8500,
    notes: 'DIFC Free Zone eller mainland beror på affärsmodell. Virtuzone rekommenderar DIFC.',
    documents: [
      doc('uae-03', 'Bolagsregistreringsformulär', true),
      doc('uae-03', 'Business plan (engelska)', true),
      doc('uae-03', 'Styrelsebeslut för UAE-bolag', true),
      doc('uae-03', 'Hyresavtal UAE-kontor', true, 'Virtuzone erbjuder flexi-desk'),
    ],
  },
  {
    id: 'uae-04',
    phase: 'Ansökan',
    title: 'Entry Permit — initial 60-dagars',
    owner: 'erik',
    status: 'todo',
    est_days: 5,
    cost_usd: 400,
    notes: 'Ansöks via GDRFA online. Krävs för att resa in och slutföra processen i UAE.',
    documents: [
      doc('uae-04', 'Entry permit-ansökan (GDRFA)', true),
      doc('uae-04', 'Passfoton (2 st)', true),
    ],
  },
  {
    id: 'uae-05',
    phase: 'I UAE',
    title: 'Medicinsk hälsoundersökning (UAE)',
    owner: 'erik',
    status: 'todo',
    est_days: 2,
    cost_usd: 250,
    notes: 'Måste göras i UAE efter ankomst. Dubai Health Authority-godkänd klinik.',
    documents: [
      doc('uae-05', 'Medicinsk fitness-rapport', true),
      doc('uae-05', 'HIV/Hepatit-testresultat', true),
    ],
  },
  {
    id: 'uae-06',
    phase: 'I UAE',
    title: 'Emirates ID-registrering (fingeravtryck)',
    owner: 'erik',
    status: 'todo',
    est_days: 3,
    cost_usd: 200,
    notes: 'ICA-center i Dubai. Biometrisk data insamlas på plats.',
    documents: [
      doc('uae-06', 'Emirates ID-ansökan', true),
      doc('uae-06', 'Biometrisk registrering (ICA)', true),
    ],
  },
  {
    id: 'uae-07',
    phase: 'I UAE',
    title: 'Investor Visa — formell ansökan (GDRFA)',
    owner: 'erik',
    status: 'todo',
    est_days: 7,
    cost_usd: 1200,
    notes: 'Inkluderar status change + residence visa stämpel i passet.',
    documents: [
      doc('uae-07', 'Investor Visa-ansökan (GDRFA)', true),
      doc('uae-07', 'Handelslicens UAE-bolag', true),
      doc('uae-07', 'Hyresavtal/adressbevis UAE', true),
      doc('uae-07', 'Hälsointyg från steg 5', true),
    ],
  },
  {
    id: 'uae-08',
    phase: 'I UAE',
    title: 'Sjukförsäkring UAE (obligatorisk)',
    owner: 'erik',
    status: 'todo',
    est_days: 2,
    cost_usd: 800,
    notes: 'Dubai-lag kräver sjukförsäkring för residensvisum. Virtuzone kan ordna.',
    documents: [
      doc('uae-08', 'Sjukförsäkringsbevis UAE', true),
      doc('uae-08', 'Insurance card / policy', true),
    ],
  },
  {
    id: 'uae-09',
    phase: 'Slutförande',
    title: 'Emirates ID hämtas + residensstämpel i pass',
    owner: 'erik',
    status: 'todo',
    est_days: 7,
    cost_usd: 0,
    notes: 'Resident visa giltig 2–3 år beroende på bolagstyp. Förnyelse via Virtuzone.',
    documents: [
      doc('uae-09', 'Emirates ID-kort (färdigt)', true),
      doc('uae-09', 'Residency visa-stämpel i pass', true),
    ],
  },
]

// ─── Thailand Tourist — genererar steg per person ────────────────────────────
// TDAC = Thailand Digital Arrival Card (obligatorisk sedan 1 maj 2025)
// Ersätter gamla pappersblanketten TM6. Gratis, fylls i max 72h innan ankomst.
// Officiell sida: https://tdac.immigration.go.th
// OBS: Många bluffesidor tar betalt — använd BARA den officiella URL:en
function thaiSteps(owner: string, hotelOwner: string): VisaApplication['steps'] {
  return [
    {
      id: `th-01-${owner}`,
      phase: 'Förberedelse',
      title: 'Kontrollera passets giltighet (min 6 månader)',
      owner,
      status: 'todo',
      est_days: 1,
      notes: 'Minst 6 månaders giltighet krävs vid inresa till Thailand.',
      documents: [
        doc(`th-01-${owner}`, 'Giltigt pass'),
      ],
    },
    {
      id: `th-02-${owner}`,
      phase: 'Förberedelse',
      title: 'Boka returresa (krävs vid inresa)',
      owner,
      status: 'todo',
      est_days: 1,
      notes: 'Thai immigration kräver bevis på att lämna landet inom 30 dagar.',
      documents: [
        doc(`th-02-${owner}`, 'Bekräftat returflygbiljett'),
      ],
    },
    {
      id: `th-03-${owner}`,
      phase: 'Boende',
      title: 'Hotellbokning Nysa Hotel Bangkok',
      owner: hotelOwner,
      status: owner === 'erik' ? 'in_progress' : 'todo',
      est_days: 1,
      notes: '73/7-8 Soi Sukhumvit 13, Bangkok — Leon förhandlar pris.',
      documents: [
        {
          id: `th-03-${owner}-hotel`,
          name: 'Hotellbekräftelse',
          required: true,
          status: owner === 'erik' ? 'gathering' : 'needed',
          notes: 'Leon förhandlar — Nysa Hotel Bangkok',
        },
      ],
    },
    {
      id: `th-04-${owner}`,
      phase: 'Inresa',
      title: 'TDAC — Thailand Digital Arrival Card (obligatorisk)',
      owner,
      status: 'todo',
      est_days: 1,
      deadline: '2026-04-11', // Senast 72h innan ankomst = 8 april
      notes: [
        'Obligatorisk sedan 1 maj 2025. Ersätter gamla TM6-pappersblanketten.',
        'Fylls i MAX 72 timmar (3 dagar) före ankomst till Thailand.',
        'Gratis — använd BARA officiell sajt: https://tdac.immigration.go.th',
        'VARNING: Många bluffesidor tar betalt och stjäl passdata. Inga tredjepartssajter!',
        'Kräver: passinfo, personuppgifter, ekonomisk info, resplan, boende i Thailand, nyligen besökta länder, hälsostatus.',
        'Inresedatum: 11 april 2026 → fyll i TDAC 8–10 april.'
      ].join(' | '),
      documents: [
        {
          id: `th-04-${owner}-tdac`,
          name: 'TDAC-bekräftelse (QR-kod / referensnummer)',
          required: true,
          status: 'needed',
          notes: 'Spara QR-koden / referensnumret från tdac.immigration.go.th. Visa vid gränskontroll.',
        },
        doc(`th-04-${owner}`, 'Pass (för TDAC-ifyllning)', true, 'Passnummer, giltighetstid, utfärdat land'),
        doc(`th-04-${owner}`, 'Hotellbokning (för TDAC)', true, 'Adress till boende i Thailand krävs i formuläret'),
      ],
    },
  ]
}

// ─── Master dataset ───────────────────────────────────────────────────────────
export const VISA_APPLICATIONS: VisaApplication[] = [
  // 1. Erik — UAE Investor Visa
  {
    id:           'visa-erik-uae-001',
    person_id:    'erik',
    person_name:  'Erik Svensson',
    visa_type:    'investor_visa',
    country:      'UAE',
    target_date:  '2026-06-01',
    status:       'not_started',
    pro_agent:    'Virtuzone (rekommenderad) — setup@virtuzone.com',
    steps:        UAE_INVESTOR_STEPS,
    created_at:   '2026-04-01T00:00:00Z',
    updated_at:   '2026-04-01T00:00:00Z',
    notes:        'UAE Investor Visa via DIFC Free Zone. Wavult Group Holding registreras som UAE-bolag. Mål: UAE-residens klar Q2 2026.',
  },

  // 2. Erik — Thailand Tourist (11 april)
  {
    id:           'visa-erik-th-001',
    person_id:    'erik',
    person_name:  'Erik Svensson',
    visa_type:    'tourist',
    country:      'TH',
    target_date:  '2026-04-11',
    status:       'not_started',
    steps:        thaiSteps('erik', 'leon'),
    created_at:   '2026-04-01T00:00:00Z',
    updated_at:   '2026-04-01T00:00:00Z',
    notes:        'Thailand workcamp. Svenska medborgare — visumfritt 30 dagar. Inget visum behövs. Bara pass + returresa.',
  },

  // 3. Dennis — Thailand Tourist
  {
    id:           'visa-dennis-th-001',
    person_id:    'dennis',
    person_name:  'Dennis Bjarnemark',
    visa_type:    'tourist',
    country:      'TH',
    target_date:  '2026-04-11',
    status:       'not_started',
    steps:        thaiSteps('dennis', 'leon'),
    created_at:   '2026-04-01T00:00:00Z',
    updated_at:   '2026-04-01T00:00:00Z',
    notes:        'Thailand workcamp. Visumfritt 30 dagar för svenska medborgare.',
  },

  // 4. Leon — Thailand Tourist
  {
    id:           'visa-leon-th-001',
    person_id:    'leon',
    person_name:  'Leon Russo De Cerame',
    visa_type:    'tourist',
    country:      'TH',
    target_date:  '2026-04-11',
    status:       'not_started',
    steps:        thaiSteps('leon', 'leon'),
    created_at:   '2026-04-01T00:00:00Z',
    updated_at:   '2026-04-01T00:00:00Z',
    notes:        'Thailand workcamp. Hanterar hotellbokning för teamet.',
  },

  // 5. Winston — Thailand Tourist
  {
    id:           'visa-winston-th-001',
    person_id:    'winston',
    person_name:  'Winston Bjarnemark',
    visa_type:    'tourist',
    country:      'TH',
    target_date:  '2026-04-11',
    status:       'not_started',
    steps:        thaiSteps('winston', 'leon'),
    created_at:   '2026-04-01T00:00:00Z',
    updated_at:   '2026-04-01T00:00:00Z',
    notes:        'Thailand workcamp. Visumfritt 30 dagar för svenska medborgare.',
  },

  // 6. Johan — Thailand Tourist
  {
    id:           'visa-johan-th-001',
    person_id:    'johan',
    person_name:  'Johan Berglund',
    visa_type:    'tourist',
    country:      'TH',
    target_date:  '2026-04-11',
    status:       'not_started',
    steps:        thaiSteps('johan', 'leon'),
    created_at:   '2026-04-01T00:00:00Z',
    updated_at:   '2026-04-01T00:00:00Z',
    notes:        'Thailand workcamp. Visumfritt 30 dagar för svenska medborgare.',
  },
]
