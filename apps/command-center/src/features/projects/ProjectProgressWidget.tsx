// Sparkline = senaste 5 veckors progress-snapshots (procentenheter per vecka)
const PROJECTS = [
  {
    name: 'quiXzoom',
    phase: 'MVP',
    progress: 72,
    color: '#2563EB',
    icon: '📍',
    velocity: 4.2,          // pp/vecka (procentenheter per vecka)
    history: [54, 60, 65, 68, 72],   // sista 5 mätpunkter
  },
  {
    name: 'Optic Insights',
    phase: 'Planning',
    progress: 35,
    color: '#7C3AED',
    icon: '🔭',
    velocity: 2.1,
    history: [24, 26, 29, 33, 35],
  },
  {
    name: 'Infrastructure',
    phase: 'Setup',
    progress: 85,
    color: '#059669',
    icon: '⚙️',
    velocity: 1.3,
    history: [76, 78, 81, 83, 85],
  },
  {
    name: 'Thailand Prep',
    phase: '19 dagar',
    progress: 60,
    color: '#D97706',
    icon: '🇹🇭',
    velocity: 6.8,
    history: [30, 38, 46, 54, 60],
  },
]

// ─── Mini sparkline SVG ────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 52
  const H = 18
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  })

  const polyline = pts.join(' ')
  const lastX = parseFloat(pts[pts.length - 1].split(',')[0])
  const lastY = parseFloat(pts[pts.length - 1].split(',')[1])

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {/* Fill area under curve */}
      <defs>
        <linearGradient id={`spk-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${H} ${polyline} ${W},${H}`}
        fill={`url(#spk-${color.replace('#', '')})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle cx={lastX} cy={lastY} r={2.2} fill={color} />
    </svg>
  )
}

// ─── Velocity badge ────────────────────────────────────────────────────────────
function VelocityBadge({ velocity, color }: { velocity: number; color: string }) {
  const isHot = velocity >= 5
  const isMed = velocity >= 2.5

  const icon = isHot ? '▲▲' : isMed ? '▲' : '–'
  const label = `${velocity.toFixed(1)} pp/v`

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded"
      style={{
        background: color + '18',
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{ fontSize: 8 }}>{icon}</span>
      {label}
    </span>
  )
}

// ─── Widget ────────────────────────────────────────────────────────────────────
export function ProjectProgressWidget() {
  // Overall velocity (weighted avg)
  const avgVelocity = (PROJECTS.reduce((s, p) => s + p.velocity, 0) / PROJECTS.length).toFixed(1)

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <p className="text-sm font-medium text-white/70">Projekt</p>
        <span className="text-xs text-white/30 font-mono">
          ø {avgVelocity} pp/v
        </span>
      </div>

      <div className="p-4 space-y-4">
        {PROJECTS.map(p => (
          <div key={p.name}>
            {/* Row 1: name + velocity badge + sparkline + percent */}
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base flex-shrink-0">{p.icon}</span>
                <span className="text-sm font-medium text-white truncate">{p.name}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Sparkline data={p.history} color={p.color} />
                <VelocityBadge velocity={p.velocity} color={p.color} />
                <div className="text-right w-16">
                  <span className="text-xs text-white/40">{p.phase}</span>
                  <span className="text-xs text-white/60 ml-1.5">{p.progress}%</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${p.progress}%`, backgroundColor: p.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
