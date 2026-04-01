// companyDescriptions.ts — Wavult Group Bolagsbeskrivningar
// Fullständig verksamhetsdata per bolag

export type CompanyStatus = 'planerad' | 'under-bildning' | 'aktiv'

export interface CompanyDescription {
  id: string
  /** Juridiskt namn */
  name: string
  /** Kortnamn */
  shortName: string
  /** Jurisdiktion / hemland */
  jurisdiction: string
  /** Emoji-flagga */
  flag: string
  /** Accent-färg */
  color: string
  /** Bolagets syfte i Wavult Group-strukturen */
  syfte: string
  /** Kärnverksamhet — vad bolaget konkret gör */
  karnverksamhet: string
  /** Nuvarande status */
  status: CompanyStatus
  /** Ansvarig person */
  ansvarig: string
  /** Roll i ansvarig person */
  ansvarigRoll: string
  /** Produktgren / affärsgren */
  produktgren: 'quiXzoom' | 'Landvex' | 'Wavult OS' | 'Holding' | 'DevOps'
  /** Beskrivning av relation till moderbolag */
  relation?: string
  /** Nyckelmarknader */
  marknader?: string[]
  /** Planerat startdatum / registreringsdatum */
  startDatum?: string
  /** Governance-referenskod (WG-LEGAL-2026-XXX) */
  refCode?: string
}

export const COMPANY_DESCRIPTIONS: CompanyDescription[] = [
  // ─── Holding & DevOps ────────────────────────────────────────────────────
  {
    id: 'wavult-group-fzco',
    name: 'Wavult Group FZCO',
    shortName: 'Wavult Group',
    jurisdiction: 'UAE — Dubai Freezone (IFZA)',
    flag: '🇦🇪',
    color: '#2563EB',
    syfte:
      'Moderbolag och koncernens holdingstruktur. Äger IP-rättigheter, hanterar intercompany-flöden och samordnar strategiska beslut för hela Wavult Group.',
    karnverksamhet:
      'Holdingverksamhet, IP-licensiering till dotterbolag, management fees, koncernfinansiering och governance. Inget eget operativt erbjudande mot slutkund.',
    status: 'under-bildning',
    ansvarig: 'Erik Svensson',
    ansvarigRoll: 'Chairman / Group CEO',
    produktgren: 'Holding',
    relation: 'Moderbolag till samtliga dotterbolag',
    startDatum: '2026-04-10',
    refCode: 'WG-LEGAL-2026-004',
  },
  {
    id: 'wavult-devops-fzco',
    name: 'Wavult DevOps FZCO',
    shortName: 'Wavult DevOps',
    jurisdiction: 'UAE — Dubai Freezone (IFZA)',
    flag: '🇦🇪',
    color: '#60A5FA',
    syfte:
      'Tekniskt operationsbolag. Bygger, driftar och äger den tekniska plattformen — Wavult OS, quiXzoom-plattformen och Optical Insight-motorn.',
    karnverksamhet:
      'Systemutveckling, cloud-infrastruktur (AWS/Supabase/Cloudflare), plattformsdrift, vision engine och automatiserade analysflöden. Levererar teknisk kapacitet till övriga bolag i gruppen.',
    status: 'under-bildning',
    ansvarig: 'Johan Berglund',
    ansvarigRoll: 'Group CTO',
    produktgren: 'DevOps',
    relation: 'Dotterbolag till Wavult Group FZCO',
    startDatum: '2026-04-10',
    refCode: 'WG-LEGAL-2026-004',
  },

  // ─── quiXzoom ────────────────────────────────────────────────────────────
  {
    id: 'quixzoom-inc',
    name: 'QuiXzoom Inc',
    shortName: 'QuiXzoom US',
    jurisdiction: 'USA — Delaware',
    flag: '🇺🇸',
    color: '#3B82F6',
    syfte:
      'Primärt USA-bolag för quiXzoom. Hanterar kommersiella avtal, uppdragsgivare och Stripe-betalningsflöden för den nordamerikanska marknaden. Är även juridisk hemvist för varumärket quiXzoom internationellt.',
    karnverksamhet:
      'quiXzoom — crowdsourcad kamerainfrastruktur. Uppdragsgivare (kommuner, fastighetsbolag, mediabolag) publicerar bilduppdrag via plattformen. Zoomers accepterar uppdrag, levererar visuell data och tjänar pengar direkt. Plattformen automatiserar uppdragsflöde, kvalitetskontroll och utbetalningar.',
    status: 'under-bildning',
    ansvarig: 'Leon Russo',
    ansvarigRoll: 'CEO Wavult Operations',
    produktgren: 'quiXzoom',
    relation: 'Dotterbolag till Wavult Group FZCO',
    marknader: ['USA', 'Sverige', 'Nederländerna'],
    startDatum: '2026-04-05',
    refCode: 'WG-LEGAL-2026-003',
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    shortName: 'QuiXzoom EU',
    jurisdiction: 'Litauen — Vilnius',
    flag: '🇱🇹',
    color: '#60A5FA',
    syfte:
      'EU-entitet för quiXzoom. Hanterar europeiska betalningar (SEPA), EU-VAT-registrering och GDPR-compliance för den europeiska marknaden. Litauen valdes för snabb bolagsbildning, låg bolagsskatt och fintech-vänlig miljö.',
    karnverksamhet:
      'IP-licenstagare från Wavult Group FZCO. Hanterar zoomer-utbetalningar i EUR, EU-uppdragsgivare och compliance mot GDPR. Agerar som "pass-through" för europeiska transaktioner i quiXzoom-plattformen.',
    status: 'under-bildning',
    ansvarig: 'Dennis Bjarnemark',
    ansvarigRoll: 'Chief Legal & Operations',
    produktgren: 'quiXzoom',
    relation: 'Dotterbolag till Wavult Group FZCO',
    marknader: ['Sverige', 'Nederländerna', 'EU'],
    startDatum: '2026-05-01',
    refCode: 'WG-LEGAL-2026-001',
  },

  // ─── Landvex ─────────────────────────────────────────────────────────────
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    shortName: 'Landvex SE',
    jurisdiction: 'Sverige — Stockholm',
    flag: '🇸🇪',
    color: '#10B981',
    syfte:
      'Svenska säljentiteten för Landvex-erbjudandet. Tecknar avtal med svenska kommuner, Trafikverket och fastighetsbolag. Landvex AB är säljorganisation — den underliggande tekniken (Optical Insight) levereras av Wavult DevOps.',
    karnverksamhet:
      'B2G-försäljning av intelligenta övervaknings- och analysabonnemang. Erbjudandet bygger på Optical Insight-motorn: automatiserad optisk analys av infrastruktur och offentliga miljöer. Kunden prenumererar på händelsebaserade larm och analytiska rapporter — "Right control. Right cost. Right interval." Inga kameror säljs — tjänsten levereras som SaaS-abonnemang.',
    status: 'aktiv',
    ansvarig: 'Leon Russo',
    ansvarigRoll: 'CEO Wavult Operations',
    produktgren: 'Landvex',
    relation: 'Dotterbolag till Wavult Group FZCO',
    marknader: ['Sverige'],
    startDatum: '2025-01-01',
    refCode: 'WG-LEGAL-2026-002',
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc',
    shortName: 'Landvex US',
    jurisdiction: 'USA — Houston, Texas',
    flag: '🇺🇸',
    color: '#34D399',
    syfte:
      'Nordamerikansk expansion av Landvex. Houston valdes strategiskt för sin koncentration av infrastrukturbolag, energisektorn och municipality-kontrakt. Etableras för att testa marknaden parallellt med Sverige-lanseringen.',
    karnverksamhet:
      'B2G och B2B-försäljning av Optical Insight-analysabonnemang till amerikanska kommuner, county governments och infrastrukturoperatörer. Identiska erbjudande som Landvex AB men anpassat till US-regelverk och procurement-processer.',
    status: 'under-bildning',
    ansvarig: 'Leon Russo',
    ansvarigRoll: 'CEO Wavult Operations',
    produktgren: 'Landvex',
    relation: 'Dotterbolag till Wavult Group FZCO',
    marknader: ['USA'],
    startDatum: '2026-04-08',
    refCode: 'WG-LEGAL-2026-005',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStatusBadge(status: CompanyStatus): { label: string; color: string } {
  switch (status) {
    case 'aktiv':
      return { label: 'Aktiv', color: '#10B981' }
    case 'under-bildning':
      return { label: 'Under bildning', color: '#F59E0B' }
    case 'planerad':
      return { label: 'Planerad', color: '#6B7280' }
  }
}

export function getProductgrenMeta(gren: CompanyDescription['produktgren']): { color: string; icon: string } {
  switch (gren) {
    case 'quiXzoom': return { color: '#3B82F6', icon: '📷' }
    case 'Landvex': return { color: '#10B981', icon: '🌍' }
    case 'Wavult OS': return { color: '#60A5FA', icon: '⚙️' }
    case 'Holding': return { color: '#2563EB', icon: '🏛️' }
    case 'DevOps': return { color: '#EC4899', icon: '💻' }
  }
}
