/**
 * WHOOPTeamDashboard — Team Pulse + Setup Guide
 *
 * Flöde:
 * 1. Sätt upp armbandet (fysisk guide)
 * 2. Koppla till Wavult OS (OAuth)
 * 3. Se teamets data live
 *
 * OAuth-flöde (cookie-fritt, localStorage-baserat):
 * - Klick på "Koppla WHOOP" → redirect till https://api.wavult.com/whoop/auth
 * - Backend redirectar till WHOOP OAuth
 * - WHOOP redirectar tillbaka till /whoop/callback på backend
 * - Backend redirectar till https://wavult-os.pages.dev/whoop?connected=true&connect_code=...
 * - Frontend fångar params i useEffect, gör token-exchange, rensar URL
 */

import { useEffect, useState } from 'react'
import { useApi } from '../../shared/auth/useApi'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  user_id: string
  full_name: string | null
  email: string | null
  recovery_score: number | null
  hrv: number | null
  resting_hr: number | null
  sleep_performance: number | null
  sleep_hours: number | null
  strain_score: number | null
  snapshot_at: string | null
}

interface TeamData {
  team: TeamMember[]
  averages: {
    recovery: number | null
    sleep: number | null
    strain: number | null
  }
  total_connected: number
}

interface MyData {
  connected: boolean
  recovery: { score: number | null; hrv: number | null; restingHr: number | null } | null
  sleep: { performancePercent: number | null; durationHours: number | null } | null
  strain: { score: number | null; kilojoules: number | null } | null
  cached: boolean
  last_updated: string | null
}

type ActiveTab = 'team' | 'setup'

// ─── Email → Titel-mappning ────────────────────────────────────────────────────

const EMAIL_TITLES: Record<string, string> = {
  'winston@wavult.com': 'CFO',
  'dennis@wavult.com': 'Chief Legal & Operations',
  'leon@wavult.com': 'CEO Wavult Operations',
  'erik@wavult.com': 'Chairman & Group CEO',
  'johan@wavult.com': 'Group CTO',
}

function getTitleForEmail(email: string | null): string | null {
  if (!email) return null
  return EMAIL_TITLES[email.toLowerCase()] ?? null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recoveryColor(score: number | null): string {
  if (score == null) return '#F3F4F6'
  if (score > 66) return '#10B981'
  if (score > 33) return '#F59E0B'
  return '#EF4444'
}

function recoveryLabel(score: number | null): string {
  if (score == null) return '—'
  if (score > 66) return 'Grön'
  if (score > 33) return 'Gul'
  return 'Röd'
}

function minutesAgo(isoStr: string | null): string {
  if (!isoStr) return 'aldrig'
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just nu'
  if (mins < 60) return `${mins} min sedan`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h sedan`
  return `${Math.floor(hrs / 24)}d sedan`
}

// ─── Member Card (stor, tydlig) ───────────────────────────────────────────────

function MemberCard({ member }: { member: TeamMember }) {
  const color = recoveryColor(member.recovery_score)
  const score = member.recovery_score
  const title = getTitleForEmail(member.email)

  const allNull =
    member.recovery_score == null &&
    member.hrv == null &&
    member.sleep_performance == null &&
    member.sleep_hours == null &&
    member.strain_score == null

  const displayName = member.full_name ?? member.email ?? 'Okänd'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className="rounded-2xl bg-white flex flex-col gap-0 overflow-hidden"
      style={{ border: `1.5px solid ${color}40` }}
    >
      {/* Samlar data-banner — BARA om all data är null */}
      {allNull && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          style={{ background: '#F59E0B18', color: '#F59E0B', borderBottom: '1px solid #F59E0B30' }}
        >
          <span>📡</span>
          <span>Armbandet samlar data</span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Header: avatar + namn + titel */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: color + '25', color }}
          >
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-text-primary font-semibold text-sm truncate leading-tight">{displayName}</p>
            {title && (
              <p className="text-xs font-medium mt-0.5 truncate" style={{ color: color + 'CC' }}>
                {title}
              </p>
            )}
          </div>
        </div>

        {/* Recovery score DOMINANT */}
        <div className="flex items-end justify-between">
          <div>
            <div
              className="text-5xl font-black leading-none tabular-nums"
              style={{ color }}
            >
              {score != null ? `${Math.round(score)}` : '—'}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold" style={{ color }}>
                {recoveryLabel(score)}
              </span>
              <span className="text-xs text-gray-9000">Recovery</span>
            </div>
          </div>

          {/* Recovery ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="22" fill="none" strokeWidth="5" stroke="#ffffff0f" />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                strokeWidth="5"
                stroke={color}
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - (score ?? 0) / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-9000">
                {score != null ? '%' : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* HRV / Sömn / Strain */}
        <div className="grid grid-cols-3 gap-2">
          {/* HRV */}
          <div className="rounded-xl bg-muted/30 p-3 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-9000 uppercase font-semibold tracking-wider">HRV</span>
            <span className="text-xl font-bold text-text-primary tabular-nums">
              {member.hrv != null ? Math.round(member.hrv) : '—'}
            </span>
            <span className="text-[9px] text-gray-9000">ms</span>
          </div>

          {/* Sömn */}
          <div className="rounded-xl bg-muted/30 p-3 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-9000 uppercase font-semibold tracking-wider">Sömn</span>
            <span className="text-xl font-bold text-blue-700 tabular-nums">
              {member.sleep_hours != null ? `${member.sleep_hours.toFixed(1)}h` : '—'}
            </span>
            <span className="text-[9px] text-gray-9000">
              {member.sleep_performance != null ? `${Math.round(member.sleep_performance)}%` : '—'}
            </span>
          </div>

          {/* Strain */}
          <div className="rounded-xl bg-muted/30 p-3 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-9000 uppercase font-semibold tracking-wider">Strain</span>
            <span className="text-xl font-bold text-orange-700 tabular-nums">
              {member.strain_score != null ? (Math.round(member.strain_score * 10) / 10).toFixed(1) : '—'}
            </span>
            <span className="text-[9px] text-gray-9000">/21</span>
          </div>
        </div>

        {/* Strain bar */}
        {member.strain_score != null && (
          <div>
            <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(member.strain_score / 21) * 100}%`,
                  background: 'linear-gradient(90deg, #FB923C, #EF4444)',
                }}
              />
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-gray-9000 font-mono">
          Uppdaterad {minutesAgo(member.snapshot_at)}
        </p>
      </div>
    </div>
  )
}

// ─── Team Pulse ───────────────────────────────────────────────────────────────

function TeamPulse({
  data,
  loading,
  onRefresh,
  lastFetch,
}: {
  data: TeamData | null
  loading: boolean
  onRefresh: () => void
  lastFetch: Date | null
}) {
  if (!data || data.total_connected === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <span className="text-5xl">⌚</span>
        <p className="text-gray-9000 text-sm">Ingen i teamet har kopplat WHOOP ännu.</p>
        <p className="text-gray-9000 text-xs max-w-xs">
          Gå till "Koppla &amp; Kom igång"-fliken och koppla ditt konto. Dela sedan länken med teamet.
        </p>
      </div>
    )
  }

  const { team, averages, total_connected } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-gray-9000 text-sm">
          {total_connected} kopplade · uppdaterad {minutesAgo(lastFetch?.toISOString() ?? null)}
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-muted/30 text-gray-9000 hover:bg-white/[0.10] transition-colors disabled:opacity-50"
        >
          {loading ? '↻ Synkar…' : '↻ Synka'}
        </button>
      </div>

      {/* Team-genomsnitt */}
      <div className="rounded-2xl border border-surface-border bg-white p-6">
        <p className="text-xs text-gray-9000 font-mono uppercase tracking-wider mb-5">
          Team-genomsnitt
        </p>

        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Recovery */}
          <div className="flex flex-col items-center gap-1">
            <div
              className="text-5xl font-black tabular-nums"
              style={{ color: recoveryColor(averages.recovery) }}
            >
              {averages.recovery != null ? `${averages.recovery}` : '—'}
            </div>
            <div className="text-xs text-gray-9000 font-mono uppercase tracking-wider">% Recovery</div>
            {averages.recovery != null && (
              <div
                className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
                style={{
                  background: recoveryColor(averages.recovery) + '20',
                  color: recoveryColor(averages.recovery),
                }}
              >
                {recoveryLabel(averages.recovery)}
              </div>
            )}
          </div>

          {/* Sömn */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl font-black text-blue-700 tabular-nums">
              {averages.sleep != null ? `${averages.sleep}` : '—'}
            </div>
            <div className="text-xs text-gray-9000 font-mono uppercase tracking-wider">% Sömn</div>
          </div>

          {/* Strain */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl font-black text-orange-700 tabular-nums">
              {averages.strain != null ? averages.strain : '—'}
            </div>
            <div className="text-xs text-gray-9000 font-mono uppercase tracking-wider">Strain /21</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-surface-border">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-gray-9000">Röd &lt;33 — vila idag</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-9000">Gul 33–66 — bevaka</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-9000">Grön &gt;66 — redo</span>
          </div>
        </div>
      </div>

      {/* Samlar data-banner om INGEN i teamet har data */}
      {averages.recovery == null && averages.sleep == null && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
          <span className="text-xl flex-shrink-0">📡</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">Armbanden samlar data</p>
            <p className="text-xs text-gray-9000 leading-relaxed mt-0.5">
              WHOOP behöver bäras dygnet runt i{' '}
              <strong className="text-text-primary">4–5 dagar</strong> innan recovery-data är pålitlig.
              Data börjar visas successivt — håll armbanden på.
            </p>
          </div>
        </div>
      )}

      {/* Team-kort grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {team.map((member) => (
          <MemberCard key={member.user_id} member={member} />
        ))}
      </div>
    </div>
  )
}

// ─── Koppla & Kom igång (sammanslaget flöde) ──────────────────────────────────

function SetupAndConnectTab({ onConnected }: { onConnected: () => void }) {
  const { apiFetch } = useApi()
  const [connected, setConnected] = useState(false)
  const [myData, setMyData] = useState<MyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('connected') === 'true') {
      const connectCode = params.get('connect_code')
      window.history.replaceState({}, '', '/whoop')

      if (connectCode) {
        apiFetch('/whoop/token-exchange', {
          method: 'POST',
          body: JSON.stringify({ connect_code: connectCode }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { connected?: boolean } | null) => {
            if (data?.connected) {
              setConnected(true)
              onConnected()
            } else {
              setError('Koppling misslyckades — försök igen')
            }
          })
          .catch(() => setError('Nätverksfel vid koppling'))
      }
    }

    if (params.get('error')) {
      const errCode = params.get('error')
      const errMessages: Record<string, string> = {
        oauth_denied: 'Du nekade åtkomst till WHOOP',
        invalid_state: 'Säkerhetsfel — försök igen',
        no_code: 'WHOOP skickade inget code — försök igen',
        token_exchange_failed: 'Kunde inte hämta tokens från WHOOP — försök igen',
        login_required: 'Du måste vara inloggad i Wavult OS innan du kopplar WHOOP',
        save_failed: 'Kunde inte spara kopplingen — försök igen',
      }
      setError(errMessages[errCode ?? ''] ?? `Koppling misslyckades: ${errCode}`)
      window.history.replaceState({}, '', '/whoop')
    }

    apiFetch('/whoop/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { connected?: boolean } | null) => {
        if (data?.connected) setConnected(true)
      })
      .catch(() => {})
  }, [apiFetch, onConnected])

  useEffect(() => {
    if (!connected) return
    setLoadingData(true)
    apiFetch('/whoop/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MyData | null) => {
        if (data) setMyData(data)
      })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [connected, apiFetch])

  async function handleConnect() {
    try {
      const res = await apiFetch('/whoop/auth-url', { method: 'POST' })
      if (res.ok) {
        const { url } = (await res.json()) as { url: string }
        window.location.href = url
      } else {
        setError('Kunde inte starta WHOOP-koppling — försök igen')
      }
    } catch {
      setError('Nätverksfel — kontrollera anslutningen')
    }
  }

  function handleDisconnect() {
    apiFetch('/whoop/disconnect', { method: 'DELETE' }).catch(() => {})
    setConnected(false)
    setMyData(null)
  }

  // ── Kopplat-vy ──
  if (connected) {
    return (
      <div className="max-w-md mx-auto py-4 space-y-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">✅</span>
          <div>
            <h2 className="text-lg font-bold text-text-primary">WHOOP kopplat!</h2>
            <p className="text-sm text-gray-9000 mt-1">Din data synkas automatiskt.</p>
          </div>

          {loadingData && <p className="text-xs text-gray-9000">Hämtar din data…</p>}

          {myData && !loadingData && (() => {
            const hasData =
              myData.recovery?.score != null ||
              myData.sleep?.performancePercent != null ||
              myData.strain?.score != null

            if (!hasData) {
              return (
                <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
                  <div className="text-2xl">📡</div>
                  <p className="text-sm font-semibold text-amber-300">Samlar data</p>
                  <p className="text-xs text-gray-9000 leading-relaxed">
                    WHOOP behöver bäras dygnet runt i{' '}
                    <strong className="text-text-primary">minst 4–5 dagar</strong> innan recovery-data är
                    tillgänglig.
                  </p>
                </div>
              )
            }

            return (
              <div className="w-full rounded-xl border border-surface-border bg-muted p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: recoveryColor(myData.recovery?.score ?? null) }}
                  >
                    {myData.recovery?.score != null ? `${Math.round(myData.recovery.score)}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-9000 mt-1 uppercase">Recovery</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {myData.sleep?.performancePercent != null
                      ? `${Math.round(myData.sleep.performancePercent)}%`
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-9000 mt-1 uppercase">Sömn</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {myData.strain?.score != null
                      ? Math.round(myData.strain.score * 10) / 10
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-9000 mt-1 uppercase">Strain</div>
                </div>
              </div>
            )
          })()}

          <button
            onClick={handleDisconnect}
            className="text-xs text-gray-9000 hover:text-red-700 transition-colors"
          >
            Koppla bort
          </button>
        </div>
      </div>
    )
  }

  // ── Steg-för-steg guide (ej kopplad) ──
  const steps = [
    {
      num: '1',
      emoji: '📦',
      title: 'Packa upp armbandet',
      body: 'I kartongen finns: WHOOP 4.0-armbandet, ett laddningspaket (det lilla batteripaketet som glider på armbandet) och en USB-C-kabel. Ta ut allt och lägg framför dig.',
    },
    {
      num: '2',
      emoji: '⌚',
      title: 'Sätt på armbandet rätt',
      body: 'Bär det på handleden — gärna 2–3 cm ovanför handlovsknutan, inte på pulsen. Sensorn (den platta sidan med optisk sensor) ska ligga mot huden. Spännet stängs som ett vanligt klockspänne.',
      tip: 'Tips: Ha det på icke-dominanta handen (vänster om du är högerhänt) för mer exakt mätning.',
    },
    {
      num: '3',
      emoji: '🔋',
      title: 'Ladda utan att ta av',
      body: 'WHOOP-armbandet laddas med batteripaketet — det glider på utsidan av armbandet medan du har det på handleden. Koppla USB-C-kabeln till batteripaketet och till ett uttag.',
      tip: 'Ladda till minst 50% innan du parkopplar.',
    },
    {
      num: '4',
      emoji: '📱',
      title: 'Installera WHOOP-appen',
      body: 'Ladda ner den officiella WHOOP-appen från App Store (iOS) eller Google Play (Android). Skapa ett konto med din e-postadress eller logga in om du redan har ett.',
    },
    {
      num: '5',
      emoji: '🔗',
      title: 'Para ihop via Bluetooth',
      body: 'I WHOOP-appen: tryck på "+" eller "Add a device" → välj WHOOP 4.0 i listan. Se till att Bluetooth är på. Håll armbandet nära telefonen. Parkopplingen tar 1–2 minuter.',
      tip: 'Om armbandet inte dyker upp: håll nere knappen på armbandet i 3 sekunder för att starta om det.',
    },
    {
      num: '6',
      emoji: '😴',
      title: 'Bär det dygnet runt',
      body: 'WHOOP behöver mäta sömn för att beräkna recovery. Bär det även när du sover — det är vattentätt (IP68) och klarar dusch och simning. För pålitlig data behöver du bära det minst 3 nätter i rad.',
      tip: 'Ladda under dagen eller i duschen med batteripaketet — inte på natten.',
    },
    {
      num: '7',
      emoji: '🏢',
      title: 'Koppla till Wavult OS',
      body: 'Logga in med ditt WHOOP-konto och godkänn att Wavult OS får läsa din recovery-, sömn- och träningsdata. Det tar under en minut.',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-base font-semibold text-text-primary mb-1">Koppla &amp; Kom igång</h2>
        <p className="text-sm text-gray-9000">Följ stegen nedan — från kartong till kopplat.</p>
      </div>

      {steps.map(({ num, emoji, title, body, tip }) => {
        const isLastStep = num === '7'
        return (
          <div
            key={num}
            className="rounded-2xl border border-surface-border bg-white p-5 flex gap-4"
          >
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-sm font-bold text-text-primary">
                {num}
              </div>
              {!isLastStep && <div className="w-px flex-1 bg-muted min-h-[20px]" />}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{emoji}</span>
                <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
              </div>
              <p className="text-sm text-gray-9000 leading-relaxed">{body}</p>
              {tip && (
                <div className="mt-3 flex gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                  <span className="text-blue-700 text-xs font-semibold flex-shrink-0">Tips</span>
                  <p className="text-xs text-blue-300 leading-relaxed">{tip}</p>
                </div>
              )}

              {/* Koppla-knapp inbäddad i steg 7 */}
              {isLastStep && (
                <button
                  onClick={handleConnect}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-black text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: '#F5C842' }}
                >
                  <span>⌚</span>
                  <span>Koppla WHOOP-konto</span>
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-700 font-semibold text-sm">✓ Redo!</span>
        </div>
        <p className="text-sm text-gray-9000 leading-relaxed">
          När alla i teamet är kopplade visas live-data under "Team Pulse". Recovery, sömn och
          daglig belastning synkas automatiskt varje timme. Lägst recovery visas överst — vi
          anpassar workload efter faktisk kapacitet.
        </p>
      </div>
    </div>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export function WHOOPTeamDashboard() {
  const { t: _t } = useTranslation() // ready for i18n
  const { apiFetch } = useApi()
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [tab, setTab] = useState<ActiveTab>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') || params.get('error')) return 'setup'
    return 'team'
  })

  async function loadTeamData() {
    setLoading(true)
    try {
      const res = await apiFetch('/whoop/team')
      if (res.ok) {
        const json = (await res.json()) as TeamData
        setData(json)
        setLastFetch(new Date())
      }
    } catch {
      // API ej tillgängligt — visa tom team-vy
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeamData()
    const interval = setInterval(() => void loadTeamData(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'team', label: 'Team Pulse' },
    { id: 'setup', label: 'Koppla & Kom igång' },
  ]

  return (
    <div className="h-full flex flex-col bg-muted/30 text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-5 pb-0 border-b border-surface-border">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⌚</span>
          <div>
            <h1 className="text-lg font-bold text-text-primary">WHOOP</h1>
            <p className="text-xs text-gray-9000">Team Pulse · Biometri · Recovery</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-text-primary border-amber-400'
                  : 'text-gray-9000 border-transparent hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {tab === 'team' && (
          <TeamPulse data={data} loading={loading} onRefresh={loadTeamData} lastFetch={lastFetch} />
        )}
        {tab === 'setup' && (
          <SetupAndConnectTab
            onConnected={() => {
              void loadTeamData()
            }}
          />
        )}
      </div>
    </div>
  )
}
