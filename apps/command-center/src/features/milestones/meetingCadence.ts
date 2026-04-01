// ─── Wavult Group — Möteshierarki ──────────────────────────────────────────────
// Baserad på OKR + EOS (Entrepreneurial Operating System) + Agile
// Nivå 1 = Vision & Strategi → Nivå 6 = Incident & Eskalering

export interface MeetingCadence {
  id: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  frequency: string
  duration: string
  participants: string[]
  agenda: string[]
  output: string[]
  time?: string
  tools?: string[]
  automate?: boolean // Kan Bernt hantera detta automatiskt?
  /** Referenskod till governance-register (WG-GOV-2026-001) */
  refCode?: string
}

export const MEETING_CADENCE: MeetingCadence[] = [
  // ── Nivå 1: Vision & Strategi (Årlig) ──────────────────────────────────────
  {
    id: 'annual-planning',
    level: 1,
    name: 'Annual Planning Meeting',
    frequency: 'Årligen (januari)',
    duration: '2 dagar',
    participants: [
      'Erik Svensson (Chairman/CEO)',
      'Dennis Bjarnemark (Legal/Ops)',
      'Leon Russo (CEO Ops/Sälj)',
      'Winston Bjarnemark (CFO)',
      'Johan Berglund (CTO)',
    ],
    agenda: [
      '3–5 års vision och riktning',
      'OKR-sättning för helår',
      'Budgetplanering och kapitalallokering',
      'Bolagsstruktur och jurisdiktioner',
      'Produktroadmap: quiXzoom, Landvex, Wavult OS',
      'Team-expansion och rekryteringsplan',
    ],
    output: [
      'Årsplan (dokument)',
      'Fastställda OKRs (Objectives & Key Results)',
      'Godkänd budget',
      'Reviderad bolagsstruktur',
    ],
    time: 'Januari',
    tools: ['Wavult OS', 'Notion', 'Google Slides'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },

  // ── Nivå 2: Kvartalsmöten (Q-reviews) ──────────────────────────────────────
  {
    id: 'qbr',
    level: 2,
    name: 'Quarterly Business Review (QBR)',
    frequency: 'Kvartalsvis (var 3:e månad)',
    duration: '1 dag',
    participants: [
      'Erik Svensson (Chairman/CEO)',
      'Dennis Bjarnemark (Legal/Ops)',
      'Leon Russo (CEO Ops/Sälj)',
      'Winston Bjarnemark (CFO)',
      'Johan Berglund (CTO)',
    ],
    agenda: [
      'OKR-uppföljning: vad uppnåddes, vad missades?',
      'Pipeline review och säljstatus',
      'Ekonomisk genomgång: intäkter, kostnader, burn rate',
      'Produktstatus per produktgren',
      'Nästa kvartals prioriteringar och fokusområden',
      'Risker och blockers',
    ],
    output: [
      'Justerade OKRs för kommande kvartal',
      'Reviderad budget',
      'Q-plan (prioriteringsdokument)',
      'Action items per person',
    ],
    time: 'Sista veckan i mars, juni, september, december',
    tools: ['Wavult OS', 'Google Sheets', 'Notion'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },

  // ── Nivå 3: Månadsmöten ─────────────────────────────────────────────────────
  {
    id: 'monthly-all-hands',
    level: 3,
    name: 'Monthly All-Hands',
    frequency: 'Månadsvis (sista fredagen varje månad)',
    duration: '2 timmar',
    participants: [
      'Erik Svensson (Chairman/CEO)',
      'Dennis Bjarnemark (Legal/Ops)',
      'Leon Russo (CEO Ops/Sälj)',
      'Winston Bjarnemark (CFO)',
      'Johan Berglund (CTO)',
      'Hela teamet',
    ],
    agenda: [
      'KPI-genomgång: nyckeltal mot mål',
      'Produktuppdateringar per produktgren',
      'Ekonomisk snapshot: burn, intäkter, runway',
      'WHOOP-teamhälsa: recovery-scores och mående',
      'Vad gick bra? Vad förbättrar vi?',
      'Kommande events och deadlines',
    ],
    output: [
      'Månadsrapport (auto-genererad av Bernt)',
      'Team alignment kring prioriteringar',
    ],
    time: 'Sista fredagen varje månad',
    tools: ['Wavult OS', 'WHOOP', 'Google Meet'],
    automate: true,
    refCode: 'WG-GOV-2026-001',
  },

  // ── Nivå 4: Veckocykel ──────────────────────────────────────────────────────
  {
    id: 'weekly-leadership',
    level: 4,
    name: 'Weekly Leadership Sync',
    frequency: 'Veckovis (måndag)',
    duration: '45 minuter',
    participants: [
      'Erik Svensson (Chairman/CEO)',
      'Dennis Bjarnemark (Legal/Ops)',
      'Leon Russo (CEO Ops/Sälj)',
      'Winston Bjarnemark (CFO)',
      'Johan Berglund (CTO)',
    ],
    agenda: [
      'Veckans prioriteringar: vad är viktigast att få klart?',
      'Blockers: vad hindrar oss?',
      'KPI-status: är vi on track mot OKRs?',
      'Snabb rundtur: varje person 2 min',
    ],
    output: [
      'Veckans top-3 prioriteringar',
      'Eskalerade blockers',
      'Uppdaterade statusar i Wavult OS',
    ],
    time: 'Måndag 09:00',
    tools: ['Wavult OS', 'Google Meet'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },
  {
    id: 'weekly-tech',
    level: 4,
    name: 'Weekly Tech Sync',
    frequency: 'Veckovis (onsdag)',
    duration: '30 minuter',
    participants: [
      'Johan Berglund (CTO)',
      'Erik Svensson (Chairman/CEO)',
      'Leon Russo (CEO Ops/Sälj) — vid behov',
    ],
    agenda: [
      'Sprint-status: vad är klart, vad kvarstår?',
      'Deploys och releases planerade denna vecka',
      'Infrastruktur: AWS, Cloudflare, system-status',
      'Tech debt och risker',
    ],
    output: [
      'Sprint-status uppdaterad',
      'Deploy-plan för veckan',
      'Flaggade tekniska risker',
    ],
    time: 'Onsdag 10:00',
    tools: ['Wavult OS', 'GitHub', 'AWS Console'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },
  {
    id: 'weekly-sales-ops',
    level: 4,
    name: 'Weekly Sales & Ops',
    frequency: 'Veckovis (torsdag)',
    duration: '30 minuter',
    participants: [
      'Leon Russo (CEO Ops/Sälj)',
      'Dennis Bjarnemark (Legal/Ops)',
    ],
    agenda: [
      'Pipeline-genomgång: leads, prospects, deals',
      'Zoomer-rekrytering: status och nästa steg',
      'Ops-frågor: avtal, compliance, partnerskap',
      'Nästa veckas prioriteringar Sälj & Ops',
    ],
    output: [
      'Pipeline uppdaterad i CRM',
      'Rekryteringsplan uppdaterad',
      'Action items Sälj & Ops',
    ],
    time: 'Torsdag 09:00',
    tools: ['Wavult OS CRM', 'Google Meet'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },

  // ── Nivå 5: Daglig produktionsvardag ───────────────────────────────────────
  {
    id: 'daily-standup',
    level: 5,
    name: 'Daily Standup',
    frequency: 'Dagligen (vardagar)',
    duration: '15 minuter',
    participants: [
      'Erik Svensson (Chairman/CEO)',
      'Dennis Bjarnemark (Legal/Ops)',
      'Leon Russo (CEO Ops/Sälj)',
      'Winston Bjarnemark (CFO)',
      'Johan Berglund (CTO)',
    ],
    agenda: [
      'Vad gjorde jag igår?',
      'Vad gör jag idag?',
      'Har jag några blockers?',
    ],
    output: [
      'Synkad teamstatus',
      'Identifierade blockers',
      'Morning Brief-rapport (skickas av Bernt)',
    ],
    time: '08:30 (Bernt skickar Morning Brief 08:00)',
    tools: ['Wavult OS', 'Wavult OS Morning Brief (Bernt)', 'Telegram'],
    automate: true,
    refCode: 'WG-GOV-2026-001',
  },
  {
    id: 'whoop-morning-check',
    level: 5,
    name: 'WHOOP Morning Check',
    frequency: 'Dagligen (automatisk)',
    duration: 'Automatisk',
    participants: [
      'Hela teamet (passivt — WHOOP-data)',
      'Bernt (aktiv — analyserar och flaggar)',
    ],
    agenda: [
      'Hämta recovery-scores från WHOOP API',
      'Flagga om någon i teamet är röd (<33% recovery)',
      'Vid röd: föreslå reducerad workload',
      'Vid röd: inga kritiska deadlines eller beslut under dagen',
    ],
    output: [
      'WHOOP-statusrapport i Wavult OS',
      'Alert till Erik om kritisk röd recovery',
      'Automatisk workload-rekommendation',
    ],
    time: '08:00 (automatisk, körs av Bernt)',
    tools: ['WHOOP API', 'Wavult OS', 'Telegram (Bernt-alerts)'],
    automate: true,
    refCode: 'WG-GOV-2026-001',
  },

  // ── Nivå 6: Incident & Eskalering ──────────────────────────────────────────
  {
    id: 'p1-incident',
    level: 6,
    name: 'P1 Incident Response',
    frequency: 'Vid behov (omedelbart)',
    duration: 'Max 30 min response-tid',
    participants: [
      'Johan Berglund (CTO) — primär',
      'Erik Svensson (Chairman/CEO) — eskalering',
    ],
    agenda: [
      'Identifiera och bekräfta incident (P1: kritisk systemstörning)',
      'Immediate containment: stoppa blödning',
      'Kommunicera status till berörda',
      'Root cause analysis (RCA) påbörjas',
      'Återställning och post-mortem',
    ],
    output: [
      'Incident löst eller eskalerad',
      'Post-mortem rapport (inom 24h)',
      'Åtgärdsplan för att förhindra upprepning',
    ],
    time: 'Omedelbart vid P1-incident',
    tools: ['Wavult OS Incident Center', 'PagerDuty / Telegram', 'AWS Console', 'GitHub'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },
  {
    id: 'legal-escalation',
    level: 6,
    name: 'Legal & Compliance Eskalering',
    frequency: 'Vid behov',
    duration: 'Inom 2 timmar',
    participants: [
      'Dennis Bjarnemark (Legal/Ops) — primär',
      'Erik Svensson (Chairman/CEO) — vid behov',
    ],
    agenda: [
      'Identifiera legal- eller compliance-risk',
      'Bedöm allvarlighetsgrad och påverkan',
      'Kontakta extern jurist vid behov',
      'Dokumentera i Legal Hub',
      'Kommunicera till berörd part',
    ],
    output: [
      'Legal risk dokumenterad i Wavult OS',
      'Action plan för compliance',
      'Kommunikation till relevanta parter',
    ],
    time: 'Dennis eskalerar inom 2 timmar från identifiering',
    tools: ['Wavult OS Legal Hub', 'Telegram', 'Loopia Mail'],
    automate: false,
    refCode: 'WG-GOV-2026-001',
  },
  {
    id: 'financial-alert',
    level: 6,
    name: 'Financial Alert',
    frequency: 'Vid behov (automatisk trigger)',
    duration: 'Löpande',
    participants: [
      'Winston Bjarnemark (CFO) — primär',
      'Erik Svensson (Chairman/CEO) — eskalering',
    ],
    agenda: [
      'Avvikelse >10% från budget eller prognos identifierad',
      'Analysera orsak till avvikelsen',
      'Bedöm påverkan på runway och likviditet',
      'Föreslå korrigerande åtgärder',
      'Rapportera till ledningen',
    ],
    output: [
      'Finansiell avvikelseanalys',
      'Reviderad prognos',
      'Korrigerande action items',
    ],
    time: 'Winston flaggar vid avvikelse >10% (automatisk monitoring)',
    tools: ['Wavult OS Finance Hub', 'Google Sheets', 'Telegram (Bernt-alert)'],
    automate: true,
    refCode: 'WG-GOV-2026-001',
  },
]

// ─── Helper: hämta möten per nivå ────────────────────────────────────────────
export function getMeetingsByLevel(level: MeetingCadence['level']): MeetingCadence[] {
  return MEETING_CADENCE.filter(m => m.level === level)
}

// ─── Nivå-metadata ────────────────────────────────────────────────────────────
export interface LevelMeta {
  level: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  description: string
  color: string
  bgColor: string
  icon: string
}

export const LEVEL_META: LevelMeta[] = [
  {
    level: 1,
    label: 'Vision & Strategi',
    description: 'Långsiktig riktning, OKRs och bolagsstruktur',
    color: 'text-blue-500',
    bgColor: 'bg-blue-600/10 border-blue-600/20',
    icon: '🏔️',
  },
  {
    level: 2,
    label: 'Kvartalscykel',
    description: 'OKR-uppföljning, ekonomi och kvartalsplanering',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    icon: '📊',
  },
  {
    level: 3,
    label: 'Månadscykel',
    description: 'All-hands, KPIer och teamhälsa',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    icon: '📅',
  },
  {
    level: 4,
    label: 'Veckocykel',
    description: 'Leadership, Tech och Sales & Ops',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    icon: '🔄',
  },
  {
    level: 5,
    label: 'Daglig vardag',
    description: 'Standup, Morning Brief och WHOOP-check (Bernt)',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    icon: '☀️',
  },
  {
    level: 6,
    label: 'Incident & Eskalering',
    description: 'P1, Legal och Financial alerts',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: '🚨',
  },
]
