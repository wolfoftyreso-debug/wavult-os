import { useState, useEffect, useRef } from 'react'
import { ModuleHeader } from '../../shared/illustrations/ModuleIllustration'

interface CommandResult { id: string; command: string; output: string; status: 'success' | 'error'; timestamp: string }

const FALLBACK_HISTORY: CommandResult[] = [
  { id: 'f1', command: 'openclaw status', output: 'OpenClaw v2.1.0 — online\nBernt tunnel: connected\nMemory: 3 active contexts', status: 'success', timestamp: new Date().toISOString() },
  { id: 'f2', command: 'docker ps --format "{{.Names}}"', output: 'wavult-api\nquixzoom-api\nidentity-core\nn8n\nkafka', status: 'success', timestamp: new Date().toISOString() },
]

export function CommandView() {
  const [history, setHistory] = useState<CommandResult[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/command/history')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => setHistory(d.history ?? []))
      .catch(e => { setInitError(String(e)); setHistory(FALLBACK_HISTORY); setUsingFallback(true) })
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  const run = async () => {
    if (!input.trim()) return
    const cmd = input.trim()
    setInput('')
    setLoading(true)
    try {
      const r = await fetch('/api/command/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      })
      const d = await r.json()
      setHistory(h => [...h, {
        id: Date.now().toString(),
        command: cmd,
        output: d.output ?? '',
        status: r.ok ? 'success' : 'error',
        timestamp: new Date().toISOString(),
      }])
    } catch (e) {
      setHistory(h => [...h, {
        id: Date.now().toString(),
        command: cmd,
        output: String(e),
        status: 'error',
        timestamp: new Date().toISOString(),
      }])
    } finally { setLoading(false) }
  }

  return (
    <div className="wv-module-enter">
      <ModuleHeader
        route="/command-view"
        label="Wavult OS"
        title="Command Center"
        description="Kör kommandon och inspektera systemet"
        illustrationSize="md"
      />

      {usingFallback && (
        <div style={{ marginBottom: 16, padding: '8px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          Visar exempelhistorik · Live-API ej ansluten
        </div>
      )}
      {initError && !usingFallback && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
          ⚠️ Historik ej tillgänglig: {initError}
        </div>
      )}

      <div style={{ background: '#0A1628', borderRadius: 12, padding: 20, minHeight: 300, marginBottom: 16, fontFamily: 'monospace', fontSize: 13, overflowY: 'auto', maxHeight: 400 }}>
        {history.length === 0 && !loading && (
          <div style={{ color: 'rgba(245,240,232,.3)', textAlign: 'center', paddingTop: 80 }}>
            Skriv ett kommando nedan för att börja
          </div>
        )}
        {history.map(h => (
          <div key={h.id} style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--color-accent)' }}>$ {h.command}</div>
            <pre style={{ color: h.status === 'error' ? '#f87171' : 'rgba(245,240,232,.8)', margin: '4px 0 0 12px', whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {h.output}
            </pre>
          </div>
        ))}
        {loading && <div style={{ color: 'rgba(245,240,232,.4)' }}>$ ▋</div>}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', color: 'var(--color-accent)', fontSize: 13 }}>$</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Skriv kommando..."
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-primary)' }}
          />
        </div>
        <button
          onClick={run}
          disabled={loading || !input.trim()}
          style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          Kör
        </button>
      </div>
    </div>
  )
}
