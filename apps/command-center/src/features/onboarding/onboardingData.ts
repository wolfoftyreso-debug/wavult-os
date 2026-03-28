// ─── Onboarding / First-run tooltip system ───────────────────────────────────
// Windows-style guided tour: points to elements, explains what things are.

export interface OnboardingStep {
  id: string
  route: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  targetSelector?: string  // CSS selector for element to highlight
  icon: string
}

export interface OnboardingTour {
  id: string
  name: string
  description: string
  steps: OnboardingStep[]
}

export const TOURS: OnboardingTour[] = [
  {
    id: 'first-run',
    name: 'Välkommen till Wavult OS',
    description: 'En snabb genomgång av systemet — tar 2 minuter.',
    steps: [
      {
        id: 'welcome',
        route: '/dashboard',
        title: 'Välkommen till Wavult OS',
        description: 'Det här är ert operativsystem. Allt om koncernen — ekonomi, juridik, personal, projekt — lever här. Vi guidar dig igenom det viktigaste.',
        position: 'center',
        icon: '👋',
      },
      {
        id: 'entity-switcher',
        route: '/dashboard',
        title: 'Bolagsväxlaren',
        description: 'Uppe i vänstra hörnet väljer du vilket bolag du tittar på. "Group" = hela koncernen samlat. Klicka för att byta vy per bolag.',
        position: 'right',
        targetSelector: '[data-tour="entity-switcher"]',
        icon: '🏢',
      },
      {
        id: 'nav-operations',
        route: '/dashboard',
        title: 'OPERATIONS — det dagliga',
        description: 'Dashboard, CRM, Milestones, Kampanjer, Submissions. Det du arbetar med varje dag.',
        position: 'right',
        icon: '⚡',
      },
      {
        id: 'nav-finance',
        route: '/finance',
        title: 'Finance — ekonomin',
        description: 'Här bor allt om pengar: kontoplan, transaktioner, fakturor, kassaflöde, moms och intercompany-flöden mellan bolagen.',
        position: 'center',
        icon: '💰',
      },
      {
        id: 'finance-overview',
        route: '/finance',
        title: 'Ekonomiöversikten',
        description: 'En siffra att alltid kolla: "Kassaflöde". Grön = OK. Gul = bevaka. Röd = agera. Alla belopp är per bolag och kan konsolideras på Group-nivå.',
        position: 'center',
        icon: '📊',
      },
      {
        id: 'legal-hub',
        route: '/legal',
        title: 'Legal Hub — alla avtal',
        description: 'Samtliga juridiska dokument för koncernen. Orange badge = dokument som väntar på din åtgärd. Klicka på ett dokument för att se status och signeringsflöde.',
        position: 'center',
        icon: '⚖️',
      },
      {
        id: 'incidents',
        route: '/incidents',
        title: 'Alerts — larmet',
        description: 'Om något är kritiskt dyker det upp här med rött. Det röda numret i menyn = antal aktiva kritiska incidenter. Alltid hålla det på noll.',
        position: 'center',
        icon: '🚨',
      },
      {
        id: 'entities',
        route: '/entities',
        title: 'Entities — bolagsöversikt',
        description: 'Varje bolag i koncernen har en egen sida. Klicka på ett bolag för att se juridisk status, ekonomi, system och team kopplat till just det bolaget.',
        position: 'center',
        icon: '🏗',
      },
      {
        id: 'whoop-connect',
        route: '/whoop',
        title: '⌚ Koppla ditt WHOOP',
        description: 'Wavult Group har WHOOP-armband till hela teamet. Koppla ditt konto här så kan vi följa recovery, sömn och belastning — och se till att ingen körs i botten. Klicka "Koppla WHOOP" för att starta.',
        position: 'center',
        icon: '⌚',
      },
      {
        id: 'maturity-badge',
        route: '/dashboard',
        title: 'Mognadsmärken',
        description: 'Varje modul har ett märke: SKELETON = bara skal, ALPHA = mockdata, BETA = används av teamet, PRODUCTION = live data. Det talar om hur pålitlig datan är.',
        position: 'center',
        icon: '🔬',
      },
      {
        id: 'done',
        route: '/dashboard',
        title: 'Du är redo!',
        description: 'Börja med Dashboard för en daglig överblick. Starta guiden igen när som helst via Inställningar → Onboarding.',
        position: 'center',
        icon: '✅',
      },
    ],
  },
  {
    id: 'whoop-setup',
    name: 'Sätt upp ditt WHOOP',
    description: 'Från kartong till kopplat — följ stegen.',
    steps: [
      {
        id: 'whoop-unbox',
        route: '/whoop',
        title: 'Steg 1 — Ta ut armbandet',
        description: 'I kartongen finns: WHOOP 4.0-armbandet, ett laddningspaket (batteripaketet som glider på armbandet) och en USB-C-kabel. Ta ut allt och lägg det framför dig.',
        position: 'center',
        icon: '📦',
      },
      {
        id: 'whoop-wear',
        route: '/whoop',
        title: 'Steg 2 — Sätt på armbandet',
        description: 'Armbandet bärs på handleden — gärna 2–3 cm ovanför handlovsknutan (inte på pulsen). Sensorn ska ligga mot huden. Spännet stängs som ett vanligt klockspänne. Inte för hårt, inte för löst — du ska kunna sticka in ett finger.',
        position: 'center',
        icon: '⌚',
      },
      {
        id: 'whoop-charge',
        route: '/whoop',
        title: 'Steg 3 — Ladda utan att ta av',
        description: 'WHOOP laddas med batteripaketet — det glider på utsidan av armbandet medan du har det på. Koppla USB-C till laddpaketet och låt det ladda till minst 50% innan du pararihop det. LED-lampan på paketet visar status.',
        position: 'center',
        icon: '🔋',
      },
      {
        id: 'whoop-app',
        route: '/whoop',
        title: 'Steg 4 — Installera WHOOP-appen',
        description: 'Ladda ner den officiella WHOOP-appen (App Store / Google Play). Skapa ett konto eller logga in. Appen guidar dig igenom parkopplingen via Bluetooth — håll armbandet nära telefonen.',
        position: 'center',
        icon: '📱',
      },
      {
        id: 'whoop-pair',
        route: '/whoop',
        title: 'Steg 5 — Para ihop med telefonen',
        description: 'I WHOOP-appen: tryck på "+" → "Add a device" → välj ditt armband i listan. Bluetooth måste vara aktivt. Parkopplingen tar 1–2 minuter. Armbandet vibrerar när det är klart.',
        position: 'center',
        icon: '🔗',
      },
      {
        id: 'whoop-sleep',
        route: '/whoop',
        title: 'Steg 6 — Bär det dygnet runt',
        description: 'WHOOP mäter sömnkvalitet, hjärtfrekvensvariabilitet (HRV) och återhämtning. För att data ska bli pålitlig behöver du bära det minst 3 nätter i rad. Ha det på även när du sover — det är vattentätt.',
        position: 'center',
        icon: '😴',
      },
      {
        id: 'whoop-connect-wavult',
        route: '/whoop',
        title: 'Steg 7 — Koppla till Wavult OS',
        description: 'Nu kopplar vi ditt WHOOP till Wavult OS så att teamets recovery visas samlat. Klicka på "Koppla WHOOP" nedan och logga in med ditt WHOOP-konto. Det tar 30 sekunder.',
        position: 'center',
        icon: '🏢',
      },
      {
        id: 'whoop-team',
        route: '/whoop',
        title: 'Steg 8 — Teamöversikten',
        description: 'När alla är kopplade ser du hela teamets recovery-status här. Lägst recovery visas överst — de som behöver vila syns direkt. Vi anpassar workload efter faktisk kapacitet, inte antaganden.',
        position: 'center',
        icon: '👥',
      },
      {
        id: 'whoop-done',
        route: '/whoop',
        title: 'Klar! 🎉',
        description: 'WHOOP sitter på handleden, är ihopparrat och kopplat till Wavult OS. Data synkas automatiskt varje timme. Välkommen till teamet — vi kör på fakta nu.',
        position: 'center',
        icon: '✅',
      },
    ],
  },
  {
    id: 'finance-deep',
    name: 'Finance-modulen på djupet',
    description: 'Förstå ekonomimodulen fullständigt.',
    steps: [
      {
        id: 'finance-tabs',
        route: '/finance',
        title: 'Finance — 9 flikar',
        description: 'Översikt → Kontoplan → Transaktioner → Fakturor → Kassaflöde → Moms/Skatt → Intercompany → Betalningar → Optimering. Börja alltid med Översikt.',
        position: 'bottom',
        icon: '📋',
      },
      {
        id: 'intercompany',
        route: '/finance',
        title: 'Intercompany-flöden',
        description: 'Här ser du licensavgifter och betalningar MELLAN bolagen. Wavult AB betalar till Dubai holding. Dotterbolagen betalar licensavgifter uppåt. Allt ska balansera.',
        position: 'center',
        icon: '↔️',
      },
      {
        id: 'cashflow-optimizer',
        route: '/finance',
        title: 'Kassaflödesoptimering',
        description: 'AI-driven rekommendation om när och hur ni ska flytta pengar mellan bolagen för att minimera skatt och maximera likviditet.',
        position: 'center',
        icon: '⚡',
      },
    ],
  },
]

export const STORAGE_KEY = 'wavult-onboarding-v1'

export interface OnboardingState {
  completedTours: string[]
  currentTour: string | null
  currentStep: number
  dismissed: boolean
}

export function getOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    completedTours: [],
    currentTour: null,
    currentStep: 0,
    dismissed: false,
  }
}

export function saveOnboardingState(state: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function isFirstRun(): boolean {
  const state = getOnboardingState()
  return !state.completedTours.includes('first-run') && !state.dismissed
}
