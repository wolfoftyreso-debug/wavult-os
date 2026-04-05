// ─── TravelAutomationHub — Wavult OS ────────────────────────────────────────
// Fullständig resebokning & statushantering för gruppresor
// Byggd för Thailand Workcamp April–Maj 2026

import { useState, useEffect, useCallback } from 'react'
import {
  Plane, MapPin, Hotel, Car, Shield, FileText, Dumbbell,
  Users, CheckCircle2, AlertCircle, Clock, Plus, RefreshCw,
  MessageSquare, ClipboardList, ChevronDown, ChevronUp,
  ExternalLink, Zap, Info
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'processing' | 'confirmed' | 'issue'

interface TripStep {
  status: StepStatus
  note: string
}

interface Trip {
  id: string
  name: string
  destination: string
  flag: string
  departure: string
  return: string
  durationDays: number
  participants: string[]
  overallStatus: StepStatus
  steps: {
    visa: TripStep
    flights: TripStep
    accommodation: TripStep
    transport: TripStep
    wellness: TripStep
    insurance: TripStep
    documents: TripStep
  }
}

interface ParticipantDocs {
  pass: boolean | null
  insurance: boolean | null
  hotelConfirmation: boolean | null
  visa: boolean | null
  simCard: boolean | null
}

const API = 'https://api.wavult.com'

// ─── Pre-populated Thailand trip ─────────────────────────────────────────────

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'thailand-2026-04',
    name: 'Bangkok Workcamp',
    destination: 'Bangkok, Thailand',
    flag: '🇹🇭',
    departure: '2026-04-11',
    return: '2026-05-11',
    durationDays: 30,
    participants: ['Erik Svensson', 'Tiffany Molly Catarina Svensson', 'Dennis Bjarnemark', 'Winston Bjarnemark', 'Johan Berglund'],
    overallStatus: 'processing',
    steps: {
      visa: {
        status: 'issue',
        note: 'Kontrollera — 30 dagar visumfritt på SWE pass. >30 dagar kräver TR-90.',
      },
      flights: {
        status: 'pending',
        note: 'ARN → BKK — söker via Duffel',
      },
      accommodation: {
        status: 'confirmed',
        note: 'Nysa Hotel Bangkok, Sukhumvit 13. Kontakt: Arthur',
      },
      transport: {
        status: 'pending',
        note: 'Uber/Grab — bokas vid flyg-bekräftelse',
      },
      wellness: {
        status: 'pending',
        note: 'Fitness First Bangkok — 30-dagars access',
      },
      insurance: {
        status: 'pending',
        note: 'Verifiera Eurocard/Hedvig täckning',
      },
      documents: {
        status: 'pending',
        note: 'Pass, försäkring, hotellbekräftelse, SIM',
      },
    },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStorageKey(tripId: string, participant: string) {
  return `wavult_travel_docs_${tripId}_${participant.replace(/\s+/g, '_')}`
}

function loadDocs(tripId: string, participant: string): ParticipantDocs {
  try {
    const raw = localStorage.getItem(getStorageKey(tripId, participant))
    if (raw) return JSON.parse(raw)
  } catch {}
  return { pass: null, insurance: null, hotelConfirmation: null, visa: null, simCard: null }
}

function saveDocs(tripId: string, participant: string, docs: ParticipantDocs) {
  try {
    localStorage.setItem(getStorageKey(tripId, participant), JSON.stringify(docs))
  } catch {}
}

// ─── n8n webhook trigger ──────────────────────────────────────────────────────

const triggerAutomation = async (tripId: string, step: string) => {
  await fetch(`${API}/n8n/webhook/travel-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripId, step, action: 'start', timestamp: new Date().toISOString() }),
  }).catch(() => {}) // Fire and forget — n8n handles async
}

// ─── StatusIcon ───────────────────────────────────────────────────────────────

function StatusIcon({ status, size = 16 }: { status: StepStatus; size?: number }) {
  if (status === 'confirmed')  return <CheckCircle2 size={size} style={{ color: '#22c55e' }} />
  if (status === 'issue')      return <AlertCircle size={size} style={{ color: '#ef4444' }} />
  if (status === 'processing') return <Clock size={size} style={{ color: '#eab308' }} />
  return <Clock size={size} style={{ color: '#8A8A9A' }} />
}

function statusColor(status: StepStatus): string {
  if (status === 'confirmed')  return '#22c55e'
  if (status === 'issue')      return '#ef4444'
  if (status === 'processing') return '#eab308'
  return '#8A8A9A'
}

function statusLabel(status: StepStatus): string {
  if (status === 'confirmed')  return 'Klar'
  if (status === 'issue')      return 'Åtgärda'
  if (status === 'processing') return 'Handläggs...'
  return 'Väntar'
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: Array<{
  key: keyof Trip['steps']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  label: string
  actionLabel: string
}> = [
  { key: 'visa',          icon: FileText,  label: '🛂 Visum',     actionLabel: 'Åtgärda' },
  { key: 'flights',       icon: Plane,     label: '✈️ Flyg',      actionLabel: 'Sök flyg' },
  { key: 'accommodation', icon: Hotel,     label: '🏨 Boende',    actionLabel: 'Boka' },
  { key: 'transport',     icon: Car,       label: '🚗 Transport', actionLabel: 'Boka Uber' },
  { key: 'wellness',      icon: Dumbbell,  label: '🏋️ Gym',       actionLabel: 'Hitta gym' },
  { key: 'insurance',     icon: Shield,    label: '🛡️ Försäkring', actionLabel: 'Verifiera' },
  { key: 'documents',     icon: ClipboardList, label: '📄 Dokument', actionLabel: 'Ladda upp' },
]

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({
  stepKey, step, onAction,
}: {
  stepKey: keyof Trip['steps']
  step: TripStep
  onAction: () => void
}) {
  const def = STEPS.find(s => s.key === stepKey)!
  const isIssue = step.status === 'issue'
  const isProcessing = step.status === 'processing'
  const isConfirmed = step.status === 'confirmed'

  const borderColor = isIssue ? '#ef444433' : isConfirmed ? '#22c55e33' : isProcessing ? '#eab30833' : '#ffffff10'
  const bgColor = isIssue ? '#fff1f2' : isConfirmed ? '#f0fdf4' : isProcessing ? '#fffbeb' : '#FFFFFF'

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 120,
      position: 'relative',
      animation: isIssue ? 'pulse-border 2s infinite' : undefined,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A3D62' }}>{def.label}</span>
        <StatusIcon status={step.status} size={15} />
      </div>

      {/* Status badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        background: `${statusColor(step.status)}22`,
        color: statusColor(step.status),
        fontSize: 11,
        fontWeight: 600,
        width: 'fit-content',
      }}>
        {isProcessing && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#eab308', animation: 'spin 1.5s linear infinite' }} />}
        {statusLabel(step.status).toUpperCase()}
      </div>

      {/* Note */}
      <p style={{ fontSize: 11, color: '#8A8A9A', margin: 0, lineHeight: 1.5, flex: 1 }}>{step.note}</p>

      {/* Action button */}
      <button
        onClick={onAction}
        disabled={isProcessing || isConfirmed}
        style={{
          marginTop: 'auto',
          padding: '6px 10px',
          borderRadius: 6,
          border: 'none',
          background: isIssue ? '#ef4444' : isConfirmed ? '#22c55e22' : '#2563eb',
          color: isConfirmed ? '#22c55e' : '#fff',
          fontSize: 11,
          fontWeight: 600,
          cursor: isProcessing || isConfirmed ? 'default' : 'pointer',
          opacity: isConfirmed ? 0.7 : 1,
          animation: isIssue ? 'pulse-btn 2s infinite' : undefined,
          transition: 'opacity 0.15s',
        }}
      >
        {isConfirmed ? '✅ Klar' : isProcessing ? '🟡 Handläggs...' : def.actionLabel}
      </button>
    </div>
  )
}

// ─── IntegrationStatus ────────────────────────────────────────────────────────

function IntegrationStatus() {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
        API-integrationer
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {[
          {
            name: '✈️ Duffel (Flyg)',
            status: 'unconfigured',
            message: 'API-nyckel saknas — konfigurera i inställningar',
            action: { label: 'duffel.com', href: 'https://duffel.com' },
          },
          {
            name: '🚗 Uber Business',
            status: 'unconfigured',
            message: 'Anslut Uber Business-konto',
            action: { label: 'Anslut', href: 'https://business.uber.com' },
          },
          {
            name: '🏠 Airbnb for Work',
            status: 'unconfigured',
            message: 'Ej konfigurerad — kontakta Airbnb for Work',
            action: null,
          },
          {
            name: '🏋️ Gympass / ClassPass',
            status: 'unconfigured',
            message: 'Välj gym-leverantör',
            action: { label: 'Konfigurera', href: 'https://gympass.com' },
          },
          {
            name: '🛡️ Försäkring',
            status: 'partial',
            message: 'Verifiera befintlig täckning (Eurocard / Hedvig)',
            action: { label: 'Öppna Hedvig', href: 'https://hedvig.com' },
          },
        ].map(i => (
          <div key={i.name} style={{
            background: '#FFFFFF',
            border: '1px solid #DDD5C5',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0A3D62' }}>{i.name}</span>
            <span style={{ fontSize: 11, color: '#8A8A9A' }}>{i.message}</span>
            {i.action && (
              <a href={i.action.href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                {i.action.label} <ExternalLink size={10} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ParticipantRow ───────────────────────────────────────────────────────────

function ParticipantRow({
  name, tripId, flightStatus, visaStatus,
}: {
  name: string
  tripId: string
  flightStatus: StepStatus
  visaStatus: StepStatus
}) {
  const [expanded, setExpanded] = useState(false)
  const [docs, setDocs] = useState<ParticipantDocs>(() => loadDocs(tripId, name))

  function toggle(key: keyof ParticipantDocs) {
    const next = { ...docs, [key]: !docs[key] }
    setDocs(next)
    saveDocs(tripId, name, next)
  }

  const DOC_ITEMS: Array<{ key: keyof ParticipantDocs; label: string }> = [
    { key: 'pass',             label: 'Pass' },
    { key: 'insurance',        label: 'Reseförsäkring' },
    { key: 'hotelConfirmation', label: 'Hotellbekräftelse' },
    { key: 'visa',             label: 'Visum / ESTA' },
    { key: 'simCard',          label: 'SIM-kort' },
  ]

  return (
    <div style={{ borderBottom: '1px solid #DDD5C5' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, color: '#0A3D62', flex: 1 }}>{name}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#8A8A9A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusIcon status={flightStatus} size={12} /> Flyg
          </span>
          <span style={{ fontSize: 11, color: '#8A8A9A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusIcon status={visaStatus} size={12} /> Visum
          </span>
          <span style={{ fontSize: 11, color: '#8A8A9A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusIcon status={docs.pass ? 'confirmed' : 'pending'} size={12} /> Dok
          </span>
        </div>
        {expanded ? <ChevronUp size={14} color="#8A8A9A" /> : <ChevronDown size={14} color="#8A8A9A" />}
      </div>

      {expanded && (
        <div style={{ padding: '8px 0 14px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DOC_ITEMS.map(item => (
            <label key={item.key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 12,
              color: docs[item.key] ? '#22c55e' : '#8A8A9A',
              background: docs[item.key] ? '#f0fdf4' : '#FFFFFF',
              border: `1px solid ${docs[item.key] ? '#22c55e44' : '#222'}`,
              padding: '4px 10px',
              borderRadius: 6,
            }}>
              <input
                type="checkbox"
                checked={docs[item.key] === true}
                onChange={() => toggle(item.key)}
                style={{ accentColor: '#22c55e' }}
              />
              {item.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TripCard ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onUpdate }: { trip: Trip; onUpdate: (t: Trip) => void }) {
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<string | null>(null)
  const [showIntegrations, setShowIntegrations] = useState(false)

  const completedSteps = Object.values(trip.steps).filter(s => s.status === 'confirmed').length
  const totalSteps = Object.keys(trip.steps).length
  const nextPending = STEPS.find(s => trip.steps[s.key].status === 'pending' || trip.steps[s.key].status === 'issue')

  const handleStepAction = useCallback(async (key: keyof Trip['steps']) => {
    const current = trip.steps[key].status
    if (current === 'confirmed') return

    // Öppna rätt extern tjänst direkt
    const externalLinks: Record<string, string> = {
      flights:       `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyMDI2LTA0LTExagwIAxIIL20vMGQ5anJyBggDEgJUSA`,
      transport:     'https://m.uber.com/ul/',
      wellness:      'https://gympass.com',
      insurance:     'https://hedvig.com',
      documents:     '',  // öppnar upload-dialog lokalt
      visa:          `https://www.migrationsverket.se/Privatpersoner/Resa-till-Sverige/Visering.html`,
      accommodation: 'https://www.booking.com',
    }

    const url = externalLinks[key as string]
    if (url) window.open(url, '_blank')

    // Sätt till processing och trigga automation
    const updated: Trip = {
      ...trip,
      steps: {
        ...trip.steps,
        [key]: { ...trip.steps[key], status: 'processing' as StepStatus },
      },
    }
    onUpdate(updated)
    triggerAutomation(trip.id, key)
  }, [trip, onUpdate])

  const handleSMS = async () => {
    setSmsSending(true)
    setSmsResult(null)
    const message =
      `✅ RESEUPPDATERING — ${trip.name}\n` +
      `${completedSteps} av ${totalSteps} steg klara.\n` +
      `Nästa: ${nextPending?.label ?? 'Alla klara!'}\n` +
      `Status: ${trip.overallStatus === 'confirmed' ? 'Klar' : trip.overallStatus === 'issue' ? 'Åtgärd krävs' : 'Pågår'}\n` +
      `/Wavult OS`

    try {
      const res = await fetch(`${API}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: trip.participants,
          message,
          tripId: trip.id,
        }),
      })
      if (res.ok) {
        setSmsResult('✅ SMS skickat till alla deltagare')
      } else {
        setSmsResult('⚠️ SMS-sändning misslyckades')
      }
    } catch {
      setSmsResult('⚠️ Kunde inte nå SMS-tjänsten')
    } finally {
      setSmsSending(false)
      setTimeout(() => setSmsResult(null), 4000)
    }
  }

  const handleRefresh = () => {
    // Re-trigger overall status assessment
    triggerAutomation(trip.id, 'status_check')
  }

  const overallColors: Record<StepStatus, string> = {
    pending: '#8A8A9A',
    processing: '#eab308',
    confirmed: '#22c55e',
    issue: '#ef4444',
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #DDD5C5',
      borderRadius: 14,
      padding: 24,
      marginBottom: 24,
    }}>
      {/* Trip header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{trip.flag}</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0A3D62' }}>{trip.name}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#8A8A9A' }}>
              {formatDate(trip.departure)} – {formatDate(trip.return)}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#60a5fa',
              background: '#1e3a5f',
              padding: '2px 8px',
              borderRadius: 20,
            }}>
              {trip.durationDays} dagar
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            background: `${overallColors[trip.overallStatus]}22`,
            color: overallColors[trip.overallStatus],
            fontSize: 12,
            fontWeight: 700,
          }}>
            <StatusIcon status={trip.overallStatus} size={13} />
            {trip.overallStatus === 'processing' ? 'HANDLÄGGS' :
             trip.overallStatus === 'confirmed' ? 'BEKRÄFTAD' :
             trip.overallStatus === 'issue' ? 'ÅTGÄRD KRÄVS' : 'VÄNTAR'}
          </div>
          <div style={{ fontSize: 11, color: '#8A8A9A', marginTop: 4 }}>
            <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
            {trip.participants.length} deltagare
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Bokningssteg
          </span>
          <span style={{ fontSize: 11, color: '#8A8A9A' }}>{completedSteps}/{totalSteps} klara</span>
        </div>
        <div style={{ height: 4, background: '#DDD5C5', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${(completedSteps / totalSteps) * 100}%`,
            background: '#22c55e',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Step grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {STEPS.map(({ key }) => (
          <StepCard
            key={key}
            stepKey={key}
            step={trip.steps[key]}
            onAction={() => handleStepAction(key)}
          />
        ))}
      </div>

      {/* Participants */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Deltagare
        </h3>
        {trip.participants.map(name => (
          <ParticipantRow
            key={name}
            name={name}
            tripId={trip.id}
            flightStatus={trip.steps.flights.status}
            visaStatus={trip.steps.visa.status}
          />
        ))}
      </div>

      {/* Integrations toggle */}
      <button
        onClick={() => setShowIntegrations(s => !s)}
        style={{
          background: 'none',
          border: '1px solid #DDD5C5',
          borderRadius: 8,
          color: '#8A8A9A',
          fontSize: 12,
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: showIntegrations ? 0 : 20,
        }}
      >
        <Zap size={12} />
        API-integrationer
        {showIntegrations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showIntegrations && <IntegrationStatus />}

      {/* Actions footer */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleSMS}
          disabled={smsSending}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#1e3a5f',
            color: '#93c5fd',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MessageSquare size={14} />
          {smsSending ? 'Skickar...' : '📱 SMS till alla'}
        </button>

        <button
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #DDD5C5',
            background: 'transparent',
            color: '#8A8A9A',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={14} />
          Uppdatera status
        </button>

        <button
          onClick={() => triggerAutomation(trip.id, 'generate_report')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #DDD5C5',
            background: 'transparent',
            color: '#8A8A9A',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ClipboardList size={14} />
          Rapport
        </button>

        {smsResult && (
          <span style={{
            fontSize: 12,
            color: smsResult.startsWith('✅') ? '#22c55e' : '#f59e0b',
            padding: '6px 12px',
            background: smsResult.startsWith('✅') ? '#f0fdf4' : '#fffbeb',
            borderRadius: 6,
          }}>
            {smsResult}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── TravelAutomationHub ──────────────────────────────────────────────────────

export function TravelAutomationHub() {
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS)
  const [usingFallback, setUsingFallback] = useState(false)
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [newTrip, setNewTrip] = useState({
    name: '',
    destination: '',
    flag: '✈️',
    departure: '',
    return: '',
    participants: 'Erik Svensson, Leon Russo De Cemare, Dennis Bjarnemark, Winston Bjarnemark, Johan Berglund',
  })

  function handleCreateTrip() {
    if (!newTrip.name || !newTrip.destination || !newTrip.departure || !newTrip.return) return
    const dep = new Date(newTrip.departure)
    const ret = new Date(newTrip.return)
    const durationDays = Math.round((ret.getTime() - dep.getTime()) / 86400000)
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      name: newTrip.name,
      destination: newTrip.destination,
      flag: newTrip.flag,
      departure: newTrip.departure,
      return: newTrip.return,
      durationDays,
      participants: newTrip.participants.split(',').map(p => p.trim()).filter(Boolean),
      overallStatus: 'pending',
      steps: {
        visa:          { status: 'pending', note: 'Kontrollera visumkrav för ' + newTrip.destination },
        flights:       { status: 'pending', note: 'Sök flyg till ' + newTrip.destination },
        accommodation: { status: 'pending', note: 'Boka boende' },
        transport:     { status: 'pending', note: 'Lokal transport' },
        wellness:      { status: 'pending', note: 'Gym / träning' },
        insurance:     { status: 'pending', note: 'Reseförsäkring' },
        documents:     { status: 'pending', note: 'Pass, försäkring, hotellbokningsbevis' },
      },
    }
    setTrips(prev => [trip, ...prev])
    setShowNewTrip(false)
    setNewTrip({ name: '', destination: '', flag: '✈️', departure: '', return: '', participants: 'Erik Svensson, Leon Russo De Cemare, Dennis Bjarnemark, Winston Bjarnemark, Johan Berglund' })
    // Spara till API (non-blocking)
    fetch(`${API}/api/travel/trips`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass' }, body: JSON.stringify(trip) }).catch(() => {})
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #DDD5C5', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, display: 'block' }
  const flagOptions = ['✈️','🇸🇪','🇹🇭','🇨🇳','🇺🇸','🇦🇪','🇬🇧','🇩🇪','🇫🇷','🇯🇵','🇸🇬','🇮🇳','🇧🇷','🇿🇦','🇦🇺','🌍']

  useEffect(() => {
    fetch(`${API}/api/travel/trips`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (d.trips?.length) setTrips(d.trips) })
      .catch(() => setUsingFallback(true))
  }, [])

  function handleUpdate(updated: Trip) {
    setTrips(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const issueCount = trips.reduce((n, t) =>
    n + Object.values(t.steps).filter(s => s.status === 'issue').length, 0)

  return (
    <div style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '24px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#0A3D62',
    }}>
      {/* Global CSS for animations */}
      <style>{`
        @keyframes pulse-btn {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 #ef444433; }
          50% { box-shadow: 0 0 0 4px #ef444433; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {usingFallback && (
        <div style={{ marginBottom: 16, padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          Visar fördefinierade resor · Live-API ej ansluten
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Plane size={20} color="#60a5fa" />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0A3D62' }}>Travel Automation</h1>
            {issueCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
              }}>
                {issueCount} issue{issueCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8A8A9A' }}>
            Fullständig resebokning & statushantering för gruppresor
          </p>
        </div>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #2563eb',
            background: '#1e3a5f',
            color: '#93c5fd',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={() => setShowNewTrip(true)}
        >
          <Plus size={14} />
          Ny resa
        </button>
      </div>

      {/* Trips */}
      {trips.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#8A8A9A',
          border: '1px dashed #DDD5C5',
          borderRadius: 12,
        }}>
          <MapPin size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Inga aktiva resor</p>
          <p style={{ margin: '6px 0 0', fontSize: 12 }}>Klicka på "Ny resa" för att lägga till en</p>
        </div>
      ) : (
        trips.map(trip => (
          <TripCard key={trip.id} trip={trip} onUpdate={handleUpdate} />
        ))
      )}

      {/* Info footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: 11, marginTop: 8 }}>
        <Info size={12} />
        Webhook-automatisering via n8n · SMS via Wavult API · Dokument sparas lokalt per deltagare
      </div>

      {/* ── Ny resa modal ── */}
      {showNewTrip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowNewTrip(false)}>
          <div style={{ background: '#FDFAF5', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A3D62' }}>✈️ Ny resa</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8A8278' }}>Planera gruppress med automatisk bokningsstatus</p>
              </div>
              <button onClick={() => setShowNewTrip(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A8278' }}>✕</button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Namn */}
              <div>
                <label style={labelStyle}>Resenamn</label>
                <input style={inputStyle} placeholder="t.ex. Bangkok Workcamp, Shenzhen Tech Tour" value={newTrip.name} onChange={e => setNewTrip(p => ({ ...p, name: e.target.value }))} />
              </div>

              {/* Destination + flagga */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Destination</label>
                  <input style={inputStyle} placeholder="t.ex. Shenzhen, Kina" value={newTrip.destination} onChange={e => setNewTrip(p => ({ ...p, destination: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Flagga</label>
                  <select style={{ ...inputStyle, width: 70 }} value={newTrip.flag} onChange={e => setNewTrip(p => ({ ...p, flag: e.target.value }))}>
                    {flagOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Datum */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Avresedatum</label>
                  <input type="date" style={inputStyle} value={newTrip.departure} onChange={e => setNewTrip(p => ({ ...p, departure: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Hemkomst</label>
                  <input type="date" style={inputStyle} value={newTrip.return} onChange={e => setNewTrip(p => ({ ...p, return: e.target.value }))} />
                </div>
              </div>

              {/* Deltagare */}
              <div>
                <label style={labelStyle}>Deltagare (kommaseparerade)</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={newTrip.participants} onChange={e => setNewTrip(p => ({ ...p, participants: e.target.value }))} />
              </div>

              {/* Knappar */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNewTrip(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #DDD5C5', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
                  Avbryt
                </button>
                <button
                  onClick={handleCreateTrip}
                  disabled={!newTrip.name || !newTrip.destination || !newTrip.departure || !newTrip.return}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: '#0A3D62', fontSize: 13, fontWeight: 700, color: '#F5F0E8', cursor: 'pointer', opacity: (!newTrip.name || !newTrip.destination || !newTrip.departure || !newTrip.return) ? 0.5 : 1 }}
                >
                  ✈️ Skapa resa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
