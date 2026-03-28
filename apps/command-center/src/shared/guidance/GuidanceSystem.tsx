/**
 * GuidanceSystem — Smart contextual guidance for Wavult OS
 *
 * Triggers guidance in three scenarios:
 *   1. First-time visit to a module (tracked in localStorage)
 *   2. User is idle >5 s on a module without clicking or scrolling
 *   3. Module has maturity level SKELETON or ALPHA
 *
 * Rules enforced:
 *   - Never shown twice for the same page key
 *   - Never interrupts active interaction (click / scroll)
 *   - Max one guidance at a time
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { MODULE_REGISTRY, type MaturityLevel } from '../maturity/maturityModel'

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'wavult_guidance_seen'

function getSeenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function markSeen(key: string): void {
  try {
    const seen = getSeenSet()
    seen.add(key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    // localStorage not available — silently ignore
  }
}

function hasBeenSeen(key: string): boolean {
  return getSeenSet().has(key)
}

// ─── Guidance messages per route ─────────────────────────────────────────────

interface GuidanceEntry {
  /** Short (1–2 sentence) guidance shown in toast */
  short: string
  /** Extended explanation, revealed on "Visa mer →" click */
  extended?: string
}

const ROUTE_GUIDANCE: Record<string, GuidanceEntry> = {
  '/dashboard': {
    short: 'Här ser du systemstatus, aktiva incidenter och teamaktivitet för hela koncernen.',
    extended:
      'Dashboarden samlar realtidssignaler från alla moduler. Klicka på en incident eller modul för att dyka djupare.',
  },
  '/crm': {
    short: 'CRM visar din säljpipeline — prospects, deals och aktivitetslogg. All data är mockdata tills Supabase-koppling är klar.',
    extended:
      'Prospects läggs till manuellt i nuläget. Deal-stages (Prospect → Qualified → Proposal → Closed) spåras i Pipeline-vyn.',
  },
  '/finance': {
    short: 'Finance Hub samlar all ekonomi — kontoplan, kassaflöde, fakturor och skatteoptimering. Observera: alla siffror är mockdata.',
    extended:
      'Intercompany-fliken visar hur pengar rör sig mellan bolagen i koncernen. Optimering-fliken ger AI-rekommendationer för skatteeffektivitet.',
  },
  '/legal': {
    short: 'Legal Hub spårar juridiska dokument och signeringsflöden inom hela Wavult-koncernen.',
    extended:
      'Dokument med status "Föreslagen" är automatiskt föreslagna av systemet baserat på bolagsstrukturen. Granska och skicka för signering.',
  },
  '/corporate': {
    short: 'Bolagsadmin hanterar ägarstruktur, jurisdiktionskrav och compliance-deadlines.',
    extended:
      'Compliance-trackern visar juridiska krav per land — momsregistrering, årsredovisning, styrelseprotokoll etc.',
  },
  '/payroll': {
    short: 'Lön & Personal hanterar lönekörningar, semesterspårning och skattedeklarationer. Alla belopp är mockdata.',
    extended:
      'PayrollRun-vyn simulerar lönekörning med AGI-integration. BankID-signering och Fortnox-koppling är planerat för Fas 2.',
  },
  '/procurement': {
    short: 'Inköp hanterar leverantörer, inköpsordrar och godkännandeflöden.',
    extended: 'Alla leverantörer är mockdata i nuläget. Live leverantörskontrakt och PO-automation planeras för Fas 2.',
  },
  '/communications': {
    short: 'Kommunikationsmodulen visar inkorgen, API-status och webhook-loggar. Alla meddelanden är mockdata.',
    extended:
      'Live SMS via 46elks och Slack-integration är planerat för Fas 2. API-statussidan visar vilka integrationer som är aktiva vs. planerade.',
  },
  '/reports': {
    short: 'Rapporter genererar Executive Summary, P&L och säljrapporter. Alla siffror är mockdata.',
    extended: 'Live data från Finance + CRM kopplas in i Fas 2. PDF-export och schemalagda rapporter planeras.',
  },
  '/media': {
    short: 'Media & Ads är en SKELETON-modul — strukturen finns men inga integrationer är aktiva ännu.',
    extended:
      'Spotify Ads, Google Ads, Meta Ads och The Trade Desk-integration planeras för Fas 2. Modulen visar den planerade kampanjstrukturen.',
  },
  '/knowledge': {
    short: 'Kunskapshubben innehåller interna dokument, kunskapsgraf och Academy med kurser.',
    extended:
      'Zoomer-certifieringen är ett internt kompetensprogram. Progress sparas lokalt i webbläsaren tills Supabase-sync är live.',
  },
  '/people-intelligence': {
    short: 'People Intelligence visar DISC-profiler och kommunikationsstilar för hela teamet. Data är statisk mockdata.',
    extended:
      'DISC-scores är baserade på profil-bedömning. Live DISC-assessment och AI-rekommendationer planeras för Fas 2.',
  },
  '/system-intelligence': {
    short: 'System Intelligence ger en strategisk hälsöversikt av koncernen — riskmatris, beslutslogg och marknadssignaler.',
    extended: 'All data är manuellt inmatad mockdata i nuläget. Live-koppling mot Supabase och AI-riskanalys planeras.',
  },
  '/talent-radar': {
    short: 'Talent Radar spårar potentiella rekryteringsmål — manuell pipeline i Fas 1.',
    extended: 'GitHub live activity feed och auto-outreach via e-post planeras för Fas 2.',
  },
  '/org': {
    short: 'Corporate Graph visualiserar ägar- och kommandostrukturen för hela Wavult-koncernen.',
    extended: 'Klicka på en nod för att se detaljer. Org Hierarchy-vyn visar rapporteringslinjer per roll.',
  },
  '/incidents': {
    short: 'Alerts samlar kritiska händelser som kräver omedelbar uppmärksamhet.',
    extended: 'Eskalerade incidenter visas i rött i navigationen. Incidenter genereras av systemet baserat på KPI-avvikelser.',
  },
  '/milestones': {
    short: 'Milestones spårar kritiska leveransmål inför Thailand Workcamp och Q2-Q4.',
    extended: 'Checklistan för Thailand-förberedelser är den primära vyn. Roadmap-vyn ger en tidslinje för hela 2026.',
  },
  '/settings': {
    short: 'Inställningar hanterar API-nycklar, roller och systemkonfiguration.',
    extended: 'Rollhantering kontrollerar vem som ser vad i systemet. Live API-nyckelhantering och SSO planeras för Fas 2.',
  },
}

/** Returns guidance for a given route, or null if none is defined. */
function getGuidanceForRoute(pathname: string): GuidanceEntry | null {
  // Exact match first
  if (ROUTE_GUIDANCE[pathname]) return ROUTE_GUIDANCE[pathname]
  // Prefix match (e.g. /org/command → /org)
  const key = Object.keys(ROUTE_GUIDANCE)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return key ? ROUTE_GUIDANCE[key] : null
}

/** Returns whether a module has alpha/skeleton maturity. */
function moduleIsImmature(pathname: string): boolean {
  const mod = MODULE_REGISTRY.find(m => pathname.startsWith(m.path))
  if (!mod) return false
  const immaturelevels: MaturityLevel[] = ['skeleton', 'alpha']
  return immaturelevels.includes(mod.level)
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface GuidanceToastData {
  key: string
  short: string
  extended?: string
  /** true = module is skeleton/alpha (special styling) */
  isImmature?: boolean
}

interface GuidanceContextValue {
  /** Currently active toast data, null if none showing */
  activeToast: GuidanceToastData | null
  /** Call this to dismiss the active toast */
  dismissToast: () => void
}

const GuidanceContext = createContext<GuidanceContextValue>({
  activeToast: null,
  dismissToast: () => undefined,
})

export function useGuidance(): GuidanceContextValue {
  return useContext(GuidanceContext)
}

// ─── IDLE_DELAY constant ──────────────────────────────────────────────────────

/** Milliseconds of inactivity before showing idle-triggered guidance */
const IDLE_DELAY_MS = 5_000

// ─── GuidanceProvider ─────────────────────────────────────────────────────────

/**
 * Wraps the application to provide smart contextual guidance.
 * Place inside <Router> so useLocation() works.
 */
export function GuidanceProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [activeToast, setActiveToast] = useState<GuidanceToastData | null>(null)

  // Track whether user is actively interacting
  const userActiveRef = useRef(false)
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismissToast = useCallback(() => setActiveToast(null), [])

  /** Mark user as active for 2 s after any interaction */
  const onInteraction = useCallback(() => {
    userActiveRef.current = true
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current)
    activityTimerRef.current = setTimeout(() => {
      userActiveRef.current = false
    }, 2_000)
  }, [])

  // Attach global interaction listeners
  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = ['click', 'scroll', 'keydown', 'touchstart', 'mousemove']
    events.forEach(ev => document.addEventListener(ev, onInteraction, { passive: true }))
    return () => {
      events.forEach(ev => document.removeEventListener(ev, onInteraction))
    }
  }, [onInteraction])

  // On route change: decide whether to show guidance
  useEffect(() => {
    // Clear any pending timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    setActiveToast(null)

    const key = pathname

    // Bail if already seen
    if (hasBeenSeen(key)) return

    const guidance = getGuidanceForRoute(pathname)
    if (!guidance) return

    const immature = moduleIsImmature(pathname)

    const showGuidance = () => {
      // Double-check: don't show if user is actively interacting
      if (userActiveRef.current) {
        // Retry after another cycle
        idleTimerRef.current = setTimeout(showGuidance, IDLE_DELAY_MS)
        return
      }
      markSeen(key)
      setActiveToast({
        key,
        short: guidance.short,
        extended: guidance.extended,
        isImmature: immature,
      })
    }

    // First-time visit: show after a short idle delay so the page can settle
    idleTimerRef.current = setTimeout(showGuidance, IDLE_DELAY_MS)

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  return (
    <GuidanceContext.Provider value={{ activeToast, dismissToast }}>
      {children}
    </GuidanceContext.Provider>
  )
}
