// ─── Level System + Streaks — Gamified Earning Capacity ─────────────────────

import { LEVELS, STREAK_DEFINITIONS, MOCK_USER, getLevelDef, getLevelProgress, getActiveStreak } from './walletOsData'

export function LevelSystemView() {
  const user = MOCK_USER
  const currentLevel = getLevelDef(user.level)
  const activeStreak = getActiveStreak(user.currentStreak)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white">Levels & Streaks</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Gamified earning capacity — higher level = higher payouts, better splits, exclusive access</p>
        </div>

        {/* Current status */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold"
              style={{ background: currentLevel.color + '20', color: currentLevel.color }}>
              {currentLevel.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: currentLevel.color }}>{currentLevel.name}</span>
                <span className="text-[10px] text-gray-600 font-mono">Level {user.level}</span>
                <span className="text-[10px] text-gray-600 font-mono">{user.xp} XP</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mt-2 w-64">
                <div className="h-full rounded-full transition-all" style={{ width: `${getLevelProgress(user.xp, user.level)}%`, background: currentLevel.color }} />
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-gray-600">
                <span>Max payout: <span className="text-white font-bold">{currentLevel.maxPayoutPerTask} SEK</span></span>
                <span>Tasks/day: <span className="text-white font-bold">{currentLevel.maxTasksPerDay}</span></span>
                <span>IR split: <span className="text-white font-bold">{currentLevel.revenueSplitPct}%</span></span>
                <span>Streak bonus: <span className="text-[#F59E0B] font-bold">+{currentLevel.streakBonusPct}%</span></span>
              </div>
            </div>
            {activeStreak && (
              <div className="rounded-xl border px-4 py-3 flex-shrink-0"
                style={{ borderColor: activeStreak.color + '30', background: activeStreak.color + '10' }}>
                <div className="text-[10px] text-gray-600">Active Streak</div>
                <div className="text-sm font-bold" style={{ color: activeStreak.color }}>{activeStreak.name}</div>
                <div className="text-[10px] font-mono" style={{ color: activeStreak.color }}>+{activeStreak.bonusPct}% bonus</div>
              </div>
            )}
          </div>
        </div>

        {/* All levels */}
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">All Levels</h3>
          <div className="space-y-2">
            {LEVELS.map(level => {
              const isCurrent = level.level === user.level
              const isLocked = level.level > user.level
              return (
                <div key={level.level} className="rounded-xl border px-5 py-4"
                  style={{
                    borderColor: isCurrent ? level.color + '40' : 'rgba(255,255,255,0.06)',
                    background: isCurrent ? level.color + '06' : 'rgba(255,255,255,0.02)',
                    opacity: isLocked ? 0.5 : 1,
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                      style={{ background: level.color + '20', color: level.color }}>
                      {level.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: isLocked ? '#6B7280' : level.color }}>{level.name}</span>
                        <span className="text-[10px] text-gray-600 font-mono">L{level.level}</span>
                        <span className="text-[10px] text-gray-600 font-mono">{level.minXP}+ XP</span>
                        {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B98118] text-[#10B981] font-mono">CURRENT</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {level.unlocks.map(u => (
                          <span key={u} className="text-[9px] px-1.5 py-0.5 rounded-lg bg-white/[0.04] text-gray-500 font-mono">{u}</span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center flex-shrink-0">
                      <div>
                        <div className="text-[10px] text-gray-600">Payout</div>
                        <div className="text-xs font-bold text-white font-mono">{level.maxPayoutPerTask}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600">Tasks/day</div>
                        <div className="text-xs font-bold text-white font-mono">{level.maxTasksPerDay}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600">IR Split</div>
                        <div className="text-xs font-bold text-white font-mono">{level.revenueSplitPct}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600">Streak</div>
                        <div className="text-xs font-bold text-[#F59E0B] font-mono">+{level.streakBonusPct}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Streaks */}
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Streak Definitions</h3>
          <div className="grid grid-cols-2 gap-3">
            {STREAK_DEFINITIONS.map(streak => {
              const isActive = activeStreak?.id === streak.id
              return (
                <div key={streak.id} className="rounded-xl border px-4 py-3"
                  style={{
                    borderColor: isActive ? streak.color + '40' : 'rgba(255,255,255,0.06)',
                    background: isActive ? streak.color + '08' : 'rgba(255,255,255,0.02)',
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold" style={{ color: streak.color }}>{streak.name}</span>
                    {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B98118] text-[#10B981] font-mono">ACTIVE</span>}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    {streak.requiredTasks} tasks in {streak.timeWindow} → <span className="font-bold" style={{ color: streak.color }}>+{streak.bonusPct}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {streak.unlocks.map(u => (
                      <span key={u} className="text-[9px] px-1.5 py-0.5 rounded-lg bg-white/[0.04] text-gray-500 font-mono">{u}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
