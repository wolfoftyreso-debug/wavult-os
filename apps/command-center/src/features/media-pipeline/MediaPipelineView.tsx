// ─── Media Pipeline — Wavult OS ────────────────────────────────────────────────
// Pipeline för quiXzoom media: upload queue, processing, inventory

import { useState, useEffect, useCallback } from 'react'
import { Upload, Film, Archive, RefreshCw, AlertCircle, Image } from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://api.wavult.com'

type FileStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error'

interface MediaFile {
  id: string
  name: string
  sizeMb: number
  missionId: string
  status: FileStatus
  progress: number
  aiTags?: string[]
  cdnUrl?: string
  uploadedAt: string
}

interface PipelineStats {
  total: number
  done: number
  processing: number
  error: number
  totalGb: number
}

const STATUS_META: Record<FileStatus, { label: string; color: string }> = {
  pending:    { label: 'Väntar',      color: '#9CA3AF' },
  uploading:  { label: 'Uploading',   color: '#60A5FA' },
  processing: { label: 'Bearbetar',   color: '#FBBF24' },
  done:       { label: 'Klart',       color: '#34D399' },
  error:      { label: 'Fel',         color: '#F87171' },
}

export function MediaPipelineView() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FileStatus | 'all'>('all')

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/media/pipeline`, { signal: AbortSignal.timeout(10_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json() as { files: MediaFile[]; stats: PipelineStats }
      setFiles(d.files ?? [])
      setStats(d.stats ?? null)
    } catch {
      // Endpoint saknas ännu — visa empty state
      setFiles([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const filtered = filterStatus === 'all' ? files : files.filter(f => f.status === filterStatus)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-white">Media Pipeline</span>
        </div>
        <button
          onClick={fetchMedia}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Uppdatera
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Totalt', value: stats.total, color: '#9CA3AF' },
            { label: 'Klart', value: stats.done, color: '#34D399' },
            { label: 'Bearbetar', value: stats.processing, color: '#FBBF24' },
            { label: 'Fel', value: stats.error, color: '#F87171' },
          ].map(s => (
            <div key={s.label} className="bg-neutral-900 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-white/30 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'uploading', 'processing', 'done', 'error'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filterStatus === s
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              {s === 'all' ? 'Alla' : STATUS_META[s]?.label ?? s}
            </button>
          ))}
        </div>
      )}

      {/* File list */}
      <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <RefreshCw size={20} className="text-white/20 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={24} className="text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Image size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Ingen media ännu</p>
              <p className="text-xs text-white/30 max-w-xs">
                Media-pipeline aktiveras när quiXzoom är live och zoomers börjar leverera uppdrag.
              </p>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Upload size={12} className="text-blue-400" />
                  <span className="text-[10px] text-white/30 font-mono uppercase">Upload</span>
                </div>
              </div>
              <div className="text-white/20">→</div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Film size={12} className="text-yellow-400" />
                  <span className="text-[10px] text-white/30 font-mono uppercase">Process</span>
                </div>
              </div>
              <div className="text-white/20">→</div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Archive size={12} className="text-green-400" />
                  <span className="text-[10px] text-white/30 font-mono uppercase">Archive</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(file => (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Image size={14} className="text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/70 truncate">{file.name}</span>
                    <span className="text-[10px] text-white/30">{file.sizeMb.toFixed(1)} MB</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/30">Mission: {file.missionId}</span>
                    {file.aiTags && file.aiTags.slice(0, 3).map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{t}</span>
                    ))}
                  </div>
                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${file.progress}%`, background: STATUS_META[file.status].color }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: STATUS_META[file.status].color }}>
                  {STATUS_META[file.status].label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
