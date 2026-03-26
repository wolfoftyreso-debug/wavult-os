// ─── Wallet Dashboard — Balances, Transactions, Payout Rails ────────────────

import { MOCK_USER, PAYOUT_RAILS, getLevelDef, getLevelProgress, getNextLevel } from './walletOsData'

const TX_TYPE_COLOR: Record<string, string> = {
  'task-payout': '#10B981',
  'ir-sale': '#8B5CF6',
  'streak-bonus': '#F59E0B',
  withdrawal: '#EF4444',
  investment: '#0EA5E9',
  refund: '#6B7280',
  fee: '#EF4444',
}

const TX_STATUS_COLOR: Record<string, string> = {
  completed: '#10B981',
  pending: '#F59E0B',
  processing: '#22D3EE',
  failed: '#EF4444',
}

export function WalletDashboard() {
  const user = MOCK_USER
  const levelDef = getLevelDef(user.level)
  const nextLevel = getNextLevel(user.level)
  const progress = getLevelProgress(user.xp, user.level)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Balance cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#10B98125] bg-[#10B98108] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Available</div>
            <div className="text-2xl font-bold text-[#10B981] font-mono">{user.wallet.available}</div>
            <div className="text-[10px] text-gray-600">{user.wallet.currency}</div>
          </div>
          <div className="rounded-xl border border-[#F59E0B25] bg-[#F59E0B08] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-[#F59E0B] font-mono">{user.wallet.pending}</div>
            <div className="text-[10px] text-gray-600">Awaiting validation</div>
          </div>
          <div className="rounded-xl border border-[#0EA5E925] bg-[#0EA5E908] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Locked</div>
            <div className="text-2xl font-bold text-[#0EA5E9] font-mono">{user.wallet.locked}</div>
            <div className="text-[10px] text-gray-600">Invested in IR</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-gray-600 mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-white font-mono">{user.wallet.totalEarned}</div>
            <div className="text-[10px] text-gray-600">Lifetime</div>
          </div>
        </div>

        {/* Level progress */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: levelDef.color }}>{levelDef.icon} {levelDef.name}</span>
              <span className="text-[10px] text-gray-600 font-mono">{user.xp} XP</span>
            </div>
            {nextLevel && (
              <div className="text-[10px] text-gray-600">
                Next: <span style={{ color: nextLevel.color }}>{nextLevel.name}</span> ({nextLevel.minXP} XP)
              </div>
            )}
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: levelDef.color }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-[10px] text-gray-600">{progress}% to next level</div>
            <div className="flex items-center gap-3 text-[10px] text-gray-600">
              <span>{user.tasksCompleted} tasks</span>
              <span>{user.irsCreated} IRs</span>
              <span className="text-[#F59E0B]">{user.currentStreak} streak</span>
            </div>
          </div>
        </div>

        {/* Event pipeline */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Zero-Latency Payout Pipeline</h3>
          <div className="font-mono text-[10px] leading-relaxed text-gray-500 space-y-0.5">
            <div><span className="text-[#0EA5E9]">ImageCaptured</span> → <span className="text-[#F59E0B]">ImageValidated</span> (AI + rules) → <span className="text-[#10B981]">TaskCompleted</span></div>
            <div>{'  '}→ <span className="text-[#8B5CF6]">PaymentTriggered</span> → <span className="text-white font-bold">DEBIT Escrow / CREDIT Wallet</span> → <span className="text-[#EC4899]">WalletUpdated</span></div>
            <div className="text-gray-700 mt-1">Total latency: &lt;100ms from last image approval to wallet credit</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent transactions */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Recent Transactions</h3>
            <div className="space-y-1.5">
              {user.recentTransactions.map(tx => (
                <div key={tx.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono" style={{ color: TX_TYPE_COLOR[tx.type] }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                    <span className="text-[10px] text-gray-600">{tx.currency}</span>
                    <span className="flex-1 text-[10px] text-gray-400 truncate">{tx.description}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: TX_STATUS_COLOR[tx.status] + '18', color: TX_STATUS_COLOR[tx.status] }}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] px-1 py-0.5 rounded font-mono"
                      style={{ background: TX_TYPE_COLOR[tx.type] + '15', color: TX_TYPE_COLOR[tx.type] }}>
                      {tx.type}
                    </span>
                    <span className="text-[9px] text-gray-700">{new Date(tx.createdAt).toLocaleString('sv-SE')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payout rails */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Payout Rails</h3>
            <div className="space-y-1.5">
              {PAYOUT_RAILS.map(rail => (
                <div key={rail.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200">{rail.name}</span>
                        <span className="text-[10px] text-gray-600 font-mono">{rail.region}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                        <span className="text-[#10B981]">{rail.speed}</span>
                        <span>Fee: {rail.fee}</span>
                        <span>Min: {rail.minAmount}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: rail.status === 'active' ? '#10B98118' : '#6B728018',
                        color: rail.status === 'active' ? '#10B981' : '#6B7280',
                      }}>
                      {rail.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
