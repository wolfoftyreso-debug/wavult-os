// ============================================================
// routingConfig.ts — Wavult OS Communications Routing
// Keyword → Department → Responsible Person
// ============================================================
// Uppdaterad: 2026-03-27 (audit by Bernt)
// ============================================================

export interface RoutingRule {
  id: string
  keywords: string[]
  department: Department
  responsible: TeamMember
  fallback?: TeamMember
  priority: 1 | 2 | 3  // 1 = highest
  channel: Channel[]
  description: string
}

export type Department =
  | 'juridik'
  | 'ekonomi'
  | 'teknik'
  | 'sälj'
  | 'support'
  | 'zoomer'
  | 'ledning'
  | 'övrigt'

export type Channel = 'sms' | 'email' | 'telegram' | 'webhook'

export interface TeamMember {
  name: string
  role: string
  email: string
  phone: string       // E.164 format
  telegram?: string
}

// ─── Team Registry ────────────────────────────────────────────────────────────

export const TEAM: Record<string, TeamMember> = {
  erik: {
    name: 'Erik Svensson',
    role: 'Chairman & Group CEO',
    email: 'erik@hypbit.com',
    phone: '+46709123223',
    telegram: '@eriksvensson',
  },
  leon: {
    name: 'Leon Maurizio Russo De Cerame',
    role: 'CEO Wavult Operations',
    email: 'leon@hypbit.com',
    phone: '+46738968949',
  },
  dennis: {
    name: 'Dennis Bjarnemark',
    role: 'Chief Legal & Operations',
    email: 'dennis@hypbit.com',
    phone: '+46761474243',   // 0761474243 → E.164
  },
  winston: {
    name: 'Winston Bjarnemark',
    role: 'CFO',
    email: 'winston@hypbit.com',
    phone: '+46768123548',
  },
  johan: {
    name: 'Johan Berglund',
    role: 'Group CTO',
    email: 'johan@hypbit.com',
    phone: '+46736977576',
  },
}

// ─── Routing Rules ────────────────────────────────────────────────────────────
// Regler processas i priority-ordning (1 = högst). Första match vinner.

export const ROUTING_RULES: RoutingRule[] = [
  // ── JURIDIK ────────────────────────────────────────────────────────────────
  {
    id: 'legal-contracts',
    keywords: [
      'avtal', 'kontrakt', 'signatur', 'notarie', 'bolagsavtal',
      'uab', 'llc', 'fzco', 'bolagsverket', 'compliance', 'gdpr',
      'texas', 'litauen', 'dubai', 'juridik', 'legal', 'lagen',
    ],
    department: 'juridik',
    responsible: TEAM.dennis,
    fallback: TEAM.erik,
    priority: 1,
    channel: ['email', 'sms', 'telegram'],
    description: 'Bolagsjuridik, avtal, compliance, bolagsstruktur',
  },

  // ── EKONOMI ───────────────────────────────────────────────────────────────
  {
    id: 'finance-banking',
    keywords: [
      'faktura', 'betalning', 'revolut', 'stripe', 'moms', 'vat',
      'f-skatt', 'skatteverket', 'sweeping', 'cashflow', 'ekonomi',
      'budget', 'q1', 'rapport', 'balansräkning', 'bokföring',
      'mercury', 'konto', 'transfer', 'bank', 'kyc',
    ],
    department: 'ekonomi',
    responsible: TEAM.winston,
    fallback: TEAM.erik,
    priority: 1,
    channel: ['email', 'sms'],
    description: 'Finans, betalningar, banking, skatt, bokföring',
  },

  // ── TEKNIK ────────────────────────────────────────────────────────────────
  {
    id: 'tech-infrastructure',
    keywords: [
      'ecs', 'aws', 'docker', 'deploy', 'server', 'api', 'bug',
      'crash', 'timeout', 'latency', 'ci', 'cd', 'github',
      'supabase', 'databas', 'ssl', 'https', 'cloudflare', 'dns',
      'webhook', 'healthcheck', 'uptime', 'staging', 'production',
    ],
    department: 'teknik',
    responsible: TEAM.johan,
    fallback: TEAM.erik,
    priority: 1,
    channel: ['email', 'sms', 'webhook'],
    description: 'IT-infrastruktur, deployments, bugs, API:er',
  },

  // ── ZOOMER / QUIXZOOM ─────────────────────────────────────────────────────
  {
    id: 'zoomer-platform',
    keywords: [
      'zoomer', 'quixzoom', 'quiXzoom', 'fotouppdrag', 'uppdrag',
      'kamera', 'bild', 'foto', 'crowdsource', 'marketplace',
      'optical insight', 'bildleverans', 'sensor', 'location',
    ],
    department: 'zoomer',
    responsible: TEAM.leon,
    fallback: TEAM.johan,
    priority: 2,
    channel: ['email', 'sms', 'telegram'],
    description: 'QuixZoom-plattformen, zoomers, fotouppdrag',
  },

  // ── SÄLJ / PARTNERS ───────────────────────────────────────────────────────
  {
    id: 'sales-leads',
    keywords: [
      'partner', 'kund', 'demo', 'pitch', 'erbjudande', 'offert',
      'avtal kund', 'onboarding', 'leads', 'crm', 'prospekt',
      'landvex', 'b2g', 'kommuner', 'myndighet',
    ],
    department: 'sälj',
    responsible: TEAM.leon,
    fallback: TEAM.erik,
    priority: 2,
    channel: ['email', 'sms', 'telegram'],
    description: 'Säljpipeline, kundrelationer, partnerskap',
  },

  // ── SUPPORT ───────────────────────────────────────────────────────────────
  {
    id: 'support-general',
    keywords: [
      'hjälp', 'problem', 'support', 'fungerar inte', 'fel',
      'issue', 'ticket', 'error', 'kraschar', 'loggar in inte',
    ],
    department: 'support',
    responsible: TEAM.johan,
    fallback: TEAM.leon,
    priority: 3,
    channel: ['email', 'sms'],
    description: 'Generell support och felsökning',
  },

  // ── LEDNING / STRATEGISKT ─────────────────────────────────────────────────
  {
    id: 'leadership-strategy',
    keywords: [
      'strategi', 'board', 'styrelse', 'investerare', 'thailand',
      'workcamp', 'vision', 'roadmap', 'launch', 'milestone',
      'q2', 'q3', 'q4', 'halvår', 'årsplan',
    ],
    department: 'ledning',
    responsible: TEAM.erik,
    priority: 1,
    channel: ['email', 'telegram'],
    description: 'Strategiska frågor, board, investerare, roadmap',
  },
]

// ─── Routing Engine ────────────────────────────────────────────────────────────

export interface RoutingResult {
  rule: RoutingRule
  responsible: TeamMember
  department: Department
  matchedKeywords: string[]
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Route a message to the correct department and person.
 * Returns the best matching rule, or null if no match.
 */
export function routeMessage(text: string, channel: Channel): RoutingResult | null {
  const lower = text.toLowerCase()

  const matches = ROUTING_RULES
    .filter(rule => rule.channel.includes(channel))
    .map(rule => {
      const matchedKeywords = rule.keywords.filter(kw => lower.includes(kw.toLowerCase()))
      return { rule, matchedKeywords }
    })
    .filter(m => m.matchedKeywords.length > 0)
    .sort((a, b) => {
      // Sort by priority first, then by number of keyword matches
      if (a.rule.priority !== b.rule.priority) return a.rule.priority - b.rule.priority
      return b.matchedKeywords.length - a.matchedKeywords.length
    })

  if (matches.length === 0) return null

  const best = matches[0]
  const confidence: 'high' | 'medium' | 'low' =
    best.matchedKeywords.length >= 3 ? 'high' :
    best.matchedKeywords.length >= 2 ? 'medium' : 'low'

  return {
    rule: best.rule,
    responsible: best.rule.responsible,
    department: best.rule.department,
    matchedKeywords: best.matchedKeywords,
    confidence,
  }
}

/**
 * Route an incoming SMS.
 * Useful for 46elks webhook handler.
 */
export function routeSMS(_from: string, message: string): RoutingResult | null {
  return routeMessage(message, 'sms')
}

/**
 * Route an incoming email.
 */
export function routeEmail(subject: string, body: string): RoutingResult | null {
  return routeMessage(`${subject} ${body}`, 'email')
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

export interface RoutingTestCase {
  scenario: string
  text: string
  channel: Channel
  expectedResponsible: string
  expectedRuleId: string
}

export interface RoutingTestResult {
  scenario: string
  passed: boolean
  expected: string
  got: string | null
  ruleId: string | null
  matchedKeywords: string[]
  confidence: 'high' | 'medium' | 'low' | null
}

const ROUTING_TEST_CASES: RoutingTestCase[] = [
  {
    scenario: 'Avtalsproblem → Dennis',
    text: 'Vi har ett avtalsproblem med en leverantör',
    channel: 'email',
    expectedResponsible: 'Dennis Bjarnemark',
    expectedRuleId: 'legal-contracts',
  },
  {
    scenario: 'Stripe-betalning → Winston',
    text: 'Stripe-betalningen failade',
    channel: 'email',
    expectedResponsible: 'Winston Bjarnemark',
    expectedRuleId: 'finance-banking',
  },
  {
    scenario: 'ECS-deploy kraschar → Johan',
    text: 'ECS-deploys kraschar',
    channel: 'sms',
    expectedResponsible: 'Johan Berglund',
    expectedRuleId: 'tech-infrastructure',
  },
  {
    scenario: 'Zoomer-fråga → Leon',
    text: 'En zoomer frågar om uppdragsregler',
    channel: 'email',
    expectedResponsible: 'Leon Maurizio Russo De Cerame',
    expectedRuleId: 'zoomer-platform',
  },
  {
    scenario: 'Landvex demo → Leon',
    text: 'Kommunen vill ha en demo av Landvex',
    channel: 'email',
    expectedResponsible: 'Leon Maurizio Russo De Cerame',
    expectedRuleId: 'sales-leads',
  },
  {
    scenario: 'Styrelseprotokoll → Erik',
    text: 'Styrelseprotokoll behöver signeras',
    channel: 'email',
    expectedResponsible: 'Erik Svensson',
    expectedRuleId: 'leadership-strategy',
  },
]

/**
 * Run all routing test cases and return results.
 * Call this in tests or from RoutingView to verify rule correctness.
 */
export function testRouting(): RoutingTestResult[] {
  return ROUTING_TEST_CASES.map(tc => {
    const result = routeMessage(tc.text, tc.channel)
    const passed = result !== null &&
      result.responsible.name === tc.expectedResponsible &&
      result.rule.id === tc.expectedRuleId

    return {
      scenario: tc.scenario,
      passed,
      expected: tc.expectedResponsible,
      got: result?.responsible.name ?? null,
      ruleId: result?.rule.id ?? null,
      matchedKeywords: result?.matchedKeywords ?? [],
      confidence: result?.confidence ?? null,
    }
  })
}

// ─── 46elks Webhook Config ────────────────────────────────────────────────────
// Configure these URLs in 46elks dashboard for allocated numbers

export const ELKS_CONFIG = {
  // Account info (from API audit 2026-03-27)
  accountId: 'ubb8ccf5ac18465a9cec0f0f404a6f348',
  accountName: 'Erik Svensson',
  accountEmail: 'erik@vwtyreso.se',
  balanceSEK: 14200,       // 1420000 öre = 14,200 SEK
  currency: 'SEK',
  trialActivated: '2026-01-30',

  // No dedicated numbers allocated yet — SMS goes out from "Wavult" alphanumeric sender
  // Action needed: purchase a Swedish number for inbound SMS
  allocatedNumbers: [] as string[],
  sender: 'Wavult',        // Alphanumeric sender (no inbound possible without real number)

  // Webhooks (to configure when a real number is purchased)
  webhookSmsReceived: 'https://api.wavult.com/webhooks/46elks/sms',
  webhookVoiceReceived: 'https://api.wavult.com/webhooks/46elks/voice',

  // Routing: inbound SMS → this function
  smsRouter: routeSMS,
}

// ─── SMTP Config ──────────────────────────────────────────────────────────────
// Verified working 2026-03-27 (SMTP audit)

export const SMTP_CONFIG = {
  host: 'outgoing.loopia.se',
  port: 587,
  security: 'STARTTLS',
  user: 'erik@hypbit.com',
  status: 'verified',      // Tested & working
  domains: ['hypbit.com'],
}
