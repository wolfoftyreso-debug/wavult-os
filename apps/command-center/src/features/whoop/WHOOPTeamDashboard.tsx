/**
 * WHOOPTeamDashboard — Team Pulse + Setup Guide
 *
 * Flöde:
 * 1. Sätt upp armbandet (fysisk guide)
 * 2. Koppla till Wavult OS (OAuth)
 * 3. Se teamets data live
 *
 * OAuth-flöde (cookie-fritt, localStorage-baserat):
 * - Klick på "Koppla WHOOP" → redirect till https://api.hypbit.com/whoop/auth
 * - Backend redirectar till WHOOP OAuth
 * - WHOOP redirectar tillbaka till /whoop/callback på backend
 * - Backend redirectar till https://wavult-os.pages.dev/whoop?connected=true&access_token=...
 * - Frontend fångar params i useEffect, sparar i localStorage, rensar URL
 */

import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.hypbit.com'

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

type ActiveTab = 'team' | 'setup' | 'connect'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recoveryColor(score: number | null): string {
  if (score == null) return '#374151'
  if (score > 66) return '#10B981'
  if (score > 33) return '#F59E0B'
  return '#EF4444'
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

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getWhoopToken(): string | null {
  return localStorage.getItem('whoop_access_token')
}



// ─── Setup Guide ──────────────────────────────────────────────────────────────

function SetupGuide() {
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
      body: 'Bär det på handleden — gärna 2–3 cm ovanför handlovsknutan, inte på pulsen. Sensorn (den platta sidan med optisk sensor) ska ligga mot huden. Spännet stängs som ett vanligt klockspänne. Inte för hårt, inte för löst — du ska kunna sticka in ett finger.',
      tip: 'Tips: Ha det på icke-dominanta handen (vänster om du är högerhänt) för mer exakt mätning.',
    },
    {
      num: '3',
      emoji: '🔋',
      title: 'Ladda utan att ta av',
      body: 'WHOOP-armbandet laddas med batteripaketet — det glider på utsidan av armbandet medan du har det på handleden. Koppla USB-C-kabeln till batteripaketet och till ett uttag. LED-lampan visar: röd = laddar, grön = full.',
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
      body: 'I WHOOP-appen: tryck på "+" eller "Add a device" → välj WHOOP 4.0 i listan. Se till att Bluetooth är på. Håll armbandet nära telefonen. Parkopplingen tar 1–2 minuter. Armbandet vibrerar och blinkar när det är klart.',
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
      body: 'Gå till fliken "Koppla WHOOP" ovan och klicka på knappen. Du loggar in med ditt WHOOP-konto och godkänner att Wavult OS får läsa din recovery-, sömn- och träningsdata. Det tar under en minut.',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-5">
        <h2 className="text-base font-semibold text-white mb-1">Kom igång med WHOOP</h2>
        <p className="text-sm text-gray-500">Följ stegen nedan — från kartong till kopplat.</p>
      </div>

      {steps.map(({ num, emoji, title, body, tip }) => (
        <div key={num} className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-5 flex gap-4">
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-sm font-bold text-white">
              {num}
            </div>
            {parseInt(num) < steps.length && (
              <div className="w-px flex-1 bg-white/10 min-h-[20px]" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{emoji}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            {tip && (
              <div className="mt-3 flex gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                <span className="text-blue-400 text-xs font-semibold flex-shrink-0">Tips</span>
                <p className="text-xs text-blue-300 leading-relaxed">{tip}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-400 font-semibold text-sm">✓ Redo!</span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          När alla i teamet är kopplade visas live-data under "Team Pulse". Recovery, sömn och 
          daglig belastning synkas automatiskt varje timme. Lägst recovery visas överst — 
          vi anpassar workload efter faktisk kapacitet.
        </p>
      </div>
    </div>
  )
}

// ─── Connect Tab ──────────────────────────────────────────────────────────────

function ConnectTab({ onConnected }: { onConnected: () => void }) {
  const [connected, setConnected] = useState(false)
  const [myData, setMyData] = useState<MyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    // Hantera OAuth callback — tokens hanteras server-side, vi får bara connect_code
    const params = new URLSearchParams(window.location.search)

    if (params.get('connected') === 'true') {
      const connectCode = params.get('connect_code')
      window.history.replaceState({}, '', '/whoop')

      if (connectCode) {
        // Byt connect_code mot bekräftelse (tokens sparas server-side)
        fetch(`${API_BASE}/whoop/token-exchange`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connect_code: connectCode }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
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

    // Kolla status server-side (session-baserat, inte localStorage)
    fetch(`${API_BASE}/whoop/status`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.connected) setConnected(true) })
      .catch(() => {})
  }, [])

  // Ladda min data när kopplat (session-baserat)
  useEffect(() => {
    if (!connected) return

    setLoadingData(true)
    fetch(`${API_BASE}/whoop/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMyData(data) })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [connected])

  function handleConnect() {
    window.location.href = `${API_BASE}/whoop/auth`
  }

  function handleDisconnect() {
    fetch(`${API_BASE}/whoop/disconnect`, { method: 'DELETE', credentials: 'include' })
      .catch(() => {})
    setConnected(false)
    setMyData(null)
  }

  if (connected) {
    return (
      <div className="max-w-md mx-auto py-4 space-y-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">✅</span>
          <div>
            <h2 className="text-lg font-bold text-white">WHOOP kopplat!</h2>
            <p className="text-sm text-gray-400 mt-1">Din data synkas automatiskt.</p>
          </div>

          {loadingData && (
            <p className="text-xs text-gray-500">Hämtar din data…</p>
          )}

          {myData && !loadingData && (() => {
            const hasData = myData.recovery?.score != null || myData.sleep?.performancePercent != null || myData.strain?.score != null
            if (!hasData) {
              return (
                <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
                  <div className="text-2xl">📡</div>
                  <p className="text-sm font-semibold text-amber-300">Samlar data</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    WHOOP behöver bäras dygnet runt i <strong className="text-white">minst 4–5 dagar</strong> innan
                    recovery-data är tillgänglig. Armbandet kalibrerar din baslinjenivå för HRV, puls och sömn.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Håll armbandet på — data visas automatiskt när det är klart.</p>
                </div>
              )
            }
            return (
              <div className="w-full rounded-xl border border-white/[0.08] bg-black/20 p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: recoveryColor(myData.recovery?.score ?? null) }}>
                    {myData.recovery?.score != null ? `${Math.round(myData.recovery.score)}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 uppercase">Recovery</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {myData.sleep?.performancePercent != null ? `${Math.round(myData.sleep.performancePercent)}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 uppercase">Sömn</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {myData.strain?.score != null ? Math.round(myData.strain.score * 10) / 10 : '—'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 uppercase">Strain</div>
                </div>
              </div>
            )
          })()}

          <button
            onClick={handleDisconnect}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            Koppla bort
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-5 py-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-6 flex flex-col items-center gap-5 text-center">
        <span className="text-5xl">⌚</span>
        <div>
          <h2 className="text-lg font-bold text-white">Koppla ditt WHOOP</h2>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            Auktorisera Wavult OS att läsa din recovery-, sömn- och träningsdata.
            Tar under en minut.
          </p>
        </div>
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-black text-sm transition-all hover:brightness-110 active:scale-95"
          style={{ background: '#F5C842' }}
        >
          <span>⌚</span>
          <span>Koppla WHOOP-konto</span>
        </button>
        <p className="text-xs text-gray-600">
          Du loggar in med ditt WHOOP-konto och godkänner delning av biometrik.
          Du kan koppla bort när som helst.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vad synkas</p>
        {[
          ['Recovery score', 'Daglig återhämtning 0–100%'],
          ['HRV', 'Hjärtfrekvensvariabilitet'],
          ['Vilopuls', 'Resting heart rate'],
          ['Sömnkvalitet', 'Sömneffektivitet och duration'],
          ['Strain', 'Daglig belastning 0–21'],
        ].map(([label, desc]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-white">{label}</span>
            <span className="text-gray-500">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Team Pulse ───────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: TeamMember }) {
  const color = recoveryColor(member.recovery_score)
  const score = member.recovery_score

  return (
    <div
      className="rounded-2xl border bg-[#0D0F1A] p-5 flex flex-col gap-3"
      style={{ borderColor: color + '40' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {member.full_name ?? member.email ?? 'Okänd'}
          </p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {minutesAgo(member.snapshot_at)}
          </p>
        </div>
        <div
          className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color + '20', color }}
        >
          {score != null ? `${Math.round(score)}%` : '📡'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-white">
            {member.hrv != null ? Math.round(member.hrv) : '—'}
          </p>
          <p className="text-[9px] text-gray-600 font-mono mt-0.5">HRV</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {member.sleep_performance != null ? `${Math.round(member.sleep_performance)}%` : '—'}
          </p>
          <p className="text-[9px] text-gray-600 font-mono mt-0.5">Sömn</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {member.strain_score != null ? Math.round(member.strain_score * 10) / 10 : '—'}
          </p>
          <p className="text-[9px] text-gray-600 font-mono mt-0.5">Strain</p>
        </div>
      </div>

      {/* Recovery bar */}
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: score != null ? `${score}%` : '0%',
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}

function TeamPulse({ data, loading, onRefresh, lastFetch }: {
  data: TeamData | null
  loading: boolean
  onRefresh: () => void
  lastFetch: Date | null
}) {
  if (!data || data.total_connected === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <span className="text-5xl">⌚</span>
        <p className="text-gray-400 text-sm">Ingen i teamet har kopplat WHOOP ännu.</p>
        <p className="text-gray-600 text-xs max-w-xs">
          Gå till "Koppla WHOOP"-fliken och koppla ditt konto. Dela sedan länken med teamet.
        </p>
      </div>
    )
  }

  const { team, averages, total_connected } = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-gray-500 text-sm">
          {total_connected} kopplade · {minutesAgo(lastFetch?.toISOString() ?? null)}
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-gray-400 hover:bg-white/[0.10] transition-colors disabled:opacity-50"
        >
          {loading ? '↻ Synkar…' : '↻ Synka'}
        </button>
      </div>

      {/* Samlar data-banner om ingen har data ännu */}
      {averages.recovery == null && averages.sleep == null && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
          <span className="text-xl flex-shrink-0">📡</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">Armbanden samlar data</p>
            <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
              WHOOP behöver bäras dygnet runt i <strong className="text-white">4–5 dagar</strong> innan recovery-data 
              är pålitlig. Under den här perioden kalibrerar varje armband din personliga baslinjenivå för HRV och puls.
              Data börjar visas successivt — håll armbanden på.
            </p>
          </div>
        </div>
      )}

      {/* Genomsnitt */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-5">
        <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-4">Team-genomsnitt</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold" style={{ color: recoveryColor(averages.recovery) }}>
              {averages.recovery != null ? `${averages.recovery}%` : '—'}
            </div>
            <div className="text-xs text-gray-600 font-mono mt-1 uppercase tracking-wider">Recovery</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">
              {averages.sleep != null ? `${averages.sleep}%` : '—'}
            </div>
            <div className="text-xs text-gray-600 font-mono mt-1 uppercase tracking-wider">Sömn</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-400">
              {averages.strain != null ? averages.strain : '—'}
            </div>
            <div className="text-xs text-gray-600 font-mono mt-1 uppercase tracking-wider">Strain /21</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">Röd &lt;33 — vila idag</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-500">Gul 33–66 — bevaka</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500">Grön &gt;66 — redo</span>
          </div>
        </div>
      </div>

      {/* Team-grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {team.map((member) => (
          <MemberCard key={member.user_id} member={member} />
        ))}
      </div>
    </div>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export function WHOOPTeamDashboard() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [tab, setTab] = useState<ActiveTab>(() => {
    // Om vi kommer tillbaka från OAuth callback, gå direkt till connect-fliken
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') || params.get('error')) return 'connect'
    return 'team'
  })

  async function loadTeamData() {
    setLoading(true)
    try {
      const token = getWhoopToken()
      const res = await fetch(`${API_BASE}/whoop/team`, {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const json = await res.json()
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
    loadTeamData()
    const interval = setInterval(loadTeamData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'team', label: 'Team Pulse' },
    { id: 'connect', label: 'Koppla WHOOP' },
    { id: 'setup', label: 'Kom igång' },
  ]

  return (
    <div className="h-full flex flex-col bg-[#0D1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-5 pb-0 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⌚</span>
          <div>
            <h1 className="text-lg font-bold text-white">WHOOP</h1>
            <p className="text-xs text-gray-500">Team Pulse · Biometri · Recovery</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-white border-amber-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
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
          <TeamPulse
            data={data}
            loading={loading}
            onRefresh={loadTeamData}
            lastFetch={lastFetch}
          />
        )}
        {tab === 'connect' && (
          <ConnectTab
            onConnected={() => {
              // Ladda om teamdata efter koppling
              loadTeamData()
            }}
          />
        )}
        {tab === 'setup' && <SetupGuide />}
      </div>
    </div>
  )
}
