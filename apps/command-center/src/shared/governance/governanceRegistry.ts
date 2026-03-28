// ─── Wavult OS — Governance Register ────────────────────────────────────────
// Fullständigt register över alla governance-items i Wavult Group.
// Varje item är referenskodad, ägarassignerad och statussatt.
// Referenskod: WG-{DOMAIN}-{YEAR}-{NNN}

import type { GovernanceItem } from './ownershipTypes'

export const GOVERNANCE_REGISTRY: GovernanceItem[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // WG-GOV — Governance & Styrning
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-GOV-2026-001',
    domain: 'GOV',
    title: 'Möteshierarki & Beslutsstruktur',
    description:
      'Fastställer den officiella möteshierarkin för Wavult Group: ' +
      'Annual Planning (L1), QBR (L2), Monthly All-Hands (L3), Weekly Leadership/Tech/Sales (L4), ' +
      'Daily Standup + WHOOP (L5), Incident & Eskalering (L6). ' +
      'Dokumentet definierar frekvens, deltagare, agenda och output per nivå.',
    owner: 'chairman-ceo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'completed',
    nextAction: 'Genomför Annual Planning Q1 2027 enligt fastställd struktur',
    deadline: '2027-01-15',
    linkedItems: ['WG-GOV-2026-002', 'WG-GOV-2026-003'],
  },

  {
    refCode: 'WG-GOV-2026-002',
    domain: 'GOV',
    title: 'Besluts-befogenhetsmatris',
    description:
      'Formell matris som definierar vem som äger vilka beslut på vilken beloppsgräns. ' +
      'Inkluderar RACI-analys per befattning, eskaleringsväg och signaturkrav. ' +
      'Gäller alla bolag i Wavult Group-strukturen.',
    owner: 'chairman-ceo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Formell signering av alla ledningspersoner i Thailand 11 april',
    deadline: '2026-04-11',
    linkedItems: ['WG-GOV-2026-001', 'WG-OPS-2026-003'],
  },

  {
    refCode: 'WG-GOV-2026-003',
    domain: 'GOV',
    title: 'Ägarpolicy & Bolagsordning (koncernnivå)',
    description:
      'Formell ägarpolicy för hela Wavult Group-koncernen. ' +
      'Definierar ägarstrukturen, rösträttsfördelning, bolagsordning per entitet, ' +
      'och principer för intercompany-governance.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Dennis upprättar bolagsordning per entitet — börja med Wavult Group FZCO',
    deadline: '2026-04-30',
    linkedItems: ['WG-LEGAL-2026-004', 'WG-GOV-2026-002'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WG-FIN — Finansiell styrning
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-FIN-2026-001',
    domain: 'FIN',
    title: 'Budget 2026 (4.25M SEK)',
    description:
      'Fastställd årsbudget för Wavult Group 2026 om 4,25 MSEK. ' +
      'Inkluderar kapitalallokering per produktgren, bolagsbildningskostnader, ' +
      'personalkostnader och operativa utgifter. ' +
      'Finansieringsplan inkl. likviditetsplan per kvartal.',
    owner: 'cfo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Winston bekräftar finansieringsplan och likviditetsplan Q2-Q4 2026',
    deadline: '2026-04-11',
    linkedItems: ['WG-FIN-2026-002', 'WG-FIN-2026-003', 'WG-OPS-2026-003'],
  },

  {
    refCode: 'WG-FIN-2026-002',
    domain: 'FIN',
    title: 'Intercompany-flöden & Transfer Pricing Policy',
    description:
      'Policy för alla intercompany-transaktioner inom Wavult Group. ' +
      'Inkluderar management fees, IP-licenser, tekniska tjänster och lånearrangemang. ' +
      'Ska följa OECD Transfer Pricing Guidelines och arm\'s length-principen.',
    owner: 'cfo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Winston + Dennis upprättar TP-policy per OECD — börja med holding→dotterbolag',
    deadline: '2026-06-01',
    linkedItems: ['WG-FIN-2026-001', 'WG-LEGAL-2026-004', 'WG-GOV-2026-003'],
  },

  {
    refCode: 'WG-FIN-2026-003',
    domain: 'FIN',
    title: 'Bankkontostruktur per entitet',
    description:
      'Etablera dedikerade bankkonton per bolag i Wavult Group. ' +
      'Revolut Business för operativa konton, separata entitetskonton för ' +
      'QuiXzoom Inc, QuiXzoom UAB, Landvex AB, Landvex Inc, Wavult Group FZCO.',
    owner: 'cfo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Öppna Revolut Business-konton per bolag — börja med Landvex AB (aktiv)',
    deadline: '2026-04-30',
    linkedItems: ['WG-FIN-2026-001', 'WG-LEGAL-2026-001', 'WG-LEGAL-2026-002'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WG-LEGAL — Juridik & Bolagsbildning
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-LEGAL-2026-001',
    domain: 'LEGAL',
    title: 'QuiXzoom UAB (Litauen) — Registrering',
    description:
      'Registrering av QuiXzoom UAB som litauisk juridisk person (UAB = Uždaroji akcinė bendrovė). ' +
      'EU-entitet för quiXzoom-plattformen — hanterar SEPA-betalningar, EU-VAT och GDPR-compliance ' +
      'för europeiska marknaden.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'completed',
    nextAction: 'Aktivera QuiXzoom UAB i Wavult OS — uppdatera entitetsregister',
    deadline: '2026-04-11',
    linkedItems: ['WG-LEGAL-2026-003', 'WG-FIN-2026-003'],
  },

  {
    refCode: 'WG-LEGAL-2026-002',
    domain: 'LEGAL',
    title: 'Landvex AB (Sverige) — Registrering',
    description:
      'Landvex AB registrerat som svenskt aktiebolag. ' +
      'Svenska säljentiteten för Landvex/Optical Insight-erbjudandet. ' +
      'Tecknar avtal med svenska kommuner och myndigheter.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'completed',
    nextAction: 'Aktivera Landvex AB i Wavult OS — uppdatera entitetsregister med org.nr',
    deadline: '2026-04-11',
    linkedItems: ['WG-OPS-2026-002', 'WG-FIN-2026-003'],
  },

  {
    refCode: 'WG-LEGAL-2026-003',
    domain: 'LEGAL',
    title: 'QuiXzoom Inc (Delaware) — Färdigställande',
    description:
      'Slutföra registrering av QuiXzoom Inc som Delaware C-Corp. ' +
      'Delaware valdes för VC-vänlighet och internationell standard. ' +
      'Primärt USA-bolag för quiXzoom — hanterar kommersiella avtal och Stripe-flöden.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Dennis slutför Delaware-registrering — hämta EIN och öppna bankkonto',
    deadline: '2026-04-30',
    linkedItems: ['WG-LEGAL-2026-001', 'WG-FIN-2026-003'],
  },

  {
    refCode: 'WG-LEGAL-2026-004',
    domain: 'LEGAL',
    title: 'Wavult Group FZCO (Dubai) — Bildning',
    description:
      'Bilda Wavult Group FZCO som Dubai Freezone-entitet (DMCC eller IFZA). ' +
      'Moderbolag och holdingstruktur för hela Wavult Group. ' +
      'Äger IP-rättigheter och hanterar intercompany management fees.',
    owner: 'chairman-ceo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Initiera DMCC/IFZA-process — inhämta offert och registreringshandlingar',
    deadline: '2026-06-01',
    linkedItems: ['WG-GOV-2026-003', 'WG-FIN-2026-002'],
  },

  {
    refCode: 'WG-LEGAL-2026-005',
    domain: 'LEGAL',
    title: 'Landvex Inc (Houston) — Bildning',
    description:
      'Bilda Landvex Inc som Texas LLC baserat i Houston. ' +
      'Nordamerikansk expansion av Landvex-erbjudandet mot ' +
      'amerikanska kommuner, county governments och infrastrukturoperatörer.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Anlita Texas registered agent — inhämta offerter från Northwest/CT Corporation',
    deadline: '2026-06-01',
    linkedItems: ['WG-LEGAL-2026-003', 'WG-OPS-2026-002'],
  },

  {
    refCode: 'WG-LEGAL-2026-006',
    domain: 'LEGAL',
    title: 'Zoomer-avtalsmallar (QuiXzoom)',
    description:
      'Upprätta standardiserade contractor agreements för zoomers (uppdragstagare) ' +
      'i quiXzoom-plattformen. Inkluderar NDA, uppdragsvillkor, ' +
      'IP-överlåtelse av levererat bildmaterial och utbetalningsvillkor.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Dennis upprättar contractor agreement för zoomers — baserat på SE-lagstiftning',
    deadline: '2026-05-01',
    linkedItems: ['WG-LEGAL-2026-001', 'WG-OPS-2026-001'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WG-COMP — Compliance & Certifiering
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-COMP-2026-001',
    domain: 'COMP',
    title: 'ISO 27001 Förberedelse',
    description:
      'Förbereda Wavult Group för ISO 27001-certifiering (Information Security Management). ' +
      'Inkluderar gap-analys, ISMS-implementering, riskbedömning och intern audit. ' +
      'Certifiering krävs för offentliga upphandlingar via Landvex.',
    owner: 'group-cto',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Johan initierar gap-analys mot ISO 27001 — anlita extern konsult eller använda ISMS.online',
    deadline: '2026-09-01',
    linkedItems: ['WG-TECH-2026-001', 'WG-COMP-2026-002'],
  },

  {
    refCode: 'WG-COMP-2026-002',
    domain: 'COMP',
    title: 'GDPR Dataskyddspolicy',
    description:
      'Upprätta komplett GDPR-compliance för Wavult Group. ' +
      'Inkluderar behandlingsregister (Art. 30 GDPR), integritetspolicy, ' +
      'dataskombedömning (DPIA) för quiXzoom-bilddata och ' +
      'rutiner för hantering av registrerades rättigheter.',
    owner: 'chief-legal-ops',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Dennis upprättar behandlingsregister (Art. 30) — börja med quiXzoom bilddata',
    deadline: '2026-05-01',
    linkedItems: ['WG-LEGAL-2026-001', 'WG-COMP-2026-001'],
  },

  {
    refCode: 'WG-COMP-2026-003',
    domain: 'COMP',
    title: 'NIS2 Beredskapsanalys (Landvex)',
    description:
      'Analysera NIS2-direktivets tillämpbarhet för Landvex-verksamheten. ' +
      'Landvex levererar kritisk infrastrukturövervakning — troligtvis klassad som ' +
      'väsentlig entitet under NIS2. Kräver cybersäkerhetsåtgärder och incidentrapportering.',
    owner: 'group-cto',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Johan identifierar NIS2-skyldigheter för Landvex infrastrukturkunder — kontakta ENISA/MSB',
    deadline: '2026-07-01',
    linkedItems: ['WG-COMP-2026-001', 'WG-LEGAL-2026-002'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WG-OPS — Operativ styrning
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-OPS-2026-001',
    domain: 'OPS',
    title: 'quiXzoom Sverige-lansering (15 juni 2026)',
    description:
      'Officiell lansering av quiXzoom-plattformen på den svenska marknaden. ' +
      'Inkluderar beta-test med 20 zoomers i maj, zoomer-rekrytering, ' +
      'landing page live, betalningsflöde aktiverat och PR-kampanj.',
    owner: 'ceo-operations',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Leon koordinerar beta-test med 20 zoomers i maj — rekrytera via sociala medier',
    deadline: '2026-06-15',
    linkedItems: ['WG-LEGAL-2026-006', 'WG-STRAT-2026-001', 'WG-TECH-2026-001'],
  },

  {
    refCode: 'WG-OPS-2026-002',
    domain: 'OPS',
    title: 'Landvex Pipeline Q3 2026',
    description:
      'Etablera försäljningspipeline för Landvex mot svenska kommuner och myndigheter. ' +
      'Mål Q3 2026: 3 signerade LOI (Letter of Intent) och 1 pilotkontrakt.',
    owner: 'ceo-operations',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Leon initierar kommunala kontakter Q2 — boka möten med Stockholm, Göteborg, Malmö',
    deadline: '2026-09-30',
    linkedItems: ['WG-LEGAL-2026-002', 'WG-COMP-2026-003', 'WG-STRAT-2026-001'],
  },

  {
    refCode: 'WG-OPS-2026-003',
    domain: 'OPS',
    title: 'Thailand Workcamp (11 april 2026)',
    description:
      'Ledningskonferens i Thailand 11 april 2026. ' +
      'Agenda: signering av besluts-befogenhetsmatris, Wavult OS live-genomgång, ' +
      'teambuilding och Q2-prioriteringar. Alla system ska vara live innan avresa.',
    owner: 'chairman-ceo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Alla system live innan avresa 11 april — verifieras av Johan',
    deadline: '2026-04-11',
    linkedItems: ['WG-GOV-2026-002', 'WG-TECH-2026-001', 'WG-FIN-2026-001'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WG-TECH — Teknisk infrastruktur
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-TECH-2026-001',
    domain: 'TECH',
    title: 'Wavult OS Production Deployment',
    description:
      'Driftsätta Wavult OS i produktionsmiljö inför Thailand-workcamp 11 april. ' +
      'Alla moduler ska vara i BETA+ (maturity level BETA eller högre). ' +
      'Inkluderar AWS ECS deployment, Cloudflare CDN och Supabase production setup.',
    owner: 'group-cto',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Johan säkerställer alla moduler i BETA+ — kör tsc --noEmit och deployment-test',
    deadline: '2026-04-11',
    linkedItems: ['WG-OPS-2026-003', 'WG-COMP-2026-001'],
  },

  {
    refCode: 'WG-TECH-2026-002',
    domain: 'TECH',
    title: 'WHOOP-integration (hela teamet kopplat)',
    description:
      'Koppla alla ledningspersoners WHOOP-armband till Wavult OS. ' +
      'Möjliggör team health monitoring, recovery-scores och ' +
      'automatiserade workload-rekommendationer av Bernt.',
    owner: 'group-cto',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Johan + Leon + Erik kopplar sina WHOOP-armband via OAuth-flöde',
    deadline: '2026-04-05',
    linkedItems: ['WG-TECH-2026-001'],
  },

  {
    refCode: 'WG-TECH-2026-003',
    domain: 'TECH',
    title: 'OI Cloud EU (Optical Insight Portal)',
    description:
      'Driftsätta Optical Insight-portalen på EU-servrar (GDPR-compliant). ' +
      'Inkluderar AWS eu-north-1 ECS cluster, bildanalys-pipeline och ' +
      'kund-portal för Landvex-kunder att se händelsebaserade alerts.',
    owner: 'group-cto',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Johan deployer EU-instansen på AWS eu-north-1 — konfigurera VPC och load balancer',
    deadline: '2026-06-01',
    linkedItems: ['WG-TECH-2026-001', 'WG-OPS-2026-002', 'WG-COMP-2026-002'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WG-STRAT — Strategi
  // ══════════════════════════════════════════════════════════════════════════

  {
    refCode: 'WG-STRAT-2026-001',
    domain: 'STRAT',
    title: 'Go-to-Market Sverige Q2 2026',
    description:
      'Fullständig GTM-plan för quiXzoom och Landvex på den svenska marknaden Q2 2026. ' +
      'Inkluderar landing pages, zoomer-rekrytering, marknadsföring och ' +
      'B2B-prospektering mot kommunala kunder för Landvex.',
    owner: 'chairman-ceo',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'in_progress',
    nextAction: 'Slutför quiXzoom landing page + zoomer-rekryteringskampanj — live innan juni',
    deadline: '2026-06-01',
    linkedItems: ['WG-OPS-2026-001', 'WG-OPS-2026-002', 'WG-LEGAL-2026-006'],
  },

  {
    refCode: 'WG-STRAT-2026-002',
    domain: 'STRAT',
    title: 'Expansion Nederländerna Q1 2027',
    description:
      'Strategisk expansion av quiXzoom till den nederländska marknaden Q1 2027. ' +
      'Marknadsundersökning, juridisk struktur för NL-entitet och ' +
      'rekrytering av lokal operatör/country manager.',
    owner: 'ceo-operations',
    establishedBy: 'Ledningsgenomgång 2026-03-28',
    establishedAt: '2026-03-28',
    status: 'not_started',
    nextAction: 'Leon påbörjar marknadskartläggning NL — researcha zoomer-marknaden och konkurrenter',
    deadline: '2026-12-01',
    linkedItems: ['WG-OPS-2026-001', 'WG-LEGAL-2026-001'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Hämta ett governance-item per refCode */
export function getGovernanceItem(refCode: string): GovernanceItem | undefined {
  return GOVERNANCE_REGISTRY.find(item => item.refCode === refCode)
}

/** Hämta alla items för en specifik ägarroll, sorterat på deadline */
export function getItemsByOwner(ownerId: string): GovernanceItem[] {
  return GOVERNANCE_REGISTRY
    .filter(item => item.owner === ownerId)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}

/** Hämta alla items för en domän */
export function getItemsByDomain(domain: string): GovernanceItem[] {
  return GOVERNANCE_REGISTRY.filter(item => item.domain === domain)
}

/** Hämta alla blockerade items */
export function getBlockedItems(): GovernanceItem[] {
  return GOVERNANCE_REGISTRY.filter(item => item.status === 'blocked')
}

/** Beräkna completion-statistik */
export function getCompletionStats(): { total: number; completed: number; percentage: number } {
  const total = GOVERNANCE_REGISTRY.length
  const completed = GOVERNANCE_REGISTRY.filter(i => i.status === 'completed').length
  return { total, completed, percentage: Math.round((completed / total) * 100) }
}

/** Kolla om ett items deadline är passerad */
export function isOverdue(item: GovernanceItem): boolean {
  if (item.status === 'completed') return false
  return new Date(item.deadline) < new Date()
}

/** Kolla om ett items deadline är inom N dagar */
export function isDueWithinDays(item: GovernanceItem, days: number): boolean {
  if (item.status === 'completed') return false
  const now = new Date()
  const deadline = new Date(item.deadline)
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= days
}
