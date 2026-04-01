import { useState, useEffect } from 'react'

// ── Typer ──────────────────────────────────────────────────
interface ZoomerLevel {
  id: string
  emoji: string
  name: string
  minMissions: number
  maxMissions: number | null
  minRating: number | null
  color: string
  description: string
}

interface ZoomerStats {
  id: string
  username: string
  missions_completed: number
  average_rating: number
  level: string
}

interface StatsResponse {
  zoomers: ZoomerStats[]
  total: number
}

const LEVELS: ZoomerLevel[] = [
  {
    id: 'junior',
    emoji: '🌱',
    name: 'Junior Zoomer',
    minMissions: 0,
    maxMissions: 10,
    minRating: null,
    color: '#34C759',
    description: '0–10 uppdrag',
  },
  {
    id: 'zoomer',
    emoji: '⚡',
    name: 'Zoomer',
    minMissions: 11,
    maxMissions: 50,
    minRating: 4.0,
    color: '#FFD60A',
    description: '11–50 uppdrag, 4.0+ rating',
  },
  {
    id: 'senior',
    emoji: '🔥',
    name: 'Senior Zoomer',
    minMissions: 51,
    maxMissions: 200,
    minRating: 4.5,
    color: '#FF9500',
    description: '51–200 uppdrag, 4.5+ rating',
  },
  {
    id: 'elite',
    emoji: '💎',
    name: 'Elite Zoomer',
    minMissions: 201,
    maxMissions: null,
    minRating: 4.8,
    color: '#BF5FFF',
    description: '200+ uppdrag, 4.8+ rating',
  },
]

// ── Hämta stats från quiXzoom API ─────────────────────────
async function fetchZoomerStats(): Promise<StatsResponse | null> {
  try {
    const res = await fetch('https://api.quixzoom.com/api/zoomers', {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data as StatsResponse
  } catch {
    return null
  }
}

function getZoomerLevel(z: ZoomerStats): ZoomerLevel {
  const m = z.missions_completed
  const r = z.average_rating
  if (m >= 201 && r >= 4.8) return LEVELS[3]
  if (m >= 51 && r >= 4.5) return LEVELS[2]
  if (m >= 11 && r >= 4.0) return LEVELS[1]
  return LEVELS[0]
}

// ── Level-kort ──────────────────────────────────────────────
function LevelCard({ level, count }: { level: ZoomerLevel; count: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-primary border border-surface-border">
      <span className="text-xl">{level.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{level.name}</p>
        <p className="text-xs text-gray-500">{level.description}</p>
      </div>
      <div
        className="px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: `${level.color}20`,
          color: level.color,
        }}
      >
        {count}
      </div>
    </div>
  )
}

// ── Huvud-komponent ────────────────────────────────────────
export function ZoomerCert() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchZoomerStats().then((data) => {
      if (data) {
        setStats(data)
      } else {
        setError('Kunde inte hämta data från quiXzoom API')
      }
      setLoading(false)
    })
  }, [])

  // Räkna zoomers per nivå
  const levelCounts = LEVELS.reduce<Record<string, number>>(
    (acc, l) => ({ ...acc, [l.id]: 0 }),
    {}
  )

  if (stats) {
    stats.zoomers.forEach((z) => {
      const level = getZoomerLevel(z)
      levelCounts[level.id]++
    })
  }

  const totalZoomers = stats?.total ?? 0

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          🏆 Zoomer-certifiering
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Certifieringsnivåer och live-statistik för quiXzoom-nätverket
        </p>
      </div>

      {/* Nivåer */}
      <div className="rounded-xl border border-surface-border bg-surface-secondary overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivåer</p>
        </div>
        <div className="p-3 flex flex-col gap-2">
          {LEVELS.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              count={stats ? levelCounts[level.id] : 0}
            />
          ))}
        </div>
      </div>

      {/* Statistik */}
      <div className="rounded-xl border border-surface-border bg-surface-secondary overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Statistik · Live från quiXzoom API
          </p>
          {!loading && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                error
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-green-500/15 text-green-400'
              }`}
            >
              {error ? 'offline' : 'live'}
            </span>
          )}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
              Hämtar från api.quixzoom.com…
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">🌐</p>
              <p className="text-sm text-gray-400">Inga zoomers registrerade ännu</p>
              <p className="text-xs text-gray-600 mt-1">
                quiXzoom-nätverket lanserar i Sverige, juni 2026
              </p>
            </div>
          ) : totalZoomers === 0 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">🌱</p>
              <p className="text-sm text-gray-400">Inga zoomers registrerade ännu</p>
              <p className="text-xs text-gray-600 mt-1">
                Sverige-lansering: mitten juni 2026 · Mål: 100 aktiva zoomers på 60 dagar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="px-4 py-3 rounded-lg bg-surface-primary border border-surface-border text-center">
                <p className="text-2xl font-bold text-text-primary">{totalZoomers}</p>
                <p className="text-xs text-gray-500 mt-0.5">Totalt</p>
              </div>
              {LEVELS.map((level) => (
                <div
                  key={level.id}
                  className="px-4 py-3 rounded-lg border text-center"
                  style={{
                    backgroundColor: `${level.color}10`,
                    borderColor: `${level.color}30`,
                  }}
                >
                  <p className="text-xl font-bold" style={{ color: level.color }}>
                    {levelCounts[level.id]}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {level.emoji} {level.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-surface-border bg-surface-secondary p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Certifieringsflöde
        </p>
        <ol className="text-sm text-gray-400 space-y-1.5 list-none">
          {[
            'Ladda ner quiXzoom-appen (iOS / Android)',
            'Registrera och verifiera identitet (KYC)',
            'Klara grundkursen i appen (30 min)',
            'Slutför 5 godkända testuppdrag',
            'Signera plattformsavtalet digitalt',
            '→ Aktiv zoomer med tillgång till alla uppdrag',
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
