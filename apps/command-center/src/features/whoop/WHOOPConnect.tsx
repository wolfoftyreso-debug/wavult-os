/**
 * WHOOPConnect — Individuell WHOOP-kopplingskomponent
 *
 * Visar kopplingsstatus och senaste biometrik för inloggad user.
 * Används i People/profil-vyn.
 */

import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.hypbit.com'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhoopStatus {
  connected: boolean
  whoop_user_id: string | null
  connected_at: string | null
}

interface WhoopData {
  connected: boolean
  recovery: { score: number | null; hrv: number | null; restingHr: number | null } | null
  sleep: { performancePercent: number | null; durationHours: number | null } | null
  strain: { score: number | null; kilojoules: number | null } | null
  last_updated: string | null
  cached?: boolean
}

// ─── Recovery färgkodning ─────────────────────────────────────────────────────

function recoveryColor(score: number | null | undefined): string {
  if (score == null) return '#6B7280'
  if (score > 66) return '#10B981'  // grön
  if (score > 33) return '#F59E0B'  // gul
  return '#EF4444'                  // röd
}

function recoveryLabel(score: number | null | undefined): string {
  if (score == null) return '—'
  if (score > 66) return 'Redo'
  if (score > 33) return 'Bevaka'
  return 'Vila'
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function WHOOPConnect() {
  const [status, setStatus] = useState<WhoopStatus | null>(null)
  const [data, setData] = useState<WhoopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  async function loadStatus() {
    try {
      const [statusRes, meRes] = await Promise.all([
        fetch(`${API_BASE}/whoop/status`, { credentials: 'include' }),
        fetch(`${API_BASE}/whoop/me`, { credentials: 'include' }),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (meRes.ok) setData(await meRes.json())
    } catch (err) {
      console.error('[WHOOPConnect] loadStatus error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Kolla om vi just kom tillbaka från OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      const connectCode = params.get('connect_code')
      window.history.replaceState({}, '', window.location.pathname)

      if (connectCode) {
        // Byt connect_code mot bekräftelse — tokens hanteras server-side
        fetch(`${API_BASE}/whoop/token-exchange`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connect_code: connectCode }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data?.connected) loadStatus() })
          .catch(() => loadStatus())
      } else {
        loadStatus()
      }
    } else {
      loadStatus()
    }
  }, [])

  async function handleDisconnect() {
    if (!confirm('Koppla bort WHOOP? Du kan koppla igen när som helst.')) return
    setDisconnecting(true)
    try {
      await fetch(`${API_BASE}/whoop/disconnect`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setStatus({ connected: false, whoop_user_id: null, connected_at: null })
      setData(null)
    } catch (err) {
      console.error('[WHOOPConnect] disconnect error:', err)
    } finally {
      setDisconnecting(false)
    }
  }

  function handleConnect() {
    window.location.href = `${API_BASE}/whoop/auth`
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-6 animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
      </div>
    )
  }

  // ── Ej kopplad ─────────────────────────────────────────────────────────────

  if (!status?.connected) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⌚</span>
          <div>
            <h2 className="text-white font-semibold text-lg">WHOOP</h2>
            <p className="text-gray-400 text-sm">Inte kopplat</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Wavult Group har WHOOP-armband till hela teamet. Koppla ditt konto för att
          synka recovery, sömn och belastning med Wavult OS.
        </p>
        <button
          onClick={handleConnect}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-black transition-all hover:brightness-110 active:scale-95"
          style={{ background: '#F5C842' }}
        >
          <span>⌚</span>
          <span>Koppla WHOOP</span>
        </button>
      </div>
    )
  }

  // ── Kopplad — visa biometrik ───────────────────────────────────────────────

  const score = data?.recovery?.score ?? null
  const color = recoveryColor(score)
  const label = recoveryLabel(score)

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⌚</span>
          <div>
            <h2 className="text-white font-semibold text-lg">WHOOP</h2>
            <p className="text-xs text-green-400 font-mono">● Kopplat</p>
          </div>
        </div>
        {data?.last_updated && (
          <span className="text-xs text-gray-600 font-mono">
            {new Date(data.last_updated).toLocaleString('sv-SE', {
              hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
            })}
          </span>
        )}
      </div>

      {/* Recovery score — stor siffra */}
      <div className="flex flex-col items-center py-4">
        <div
          className="text-7xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {score != null ? `${Math.round(score)}%` : '—'}
        </div>
        <div
          className="mt-2 text-sm font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </div>
        <div className="mt-1 text-xs text-gray-600 font-mono uppercase tracking-wider">
          Recovery
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* HRV */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <div className="text-xl font-bold text-white tabular-nums">
            {data?.recovery?.hrv != null ? Math.round(data.recovery.hrv) : '—'}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">HRV ms</div>
        </div>

        {/* Sömn % */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <div className="text-xl font-bold text-white tabular-nums">
            {data?.sleep?.performancePercent != null
              ? `${Math.round(data.sleep.performancePercent)}%`
              : '—'}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">Sömn</div>
        </div>

        {/* Strain */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <div className="text-xl font-bold text-white tabular-nums">
            {data?.strain?.score != null
              ? Math.round(data.strain.score * 10) / 10
              : '—'}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">Strain /21</div>
        </div>
      </div>

      {/* Extra: sömn duration + vila HR */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <div className="text-xs text-gray-500 font-mono mb-1">Sovtid</div>
          <div className="text-sm font-semibold text-white">
            {data?.sleep?.durationHours != null
              ? `${data.sleep.durationHours}h`
              : '—'}
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <div className="text-xs text-gray-500 font-mono mb-1">Vilopuls</div>
          <div className="text-sm font-semibold text-white">
            {data?.recovery?.restingHr != null
              ? `${Math.round(data.recovery.restingHr)} bpm`
              : '—'}
          </div>
        </div>
      </div>

      {data?.cached && (
        <p className="text-xs text-gray-600 text-center">
          Visar cachad data — kunde inte nå WHOOP API just nu
        </p>
      )}

      {/* Disconnect */}
      <div className="flex justify-center">
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {disconnecting ? 'Kopplar bort…' : 'Koppla bort WHOOP'}
        </button>
      </div>
    </div>
  )
}
