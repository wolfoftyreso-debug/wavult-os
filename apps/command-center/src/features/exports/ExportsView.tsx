import { useState, useEffect } from 'react'
import { ModuleHeader, SectionIllustration } from '../../shared/illustrations/ModuleIllustration'

interface ExportJob { id: string; name: string; type: string; status: 'ready' | 'processing' | 'failed'; createdAt: string; downloadUrl?: string }

function useExports() {
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    fetch('/api/exports', { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setJobs(d.jobs ?? []); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
      .finally(() => clearTimeout(t))
    return () => { controller.abort(); clearTimeout(t) }
  }, [])
  return { jobs, loading, error }
}

const typeIcon: Record<string, string> = { csv: '📊', pdf: '📄', json: '🗂️', xlsx: '📈' }

export default function ExportsView() {
  const { jobs, loading, error } = useExports()
  const [creating, setCreating] = useState(false)

  const createExport = async (type: string) => {
    setCreating(true)
    try {
      await fetch('/api/exports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
    } finally { setCreating(false) }
  }

  return (
    <div>
      <ModuleHeader
        route="/exports"
        label="Wavult OS"
        title="Exporter"
        description="Generera och ladda ned dataexporter"
        illustrationSize="md"
      />

      {!loading && !error && jobs.length === 0 && (
        <SectionIllustration route="/exports" title="Inga exporter ännu" description="Skapa din första export med knapparna ovan" />
      )}

      {!loading && !error && jobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.map(job => (
            <div key={job.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 20 }}>{typeIcon[job.type] ?? '📄'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{job.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(job.createdAt).toLocaleString('sv-SE')}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: job.status === 'ready' ? '#16a34a' : job.status === 'failed' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                {job.status === 'ready' ? '● Klar' : job.status === 'processing' ? '○ Bearbetar...' : '✕ Misslyckades'}
              </span>
              {job.status === 'ready' && job.downloadUrl && (
                <a href={job.downloadUrl} style={{ background: 'var(--color-brand)', color: '#fff', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Ladda ned</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
