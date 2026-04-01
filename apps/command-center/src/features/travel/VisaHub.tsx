import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, CheckCircle2, XCircle, FileText, Phone, Mail, MapPin, ExternalLink, Users, Globe } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface VisaInfo {
  country: string
  flag: string
  visaType: string
  maxStay: number
  requiresVisa: boolean
  processingDays: number
  cost: string
  applicationUrl: string
  requirements: string[]
  notes: string
  embassyAddress?: string
  embassyPhone?: string
  embassyEmail?: string
  urgentDeadline?: string
  type: 'work_trip' | 'business' | 'tourist'
}

interface TeamMember {
  id: string
  name: string
  firstName: string
  phone: string
  email: string
}

interface Trip {
  id: string
  destination: string
  date: string
  durationDays: number
  displayDate: string
}

type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

interface CalendarEvent {
  isInternational: boolean
  durationDays: number
  destination?: { country: string }
  participants?: string[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const VISA_REQUIREMENTS: Record<string, VisaInfo> = {
  Thailand: {
    country: 'Thailand',
    flag: '🇹🇭',
    visaType: 'Tourist Visa (TR) / DEST Visa',
    maxStay: 90,
    requiresVisa: true,
    processingDays: 15,
    cost: '2,000–5,000 SEK',
    applicationUrl: 'https://www.thaiembassy.se',
    requirements: [
      'Passport valid 6+ months beyond departure',
      'Passport photos (4x6cm, white background)',
      'Hotel/accommodation proof',
      'Return flight ticket',
      'Bank statement (min 20,000 THB equivalent)',
      'Travel insurance',
      'Application form (available at embassy)',
    ],
    notes:
      'Svenska passinnehavare kan få 30-dagars visumfrihet vid ankomst. För 90-dagars vistelse, ansök om Tourist Visa (TR-90) eller DEST Visa (Digital Nomad). Ansök minst 4 veckor före avresa.',
    embassyAddress: 'Lidingövägen 1, 115 25 Stockholm',
    embassyPhone: '+46 8 760 50 00',
    embassyEmail: 'visa@thaiembassy.se',
    urgentDeadline: '2026-03-17',
    type: 'work_trip',
  },
  UAE: {
    country: 'UAE',
    flag: '🇦🇪',
    visaType: 'Visa on Arrival / E-Visa',
    maxStay: 30,
    requiresVisa: false,
    processingDays: 0,
    cost: '0',
    requirements: ['Passport valid 6+ months'],
    notes:
      'Svenska passinnehavare får visum vid ankomst (30 dagar, kan förlängas). För arbete/bolagsregistrering krävs UAE business visa.',
    applicationUrl: 'https://icp.gov.ae',
    type: 'business',
  },
  Lithuania: {
    country: 'Lithuania',
    flag: '🇱🇹',
    visaType: 'Schengen (inget visum krävs)',
    maxStay: 90,
    requiresVisa: false,
    processingDays: 0,
    cost: '0',
    requirements: ['Giltigt EU/EES-pass eller nationellt ID'],
    notes:
      'Litauen är EU/Schengen. Svenska medborgare har full rörelsefrihet. Bolagsregistrering: UAB kräver lokal adress och eventuellt lokal styrelseledamot.',
    applicationUrl: '',
    type: 'business',
  },
  USA: {
    country: 'USA',
    flag: '🇺🇸',
    visaType: 'ESTA (Visa Waiver)',
    maxStay: 90,
    requiresVisa: false,
    processingDays: 3,
    cost: '21 USD',
    requirements: ['Giltigt svenskt pass', 'ESTA-godkännande', 'Returflygbiljett', 'Tillräckliga medel'],
    notes:
      'Svenska passinnehavare använder ESTA för turistbesök/affärsbesök upp till 90 dagar. Ansök om ESTA på esta.cbp.dhs.gov minst 72h före avresa.',
    applicationUrl: 'https://esta.cbp.dhs.gov',
    type: 'business',
  },
  Netherlands: {
    country: 'Netherlands',
    flag: '🇳🇱',
    visaType: 'Schengen (inget visum krävs)',
    maxStay: 90,
    requiresVisa: false,
    processingDays: 0,
    cost: '0',
    requirements: ['Giltigt EU/EES-pass'],
    notes: 'Nederländerna är EU/Schengen. Inget visum för svenska medborgare.',
    applicationUrl: '',
    type: 'business',
  },
}

const TEAM: TeamMember[] = [
  { id: 'erik',    name: 'Erik Svensson',          firstName: 'Erik',    phone: '+46709123223',  email: 'erik@hypbit.com' },
  { id: 'leon',    name: 'Leon Russo De Cerame',   firstName: 'Leon',    phone: '+46738968949',  email: 'leon@hypbit.com' },
  { id: 'dennis',  name: 'Dennis Bjarnemark',      firstName: 'Dennis',  phone: '+46761474243',  email: 'dennis@hypbit.com' },
  { id: 'winston', name: 'Winston Bjarnemark',     firstName: 'Winston', phone: '+46768123548',  email: 'winston@hypbit.com' },
  { id: 'johan',   name: 'Johan Berglund',         firstName: 'Johan',   phone: '+46736977576',  email: 'johan@hypbit.com' },
]

const ACTIVE_TRIPS: Trip[] = [
  { id: 'thailand-apr-2026', destination: 'Thailand', date: '2026-04-11', durationDays: 11, displayDate: '11 apr 2026' },
  { id: 'uae-planned',       destination: 'UAE',      date: '',           durationDays: 30, displayDate: 'Planerad' },
]

// ─── SMS helper ──────────────────────────────────────────────────────────────

async function sendVisaReminder(person: TeamMember, trip: Trip, visa: VisaInfo) {
  const API = import.meta.env.VITE_API_URL || 'https://api.wavult.com'
  try {
    await fetch(`${API}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: person.phone,
        from: 'Wavult',
        message: `Hej ${person.firstName}! Påminnelse: Ansök om visum till ${trip.destination} SNARAST. Deadline: ${visa.urgentDeadline ?? '—'}. Ambassaden: ${visa.embassyPhone ?? '—'}. Kontakta HR för hjälp.`,
      }),
    })
  } catch {
    // Fire-and-forget – SMS API may not be reachable from frontend
  }
}

// ─── Calendar auto-detect hook ───────────────────────────────────────────────

export function useVisaAutoDetect(event: CalendarEvent) {
  useEffect(() => {
    if (!event.isInternational || event.durationDays <= 7) return
    const country = event.destination?.country
    if (!country) return
    const req = VISA_REQUIREMENTS[country]
    if (!req?.requiresVisa) return

    // Persist detection in localStorage so VisaHub can pick it up
    const key = `wavult_visa_autodetect_${country.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify({ country, detectedAt: new Date().toISOString() }))

    // SMS each participant
    const participants = event.participants ?? TEAM.map(t => t.id)
    const membersToNotify = TEAM.filter(m => participants.includes(m.id))
    const trip: Trip = {
      id: `${country.toLowerCase()}-auto`,
      destination: country,
      date: '',
      durationDays: event.durationDays,
      displayDate: 'Auto-detekterad',
    }
    membersToNotify.forEach(m => sendVisaReminder(m, trip, req))
  }, [event])
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function statusLabel(s: ApplicationStatus): string {
  return { not_started: 'Ej påbörjad', in_progress: 'Pågår', submitted: 'Inlämnad', approved: 'Godkänd', rejected: 'Nekad' }[s]
}

function statusColor(s: ApplicationStatus): string {
  return {
    not_started: 'text-zinc-400',
    in_progress: 'text-yellow-400',
    submitted: 'text-blue-400',
    approved: 'text-emerald-400',
    rejected: 'text-red-400',
  }[s]
}

function statusBadgeBg(s: ApplicationStatus): string {
  return {
    not_started: 'bg-zinc-800 text-zinc-300',
    in_progress: 'bg-yellow-900/40 text-yellow-300',
    submitted: 'bg-blue-900/40 text-blue-300',
    approved: 'bg-emerald-900/40 text-emerald-300',
    rejected: 'bg-red-900/40 text-red-300',
  }[s]
}

const STATUS_ORDER: ApplicationStatus[] = ['not_started', 'in_progress', 'submitted', 'approved', 'rejected']

function localKey(tripId: string, personId: string) {
  return `wavult_visa_status_${tripId}_${personId}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function UrgentBanner({ trip, visa }: { trip: Trip; visa: VisaInfo }) {
  const days = daysUntil(trip.date)
  const deadlineDays = visa.urgentDeadline ? daysUntil(visa.urgentDeadline) : null
  const isOverdue = deadlineDays !== null && deadlineDays < 0

  return (
    <div className="rounded-xl border border-red-500/60 bg-red-950/40 px-5 py-4 flex items-start gap-3">
      <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={20} />
      <div>
        <p className="text-red-300 font-semibold text-sm">
          🚨 URGENT — {visa.flag} {trip.destination} ({trip.displayDate})
        </p>
        <p className="text-red-400/80 text-xs mt-1">
          {isOverdue
            ? `Visumdeadline passerades för ${Math.abs(deadlineDays!)} dagar sedan. Kontakta ambassaden omedelbart.`
            : `Visumdeadline om ${deadlineDays} dagar · Avresa om ${days} dagar · Handläggningstid: ${visa.processingDays} dagar.`}
        </p>
        <p className="text-red-400/60 text-xs mt-0.5">
          Ambassaden: {visa.embassyPhone} · {visa.embassyEmail}
        </p>
      </div>
    </div>
  )
}

function TripCard({
  trip,
  visa,
  selected,
  onClick,
}: {
  trip: Trip
  visa: VisaInfo
  selected: boolean
  onClick: () => void
}) {
  const days = trip.date ? daysUntil(trip.date) : null
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
        selected
          ? 'border-blue-600 bg-blue-900/20'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
      }`}
    >
      <div className="text-2xl mb-1">{visa.flag}</div>
      <div className="text-white font-semibold text-sm">{visa.country}</div>
      <div className="text-zinc-400 text-xs mt-0.5">{trip.displayDate}</div>
      <div className="text-zinc-400 text-xs">{trip.durationDays} dagar</div>
      {days !== null && (
        <div className={`text-xs mt-1 font-medium ${days < 14 ? 'text-red-400' : 'text-zinc-400'}`}>
          {days < 0 ? `${Math.abs(days)}d sedan` : `om ${days}d`}
        </div>
      )}
      <div className="mt-2 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 leading-tight">
        {visa.requiresVisa ? visa.visaType : 'Inget visum krävs'}
      </div>
    </button>
  )
}

function TeamStatusRow({
  member,
  tripId,
  onSendReminder,
  trip,
  visa,
}: {
  member: TeamMember
  tripId: string
  onSendReminder: (m: TeamMember) => void
  trip: Trip
  visa: VisaInfo
}) {
  const key = localKey(tripId, member.id)
  const saved = localStorage.getItem(key) as ApplicationStatus | null
  const [status, setStatus] = useState<ApplicationStatus>(saved ?? 'not_started')

  function cycle() {
    const idx = STATUS_ORDER.indexOf(status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    setStatus(next)
    localStorage.setItem(key, next)
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
          {member.firstName[0]}
        </div>
        <div>
          <p className="text-sm text-white">{member.name}</p>
          <p className="text-xs text-zinc-500">{member.phone}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={cycle}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${statusBadgeBg(status)}`}
          title="Klicka för att byta status"
        >
          {statusLabel(status)}
        </button>
        {status === 'not_started' && (
          <a
            href={visa.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Starta ansökan
          </a>
        )}
        <button
          onClick={() => onSendReminder(member)}
          className="text-xs px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          title="Skicka SMS-påminnelse"
        >
          SMS
        </button>
      </div>
    </div>
  )
}

function RequirementsChecklist({ requirements }: { requirements: string[] }) {
  const saved = JSON.parse(localStorage.getItem('wavult_visa_checklist') ?? '{}')
  const [checked, setChecked] = useState<Record<string, boolean>>(saved)

  function toggle(item: string) {
    const next = { ...checked, [item]: !checked[item] }
    setChecked(next)
    localStorage.setItem('wavult_visa_checklist', JSON.stringify(next))
  }

  return (
    <div className="space-y-2">
      {requirements.map(req => (
        <label
          key={req}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div
            className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
              checked[req] ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 group-hover:border-zinc-400'
            }`}
            onClick={() => toggle(req)}
          >
            {checked[req] && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span
            className={`text-sm transition-colors ${checked[req] ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}
            onClick={() => toggle(req)}
          >
            {req}
          </span>
        </label>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VisaHub() {
  const [selectedTrip, setSelectedTrip] = useState<Trip>(ACTIVE_TRIPS[0])
  const [smsSent, setSmsSent] = useState<Record<string, boolean>>({})
  const [smsAllSent, setSmsAllSent] = useState(false)

  const visa = VISA_REQUIREMENTS[selectedTrip.destination]

  // Urgent trip detection
  const urgentTrips = ACTIVE_TRIPS.filter(t => {
    if (!t.date) return false
    const v = VISA_REQUIREMENTS[t.destination]
    if (!v?.requiresVisa) return false
    const days = daysUntil(t.date)
    return days < v.processingDays + 7 // Less than processing time + 1 week buffer
  })

  async function handleSendReminder(member: TeamMember) {
    if (!visa) return
    await sendVisaReminder(member, selectedTrip, visa)
    setSmsSent(prev => ({ ...prev, [member.id]: true }))
  }

  async function handleSendAllReminders() {
    if (!visa) return
    for (const member of TEAM) {
      await sendVisaReminder(member, selectedTrip, visa)
    }
    setSmsAllSent(true)
    setTimeout(() => setSmsAllSent(false), 3000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🛂 Visum & Arbetstillstånd
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Automatiserad visumhantering för Wavult Group · Svenska passinnehavare
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Globe size={14} />
            <span>5 teammedlemmar</span>
          </div>
        </div>

        {/* Urgent banners */}
        {urgentTrips.map(t => (
          <UrgentBanner key={t.id} trip={t} visa={VISA_REQUIREMENTS[t.destination]} />
        ))}

        {/* Active trips */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Aktiva resor</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ACTIVE_TRIPS.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                visa={VISA_REQUIREMENTS[trip.destination]}
                selected={selectedTrip.id === trip.id}
                onClick={() => setSelectedTrip(trip)}
              />
            ))}
          </div>
        </div>

        {visa && (
          <>
            {/* Visa info card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{visa.flag} {visa.country} — {visa.visaType}</div>
                  <div className="text-zinc-400 text-sm mt-0.5">
                    Max {visa.maxStay} dagar · Handläggningstid {visa.processingDays} dagar · Kostnad: {visa.cost}
                  </div>
                </div>
                {visa.requiresVisa ? (
                  <span className="bg-red-900/40 text-red-300 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">Visum krävs</span>
                ) : (
                  <span className="bg-emerald-900/40 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">Inget visum</span>
                )}
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{visa.notes}</p>
              {visa.embassyAddress && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <MapPin size={12} className="text-zinc-500" />
                    {visa.embassyAddress}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Phone size={12} className="text-zinc-500" />
                    <a href={`tel:${visa.embassyPhone}`} className="hover:text-white transition-colors">{visa.embassyPhone}</a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Mail size={12} className="text-zinc-500" />
                    <a href={`mailto:${visa.embassyEmail}`} className="hover:text-white transition-colors">{visa.embassyEmail}</a>
                  </div>
                </div>
              )}
            </div>

            {/* Team status */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users size={16} className="text-zinc-400" />
                  Teamstatus — {visa.flag} {visa.country}
                </h2>
                <button
                  onClick={handleSendAllReminders}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    smsAllSent
                      ? 'bg-emerald-800 text-emerald-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {smsAllSent ? '✓ SMS skickade' : 'Skicka SMS till alla'}
                </button>
              </div>
              <div>
                {TEAM.map(member => (
                  <TeamStatusRow
                    key={member.id}
                    member={member}
                    tripId={selectedTrip.id}
                    onSendReminder={handleSendReminder}
                    trip={selectedTrip}
                    visa={visa}
                  />
                ))}
              </div>
            </div>

            {/* Requirements checklist */}
            {visa.requirements.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-zinc-400" />
                  Krav & dokument
                </h2>
                <RequirementsChecklist requirements={visa.requirements} />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {visa.applicationUrl && (
                <a
                  href={visa.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink size={15} />
                  {visa.requiresVisa ? 'Starta visumansökan' : 'Mer information'}
                </a>
              )}
              {visa.embassyPhone && (
                <a
                  href={`tel:${visa.embassyPhone}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
                >
                  <Phone size={15} />
                  Ring ambassaden
                </a>
              )}
              {visa.urgentDeadline && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm">
                  <Clock size={15} />
                  Deadline: {visa.urgentDeadline}
                </div>
              )}
            </div>
          </>
        )}

        {/* Auto-detect info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500 flex items-center gap-2">
            <CheckCircle2 size={12} className="text-blue-600" />
            Kalenderintegration aktiv — resor &gt;7 dagar utomlands triggar automatisk visumkontroll och SMS-påminnelse till teamet.
          </p>
        </div>

      </div>
    </div>
  )
}
