import { useState, useEffect, useCallback } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

type Submission = {
  id: string
  mission_id: string
  photographer_id: string
  status: string
  images: string[] | null
  ai_score: number | null
  reviewer_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  payout_amount: number | null
  approved_at: string | null
  missions?: { title: string; reward_amount: number } | null
  profiles?: { full_name: string; email: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  pending:  '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  review:   '#3B82F6',
}

async function supabaseFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function SubmissionsView() {
  const { activeEntity } = useEntityScope()
  const isRoot = activeEntity.layer === 0
  const isQuixzoom = activeEntity.id === 'quixzoom-uab' || activeEntity.id === 'quixzoom-inc'
  const canViewSubmissions = isRoot || isQuixzoom

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [payoutInputs, setPayoutInputs] = useState<Record<string, string>>({})
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const statusFilter = filterStatus === 'all' ? '' : `&status=eq.${filterStatus}`
      const data = await supabaseFetch(
        `mission_submissions?select=*,missions(title,reward_amount),profiles!photographer_id(full_name,email)&order=submitted_at.desc&limit=50${statusFilter}`
      )
      setSubmissions(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  async function handleApprove(sub: Submission) {
    setApprovingId(sub.id)
    const rawPayout = payoutInputs[sub.id]
    const payoutAmount = rawPayout ? parseFloat(rawPayout) : (sub.missions?.reward_amount ?? 10)

    try {
      const result = await supabaseFetch('rpc/approve_submission', {
        method: 'POST',
        body: JSON.stringify({
          p_submission_id: sub.id,
          p_admin_id: '00000000-0000-0000-0000-000000000001',
          p_payout_amount: payoutAmount,
        }),
      })
      if (result.success) {
        showToast(`✅ Godkänt! ${payoutAmount} SEK krediterat`, true)
        loadSubmissions()
      } else {
        showToast(`❌ ${result.error}`, false)
      }
    } catch (e) {
      showToast(`❌ Fel: ${String(e)}`, false)
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject(sub: Submission) {
    setApprovingId(sub.id)
    try {
      await supabaseFetch(`mission_submissions?id=eq.${sub.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', reviewed_at: new Date().toISOString() }),
      })
      showToast('Avvisad', true)
      loadSubmissions()
    } catch (e) {
      showToast(`❌ ${String(e)}`, false)
    } finally {
      setApprovingId(null)
    }
  }

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  }

  // Out-of-scope state (quiXzoom data only)
  if (!canViewSubmissions) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Submissions</h1>
          <p className="text-gray-400 text-sm mt-0.5">quiXzoom uppdragsinlämningar — godkänn och betala ut</p>
        </div>
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-base font-medium text-gray-400 mb-2">No submissions for {activeEntity.name}</p>
          <p className="text-sm text-gray-600">Submissions are quiXzoom data only.<br />Switch to quiXzoom or root to view.</p>
          <div
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: activeEntity.color + '15',
              border: `1px solid ${activeEntity.color}30`,
              color: activeEntity.color,
            }}
          >
            Currently scoped: {activeEntity.name}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Submissions</h1>
          <p className="text-gray-400 text-sm mt-0.5">quiXzoom uppdragsinlämningar — godkänn och betala ut</p>
        </div>
        <button
          onClick={loadSubmissions}
          className="text-xs text-gray-500 hover:text-white px-3 py-1.5 border border-white/[0.08] rounded-lg transition-colors"
        >
          ↻ Uppdatera
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all"
            style={filterStatus === s
              ? { background: (STATUS_COLORS[s] ?? '#ffffff') + '20', color: STATUS_COLORS[s] ?? '#fff', borderColor: (STATUS_COLORS[s] ?? '#ffffff') + '40' }
              : { background: 'transparent', color: '#4B5563', borderColor: '#ffffff0a' }
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && <span className="ml-1.5 opacity-60">{counts[s]}</span>}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl transition-all ${toast.ok ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700' : 'bg-red-900/90 text-red-200 border border-red-700'}`}>
          {toast.msg}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm py-8">
          <div className="w-4 h-4 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
          Laddar...
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && submissions.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">Inga inlämningar med status <span className="text-gray-400">"{filterStatus}"</span></p>
        </div>
      )}

      {/* Submissions list */}
      <div className="flex flex-col gap-3">
        {submissions.map(sub => {
          const isApproving = approvingId === sub.id
          const missionReward = sub.missions?.reward_amount ?? 10
          const payout = payoutInputs[sub.id] ?? String(missionReward)
          const statusColor = STATUS_COLORS[sub.status] ?? '#6B7280'
          const imgCount = Array.isArray(sub.images) ? sub.images.length : 0

          return (
            <div
              key={sub.id}
              className="bg-surface-raised border border-surface-border rounded-xl p-5 flex flex-col gap-4"
              style={sub.status === 'pending' ? { borderColor: '#F59E0B20' } : {}}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: statusColor + '20', color: statusColor }}
                    >
                      {sub.status}
                    </span>
                    {sub.ai_score != null && (
                      <span className="text-xs text-gray-500 font-mono">
                        AI score: <span className="text-white">{(sub.ai_score * 100).toFixed(0)}%</span>
                      </span>
                    )}
                    <span className="text-xs text-gray-600 font-mono">{imgCount} bilder</span>
                  </div>

                  <p className="text-sm font-semibold text-white truncate">
                    {sub.missions?.title ?? `Uppdrag ${sub.mission_id.slice(0,8)}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sub.profiles?.full_name ?? 'Okänd zoomer'} · {sub.profiles?.email ?? ''}
                  </p>
                  <p className="text-xs text-gray-700 font-mono mt-1">
                    {new Date(sub.submitted_at).toLocaleString('sv-SE')}
                  </p>
                </div>

                {/* Right: actions (only for pending) */}
                {sub.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={payout}
                        onChange={e => setPayoutInputs(p => ({ ...p, [sub.id]: e.target.value }))}
                        className="w-20 bg-[#070709] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-emerald-500/50"
                        placeholder="SEK"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs text-gray-600">SEK</span>
                    </div>
                    <button
                      onClick={() => handleApprove(sub)}
                      disabled={isApproving}
                      className="text-xs px-4 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                      style={{ background: '#10B98120', color: '#34D399', border: '1px solid #10B98130' }}
                    >
                      {isApproving ? '...' : '✓ Godkänn + Betala'}
                    </button>
                    <button
                      onClick={() => handleReject(sub)}
                      disabled={isApproving}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      style={{ background: 'transparent', color: '#6B7280', border: '1px solid #ffffff0a' }}
                    >
                      Avvisa
                    </button>
                  </div>
                )}

                {sub.status === 'approved' && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-emerald-400 font-bold text-sm">+{sub.payout_amount ?? 0} SEK</p>
                    <p className="text-xs text-gray-600 font-mono mt-0.5">
                      {sub.approved_at ? new Date(sub.approved_at).toLocaleString('sv-SE') : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Image previews */}
              {imgCount > 0 && Array.isArray(sub.images) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sub.images.slice(0, 6).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-16 w-24 object-cover rounded-lg border border-white/[0.06] flex-shrink-0"
                    />
                  ))}
                  {imgCount > 6 && (
                    <div className="h-16 w-24 rounded-lg border border-white/[0.06] bg-white/[0.04] flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                      +{imgCount - 6}
                    </div>
                  )}
                </div>
              )}

              {sub.reviewer_notes && (
                <p className="text-xs text-gray-500 bg-white/[0.03] rounded-lg px-3 py-2">
                  💬 {sub.reviewer_notes}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
