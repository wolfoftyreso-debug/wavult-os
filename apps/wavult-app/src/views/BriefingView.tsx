// ═══════════════════════════════════════════════════════════════════════════════
// PCI — Briefing View (Single Screen)
// ═══════════════════════════════════════════════════════════════════════════════
// Morning briefing (text) + play audio + command input.
// No design polish required. Functional.

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

interface Briefing {
  text: string
  audio_url: string | null
  task_ids: string[]
  date: string
}

interface CommandResult {
  intent: string
  tasks: { summary: string; type: string; urgency: number; reason: string }[]
  text: string
}

// ─── Energy Input ────────────────────────────────────────────────────────────

function EnergyInput({ userId }: { userId: string }) {
  const [energy, setEnergy] = useState(3)
  const [saved, setSaved] = useState(false)

  const save = async (val: number) => {
    setEnergy(val)
    setSaved(false)
    await fetch(`${API}/api/pci/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, energy: val }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-label text-tx-tertiary font-mono">ENERGY</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => save(n)}
            className="h-8 w-8 rounded-lg text-xs font-bold transition-all active:scale-90"
            style={{
              background: n <= energy ? '#C4961A' + (n === energy ? '30' : '15') : '#1C2029',
              color: n <= energy ? '#C4961A' : '#3D4452',
              border: `1px solid ${n <= energy ? '#C4961A30' : '#2A2F3A'}`,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {saved && <span className="text-[9px] text-signal-green font-mono">SAVED</span>}
    </div>
  )
}

// ─── Audio Player ────────────────────────────────────────────────────────────

function AudioPlayer({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  if (!url) return <p className="text-[10px] text-tx-muted font-mono">NO AUDIO</p>

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        className="h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{
          background: playing ? '#D9404020' : '#C4961A15',
          border: `1px solid ${playing ? '#D9404030' : '#C4961A30'}`,
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill={playing ? '#D94040' : '#C4961A'}>
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#C4961A">
            <polygon points="3,1 14,8 3,15" />
          </svg>
        )}
      </button>
      <span className="text-xs text-tx-tertiary">{playing ? 'Playing...' : 'Play briefing'}</span>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
    </div>
  )
}

// ─── Command Input ───────────────────────────────────────────────────────────

function CommandInput({ userId }: { userId: string }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<CommandResult | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/pci/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, command: input }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ intent: 'error', tasks: [], text: 'Failed to reach server' })
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="What should I do now?"
          className="flex-1 px-4 py-3 rounded-xl bg-w-surface border border-w-border text-sm text-tx-primary placeholder-tx-muted focus:outline-none focus:border-signal-amber/50"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-3 rounded-xl bg-signal-amber/15 text-signal-amber text-sm font-semibold border border-signal-amber/30 active:scale-95 disabled:opacity-50"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>

      {result && (
        <div className="mt-3 animate-fade-in">
          {result.tasks.length > 0 ? (
            <div className="space-y-2">
              {result.tasks.map((t, i) => (
                <div key={i} className="app-card flex items-start gap-3">
                  <span className="text-lg font-bold text-tx-muted w-5 text-center mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-tx-primary">{t.summary}</p>
                    <p className="text-[10px] text-tx-tertiary mt-0.5">
                      {t.type.toUpperCase()} · {t.reason}
                    </p>
                  </div>
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: t.urgency > 0.6 ? '#D94040' : t.urgency > 0.3 ? '#C4961A' : '#4A7A5B' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tx-tertiary">{result.text}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Briefing View ──────────────────────────────────────────────────────

export function BriefingView() {
  const { user } = useAuth()
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const userId = user?.id || ''

  // Fetch today's briefing
  useEffect(() => {
    if (!userId || !API) { setLoading(false); return }

    fetch(`${API}/api/pci/briefing/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setBriefing(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  // Generate briefing (full pipeline)
  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`${API}/api/pci/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.briefing?.text) {
        setBriefing(data.briefing)
      }
    } catch { /* silent */ }
    finally { setGenerating(false) }
  }

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-action text-tx-primary">Briefing</h1>
        <p className="text-label text-tx-tertiary font-mono mt-1">
          {new Date().toLocaleDateString('en-SE', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Energy input */}
      <div className="px-5 mb-6">
        <EnergyInput userId={userId} />
      </div>

      {/* Briefing content */}
      <div className="px-5 mb-6">
        {loading ? (
          <div className="app-card text-center py-8">
            <p className="text-tx-muted text-sm">Loading...</p>
          </div>
        ) : briefing ? (
          <div className="space-y-4">
            {/* Text */}
            <div className="app-card">
              <pre className="text-sm text-tx-primary whitespace-pre-wrap font-sans leading-relaxed">
                {briefing.text}
              </pre>
            </div>

            {/* Audio */}
            <AudioPlayer url={briefing.audio_url} />
          </div>
        ) : (
          <div className="app-card text-center py-8">
            <p className="text-tx-muted text-sm mb-3">No briefing yet</p>
            <button
              onClick={generate}
              disabled={generating}
              className="app-btn app-btn--primary max-w-[200px] mx-auto disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Briefing'}
            </button>
          </div>
        )}
      </div>

      {/* Regenerate button */}
      {briefing && (
        <div className="px-5 mb-6">
          <button
            onClick={generate}
            disabled={generating}
            className="text-xs text-tx-tertiary hover:text-tx-secondary font-mono transition-colors disabled:opacity-50"
          >
            {generating ? 'REGENERATING...' : 'REGENERATE'}
          </button>
        </div>
      )}

      {/* Command input */}
      <div className="px-5">
        <h2 className="text-label text-tx-tertiary font-mono uppercase mb-3">Command</h2>
        <CommandInput userId={userId} />
      </div>
    </div>
  )
}
