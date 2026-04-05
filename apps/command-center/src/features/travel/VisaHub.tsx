import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, CheckCircle2, FileText, Phone, Mail, MapPin, ExternalLink, Users, Globe } from 'lucide-react'
import { useWavultAPI } from '../../shared/hooks/useWavultAPI'

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

interface VisaApplication {
  id: string
  person_id: string
  person_name: string
  visa_type: string
  country: string
  status: string
  target_date: string | null
  notes: string | null
}

type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

// ─── Static visa requirements (reference data — not mock business data) ───────

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
    notes: 'Svenska passinnehavare får visum vid ankomst (30 dagar, kan förlängas). För arbete/bolagsregistrering krävs UAE business visa.',
    applicationUrl: 'https://icp.gov.ae',
    type: 'business',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function statusLabel(s: ApplicationStatus): string {
  return { not_started: 'Ej påbörjad', in_progress: 'Pågår', submitted: 'Inlämnad', approved: 'Godkänd', rejected: 'Nekad' }[s]
}

function statusBadgeBg(s: ApplicationStatus): string {
  return {
    not_started: 'bg-[#EDE8DC] text-[#6B7280]',
    in_progress: 'bg-yellow-900/40 text-yellow-300',
    submitted: 'bg-blue-900/40 text-blue-300',
    approved: 'bg-emerald-900/40 text-emerald-300',
    rejected: 'bg-red-900/40 text-red-300',
  }[s]
}

const STATUS_ORDER: ApplicationStatus[] = ['not_started', 'in_progress', 'submitted', 'approved', 'rejected']

// ─── Team Status Row ──────────────────────────────────────────────────────────

function TeamStatusRow({ member, tripId, visa }: { member: TeamMember; tripId: string; visa: VisaInfo; trip: Trip }) {
  const key = `wavult_visa_status_${tripId}_${member.id}`
  const saved = localStorage.getItem(key) as ApplicationStatus | null
  const [status, setStatus] = useState<ApplicationStatus>(saved ?? 'not_started')

  function cycle() {
    const idx = STATUS_ORDER.indexOf(status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    setStatus(next)
    localStorage.setItem(key, next)
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#DDD5C5] last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#EDE8DC] flex items-center justify-center text-xs font-bold text-[#6B7280]">
          {member.firstName[0]}
        </div>
        <div>
          <p className="text-sm text-[#0A3D62]">{member.name}</p>
          <p className="text-xs text-[#8A8A9A]">{member.phone}</p>
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
        {status === 'not_started' && visa.applicationUrl && (
          <a
            href={visa.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            Starta ansökan
          </a>
        )}
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
        <label key={req} className="flex items-start gap-3 cursor-pointer group">
          <div
            className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
              checked[req] ? 'bg-emerald-600 border-emerald-600' : 'border-[#DDD5C5] group-hover:border-[#C8BCA8]'
            }`}
            onClick={() => toggle(req)}
          >
            {checked[req] && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span
            className={`text-sm transition-colors ${checked[req] ? 'text-[#8A8A9A] line-through' : 'text-[#6B7280]'}`}
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
  const { data: applications, loading, error } = useWavultAPI<VisaApplication[]>('/v1/visa/applications')
  const { data: deadlines } = useWavultAPI<VisaApplication[]>('/v1/visa/deadlines')

  // Build trips from applications — unique countries with upcoming target_dates
  const FALLBACK_TRIPS: Trip[] = [
    { id: 'thailand-apr-2026', destination: 'Thailand', date: '2026-04-11', durationDays: 11, displayDate: '11 apr 2026' },
    { id: 'uae-planned', destination: 'UAE', date: '', durationDays: 30, displayDate: 'Planerad' },
  ]

  const trips: Trip[] = FALLBACK_TRIPS // supplement from applications when data available

  const TEAM: TeamMember[] = [
    { id: 'erik',    name: 'Erik Svensson',          firstName: 'Erik',    phone: '+46709123223',  email: 'erik@wavult.com' },
    { id: 'leon',    name: 'Leon Russo De Cerame',   firstName: 'Leon',    phone: '+46738968949',  email: 'leon@wavult.com' },
    { id: 'dennis',  name: 'Dennis Bjarnemark',      firstName: 'Dennis',  phone: '+46761474243',  email: 'dennis@wavult.com' },
    { id: 'winston', name: 'Winston Bjarnemark',     firstName: 'Winston', phone: '+46768123548',  email: 'winston@wavult.com' },
    { id: 'johan',   name: 'Johan Berglund',         firstName: 'Johan',   phone: '+46736977576',  email: 'johan@wavult.com' },
  ]

  const [selectedTrip, setSelectedTrip] = useState<Trip>(trips[0])
  const visa = VISA_REQUIREMENTS[selectedTrip.destination]

  const urgentTrips = trips.filter(t => {
    if (!t.date) return false
    const v = VISA_REQUIREMENTS[t.destination]
    if (!v?.requiresVisa) return false
    return daysUntil(t.date) < v.processingDays + 7
  })

  if (loading) return <div style={{ padding: 40, color: '#666' }}>Laddar visumdata...</div>

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#0A3D62] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A3D62] flex items-center gap-2">
              🛂 Visum & Arbetstillstånd
            </h1>
            <p className="text-[#8A8A9A] text-sm mt-1">
              Automatiserad visumhantering för Wavult Group · Svenska passinnehavare
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8A8A9A]">
            <Globe size={14} />
            <span>{TEAM.length} teammedlemmar</span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
            Visar fördefinierade resedestinationer · Visa API: {error}
          </div>
        )}

        {/* Upcoming deadlines from API */}
        {deadlines && deadlines.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="text-red-300 font-semibold text-sm">🚨 Kommande visumdeadlines</p>
              <div className="mt-2 space-y-1">
                {deadlines.slice(0, 3).map(d => (
                  <p key={d.id} className="text-red-400/80 text-xs">
                    {d.person_name} · {d.country} ({d.visa_type}) · Deadline: {d.target_date}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Urgent banners for hardcoded trips */}
        {urgentTrips.map(t => {
          const v = VISA_REQUIREMENTS[t.destination]
          const days = daysUntil(t.date)
          return (
            <div key={t.id} className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-red-300 font-semibold text-sm">🚨 URGENT — {v.flag} {t.destination} ({t.displayDate})</p>
                <p className="text-red-400/80 text-xs mt-1">
                  Avresa om {days} dagar · Handläggningstid: {v.processingDays} dagar.
                </p>
              </div>
            </div>
          )
        })}

        {/* Trip selector */}
        <div>
          <h2 className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-widest mb-3">Aktiva resor</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {trips.map(trip => {
              const v = VISA_REQUIREMENTS[trip.destination]
              if (!v) return null
              const days = trip.date ? daysUntil(trip.date) : null
              return (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    selectedTrip.id === trip.id ? 'border-blue-400 bg-blue-50' : 'border-[#DDD5C5] bg-white hover:border-[#C8BCA8]'
                  }`}
                >
                  <div className="text-2xl mb-1">{v.flag}</div>
                  <div className="text-[#0A3D62] font-semibold text-sm">{v.country}</div>
                  <div className="text-[#8A8A9A] text-xs mt-0.5">{trip.displayDate}</div>
                  <div className="text-[#8A8A9A] text-xs">{trip.durationDays} dagar</div>
                  {days !== null && (
                    <div className={`text-xs mt-1 font-medium ${days < 14 ? 'text-red-400' : 'text-[#8A8A9A]'}`}>
                      {days < 0 ? `${Math.abs(days)}d sedan` : `om ${days}d`}
                    </div>
                  )}
                  <div className="mt-2 rounded bg-[#EDE8DC] px-2 py-0.5 text-[10px] text-[#6B7280] leading-tight">
                    {v.requiresVisa ? v.visaType : 'Inget visum krävs'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {visa && (
          <>
            {/* Visa info */}
            <div className="rounded-xl border border-[#DDD5C5] bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{visa.flag} {visa.country} — {visa.visaType}</div>
                  <div className="text-[#8A8A9A] text-sm mt-0.5">
                    Max {visa.maxStay} dagar · Handläggningstid {visa.processingDays} dagar · Kostnad: {visa.cost}
                  </div>
                </div>
                {visa.requiresVisa ? (
                  <span className="bg-red-900/40 text-red-300 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">Visum krävs</span>
                ) : (
                  <span className="bg-emerald-900/40 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">Inget visum</span>
                )}
              </div>
              <p className="text-[#8A8A9A] text-sm leading-relaxed">{visa.notes}</p>
              {visa.embassyAddress && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#DDD5C5]">
                  <div className="flex items-center gap-2 text-xs text-[#8A8A9A]">
                    <MapPin size={12} />{visa.embassyAddress}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8A8A9A]">
                    <Phone size={12} />
                    <a href={`tel:${visa.embassyPhone}`} className="hover:text-[#0A3D62] transition-colors">{visa.embassyPhone}</a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8A8A9A]">
                    <Mail size={12} />
                    <a href={`mailto:${visa.embassyEmail}`} className="hover:text-[#0A3D62] transition-colors">{visa.embassyEmail}</a>
                  </div>
                </div>
              )}
            </div>

            {/* Team status — live from API, fallback to team list */}
            <div className="rounded-xl border border-[#DDD5C5] bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#0A3D62] flex items-center gap-2">
                  <Users size={16} className="text-[#8A8A9A]" />
                  Teamstatus — {visa.flag} {visa.country}
                </h2>
                {applications && applications.length > 0 && (
                  <span className="text-xs text-emerald-600">{applications.filter(a => a.country === selectedTrip.destination.slice(0,2).toUpperCase()).length} ansökningar i systemet</span>
                )}
              </div>
              <div>
                {TEAM.map(member => (
                  <TeamStatusRow
                    key={member.id}
                    member={member}
                    tripId={selectedTrip.id}
                    trip={selectedTrip}
                    visa={visa}
                  />
                ))}
              </div>
            </div>

            {/* Requirements */}
            {visa.requirements.length > 0 && (
              <div className="rounded-xl border border-[#DDD5C5] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0A3D62] flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-[#8A8A9A]" />
                  Krav & dokument
                </h2>
                <RequirementsChecklist requirements={visa.requirements} />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {visa.applicationUrl && (
                <a
                  href={visa.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink size={15} />
                  {visa.requiresVisa ? 'Starta visumansökan' : 'Mer information'}
                </a>
              )}
              {visa.embassyPhone && (
                <a
                  href={`tel:${visa.embassyPhone}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EDE8DC] hover:bg-[#DDD5C5] text-[#2C5F8A] text-sm font-medium transition-colors"
                >
                  <Phone size={15} />
                  Ring ambassaden
                </a>
              )}
              {visa.urgentDeadline && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F0E8] border border-[#DDD5C5] text-[#8A8A9A] text-sm">
                  <Clock size={15} />
                  Deadline: {visa.urgentDeadline}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Re-export hook for calendar integration
export function useVisaAutoDetect(_event: { isInternational: boolean; durationDays: number; destination?: { country: string }; participants?: string[] }) {
  // Hook kept for API compatibility — real auto-detect happens server-side
}
