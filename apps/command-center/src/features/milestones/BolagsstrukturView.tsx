import { BOLAG_LIST, getDaysUntil, type Bolag } from './data'

type Step = Bolag['currentStep']

const STEPS: Step[] = ['registrering', 'bankkonto', 'skatteregistrering', 'operativt']
const STEP_LABELS: Record<Step, string> = {
  registrering: 'Registrering',
  bankkonto: 'Bankkonto',
  skatteregistrering: 'Skatteregistrering',
  operativt: 'Operativt',
}
const STEP_ICONS: Record<Step, string> = {
  registrering: '📝',
  bankkonto: '🏦',
  skatteregistrering: '🧾',
  operativt: '✅',
}

function StepTrack({ currentStep, color }: { currentStep: Step; color: string }) {
  const currentIdx = STEPS.indexOf(currentStep)

  return (
    <div className="flex items-center gap-1 mt-3">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx
        const isActive = idx === currentIdx
        const stepColor = isDone ? color : isActive ? color : '#374151'

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all"
                style={{
                  background: isActive ? color + '20' : isDone ? color : '#1F2937',
                  border: `1.5px solid ${stepColor}`,
                }}
              >
                {isDone ? (
                  <span style={{ color }}>✓</span>
                ) : isActive ? (
                  <span style={{ color }} className="text-[8px]">●</span>
                ) : (
                  <span className="text-gray-600 text-[8px]">○</span>
                )}
              </div>
              <span
                className="text-[8px] font-mono mt-1 text-center leading-tight"
                style={{ color: isActive ? color : isDone ? color + 'AA' : '#4B5563' }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="h-px flex-1 mx-0.5 mb-4"
                style={{ background: isDone ? color + '60' : '#1F2937' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function BolagCard({ bolag }: { bolag: Bolag }) {
  const daysLeft = getDaysUntil(bolag.estimatedDate)
  const isOperational = bolag.currentStep === 'operativt'
  const hasBlockers = bolag.blockers.length > 0

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: bolag.color + (hasBlockers ? '30' : '15'),
        background: bolag.color + '05',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{ borderColor: bolag.color + '15' }}
      >
        <span className="text-2xl">{bolag.flag}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white truncate">{bolag.name}</p>
          <p className="text-xs text-gray-500 font-mono">{bolag.jurisdiction}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {isOperational ? (
            <span className="text-xs font-mono px-2 py-1 rounded-full bg-green-500/15 text-green-400">
              ✅ Operativt
            </span>
          ) : (
            <div>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: daysLeft <= 7 ? '#EF4444' : daysLeft <= 30 ? '#F59E0B' : bolag.color }}
              >
                {daysLeft}d
              </p>
              <p className="text-[9px] text-gray-600 font-mono">kvar</p>
            </div>
          )}
        </div>
      </div>

      {/* Step tracker */}
      <div className="px-4 pt-1 pb-4">
        <StepTrack currentStep={bolag.currentStep} color={bolag.color} />
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-gray-500 font-mono">Progress</span>
          <span className="text-[9px] font-mono" style={{ color: bolag.color }}>{bolag.progress}%</span>
        </div>
        <div className="bg-white/[0.06] rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${bolag.progress}%`, background: bolag.color }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div
        className="px-4 py-2 border-t flex items-center gap-4"
        style={{ borderColor: bolag.color + '10' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-gray-600 font-mono">👤 Ansvarig:</span>
          <span className="text-xs text-gray-300">{bolag.owner}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-gray-600 font-mono">🗓️ Est.:</span>
          <span className="text-xs text-gray-300">
            {new Date(bolag.estimatedDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Blockers */}
      {bolag.blockers.length > 0 && (
        <div className="px-4 py-3 border-t border-red-500/10 bg-red-500/[0.04]">
          <p className="text-[9px] text-red-400 font-mono uppercase tracking-wider mb-2">
            🚧 Blockers ({bolag.blockers.length})
          </p>
          <ul className="space-y-1">
            {bolag.blockers.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-red-300">
                <span className="mt-0.5 flex-shrink-0">·</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function BolagsstrukturView() {
  const operational = BOLAG_LIST.filter(b => b.currentStep === 'operativt').length
  const inProgress = BOLAG_LIST.filter(b => b.currentStep !== 'operativt').length
  const withBlockers = BOLAG_LIST.filter(b => b.blockers.length > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Bolagsstruktur</h2>
        <p className="text-xs text-gray-500 mt-0.5">Wavult Group — {BOLAG_LIST.length} bolag · Global expansion</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 border border-green-500/20 bg-green-500/08 text-center">
          <p className="text-2xl font-bold text-green-400">{operational}</p>
          <p className="text-[9px] text-gray-500 font-mono mt-1">OPERATIVA</p>
        </div>
        <div className="rounded-xl p-3 border border-blue-500/20 bg-blue-500/08 text-center">
          <p className="text-2xl font-bold text-blue-400">{inProgress}</p>
          <p className="text-[9px] text-gray-500 font-mono mt-1">PÅGÅR</p>
        </div>
        <div className="rounded-xl p-3 border border-red-500/20 bg-red-500/08 text-center">
          <p className="text-2xl font-bold text-red-400">{withBlockers}</p>
          <p className="text-[9px] text-gray-500 font-mono mt-1">BLOCKERADE</p>
        </div>
      </div>

      {/* Step legend */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0D0F1A] p-3">
        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mb-2">Registreringssteg</p>
        <div className="flex items-center gap-3 flex-wrap">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <span className="text-sm">{STEP_ICONS[step]}</span>
              <span className="text-xs text-gray-400">{i + 1}. {STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bolag cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {BOLAG_LIST.map(bolag => (
          <BolagCard key={bolag.id} bolag={bolag} />
        ))}
      </div>
    </div>
  )
}
