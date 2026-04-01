/**
 * Seed script: migrates COMPANY_LAUNCHES from data.ts into Supabase.
 * Run: cd /mnt/c/Users/erik/Desktop/wavult && npx ts-node server/src/scripts/seed-company-launches.ts
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Inline seed data from data.ts ───────────────────────────────────────────

interface SeedStep {
  id: string
  title: string
  description: string
  owner: string
  category: string
  estimated_days: number
  cost_eur?: number
  prerequisites: string[]
  evidence_required: string
  external_url?: string
  status: string
}

interface SeedCompany {
  id: string
  name: string
  type: string
  jurisdiction: string
  flag: string
  status: string
  priority: number
  steps: SeedStep[]
}

const COMPANY_LAUNCHES: SeedCompany[] = [
  {
    id: 'landvex-se',
    name: 'Landvex AB',
    type: 'AB',
    jurisdiction: 'SE',
    flag: '🇸🇪',
    status: 'in_progress',
    priority: 1,
    steps: [
      {
        id: 'lvx-se-01',
        title: 'Landvex AB — Registrering & Varumärke',
        description: 'Namnbyte från Sommarliden Holding AB till LandveX AB inlämnat till Bolagsverket 25 mars 2026. Ärendenr 178303/2026. Betald 2 200 kr. Handläggs.',
        owner: 'dennis',
        category: 'registration',
        estimated_days: 7,
        cost_eur: 130,
        prerequisites: [],
        evidence_required: 'Registreringsbevis från Bolagsverket (ärendenr 178303/2026) — inväntas',
        external_url: 'https://www.bolagsverket.se',
        status: 'in_progress',
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
        status: 'in_progress',
      },
      {
        id: 'lvx-se-03',
        title: 'Öppna bankkonto Swedbank Business',
        description: 'SEB företagskonto under ansökan. Helena på SEB (corponboarding@seb.se) har fått fullständig bolagsinformation. Inväntar svar. Parallellt utvärderas Nordea.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 14,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'IBAN + bankbekräftelse från Swedbank',
        external_url: 'https://www.swedbank.se/foretag',
        status: 'in_progress',
      },
      {
        id: 'lvx-se-04',
        title: 'IP-licensavtal: Wavult Group Dubai → Landvex AB',
        description: 'Blockerad av IP-överlåtelse timing. MÅSTE ske INNAN extern revenue bevisar värde.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'Signerat licensavtal (BankID-signatur)',
        status: 'blocked',
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
      {
        id: 'lvx-se-06',
        title: 'Revision & Skatterådgivning — Grant Thornton',
        description: 'Andreas Gröndahl (GT) + skattekollega Simon möte bokat. Tidförslag skickat: 7/8/9 april.',
        owner: 'erik',
        category: 'legal',
        estimated_days: 30,
        prerequisites: ['lvx-se-01'],
        evidence_required: 'Signerat revisionsavtal med GT',
        external_url: 'https://www.grantthornton.se',
        status: 'in_progress',
      },
    ],
  },
  {
    id: 'landvex-tx',
    name: 'Landvex Inc',
    type: 'Inc',
    jurisdiction: 'US-TX',
    flag: '🇺🇸',
    status: 'in_progress',
    priority: 2,
    steps: [
      {
        id: 'lvx-tx-01',
        title: 'Anlita Registered Agent i Texas',
        description: 'Anlita Northwest Registered Agent som registered agent för Texas Corporation.',
        owner: 'dennis',
        category: 'legal',
        estimated_days: 1,
        cost_eur: 115,
        prerequisites: [],
        evidence_required: '✅ Northwest Registered Agent LLC anlitad. Invoice #8FWWCEF. $349 betald.',
        external_url: 'https://www.northwestregisteredagent.com',
        status: 'done',
      },
      {
        id: 'lvx-tx-02',
        title: 'Registrera Texas Corporation',
        description: 'Certificate of Formation godkänd av Texas Secretary of State 31 mars 2026.',
        owner: 'dennis',
        category: 'registration',
        estimated_days: 3,
        cost_eur: 275,
        prerequisites: ['lvx-tx-01'],
        evidence_required: '✅ Certificate of Formation (03-31-26 - TX - Formation Document - Landvex Inc..pdf). Texas Taxpayer Number: 32105142718',
        external_url: 'https://www.sos.state.tx.us',
        status: 'done',
      },
      {
        id: 'lvx-tx-03',
        title: 'Ansök om EIN (IRS Form SS-4)',
        description: 'EIN-ansökan initierad via Northwest. Väntar på signatur i Northwest-portalen.',
        owner: 'erik',
        category: 'tax',
        estimated_days: 1,
        prerequisites: ['lvx-tx-02'],
        evidence_required: 'EIN confirmation letter från IRS',
        external_url: 'https://www.irs.gov',
        status: 'in_progress',
      },
      {
        id: 'lvx-tx-04',
        title: 'Öppna bankkonto JPMorgan Chase Business',
        description: 'Blockerad av EIN. Kan inte öppna konto utan Federal Tax ID.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 14,
        prerequisites: ['lvx-tx-02', 'lvx-tx-03'],
        evidence_required: 'Kontonummer/IBAN-bekräftelse från Chase',
        external_url: 'https://www.chase.com/business',
        status: 'blocked',
      },
      {
        id: 'lvx-tx-05',
        title: 'IP-licensavtal: Wavult Group → Landvex Inc',
        description: 'Blockerad — väntar på Dubai-holdingstruktur.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['lvx-tx-02'],
        evidence_required: 'Signerat licensavtal',
        status: 'blocked',
      },
      {
        id: 'lvx-tx-06',
        title: 'Texas Franchise Tax — Webfile-registrering',
        description: 'TX Comptroller kräver Webfile Number. Taxpayer Number: 32105142718.',
        owner: 'dennis',
        category: 'tax',
        estimated_days: 14,
        cost_eur: 0,
        prerequisites: ['lvx-tx-02'],
        evidence_required: 'Webfile Number (XT... eller FQ...) + registrering i Texas Webfile-systemet',
        external_url: 'https://mycpa.cpa.state.tx.us/coa/',
        status: 'in_progress',
      },
    ],
  },
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
        description: 'Anlita Acta Juridica eller liknande registreringstjänst för UAB-registrering.',
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
        description: 'Registrering av QuiXzoom UAB i det litauiska juridikregistret.',
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
        description: 'Upprätta och signera IP-licensavtal.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['qxz-lt-02'],
        evidence_required: 'Signerat licensavtal',
        status: 'pending',
      },
    ],
  },
  {
    id: 'quixzoom-de',
    name: 'QuiXzoom Inc',
    type: 'Inc',
    jurisdiction: 'US-DE',
    flag: '🇺🇸',
    status: 'in_progress',
    priority: 4,
    steps: [
      {
        id: 'qxz-de-01',
        title: 'Registrera Delaware C-Corp via Stripe Atlas',
        description: 'QuiXzoom Inc registrerad via Stripe Atlas. Certificate of Incorporation utfärdat 25 mars 2026. SR# 20261400677.',
        owner: 'erik',
        category: 'registration',
        estimated_days: 1,
        cost_eur: 460,
        prerequisites: [],
        evidence_required: '✅ Certificate of Incorporation Delaware (SR# 20261400677, 25 mars 2026)',
        external_url: 'https://stripe.com/atlas',
        status: 'done',
      },
      {
        id: 'qxz-de-02',
        title: 'Ansök om EIN',
        description: 'EIN inväntas från IRS. 83(b)-val inskickat 30 mars 2026. Beräknad ankomst: ~8-15 april.',
        owner: 'dennis',
        category: 'tax',
        estimated_days: 1,
        prerequisites: ['qxz-de-01'],
        evidence_required: 'EIN confirmation letter från IRS',
        external_url: 'https://www.irs.gov',
        status: 'in_progress',
      },
      {
        id: 'qxz-de-03',
        title: 'Öppna bankkonto Mercury',
        description: 'Blockerad av EIN. Mercury Bank-konto kan öppnas så fort EIN bekräftats.',
        owner: 'winston',
        category: 'banking',
        estimated_days: 7,
        prerequisites: ['qxz-de-01', 'qxz-de-02'],
        evidence_required: 'Kontonummer-bekräftelse från Mercury',
        external_url: 'https://mercury.com',
        status: 'blocked',
      },
      {
        id: 'qxz-de-04',
        title: 'Shareholders Agreement + Cap Table',
        description: 'Upprätta shareholders agreement och cap table för QuiXzoom Inc.',
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
        description: 'Upprätta och signera IP-licensavtal.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 7,
        prerequisites: ['qxz-de-01'],
        evidence_required: 'Signerat licensavtal',
        status: 'blocked',
      },
    ],
  },
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
        description: 'Formellt beslut om att etablera Wavult Group som DMCC Free Zone LLC.',
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
        description: 'Lämna in ansökan om DMCC trade license för Wavult Group.',
        owner: 'external',
        category: 'registration',
        estimated_days: 30,
        cost_eur: 3750,
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
        description: 'Registrera varumärkena Landvex, QuiXzoom, Hypbit och Optical Insight.',
        owner: 'dennis',
        category: 'ip',
        estimated_days: 30,
        cost_eur: 2500,
        prerequisites: ['wg-ae-02'],
        evidence_required: 'Trademark registration certificates för alla 4 varumärken',
        external_url: 'https://www.moec.gov.ae/en/intellectual-property',
        status: 'pending',
      },
      {
        id: 'wg-ae-06',
        title: 'IP Assignment Agreement: alla IP → Wavult Group',
        description: 'Upprätta IP Assignment Agreement som formellt överlåter alla IP-rättigheter.',
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

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding company launches...')

  for (const company of COMPANY_LAUNCHES) {
    console.log(`\n📦 Processing: ${company.name} (${company.id})`)

    // Check if already exists
    const { data: existing } = await supabase
      .from('company_launches')
      .select('id')
      .eq('name', company.name)
      .single()

    let companyDbId: string

    if (existing) {
      console.log(`  ✅ Already exists (${existing.id}), skipping insert`)
      companyDbId = existing.id
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('company_launches')
        .insert({
          name: company.name,
          type: company.type,
          jurisdiction: company.jurisdiction,
          flag: company.flag,
          status: company.status,
          priority: company.priority,
        })
        .select()
        .single()

      if (insertErr || !inserted) {
        console.error(`  ❌ Failed to insert ${company.name}:`, insertErr?.message)
        continue
      }
      companyDbId = inserted.id
      console.log(`  ✅ Inserted company (${companyDbId})`)
    }

    // Check if steps already exist
    const { data: existingSteps } = await supabase
      .from('company_launch_steps')
      .select('id')
      .eq('company_id', companyDbId)

    if (existingSteps && existingSteps.length > 0) {
      console.log(`  📋 ${existingSteps.length} steps already exist, skipping`)
      continue
    }

    // Insert steps
    const stepsToInsert = company.steps.map(step => ({
      company_id: companyDbId,
      step_key: step.id,
      title: step.title,
      description: step.description,
      owner: step.owner,
      category: step.category,
      estimated_days: step.estimated_days,
      cost_eur: step.cost_eur ?? null,
      prerequisites: step.prerequisites,
      evidence_required: step.evidence_required,
      external_url: step.external_url ?? null,
      status: step.status,
      completed_at: step.status === 'done' ? new Date().toISOString() : null,
    }))

    const { error: stepsErr } = await supabase
      .from('company_launch_steps')
      .insert(stepsToInsert)

    if (stepsErr) {
      console.error(`  ❌ Failed to insert steps for ${company.name}:`, stepsErr.message)
    } else {
      console.log(`  ✅ Inserted ${stepsToInsert.length} steps`)
    }
  }

  console.log('\n✅ Seed complete!')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
